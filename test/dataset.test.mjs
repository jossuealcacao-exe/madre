import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pairsFromEvents, pairsFromNotes, preferencesFromAberrations, split, exportDataset, readiness, ratingsFrom } from '../src/dataset.mjs';
import { createPulseServer } from '../src/server.mjs';

const ev = (sequence, payload, extra = {}) => ({ sequence, type: 'message.created', timestamp: `2026-09-18T00:00:${String(sequence).padStart(2, '0')}Z`, payload, ...extra });

test('dataset: user/assistant pairs by parent, redacted, without ghosts, delegations or one-liners; notes become recall pairs; the split is deterministic', async () => {
  const events = [
    ev(1, { messageId: 'u1', role: 'user', sender: 'you', target: 'codex', text: 'Where is the router? my key is sk-abcdefghijklmnopqrstuvwxyz', mode: 1 }),
    ev(2, { messageId: 'a1', parentMessageId: 'u1', role: 'assistant', sender: 'codex', target: 'you', text: 'The router lives in /Users/dallas/pulse/src/router.mjs and mounts /api first, before the static files.', mode: 1 }),
    ev(3, { messageId: 'u2', role: 'user', sender: 'you', target: 'claude', text: 'thanks', mode: 1 }),
    ev(4, { messageId: 'a2', parentMessageId: 'u2', role: 'assistant', sender: 'claude', target: 'you', text: 'ok', mode: 1 }),
    ev(5, { messageId: 'a3', parentMessageId: 'a1', role: 'assistant', sender: 'gemini', target: 'codex', text: 'A delegated step that should not count as an answer to the human, long enough to pass.', status: 'delegated' }),
    { sequence: null, ghost: true, type: 'message.created', payload: { messageId: 'g', parentMessageId: 'u1', role: 'assistant', sender: 'codex', text: 'ghost words that must never train anything at all, ever.' } },
    ev(10, { messageId: 'u3', role: 'user', sender: 'you', target: 'codex', text: 'And the tests?', mode: 2 }),
    ev(11, { messageId: 'a4', parentMessageId: 'u3', role: 'assistant', sender: 'codex', target: 'you', text: 'Tests live in test/pulse.test.mjs and run with node --test on every push.', originalText: undefined, mode: 2 }),
    // A delegated step and its answer: a real instruction with a real answer, kept as a pair of its own kind.
    ev(12, { messageId: 's1', role: 'assistant', sender: 'codex', target: 'gemini', text: 'Check whether the router handles HEAD requests and say where.', status: 'delegated', planId: 'p1', step: 1, totalSteps: 2 }),
    ev(13, { messageId: 'a5', parentMessageId: 's1', role: 'assistant', sender: 'gemini', target: 'codex', text: 'It does: HEAD falls through the same handler as GET in src/router.mjs, line 40, and sends no body.', planId: 'p1' }),
    ev(14, { messageId: 's2', role: 'assistant', sender: 'codex', target: 'codex', text: 'Close the plan with a summary.', status: 'delegated', planId: 'p1', step: 2, totalSteps: 2 }),
    ev(15, { messageId: 'a6', parentMessageId: 's2', role: 'assistant', sender: 'codex', target: 'codex', text: 'Summary: HEAD is handled with GET and the tests cover it; nothing else to do here.', planId: 'p1' }),
    // Never teachers: @madre's own answers, MADRE's canned replies, and what the human marked bad.
    ev(16, { messageId: 'u4', role: 'user', sender: 'you', target: 'madre', text: 'What did we decide about HEAD?', mode: 1 }),
    ev(17, { messageId: 'a7', parentMessageId: 'u4', role: 'assistant', sender: 'madre', target: 'you', text: 'The room decided HEAD is served by the GET handler [#13], nothing more was said.', mode: 1 }),
    ev(18, { messageId: 'u5', role: 'user', sender: 'you', target: 'claude', text: 'Convene the crew about caching', mode: 1 }),
    ev(19, { messageId: 'a8', parentMessageId: 'u5', role: 'assistant', sender: 'claude', target: 'you', text: 'I only answer from the room memory: I do not convene, delegate, run or write. Ask a CLI agent.', synthetic: 'declined', mode: 1 }),
    ev(20, { messageId: 'u6', role: 'user', sender: 'you', target: 'claude', text: 'Which paper says 15% of agents hallucinate?', mode: 1 }),
    ev(21, { messageId: 'a9', parentMessageId: 'u6', role: 'assistant', sender: 'claude', target: 'you', text: 'Liu et al. 2024 report a 15% hallucination rate in multi-agent rooms, page 7, table 3.', mode: 1 }),
    { sequence: 22, type: 'message.rated', timestamp: '2026-09-19T00:00:00Z', payload: { messageId: 'a9', rating: 'bad', by: 'you' } },
    { sequence: 23, type: 'message.rated', timestamp: '2026-09-19T00:00:00Z', payload: { messageId: 'a4', rating: 'good', by: 'you' } },
  ];
  const pairs = pairsFromEvents(events, { project: 'pulse', home: '/Users/dallas', user: 'dallas' });
  assert.deepEqual(pairs.map((pair) => [pair.kind, pair.agent, pair.askedBy, pair.rating]), [['turn', 'codex', 'you', null], ['turn', 'codex', 'you', 'good'], ['delegated', 'gemini', 'codex', null]], 'human turns and delegated steps in; the closing turn, @madre, canned and bad-rated replies out');
  assert.match(pairs[2].messages[1].content, /^Check whether the router handles HEAD/);
  assert.deepEqual(readiness(events, [{ kind: 'fact' }]), { pairs: 4, turns: 2, delegated: 1, notes: 1, aberrations: 0, good: 1, bad: 1, target: 300, ready: false });
  assert.equal(ratingsFrom([...events, { sequence: 24, type: 'message.rated', payload: { messageId: 'a9', rating: 'none' } }]).has('a9'), false, 'a rating can be cleared');
  assert.equal(pairs.filter((pair) => pair.kind === 'turn').length, 2);
  assert.equal(pairs[0].agent, 'codex');
  assert.match(pairs[0].messages[0].content, /You are @codex in the MADRE room of the project "pulse"/);
  assert.match(pairs[0].messages[1].content, /\[key\]/);
  assert.ok(!pairs[0].messages[2].content.includes('/Users/dallas'));
  assert.match(pairs[0].messages[2].content, /~\/pulse\/src\/router\.mjs/);
  assert.equal(pairs[1].mode, 2);
  const notes = pairsFromNotes([{ kind: 'decision', text: 'The webhook verifies the Stripe signature before parsing.', fromSequence: 1, throughSequence: 4, created: '2026-09-18T00:00:00Z' }], { project: 'pulse' });
  assert.equal(notes[0].kind, 'note');
  assert.match(notes[0].messages[1].content, /^What does the room remember about this\? Kind: decision\. Topic: The webhook verifies the Stripe signature before parsing/);
  assert.match(notes[0].messages[2].content, /\[#1–#4\]$/);
  const { train, valid } = split([...pairs, ...notes]);
  assert.equal(valid.length, 1, 'one of the four lands in valid');
  assert.equal(train.length, 3);

  const dir = await mkdtemp(join(tmpdir(), 'pulse-dataset-'));
  try {
    const result = await exportDataset({ events, notes: [{ kind: 'decision', text: 'Note.', fromSequence: 1, throughSequence: 1, created: '2026-09-18T00:00:00Z' }], dir, project: 'pulse', home: '/Users/dallas' });
    assert.deepEqual({ pairs: result.pairs, turns: result.turns, delegated: result.delegated, notes: result.notes }, { pairs: 4, turns: 2, delegated: 1, notes: 1 });
    const trainLines = (await readFile(join(dir, 'train.jsonl'), 'utf8')).trim().split('\n');
    assert.equal(trainLines.length, result.train);
    assert.deepEqual(Object.keys(JSON.parse(trainLines[0])), ['messages']);
    const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.byAgent.codex, 2);
    assert.match(manifest.format, /mlx-lm/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('dataset: the server exports next to the ledger, records it, and @madre prefers a model named after the project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-dataset-server-'));
  const project = join(root, 'Debate Dios'); await mkdir(project);
  const probe = { running: true, host: 'http://o', models: [{ name: 'qwen2.5:3b' }, { name: 'madre-debate-dios:latest' }], embedModel: null, chatModel: 'qwen2.5:3b' };
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'The answer is long enough to be a training pair for the project, indeed.', usage: null }) }, ollamaProbe: async () => probe, reportFetch: async () => ({ ok: true, json: async () => ({}) }) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const before = await fetch(`${base}/api/dataset`).then((response) => response.json());
    assert.equal(before.dataset, null);
    assert.equal(before.trained, 'madre-debate-dios:latest', 'the trained model is spotted');
    const madre = (await fetch(`${base}/api/state`).then((response) => response.json())).agents.find((agent) => agent.id === 'madre');
    assert.equal(madre.version, 'madre-debate-dios:latest', '@madre runs the trained model');
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'question one for the dataset', target: 'codex' }) });
    for (let attempt = 0; attempt < 80 && !(await store.readAll()).some((event) => event.type === 'agent.completed'); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 25));
    const exported = await fetch(`${base}/api/dataset`, { method: 'POST' }).then((response) => response.json());
    assert.equal(exported.dataset.turns, 1);
    assert.equal(exported.dataset.project, 'Debate Dios');
    assert.ok(exported.dir.endsWith('/dataset'));
    const train = await readFile(join(exported.dir, exported.dataset.train ? 'train.jsonl' : 'valid.jsonl'), 'utf8');
    assert.match(train, /question one for the dataset/);
    assert.ok((await store.readAll()).some((event) => event.type === 'dataset.exported' && event.payload.pairs === 1));
    const again = await fetch(`${base}/api/dataset`).then((response) => response.json());
    assert.equal(again.dataset.pairs, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('dataset: what the room got wrong trains against itself, and never as something to recall', async () => {
  const notes = [
    { id: 1, kind: 'fact', text: 'The webhook verifies the Stripe signature after parsing the body.', fromSequence: 2, throughSequence: 4, created: '2026-09-01T10:00:00.000Z', refutedBy: 9 },
    { id: 2, kind: 'decision', text: 'The room listens on port 4317 by default.', fromSequence: 5, throughSequence: 5, created: '2026-09-01T11:00:00.000Z', refutedBy: null },
    { id: 9, kind: 'aberration', text: 'The webhook verifies the Stripe signature after parsing the body.', correction: 'It verifies the signature before parsing anything.', contradicts: 1, detector: 'eyecat', confidence: 0.82, fromSequence: 2, throughSequence: 4, created: '2026-09-02T09:00:00.000Z', refutedBy: null },
    { id: 10, kind: 'aberration', text: 'The project ships a Rust core.', correction: null, contradicts: null, detector: 'you', confidence: null, fromSequence: 7, throughSequence: 7, created: '2026-09-02T10:00:00.000Z', refutedBy: null },
  ];

  // Nothing false and nothing refuted becomes something to recall. Only the decision survives.
  const recall = pairsFromNotes(notes, { project: 'pulse' });
  assert.equal(recall.length, 1, 'a false or refuted note reached the recall corpus');
  assert.match(recall[0].messages[2].content, /port 4317/);
  for (const pair of recall) {
    assert.ok(!/Stripe signature after parsing/.test(JSON.stringify(pair)), 'the hallucination is being taught as memory');
    assert.ok(!/Rust core/.test(JSON.stringify(pair)));
  }

  // It trains the other way instead: same ask, the false claim to avoid, the true one to prefer.
  const preferences = preferencesFromAberrations(notes, { project: 'pulse' });
  assert.equal(preferences.length, 1, 'an aberration with nothing true to put in its place is not a pair');
  assert.equal(preferences[0].rejected, 'The webhook verifies the Stripe signature after parsing the body.');
  assert.equal(preferences[0].chosen, 'It verifies the signature before parsing anything.');
  assert.match(preferences[0].prompt, /^Is this true of the project "pulse"\?/);

  // A correction that only restates the claim is not a pair: there is nothing to prefer, and a
  // model asked to choose between two near-identical answers learns from the noise between them.
  // A weak archivist writes these, so they are caught before they ship.
  assert.deepEqual(preferencesFromAberrations([
    { id: 5, kind: 'aberration', text: 'The lab starts its test server on port 7100 by default, not another.', correction: 'The lab starts its test server on port 7100 by default.', contradicts: null, fromSequence: 1, throughSequence: 1, created: '2026-09-02T10:00:00.000Z' },
  ], { project: 'pulse' }), []);

  // An aberration that only refutes a stored note takes its truth from the note it points at.
  const fromNote = preferencesFromAberrations([
    { id: 3, kind: 'fact', text: 'Checkpoints live under refs/madre/checkpoints.', fromSequence: 1, throughSequence: 1, created: '2026-09-01T10:00:00.000Z' },
    { id: 4, kind: 'aberration', text: 'Checkpoints live in a hidden .madre folder.', correction: null, contradicts: 3, fromSequence: 1, throughSequence: 1, created: '2026-09-02T10:00:00.000Z' },
  ], { project: 'pulse' });
  assert.equal(fromNote.length, 1);
  assert.match(fromNote[0].chosen, /refs\/madre\/checkpoints/);

  // Readiness counts what the model will learn to say, so aberrations are counted apart.
  const state = readiness([], notes);
  assert.equal(state.notes, 1, 'a refuted or false note was counted as ready training');
  assert.equal(state.aberrations, 2);

  // And the export keeps them in a file of their own, so nothing reading the chat files trips
  // over a shape it does not expect.
  const dir = await mkdtemp(join(tmpdir(), 'pulse-aberration-'));
  try {
    const result = await exportDataset({ events: [], notes, dir, project: 'pulse' });
    assert.deepEqual(result.files, ['train.jsonl', 'valid.jsonl', 'preferences.jsonl']);
    assert.equal(result.aberrations, 1);
    const written = await readFile(join(dir, 'preferences.jsonl'), 'utf8');
    assert.deepEqual(Object.keys(JSON.parse(written.trim())).sort(), ['chosen', 'prompt', 'rejected']);
    for (const file of ['train.jsonl', 'valid.jsonl']) {
      const body = await readFile(join(dir, file), 'utf8');
      assert.ok(!/after parsing the body|Rust core/.test(body), `${file} carries a hallucination`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
