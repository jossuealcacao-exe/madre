// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE inside the app (MADRE.app, Tauri, 2026-11-09): the app holds Home's stdin open, and when the
// app dies without saying so (Force Quit, a crash) the pipe closes. Home closes itself then, instead
// of staying behind with nobody to see it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyCommand, detectInstall, updateCommand } from '../src/updates.mjs';

const MADRE = new URL('../bin/madre.mjs', import.meta.url).pathname;

test('inside the app, Home closes itself when the app\'s pipe closes', { timeout: 60000 }, async () => {
  const home = await mkdtemp(join(tmpdir(), 'madre-app-home-'));
  const state = await mkdtemp(join(tmpdir(), 'madre-app-state-'));
  try {
    const child = spawn(process.execPath, [MADRE, 'lobby', '--no-open'], {
      cwd: home,
      // A port of its own: on 4317 it would find another Home (the author's, or another test's) and
      // join it instead of starting, which is what the app does, not what this tests.
      env: { ...process.env, HOME: home, PULSE_HOME: state, PULSE_LOBBY_HOME: home, MADRE_APP: '1', PULSE_TERMS: 'accepted', PULSE_MARKET: '0', PULSE_OLLAMA: '0', PULSE_PORT_BASE: String(46000 + Math.floor(Math.random() * 3000)) },
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
    // Retried (Q-25): an AI's probe Home started (grok writes its ~/.grok) can still be writing in
    // this house for a moment after Home closed, and the folder was not empty yet.
    await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    await rm(state, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test('inside the app, MADRE knows its channel: it updates itself, never by npm or git from the page', () => {
  assert.equal(detectInstall({ script: '/Applications/MADRE.app/Contents/Resources/madre/bin/madre.mjs', env: { MADRE_APP: '1' } }), 'app');
  assert.equal(detectInstall({ script: '/Applications/MADRE.app/Contents/Resources/madre/bin/madre.mjs', env: {} }), 'source', 'the channel is the app\'s word, not a guess from the path');
  assert.equal(updateCommand('app', '@jossuealcala/madre', '1.2.0'), null);
  assert.equal(applyCommand({ install: 'app', name: '@jossuealcala/madre', version: '1.2.0', port: 4317, projectRoot: '/x' }), null);
});

// Restarting MADRE from its own page inside the app (2026-11-10): the new Home keeps the app's pipe.
// Given none, it read the app as gone the moment it started, closed, and MADRE did not come back.
test('inside the app, a restarted Home keeps the app\'s pipe', async () => {
  const { readFile } = await import('node:fs/promises');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const restart = server.slice(server.indexOf('function restartSelf(port) {'), server.indexOf('// How many memories of each kind'));
  assert.match(restart, /const watched = process\.env\.MADRE_APP === '1' && salasRoom;/);
  assert.match(restart, /stdio: \[watched \? 'inherit' : 'ignore', log, log\]/);
});
