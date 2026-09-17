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
    const room = new Room({ store, agents, projectRoot: root, invokers, memory, contextMaxChars: 1200 });

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

    assert.deepEqual(Object.keys(room.memoryStats()), ['entries', 'lastSequence', 'file']);
    await room.shutdown?.();
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
