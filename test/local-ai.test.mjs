import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localAiConfig, localAiFor, localAiPatch } from '../src/local-ai.mjs';
import { createPulseServer } from '../src/server.mjs';

test('local AI per project: auto by default, pick starts off, manual starts on, the master switch wins', () => {
  // Nothing written is what MADRE did before: every project uses it, and its switch does not move.
  assert.deepEqual(localAiFor({}, 'a'), { mode: 'auto', master: true, chosen: true, on: true, editable: false });
  const pick = { localAi: { mode: 'pick', rooms: { a: true } } };
  assert.equal(localAiFor(pick, 'a').on, true);
  assert.equal(localAiFor(pick, 'b').on, false, 'a project nobody picked starts without it');
  const manual = { localAi: { mode: 'manual', rooms: { a: false } } };
  assert.equal(localAiFor(manual, 'a').on, false);
  assert.equal(localAiFor(manual, 'b').on, true, 'a project that never decided starts with it');
  assert.equal(localAiFor(manual, 'b').editable, true);
  // Off in Modules is off everywhere, whatever a project chose.
  const off = { modules: { ollama: { enabled: false } }, localAi: { mode: 'manual', rooms: { a: true } } };
  assert.deepEqual([localAiFor(off, 'a').chosen, localAiFor(off, 'a').on], [true, false]);
  // Home's own room, the Coordinator's, is not a project: it follows the master switch only.
  assert.equal(localAiFor(pick, 'salas', { home: true }).on, true);
  assert.equal(localAiFor(off, 'salas', { home: true }).on, false);
  // Junk in the file is read as nothing.
  assert.deepEqual(localAiConfig({ localAi: { mode: 'sometimes', rooms: { a: 'yes', b: false } } }), { mode: 'auto', rooms: { b: false }, model: null });
  assert.equal(localAiConfig({ localAi: { model: 'rm -rf /' } }).model, null);
});

test('local AI per project: a patch keeps the projects it does not name and can forget one', () => {
  const config = { localAi: { mode: 'pick', rooms: { a: true, b: false } } };
  assert.deepEqual(localAiPatch(config, { rooms: { c: true } }), { localAi: { mode: 'pick', rooms: { a: true, b: false, c: true }, model: null } });
  assert.deepEqual(localAiPatch(config, { rooms: { a: null } }), { localAi: { mode: 'pick', rooms: { b: false }, model: null } });
  assert.deepEqual(localAiPatch(config, { mode: 'nope' }).localAi.mode, 'pick');
  assert.deepEqual(localAiPatch(config, { mode: 'manual' }).localAi.mode, 'manual');
});

test('local AI: the chosen model is kept beside the projects, and null gives the choice back to MADRE', () => {
  const config = { localAi: { mode: 'pick', rooms: { a: true } } };
  const chose = localAiPatch(config, { model: 'llama3.1:8b' });
  assert.deepEqual(chose, { localAi: { mode: 'pick', rooms: { a: true }, model: 'llama3.1:8b' } });
  // A patch about the projects keeps the model; junk changes nothing; null forgets it.
  assert.equal(localAiPatch(chose, { rooms: { b: true } }).localAi.model, 'llama3.1:8b');
  assert.equal(localAiPatch(chose, { model: 'no spaces allowed' }).localAi.model, 'llama3.1:8b');
  assert.equal(localAiPatch(chose, { model: null }).localAi.model, null);
});

test('local AI per project: Home sets the mode, the project moves its own switch only outside auto, and a new mode changes nothing already there', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-local-ai-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-local-ai-project-'));
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const call = (path, payload) => fetch(`http://127.0.0.1:${port}${path}`, payload === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async (response) => ({ status: response.status, body: await response.json() }));
    const config = async () => JSON.parse(await readFile(join(state, 'config.json'), 'utf8').catch(() => '{}'));

    assert.equal((await call('/api/local-ai')).body.project.mode, 'auto');
    // In auto Home decides: the project's switch does not move, and nothing is written.
    assert.equal((await call('/api/local-ai', { on: false })).status, 409);
    assert.equal((await call('/api/local-ai', { on: 'no' })).status, 400);
    assert.equal((await config()).localAi, undefined);

    const home = await call('/api/salas/local-ai', { mode: 'manual' });
    assert.equal(home.status, 200);
    assert.equal(home.body.mode, 'manual');
    const id = Object.keys((await config()).localAi.rooms)[0];
    assert.ok(id, 'switching the mode wrote down what each project already had');
    assert.equal((await config()).localAi.rooms[id], true);

    const here = await call('/api/local-ai', { on: false });
    assert.equal(here.status, 200);
    assert.deepEqual([here.body.project.chosen, here.body.project.on], [false, false]);
    // One by one keeps it off: a new mode is for new projects.
    await call('/api/salas/local-ai', { mode: 'pick' });
    assert.equal((await config()).localAi.rooms[id], false);
    const listed = (await call('/api/salas/local-ai')).body;
    assert.equal(listed.mode, 'pick');
    assert.equal(listed.projects.find((one) => one.id === id)?.on, false);
    // Home switches it back on, and the project reads it at once.
    await call('/api/salas/local-ai', { rooms: { [id]: true } });
    assert.equal((await call('/api/local-ai')).body.project.on, true);
    // The card's «Active» outside auto is this project's switch: it never turns the local AI off
    // for every other project.
    assert.equal((await call('/api/extensions/ollama/install', {})).status, 200);
    assert.equal((await config()).localAi.rooms[id], false);
    assert.equal((await config()).modules?.ollama?.enabled, undefined);
    // In auto it is the switch for all of them, as it always was.
    await call('/api/salas/local-ai', { mode: 'auto' });
    await call('/api/extensions/ollama/install', {});
    assert.equal((await config()).modules.ollama.enabled, false);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
