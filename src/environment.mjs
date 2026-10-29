// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Where MADRE runs (2026-10-28, docs/private/BIENVENIDA-1.0.6.md). `process.platform` was all MADRE
// knew of its place, and three real places were not what it assumed: Linux inside Windows (WSL), a
// virtual machine, and a computer reached from another one over SSH. In each, the browser did not
// open and nothing said why; a virtual machine ran the local AI slowly without a word. What is read
// here is what the system says of itself — files, variables, its own tools —, never guessed, and
// each reading that fails leaves its answer empty rather than wrong. The welcome adapts its steps to
// it, and the terminal says what to do when the browser cannot be opened from here.

import { execFile } from 'node:child_process';
import { access, readFile, statfs } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';

const quiet = (command, args, { timeout = 2500, cwd } = {}) => new Promise((resolve) => {
  try { execFile(command, args, { timeout, cwd, windowsHide: true }, (error, stdout) => resolve(error ? null : String(stdout))); } catch { resolve(null); }
});
const exists = (file) => access(file).then(() => true, () => false);
const gb = (bytes) => Math.round((bytes / 1e9) * 10) / 10;

// The names a virtual machine gives itself, as the firmware or systemd write them.
const VM_NAMES = [
  [/virtualbox|innotek/i, 'VirtualBox'], [/vmware/i, 'VMware'], [/parallels/i, 'Parallels'], [/qemu|kvm|bochs/i, 'QEMU/KVM'],
  [/utm/i, 'UTM'], [/xen/i, 'Xen'], [/hyper-v|virtual machine/i, 'Hyper-V'], [/amazon ec2|google compute|droplet|openstack/i, 'Cloud'],
];
const VIRT_WORDS = { oracle: 'VirtualBox', vmware: 'VMware', parallels: 'Parallels', kvm: 'QEMU/KVM', qemu: 'QEMU/KVM', microsoft: 'Hyper-V', xen: 'Xen', bochs: 'QEMU/KVM', amazon: 'Cloud', apple: 'Apple' };

export async function detectEnvironment({ platform = process.platform, env = process.env, read = (file) => readFile(file, 'utf8'), run = quiet, has = exists, space = statfs, home = homedir() } = {}) {
  const os = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : platform === 'linux' ? 'linux' : platform;
  // Linux inside Windows: the kernel says so, and WSL names its distribution.
  let wsl = null;
  if (platform === 'linux') {
    const kernel = await read('/proc/version').catch(() => '');
    if (env.WSL_DISTRO_NAME || /microsoft/i.test(kernel)) wsl = { distro: env.WSL_DISTRO_NAME || null, version: /wsl2|microsoft-standard/i.test(kernel) ? 2 : 1 };
    // Where Windows answers from inside WSL 2 (NAT, the default): the way out of the virtual network,
    // read from the routing table. The nameserver WSL writes was the same address until DNS tunneling
    // (WSL 2.2) made it 10.255.255.254, which is not Windows; it is only the fallback now. The welcome
    // offers this as the address of an Ollama installed in Windows.
    if (wsl) {
      const route = String(await read('/proc/net/route').catch(() => ''));
      const hex = route.split('\n').map((line) => line.trim().split(/\s+/)).find((cols) => cols[1] === '00000000' && /^[0-9A-F]{8}$/i.test(cols[2] ?? '') && cols[2] !== '00000000')?.[2];
      const gateway = hex ? hex.match(/../g).reverse().map((byte) => parseInt(byte, 16)).join('.') : null;
      const nameserver = String(await read('/etc/resolv.conf').catch(() => '')).match(/^nameserver\s+(\d+\.\d+\.\d+\.\d+)\s*$/m)?.[1] ?? null;
      wsl.windowsHost = gateway ?? (nameserver && nameserver !== '10.255.255.254' ? nameserver : null);
    }
  }
  // The system's own name for itself, as a person would read it: «Ubuntu 24.04.1 LTS», «macOS 26.0».
  let name = null;
  if (platform === 'linux') name = String(await read('/etc/os-release').catch(() => '')).match(/^PRETTY_NAME="?([^"\n]+)"?$/m)?.[1] ?? null;
  else if (platform === 'darwin') { const version = (await run('sw_vers', ['-productVersion']))?.trim(); name = version ? `macOS ${version}` : 'macOS'; }
  // Reached from another computer: the variables sshd leaves in every session.
  const pair = String(env.SSH_CONNECTION ?? '').trim().split(/\s+/);
  let user = null;
  try { user = userInfo().username; } catch { /* no user to name */ }
  const ssh = env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY ? { from: pair[0] || String(env.SSH_CLIENT ?? '').split(/\s+/)[0] || null, host: pair[2] || null, user } : null;
  // A virtual machine, by what systemd or the firmware call it; WSL is not counted as one here.
  let vm = null;
  if (platform === 'linux' && !wsl) {
    const virt = (await run('systemd-detect-virt', ['--vm']))?.trim();
    if (virt && virt !== 'none') vm = VIRT_WORDS[virt] ?? virt;
    else {
      const firmware = `${await read('/sys/class/dmi/id/product_name').catch(() => '')} ${await read('/sys/class/dmi/id/sys_vendor').catch(() => '')}`;
      vm = VM_NAMES.find(([pattern]) => pattern.test(firmware))?.[1] ?? null;
    }
  } else if (platform === 'darwin') {
    if ((await run('sysctl', ['-n', 'kern.hv_vmm_present']))?.trim() === '1') vm = 'macOS';
  }
  const container = platform === 'linux' && !wsl && (await has('/.dockerenv') || /docker|containerd|kubepods|lxc/.test(await read('/proc/1/cgroup').catch(() => '')));
  // A screen to open a browser on: a Linux without one, or anything reached over SSH, has none here.
  // WSL has Windows' own.
  const display = platform === 'linux' ? Boolean(wsl || env.DISPLAY || env.WAYLAND_DISPLAY) : true;
  const disk = await space(home).then((info) => ({ freeGb: gb(Number(info.bavail) * Number(info.bsize)), totalGb: gb(Number(info.blocks) * Number(info.bsize)) })).catch(() => null);
  // One word for the place, the one that changes most what the person has to do.
  const place = ssh ? 'ssh' : wsl ? 'wsl' : container ? 'container' : vm ? 'vm' : 'local';
  return { os, platform, name, place, wsl, vm, container: Boolean(container), ssh, display: ssh ? false : display, disk };
}

let measured = null;
// Read once per process for what does not change under a running MADRE; the free space is read again.
export async function environmentOnce(options) {
  measured ??= detectEnvironment(options).catch(() => null);
  const once = await measured;
  if (!once) return null;
  const disk = await statfs(homedir()).then((info) => ({ freeGb: gb(Number(info.bavail) * Number(info.bsize)), totalGb: gb(Number(info.blocks) * Number(info.bsize)) })).catch(() => once.disk);
  return { ...once, disk };
}

// How this computer opens a page in its browser, or null when it cannot from here: over SSH the
// browser is on the other computer; a Linux with no screen has none. In WSL, Windows' own browser,
// by wslview when it is installed or by Windows' `cmd.exe` (run from a Windows folder, which it asks for).
export function browserWays(environment, { platform = process.platform } = {}) {
  if (environment?.place === 'ssh') return [];
  if (platform === 'darwin') return [{ command: 'open', args: (url) => [url] }];
  if (platform === 'win32') return [{ command: 'cmd', args: (url) => ['/c', 'start', '', url] }];
  if (environment?.wsl) return [
    { command: 'wslview', args: (url) => [url] },
    { command: 'cmd.exe', args: (url) => ['/c', 'start', '', url], cwd: '/mnt/c', windows: true },
    { command: 'explorer.exe', args: (url) => [url], anyExit: true, windows: true },
  ];
  if (environment && !environment.display) return [];
  return [{ command: 'xdg-open', args: (url) => [url] }];
}

// Opens the page, trying each way in turn. Answers whether one of them did: a missing program or one
// that failed moves on to the next, and none left is said by the caller, in the terminal.
export async function openBrowser(url, environment, { run = execFile, platform = process.platform } = {}) {
  // A folder, not a page, handed to Windows from WSL goes by its Windows name (\\wsl.localhost\…):
  // its Linux path meant nothing to cmd.exe or explorer.exe. wslpath says it; wslview needs no help.
  let windowsName = null;
  const asWindows = async () => {
    if (windowsName !== null || /^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return windowsName ?? url;
    windowsName = await new Promise((resolve) => {
      try { run('wslpath', ['-w', url], { timeout: 3000 }, (error, stdout) => resolve(error ? url : String(stdout ?? '').trim() || url)); } catch { resolve(url); }
    });
    return windowsName;
  };
  for (const way of browserWays(environment, { platform })) {
    const target = way.windows ? await asWindows() : url;
    const opened = await new Promise((resolve) => {
      try {
        run(way.command, way.args(target), { timeout: 8000, windowsHide: true, ...(way.cwd ? { cwd: way.cwd } : {}) }, (error) => resolve(!error || (way.anyExit && error.code !== 'ENOENT')));
      } catch { resolve(false); }
    });
    if (opened) return true;
  }
  return false;
}

// What the terminal says when no browser opened: where to open MADRE, and over SSH the one command
// to run on the person's own computer, with this session's own user, address and ports.
export function tunnelCommand(environment, ports, { user = environment?.ssh?.user, host = environment?.ssh?.host } = {}) {
  const forwards = [...new Set(ports.filter((port) => Number.isInteger(port) && port > 0))].map((port) => `-L ${port}:127.0.0.1:${port}`).join(' ');
  return `ssh ${forwards} ${user ? `${user}@` : ''}${host ?? 'your-server'}`;
}
export function browserAdvice(environment, address, { t = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '') } = {}) {
  const port = Number(new URL(address).port) || 80;
  if (environment?.place === 'ssh') {
    return [
      t('You are connected to this computer from another one (SSH), so the browser is over there.'),
      t('On your own computer, open another terminal and paste:'),
      `  ${tunnelCommand(environment, [port])}`,
      t('Then open {address} in your browser.', { address }),
    ];
  }
  if (environment?.wsl) return [t('Open this address in your Windows browser:'), `  ${address.replace('127.0.0.1', 'localhost')}`];
  return [t('Open this address in a browser on this computer:'), `  ${address}`];
}
