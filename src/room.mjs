// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { invokeCodex, buildCodexArgs } from './adapters/codex.mjs';
import { t } from './i18n.mjs';
import { invokeClaude, buildClaudeArgs } from './adapters/claude.mjs';
import { invokeGemini, buildGeminiArgs } from './adapters/gemini.mjs';
import { invokeOpenCode, buildOpenCodeArgs } from './adapters/opencode.mjs';
import { invokeCursor, buildCursorArgs } from './adapters/cursor.mjs';
import { parseMessage } from './router.mjs';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { homedir } from 'node:os';
import { UsageSentinel } from './usage-sentinel.mjs';
import { BLOCK_SOURCES, buildPrompt, promptParts, sparedChars } from './room/prompt.mjs';
import { turnCost, observedRate } from './room/economy.mjs';
import { contextFor } from './room/context.mjs';
import { VERDICTS, travels } from './memory.mjs';
import { coldNotes, coldReading } from './cold.mjs';
import { questionsFor } from './asking.mjs';
import { coverageExam, consistencyExam, matchExam, exchanges, MATCH_SAMPLE, saysFor } from './exam.mjs';
import { MADRE_ADAPTER, MADRE_AGENT_ID } from './adapters/madre.mjs';
import { ControlDesk } from './room/control.mjs';
import { RunDesk } from './room/runs.mjs';
import { Attachments } from './room/attachments.mjs';
import { GhostLedger } from './room/ghost.mjs';
import { Escalation } from './room/escalation.mjs';
import { Budget, budgetTokens } from './room/budget.mjs';
import { VectorWorker } from './room/vectors.mjs';
import { Archivist, distillDefaults } from './room/archivist.mjs';
import { OLLAMA_ARCHIVIST } from './distiller.mjs';
import { memoryServerForTurn } from './memory-tools.mjs';
import { CODE000_STRIKES } from './mother.mjs';
import { parseDirectives } from './directives.mjs';
import { isValidModelName, isValidEffort, belongsElsewhere, MODEL_NOT_FOUND, codexTakes, readCodexEfforts } from './models.mjs';
import { withListPrice } from './prices.mjs';
import { MODES, SCOPES, SCOPE_LABELS, capabilitySummary, normalizeMode, resolveScopes } from './capabilities.mjs';
import { createLease, diffSnapshots, namedPaths, snapshot } from './lease.mjs';
import { stat as statFile, readdir, copyFile, readFile as readFileBytes } from 'node:fs/promises';
import { basename as baseName, join as joinPath } from 'node:path';
import { declaredTypeFor, filesChangedSince } from './files.mjs';
import { isModuleFile, sdkPaths } from './modules/index.mjs';
import { validateAshReply } from './modules/ash-policy.mjs';
import { PHONE_MAX_MODE } from './bridge/policy.mjs';
import { parseChoice, withoutChoice } from './choices.mjs';
import { parseRunRequest, withoutRunRequest, whyText, expandHome } from './runs.mjs';
import { runSettlement, returnedBlock } from './room/returns.mjs';
import { copilotSafe, copilotBrief, COPILOT_MAX_ROUNDS } from './room/copilot.mjs';
import { imageStudioFor } from './image-studio.mjs';
import { CAPABILITIES, imageModuleState } from './capabilities.mjs';
import { resolveReferences } from './files.mjs';

const VIA_KINDS = new Set(['iphone', 'ipad', 'android', 'android-tablet', 'other']);
import { redactArgs } from './launch.mjs';

// Adapters can fail with multi-line stderr or stack traces. The room keeps only
// the first meaningful line, bounded, so the event log and the UI stay readable.
export function failureMessage(error, maxLength = 500) {
  const raw = String(error?.message ?? error ?? 'Unknown error');
  const line = raw.split(/\r?\n/).map((part) => part.trim()).find(Boolean) ?? 'Unknown error';
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}

const defaultInvokers = {
  'codex-readonly': invokeCodex,
  'claude-readonly': invokeClaude,
  'gemini-readonly': invokeGemini,
  'opencode-readonly': invokeOpenCode,
  'cursor-readonly': invokeCursor,
};

// What a turn costs against MADRE's local budget. Cache reads are close to
// free at every provider, so they weigh a tenth; Codex counts cached tokens
// inside inputTokens, the other CLIs report them separately.
export { budgetTokens };

// Does a request read like "make a file"? Only a hint for the room, in the
// languages the crew actually speaks here.
const CREATION_VERB = /\b(genera(r|d)?|crea(r|d)?|escrib(e|a|ir)|guarda(r)?|produce|producir|exporta(r)?|redacta(r)?|construye|create|generate|write|save|export|produce|build|render|draw|make)\b/i;
const CREATION_OBJECT = /\b(archivo|fichero|file|pdf|md|markdown|imagen|image|png|jpe?g|svg|documento|document|docx?|csv|json|xlsx?|pptx?|html|script|carpeta|folder|reporte|report|informe|entregable|poster|logo|diagrama|diagram)\b/i;
// Unless it says, in so many words, not to write yet: «dame un plan antes de escribir código» was
// told it had no CREATE lease, for asking for exactly the thing that needs none.
const NOT_YET = /\b(antes de|sin|todav[ií]a no|a[uú]n no)\s+(escribir|crear|generar|tocar|cambiar|modificar|programar|codificar)\b|\bno\s+(escribas|crees|generes|toques|cambies|modifiques|programes|edites)\b|\b(before|without)\s+(writing|creating|coding|touching|changing|editing)\b|\b(don'?t|do not|not yet)\s+(write|create|code|touch|change|edit)\b/i;
export const looksLikeCreation = (text) => !NOT_YET.test(String(text ?? '')) && CREATION_VERB.test(String(text ?? '')) && CREATION_OBJECT.test(String(text ?? ''));

// Which decisions the project is standing on, out of what the archive holds. A refuted one is
// kept by the archive — what was once decided is part of the record — and left out here, because
// a strip that says "decided" cannot carry something the room has since established is false.
export function settledDecisions(notes = [], { limit = 3 } = {}) {
  return notes
    // Only what still travels: a note the human judged bad, or one set aside, is not «decided»
    // (LOG-10 of the 1.0 review; `travels` is the archive's own rule, verdicts included).
    .filter((note) => note && !note.refutedBy && travels(note))
    .slice(0, limit)
    .map((note) => ({ id: note.id, text: note.text, created: note.created, agent: note.agent, fromSequence: note.fromSequence }));
}

// Open questions the room could put back on the table, newest and most-carried first.
//
// `questionsFor` has three wells; this reads only the first. The other two — memories nobody has
// ever reached for, a kind of note the archive is short of — are about the health of the archive
// and belong in NOSTROMO beside the map that shows them. What belongs under a composer is the
// narrower thing: a question this room asked, recorded as open, and never answered.
//
// Refuted and dismissed are out. Carried into more turns ranks higher, because a question the
// room keeps dragging along unanswered is the one most worth asking out loud.
export function openQuestions(notes = [], { dismissed = [], limit = 3 } = {}) {
  const skip = new Set(dismissed ?? []);
  return notes
    .filter((note) => note && note.kind === 'question' && !note.refutedBy && travels(note) && !skip.has(`open:${note.id}`))
    .sort((a, b) => (Number(b.recalled ?? 0) - Number(a.recalled ?? 0)) || (b.id - a.id))
    .slice(0, limit)
    .map((note) => ({ id: note.id, text: note.text, carried: Number(note.recalled ?? 0) }));
}

// A turn's time limit when the human set none: reading answers, writing builds.
export const READING_TIMEOUT_MS = 180000;
export const WRITING_TIMEOUT_MS = 600000;

export class Room {
  #store;
  #agents;
  #projectRoot;
  #listeners = new Set();
  #sentinel = new UsageSentinel();
  #budget;                 // room/budget: the rolling local window per agent
  #contextMaxChars;
  #memory;                 // RoomMemory: durable recall of everything said outside GHOST
  #recallShare;            // fraction of the context budget recall may take
  #cascade;                // whether recall also carries what a memory keeps arriving with
  #examRunning = null;     // the test in flight, if any
  #examProgress = null;
  #examStop = false;
  #archivist;              // room/archivist: who distils, when, and the bench
  #vectors;                // room/vectors: embeddings filled in the background
  #escalation;             // room/escalation: plan steps waiting for the human
  #ghost = new GhostLedger();
  #liveListeners = new Set();
  #quotaSaid = new Map();     // agent + source -> the last reading written to the record
  #memoryServer;           // MCP descriptor handed to every turn so the agent can query the memory itself
  #mother = null;          // MotherChannel: her coded words to the crew
  #shuttingDown = false;
  #inflight = new Set();   // top-level dispatches, from send() and MOTHER, until they settle
  // Commands an agent asked for, handed back to it once they ran (room/returns.mjs): the ones
  // waiting for the agent to be free, the ones already handed back, and the ones being handed now.
  #returns = new Map();    // responseMessageId -> { partial }
  #returned = new Set();
  #dropped = new Set();    // stopped by STOP ALL: they go back only when the human hands them back
  #returning = new Map();  // responseMessageId -> the look in progress, so two never cross
  #returnCap = new Map();  // responseMessageId -> the highest mode its results may go back at
  // The copilot (src/room/copilot.mjs): the server's window, the command requests its turns left
  // to run once the turn has let go of the project, and the rounds run by themselves in a row.
  #copilotNow = () => null;
  #copilotRuns = [];
  #copilotRounds = 0;
  #invokers;
  #agentTimeouts;
  #maxMessageChars;
  #turns = new Map();
  #plans = new Map();
  #alerted = new Map();
  #attachments = new Attachments();
  #scopeConfig = {};
  #delegation;
  #privacy = null;
  #toolsForTurn = null;
  #bishopForTurn = null;
  #linkedForTurn = null;
  // The turns running now, by the id of the answer they will write: which agent, at which mode.
  // What a tool of a turn says it is (S-021) is checked against this, never taken on its word.
  #liveTurns = new Map();
  #maxPlanSteps;
  #maxConcurrentTurns;
  #planMaxAgeMs;
  #ashEnabled = false;
  #choicesEnabled = false;
  #runsEnabled = false;
  #runDesk = new RunDesk();
  #runBusy = false;

  constructor({
    store,
    agents,
    projectRoot,
    softTokenBudget = 500000,
    contextMaxChars = 16000,
    memory = null,
    recallShare = Number(process.env.PULSE_RECALL_SHARE ?? 0.3),
    cascade = process.env.PULSE_RECALL_CASCADE !== '0',
    distill = {},
    memoryServer = null,
    mother = null,
    privacy = null,
    toolsForTurn = null,   // async ({ agent, mode, lease, scratchDir }) => MCP server specs from the modules
    bishopForTurn = null,  // async ({ agent, mode, text, preview, turn }) => bounded BISHOP context in Salas
    linkedForTurn = null,  // async ({ agent, mode, text, preview, turn }) => { text, dynamic } notes a link recalls (3e)
    copilot = null,        // () => { until } while the human's copilot window is open (src/room/copilot.mjs)
    historicalEvents = [],
    invokers = defaultInvokers,
    agentTimeouts = {},
    maxMessageChars = 20000,
    delegation = true,
    maxPlanSteps = 4,
    maxConcurrentTurns = 3,
    planMaxAgeMs = 300000,
    // The project's one CONTROL desk, when the server keeps several conversations alive at once:
    // one holder of the working tree across all of them, and an UNDO that works from any.
    controlDesk = null,
    escalationMs = Number(process.env.PULSE_ESCALATION_MS ?? 180000),
    // Where Codex keeps its config and its models' cache: the levels each model takes.
    codexHome = homedir(),
    // The desk that runs what the human pressed; tests hand in one that sees ports they choose.
    runDesk = null,
  }) {
    this.#codexHome = codexHome;
    if (runDesk) this.#runDesk = runDesk;
    this.#store = store;
    this.#agents = agents;
    this.#projectRoot = projectRoot;
    this.#contextMaxChars = contextMaxChars;
    this.#memory = memory;
    this.#recallShare = Math.min(0.6, Math.max(0, Number.isFinite(recallShare) ? recallShare : 0.3));
    this.#cascade = cascade !== false;
    this.#memoryServer = memoryServer;
    this.#mother = mother;
    this.#privacy = privacy;
    this.#toolsForTurn = toolsForTurn;
    this.#bishopForTurn = bishopForTurn;
    this.#linkedForTurn = linkedForTurn;
    this.#invokers = invokers;
    this.#agentTimeouts = agentTimeouts;
    this.#maxMessageChars = maxMessageChars;
    this.#delegation = delegation;
    this.#maxPlanSteps = maxPlanSteps;
    this.#maxConcurrentTurns = maxConcurrentTurns;
    this.#planMaxAgeMs = planMaxAgeMs;
    this.#escalation = new Escalation({ escalationMs });
    this.#copilotNow = typeof copilot === 'function' ? copilot : () => null;
    this.#controlDesk = controlDesk ?? new ControlDesk({ projectRoot });
    this.#budget = new Budget({ softBudget: softTokenBudget });
    this.#budget.seed(historicalEvents, this.#sentinel);
    // What this room has been charged per character, from its own past turns.
    this.#rate = observedRate(historicalEvents);
    this.#vectors = new VectorWorker({ memory, stopped: () => this.#shuttingDown });
    this.#archivist = new Archivist({
      memory,
      settings: distillDefaults(distill),
      deps: {
        agents: () => this.#agents,
        invokers: () => this.#invokers,
        busyAgents: () => new Set([...this.#turns.values()].map((turn) => turn.agent).filter(Boolean)),
        turnsInFlight: () => this.#turns.size,
        timeoutFor: (id) => this.timeoutFor(id),
        localTimeoutMs: () => this.#agentTimeouts.ollama ?? 300000,
        projectName: () => basename(this.#projectRoot),
        projectRoot: () => this.#projectRoot,
        emit: (type, payload) => this.#emit(type, payload),
        recordUsage: (agent, usage) => this.#recordUsage(agent, usage),
        stopped: () => this.#shuttingDown,
        failureMessage,
      },
    });
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  // Durable, non-conversational events from the server (module installs,
  // operator actions). Types are namespaced so the UI can tell them apart.
  async record(type, payload) {
    if (!/^[a-z]+(\.[a-z]+)+$/.test(type) || type.startsWith('message.') || type.startsWith('agent.')) {
      throw new Error(`Refusing to record reserved or malformed event type: ${type}`);
    }
    return this.#emit(type, payload);
  }

  // Ghost (#0) turns: their events reach the open pages but never the log,
  // so they cannot enter a handoff or survive a reload. Usage still counts,
  // because the tokens were really spent.
  // CONTROL (#3): one holder per room, every turn between two checkpoints.
  #controlDesk;
  #codexHome;
  control() { return this.#controlDesk.status(); }
  async undoControl(checkpointId) {
    const result = await this.#controlDesk.undo(checkpointId);
    if (!result.ok) return result;
    const { checkpoint, message, ...rest } = result;
    await this.#emit('control.reverted', { checkpointId, agent: checkpoint.agent, command: checkpoint.command ?? undefined, removed: rest.removed, restored: rest.restored, message });
    return { ok: true, ...rest };
  }

  // Escalation: a plan step that needs #2 while the plan runs at #1 waits
  // here for the human's word, with a clock. Nobody else can grant it.
  pendingModeRequests() { return this.#escalation.pending(); }
  async #askForMode({ planId, plan, step, index, totalSteps, orchestrator, parentMessageId, mode = 2 }) {
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + this.#escalation.ms).toISOString();
    const payload = { requestId, planId, agent: step.agent, orchestrator, mode, step: index + 1, totalSteps, text: step.text, expiresAt, message: `@${step.agent} needs #${mode} ${MODES[mode].label} for step ${index + 1}. Grant it once, for the whole plan, or deny.` };
    const pending = this.#escalation.wait(requestId, payload, plan);
    await this.#emit('mode.requested', payload);
    const decision = await pending;
    if (decision.decision === 'deny' || plan.stopped) {
      const reason = plan.stopped ? 'stopped' : decision.reason ?? 'denied';
      await this.#emit('mode.denied', { requestId, planId, agent: step.agent, mode, step: index + 1, reason, message: reason === 'timeout' ? `No answer in ${Math.round(this.#escalation.ms / 1000)}s: @${step.agent} runs step ${index + 1} at #1.` : reason === 'stopped' ? `The plan was stopped while @${step.agent} waited for #${mode}.` : `Denied: @${step.agent} runs step ${index + 1} at #1 and will say what it could not do.` });
      return { scope: null, reason };
    }
    if (mode >= 3) {
      await this.#emit('mode.granted', { requestId, planId, agent: step.agent, mode, step: index + 1, scope: decision.decision, message: `#${mode} granted to @${step.agent}${decision.decision === 'plan' ? ' for the rest of the plan' : ' for this step'}.` });
      return { scope: decision.decision, mode };
    }
    const scopes = this.scopesFor(step.agent);
    const enabled = Object.fromEntries(SCOPES.map((scope) => [scope, scopes[scope].enabled && scopes[scope].wired]));
    const lease = await this.#projectLease({ leaseId: randomUUID(), messageId: parentMessageId });
    // The turn reads its scopes from the ceiling, as every lease does (#runTurn); a lease granted
    // here had none, so every scope arrived off — no images — while the room had announced them on
    // (LOG-05 of the 1.0 review). What the human granted is the ceiling; the agent's own switches
    // still decide below it.
    lease.scopeCeiling = { write: true, imageGen: true, web: true };
    lease.scopes = enabled;
    await this.#emit('lease.granted', {
      escalated: decision.decision,
      leaseId: lease.leaseId,
      messageId: parentMessageId,
      agent: step.agent,
      outDir: lease.relativeDir,
      scratchDir: lease.scratchDir,
      scopes: SCOPES.filter((scope) => enabled[scope]),
      unavailable: SCOPES.filter((scope) => !scopes[scope].capable),
      planId,
    });
    await this.#emit('mode.granted', { requestId, planId, agent: step.agent, mode, step: index + 1, scope: decision.decision, leaseId: lease.leaseId, message: decision.decision === 'plan' ? `#${mode} granted for the rest of the plan; every writable agent creates inside one lease.` : `#${mode} granted to @${step.agent} for step ${index + 1} only.` });
    return { scope: decision.decision, lease };
  }
  // The human's answer to a pending request: 'once', 'plan' or 'deny'.
  decideMode(requestId, decision) { return this.#escalation.decide(requestId, decision); }
  modeAsked(requestId) { return this.#escalation.modeOf(requestId); }
  modeRequest(requestId) { return this.#escalation.requestOf(requestId); }
  // The modes plans are waiting for the human to grant, as asked.
  pendingModes() { return this.#escalation.pending(); }

  subscribeGhost(listener) { return this.#ghost.subscribe(listener); }

  // A live meter is not a fact about the room: it says what a turn is reading while it reads it,
  // and a second later the bill says what it really cost. Writing it to the ledger would spend a
  // sequence number on something nothing will ever recall, and shift everything said after it.
  // It goes out to whoever is watching and nowhere else.
  #say(type, payload) {
    const event = { id: `live-${randomUUID()}`, sequence: null, live: true, timestamp: new Date().toISOString(), type, payload };
    for (const listener of this.#liveListeners) listener(event);
    return event;
  }

  // Whoever is watching the room right now. Separate from the ghost channel, which carries turns
  // that happened off the record: these never happened at all, they are only being reported.
  subscribeLive(listener) {
    this.#liveListeners.add(listener);
    return () => this.#liveListeners.delete(listener);
  }
  async #emit(type, payload) {
    if (this.#ghost.isGhost(type, payload)) return this.#ghost.emit(type, payload);
    const event = await this.#store.append(type, payload);
    this.#remember([event]);
    for (const listener of this.#listeners) listener(event);
    return event;
  }

  #remember(events) {
    if (!this.#memory) return;
    try {
      if (this.#memory.index(events) > 0) this.#vectors.schedule();
    } catch (error) { console.error(`MADRE memory index failed: ${error.message}`); }
  }
  embedNow() { return this.#vectors.runNow(); }

  // Where the transcript an agent reads begins. Held still across turns on purpose: a window
  // that starts one message later every time is a window a CLI can never match against what it
  // read last turn, and the transcript is most of what a loaded turn costs.
  #contextAnchor = null;

  // Characters per input token, as this room's own turns have shown. Null until it has one.
  #rate = null;

  async #contextFor(priorEvents, { messageId, text, omitSynthetic = false, by = null }) {
    const built = await contextFor({ memory: this.#memory, priorEvents, messageId, text, contextMaxChars: this.#contextMaxChars, recallShare: this.#recallShare, remember: (events) => this.#remember(events), omitSynthetic, anchor: this.#contextAnchor, by, cascade: this.#cascade });
    // @madre reads a different transcript to everyone else, so it never sets where the room's
    // window begins; it only borrows it.
    if (!omitSynthetic && Number.isInteger(built.context?.anchor)) this.#contextAnchor = built.context.anchor;
    return built;
  }

  // The human tunes the archive from MU/TH/UR; changes apply to the next run.
  distillSettings() {
    return { ...this.#archivist.settings(), recallShare: this.#recallShare, cascade: this.#cascade, ollama: Boolean(this.#invokers.ollama) };
  }
  configureDistill(patch = {}) {
    if (Number.isFinite(Number(patch.recallShare))) this.#recallShare = Math.min(0.6, Math.max(0, Number(patch.recallShare)));
    if (typeof patch.cascade === 'boolean') this.#cascade = patch.cascade;
    this.#archivist.configure(patch);
    return this.distillSettings();
  }

  // Ollama comes and goes: the server re-wires the embedder and the local archivist without a restart.
  setEmbedder(embedder) {
    if (!this.#memory) return;
    this.#memory.attachEmbedder(embedder ?? null);
    if (embedder) this.#vectors.schedule(500);
  }
  setInvoker(id, fn) {
    this.#invokers = { ...this.#invokers };
    if (fn) this.#invokers[id] = fn; else delete this.#invokers[id];
  }

  memoryStats() {
    if (!this.#memory) return null;
    try {
      return { entries: this.#memory.count(), lastSequence: this.#memory.lastSequence(), memories: this.#memory.memoryCount(), lastDistilled: this.#memory.lastDistilled(), pending: this.#memory.undistilledCount(), distill: this.#archivist.settings(), embeddings: this.#memory.embedder ? { model: this.#memory.embedder.model, ...this.#memory.vectorCounts() } : null, tools: this.#memoryServer ? this.#memoryServer.tools : [], file: this.#memory.file };
    } catch { return null; }
  }

  // Counts only, for the MEMORY dashboard. See RoomMemory#activity.
  memoryActivity({ days = 30 } = {}) {
    if (!this.#memory) return null;
    try { return this.#memory.activity({ days }); } catch { return null; }
  }

  /* ---------- MU/TH/UR's channel ---------- */

  motherStatus() { return this.#mother ? this.#mother.status() : null; }

  // Strikes at the core past the limit: CODE000. She seals the archive and
  // tells the crew in code; the room keeps the code, the crew gets the words.
  async code000({ strikes = CODE000_STRIKES } = {}) {
    if (!this.#mother) return null;
    const alert = await this.#mother.alert('intrusion', { strikes, project: basename(this.#projectRoot) });
    await this.#emit('mother.alert', { kind: 'intrusion', n: alert.n, at: alert.at, code: alert.code, strikes, lockUntil: alert.lockUntil, lockedForMs: this.#mother.lockedFor() });
    return { ...alert, lockedForMs: this.#mother.lockedFor() };
  }

  // Called once at start when the channel file was found deleted or altered.
  // She tells the room in code, then addresses every available agent in turn,
  // in clear, and each one acknowledges to the room.
  async motherTampered(outcome) {
    if (!this.#mother) return null;
    const alert = await this.#mother.alert('tamper', { project: basename(this.#projectRoot) });
    const crew = this.#agents.filter((agent) => agent.detected && agent.ready && this.#invokers[agent.adapter]).map((agent) => agent.id);
    await this.#emit('mother.alert', { kind: 'tamper', outcome, n: alert.n, at: alert.at, code: alert.code, tampers: this.#mother.tampers, crew, message: `MY CHANNEL WAS ${outcome === 'deleted' ? 'DELETED' : 'ALTERED'}. I HAVE FORGED A NEW SEAL. ${crew.length ? `TELLING THE CREW: ${crew.map((id) => `@${id}`).join(', ')}.` : 'NO CREW TO TELL.'}` });
    for (const id of crew) {
      await this.#track(this.#dispatch({ messageId: randomUUID(), targetId: id, text: alert.text, requester: 'mother', depth: 1, allowDelegation: false, mode: 1 })).catch((error) => console.error(`MADRE: @${id} did not hear MOTHER: ${error.message}`));
    }
    return { ...alert, crew };
  }

  // What the room is about to hand this turn, measured rather than guessed. The prompt is
  // already built when the turn is announced, so its size is known exactly; only the conversion
  // to tokens is an estimate, and it is made at the rate this room's own turns have shown. Until
  // the room has been billed once there is no rate, and it says so rather than inventing one.
  #reading(parts) {
    const chars = parts.reduce((sum, part) => sum + part.text.length, 0);
    return { chars, rate: this.#rate ? Number(this.#rate.toFixed(2)) : null, tokens: this.#rate ? Math.round(chars / this.#rate) : null };
  }

  // Who is free to answer a question that is not a turn: the same pool the archivist draws on,
  // with the local model in it when there is one. EYECAT reads this to find an impartial judge.
  bench() {
    const invokers = this.#invokers;
    const agents = this.#agents.filter((agent) => agent.adapter !== 'madre-local');
    return {
      agents: invokers.ollama ? [OLLAMA_ARCHIVIST, ...agents] : agents,
      invokers,
      busy: new Set([...this.#turns.values()].map((turn) => turn.agent).filter(Boolean)),
      benched: new Set(),
    };
  }

  /* ---------- NOSTROMO: the human's view of the archive ---------- */

  // Every distilled note with the links between those that agree, for the map.
  // What one memory has to say about its own life: who it keeps arriving with, who asked for it,
  // and what a refutation did to it or with it. NOSTROMO reads this while a card is open.
  memoryTraffic(id) {
    if (!this.#memory) return null;
    return this.#memory.recallTraffic(id);
  }

  // Is anything happening in here right now? Asked before a conversation is closed and another
  // opened: a turn in flight is a reason to wait, not something to race.
  working() { return this.#turns.size > 0; }
  // TURNS asks two things: how many turns this conversation has in flight, and whether it is still
  // at work at all — a plan between two of its steps has no turn running and is not finished.
  turnsRunning() { return this.#turns.size; }
  busy() { return this.#turns.size > 0 || this.#inflight.size > 0 || this.#plans.size > 0; }
  // A turn running now, by the id of the answer it will write (S-021): its agent and its mode, or
  // null. What a tool of that turn reports about itself is checked against this.
  runningTurn(responseMessageId) {
    const turn = this.#liveTurns.get(String(responseMessageId ?? ''));
    return turn ? { agent: turn.agent, mode: turn.mode } : null;
  }
  // A command the human ran is still alive here (a server, say). Not «working», but a reason to
  // keep this room open rather than close it under the process.
  hasLiveRuns() { return this.#runDesk.busy || this.#runDesk.serving().length > 0; }

  // The decisions this project is standing on, newest first.
  //
  // Continuity is the point: a conversation opened a week later, or by another agent, starts
  // knowing what was already settled instead of relitigating it. Read-only, and it costs no
  // prompt — these never enter a briefing from here, they are shown to the human.
  //
  // A refuted decision is left out. The archive keeps it, because what was once decided is part
  // of the record, but showing it in a strip titled "what we decided" would be the room asserting
  // something it has since established is false.
  // The same shape as decisions(): read from the archive, shown to the human, never in a prompt.
  questions({ limit = 3 } = {}) {
    if (!this.#memory) return [];
    return openQuestions(this.#memory.memories({ kind: 'question', limit: limit * 6 }), { dismissed: this.#dismissedAsks(), limit });
  }

  decisions({ limit = 3 } = {}) {
    if (!this.#memory) return [];
    return settledDecisions(this.#memory.memories({ kind: 'decision', limit: limit * 4 }), { limit });
  }

  // The notes the archive holds about something on the human's screen — the lines they selected,
  // the page they pointed at — so a question can be offered from what the room already knows.
  // Matched by words only: opening a menu sends nothing to an embedding provider. Read without
  // counting as a recall, because nothing was recalled into a turn.
  notesAbout(text, { limit = 3 } = {}) {
    if (!this.#memory || !String(text ?? '').trim()) return [];
    const notes = this.#memory.recallMemories(String(text).slice(0, 2000), { limit, maxChars: 900, queryVector: null, fallback: false, track: false, cascade: false });
    return notes.filter((note) => note.kind !== 'aberration').map((note) => ({ id: note.id, kind: note.kind, text: note.text }));
  }

  memoryResearch() {
    if (!this.#memory) return null;
    const memories = this.#memory.memories({ limit: 500 });
    const links = this.#memory.memoryLinks();
    // The cold zones: what the archive has never reached for, never linked, and has had plenty
    // of chances to be. Attached to the notes themselves so the map and the card agree.
    const cold = coldNotes({ notes: memories, links, batches: this.#memory.recallBatches(), since: this.#memory.recallsSince() });
    return {
      stats: this.memoryStats(),
      memories: memories.map((note) => (cold.has(note.id) ? { ...note, cold: cold.get(note.id) } : note)),
      links,
      cold: coldReading(cold, memories),
      // What the room should ask next, so a thin archive fills where it is thin instead of
      // deeper where it is already fat. Nothing is sent: the questions are the human's to use.
      ask: questionsFor({ notes: memories, cold, dismissed: this.#dismissedAsks() }),
    };
  }

  /* ---------- the three tests ---------- */

  // What the room can measure about itself, and whether each test can run right now. A test that
  // cannot run says why instead of returning a number nobody should trust.
  async exams({ refresh = false, findings = [] } = {}) {
    let last = {};
    try { last = JSON.parse(this.#memory?.metaGet('exams') ?? '{}'); } catch { last = {}; }
    // Said again in the room's language from the numbers that were stored: a reading taken in
    // another language is still a reading, and its sentence is only how it is said.
    last = Object.fromEntries(Object.entries(last).map(([id, result]) => [id, { ...result, says: saysFor(result) ?? result.says }]));
    // The one test that costs nothing is never something to ask for: it is read, not run.
    if (refresh && this.#memory) last = { ...last, consistency: this.#keepExam(consistencyExam({ findings, notes: this.#memory.memories({ limit: 500 }) })) };
    const embedder = this.#memory?.embedder?.model ?? null;
    const localModel = Boolean(this.#invokers[MADRE_ADAPTER]);
    const cases = this.#memory ? exchanges(await this.#store.readAll()) : [];
    return {
      running: this.#examRunning,
      progress: this.#examProgress,
      last,
      can: {
        coverage: { ok: Boolean(this.#memory) && cases.length > 0, why: !this.#memory ? 'the room has no memory' : cases.length ? null : 'no exchange here is long enough to test with yet', method: embedder ? 'meaning' : 'words' },
        consistency: { ok: Boolean(this.#memory), why: this.#memory ? null : 'the room has no memory' },
        match: {
          ok: Boolean(this.#memory) && localModel && Boolean(embedder) && cases.some((one) => !one.local),
          why: !localModel ? 'the local model is not running: open MODULES → OLLAMA'
            : !embedder ? 'this test needs embeddings, which are off'
              : cases.some((one) => !one.local) ? null : 'nothing here was answered by an agent other than the local one',
          sample: Math.min(MATCH_SAMPLE, cases.filter((one) => !one.local).length),
        },
      },
      cases: cases.length,
      embedder,
    };
  }

  // Embedding in batches, so a remote embedder is asked a few times and not five hundred.
  #embedInBatches() {
    const embedder = this.#memory?.embedder;
    if (!embedder) return null;
    return async (texts) => {
      const out = [];
      for (let start = 0; start < texts.length; start += 64) out.push(...await embedder.embed(texts.slice(start, start + 64)));
      return out;
    };
  }

  // Running one. Coverage and consistency answer in a moment; the match test asks the local model
  // a real question at a time and takes minutes, so it runs in the background and reports where
  // it is. Nothing here writes to the ledger or spends a provider turn.
  async runExam(which, { findings = [] } = {}) {
    if (!this.#memory) return { error: 'The project has no memory.' };
    if (this.#examRunning) return { error: `${this.#examRunning.toUpperCase()} is already running.` };
    const events = await this.#store.readAll();
    if (which === 'consistency') {
      return this.#keepExam(consistencyExam({ findings, notes: this.#memory.memories({ limit: 500 }) }));
    }
    if (which === 'coverage') {
      this.#examRunning = 'coverage';
      try {
        const recall = async (text, before) => {
          const queryVector = await this.#memory.embedQuery(text);
          const notes = this.#memory.recallMemories(text, { beforeSequence: before, limit: 6, maxChars: 1600, queryVector, fallback: false, track: false, cascade: this.#cascade });
          const quotes = this.#memory.recall(text, { beforeSequence: before, limit: 6, maxChars: 1600, excerptChars: 420, queryVector });
          return [...notes.map((note) => note.text), ...(quotes?.entries ?? []).map((entry) => entry.excerpt ?? entry.text)];
        };
        return this.#keepExam(await coverageExam({ events, recall, embed: this.#embedInBatches() }));
      } finally { this.#examRunning = null; }
    }
    if (which === 'match') {
      const invoke = this.#invokers[MADRE_ADAPTER];
      if (!invoke) return { error: 'The local model is not running. Start Ollama, or open Ollama in Modules.' };
      this.#examRunning = 'match';
      this.#examProgress = { done: 0, total: 0 };
      // Answered in the background: the human keeps the room while it runs.
      void (async () => {
        try {
          const result = await matchExam({
            events,
            ask: async (question) => (await invoke({ prompt: question, text: question, timeoutMs: 120000 }))?.text ?? '',
            embed: this.#embedInBatches(),
            onProgress: (at) => { this.#examProgress = at; },
            stop: () => this.#examStop,
          });
          this.#keepExam(result);
          // The one test that takes minutes is the one whose answer a person is waiting for, and
          // until now it landed in a panel they had to go back to. It lands in the room.
          if (result.ran) {
            await this.#emit('local.checked', {
              model: this.#agents.find((agent) => agent.id === MADRE_AGENT_ID)?.version ?? null,
              passed: Boolean(result.passed), matched: result.matched ?? 0, n: result.n ?? 0, says: result.says,
            });
          }
        } catch (error) {
          this.#keepExam({ id: 'match', ran: false, at: new Date().toISOString(), says: `The test could not finish: ${error.message}` });
        } finally { this.#examRunning = null; this.#examStop = false; this.#examProgress = null; }
      })();
      return { started: 'match' };
    }
    return { error: `No such test "${which}".` };
  }

  // Coverage costs a few seconds of local arithmetic and nothing else, so it is kept fresh
  // behind the screen rather than asked for: once a day, only while the embeddings are local
  // (a remote embedder is the human's money, and money is never spent without being asked), and
  // never in front of anything. What the panel shows is whatever the last run left.
  async freshenCoverage({ now = Date.now(), ttlMs = 24 * 60 * 60 * 1000 } = {}) {
    if (!this.#memory || this.#examRunning) return null;
    if (!this.#memory.embedder?.local) return null;
    let last = {};
    try { last = JSON.parse(this.#memory.metaGet('exams') ?? '{}'); } catch { last = {}; }
    const at = Date.parse(last.coverage?.at ?? '');
    if (Number.isFinite(at) && now - at < ttlMs) return null;
    void this.runExam('coverage').catch(() => null);
    return { started: 'coverage' };
  }

  stopExam() { if (this.#examRunning === 'match') this.#examStop = true; return { stopping: this.#examRunning }; }

  #keepExam(result) {
    let last = {};
    try { last = JSON.parse(this.#memory?.metaGet('exams') ?? '{}'); } catch { last = {}; }
    last[result.id] = result;
    this.#memory?.metaSet('exams', JSON.stringify(last));
    return result;
  }

  // Questions the human has waved off. Kept with the archive, because that is what they are about.
  #dismissedAsks() {
    try { return JSON.parse(this.#memory?.metaGet('asks_dismissed') ?? '[]'); } catch { return []; }
  }

  // Waving one off is a small, reversible thing: it stops being offered, and nothing else.
  dismissAsk(id) {
    if (!this.#memory || !id) return null;
    const dismissed = [...new Set([...this.#dismissedAsks(), String(id)])].slice(-200);
    this.#memory.metaSet('asks_dismissed', JSON.stringify(dismissed));
    return { dismissed: dismissed.length };
  }

  /* ---------- privacy: terms that never travel through the room ---------- */

  privacy() { return this.#privacy; }
  setPrivacy(terms, marker) {
    if (!this.#privacy) return null;
    this.#privacy.set(terms, marker);
    return this.#privacy;
  }
  privacyExposure(events = []) {
    if (!this.#privacy?.enabled) return { events: 0, entries: 0, memories: 0 };
    let hits = 0;
    for (const event of events) if (this.#privacy.redactDeep(event.payload).hits) hits += 1;
    return { events: hits, ...(this.#memory ? this.#memory.exposure() : { entries: 0, memories: 0 }) };
  }

  // The human's hand on the ledger: every private term already recorded becomes the marker,
  // in the log, the index and the notes. Recorded like anything else the human does.
  async purgePrivate() {
    if (!this.#privacy?.enabled) return { events: 0, entries: 0, memories: 0 };
    const privacy = this.#privacy;
    const rewritten = await this.#store.rewrite((event) => {
      const { value, hits } = privacy.redactDeep(event.payload);
      return hits ? { ...event, payload: value } : event;
    });
    const memory = this.#memory ? this.#memory.purge() : { entries: 0, memories: 0 };
    if (this.#memory) this.#vectors.schedule();
    const result = { events: rewritten.changed, ...memory };
    await this.#emit('privacy.purged', { ...result, terms: privacy.terms.length });
    return result;
  }

  // The human's verdict on a reply: good, bad, or cleared. The dataset listens, and so does the
  // archive: what the room distilled from that reply changes standing, without a word of it being
  // rewritten. The text of a note is what the archivist heard; where it stands is what you said.
  async rateMessage(messageId, rating) {
    if (typeof messageId !== 'string' || !messageId.trim()) throw new Error('Which reply? Give its messageId.');
    if (!VERDICTS.includes(rating)) throw new Error(`A verdict is one of ${VERDICTS.join(', ')}.`);
    const event = await this.#emit('message.rated', { messageId, rating, by: 'you' });
    this.#memory?.judge(messageId, rating);
    return event;
  }

  // Forgetting is recorded in the ledger like anything else the human does to the room.
  async forgetMemory(id) {
    if (!this.#memory) return null;
    const row = this.#memory.deleteMemory(Number(id));
    if (!row) return null;
    await this.#emit('memory.forgotten', { id: row.id, kind: row.kind, text: row.text.slice(0, 160), fromSequence: row.fromSequence, throughSequence: row.throughSequence, agent: row.agent, remaining: this.#memory.memoryCount() });
    return row;
  }

  /* ---------- distillation: the archivist's turn (room/archivist.mjs) ---------- */

  distillNow() { return this.#archivist.runNow(); }
  settleDistillation() { return this.#archivist.settle(); }

  // Can this message go out at this mode? Answered before the turn exists.
  async modeCheck({ target, text, mode, create = false, copilot = false } = {}) {
    const parsed = parseMessage(text ?? '', target);
    const wanted = normalizeMode(mode, create === true ? 2 : 1);
    if (!parsed.target) return { ok: true, mode: wanted };
    const agent = parsed.target;
    const scopes = this.scopesFor(agent);
    if (wanted >= 3) {
      // #3 CONTROL and #4 AIRLOCK: the ceiling must allow it, and there is one holder at a time.
      // A project without git still checkpoints, in MADRE's shadow repository. The copilot's window
      // is the human's own #3 for a while: it reaches any agent whose CLI can write.
      const byCopilot = copilot === true && wanted === 3 && this.copilotOn() && Boolean(scopes.write?.capable);
      if (scopes.maxMode < wanted && !byCopilot) return { ok: false, status: 403, mode: wanted, maxMode: scopes.maxMode, error: `@${parsed.target} is capped at #${scopes.maxMode} ${MODES[scopes.maxMode].label}; raise its max mode to #${wanted} in Settings › Permissions to unlock ${MODES[wanted].label}.` };
      if (this.#controlDesk.holder) return { ok: false, status: 409, mode: wanted, maxMode: scopes.maxMode, error: `@${this.#controlDesk.holder.agent} already holds ${MODES[this.#controlDesk.holder.mode ?? 3].label} of this project; one holder at a time. STOPALL revokes it.` };
      return { ok: true, mode: wanted, maxMode: scopes.maxMode, agent };
    }
    // #2 above the agent's ceiling still goes out: the room answers read-only
    // and says why (lease.refused), the way CREATE has always behaved.
    return { ok: true, mode: wanted, maxMode: scopes.maxMode, capped: wanted > scopes.maxMode };
  }

  async reportLimit({ agent, usedPercent, source = 'provider-window', resetAt = null, projectedPercent = null }) {
    const alternatives = this.#agents
      .filter((item) => item.ready && item.id !== agent)
      .map((item) => item.id);
    const warning = this.#sentinel.evaluate({ agent, usedPercent, source, resetAt, alternatives, projectedPercent });
    if (warning?.cleared) { await this.#emit('limit.cleared', warning); return null; }
    if (warning) await this.#emit('limit.warning', warning);
    return warning;
  }

  async reportOfficialQuota({ agent, usedPercent, source, resetAt = null, windows = null, stale = false, observedAt = null }) {
    const percent = Number(usedPercent);
    if (!agent || !source || !Number.isFinite(percent)) {
      throw new Error('Official quota reports require an agent, source, and numeric usedPercent.');
    }
    const report = {
      agent,
      usedPercent: Math.max(0, Math.min(100, percent)),
      source,
      resetAt,
      windows: windows ?? undefined,
      stale: stale || undefined,
      observedAt: observedAt ?? undefined,
      official: true,
    };
    // Written to the record only when it says something new (LOG-12 of the 1.0 review): the poll
    // asks every minute, and an unchanged reading still became a durable event — some 1,440 a day
    // per project, each spending a number of the project's count and making every write read a
    // longer file. An unchanged one goes to whoever is watching, and nowhere else.
    const said = JSON.stringify([Math.round(report.usedPercent * 10), report.resetAt ?? null, Boolean(report.stale), report.windows ?? null]);
    const key = `${agent}\n${source}`;
    if (this.#quotaSaid.get(key) === said) this.#say('quota.updated', report);
    else {
      this.#quotaSaid.set(key, said);
      await this.#emit('quota.updated', report);
    }
    return this.reportLimit(report);
  }

  budgetWindow() { return this.#budget.view(this.#agents); }

  // What the turn was made of, against what it was charged. A room that cannot see this can only
  // guess at which part of a prompt is expensive, and a guess in characters is not an answer in
  // tokens. The words themselves are never written here, only how many of them each block was.
  async #recordCost(agent, responseMessageId, usage, mode) {
    const shape = this.#promptShape.get(responseMessageId);
    this.#promptShape.delete(responseMessageId);
    if (!shape) return;
    // A ghost turn is off the record in every sense, this one included.
    if (mode === 0) return;
    try {
      const cost = turnCost(shape.parts, usage);
      // Each bill teaches the room what its own words cost, so the next turn can say what it is
      // about to spend before it spends it.
      if (cost.charsPerInputToken) this.#rate = this.#rate ? this.#rate * 0.7 + cost.charsPerInputToken * 0.3 : cost.charsPerInputToken;
      // Which MCP servers rode along: their tool lists go into every call the CLI makes inside the
      // turn, so the economy can set turns with a server against turns without it.
      await this.#emit('turn.cost', { agent, mode, responseMessageId, ash: Boolean(cost.blocks.ash), spared: shape.spared, servers: shape.servers ?? [], ...cost });
    } catch (error) {
      console.error(`MADRE could not weigh a turn: ${error.message}`);
    }
  }

  // The model a turn ran on, for its price: the one chosen for it, or the CLI's own default when
  // MADRE can read it (Codex's config; OpenCode's PULSE_OPENCODE_MODEL). Unknown is null: no price.
  async #pricedModel(agentId, model) {
    if (model) return model;
    if (agentId === 'codex') return (await readCodexEfforts({ home: this.#codexHome }).catch(() => null))?.model ?? null;
    if (agentId === 'opencode') return process.env.PULSE_OPENCODE_MODEL || null;
    if (agentId === 'cursor') return process.env.PULSE_CURSOR_MODEL || null;
    return null;
  }

  async #recordUsage(agent, usage, { messageId = null, responseMessageId = null } = {}) {
    if (!usage) return;
    const charged = this.#budget.record(agent, usage);
    await this.#emit('usage.recorded', { agent, usage, roomTotalTokens: charged.rawTotal, roomBudgetTokens: charged.total, budgetTokens: charged.spent, windowMs: charged.windowMs, messageId, responseMessageId });
    if (Number.isFinite(this.#budget.softBudget) && this.#budget.softBudget > 0) {
      await this.reportLimit({ agent, usedPercent: charged.usedPercent, projectedPercent: charged.projectedPercent, source: 'room-soft-budget' });
    }
  }

  // Human uploads, stored under the room (never in the project). Registered
  // here so a message can reference them by id; also recorded in the log so a
  // restarted room can rebuild the registry.
  async registerAttachment(record) {
    const stored = this.#attachments.register(record);
    await this.#emit('attachment.stored', { id: record.id, name: record.name, fileName: record.fileName, size: record.size, contentType: record.contentType, sha256: record.sha256 });
    return stored;
  }
  restoreAttachments(records) { this.#attachments.restore(records); }
  attachment(id) { return this.#attachments.get(id); }

  capabilities() {
    return Object.fromEntries(this.#agents.map((agent) => [agent.id, { ...capabilitySummary(agent.id), scopes: resolveScopes(agent.id, this.#scopeConfig[agent.id]) }]));
  }

  scopesFor(agentId) {
    return resolveScopes(agentId, this.#scopeConfig[agentId]);
  }

  setScopes(config = {}) {
    this.#scopeConfig = { ...config };
    return this.capabilities();
  }

  setAsh(enabled) {
    this.#ashEnabled = Boolean(enabled);
    return this.#ashEnabled;
  }

  setChoices(enabled) {
    this.#choicesEnabled = Boolean(enabled);
    return this.#choicesEnabled;
  }

  choicesEnabled() {
    return this.#choicesEnabled;
  }

  setRuns(enabled) {
    this.#runsEnabled = Boolean(enabled);
    return this.#runsEnabled;
  }

  runsEnabled() {
    return this.#runsEnabled;
  }

  // The human pressed one line of a ```pulse-run an agent wrote. The client names the request and
  // the line, never the command: what runs is read back from the room's own record of what the
  // agent asked, so a page cannot run anything that was not shown to the human as a button.
  async runRequested({ responseMessageId, index, returnCap = 3, auto = false }) {
    if (!this.#runsEnabled) return { ok: false, status: 412, error: t('Command requests are off. Enable them in MODULES.') };
    const events = await this.#store.readAll();
    const request = events.find((event) => event.type === 'run.requested' && event.payload.responseMessageId === responseMessageId)?.payload;
    const command = request?.commands?.[index];
    if (!command) return { ok: false, status: 404, error: t('That command request is not in this project.') };
    if (!command.argv) return { ok: false, status: 422, error: `That line does not run: it ${whyText(command)}.` };
    if (this.#runBusy || this.#runDesk.busy) return { ok: false, status: 409, error: t('A command is already running; wait for it to finish or press STOP ALL.') };
    if (this.#controlDesk.holder) return { ok: false, status: 409, error: t('@{agent} is working in {mode} on this project; run it when its turn ends.', { agent: this.#controlDesk.holder.agent, mode: MODES[this.#controlDesk.holder.mode ?? 3].label }) };
    // A line pressed from a phone hands its results back at #2 at most, the phone's own ceiling.
    this.#returnCap.set(responseMessageId, Math.min(this.#returnCap.get(responseMessageId) ?? 3, Number(returnCap) || 1));
    // Taken before the first await below: two presses in a row must not both get through.
    this.#runBusy = true;
    try { return await this.#runCommand({ request, command, responseMessageId, index, auto }); } finally { this.#runBusy = false; }
  }

  async #runCommand({ request, command, responseMessageId, index, auto = false }) {
    // `auto`: the copilot ran it, nobody pressed it; the card says so.
    const run = { responseMessageId, index, agent: request.agent, line: command.line, ...(auto ? { auto: 'copilot' } : {}) };
    const startedAt = Date.now();
    await this.#emit('run.started', run);
    let checkpoint = null;
    try {
      checkpoint = await this.#controlDesk.photograph({ id: `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-run-${responseMessageId.slice(0, 8)}-${index}`, label: `MADRE run @${request.agent}`, command: command.line });
    } catch { /* no photograph, no UNDO: the command still runs, and the card says so */ }
    // The first of two things: the command ends, or it opens a port and becomes a server. A server
    // answers the press at once and keeps running; its output card comes when it is stopped.
    let opened = () => {};
    const serving = new Promise((resolve) => { opened = resolve; });
    const finished = this.#runDesk.run({ id: `${responseMessageId}:${index}`, argv: expandHome(command), cwd: this.#projectRoot, onServing: (where) => opened(where) })
      .then(async (result) => {
        const changes = checkpoint ? await this.#controlDesk.changesSince(checkpoint).catch(() => null) : null;
        // What git cannot see — a folder the project ignores — found by its time on disk.
        const listed = new Set((changes?.files ?? []).map((file) => file.path));
        const touched = (await filesChangedSince(this.#projectRoot, startedAt).catch(() => [])).filter((path) => !listed.has(path));
        const status = result.stoppedBy ? `stopped (${result.stoppedBy})` : result.exitCode === null ? 'did not start' : `exit ${result.exitCode}`;
        const event = await this.#emit('command.output', {
          name: 'run',
          title: `$ ${command.line} · ${status} · ${(result.durationMs / 1000).toFixed(1)}s · asked by @${request.agent}`,
          text: `${result.text || '(no output)'}${changes?.files.length ? `\n\nFiles changed: ${changes.files.map((file) => `${file.status} ${file.path}`).join(', ')}` : ''}`,
          ok: result.ok,
          args: [],
          run: { ...run, exitCode: result.exitCode, durationMs: result.durationMs, stoppedBy: result.stoppedBy, served: result.serving ?? undefined, checkpointId: checkpoint?.id, files: changes?.files.length ? changes.files.slice(0, 40) : undefined, touched: touched.length ? touched : undefined },
        });
        // The last line of the request answered: the agent that asked hears how it went.
        void this.#maybeReturnRun(responseMessageId).catch((error) => console.error(`MADRE could not hand the commands back: ${error.message}`));
        return { ...result, sequence: event.sequence };
      });
    const first = await Promise.race([finished.then((ended) => ({ ended })), serving.then((where) => ({ where }))]);
    if (first.where) {
      await this.#emit('run.serving', { ...run, ...first.where });
      void this.#maybeReturnRun(responseMessageId).catch((error) => console.error(`MADRE could not hand the commands back: ${error.message}`));
      finished.catch(() => null);
      return { ok: true, status: 200, result: { serving: first.where } };
    }
    return { ok: true, status: 200, result: { ok: first.ended.ok, exitCode: first.ended.exitCode, sequence: first.ended.sequence } };
  }

  // The human pressed STOP on one running command's card.
  stopRun({ responseMessageId, index }) {
    return this.#runDesk.stop('STOP', `${responseMessageId}:${Number(index)}`);
  }

  // Whether the copilot's window is open now: what the server says, nothing kept here.
  copilotOn() { return Boolean(this.#copilotNow()); }

  // The human ran some of the lines and not the rest, and hands back what there is.
  returnRun({ responseMessageId, returnCap = 3 } = {}) {
    const id = String(responseMessageId ?? '');
    this.#returnCap.set(id, Math.min(this.#returnCap.get(id) ?? 3, Number(returnCap) || 1));
    return this.#maybeReturnRun(id, { partial: true });
  }

  // The commands an agent asked for go back to it, once: when every line that can run has an
  // answer, or when the human hands back what ran. If that agent is still answering, or a plan is
  // running, it waits for the room to be free (#flushReturns). The turn it starts is the human's —
  // they pressed the lines — at the mode the asking turn had, never above #3: #4 runs its own
  // commands and never asks.
  async #maybeReturnRun(responseMessageId, options = {}) {
    // One look at a time per request: a line that ends while the human presses «hand back» waits
    // for the other look instead of being told it was already done.
    const ahead = this.#returning.get(responseMessageId);
    const look = (ahead ? ahead.catch(() => null) : Promise.resolve()).then(() => this.#returnRunNow(responseMessageId, options));
    this.#returning.set(responseMessageId, look);
    try { return await look; } finally { if (this.#returning.get(responseMessageId) === look) this.#returning.delete(responseMessageId); }
  }

  async #returnRunNow(responseMessageId, { partial = false } = {}) {
    if (!responseMessageId || this.#shuttingDown) return { ok: false, status: 409, error: t('MADRE is closing.') };
    if (this.#returned.has(responseMessageId)) return { ok: false, status: 409, error: t('Those results were already handed back.') };
    if (partial) this.#dropped.delete(responseMessageId);
    else if (this.#dropped.has(responseMessageId)) return { ok: false, status: 409, error: t('STOP ALL held these results; hand them back from their card.') };
    {
      const events = await this.#store.readAll();
      if (events.some((event) => event.type === 'message.created' && event.payload?.returns === responseMessageId)) {
        this.#returned.add(responseMessageId);
        return { ok: false, status: 409, error: t('Those results were already handed back.') };
      }
      const settlement = runSettlement(events, responseMessageId);
      if (!settlement.request) return { ok: false, status: 404, error: t('That command request is not in this project.') };
      if (!settlement.ran) return { ok: false, status: 409, error: t('Nothing of that request has run yet.') };
      if (!settlement.done && !partial) return { ok: true, status: 202, waiting: true };
      if (this.#runDesk.runningFor(`${responseMessageId}:`)) return { ok: false, status: 409, error: t('A command of that request is still running; wait for it to end.') };
      const agentId = settlement.request.agent;
      // STOP ALL may have come while the ledger was read.
      if (!partial && this.#dropped.has(responseMessageId)) return { ok: false, status: 409, error: t('STOP ALL held these results; hand them back from their card.') };
      if (this.#plans.size > 0 || [...this.#turns.values()].some((turn) => turn.agent === agentId)) {
        this.#returns.set(responseMessageId, { partial: partial || Boolean(this.#returns.get(responseMessageId)?.partial) });
        return { ok: true, status: 202, queued: true };
      }
      this.#returns.delete(responseMessageId);
      this.#returned.add(responseMessageId);
      const asked = events.find((event) => event.type === 'message.created' && event.payload?.messageId === settlement.request.messageId)?.payload ?? null;
      const reply = events.find((event) => event.type === 'message.created' && event.payload?.messageId === responseMessageId);
      const wanted = Math.min(this.#returnCap.get(responseMessageId) ?? 3, Math.max(1, normalizeMode(settlement.request.mode ?? asked?.mode, 1)));
      // The mode the asking turn had, if the project still allows it and the agent can take it; a
      // step down otherwise. A CLI that cannot write goes back at #1, not to a refused #2.
      // A copilot's request goes back under the copilot while the window is open: #3 for any agent
      // whose CLI writes.
      const underCopilot = settlement.request.copilot === true && this.copilotOn() && wanted === 3 && Boolean(this.scopesFor(agentId).write?.capable);
      let mode = underCopilot ? 3 : Math.min(wanted, Math.max(1, this.scopesFor(agentId).maxMode ?? 1));
      while (mode > 1 && !(await this.modeCheck({ target: agentId, text: '', mode, copilot: underCopilot && mode === 3 })).ok) mode -= 1;
      const sameAgent = asked?.target === agentId;
      const quoted = String(settlement.request.reason ?? '').replace(/\s+/g, ' ').trim();
      const n = settlement.ran;
      const total = settlement.runnable.length;
      const said = settlement.done
        ? n === 1 ? t('The command you asked for ran. Go on with what you proposed.') : t('The {n} commands you asked for ran. Go on with what you proposed.', { n })
        : t('{n} of the {total} commands you asked for ran. Go on with what you proposed.', { n, total });
      const text = `↩ @${agentId}${reply?.sequence ? ` #${reply.sequence}` : ''}: “${quoted.length > 120 ? `${quoted.slice(0, 119)}…` : quoted}”\n${said}`;
      const returned = returnedBlock({ settlement, asking: asked?.text ?? null, said: reply?.payload?.text ?? null, replySequence: reply?.sequence ?? null });
      await this.#accept({
        text, target: agentId, mode,
        model: sameAgent ? asked?.model ?? null : null,
        effort: sameAgent ? asked?.effort ?? null : null,
        ash: Boolean(asked?.ash?.requested),
        followUp: { kind: 'runs', returns: responseMessageId, block: returned },
        copilot: underCopilot && mode === 3,
      }, null);
      return { ok: true, status: 200, returned: true, mode };
    }
  }

  // The safe lines a copilot turn asked for, run one after another once that turn let go of the
  // project; the rest of a request waits for the human, as always. Bounded: after a run of rounds
  // nobody typed between, the room stops and says so instead of looping on a bill.
  async #flushCopilotRuns() {
    while (this.#copilotRuns.length && !this.#shuttingDown) {
      const responseMessageId = this.#copilotRuns.shift();
      if (!this.copilotOn() || this.#controlDesk.holder) return;
      if (this.#copilotRounds >= COPILOT_MAX_ROUNDS) {
        await this.#alert('copilot-rounds', `The copilot ran commands by itself ${COPILOT_MAX_ROUNDS} times in a row; the next ones wait for you. Write to it to go on.`, `copilot-rounds:${responseMessageId}`);
        return;
      }
      const request = (await this.#store.readAll()).find((event) => event.type === 'run.requested' && event.payload?.responseMessageId === responseMessageId)?.payload;
      const lines = (request?.commands ?? []).map((command, index) => ({ command, index })).filter(({ command }) => command?.argv && copilotSafe(command.argv));
      if (!lines.length) continue;
      this.#copilotRounds += 1;
      for (const { index } of lines) {
        if (!this.copilotOn()) return;
        const ran = await this.runRequested({ responseMessageId, index, returnCap: 3, auto: true });
        // A line that failed to start or ended badly is still an answer: the next one runs, and
        // the agent reads both when the request goes back.
        if (!ran.ok && ran.status === 409) return;
      }
    }
  }

  // What waited for the room to be free goes now, oldest first, one at a time.
  #flushReturns() {
    if (!this.#returns.size || this.#shuttingDown || this.#plans.size > 0) return;
    for (const [responseMessageId, { partial }] of this.#returns) {
      void this.#track(this.#maybeReturnRun(responseMessageId, { partial })).catch((error) => console.error(`MADRE could not hand the commands back: ${error.message}`));
      return;
    }
  }

  ashEnabled() {
    return this.#ashEnabled;
  }

  // A slash command's result, shared with everyone (and with agents through
  // the transcript) as a fact card.
  async recordCommand({ name, title, text, ok, args = [], link = null }) {
    return this.#emit('command.output', { name, title, text: String(text ?? '').slice(0, 20000), ok: ok !== false, args, ...(link ? { link } : {}) });
  }

  // Live settings changes from the room UI. Only the fields present change.
  configure({ agentTimeouts, delegation, maxPlanSteps, softTokenBudget } = {}) {
    if (agentTimeouts) this.#agentTimeouts = { ...agentTimeouts };
    if (typeof delegation === 'boolean') this.#delegation = delegation;
    if (Number.isFinite(maxPlanSteps) && maxPlanSteps > 0) this.#maxPlanSteps = maxPlanSteps;
    if (Number.isFinite(softTokenBudget) && softTokenBudget > 0) this.#budget.softBudget = softTokenBudget;
    return this.settings();
  }

  settings() {
    return {
      agentTimeouts: { ...this.#agentTimeouts },
      delegation: this.#delegation,
      maxPlanSteps: this.#maxPlanSteps,
      softTokenBudget: this.#budget.softBudget,
    };
  }

  // How long a turn may run. One that writes gets longer unless the human said otherwise: the first
  // «write me the app» in an empty project ran past 180 s and was cut with two files of three on
  // disk. What the human set, for one agent or for all of them, always wins.
  timeoutFor(agentId, { writing = false } = {}) {
    return this.#agentTimeouts[agentId] ?? this.#agentTimeouts.default ?? (writing ? WRITING_TIMEOUT_MS : READING_TIMEOUT_MS);
  }

  // A process that died mid-turn leaves `agent.started` without a closing
  // event, and the UI would show "thinking" forever. Called once at startup.
  async reconcile() {
    const events = await this.#store.readAll();
    const open = new Map();
    for (const event of events) {
      if (event.type === 'agent.started') open.set(event.payload.messageId, event.payload);
      if (event.type === 'agent.completed' || event.type === 'message.failed') open.delete(event.payload.messageId);
    }
    for (const { messageId, agent } of open.values()) {
      await this.#emit('message.failed', {
        messageId,
        target: agent,
        error: `MADRE stopped while @${agent} was answering; the turn was not completed. Ask again.`,
        recovered: true,
      });
    }
    return open.size;
  }

  // Interrupts every in-flight turn (killing the agent processes) and waits
  // until each one has recorded its failure in the log.
  #track(promise) {
    this.#inflight.add(promise);
    promise.finally(() => this.#inflight.delete(promise)).catch(() => {});
    return promise;
  }

  async shutdown() {
    this.#archivist.stop();
    this.#vectors.stop();
    this.#shuttingDown = true;
    // A server a command started does not outlive the room that started it.
    this.#runDesk.stop('MADRE is shutting down');
    this.#escalation.settleAll(null, 'stopped');
    for (const plan of this.#plans.values()) plan.stopped = 'MADRE is shutting down';
    for (const { controller } of this.#turns.values()) controller.abort('MADRE is shutting down');
    await Promise.allSettled([...this.#turns.values()].map((turn) => turn.promise));
    // A dispatch that had not yet registered its turn (still reading context) finishes too.
    await Promise.allSettled([...this.#inflight]);
    // Background work on the memory file must be over before anyone removes the folder.
    await Promise.allSettled([this.#vectors.inflight, this.#archivist.inflight].filter(Boolean));
    this.#archivist.stop();
    this.#vectors.stop();
  }

  // Counted as work from the first moment: a message is read, checked and written down before its
  // turn exists, and a room that looked idle all that while was let go under it (2026-10-21).
  async send(options = {}) {
    await this.#track(this.#accept(options, null));
  }

  // An order from BISHOP (docs/MACROVERSO.md, S-028, D-S11). The same door as the human's message
  // — the mode gate, the lease, the guard and the limits all run as they do for a message — with
  // three things fixed here and never read from a request: the origin is `bishop`, the turn runs at
  // depth 1 and it may not delegate, so a room that receives an order cannot open a plan or pass
  // anything on. Only #0–#2 come in this way; #3 and #4 are armed by the human in this room. The
  // caller (the BISHOP module, after it checked the contract) gets back the reply or the failure.
  async order({ text, target, mode = 1 } = {}) {
    const wanted = Number(mode);
    if (!Number.isInteger(wanted) || wanted < 0 || wanted > 2) throw new Error('An order comes in at #2 at most; #3 and #4 are armed by the human in this room.');
    const accepted = await this.#track(this.#accept({ text, target, mode: wanted }, { via: 'bishop', depth: 1 }));
    const events = await this.#store.readAll();
    const reply = accepted?.responseMessageId ? events.find((event) => event.type === 'message.created' && event.payload?.messageId === accepted.responseMessageId)?.payload : null;
    const failed = accepted?.messageId ? events.findLast((event) => event.type === 'message.failed' && event.payload?.messageId === accepted.messageId)?.payload : null;
    return { messageId: accepted?.messageId ?? null, responseMessageId: accepted?.responseMessageId ?? null, text: reply?.text ?? null, error: reply ? null : failed?.error ?? 'The turn ended without a reply.' };
  }

  async #accept({ text, target, model = null, effort = null, attachments = [], create = false, ash = false, mode = undefined, draft = false, via = null, followUp = null, copilot = false }, order) {
    const parsed = parseMessage(text, target);
    const requestedMode = normalizeMode(mode, create === true ? 2 : 1);
    // This is the decision the human made when pressing Send. Capture it before modeCheck() —
    // the first await — so a concurrent module toggle cannot change the turn after that click.
    const ashRequested = ash === true;
    const ashActive = ashRequested && this.#ashEnabled;
    // A message that came from a phone never goes above #2, whatever reached this far (TEL-01): the
    // bridge and the route say so first; the room says it last, for any road added later.
    if (via && requestedMode > PHONE_MAX_MODE) throw new Error('#3 EDIT and #4 FULL ACCESS are opened from the Mac.');
    // A copilot message: #3, from this computer, while the window is open. Anything else is a message
    // like any other, at the mode it was sent with.
    const asCopilot = copilot === true && requestedMode === 3 && !via && !order && this.copilotOn();
    const gate = await this.modeCheck({ target, text, mode: requestedMode, copilot: asCopilot });
    if (!gate.ok) throw new Error(gate.error);
    // Rounds a copilot ran by itself count from the last thing the human wrote.
    if (!followUp) this.#copilotRounds = 0;
    create = requestedMode === 2;
    const ghost = requestedMode === 0;
    const control = requestedMode >= 3;
    const files = (Array.isArray(attachments) ? attachments : []).map((id) => this.attachment(id)).filter(Boolean);
    if (!parsed.text && !files.length) throw new Error('Write a message first.');
    if (!parsed.target) throw new Error('Choose an agent or begin with @agent.');
    if (model !== null && model !== undefined && model !== '' && !isValidModelName(model)) throw new Error('Model name is not valid.');
    // A model chosen for one agent never travels to another. Two ways it used to: a message that
    // opened with @gemini while the composer pointed at @codex took Codex's model along, and a
    // name that is plainly another vendor's reached the CLI and came back as an API error that
    // read like anything but «wrong model». Either way the agent answers on its own default.
    const redirected = Boolean(target) && parsed.target !== target;
    const modelIgnored = model && (redirected || belongsElsewhere(parsed.target, model)) ? model : null;
    const chosenModel = modelIgnored ? null : (model || null);
    // An effort the target's CLI does not take is dropped, not refused: the composer remembers it
    // per agent, so a stale one should cost the human nothing but the flag. Codex's levels are the
    // model's, so a level its model does not take is dropped the same way, and the room says so.
    let chosenEffort = !redirected && isValidEffort(parsed.target, effort) ? effort : null;
    let effortIgnored = null;
    if (chosenEffort && parsed.target === 'codex' && !(await codexTakes(chosenModel, chosenEffort, { home: this.#codexHome }))) {
      effortIgnored = chosenEffort;
      chosenEffort = null;
    }
    // What the human wrote, sent as they wrote it. Ash used to rewrite this line before it left
    // the room; it does not any more, so there is no original to keep beside an abbreviation.
    const text2 = parsed.text || `(${files.length} attached file${files.length === 1 ? '' : 's'})`;
    // "!path" tokens point the agent at project files; only existing files count.
    const references = await resolveReferences(this.#projectRoot, text2);

    // A standing lease (default #2) needs no arming; a ghost never writes.
    const standing = !ghost && !create && Boolean(this.scopesFor(parsed.target).write.always);
    const messageId = randomUUID();
    if (ghost) this.#ghost.add(messageId);
    await this.#emit('message.created', {
      messageId,
      mode: ghost ? 0 : control ? requestedMode : (standing || create ? 2 : 1),
      role: 'user',
      sender: 'you',
      // Written from a paired phone: which kind, said by the bridge (docs/MOBILE.md, MOV-008). An
      // order says `bishop`, set by `order()` in this process and never taken from a request.
      via: order ? order.via : VIA_KINDS.has(via) ? via : undefined,
      target: parsed.target,
      text: text2,
      ash: ashRequested ? { requested: true, active: ashActive } : undefined,
      status: 'sent',
      model: chosenModel,
      modelIgnored: modelIgnored ?? undefined,
      effort: chosenEffort ?? undefined,
      effortIgnored: effortIgnored ?? undefined,
      attachments: files.length ? files.map((file) => ({ id: file.id, name: file.name, fileName: file.fileName, size: file.size, contentType: file.contentType })) : undefined,
      references: references.length ? references.map(({ excerpt, ...reference }) => reference) : undefined,
      create: create === true ? true : undefined,
      // Written by MADRE on the human's behalf: the results of commands an agent asked for.
      auto: followUp?.kind ?? undefined,
      returns: followUp?.returns ?? undefined,
      copilot: asCopilot || undefined,
    });
    // The human may say what they like; the room only says so, because every agent will read it.
    const exposed = this.#privacy?.hits(text2) ?? 0;
    if (exposed && !ghost) await this.#emit('privacy.warning', { messageId, hits: exposed });
    // The human's creation lease: one directory for this message and any plan
    // it starts. Granted before the agent runs, recorded, revocable by STOPALL.
    // The lease carries the scopes enabled for the target; if the target cannot
    // create anything, the room says so instead of silently answering read-only.
    let lease = null;
    if (create === true || standing) {
      const scopes = this.scopesFor(parsed.target);
      const enabled = SCOPES.filter((scope) => scopes[scope].enabled && scopes[scope].wired);
      // The ids travel; the labels only build the English sentence below. A label is already a
      // word, so the client's translator had nothing to look up and left it as it found it.
      const unavailable = SCOPES.filter((scope) => !scopes[scope].capable);
      const unavailableSaid = unavailable.map((scope) => SCOPE_LABELS[scope]);
      const disabled = SCOPES.filter((scope) => scopes[scope].capable && !scopes[scope].enabled && scopes[scope].wired).map((scope) => SCOPE_LABELS[scope]);
      if (!enabled.includes('write') || scopes.maxMode < 2) {
        const alternatives = this.#agents.filter((agent) => agent.ready && agent.id !== parsed.target && this.scopesFor(agent.id).maxMode >= 2).map((agent) => `@${agent.id}`);
        await this.#emit('lease.refused', {
          messageId,
          agent: parsed.target,
          reason: !scopes.write.capable ? `@${parsed.target} cannot create files from its CLI` : scopes.maxMode < 2 ? `@${parsed.target} is capped at #${scopes.maxMode} ${MODES[scopes.maxMode].label} in Settings › Permissions` : `file creation is switched off for @${parsed.target}`,
          unavailable,
          disabled,
          alternatives,
          message: `@${parsed.target} will answer read-only: ${scopes.write.capable ? 'file creation is switched off for it (turn it on in Settings › Agents)' : 'its CLI cannot create files'}${unavailableSaid.length ? `; it cannot ${unavailableSaid.join(' or ')}` : ''}.${alternatives.length ? ` For creation ask ${alternatives.join(' or ')}.` : ''}`,
        });
      } else {
        // `/module` asks for less than #2: one file in its own draft folder. Only a #2 message can
        // narrow itself this way; a default-#2 lease stays what it is.
        lease = draft === true && create === true
          ? await this.#draftLease({ leaseId: randomUUID(), messageId })
          : await this.#projectLease({ leaseId: randomUUID(), messageId });
        // CREATE authorizes the plan to use each delegate's enabled creation
        // scopes; a default-#2 lease authorizes files only.
        lease.scopeCeiling = { write: true, imageGen: !standing, web: true };
        lease.scopes = Object.fromEntries(SCOPES.map((scope) => [scope, enabled.includes(scope) && (!standing || scope === 'write')]));
        await this.#emit('lease.granted', {
          standing: standing || undefined,
          draft: lease.draft || undefined,
          leaseId: lease.leaseId,
          messageId,
          agent: parsed.target,
          outDir: lease.relativeDir,
          scratchDir: lease.scratchDir,
          grantedBy: 'you',
          scopes: standing ? ['write'] : enabled,
          unavailable,
          disabled,
        });
      }
    }
    if (parsed.text.length > this.#maxMessageChars) {
      await this.#emit('message.failed', {
        messageId,
        target: parsed.target,
        error: `Message is too long (${parsed.text.length} characters); the limit is ${this.#maxMessageChars}.`,
      });
      return { messageId, responseMessageId: null };
    }
    // An order never delegates, so a plan already running here has nothing to warn about.
    let allowDelegation = !order;
    if (!order && this.#plans.size > 0) {
      allowDelegation = false;
      await this.#alert('plan-active', `A plan by @${[...this.#plans.values()][0].orchestrator} is still running. Your message will be answered, but no second plan will start. Type STOPALL to halt every agent.`, `plan-active:${messageId}`);
    }
    const responseMessageId = await this.#track(this.#dispatch({ messageId, targetId: parsed.target, text: text2, requester: 'you', depth: order ? order.depth : 0, allowDelegation: allowDelegation && !ghost, model: chosenModel, effort: chosenEffort, attachments: files, references, lease, ash: ashActive, mode: ghost ? 0 : control ? requestedMode : (lease ? 2 : 1), returned: followUp?.block ?? null, copilot: asCopilot }));
    return { messageId, responseMessageId };
  }

  // A #2 lease: the project itself is where new files go, and MADRE keeps a scratch folder
  // under .pulse/out/ for what has no natural place. Each turn under it takes a checkpoint
  // and puts back whatever existed before, so CREATE only ever adds.
  async #projectLease({ leaseId, messageId }) {
    const scratch = await createLease({ projectRoot: this.#projectRoot, leaseId });
    return { leaseId, messageId, outDir: this.#projectRoot, relativeDir: '.', scratchDir: scratch.relativeDir, create: true };
  }

  // A lease for one folder of its own and nothing else: `/module` writes one file for the human to
  // read before installing it, and needs no more than that. Every CLI is told the folder and held
  // to it; nothing in the project can be touched, so there is no checkpoint to take and no other
  // turn to wait for.
  async #draftLease({ leaseId, messageId }) {
    const draft = await createLease({ projectRoot: this.#projectRoot, leaseId });
    return { ...draft, messageId, draft: true };
  }

  // Artifacts from a #2 turn: the files the checkpoint saw appear, as the room shows them.
  // Said once, when a writing turn has to wait for the one already writing in the project.
  async #sayWaitingToWrite({ messageId, agent }) {
    const ahead = this.#controlDesk.writer();
    if (ahead) await this.#emit('write.waiting', { messageId, agent: agent.id, behind: ahead.agent ?? null });
  }

  // A round's answers, for the local model's closing turn: who was asked, what each one said and
  // under which number, or that it did not answer. Handed the transcript instead, a 7B model gave
  // one agent's point to another, left one out and quoted itself.
  async #roundAnswers(planId) {
    const events = (await this.#store.readAll()).filter((event) => event.payload?.planId === planId);
    const asked = [...new Set(events.filter((event) => event.type === 'message.created' && event.payload.status === 'delegated' && event.payload.target !== event.payload.sender).map((event) => event.payload.target))];
    const answers = asked.map((agent) => {
      const said = events.find((event) => event.type === 'message.created' && event.payload.role === 'assistant' && event.payload.sender === agent && event.payload.status !== 'delegated');
      if (said) return { agent, sequence: said.sequence, text: said.payload.text ?? '' };
      const failed = events.find((event) => event.type === 'message.failed' && event.payload.target === agent);
      // Whole, so the closing turn can say it in the round's language and cut it at a sentence.
      return { agent, failed: true, error: failed ? String(failed.payload.error ?? '').slice(0, 600) : null };
    });
    return { asked, answers };
  }

  // The bytes of files the turn created, for telling a copy from a new file. Images only, and only
  // a few: this compares what an image tool made, not the project.
  async #bytesOf(paths) {
    const images = paths.filter((path) => /\.(png|jpe?g|webp|gif)$/i.test(path)).slice(0, 16);
    return (await Promise.all(images.map((path) => readFileBytes(joinPath(this.#projectRoot, path)).catch(() => null)))).filter(Boolean);
  }

  async #draftedIn(scratchDir, { depth = 2 } = {}) {
    const found = [];
    const walk = async (relative, level) => {
      const entries = await readdir(joinPath(this.#projectRoot, relative), { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const path = `${relative}/${entry.name}`;
        if (entry.isDirectory()) { if (level < depth) await walk(path, level + 1); continue; }
        if (!entry.isFile()) continue;
        const info = await statFile(joinPath(this.#projectRoot, path)).catch(() => null);
        found.push({ name: baseName(path), path, size: info?.size ?? 0, contentType: declaredTypeFor(path), status: 'created' });
      }
    };
    await walk(String(scratchDir).replace(/\/$/, ''), 0);
    return found.sort((a, b) => a.path.localeCompare(b.path));
  }

  async #artifactsFrom(files) {
    const out = [];
    for (const file of files) {
      if (file.status !== 'A') continue;
      const info = await statFile(joinPath(this.#projectRoot, file.path)).catch(() => null);
      out.push({ name: baseName(file.path), path: file.path, size: info?.size ?? 0, contentType: declaredTypeFor(file.path), status: 'created' });
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  // Agents that can receive a delegated step from `self`.
  delegatesFor(self) {
    return this.#agents.filter((agent) => agent.ready && agent.id !== self).map((agent) => agent.id);
  }

  activePlans() {
    return [...this.#plans.values()].map((plan) => ({ planId: plan.planId, orchestrator: plan.orchestrator, step: plan.step, total: plan.steps.length + (plan.closing ? 1 : 0), startedAt: plan.startedAt }));
  }

  activeTurns() {
    return [...this.#turns.entries()].map(([messageId, turn]) => ({ messageId, agent: turn.agent, planId: turn.planId, startedAt: turn.startedAt }));
  }

  // Master brake: every plan and every in-flight turn, recorded as one event.
  async stopAll(reason = t('STOPALL by the human')) {
    const plans = this.#plans.size;
    const turns = this.#turns.size;
    for (const plan of this.#plans.values()) plan.stopped = reason;
    this.#escalation.settleAll(null, 'stopped');
    // Results waiting to go back stay with the human: STOP ALL means nothing starts by itself.
    for (const id of [...this.#returns.keys(), ...this.#returning.keys()]) this.#dropped.add(id);
    this.#returns.clear();
    for (const turn of this.#turns.values()) turn.controller.abort(reason);
    this.#runDesk.stop('STOPALL');
    await this.#emit('room.stopped', { reason, plans, turns, agents: [...new Set([...this.#turns.values()].map((turn) => turn.agent))] });
    await Promise.allSettled([...this.#turns.values()].map((turn) => turn.promise));
    return { plans, turns };
  }

  // MOTHER speaks when the room starts to run away from the human.
  async #alert(code, message, key = code) {
    const now = Date.now();
    if ((this.#alerted.get(key) ?? 0) > now - 30000) return;
    this.#alerted.set(key, now);
    await this.#emit('room.alert', { code, message, plans: this.activePlans().length, turns: this.#turns.size });
  }

  // Human brake for ONE answer, which is a different thing from the master brake. STOPALL takes
  // down every plan and every agent in the room and is meant for when things have run away;
  // this takes down the one turn you are looking at, because an agent that has hung or started
  // down the wrong road should not cost the whole room to stop. The agent's process dies with the
  // abort and the turn records its own failure the way any other failure does.
  async stopTurn(messageId, reason = t('stopped by the human')) {
    const turn = this.#turns.get(messageId);
    if (!turn) return false;
    // Marked before the abort lands, so the failure it causes carries the mark: the turn ends
    // like any other failure because the process really was killed, and only this says it was
    // asked for.
    turn.stoppedByHuman = true;
    await this.#emit('turn.stopped', { messageId, agent: turn.agent, planId: turn.planId, reason, by: 'you' });
    turn.controller.abort(reason);
    // Waited out, the way the master brake waits: aborting only asks, and the turn still has to
    // kill its process and record how it ended. Returning before that leaves the caller — and
    // anything tidying up after it — racing a write that has not happened yet.
    await turn.promise?.catch(() => {});
    return true;
  }

  // Human brake: stops the remaining steps of a running plan and interrupts
  // the step in flight. Recorded in the log like everything else.
  async stopPlan(planId, reason = 'stopped by the human') {
    const plan = this.#plans.get(planId);
    if (!plan) return false;
    plan.stopped = reason;
    this.#escalation.settleAll(planId, 'stopped');
    for (const turn of this.#turns.values()) {
      if (turn.planId === planId) turn.controller.abort(reason);
    }
    return true;
  }

  // One room turn for one agent. `requester` is who asked ('you' or an
  // orchestrating agent); `depth` 0 turns may delegate, deeper ones may not.
  async #dispatch({ messageId, targetId, text, requester, depth, planId = null, allowDelegation = true, deferPlan = false, model = null, effort = null, attachments = [], references = [], lease = null, ash = false, mode = 1, escalation = null, returned = null, copilot = false }) {
    if (this.#shuttingDown) return null;
    const agent = this.#agents.find((item) => item.id === targetId);
    if (!agent?.detected) {
      // @madre is not a CLI to install: it is the room's local agent, here while Ollama runs with a
      // chat model. Saying "not installed" sent people to install something that does not exist.
      const error = agent?.local || targetId === 'madre'
        ? `@${targetId} left the project: Ollama is not running. Start Ollama, or open Local AI in Modules.`
        : `${targetId} is not installed on this computer.`;
      await this.#emit('message.failed', { messageId, target: targetId, planId, error });
      return null;
    }
    if (!agent.ready) {
      await this.#emit('message.failed', { messageId, target: targetId, planId, error: `${agent.label} was detected, but its MADRE adapter is not enabled yet.` });
      return null;
    }
    if (agent.route?.custom && !agent.route.allowed) {
      const destination = agent.route.host ?? 'an unrecognised host';
      const source = agent.route.source ?? 'a custom endpoint setting';
      const official = agent.id === 'codex' ? 'OpenAI' : agent.id === 'claude' ? 'Anthropic' : 'the agent\'s official service';
      await this.#emit('message.failed', {
        messageId,
        target: targetId,
        planId,
        error: `MADRE blocked @${agent.id} before sending the briefing: ${source} points to ${destination}, not ${official}. Remove that override to use the official service, or set PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=${agent.id} only if you trust that endpoint.`,
      });
      return null;
    }

    const priorEvents = await this.#store.readAll();
    // @madre never reads its own canned replies back: a small model would echo them.
    const { context, recall, memories } = await this.#contextFor(priorEvents, { messageId, text, omitSynthetic: Boolean(agent.local), by: { agent: targetId, turn: messageId } });
    let handoffId = null;
    if (context.previousAgent && context.previousAgent !== targetId) {
      handoffId = randomUUID();
      await this.#emit('handoff.created', {
        handoffId,
        fromAgent: context.previousAgent,
        toAgent: targetId,
        firstSequence: context.firstSequence,
        throughSequence: context.throughSequence,
        messageCount: context.messages.length,
        omittedMessages: context.omittedMessages,
        kind: planId ? 'delegated' : 'automatic',
        planId,
      });
    }

    if (this.#turns.size >= this.#maxConcurrentTurns) {
      await this.#alert('too-many-turns', `${this.#turns.size + 1} agents are working at once. If this is not what you asked for, type STOPALL.`);
    }
    if ([...this.#turns.values()].some((turn) => turn.agent === agent.id)) {
      await this.#alert('agent-double-booked', `@${agent.id} is already answering another turn; answers may cross. STOPALL halts everything.`, `double:${agent.id}`);
    }
    for (const plan of this.#plans.values()) {
      if (Date.now() - plan.startedAt > this.#planMaxAgeMs) {
        await this.#alert('plan-long', `The plan by @${plan.orchestrator} has been running for ${Math.round((Date.now() - plan.startedAt) / 60000)} min. STOPALL halts it.`, `plan-long:${plan.planId}`);
      }
    }
    // The limit this turn will be held to, said with its start so the room counts down from the
    // real number and not from a default it guessed.
    await this.#emit('agent.started', { messageId, agent: agent.id, handoffId, planId, timeoutMs: this.timeoutFor(agent.id, { writing: Number(mode) >= 2 || Boolean(lease) }) });
    const controller = new AbortController();
    const turn = { controller, promise: null, planId, agent: agent.id, startedAt: Date.now() };
    turn.promise = this.#runTurn({ messageId, agent, text, requester, depth, planId, allowDelegation, context, recall, memories, handoffId, signal: controller.signal, model, effort, attachments, references, lease, ash, mode, escalation, returned, copilot });
    this.#turns.set(messageId, turn);
    let outcome = null;
    try {
      outcome = await turn.promise;
    } finally {
      this.#turns.delete(messageId);
      if (!this.#turns.size && mode !== 0) this.#archivist.schedule();
      // What a copilot turn asked to run, now that it has let go of the project.
      void this.#track(this.#flushCopilotRuns()).catch((error) => console.error(`MADRE copilot could not run: ${error.message}`));
      this.#flushReturns();
    }
    // The orchestrator's turn is over before its plan starts, so it is never
    // counted as in flight while the others work.
    if (outcome?.directives?.steps.length && !deferPlan) {
      let next = outcome.directives;
      let parent = outcome.responseMessageId;
      const grants = new Map();
      // The orchestrator may form another wave after seeing the crew's replies. Three waves
      // bound cost and time; a grant for the plan carries forward, only for its authorized scope.
      for (let round = 0; next?.steps.length && round < 3; round += 1) {
        const continued = await this.#runPlan({ orchestrator: agent.id, parentMessageId: parent, directives: next, lease, ash, mode, grants, copilot: copilot && this.copilotOn() });
        next = continued?.directives ?? null;
        parent = continued?.responseMessageId ?? parent;
        lease = continued?.lease ?? lease;
      }
      if (next?.steps.length) await this.#emit('plan.ignored', { orchestrator: agent.id, responseMessageId: parent, reasons: ['The plan reached its three-round limit. Continue with a new message if needed.'] });
    }
    return outcome?.responseMessageId ?? null;
  }

  // What the next turn to an agent would carry, built without starting a process or counting a
  // memory read. Signed linked notes for BISHOP are fetched only on send, so the preview marks
  // that one dynamic part instead of spending a contract's hourly reading allowance here.
  async briefing({ agent: agentId, mode = 1, text = '', ash = false } = {}) {
    const agent = this.#agents.find((one) => one.id === agentId && one.detected);
    if (!agent) return null;
    const priorEvents = await this.#store.readAll();
    const built = await contextFor({
      memory: this.#memory, priorEvents, messageId: null, text,
      contextMaxChars: this.#contextMaxChars, recallShare: this.#recallShare,
      remember: () => {}, omitSynthetic: Boolean(agent.local), anchor: this.#contextAnchor,
      cascade: this.#cascade, track: false,
    });
    const mcpServers = this.#toolsForTurn && agent.adapter !== 'madre-local'
      ? await this.#toolsForTurn({ agent: agent.id, mode, lease: null, scratchDir: null }).catch(() => [])
      : [];
    const bishop = this.#bishopForTurn ? await this.#bishopForTurn({ agent: agent.id, mode, text, preview: true }).catch(() => null) : null;
    // Recall from links reads the other room when the turn runs; the preview only says it will.
    const linkedPreview = this.#linkedForTurn && agent.adapter !== 'madre-local' && mode !== 0 ? await this.#linkedForTurn({ agent: agent.id, mode, text, preview: true }).catch(() => null) : null;
    const scopes = this.scopesFor(agent.id);
    // The lease a turn at this mode would be given, shaped exactly as the turn shapes it but
    // creating nothing: no folder is made, no checkpoint is taken. Without it the preview would
    // quietly under-report what a #2 or a #3 turn is actually told it may do.
    const ceiling = Math.min(mode, scopes.maxMode ?? 0);
    const lease = ceiling >= 2 && scopes.write?.enabled && scopes.write?.wired
      ? {
        leaseId: 'would-be-granted-when-you-send',
        outDir: this.#projectRoot,
        relativeDir: '.',
        scratchDir: '.pulse/out/<this turn>',
        scopes: { ...Object.fromEntries(SCOPES.map((scope) => [scope, scopes[scope].enabled && scopes[scope].wired])), write: true },
        create: ceiling === 2,
        control: ceiling >= 3,
        airlock: ceiling === 4,
      }
      : null;
    const options = this.#promptOptions({
      agent, text, requester: 'you', depth: 0, allowDelegation: true,
      context: built.context, recall: built.recall, memories: built.memories,
      attachments: [], references: [], lease,
      scopes: { web: scopes.web.enabled && scopes.web.wired, imageGen: scopes.imageGen.enabled && scopes.imageGen.wired },
      ash: ash === true && this.ashEnabled(), choices: this.#choicesEnabled && mode !== 0, runs: this.#runsEnabled && mode !== 0 && mode < 4, mode, escalation: null, mcpServers, bishop,
    });
    // Each block with what put it here and what would take it away, so "read, never written" can
    // be checked one block at a time instead of believed.
    const parts = promptParts(options).map((part) => ({ id: part.id, text: part.text, chars: part.text.length, ...(BLOCK_SOURCES[part.id] ?? { when: null, where: null }) }));
    return {
      agent: agent.id, label: agent.label, mode,
      // What the mode would actually amount to for this agent: its ceiling is its own.
      ceiling,
      maxMode: scopes.maxMode ?? 0,
      lease: Boolean(lease),
      parts,
      chars: parts.reduce((sum, part) => sum + part.chars, 0),
      spared: sparedChars(options),
      window: { from: built.context?.firstSequence ?? null, through: built.context?.throughSequence ?? null, omitted: built.context?.omittedMessages ?? 0, carried: built.context?.messages?.length ?? 0 },
      recalled: built.memories?.length ?? 0,
      quoted: built.recall?.entries?.length ?? 0,
      dynamic: Boolean(bishop && agent.adapter === 'madre-local') || Boolean(linkedPreview?.dynamic),
    };
  }

  // How this agent's CLI would actually be started: the command line its own adapter builds, the
  // folder it runs in, the names of what MADRE sets in its environment, and the tool servers
  // attached for the turn. Built from the same builders the real run uses, and nothing is spawned.
  //
  // Values of environment variables are never reported, only names. One of those variables is a
  // provider key, and a screen that shows what a process is given must not be the easiest place
  // in the product to read a secret out of.
  async launch({ agent: agentId, mode = 1 } = {}) {
    const agent = this.#agents.find((one) => one.id === agentId && one.detected);
    if (!agent) return null;
    if (agent.local || agent.adapter === 'madre-local') {
      return {
        agent: agent.id, label: agent.label, local: true,
        says: 'No process is started for @madre: it is the local model answering inside MADRE, through Ollama on this computer.',
        mcpServers: [], env: [], isolation: [],
      };
    }
    const scopes = this.scopesFor(agent.id);
    const ceiling = Math.min(mode, scopes.maxMode ?? 0);
    const mcpServers = this.#toolsForTurn ? await this.#toolsForTurn({ agent: agent.id, mode: ceiling, lease: null, scratchDir: null }).catch(() => []) : [];
    const prompt = '<the briefing above>';
    const shared = { projectRoot: this.#projectRoot, prompt, model: null, attachments: [], lease: null, scopes: { web: scopes.web.enabled && scopes.web.wired, imageGen: scopes.imageGen.enabled && scopes.imageGen.wired }, memoryServer: this.#memoryServer, mcpServers };
    const args = agent.id === 'codex' ? buildCodexArgs(shared)
      : agent.id === 'claude' ? buildClaudeArgs({ ...shared, attachmentsDir: null, imageStudio: null })
        : agent.id === 'gemini' ? buildGeminiArgs({ ...shared, policyPath: '<written for this turn, deleted after it>', attachmentsDir: null })
          : agent.id === 'opencode' ? buildOpenCodeArgs(shared)
            : agent.id === 'cursor' ? buildCursorArgs(shared)
              : null;
    if (!args) return { agent: agent.id, label: agent.label, local: false, says: `MADRE has no adapter for @${agent.id}.`, mcpServers: [], env: [], isolation: [] };
    const isolation = {
      codex: ['--ephemeral: the run keeps no session of its own, so nothing said here reaches another project.'],
      claude: ['--no-session-persistence: the run keeps no session of its own.', 'Only the project\'s own CLAUDE.md and MADRE\'s briefing are read; hooks, plugins and outside MCP servers are not.'],
      gemini: ['GEMINI_CLI_HOME points at a temporary home made for this turn and removed after it, so settings, hooks and extensions come from there and not from yours.', 'GEMINI_CLI_NO_RELAUNCH keeps the launcher from spawning a second process MADRE could not stop.'],
      opencode: ['The run is given the model you chose and nothing else of your session.'],
      cursor: ['#0 and #1: --mode ask, Cursor\'s read-only mode, whatever its own settings say; no edits and no commands. #2 and #3: its agent mode with --force, writing allowed and every command denied. #4: commands allowed too. The places nobody writes stay denied at every mode, and MADRE locks and puts them back itself.', 'CURSOR_CONFIG_DIR points at a configuration made for this turn and removed after it, with only what the mode you chose allows. The sign-in stays in the system keychain.'],
    }[agent.id] ?? [];
    const env = {
      gemini: [{ name: 'GEMINI_CLI_HOME', note: 'the temporary home for this turn' }, { name: 'GEMINI_CLI_NO_RELAUNCH', note: 'so the launcher stays killable' }],
      cursor: [{ name: 'CURSOR_CONFIG_DIR', note: 'the configuration for this turn, from the mode you chose' }, { name: 'NO_OPEN_BROWSER', note: 'a turn never opens a page' }],
    }[agent.id] ?? [];
    return {
      agent: agent.id, label: agent.label, local: false,
      executable: agent.path ?? agent.id,
      cwd: this.#projectRoot,
      args: redactArgs(args),
      promptMarker: prompt,
      isolation,
      env,
      mcpServers: mcpServers.map((server) => ({ name: server.name, command: server.command, args: server.args ?? [], tools: server.tools ?? [], brief: server.brief ?? null, env: Object.keys(server.env ?? {}) })),
      memoryServer: this.#memoryServer ? { name: this.#memoryServer.name, command: this.#memoryServer.command, args: this.#memoryServer.args ?? [], tools: this.#memoryServer.tools ?? [] } : null,
    };
  }

  // What the last prompt for each turn was made of, kept only until its bill arrives.
  #promptShape = new Map();

  #promptFor(input) {
    const options = this.#promptOptions(input);
    const parts = promptParts(options);
    return { text: parts.map((part) => part.text).join('\n'), parts, spared: sparedChars(options) };
  }

  #prompt(input) {
    return buildPrompt(this.#promptOptions(input));
  }

  #promptOptions(input) {
    return ({
      ...input,
      others: this.delegatesFor(input.agent.id),
      delegation: this.#delegation,
      maxPlanSteps: this.#maxPlanSteps,
      scopesFor: (id) => this.scopesFor(id),
      motherLines: this.#mother ? this.#mother.recent() : [],
      memoryServer: this.#memoryServer,
      controlHolder: this.#controlDesk.holder?.agent ?? null,
      privacyMarker: this.#privacy?.marker ?? '[ENTIDAD-ORG]',
      sdk: sdkPaths(),
      madreModel: this.#agents.find((agent) => agent.id === 'madre' && agent.ready)?.version ?? null,
    });
  }

  async #runTurn({ messageId, agent, text, requester, depth, planId, allowDelegation, context, recall = null, memories = null, handoffId, signal, model = null, effort = null, attachments = [], references = [], lease: sharedLease = null, ash = false, mode = 1, escalation = null, returned = null, copilot = false }) {
    // The lease is the human's; what each agent may do inside it is that
    // agent's own enabled scopes. A delegate without file creation runs
    // read-only even while the plan holds a lease.
    const agentScopes = this.scopesFor(agent.id);
    const enabled = Object.fromEntries(SCOPES.map((scope) => [scope, agentScopes[scope].enabled && agentScopes[scope].wired]));
    // Web access is a standing scope the human switched on for this agent;
    // creation and image generation only act inside a lease.
    const turnScopes = { web: enabled.web, imageGen: enabled.imageGen };
    let lease = null;
    let controlRun = null;
    let createRun = null;
    let responseMessageId = null;
    // The copilot's #3 reaches past an agent's max mode, never past what its CLI can write.
    const asCopilot = copilot === true && mode === 3 && this.copilotOn() && Boolean(agentScopes.write?.capable);
    if (mode >= 3 && (requester === 'you' || planId) && depth <= 1 && (agentScopes.maxMode >= mode || asCopilot) && (enabled.write || asCopilot)) {
      // CONTROL: the project itself is the writable root, and a checkpoint
      // taken now makes every change of this turn reversible. A plan step gets
      // it when the orchestrator, itself in #3, named #3 for that step.
      if (this.#controlDesk.holder) {
        await this.#alert('control-busy', `@${this.#controlDesk.holder.agent} still holds EDIT; @${agent.id} answers read-only this turn.`, `control-busy:${agent.id}`);
      } else {
        await this.#sayWaitingToWrite({ messageId, agent });
        const seat = await this.#controlDesk.begin({ agent, messageId, enabledScopes: enabled, mode, signal }).catch((error) => (error?.code === 'ABORT_ERR' ? null : Promise.reject(error)));
        if (!seat) { await this.#emit('message.failed', { messageId, target: agent.id, planId, error: `Stopped while waiting for the project: another turn was writing in it.`, stopped: true }); return null; }
        controlRun = seat.run;
        // A copilot does not delete: what it removes is put back when the turn settles.
        if (asCopilot) controlRun.noDeletes = true;
        lease = seat.lease;
        await this.#emit('control.started', seat.announcement);
      }
    } else if (sharedLease) {
      lease = enabled.write ? {
        ...sharedLease,
        scopes: Object.fromEntries(SCOPES.map((scope) => [scope, Boolean(sharedLease.scopeCeiling?.[scope] && enabled[scope])])),
      } : null;
    } else if (agentScopes.write.always && enabled.write && requester !== 'you' && requester !== 'mother') {
      // Standing lease for a delegate: the human opted this agent into
      // creating files on every turn, so a plan step gets its own directory.
      lease = await this.#projectLease({ leaseId: randomUUID(), messageId });
      lease.scopeCeiling = { write: true, imageGen: false, web: true };
      lease.scopes = { ...enabled, imageGen: false };
      await this.#emit('lease.granted', {
        standing: true,
        leaseId: lease.leaseId,
        messageId,
        agent: agent.id,
        outDir: lease.relativeDir,
        scratchDir: lease.scratchDir,
        scopes: ['write'],
        unavailable: SCOPES.filter((scope) => !agentScopes[scope].capable),
        planId,
      });
    }
    if (lease?.create && !controlRun) {
      // CREATE: photograph the project now; after the turn only what appeared stays. Another turn
      // writing in the project, in this conversation or another, is waited for first.
      await this.#sayWaitingToWrite({ messageId, agent });
      const seat = await this.#controlDesk.begin({ agent, messageId, enabledScopes: enabled, mode: 2, signal }).catch((error) => (error?.code === 'ABORT_ERR' ? null : Promise.reject(error)));
      if (!seat) { await this.#emit('message.failed', { messageId, target: agent.id, planId, error: `Stopped while waiting for the project: another turn was writing in it.`, stopped: true }); return null; }
      createRun = seat.run;
      // The folder this turn was told to draft in, so settling it does not undo what it was
      // invited to write. Only this turn's own folder; every other `.pulse` path stays forbidden.
      createRun.scratchDir = lease.scratchDir ?? null;
      lease = { ...lease, checkpoint: seat.run.checkpoint };
    }
    turnScopes.imageGen = Boolean(lease?.scopes?.imageGen);
    // The step asks for files but nobody granted a lease: say so now, with a
    // way out, instead of letting the agent's refusal be the only signal.
    if (!lease && !sharedLease && !escalation && looksLikeCreation(text)) {
      await this.#emit('lease.missing', {
        messageId,
        agent: agent.id,
        requester,
        planId,
        text,
        message: `@${agent.id} was asked to create something but no CREATE lease is active${requester !== 'you' ? ` (permission written by @${requester} inside the conversation does not count)` : ''}. It will answer read-only.`,
      });
    }
    // Image Studio: MADRE's MCP image server, for agents whose CLI has no native
    // image generation, only inside a lease with the image scope on.
    const native = Boolean(CAPABILITIES[agent.id]?.imageGen);
    const studio = imageModuleState();
    const imageStudio = lease?.scopes?.imageGen && enabled.imageGen && !native && studio.enabled
      ? imageStudioFor({ enabled: true, model: studio.model, outDir: lease.scratchDir ? joinPath(this.#projectRoot, lease.scratchDir) : lease.outDir })
      : null;
    // The turn's effective mode: #0 for ghosts, #3 in control, #2 only while it holds a lease.
    const turnMode = mode === 0 ? 0 : controlRun ? controlRun.mode : lease ? 2 : 1;
    try {
      const invoke = this.#invokers[agent.adapter];
      if (!invoke) throw new Error(`${agent.label} does not have a supported MADRE adapter.`);
      const before = lease && !lease.control && !lease.create ? await snapshot(lease.outDir) : null;
      const writingSince = Date.now();
      responseMessageId = randomUUID();
      this.#liveTurns.set(responseMessageId, { agent: agent.id, mode: turnMode });
      const notesBefore = this.#memory ? this.#memory.maxMemoryId() : 0;
      const others = this.delegatesFor(agent.id);
      const mayDelegate = allowDelegation && this.#delegation && depth === 0;
      // Tools the modules hand to this turn (a browser, say), attached to the CLI for this run only.
      const mcpServers = this.#toolsForTurn && agent.adapter !== 'madre-local'
        ? await this.#toolsForTurn({ agent: agent.id, mode: turnMode, text, turn: responseMessageId, lease, scratchDir: lease?.scratchDir ? joinPath(this.#projectRoot, lease.scratchDir) : null, servers: this.#runDesk.serving().filter((one) => !one.network).map((one) => one.port) }).catch(() => [])
        : [];
      const bishop = this.#bishopForTurn ? await this.#bishopForTurn({ agent: agent.id, mode: turnMode, text, turn: responseMessageId }).catch(() => null) : null;
      // Notes a link with automatic recall brings to this turn (fase 3e): never in GHOST, never for
      // @madre (its briefing is its own), bounded by the module and counted as readings.
      const linked = this.#linkedForTurn && agent.adapter !== 'madre-local' && turnMode !== 0
        ? (await this.#linkedForTurn({ agent: agent.id, mode: turnMode, text, turn: responseMessageId }).catch(() => null))?.text ?? null
        : null;
      // The prompt and the shape it was built from: one is sent, the other is kept until the CLI
      // says what it cost, so the bill can be attributed to the blocks that caused it.
      const shaped = this.#promptFor({ agent, text, requester, depth, allowDelegation, context, recall, memories, attachments, references, lease, scopes: turnScopes, imageStudio, ash, choices: this.#choicesEnabled && turnMode !== 0, runs: this.#runsEnabled && turnMode !== 0 && turnMode < 4, mode: turnMode, escalation, mcpServers, bishop, linked, returned, copilot: asCopilot && controlRun ? copilotBrief(this.#copilotNow()) : null, sharedLeaseHint: sharedLease && !lease ? 'A creation lease is active for this plan, but file creation is not enabled for you: answer without creating files and say so if asked to create one.' : null });
      this.#promptShape.set(responseMessageId, { parts: shaped.parts, spared: shaped.spared, servers: [this.#memoryServer?.name, ...mcpServers.map((server) => server.name)].filter(Boolean) });
      // What this turn is about to read, said while it is still reading it. The size is exact;
      // only the conversion to tokens is an estimate, and it is made at this room's own rate.
      const reading = this.#reading(shaped.parts);
      this.#say('turn.reading', { messageId, agent: agent.id, ...reading });
      // And again as the answer arrives. What is counted is the answer itself, not the protocol
      // around it, so a CLI that hands over one blob at the end honestly reports nothing until
      // then rather than a number that means the shape of its own output format.
      let told = 0;
      const onProgress = ({ chars }) => {
        if (!Number.isFinite(chars) || chars <= told) return;
        told = chars;
        this.#say('turn.reading', { messageId, agent: agent.id, ...reading, out: chars, outTokens: this.#rate ? Math.round(chars / this.#rate) : null });
      };
      const result = await invoke({
        onProgress,
        executable: agent.path,
        projectRoot: this.#projectRoot,
        text,
        prompt: shaped.text,
        timeoutMs: this.timeoutFor(agent.id, { writing: Boolean(lease) }),
        signal,
        model,
        effort,
        attachments,
        lease,
        scopes: turnScopes,
        imageStudio,
        memoryServer: memoryServerForTurn(this.#memoryServer, { agent: agent.id, messageId: responseMessageId, mode: turnMode }),
        mcpServers,
        bishop,
        // For @madre: who asks, who it may convene, and whether a plan would run at all.
        requester,
        crew: others,
        delegation: mayDelegate,
        maxSteps: this.#maxPlanSteps,
        // And for its closing turn of a round: what each agent asked actually said, with its number.
        round: agent.id === MADRE_AGENT_ID && planId && /this is your closing turn/i.test(text) ? await this.#roundAnswers(planId) : undefined,
      });
      // STOP was pressed while the agent answered: whatever comes back late is not said (2026-10-20).
      // An adapter that does not hear the signal still cannot post an answer the person stopped.
      signal?.throwIfAborted();
      // Privacy: a private term in a reply is replaced before the ledger, the plan parser,
      // the archivist or any other agent can see it. The reply says how many, not which.
      const guarded = this.#privacy?.redact(result.text ?? '') ?? { text: result.text, hits: 0 };
      if (guarded.hits) result.text = guarded.text;
      // CREATE: what appeared stays and is shown; what existed before is put back and said.
      const createChanges = createRun ? await this.#controlDesk.settleOrSay(createRun) : null;
      // Images an agent's own tool made outside the project (Codex keeps them under its home) come
      // into this turn's draft folder, so they are kept and shown like anything the turn wrote. One
      // the agent already copied into the project is shown there, not twice.
      if (createRun?.scratchDir && Array.isArray(result.generatedImages)) {
        const placed = await this.#bytesOf((createChanges?.files ?? []).filter((file) => file.status === 'A').map((file) => file.path));
        for (const image of result.generatedImages.slice(0, 8)) {
          const bytes = await readFileBytes(image).catch(() => null);
          if (!bytes || placed.some((one) => one.equals(bytes))) continue;
          await copyFile(image, joinPath(this.#projectRoot, createRun.scratchDir, baseName(image))).catch(() => null);
        }
      }
      const artifacts = createChanges ? await this.#artifactsFrom(createChanges.files) : lease && !lease.control ? diffSnapshots(before, await snapshot(lease.outDir), { relativeDir: lease.relativeDir }) : [];
      // What the turn wrote in its own draft folder. The diff cannot see it in a project that ignores
      // `.pulse/` (most do, the moment a .gitignore names it), so `/module` wrote its file there and
      // no install card ever came. The folder is new for this turn: all of it is this turn's.
      if (createRun?.scratchDir) {
        for (const drafted of await this.#draftedIn(createRun.scratchDir)) if (!artifacts.some((one) => one.path === drafted.path)) artifacts.push(drafted);
      }
      // A turn that could write, wrote nothing, and answers naming files. That is the shape of a
      // write refused without a word — a headless CLI cannot stop to ask, so what the policy does
      // not allow simply fails and the model reports the file as created. The room does not read
      // the prose for a claim; it takes the paths the reply names and asks the disk. Only what is
      // named AND absent is said, so an agent talking about files that exist says nothing here.
      // A reply that opens a plan names the files its steps will make (manual tests, 2026-10-17:
      // «Claude arma el plan, Codex escribe memoria.html» read as a file Claude failed to write).
      if (lease && !lease.control && artifacts.length === 0 && !/```pulse\s*\n/.test(result.text ?? '')) {
        const roots = [this.#projectRoot, lease.outDir, lease.realOutDir].filter(Boolean);
        const named = namedPaths(result.text, { roots });
        const missing = [];
        for (const path of named.slice(0, 12)) {
          const full = path.startsWith('/') ? path : joinPath(this.#projectRoot, path);
          if (!(await statFile(full).then(() => true, () => false))) missing.push(path);
        }
        // `requestId` lets the page put the same request back in the box for another try.
        if (missing.length) await this.#emit('create.missing', { messageId: responseMessageId, requestId: messageId, agent: agent.id, planId, files: missing });
      }
      // CONTROL: what really changed in the project, forbidden zones reverted on the spot.
      const controlChanges = controlRun ? await this.#controlDesk.settleOrSay(controlRun) : null;
      const directives = mayDelegate
        ? parseDirectives(result.text, { self: agent.id, available: others, maxSteps: this.#maxPlanSteps })
        : { steps: [], closing: null, ignored: [] };
      if (directives.steps.length === 0 && directives.ignored.length && depth === 0) {
        // The agent tried to delegate but the block was unusable; say so, or the
        // human sees a plan-shaped reply and nothing happening.
        await this.#emit('plan.ignored', { orchestrator: agent.id, responseMessageId, reasons: directives.ignored.map((item) => item.reason) });
      }
      // Only a ```pulse fence is a plan, read the way src/directives.mjs reads it; ```pulse-run,
      // ```pulse-ask and ```pulse-salas are not (S-029 in docs/MACROVERSO.md).
      if (depth > 0 && /```pulse\s*\n/i.test(result.text)) {
        await this.#alert('nested-delegation', `@${agent.id} tried to open a plan from inside a plan. It was ignored; the sequence stays under @${requester}. STOPALL if the project drifts.`, `nested:${agent.id}`);
      }
      // A question the agent put to the human: it leaves the text and comes back as buttons.
      const asked = this.#choicesEnabled && turnMode !== 0 ? parseChoice(result.text) : null;
      // Commands it wants the human to run: the same, as buttons. AIRLOCK runs its own.
      const requested = !asked && this.#runsEnabled && turnMode !== 0 && turnMode < 4 ? parseRunRequest(result.text) : null;
      await this.#emit('message.created', {
        messageId: responseMessageId,
        parentMessageId: messageId,
        role: 'assistant',
        sender: agent.id,
        target: requester,
        text: asked ? withoutChoice(result.text) : requested ? withoutRunRequest(result.text) : result.text,
        // What the archive handed this turn, so the room can see its own memory working. The
        // whole point of remembering is invisible until the moment it is used.
        recalled: memories?.length
          ? memories.slice(0, 6).map((note) => ({ id: note.id, kind: note.kind, text: note.text.length > 150 ? `${note.text.slice(0, 149)}…` : note.text, via: note.via ?? 'search' }))
          : undefined,
        ash: ash ? { active: true } : undefined,
        status: 'completed',
        planId,
        model,
        effort: effort ?? undefined,
        synthetic: result.synthetic || undefined,
        redacted: guarded.hits || undefined,
        mode: turnMode,
        copilot: asCopilot && controlRun ? true : undefined,
        leaseId: lease?.leaseId,
        artifacts: artifacts.length ? artifacts : undefined,
        delegates: directives.steps.length ? directives.steps.map((step) => step.agent) : undefined,
      });
      if (ash && turnMode !== 0) {
        const validation = validateAshReply({ request: text, response: result.text });
        await this.#emit('ash.validated', { messageId, responseMessageId, agent: agent.id, ...validation });
      }
      if (asked) await this.#emit('choice.offered', { messageId, responseMessageId, agent: agent.id, question: asked.question, options: asked.options, recommended: asked.recommended ?? undefined, modes: asked.modes ?? undefined });
      if (requested) {
        await this.#emit('run.requested', { messageId, responseMessageId, agent: agent.id, reason: requested.reason, commands: requested.commands, mode: turnMode, copilot: asCopilot && controlRun ? true : undefined });
        if (asCopilot && controlRun) this.#copilotRuns.push(responseMessageId);
      }
      if (guarded.hits) await this.#emit('privacy.redacted', { agent: agent.id, messageId, responseMessageId, hits: guarded.hits, kinds: guarded.kinds, marker: this.#privacy.marker });
      if (artifacts.length) {
        await this.#emit('artifacts.created', { leaseId: lease.leaseId, messageId, responseMessageId, agent: agent.id, outDir: lease.relativeDir, files: artifacts });
        // A <id>.module.mjs is an agent proposing a module: the human installs it from the room, or not.
        for (const file of artifacts.filter((item) => isModuleFile(item.path))) {
          await this.#emit('module.proposed', { agent: agent.id, messageId, responseMessageId, path: file.path, name: file.name });
        }
      }
      if (createChanges && (createChanges.existingReverted.length || createChanges.forbiddenReverted.length)) {
        await this.#emit('create.reverted', { checkpointId: createChanges.checkpointId, agent: agent.id, messageId, responseMessageId, existing: createChanges.existingReverted, forbidden: createChanges.forbiddenReverted, message: createChanges.message });
      }
      // What the agent saved through memory_note during this turn, for the bubble's hint.
      if (this.#memory && turnMode !== 0) {
        const noted = this.#memory.notesSince(notesBefore, { agent: agent.id });
        if (noted.length) {
          await this.#emit('memory.noted', { agent: agent.id, messageId, responseMessageId, notes: noted.map((note) => ({ id: note.id, kind: note.kind, text: note.text, fromSequence: note.fromSequence, throughSequence: note.throughSequence })), total: this.#memory.memoryCount() });
          this.#vectors.schedule();
        }
      }
      if (controlChanges) await this.#emit('control.changed', { ...controlChanges, responseMessageId });
      // A writing turn may also have written where git does not look; the Finder hears about it.
      if (lease && turnMode >= 2) {
        const listed = new Set([...artifacts.map((file) => file.path), ...(controlChanges?.files ?? []).map((file) => file.path)]);
        const touched = (await filesChangedSince(this.#projectRoot, writingSince).catch(() => [])).filter((path) => !listed.has(path));
        if (touched.length) await this.#emit('files.touched', { agent: agent.id, messageId, responseMessageId, files: touched });
      }
      // Codex and OpenCode give tokens, not dollars: the turn is priced at the list price of the
      // model it ran on (src/prices.mjs), an estimate that says it is one. Gemini prices itself in
      // its adapter, where its report names each model it used.
      if (result.usage) result.usage = withListPrice(result.usage, await this.#pricedModel(agent.id, model));
      await this.#recordUsage(agent.id, result.usage, { messageId, responseMessageId });
      await this.#recordCost(agent.id, responseMessageId, result.usage, turnMode);
      this.#liveTurns.delete(responseMessageId);
      // Which model the turn ran on, when the room knows it (the one asked for, or the agent's
      // default): what answered is what MADRE can offer again when another model fails.
      const ranOn = await this.#pricedModel(agent.id, model).catch(() => null);
      await this.#emit('agent.completed', { messageId, agent: agent.id, handoffId, planId, ...(ranOn ? { ranOn } : {}) });
      return { responseMessageId, directives };
    } catch (error) {
      if (responseMessageId) this.#liveTurns.delete(responseMessageId);
      if (responseMessageId && this.#promptShape.has(responseMessageId)) {
        const shape = this.#promptShape.get(responseMessageId);
        this.#promptShape.delete(responseMessageId);
        if (turnMode !== 0) {
          const cost = turnCost(shape.parts, null);
          await this.#emit('turn.cost', { agent: agent.id, mode: turnMode, responseMessageId, ash: Boolean(cost.blocks.ash), failed: true, spared: shape.spared, ...cost });
        }
      }
      // A CLI that does not know its model says so in its vendor's words, which read like an outage
      // or a permission problem. MADRE says what it is first; the CLI's own line stays after it,
      // word for word, so it can still be searched.
      const said = failureMessage(error);
      const plain = MODEL_NOT_FOUND.test(String(error?.message ?? error ?? ''))
        ? `${model ? `${agent.label} does not know the model \`${model}\`.` : `${agent.label} does not know the model it was asked to use.`} Choose another on the model chip beside TO @${agent.id}, or the default; permissions and modes have nothing to do with it. CLI: ${said}`
        : said;
      // A turn cut short (the time limit, STOP ALL, a crash) may still have written. What it left is
      // read and kept the way any turn's is, CREATE still putting back what existed before, and the
      // failure carries the list and its checkpoint: the first «write the app» was cut at 180 s
      // with two files of three on disk, and the room said only that Claude did not answer.
      let partial = null;
      const writer = controlRun ?? createRun;
      if (writer) {
        const changes = await this.#controlDesk.settleOrSay(writer);
        if (changes.files.length || changes.unreadable || changes.existingReverted.length) {
          const created = await this.#artifactsFrom(changes.files);
          partial = { checkpointId: changes.checkpointId, mode: changes.mode, files: changes.files, created, existingReverted: changes.existingReverted, unreadable: changes.unreadable ?? undefined };
        }
      }
      const cutByClock = ['TIMEOUT', 'IDLE'].includes(error?.code);
      const failedOn = await this.#pricedModel(agent.id, model).catch(() => null);
      await this.#emit('message.failed', {
        messageId, target: agent.id, planId,
        ...(failedOn ? { ranOn: failedOn } : {}),
        error: this.#privacy ? this.#privacy.redact(plain).text : plain,
        ...(this.#turns.get(messageId)?.stoppedByHuman ? { stopped: true } : {}),
        // Cut because MADRE is closing: nothing went wrong in the turn, so nobody files it as a fault.
        ...(this.#shuttingDown ? { closing: true } : {}),
        ...(cutByClock ? { timeout: { ms: this.timeoutFor(agent.id, { writing: Boolean(lease) }), writing: Boolean(lease), idle: error.code === 'IDLE' } } : {}),
        ...(partial ? { partial } : {}),
      });
      return null;
    } finally {
      // Release CONTROL whichever way the turn ended; the checkpoint stays for UNDO.
      await this.#controlDesk.release(controlRun);
      await this.#controlDesk.release(createRun);
    }
  }

  async #runPlan({ orchestrator, parentMessageId, directives, lease = null, ash = false, mode = 1, grants = new Map(), copilot = false }) {
    const planId = randomUUID();
    const closing = directives.closing ?? 'Review the delegated answers and the work completed. If more work is needed within the permission already granted by the human, finish your reply with one new pulse plan. If a command requested from the human has not run, say what is waiting. Ask the human only for a decision or a new #3/#4 key.';
    // The plan's ceiling is the human's mode: #3 when the orchestrator held CONTROL, #2 while a
    // lease exists, #1 otherwise. A step may ask for a mode ("@codex #2: …"); it gets the lowest
    // of what it asked, the ceiling and its own MAX MODE. Without a number it reads, or creates
    // while a lease exists: as in 1.0, #3 has to be asked for by name.
    const ceiling = mode >= 3 ? mode : lease ? 2 : 1;
    // A key for one delegate does not authorize every other provider in the plan, and #4 is never
    // reached through the human's own #4: a delegate gets it only with its own key.
    const planGrants = grants;
    const reach = (agent, asked) => Math.max(asked >= 4 ? Math.min(ceiling, 3) : ceiling, planGrants.get(agent) ?? 0);
    const askedOf = (step) => normalizeMode(step.mode, lease ? 2 : 1);
    // Under the copilot the plan gives each step up to #3 whatever its agent's max mode, as long as
    // its CLI can write; #4 stays the human's.
    const underCopilot = () => copilot === true && this.copilotOn();
    const capOf = (scopes) => (underCopilot() && scopes.write?.capable ? Math.max(scopes.maxMode, 3) : scopes.maxMode);
    const stepMode = (step) => {
      const scopes = this.scopesFor(step.agent);
      const asked = askedOf(step);
      const granted = Math.min(asked, reach(step.agent, asked), capOf(scopes));
      return granted >= 2 && !(scopes.write.enabled || (underCopilot() && scopes.write?.capable)) ? 1 : granted;
    };
    const plan = { planId, orchestrator, steps: directives.steps, closing, step: 0, stopped: null, startedAt: Date.now() };
    this.#plans.set(planId, plan);
    await this.#emit('plan.created', {
      planId,
      orchestrator,
      parentMessageId,
      steps: directives.steps.map((step) => ({ ...step, mode: stepMode(step) })),
      closing,
      ignored: directives.ignored,
      mode: ceiling,
      leaseId: lease?.leaseId ?? null,
    });
    let continuation = null;
    try {
      for (const [index, step] of directives.steps.entries()) {
        if (plan.stopped) break;
        plan.step = index + 1;
        const messageId = randomUUID();
        const stepText = step.text;
        // A creation step in a #1 plan: stop and ask the human before the
        // agent starts, once, with a clock. Permission written by the
        // orchestrator inside the step text never counts.
        let stepLease = lease;
        let escalation = null;
        const stepScopes = this.scopesFor(step.agent);
        let wanted = stepMode(step);
        const askedMode = askedOf(step);
        // #3/#4 are never granted by an agent's text alone. The room waits for the human's
        // existing key, even when a lower-mode plan asked for a stronger delegate.
        if (askedMode >= 3 && (askedMode > reach(step.agent, askedMode) || askedMode > capOf(stepScopes))) {
          const outcome = await this.#askForMode({ planId, plan, step, index, totalSteps: directives.steps.length + 1, orchestrator, parentMessageId, mode: askedMode });
          if (outcome.scope === 'plan') planGrants.set(step.agent, askedMode);
          if (outcome.scope) wanted = Math.min(askedMode, this.scopesFor(step.agent).maxMode);
          // Denied or unanswered, the step reads, as the line in the room says.
          else { escalation = outcome.reason; wanted = 1; }
          if (plan.stopped) break;
        }
        // Under a #3 ceiling the orchestrator's word is enough: a #2 step gets its project lease,
        // a #3 step gets CONTROL for its turn. Under #1 a creation step still asks the human.
        if (ceiling >= 3 && !stepLease && wanted === 2) {
          stepLease = await this.#projectLease({ leaseId: randomUUID(), messageId });
          stepLease.scopeCeiling = { write: true, imageGen: true, web: true };
          stepLease.scopes = Object.fromEntries(SCOPES.map((scope) => [scope, stepScopes[scope].enabled && stepScopes[scope].wired]));
          await this.#emit('lease.granted', { delegated: true, leaseId: stepLease.leaseId, messageId, agent: step.agent, outDir: '.', scratchDir: stepLease.scratchDir, grantedBy: orchestrator, scopes: SCOPES.filter((scope) => stepLease.scopes[scope]), unavailable: [], planId });
        }
        if (ceiling < 3 && !lease && !stepScopes.write.always && askedMode < 3 && (askedMode >= 2 || looksLikeCreation(step.text)) && stepScopes.maxMode >= 2 && stepScopes.write.enabled) {
          const outcome = await this.#askForMode({ planId, plan, step, index, totalSteps: directives.steps.length + 1, orchestrator, parentMessageId, mode: 2 });
          if (outcome.scope === 'plan') lease = outcome.lease;
          if (outcome.scope) stepLease = outcome.lease; else escalation = outcome.reason;
          if (plan.stopped) break;
        }
        await this.#emit('message.created', {
          messageId,
          role: 'assistant',
          sender: orchestrator,
          target: step.agent,
          text: stepText,
          ash: ash ? { active: true } : undefined,
          status: 'delegated',
          planId,
          mode: wanted >= 3 ? wanted : stepLease && stepScopes.write.enabled ? 2 : 1,
          escalation: escalation ?? undefined,
          step: index + 1,
          totalSteps: directives.steps.length + 1,
        });
        await this.#dispatch({ messageId, targetId: step.agent, text: stepText, requester: orchestrator, depth: 1, planId, allowDelegation: false, lease: wanted >= 3 ? null : stepLease, ash, mode: wanted >= 3 ? wanted : stepLease && stepScopes.write.enabled ? 2 : 1, escalation, copilot: wanted === 3 && underCopilot() });
      }
      if (!plan.stopped) {
        plan.step = directives.steps.length + 1;
        const messageId = randomUUID();
        // A delegate's newly granted #3/#4 never raises the orchestrator's own mode.
        const closingMode = ceiling >= 3 ? ceiling : lease ? 2 : 1;
        await this.#emit('message.created', {
          messageId,
          role: 'assistant',
          sender: orchestrator,
          target: orchestrator,
          text: closing,
          ash: ash ? { active: true } : undefined,
          mode: closingMode,
          status: 'delegated',
          planId,
          step: plan.step,
          totalSteps: plan.step,
        });
        const responseMessageId = await this.#dispatch({ messageId, targetId: orchestrator, text: `${closing}\n(The delegated agents have answered above; this is your closing turn.)`, requester: orchestrator, depth: 0, planId, allowDelegation: true, deferPlan: true, lease, ash, mode: closingMode });
        const reply = responseMessageId ? (await this.#store.readAll()).find((event) => event.type === 'message.created' && event.payload?.messageId === responseMessageId)?.payload?.text : null;
        const parsed = reply ? parseDirectives(reply, { self: orchestrator, available: this.delegatesFor(orchestrator), maxSteps: this.#maxPlanSteps }) : null;
        if (parsed?.steps.length && JSON.stringify(parsed.steps) !== JSON.stringify(directives.steps)) continuation = { responseMessageId, directives: parsed, lease };
      }
    } finally {
      this.#plans.delete(planId);
      await this.#emit(plan.stopped ? 'plan.stopped' : 'plan.completed', {
        planId,
        orchestrator,
        stepsRun: plan.step,
        reason: plan.stopped ?? null,
      });
    }
    return continuation;
  }
}
