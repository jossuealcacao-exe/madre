import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPrompt, promptParts, PROMPT_BLOCKS, wantsModule } from '../src/room/prompt.mjs';

// Seven shapes of turn, frozen as they were before any of this was measured or moved. Every
// change to the economy of a prompt has to prove it changed nothing an agent reads, so these are
// compared byte for byte. Rebuild them on purpose with test/fixtures/build-golden.mjs.
const { STABLE: STABLE_HEAD } = await import('../src/room/economy.mjs');
const shapes = await readFile(join(import.meta.dirname, 'fixtures', 'prompt-golden.json'), 'utf8').then(JSON.parse);

const agent = { id: 'codex' };
const others = [{ id: 'claude' }, { id: 'gemini' }, { id: 'madre' }];
const context = { messages: [{}, {}], omittedMessages: 3, text: 'irrelevant' };
const given = {
  bare: { agent, text: 'hola', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 1 },
  loaded: {
    agent, text: 'revisa el router', requester: 'you', depth: 0, allowDelegation: true, context, others, mode: 2,
    memoryServer: { name: 'pulse-memory' }, madreModel: 'madre-pulse:latest',
    sdk: { guide: 'docs/SDK.md', example: 'docs/sdk/hello-module.mjs' },
    lease: { outDir: '.pulse/out', scopes: { web: true }, create: true, scratchDir: 'turn-1' },
    scopes: { web: true }, scopesFor: () => ({ web: true }), maxPlanSteps: 4,
    memories: [{ kind: 'fact', text: 'Una memoria.', fromSequence: 1, throughSequence: 2 }],
    recall: { entries: [{ sequence: 4, sender: 'codex', role: 'assistant', text: 'Una cita.' }] },
    mcpServers: [{ name: 'playwright', brief: 'a browser' }],
    motherLines: [{ at: '12:00', kind: 'limit', text: 'algo' }],
    attachments: [{ path: 'a.png', contentType: 'image/png', size: 10 }],
    references: [{ path: 'src/x.mjs', contentType: 'text/plain', size: 20, lines: { from: 1, to: 3 } }],
  },
  ghost: { agent, text: 'secreto', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 0 },
  delegated: { agent, text: 'haz el paso', requester: 'codex', depth: 1, allowDelegation: false, context, others: [], mode: 1, sharedLeaseHint: 'comparten el lease' },
  mother: { agent, text: 'atencion', requester: 'mother', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 1 },
  control: { agent, text: 'arregla', requester: 'you', depth: 0, allowDelegation: false, context, others: [], mode: 3, lease: { outDir: '.pulse/out', scopes: {}, control: true }, controlHolder: 'claude', escalation: 'declined' },
  airlock: { agent, text: 'despliega', requester: 'you', depth: 0, allowDelegation: false, context, others: [], mode: 4, lease: { outDir: '.pulse/out', scopes: {}, airlock: true } },
};

test('prompt: what an agent reads has not moved by a single byte', () => {
  assert.deepEqual(Object.keys(given).sort(), Object.keys(shapes).sort(), 'a shape of turn is no longer covered');
  for (const [name, opts] of Object.entries(given)) {
    assert.equal(buildPrompt(opts), shapes[name], `the ${name} turn now reads differently`);
  }
});

test('prompt: it is built from named blocks, and the blocks are exactly the prompt', () => {
  for (const [name, opts] of Object.entries(given)) {
    const parts = promptParts(opts);
    // Nothing unnamed, nothing empty, nothing repeated: a block that cannot be named cannot be
    // measured, and measuring is the whole reason for taking it apart.
    for (const part of parts) {
      assert.ok(part.id, `an unnamed block in the ${name} turn`);
      assert.ok(PROMPT_BLOCKS.includes(part.id), `${part.id} is not a known block`);
      assert.ok(part.text && part.text.trim(), `${part.id} is empty in the ${name} turn`);
    }
    const ids = parts.map((part) => part.id);
    assert.equal(new Set(ids).size, ids.length, `a block appears twice in the ${name} turn`);
    // And the parts are the prompt: no block is dropped in the joining, none added.
    assert.equal(parts.map((part) => part.text).join('\n'), shapes[name], `the ${name} turn is not the sum of its blocks`);
  }
});

test('prompt: the blocks a turn cannot use are not built for it', () => {
  const bare = promptParts(given.bare).map((part) => part.id);
  // A turn with no lease, no delegation and no memory carries none of their instructions. This
  // is what makes trimming possible later: the shape of a turn already decides what it reads.
  for (const absent of ['lease', 'delegation', 'abilities', 'memory-server', 'sdk', 'memories', 'recall']) {
    assert.ok(!bare.includes(absent), `a bare turn is still carrying the ${absent} block`);
  }
  const loaded = promptParts(given.loaded).map((part) => part.id);
  for (const present of ['lease', 'delegation', 'abilities', 'memory-server', 'memories', 'recall', 'context', 'ask']) {
    assert.ok(loaded.includes(present), `a loaded turn is missing the ${present} block`);
  }
  // How to write a module is long, and only ever of use when someone is asking for one. A turn
  // about anything else does not carry it, however much else it is allowed to do.
  assert.ok(!loaded.includes('sdk'), 'a turn that was not about a module carried the SDK guide');
  for (const asking of ['hazme un modulo para esto', 'write a MADRE module', 'quiero un slash command', 'read the SDK first', 'a plugin that reads jira']) {
    assert.ok(wantsModule(asking), `"${asking}" was not read as asking for a module`);
    assert.ok(promptParts({ ...given.loaded, text: asking }).some((part) => part.id === 'sdk'), `"${asking}" did not get the SDK guide`);
  }
  for (const not of ['revisa el router', 'arregla el bug del puerto', 'modulo'.slice(0, 3), 'summarise the thread']) {
    assert.ok(!wantsModule(not) || promptParts({ ...given.loaded, text: not }).some((part) => part.id === 'sdk'));
  }
  assert.ok(!wantsModule('revisa el router y el modal de settings'), 'a modal was read as a module');
  // Every turn says who is asking, whatever else it carries.
  for (const name of Object.keys(given)) {
    assert.ok(promptParts(given[name]).some((part) => part.id === 'ask'), `the ${name} turn never asks anything`);
  }
});

test('prompt: the fixture is rebuilt by a script that runs anywhere, and never from inside the suite', async () => {
  const { readdir } = await import('node:fs/promises');
  // Everything under test/ is run as a test. A helper living there ran on this machine and
  // nowhere else, and the suite passed locally for the wrong reason while CI could not resolve
  // a single import. It lives in scripts/ now.
  const inTests = await readdir(join(import.meta.dirname, 'fixtures'));
  assert.deepEqual(inTests.filter((name) => name.endsWith('.mjs')), [], 'something runnable is sitting under test/fixtures');

  const script = await readFile(join(import.meta.dirname, '..', 'scripts', 'build-prompt-golden.mjs'), 'utf8');
  assert.ok(!/\/Users\/|\/home\/|[A-Z]:\\\\/.test(script), 'the fixture builder only runs on one machine');
  assert.match(script, /import\.meta\.url/, 'the fixture builder does not resolve its own paths');
});

test('prompt: what never changes is read first, so a cache has the longest run to match', async () => {
  const { STABLE, stablePrefix } = await import('../src/room/economy.mjs');

  // The head of every prompt is the part that reads the same on every turn of this agent in this
  // room. One differing byte early throws away everything after it, so anything that can vary
  // belongs behind them however short it is.
  assert.deepEqual(PROMPT_BLOCKS.slice(0, STABLE.length), STABLE, 'something that varies has moved into the stable head');
  for (const varying of ['mode', 'inspect', 'ash', 'mother', 'lease', 'context', 'ask']) {
    assert.ok(!STABLE.includes(varying), `${varying} changes between turns and cannot be part of the stable head`);
  }

  // Two turns of the same agent in the same room, as different as the room allows: same agent,
  // different question, different mode, one with a lease and one without.
  const agent = { id: 'codex' };
  const others = [{ id: 'claude' }, { id: 'madre' }];
  const base = { agent, requester: 'you', depth: 0, allowDelegation: true, context: { messages: [], omittedMessages: 0 }, others, memoryServer: { name: 'p' }, madreModel: 'm', maxPlanSteps: 4, scopesFor: () => ({}) };
  const one = promptParts({ ...base, text: 'una pregunta', mode: 1 });
  const two = promptParts({ ...base, text: 'otra distinta y mas larga', mode: 2, lease: { outDir: '.pulse/out', scopes: {}, create: true } });

  let shared = 0;
  for (let i = 0; i < Math.min(one.length, two.length); i += 1) {
    if (one[i].id !== two[i].id || one[i].text !== two[i].text) break;
    shared += one[i].text.length + (i > 0 ? 1 : 0);
  }
  assert.ok(shared > 1500, `only ${shared} characters are shared between two turns, so almost nothing can be cached`);
  // And what the room reports as cacheable is what is actually shared, not a hopeful guess.
  assert.equal(stablePrefix(one), shared);
  assert.equal(stablePrefix(two), shared);

  // A different agent shares less, because it is told who it is: its own cache, its own prefix.
  const elsewhere = promptParts({ ...base, agent: { id: 'claude' }, text: 'una pregunta', mode: 1 });
  assert.notEqual(elsewhere[1].text, one[1].text, 'two agents are being told they are the same one');

  // The head stops at the first block that can vary, wherever that falls.
  assert.equal(stablePrefix([{ id: 'room', text: 'abc' }, { id: 'mode', text: 'xyz' }, { id: 'who', text: 'ignored' }]), 3);
  assert.equal(stablePrefix([{ id: 'mode', text: 'abc' }]), 0);
  assert.equal(stablePrefix([]), 0);
});

test('prompt: @madre reads the briefing by shape, and the shape still holds', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'src', 'adapters', 'madre.mjs'), 'utf8');
  // @madre is the one agent that takes the room's briefing apart instead of just reading it: it
  // pulls the transcript out to answer from, and the human's question to answer. Both are found
  // by pattern, so moving a block can break it silently. Nothing guarded that until now.
  const patterns = [...source.matchAll(/prompt\.match\((\/.*?\/)\)/g)].map((match) => match[1]);
  assert.equal(patterns.length, 2, `@madre reads ${patterns.length} things out of the briefing; this test knows about two`);

  const agent = { id: 'codex' };
  const built = buildPrompt({
    agent, text: 'en que puerto abre la sala', requester: 'you', depth: 0, allowDelegation: true,
    context: { messages: [{}], omittedMessages: 2, text: 'x' }, others: [{ id: 'claude' }], mode: 2,
    memoryServer: { name: 'p' }, madreModel: 'm', maxPlanSteps: 4, scopesFor: () => ({}),
    lease: { outDir: '.pulse/out', scopes: {}, create: true, scratchDir: 't' },
    memories: [{ kind: 'fact', text: 'Una memoria.', fromSequence: 1, throughSequence: 2 }],
    recall: { entries: [{ sequence: 4, sender: 'codex', role: 'assistant', text: 'Una cita.' }] },
    attachments: [{ path: 'a.png', contentType: 'image/png', size: 10 }],
    references: [{ path: 'src/x.mjs', contentType: 'text/plain', size: 20 }],
  });

  // The transcript comes out whole, found by its own tags rather than by where it sits.
  const transcript = built.match(new Function(`return ${patterns[0]}`)());
  assert.ok(transcript?.[1], '@madre can no longer find the transcript in the briefing');

  // The question is anchored to the end of the briefing, so whatever else moves, the human's
  // message stays last. Everything after it would be read as part of the question.
  const question = built.match(new Function(`return ${patterns[1]}`)());
  assert.equal(question?.[1], 'en que puerto abre la sala', '@madre would answer the wrong question');
  assert.equal(PROMPT_BLOCKS.at(-1), 'ask', 'something was put after the human message');
  assert.ok(built.endsWith('en que puerto abre la sala'), 'the briefing no longer ends with what was asked');
});

test('prompt: the crew writes in the language the human writes in', () => {
  // Until now nothing said it. Agents answered in Spanish only because the human wrote Spanish
  // and a model mirrors what it reads — which is a habit, not a rule, and it breaks on the turns
  // that carry the most English around them: a delegated step, a plan, a room full of paths.
  const style = promptParts(given.bare).find((part) => part.id === 'style');
  assert.match(style.text, /in the language the human is writing in/);
  // And it says what is not to be translated. This is a room for working on code.
  assert.match(style.text, /keep code, paths, commands and identifiers exactly as they are/);
  // It rides the block that was already there: no new block, so nothing about the document's
  // shape moves — the core still reads the same ids, in the same order, from the same places.
  assert.equal(PROMPT_BLOCKS.filter((id) => id === 'style').length, 1);
  assert.equal(promptParts(given.bare).filter((part) => part.id === 'style').length, 1);
  // It is in the stable head, so it is the same bytes on every turn and costs the cache nothing.
  assert.ok(STABLE_HEAD.includes('style'), 'the language rule varies between turns');
});
