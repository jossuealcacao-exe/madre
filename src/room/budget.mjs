// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The local token budget: a rolling window per agent (five hours, like the
// providers' short windows), raw totals for the record, and the seeding of the
// usage sentinel from the ledger on start.

// Which CLIs count what they read back from a cache INSIDE the input they report: Codex
// (input_tokens includes cached_input_tokens) and Gemini (its prompt count includes the cached
// part; stream-json even prints both). Claude and OpenCode report the cache beside the input.
// Summed as if they were all the same, the economy called 2.1 M tokens «charged as fresh» in a
// room where the fresh reading was 0.36 M, and counted the same cache twice.
export const INPUT_HOLDS_CACHE = new Set(['codex-json', 'gemini-json']);
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
export function freshInput(usage = {}) {
  const input = num(usage.inputTokens);
  return INPUT_HOLDS_CACHE.has(usage.source) ? Math.max(0, input - num(usage.cachedInputTokens)) : input;
}

// What a turn costs against MADRE's local budget. Cache reads are close to free at every
// provider, so they weigh a tenth, and they are taken out of the input first where a CLI counts
// them inside it.
export function budgetTokens(usage = {}) {
  if (usage.local) return 0;
  const n = num;
  const cached = n(usage.cachedInputTokens);
  const input = freshInput(usage);
  const fresh = input + n(usage.cacheCreationInputTokens) + n(usage.outputTokens) + n(usage.reasoningTokens);
  if (!fresh && !cached) return n(usage.totalTokens);
  return Math.round(fresh + cached * 0.1);
}

export class Budget {
  #window = new Map();      // agent -> [{ at, spent }]
  #raw = new Map();         // agent -> raw total tokens ever
  #windowMs;
  softBudget;

  constructor({ softBudget = 500000, windowMs = Number(process.env.PULSE_BUDGET_WINDOW_MS ?? 5 * 3600 * 1000) } = {}) {
    this.softBudget = softBudget;
    this.#windowMs = windowMs;
  }
  get windowMs() { return this.#windowMs; }

  // Replays usage from the ledger and tells the sentinel where each ring stood.
  seed(events, sentinel) {
    for (const event of events) {
      if (event.type === 'usage.recorded') {
        this.#raw.set(event.payload.agent, event.payload.roomTotalTokens);
        const at = new Date(event.timestamp ?? 0).getTime() || 0;
        const spent = event.payload.budgetTokens ?? budgetTokens(event.payload.usage ?? {});
        const list = this.#window.get(event.payload.agent) ?? [];
        list.push({ at, spent });
        this.#window.set(event.payload.agent, list);
      }
      if (sentinel && (event.type === 'quota.updated' || event.type === 'limit.warning')) {
        // An old report whose window has since reset must not seed a full ring.
        const passed = event.payload.resetAt && new Date(event.payload.resetAt).getTime() <= Date.now();
        sentinel.seed(passed ? { ...event.payload, usedPercent: 0 } : event.payload);
      }
    }
    if (sentinel && Number.isFinite(this.softBudget) && this.softBudget > 0) {
      for (const agent of this.#window.keys()) {
        sentinel.seed({ agent, usedPercent: (this.windowTotal(agent) / this.softBudget) * 100, source: 'room-soft-budget' });
      }
    }
  }

  // Budget tokens spent by an agent inside the rolling window, dropping what fell out.
  windowTotal(agent, now = Date.now()) {
    const list = (this.#window.get(agent) ?? []).filter((entry) => now - entry.at < this.#windowMs);
    this.#window.set(agent, list);
    return list.reduce((sum, entry) => sum + entry.spent, 0);
  }

  // The local window as the UI should see it now: totals recomputed so a ring
  // empties when the window rolls over, even without a new turn.
  view(agents) {
    const now = Date.now();
    return Object.fromEntries(agents.map((agent) => {
      const total = this.windowTotal(agent.id, now);
      const oldest = (this.#window.get(agent.id) ?? [])[0]?.at ?? null;
      return [agent.id, { tokens: total, rawTokens: this.#raw.get(agent.id) ?? 0, windowMs: this.#windowMs, rollsOverAt: oldest ? new Date(oldest + this.#windowMs).toISOString() : null }];
    }));
  }

  // Charges a turn and returns what the ledger should record and what the ring shows.
  record(agent, usage) {
    const spent = budgetTokens(usage);
    const list = this.#window.get(agent) ?? [];
    list.push({ at: Date.now(), spent });
    this.#window.set(agent, list);
    const total = this.windowTotal(agent);
    const rawTotal = (this.#raw.get(agent) ?? 0) + (usage.totalTokens ?? 0);
    this.#raw.set(agent, rawTotal);
    return { spent, total, rawTotal, windowMs: this.#windowMs, usedPercent: this.softBudget > 0 ? (total / this.softBudget) * 100 : null, projectedPercent: this.softBudget > 0 ? ((total + spent) / this.softBudget) * 100 : null };
  }
}
