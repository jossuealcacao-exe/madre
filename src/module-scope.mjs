// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Which projects a module is on in (2026-10-18, with the Market).
//
// A module's switch lived in ~/.pulse/config.json, which every project reads, so turning one on in
// one project turned it on in all of them. This adds the one thing that file could not say — which
// projects — without moving anything that was there:
//
//   modules.<key>.enabled  on for every project, as it always was. Home writes it.
//   modules.<key>.rooms    { <room id>: true | false }: a project's own word, which wins over it.
//
// A project's switch in MODULES writes that project's word and nothing else. Home's «every project»
// writes `enabled` and clears the words, so every project follows it again; Home's «only in this
// project» writes one word. Home's own room, the Coordinator's, is not a project: it reads and
// writes `enabled`. Local AI keeps its own list (local-ai.mjs) and is not read here.

const ROOM_ID = /^[\w.:-]{1,200}$/;

// The words written so far, without anything that is not one.
export function roomsOf(block = {}) {
  const rooms = {};
  for (const [id, on] of Object.entries(block?.rooms ?? {})) if (ROOM_ID.test(id) && typeof on === 'boolean') rooms[id] = on;
  return rooms;
}

// Whether a module is on in one project. `fallback` is the module's own default, for a block that
// never said `enabled` (most of MADRE's modules start on).
export function moduleOnIn(block = {}, roomId = null, fallback = false) {
  const all = typeof block?.enabled === 'boolean' ? block.enabled : fallback;
  if (!roomId) return all;
  const own = roomsOf(block)[roomId];
  return typeof own === 'boolean' ? own : all;
}

// A module's settings as one project sees them: `enabled` is that project's.
export function settingsIn(block = {}, roomId = null) {
  if (!roomId || typeof roomsOf(block)[roomId] !== 'boolean') return block;
  return { ...block, enabled: roomsOf(block)[roomId] };
}

// The block written when a project's own switch moves (Home's room, with no id, moves `enabled`).
// The whole block, because updateConfig merges one level down.
export function switchIn(block = {}, roomId = null, enabled) {
  if (!roomId) return { ...block, enabled };
  return { ...block, rooms: { ...roomsOf(block), [roomId]: enabled } };
}

// The block Home writes. `all`: every project, the words cleared. `rooms`: one project's word each,
// `null` to drop one so that project follows `enabled` again.
export function scopeIn(block = {}, { all, rooms } = {}) {
  const next = { ...block, rooms: roomsOf(block) };
  if (typeof all === 'boolean') { next.enabled = all; next.rooms = {}; }
  for (const [id, on] of Object.entries(rooms ?? {})) {
    if (!ROOM_ID.test(id)) continue;
    if (typeof on === 'boolean') next.rooms[id] = on;
    else if (on === null) delete next.rooms[id];
  }
  if (!Object.keys(next.rooms).length) delete next.rooms;
  return next;
}

// What Home shows of one module: on for all, and which projects said otherwise.
export function scopeView(block = {}, fallback = false, projectIds = []) {
  const all = typeof block?.enabled === 'boolean' ? block.enabled : fallback;
  const rooms = roomsOf(block);
  const on = projectIds.filter((id) => moduleOnIn(block, id, fallback));
  return { all, rooms, on, everywhere: projectIds.length > 0 && on.length === projectIds.length };
}
