import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { EventStore } from '../src/event-store.mjs';
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

test('core: the door is the name, and what is behind it is read and never written', async () => {
  const [page, app, css] = await Promise.all([read('index.html'), read('app.js'), read('styles.css')]);

  // Clicking MADRE opens the core; the author's link moved inside, where it is still one click away.
  assert.match(page, /<button id="brand-core" class="brand"/);
  assert.ok(!/<a class="brand"/.test(page), 'the brand is still a link out of the room');
  assert.match(page, /<dialog id="core" class="mother core"/);
  assert.match(page, /mother-foot[^<]*<a href="https:\/\/jossuealcala\.com/, 'the author\'s link was dropped rather than moved');

  // It is read, never written, and it says so where somebody would look for the edit button.
  assert.match(app, /YOU CANNOT EDIT THIS\. WHAT MADRE PROMISES ABOUT THE CREW IS TRUE BECAUSE THESE WORDS ARE FIXED/);
  assert.ok(!/contenteditable/.test(app));
  // Nothing is stored and nothing is sent, and the counters are not touched by looking.
  assert.match(app, /BUILT NOW AND SENT NOWHERE/);
  assert.match(page, /BUILT NOW · STORED NOWHERE · SENT NOWHERE/);
  assert.match(app, /NONE OF THEM WAS COUNTED AS RECALLED/);

  // Inside the star rather than looking at it, and it breathes — unless the reader asked it not to.
  assert.match(css, /\.core-sun \{[\s\S]*animation: core-breathe/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.core-sun \{ animation: none; \} \}/);
});
