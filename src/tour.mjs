// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The welcome of MADRE 1.0 (2026-10-11): one bonjour per person and per major version, then the
// chapters that tell everything new, at the person's own pace (docs: the «Recorrido de MADRE 1.0»
// decision, option B with two pieces of C — the one-line hints and the sheet of gestures).
//
// Where it was, what was read, which hints were seen: kept in ~/.pulse/tour.json, never in a
// browser. Every project is its own origin and a project may open on another port next time, so a
// flag in the browser would be forgotten or said twice; this file is one per person, as
// whats-new.json and review-ask.json are.
//
// It also brings the projects of 0.7.2 to Home. 0.7.2 never wrote where a project is
// (project.json), so Home cannot list them; but a room's id is its folder's name and a hash of its
// path (src/salas.mjs), so the folder is found by looking for that name where people keep their
// projects and is proved by the hash. Nothing is guessed: a folder whose hash does not match is
// not that project, and a project MADRE was told to forget is never brought back.

import { createReadStream } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { oneAtATime, writeWhole } from './json-file.mjs';
import { PROJECT_HOMES, associateProject, projectRoomId, salasRoomId } from './salas.mjs';

// 1.1 (2026-10-14): the same welcome, a third way through it. Whoever read the tour of 1.0 is told
// what changed since (path «since»): the clearer names, Home as a board, its widgets and the local
// AI chosen project by project. A tour.json of 1.0 is that person; it is started again for 1.1 and
// remembers where it came from (`before`).
export const TOUR_VERSION = '1.1';
// The chapters, in their order; «moved» is only for whoever comes from 0.7.2, «renamed» only for
// whoever comes from 1.0.
export const CHAPTERS = ['moved', 'home', 'renamed', 'board', 'widgets', 'project', 'talk', 'modes', 'coordinator', 'links', 'maps', 'settings', 'modules', 'local', 'phone', 'gestures'];
// The places that confuse most, each told once in one line (from option C); then, from 1.1, what
// each key of Home's bar opens, the first time it opens, and what each widget of Home shows. (A
// project's bar says it with its own first-touch cards, public/app.js, FIRST_TOUCH, and its news
// with NEW_HINTS: both kept here too, `touch-<id>` and `new-<id>`. Kept in the page they lived in
// one port, and a project takes the first free port when it opens: the cards came back whenever it
// got another one, and the project that got the old port inherited them (2026-10-19).)
export const HINTS = ['switch', 'links', 'key4',
  'home-links', 'home-map', 'home-settings', 'home-add', 'new-add-widgets',
  'w-system', 'w-servers', 'w-memory', 'w-coordinator', 'w-models', 'w-usage',
  'touch-settings', 'touch-modules', 'touch-market', 'touch-mother', 'touch-memory', 'touch-crew', 'touch-steps', 'touch-browser', 'touch-tree', 'touch-chats',
  'new-copilot', 'new-mcp', 'new-finder', 'new-memory-access', 'new-dots'];
const PATHS = ['new', 'back', 'since'];
const BEFORE = ['1.0'];

const fresh = (before = null) => ({ version: TOUR_VERSION, path: null, bonjourAt: null, done: [], at: null, closed: false, finished: null, hints: {}, held: null, before });
// A tab that shows the bonjour or the chapters says so every few seconds; another tab that finds it
// said within this long tells the person it is open there, instead of a second bonjour.
export const HELD_MS = 45 * 1000;
const TAB = /^[\w-]{6,64}$/;
const tourFile = (stateRoot) => join(stateRoot, 'tour.json');

// What is kept, checked field by field: a file written by hand or by an older MADRE is read for
// what it says correctly and nothing else. A file for another version starts the tour again.
export async function readTour(stateRoot) {
  const raw = await readFile(tourFile(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  if (!raw || typeof raw !== 'object') return fresh();
  // The tour of 1.0, read or not: this person had 1.0, and 1.1 starts again for them.
  if (raw.version === '1.0') return fresh('1.0');
  if (raw.version !== TOUR_VERSION) return fresh();
  const iso = (value) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);
  return {
    version: TOUR_VERSION,
    path: PATHS.includes(raw.path) ? raw.path : null,
    bonjourAt: iso(raw.bonjourAt),
    done: Array.isArray(raw.done) ? CHAPTERS.filter((id) => raw.done.includes(id)) : [],
    at: CHAPTERS.includes(raw.at) ? raw.at : null,
    closed: raw.closed === true,
    finished: iso(raw.finished),
    hints: Object.fromEntries(HINTS.filter((id) => iso(raw.hints?.[id])).map((id) => [id, raw.hints[id]])),
    held: raw.held && TAB.test(String(raw.held.by ?? '')) && iso(raw.held.at) ? { by: raw.held.by, at: raw.held.at } : null,
    before: BEFORE.includes(raw.before) ? raw.before : null,
  };
}

async function writeTour(stateRoot, state) {
  await writeWhole(tourFile(stateRoot), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

// One change at a time, from the page: the path taken at the bonjour, a chapter read, where the
// person is, closed to go on later, finished, a hint seen, or everything again from the start.
// One change at a time (src/json-file.mjs): every tab says it holds the tour every few seconds,
// through whichever project it is on, and a chapter read in between was lost to it.
export function changeTour(stateRoot, change, now = new Date()) {
  return oneAtATime(tourFile(stateRoot), () => applyChange(stateRoot, change, now));
}
async function applyChange(stateRoot, change, now) {
  if (!change || typeof change !== 'object') return { error: 'change' };
  // Again from the start, as the same person: whoever came from 1.0 still did.
  if (change.reset === true) return writeTour(stateRoot, fresh((await readTour(stateRoot)).before));
  const state = await readTour(stateRoot);
  const at = new Date(now).toISOString();
  if (change.path !== undefined) {
    if (!PATHS.includes(change.path)) return { error: 'path' };
    state.path = change.path;
  }
  if (change.bonjour === true) state.bonjourAt ??= at;
  if (change.chapter !== undefined) {
    if (!CHAPTERS.includes(change.chapter)) return { error: 'chapter' };
    if (!state.done.includes(change.chapter)) state.done = CHAPTERS.filter((id) => id === change.chapter || state.done.includes(id));
  }
  if (change.at !== undefined) {
    if (change.at !== null && !CHAPTERS.includes(change.at)) return { error: 'chapter' };
    state.at = change.at;
  }
  if (change.closed !== undefined) state.closed = change.closed === true;
  if (change.finished === true) { state.finished ??= at; state.closed = false; }
  // Which tab has the tour open now (one says it every few seconds while it does), and that it
  // let go — only the tab that holds it lets go.
  if (change.hold !== undefined) {
    if (!TAB.test(String(change.hold))) return { error: 'tab' };
    state.held = { by: change.hold, at };
  }
  if (change.release !== undefined && state.held?.by === change.release) state.held = null;
  if (change.hint !== undefined) {
    if (!HINTS.includes(change.hint)) return { error: 'hint' };
    state.hints[change.hint] ??= at;
  }
  return writeTour(stateRoot, state);
}

// Whoever already used MADRE wrote in it: a message of theirs in the record of a room. Having a room
// proves nothing — a room is made with its record and its memory the moment it opens, a new
// person's first `madre start` too (2026-10-11) — and a project added in Home and never opened has
// not even that. The Coordinator's own room is not counted either.
const PERSON_SPOKE = /"type":"message\.created".*"role":"user"/;
async function spoke(file) {
  const lines = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  try {
    for await (const line of lines) if (PERSON_SPOKE.test(line)) return true;
  } catch { /* unreadable: not proof of anything */ } finally {
    lines.close();
  }
  return false;
}
export async function cameBefore(stateRoot) {
  const dir = join(stateRoot, 'rooms');
  const salas = salasRoomId(stateRoot);
  for (const id of await readdir(dir).catch(() => [])) {
    if (id === salas) continue;
    const chats = await readdir(join(dir, id, 'chats')).catch(() => []);
    for (const file of [join(dir, id, 'events.jsonl'), ...chats.map((chat) => join(dir, id, 'chats', chat, 'events.jsonl'))]) {
      if (await stat(file).then((info) => info.isFile(), () => false) && await spoke(file)) return true;
    }
  }
  return false;
}

// The rooms Home cannot list: no record of where their project is, and not set aside on purpose.
export async function roomsWithoutProject(stateRoot) {
  const dir = join(stateRoot, 'rooms');
  const salas = salasRoomId(stateRoot);
  const out = [];
  for (const id of (await readdir(dir).catch(() => [])).sort()) {
    if (id === salas || !/-[0-9a-f]{16}$/.test(id)) continue;
    const has = (name) => stat(join(dir, id, name)).then(() => true, () => false);
    if (await has('project.json') || await has('project.forgotten.json')) continue;
    if (!(await has('events.jsonl')) && !(await has('memory.sqlite'))) continue;
    out.push({ id, name: id.replace(/-[0-9a-f]{16}$/, '') });
  }
  return out;
}

// One room: its folder looked for by name where people keep their projects, proved by its hash,
// and written beside its record as adding it in Home would. Answers where it was, or that it was
// not found (a folder that was deleted, moved, or lived somewhere else).
export async function recoverProject({ stateRoot, home, id }) {
  const room = (await roomsWithoutProject(stateRoot)).find((one) => one.id === id);
  if (!room) return { error: 'unknown' };
  for (const where of PROJECT_HOMES) {
    const candidate = join(home, where, room.name);
    const real = await realpath(candidate).catch(() => null);
    if (!real || projectRoomId(real) !== id) continue;
    const added = await associateProject({ root: real, home, stateRoot });
    if (added.error) continue;
    return { id, name: added.name, root: added.root, found: true };
  }
  return { id, name: room.name, found: false };
}
