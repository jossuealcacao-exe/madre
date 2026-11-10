import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appDesktops, appInstalled, appInvite, appInviteDue, answerAppInvite, desktopOf, APP_PAGE } from '../src/app-invite.mjs';

// THE INVITATION TO THE APP (2026-11-10): a strip on Home for whoever updated MADRE on a Mac and uses
// it in the browser, once per version, once the app can be downloaded.
const updated = { seen: '1.1.3', returning: true };
const fresh = { seen: '1.1.4', returning: false };

test('app invitation: for a desktop, outside the app, after an update, without the app, once per version', () => {
  assert.equal(desktopOf({ platform: 'darwin' }), 'mac');
  assert.equal(desktopOf({ platform: 'win32' }), 'windows');
  assert.equal(desktopOf({ platform: 'linux', wsl: true }), 'windows', 'in WSL the person is at Windows');
  assert.equal(desktopOf({ platform: 'linux' }), 'linux');
  assert.equal(desktopOf({ platform: 'freebsd' }), null);
  const base = { desktop: 'mac', env: {}, novelty: updated, version: '1.1.4' };
  assert.equal(appInviteDue(base), true);
  assert.equal(appInviteDue({ ...base, desktop: 'linux' }), true, 'any desktop, until the manifest says whether there is an app for it');
  assert.equal(appInviteDue({ ...base, desktop: null }), false);
  assert.equal(appInviteDue({ ...base, novelty: fresh }), false, 'someone new meets the app at madre.run');
  assert.equal(appInviteDue({ ...base, env: { MADRE_APP: '1' } }), false, 'inside the app');
  assert.equal(appInviteDue({ ...base, installed: true }), false, 'the app is already here');
  assert.equal(appInviteDue({ ...base, answeredFor: '1.1.4' }), false, 'answered in this version');
  assert.equal(appInviteDue({ ...base, answeredFor: '1.1.3' }), true, 'a new version asks again');
  const seen = new Set(['/Users/x/Applications/MADRE.app']);
  assert.equal(appInstalled({ home: '/Users/x', exists: (path) => seen.has(path) }), true);
  assert.equal(appInstalled({ home: '/Users/y', exists: (path) => seen.has(path) }), false);
});

test('app invitation: only for a desktop latest.json lists, asked at most once a day', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-app-invite-'));
  try {
    let asked = 0;
    const answer = (status, body) => async () => { asked += 1; return new Response(JSON.stringify(body), { status }); };
    const yesterday = Date.now() - 25 * 3600 * 1000;
    assert.deepEqual(await appDesktops({ root, fetchImpl: answer(404, {}), now: yesterday }), [], 'not published yet');
    assert.deepEqual(await appDesktops({ root, fetchImpl: answer(200, { version: '1.1.4' }), now: yesterday + 1000 }), [], 'kept for a day');
    assert.equal(asked, 1);
    assert.deepEqual(await appDesktops({ root, fetchImpl: answer(200, { version: '1.1.4', platforms: { 'darwin-aarch64': {}, 'windows-x86_64': {} } }) }), ['mac', 'windows']);
    assert.deepEqual(await appDesktops({ root: join(root, 'b'), fetchImpl: answer(200, { version: '1.1.4' }) }), ['mac'], 'a version and no platforms: the first app, a Mac\'s');
    assert.deepEqual(await appDesktops({ root: join(root, 'c'), fetchImpl: answer(200, { version: 'latest; rm -rf ~' }) }), [], 'a version or nothing');
    assert.deepEqual(await appDesktops({ root: join(root, 'd'), fetchImpl: async () => { throw new Error('offline'); } }), []);

    const never = async () => { throw new Error('kept for a day: madre.run is not asked again'); };
    const ask = (platform, wsl = false) => appInvite({ root, novelty: updated, version: '1.1.4', platform, wsl, env: {}, installed: false, fetchImpl: never });
    assert.deepEqual(await ask('darwin'), { show: true, desktop: 'mac', url: APP_PAGE });
    assert.deepEqual(await ask('linux', true), { show: true, desktop: 'windows', url: APP_PAGE }, 'WSL gets the Windows app');
    assert.deepEqual(await ask('linux'), { show: false, desktop: 'linux' }, 'no app for Linux in this manifest');
    assert.deepEqual(await answerAppInvite(root, { answer: 'shown', version: '1.1.4' }), { ok: true });
    assert.equal((await ask('darwin')).show, true, '«shown» only counts');
    assert.deepEqual(await answerAppInvite(root, { answer: 'maybe', version: '1.1.4' }), { error: 'answer' });
    await answerAppInvite(root, { answer: 'later', version: '1.1.4' });
    assert.equal((await ask('darwin')).show, false, 'staying in the browser spends it for this version');
    assert.equal(JSON.parse(await readFile(join(root, 'app-invite.json'), 'utf8')).answered, '1.1.4');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('app invitation: Home answers it, a project and a phone never do', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { ensureSalasProject } = await import('../src/salas.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-app-invite-home-'));
  const manifest = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ version: '9.9.9' })); });
  await new Promise((resolve) => manifest.listen(0, '127.0.0.1', resolve));
  const was = process.env.PULSE_APP_MANIFEST_URL;
  process.env.PULSE_APP_MANIFEST_URL = `http://127.0.0.1:${manifest.address().port}/latest.json`;
  let server;
  try {
    await writeFile(join(state, 'whats-new.json'), JSON.stringify({ seen: '1.0.0' }));
    const home = await ensureSalasProject(state);
    ({ server } = await createPulseServer({ projectRoot: home, stateRoot: state, agents: [], invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const said = await (await fetch(`${base}/api/invite/app`)).json();
    assert.ok(Array.isArray(said.projects) && said.count === 0, 'the person\'s projects come with it');
    const ask = async (headers = {}) => (await (await fetch(`${base}/api/invite/app`, { headers })).json()).show;
    assert.equal(await ask(), process.platform === 'darwin' && !appInstalled(), 'on a Mac without MADRE.app, Home shows it (the manifest names a version and no platforms: a Mac\'s)');
    assert.equal(await ask({ 'x-madre-device': 'phone-1' }), false, 'never on a phone');
    const say = (answer) => fetch(`${base}/api/invite/app`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ answer }) });
    assert.equal((await say('maybe')).status, 422);
    assert.equal((await say('later')).status, 200);
    assert.equal(await ask(), false, 'answered');
  } finally {
    if (was === undefined) delete process.env.PULSE_APP_MANIFEST_URL; else process.env.PULSE_APP_MANIFEST_URL = was;
    if (server) await new Promise((resolve) => server.close(() => resolve()));
    await new Promise((resolve) => manifest.close(() => resolve()));
    await rm(state, { recursive: true, force: true });
  }
});
