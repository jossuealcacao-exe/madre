// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Asking for a star or a review (2026-10-10): three times at most, and never again once answered.
//
// After thirty minutes with an AI at work (2026-11-18, the author: «después de unos 30 minutos de
// que el usuario está usando madre y está usando alguna de sus IAs»), and on the second and the
// seventh day after it was first used — once those thirty minutes are there too — the room asks
// once whether MADRE is being liked. Where it sends the person depends on how MADRE came: the
// desktop app (MADRE_APP=1) to a review on madre.run, a copy from npm or from the source to a star
// on GitHub, since npm keeps no reviews. Whoever answers — a star, a review, a donation or «don't
// ask again» — is never asked again; «not now» only lets that moment pass. A later moment that
// comes first takes the earlier ones with it, so nobody is asked twice in a row, and never twice
// within a day.
//
// Use is counted by the pages themselves: while one is in view it says so once a minute, and says
// whether an AI is at work in it — a turn running, or one that ended a moment ago. Only those
// minutes count, one per minute however many pages are open; a window left open with nothing going
// on counts nothing. What is kept lives in ~/.pulse/review-ask.json, not in a browser: each room is
// its own origin, and the same person on another port has been asked already. Nothing here touches
// the network; the links are opened by the person, in their browser.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { oneAtATime, writeWhole } from './json-file.mjs';

const FILE = 'review-ask.json';
const DAY = 24 * 60 * 60 * 1000;
// Minutes with an AI at work before anything is asked, the days included.
export const ASK_AFTER_MINUTES = 30;
const used = (state) => state.aiMinutes >= ASK_AFTER_MINUTES;
export const ASK_MOMENTS = [
  { id: 'm30', reached: (state) => used(state) },
  { id: 'd2', reached: (state, now) => used(state) && now - Date.parse(state.first) >= 2 * DAY },
  { id: 'd7', reached: (state, now) => used(state) && now - Date.parse(state.first) >= 7 * DAY },
];
// The first moment was twenty minutes with a page in view until 2026-11-18: whoever was asked
// then, or answers from a page opened before, was asked at the first moment.
const MOMENT_BEFORE = { m20: 'm30' };
const momentNow = (id) => MOMENT_BEFORE[id] ?? id;
// Where the question sends the person: the desktop app to a review, npm or the source to a star.
export const askVia = (env = process.env) => (env.MADRE_APP === '1' ? 'app' : 'npm');
// A donation on GitHub Sponsors is an answer too (2026-10-30): whoever gave is not asked again.
export const ASK_ANSWERS = ['later', 'star', 'review', 'donate', 'never'];
// One minute with an AI at work is counted at most once a minute, whichever page says it.
const TICK_MS = 55 * 1000;
// Never asked twice within this long, whatever moments have come.
const QUIET_MS = 20 * 60 * 60 * 1000;

// `aiMinutes` and `lastUse` count only the minutes with an AI at work (2026-11-18); the `minutes`
// a file from before kept counted any page in view, and are left behind.
const fresh = () => ({ first: null, aiMinutes: 0, lastUse: null, shown: {}, answer: null, offered: null });
// A moment handed to one page is not handed to another for this long (WEB-12 of the 1.0 review):
// every page in view ticks — Home, each project, each half of a split view — and each one asked.
const OFFER_HOLD_MS = 10 * 60 * 1000;

export async function readAsk(root) {
  try {
    const raw = JSON.parse(await readFile(join(root, FILE), 'utf8'));
    const state = fresh();
    if (typeof raw?.first === 'string' && Number.isFinite(Date.parse(raw.first))) state.first = raw.first;
    if (Number.isFinite(raw?.aiMinutes) && raw.aiMinutes >= 0) state.aiMinutes = Math.floor(raw.aiMinutes);
    if (typeof raw?.lastUse === 'string' && Number.isFinite(Date.parse(raw.lastUse))) state.lastUse = raw.lastUse;
    if (raw?.shown && typeof raw.shown === 'object') {
      for (const [id, at] of Object.entries(raw.shown)) {
        const moment = momentNow(id);
        if (typeof at === 'string' && ASK_MOMENTS.some((one) => one.id === moment)) state.shown[moment] = at;
      }
    }
    if (ASK_ANSWERS.includes(raw?.answer) && raw.answer !== 'later') state.answer = raw.answer;
    if (typeof raw?.offered?.moment === 'string' && Number.isFinite(Date.parse(raw.offered.at))) state.offered = { moment: raw.offered.moment, at: raw.offered.at };
    return state;
  } catch {
    return fresh();
  }
}

async function writeAsk(root, state) {
  await writeWhole(join(root, FILE), `${JSON.stringify(state, null, 2)}\n`);
}

// The moment that is due now, or null: the latest one reached and not shown yet, unless the person
// already answered or was asked within the last QUIET_MS.
export function dueMoment(state, now = Date.now()) {
  if (state.answer || !state.first) return null;
  const last = Math.max(0, ...Object.values(state.shown).map((at) => Date.parse(at)).filter(Number.isFinite));
  if (last && now - last < QUIET_MS) return null;
  const reached = ASK_MOMENTS.filter((moment) => !state.shown[moment.id] && moment.reached(state, now));
  return reached.at(-1)?.id ?? null;
}

// A page in view says so: the first time starts the days; a minute is added, at most once a minute,
// only when the page says an AI is at work in it (`using`). Answers which moment is due, if any.
// `quietSince`: a moment that asks for quiet — the day of the bonjour (src/tour.mjs) — keeps every
// ask away for QUIET_MS after it, as an ask itself would. The minutes still count.
// One change at a time (src/json-file.mjs): every page in view ticks, from every project.
export function tickAsk(root, now = Date.now(), options = {}) {
  return oneAtATime(join(root, FILE), () => tick(root, now, options));
}
async function tick(root, now, { quietSince = null, using = false } = {}) {
  const state = await readAsk(root);
  const at = new Date(now).toISOString();
  let changed = false;
  if (!state.first) { state.first = at; changed = true; }
  const last = state.lastUse ? Date.parse(state.lastUse) : 0;
  if (using === true && (!last || now - last >= TICK_MS)) {
    state.aiMinutes += 1;
    state.lastUse = at;
    changed = true;
  }
  if (changed) await writeAsk(root, state);
  const hushed = quietSince && now - Date.parse(quietSince) < QUIET_MS;
  const due = hushed ? null : dueMoment(state, now);
  if (!due) return { due: null, aiMinutes: state.aiMinutes };
  if (state.offered?.moment === due && now - Date.parse(state.offered.at) < OFFER_HOLD_MS) return { due: null, aiMinutes: state.aiMinutes };
  state.offered = { moment: due, at: new Date(now).toISOString() };
  await writeAsk(root, state);
  return { due, aiMinutes: state.aiMinutes };
}

// The person answered the moment they were asked at. Every moment reached by then counts as shown,
// so an earlier one never comes after a later one; any answer but «not now» ends the asking.
export function answerAsk(root, said, now = Date.now()) {
  return oneAtATime(join(root, FILE), () => recordAnswer(root, said, now));
}
async function recordAnswer(root, { moment: said, answer }, now) {
  const moment = momentNow(said);
  if (!ASK_ANSWERS.includes(answer)) return { error: 'answer' };
  if (!ASK_MOMENTS.some(({ id }) => id === moment)) return { error: 'moment' };
  const state = await readAsk(root);
  const at = new Date(now).toISOString();
  if (!state.first) state.first = at;
  for (const one of ASK_MOMENTS) {
    if (!state.shown[one.id] && (one.id === moment || one.reached(state, now))) state.shown[one.id] = at;
  }
  if (answer !== 'later') state.answer = answer;
  await writeAsk(root, state);
  return { answer: state.answer, shown: state.shown };
}
