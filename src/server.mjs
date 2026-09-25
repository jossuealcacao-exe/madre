import http from 'node:http';
import { readFile, realpath, writeFile, mkdir, rm } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { detectAgents, toolsPrefix } from './runtime-detection.mjs';
import { EventStore } from './event-store.mjs';
import { RoomMemory } from './memory.mjs';
import { createEmbedder } from './embeddings.mjs';
import { memoryServerFor } from './memory-tools.mjs';
import { MotherChannel, CODE000_STRIKES } from './mother.mjs';
import { ErrorSentinel } from './sentinel-errors.mjs';
import { probeOllama, ollamaEmbedder, ollamaInvoker, pullModel } from './ollama.mjs';
import { moduleById, describeModules, findModuleRoute, toolsForTurn as modulesToolsForTurn, loadExternalModules, loadFailures, moduleFolders, moduleCommands, installModuleFile, installModuleText, verifyModuleText, moduleOrigin, removeExternalModule } from './modules/index.mjs';
import { madreAgent, madreInvoker, MADRE_AGENT_ID, MADRE_ADAPTER } from './adapters/madre.mjs';
import { exportDataset, readiness as datasetReadiness } from './dataset.mjs';
import { OutboundLog, outboundView, DEFAULT_REPORT_URL } from './outbound.mjs';

const PACKAGE = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8').catch(() => '{}'));
let crashHandlersInstalled = false;

// RIPLEY's bridge, injected into every page it renders: reports the page's path
// and title to the viewer and forwards runtime errors and failed resources.
// It talks only upward through postMessage; the frame stays an opaque origin.
export const RIPLEY_BRIDGE = '<script data-ripley>(function(){var p=location.pathname;function send(m){try{parent.postMessage(Object.assign({ripley:1},m),"*")}catch(e){}}send({type:"page",path:p,title:document.title});addEventListener("DOMContentLoaded",function(){send({type:"page",path:p,title:document.title})});addEventListener("error",function(e){if(e.target&&e.target!==window&&!e.message){var u=e.target.src||e.target.href||"";send({type:"error",message:"Failed to load "+(u||e.target.tagName.toLowerCase()),source:u,line:0});return}send({type:"error",message:String(e.message||"error"),source:e.filename||"",line:e.lineno||0})},true);addEventListener("unhandledrejection",function(e){var r=e.reason;send({type:"error",message:"Unhandled promise rejection: "+String(r&&r.message||r),source:"",line:0})})})();</script>';
export function injectRipleyBridge(body) {
  const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  if (text.includes('data-ripley')) return Buffer.from(text);
  const head = text.match(/<head[^>]*>/i);
  if (head) return Buffer.from(text.slice(0, head.index + head[0].length) + RIPLEY_BRIDGE + text.slice(head.index + head[0].length));
  const html = text.match(/<html[^>]*>/i);
  if (html) return Buffer.from(text.slice(0, html.index + html[0].length) + RIPLEY_BRIDGE + text.slice(html.index + html[0].length));
  return Buffer.from(RIPLEY_BRIDGE + text);
}
// The author's collector: SEND and AUTO-REPORT are available out of the box; AUTO-REPORT stays off until the human turns it on.
import { QuotaMonitor } from './quota-monitor.mjs';
import { defaultQuotaSources } from './quota-sources.mjs';
import { Room } from './room.mjs';
import { applyConfigToEnv, loadConfig } from './config.mjs';
import { extensionById, findOnPath, runInstaller } from './extensions.mjs';
import { accountNoteFor, installPlanFor, looksLikeAdminProblem, loginPlanFor, probeAgentAuth, probeAll, TAKES_KEY } from './auth-probe.mjs';
import { applyKey, keyPlanFor } from './credentials.mjs';
import { loadConfig as readConfig, updateConfig } from './config.mjs';
import { Privacy, normalizeTerms, privacySettings } from './privacy.mjs';
import { checkForUpdate, detectInstall, updateCommand, releaseUrl, applyCommand } from './updates.mjs';
import { moduleUpdate } from './modules/updates.mjs';
import { adoptStrays, chatIndex, chatLedger, createChat, deleteChat, isChatId, listChats, openChat as openChatIndex, projectFloor, renameChat, touchChat, MAIN_CHAT } from './chats.mjs';
import { spawn } from 'node:child_process';
import { totalmem } from 'node:os';
import { discoverModels } from './models.mjs';
import { setImageModule } from './capabilities.mjs';
import { resolveGeminiKey } from './image-studio.mjs';
import { commandByName, listCommands, parseCommand } from './commands.mjs';
import { listDirectory, searchFiles, readServable, storeAttachment, MAX_ATTACHMENT_BYTES } from './files.mjs';
import { Eyecat } from './eyecat-watch.mjs';
import { economy } from './room/economy.mjs';
import { maturity } from './maturity.mjs';
import { verdictFor } from './verdict.mjs';

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

export function openUrl(url) {
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
  // Looking again for the CLIs on this computer. A test that hands a fixed roster also hands
  // this, or the room keeps the roster it was given.
  detect = null,
  // Where a pasted provider key is written: each CLI's own place under the human's home.
  credentialHome = homedir(),
  probe = probeAll,
  imageKey = resolveGeminiKey,
  // The sentinel's outbound channel; tests hand in a fake.
  reportFetch = globalThis.fetch,
  // Ollama detection; tests hand in a fake probe. PULSE_OLLAMA=0 leaves Ollama alone entirely.
  ollamaProbe = process.env.PULSE_OLLAMA === '0' ? async () => ({ running: false, host: null, models: [], embedModel: null, chatModel: null, disabled: true }) : probeOllama,
}) {
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
  // ~/.pulse/config.json fills in whatever the environment did not set.
  applyConfigToEnv(await loadConfig(root));
  // RIPLEY renders HTML in the viewer only while the human has it switched on; read live, the switch is the module's.
  const ripleyOn = async () => Boolean((await readConfig(root)).modules?.ripley?.enabled);
  agentTimeouts ??= agentTimeoutsFromEnv();
  const detector = detect ?? (providedAgents ? null : detectAgents);
  const agents = providedAgents ?? await detector();
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => resolve(projectRoot));
  const roomDir = join(root, 'rooms', projectRoomId(canonicalProjectRoot));
  // What left this machine. Every fetch this process makes — MADRE's own and any a module makes,
  // because a module runs in here and cannot opt out — goes through one wrapper and lands in a
  // line beside the ledger. Bodies, headers and query values are never in it. One room per
  // process holds the watch; a second would only log what the first already logged.
  const outbound = await new OutboundLog({ file: join(roomDir, 'outbound.jsonl') }).load();
  const unwatchOutbound = outbound.install();
  process.env.PULSE_OUTBOUND_LOG = join(roomDir, 'outbound.jsonl');
  reportFetch = outbound.watch(reportFetch);

  // Attachments live beside the room log, never inside the project, and belong to the project
  // rather than to one conversation.
  const attachmentsRoot = join(roomDir, 'attachments');
  // One server per project, and now it is said out loud. A project numbers its exchanges once
  // across every conversation, so two servers writing different conversations of the same project
  // would hand out the same number twice and the archive would quietly keep one of them. The CLI
  // already looked for a room nearby; a room that was started on a distant port walked past that
  // check. This is the room itself saying it is taken.
  const openMark = join(roomDir, 'open.json');
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
  const held = await readFile(openMark, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
  if (held && Number.isInteger(held.pid) && held.pid !== process.pid && alive(held.pid)) {
    const error = new Error(`MADRE is already open for this project at http://127.0.0.1:${held.port} (process ${held.pid}). Close that room first, or open another conversation inside it.`);
    error.code = 'ROOM_IN_USE';
    throw error;
  }
  const markOpen = async (port) => { await mkdir(roomDir, { recursive: true }).catch(() => {}); await writeFile(openMark, JSON.stringify({ pid: process.pid, port, at: new Date().toISOString() })).catch(() => {}); };
  const releaseOpen = () => { try { rmSync(openMark, { force: true }); } catch { /* it was already gone */ } };
  // The human's own modules, from ~/.pulse/modules and <project>/.madre/modules.
  await loadExternalModules({ stateRoot: root, projectRoot: canonicalProjectRoot }).catch((error) => console.error(`MADRE modules: ${error.message}`));
  // A project has one memory and many conversations; one of them is open at a time, and the
  // numbering is the project's, so a citation means the same thing in all of them.
  await adoptStrays(roomDir).catch(() => null);
  let chatId = (await chatIndex(roomDir)).active;
  let store = await new EventStore(chatLedger(roomDir, chatId), { floor: await projectFloor(roomDir, { except: chatId }) }).initialize();
  let historicalEvents = await store.readAll();
  // The room's memory: derived from the ledger, rebuilt if missing or stale,
  // and never a reason for the room not to open.
  // Release channel: one registry read a day, cached for every room on this machine. On by
  // default; PULSE_UPDATE_CHECK=0 or the switch in MU/TH/UR turns it off. Never self-updates.
  const updatesEnabled = () => (process.env.PULSE_UPDATE_CHECK !== undefined ? process.env.PULSE_UPDATE_CHECK !== '0' : updatesConfig.check !== false);
  let updatesConfig = { ...((await readConfig(root)).updates ?? {}) };
  const install = detectInstall({ projectRoot: canonicalProjectRoot });
  async function versionView({ force = false } = {}) {
    const check = await checkForUpdate({ name: PACKAGE.name, current: PACKAGE.version, cacheFile: join(root, 'updates.json'), fetchImpl: reportFetch, enabled: updatesEnabled(), force });
    return { project: canonicalProjectRoot, ...check, name: PACKAGE.name, install, command: updateCommand(install, PACKAGE.name, check.latest ?? 'latest'), release: check.latest ? releaseUrl(PACKAGE.repository, check.latest) : null, envWins: process.env.PULSE_UPDATE_CHECK !== undefined };
  }
  // Keeping the day's cache warm. MODULES is served from what is already on disk, so the looking
  // happens after the screen is answered, never in front of it: at most once an hour per room,
  // only while the release channel is on, and each check still holds to its own day-long cache.
  let warmedAt = 0;
  async function warmModuleUpdates(items, { now = Date.now() } = {}) {
    if (!updatesEnabled() || now - warmedAt < 60 * 60 * 1000) return;
    warmedAt = now;
    const context = await moduleContext().catch(() => null);
    if (!context) return;
    for (const item of items) await context.services.moduleUpdate(item, { cacheOnly: false }).catch(() => null);
  }

  // Privacy: the terms that never travel through this room, from config.json and the environment.
  // config.json is shared by every room on this machine, so the list is re-read before each
  // human message and whenever MU/TH/UR looks: a term named in one room guards them all.
  const privacy = new Privacy({ ...privacySettings(await readConfig(root)), home: homedir() });
  const refreshPrivacy = async () => { const { terms, marker, secrets, paths } = privacySettings(await readConfig(root)); privacy.set(terms, marker).setGuards({ secrets, paths }); return privacy; };
  const memory = await new RoomMemory(join(roomDir, 'memory.sqlite')).attachPrivacy(privacy).initialize(store)
    .catch((error) => { console.error(`MADRE memory unavailable, turns get the recent window only: ${error.message}`); return null; });
  // Meaning-aware recall through the user's own Gemini key, when there is one;
  // and the memory as MCP tools for every agent's turn.
  // Ollama, when it is there: local embeddings and a local archivist. Probed at
  // start and again from MODULES; wired live, no restart.
  let ollama = { running: false, host: null, models: [], embedModel: null, chatModel: null };
  const ollamaSettings = async () => ({ enabled: true, embeddings: true, archivist: true, agent: true, ...((await readConfig(root)).modules?.ollama ?? {}) });
  // What the TRAIN card needs: where the recipe ships, the room, the model name @madre will pick up, a base that fits this machine.
  function trainingInfo() {
    const slug = basename(canonicalProjectRoot).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const gb = Math.round(totalmem() / 1024 ** 3);
    return { roomDir, recipeDir: fileURLToPath(new URL('../docs/training/', import.meta.url)), modelName: `madre-${slug}`, baseModel: gb >= 32 ? 'Qwen/Qwen2.5-3B-Instruct' : 'Qwen/Qwen2.5-1.5B-Instruct', memoryGb: gb };
  }
  async function wireOllama({ probe: doProbe = true } = {}) {
    if (doProbe) ollama = await ollamaProbe();
    // A model trained on this room (docs/training) is named madre-<project>: @madre uses it when it exists.
    const slug = basename(canonicalProjectRoot).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const trained = (ollama.models ?? []).map((model) => model.name).find((name) => name.startsWith(`madre-${slug}`)) ?? null;
    ollama = { ...ollama, madreModel: trained };
    const settings = await ollamaSettings();
    const useEmbeddings = ollama.running && settings.enabled && settings.embeddings && ollama.embedModel;
    const useArchivist = ollama.running && settings.enabled && settings.archivist && ollama.chatModel;
    if (memory) {
      const key = process.env.PULSE_EMBED === '0' ? null : await imageKey().catch(() => null);
      const embedder = createEmbedder({ key, env: embedEnvFor(await memoryConfig()), ollama: useEmbeddings ? ollama : null, ollamaEmbedder });
      if (room) room.setEmbedder(embedder); else memory.attachEmbedder(embedder);
    }
    if (room) room.setInvoker('ollama', useArchivist ? ollamaInvoker({ host: ollama.host, model: ollama.chatModel }) : null);
    // @madre: the fifth agent, present whenever Ollama has a chat model and the human left it on.
    const fifth = madreAgent({ ...ollama, chatModel: ollama.madreModel ?? ollama.chatModel }, { enabled: settings.enabled && settings.agent !== false });
    const index = agents.findIndex((agent) => agent.id === MADRE_AGENT_ID);
    let changed = false;
    if (fifth.ready && index < 0) { agents.push(fifth); changed = true; }
    else if (fifth.ready && (agents[index].version !== fifth.version)) { Object.assign(agents[index], fifth); changed = true; }
    else if (!fifth.ready && index >= 0) { agents.splice(index, 1); changed = true; }
    if (room) {
      room.setInvoker(MADRE_ADAPTER, fifth.ready ? madreInvoker({ memory, ollama: () => ({ ...ollama, chatModel: ollama.madreModel ?? ollama.chatModel }), fetchImpl: reportFetch }) : null);
      if (changed) await room.record('agents.updated', { agents: agents.map((agent) => ({ id: agent.id, label: agent.label, detected: agent.detected, ready: agent.ready, version: agent.version, local: Boolean(agent.local) })), removed: fifth.ready ? [] : [MADRE_AGENT_ID], reason: fifth.ready ? `@madre is in the room · ${fifth.version}` : '@madre left the room: Ollama has no chat model running' });
    }
    return { ...ollama, settings, embeddings: Boolean(useEmbeddings), archivist: Boolean(useArchivist), agent: fifth.ready };
  }
  // Memory settings the human keeps in config.json (MU/TH/UR → MEMORY); environment still wins at launch.
  const memoryConfig = async () => ({ archivist: 'auto', archivists: null, every: 10, idleMinutes: 10, embedProvider: 'auto', recallShare: 0.3, cascade: true, ...((await readConfig(root)).memory ?? {}) });
  const embedEnvFor = (cfg) => {
    const view = { ...process.env };
    if (!process.env.PULSE_EMBED_PROVIDER && !process.env.PULSE_EMBED) {
      if (cfg.embedProvider === 'off') view.PULSE_EMBED = '0'; else if (cfg.embedProvider && cfg.embedProvider !== 'auto') view.PULSE_EMBED_PROVIDER = cfg.embedProvider;
    }
    return view;
  };
  let room = null;
  await wireOllama();
  const memoryServer = memory ? memoryServerFor({ dbFile: memory.file, projectRoot: canonicalProjectRoot }) : null;
  // MOTHER's channel to the crew: her seal's fingerprint lives in the memory
  // file, so a deleted or edited .pulse/mother.env is noticed.
  const mother = new MotherChannel(join(canonicalProjectRoot, '.pulse', 'mother.env'), { meta: memory ? { get: (key) => memory.metaGet(key), set: (key, value) => memory.metaSet(key, value) } : null });
  const motherOutcome = await mother.load().catch((error) => { console.error(`MADRE could not open MOTHER's channel: ${error.message}`); return null; });
  const startupMemory = await memoryConfig();
  let listening = null;
  const listeningPort = () => listening?.address?.()?.port ?? Number(process.env.PULSE_PORT ?? 4317);
  const roomOptions = () => ({
    store,
    agents,
    projectRoot,
    privacy,
    // Modules may hand tools to a turn; the room asks once per turn, the server knows the port.
    toolsForTurn: async (turn) => modulesToolsForTurn(await moduleContext(), { ...turn, port: listeningPort(), roomDir }),
    softTokenBudget,
    contextMaxChars,
    recallShare: Number(process.env.PULSE_RECALL_SHARE ?? startupMemory.recallShare),
    cascade: process.env.PULSE_RECALL_CASCADE !== undefined ? process.env.PULSE_RECALL_CASCADE !== '0' : startupMemory.cascade !== false,
    distill: {
      every: Number(process.env.PULSE_DISTILL_EVERY ?? startupMemory.every),
      idleMs: Number(process.env.PULSE_DISTILL_IDLE_MS ?? startupMemory.idleMinutes * 60000),
      agent: process.env.PULSE_DISTILL_AGENT ?? (startupMemory.archivist && startupMemory.archivist !== 'auto' ? startupMemory.archivist : null),
      allowed: Array.isArray(startupMemory.archivists) && startupMemory.archivists.length ? startupMemory.archivists : null,
    },
    memory,
    memoryServer,
    mother: motherOutcome ? mother : null,
    historicalEvents,
    invokers,
    agentTimeouts,
    maxMessageChars,
    delegation,
    maxPlanSteps,
  });
  room = new Room(roomOptions());
  await wireOllama({ probe: false });
  const embedKick = memory?.embedder ? setTimeout(() => void room.embedNow(), 2000) : null;
  embedKick?.unref?.();
  if (motherOutcome === 'deleted' || motherOutcome === 'altered') setTimeout(() => void room.motherTampered(motherOutcome).catch(() => {}), 500).unref?.();
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
      memory: memorySettingsView(),
      updates: { check: updatesEnabled(), envWins: process.env.PULSE_UPDATE_CHECK !== undefined },
      privacy: { terms: privacy.terms, marker: privacy.marker, envWins: privacySettings({}, process.env).envWins, ...privacy.guards },
    };
  }
  // What MU/TH/UR shows under MEMORY: the live values, who could distil, and what embeds today.
  function memorySettingsView() {
    const distill = room.distillSettings();
    const candidates = [...(distill.ollama ? [{ id: 'ollama', label: `Ollama · ${ollama.chatModel ?? 'local'}`, local: true }] : []), ...agents.filter((agent) => agent.detected && !agent.local).map((agent) => ({ id: agent.id, label: agent.label, local: false }))];
    return {
      enabled: distill.enabled, every: distill.every, idleMinutes: Math.round(distill.idleMs / 60000), archivist: distill.agent ?? 'auto', archivists: distill.allowed, recallShare: distill.recallShare, cascade: distill.cascade,
      candidates, embedder: memory?.embedder?.model ?? null, embedProvider: process.env.PULSE_EMBED === '0' ? 'off' : (process.env.PULSE_EMBED_PROVIDER ?? null),
      ollama: { running: ollama.running, embedModel: ollama.embedModel, chatModel: ollama.chatModel },
      stats: room.memoryStats() ? { entries: room.memoryStats().entries, memories: room.memoryStats().memories, pending: room.memoryStats().pending } : null,
      envWins: Boolean(process.env.PULSE_DISTILL_EVERY || process.env.PULSE_DISTILL_AGENT || process.env.PULSE_RECALL_SHARE || process.env.PULSE_EMBED_PROVIDER || process.env.PULSE_EMBED),
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
    if (patch.memory && typeof patch.memory === 'object') {
      const current = await memoryConfig();
      const next = { ...current };
      const m = patch.memory;
      if (Number(m.every) >= 1) next.every = Math.trunc(Number(m.every));
      if (Number(m.idleMinutes) >= 1) next.idleMinutes = Math.trunc(Number(m.idleMinutes));
      if (typeof m.archivist === 'string') next.archivist = m.archivist === 'auto' ? 'auto' : m.archivist;
      if (Array.isArray(m.archivists)) next.archivists = m.archivists.length ? m.archivists.map(String) : null;
      if (['auto', 'ollama', 'gemini', 'off'].includes(m.embedProvider)) next.embedProvider = m.embedProvider;
      if (Number.isFinite(Number(m.recallShare))) next.recallShare = Math.min(0.6, Math.max(0, Number(m.recallShare)));
      if (typeof m.cascade === 'boolean') next.cascade = m.cascade;
      if (typeof m.enabled === 'boolean') next.enabled = m.enabled;
      config.memory = next;
      room.configureDistill({ every: next.every, idleMs: next.idleMinutes * 60000, agent: next.archivist === 'auto' ? null : next.archivist, allowed: next.archivists, recallShare: next.recallShare, cascade: next.cascade !== false, ...(typeof next.enabled === 'boolean' ? { enabled: next.enabled } : {}) });
      live.memory = true;
    }
    if (patch.scopes && typeof patch.scopes === 'object') {
      const current = (await readConfig(root)).scopes ?? {};
      config.scopes = { ...current };
      for (const [agentId, scopes] of Object.entries(patch.scopes)) {
        if (!agents.some((agent) => agent.id === agentId) || !scopes || typeof scopes !== 'object') continue;
        config.scopes[agentId] = { ...(current[agentId] ?? {}) };
        for (const scope of ['write', 'imageGen', 'web', 'alwaysCreate']) if (typeof scopes[scope] === 'boolean') config.scopes[agentId][scope] = scopes[scope];
        // MAX MODE and DEFAULT MODE are the two controls; setting them retires the older flags they replace.
        if (Number.isInteger(Number(scopes.maxMode)) && Number(scopes.maxMode) >= 0 && Number(scopes.maxMode) <= 4) { config.scopes[agentId].maxMode = Number(scopes.maxMode); delete config.scopes[agentId].write; }
        if (Number.isInteger(Number(scopes.defaultMode)) && Number(scopes.defaultMode) >= 1 && Number(scopes.defaultMode) <= 2) { config.scopes[agentId].defaultMode = Number(scopes.defaultMode); delete config.scopes[agentId].alwaysCreate; }
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
    if (live.memory) await wireOllama({ probe: false });
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

  // A CLI installed from the room appears without restarting: detection runs again, the roster
  // is updated in place (the room holds the same array) and the change is announced.
  async function redetectAgents({ announce = true } = {}) {
    if (!detector) return { changed: false, agents };
    let changed = false;
    for (const next of await detector()) {
      const index = agents.findIndex((item) => item.id === next.id);
      if (index === -1) { agents.push(next); changed = true; continue; }
      const before = agents[index];
      if (before.detected !== next.detected || before.ready !== next.ready || before.version !== next.version || before.path !== next.path) {
        agents[index] = { ...before, ...next };
        changed = true;
      }
    }
    await refreshSessions();
    if (changed && announce) {
      await room.record('agents.updated', {
        agents: agents.map((agent) => ({ id: agent.id, label: agent.label, detected: agent.detected, ready: agent.ready, version: agent.version, local: Boolean(agent.local) })),
        removed: [],
        reason: 'the room looked again for the agents on this computer',
      });
    }
    return { changed, agents };
  }

  // The bridge installs a CLI with its own package manager, streaming into the room like any
  // other install, and looks again when it finishes. Nothing is written into the project.
  async function installAgent(id) {
    const agent = agents.find((item) => item.id === id);
    if (!agent) return { status: 404, body: { error: `Unknown agent: ${id}.` } };
    if (agent.detected) return { status: 409, body: { error: `${agent.label} is already installed.` } };
    const plan = installPlanFor(agent, { prefix: toolsPrefix() });
    if (!plan) return { status: 404, body: { error: `MADRE does not know how to install ${id}.` } };
    if (installing) return { status: 409, body: { error: `Another install is running (${installing}).` } };
    installing = `agent:${id}`;
    await room.record('connection.install.started', { agent: id, label: agent.label, command: plan.display });
    void (async () => {
      const lines = [];
      const attempt = (step) => (installers[id] ?? runInstaller)({
        command: step.command,
        args: step.args,
        projectRoot: canonicalProjectRoot,
        timeoutMs: 600000,
        onLine: (line) => { lines.push(line); void room.record('connection.install.output', { agent: id, line: line.slice(0, 500) }); },
      });
      let result = await attempt(plan);
      let where = 'system';
      // Walled out of the system folders: install into MADRE's own, where it will be found.
      if (result.code !== 0 && plan.fallback && looksLikeAdminProblem(`${lines.join('\n')}\n${result.error ?? ''}`)) {
        await room.record('connection.install.output', { agent: id, line: `npm cannot write to this computer's system folder without an administrator. Installing into MADRE's own folder instead: ${toolsPrefix()}` });
        result = await attempt(plan.fallback);
        where = 'madre';
      }
      await redetectAgents();
      const found = agents.find((item) => item.id === id);
      await room.record('connection.install.finished', {
        agent: id,
        label: agent.label,
        where,
        prefix: where === 'madre' ? toolsPrefix() : null,
        code: result.code ?? null,
        error: result.error ?? null,
        detected: Boolean(found?.detected),
        version: found?.version ?? null,
        session: sessions[id] ?? null,
        tail: lines.slice(-6),
      });
      installing = null;
    })();
    return { status: 202, body: { accepted: true, command: plan.display } };
  }


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
  // Rooms opened before Ash was renamed carry the old key; the human's switch is not lost.
  room.setAsh(Boolean(startupConfig.modules?.ash?.enabled ?? startupConfig.modules?.ash?.enabled));
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
  let unsubscribe = () => {};

  // The error sentinel: failures MU/TH/UR cannot classify, and crashes, become
  // redacted reports in the ledger. Sending them anywhere is the human's call.
  const telemetry = (await readConfig(root)).telemetry ?? {};
  const sentinel = new ErrorSentinel({
    pkg: PACKAGE,
    agents,
    settings: { autoReport: process.env.PULSE_AUTO_REPORT === '1' || Boolean(telemetry.autoReport), reportUrl: process.env.PULSE_REPORT_URL ?? telemetry.reportUrl ?? DEFAULT_REPORT_URL },
    fetchImpl: reportFetch,
    emit: (type, payload) => room.record(type, payload),
    save: async (settings) => { const current = await readConfig(root); await updateConfig(root, { telemetry: { ...(current.telemetry ?? {}), ...settings } }); },
  });
  outbound.watchReportUrl(sentinel.settings().reportUrl);
  let unsubscribeSentinel = () => {};
  if (!testMode && !crashHandlersInstalled) {
    crashHandlersInstalled = true;
    for (const origin of ['uncaughtException', 'unhandledRejection']) {
      process.on(origin, (error) => {
        console.error(`MADRE ${origin}:`, error);
        void sentinel.crash(error, origin).catch(() => null);
      });
    }
  }
  // EYECAT: the watcher that asks whether the room still believes what it wrote down. It is not
  // a module and takes no turn: it subscribes from outside, the way the error sentinel does, and
  // everything it finds is a question for the human rather than an entry in the archive.
  const eyecat = new Eyecat({
    enabled: () => process.env.PULSE_EYECAT !== '0',
    research: () => room.memoryResearch(),
    entriesFor: (notes) => (memory ? memory.entriesAt(notes.flatMap((note) => note.sources ?? [])) : []),
    bench: () => room.bench(),
    emit: (type, payload) => room.record(type, payload),
  });
  let unsubscribeEyecat = () => {};

  let unsubscribeGhost = () => {};
  let unsubscribeLive = () => {};
  let unsubscribeChats = () => {};
  // Writes to the conversation list are fire-and-forget, so the last one has to be waited for
  // when the room closes: a file that reappears while its folder is being removed is a test that
  // fails for a reason that has nothing to do with it.
  let chatWrites = Promise.resolve();

  // Everything that listens to the open conversation, attached in one place so that opening
  // another attaches exactly the same things to it. Live readings go straight to whoever is
  // watching and are never stored, so a page that opens later simply never sees them.
  function wireRoom() {
    unsubscribe = room.subscribe(() => { void broadcastPending(); });
    unsubscribeSentinel = room.subscribe((event) => { void sentinel.observe(event).catch(() => null); });
    unsubscribeEyecat = room.subscribe((event) => { void eyecat.observe(event).catch(() => null); });
    unsubscribeGhost = room.subscribeGhost((event) => { for (const client of clients.keys()) writeEvent(client, event); });
    unsubscribeLive = room.subscribeLive((event) => { for (const client of clients.keys()) writeEvent(client, event); });
    // What the list of conversations shows, kept as it happens. A conversation with no name of
    // its own takes the first thing the human said in it.
    unsubscribeChats = room.subscribe((event) => {
      if (event?.type !== 'message.created' || event.ghost) return;
      const human = event.payload?.role === 'user';
      chatWrites = chatWrites.then(() => touchChat(roomDir, chatId, { text: human ? event.payload.text : null, counts: human })).catch(() => null);
    });
    sentinel.seed(historicalEvents);
    eyecat.seed(historicalEvents);
    room.restoreAttachments(historicalEvents
      .filter((event) => event.type === 'attachment.stored')
      .map((event) => ({ ...event.payload, path: join(attachmentsRoot, event.payload.fileName), dir: attachmentsRoot })));
  }
  function unwireRoom() {
    for (const off of [unsubscribe, unsubscribeSentinel, unsubscribeEyecat, unsubscribeGhost, unsubscribeLive, unsubscribeChats]) { try { off(); } catch { /* already gone */ } }
    unsubscribe = unsubscribeSentinel = unsubscribeEyecat = unsubscribeGhost = unsubscribeLive = unsubscribeChats = () => {};
  }

  // Opening another conversation. The project keeps its memory, its crew, its modules, its
  // privacy list and its numbering; what changes is the record being written and read. One
  // conversation drives the crew at a time — two threads editing the same working tree at once
  // is not a feature, it is a way to lose work — so a turn in flight is a reason to refuse.
  async function mountChat(id) {
    if (!isChatId(id)) return { error: `No conversation "${id}".` };
    if (room && room.working()) return { error: 'A turn is running in this conversation. Let it finish, or STOP ALL, and try again.' };
    const opened = await openChatIndex(roomDir, id);
    if (!opened) return { error: `No conversation "${id}".` };
    unwireRoom();
    await chatWrites.catch(() => null);
    await room?.shutdown().catch(() => null);
    chatId = id;
    store = await new EventStore(chatLedger(roomDir, id), { floor: await projectFloor(roomDir, { except: id }) }).initialize();
    historicalEvents = await store.readAll();
    room = new Room(roomOptions());
    room.setInvoker(MADRE_ADAPTER, madreInvoker({ memory, ollama: () => ({ ...ollama, chatModel: ollama.madreModel ?? ollama.chatModel }), fetchImpl: reportFetch }));
    wireRoom();
    // Whoever is watching is watching the wrong record now: their stream ends and they come back
    // to the one that is open.
    lastBroadcastSequence = historicalEvents.at(-1)?.sequence ?? 0;
    tailOffset = (await store.tail(0)).offset;
    for (const client of [...clients.keys()]) { clients.delete(client); try { client.end(); } catch { /* already gone */ } }
    return { chat: opened };
  }
  wireRoom();
  const poller = setInterval(() => { void broadcastPending(); }, broadcastIntervalMs);
  poller.unref();

  let installing = null;
  // The context a module works in: the project, its settings, the room, and what this server offers.
  async function moduleContext() {
    const config = await readConfig(root);
    return {
      projectRoot: canonicalProjectRoot, stateRoot: root, config, env: process.env, agents, room,
      readConfig: () => readConfig(root),
      updateConfig: (patch) => updateConfig(root, patch),
      record: (type, payload) => room.record(type, payload),
      services: {
        imageKey,
        setImageModule,
        // What a card knows about being up to date. Reading is free: it answers from the day's
        // cache. The button on a card is what forces a look outside.
        moduleUpdate: (item, { force = false, cacheOnly = !force } = {}) => moduleUpdate(item, {
          stateRoot: root, madre: { name: PACKAGE.name, version: PACKAGE.version },
          fetchImpl: reportFetch, enabled: updatesEnabled(), force, cacheOnly,
        }),
        ollama: {
          state: () => ollama,
          wire: (options) => wireOllama(options),
          // Getting Ollama onto this computer, with the command in plain sight, and waking it.
          install: async () => {
            if (installing) return { ok: false, error: `Another install is running (${installing}).` };
            const { ollamaInstallPlan } = await import('./modules/ollama.mjs');
            const plan = ollamaInstallPlan({ brew: await findOnPath('brew') });
            if (!plan.command) return { ok: false, error: plan.note, download: plan.download };
            installing = 'ollama';
            await room.record('extension.install.started', { id: 'ollama', name: 'OLLAMA', command: plan.display, platforms: [], alreadyInstalled: false });
            void (async () => {
              const lines = [];
              const result = await runInstaller({ command: plan.command, args: plan.args, projectRoot: canonicalProjectRoot, timeoutMs: 900000, onLine: (line) => { lines.push(line); void room.record('extension.install.output', { id: 'ollama', lines: [line.slice(0, 500)] }); } });
              const status = await wireOllama();
              await room.record('extension.install.finished', { id: 'ollama', name: 'OLLAMA', ok: result.code === 0, installed: Boolean(await findOnPath('ollama')), detail: result.code === 0 ? 'Ollama installed · START it to wake it' : (result.error ?? `exit ${result.code}`), ollama: status });
              installing = null;
            })();
            return { ok: true, command: plan.display };
          },
          start: async () => {
            if (ollama.running) return { ok: true, already: true };
            const binary = await findOnPath('ollama');
            if (!binary) return { ok: false, error: 'Ollama is not on this computer yet.' };
            await room.record('extension.install.started', { id: 'ollama', name: 'OLLAMA', command: 'ollama serve', platforms: [], alreadyInstalled: true });
            const child = spawn(binary, ['serve'], { detached: process.platform !== 'win32', windowsHide: true, stdio: 'ignore' });
            child.unref();
            // It answers in a moment or it does not: poll its own port rather than guess.
            let status = ollama;
            for (let attempt = 0; attempt < 20 && !status.running; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              status = await wireOllama();
            }
            await room.record('extension.install.finished', { id: 'ollama', name: 'OLLAMA', ok: status.running, installed: true, detail: status.running ? `running · ${status.chatModel ? `@madre with ${status.chatModel}` : 'no chat model yet'}` : 'Ollama did not answer; open the Ollama app and press RECHECK.', ollama: status });
            return status.running ? { ok: true } : { ok: false, error: 'Ollama did not answer. Open the Ollama app, then press RECHECK.' };
          },
          // Pulls stream into the room like a module install; one at a time.
          pull: async (model) => {
            if (installing) return { ok: false, error: `Another install is running (${installing}).` };
            installing = 'ollama';
            await room.record('extension.install.started', { id: 'ollama', name: 'OLLAMA', command: `ollama pull ${model}`, platforms: [], alreadyInstalled: false });
            void (async () => {
              let pending = [];
              let flushTimer = null;
              const flush = async () => { flushTimer = null; if (!pending.length) return; const batch = pending; pending = []; await room.record('extension.install.output', { id: 'ollama', lines: batch }); };
              try {
                await pullModel({ host: ollama.host, model, fetchImpl: reportFetch, onLine: (line) => { pending.push(line); if (!flushTimer) flushTimer = setTimeout(() => void flush(), 400); } });
                await flush();
                const status = await wireOllama();
                await room.record('extension.install.finished', { id: 'ollama', name: 'OLLAMA', ok: true, installed: true, detail: `pulled ${model}`, ollama: status });
              } catch (error) {
                await flush();
                await room.record('extension.install.finished', { id: 'ollama', name: 'OLLAMA', ok: false, installed: false, detail: error.message });
              } finally { installing = null; }
            })();
            return { ok: true };
          },
        },
      },
    };
  }

  async function installExtension(id, payload = {}) {
    const { confirm } = payload;
    const extension = extensionById(id);
    if (!extension) return { status: 404, body: { error: `Unknown module: ${id}.` } };
    // Built-ins are switches the module itself defines.
    if (extension.toggle) return extension.toggle(await moduleContext(), payload);
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
      if (request.method === 'GET' && ['/app.js', '/brands.js', '/troubleshooting.js', '/inquiry.js'].includes(url.pathname)) {
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
          platform: process.platform,
          // Which conversation this page is looking at, and the others it could open.
          chats: await listChats(roomDir),
          agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })),
          ash: { enabled: room.ashEnabled() },
          ripley: { enabled: await ripleyOn() },
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
      // RIPLEY: the project rendered as a site, inside a frame that runs scripts but
      // reaches nothing: an opaque origin (sandbox without same-origin), no network
      // (connect-src none), no forms, no top navigation, assets only from MADRE's
      // own host. Path-based, so a page's relative links to its CSS, JS and images
      // resolve to the same route.
      const previewMatch = request.method === 'GET' && url.pathname.match(/^\/preview\/(project|attachments)\/(.*)$/);
      if (previewMatch) {
        if (!(await ripleyOn())) return sendJson(response, 412, { error: 'RIPLEY is off. Enable it in MODULES to render files.' });
        const which = previewMatch[1] === 'attachments' ? attachmentsRoot : canonicalProjectRoot;
        const relative = decodeURIComponent(previewMatch[2]);
        const file = await readServable(which, relative);
        if (file.status !== 200) return sendJson(response, file.status, { error: file.error });
        const isPage = /\.(html?|xhtml)$/i.test(relative);
        const origin = `${request.headers['x-forwarded-proto'] ?? 'http'}://${request.headers.host ?? '127.0.0.1'}`;
        // Pages carry RIPLEY's bridge: one inline script that tells the viewer which
        // page loaded and forwards the page's own errors. Nothing else is touched.
        const bodyOut = isPage ? injectRipleyBridge(file.body) : file.body;
        const headers = {
          'content-type': isPage ? 'text/html; charset=utf-8' : file.contentType,
          'content-length': Buffer.byteLength(bodyOut),
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'content-disposition': `inline; filename="${encodeURIComponent(basename(file.path))}"`,
        };
        if (isPage) headers['content-security-policy'] = `sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' ${origin}; style-src 'unsafe-inline' ${origin}; img-src ${origin} data: blob:; font-src ${origin} data:; media-src ${origin} data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
        response.writeHead(200, headers);
        return response.end(bodyOut);
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
        await refreshPrivacy();
        return sendJson(response, 200, { settings: effectiveSettings(), config: await readConfig(root), sessions, sessionsAt, loggingIn, agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })) });
      }
      if (request.method === 'POST' && url.pathname === '/api/settings') {
        return sendJson(response, 200, { settings: await applySettings(await body(request)) });
      }
      // NOSTROMO: the archive is behind the project designation, like CONTROL.
      const designationOk = (given) => typeof given === 'string' && given.trim().toLowerCase() === basename(canonicalProjectRoot).toLowerCase();
      // Sentinel: reports, settings, the manual road (a prefilled issue) and the automatic one.
      if (request.method === 'GET' && url.pathname === '/api/sentinel') {
        return sendJson(response, 200, { reports: sentinel.reports(), settings: sentinel.settings(), environment: sentinel.environment(), feedbackUrl: sentinel.feedbackUrl() });
      }
      if (request.method === 'POST' && url.pathname === '/api/sentinel/settings') {
        const patch = await body(request).catch(() => ({}));
        const saved = await sentinel.setSettings(patch);
        outbound.watchReportUrl(saved.reportUrl);
        return sendJson(response, 200, { settings: saved });
      }
      const sentinelMatch = url.pathname.match(/^\/api\/sentinel\/([a-f0-9]{10})\/(issue|send)$/);
      if (sentinelMatch && request.method === (sentinelMatch[2] === 'issue' ? 'GET' : 'POST')) {
        if (sentinelMatch[2] === 'issue') {
          const issue = sentinel.issueUrl(sentinelMatch[1]);
          return issue ? sendJson(response, 200, { url: issue }) : sendJson(response, 404, { error: 'No such report, or no repository to file it in.' });
        }
        const outcome = await sentinel.send(sentinelMatch[1]);
        return sendJson(response, outcome.ok ? 200 : (outcome.status === 404 || outcome.status === 412 ? outcome.status : 502), outcome);
      }
      // Routes a module serves, before MADRE's own: the module answers with { status, body }.
      const moduleRoute = findModuleRoute(request.method, url.pathname);
      if (moduleRoute) {
        const payload = request.method === 'POST' ? await body(request).catch(() => ({})) : {};
        const result = await moduleRoute.route.handler(await moduleContext(), { request, url, params: moduleRoute.params, payload });
        return sendJson(response, result.status ?? 200, result.body ?? {});
      }
      // Where this room's tokens go: what each block of the briefing has cost, how much came back
      // from a CLI's own cache, and how many characters the room spends per token it is charged.
      if (url.pathname === '/api/economy' && request.method === 'GET') {
        return sendJson(response, 200, economy(await store.readAll()));
      }

      // What left this machine: every address MADRE may reach, whether it is on today, and the
      // last requests this process actually made. The declaration is checked against the log.
      if (url.pathname === '/api/outbound' && request.method === 'GET') {
        const embedder = memory?.embedder?.model ?? null;
        const modules = (await readConfig(root)).modules ?? {};
        return sendJson(response, 200, outboundView({
          log: outbound,
          agents,
          state: {
            crew: agents.some((agent) => agent.detected && !agent.local),
            embeddings: Boolean(embedder && /^gemini/i.test(embedder)),
            image: Boolean(modules['image-studio']?.enabled),
            npm: updatesEnabled(),
            github: updatesEnabled(),
            reports: Boolean(sentinel.settings().autoReport),
            anthropic: agents.some((agent) => agent.id === 'claude' && agent.ready),
            ollama: Boolean(ollama.running),
          },
        }));
      }

      // EYECAT: what it is holding, and the two answers a person can give it. Confirming writes
      // the aberration and takes the note it refutes out of circulation; dismissing says the room
      // was right all along and the pair is never raised again.
      if (url.pathname === '/api/eyecat' && request.method === 'GET') {
        return sendJson(response, 200, { findings: eyecat.findings(), settings: eyecat.settings(), aberrations: memory ? memory.aberrations({ limit: 100 }) : [] });
      }
      if (url.pathname === '/api/eyecat/sweep' && request.method === 'POST') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        const raised = await eyecat.sweep({ reason: 'asked' }).catch(() => null);
        return sendJson(response, 200, { raised: raised?.length ?? 0, findings: eyecat.findings() });
      }
      const eyecatVerdict = request.method === 'POST' && url.pathname.match(/^\/api\/eyecat\/(confirm|dismiss)$/);
      if (eyecatVerdict) {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        if (!memory) return sendJson(response, 503, { error: 'The room has no memory.' });
        const finding = eyecat.findings().find((item) => item.key === payload.key);
        if (!finding) return sendJson(response, 404, { error: 'EYECAT is not holding that one.' });
        const settled = eyecat.settle(finding.key, { verdict: eyecatVerdict[1] === 'confirm' ? 'aberration' : 'dismissed' });
        let flagged = null;
        if (eyecatVerdict[1] === 'confirm') {
          flagged = memory.flagAberration({
            text: finding.claim.text,
            correction: finding.correction,
            contradicts: finding.claim.id,
            sources: [],
            agent: finding.judge,
            detector: 'eyecat',
            confidence: finding.confidence,
          });
        }
        await room.record('eyecat.settled', { key: finding.key, verdict: settled?.settledAs ?? 'dismissed', aberration: flagged?.id ?? null, refuted: flagged?.refuted ?? null });
        return sendJson(response, 200, { settled: settled?.settledAs ?? 'dismissed', aberration: flagged, findings: eyecat.findings() });
      }

      // The dataset behind MADRE AI: exported on demand next to the ledger.
      if (url.pathname === '/api/dataset' && (request.method === 'GET' || request.method === 'POST')) {
        const dir = join(roomDir, 'dataset');
        const notes = memory ? memory.memories({ limit: 5000 }) : [];
        if (request.method === 'GET') {
          const manifest = await readFile(join(dir, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);
          const ready = datasetReadiness(await store.readAll(), notes);
          const research = room.memoryResearch();
          return sendJson(response, 200, { dataset: manifest, dir, trained: ollama.madreModel ?? null, readiness: ready, maturity: maturity({ readiness: ready, notes, links: research?.links ?? [], stats: research?.stats ?? null }), training: trainingInfo() });
        }
        const events = await store.readAll();
        const result = await exportDataset({ events, notes, dir, project: basename(canonicalProjectRoot), home: homedir(), privacy });
        await room.record('dataset.exported', { pairs: result.pairs, turns: result.turns, notes: result.notes, train: result.train, valid: result.valid, dir });
        const after = datasetReadiness(events, notes);
        const drawn = room.memoryResearch();
        return sendJson(response, 200, { dataset: result, dir, trained: ollama.madreModel ?? null, readiness: after, maturity: maturity({ readiness: after, notes, links: drawn?.links ?? [], stats: drawn?.stats ?? null }), training: trainingInfo() });
      }
      // PRIVACY: the terms live in config.json only; the ledger records counts, never words.
      if (request.method === 'GET' && url.pathname === '/api/privacy') {
        await refreshPrivacy();
        return sendJson(response, 200, { terms: privacy.terms, marker: privacy.marker, ...privacy.guards, exposure: room.privacyExposure(await store.readAll()) });
      }
      if (request.method === 'POST' && url.pathname === '/api/privacy') {
        const patch = await body(request).catch(() => ({}));
        const current = (await readConfig(root)).privacy ?? {};
        const next = { ...current };
        if ('terms' in patch) next.terms = normalizeTerms(patch.terms);
        if (typeof patch.marker === 'string' && patch.marker.trim()) next.marker = patch.marker.trim().slice(0, 40);
        if ('secrets' in patch) next.secrets = Boolean(patch.secrets);
        if ('paths' in patch) next.paths = Boolean(patch.paths);
        await updateConfig(root, { privacy: next });
        await refreshPrivacy();
        // The room records that the setting changed and what it is now, never the words.
        await room.record('privacy.updated', { terms: privacy.terms.length, marker: privacy.marker, ...privacy.guards });
        return sendJson(response, 200, { terms: privacy.terms, marker: privacy.marker, ...privacy.guards, exposure: room.privacyExposure(await store.readAll()) });
      }
      if (request.method === 'POST' && url.pathname === '/api/privacy/purge') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        await refreshPrivacy();
        if (!privacy.enabled) return sendJson(response, 412, { error: 'No private terms are set. Write them first.' });
        const result = await room.purgePrivate();
        // The log was rewritten in place: the broadcaster's byte offset is stale, the sequences are not.
        tailOffset = (await store.tail(0)).offset;
        return sendJson(response, 200, { purged: result, exposure: room.privacyExposure(await store.readAll()) });
      }
      // The human's verdict on a reply, for the dataset: good, bad, none.
      if (request.method === 'POST' && url.pathname === '/api/messages/rate') {
        const payload = await body(request).catch(() => ({}));
        try {
          const event = await room.rateMessage(String(payload.messageId ?? ''), String(payload.rating ?? ''));
          return sendJson(response, 200, { rated: event.payload });
        } catch (error) { return sendJson(response, 400, { error: error.message }); }
      }
      // Release channel: current, latest on npm, and the command for how this copy runs.
      if (request.method === 'GET' && url.pathname === '/api/version') {
        return sendJson(response, 200, await versionView({ force: url.searchParams.get('force') === '1' }));
      }
      // One click: install the newer version and come back on the same port. The room records it,
      // closes its listener so the port is free, hands the command to a detached shell and exits.
      if (request.method === 'POST' && url.pathname === '/api/updates/apply') {
        const info = await versionView();
        if (!info.available) return sendJson(response, 409, { error: `Nothing to apply: ${info.current} is the latest MADRE knows of.` });
        const command = applyCommand({ install, name: PACKAGE.name, version: info.latest, port: request.socket.localPort, projectRoot: canonicalProjectRoot });
        if (!command) return sendJson(response, 412, { error: 'This copy runs from source: pull the repository and start it again.' });
        if (room.activeTurns().length || room.activePlans().length) return sendJson(response, 409, { error: 'Agents are still working. STOPALL or wait, then update.' });
        await room.record('room.updating', { from: info.current, to: info.latest, install, command });
        sendJson(response, 202, { restarting: true, from: info.current, to: info.latest, command });
        setTimeout(() => {
          server.close(() => {
            // Each system has its own shell: the command is one line either way.
            const shell = process.platform === 'win32' ? { file: process.env.COMSPEC ?? 'cmd.exe', args: ['/d', '/s', '/c', command] } : { file: '/bin/sh', args: ['-c', command] };
            const child = spawn(shell.file, shell.args, { cwd: canonicalProjectRoot, detached: process.platform !== 'win32', windowsHide: true, stdio: 'ignore', env: { ...process.env, PULSE_UPDATE_RESTART: '1' } });
            child.unref();
            setTimeout(() => process.exit(0), 200);
          });
          for (const client of clients.keys()) { try { client.end(); } catch { /* gone */ } }
        }, 300);
        return undefined;
      }
      if (request.method === 'POST' && url.pathname === '/api/updates/settings') {
        const patch = await body(request).catch(() => ({}));
        if (typeof patch.check === 'boolean') { updatesConfig = { ...updatesConfig, check: patch.check }; await updateConfig(root, { updates: updatesConfig }); }
        return sendJson(response, 200, { updates: { check: updatesEnabled(), envWins: process.env.PULSE_UPDATE_CHECK !== undefined } });
      }
      if (request.method === 'GET' && url.pathname === '/api/mother') {
        return sendJson(response, 200, { mother: room.motherStatus(), strikes: CODE000_STRIKES });
      }
      if (request.method === 'POST' && url.pathname === '/api/mother/code000') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        const result = await room.code000({ strikes: Number(payload.strikes) || CODE000_STRIKES });
        return result ? sendJson(response, 200, { code: result.code, lockedForMs: result.lockedForMs, n: result.n }) : sendJson(response, 503, { error: 'MOTHER is silent.' });
      }
      if (request.method === 'GET' && url.pathname === '/api/memory') {
        if (!designationOk(url.searchParams.get('designation'))) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: `CODE000. THE ARCHIVE IS SEALED FOR ${Math.ceil(sealed / 60000)} MORE MINUTE${Math.ceil(sealed / 60000) === 1 ? '' : 'S'}.`, lockedForMs: sealed });
        const research = room.memoryResearch();
        if (!research) return sendJson(response, 503, { error: 'The room has no memory.' });
        // How grown this archive is, read from the same notes the map draws.
        const grown = maturity({ readiness: datasetReadiness(await store.readAll(), research.memories), notes: research.memories, links: research.links, stats: research.stats });
        return sendJson(response, 200, { ...research, maturity: grown });
      }
      // Where this room stands, in one place: what the archive is made of, whether it works, and
      // the one thing worth doing about it. Nothing here waits on a test — the free one is read
      // as it is asked for, the cheap one keeps itself fresh behind the screen, and the slow one
      // is the human's to start.
      if (request.method === 'GET' && url.pathname === '/api/maturity') {
        const research = room.memoryResearch();
        const notes = research?.memories ?? [];
        const grown = research ? maturity({ readiness: datasetReadiness(await store.readAll(), notes), notes, links: research.links, stats: research.stats }) : null;
        const exams = await room.exams({ refresh: true, findings: eyecat.findings() });
        void room.freshenCoverage();
        return sendJson(response, 200, {
          maturity: grown, exams, cold: research?.cold ?? null, asks: research?.ask?.length ?? 0,
          verdict: verdictFor({ maturity: grown, exams: exams.last, cold: research?.cold, asks: research?.ask?.length ?? 0 }),
        });
      }
      // Inside the core: the document MADRE writes in the human's name for the next turn, block
      // by block. Built on demand and stored nowhere; asking costs nothing and sends nothing.
      if (request.method === 'GET' && url.pathname === '/api/briefing') {
        const asked = url.searchParams.get('agent') ?? agents.find((agent) => agent.ready && !agent.local)?.id ?? agents[0]?.id;
        const mode = Math.min(4, Math.max(0, Number(url.searchParams.get('mode') ?? 1) || 0));
        const text = String(url.searchParams.get('text') ?? '').slice(0, 2000);
        const briefing = await room.briefing({ agent: asked, mode, text });
        if (!briefing) return sendJson(response, 404, { error: `No agent "${asked}" on this computer.` });
        return sendJson(response, 200, {
          ...briefing,
          launch: await room.launch({ agent: asked, mode }),
          agents: agents.filter((agent) => agent.detected).map((agent) => ({ id: agent.id, label: agent.label, ready: agent.ready })),
        });
      }
      // The conversations of this project. One memory, one crew, one numbering; many records.
      if (request.method === 'GET' && url.pathname === '/api/chats') {
        return sendJson(response, 200, await listChats(roomDir));
      }
      if (request.method === 'POST' && url.pathname === '/api/chats') {
        if (room.working()) return sendJson(response, 409, { error: 'A turn is running in this conversation. Let it finish, or STOP ALL, and try again.' });
        const payload = await body(request).catch(() => ({}));
        const made = await createChat(roomDir, { title: typeof payload.title === 'string' ? payload.title : null });
        const mounted = await mountChat(made.id);
        if (mounted.error) return sendJson(response, 409, mounted);
        return sendJson(response, 200, { ...(await listChats(roomDir)), opened: made.id });
      }
      const chatMatch = url.pathname.match(/^\/api\/chats\/([a-z0-9]+)$/);
      if (chatMatch && request.method === 'POST') {
        const mounted = await mountChat(chatMatch[1]);
        if (mounted.error) return sendJson(response, 409, mounted);
        return sendJson(response, 200, { ...(await listChats(roomDir)), opened: chatMatch[1] });
      }
      if (chatMatch && request.method === 'PATCH') {
        const payload = await body(request).catch(() => ({}));
        const named = await renameChat(roomDir, chatMatch[1], payload.title);
        return named ? sendJson(response, 200, { ...(await listChats(roomDir)) }) : sendJson(response, 404, { error: 'No such conversation.' });
      }
      if (chatMatch && request.method === 'DELETE') {
        if (chatMatch[1] === chatId && room.working()) return sendJson(response, 409, { error: 'A turn is running in this conversation.' });
        const gone = await deleteChat(roomDir, chatMatch[1]);
        if (!gone) return sendJson(response, 404, { error: 'No such conversation.' });
        if (gone.error) return sendJson(response, 409, gone);
        // What the archivist distilled from it is the project's memory and stays where it is.
        if (chatMatch[1] === chatId) { const mounted = await mountChat(gone.active); if (mounted.error) return sendJson(response, 409, mounted); }
        return sendJson(response, 200, { ...(await listChats(roomDir)), deleted: gone.deleted });
      }
      // The three tests. Reading is free; running one is the human's call, and the slow one says
      // where it is while it works.
      if (request.method === 'GET' && url.pathname === '/api/maturity/exams') {
        return sendJson(response, 200, await room.exams({ refresh: true, findings: eyecat.findings() }));
      }
      if (request.method === 'POST' && url.pathname === '/api/maturity/exam') {
        const payload = await body(request).catch(() => ({}));
        if (payload.stop) return sendJson(response, 200, room.stopExam());
        const result = await room.runExam(String(payload.which ?? ''), { findings: eyecat.findings() });
        return sendJson(response, result?.error ? 409 : 200, { ...result, exams: await room.exams() });
      }
      // Somebody's own module, handed to MADRE from the panel. It runs inside MADRE with the
      // human's permissions, so it goes through the same door as everything else: written to a
      // scratch copy, imported there, checked against the house rules, and only then installed.
      if (request.method === 'POST' && url.pathname === '/api/extensions/upload') {
        const payload = await body(request).catch(() => ({}));
        const text = String(payload.text ?? '');
        const name = String(payload.name ?? 'module.mjs');
        if (!text.trim()) return sendJson(response, 400, { error: 'That file is empty.' });
        if (text.length > 400_000) return sendJson(response, 413, { error: 'A module file that big is not a module. Keep it under 400 KB.' });
        if (!/\.m?js$/.test(name)) return sendJson(response, 400, { error: 'A module is a .mjs file.' });
        try {
          const installed = await installModuleText({
            text, name, scope: payload.scope === 'project' ? 'project' : 'user',
            stateRoot: root, projectRoot: canonicalProjectRoot,
            // A browser hands over the bytes, not a path: there is nowhere to go back to. A
            // module that wants to be updatable says so itself, with updates: { url }.
            source: null,
          });
          await room.record('extension.installed', { id: installed.id, name: installed.name, origin: installed.origin, file: installed.file, version: installed.version, by: 'upload' });
          return sendJson(response, 200, { installed, extensions: await describeModules(await moduleContext()) });
        } catch (error) {
          // The author reads exactly what failed: a module that will not load is not installed.
          return sendJson(response, 422, { error: error.message });
        }
      }
      // A newer copy of somebody's own module, from where they publish it or from the file it was
      // installed from. Asked for, never automatic: fetching means running what comes back.
      const refreshMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/refresh$/);
      if (refreshMatch) {
        const module = moduleById(refreshMatch[1]);
        if (!module?.external) return sendJson(response, 404, { error: 'Only a module you installed yourself can be refreshed.' });
        const origin = await moduleOrigin(module);
        if (!origin) return sendJson(response, 412, { error: `${module.name} does not say where a newer copy would come from. Declare updates: { url } in the module, or install it again from its file.` });
        const payload = await body(request).catch(() => ({}));
        let text;
        try {
          text = origin.kind === 'url'
            ? await reportFetch(origin.from, { signal: AbortSignal.timeout(10000) }).then(async (answer) => { if (!answer.ok) throw new Error(`HTTP ${answer.status}`); return answer.text(); })
            : await readFile(origin.from, 'utf8');
        } catch (error) { return sendJson(response, 502, { error: `Could not read ${origin.from}: ${error.message}` }); }
        if (!payload.confirm) {
          // What would be installed, checked before it is offered. Checking installs nothing.
          try {
            const candidate = await verifyModuleText({ text, name: `${module.id}.mjs` });
            return sendJson(response, 200, { origin, current: module.version ?? null, candidate: candidate.version ?? null, same: (candidate.version ?? null) === (module.version ?? null) });
          } catch (error) { return sendJson(response, 422, { error: error.message, origin }); }
        }
        try {
          const installed = await installModuleText({ text, name: `${module.id}.mjs`, scope: module.origin === 'project' ? 'project' : 'user', stateRoot: root, projectRoot: canonicalProjectRoot, source: origin });
          await room.record('extension.installed', { id: installed.id, name: installed.name, origin: installed.origin, file: installed.file, version: installed.version, by: 'refresh' });
          return sendJson(response, 200, { installed, extensions: await describeModules(await moduleContext()) });
        } catch (error) { return sendJson(response, 422, { error: error.message }); }
      }
      // Updating what a module drives. Two calls: the first asks what would run and answers with
      // the command, the second runs exactly that. MADRE never runs a command the human has not
      // read, and the room carries the output line by line like any other install.
      const updateRunMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/update$/);
      if (updateRunMatch) {
        const module = moduleById(updateRunMatch[1]);
        if (!module?.updatePlan) return sendJson(response, 405, { error: `${updateRunMatch[1]} cannot update what it drives from here.` });
        const payload = await body(request).catch(() => ({}));
        const context = await moduleContext();
        const item = await module.describe(context);
        const known = await context.services.moduleUpdate(item, { force: Boolean(payload.check) });
        const plan = await module.updatePlan(context, { latest: known?.latest ?? null, current: item.version ?? null });
        if (!plan?.command) return sendJson(response, 412, { error: plan?.note ?? 'There is no way to update this from here.', download: plan?.download ?? null });
        if (payload.confirm !== true) return sendJson(response, 200, { plan: { display: plan.display, note: plan.note ?? '' }, update: known });
        if (installing) return sendJson(response, 409, { error: `Another install is running (${installing}).` });
        installing = module.id;
        await room.record('extension.install.started', { id: module.id, name: item.name, command: plan.display, platforms: [], alreadyInstalled: true });
        void (async () => {
          const result = await runInstaller({ command: plan.command, args: plan.args, projectRoot: canonicalProjectRoot, timeoutMs: 900000, onLine: (line) => { void room.record('extension.install.output', { id: module.id, lines: [String(line).slice(0, 500)] }); } });
          await plan.after?.().catch(() => null);
          const after = await module.describe(await moduleContext()).catch(() => null);
          await room.record('extension.install.finished', {
            id: module.id, name: item.name, ok: result.code === 0, installed: Boolean(after?.version),
            detail: result.code === 0 ? `${item.name} now runs ${after?.version ?? 'what it found'}` : (result.error ?? `exit ${result.code}`),
          });
          installing = null;
        })();
        return sendJson(response, 202, { running: true, command: plan.display });
      }
      // A question the human has no use for. It stops being offered; nothing else changes.
      if (request.method === 'POST' && url.pathname === '/api/memory/ask/dismiss') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        const done = room.dismissAsk(String(payload.id ?? '').slice(0, 80));
        return done ? sendJson(response, 200, done) : sendJson(response, 404, { error: 'The room has no memory.' });
      }
      // One memory's own traffic: who it keeps arriving with, who asked for it, what a
      // refutation did. Read while its card is open, so the card is alive rather than a snapshot.
      const trafficMatch = request.method === 'GET' && url.pathname.match(/^\/api\/memory\/(\d+)\/traffic$/);
      if (trafficMatch) {
        if (!designationOk(url.searchParams.get('designation'))) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: 'CODE000. THE ARCHIVE IS SEALED.', lockedForMs: sealed });
        const traffic = room.memoryTraffic(Number(trafficMatch[1]));
        return traffic ? sendJson(response, 200, traffic) : sendJson(response, 404, { error: 'No such memory.' });
      }
      const forgetMatch = request.method === 'DELETE' && url.pathname.match(/^\/api\/memory\/(\d+)$/);
      if (forgetMatch) {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.' });
        if ((room.motherStatus()?.lockedForMs ?? 0) > 0) return sendJson(response, 423, { error: 'CODE000. THE ARCHIVE IS SEALED.' });
        const row = await room.forgetMemory(forgetMatch[1]);
        return row ? sendJson(response, 200, { forgotten: row, stats: room.memoryStats() }) : sendJson(response, 404, { error: 'No such memory.' });
      }
      if (request.method === 'POST' && url.pathname === '/api/agents/probe') {
        // Look for the binaries again too: a CLI installed a moment ago must appear now.
        await redetectAgents();
        return sendJson(response, 200, { sessions, sessionsAt, agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })) });
      }
      // A provider key for a CLI that signs in from its own prompt. Local connections only: a key
      // pasted from another machine would travel the network. It is written where that CLI looks
      // for it and never reaches MADRE's config, its ledger or its logs.
      const keyMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/key$/);
      if (keyMatch) {
        const id = keyMatch[1];
        const address = request.socket.remoteAddress ?? '';
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
          return sendJson(response, 403, { error: 'A key is only accepted from this computer, never over the network.' });
        }
        const agent = agents.find((item) => item.id === id);
        if (!agent?.detected) return sendJson(response, 412, { error: `${agent?.label ?? id} is not installed on this computer.` });
        if (!TAKES_KEY.has(id)) return sendJson(response, 400, { error: `${agent.label} signs in with a click, not with a key.` });
        const payload = await body(request).catch(() => ({}));
        const result = await applyKey({
          agent: id,
          key: payload.key,
          provider: payload.provider ?? null,
          home: credentialHome,
          executable: agent.path ?? id,
          probe: () => probeAgentAuth(agent),
        });
        if (!result.ok) return sendJson(response, 422, { error: result.error });
        await refreshSessions();
        // What the room remembers: that a key was set, and for which provider. Never the key.
        await room.record('connection.key.set', { agent: id, label: agent.label, provider: payload.provider ?? null, detail: result.detail ?? null });
        return sendJson(response, 200, { ok: true, session: sessions[id] ?? null });
      }
      const installAgentMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/install$/);
      if (installAgentMatch) {
        const result = await installAgent(installAgentMatch[1]);
        return sendJson(response, result.status, result.body);
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
        const ctx = await moduleContext();
        const fromModules = await Promise.all(moduleCommands().map(async (command) => {
          const settings = command.module.settingsFrom(ctx.config);
          const on = command.module.kind !== 'builtin' || Boolean(settings.enabled);
          let available = on;
          if (on && command.available) { try { available = Boolean(await command.available({ ...ctx, settings })); } catch { available = false; } }
          return { name: command.name, module: command.module.id, title: command.title, usage: command.usage, summary: command.summary, available };
        }));
        return sendJson(response, 200, { commands: [...(await listCommands({ projectRoot: canonicalProjectRoot })), ...fromModules] });
      }
      if (request.method === 'POST' && url.pathname === '/api/commands') {
        const { text } = await body(request);
        const parsed = parseCommand(text);
        if (!parsed) return sendJson(response, 400, { error: 'Not a command. Commands start with "/" followed by a name.' });
        let command = commandByName(parsed.name);
        let result;
        if (command) {
          if (!(await command.available({ projectRoot: canonicalProjectRoot }))) return sendJson(response, 412, { error: `/${parsed.name} is not available in this project (${command.title}).` });
          result = await command.execute({ projectRoot: canonicalProjectRoot, args: parsed.args });
        } else {
          // A module's command: runs with the module's ctx and settings, only while the module is on.
          const own = moduleCommands().find((item) => item.name === parsed.name);
          if (!own) return sendJson(response, 404, { error: `Unknown command /${parsed.name}.` });
          const ctx = await moduleContext();
          const settings = own.module.settingsFrom(ctx.config);
          if (own.module.kind === 'builtin' && !settings.enabled) return sendJson(response, 412, { error: `/${parsed.name} belongs to ${own.module.name}, which is off. Enable it in MODULES.` });
          if (own.available && !(await own.available({ ...ctx, settings }).catch(() => false))) return sendJson(response, 412, { error: `/${parsed.name} is not available here (${own.title}).` });
          try {
            const answer = await own.execute({ ...ctx, settings }, parsed.args);
            result = { ok: answer?.ok !== false, title: answer?.title ?? own.title, text: String(answer?.text ?? '') };
          } catch (error) { result = { ok: false, title: own.title, text: `/${parsed.name} failed: ${error.message}` }; }
          command = own;
        }
        const event = await room.recordCommand({ name: parsed.name, args: parsed.args, ...result });
        return sendJson(response, result.ok ? 200 : 422, { command: parsed.name, title: result.title, ok: result.ok, sequence: event.sequence });
      }
      if (request.method === 'GET' && url.pathname === '/api/extensions') {
        const extensions = await describeModules(await moduleContext());
        void warmModuleUpdates(extensions);
        return sendJson(response, 200, { installing, extensions, failures: loadFailures, folders: moduleFolders({ stateRoot: root, projectRoot: canonicalProjectRoot }), sdk: 'https://github.com/jossuealcacao-exe/madre/blob/main/docs/SDK.md' });
      }
      // The human installs a module file an agent wrote (or they did): checked first, then copied into the chosen folder.
      if (request.method === 'POST' && url.pathname === '/api/extensions/install-file') {
        const payload = await body(request).catch(() => ({}));
        const relative = String(payload.path ?? '').replace(/^\/+/, '');
        if (!relative || relative.includes('..')) return sendJson(response, 400, { error: 'Give the project-relative path of a <id>.module.mjs file.' });
        try {
          const installed = await installModuleFile({ source: join(canonicalProjectRoot, relative), scope: payload.scope === 'project' ? 'project' : 'user', stateRoot: root, projectRoot: canonicalProjectRoot, roomDir });
          await room.record('extension.installed', { id: installed.id, name: installed.name, origin: installed.origin, from: relative, by: 'you' });
          return sendJson(response, 200, { installed, extensions: await describeModules(await moduleContext()) });
        } catch (error) { return sendJson(response, 422, { error: error.message }); }
      }
      const removeMatch = request.method === 'DELETE' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)$/);
      if (removeMatch) {
        try {
          const removed = await removeExternalModule({ id: removeMatch[1], stateRoot: root, projectRoot: canonicalProjectRoot });
          await room.record('extension.removed', { id: removed.id, name: removed.name, by: 'you' });
          return sendJson(response, 200, { removed, extensions: await describeModules(await moduleContext()) });
        } catch (error) { return sendJson(response, moduleById(removeMatch[1]) ? 403 : 404, { error: error.message }); }
      }
      // The human edited or added a module file: load it again without restarting the room.
      if (request.method === 'POST' && url.pathname === '/api/extensions/reload') {
        const outcome = await loadExternalModules({ stateRoot: root, projectRoot: canonicalProjectRoot });
        await room.record('extension.reloaded', { loaded: outcome.loaded.map((module) => module.id), failures: outcome.failures.length });
        return sendJson(response, 200, { loaded: outcome.loaded.map((module) => ({ id: module.id, name: module.name, origin: module.origin, file: module.file })), failures: outcome.failures, extensions: await describeModules(await moduleContext()) });
      }
      // The button beside a version: look now, outside the day's cache. It answers for this card
      // alone, and what it asks about is the name of a package or a repository, nothing else.
      const updateMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/updates$/);
      if (updateMatch) {
        const context = await moduleContext();
        const module = moduleById(updateMatch[1]);
        if (!module) return sendJson(response, 404, { error: `No module "${updateMatch[1]}".` });
        const item = await module.describe(context);
        const update = await context.services.moduleUpdate(item, { force: true });
        return sendJson(response, 200, { id: item.id, version: item.version, update });
      }
      // One setting from a card's own floor. The module declared it; MADRE saves it.
      const settingMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/settings$/);
      if (settingMatch) {
        const module = moduleById(settingMatch[1]);
        if (!module?.setControl) return sendJson(response, 404, { error: `No settings on "${settingMatch[1]}".` });
        const result = await module.setControl(await moduleContext(), await body(request));
        return sendJson(response, result.status, result.body);
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
        await refreshPrivacy();
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
  listening = server;
  // `server.close()` only resolves once every connection has ended, so the
  // long-lived SSE responses must be ended before the native close runs.
  const nativeClose = server.close.bind(server);
  server.close = (callback) => {
    clearInterval(poller);
    clearTimeout(embedKick);
    unwatchOutbound();
    // In-flight agent processes are killed and their turns recorded as failed
    // before the SSE clients go away, so open pages see the outcome.
    const shutdown = room.shutdown().catch((error) => console.error(`MADRE shutdown error: ${error.message}`));
    let result;
    shutdown.then(() => {
      void broadcastPending().then(() => chatWrites).then(() => {
        unsubscribe();
        unsubscribeSentinel();
        unsubscribeEyecat();
        unsubscribeLive();
    unsubscribeGhost();
        for (const client of clients.keys()) client.end();
        clients.clear();
        // The memory file closes last, once nothing else writes to it; WAL and shm go with it.
        try { memory?.close(); } catch { /* already closed */ }
        void outbound.drain();
        releaseOpen();
        result = nativeClose(callback);
        server.closeIdleConnections?.();
      });
    });
    return server;
  };
  server.on('close', () => quotaMonitor.stop());

  return { server, store, agents, quotaMonitor, markOpen, releaseOpen };
}

export async function startPulse({ port, projectRoot, openBrowser }) {
  const { server, agents, markOpen } = await createPulseServer({ projectRoot, quotaSources: defaultQuotaSources() });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  // The room is taken from here on, and says so on disk for anyone who tries to open it again.
  await markOpen(address.port);
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
