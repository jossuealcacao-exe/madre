import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { updateConfig } from '../src/config.mjs';

// The UX review of 2026-11-06 (the author): five points, each checked here where a test can see it.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ux · Options and Commands are always on, as image generation is: no switch, and an old config cannot turn them off', async () => {
  const choices = (await import('../src/modules/choices.mjs')).default;
  const runs = (await import('../src/modules/runs.mjs')).default;
  for (const module of [choices, runs]) {
    const said = await module.describe({ config: {}, roomId: null, projectRoot: tmpdir(), agents: [], settings: {} });
    assert.equal(said.fixed, true, `${module.id} still has a switch`);
    assert.equal(said.status.installed, true);
    assert.equal((await module.toggle({ config: {} }, {})).status, 405, `${module.id} can still be turned off`);
  }
  const root = await mkdtemp(join(tmpdir(), 'madre-always-on-'));
  const project = join(root, 'project');
  await mkdir(project, { recursive: true });
  // A config from before, with both turned off.
  await updateConfig(root, { modules: { choices: { enabled: false }, runs: { enabled: false } } });
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: [], testMode: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const state = await fetch(`${base}/api/state`).then((answer) => answer.json());
    assert.equal(state.choices.enabled, true);
    assert.equal(state.runs.enabled, true);
    const refused = await fetch(`${base}/api/extensions/runs/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"confirm":true}' });
    assert.equal(refused.status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('ux · a notice open on its own and a step\'s card keep their words off the edge, and the brake is a small button', async () => {
  const css = await read('public/styles.css');
  // The card the chat shell draws around a notice now has room inside, its words on the left and readable.
  assert.match(css, /html\.chat-shell #messages#messages \.thread-inner > \.system:not\(\.claim, \.mother-alert, \.folded, \.folding\) \{[^}]*padding: 9px 14px 10px 30px; text-align: left;[^}]*color: var\(--text-2\);/);
  assert.match(css, /\.thread-inner > \.system\.alert:not\(\.folded\) \.cmd \{[^}]*border-radius: 999px;[^}]*letter-spacing: 0; text-transform: lowercase;/);
  // A step's card (the plan's closing «Reading what the others answered») has its padding.
  assert.match(css, /html\.chat-shell #messages#messages \.row\.delegated \.bubble \{ padding: 10px 14px 9px; border-radius: 14px; \}/);
});

test('ux · «En marcha»: an install opens onto what it said last, how far it got, and a stop for a model downloading', async () => {
  const activity = await read('public/activity.js');
  const install = activity.slice(activity.indexOf('// An install: an agent\'s program'), activity.indexOf('function doneRow'));
  assert.match(install, /more: \(inside\) => \{/, 'the install row still opens onto nothing');
  assert.match(install, /if \(item\.line\) inside\.append\(el\('pre', 'ap-out', item\.line\)\);/);
  assert.match(install, /if \(item\.stoppable\) inside\.append\(actions\(\[t\('Stop the download'\), 'stop', \(\) => stop\(project, item\)\]\)\);/);
  assert.match(install, /progress: percent === null \? null : \(\) => percent \/ 100,/);
  const server = await read('src/server.mjs');
  assert.match(server, /now\.push\(\{ kind: 'install', what: installing, model: pulling\?\.model \?\? null, startedAt: installingSince \|\| null, line: installLine, stoppable: Boolean\(pulling\) \}\)/);
  assert.match(server, /else if \(payload\.kind === 'install' && pulling\) \{\s*\/\/[^\n]*\n[^\n]*\n\s*pulling\.stopper\.abort\(\);/);
  assert.match(server, /if \(event\?\.type === 'extension\.install\.output'\)|event\?\.type === 'extension\.install\.output'/);
});

test('ux · responsive: nothing spills or covers its neighbours at a phone\'s or a tablet\'s width, and a finger has room', async () => {
  const css = await read('public/styles.css');
  const home = await read('public/salas-mac.css');
  // The brake in a narrow bar is an icon, as every key there: its words ran over the agents.
  assert.match(css, /@container bar \(max-width: 980px\) \{\s*html\.chat-shell \.shell > \.bar > #stop-all\.armed \{ width: 34px; height: 34px; padding: 0; gap: 0; font-size: 0;/);
  // A settings row puts its control under its words when they do not fit, instead of over them.
  assert.match(css, /\.sx-row:not\(\.stack\) \{ flex-wrap: wrap; row-gap: 10px; \}/);
  assert.match(css, /\.sx-row:not\(\.stack\) \.sx-control \{ flex: 0 1 auto; max-width: 100%; margin-left: auto; \}/);
  // A composer chip that shrinks cuts its words; a finger gets 36 px.
  assert.match(css, /#pick-options :is\(\.mode-chip, \.model-chip, \.effort-chip\) > :is\(\.word, \.nick, \.label\) \{ min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
  assert.match(css, /@media \(pointer: coarse\) \{[\s\S]{0,400}#pick-options :is\(\.mode-chip, \.model-chip, \.effort-chip, \.copilot-chip\) \{ min-height: 36px; \}[\s\S]{0,400}\.bubble-actions \.act \{ min-width: 36px; min-height: 36px; \}/);
  // Modules on a phone: the Market gives its word to the search, and keeps its name.
  assert.match(css, /@container modswin \(max-width: 440px\) \{[\s\S]{0,400}\.mods-head \.mods-market > span \{ display: none; \}/);
  assert.match(await read('public/app.js'), /market\.setAttribute\('aria-label', t\('Market'\)\);/);
  // Home on a phone: the tour's pill steps out of the bar, and each tile is as tall as what it holds.
  assert.match(home, /@media \(max-width: 560px\) \{ \.sm-topbar \.tour-pill-slot \{ display: none !important; \} \}/);
  assert.match(home, /@media \(max-width: 560px\) \{\s*#sm-top\.sm-bento \{ grid-auto-rows: auto; \}\s*#sm-top > \.sm-tile \{ grid-row: auto !important; \}/);
  assert.match(home, /#sm-top > \.sm-links-tile \.sm-map \{ flex: none; min-height: 260px !important; \}/);
});
