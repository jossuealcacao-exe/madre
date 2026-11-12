// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's nine interface changes of 2026-11-07, each held to what it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pub = (file) => readFileSync(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('ux 7 nov · the Agents card is a quick way in: three to a row, each its mark and its session, a tile opens that agent', () => {
  const home = pub('salas-mac.js');
  assert.match(home, /rows\.classList\.add\('agents-grid'\)/);
  assert.match(home, /tile\.append\(mark\(agent\.id, 26\)/);
  assert.match(home, /openCategory\('agents', tile\.dataset\.agent\)/);
  const room = pub('app.js');
  assert.match(room, /rows\.classList\.add\('agents-grid'\)/);
  assert.match(room, /openSettingsCategory\('agents', tile\.dataset\.agent\)/);
  assert.match(pub('styles.css'), /\.settings-quick\.agents-grid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
});

test('ux 7 nov · the connectors have a search, and «Add a tool» is said once, at the top', () => {
  const room = pub('app.js');
  assert.match(room, /input\.placeholder = t\('Search connectors'\)/);
  assert.match(room, /\{ className: 'mcp-block mcp-catalog-block', aside: search \}/);
  assert.ok(!room.includes('mcp-cat-other'), 'the second «Add a tool» is back at the foot of the catalog');
  assert.equal((room.match(/sxButton\(t\('Add a tool'\)/g) ?? []).length, 1);
});

test('ux 7 nov · a white key next to a green one wears a faint shade of its own, not the cards\' one', () => {
  const css = pub('styles.css');
  assert.match(css, /--key-soft: 0 0 0 \.5px/);
  assert.match(css, /dialog\.room-ask:not\(\.console\) \.room-ask-choice:not\(\.primary\):not\(\.danger\)/);
  assert.match(pub('salas-mac.css'), /\.sm-btn:not\(\.primary\):not\(\.danger\):not\(\.go\):not\(\.quiet\):not\(\.ghost\) \{ box-shadow: var\(--key-soft/);
});

test('ux 7 nov · Home\'s Settings sheet is as wide as you pull it, kept apart from the projects\'', () => {
  const home = pub('salas-mac.js');
  assert.match(home, /function gripHomeSettings\(sheet\)/);
  assert.match(home, /'pulse\.homeSettingsSheet'/);
  assert.match(home, /gripHomeSettings\(sheet\);/);
  assert.match(pub('salas-mac.css'), /width: var\(--sheet-w, min\(580px, 64%\)\); max-width: calc\(100% - 120px\); min-width: 360px;/);
});

test('ux 7 nov · a connection reads in order: the pair, what crosses, its terms, what it allows, and the readings by the way out', () => {
  const home = pub('salas-mac.js');
  for (const title of ['What crosses', 'Terms', 'What it allows']) assert.match(home, new RegExp(`section\\(t\\('${title}'\\)\\)`));
  assert.match(home, /foot\.append\(trafficLine, actions\)/);
});

test('ux 7 nov · the Coordinator\'s own memories are read and drawn round its body on the map', () => {
  const map = pub('macroverso.js');
  assert.match(map, /const next = \[focus, core\.room \? core : null, \.\.\.universes\]/);
  assert.match(map, /one\.centre \? \(core\.room\?\.id === one\.room\.id \? core : null\)/);
  assert.match(map, /ctx\.drawImage\(core\.sprite\.canvas/);
  assert.ok(!map.includes('__mvCoreDebug'));
});

test('ux 7 nov · one small solid tip for every key that explains itself; the agents\' sphere keeps its own, solid too', async () => {
  const tips = pub('tips.js');
  assert.match(tips, /export function installTips/);
  assert.match(pub('app.js'), /installTips\(\);\nboot\(\);/);
  assert.match(pub('salas-mac.js'), /applyLooks\(\);\n\/\/ One small solid label[^\n]*\ninstallTips\(\);/);
  const css = pub('styles.css');
  assert.match(css, /\.madre-tip \{/);
  assert.ok(!/\.crew-stack \.pick-vendor \{[^}]*backdrop-filter/.test(css), 'the sphere\'s label is glass again');
  // Served to the page and to the phone.
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8'), /'\/tips\.js'/);
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'bridge', 'policy.mjs'), 'utf8'), /'\/tips\.js'/);
  // Without a page to draw in (a test's stand-in window), it does nothing.
  const { installTips } = await import('../public/tips.js');
  assert.doesNotThrow(() => installTips({ addEventListener: null }));
});

test('ux 7 nov · the room\'s titles become the tip\'s words, and a row that scrolls on its own no longer hides it', () => {
  // The room took every title off before the tip could read it (adoptTitle): the words now go to it.
  assert.match(pub('app.js'), /node\.removeAttribute\('title'\);\n  if \(!said\.trim\(\)\) return;\n  node\.dataset\.tip = said;/);
  const tips = pub('tips.js');
  assert.match(tips, /event\.target\?\.contains\?\.\(key\)/, 'any scroll anywhere hides the tip again');
});

test('ux 7 nov · a connection is one even row, folded, that unfolds in place', () => {
  const home = pub('salas-mac.js');
  assert.match(home, /const node = el\('details', `sm-link/);
  assert.match(home, /node\.open = linksOpen\.has\(enlace\.id\) \|\| revoking\.has\(enlace\.id\)/);
  assert.match(home, /node\.append\(summary, body\)/);
  const css = pub('salas-mac.css');
  assert.match(css, /\.sm-link-summary > \.sm-link-pair \{ grid-column: 1; grid-row: 1; display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(70px, 120px\) minmax\(0, 1fr\);/);
  assert.match(css, /\.sm-link-list \{ grid-template-columns: minmax\(0, 1fr\) !important;/);
});

test('ux 12 nov · a tip inside another: the outer one keeps its words aside, so the browser draws no second tip', () => {
  const tips = pub('tips.js');
  assert.match(tips, /function holdAround\(key\)/);
  assert.match(tips, /  if \(!words\(key\)\) return;\n  holdAround\(key\);/);
  assert.match(tips, /  current = null;\n  releaseAround\(\);/);
  // A folded notice has no tip of its own over the row's, and its words keep their spaces.
  const app = pub('app.js');
  assert.match(app, /node\.dataset\.tone = noticeTone\(node\);\n[^\n]*\n    node\.removeAttribute\('title'\);/);
  assert.match(app, /function spacedText\(node\)/);
});

test('ux 12 nov · the card of changes reads in order: head, files, and UNDO with how much changed in one foot', () => {
  const app = pub('app.js');
  assert.match(app, /const foot = el\('div', 'foot'\);/);
  assert.match(app, /if \(files\.length && stat\) foot\.append\(el\('span', 'stat'/);
  const css = pub('styles.css');
  assert.match(css, /\.system\.control\.changed \{ display: grid; gap: 10px; justify-items: stretch; text-align: left;/);
  assert.match(css, /\.system\.control\.changed \.foot \{ display: flex;/);
  assert.match(css, /\.sys-dots\.open > \.system\.control\.changed\.folded \{ display: grid !important;/);
});

test('ux 12 nov · «Show me» on the second conversation opens one beside, and Settings keeps its place when drawn again', () => {
  const app = pub('app.js');
  assert.match(app, /show: \(\) => \{ void stepsBeside\(\); \}/);
  assert.match(app, /if \(other\) \{ openSplit\(other\.id\); return; \}/);
  assert.match(app, /localStorage\.setItem\('pulse\.split', before\)/);
  const home = pub('salas-mac.js');
  assert.match(home, /const top = scroll\.scrollTop;/);
  assert.match(home, /scroll\.scrollTop = top;/);
  assert.match(pub('styles.css'), /\.sx-more > \.sx-hint \{ margin: 10px 16px 16px; \}/);
});
