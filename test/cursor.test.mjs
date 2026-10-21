import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCursorArgs, cursorEnvironment, parseCursorOutput, READONLY_CONFIG } from '../src/adapters/cursor.mjs';
import { parseCursorStatus, loginPlanFor, installPlanFor } from '../src/auth-probe.mjs';
import { capabilityOf } from '../src/capabilities.mjs';
import { parseMessage } from '../src/router.mjs';

// Cursor (2026-10-17): it reads and answers, in its own read-only mode, whatever its settings say.
test('cursor · a reading turn runs headless in ask mode, in the project, never opening a browser', () => {
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
  // From 2026-10-21 it writes at the modes that allow it; no image, no web.
  const can = capabilityOf('cursor');
  assert.equal(can.read, true);
  assert.ok(can.write, 'Cursor is still held at #1');
  assert.equal(can.imageGen, false);
  assert.equal(can.web, false);
});

test('cursor · every mode: #2 and #3 write and run nothing, #4 runs commands, and no mode writes where nobody writes (2026-10-21)', async () => {
  const { cursorConfigFor } = await import('../src/adapters/cursor.mjs');
  const never = ['Write(.git/**)', 'Write(.madre/**)', 'Write(.env)', 'Write(.env.*)', 'Write(**/.env)', 'Write(**/.env.*)', 'Write(.claude/settings.local.json)'];
  // No lease: read only, as before.
  assert.equal(cursorConfigFor(null), READONLY_CONFIG);
  // #2 CREATE, with its draft folder under .pulse: writing allowed, commands denied, .pulse left to the room.
  const create = cursorConfigFor({ create: true, relativeDir: '.', scratchDir: '.pulse/out/t1' });
  assert.deepEqual(create.permissions.allow, ['Read(**)', 'Write(**)']);
  assert.deepEqual(create.permissions.deny, ['Shell(*)', ...never]);
  // #3 CONTROL, no draft folder: .pulse denied too.
  const control = cursorConfigFor({ control: true, relativeDir: '.' });
  assert.ok(control.permissions.deny.includes('Shell(*)'));
  assert.ok(control.permissions.deny.includes('Write(.pulse/**)'));
  // #4 AIRLOCK: commands allowed; the places nobody writes still denied.
  const airlock = cursorConfigFor({ control: true, airlock: true, relativeDir: '.' });
  assert.ok(airlock.permissions.allow.includes('Shell(*)'));
  assert.ok(!airlock.permissions.deny.includes('Shell(*)'));
  for (const one of never) assert.ok(airlock.permissions.deny.includes(one), `${one} is open at #4`);
  // An older lease to one folder: only that folder.
  assert.deepEqual(cursorConfigFor({ relativeDir: '.pulse/out/t2', scratchDir: '.pulse/out/t2' }).permissions.allow, ['Read(**)', 'Write(.pulse/out/t2/**)']);
  // Writing turns run in agent mode with the changes applied; reading turns stay in ask mode.
  const writing = buildCursorArgs({ projectRoot: '/p', prompt: 'x', lease: { create: true } });
  assert.ok(writing.includes('--force') && !writing.includes('--mode'));
  assert.ok(buildCursorArgs({ projectRoot: '/p', prompt: 'x' }).includes('--mode'));
});

test('cursor · the configuration a writing turn runs under is the one its mode asked for, and goes with the turn', async () => {
  const { mkdtemp, writeFile, chmod, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { invokeCursor } = await import('../src/adapters/cursor.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'madre-cursor-modes-'));
  const fake = join(dir, 'cursor-agent');
  // Answers with the arguments it got and the configuration it found.
  await writeFile(fake, `#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const config = JSON.parse(readFileSync(require('node:path').join(process.env.CURSOR_CONFIG_DIR, 'cli-config.json'), 'utf8'));
process.stdout.write(JSON.stringify({ type: 'result', result: JSON.stringify({ force: process.argv.includes('--force'), ask: process.argv.includes('ask'), allow: config.permissions.allow, deny: config.permissions.deny, dir: process.env.CURSOR_CONFIG_DIR }) }) + '\\n');
`);
  await chmod(fake, 0o755);
  try {
    const run = async (lease) => JSON.parse((await invokeCursor({ executable: fake, projectRoot: dir, prompt: 'x', lease, timeoutMs: 20000 })).text);
    const reading = await run(null);
    assert.equal(reading.ask, true);
    assert.deepEqual(reading.allow, []);
    const airlock = await run({ control: true, airlock: true, relativeDir: '.' });
    assert.equal(airlock.force, true);
    assert.ok(airlock.allow.includes('Shell(*)'));
    const { existsSync } = await import('node:fs');
    assert.equal(existsSync(airlock.dir), false, 'the turn\'s configuration outlived it');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
  // No npm package: its own installer, said as a command for a terminal; MADRE runs none of it.
  const plan = installPlanFor({ id: 'cursor' });
  assert.equal(plan.command, null, 'MADRE does not fetch and run an installer script');
  assert.equal(plan.terminal, true);
  assert.match(plan.display, /^curl https:\/\/cursor\.com\/install/);
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

test('cursor · its models are the ones the account lists, «auto» first, and nothing written by hand beside them (2026-10-21)', async () => {
  const { parseCursorModels, discoverModels } = await import('../src/models.mjs');
  const listed = 'Available models\n\nauto - Auto (default)\ngpt-5.3-codex-low - Codex 5.3 Low\ncomposer-2.5 - Composer 2.5\nclaude-opus-5-thinking-high - Claude Opus 5 1M Thinking\n\nTip: use --model <id>';
  assert.deepEqual(parseCursorModels(listed), ['auto', 'gpt-5.3-codex-low', 'composer-2.5', 'claude-opus-5-thinking-high']);
  const agents = [{ id: 'cursor', detected: true }];
  const read = await discoverModels({ agents, listCursor: async () => parseCursorModels(listed) });
  assert.deepEqual(read.cursor.models, ['auto', 'gpt-5.3-codex-low', 'composer-2.5', 'claude-opus-5-thinking-high'], 'the old names were added to the account\'s own');
  assert.equal(read.cursor.source, 'discovered');
  // Under the house each comes from, Cursor's own first: 265 names in one column could not be read.
  assert.deepEqual(read.cursor.groups.map((group) => [group.label, group.models.length]), [['Cursor', 2], ['OpenAI', 1], ['Anthropic', 1]]);
  // Unreadable: Auto, the one model every plan has.
  assert.deepEqual((await discoverModels({ agents, listCursor: async () => { throw new Error('offline'); } })).cursor.models, ['auto']);
  // A free plan, once a turn has said so: Auto alone, said as such.
  const free = await discoverModels({ agents, listCursor: async () => parseCursorModels(listed), cursorOnlyAuto: () => true });
  assert.deepEqual(free.cursor.models, ['auto']);
  assert.equal(free.cursor.onlyAuto, true);
  assert.match(free.cursor.note, /only with Auto/);
});

test('cursor · a free plan that refuses the model chosen is asked again with Auto, and keeps to it', async () => {
  const { mkdtemp, writeFile, chmod, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { invokeCursor, cursorOnlyAuto } = await import('../src/adapters/cursor.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'madre-cursor-free-'));
  const fake = join(dir, 'cursor-agent');
  // Refuses any --model as a free plan does; answers with Auto.
  await writeFile(fake, `#!/usr/bin/env node
if (process.argv.includes('--model')) { process.stderr.write('ActionRequiredError: Named models unavailable Free plans can only use Auto. Switch to Auto or upgrade plans to continue.\\n'); process.exit(1); }
process.stdout.write(JSON.stringify({ type: 'result', result: 'hola desde Auto' }) + '\\n');
`);
  await chmod(fake, 0o755);
  try {
    assert.equal(cursorOnlyAuto(), false);
    const answer = await invokeCursor({ executable: fake, projectRoot: dir, prompt: 'hola', model: 'composer-2.5', timeoutMs: 20000 });
    assert.equal(answer.text, 'hola desde Auto');
    assert.equal(cursorOnlyAuto(), true, 'the room still offers the models the plan refuses');
    // From then on it goes straight to Auto.
    assert.equal((await invokeCursor({ executable: fake, projectRoot: dir, prompt: 'otra', model: 'composer-2.5', timeoutMs: 20000 })).text, 'hola desde Auto');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('gemini · its models are the ones its key opens, by name and newest first; without a key, the usual ones and why (2026-10-21)', async () => {
  const { parseGeminiModels, discoverModels } = await import('../src/models.mjs');
  const { classify } = await import('../src/outbound.mjs');
  const google = { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-nano-banana-2.1', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-pro-latest', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/imagen-4.0', supportedGenerationMethods: ['predict'] },
  ] };
  assert.deepEqual(parseGeminiModels(google), ['auto', 'gemini-pro-latest', 'gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash']);
  const agents = [{ id: 'gemini', detected: true }];
  const read = await discoverModels({ agents, listGemini: async () => parseGeminiModels(google) });
  assert.deepEqual(read.gemini.models, ['auto', 'gemini-pro-latest', 'gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash']);
  // Signed in with a Google account and no key: the usual names, and a line that says why.
  const unread = await discoverModels({ agents });
  assert.ok(unread.gemini.models.includes('auto') && unread.gemini.models.length > 1);
  assert.match(unread.gemini.note, /usual ones/);
  // Asking Google is declared, and never read as the image model.
  assert.equal(classify('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000').id, 'gemini-models');
  assert.equal(classify('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent').id, 'image');
});
