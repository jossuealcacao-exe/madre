import test from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { associateProject, knownRooms } from '../src/salas.mjs';

// Restart MADRE (2026-10-28, the power key's first choice): Home and every open project close and
// come back — new processes, the same ports, nothing opened in the browser — so every page open on
// them finds them again. Asked from a page of this computer only.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const freePort = () => new Promise((resolve) => { const probe = createServer(); probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });
// Anything still running from this test's own folders, whatever the state file says (QA 1.1.0,
// GEN-01): a failed run left `madre.mjs start --project …/alfa` alive, holding ports, for hours.
function sweep(...folders) {
  if (process.platform === 'win32') return;
  let listed = '';
  try { listed = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }); } catch { return; }
  for (const line of listed.split('\n')) {
    const [pid, ...rest] = line.trim().split(/\s+/);
    const command = rest.join(' ');
    if (!/madre\.mjs/.test(command) || !folders.some((folder) => command.includes(folder))) continue;
    try { if (Number(pid) !== process.pid) process.kill(Number(pid), 'SIGKILL'); } catch { /* already gone */ }
  }
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('restart · Home and every open project come back as new processes on the same ports', { skip: process.platform === 'win32', timeout: 150000 }, async () => {
  const state = await scratch('madre-restart-state-');
  const home = await realpath(await scratch('madre-restart-home-'));
  const env = { ...process.env, PULSE_HOME: state, HOME: home, PULSE_UPDATE_CHECK: '0', PULSE_PORT_BASE: String(20000 + Math.floor(Math.random() * 20000)) };
  for (const key of Object.keys(env)) if (key.startsWith('CLAUDE')) delete env[key];
  await mkdir(join(home, 'alfa'));
  const alfaId = (await associateProject({ root: join(home, 'alfa'), home, stateRoot: state })).id;
  const port = await freePort();
  const lobby = spawn(process.execPath, [join(process.cwd(), 'bin', 'madre.mjs'), 'lobby', '--no-open', '--port', String(port)], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  lobby.stdout.on('data', (chunk) => { out += chunk; });
  lobby.stderr.on('data', (chunk) => { out += chunk; });
  try {
    for (let waited = 0; !/MADRE (?:is ready|está lista)/.test(out) && waited < 45000; waited += 100) await pause(100);
    assert.match(out, /MADRE (?:is ready|está lista)/, out);
    const alfa = await fetch(`http://127.0.0.1:${port}/api/salas/start`, { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}` }, body: JSON.stringify({ room: alfaId }) }).then((answer) => answer.json());
    assert.ok(alfa.port, JSON.stringify(alfa));
    const before = Object.fromEntries((await knownRooms(state)).filter((one) => one.open).map((one) => [one.id, one.open]));
    assert.ok(before[alfaId], 'alfa did not open');
    // From another site, or without saying where it comes from, nothing restarts.
    const refused = await fetch(`http://127.0.0.1:${port}/api/madre/restart`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://evil.example' }, body: '{}' });
    assert.equal(refused.status, 403);
    const asked = await fetch(`http://127.0.0.1:${port}/api/madre/restart`, { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}` }, body: '{}' });
    assert.equal(asked.status, 202);
    assert.equal((await asked.json()).others, Object.keys(before).length - 1);
    // Each one back: open, on the port it had, from a process that is not the one it was.
    let now = {};
    for (let waited = 0; waited < 60000; waited += 300) {
      await pause(300);
      now = Object.fromEntries((await knownRooms(state)).filter((one) => one.open).map((one) => [one.id, one.open]));
      const back = Object.keys(before).every((id) => now[id] && now[id].pid !== before[id].pid);
      if (back && await fetch(`http://127.0.0.1:${port}/api/version`).then((answer) => answer.ok).catch(() => false) && await fetch(`http://127.0.0.1:${before[alfaId].port}/api/version`).then((answer) => answer.ok).catch(() => false)) break;
    }
    for (const id of Object.keys(before)) {
      assert.ok(now[id], `${id} did not come back`);
      assert.notEqual(now[id].pid, before[id].pid, `${id} is the same process`);
      assert.equal(now[id].port, before[id].port, `${id} came back on another port`);
    }
  } finally {
    // Only what this test opened: what its own state folder marks open, and the first Home. A project
    // still on its way up when the test gave up opens after it: it is waited for a few seconds and
    // closed too, so a failed run leaves nothing holding a port.
    if (lobby.exitCode === null) lobby.kill('SIGKILL');
    for (let round = 0; round < 20; round += 1) {
      for (const one of await knownRooms(state)) if (one.open) { try { process.kill(one.open.pid, 'SIGKILL'); } catch { /* already gone */ } }
      await pause(500);
    }
    sweep(home, state);
  }
});
