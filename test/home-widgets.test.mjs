import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

test('home widgets: the machine is read from the system, a reading is kept, and an unknown widget is refused', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-widgets-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-widgets-project-'));
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const read = (kind) => fetch(`http://127.0.0.1:${port}/api/salas/widget?kind=${kind}`).then(async (response) => ({ status: response.status, body: await response.json() }));
    const system = await read('system');
    assert.equal(system.status, 200);
    assert.equal(system.body.available, true);
    assert.ok(system.body.cpu.cores >= 1);
    assert.ok(system.body.cpu.busy === null || (system.body.cpu.busy >= 0 && system.body.cpu.busy <= 1));
    assert.ok(system.body.memory.free > 0 && system.body.memory.free <= system.body.memory.total);
    assert.match(system.body.memory.source, /^(vm_stat|meminfo|freemem)$/);
    assert.deepEqual((await read('system')).body, system.body, 'a reading is kept for 30 s');
    // No project is open in this state: nothing feeds the projects' widgets, and they say so.
    assert.deepEqual((await read('servers')).body, { available: false, projects: [] });
    assert.deepEqual((await read('memory')).body, { available: false, projects: [] });
    // This server is a project, not Home: the Coordinator's training is read from the Coordinator's
    // own room, and with that room closed nothing feeds it — never this project's record instead.
    assert.deepEqual((await read('coordinator')).body, { available: false });
    assert.equal((await read('nothing')).status, 404);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('home widgets: «MADRE usage» exists only with the author\'s token, and reads madre.run with it', async () => {
  const { createServer } = await import('node:http');
  const { writeSecret } = await import('../src/vault.mjs');
  const { OWNER_VAULT } = await import('../src/server.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-usage-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-usage-project-'));
  const heard = [];
  const fake = createServer((request, response) => {
    heard.push(`${request.method} ${request.headers.authorization ?? null}`);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, today: '2026-10-13', active: { day: 2, week: 3, month: 3, ever: 4 }, days: [], versions: [], os: [], node: [], retention: {} }));
  });
  const fakePort = await new Promise((resolve) => fake.listen(0, '127.0.0.1', () => resolve(fake.address().port)));
  const before = process.env.PULSE_USAGE_URL;
  process.env.PULSE_USAGE_URL = `http://127.0.0.1:${fakePort}/api/usage`;
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const read = () => fetch(`http://127.0.0.1:${port}/api/salas/widget?kind=usage`).then(async (response) => ({ status: response.status, body: await response.json() }));
    assert.equal((await read()).status, 404, 'no token: there is no such widget');
    assert.equal(heard.length, 0, 'and madre.run is not asked');
    assert.equal((await writeSecret(state, OWNER_VAULT, 'usage', 'f'.repeat(64))).ok, true);
    const owner = await read();
    assert.equal(owner.status, 200);
    assert.equal(owner.body.available, true);
    assert.deepEqual(owner.body.active, { day: 2, week: 3, month: 3, ever: 4 });
    // First it leaves this copy out of the figures (the author's own), then it reads them.
    assert.deepEqual(heard, [`POST Bearer ${'f'.repeat(64)}`, `GET Bearer ${'f'.repeat(64)}`]);
    assert.match(owner.body.mine, /^[0-9a-f-]{36}$/);
  } finally {
    if (before === undefined) delete process.env.PULSE_USAGE_URL; else process.env.PULSE_USAGE_URL = before;
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await new Promise((resolve) => fake.close(() => resolve()));
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
