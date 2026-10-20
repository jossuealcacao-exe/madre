// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Notes (0.1, 2026-10-20): colored notes on a project, each one a window of the room.
//
// A note is what a person writes for themself: no agent reads it, nothing is sent anywhere, and it
// does not go into the project's folder. They are kept beside the project's conversations, in
// ~/.pulse/rooms/<id>/notes.json, one file per project, written whole (src/json-file.mjs). The page
// draws each open note as a window of its own — the same windows every module has, moved by their
// head and sized by their edges — and remembers where it was left.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defineModule } from './sdk.mjs';
import { oneAtATime, writeWhole } from '../json-file.mjs';
import { t } from '../i18n.mjs';

export const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];
export const NOTES_MAX = 200;
export const NOTE_TEXT_MAX = 20000;
const ID = /^[a-z0-9-]{6,64}$/i;
const notesFile = (roomDir) => join(roomDir, 'notes.json');
const number = (value, low, high) => (Number.isFinite(Number(value)) ? Math.round(Math.min(high, Math.max(low, Number(value)))) : null);

// Where a note was left on the page, as numbers that can be trusted, or nothing.
function boxOf(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const box = { x: number(raw.x, -4000, 8000), y: number(raw.y, 0, 8000), w: number(raw.w, 160, 4000), h: number(raw.h, 120, 4000) };
  return Object.values(box).every((value) => value !== null) ? box : null;
}
// One note read field by field: a file written by hand is read for what it says correctly.
function noteOf(raw) {
  if (!raw || typeof raw !== 'object' || !ID.test(String(raw.id ?? ''))) return null;
  const iso = (value) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);
  return {
    id: raw.id,
    text: String(raw.text ?? '').slice(0, NOTE_TEXT_MAX),
    color: NOTE_COLORS.includes(raw.color) ? raw.color : NOTE_COLORS[0],
    open: raw.open !== false,
    box: boxOf(raw.box),
    at: iso(raw.at) ?? new Date(0).toISOString(),
  };
}

export async function readNotes(roomDir) {
  if (!roomDir) return [];
  const raw = await readFile(notesFile(roomDir), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  return (Array.isArray(raw?.notes) ? raw.notes : []).map(noteOf).filter(Boolean).slice(0, NOTES_MAX);
}
const writeNotes = (roomDir, notes) => writeWhole(notesFile(roomDir), `${JSON.stringify({ notes }, null, 2)}\n`);

// A new note, or a change to one: only what the change names moves.
export function saveNote(roomDir, change, now = new Date()) {
  return oneAtATime(notesFile(roomDir), async () => {
    const notes = await readNotes(roomDir);
    const at = new Date(now).toISOString();
    let note = change?.id ? notes.find((one) => one.id === change.id) : null;
    if (change?.id && !note) return { error: 'unknown' };
    if (!note) {
      if (notes.length >= NOTES_MAX) return { error: 'full' };
      note = { id: randomUUID(), text: '', color: NOTE_COLORS.includes(change?.color) ? change.color : NOTE_COLORS[0], open: true, box: null, at };
      notes.push(note);
    }
    if (typeof change?.text === 'string') note.text = change.text.slice(0, NOTE_TEXT_MAX);
    if (NOTE_COLORS.includes(change?.color)) note.color = change.color;
    if (typeof change?.open === 'boolean') note.open = change.open;
    if (change?.box !== undefined) note.box = boxOf(change.box);
    note.at = at;
    await writeNotes(roomDir, notes);
    return { note };
  });
}

export function deleteNote(roomDir, id) {
  return oneAtATime(notesFile(roomDir), async () => {
    const notes = await readNotes(roomDir);
    const kept = notes.filter((one) => one.id !== id);
    if (kept.length === notes.length) return { error: 'unknown' };
    await writeNotes(roomDir, kept);
    return { deleted: id };
  });
}

const reply = (status, body) => ({ status, body });
const on = (ctx) => Boolean(notes.settingsFrom(ctx.config, ctx.roomId).enabled);
const door = (ctx) => (on(ctx) ? null : reply(412, { error: t('Notes is off in this project. Turn it on in Modules.') }));

const notes = defineModule({
  id: 'notes',
  name: 'Notes',
  vendor: 'MADRE',
  version: '0.1.0',
  summary: 'Colored notes on the project, each in a window you move and size as you like. Only you read them: no agent sees them and nothing leaves your computer.',
  creates: ['nothing in the project', 'a notes.json file beside the project’s conversations, in ~/.pulse'],
  settings: { enabled: false },
  async status(ctx) {
    const list = await readNotes(ctx.roomDir);
    const enabled = Boolean(ctx.settings.enabled);
    return {
      status: { installed: enabled, detail: enabled ? t('{n} notes in this project', { n: list.length }) : t('off') },
      install: { display: enabled ? 'turn off Notes' : 'turn on Notes', platforms: [] },
      notes: list.length,
    };
  },
  routes: [
    { method: 'GET', path: '/api/notes', handler: async (ctx) => door(ctx) ?? reply(200, { notes: await readNotes(ctx.roomDir), colors: NOTE_COLORS }) },
    { method: 'POST', path: '/api/notes', handler: async (ctx, { payload }) => {
      const closed = door(ctx);
      if (closed) return closed;
      const saved = await saveNote(ctx.roomDir, payload ?? {});
      if (saved.error === 'unknown') return reply(404, { error: t('That note is no longer here.') });
      if (saved.error === 'full') return reply(409, { error: t('This project already has {n} notes. Delete one to make room.', { n: NOTES_MAX }) });
      return reply(200, saved);
    } },
    { method: 'POST', path: '/api/notes/delete', handler: async (ctx, { payload }) => {
      const closed = door(ctx);
      if (closed) return closed;
      const gone = await deleteNote(ctx.roomDir, String(payload?.id ?? ''));
      return gone.error ? reply(404, { error: t('That note is no longer here.') }) : reply(200, gone);
    } },
  ],
});
export default notes;
