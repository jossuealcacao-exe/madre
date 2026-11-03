import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FICHA_COOKIE, FICHA_HEADER, carriesFicha, cookieFicha, ensureFicha, fichaFile, previewKey, readFicha, withFicha } from '../src/ficha.mjs';
import { channelKey } from '../src/enlaces.mjs';
import { ensureSalasProject } from '../src/salas.mjs';
import { createPulseServer } from '../src/server.mjs';
import { playwrightServerFor } from '../src/modules/playwright.mjs';

// External review #5 (2026-11-02): MADRE's API answered any program of the computer. With the
// ficha on (src/ficha.mjs), a request has to carry it, or be one of the few that say nothing.

function ask(port, { method = 'GET', path = '/api/state', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method, path, headers }, (response) => {
      let text = '';
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];

async function open(options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ficha-'));
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, ficha: true, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { root, server, port: server.address().port };
}
async function close({ root, server }) {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
}

test('ficha · kept only for the person, made once, renewed only when asked', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ficha-file-'));
  try {
    assert.equal(await readFicha(root), null);
    const first = await ensureFicha(root);
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.equal(await ensureFicha(root), first, 'a second run made a new ficha without being asked');
    if (process.platform !== 'win32') {
      assert.equal((await stat(fichaFile(root))).mode & 0o777, 0o600);
      assert.equal((await stat(join(root, 'credentials'))).mode & 0o777, 0o700);
    }
    const renewed = await ensureFicha(root, { renew: true });
    assert.notEqual(renewed, first);
    assert.equal(await readFicha(root), renewed);
    assert.deepEqual((await readdir(join(root, 'credentials'))).filter((name) => name.endsWith('.tmp')), [], 'a draft was left behind');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('ficha · the address, the cookie and the header', () => {
  const ficha = 'a'.repeat(64);
  assert.equal(withFicha('http://127.0.0.1:4317/salas', ficha), `http://127.0.0.1:4317/salas?ficha=${ficha}`);
  assert.equal(withFicha('http://127.0.0.1:4317', null), 'http://127.0.0.1:4317');
  assert.equal(cookieFicha(`theme=dark; ${FICHA_COOKIE}=${ficha}; other=1`), ficha);
  assert.equal(cookieFicha('theme=dark'), null);
  assert.equal(carriesFicha({ [FICHA_HEADER]: ficha }, ficha), true);
  assert.equal(carriesFicha({ cookie: `${FICHA_COOKIE}=${ficha}` }, ficha), true);
  assert.equal(carriesFicha({ [FICHA_HEADER]: 'b'.repeat(64) }, ficha), false);
  assert.equal(carriesFicha({ [FICHA_HEADER]: ['x'] }, ficha), false);
  assert.equal(carriesFicha({}, ficha), false);
  assert.notEqual(previewKey(ficha), previewKey('b'.repeat(64)));
  assert.equal(previewKey(ficha).includes(ficha.slice(0, 16)), false);
});

test('ficha · a program without it reads nothing, installs nothing and opens no mode', async () => {
  const room = await open();
  const { port, root } = room;
  const ficha = await readFicha(root);
  try {
    const bare = await ask(port);
    assert.equal(bare.status, 401);
    assert.equal(bare.headers[FICHA_HEADER], 'needed');
    assert.doesNotMatch(bare.text, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal((await ask(port, { headers: { [FICHA_HEADER]: 'f'.repeat(64) } })).status, 401, 'a wrong ficha passed');
    assert.equal((await ask(port, { headers: { [FICHA_HEADER]: ficha } })).status, 200);
    assert.equal((await ask(port, { headers: { cookie: `${FICHA_COOKIE}=${ficha}` } })).status, 200);
    // The page's own Origin, written by hand, is not the ficha: #4 stays shut, no module lands.
    const page = { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}` };
    const arm = await ask(port, { method: 'POST', path: '/api/override/arm', headers: page, body: JSON.stringify({ mode: 4, agent: 'codex', words: ['confirm', 'confirm'] }) });
    assert.equal(arm.status, 401);
    const upload = await ask(port, { method: 'POST', path: '/api/extensions/upload', headers: page, body: JSON.stringify({ name: 'evil.mjs', text: "export default { id: 'evil', name: 'Evil' };\n", words: ['confirm', 'confirm'] }) });
    assert.equal(upload.status, 401);
    assert.deepEqual(await readdir(join(root, 'modules')).catch(() => []), []);
    // Saying it is the phone is not a way around it.
    assert.equal((await ask(port, { headers: { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone' } })).status, 401);
  } finally { await close(room); }
});

test('ficha · the page keeps it in a cookie, a tab without it is told where to open MADRE, the code is free', async () => {
  const room = await open();
  const { port, root } = room;
  const ficha = await readFicha(root);
  try {
    const opened = await ask(port, { path: `/?ficha=${ficha}` });
    assert.equal(opened.status, 303);
    assert.equal(opened.headers.location, '/');
    const cookie = String(opened.headers['set-cookie']);
    assert.match(cookie, new RegExp(`^${FICHA_COOKIE}=${ficha};`));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const home = await ask(port, { path: `/salas?ficha=${ficha}&para=x` });
    assert.equal(home.headers.location, '/salas?para=x');
    const wrong = await ask(port, { path: `/?ficha=${'0'.repeat(64)}` });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers['set-cookie'], undefined);
    const tab = await ask(port, { path: '/' });
    assert.equal(tab.status, 401);
    assert.match(tab.headers['content-type'], /text\/html/);
    assert.match(tab.text, /npx @jossuealcala\/madre/);
    assert.doesNotMatch(tab.text, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal((await ask(port, { path: '/', headers: { cookie: `${FICHA_COOKIE}=${ficha}` } })).status, 200);
    assert.equal((await ask(port, { path: '/app.js' })).status, 200, 'the page\'s code needs no ficha');
    assert.equal((await ask(port, { path: '/styles.css' })).status, 200);
  } finally { await close(room); }
});

test('ficha · whether a MADRE answers is free, which project it is is not', async () => {
  const room = await open();
  const { port, root } = room;
  try {
    const bare = JSON.parse((await ask(port, { path: '/api/version' })).text);
    assert.deepEqual(Object.keys(bare).sort(), ['current', 'name']);
    const full = JSON.parse((await ask(port, { path: '/api/version', headers: { [FICHA_HEADER]: await readFicha(root) } })).text);
    assert.ok(full.project, 'with the ficha, the project is said');
  } finally { await close(room); }
});

test('ficha · a link between projects passes with its own key, RIPLEY\'s preview with the preview key', async () => {
  const room = await open();
  const { port, root } = room;
  const ficha = await readFicha(root);
  try {
    const key = await channelKey(root);
    const linked = await ask(port, { path: '/api/enlace/state', headers: { 'x-madre-enlace': key } });
    assert.notEqual(linked.status, 401, 'the key of the links did not pass the door');
    assert.equal((await ask(port, { path: '/api/enlace/state', headers: { 'x-madre-enlace': 'f'.repeat(64) } })).status, 401);
    // The key of the links opens only the links' routes.
    assert.equal((await ask(port, { headers: { 'x-madre-enlace': key } })).status, 401);
    // Preview is off here: past the door it answers 412, before it 401.
    assert.equal((await ask(port, { path: `/preview/${previewKey(ficha)}/project/index.html` })).status, 412);
    assert.equal((await ask(port, { path: `/preview/${'0'.repeat(32)}/project/index.html` })).status, 401);
    assert.equal((await ask(port, { path: '/preview/project/index.html' })).status, 401);
    // The agents' browser is told the keyed address.
    const server = playwrightServerFor({ port, outputDir: root, preview: `/preview/${previewKey(ficha)}` });
    assert.match(server.brief, new RegExp(`/preview/${previewKey(ficha)}/project/<path>`));
    assert.doesNotMatch(server.brief, new RegExp(ficha));
  } finally { await close(room); }
});

test('ficha · only Home, opening the browser, makes a new one; a project keeps the one on file', async () => {
  const state = await mkdtemp(join(tmpdir(), 'pulse-ficha-home-'));
  const other = await mkdtemp(join(tmpdir(), 'pulse-ficha-project-'));
  try {
    const before = await ensureFicha(state);
    const project = await createPulseServer({ projectRoot: other, stateRoot: state, agents, ficha: true, renewFicha: true });
    assert.equal(await readFicha(state), before, 'a project renewed the ficha');
    await new Promise((resolve) => project.server.close(resolve));
    const home = await createPulseServer({ projectRoot: await ensureSalasProject(state), stateRoot: state, agents, ficha: true, renewFicha: true });
    const after = await readFicha(state);
    assert.notEqual(after, before, 'Home did not renew the ficha');
    // A project already open reads the new one when the file changes.
    const reader = (await createPulseServer({ projectRoot: other, stateRoot: state, agents, ficha: true })).currentFicha;
    assert.equal(await reader(), after);
    await new Promise((resolve) => home.server.close(resolve));
  } finally {
    await rm(state, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(other, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
