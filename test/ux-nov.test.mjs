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

test('ux 12 nov · behind «Before you start», MADRE at work in the abstract, on the right half, served to the page and the phone', async () => {
  const field = pub('terms-field.js');
  assert.match(field, /export function createTermsField/);
  assert.match(field, /SPDX-License-Identifier: BUSL-1\.1/);
  assert.match(pub('terms.js'), /const field = createTermsField\(\);\n  dialog\.append\(field\.node, card\);/);
  assert.match(pub('terms.js'), /field\.stop\(\); dialog\.close\(\);/);
  const css = pub('styles.css');
  assert.match(css, /\.terms-field \{ position: fixed; inset: 0; z-index: 0;/);
  assert.match(css, /dialog\.terms-gate\.intro \.terms-field \{ opacity: 0;/);
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8'), /'\/terms-field\.js'/);
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'bridge', 'policy.mjs'), 'utf8'), /'\/terms-field\.js'/);
  // Without a page to draw in, it does nothing and does not throw.
  const { createTermsField } = await import('../public/terms-field.js');
  assert.equal(typeof createTermsField, 'function');
});

test('ux 13 nov · the opening is a mix: each AI a colour, blended into MADRE\'s, and the M written out of it', () => {
  const css = pub('styles.css');
  assert.match(css, /\.wl-intro-line \{ position: absolute; left: 0; right: 0; top: 50%; margin: 0; transform: translateY\(-50%\);/);
  assert.match(css, /\.wl-intro-soft \{ display: inline-block; \}/);
  assert.match(css, /@keyframes wl-line-in \{ from \{ opacity: 0; translate: 0 18px;/);
  // No iris and no push: the stage fades in, and leaving still fades it out.
  assert.match(css, /\.wl-intro:not\(\.po-stage\)::after \{ content: none; \}/);
  assert.match(css, /\.wl-intro:not\(\.po-stage\):not\(\.leaving\) \{ animation: wl-mix-in/);
  const loader = pub('loader.js');
  const opening = loader.slice(loader.indexOf('export function playOpening('), loader.indexOf('// A PROJECT OPENS AGAIN'));
  // Each AI's own colour as a field, the grey ones quieter; blended, then MADRE's colour.
  assert.match(opening, /const hue = light \? BRANDS\[id\]\.colorLight : BRANDS\[id\]\.color;/);
  assert.match(opening, /pen\.globalCompositeOperation = light \? 'source-over' : 'screen';/);
  assert.match(opening, /glow\(x, y, radius, mix\(one\.hue, brand, tint\), alpha\);/);
  // Nothing else on the stage: no badges, no threads, no sparks, no heart; two lines of words.
  assert.ok(!/burst|drawImage|--hit/.test(opening), 'the old opening is back');
  // The M is born as a heart from the point where the colours meet, beats once and becomes the M.
  assert.match(loader, /const HEART_R = \[\[50, 33\]/);
  assert.match(loader, /const INTRO_VIEW = \{ x: 0, y: 5.5, w: 305.5, h: 98 \}/);
  assert.match(loader, /centreOfInk/);
  assert.match(opening, /halfPath\(HEART_L, M_L, morph\)/);
  // Only whole sentences, one at a time, on one line: no half that turns, no room kept for it.
  assert.ok(!/softNow|const uses = /.test(opening), 'a turning half is back');
  assert.match(loader, /story: \[300, 2900, 5400, 7500, 9400\]/);
  assert.match(opening, /t\('MADRE brings them into one chat\.'\)/);
  // Grander: a vortex, one flash and a wave at the meeting, a light along the M, a ring for the dot.
  assert.match(opening, /const spin = time \* 0\.00009 \+ 2\.6 \* easeIn\(together\);/);
  assert.match(opening, /THE MEETING: one emerald flash/);
  assert.match(opening, /band\.id = 'wl-sheen';/);
  assert.match(loader, /hold: 11300/);
});

test('rebranding 13 nov · the M of one stroke, its dot apart, «madre» in Space Grotesk, served from the package', () => {
  const loader = pub('loader.js');
  assert.match(loader, /export const MADRE_LOGO = '<svg class="brand-logo" viewBox="12 17\.5 281\.5 74"/);
  assert.match(loader, /d="M20 82V42C20 21 41 21 46 39L50 52L54 39C59 21 80 21 80 42V60" stroke-width="14\.5"/);
  assert.match(loader, /<circle class="beat-dot" cx="80" cy="81" r="9\.5"/);
  assert.match(loader, /<text class="word" x="116\.7" y="71\.4" font-size="62" letter-spacing="-2\.17">madre<\/text>/);
  // The pages draw the same logo, and the loader is the M too.
  for (const page of ['index.html', 'salas-mac.html']) assert.match(pub(page), /<svg class="brand-logo" viewBox="12 17\.5 281\.5 74"/);
  assert.match(loader, /export const LOADER_MARK = '<svg viewBox="10 16 82 76"/);
  const css = pub('styles.css');
  assert.match(css, /@font-face \{ font-family: 'Space Grotesk'; font-style: normal; font-weight: 700;[^}]*SpaceGrotesk-latin\.woff2/);
  assert.match(css, /\.brand-logo \.word \{ fill: var\(--brand-word\); stroke: none; font-family: 'Space Grotesk'/);
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8'), /\['\/assets\/brand\/SpaceGrotesk-latin\.woff2', 'font\/woff2'\]/);
  // The favicon and the web icon: the M in its gradient on #0B0B0E.
  assert.match(pub('assets/brand/madre-favicon.svg'), /<linearGradient id="m"[\s\S]*#0B0B0E/);
});

test('13 nov · the welcome and the second conversation, as the author asked', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const tour = readFileSync(new URL('../public/tour.js', import.meta.url), 'utf8');
  const welcome = readFileSync(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../public/welcome-scene.js', import.meta.url), 'utf8');
  const mac = readFileSync(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  // No tips in the second conversation: the frame is named, not titled, and the pane says so.
  assert.match(html, /<aside id="split" class="split-dock" aria-label="Second conversation" data-tip-off hidden>/);
  assert.match(html, /<iframe id="split-frame" class="split-frame" aria-label="Second conversation"><\/iframe>/);
  assert.ok(!/split\.title\.title =/.test(app));
  assert.match(app, /if \(SPLIT_CHAT && globalThis\.document\?\.documentElement\) document\.documentElement\.dataset\.tipOff = '';/);
  assert.match(app, /closest\?\.\('\[title\]:not\(iframe\)'\)/);
  // The first-time hint over Modules (a div that is modal) sits beside the window, not over its bar.
  assert.match(tour, /box\?\.closest\?\.\('\[role="dialog"\]\[aria-modal="true"\]'\)/);
  assert.match(tour, /framed\.bottom - height - 16/);
  // The computer check says what each thing means; the last picture's M fits in its card.
  assert.match(welcome, /t\('What MADRE checked on your computer'\)/);
  assert.match(scene, /const k = Math\.min\(\(cy - 16\) \/ 55, \(cx - x0\) \* 0\.9 \/ 61\);/);
  assert.match(mac, /\.wl-section \{ font: 600 13\.5px\/1\.3 var\(--read\); letter-spacing: -\.005em; text-transform: none;/);
});
