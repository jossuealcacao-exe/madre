#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// MADRE NOTES AND REMINDERS for an agent (2026-10-20): a small MCP server (stdio, JSON-RPC 2.0) that
// lets an agent make a note or set a reminder for the person when they ask for one — «/notas …»,
// «/recordatorios …», «hazme una nota con…», «recuérdame…». It only adds: it cannot read, change or
// delete the person's notes or reminders, which stay theirs (src/modules/notes.mjs, reminders.mjs).
// It writes the same files the page reads, beside the project's conversations, and nothing leaves
// this computer.
//
// Environment:
//   PULSE_NOTES_DIR        the project's room folder (~/.pulse/rooms/<id>): with it, create_note
//   PULSE_REMINDERS_STATE  ~/.pulse: with it, create_reminder
//   PULSE_ROOM_ID          the project's room id, kept on each reminder
//   PULSE_PROJECT          the project's name, for Home
//   PULSE_REMINDER_HOUR    the hour a day starts at for a reminder with no hour (Reminders' setting)

import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NOTE_COLORS, saveNote } from '../modules/notes.mjs';
import { addReminder, taskFromWords } from '../modules/reminders.mjs';
import { parseWhen, tomorrowMorning } from '../reminder-time.mjs';

const SERVER_NAME = 'madre-notes';
const SERVER_VERSION = '1.0.0';
const SELF = fileURLToPath(import.meta.url);

const NOTE_TOOL = {
  name: 'create_note',
  description: 'Make a note for the person: a colored note that opens as a window in their project. Use it when they ask for a note (they may write /notas or /notes). Write it for them, short and clear, in their language. You cannot read their other notes.',
  inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The note, as the person will read it.' }, color: { type: 'string', enum: NOTE_COLORS, description: 'Optional color.' } }, required: ['text'] },
};
const REMINDER_TOOL = {
  name: 'create_reminder',
  description: 'Set a reminder for the person. Use it when they ask to be reminded of something (they may write /recordatorios or /reminders). MADRE tells them when it is due, in Home and in this project.',
  inputSchema: { type: 'object', properties: { what: { type: 'string', description: 'What to remember, short, in the person\'s language.' }, when: { type: 'string', description: 'When, in the person\'s own words: «mañana a las 5», «el lunes», «every day at 9», «in 2 hours». Empty for tomorrow morning.' } }, required: ['what'] },
};

export const toolsFor = (env = process.env) => [...(env.PULSE_NOTES_DIR ? [NOTE_TOOL] : []), ...(env.PULSE_REMINDERS_STATE ? [REMINDER_TOOL] : [])];

async function callTool(name, args, env) {
  if (name === 'create_note') {
    const text = String(args.text ?? '').trim();
    if (!text) throw new Error('The note needs its text.');
    const saved = await saveNote(env.PULSE_NOTES_DIR, { text, color: NOTE_COLORS.includes(args.color) ? args.color : undefined });
    if (saved.error === 'full') throw new Error('This project already has as many notes as it can keep. Ask the person to delete one.');
    if (saved.error) throw new Error('The note was not saved.');
    return `Note made (${saved.note.color}). It opens on the person's screen when your answer ends.`;
  }
  if (name === 'create_reminder') {
    const what = taskFromWords(String(args.what ?? '').trim());
    if (!what) throw new Error('The reminder needs what to remember.');
    const hour = Number(env.PULSE_REMINDER_HOUR) || 9;
    const when = parseWhen(String(args.when ?? ''), new Date(), { hour }) ?? { due: tomorrowMorning(new Date(), hour), repeat: null };
    const made = await addReminder(env.PULSE_REMINDERS_STATE, { text: what, due: when.due.toISOString(), repeat: when.repeat, room: env.PULSE_ROOM_ID || null, project: env.PULSE_PROJECT || null, why: 'asked' });
    if (made.error) throw new Error('The reminder was not set.');
    return `Reminder set: «${made.reminder.text}», due ${made.reminder.due}${made.reminder.repeat ? `, repeating ${made.reminder.repeat}` : ''}. Tell the person when, in their words.`;
  }
  throw new Error(`Unknown tool: ${name}`);
}

export function handleRequest(message, { env = process.env } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  const tools = toolsFor(env);
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
      return callTool(name, args, env)
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
  if (!process.env.PULSE_NOTES_DIR && !process.env.PULSE_REMINDERS_STATE) {
    process.stderr.write('PULSE_NOTES_DIR or PULSE_REMINDERS_STATE is required.\n');
    process.exit(2);
  }
  serve();
}
