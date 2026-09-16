import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { detectAgents } from './runtime-detection.mjs';
import { EventStore } from './event-store.mjs';
import { QuotaMonitor } from './quota-monitor.mjs';
import { Room } from './room.mjs';
import { applyConfigToEnv, loadConfig } from './config.mjs';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = join(sourceDirectory, '..', 'public');

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function body(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 100_000) throw new Error('Request too large.');
  }
  return JSON.parse(text || '{}');
}

function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(command, args, () => {});
}

// PULSE_AGENT_TIMEOUT_MS applies to every agent; PULSE_<AGENT>_TIMEOUT_MS
// (e.g. PULSE_CLAUDE_TIMEOUT_MS) overrides it for one.
export function agentTimeoutsFromEnv(env = process.env, agentIds = ['codex', 'claude', 'gemini', 'opencode']) {
  const timeouts = {};
  const shared = Number(env.PULSE_AGENT_TIMEOUT_MS);
  if (Number.isFinite(shared) && shared > 0) timeouts.default = shared;
  for (const id of agentIds) {
    const value = Number(env[`PULSE_${id.toUpperCase()}_TIMEOUT_MS`]);
    if (Number.isFinite(value) && value > 0) timeouts[id] = value;
  }
  return timeouts;
}

export function projectRoomId(projectRoot) {
  const path = resolve(projectRoot);
  const digest = createHash('sha256').update(path).digest('hex').slice(0, 16);
  return `${basename(path) || 'root'}-${digest}`;
}

export async function createPulseServer({
  projectRoot,
  stateRoot,
  agents: providedAgents,
  testMode = process.env.PULSE_TEST_MODE === '1',
  softTokenBudget = Number(process.env.PULSE_SOFT_TOKEN_BUDGET ?? 500000),
  contextMaxChars = Number(process.env.PULSE_CONTEXT_MAX_CHARS ?? 16000),
  quotaSources = [],
  quotaPollIntervalMs = Number(process.env.PULSE_QUOTA_POLL_INTERVAL_MS ?? 60000),
  broadcastIntervalMs = Number(process.env.PULSE_BROADCAST_INTERVAL_MS ?? 500),
  sseMaxBufferedBytes = Number(process.env.PULSE_SSE_MAX_BUFFERED_BYTES ?? 1_048_576),
  agentTimeouts,
  maxMessageChars = Number(process.env.PULSE_MAX_MESSAGE_CHARS ?? 20000),
  invokers,
}) {
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
  // ~/.pulse/config.json fills in whatever the environment did not set.
  applyConfigToEnv(await loadConfig(root));
  agentTimeouts ??= agentTimeoutsFromEnv();
  const agents = providedAgents ?? await detectAgents();
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => resolve(projectRoot));
  const store = await new EventStore(join(root, 'rooms', projectRoomId(canonicalProjectRoot), 'events.jsonl')).initialize();
  const historicalEvents = await store.readAll();
  const room = new Room({
    store,
    agents,
    projectRoot,
    softTokenBudget,
    contextMaxChars,
    historicalEvents,
    invokers,
    agentTimeouts,
    maxMessageChars,
  });
  const recoveredTurns = await room.reconcile();
  if (recoveredTurns) console.error(`PULSE recovered ${recoveredTurns} unfinished turn(s) from a previous run.`);
  const quotaMonitor = new QuotaMonitor({
    sources: quotaSources,
    intervalMs: quotaPollIntervalMs,
    onReport: (report) => room.reportOfficialQuota(report),
  });
  await quotaMonitor.start();
  // SSE fan-out works from the durable log, not from in-memory emits, so events
  // appended by another PULSE process on the same room reach open pages too.
  // `clients` maps each SSE response to the last sequence it already holds.
  const clients = new Map();
  let lastBroadcastSequence = historicalEvents.at(-1)?.sequence ?? 0;
  // Byte offset of the log already broadcast; the poller only reads past it.
  let tailOffset = (await store.tail(0)).offset;
  let inFlight = null;
  let dirty = false;
  // A client that stops draining is dropped instead of buffering without bound.
  const writeEvent = (client, event) => {
    client.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);
    if (client.writableLength > sseMaxBufferedBytes) {
      clients.delete(client);
      client.destroy();
      return false;
    }
    return true;
  };

  function broadcastPending() {
    if (inFlight) {
      dirty = true;
      return inFlight;
    }
    inFlight = (async () => {
      try {
        do {
          dirty = false;
          const { events, offset } = await store.tail(tailOffset);
          tailOffset = offset;
          for (const event of events) {
            if (event.sequence <= lastBroadcastSequence) continue;
            for (const [client, floor] of clients) {
              if (event.sequence > floor) writeEvent(client, event);
            }
            lastBroadcastSequence = event.sequence;
          }
        } while (dirty);
      } catch (error) {
        console.error(`PULSE broadcast error: ${error.message}`);
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }
  const unsubscribe = room.subscribe(() => { void broadcastPending(); });
  const poller = setInterval(() => { void broadcastPending(); }, broadcastIntervalMs);
  poller.unref();

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        const html = await readFile(join(publicDirectory, 'index.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return response.end(html);
      }
      if (request.method === 'GET' && (url.pathname === '/app.js' || url.pathname === '/brands.js')) {
        const js = await readFile(join(publicDirectory, url.pathname.slice(1)));
        response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        return response.end(js);
      }
      if (request.method === 'GET' && url.pathname === '/styles.css') {
        const css = await readFile(join(publicDirectory, 'styles.css'));
        response.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
        return response.end(css);
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        return sendJson(response, 200, {
          projectRoot,
          agents,
          softTokenBudget,
          quotaSources: quotaMonitor.snapshot(),
          events: await store.readAll(),
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/events') {
        const sinceValue = request.headers['last-event-id'] ?? url.searchParams.get('since');
        const since = sinceValue === undefined || sinceValue === null || sinceValue === '' ? null : Number(sinceValue);
        response.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        response.write(': connected\n\n');
        // Replay what this client missed between /api/state and this connection,
        // then register it so the shared cursor delivers everything newer.
        const events = Number.isFinite(since) ? await store.readAll() : [];
        let floor = Number.isFinite(since) ? since : 0;
        for (const event of events) {
          if (event.sequence > floor && event.sequence <= lastBroadcastSequence) {
            writeEvent(response, event);
            floor = event.sequence;
          }
        }
        clients.set(response, floor);
        request.on('close', () => clients.delete(response));
        void broadcastPending();
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/messages') {
        const payload = await body(request);
        void room.send(payload).catch((error) => {
          console.error(`PULSE room error: ${error.message}`);
        });
        return sendJson(response, 202, { accepted: true });
      }
      if (request.method === 'POST' && url.pathname === '/api/test/limits' && testMode) {
        const payload = await body(request);
        const warning = await room.reportLimit({
          agent: payload.agent,
          usedPercent: payload.usedPercent,
          source: 'test-simulation',
        });
        return sendJson(response, 200, { emitted: Boolean(warning), warning });
      }
      sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
  });
  // `server.close()` only resolves once every connection has ended, so the
  // long-lived SSE responses must be ended before the native close runs.
  const nativeClose = server.close.bind(server);
  server.close = (callback) => {
    clearInterval(poller);
    // In-flight agent processes are killed and their turns recorded as failed
    // before the SSE clients go away, so open pages see the outcome.
    const shutdown = room.shutdown().catch((error) => console.error(`PULSE shutdown error: ${error.message}`));
    let result;
    shutdown.then(() => {
      void broadcastPending().then(() => {
        unsubscribe();
        for (const client of clients.keys()) client.end();
        clients.clear();
        result = nativeClose(callback);
        server.closeIdleConnections?.();
      });
    });
    return server;
  };
  server.on('close', () => quotaMonitor.stop());

  return { server, store, agents, quotaMonitor };
}

export async function startPulse({ port, projectRoot, openBrowser }) {
  const { server, agents } = await createPulseServer({ projectRoot });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;
  const ready = agents.filter((agent) => agent.ready).map((agent) => agent.label).join(', ') || 'none';
  const detected = agents.filter((agent) => agent.detected).map((agent) => agent.label).join(', ') || 'none';
  console.log(`\nPULSE is ready\n\n  ${url}\n  Project: ${projectRoot}\n  Ready: ${ready}\n  Detected: ${detected}\n`);
  if (openBrowser) openUrl(url);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
  return { server, url };
}
