import { invokeCodex, buildCodexArgs } from './adapters/codex.mjs';
import { invokeClaude, buildClaudeArgs } from './adapters/claude.mjs';
import { invokeGemini, buildGeminiArgs } from './adapters/gemini.mjs';
import { invokeOpenCode, buildOpenCodeArgs } from './adapters/opencode.mjs';
import { parseMessage } from './router.mjs';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { UsageSentinel } from './usage-sentinel.mjs';
import { BLOCK_SOURCES, buildPrompt, promptParts, sparedChars } from './room/prompt.mjs';
import { turnCost, observedRate } from './room/economy.mjs';
import { contextFor } from './room/context.mjs';
import { coldNotes, coldReading } from './cold.mjs';
import { questionsFor } from './asking.mjs';
import { coverageExam, consistencyExam, matchExam, exchanges, MATCH_SAMPLE, saysFor } from './exam.mjs';
import { MADRE_ADAPTER, MADRE_AGENT_ID } from './adapters/madre.mjs';
import { verdictFor } from './verdict.mjs';
import { ControlDesk } from './room/control.mjs';
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
import { isValidModelName } from './models.mjs';
import { MODES, SCOPES, SCOPE_LABELS, capabilitySummary, normalizeMode, resolveScopes } from './capabilities.mjs';
import { createLease, diffSnapshots, snapshot } from './lease.mjs';
import { stat as statFile } from 'node:fs/promises';
import { basename as baseName, join as joinPath } from 'node:path';
import { contentTypeFor } from './files.mjs';
import { isModuleFile, sdkPaths } from './modules/index.mjs';
import { imageStudioFor } from './image-studio.mjs';
import { CAPABILITIES, imageModuleState } from './capabilities.mjs';
import { resolveReferences } from './files.mjs';
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
};

// What a turn costs against MADRE's local budget. Cache reads are close to
// free at every provider, so they weigh a tenth; Codex counts cached tokens
// inside inputTokens, the other CLIs report them separately.
export { budgetTokens };

// Does a request read like "make a file"? Only a hint for the room, in the
// languages the crew actually speaks here.
const CREATION_VERB = /\b(genera(r|d)?|crea(r|d)?|escrib(e|a|ir)|guarda(r)?|produce|producir|exporta(r)?|redacta(r)?|construye|create|generate|write|save|export|produce|build|render|draw|make)\b/i;
const CREATION_OBJECT = /\b(archivo|fichero|file|pdf|md|markdown|imagen|image|png|jpe?g|svg|documento|document|docx?|csv|json|xlsx?|pptx?|html|script|carpeta|folder|reporte|report|informe|entregable|poster|logo|diagrama|diagram)\b/i;
export const looksLikeCreation = (text) => CREATION_VERB.test(String(text ?? '')) && CREATION_OBJECT.test(String(text ?? ''));

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
  #memoryServer;           // MCP descriptor handed to every turn so the agent can query the memory itself
  #mother = null;          // MotherChannel: her coded words to the crew
  #shuttingDown = false;
  #inflight = new Set();   // top-level dispatches, from send() and MOTHER, until they settle
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
  #maxPlanSteps;
  #maxConcurrentTurns;
  #planMaxAgeMs;
  #ashEnabled = false;

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
    historicalEvents = [],
    invokers = defaultInvokers,
    agentTimeouts = {},
    maxMessageChars = 20000,
    delegation = true,
    maxPlanSteps = 4,
    maxConcurrentTurns = 3,
    planMaxAgeMs = 300000,
    escalationMs = Number(process.env.PULSE_ESCALATION_MS ?? 180000),
  }) {
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
    this.#invokers = invokers;
    this.#agentTimeouts = agentTimeouts;
    this.#maxMessageChars = maxMessageChars;
    this.#delegation = delegation;
    this.#maxPlanSteps = maxPlanSteps;
    this.#maxConcurrentTurns = maxConcurrentTurns;
    this.#planMaxAgeMs = planMaxAgeMs;
    this.#escalation = new Escalation({ escalationMs });
    this.#controlDesk = new ControlDesk({ projectRoot });
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
  control() { return this.#controlDesk.status(); }
  async undoControl(checkpointId) {
    const result = await this.#controlDesk.undo(checkpointId);
    if (!result.ok) return result;
    const { checkpoint, message, ...rest } = result;
    await this.#emit('control.reverted', { checkpointId, agent: checkpoint.agent, removed: rest.removed, restored: rest.restored, message });
    return { ok: true, ...rest };
  }

  // Escalation: a plan step that needs #2 while the plan runs at #1 waits
  // here for the human's word, with a clock. Nobody else can grant it.
  pendingModeRequests() { return this.#escalation.pending(); }
  async #askForMode({ planId, plan, step, index, totalSteps, orchestrator, parentMessageId, mode = 2 }) {
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + this.#escalation.ms).toISOString();
    const payload = { requestId, planId, agent: step.agent, orchestrator, mode, step: index + 1, totalSteps, text: step.text, expiresAt, message: `@${step.agent} needs #${mode} ${MODES[mode].label} for step ${index + 1}: the plan runs at #1. Grant it once, for the whole plan, or deny.` };
    await this.#emit('mode.requested', payload);
    const decision = await this.#escalation.wait(requestId, payload, plan);
    if (decision.decision === 'deny' || plan.stopped) {
      const reason = plan.stopped ? 'stopped' : decision.reason ?? 'denied';
      await this.#emit('mode.denied', { requestId, planId, agent: step.agent, mode, step: index + 1, reason, message: reason === 'timeout' ? `No answer in ${Math.round(this.#escalation.ms / 1000)}s: @${step.agent} runs step ${index + 1} at #1.` : reason === 'stopped' ? `The plan was stopped while @${step.agent} waited for #${mode}.` : `Denied: @${step.agent} runs step ${index + 1} at #1 and will say what it could not create.` });
      return { scope: null, reason };
    }
    const scopes = this.scopesFor(step.agent);
    const enabled = Object.fromEntries(SCOPES.map((scope) => [scope, scopes[scope].enabled && scopes[scope].wired]));
    const lease = await this.#projectLease({ leaseId: randomUUID(), messageId: parentMessageId });
    lease.scopes = decision.decision === 'plan' ? Object.fromEntries(SCOPES.map((scope) => [scope, true])) : enabled;
    await this.#emit('lease.granted', {
      escalated: decision.decision,
      leaseId: lease.leaseId,
      messageId: parentMessageId,
      agent: step.agent,
      outDir: lease.relativeDir,
      scratchDir: lease.scratchDir,
      scopes: SCOPES.filter((scope) => enabled[scope]),
      unavailable: SCOPES.filter((scope) => !scopes[scope].capable).map((scope) => SCOPE_LABELS[scope]),
      planId,
    });
    await this.#emit('mode.granted', { requestId, planId, agent: step.agent, mode, step: index + 1, scope: decision.decision, leaseId: lease.leaseId, message: decision.decision === 'plan' ? `#${mode} granted for the rest of the plan; every writable agent creates inside one lease.` : `#${mode} granted to @${step.agent} for step ${index + 1} only.` });
    return { scope: decision.decision, lease };
  }
  // The human's answer to a pending request: 'once', 'plan' or 'deny'.
  decideMode(requestId, decision) { return this.#escalation.decide(requestId, decision); }

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
    if (!this.#memory) return { error: 'The room has no memory.' };
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
      if (!invoke) return { error: 'The local model is not running. Open MODULES → OLLAMA.' };
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

  // The human's verdict on a reply: good, bad, or cleared. The dataset listens.
  async rateMessage(messageId, rating) {
    if (typeof messageId !== 'string' || !messageId.trim()) throw new Error('Which reply? Give its messageId.');
    if (!['good', 'bad', 'none'].includes(rating)) throw new Error('A rating is good, bad or none.');
    return this.#emit('message.rated', { messageId, rating, by: 'you' });
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
  async modeCheck({ target, text, mode, create = false } = {}) {
    const parsed = parseMessage(text ?? '', target);
    const wanted = normalizeMode(mode, create === true ? 2 : 1);
    if (!parsed.target) return { ok: true, mode: wanted };
    const scopes = this.scopesFor(parsed.target);
    if (wanted >= 3) {
      // #3 CONTROL and #4 AIRLOCK: the ceiling must allow it, and there is one holder at a time.
      // A project without git still checkpoints, in MADRE's shadow repository.
      if (scopes.maxMode < wanted) return { ok: false, status: 403, mode: wanted, maxMode: scopes.maxMode, error: `@${parsed.target} is capped at #${scopes.maxMode} ${MODES[scopes.maxMode].label}; raise its MAX MODE to #${wanted} in CONNECTIONS to arm ${MODES[wanted].label}.` };
      if (this.#controlDesk.holder) return { ok: false, status: 409, mode: wanted, maxMode: scopes.maxMode, error: `@${this.#controlDesk.holder.agent} already holds ${MODES[this.#controlDesk.holder.mode ?? 3].label} of this project; one holder at a time. STOPALL revokes it.` };
      return { ok: true, mode: wanted, maxMode: scopes.maxMode };
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
    await this.#emit('quota.updated', report);
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
      await this.#emit('turn.cost', { agent, mode, responseMessageId, spared: shape.spared, ...cost });
    } catch (error) {
      console.error(`MADRE could not weigh a turn: ${error.message}`);
    }
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

  ashEnabled() {
    return this.#ashEnabled;
  }

  // A slash command's result, shared with everyone (and with agents through
  // the transcript) as a fact card.
  async recordCommand({ name, title, text, ok, args = [] }) {
    return this.#emit('command.output', { name, title, text: String(text ?? '').slice(0, 20000), ok: ok !== false, args });
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

  timeoutFor(agentId) {
    return this.#agentTimeouts[agentId] ?? this.#agentTimeouts.default ?? 180000;
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

  async send({ text, target, model = null, attachments = [], create = false, ash = false, mode = undefined }) {
    const parsed = parseMessage(text, target);
    const requestedMode = normalizeMode(mode, create === true ? 2 : 1);
    const gate = await this.modeCheck({ target, text, mode: requestedMode });
    if (!gate.ok) throw new Error(gate.error);
    create = requestedMode === 2;
    const ghost = requestedMode === 0;
    const control = requestedMode >= 3;
    const files = (Array.isArray(attachments) ? attachments : []).map((id) => this.attachment(id)).filter(Boolean);
    if (!parsed.text && !files.length) throw new Error('Write a message first.');
    if (!parsed.target) throw new Error('Choose an agent or begin with @agent.');
    if (model !== null && model !== undefined && model !== '' && !isValidModelName(model)) throw new Error('Model name is not valid.');
    const chosenModel = model || null;
    // What the human wrote, sent as they wrote it. Ash used to rewrite this line before it left
    // the room; it does not any more, so there is no original to keep beside an abbreviation.
    const text2 = parsed.text || `(${files.length} attached file${files.length === 1 ? '' : 's'})`;
    const ashActive = ash === true && this.#ashEnabled;
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
      target: parsed.target,
      text: text2,
      ash: ashActive ? { active: true } : undefined,
      status: 'sent',
      model: chosenModel,
      attachments: files.length ? files.map((file) => ({ id: file.id, name: file.name, fileName: file.fileName, size: file.size, contentType: file.contentType })) : undefined,
      references: references.length ? references.map(({ excerpt, ...reference }) => reference) : undefined,
      create: create === true ? true : undefined,
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
      const unavailable = SCOPES.filter((scope) => !scopes[scope].capable).map((scope) => SCOPE_LABELS[scope]);
      const disabled = SCOPES.filter((scope) => scopes[scope].capable && !scopes[scope].enabled && scopes[scope].wired).map((scope) => SCOPE_LABELS[scope]);
      if (!enabled.includes('write') || scopes.maxMode < 2) {
        const alternatives = this.#agents.filter((agent) => agent.ready && agent.id !== parsed.target && this.scopesFor(agent.id).maxMode >= 2).map((agent) => `@${agent.id}`);
        await this.#emit('lease.refused', {
          messageId,
          agent: parsed.target,
          reason: !scopes.write.capable ? `@${parsed.target} cannot create files from its CLI` : scopes.maxMode < 2 ? `@${parsed.target} is capped at #${scopes.maxMode} ${MODES[scopes.maxMode].label} in CONNECTIONS` : `file creation is switched off for @${parsed.target}`,
          unavailable,
          disabled,
          alternatives,
          message: `@${parsed.target} will answer read-only: ${scopes.write.capable ? 'file creation is switched off for it (enable it in CONNECTIONS)' : 'its CLI cannot create files'}${unavailable.length ? `; it cannot ${unavailable.join(' or ')}` : ''}.${alternatives.length ? ` For creation ask ${alternatives.join(' or ')}.` : ''}`,
        });
      } else {
        lease = await this.#projectLease({ leaseId: randomUUID(), messageId });
        // CREATE authorizes the plan to use each delegate's enabled creation
        // scopes; a default-#2 lease authorizes files only.
        lease.scopeCeiling = { write: true, imageGen: !standing, web: true };
        lease.scopes = Object.fromEntries(SCOPES.map((scope) => [scope, enabled.includes(scope) && (!standing || scope === 'write')]));
        await this.#emit('lease.granted', {
          standing: standing || undefined,
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
      return;
    }
    let allowDelegation = true;
    if (this.#plans.size > 0) {
      allowDelegation = false;
      await this.#alert('plan-active', `A plan by @${[...this.#plans.values()][0].orchestrator} is still running. Your message will be answered, but no second plan will start. Type STOPALL to halt every agent.`, `plan-active:${messageId}`);
    }
    await this.#track(this.#dispatch({ messageId, targetId: parsed.target, text: text2, requester: 'you', depth: 0, allowDelegation: allowDelegation && !ghost, model: chosenModel, attachments: files, references, lease, ash: ashActive, mode: ghost ? 0 : control ? requestedMode : (lease ? 2 : 1) }));
  }

  // A #2 lease: the project itself is where new files go, and MADRE keeps a scratch folder
  // under .pulse/out/ for what has no natural place. Each turn under it takes a checkpoint
  // and puts back whatever existed before, so CREATE only ever adds.
  async #projectLease({ leaseId, messageId }) {
    const scratch = await createLease({ projectRoot: this.#projectRoot, leaseId });
    return { leaseId, messageId, outDir: this.#projectRoot, relativeDir: '.', scratchDir: scratch.relativeDir, create: true };
  }

  // Artifacts from a #2 turn: the files the checkpoint saw appear, as the room shows them.
  async #artifactsFrom(files) {
    const out = [];
    for (const file of files) {
      if (file.status !== 'A') continue;
      const info = await statFile(joinPath(this.#projectRoot, file.path)).catch(() => null);
      out.push({ name: baseName(file.path), path: file.path, size: info?.size ?? 0, contentType: contentTypeFor(file.path), status: 'created' });
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
  async stopAll(reason = 'STOPALL by the human') {
    const plans = this.#plans.size;
    const turns = this.#turns.size;
    for (const plan of this.#plans.values()) plan.stopped = reason;
    this.#escalation.settleAll(null, 'stopped');
    for (const turn of this.#turns.values()) turn.controller.abort(reason);
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
  async #dispatch({ messageId, targetId, text, requester, depth, planId = null, allowDelegation = true, model = null, attachments = [], references = [], lease = null, ash = false, mode = 1, escalation = null }) {
    if (this.#shuttingDown) return null;
    const agent = this.#agents.find((item) => item.id === targetId);
    if (!agent?.detected) {
      await this.#emit('message.failed', { messageId, target: targetId, planId, error: `${targetId} is not installed on this computer.` });
      return null;
    }
    if (!agent.ready) {
      await this.#emit('message.failed', { messageId, target: targetId, planId, error: `${agent.label} was detected, but its MADRE adapter is not enabled yet.` });
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
    await this.#emit('agent.started', { messageId, agent: agent.id, handoffId, planId });
    const controller = new AbortController();
    const turn = { controller, promise: null, planId, agent: agent.id, startedAt: Date.now() };
    turn.promise = this.#runTurn({ messageId, agent, text, requester, depth, planId, allowDelegation, context, recall, memories, handoffId, signal: controller.signal, model, attachments, references, lease, ash, mode, escalation });
    this.#turns.set(messageId, turn);
    let outcome = null;
    try {
      outcome = await turn.promise;
    } finally {
      this.#turns.delete(messageId);
      if (!this.#turns.size && mode !== 0) this.#archivist.schedule();
    }
    // The orchestrator's turn is over before its plan starts, so it is never
    // counted as in flight while the others work.
    if (outcome?.directives?.steps.length) {
      await this.#runPlan({ orchestrator: agent.id, parentMessageId: outcome.responseMessageId, directives: outcome.directives, lease, ash, mode });
    }
    return outcome?.responseMessageId ?? null;
  }

  // What the next turn to an agent would carry, built exactly the way a turn builds it and sent
  // nowhere. Nothing here counts: a memory read for this was not recalled, the window does not
  // move, and no process is started. It is the document MADRE writes in the human's name, which
  // until now existed only for the instant a CLI was reading it.
  async briefing({ agent: agentId, mode = 1, text = '' } = {}) {
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
      ash: this.ashEnabled(), mode, escalation: null, mcpServers,
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
            : null;
    if (!args) return { agent: agent.id, label: agent.label, local: false, says: `MADRE has no adapter for @${agent.id}.`, mcpServers: [], env: [], isolation: [] };
    const isolation = {
      codex: ['--ephemeral: the run keeps no session of its own, so nothing said here reaches another project.'],
      claude: ['--no-session-persistence: the run keeps no session of its own.', 'Only the project\'s own CLAUDE.md and MADRE\'s briefing are read; hooks, plugins and outside MCP servers are not.'],
      gemini: ['GEMINI_CLI_HOME points at a temporary home made for this turn and removed after it, so settings, hooks and extensions come from there and not from yours.', 'GEMINI_CLI_NO_RELAUNCH keeps the launcher from spawning a second process MADRE could not stop.'],
      opencode: ['The run is given the model you chose and nothing else of your session.'],
    }[agent.id] ?? [];
    const env = {
      gemini: [{ name: 'GEMINI_CLI_HOME', note: 'the temporary home for this turn' }, { name: 'GEMINI_CLI_NO_RELAUNCH', note: 'so the launcher stays killable' }],
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

  async #runTurn({ messageId, agent, text, requester, depth, planId, allowDelegation, context, recall = null, memories = null, handoffId, signal, model = null, attachments = [], references = [], lease: sharedLease = null, ash = false, mode = 1, escalation = null }) {
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
    if (mode >= 3 && (requester === 'you' || planId) && depth <= 1 && agentScopes.maxMode >= mode && enabled.write) {
      // CONTROL: the project itself is the writable root, and a checkpoint
      // taken now makes every change of this turn reversible. A plan step gets
      // it when the orchestrator, itself in #3, named #3 for that step.
      if (this.#controlDesk.holder) {
        await this.#alert('control-busy', `@${this.#controlDesk.holder.agent} still holds CONTROL; @${agent.id} answers read-only this turn.`, `control-busy:${agent.id}`);
      } else {
        const seat = await this.#controlDesk.begin({ agent, messageId, enabledScopes: enabled, mode });
        controlRun = seat.run;
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
        unavailable: SCOPES.filter((scope) => !agentScopes[scope].capable).map((scope) => SCOPE_LABELS[scope]),
        planId,
      });
    }
    if (lease?.create && !controlRun) {
      // CREATE: photograph the project now; after the turn only what appeared stays.
      const seat = await this.#controlDesk.begin({ agent, messageId, enabledScopes: enabled, mode: 2 });
      createRun = seat.run;
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
      const responseMessageId = randomUUID();
      const notesBefore = this.#memory ? this.#memory.maxMemoryId() : 0;
      const others = this.delegatesFor(agent.id);
      const mayDelegate = allowDelegation && this.#delegation && depth === 0;
      // Tools the modules hand to this turn (a browser, say), attached to the CLI for this run only.
      const mcpServers = this.#toolsForTurn && agent.adapter !== 'madre-local'
        ? await this.#toolsForTurn({ agent: agent.id, mode: turnMode, lease, scratchDir: lease?.scratchDir ? joinPath(this.#projectRoot, lease.scratchDir) : null }).catch(() => [])
        : [];
      // The prompt and the shape it was built from: one is sent, the other is kept until the CLI
      // says what it cost, so the bill can be attributed to the blocks that caused it.
      const shaped = this.#promptFor({ agent, text, requester, depth, allowDelegation, context, recall, memories, attachments, references, lease, scopes: turnScopes, imageStudio, ash, mode: turnMode, escalation, mcpServers, sharedLeaseHint: sharedLease && !lease ? 'A creation lease is active for this plan, but file creation is not enabled for you: answer without creating files and say so if asked to create one.' : null });
      this.#promptShape.set(responseMessageId, { parts: shaped.parts, spared: shaped.spared });
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
        timeoutMs: this.timeoutFor(agent.id),
        signal,
        model,
        attachments,
        lease,
        scopes: turnScopes,
        imageStudio,
        memoryServer: memoryServerForTurn(this.#memoryServer, { agent: agent.id, messageId: responseMessageId, mode: turnMode }),
        mcpServers,
        // For @madre: who asks, who it may convene, and whether a plan would run at all.
        requester,
        crew: others,
        delegation: mayDelegate,
        maxSteps: this.#maxPlanSteps,
      });
      // Privacy: a private term in a reply is replaced before the ledger, the plan parser,
      // the archivist or any other agent can see it. The reply says how many, not which.
      const guarded = this.#privacy?.redact(result.text ?? '') ?? { text: result.text, hits: 0 };
      if (guarded.hits) result.text = guarded.text;
      // CREATE: what appeared stays and is shown; what existed before is put back and said.
      const createChanges = createRun ? await this.#controlDesk.settle(createRun) : null;
      const artifacts = createChanges ? await this.#artifactsFrom(createChanges.files) : lease && !lease.control ? diffSnapshots(before, await snapshot(lease.outDir), { relativeDir: lease.relativeDir }) : [];
      // CONTROL: what really changed in the project, forbidden zones reverted on the spot.
      const controlChanges = controlRun ? await this.#controlDesk.settle(controlRun) : null;
      const directives = mayDelegate
        ? parseDirectives(result.text, { self: agent.id, available: others, maxSteps: this.#maxPlanSteps })
        : { steps: [], closing: null, ignored: [] };
      if (directives.steps.length === 0 && directives.ignored.length && depth === 0) {
        // The agent tried to delegate but the block was unusable; say so, or the
        // human sees a plan-shaped reply and nothing happening.
        await this.#emit('plan.ignored', { orchestrator: agent.id, responseMessageId, reasons: directives.ignored.map((item) => item.reason) });
      }
      if (depth > 0 && /```pulse/i.test(result.text)) {
        await this.#alert('nested-delegation', `@${agent.id} tried to open a plan from inside a plan. It was ignored; the sequence stays under @${requester}. STOPALL if the room drifts.`, `nested:${agent.id}`);
      }
      await this.#emit('message.created', {
        messageId: responseMessageId,
        parentMessageId: messageId,
        role: 'assistant',
        sender: agent.id,
        target: requester,
        text: result.text,
        // What the archive handed this turn, so the room can see its own memory working. The
        // whole point of remembering is invisible until the moment it is used.
        recalled: memories?.length
          ? memories.slice(0, 6).map((note) => ({ id: note.id, kind: note.kind, text: note.text.length > 150 ? `${note.text.slice(0, 149)}…` : note.text, via: note.via ?? 'search' }))
          : undefined,
        ash: ash ? { active: true } : undefined,
        status: 'completed',
        planId,
        model,
        synthetic: result.synthetic || undefined,
        redacted: guarded.hits || undefined,
        mode: turnMode,
        leaseId: lease?.leaseId,
        artifacts: artifacts.length ? artifacts : undefined,
        delegates: directives.steps.length ? directives.steps.map((step) => step.agent) : undefined,
      });
      if (guarded.hits) await this.#emit('privacy.redacted', { agent: agent.id, messageId, responseMessageId, hits: guarded.hits, marker: this.#privacy.marker });
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
      await this.#recordUsage(agent.id, result.usage, { messageId, responseMessageId });
      await this.#recordCost(agent.id, responseMessageId, result.usage, turnMode);
      await this.#emit('agent.completed', { messageId, agent: agent.id, handoffId, planId });
      return { responseMessageId, directives };
    } catch (error) {
      await this.#emit('message.failed', { messageId, target: agent.id, planId, error: this.#privacy ? this.#privacy.redact(failureMessage(error)).text : failureMessage(error) });
      return null;
    } finally {
      // Release CONTROL whichever way the turn ended; the checkpoint stays for UNDO.
      await this.#controlDesk.release(controlRun);
      await this.#controlDesk.release(createRun);
    }
  }

  async #runPlan({ orchestrator, parentMessageId, directives, lease = null, ash = false, mode = 1 }) {
    const planId = randomUUID();
    // The plan's ceiling is the human's mode: #3 when the orchestrator held CONTROL, #2 while a
    // lease exists, #1 otherwise. A step may ask for a mode ("@codex #2: …"); it gets the lowest
    // of what it asked, the ceiling and its own MAX MODE. Without a number it inherits the plan.
    const ceiling = mode >= 3 ? mode : lease ? 2 : 1;
    const stepMode = (step) => {
      const scopes = this.scopesFor(step.agent);
      const asked = normalizeMode(step.mode, lease ? 2 : 1);
      const granted = Math.min(asked, ceiling, scopes.maxMode);
      return granted >= 2 && !scopes.write.enabled ? 1 : granted;
    };
    const plan = { planId, orchestrator, steps: directives.steps, closing: directives.closing, step: 0, stopped: null, startedAt: Date.now() };
    this.#plans.set(planId, plan);
    await this.#emit('plan.created', {
      planId,
      orchestrator,
      parentMessageId,
      steps: directives.steps.map((step) => ({ ...step, mode: stepMode(step) })),
      closing: directives.closing,
      ignored: directives.ignored,
      mode: ceiling,
      leaseId: lease?.leaseId ?? null,
    });
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
        const wanted = stepMode(step);
        // Under a #3 ceiling the orchestrator's word is enough: a #2 step gets its project lease,
        // a #3 step gets CONTROL for its turn. Under #1 a creation step still asks the human.
        if (ceiling >= 3 && !stepLease && wanted === 2) {
          stepLease = await this.#projectLease({ leaseId: randomUUID(), messageId });
          stepLease.scopeCeiling = { write: true, imageGen: true, web: true };
          stepLease.scopes = Object.fromEntries(SCOPES.map((scope) => [scope, stepScopes[scope].enabled && stepScopes[scope].wired]));
          await this.#emit('lease.granted', { delegated: true, leaseId: stepLease.leaseId, messageId, agent: step.agent, outDir: '.', scratchDir: stepLease.scratchDir, grantedBy: orchestrator, scopes: SCOPES.filter((scope) => stepLease.scopes[scope]), unavailable: [], planId });
        }
        if (ceiling < 3 && !lease && !stepScopes.write.always && (wanted >= 2 || looksLikeCreation(step.text)) && stepScopes.maxMode >= 2 && stepScopes.write.enabled) {
          const outcome = await this.#askForMode({ planId, plan, step, index, totalSteps: directives.steps.length + (directives.closing ? 1 : 0), orchestrator, parentMessageId, mode: 2 });
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
          totalSteps: directives.steps.length + (directives.closing ? 1 : 0),
        });
        await this.#dispatch({ messageId, targetId: step.agent, text: stepText, requester: orchestrator, depth: 1, planId, allowDelegation: false, lease: wanted >= 3 ? null : stepLease, ash, mode: wanted >= 3 ? wanted : stepLease && stepScopes.write.enabled ? 2 : 1, escalation });
      }
      if (!plan.stopped && directives.closing) {
        plan.step = directives.steps.length + 1;
        const messageId = randomUUID();
        await this.#emit('message.created', {
          messageId,
          role: 'assistant',
          sender: orchestrator,
          target: orchestrator,
          text: directives.closing,
          status: 'delegated',
          planId,
          step: plan.step,
          totalSteps: plan.step,
        });
        await this.#dispatch({ messageId, targetId: orchestrator, text: `${directives.closing}\n(The delegated agents have answered above; this is your closing turn.)`, requester: orchestrator, depth: 1, planId, allowDelegation: false, lease, ash });
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
  }
}
