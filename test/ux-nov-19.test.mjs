// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Interfaz del 2026-11-19 (el autor): los mapas giran y se arrastran con Archivos abierto, el «⋯» de
// Archivos muestra sus teclas, sin «|» antes de Leer, y el comando con «Deshacer» va primero.
const read = (name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8');

test('maps: what covers a map is what the browser puts over it, not every open dialog', async () => {
  const app = await read('app.js');
  const covered = app.slice(app.indexOf('function nostromoCovered('), app.indexOf("nostromo.canvas?.addEventListener('mousedown'"));
  assert.match(covered, /document\.elementFromPoint\?\.\(event\.clientX, event\.clientY\)/);
  assert.match(covered, /top !== nostromo\.canvas/);
  assert.doesNotMatch(covered, /dialog\[open\]/, 'the Files panel docked under the map ignored every drag over it');
  const macroverso = await read('macroverso.js');
  const own = macroverso.slice(macroverso.indexOf('const covered = (event) =>'), macroverso.indexOf("canvas.addEventListener('pointerdown'"));
  assert.match(own, /top !== canvas/);
  assert.doesNotMatch(own, /dialog\[open\]/);
});

test('files: the «⋯» opens inside the panel, from where it is, and READ has no «|» before it', async () => {
  const app = await read('app.js');
  const menu = app.slice(app.indexOf("code.more.addEventListener('click'"), app.indexOf("document.addEventListener('pointerdown', (event) => { if (!moreMenu.hidden"));
  assert.match(menu, /moreMenu\.style\.left = `\$\{Math\.round\(Math\.max\(8, Math\.min\(at\.left - box\.left, box\.width - wide - 8\)\)\)\}px`/);
  assert.doesNotMatch(menu, /moreMenu\.style\.right = `\$\{Math/, 'measured from the right edge, it opened outside the panel and was clipped to an empty box');
  const styles = await read('styles.css');
  assert.doesNotMatch(styles, /\.viewer-seg:not\(\.code-views\) \{[^}]*box-shadow: inset 1px 0 0/, 'the «|» before READ is back');
});

test('commands: with «Deshacer» the command reads first, and undoing is a quiet key on the lower line', async () => {
  const app = await read('app.js');
  assert.match(app, /const undo = el\('button', 'undo'\);\n      undo\.innerHTML = `\$\{trazo\('reset'\)\}<span>\$\{escapeHtml\(t\('Undo'\)\)\}<\/span>`;/);
  const styles = await read('styles.css');
  assert.match(styles, /\.command-card\.terminal\.has-undo \{ display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(styles, /\.command-card\.terminal\.has-undo \.term-head > \.term-line \{ order: -3; flex: 1 1 100%; \}/);
  assert.match(styles, /\.command-card\.terminal\.has-undo > \.undo \{ grid-row: 1; grid-column: 2; align-self: end;[^}]*background: transparent;/);
});

test('agents: an @ in the field, the @ menu and the panel «En marcha» use the colour for the ground they are on', async () => {
  // Grok's #E6E6E6 and Cursor's #D9DEE5 are made for a dark ground; on a light one they all but
  // vanished (2026-11-19, the author: «los arroba de cursor y grok no se ven bien»).
  const app = await read('app.js');
  assert.match(app, /<span class="chip agent" data-tint="\$\{escapeHtml\(key\)\}" style="--agent:\$\{agentColor\(key\)\}">/);
  assert.match(app, /color: agentColor\(id\), off:/);
  for (const name of ['app.js', 'activity.js']) assert.doesNotMatch(await read(name), /brandOf\([^)]*\)\.color\b/, `${name} paints an agent in its dark-ground colour whatever the ground`);
  const { BRANDS } = await import('../public/brands.js');
  for (const id of ['grok', 'cursor']) assert.ok(BRANDS[id].colorLight, `${id} has no colour for a light ground`);
});

test('agents: Grok is black on a light ground and Cursor grey, so the two read apart; Grok keeps its disc', async () => {
  // 2026-11-19, the author: «grok debe ser más negro y cursor más gris».
  const { BRANDS } = await import('../public/brands.js');
  assert.equal(BRANDS.grok.colorLight, '#0A0A0A');
  assert.equal(BRANDS.grok.color, '#F5F5F5');
  assert.equal(BRANDS.grok.solid, '#E6E6E6');
  assert.equal(BRANDS.cursor.colorLight, '#6B7380');
  assert.equal(BRANDS.cursor.color, '#A3ABB6');
});

test('names: every field that asks to type a name has «Copiar» beside it, and the key never fills it in', async () => {
  // 2026-11-19, the author: «agregar botón copiar a un lado… replicar donde aplique».
  const app = await read('app.js');
  assert.match(app, /if \(input\?\.copy\) copyKey\(sheet\.input, input\.copy\); else hideCopyKey\(sheet\.input\);/);
  assert.equal((app.match(/input: \{ placeholder: t\('the project folder\\'s name'\), copy: projectDesignation \}/g) ?? []).length, 4, 'a project-name ask without its copy key');
  assert.match(app, /copyKey\(nostromo\.gate\.input, nostromoDesignation\);/);
  assert.match(app, /Type the project name to confirm\.', \{ path: guarded \}\), copy: projectDesignation \}\)/);
  assert.match(app, /copyKey\(designation, receiving\);/);
  assert.match(await read('salas-mac.js'), /copyKey\(typed, name\);/);
  const key = await read('copy-key.js');
  assert.match(key, /navigator\.clipboard\.writeText\(text\)/);
  assert.doesNotMatch(key, /input\.value\s*=/, 'the key filled the field: typing the name is the confirmation');
  // Served to the page and through the phone's bridge, or app.js cannot import it.
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  assert.match(server, /'\/copy-key\.js'/);
  assert.match(await readFile(join(import.meta.dirname, '..', 'src', 'bridge', 'policy.mjs'), 'utf8'), /'\/copy-key\.js'/);
});
