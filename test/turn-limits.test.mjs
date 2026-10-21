import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { Room, READING_TIMEOUT_MS, WRITING_TIMEOUT_MS } from '../src/room.mjs';
import { createPulseServer } from '../src/server.mjs';
import { chatLedger } from '../src/chats.mjs';

const codex = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];

test('turn limits: a turn that writes gets longer by default, and what the human set always wins', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-limits-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents: codex, projectRoot: root, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) } });
    assert.equal(room.timeoutFor('codex'), READING_TIMEOUT_MS);
    assert.equal(room.timeoutFor('codex', { writing: true }), WRITING_TIMEOUT_MS);
    assert.ok(WRITING_TIMEOUT_MS > READING_TIMEOUT_MS);
    const set = new Room({ store, agents: codex, projectRoot: root, agentTimeouts: { default: 300000 }, invokers: {} });
    assert.equal(set.timeoutFor('codex', { writing: true }), 300000, 'a default the human set is not overridden');
    const one = new Room({ store, agents: codex, projectRoot: root, agentTimeouts: { codex: 900000, default: 300000 }, invokers: {} });
    assert.equal(one.timeoutFor('codex'), 900000);

    // The limit is said with the turn's start, so the room counts down from the real number.
    await room.send({ text: 'read it', target: 'codex' });
    await room.send({ text: 'write it', target: 'codex', create: true });
    const started = (await store.readAll()).filter((event) => event.type === 'agent.started').map((event) => event.payload.timeoutMs);
    assert.deepEqual(started, [READING_TIMEOUT_MS, WRITING_TIMEOUT_MS]);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('turn limits: a writing turn cut by the clock says what it left, keeps it, and keeps its way back', async () => {
  const base = await mkdtemp(join(tmpdir(), 'pulse-cut-'));
  const root = join(base, 'project');
  try {
    await mkdir(root);
    await writeFile(join(root, 'notes.txt'), 'before\n');
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const invokers = {
      'codex-readonly': async ({ lease }) => {
        // Two files of three written, an existing one touched, and then the clock runs out.
        await writeFile(join(lease.outDir, 'index.html'), '<h1>Phobos</h1>\n');
        await writeFile(join(lease.outDir, 'styles.css'), 'body{}\n');
        await writeFile(join(lease.outDir, 'notes.txt'), 'overwritten\n');
        const error = new Error('Codex did not respond before the timeout (600s).');
        error.code = 'TIMEOUT';
        throw error;
      },
    };
    const room = new Room({ store, agents: codex, projectRoot: root, invokers });
    await room.send({ text: 'write the whole app', target: 'codex', create: true });
    const events = await store.readAll();
    const failed = events.find((event) => event.type === 'message.failed');
    assert.ok(failed, 'the turn failed');
    assert.deepEqual(failed.payload.timeout, { ms: WRITING_TIMEOUT_MS, writing: true, idle: false });
    assert.deepEqual(failed.payload.partial.created.map((file) => file.path), ['index.html', 'styles.css'], 'what appeared is listed');
    assert.deepEqual(failed.payload.partial.existingReverted, ['notes.txt'], 'CREATE still puts back what existed');
    assert.equal(await readFile(join(root, 'notes.txt'), 'utf8'), 'before\n');
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), '<h1>Phobos</h1>\n', 'what it wrote stays');

    // And UNDO takes the project back to before the turn.
    const undone = await room.undoControl(failed.payload.partial.checkpointId);
    assert.equal(undone.ok, true);
    await assert.rejects(readFile(join(root, 'index.html'), 'utf8'));
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('one writer at a time: a second writing turn waits for the first, and each keeps only what it wrote', async () => {
  const base = await mkdtemp(join(tmpdir(), 'pulse-one-pen-'));
  const root = join(base, 'project');
  try {
    await mkdir(root);
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const agents = [
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
      { id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/x', version: '1' },
    ];
    const order = [];
    const invokers = {
      'codex-readonly': async ({ lease }) => {
        order.push('codex in');
        await writeFile(join(lease.outDir, 'tests.html'), '<p>tests</p>\n');
        // It keeps the pen until the second turn is waiting for it, however long that one takes.
        for (let i = 0; i < 2000 && !(await store.readAll()).some((event) => event.type === 'write.waiting'); i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
        order.push('codex out');
        return { text: 'tests written', usage: null };
      },
      'opencode-readonly': async ({ lease }) => {
        order.push('opencode in');
        await writeFile(join(lease.outDir, 'README.md'), '# Phobos\n');
        order.push('opencode out');
        return { text: 'readme written', usage: null };
      },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    const first = room.send({ text: 'write the tests', target: 'codex', create: true });
    // The second goes once the first holds the pen: a fixed 60 ms was sometimes less than the
    // first took to reach it on a busy machine, and then the second wrote first (2026-10-21).
    for (let i = 0; i < 1000 && !order.includes('codex in'); i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    const second = room.send({ text: 'write the readme', target: 'opencode', create: true });
    await Promise.all([first, second]);
    await room.settled?.();
    let events = await store.readAll();
    for (let attempt = 0; attempt < 100 && events.filter((event) => event.type === 'artifacts.created').length < 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      events = await store.readAll();
    }
    assert.deepEqual(order, ['codex in', 'codex out', 'opencode in', 'opencode out'], 'the second turn wrote while the first was still writing');
    const waiting = events.find((event) => event.type === 'write.waiting');
    assert.deepEqual([waiting?.payload.agent, waiting?.payload.behind], ['opencode', 'codex']);
    const made = Object.fromEntries(events.filter((event) => event.type === 'artifacts.created').map((event) => [event.payload.agent, event.payload.files.map((file) => file.path)]));
    assert.deepEqual(made, { codex: ['tests.html'], opencode: ['README.md'] }, 'one turn was credited with the other one\'s file');
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the draft folder: a module or an image a turn left there is shown and proposed, even where git ignores .pulse', async () => {
  const base = await mkdtemp(join(tmpdir(), 'pulse-draft-'));
  const root = join(base, 'project');
  try {
    await mkdir(root);
    // The project ignores .pulse/, as most do once a .gitignore names it: the diff never sees the draft.
    await writeFile(join(root, '.gitignore'), '.pulse/\n');
    const picture = join(base, 'exec-icon.png');
    await writeFile(picture, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const second = join(base, 'exec-second.png');
    await writeFile(second, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]));
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const invokers = {
      'codex-readonly': async ({ lease }) => {
        await writeFile(join(lease.outDir, lease.scratchDir, 'tamano.module.mjs'), 'export default { id: "tamano", name: "TAMAÑO" };\n');
        // Codex's own image tool keeps what it makes under its home; the adapter hands the paths back.
        // The second one the agent also copied into the project itself.
        await mkdir(join(lease.outDir, 'assets'), { recursive: true });
        await writeFile(join(lease.outDir, 'assets', 'icon.png'), await readFile(second));
        return { text: 'module and icon ready', usage: null, generatedImages: [picture, second] };
      },
    };
    const room = new Room({ store, agents: codex, projectRoot: root, invokers });
    await room.send({ text: '/module un comando /tamano', target: 'codex', create: true });
    const events = await store.readAll();
    const files = events.find((event) => event.type === 'artifacts.created')?.payload.files.map((file) => file.path) ?? [];
    assert.ok(files.some((path) => /^\.pulse\/out\/[^/]+\/tamano\.module\.mjs$/.test(path)), `the module was not shown: ${files}`);
    assert.ok(files.some((path) => /^\.pulse\/out\/[^/]+\/exec-icon\.png$/.test(path)), `the image was not kept: ${files}`);
    assert.ok(files.includes('assets/icon.png'), `the image the agent placed was not shown: ${files}`);
    assert.ok(!files.some((path) => path.endsWith('exec-second.png')), `an image already in the project was shown twice: ${files}`);
    const proposed = events.find((event) => event.type === 'module.proposed');
    assert.ok(proposed, 'no install card for the module');
    assert.match(proposed.payload.path, /tamano\.module\.mjs$/);
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('what the human sets reaches every conversation: one open beside, and one made after', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-settings-all-'));
  const project = join(root, 'p');
  try {
    await mkdir(project);
    const invokers = { 'codex-readonly': async () => ({ text: '{"memories":[]}', usage: null }) };
    const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: codex, invokers, heldGraceMs: 60000 });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((response) => response.json());
    const { readdir } = await import('node:fs/promises');
    const roomDir = async () => join(root, 'rooms', (await readdir(join(root, 'rooms')))[0]);
    const events = async (chat, type) => (await readFile(chatLedger(await roomDir(), chat), 'utf8').catch(() => '')).split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((event) => event.type === type);
    const until = async (check) => { for (let attempt = 0; attempt < 200; attempt += 1) { const found = await check(); if (found) return found; await new Promise((resolve) => setTimeout(resolve, 25)); } return null; };
    try {
      const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;
      const made = await post('/api/chats', {});
      // The first conversation, written to beside the open one: its room stays alive.
      await post(`/api/messages?chat=${first}`, { text: 'hello', target: 'codex' });
      await until(async () => (await events(first, 'agent.completed')).length === 1);
      // A longer limit, set from anywhere, is the limit of that conversation's next turn.
      await post('/api/settings', { timeouts: { codex: 900000 } });
      await post(`/api/messages?chat=${first}`, { text: 'again', target: 'codex' });
      const started = await until(async () => { const all = await events(first, 'agent.started'); return all.length === 2 ? all : null; });
      assert.equal(started?.[1].payload.timeoutMs, 900000, 'the conversation beside kept the old limit');
      // Memory set to distill every two messages: a conversation made afterwards does it too.
      await post('/api/settings', { memory: { every: 2 } });
      const later = await post('/api/chats', {});
      assert.notEqual(later.opened, made.opened);
      for (const text of ['We store amounts in cents.', 'Dates stay as text.']) {
        await post('/api/messages', { text, target: 'codex' });
        await until(async () => !(await fetch(`${base}/api/chats`).then((response) => response.json())).chats.some((chat) => chat.working));
      }
      assert.ok(await until(async () => (await events(later.opened, 'memory.distilled')).length > 0), 'the new conversation distilled with the setting MADRE booted with');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a round @madre closes hands it what each agent asked actually said, and who did not answer', async () => {
  const base = await mkdtemp(join(tmpdir(), 'pulse-round-'));
  try {
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const agents = [
      { id: 'madre', label: 'MADRE', detected: true, ready: true, adapter: 'madre-local', path: null, version: 'qwen2.5:7b', local: true },
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
      { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' },
    ];
    let closing = null;
    const invokers = {
      'madre-local': async ({ text, round }) => {
        if (round) { closing = round; return { text: 'closed', usage: null }; }
        return { text: 'Convoco al crew.\n\n```pulse\n@codex: ¿Qué riesgos ves?\n@gemini: ¿Qué riesgos ves?\n@madre: Resume con citas [#n] lo que el crew respondió.\n```', usage: null };
      },
      'codex-readonly': async () => ({ text: 'El almacenamiento local se puede perder.', usage: null }),
      'gemini-readonly': async () => { throw new Error('Gemini did not respond before the timeout (180s).'); },
    };
    const room = new Room({ store, agents, projectRoot: base, invokers });
    await room.send({ text: '@madre convoca al crew: ¿qué riesgos ves?', target: 'madre' });
    assert.ok(closing, 'the closing turn got no round');
    assert.deepEqual(closing.asked, ['codex', 'gemini']);
    const codex = closing.answers.find((answer) => answer.agent === 'codex');
    const said = (await store.readAll()).find((event) => event.type === 'message.created' && event.payload.sender === 'codex');
    assert.equal(codex.sequence, said.sequence);
    assert.equal(codex.text, 'El almacenamiento local se puede perder.');
    assert.deepEqual(closing.answers.find((answer) => answer.agent === 'gemini'), { agent: 'gemini', failed: true, error: 'Gemini did not respond before the timeout (180s).' });
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a page a turn made is recorded as HTML, and still served as text outside RIPLEY', async () => {
  const { declaredTypeFor, contentTypeFor } = await import('../src/files.mjs');
  assert.equal(declaredTypeFor('tests.html'), 'text/html');
  assert.equal(contentTypeFor('tests.html'), 'text/plain', 'a project page must never be served as a page in the room\'s origin');
  assert.equal(declaredTypeFor('app.js'), 'text/javascript');
  const base = await mkdtemp(join(tmpdir(), 'pulse-html-type-'));
  try {
    const root = join(base, 'p');
    await mkdir(root);
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const room = new Room({ store, agents: codex, projectRoot: root, invokers: { 'codex-readonly': async ({ lease }) => { await writeFile(join(lease.outDir, 'tests.html'), '<p>ok</p>\n'); return { text: 'done', usage: null }; } } });
    await room.send({ text: 'write the tests page', target: 'codex', create: true });
    const made = (await store.readAll()).find((event) => event.type === 'artifacts.created');
    assert.equal(made.payload.files[0].contentType, 'text/html');
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('/module gets one folder of its own: the lease is its draft, the card comes, and it waits for no writer', async () => {
  const base = await mkdtemp(join(tmpdir(), 'pulse-draft-lease-'));
  const root = join(base, 'project');
  try {
    await mkdir(root);
    const store = await new EventStore(join(base, 'events.jsonl')).initialize();
    const agents = [
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
      { id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/x', version: '1' },
    ];
    const order = [];
    let seen = null;
    const invokers = {
      // A #2 turn writing in the project, slowly.
      'codex-readonly': async ({ lease }) => {
        order.push('codex in');
        await writeFile(join(lease.outDir, 'index.html'), '<h1>Phobos</h1>\n');
        await new Promise((resolve) => setTimeout(resolve, 300));
        order.push('codex out');
        return { text: 'page written', usage: null };
      },
      // The module, beside it, in its own folder.
      'opencode-readonly': async ({ lease, prompt }) => {
        order.push('module in');
        seen = { lease, prompt };
        await writeFile(join(lease.outDir, 'tamano.module.mjs'), 'export default { id: "tamano", name: "TAMAÑO" };\n');
        order.push('module out');
        return { text: 'module ready', usage: null };
      },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    const page = room.send({ text: 'write the home page', target: 'codex', create: true });
    await new Promise((resolve) => setTimeout(resolve, 60));
    await room.send({ text: 'Create a MADRE module for this request: un comando /tamano. Write exactly one <id>.module.mjs file for review.', target: 'opencode', mode: 2, draft: true });
    await page;
    const events = await store.readAll();
    const granted = events.find((event) => event.type === 'lease.granted' && event.payload.agent === 'opencode');
    assert.equal(granted.payload.draft, true);
    assert.match(granted.payload.outDir, /^\.pulse\/out\/[^/]+$/);
    assert.ok(seen.lease.outDir.startsWith(join(root, '.pulse', 'out')), 'the lease is not the draft folder');
    assert.ok(!seen.lease.create && !seen.lease.control, 'the module was given the project');
    assert.match(seen.prompt, /CREATION LEASE: the human allows you to create files for this request, only inside .*\.pulse\/out\//);
    assert.match(seen.prompt, new RegExp(`write ONE file named <id>\\.module\\.mjs .* in ${seen.lease.outDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
    assert.ok(order.indexOf('module out') < order.indexOf('codex out'), `the module waited for the page: ${order}`);
    assert.ok(!events.some((event) => event.type === 'write.waiting' && event.payload.agent === 'opencode'));
    const proposed = events.find((event) => event.type === 'module.proposed');
    assert.match(proposed?.payload.path ?? '', /^\.pulse\/out\/[^/]+\/tamano\.module\.mjs$/);
    // Without the flag, #2 is still the project.
    const project = events.find((event) => event.type === 'lease.granted' && event.payload.agent === 'codex');
    assert.equal(project.payload.outDir, '.');
    assert.equal(project.payload.draft, undefined);
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
