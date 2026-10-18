import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCursorArgs, cursorEnvironment, parseCursorOutput, READONLY_CONFIG } from '../src/adapters/cursor.mjs';
import { parseCursorStatus, loginPlanFor, installPlanFor } from '../src/auth-probe.mjs';
import { capabilityOf } from '../src/capabilities.mjs';
import { parseMessage } from '../src/router.mjs';

// Cursor (2026-10-17): it reads and answers, in its own read-only mode, whatever its settings say.
test('cursor · every turn runs headless in ask mode with the sandbox on, in the project, never opening a browser', () => {
  const args = buildCursorArgs({ projectRoot: '/p', prompt: 'hola', model: 'sonnet-4' });
  assert.deepEqual(args.slice(0, 2), ['--print', '--output-format']);
  assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json');
  assert.equal(args[args.indexOf('--mode') + 1], 'ask');
  assert.ok(!args.includes('--sandbox'), 'no sandbox flag: on a Mac without Cursor\'s sandbox it ends the run at once');
  assert.equal(args[args.indexOf('--workspace') + 1], '/p');
  assert.ok(args.includes('--trust'));
  assert.equal(args[args.indexOf('--model') + 1], 'sonnet-4');
  assert.equal(args.at(-1), 'hola');
  assert.ok(!args.includes('--force') && !args.includes('--yolo'), 'nothing is run without asking');
  assert.ok(!buildCursorArgs({ projectRoot: '/p', prompt: 'x', model: 'auto' }).includes('--model'), '«auto» is Cursor choosing');
  assert.equal(cursorEnvironment({}).NO_OPEN_BROWSER, '1');
  assert.equal(cursorEnvironment({}, { configDir: '/t/c' }).CURSOR_CONFIG_DIR, '/t/c');
  // The turn's own configuration: every command and every write denied, the sandbox off.
  assert.deepEqual(READONLY_CONFIG.permissions, { allow: [], deny: ['Shell(*)', 'Write(**)'] });
  assert.equal(READONLY_CONFIG.sandbox.mode, 'disabled');
  // It does not write yet: no lease, no image, no web.
  const can = capabilityOf('cursor');
  assert.equal(can.read, true);
  assert.equal(can.write, false);
});

test('cursor · the answer is the closing result; its pieces stand in when it never came; an error answers nothing', () => {
  const lines = [
    { type: 'system', subtype: 'init', model: 'auto' },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Ho' }] } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'la.' }] } },
    { type: 'result', subtype: 'success', is_error: false, result: 'Hola.', usage: { inputTokens: 120, outputTokens: 8, cacheReadTokens: 40, cacheWriteTokens: 0 } },
  ].map((one) => JSON.stringify(one)).join('\n');
  const done = parseCursorOutput(lines);
  assert.equal(done.text, 'Hola.');
  assert.deepEqual([done.usage.inputTokens, done.usage.outputTokens, done.usage.cachedInputTokens, done.usage.source], [120, 8, 40, 'cursor-json']);
  assert.equal(parseCursorOutput(lines.split('\n').slice(0, 3).join('\n')).text, 'Hola.');
  const failed = parseCursorOutput(JSON.stringify({ type: 'result', is_error: true, result: 'Usage limit reached' }));
  assert.equal(failed.text, '');
  assert.equal(failed.error, 'Usage limit reached');
});

test('cursor · its session is read from `status`, it signs in from the room, and it is written to by name', () => {
  assert.equal(parseCursorStatus({ stdout: 'Not logged in\n' }, {}).state, 'signed-out');
  assert.equal(parseCursorStatus({ stdout: 'Not logged in\n' }, { CURSOR_API_KEY: 'k' }).state, 'signed-in');
  assert.deepEqual(parseCursorStatus({ stdout: '✓ Logged in as ana@example.com\n' }, {}), { state: 'signed-in', detail: 'as ana@example.com' });
  const login = loginPlanFor({ id: 'cursor', path: '/bin/cursor-agent' });
  assert.equal(login.headless, true);
  assert.deepEqual(login.args, ['login']);
  assert.equal(login.terminal.command, 'cursor-agent login');
  assert.equal(installPlanFor({ id: 'cursor' }), null, 'no npm package: its own installer, in a terminal');
  assert.equal(parseMessage('@cursor revisa esto').target, 'cursor');
});

// Gemini's Google sign-in (2026-10-17): Google lets a free personal account sign in and refuses it
// at the first question, so the room reads that refusal and undoes the sign-in.
test('gemini sign-in · the first question refused by Google is told apart from any other line', async () => {
  const { geminiSignIn } = await import('../src/auth-probe.mjs');
  const flow = geminiSignIn({ env: { GEMINI_CLI_HOME: '/nonexistent-madre-test' } });
  assert.equal(flow.refused('Error authenticating: IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals.'), true);
  assert.equal(flow.refused('To continue using Gemini, please migrate to the Antigravity suite of products'), true);
  assert.equal(flow.refused('Opening authentication page in your browser. Do you want to continue? [Y/n]:'), false);
  assert.equal(flow.refused('ok'), false);
});
