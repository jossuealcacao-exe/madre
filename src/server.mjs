// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import http from 'node:http';
import { readFile, realpath, writeFile, mkdir, mkdtemp, cp, rename, access, rm, stat } from 'node:fs/promises';
import { existsSync, openSync, rmSync } from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { probePort, framable } from './ports.mjs';
import { ControlDesk } from './room/control.mjs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { homedir, hostname, tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
import { detectAgents, toolsPrefix } from './runtime-detection.mjs';
import { EventStore } from './event-store.mjs';
import { RoomMemory, travels as memoryTravels } from './memory.mjs';
import { createEmbedder } from './embeddings.mjs';
import { memoryServerFor } from './memory-tools.mjs';
import { MotherChannel, CODE000_STRIKES } from './mother.mjs';
import { ErrorSentinel } from './sentinel-errors.mjs';
import { probeOllama, ollamaEmbedder, ollamaGenerate, ollamaInvoker, pullModel, ollamaVersions, ownOllamaServers } from './ollama.mjs';
import { recallForTurn } from './modules/enlaces.mjs';
import { hardwareOnce, MODEL_TIERS } from './modules/local-models.mjs';
import { MODULES, moduleById, describeModules, findModuleRoute, toolsForTurn as modulesToolsForTurn, loadExternalModules, loadFailures, moduleFolders, moduleCommands, installModuleFile, installModuleText, verifyModuleText, moduleOrigin, removeExternalModule } from './modules/index.mjs';
import { madreAgent, madreInvoker, MADRE_AGENT_ID, MADRE_ADAPTER } from './adapters/madre.mjs';
import { exportDataset, forgetCorpus, keepCorpus, keptCorpus, pruneCorpora, readiness as datasetReadiness } from './dataset.mjs';
import { OutboundLog, outboundView, DEFAULT_REPORT_URL } from './outbound.mjs';
import { language as roomLanguage, setLanguage as setRoomLanguage, t } from './i18n.mjs';

// One per start of this process: a restart is a new one, a reload of the page is not.
const BOOT_ID = `${process.pid}-${Date.now().toString(36)}`;
const PACKAGE = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8').catch(() => '{}'));
// The phone is not in the public MADRE until it is stable (2026-10-12): it is offered only on a copy
// run from its source, where the repository's `.git` sits beside `src/`. What npm installs never
// carries a `.git` (`files` in package.json), so there no setting and no variable opens it.
const FROM_SOURCE = existsSync(new URL('../.git', import.meta.url));
// Where the author's token for the usage widget is kept: a vault name no module can take (module
// ids are kebab-case, src/modules/sdk.mjs), so no module ever reads it.
export const OWNER_VAULT = 'madre_owner';
let crashHandlersInstalled = false;

// RIPLEY's bridge, injected into every page it renders: reports the page's path
// and title to the viewer and forwards runtime errors and failed resources.
// It talks only upward through postMessage; the frame stays an opaque origin.
// The bridge also says, once per page, that the page reached for its storage: the sealed frame
// has an opaque origin, so localStorage, sessionStorage, IndexedDB and cookies throw or forget, and
// an app that keeps its data there cannot be tried in here. The access still fails exactly as it
// did; the viewer is only told, so it can say where the page can be tried with its data. Window is
// the global interface: browsers put its storage getters on window itself, not on its prototype.
export const RIPLEY_BRIDGE = '<script data-ripley>(function(){var p=location.pathname;function send(m){try{parent.postMessage(Object.assign({ripley:1},m),"*")}catch(e){}}send({type:"page",path:p,title:document.title});addEventListener("DOMContentLoaded",function(){send({type:"page",path:p,title:document.title})});addEventListener("error",function(e){if(e.target&&e.target!==window&&!e.message){var u=e.target.src||e.target.href||"";send({type:"error",message:"Failed to load "+(u||e.target.tagName.toLowerCase()),source:u,line:0});return}send({type:"error",message:String(e.message||"error"),source:e.filename||"",line:e.lineno||0})},true);addEventListener("unhandledrejection",function(e){var r=e.reason;send({type:"error",message:"Unhandled promise rejection: "+String(r&&r.message||r),source:"",line:0})});var told=0;function storage(n){if(!told){told=1;send({type:"storage",what:n})}}["localStorage","sessionStorage","indexedDB"].forEach(function(n){var d=Object.getOwnPropertyDescriptor(window,n)||Object.getOwnPropertyDescriptor(Window.prototype,n);if(!d||!d.get)return;try{Object.defineProperty(window,n,{configurable:true,get:function(){storage(n);return d.get.call(window)}})}catch(e){}});var c=Object.getOwnPropertyDescriptor(Document.prototype,"cookie");if(c&&c.get&&c.set){try{Object.defineProperty(document,"cookie",{configurable:true,get:function(){storage("cookie");return c.get.call(document)},set:function(v){storage("cookie");c.set.call(document,v)}})}catch(e){}}})();</script>';
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
import { COPILOT_WINDOWS } from './room/copilot.mjs';
import { OVERRIDE_GRACE, changeNeedsPhrase, keyHolds, mergeOverride, overrideSettings, phraseHash, publicOverride } from './override.mjs';
import { extensionById, findOnPath, runInstaller } from './extensions.mjs';
import { accountNoteFor, deviceCodeIn, geminiSignIn, installPlanFor, looksLikeAdminProblem, loginPlanFor, looksLikeCodePrompt, looksLikeConsentPrompt, probeAgentAuth, probeAll, TAKES_KEY } from './auth-probe.mjs';
import { applyKey, keyPlanFor, openCodeKeyProviders, readOpenCodeProviders, removeOpenCodeKey } from './credentials.mjs';
import { forgetSecret, readSecret, summary as vaultSummary, writeSecret } from './vault.mjs';
import { applyConfigToEnv, loadConfig as readConfig, updateConfig } from './config.mjs';
import { Privacy, normalizeTerms, privacySettings } from './privacy.mjs';
import { checkForUpdate, detectInstall, updateCommand, releaseUrl, applyCommand, fetchCommand } from './updates.mjs';
import { bootWhatsNew, markSeen, newestNotes, notesFor, whatsNew } from './whats-new.mjs';
import { answerAsk, tickAsk } from './review-ask.mjs';
import { CHAPTERS, HINTS, TOUR_VERSION, cameBefore, changeTour, readTour, recoverProject, roomsWithoutProject } from './tour.mjs';

// Where a person reads the module contract, in the language the room is speaking.
const SDK_PAGE = { es: 'https://madre.run/sdk/', en: 'https://madre.run/en/sdk/' };
import { moduleUpdate } from './modules/updates.mjs';
import { adoptStrays, chatIndex, chatLedger, createChat, deleteChat, isChatId, listChats, openChat as openChatIndex, projectFloor, renameChat, touchChat } from './chats.mjs';
import { spawn } from 'node:child_process';
import { cpus, freemem, loadavg, totalmem } from 'node:os';
import { discoverModels, groupOpenCode, openCodeHidden, parseOpenCodeVerbose, providerLabel, OPENCODE_OWN } from './models.mjs';
import { observable } from './modules/intents-observe.mjs';
import { normalizeMode, setImageModule } from './capabilities.mjs';
import { resolveGeminiKey } from './image-studio.mjs';
import { commandByName, listCommands, parseCommand } from './commands.mjs';
import { listDirectory, searchFiles, readServable, storeAttachment, resolveInside, createEmptyFile, writeEdited, MAX_ATTACHMENT_BYTES, MAX_EDIT_BYTES } from './files.mjs';
import { planFileOp, freeCopyPath, needsDesignationOnDisk, CREATIONS } from './file-ops.mjs';
import { ServerSentinel } from './server-sentinel.mjs';
import { Eyecat } from './eyecat-watch.mjs';
import { economy } from './room/economy.mjs';
import { maturity } from './maturity.mjs';
import { memoryDashboard } from './memory-dashboard.mjs';
import { verdictFor } from './verdict.mjs';
import { refuseForeign } from './request-guard.mjs';
import { restoreGuard } from './room/guard.mjs';
import { bridgeAnswers, hostBridge } from './bridge/host.mjs';
import { BRIDGE_PORT } from './bridge/server.mjs';
import { createInvite, forgetDevice, forgetNetwork, readStore, setEnabled, storeView, trustNetwork } from './bridge/devices.mjs';
import { currentNetwork, lanAddresses } from './bridge/network.mjs';
import { PHONE_MAX_MODE, writtenMode } from './bridge/policy.mjs';
import { qrSvg } from './bridge/qr.mjs';
import { readHandoff, writeHandoff } from './bridge/handoff.mjs';
import { changeHome, changeLooks, readHome, readLooks, changeRoomLook, roomLooks, WALLPAPER_BYTES, dropWallpaper, frameWallpaper, readWallpaper, saveWallpaper, wallpaperBytes } from './looks.mjs';
import { localAiConfig, localAiFor, localAiPatch } from './local-ai.mjs';
import { moduleOnIn, scopeView, settingsIn } from './module-scope.mjs';
import { forgetFromMarket, installFromMarket, installedFromMarket, keptCatalog, marketAnnounced, marketAnnouncements, marketNews, marketNewsSeen, refreshCatalog, updateFromMarket } from './market-remote.mjs';
// Not moved project by project: the Coordinator is Home's, Git has no switch, and Local AI keeps
// its own list of projects (local-ai.mjs).
const NOT_BY_PROJECT = new Set(['bishop', 'git-pulse', 'ollama']);
import { heartbeat } from './heartbeat.mjs';
import { askRoom, associateProject, createProject, ensureSalasProject, forgetProject, isSalasRoom, knownRooms, listFolders, markProject, projectRoomId, roomComesUp, salasRoomId, startRoom, suggestProjects, universeOf } from './salas.mjs';
import { parseWork, recentWork, WORK_SYSTEM, workPrompt } from './lobby-work.mjs';
import { CHANNEL_HEADER, CORPUS_MAX, CORPUS_PER_HOUR, DELIVER_MAX, MAX_LIMIT as ENLACE_MAX_LIMIT, NO_SUCH_LINK, NOTICES as ENLACE_NOTICES, activeContracts, allowContract, askCorpus, askEnlace, askState, channelKey, countRecent, decideDelivery, deliverable, deliverNotes, deliversTo, linkTraffic, mayServe, noteCrossing, noticeEnlace, readInbox, readsFrom, recallContract, receiveDelivery, revokeContract, sameKey, servingRooms, signContract, trainContract } from './enlaces.mjs';
import { readContinuity } from './modules/ahp.mjs';
import { readAt } from './checkpoint.mjs';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = join(sourceDirectory, '..', 'public');

// The page's own scripts and styles (2026-10-15): an ETag from the file's size and time, so a
// reload that finds them unchanged gets «304» and the browser reuses its copy — and the code it
// already compiled — instead of reading 2.5 MB again; and gzip for whoever asks, compressed once per
// change of the file. `no-cache` still revalidates every time, so an edit shows on the next load.
// Only the compressed copy is kept in memory (~0.6 MB for all of them); the plain file is read when
// a client does not take gzip.
const assetCache = new Map();
async function sendAsset(request, response, file, type) {
  const info = await stat(file);
  const tag = `W/"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
  const headers = { 'content-type': type, 'cache-control': 'no-cache', etag: tag, vary: 'accept-encoding' };
  if (request.headers['if-none-match'] === tag) { response.writeHead(304, headers); return response.end(); }
  const gzip = /\bgzip\b/.test(String(request.headers['accept-encoding'] ?? '')) && info.size > 8192;
  if (gzip) {
    let held = assetCache.get(file);
    if (held?.tag !== tag) { held = { tag, body: gzipSync(await readFile(file), { level: 6 }) }; assetCache.set(file, held); }
    response.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': held.body.length });
    return response.end(held.body);
  }
  const body = await readFile(file);
  response.writeHead(200, { ...headers, 'content-length': body.length });
  return response.end(body);
}

// The record as a page opening it needs it (2026-10-15). `quota.updated` is how full each agent's
// window is, read again every few minutes; the page keeps only the last reading of each agent, so
// every older one was downloaded, parsed and drawn for nothing — 87% of a long conversation's
// record, and seconds of drawing. The ledger keeps them all; the page gets the newest of each.
export function forThePage(events) {
  const lastQuota = new Map();
  for (const event of events) if (event?.type === 'quota.updated') lastQuota.set(event.payload?.agent ?? null, event);
  const keep = new Set(lastQuota.values());
  return events.filter((event) => event?.type !== 'quota.updated' || keep.has(event));
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

// A request's JSON, read whole before it is decoded (2026-10-12, SRV-08): a «ñ» split between two
// packets came out as «��». The limit is in bytes; a route that takes more says so (the editor).
const BODY_LIMIT = 100_000;
async function body(request, { limit = BODY_LIMIT } = {}) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(command, args, () => {});
}

// PULSE_AGENT_TIMEOUT_MS applies to every agent; PULSE_<AGENT>_TIMEOUT_MS
// (e.g. PULSE_CLAUDE_TIMEOUT_MS) overrides it for one.
export function agentTimeoutsFromEnv(env = process.env, agentIds = ['codex', 'claude', 'gemini', 'opencode', 'cursor']) {
  const timeouts = {};
  const shared = Number(env.PULSE_AGENT_TIMEOUT_MS);
  if (Number.isFinite(shared) && shared > 0) timeouts.default = shared;
  for (const id of agentIds) {
    const value = Number(env[`PULSE_${id.toUpperCase()}_TIMEOUT_MS`]);
    if (Number.isFinite(value) && value > 0) timeouts[id] = value;
  }
  return timeouts;
}

// The id of a room lives beside the rest of what Salas knows of rooms (src/salas.mjs); it is still
// read from here by everything that always did.
export { projectRoomId };

// What the pages of a project and of Home are sent with (2026-10-12, SRV-04 and WEB-01 of the 1.0
// review). Only this same page may frame them — the split view frames `/?pane=split` — so another
// page cannot lay them under its own buttons and borrow a click on RUN or STOP ALL. And images come
// only from here: a picture in an answer that pointed elsewhere was fetched the moment it was
// drawn, with whatever its address carried, and never counted as something that left the Mac.
const PAGE_GUARDS = {
  'x-frame-options': 'SAMEORIGIN',
  'content-security-policy': "frame-ancestors 'self'; img-src 'self' data: blob:",
  'x-content-type-options': 'nosniff',
};

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
  // How long a conversation opened beside the one on screen waits for a page to start watching it.
  heldGraceMs = 30000,
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
  // The Market's catalog and module files from madre.run (src/market-remote.mjs); tests hand in a
  // fake, and the key their catalog is signed with.
  marketFetch = globalThis.fetch,
  marketKey = null,
  // Ollama detection; tests hand in a fake probe. PULSE_OLLAMA=0 leaves Ollama alone entirely.
  ollamaProbe = process.env.PULSE_OLLAMA === '0' ? async () => ({ running: false, host: null, models: [], embedModel: null, chatModel: null, disabled: true }) : probeOllama,
}) {
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
  // Read before this run creates anything: whether this person used MADRE before decides whether
  // an update has news to show them, or this is a first install with nothing to catch up on.
  const novelty = await bootWhatsNew({ root, version: PACKAGE.version }).catch(() => ({ returning: false }));
  // ~/.pulse/config.json fills in whatever the environment did not set.
  applyConfigToEnv(await readConfig(root));
  // What language the screens speak. The prompt the agents read is not one of them, and the
  // environment wins over the file, as it does for every other setting here.
  setRoomLanguage(process.env.PULSE_LANGUAGE ?? (await readConfig(root)).language);
  // Whether anyone set it: a MADRE nobody has set takes the language of the first browser that
  // opens it (public/i18n.js, browserLanguage), once, and keeps it as if it had been chosen.
  let languageChosen = Boolean(process.env.PULSE_LANGUAGE || (await readConfig(root)).language);
  // RIPLEY renders HTML in the viewer only while the human has it switched on; read live, the switch is the module's.
  const ripleyOn = async () => moduleOnHere(await readConfig(root), 'ripley');
  agentTimeouts ??= agentTimeoutsFromEnv();
  const detector = detect ?? (providedAgents ? null : detectAgents);
  const agents = providedAgents ?? await detector();
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => resolve(projectRoot));
  const roomDir = join(root, 'rooms', projectRoomId(canonicalProjectRoot));
  // Whether this is the room of Salas (docs/MACROVERSO.md, fase 3d): the room whose project is
  // the notebook of Salas, decided once from real paths; the page carries the MACROVERSO key there.
  const salasRoom = isSalasRoom(canonicalProjectRoot, root);
  // What left this machine. Every fetch this process makes — MADRE's own and any a module makes,
  // because a module runs in here and cannot opt out — goes through one wrapper and lands in a
  // line beside the ledger. Bodies, headers and query values are never in it. One room per
  // process holds the watch; a second would only log what the first already logged.
  const outbound = await new OutboundLog({ file: join(roomDir, 'outbound.jsonl') }).load();
  const unwatchOutbound = outbound.install();
  process.env.PULSE_OUTBOUND_LOG = join(roomDir, 'outbound.jsonl');
  reportFetch = outbound.watch(reportFetch);
  marketFetch = outbound.watch(marketFetch);

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
  // A live process is not enough (2026-10-12, LOG-13): after a restart of the Mac the number of the
  // room that died is often some other program's, and the project said «already open» for good. It
  // is taken only if that room also answers on its port.
  const answers = async (port) => Number.isInteger(port) && await fetch(`http://127.0.0.1:${port}/api/version`, { signal: AbortSignal.timeout(1500) }).then((response) => response.ok, () => false);
  if (held && Number.isInteger(held.pid) && held.pid !== process.pid && alive(held.pid) && await answers(held.port)) {
    const error = new Error(`MADRE is already open for this project at http://127.0.0.1:${held.port} (process ${held.pid}). Close that room first, or open another conversation inside it.`);
    error.code = 'ROOM_IN_USE';
    throw error;
  }
  // The room is this one's now. A room that died in the middle of a turn left the project's .env
  // files and MADRE's folders read-only (room/guard.mjs): they get their modes back first.
  const unlocked = await restoreGuard(join(roomDir, 'guard.json')).catch(() => []);
  if (unlocked.length) console.error(`MADRE: a room that closed mid-turn had left ${unlocked.length} protected path(s) read-only; they are writable again.`);
  // The mark also says which project and which MADRE, for the bridge's list of rooms on the phone.
  let openPort = null;
  // Where the project is, too (src/salas.mjs): a room that is closed can be opened again from Salas.
  const markOpen = async (port) => { openPort = port; await mkdir(roomDir, { recursive: true }).catch(() => {}); await writeFile(openMark, JSON.stringify({ pid: process.pid, port, at: new Date().toISOString(), project: basename(canonicalProjectRoot), version: PACKAGE.version ?? null })).catch(() => {}); await markProject(roomDir, canonicalProjectRoot).catch(() => {}); };
  // The phone (docs/MOBILE.md) is not offered in MADRE 1.0 (2026-10-11, hidden 2026-10-12): Safari
  // in HTTPS-only mode refuses the bridge's http, and the relay that fixes it is not built. Only a
  // copy run from source (FROM_SOURCE, above) on a Mac that turned it on — `phone.preview` in
  // config.json, or PULSE_PHONE=1 — has it. Everywhere else nothing says it exists: no key on the
  // bar, no place in Settings, no chapter in the tour, and the bridge never opens.
  const phonePreview = async () => FROM_SOURCE && (process.env.PULSE_PHONE === '1' || (await readConfig(root).catch(() => ({}))).phone?.preview === true);
  // This room offers to host the bridge once it is open; see bridge/host.mjs.
  const phone = hostBridge({ root, publicDirectory, allowed: phonePreview });
  async function phoneView() {
    const store = await readStore(root);
    const here = await currentNetwork().catch(() => null);
    return {
      available: Boolean(here),
      network: here ? { id: here.id, gateway: here.gateway, trusted: store.networks.some((one) => one.id === here.id) } : null,
      addresses: here ? lanAddresses({ device: here.device }) : [],
      port: BRIDGE_PORT,
      bridge: { up: await bridgeAnswers(), here: phone.status().hosting },
      ...storeView(store),
    };
  }
  const releaseOpen = () => { try { rmSync(openMark, { force: true }); } catch { /* it was already gone */ } };
  // How many memories of each kind, and how many travel into turns. Counted, never read out.
  function memoryCensus() {
    const all = memory ? memory.memories({ limit: 20000 }) : [];
    const kinds = {};
    let travelling = 0;
    for (const note of all) {
      kinds[note.kind] = (kinds[note.kind] ?? 0) + 1;
      if (memoryTravels(note)) travelling += 1;
    }
    return { memories: all.length, kinds, travelling };
  }
  // The human's own modules, from ~/.pulse/modules and <project>/.madre/modules.
  await loadExternalModules({ stateRoot: root, projectRoot: canonicalProjectRoot }).catch((error) => console.error(`MADRE modules: ${error.message}`));
  // A project has one memory and many conversations; one of them is open at a time, and the
  // numbering is the project's, so a citation means the same thing in all of them.
  await adoptStrays(roomDir).catch(() => null);
  let chatId = (await chatIndex(roomDir)).active;
  // Every record open in this process. Two conversations may write at once (one at work while
  // the human is in another, or both halves of a split window), so the floor a ledger numbers
  // from is read when it writes: what the project had on disk, or what any open ledger has
  // handed out since, whichever is higher.
  const liveStores = new Set();
  let retiredHigh = 0;   // the highest a ledger that closed in this process had reached
  const openLedger = async (id) => {
    const base = await projectFloor(roomDir, { except: id });
    const opened = await new EventStore(chatLedger(roomDir, id), { floor: () => Math.max(base, retiredHigh, ...[...liveStores].map((each) => each.lastSequence)) }).initialize();
    // A record with lines that are not events opens anyway (src/event-store.mjs); it is said here,
    // with where the file is, and nothing in it is removed.
    if (opened.damaged) console.error(`MADRE: ${opened.damaged} damaged line(s) in ${chatLedger(roomDir, id)} were stepped over; the file keeps them.`);
    liveStores.add(opened);
    return opened;
  };
  const retireLedger = (closed) => { if (!liveStores.delete(closed)) return; retiredHigh = Math.max(retiredHigh, closed.lastSequence); };
  let store = await openLedger(chatId);
  let historicalEvents = await store.readAll();
  // The room's memory: derived from the ledger, rebuilt if missing or stale,
  // and never a reason for the room not to open.
  // Release channel: one registry read a day, cached for every room on this machine. On by
  // default; PULSE_UPDATE_CHECK=0 or the switch in MU/TH/UR turns it off. Never self-updates.
  const updatesEnabled = () => (process.env.PULSE_UPDATE_CHECK !== undefined ? process.env.PULSE_UPDATE_CHECK !== '0' : updatesConfig.check !== false);
  let updatesConfig = { ...((await readConfig(root)).updates ?? {}) };
  // THE MARKET from madre.run (src/market-remote.mjs): read when MADRE opens, while Look for new
  // versions is on (PULSE_MARKET=0 says no to it alone). A module got from it updates itself and
  // says so once, the next time a page asks (market/updates.json).
  const marketOn = () => process.env.PULSE_MARKET !== '0' && updatesEnabled();
  const marketKeyed = marketKey ? { publicKey: marketKey } : {};
  const marketTools = () => ({ stateRoot: root, projectRoot: canonicalProjectRoot, madre: PACKAGE.version, fetchImpl: marketFetch, verifyText: verifyModuleText, installText: installModuleText });
  let marketSync = null;
  const syncMarket = ({ force = false } = {}) => {
    if (!marketOn()) return Promise.resolve({ catalog: null, off: true });
    marketSync ??= (async () => {
      const read = await refreshCatalog({ stateRoot: root, fetchImpl: marketFetch, force, ...marketKeyed });
      if (read.catalog) await updateFromMarket({ ...marketTools(), catalog: read.catalog, names: Object.fromEntries(MODULES.map((one) => [one.id, one.name])) }).catch(() => []);
      return read;
    })().finally(() => { marketSync = null; });
    return marketSync;
  };
  void syncMarket().catch(() => null);
  const install = detectInstall({ projectRoot: canonicalProjectRoot });
  async function versionView({ force = false } = {}) {
    const check = await checkForUpdate({ name: PACKAGE.name, current: PACKAGE.version, cacheFile: join(root, 'updates.json'), fetchImpl: reportFetch, enabled: updatesEnabled(), force });
    return { project: canonicalProjectRoot, ...check, notes: Boolean(notesFor(PACKAGE.version)), name: PACKAGE.name, install, command: updateCommand(install, PACKAGE.name, check.latest ?? 'latest'), release: check.latest ? releaseUrl(PACKAGE.repository, check.latest, roomLanguage()) : null, envWins: process.env.PULSE_UPDATE_CHECK !== undefined };
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
  const memoryWasThere = await stat(join(roomDir, 'memory.sqlite')).then(() => true, () => false);
  const memory = await new RoomMemory(join(roomDir, 'memory.sqlite')).attachPrivacy(privacy).initialize(store)
    .catch((error) => { console.error(`MADRE memory unavailable, turns get the recent window only: ${error.message}`); return null; });
  // A memory made again from nothing (its file deleted, a copy of the project's state without it)
  // is filled from every conversation of the project, not only the one open (LOG-14 of the 1.0
  // review): the index of the others was lost for good. The words are indexed once; a number
  // already there is left as it is.
  if (memory && !memoryWasThere) {
    for (const chat of (await listChats(roomDir)).chats) {
      if (chat.id === chatId) continue;
      const file = chatLedger(roomDir, chat.id);
      if (await stat(file).then((info) => info.isFile(), () => false)) memory.index(await new EventStore(file).readAll().catch(() => []));
    }
  }
  // Meaning-aware recall through the user's own Gemini key, when there is one;
  // and the memory as MCP tools for every agent's turn.
  // Ollama, when it is there: local embeddings and a local archivist. Probed at
  // start and again from MODULES; wired live, no restart.
  let ollama = { running: false, host: null, models: [], embedModel: null, chatModel: null };
  // The lobby's two readings (src/lobby-work.mjs): MADRE's summary of what was worked on last, kept
  // beside this room's record so a restart does not lose it, and the recent decisions of the open
  // rooms, asked of them at most every few minutes (each room works its zones out itself).
  const lobbyWork = { file: join(roomDir, 'lobby-work.json'), loaded: false, key: null, at: 0, tried: 0, bullets: null, model: null, error: null, running: null };
  const lobbyDecisions = { at: 0, list: null, running: null };
  // A busy agent can delay a room's glance without closing the room. Keep the last confirmed
  // reading for a short time, and distinguish a slow answer from a stopped process.
  const lobbyGlances = new Map();
  // HOME'S WIDGETS (2026-10-13): what each one shows comes from something that already exists —
  // the machine (node:os), each open project's servers sentinel (/api/ports) and dataset
  // (/api/dataset: maturity, pairs, the model trained on it), this room's own dataset for the
  // Coordinator, and Ollama as this room probed it. A reading is kept 30 s, so a page that asks
  // every few seconds never makes the projects work for it.
  const widgetReadings = new Map();
  let cpuSeen = null;
  const cpuTimes = () => cpus().reduce((sum, one) => {
    const times = one.times;
    sum.idle += times.idle;
    sum.total += times.user + times.nice + times.sys + times.idle + times.irq;
    return sum;
  }, { idle: 0, total: 0 });
  async function cpuBusy() {
    let before = cpuSeen;
    if (!before || Date.now() - before.at > 60000) { before = { ...cpuTimes(), at: Date.now() }; await new Promise((done) => setTimeout(done, 300)); }
    const now = { ...cpuTimes(), at: Date.now() };
    cpuSeen = now;
    const total = now.total - before.total;
    return total > 0 ? Math.max(0, Math.min(1, 1 - (now.idle - before.idle) / total)) : null;
  }
  const readinessOf = (answer) => (answer && !answer.unreachable && !answer.outdated ? {
    pairs: answer.readiness?.pairs ?? 0, target: answer.readiness?.target ?? 300, aberrations: answer.readiness?.aberrations ?? 0,
    good: answer.readiness?.good ?? 0, bad: answer.readiness?.bad ?? 0, trained: answer.trained ?? null,
    score: answer.maturity?.score ?? null, stage: answer.maturity?.stage?.label ?? null, says: answer.maturity?.stage?.says ?? null,
    weakest: (() => { const one = (answer.maturity?.signals ?? []).find((signal) => signal.id === answer.maturity?.weakest); return one ? { label: one.label ?? null, next: one.next ?? null } : null; })(),
    signals: (answer.maturity?.signals ?? []).map((one) => ({ id: one.id, label: one.label, value: one.value })),
  } : null);
  // Each project with whether it uses the local AI, for the widget that shows Ollama (src/local-ai.mjs).
  const withLocalAi = async (projects) => { const config = await readConfig(root); return projects.map((one) => ({ ...one, localAi: localAiFor(config, one.id).on })); };
  async function openProjects() {
    const salas = salasRoomId(root);
    return (await knownRooms(root)).filter((one) => one.open && one.id !== salas);
  }
  // Memory a program could have now. os.freemem() counts only pages nobody holds; macOS keeps
  // most of the rest as cache it gives back at once, so «free» read 0.1 GB of 16 on an idle Mac.
  // The system's own count: free, inactive, speculative and purgeable pages on macOS (vm_stat),
  // MemAvailable on Linux; freemem() where neither answers.
  async function memoryAvailable() {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execFileAsync('vm_stat', [], { timeout: 2000 });
        const page = Number(stdout.match(/page size of (\d+) bytes/)?.[1] ?? 0);
        const pages = (name) => Number(stdout.match(new RegExp(`Pages ${name}:\\s+(\\d+)`))?.[1] ?? 0);
        if (page) return { bytes: (pages('free') + pages('inactive') + pages('speculative') + pages('purgeable')) * page, source: 'vm_stat' };
      }
      if (process.platform === 'linux') {
        const kb = Number((await readFile('/proc/meminfo', 'utf8')).match(/^MemAvailable:\s+(\d+)/m)?.[1] ?? 0);
        if (kb) return { bytes: kb * 1024, source: 'meminfo' };
      }
    } catch { /* the plain count below */ }
    return { bytes: freemem(), source: 'freemem' };
  }
  async function homeWidget(kind) {
    const kept = widgetReadings.get(kind);
    // madre.run's count moves once a day: the author's reading is kept ten minutes, the Mac's thirty seconds.
    if (kept && Date.now() - kept.at < (kind === 'usage' ? 600000 : 30000)) return kept.reading;
    let reading;
    if (kind === 'system') {
      const total = totalmem();
      const free = await memoryAvailable();
      reading = { available: true, cpu: { busy: await cpuBusy(), cores: cpus().length, load: loadavg().map((one) => Math.round(one * 100) / 100) }, memory: { total, free: Math.min(total, free.bytes), source: free.source } };
    } else if (kind === 'servers') {
      const rooms = await openProjects();
      const projects = await Promise.all(rooms.map(async (one) => {
        const answer = await askRoom(one.open.port, '/api/ports', { timeoutMs: 4000 });
        if (answer.unreachable && answer.status === 412) return { id: one.id, name: one.name, preview: false, ports: [] };
        if (answer.unreachable || answer.outdated) return { id: one.id, name: one.name, unreachable: true, ports: [] };
        return { id: one.id, name: one.name, preview: true, ports: (answer.ports ?? []).map((port) => ({ port: port.port, status: port.status ?? null, command: port.command ?? null })) };
      }));
      reading = { available: projects.some((one) => one.preview), projects };
    } else if (kind === 'memory' || kind === 'models') {
      const rooms = await openProjects();
      const projects = await Promise.all(rooms.map(async (one) => ({ id: one.id, name: one.name, ...(readinessOf(await askRoom(one.open.port, '/api/dataset', { timeoutMs: 6000 })) ?? { unreachable: true }) })));
      reading = kind === 'memory'
        ? { available: projects.some((one) => !one.unreachable), projects }
        : { available: true, ollama: { running: Boolean(ollama.running), models: (ollama.models ?? []).map((model) => model.name).filter(Boolean) }, projects: await withLocalAi(projects) };
    } else if (kind === 'usage') {
      // The author's own reading of how many copies are on (src/heartbeat.mjs, madre.run's
      // /api/usage). It exists only in a copy run from source that holds the author's token
      // (scripts/owner-usage.mjs); anywhere else there is no such widget.
      const token = FROM_SOURCE ? await readSecret(root, OWNER_VAULT, 'usage') : null;
      if (!token) return null;
      const answer = await reportFetch(process.env.PULSE_USAGE_URL ?? 'https://madre.run/api/usage', { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }).catch(() => null);
      const body = answer?.ok ? await answer.json().catch(() => null) : null;
      reading = body?.ok ? { available: true, ...body } : { available: false, status: answer?.status ?? 0 };
    } else if (kind === 'coordinator' && !salasRoom) {
      // Home's page is served by every project too: the Coordinator's record is its own room's.
      const coordinator = (await knownRooms(root)).find((one) => one.id === salasRoomId(root));
      const answer = coordinator?.open ? await askRoom(coordinator.open.port, '/api/salas/widget?kind=coordinator', { timeoutMs: 6000 }) : null;
      reading = answer && !answer.unreachable && !answer.outdated ? answer : { available: false };
    } else if (kind === 'coordinator') {
      const notes = memory ? memory.memories({ limit: 5000 }) : [];
      const ready = datasetReadiness(await store.readAll(), notes);
      const research = room.memoryResearch();
      reading = { available: true, ...readinessOf({ readiness: ready, trained: ollama.madreModel ?? null, maturity: maturity({ readiness: ready, notes, links: research?.links ?? [], stats: research?.stats ?? null }) }), notes: notes.length };
    } else return null;
    widgetReadings.set(kind, { at: Date.now(), reading });
    return reading;
  }
  async function lobbyGlance(one) {
    if (!one.open) { lobbyGlances.delete(one.id); return null; }
    const reading = await askRoom(one.open.port, '/api/glance?census=1', { timeoutMs: 1200 });
    if (!reading.unreachable && !reading.outdated) {
      lobbyGlances.set(one.id, { port: one.open.port, reading, at: Date.now() });
      return reading;
    }
    const last = lobbyGlances.get(one.id);
    if (reading.unreachable && last?.port === one.open.port && Date.now() - last.at < 30000) return { ...last.reading, delayed: true };
    return reading;
  }
  // Every conversation's room other than the open one (see the note above mountChat); declared
  // here because the local wiring below reaches all of them.
  const parked = new Map();   // chatId -> { room, store, off, feed }
  // The records of the project's other conversations: the open store of one held beside, or the
  // file of one closed (never made where none exists). And every event of the project, for what is
  // counted across all of them (the privacy exposure).
  async function otherLedgers() {
    const out = [];
    for (const chat of (await listChats(roomDir)).chats) {
      if (chat.id === chatId) continue;
      const held = parked.get(chat.id);
      if (held?.store) { out.push({ store: held.store, held }); continue; }
      const file = chatLedger(roomDir, chat.id);
      if (await stat(file).then((info) => info.isFile(), () => false)) out.push({ store: new EventStore(file), held: null });
    }
    return out;
  }
  async function projectEvents() {
    const all = await store.readAll();
    for (const { store: other } of await otherLedgers()) all.push(...await other.readAll().catch(() => []));
    return all;
  }
  const opening = new Map();  // chatId -> the promise of its room, while it is being built
  // What the human sets belongs to the project: it reaches the conversation on screen and every
  // one alive beside it. A timeout raised from a conversation in a window used to change only the
  // one on screen, and its retry ran with the old limit.
  const liveRooms = () => [room, ...[...parked.values()].map((held) => held.room)].filter(Boolean);
  // What the local brain lends every room of the project: the archivist that distills in Ollama
  // and @madre. Settled once per wiring and handed to each room as it opens, beside or switched
  // to. A room built with @madre and without the archivist's invoker distilled with the next
  // cheapest crew member: a provider, unannounced, on every conversation but the first.
  let localWiring = { archivist: null, madre: false };
  function wireLocal(target) {
    if (!target) return;
    target.setInvoker('ollama', localWiring.archivist);
    target.setInvoker(MADRE_ADAPTER, localWiring.madre ? madreInvoker({ memory, ollama: () => ({ ...ollama, chatModel: ollama.madreModel ?? ollama.chatModel }), fetchImpl: reportFetch }) : null);
  }
  const ollamaSettings = async () => ({ enabled: true, embeddings: true, archivist: true, agent: true, ...((await readConfig(root)).modules?.ollama ?? {}) });
  // Whether this project uses the local AI at all, as Home decides it (src/local-ai.mjs).
  const thisRoomId = projectRoomId(canonicalProjectRoot);
  // This project's word on a module's switch (module-scope.mjs). Home's room is not a project: it
  // reads, and writes, the switch for every project.
  const scopeRoom = salasRoom ? null : thisRoomId;
  const moduleOnHere = (config, key, fallback = false) => moduleOnIn(config?.modules?.[key] ?? {}, scopeRoom, fallback);
  const localAiHere = async () => localAiFor(await readConfig(root), thisRoomId, { home: salasRoom });
  // This project's own switch, outside «auto»; null when Home decides.
  async function setLocalAiHere(on) {
    if (salasRoom || !(await localAiHere()).editable) return null;
    await updateConfig(root, localAiPatch(await readConfig(root), { rooms: { [thisRoomId]: Boolean(on) } }));
    return wireOllama({ probe: false });
  }
  // What the TRAIN card needs: where the recipe ships, the room, the model name @madre will pick up, a base that fits this machine.
  // Every event of every conversation of this project, in order: the training export and its
  // readiness read the whole project, not only the conversation on screen.
  async function projectEvents() {
    const { chats: list } = await listChats(roomDir).catch(() => ({ chats: [] }));
    const ids = list.length ? list.map((chat) => chat.id) : ['main'];
    const all = [];
    for (const id of ids) {
      const raw = await readFile(chatLedger(roomDir, id), 'utf8').catch(() => '');
      for (const line of raw.split('\n')) {
        if (!line) continue;
        try { all.push(JSON.parse(line)); } catch { /* a torn line is skipped */ }
      }
    }
    return all.sort((x, y) => (x.sequence ?? 0) - (y.sequence ?? 0));
  }
  // The code workspace (1.0.3): an agent's last EDIT turn on a file, read from every conversation
  // of the project (only the lines about control turns are parsed), and the parts the human kept.
  async function lastAgentChange(path) {
    const { chats: list } = await listChats(roomDir).catch(() => ({ chats: [] }));
    const ids = list.length ? list.map((chat) => chat.id) : ['main'];
    let found = null;
    const undone = new Set();
    for (const id of ids) {
      const raw = await readFile(chatLedger(roomDir, id), 'utf8').catch(() => '');
      for (const line of raw.split('\n')) {
        if (!line.includes('"control.')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type === 'control.reverted') { undone.add(event.payload?.checkpointId); continue; }
        if (event.type !== 'control.changed') continue;
        const file = (event.payload?.files ?? []).find((one) => one.path === path);
        if (!file || file.status === 'D' || !event.payload.agent || event.payload.agent === 'you') continue;
        const at = Date.parse(event.timestamp) || 0;
        if (!found || at >= found.at) found = { at, agent: event.payload.agent, checkpointId: event.payload.checkpointId, afterTree: event.payload.afterTree ?? null, status: file.status, messageId: event.payload.responseMessageId ?? event.payload.messageId ?? null };
      }
    }
    return found && !undone.has(found.checkpointId) ? { ...found, at: new Date(found.at).toISOString() } : null;
  }
  const reviewedFile = join(roomDir, 'code-reviewed.json');
  let reviewedWrites = Promise.resolve();
  async function readReviewed() {
    try { const raw = JSON.parse(await readFile(reviewedFile, 'utf8')); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}; } catch { return {}; }
  }
  function keepReviewed(key, hunk) {
    const run = reviewedWrites.then(async () => {
      const all = await readReviewed();
      const list = [...new Set([...(Array.isArray(all[key]) ? all[key] : []), hunk])].slice(-200);
      delete all[key];
      all[key] = list;
      // The newest 300 files are enough: an older change was long since kept or taken back.
      const keys = Object.keys(all);
      for (const old of keys.slice(0, Math.max(0, keys.length - 300))) delete all[old];
      await writeFile(reviewedFile, `${JSON.stringify(all)}\n`);
      return list;
    });
    reviewedWrites = run.catch(() => null);
    return run;
  }
  // D-S15 · what every project that lets it has to teach the Coordinator, asked now. A project that
  // is asleep or does not answer is not lost: the copy Salas kept the last time it answered is used
  // and the manifest says so; one that never answered is listed as missing. Copies of projects that
  // no longer allow it are forgotten first.
  async function gatherLinked(datasetDir) {
    const salas = salasRoomId(root);
    const contracts = activeContracts(await readConfig(root), { salas });
    const sources = readsFrom(contracts, salas).filter(({ contract }) => contract.train);
    await pruneCorpora(datasetDir, new Set(sources.map(({ from }) => from)));
    if (!sources.length) return [];
    const rooms = await knownRooms(root);
    const key = await channelKey(root).catch(() => null);
    const out = [];
    for (const { contract, from } of sources) {
      const where = rooms.find((one) => one.id === from);
      const answer = where?.open && key
        ? await askCorpus({ port: where.open.port, contract, asking: salas, key, record: (type, event) => room.record(type, event), roomDir })
        : { unreachable: true };
      if (answer.notes) {
        const at = new Date().toISOString();
        // D-S16: with the state shared too, a dated photo of it goes with the notes.
        const shared = contract.state ? await askState({ port: where.open.port, contract, asking: salas, key }) : null;
        const corpus = { ...answer, ...(shared?.state ? { state: shared.state } : {}) };
        await keepCorpus(datasetDir, corpus);
        out.push({ ...corpus, source: 'live', at });
        continue;
      }
      const kept = await keptCorpus(datasetDir, from);
      out.push(kept && kept.contract === contract.id ? { ...kept, source: 'kept' } : { contract: contract.id, from, name: where?.name ?? from, notes: [], source: 'missing' });
    }
    return out;
  }
  // A link that stops allowing it (revoked, or the box cleared): the copy Salas kept goes now.
  async function forgetLinkedCorpus(contract) {
    const salas = salasRoomId(root);
    if (contract.rooms.a !== salas && contract.rooms.b !== salas) return;
    const other = contract.rooms.a === salas ? contract.rooms.b : contract.rooms.a;
    await forgetCorpus(join(root, 'rooms', salas, 'dataset'), other).catch(() => null);
  }
  // The base to train on comes from this computer's hardware (src/modules/local-models.mjs), not
  // from one rule for every machine: the page lists every size and what this one can do with it.
  async function trainingInfo() {
    const slug = basename(canonicalProjectRoot).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fit = await hardwareOnce();
    const base = fit.recommended.train ?? MODEL_TIERS[1];
    return { roomDir, recipeDir: fileURLToPath(new URL('../docs/training/', import.meta.url)), modelName: `madre-${slug}`, baseModel: base.base, memoryGb: fit.hardware?.memoryGb ?? Math.round(totalmem() / 1024 ** 3), fit };
  }
  async function wireOllama({ probe: doProbe = true } = {}) {
    if (doProbe) ollama = await ollamaProbe();
    // A model trained on this room (docs/training) is named madre-<project>: @madre uses it when it exists.
    const slug = basename(canonicalProjectRoot).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const trained = (ollama.models ?? []).map((model) => model.name).find((name) => name.startsWith(`madre-${slug}`)) ?? null;
    ollama = { ...ollama, madreModel: trained };
    const project = await localAiHere();
    // Off for this project reads exactly as the module switched off, and only here.
    const settings = { ...(await ollamaSettings()), enabled: project.on };
    const useEmbeddings = ollama.running && settings.enabled && settings.embeddings && ollama.embedModel;
    const useArchivist = ollama.running && settings.enabled && settings.archivist && ollama.chatModel;
    if (memory) {
      const key = process.env.PULSE_EMBED === '0' ? null : await imageKey().catch(() => null);
      const embedder = createEmbedder({ key, env: embedEnvFor(await memoryConfig()), ollama: useEmbeddings ? ollama : null, ollamaEmbedder });
      if (room) room.setEmbedder(embedder); else memory.attachEmbedder(embedder);
    }
    localWiring.archivist = useArchivist ? ollamaInvoker({ host: ollama.host, model: ollama.chatModel, fetchImpl: reportFetch }) : null;
    // @madre: the fifth agent, present whenever Ollama has a chat model and the human left it on.
    const fifth = madreAgent({ ...ollama, chatModel: ollama.madreModel ?? ollama.chatModel }, { enabled: settings.enabled && settings.agent !== false });
    const index = agents.findIndex((agent) => agent.id === MADRE_AGENT_ID);
    let changed = false;
    if (fifth.ready && index < 0) { agents.push(fifth); changed = true; }
    else if (fifth.ready && (agents[index].version !== fifth.version)) { Object.assign(agents[index], fifth); changed = true; }
    else if (!fifth.ready && index >= 0) { agents.splice(index, 1); changed = true; }
    localWiring.madre = fifth.ready;
    wireLocal(room);
    for (const held of parked.values()) wireLocal(held.room);
    if (room) {
      if (changed) await room.record('agents.updated', { agents: agents.map((agent) => ({ id: agent.id, label: agent.label, detected: agent.detected, ready: agent.ready, version: agent.version, local: Boolean(agent.local), route: agent.route ?? null })), removed: fifth.ready ? [] : [MADRE_AGENT_ID], reason: fifth.ready ? `@madre is in the project · ${fifth.version}` : '@madre left the project: Ollama has no chat model running' });
      // That a local model is running is not the same as it being of use on this project, and
      // the second thing is the one a person needs told. Said once per model, in the room, with
      // the one button that settles it — the crew line above fires only when the crew CHANGES,
      // and a room whose Ollama was already up when it opened would never have heard it.
      if (fifth.ready && memory && memory.metaGet('local.announced') !== fifth.version) {
        let checked = null;
        try { checked = JSON.parse(memory.metaGet('exams') ?? '{}').match ?? null; } catch { checked = null; }
        memory.metaSet('local.announced', fifth.version);
        await room.record('local.present', {
          model: fifth.version,
          checked: checked?.ran ? { passed: Boolean(checked.passed), matched: checked.matched ?? 0, n: checked.n ?? 0, at: checked.at ?? null } : null,
        });
      }
    }
    return { ...ollama, settings, project, embeddings: Boolean(useEmbeddings), archivist: Boolean(useArchivist), agent: fifth.ready };
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
  // What the human last set for memory: a conversation opened later distills with it, not with
  // what MADRE booted with.
  let memorySettings = await memoryConfig();
  // Which key unlocks #3 and #4, and for how long an accepted one holds. See src/override.mjs.
  let overrideConfig = overrideSettings((await readConfig(root)).override);
  // The passes the key gives (2026-10-12). The page asks for the key, the project checks it and
  // hands back a pass for that agent and that mode; a message at #3 or #4 goes only with one. Without
  // a remembered permission a pass opens one message; with one, any until it runs out. STOP ALL and
  // a restart take them all back. Wrong keys are counted: a program trying words is slowed down.
  const passes = new Map();          // token -> { agent, mode, until, once }
  const keyMisses = [];              // when the last wrong keys were typed
  const PASS_ONCE_MS = 30 * 60 * 1000;
  // `asked` is a window the human chose on an agent's request for this mode (2026-10-14): one of
  // the windows the project allows, never longer, and only for that agent and mode.
  function issuePass(agent, mode, asked = 0) {
    const minutes = asked > 0 && OVERRIDE_GRACE[mode]?.includes(asked) ? asked : overrideConfig.grace[mode] ?? 0;
    const token = randomBytes(24).toString('hex');
    const pass = { agent, mode, until: Date.now() + (minutes ? minutes * 60000 : PASS_ONCE_MS), once: !minutes };
    passes.set(token, pass);
    return { token, until: new Date(pass.until).toISOString(), once: pass.once };
  }
  function spendPass(token, agent, mode) {
    const pass = typeof token === 'string' ? passes.get(token) : null;
    if (!pass || pass.agent !== agent || pass.mode < mode) return false;
    if (pass.until < Date.now()) { passes.delete(token); return false; }
    if (pass.once) passes.delete(token);
    return true;
  }
  // The copilot (src/room/copilot.mjs): one window for the project, opened with the #3 key, up to
  // 24 hours. In memory only, like the passes: a restart and STOP ALL close it. Every conversation
  // of the project asks this one when it decides whether a message is a copilot's.
  let copilot = null;                 // { since, until, minutes, timer }
  const copilotNow = () => (copilot && copilot.until > Date.now() ? { since: copilot.since, until: copilot.until, minutes: copilot.minutes } : null);
  const copilotState = () => ({ active: Boolean(copilotNow()), ...(copilotNow() ?? {}), windows: COPILOT_WINDOWS });
  async function endCopilot(reason) {
    if (!copilot) return;
    clearTimeout(copilot.timer);
    copilot = null;
    await room.record('copilot.ended', { reason }).catch(() => null);
  }
  let listening = null;
  const listeningPort = () => listening?.address?.()?.port ?? Number(process.env.PULSE_PORT ?? 4317);
  // One CONTROL desk for the whole project, shared by every conversation alive at once: a single
  // holder of the working tree whichever chat asked, and an UNDO that works from any of them.
  const controlDesk = new ControlDesk({ projectRoot, guardRecord: join(roomDir, 'guard.json') });
  // The open conversation's record unless another is named: a conversation held open beside it
  // builds its room the same way, over its own record.
  const roomOptions = (own = {}) => ({
    store,
    agents,
    projectRoot,
    controlDesk,
    privacy,
    // Modules may hand tools to a turn; the room asks once per turn, the server knows the port.
    toolsForTurn: async (turn) => modulesToolsForTurn(await moduleContext(), { ...turn, port: listeningPort(), roomDir }),
    // What BISHOP reads for a turn is recorded in that turn's conversation, not the open one.
    bishopForTurn: salasRoom ? async (turn) => moduleById('bishop').promptForTurn({ ...(await moduleContext()), record: (type, payload) => ((turn.turn && liveRooms().find((one) => one.runningTurn?.(turn.turn))) || room).record(type, payload) }, turn) : null,
    // Fase 3e: notes a link with automatic recall brings to a turn. Never in the room of Salas
    // (BISHOP has its own); recorded in the conversation of the turn that read them.
    copilot: copilotNow,
    linkedForTurn: salasRoom ? null : async (turn) => recallForTurn(await moduleContext(), { ...turn, port: listeningPort(), roomDir,
      record: (type, payload) => ((turn.turn && liveRooms().find((one) => one.runningTurn?.(turn.turn))) || room).record(type, payload) }),
    softTokenBudget,
    contextMaxChars,
    recallShare: Number(process.env.PULSE_RECALL_SHARE ?? memorySettings.recallShare),
    cascade: process.env.PULSE_RECALL_CASCADE !== undefined ? process.env.PULSE_RECALL_CASCADE !== '0' : memorySettings.cascade !== false,
    distill: {
      every: Number(process.env.PULSE_DISTILL_EVERY ?? memorySettings.every),
      idleMs: Number(process.env.PULSE_DISTILL_IDLE_MS ?? memorySettings.idleMinutes * 60000),
      agent: process.env.PULSE_DISTILL_AGENT ?? (memorySettings.archivist && memorySettings.archivist !== 'auto' ? memorySettings.archivist : null),
      allowed: Array.isArray(memorySettings.archivists) && memorySettings.archivists.length ? memorySettings.archivists : null,
      ...(typeof memorySettings.enabled === 'boolean' ? { enabled: memorySettings.enabled } : {}),
    },
    memory,
    memoryServer,
    mother: motherOutcome ? mother : null,
    historicalEvents,
    invokers,
    agentTimeouts,
    maxMessageChars,
    // S-032: in the room of Salas nobody delegates. BISHOP speaks there, and what it sets in
    // motion goes through its own plans, never through a ```pulse plan of that room.
    delegation: salasRoom ? false : delegation,
    maxPlanSteps,
    ...own,
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
      override: publicOverride(overrideConfig),
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
    // The providers left out of the composer's chooser: ids only, the way OpenCode names them.
    if (patch.opencode && 'hidden' in patch.opencode) {
      if (!Array.isArray(patch.opencode.hidden) || patch.opencode.hidden.some((id) => typeof id !== 'string' || !/^[\w.-]{1,60}$/.test(id))) throw new Error(t('Hidden providers must be a list of provider names.'));
      config.opencode = { ...(config.opencode ?? {}), hidden: [...new Set(patch.opencode.hidden)] };
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
      if (typeof patch.room.delegation === 'boolean') { config.room.delegation = patch.room.delegation; live.delegation = salasRoom ? false : patch.room.delegation; }
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
      memorySettings = next;
      const distill = { every: next.every, idleMs: next.idleMinutes * 60000, agent: next.archivist === 'auto' ? null : next.archivist, allowed: next.archivists, recallShare: next.recallShare, cascade: next.cascade !== false, ...(typeof next.enabled === 'boolean' ? { enabled: next.enabled } : {}) };
      for (const each of liveRooms()) each.configureDistill(distill);
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
      for (const each of liveRooms()) each.setScopes(config.scopes);
    }
    if (patch.override && typeof patch.override === 'object') {
      overrideConfig = mergeOverride((await readConfig(root)).override, patch.override);
      config.override = overrideConfig;
    }
    if (patch.gemini) {
      config.gemini = { ...((await readConfig(root)).gemini ?? {}) };
      if (Number(patch.gemini.idleMs) > 0) { config.gemini.idleMs = Number(patch.gemini.idleMs); process.env.PULSE_GEMINI_IDLE_MS = String(Number(patch.gemini.idleMs)); }
      if (Number.isFinite(Number(patch.gemini.retries))) { config.gemini.retries = Number(patch.gemini.retries); process.env.PULSE_GEMINI_RETRIES = String(Number(patch.gemini.retries)); }
    }
    for (const each of liveRooms()) each.configure(live);
    await updateConfig(root, config);
    if (live.memory) await wireOllama({ probe: false });
    await room.record('room.settings', { changed: Object.keys(config), settings: effectiveSettings() });
    return effectiveSettings();
  }

  let loggingIn = null;
  // A sign-in in flight, as the room is allowed to see it: which door, the address to open, and
  // whether the CLI is waiting to be told the code that page gave back. Never the code itself.
  // A device sign-in's code is the opposite case: it is shown to be typed on the provider's page.
  let loginRun = null;
  const loginState = () => (loginRun ? { agent: loginRun.agent, method: loginRun.method, command: loginRun.command, url: loginRun.url, deviceCode: loginRun.deviceCode, asksForCode: loginRun.asksForCode, awaitingCode: loginRun.awaitingCode, startedAt: loginRun.startedAt } : null);

  async function loginAgent(id, { method = null } = {}) {
    const agent = agents.find((item) => item.id === id);
    if (!agent) return { status: 404, body: { error: `Unknown agent: ${id}.` } };
    if (!agent.detected) return { status: 412, body: { error: `${agent.label} is not installed on this computer.`, install: loginPlanFor(agent)?.install ?? [] } };
    const plan = loginRunners[id]?.(agent, { method }) ?? loginPlanFor(agent, { method });
    if (!plan) return { status: 404, body: { error: `No sign-in flow known for ${id}.` } };
    if (!plan.headless) return { status: 409, body: { error: `${agent.label} signs in from its own prompt. Run this in a terminal, then press RECHECK.`, command: plan.display, note: plan.note } };
    if (loggingIn) return { status: 409, body: { error: `A sign-in is already running (${loggingIn}).` } };
    // A CLI with no sign-in command of its own (Gemini) signs in on its first question: its settings
    // are set before, and the run is stopped as soon as the credentials are written. It runs in an
    // empty folder, so that question never sees the project.
    const flow = typeof plan.flow === 'object' ? plan.flow : plan.flow === 'gemini-google' ? geminiSignIn() : null;
    let cwd = canonicalProjectRoot;
    if (flow) {
      try {
        await flow.prepare();
        cwd = await mkdtemp(join(tmpdir(), 'madre-signin-'));
      } catch (error) {
        await flow.undo().catch(() => {});
        return { status: 500, body: { error: `The sign-in could not be prepared: ${error.message}` } };
      }
    }
    const env = { ...process.env, ...(plan.env ?? {}) };
    for (const name of [...(plan.dropEnv ?? []), ...(plan.ci === false ? ['CI'] : [])]) delete env[name];
    loggingIn = id;
    loginRun = { agent: id, method: plan.method ?? null, command: plan.display, url: null, deviceCode: null, asksForCode: Boolean(plan.asksForCode), awaitingCode: false, startedAt: Date.now(), child: null };
    await room.record('connection.login.started', { agent: id, command: plan.display, note: plan.note, method: plan.method ?? null });
    void (async () => {
      const lines = [];
      let consented = false;
      const answered = new Set();
      let finished = false;
      let refused = false;
      // Signed in is not yet working: Google lets a free personal account sign in to Gemini CLI and
      // refuses it at the first question (2026-10-17). So the run is let ask its one-word question,
      // in an empty folder, and the sign-in counts only if that answer is not a refusal. A run that
      // goes quiet is stopped after half a minute, and counts.
      const watch = flow ? setInterval(async () => {
        if (finished || !(await flow.signedIn())) return;
        finished = true;
        setTimeout(() => { if (loginRun?.agent === id) loginRun.child?.cancel?.(); }, flow.verifyMs ?? 30000).unref?.();
      }, 700) : null;
      const result = await runInstaller({
        command: plan.command,
        args: plan.args,
        projectRoot: cwd,
        env,
        ci: plan.ci !== false,
        // A person is in the middle of this: the browser, the account, the code. Five minutes was
        // the installer's clock, and it killed sign-ins that were only waiting on a human.
        timeoutMs: 900000,
        // A CLI that asks for a code needs a way to be answered, and its question never ends in a
        // newline, so the half-line is flushed rather than left sitting in the buffer.
        stdin: plan.asksForCode || plan.consent || plan.answers?.length ? 'pipe' : 'ignore',
        flushIdleMs: plan.asksForCode || plan.consent ? 600 : 0,
        quietNote: 'the sign-in is waiting on you: finish it in the page that opened',
        onChild: (handle) => { if (loginRun?.agent === id) loginRun.child = handle; },
        onLine: (raw) => {
          // A terminal UI (OpenCode's) hides and moves its cursor even with NO_COLOR: the room
          // shows what it says, not the escapes it draws with.
          const line = raw.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
          if (!line.trim()) return;
          lines.push(line);
          if (flow?.refused?.(line) && !refused) { refused = true; loginRun?.child?.cancel?.(); }
          const url = line.match(/https?:\/\/\S+/)?.[0] ?? null;
          const deviceCode = plan.deviceCode ? deviceCodeIn(line) : null;
          if (loginRun?.agent === id) {
            if (url) loginRun.url = url;
            if (deviceCode) loginRun.deviceCode = deviceCode;
            // A menu the CLI draws before its sign-in (OpenCode asks which GitHub): the button
            // pressed already chose, so the room answers it once, the way the plan says.
            for (const answer of plan.answers ?? []) if (!answered.has(answer) && line.includes(answer.prompt)) { answered.add(answer); loginRun.child?.write?.(answer.send); }
            if (plan.asksForCode && looksLikeCodePrompt(line)) loginRun.awaitingCode = true;
            // The person already said yes: that was the button they pressed.
            if (plan.consent && !consented && looksLikeConsentPrompt(line)) { consented = true; loginRun.child?.write?.('y\n'); }
          }
          void room.record('connection.login.output', { agent: id, line: line.slice(0, 500), url, ...(deviceCode ? { deviceCode } : {}) });
        },
      });
      if (watch) clearInterval(watch);
      const good = finished && !refused;
      if (flow) {
        // Not finished, or refused at its first question: everything goes back as it was.
        if (!good) await flow.undo().catch(() => {});
        await rm(cwd, { recursive: true, force: true }).catch(() => {});
      }
      await refreshSessions();
      // A run with no flow (Codex, Claude, OpenCode) ends on its own, and its exit says how it went.
      const code = flow ? (good ? 0 : (result.code || 1)) : result.code;
      const error = refused
        ? t('Google signed you in, but it refuses this account on Gemini CLI (free personal accounts are refused). Gemini was left as it was: paste a Gemini API key from Google AI Studio instead.')
        : finished ? null : result.error ?? null;
      await room.record('connection.login.finished', { agent: id, code, error, session: sessions[id] ?? null, tail: lines.slice(-6) });
      loggingIn = null;
      loginRun = null;
    })();
    return { status: 202, body: { accepted: true, command: plan.display, method: plan.method ?? null, asksForCode: Boolean(plan.asksForCode) } };
  }

  // The second half of a browser sign-in: the page hands back a code and the CLI is waiting for
  // it on its own input. The room types it in. The code is a credential for the minute it lives,
  // so it is taken from this computer only and never written to the ledger.
  async function answerLogin(id, code) {
    if (!loginRun || loginRun.agent !== id) return { status: 409, body: { error: 'No sign-in is waiting for a code.' } };
    if (!loginRun.child?.write) return { status: 409, body: { error: 'That sign-in cannot be answered from here.' } };
    const text = String(code ?? '').trim();
    if (!text) return { status: 400, body: { error: 'Paste the code the page gave you.' } };
    if (/\s/.test(text) || text.length > 400) return { status: 400, body: { error: 'That does not look like the code: check you copied all of it and nothing else.' } };
    loginRun.child.write(`${text}\n`);
    loginRun.awaitingCode = false;
    await room.record('connection.login.answered', { agent: id });
    return { status: 202, body: { accepted: true } };
  }

  async function cancelLogin(id) {
    if (!loginRun || loginRun.agent !== id) return { status: 409, body: { error: 'No sign-in is running for that agent.' } };
    loginRun.child?.cancel?.();
    await room.record('connection.login.cancelled', { agent: id });
    return { status: 202, body: { cancelled: true } };
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
      if (before.detected !== next.detected || before.ready !== next.ready || before.version !== next.version || before.path !== next.path || JSON.stringify(before.route ?? null) !== JSON.stringify(next.route ?? null)) {
        agents[index] = { ...before, ...next };
        changed = true;
      }
    }
    await refreshSessions();
    if (changed && announce) {
      await room.record('agents.updated', {
        agents: agents.map((agent) => ({ id: agent.id, label: agent.label, detected: agent.detected, ready: agent.ready, version: agent.version, local: Boolean(agent.local), route: agent.route ?? null })),
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
  applyModuleSwitches(room, startupConfig);
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
  // A feed is one record and the pages watching it: `clients` maps each SSE response to the last
  // sequence it already holds, `sent` is the last sequence broadcast and `offset` the byte offset
  // of the log already read. The open conversation has one; a conversation held open beside it
  // (the window split in two) has its own, so neither page hears the other's record.
  const feedOver = async (source, events) => ({ store: source, clients: new Map(), sent: events.at(-1)?.sequence ?? 0, offset: (await source.tail(0)).offset, inFlight: null, dirty: false });
  const mainFeed = await feedOver(store, historicalEvents);
  const clients = mainFeed.clients;
  // A client that stops draining is dropped instead of buffering without bound.
  const writeEvent = (client, event, feed = mainFeed) => {
    // Ghost events have no sequence: they are never in the log, so no `id:`
    // line, and a reconnecting client will not ask for them again.
    client.write(`${event.sequence ? `id: ${event.sequence}\n` : ''}data: ${JSON.stringify(event)}\n\n`);
    if (client.writableLength > sseMaxBufferedBytes) {
      feed.clients.delete(client);
      client.destroy();
      return false;
    }
    return true;
  };

  function pump(feed) {
    if (feed.inFlight) {
      feed.dirty = true;
      return feed.inFlight;
    }
    feed.inFlight = (async () => {
      try {
        do {
          feed.dirty = false;
          const { events, offset } = await feed.store.tail(feed.offset);
          feed.offset = offset;
          for (const event of events) {
            if (event.sequence <= feed.sent) continue;
            for (const [client, floor] of feed.clients) {
              if (event.sequence > floor) writeEvent(client, event, feed);
            }
            feed.sent = event.sequence;
          }
        } while (feed.dirty);
      } catch (error) {
        console.error(`MADRE broadcast error: ${error.message}`);
      } finally {
        feed.inFlight = null;
      }
    })();
    return feed.inFlight;
  }
  const broadcastPending = () => pump(mainFeed);
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
  // What waits for the human in a conversation (docs/MOBILE.md, MOV-004): a choice an agent offered
  // or a line it asked to run, since the human last spoke; a mode a plan asked for, until it is
  // decided. Kept as the room speaks, so the list of rooms on a phone never reads a ledger to know.
  // What was left unanswered half a day ago is not waiting for anybody any more.
  const asksByRoom = new WeakMap();
  const ASK_FRESH_MS = 12 * 60 * 60 * 1000;
  function trackAsks(target, history = []) {
    const asks = new Map();
    const feed = (event) => {
      const said = event?.payload ?? {};
      // The human answering clears what waited; a message BISHOP's channel brought is not the human.
      if (event?.type === 'message.created' && said.role === 'user' && said.via !== 'bishop') { for (const key of [...asks.keys()]) asks.delete(key); }
      else if (event?.type === 'choice.offered') asks.set(`choice:${said.responseMessageId}`, { kind: 'choice', agent: said.agent, text: said.question ?? null, at: event.timestamp });
      else if (event?.type === 'run.requested') {
        for (const [index, command] of (said.commands ?? []).entries()) {
          if (command.argv) asks.set(`run:${said.responseMessageId}:${index}`, { kind: 'run', agent: said.agent, text: command.line, at: event.timestamp });
        }
      }
      else if (event?.type === 'run.started') asks.delete(`run:${said.responseMessageId}:${said.index}`);
      // BISHOP (fase 4c): a #3/#4 proposal waits for the human's key in this room; in Salas, a
      // plan with something to press waits until it closes.
      else if (event?.type === 'bishop.order.proposed') asks.set(`bishop:${said.plan}:${said.step}`, { kind: 'bishop', agent: said.agent, mode: said.mode, text: said.text ?? null, at: event.timestamp });
      else if (event?.type === 'bishop.plan.proposed' && [...(said.orders ?? []), ...(said.links ?? [])].some((item) => item.status === 'ready')) asks.set(`plan:${said.plan}`, { kind: 'plan', agent: 'bishop', text: said.reason ?? null, at: event.timestamp });
      else if (event?.type === 'bishop.plan.closed') asks.delete(`plan:${said.plan}`);
    };
    for (const event of history) feed(event);
    asksByRoom.set(target, asks);
    return target.subscribe(feed);
  }
  function asksOf(target, now = Date.now()) {
    const modes = (target.pendingModes?.() ?? []).map((asked) => ({ kind: 'mode', agent: asked.agent, mode: asked.mode, text: null }));
    const kept = [...(asksByRoom.get(target)?.values() ?? [])].filter((ask) => now - Date.parse(ask.at ?? 0) < ASK_FRESH_MS).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return [...modes, ...kept];
  }
  let unsubscribeAsks = () => {};
  // What a conversation's name and preview show of a message. One BISHOP's channel brought starts
  // with the header its agent reads; the person sees the task, as the page shows it.
  const saidText = (payload) => (payload?.via === 'bishop' ? String(payload.text ?? '').replace(/^BISHOP › [^\n]*\n+/, '') : payload?.text);
  // What a module hears of the ledger (`onEvent`, docs/SDK.md; S-027 in docs/MACROVERSO.md): each
  // event of each conversation alive in this room, once, with that conversation's room and id.
  // A module hears only while it is on, gets the same context as everywhere else, and can only
  // record what `record()` already allows (never a message, never a turn). What it does with an
  // event is its own business and never holds up the room: a failure is logged and dropped.
  function wireModules(target, id) {
    return target.subscribe((event) => {
      const listening = MODULES.filter((module) => typeof module.onEvent === 'function');
      if (!listening.length) return;
      void (async () => {
        const ctx = await moduleContext();
        for (const module of listening) {
          const settings = module.settingsFrom(ctx.config);
          if (module.kind === 'builtin' && !settings.enabled) continue;
          await Promise.resolve(module.onEvent({ ...ctx, settings, room: target, chat: id, record: (type, payload) => target.record(type, payload) }, event))
            .catch((error) => console.error(`MADRE module ${module.id}: onEvent failed: ${error.message}`));
        }
      })().catch((error) => console.error(`MADRE: a module could not hear an event: ${error.message}`));
    });
  }
  let unsubscribeModules = () => {};
  function wireRoom() {
    unsubscribe = room.subscribe(() => { void broadcastPending(); });
    unsubscribeModules = wireModules(room, chatId);
    unsubscribeAsks = trackAsks(room, historicalEvents);
    unsubscribeSentinel = room.subscribe((event) => { void sentinel.observe(event).catch(() => null); });
    unsubscribeEyecat = room.subscribe((event) => { void eyecat.observe(event).catch(() => null); });
    unsubscribeGhost = room.subscribeGhost((event) => { for (const client of clients.keys()) writeEvent(client, event); });
    unsubscribeLive = room.subscribeLive((event) => { for (const client of clients.keys()) writeEvent(client, event); });
    // What the list of conversations shows, kept as it happens. A conversation with no name of
    // its own takes the first thing the human said in it.
    unsubscribeChats = room.subscribe((event) => {
      if (event?.type !== 'message.created' || event.ghost) return;
      // A message MADRE wrote for the human (results going back) neither names nor previews it.
      const human = event.payload?.role === 'user';
      chatWrites = chatWrites.then(() => touchChat(roomDir, chatId, { text: human && !event.payload?.auto ? saidText(event.payload) : null, counts: human })).catch(() => null);
    });
    unsubscribeActivity = watchActivity(room, chatId);
    sentinel.seed(historicalEvents);
    eyecat.seed(historicalEvents);
    room.restoreAttachments(historicalEvents
      .filter((event) => event.type === 'attachment.stored')
      .map((event) => ({ ...event.payload, path: join(attachmentsRoot, event.payload.fileName), dir: attachmentsRoot })));
  }
  function unwireRoom() {
    for (const off of [unsubscribe, unsubscribeSentinel, unsubscribeEyecat, unsubscribeGhost, unsubscribeLive, unsubscribeChats, unsubscribeActivity, unsubscribeAsks, unsubscribeModules]) { try { off(); } catch { /* already gone */ } }
    unsubscribe = unsubscribeSentinel = unsubscribeEyecat = unsubscribeGhost = unsubscribeLive = unsubscribeChats = unsubscribeActivity = unsubscribeModules = () => {};
  }

  // TURNS: how much the room may do at once. On by default. Several conversations may be at work
  // together (a turn that is taking its time no longer holds the human hostage) and each may run a
  // few turns, both within limits the human sets in MU/TH/UR. Off, the room is what it was: one
  // conversation drives the crew, and switching away from one that is working is refused.
  const turnsPolicy = async () => {
    const saved = (await readConfig(root)).turns ?? {};
    const clamp = (value, low, high, fallback) => (Number.isInteger(Number(value)) ? Math.min(high, Math.max(low, Number(value))) : fallback);
    // Three conversations by default: as many as fit on screen at once (the open one and two beside
    // it, MAX_BESIDE in app.js), so every one the human can see may be at work.
    return { enabled: saved.enabled !== false, chats: clamp(saved.chats, 1, 6, 3), turnsPerChat: clamp(saved.turnsPerChat, 1, 8, 3) };
  };
  // Conversations held open beside the one on screen. Two reasons to hold one: it is still at work
  // after the human moved to another (parked: it keeps writing its record, and the page only hears
  // that it is working and when a turn ends), or a page is watching it in the other half of the
  // window (it has a feed of its own and takes messages addressed to it). One room per record,
  // always: opening a held conversation takes the room that is already there. When nothing is
  // running in it and nobody is watching, it closes itself.
  const busyChats = () => [...parked.entries()].filter(([, held]) => held.room.busy()).map(([id]) => id);
  const sayToAll = (type, payload) => {
    const event = { id: `live-${randomUUID()}`, sequence: null, live: true, timestamp: new Date().toISOString(), type, payload };
    for (const client of clients.keys()) writeEvent(client, event);
  };
  // The servers sentinel: this project's servers, watched while a page is open and RIPLEY is on,
  // with what comes up and what goes down said live to every page and to no ledger.
  const serverSentinel = new ServerSentinel({
    projectRoot: canonicalProjectRoot,
    self: () => listening?.address?.()?.port ?? null,
    listen: async () => (await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeout: 4000, maxBuffer: 2 * 1024 * 1024 })).stdout,
    // lsof exits 1 when one of the processes is already gone, and still prints the others.
    cwdsOf: (pids) => execFileAsync('lsof', ['-a', '-p', pids.join(','), '-d', 'cwd', '-Fpn'], { timeout: 4000, maxBuffer: 1024 * 1024 })
      .then((result) => result.stdout, (error) => String(error.stdout ?? '')),
    probe: (port) => probePort(port, { fetchImpl: reportFetch }),
    isRoom: async (port) => {
      const answer = await reportFetch(`http://127.0.0.1:${port}/api/version`, { signal: AbortSignal.timeout(800) });
      const said = answer.ok ? await answer.json().catch(() => null) : null;
      return said?.name === PACKAGE.name;
    },
    emit: (type, payload) => sayToAll(type, payload),
    active: async () => clients.size > 0 && await ripleyOn(),
  });
  if (!testMode) serverSentinel.start();
  // «Still in use», once a day per copy (src/heartbeat.mjs): a little after start, then looked at
  // every few hours; the day it was already said, nothing goes.
  const sayAlive = () => { void heartbeat({ root, version: PACKAGE.version, fetchImpl: reportFetch }); };
  const aliveTimers = testMode ? [] : [setTimeout(sayAlive, 20_000), setInterval(sayAlive, 6 * 60 * 60 * 1000)];
  for (const timer of aliveTimers) timer.unref?.();
  const endClients = (feed) => { for (const client of [...feed.clients.keys()]) { feed.clients.delete(client); try { client.end(); } catch { /* already gone */ } } };
  async function closeHeld(id) {
    const held = parked.get(id);
    if (!held) return;
    parked.delete(id);
    held.off();
    await held.room.shutdown().catch(() => null);
    retireLedger(held.store);
  }
  // A held conversation with no turn running and nobody watching it has no reason to stay open.
  async function releaseIfIdle(id, target = null) {
    const held = parked.get(id);
    if (!held || (target && held.room !== target)) return;
    if (held.room.busy() || held.room.hasLiveRuns?.() || held.feed?.clients.size) return;
    await closeHeld(id);
  }
  // A conversation's turns starting and ending, said to every page whichever conversation it shows.
  // The settle after an end is read a moment later: the turn leaves the room after its last event.
  function watchActivity(target, id) {
    return target.subscribe((event) => {
      if (!['agent.started', 'agent.completed', 'message.failed'].includes(event?.type)) return;
      const started = event.type === 'agent.started';
      sayToAll('chat.activity', { chatId: id, working: true, ...(started ? {} : { finished: { agent: event.payload?.agent ?? event.payload?.target ?? null, ok: event.type === 'agent.completed' } }) });
      if (started) return;
      setTimeout(() => {
        if (target.busy()) return;
        sayToAll('chat.activity', { chatId: id, working: false });
        void releaseIfIdle(id, target);
      }, 400).unref?.();
    });
  }
  // What a held conversation keeps doing while it is not the one on screen: its list entry follows
  // what is said in it, and every page hears when a turn in it starts and ends.
  function hold(id, target, source) {
    const offTouch = target.subscribe((event) => {
      if (event?.type !== 'message.created' || event.ghost) return;
      const human = event.payload?.role === 'user';
      chatWrites = chatWrites.then(() => touchChat(roomDir, id, { text: human && !event.payload?.auto ? saidText(event.payload) : null, counts: human })).catch(() => null);
    });
    const offActivity = watchActivity(target, id);
    const offModules = wireModules(target, id);
    let offAsks = () => {};
    void source?.readAll?.().then((history) => { offAsks = trackAsks(target, history); }).catch(() => null);
    const entry = { room: target, store: source, feed: null, off: () => { offTouch(); offActivity(); offAsks(); offModules(); } };
    parked.set(id, entry);
    return entry;
  }
  // A page starts watching a held conversation: it gets its own feed, fed by its own room.
  async function watchHeld(entry) {
    if (entry.feed) return entry.feed;
    const feed = await feedOver(entry.store, await entry.store.readAll());
    if (entry.feed) return entry.feed;
    entry.feed = feed;
    const offs = [
      entry.room.subscribe(() => { void pump(feed); }),
      entry.room.subscribeGhost((event) => { for (const client of [...feed.clients.keys()]) writeEvent(client, event, feed); }),
      entry.room.subscribeLive((event) => { for (const client of [...feed.clients.keys()]) writeEvent(client, event, feed); }),
    ];
    const before = entry.off;
    entry.off = () => { before(); for (const off of offs) { try { off(); } catch { /* already gone */ } } endClients(feed); };
    return feed;
  }
  // The conversation a request is about. Without `?chat=`, or naming the one on screen, it is the
  // open conversation, exactly as before. Naming another opens it beside, without changing which
  // one is on screen: the same room a parked conversation already has, or a new one built the way
  // mountChat builds one.
  // The room on screen, for the places where a route names its own conversation `room`.
  const openRoom = () => room;
  async function scopeOf(url) {
    const asked = url.searchParams.get('chat');
    if (!asked || asked === chatId) return { id: chatId, room, store, feed: mainFeed, main: true };
    if (!isChatId(asked)) return { error: `No conversation "${asked}".` };
    let entry = parked.get(asked);
    if (!entry) {
      if (!opening.has(asked)) {
        opening.set(asked, (async () => {
          if (!(await listChats(roomDir)).chats.some((chat) => chat.id === asked)) return null;
          const source = await openLedger(asked);
          const events = await source.readAll();
          const opened = new Room(roomOptions({ store: source, historicalEvents: events }));
          // A conversation opened from disk runs nothing yet: a turn it shows as started was cut
          // by a room that died, and is closed as one (LOG-14 of the 1.0 review). Only the
          // conversation open at startup was reconciled, so the others «thought» forever.
          await opened.reconcile();
          wireLocal(opened);
          await applyRoomSettings(opened, room);
          opened.restoreAttachments(events
            .filter((event) => event.type === 'attachment.stored')
            .map((event) => ({ ...event.payload, path: join(attachmentsRoot, event.payload.fileName), dir: attachmentsRoot })));
          const made = hold(asked, opened, source);
          // Opened to be looked at; if no page comes to watch it, it closes again.
          setTimeout(() => { void releaseIfIdle(asked, opened); }, heldGraceMs).unref?.();
          return made;
        })().finally(() => opening.delete(asked)));
      }
      entry = await opening.get(asked);
      if (!entry) return { error: `No conversation "${asked}".` };
    }
    // It may have become the open one while it was being built.
    if (asked === chatId) return { id: chatId, room, store, feed: mainFeed, main: true };
    return { id: asked, room: entry.room, store: entry.store, entry, main: false };
  }
  let unsubscribeActivity = () => {};
  const chatsView = async () => {
    const list = await listChats(roomDir);
    const working = new Set([...busyChats(), ...(room?.busy() ? [chatId] : [])]);
    return { ...list, chats: list.chats.map((chat) => (working.has(chat.id) ? { ...chat, working: true } : chat)) };
  };
  // What the human set while the room was open belongs to the project, not to one conversation's
  // record: a room opened for another chat used to start with no MAX MODE, no Ash, no Choices and
  // the timeouts MADRE booted with.
  async function applyRoomSettings(next, previous) {
    const config = await readConfig(root);
    next.setScopes(config.scopes ?? {});
    applyModuleSwitches(next, config);
    if (previous) next.configure(previous.settings());
  }
  // The switches a room holds itself, as this project says them (module-scope.mjs). Read again
  // before every message, so a switch moved in Home reaches a project that is already open.
  function applyModuleSwitches(target, config) {
    setImageModule(settingsIn(config.modules?.imageStudio ?? {}, scopeRoom));
    target.setAsh(moduleOnHere(config, 'ash'));
    target.setChoices(moduleOnHere(config, 'choices'));
    target.setRuns(moduleOnHere(config, 'runs'));
  }

  // Opening another conversation. The project keeps its memory, its crew, its modules, its
  // privacy list and its numbering; what changes is the record being shown. With TURNS on, a
  // conversation still at work is parked, not stopped; with it off, a turn in flight is a reason to
  // refuse, as it always was.
  async function mountChat(id) {
    if (!isChatId(id)) return { error: `No conversation "${id}".` };
    const policy = await turnsPolicy();
    const leaving = room;
    const leavingBusy = Boolean(leaving?.busy());
    if (leavingBusy && !policy.enabled) return { error: t('A turn is running in this conversation. Let it finish, or STOP ALL, and try again.') };
    const opened = await openChatIndex(roomDir, id);
    if (!opened) return { error: `No conversation "${id}".` };
    // A room being built for it beside is the room it gets; never a second one over its record.
    await opening.get(id)?.catch(() => null);
    unwireRoom();
    await chatWrites.catch(() => null);
    // A conversation with a command still alive (a server it started) is parked too, never closed
    // under the process: its card is where that process is stopped.
    if (leaving && (leavingBusy || leaving.hasLiveRuns?.()) && chatId !== id) {
      // Still writing its record and touching the list; only the page stops watching it.
      hold(chatId, leaving, store);
    } else if (leaving) {
      await leaving.shutdown().catch(() => null);
      retireLedger(store);
    }
    chatId = id;
    const held = parked.get(id);
    if (held) {
      // Back to a conversation that kept working, or that was open beside: the same room, not a
      // second one over its record. A page watching it there comes back to it as the open one.
      parked.delete(id);
      held.off();
      room = held.room;
      store = held.store;
      historicalEvents = await store.readAll();
    } else {
      store = await openLedger(id);
      historicalEvents = await store.readAll();
      room = new Room(roomOptions());
      // Opened from disk: what it shows as started was cut by a room that died (LOG-14).
      if (await room.reconcile()) historicalEvents = await store.readAll();
      wireLocal(room);
      await applyRoomSettings(room, leaving);
    }
    wireRoom();
    // Whoever is watching the open conversation is watching the wrong record now: their stream
    // ends and they come back to the one that is open. A page watching another conversation
    // beside it has a feed of its own and is not touched.
    mainFeed.store = store;
    mainFeed.sent = historicalEvents.at(-1)?.sequence ?? 0;
    mainFeed.offset = (await store.tail(0)).offset;
    endClients(mainFeed);
    return { chat: opened };
  }
  wireRoom();
  const poller = setInterval(() => {
    void broadcastPending();
    for (const held of parked.values()) if (held.feed) void pump(held.feed);
  }, broadcastIntervalMs);
  poller.unref();

  let installing = null;
  // Intenciones' reading of every conversation, kept per ledger file until that file changes.
  const observedLedgers = new Map();
  // The context a module works in: the project, its settings, the room, and what this server offers.
  async function moduleContext() {
    const config = await readConfig(root);
    return {
      projectRoot: canonicalProjectRoot, stateRoot: root, config, env: process.env, agents, room,
      // Which project's word a module's switch reads and writes; none in Home (module-scope.mjs).
      roomId: scopeRoom,
      readConfig: () => readConfig(root),
      updateConfig: (patch) => updateConfig(root, patch),
      record: (type, payload) => room.record(type, payload),
      services: {
        // Into one named conversation of this room, opened beside if it is not alive; the open one
        // when the name is missing or no longer exists. The same `record()` and the same refusals.
        recordIn: async (id, type, payload) => {
          const here = typeof id === 'string' && id ? await scopeOf(new URL(`http://room/?chat=${encodeURIComponent(id)}`)) : { room };
          return (here.error ? room : here.room).record(type, payload);
        },
        imageKey,
        setImageModule,
        // Intenciones keeps its measurements beside the project's room, reads the open
        // conversation, and asks agents through the same bench EYECAT and the archivist draw on.
        intents: {
          roomDir,
          events: () => store.readAll(),
          bench: () => room.bench(),
          // The questions to calibrate with are the project's, not one conversation's: a new
          // conversation would otherwise have nothing to ask. Only what was said is read.
          projectEvents: async () => {
            const said = [];
            for (const chat of (await listChats(roomDir)).chats) {
              const text = await readFile(chatLedger(roomDir, chat.id), 'utf8').catch(() => '');
              for (const line of text.split('\n')) {
                if (!line.includes('"message.created"')) continue;
                try { const event = JSON.parse(line); if (event.type === 'message.created') said.push(event); } catch { /* a torn last line */ }
              }
            }
            return said;
          },
          // Every conversation's turns, cut down to what learning from real use reads: who was
          // asked what, at which effort, how it ended, what it cost and what the human said of it.
          // A ledger is parsed again only when it changed on disk.
          ledgers: async () => {
            const turns = [];
            for (const chat of (await listChats(roomDir)).chats) {
              const file = chatLedger(roomDir, chat.id);
              const seen = await stat(file).catch(() => null);
              if (!seen) continue;
              let kept = observedLedgers.get(file);
              if (!kept || kept.mtimeMs !== seen.mtimeMs || kept.size !== seen.size) {
                const text = await readFile(file, 'utf8').catch(() => '');
                const events = [];
                for (const line of text.split('\n')) {
                  if (!/"(message\.created|message\.failed|message\.rated|usage\.recorded|turn\.stopped)"/.test(line)) continue;
                  try { const one = observable(JSON.parse(line), chat.id); if (one) events.push(one); } catch { /* a torn last line */ }
                }
                kept = { mtimeMs: seen.mtimeMs, size: seen.size, events };
                observedLedgers.set(file, kept);
              }
              turns.push(...kept.events);
            }
            return turns;
          },
          // The effort Codex runs at when told none, from its own config: a turn sent without one
          // ran there. Claude never says, and its turns stay at «its default».
          defaults: async () => {
            const codex = agents.find((agent) => agent.id === 'codex');
            if (!codex) return {};
            const found = (await discoverModels({ agents: [codex], config: await readConfig(root) }))?.codex;
            if (!found) return {};
            const byModel = Object.fromEntries(Object.entries(found.effortsByModel ?? {}).filter(([, one]) => one?.default).map(([slug, one]) => [slug, one.default]));
            return { codex: { effort: found.effortDefault ?? null, byModel } };
          },
        },
        // What a card knows about being up to date. Reading is free: it answers from the day's
        // cache. The button on a card is what forces a look outside.
        moduleUpdate: (item, { force = false, cacheOnly = !force } = {}) => moduleUpdate(item, {
          stateRoot: root, madre: { name: PACKAGE.name, version: PACKAGE.version },
          fetchImpl: reportFetch, enabled: updatesEnabled(), force, cacheOnly,
        }),
        ollama: {
          state: () => ollama,
          project: () => localAiHere(),
          setProject: (on) => setLocalAiHere(on),
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
            if (!binary) return { ok: false, error: t('Ollama is not on this computer yet.') };
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
            return status.running ? { ok: true } : { ok: false, error: t('Ollama did not answer. Open the Ollama app, then press RECHECK.') };
          },
          // After an upgrade the binary is new and the server answering on the port is still the old
          // one, so the card kept reading the old version and the update looked like it did nothing.
          // An `ollama serve` this user started is stopped and started again from the new binary;
          // anything else (the app, a service of another user) is named, not touched.
          async restart() {
            const binary = await findOnPath('ollama');
            if (!binary) return { ok: false, error: t('Ollama is not on this computer yet.') };
            const run = (command, args) => new Promise((resolve) => execFile(command, args, { timeout: 5000 }, (error, stdout, stderr) => resolve(`${stdout ?? ''}${stderr ?? ''}`)));
            const { client } = ollamaVersions(await run(binary, ['--version']));
            const status = await wireOllama();
            if (!status.running) return this.start();
            if (!client || !status.version || status.version === client) return { ok: true, already: true };
            const pids = process.platform === 'win32' || typeof process.getuid !== 'function' ? [] : ownOllamaServers(await run('ps', ['-axo', 'pid=,uid=,args=']), process.getuid());
            if (!pids.length) return { ok: false, error: t('Ollama {client} is installed, but {running} is still the one answering. Quit Ollama (or restart its service) and open it again, then RECHECK.', { client, running: status.version }) };
            for (const pid of pids) { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
            let down = status;
            for (let attempt = 0; attempt < 20 && down.running; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              down = await wireOllama();
            }
            if (down.running) return { ok: false, error: t('The old Ollama ({running}) did not stop. Quit it by hand, then press START OLLAMA.', { running: status.version }) };
            return this.start();
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
    if (extension.toggle) {
      const toggled = await extension.toggle(await moduleContext(), payload);
      // The switch flips the open conversation; the ones alive beside it follow.
      for (const held of parked.values()) await applyRoomSettings(held.room, null);
      return toggled;
    }
    if (confirm !== true) return { status: 400, body: { error: t('Installing a module writes into the project; send { "confirm": true } to proceed.') } };
    if (installing) return { status: 409, body: { error: `Another install is running (${installing}).` } };
    const preflight = extension.preflight ? await extension.preflight(canonicalProjectRoot) : { ok: true, problems: [] };
    if (!preflight.ok && !installers[id]) {
      await room.record('extension.install.refused', { id, name: extension.name, problems: preflight.problems });
      return { status: 412, body: { error: preflight.problems.join(' '), problems: preflight.problems } };
    }
    const before = await extension.detect(canonicalProjectRoot);
    const plan = installers[id]?.({ projectRoot: canonicalProjectRoot, agents }) ?? extension.installCommand({ agents });
    // What the module asked MADRE to do first (Continuity: `git init` in a project with no git),
    // shown in the same confirmation and run before the install, each step stopping the next.
    const prepare = Array.isArray(preflight.prepare) ? preflight.prepare : [];
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
      const onLine = (line) => {
        lines.push(line);
        pending.push(line.slice(0, 500));
        if (pending.length >= 20) void flush();
        else if (!flushTimer) flushTimer = setTimeout(() => { void flush(); }, 400);
      };
      let result = { code: 0 };
      for (const step of prepare) {
        onLine(`$ ${step.display}`);
        result = await runInstaller({ command: step.command, args: step.args, projectRoot: canonicalProjectRoot, onLine });
        if (result.code !== 0) break;
      }
      if (result.code === 0) result = await runInstaller({ command: plan.command, args: plan.args, projectRoot: canonicalProjectRoot, onLine });
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
    const foreign = refuseForeign(request);
    if (foreign) return sendJson(response, 403, { error: t(foreign), guarded: true });
    const url = new URL(request.url, 'http://127.0.0.1');
    // The project's own folder name, typed by the human. Declared at the top of the handler and
    // not beside the first route that happened to need it: a const sits in its temporal dead zone
    // until its own line runs, so any route above it threw instead of refusing.
    const designationOk = (given) => typeof given === 'string' && given.trim().toLowerCase() === basename(canonicalProjectRoot).toLowerCase();
    // A request the bridge passed on from a paired phone. It reaches the room from 127.0.0.1 like
    // anything on this Mac, so «only from this computer» has to ask this too.
    const viaPhone = typeof request.headers['x-madre-device'] === 'string';
    const phoneKind = viaPhone ? String(request.headers['x-madre-device-kind'] ?? 'other').slice(0, 20) : null;
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        const html = await readFile(join(publicDirectory, 'index.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...PAGE_GUARDS });
        return response.end(html);
      }
      if (request.method === 'GET' && ['/app.js', '/nostromo-engine.js', '/brands.js', '/troubleshooting.js', '/inquiry.js', '/i18n.js', '/es.js', '/resay.js', '/syntax.js', '/editor.js', '/routing.js', '/abduction.js', '/review-ask.js', '/loader.js', '/tour.js', '/tour-chapters.js', '/touch.js', '/attribution.js', '/power.js', '/wallpaper.js', '/neural.js', '/hardware.js', '/code-tools.js', '/market.js', '/market-view.js', '/market-art.js'].includes(url.pathname)) {
        return sendAsset(request, response, join(publicDirectory, url.pathname.slice(1)), 'text/javascript; charset=utf-8');
      }
      if (request.method === 'GET' && url.pathname === '/styles.css') {
        return sendAsset(request, response, join(publicDirectory, 'styles.css'), 'text/css; charset=utf-8');
      }
      const abductionAssets = new Map([
        ['/assets/abduction-cat.png', 'abduction-cat.png'],
        ['/assets/abduction-cat-blink.png', 'abduction-cat-blink.png'],
        ['/assets/abduction-cat-control-left.png', 'abduction-cat-control-left.png'],
        ['/assets/abduction-cat-control-right.png', 'abduction-cat-control-right.png'],
      ]);
      // The brand: its typefaces (SIL OFL, licences beside them) and the favicon, served from the
      // package itself. Nothing is fetched from a font service: the room never leaves this machine
      // to draw a letter.
      const brandAssets = new Map([
        ['/assets/brand/Sora-latin.woff2', 'font/woff2'],
        ['/assets/brand/Sora-latin-ext.woff2', 'font/woff2'],
        ['/assets/brand/JetBrainsMono-latin.woff2', 'font/woff2'],
        ['/assets/brand/JetBrainsMono-latin-ext.woff2', 'font/woff2'],
        ['/assets/brand/Geist-latin.woff2', 'font/woff2'],
        ['/assets/brand/Geist-latin-ext.woff2', 'font/woff2'],
        ['/assets/brand/GeistMono-latin.woff2', 'font/woff2'],
        ['/assets/brand/GeistMono-latin-ext.woff2', 'font/woff2'],
        ['/assets/brand/OFL-Geist.txt', 'text/plain; charset=utf-8'],
        ['/assets/brand/OFL-GeistMono.txt', 'text/plain; charset=utf-8'],
        ['/assets/brand/OFL-Sora.txt', 'text/plain; charset=utf-8'],
        ['/assets/brand/OFL-JetBrainsMono.txt', 'text/plain; charset=utf-8'],
        ['/assets/brand/madre-favicon.svg', 'image/svg+xml'],
        // The conversation's wallpapers (Appearance): twelve pictures, encoded by hand from their
        // masters (cwebp), whose light and dark, layer or mesh and intensity are layers in the CSS.
        ['/assets/wallpapers/jarrito.webp', 'image/webp'],
        ['/assets/wallpapers/canela.webp', 'image/webp'],
        ['/assets/wallpapers/paraiso.webp', 'image/webp'],
        ['/assets/wallpapers/ventura.webp', 'image/webp'],
        ['/assets/wallpapers/magna.webp', 'image/webp'],
        ['/assets/wallpapers/biznaga.webp', 'image/webp'],
        ['/assets/wallpapers/oceano.webp', 'image/webp'],
        ['/assets/wallpapers/quila.webp', 'image/webp'],
        ['/assets/wallpapers/xico.webp', 'image/webp'],
        ['/assets/wallpapers/tropical.webp', 'image/webp'],
        ['/assets/wallpapers/tradicion.webp', 'image/webp'],
        ['/assets/wallpapers/urbania.webp', 'image/webp'],
        // The pictures of the «what's new» board, one per thing it tells (src/whats-new.mjs).
        ['/assets/news/1.0/settings.webp', 'image/webp'],
        ['/assets/news/1.0/mother.webp', 'image/webp'],
        ['/assets/news/1.0/intents.webp', 'image/webp'],
        ['/assets/news/1.0/permissions.webp', 'image/webp'],
        ['/assets/news/1.0/github.webp', 'image/webp'],
        ['/assets/news/1.0/bar.webp', 'image/webp'],
        ['/assets/news/1.0/modules.webp', 'image/webp'],
        ['/assets/news/1.0/nostromo.webp', 'image/webp'],
        ['/assets/news/1.0/room.webp', 'image/webp'],
        ['/assets/news/1.0/looks.webp', 'image/webp'],
        ['/assets/news/1.0/alerts.webp', 'image/webp'],
        ['/assets/news/1.0/finder.webp', 'image/webp'],
      ]);
      if (request.method === 'GET' && brandAssets.has(url.pathname)) {
        const file = await readFile(join(publicDirectory, url.pathname.slice(1)));
        response.writeHead(200, { 'content-type': brandAssets.get(url.pathname), 'content-length': file.length, 'cache-control': 'public, max-age=86400' });
        return response.end(file);
      }
      if (request.method === 'GET' && abductionAssets.has(url.pathname)) {
        const image = await readFile(join(publicDirectory, 'assets', abductionAssets.get(url.pathname)));
        response.writeHead(200, {
          'content-type': 'image/png',
          'content-length': image.length,
          'cache-control': 'public, max-age=86400',
        });
        return response.end(image);
      }
      // ---------- The phone (docs/MOBILE.md) ----------
      // Pairing and the list of phones are the Mac's alone: nothing that came through the bridge
      // reaches them.
      if (url.pathname === '/api/phone' || url.pathname.startsWith('/api/phone/')) {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (!(await phonePreview())) {
          if (request.method === 'GET' && url.pathname === '/api/phone') return sendJson(response, 200, { preview: false });
          return sendJson(response, 404, { error: t('Not found.') });
        }
        if (request.method === 'GET' && url.pathname === '/api/phone') return sendJson(response, 200, { preview: true, ...(await phoneView()) });
        const payload = request.method === 'POST' ? await body(request).catch(() => ({})) : {};
        if (request.method === 'POST' && url.pathname === '/api/phone/trust') {
          const here = await currentNetwork().catch(() => null);
          if (!here) return sendJson(response, 412, { error: t('MADRE cannot tell which network this computer is on.') });
          await trustNetwork(root, { id: here.id, name: typeof payload.name === 'string' ? payload.name : null });
          await phone.tick();
          return sendJson(response, 200, await phoneView());
        }
        if (request.method === 'POST' && url.pathname === '/api/phone/invite') {
          const here = await currentNetwork().catch(() => null);
          const store = await readStore(root);
          if (!here || !store.networks.some((one) => one.id === here.id)) return sendJson(response, 412, { error: t('Mark this network as trusted first.'), trust: true });
          const address = lanAddresses({ device: here.device })[0];
          if (!address) return sendJson(response, 412, { error: t('This Mac has no address on the local network.') });
          if (!store.enabled) await setEnabled(root, true);
          const invite = await createInvite(root);
          await phone.tick();
          // Whichever room hosts it, the bridge has to answer before the code is shown.
          for (let wait = 0; wait < 10 && !(await bridgeAnswers()); wait += 1) await new Promise((done) => setTimeout(done, 200));
          if (!(await bridgeAnswers())) return sendJson(response, 503, { error: t('MADRE on your phone did not open on port {port}. Another program may be using it.', { port: BRIDGE_PORT }) });
          const link = `http://${address}:${BRIDGE_PORT}/bridge/pair?c=${invite.code}`;
          return sendJson(response, 200, { invite: { id: invite.id, expiresAt: invite.expiresAt }, url: link, qr: qrSvg(link, { label: t('Code to pair your phone') }), ...(await phoneView()) });
        }
        if (request.method === 'POST' && url.pathname === '/api/phone/forget') {
          await forgetDevice(root, String(payload.id ?? ''));
          await phone.tick();
          return sendJson(response, 200, await phoneView());
        }
        if (request.method === 'POST' && url.pathname === '/api/phone/networks/forget') {
          await forgetNetwork(root, String(payload.id ?? ''));
          await phone.tick();
          return sendJson(response, 200, await phoneView());
        }
        if (request.method === 'POST' && url.pathname === '/api/phone/enabled') {
          await setEnabled(root, payload.on !== false);
          await phone.tick();
          return sendJson(response, 200, await phoneView());
        }
        return sendJson(response, 404, { error: t('Not found.') });
      }
      // The room in one line, for the list of rooms on the phone.
      if (request.method === 'GET' && url.pathname === '/api/glance') {
        const { chats } = await listChats(roomDir);
        const latest = chats[0] ?? null;
        const working = new Set(room.activeTurns().map((turn) => turn.agent));
        for (const held of parked.values()) for (const turn of held.room.activeTurns()) working.add(turn.agent);
        // What waits for the human, and in which conversation, so the phone opens straight to it.
        const titleOf = (id) => chats.find((one) => one.id === id)?.title ?? null;
        const waiting = [
          ...asksOf(room).map((ask) => ({ ...ask, chat: chatId, chatTitle: titleOf(chatId) })),
          ...[...parked.entries()].flatMap(([id, held]) => asksOf(held.room).map((ask) => ({ ...ask, chat: id, chatTitle: titleOf(id) }))),
        ];
        return sendJson(response, 200, {
          project: basename(canonicalProjectRoot),
          version: PACKAGE.version ?? null,
          chats: chats.length,
          chat: latest ? { id: latest.id, title: latest.title, named: latest.named, preview: latest.preview, at: latest.updatedAt, messages: latest.messages } : null,
          working: [...working],
          waiting: waiting.sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? ''))).slice(0, 5).map(({ kind, agent, mode, text, chat, chatTitle }) => ({ kind, agent, mode: mode ?? undefined, text: typeof text === 'string' ? text.slice(0, 140) : null, chat, chatTitle })),
          waitingCount: waiting.length,
          // What the archive holds, counted, when Salas asks (?census=1): never the words, only how
          // many of each kind and how many travel into turns.
          ...(url.searchParams.get('census') === '1' ? { census: memoryCensus() } : {}),
        });
      }
      // ---- Salas on the Mac (src/salas.mjs, docs/MACROVERSO.md). The page speaks only to this
      // room; this room speaks to the others from here, the way the phone's bridge does. Opening,
      // closing and stopping rooms is the Mac's: a phone never reaches these.
      if ((url.pathname === '/salas' || url.pathname.startsWith('/api/salas') || url.pathname === '/api/room/close') && viaPhone) {
        return sendJson(response, 403, { error: t('This is done on the Mac.') });
      }
      if (request.method === 'GET' && url.pathname === '/salas') {
        const html = await readFile(join(publicDirectory, 'salas-mac.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...PAGE_GUARDS });
        return response.end(html);
      }
      if (request.method === 'GET' && (url.pathname === '/salas-mac.js' || url.pathname === '/salas-mac.css' || url.pathname === '/macroverso.js')) {
        return sendAsset(request, response, join(publicDirectory, url.pathname.slice(1)), url.pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8');
      }
      // A widget of Home, read here (homeWidget above): only from this Mac's own pages.
      if (request.method === 'GET' && url.pathname === '/api/salas/widget') {
        const reading = await homeWidget(String(url.searchParams.get('kind') ?? ''));
        if (!reading) return sendJson(response, 404, { error: t('Home has no widget by that name.') });
        return sendJson(response, 200, reading);
      }
      // Which projects use the local AI (src/local-ai.mjs): the mode and each project's switch,
      // written once in config.json and applied at once in every open project.
      if (url.pathname === '/api/salas/local-ai' && (request.method === 'GET' || request.method === 'POST')) {
        if (request.method === 'POST') {
          const patch = await body(request);
          const before = await readConfig(root);
          const rooms = patch?.rooms && typeof patch.rooms === 'object' ? { ...patch.rooms } : {};
          // A new mode changes what NEW projects get; the ones already here keep what they had.
          if (patch?.mode && patch.mode !== localAiConfig(before).mode) {
            const salasId = salasRoomId(root);
            const ids = (await knownRooms(root)).map((one) => one.id);
            if (!salasRoom) ids.push(thisRoomId);
            for (const id of ids) if (id !== salasId && !(id in rooms)) rooms[id] = localAiFor(before, id).chosen;
          }
          await updateConfig(root, localAiPatch(before, { mode: patch?.mode, rooms }));
          await wireOllama({ probe: false });
          widgetReadings.delete('models');
        }
        const config = await readConfig(root);
        const salas = salasRoomId(root);
        const known = (await knownRooms(root)).filter((one) => one.id !== salas);
        // The project serving this page is one of them even before Home has listed it.
        if (!salasRoom && !known.some((one) => one.id === thisRoomId)) known.push({ id: thisRoomId, name: basename(canonicalProjectRoot), open: { port: null } });
        const later = [];
        if (request.method === 'POST') {
          await Promise.all(known.filter((one) => one.open && one.id !== thisRoomId).map(async (one) => {
            const answer = await askRoom(one.open.port, '/api/local-ai/apply', { method: 'POST', timeoutMs: 6000 });
            if (answer.unreachable || answer.outdated) later.push(one.name);
          }));
        }
        const projects = known.map((one) => ({ id: one.id, name: one.name, open: Boolean(one.open), ...localAiFor(config, one.id) }));
        return sendJson(response, 200, { ...localAiConfig(config), master: localAiFor(config).master, ollama: { running: Boolean(ollama.running), models: (ollama.models ?? []).length }, projects, later });
      }
      if (request.method === 'GET' && url.pathname === '/api/salas') {
        const rooms = await knownRooms(root);
        const here = basename(roomDir);
        const own = await roomLooks(root);
        // A project that never chose its own wears the wallpaper every page shared before.
        const before = (await readLooks(root)).looks['pulse.wallpaper'] ?? null;
        const seen = await Promise.all(rooms.map(async (one) => ({
          ...one,
          here: one.id === here,
          glance: await lobbyGlance(one),
          wallpaper: own[one.id]?.wallpaper ?? before,
        })));
        // The links in force (docs/MACROVERSO.md, fase 3c), each with what crossed: counted from the
        // lines the serving room keeps beside its record, never from a ledger. `salas` is the id of
        // the room of Salas, whether or not that room exists yet (phase 3d).
        const salas = salasRoomId(root);
        const enlaces = await Promise.all(activeContracts(await readConfig(root), { salas }).map(async (contract) => ({ ...contract, traffic: await linkTraffic(servingRooms(contract).map((id) => join(root, 'rooms', id)), contract) })));
        return sendJson(response, 200, { mac: hostname().replace(/\.local$/i, ''), language: roomLanguage(), languageChosen, here, version: PACKAGE.version ?? null, rooms: seen, handoff: (await readHandoff(root)).mac ?? null, salas, enlaces, phonePreview: await phonePreview() });
      }
      // The open rooms, each in one line (its glance: who works, who waits, its last conversation;
      // never its census or the links), for the room's switcher (2026-10-10), asked every few
      // seconds while a room's page is in view. Read only by this Mac's own pages, as the work is.
      if (request.method === 'GET' && url.pathname === '/api/salas/open') {
        const host = String(request.headers.host ?? '');
        const site = request.headers['sec-fetch-site'];
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) || (site !== undefined && site !== 'same-origin' && site !== 'none')) return sendJson(response, 403, { error: t('This is done from Home, on this Mac.') });
        const here = basename(roomDir);
        const rooms = (await knownRooms(root)).filter((one) => one.open);
        const seen = await Promise.all(rooms.map(async (one) => ({
          id: one.id,
          name: one.name,
          port: one.open.port,
          here: one.id === here,
          glance: one.id === here ? null : await askRoom(one.open.port, '/api/glance'),
        })));
        return sendJson(response, 200, { here, salas: salasRoomId(root), rooms: seen });
      }
      // One room as the Macroverso draws it: its memories and the veins between them, read from
      // that room the way its own NOSTROMO reads them (`/api/memory`, with its designation). Without
      // `full` no words cross: a far universe is drawn from kinds, zones and sizes alone; the chosen
      // one asks for them. A phone never reaches this (above).
      if (request.method === 'GET' && url.pathname === '/api/salas/universe') {
        const id = url.searchParams.get('id') ?? '';
        const room = (await knownRooms(root)).find((one) => one.id === id);
        if (!room) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        if (!room.open) return sendJson(response, 200, { id, asleep: true });
        const answer = await askRoom(room.open.port, `/api/memory?designation=${encodeURIComponent(room.name)}`, { timeoutMs: 4000 });
        if (answer.outdated) return sendJson(response, 200, { id, outdated: true });
        if (answer.unreachable) return sendJson(response, 200, { id, sealed: answer.status === 423, unreachable: answer.status !== 423 });
        return sendJson(response, 200, { id, ...universeOf(answer, { full: url.searchParams.get('full') === '1' }) });
      }
      if (request.method === 'POST' && url.pathname === '/api/salas/start') {
        const payload = await body(request).catch(() => ({}));
        let room = (await knownRooms(root)).find((one) => one.id === payload.room);
        // BISHOP's own room is MADRE's: talking to it from the lobby wakes it even the first time,
        // before it was ever opened (its folder is made then, empty, as `madre lobby` makes it).
        if (!room && payload.room === salasRoomId(root)) {
          const folder = await ensureSalasProject(root);
          room = { id: payload.room, root: folder, open: null };
        }
        if (!room) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        if (room.open) return sendJson(response, 200, { room: room.id, port: room.open.port, already: true });
        if (!room.root) return sendJson(response, 404, { error: t('The folder of that project is no longer on this Mac.') });
        // Where start.log stood before this try: only what this one wrote is read if it fails.
        const logFrom = await stat(join(root, 'rooms', room.id, 'start.log')).then((info) => info.size, () => 0);
        startRoom({ projectRoot: room.root, roomDir: join(root, 'rooms', room.id) });
        const up = await roomComesUp(root, room.id);
        if (!up) {
          // The commonest reason, said as itself: another MADRE (another Home, `madre start`) already
          // has this folder open, and one folder is one room. Where it is, so the person can go there.
          const said = (await readFile(join(root, 'rooms', room.id, 'start.log'), 'utf8').catch(() => '')).slice(logFrom);
          const there = [...said.matchAll(/already open for this project\s+(http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)?.[1];
          if (there) return sendJson(response, 409, { error: t('This project is already open in another MADRE, at {address}. Use that one, or close it there first.', { address: there }), address: there });
          return sendJson(response, 504, { error: t('The project did not open. What it said on the way up is in start.log, beside its record.') });
        }
        return sendJson(response, 200, { room: up.id, port: up.open.port });
      }
      // ---- The lobby adds projects (2026-10-10, src/salas.mjs). Only this page, on this Mac: a
      // phone was refused above; another site is refused here, whether it tries to read the
      // folders (Sec-Fetch-Site) or to add one (Origin), and so is any host name but this Mac's
      // own, so a name pointed at it from outside reaches nothing. Folders are listed inside the
      // home folder only; what is listed is names, never what a file says.
      if (url.pathname === '/api/salas/folders' || url.pathname === '/api/salas/suggestions' || url.pathname === '/api/salas/projects' || url.pathname === '/api/salas/new' || url.pathname === '/api/salas/work' || url.pathname === '/api/salas/decisions') {
        const host = String(request.headers.host ?? '');
        const localHost = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);
        const site = request.headers['sec-fetch-site'];
        if (!localHost || (site !== undefined && site !== 'same-origin' && site !== 'none')) return sendJson(response, 403, { error: t('This is done from Home, on this Mac.') });
        if (request.method === 'POST' && request.headers.origin !== `http://${host}`) return sendJson(response, 403, { error: t('This is done from Home, on this Mac.') });
        const home = process.env.PULSE_LOBBY_HOME || homedir();
        if (request.method === 'GET' && url.pathname === '/api/salas/folders') {
          const listed = await listFolders({ path: url.searchParams.get('path') || null, home, stateRoot: root });
          if (listed.error === 'outside') return sendJson(response, 403, { error: t('Only folders inside your home folder.') });
          if (listed.error) return sendJson(response, 404, { error: t('That folder is not there.') });
          return sendJson(response, 200, listed);
        }
        if (request.method === 'GET' && url.pathname === '/api/salas/suggestions') {
          return sendJson(response, 200, { suggestions: await suggestProjects({ home, stateRoot: root }) });
        }
        // WHAT WAS WORKED ON LAST: the newest conversations of every room the lobby knows (read from
        // their folders, open or asleep), and MADRE's summary of them with its local model. The
        // summary is written in the background and kept until what it summarises changes; it is
        // written again at most every five minutes, or when the person asks (POST). Without a local
        // model the lobby shows the conversations as they are, and says why.
        if (url.pathname === '/api/salas/work' && (request.method === 'GET' || request.method === 'POST')) {
          const salas = salasRoomId(root);
          const rooms = (await knownRooms(root)).map((one) => ({ id: one.id, name: one.id === salas ? 'Coordinator' : one.name }));
          const items = await recentWork({ stateRoot: root, rooms, limit: 5 });
          const sources = items.map(({ room, name, chat, title, at, said }) => ({ room, name, chat, title, at, last: said?.at(-1) ?? null }));
          if (!items.length) return sendJson(response, 200, { state: 'empty', sources });
          if (!lobbyWork.loaded) {
            lobbyWork.loaded = true;
            const kept = await readFile(lobbyWork.file, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
            if (kept?.bullets?.length) Object.assign(lobbyWork, { key: kept.key, at: kept.at, tried: kept.at, bullets: kept.bullets, model: kept.model ?? null });
          }
          const settings = await ollamaSettings();
          const model = ollama.madreModel ?? ollama.chatModel;
          if (!ollama.running || !model || !settings.enabled || settings.agent === false) return sendJson(response, 200, { state: 'unavailable', sources, bullets: lobbyWork.bullets, at: lobbyWork.at || null, model: lobbyWork.model });
          const key = createHash('sha256').update(items.map((item) => `${item.room}:${item.chat}:${item.at}:${item.messages}`).join('|')).digest('hex').slice(0, 16);
          const asked = request.method === 'POST';
          const due = !lobbyWork.bullets || (lobbyWork.key !== key && Date.now() - lobbyWork.tried > 5 * 60 * 1000);
          if (!lobbyWork.running && (asked || due)) {
            lobbyWork.tried = Date.now();
            const language = roomLanguage() === 'en' ? 'en' : 'es';
            lobbyWork.running = ollamaGenerate({ host: ollama.host, model, system: WORK_SYSTEM[language], prompt: workPrompt(items, language), fetchImpl: reportFetch, timeoutMs: 120000, temperature: 0.1 })
              .then(async (answer) => {
                const bullets = parseWork(answer.text, items);
                if (!bullets.length) throw new Error('MADRE answered nothing the lobby could check against the conversations.');
                Object.assign(lobbyWork, { key, at: Date.now(), bullets, model, error: null });
                await writeFile(lobbyWork.file, JSON.stringify({ key, at: lobbyWork.at, bullets, model })).catch(() => {});
              })
              .catch((error) => { lobbyWork.error = String(error?.message ?? error).slice(0, 200); })
              .finally(() => { lobbyWork.running = null; });
          }
          const state = lobbyWork.running ? 'working' : lobbyWork.bullets ? 'ready' : 'failed';
          return sendJson(response, 200, { state, sources, bullets: lobbyWork.bullets, at: lobbyWork.at || null, model: lobbyWork.model ?? model, stale: Boolean(lobbyWork.bullets) && lobbyWork.key !== key, error: state === 'failed' ? lobbyWork.error : null });
        }
        // RECENT DECISIONS: what the open rooms decided last, as each room keeps it (only the notes
        // that travel into turns: hold and bridge; never med bay or jettisoned), newest first.
        // Asked of the rooms at most every five minutes; a room asleep, sealed or older says nothing.
        if (request.method === 'GET' && url.pathname === '/api/salas/decisions') {
          if (!lobbyDecisions.running && (!lobbyDecisions.list || Date.now() - lobbyDecisions.at > 5 * 60 * 1000)) {
            const salas = salasRoomId(root);
            lobbyDecisions.running = (async () => {
              const open = (await knownRooms(root)).filter((one) => one.open);
              const lists = await Promise.all(open.map(async (one) => {
                const answer = await askRoom(one.open.port, `/api/memory?designation=${encodeURIComponent(one.name)}`, { timeoutMs: 6000 });
                if (!Array.isArray(answer?.memories)) return [];
                return answer.memories
                  .filter((note) => note.kind === 'decision' && (note.zone === 'hold' || note.zone === 'bridge') && typeof note.text === 'string')
                  .map((note) => ({ room: one.id, name: one.id === salas ? 'Coordinator' : one.name, text: note.text.slice(0, 260), at: note.created ?? null }));
              }));
              lobbyDecisions.list = lists.flat().sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? ''))).slice(0, 6);
              lobbyDecisions.at = Date.now();
            })().catch(() => {}).finally(() => { lobbyDecisions.running = null; });
          }
          if (!lobbyDecisions.list) await lobbyDecisions.running;
          return sendJson(response, 200, { decisions: lobbyDecisions.list ?? [], at: lobbyDecisions.at || null });
        }
        // A project from nothing: a new folder, named by the person, in the folder they were in.
        if (request.method === 'POST' && url.pathname === '/api/salas/new') {
          const payload = await body(request).catch(() => ({}));
          const made = await createProject({ name: typeof payload.name === 'string' ? payload.name : '', parent: typeof payload.parent === 'string' ? payload.parent : null, home, stateRoot: root });
          if (!made.error) return sendJson(response, 200, { added: [made] });
          const said = {
            empty: t('Write a name for the project.'),
            long: t('That name is too long.'),
            name: t('A folder cannot be called that: leave out slashes and : * ? " < > |, and do not start with a dot or end with a dot or a space.'),
            exists: t('There is already a folder with that name there.'),
            outside: t('Only folders inside your home folder.'),
            madre: t('That folder is MADRE\'s own.'),
          }[made.error] ?? t('That folder is not there.');
          return sendJson(response, made.error === 'exists' ? 409 : 422, { error: said, code: made.error });
        }
        if (request.method === 'POST' && url.pathname === '/api/salas/projects') {
          const payload = await body(request).catch(() => ({}));
          const roots = Array.isArray(payload.roots) ? payload.roots.filter((one) => typeof one === 'string').slice(0, 50) : [];
          if (!roots.length) return sendJson(response, 422, { error: t('Choose at least one folder.') });
          const added = [];
          const refused = [];
          for (const one of roots) {
            const result = await associateProject({ root: one, home, stateRoot: root });
            if (result.error) refused.push({ root: one, error: result.error === 'madre' ? t('That folder is MADRE\'s own.') : result.error === 'outside' ? t('Only folders inside your home folder.') : t('That folder is not there.') });
            else added.push(result);
          }
          return sendJson(response, added.length ? 200 : 422, { added, refused });
        }
        return sendJson(response, 405, { error: 'method' });
      }
      if (request.method === 'POST' && url.pathname === '/api/salas/close') {
        const payload = await body(request).catch(() => ({}));
        const room = (await knownRooms(root)).find((one) => one.id === payload.room);
        if (!room?.open) return sendJson(response, 200, { room: payload.room ?? null, closed: true });
        if (room.id === basename(roomDir)) {
          sendJson(response, 202, { room: room.id, closing: true, here: true });
          setTimeout(() => server.emit('madre:close'), 150);
          return undefined;
        }
        const answer = await askRoom(room.open.port, '/api/room/close', { method: 'POST', body: {} });
        if (answer.outdated) return sendJson(response, 409, { error: t('That project runs an older MADRE. Update it, or close it from its terminal.'), outdated: true });
        if (answer.unreachable) return sendJson(response, 502, { error: t('That project did not answer.') });
        return sendJson(response, 202, { room: room.id, closing: true });
      }
      if (request.method === 'POST' && url.pathname === '/api/salas/stop-all') {
        const rooms = (await knownRooms(root)).filter((one) => one.open);
        const stopped = await Promise.all(rooms.map((one) => askRoom(one.open.port, '/api/stop-all', { method: 'POST', body: {}, timeoutMs: 3000 }).then((answer) => !answer.unreachable && !answer.outdated)));
        return sendJson(response, 200, { rooms: rooms.length, stopped: stopped.filter(Boolean).length });
      }
      // Turning MADRE off (2026-10-16), from a page of this Mac only, after the person confirmed it.
      // Every other open project is asked to close the way Home closes one — its agents stop, their
      // turns are recorded, its memory and its marker are put away — and waited for; then this room
      // closes the same way. Ollama is its own program and keeps running. Nothing else is touched.
      if (request.method === 'POST' && url.pathname === '/api/madre/shutdown') {
        const host = String(request.headers.host ?? '');
        const site = request.headers['sec-fetch-site'];
        if (viaPhone || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) || (site !== undefined && site !== 'same-origin' && site !== 'none') || request.headers.origin !== `http://${host}`) return sendJson(response, 403, { error: t('MADRE is turned off from its own page, on this computer.') });
        const here = basename(roomDir);
        const others = (await knownRooms(root)).filter((one) => one.open && one.id !== here);
        await Promise.all(others.map((one) => askRoom(one.open.port, '/api/room/close', { method: 'POST', body: {}, timeoutMs: 3000 }).catch(() => null)));
        let left = others;
        for (let tries = 0; tries < 60 && left.length; tries += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          const now = await knownRooms(root);
          left = left.filter((one) => now.find((room) => room.id === one.id)?.open);
        }
        sendJson(response, 202, { closing: true, closed: others.length - left.length, stuck: left.map((one) => one.name) });
        setTimeout(() => server.emit('madre:close'), 150);
        return undefined;
      }
      // This room, asked to close by Salas: what is running stops and the room closes the way a
      // signal closes it (startPulse listens). Nothing here ends the process itself.
      if (request.method === 'POST' && url.pathname === '/api/room/close') {
        sendJson(response, 202, { closing: true });
        setTimeout(() => server.emit('madre:close'), 150);
        return undefined;
      }
      // ---------- ENLACES (docs/MACROVERSO.md, fase 3b) ----------
      // The side that serves a link. Another room on this Mac asks, from its own process, for the
      // notes a signed contract lets it read; every lock is here, in the room that hands them over,
      // and in this order: never a phone, never a page, only a process holding the key of this
      // Mac; one answer for every contract that does not serve this pair (missing, revoked,
      // expired, facing the other way: the asker is not told which); sealed by CODE000; over its
      // hourly ceiling. What crosses is what travels into a turn (`travels()`), of the kinds the
      // contract names, each text through this room's privacy guard, and nothing of the ledger.
      if (request.method === 'GET' && url.pathname === '/api/enlace/memories') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const here = basename(roomDir);
        const asking = String(url.searchParams.get('asking') ?? '');
        const contract = activeContracts(await readConfig(root), { salas: salasRoomId(root) }).find((one) => one.id === url.searchParams.get('contract')) ?? null;
        if (!mayServe({ contract, serving: here, asking }).ok) return sendJson(response, 404, { error: NO_SUCH_LINK });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: `CODE000. THE ARCHIVE IS SEALED FOR ${Math.ceil(sealed / 60000)} MORE MINUTE${Math.ceil(sealed / 60000) === 1 ? '' : 'S'}.`, lockedForMs: sealed });
        if (!memory) return sendJson(response, 503, { error: t('The project has no memory.') });
        const reads = await countRecent(roomDir, contract.id, 'read');
        if (reads >= contract.orders.perHour) return sendJson(response, 429, { error: t('This connection was read {n} times in the last hour, its limit. Try again later.', { n: reads }) });
        const q = String(url.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const limit = Math.min(ENLACE_MAX_LIMIT, Math.max(1, Math.trunc(Number(url.searchParams.get('limit'))) || ENLACE_MAX_LIMIT));
        // The kinds asked for, if any, inside the kinds signed: a reading narrows, never widens.
        const asked = String(url.searchParams.get('kinds') ?? '').split(',').map((kind) => kind.trim()).filter(Boolean);
        const kinds = asked.length ? contract.kinds.filter((kind) => asked.includes(kind)) : contract.kinds;
        await refreshPrivacy();
        // The same search of notes memory_search makes (src/mcp/memory-server.mjs), untracked: a
        // reading from another room is not this room leaning on a note. Without words, the latest.
        const rows = q
          ? memory.recallMemories(q, { limit: ENLACE_MAX_LIMIT * 3, maxChars: ENLACE_MAX_LIMIT * 3 * 300, queryVector: await memory.embedQuery(q).catch(() => null), track: false })
          : memory.memories({ limit: ENLACE_MAX_LIMIT * 3 });
        const notes = rows
          .filter((row) => memoryTravels(row) && kinds.includes(row.kind))
          .slice(0, limit)
          .map((row) => ({ id: row.id, kind: row.kind, zone: row.zone, text: privacy.redact(row.text, { always: true }).text, fromSequence: row.fromSequence, throughSequence: row.throughSequence, created: row.created }));
        // Which agent of the asking room read (S-021): that room's word, checked there against a turn
        // it is running; here it is only kept, shaped like an agent id or not at all.
        const reader = /^[a-z][a-z0-9_-]{0,30}$/.test(String(url.searchParams.get('agent') ?? '')) ? url.searchParams.get('agent') : null;
        await room.record('enlace.read', { contract: contract.id, to: asking, count: notes.length, kinds, query: q ? createHash('sha256').update(q).digest('hex').slice(0, 16) : null, ...(reader ? { agent: reader } : {}) });
        await noteCrossing(roomDir, { kind: 'read', contract: contract.id, other: asking, count: notes.length, agent: reader });
        return sendJson(response, 200, { contract: contract.id, from: here, notes });
      }
      // D-S15 · the whole of what this project lets the Coordinator learn, for its training export.
      // The same doors as a reading, a contract that says `train`, and a ceiling of its own: every
      // note that travels (`travels()`), of the kinds signed, through this room's privacy guard.
      // Not a search and not the latest: all of it, up to CORPUS_MAX, so nothing the project knows
      // is left out of what the Coordinator learns about it. Nothing of the ledger crosses.
      if (request.method === 'GET' && url.pathname === '/api/enlace/corpus') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const here = basename(roomDir);
        const asking = String(url.searchParams.get('asking') ?? '');
        const contract = activeContracts(await readConfig(root), { salas: salasRoomId(root) }).find((one) => one.id === url.searchParams.get('contract')) ?? null;
        if (!contract?.train || !mayServe({ contract, serving: here, asking }).ok) return sendJson(response, 404, { error: NO_SUCH_LINK });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: `CODE000. THE ARCHIVE IS SEALED FOR ${Math.ceil(sealed / 60000)} MORE MINUTE${Math.ceil(sealed / 60000) === 1 ? '' : 'S'}.`, lockedForMs: sealed });
        if (!memory) return sendJson(response, 503, { error: t('The project has no memory.') });
        const taken = await countRecent(roomDir, contract.id, 'corpus');
        if (taken >= CORPUS_PER_HOUR) return sendJson(response, 429, { error: t('The Coordinator took what this project knows {n} times in the last hour, its limit. Try again later.', { n: taken }) });
        await refreshPrivacy();
        const notes = memory.memories({ limit: CORPUS_MAX * 2 })
          .filter((row) => memoryTravels(row) && contract.kinds.includes(row.kind))
          .slice(0, CORPUS_MAX)
          .map((row) => ({ id: row.id, kind: row.kind, zone: row.zone, text: privacy.redact(row.text, { always: true }).text, fromSequence: row.fromSequence, throughSequence: row.throughSequence, created: row.created }));
        await room.record('enlace.corpus', { contract: contract.id, to: asking, count: notes.length, kinds: contract.kinds });
        await noteCrossing(roomDir, { kind: 'corpus', contract: contract.id, other: asking, count: notes.length });
        return sendJson(response, 200, { contract: contract.id, from: here, name: basename(canonicalProjectRoot), notes });
      }
      // D-S16 · this project's canonical state (Continuity, AHP+), for the room that reads under a
      // link that says `state`. The same doors as a reading and the same ceiling, counted apart: the
      // state is read from .ahp/ now, through this room's privacy guard, and nothing else of the
      // project (no git, no files, no evidence) crosses. Without .ahp/ the answer says so: `null`.
      if (request.method === 'GET' && url.pathname === '/api/enlace/state') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const here = basename(roomDir);
        const asking = String(url.searchParams.get('asking') ?? '');
        const contract = activeContracts(await readConfig(root), { salas: salasRoomId(root) }).find((one) => one.id === url.searchParams.get('contract')) ?? null;
        if (!contract?.state || !mayServe({ contract, serving: here, asking }).ok) return sendJson(response, 404, { error: NO_SUCH_LINK });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: `CODE000. THE ARCHIVE IS SEALED FOR ${Math.ceil(sealed / 60000)} MORE MINUTE${Math.ceil(sealed / 60000) === 1 ? '' : 'S'}.`, lockedForMs: sealed });
        const reads = await countRecent(roomDir, contract.id, 'state');
        if (reads >= contract.orders.perHour) return sendJson(response, 429, { error: t('The state of this project was read {n} times in the last hour, its limit. Try again later.', { n: reads }) });
        await refreshPrivacy();
        const state = await readContinuity(canonicalProjectRoot, { redact: (text) => privacy.redact(text, { always: true }).text });
        const reader = /^[a-z][a-z0-9_-]{0,30}$/.test(String(url.searchParams.get('agent') ?? '')) ? url.searchParams.get('agent') : null;
        await room.record('enlace.state', { contract: contract.id, to: asking, source: state?.source ?? null, ...(reader ? { agent: reader } : {}) });
        await noteCrossing(roomDir, { kind: 'state', contract: contract.id, other: asking, count: state ? 1 : 0, agent: reader });
        return sendJson(response, 200, { contract: contract.id, from: here, name: basename(canonicalProjectRoot), state });
      }
      // D-S17 · notes another project hands to this one, under a link that says `deliver` and lets
      // that project read from this one. The same doors; the contract's ceiling, counted apart. They
      // wait in this room's inbox (enlaces-inbox.json): nothing enters the memory until this project
      // accepts it, by your press or by an agent of this project in #3 or above.
      if (request.method === 'POST' && url.pathname === '/api/enlace/deliver') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot deliver across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const payload = await body(request).catch(() => ({}));
        const here = basename(roomDir);
        const from = String(payload.from ?? '');
        const contract = activeContracts(await readConfig(root), { salas: salasRoomId(root) }).find((one) => one.id === payload.contract) ?? null;
        if (!contract?.deliver || !mayServe({ contract, serving: here, asking: from }).ok) return sendJson(response, 404, { error: NO_SUCH_LINK });
        if (!Array.isArray(payload.notes) || !payload.notes.length || payload.notes.length > DELIVER_MAX) return sendJson(response, 422, { error: t('A delivery carries between 1 and {n} notes.', { n: DELIVER_MAX }) });
        let notes;
        try { notes = payload.notes.map(deliverable); } catch (error) { return sendJson(response, 422, { error: t(error.message) }); }
        const received = await countRecent(roomDir, contract.id, 'delivered');
        if (received >= contract.orders.perHour) return sendJson(response, 429, { error: t('This project received {n} deliveries in the last hour, its limit. Try again later.', { n: received }) });
        // What arrives is cleaned here too, by this room's guard, before it is even shown.
        await refreshPrivacy();
        const clean = notes.map((note) => ({ ...note, text: privacy.redact(note.text, { always: true }).text, why: note.why ? privacy.redact(note.why, { always: true }).text : null }));
        const sender = (await knownRooms(root)).find((one) => one.id === from);
        const agent = /^[a-z][a-z0-9_-]{0,30}$/.test(String(payload.agent ?? '')) ? payload.agent : null;
        let added;
        try { added = await receiveDelivery(roomDir, { contract: contract.id, from, name: sender?.name ?? from, agent, notes: clean }); }
        catch (error) { return sendJson(response, error.code === 'FULL' ? 429 : 500, { error: t(error.message) }); }
        await room.record('enlace.delivered', { contract: contract.id, from, name: sender?.name ?? from, agent, coordinator: from === salasRoomId(root), notes: added.map(({ id, kind, text, why }) => ({ id, kind, text, why })) });
        await noteCrossing(roomDir, { kind: 'delivered', contract: contract.id, other: from, count: added.length, agent });
        return sendJson(response, 202, { accepted: added.length, ids: added.map((note) => note.id) });
      }
      // The side that asks (fase 3c): a tool of this room's own turn asks this room, and this room
      // asks the room that serves, by the channel. The same three doors as above — never a phone,
      // never a page, only the key — because the tool is a process of this Mac and nothing else is.
      // `room` is the id or the name of the room to read from; the contract is the one in force
      // that lets THIS room read from THAT one. What came back is counted here (`enlace.received`,
      // with the query as a hash) and the notes are handed on; nothing of them is kept.
      if (request.method === 'POST' && url.pathname === '/api/enlace/ask') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const payload = await body(request).catch(() => ({}));
        const here = basename(roomDir);
        // S-021: a reading belongs to a turn. The tool says which turn and which agent; this room
        // checks that this very turn is running here now, for that agent, above GHOST, and records
        // the reading in that turn's conversation. A tool that outlived its turn reads nothing.
        const turnId = String(payload.turn ?? '');
        const host = turnId ? liveRooms().find((one) => one.runningTurn?.(turnId)) : null;
        const running = host?.runningTurn(turnId) ?? null;
        if (!running || running.agent !== payload.agent || !(running.mode >= 1)) return sendJson(response, 409, { error: t('That reading does not belong to a turn running in this project.') });
        const wanted = String(payload.room ?? '').trim();
        const rooms = await knownRooms(root);
        const named = rooms.filter((one) => one.id === wanted);
        if (!named.length) named.push(...rooms.filter((one) => one.name.toLowerCase() === wanted.toLowerCase()));
        if (!wanted || !named.length) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        const readable = readsFrom(activeContracts(await readConfig(root), { salas: salasRoomId(root) }), here);
        const link = named.map((source) => ({ source, contract: readable.find((one) => one.from === source.id)?.contract ?? null })).find((one) => one.contract) ?? null;
        if (!link) return sendJson(response, 404, { error: NO_SUCH_LINK });
        const { source, contract } = link;
        const asked = Array.isArray(payload.kinds) ? payload.kinds.map(String) : [];
        const kinds = asked.length ? contract.kinds.filter((kind) => asked.includes(kind)) : contract.kinds;
        if (!kinds.length) return sendJson(response, 422, { error: t('This connection lets this project read only: {kinds}.', { kinds: contract.kinds.join(', ') }) });
        if (!source.open) return sendJson(response, 409, { error: t('That project is asleep. Wake it from Home to read from it.') });
        const q = String(payload.query ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const answer = await askEnlace({
          port: source.open.port, contract, asking: here, q, kinds: asked.length ? kinds : null, limit: payload.limit, key, turn: turnId, agent: running.agent,
          record: (type, event) => host.record(type, { ...event, query: q ? createHash('sha256').update(q).digest('hex').slice(0, 16) : null }),
          roomDir,
        });
        if (answer.notes) return sendJson(response, 200, { from: source.name, contract: contract.id, notes: answer.notes });
        if (answer.outdated) return sendJson(response, 409, { error: t('That project runs an older MADRE. Update it, or close it from its terminal.') });
        if (answer.unreachable) return sendJson(response, 502, { error: t('That project did not answer.') });
        return sendJson(response, answer.status ?? 502, { error: answer.refused ?? t('That project did not answer.') });
      }
      // D-S16 and D-S17, the side that asks: a tool of this room's own turn reads the state of a
      // project it reads from, or delivers notes to it. The same doors and the same check that the
      // turn is running here, for that agent, above GHOST, as /api/enlace/ask.
      if (request.method === 'POST' && (url.pathname === '/api/enlace/ask-state' || url.pathname === '/api/enlace/send')) {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const payload = await body(request).catch(() => ({}));
        const here = basename(roomDir);
        const turnId = String(payload.turn ?? '');
        const host = turnId ? liveRooms().find((one) => one.runningTurn?.(turnId)) : null;
        const running = host?.runningTurn(turnId) ?? null;
        if (!running || running.agent !== payload.agent || !(running.mode >= 1)) return sendJson(response, 409, { error: t('That reading does not belong to a turn running in this project.') });
        const wanted = String(payload.room ?? '').trim();
        const rooms = await knownRooms(root);
        const named = rooms.filter((one) => one.id === wanted || one.name.toLowerCase() === wanted.toLowerCase());
        if (!wanted || !named.length) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        const contracts = activeContracts(await readConfig(root), { salas: salasRoomId(root) });
        const sending = url.pathname === '/api/enlace/send';
        const usable = sending ? deliversTo(contracts, here).map(({ contract, to }) => ({ contract, other: to })) : readsFrom(contracts, here).filter(({ contract }) => contract.state).map(({ contract, from }) => ({ contract, other: from }));
        const link = named.map((source) => ({ source, contract: usable.find((one) => one.other === source.id)?.contract ?? null })).find((one) => one.contract) ?? null;
        if (!link) return sendJson(response, 404, { error: sending ? t('No signed connection lets this project deliver notes to that one.') : t('No signed connection lets this project read the state of that one.') });
        const { source, contract } = link;
        if (!source.open) return sendJson(response, 409, { error: t('That project is asleep. Wake it from Home to read from it.') });
        if (!sending) {
          const answer = await askState({ port: source.open.port, contract, asking: here, key, agent: running.agent });
          if (answer.outdated) return sendJson(response, 409, { error: t('That project runs an older MADRE. Update it, or close it from its terminal.') });
          if (answer.unreachable) return sendJson(response, 502, { error: t('That project did not answer.') });
          if (answer.refused) return sendJson(response, answer.status ?? 502, { error: answer.refused });
          await host.record('enlace.state.received', { contract: contract.id, from: source.id, name: source.name, agent: running.agent, turn: turnId, found: Boolean(answer.state) });
          return sendJson(response, 200, { from: source.name, contract: contract.id, state: answer.state });
        }
        if (!Array.isArray(payload.notes) || !payload.notes.length || payload.notes.length > DELIVER_MAX) return sendJson(response, 422, { error: t('A delivery carries between 1 and {n} notes.', { n: DELIVER_MAX }) });
        let notes;
        try { notes = payload.notes.map(deliverable); } catch (error) { return sendJson(response, 422, { error: t(error.message) }); }
        // What leaves is cleaned by this room's guard first, as every note that crosses.
        await refreshPrivacy();
        notes = notes.map((note) => ({ ...note, text: privacy.redact(note.text, { always: true }).text, why: note.why ? privacy.redact(note.why, { always: true }).text : null }));
        const sent = await deliverNotes({ port: source.open.port, contract, from: here, notes, key, agent: running.agent });
        if (sent.outdated) return sendJson(response, 409, { error: t('That project runs an older MADRE. Update it, or close it from its terminal.') });
        if (sent.unreachable) return sendJson(response, 502, { error: t('That project did not answer.') });
        if (sent.refused) return sendJson(response, sent.status ?? 502, { error: sent.refused });
        await host.record('enlace.sent', { contract: contract.id, to: source.id, name: source.name, agent: running.agent, turn: turnId, notes: notes.map(({ kind, text }) => ({ kind, text: text.slice(0, 200) })) });
        await noteCrossing(roomDir, { kind: 'sent', contract: contract.id, other: source.id, count: sent.accepted, agent: running.agent, turn: turnId });
        return sendJson(response, 202, { to: source.name, delivered: sent.accepted });
      }
      // D-S17 · the notes other projects delivered here. Read by the page or by a tool of a turn of
      // this room; decided by you from the page, or by an agent of this project whose turn runs in
      // #3 or #4 (it changes the project's memory, as CONTROL may). Accepted, the note enters the
      // memory as a distilled note does — held first — citing the ledger line of its acceptance.
      // Read like the room's other records (the guard keeps other computers and other sites out).
      if (url.pathname === '/api/enlace/inbox' && request.method === 'GET') {
        return sendJson(response, 200, { notes: (await readInbox(roomDir)).slice(-100).reverse() });
      }
      if (url.pathname === '/api/enlace/inbox/decide' && request.method === 'POST') {
        const payload = await body(request).catch(() => ({}));
        let by = 'you';
        if (request.headers.origin === undefined) {
          const key = await channelKey(root).catch(() => null);
          if (viaPhone || !key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
          const turnId = String(payload.turn ?? '');
          const running = turnId ? liveRooms().find((one) => one.runningTurn?.(turnId))?.runningTurn(turnId) : null;
          if (!running || running.agent !== payload.agent) return sendJson(response, 409, { error: t('That reading does not belong to a turn running in this project.') });
          if (!(running.mode >= 3)) return sendJson(response, 403, { error: t('Only an agent in #3 or #4 accepts a delivered note; below that, you decide it.') });
          by = running.agent;
        } else if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (typeof payload.accept !== 'boolean') return sendJson(response, 422, { error: t('A delivered note is accepted or declined.') });
        if (payload.accept && !memory) return sendJson(response, 503, { error: t('The project has no memory.') });
        const note = await decideDelivery(roomDir, String(payload.id ?? ''), { accept: payload.accept, by });
        if (!note) return sendJson(response, 404, { error: t('That delivered note is not waiting here.') });
        const event = await room.record(payload.accept ? 'enlace.accepted' : 'enlace.declined', { id: note.id, contract: note.contract, from: note.from, name: note.name, kind: note.kind, text: note.text, by });
        if (payload.accept) {
          const sequence = Number(event?.sequence) || 0;
          memory.addMemories([{ kind: note.kind, text: `${note.text} (delivered by ${note.name})` }], { agent: by, fromSequence: sequence, throughSequence: sequence, origin: 'delivered' });
        }
        return sendJson(response, 200, { note });
      }
      // What another room tells this one by the channel: a link of this room's was signed or
      // revoked. One line in the ledger, never a message; any other type is refused.
      if (request.method === 'POST' && url.pathname === '/api/enlace/notice') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.headers.origin !== undefined) return sendJson(response, 403, { error: t('A page cannot read across a connection; only a project can.') });
        const key = await channelKey(root).catch(() => null);
        if (!key || !sameKey(request.headers[CHANNEL_HEADER], key)) return sendJson(response, 403, { error: t('That is not the key of this Mac.') });
        const payload = await body(request).catch(() => ({}));
        if (!ENLACE_NOTICES.includes(payload.type) || !payload.payload || typeof payload.payload !== 'object' || Array.isArray(payload.payload)) return sendJson(response, 422, { error: t('That is not a notice a connection sends.') });
        await room.record(payload.type, payload.payload);
        return sendJson(response, 202, { accepted: true });
      }
      // Signing and revoking, from Salas (fase 3c). A change of state, so it comes only from this
      // room's own page or a process of this Mac (src/request-guard.mjs) and never from a phone
      // (above). Both rooms are told, if they are open: this one straight into its ledger, the
      // other by the channel; a room that is asleep reads the contract when it wakes.
      const tellRooms = async (type, contract, rooms) => {
        if (typeof contract?.rooms?.a !== 'string' || typeof contract?.rooms?.b !== 'string') return;
        const key = await channelKey(root).catch(() => null);
        const here = basename(roomDir);
        const [a, b] = [contract.rooms.a, contract.rooms.b].map((id) => rooms.find((one) => one.id === id) ?? { id, name: id, open: null });
        for (const [me, other] of [[a, b], [b, a]]) {
          const role = contract.direction === 'both' ? 'both' : servingRooms(contract).includes(me.id) ? 'serves' : 'reads';
          const payload = type === 'enlace.signed'
            ? { contract, other: other.name, otherId: other.id, coordinator: other.id === salasRoomId(root), role, kinds: contract.kinds, expires: contract.expires, orders: contract.orders }
            : { contract, other: other.name, otherId: other.id, coordinator: other.id === salasRoomId(root) };
          if (me.id === here) await room.record(type, payload);
          else if (me.open && key) await noticeEnlace({ port: me.open.port, type, payload, key }).catch(() => null);
        }
      };
      if (request.method === 'POST' && url.pathname === '/api/salas/enlaces') {
        const payload = await body(request).catch(() => ({}));
        const rooms = await knownRooms(root);
        for (const id of [payload.a, payload.b]) if (!rooms.some((one) => one.id === id)) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        // Two projects are connected once: signContract checks it under the lock (src/enlaces.mjs).
        let contract;
        try {
          // BISHOP signs only from the room's own process (no Origin: never a page), and the contract
          // itself holds it to a link to read that expires within a week (D-S13, src/enlaces.mjs).
          const signed = payload.by === 'bishop' && request.headers.origin === undefined ? { by: 'bishop' } : undefined;
          // «Include always» only from the page (INI-04 of the 1.0 review): its own route refuses a
          // process, and signing let one set it anyway, so a project got another's notes every turn.
          const recall = payload.recall === true && !signed && request.headers.origin !== undefined;
          // D-S15: «the Coordinator may learn from it» the same way: only you, only from the page.
          const train = payload.train === true && !signed && request.headers.origin !== undefined;
          // D-S16 and D-S17 the same way: the state and deliveries, only you, only from the page.
          const state = payload.state === true && !signed && request.headers.origin !== undefined;
          const deliver = payload.deliver === true && !signed && request.headers.origin !== undefined;
          contract = await signContract(root, { rooms: { a: payload.a, b: payload.b }, direction: payload.direction, kinds: payload.kinds, expires: payload.expires ?? null, orders: payload.orders ?? { allowed: false, maxMode: 0, perHour: 6 }, signed, recall, train, state, deliver }, { rooms, salas: salasRoomId(root), designation: payload.designation ?? null });
        } catch (error) {
          if (error.code === 'DESIGNATION') return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
          if (error.code === 'ALREADY') return sendJson(response, 409, { error: t(error.message) });
          return sendJson(response, error.code === 'UNKNOWN_ROOM' ? 404 : 422, { error: t(error.message) });
        }
        await tellRooms('enlace.signed', contract, rooms);
        return sendJson(response, 200, { contract });
      }
      // Fase 3e: the box «recall on every turn» of a link, ticked or cleared by the human from Salas
      // (never a phone, never a process: the page asks). It changes what each turn of the room that
      // reads is handed, not what that room may read; the contract is otherwise untouched.
      if (request.method === 'POST' && url.pathname === '/api/salas/enlaces/recall') {
        const payload = await body(request).catch(() => ({}));
        if (request.headers.origin === undefined) return sendJson(response, 403, { error: t('This is changed by you, from Home.') });
        if (typeof payload.recall !== 'boolean') return sendJson(response, 422, { error: t('automatic recall can only be on or off.') });
        const contract = await recallContract(root, String(payload.id ?? ''), payload.recall, { salas: salasRoomId(root) });
        if (!contract) return sendJson(response, 404, { error: NO_SUCH_LINK });
        return sendJson(response, 200, { contract });
      }
      // D-S15: «the Coordinator may learn from this project», ticked or cleared by the human from
      // Home (never a phone, never a process). Cleared, Salas forgets the copy it kept of that
      // project at once, and the next export leaves it out.
      if (request.method === 'POST' && url.pathname === '/api/salas/enlaces/train') {
        const payload = await body(request).catch(() => ({}));
        if (viaPhone || request.headers.origin === undefined) return sendJson(response, 403, { error: t('This is changed by you, from Home.') });
        if (typeof payload.train !== 'boolean') return sendJson(response, 422, { error: t('learning can only be on or off.') });
        let contract;
        try { contract = await trainContract(root, String(payload.id ?? ''), payload.train, { salas: salasRoomId(root) }); } catch (error) { return sendJson(response, 422, { error: t(error.message) }); }
        if (!contract) return sendJson(response, 404, { error: NO_SUCH_LINK });
        if (!contract.train) await forgetLinkedCorpus(contract);
        return sendJson(response, 200, { contract });
      }
      // D-S16 and D-S17: «it shares its state» and «notes can be delivered to it», ticked or cleared
      // by you from Home (never a phone, never a process).
      if (request.method === 'POST' && url.pathname === '/api/salas/enlaces/allow') {
        const payload = await body(request).catch(() => ({}));
        if (viaPhone || request.headers.origin === undefined) return sendJson(response, 403, { error: t('This is changed by you, from Home.') });
        if (!['state', 'deliver'].includes(payload.field) || typeof payload.on !== 'boolean') return sendJson(response, 422, { error: t('That is not something a connection can allow.') });
        let contract;
        try { contract = await allowContract(root, String(payload.id ?? ''), payload.field, payload.on, { salas: salasRoomId(root) }); } catch (error) { return sendJson(response, 422, { error: t(error.message) }); }
        if (!contract) return sendJson(response, 404, { error: NO_SUCH_LINK });
        return sendJson(response, 200, { contract });
      }
      if (request.method === 'POST' && url.pathname === '/api/salas/enlaces/revoke') {
        const payload = await body(request).catch(() => ({}));
        const id = String(payload.id ?? '');
        // Told once: a link revoked twice keeps its first stamp and says nothing new.
        const already = Boolean((await readConfig(root)).enlaces?.[id]?.revoked);
        const contract = await revokeContract(root, id);
        if (!contract) return sendJson(response, 404, { error: NO_SUCH_LINK });
        await forgetLinkedCorpus(contract);
        if (!already) await tellRooms('enlace.revoked', contract, await knownRooms(root)).catch(() => null);
        return sendJson(response, 200, { contract });
      }
      // Taking a project out of MADRE (2026-10-10), from Home and only from its page on this Mac, as
      // adding one is. Never the Coordinator's own, never the room that is asked. Open, it is closed
      // first; its connections end with it, so none is left pointing at a project MADRE no longer
      // knows; then its record goes aside (forgetProject). Its folder on the Mac is not touched.
      if (request.method === 'POST' && url.pathname === '/api/salas/forget') {
        const host = String(request.headers.host ?? '');
        const site = request.headers['sec-fetch-site'];
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) || (site !== undefined && site !== 'same-origin' && site !== 'none') || request.headers.origin !== `http://${host}`) return sendJson(response, 403, { error: t('This is done from Home, on this Mac.') });
        const payload = await body(request).catch(() => ({}));
        const id = String(payload.room ?? '');
        const salas = salasRoomId(root);
        if (id === salas || id === basename(roomDir)) return sendJson(response, 422, { error: t('The Coordinator\'s project stays in MADRE.') });
        const find = async () => (await knownRooms(root)).find((one) => one.id === id) ?? null;
        let one = await find();
        if (!one) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        if (one.open) {
          const answer = await askRoom(one.open.port, '/api/room/close', { method: 'POST', body: {} });
          if (answer.outdated) return sendJson(response, 409, { error: t('That project runs an older MADRE. Update it, or close it from its terminal.'), outdated: true });
          if (answer.unreachable) return sendJson(response, 502, { error: t('That project did not answer.') });
          for (let tries = 0; tries < 40 && one?.open; tries += 1) { await new Promise((resolve) => setTimeout(resolve, 250)); one = await find(); }
          if (one?.open) return sendJson(response, 504, { error: t('That project did not close. Close it and try again.') });
        }
        const ended = [];
        for (const contract of activeContracts(await readConfig(root), { salas })) {
          if (contract.rooms.a !== id && contract.rooms.b !== id) continue;
          const revoked = await revokeContract(root, contract.id);
          if (!revoked) continue;
          ended.push(revoked.id);
          await tellRooms('enlace.revoked', revoked, await knownRooms(root)).catch(() => null);
        }
        const forgotten = await forgetProject({ stateRoot: root, id });
        // A room from before MADRE kept the path has no record to set aside: closed, it is gone.
        if (forgotten.error && await find()) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
        return sendJson(response, 200, { id, name: forgotten.name ?? one?.name ?? id, root: forgotten.root ?? null, ended });
      }
      // ---------- fin ENLACES ----------
      // Where the person was, to pick it up on the other side (bridge/handoff.mjs).
      if (url.pathname === '/api/handoff') {
        if (request.method === 'GET') return sendJson(response, 200, await readHandoff(root));
        if (request.method === 'POST') {
          const payload = await body(request).catch(() => ({}));
          const { chats } = await listChats(roomDir);
          const chat = chats.find((one) => one.id === payload.chat) ?? chats.find((one) => one.active) ?? null;
          const saved = await writeHandoff(root, viaPhone ? 'phone' : 'mac', { room: basename(roomDir), project: basename(canonicalProjectRoot), port: openPort, chat: chat?.id ?? null, chatTitle: chat?.title ?? null, anchor: payload.anchor, draft: payload.draft, kind: phoneKind });
          return sendJson(response, 200, { saved });
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        // `?chat=` reads another conversation, held open beside the one on screen; the room-wide
        // parts are the same, the record and what is running in it are that conversation's.
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const room = here.room;
        const store = here.store;
        return sendJson(response, 200, {
          ...(here.main ? {} : { chat: here.id }),
          projectRoot,
          // The project's name as this system writes paths (WEB-11): the page cut it at «/», and on
          // Windows the name was the whole path, so the key for #3 never matched.
          projectName: basename(canonicalProjectRoot),
          platform: process.platform,
          // Behind the bridge, the page is on a phone and knows it. On the Mac it learns whether a
          // phone is paired, so it keeps its place for the phone only when there is one.
          device: viaPhone ? { kind: phoneKind } : null,
          // Whether this Mac offers the phone (a preview in 1.0); behind the bridge, it does.
          phonePreview: viaPhone ? true : await phonePreview(),
          // The room of Salas knows it is: true only there, false in every other room.
          salas: salasRoom,
          room: basename(roomDir),
          phones: viaPhone ? undefined : await phonePreview() ? (await readStore(root).catch(() => ({ devices: [] }))).devices.length : 0,
          // Which MADRE this is. The page prints it in the corner: the one fact a bug report
          // always needs and nobody ever remembers to ask for.
          version: PACKAGE.version,
          // Which start of this process the page is talking to. The page draws its logo when this
          // changes — MADRE restarted — and not on every reload of the same running room.
          boot: BOOT_ID,
          // What language this machine set MADRE to, for a browser that has never chosen. It is
          // the language the room is SPEAKING, not the one written in the file: PULSE_LANGUAGE
          // wins over the config here as it does everywhere else, and reading the file again
          // would hand the page a different answer from the one the server itself is using.
          language: roomLanguage(),
          languageChosen,
          // Which conversation this page is looking at, and the others it could open.
          chats: await chatsView(),
          agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })),
          ash: { enabled: room.ashEnabled() },
          choices: { enabled: room.choicesEnabled() },
          runs: { enabled: room.runsEnabled() },
          // Read live, not from the config this process loaded at boot. A switch the human moves
          // in MODULES while the room is open has to be the answer the room gives afterwards —
          // otherwise the switch says on and the browser keeps refusing, which is how a setting
          // stops being believed.
          ripleyWeb: Boolean((await readConfig(root)).modules?.ripley?.web),
          ripley: { enabled: await ripleyOn() },
          softTokenBudget,
          override: publicOverride(overrideConfig),
          timeouts: Object.fromEntries(agents.map((agent) => [agent.id, room.timeoutFor(agent.id)])),
          delegation: { enabled: room.settings().delegation, maxPlanSteps: room.settings().maxPlanSteps },
          plans: room.activePlans(),
          turns: room.activeTurns(),
          modeRequests: room.pendingModeRequests(),
          control: room.control(),
          sessions,
          sessionsAt,
          login: loginState(),
          capabilities: room.capabilities(),
          quotaSources: quotaMonitor.snapshot(),
          budgetWindow: room.budgetWindow(),
          events: forThePage(await store.readAll()),
        });
      }
      if (request.method === 'GET' && url.pathname === '/api/events') {
        const sinceValue = request.headers['last-event-id'] ?? url.searchParams.get('since');
        const since = sinceValue === undefined || sinceValue === null || sinceValue === '' ? null : Number(sinceValue);
        // `?chat=` watches a conversation held open beside the one on screen, on a feed of its own.
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const feed = here.main ? mainFeed : await watchHeld(here.entry);
        response.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        response.write(': connected\n\n');
        // Replay what this client missed between /api/state and this connection,
        // then register it so the shared cursor delivers everything newer.
        const events = Number.isFinite(since) ? await feed.store.readAll() : [];
        let floor = Number.isFinite(since) ? since : 0;
        for (const event of events) {
          if (event.sequence > floor && event.sequence <= feed.sent) {
            writeEvent(response, event, feed);
            floor = event.sequence;
          }
        }
        feed.clients.set(response, floor);
        request.on('close', () => {
          feed.clients.delete(response);
          // The last page watching a held conversation went away: it closes unless it is at work. A
          // moment later, so a page that is only reconnecting finds the same room.
          if (!here.main) setTimeout(() => { void releaseIfIdle(here.id, here.room); }, 1500).unref?.();
        });
        void pump(feed);
        return;
      }
      // Copying and moving, by the human's own hand. Both ends are resolved inside the project
      // after following symlinks, so no path typed or pasted can reach outside it; the zones the
      // room guards from agents ask for the project's designation first.
      if (request.method === 'POST' && url.pathname === '/api/tree/op') {
        const payload = await body(request).catch(() => ({}));
        // Pasting a copy where its name is taken — beside itself, most often — names the copy
        // instead of refusing. Only a copy, and only when the page asked: a move or a rename onto
        // a taken name is still a mistake the human should hear about.
        if (payload.operation === 'copy' && payload.unique) {
          payload.to = await freeCopyPath(payload.to, { word: t('copy'), taken: async (path) => {
            const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
            const parent = await resolveInside(canonicalProjectRoot, dir);
            return Boolean(parent) && access(join(parent, path.slice(path.lastIndexOf('/') + 1))).then(() => true, () => false);
          } });
        }
        const plan = planFileOp(payload);
        if (!plan.ok) return sendJson(response, 400, { error: t(plan.error) });
        if (!plan.guarded) plan.guarded = await needsDesignationOnDisk(canonicalProjectRoot, plan.from, plan.to);
        if (plan.guarded && !designationOk(payload.designation)) {
          return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.'), guarded: true });
        }
        const source = plan.from ? await resolveInside(canonicalProjectRoot, plan.from) : null;
        if (plan.from && !source) return sendJson(response, 404, { error: t('Not found.') });
        // The destination does not exist yet, so its PARENT is what has to be inside the project.
        const targetDir = plan.to.includes('/') ? plan.to.slice(0, plan.to.lastIndexOf('/')) : '.';
        const parent = await resolveInside(canonicalProjectRoot, targetDir);
        if (!parent) return sendJson(response, 400, { error: t('The destination is outside this project.') });
        const destination = join(parent, plan.to.slice(plan.to.lastIndexOf('/') + 1));
        if (await access(destination).then(() => true, () => false)) {
          return sendJson(response, 409, { error: t('There is already something at {path}.', { path: plan.to }) });
        }
        try {
          if (plan.operation === 'new-folder') await mkdir(destination);
          else if (plan.operation === 'new-file') await writeFile(destination, '', { flag: 'wx' });
          else if (plan.operation === 'copy') await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
          else await rename(source, destination);
        } catch (error) {
          return sendJson(response, 500, { error: t('That could not be done: {error}', { error: error.message }) });
        }
        await room.record(CREATIONS.includes(plan.operation) ? 'project.file.created' : 'project.file.moved', { operation: plan.operation, from: plan.from, to: plan.to, guarded: plan.guarded });
        return sendJson(response, 200, { ok: true, operation: plan.operation, from: plan.from, to: plan.to });
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
          // When the editor opened it: saving checks the file is still the one it opened.
          'x-mtime': String(file.mtimeMs ?? ''),
        });
        return response.end(file.body);
      }
      // The editor saves a project file. The human's own hand, so no mode and no lease — but the
      // same two fences the file manager keeps: inside the project after following links, and the
      // zones the room guards (.git, .pulse, .madre, a .env) ask for the project's designation.
      // A new, empty file from the Finder; guarded paths ask for the designation, like saving.
      if (request.method === 'POST' && url.pathname === '/api/files') {
        const payload = await body(request).catch(() => ({}));
        const relative = String(payload.path ?? '').trim().replace(/^\/+/, '');
        if (relative && await needsDesignationOnDisk(canonicalProjectRoot, relative) && !designationOk(payload.designation)) {
          return sendJson(response, 403, { error: t('This file is one the project guards. Type the project name to save it.'), guarded: true });
        }
        const result = await createEmptyFile(canonicalProjectRoot, relative);
        if (result.status !== 201) return sendJson(response, result.status, { error: t(result.error) });
        await room.record('project.file.created', { path: result.path });
        return sendJson(response, 201, { ok: true, path: result.path });
      }
      if (request.method === 'PUT' && url.pathname === '/api/files') {
        // The editor saves up to MAX_EDIT_BYTES; written as JSON a file can take a few times its
        // size (every newline and quote escaped). Too large is said as that, not as «Nothing to save».
        let payload;
        try { payload = await body(request, { limit: MAX_EDIT_BYTES * 3 + 65536 }); } catch (error) {
          return sendJson(response, error.status === 413 ? 413 : 400, { error: error.status === 413 ? t('The editor saves files up to {mb} MB.', { mb: MAX_EDIT_BYTES / 1024 / 1024 }) : t('That could not be read.') });
        }
        const relative = String(payload.path ?? '').replace(/^\/+/, '');
        if (!relative) return sendJson(response, 400, { error: t('Nothing to save.') });
        if (await needsDesignationOnDisk(canonicalProjectRoot, relative) && !designationOk(payload.designation)) {
          return sendJson(response, 403, { error: t('This file is one the project guards. Type the project name to save it.'), guarded: true });
        }
        const result = await writeEdited(canonicalProjectRoot, relative, payload.content, { mtimeMs: payload.mtimeMs, force: payload.force === true });
        if (result.status !== 200) return sendJson(response, result.status, { error: result.status === 413 ? t('The editor saves files up to {mb} MB.', { mb: MAX_EDIT_BYTES / 1024 / 1024 }) : t(result.error), changed: result.changed, mtimeMs: result.mtimeMs });
        await room.record('project.file.saved', { path: relative, bytes: result.bytes });
        return sendJson(response, 200, { ok: true, bytes: result.bytes, mtimeMs: result.mtimeMs });
      }
      // The code workspace (1.0.3): the last time an agent changed a file in an EDIT turn, as git
      // kept it — the file before the turn and the file the turn left — and which parts of it the
      // human already kept. A turn taken back with UNDO is no longer a change.
      if (request.method === 'GET' && url.pathname === '/api/files/changes') {
        const path = String(url.searchParams.get('path') ?? '').replace(/^\.?\/+/, '');
        if (!path || path.split('/').includes('..')) return sendJson(response, 400, { error: t('That is not a file of this project.') });
        const change = await lastAgentChange(path);
        if (!change) return sendJson(response, 200, { change: null, reviewed: [] });
        const before = change.status === 'A' ? '' : await readAt(canonicalProjectRoot, { checkpointId: change.checkpointId, path });
        if (before === null) return sendJson(response, 200, { change: null, reviewed: [] });
        const after = change.afterTree ? await readAt(canonicalProjectRoot, { tree: change.afterTree, path }) : null;
        const reviewed = (await readReviewed())[`${change.checkpointId}|${path}`] ?? [];
        return sendJson(response, 200, { change: { agent: change.agent, checkpointId: change.checkpointId, at: change.at, status: change.status, before, after, messageId: change.messageId }, reviewed });
      }
      if (request.method === 'POST' && url.pathname === '/api/files/changes/review') {
        const payload = await body(request).catch(() => ({}));
        const path = String(payload.path ?? '').replace(/^\.?\/+/, '');
        const checkpointId = String(payload.checkpointId ?? '');
        const hunk = String(payload.hunk ?? '');
        if (!path || path.split('/').includes('..') || !/^[0-9A-Za-z][\w-]{0,79}$/.test(checkpointId) || !/^[0-9a-f]{6,16}$/.test(hunk)) return sendJson(response, 400, { error: t('That is not a change of this project.') });
        const reviewed = await keepReviewed(`${checkpointId}|${path}`, hunk);
        return sendJson(response, 200, { reviewed });
      }
      // RIPLEY: the project rendered as a site, inside a frame that runs scripts but
      // reaches nothing: an opaque origin (sandbox without same-origin), no network
      // (connect-src none), no forms, no top navigation, assets only from MADRE's
      // own host. Path-based, so a page's relative links to its CSS, JS and images
      // resolve to the same route.
      const previewMatch = request.method === 'GET' && url.pathname.match(/^\/preview\/(project|attachments)\/(.*)$/);
      if (previewMatch) {
        if (!(await ripleyOn())) return sendJson(response, 412, { error: t('Preview is off. Enable it in MODULES to render files.') });
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
        // Everything else is sealed too (SRV-02, 2026-10-12): an SVG or an XML file carries scripts,
        // and opened on its own — a link in an answer, a frame the project's server navigates — it
        // ran with the project's origin and reached its API. Sealed, it is drawn and runs nothing.
        // A PDF keeps the browser's own viewer, which a sealed document cannot open; the scripts and
        // styles a page links are left as they were (opened on their own they are text, and a
        // worker the page starts would be shut by a policy meant for documents).
        else if (!/^(application\/pdf|text\/css|(text|application)\/javascript)\b/i.test(file.contentType ?? '')) headers['content-security-policy'] = `sandbox; default-src 'none'; img-src ${origin} data:; style-src 'unsafe-inline'; media-src ${origin} data: blob:`;
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
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const record = await here.room.registerAttachment(await storeAttachment(attachmentsRoot, { name, bytes }));
        return sendJson(response, 201, { attachment: { id: record.id, name: record.name, fileName: record.fileName, size: record.size, contentType: record.contentType, url: `/api/files?root=attachments&path=${encodeURIComponent(record.fileName)}` } });
      }
      // The key for #3 and #4, checked here (src/override.mjs): what was typed, once or twice, and a
      // pass back for that agent and mode. Never from a phone: #3 and #4 are opened on the Mac.
      if (request.method === 'POST' && url.pathname === '/api/override/arm') {
        if (viaPhone) return sendJson(response, 403, { error: t('#3 EDIT and #4 FULL ACCESS are opened from the Mac.') });
        const payload = await body(request).catch(() => ({}));
        const mode = Number(payload.mode);
        const agent = String(payload.agent ?? '');
        if ((mode !== 3 && mode !== 4) || !agents.some((one) => one.id === agent)) return sendJson(response, 400, { error: t('Unlock #3 or #4 for an agent of this project.') });
        const now = Date.now();
        while (keyMisses.length && keyMisses[0] < now - 60000) keyMisses.shift();
        if (keyMisses.length >= 8) return sendJson(response, 429, { error: t('Too many wrong confirmations. Wait a minute and try again.') });
        if (!keyHolds(overrideConfig, { mode, words: payload.words, designation: basename(canonicalProjectRoot) })) {
          keyMisses.push(now);
          return sendJson(response, 403, { error: t('That is not it. Try again, or cancel.'), denied: true });
        }
        return sendJson(response, 200, issuePass(agent, mode, Number(payload.minutes) || 0));
      }
      // The copilot: what it is now, turning it on with the #3 key for a chosen while, turning it off.
      if (request.method === 'GET' && url.pathname === '/api/copilot') return sendJson(response, 200, copilotState());
      if (request.method === 'POST' && url.pathname === '/api/copilot') {
        if (viaPhone) return sendJson(response, 403, { error: t('The copilot is turned on from the computer, not from the phone.') });
        const payload = await body(request).catch(() => ({}));
        const minutes = Number(payload.minutes);
        if (!COPILOT_WINDOWS.includes(minutes)) return sendJson(response, 400, { error: t('Choose how long the copilot lasts: up to 24 hours.') });
        const now = Date.now();
        while (keyMisses.length && keyMisses[0] < now - 60000) keyMisses.shift();
        if (keyMisses.length >= 8) return sendJson(response, 429, { error: t('Too many wrong confirmations. Wait a minute and try again.') });
        if (!keyHolds(overrideConfig, { mode: 3, words: payload.words, designation: basename(canonicalProjectRoot) })) {
          keyMisses.push(now);
          return sendJson(response, 403, { error: t('That is not it. Try again, or cancel.'), denied: true });
        }
        if (copilot) clearTimeout(copilot.timer);
        const until = now + minutes * 60000;
        copilot = { since: now, until, minutes, timer: setTimeout(() => { void endCopilot('time'); }, minutes * 60000) };
        copilot.timer.unref?.();
        await room.record('copilot.started', { until: new Date(until).toISOString(), minutes });
        return sendJson(response, 200, copilotState());
      }
      if (request.method === 'POST' && url.pathname === '/api/copilot/off') {
        await endCopilot('human');
        return sendJson(response, 200, copilotState());
      }
      // This project's switch for the local AI (src/local-ai.mjs). In «auto» Home decides and the
      // switch does not move; /apply is how Home tells an open project the choice changed.
      if (request.method === 'GET' && url.pathname === '/api/local-ai') return sendJson(response, 200, { project: await localAiHere(), running: Boolean(ollama.running) });
      if (request.method === 'POST' && url.pathname === '/api/local-ai/apply') {
        const status = await wireOllama({ probe: false });
        return sendJson(response, 200, { project: status.project });
      }
      if (request.method === 'POST' && url.pathname === '/api/local-ai') {
        const patch = await body(request);
        if (typeof patch?.on !== 'boolean') return sendJson(response, 400, { error: t('Say on or off.') });
        if (salasRoom) return sendJson(response, 409, { error: t('The Coordinator follows the local AI switch of Modules.') });
        const status = await setLocalAiHere(patch.on);
        if (!status) return sendJson(response, 409, { error: t('Home turns the local AI on in every project. Change it in Home › Settings › Local AI.') });
        return sendJson(response, 200, { project: status.project });
      }
      if (request.method === 'GET' && url.pathname === '/api/settings') {
        await refreshPrivacy();
        const stored = await readConfig(root);
        if (stored.override) stored.override = publicOverride(stored.override);
        return sendJson(response, 200, { settings: effectiveSettings(), config: stored, sessions, sessionsAt, loggingIn, login: loginState(), agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })) });
      }
      if (request.method === 'POST' && url.pathname === '/api/settings') {
        const patch = await body(request);
        // Permissions and the key that opens #3 and #4 are changed on the Mac.
        if (viaPhone && (patch?.scopes !== undefined || patch?.override !== undefined)) return sendJson(response, 403, { error: t('Permissions are changed on the Mac.') });
        if (patch?.override && typeof patch.override === 'object') {
          const proof = patch.override.proof;
          delete patch.override.proof;
          if (changeNeedsPhrase(overrideConfig) && !(typeof proof === 'string' && proof.trim() && phraseHash(overrideConfig.phrase.salt, proof) === overrideConfig.phrase.hash)) {
            return sendJson(response, 403, { error: t('Type your current phrase to change how modes are confirmed.'), needsPhrase: true });
          }
        }
        return sendJson(response, 200, { settings: await applySettings(patch) });
      }
      // NOSTROMO: the archive is behind the project designation, like CONTROL.
      // Sentinel: reports, settings, the manual road (a prefilled issue) and the automatic one.
      if (request.method === 'GET' && url.pathname === '/api/sentinel') {
        return sendJson(response, 200, { reports: sentinel.reports(), settings: sentinel.settings(), environment: sentinel.environment(), feedbackUrl: sentinel.feedbackUrl(), formUrl: sentinel.formUrl() });
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
          // Both roads, always: the issue for whoever has an account, the form for whoever does
          // not. Nobody should hit a login wall while holding a bug report. A report that does
          // not exist still gets neither: the form does not need the report to be built, so it
          // would otherwise hand out a link for nothing.
          const known = sentinel.reports().some((one) => one.id === sentinelMatch[1]);
          const issue = known ? sentinel.issueUrl(sentinelMatch[1]) : null;
          return known ? sendJson(response, 200, { url: issue, form: sentinel.formUrl({ about: sentinelMatch[1] }) }) : sendJson(response, 404, { error: t('No such report, or no repository to file it in.') });
        }
        const outcome = await sentinel.send(sentinelMatch[1]);
        return sendJson(response, outcome.ok ? 200 : (outcome.status === 404 || outcome.status === 412 ? outcome.status : 502), outcome);
      }
      // Routes a module serves, before MADRE's own: the module answers with { status, body }.
      const moduleRoute = findModuleRoute(request.method, url.pathname);
      if (moduleRoute) {
        const payload = request.method === 'POST' ? await body(request).catch(() => ({})) : {};
        // `viaPhone` (encargo §6, excepción 4): a module can refuse the phone by its own hand.
        const result = await moduleRoute.route.handler(await moduleContext(), { request, url, params: moduleRoute.params, payload, viaPhone });
        // A page instead of JSON, for the one place a browser lands on a module's route on its
        // own: the way back from a sign-in (Connect MCP's OAuth). Never cached.
        if (typeof result.html === 'string') {
          response.writeHead(result.status ?? 200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" });
          return response.end(result.html);
        }
        return sendJson(response, result.status ?? 200, result.body ?? {});
      }
      // Where this room's tokens go: what each block of the briefing has cost, how much came back
      // from a CLI's own cache, and how many characters the room spends per token it is charged.
      // What this project has settled, for the strip at the top of a conversation. Not gated
      // behind the designation the archive is: these same sentences already appear in the room
      // under any answer that recalled one.
      // Open questions, for the strip under the composer. Read-only and ungated for the same
      // reason the decisions are: these sentences already appear in the room whenever one is
      // recalled. Dismissing one still happens in NOSTROMO, behind the designation.
      // What is listening on loopback that answers HTTP, for RIPLEY's address bar. Reading only:
      // lsof reports and changes nothing, nothing in the project is run, and a port that does not
      // speak HTTP never reaches the list. Starting a server is not here — that runs a command.
      // Whether an address agrees to be put behind glass. A page is entitled to refuse, and most
      // serious ones do; what RIPLEY can do is ask before framing it, so the human gets MADRE's
      // sentence and a real tab instead of the browser's bare "refused to connect".
      //
      // This is the one place the room itself reaches the web, and only after the human turned
      // the web on and typed the address. The request goes through the same watched fetch as
      // everything else, so it lands in the outbound log like any other departure.
      if (request.method === 'GET' && url.pathname === '/api/can-frame') {
        let target = null;
        try { target = new URL(url.searchParams.get('url') ?? ''); } catch { return sendJson(response, 400, { error: t('That is not an address.') }); }
        if (!/^https?:$/.test(target.protocol)) return sendJson(response, 400, { error: t('Only http and https.') });
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname);
        if (!local && !(await readConfig(root)).modules?.ripley?.web) {
          return sendJson(response, 403, { error: t('PREVIEW reaches this computer only · turn the web on in MODULES to open an address outside it') });
        }
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const probe = await reportFetch(target.href, { signal: controller.signal, redirect: 'follow' });
          clearTimeout(timer);
          return sendJson(response, 200, { framable: framable(probe.headers), status: probe.status });
        } catch (error) {
          return sendJson(response, 200, { framable: true, status: null, unreachable: true });
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/ports') {
        if (!(await ripleyOn())) return sendJson(response, 412, { error: t('Preview is off. Enable it in MODULES to render files.') });
        // Only this project's servers, read by the servers sentinel: the same reading its watch
        // makes, so the menu and the live updates never disagree about what is here.
        const read = await serverSentinel.scan();
        return sendJson(response, 200, { ...read, wider: read.wider.slice(0, 8) });
      }
      if (request.method === 'GET' && url.pathname === '/api/questions') {
        const limit = Math.min(5, Math.max(1, Number(url.searchParams.get('limit') ?? 3) || 3));
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        return sendJson(response, 200, { questions: here.room.questions({ limit }) });
      }
      if (request.method === 'GET' && url.pathname === '/api/decisions') {
        const limit = Math.min(5, Math.max(1, Number(url.searchParams.get('limit') ?? 3) || 3));
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        return sendJson(response, 200, { decisions: here.room.decisions({ limit }) });
      }
      // The economy of the room: every conversation's turns, not only the open one's. The card and
      // the panel say «this room», and they used to weigh one conversation's ledger under that name.
      if (url.pathname === '/api/economy' && request.method === 'GET') {
        const weighed = [];
        for (const chat of (await listChats(roomDir)).chats) {
          const text = await readFile(chatLedger(roomDir, chat.id), 'utf8').catch(() => '');
          for (const line of text.split('\n')) {
            if (!line.includes('"turn.cost"')) continue;
            try { const event = JSON.parse(line); if (event.type === 'turn.cost') weighed.push(event); } catch { /* a torn last line */ }
          }
        }
        return sendJson(response, 200, { ...economy(weighed), conversations: (await listChats(roomDir)).chats.length });
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
            market: marketOn(),
            reports: Boolean(sentinel.settings().autoReport),
            anthropic: agents.some((agent) => agent.id === 'claude' && agent.ready),
            ollama: Boolean(ollama.running),
            alive: true,
            usage: FROM_SOURCE && Boolean(await readSecret(root, OWNER_VAULT, 'usage')),
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
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        const raised = await eyecat.sweep({ reason: 'asked' }).catch(() => null);
        return sendJson(response, 200, { raised: raised?.length ?? 0, findings: eyecat.findings() });
      }
      const eyecatVerdict = request.method === 'POST' && url.pathname.match(/^\/api\/eyecat\/(confirm|dismiss)$/);
      if (eyecatVerdict) {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        if (!memory) return sendJson(response, 503, { error: t('The project has no memory.') });
        const finding = eyecat.findings().find((item) => item.key === payload.key);
        if (!finding) return sendJson(response, 404, { error: t('EYECAT is not holding that one.') });
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
          const ready = datasetReadiness(await projectEvents(), notes);
          const research = room.memoryResearch();
          return sendJson(response, 200, { dataset: manifest, dir, trained: ollama.madreModel ?? null, readiness: ready, maturity: maturity({ readiness: ready, notes, links: research?.links ?? [], stats: research?.stats ?? null }), training: await trainingInfo() });
        }
        // Every conversation of the project, not only the one open: a turn answered in another
        // conversation is as much the project's as the one on screen.
        const events = await projectEvents();
        // D-S15: in the room of Salas, what each project that lets it has to teach the Coordinator.
        const linked = salasRoom ? await gatherLinked(dir) : [];
        const result = await exportDataset({ events, notes, dir, project: basename(canonicalProjectRoot), home: homedir(), privacy, linked });
        await room.record('dataset.exported', { pairs: result.pairs, turns: result.turns, notes: result.notes, train: result.train, valid: result.valid, dir, ...(salasRoom ? { linked: result.linked.map((one) => ({ room: one.room, notes: one.notes, source: one.source })) } : {}) });
        const after = datasetReadiness(events, notes);
        const drawn = room.memoryResearch();
        return sendJson(response, 200, { dataset: result, dir, trained: ollama.madreModel ?? null, readiness: after, maturity: maturity({ readiness: after, notes, links: drawn?.links ?? [], stats: drawn?.stats ?? null }), training: await trainingInfo() });
      }
      // PRIVACY: the terms live in config.json only; the ledger records counts, never words.
      // Which language MADRE speaks. The page keeps its own copy so the first paint needs no
      // round trip; this is the durable one, shared by every browser on this machine.
      // The looks every page shares (src/looks.mjs): Home and each project are different origins,
      // so the browser alone kept a choice for one page only.
      if (request.method === 'GET' && url.pathname === '/api/looks') return sendJson(response, 200, { ...await readLooks(root, { room: basename(roomDir) }), custom: await readWallpaper(root) });
      // Your own wallpaper (src/looks.mjs, 1.0.3): one picture, kept once for every page. Served as
      // the picture it is, never sniffed into anything else; written only from this page.
      if (request.method === 'GET' && url.pathname === '/api/looks/wallpaper') {
        const picture = await wallpaperBytes(root);
        if (!picture) return sendJson(response, 404, { error: t('There is no picture of yours here.') });
        response.writeHead(200, { 'content-type': picture.type, 'content-length': picture.bytes.length, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" });
        return response.end(picture.bytes);
      }
      if (request.method === 'PUT' && url.pathname === '/api/looks/wallpaper') {
        let bytes;
        try { bytes = await rawBody(request, WALLPAPER_BYTES); } catch { return sendJson(response, 413, { error: t('The picture is larger than 8 MB.') }); }
        let meta = null;
        try { meta = JSON.parse(decodeURIComponent(String(request.headers['x-madre-wallpaper'] ?? ''))); } catch { /* checked with the picture */ }
        const answer = await saveWallpaper(root, bytes, meta);
        if (answer.error) return sendJson(response, 400, { error: answer.error === 'type' ? t('Only a WebP, JPEG or PNG picture can be a wallpaper.') : t('That picture could not be kept.') });
        return sendJson(response, 200, answer);
      }
      if (request.method === 'POST' && url.pathname === '/api/looks/wallpaper/frame') {
        const answer = await frameWallpaper(root, await body(request).catch(() => null));
        return sendJson(response, answer.error ? 400 : 200, answer);
      }
      if (request.method === 'DELETE' && url.pathname === '/api/looks/wallpaper') return sendJson(response, 200, await dropWallpaper(root));
      // This project's own wallpaper («only in this project»), or back to the shared one with null.
      if (request.method === 'POST' && url.pathname === '/api/looks/room') {
        const payload = await body(request).catch(() => ({}));
        const answer = await changeRoomLook(root, basename(roomDir), payload?.wallpaper ?? null);
        return sendJson(response, answer.error ? 400 : 200, answer);
      }
      // How Home is arranged (src/looks.mjs, home.json): the same on every port Home is shown from.
      if (request.method === 'GET' && url.pathname === '/api/home-layout') return sendJson(response, 200, await readHome(root));
      if (request.method === 'POST' && url.pathname === '/api/home-layout') {
        const answer = await changeHome(root, await body(request).catch(() => null));
        return sendJson(response, answer.error ? 400 : 200, answer);
      }
      if (request.method === 'POST' && url.pathname === '/api/looks') {
        const answer = await changeLooks(root, await body(request).catch(() => null));
        return sendJson(response, answer.error ? 400 : 200, answer);
      }
      if (request.method === 'POST' && url.pathname === '/api/language') {
        const payload = await body(request).catch(() => ({}));
        const language = payload.language === 'en' ? 'en' : 'es';
        await updateConfig(root, { language });
        languageChosen = true;
        setRoomLanguage(process.env.PULSE_LANGUAGE ?? language);
        return sendJson(response, 200, { language });
      }
      if (request.method === 'GET' && url.pathname === '/api/privacy') {
        await refreshPrivacy();
        return sendJson(response, 200, { terms: privacy.terms, marker: privacy.marker, ...privacy.guards, exposure: room.privacyExposure(await projectEvents()) });
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
        return sendJson(response, 200, { terms: privacy.terms, marker: privacy.marker, ...privacy.guards, exposure: room.privacyExposure(await projectEvents()) });
      }
      if (request.method === 'POST' && url.pathname === '/api/privacy/purge') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        await refreshPrivacy();
        if (!privacy.enabled) return sendJson(response, 412, { error: t('No hidden data is set. Write it first.') });
        const result = await room.purgePrivate();
        // The log was rewritten in place: the broadcaster's byte offset is stale, the sequences are not.
        mainFeed.offset = (await store.tail(0)).offset;
        // And every other conversation of the project too (LOG-03 of the 1.0 review): the purge
        // cleaned only the one on screen, the others kept the words in plain text and sent them to
        // the providers the next time they were opened, while the count said nothing was left.
        for (const { store: other, held } of await otherLedgers()) {
          const done = await other.rewrite((event) => {
            const { value, hits } = privacy.redactDeep(event.payload);
            return hits ? { ...event, payload: value } : event;
          });
          result.events += done.changed;
          if (held?.feed) held.feed.offset = (await other.tail(0)).offset;
        }
        return sendJson(response, 200, { purged: result, exposure: room.privacyExposure(await projectEvents()) });
      }
      // The human's verdict on a reply, for the dataset: good, bad, none.
      if (request.method === 'POST' && url.pathname === '/api/messages/rate') {
        const payload = await body(request).catch(() => ({}));
        try {
          const here = await scopeOf(url);
          if (here.error) return sendJson(response, 404, here);
          const event = await here.room.rateMessage(String(payload.messageId ?? ''), String(payload.rating ?? ''));
          return sendJson(response, 200, { rated: event.payload });
        } catch (error) { return sendJson(response, 400, { error: error.message }); }
      }
      // Release channel: current, latest on npm, and the command for how this copy runs.
      // What this version brings, once, to someone who came from an older one.
      if (request.method === 'GET' && url.pathname === '/api/whats-new') {
        // `version`, with `any`: another version's sheet, to look at it before it ships. It reads
        // and never marks anything as seen; only a sheet with notes can be asked for.
        const any = url.searchParams.get('any') === '1';
        const asked = url.searchParams.get('version');
        const version = any && asked && notesFor(asked) ? asked : PACKAGE.version;
        const news = await whatsNew({ root, version, returning: novelty.returning, any });
        return sendJson(response, 200, { ...news, preview: version !== PACKAGE.version, newest: newestNotes(), changes: { es: releaseUrl(PACKAGE.repository, version, 'es'), en: releaseUrl(PACKAGE.repository, version, 'en') } });
      }
      if (request.method === 'POST' && url.pathname === '/api/whats-new/seen') {
        await markSeen(root, PACKAGE.version);
        return sendJson(response, 200, { seen: PACKAGE.version });
      }
      // Asking for a star or a review (src/review-ask.mjs): a page in view says so once a minute and
      // hears whether a moment is due; the answer ends the asking or lets that moment pass. A phone
      // is never asked.
      if (request.method === 'POST' && url.pathname === '/api/review-ask/tick') {
        if (viaPhone) return sendJson(response, 200, { due: null });
        // Never on the day of the bonjour: one welcome is enough for a day.
        return sendJson(response, 200, await tickAsk(root, Date.now(), { quietSince: (await readTour(root)).bonjourAt }));
      }
      if (request.method === 'POST' && url.pathname === '/api/review-ask/answer') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        const payload = await body(request).catch(() => ({}));
        const result = await answerAsk(root, { moment: String(payload.moment ?? ''), answer: String(payload.answer ?? '') });
        if (result.error) return sendJson(response, 422, { error: t('That is not an answer to this question.') });
        return sendJson(response, 200, result);
      }
      // The welcome of 1.0 (src/tour.mjs): where the person is in it, kept in ~/.pulse for every
      // project and port, and the projects of 0.7.2 brought to Home. Only the pages of this Mac:
      // a phone never gets the bonjour, and nothing here is changed from anywhere else.
      if (url.pathname === '/api/tour' || url.pathname.startsWith('/api/tour/')) {
        const host = String(request.headers.host ?? '');
        const site = request.headers['sec-fetch-site'];
        const fromHere = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) && (site === undefined || site === 'same-origin' || site === 'none');
        if (request.method === 'GET' && url.pathname === '/api/tour') {
          const state = await readTour(root);
          if (viaPhone || !fromHere) return sendJson(response, 200, { version: TOUR_VERSION, state, owed: false, returning: false, chapters: CHAPTERS, hints: HINTS });
          // Where this person comes from: the tour of 1.0 (path «since»), 0.7.2 (their words in a room's
          // record, path «back»), or nowhere — a first install.
          const from = state.path === 'since' || (!state.path && state.before === '1.0') ? '1.0' : (state.path ? state.path === 'back' : await cameBefore(root)) ? '0.7.2' : null;
          return sendJson(response, 200, { version: TOUR_VERSION, state, owed: !state.bonjourAt, returning: Boolean(from), from, chapters: CHAPTERS, hints: HINTS });
        }
        if (viaPhone || !fromHere || (request.method === 'POST' && request.headers.origin !== `http://${host}`)) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        if (request.method === 'POST' && url.pathname === '/api/tour') {
          const changed = await changeTour(root, await body(request).catch(() => null));
          if (changed.error) return sendJson(response, 422, { error: t('That is not a change to the tour.') });
          return sendJson(response, 200, { state: changed });
        }
        if (request.method === 'GET' && url.pathname === '/api/tour/projects') {
          return sendJson(response, 200, { rooms: await roomsWithoutProject(root) });
        }
        if (request.method === 'POST' && url.pathname === '/api/tour/projects') {
          const payload = await body(request).catch(() => ({}));
          const found = await recoverProject({ stateRoot: root, home: process.env.PULSE_LOBBY_HOME || homedir(), id: String(payload.id ?? '') });
          if (found.error) return sendJson(response, 404, { error: t('MADRE does not know that project on this Mac.') });
          return sendJson(response, 200, found);
        }
        return sendJson(response, 404, { error: 'Not found' });
      }
      if (request.method === 'GET' && url.pathname === '/api/version') {
        return sendJson(response, 200, await versionView({ force: url.searchParams.get('force') === '1' }));
      }
      // One click: install the newer version and come back on the same port. The room records it,
      // closes its listener so the port is free, hands the command to a detached shell and exits.
      if (request.method === 'POST' && url.pathname === '/api/updates/apply') {
        const info = await versionView();
        if (!info.available) return sendJson(response, 409, { error: `Nothing to apply: ${info.current} is the latest MADRE knows of.` });
        if (install === 'source') return sendJson(response, 412, { error: t('This copy runs from source: pull the repository and start it again.') });
        const command = applyCommand({ install, name: PACKAGE.name, version: info.latest, port: request.socket.localPort, projectRoot: canonicalProjectRoot });
        const fetching = fetchCommand({ name: PACKAGE.name, version: info.latest });
        // Only a version semver would write reaches a shell, and the restart never runs without the
        // download first (src/updates.mjs): an unchecked one used to skip the download and run.
        if (!command || !fetching) return sendJson(response, 412, { error: t('The version the registry gave ({version}) is not one MADRE installs.', { version: String(info.latest).slice(0, 40) }) });
        if (room.activeTurns().length || room.activePlans().length) return sendJson(response, 409, { error: t('Agents are still working. STOPALL or wait, then update.') });
        {
          // npm is a .cmd on Windows and needs a shell there; every argument here is fixed or checked above.
          const fetched = await new Promise((resolve) => execFile(fetching.command, fetching.args, { cwd: root, timeout: 180000, shell: process.platform === 'win32', windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => resolve(error ? (String(stderr || error.message).split('\n').map((line) => line.trim()).find((line) => line && !/complete log|^npm (error|ERR!)(\s+code\b.*)?\s*$/i.test(line)) ?? error.message) : null)));
          if (fetched !== null) {
            await room.record('room.update.refused', { from: info.current, to: info.latest, error: fetched.slice(0, 300) });
            return sendJson(response, 502, { error: t('npm does not hand out {version} yet; a new release can take a few minutes. The project stays open: try again in a moment.', { version: info.latest }) });
          }
        }
        await room.record('room.updating', { from: info.current, to: info.latest, install, command });
        sendJson(response, 202, { restarting: true, from: info.current, to: info.latest, command });
        setTimeout(() => {
          server.close(() => {
            // Each system has its own shell: the command is one line either way.
            const shell = process.platform === 'win32' ? { file: process.env.COMSPEC ?? 'cmd.exe', args: ['/d', '/s', '/c', command] } : { file: '/bin/sh', args: ['-c', command] };
            // What the new copy says on the way up lands beside the ledger: if it never comes back,
            // this file is the only witness.
            let log = 'ignore';
            try { log = openSync(join(roomDir, 'update.log'), 'a'); } catch { /* no witness, still restart */ }
            const child = spawn(shell.file, shell.args, { cwd: canonicalProjectRoot, detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, PULSE_UPDATE_RESTART: '1' } });
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
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        const result = await room.code000({ strikes: Number(payload.strikes) || CODE000_STRIKES });
        return result ? sendJson(response, 200, { code: result.code, lockedForMs: result.lockedForMs, n: result.n }) : sendJson(response, 503, { error: t('The Security module did not respond.') });
      }
      if (request.method === 'GET' && url.pathname === '/api/memory') {
        if (!designationOk(url.searchParams.get('designation'))) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: `CODE000. THE ARCHIVE IS SEALED FOR ${Math.ceil(sealed / 60000)} MORE MINUTE${Math.ceil(sealed / 60000) === 1 ? '' : 'S'}.`, lockedForMs: sealed });
        const research = room.memoryResearch();
        if (!research) return sendJson(response, 503, { error: t('The project has no memory.') });
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
      // The MEMORY dashboard: what the archive did day by day and what it is made of. Counts
      // only, no text of any memory, so it is read like /api/maturity, without the designation.
      // What the archive says about something on the screen, for the questions a surface offers.
      // Memory text, so behind the designation like the archive itself.
      if (request.method === 'GET' && url.pathname === '/api/memory/about') {
        if (!designationOk(url.searchParams.get('designation'))) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        if ((room.motherStatus()?.lockedForMs ?? 0) > 0) return sendJson(response, 423, { notes: [] });
        return sendJson(response, 200, { notes: room.notesAbout(url.searchParams.get('text') ?? '', { limit: 3 }) });
      }
      if (request.method === 'GET' && url.pathname === '/api/memory/dashboard') {
        return sendJson(response, 200, { dashboard: memoryDashboard({ activity: room.memoryActivity(), stats: room.memoryStats() }) });
      }
      // Inside the core: the document MADRE writes in the human's name for the next turn, block
      // by block. Built on demand and stored nowhere; asking costs nothing and sends nothing.
      if (request.method === 'GET' && url.pathname === '/api/briefing') {
        const asked = url.searchParams.get('agent') ?? agents.find((agent) => agent.ready && !agent.local)?.id ?? agents[0]?.id;
        const mode = Math.min(4, Math.max(0, Number(url.searchParams.get('mode') ?? 1) || 0));
        const text = String(url.searchParams.get('text') ?? '').slice(0, 2000);
        const ash = url.searchParams.get('ash') === 'true';
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const room = here.room;
        const briefing = await room.briefing({ agent: asked, mode, text, ash });
        if (!briefing) return sendJson(response, 404, { error: `No agent "${asked}" on this computer.` });
        return sendJson(response, 200, {
          ...briefing,
          launch: await room.launch({ agent: asked, mode }),
          agents: agents.filter((agent) => agent.detected).map((agent) => ({ id: agent.id, label: agent.label, ready: agent.ready })),
        });
      }
      // The conversations of this project. One memory, one crew, one numbering; many records.
      if (request.method === 'GET' && url.pathname === '/api/chats') {
        return sendJson(response, 200, await chatsView());
      }
      if (request.method === 'POST' && url.pathname === '/api/chats') {
        if (room.busy() && !(await turnsPolicy()).enabled) return sendJson(response, 409, { error: t('A turn is running in this conversation. Let it finish, or STOP ALL, and try again.') });
        const payload = await body(request).catch(() => ({}));
        // A phone looks at conversations by their own address and never moves the one the room has
        // open: the Mac would be left showing one conversation while sending into another.
        if (viaPhone) {
          const made = await createChat(roomDir, { title: typeof payload.title === 'string' ? payload.title : null, activate: false });
          return sendJson(response, 200, { ...(await chatsView()), opened: made.id });
        }
        const made = await createChat(roomDir, { title: typeof payload.title === 'string' ? payload.title : null });
        const mounted = await mountChat(made.id);
        if (mounted.error) return sendJson(response, 409, mounted);
        return sendJson(response, 200, { ...(await chatsView()), opened: made.id });
      }
      const chatMatch = url.pathname.match(/^\/api\/chats\/([a-z0-9]+)$/);
      if (chatMatch && request.method === 'POST') {
        if (viaPhone) return sendJson(response, 200, { ...(await chatsView()), opened: chatMatch[1] });
        const mounted = await mountChat(chatMatch[1]);
        if (mounted.error) return sendJson(response, 409, mounted);
        return sendJson(response, 200, { ...(await chatsView()), opened: chatMatch[1] });
      }
      if (chatMatch && request.method === 'PATCH') {
        const payload = await body(request).catch(() => ({}));
        const named = await renameChat(roomDir, chatMatch[1], payload.title);
        return named ? sendJson(response, 200, { ...(await chatsView()) }) : sendJson(response, 404, { error: t('No such conversation.') });
      }
      if (chatMatch && request.method === 'DELETE') {
        if ((chatMatch[1] === chatId && room.busy()) || parked.get(chatMatch[1])?.room.busy()) return sendJson(response, 409, { error: t('A turn is running in this conversation.') });
        // Open beside the one on screen and idle: its room closes, and the page watching it hears
        // its stream end, before its record goes.
        await closeHeld(chatMatch[1]);
        const gone = await deleteChat(roomDir, chatMatch[1]);
        if (!gone) return sendJson(response, 404, { error: t('No such conversation.') });
        if (gone.error) return sendJson(response, 409, gone);
        // What the archivist distilled from it is the project's memory and stays where it is.
        if (chatMatch[1] === chatId) { const mounted = await mountChat(gone.active); if (mounted.error) return sendJson(response, 409, mounted); }
        return sendJson(response, 200, { ...(await chatsView()), deleted: gone.deleted });
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
        if (!text.trim()) return sendJson(response, 400, { error: t('That file is empty.') });
        if (text.length > 400_000) return sendJson(response, 413, { error: t('A module file that big is not a module. Keep it under 400 KB.') });
        if (!/\.m?js$/.test(name)) return sendJson(response, 400, { error: t('A module is a .mjs file.') });
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
        if (!module?.external) return sendJson(response, 404, { error: t('Only a module you installed yourself can be refreshed.') });
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
          // What the plan does once the command is done (Ollama: restart the old server). If it could
          // not, that is the outcome: «now runs <the old version>» would read as an update that worked.
          const settled = result.code === 0 ? await (async () => plan.after?.())().catch((error) => ({ ok: false, error: error.message })) : null;
          const after = await module.describe(await moduleContext()).catch(() => null);
          await room.record('extension.install.finished', {
            id: module.id, name: item.name, ok: result.code === 0 && settled?.ok !== false, installed: Boolean(after?.version),
            detail: result.code !== 0 ? (result.error ?? `exit ${result.code}`)
              : settled?.ok === false ? settled.error
                : `${item.name} now runs ${after?.version ?? 'what it found'}`,
          });
          installing = null;
        })();
        return sendJson(response, 202, { running: true, command: plan.display });
      }
      // A question the human has no use for. It stops being offered; nothing else changes.
      if (request.method === 'POST' && url.pathname === '/api/memory/ask/dismiss') {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        const done = room.dismissAsk(String(payload.id ?? '').slice(0, 80));
        return done ? sendJson(response, 200, done) : sendJson(response, 404, { error: t('The project has no memory.') });
      }
      // One memory's own traffic: who it keeps arriving with, who asked for it, what a
      // refutation did. Read while its card is open, so the card is alive rather than a snapshot.
      const trafficMatch = request.method === 'GET' && url.pathname.match(/^\/api\/memory\/(\d+)\/traffic$/);
      if (trafficMatch) {
        if (!designationOk(url.searchParams.get('designation'))) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        const sealed = room.motherStatus()?.lockedForMs ?? 0;
        if (sealed > 0) return sendJson(response, 423, { error: t('TEMPORARY LOCK. THE ARCHIVE IS SEALED.'), lockedForMs: sealed });
        const traffic = room.memoryTraffic(Number(trafficMatch[1]));
        return traffic ? sendJson(response, 200, traffic) : sendJson(response, 404, { error: t('No such memory.') });
      }
      const forgetMatch = request.method === 'DELETE' && url.pathname.match(/^\/api\/memory\/(\d+)$/);
      if (forgetMatch) {
        const payload = await body(request).catch(() => ({}));
        if (!designationOk(payload.designation)) return sendJson(response, 403, { error: t('UNABLE TO COMPUTE. UNABLE TO CLARIFY.') });
        if ((room.motherStatus()?.lockedForMs ?? 0) > 0) return sendJson(response, 423, { error: t('TEMPORARY LOCK. THE ARCHIVE IS SEALED.') });
        const row = await room.forgetMemory(forgetMatch[1]);
        return row ? sendJson(response, 200, { forgotten: row, stats: room.memoryStats() }) : sendJson(response, 404, { error: t('No such memory.') });
      }
      if (request.method === 'POST' && url.pathname === '/api/agents/probe') {
        // Look for the binaries again too: a CLI installed a moment ago must appear now.
        await redetectAgents();
        return sendJson(response, 200, { sessions, sessionsAt, loggingIn, login: loginState(), agents: agents.map((agent) => ({ ...agent, login: loginPlanFor(agent), install: installPlanFor(agent), key: keyPlanFor(agent.id), ...(accountNoteFor(agent.id) ?? {}) })) });
      }
      // A provider key for a CLI that signs in from its own prompt. Local connections only: a key
      // pasted from another machine would travel the network. It is written where that CLI looks
      // A connector's secret. Same rule as an agent's key and for the same reason: it is accepted
      // only from this computer, never over the network. What differs is where it lands — a
      // connector has no CLI to hand it to, so MADRE holds it, in its own vault, `0600`, and never
      // in the config, the ledger or a log. The ledger records that one was set and under which
      // name; the value never leaves src/vault.mjs except to the module that owns it.
      const vaultMatch = url.pathname.match(/^\/api\/x\/([a-z0-9-]+)\/secret$/);
      if (vaultMatch && (request.method === 'POST' || request.method === 'DELETE')) {
        const id = vaultMatch[1];
        const address = request.socket.remoteAddress ?? '';
        if (viaPhone || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
          return sendJson(response, 403, { error: t('A key is only accepted from this computer, never over the network.') });
        }
        const module = moduleById(id);
        if (!module) return sendJson(response, 404, { error: t('No module by that name is loaded.') });
        const payload = await body(request).catch(() => ({}));
        const name = String(payload.name ?? '');
        if (request.method === 'DELETE') {
          const gone = await forgetSecret(root, id, payload.name === undefined ? null : name);
          if (!gone.ok) return sendJson(response, 400, { error: gone.error });
          await room.record('module.secret.forgotten', { module: id, name: gone.forgot });
          return sendJson(response, 200, { ok: true, held: await vaultSummary(root, id) });
        }
        const kept = await writeSecret(root, id, name, payload.secret);
        if (!kept.ok) return sendJson(response, 400, { error: kept.error });
        // The name and the length, never the secret — the same way privacy counts its terms.
        await room.record('module.secret.kept', { module: id, name: kept.name, bytes: kept.bytes });
        return sendJson(response, 200, { ok: true, held: await vaultSummary(root, id) });
      }
      // for it and never reaches MADRE's config, its ledger or its logs.
      const keyMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/key$/);
      if (keyMatch) {
        const id = keyMatch[1];
        const address = request.socket.remoteAddress ?? '';
        if (viaPhone || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
          return sendJson(response, 403, { error: t('A key is only accepted from this computer, never over the network.') });
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
        const payload = await body(request).catch(() => ({}));
        const result = await loginAgent(loginMatch[1], { method: payload.method ? String(payload.method) : null });
        return sendJson(response, result.status, result.body);
      }
      // The code the sign-in page gives back. It is a credential while it lives, so it is taken
      // from this computer only — the same rule as a key — and it never reaches the ledger.
      const loginCodeMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/login\/code$/);
      if (loginCodeMatch) {
        const address = request.socket.remoteAddress ?? '';
        if (viaPhone || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
          return sendJson(response, 403, { error: t('A key is only accepted from this computer, never over the network.') });
        }
        const payload = await body(request).catch(() => ({}));
        const result = await answerLogin(loginCodeMatch[1], payload.code);
        return sendJson(response, result.status, result.body);
      }
      const loginStopMatch = request.method === 'POST' && url.pathname.match(/^\/api\/agents\/([a-z0-9-]+)\/login\/cancel$/);
      if (loginStopMatch) {
        const result = await cancelLogin(loginStopMatch[1]);
        return sendJson(response, result.status, result.body);
      }
      if (request.method === 'GET' && url.pathname === '/api/models') {
        // `--verbose` adds each model's metadata, its «variants» (the reasoning rungs) among it.
        const listOpenCode = async (opencode) => {
          const lines = [];
          await runInstaller({ command: opencode.path, args: ['models', '--verbose'], projectRoot: canonicalProjectRoot, timeoutMs: 30000, onLine: (line) => { lines.push(line); } });
          return parseOpenCodeVerbose(lines);
        };
        return sendJson(response, 200, { models: await discoverModels({ agents, config: await readConfig(root), listOpenCode: url.searchParams.get('opencode') === '1' ? listOpenCode : async () => [] }) });
      }
      // OpenCode's providers for AJUSTES: who has a key or an account, what each offers, which are
      // left out of the chooser. Never a key: only that one is there and of what kind.
      if (request.method === 'GET' && url.pathname === '/api/agents/opencode/providers') {
        const opencode = agents.find((agent) => agent.id === 'opencode');
        if (!opencode?.detected) return sendJson(response, 404, { error: t('OpenCode is not installed.') });
        const names = [];
        await runInstaller({ command: opencode.path, args: ['models'], projectRoot: canonicalProjectRoot, timeoutMs: 20000, onLine: (line) => { if (/^[\w.-]+\/[\w.:/-]+$/.test(line.trim())) names.push(line.trim()); } });
        const config = await readConfig(root);
        const hidden = new Set(openCodeHidden(config));
        const signed = new Map((await readOpenCodeProviders({ home: credentialHome })).map((one) => [one.id, one.type]));
        const groups = new Map(groupOpenCode(names).map((group) => [group.id, group]));
        // Every provider a key opens, from OpenCode's own catalogue (credentials.mjs), plus the
        // ones already signed in or listing models.
        const keyable = new Map((await openCodeKeyProviders({ home: credentialHome })).map((one) => [one.id, one]));
        const ids = [...new Set([...keyable.keys(), ...signed.keys(), ...groups.keys()])];
        const providers = ids.map((id) => {
          const known = keyable.get(id);
          const own = id === OPENCODE_OWN;
          const via = own ? 'own' : signed.get(id) ?? null;
          return { id, label: known?.label ?? providerLabel(id), keyUrl: known?.keyUrl ?? null, takesKey: Boolean(known), featured: Boolean(known?.featured), via, models: groups.get(id)?.models ?? [], hidden: hidden.has(id) };
        }).sort((a, b) => Number(Boolean(b.via)) - Number(Boolean(a.via)) || Number(a.via === 'own') - Number(b.via === 'own') || a.label.localeCompare(b.label));
        return sendJson(response, 200, { providers, default: process.env.PULSE_OPENCODE_MODEL ?? null });
      }
      // A provider's key out of OpenCode, from this computer only, the same rule as putting one in.
      if (request.method === 'POST' && url.pathname === '/api/agents/opencode/providers/remove') {
        const address = request.socket.remoteAddress ?? '';
        if (viaPhone || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return sendJson(response, 403, { error: t('A key is only changed from this computer, never over the network.') });
        const opencode = agents.find((agent) => agent.id === 'opencode');
        if (!opencode?.detected) return sendJson(response, 412, { error: t('OpenCode is not installed.') });
        const payload = await body(request).catch(() => ({}));
        const result = await removeOpenCodeKey({ provider: payload.provider, home: credentialHome, executable: opencode.path ?? 'opencode' });
        if (!result.ok) return sendJson(response, 422, { error: result.error });
        await refreshSessions();
        await room.record('connection.key.removed', { agent: 'opencode', label: opencode.label, provider: payload.provider });
        return sendJson(response, 200, { ok: true });
      }
      if (request.method === 'GET' && url.pathname === '/api/agents/opencode/models') {
        const opencode = agents.find((agent) => agent.id === 'opencode');
        if (!opencode?.detected) return sendJson(response, 404, { error: t('OpenCode is not installed.') });
        const models = [];
        await runInstaller({ command: opencode.path, args: ['models'], projectRoot: canonicalProjectRoot, timeoutMs: 20000, onLine: (line) => { if (/^[\w.-]+\/[\w.:-]+$/.test(line.trim())) models.push(line.trim()); } });
        return sendJson(response, 200, { models });
      }
      // One answer, not the room. The master brake lives next door and means something else.
      if (request.method === 'POST' && url.pathname === '/api/stop-turn') {
        const payload = await body(request).catch(() => ({}));
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const stopped = await here.room.stopTurn(String(payload.messageId ?? ''));
        return sendJson(response, stopped ? 200 : 404, stopped ? { stopped: true } : { error: t('That turn is not running any more.') });
      }
      // TURNS, read and set from MU/TH/UR. The limits apply to the next message; nothing running stops.
      if (request.method === 'GET' && url.pathname === '/api/turns') {
        return sendJson(response, 200, { turns: await turnsPolicy(), working: { here: room.turnsRunning(), chats: busyChats().length + (room.busy() ? 1 : 0) } });
      }
      if (request.method === 'POST' && url.pathname === '/api/turns') {
        const patch = await body(request).catch(() => ({}));
        const current = (await readConfig(root)).turns ?? {};
        const next = { ...current };
        if (typeof patch.enabled === 'boolean') next.enabled = patch.enabled;
        for (const key of ['chats', 'turnsPerChat']) if (Number.isInteger(Number(patch[key])) && Number(patch[key]) >= 1) next[key] = Number(patch[key]);
        await updateConfig(root, { turns: next });
        await room.record('room.turns', { turns: await turnsPolicy() });
        return sendJson(response, 200, { turns: await turnsPolicy() });
      }
      if (request.method === 'POST' && url.pathname === '/api/stop-all') {
        // Every conversation at work, not only the one on screen: the brake is the room's, not the chat's.
        const result = await room.stopAll();
        passes.clear();
        await endCopilot('stopall');
        for (const held of parked.values()) {
          const more = await held.room.stopAll().catch(() => ({ plans: 0, turns: 0 }));
          result.plans += more.plans ?? 0;
          result.turns += more.turns ?? 0;
        }
        return sendJson(response, 202, { stopped: true, ...result });
      }
      const stopMatch = request.method === 'POST' && url.pathname.match(/^\/api\/plans\/([0-9a-f-]+)\/stop$/);
      if (stopMatch) {
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const stopped = await here.room.stopPlan(stopMatch[1]);
        return sendJson(response, stopped ? 202 : 404, stopped ? { stopped: true } : { error: t('No running plan with that id.') });
      }
      // One line of a ```pulse-run, pressed by the human. The body names the request and the line;
      // the command itself is read from the room's record, never from the page.
      // STOP on one running command's card: a server, or anything still at it.
      if (request.method === 'POST' && url.pathname === '/api/runs/stop') {
        const payload = await body(request).catch(() => ({}));
        const index = Number(payload.index);
        if (typeof payload.responseMessageId !== 'string' || !Number.isInteger(index) || index < 0) return sendJson(response, 400, { error: t('Name the request and the line to run.') });
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        return here.room.stopRun({ responseMessageId: payload.responseMessageId, index }) ? sendJson(response, 202, { stopped: true }) : sendJson(response, 404, { error: t('That command is not running.') });
      }
      if (request.method === 'POST' && url.pathname === '/api/runs') {
        const payload = await body(request).catch(() => ({}));
        const index = Number(payload.index);
        if (typeof payload.responseMessageId !== 'string' || !Number.isInteger(index) || index < 0) return sendJson(response, 400, { error: t('Name the request and the line to run.') });
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const outcome = await here.room.runRequested({ responseMessageId: payload.responseMessageId, index, returnCap: viaPhone ? PHONE_MAX_MODE : 3 });
        return sendJson(response, outcome.status, outcome.ok ? outcome.result : { error: outcome.error });
      }
      // The human ran some lines of a request and hands back what there is, without the rest.
      if (request.method === 'POST' && url.pathname === '/api/runs/return') {
        const payload = await body(request).catch(() => ({}));
        if (typeof payload.responseMessageId !== 'string') return sendJson(response, 400, { error: t('Say which request to hand back.') });
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const outcome = await here.room.returnRun({ responseMessageId: payload.responseMessageId, returnCap: viaPhone ? PHONE_MAX_MODE : 3 });
        return sendJson(response, outcome.status, outcome.ok ? outcome : { error: outcome.error });
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
        if (!parsed) return sendJson(response, 400, { error: t('Not a command. Commands start with "/" followed by a name.') });
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
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const event = await here.room.recordCommand({ name: parsed.name, args: parsed.args, ...result });
        return sendJson(response, result.ok ? 200 : 422, { command: parsed.name, title: result.title, ok: result.ok, sequence: event.sequence });
      }
      if (request.method === 'GET' && url.pathname === '/api/extensions') {
        const extensions = await describeModules(await moduleContext());
        void warmModuleUpdates(extensions);
        return sendJson(response, 200, { installing, extensions, failures: loadFailures, folders: moduleFolders({ stateRoot: root, projectRoot: canonicalProjectRoot }), sdk: SDK_PAGE[roomLanguage()] ?? SDK_PAGE.es });
      }
      // THE MARKET's catalog for the page: the one kept here at once (and a fresh one asked for
      // behind it), what was got from it, and what it updated on its own that nobody was told yet.
      if (request.method === 'GET' && url.pathname === '/api/market') {
        const kept = await keptCatalog({ stateRoot: root, ...marketKeyed });
        const read = kept ? (void syncMarket().catch(() => null), { catalog: kept }) : await syncMarket().catch(() => ({ catalog: null }));
        return sendJson(response, 200, { catalog: read.catalog ?? null, off: !marketOn(), installed: await installedFromMarket(root), news: await marketNews(root), announce: await marketAnnouncements(root, read.catalog, MODULES.map((one) => one.id)), madre: PACKAGE.version });
      }
      if (request.method === 'POST' && url.pathname === '/api/market/seen') {
        await marketNewsSeen(root);
        return sendJson(response, 200, { ok: true });
      }
      // The Market's news a page has just told: not again, on this computer.
      if (request.method === 'POST' && url.pathname === '/api/market/announced') {
        const payload = await body(request).catch(() => ({}));
        await marketAnnounced(root, Array.isArray(payload.keys) ? payload.keys.slice(0, 50) : []);
        return sendJson(response, 200, { ok: true });
      }
      // A module from the Market onto this computer: its signed file, checked like any module, for
      // every project; then every project open right now loads it, and each one turns it on.
      if (request.method === 'POST' && url.pathname === '/api/market/install') {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        const payload = await body(request).catch(() => ({}));
        const catalog = (await keptCatalog({ stateRoot: root, ...marketKeyed })) ?? (await syncMarket({ force: true }).catch(() => ({}))).catalog;
        if (!catalog) return sendJson(response, 503, { error: t('MADRE could not reach the Market. Check your internet connection and try again.') });
        try {
          const done = await installFromMarket({ ...marketTools(), id: String(payload.id ?? ''), catalog });
          await room.record('extension.installed', { id: done.id, name: done.name, origin: 'market', version: done.version, by: 'you' });
          for (const one of await knownRooms(root)) {
            if (!one.open?.port || one.id === thisRoomId) continue;
            await fetch(`http://127.0.0.1:${one.open.port}/api/extensions/reload`, { method: 'POST' }).catch(() => null);
          }
          return sendJson(response, 200, { installed: done, extensions: await describeModules(await moduleContext()) });
        } catch (error) { return sendJson(response, 422, { error: error.message }); }
      }
      // Home's view of which projects each module is on in (module-scope.mjs), and where the
      // modules that install into a project's folder are installed.
      if (request.method === 'GET' && url.pathname === '/api/modules/scope') {
        const config = await readConfig(root);
        const home = salasRoomId(root);
        const projects = (await knownRooms(root)).filter((one) => one.id !== home && one.root).map((one) => ({ id: one.id, name: one.name, open: Boolean(one.open) }));
        const roots = new Map((await knownRooms(root)).map((one) => [one.id, one.root]));
        const ids = projects.map((one) => one.id);
        const modules = [];
        for (const module of MODULES) {
          if (module.scope && !NOT_BY_PROJECT.has(module.id)) modules.push({ id: module.id, switch: true, ...scopeView(config.modules?.[module.configKey] ?? {}, Boolean(module.defaults?.enabled), ids) });
          else if (module.kind === 'installer' && module.detect) {
            const on = [];
            for (const id of ids) if ((await module.detect(roots.get(id)).catch(() => null))?.installed) on.push(id);
            modules.push({ id: module.id, switch: false, on, everywhere: false });
          }
        }
        return sendJson(response, 200, { projects, modules });
      }
      // The keys modules put beside MADRE's version (sdk.mjs, `footer`): only those on here.
      if (request.method === 'GET' && url.pathname === '/api/modules/footer') {
        const context = await moduleContext();
        const keys = MODULES.filter((module) => module.footer?.length && module.settingsFrom?.(context.config, context.roomId)?.enabled).map((module) => ({ id: module.id, name: module.name, footer: module.footer }));
        return sendJson(response, 200, { keys });
      }
      // Home's word: every project (`all`), or some (`rooms`). A project's own MODULES moves only its word.
      const scopeMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/scope$/);
      if (scopeMatch) {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        const module = moduleById(scopeMatch[1]);
        if (!module?.scope || NOT_BY_PROJECT.has(module.id)) return sendJson(response, 404, { error: t('That module is not turned on by project.') });
        const payload = await body(request).catch(() => ({}));
        const result = await module.scope(await moduleContext(), { all: payload.all, rooms: payload.rooms, confirm: payload.confirm });
        for (const held of parked.values()) await applyRoomSettings(held.room, null);
        return sendJson(response, result.status, result.body);
      }
      // The human installs a module file an agent wrote (or they did): checked first, then copied into the chosen folder.
      if (request.method === 'POST' && url.pathname === '/api/extensions/install-file') {
        const payload = await body(request).catch(() => ({}));
        const relative = String(payload.path ?? '').replace(/^\/+/, '');
        if (!relative || relative.includes('..')) return sendJson(response, 400, { error: t('Give the project-relative path of a <id>.module.mjs file.') });
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
          await forgetFromMarket(root, removed.id).catch(() => false);
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
      // What a module offers to put right before it can install (Continuity on a Mac with no git:
      // Apple's installer for its command line tools). Asked from this Mac only; the command is the
      // module's own, never one sent by the page.
      const fixMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/fix$/);
      if (fixMatch) {
        if (viaPhone) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        const extension = extensionById(fixMatch[1]);
        const checked = extension?.preflight ? await extension.preflight(canonicalProjectRoot) : null;
        if (!checked?.fix) return sendJson(response, 409, { error: t('There is nothing to set up for this module.') });
        const ran = await runInstaller({ command: checked.fix.command, args: checked.fix.args, projectRoot: canonicalProjectRoot, timeoutMs: 60000 });
        await room.record('extension.fix.started', { id: fixMatch[1], command: checked.fix.display, code: ran.code });
        return sendJson(response, ran.code === 0 ? 202 : 500, ran.code === 0 ? { started: true, command: checked.fix.display } : { error: ran.error ?? t('It could not be started.') });
      }
      const installMatch = request.method === 'POST' && url.pathname.match(/^\/api\/extensions\/([a-z0-9-]+)\/install$/);
      if (installMatch) {
        // A phone switches MADRE's own modules; installing one runs commands in the project.
        if (viaPhone && !extensionById(installMatch[1])?.toggle) return sendJson(response, 403, { error: t('This is done on the Mac.') });
        const result = await installExtension(installMatch[1], await body(request));
        return sendJson(response, result.status, result.body);
      }
      if (request.method === 'POST' && /^\/api\/control\/[\w-]+\/undo$/.test(url.pathname)) {
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        const result = await here.room.undoControl(url.pathname.split('/')[3]);
        return sendJson(response, result.ok ? 200 : result.status ?? 400, result);
      }
      if (request.method === 'POST' && /^\/api\/modes\/[\w-]+\/decide$/.test(url.pathname)) {
        const requestId = url.pathname.split('/')[3];
        const { decision, key } = await body(request);
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        if (!['once', 'plan', 'deny'].includes(decision)) return sendJson(response, 400, { error: t('Decision must be once, plan or deny.') });
        const asked = here.room.modeRequest(requestId);
        if (!asked) return sendJson(response, 409, { error: t('That request is no longer pending.') });
        if (decision !== 'deny' && asked.mode > PHONE_MAX_MODE) {
          if (viaPhone) return sendJson(response, 403, { error: t('#3 EDIT and #4 FULL ACCESS are opened from the Mac.') });
          if (!spendPass(key, asked.agent, asked.mode)) return sendJson(response, 403, { error: t('#{n} needs your confirmation. Unlock it again and send.', { n: asked.mode }), needsKey: true });
        }
        const result = here.room.decideMode(requestId, decision);
        return sendJson(response, result.ok ? 200 : 409, result);
      }
      if (request.method === 'POST' && url.pathname === '/api/messages') {
        const payload = await body(request);
        // A phone asks up to #2. The bridge already said so; the room says it again, and records
        // where the message came from. Only the bridge's word counts for that, never the body's.
        if (viaPhone) {
          const written = writtenMode(payload.text);
          // Read the way the room reads it: «"4"» is #4 there, so it is #4 here (TEL-01).
          if (Math.max(normalizeMode(payload.mode, payload.create === true ? 2 : 1), written) > PHONE_MAX_MODE) return sendJson(response, 403, { error: t('#3 EDIT and #4 FULL ACCESS are opened from the Mac.') });
          payload.via = phoneKind;
        } else delete payload.via;
        // `?chat=` sends into a conversation held open beside the one on screen. TURNS counts it
        // like any other: the conversation on screen is one of the "others" when it is working.
        const here = await scopeOf(url);
        if (here.error) return sendJson(response, 404, here);
        // A switch moved in Home since this project opened reaches it here (module-scope.mjs).
        applyModuleSwitches(here.room, await readConfig(root));
        const room = here.room;
        // A copilot message at #3 goes with the copilot's window instead of a pass; from this
        // computer only. With the window closed it is said, and the page asks for the key again.
        if (payload.copilot === true && (viaPhone || !copilotNow())) {
          if (!viaPhone) return sendJson(response, 409, { error: t('The copilot is off: it ended or was stopped. Turn it on again, or send and confirm #3.'), copilotOff: true });
          delete payload.copilot;
        }
        // Modes are checked before the turn is accepted, so the composer
        // hears "no" with a reason instead of a silent log line.
        const gate = await room.modeCheck(payload);
        if (!gate.ok) return sendJson(response, gate.status ?? 403, { error: gate.error, mode: gate.mode, maxMode: gate.maxMode });
        const byCopilot = payload.copilot === true && gate.mode === 3;
        if (!byCopilot) delete payload.copilot;
        // #3 and #4 go with the pass their key gave, for this agent (above).
        if (gate.mode >= 3 && !byCopilot && !spendPass(payload.key, gate.agent, gate.mode)) return sendJson(response, 403, { error: t('#{n} needs your confirmation. Unlock it again and send.', { n: gate.mode }), mode: gate.mode, needsKey: true });
        delete payload.key;
        const turns = await turnsPolicy();
        if (turns.enabled) {
          if (room.turnsRunning() >= turns.turnsPerChat) return sendJson(response, 429, { error: t('This conversation already has {n} turns running, and TURNS allows {max} at a time. Wait for one to finish, open another conversation, or raise it in Diagnostics → TURNS.', { n: room.turnsRunning(), max: turns.turnsPerChat }) });
          const others = busyChats().filter((id) => id !== here.id).length + (!here.main && openRoom().busy() ? 1 : 0);
          if (!room.busy() && others + 1 > turns.chats) return sendJson(response, 429, { error: t('{n} other conversations are already working, and TURNS allows {max} at a time. Wait for one to finish, or raise it in Diagnostics → TURNS.', { n: others, max: turns.chats }) });
        } else if (!here.main && !room.busy() && openRoom().busy()) {
          // TURNS off: one conversation drives the crew at a time, beside or not.
          return sendJson(response, 409, { error: t('A turn is running in this conversation. Let it finish, or STOP ALL, and try again.') });
        }
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
      sendJson(response, 404, { error: t('Not found.') });
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
    serverSentinel.stop();
    clearTimeout(embedKick);
    unwatchOutbound();
    // In-flight agent processes are killed and their turns recorded as failed
    // before the SSE clients go away, so open pages see the outcome.
    const shutdown = Promise.all([room, ...[...parked.values()].map((held) => held.room)].map((each) => each.shutdown().catch((error) => console.error(`MADRE shutdown error: ${error.message}`))));
    // off() also ends the streams of pages watching a conversation held open beside.
    for (const held of parked.values()) held.off();
    parked.clear();
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
        nativeClose(callback);
        server.closeIdleConnections?.();
      });
    });
    return server;
  };
  server.on('close', () => quotaMonitor.stop());
  server.on('close', () => { for (const timer of aliveTimers) clearTimeout(timer); });

  server.on('close', () => { void phone.stop(); });
  return { server, store, agents, quotaMonitor, markOpen, releaseOpen, phone };
}

export async function startPulse({ port, projectRoot, openBrowser, openPath = '' }) {
  const { server, agents, markOpen, phone } = await createPulseServer({ projectRoot, quotaSources: defaultQuotaSources() });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  // The room is taken from here on, and says so on disk for anyone who tries to open it again.
  await markOpen(address.port);
  // From here this room offers to host the phone's bridge, when there is a phone to reach it.
  phone.start();
  const url = `http://127.0.0.1:${address.port}`;
  const ready = agents.filter((agent) => agent.ready).map((agent) => agent.label).join(', ') || 'none';
  const detected = agents.filter((agent) => agent.detected).map((agent) => agent.label).join(', ') || 'none';
  console.log(`\nMADRE is ready\n\n  ${url}${openPath}\n  Project: ${projectRoot}\n  Ready: ${ready}\n  Detected: ${detected}\n`);
  if (openBrowser) openUrl(`${url}${openPath}`);
  // SIGHUP too: closing the Terminal the room was started in is a way of closing it.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
  // Salas asked this room to close: the same as a signal.
  server.once('madre:close', () => server.close(() => process.exit(0)));
  return { server, url };
}
