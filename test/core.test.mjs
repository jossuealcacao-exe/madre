import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { Room } from '../src/room.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');
const agents = [
  { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
  { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' },
];

test('core: the briefing is the document a turn would carry, and asking for it is not the room saying it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-core-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    for (let i = 0; i < 6; i += 1) await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'assistant' : 'user', sender: i % 2 ? 'codex' : 'you', target: i % 2 ? 'you' : 'codex', text: `exchange number ${i} about the webhook and its signature` });

    const briefing = await room.briefing({ agent: 'codex', mode: 1 });
    assert.equal(briefing.agent, 'codex');
    assert.ok(briefing.parts.length > 3, 'the document has no blocks');
    assert.ok(briefing.chars > 0);
    // Every block carries its own name, its own text and what it weighs: a number without the
    // words is the thing MADRE already had, and the words are the point.
    for (const part of briefing.parts) {
      assert.ok(part.id && typeof part.text === 'string' && part.text.length === part.chars, `${part.id} does not carry its own text`);
    }
    assert.equal(briefing.parts.reduce((sum, part) => sum + part.chars, 0), briefing.chars);
    // The room says who it is talking to, so the document is traceable to a turn.
    assert.match(briefing.parts.find((part) => part.id === 'who')?.text ?? '', /codex/i);
    // An agent nobody has on this computer has no briefing to show.
    assert.equal(await room.briefing({ agent: 'nobody' }), null);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('core: raising the mode shows the permission that would be given, written out', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-core-mode-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    const at = async (mode) => room.briefing({ agent: 'claude', mode });

    const exchange = await at(1);
    assert.equal(exchange.lease, false);
    assert.equal(exchange.parts.some((part) => part.id === 'lease'), false, 'a read-only turn was told it may create files');

    const create = await at(2);
    assert.equal(create.lease, true, 'a CREATE turn is shown without the permission it would be given');
    const lease = create.parts.find((part) => part.id === 'lease');
    assert.ok(lease && lease.text.length > 0);
    assert.ok(create.chars > exchange.chars, 'the document did not grow with the permission');
    // And nothing was created to show it: the folder is named, not made.
    assert.match(lease.text, /\.pulse\/out/);
    assert.equal(await readFile(join(root, '.pulse', 'out'), 'utf8').then(() => true, () => false), false);

    // The mode a turn actually answers at is the agent's own ceiling, and the preview says so.
    assert.equal(create.ceiling <= create.maxMode, true);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('core: the door is the star itself, and what is behind it is read and never written', async () => {
  const [page, app, css] = await Promise.all([read('index.html'), read('app.js'), read('styles.css')]);

  // The way in is the core inside NOSTROMO: clicking the star opens what MADRE says in your name.
  assert.match(app, /if \(at === 'core'\) \{ void openCore\(\); return; \}/);
  assert.match(page, /<dialog id="core" class="mother core"/);
  // The brand is the author's link and nothing else, exactly as it always was.
  assert.match(page, /<a class="brand" href="https:\/\/jossuealcala\.com\/en\/"/);
  assert.ok(!/brand-core/.test(page) && !/brand-core/.test(app), 'the brand is a door again');
  assert.ok(!/\.brand \{ border: 0/.test(css), 'the brand carries styling written for a button it is not');
  // And the star is not drawn twice: the frame opens over the real one, still turning behind.
  assert.ok(!/core-sun/.test(page) && !/core-sun/.test(css), 'a second sun is painted over the first');

  // It is read, never written, and it says so where somebody would look for the edit button.
  assert.match(app, /YOU CANNOT EDIT THIS\. WHAT MADRE PROMISES ABOUT THE CREW IS TRUE BECAUSE THESE WORDS ARE FIXED/);
  assert.ok(!/contenteditable/.test(app));
  // Nothing is stored and nothing is sent, and the counters are not touched by looking.
  assert.match(app, /BUILT NOW AND SENT NOWHERE/);
  assert.match(page, /BUILT NOW · STORED NOWHERE · SENT NOWHERE/);
  assert.match(app, /NONE OF THEM WAS COUNTED AS RECALLED/);

  // The backdrop lets the star through rather than covering it.
  assert.match(css, /\.core::backdrop \{[^}]*rgba\(30, 2, 0, \.58\)/);
});

test('core: the window it carries is a real range, and what it leaves behind is what recall is for', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-core-window-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 0; i < 24; i += 1) {
      await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'assistant' : 'user', sender: i % 2 ? 'codex' : 'you', target: i % 2 ? 'you' : 'codex', text: `exchange ${i}: ${'the webhook, the ledger and the banner, at some length. '.repeat(4)}` });
    }
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    const room = new Room({ store, agents, projectRoot: root, invokers: {}, memory, contextMaxChars: 1200 });

    const briefing = await room.briefing({ agent: 'codex', mode: 1 });
    // The field was read from a name the context object does not have, so this was always null.
    assert.equal(Number.isInteger(briefing.window.from), true);
    assert.equal(Number.isInteger(briefing.window.through), true, 'the window has no end, which is what a wrong field name looks like');
    assert.ok(briefing.window.through >= briefing.window.from);
    assert.equal(briefing.window.carried > 0, true);
    assert.equal(briefing.window.omitted > 0, true, 'a transcript far longer than the budget left nothing behind');
    await room.shutdown();
    memory.close();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('core: the document is built around what you are about to ask', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-core-text-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 0; i < 20; i += 1) {
      await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'assistant' : 'user', sender: i % 2 ? 'codex' : 'you', target: i % 2 ? 'you' : 'codex', text: `exchange ${i} about webhooks, refunds and typography, ${'written at some length so the window has to let go of it. '.repeat(3)}` });
    }
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    memory.addMemories([
      { kind: 'decision', text: 'The webhook verifies the Stripe signature before parsing.', sources: [2] },
      { kind: 'preference', text: 'Headings are set in the condensed grotesque, never italic.', sources: [4] },
      { kind: 'decision', text: 'Refunds are issued from the ledger, never from the gateway.', sources: [2] },
      // Distilled from the oldest exchanges, which is what makes them recallable: a note about
      // what is still inside the window is already in the window.
    ], { agent: 'codex', fromSequence: 1, throughSequence: 4 });
    const room = new Room({ store, agents, projectRoot: root, invokers: {}, memory, contextMaxChars: 1400 });

    // Which notes the question would summon, which is the whole point of asking here first.
    const summoned = async (text) => ((await room.briefing({ agent: 'codex', mode: 1, text })).parts.find((part) => part.id === 'memories')?.text ?? '')
      .split('\n').filter((line) => line.startsWith('- ['));
    const webhook = await summoned('what did we decide about the stripe webhook signature?');
    const headings = await summoned('which typeface do the headings use?');
    assert.ok(webhook.some((line) => /Stripe signature/.test(line)), 'the webhook question does not summon the webhook decision');
    assert.ok(headings.some((line) => /grotesque/.test(line)), 'the typeface question does not summon the typeface preference');
    assert.notDeepEqual(webhook, headings, 'the document does not change with the question, so it is a briefing for a turn nobody will have');

    // And reading it still counts for nothing: neither question recalled anything.
    assert.deepEqual(memory.memories({ limit: 10 }).map((note) => note.recalled), [0, 0, 0], 'reading what the room would say counted as the room saying it');
    await room.shutdown();
    memory.close();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('core: what you type survives the rebuild it causes', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  // The controls are built once and the document is what gets replaced; rebuilding the whole
  // panel on every keystroke would take the caret with it.
  assert.match(app, /core\.body\.replaceChildren\(renderCoreStrip\(\), renderCoreTabs\(\), renderCorePanes\(\), renderCoreConsole\(\)\)/);
  assert.match(app, /paneInto\('document', renderCoreDoc\(briefing\)\)/);
  assert.match(app, /\.\.\.\(core\.text \? \{ text: core\.text \} : \{\}\)/, 'what you would ask never reaches the document');
  // Half a sentence already in the composer is what you are about to send, so it starts there.
  assert.match(app, /core\.text = els\.input\?\.value\?\.trim\(\) \? els\.input\.value/);
  // Typing does not send anything, and it says so beside the field.
  assert.match(app, /NOTHING IS SENT FROM HERE/);
  assert.match(css, /\.core-panes\.reading \{ opacity: \.45; \}/);
});

test('core: no block reaches the briefing without saying what put it there', async () => {
  const { PROMPT_BLOCKS, BLOCK_SOURCES } = await import('../src/room/prompt.mjs');

  // The guard: a block added to the prompt without a word about what governs it fails here,
  // because the core's promise — read, never written, switched off where it says — is only
  // checkable if every block answers for itself.
  assert.deepEqual(Object.keys(BLOCK_SOURCES).sort(), [...PROMPT_BLOCKS].sort());
  for (const id of PROMPT_BLOCKS) {
    const source = BLOCK_SOURCES[id];
    assert.ok(source.when, `${id} does not say what puts it in the briefing`);
    assert.equal('where' in source, true, `${id} does not say whether anything can take it away`);
    assert.equal(source.where === null || source.where.length > 0, true, `${id} points nowhere`);
  }
  // The ones a person can actually switch off point at a place in the panel, not at prose.
  for (const id of ['ash', 'web', 'madre', 'delegation']) {
    assert.match(BLOCK_SOURCES[id].where, /MODULES|CONNECTIONS/, `${id} does not say where it is switched off`);
  }
  // And what nothing can remove says so by saying nothing, not by inventing a switch.
  assert.equal(BLOCK_SOURCES.room.where, null);
  assert.equal(BLOCK_SOURCES.who.where, null);

  // It travels with the block, so the core reads it from the same place the prompt is written.
  const root = await mkdtemp(join(tmpdir(), 'pulse-core-sources-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    const briefing = await room.briefing({ agent: 'codex', mode: 1 });
    for (const part of briefing.parts) {
      assert.equal(part.when, BLOCK_SOURCES[part.id].when, `${part.id} arrives without what put it there`);
    }
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('core: four panes, one at a time, and the prompt through all of them', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // The four things there are to see in here. They used to be one scroll, so looking for one of
  // them meant walking past the other three.
  assert.match(app, /const CORE_TABS = \[\s*\{ id: 'document'[\s\S]*\{ id: 'launch'[\s\S]*\{ id: 'egress'[\s\S]*\{ id: 'console'/);
  assert.match(app, /for \(const \[name, pane\] of Object\.entries\(core\.paneNodes\)\) pane\.hidden = name !== id;/);
  // Each tab says what is behind it, so nobody opens a pane to find out whether it holds anything.
  assert.match(app, /button\.lastChild\.textContent = meta\[button\.dataset\.tab\] \?\? '';/);

  // The frame is a terminal: head and strip and tabs above, one pane scrolling, the prompt at the
  // bottom where a prompt goes. The panes scroll, not the whole frame.
  assert.match(css, /\.core \.mother-frame \{ display: grid; grid-template-rows: auto auto 1fr; overflow: hidden;/);
  assert.match(css, /\.core-body \{ display: grid; grid-template-rows: auto auto minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.core-panes \{ overflow: auto; min-height: 0;/);

  // And it is laid out the way the terminal this room is dressed as lays out its own output:
  // `==>` over each section, names in one column and numbers in the other.
  assert.match(app, /head\.append\(el\('b', null, '==>'\), el\('span', 'title', title\)\)/);
  assert.match(app, /function brewRow\(key, value, className = null\)/);
  for (const title of ['THE DOCUMENT', 'WHAT IT CARRIES', 'THE LAUNCH', 'WHAT KEEPS IT TO THIS TURN', 'WHAT LEFT THIS MACHINE']) {
    assert.ok(app.includes(`brewHead('${title}'`), `${title} is not a section of its own`);
  }
  // The blocks are a package list, not a wall: a sign, a name, a number, a bar, a reason.
  assert.match(app, /head\.append\(el\('i', 'sign', '\+'\)\);/);
  assert.match(css, /\.core-block > summary \{ display: grid; grid-template-columns: 14px 132px 66px 70px/);
});
