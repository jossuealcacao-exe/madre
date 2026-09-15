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
  softTokenBudget = Number(process.env.PULSE_SOFT_TOKEN_BUDGET ?? 100000),
  contextMaxChars = Number(process.env.PULSE_CONTEXT_MAX_CHARS ?? 16000),
  quotaSources = [],
  quotaPollIntervalMs = Number(process.env.PULSE_QUOTA_POLL_INTERVAL_MS ?? 60000),
  invokers,
}) {
  const agents = providedAgents ?? await detectAgents();
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
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
  });
  const quotaMonitor = new QuotaMonitor({
    sources: quotaSources,
    intervalMs: quotaPollIntervalMs,
    onReport: (report) => room.reportOfficialQuota(report),
  });
  await quotaMonitor.start();
  const clients = new Set();
  room.subscribe((event) => {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) client.write(line);
  });

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        const html = await readFile(join(publicDirectory, 'index.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return response.end(html);
      }
      if (request.method === 'GET' && url.pathname === '/app.js') {
        const js = await readFile(join(publicDirectory, 'app.js'));
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
          quotaSources: quotaMonitor.snapshot(),
          events: await store.readAll(),
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/events') {
        response.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        response.write(': connected\n\n');
        clients.add(response);
        request.on('close', () => clients.delete(response));
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
  return { server, url };
}
