import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { disableService, enableService, launcherFile, launcherScript, refreshLauncher, serviceState, unitFile, unitText } from '../src/service.mjs';
import { keepOpenProject, knownRooms, markProject, projectRoomId } from '../src/salas.mjs';

// L-3 (Carlos's server, 2026-11-04): MADRE was started by hand and did not come back when the
// server restarted or MADRE fell; his workaround was a script and a cron line.
test('service · Home starts with the same version, the PATH of now, and comes back if it falls (L-3)', () => {
  const env = { PATH: '/home/agente/.nvm/versions/node/v26.13.0/bin:/usr/bin', LANG: 'es_MX.UTF-8', SECRET: 'no' };
  const npx = launcherScript({ install: 'npx', name: '@jossuealcala/madre', version: '1.1.3', port: 4317, env });
  assert.match(npx, /^#!\/bin\/sh\n/);
  assert.match(npx, /export PATH='\/home\/agente\/\.nvm\/versions\/node\/v26\.13\.0\/bin:\/usr\/bin'/);
  assert.match(npx, /export MADRE_SERVICE=1\nexec npx -y '@jossuealcala\/madre@1\.1\.3' lobby --no-open --port 4317\n$/);
  assert.doesNotMatch(npx, /SECRET/, 'only what MADRE needs travels into the script');
  assert.match(launcherScript({ install: 'global', name: '@jossuealcala/madre', version: '1.1.3', env }), /exec 'madre' lobby --no-open --port 4317/);
  assert.match(launcherScript({ install: 'source', name: 'x', version: '1.1.3', execPath: '/usr/bin/node', script: '/src/madre/bin/madre.mjs', env }), /exec '\/usr\/bin\/node' '\/src\/madre\/bin\/madre\.mjs' lobby/);
  assert.equal(launcherScript({ install: 'project', name: 'x', version: '1.1.3', env }), null);
  const unit = unitText('/home/agente/.pulse/servicio/arrancar.sh');
  for (const line of ['ExecStart=/bin/sh "/home/agente/.pulse/servicio/arrancar.sh"', 'Restart=on-failure', 'RestartPreventExitStatus=2', 'KillMode=process', 'WantedBy=default.target']) assert.ok(unit.includes(line), line);
});

test('service · turned on and off with the user\'s own systemd, and linger said when it needs a password (L-3)', async () => {
  const home = await mkdtemp(join(tmpdir(), 'madre-service-'));
  const state = join(home, '.pulse');
  const calls = [];
  let enabled = false;
  let linger = false;
  const run = async (command, args) => {
    calls.push([command, ...args].join(' '));
    if (args.includes('show-environment')) return { ok: true, stdout: 'PATH=/usr/bin' };
    if (args.includes('is-enabled')) return { ok: enabled, stdout: enabled ? 'enabled' : 'disabled' };
    if (args.includes('is-active')) return { ok: false, stdout: 'inactive' };
    if (args[1] === 'enable') { enabled = true; return { ok: true, stdout: '' }; }
    if (args[1] === 'disable') { enabled = false; return { ok: true, stdout: '' }; }
    if (command === 'loginctl' && args[0] === 'show-user') return { ok: true, stdout: linger ? 'yes' : 'no' };
    if (command === 'loginctl' && args[0] === 'enable-linger') return { ok: false, stdout: '', stderr: 'Interactive authentication required.' };
    return { ok: true, stdout: '' };
  };
  try {
    assert.deepEqual(await serviceState({ platform: 'darwin', run }), { supported: false, why: 'linux' });
    assert.deepEqual(await serviceState({ platform: 'linux', run: async () => ({ ok: false, stdout: '' }) }), { supported: false, why: 'systemd' });
    const launcher = launcherScript({ install: 'npx', name: '@jossuealcala/madre', version: '1.1.3', env: { PATH: '/usr/bin' } });
    const on = await enableService({ stateRoot: state, launcher, platform: 'linux', home, user: 'agente', run });
    assert.equal(on.enabled, true);
    assert.equal(on.linger, false);
    assert.equal(on.lingerCommand, 'sudo loginctl enable-linger agente');
    assert.ok(calls.includes('systemctl --user daemon-reload') && calls.includes('systemctl --user enable madre.service') && calls.includes('loginctl enable-linger agente'));
    assert.ok(!calls.some((call) => /systemctl --user (re)?start/.test(call)), 'Home is already open: the service is not started now');
    assert.equal(await readFile(launcherFile(state), 'utf8'), launcher);
    assert.equal((await stat(launcherFile(state))).mode & 0o777, 0o700);
    assert.match(await readFile(unitFile(home), 'utf8'), /ExecStart=\/bin\/sh ".*servicio\/arrancar\.sh"/);
    // Home opening again rewrites the script only when something changed (a new version).
    assert.equal(await refreshLauncher({ stateRoot: state, launcher, home }), false);
    const newer = launcher.replace('1.1.3', '1.1.4');
    assert.equal(await refreshLauncher({ stateRoot: state, launcher: newer, home }), true);
    assert.match(await readFile(launcherFile(state), 'utf8'), /madre@1\.1\.4/);
    // A copy inside a project has no command of its own to start Home with.
    assert.equal((await enableService({ stateRoot: state, launcher: null, platform: 'linux', home, user: 'agente', run })).refused, 'install');
    const off = await disableService({ stateRoot: state, platform: 'linux', home, user: 'agente', run });
    assert.equal(off.enabled, false);
    await assert.rejects(stat(unitFile(home)));
    await assert.rejects(stat(launcherFile(state)));
    assert.equal(await refreshLauncher({ stateRoot: state, launcher: newer, home }), false, 'off, nothing is written');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('service · the projects that were open come back, and one the person closed does not (L-3)', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'madre-keep-')));
  try {
    const state = join(home, '.pulse');
    const folder = (name) => join(home, name);
    for (const name of ['skinhealth', 'crm']) await mkdir(folder(name));
    const room = (name) => join(state, 'rooms', projectRoomId(folder(name)));
    await markProject(room('skinhealth'), folder('skinhealth'), { port: 4318, keepOpen: true });
    await markProject(room('crm'), folder('crm'), { port: 4319, keepOpen: true });
    assert.equal(await keepOpenProject(state, projectRoomId(folder('crm')), false), true);
    const rooms = await knownRooms(state);
    assert.deepEqual(rooms.map((one) => [one.name, one.keepOpen]).sort(), [['crm', false], ['skinhealth', true]]);
    // Rewritten when it opens again, it keeps its port.
    await markProject(room('crm'), folder('crm'), { keepOpen: true });
    const crm = JSON.parse(await readFile(join(room('crm'), 'project.json'), 'utf8'));
    assert.deepEqual([crm.port, crm.keepOpen], [4319, true]);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(process\.env\.MADRE_SERVICE !== '1'\) return;[\s\S]{0,200}if \(one\.id === here \|\| one\.open \|\| !one\.keepOpen \|\| !one\.root\) continue;[\s\S]{0,80}startRoom\(/);
  assert.match(server, /if \(room\) await keepOpenProject\(root, room\.id, false\)/);
  assert.match(server, /if \(payload\?\.forget === true\) await keepOpenProject\(root, basename\(roomDir\), false\)/);
  assert.match(server, /markProject\(roomDir, canonicalProjectRoot, \{ port, keepOpen: true \}\)/);
  const power = await readFile(new URL('../public/power.js', import.meta.url), 'utf8');
  assert.match(power, /fetch\('\/api\/room\/close', \{[^\n]*body: JSON\.stringify\(\{ forget: true \}\) \}\)/);
});
