// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE's course (2026-11-01): the author's model of the variables that decide where the project
// goes. Only for the author, in a copy run from source with the author's token (src/server.mjs,
// homeWidget, kind «rumbo»); Home draws it as the widget «MADRE's course».
//
// Three sources, each read on its own clock and each allowed to be missing:
//   madre.run's /api/rumbo — the funnel of every new copy (diagnostics on), the weeks, the return
//     by system, the AIs, the failures. Counts only: no copy leaves madre.run by its identifier.
//   GitHub — stars (with the day each was given), forks, the 14 days of visits and clones GitHub
//     keeps, where visitors came from, and the installer's downloads. Through the author's gh
//     session (src/github.mjs); without one, nothing from GitHub.
//   npm — the package's downloads by day and last week's by version. Every publish is pulled by
//     mirrors and caches, so a release day reads high: it is said as downloads, never as people.
// GitHub forgets visits after 14 days; each reading is kept in the state root
// (rumbo-history.json), so the history grows from the first time the widget is read.
//
// `rumboModel` is pure: it turns the three readings into variables, each with its value, how sure
// it is (a 90% interval and the size of what it counts), a signal against a threshold and the
// decision it informs, and into the decisions themselves. The page says it in words.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cachedSession, githubRequest } from './github.mjs';
import { oneAtATime, writeWhole } from './json-file.mjs';

export const REPO = 'jossuealcacao-exe/madre';
const DAY = 86_400_000;
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

// ── The thresholds ─────────────────────────────────────────────────────────────────────────────
// Where a rate turns good or bad, for a tool people install and then have to set up. They are
// starting points from early-stage developer tools, not laws: change them here and the widget
// follows. `lower` marks a rate where less is better.
export const THRESHOLDS = {
  ready: { good: 0.7, bad: 0.4 },          // new copies with an AI ready
  used: { good: 0.5, bad: 0.25 },          // new copies that asked an AI something
  readyToUse: { good: 0.6, bad: 0.3 },     // of those with an AI ready, the ones that used it
  firstProject: { good: 0.7, bad: 0.4 },   // copies with at least one project
  d1: { good: 0.4, bad: 0.2 },             // came back the next day or later
  d7: { good: 0.2, bad: 0.1 },             // came back a week later or more
  habit: { good: 0.2, bad: 0.08 },         // used an AI on two days or more
  failing: { good: 0.1, bad: 0.25, lower: true },   // copies that met a failure
  uninstall: { good: 0.05, bad: 0.15, lower: true }, // uninstalls for every install
  starRate: { good: 0.04, bad: 0.015 },    // stars for every unique visitor of the repository
  growth: { good: 0.1, bad: -0.1 },        // activated copies, this week against the one before
};
// What «paying for MADRE Pro» and «enough traction to show an investor» ask for.
export const PRO_BAR = { activatedWeek: 100, d7: 0.2, habit: 0.15, heavy: 0.1 };
export const INVEST_BAR = { weeksGrowing: 4, d7: 0.2, activatedWeek: 250 };

// A 90% Wilson interval for k of n: honest with small samples, where k/n alone is not.
const Z = 1.645;
export function wilson(k, n) {
  if (!n) return null;
  const p = k / n;
  const d = 1 + (Z * Z) / n;
  const center = (p + (Z * Z) / (2 * n)) / d;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / d;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}
export const confidence = (n) => (n >= 100 ? 'high' : n >= 30 ? 'medium' : 'low');
export function signalOf(value, { good, bad, lower = false }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'none';
  if (lower) return value <= good ? 'good' : value > bad ? 'bad' : 'watch';
  return value >= good ? 'good' : value < bad ? 'bad' : 'watch';
}
// A rate: k of n, its interval, how sure, and its signal.
function rate(id, group, k, n, threshold) {
  const value = n ? k / n : null;
  return { id, group, kind: 'rate', k, n, value, interval: wilson(k, n), confidence: confidence(n), signal: threshold ? signalOf(value, threshold) : 'info', threshold: threshold ?? null };
}
// A change: this period against the one before.
function change(id, group, now, before, threshold) {
  const value = before ? (now - before) / before : null;
  return { id, group, kind: 'change', now, before, value, confidence: confidence(Math.min(now, before)), signal: before ? signalOf(value, threshold) : 'none', threshold };
}

const sum = (list, field) => list.reduce((total, one) => total + Number(one?.[field] ?? 0), 0);

// ── The model ──────────────────────────────────────────────────────────────────────────────────
export function rumboModel({ madre = null, github = null, npm = null, history = null, now = Date.now() } = {}) {
  const variables = [];
  const add = (one) => { variables.push(one); return one; };
  const today = dayOf(now);
  const since = (n) => dayOf(now - (n - 1) * DAY);

  // GitHub's visits: the 14 days it keeps, and the ones kept before them.
  const views = mergeDays(history?.views, github?.views?.days);
  const lastDays = (map, n) => Object.entries(map).filter(([day]) => day >= since(n)).map(([, one]) => one);
  // Without GitHub's own figure (traffic asks for push rights) and nothing kept, there is no figure:
  // never a zero that reads as nobody came.
  const kept14 = lastDays(views, 14);
  const visits14 = github?.views ? { count: Number(github.views.count ?? sum(kept14, 'count')), uniques: Number(github.views.uniques ?? sum(kept14, 'uniques')) } : kept14.length ? { count: sum(kept14, 'count'), uniques: sum(kept14, 'uniques') } : null;
  const starDays = github?.stars?.days ?? [];
  const starsIn = (from, to = today) => starDays.filter((one) => one.day >= from && one.day <= to).reduce((total, one) => total + one.n, 0);

  // THE FUNNEL: from a visit to a habit.
  const f = madre?.funnel ?? null;
  const weeks = madre?.weeks ?? [];
  const thisWeek = weeks.at(-1) ?? null;
  const lastWeek = weeks.at(-2) ?? null;
  const new14 = weeks.length >= 2 ? Number(thisWeek.new) + Number(lastWeek.new) : null;
  const funnel = [
    { id: 'visits', n: visits14?.uniques ?? null, window: 14 },
    { id: 'downloads', n: npm ? sum((npm.days ?? []).filter((one) => one.day >= since(14)), 'downloads') : null, window: 14, side: true },
    { id: 'new', n: f?.new ?? null, window: 30 },
    { id: 'told', n: f?.told ?? null, window: 30 },
    { id: 'ready', n: f?.ready ?? null, window: 30 },
    { id: 'used', n: f?.used ?? null, window: 30 },
    { id: 'back', n: f?.back ?? null, of: f?.aged ?? null, window: 30 },
    { id: 'habit', n: f?.habit ?? null, of: f?.aged ?? null, window: 30 },
  ];

  // ACTIVATION: does a new copy get to use MADRE?
  if (f) {
    add(rate('ready', 'activation', f.ready, f.told, THRESHOLDS.ready));
    add(rate('used', 'activation', f.used, f.told, THRESHOLDS.used));
    add(rate('readyToUse', 'activation', f.used, f.ready, THRESHOLDS.readyToUse));
  }
  const projects = madre?.projects ?? null;
  if (projects?.known) add(rate('firstProject', 'activation', projects.known - projects.none, projects.known, THRESHOLDS.firstProject));

  // RETENTION: does it stay?
  if (madre?.retention) {
    add(rate('d1', 'retention', madre.retention.d1.back, madre.retention.d1.cohort, THRESHOLDS.d1));
    add(rate('d7', 'retention', madre.retention.d7.back, madre.retention.d7.cohort, THRESHOLDS.d7));
  }
  if (f) add(rate('habit', 'retention', f.habit, f.aged, THRESHOLDS.habit));

  // MOMENTUM: is it growing?
  if (thisWeek && lastWeek) {
    add(change('growth', 'momentum', Number(thisWeek.activated), Number(lastWeek.activated), THRESHOLDS.growth));
    add(change('newGrowth', 'momentum', Number(thisWeek.new), Number(lastWeek.new), THRESHOLDS.growth));
  }
  if (github) add(change('starGrowth', 'momentum', starsIn(since(7)), starsIn(since(14), since(8)), THRESHOLDS.growth));
  if (visits14?.uniques) add(rate('starRate', 'momentum', starsIn(since(14)), visits14.uniques, THRESHOLDS.starRate));

  // QUALITY: does it hold up?
  if (madre?.errors) add(rate('failing', 'quality', madre.errors.failing, madre.errors.copies, THRESHOLDS.failing));
  if (madre?.lifecycle?.installs) add(rate('uninstall', 'quality', madre.lifecycle.uninstalls, madre.lifecycle.installs, THRESHOLDS.uninstall));

  // MARKET: who it is reaching. No good or bad here: they point where to build.
  const systems = f?.bySystem ?? null;
  if (systems) {
    const windows = Number(systems.wsl?.new ?? 0) + Number(systems.win32?.new ?? 0);
    add(rate('windowsShare', 'market', windows, f.new, null));
  }
  const language = madre?.language ?? null;
  if (language) {
    const known = Object.entries(language).filter(([name]) => name !== '?').reduce((total, [, n]) => total + n, 0);
    add(rate('englishShare', 'market', Number(language.en ?? 0), known, null));
  }
  if (f) add(rate('coverage', 'market', f.told, f.new, null));
  const referrers = github?.referrers ?? [];
  if (referrers.length) {
    // Facebook's several doors (l., lm., m., www.) are one source.
    const family = (name) => (/facebook\.com$/.test(name) ? 'facebook.com' : /instagram\.com$/.test(name) ? 'instagram.com' : name);
    const grouped = {};
    for (const one of referrers) grouped[family(one.referrer)] = (grouped[family(one.referrer)] ?? 0) + Number(one.uniques ?? 0);
    const ranked = Object.entries(grouped).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
    const total = sum(ranked, 'n');
    add({ ...rate('topSource', 'market', ranked[0].n, total, { good: 0.5, bad: 0.7, lower: true }), source: ranked[0].name, sources: ranked.slice(0, 5) });
  }

  const byId = Object.fromEntries(variables.map((one) => [one.id, one]));
  const decisions = decide({ byId, madre, f, weeks, systems, projects });

  // THE NORTH STAR: copies that asked an AI something this week.
  const north = thisWeek ? { activated: Number(thisWeek.activated), before: lastWeek ? Number(lastWeek.activated) : null, active: Number(thisWeek.active), new: Number(thisWeek.new) } : null;

  // HISTORY: what GitHub and npm say over time, for the project's record.
  const record = {
    stars: github?.repo?.stars ?? null,
    forks: github?.repo?.forks ?? null,
    watchers: github?.repo?.watchers ?? null,
    stars7: github ? starsIn(since(7)) : null,
    starsByDay: starDays,
    visits: visits14,
    clones: github?.clones ?? null,
    views: Object.entries(views).sort(([a], [b]) => a.localeCompare(b)).slice(-60).map(([day, one]) => ({ day, ...one })),
    installer: github?.installer ?? null,
    npm: npm ? { lastWeek: npm.lastWeek ?? null, byVersion: npm.byVersion ?? [], days: (npm.days ?? []).slice(-60), total: sum(npm.days ?? [], 'downloads') } : null,
    new14,
  };

  return { at: new Date(now).toISOString(), north, funnel, variables, decisions, weeks, agents: madre?.agents ?? null, systems, record, thresholds: THRESHOLDS };
}

// The decisions, each from the variables that inform it. Every one says its verdict as an id the
// page puts in words, the figures it rests on, and a signal.
function decide({ byId, madre, f, weeks, systems, projects }) {
  const out = [];
  const v = (id) => byId[id]?.value ?? null;

  // Where people are lost: the first step in the red, in the order a person walks them (a leak
  // upstream empties every step below it, so it is fixed first); with none in the red, the step
  // furthest under its own threshold.
  if (f) {
    const steps = ['ready', 'firstProject', 'readyToUse', 'd1', 'habit'].map((id) => byId[id]).filter((one) => one?.n);
    const worst = steps.find((one) => one.signal === 'bad') ?? steps.map((one) => ({ one, gap: (one.value ?? 0) / one.threshold.good })).sort((a, b) => a.gap - b.gap)[0]?.one;
    if (worst) out.push({ id: 'bottleneck', verdict: worst.id, signal: worst.signal, figures: { value: worst.value, k: worst.k, n: worst.n, noProject: projects ? projects.none : null, projectsKnown: projects?.known ?? null } });
  }

  // Product or reach: while new copies do not get to use it, more visitors only fill the leak.
  if (byId.used || byId.d1) {
    const leaking = byId.used?.signal === 'bad' || byId.d1?.signal === 'bad';
    const flat = byId.growth && byId.growth.signal === 'bad';
    out.push({ id: 'focus', verdict: leaking ? 'product' : flat ? 'reach' : 'both', signal: leaking ? 'bad' : flat ? 'watch' : 'good', figures: { used: v('used'), d1: v('d1'), growth: v('growth') } });
  }

  // Windows: how many come from it, and whether they get as far as the rest.
  if (systems && f?.new) {
    const win = { told: Number(systems.wsl?.told ?? 0) + Number(systems.win32?.told ?? 0), used: Number(systems.wsl?.used ?? 0) + Number(systems.win32?.used ?? 0) };
    const rest = { told: f.told - win.told, used: f.used - win.used };
    const share = v('windowsShare');
    const winUse = win.told ? win.used / win.told : null;
    const restUse = rest.told ? rest.used / rest.told : null;
    out.push({ id: 'windows', verdict: share >= 0.35 ? 'priority' : share >= 0.15 ? 'relevant' : 'minor', signal: share >= 0.35 ? 'watch' : 'info', figures: { share, winUse, restUse, winTold: win.told, restTold: rest.told } });
  }

  // MADRE Pro: four bars, each met or not.
  if (madre) {
    const heavyShare = projects?.known ? (Number(projects.few ?? 0) + Number(projects.many ?? 0)) / projects.known : null;
    const activated = Number(weeks.at(-1)?.activated ?? 0);
    const bars = [
      { id: 'activatedWeek', value: activated, need: PRO_BAR.activatedWeek, met: activated >= PRO_BAR.activatedWeek },
      { id: 'd7', value: v('d7'), need: PRO_BAR.d7, met: (v('d7') ?? 0) >= PRO_BAR.d7 },
      { id: 'habit', value: v('habit'), need: PRO_BAR.habit, met: (v('habit') ?? 0) >= PRO_BAR.habit },
      { id: 'heavy', value: heavyShare, need: PRO_BAR.heavy, met: (heavyShare ?? 0) >= PRO_BAR.heavy },
    ];
    const met = bars.filter((one) => one.met).length;
    out.push({ id: 'pro', verdict: met === bars.length ? 'ready' : met >= 2 ? 'close' : 'early', signal: met === bars.length ? 'good' : met >= 2 ? 'watch' : 'bad', figures: { bars, met } });

    // Traction to show: weeks in a row that activated copies grew (only weeks with diagnostics count).
    const told = weeks.filter((one) => one.activated > 0);
    let growing = 0;
    for (let i = weeks.length - 1; i > 0 && weeks[i].activated > 0; i -= 1) {
      if (weeks[i].activated > weeks[i - 1].activated && weeks[i - 1].activated > 0) growing += 1;
      else break;
    }
    const invest = [
      { id: 'weeksGrowing', value: growing, need: INVEST_BAR.weeksGrowing, met: growing >= INVEST_BAR.weeksGrowing },
      { id: 'd7', value: v('d7'), need: INVEST_BAR.d7, met: (v('d7') ?? 0) >= INVEST_BAR.d7 },
      { id: 'activatedWeek', value: activated, need: INVEST_BAR.activatedWeek, met: activated >= INVEST_BAR.activatedWeek },
    ];
    const done = invest.filter((one) => one.met).length;
    out.push({ id: 'invest', verdict: done === invest.length ? 'ready' : told.length < 2 ? 'waiting' : done >= 2 ? 'close' : 'early', signal: done === invest.length ? 'good' : told.length < 2 ? 'none' : done >= 2 ? 'watch' : 'bad', figures: { bars: invest, met: done, weeksTold: told.length } });
  }

  // English: whether the copies that speak it are worth building for.
  if (byId.englishShare?.n) {
    const share = v('englishShare');
    out.push({ id: 'english', verdict: share >= 0.3 ? 'invest' : share >= 0.1 ? 'keep' : 'spanish', signal: 'info', figures: { share, n: byId.englishShare.n } });
  }

  // Quality: whether failures reach enough copies to stop and fix.
  if (byId.failing?.n) out.push({ id: 'quality', verdict: byId.failing.signal === 'bad' ? 'fix' : byId.failing.signal === 'watch' ? 'watch' : 'fine', signal: byId.failing.signal, figures: { value: v('failing'), k: byId.failing.k, n: byId.failing.n } });

  return out;
}

// A map {day: {count, uniques}} from what was kept and what GitHub says now (GitHub's own figure
// for a day wins: the newest day grows until it is over).
function mergeDays(kept = {}, fresh = []) {
  const out = { ...(kept ?? {}) };
  for (const one of fresh ?? []) out[one.day] = { count: Number(one.count ?? 0), uniques: Number(one.uniques ?? 0) };
  return out;
}

// ── The readings ───────────────────────────────────────────────────────────────────────────────

// GitHub, through the author's gh session; null without one. Every part is asked on its own, and
// a part that fails (traffic needs push rights) is left out, not the whole.
export async function readGithub({ repo = REPO, env = process.env, auth = undefined } = {}) {
  const session = auth === undefined ? await cachedSession({ env }) : auth;
  if (!session) return null;
  const get = async (path, accept) => (await githubRequest({ path, auth: session, env, timeoutMs: 15000, ...(accept ? { accept } : {}) }).catch(() => null))?.data ?? null;
  const base = `/repos/${repo}`;
  const [info, views, clones, referrers, releases] = await Promise.all([
    get(base), get(`${base}/traffic/views`), get(`${base}/traffic/clones`), get(`${base}/traffic/popular/referrers`), get(`${base}/releases?per_page=50`),
  ]);
  if (!info) return null;
  // The day each star was given: a hundred a page, as many pages as there are stars.
  const starred = [];
  for (let page = 1; page <= 20; page += 1) {
    const list = await get(`${base}/stargazers?per_page=100&page=${page}`, 'application/vnd.github.star+json');
    if (!Array.isArray(list)) break;
    for (const one of list) if (one?.starred_at) starred.push(String(one.starred_at).slice(0, 10));
    if (list.length < 100) break;
  }
  const byDay = {};
  for (const day of starred) byDay[day] = (byDay[day] ?? 0) + 1;
  const installer = Array.isArray(releases) ? releases.flatMap((release) => (release.assets ?? []).filter((asset) => /\.exe$/i.test(asset.name)).map((asset) => ({ tag: release.tag_name, downloads: Number(asset.download_count ?? 0) }))) : null;
  return {
    repo: { stars: Number(info.stargazers_count ?? 0), forks: Number(info.forks_count ?? 0), watchers: Number(info.subscribers_count ?? 0), issues: Number(info.open_issues_count ?? 0) },
    views: views ? { count: Number(views.count ?? 0), uniques: Number(views.uniques ?? 0), days: (views.views ?? []).map((one) => ({ day: String(one.timestamp).slice(0, 10), count: one.count, uniques: one.uniques })) } : null,
    clones: clones ? { count: Number(clones.count ?? 0), uniques: Number(clones.uniques ?? 0) } : null,
    referrers: Array.isArray(referrers) ? referrers.map((one) => ({ referrer: one.referrer, count: Number(one.count ?? 0), uniques: Number(one.uniques ?? 0) })) : [],
    stars: { days: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => ({ day, n })) },
    installer: installer ? { total: sum(installer, 'downloads'), byTag: installer } : null,
  };
}

// npm: the downloads of every day in the last 90 (npm's figures come a day or two late) and last
// week's by version.
export async function readNpm({ name, fetchImpl = globalThis.fetch, base = process.env.PULSE_NPM_API_URL ?? 'https://api.npmjs.org', now = Date.now() } = {}) {
  const get = async (url) => {
    const answer = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) }).catch(() => null);
    return answer?.ok ? answer.json().catch(() => null) : null;
  };
  const [range, versions] = await Promise.all([
    get(`${base}/downloads/range/${dayOf(now - 89 * DAY)}:${dayOf(now)}/${name}`),
    get(`${base}/versions/${encodeURIComponent(name)}/last-week`),
  ]);
  if (!range && !versions) return null;
  const byVersion = Object.entries(versions?.downloads ?? {}).map(([version, n]) => ({ version, n: Number(n) })).sort((a, b) => b.n - a.n);
  return { days: (range?.downloads ?? []).map((one) => ({ day: one.day, downloads: Number(one.downloads ?? 0) })), byVersion, lastWeek: byVersion.length ? sum(byVersion, 'n') : null };
}

// What GitHub forgets after 14 days, kept here a year: the visits of each day.
const KEEP_DAYS = 400;
export const historyFile = (root) => join(root, 'rumbo-history.json');
export async function readHistory(root) {
  try { const raw = JSON.parse(await readFile(historyFile(root), 'utf8')); return raw && typeof raw === 'object' ? raw : {}; } catch { return {}; }
}
export async function keepHistory(root, github, now = Date.now()) {
  if (!github?.views?.days?.length) return readHistory(root);
  return oneAtATime(historyFile(root), async () => {
    const kept = await readHistory(root);
    const cutoff = dayOf(now - KEEP_DAYS * DAY);
    const views = Object.fromEntries(Object.entries(mergeDays(kept.views, github.views.days)).filter(([day]) => day >= cutoff));
    const next = { views, updated: new Date(now).toISOString() };
    await writeWhole(historyFile(root), `${JSON.stringify(next)}\n`);
    return next;
  });
}
