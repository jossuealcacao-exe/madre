// The dataset behind MADRE AI: every exchange the room kept (never GHOST),
// redacted, as chat pairs a small model can learn from, plus the distilled
// notes. Written next to the room's ledger in the format mlx-lm and most
// fine-tuners read: one {"messages": [...]} per line, split train / valid.
// Export is the first step of roadmap 2c; training runs outside MADRE, on the
// human's machine, from docs/training/.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redact } from './sentinel-errors.mjs';
import { ABERRATION } from './memory.mjs';

const MIN_ANSWER_CHARS = 40;

function system(project, agent) {
  return `You are @${agent} in the MADRE room of the project "${project}". Answer the human directly and concisely; distinguish facts from inference; name files, agents and numbers exactly.`;
}

// Pairs a question with the reply that answered it (parentMessageId). The question is the
// human's message, or an orchestrator's delegated step: both are real instructions with a
// real answer. What never trains MADRE: @madre's own answers (the student is not the teacher),
// MADRE's canned replies, replies the human rated bad, ghosts, one-liners.
const guard = (privacy) => (text) => (privacy ? privacy.redact(text).text : text);
export const STUDENT = 'madre';
export const DATASET_TARGET = 300;

export function ratingsFrom(events) {
  const ratings = new Map();
  for (const event of events) {
    if (event.type !== 'message.rated' || !event.payload?.messageId) continue;
    if (event.payload.rating === 'good' || event.payload.rating === 'bad') ratings.set(event.payload.messageId, event.payload.rating);
    else ratings.delete(event.payload.messageId);
  }
  return ratings;
}

export function pairsFromEvents(events, { project = 'project', home, user, privacy = null } = {}) {
  const clean = guard(privacy);
  const asks = new Map();
  const ratings = ratingsFrom(events);
  const pairs = [];
  for (const event of events) {
    if (event.type !== 'message.created' || event.ghost || !Number.isInteger(event.sequence)) continue;
    const p = event.payload ?? {};
    if (typeof p.text !== 'string' || !p.text.trim()) continue;
    if (p.role === 'user') { asks.set(p.messageId, { text: p.originalText ?? p.text, mode: p.mode ?? 1, from: 'you' }); continue; }
    if (p.role !== 'assistant') continue;
    if (p.status === 'delegated') {
      // An orchestrator's step is a question for the agent it names; its closing turn is not.
      if (p.target && p.target !== p.sender) asks.set(p.messageId, { text: p.originalText ?? p.text, mode: p.mode ?? 1, from: p.sender });
      continue;
    }
    if (p.sender === STUDENT || p.synthetic) continue;
    if (ratings.get(p.messageId) === 'bad') continue;
    const ask = asks.get(p.parentMessageId);
    if (!ask) continue;
    const answer = (p.originalText ?? p.text).trim();
    if (answer.length < MIN_ANSWER_CHARS) continue;
    pairs.push({
      kind: ask.from === 'you' ? 'turn' : 'delegated',
      agent: p.sender,
      askedBy: ask.from,
      rating: ratings.get(p.messageId) ?? null,
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

// How far the corpus is from a LoRA worth running, without writing anything.
export function readiness(events, notes = [], { target = DATASET_TARGET } = {}) {
  const pairs = pairsFromEvents(events);
  const ratings = ratingsFrom(events);
  let bad = 0;
  for (const rating of ratings.values()) if (rating === 'bad') bad += 1;
  const turns = pairs.filter((pair) => pair.kind === 'turn').length;
  const delegated = pairs.length - turns;
  const good = pairs.filter((pair) => pair.rating === 'good').length;
  // Aberrations are counted apart: they never become one of the pairs the model learns to
  // answer with, so counting them toward readiness would say the room is further along than it is.
  const standing = notes.filter((note) => note.kind !== ABERRATION && !note.refutedBy);
  const aberrations = notes.filter((note) => note.kind === ABERRATION).length;
  const total = pairs.length + standing.length;
  return { pairs: total, turns, delegated, notes: standing.length, aberrations, good, bad, target, ready: total >= target };
}

// Distilled notes become recall pairs: "what does the room remember about …" → the note.
// Two kinds of note never come through here. An aberration is a claim the room decided is false,
// and teaching a model to recall it would be teaching it the hallucination. A note that has been
// refuted is no longer what the room believes. Both are still exported, as preference pairs
// below, where being wrong is the point.
export function pairsFromNotes(notes, { project = 'project', home, user, privacy = null } = {}) {
  const clean = guard(privacy);
  return notes.filter((note) => note.kind !== ABERRATION && !note.refutedBy).map((note) => ({
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

// What the room got wrong, in the shape that trains against it. Each aberration becomes one
// preference pair: the same ask, the false claim as what to avoid, the correction as what to say
// instead. A negative on its own teaches a model very little; a pair tells it which of two
// answers to prefer, which is what DPO and ORPO are built to read.
export function preferencesFromAberrations(notes, { project = 'project', home, user, privacy = null } = {}) {
  const clean = guard(privacy);
  const say = (text) => clean(redact(String(text ?? ''), { home, user }));
  const byId = new Map(notes.map((note) => [note.id, note]));
  const pairs = [];
  for (const note of notes) {
    if (note.kind !== ABERRATION) continue;
    // Without something true to put in its place there is nothing to prefer, so it is left out.
    const truth = note.correction || (note.contradicts && byId.get(note.contradicts)?.text) || null;
    if (!truth) continue;
    const claim = say(note.text);
    const better = say(truth);
    if (!claim || !better || claim === better) continue;
    pairs.push({
      kind: 'aberration',
      sequence: note.throughSequence,
      at: note.created,
      detector: note.detector ?? null,
      prompt: `Is this true of the project "${project}"? ${claim}`,
      rejected: claim,
      chosen: better,
    });
  }
  return pairs;
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
  const preferences = preferencesFromAberrations(notes, { project, home, user, privacy });
  const { train, valid } = split(pairs);
  await mkdir(dir, { recursive: true });
  const line = (pair) => JSON.stringify({ messages: pair.messages });
  await writeFile(join(dir, 'train.jsonl'), train.map(line).join('\n') + (train.length ? '\n' : ''));
  await writeFile(join(dir, 'valid.jsonl'), valid.map(line).join('\n') + (valid.length ? '\n' : ''));
  // Kept in a file of its own: it is a different shape and a different kind of training, and
  // nothing that reads the chat files should ever pick it up by accident.
  await writeFile(join(dir, 'preferences.jsonl'), preferences.map((pair) => JSON.stringify({ prompt: pair.prompt, chosen: pair.chosen, rejected: pair.rejected })).join('\n') + (preferences.length ? '\n' : ''));
  const byAgent = {};
  for (const pair of pairs) byAgent[pair.agent] = (byAgent[pair.agent] ?? 0) + 1;
  const manifest = { project, exportedAt: new Date().toISOString(), pairs: pairs.length, turns: pairs.filter((p) => p.kind === 'turn').length, delegated: pairs.filter((p) => p.kind === 'delegated').length, good: pairs.filter((p) => p.rating === 'good').length, notes: pairs.filter((p) => p.kind === 'note').length, aberrations: preferences.length, train: train.length, valid: valid.length, byAgent, files: ['train.jsonl', 'valid.jsonl', 'preferences.jsonl'], format: 'chat · {"messages":[{role,content}]} · mlx-lm / llama-factory / axolotl', preferenceFormat: 'preference · {"prompt","chosen","rejected"} · DPO / ORPO' };
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { dir, ...manifest };
}
