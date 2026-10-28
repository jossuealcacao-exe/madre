import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { knownRooms, markProject, startRoom, universeOf } from '../src/salas.mjs';
import { loadConfig, updateConfig } from '../src/config.mjs';
import { createPulseServer } from '../src/server.mjs';

// SALAS on the Mac (docs/MACROVERSO.md, phase 1): the rooms this Mac knows, and what one room may
// ask of another.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });

test('salas · a room keeps where its project is, and the list holds the open ones and the asleep ones that can still open', async () => {
  const state = await scratch('madre-salas-state-');
  const project = await scratch('madre-salas-project-');
  // Open: a live process and its port.
  await markProject(join(state, 'rooms', 'open-room-0123456789abcdef'), project);
  await writeFile(join(state, 'rooms', 'open-room-0123456789abcdef', 'open.json'), JSON.stringify({ pid: process.pid, port: 4999, project: 'open-room', version: '1.0.0' }));
  // Asleep, with its project on disk: offered.
  await markProject(join(state, 'rooms', 'asleep-room-0123456789abcdef'), project);
  // Asleep, its project gone: not offered.
  await markProject(join(state, 'rooms', 'gone-room-0123456789abcdef'), join(project, 'not-here'));
  // Asleep, from before the path was kept: not offered (S-004).
  await mkdir(join(state, 'rooms', 'old-room-0123456789abcdef'), { recursive: true });
  // A mark left by a process that died: asleep, not open.
  await markProject(join(state, 'rooms', 'dead-room-0123456789abcdef'), project);
  await writeFile(join(state, 'rooms', 'dead-room-0123456789abcdef', 'open.json'), JSON.stringify({ pid: 2 ** 22 + 12345, port: 4998 }));

  const rooms = await knownRooms(state);
  assert.deepEqual(rooms.map((room) => room.id).sort(), ['asleep-room-0123456789abcdef', 'dead-room-0123456789abcdef', 'open-room-0123456789abcdef']);
  const open = rooms.find((room) => room.id.startsWith('open'));
  assert.equal(open.open.port, 4999);
  assert.equal(open.root, project);
  assert.equal(rooms.find((room) => room.id.startsWith('dead')).open, null);
  // Written whole: no draft is left beside it.
  assert.deepEqual((await readdir(join(state, 'rooms', 'asleep-room-0123456789abcdef'))).sort(), ['project.json']);
  assert.equal(JSON.parse(await readFile(join(state, 'rooms', 'asleep-room-0123456789abcdef', 'project.json'), 'utf8')).root, project);
});

test('salas · a room is woken the way madre start opens it: the same script, no shell, the folder as an argument', () => {
  const calls = [];
  const fake = (file, args, options) => { calls.push({ file, args, options }); return { pid: 1, unref() {} }; };
  startRoom({ projectRoot: '/tmp/a project; rm -rf ~', roomDir: '/nonexistent', env: { HOME: '/h', PULSE_OUTBOUND_LOG: '/other/outbound.jsonl', PULSE_UPDATE_RESTART: '1' }, spawnImpl: fake, bin: '/pkg/bin/madre.mjs' });
  assert.equal(calls.length, 1);
  const [{ file, args, options }] = calls;
  assert.equal(file, process.execPath);
  assert.deepEqual(args, ['/pkg/bin/madre.mjs', 'start', '--project', '/tmp/a project; rm -rf ~', '--no-open']);
  assert.equal(options.shell, undefined, 'a shell would read the folder name as a command line (WIN-016)');
  assert.equal(options.windowsHide, true);
  assert.equal(options.detached, process.platform !== 'win32');
  assert.equal(options.cwd, '/tmp/a project; rm -rf ~');
  // What this room set for itself is not handed to the new one.
  assert.equal(options.env.PULSE_OUTBOUND_LOG, undefined);
  assert.equal(options.env.PULSE_UPDATE_RESTART, undefined);
  assert.equal(options.env.HOME, '/h');
  // And the script is found the way that works on every system (WIN-004).
  assert.match(String(startRoom), /bin = MADRE_BIN/);
});

test('salas · two rooms saving settings at once keep both changes (S-001)', async () => {
  const state = await scratch('madre-salas-config-');
  await Promise.all(Array.from({ length: 12 }, (_, i) => updateConfig(state, { modules: { [`m${i}`]: { enabled: true } } })));
  const config = await loadConfig(state);
  assert.equal(Object.keys(config.modules).length, 12, 'a room wrote over another room\'s change');
  assert.deepEqual((await readdir(state)).sort(), ['config.json'], 'a lock or a draft was left behind');
});

test('salas · the room lists every room, counts its archive without reading it out, and closes when asked — never from a phone', async () => {
  const state = await scratch('madre-salas-room-');
  const project = await scratch('madre-salas-proj-');
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const { server, markOpen } = await createPulseServer({ projectRoot: project, stateRoot: state, agents, invokers: { 'codex-readonly': async () => ({ text: 'done' }) } });
  const port = await listen(server);
  await markOpen(port);
  const base = `http://127.0.0.1:${port}`;
  const phone = { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone', 'content-type': 'application/json' };
  try {
    const list = await fetch(`${base}/api/salas`).then((answer) => answer.json());
    const mine = list.rooms.find((room) => room.here);
    assert.ok(mine, 'the room does not find itself');
    assert.equal(mine.open.port, port);
    assert.deepEqual(mine.glance.census, { memories: 0, kinds: {}, travelling: 0 });
    assert.equal((await fetch(`${base}/api/glance`).then((answer) => answer.json())).census, undefined, 'the phone pays for a count it never shows');
    const page = await fetch(`${base}/salas`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /salas-mac\.js/);
    // The macroverse reads a room's archive through this one, the way its own NOSTROMO does.
    const universe = await fetch(`${base}/api/salas/universe?id=${encodeURIComponent(mine.id)}`).then((answer) => answer.json());
    assert.deepEqual(Object.keys(universe).sort(), ['id', 'links', 'maturity', 'memories', 'stats']);
    assert.deepEqual(universe.memories, []);
    assert.equal((await fetch(`${base}/api/salas/universe?id=nope`)).status, 404);

    for (const [method, path] of [['GET', '/salas'], ['GET', '/api/salas'], ['GET', '/api/salas/universe'], ['POST', '/api/salas/start'], ['POST', '/api/salas/close'], ['POST', '/api/salas/stop-all'], ['POST', '/api/room/close']]) {
      const answer = await fetch(`${base}${path}`, { method, headers: phone, body: method === 'POST' ? '{}' : undefined });
      assert.equal(answer.status, 403, `${method} ${path} reached from a phone`);
    }
    // A page from another room cannot close this one: only its own page, or another process.
    assert.equal((await fetch(`${base}/api/room/close`, { method: 'POST', headers: { origin: 'http://127.0.0.1:1', 'content-type': 'application/json' }, body: '{}' })).status, 403);

    const asked = new Promise((resolve) => server.once('madre:close', resolve));
    const closing = await fetch(`${base}/api/room/close`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(closing.status, 202);
    await asked;
  } finally {
    await close(server);
  }
});

// THE MACROVERSE (docs/MACROVERSO.md, phases 2 and 3a): every room a NOSTROMO, imposing, and light
// on the machine.
test('salas · the macroverse draws every room with NOSTROMO\'s own engine, one live at a time, the rest alive without their physics, and rests when nobody looks', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'macroverso.js'), 'utf8');
  const page = await readFile(join(import.meta.dirname, '..', 'public', 'salas-mac.js'), 'utf8');
  // No shader, no WebGL: canvas 2D, never denser than two pixels per point.
  assert.doesNotMatch(source, /webgl|getContext\('webgl/i);
  assert.match(source, /view\.dpr = Math\.min\(2, window\.devicePixelRatio \|\| 1\);/);
  // The same painters as the room's NOSTROMO, imported and never copied: no palette of its own.
  assert.match(source, /from '\.\/nostromo-engine\.js'/);
  assert.doesNotMatch(source, /KIND_COLOURS|#ffdc3c/);
  assert.match(source, /engine\.drawNostromo\(/);
  // A universe is read and painted again only when what it shows has changed; a sprite is never
  // wider than a thousand pixels; the sky and the stars are the macroverse's, not the engine's.
  assert.match(source, /before && before\.face === face && before\.dpr === view\.dpr \? before : null/);
  assert.match(source, /const SPRITE_MAX = 1024;/);
  assert.match(source, /Math\.min\(SPRITE_MAX, /);
  assert.match(source, /bare: true/);
  // One universe is the real thing at a time; the rest live without paying for their physics
  // (frozen: they turn, beat and pulse), drawn at the size they show, sharing a few ms a frame.
  assert.match(source, /let live = null;/);
  assert.equal((source.match(/live = \{/g) ?? []).length, 1, 'more than one place makes a live scene');
  assert.match(source, /scene\.frozen = true;/);
  assert.match(source, /if \(performance\.now\(\) - started > FAR_BUDGET\) break;/);
  assert.match(source, /resizeUniverse\(sprite, one\.shown, view\.dpr\)/);
  const engineSource = await readFile(join(import.meta.dirname, '..', 'public', 'nostromo-engine.js'), 'utf8');
  assert.match(engineSource, /if \(nostromo\.frozen\) \{/);
  // A chosen universe: the whole space falls to black, never a square round it (the live scene
  // darkens only what it draws).
  assert.match(source, /ctx\.fillRect\(0, 0, view\.w, view\.h\)/);
  assert.match(engineSource, /if \(nostromo\.bare\) ctx\.globalCompositeOperation = 'source-atop';/);
  // The camera is declared before it is used (S-015), and a resize settles before anything is
  // painted again (S-016).
  assert.ok(source.indexOf('const FOCUS_ZOOM = ') < source.indexOf('export function openMacroverso'), 'FOCUS_ZOOM is used before it is declared');
  assert.match(source, /resizeTimer = setTimeout\(\(\) => \{ size\(\); layout\(rooms\); redraw\(\); \}, 150\);/);
  // Frames stop in a hidden tab, and someone who asked for less motion gets still frames.
  assert.match(source, /document\.addEventListener\('visibilitychange', onVisible\);/);
  assert.match(source, /raf = reduced && !camera\.to \? 0 : requestAnimationFrame\(frame\);/);
  // A vein joins two universes only where a contract does (phase 3c): every curve the macroverse
  // draws between bodies lives in drawVeins, which walks the contracts it was given, and nothing
  // else in the file draws a line.
  const veinsAt = source.indexOf('function drawVeins(');
  assert.notEqual(veinsAt, -1, 'the veins have no painter of their own');
  const drawVeins = source.slice(veinsAt, source.indexOf('\n  }\n', veinsAt) + 4);
  assert.match(drawVeins, /for \(const vein of veins\)/);
  assert.doesNotMatch(source.replace(drawVeins, ''), /lineTo\(|quadraticCurveTo\(|bezierCurveTo\(/, 'a line is drawn outside drawVeins');
  assert.match(source, /veins = \(enlaces \?\? \[\]\)/, 'the veins do not come from the contracts');
  // Entered from SALAS, and only on a large screen; its accent is the night's in either theme (S-014).
  assert.match(page, /ui\.macro\.hidden = !data\.rooms\.length \|\| window\.innerWidth < 900;/);
  assert.match(page, /function darkAccent\(/);
  assert.match(page, /accent: darkAccent\(\),/);
  // A link is signed and revoked from SALAS, by the page's own routes; the sheet asks for the
  // designation when orders may enter a room.
  assert.match(page, /fetch\('\/api\/salas\/enlaces', \{ method: 'POST'/);
  assert.match(page, /fetch\('\/api\/salas\/enlaces\/revoke', \{ method: 'POST'/);
  assert.match(page, /Type the name of \{room\} to allow orders into it/);
  // On a phone it is one line of the archive per room, read through the bridge.
  const bridge = await readFile(join(import.meta.dirname, '..', 'src', 'bridge', 'server.mjs'), 'utf8');
  assert.match(bridge, /\/api\/glance\?census=1/);
});

test('salas · a universe carries what a NOSTROMO is drawn from and, unless the words are asked for, not one word', () => {
  const research = {
    memories: [
      { id: 7, kind: 'decision', zone: 'bridge', text: 'the secret plan', sources: [1, 2, 3], fromSequence: 4, throughSequence: 9, recalled: 2, lastRecalled: '2026-10-08T00:00:00.000Z', agent: 'claude', origin: 'distilled', created: '2026-10-07T00:00:00.000Z', messageId: 'm1', confidence: 0.9 },
      { id: 8, kind: 'fact', text: 'plain', sources: [] },
    ],
    links: [{ a: 7, b: 8, weight: 0.8 }, { a: 7, b: 99, weight: 0.5 }],
    maturity: { score: 0.4, stage: null },
    stats: { entries: 12, embeddings: 2, memories: 2 },
  };
  const far = universeOf(research);
  assert.deepEqual(far.memories[0], { id: 7, kind: 'decision', zone: 'bridge', fromSequence: 4, throughSequence: 9, sourcesCount: 3, recalled: 2, lastRecalled: '2026-10-08T00:00:00.000Z', cold: null });
  assert.equal(far.memories[1].zone, 'hold');
  assert.ok(!JSON.stringify(far).includes('secret'), 'a memory\'s words left the room without being asked for');
  assert.deepEqual(far.links, [{ a: 7, b: 8, weight: 0.8 }], 'a vein runs to a memory that was not sent');
  assert.deepEqual(far.stats, { entries: 12, embeddings: 2 });
  const near = universeOf(research, { full: true });
  assert.equal(near.memories[0].text, 'the secret plan');
  assert.equal(near.memories[0].agent, 'claude');
  assert.equal(near.memories[0].messageId, undefined, 'more than the words crossed');
});

// WIN-028 (2026-10-28): on Windows every folder was «outside the home», because the check compared
// text with '/'. Asked of each system's own path rules, with the Windows rules checked here too.
test('salas · a folder inside the home is inside it on Windows as on a Mac, whatever the case of its letters', async () => {
  const { insideFolder, sameFolder } = await import('../src/salas.mjs');
  const { posix, win32 } = await import('node:path');
  const home = 'C:\\Users\\Usuario Principal';
  assert.equal(insideFolder('C:\\Users\\Usuario Principal\\Documents\\mi-proyecto', home, win32), true);
  assert.equal(insideFolder('c:\\users\\usuario principal\\Documents', home, win32), true, 'the case of the letters does not matter on Windows');
  assert.equal(insideFolder(home, home, win32), true);
  assert.equal(sameFolder('C:\\Users\\Usuario Principal', 'c:\\users\\usuario principal', win32), true);
  assert.equal(insideFolder('C:\\MADRE', home, win32), false);
  assert.equal(insideFolder('D:\\proyectos\\uno', home, win32), false, 'another drive is outside');
  assert.equal(insideFolder('C:\\Users\\Usuario Principal2\\x', home, win32), false, 'a folder that only starts with the same name is outside');
  assert.equal(insideFolder('/home/ana/proyectos/uno', '/home/ana', posix), true);
  assert.equal(insideFolder('/home/ana', '/home/ana', posix), true);
  assert.equal(insideFolder('/home/anabel/x', '/home/ana', posix), false);
  assert.equal(insideFolder('/home/ana/../bob', '/home/ana', posix), false);
  assert.equal(insideFolder('/home/ana/..hidden', '/home/ana', posix), true, 'a folder whose name starts with two dots is still inside');
});
