import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { access, mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from '../src/cli-args.mjs';
import { ensureSalasProject, isSalasRoom, knownRooms, projectRootFor, salasProjectRoot, salasRoomId } from '../src/salas.mjs';
import { createPulseServer } from '../src/server.mjs';

// THE ROOM OF SALAS (docs/MACROVERSO.md, phase 3d; D-S08 and D-S09 assumed): `madre salas` opens a
// room like any other whose project is MADRE's own notebook, `~/.pulse/salas`; a bare `madre` from
// the home folder itself opens the same room; the room knows it is that room, and Salas lists it
// as it lists any room. Nothing here says anything about permissions on win32, and no path is
// compared as text: both sides are real paths (tmpdir on a Mac is a link, and so may a home be).
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
const freePort = () => new Promise((resolve) => { const probe = createServer(); probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });

test('sala de salas · `madre salas` is a command like `start`, with --no-open and --port; --help after any command asks for the help', () => {
  assert.equal(parseArgs(['salas']).command, 'salas');
  const full = parseArgs(['salas', '--no-open', '--port', '4400']);
  assert.equal(full.command, 'salas');
  assert.equal(full.has('no-open'), true);
  assert.equal(full.option('port'), '4400');
  assert.equal(full.explicit('port'), true);
  assert.equal(full.explicit('project'), false);
  assert.equal(parseArgs(['salas', '--port=4401']).option('port'), '4401');
  // The help is asked for with --help wherever it stands; before, `madre start --help` opened a room.
  assert.equal(parseArgs(['salas', '--help']).command, 'help');
  assert.equal(parseArgs(['start', '--help']).command, 'help');
  assert.equal(parseArgs(['doctor', '-h']).command, 'help');
  assert.equal(parseArgs(['--help']).command, 'help');
  // A word that happens to be `help` as a value is still a value.
  assert.equal(parseArgs(['doctor', '--catalog', 'help']).command, 'doctor');
  // What was there stays as it was.
  assert.equal(parseArgs([]).command, 'start');
  assert.equal(parseArgs(['--no-open']).command, 'start');
  assert.equal(parseArgs(['start', '--project', '/p']).option('project'), '/p');
});

test('sala de salas · which project a run is about: --project always, `madre salas` and `madre` from home open Salas, anywhere else opens that folder (D-S09)', async () => {
  const state = await scratch('madre-salas-state-');
  const home = await scratch('madre-salas-home-');
  const elsewhere = await scratch('madre-salas-elsewhere-');
  const inside = join(home, 'a-project');
  await mkdir(inside);
  const salas = resolve(salasProjectRoot(state));
  // `madre salas`: the notebook, wherever it is run from.
  assert.equal(projectRootFor({ command: 'salas', project: null, cwd: elsewhere, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'salas', project: null, cwd: home, home, stateRoot: state }), salas);
  // `madre` from the home folder itself: the notebook. From a folder inside it, or anywhere else:
  // that folder, as it always was. No guess about what looks like a project.
  assert.equal(projectRootFor({ command: 'start', project: null, cwd: home, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'start', project: null, cwd: inside, home, stateRoot: state }), inside);
  assert.equal(projectRootFor({ command: 'start', project: null, cwd: elsewhere, home, stateRoot: state }), elsewhere);
  assert.equal(projectRootFor({ command: 'start', project: undefined, cwd: elsewhere, home, stateRoot: state }), elsewhere);
  // Home and cwd are the same folder whichever way each is spelled (tmpdir is a link on a Mac; a
  // home may be one anywhere): they are compared as real paths, never as text.
  const realHome = await realpath(home);
  const linkedHome = join(state, 'home-link');
  await symlink(home, linkedHome);
  assert.notEqual(linkedHome, realHome);
  for (const [cwd, from] of [[realHome, home], [home, realHome], [linkedHome, home], [home, linkedHome], [linkedHome, realHome]]) {
    assert.equal(projectRootFor({ command: 'start', project: null, cwd, home: from, stateRoot: state }), salas, `cwd ${cwd} is not home ${from}`);
  }
  assert.equal(projectRootFor({ command: 'start', project: null, cwd: `${home}/`, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'start', project: null, cwd: join(home, 'a-project', '..'), home, stateRoot: state }), salas);
  // --project wins, always: with `salas`, from home, in either spelling.
  assert.equal(projectRootFor({ command: 'salas', project: elsewhere, cwd: home, home, stateRoot: state }), elsewhere);
  assert.equal(projectRootFor({ command: 'start', project: elsewhere, cwd: home, home, stateRoot: state }), elsewhere);
  assert.equal(projectRootFor({ command: 'start', project: 'a-project', cwd: home, home, stateRoot: state }), resolve('a-project'), 'a relative --project resolves as it always did');
  // --project given with nothing after it is no project.
  assert.equal(projectRootFor({ command: 'start', project: '', cwd: elsewhere, home, stateRoot: state }), elsewhere);
  // The rule is the same for any command that works on a project: `madre doctor` from home reports
  // the notebook, as `madre` from home would open it.
  assert.equal(projectRootFor({ command: 'doctor', project: null, cwd: home, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'doctor', project: null, cwd: elsewhere, home, stateRoot: state }), elsewhere);
  // The lobby (2026-10-10): a bare `madre` — no command word at all — opens the lobby from any
  // folder; `madre start`, written, keeps opening the folder it is run in; `madre lobby` is the lobby.
  assert.equal(projectRootFor({ command: 'start', named: false, project: null, cwd: inside, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'start', named: false, project: null, cwd: elsewhere, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'start', named: true, project: null, cwd: inside, home, stateRoot: state }), inside);
  assert.equal(projectRootFor({ command: 'lobby', project: null, cwd: inside, home, stateRoot: state }), salas);
  assert.equal(projectRootFor({ command: 'start', named: false, project: elsewhere, cwd: home, home, stateRoot: state }), elsewhere, '--project still wins');
  assert.equal(parseArgs([]).named, false);
  assert.equal(parseArgs(['--no-open']).named, false);
  assert.equal(parseArgs(['start']).named, true);
  assert.equal(parseArgs(['lobby', '--port', '4400']).named, true);
  // The notebook of a state root that is not there yet is still where it will be.
  assert.equal(projectRootFor({ command: 'salas', project: null, cwd: elsewhere, home, stateRoot: join(state, 'later') }), join(state, 'later', 'salas'));
});

test('sala de salas · the notebook is made empty the first time and left alone after; a room knows whether it is the room of Salas from real paths', async () => {
  const state = await scratch('madre-salas-notebook-');
  const folder = salasProjectRoot(state);
  await assert.rejects(access(folder), 'the notebook is there before anything asked for it');
  assert.equal(await ensureSalasProject(state), folder);
  assert.deepEqual(await readdir(folder), [], 'something was written inside the notebook');
  // Asked again: nothing new, and what is there stays.
  await writeFile(join(folder, 'plan.md'), '# a plan\n');
  assert.equal(await ensureSalasProject(state), folder);
  assert.deepEqual(await readdir(folder), ['plan.md']);
  assert.deepEqual((await readdir(state)).sort(), ['salas'], 'the notebook was made somewhere else too');
  // The real path and the given one are the same folder; a neighbour is not; a notebook not yet
  // made is still the notebook.
  assert.equal(isSalasRoom(folder, state), true);
  assert.equal(isSalasRoom(await realpath(folder), state), true);
  assert.equal(isSalasRoom(folder, await realpath(state)), true);
  assert.equal(isSalasRoom(`${folder}/`, state), true);
  assert.equal(isSalasRoom(join(state, 'salas2'), state), false);
  assert.equal(isSalasRoom(state, state), false);
  assert.equal(isSalasRoom(join(folder, 'deeper'), state), false);
  const later = join(state, 'later');
  assert.equal(isSalasRoom(join(later, 'salas'), later), true);
  await mkdir(later);
  assert.equal(isSalasRoom(join(await realpath(later), 'salas'), later), true, 'the notebook not yet made, named by the real path of its parent');
});

test('sala de salas · the room says it is the room of Salas, is listed with the id of Salas, and finds itself in /api/salas; any other room says it is not', async () => {
  const state = await scratch('madre-salas-rooms-');
  const other = await scratch('madre-salas-other-');
  const notebook = await ensureSalasProject(state);
  const salas = await createPulseServer({ projectRoot: notebook, stateRoot: state, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'done' }) } });
  const plain = await createPulseServer({ projectRoot: other, stateRoot: state, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'done' }) } });
  const salasPort = await listen(salas.server);
  const plainPort = await listen(plain.server);
  await salas.markOpen(salasPort);
  await plain.markOpen(plainPort);
  try {
    const stateOfSalas = await fetch(`http://127.0.0.1:${salasPort}/api/state`).then((answer) => answer.json());
    assert.equal(stateOfSalas.salas, true);
    assert.equal(stateOfSalas.room, salasRoomId(state));
    const stateOfPlain = await fetch(`http://127.0.0.1:${plainPort}/api/state`).then((answer) => answer.json());
    assert.equal(stateOfPlain.salas, false);
    // The phone sees the same answer; the key is the page's business, the route is not new.
    assert.equal((await fetch(`http://127.0.0.1:${salasPort}/api/state`, { headers: { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone' } }).then((answer) => answer.json())).salas, true);
    // Listed as any room, under the id Salas already computed for it (S-004: project.json is there).
    const rooms = await knownRooms(state);
    const listed = rooms.find((room) => room.id === salasRoomId(state));
    assert.ok(listed, `the room of Salas is not listed: ${rooms.map((room) => room.id).join(', ')}`);
    assert.equal(listed.open.port, salasPort);
    assert.equal(listed.root, await realpath(notebook));
    assert.equal(listed.name, 'salas');
    assert.ok(rooms.some((room) => room.open?.port === plainPort), 'the other room is not listed');
    // Salas, served by that room, finds it at `here` and names it as `salas`; served by the other
    // room, the same id is `salas` and `here` is the other room.
    const fromSalas = await fetch(`http://127.0.0.1:${salasPort}/api/salas`).then((answer) => answer.json());
    const mine = fromSalas.rooms.find((room) => room.here);
    assert.equal(mine.id, salasRoomId(state));
    assert.equal(fromSalas.salas, mine.id);
    assert.equal(fromSalas.here, mine.id);
    const fromPlain = await fetch(`http://127.0.0.1:${plainPort}/api/salas`).then((answer) => answer.json());
    assert.equal(fromPlain.salas, salasRoomId(state));
    assert.notEqual(fromPlain.here, fromPlain.salas);
    assert.equal(fromPlain.rooms.find((room) => room.id === fromPlain.salas).here, false);
    // The switcher's list (2026-10-10): the open rooms, each with its glance and never a census;
    // the room that asks is marked and not asked about itself. Read only from this Mac's pages.
    const open = await fetch(`http://127.0.0.1:${plainPort}/api/salas/open`).then((answer) => answer.json());
    assert.equal(open.here, fromPlain.here);
    assert.equal(open.salas, salasRoomId(state));
    const across = open.rooms.find((room) => room.id === salasRoomId(state));
    assert.equal(across.port, salasPort);
    assert.ok(Array.isArray(across.glance.working) && Number.isInteger(across.glance.waitingCount), 'the other room came without its glance');
    assert.equal(across.glance.census, undefined, 'the switcher was handed the archive\'s census');
    assert.equal(open.rooms.find((room) => room.here).glance, null);
    assert.equal((await fetch(`http://127.0.0.1:${plainPort}/api/salas/open`, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, 'another site read the open rooms');
    assert.equal((await fetch(`http://127.0.0.1:${plainPort}/api/salas/open`, { headers: { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone' } })).status, 403, 'a phone read the open rooms');
    // Opening the room left in the notebook only what a room leaves in any project, MU/TH/UR's
    // seal (S-023) and the line that keeps it out of git; the record and the memory live beside the
    // record, as for any room.
    assert.deepEqual(await readdir(notebook), ['.pulse']);
    assert.deepEqual((await readdir(join(notebook, '.pulse'))).sort(), ['.gitignore', 'mother.env']);
  } finally {
    await close(salas.server);
    await close(plain.server);
  }
});

// The CLI itself, as a person runs it: `madre salas` and a bare `madre` from the home folder open
// the notebook, a second `madre salas` finds the open room instead of opening another, and the
// room closes as any room does. Started without a shell, the way `madre start` is.
test('sala de salas · `madre salas` opens and closes as `madre start` would, a second one finds it, and `madre` from home opens the same room', async () => {
  const state = await scratch('madre-salas-cli-state-');
  const home = await scratch('madre-salas-cli-home-');
  const env = { ...process.env, PULSE_HOME: state, HOME: home, PULSE_UPDATE_CHECK: '0' };
  for (const key of Object.keys(env)) if (key.startsWith('CLAUDE')) delete env[key];
  const bin = join(process.cwd(), 'bin', 'madre.mjs');
  const children = [];
  const run = (args, cwd, { until = /MADRE is ready|already open for this project/ } = {}) => new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    let out = '';
    const seen = () => until.test(out);
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    // Generous on purpose: the room has to open on a busy laptop, not only on an idle one.
    const timer = setTimeout(() => child.kill('SIGTERM'), 45000);
    const done = new Promise((finish) => child.on('close', (code) => { clearTimeout(timer); finish({ code, out: () => out }); }));
    const ready = new Promise((up) => { const poll = setInterval(() => { if (seen()) { clearInterval(poll); up(); } }, 100); done.then(() => { clearInterval(poll); up(); }); });
    ready.then(() => resolve({ child, done, out: () => out }));
  });
  const notebook = resolve(salasProjectRoot(state));
  try {
    // `madre salas`, from a folder that is nobody's business, on a port of its own.
    const port = await freePort();
    const first = await run(['salas', '--no-open', '--port', String(port)], tmpdir());
    assert.match(first.out(), /MADRE is ready/, first.out());
    assert.match(first.out(), new RegExp(`Project: ${notebook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const opened = await fetch(`http://127.0.0.1:${port}/api/state`).then((answer) => answer.json());
    assert.equal(opened.salas, true);
    assert.equal(opened.room, salasRoomId(state));
    assert.deepEqual(await readdir(notebook), ['.pulse'], 'opening the room wrote more inside the notebook than a room writes in any project (S-023)');
    assert.ok((await knownRooms(state)).some((room) => room.id === salasRoomId(state) && room.open?.port === port), 'Salas does not list the open room');
    // A second `madre salas` finds that room and shows it instead of opening another.
    const again = await run(['salas', '--no-open', '--port', String(port)], home);
    const second = await again.done;
    assert.equal(second.code, 0, second.out());
    assert.match(second.out(), /MADRE is already open for this project/);
    assert.match(second.out(), new RegExp(`http://127\\.0\\.0\\.1:${port}`));
    // Closed as any room: the mark is gone and Salas lists it asleep, with its folder still there.
    first.child.kill('SIGTERM');
    const closed = await first.done;
    assert.equal(closed.code, 0);
    await assert.rejects(access(join(state, 'rooms', salasRoomId(state), 'open.json')), 'the room left its mark behind');
    const asleep = (await knownRooms(state)).find((room) => room.id === salasRoomId(state));
    assert.equal(asleep?.open, null);
    assert.equal(asleep?.root, await realpath(notebook));
    // A bare `madre` from the home folder itself opens the same room.
    const third = await run(['--no-open', '--port', String(port)], home);
    assert.match(third.out(), /MADRE is ready/, third.out());
    const fromHome = await fetch(`http://127.0.0.1:${port}/api/state`).then((answer) => answer.json());
    assert.equal(fromHome.salas, true);
    assert.equal(fromHome.room, salasRoomId(state));
    third.child.kill('SIGTERM');
    assert.equal((await third.done).code, 0);
    // From a folder inside home, a bare `madre` is the lobby too (2026-10-10); `madre start`,
    // written, is that folder's room, as it always was.
    const project = join(home, 'a-project');
    await mkdir(project);
    const bare = await run(['--no-open', '--port', String(port)], project);
    assert.match(bare.out(), /MADRE is ready/, bare.out());
    assert.match(bare.out(), /\/salas/, 'a bare madre does not say it opens the lobby');
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/state`).then((answer) => answer.json())).salas, true);
    bare.child.kill('SIGTERM');
    assert.equal((await bare.done).code, 0);
    const fourth = await run(['start', '--no-open', '--port', String(port)], project);
    assert.match(fourth.out(), /MADRE is ready/, fourth.out());
    const inside = await fetch(`http://127.0.0.1:${port}/api/state`).then((answer) => answer.json());
    assert.equal(inside.salas, false);
    assert.equal(await realpath(inside.projectRoot), await realpath(project));
    fourth.child.kill('SIGTERM');
    assert.equal((await fourth.done).code, 0);
  } finally {
    // No room outlives the test, whichever line it stopped at.
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await Promise.all(children.map((child) => (child.exitCode === null && child.signalCode === null ? new Promise((finish) => child.once('close', finish)) : null)));
    await rm(state, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
