import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { installPlanFor, loginPlanFor } from '../src/auth-probe.mjs';

test('the bridge: one runnable install command per agent, and the room knows which sign-ins it can drive', () => {
  assert.deepEqual(installPlanFor({ id: 'codex' }), { package: '@openai/codex', command: 'npm', args: ['install', '-g', '@openai/codex', '--no-fund', '--no-audit'], display: 'npm install -g @openai/codex', alternatives: ['or install the ChatGPT desktop app, which bundles codex'] });
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
