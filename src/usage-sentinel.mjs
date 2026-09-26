import { t } from './i18n.mjs';

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
    // Back below the warning line after having crossed it: the window reset
    // (or the provider forgave). Worth a word, so full rings can empty.
    if (level === 'normal' && severity[previous] >= severity.warning) {
      return { agent, usedPercent: percent, projectedPercent: projected, level, source, resetAt, alternatives, cleared: true, message: `MADRE clear: @${agent} is back at ${Math.round(percent)}% of its ${source === 'room-soft-budget' ? 'local window' : 'provider window'}.` };
    }
    if (level === 'normal' || severity[level] <= severity[previous]) return null;

    // Said in the room's language: this is MADRE's own voice, not a CLI's output. What is
    // already in the ledger keeps the words it was written with.
    const destination = alternatives.length
      ? t(' Continue with {who}.', { who: alternatives.map((item) => `@${item}`).join(t(' or ')) })
      : t(' Prepare a handoff before the current agent becomes unavailable.');
    const label = source === 'room-soft-budget'
      ? t("local room token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth)")
      : source === 'test-simulation'
        ? t('simulated provider usage window')
        : t('provider usage window');
    const usage = byProjection
      ? t('has used {pct}% of its {label} and another turn like the last one would reach {projected}%.', { pct: Math.round(percent), label, projected: Math.round(projected) })
      : t('has used {pct}% of its {label}.', { pct: Math.round(percent), label });
    return {
      agent,
      usedPercent: percent,
      projectedPercent: projected,
      level,
      source,
      resetAt,
      alternatives,
      // The level is a word on a screen, so it is said in the room's language too.
      message: `MADRE ${t(level)}: @${agent} ${usage}${destination}`,
    };
  }
}
