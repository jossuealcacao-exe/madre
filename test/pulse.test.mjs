import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
import { spawn } from 'node:child_process';
function spawnCli(args, cwd) {
  const env = { ...process.env, PULSE_HOME: cwd };
  for (const key of Object.keys(env)) if (key.startsWith('CLAUDE')) delete env[key];
  return spawn(process.execPath, [join(process.cwd(), 'bin', 'pulse.mjs'), ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
}
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { parseMessage } from '../src/router.mjs';
import { failureMessage, Room } from '../src/room.mjs';
import { agentTimeoutsFromEnv, createPulseServer, projectRoomId } from '../src/server.mjs';
import { buildCodexArgs, parseCodexOutput } from '../src/adapters/codex.mjs';
import { buildClaudeArgs, parseClaudeOutput } from '../src/adapters/claude.mjs';
import {
  buildGeminiArgs,
  buildGeminiEnvironment,
  cleanupRuntimeRoot,
  geminiReadonlyPolicy,
  isolateGeminiSettings,
  parseGeminiOutput,
  prepareGeminiHome,
} from '../src/adapters/gemini.mjs';
import { runReadonlyProcess } from '../src/adapters/process.mjs';
import { geminiAuthState, parseClaudeAuthStatus, parseCodexLoginStatus, parseOpenCodeAuthList } from '../src/auth-probe.mjs';
import { applyConfigToEnv, loadConfig, updateConfig } from '../src/config.mjs';
import { isOnline, makePalette, renderReport } from '../src/setup.mjs';
import { CONDITIONS, detectPlatform, diagnose, fixesFor, searchConditions } from '../public/troubleshooting.js';
import { EXTENSIONS, extensionById, gitToplevel, listExtensions } from '../src/extensions.mjs';
import { parseArgs } from '../src/cli-args.mjs';
import { parseDirectives, stripDirectives } from '../src/directives.mjs';
import { buildConversationContext, formatConversationContext } from '../src/conversation-context.mjs';
import { mkdir } from 'node:fs/promises';
import { buildOpenCodeArgs, openCodeEnvironment, parseOpenCodeOutput } from '../src/adapters/opencode.mjs';
import { classifyUsagePercent, UsageSentinel } from '../src/usage-sentinel.mjs';


// Opens an SSE connection and resolves each parsed frame through `onEvent`.
function openEventStream(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let buffer = '';
      const frames = [];
      const waiters = [];
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (!block.includes('data:')) continue;
          const id = block.match(/^id: (.*)$/m)?.[1] ?? null;
          const data = JSON.parse(block.match(/^data: (.*)$/m)[1]);
          const frame = { id, data };
          frames.push(frame);
          waiters.splice(0).forEach((waiter) => waiter());
        }
      });
      resolve({
        frames,
        response,
        async waitFor(count, timeoutMs = 3000) {
          const deadline = Date.now() + timeoutMs;
          while (frames.length < count) {
            if (Date.now() > deadline) throw new Error(`expected ${count} frames, got ${frames.length}`);
            await new Promise((next) => {
              waiters.push(next);
              setTimeout(next, 50);
            });
          }
          return frames.slice(0, count);
        },
        close: () => request.destroy(),
      });
    });
    request.on('error', reject);
  });
}

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
    await writeFile(join(sourceHome, '.env'), 'GEMINI_API_KEY=test-key\n');
    const geminiDir = await prepareGeminiHome({ runtimeRoot, sourceHome });
    assert.equal(await readFile(join(geminiDir, '.env'), 'utf8'), 'GEMINI_API_KEY=test-key\n');
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

test('Gemini temp-home cleanup is best-effort and never throws', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-gemini-cleanup-'));
  await mkdir(join(root, '.gemini'), { recursive: true });
  await writeFile(join(root, '.gemini', 'installation_id'), 'x');
  assert.equal(await cleanupRuntimeRoot(root), true);
  assert.equal(await cleanupRuntimeRoot(root), true, 'a missing directory is fine');
  assert.equal(await cleanupRuntimeRoot(join(root, 'never-existed'), { attempts: 1 }), true);
});

test('a timeout error carries the agent\'s last output line', async () => {
  await assert.rejects(runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'console.error("Attempt 3 failed with status 503. Retrying with backoff…"); setTimeout(() => {}, 60000)'],
    cwd: process.cwd(),
    timeoutMs: 500,
    killGraceMs: 100,
    label: 'Gemini',
    parse: () => ({ text: '' }),
  }), /Gemini did not respond before the timeout \(1s\)\. Last output: Attempt 3 failed with status 503/);
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
  assert.deepEqual(buildOpenCodeArgs({ projectRoot: '/project', prompt: 'hello', model: 'openai/gpt-5.6-sol' }).slice(6, 8), ['--model', 'openai/gpt-5.6-sol']);
  const args = buildOpenCodeArgs({ projectRoot: '/project', prompt: 'hello', model: undefined });
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
  const failure = JSON.stringify({ type: 'error', error: { name: 'APIError', data: { message: 'invalid x-api-key', statusCode: 401 } } });
  assert.deepEqual(parseOpenCodeOutput(failure), { text: '', usage: null, error: 'APIError: invalid x-api-key' });
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
    assert.match(html, /id="onboarding"/);
    assert.match(html, /id="connection"/);
    const brands = await fetch(`http://127.0.0.1:${port}/brands.js`);
    assert.equal(brands.status, 200);
    assert.match(await brands.text(), /export const BRANDS/);
    const troubleshooting = await fetch(`http://127.0.0.1:${port}/troubleshooting.js`);
    assert.equal(troubleshooting.status, 200);
    assert.match(await troubleshooting.text(), /export const CONDITIONS/);
    assert.match(html, /id="mother"/);
    assert.match(html, /id="modules"/);
    const state = await fetch(`http://127.0.0.1:${port}/api/state`).then((result) => result.json());
    assert.equal(state.softTokenBudget, 500000);
    assert.deepEqual(state.timeouts, { codex: 180000 });
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
      kind: 'automatic',
      planId: null,
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

test('truncates failure messages to one bounded line', async () => {
  assert.equal(failureMessage(new Error('\n  Error: first useful line\n    at stack frame')), 'Error: first useful line');
  assert.equal(failureMessage('plain text'), 'plain text');
  assert.equal(failureMessage(undefined), 'Unknown error');
  assert.equal(failureMessage(new Error('   \n\n')), 'Unknown error');
  const long = failureMessage(new Error('x'.repeat(2000)));
  assert.equal(long.length, 500);
  assert.ok(long.endsWith('…'));

  const root = await mkdtemp(join(tmpdir(), 'pulse-failure-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake', version: 'test' }];
    const room = new Room({
      store,
      agents,
      projectRoot: root,
      invokers: { 'gemini-readonly': async () => { throw new Error(`Error authenticating: boom\n${'    at frame\n'.repeat(200)}`); } },
    });
    await room.send({ text: 'hello', target: 'gemini' });
    const failed = (await store.readAll()).find((event) => event.type === 'message.failed');
    assert.equal(failed.payload.error, 'Error authenticating: boom');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('streams events appended by another store instance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-sse-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, broadcastIntervalMs: 50 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  let stream;
  try {
    stream = await openEventStream(`http://127.0.0.1:${port}/api/events`);
    // The server canonicalizes the project root, so the shared room path must too.
    const roomFile = join(root, 'rooms', projectRoomId(await realpath(root)), 'events.jsonl');
    const external = await new EventStore(roomFile).initialize();
    const started = Date.now();
    const appended = await external.append('handoff.created', { fromAgent: 'other-ide', toAgent: 'codex' });
    const [frame] = await stream.waitFor(1);
    assert.ok(Date.now() - started < 1000);
    assert.equal(frame.id, String(appended.sequence));
    assert.equal(frame.data.id, appended.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(stream.frames.length, 1, 'external event must be delivered exactly once');
    assert.equal((await store.readAll()).at(-1).id, appended.id);
  } finally {
    stream?.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('replays since a sequence and closes cleanly with open streams', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-since-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, broadcastIntervalMs: 50 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  let stream;
  let closed = 'pending';
  try {
    await store.append('message.created', { messageId: 'a', role: 'user', sender: 'you', target: 'codex', text: 'one', status: 'sent' });
    await store.append('message.created', { messageId: 'b', role: 'user', sender: 'you', target: 'codex', text: 'two', status: 'sent' });
    await store.append('message.created', { messageId: 'c', role: 'user', sender: 'you', target: 'codex', text: 'three', status: 'sent' });
    await new Promise((resolve) => setTimeout(resolve, 150));

    stream = await openEventStream(`http://127.0.0.1:${port}/api/events?since=1`);
    const replayed = await stream.waitFor(2);
    assert.deepEqual(replayed.map((frame) => frame.data.sequence), [2, 3]);

    // Mixed local emit and external append keep ascending, unique sequences.
    const external = await new EventStore(join(root, 'rooms', projectRoomId(await realpath(root)), 'events.jsonl')).initialize();
    await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello', target: 'codex' }),
    });
    await external.append('quota.updated', { agent: 'codex', usedPercent: 10, source: 'test' });
    const all = await stream.waitFor(5);
    const sequences = all.map((frame) => frame.data.sequence);
    assert.deepEqual(sequences, [...new Set(sequences)]);
    assert.deepEqual(sequences, [...sequences].sort((a, b) => a - b));
    assert.equal(sequences.at(-1), 6);
  } finally {
    closed = await Promise.race([
      new Promise((resolve) => server.close(() => resolve('closed'))),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
    ]);
    stream?.close();
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(closed, 'closed', 'server.close() must resolve while an SSE client is connected');
});

test('warns one turn early when the projected usage would cross a threshold', async () => {
  const sentinel = new UsageSentinel();
  assert.equal(sentinel.evaluate({ agent: 'claude', usedPercent: 40, projectedPercent: 70, source: 'room-soft-budget' }), null);
  const early = sentinel.evaluate({ agent: 'claude', usedPercent: 68, projectedPercent: 111, source: 'room-soft-budget' });
  assert.equal(early.level, 'exhausted');
  assert.equal(early.usedPercent, 68);
  assert.equal(early.projectedPercent, 111);
  assert.match(early.message, /has used 68% .* another turn like the last one would reach 111%/);
  // Reaching the level for real afterwards does not repeat the alarm.
  assert.equal(sentinel.evaluate({ agent: 'claude', usedPercent: 100, projectedPercent: 140, source: 'room-soft-budget' }), null);
  // Without a projection the message keeps its original shape.
  assert.match(new UsageSentinel().evaluate({ agent: 'codex', usedPercent: 85, source: 'test' }).message, /has used 85% of its .*\. Prepare/);

  const root = await mkdtemp(join(tmpdir(), 'pulse-projection-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [
      { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' },
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' },
    ];
    const room = new Room({
      store,
      agents,
      projectRoot: root,
      softTokenBudget: 1000,
      invokers: { 'claude-readonly': async () => ({ text: 'ok', usage: { totalTokens: 450 } }) },
    });
    await room.send({ text: 'first', target: 'claude' });
    assert.equal((await store.readAll()).filter((event) => event.type === 'limit.warning').length, 1, '45% used, 90% projected → critical warning');
    const warning = (await store.readAll()).find((event) => event.type === 'limit.warning').payload;
    assert.equal(warning.level, 'critical');
    assert.equal(warning.usedPercent, 45);
    assert.deepEqual(warning.alternatives, ['codex']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('tails only the bytes appended since the last offset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-tail-'));
  try {
    const file = join(root, 'events.jsonl');
    const store = await new EventStore(file).initialize();
    assert.deepEqual(await store.tail(0), { events: [], offset: 0 });
    await store.append('message.created', { text: 'uno con acento ñ' });
    await store.append('message.created', { text: 'dos' });
    const first = await store.tail(0);
    assert.deepEqual(first.events.map((event) => event.sequence), [1, 2]);
    assert.ok(first.offset > 0);
    assert.deepEqual(await store.tail(first.offset), { events: [], offset: first.offset });

    const other = await new EventStore(file).initialize();
    const appended = await other.append('handoff.created', { fromAgent: 'a', toAgent: 'b' });
    const second = await store.tail(first.offset);
    assert.deepEqual(second.events.map((event) => event.id), [appended.id]);
    assert.equal(second.offset, (await readFile(file)).length);

    // A shrunken file restarts from the beginning instead of reading garbage.
    await writeFile(file, '');
    assert.deepEqual(await store.tail(second.offset), { events: [], offset: 0 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('drops SSE clients that stop draining instead of buffering without bound', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-backpressure-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  const { server, store } = await createPulseServer({
    projectRoot: root,
    stateRoot: root,
    agents,
    broadcastIntervalMs: 50,
    sseMaxBufferedBytes: 1,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  let stream;
  try {
    stream = await openEventStream(`http://127.0.0.1:${port}/api/events`);
    const ended = new Promise((resolve) => stream.response.on('close', () => resolve('closed')));
    await store.append('message.created', { text: 'x'.repeat(4096) });
    const outcome = await Promise.race([ended, new Promise((resolve) => setTimeout(() => resolve('still open'), 2000))]);
    assert.equal(outcome, 'closed', 'a client over the buffer limit must be disconnected');
    // The room itself keeps working for everyone else.
    assert.equal((await store.readAll()).length, 1);
  } finally {
    stream?.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('prints help without starting a server', async () => {
  for (const flag of ['--help', '-h', 'help']) {
    const { stdout } = await execFileAsync(process.execPath, [join(process.cwd(), 'bin', 'pulse.mjs'), flag], { timeout: 5000 });
    assert.match(stdout, /pulse start \[--project PATH\]/);
  }
});

test('reads agent timeouts from the environment and passes them to adapters', async () => {
  assert.deepEqual(agentTimeoutsFromEnv({}), {});
  assert.deepEqual(agentTimeoutsFromEnv({ PULSE_AGENT_TIMEOUT_MS: '30000', PULSE_CLAUDE_TIMEOUT_MS: '240000', PULSE_GEMINI_TIMEOUT_MS: 'nope' }), {
    default: 30000,
    claude: 240000,
  });

  const root = await mkdtemp(join(tmpdir(), 'pulse-timeouts-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [
      { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' },
      { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' },
    ];
    const seen = {};
    const invoker = (id) => async ({ timeoutMs, signal }) => {
      seen[id] = { timeoutMs, hasSignal: signal instanceof AbortSignal };
      return { text: 'ok', usage: null };
    };
    const room = new Room({
      store,
      agents,
      projectRoot: root,
      agentTimeouts: { default: 30000, claude: 240000 },
      invokers: { 'claude-readonly': invoker('claude'), 'codex-readonly': invoker('codex') },
    });
    assert.equal(room.timeoutFor('claude'), 240000);
    assert.equal(room.timeoutFor('codex'), 30000);
    assert.equal(new Room({ store, agents, projectRoot: root, invokers: {} }).timeoutFor('codex'), 180000);
    await room.send({ text: 'a', target: 'claude' });
    await room.send({ text: 'b', target: 'codex' });
    assert.deepEqual(seen, { claude: { timeoutMs: 240000, hasSignal: true }, codex: { timeoutMs: 30000, hasSignal: true } });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects oversized messages before invoking the agent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-toolong-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
    let invoked = 0;
    const room = new Room({
      store,
      agents,
      projectRoot: root,
      maxMessageChars: 50,
      invokers: { 'codex-readonly': async () => { invoked += 1; return { text: 'ok', usage: null }; } },
    });
    await room.send({ text: 'x'.repeat(51), target: 'codex' });
    assert.equal(invoked, 0);
    const events = await store.readAll();
    assert.deepEqual(events.map((event) => event.type), ['message.created', 'message.failed']);
    assert.match(events[1].payload.error, /too long \(51 characters\); the limit is 50/);
    await room.send({ text: 'x'.repeat(50), target: 'codex' });
    assert.equal(invoked, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recovers turns left open by a previous process', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-recover-'));
  try {
    const file = join(root, 'events.jsonl');
    const crashed = await new EventStore(file).initialize();
    await crashed.append('message.created', { messageId: 'm1', role: 'user', sender: 'you', target: 'codex', text: 'hi', status: 'sent' });
    await crashed.append('agent.started', { messageId: 'm1', agent: 'codex', handoffId: null });
    await crashed.append('message.created', { messageId: 'm2', role: 'user', sender: 'you', target: 'codex', text: 'again', status: 'sent' });
    await crashed.append('agent.started', { messageId: 'm2', agent: 'codex', handoffId: null });
    await crashed.append('agent.completed', { messageId: 'm2', agent: 'codex', handoffId: null });

    const store = await new EventStore(file).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
    const room = new Room({ store, agents, projectRoot: root, historicalEvents: await store.readAll(), invokers: {} });
    assert.equal(await room.reconcile(), 1);
    const failed = (await store.readAll()).filter((event) => event.type === 'message.failed');
    assert.equal(failed.length, 1);
    assert.equal(failed[0].payload.messageId, 'm1');
    assert.equal(failed[0].payload.recovered, true);
    assert.match(failed[0].payload.error, /PULSE stopped while @codex was answering/);
    // Idempotent: a second start finds nothing open.
    assert.equal(await room.reconcile(), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('shutdown interrupts in-flight turns and records them as failed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-shutdown-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
    const room = new Room({
      store,
      agents,
      projectRoot: root,
      invokers: {
        'codex-readonly': ({ signal }) => new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Codex was interrupted because PULSE is shutting down.')), { once: true });
        }),
      },
    });
    const turn = room.send({ text: 'slow question', target: 'codex' });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if ((await store.readAll()).some((event) => event.type === 'agent.started')) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await room.shutdown();
    await turn;
    const events = await store.readAll();
    assert.deepEqual(events.map((event) => event.type), ['message.created', 'agent.started', 'message.failed']);
    assert.match(events.at(-1).payload.error, /interrupted because PULSE is shutting down/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('aborting the signal terminates the adapter process tree', async () => {
  const controller = new AbortController();
  const started = Date.now();
  const pending = runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 60000)'],
    cwd: process.cwd(),
    timeoutMs: 60000,
    killGraceMs: 200,
    label: 'Fixture',
    parse: () => ({ text: '' }),
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(pending, /Fixture was interrupted because PULSE is shutting down/);
  assert.ok(Date.now() - started < 3000);
  await assert.rejects(runReadonlyProcess({
    executable: process.execPath, args: ['-e', ''], cwd: process.cwd(), label: 'Fixture', parse: () => ({ text: '' }), signal: controller.signal,
  }), /interrupted before it started/);
});

test('reads each agent session state from its CLI output', () => {
  assert.deepEqual(parseCodexLoginStatus({ stdout: 'Logged in using ChatGPT\n', code: 0 }), { state: 'signed-in', detail: 'via ChatGPT' });
  assert.equal(parseCodexLoginStatus({ stdout: 'Not logged in\n', code: 1 }).state, 'signed-out');
  assert.equal(parseCodexLoginStatus({ stderr: 'boom', code: 1 }).state, 'unknown');
  assert.deepEqual(parseClaudeAuthStatus({ stdout: JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' }) }), { state: 'signed-in', detail: 'via claude.ai' });
  assert.equal(parseClaudeAuthStatus({ stdout: JSON.stringify({ loggedIn: false }) }).state, 'signed-out');
  assert.equal(parseClaudeAuthStatus({ stdout: 'not json' }).state, 'unknown');
  const list = parseOpenCodeAuthList({ stdout: '\u001b[0m\n┌  Credentials \u001b[90m~/.local/share/opencode/auth.json\n│\n●  OpenAI \u001b[90moauth\n│\n●  Anthropic \u001b[90mapi\n' });
  assert.equal(list.state, 'signed-in');
  assert.deepEqual(list.providers, [{ name: 'OpenAI', type: 'oauth' }, { name: 'Anthropic', type: 'api' }]);
  assert.equal(parseOpenCodeAuthList({ stdout: '┌  Credentials\n└  none\n' }).state, 'signed-out');
  assert.equal(geminiAuthState({ settings: { security: { auth: { selectedType: 'gemini-api-key' } } }, hasOauth: false, hasApiKey: true }).state, 'signed-in');
  assert.equal(geminiAuthState({ settings: { security: { auth: { selectedType: 'gemini-api-key' } } }, hasOauth: false, hasApiKey: false }).state, 'signed-out');
  assert.equal(geminiAuthState({ settings: { security: { auth: { selectedType: 'oauth-personal' } } }, hasOauth: true, hasApiKey: false }).state, 'signed-in');
  assert.equal(geminiAuthState({ settings: null, hasOauth: false, hasApiKey: false }).state, 'signed-out');
  assert.equal(geminiAuthState({ settings: null, hasOauth: true, hasApiKey: false }).state, 'unknown');
});

test('persists preferences in config.json and lets the environment win', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-config-'));
  try {
    assert.deepEqual(await loadConfig(root), {});
    await updateConfig(root, { opencode: { model: 'openai/gpt-5.6-sol' }, timeouts: { default: 300000 } });
    await updateConfig(root, { timeouts: { claude: 600000 } });
    const config = await loadConfig(root);
    assert.deepEqual(config, { opencode: { model: 'openai/gpt-5.6-sol' }, timeouts: { default: 300000, claude: 600000 } });
    const env = { PULSE_AGENT_TIMEOUT_MS: '120000' };
    const applied = applyConfigToEnv(config, env);
    assert.deepEqual(applied, { PULSE_OPENCODE_MODEL: 'openai/gpt-5.6-sol', PULSE_CLAUDE_TIMEOUT_MS: '600000' });
    assert.equal(env.PULSE_AGENT_TIMEOUT_MS, '120000', 'exported variables are never overridden');
    await writeFile(join(root, 'config.json'), '{not json');
    assert.deepEqual(await loadConfig(root), {});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renders the setup report and decides who is online', () => {
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: 'codex-cli 0.153.4' },
    { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '2.1.267' },
    { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '0.60.0' },
    { id: 'opencode', label: 'OpenCode', detected: false, ready: false, adapter: 'opencode-readonly', path: null, version: null },
  ];
  const probes = {
    codex: { state: 'signed-in', detail: 'via ChatGPT' },
    claude: { state: 'signed-out', detail: 'not logged in' },
    gemini: { state: 'unknown', detail: 'credentials present, auth type not selected' },
    opencode: { state: 'not-installed', detail: 'not found on this computer' },
  };
  assert.equal(isOnline(agents[0], probes.codex), true);
  assert.equal(isOnline(agents[1], probes.claude), false);
  assert.equal(isOnline(agents[3], probes.opencode), false);
  const report = renderReport({ agents, probes, projectRoot: '/tmp/demo', config: {}, palette: makePalette({ colors: false }) });
  assert.match(report, /INTERFACE · SETUP/);
  assert.match(report, /◉ CODEX\s+OpenAI\s+READY\s+SESSION OK\s+via ChatGPT · codex-cli 0\.153\.4/);
  assert.match(report, /◌ CLAUDE\s+Anthropic\s+READY\s+NO SESSION/);
  assert.match(report, /◌ GEMINI\s+Google\s+READY\s+SESSION \?/);
  assert.match(report, /○ OPENCODE\s+OpenCode\s+NOT FOUND/);
  assert.match(report, /MOTHER › 1 OF 4 AGENTS ONLINE\. ROOM CAN OPEN\./);
  assert.doesNotMatch(report, /\u001b\[/, 'no ANSI codes when colors are off');
  const colored = renderReport({ agents, probes, projectRoot: '/tmp/demo', palette: makePalette({ colors: true, depth: 24 }) });
  assert.match(colored, /\u001b\[38;2;16;163;127m/, 'Codex row uses the OpenAI palette');
});

test('MU/TH/UR matches recorded failures to known conditions with per-OS fixes', () => {
  const ids = (text, agent) => diagnose(text, agent).map((condition) => condition.id);
  assert.deepEqual(ids('Error authenticating: IneligibleTierError: This client is no longer supported for Gemini Code Assist', 'gemini'), ['gemini-ineligible-tier', 'not-signed-in']);
  assert.deepEqual(ids('APIError: invalid x-api-key', 'opencode'), ['opencode-default-provider']);
  assert.deepEqual(ids('APIError: invalid x-api-key', 'claude'), [], 'agent-specific conditions never match another agent');
  assert.deepEqual(ids('Error: Invalid MCP configuration: ENAMETOOLONG', 'claude'), ['claude-args']);
  assert.deepEqual(ids('Codex did not respond before the timeout.', 'codex'), ['timeout']);
  assert.deepEqual(ids('Codex was interrupted because PULSE is shutting down.', 'codex'), ['interrupted']);
  assert.deepEqual(ids('gemini is not installed on this computer.', 'gemini'), ['not-installed']);
  assert.deepEqual(ids('listen EADDRINUSE: address already in use 127.0.0.1:4317'), ['port-in-use']);
  assert.deepEqual(ids('everything is fine'), []);
  for (const condition of CONDITIONS) {
    for (const platform of ['darwin', 'linux', 'win32']) {
      assert.ok(fixesFor(condition, platform).length > 0, `${condition.id} has a ${platform} remedy`);
    }
  }
  assert.deepEqual(fixesFor(CONDITIONS.find((c) => c.id === 'not-installed'), 'win32', 'gemini'), ['npm install -g @google/gemini-cli']);
  assert.match(fixesFor(CONDITIONS.find((c) => c.id === 'port-in-use'), 'linux').join('\n'), /ss -ltnp/);
  assert.match(fixesFor(CONDITIONS.find((c) => c.id === 'port-in-use'), 'win32').join('\n'), /netstat -ano/);
  assert.equal(detectPlatform({ platform: 'MacIntel' }), 'darwin');
  assert.equal(detectPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }), 'win32');
  assert.equal(detectPlatform({ platform: 'Linux x86_64' }), 'linux');
  assert.ok(searchConditions('gemini').every((c) => /gemini/i.test(`${c.id} ${c.title} ${c.diagnosis} ${c.agent}`)));
  assert.equal(searchConditions('').length, CONDITIONS.length);
});

test('modules: AHP+ is detected, planned for detected agents only, and installed after confirmation', async () => {
  const ahp = extensionById('ahp');
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' },
    { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' },
    { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' },
    { id: 'opencode', label: 'OpenCode', detected: false, ready: false, adapter: 'opencode-readonly', path: null, version: null },
  ];
  const plan = ahp.installCommand({ agents });
  assert.deepEqual(plan.platforms, ['codex', 'claude'], 'gemini has no AHP+ adapter; opencode is not detected');
  assert.equal(plan.display, 'npx --yes @jossuealcala/ahp-plus@1.4.1 setup . --platforms codex,claude');
  assert.deepEqual(ahp.installCommand({ agents: [] }).args, ['--yes', '@jossuealcala/ahp-plus@1.4.1', 'setup', '.']);
  assert.equal(EXTENSIONS.length, 1);

  const root = await mkdtemp(join(tmpdir(), 'pulse-modules-'));
  const project = join(root, 'project');
  await mkdir(project);
  try {
    assert.deepEqual(await ahp.detect(project), { installed: false });
    const listed = await listExtensions({ projectRoot: project, agents });
    assert.equal(listed[0].status.installed, false);
    assert.equal(listed[0].install.display, plan.display);

    // A stand-in installer that behaves like `ahp setup .`: prints progress and creates .ahp/.
    const fakeInstaller = () => ({
      command: process.execPath,
      args: ['-e', `
        const fs = require('node:fs');
        console.log('AHP+ setup: pinning package');
        fs.mkdirSync('.ahp', { recursive: true });
        fs.writeFileSync('.ahp/manifest.json', JSON.stringify({ protocol_version: '1.4.0', project_id: 'demo' }));
        fs.mkdirSync('node_modules/@jossuealcala/ahp-plus', { recursive: true });
        fs.writeFileSync('node_modules/@jossuealcala/ahp-plus/package.json', JSON.stringify({ version: '1.4.1' }));
        console.error('warning: sample stderr line');
        console.log('AHP+ setup: done');
      `],
      display: 'node fake-ahp-setup',
      platforms: ['codex', 'claude'],
    });
    const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents, broadcastIntervalMs: 50, installers: { ahp: fakeInstaller } });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const listing = await fetch(`http://127.0.0.1:${port}/api/extensions`).then((response) => response.json());
      assert.equal(listing.extensions[0].id, 'ahp');
      assert.equal(listing.extensions[0].status.installed, false);

      const refused = await fetch(`http://127.0.0.1:${port}/api/extensions/ahp/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(refused.status, 400, 'no confirm, no write');
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/extensions/nope/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' })).status, 404);

      const accepted = await fetch(`http://127.0.0.1:${port}/api/extensions/ahp/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' });
      assert.equal(accepted.status, 202);
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if ((await store.readAll()).some((event) => event.type === 'extension.install.finished')) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const events = await store.readAll();
      const started = events.find((event) => event.type === 'extension.install.started');
      const finished = events.find((event) => event.type === 'extension.install.finished');
      assert.equal(started.payload.command, 'node fake-ahp-setup');
      assert.deepEqual(started.payload.platforms, ['codex', 'claude']);
      assert.equal(finished.payload.ok, true);
      assert.equal(finished.payload.status.version, '1.4.1');
      assert.equal(finished.payload.status.protocolVersion, '1.4.0');
      const output = events.filter((event) => event.type === 'extension.install.output').flatMap((event) => event.payload.lines);
      assert.ok(output.includes('AHP+ setup: pinning package') && output.includes('AHP+ setup: done') && output.includes('warning: sample stderr line'));
      assert.deepEqual(await ahp.detect(project), { installed: true, version: '1.4.1', protocolVersion: '1.4.0', projectId: 'demo', detail: 'cli 1.4.1 · protocol 1.4.0' });
      const after = await fetch(`http://127.0.0.1:${port}/api/extensions`).then((response) => response.json());
      assert.equal(after.extensions[0].status.installed, true);
      assert.equal(after.installing, null);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('room.record only accepts namespaced, non-reserved event types', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-record-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents: [], projectRoot: root, invokers: {} });
    const event = await room.record('extension.install.started', { id: 'x' });
    assert.equal(event.type, 'extension.install.started');
    await assert.rejects(room.record('message.created', {}), /reserved/);
    await assert.rejects(room.record('agent.started', {}), /reserved/);
    await assert.rejects(room.record('nodots', {}), /reserved or malformed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parses CLI options in both spellings and knows which were explicit', () => {
  const spaced = parseArgs(['start', '--project', '/p', '--port', '4320', '--no-open']);
  assert.equal(spaced.command, 'start');
  assert.equal(spaced.option('project'), '/p');
  assert.equal(spaced.option('port'), '4320');
  assert.equal(spaced.has('no-open'), true);
  assert.equal(spaced.explicit('port'), true);
  const equals = parseArgs(['--project=/q', '--port=4321']);
  assert.equal(equals.command, 'start', 'a leading option implies start');
  assert.equal(equals.option('project'), '/q');
  assert.equal(equals.option('port'), '4321');
  const bare = parseArgs(['doctor', '--json']);
  assert.equal(bare.command, 'doctor');
  assert.equal(bare.has('json'), true);
  assert.equal(bare.explicit('port'), false);
  assert.equal(bare.option('port', '4317'), '4317');
  assert.equal(parseArgs(['--help']).command, 'help');
  assert.equal(parseArgs([]).command, 'start');
});

test('start without --port walks past a busy port; with --port it refuses', async () => {
  const busy = http.createServer();
  await new Promise((resolve) => busy.listen(0, '127.0.0.1', resolve));
  const { port } = busy.address();
  const root = await mkdtemp(join(tmpdir(), 'pulse-port-'));
  try {
    const run = (extra) => new Promise((resolve) => {
      const child = spawnCli(['start', '--no-open', '--no-setup', '--project', root, ...extra], root);
      let out = '';
      child.stdout.on('data', (chunk) => { out += chunk; });
      child.stderr.on('data', (chunk) => { out += chunk; });
      const timer = setTimeout(() => child.kill('SIGTERM'), 8000);
      const poll = setInterval(() => { if (/PULSE is ready/.test(out)) { clearInterval(poll); clearTimeout(timer); child.kill('SIGTERM'); } }, 100);
      child.on('close', (code) => { clearInterval(poll); clearTimeout(timer); resolve({ code, out }); });
    });
    const fallback = await run(['--port', String(port), '--auto']); // explicit port → refuse
    assert.equal(fallback.code, 2);
    assert.match(fallback.out, new RegExp(`port ${port} is already in use`));
    const walked = await run([]);
    // default 4317 may or may not be busy on this machine; either way the room must come up
    assert.match(walked.out, /PULSE is ready/);
  } finally {
    await new Promise((resolve) => busy.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('modules: AHP+ preflight refuses when the git root is not the project or npx is missing', async () => {
  const ahp = extensionById('ahp');
  const root = await mkdtemp(join(tmpdir(), 'pulse-preflight-'));
  const project = join(root, 'project');
  await mkdir(project);
  const real = await realpath(project);
  try {
    // Not a git repository at all.
    const noGit = await ahp.preflight(project, { toplevel: async () => null, npx: async () => '/usr/bin/npx' });
    assert.equal(noGit.ok, false);
    assert.match(noGit.problems[0], /not a git repository/);
    // Git root is a parent (the home-directory-was-git-inited case).
    const parent = await ahp.preflight(project, { toplevel: async () => await realpath(root), npx: async () => '/usr/bin/npx' });
    assert.equal(parent.ok, false);
    assert.match(parent.problems[0], /git root is .* not the project itself/);
    // Own git root, npx present.
    const fine = await ahp.preflight(project, { toplevel: async () => real, npx: async () => '/usr/bin/npx' });
    assert.deepEqual(fine, { ok: true, problems: [], gitRoot: real });
    // npx missing.
    const noNpx = await ahp.preflight(project, { toplevel: async () => real, npx: async () => null });
    assert.match(noNpx.problems[0], /npx is not on PATH/);
    // Real git: the temp dir is not a repo, so gitToplevel is null (unless a parent is one).
    const top = await gitToplevel(project);
    assert.ok(top === null || top !== real);

    // The server refuses before writing and records why.
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents, broadcastIntervalMs: 50 });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const listing = await fetch(`http://127.0.0.1:${port}/api/extensions`).then((response) => response.json());
      assert.equal(listing.extensions[0].preflight.ok, false);
      const refused = await fetch(`http://127.0.0.1:${port}/api/extensions/ahp/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' });
      assert.equal(refused.status, 412);
      const body = await refused.json();
      assert.ok(body.problems.length >= 1);
      const events = await store.readAll();
      assert.equal(events.at(-1).type, 'extension.install.refused');
      assert.equal(events.some((event) => event.type === 'extension.install.started'), false, 'nothing was started');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the CLI refuses a project folder that does not exist', async () => {
  const child = spawnCli(['doctor', '--project', '/definitely/not/here'], process.cwd());
  let out = '';
  child.stderr.on('data', (chunk) => { out += chunk; });
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.equal(code, 2);
  assert.match(out, /project folder not found: \/definitely\/not\/here/);
});

test('a missing project folder is named in the adapter error, not hidden behind ENOENT', async () => {
  await assert.rejects(runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', ''],
    cwd: '/definitely/not/here',
    label: 'Codex',
    parse: () => ({ text: '' }),
  }), /Codex could not start: .*ENOENT.*project folder \/definitely\/not\/here exists/);
});

test('failed turns appear in the conversation context so an orchestrator knows why a step is missing', () => {
  const events = [
    { sequence: 1, type: 'message.created', payload: { messageId: 'a', role: 'user', sender: 'you', target: 'gemini', text: 'q' } },
    { sequence: 2, type: 'message.failed', payload: { messageId: 'a', target: 'gemini', error: 'Gemini did not respond before the timeout (300s).' } },
    { sequence: 3, type: 'message.created', payload: { messageId: 'b', role: 'assistant', sender: 'codex', target: 'you', text: 'answer' } },
  ];
  const context = buildConversationContext(events);
  assert.deepEqual(context.messages.map((message) => `${message.sender} (${message.role})`), ['you (user)', 'gemini (failed)', 'codex (assistant)']);
  assert.equal(context.previousAgent, 'codex', 'failures never count as the previous answering agent');
  assert.match(formatConversationContext(context), /gemini \(failed\): Gemini did not respond before the timeout/);
});

test('parses delegation directives from an agent reply', () => {
  const text = `Here is my take.\n\n\`\`\`pulse\n@gemini: Synthesize in one paragraph.\n- @codex: Same, name the weakest claim.\n@claude: Compare both.\n@gemini: duplicate\n@opencode: not here\nnot a step\n\`\`\``;
  const parsed = parseDirectives(text, { self: 'claude', available: ['gemini', 'codex'], maxSteps: 4 });
  assert.deepEqual(parsed.steps, [{ agent: 'gemini', text: 'Synthesize in one paragraph.' }, { agent: 'codex', text: 'Same, name the weakest claim.' }]);
  assert.equal(parsed.closing, 'Compare both.');
  assert.deepEqual(parsed.ignored.map((item) => item.reason), [
    '@gemini already has a step',
    '@opencode is not available in this room',
    'not a step (expected "@agent: text")',
  ]);
  assert.deepEqual(parseDirectives('no plan here', { self: 'claude', available: ['gemini'] }), { steps: [], closing: null, ignored: [] });
  // A quoted example followed by prose is not a plan; only a closing block runs.
  const quoted = parseDirectives('For example:\n```pulse\n@gemini: example\n```\nBut I will not delegate now.', { self: 'claude', available: ['gemini'] });
  assert.deepEqual(quoted.steps, []);
  assert.match(quoted.ignored[0].reason, /must be the last thing/);
  const twoBlocks = parseDirectives('Example:\n```pulse\n@codex: ignored example\n```\nReal plan:\n```pulse\n@gemini: real\n```\n', { self: 'claude', available: ['gemini', 'codex'] });
  assert.deepEqual(twoBlocks.steps, [{ agent: 'gemini', text: 'real' }], 'only the last block counts');
  const capped = parseDirectives('```pulse\n@a: 1\n@b: 2\n@c: 3\n```', { self: 'x', available: ['a', 'b', 'c'], maxSteps: 2 });
  assert.equal(capped.steps.length, 2);
  assert.match(capped.ignored[0].reason, /capped at 2/);
  assert.equal(stripDirectives(text), 'Here is my take.');
});

test('an orchestrating agent puts the others to work in order, then closes; delegates cannot delegate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-plan-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['claude', 'gemini', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const prompts = [];
    const invokers = {
      'claude-readonly': async ({ prompt }) => {
        prompts.push({ agent: 'claude', prompt });
        if (/this is your closing turn/.test(prompt)) return { text: 'Closing: Gemini and Codex agree on the facts.', usage: { totalTokens: 10 } };
        return { text: 'Order: Gemini, then Codex.\n\n```pulse\n@gemini: Synthesize the author in one paragraph.\n@codex: Same; name the weakest claim.\n@claude: Compare both syntheses.\n```', usage: { totalTokens: 10 } };
      },
      'gemini-readonly': async ({ prompt }) => {
        prompts.push({ agent: 'gemini', prompt });
        // A delegate trying to delegate further is ignored.
        return { text: 'Gemini synthesis.\n\n```pulse\n@codex: do more\n```', usage: { totalTokens: 5 } };
      },
      'codex-readonly': async ({ prompt }) => { prompts.push({ agent: 'codex', prompt }); return { text: 'Codex synthesis; weakest claim is X.', usage: { totalTokens: 5 } }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers, maxPlanSteps: 4 });
    await room.send({ text: 'coordinate the others and synthesize', target: 'claude' });

    const events = await store.readAll();
    const types = events.map((event) => `${event.type}${event.payload.status ? `:${event.payload.status}` : ''}${event.payload.sender ? `:${event.payload.sender}→${event.payload.target}` : event.payload.agent ? `:${event.payload.agent}` : ''}`);
    assert.deepEqual(types.filter((type) => !type.startsWith('usage.') && !type.startsWith('handoff.')), [
      'message.created:sent:you→claude',
      'agent.started:claude',
      'message.created:completed:claude→you',
      'agent.completed:claude',
      'plan.created',
      'message.created:delegated:claude→gemini',
      'agent.started:gemini',
      'message.created:completed:gemini→claude',
      'agent.completed:gemini',
      'message.created:delegated:claude→codex',
      'agent.started:codex',
      'message.created:completed:codex→claude',
      'agent.completed:codex',
      'message.created:delegated:claude→claude',
      'agent.started:claude',
      'message.created:completed:claude→claude',
      'agent.completed:claude',
      'plan.completed',
    ]);
    const plan = events.find((event) => event.type === 'plan.created').payload;
    assert.deepEqual(plan.steps.map((step) => step.agent), ['gemini', 'codex']);
    assert.equal(plan.closing, 'Compare both syntheses.');
    assert.equal(events.filter((event) => event.type === 'plan.created').length, 1, "gemini's nested plan was not executed");
    assert.match(prompts.find((item) => item.agent === 'gemini').prompt, /@claude is coordinating on behalf of the human and asks you: Synthesize/);
    assert.doesNotMatch(prompts.find((item) => item.agent === 'gemini').prompt, /You may put other agents to work/, 'delegates are not offered delegation');
    assert.match(prompts[0].prompt, /You may put other agents to work: @gemini, @codex/);
    assert.match(prompts.at(-1).prompt, /this is your closing turn/);
    const orchestratorReply = events.find((event) => event.payload.delegates);
    assert.deepEqual(orchestratorReply.payload.delegates, ['gemini', 'codex']);
    const handoffs = events.filter((event) => event.type === 'handoff.created');
    assert.ok(handoffs.some((event) => event.payload.kind === 'delegated'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the human can stop a running plan and delegation can be disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-plan-stop-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['claude', 'gemini', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    let room;
    const invokers = {
      'claude-readonly': async () => ({ text: '```pulse\n@gemini: slow question\n@codex: never reached\n@claude: close\n```', usage: null }),
      'gemini-readonly': ({ signal }) => new Promise((_, reject) => {
        // Stop the plan while Gemini is still working.
        setTimeout(() => { const [plan] = room.activePlans(); room.stopPlan(plan.planId); }, 20);
        signal.addEventListener('abort', () => reject(new Error('Gemini was interrupted because PULSE is shutting down.')), { once: true });
      }),
      'codex-readonly': async () => { throw new Error('codex must not run'); },
    };
    room = new Room({ store, agents, projectRoot: root, invokers });
    await room.send({ text: 'go', target: 'claude' });
    const events = await store.readAll();
    assert.equal(events.some((event) => event.type === 'agent.started' && event.payload.agent === 'codex'), false);
    const stopped = events.find((event) => event.type === 'plan.stopped');
    assert.equal(stopped.payload.reason, 'stopped by the human');
    assert.equal(stopped.payload.stepsRun, 1);
    assert.equal(room.activePlans().length, 0);

    const quiet = await new EventStore(join(root, 'quiet.jsonl')).initialize();
    const noDelegation = new Room({ store: quiet, agents, projectRoot: root, invokers, delegation: false });
    await noDelegation.send({ text: 'go', target: 'claude' });
    assert.equal((await quiet.readAll()).some((event) => event.type === 'plan.created'), false);
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
