import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { shadowFolderFor } from '../src/checkpoint.mjs';
import { ensureSalasProject, markProject, projectRoomId } from '../src/salas.mjs';
import { createPulseServer } from '../src/server.mjs';
import { checkStateRoot, npxFolders, planView, removeMadre, uninstallPlan } from '../src/uninstall.mjs';

// Uninstalling MADRE from Home's Settings (2026-10-29): what MADRE put on this computer goes, the
// person's own work stays, and nothing happens while a project could still write.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const there = (path) => stat(path).then(() => true, () => false);
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];

// A state folder with one project in it, as MADRE leaves them after some use.
async function used() {
  const state = await realpath(await scratch('madre-uninstall-state-'));
  const project = await realpath(await scratch('madre-uninstall-project-'));
  await writeFile(join(state, 'install-id'), 'id\n');
  await writeFile(join(state, 'config.json'), '{}\n');
  await mkdir(join(state, 'tools', 'bin'), { recursive: true });
  await writeFile(join(state, 'tools', 'bin', 'codex'), '');
  await markProject(join(state, 'rooms', projectRoomId(project)), project);
  await mkdir(join(project, '.pulse', 'sdk'), { recursive: true });
  await mkdir(join(project, '.pulse', 'out', '20261029-1'), { recursive: true });
  await writeFile(join(project, '.pulse', 'mother.env'), 'X=1\n');
  await writeFile(join(project, '.pulse', 'sdk', 'SDK.md'), '# SDK\n');
  await writeFile(join(project, '.pulse', 'out', '20261029-1', 'logo.png'), 'png');
  await mkdir(join(project, '.madre', 'modules'), { recursive: true });
  await writeFile(join(project, 'index.html'), '<p>mine</p>\n');
  // A turn's guard can leave a folder read-only (src/room/guard.mjs).
  await mkdir(join(project, '.pulse', 'locked'));
  await writeFile(join(project, '.pulse', 'locked', 'note'), 'x');
  await chmod(join(project, '.pulse', 'locked'), 0o500);
  const shadow = shadowFolderFor(project);
  await mkdir(shadow, { recursive: true });
  await writeFile(join(shadow, 'HEAD'), 'ref: refs/heads/main\n');
  return { state, project, shadow };
}

test('uninstall · only a folder MADRE made is ever taken away whole', async () => {
  const state = await scratch('madre-uninstall-check-');
  assert.equal(await checkStateRoot(state), false, 'an empty folder passed for MADRE\'s');
  await writeFile(join(state, 'install-id'), 'id\n');
  assert.equal(await checkStateRoot(state), true);
  assert.equal(await checkStateRoot('relative/.pulse'), false);
  assert.equal(await checkStateRoot('/'), false);
  assert.equal(await checkStateRoot(homedir()), false, 'the home folder passed for MADRE\'s');
  assert.equal(await checkStateRoot(state, { home: join(state, 'inside') }), false, 'a folder holding the home passed');
  assert.equal((await uninstallPlan({ stateRoot: homedir() })).ok, false);
});

test('uninstall · the plan says what goes and what stays, and MADRE takes away only what it said', async () => {
  const { state, project, shadow } = await used();
  const plan = await uninstallPlan({ stateRoot: state, install: 'global', name: '@jossuealcala/madre' });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.projects.map((one) => [one.root, one.made, Boolean(one.pulse), one.shadow]), [[project, 1, true, shadow]]);
  assert.deepEqual(plan.tools, ['codex']);
  assert.deepEqual(plan.modules, [plan.projects[0].name]);
  assert.equal(plan.program.command, 'npm uninstall -g @jossuealcala/madre');
  const view = planView(plan, { home: state });
  assert.equal(view.stateRoot, '~');
  assert.equal(view.projects[0].made, 1);

  const done = await removeMadre(plan);
  assert.deepEqual(done.failed, []);
  assert.equal(await there(state), false, 'MADRE\'s folder is still there');
  assert.equal(await there(shadow), false, 'the restore points are still there');
  // What the AIs created stays unless the person asked; the rest of .pulse goes, the locked folder too.
  assert.deepEqual(await readdir(join(project, '.pulse')), ['out']);
  assert.equal(await readFile(join(project, '.pulse', 'out', '20261029-1', 'logo.png'), 'utf8'), 'png');
  assert.equal(await readFile(join(project, 'index.html'), 'utf8'), '<p>mine</p>\n');
  assert.equal(await there(join(project, '.madre', 'modules')), true, 'a module the person wrote was taken');
});

test('uninstall · asked to, what the AIs created goes too', async () => {
  const { state, project } = await used();
  const plan = await uninstallPlan({ stateRoot: state, install: 'source', script: join(project, 'bin', 'madre.mjs') });
  assert.deepEqual([plan.program.install, plan.program.command, plan.program.folder], ['source', null, project]);
  const done = await removeMadre(plan, { made: true });
  assert.deepEqual(done.failed, []);
  assert.equal(await there(join(project, '.pulse')), false);
  assert.equal(await there(join(project, 'index.html')), true);
});

test('uninstall · the copies npx downloaded of MADRE, and no other package of npx', async () => {
  const cache = await scratch('madre-uninstall-npx-');
  const make = async (hash, dependencies) => {
    await mkdir(join(cache, '_npx', hash, 'node_modules'), { recursive: true });
    await writeFile(join(cache, '_npx', hash, 'package.json'), JSON.stringify({ dependencies }));
  };
  await make('a1b2c3d4e5f6a7b8', { '@jossuealcala/madre': '1.1.0' });
  await make('b1b2c3d4e5f6a7b8', { '@jossuealcala/madre': '1.0.5' });
  await make('c1b2c3d4e5f6a7b8', { 'other-tool': '1.0.0' });
  await make('d1b2c3d4e5f6a7b8', { '@jossuealcala/madre': '1.1.0', 'other-tool': '1.0.0' });
  const script = join(cache, '_npx', 'a1b2c3d4e5f6a7b8', 'node_modules', '@jossuealcala', 'madre', 'bin', 'madre.mjs');
  const found = await npxFolders({ script, name: '@jossuealcala/madre' });
  assert.deepEqual(found.map((one) => one.slice(-16)).sort(), ['a1b2c3d4e5f6a7b8', 'b1b2c3d4e5f6a7b8']);
  assert.deepEqual(await npxFolders({ script: '/usr/local/lib/node_modules/@jossuealcala/madre/bin/madre.mjs', name: '@jossuealcala/madre' }), []);
});

test('uninstall · only from Home, from a page of this computer, once every project closed', async () => {
  const state = await scratch('madre-uninstall-server-');
  const home = await ensureSalasProject(state);
  const other = await realpath(await scratch('madre-uninstall-other-'));
  const lobby = await createPulseServer({ projectRoot: home, stateRoot: state, agents: roster, invokers: {} });
  const room = await createPulseServer({ projectRoot: other, stateRoot: state, agents: roster, invokers: {} });
  const [portHome, portRoom] = [await listen(lobby.server), await listen(room.server)];
  await lobby.markOpen(portHome);
  await room.markOpen(portRoom);
  const asked = { room: false, uninstall: null };
  room.server.once('madre:close', () => { asked.room = true; room.releaseOpen(); });
  lobby.server.once('madre:uninstall', (payload) => { asked.uninstall = payload; });
  const go = (port, headers, body = '{}') => fetch(`http://127.0.0.1:${port}/api/madre/uninstall`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${portRoom}/api/madre/uninstall`)).status, 403, 'a project offered to uninstall MADRE');
    const plan = await (await fetch(`http://127.0.0.1:${portHome}/api/madre/uninstall`)).json();
    assert.equal(plan.ok, true);
    assert.deepEqual(plan.projects.map((one) => one.name), [other.split('/').pop()]);
    assert.equal((await go(portHome, {})).status, 403, 'a process uninstalled MADRE');
    assert.equal((await go(portHome, { origin: `http://127.0.0.1:${portRoom}` })).status, 403, 'another page uninstalled MADRE');
    assert.equal(asked.room, false);
    const answer = await go(portHome, { origin: `http://127.0.0.1:${portHome}`, 'sec-fetch-site': 'same-origin' }, JSON.stringify({ made: true }));
    assert.equal(answer.status, 202);
    assert.equal((await answer.json()).madeGo, true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(asked.room, true, 'the open project was not closed first');
    assert.equal(asked.uninstall?.made, true);
    assert.equal(asked.uninstall?.plan.stateRoot, state);
    // 1.1.0 read the room's diagnostics from startPulse, where they do not exist, and crashed
    // before removing anything: the farewell travels with the event and never throws.
    assert.equal(typeof asked.uninstall?.farewell, 'function');
    await asked.uninstall.farewell();
  } finally {
    await close(lobby.server).catch(() => {});
    await close(room.server).catch(() => {});
  }
});

// QA 1.1.0, ACT-03: the restore points a turn kept inside the project's own git (.env included)
// go with MADRE, and the project's history and branches stay.
test('uninstall · the restore points inside the project\'s git go, its history stays', async () => {
  const { execFileSync } = await import('node:child_process');
  const state = await realpath(await scratch('madre-uninstall-refs-state-'));
  const project = await realpath(await scratch('madre-uninstall-refs-project-'));
  await writeFile(join(state, 'install-id'), 'id\n');
  await markProject(join(state, 'rooms', projectRoomId(project)), project);
  const git = (...args) => execFileSync('git', ['-C', project, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'mine');
  await writeFile(join(project, '.env'), 'KEY=secret\n');
  const tree = git('write-tree');
  const photo = git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit-tree', tree, '-m', 'checkpoint');
  git('update-ref', 'refs/madre/checkpoints/20261029-a', photo);
  git('update-ref', 'refs/madre/checkpoints/20261029-b', photo);
  const plan = await uninstallPlan({ stateRoot: state, install: 'source', script: '/src/bin/madre.mjs' });
  assert.equal(planView(plan).restorePoints, 2);
  await removeMadre(plan);
  assert.equal(git('for-each-ref', 'refs/madre/'), '', 'no restore point is left in the project\'s git');
  assert.match(git('log', '--format=%s'), /mine/, 'the history is the person\'s and stays');
});
