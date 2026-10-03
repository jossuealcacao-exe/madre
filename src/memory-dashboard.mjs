// What the MEMORY dashboard draws, shaped from counts the archive already keeps.
//
// Pure functions. The room hands in `RoomMemory#activity()` and the stats it already reports;
// nothing here reads a file, and nothing here ever sees the text of a memory. A day with nothing
// in it is still a day: the series are filled to the window, so a quiet week reads as quiet
// instead of collapsing out of the chart.

import { PASS } from './exam.mjs';

export const DASHBOARD_DAYS = 30;

const pad = (n) => String(n).padStart(2, '0');
// The calendar day of this machine, the same day SQLite's `localtime` names.
export const localDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function windowDays(days = DASHBOARD_DAYS, now = new Date()) {
  const out = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    out.push(localDay(day));
  }
  return out;
}

const fill = (pairs, days) => {
  const seen = new Map(pairs ?? []);
  return days.map((day) => Number(seen.get(day) ?? 0));
};
const sum = (list) => list.reduce((total, n) => total + n, 0);

// This week against the one before it, from the same filled series. `null` when there is no week
// before to compare with, so a new room never shows a rise from nothing as +100%.
function week(series) {
  const last = sum(series.slice(-7));
  const before = sum(series.slice(-14, -7));
  return { last, before, delta: last - before };
}

export function memoryDashboard({ activity = null, stats = null, days = DASHBOARD_DAYS, now = new Date() } = {}) {
  if (!activity) return null;
  const axis = windowDays(days, now);
  const series = {
    entries: fill(activity.entries, axis),
    memories: fill(activity.memories, axis),
    recalls: fill(activity.recalls, axis),
  };
  const search = Number(activity.via?.search ?? 0);
  const cascade = Number(activity.via?.cascade ?? 0);
  const total = Number(stats?.memories ?? sum(Object.values(activity.kinds ?? {})));
  return {
    days: axis,
    series,
    weeks: { entries: week(series.entries), memories: week(series.memories), recalls: week(series.recalls) },
    totals: {
      entries: Number(stats?.entries ?? 0),
      memories: total,
      pending: Number(stats?.pending ?? 0),
      turns: Number(activity.turns ?? 0),
      reached: Number(activity.reached ?? 0),
    },
    kinds: activity.kinds ?? {},
    agents: activity.agents ?? {},
    zones: activity.zones ?? {},
    via: { search, cascade },
    // The rate each test has to reach to pass, so a chart can draw the line it is measured against.
    pass: PASS,
    vectors: stats?.embeddings ? { model: stats.embeddings.model, entries: Number(stats.embeddings.entries ?? 0), memories: Number(stats.embeddings.memories ?? 0) } : null,
  };
}
