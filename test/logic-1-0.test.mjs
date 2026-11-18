import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildConversationContext } from '../src/conversation-context.mjs';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { MODULES, toolsForTurn } from '../src/modules/index.mjs';
import { QuotaMonitor } from '../src/quota-monitor.mjs';
import { Room } from '../src/room.mjs';
import { VectorWorker } from '../src/room/vectors.mjs';
import { fakeEmbedding } from '../src/embeddings.mjs';

// Lote 3 of the 1.0 review (2026-10-12): logic that answered wrong, each with what it does now.

test('logic: a lease the human grants mid-plan carries what was announced (LOG-05)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-escalate-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    const agents = [
      { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake/claude', version: 'test' },
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' },
    ];
    let seen = null;
    const invokers = {
      'claude-readonly': async ({ text }) => (/closing turn/.test(text) ? { text: 'done', usage: null } : { text: 'Plan:\n```pulse\n@codex #2: genera una imagen png del logo\n```', usage: null }),
      'codex-readonly': async ({ lease }) => { seen = lease?.scopes ?? null; return { text: 'none', usage: null }; },
    };
    const store = await new EventStore(join(root, '.ledger', 'events.jsonl')).initialize();
    const room = new Room({ store, agents, projectRoot: root, invokers, distill: { enabled: false } });
    const announced = [];
    room.subscribe((event) => {
      if (event.type === 'mode.requested') setTimeout(() => room.decideMode(event.payload.requestId, 'plan'), 10);
      if (event.type === 'lease.granted') announced.push(...(event.payload.scopes ?? []));
    });
    await room.send({ text: 'coordina con codex', target: 'claude' });
    for (let i = 0; i < 100 && !seen; i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
    for (const scope of announced) assert.equal(seen?.[scope], true, `${scope} was announced and arrived off`);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('logic: the vectors drain a backlog past one batch (LOG-07)', async () => {
  const memory = await new RoomMemory(':memory:').initialize();
  memory.index(Array.from({ length: 250 }, (_, i) => ({ id: `e${i}`, sequence: i + 1, type: 'message.created', timestamp: new Date().toISOString(), payload: { messageId: `m${i}`, role: 'user', sender: 'you', target: 'codex', text: `mensaje número ${i} sobre el proyecto` } })));
  memory.attachEmbedder({ model: 'fake-64', dims: 64, embed: async (texts) => texts.map((text) => fakeEmbedding(text)) });
  const worker = new VectorWorker({ memory });
  worker.schedule(10);
  for (let i = 0; i < 80 && memory.vectorCounts().entries < 250; i += 1) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(memory.vectorCounts().entries, 250, 'the backlog stopped after one batch');
  worker.stop();
  memory.close();
});

test('logic: an unchanged quota reading is not written to the record again (LOG-12)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-quota-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents: [], projectRoot: root, distill: { enabled: false } });
    let percent = 12;
    const monitor = new QuotaMonitor({ sources: [{ id: 'codex-rollout', agent: 'codex', read: async () => ({ usedPercent: percent, resetAt: null, stale: true }) }], intervalMs: 20, onReport: (report) => room.reportOfficialQuota(report) });
    await monitor.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    percent = 30;
    await new Promise((resolve) => setTimeout(resolve, 120));
    monitor.stop();
    const written = (await store.readAll()).filter((event) => event.type === 'quota.updated');
    assert.deepEqual(written.map((event) => event.payload.usedPercent), [12, 30]);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('logic: an anchor on the first message holds the window (LOG-15)', () => {
  const events = Array.from({ length: 10 }, (_, i) => ({ type: 'message.created', sequence: i + 1, payload: { messageId: `m${i}`, role: i % 2 ? 'assistant' : 'user', sender: i % 2 ? 'codex' : 'you', target: 'x', text: 'z'.repeat(1000) } }));
  for (const anchor of [1, 2]) {
    const context = buildConversationContext(events, { maxChars: 16000, anchor });
    assert.equal(context.omittedMessages, anchor - 1, `anchor ${anchor} was let go though everything fits`);
  }
});

test('logic: a module that fails takes only its own tools out of the turn (LOG-17)', async () => {
  const before = MODULES.length;
  MODULES.push({ id: 'good-test', toolsForTurn: async () => [{ name: 'browser-test', command: 'node', tools: ['open'] }] });
  MODULES.push({ id: 'broken-test', toolsForTurn: async () => { throw new Error('boom'); } });
  try {
    const servers = await toolsForTurn({ config: {} }, { mode: 1 });
    assert.ok(servers.some((server) => server.name === 'browser-test'));
  } finally {
    MODULES.splice(before);
  }
});

test('logic: a note freed from an aberration stands where the human\'s verdict puts it (LOG-10)', async () => {
  const memory = await new RoomMemory(':memory:').initialize();
  memory.index([{ id: 'e1', sequence: 1, type: 'message.created', timestamp: new Date().toISOString(), payload: { messageId: 'r1', role: 'assistant', sender: 'codex', target: 'you', text: 'Usamos PostgreSQL dieciséis para la base principal del proyecto' } }]);
  memory.addMemories([{ kind: 'decision', text: 'Usamos PostgreSQL dieciséis para la base principal del proyecto', sources: [1] }], { agent: 'codex', fromSequence: 1, throughSequence: 1 });
  const [note] = memory.memories();
  memory.judge('r1', 'bad');
  const judged = memory.memories().find((one) => one.id === note.id).zone;
  const flagged = memory.flagAberration({ text: 'Falso: no usamos PostgreSQL', contradicts: note.id });
  memory.clearAberration(flagged.id);
  assert.equal(memory.memories().find((one) => one.id === note.id).zone, judged, 'a note judged bad travels again');
  memory.close();
});

test('logic: two conversations alive at once distil a batch once, not twice (LOG-06)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-distil-once-'));
  try {
    const agents = [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake/gemini', version: 'test' },
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
    let distilled = 0;
    const invokers = {
      'codex-readonly': async () => ({ text: 'ok answer about the webhook handler', usage: null }),
      'gemini-readonly': async () => { distilled += 1; await new Promise((resolve) => setTimeout(resolve, 200)); return { text: '{"kind":"fact","text":"The webhook handler lives in src/webhooks.mjs.","sources":[1]}', usage: null }; },
    };
    const a = await new EventStore(join(root, 'events.jsonl')).initialize();
    const b = await new EventStore(join(root, 'chats', 'x', 'events.jsonl'), { floor: () => a.lastSequence }).initialize();
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(a);
    const roomA = new Room({ store: a, agents, projectRoot: root, invokers, memory, distill: { enabled: false, agent: 'gemini' } });
    const roomB = new Room({ store: b, agents, projectRoot: root, invokers, memory, distill: { enabled: false, agent: 'gemini' } });
    await roomA.send({ text: 'Where is the webhook handler?', target: 'codex' });
    await roomA.send({ text: 'And the tests?', target: 'codex' });
    await Promise.all([roomA.distillNow(), roomB.distillNow()]);
    assert.equal(distilled, 1, 'the same batch was paid for twice');
    await roomA.shutdown(); await roomB.shutdown(); memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('logic: where a conversation\'s numbering stands is read past a last line longer than the window (LOG-09)', async () => {
  const { lastSequenceOf } = await import('../src/chats.mjs');
  const { writeFile } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'madre-floor-'));
  try {
    const file = join(dir, 'events.jsonl');
    const line = (sequence, text) => `${JSON.stringify({ id: `e${sequence}`, sequence, type: 'message.created', timestamp: '2026-10-12T00:00:00.000Z', payload: { role: 'assistant', text } })}\n`;
    await writeFile(file, line(41, 'corto') + line(42, 'x'.repeat(200000)));
    assert.equal(await lastSequenceOf(file), 42);
    await writeFile(file, line(7, 'y'.repeat(150000)));
    assert.equal(await lastSequenceOf(file), 7, 'a file of one long line');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('logic: a conversation opened from disk closes a turn cut by a room that died, and a memory made again reads every conversation (LOG-14)', async () => {
  const { readdir, writeFile, readFile } = await import('node:fs/promises');
  const { createChat, chatLedger } = await import('../src/chats.mjs');
  const { createPulseServer } = await import('../src/server.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-reconcile-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-reconcile-project-'));
  let server;
  const close = () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    await close();
    const roomDir = join(state, 'rooms', (await readdir(join(state, 'rooms')))[0]);
    const other = await createChat(roomDir, { activate: false });
    const line = (event) => `${JSON.stringify({ timestamp: '2026-10-12T00:00:00.000Z', ...event })}\n`;
    await writeFile(chatLedger(roomDir, other.id), line({ id: 'u', sequence: 500, type: 'message.created', payload: { messageId: 'm1', role: 'user', sender: 'you', target: 'codex', text: 'la palabra zanahoria' } }) + line({ id: 's', sequence: 501, type: 'agent.started', payload: { messageId: 'r1', agent: 'codex' } }));
    await rm(join(roomDir, 'memory.sqlite'), { force: true });
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    await fetch(`http://127.0.0.1:${port}/api/state?chat=${other.id}`);
    const kept = await readFile(chatLedger(roomDir, other.id), 'utf8');
    assert.match(kept, /"type":"message\.failed"[^\n]*"recovered":true/, 'the cut turn of a conversation opened later still thinks');
    await close();
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(join(roomDir, 'memory.sqlite'));
    const { n } = db.prepare("SELECT count(*) AS n FROM entries WHERE text LIKE '%zanahoria%'").get();
    db.close();
    assert.equal(n, 1, 'the memory made again did not read the other conversation');
  } finally {
    if (server?.listening) await close();
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('logic: a moment to ask for a review is handed to one page, not to every page in view (WEB-12)', async () => {
  const { tickAsk } = await import('../src/review-ask.mjs');
  const { writeFile } = await import('node:fs/promises');
  const root = await mkdtemp(join(tmpdir(), 'madre-ask-once-'));
  try {
    const now = Date.parse('2026-10-12T12:00:00Z');
    await writeFile(join(root, 'review-ask.json'), JSON.stringify({ first: '2026-10-12T09:00:00Z', aiMinutes: 35, lastUse: new Date(now - 1000).toISOString(), shown: {}, answer: null }));
    const pages = await Promise.all([tickAsk(root, now), tickAsk(root, now), tickAsk(root, now)]);
    assert.deepEqual(pages.map((page) => page.due).filter(Boolean), ['m30'], 'more than one page was asked at once');
    assert.equal((await tickAsk(root, now + 11 * 60 * 1000)).due, 'm30', 'a page that closed without answering kept it from ever coming back');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('logic: what crosses between projects is cleaned of every common secret, guards on or off (INI-05)', async () => {
  const { Privacy } = await import('../src/privacy.mjs');
  const off = new Privacy({ terms: [], marker: '[X]', secrets: false, paths: false, home: '/Users/nadie' });
  const cases = [
    ['sk_live_51HxYzABCDEFGHIJKLMNOP', '[key]'],
    ['AKIAIOSFODNN7EXAMPLE', '[key]'],
    ['-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----', '[private key]'],
    ['ya29.a0AfH6SMBxxxxxxxxxxxxxxxxxxxxxx', '[token]'],
    ['PASSWORD=hunter2hunter', 'PASSWORD=[secret]'],
    ['Bearer 0123456789abcdef0123456789abcdef', 'Bearer [token]'],
    ['https://user:pass1234@host.com/x', 'https://[credentials]@host.com/x'],
    ['+52 33 1234 5678', '[phone]'],
    ['/home/bob/x', '/home/…/x'],
  ];
  for (const [text, expected] of cases) assert.equal(off.redact(text, { always: true }).text, expected, text);
  assert.equal(off.redact('sk_live_51HxYzABCDEFGHIJKLMNOP').text, 'sk_live_51HxYzABCDEFGHIJKLMNOP', 'the project\'s own switch was not respected');
  assert.equal(off.redact('version 1.2.3, puerto 4317', { always: true }).text, 'version 1.2.3, puerto 4317');
});
