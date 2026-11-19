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
