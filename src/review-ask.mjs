// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Asking for a star or a review (2026-10-10): three times at most, and never again once answered.
//
// After twenty minutes of MADRE in use, and on the second and the seventh day after it was first
// used, the room asks once whether MADRE is being liked: a star on GitHub, or a review on
// madre.run. Whoever answers — a star, a review, or «don't ask again» — is never asked again; «not
// now» only lets that moment pass. A later moment that comes first takes the earlier ones with it,
// so nobody is asked twice in a row, and never twice within a day.
//
// Use is counted by the pages themselves: while one is in view it says so once a minute, and the
// minutes are added here, one per minute however many pages are open. What is kept lives in
// ~/.pulse/review-ask.json, not in a browser: each room is its own origin, and the same person on
// another port has been asked already. Nothing here touches the network; the two links are opened
// by the person, in their browser.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { oneAtATime, writeWhole } from './json-file.mjs';

const FILE = 'review-ask.json';
const DAY = 24 * 60 * 60 * 1000;
export const ASK_MOMENTS = [
  { id: 'm20', reached: (state) => state.minutes >= 20 },
  { id: 'd2', reached: (state, now) => now - Date.parse(state.first) >= 2 * DAY },
  { id: 'd7', reached: (state, now) => now - Date.parse(state.first) >= 7 * DAY },
];
export const ASK_ANSWERS = ['later', 'star', 'review', 'never'];
// One minute of use is counted at most once a minute, whichever page says it.
const TICK_MS = 55 * 1000;
// Never asked twice within this long, whatever moments have come.
const QUIET_MS = 20 * 60 * 60 * 1000;

const fresh = () => ({ first: null, minutes: 0, lastTick: null, shown: {}, answer: null, offered: null });
// A moment handed to one page is not handed to another for this long (WEB-12 of the 1.0 review):
// every page in view ticks — Home, each project, each half of a split view — and each one asked.
const OFFER_HOLD_MS = 10 * 60 * 1000;

export async function readAsk(root) {
  try {
    const raw = JSON.parse(await readFile(join(root, FILE), 'utf8'));
    const state = fresh();
    if (typeof raw?.first === 'string' && Number.isFinite(Date.parse(raw.first))) state.first = raw.first;
    if (Number.isFinite(raw?.minutes) && raw.minutes >= 0) state.minutes = Math.floor(raw.minutes);
    if (typeof raw?.lastTick === 'string' && Number.isFinite(Date.parse(raw.lastTick))) state.lastTick = raw.lastTick;
    if (raw?.shown && typeof raw.shown === 'object') for (const { id } of ASK_MOMENTS) if (typeof raw.shown[id] === 'string') state.shown[id] = raw.shown[id];
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

// A page in view says so: the first time starts the count, then a minute is added at most once a
// minute. Answers which moment is due, if any.
// `quietSince`: a moment that asks for quiet — the day of the bonjour (src/tour.mjs) — keeps every
// ask away for QUIET_MS after it, as an ask itself would. The minutes still count.
// One change at a time (src/json-file.mjs): every page in view ticks, from every project.
export function tickAsk(root, now = Date.now(), options = {}) {
  return oneAtATime(join(root, FILE), () => tick(root, now, options));
}
async function tick(root, now, { quietSince = null } = {}) {
  const state = await readAsk(root);
  const at = new Date(now).toISOString();
  if (!state.first) state.first = at;
  const last = state.lastTick ? Date.parse(state.lastTick) : 0;
  if (!last || now - last >= TICK_MS) {
    if (last) state.minutes += 1;
    state.lastTick = at;
    await writeAsk(root, state);
  }
  const hushed = quietSince && now - Date.parse(quietSince) < QUIET_MS;
  const due = hushed ? null : dueMoment(state, now);
  if (!due) return { due: null, minutes: state.minutes };
  if (state.offered?.moment === due && now - Date.parse(state.offered.at) < OFFER_HOLD_MS) return { due: null, minutes: state.minutes };
  state.offered = { moment: due, at: new Date(now).toISOString() };
  await writeAsk(root, state);
  return { due, minutes: state.minutes };
}

// The person answered the moment they were asked at. Every moment reached by then counts as shown,
// so an earlier one never comes after a later one; any answer but «not now» ends the asking.
export function answerAsk(root, said, now = Date.now()) {
  return oneAtATime(join(root, FILE), () => recordAnswer(root, said, now));
}
async function recordAnswer(root, { moment, answer }, now) {
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
