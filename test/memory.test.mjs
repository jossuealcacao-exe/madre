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

    assert.deepEqual(Object.keys(room.memoryStats()), ['entries', 'lastSequence', 'memories', 'lastDistilled', 'pending', 'distill', 'file']);
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
