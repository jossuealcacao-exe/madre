// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// A project has one memory and many conversations.
//
// The archive, the crew, the modules and the privacy list belong to the project: they are what
// MADRE knows about this codebase, and they do not start over because somebody opened a new
// thread. A conversation is only the record of one line of work — its own ledger, its own
// transcript, its own window — and everything it says feeds the same archive.
//
// The first conversation is the ledger that was always there, kept exactly where it was: no file
// is moved to add this, so a room that existed before opens as it always did and simply gains a
// name. New conversations get a folder of their own next to it.
//
//   <room>/events.jsonl              the first conversation
//   <room>/chats/<id>/events.jsonl   every one after it
//   <room>/chats.json                their names, and which one is open
//
// Nothing here starts a room or reads a ledger. It keeps the list.

import { readFile, mkdir, rm, readdir, open, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { oneAtATime, writeWhole } from './json-file.mjs';

export const MAIN_CHAT = 'main';
export const CHAT_TITLE_MAX = 80;
const FILE = 'chats.json';

export const isChatId = (id) => typeof id === 'string' && (id === MAIN_CHAT || /^[a-z0-9]{8,32}$/.test(id));

// Where one conversation's ledger lives. The first one never moved.
export function chatLedger(roomDir, id) {
  return id === MAIN_CHAT ? join(roomDir, 'events.jsonl') : join(roomDir, 'chats', id, 'events.jsonl');
}

async function readIndex(roomDir) {
  try {
    const raw = JSON.parse(await readFile(join(roomDir, FILE), 'utf8'));
    if (raw && typeof raw === 'object' && raw.chats && typeof raw.chats === 'object') return raw;
  } catch { /* no index yet, or an unreadable one: the room still opens */ }
  return null;
}

// Written whole, one change at a time (src/json-file.mjs): a rename, a new conversation and a
// message arriving read and wrote the list at once, and the last one wrote over the others
// (LOG-11 of the 1.0 review); and a write cut halfway left a list nobody could read.
async function writeIndex(roomDir, index) {
  await writeWhole(join(roomDir, FILE), JSON.stringify(index, null, 2));
  return index;
}
const indexTurn = (roomDir, work) => oneAtATime(join(roomDir, FILE), work);

// The list, with the first conversation always in it. A room that predates conversations reads
// as one conversation, which is what it was.
export async function chatIndex(roomDir) {
  const index = await readIndex(roomDir);
  const now = new Date().toISOString();
  if (!index) return { active: MAIN_CHAT, chats: { [MAIN_CHAT]: { title: null, createdAt: now, updatedAt: now, messages: 0, preview: null } } };
  if (!index.chats[MAIN_CHAT]) index.chats[MAIN_CHAT] = { title: null, createdAt: now, updatedAt: now, messages: 0, preview: null };
  if (!index.chats[index.active]) index.active = MAIN_CHAT;
  return index;
}

// A conversation named or previewed by a message BISHOP's channel brought, before the room learned
// to leave out the header its agent reads: shown without it (docs/MACROVERSO.md, fase 4c).
const withoutRelayHeader = (line) => {
  if (typeof line !== 'string' || !line.startsWith('BISHOP › ')) return line;
  const task = line.replace(/^BISHOP › .*?(?:other rooms(?: in this turn)?\.|ends with the answer\.)\s*/, '');
  // Cut short inside the header (titles and previews are kept short): only the sender is left.
  return task && !task.startsWith('BISHOP › ') ? task : 'Coordinator';
};
const shape = (id, entry, active) => ({
  id,
  title: withoutRelayHeader(entry.title) || (id === MAIN_CHAT ? 'First conversation' : 'Untitled'),
  named: Boolean(entry.title),
  createdAt: entry.createdAt ?? null,
  updatedAt: entry.updatedAt ?? entry.createdAt ?? null,
  messages: Number(entry.messages ?? 0),
  preview: withoutRelayHeader(entry.preview) ?? null,
  active: id === active,
});

// Newest first, because that is the order a person looks for a conversation in.
export async function listChats(roomDir) {
  const index = await chatIndex(roomDir);
  const chats = Object.entries(index.chats)
    .map(([id, entry]) => shape(id, entry, index.active))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  return { active: index.active, chats };
}

export function createChat(roomDir, ...rest) {
  return indexTurn(roomDir, () => createChatNow(roomDir, ...rest));
}
async function createChatNow(roomDir, { title = null, now = new Date().toISOString(), activate = true } = {}) {
  const index = await chatIndex(roomDir);
  const id = randomUUID().replace(/-/g, '').slice(0, 16);
  index.chats[id] = { title: title ? String(title).slice(0, CHAT_TITLE_MAX) : null, createdAt: now, updatedAt: now, messages: 0, preview: null };
  // A conversation started from a phone is the phone's: the room keeps the one it had open.
  if (activate) index.active = id;
  await mkdir(join(roomDir, 'chats', id), { recursive: true });
  await writeIndex(roomDir, index);
  return shape(id, index.chats[id], index.active);
}

export function openChat(roomDir, ...rest) {
  return indexTurn(roomDir, () => openChatNow(roomDir, ...rest));
}
async function openChatNow(roomDir, id) {
  const index = await chatIndex(roomDir);
  if (!index.chats[id]) return null;
  index.active = id;
  await writeIndex(roomDir, index);
  return shape(id, index.chats[id], index.active);
}

export function renameChat(roomDir, ...rest) {
  return indexTurn(roomDir, () => renameChatNow(roomDir, ...rest));
}
async function renameChatNow(roomDir, id, title) {
  const index = await chatIndex(roomDir);
  if (!index.chats[id]) return null;
  const named = String(title ?? '').trim().slice(0, CHAT_TITLE_MAX);
  index.chats[id].title = named || null;
  await writeIndex(roomDir, index);
  return shape(id, index.chats[id], index.active);
}

// Deleting a conversation takes its transcript and nothing else: whatever the archivist distilled
// from it is the project's memory, not the conversation's, and it stays. The last conversation
// cannot be deleted — a room always has somewhere to talk.
export function deleteChat(roomDir, ...rest) {
  return indexTurn(roomDir, () => deleteChatNow(roomDir, ...rest));
}
async function deleteChatNow(roomDir, id) {
  const index = await chatIndex(roomDir);
  if (!index.chats[id]) return null;
  if (Object.keys(index.chats).length < 2) return { error: 'A room always has one conversation. Start another before deleting this one.' };
  delete index.chats[id];
  if (index.active === id) index.active = Object.keys(index.chats)[0];
  if (id === MAIN_CHAT) await rm(join(roomDir, 'events.jsonl'), { force: true });
  else await rm(join(roomDir, 'chats', id), { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  await writeIndex(roomDir, index);
  return { deleted: id, active: index.active };
}

// What the list shows about a conversation, kept as it happens rather than by reading every
// ledger to draw a sidebar. A conversation with no name of its own takes the first thing the
// human said in it, which is what they will look for.
export function touchChat(roomDir, ...rest) {
  return indexTurn(roomDir, () => touchChatNow(roomDir, ...rest));
}
async function touchChatNow(roomDir, id, { text = null, now = new Date().toISOString(), counts = true } = {}) {
  const index = await chatIndex(roomDir);
  const entry = index.chats[id];
  if (!entry) return null;
  entry.updatedAt = now;
  if (counts) entry.messages = Number(entry.messages ?? 0) + 1;
  if (text) {
    const line = String(text).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (line) {
      entry.preview = line;
      if (!entry.title) entry.title = line.slice(0, CHAT_TITLE_MAX);
    }
  }
  await writeIndex(roomDir, index);
  return shape(id, entry, index.active);
}

// Conversations whose folder is on disk but which no index knows about: a room copied by hand, or
// an index lost. They are listed rather than ignored, because a transcript is not disposable.
export function adoptStrays(roomDir, ...rest) {
  return indexTurn(roomDir, () => adoptStraysNow(roomDir, ...rest));
}
async function adoptStraysNow(roomDir) {
  let folders = [];
  try { folders = await readdir(join(roomDir, 'chats')); } catch { return { adopted: [] }; }
  const index = await chatIndex(roomDir);
  const adopted = [];
  for (const id of folders) {
    if (!isChatId(id) || index.chats[id]) continue;
    index.chats[id] = { title: null, createdAt: null, updatedAt: null, messages: 0, preview: null };
    adopted.push(id);
  }
  if (adopted.length) await writeIndex(roomDir, index);
  return { adopted };
}

// The last sequence a ledger reached, read from its tail rather than by loading it. A project
// numbers its exchanges once across every conversation, so opening one has to know where the
// others got to; doing that by reading whole ledgers would make opening a conversation cost more
// the longer the project has been worked in.
export async function lastSequenceOf(file, { window = 65536 } = {}) {
  let handle;
  try {
    const size = (await stat(file)).size;
    if (!size) return 0;
    handle = await open(file, 'r');
    // The window doubles until it finds a whole event or holds the whole file (LOG-09 of the 1.0
    // review): one window only, a last line longer than it — a long answer — read as 0, and the
    // conversation opened on numbers another one had already used, which the archive then dropped.
    for (let length = Math.min(window, size); ; length = Math.min(length * 2, size)) {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, size - length);
      const lines = buffer.toString('utf8').split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        // The first line of a window that does not start the file may be cut: it is read again whole.
        if (i === 0 && length < size) break;
        try {
          const event = JSON.parse(lines[i]);
          if (Number.isInteger(event?.sequence)) return event.sequence;
        } catch { /* a torn write: keep looking back */ }
      }
      if (length >= size) return 0;
    }
  } catch {
    return 0;
  } finally {
    await handle?.close().catch(() => {});
  }
}

// Where the project's numbering stands, across every conversation but the one being opened.
export async function projectFloor(roomDir, { except = null } = {}) {
  const { chats } = await listChats(roomDir);
  let floor = 0;
  for (const chat of chats) {
    if (chat.id === except) continue;
    floor = Math.max(floor, await lastSequenceOf(chatLedger(roomDir, chat.id)));
  }
  return floor;
}

// SEARCH (2026-10-30): the conversations of a project, by their name and by what was said in them,
// without regard to accents or capitals, so «envio» finds «Envío». Each record is read from its
// end, a few megabytes at most: what a person looks for is almost always recent.
const SEARCH_READ = 4 * 1024 * 1024;
export const searchWords = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function tailOf(file) {
  const found = await stat(file).catch(() => null);
  if (!found?.isFile()) return '';
  const start = Math.max(0, found.size - SEARCH_READ);
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(found.size - start);
    await handle.read(buffer, 0, buffer.length, start);
    const text = buffer.toString('utf8');
    return start ? text.slice(text.indexOf('\n') + 1) : text;
  } finally { await handle.close(); }
}
function snippetAround(text, at, length) {
  const from = Math.max(0, at - 50);
  const to = Math.min(text.length, at + length + 90);
  return { text: `${from ? '…' : ''}${text.slice(from, to).replace(/\s+/g, ' ')}${to < text.length ? '…' : ''}`, mark: [at - from + (from ? 1 : 0), length] };
}
export async function searchChats(roomDir, query, { limit = 40, perChat = 3 } = {}) {
  const wanted = searchWords(query).trim();
  if (wanted.length < 2) return { query: String(query ?? ''), results: [] };
  const { chats } = await listChats(roomDir);
  const results = [];
  for (const chat of chats) {
    const hits = [];
    const titleAt = searchWords(chat.title).indexOf(wanted);
    for (const line of (await tailOf(chatLedger(roomDir, chat.id))).split('\n').reverse()) {
      if (hits.length >= perChat) break;
      if (!line.includes('"message.created"')) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      const payload = event?.payload ?? {};
      const said = typeof payload.text === 'string' ? payload.text : '';
      const at = searchWords(said).indexOf(wanted);
      if (at < 0) continue;
      hits.push({ messageId: payload.messageId ?? null, sequence: event.sequence ?? null, who: payload.role === 'user' ? 'you' : String(payload.sender ?? ''), at: event.timestamp ?? null, ...snippetAround(said, at, wanted.length) });
    }
    if (titleAt < 0 && !hits.length) continue;
    results.push({ id: chat.id, title: chat.title, updatedAt: chat.updatedAt ?? null, titleMatch: titleAt >= 0, hits });
    if (results.length >= limit) break;
  }
  return { query: String(query ?? ''), results };
}
