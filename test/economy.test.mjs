import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { turnCost, economy, ALWAYS, STABLE, CH_PER_TOKEN, tokensFor } from '../src/room/economy.mjs';
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
  // tokens at a stated estimate — never at the ratio this room measures. That ratio is what
  // MADRE wrote against what the CLIs were charged for READING, and a CLI is charged for its
  // own system prompt, its own tools and every file it opens; converting with it made the room
  // claim it had saved several times what it saved.
  assert.equal(read.saved.unsentChars, 1120);
  assert.equal(read.saved.unsentTokens, tokensFor(1120));
  assert.equal(read.saved.tokens, read.saved.cachedTokens + read.saved.unsentTokens);
  const measured = read.totals.chars / read.totals.input;
  assert.notEqual(Math.round(1120 / measured), read.saved.unsentTokens, 'the saved count still rides the measured ratio');
  // And the estimate is one number, in one place, however many screens print it.
  const page = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(page, new RegExp(`const CH_PER_TOKEN = ${CH_PER_TOKEN};`), 'the page estimates at a different rate than the room does');

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

test('economy: Ash is observed, never claimed as a saving', async () => {
  const { economy, ashObservation, ASH_MIN_TURNS } = await import('../src/room/economy.mjs');
  const turn = (agent, ash, output, extra = {}) => ({ type: 'turn.cost', payload: { agent, ash, output, input: 100, chars: 100, blocks: {}, ...extra } });

  // Below the floor there is no reading at all: a difference of two turns against one is noise
  // wearing a percentage sign, and printing it would be the fixed percentage the module refuses.
  const thin = economy([turn('claude', true, 300), turn('claude', false, 700)]);
  assert.equal(thin.ash.comparable, false);
  assert.equal(thin.ash.agents[0].delta, undefined, 'a difference was published without turns behind it');

  const events = [
    ...Array.from({ length: ASH_MIN_TURNS + 1 }, (_, i) => turn('claude', true, 300 + i * 10)),
    ...Array.from({ length: ASH_MIN_TURNS + 1 }, (_, i) => turn('claude', false, 700 + i * 10)),
  ];
  const read = economy(events).ash;
  assert.equal(read.comparable, true);
  const claude = read.agents.find((one) => one.agent === 'claude');
  assert.equal(claude.on.medianOutput, 325);
  assert.equal(claude.off.medianOutput, 725);
  assert.equal(claude.delta, 400);

  // The middle turn, not the average: one long answer must not speak for the rest.
  const skewed = ashObservation([
    ...Array.from({ length: ASH_MIN_TURNS }, () => ({ agent: 'codex', ash: true, output: 100 })),
    { agent: 'codex', ash: true, output: 100000 },
    ...Array.from({ length: ASH_MIN_TURNS }, () => ({ agent: 'codex', ash: false, output: 100 })),
  ]);
  assert.equal(skewed.agents[0].on.medianOutput, 100, 'one long turn was allowed to speak for the room');

  // A turn weighed before the room recorded the switch belongs to no side, and a failed turn
  // bought no answer: neither may lean the reading.
  const dirty = ashObservation([
    ...Array.from({ length: ASH_MIN_TURNS }, () => ({ agent: 'gemini', ash: true, output: 200 })),
    ...Array.from({ length: ASH_MIN_TURNS }, () => ({ agent: 'gemini', ash: false, output: 800 })),
    { agent: 'gemini', output: 9000 },
    { agent: 'gemini', ash: true, output: 9000, failed: true },
  ]);
  const gemini = dirty.agents.find((one) => one.agent === 'gemini');
  assert.equal(gemini.on.turns, ASH_MIN_TURNS);
  assert.equal(gemini.off.turns, ASH_MIN_TURNS);
  assert.equal(gemini.on.medianOutput, 200);
});

test('routing: the room offers itself only for questions its own archive answers', async () => {
  const { archiveQuestion } = await import('../public/routing.js');

  // Questions about what this room said, decided or left open: @madre reads the same archive and
  // bills nothing, so offering costs the human a glance and saves a whole turn.
  for (const asked of [
    '¿qué decidimos sobre el checkpoint?',
    '¿ya habíamos hablado de Windows?',
    '¿dónde nos quedamos con el puerto?',
    '¿por qué elegimos SQLite?',
    'what did we decide about the ledger?',
    'did we ever discuss caching?',
    'what is still open on the port?',
  ]) assert.ok(archiveQuestion(asked), `the room would have paid for "${asked}"`);

  // And never for anything else. A wrong offer is a paid agent the human did not get.
  for (const asked of [
    '¿cómo funciona src/room/guard.mjs?',           // needs the project read, not the archive
    'implementa el enrutador',                       // an instruction, however it is worded
    'create the file and run the tests',
    '@claude ¿qué decidimos?',                       // already addressed: the human chose
    'hola',
    '',
  ]) assert.equal(archiveQuestion(asked), null, `the room would have offered itself for "${asked}"`);
});

test('economy: a turn the room answered itself is counted, never priced', async () => {
  const { economy } = await import('../src/room/economy.mjs');
  const turn = (agent, output) => ({ type: 'turn.cost', payload: { agent, output, input: 10, cached: 0, chars: 100, blocks: {} } });
  const read = economy([turn('madre', 0), turn('madre', 0), turn('claude', 1800), turn('codex', 300), turn('gemini', 170)]);

  assert.equal(read.free.turns, 2);
  assert.equal(read.free.share, 0.4);
  // The scale beside the count is what the OTHER turns cost. A counterfactual price for these
  // ones would be a number nobody measured, which is the one thing this reading never prints.
  assert.equal(read.free.paidOutputMedian, 300, 'the median took the free turns into account');
  assert.ok(!('saved' in read.free) && !('wouldHaveCost' in read.free), 'the room put a price on a turn it never paid');
});

test('economy: a difference smaller than the room\'s own noise is not reported as an effect', async () => {
  const { ashObservation } = await import('../src/room/economy.mjs');
  const turns = (agent, ash, outputs) => outputs.map((output) => ({ agent, ash, output }));

  // The real numbers from a paired run against Claude: five turns each side, on the same five
  // questions. The medians differ, and the difference is smaller than how much the answers vary
  // from question to question. A reading that called that an effect would be an advertisement.
  const noisy = ashObservation([
    ...turns('claude', true, [1215, 3009, 2207, 1658, 1957]),
    ...turns('claude', false, [1725, 3907, 1403, 2258, 1467]),
  ]);
  const claude = noisy.agents[0];
  assert.equal(claude.comparable, true, 'five turns a side is enough to look');
  assert.equal(claude.readable, false, 'the room reported noise as an effect');
  assert.ok(Math.abs(claude.delta) < claude.on.spread + claude.off.spread);

  // And an effect that does clear the noise is reported, or the reading could only ever say no.
  const real = ashObservation([
    ...turns('codex', true, [400, 420, 390, 410, 405]),
    ...turns('codex', false, [1600, 1650, 1580, 1620, 1610]),
  ]);
  assert.equal(real.agents[0].readable, true, 'a difference far outside the spread went unreported');
  assert.ok(real.agents[0].share > 0.7);
})
