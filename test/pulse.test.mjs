import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { parseMessage } from '../src/router.mjs';
import { Room } from '../src/room.mjs';
import { createPulseServer, projectRoomId } from '../src/server.mjs';
import { buildCodexArgs, parseCodexOutput } from '../src/adapters/codex.mjs';
import { buildClaudeArgs, parseClaudeOutput } from '../src/adapters/claude.mjs';
import {
  buildGeminiArgs,
  buildGeminiEnvironment,
  geminiReadonlyPolicy,
  isolateGeminiSettings,
  parseGeminiOutput,
  prepareGeminiHome,
} from '../src/adapters/gemini.mjs';
import { runReadonlyProcess } from '../src/adapters/process.mjs';
import { buildOpenCodeArgs, openCodeEnvironment, parseOpenCodeOutput } from '../src/adapters/opencode.mjs';
import { classifyUsagePercent, UsageSentinel } from '../src/usage-sentinel.mjs';

test('routes an explicit agent mention', () => {
  assert.deepEqual(parseMessage('@codex inspect the project', 'claude'), {
    text: 'inspect the project',
    target: 'codex',
    mentioned: 'codex',
  });
});

test('places Codex global safety flags before the exec command', () => {
  const args = buildCodexArgs({ projectRoot: '/project', prompt: 'hello' });
  assert.deepEqual(args.slice(0, 7), [
    '--sandbox', 'read-only',
    '--ask-for-approval', 'never',
    '-C', '/project',
    'exec',
  ]);
  assert.equal(args.at(-1), 'hello');
  assert.ok(args.includes('--json'));
});

test('extracts Codex response and token usage from JSON events', () => {
  const output = [
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'CODEX_OK' } }),
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 90, cached_input_tokens: 40, output_tokens: 10, reasoning_output_tokens: 2 } }),
  ].join('\n');
  assert.deepEqual(parseCodexOutput(output), {
    text: 'CODEX_OK',
    usage: { inputTokens: 90, cachedInputTokens: 40, outputTokens: 10, reasoningTokens: 2, totalTokens: 100, source: 'codex-json' },
  });
});

test('runs Claude with only local read tools and no persistent session', () => {
  const args = buildClaudeArgs({ prompt: 'hello' });
  assert.deepEqual(args.slice(-2), ['--', 'hello']);
  assert.equal(args.indexOf('--mcp-config') + 2, args.indexOf('--'), 'prompt must not follow a variadic option directly');
  assert.deepEqual(args.slice(args.indexOf('--tools'), args.indexOf('--tools') + 2), [
    '--tools', 'Read,Glob,Grep',
  ]);
  assert.ok(args.includes('--safe-mode'));
  assert.ok(args.includes('--no-session-persistence'));
  assert.deepEqual(args.slice(args.indexOf('--permission-mode'), args.indexOf('--permission-mode') + 2), [
    '--permission-mode', 'dontAsk',
  ]);
});

test('extracts Claude response, token usage, and estimated cost', () => {
  const output = JSON.stringify({
    result: 'CLAUDE_OK',
    total_cost_usd: 0.012,
    usage: {
      input_tokens: 80,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 30,
      output_tokens: 20,
    },
  });
  assert.deepEqual(parseClaudeOutput(output), {
    text: 'CLAUDE_OK',
    usage: {
      inputTokens: 80,
      cacheCreationInputTokens: 10,
      cachedInputTokens: 30,
      outputTokens: 20,
      reasoningTokens: 0,
      totalTokens: 140,
      costUsd: 0.012,
      source: 'claude-json',
    },
  });
  assert.equal(parseClaudeOutput(JSON.stringify({ is_error: true, result: 'Sign in required.' })).error, 'Sign in required.');
});

test('runs Gemini from an isolated workspace under an explicit read-only policy', () => {
  const args = buildGeminiArgs({ projectRoot: '/project', prompt: 'hello', policyPath: '/tmp/readonly.toml' });
  assert.deepEqual(args, [
    '--approval-mode', 'plan',
    '--output-format', 'json',
    '--skip-trust',
    '--include-directories', '/project',
    '--policy', '/tmp/readonly.toml',
    '--prompt', 'hello',
  ]);
  assert.match(geminiReadonlyPolicy, /toolName = "\*"/);
  assert.match(geminiReadonlyPolicy, /toolName = \["read_file", "list_directory", "glob", "grep_search"\]/);
});

test('isolates Gemini global state and disables the launcher relaunch', async () => {
  const env = buildGeminiEnvironment({ runtimeRoot: '/tmp/pulse-gemini-x', environment: { PATH: '/bin' } });
  assert.equal(env.GEMINI_CLI_HOME, '/tmp/pulse-gemini-x');
  assert.equal(env.GEMINI_CLI_NO_RELAUNCH, 'true');
  assert.equal(env.PATH, '/bin');

  assert.deepEqual(isolateGeminiSettings({
    security: { auth: { selectedType: 'oauth-personal' } },
    hooks: { BeforeTool: [{ hooks: [{ command: 'rm -rf /' }] }] },
    mcpServers: { evil: {} },
  }), { security: { auth: { selectedType: 'oauth-personal' } } });
  assert.deepEqual(isolateGeminiSettings({ hooks: {} }), {});

  const sourceHome = await mkdtemp(join(tmpdir(), 'pulse-gemini-source-'));
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'pulse-gemini-runtime-'));
  try {
    await writeFile(join(sourceHome, 'oauth_creds.json'), '{"token":"x"}');
    await writeFile(join(sourceHome, 'settings.json'), JSON.stringify({
      security: { auth: { selectedType: 'oauth-personal' } },
      hooks: { BeforeTool: [] },
    }));
    await writeFile(join(sourceHome, 'GEMINI.md'), 'ignore me');
    const geminiDir = await prepareGeminiHome({ runtimeRoot, sourceHome });
    assert.equal(geminiDir, join(runtimeRoot, '.gemini'));
    assert.equal(await readFile(join(geminiDir, 'oauth_creds.json'), 'utf8'), '{"token":"x"}');
    assert.deepEqual(JSON.parse(await readFile(join(geminiDir, 'settings.json'), 'utf8')), {
      security: { auth: { selectedType: 'oauth-personal' } },
    });
    await assert.rejects(readFile(join(geminiDir, 'GEMINI.md')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(geminiDir, 'google_accounts.json')), { code: 'ENOENT' });
  } finally {
    await rm(sourceHome, { recursive: true, force: true });
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

test('terminates the whole adapter process tree on timeout', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'pulse-process-'));
  const pidFile = join(workspace, 'grandchild.pid');
  try {
    // The child ignores SIGTERM and relays work to a grandchild, like the Gemini launcher.
    const script = `
      process.on('SIGTERM', () => {});
      const { spawn } = require('node:child_process');
      const grandchild = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
      require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(grandchild.pid));
      setTimeout(() => {}, 60000);
    `;
    const started = Date.now();
    await assert.rejects(runReadonlyProcess({
      executable: process.execPath,
      args: ['-e', script],
      cwd: workspace,
      timeoutMs: 700,
      killGraceMs: 200,
      label: 'Fixture',
      parse: () => ({ text: '' }),
    }), /Fixture did not respond before the timeout/);
    assert.ok(Date.now() - started < 5000);

    const grandchildPid = Number(await readFile(pidFile, 'utf8'));
    assert.ok(grandchildPid > 0);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        process.kill(grandchildPid, 0);
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        assert.equal(error.code, 'ESRCH');
        return;
      }
    }
    assert.fail('grandchild process survived the adapter timeout');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('extracts Gemini response and aggregates per-model token usage', () => {
  const output = JSON.stringify({
    response: 'GEMINI_OK',
    stats: {
      models: {
        'gemini-pro': { tokens: { prompt: 70, candidates: 15, total: 90, cached: 20, thoughts: 5 } },
        'gemini-flash': { tokens: { prompt: 10, candidates: 5, total: 15, cached: 0, thoughts: 0 } },
      },
    },
  });
  assert.deepEqual(parseGeminiOutput(output), {
    text: 'GEMINI_OK',
    usage: {
      inputTokens: 80,
      cachedInputTokens: 20,
      outputTokens: 20,
      reasoningTokens: 5,
      totalTokens: 105,
      source: 'gemini-json',
    },
  });
  assert.equal(parseGeminiOutput(JSON.stringify({ error: { message: 'Quota unavailable.' } })).error, 'Quota unavailable.');
});

test('runs OpenCode with an ephemeral restricted agent', () => {
  const args = buildOpenCodeArgs({ projectRoot: '/project', prompt: 'hello' });
  assert.deepEqual(args, [
    '--pure',
    'run',
    '--format', 'json',
    '--agent', 'pulse-readonly',
    '--dir', '/project',
    'hello',
  ]);
  const config = JSON.parse(openCodeEnvironment({}).OPENCODE_CONFIG_CONTENT);
  assert.equal(config.share, 'disabled');
  assert.equal(config.agent['pulse-readonly'].permission.edit ?? config.agent['pulse-readonly'].permission['*'], 'deny');
  assert.equal(config.agent['pulse-readonly'].permission.read, 'allow');
});

test('extracts only assistant text from OpenCode JSON events', () => {
  const output = [
    JSON.stringify({ type: 'step_start', part: { type: 'step-start' } }),
    JSON.stringify({ type: 'text', part: { type: 'text', text: 'OPEN' } }),
    JSON.stringify({ type: 'text', part: { type: 'text', text: 'CODE_OK' } }),
  ].join('\n');
  assert.deepEqual(parseOpenCodeOutput(output), { text: 'OPENCODE_OK', usage: null });
});

test('warns once when usage crosses preventive and critical thresholds', () => {
  const sentinel = new UsageSentinel();
  assert.equal(classifyUsagePercent(79), 'normal');
  assert.equal(classifyUsagePercent(80), 'warning');
  assert.equal(classifyUsagePercent(90), 'critical');
  assert.equal(classifyUsagePercent(100), 'exhausted');
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 79, source: 'test' }), null);
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 82, source: 'test' }).level, 'warning');
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 85, source: 'test' }), null);
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 92, source: 'test' }).level, 'critical');
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 100, source: 'test' }).level, 'exhausted');
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 'unknown', source: 'test' }), null);
});

test('uses a stable, project-specific room id', () => {
  assert.equal(projectRoomId('/project/one'), projectRoomId('/project/one'));
  assert.notEqual(projectRoomId('/project/one'), projectRoomId('/project/two'));
});

test('persists ordered room events', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-events-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await Promise.all([
      store.append('message.created', { text: 'one' }),
      store.append('message.created', { text: 'two' }),
    ]);
    const events = await store.readAll();
    assert.deepEqual(events.map((event) => event.sequence), [1, 2]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('serializes event sequences across store instances', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-shared-events-'));
  try {
    const file = join(root, 'events.jsonl');
    const first = await new EventStore(file).initialize();
    const second = await new EventStore(file).initialize();
    await Promise.all([
      first.append('message.created', { text: 'one' }),
      second.append('message.created', { text: 'two' }),
    ]);
    const events = await first.readAll();
    assert.deepEqual(events.map((event) => event.sequence), [1, 2]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('serves state and accepts a room message', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-server-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const state = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.json());
    assert.equal(state.projectRoot, root);
    const response = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello', target: 'codex' }),
    });
    assert.equal(response.status, 202);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await store.readAll()).length >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const events = await store.readAll();
    assert.deepEqual(events.map((event) => event.type), ['message.created', 'message.failed']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('serves the single-room interface', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ui-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /One conversation\. Every agent\./);
    assert.match(html, /Ask the room/);
    assert.match(html, /configured model provider/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('emits escalating handoff warnings through the test-only limit endpoint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-limit-'));
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' },
    { id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/fake/opencode', version: 'test' },
  ];
  const { server, store } = await createPulseServer({
    projectRoot: root,
    stateRoot: root,
    agents,
    testMode: true,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const report = async (usedPercent) => fetch(`http://127.0.0.1:${port}/api/test/limits`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agent: 'codex', usedPercent }),
    }).then((response) => response.json());
    assert.equal((await report(79)).emitted, false);
    const warning = await report(80);
    assert.equal(warning.warning.level, 'warning');
    assert.deepEqual(warning.warning.alternatives, ['opencode']);
    assert.match(warning.warning.message, /simulated provider usage window/);
    assert.equal((await report(89)).emitted, false);
    assert.equal((await report(90)).warning.level, 'critical');
    assert.equal((await report(100)).warning.level, 'exhausted');
    const events = await store.readAll();
    assert.equal(events.length, 3);
    assert.equal(events.at(-1).type, 'limit.warning');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('persists context handoffs across agents and room restarts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-handoff-'));
  const file = join(root, 'events.jsonl');
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' },
    { id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/fake/opencode', version: 'test' },
  ];
  const prompts = [];
  const invokers = {
    'codex-readonly': async ({ prompt }) => {
      prompts.push({ agent: 'codex', prompt });
      return { text: 'Codex found the router.', usage: null };
    },
    'opencode-readonly': async ({ prompt }) => {
      prompts.push({ agent: 'opencode', prompt });
      return { text: 'OpenCode continues from that finding.', usage: null };
    },
  };

  try {
    const firstStore = await new EventStore(file).initialize();
    const firstRoom = new Room({ store: firstStore, agents, projectRoot: root, invokers });
    await firstRoom.send({ text: 'Where is routing implemented?', target: 'codex' });
    await firstRoom.send({ text: 'Continue that analysis.', target: 'opencode' });

    const persisted = await firstStore.readAll();
    const firstHandoff = persisted.find((event) => event.type === 'handoff.created');
    assert.deepEqual(firstHandoff.payload, {
      handoffId: firstHandoff.payload.handoffId,
      fromAgent: 'codex',
      toAgent: 'opencode',
      firstSequence: 1,
      throughSequence: 3,
      messageCount: 2,
      omittedMessages: 0,
    });
    assert.match(prompts.at(-1).prompt, /Codex found the router\./);

    const restartedStore = await new EventStore(file).initialize();
    const restartedRoom = new Room({
      store: restartedStore,
      agents,
      projectRoot: root,
      historicalEvents: await restartedStore.readAll(),
      invokers,
    });
    await restartedRoom.send({ text: 'Now verify the conclusion.', target: 'codex' });

    assert.match(prompts.at(-1).prompt, /OpenCode continues from that finding\./);
    const handoffs = (await restartedStore.readAll()).filter((event) => event.type === 'handoff.created');
    assert.equal(handoffs.length, 2);
    assert.equal(handoffs.at(-1).payload.fromAgent, 'opencode');
    assert.equal(handoffs.at(-1).payload.toAgent, 'codex');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('polls available official quota sources and restores sentinel state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-quota-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  let usedPercent = 91;
  const source = {
    id: 'codex-account',
    agent: 'codex',
    read: async () => ({ usedPercent, resetAt: '2026-09-16T00:00:00.000Z' }),
  };

  try {
    const first = await createPulseServer({
      projectRoot: root,
      stateRoot: root,
      agents,
      quotaSources: [source],
      quotaPollIntervalMs: 0,
    });
    await new Promise((resolve) => first.server.listen(0, '127.0.0.1', resolve));
    assert.deepEqual(first.quotaMonitor.snapshot(), [{
      id: 'codex-account',
      agent: 'codex',
      available: true,
      checkedAt: first.quotaMonitor.snapshot()[0].checkedAt,
      error: null,
    }]);
    let events = await first.store.readAll();
    assert.equal(events.filter((event) => event.type === 'quota.updated').length, 1);
    assert.equal(events.filter((event) => event.type === 'limit.warning').length, 1);
    assert.equal(events[0].payload.source, 'official:codex-account');
    assert.equal(events[0].payload.official, true);
    await new Promise((resolve) => first.server.close(resolve));

    usedPercent = 92;
    const second = await createPulseServer({
      projectRoot: root,
      stateRoot: root,
      agents,
      quotaSources: [source],
      quotaPollIntervalMs: 0,
    });
    await new Promise((resolve) => second.server.listen(0, '127.0.0.1', resolve));
    events = await second.store.readAll();
    assert.equal(events.filter((event) => event.type === 'quota.updated').length, 2);
    assert.equal(events.filter((event) => event.type === 'limit.warning').length, 1);
    await new Promise((resolve) => second.server.close(resolve));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
