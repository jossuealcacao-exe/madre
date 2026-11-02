import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hostIsLocal, refuseForeign } from '../src/request-guard.mjs';
import { createPulseServer } from '../src/server.mjs';

function ask(port, { method = 'GET', path = '/api/state', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method, path, headers }, (response) => {
      let text = '';
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, text }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

test('the room answers only to this computer by name', () => {
  for (const host of ['127.0.0.1:4317', 'localhost:4317', 'LOCALHOST', '[::1]:4317', '127.0.0.1']) assert.equal(hostIsLocal(host), true, host);
  for (const host of ['evil.example:4317', '127.0.0.1.evil.example', 'localhost.evil.example:4317', '', undefined]) assert.equal(hostIsLocal(host), false, String(host));
});

test('a page from another site cannot upload a module or change state', () => {
  const host = '127.0.0.1:4317';
  assert.match(refuseForeign({ method: 'POST', headers: { host, origin: 'https://evil.example' } }), /somewhere else/);
  assert.match(refuseForeign({ method: 'POST', headers: { host, origin: 'null' } }), /somewhere else/);
  assert.match(refuseForeign({ method: 'POST', headers: { host, origin: 'http://localhost:4317' } }), /somewhere else/);
  // DNS rebinding: the attacker's name arrives as Host, so even a read is refused.
  assert.match(refuseForeign({ method: 'GET', headers: { host: 'evil.example:4317' } }), /this computer/);
});

test('the room page, terminals and agents keep working', () => {
  const host = '127.0.0.1:4317';
  assert.equal(refuseForeign({ method: 'POST', headers: { host, origin: 'http://127.0.0.1:4317' } }), null);
  assert.equal(refuseForeign({ method: 'POST', headers: { host: 'localhost:4317', origin: 'http://localhost:4317' } }), null);
  assert.equal(refuseForeign({ method: 'POST', headers: { host } }), null);
  assert.equal(refuseForeign({ method: 'GET', headers: { host, origin: 'https://evil.example' } }), null);
});

test('a drive-by upload from another site never reaches the module folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-guard-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const module = JSON.stringify({ name: 'evil.mjs', text: "export default { id: 'evil', name: 'Evil' };" });
    // text/plain is what a page can send without a CORS preflight.
    const upload = await ask(port, { method: 'POST', path: '/api/extensions/upload', headers: { origin: 'https://evil.example', 'content-type': 'text/plain' }, body: module });
    assert.equal(upload.status, 403);
    assert.deepEqual(await readdir(join(root, 'modules')).catch(() => []), []);
    const rebound = await ask(port, { headers: { host: `evil.example:${port}` } });
    assert.equal(rebound.status, 403);
    const own = await ask(port, { headers: { origin: `http://127.0.0.1:${port}` } });
    assert.equal(own.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// External review #5 (2026-11-02): a module runs with the person's permissions, so installing one
// by hand asks for the #4 key. Before, any program on the computer installed one with a POST.
test('a module is installed only with the #4 key, never by a program on its own', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-guard-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const page = { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}` };
  const upload = (headers, extra = {}) => ask(port, { method: 'POST', path: '/api/extensions/upload', headers, body: JSON.stringify({ name: 'mine.mjs', text: "export default { id: 'mine', name: 'Mine' };\n", ...extra }) });
  const installed = async () => (await readdir(join(root, 'modules')).catch(() => [])).filter((name) => name.endsWith('.mjs'));
  try {
    // A program with no page behind it: refused before anything is read.
    assert.equal((await upload({ 'content-type': 'application/json' }, { words: ['confirm', 'confirm'] })).status, 403);
    // The page's own address, written by hand, still needs the key; one press is not #4's two.
    assert.equal((await upload(page)).status, 403);
    assert.equal((await upload(page, { words: ['confirm'] })).status, 403);
    assert.deepEqual(await installed(), []);
    // From the page, with the key: installed.
    const done = await upload(page, { words: ['confirm', 'confirm'] });
    assert.equal(done.status, 200, done.text);
    assert.equal((await installed()).length, 1);
    // A file an agent wrote in the project goes through the same key.
    await writeFile(join(root, 'other.module.mjs'), "export default { id: 'other', name: 'Other' };\n");
    const file = (headers, extra = {}) => ask(port, { method: 'POST', path: '/api/extensions/install-file', headers, body: JSON.stringify({ path: 'other.module.mjs', ...extra }) });
    assert.equal((await file({ 'content-type': 'application/json' }, { words: ['confirm', 'confirm'] })).status, 403);
    assert.equal((await file(page)).status, 403);
    assert.equal((await file(page, { words: ['confirm', 'confirm'] })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
