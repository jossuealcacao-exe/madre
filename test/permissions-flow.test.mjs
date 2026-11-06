// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The permissions walk of 2026-11-06 (madre-logs, lecturas/2026-11-06-recorrido-permisos.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ControlDesk } from '../src/room/control.mjs';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

// Q-13: with «#3 open» for @codex, the next change went at #1; @codex read it, answered «I need #3»
// and asked again, a turn and its cost for every change.
test('a permission still open for an agent is where its next message goes (Q-13)', () => {
  assert.match(app, /function nextModeFor\(id\) \{\n  for \(const mode of \[4, 3\]\) if \(overrideGraceLeft\(mode, id\) && overridePass\(mode, id\) && mode <= ceilingFor\(id\)\) return mode;\n  return defaultModeFor\(id\);\n\}/);
  // After a message (the grant from the card is one), on choosing the agent, and when the copilot changes.
  assert.match(app, /function resetModeAfterSend\(\) \{[\s\S]{0,260}setMode\(nextModeFor\(els\.target\.value\)\);\n\}/);
  assert.match(app, /els\.target\.value = agent\.id;\n      state\.typedTarget = null;\n      setMode\(nextModeFor\(agent\.id\)\);/);
  assert.match(app, /state\.modeArmedFor = null; setMode\(nextModeFor\(els\.target\.value\)\);/);
  // Closed by its ×, STOP ALL or Settings, the box goes back; closed to ask the key again, it does not.
  assert.match(app, /if \(back && els\.target\?\.value && state\.mode >= 3 && !overrideGraceLeft\(state\.mode, els\.target\.value\)\) setMode\(nextModeFor\(els\.target\.value\)\);/);
  assert.match(app, /closeOverrideGrace\(mode, current\.id, \{ back: true \}\)/);
  assert.match(app, /closeOverrideGrace\(sentMode, addressed\);\n        openOverride\(addressed, \{ mode: sentMode, then: \(\) => els\.composer\.requestSubmit\(\) \}\);/);
  // The «default» tag of the menu is still the agent's own default, not the open permission.
  assert.match(app, /else if \(n === defaultModeFor\(id\)\) option\.querySelector\('\.name'\)/);
});

// Q-14: «↩ @codex #4: …» read as #4 FULL ACCESS beside the modes.
test('a quote names the agent and its words, with no number that reads as a mode (Q-14)', async () => {
  assert.match(app, /return `↩ @\$\{reply\.sender\}: “\$\{reply\.text\}”\\n`;/);
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(room, /↩ @\$\{agentId\}\$\{reply\?\.sequence/);
});

// Q-15: two notices when EDIT began and three after UNDO, one of them in English, as «CONTROL».
test('EDIT and UNDO are each said once, with today\'s name (Q-15)', async () => {
  assert.doesNotMatch(app, /if \(!replaying\) toast\(t\('Diagnostics › @\{agent\} holds EDIT mode/);
  assert.doesNotMatch(app, /if \(!replaying\) toast\(`\$\{t\('Diagnostics › '\)\}\$\{message\}`\);\n  state\.lastSender = null;\n  return node;\n\}\n\nfunction renderLeaseMissing/);
  const root = await mkdtemp(join(tmpdir(), 'madre-undo-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await writeFile(join(root, 'index.html'), '<h1>Bienvenidos</h1>\n');
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 's'], { cwd: root });
    const desk = new ControlDesk({ projectRoot: root });
    const { run } = await desk.begin({ agent: { id: 'codex' }, messageId: 'm-q15', enabledScopes: {}, mode: 3 });
    await writeFile(join(root, 'index.html'), '<h1>Hola, Luna</h1>\n');
    const changes = await desk.settle(run);
    await desk.release(run);
    const undone = await desk.undo(changes.checkpointId);
    assert.equal(undone.ok, true);
    assert.equal(undone.message, 'Project restored to the restore point taken before @codex\'s EDIT turn: 1 file(s) restored, 0 removed.');
    assert.doesNotMatch(undone.message, /CONTROL/);
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), '<h1>Bienvenidos</h1>\n');
    const { ES } = await import('../public/es.js');
    assert.ok(ES['Project restored to the restore point taken before @{agent}\'s EDIT turn: {restored} file(s) restored, {removed} removed.']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Q-16: Copilot, which spares asking at every step, was a small icon nobody found.
test('the second #3 an agent asks for offers Copilot, live and only where it can help (Q-16)', async () => {
  assert.match(app, /if \(wanted === 3 && !replaying\) \{\n    const times = \(threeAsks\.get\(agent\) \?\? 0\) \+ 1;/);
  assert.match(app, /if \(times >= 2 && !copilotOn\(\) && canWrite\(agent\)\)/);
  assert.match(app, /toggleCopilotMenu\(document\.querySelector\('\.copilot-chip'\) \?\? see, \{ keep: true \}\)/);
  const { ES } = await import('../public/es.js');
  assert.equal(ES['SEE COPILOT'], 'VER COPILOTO');
});

// Q-17: on a phone the mode said «#1» and nothing else.
test('in a narrow box the mode keeps a short word beside its number (Q-17)', async () => {
  assert.match(app, /const MODE_NICKS = \{ 0: \(\) => t\('Incognito'\), 1: \(\) => t\('Chat'\), 2: \(\) => t\('Create'\), 3: \(\) => t\('Edit'\), 4: \(\) => t\('Full access'\) \};/);
  assert.match(app, /el\('span', 'nick', MODE_NICKS\[shown\]\?\.\(\) \?\? ''\)/);
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /html\.chat-shell \.composer\.tight #pick-options \.mode-chip > \.nick \{ display: inline; white-space: nowrap; overflow: visible; text-overflow: clip; \}/);
  assert.match(css, /html\.chat-shell \.composer\.tight #pick-options \.mode-chip \{ flex-shrink: 0; \}/);
  assert.match(css, /:is\(\.model-chip, \.mode-chip\) > \.nick \{ display: none; \}/);
  const { ES } = await import('../public/es.js');
  assert.equal(ES.Chat, 'Conversar');
});
