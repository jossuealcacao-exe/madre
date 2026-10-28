import test from 'node:test';
import assert from 'node:assert/strict';
import { browserAdvice, browserWays, detectEnvironment, openBrowser, tunnelCommand } from '../src/environment.mjs';

// Where MADRE runs (2026-10-28): read from what the system says of itself, each place told apart —
// a Mac, Linux inside Windows, a virtual machine, a container, a session reached over SSH.
const files = (map) => async (file) => { if (file in map) return map[file]; throw new Error('ENOENT'); };
const space = async () => ({ bavail: 50e9 / 4096, bsize: 4096, blocks: 200e9 / 4096 });
const none = async () => null;

test('environment · a Mac, WSL, a virtual machine, a container and SSH are each told apart', async () => {
  const mac = await detectEnvironment({ platform: 'darwin', env: {}, run: none, space });
  assert.deepEqual([mac.os, mac.place, mac.display, mac.vm], ['macos', 'local', true, null]);
  assert.equal(mac.disk.freeGb, 50);

  const wsl = await detectEnvironment({ platform: 'linux', env: { WSL_DISTRO_NAME: 'Ubuntu' }, read: files({ '/proc/version': 'Linux version 5.15.153.1-microsoft-standard-WSL2' }), run: none, has: async () => false, space });
  assert.equal(wsl.place, 'wsl');
  assert.deepEqual(wsl.wsl, { distro: 'Ubuntu', version: 2 });
  assert.equal(wsl.vm, null, 'WSL is not counted as a virtual machine');
  assert.equal(wsl.display, true, 'WSL opens Windows\' own browser');

  const vm = await detectEnvironment({ platform: 'linux', env: { DISPLAY: ':0' }, read: files({ '/proc/version': 'Linux version 6.8', '/sys/class/dmi/id/product_name': 'VirtualBox', '/proc/1/cgroup': '0::/init.scope' }), run: none, has: async () => false, space });
  assert.deepEqual([vm.place, vm.vm], ['vm', 'VirtualBox']);
  const kvm = await detectEnvironment({ platform: 'linux', env: {}, read: files({ '/proc/version': 'Linux' }), run: async (command) => (command === 'systemd-detect-virt' ? 'kvm\n' : null), has: async () => false, space });
  assert.deepEqual([kvm.place, kvm.vm, kvm.display], ['vm', 'QEMU/KVM', false]);

  const box = await detectEnvironment({ platform: 'linux', env: {}, read: files({ '/proc/version': 'Linux', '/proc/1/cgroup': '0::/docker/abc' }), run: none, has: async () => false, space });
  assert.equal(box.place, 'container');

  const ssh = await detectEnvironment({ platform: 'linux', env: { SSH_CONNECTION: '192.168.1.20 51000 192.168.1.50 22', DISPLAY: ':0' }, read: files({ '/proc/version': 'Linux' }), run: none, has: async () => false, space });
  assert.equal(ssh.place, 'ssh');
  assert.equal(ssh.ssh.from, '192.168.1.20');
  assert.equal(ssh.ssh.host, '192.168.1.50');
  assert.equal(ssh.display, false, 'over SSH the browser is on the other computer');
});

test('environment · the browser opens the way each place allows, and over SSH the terminal gives the tunnel', async () => {
  assert.deepEqual(browserWays({ place: 'local' }, { platform: 'darwin' }).map((way) => way.command), ['open']);
  assert.deepEqual(browserWays({ place: 'wsl', wsl: { distro: 'Ubuntu' }, display: true }, { platform: 'linux' }).map((way) => way.command), ['wslview', 'cmd.exe', 'explorer.exe']);
  assert.deepEqual(browserWays({ place: 'ssh', display: false }, { platform: 'linux' }), []);
  assert.deepEqual(browserWays({ place: 'vm', display: false }, { platform: 'linux' }), []);
  // In WSL, the first way missing moves on to Windows' own.
  const tried = [];
  const opened = await openBrowser('http://127.0.0.1:5317/salas', { place: 'wsl', wsl: {}, display: true }, { platform: 'linux', run: (command, args, options, done) => { tried.push(command); done(command === 'wslview' ? Object.assign(new Error('missing'), { code: 'ENOENT' }) : null); } });
  assert.equal(opened, true);
  assert.deepEqual(tried, ['wslview', 'cmd.exe']);
  assert.equal(await openBrowser('http://127.0.0.1:5317/salas', { place: 'ssh', display: false }, { platform: 'linux', run: () => assert.fail('nothing is run over SSH') }), false);

  const ssh = { place: 'ssh', ssh: { user: 'carlos', host: '192.168.1.50' } };
  assert.equal(tunnelCommand(ssh, [5317, 5318, 5317]), 'ssh -L 5317:127.0.0.1:5317 -L 5318:127.0.0.1:5318 carlos@192.168.1.50');
  const said = browserAdvice(ssh, 'http://127.0.0.1:5317/salas');
  assert.ok(said.some((line) => line.includes('ssh -L 5317:127.0.0.1:5317 carlos@192.168.1.50')));
  assert.ok(browserAdvice({ place: 'wsl', wsl: {} }, 'http://127.0.0.1:5317/salas').some((line) => line.includes('http://localhost:5317/salas')));
});
