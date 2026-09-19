// The dataset behind MADRE AI: every exchange the room kept (never GHOST),
// redacted, as chat pairs a small model can learn from, plus the distilled
// notes. Written next to the room's ledger in the format mlx-lm and most
// fine-tuners read: one {"messages": [...]} per line, split train / valid.
// Export is the first step of roadmap 2c; training runs outside MADRE, on the
// human's machine, from docs/training/.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redact } from './sentinel-errors.mjs';

const MIN_ANSWER_CHARS = 40;

function system(project, agent) {
  return `You are @${agent} in the MADRE room of the project "${project}". Answer the human directly and concisely; distinguish facts from inference; name files, agents and numbers exactly.`;
}

// Pairs a user message with the assistant reply that answered it (parentMessageId).
const guard = (privacy) => (text) => (privacy ? privacy.redact(text).text : text);

export function pairsFromEvents(events, { project = 'project', home, user, privacy = null } = {}) {
  const clean = guard(privacy);
  const users = new Map();
  const pairs = [];
  for (const event of events) {
    if (event.type !== 'message.created' || event.ghost || !Number.isInteger(event.sequence)) continue;
    const p = event.payload ?? {};
    if (typeof p.text !== 'string' || !p.text.trim()) continue;
    if (p.role === 'user') { users.set(p.messageId, { text: p.text, mode: p.mode ?? 1, sequence: event.sequence }); continue; }
    if (p.role !== 'assistant' || p.status === 'delegated') continue;
    const ask = users.get(p.parentMessageId);
    if (!ask) continue;
    const answer = (p.originalText ?? p.text).trim();
    if (answer.length < MIN_ANSWER_CHARS) continue;
    pairs.push({
      kind: 'turn',
      agent: p.sender,
      mode: p.mode ?? ask.mode,
      sequence: event.sequence,
      at: event.timestamp,
      messages: [
        { role: 'system', content: system(project, p.sender) },
        { role: 'user', content: clean(redact(ask.text, { home, user })) },
        { role: 'assistant', content: clean(redact(answer, { home, user })) },
      ],
    });
  }
  return pairs;
}

// Distilled notes become recall pairs: "what does the room remember about …" → the note.
export function pairsFromNotes(notes, { project = 'project', home, user, privacy = null } = {}) {
  const clean = guard(privacy);
  return notes.map((note) => ({
    kind: 'note',
    agent: 'madre',
    mode: 1,
    sequence: note.throughSequence,
    at: note.created,
    messages: [
      { role: 'system', content: `You are @madre, the memory of the MADRE room of the project "${project}". Answer only from what the room decided and recorded.` },
      { role: 'user', content: `What does the room remember about this? Kind: ${note.kind}. Topic: ${clean(redact(note.text, { home, user })).split(/[.;:]/)[0].slice(0, 80)}` },
      { role: 'assistant', content: `${clean(redact(note.text, { home, user }))} [#${note.fromSequence}${note.throughSequence !== note.fromSequence ? `–#${note.throughSequence}` : ''}]` },
    ],
  }));
}

// Deterministic split: the sequence decides, so re-exports keep lines on the same side.
export function split(pairs, { validEvery = 10 } = {}) {
  const train = [];
  const valid = [];
  for (const pair of pairs) (pair.sequence % validEvery === 0 ? valid : train).push(pair);
  if (!valid.length && train.length > 1) valid.push(train.pop());
  return { train, valid };
}

export async function exportDataset({ events, notes = [], dir, project = 'project', home, user, privacy = null }) {
  const pairs = [...pairsFromEvents(events, { project, home, user, privacy }), ...pairsFromNotes(notes, { project, home, user, privacy })].sort((a, b) => a.sequence - b.sequence);
  const { train, valid } = split(pairs);
  await mkdir(dir, { recursive: true });
  const line = (pair) => JSON.stringify({ messages: pair.messages });
  await writeFile(join(dir, 'train.jsonl'), train.map(line).join('\n') + (train.length ? '\n' : ''));
  await writeFile(join(dir, 'valid.jsonl'), valid.map(line).join('\n') + (valid.length ? '\n' : ''));
  const byAgent = {};
  for (const pair of pairs) byAgent[pair.agent] = (byAgent[pair.agent] ?? 0) + 1;
  const manifest = { project, exportedAt: new Date().toISOString(), pairs: pairs.length, turns: pairs.filter((p) => p.kind === 'turn').length, notes: pairs.filter((p) => p.kind === 'note').length, train: train.length, valid: valid.length, byAgent, files: ['train.jsonl', 'valid.jsonl'], format: 'chat · {"messages":[{role,content}]} · mlx-lm / llama-factory / axolotl' };
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { dir, ...manifest };
}
