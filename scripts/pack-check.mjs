#!/usr/bin/env node
// Packs MADRE, installs the tarball into an empty directory and exercises the
// installed CLI: doctor, help, and a server start that serves /api/state.
// No model call is made, so this costs no provider quota.
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const workspace = await mkdtemp(join(tmpdir(), 'pulse-pack-'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`); };

try {
  const { stdout: packJson } = await run('npm', ['pack', '--json', '--pack-destination', workspace], { cwd: projectRoot });
  const [pack] = JSON.parse(packJson);
  const files = pack.files.map((file) => file.path);
  check(files.some((file) => file.startsWith('bin/')), 'tarball contains bin/');
  check(files.some((file) => file.startsWith('src/')), 'tarball contains src/');
  check(files.includes('src/room/economy.mjs'), 'tarball contains the turn economy');
  check(files.some((file) => file.startsWith('public/')), 'tarball contains public/');
  check(!files.some((file) => file.startsWith('test/') || file.startsWith('scripts/')), 'tarball excludes test/ and scripts/');

  const consumer = join(workspace, 'consumer');
  await run('mkdir', ['-p', consumer]);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'pulse-consumer', private: true }));
  await run('npm', ['install', '--no-audit', '--no-fund', join(workspace, pack.filename)], { cwd: consumer });
  const cli = join(consumer, 'node_modules', '.bin', 'madre');

  const { stdout: help } = await run(cli, ['--help']);
  check(/madre start/.test(help), 'installed CLI prints help');
  const { stdout: doctor } = await run(cli, ['doctor', '--json', '--project', projectRoot]).catch((error) => error);
  const report = JSON.parse(doctor);
  check(Array.isArray(report.agents) && report.agents.length === 4, 'doctor reports four agents');

  const stateRoot = join(workspace, 'state');
  const port = 40000 + Math.floor(Math.random() * 20000);
  const server = spawn(cli, ['start', '--no-open', '--project', projectRoot, '--port', String(port)], {
    env: { ...process.env, PULSE_HOME: stateRoot },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let ready = false;
  // Up to forty-five seconds: installing and starting a fresh copy on a loaded machine is slow,
  // and a check that fails for being impatient teaches nothing.
  for (let attempt = 0; attempt < 90 && !ready; attempt += 1) {
    await new Promise((next) => setTimeout(next, 500));
    ready = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.ok).catch(() => false);
  }
  check(ready, 'installed server answers /api/state');
  if (ready) {
    const state = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.json());
    check(state.projectRoot === projectRoot, 'server is bound to the requested project');
    const html = await fetch(`http://127.0.0.1:${port}/`).then((response) => response.text());
    check(/MADRE/.test(html), 'server serves the room page');
    const modules = await fetch(`http://127.0.0.1:${port}/api/extensions`).then((response) => response.json());
    check(modules.extensions.some((item) => item.id === 'ash' && item.kind === 'builtin'), 'installed server lists Ash');
    // No confirmation: Ash stopped being able to change the meaning of anything.
    const activated = await fetch(`http://127.0.0.1:${port}/api/extensions/ash/install`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
    }).then((response) => response.json());
    check(activated.enabled === true, 'installed server switches Ash on in isolated state');
    const economy = await fetch(`http://127.0.0.1:${port}/api/economy`).then((response) => response.json());
    check(Number.isInteger(economy.turns), 'installed server reports the turn economy');
  }
  const exited = new Promise((resolveExit) => server.once('close', (code, signal) => resolveExit({ code, signal })));
  server.kill('SIGTERM');
  const outcome = await Promise.race([exited, new Promise((resolveTimeout) => setTimeout(() => resolveTimeout('timeout'), 5000))]);
  check(outcome !== 'timeout' && outcome.code === 0, `server exits cleanly on SIGTERM (${JSON.stringify(outcome)})`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\npack-check failed: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log('\npack-check passed');
