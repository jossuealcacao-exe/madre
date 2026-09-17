export class QuotaMonitor {
  #sources;
  #onReport;
  #intervalMs;
  #timer = null;
  #polling = null;
  #status = new Map();

  constructor({ sources = [], onReport, intervalMs = 60000 }) {
    if (sources.length && typeof onReport !== 'function') {
      throw new Error('Quota sources require an onReport function.');
    }
    this.#sources = sources;
    this.#onReport = onReport;
    this.#intervalMs = intervalMs;
    const ids = new Set();
    for (const source of sources) {
      if (!source?.id || typeof source.read !== 'function') {
        throw new Error('Quota sources require a stable id and a read function.');
      }
      if (ids.has(source.id)) throw new Error(`Duplicate quota source id: ${source.id}`);
      ids.add(source.id);
      this.#status.set(source.id, {
        id: source.id,
        agent: source.agent ?? null,
        available: false,
        checkedAt: null,
        error: null,
      });
    }
  }

  snapshot() {
    return [...this.#status.values()];
  }

  poll() {
    if (this.#polling) return this.#polling;
    this.#polling = Promise.all(this.#sources.map(async (source) => {
      const checkedAt = new Date().toISOString();
      try {
        const value = await source.read();
        if (value == null) {
          this.#status.set(source.id, {
            id: source.id,
            agent: source.agent ?? null,
            available: false,
            checkedAt,
            error: null,
          });
          return;
        }
        const agent = value.agent ?? source.agent;
        const usedPercent = Number(value.usedPercent);
        if (!agent || !Number.isFinite(usedPercent)) {
          throw new Error('Quota source returned an invalid report.');
        }
        const report = {
          agent,
          usedPercent,
          resetAt: value.resetAt ?? null,
          source: `official:${source.id}`,
          windows: value.windows ?? null,
          stale: Boolean(value.stale),
          observedAt: value.observedAt ?? null,
        };
        await this.#onReport(report);
        this.#armReset(report.resetAt);
        this.#status.set(source.id, {
          id: source.id,
          agent,
          available: true,
          checkedAt,
          error: null,
        });
      } catch (error) {
        this.#status.set(source.id, {
          id: source.id,
          agent: source.agent ?? null,
          available: false,
          checkedAt,
          error: error.message,
        });
      }
    })).finally(() => {
      this.#polling = null;
    });
    return this.#polling;
  }

  // A window that resets while the room is open: ask again right after, so
  // a full ring empties on time instead of at the next minute tick.
  #resetTimer = null;
  #armReset(resetAt) {
    if (!resetAt) return;
    const delay = new Date(resetAt).getTime() - Date.now() + 2000;
    if (!Number.isFinite(delay) || delay <= 0 || delay > 7 * 24 * 3600 * 1000) return;
    if (this.#resetTimer && this.#resetTimer.at <= new Date(resetAt).getTime() + 2000) return;
    clearTimeout(this.#resetTimer?.timer);
    const timer = setTimeout(() => { this.#resetTimer = null; void this.poll(); }, delay);
    timer.unref?.();
    this.#resetTimer = { timer, at: new Date(resetAt).getTime() + 2000 };
  }

  async start() {
    await this.poll();
    if (this.#sources.length && Number.isFinite(this.#intervalMs) && this.#intervalMs > 0) {
      this.#timer = setInterval(() => void this.poll(), this.#intervalMs);
      this.#timer.unref?.();
    }
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    clearTimeout(this.#resetTimer?.timer);
    this.#resetTimer = null;
  }
}
