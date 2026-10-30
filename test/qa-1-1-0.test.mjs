import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateOpenCodeHealth, noteOpenCodeTurn, openCodeHealth } from '../src/opencode-health.mjs';
import { watchOpenCodeErrors } from '../src/adapters/opencode.mjs';
import { diagnose } from '../public/troubleshooting.js';

// What the QA of 1.1.0 found (docs/private/QA-1.1.0.md), each fixed with a test that would have caught it.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const there = (path) => stat(path).then(() => true, () => false);
const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('ACT-01 · MADRE\'s notes about OpenCode never go by a name OpenCode reads as its configuration', async () => {
  const root = await scratch('madre-oc-health-');
  await noteOpenCodeTurn(root, { ok: true, model: 'opencode/big-pickle' });
  assert.equal(await there(join(root, 'opencode.json')), false);
  assert.equal((await openCodeHealth(root)).worked.model, 'opencode/big-pickle');
  // What 1.0.5 to 1.1.0 left under the old name moves, and the old file goes.
  const old = await scratch('madre-oc-legacy-');
  await writeFile(join(old, 'opencode.json'), JSON.stringify({ problems: {}, worked: { model: 'openai/gpt-5.6-sol', at: 'x' } }));
  await migrateOpenCodeHealth(old);
  assert.equal(await there(join(old, 'opencode.json')), false);
  assert.equal((await openCodeHealth(old)).worked.model, 'openai/gpt-5.6-sol');
  // An opencode.json someone wrote there is theirs, and stays.
  const theirs = await scratch('madre-oc-theirs-');
  await writeFile(join(theirs, 'opencode.json'), JSON.stringify({ model: 'x/y' }));
  await migrateOpenCodeHealth(theirs);
  assert.equal(await there(join(theirs, 'opencode.json')), true);
});

test('ACT-02 · OpenCode\'s free limit stops the turn at once and is a known condition', () => {
  const said = 'timestamp=2026-10-30T03:59:27Z level=ERROR message="stream error" error.error="AI_APICallError: Free usage limit reached. Free models work in OpenCode"';
  const error = watchOpenCodeErrors(said);
  assert.equal(error?.code, 'FREE_LIMIT');
  assert.equal(watchOpenCodeErrors('level=ERROR message="rate limited, retrying"'), null, 'a passing rate limit is ridden out');
  assert.ok(diagnose(error.message, 'opencode').some((one) => one.id === 'opencode-free-limit'));
});

test('NUE-11 · the page hears who has a session once the probe at start comes back', async () => {
  const app = await source('public/app.js');
  const server = await source('src/server.mjs');
  assert.match(server, /room\?\.announce\?\.\('sessions\.updated'/);
  assert.match(app, /case 'sessions\.updated':[\s\S]{0,400}renderPicker\(\)/);
});

test('NUE-26 · the code editor keeps each strip in its row, so the page takes the flexible one', async () => {
  const css = await source('public/styles.css');
  for (const [part, row] of [['ed-find', 2], ['ed-goto', 3], ['ed-main', 4], ['ed-status', 5]]) {
    assert.match(css, new RegExp(`\\.code-editor > \\.${part} \\{ grid-row: ${row}; \\}`));
  }
});

test('NUE-12 · a known failure says what to do first, with its way out, and the raw words fold', async () => {
  const app = await source('public/app.js');
  assert.match(app, /'fail-detail'/);
  assert.match(app, /function failWayOut/);
  const signedOut = diagnose('unexpected status 401 Unauthorized: Missing bearer or basic authentication in header', 'codex').find((one) => one.id === 'not-signed-in');
  assert.ok(signedOut);
  assert.doesNotMatch(signedOut.remedy, /madre setup|Connect your agents screen/);
});

test('NUE-17 · OpenCode\'s answer is its last step; short narration before a tool call goes', async () => {
  const { parseOpenCodeOutput } = await import('../src/adapters/opencode.mjs');
  const line = (event) => JSON.stringify(event);
  const out = [
    line({ type: 'step_start', part: {} }),
    line({ type: 'text', part: { text: 'I\'ll take a look at the project to answer accurately.​' } }),
    line({ type: 'tool_use', part: { tool: 'read', state: { status: 'completed' } } }),
    line({ type: 'step_finish', part: {} }),
    line({ type: 'step_start', part: {} }),
    line({ type: 'text', part: { text: '## Qué es (hechos)\n\nUn sitio de una sola página, sin dependencias ni framework.' } }),
    line({ type: 'step_finish', part: {} }),
  ].join('\n');
  assert.equal(parseOpenCodeOutput(out).text, '## Qué es (hechos)\n\nUn sitio de una sola página, sin dependencias ni framework.');
  const long = 'x'.repeat(500);
  const kept = [line({ type: 'step_start', part: {} }), line({ type: 'text', part: { text: long } }), line({ type: 'step_start', part: {} }), line({ type: 'text', part: { text: 'fin' } })].join('\n');
  assert.equal(parseOpenCodeOutput(kept).text, `${long}\n\nfin`, 'a long first step is part of the answer, a paragraph apart');
});

test('NUE-21 · the templates of .env are written; every secret-bearing .env stays forbidden', async () => {
  const { isForbidden } = await import('../src/checkpoint.mjs');
  for (const path of ['.env.example', 'app/.env.sample', '.env.template', '.env.dist']) assert.equal(isForbidden(path), false, path);
  for (const path of ['.env', '.env.local', 'api/.env.production', '.env.example.local', '.ENV']) assert.equal(isForbidden(path), true, path);
});

test('NUE-22/25 · subagents get their task in the room\'s language, and none is mentioned when none was used', async () => {
  const lease = await source('src/lease.mjs');
  assert.match(lease, /in the language of this conversation/);
  assert.match(lease, /if you did not, do not mention them/);
  const { keptSubagents } = await import('../src/adapters/subagents.mjs');
  assert.equal(keptSubagents([{ id: 'a', status: 'done', report: '​# Review' }])[0].report, '# Review');
});

test('NUE-29 · a reminder is told to the agent in this computer\'s local time', async () => {
  const { localWhen } = await import('../src/modules/reminders.mjs');
  const said = localWhen('2026-10-30T03:09:00.000Z', 'es');
  assert.doesNotMatch(said, /UTC|Z$/);
  assert.match(said, /\d{1,2}:09/);
});
