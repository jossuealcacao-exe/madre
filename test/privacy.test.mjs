import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Privacy, normalizeTerms, privacySettings, PRIVACY_MARKER } from '../src/privacy.mjs';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { Room } from '../src/room.mjs';
import { pairsFromEvents } from '../src/dataset.mjs';
import { CONDITIONS, searchConditions } from '../public/troubleshooting.js';

test('privacy: terms match by meaning of the name, not by exact spelling, and are replaced everywhere in a value', () => {
  const privacy = new Privacy({ terms: ['Come Verde', 'comeverde.mx', 'Come Verde Holdings'] });
  assert.deepEqual(privacy.terms, ['Come Verde Holdings', 'comeverde.mx', 'Come Verde'], 'longest first');
  const { text, hits } = privacy.redact('El footer decía Come Verde · sala; el correo es galo@ComeVerde.mx y la razón social COME-VERDE HOLDINGS.');
  assert.equal(hits, 3);
  assert.equal(text, `El footer decía ${PRIVACY_MARKER} · sala; el correo es galo@${PRIVACY_MARKER} y la razón social ${PRIVACY_MARKER}.`);
  assert.equal(privacy.hits('Comé Vérde llegó'), 1, 'accents do not hide a name');
  assert.equal(privacy.hits('welcome verdeamarelo'), 0, 'inside other words it is not the name');
  assert.equal(privacy.redact('nada que ver').hits, 0);
  const deep = privacy.redactDeep({ messageId: 'come verde', text: 'Come Verde decide', steps: [{ agent: 'codex', text: 'pregunta a Come Verde' }], n: 3 });
  assert.equal(deep.hits, 3, 'ids are strings too: a uuid never matches, a name anywhere does');
  assert.equal(deep.value.steps[0].text, `pregunta a ${PRIVACY_MARKER}`);
  // A room with no terms named still guards what has a shape rather than a name, so it is not
  // "off": it is only off when nothing at all would be replaced.
  assert.equal(new Privacy().enabled, true);
  assert.equal(new Privacy({ secrets: false, paths: false }).enabled, false);
  assert.deepEqual(new Privacy().redact('Come Verde'), { text: 'Come Verde', hits: 0 }, 'an ordinary name is not a secret');
  assert.deepEqual(normalizeTerms(['ab', ' Come  Verde ', 'come verde', 'x'.repeat(81)]), ['Come Verde']);
  const settings = privacySettings({ privacy: { terms: ['Acme'], marker: '[ORG]' } }, { PULSE_PRIVATE_TERMS: 'Globex, Acme' });
  assert.deepEqual(settings, { terms: ['Globex', 'Acme'], marker: '[ORG]', envWins: true, secrets: true, paths: true });
});

test('privacy: the room guards every hop, and a purge rewrites what it already holds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-privacy-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const privacy = new Privacy();                 // nothing guarded yet: the leak happens first
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).attachPrivacy(privacy).initialize(store);
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake/claude', version: 'test' }];
    let reply = 'Come Verde Holdings should keep prices out of the LoRA; the footer said Come Verde · sala MADRE.';
    const invokers = { 'claude-readonly': async () => ({ text: reply, usage: null }) };
    const room = new Room({ store, agents, projectRoot: root, invokers, memory, privacy });

    await room.send({ text: 'Should business data go into the LoRA?', target: 'claude' });
    let events = await store.readAll();
    const leak = events.find((e) => e.type === 'message.created' && e.payload.sender === 'claude');
    assert.match(leak.payload.text, /Come Verde Holdings/, 'before the terms are named, the leak lands');
    memory.addMemories([{ kind: 'decision', text: 'Come Verde data stays out of the weights.', sources: [leak.sequence] }], { agent: 'gemini', fromSequence: 1, throughSequence: leak.sequence });
    memory.markDistilled([1, leak.sequence]);
    assert.equal(room.privacyExposure(events).events, 0, 'no terms, no exposure');

    // The human names the terms. From here on nothing leaks; what leaked is still there.
    room.setPrivacy(['Come Verde']);
    events = await store.readAll();
    assert.deepEqual(room.privacyExposure(events), { events: 1, entries: 1, memories: 1 });

    reply = 'Again: Come Verde is the client; ```pulse\n@codex: audit Come Verde files\n```';
    await room.send({ text: 'Repeat yourself, and name Come Verde', target: 'claude' });
    events = await store.readAll();
    const human = events.filter((e) => e.type === 'message.created' && e.payload.sender === 'you').at(-1);
    assert.match(human.payload.text, /Come Verde/, 'the human is never rewritten');
    assert.ok(events.some((e) => e.type === 'privacy.warning' && e.payload.messageId === human.payload.messageId && e.payload.hits === 1), 'but the room says so');
    const guarded = events.filter((e) => e.type === 'message.created' && e.payload.sender === 'claude').at(-1);
    assert.equal(guarded.payload.text, `Again: ${PRIVACY_MARKER} is the client; \`\`\`pulse\n@codex: audit ${PRIVACY_MARKER} files\n\`\`\``);
    assert.equal(guarded.payload.redacted, 2);
    const notice = events.find((e) => e.type === 'privacy.redacted');
    assert.deepEqual({ agent: notice.payload.agent, hits: notice.payload.hits, marker: notice.payload.marker }, { agent: 'claude', hits: 2, marker: PRIVACY_MARKER });
    assert.ok(!JSON.stringify(events.filter((e) => e.type.startsWith('privacy.'))).includes('Come Verde'), 'privacy events carry counts, never the words');
    assert.equal(memory.recall('client audit', { limit: 5 }).entries.every((entry) => !entry.excerpt.includes('Come Verde')), true, 'the index got the guarded text');
    memory.addMemories([{ kind: 'fact', text: 'Come Verde is the client.', sources: [5] }], { agent: 'codex', fromSequence: 5, throughSequence: 5, origin: 'noted' });
    assert.ok(memory.memories({ limit: 10 }).some((note) => note.text === `${PRIVACY_MARKER} is the client.`), 'a note is guarded whoever writes it');

    // Purge: the first leak, its index entry and its note become the marker; sequences and distilled flags stay.
    const purged = await room.purgePrivate();
    assert.deepEqual(purged, { events: 2, entries: 1, memories: 1 }, 'the first reply and the later human message in the ledger; the reply\'s index entry (the human message was indexed guarded); the one note');
    const after = await store.readAll();
    assert.deepEqual(after.map((e) => e.sequence), events.map((e) => e.sequence).concat(after.at(-1).sequence), 'same sequences plus the purge record');
    assert.ok(!JSON.stringify(after.filter((e) => e.type === 'message.created' && e.payload.sender === 'claude')).includes('Come Verde'));
    assert.equal(after.at(-1).type, 'privacy.purged');
    assert.deepEqual(room.privacyExposure(after), { events: 0, entries: 0, memories: 0 }, 'a purge rewrites the human\'s words too: nothing in the room carries the term any more');
    assert.equal(memory.lastDistilled(), leak.sequence, 'distilled flags survive the rewrite');
    assert.ok(!(await readFile(join(root, 'events.jsonl'), 'utf8')).split('\n').filter(Boolean).some((line) => JSON.parse(line).payload.sender === 'claude' && line.includes('Come Verde')));
    const appended = await store.append('room.note', { text: 'after purge' });
    assert.equal(appended.sequence, after.at(-1).sequence + 1, 'appends continue the sequence after a rewrite');

    // Dataset pairs never carry the words either.
    const pairs = pairsFromEvents(await store.readAll(), { privacy });
    assert.ok(pairs.length >= 1 && !JSON.stringify(pairs).includes('Come Verde'));
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('MU/TH/UR knows the privacy condition', () => {
  const hit = CONDITIONS.find((c) => c.id === 'privacy-leak');
  assert.ok(hit && hit.match.test('privacy.redacted · @claude · 2 private terms replaced with [ENTIDAD-ORG]'));
  assert.ok(searchConditions('privacy').some((c) => c.id === 'privacy-leak'));
});

test('privacy: what has a shape is caught without anyone naming it, and can be turned off', async () => {
  const { Privacy, privacySettings } = await import('../src/privacy.mjs');

  // A key, a token and an address are recognisable in any project. They used to be redacted only
  // on the way into a training file, so one echoed into a reply was written to the ledger in the
  // clear, where it stayed.
  const guard = new Privacy({ terms: [], home: '/Users/someone' });
  const leak = 'key sk-abcdefghijklmnopqrstuv and AIzaSyAbcdefghijklmnopqrstuvwxyz012345 and ghp_abcdefghijklmnopqrstuvwxyz01 at /Users/someone/pulse, write to a.b@c.com';
  const cleaned = guard.redact(leak);
  for (const secret of ['sk-abcdefghijklmnopqrstuv', 'AIzaSy', 'ghp_', 'a.b@c.com', '/Users/someone']) {
    assert.ok(!cleaned.text.includes(secret), `${secret} survived into the room`);
  }
  assert.ok(cleaned.text.includes('~/pulse'), 'the path was removed rather than shortened, which loses what it meant');
  assert.equal(cleaned.hits, 5);

  // Someone who wants a verbatim ledger can have one, and then nothing is touched.
  const verbatim = new Privacy({ terms: [], secrets: false, paths: false, home: '/Users/someone' });
  assert.equal(verbatim.redact(leak).text, leak);
  assert.deepEqual(verbatim.guards, { secrets: false, paths: false });

  // Named terms and shape guards work together, each counted.
  const both = new Privacy({ terms: ['Acme Corp'], home: '/Users/someone' });
  const mixed = both.redact('Acme Corp uses sk-abcdefghijklmnopqrstuv');
  assert.match(mixed.text, /\[ENTIDAD-ORG\] uses \[key\]/);
  assert.equal(mixed.hits, 2);

  // On unless someone says otherwise: nobody should have to know they exist to be covered.
  assert.equal(privacySettings({}).secrets, true);
  assert.equal(privacySettings({}).paths, true);
  assert.equal(privacySettings({ privacy: { secrets: false } }).secrets, false);
  assert.equal(privacySettings({ privacy: { paths: false } }).paths, false);
  // And a value with nothing to redact comes back untouched, whatever is switched on.
  assert.deepEqual(new Privacy().redactDeep({ n: 3, ok: true }).value, { n: 3, ok: true });
});
