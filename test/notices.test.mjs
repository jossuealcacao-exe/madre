// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's notices (Q-11, 2026-11-06): signed on the author's computer, served by madre.run,
// shown by every copy that is on, with or without the diagnostics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appliesTo, currentNotices, noticeSeen, readFeed, readNotice, refreshNotices, signNotice, signRetire, verifiedNotice } from '../src/notices.mjs';
import { NOTICES_PUBLIC_KEY } from '../src/notices-key.mjs';
import { classify, DESTINATIONS } from '../src/outbound.mjs';
import { createPulseServer } from '../src/server.mjs';

const pair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { priv: privateKey.export({ type: 'pkcs8', format: 'pem' }), pub: publicKey.export({ type: 'spki', format: 'pem' }) };
};
const draft = (id, extra = {}) => ({
  id, level: 'important', title: { es: 'Actualiza', en: 'Update' }, body: { es: 'Hay un arreglo.', en: 'There is a fix.' },
  from: new Date(Date.now() - 60_000).toISOString(), until: new Date(Date.now() + 86_400_000).toISOString(), ...extra,
});

test('MADRE carries the public key of the author\'s notices', () => {
  assert.match(String(NOTICES_PUBLIC_KEY), /^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=]+\n-----END PUBLIC KEY-----$/);
});

test('only a notice signed with the author\'s key, word for word, is shown', () => {
  const author = pair();
  const stranger = pair();
  const signed = signNotice(draft('uno'), author.priv);
  assert.ok(verifiedNotice(signed, author.pub));
  assert.equal(verifiedNotice(signed, stranger.pub), null, 'another key');
  assert.equal(verifiedNotice({ ...signed, notice: { ...signed.notice, body: { es: 'Instala esto', en: 'Install this' } } }, author.pub), null, 'a word changed on the way');
  assert.equal(verifiedNotice({ ...signed, notice: { ...signed.notice, level: 'security' } }, author.pub), null, 'the level changed on the way');
  assert.equal(verifiedNotice({ notice: signed.notice, sig: 'x' }, author.pub), null);
  // What a notice may carry: text in both languages, a link only to madre.run, a life of 90 days at most.
  assert.throws(() => signNotice(draft('dos', { link: 'https://evil.example/' }), author.priv));
  assert.throws(() => signNotice(draft('dos', { link: 'http://madre.run/' }), author.priv));
  assert.ok(signNotice(draft('dos', { link: 'https://madre.run/windows' }), author.priv));
  assert.throws(() => signNotice(draft('tres', { title: { es: 'Solo español' } }), author.priv));
  assert.throws(() => signNotice(draft('Mayúsculas'), author.priv));
  assert.throws(() => signNotice(draft('cuatro', { until: new Date(Date.now() + 100 * 86_400_000).toISOString() }), author.priv));
  assert.equal(readNotice({ ...draft('cinco'), to: { os: ['beos'] } }), null);
});

test('a copy decides by itself whether a notice is for it: dates, versions, systems', () => {
  const now = Date.now();
  const notice = readNotice(draft('seis', { to: { min: '1.1.0', max: '1.1.2', os: ['wsl', 'linux'] } }));
  assert.equal(appliesTo(notice, { version: '1.1.2', platform: 'linux', now }), true);
  assert.equal(appliesTo(notice, { version: '1.1.3', platform: 'linux', now }), false, 'newer than its max');
  assert.equal(appliesTo(notice, { version: '1.0.6', platform: 'linux', now }), false, 'older than its min');
  assert.equal(appliesTo(notice, { version: '1.1.2', platform: 'darwin', now }), false, 'not its system');
  assert.equal(appliesTo(notice, { version: '1.1.2', platform: 'linux', wsl: true, now }), true, 'WSL is its own system');
  assert.equal(appliesTo(notice, { version: '1.1.2', platform: 'linux', now: now + 2 * 86_400_000 }), false, 'expired');
});

test('the feed: a notice retired by the author goes, one retired by anyone else stays', () => {
  const author = pair();
  const stranger = pair();
  const a = signNotice(draft('siete'), author.priv);
  const b = signNotice(draft('ocho'), author.priv);
  const feed = readFeed({ notices: [a, b, { notice: draft('nueve'), sig: 'A'.repeat(88) }], retired: [signRetire('siete', author.priv), signRetire('ocho', stranger.priv)] }, author.pub);
  assert.deepEqual(feed.entries.map((one) => one.notice.id), ['ocho']);
  assert.deepEqual(feed.retired, ['siete']);
});

test('asked of madre.run without a word about the copy; shown, «got it», and off except security', async () => {
  const author = pair();
  const state = await mkdtemp(join(tmpdir(), 'madre-notices-'));
  const asked = [];
  const served = { notices: [signNotice(draft('diez', { level: 'info' }), author.priv), signNotice(draft('once', { level: 'security' }), author.priv)], retired: [] };
  const fetchImpl = async (url, init = {}) => { asked.push({ url, init }); return new Response(JSON.stringify(served), { status: 200 }); };
  try {
    const env = { PULSE_NOTICES_URL: 'https://madre.run/api/avisos' };
    assert.equal((await refreshNotices({ stateRoot: state, env, fetchImpl, publicKey: author.pub })).fresh, true);
    assert.equal(asked.length, 1);
    assert.equal(asked[0].url, 'https://madre.run/api/avisos', 'no version, no identifier in the address');
    assert.equal(asked[0].init.method ?? 'GET', 'GET');
    assert.equal(asked[0].init.body, undefined);
    // At most every 15 minutes per computer.
    assert.equal((await refreshNotices({ stateRoot: state, env, fetchImpl, publicKey: author.pub })).fresh, false);
    assert.equal(asked.length, 1);
    let shown = await currentNotices({ stateRoot: state, version: '1.1.3', publicKey: author.pub });
    assert.deepEqual(shown.map((one) => one.id), ['once', 'diez'], 'security first');
    shown = await currentNotices({ stateRoot: state, version: '1.1.3', publicKey: author.pub, enabled: false });
    assert.deepEqual(shown.map((one) => one.id), ['once'], 'turned off, security still shows');
    assert.equal(await noticeSeen(state, 'diez'), true);
    assert.equal(await noticeSeen(state, '../x'), false);
    shown = await currentNotices({ stateRoot: state, version: '1.1.3', publicKey: author.pub });
    assert.equal(shown.find((one) => one.id === 'diez').seen, true);
    // A key that does not verify what is kept: nothing shows.
    assert.deepEqual(await currentNotices({ stateRoot: state, version: '1.1.3', publicKey: pair().pub }), []);
    // Off for development: nothing is asked.
    assert.equal((await refreshNotices({ stateRoot: state, env: { ...env, PULSE_NOTICES: '0' }, fetchImpl, publicKey: author.pub, force: true })).off, true);
    assert.equal(asked.length, 1);
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test('the request is declared in what leaves the machine', async () => {
  assert.equal(classify('https://madre.run/api/avisos').id, 'notices');
  const one = DESTINATIONS.find((destination) => destination.id === 'notices');
  assert.match(one.what, /Nothing about you/);
  const reference = await readFile(new URL('../docs/REFERENCE.md', import.meta.url), 'utf8');
  assert.match(reference, /\*\*Los avisos del autor\.\*\*/);
});

test('the routes: a copy reads and settles its notices; only the author\'s copy writes one, signed here', async () => {
  const author = pair();
  const state = await mkdtemp(join(tmpdir(), 'madre-notices-routes-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-notices-project-'));
  const keyDir = await mkdtemp(join(tmpdir(), 'madre-notices-key-'));
  const received = [];
  // madre.run, on this computer: keeps what the author sends and serves it.
  const kept = { notices: [], retired: [] };
  const site = createServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    if (request.method === 'POST') {
      received.push({ auth: request.headers.authorization, body: JSON.parse(raw) });
      const body = JSON.parse(raw);
      if (body.retire) kept.retired.push(body.retire); else kept.notices.push(body);
      response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"ok":true}'); return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(kept));
  });
  await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve));
  const saved = { url: process.env.PULSE_NOTICES_URL, dir: process.env.MADRE_NOTICES_KEY_DIR };
  process.env.PULSE_NOTICES_URL = `http://127.0.0.1:${site.address().port}/api/avisos`;
  process.env.MADRE_NOTICES_KEY_DIR = keyDir;
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify(payload) });
    const read = await (await fetch(`${base}/api/notices`)).json();
    assert.equal(read.enabled, true);
    assert.deepEqual(read.notices, []);
    // The author's notices always arrive (2026-11-17): a switch saved before, or sent now, is not read.
    assert.equal((await (await post('/api/notices/settings', { enabled: false })).json()).enabled, true);
    assert.equal((await (await fetch(`${base}/api/notices`)).json()).enabled, true);
    assert.equal((await post('/api/notices/seen', { id: 'Nope!' })).status, 422);
    // Without the author's token and key, there is no writing at all.
    assert.equal((await post('/api/owner/notices', { notice: draft('doce') })).status, 404);
    // With them (this copy runs from source, as the suite does), it is signed here and sent.
    const { writeSecret } = await import('../src/vault.mjs');
    const { OWNER_VAULT } = await import('../src/server.mjs');
    await writeSecret(state, OWNER_VAULT, 'usage', 't'.repeat(48));
    await mkdir(keyDir, { recursive: true });
    await writeFile(join(keyDir, 'ed25519.pem'), author.priv, { mode: 0o600 });
    assert.equal((await post('/api/owner/notices', { notice: draft('Mal ID') })).status, 422);
    const sent = await post('/api/owner/notices', { notice: draft('doce') });
    assert.equal(sent.status, 200);
    assert.equal(received.length, 1);
    assert.equal(received[0].auth, `Bearer ${'t'.repeat(48)}`);
    assert.ok(verifiedNotice(received[0].body, author.pub), 'what left is signed with the key on this computer');
    assert.equal((await post('/api/owner/notices/retire', { id: 'doce' })).status, 200);
    assert.ok(received[1].body.retire?.sig);
  } finally {
    if (saved.url === undefined) delete process.env.PULSE_NOTICES_URL; else process.env.PULSE_NOTICES_URL = saved.url;
    if (saved.dir === undefined) delete process.env.MADRE_NOTICES_KEY_DIR; else process.env.MADRE_NOTICES_KEY_DIR = saved.dir;
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    site.close();
    for (const dir of [state, project, keyDir]) await rm(dir, { recursive: true, force: true });
  }
});
