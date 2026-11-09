// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE inside the app (desktop/, Tauri, 2026-11-09): the app holds Home's stdin open, and when the
// app dies without saying so (Force Quit, a crash) the pipe closes. Home closes itself then, instead
// of staying behind with nobody to see it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MADRE = new URL('../bin/madre.mjs', import.meta.url).pathname;

test('inside the app, Home closes itself when the app\'s pipe closes', { timeout: 60000 }, async () => {
  const home = await mkdtemp(join(tmpdir(), 'madre-app-home-'));
  const state = await mkdtemp(join(tmpdir(), 'madre-app-state-'));
  try {
    const child = spawn(process.execPath, [MADRE, 'lobby', '--no-open'], {
      cwd: home,
      env: { ...process.env, HOME: home, PULSE_HOME: state, PULSE_LOBBY_HOME: home, MADRE_APP: '1', PULSE_TERMS: 'accepted', PULSE_MARKET: '0', PULSE_OLLAMA: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let said = '';
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Home never said its address:\n${said}`)), 40000);
      child.stdout.on('data', (chunk) => { said += chunk; if (/http:\/\/127\.0\.0\.1:\d+\//.test(said)) { clearTimeout(timer); resolve(); } });
      child.once('exit', () => { clearTimeout(timer); reject(new Error(`Home ended before saying its address:\n${said}`)); });
    });
    // The app is gone: its end of the pipe closes.
    child.stdin.end();
    const ended = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve(null), 15000))]);
    if (!ended) child.kill('SIGKILL');
    assert.ok(ended, 'Home stayed open after the app was gone');
    assert.equal(ended.code, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(state, { recursive: true, force: true });
  }
});
