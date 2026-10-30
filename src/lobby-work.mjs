// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What was worked on last on this Mac, for the lobby (2026-10-10): the newest conversations of
// every room the lobby knows, open or asleep, each with its last few lines, and the summary MADRE
// writes of them with its local model. Everything here READS: a room's list of conversations
// (chats.json) and the end of a conversation's ledger, from the room's folder, never asking the
// room and never writing to it. The summary is checked against what it was given: a line that does
// not carry the number of a conversation it was given is dropped, and the project of each line is
// put by the lobby, from that number, never taken from the model's words.

import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { chatLedger, listChats } from './chats.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

// The last messages of one conversation, read from the end of its ledger without reading all of
// it (a ledger also carries quota readings and turns, and grows for months). A cut first line is
// dropped; a line that is not a message is passed over; delegations between agents are the
// plan's own bookkeeping, not what was said.
export async function lastMessages(file, { limit = 4, window = 512 * 1024, maxChars = 360 } = {}) {
  let handle = null;
  try {
    handle = await open(file, 'r');
    const { size } = await handle.stat();
    const start = Math.max(0, size - window);
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    const lines = buffer.toString('utf8').split('\n');
    if (start > 0) lines.shift();
    const said = [];
    for (let index = lines.length - 1; index >= 0 && said.length < limit; index -= 1) {
      if (!lines[index].includes('"message.created"')) continue;
      let event = null;
      try { event = JSON.parse(lines[index]); } catch { continue; }
      const payload = event?.payload ?? {};
      if (event?.type !== 'message.created' || payload.status === 'delegated') continue;
      // Read as words: without the marks a message is written in (bold, code, headings, links).
      const text = String(payload.text ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/(\*\*|__|`)/g, '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const person = payload.role === 'user' || payload.sender === 'human';
      said.unshift({ who: person ? 'person' : String(payload.sender ?? 'agent'), text: text.slice(0, maxChars), at: event.timestamp ?? null });
    }
    return said;
  } catch {
    return [];
  } finally {
    await handle?.close().catch(() => {});
  }
}

// The newest conversations across the rooms, at most `perRoom` from each and `limit` in all, from
// the last `days` days; each with its last lines. `rooms` is [{ id, name }] as the lobby names them.
export async function recentWork({ stateRoot, rooms, now = Date.now(), days = 14, limit = 6, perRoom = 2 }) {
  const since = now - days * DAY_MS;
  const found = [];
  for (const room of rooms) {
    const dir = join(stateRoot, 'rooms', room.id);
    const { chats } = await listChats(dir).catch(() => ({ chats: [] }));
    const fresh = chats.filter((chat) => chat.messages > 0 && Date.parse(chat.updatedAt ?? 0) >= since).slice(0, perRoom);
    for (const chat of fresh) found.push({ room: room.id, name: room.name, chat: chat.id, title: chat.title, at: chat.updatedAt, messages: chat.messages });
  }
  found.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // A conversation where nobody answered (a question whose turn failed) is not work done: summarised,
  // it read «Se preguntó cuántos proyectos se tenían» (QA 1.1.0, ACT-15).
  const newest = [];
  for (const item of found) {
    if (newest.length >= limit) break;
    item.said = await lastMessages(chatLedger(join(stateRoot, 'rooms', item.room), item.chat));
    if (!item.said.some((one) => one.who !== 'person')) continue;
    newest.push(item);
  }
  return newest;
}

// What MADRE is told: who it is writing for, one line per numbered conversation, and that it may
// only say what that conversation says. It never names the project: the lobby puts the name to
// each line by its number, so a small local model cannot give one project's work to another.
export const WORK_SYSTEM = {
  es: 'Eres MADRE. Resumes para la persona lo último que se trabajó. Recibes conversaciones numeradas (#1, #2…). Para cada una escribe UNA línea con el formato `#número: frase`, en el mismo orden. La frase, corta y en pasado, dice qué se hizo o se decidió en ESA conversación y, si lo hay, qué quedó pendiente; si no queda claro, di de qué trata. Usa solo lo que dice esa conversación: no mezcles conversaciones ni inventes nombres, cifras o conclusiones. No escribas nada más.',
  en: 'You are MADRE. You summarise for the person what was worked on last. You get numbered conversations (#1, #2…). For each one write ONE line in the form `#number: sentence`, in the same order. The sentence, short and in the past tense, says what was done or decided in THAT conversation and, if there is one, what was left pending; if it is not clear, say what it is about. Use only what that conversation says: do not mix conversations or invent names, figures or conclusions. Write nothing else.',
};
export function workPrompt(items, language = 'es') {
  const person = language === 'es' ? 'Persona' : 'Person';
  return items.map((item, index) => {
    const lines = (item.said ?? []).map((one) => `  ${one.who === 'person' ? person : `@${one.who}`}: ${one.text}`);
    return [`#${index + 1} · «${item.title}»`, ...lines].join('\n');
  }).join('\n\n');
}

// The answer, as lines the lobby can show: each must carry the number of a conversation it was
// given, once; the project is that conversation's, never a word of the model's.
export function parseWork(text, items, { max = 5 } = {}) {
  const seen = new Set();
  const bullets = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\*\*/g, '').replace(/^\s*(?:[-*•·]\s*)?/, '').trim();
    const match = /^#?\s*(\d{1,2})\s*[:.)\-–—]\s*(.+)$/.exec(line);
    if (!match) continue;
    const index = Number(match[1]) - 1;
    const item = items[index];
    if (!item || seen.has(index)) continue;
    const said = match[2].replace(/^[«"“]|[»"”]$/g, '').trim();
    // A line that only says the conversation's name again says nothing about the work.
    const bare = (words) => String(words ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (said.length < 8 || bare(said) === bare(item.title)) continue;
    seen.add(index);
    bullets.push({ room: item.room, name: item.name, text: said.slice(0, 280) });
    if (bullets.length >= max) break;
  }
  return bullets;
}
