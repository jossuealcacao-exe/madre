import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changeHome, readHome } from '../src/looks.mjs';
import { createPulseServer } from '../src/server.mjs';

// Home arranged once for every port it is shown from (home.json), and turning MADRE off from its
// page: every open project closes the clean way, then the room that was asked.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];

test('home · the arrangement is kept whole, checked key by key, for every page', async () => {
  const state = await scratch('madre-home-');
  assert.deepEqual((await readHome(state)).saved, false);
  const layout = JSON.stringify({ order: ['bishop', 'projects', 'w-system'], size: { bishop: 12 }, rows: {} });
  assert.equal((await changeHome(state, { 'pulse.home.layout': layout, 'pulse.lobbyBar': JSON.stringify(['a-1', 'b-2']), 'pulse.home.order': 'mine' })).saved, true);
  const kept = await readHome(state);
  assert.equal(kept.home['pulse.home.layout'], layout);
  assert.equal(kept.home['pulse.home.order'], 'mine');
  assert.equal(kept.home['pulse.home.projects'], null);
  // A key nobody knows, or a value of the wrong shape, refuses the whole change.
  assert.equal((await changeHome(state, { 'pulse.theme': 'dark' })).error, 'key');
  assert.equal((await changeHome(state, { 'pulse.home.layout': '{not json', 'pulse.home.order': 'name' })).error, 'value');
  assert.equal((await changeHome(state, { 'pulse.lobbyBar': JSON.stringify([1, 2]) })).error, 'value');
  assert.equal((await readHome(state)).home['pulse.home.order'], 'mine', 'half a refused change was kept');
  // Cleared, a key goes back to how Home ships.
  await changeHome(state, { 'pulse.home.order': null });
  assert.equal((await readHome(state)).home['pulse.home.order'], null);
});

test('home · arranged from one port, the same on another, and after MADRE comes back', async () => {
  const state = await scratch('madre-home-ports-');
  const [rootA, rootB] = [await realpath(await scratch('madre-home-a-')), await realpath(await scratch('madre-home-b-'))];
  const a = await createPulseServer({ projectRoot: rootA, stateRoot: state, agents: roster, invokers: {} });
  const portA = await listen(a.server);
  const layout = JSON.stringify({ order: ['projects', 'bishop'], size: {}, rows: {} });
  try {
    const saved = await fetch(`http://127.0.0.1:${portA}/api/home-layout`, { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${portA}` }, body: JSON.stringify({ 'pulse.home.layout': layout }) });
    assert.equal(saved.status, 200);
  } finally { await close(a.server); }
  // Another project, another port, started after the first one closed.
  const b = await createPulseServer({ projectRoot: rootB, stateRoot: state, agents: roster, invokers: {} });
  const portB = await listen(b.server);
  try {
    const seen = await (await fetch(`http://127.0.0.1:${portB}/api/home-layout`)).json();
    assert.equal(seen.saved, true);
    assert.equal(seen.home['pulse.home.layout'], layout);
    const foreign = await fetch(`http://127.0.0.1:${portB}/api/home-layout`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.com' }, body: '{}' });
    assert.equal(foreign.status, 403, 'another site rearranged Home');
  } finally { await close(b.server); }
});

test('power · MADRE turns off only from its own page, and closes every open project before itself', async () => {
  const state = await scratch('madre-power-');
  const [rootA, rootB] = [await realpath(await scratch('madre-power-a-')), await realpath(await scratch('madre-power-b-'))];
  const a = await createPulseServer({ projectRoot: rootA, stateRoot: state, agents: roster, invokers: {} });
  const b = await createPulseServer({ projectRoot: rootB, stateRoot: state, agents: roster, invokers: {} });
  const [portA, portB] = [await listen(a.server), await listen(b.server)];
  await a.markOpen(portA);
  await b.markOpen(portB);
  const asked = { a: false, b: false };
  // What startPulse does on 'madre:close' (close and exit), without the exit.
  a.server.once('madre:close', () => { asked.a = true; });
  b.server.once('madre:close', () => { asked.b = true; b.releaseOpen(); });
  const off = (headers) => fetch(`http://127.0.0.1:${portA}/api/madre/shutdown`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });
  try {
    assert.equal((await off({})).status, 403, 'a process turned MADRE off');
    assert.equal((await off({ origin: `http://127.0.0.1:${portB}` })).status, 403, 'another page turned this one off');
    assert.deepEqual(asked, { a: false, b: false });
    const answer = await off({ origin: `http://127.0.0.1:${portA}`, 'sec-fetch-site': 'same-origin' });
    assert.equal(answer.status, 202);
    const body = await answer.json();
    assert.deepEqual([body.closed, body.stuck], [1, []]);
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.deepEqual(asked, { a: true, b: true }, 'a room was left open');
  } finally {
    await close(a.server).catch(() => {});
    await close(b.server).catch(() => {});
  }
});
