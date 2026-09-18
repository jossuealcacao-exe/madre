// GHOST turns: they happen, listeners see them, the ledger never does. A turn
// is remembered as ghost for a while so its late events stay off the record.

import { randomUUID } from 'node:crypto';

export class GhostLedger {
  #turns = new Set();
  #listeners = new Set();
  count = 0;

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  add(messageId, { forgetAfterMs = 10 * 60 * 1000 } = {}) {
    this.#turns.add(messageId);
    setTimeout(() => this.#turns.delete(messageId), forgetAfterMs).unref?.();
  }
  // Usage and limit events are never ghosts: they are about budgets, not words.
  isGhost(type, payload) {
    if (!this.#turns.size) return false;
    if (type === 'usage.recorded' || type.startsWith('limit.') || type.startsWith('quota.')) return false;
    return this.#turns.has(payload?.messageId) || this.#turns.has(payload?.parentMessageId);
  }
  // Builds the ghost event and hands it to the ghost listeners only.
  emit(type, payload) {
    this.count += 1;
    const event = { id: `ghost-${randomUUID()}`, sequence: null, ghost: true, timestamp: new Date().toISOString(), type, payload: { ...payload, mode: payload.mode ?? 0 } };
    for (const listener of this.#listeners) listener(event);
    return event;
  }
}
