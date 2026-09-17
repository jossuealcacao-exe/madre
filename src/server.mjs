import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { detectAgents } from './runtime-detection.mjs';
import { EventStore } from './event-store.mjs';
import { RoomMemory } from './memory.mjs';
import { QuotaMonitor } from './quota-monitor.mjs';
import { defaultQuotaSources } from './quota-sources.mjs';
import { Room } from './room.mjs';
import { applyConfigToEnv, loadConfig } from './config.mjs';
import { extensionById, listExtensions, runInstaller } from './extensions.mjs';
import { loginPlanFor, probeAll } from './auth-probe.mjs';
import { loadConfig as readConfig, updateConfig } from './config.mjs';
import { discoverModels } from './models.mjs';
import { setImageModule } from './capabilities.mjs';
import { resolveGeminiKey } from './image-studio.mjs';
import { commandByName, listCommands, parseCommand } from './commands.mjs';
import { listDirectory, searchFiles, readServable, storeAttachment, MAX_ATTACHMENT_BYTES } from './files.mjs';

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
  // Real limits per CLI where the CLI publishes them. Only the CLI entry
  // point (startPulse) turns them on; tests and embedders pass their own.
  quotaSources = [],
  quotaPollIntervalMs = Number(process.env.PULSE_QUOTA_POLL_INTERVAL_MS ?? 60000),
  broadcastIntervalMs = Number(process.env.PULSE_BROADCAST_INTERVAL_MS ?? 500),
  sseMaxBufferedBytes = Number(process.env.PULSE_SSE_MAX_BUFFERED_BYTES ?? 1_048_576),
  agentTimeouts,
  maxMessageChars = Number(process.env.PULSE_MAX_MESSAGE_CHARS ?? 20000),
  delegation = process.env.PULSE_DELEGATION !== '0',
  maxPlanSteps = Number(process.env.PULSE_MAX_PLAN_STEPS ?? 4),
  invokers,
  // Tests substitute the real installers with local scripts.
  installers = {},
  loginRunners = {},
  probe = probeAll,
  imageKey = resolveGeminiKey,
}) {
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
  // ~/.pulse/config.json fills in whatever the environment did not set.
  applyConfigToEnv(await loadConfig(root));
  agentTimeouts ??= agentTimeoutsFromEnv();
  const agents = providedAgents ?? await detectAgents();
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => resolve(projectRoot));
  const roomDir = join(root, 'rooms', projectRoomId(canonicalProjectRoot));
  const store = await new EventStore(join(roomDir, 'events.jsonl')).initialize();
  const historicalEvents = await store.readAll();
  // The room's memory: derived from the ledger, rebuilt if missing or stale,
  // and never a reason for the room not to open.
  const memory = await new RoomMemory(join(roomDir, 'memory.sqlite')).initialize(store)
    .catch((error) => { console.error(`MADRE memory unavailable, turns get the recent window only: ${error.message}`); return null; });
  const room = new Room({
    store,
    agents,
    projectRoot,
    softTokenBudget,
    contextMaxChars,
    memory,
    historicalEvents,
    invokers,
    agentTimeouts,
    maxMessageChars,
    delegation,
    maxPlanSteps,
  });
  // Session state per agent, refreshed on demand from the connections panel.
  let sessions = {};
  let sessionsAt = null;
  async function refreshSessions() {
    sessions = await probe(agents);
    sessionsAt = new Date().toISOString();
    return sessions;
  }
  void refreshSessions().catch((error) => console.error(`MADRE session probe failed: ${error.message}`));

  // Effective settings = environment + config file + live changes; the file
  // is what survives a restart.
  function effectiveSettings() {
    const current = room.settings();
    return {
      timeouts: Object.fromEntries(agents.map((agent) => [agent.id, room.timeoutFor(agent.id)])),
      defaultTimeout: current.agentTimeouts.default ?? 180000,
      delegation: current.delegation,
      maxPlanSteps: current.maxPlanSteps,
      softTokenBudget: current.softTokenBudget,
      opencodeModel: process.env.PULSE_OPENCODE_MODEL ?? null,
      geminiIdleMs: Number(process.env.PULSE_GEMINI_IDLE_MS ?? 90000),
      geminiRetries: Number(process.env.PULSE_GEMINI_RETRIES ?? 1),
      capabilities: room.capabilities(),
    };
  }
  async function applySettings(patch) {
    const config = {};
    const live = {};
    if (patch.opencode && 'model' in patch.opencode) {
      config.opencode = { model: patch.opencode.model || undefined };
      if (patch.opencode.model) process.env.PULSE_OPENCODE_MODEL = String(patch.opencode.model); else delete process.env.PULSE_OPENCODE_MODEL;
    }
    if (patch.timeouts) {
      const timeouts = { ...room.settings().agentTimeouts };
      for (const [key, value] of Object.entries(patch.timeouts)) {
        const ms = Number(value);
        if (Number.isFinite(ms) && ms > 0) timeouts[key] = ms; else delete timeouts[key];
      }
      // A one-field save must not erase the other timeouts on disk.
      const stored = { ...((await readConfig(root)).timeouts ?? {}) };
      for (const [key, value] of Object.entries(patch.timeouts)) { if (Number(value) > 0) stored[key] = Number(value); else delete stored[key]; }
      config.timeouts = stored;
      live.agentTimeouts = timeouts;
    }
    if (patch.room) {
      config.room = { ...((await readConfig(root)).room ?? {}) };
      if (typeof patch.room.delegation === 'boolean') { config.room.delegation = patch.room.delegation; live.delegation = patch.room.delegation; }
      if (Number(patch.room.maxPlanSteps) > 0) { config.room.maxPlanSteps = Number(patch.room.maxPlanSteps); live.maxPlanSteps = Number(patch.room.maxPlanSteps); }
      if (Number(patch.room.softTokenBudget) > 0) { config.room.softTokenBudget = Number(patch.room.softTokenBudget); live.softTokenBudget = Number(patch.room.softTokenBudget); }
    }
    if (patch.scopes && typeof patch.scopes === 'object') {
      const current = (await readConfig(root)).scopes ?? {};
      config.scopes = { ...current };
      for (const [agentId, scopes] of Object.entries(patch.scopes)) {
        if (!agents.some((agent) => agent.id === agentId) || !scopes || typeof scopes !== 'object') continue;
        config.scopes[agentId] = { ...(current[agentId] ?? {}) };
        for (const scope of ['write', 'imageGen', 'web', 'alwaysCreate']) if (typeof scopes[scope] === 'boolean') config.scopes[agentId][scope] = scopes[scope];
        if (Number.isInteger(Number(scopes.maxMode)) && Number(scopes.maxMode) >= 0 && Number(scopes.maxMode) <= 3) config.scopes[agentId].maxMode = Number(scopes.maxMode);
      }
      room.setScopes(config.scopes);
    }
    if (patch.gemini) {
      config.gemini = { ...((await readConfig(root)).gemini ?? {}) };
      if (Number(patch.gemini.idleMs) > 0) { config.gemini.idleMs = Number(patch.gemini.idleMs); process.env.PULSE_GEMINI_IDLE_MS = String(Number(patch.gemini.idleMs)); }
      if (Number.isFinite(Number(patch.gemini.retries))) { config.gemini.retries = Number(patch.gemini.retries); process.env.PULSE_GEMINI_RETRIES = String(Number(patch.gemini.retries)); }
    }
    room.configure(live);
    await updateConfig(root, config);
    await room.record('room.settings', { changed: Object.keys(config), settings: effectiveSettings() });
    return effectiveSettings();
  }

  let loggingIn = null;
  async function loginAgent(id) {
    const agent = agents.find((item) => item.id === id);
    if (!agent) return { status: 404, body: { error: `Unknown agent: ${id}.` } };
    if (!agent.detected) return { status: 412, body: { error: `${agent.label} is not installed on this computer.`, install: loginPlanFor(agent)?.install ?? [] } };
    const plan = loginRunners[id]?.(agent) ?? loginPlanFor(agent);
    if (!plan) return { status: 404, body: { error: `No sign-in flow known for ${id}.` } };
    if (!plan.headless) return { status: 409, body: { error: `${agent.label} signs in from its own prompt. Run this in a terminal, then press RECHECK.`, command: plan.display, note: plan.note } };
    if (loggingIn) return { status: 409, body: { error: `A sign-in is already running (${loggingIn}).` } };
    loggingIn = id;
    await room.record('connection.login.started', { agent: id, command: plan.display, note: plan.note });
    void (async () => {
      const lines = [];
      const result = await runInstaller({
        command: plan.command,
        args: plan.args,
        projectRoot: canonicalProjectRoot,
        timeoutMs: 300000,
        onLine: (line) => {
          lines.push(line);
          const url = line.match(/https?:\/\/\S+/)?.[0] ?? null;
          void room.record('connection.login.output', { agent: id, line: line.slice(0, 500), url });
        },
      });
      await refreshSessions();
      await room.record('connection.login.finished', { agent: id, code: result.code, error: result.error ?? null, session: sessions[id] ?? null, tail: lines.slice(-6) });
      loggingIn = null;
    })();
    return { status: 202, body: { accepted: true, command: plan.display } };
  }

  // Attachments live beside the room log, never inside the project.
  const roomDirectory = join(root, 'rooms', projectRoomId(canonicalProjectRoot));
  const attachmentsRoot = join(roomDirectory, 'attachments');
  room.restoreAttachments(historicalEvents
    .filter((event) => event.type === 'attachment.stored')
    .map((event) => ({ ...event.payload, path: join(attachmentsRoot, event.payload.fileName), dir: attachmentsRoot })));

  async function rawBody(request, limit) {
    const chunks = [];
    let total = 0;
    for await (const chunk of request) {
      total += chunk.length;
      if (total > limit) throw Object.assign(new Error(`Attachment is larger than ${Math.round(limit / 1024 / 1024)} MB.`), { status: 413 });
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  const startupConfig = await readConfig(root);
  room.setScopes(startupConfig.scopes ?? {});
  setImageModule(startupConfig.modules?.imageStudio ?? {});
  room.setAshCode(Boolean(startupConfig.modules?.ashCode?.enabled));
  const recoveredTurns = await room.reconcile();
  if (recoveredTurns) console.error(`MADRE recovered ${recoveredTurns} unfinished turn(s) from a previous run.`);
  const quotaMonitor = new QuotaMonitor({
    sources: quotaSources,
    intervalMs: quotaPollIntervalMs,
    onReport: (report) => room.reportOfficialQuota(report),
  });
  await quotaMonitor.start();
  // SSE fan-out works from the durable log, not from in-memory emits, so events
  // appended by another MADRE process on the same room reach open pages too.
  // `clients` maps each SSE response to the last sequence it already holds.
  const clients = new Map();
  let lastBroadcastSequence = historicalEvents.at(-1)?.sequence ?? 0;
  // Byte offset of the log already broadcast; the poller only reads past it.
  let tailOffset = (await store.tail(0)).offset;
  let inFlight = null;
  let dirty = false;
  // A client that stops draining is dropped instead of buffering without bound.
  const writeEvent = (client, event) => {
    // Ghost events have no sequence: they are never in the log, so no `id:`
    // line, and a reconnecting client will not ask for them again.
    client.write(`${event.sequence ? `id: ${event.sequence}\n` : ''}data: ${JSON.stringify(event)}\n\n`);
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
        console.error(`MADRE broadcast error: ${error.message}`);
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }
  const unsubscribe = room.subscribe(() => { void broadcastPending(); });
  const unsubscribeGhost = room.subscribeGhost((event) => { for (const client of clients.keys()) writeEvent(client, event); });
  const poller = setInterval(() => { void broadcastPending(); }, broadcastIntervalMs);
  poller.unref();

  let installing = null;
  async function installExtension(id, { confirm } = {}) {
    const extension = extensionById(id);
    if (!extension) return { status: 404, body: { error: `Unknown module: ${id}.` } };
    if (extension.id === 'ashcode') {
      const current = await readConfig(root);
      const enabled = !Boolean(current.modules?.ashCode?.enabled);
      if (enabled && confirm !== true) return { status: 400, body: { error: 'AshCode is beta and can change meaning. Send { "confirm": true } to enable it.' } };
      await updateConfig(root, { modules: { ...current.modules, ashCode: { enabled } } });
      room.setAshCode(enabled);
      await room.record('extension.toggled', { id, name: extension.name, enabled, beta: true });
      return { status: 200, body: { enabled, beta: true, warning: 'AshCode beta may alter meaning; review the original. Character reduction is not verified token savings.' } };
    }
    if (extension.kind === 'builtin') {
      // Image Studio: a switch in config.json, nothing written to the project.
      const current = await readConfig(root);
      const enabled = !(current.modules?.imageStudio?.enabled);
      const key = await imageKey();
      if (enabled && !key) return { status: 412, body: { error: 'No Gemini API key found. Sign in with the Gemini CLI (/auth → API key) or set GEMINI_API_KEY, then enable Image Studio.' } };
      const model = typeof arguments[1]?.model === 'string' && arguments[1].model ? arguments[1].model : (current.modules?.imageStudio?.model ?? extension.models[0]);
      await updateConfig(root, { modules: { ...current.modules, imageStudio: { enabled, model } } });
      setImageModule({ enabled, model });
      await room.record('extension.toggled', { id, name: extension.name, enabled, model });
      return { status: 200, body: { enabled, model, capabilities: room.capabilities() } };
    }
    if (confirm !== true) return { status: 400, body: { error: 'Installing a module writes into the project; send { "confirm": true } to proceed.' } };
    if (installing) return { status: 409, body: { error: `Another install is running (${installing}).` } };
    const preflight = extension.preflight ? await extension.preflight(canonicalProjectRoot) : { ok: true, problems: [] };
    if (!preflight.ok && !installers[id]) {
      await room.record('extension.install.refused', { id, name: extension.name, problems: preflight.problems });
      return { status: 412, body: { error: preflight.problems.join(' '), problems: preflight.problems } };
    }
    const before = await extension.detect(canonicalProjectRoot);
    const plan = installers[id]?.({ projectRoot: canonicalProjectRoot, agents }) ?? extension.installCommand({ agents });
    installing = id;
    await room.record('extension.install.started', { id, name: extension.name, command: plan.display, platforms: plan.platforms ?? [], alreadyInstalled: before.installed });
    void (async () => {
      const lines = [];
      let pending = [];
      let flushTimer = null;
      const flush = async () => {
        flushTimer = null;
        if (!pending.length) return;
        const batch = pending;
        pending = [];
        await room.record('extension.install.output', { id, lines: batch });
      };
      const result = await runInstaller({
        command: plan.command,
        args: plan.args,
        projectRoot: canonicalProjectRoot,
        onLine: (line) => {
          lines.push(line);
          pending.push(line.slice(0, 500));
          if (pending.length >= 20) void flush();
          else if (!flushTimer) flushTimer = setTimeout(() => { void flush(); }, 400);
        },
      });
      clearTimeout(flushTimer);
      await flush();
      const after = await extension.detect(canonicalProjectRoot);
      await room.record('extension.install.finished', {
        id,
        name: extension.name,
        code: result.code,
        error: result.error ?? null,
        ok: result.code === 0 && after.installed,
        status: after,
        tail: lines.slice(-12),
      });
      installing = null;
    })();
    return { status: 202, body: { accepted: true, command: plan.display } };
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        const html = await readFile(join(publicDirectory, 'index.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return response.end(html);
      }
      if (request.method === 'GET' && ['/app.js', '/brands.js', '/troubleshooting.js'].includes(url.pathname)) {
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
          ashCode: { enabled: room.ashCodeEnabled() },
          softTokenBudget,
          timeouts: Object.fromEntries(agents.map((agent) => [agent.id, room.timeoutFor(agent.id)])),
          delegation: { enabled: room.settings().delegation, maxPlanSteps: room.settings().maxPlanSteps },
          plans: room.activePlans(),
          turns: room.activeTurns(),
          modeRequests: room.pendingModeRequests(),
          control: room.control(),
          sessions,
          sessionsAt,
          capabilities: room.capabilities(),
          quotaSources: quotaMonitor.snapshot(),
          budgetWindow: room.budgetWindow(),
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
      if (request.method === 'GET' && url.pathname === '/api/tree/search') {
        const matches = await searchFiles(canonicalProjectRoot, url.searchParams.get('q') ?? '', { limit: Math.min(Number(url.searchParams.get('limit')) || 20, 50) });
        return sendJson(response, 200, { matches });
      }
      if (request.method === 'GET' && url.pathname === '/api/tree') {
        const listing = await listDirectory(canonicalProjectRoot, url.searchParams.get('path') ?? '.');
        if (listing.status !== 200) return sendJson(response, listing.status, { error: listing.error });
        return sendJson(response, 200, { path: url.searchParams.get('path') ?? '.', entries: listing.entries, truncated: listing.truncated });
      }
      if (request.method === 'GET' && url.pathname === '/api/files') {
        const which = url.searchParams.get('root') === 'attachments' ? attachmentsRoot : canonicalProjectRoot;
        const file = await readServable(which, url.searchParams.get('path') ?? '');
        if (file.status !== 200) return sendJson(response, file.status, { error: file.error });
        response.writeHead(200, {
          'content-type': file.contentType,
          'content-length': file.size,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
          'content-disposition': `inline; filename="${encodeURIComponent(basename(file.path))}"`,
        });
        return response.end(file.body);
      }
      if (request.method === 'POST' && url.pathname === '/api/attachments') {
        let bytes;
        try {
          bytes = await rawBody(request, MAX_ATTACHMENT_BYTES);
        } catch (error) {
          return sendJson(response, error.status ?? 400, { error: error.message });
        }
        const name = decodeURIComponent(request.headers['x-pulse-filename'] ?? url.searchParams.get('name') ?? 'attachment');
        const record = await room.registerAttachment(await storeAttachment(attachmentsRoot, { name, bytes }));
        return sendJson(response, 201, { attachment: { id: record.id, name: record.name, fileName: record.fileName, size: record.size, contentType: record.contentType, url: `/api/files?root=attachments&path=${encodeURIComponent(record.fileName)}` } });
      }
      if (request.method === 'GET' && url.pathname === '/api/settings') {
        return sendJson(response, 200, { settings: effectiveSettings(), config: await readConfig(root), sessions, sessionsAt, loggingIn, agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent) })) });
      }
      if (request.method === 'POST' && url.pathname === '/api/settings') {
        return sendJson(response, 200, { settings: await applySettings(await body(request)) });
      }
      if (request.method === 'POST' && url.pathname === '/api/agents/probe') {
        return sendJson(response, 200, { sessions: await refreshSessions(), sessionsAt });
      }
      const loginMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/login$/);
      if (loginMatch) {
        const result = await loginAgent(loginMatch[1]);
        return sendJson(response, result.status, result.body);
      }
      if (request.method === 'GET' && url.pathname === '/api/models') {
        const listOpenCode = async (opencode) => {
          const models = [];
          await runInstaller({ command: opencode.path, args: ['models'], projectRoot: canonicalProjectRoot, timeoutMs: 20000, onLine: (line) => { if (/^[\w.-]+\/[\w.:-]+$/.test(line.trim())) models.push(line.trim()); } });
          return models;
        };
        return sendJson(response, 200, { models: await discoverModels({ agents, config: await readConfig(root), listOpenCode: url.searchParams.get('opencode') === '1' ? listOpenCode : async () => [] }) });
      }
      if (request.method === 'GET' && url.pathname === '/api/agents/opencode/models') {
        const opencode = agents.find((agent) => agent.id === 'opencode');
        if (!opencode?.detected) return sendJson(response, 404, { error: 'OpenCode is not installed.' });
        const models = [];
        await runInstaller({ command: opencode.path, args: ['models'], projectRoot: canonicalProjectRoot, timeoutMs: 20000, onLine: (line) => { if (/^[\w.-]+\/[\w.:-]+$/.test(line.trim())) models.push(line.trim()); } });
        return sendJson(response, 200, { models });
      }
      if (request.method === 'POST' && url.pathname === '/api/stop-all') {
        const result = await room.stopAll();
        return sendJson(response, 202, { stopped: true, ...result });
      }
      const stopMatch = request.method === 'POST' && url.pathname.match(/^\/api\/plans\/([0-9a-f-]+)\/stop$/);
      if (stopMatch) {
        const stopped = await room.stopPlan(stopMatch[1]);
        return sendJson(response, stopped ? 202 : 404, stopped ? { stopped: true } : { error: 'No running plan with that id.' });
      }
      if (request.method === 'GET' && url.pathname === '/api/commands') {
        return sendJson(response, 200, { commands: await listCommands({ projectRoot: canonicalProjectRoot }) });
      }
      if (request.method === 'POST' && url.pathname === '/api/commands') {
        const { text } = await body(request);
        const parsed = parseCommand(text);
        if (!parsed) return sendJson(response, 400, { error: 'Not a command. Commands start with "/" followed by a name.' });
        const command = commandByName(parsed.name);
        if (!command) return sendJson(response, 404, { error: `Unknown command /${parsed.name}.` });
        if (!(await command.available({ projectRoot: canonicalProjectRoot }))) return sendJson(response, 412, { error: `/${parsed.name} is not available in this project (${command.title}).` });
        const result = await command.execute({ projectRoot: canonicalProjectRoot, args: parsed.args });
        const event = await room.recordCommand({ name: parsed.name, args: parsed.args, ...result });
        return sendJson(response, result.ok ? 200 : 422, { command: parsed.name, title: result.title, ok: result.ok, sequence: event.sequence });
      }
      if (request.method === 'GET' && url.pathname === '/api/extensions') {
        return sendJson(response, 200, { installing, extensions: await listExtensions({ projectRoot: canonicalProjectRoot, agents, config: await readConfig(root), imageKey }) });
      }
      const installMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/install$/);
      if (installMatch) {
        const result = await installExtension(installMatch[1], await body(request));
        return sendJson(response, result.status, result.body);
      }
      if (request.method === 'POST' && /^\/api\/control\/[\w-]+\/undo$/.test(url.pathname)) {
        const result = await room.undoControl(url.pathname.split('/')[3]);
        return sendJson(response, result.ok ? 200 : result.status ?? 400, result);
      }
      if (request.method === 'POST' && /^\/api\/modes\/[\w-]+\/decide$/.test(url.pathname)) {
        const requestId = url.pathname.split('/')[3];
        const { decision } = await body(request);
        const result = room.decideMode(requestId, decision);
        return sendJson(response, result.ok ? 200 : 409, result);
      }
      if (request.method === 'POST' && url.pathname === '/api/messages') {
        const payload = await body(request);
        // Modes are checked before the turn is accepted, so the composer
        // hears "no" with a reason instead of a silent log line.
        const gate = await room.modeCheck(payload);
        if (!gate.ok) return sendJson(response, gate.status ?? 403, { error: gate.error, mode: gate.mode, maxMode: gate.maxMode });
        void room.send(payload).catch((error) => {
          console.error(`MADRE room error: ${error.message}`);
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
    const shutdown = room.shutdown().catch((error) => console.error(`MADRE shutdown error: ${error.message}`));
    let result;
    shutdown.then(() => {
      void broadcastPending().then(() => {
        unsubscribe();
    unsubscribeGhost();
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
  const { server, agents } = await createPulseServer({ projectRoot, quotaSources: defaultQuotaSources() });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;
  const ready = agents.filter((agent) => agent.ready).map((agent) => agent.label).join(', ') || 'none';
  const detected = agents.filter((agent) => agent.detected).map((agent) => agent.label).join(', ') || 'none';
  console.log(`\nMADRE is ready\n\n  ${url}\n  Project: ${projectRoot}\n  Ready: ${ready}\n  Detected: ${detected}\n`);
  if (openBrowser) openUrl(url);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
  return { server, url };
}
