const severity = { normal: 0, warning: 1, critical: 2, exhausted: 3 };

export function classifyUsagePercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0) return 'normal';
  if (percent >= 100) return 'exhausted';
  if (percent >= 90) return 'critical';
  if (percent >= 80) return 'warning';
  return 'normal';
}

export class UsageSentinel {
  #lastLevel = new Map();

  seed({ agent, usedPercent, source }) {
    const percent = Number(usedPercent);
    if (!agent || !source || !Number.isFinite(percent)) return;
    this.#lastLevel.set(`${agent}:${source}`, classifyUsagePercent(percent));
  }

  evaluate({ agent, usedPercent, source, resetAt = null, alternatives = [] }) {
    const value = Number(usedPercent);
    if (!agent || !source || !Number.isFinite(value)) return null;
    const percent = Math.max(0, Math.min(100, value));
    const level = classifyUsagePercent(percent);
    const key = `${agent}:${source}`;
    const previous = this.#lastLevel.get(key) ?? 'normal';
    this.#lastLevel.set(key, level);
    if (level === 'normal' || severity[level] <= severity[previous]) return null;

    const destination = alternatives.length
      ? ` Continue with ${alternatives.map((item) => `@${item}`).join(' or ')}.`
      : ' Prepare a handoff before the current agent becomes unavailable.';
    const label = source === 'room-soft-budget'
      ? 'local room token budget'
      : source === 'test-simulation'
        ? 'simulated provider usage window'
        : 'provider usage window';
    return {
      agent,
      usedPercent: percent,
      level,
      source,
      resetAt,
      alternatives,
      message: `PULSE ${level}: @${agent} has used ${Math.round(percent)}% of its ${label}.${destination}`,
    };
  }
}
