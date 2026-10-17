import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dropWallpaper, frameWallpaper, readWallpaper, saveWallpaper, wallpaperBytes, WALLPAPER_BYTES } from '../src/looks.mjs';
import { createPulseServer } from '../src/server.mjs';

// Your own wallpaper (1.0.3): one picture of the person's, kept once for every page, with the
// colours the page took from it and the point of it that stays in view. Only a picture is kept.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const scheme = (n) => ({ veil: [n, n, n], tint: [n, n, n], mesh: [[n, n, n], [n, n, n], [n, n, n]] });
const META = { w: 2880, h: 1620, focus: { x: 50, y: 40 }, palette: { dark: scheme(12), light: scheme(246) } };

test('wallpaper · a picture is kept with what the page said of it, and nothing else is', async () => {
  const state = await scratch('madre-wall-');
  assert.equal(await readWallpaper(state), null);
  const kept = await saveWallpaper(state, PNG, META);
  assert.equal(kept.custom.type, 'image/png');
  assert.match(kept.custom.v, /^[0-9a-f]{16}$/);
  assert.deepEqual([kept.custom.w, kept.custom.h, kept.custom.focus], [2880, 1620, { x: 50, y: 40 }]);
  assert.deepEqual(await readWallpaper(state), kept.custom);
  assert.deepEqual((await wallpaperBytes(state)).bytes, PNG);
  // Not a picture, a picture that says it is something else, or words about it of the wrong shape.
  assert.equal((await saveWallpaper(state, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), META)).error, 'type');
  assert.equal((await saveWallpaper(state, Buffer.alloc(0), META)).error, 'empty');
  assert.equal((await saveWallpaper(state, Buffer.alloc(WALLPAPER_BYTES + 1, 0xff), META)).error, 'size');
  assert.equal((await saveWallpaper(state, PNG, { ...META, palette: { dark: scheme(300), light: scheme(1) } })).error, 'meta');
  assert.equal((await saveWallpaper(state, PNG, { ...META, focus: { x: 140, y: 0 } })).error, 'meta');
  assert.equal((await readWallpaper(state)).v, kept.custom.v, 'a refused picture replaced the one kept');
  // Framed again, then taken away.
  assert.deepEqual((await frameWallpaper(state, { x: 12.34, y: 80 })).custom.focus, { x: 12.3, y: 80 });
  assert.equal((await frameWallpaper(state, { x: -1, y: 0 })).error, 'value');
  assert.deepEqual(await dropWallpaper(state), { custom: null });
  assert.equal(await readWallpaper(state), null);
  assert.equal(await wallpaperBytes(state), null);
  assert.equal((await frameWallpaper(state, { x: 1, y: 1 })).error, 'none');
});

test('wallpaper · sent by the page, shown to every page as the picture it is, never from another site', async () => {
  const state = await scratch('madre-wall-routes-');
  const root = await realpath(await scratch('madre-wall-proj-'));
  const server = await createPulseServer({ projectRoot: root, stateRoot: state, agents: roster, invokers: {} });
  const port = await listen(server.server);
  const base = `http://127.0.0.1:${port}`;
  const put = (bytes, meta, origin = base) => fetch(`${base}/api/looks/wallpaper`, { method: 'PUT', headers: { 'content-type': 'image/png', origin, 'x-madre-wallpaper': encodeURIComponent(JSON.stringify(meta)) }, body: bytes });
  try {
    assert.equal((await fetch(`${base}/api/looks/wallpaper`)).status, 404);
    assert.equal((await fetch(`${base}/api/looks`).then((r) => r.json())).custom, null);
    assert.equal((await put(PNG, META, 'https://example.com')).status, 403, 'another site set a wallpaper');
    const sent = await put(PNG, META);
    assert.equal(sent.status, 200);
    const { custom } = await sent.json();
    const looks = await fetch(`${base}/api/looks`).then((r) => r.json());
    assert.deepEqual(looks.custom, custom);
    const shown = await fetch(`${base}/api/looks/wallpaper?v=${custom.v}`);
    assert.equal(shown.headers.get('content-type'), 'image/png');
    assert.equal(shown.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await shown.arrayBuffer()), PNG);
    assert.equal((await put(Buffer.from('<svg/>'), META)).status, 400);
    const framed = await fetch(`${base}/api/looks/wallpaper/frame`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ x: 0, y: 100 }) });
    assert.deepEqual((await framed.json()).custom.focus, { x: 0, y: 100 });
    assert.equal((await fetch(`${base}/api/looks/wallpaper`, { method: 'DELETE', headers: { origin: 'https://example.com' } })).status, 403);
    assert.deepEqual(await fetch(`${base}/api/looks/wallpaper`, { method: 'DELETE', headers: { origin: base } }).then((r) => r.json()), { custom: null });
    assert.equal((await fetch(`${base}/api/looks/wallpaper`)).status, 404);
  } finally {
    await close(server.server);
  }
});
