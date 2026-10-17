import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changeLooks, changeRoomLook, readLooks, roomLooks } from '../src/looks.mjs';
import { createPulseServer } from '../src/server.mjs';

// THE LOOKS ARE THE PERSON'S (2026-10-12): Home and every project are different origins, so what one
// browser kept for one page the others never saw. ~/.pulse/looks.json holds them for all of them.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];

test('looks · kept once for every page, read key by key, and a bad change is refused whole', async () => {
  const state = await realpath(await scratch('madre-looks-'));
  try {
    assert.deepEqual(await readLooks(state), { looks: { 'pulse.theme': null, 'pulse.accent': null, 'pulse.wallpaper': null, 'pulse.wallpaper.style': null, 'pulse.wallpaper.veil': null, 'pulse.wallpaper.blur': null, 'pulse.bubbles': null, 'pulse.text': null, 'pulse.neural': null }, saved: false });
    const changed = await changeLooks(state, { 'pulse.theme': 'dark', 'pulse.wallpaper': 'oceano', 'pulse.wallpaper.veil': '80' });
    assert.equal(changed.looks['pulse.theme'], 'dark');
    assert.equal((await readLooks(state)).saved, true);
    // A key no page shares, or a value of the wrong shape: nothing is written.
    assert.equal((await changeLooks(state, { 'pulse.home.cards': 'compact' })).error, 'key');
    assert.equal((await changeLooks(state, { 'pulse.theme': 'dark', 'pulse.accent': '<script>' })).error, 'value');
    assert.equal((await changeLooks(state, { 'pulse.wallpaper.blur': '1000' })).error, 'value');
    assert.equal((await readLooks(state)).looks['pulse.accent'], null);
    // null puts a look back to the room as it always was.
    assert.equal((await changeLooks(state, { 'pulse.wallpaper': null })).looks['pulse.wallpaper'], null);
    // A file written by hand is read for what it says correctly.
    await writeFile(join(state, 'looks.json'), JSON.stringify({ looks: { 'pulse.theme': 'light', 'pulse.text': 42, extra: 'x' } }));
    const read = await readLooks(state);
    assert.equal(read.looks['pulse.theme'], 'light');
    assert.equal(read.looks['pulse.text'], null);
    assert.equal(Object.hasOwn(read.looks, 'extra'), false);
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test('looks · two pages of two projects share the theme through the server', async () => {
  const state = await realpath(await scratch('madre-looks-state-'));
  const one = await realpath(await scratch('madre-looks-a-'));
  const two = await realpath(await scratch('madre-looks-b-'));
  let a; let b;
  try {
    ({ server: a } = await createPulseServer({ projectRoot: one, stateRoot: state, agents: roster, invokers: {} }));
    ({ server: b } = await createPulseServer({ projectRoot: two, stateRoot: state, agents: roster, invokers: {} }));
    const [portA, portB] = [await listen(a), await listen(b)];
    const page = (port) => ({ 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, 'sec-fetch-site': 'same-origin' });
    const set = await fetch(`http://127.0.0.1:${portA}/api/looks`, { method: 'POST', headers: page(portA), body: JSON.stringify({ 'pulse.theme': 'dark', 'pulse.accent': 'malbec' }) });
    assert.equal(set.status, 200);
    const seen = await fetch(`http://127.0.0.1:${portB}/api/looks`).then((response) => response.json());
    assert.equal(seen.saved, true);
    assert.equal(seen.looks['pulse.theme'], 'dark', 'the other project did not see the theme');
    assert.equal(seen.looks['pulse.accent'], 'malbec');
    assert.equal((await fetch(`http://127.0.0.1:${portB}/api/looks`, { method: 'POST', headers: page(portB), body: JSON.stringify({ 'pulse.secret': 'x' }) })).status, 400);
    // Another site cannot set how MADRE looks.
    const foreign = await fetch(`http://127.0.0.1:${portB}/api/looks`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify({ 'pulse.theme': 'light' }) });
    assert.notEqual(foreign.status, 200);
    assert.equal(JSON.parse(await readFile(join(state, 'looks.json'), 'utf8')).looks['pulse.theme'], 'dark');
  } finally {
    if (a) await close(a);
    if (b) await close(b);
    for (const dir of [state, one, two]) await rm(dir, { recursive: true, force: true });
  }
});

test('looks · a project may keep a wallpaper of its own, and a shared change never takes it away', async () => {
  const state = await scratch('madre-looks-room-');
  try {
    await changeLooks(state, { 'pulse.wallpaper': 'canela', 'pulse.theme': 'dark' });
    assert.deepEqual(await changeRoomLook(state, 'pulse-3c377cb62303118e', 'magna'), { own: { wallpaper: 'magna' } });
    assert.deepEqual((await readLooks(state, { room: 'pulse-3c377cb62303118e' })).own, { wallpaper: 'magna' });
    assert.equal((await readLooks(state, { room: 'another-1234' })).own, null);
    assert.equal((await readLooks(state)).looks['pulse.wallpaper'], 'canela', 'the shared wallpaper stays as it was');
    // A shared change keeps every project's own.
    await changeLooks(state, { 'pulse.wallpaper': 'xico' });
    assert.deepEqual(await roomLooks(state), { 'pulse-3c377cb62303118e': { wallpaper: 'magna' } });
    assert.deepEqual(await changeRoomLook(state, 'pulse-3c377cb62303118e', 'no way!'), { error: 'value' });
    assert.deepEqual(await changeRoomLook(state, '../x/../../y', 'magna'), { error: 'room' });
    assert.deepEqual(await changeRoomLook(state, 'pulse-3c377cb62303118e', null), { own: null });
    assert.deepEqual(await roomLooks(state), {});
    assert.equal((await readLooks(state)).looks['pulse.theme'], 'dark');
  } finally { await rm(state, { recursive: true, force: true }); }
});
