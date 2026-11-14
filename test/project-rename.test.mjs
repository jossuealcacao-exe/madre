// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// A project renamed from Home (2026-11-13): a name of the person's own in its record, shown by Home
// and by the project itself; its folder keeps its name, and an empty name gives it back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { knownRooms, markProject, projectTitle, renameProject } from '../src/salas.mjs';

const pub = (file) => readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');

test('a project takes a name of its own, keeps it when it opens again, and gives it back when emptied', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-rename-'));
  const projectRoot = join(stateRoot, 'Web-Architect-OS-Claude-Code-Ready-v2.0.0');
  await mkdir(projectRoot, { recursive: true });
  const id = 'web-architect-0123456789abcdef';
  const roomDir = join(stateRoot, 'rooms', id);
  await markProject(roomDir, projectRoot);
  assert.equal((await knownRooms(stateRoot))[0].name, 'Web-Architect-OS-Claude-Code-Ready-v2.0.0');

  const renamed = await renameProject({ stateRoot, id, title: '  Mi   tienda  ' });
  assert.deepEqual(renamed, { id, name: 'Mi tienda', title: 'Mi tienda' });
  assert.equal((await knownRooms(stateRoot))[0].name, 'Mi tienda');
  assert.equal((await knownRooms(stateRoot))[0].folderName, 'Web-Architect-OS-Claude-Code-Ready-v2.0.0');
  assert.equal(await projectTitle(roomDir), 'Mi tienda');

  // Opening it again writes the folder's name and keeps the person's.
  await markProject(roomDir, projectRoot, { port: 4318 });
  assert.equal((await knownRooms(stateRoot))[0].name, 'Mi tienda');

  const back = await renameProject({ stateRoot, id, title: '   ' });
  assert.equal(back.title, null);
  assert.equal((await knownRooms(stateRoot))[0].name, 'Web-Architect-OS-Claude-Code-Ready-v2.0.0');
  assert.equal(await projectTitle(roomDir), null);
  assert.deepEqual(await renameProject({ stateRoot, id: '../x', title: 'no' }), { error: 'unknown' });
  assert.deepEqual(await renameProject({ stateRoot, id: 'nobody', title: 'no' }), { error: 'unknown' });
});

test('13 nov · Home renames in place; the sheets close as every window; the map and Modules read', async () => {
  const mac = await pub('salas-mac.js');
  const css = await pub('salas-mac.css');
  const styles = await pub('styles.css');
  const missions = await pub('missions.js');
  const tour = await pub('tour.js');
  const app = await pub('app.js');
  assert.match(mac, /item\(t\('Rename…'\), RENAME_ICON/);
  assert.match(mac, /!renaming\.size && !pins\.dropping/);
  assert.match(mac, /post\('\/api\/salas\/rename', \{ room: room\.id, name \}\)/);
  // The ×: the windows' key in its channel, and the chapters' next key ready without a ring.
  assert.match(missions, /button\('surface-mode close x-close x-only', null, close\)/);
  assert.match(tour, /head\.append\(words, closeKeys\(close\)\)/);
  assert.match(tour, /focusQuietly\(acts\.querySelector\('\.tour-btn\.primary'\)\)/);
  assert.match(styles, /\.surface-modes\.window-close \{/);
  // Modules: small chips that end in «…» inside the card.
  assert.match(css, /\.mk-mine \.mk-chip \{ display: inline-block;[^}]*text-overflow: ellipsis;/);
  // The map's card keys, readable on its dark glass.
  assert.match(css, /\.mv-card \.mv-actions \.sm-btn\.ghost \{ background: rgba\(255, 255, 255, \.08\)/);
  // A double press on the window keys counts once.
  assert.match(app, /if \(event\.detail > 1 \|\| performance\.now\(\) < movingUntil\) return false;/);
});

test('13 nov · an AI with #2 can start its folder while another holds #3 and .pulse is locked', async () => {
  const { guardForbidden } = await import('../src/room/guard.mjs');
  const { createLease } = await import('../src/lease.mjs');
  const projectRoot = await mkdtemp(join(tmpdir(), 'madre-guard-'));
  await mkdir(join(projectRoot, '.pulse'), { recursive: true });
  const guard = await guardForbidden(projectRoot);
  try {
    assert.ok(guard.locked.includes('.pulse/'));
    const lease = await createLease({ projectRoot, leaseId: '0123456789abcdef' });
    assert.ok(lease.outDir.startsWith(join(projectRoot, '.pulse', 'out')));
  } finally { await guard.release(); }
});

test('13 nov · back from a window, a plan stop apart, one reply mark, the ring whole', async () => {
  const app = await pub('app.js');
  const styles = await pub('styles.css');
  // Out of a window, back where it was: Files beside the conversation never comes back as a modal.
  assert.match(app, /if \(next === 'window'\) surfaceBefore\[surface\.key\] = modeOf\(surface\);/);
  assert.match(app, /isWindow\(surface\) \? backFromWindow\(surface\) : 'window'/);
  // The plan's stop at the card's right.
  assert.match(styles, /\.system\.plan > b:first-child > \.act\.stop \{ margin-left: auto;/);
  // One mark for the line an answer answers, and whose answer a reply quotes.
  assert.match(app, /const REPLY_QUOTE = /);
  assert.ok(!/el\('span', 'reply', `↳/.test(app));
  assert.match(styles, /#messages#messages \.col > \.who:has\(> \.reply\) \{\n  display: flex; flex-wrap: nowrap;/);
  // WebKit has no clip margin: the thread clips only side to side there.
  assert.match(styles, /@supports not \(overflow-clip-margin: 1px\) \{\n  #messages \.thread-inner \{ overflow: visible; overflow-x: clip; \}/);
});

test('13 nov · plainer opening, the answer header as a tab, Code · Both on the left, a quiet file card', async () => {
  const loader = await pub('loader.js');
  const es = await pub('es.js');
  const app = await pub('app.js');
  const styles = await pub('styles.css');
  assert.match(loader, /t\('Claude, ChatGPT, Gemini… each one in its own app\.'\)/);
  assert.match(es, /"You ask, and they work on your files\.": "Tú pides, y ellas trabajan en tus archivos\."/);
  assert.match(app, /line\.append\(el\('b', 'reply-to you', t\('You'\)\), ` \$\{briefQuestion\(said\)\}`\);/);
  assert.match(styles, /\.who:has\(> \.reply\) > \.spent \{ order: 60; position: static; margin-left: auto !important;/);
  assert.match(styles, /html\.chat-shell dialog\.viewer \.code-views \{ margin-left: 0; margin-right: auto;/);
  assert.match(styles, /\.file-tile:not\(\.image\):hover \{ transform: none;/);
});

test('13 nov · Files keys fixed on top with «⋯», rows paint their avatar shadow, notices morph, the folder', async () => {
  const app = await pub('app.js');
  const styles = await pub('styles.css');
  assert.match(app, /code\.more = el\('button', 'code-more', '⋯'\);/);
  assert.match(styles, /html\.chat-shell dialog\.viewer\.code > \.viewer-head > \.code-tabs \{ order: 10; flex: 1 1 100%;/);
  assert.match(styles, /#messages \.thread-inner > \.row \{ padding-bottom: 12px; margin-bottom: -12px;/);
  assert.match(app, /function morphStrip\(strip, from, open\)/);
  assert.ok(!/--fold/.test(styles), 'the folder look is gone');
  assert.match(app, /hideTip\(\);\n  strip\.classList\.toggle\('open', open\);/);
});

test('13 nov · OpenCode on a model its provider does not have is MU-094, with the way out', async () => {
  const { diagnose } = await import('../public/troubleshooting.js');
  assert.deepEqual(diagnose('APIError: Not Found', 'opencode').map((one) => one.code), ['MU-094']);
  assert.equal(diagnose('APIError: Not Found', 'gemini').some((one) => one.code === 'MU-094'), false);
  const { problemOf } = await import('../src/opencode-health.mjs');
  assert.equal(problemOf('APIError: Not Found'), 'no-model');
  const app = await pub('app.js');
  assert.match(app, /OPENCODE_WAY_OUT = new Set\(\[[^\]]*'opencode-default-model-missing'\]\)/);
});
