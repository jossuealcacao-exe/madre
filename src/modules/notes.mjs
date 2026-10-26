// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Notes (0.1, 2026-10-20): colored notes on a project, each one a window of the room.
//
// A note is what a person writes for themself: no agent reads it, nothing is sent anywhere, and it
// does not go into the project's folder. They are kept beside the project's conversations, in
// ~/.pulse/rooms/<id>/notes.json, one file per project, written whole. The page
// draws each open note as a window of its own — the same windows every module has, moved by their
// head and sized by their edges — and remembers where it was left.
//
// ONE FILE (SDK 2, 2026-10-25): the notes, their file and the tool server an agent uses, with
// nothing imported from MADRE, so a newer Notes can come from the Market, signed, without waiting
// for a new MADRE (src/builtin-updates.mjs). Run with node, the same file is the tool server.

import { mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

// FILES THAT MORE THAN ONE THING CHANGES (the same rules as MADRE's src/json-file.mjs): written
// whole, through a draft renamed over the file, and one change at a time — in this process by a
// queue, and between the rooms of this computer and the tool server by a lock file beside it.
async function writeWhole(file, text, { mode } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const draft = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(draft, text, mode ? { mode } : undefined);
    await rename(draft, file);
  } catch (error) {
    await rm(draft, { force: true }).catch(() => {});
    throw error;
  }
}

const STALE_MS = 5000;
async function lockBeside(file) {
  const lock = `${file}.lock`;
  await mkdir(dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 250; attempt += 1) {
    try {
      await (await open(lock, 'wx')).close();
      return () => rm(lock, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const since = await stat(lock).catch(() => null);
      if (since && Date.now() - since.mtimeMs > STALE_MS) { await rm(lock, { force: true }); continue; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`${file} is being changed by another room; try again.`);
}

const queues = new Map();
function oneAtATime(file, work) {
  const run = async () => {
    const release = await lockBeside(file);
    try {
      return await work();
    } finally {
      await release();
    }
  };
  const before = queues.get(file) ?? Promise.resolve();
  const turn = before.then(run, run);
  const settled = turn.catch(() => {});
  queues.set(file, settled);
  void settled.then(() => { if (queues.get(file) === settled) queues.delete(file); });
  return turn;
}

// A message that asks for a note (2026-10-20): «/notas …», «/notes …», «hazme una nota», «take a
// note». Only then is the tool handed to the turn: a tool in every turn costs its description in
// every prompt.
export const ASKS_FOR_NOTE = /(^|\s)\/(notas?|notes?)\b|\b(nota|notas|apunta|anota|note|notes|jot)\b/i;

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
// The room's words (ctx.t, SDK 2); outside a room — a test, the tool server — the English as written.
const say = (ctx, text, vars = null) => (typeof ctx?.t === 'function' ? ctx.t(text, vars) : String(text).replace(/\{(\w+)\}/g, (whole, name) => (vars && Object.hasOwn(vars, name) ? String(vars[name]) : whole)));
const on = (ctx) => Boolean(ctx.settings?.enabled);
const door = (ctx) => (on(ctx) ? null : reply(412, { error: say(ctx, 'Notes is off in this project. Turn it on in Modules.') }));

export default {
  sdk: 2,
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
      status: { installed: enabled, detail: enabled ? say(ctx, '{n} notes in this project', { n: list.length }) : say(ctx, 'off') },
      install: { display: enabled ? 'turn off Notes' : 'turn on Notes', platforms: [] },
      notes: list.length,
    };
  },
  // An agent makes a note when the person asks for one (this same file, run as its tool server):
  // it can only add.
  async toolsForTurn(ctx, turn) {
    if (!ctx.roomDir || (turn?.text !== undefined && !ASKS_FOR_NOTE.test(turn.text))) return [];
    return [{
      name: 'madre-notes',
      command: process.execPath,
      args: [SELF],
      env: { PULSE_NOTES_DIR: ctx.roomDir },
      tools: ['create_note'],
      brief: 'When the person asks for a note (they may write /notas or /notes), make it with the create_note tool of server madre-notes: short, clear, in their language. It opens on their screen as a colored note. You cannot read their other notes.',
    }];
  },
  routes: [
    { method: 'GET', path: '/api/notes', handler: async (ctx) => door(ctx) ?? reply(200, { notes: await readNotes(ctx.roomDir), colors: NOTE_COLORS }) },
    { method: 'POST', path: '/api/notes', handler: async (ctx, { payload }) => {
      const closed = door(ctx);
      if (closed) return closed;
      const saved = await saveNote(ctx.roomDir, payload ?? {});
      if (saved.error === 'unknown') return reply(404, { error: say(ctx, 'That note is no longer here.') });
      if (saved.error === 'full') return reply(409, { error: say(ctx, 'This project already has {n} notes. Delete one to make room.', { n: NOTES_MAX }) });
      return reply(200, saved);
    } },
    { method: 'POST', path: '/api/notes/delete', handler: async (ctx, { payload }) => {
      const closed = door(ctx);
      if (closed) return closed;
      const gone = await deleteNote(ctx.roomDir, String(payload?.id ?? ''));
      return gone.error ? reply(404, { error: say(ctx, 'That note is no longer here.') }) : reply(200, gone);
    } },
  ],
};

// THE TOOL SERVER (MCP over stdio, JSON-RPC 2.0), when an agent's turn runs this file with node:
// one tool, create_note. It only adds — it cannot read, change or delete the person's notes — and
// it writes the same file the page reads, beside the project's conversations.
//
// Environment:
//   PULSE_NOTES_DIR  the project's room folder (~/.pulse/rooms/<id>)
const SERVER_NAME = 'madre-notes';
const SERVER_VERSION = '2.0.0';
const NOTE_TOOL = {
  name: 'create_note',
  description: 'Make a note for the person: a colored note that opens as a window in their project. Use it when they ask for a note (they may write /notas or /notes). Write it for them, short and clear, in their language. You cannot read their other notes.',
  inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The note, as the person will read it.' }, color: { type: 'string', enum: NOTE_COLORS, description: 'Optional color.' } }, required: ['text'] },
};

async function createNote(args, env) {
  const text = String(args.text ?? '').trim();
  if (!text) throw new Error('The note needs its text.');
  const saved = await saveNote(env.PULSE_NOTES_DIR, { text, color: NOTE_COLORS.includes(args.color) ? args.color : undefined });
  if (saved.error === 'full') throw new Error('This project already has as many notes as it can keep. Ask the person to delete one.');
  if (saved.error) throw new Error('The note was not saved.');
  return `Note made (${saved.note.color}). It opens on the person's screen when your answer ends.`;
}

export function handleRequest(message, { env = process.env } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  const tools = env.PULSE_NOTES_DIR ? [NOTE_TOOL] : [];
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      return Promise.resolve(reply({ tools }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (!tools.some((tool) => tool.name === name)) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      return createNote(args, env)
        .then((text) => reply({ content: [{ type: 'text', text }], isError: false }))
        .catch((error) => reply({ content: [{ type: 'text', text: `Nothing was saved: ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, env = process.env } = {}) {
  let buffer = '';
  let pending = 0;
  let ended = false;
  const finish = () => { if (ended && pending === 0) process.exit(0); };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`); continue; }
      pending += 1;
      void handleRequest(message, { env })
        .then((response) => { if (response) output.write(`${JSON.stringify(response)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  input.on('end', () => { ended = true; finish(); });
}

// Both paths resolved before they are compared (WIN-004), as the other servers do.
const real = async (path) => (path ? realpath(path).catch(() => path) : null);
if (process.argv[1] && (await real(process.argv[1])) === (await real(SELF))) {
  if (!process.env.PULSE_NOTES_DIR) {
    process.stderr.write('PULSE_NOTES_DIR is required.\n');
    process.exit(2);
  }
  serve();
}
