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
