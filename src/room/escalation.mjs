// Waiting for the human: a plan step wants a mode it does not have. One clock
// per request, a decision from the room, and a way to settle everything at
// once when a plan stops or the room shuts down.

export class Escalation {
  #ms;
  #requests = new Map();   // requestId -> { payload, timer, resolve, plan }

  constructor({ escalationMs = 180000 } = {}) {
    this.#ms = escalationMs;
  }
  get ms() { return this.#ms; }
  pending() { return [...this.#requests.values()].map((entry) => entry.payload); }

  // Resolves with { decision: 'once' | 'plan' | 'deny', reason } when the human answers or the clock runs out.
  // The clock keeps the process alive on purpose; settleAll() clears it.
  wait(requestId, payload, plan) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ decision: 'deny', reason: 'timeout' }), this.#ms);
      this.#requests.set(requestId, { payload, timer, resolve, plan });
    }).finally(() => {
      const entry = this.#requests.get(requestId);
      if (entry) { clearTimeout(entry.timer); this.#requests.delete(requestId); }
    });
  }
  decide(requestId, decision) {
    const entry = this.#requests.get(requestId);
    if (!entry) return { ok: false, error: 'That request is no longer pending.' };
    if (!['once', 'plan', 'deny'].includes(decision)) return { ok: false, error: 'Decision must be once, plan or deny.' };
    entry.resolve({ decision, reason: decision === 'deny' ? 'denied' : null });
    return { ok: true };
  }
  settleAll(planId, reason) {
    for (const [requestId, entry] of this.#requests) {
      if (planId && entry.payload.planId !== planId) continue;
      clearTimeout(entry.timer);
      entry.resolve({ decision: 'deny', reason });
      this.#requests.delete(requestId);
    }
  }
}
