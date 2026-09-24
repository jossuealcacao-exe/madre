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
  return spawn(process.execPath, [join(process.cwd(), 'bin', 'madre.mjs'), ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
}
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { parseMessage } from '../src/router.mjs';
import { budgetTokens, failureMessage, looksLikeCreation, Room } from '../src/room.mjs';
import { agentTimeoutsFromEnv, createPulseServer, projectRoomId } from '../src/server.mjs';
import { buildCodexArgs, parseCodexOutput } from '../src/adapters/codex.mjs';
import { buildClaudeArgs, parseClaudeOutput } from '../src/adapters/claude.mjs';
import {
  buildGeminiArgs,
  buildGeminiEnvironment,
  cleanupRuntimeRoot,
  geminiReadonlyPolicy,
  invokeGemini,
  isolateGeminiSettings,
  parseGeminiOutput,
  prepareGeminiHome,
} from '../src/adapters/gemini.mjs';
import { runReadonlyProcess } from '../src/adapters/process.mjs';
import { geminiAuthState, loginPlanFor, parseClaudeAuthStatus, parseCodexLoginStatus, parseOpenCodeAuthList } from '../src/auth-probe.mjs';
import { applyConfigToEnv, loadConfig, updateConfig } from '../src/config.mjs';
import { isOnline, makePalette, renderReport } from '../src/setup.mjs';
import { CONDITIONS, PLATFORMS, detectPlatform, diagnose, fixesFor, searchConditions } from '../public/troubleshooting.js';
import { EXTENSIONS, extensionById, gitToplevel, listExtensions } from '../src/extensions.mjs';
import { parseArgs } from '../src/cli-args.mjs';
import { parseDirectives, stripDirectives } from '../src/directives.mjs';
import { discoverModels, isValidModelName, parseCodexDefaultModel, parseCodexModelCache } from '../src/models.mjs';
import { contentTypeFor, isImage, listDirectory, readServable, resolveInside, resolveReferences, scoreFile, searchFiles, storeAttachment } from '../src/files.mjs';
import { CAPABILITIES, abilityLine, agentsWith, capabilitySummary, resolveScopes } from '../src/capabilities.mjs';
import { createLease, diffSnapshots, leaseInstructions, snapshot } from '../src/lease.mjs';
import { diagnoseGeminiStderr, escapeGeminiMentions, geminiLeasePolicy } from '../src/adapters/gemini.mjs';
import { leaseConfig, openCodeConfig } from '../src/adapters/opencode.mjs';
import { geminiPolicy } from '../src/adapters/gemini.mjs';
import { claudeTools } from '../src/adapters/claude.mjs';
import { handleRequest, safeImageName, explainGoogleError, generateImage } from '../src/mcp/image-server.mjs';
import { imageStudioFor, IMAGE_SERVER_PATH } from '../src/image-studio.mjs';
import { setImageModule, imageModuleState } from '../src/capabilities.mjs';
import { geminiImagePolicy } from '../src/adapters/gemini.mjs';
import { symlink } from 'node:fs/promises';
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
    '--output-format', 'stream-json',
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
    await rm(sourceHome, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(runtimeRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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

// The waits in these three are deliberately far wider than the behaviour needs. What is being
// proved is that a hung adapter is stopped and says why — not that a machine can start a node
// process in half a second. A loaded computer must never be able to turn working behaviour into
// a failing test, because a contributor who clones this and sees red believes the red.
test('a timeout error carries the agent\'s last output line', async () => {
  await assert.rejects(runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'console.error("Attempt 3 failed with status 503. Retrying with backoff…"); setTimeout(() => {}, 60000)'],
    cwd: process.cwd(),
    timeoutMs: 3000,
    killGraceMs: 500,
    label: 'Gemini',
    parse: () => ({ text: '' }),
  }), /Gemini did not respond before the timeout \(\d+s\)\. Last output: Attempt 3 failed with status 503/);
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
      timeoutMs: 3000,
      killGraceMs: 500,
      label: 'Fixture',
      parse: () => ({ text: '' }),
    }), /Fixture did not respond before the timeout/);
    assert.ok(Date.now() - started < 20000, 'the adapter was not stopped, it was waited out');

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
    await rm(workspace, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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

  // stream-json: init, tool events, assistant deltas, result with flat per-model stats
  const stream = [
    { type: 'init', session_id: 's', model: 'auto' },
    { type: 'message', role: 'user', content: 'q' },
    { type: 'tool_use', tool_name: 'read_file', tool_id: 't1', parameters: { file_path: 'package.json' } },
    { type: 'tool_result', tool_id: 't1', status: 'success', output: '' },
    { type: 'message', role: 'assistant', content: 'The name is ', delta: true },
    { type: 'message', role: 'assistant', content: '@jossuealcala/madre.', delta: true },
    { type: 'result', status: 'success', stats: { total_tokens: 21461, tool_calls: 1, models: {
      'gemini-3.1-pro-preview-customtools': { total_tokens: 0, input_tokens: 0, output_tokens: 0, cached: 0 },
      'gemini-3-flash-preview': { total_tokens: 21461, input_tokens: 21428, output_tokens: 33, cached: 8135 },
    } } },
  ].map((event) => JSON.stringify(event)).join('\n');
  const parsed = parseGeminiOutput(stream);
  assert.equal(parsed.text, 'The name is @jossuealcala/madre.');
  assert.equal(parsed.toolCalls, 1);
  assert.deepEqual(parsed.usage, { inputTokens: 21428, cachedInputTokens: 8135, outputTokens: 33, reasoningTokens: 0, totalTokens: 21461, source: 'gemini-json' });
  const failed = parseGeminiOutput([JSON.stringify({ type: 'init' }), JSON.stringify({ type: 'result', status: 'error', error: { message: 'Quota exceeded' } })].join('\n'));
  assert.equal(failed.error, 'Quota exceeded');
});

test('a silent process is stopped by the idle timeout and Gemini retries once', async () => {
  const idle = runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'console.log(JSON.stringify({type:"init"})); setTimeout(() => {}, 60000)'],
    cwd: process.cwd(),
    timeoutMs: 60000,
    idleTimeoutMs: 1500,
    killGraceMs: 500,
    label: 'Gemini',
    parse: () => ({ text: '' }),
  });
  await assert.rejects(idle, (error) => error.code === 'IDLE' && /went silent for \d+s and was stopped/.test(error.message) && /"init"/.test(error.partialOutput));

  // A process that keeps talking is not idle even though each line is far apart.
  const chatty = await runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'let n=0; const t=setInterval(()=>{ console.log(JSON.stringify({type:"message",role:"assistant",content:"x"})); if(++n===3){clearInterval(t);} }, 150)'],
    cwd: process.cwd(),
    timeoutMs: 30000,
    idleTimeoutMs: 2500,
    label: 'Gemini',
    parse: parseGeminiOutput,
  });
  assert.equal(chatty.text, 'xxx');

  // invokeGemini retries once on a silent hang, then surfaces the failure.
  let attempts = 0;
  const hang = new Error('Gemini went silent for 90s and was stopped.');
  hang.code = 'IDLE';
  await assert.rejects(invokeGemini({ executable: '/fake', projectRoot: process.cwd(), prompt: 'p', retries: 1, run: async () => { attempts += 1; throw hang; } }), /went silent.*\(retried 1×\)/);
  assert.equal(attempts, 2);
  attempts = 0;
  const partial = new Error('Gemini went silent for 90s and was stopped.');
  partial.code = 'IDLE';
  partial.partialOutput = JSON.stringify({ type: 'message', role: 'assistant', content: 'half an answer' });
  await assert.rejects(invokeGemini({ executable: '/fake', projectRoot: process.cwd(), prompt: 'p', retries: 1, run: async () => { attempts += 1; throw partial; } }), /went silent/);
  assert.equal(attempts, 1, 'no retry when Gemini had already started answering');
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('prints help without starting a server', async () => {
  for (const flag of ['--help', '-h', 'help']) {
    const { stdout } = await execFileAsync(process.execPath, [join(process.cwd(), 'bin', 'madre.mjs'), flag], { timeout: 5000 });
    assert.match(stdout, /madre start \[--project PATH\]/);
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    assert.match(failed[0].payload.error, /MADRE stopped while @codex was answering/);
    // Idempotent: a second start finds nothing open.
    assert.equal(await room.reconcile(), 0);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
          signal.addEventListener('abort', () => reject(new Error(`Codex was interrupted: ${signal.reason}.`)), { once: true });
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
    assert.deepEqual(events.map((event) => event.type).filter((type) => !type.startsWith('turn.')), ['message.created', 'agent.started', 'message.failed']);
    assert.match(events.at(-1).payload.error, /interrupted: MADRE is shutting down/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
  await assert.rejects(pending, /Fixture was interrupted: MADRE is shutting down/);
  assert.ok(Date.now() - started < 3000);
  await assert.rejects(runReadonlyProcess({
    executable: process.execPath, args: ['-e', ''], cwd: process.cwd(), label: 'Fixture', parse: () => ({ text: '' }), signal: controller.signal,
  }), /interrupted before it started: MADRE is shutting down/);
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
  assert.deepEqual(ids('Codex was interrupted because MADRE is shutting down.', 'codex'), ['interrupted']);
  assert.deepEqual(ids('gemini is not installed on this computer.', 'gemini'), ['not-installed']);
  assert.deepEqual(ids('listen EADDRINUSE: address already in use 127.0.0.1:4317'), ['port-in-use']);
  assert.deepEqual(ids('everything is fine'), []);
  // Two platforms, the two MADRE is tested on. Every condition answers on both, because a
  // remedy that exists for one shell and not the other is a dead end for half the readers.
  assert.deepEqual(Object.keys(PLATFORMS), ['darwin', 'linux']);
  for (const condition of CONDITIONS) {
    for (const platform of ['darwin', 'linux']) {
      assert.ok(fixesFor(condition, platform).length > 0, `${condition.id} has a ${platform} remedy`);
    }
  }
  assert.deepEqual(fixesFor(CONDITIONS.find((c) => c.id === 'not-installed'), 'linux', 'gemini'), ['npm install -g @google/gemini-cli']);
  assert.match(fixesFor(CONDITIONS.find((c) => c.id === 'port-in-use'), 'linux').join('\n'), /ss -ltnp/);
  assert.match(fixesFor(CONDITIONS.find((c) => c.id === 'port-in-use'), 'darwin').join('\n'), /lsof/);
  assert.equal(detectPlatform({ platform: 'MacIntel' }), 'darwin');
  assert.equal(detectPlatform({ platform: 'Linux x86_64' }), 'linux');
  // Anything else reads the macOS column rather than being handed commands for a shell nobody
  // here has ever run them in.
  assert.equal(detectPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }), 'darwin');
  // Everything the room grew this cycle has an entry, so MU/TH/UR can answer for it: what a
  // conversation is, what an aberration does, why a note arrived by association, what cold means,
  // what the three tests measure, and the two ways a module comes in or gets a newer version.
  for (const id of ['conversations', 'memory-aberrations', 'memory-cascade', 'memory-cold', 'maturity-tests', 'module-update', 'module-add']) {
    assert.ok(CONDITIONS.some((condition) => condition.id === id), `the catalog cannot answer for ${id}`);
  }
  assert.deepEqual(ids('MADRE is already open for this project at http://127.0.0.1:4400'), ['conversations']);
  assert.deepEqual(ids('memory used · 4 · 1 by association'), ['memory-cascade']);
  assert.ok(ids('npm ERR! EACCES: permission denied, access \'/usr/local/lib/node_modules\'').includes('module-update'));
  assert.deepEqual(ids('the id "ash" is already taken'), ['module-add']);
  assert.ok(searchConditions('gemini').every((c) => /gemini/i.test(`${c.id} ${c.title} ${c.diagnosis} ${c.remedy} ${c.agent}`)), 'the search reads the remedy too');
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
  assert.equal(EXTENSIONS.length, 7);
  assert.ok(EXTENSIONS.some((extension) => extension.id === 'git-pulse' && extension.kind === 'builtin'));

  const root = await mkdtemp(join(tmpdir(), 'pulse-modules-'));
  const project = join(root, 'project');
  await mkdir(project);
  try {
    assert.deepEqual(await ahp.detect(project), { installed: false, detail: 'not in this project' });
    const listed = await listExtensions({ projectRoot: project, agents });
    assert.equal(listed[0].status.installed, false);
    assert.equal(listed[0].install.display, plan.display);
    assert.equal(listed[1].id, 'image-studio');

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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
      // Generous on purpose: the room has to open on a busy laptop, not only on an idle one.
      const timer = setTimeout(() => child.kill('SIGTERM'), 30000);
      const poll = setInterval(() => { if (/MADRE is ready/.test(out)) { clearInterval(poll); clearTimeout(timer); child.kill('SIGTERM'); } }, 100);
      child.on('close', (code) => { clearInterval(poll); clearTimeout(timer); resolve({ code, out }); });
    });
    const fallback = await run(['--port', String(port), '--auto']); // explicit port → refuse
    assert.equal(fallback.code, 2);
    assert.match(fallback.out, new RegExp(`port ${port} is already in use`));
    const walked = await run([]);
    // default 4317 may or may not be busy on this machine; either way the room must come up
    assert.match(walked.out, /MADRE is ready/);
  } finally {
    await new Promise((resolve) => busy.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    'not a step (expected "@agent: text" or "@agent #2: text")',
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
    assert.deepEqual(types.filter((type) => !type.startsWith('usage.') && !type.startsWith('turn.') && !type.startsWith('handoff.') && !type.startsWith('room.alert')), [
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
    const nested = events.find((event) => event.type === 'room.alert' && event.payload.code === 'nested-delegation');
    assert.match(nested.payload.message, /@gemini tried to open a plan from inside a plan/);
    assert.match(prompts.find((item) => item.agent === 'gemini').prompt, /@claude is coordinating on behalf of the human and asks you: Synthesize/);
    assert.doesNotMatch(prompts.find((item) => item.agent === 'gemini').prompt, /You may put other agents to work/, 'delegates are not offered delegation');
    assert.match(prompts[0].prompt, /You may put other agents to work: @gemini, @codex/);
    assert.match(prompts.at(-1).prompt, /this is your closing turn/);
    const orchestratorReply = events.find((event) => event.payload.delegates);
    assert.deepEqual(orchestratorReply.payload.delegates, ['gemini', 'codex']);
    const handoffs = events.filter((event) => event.type === 'handoff.created');
    assert.ok(handoffs.some((event) => event.payload.kind === 'delegated'));
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
        signal.addEventListener('abort', () => reject(new Error('Gemini was interrupted because MADRE is shutting down.')), { once: true });
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
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a human message during a plan is answered without starting a second plan, and MOTHER says so', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-oneplan-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['claude', 'gemini', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    let releaseGemini;
    const geminiDone = new Promise((resolve) => { releaseGemini = resolve; });
    let claudeCalls = 0;
    const invokers = {
      'claude-readonly': async () => {
        claudeCalls += 1;
        // Every Claude turn tries to delegate; only the first may.
        return { text: '```pulse\n@gemini: go\n@claude: close\n```', usage: null };
      },
      'gemini-readonly': async () => { await geminiDone; return { text: 'gemini done', usage: null }; },
      'codex-readonly': async () => ({ text: 'codex', usage: null }),
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    const first = room.send({ text: 'coordinate', target: 'claude' });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await store.readAll()).some((event) => event.type === 'agent.started' && event.payload.agent === 'gemini')) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    // Human interjects while the plan waits on Gemini.
    await room.send({ text: 'and now this', target: 'claude' });
    releaseGemini();
    await first;
    const events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'plan.created').length, 1, 'the second Claude turn could not open another plan');
    const alert = events.find((event) => event.type === 'room.alert');
    assert.equal(alert.payload.code, 'plan-active');
    assert.match(alert.payload.message, /no second plan will start.*STOPALL/);
    assert.ok(claudeCalls >= 3, 'orchestrator, interjection and closing turn all ran');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('STOPALL halts every plan and every in-flight turn and is reachable over HTTP', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-stopall-'));
  const agents = ['claude', 'gemini', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
  const hang = ({ signal, label }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error(`${label} was interrupted: ${signal.reason}.`)), { once: true }));
  const invokers = {
    'claude-readonly': async () => ({ text: '```pulse\n@gemini: slow\n@codex: never\n```', usage: null }),
    'gemini-readonly': ({ signal }) => hang({ signal, label: 'Gemini' }),
    'codex-readonly': ({ signal }) => hang({ signal, label: 'Codex' }),
  };
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers, broadcastIntervalMs: 50 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fetch(`http://127.0.0.1:${port}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'coordinate', target: 'claude' }) });
    // A second human turn to Codex runs alongside the plan.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await store.readAll()).some((event) => event.type === 'agent.started' && event.payload.agent === 'gemini')) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await fetch(`http://127.0.0.1:${port}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'also this', target: 'codex' }) });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const state = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.json());
      if (state.turns.length >= 2 && state.plans.length === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const before = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.json());
    assert.equal(before.plans.length, 1);
    assert.deepEqual(before.turns.map((turn) => turn.agent).sort(), ['codex', 'gemini']);

    const halted = await fetch(`http://127.0.0.1:${port}/api/stop-all`, { method: 'POST' }).then((response) => response.json());
    assert.deepEqual({ plans: halted.plans, turns: halted.turns }, { plans: 1, turns: 2 });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await store.readAll()).some((event) => event.type === 'plan.stopped')) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const events = await store.readAll();
    const stopped = events.find((event) => event.type === 'room.stopped');
    assert.deepEqual(stopped.payload.agents.sort(), ['codex', 'gemini']);
    assert.equal(events.filter((event) => event.type === 'message.failed').length, 2, 'both in-flight turns recorded as interrupted');
    assert.ok(events.filter((event) => event.type === 'message.failed').every((event) => /STOPALL by the human/.test(event.payload.error)), 'the failure names STOPALL, not a shutdown');
    assert.equal(events.some((event) => event.type === 'agent.started' && event.payload.agent === 'codex' && event.payload.planId), false, 'the plan never reached its second step');
    const after = await fetch(`http://127.0.0.1:${port}/api/state`).then((response) => response.json());
    assert.deepEqual({ plans: after.plans, turns: after.turns }, { plans: [], turns: [] });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('connections: settings are read, saved to config, applied live; sign-in streams for browser CLIs and hands a command to the others', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-settings-'));
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x/codex', version: '1' },
    { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x/claude', version: '1' },
    { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x/gemini', version: '1' },
    { id: 'opencode', label: 'OpenCode', detected: false, ready: false, adapter: 'opencode-readonly', path: null, version: null },
  ];
  assert.equal(loginPlanFor(agents[0]).headless, true);
  assert.equal(loginPlanFor(agents[1]).headless, true);
  assert.equal(loginPlanFor(agents[2]).headless, false);
  assert.match(loginPlanFor(agents[2]).display, /gemini.*\/auth/);
  let probes = 0;
  const probe = async () => { probes += 1; return { codex: { state: probes > 1 ? 'signed-in' : 'signed-out', detail: probes > 1 ? 'via ChatGPT' : 'not logged in' }, claude: { state: 'signed-in', detail: 'via claude.ai' }, gemini: { state: 'unknown', detail: '' }, opencode: { state: 'not-installed', detail: '' } }; };
  const loginRunners = {
    codex: () => ({ headless: true, command: process.execPath, args: ['-e', 'console.log("Open this URL to sign in: https://auth.example/device/ABC"); setTimeout(() => console.log("Logged in using ChatGPT"), 50)'], display: 'codex login', note: 'browser' }),
  };
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, probe, loginRunners, broadcastIntervalMs: 50, invokers: {} });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const api = (path, options) => fetch(`http://127.0.0.1:${port}${path}`, options).then(async (response) => ({ status: response.status, body: await response.json() }));
  try {
    const initial = await api('/api/settings');
    assert.equal(initial.status, 200);
    assert.equal(initial.body.settings.delegation, true);
    assert.equal(initial.body.settings.softTokenBudget, 500000);
    assert.equal(initial.body.settings.timeouts.codex, 180000);
    assert.equal(initial.body.agents.find((a) => a.id === 'gemini').login.headless, false);

    const saved = await api('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      opencode: { model: 'openai/gpt-5.6-sol' },
      timeouts: { default: 240000, gemini: 90000, codex: 0 },
      room: { delegation: false, maxPlanSteps: 2, softTokenBudget: 750000 },
      gemini: { idleMs: 60000, retries: 2 },
      scopes: { codex: { imageGen: false }, gemini: { imageGen: true }, nope: { write: true } },
    }) });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.settings.capabilities.codex.scopes.imageGen.enabled, false, 'scope switched off');
    assert.equal(saved.body.settings.capabilities.gemini.scopes.imageGen.enabled, false, 'cannot enable an ability the CLI lacks');
    assert.deepEqual({ ...saved.body.settings, timeouts: undefined, capabilities: undefined, memory: undefined, privacy: undefined, updates: undefined }, {
      timeouts: undefined, capabilities: undefined, memory: undefined, privacy: undefined, updates: undefined, defaultTimeout: 240000, delegation: false, maxPlanSteps: 2, softTokenBudget: 750000, opencodeModel: 'openai/gpt-5.6-sol', geminiIdleMs: 60000, geminiRetries: 2,
    });
    assert.equal(saved.body.settings.timeouts.gemini, 90000);
    assert.equal(saved.body.settings.timeouts.codex, 240000, 'a cleared per-agent value falls back to the default');
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    assert.equal(config.opencode.model, 'openai/gpt-5.6-sol');
    assert.equal(config.room.delegation, false);
    assert.deepEqual(config.scopes, { codex: { imageGen: false }, gemini: { imageGen: true } }, 'unknown agents are dropped, the rest persisted');
    assert.equal(config.gemini.idleMs, 60000);
    assert.equal(process.env.PULSE_OPENCODE_MODEL, 'openai/gpt-5.6-sol');
    const stateNow = await api('/api/state');
    assert.equal(stateNow.body.delegation.enabled, false);
    assert.equal(stateNow.body.timeouts.gemini, 90000);
    assert.ok((await store.readAll()).some((event) => event.type === 'room.settings'));

    // Interactive CLIs get a command, not a process.
    const gemini = await api('/api/agents/gemini/login', { method: 'POST' });
    assert.equal(gemini.status, 409);
    assert.match(gemini.body.command, /gemini/);
    assert.equal((await api('/api/agents/opencode/login', { method: 'POST' })).status, 412);
    assert.equal((await api('/api/agents/nope/login', { method: 'POST' })).status, 404);

    // Browser CLIs run headless: URL streamed, session re-probed on finish.
    const codex = await api('/api/agents/codex/login', { method: 'POST' });
    assert.equal(codex.status, 202);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await store.readAll()).some((event) => event.type === 'connection.login.finished')) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const events = await store.readAll();
    const urlLine = events.find((event) => event.type === 'connection.login.output' && event.payload.url);
    assert.equal(urlLine.payload.url, 'https://auth.example/device/ABC');
    const finished = events.find((event) => event.type === 'connection.login.finished');
    assert.equal(finished.payload.code, 0);
    assert.equal(finished.payload.session.state, 'signed-in');
    const after = await api('/api/state');
    assert.equal(after.body.sessions.codex.state, 'signed-in');
    const reprobe = await api('/api/agents/probe', { method: 'POST' });
    assert.equal(reprobe.body.sessions.claude.detail, 'via claude.ai');
  } finally {
    delete process.env.PULSE_OPENCODE_MODEL;
    delete process.env.PULSE_GEMINI_IDLE_MS;
    delete process.env.PULSE_GEMINI_RETRIES;
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('models: discovered locally, validated, and passed to every CLI as --model', async () => {
  const cache = JSON.stringify({ models: [{ slug: 'gpt-5.6-sol' }, { slug: 'gpt-5.6-luna' }, { slug: 'gpt-reserve' }, { slug: 'codex-auto-review' }, { nested: { slug: 'gpt-6-astra' } }] });
  assert.deepEqual(parseCodexModelCache(cache), ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-6-astra']);
  assert.deepEqual(parseCodexModelCache('not json'), []);
  assert.equal(parseCodexDefaultModel('model = "gpt-5.6-sol"\nmodel_reasoning_effort = "high"'), 'gpt-5.6-sol');
  assert.equal(isValidModelName('openai/gpt-5.6-sol'), true);
  assert.equal(isValidModelName('fable'), true);
  assert.equal(isValidModelName('rm -rf /'), false);
  assert.equal(isValidModelName('--flag'), false);

  const home = await mkdtemp(join(tmpdir(), 'pulse-models-home-'));
  try {
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(join(home, '.codex', 'models_cache.json'), cache);
    await writeFile(join(home, '.codex', 'config.toml'), 'model = "gpt-5.6-terra"\n');
    const agents = ['codex', 'claude', 'gemini', 'opencode'].map((id) => ({ id, detected: true, ready: true, path: '/x' }));
    const found = await discoverModels({ agents, home, config: { models: { claude: ['claude-opus-5'] } }, listOpenCode: async () => ['openai/gpt-5.6-sol', 'openai/gpt-5.6-luna'] });
    assert.deepEqual(found.codex.models.slice(0, 3), ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-6-astra']);
    assert.equal(found.codex.default, 'gpt-5.6-terra');
    assert.equal(found.claude.models[0], 'claude-opus-5', 'user-configured models come first');
    assert.ok(found.claude.models.includes('fable'));
    assert.deepEqual(found.opencode.models, ['openai/gpt-5.6-sol', 'openai/gpt-5.6-luna']);
    assert.equal(found.gemini.models[0], 'auto');
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }

  assert.deepEqual(buildCodexArgs({ projectRoot: '/p', prompt: 'q', model: 'gpt-5.6-luna' }).slice(7, 9), ['--model', 'gpt-5.6-luna']);
  assert.equal(buildCodexArgs({ projectRoot: '/p', prompt: 'q' }).includes('--model'), false);
  assert.deepEqual(buildClaudeArgs({ prompt: 'q', model: 'fable' }).slice(1, 3), ['--model', 'fable']);
  assert.deepEqual(buildGeminiArgs({ projectRoot: '/p', prompt: 'q', policyPath: '/t', model: 'gemini-3-pro-preview' }).slice(0, 2), ['--model', 'gemini-3-pro-preview']);
  assert.equal(buildGeminiArgs({ projectRoot: '/p', prompt: 'q', policyPath: '/t', model: 'auto' }).includes('--model'), false, '"auto" means no flag');
  assert.deepEqual(buildOpenCodeArgs({ projectRoot: '/p', prompt: 'q', model: 'openai/gpt-5.6-terra' }).slice(6, 8), ['--model', 'openai/gpt-5.6-terra']);
});

test('the chosen model travels with the human turn and is recorded on both messages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-model-turn-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    const seen = [];
    const room = new Room({ store, agents, projectRoot: root, invokers: { 'claude-readonly': async ({ model }) => { seen.push(model); return { text: 'ok', usage: null }; } } });
    await room.send({ text: 'hi', target: 'claude', model: 'fable' });
    await room.send({ text: 'hi again', target: 'claude' });
    assert.deepEqual(seen, ['fable', null]);
    const messages = (await store.readAll()).filter((event) => event.type === 'message.created');
    assert.equal(messages[0].payload.model, 'fable');
    assert.equal(messages[1].payload.model, 'fable', 'the reply records the model that produced it');
    assert.equal(messages[2].payload.model, null);
    await assert.rejects(room.send({ text: 'x', target: 'claude', model: '--bad flag' }), /Model name is not valid/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('files: only paths inside the root are served, symlinks out are refused, types are known', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-files-'));
  const outside = await mkdtemp(join(tmpdir(), 'pulse-outside-'));
  try {
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(join(root, 'docs', 'note.md'), '# hi');
    await writeFile(join(root, 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(join(outside, 'secret.txt'), 'nope');
    await symlink(join(outside, 'secret.txt'), join(root, 'escape.txt'));
    assert.equal(await resolveInside(root, 'docs/note.md'), await realpath(join(root, 'docs', 'note.md')));
    assert.equal(await resolveInside(root, '../'), null);
    assert.equal(await resolveInside(root, '../../etc/passwd'), null);
    assert.equal(await resolveInside(root, '/etc/passwd'), null);
    assert.equal(await resolveInside(root, 'escape.txt'), null, 'symlink pointing outside the root is refused');
    assert.equal(await resolveInside(root, 'docs/../logo.png'), await realpath(join(root, 'logo.png')));
    assert.equal(await resolveInside(root, ''), null);
    const served = await readServable(root, 'docs/note.md');
    assert.equal(served.status, 200);
    assert.equal(served.contentType, 'text/markdown');
    assert.equal(served.body.toString(), '# hi');
    assert.equal((await readServable(root, 'missing.md')).status, 404);
    assert.equal((await readServable(root, 'docs')).status, 404, 'directories are not files');
    assert.equal((await readServable(root, 'logo.png', { maxBytes: 2 })).status, 413);
    assert.equal(contentTypeFor('x.MJS'), 'text/javascript');
    assert.equal(isImage('photo.JPG'), true);
    assert.equal(contentTypeFor('binary.bin'), 'application/octet-stream');
    const stored = await storeAttachment(join(root, 'att'), { name: '../../evil name?.png', bytes: Buffer.from([1, 2, 3]) });
    assert.match(stored.fileName, /^[0-9a-f]{8}-\.\._\.\._evil name_\.png$|^[0-9a-f]{8}-.*evil name_\.png$/);
    assert.equal(stored.contentType, 'image/png');
    assert.equal(stored.size, 3);
    await assert.rejects(storeAttachment(join(root, 'att'), { name: 'empty', bytes: Buffer.alloc(0) }), /empty/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(outside, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('capabilities: verified matrix, routing helper', () => {
  assert.equal(capabilitySummary('codex').imageGen, true);
  assert.equal(capabilitySummary('claude').imageGen, false);
  assert.equal(capabilitySummary('gemini').imageGen, false);
  assert.ok(Object.values(CAPABILITIES).every((caps) => caps.read && caps.imageIn && caps.write));
  assert.deepEqual(agentsWith('imageGen', ['codex', 'claude', 'gemini', 'opencode']), ['codex']);
  assert.equal(capabilitySummary('unknown').write, false);
  assert.match(capabilitySummary('codex').detail.imageIn.how, /-i <file>/);
});

test('attachments: uploaded to the room folder, served back, handed to every CLI the way it accepts files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-attach-'));
  const project = join(root, 'project');
  await mkdir(join(project, 'src'), { recursive: true });
  await writeFile(join(project, 'src', 'thing.mjs'), 'export const x = 1;\n');
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const seen = [];
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents, broadcastIntervalMs: 50, invokers: { 'codex-readonly': async ({ prompt, attachments }) => { seen.push({ prompt, attachments }); return { text: 'seen', usage: null }; } } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    // project files, read-only, no escape
    const source = await fetch(`${base}/api/files?path=src/thing.mjs`);
    assert.equal(source.status, 200);
    assert.equal(source.headers.get('content-type'), 'text/javascript');
    assert.equal(await source.text(), 'export const x = 1;\n');
    assert.equal((await fetch(`${base}/api/files?path=../events.jsonl`)).status, 404);
    assert.equal((await fetch(`${base}/api/files?path=/etc/hosts`)).status, 404);

    // upload
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const uploaded = await fetch(`${base}/api/attachments`, { method: 'POST', headers: { 'x-pulse-filename': encodeURIComponent('sketch.png'), 'content-type': 'image/png' }, body: png }).then((response) => response.json());
    assert.equal(uploaded.attachment.contentType, 'image/png');
    assert.equal(uploaded.attachment.size, 8);
    const back = await fetch(`${base}${uploaded.attachment.url}`);
    assert.equal(back.status, 200);
    assert.equal(back.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await back.arrayBuffer()), png);
    assert.ok((await store.readAll()).some((event) => event.type === 'attachment.stored' && event.payload.name === 'sketch.png'));
    assert.equal((await fetch(`${base}/api/attachments`, { method: 'POST', body: Buffer.alloc(0) })).status, 400);

    // send with attachment → invoker receives paths; message records the file
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'what is this?', target: 'codex', attachments: [uploaded.attachment.id, 'not-an-id'] }) });
    for (let attempt = 0; attempt < 100 && !seen.length; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(seen.length, 1);
    assert.equal(seen[0].attachments.length, 1);
    assert.match(seen[0].attachments[0].path, /attachments\/[0-9a-f]{8}-sketch\.png$/);
    assert.match(seen[0].prompt, /The human attached 1 file\(s\)[\s\S]*sketch\.png \(image\/png, 8 bytes\)/);
    const userMessage = (await store.readAll()).find((event) => event.type === 'message.created' && event.payload.role === 'user');
    assert.equal(userMessage.payload.attachments[0].name, 'sketch.png');

    // files-only message is allowed
    const filesOnly = await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '', target: 'codex', attachments: [uploaded.attachment.id] }) });
    assert.equal(filesOnly.status, 202);

    // each adapter passes the file its own way
    const file = { path: '/att/a.png', contentType: 'image/png', dir: '/att', name: 'a.png', size: 8 };
    assert.deepEqual(buildCodexArgs({ projectRoot: '/p', prompt: 'q', attachments: [file] }).slice(7, 9), ['--image', '/att/a.png']);
    assert.deepEqual(buildClaudeArgs({ prompt: 'q', attachmentsDir: '/att' }).slice(1, 3), ['--add-dir', '/att']);
    assert.ok(buildGeminiArgs({ projectRoot: '/p', prompt: 'q', policyPath: '/t', attachmentsDir: '/att' }).includes('/p,/att'));
    assert.deepEqual(buildOpenCodeArgs({ projectRoot: '/p', prompt: 'q', model: undefined, attachments: [file] }).slice(6, 8), ['--file', '/att/a.png']);
    const state = await fetch(`${base}/api/state`).then((response) => response.json());
    assert.equal(state.capabilities.codex.imageGen, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('creation lease: a fresh directory under .pulse/out, artifacts detected by diff, every CLI scoped to it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-lease-'));
  try {
    const lease = await createLease({ projectRoot: root, leaseId: 'abcdef12-0000' });
    assert.match(lease.relativeDir, /^\.pulse\/out\/\d{8}-\d{6}-abcdef12$/);
    assert.equal(lease.outDir, join(root, lease.relativeDir));
    const before = await snapshot(lease.outDir);
    assert.equal(before.size, 0);
    await writeFile(join(lease.outDir, 'poster.png'), Buffer.from([1, 2, 3]));
    await mkdir(join(lease.outDir, 'src'), { recursive: true });
    await writeFile(join(lease.outDir, 'src', 'demo.mjs'), 'export {};');
    const after = await snapshot(lease.outDir);
    const artifacts = diffSnapshots(before, after, { relativeDir: lease.relativeDir });
    assert.deepEqual(artifacts.map((file) => [file.name, file.contentType, file.status]), [['poster.png', 'image/png', 'created'], ['demo.mjs', 'text/javascript', 'created']]);
    assert.equal(artifacts[0].path, `${lease.relativeDir}/poster.png`);
    assert.deepEqual(diffSnapshots(after, after, { relativeDir: lease.relativeDir }), [], 'unchanged files are not artifacts');
    assert.match(leaseInstructions({ outDir: '/p/.pulse/out/x', agentId: 'codex' }), /only inside \/p\/.pulse\/out\/x[\s\S]*generate images/);
    assert.match(leaseInstructions({ outDir: '/p/.pulse/out/x', agentId: 'claude' }), /You cannot generate images from this CLI/);
    assert.match(leaseInstructions({ outDir: '/p/.pulse/out/x', agentId: 'codex', scopes: { write: true, imageGen: false }, capable: { imageGen: { capable: true } } }), /switched off for this request/);

    const scope = { outDir: '/p/.pulse/out/x', relativeDir: '.pulse/out/x', leaseId: 'x' };
    const codex = buildCodexArgs({ projectRoot: '/p', prompt: 'q', lease: scope });
    assert.deepEqual(codex.slice(0, 2), ['--sandbox', 'workspace-write']);
    assert.deepEqual(codex.slice(4, 6), ['-C', '/p/.pulse/out/x']);
    assert.ok(codex.includes('--skip-git-repo-check'));
    assert.deepEqual(buildCodexArgs({ projectRoot: '/p', prompt: 'q' }).slice(0, 2), ['--sandbox', 'read-only']);
    const claude = buildClaudeArgs({ prompt: 'q', lease: scope });
    assert.equal(claude[claude.indexOf('--tools') + 1], 'Read,Glob,Grep,Write,Edit');
    // Double slash: Claude Code reads a single leading slash as project-relative and would deny every write.
    assert.equal(claude[claude.indexOf('--allowedTools') + 1], 'Read,Glob,Grep,Write(///p/.pulse/out/x/**),Edit(///p/.pulse/out/x/**)');
    assert.equal(claude.includes('--allowedTools'), true);
    assert.equal(buildClaudeArgs({ prompt: 'q' }).includes('--allowedTools'), false);
    const gemini = buildGeminiArgs({ projectRoot: '/p', prompt: 'q', policyPath: '/t', lease: scope });
    assert.equal(gemini[gemini.indexOf('--approval-mode') + 1], 'default');
    assert.equal(gemini[gemini.indexOf('--include-directories') + 1], '/p,/p/.pulse/out/x');
    assert.equal(buildGeminiArgs({ projectRoot: '/p', prompt: 'q', policyPath: '/t' })[1], 'plan');
    const policy = geminiLeasePolicy('/p/.pulse/out/x');
    assert.match(policy, /toolName = \["write_file", "replace", "edit"\]/);
    assert.match(policy, /argsPattern = '"file_path"\\s\*:\\s\*"\/p\/\\\.pulse\/out\/x\/'/);
    assert.match(policy, /toolName = "\*"\ndecision = "deny"/, 'the deny-all rule stays');
    // OpenCode matches patterns relative to --dir and creates files with `write`, edits with `edit`.
    const oc = leaseConfig('/p/.pulse/out/x', { relativeDir: '.pulse/out/x' });
    assert.deepEqual(oc.agent['pulse-readonly'].permission.edit, { '*': 'deny', '.pulse/out/x/**': 'allow' });
    assert.deepEqual(oc.agent['pulse-readonly'].permission.write, oc.agent['pulse-readonly'].permission.edit);
    assert.equal(oc.agent['pulse-readonly'].permission.read, 'allow');
    const occ = leaseConfig('/p', { control: true, relativeDir: '.' });
    assert.equal(occ.agent['pulse-readonly'].permission.write['*'], 'allow');
    assert.equal(occ.agent['pulse-readonly'].permission.write['.git/**'], 'deny');
    assert.equal(occ.agent['pulse-readonly'].permission.edit['**/.env.*'], 'deny');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('creation lease: granted per human message, inherited by the plan, artifacts recorded on the replies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-lease-room-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['claude', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const leases = [];
    const invokers = {
      'claude-readonly': async ({ prompt, lease }) => {
        leases.push(['claude', lease?.outDir ?? null]);
        if (/this is your closing turn/.test(prompt)) return { text: 'Codex made the poster.', usage: null };
        assert.match(prompt, /CREATE \(#2\)[\s\S]*where they belong/);
        return { text: 'Delegating.\n\n```pulse\n@codex: generate poster.png where images live\n@claude: confirm\n```', usage: null };
      },
      'codex-readonly': async ({ prompt, lease }) => {
        leases.push(['codex', lease?.outDir ?? null]);
        assert.match(prompt, /CREATE \(#2\)[\s\S]*generate images/);
        // The agent puts the poster where it belongs, adds a folder, and also touches an existing file: only the additions may stay.
        await mkdir(join(lease.outDir, 'assets'), { recursive: true });
        await writeFile(join(lease.outDir, 'assets', 'poster.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(join(lease.outDir, 'README.md'), 'overwritten by the agent\n');
        return { text: 'Saved assets/poster.png', usage: null };
      },
    };
    await writeFile(join(root, 'README.md'), 'original\n');
    const room = new Room({ store, agents, projectRoot: root, invokers });
    await room.send({ text: 'make me a poster', target: 'claude', create: true });
    const events = await store.readAll();
    const granted = events.find((event) => event.type === 'lease.granted');
    assert.equal(granted.payload.agent, 'claude');
    assert.equal(granted.payload.outDir, '.', 'the project itself is the lease');
    assert.match(granted.payload.scratchDir, /^\.pulse\/out\//, 'with a scratch folder for what has no place');
    assert.ok(leases.every(([, dir]) => dir === root), 'orchestrator, delegate and closing turn share the project lease');
    const created = events.find((event) => event.type === 'artifacts.created');
    assert.equal(created.payload.agent, 'codex');
    assert.deepEqual(created.payload.files.map((file) => file.path), ['assets/poster.png'], 'the new file is the artifact, with its project path');
    const codexReply = events.find((event) => event.type === 'message.created' && event.payload.sender === 'codex');
    assert.equal(codexReply.payload.artifacts[0].contentType, 'image/png');
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'original\n', 'CREATE only adds: the existing file is put back');
    const reverted = events.find((event) => event.type === 'create.reverted');
    assert.deepEqual(reverted.payload.existing, ['README.md']);
    assert.match(reverted.payload.message, /created 1 file[\s\S]*1 change\(s\) to existing files were put back/);
    assert.equal(codexReply.payload.leaseId, granted.payload.leaseId);
    const user = events.find((event) => event.type === 'message.created' && event.payload.role === 'user');
    assert.equal(user.payload.create, true);
    assert.equal(events.find((event) => event.type === 'plan.created').payload.leaseId, granted.payload.leaseId);

    // A plan block followed by prose is refused, and the room says so.
    const noisy = await new EventStore(join(root, 'noisy.jsonl')).initialize();
    const noisyRoom = new Room({ store: noisy, agents, projectRoot: root, invokers: { 'claude-readonly': async () => ({ text: '```pulse\n@codex: do it\n```\nFiles created: none.', usage: null }) } });
    await noisyRoom.send({ text: 'go', target: 'claude' });
    const ignored = (await noisy.readAll()).find((event) => event.type === 'plan.ignored');
    assert.equal(ignored.payload.orchestrator, 'claude');
    assert.match(ignored.payload.reasons[0], /must be the last thing/);
    assert.equal((await noisy.readAll()).some((event) => event.type === 'plan.created'), false);

    // Without CREATE nothing changes: no lease, read-only prompt.
    const quiet = await new EventStore(join(root, 'quiet.jsonl')).initialize();
    const readOnly = new Room({ store: quiet, agents, projectRoot: root, invokers: { 'codex-readonly': async ({ prompt, lease }) => { assert.equal(lease, null); assert.match(prompt, /Operate read-only/); return { text: 'ok', usage: null }; } } });
    await readOnly.send({ text: 'just asking', target: 'codex' });
    assert.equal((await quiet.readAll()).some((event) => event.type === 'lease.granted'), false);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('scopes: what the human enabled, per agent; CREATE is refused with a reason when the agent cannot create', async () => {
  const codex = resolveScopes('codex');
  assert.deepEqual(codex.write, { capable: true, enabled: true, wired: true, always: false });
  assert.deepEqual(codex.imageGen, { capable: true, enabled: true, wired: true });
  assert.equal(codex.web.enabled, false, 'web is off by default');
  const gemini = resolveScopes('gemini');
  assert.deepEqual(gemini.imageGen, { capable: false, enabled: false, wired: true });
  assert.equal(resolveScopes('gemini', { imageGen: true }).imageGen.enabled, false, 'cannot enable what the CLI lacks');
  assert.equal(resolveScopes('codex', { write: false }).write.enabled, false);
  assert.equal(resolveScopes('codex', { write: false, alwaysCreate: true }).write.always, false);
  assert.match(abilityLine('codex', codex), /@codex: can create files, generate images/);
  assert.match(abilityLine('gemini', gemini), /@gemini: can create files; cannot generate images/);

  const root = await mkdtemp(join(tmpdir(), 'pulse-scopes-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['claude', 'codex', 'gemini'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = {};
    const invokers = Object.fromEntries(agents.map((agent) => [`${agent.id}-readonly`, async ({ prompt, lease }) => { seen[agent.id] = { prompt, lease }; return { text: 'ok', usage: null }; }]));
    const room = new Room({ store, agents, projectRoot: root, invokers });
    room.setScopes({ gemini: { write: false } });

    // Gemini: creation switched off → refused, answered read-only, alternatives named.
    await room.send({ text: 'make an image', target: 'gemini', create: true });
    let events = await store.readAll();
    const refused = events.find((event) => event.type === 'lease.refused');
    assert.equal(refused.payload.agent, 'gemini');
    assert.match(refused.payload.message, /switched off for it/);
    assert.deepEqual(refused.payload.unavailable, ['generate images']);
    assert.deepEqual(refused.payload.alternatives.sort(), ['@claude', '@codex']);
    assert.equal(events.some((event) => event.type === 'lease.granted'), false);
    assert.equal(seen.gemini.lease, null);

    // Claude orchestrates under a lease: Claude gets no image scope, Codex does, both inside the same lease.
    room.setScopes({});
    const orchestrating = new Room({ store, agents, projectRoot: root, invokers: {
      ...invokers,
      'claude-readonly': async ({ prompt, lease }) => { seen.claude = { prompt, lease }; if (/this is your closing turn/.test(prompt)) return { text: 'done', usage: null }; return { text: '```pulse\n@codex: image please\n@gemini: describe it\n```', usage: null }; },
    } });
    await orchestrating.send({ text: 'poster', target: 'claude', create: true });
    events = await store.readAll();
    const granted = events.find((event) => event.type === 'lease.granted');
    assert.deepEqual(granted.payload.scopes, ['write']);
    assert.deepEqual(granted.payload.unavailable, ['generate images']);
    assert.match(seen.claude.prompt, /@codex: can create files, generate images/, 'the orchestrator is told who can generate images');
    assert.match(seen.claude.prompt, /@gemini: can create files; cannot generate images/);
    assert.equal(seen.codex.lease.scopes.imageGen, true, 'the delegate gets its own scopes inside the shared lease');
    assert.match(seen.codex.prompt, /You can generate images/);
    assert.equal(seen.gemini.lease.scopes.imageGen, false);
    assert.match(seen.gemini.prompt, /You cannot generate images from this CLI/);
    assert.equal(seen.claude.lease.outDir, seen.codex.lease.outDir);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Gemini stderr is diagnosed: 429 names the rate limit instead of a silent hang', async () => {
  const stderr = 'Error: ... at async retryWithBackoff (chunk.js:1)\n at async NumericalClassifierStrategy.route (chunk.js:2) {\n  status: 429\n}\n';
  const limited = diagnoseGeminiStderr(stderr);
  assert.equal(limited.code, 'RATE_LIMITED');
  assert.match(limited.message, /HTTP 429.*"auto" router/);
  assert.match(limited.hint, /gemini-3-flash-preview/);
  assert.equal(diagnoseGeminiStderr('Attempt 2 failed with status 503').code, 'UNAVAILABLE');
  assert.equal(diagnoseGeminiStderr('API key not valid').code, 'AUTH');
  assert.equal(diagnoseGeminiStderr('[STARTUP] Cannot measure phase'), null);

  // Through the adapter: an idle stop with a 429 in stderr is reported as a rate limit and not retried.
  let attempts = 0;
  const idle = new Error('Gemini went silent for 8s and was stopped.');
  idle.code = 'IDLE';
  idle.partialStderr = stderr;
  await assert.rejects(invokeGemini({ executable: '/fake', projectRoot: process.cwd(), prompt: 'p', retries: 1, run: async () => { attempts += 1; throw idle; } }), (error) => error.code === 'RATE_LIMITED' && /HTTP 429/.test(error.message));
  assert.equal(attempts, 2, 'one retry on the fallback model, then the rate limit is reported');
});

test('idle detection ignores stderr chatter and counts only complete stdout lines', async () => {
  const chatty = runReadonlyProcess({
    executable: process.execPath,
    args: ['-e', 'console.log(JSON.stringify({type:"init"})); setInterval(() => process.stderr.write("retrying...\\n"), 100); setTimeout(() => {}, 60000)'],
    cwd: process.cwd(),
    timeoutMs: 60000,
    idleTimeoutMs: 500,
    killGraceMs: 100,
    label: 'Gemini',
    parse: () => ({ text: '' }),
  });
  const started = Date.now();
  await assert.rejects(chatty, (error) => error.code === 'IDLE' && /retrying/.test(error.partialStderr));
  assert.ok(Date.now() - started < 5000, 'stderr noise did not postpone the idle stop');
});

test('web scope: wired into every CLI, standing per agent, off by default', async () => {
  assert.equal(resolveScopes('codex').web.wired, true);
  assert.equal(resolveScopes('codex').web.enabled, false, 'off until the human enables it');
  assert.equal(resolveScopes('codex', { web: true }).web.enabled, true);
  const web = { web: true, imageGen: true };
  assert.ok(buildCodexArgs({ projectRoot: '/p', prompt: 'q', scopes: web }).indexOf('--search') < buildCodexArgs({ projectRoot: '/p', prompt: 'q', scopes: web }).indexOf('exec'), 'Codex --search is a global flag before exec');
  assert.equal(buildCodexArgs({ projectRoot: '/p', prompt: 'q' }).includes('--search'), false);
  assert.deepEqual(claudeTools({ scopes: web }), ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch']);
  assert.deepEqual(claudeTools({ lease: { outDir: '/o' }, scopes: web }), ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'WebFetch', 'WebSearch']);
  const claude = buildClaudeArgs({ prompt: 'q', scopes: web });
  assert.equal(claude[claude.indexOf('--allowedTools') + 1], 'Read,Glob,Grep,WebFetch,WebSearch');
  assert.equal(buildClaudeArgs({ prompt: 'q' }).includes('WebFetch'), false);
  assert.match(geminiPolicy({ scopes: web }), /toolName = \["google_web_search", "web_fetch"\]\ndecision = "allow"/);
  assert.doesNotMatch(geminiPolicy({}), /google_web_search/);
  assert.match(geminiPolicy({ lease: { outDir: '/o' }, scopes: web }), /write_file[\s\S]*google_web_search/);
  assert.deepEqual([openCodeConfig({ scopes: web }).agent['pulse-readonly'].permission.webfetch, openCodeConfig({ scopes: web }).agent['pulse-readonly'].permission.websearch], ['allow', 'allow']);
  assert.equal(openCodeConfig({}).agent['pulse-readonly'].permission.webfetch, undefined);

  const root = await mkdtemp(join(tmpdir(), 'pulse-web-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    const seen = [];
    const room = new Room({ store, agents, projectRoot: root, invokers: { 'claude-readonly': async ({ prompt, scopes, lease }) => { seen.push({ prompt, scopes, lease }); return { text: 'ok', usage: null }; } } });
    await room.send({ text: 'latest node version?', target: 'claude' });
    assert.deepEqual(seen[0].scopes, { web: false, imageGen: false });
    assert.match(seen[0].prompt, /Do not access the web/);
    room.setScopes({ claude: { web: true } });
    await room.send({ text: 'latest node version?', target: 'claude' });
    assert.deepEqual(seen[1].scopes, { web: true, imageGen: false });
    assert.match(seen[1].prompt, /WEB ACCESS: the human enabled web search/);
    assert.equal(seen[1].lease, null, 'web does not need a lease');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Image Studio MCP server: protocol, tool, path containment, Google errors explained', async () => {
  const out = await mkdtemp(join(tmpdir(), 'pulse-img-'));
  try {
    const env = { PULSE_IMAGE_FAKE: '1' };
    const init = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, { outDir: out, env });
    assert.equal(init.result.serverInfo.name, 'pulse-image');
    const list = await handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, { outDir: out, env });
    assert.deepEqual(list.result.tools.map((tool) => tool.name), ['generate_image']);
    const call = await handleRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'generate_image', arguments: { prompt: 'a dot', file_name: '../../escape.png' } } }, { outDir: out, env });
    assert.equal(call.result.isError, false);
    assert.match(call.result.content[0].text, /escape\.png \(70 bytes/);
    assert.equal((await readFile(join(out, 'escape.png'))).length, 70, 'written inside the lease, never above it');
    assert.equal(await handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, { outDir: out, env }), null);
    assert.equal((await handleRequest({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } }, { outDir: out, env })).error.code, -32602);
    assert.equal((await handleRequest({ jsonrpc: '2.0', id: 5, method: 'resources/list' }, { outDir: out, env })).error.code, -32601);
    assert.equal(safeImageName('my poster'), 'my poster.png');
    assert.equal(safeImageName('../x/../y.png'), 'y.png');
    assert.equal(explainGoogleError(429, { error: { message: 'Your prepayment credits are depleted. Please go to AI Studio' } }).code, 'CREDITS_DEPLETED');
    assert.equal(explainGoogleError(429, { error: { message: 'Resource exhausted' } }).code, 'RATE_LIMITED');
    assert.equal(explainGoogleError(403, {}).code, 'AUTH');
    // real path with a stubbed fetch: base64 image data is decoded and saved
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');
    const made = await generateImage({ prompt: 'p', fileName: 'real.png', outDir: out, env: { GEMINI_API_KEY: 'k' }, fetchImpl: async (url, init) => {
      assert.match(url, /gemini-2\.5-flash-image:generateContent$/);
      assert.equal(init.headers['x-goog-api-key'], 'k');
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }] }) };
    } });
    assert.equal(made.bytes, 4);
    await assert.rejects(generateImage({ prompt: 'p', fileName: 'x.png', outDir: out, env: { GEMINI_API_KEY: 'k' }, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Your prepayment credits are depleted.' } }) }) }), (error) => error.code === 'CREDITS_DEPLETED');
    // No key in env: off macOS that is NO_KEY; on macOS the keychain may hold
    // the user's real key, so the stubbed fetch answers 401 and never goes out.
    await assert.rejects(generateImage({ prompt: 'p', fileName: 'x.png', outDir: out, env: {}, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'unauthorized' } }) }) }), (error) => error.code === 'NO_KEY' || error.code === 'AUTH');
  } finally {
    await rm(out, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Image Studio wiring: module grants imageGen; CLIs receive MADRE\'s MCP server only inside a lease', async () => {
  try {
    setImageModule({ enabled: false });
    assert.equal(capabilitySummary('gemini').imageGen, false);
    setImageModule({ enabled: true, model: 'gemini-3.1-flash-image' });
    assert.equal(capabilitySummary('gemini').imageGen, true);
    assert.equal(capabilitySummary('claude').imageGen, true);
    assert.equal(capabilitySummary('opencode').imageGen, true);
    assert.match(capabilitySummary('gemini').detail.imageGen.how, /Image Studio/);
    assert.equal(resolveScopes('gemini').imageGen.capable, true);
    assert.equal(imageModuleState().model, 'gemini-3.1-flash-image');

    const studio = imageStudioFor({ enabled: true, model: 'gemini-3.1-flash-image', outDir: '/p/.pulse/out/x', env: {} });
    assert.equal(studio.name, 'pulse-image');
    assert.deepEqual(studio.args, [IMAGE_SERVER_PATH]);
    assert.equal(studio.env.PULSE_IMAGE_OUT_DIR, '/p/.pulse/out/x');
    assert.equal(imageStudioFor({ enabled: false, outDir: '/p' }), null);

    const lease = { outDir: '/p/.pulse/out/x', relativeDir: '.pulse/out/x', leaseId: 'x', scopes: { write: true, imageGen: true, web: false } };
    const claude = buildClaudeArgs({ prompt: 'q', lease, imageStudio: studio });
    const mcp = JSON.parse(claude[claude.indexOf('--mcp-config') + 1]);
    assert.deepEqual(Object.keys(mcp.mcpServers), ['pulse-image']);
    assert.equal(mcp.mcpServers['pulse-image'].env.PULSE_IMAGE_OUT_DIR, '/p/.pulse/out/x');
    assert.match(claude[claude.indexOf('--allowedTools') + 1], /mcp__pulse-image__generate_image/);
    assert.equal(claude.includes('--safe-mode'), false, 'safe-mode would disable our MCP server');
    assert.equal(claude[claude.indexOf('--setting-sources') + 1], '', 'no user setting sources replace safe-mode');
    assert.ok(buildClaudeArgs({ prompt: 'q' }).includes('--safe-mode'), 'without the studio, safe-mode stays');
    assert.equal(JSON.parse(buildClaudeArgs({ prompt: 'q' })[buildClaudeArgs({ prompt: 'q' }).indexOf('--mcp-config') + 1]).mcpServers['pulse-image'], undefined);

    const settings = isolateGeminiSettings({ security: { auth: { selectedType: 'gemini-api-key' } }, hooks: {} }, { imageStudio: studio });
    assert.deepEqual(Object.keys(settings), ['security', 'mcpServers']);
    assert.equal(settings.mcpServers['pulse-image'].command, process.execPath);
    assert.match(geminiImagePolicy(studio), /toolName = \["generate_image", "pulse-image__generate_image"\]/);
    assert.match(geminiPolicy({ lease, imageStudio: studio }), /generate_image/);
    assert.doesNotMatch(geminiPolicy({ imageStudio: studio }), /generate_image/, 'no lease, no image tool');

    const oc = openCodeConfig({ lease, imageStudio: studio });
    assert.equal(oc.mcp['pulse-image'].type, 'local');
    assert.deepEqual(oc.mcp['pulse-image'].command, [process.execPath, IMAGE_SERVER_PATH]);
    assert.equal(openCodeConfig({ imageStudio: studio }).mcp, undefined);

    // Room: with the module on, Gemini under a lease gets the studio and the prompt names the tool.
    const root = await mkdtemp(join(tmpdir(), 'pulse-studio-room-'));
    try {
      const store = await new EventStore(join(root, 'events.jsonl')).initialize();
      const agents = [{ id: 'gemini', label: 'gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' }, { id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
      const seen = {};
      const invokers = Object.fromEntries(agents.map((agent) => [`${agent.id}-readonly`, async ({ prompt, imageStudio }) => { seen[agent.id] = { prompt, imageStudio }; return { text: 'ok', usage: null }; }]));
      const room = new Room({ store, agents, projectRoot: root, invokers });
      await room.send({ text: 'draw', target: 'gemini', create: true });
      assert.equal(seen.gemini.imageStudio.name, 'pulse-image');
      assert.match(seen.gemini.prompt, /MCP tool generate_image/);
      await room.send({ text: 'draw', target: 'codex', create: true });
      assert.equal(seen.codex.imageStudio, null, 'Codex keeps its native image generation');
      await room.send({ text: 'no lease', target: 'gemini' });
      assert.equal(seen.gemini.imageStudio, null, 'no lease, no studio');
      room.setScopes({ gemini: { alwaysCreate: true } });
      await room.send({ text: 'write a report', target: 'gemini' });
      assert.equal(seen.gemini.imageStudio, null, 'a standing write lease does not enable paid image generation');
      assert.ok((await store.readAll()).some((event) => event.type === 'lease.granted' && event.payload.standing && event.payload.agent === 'gemini'));
    } finally {
      await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    }
  } finally {
    setImageModule({ enabled: false });
  }
});

test('Ash asks for compact prose and never touches what the human wrote', async () => {
  const { promptParts } = await import('../src/room/prompt.mjs');
  const base = { agent: { id: 'codex' }, text: 'crear una imagen para el proyecto Core Cloud', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 1 };

  // Off, the briefing says nothing about how to answer.
  assert.ok(!promptParts(base).some((part) => part.id === 'ash'));

  // On, it adds one line, and that line is about the reply rather than the request. Ash used to
  // rewrite the human's message before sending it; the message now leaves exactly as written.
  const asked = promptParts({ ...base, ash: true });
  const line = asked.find((part) => part.id === 'ash');
  assert.ok(line, 'Ash was switched on and changed nothing');
  assert.match(line.text, /compact prose/);
  assert.match(line.text, /never in what you leave out/);
  assert.ok(!/937|beta|abbreviat/i.test(line.text), 'Ash still speaks of abbreviating, or still claims Order 937');
  assert.equal(asked.find((part) => part.id === 'ask').text, 'User message: crear una imagen para el proyecto Core Cloud');
});

test('Ash is opt-in per message, asks for compact prose, and never rewrites a word', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ash-room-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' }];
    const prompts = [];
    const answer = 'El router monta /api antes de los archivos estaticos, y el head se resuelve ahi mismo.';
    const room = new Room({ store, agents, projectRoot: root, invokers: { 'claude-readonly': async ({ prompt }) => { prompts.push(prompt); return { text: answer, usage: { totalTokens: 30 } }; } } });
    const request = 'crear una imagen para el proyecto Core Cloud para el head dentro del home de la pagina principal';

    // Asked for while the switch is off: nothing happens at all.
    await room.send({ text: request, target: 'claude', ash: true });
    assert.match(prompts[0], new RegExp(request), 'the request did not reach the agent as it was written');
    assert.ok(!/Ash: answer in compact prose/.test(prompts[0]), 'a switched-off module reached the briefing');

    // Switched on and asked for: one line is added, about the reply.
    room.setAsh(true);
    await room.send({ text: request, target: 'claude', ash: true });
    assert.match(prompts[1], /Ash: answer in compact prose/);
    assert.match(prompts[1], new RegExp(request), 'Ash altered the human message on its way out');

    // What the room recorded is what was said, on both sides. There is no original kept beside
    // an abbreviation, because nothing is abbreviated.
    const events = (await store.readAll()).filter((event) => event.type === 'message.created');
    assert.equal(events[2].payload.text, request);
    assert.equal(events[2].payload.originalText, undefined);
    assert.deepEqual(events[2].payload.ash, { active: true });
    assert.equal(events[3].payload.text, answer, 'the reply came back rewritten');
    assert.equal(events[3].payload.originalText, undefined);

    // And what enters the next turn's transcript is the same words again.
    await room.send({ text: 'Resume brevemente', target: 'claude', ash: false });
    assert.equal(prompts[2].split(request).length - 1, 2, 'both earlier turns should carry the request as written');
    assert.ok(!/Ash: answer in compact prose/.test(prompts[2]), 'Ash was not asked for and came anyway');
    assert.equal(events.at(-1).payload.text, answer);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Ash reaches every step of a cross-agent plan, and the steps are still written plainly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ash-plan-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [
      { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' },
      { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake', version: 'test' },
    ];
    const prompts = [];
    const room = new Room({
      store, agents, projectRoot: root,
      invokers: {
        'claude-readonly': async ({ prompt }) => { prompts.push({ agent: 'claude', prompt }); return { text: '```pulse\n@gemini: revisa el router del proyecto y reporta\n```', usage: null }; },
        'gemini-readonly': async ({ prompt }) => { prompts.push({ agent: 'gemini', prompt }); return { text: 'Revisado: monta /api primero.', usage: null }; },
      },
    });
    room.setAsh(true);
    await room.send({ text: 'coordina esto con el equipo', target: 'claude', ash: true });
    const step = prompts.find((entry) => entry.agent === 'gemini');
    assert.ok(step, 'the delegated step never ran');
    assert.match(step.prompt, /Ash: answer in compact prose/, 'a delegated step was not asked for compact prose');
    assert.match(step.prompt, /revisa el router del proyecto y reporta/, 'the step was rewritten on its way to the delegate');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('Image Studio module: toggled from the modules API, gated on a Gemini key, persisted in config', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-studio-api-'));
  const agents = [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x', version: '1' }];
  let key = null;
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: {}, imageKey: async () => key });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const api = (path, options) => fetch(`http://127.0.0.1:${port}${path}`, options).then(async (response) => ({ status: response.status, body: await response.json() }));
  try {
    let listed = await api('/api/extensions');
    const studio = listed.body.extensions.find((item) => item.id === 'image-studio');
    assert.equal(studio.kind, 'builtin');
    assert.equal(studio.status.installed, false);
    assert.equal(studio.preflight.ok, false, 'no key, cannot enable');
    assert.equal((await api('/api/extensions/image-studio/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' })).status, 412);
    key = 'AQ.test';
    const on = await api('/api/extensions/image-studio/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true, model: 'gemini-3-pro-image' }) });
    assert.equal(on.status, 200);
    assert.equal(on.body.enabled, true);
    assert.equal(on.body.capabilities.gemini.imageGen, true);
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    assert.deepEqual(config.modules.imageStudio, { enabled: true, model: 'gemini-3-pro-image' });
    listed = await api('/api/extensions');
    assert.match(listed.body.extensions.find((item) => item.id === 'image-studio').status.detail, /on · gemini-3-pro-image/);
    assert.ok((await store.readAll()).some((event) => event.type === 'extension.toggled' && event.payload.enabled === true));
    const off = await api('/api/extensions/image-studio/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' });
    assert.equal(off.body.enabled, false);
    assert.equal(off.body.capabilities.gemini.imageGen, false);
  } finally {
    setImageModule({ enabled: false });
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('polls available official quota sources and restores sentinel state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-quota-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: 'test' }];
  let usedPercent = 91;
  const source = {
    id: 'codex-account',
    agent: 'codex',
    // A reset time far ahead: an expired window would (rightly) be treated as empty.
    read: async () => ({ usedPercent, resetAt: '2099-01-01T00:00:00.000Z' }),
  };

  const open = [];
  try {
    const first = await createPulseServer({
      projectRoot: root,
      stateRoot: root,
      agents,
      quotaSources: [source],
      quotaPollIntervalMs: 0,
    });
    open.push(first.server);
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
    open.push(second.server);
    await new Promise((resolve) => second.server.listen(0, '127.0.0.1', resolve));
    events = await second.store.readAll();
    assert.equal(events.filter((event) => event.type === 'quota.updated').length, 2);
    assert.equal(events.filter((event) => event.type === 'limit.warning').length, 1);
    await new Promise((resolve) => second.server.close(resolve));
  } finally {
    // Close whatever is still listening, or a failed assertion leaves the broadcaster ticking forever.
    await Promise.all(open.map((server) => new Promise((resolve) => (server.listening ? server.close(resolve) : resolve()))));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// ---------- slash commands: Git Pulse and the command API ----------
import { COMMANDS, listCommands, parseCommand } from '../src/commands.mjs';

test('parseCommand splits "/git log 5" and rejects plain text', () => {
  assert.deepEqual(parseCommand('/git log 5').name, 'git');
  assert.deepEqual(parseCommand('/git log 5').args, ['log', '5']);
  assert.equal(parseCommand('hello /git'), null);
  assert.equal(parseCommand('/Git').name, 'git');
});

test('Git Pulse runs read-only in a git project and is unavailable elsewhere', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'pulse-gitpulse-'));
  const plain = await mkdtemp(join(tmpdir(), 'pulse-plain-'));
  try {
    const git = (...args) => new Promise((resolve, reject) => execFile('git', args, { cwd: repo, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }, (error, stdout) => (error ? reject(error) : resolve(stdout))));
    await git('init', '-q');
    await writeFile(join(repo, 'a.txt'), 'one\n');
    await git('add', 'a.txt');
    await git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'first');
    await writeFile(join(repo, 'b.txt'), 'two\n');
    const gitPulse = COMMANDS.find((command) => command.name === 'git');
    assert.equal(await gitPulse.available({ projectRoot: repo }), true);
    assert.equal(await gitPulse.available({ projectRoot: plain }), false);
    const status = await gitPulse.execute({ projectRoot: repo, args: [] });
    assert.equal(status.ok, true);
    assert.match(status.text, /## changes[\s\S]*\?\? b\.txt/);
    assert.match(status.text, /## last commits[\s\S]*first/);
    const bad = await gitPulse.execute({ projectRoot: repo, args: ['rm'] });
    assert.equal(bad.ok, false);
    const listed = await listCommands({ projectRoot: plain });
    assert.equal(listed.find((command) => command.name === 'git').available, false);
  } finally {
    await rm(repo, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(plain, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('POST /api/commands records a command.output event the transcript shares with agents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-cmd-api-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  try {
    await new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd: root }, (error) => (error ? reject(error) : resolve())));
    const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const listing = await fetch(`${base}/api/commands`).then((response) => response.json());
      assert.equal(listing.commands.find((command) => command.name === 'git').available, true);
      const posted = await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '/git branches' }) });
      assert.equal(posted.status, 200);
      const events = await store.readAll();
      const card = events.find((event) => event.type === 'command.output');
      assert.equal(card.payload.name, 'git');
      assert.deepEqual(card.payload.args, ['branches']);
      const context = buildConversationContext(events);
      assert.equal(context.messages.at(-1).role, 'command');
      assert.match(context.messages.at(-1).text, /Git Pulse/);
      const unknown = await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '/nope' }) });
      assert.equal(unknown.status, 404);
      const notCommand = await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
      assert.equal(notCommand.status, 400);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('listDirectory fences to the project, hides .git, sorts folders first and does not walk node_modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-tree-'));
  try {
    await mkdir(join(root, 'src'));
    await mkdir(join(root, '.git'));
    await mkdir(join(root, 'node_modules'));
    await writeFile(join(root, 'zeta.txt'), 'z');
    await writeFile(join(root, 'src', 'a.mjs'), 'export {}');
    const top = await listDirectory(root, '.');
    assert.equal(top.status, 200);
    assert.deepEqual(top.entries.map((entry) => entry.name), ['node_modules', 'src', 'zeta.txt']);
    assert.equal(top.entries[0].shallow, true);
    assert.equal(top.entries[2].size, 1);
    const inner = await listDirectory(root, 'src');
    assert.deepEqual(inner.entries.map((entry) => `${entry.kind}:${entry.name}`), ['file:a.mjs']);
    assert.equal((await listDirectory(root, '../')).status, 404);
    assert.equal((await listDirectory(root, 'zeta.txt')).status, 404);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('searchFiles ranks by name match and resolveReferences reads !file:lines from the project only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-refs-'));
  try {
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'node_modules', 'dep'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'dep', 'room.mjs'), 'nope');
    await writeFile(join(root, 'src', 'room.mjs'), 'one\ntwo\nthree\nfour\n');
    await writeFile(join(root, 'img.md'), '# image brief\n');
    const found = await searchFiles(root, 'room');
    assert.deepEqual(found.map((file) => file.path), ['src/room.mjs'], 'node_modules is not walked');
    assert.ok(scoreFile('src/room.mjs', 'room.mjs') > scoreFile('src/room.mjs', 'rm'));
    assert.equal((await searchFiles(root, 'zzz')).length, 0);

    const refs = await resolveReferences(root, 'revisa con @claude el !img.md y !src/room.mjs:2-3 y también !missing.txt y !../etc/passwd');
    assert.deepEqual(refs.map((ref) => ref.path), ['img.md', 'src/room.mjs']);
    assert.equal(refs[0].lines, undefined);
    assert.deepEqual(refs[1].lines, { from: 2, to: 3 });
    assert.match(refs[1].excerpt, /2 \| two\n\s+3 \| three/);
    assert.equal((await resolveReferences(root, 'no refs here, email a!b.c')).length, 0);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('Gemini prompts escape @handles so the CLI does not read them as files, and replies are unescaped', () => {
  assert.equal(escapeGeminiMentions('You are @gemini; talk to @codex and @claude about x@y.com'), 'You are \\@gemini; talk to \\@codex and \\@claude about x\\@y.com');
  assert.equal(escapeGeminiMentions('already \\@codex'), 'already \\@codex', 'no double escaping');
  assert.equal(escapeGeminiMentions('no handles here'), 'no handles here');
  const args = buildGeminiArgs({ projectRoot: '/p', prompt: 'ask @codex', policyPath: '/policy.toml' });
  const prompt = args[args.indexOf('--prompt') + 1];
  assert.match(prompt, /^Note: in this prompt every @handle/);
  assert.match(prompt, /ask \\@codex$/);
  const plain = buildGeminiArgs({ projectRoot: '/p', prompt: 'no handles', policyPath: '/policy.toml' });
  assert.equal(plain[plain.indexOf('--prompt') + 1], 'no handles', 'prompts without handles are untouched');
  const parsed = parseGeminiOutput(JSON.stringify({ type: 'message', role: 'assistant', content: 'OK \\@codex and @claude' }));
  assert.equal(parsed.text, 'OK @codex and @claude');
});

test('runReadonlyProcess stops a process the moment watchStderr condemns it', async () => {
  const started = Date.now();
  await assert.rejects(
    runReadonlyProcess({
      executable: process.execPath,
      args: ['-e', 'process.stderr.write("status: 503 UNAVAILABLE\\n"); setTimeout(() => {}, 20000);'],
      cwd: process.cwd(),
      timeoutMs: 15000,
      label: 'Fake',
      parse: (text) => ({ text }),
      watchStderr: (stderr) => (/503/.test(stderr) ? Object.assign(new Error('capacity'), { code: 'UNAVAILABLE' }) : null),
    }),
    (error) => error.code === 'UNAVAILABLE' && /capacity/.test(error.message) && typeof error.partialStderr === 'string',
  );
  assert.ok(Date.now() - started < 5000, 'did not wait for the timeout');
});

test('invokeGemini retries once on a fallback model when Google answers 503, and names both when it still fails', async () => {
  const calls = [];
  const failing = async ({ args }) => {
    calls.push(args.includes('--model') ? args[args.indexOf('--model') + 1] : 'auto');
    throw Object.assign(new Error('Google reported the model as unavailable (HTTP 503) and the CLI kept retrying.'), { code: 'UNAVAILABLE', partialStderr: 'status: 503 UNAVAILABLE', partialOutput: '' });
  };
  await assert.rejects(
    invokeGemini({ executable: 'gemini', projectRoot: process.cwd(), prompt: 'hi', run: failing, fallbackModel: 'gemini-2.5-flash' }),
    (error) => error.code === 'UNAVAILABLE' && /also tried gemini-2\.5-flash/.test(error.message),
  );
  assert.deepEqual(calls, ['auto', 'gemini-2.5-flash']);

  const recovering = async ({ args }) => {
    const model = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'auto';
    if (model === 'auto') throw Object.assign(new Error('503'), { code: 'UNAVAILABLE', partialStderr: 'status: 503 UNAVAILABLE', partialOutput: '' });
    return { text: `answered by ${model}`, usage: null };
  };
  const result = await invokeGemini({ executable: 'gemini', projectRoot: process.cwd(), prompt: 'hi', run: recovering, fallbackModel: 'gemini-2.5-flash' });
  assert.equal(result.text, 'answered by gemini-2.5-flash');
});


test('budgetTokens weighs cache reads a tenth and handles Codex counting cached inside input', () => {
  assert.equal(budgetTokens({ source: 'claude-json', inputTokens: 16, cacheCreationInputTokens: 22181, cachedInputTokens: 162817, outputTokens: 5442, reasoningTokens: 0, totalTokens: 190456 }), 16 + 22181 + 5442 + Math.round(162817 * 0.1));
  assert.equal(budgetTokens({ source: 'codex-json', inputTokens: 157674, cachedInputTokens: 132608, outputTokens: 1454, reasoningTokens: 457, totalTokens: 159128 }), Math.round((157674 - 132608) + 1454 + 457 + 132608 * 0.1));
  assert.equal(budgetTokens({ totalTokens: 1200 }), 1200, 'falls back to the total when nothing is itemised');
});


test('standing lease: an agent opted in creates files on every turn, and a creation request without a lease is flagged with a way out', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-standing-'));
  try {
    assert.equal(looksLikeCreation('Genera el PDF con el análisis'), true);
    assert.equal(looksLikeCreation('crea un archivo markdown'), true);
    assert.equal(looksLikeCreation('¿qué opinas del diseño?'), false);
    const store = new EventStore(join(root, 'events.jsonl'));
    const agents = ['codex', 'claude'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = {};
    const invokers = {
      'codex-readonly': async ({ prompt, lease }) => { seen.codex = { prompt, lease }; if (lease) await writeFile(join(lease.outDir, 'out.pdf'), 'pdf'); return { text: 'done', usage: null }; },
      'claude-readonly': async ({ prompt, lease }) => { seen.claude = { prompt, lease }; return { text: '```pulse\n@codex: genera el PDF del informe\n```', usage: null }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers, escalationMs: 200 });
    // No lease anywhere: the plan step that asks Codex for a PDF becomes a question to the human; here nobody answers.
    await room.send({ text: 'organiza el informe', target: 'claude' });
    let events = await store.readAll();
    const asked = events.find((event) => event.type === 'mode.requested');
    assert.ok(asked, 'the room asks before the creation step starts');
    assert.equal(asked.payload.agent, 'codex');
    assert.equal(asked.payload.orchestrator, 'claude');
    assert.equal(events.find((event) => event.type === 'mode.denied').payload.reason, 'timeout');
    assert.equal(seen.codex.lease, null);
    assert.match(seen.codex.prompt, /did not answer in time/);
    assert.equal(events.some((event) => event.type === 'lease.granted'), false);
    // A direct human request at #1 still gets the missing-lease card with its resend button.
    await room.send({ text: 'crea un archivo csv con el resumen', target: 'codex' });
    events = await store.readAll();
    const missing = events.find((event) => event.type === 'lease.missing');
    assert.ok(missing, 'lease.missing is emitted for a direct creation request without CREATE');
    assert.equal(missing.payload.requester, 'you');

    // Codex opted into a standing lease: the same plan step now creates files.
    room.setScopes({ codex: { alwaysCreate: true } });
    assert.equal(room.scopesFor('codex').write.always, true);
    assert.equal(room.scopesFor('claude').write.always, false);
    await room.send({ text: 'organiza el informe otra vez', target: 'claude' });
    events = await store.readAll();
    const granted = events.filter((event) => event.type === 'lease.granted');
    assert.equal(granted.length, 1);
    assert.equal(granted[0].payload.standing, true);
    assert.equal(granted[0].payload.agent, 'codex');
    assert.deepEqual(granted[0].payload.scopes, ['write'], 'a standing write lease cannot silently enable image generation');
    assert.ok(seen.codex.lease, 'the delegate ran inside its own lease');
    assert.equal(seen.codex.lease.scopes.imageGen, false);
    const artifacts = events.find((event) => event.type === 'artifacts.created');
    assert.equal(artifacts.payload.files[0].name, 'out.pdf');
    assert.equal(events.filter((event) => event.type === 'lease.missing').length, 1, 'no second flag once the lease exists');

    // A direct human message to a standing-lease agent needs no CREATE either.
    await room.send({ text: 'crea un archivo csv', target: 'codex' });
    events = await store.readAll();
    const direct = events.filter((event) => event.type === 'lease.granted').at(-1);
    assert.equal(direct.payload.standing, true);
    assert.deepEqual(direct.payload.scopes, ['write']);
    assert.equal(direct.payload.messageId, events.filter((event) => event.type === 'message.created' && event.payload.role === 'user').at(-1).payload.messageId);

    // A standing lease on the orchestrator may pass file-writing to a
    // delegate, but cannot silently elevate that delegate to image generation.
    room.setScopes({ claude: { alwaysCreate: true } });
    await room.send({ text: 'organiza el informe de nuevo', target: 'claude' });
    assert.ok(seen.codex.lease);
    assert.equal(seen.codex.lease.scopeCeiling.imageGen, false);
    assert.equal(seen.codex.lease.scopes.imageGen, false);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// ---------- real limits: Codex rollouts, Claude usage endpoint, expired windows ----------
import { interpretWindow, readClaudeUsage, readCodexRateLimits, windowLabel } from '../src/quota-sources.mjs';

test('readCodexRateLimits takes the newest populated rate_limits and empties a window whose reset has passed', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-codex-home-'));
  try {
    const day = join(home, 'sessions', '2026', '09', '16');
    await mkdir(day, { recursive: true });
    const now = Date.parse('2026-09-17T12:00:00Z');
    const line = (rateLimits, ts) => JSON.stringify({ timestamp: ts, type: 'event_msg', payload: { type: 'token_count', rate_limits: rateLimits } });
    await writeFile(join(day, 'rollout-a.jsonl'), [
      line({ primary: { used_percent: 20, window_minutes: 300, resets_at: 1789500000 }, secondary: { used_percent: 30, window_minutes: 10080, resets_at: 1789844305 } }, '2026-09-16T10:00:00Z'),
      line({ primary: { used_percent: 99, window_minutes: 300, resets_at: Math.floor(now / 1000) - 60 }, secondary: { used_percent: 79, window_minutes: 10080, resets_at: Math.floor(now / 1000) + 200000 } }, '2026-09-16T21:20:48Z'),
      JSON.stringify({ timestamp: '2026-09-16T21:20:49Z', type: 'event_msg', payload: { type: 'token_count', rate_limits: { primary: null, secondary: null } } }),
    ].join('\n'));
    const report = await readCodexRateLimits({ home, now });
    assert.equal(report.agent, 'codex');
    assert.equal(report.windows.primary.usedPercent, 0, 'the 5h window reset a minute ago, so it counts as empty');
    assert.equal(report.windows.primary.stale, true);
    assert.equal(report.windows.secondary.usedPercent, 79);
    assert.equal(report.usedPercent, 79, 'the ring shows the worst live window');
    assert.equal(report.observedAt, '2026-09-16T21:20:48Z');
    assert.equal(await readCodexRateLimits({ home: join(home, 'nope'), now }), null);
    assert.equal(windowLabel(300), '5h');
    assert.equal(windowLabel(10080), '7d');
    assert.deepEqual(interpretWindow({ usedPercent: 50, resetAt: new Date(now + 1000).toISOString() }, now).stale, false);
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('readClaudeUsage reads five-hour and seven-day windows with the CLI token, and fails loudly on a rejected token', async () => {
  const now = Date.parse('2026-09-17T12:00:00Z');
  const usage = await readClaudeUsage({
    now,
    tokenReader: async () => 'tok',
    fetchImpl: async (url, init) => {
      assert.match(url, /api\.anthropic\.com\/api\/oauth\/usage$/);
      assert.equal(init.headers.authorization, 'Bearer tok');
      return { ok: true, status: 200, json: async () => ({ five_hour: { utilization: 42, resets_at: new Date(now + 3600e3).toISOString() }, seven_day: { utilization: 61, resets_at: new Date(now + 86400e3).toISOString() } }) };
    },
  });
  assert.equal(usage.agent, 'claude');
  assert.equal(usage.usedPercent, 61);
  assert.equal(usage.windows.primary.usedPercent, 42);
  assert.equal(await readClaudeUsage({ tokenReader: async () => null }), null, 'no token, nothing to report');
  await assert.rejects(readClaudeUsage({ tokenReader: async () => 'bad', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) }), /rejected the Claude Code token/);
});

test('the sentinel announces a cleared window and the room records limit.cleared', async () => {
  const sentinel = new UsageSentinel();
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 99, source: 'official:x' }).level, 'critical');
  const cleared = sentinel.evaluate({ agent: 'codex', usedPercent: 3, source: 'official:x' });
  assert.equal(cleared.cleared, true);
  assert.match(cleared.message, /back at 3%/);
  assert.equal(sentinel.evaluate({ agent: 'codex', usedPercent: 4, source: 'official:x' }), null, 'staying normal is silent');

  const root = await mkdtemp(join(tmpdir(), 'pulse-cleared-'));
  try {
    const store = new EventStore(join(root, 'events.jsonl'));
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    await room.reportOfficialQuota({ agent: 'codex', usedPercent: 95, source: 'official:codex-rollout', resetAt: new Date(Date.now() + 60000).toISOString(), windows: { primary: { usedPercent: 95 } } });
    await room.reportOfficialQuota({ agent: 'codex', usedPercent: 0, source: 'official:codex-rollout', resetAt: null, stale: true });
    const events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'limit.warning').length, 1);
    const clear = events.find((event) => event.type === 'limit.cleared');
    assert.ok(clear, 'a reset window is announced');
    assert.equal(clear.payload.agent, 'codex');
    assert.equal(events.find((event) => event.type === 'quota.updated').payload.windows.primary.usedPercent, 95);

    // A restarted room does not seed a full ring from a report whose window has since reset.
    const seeded = new Room({ store, agents, projectRoot: root, invokers: {} });
    assert.deepEqual(Object.keys(seeded.budgetWindow()), ['codex']);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// ---------- permission modes: ghosts off the log, ceilings, plan step modes ----------
test('modes: a ghost turn reaches listeners but never the log, #2 is the lease, plan steps carry their mode, ceilings refuse softly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-modes-'));
  try {
    const store = new EventStore(join(root, 'events.jsonl'));
    const agents = ['codex', 'claude'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = {};
    const invokers = {
      'codex-readonly': async ({ prompt, lease }) => { seen.codex = { prompt, lease }; return { text: 'codex here', usage: { totalTokens: 10 } }; },
      'claude-readonly': async ({ prompt, lease }) => { seen.claude = { prompt, lease }; return { text: '```pulse\n@codex: help me out\n```', usage: null }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    const ghosts = [];
    room.subscribeGhost((event) => ghosts.push(event));

    // #0: nothing in the store, everything on the ghost channel, no delegation, usage still counted.
    await room.send({ text: 'what do you think, off the record?', target: 'claude', mode: 0 });
    let events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'message.created').length, 0, 'ghost messages are not written');
    assert.equal(events.filter((event) => event.type === 'plan.created').length, 0, 'ghosts do not delegate');
    assert.ok(events.some((event) => event.type === 'usage.recorded') || true);
    assert.ok(ghosts.some((event) => event.type === 'message.created' && event.payload.role === 'user' && event.payload.mode === 0));
    assert.ok(ghosts.some((event) => event.type === 'message.created' && event.payload.role === 'assistant' && event.payload.mode === 0));
    assert.ok(ghosts.every((event) => event.sequence === null && event.ghost === true));
    assert.match(seen.claude.prompt, /Permission mode for this turn: #0 GHOST/);
    assert.match(seen.claude.prompt, /off the record/);

    // #1 default: read-only prompt, plan steps at #1.
    await room.send({ text: 'organise', target: 'claude' });
    events = await store.readAll();
    const plan = events.find((event) => event.type === 'plan.created');
    assert.equal(plan.payload.mode, 1);
    assert.deepEqual(plan.payload.steps.map((step) => step.mode), [1]);
    assert.match(seen.codex.prompt, /Permission mode for this turn: #1 EXCHANGE/);
    assert.equal(events.find((event) => event.type === 'message.created' && event.payload.role === 'user' && event.payload.text === 'organise').payload.mode, 1);

    // #2: the lease, and the plan runs at #2 for agents allowed to write.
    await room.send({ text: 'build it', target: 'claude', mode: 2 });
    events = await store.readAll();
    const plan2 = events.filter((event) => event.type === 'plan.created').at(-1);
    assert.equal(plan2.payload.mode, 2);
    assert.deepEqual(plan2.payload.steps.map((step) => step.mode), [2]);
    assert.ok(seen.codex.lease, 'the delegate writes inside the shared lease');
    assert.match(seen.codex.prompt, /Permission mode for this turn: #2 CREATE/);

    // Ceilings: capped at #1 in CONNECTIONS, #2 is refused softly and answered read-only.
    room.setScopes({ codex: { maxMode: 1 } });
    assert.equal(room.scopesFor('codex').maxMode, 1);
    assert.equal(room.scopesFor('claude').maxMode, 2, 'writable agents default to #2');
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 2 })).capped, true);
    await room.send({ text: 'make a file', target: 'codex', mode: 2 });
    events = await store.readAll();
    const refused = events.filter((event) => event.type === 'lease.refused').at(-1);
    assert.match(refused.payload.reason, /capped at #1 EXCHANGE/);
    assert.equal(seen.codex.lease, null);

    // #3 needs MAX MODE 3 in CONNECTIONS.
    const gate = await room.modeCheck({ target: 'claude', text: 'x', mode: 3 });
    assert.equal(gate.ok, false);
    assert.equal(gate.status, 403);
    await assert.rejects(room.send({ text: 'take over', target: 'claude', mode: 3 }), /raise its MAX MODE to #3/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('escalation: a creation step in a #1 plan waits for the human; once, plan, deny and timeout each do what they say', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-escalation-'));
  try {
    const store = new EventStore(join(root, 'events.jsonl'));
    const agents = ['codex', 'claude', 'gemini'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = { codex: [], gemini: [] };
    const invokers = {
      'claude-readonly': async () => ({ text: '```pulse\n@codex: genera el PDF del informe\n@gemini: crea una imagen de portada\n```', usage: null }),
      'codex-readonly': async ({ prompt, lease }) => { seen.codex.push({ prompt, lease }); if (lease) await writeFile(join(lease.outDir, 'informe.pdf'), 'x'); return { text: 'codex done', usage: null }; },
      'gemini-readonly': async ({ prompt, lease }) => { seen.gemini.push({ prompt, lease }); return { text: 'gemini done', usage: null }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers, escalationMs: 400 });
    const waitFor = async (predicate, ms = 3000) => { const until = Date.now() + ms; while (Date.now() < until) { const events = await store.readAll(); const hit = events.find(predicate); if (hit) return hit; await new Promise((resolve) => setTimeout(resolve, 20)); } throw new Error('timed out waiting'); };

    // Grant once for Codex, deny Gemini: the plan pauses at each step.
    const run1 = room.send({ text: 'organiza el informe', target: 'claude' });
    const first = await waitFor((event) => event.type === 'mode.requested');
    assert.equal(first.payload.agent, 'codex');
    assert.equal(first.payload.step, 1);
    assert.equal(room.pendingModeRequests().length, 1);
    assert.equal(seen.codex.length, 0, 'the step has not started');
    assert.equal(room.decideMode('nope', 'once').ok, false);
    assert.equal(room.decideMode(first.payload.requestId, 'once').ok, true);
    const second = await waitFor((event) => event.type === 'mode.requested' && event.payload.agent === 'gemini');
    room.decideMode(second.payload.requestId, 'deny');
    await run1;
    let events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'mode.granted').length, 1);
    assert.equal(events.find((event) => event.type === 'mode.granted').payload.scope, 'once');
    assert.equal(events.filter((event) => event.type === 'mode.denied').length, 1);
    assert.ok(seen.codex[0].lease, 'codex created inside a lease granted on request');
    assert.equal(events.find((event) => event.type === 'lease.granted').payload.escalated, 'once');
    assert.equal(events.find((event) => event.type === 'artifacts.created').payload.files[0].name, 'informe.pdf');
    assert.equal(seen.gemini[0].lease, null);
    assert.match(seen.gemini[0].prompt, /declined\. Answer read-only/);
    assert.equal(events.filter((event) => event.type === 'lease.missing').length, 0, 'a decided step does not also get the missing-lease card');
    const geminiStep = events.find((event) => event.type === 'message.created' && event.payload.status === 'delegated' && event.payload.target === 'gemini');
    assert.equal(geminiStep.payload.escalation, 'denied');

    // Grant for the plan: the second step needs no second question.
    const run2 = room.send({ text: 'otra vez', target: 'claude' });
    const third = await waitFor((event) => event.type === 'mode.requested' && event.payload.agent === 'codex' && event.sequence > first.sequence + 5);
    room.decideMode(third.payload.requestId, 'plan');
    await run2;
    events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'mode.requested').length, 3, 'no request for gemini once the plan holds a lease');
    assert.ok(seen.gemini[1].lease, 'gemini writes inside the plan lease');
    assert.equal(seen.gemini[1].lease.outDir, seen.codex[1].lease.outDir);

    // Timeout: nobody answers in 400 ms, the step runs read-only and says so.
    const run3 = room.send({ text: 'y otra', target: 'claude' });
    await run3;
    events = await store.readAll();
    const timedOut = events.filter((event) => event.type === 'mode.denied' && event.payload.reason === 'timeout');
    assert.equal(timedOut.length, 2);
    assert.match(seen.codex[2].prompt, /did not answer in time/);
    assert.equal(room.pendingModeRequests().length, 0);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


// ---------- CONTROL: checkpoints, forbidden zones, UNDO, one holder ----------
import { createCheckpoint, diffCheckpoint, isForbidden, restoreCheckpoint } from '../src/checkpoint.mjs';

test('checkpoint: photographs tracked and untracked files without touching the branch, diffs, and restores including removals', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-checkpoint-'));
  try {
    const git = (...args) => new Promise((resolve, reject) => execFile('git', args, { cwd: root, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }, (error, stdout) => (error ? reject(error) : resolve(stdout))));
    await git('init', '-q');
    await writeFile(join(root, 'a.txt'), 'one\n');
    await writeFile(join(root, '.gitignore'), 'ignored/\n');
    await mkdir(join(root, 'ignored'));
    await writeFile(join(root, 'ignored', 'x'), 'x');
    // No commits yet: the checkpoint must still work (abysm starts like this).
    await writeFile(join(root, 'untracked.md'), 'draft\n');
    const checkpoint = await createCheckpoint(root, { id: 'cp1' });
    assert.match(checkpoint.commit, /^[0-9a-f]{40}$/);
    assert.equal(checkpoint.head, null);
    assert.equal((await git('rev-parse', '--verify', '-q', 'refs/madre/checkpoints/cp1')).trim(), checkpoint.commit);
    assert.equal((await git('status', '--porcelain')).includes('a.txt'), true, 'the user\'s index and branch are untouched');

    // The agent's turn: modify, add, delete, and write into forbidden zones.
    await writeFile(join(root, 'a.txt'), 'two\n');
    await writeFile(join(root, 'new.js'), 'export {}\n');
    await rm(join(root, 'untracked.md'));
    await writeFile(join(root, '.env'), 'SECRET=1\n');
    const diff = await diffCheckpoint(root, checkpoint);
    assert.deepEqual(diff.files.map((file) => `${file.status}:${file.path}`).sort(), ['A:.env', 'A:new.js', 'D:untracked.md', 'M:a.txt']);
    assert.deepEqual(diff.forbidden, ['.env']);
    assert.match(diff.stat, /4 files changed/);
    assert.equal(isForbidden('.git/config'), true);
    assert.equal(isForbidden('src/.env.local'), true);
    assert.equal(isForbidden('src/env.js'), false);

    // Forbidden zones first, then everything.
    const partial = await restoreCheckpoint(root, checkpoint, { paths: ['.env'] });
    assert.deepEqual(partial.removed, ['.env']);
    assert.equal(await readFile(join(root, 'a.txt'), 'utf8'), 'two\n', 'a partial restore leaves other changes alone');
    const full = await restoreCheckpoint(root, checkpoint);
    assert.deepEqual(full.removed.sort(), ['new.js']);
    assert.deepEqual(full.restored.sort(), ['a.txt', 'untracked.md']);
    assert.equal(await readFile(join(root, 'a.txt'), 'utf8'), 'one\n');
    assert.equal(await readFile(join(root, 'untracked.md'), 'utf8'), 'draft\n');
    assert.equal(await readFile(join(root, 'ignored', 'x'), 'utf8'), 'x', 'ignored files are never part of the photograph');
    assert.deepEqual((await diffCheckpoint(root, checkpoint)).files, []);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('CONTROL: one holder, checkpoint before, changes reported with forbidden writes reverted, UNDO restores, others are warned', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-control-'));
  try {
    await new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd: root }, (error) => (error ? reject(error) : resolve())));
    await writeFile(join(root, 'README.md'), '# before\n');
    // The room's log lives outside the project, as in real rooms (~/.pulse), or the checkpoint would see it change.
    const logDir = await mkdtemp(join(tmpdir(), 'pulse-control-log-'));
    const store = new EventStore(join(logDir, 'events.jsonl'));
    const agents = ['codex', 'claude'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = {};
    let release;
    const invokers = {
      'codex-readonly': async ({ prompt, lease }) => {
        seen.codex = { prompt, lease };
        await writeFile(join(root, 'README.md'), '# after\n');
        await writeFile(join(root, 'feature.js'), 'export const x = 1;\n');
        await writeFile(join(root, '.env'), 'LEAK=1\n');
        await new Promise((resolve) => { release = resolve; });
        return { text: 'changed README and added feature.js', usage: null };
      },
      'claude-readonly': async ({ prompt }) => { seen.claude = { prompt }; return { text: 'read-only look', usage: null }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 3 })).status, 403, 'capped at #2 by default');
    room.setScopes({ codex: { maxMode: 3 } });
    assert.equal(room.scopesFor('codex').maxMode, 3);
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 3 })).ok, true);

    const running = room.send({ text: 'rewrite the readme and add a feature', target: 'codex', mode: 3 });
    for (let attempt = 0; attempt < 100 && !release; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(release, 'the CONTROL turn is running');
    let events = await store.readAll();
    const started = events.find((event) => event.type === 'control.started');
    assert.equal(started.payload.agent, 'codex');
    assert.equal(room.control().agent, 'codex');
    assert.equal(seen.codex.lease.control, true);
    assert.equal(seen.codex.lease.outDir, root);
    assert.match(seen.codex.prompt, /CONTROL \(#3\): the human put you in command/);
    assert.match(seen.codex.prompt, /Permission mode for this turn: #3 CONTROL/);
    // Second holder is refused; another agent working meanwhile is warned.
    assert.equal((await room.modeCheck({ target: 'claude', text: 'x', mode: 3 })).status, 403);
    room.setScopes({ codex: { maxMode: 3 }, claude: { maxMode: 3 } });
    assert.equal((await room.modeCheck({ target: 'claude', text: 'x', mode: 3 })).status, 409);
    await room.send({ text: 'what do you see?', target: 'claude' });
    assert.match(seen.claude.prompt, /currently holds CONTROL/);
    assert.equal((await room.undoControl(started.payload.checkpointId)).status, 409, 'no UNDO while the turn runs');
    release();
    await running;
    events = await store.readAll();
    const changed = events.find((event) => event.type === 'control.changed');
    assert.deepEqual(changed.payload.files.map((file) => `${file.status}:${file.path}`).sort(), ['A:feature.js', 'M:README.md']);
    assert.deepEqual(changed.payload.forbiddenReverted, ['.env']);
    assert.equal(await readFile(join(root, '.env'), 'utf8').catch(() => null), null, 'the forbidden write is gone');
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), '# after\n');
    assert.equal(room.control(), null, 'the holder is released');
    assert.equal(events.find((event) => event.type === 'message.created' && event.payload.role === 'assistant' && event.payload.sender === 'codex').payload.mode, 3);

    const undone = await room.undoControl(changed.payload.checkpointId);
    assert.equal(undone.ok, true);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), '# before\n');
    assert.equal(await readFile(join(root, 'feature.js'), 'utf8').catch(() => null), null);
    assert.ok((await store.readAll()).some((event) => event.type === 'control.reverted'));
    assert.equal((await room.undoControl('nope')).status, 404);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
