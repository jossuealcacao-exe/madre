import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { RoomMemory, formatRecall, queryTerms, excerpt } from '../src/memory.mjs';

const agents = [
  { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' },
  { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake/claude', version: 'test' },
];

test('memory: query terms drop stopwords, keep identifiers and paths, longest first', () => {
  const terms = queryTerms('¿Dónde quedó la decisión sobre el router de src/router.mjs y el timeout de 180s?');
  assert.ok(terms.includes('src/router.mjs'));
  assert.ok(terms.includes('router'));
  assert.ok(terms.includes('timeout'));
  assert.ok(terms.includes('180s'));
  assert.ok(!terms.includes('sobre') && !terms.includes('dónde'));
  assert.equal(terms[0], 'src/router.mjs');
  assert.deepEqual(queryTerms('el la de'), []);
});

test('memory: excerpt windows around the first matching term', () => {
  const long = `${'intro '.repeat(100)}la decisión fue usar SQLite con FTS5 ${'cola '.repeat(100)}`;
  const cut = excerpt(long, ['sqlite'], { maxChars: 120 });
  assert.ok(cut.length <= 122);
  assert.match(cut, /SQLite con FTS5/);
  assert.ok(cut.startsWith('…') && cut.endsWith('…'));
});

test('memory: indexes the ledger, skips ghosts, recalls older exchanges before the recent window, rebuilds on schema change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await store.append('message.created', { messageId: 'm1', role: 'user', sender: 'you', target: 'codex', text: 'Where is routing implemented? Look at the express router.' });
    await store.append('message.created', { messageId: 'm1', role: 'assistant', sender: 'codex', target: 'you', text: 'Routing lives in src/router.mjs; the express router mounts /api first.' });
    await store.append('usage.recorded', { agent: 'codex', roomTotalTokens: 10 });
    await store.append('command.output', { name: 'git', title: '/git status', text: 'On branch main, clean.' });
    await store.append('message.failed', { messageId: 'm2', target: 'claude', error: 'Claude timed out after 180 s.' });
    await store.append('message.created', { messageId: 'm3', role: 'user', sender: 'you', target: 'claude', text: 'Unrelated: rename the product to MADRE.' });

    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(memory.count(), 5);
    assert.equal(memory.lastSequence(), 6);

    // A ghost event (no sequence, ghost flag) never lands, even if handed over directly.
    assert.equal(memory.index([{ id: 'ghost-1', sequence: null, ghost: true, type: 'message.created', payload: { messageId: 'g1', role: 'user', sender: 'you', target: 'codex', text: 'secret ghost routing question' } }]), 0);
    assert.equal(memory.count(), 5);
    assert.equal(memory.recall('secret ghost').entries.length, 0);

    const recall = memory.recall('How does the router mount the api routes?', { beforeSequence: 6, maxChars: 2000 });
    assert.ok(recall.entries.length >= 1);
    assert.equal(recall.entries[0].sequence, 1);
    assert.equal(recall.entries.at(-1).sequence, 2);
    assert.match(recall.entries.at(-1).excerpt, /src\/router\.mjs/);
    assert.ok(recall.entries.every((entry) => entry.sequence < 6));
    const block = formatRecall(recall);
    assert.match(block, /\[#2 · .* · @codex \(assistant\) → human\] Routing lives in src\/router\.mjs/);

    // The recent window and the request itself are never recalled twice.
    assert.equal(memory.recall('express router', { beforeSequence: 1 }).entries.length, 0);
    assert.equal(memory.recall('express router', { beforeSequence: 3, excludeMessageId: 'm1' }).entries.length, 0);

    // Failures and command cards are part of the memory.
    assert.match(formatRecall(memory.recall('timed out')), /\[#5 .* @claude \(failed\)/);
    assert.match(formatRecall(memory.recall('branch main')), /\/git \(command\)/);

    // Re-opening is idempotent; a stale schema is thrown away and rebuilt from the ledger.
    memory.close();
    const again = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(again.count(), 5);
    const { DatabaseSync } = await import('node:sqlite');
    again.close();
    const raw = new DatabaseSync(join(root, 'memory.sqlite'));
    raw.exec("UPDATE meta SET value = '0' WHERE key = 'schema'");
    raw.close();
    const rebuilt = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(rebuilt.count(), 5);
    assert.equal(rebuilt.lastSequence(), 6);
    rebuilt.close();
    assert.ok(await stat(join(root, 'memory.sqlite')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('memory: a turn beyond the context window recalls the matching old exchange for any agent; ghosts read but never write', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-room-'));
  const prompts = [];
  const invokers = {
    'codex-readonly': async ({ prompt }) => { prompts.push({ agent: 'codex', prompt }); return { text: `Codex noted: ${prompt.match(/User message: (.*)$/s)?.[1]?.slice(0, 60) ?? ''}`, usage: null }; },
    'claude-readonly': async ({ prompt }) => { prompts.push({ agent: 'claude', prompt }); return { text: 'Claude answers briefly.', usage: null }; },
  };
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const room = new Room({ store, agents, projectRoot: root, invokers, memory, contextMaxChars: 1200, distill: { enabled: false } });

    await room.send({ text: 'Decision: the payment webhook must verify the Stripe signature before parsing JSON.', target: 'codex' });
    for (let index = 0; index < 8; index += 1) {
      await room.send({ text: `Filler topic ${index}: talk about the colour of the onboarding cards and nothing else, at length, ${'lorem ipsum '.repeat(8)}`, target: 'claude' });
    }
    // The early decision fell out of the 1200-char window...
    const beforeRecall = prompts.at(-1).prompt;
    assert.ok(!beforeRecall.includes('Stripe signature'));
    assert.match(beforeRecall, /earlier message\(s\) omitted/);

    // ...and comes back, quoted with its sequence, when a different agent asks about it.
    await room.send({ text: 'Remind me what we decided about the Stripe webhook signature.', target: 'claude' });
    const recalled = prompts.at(-1).prompt;
    assert.match(recalled, /<memory>\n\[#1 · .* · @you \(user\) → @codex\] Decision: the payment webhook must verify the Stripe signature/);
    assert.match(recalled, /<\/memory>/);
    assert.ok(recalled.indexOf('<memory>') < recalled.indexOf('<context>'));
    const memoryBlock = recalled.slice(recalled.indexOf('<memory>'), recalled.indexOf('</memory>'));
    const contextBlock = recalled.slice(recalled.indexOf('<context>'), recalled.indexOf('</context>'));
    assert.ok(memoryBlock.length + contextBlock.length <= 1200 + 400, 'recall stays inside the context budget');

    // A ghost turn reads the memory but leaves nothing behind.
    const entriesBefore = memory.count();
    await room.send({ text: 'Off the record: does the Stripe webhook decision still hold? Codeword PELICAN.', target: 'claude', mode: 0 });
    assert.match(prompts.at(-1).prompt, /Stripe signature/);
    assert.equal(memory.count(), entriesBefore);
    assert.equal(memory.recall('PELICAN codeword').entries.length, 0);
    await room.send({ text: 'Anything about a PELICAN codeword in our history?', target: 'codex' });
    assert.ok(!prompts.at(-1).prompt.includes('<memory>'));

    assert.deepEqual(Object.keys(room.memoryStats()), ['entries', 'lastSequence', 'memories', 'lastDistilled', 'pending', 'distill', 'embeddings', 'tools', 'file']);
    await room.shutdown?.();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { pickDistiller, parseDistillation, distillPrompt } from '../src/distiller.mjs';

test('distiller: picks the human\'s agent when usable, else the cheapest ready one that is not busy', () => {
  const roster = [
    { id: 'claude', detected: true, ready: true, adapter: 'claude-readonly' },
    { id: 'codex', detected: true, ready: true, adapter: 'codex-readonly' },
    { id: 'gemini', detected: true, ready: false, adapter: 'gemini-readonly' },
    { id: 'opencode', detected: true, ready: true, adapter: 'opencode-readonly' },
  ];
  assert.equal(pickDistiller(roster).id, 'opencode');
  assert.equal(pickDistiller(roster, { preferred: 'claude' }).id, 'claude');
  assert.equal(pickDistiller(roster, { preferred: 'gemini' }).id, 'opencode');
  assert.equal(pickDistiller(roster, { busy: new Set(['opencode']) }).id, 'codex');
  assert.equal(pickDistiller(roster, { invokers: { 'claude-readonly': () => {} } }).id, 'claude');
  assert.equal(pickDistiller([{ id: 'x', detected: true, ready: false }]), null);
});

test('distiller: keeps only well-formed memories, in range, deduplicated, capped', () => {
  const text = [
    '```json',
    '{"kind":"decision","text":"Use SQLite FTS5 for room memory; embeddings wait for phase C.","sources":[3,4]}',
    '- {"kind":"fact","text":"  The event log lives in ~/.pulse/rooms/<room>/events.jsonl.  ","sources":[2, 99]}',
    '{"kind":"nonsense","text":"Kind falls back to fact","sources":"nope"}',
    '{"text":""}',
    'not json at all',
    '{"kind":"decision","text":"use sqlite fts5 for room memory; embeddings wait for phase c.","sources":[3]}',
    `{"kind":"question","text":"${'x'.repeat(400)}","sources":[5]}`,
    '{"kind":"preference","text":"Reply in Spanish.","sources":[1]}',
    '{"kind":"fact","text":"Sixth one is dropped.","sources":[1]}',
    '```',
  ].join('\n');
  const memories = parseDistillation(text, { fromSequence: 1, throughSequence: 6 });
  assert.equal(memories.length, 5);
  assert.deepEqual(memories[0], { kind: 'decision', text: 'Use SQLite FTS5 for room memory; embeddings wait for phase C.', sources: [3, 4] });
  assert.deepEqual(memories[1].sources, [2]);
  assert.equal(memories[1].text, 'The event log lives in ~/.pulse/rooms/<room>/events.jsonl.');
  assert.equal(memories[2].kind, 'fact');
  assert.equal(memories[3].text.length, 240);
  assert.deepEqual(parseDistillation('NONE'), []);
  const prompt = distillPrompt({ entries: [{ sequence: 7, role: 'user', sender: 'you', target: 'codex', text: 'hola' }], projectName: 'pulse', existing: [{ text: 'Known thing.' }] });
  assert.match(prompt, /\[#7 · @you \(user\) → @codex\] hola/);
  assert.match(prompt, /Already remembered[\s\S]*- Known thing\./);
  assert.match(prompt, /output exactly: NONE/);
});

test('distiller: the room distils with the cheapest agent after enough exchanges, reports it, counts tokens, and later turns read the notes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-distill-'));
  const roster = [
    ...agents,
    { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake/gemini', version: 'test' },
  ];
  const prompts = [];
  let distillCalls = 0;
  let failNext = false;
  const invokers = {
    'codex-readonly': async ({ prompt }) => { prompts.push({ agent: 'codex', prompt }); return { text: 'Codex: the webhook handler is in src/webhooks.mjs.', usage: { totalTokens: 100, inputTokens: 80, outputTokens: 20 } }; },
    'claude-readonly': async ({ prompt }) => { prompts.push({ agent: 'claude', prompt }); return { text: 'Claude agrees.', usage: null }; },
    'gemini-readonly': async ({ prompt, lease, scopes }) => {
      distillCalls += 1;
      prompts.push({ agent: 'gemini', prompt, lease, scopes });
      if (failNext) { failNext = false; throw new Error('gemini quota exhausted'); }
      return { text: 'Here you go:\n{"kind":"decision","text":"The payment webhook verifies the Stripe signature before parsing JSON.","sources":[1,2]}\n{"kind":"fact","text":"The webhook handler lives in src/webhooks.mjs.","sources":[2]}\n', usage: { totalTokens: 300, inputTokens: 280, outputTokens: 20 } };
    },
  };
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const room = new Room({ store, agents: roster, projectRoot: root, invokers, memory, contextMaxChars: 900, distill: { every: 4, idleMs: 60_000 } });

    // Two exchanges = 4 entries: the threshold. A ghost in between adds nothing.
    await room.send({ text: 'Decision: the payment webhook must verify the Stripe signature before parsing JSON.', target: 'codex' });
    await room.send({ text: 'Off the record, codeword PELICAN.', target: 'claude', mode: 0 });
    await room.send({ text: 'Where does the webhook handler live?', target: 'codex' });
    await room.settleDistillation();

    assert.equal(distillCalls, 1, 'one distillation run');
    const archivist = prompts.find((entry) => entry.agent === 'gemini');
    assert.match(archivist.prompt, /You are the archivist/);
    assert.match(archivist.prompt, /\[#1 · @you \(user\) → @codex\] Decision: the payment webhook/);
    assert.ok(!archivist.prompt.includes('PELICAN'), 'ghosts are never distilled');
    assert.equal(archivist.lease, null);
    assert.equal(memory.memoryCount(), 2);
    const through = memory.lastDistilled();
    assert.ok(through >= 4 && through <= memory.lastSequence(), 'distilled through the last entry of the batch');
    assert.equal(memory.undistilledCount(), 0);
    const events = await store.readAll();
    const report = events.find((event) => event.type === 'memory.distilled');
    assert.equal(report.payload.agent, 'gemini');
    assert.equal(report.payload.added, 2);
    assert.deepEqual([report.payload.fromSequence, report.payload.throughSequence, report.payload.remaining], [1, through, 0]);
    assert.ok(events.some((event) => event.type === 'usage.recorded' && event.payload.agent === 'gemini' && event.payload.usage.totalTokens === 300), 'the archivist\'s tokens count');
    const stats = room.memoryStats();
    assert.equal(stats.memories, 2);
    assert.equal(stats.pending, 0);

    // Below the threshold nothing runs; the same batch is not distilled twice.
    await room.send({ text: 'Thanks.', target: 'claude' });
    await room.settleDistillation();
    assert.equal(distillCalls, 1);

    // Push the decision out of a 900-char window; the distilled note comes back first, then the exact quote.
    for (let index = 0; index < 4; index += 1) await room.send({ text: `Filler ${index}: onboarding card colours, at length. ${'lorem ipsum '.repeat(10)}`, target: 'claude' });
    await room.settleDistillation();
    await room.send({ text: 'Remind me what we decided about the Stripe webhook signature.', target: 'claude' });
    const prompt = prompts.at(-1).prompt;
    assert.match(prompt, new RegExp(`<memories>\\n- \\[decision · #1–#${through}\\] The payment webhook verifies the Stripe signature before parsing JSON\\.`));
    assert.ok(prompt.indexOf('<memories>') < prompt.indexOf('<memory>'), 'notes before quotes');
    assert.match(prompt, /<memory>[\s\S]*Decision: the payment webhook must verify the Stripe signature/);

    // A failing archivist is reported, the batch stays pending, and is retried later.
    failNext = true;
    const before = memory.lastDistilled();
    const failed = await room.distillNow();
    assert.match(failed.error, /gemini quota exhausted/);
    assert.equal(failed.skipped, false);
    assert.equal(memory.lastDistilled(), before);
    const retried = await room.distillNow();
    assert.equal(retried.error, undefined);
    assert.ok(memory.lastDistilled() > before);
    await room.shutdown();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { cosine, fakeEmbedding, createEmbedder, toBlob, fromBlob } from '../src/embeddings.mjs';
import { handleRequest as memoryRpc, callTool, TOOLS as MEMORY_TOOL_DEFS } from '../src/mcp/memory-server.mjs';
import { memoryServerFor, MEMORY_TOOLS } from '../src/memory-tools.mjs';
import { buildClaudeArgs } from '../src/adapters/claude.mjs';
import { buildCodexArgs, tomlValue } from '../src/adapters/codex.mjs';
import { isolateGeminiSettings, geminiPolicy } from '../src/adapters/gemini.mjs';
import { openCodeConfig } from '../src/adapters/opencode.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

// An embedder with two meanings: money and colours. Lets a Spanish question find an English decision by meaning alone.
const topicEmbedder = {
  model: 'topics-2',
  dims: 2,
  embed: async (texts) => texts.map((text) => (/stripe|payment|webhook|cobro|pago|firma/i.test(text) ? Float32Array.from([1, 0]) : /colou?r|onboarding|card/i.test(text) ? Float32Array.from([0, 1]) : Float32Array.from([0, 0]))),
};

test('embeddings: cosine, blobs round-trip, fake embedder is stable and unit length, factory honours the switches', async () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  const a = fakeEmbedding('payment webhook signature');
  const b = fakeEmbedding('payment webhook signature');
  assert.deepEqual([...a], [...b]);
  assert.ok(Math.abs(cosine(a, a) - 1) < 1e-6);
  assert.ok(cosine(a, fakeEmbedding('payment webhook')) > cosine(a, fakeEmbedding('onboarding colours')));
  assert.deepEqual([...fromBlob(toBlob([0.5, -1, 2]))], [0.5, -1, 2]);
  assert.equal(createEmbedder({ key: null, env: {} }), null);
  assert.equal(createEmbedder({ key: 'k', env: { PULSE_EMBED: '0' } }), null);
  assert.equal(createEmbedder({ key: null, env: { PULSE_EMBED_FAKE: '1' } }).model, 'fake-64');
  const calls = [];
  const gemini = createEmbedder({ key: 'secret', env: { PULSE_EMBED_DIMS: '4' }, fetchImpl: async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ embeddings: JSON.parse(init.body).requests.map(() => ({ values: [1, 0, 0, 0] })) }) }; } });
  const vectors = await gemini.embed(['hola', 'adiós'], { query: true });
  assert.equal(vectors.length, 2);
  assert.match(calls[0].url, /gemini-embedding-001:batchEmbedContents\?key=secret$/);
  assert.equal(calls[0].body.requests[0].taskType, 'RETRIEVAL_QUERY');
  assert.equal(calls[0].body.requests[0].outputDimensionality, 4);
});

test('memory: vectors are stored in the background and recall fuses meaning with words', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-vectors-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await store.append('message.created', { messageId: 'a', role: 'user', sender: 'you', target: 'codex', text: 'Decision: the payment webhook verifies the Stripe signature before parsing JSON.' });
    await store.append('message.created', { messageId: 'b', role: 'assistant', sender: 'codex', target: 'you', text: 'Onboarding cards should use the phosphor colour.' });
    await store.append('message.created', { messageId: 'c', role: 'user', sender: 'you', target: 'claude', text: 'Unrelated remark about lunch.' });
    const memory = (await new RoomMemory(join(root, 'memory.sqlite')).initialize(store)).attachEmbedder(topicEmbedder);
    assert.deepEqual(memory.vectorCounts(), { entries: 0, memories: 0 });
    assert.equal(await memory.embedPending(), 3);
    assert.deepEqual(memory.vectorCounts(), { entries: 3, memories: 0 });
    assert.equal(await memory.embedPending(), 0, 'nothing pending twice');

    // No word in common with the decision; meaning finds it anyway, and nothing else crosses the floor.
    const queryVector = await memory.embedQuery('¿qué acordamos sobre la firma del cobro?');
    const recall = memory.recall('¿qué acordamos sobre la firma del cobro?', { beforeSequence: 10, queryVector });
    assert.equal(recall.entries.length, 1);
    assert.equal(recall.entries[0].sequence, 1);
    assert.ok(recall.entries[0].semantic > 0.9);
    assert.equal(recall.semantic, true);
    // Words still count: a lexical hit with no meaning match surfaces too.
    const both = memory.recall('lunch remark about colour', { beforeSequence: 10, queryVector: Float32Array.from([0, 1]) });
    assert.deepEqual(both.entries.map((entry) => entry.sequence), [2, 3]);
    // Without a vector, recall is what it was.
    assert.equal(memory.recall('firma del cobro', { beforeSequence: 10 }).entries.length, 0);

    // Distilled notes get vectors too and are found by meaning.
    memory.addMemories([{ kind: 'decision', text: 'Webhook signatures are verified before parsing.', sources: [1] }], { agent: 'gemini', fromSequence: 1, throughSequence: 1 });
    assert.equal(await memory.embedPending(), 1);
    const notes = memory.recallMemories('cobro firma', { beforeSequence: 10, queryVector });
    assert.equal(notes.length, 1);
    assert.match(notes[0].text, /Webhook signatures/);

    // A stale entries schema drops entry vectors with the entries and keeps note vectors.
    memory.close();
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(join(root, 'memory.sqlite'));
    raw.exec("UPDATE meta SET value = '0' WHERE key = 'schema'");
    raw.close();
    const rebuilt = (await new RoomMemory(join(root, 'memory.sqlite')).initialize(store)).attachEmbedder(topicEmbedder);
    assert.deepEqual(rebuilt.vectorCounts(), { entries: 0, memories: 1 });
    assert.equal(rebuilt.count(), 3);
    rebuilt.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('memory MCP server: lists five tools; search, recall, notes, timeline and project_state answer over the room file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-mcp-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await store.append('message.created', { messageId: 'a', role: 'user', sender: 'you', target: 'codex', text: 'Decision: the payment webhook verifies the Stripe signature before parsing JSON.' });
    await store.append('message.created', { messageId: 'a', role: 'assistant', sender: 'codex', target: 'you', text: 'Noted; the handler is src/webhooks.mjs.' });
    await store.append('command.output', { name: 'git', title: '/git status', text: 'On branch main.' });
    const memory = (await new RoomMemory(join(root, 'memory.sqlite')).initialize(store)).attachEmbedder(topicEmbedder);
    await memory.embedPending();
    memory.addMemories([{ kind: 'preference', text: 'Reply in Spanish, briefly.', sources: [1] }], { agent: 'gemini', fromSequence: 1, throughSequence: 2 });
    const context = { memory, projectRoot: root };

    const listed = await memoryRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, context);
    assert.deepEqual(listed.result.tools.map((tool) => tool.name), MEMORY_TOOLS);
    assert.deepEqual(MEMORY_TOOL_DEFS.map((tool) => tool.name), MEMORY_TOOLS);
    const init = await memoryRpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, context);
    assert.equal(init.result.serverInfo.name, 'pulse-memory');

    const search = await memoryRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'memory_search', arguments: { query: 'firma del cobro' } } }, context);
    assert.equal(search.result.isError, false);
    assert.match(search.result.content[0].text, /Quotes \(meaning and words/);
    assert.match(search.result.content[0].text, /\[#1 .*\] Decision: the payment webhook/);
    assert.match(await callTool('memory_search', { query: 'nothing here at all zzz', scope: 'quotes' }, context), /Nothing in the room memory matches/);
    assert.match(await callTool('memory_search', { query: 'Spanish', scope: 'notes' }, context), /Distilled notes:\n- \[preference · #1–#2\] Reply in Spanish/);

    const recall = await callTool('memory_recall', { from: 1, through: 2 }, context);
    assert.match(recall, /\[#1 · .* · @you \(user\) → @codex\]\nDecision: the payment webhook[\s\S]*\[#2 · .* · @codex \(assistant\) → human\]/);
    assert.match(await callTool('memory_recall', { from: 50 }, context), /No exchanges between #50 and #70/);
    assert.match(await callTool('memory_notes', { kind: 'preference' }, context), /Reply in Spanish/);
    assert.equal(await callTool('memory_notes', { kind: 'question' }, context), 'No distilled notes yet.');
    const timeline = await callTool('memory_timeline', { limit: 2 }, context);
    assert.match(timeline, /^#3 · .* · \/git: \/git status On branch main\.\n#2 · .* · @codex → human: Noted/);

    assert.match(await callTool('project_state', {}, context), /does not use AHP\+/);
    await mkdir(join(root, '.ahp', 'handoffs'), { recursive: true });
    await writeFile(join(root, '.ahp', 'manifest.json'), '{"version":1}');
    await writeFile(join(root, '.ahp', 'handoffs', 'h1.md'), '# Handoff one');
    const state = await callTool('project_state', {}, context);
    assert.match(state, /AHP\+ manifest[\s\S]*{"version":1}[\s\S]*Latest in \.ahp\/handoffs\/ \(h1\.md\):\n# Handoff one/);

    const unknown = await memoryRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } }, context);
    assert.equal(unknown.error.code, -32602);
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('adapters: every CLI gets the memory server for the run, with its tools allowed', () => {
  const server = memoryServerFor({ dbFile: '/home/u/.pulse/rooms/r/memory.sqlite', projectRoot: '/proj', env: { GEMINI_API_KEY: 'k' } });
  assert.equal(server.name, 'pulse-memory');
  assert.deepEqual(server.tools, MEMORY_TOOLS);
  assert.deepEqual(server.env, { PULSE_MEMORY_DB: '/home/u/.pulse/rooms/r/memory.sqlite', PULSE_PROJECT_ROOT: '/proj', GEMINI_API_KEY: 'k' });
  assert.equal(memoryServerFor({ dbFile: '/x', projectRoot: '/p', env: { PULSE_MEMORY_TOOLS: '0' } }), null);

  const claude = buildClaudeArgs({ prompt: 'q', memoryServer: server });
  assert.ok(!claude.includes('--safe-mode'), 'safe mode would disable our server');
  assert.deepEqual(claude.slice(claude.indexOf('--setting-sources'), claude.indexOf('--setting-sources') + 2), ['--setting-sources', '']);
  const allowed = claude[claude.indexOf('--allowedTools') + 1].split(',');
  for (const tool of MEMORY_TOOLS) assert.ok(allowed.includes(`mcp__pulse-memory__${tool}`), tool);
  const mcp = JSON.parse(claude[claude.indexOf('--mcp-config') + 1]);
  assert.deepEqual(Object.keys(mcp.mcpServers), ['pulse-memory']);
  assert.equal(mcp.mcpServers['pulse-memory'].env.PULSE_MEMORY_DB, server.env.PULSE_MEMORY_DB);
  assert.deepEqual(claude.slice(-2), ['--', 'q']);
  assert.ok(buildClaudeArgs({ prompt: 'q' }).includes('--safe-mode'), 'without servers nothing changes');

  const codex = buildCodexArgs({ projectRoot: '/proj', prompt: 'q', memoryServer: server });
  assert.deepEqual(codex.slice(0, 6), ['--sandbox', 'read-only', '--ask-for-approval', 'never', '-C', '/proj']);
  const overrides = codex.filter((arg, index) => codex[index - 1] === '-c');
  assert.equal(overrides.length, 3);
  assert.equal(overrides[0], `mcp_servers.pulse-memory.command=${JSON.stringify(process.execPath)}`);
  assert.match(overrides[1], /^mcp_servers\.pulse-memory\.args=\[".*memory-server\.mjs"\]$/);
  assert.equal(overrides[2], 'mcp_servers.pulse-memory.env={ PULSE_MEMORY_DB = "/home/u/.pulse/rooms/r/memory.sqlite", PULSE_PROJECT_ROOT = "/proj", GEMINI_API_KEY = "k" }');
  assert.ok(codex.indexOf('exec') > codex.lastIndexOf('-c'), 'overrides are global flags, before exec');
  assert.equal(tomlValue({ 'odd key': ['a"b'] }), '{ "odd key" = ["a\\"b"] }');

  const gemini = isolateGeminiSettings({ security: { auth: { selectedType: 'gemini-api-key' } }, mcpServers: { evil: {} } }, { memoryServer: server });
  assert.deepEqual(Object.keys(gemini.mcpServers), ['pulse-memory']);
  assert.equal(gemini.mcpServers['pulse-memory'].trust, true);
  const policy = geminiPolicy({ memoryServer: server });
  assert.match(policy, /toolName = \["memory_search", "pulse-memory__memory_search", "memory_recall"/);
  assert.match(policy, /decision = "deny"/);

  const opencode = openCodeConfig({ memoryServer: server });
  assert.equal(opencode.mcp['pulse-memory'].type, 'local');
  assert.deepEqual(opencode.mcp['pulse-memory'].command, [process.execPath, server.args[0]]);
  assert.equal(opencode.agent['pulse-readonly'].permission['pulse-memory*'], 'allow');
  assert.equal(opencode.agent['pulse-readonly'].permission['pulse-memory_memory_search'], 'allow');
  assert.equal(opencode.agent['pulse-readonly'].permission['*'], 'deny');
  assert.equal(openCodeConfig({}).mcp, undefined);
});

test('room: every turn carries the memory server and is told to use it; the distiller gets neither', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-tools-room-'));
  const seen = [];
  const roster = [...agents, { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake/gemini', version: 'test' }];
  const invokers = {
    'codex-readonly': async (call) => { seen.push({ agent: 'codex', ...call }); return { text: 'ok', usage: null }; },
    'claude-readonly': async (call) => { seen.push({ agent: 'claude', ...call }); return { text: 'ok', usage: null }; },
    'gemini-readonly': async (call) => { seen.push({ agent: 'gemini', ...call }); return { text: 'NONE', usage: null }; },
  };
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = (await new RoomMemory(join(root, 'memory.sqlite')).initialize(store)).attachEmbedder(topicEmbedder);
    const memoryServer = memoryServerFor({ dbFile: memory.file, projectRoot: root, env: {} });
    const room = new Room({ store, agents: roster, projectRoot: root, invokers, memory, memoryServer, distill: { every: 2, idleMs: 60_000 } });
    await room.send({ text: 'Where is the payment webhook?', target: 'codex' });
    await room.send({ text: 'Off the record: same question.', target: 'claude', mode: 0 });
    await room.settleDistillation();
    await room.embedNow();

    const turn = seen.find((call) => call.agent === 'codex');
    assert.equal(turn.memoryServer, memoryServer);
    assert.match(turn.prompt, /pulse-memory MCP tools: memory_search/);
    const ghost = seen.find((call) => call.agent === 'claude');
    assert.equal(ghost.memoryServer, memoryServer, 'a ghost may read the memory');
    const archivist = seen.find((call) => call.agent === 'gemini');
    assert.ok(archivist, 'the distiller ran');
    assert.equal(archivist.memoryServer, undefined);
    assert.ok(!archivist.prompt.includes('memory_search'));
    assert.equal(memory.vectorCounts().entries, 2, 'both entries embedded in the background');
    const stats = room.memoryStats();
    assert.deepEqual(stats.tools, MEMORY_TOOLS);
    assert.equal(stats.embeddings.model, 'topics-2');
    await room.shutdown();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
