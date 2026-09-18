// The archivist: every so often the cheapest allowed agent reads what nobody
// has distilled and keeps the few notes worth remembering. Scheduling by count
// or by quiet, one batch per run, a bench for whoever fails, a report to the
// room either way. The room hands in what it knows through `deps`.

import { pickDistiller, distillPrompt, parseDistillation, OLLAMA_ARCHIVIST } from '../distiller.mjs';

export const BENCH_MS = 30 * 60 * 1000;

export function distillDefaults(distill = {}, env = process.env) {
  return {
    enabled: distill.enabled ?? env.PULSE_DISTILL !== '0',
    every: Math.max(1, Number(distill.every ?? env.PULSE_DISTILL_EVERY ?? 10)),
    idleMs: Math.max(1000, Number(distill.idleMs ?? env.PULSE_DISTILL_IDLE_MS ?? 10 * 60 * 1000)),
    maxChars: Math.max(500, Number(distill.maxChars ?? env.PULSE_DISTILL_MAX_CHARS ?? 6000)),
    agent: distill.agent ?? env.PULSE_DISTILL_AGENT ?? null,
    model: distill.model ?? env.PULSE_DISTILL_MODEL ?? null,
    allowed: Array.isArray(distill.allowed) && distill.allowed.length ? [...distill.allowed] : null,   // who may distil; null = anyone
  };
}

export class Archivist {
  #memory;
  #settings;
  #deps;
  #timer = null;
  #running = null;
  #failures = new Map();   // fromSequence -> failed attempts on that batch
  #bench = new Map();      // agent -> until (ms)

  // deps: agents(), invokers(), busyAgents(), turnsInFlight(), timeoutFor(id), localTimeoutMs(), projectName(), emit(type, payload), recordUsage(agent, usage), stopped(), failureMessage(error)
  constructor({ memory, settings, deps }) {
    this.#memory = memory;
    this.#settings = settings;
    this.#deps = deps;
  }
  get inflight() { return this.#running; }
  settings() { return { ...this.#settings, allowed: this.#settings.allowed ? [...this.#settings.allowed] : null }; }

  configure(patch = {}) {
    const s = this.#settings;
    if (typeof patch.enabled === 'boolean') s.enabled = patch.enabled;
    if (Number(patch.every) >= 1) s.every = Math.trunc(Number(patch.every));
    if (Number(patch.idleMs) >= 1000) s.idleMs = Math.trunc(Number(patch.idleMs));
    if (Number(patch.maxChars) >= 500) s.maxChars = Math.trunc(Number(patch.maxChars));
    if ('agent' in patch) s.agent = patch.agent ? String(patch.agent) : null;
    if ('allowed' in patch) s.allowed = Array.isArray(patch.allowed) && patch.allowed.length ? [...patch.allowed] : null;
    this.#bench.clear();
    return this.settings();
  }

  // After a turn: run now if enough piled up and the room is quiet, else wait for quiet.
  schedule() {
    if (this.#deps.stopped() || !this.#memory || !this.#settings.enabled) return;
    clearTimeout(this.#timer);
    this.#timer = null;
    let pending = 0;
    try { pending = this.#memory.undistilledCount(); } catch { return; }
    if (pending < 2) return;
    const wait = pending >= this.#settings.every ? (this.#deps.turnsInFlight() ? 3000 : 0) : this.#settings.idleMs;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (this.#deps.turnsInFlight()) { this.schedule(); return; }
      void this.runNow();
    }, wait);
    this.#timer.unref?.();
  }

  #candidates() {
    const invokers = this.#deps.invokers();
    const everyone = invokers.ollama ? [OLLAMA_ARCHIVIST, ...this.#deps.agents()] : this.#deps.agents();
    return this.#settings.allowed ? everyone.filter((agent) => this.#settings.allowed.includes(agent.id)) : everyone;
  }

  // One batch: the cheapest usable agent reads it, well-formed notes are kept,
  // the batch is marked, tokens are counted. A batch that fails three times is
  // skipped so a poisoned range cannot stall the archive; whoever failed sits out.
  async runNow() {
    if (!this.#memory) return null;
    if (this.#running) return this.#running;
    this.#running = (async () => {
      const batch = this.#memory.undistilled({ maxChars: this.#settings.maxChars });
      if (!batch.entries.length) return null;
      const invokers = this.#deps.invokers();
      const busy = this.#deps.busyAgents();
      const now = Date.now();
      for (const [id, until] of this.#bench) if (until <= now) this.#bench.delete(id);
      const benched = new Set(this.#bench.keys());
      const candidates = this.#candidates();
      let agent = pickDistiller(candidates, { preferred: this.#settings.agent, busy, invokers, benched });
      if (!agent && benched.size) { this.#bench.clear(); agent = pickDistiller(candidates, { preferred: this.#settings.agent, busy, invokers }); }
      if (!agent) return null;
      const started = Date.now();
      try {
        const local = agent.adapter === 'ollama';
        const prompt = distillPrompt({ entries: batch.entries, projectName: this.#deps.projectName(), existing: this.#memory.memories({ limit: 12 }), json: local });
        const result = await invokers[agent.adapter]({ executable: agent.path, projectRoot: this.#deps.projectRoot(), prompt, timeoutMs: local ? this.#deps.localTimeoutMs() : this.#deps.timeoutFor(agent.id), model: local ? null : this.#settings.model, json: local, attachments: [], lease: null, scopes: { web: false, imageGen: false }, imageStudio: null });
        const memories = parseDistillation(result?.text, { fromSequence: batch.fromSequence, throughSequence: batch.throughSequence });
        const added = this.#memory.addMemories(memories, { agent: agent.id, fromSequence: batch.fromSequence, throughSequence: batch.throughSequence });
        this.#memory.markDistilled(batch.sequences);
        this.#failures.delete(batch.fromSequence);
        // Local tokens cost nothing and count against no provider budget; they are reported, not charged.
        if (!local) await this.#deps.recordUsage(agent.id, result?.usage ?? null);
        const kinds = {};
        for (const memory of memories) kinds[memory.kind] = (kinds[memory.kind] ?? 0) + 1;
        const report = { agent: agent.id, local, model: local ? result?.usage?.model ?? null : this.#settings.model, tokens: result?.usage?.totalTokens ?? null, added, parsed: memories.length, considered: batch.entries.length, fromSequence: batch.fromSequence, throughSequence: batch.throughSequence, remaining: batch.remaining, kinds, elapsedMs: Date.now() - started, total: this.#memory.memoryCount() };
        await this.#deps.emit('memory.distilled', report);
        return report;
      } catch (error) {
        const attempts = (this.#failures.get(batch.fromSequence) ?? 0) + 1;
        this.#failures.set(batch.fromSequence, attempts);
        const skipped = attempts >= 3;
        if (skipped) { this.#memory.markDistilled(batch.sequences); this.#failures.delete(batch.fromSequence); }
        this.#bench.set(agent.id, Date.now() + BENCH_MS);
        const next = pickDistiller(candidates, { preferred: this.#settings.agent, busy: new Set(), invokers, benched: new Set(this.#bench.keys()) });
        const report = { agent: agent.id, error: this.#deps.failureMessage(error), attempts, skipped, next: next?.id ?? null, fromSequence: batch.fromSequence, throughSequence: batch.throughSequence, considered: batch.entries.length, remaining: batch.remaining };
        await this.#deps.emit('memory.distilled', report);
        return report;
      }
    })().finally(() => { this.#running = null; });
    return this.#running;
  }

  // Tests: run a distillation that is due by count without waiting for its
  // timer, leave an idle wait alone, and let a run in flight finish.
  async settle() {
    if (this.#timer && !this.#deps.turnsInFlight() && this.#memory && this.#memory.undistilledCount() >= this.#settings.every) {
      clearTimeout(this.#timer);
      this.#timer = null;
      await this.runNow();
    }
    await this.#running;
  }

  stop() {
    clearTimeout(this.#timer);
    this.#timer = null;
  }
}
