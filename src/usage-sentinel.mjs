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

  // `projectedPercent` is where usage would land if the next turn were as
  // large as the last one. A single large turn can jump from well below 80%
  // straight past 100%, so the projection raises the alarm one turn earlier.
  evaluate({ agent, usedPercent, source, resetAt = null, alternatives = [], projectedPercent = null }) {
    const value = Number(usedPercent);
    if (!agent || !source || !Number.isFinite(value)) return null;
    const percent = Math.max(0, Math.min(100, value));
    const projected = Number.isFinite(Number(projectedPercent)) ? Math.max(percent, Number(projectedPercent)) : null;
    const currentLevel = classifyUsagePercent(percent);
    const projectedLevel = projected === null ? 'normal' : classifyUsagePercent(Math.min(100, projected));
    const level = severity[projectedLevel] > severity[currentLevel] ? projectedLevel : currentLevel;
    const byProjection = level !== currentLevel;
    const key = `${agent}:${source}`;
    const previous = this.#lastLevel.get(key) ?? 'normal';
    this.#lastLevel.set(key, level);
    if (level === 'normal' || severity[level] <= severity[previous]) return null;

    const destination = alternatives.length
      ? ` Continue with ${alternatives.map((item) => `@${item}`).join(' or ')}.`
      : ' Prepare a handoff before the current agent becomes unavailable.';
    const label = source === 'room-soft-budget'
      ? 'local room token budget (MADRE\'s own soft limit, not the provider\'s quota; cache reads count a tenth)'
      : source === 'test-simulation'
        ? 'simulated provider usage window'
        : 'provider usage window';
    const usage = byProjection
      ? `has used ${Math.round(percent)}% of its ${label} and another turn like the last one would reach ${Math.round(projected)}%.`
      : `has used ${Math.round(percent)}% of its ${label}.`;
    return {
      agent,
      usedPercent: percent,
      projectedPercent: projected,
      level,
      source,
      resetAt,
      alternatives,
      message: `MADRE ${level}: @${agent} ${usage}${destination}`,
    };
  }
}
