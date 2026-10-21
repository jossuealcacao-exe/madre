import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { probeOllama, ollamaEmbedder, ollamaGenerate, ollamaInvoker, pullModel, ollamaHost } from '../src/ollama.mjs';
import { createEmbedder } from '../src/embeddings.mjs';
import { distillPrompt, parseDistillation, pickDistiller, OLLAMA_ARCHIVIST } from '../src/distiller.mjs';
import { listExtensions } from '../src/extensions.mjs';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { Room } from '../src/room.mjs';
import { createPulseServer } from '../src/server.mjs';
import { hardwareOnce } from '../src/modules/local-models.mjs';
import { chatLedger } from '../src/chats.mjs';

const tags = { models: [
  { name: 'nomic-embed-text:latest', size: 274302450, details: { family: 'nomic-bert' } },
  { name: 'qwen2.5:1.5b', size: 986000000, details: { family: 'qwen2' } },
  { name: 'llama3.2:3b', size: 2000000000, details: { family: 'llama' } },
] };
const fakeOllama = (calls = []) => async (url, init = {}) => {
  calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
  if (url.endsWith('/api/tags')) return { ok: true, json: async () => tags };
  if (url.endsWith('/api/embed')) { const { input } = JSON.parse(init.body); return { ok: true, json: async () => ({ embeddings: input.map((text) => [text.length % 7, 1]) }) }; }
  if (url.endsWith('/api/chat')) return { ok: true, json: async () => ({ message: { role: 'assistant', content: '{"memories":[{"kind":"decision","text":"We embed locally with Ollama.","sources":[1]}]}' }, prompt_eval_count: 120, eval_count: 30 }) };
  if (url.endsWith('/api/pull')) {
    const lines = ['{"status":"pulling manifest"}', '{"status":"pulling abc","total":100,"completed":50}', '{"status":"pulling abc","total":100,"completed":100}', '{"status":"success"}'];
    let index = 0;
    return { ok: true, body: { getReader: () => ({ read: async () => (index < lines.length ? { value: new TextEncoder().encode(`${lines[index++]}\n`), done: false } : { done: true }) }) } };
  }
  return { ok: false, status: 404, text: async () => 'nope' };
};

test('ollama: probe finds the server and picks embedding and chat models, preferring the env choice; absent server means not running', async () => {
  assert.equal(ollamaHost({ PULSE_OLLAMA_HOST: 'localhost:11434' }), 'http://localhost:11434');
  const probe = await probeOllama({ host: 'http://o', fetchImpl: fakeOllama(), env: {} });
  assert.equal(probe.running, true);
  assert.equal(probe.embedModel, 'nomic-embed-text:latest');
  assert.equal(probe.chatModel, 'llama3.2:3b', 'the better chat model by preference');
  assert.equal((await probeOllama({ host: 'http://o', fetchImpl: fakeOllama(), env: { PULSE_OLLAMA_MODEL: 'qwen2.5:1.5b' } })).chatModel, 'qwen2.5:1.5b');
  const down = await probeOllama({ host: 'http://o', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
  assert.equal(down.running, false);
  assert.match(down.error, /ECONNREFUSED/);
});

test('ollama: the embedder prefixes nomic tasks and returns Float32 vectors; generate maps usage; pull streams progress', async () => {
  const calls = [];
  const embedder = ollamaEmbedder({ host: 'http://o', model: 'nomic-embed-text:latest', fetchImpl: fakeOllama(calls) });
  assert.equal(embedder.model, 'ollama:nomic-embed-text:latest');
  const vectors = await embedder.embed(['hola', 'adiós'], { query: true });
  assert.equal(vectors.length, 2);
  assert.ok(vectors[0] instanceof Float32Array);
  assert.equal(calls[0].body.input[0], 'search_query: hola');
  await embedder.embed(['doc']);
  assert.equal(calls[1].body.input[0], 'search_document: doc');
  const plain = ollamaEmbedder({ host: 'http://o', model: 'mxbai-embed-large', fetchImpl: fakeOllama(calls) });
  await plain.embed(['x']);
  assert.equal(calls[2].body.input[0], 'x');

  const answer = await ollamaGenerate({ host: 'http://o', model: 'qwen2.5:1.5b', prompt: 'p', json: true, fetchImpl: fakeOllama(calls) });
  assert.match(answer.text, /"memories"/);
  assert.deepEqual({ ...answer.usage, model: undefined }, { inputTokens: 120, outputTokens: 30, cachedInputTokens: 0, reasoningTokens: 0, totalTokens: 150, costUsd: 0, source: 'ollama', local: true, model: undefined });
  assert.equal(calls.at(-1).body.format, 'json');
  assert.equal(calls.at(-1).body.stream, false);
  const invoke = ollamaInvoker({ host: 'http://o', model: 'qwen2.5:1.5b', fetchImpl: fakeOllama(calls) });
  assert.equal((await invoke({ prompt: 'q' })).usage.source, 'ollama');
  assert.equal(ollamaInvoker({ model: null }), null);

  const progress = [];
  await pullModel({ host: 'http://o', model: 'qwen2.5:3b', fetchImpl: fakeOllama(calls), onLine: (line) => progress.push(line) });
  assert.deepEqual(progress, ['pulling manifest', 'pulling abc · 50%', 'pulling abc · 100%', 'success']);
});

test('ollama: createEmbedder prefers a running Ollama, honours PULSE_EMBED_PROVIDER, falls back to Gemini', () => {
  const probe = { running: true, host: 'http://o', embedModel: 'nomic-embed-text:latest', chatModel: 'qwen2.5:1.5b' };
  const make = ({ model }) => ({ model: `ollama:${model}`, embed: async () => [] });
  assert.equal(createEmbedder({ key: 'k', env: {}, ollama: probe, ollamaEmbedder: make }).model, 'ollama:nomic-embed-text:latest');
  assert.match(createEmbedder({ key: 'k', env: { PULSE_EMBED_PROVIDER: 'gemini' }, ollama: probe, ollamaEmbedder: make }).model, /^gemini-embedding-001/);
  assert.equal(createEmbedder({ key: 'k', env: { PULSE_EMBED_PROVIDER: 'ollama' }, ollama: { running: false }, ollamaEmbedder: make }), null);
  assert.match(createEmbedder({ key: 'k', env: {}, ollama: { running: false }, ollamaEmbedder: make }).model, /^gemini/);
  assert.equal(createEmbedder({ key: null, env: {}, ollama: { running: true, embedModel: null }, ollamaEmbedder: make }), null);
});

test('ollama: the distiller asks local models for a JSON object and reads it; Ollama is first in line and sits out like anyone', () => {
  assert.match(distillPrompt({ entries: [], json: true }), /Output one JSON object and nothing else: \{"memories":\[\.\.\.\]\}/);
  assert.match(distillPrompt({ entries: [] }), /Output only JSON lines/);
  const parsed = parseDistillation('{"memories":[{"kind":"fact","text":"A","sources":[2]},{"kind":"question","text":"B?","sources":[9]}]}', { fromSequence: 1, throughSequence: 5 });
  assert.deepEqual(parsed, [{ kind: 'fact', text: 'A', sources: [2] }, { kind: 'question', text: 'B?', sources: [] }]);
  assert.deepEqual(parseDistillation('{"memories":[]}'), []);
  const roster = [OLLAMA_ARCHIVIST, { id: 'gemini', detected: true, ready: true, adapter: 'gemini-readonly' }];
  assert.equal(pickDistiller(roster, { invokers: { ollama: () => {}, 'gemini-readonly': () => {} } }).id, 'ollama');
  assert.equal(pickDistiller(roster, { invokers: { ollama: () => {}, 'gemini-readonly': () => {} }, benched: new Set(['ollama']) }).id, 'gemini');
  assert.equal(pickDistiller(roster, { invokers: { 'gemini-readonly': () => {} } }).id, 'gemini', 'no invoker, no Ollama');
});

test('ollama: the room distils with the local archivist first, charges no budget and reports local tokens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ollama-room-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const agents = [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' }, { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const seen = [];
    const invokers = {
      'codex-readonly': async () => ({ text: 'ok', usage: { totalTokens: 10 } }),
      'gemini-readonly': async () => { throw new Error('should not be the archivist'); },
      ollama: async ({ prompt, json }) => { seen.push({ prompt, json }); return { text: '{"memories":[{"kind":"decision","text":"Memory embeds locally with Ollama.","sources":[1]}]}', usage: { totalTokens: 150, source: 'ollama', local: true, model: 'qwen2.5:1.5b' } }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers, memory, distill: { every: 2, idleMs: 60_000 } });
    await room.send({ text: 'We decided to embed locally with Ollama.', target: 'codex' });
    await room.settleDistillation();
    assert.equal(seen.length, 1);
    assert.equal(seen[0].json, true);
    assert.match(seen[0].prompt, /Output one JSON object/);
    const events = await store.readAll();
    const report = events.find((event) => event.type === 'memory.distilled');
    assert.equal(report.payload.agent, 'ollama');
    assert.equal(report.payload.local, true);
    assert.equal(report.payload.model, 'qwen2.5:1.5b');
    assert.equal(report.payload.tokens, 150);
    assert.equal(report.payload.added, 1);
    assert.ok(!events.some((event) => event.type === 'usage.recorded' && event.payload.agent === 'ollama'), 'local tokens are not charged');
    room.setInvoker('ollama', null);
    await room.shutdown();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('ollama: the module lists its state, the server wires it live, and PULL streams as an install', async () => {
  const probe = { running: true, host: 'http://o', models: tags.models.map((model) => ({ name: model.name, size: model.size, family: model.details.family })), embedModel: 'nomic-embed-text:latest', chatModel: 'llama3.2:3b' };
  const listed = await listExtensions({ projectRoot: '/tmp', config: {}, ollama: probe });
  const module = listed.find((item) => item.id === 'ollama');
  assert.equal(module.status.installed, true);
  assert.match(module.status.detail, /on · smart search · nomic-embed-text:latest · memory summarizer · llama3\.2:3b/);
  const off = (await listExtensions({ projectRoot: '/tmp', config: { modules: { ollama: { enabled: false } } }, ollama: probe })).find((item) => item.id === 'ollama');
  assert.equal(off.status.installed, false);
  assert.match(off.status.detail, /^off · 3 models available/);
  const down = (await listExtensions({ projectRoot: '/tmp', config: {}, ollama: { running: false, models: [] } })).find((item) => item.id === 'ollama');
  assert.equal(down.preflight.ok, false);

  const root = await mkdtemp(join(tmpdir(), 'pulse-ollama-server-'));
  const project = join(root, 'p'); await mkdir(project);
  const calls = [];
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, ollamaProbe: async () => probe, reportFetch: fakeOllama(calls) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const status = await fetch(`${base}/api/ollama`).then((response) => response.json());
    assert.equal(status.ollama.embeddings, true);
    assert.equal(status.ollama.archivist, true);
    assert.equal(status.recommended.embed, 'nomic-embed-text');
    const ext = await fetch(`${base}/api/extensions`).then((response) => response.json());
    assert.equal(ext.extensions.find((item) => item.id === 'ollama').recommended.chat, (await hardwareOnce()).recommended.run?.ollama ?? 'qwen2.5:3b');
    const settings = await fetch(`${base}/api/ollama/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ archivist: false }) }).then((response) => response.json());
    assert.equal(settings.ollama.archivist, false);
    assert.equal(settings.ollama.embeddings, true);
    assert.equal((await fetch(`${base}/api/ollama/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'bad name!' }) })).status, 400);
    const pull = await fetch(`${base}/api/ollama/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'qwen2.5:3b' }) });
    assert.equal(pull.status, 202);
    let finished = null;
    for (let attempt = 0; attempt < 80 && !finished; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 25)); finished = (await store.readAll()).find((event) => event.type === 'extension.install.finished' && event.payload.id === 'ollama'); }
    assert.ok(finished, 'the pull finished');
    assert.equal(finished.payload.ok, true);
    assert.match(finished.payload.detail, /pulled qwen2\.5:3b/);
    const output = (await store.readAll()).filter((event) => event.type === 'extension.install.output' && event.payload.id === 'ollama').flatMap((event) => event.payload.lines);
    assert.ok(output.includes('pulling abc · 50%'));
    const toggled = await fetch(`${base}/api/extensions/ollama/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((response) => response.json());
    assert.equal(toggled.enabled, false);
    assert.equal(toggled.ollama.embeddings, false, 'disabled means no local roles');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('memory settings: MU/TH/UR saves archivist, allow-list, cadence, embeddings and recall share; the room applies them live', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-settings-'));
  const project = join(root, 'p'); await mkdir(project);
  const probe = { running: true, host: 'http://o', models: [{ name: 'nomic-embed-text:latest', family: 'nomic-bert' }, { name: 'qwen2.5:3b', family: 'qwen2' }], embedModel: 'nomic-embed-text:latest', chatModel: 'qwen2.5:3b' };
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }, { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }), 'gemini-readonly': async () => ({ text: 'ok', usage: null }) }, ollamaProbe: async () => probe, reportFetch: fakeOllama() });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const before = (await fetch(`${base}/api/settings`).then((response) => response.json())).settings.memory;
    assert.equal(before.archivist, 'auto');
    assert.equal(before.every, 10);
    assert.deepEqual(before.candidates.map((c) => c.id), ['ollama', 'codex', 'gemini']);
    assert.equal(before.embedder, 'ollama:nomic-embed-text:latest');
    const saved = await fetch(`${base}/api/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ memory: { archivist: 'gemini', archivists: ['gemini', 'codex'], every: 4, idleMinutes: 3, embedProvider: 'off', recallShare: 0.45 } }) }).then((response) => response.json());
    assert.equal(saved.settings.memory.archivist, 'gemini');
    assert.deepEqual(saved.settings.memory.archivists, ['gemini', 'codex']);
    assert.equal(saved.settings.memory.every, 4);
    assert.equal(saved.settings.memory.idleMinutes, 3);
    assert.equal(saved.settings.memory.recallShare, 0.45);
    assert.equal(saved.settings.memory.embedder, null, 'embeddings off applies live');
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    assert.deepEqual(config.memory, { archivist: 'gemini', archivists: ['gemini', 'codex'], every: 4, idleMinutes: 3, embedProvider: 'off', recallShare: 0.45, cascade: true });
    // Spreading activation is the human's to switch off, and the room stops carrying company live.
    const off = await fetch(`${base}/api/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ memory: { cascade: false } }) }).then((response) => response.json());
    assert.equal(off.settings.memory.cascade, false, 'the switch did not reach the room');
    assert.equal(JSON.parse(await readFile(join(root, 'config.json'), 'utf8')).memory.cascade, false);
    const back = await fetch(`${base}/api/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ memory: { embedProvider: 'auto', archivists: [] } }) }).then((response) => response.json());
    assert.equal(back.settings.memory.embedder, 'ollama:nomic-embed-text:latest', 'back to local embeddings');
    assert.equal(back.settings.memory.archivists, null, 'empty list means everyone');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('memory settings: an allow-list keeps Ollama out of the archivist chair when the human says so', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-allowlist-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const used = [];
    const invokers = {
      'codex-readonly': async ({ prompt }) => { if (/archivist/.test(prompt)) used.push('codex'); return { text: 'NONE', usage: null }; },
      ollama: async () => { used.push('ollama'); return { text: '{"memories":[]}', usage: { totalTokens: 1, local: true } }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers, memory, distill: { every: 2, idleMs: 60_000, allowed: ['codex'] } });
    await room.send({ text: 'hello', target: 'codex' });
    await room.settleDistillation();
    assert.deepEqual(used, ['codex'], 'Ollama exists but is not allowed');
    room.configureDistill({ allowed: null });
    assert.equal(room.distillSettings().allowed, null);
    assert.equal(room.distillSettings().ollama, true);
    await room.shutdown();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('ollama: every conversation distills locally, the one switched to and the one written to beside', async () => {
  const probe = { running: true, host: 'http://o', models: tags.models.map((model) => ({ name: model.name, size: model.size, family: model.details.family })), embedModel: 'nomic-embed-text:latest', chatModel: 'llama3.2:3b' };
  const root = await mkdtemp(join(tmpdir(), 'pulse-ollama-chats-'));
  const project = join(root, 'p'); await mkdir(project);
  // Gemini is the next cheapest archivist after Ollama: the one a room without the local
  // invoker used to fall to, and the one that must never be called here.
  const roster = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
    { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' },
  ];
  const paid = [];
  const invokers = {
    'codex-readonly': async () => ({ text: 'ok, noted', usage: null }),
    'gemini-readonly': async ({ prompt }) => { paid.push(prompt); return { text: '{"memories":[]}', usage: null }; },
  };
  const previous = process.env.PULSE_DISTILL_EVERY;
  process.env.PULSE_DISTILL_EVERY = '2';
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers, ollamaProbe: async () => probe, reportFetch: fakeOllama() });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((response) => response.json());
  // Each conversation keeps its own ledger; the room folder is the one directory under rooms/.
  const roomDir = async () => join(root, 'rooms', (await readdir(join(root, 'rooms')))[0]);
  const distilled = async (chat) => {
    const file = chatLedger(await roomDir(), chat);
    // Up to 10 s. What is tested is who distils, not how fast: alone this takes about half a second,
    // but the full suite runs files that start several real rooms at once, and 4 s fell short there.
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const lines = (await readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((line) => JSON.parse(line));
      const found = lines.filter((event) => event.type === 'memory.distilled');
      if (found.length) return found;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return [];
  };
  try {
    const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;
    // A new conversation, switched to: its room is built by mountChat.
    const made = await post('/api/chats', {});
    assert.ok(made.opened);
    assert.ok((await fetch(`${base}/api/settings`).then((response) => response.json())).settings.memory.candidates.some((one) => one.id === 'ollama'), 'the switched-to room has no local archivist');
    for (const text of ['We store amounts in cents.', 'Dates stay as YYYY-MM-DD text.']) await post('/api/messages', { text, target: 'codex' });
    const here = await distilled(made.opened);
    assert.ok(here.length, 'the new conversation never distilled');
    assert.ok(here.every((event) => event.payload.agent === 'ollama' && event.payload.local), `distilled by ${JSON.stringify(here.map((event) => event.payload.agent))}`);
    // The memory is the project's, one for every conversation: written to beside while the second
    // turn here was still running, the batch this room distilled took the lines beside too, and
    // its note went to this record (2026-10-21). So the one beside starts once this one is quiet
    // and distilled through its last answer.
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const lines = (await readFile(chatLedger(await roomDir(), made.opened), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));
      const last = lines.filter((event) => event.type === 'message.created').at(-1)?.sequence ?? 0;
      const quiet = lines.filter((event) => event.type === 'agent.completed').length >= 2;
      if (quiet && lines.some((event) => event.type === 'memory.distilled' && event.payload.throughSequence >= last)) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    // The first one, written to beside the open one: its room is built by scopeOf.
    for (const text of ['The categories are fixed.', 'Backups export to JSON.']) await post(`/api/messages?chat=${first}`, { text, target: 'codex' });
    const beside = await distilled(first);
    assert.ok(beside.length, 'the conversation beside never distilled');
    assert.ok(beside.every((event) => event.payload.agent === 'ollama' && event.payload.local), `distilled by ${beside.map((event) => event.payload.agent)}`);
    assert.equal(paid.length, 0, 'a provider was paid to distill');
  } finally {
    if (previous === undefined) delete process.env.PULSE_DISTILL_EVERY; else process.env.PULSE_DISTILL_EVERY = previous;
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a local model that takes longer than the turn allows says so in words, not as an abort', async () => {
  // Seen in the Coordinator's project (2026-10-12): «The operation was aborted due to timeout».
  const hang = (url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
  // AbortSignal.timeout does not hold the process open: alone at the end of a file, Node 22 ended
  // the file before the abort came (CI of 1.0.0). A timer of our own holds it until it does.
  const hold = setTimeout(() => {}, 5000);
  try {
  await assert.rejects(
    ollamaGenerate({ model: 'qwen2.5:7b', prompt: 'hola', timeoutMs: 30, fetchImpl: hang }),
    (error) => /Ollama \(qwen2\.5:7b\) did not respond before the timeout \(0s\)\./.test(error.message),
  );
  } finally {
    clearTimeout(hold);
  }
});
