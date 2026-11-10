import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canReplace, compareVersions, detectInstall, updateCommand, releaseUrl, checkForUpdate, applyCommand, fetchCommand, nextProcess, opensBrowser, roomsBehind, takesItsPlace } from '../src/updates.mjs';

test('updates: versions compare as releases, the launch mode picks the command, the registry is read once a day', async () => {
  assert.equal(compareVersions('0.3.0', '0.3.1'), -1);
  assert.equal(compareVersions('0.3.10', '0.3.9'), 1);
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0);
  // Pre-releases go before their release, in semver's order (LOG-16): an alpha is told the release.
  assert.equal(compareVersions('0.3.1-beta.1', '0.3.1'), -1);
  assert.equal(compareVersions('1.1.0-alpha.2', '1.1.0-alpha.10'), -1);
  assert.equal(compareVersions('1.1.0-alpha.9', '1.1.0-beta.1'), -1);
  assert.equal(compareVersions('1.1.0-rc.1', '1.1.0-rc.1'), 0);
  assert.equal(compareVersions('1.0.0+build.7', '1.0.0'), 0, 'build metadata does not count');
  assert.equal(detectInstall({ script: '/Users/x/.npm/_npx/abc/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'npx');
  assert.equal(detectInstall({ script: '/Users/x/amethyst/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'project');
  assert.equal(detectInstall({ script: '/opt/homebrew/lib/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'global');
  assert.equal(detectInstall({ script: '/Users/x/pulse/bin/madre.mjs', projectRoot: '/Users/x/pulse' }), 'source');
  assert.equal(updateCommand('npx', '@jossuealcala/madre', '0.3.2'), 'npx @jossuealcala/madre@0.3.2 start');
  assert.equal(updateCommand('project', '@jossuealcala/madre', '0.3.2'), 'npm install @jossuealcala/madre@0.3.2');
  assert.equal(applyCommand({ install: 'npx', name: '@jossuealcala/madre', version: '0.3.2', port: 4317, projectRoot: '/Users/x/Pangea OS' }), "exec npx -y '@jossuealcala/madre@0.3.2' start --no-open --port 4317 --project '/Users/x/Pangea OS'");
  assert.match(applyCommand({ install: 'project', name: '@jossuealcala/madre', version: '0.3.2', port: 4319, projectRoot: '/p' }), /^npm install '@jossuealcala\/madre@0\.3\.2' --no-fund --no-audit && exec npx --no 'madre' start --no-open --port 4319 --project '\/p'$/);
  assert.match(applyCommand({ install: 'global', name: '@jossuealcala/madre', version: '0.3.2', port: 4317, projectRoot: '/p' }), /^npm install -g .* && exec 'madre' start/);
  // A version is semver or nothing (SRV-07): one from a cache someone wrote never reaches a shell.
  for (const version of ['9.9.9;touch${IFS}/tmp/x;#', '1.0.0 && rm -rf ~', '$(id)', '1.0', 'latest']) {
    assert.equal(applyCommand({ install: 'npx', name: '@jossuealcala/madre', version, port: 4317, projectRoot: '/p' }), null, version);
    assert.equal(fetchCommand({ name: '@jossuealcala/madre', version }), null, version);
  }
  assert.ok(applyCommand({ install: 'npx', name: '@jossuealcala/madre', version: '1.1.0-alpha.1', port: 4317, projectRoot: '/p' }), 'a pre-release is a version');
  assert.equal(applyCommand({ install: 'source', name: 'x', version: '1', port: 1, projectRoot: '/p' }), null, 'from source the human pulls');
  // The version is fetched while the room is still open; a room that closed first and found
  // nothing to start was simply gone. Only a name and a version a registry would give reach npm.
  assert.deepEqual(fetchCommand({ name: '@jossuealcala/madre', version: '0.7.2' }), { command: 'npm', args: ['cache', 'add', '@jossuealcala/madre@0.7.2', '--no-fund', '--no-audit'] });
  assert.equal(fetchCommand({ name: '@jossuealcala/madre', version: '0.7.2; rm -rf ~' }), null);
  assert.equal(fetchCommand({ name: 'x && y', version: '1.0.0' }), null);
  // What a version brought is read in the product's own house, in the room's language. A release
  // page on a code host is written for people who already work there; whoever pressed this button
  // only wanted to know what changed.
  const repository = { type: 'git', url: 'git+https://github.com/jossuealcacao-exe/madre.git' };
  assert.equal(releaseUrl(repository, '0.3.2', 'es'), 'https://madre.run/cambios/#v0.3.2');
  assert.equal(releaseUrl(repository, '0.3.2', 'en'), 'https://madre.run/en/changelog/#v0.3.2');
  assert.equal(releaseUrl(repository, '0.3.2'), 'https://madre.run/cambios/#v0.3.2', 'without a language the room speaks Spanish');
  // The anchor carries the version, so the page can land the reader on the section that changed.
  assert.match(releaseUrl(repository, '0.4.2', 'en'), /#v0\.4\.2$/);

  const root = await mkdtemp(join(tmpdir(), 'pulse-updates-'));
  try {
    const cacheFile = join(root, 'updates.json');
    const calls = [];
    const fetchImpl = async (url) => { calls.push(url); return { ok: true, json: async () => ({ version: '0.3.2' }) }; };
    const first = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 });
    assert.deepEqual({ available: first.available, latest: first.latest, source: first.source, enabled: first.enabled }, { available: true, latest: '0.3.2', source: 'registry', enabled: true });
    assert.equal(calls[0], 'https://registry.npmjs.org/@jossuealcala%2Fmadre/latest');
    assert.deepEqual(JSON.parse(await readFile(cacheFile, 'utf8')), { name: '@jossuealcala/madre', latest: '0.3.2', checkedAt: 1000 });
    const second = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 + 60 * 60 * 1000 });
    assert.deepEqual([second.source, calls.length], ['cache', 1], 'within a day the cache answers');
    const third = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 + 25 * 60 * 60 * 1000 });
    assert.deepEqual([third.source, calls.length], ['registry', 2], 'after a day it asks again');
    const off = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.2', cacheFile, fetchImpl, now: 1000 + 50 * 60 * 60 * 1000, enabled: false });
    assert.deepEqual([off.source, off.available, calls.length], ['cache', false, 2], 'disabled: cache only, never the network, and equal versions are not an update');
    const down = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile: join(root, 'none.json'), fetchImpl: async () => { throw new Error('offline'); }, now: 5 });
    assert.deepEqual([down.source, down.latest, down.available, down.error], ['error', null, false, 'offline']);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('closing a version opens the next one, and refuses to close one that says nothing', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join: joinPath } = await import('node:path');
  const script = await readFile(joinPath(import.meta.dirname, '..', 'scripts', 'release.mjs'), 'utf8');

  // Twice a version went out and the fixes that followed minutes later landed inside a section
  // that was already published — history rewritten by hand, because a number in npm has to mean
  // one code and only one. The next section now opens in the same commit that closes this one,
  // so whatever comes next has somewhere to be written and nobody has to remember.
  assert.match(script, /const next = `\$\{major\}\.\$\{minor\}\.\$\{patch \+ 1\}`;/);
  assert.match(script, /## \$\{next\} · Sin publicar\\n\\n## \$\{version\} · \$\{today\}/, 'closing a version no longer opens the next');

  // And a version whose section is empty cannot be closed: a release note is how somebody decides
  // whether to take it, and an empty one is worse than no release.
  assert.match(script, /if \(!openBody\.trim\(\)\) fail\(/);

  // The section still has to exist before anything runs, and the number is still used once.
  assert.match(script, /CHANGELOG\.md has no "## \$\{version\} · Sin publicar" section/);
  assert.match(script, /already exists\. A number is used once/);
});

test('updates: the room fetches the new version before it closes, and stays open when npm cannot hand it out yet', async () => {
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  const apply = server.slice(server.indexOf("url.pathname === '/api/updates/apply'"));
  const fetched = apply.indexOf('fetchCommand(');
  const closing = apply.indexOf("room.record('room.updating'");
  assert.ok(fetched > 0 && closing > fetched, 'the room announces it is closing before it knows the new version can be fetched');
  assert.match(apply.slice(fetched, closing), /return sendJson\(response, 502/, 'a failed fetch does not keep the room open');
  // And the restart leaves a witness: what the new copy printed on the way up.
  assert.match(apply, /update\.log/);
});

test('updates: a cache with something that is not a version is not believed (SRV-07)', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'madre-update-cache-'));
  try {
    const cacheFile = join(dir, 'updates.json');
    await writeFile(cacheFile, JSON.stringify({ name: '@jossuealcala/madre', latest: '9.9.9;touch${IFS}/tmp/x;#', checkedAt: Date.now() }));
    const seen = await checkForUpdate({ name: '@jossuealcala/madre', current: '1.0.0', cacheFile, enabled: false });
    assert.equal(seen.latest, null);
    assert.equal(seen.available, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Q-22 (2026-11-10): `madre` from npm -g is a link (/usr/local/bin/madre, ~/.local/bin/madre in the
// Windows installer's WSL, nvm's bin) and Node starts it by that path. Read without following it, a
// global copy was taken for one run from source, and its update answered «pull the repository».
test('updates: a global copy started through the link npm -g leaves is global, not source (Q-22)', async () => {
  const { mkdir, symlink, writeFile } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'madre-global-'));
  try {
    const bin = join(dir, 'lib', 'node_modules', '@jossuealcala', 'madre', 'bin');
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, 'madre.cjs'), '');
    await mkdir(join(dir, 'bin'));
    await symlink(join(bin, 'madre.cjs'), join(dir, 'bin', 'madre'));
    assert.equal(detectInstall({ script: join(dir, 'bin', 'madre'), projectRoot: '/somewhere/else' }), 'global');
    // npx's link in its own cache still reads as npx, and a link that leads nowhere is read as written.
    const npx = join(dir, '_npx', 'abc', 'node_modules');
    await mkdir(join(npx, '.bin'), { recursive: true });
    await mkdir(join(npx, '@jossuealcala', 'madre', 'bin'), { recursive: true });
    await writeFile(join(npx, '@jossuealcala', 'madre', 'bin', 'madre.cjs'), '');
    await symlink(join(npx, '@jossuealcala', 'madre', 'bin', 'madre.cjs'), join(npx, '.bin', 'madre'));
    assert.equal(detectInstall({ script: join(npx, '.bin', 'madre'), projectRoot: '/somewhere/else' }), 'npx');
    assert.equal(detectInstall({ script: join(dir, 'missing', 'madre'), projectRoot: '/somewhere/else' }), 'source');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Q-23 (2026-11-10): on Linux a restart or an update takes this process's place, same PID, so wsl.exe,
// the terminal or systemd keep waiting on MADRE instead of seeing it end.
test('updates: on Linux the next MADRE takes this process\'s place, and says where it said before (Q-23)', async () => {
  const execve = () => {};
  assert.equal(takesItsPlace({ platform: 'linux', execve }), true);
  assert.equal(takesItsPlace({ platform: 'darwin', execve }), false, 'macOS as before');
  assert.equal(takesItsPlace({ platform: 'win32', execve }), false);
  assert.equal(takesItsPlace({ platform: 'linux', execve: undefined }), false, 'a Node before 22.15 as before');
  // A terminal keeps showing what MADRE says; anything else writes it to the log, as before.
  assert.deepEqual(nextProcess({ file: '/usr/bin/node', args: ['bin/madre.mjs', 'start'], log: '/r/restart.log', terminal: true }), ['/usr/bin/node', ['/usr/bin/node', 'bin/madre.mjs', 'start']]);
  const [program, argv] = nextProcess({ file: '/bin/sh', args: ['-c', "exec npx -y 'x@1.0.0' start"], log: "/r/it's here/update.log" });
  assert.equal(program, '/bin/sh');
  assert.deepEqual(argv.slice(3), ['madre', "/r/it's here/update.log", '/bin/sh', '-c', "exec npx -y 'x@1.0.0' start"], 'the log and the command travel as arguments, never inside the script');
  // And it really does: same PID, output in the log, arguments untouched.
  if (process.platform === 'win32') return;
  const { execFile } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'madre-next-'));
  try {
    const log = join(dir, 'up date.log');
    const [file, args] = nextProcess({ file: '/bin/sh', args: ['-c', 'echo "$$ $0"', "a b'c"], log });
    const script = `const pid = process.pid; console.log(pid); process.execve(${JSON.stringify(file)}, ${JSON.stringify(args)}, process.env);`;
    const said = await new Promise((resolve, reject) => execFile(process.execPath, ['-e', script], (error, stdout) => (error ? reject(error) : resolve(stdout.trim()))));
    if (said === '' || /execve is not a function/.test(said)) return;
    const [pid, line] = [said, (await readFile(log, 'utf8')).trim()];
    assert.equal(line, `${pid} a b'c`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('updates: a start from an update to the first MADRE with a ficha opens the browser (Q-21)', () => {
  assert.equal(opensBrowser({ asked: true, env: {}, hadFicha: true }), true);
  assert.equal(opensBrowser({ asked: false, env: {}, hadFicha: false }), false, 'a restart or a project opened by Home stays without the browser');
  assert.equal(opensBrowser({ asked: false, env: { PULSE_UPDATE_RESTART: '1' }, hadFicha: false }), true, 'from 1.1.2: the tab has no cookie, the browser gets one');
  assert.equal(opensBrowser({ asked: false, env: { PULSE_UPDATE_RESTART: '1' }, hadFicha: true }), false, 'from 1.1.3 on: the tab already has it');
});

// Q-22 (2026-11-10): a copy installed with sudo lives in a folder of root's; `npm install -g` without
// sudo fails there after MADRE has closed. It is asked before, and the room stays open.
test('updates: a global copy in a folder it cannot write is not updated from the pill (Q-22)', async () => {
  const { chmod, mkdir } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'madre-replace-'));
  try {
    const root = join(dir, 'node_modules', '@jossuealcala', 'madre');
    await mkdir(root, { recursive: true });
    assert.equal(await canReplace(root), true);
    await chmod(join(dir, 'node_modules', '@jossuealcala'), 0o555);
    if (process.getuid?.() !== 0) assert.equal(await canReplace(root), false, 'the folder npm would write is not this person\'s');
  } finally {
    await chmod(join(dir, 'node_modules', '@jossuealcala'), 0o755).catch(() => null);
    await rm(dir, { recursive: true, force: true });
  }
});

// L-13 (Carlos's server, 2026-11-10): Carlos updated a project; Home and the other projects stayed on
// 1.1.2, and the 1.1.3 ficha left him outside. The start that comes from an update brings the rest.
test('updates: the rooms an update still has to bring along are the other open ones on an older MADRE (L-13)', () => {
  const open = (version) => ({ port: 4318, pid: 1, version });
  const rooms = [
    { id: 'here', open: open('1.1.2') },
    { id: 'home', open: open('1.1.2') },
    { id: 'same', open: open('1.1.4') },
    { id: 'newer', open: open('1.2.0') },
    { id: 'unsaid', open: open(null) },
    { id: 'asleep', open: null },
  ];
  assert.deepEqual(roomsBehind(rooms, { here: 'here', version: '1.1.4' }).map((one) => one.id), ['home', 'unsaid']);
});

test('updates: back from an update, the room brings the others along, and the pill waits for what runs anywhere (L-13)', async () => {
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  // Only the start an update makes does it, and without making the start wait.
  assert.match(server, /if \(process\.env\.PULSE_UPDATE_RESTART === '1'\) void bringOthersAlong\(\)/);
  const along = server.slice(server.indexOf('async function bringAlong('), server.indexOf('async function busyElsewhere('));
  // Asked, never signalled; nothing running is cut off; it comes back on the port it had.
  assert.match(along, /if \(running\.unreachable \|\| running\.now\?\.length\) return false;/);
  assert.ok(along.indexOf("'/api/activity'") < along.indexOf("'/api/room/close'"), 'what runs is asked before the room is closed');
  assert.match(along, /startRoom\(\{ projectRoot: one\.root, roomDir: join\(root, 'rooms', one\.id\), port: one\.open\.port, home \}\)/);
  assert.doesNotMatch(along, /process\.kill/);
  // Home as a service: its launcher says the new version before systemd starts it again.
  assert.ok(along.indexOf('refreshLauncher(') < along.indexOf("'/api/room/close'") && along.indexOf("'/api/room/close'") < along.indexOf("['--user', 'start', UNIT_NAME]"));
  // The pill: nothing running in another project either, since the update restarts all of them.
  const apply = server.slice(server.indexOf("url.pathname === '/api/updates/apply'"));
  assert.ok(apply.indexOf('busyElsewhere()') > 0 && apply.indexOf('busyElsewhere()') < apply.indexOf("room.record('room.updating'"));
});

test('updates: a new ficha only where a browser can be opened to take it (L-13)', async () => {
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  assert.match(server, /const canOpen = Boolean\(openBrowser\) && browserWays\(await environmentOnce\(\)\.catch\(\(\) => null\)\)\.length > 0;/);
  assert.match(server, /renewFicha: canOpen \}/);
});
