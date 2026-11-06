// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildGrokArgs, grokEnvironment, grokFailure, grokProgress, invokeGrok, parseGrokModels, parseGrokOutput, parseGrokStatus, READ_TOOLS } from '../src/adapters/grok.mjs';
import { capabilityOf, resolveScopes } from '../src/capabilities.mjs';
import { installPlanFor, loginPlanFor, deviceCodeIn } from '../src/auth-probe.mjs';
import { parseMessage } from '../src/router.mjs';
import { discoverModels } from '../src/models.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';

// Recorded from the real CLI (Grok Build 1.0.77, 2026-11-06), with the project's path written /p.
const fixture = (name) => readFileSync(join(import.meta.dirname, 'fixtures', `grok-${name}.jsonl`), 'utf8');
const value = (args, flag) => args[args.indexOf(flag) + 1];

test('grok · a reading turn is given only the tools that read, and nobody\'s rule can give it more', () => {
  const args = buildGrokArgs({ projectRoot: '/p', promptFile: '/t/prompt.md', model: 'grok-4.7', environment: {} });
  assert.equal(value(args, '--prompt-file'), '/t/prompt.md');
  assert.ok(args.includes('--verbatim'), 'a message that starts with «/» is not a Grok command');
  assert.equal(value(args, '--output-format'), 'streaming-messages-json');
  assert.equal(value(args, '--cwd'), '/p');
  // The one wall that holds against the person's Claude rules (tried 2026-11-06): no terminal, no edits.
  assert.equal(value(args, '--tools'), 'read_file,list_dir,grep');
  assert.deepEqual(READ_TOOLS, ['read_file', 'list_dir', 'grep']);
  assert.equal(value(args, '--disallowed-tools'), 'search_tool,use_tool');
  // One rule per --deny: «Bash Write(.env)» in one value was read as a tool called «Bash Write».
  const denied = args.flatMap((arg, index) => (arg === '--deny' ? [args[index + 1]] : []));
  assert.deepEqual(denied, ['Bash', 'Edit', 'Write']);
  assert.ok(denied.every((rule) => !/\s/.test(rule)));
  assert.equal(value(args, '--sandbox'), 'read-only');
  for (const flag of ['--no-subagents', '--disable-web-search', '--no-memory', '--no-wait-for-background', '--no-auto-update']) assert.ok(args.includes(flag), flag);
  // Nothing that would run without asking, and the folder is not trusted for good.
  for (const flag of ['--always-approve', '--yolo', '--trust', '--permission-mode', '-p', '--single']) assert.ok(!args.includes(flag), flag);
  assert.equal(value(args, '--model'), 'grok-4.7');
  assert.ok(!buildGrokArgs({ projectRoot: '/p', promptFile: '/f', model: null, environment: {} }).includes('--model'));
  assert.ok(!buildGrokArgs({ projectRoot: '/p', promptFile: '/f', model: 'default', environment: {} }).includes('--model'));
  // Where the sandbox cannot start, the person can leave it out; --tools still holds.
  const bare = buildGrokArgs({ projectRoot: '/p', promptFile: '/f', environment: { PULSE_GROK_SANDBOX: 'off' } });
  assert.ok(!bare.includes('--sandbox') && bare.includes('--tools'));
});

test('grok · a turn loads nothing of Claude\'s or Cursor\'s, never updates the CLI, and keeps Grok\'s memory off', () => {
  const env = grokEnvironment({ PATH: '/bin' });
  assert.equal(env.PATH, '/bin');
  for (const vendor of ['CLAUDE', 'CURSOR']) {
    for (const surface of ['AGENTS', 'HOOKS', 'MCPS', 'RULES', 'SKILLS']) assert.equal(env[`GROK_${vendor}_${surface}_ENABLED`], 'false', `${vendor} ${surface}`);
  }
  assert.equal(env.GROK_DISABLE_AUTOUPDATER, '1');
  assert.equal(env.GROK_MEMORY, '0');
});

test('grok · the answer, its tokens and its cost come from the closing result; a cost of 0 is unknown', () => {
  const answer = parseGrokOutput(fixture('answer'));
  assert.equal(answer.text, 'hola');
  assert.equal(answer.error, undefined);
  assert.equal(answer.usage.inputTokens, 7616);
  assert.equal(answer.usage.cachedInputTokens, 10112);
  assert.equal(answer.usage.outputTokens, 45);
  assert.equal(answer.usage.totalTokens, 7616 + 10112 + 45);
  assert.equal(answer.usage.costUsd, 0.020558);
  assert.equal(answer.usage.source, 'grok-json');
  assert.ok(grokProgress(fixture('answer')).chars >= 4);
  // A write refused by an explicit denial: the turn goes on and says so.
  const denied = parseGrokOutput(fixture('denied'));
  assert.match(denied.text, /denegadas por la política de permisos/);
  assert.equal(denied.error, undefined);
  // Free is never inferred from a zero.
  const zero = parseGrokOutput('{"type":"result","subtype":"success","is_error":false,"result":"x","total_cost_usd":0.0,"usage":{"input_tokens":1,"output_tokens":1}}\n');
  assert.equal(zero.usage.costUsd, null);
});

test('grok · a step that needed an approval, a stop and a refused account answer nothing and say why', () => {
  const cancelled = parseGrokOutput(fixture('cancelled'));
  assert.equal(cancelled.text, '');
  assert.match(cancelled.error, /approval that a turn cannot give|aprobación que un turno no puede dar/);
  const stopped = parseGrokOutput(fixture('stopped'));
  assert.equal(stopped.text, '');
  assert.ok(stopped.error);
  const refused = parseGrokOutput(JSON.stringify({ type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['Internal error: {"message":"API error (status 403 Forbidden): permission-denied: Access to the chat endpoint is denied.","http_status":403}'] }));
  assert.match(refused.error, /grok logout|grok login/);
  assert.match(grokFailure('Not signed in. Run `grok login` to authenticate'), /grok login/);
  assert.equal(grokFailure('something else'), null);
  // Cut short before its close: what it had written is all there is.
  assert.equal(parseGrokOutput('{"type":"assistant","message":{"content":[{"type":"text","text":"a medias"}]},"parent_tool_use_id":null}\n').text, 'a medias');
});

test('grok · `grok models` says whether there is a session and lists the account\'s models', () => {
  const signedIn = 'You are logged in with grok.com.\n\nDefault model: grok-4.7\n\nAvailable models:\n  * grok-4.7 (default)\n  - grok-4.7-build-fast\n  - grok-4.6\n  - grok-4.5\n';
  const signedOut = 'You are not authenticated.\n\nDefault model: grok-4.6\n\nAvailable models:\n  * grok-4.6 (default)\n  - grok-4.5\n';
  assert.deepEqual(parseGrokModels(signedIn), { models: ['grok-4.7', 'grok-4.7-build-fast', 'grok-4.6', 'grok-4.5'], default: 'grok-4.7' });
  assert.deepEqual(parseGrokStatus(signedIn, {}), { state: 'signed-in', detail: 'grok.com' });
  assert.equal(parseGrokStatus(signedOut, {}).state, 'signed-out');
  assert.equal(parseGrokStatus(signedOut, { XAI_API_KEY: 'k' }).detail, 'via XAI_API_KEY');
  assert.equal(parseGrokStatus('', {}).state, 'unknown');
});

test('grok · it reads at #1 at most, signs in with a code, installs from npm, and is written to by name', async () => {
  const can = capabilityOf('grok');
  assert.equal(can.read, true);
  assert.equal(can.write, false);
  assert.equal(resolveScopes('grok', { maxMode: 4 }).maxMode, 1, 'no lease ever reaches it');
  const agent = { id: 'grok', path: '/bin/grok', detected: true };
  const login = loginPlanFor(agent);
  assert.deepEqual(login.args, ['login', '--device-auth']);
  assert.equal(login.deviceCode, true);
  // What `grok login` printed on 2026-11-06: the code alone on its line.
  assert.equal(deviceCodeIn('  HPJ3-B9NC'), 'HPJ3-B9NC');
  assert.equal(installPlanFor(agent).package, '@xai-official/grok');
  assert.equal(parseMessage('@grok revisa esto').target, 'grok');
  const models = await discoverModels({ agents: [{ id: 'grok', detected: true }], listGrok: async () => ({ models: ['grok-4.7', 'grok-4.6'], default: 'grok-4.7' }) });
  assert.deepEqual(models.grok.models, ['grok-4.7', 'grok-4.6']);
  assert.equal(models.grok.default, 'grok-4.7');
  const unread = await discoverModels({ agents: [{ id: 'grok', detected: true }] });
  assert.deepEqual(unread.grok.models, []);
});

test('grok · only the program that says «grok <version> (<build>)» is spoken to', async () => {
  const finder = async (candidates) => (candidates.includes('grok') ? '/bin/grok' : null);
  const env = { PATH: '/bin', HOME: await mkdtemp(join(tmpdir(), 'madre-grok-home-')) };
  const real = await mkdtemp(join(tmpdir(), 'madre-grok-bin-'));
  const official = join(real, 'grok');
  await writeFile(official, '#!/bin/sh\necho "grok 1.0.77 (50ca579fa996)"\n');
  await chmod(official, 0o755);
  const other = join(real, 'grok-dev');
  await writeFile(other, '#!/bin/sh\necho "1.1.7"\n');
  await chmod(other, 0o755);
  const found = (path) => detectAgents({ env: { ...env, PULSE_HOME: env.HOME }, keyPresent: async () => false, finder: async (candidates) => (candidates.includes('grok') ? path : await finder([])) });
  const ours = (await found(official)).find((one) => one.id === 'grok');
  assert.equal(ours.ready, true);
  assert.equal(ours.adapter, 'grok-readonly');
  assert.ok(!ours.foreign);
  const theirs = (await found(other)).find((one) => one.id === 'grok');
  assert.equal(theirs.detected, true);
  assert.equal(theirs.ready, false);
  assert.equal(theirs.foreign, true);
});

test('grok · the message goes in a file only the person reads, and the file goes with the turn', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-grok-fake-'));
  const fake = join(dir, 'grok');
  const seen = join(dir, 'seen.json');
  // A stand-in for the CLI: it records what it was given and answers as Grok does.
  await writeFile(fake, `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
const file = args[args.indexOf('--prompt-file') + 1];
const mode = (fs.statSync(file).mode & 0o777).toString(8);
fs.writeFileSync(${JSON.stringify(seen)}, JSON.stringify({ args, file, mode, prompt: fs.readFileSync(file, 'utf8'), env: { claude: process.env.GROK_CLAUDE_HOOKS_ENABLED } }));
process.stdout.write(${JSON.stringify(fixture('answer'))});
`);
  await chmod(fake, 0o755);
  const result = await invokeGrok({ executable: fake, projectRoot: dir, prompt: '/workflow list', timeoutMs: 20000 });
  assert.equal(result.text, 'hola');
  const record = JSON.parse(await readFile(seen, 'utf8'));
  assert.equal(record.prompt, '/workflow list');
  assert.equal(record.mode, '600');
  assert.equal(record.env.claude, 'false');
  await assert.rejects(readFile(record.file), 'the message is removed after the turn');
});

test('grok · it is never taught to ask for a mode it cannot be given, and the room offers it none (2026-11-06)', async () => {
  const { promptParts } = await import('../src/room/prompt.mjs');
  const base = { text: 'crea z.txt', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [] }, mode: 1 };
  const said = (id) => promptParts({ ...base, agent: { id } }).find((part) => part.id === 'mode').text;
  // From MADRE on 2026-11-06 it answered «I need #4 for 5 min» and the room offered to grant it.
  assert.doesNotMatch(said('grok'), /I need #/);
  assert.match(said('grok'), /you read at every mode/);
  assert.match(said('codex'), /I need #3 for 15 min/, 'an agent that writes still learns how to ask');
  assert.doesNotMatch(said('codex'), /you read at every mode/);
  const page = readFileSync(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(page, /if \(wanted >= 2 && !canWrite\(agent\)\) return null;/);
  const room = readFileSync(join(import.meta.dirname, '..', 'src', 'room.mjs'), 'utf8');
  assert.match(room, /capabilityOf\(agent\.id\)\.write && looksLikeCreation\(text\)/);
});

test('grok · Settings › Agents says it reads at every mode, with no ceiling to change and no «Create» to unlock', async () => {
  const page = readFileSync(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // Only when the capability is known to be missing: an agent whose capabilities did not load yet is not called read-only.
  assert.match(page, /const readsOnly = Boolean\(agentScopes\.write\) && !agentScopes\.write\.capable;/);
  assert.match(page, /readsOnly\s*\? sxRow\(modes, t\('Max mode'\), t\('#1 CHAT ONLY · in MADRE this agent reads and answers; no mode lets it write\.'\)\)/);
  assert.match(page, /if \(readsOnly\) sxRow\(modes, t\('Starting mode'\), t\('Always #1: every message to it is answered by reading\.'\)\);/);
  const { ES } = await import('../public/es.js');
  assert.ok(ES['#1 CHAT ONLY · in MADRE this agent reads and answers; no mode lets it write.']);
  assert.ok(ES['Always #1: every message to it is answered by reading.']);
});
