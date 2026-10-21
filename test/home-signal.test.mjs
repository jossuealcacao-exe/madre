import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { associateProject, knownRooms } from '../src/salas.mjs';

// Home closed by a signal (Ctrl-C, its Terminal closed, `kill`) closes what Turn MADRE off closes
// (2026-10-21): every open project, also one opened from another project. That one's process hangs
// from the project that opened it, not from Home, and before this it was left running on its port.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const freePort = () => new Promise((resolve) => { const probe = createServer(); probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

test('home · closed by a signal, it closes every open project, also one opened from another project', { skip: process.platform === 'win32', timeout: 120000 }, async () => {
  const state = await scratch('madre-signal-state-');
  const home = await realpath(await scratch('madre-signal-home-'));
  const env = { ...process.env, PULSE_HOME: state, HOME: home, PULSE_UPDATE_CHECK: '0' };
  for (const key of Object.keys(env)) if (key.startsWith('CLAUDE')) delete env[key];
  const ids = {};
  for (const name of ['alfa', 'beta']) {
    await mkdir(join(home, name));
    ids[name] = (await associateProject({ root: join(home, name), home, stateRoot: state })).id;
  }
  const port = await freePort();
  const lobby = spawn(process.execPath, [join(process.cwd(), 'bin', 'madre.mjs'), 'lobby', '--no-open', '--port', String(port)], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  lobby.stdout.on('data', (chunk) => { out += chunk; });
  lobby.stderr.on('data', (chunk) => { out += chunk; });
  const ended = new Promise((finish) => lobby.on('close', (code) => finish(code)));
  const start = (at, room) => fetch(`http://127.0.0.1:${at}/api/salas/start`, { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${at}` }, body: JSON.stringify({ room }) }).then((answer) => answer.json());
  try {
    for (let waited = 0; !/MADRE is ready/.test(out) && waited < 45000; waited += 100) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.match(out, /MADRE is ready/, out);
    // alfa opened from Home; beta opened from alfa, so its process is alfa's child, not Home's.
    const alfa = await start(port, ids.alfa);
    assert.ok(alfa.port, JSON.stringify(alfa));
    const beta = await start(alfa.port, ids.beta);
    assert.ok(beta.port, JSON.stringify(beta));
    const open = Object.fromEntries((await knownRooms(state)).filter((one) => one.open).map((one) => [one.id, one.open.pid]));
    assert.equal(Number(execFileSync('ps', ['-o', 'ppid=', '-p', String(open[ids.beta])], { encoding: 'utf8' }).trim()), open[ids.alfa], 'beta was not opened from alfa');
    lobby.kill('SIGTERM');
    assert.equal(await ended, 0, out);
    assert.deepEqual((await knownRooms(state)).filter((one) => one.open).map((one) => one.id), [], 'a project was left open');
    for (const id of [ids.alfa, ids.beta]) {
      for (let waited = 0; alive(open[id]) && waited < 5000; waited += 100) await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(alive(open[id]), false, `the process of ${id} is still running`);
    }
  } finally {
    // Only what this test opened: the rooms marked open in its own state folder, and Home.
    for (const one of await knownRooms(state)) if (one.open) { try { process.kill(one.open.pid, 'SIGKILL'); } catch { /* already gone */ } }
    if (lobby.exitCode === null) lobby.kill('SIGKILL');
  }
});
