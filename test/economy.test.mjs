import test from 'node:test';
import assert from 'node:assert/strict';
import { turnCost, economy, ALWAYS, STABLE } from '../src/room/economy.mjs';
import { PROMPT_BLOCKS } from '../src/room/prompt.mjs';

const parts = (sizes) => Object.entries(sizes).map(([id, n]) => ({ id, text: 'x'.repeat(n) }));

test('economy: a turn is weighed by what it was made of, against what it was charged', () => {
  const cost = turnCost(
    parts({ room: 100, who: 20, mode: 80, inspect: 60, style: 40, privacy: 400, ask: 50, lease: 1500, delegation: 1400, memories: 300 }),
    { inputTokens: 1000, cachedInputTokens: 3000, cacheCreationInputTokens: 200, outputTokens: 500 },
  );
  assert.equal(cost.chars, 3950);
  // The fixed part is what every turn pays whatever is asked; the rest is what its shape carried.
  assert.equal(cost.fixed, 750);
  assert.equal(cost.carried, 3200);
  assert.equal(cost.blocks.lease, 1500);

  assert.equal(cost.input, 1000);
  assert.equal(cost.cached, 3000);
  assert.equal(cost.created, 200);
  assert.equal(cost.output, 500);
  // Three quarters of what it read came back from its own cache, which is the number every
  // change to the order of a prompt has to move.
  assert.equal(cost.cacheShare, 0.75);
  assert.equal(cost.charsPerInputToken, 3.95);

  // A turn nobody charged for is still measured; it just has no ratio to report.
  const free = turnCost(parts({ room: 100, ask: 20 }), null);
  assert.equal(free.chars, 120);
  assert.equal(free.input, 0);
  assert.equal(free.charsPerInputToken, null);
  assert.equal(free.cacheShare, null);

  // Nothing empty and nothing unnamed reaches the reading.
  const noisy = turnCost([{ id: 'room', text: 'abc' }, { id: 'mode', text: '' }, { text: 'orphan' }, null]);
  assert.deepEqual(noisy.blocks, { room: 3 });
});

test('economy: the stable head is made only of blocks that exist and never vary', () => {
  for (const id of STABLE) assert.ok(PROMPT_BLOCKS.includes(id), `${id} is held to be stable but is not a block`);
  // What is stable and what is charged to every turn are different questions. The mode is paid
  // by every turn and changes between them; @madre never changes and is not paid by all.
  assert.ok(ALWAYS.has('mode') && !STABLE.includes('mode'), 'the mode is being treated as unchanging');
  assert.ok(STABLE.includes('madre') && !ALWAYS.has('madre'), 'the room is charging every turn for a block it does not always send');
});

test('economy: every block a prompt can carry is one the reading knows', () => {
  // The two lists are written apart, so one can outgrow the other without anyone noticing. A
  // block the reading has never heard of would land in "carried" and nobody would ask why.
  for (const id of ALWAYS) assert.ok(PROMPT_BLOCKS.includes(id), `${id} is charged to every turn but is not a block`);
  // And what is always sent is the identity of the room and the question, never its machinery.
  for (const id of ['lease', 'delegation', 'sdk', 'memory-server', 'memories', 'recall', 'context']) {
    assert.ok(!ALWAYS.has(id), `${id} is counted as fixed, so trimming it would look like no saving`);
  }
});

test('economy: many turns read together say where a room spends', () => {
  const turn = (agent, blocks, usage) => ({ type: 'turn.cost', payload: { agent, ...turnCost(parts(blocks), usage) } });
  const read = economy([
    { type: 'message.created', payload: {} },
    turn('codex', { room: 100, ask: 40, lease: 1500, sdk: 560 }, { inputTokens: 600, cachedInputTokens: 400, outputTokens: 200 }),
    turn('codex', { room: 100, ask: 40, lease: 1500, sdk: 560 }, { inputTokens: 500, cachedInputTokens: 900, outputTokens: 150 }),
    turn('claude', { room: 100, ask: 40, context: 9000 }, { inputTokens: 2400, cachedInputTokens: 0, outputTokens: 900 }),
    { type: 'turn.cost', payload: null },
  ]);

  assert.equal(read.turns, 3);
  // The heaviest block first: this is the whole point of the view.
  assert.equal(read.blocks[0].id, 'context');
  assert.equal(read.blocks[0].turns, 1, 'a block is counted against the turns that carried it');
  assert.equal(read.blocks.find((block) => block.id === 'lease').perTurn, 1500);
  assert.equal(read.blocks.find((block) => block.id === 'room').always, true);

  // Per agent, so a cheap model doing the heavy reading is visible.
  assert.equal(read.agents[0].agent, 'claude');
  assert.equal(read.agents[0].cacheShare, 0);
  assert.ok(read.agents.find((agent) => agent.agent === 'codex').cacheShare > 0.4);

  assert.equal(read.totals.input, 3500);
  assert.equal(read.totals.output, 1250);
  assert.ok(read.totals.fixedShare < 0.05, 'the fixed briefing is being counted as most of the room');
  // And how much of what the room sent could have come back from a cache, which is the number
  // that says whether keeping the head of the prompt still was worth anything.
  assert.equal(typeof read.totals.prefixShare, 'number');
  assert.ok(read.totals.prefix > 0, 'no part of any turn was cacheable');
  assert.equal(economy([]).turns, 0);
  assert.deepEqual(economy([]).blocks, []);
});

test('economy: what was saved is what was not charged, and it is measured rather than claimed', async () => {
  const { sparedChars } = await import('../src/room/prompt.mjs');
  const turn = (blocks, usage, spared = 0) => ({ type: 'turn.cost', payload: { agent: 'codex', spared, ...turnCost(parts(blocks), usage) } });

  const read = economy([
    // Two turns that could have carried the SDK guide and did not, and one cache hit.
    turn({ room: 200, ask: 40, lease: 1500 }, { inputTokens: 500, cachedInputTokens: 1500, outputTokens: 300 }, 560),
    turn({ room: 200, ask: 40, lease: 1500 }, { inputTokens: 440, cachedInputTokens: 0, outputTokens: 200 }, 560),
  ]);

  // Cache reads are a measurement: the CLI said it did not charge them again.
  assert.equal(read.saved.cachedTokens, 1500);
  assert.ok(read.saved.cachedShare > 0.6);
  // What was never sent is counted in characters, the unit the room controls, and turned into
  // tokens at the rate this room's own turns have shown rather than at a guessed one.
  assert.equal(read.saved.unsentChars, 1120);
  const rate = read.totals.chars / read.totals.input;
  assert.equal(read.saved.unsentTokens, Math.round(1120 / rate));
  assert.equal(read.saved.tokens, read.saved.cachedTokens + read.saved.unsentTokens);

  // A room where nothing was cached and nothing was withheld saves nothing, and says so.
  const plain = economy([turn({ room: 200, ask: 40 }, { inputTokens: 300, cachedInputTokens: 0, outputTokens: 100 }, 0)]);
  assert.equal(plain.saved.tokens, 0);
  assert.equal(plain.saved.cachedShare, 0);
  assert.equal(plain.saved.unsentChars, 0);

  // And the withheld block is measured, not assumed: the same text, built and left out.
  const options = {
    agent: { id: 'codex' }, text: 'arregla el router', requester: 'you', depth: 0, allowDelegation: false,
    context: { messages: [], omittedMessages: 0 }, others: [], mode: 2,
    lease: { outDir: '.pulse/out', scopes: {}, create: true, scratchDir: 't' }, sdk: { guide: 'docs/SDK.md', example: 'docs/sdk/hello-module.mjs' },
  };
  const withheld = sparedChars(options);
  assert.ok(withheld > 300, `the withheld guide measured ${withheld} characters`);
  // Asked for, nothing is withheld, because nothing was left out.
  assert.equal(sparedChars({ ...options, text: 'hazme un modulo' }), 0);
  // And with no lease there was never a guide to withhold in the first place.
  assert.equal(sparedChars({ ...options, lease: null }), 0);
});

test('economy: the room learns what its own words cost, and says nothing until it has been billed', async () => {
  const { observedRate, RATE_WINDOW } = await import('../src/room/economy.mjs');
  const turn = (chars, input) => ({ type: 'turn.cost', payload: { chars, input } });

  // A room that has never been charged has no rate, and inventing one would be worse than
  // saying so: every model counts differently and every room writes differently.
  assert.equal(observedRate([]), null);
  assert.equal(observedRate([{ type: 'message.created', payload: {} }]), null);
  assert.equal(observedRate([turn(4000, 0)]), null, 'a turn nobody charged for taught the room a rate');

  // With bills, it is plain arithmetic over this room's own turns.
  assert.equal(observedRate([turn(4000, 1000), turn(2000, 500)]), 4);
  // Only the recent ones: a room that changed models should not be priced by what it used to be.
  const old = Array.from({ length: RATE_WINDOW }, () => turn(8000, 1000));
  const now = Array.from({ length: RATE_WINDOW }, () => turn(3000, 1000));
  assert.equal(observedRate([...old, ...now]), 3, 'the rate is still being set by turns long past');
});

test('economy: a turn says what it is reading while it reads it, and is never written down for it', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { EventStore } = await import('../src/event-store.mjs');
  const { Room } = await import('../src/room.mjs');

  const root = await mkdtemp(join(tmpdir(), 'pulse-reading-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
    const room = new Room({ store, agents, projectRoot: root, invokers: { 'codex-readonly': async () => ({ text: 'Listo.', usage: { inputTokens: 400, outputTokens: 50, totalTokens: 450 } }) } });
    const live = [];
    room.subscribeLive((event) => live.push(event));

    await room.send({ text: 'revisa el router', target: 'codex' });

    const reading = live.find((event) => event.type === 'turn.reading');
    assert.ok(reading, 'the room never said what it was about to read');
    assert.equal(reading.payload.agent, 'codex');
    assert.ok(reading.payload.chars > 500, 'the reading reports no size');
    // The first turn of a room has nothing to convert by, and says so rather than guessing.
    assert.equal(reading.payload.tokens, null);
    assert.equal(reading.payload.rate, null);

    // It is a reading, not a fact: nothing about it reaches the ledger, and it spends no
    // sequence number, so everything said after it keeps the place it would have had.
    const written = await store.readAll();
    assert.ok(!written.some((event) => event.type === 'turn.reading'), 'a live reading was written to the ledger');
    assert.equal(reading.sequence, null);
    assert.equal(reading.live, true);
    const sequences = written.filter((event) => Number.isInteger(event.sequence)).map((event) => event.sequence);
    assert.deepEqual(sequences, sequences.map((_, i) => i + 1), 'the ledger skipped a sequence');

    // Once billed, the room knows its own rate and the next turn can say what it will cost.
    await room.send({ text: 'y ahora el resto', target: 'codex' });
    const second = live.filter((event) => event.type === 'turn.reading').at(-1);
    assert.ok(second.payload.rate > 0, 'the room did not learn from its own bill');
    assert.equal(second.payload.tokens, Math.round(second.payload.chars / second.payload.rate));
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('economy: the answer is counted as it is written, and a silent CLI reports nothing', async () => {
  const { parseCodexOutput } = await import('../src/adapters/codex.mjs');

  // Codex says what it is writing as it writes it, in events. What must be counted is the answer
  // itself: counting raw output would be counting the shape of its own protocol.
  const partial = [
    '{"type":"item.started","item":{"type":"agent_message"}}',
    '{"type":"item.completed","item":{"type":"agent_message","text":"El router monta /api primero."}}',
  ].join('\n');
  assert.equal(parseCodexOutput(partial).text.length, 'El router monta /api primero.'.length);
  assert.equal(parseCodexOutput(partial).usage, null, 'a half-finished turn reported a bill');
  // The protocol around it is many times the answer, which is why it is not what gets counted.
  assert.ok(partial.length > parseCodexOutput(partial).text.length * 2);

  // Half a line of JSON does not break the count; it is simply not counted yet.
  assert.equal(parseCodexOutput(`${partial}\n{"type":"item.comp`).text.length, 'El router monta /api primero.'.length);
  assert.equal(parseCodexOutput('').text, '');
});
