// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Which projects use the local AI (Ollama), decided from Home (2026-10-13).
//
// Ollama is one per computer and its switches live in ~/.pulse/config.json, which every project
// shares: `modules.ollama` says whether the local AI is on at all and what it does (search by
// meaning, summing up the memory, @madre). This adds the one thing that file could not say —
// which projects — without touching any of that:
//
//   localAi.mode  'auto'   every project uses it, new ones too. Home decides; projects follow.
//                 'pick'   only the projects switched on. New ones start without it.
//                 'manual' each project decides in its own Settings. New ones start with it.
//   localAi.rooms { <room id>: true | false } what was switched, from Home or from the project.
//   localAi.model the chat model the person chose (2026-10-20), one for the whole computer as
//                 Ollama is. Nothing written: MADRE picks the best one installed (src/ollama.mjs).
//
// With nothing written the mode is 'auto', which is what MADRE did before this existed. The
// master switch (`modules.ollama.enabled`) still wins: off there is off everywhere. Home's own
// room, the Coordinator's, is not a project and always follows the master switch.

export const LOCAL_MODES = ['auto', 'pick', 'manual'];

export function localAiConfig(config = {}) {
  const raw = config.localAi ?? {};
  const mode = LOCAL_MODES.includes(raw.mode) ? raw.mode : 'auto';
  const rooms = {};
  for (const [id, on] of Object.entries(raw.rooms ?? {})) if (typeof on === 'boolean') rooms[id] = on;
  return { mode, rooms, model: MODEL_NAME.test(raw.model ?? '') ? raw.model : null };
}

// A name as Ollama writes it: qwen2.5:7b, llama3.1:8b, someone/model:tag.
export const MODEL_NAME = /^[a-z0-9][a-z0-9._:/-]{1,80}$/i;

// What one project gets. `on`: whether it uses the local AI now; `chosen`: what this project's
// switch says, before the master switch; `editable`: whether its switch can be moved (not in auto).
export function localAiFor(config = {}, roomId = null, { home = false } = {}) {
  const master = (config.modules?.ollama?.enabled ?? true) !== false;
  const { mode, rooms } = localAiConfig(config);
  if (home || !roomId) return { mode, master, chosen: true, on: master, editable: false, home: Boolean(home) };
  const chosen = mode === 'auto' ? true : mode === 'pick' ? rooms[roomId] === true : rooms[roomId] ?? true;
  return { mode, master, chosen, on: master && chosen, editable: mode !== 'auto' };
}

// The patch for config.json: the whole `localAi` block, because updateConfig merges one level
// down and a partial `rooms` would drop the projects it does not name.
export function localAiPatch(config = {}, { mode, rooms, model } = {}) {
  const now = localAiConfig(config);
  const next = { mode: LOCAL_MODES.includes(mode) ? mode : now.mode, rooms: { ...now.rooms } };
  // null goes back to MADRE's own pick; anything else that is not a model name changes nothing.
  // Written as null, not left out: updateConfig merges one level down and would keep the old one.
  next.model = model === null ? null : MODEL_NAME.test(model ?? '') ? model : now.model;
  for (const [id, on] of Object.entries(rooms ?? {})) {
    if (typeof id !== 'string' || !id || id.length > 200) continue;
    if (typeof on === 'boolean') next.rooms[id] = on;
    else if (on === null) delete next.rooms[id];
  }
  return { localAi: next };
}
