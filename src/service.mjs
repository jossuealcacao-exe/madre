// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE as a service of the Linux it runs on (L-3, Carlos's server, 2026-11-04). Installed on a
// server, MADRE was started by hand and did not come back when the server restarted or MADRE
// fell: Carlos's own workaround was a script and a cron line. Here, from Home's Settings or
// `madre servicio`, it becomes a systemd unit of the person's own user (no root): Home starts when
// the computer does and again if it falls, and Home opens the projects that were open.
//
// What it starts is a small script MADRE writes in its own folder and rewrites every time Home
// opens: the same version that ran last, the way this copy was installed, and the PATH it had
// (the agents and Node of nvm live there). A server never updates itself on a restart; a version
// changes only when the person presses Restart with it.

import { execFile } from 'node:child_process';
import { access, chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

export const UNIT_NAME = 'madre.service';
const shq = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
const quiet = (command, args) => new Promise((resolve) => {
  try {
    execFile(command, args, { timeout: 15000, windowsHide: true }, (error, stdout, stderr) => resolve({ ok: !error, stdout: String(stdout ?? '').trim(), stderr: String(stderr ?? '').trim() }));
  } catch (error) { resolve({ ok: false, stdout: '', stderr: String(error?.message ?? error) }); }
});
const there = (file) => access(file).then(() => true, () => false);
const whoami = () => { try { return userInfo().username; } catch { return process.env.USER ?? ''; } };

export const unitFile = (home = homedir()) => join(home, '.config', 'systemd', 'user', UNIT_NAME);
export const launcherFile = (stateRoot) => join(stateRoot, 'servicio', 'arrancar.sh');

// The line Home starts with, by how this copy was installed. Inside a project's node_modules
// there is no command of its own to start Home with: none.
export function launcherScript({ install, name, version, execPath = process.execPath, script = process.argv[1], port = 4317, env = process.env }) {
  const start = `lobby --no-open --port ${Number(port) || 4317}`;
  let line = null;
  if (install === 'npx') line = `exec npx -y ${shq(`${name}@${version}`)} ${start}`;
  else if (install === 'global') line = `exec ${shq(String(name).split('/').pop())} ${start}`;
  else if (install === 'source') line = `exec ${shq(execPath)} ${shq(script)} ${start}`;
  if (!line) return null;
  const kept = ['PATH', 'PULSE_HOME', 'LANG', 'OLLAMA_HOST'].filter((key) => env[key]).map((key) => `export ${key}=${shq(env[key])}`);
  return ['#!/bin/sh', '# Written by MADRE every time Home opens (src/service.mjs); systemd starts it as madre.service.', ...kept, 'export MADRE_SERVICE=1', line, ''].join('\n');
}

export function unitText(launcher) {
  return [
    '[Unit]',
    'Description=MADRE',
    'After=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `ExecStart=/bin/sh "${launcher}"`,
    'Restart=on-failure',
    'RestartSec=5',
    // 2 is a start MADRE refused (Home already open, an option it does not know): trying again
    // every five seconds would only say it again.
    'RestartPreventExitStatus=2',
    // The projects run as processes of their own: Home falling or restarting does not take them down.
    'KillMode=process',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n');
}

// Where it stands: whether this computer can have it at all, whether it is on, and whether the
// user's services run without a session open (linger), which a server restarted at night needs.
export async function serviceState({ platform = process.platform, home = homedir(), user = whoami(), run = quiet } = {}) {
  if (platform !== 'linux') return { supported: false, why: 'linux' };
  const systemd = await run('systemctl', ['--user', 'show-environment']);
  if (!systemd.ok) return { supported: false, why: 'systemd' };
  const enabled = (await run('systemctl', ['--user', 'is-enabled', UNIT_NAME])).stdout === 'enabled';
  const active = (await run('systemctl', ['--user', 'is-active', UNIT_NAME])).stdout === 'active';
  const linger = (await run('loginctl', ['show-user', user, '-p', 'Linger', '--value'])).stdout === 'yes';
  return { supported: true, enabled: enabled && await there(unitFile(home)), active, linger, user, lingerCommand: linger ? null : `sudo loginctl enable-linger ${user}` };
}

// Turning it on: the script, the unit, enabled for the next start. It is not started now: Home is
// already open, and a second one would be refused. Linger is asked for without a password; where
// the system wants one, the command to type is said instead.
export async function enableService({ stateRoot, launcher, platform = process.platform, home = homedir(), user = whoami(), run = quiet } = {}) {
  const before = await serviceState({ platform, home, user, run });
  if (!before.supported) return before;
  if (!launcher) return { ...before, refused: 'install' };
  const script = launcherFile(stateRoot);
  await mkdir(join(stateRoot, 'servicio'), { recursive: true });
  await writeFile(script, launcher, { mode: 0o700 });
  await chmod(script, 0o700);
  await mkdir(join(home, '.config', 'systemd', 'user'), { recursive: true });
  await writeFile(unitFile(home), unitText(script));
  await run('systemctl', ['--user', 'daemon-reload']);
  const enabled = await run('systemctl', ['--user', 'enable', UNIT_NAME]);
  if (!enabled.ok) return { ...before, refused: 'enable', detail: enabled.stderr.slice(0, 300) };
  if (!before.linger) await run('loginctl', ['enable-linger', user]);
  return serviceState({ platform, home, user, run });
}

export async function disableService({ stateRoot, platform = process.platform, home = homedir(), user = whoami(), run = quiet } = {}) {
  const before = await serviceState({ platform, home, user, run });
  if (!before.supported) return before;
  await run('systemctl', ['--user', 'disable', UNIT_NAME]);
  await rm(unitFile(home), { force: true });
  await run('systemctl', ['--user', 'daemon-reload']);
  await rm(launcherFile(stateRoot), { force: true });
  return serviceState({ platform, home, user, run });
}

// Every time Home opens with the service on: the script says the version and the PATH of now.
export async function refreshLauncher({ stateRoot, launcher, home = homedir() } = {}) {
  if (!launcher || !(await there(unitFile(home))) || !(await there(launcherFile(stateRoot)))) return false;
  if ((await readFile(launcherFile(stateRoot), 'utf8').catch(() => '')) === launcher) return false;
  await writeFile(launcherFile(stateRoot), launcher, { mode: 0o700 });
  return true;
}
