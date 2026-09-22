// EYECAT, as the room runs it. The judgement lives in eyecat.mjs; this schedules it, picks who
// may answer, and puts what comes back in front of the human.
//
// It is not a module and not part of the room. It watches from outside, the way the error
// sentinel does: it subscribes to the ledger, it never takes a turn, it writes no file and it
// holds no permission. Nothing an agent says can reach it, and nothing it decides is final.
// What it produces is a question for a person, never an entry in the archive.

import { suspectPairs, unsupportedNotes, judgeFor, verdictPrompt, parseVerdict } from './eyecat.mjs';

export const EYECAT_MAX_PER_SWEEP = 3;      // a ceiling, so a large archive cannot run up a bill
export const EYECAT_FLOOR = 0.72;           // how close two notes must be to count as the same subject
export const EYECAT_MIN_CONFIDENCE = 0.5;   // below this a verdict is not worth a person's attention

export class Eyecat {
  #deps;
  #settled = new Set();
  #open = new Map();
  #running = false;

  constructor(deps) { this.#deps = deps; }

  settings() { return { enabled: this.#deps.enabled?.() !== false, floor: EYECAT_FLOOR, maxPerSweep: EYECAT_MAX_PER_SWEEP }; }
  findings() { return [...this.#open.values()].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)); }

  // What a person already decided, replayed from the ledger so a restart does not ask twice.
  seed(events = []) {
    for (const event of events) {
      if (event?.type === 'eyecat.flagged' && event.payload?.key) this.#open.set(event.payload.key, event.payload);
      if (event?.type === 'eyecat.settled' && event.payload?.key) { this.#settled.add(event.payload.key); this.#open.delete(event.payload.key); }
    }
  }

  // The room only ever distils between turns, so this is already out of band: no agent is
  // waiting on it and none of them will see the answer.
  async observe(event) {
    if (event?.type !== 'memory.distilled') return null;
    return this.sweep({ reason: 'distilled' }).catch(() => null);
  }

  settle(key, { verdict = 'dismissed' } = {}) {
    if (!this.#open.has(key) && this.#settled.has(key)) return null;
    const finding = this.#open.get(key) ?? { key };
    this.#settled.add(key);
    this.#open.delete(key);
    return { ...finding, settledAs: verdict };
  }

  async sweep({ reason = 'asked' } = {}) {
    if (this.#running || this.#deps.enabled?.() === false) return null;
    const research = this.#deps.research?.();
    if (!research?.memories?.length) return null;
    this.#running = true;
    try {
      const skip = new Set([...this.#settled, ...this.#open.keys()]);
      const candidates = [
        ...suspectPairs(research.links ?? [], research.memories, { floor: EYECAT_FLOOR, settled: skip }),
        ...unsupportedNotes(research.memories, this.#deps.entriesFor?.(research.memories) ?? [], { settled: skip }),
      ].slice(0, EYECAT_MAX_PER_SWEEP);
      const raised = [];
      for (const candidate of candidates) {
        const finding = await this.#judge(candidate, reason).catch(() => null);
        if (finding) raised.push(finding);
      }
      return raised.length ? raised : null;
    } finally {
      this.#running = false;
    }
  }

  async #judge(candidate, reason) {
    const judge = judgeFor(candidate, this.#deps.bench?.() ?? {});
    // With nobody impartial free, the candidate is left alone rather than handed to an agent
    // with a stake in the answer. It will come round again on the next sweep.
    if (!judge) return null;
    const invoke = this.#deps.bench?.().invokers?.[judge.adapter];
    if (!invoke) return null;
    const cited = candidate.kind === 'unsupported' ? (this.#deps.entriesFor?.([candidate.claim]) ?? []).filter((entry) => candidate.cites.includes(entry.sequence)).map((entry) => entry.text) : [];
    const answer = await invoke({ prompt: verdictPrompt({ ...candidate, citedText: cited }, { json: judge.local === true }), json: judge.local === true });
    const verdict = parseVerdict(String(answer ?? ''), candidate);
    if (!verdict || verdict.verdict !== 'contradiction') return null;
    if (verdict.confidence !== null && verdict.confidence < EYECAT_MIN_CONFIDENCE) return null;
    const accused = candidate.kind === 'unsupported' ? candidate.claim : (verdict.accused === candidate.against?.id ? candidate.against : candidate.claim);
    const finding = {
      key: candidate.key,
      kind: candidate.kind,
      reason,
      judge: judge.id,
      signals: candidate.signals ?? [],
      confidence: verdict.confidence,
      correction: verdict.correction || null,
      claim: { id: accused.id, text: accused.text, kind: accused.kind, agent: accused.agent },
      against: candidate.against && candidate.against.id !== accused.id ? { id: candidate.against.id, text: candidate.against.text } : null,
      at: new Date().toISOString(),
    };
    this.#open.set(finding.key, finding);
    await this.#deps.emit('eyecat.flagged', finding);
    return finding;
  }
}
