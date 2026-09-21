import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { installPlanFor, loginPlanFor } from '../src/auth-probe.mjs';

test('the bridge: one runnable install command per agent, and the room knows which sign-ins it can drive', () => {
  assert.deepEqual(installPlanFor({ id: 'codex' }), { package: '@openai/codex', command: 'npm', args: ['install', '-g', '@openai/codex', '--no-fund', '--no-audit'], display: 'npm install -g @openai/codex', fallback: null, alternatives: ['or install the ChatGPT desktop app, which bundles codex'] });
  assert.equal(installPlanFor({ id: 'claude' }).display, 'npm install -g @anthropic-ai/claude-code');
  assert.equal(installPlanFor({ id: 'gemini' }).display, 'npm install -g @google/gemini-cli');
  assert.equal(installPlanFor({ id: 'opencode' }).display, 'npm install -g opencode-ai');
  assert.equal(installPlanFor({ id: 'madre' }), null, 'the local agent is not an npm package');
  assert.deepEqual([loginPlanFor({ id: 'codex' }).headless, loginPlanFor({ id: 'claude' }).headless], [true, true], 'browser flows the room can run');
  assert.deepEqual([loginPlanFor({ id: 'gemini' }).headless, loginPlanFor({ id: 'opencode' }).headless], [false, false], 'these hand the human their command');
});

test('the bridge installs a CLI from the room, streams it, and the agent appears without restarting', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-bridge-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-bridge-project-'));
  try {
    // The machine starts with Codex missing; the fake installer is what "npm install -g" would be.
    let installed = false;
    const roster = () => [
      { id: 'codex', label: 'Codex', detected: installed, ready: installed, adapter: 'codex-readonly', path: installed ? '/fake/codex' : null, version: installed ? '0.153.4' : null },
      { id: 'claude', label: 'Claude', detected: false, ready: false, adapter: 'claude-readonly', path: null, version: null },
    ];
    const ran = [];
    const { server } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: roster(),
      detect: async () => roster(),
      probe: async (agents) => Object.fromEntries(agents.map((agent) => [agent.id, agent.detected ? { state: 'signed-out', detail: 'not logged in' } : { state: 'not-installed', detail: 'not found' }])),
      installers: {
        codex: async ({ command, args, onLine }) => { ran.push([command, ...args].join(' ')); onLine('added 1 package'); installed = true; return { ok: true, code: 0 }; },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const before = await fetch(`${base}/api/state`).then((response) => response.json());
      const codexBefore = before.agents.find((agent) => agent.id === 'codex');
      assert.deepEqual([codexBefore.detected, codexBefore.install.display, codexBefore.login.headless], [false, 'npm install -g @openai/codex', true], 'the first paint already knows how to install and sign in');

      const started = await fetch(`${base}/api/agents/codex/install`, { method: 'POST' });
      assert.equal(started.status, 202);
      assert.equal((await started.json()).command, 'npm install -g @openai/codex');

      // The install runs in the background; wait for the room to say it finished.
      let finished = null;
      for (let attempt = 0; attempt < 100 && !finished; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const events = (await fetch(`${base}/api/state`).then((response) => response.json())).events;
        finished = events.find((event) => event.type === 'connection.install.finished');
      }
      assert.ok(finished, 'the install finished');
      assert.deepEqual([finished.payload.agent, finished.payload.detected, finished.payload.version], ['codex', true, '0.153.4']);
      assert.deepEqual(ran, ['npm install -g @openai/codex --no-fund --no-audit']);

      const after = await fetch(`${base}/api/state`).then((response) => response.json());
      assert.equal(after.agents.find((agent) => agent.id === 'codex').detected, true, 'the roster updated in place, no restart');
      const types = after.events.map((event) => event.type);
      assert.ok(types.includes('connection.install.started') && types.includes('connection.install.output'));
      assert.ok(after.events.some((event) => event.type === 'agents.updated' && event.payload.reason.includes('looked again')), 'the open pages are told');

      // Installing twice is refused, and so is an agent MADRE cannot install.
      assert.equal((await fetch(`${base}/api/agents/codex/install`, { method: 'POST' })).status, 409);
      assert.equal((await fetch(`${base}/api/agents/madre/install`, { method: 'POST' })).status, 404);

      // RECHECK also looks for binaries again, and answers with the whole roster.
      const probed = await fetch(`${base}/api/agents/probe`, { method: 'POST' }).then((response) => response.json());
      assert.equal(probed.agents.find((agent) => agent.id === 'codex').detected, true);
      assert.equal(probed.sessions.codex.state, 'signed-out');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});

test('an install walled out of the system folders takes MADRE\'s own, and the agent is found there', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-bridge-admin-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-bridge-admin-project-'));
  try {
    let installed = false;
    const roster = () => [{ id: 'codex', label: 'Codex', detected: installed, ready: installed, adapter: 'codex-readonly', path: installed ? '/fake/codex' : null, version: installed ? '1' : null }];
    const tried = [];
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: roster(),
      detect: async () => roster(),
      probe: async (agents) => Object.fromEntries(agents.map((agent) => [agent.id, { state: agent.detected ? 'signed-out' : 'not-installed', detail: '' }])),
      installers: {
        // The first attempt hits the system folder and is refused; the second, into MADRE's prefix, works.
        codex: async ({ args, onLine }) => {
          tried.push(args.join(' '));
          if (!args.includes('--prefix')) { onLine('npm ERR! code EACCES'); onLine('npm ERR! Missing write access to /usr/local/lib/node_modules'); return { ok: false, code: 243 }; }
          onLine('added 1 package'); installed = true; return { ok: true, code: 0 };
        },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await fetch(`http://127.0.0.1:${server.address().port}/api/agents/codex/install`, { method: 'POST' });
      let finished = null;
      for (let attempt = 0; attempt < 100 && !finished; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        finished = (await store.readAll()).find((event) => event.type === 'connection.install.finished');
      }
      assert.equal(finished.payload.detected, true, 'the agent is there in the end');
      assert.equal(finished.payload.where, 'madre');
      assert.match(finished.payload.prefix, /\.pulse\/tools$/);
      assert.equal(tried.length, 2, 'the system folder first, MADRE\'s own second');
      assert.ok(tried[1].includes('--prefix'));
      const said = (await store.readAll()).filter((event) => event.type === 'connection.install.output').map((event) => event.payload.line).join('\n');
      assert.match(said, /cannot write to this computer's system folder without an administrator[\s\S]*Installing into MADRE's own folder/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});

test('detection looks in MADRE\'s own tools folder as well as along PATH', async () => {
  const { toolsBin, toolsPrefix, findExecutable } = await import('../src/runtime-detection.mjs');
  const home = await mkdtemp(join(tmpdir(), 'pulse-tools-'));
  try {
    assert.equal(toolsPrefix({ PULSE_HOME: home }), join(home, 'tools'));
    assert.equal(toolsBin({ PULSE_HOME: home }), join(home, 'tools', process.platform === 'win32' ? '' : 'bin').replace(/\/$/, ''));
    const bin = toolsBin({ PULSE_HOME: home });
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, 'codex'), '#!/bin/sh\necho 1\n', { mode: 0o755 });
    assert.equal(await findExecutable(['codex'], bin), join(bin, 'codex'), 'a CLI MADRE installed is found where MADRE put it');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('the local brain: one step at a time, with the command for this system in plain sight', async () => {
  const { ollamaInstallPlan, ollamaStartPlan } = await import('../src/modules/ollama.mjs');
  const withBrew = ollamaInstallPlan({ platform: 'darwin', brew: '/opt/homebrew/bin/brew' });
  assert.deepEqual([withBrew.command, withBrew.args, withBrew.display], ['/opt/homebrew/bin/brew', ['install', 'ollama'], 'brew install ollama']);
  const withoutBrew = ollamaInstallPlan({ platform: 'darwin', brew: null });
  assert.equal(withoutBrew.command, null, 'nothing is run behind the human when MADRE has no way in');
  assert.equal(withoutBrew.download, 'https://ollama.com/download');
  const linux = ollamaInstallPlan({ platform: 'linux' });
  assert.deepEqual([linux.command, linux.display], ['sh', 'curl -fsSL https://ollama.com/install.sh | sh']);
  assert.match(linux.note, /own install script/);
  assert.equal(ollamaInstallPlan({ platform: 'win32' }).download, 'https://ollama.com/download');
  assert.deepEqual(ollamaStartPlan(), { command: 'ollama', args: ['serve'], display: 'ollama serve' });
});

test('the local brain refuses to start when it is not here, and says so instead of guessing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ollama-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-ollama-project-'));
  try {
    const { server } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: '1' }],
      probe: async () => ({ codex: { state: 'signed-in', detail: '' } }),
      // No Ollama anywhere: the room must offer the way in, never pretend.
      ollamaProbe: async () => ({ running: false, host: null, models: [], embedModel: null, chatModel: null }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const seen = await fetch(`${base}/api/ollama`).then((response) => response.json());
      assert.equal(seen.ollama.running, false);
      assert.ok('binary' in seen.ollama && 'install' in seen.ollama && 'start' in seen.ollama, 'the bridge is told what it can offer');
      assert.equal(seen.recommended.chat, 'qwen2.5:3b');
      const pulled = await fetch(`${base}/api/ollama/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'qwen2.5:3b' }) });
      assert.equal(pulled.status, 412, 'nothing is pulled into an Ollama that is not running');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});
