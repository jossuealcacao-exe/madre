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
    '{"kind":"nonsense","text":"An unknown kind is dropped, never filed as a fact","sources":"nope"}',
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
  // A kind nobody recognises is dropped. It used to become a fact, which was harmless while
  // every kind was knowledge; with aberrations in the list a typo either way would put a
  // hallucination where the room trusts it.
  assert.ok(!memories.some((memory) => /unknown kind is dropped/.test(memory.text)), 'an unrecognised kind was filed anyway');
  assert.equal(memories[2].kind, 'question');
  assert.equal(memories[2].text.length, 240);
  assert.deepEqual(parseDistillation('NONE'), []);

  // An aberration carries what turned out to be true; nothing else does, whatever the model says.
  const flagged = parseDistillation([
    '{"kind":"aberration","text":"The webhook verifies the signature after parsing.","correction":"It verifies before parsing.","sources":[2]}',
    '{"kind":"fact","text":"The room listens on 4317.","correction":"nonsense on a fact","sources":[3]}',
  ].join('\n'), { fromSequence: 1, throughSequence: 6 });
  assert.equal(flagged[0].kind, 'aberration');
  assert.equal(flagged[0].correction, 'It verifies before parsing.');
  assert.ok(!('correction' in flagged[1]), 'a fact came back carrying a correction');

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
    assert.equal(failed.next, 'codex', 'the next cheapest archivist is named');
    const retried = await room.distillNow();
    assert.equal(retried.error, undefined);
    assert.notEqual(retried.agent, 'gemini', 'a failed archivist sits out; the retry goes to another agent');
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
    assert.deepEqual(turn.memoryServer.env, { ...memoryServer.env, PULSE_MEMORY_AGENT: 'codex', PULSE_MEMORY_MESSAGE: turn.memoryServer.env.PULSE_MEMORY_MESSAGE, PULSE_MEMORY_MODE: '1' }, 'the server is signed for the turn');
    assert.match(turn.prompt, /pulse-memory MCP tools: memory_search/);
    assert.match(turn.prompt, /only when the human explicitly asks you to remember, note or save something, call memory_note/);
    const ghost = seen.find((call) => call.agent === 'claude');
    assert.equal(ghost.memoryServer.env.PULSE_MEMORY_MODE, '0', 'a ghost may read the memory but the server knows it is a ghost');
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

import { createPulseServer } from '../src/server.mjs';

test('memory: forgetting removes the note and its vector; links pair notes that agree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-forget-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const memory = (await new RoomMemory(join(root, 'memory.sqlite')).initialize(store)).attachEmbedder(topicEmbedder);
    memory.addMemories([
      { kind: 'decision', text: 'Verify the Stripe signature first.', sources: [1] },
      { kind: 'fact', text: 'The payment webhook lives in src/webhooks.mjs.', sources: [2] },
      { kind: 'preference', text: 'Onboarding cards in phosphor colour.', sources: [3] },
    ], { agent: 'gemini', fromSequence: 1, throughSequence: 3 });
    await memory.embedPending();
    assert.deepEqual(memory.memoryLinks(), [{ a: 1, b: 2, weight: 1 }]);
    assert.deepEqual(memory.memoryLinks({ floor: 1.1 }), []);
    const gone = memory.deleteMemory(2);
    assert.equal(gone.text, 'The payment webhook lives in src/webhooks.mjs.');
    assert.equal(memory.deleteMemory(2), null);
    assert.equal(memory.memoryCount(), 2);
    assert.deepEqual(memory.vectorCounts(), { entries: 0, memories: 2 });
    assert.deepEqual(memory.memoryLinks(), []);
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('NOSTROMO: the archive answers only to the project designation; forgetting is recorded in the ledger', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-nostromo-'));
  const project = join(root, 'Nostromo Project');
  await mkdir(project);
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/api/memory`)).status, 403);
    assert.equal((await fetch(`${base}/api/memory?designation=wrong`)).status, 403);
    const ok = await fetch(`${base}/api/memory?designation=nostromo%20project`);
    assert.equal(ok.status, 200);
    const research = await ok.json();
    assert.deepEqual(research.memories, []);
    assert.deepEqual(research.links, []);
    assert.equal(research.stats.memories, 0);

    // Seed a note through the room's own memory file, then read it back through the door.
    const memory = await new RoomMemory(research.stats.file).initialize();
    memory.addMemories([{ kind: 'question', text: 'Should the webhook retry on 5xx?', sources: [1] }], { agent: 'gemini', fromSequence: 1, throughSequence: 1 });
    memory.close();
    const listed = await fetch(`${base}/api/memory?designation=Nostromo%20Project`).then((response) => response.json());
    assert.equal(listed.memories.length, 1);
    const id = listed.memories[0].id;

    assert.equal((await fetch(`${base}/api/memory/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'nope' }) })).status, 403);
    const forgotten = await fetch(`${base}/api/memory/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'nostromo project' }) });
    assert.equal(forgotten.status, 200);
    const result = await forgotten.json();
    assert.equal(result.forgotten.kind, 'question');
    assert.equal(result.stats.memories, 0);
    assert.equal((await fetch(`${base}/api/memory/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'nostromo project' }) })).status, 404);
    const event = (await store.readAll()).find((item) => item.type === 'memory.forgotten');
    assert.equal(event.payload.kind, 'question');
    assert.match(event.payload.text, /retry on 5xx/);
    assert.equal(event.payload.remaining, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('memory_note: saves a signed note on request, refuses ghosts and duplicates; the room reports it on the bubble', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-memory-note-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await store.append('message.created', { messageId: 'a', role: 'user', sender: 'you', target: 'codex', text: 'Remember: we are testing the memory UX.' });
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const context = { memory, projectRoot: root, agent: 'codex', mode: '1', messageId: 'resp-1' };

    assert.deepEqual(MEMORY_TOOL_DEFS.map((tool) => tool.name), MEMORY_TOOLS);
    assert.ok(MEMORY_TOOLS.includes('memory_note'));
    const saved = await callTool('memory_note', { kind: 'fact', text: 'We are experimenting with the memory UX.', sources: [1] }, context);
    assert.match(saved, /^Saved memory #1 \(fact\) for every future turn of this room: "We are experimenting with the memory UX\."$/);
    const [note] = memory.memories();
    assert.equal(note.agent, 'codex');
    assert.equal(note.origin, 'noted');
    assert.equal(note.messageId, 'resp-1');
    assert.deepEqual([note.fromSequence, note.throughSequence], [1, 1]);
    assert.match(await callTool('memory_note', { kind: 'fact', text: 'we are experimenting with the memory ux' }, context), /^Already remembered/);
    assert.match(await callTool('memory_note', { kind: 'decision', text: 'x'.repeat(241) }, context), /Too long/);
    assert.equal(await callTool('memory_note', { kind: 'fact', text: '   ' }, context), 'Give me the memory as one sentence.');
    assert.match(await callTool('memory_note', { kind: 'fact', text: 'Ghost secret.' }, { ...context, mode: '0' }), /off the record/);
    assert.equal(memory.memoryCount(), 1);
    // Without sources the note is pinned to the ledger's current end.
    await callTool('memory_note', { kind: 'question', text: 'Should notes expire?' }, context);
    assert.equal(memory.memories()[0].fromSequence, memory.lastSequence());
    memory.close();

    // In the room: an agent that writes a note during its turn gets a memory.noted event on its bubble.
    const store2 = await new EventStore(join(root, 'events2.jsonl')).initialize();
    const memory2 = await new RoomMemory(join(root, 'memory2.sqlite')).initialize(store2);
    const invokers = {
      'codex-readonly': async ({ memoryServer }) => {
        // Simulate the CLI calling memory_note through the signed server.
        await callTool('memory_note', { kind: 'decision', text: 'The first memory is about the memory UX experiment.', sources: [1] }, { memory: memory2, agent: memoryServer.env.PULSE_MEMORY_AGENT, mode: memoryServer.env.PULSE_MEMORY_MODE, messageId: memoryServer.env.PULSE_MEMORY_MESSAGE });
        return { text: 'Saved.', usage: null };
      },
      'claude-readonly': async () => ({ text: 'Nothing saved.', usage: null }),
    };
    const memoryServer = memoryServerFor({ dbFile: memory2.file, projectRoot: root, env: {} });
    const room = new Room({ store: store2, agents, projectRoot: root, invokers, memory: memory2, memoryServer, distill: { enabled: false } });
    await room.send({ text: 'Save the first memory: we are experimenting with the memory UX.', target: 'codex' });
    const events = await store2.readAll();
    const reply = events.find((event) => event.type === 'message.created' && event.payload.role === 'assistant');
    const noted = events.find((event) => event.type === 'memory.noted');
    assert.ok(noted, 'memory.noted was emitted');
    assert.equal(noted.payload.agent, 'codex');
    assert.equal(noted.payload.responseMessageId, reply.payload.messageId, 'the hint anchors to the reply bubble');
    assert.equal(noted.payload.notes.length, 1);
    assert.equal(noted.payload.notes[0].kind, 'decision');
    assert.equal(noted.payload.total, 1);
    assert.ok(events.indexOf(noted) > events.indexOf(reply), 'the bubble exists before its hint');
    assert.equal(memory2.memories()[0].messageId, reply.payload.messageId);
    // A turn that saves nothing emits nothing.
    await room.send({ text: 'Anything?', target: 'claude' });
    assert.equal((await store2.readAll()).filter((event) => event.type === 'memory.noted').length, 1);
    await room.shutdown();
    memory2.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { MotherChannel, encodeMessage, decodeMessage, parseEnv, fingerprint, motherWords } from '../src/mother.mjs';
import { readFile as readFileP, rm as rmP, writeFile as writeFileP } from 'node:fs/promises';

test("MOTHER's channel: sealed words round-trip, the file is born once, deleting or editing it is noticed and re-sealed", async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-mother-'));
  try {
    const code = encodeMessage('seal-a', 'PRIORITY ONE');
    assert.match(code, /^([0-9a-f]{4} )+[0-9a-f]{1,4}$/);
    assert.equal(decodeMessage('seal-a', code), 'PRIORITY ONE');
    assert.throws(() => decodeMessage('seal-b', code));
    assert.deepEqual(parseEnv('# c\nA=1\nB="two words"\nbad line\n'), { A: '1', B: 'two words' });
    assert.match(motherWords('intrusion', { strikes: 9, project: 'pulse', lockMs: 600000 }), /INTRUSION ATTEMPT ON MY MEMORY CORE FROM THE CONSOLE OF PULSE.*9 STRIKES.*SEALED FOR 10 MINUTES.*NOBODY DELETES MOTHER'S MEMORY/);

    const meta = new Map();
    const store = { get: (key) => meta.get(key) ?? null, set: (key, value) => meta.set(key, value) };
    const file = join(root, '.pulse', 'mother.env');
    const first = new MotherChannel(file, { meta: store });
    assert.equal(await first.load(), 'born');
    const env = parseEnv(await readFileP(file, 'utf8'));
    assert.equal(env.MOTHER_SEAL, first.seal);
    assert.equal(meta.get('mother_seal'), fingerprint(first.seal));
    const sent = await first.alert('intrusion', { strikes: 8, project: 'pulse', lockMs: 5000 });
    assert.match(sent.text, /8 STRIKES/);
    assert.ok(first.lockedFor() > 4000 && first.lockedFor() <= 5000);
    assert.equal(first.recent()[0].text, sent.text);
    assert.match(await readFileP(file, 'utf8'), /MOTHER_ALERT_1=.*\|intrusion\|[0-9a-f ]+/);
    assert.ok(!(await readFileP(file, 'utf8')).includes('STRIKES'), 'the file holds only the code');

    // The same file opens quietly and remembers.
    const again = new MotherChannel(file, { meta: store });
    assert.equal(await again.load(), 'ok');
    assert.equal(again.recent()[0].text, sent.text);
    assert.equal(again.altered, false);

    // Deleted: she notices, forges a new seal, and the old word is unreadable.
    await rmP(file);
    const afterDelete = new MotherChannel(file, { meta: store });
    assert.equal(await afterDelete.load(), 'deleted');
    assert.notEqual(afterDelete.seal, first.seal);
    assert.equal(afterDelete.altered, true);
    assert.equal(afterDelete.tampers, 1);
    assert.deepEqual(afterDelete.recent(), []);
    assert.equal(meta.get('mother_seal'), fingerprint(afterDelete.seal));
    assert.match(await readFileP(file, 'utf8'), /MOTHER_TAMPERED=.*\nMOTHER_TAMPERS=1/);

    // Edited seal: altered, tampers climb.
    await writeFileP(file, (await readFileP(file, 'utf8')).replace(/MOTHER_SEAL=.*/, 'MOTHER_SEAL=forged-by-hand'));
    const afterEdit = new MotherChannel(file, { meta: store });
    assert.equal(await afterEdit.load(), 'altered');
    assert.equal(afterEdit.tampers, 2);
    assert.deepEqual(Object.keys(afterEdit.status()).sort(), ['alerts', 'altered', 'born', 'file', 'lockedForMs', 'tampered', 'tampers']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CODE000: the archive seals, the crew is told in code, the console reads only the code; a deleted channel raises the alarm on start', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-code000-'));
  const project = join(root, 'ship');
  await mkdir(project);
  const prompts = [];
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  const invokers = { 'codex-readonly': async ({ prompt }) => { prompts.push(prompt); return { text: 'ok', usage: null }; } };
  let { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let base = `http://127.0.0.1:${server.address().port}`;
  try {
    const status = await fetch(`${base}/api/mother`).then((response) => response.json());
    assert.equal(status.strikes, 8);
    assert.equal(status.mother.altered, false);
    assert.equal(status.mother.lockedForMs, 0);
    assert.equal((await fetch(`${base}/api/mother/code000`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'nope' }) })).status, 403);
    const zero = await fetch(`${base}/api/mother/code000`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'ship', strikes: 9 }) });
    assert.equal(zero.status, 200);
    const result = await zero.json();
    assert.match(result.code, /^[0-9a-f ]+$/);
    assert.ok(result.lockedForMs > 9 * 60000);
    // Sealed: the door and the delete both refuse with 423.
    const sealed = await fetch(`${base}/api/memory?designation=ship`);
    assert.equal(sealed.status, 423);
    assert.match((await sealed.json()).error, /CODE000\. THE ARCHIVE IS SEALED FOR 10 MORE MINUTES/);
    assert.equal((await fetch(`${base}/api/memory/1`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: 'ship' }) })).status, 423);
    // The ledger holds the code, never the words.
    const alert = (await store.readAll()).find((event) => event.type === 'mother.alert');
    assert.equal(alert.payload.kind, 'intrusion');
    assert.equal(alert.payload.strikes, 9);
    assert.equal(alert.payload.code, result.code);
    assert.ok(!JSON.stringify(alert).includes('INTRUSION ATTEMPT'));
    const envText = await readFileP(join(project, '.pulse', 'mother.env'), 'utf8');
    assert.ok(!envText.includes('INTRUSION ATTEMPT'));
    // The crew reads her words in clear on the next turn; a ghost turn does not carry them.
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'status?', target: 'codex' }) });
    for (let attempt = 0; attempt < 50 && !prompts.length; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.match(prompts.at(-1), /<mother>\n\[.* · intrusion\] PRIORITY ONE TO ALL CREW\. INTRUSION ATTEMPT ON MY MEMORY CORE FROM THE CONSOLE OF SHIP.*9 STRIKES/);
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'off the record?', target: 'codex', mode: 0 }) });
    for (let attempt = 0; attempt < 50 && prompts.length < 2; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(!prompts.at(-1).includes('<mother>'));
    await new Promise((resolve) => server.close(resolve));

    // The human deletes her channel. On the next start she notices and tells the room.
    await rmP(join(project, '.pulse', 'mother.env'));
    ({ server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers }));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    let tamper = null;
    for (let attempt = 0; attempt < 60 && !tamper; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 25)); tamper = (await store.readAll()).find((event) => event.type === 'mother.alert' && event.payload.kind === 'tamper'); }
    assert.ok(tamper, 'tamper alert emitted');
    assert.equal(tamper.payload.outcome, 'deleted');
    assert.match(tamper.payload.message, /MY CHANNEL WAS DELETED\. I HAVE FORGED A NEW SEAL/);
    assert.deepEqual(tamper.payload.crew, ['codex']);
    let heard = null;
    for (let attempt = 0; attempt < 80 && !heard; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 25)); heard = (await store.readAll()).find((event) => event.type === 'message.created' && event.payload.role === 'assistant' && event.payload.target === 'mother'); }
    assert.ok(heard, 'the crew answered MOTHER in the room');
    assert.equal(heard.payload.sender, 'codex');
    assert.ok(prompts.some((prompt) => /MU\/TH\/UR herself addresses you[\s\S]*MY CHANNEL WAS TAMPERED WITH/.test(prompt)), 'she spoke to the agent in clear');
    const after = await fetch(`${base}/api/mother`).then((response) => response.json());
    assert.equal(after.mother.altered, true);
    assert.equal(after.mother.tampers, 1);
    assert.equal(after.mother.lockedForMs, 0, 'a new seal starts unsealed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('memory: distillation takes the newest exchanges first and the backlog drains behind them; an old watermark migrates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-newest-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 1; i <= 12; i += 1) await store.append('message.created', { messageId: `m${i}`, role: 'user', sender: 'you', target: 'codex', text: `Exchange number ${i} ${'x'.repeat(200)}` });
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(memory.undistilledCount(), 12);
    const first = memory.undistilled({ maxChars: 1100 });
    assert.deepEqual(first.sequences, [9, 10, 11, 12], 'the newest four fit and come in ledger order');
    assert.equal(first.remaining, 8);
    memory.markDistilled(first.sequences);
    assert.equal(memory.lastDistilled(), 12);
    assert.equal(memory.undistilledCount(), 8);
    const second = memory.undistilled({ maxChars: 1100 });
    assert.deepEqual(second.sequences, [5, 6, 7, 8], 'then the next newest');
    // A new exchange jumps the queue.
    await store.append('message.created', { messageId: 'm13', role: 'user', sender: 'you', target: 'codex', text: 'Fresh exchange 13' });
    await memory.catchUp(store);
    assert.equal(memory.undistilled({ maxChars: 1100 }).sequences.at(-1), 13);
    memory.close();

    // A file from before the flag: the watermark seeds the flag.
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(join(root, 'memory.sqlite'));
    raw.exec('ALTER TABLE entries DROP COLUMN distilled');
    raw.exec("INSERT INTO meta (key, value) VALUES ('last_distilled', '6') ON CONFLICT(key) DO UPDATE SET value = '6'");
    raw.close();
    const migrated = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(migrated.lastDistilled(), 6);
    assert.equal(migrated.undistilledCount(), 7);
    migrated.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { listExtensions } from '../src/extensions.mjs';

test('RIPLEY: off by default, files stay source; on, HTML and SVG render through a sealed preview route', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ripley-'));
  const project = join(root, 'site');
  await mkdir(project);
  await writeFile(join(project, 'index.html'), '<!doctype html><h1>Hello</h1><script>alert(1)</script>');
  await writeFile(join(project, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>');
  await writeFile(join(project, 'app.js'), 'console.log(1)');
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const listed = await listExtensions({ projectRoot: project, config: {} });
    const ripley = listed.find((item) => item.id === 'ripley');
    assert.equal(ripley.status.installed, false);
    assert.equal((await listExtensions({ projectRoot: project, config: { modules: { ripley: { enabled: true } } } })).find((item) => item.id === 'ripley').status.detail, 'on · PREVIEW in the file viewer');

    const state = await fetch(`${base}/api/state`).then((response) => response.json());
    assert.deepEqual(state.ripley, { enabled: false });
    const off = await fetch(`${base}/preview/project/index.html`);
    assert.equal(off.status, 412);
    // Plain /api/files keeps serving HTML as text, as before.
    assert.match((await fetch(`${base}/api/files?path=index.html`)).headers.get('content-type'), /^text\/plain/);

    const toggled = await fetch(`${base}/api/extensions/ripley/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(toggled.status, 200);
    assert.deepEqual(await toggled.json(), { enabled: true });
    assert.deepEqual((await fetch(`${base}/api/state`).then((response) => response.json())).ripley, { enabled: true });

    const html = await fetch(`${base}/preview/project/index.html`);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-type'), /^text\/html/);
    const csp = html.headers.get('content-security-policy');
    assert.match(csp, /^sandbox allow-scripts; default-src 'none';/, 'scripts run, but in an opaque origin');
    assert.ok(!/allow-same-origin/.test(csp) && !/allow-forms/.test(csp) && !/allow-top-navigation/.test(csp), 'no origin, no forms, no way up');
    assert.match(csp, new RegExp(`script-src 'unsafe-inline' http://127\\.0\\.0\\.1:${server.address().port};`), 'project scripts only through MADRE');
    assert.match(csp, /connect-src 'none'/, 'no network from inside');
    assert.equal(html.headers.get('referrer-policy'), 'no-referrer');
    const page = await html.text();
    assert.match(page, /<h1>Hello<\/h1>/);
    assert.match(page, /^<script data-ripley>/, 'the bridge leads a page without <head>');
    assert.equal(Number(html.headers.get('content-length')), Buffer.byteLength(page), 'length counts the bridge');
    await writeFile(join(project, 'headed.html'), '<!doctype html><html><head><title>T</title></head><body>x</body></html>');
    const headed = await fetch(`${base}/preview/project/headed.html`).then((response) => response.text());
    assert.match(headed, /<head><script data-ripley>[\s\S]*<\/script><title>T<\/title>/, 'the bridge goes first inside <head>');
    assert.equal((headed.match(/data-ripley/g) ?? []).length, 1);
    assert.match(headed, /postMessage/);
    const svg = await fetch(`${base}/preview/project/logo.svg`);
    assert.match(svg.headers.get('content-type'), /^image\/svg\+xml/);
    // Assets a page links relatively are served on the same route, without a page policy.
    const js = await fetch(`${base}/preview/project/app.js`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal(await js.text(), 'console.log(1)', 'assets are never touched');
    assert.equal(js.headers.get('content-security-policy'), null);
    assert.equal((await fetch(`${base}/preview/project/../outside.html`)).status, 404);
    assert.equal((await fetch(`${base}/preview/project/..%2Foutside.html`)).status, 404);

    const back = await fetch(`${base}/api/extensions/ripley/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((response) => response.json());
    assert.deepEqual(back, { enabled: false });
    assert.equal((await fetch(`${base}/preview/project/index.html`)).status, 412);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

import { guardForbidden, forbiddenTargets } from '../src/room/guard.mjs';
import { writeFile as writeFileG, mkdir as mkdirG, stat as statG } from 'node:fs/promises';

test('CONTROL guard: .env files and MADRE folders are read-only while the turn runs and writable again after', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-guard-'));
  try {
    await writeFileG(join(root, '.env'), 'SECRET=1');
    await mkdirG(join(root, 'api'), { recursive: true });
    await writeFileG(join(root, 'api', '.env.local'), 'X=1');
    await mkdirG(join(root, '.pulse', 'out'), { recursive: true });
    await mkdirG(join(root, 'node_modules', 'x'), { recursive: true });
    await writeFileG(join(root, 'node_modules', 'x', '.env'), 'ignored');
    await writeFileG(join(root, 'app.js'), 'ok');
    const targets = (await forbiddenTargets(root)).map((t) => t.path.slice(root.length + 1)).sort();
    assert.deepEqual(targets, ['.env', '.pulse', 'api/.env.local']);
    const guard = await guardForbidden(root);
    assert.deepEqual([...guard.locked].sort(), ['.env', '.pulse/', 'api/.env.local']);
    await assert.rejects(writeFileG(join(root, '.env'), 'SECRET=2'), /EACCES|EPERM/);
    await assert.rejects(writeFileG(join(root, '.pulse', 'new.txt'), 'x'), /EACCES|EPERM/);
    await writeFileG(join(root, 'app.js'), 'still writable');
    await guard.release();
    await writeFileG(join(root, '.env'), 'SECRET=3');
    await writeFileG(join(root, '.pulse', 'new.txt'), 'x');
    assert.equal(((await statG(join(root, '.env'))).mode & 0o200) !== 0, true, 'write bit is back');
    const again = await guardForbidden(root);
    await again.release();
  } finally {
    await guardForbidden(root).then((g) => g.release()).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});

test('the archive counts what it is actually asked for: a recalled memory carries its own history', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-recall-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 1; i <= 8; i += 1) {
      await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'user' : 'assistant', sender: i % 2 ? 'you' : 'codex', target: 'you', text: `the webhook verifies the stripe signature, note ${i}` });
    }
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    memory.addMemories([
      { kind: 'decision', text: 'The webhook verifies the Stripe signature before parsing.', sources: [2] },
      { kind: 'fact', text: 'The banner uses the phosphor green of the brand.', sources: [4] },
    ], { agent: 'gemini', fromSequence: 1, throughSequence: 8 });

    const before = memory.memories({ limit: 10 });
    assert.deepEqual(before.map((note) => note.recalled), [0, 0], 'nothing has been asked for yet');
    assert.equal(before.every((note) => note.lastRecalled === null), true);

    // Three turns lean on the same decision; the other note is never needed.
    for (let turn = 0; turn < 3; turn += 1) memory.recallMemories('what did we decide about the stripe webhook signature?', { limit: 3, fallback: false });
    const after = memory.memories({ limit: 10 });
    const decision = after.find((note) => note.kind === 'decision');
    const unused = after.find((note) => note.kind === 'fact');
    assert.equal(decision.recalled, 3, 'the room counted every time it reached for this one');
    assert.ok(decision.lastRecalled && !Number.isNaN(Date.parse(decision.lastRecalled)));
    assert.equal(unused.recalled, 0, 'a memory nobody needed stays at zero');

    // Reading the archive is not using it: NOSTROMO must not inflate what it shows.
    memory.recallMemories('stripe webhook', { limit: 3, fallback: false, track: false });
    assert.equal(memory.memories({ limit: 10 }).find((note) => note.kind === 'decision').recalled, 3);
    memory.close();

    // The counters survive: they live in the notes, which a rebuild keeps.
    const again = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(again.memories({ limit: 10 }).find((note) => note.kind === 'decision').recalled, 3);
    again.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('memory: an aberration is kept, is never recalled, and takes what it refutes out of circulation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-aberration-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 1; i <= 10; i += 1) {
      await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'user' : 'assistant', sender: i % 2 ? 'you' : 'codex', target: 'you', text: `the stripe webhook and its signature, note ${i}` });
    }
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    memory.addMemories([
      { kind: 'fact', text: 'The webhook verifies the Stripe signature after parsing the body.', sources: [2] },
      { kind: 'fact', text: 'The Stripe webhook endpoint answers on /hooks/stripe.', sources: [4] },
    ], { agent: 'codex', fromSequence: 1, throughSequence: 10 });

    const before = memory.recallMemories('stripe webhook signature', { limit: 6, fallback: false });
    assert.equal(before.length, 2, 'both facts stand before anything is refuted');

    // The room finds out the first one is false.
    const wrong = memory.memories({ limit: 10 }).find((note) => /after parsing/.test(note.text));
    const flagged = memory.flagAberration({
      text: 'The webhook verifies the Stripe signature after parsing the body.',
      correction: 'It verifies the signature before parsing anything.',
      contradicts: wrong.id, sources: [2], detector: 'eyecat', confidence: 0.82,
    });
    assert.ok(flagged?.id, 'the aberration was not filed');
    assert.equal(flagged.refuted, wrong.id);

    // Neither the false claim nor the note it refutes may travel into a turn again.
    const after = memory.recallMemories('stripe webhook signature', { limit: 6, fallback: false });
    assert.equal(after.length, 1, 'a refuted note or an aberration reached a turn');
    assert.match(after[0].text, /\/hooks\/stripe/);
    // Not even by meaning: a search that matches the wording exactly must still come back empty.
    assert.equal(memory.recallMemories('verifies the signature after parsing the body', { limit: 6, fallback: false }).length, 0);
    // Nor through the fallback, which hands over recent decisions when a search finds little.
    memory.addMemories([{ kind: 'decision', text: 'Signature checks run before any parsing.', sources: [6] }], { agent: 'you', fromSequence: 1, throughSequence: 10 });
    const fell = memory.recallMemories('zzzz nothing matches this', { limit: 6, fallback: true });
    assert.ok(!fell.some((note) => /after parsing the body/.test(note.text)), 'the fallback handed over a refuted note');

    // But it is kept, with everything needed to train against it.
    const kept = memory.aberrations();
    assert.equal(kept.length, 1);
    assert.equal(kept[0].correction, 'It verifies the signature before parsing anything.');
    assert.equal(kept[0].detector, 'eyecat');
    assert.equal(kept[0].contradicts, wrong.id);
    assert.match(kept[0].contradictsText, /after parsing/);

    // Filing the same claim twice does not double it.
    assert.equal(memory.flagAberration({ text: 'The webhook verifies the Stripe signature after parsing the body.', contradicts: wrong.id }), null);

    // And being wrong about being wrong is reversible: the note stands again.
    const cleared = memory.clearAberration(flagged.id);
    assert.equal(cleared.restored, wrong.id);
    assert.equal(memory.aberrations().length, 0);
    const back = memory.recallMemories('stripe webhook signature', { limit: 6, fallback: false });
    assert.ok(back.some((note) => /after parsing the body/.test(note.text)), 'clearing an aberration did not put the note back');
    memory.close();

    // The columns survive a reopen, because they are added in place like the others.
    const again = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(again.memories({ limit: 10 }).every((note) => note.refutedBy === null), true);
    again.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('memory: an aberration the archivist files takes down the note that says the same thing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-wire-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 1; i <= 8; i += 1) await store.append('message.created', { messageId: `m${i}`, role: 'user', sender: 'you', target: 'codex', text: `the lab test server and its default port, note ${i}` });
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);

    memory.addMemories([
      { kind: 'fact', text: 'The lab starts its test server on port 7100 by default.', sources: [1] },
      { kind: 'fact', text: 'The lab keeps its backups in the backups/daily folder.', sources: [2] },
    ], { agent: 'ollama', fromSequence: 1, throughSequence: 8 });

    // The archivist hears the correction and files the false claim. It cannot name an id, so the
    // store has to find what the claim refutes on its own, or the room keeps handing it out.
    memory.addMemories([
      { kind: 'aberration', text: 'The lab starts its test server on port 7100 by default, not another.', correction: 'It starts on port 8200.', sources: [5] },
    ], { agent: 'ollama', fromSequence: 1, throughSequence: 8 });

    const all = memory.memories({ limit: 10 });
    const aberration = all.find((note) => note.kind === 'aberration');
    const wrong = all.find((note) => /port 7100 by default\.$/.test(note.text));
    const unrelated = all.find((note) => /backups/.test(note.text));
    assert.equal(aberration.contradicts, wrong.id, 'the aberration was filed without naming what it refutes');
    assert.equal(wrong.refutedBy, aberration.id, 'the false note is still standing');
    assert.equal(unrelated.refutedBy, null, 'an unrelated note was taken down with it');

    // And that is the whole point: the claim stops reaching turns.
    const reached = memory.recallMemories('what port does the lab test server start on', { limit: 6, fallback: false, track: false });
    assert.ok(!reached.some((note) => /7100/.test(note.text)), 'the room is still handing out a claim it recorded as false');
    assert.ok(reached.some((note) => /backups/.test(note.text)), 'everything else stopped travelling too');

    // A claim about something else entirely takes nothing down, however it is worded.
    memory.addMemories([{ kind: 'aberration', text: 'The lab compiles a Rust core with cargo every night.', sources: [6] }], { agent: 'ollama', fromSequence: 1, throughSequence: 8 });
    const loose = memory.memories({ limit: 10 }).find((note) => /Rust core/.test(note.text));
    assert.equal(loose.contradicts, null, 'an aberration about something else took a note down');
    assert.equal(memory.memories({ limit: 10 }).filter((note) => note.refutedBy !== null).length, 1);

    // Clearing it puts the note back, wired or not.
    memory.clearAberration(aberration.id);
    assert.equal(memory.memories({ limit: 10 }).find((note) => note.id === wrong.id).refutedBy, null);
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
