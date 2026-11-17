// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Small fixes of 2026-11-17, each held to what it does: whole words in Home's titles, dates in
// MADRE's language, the kinds of request on a narrow Modules sheet, a notice that folds without
// moving what is read, and five texts said plainly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dateWords, setLanguage, language, t } from '../public/i18n.js';

const pub = (file) => readFileSync(join(import.meta.dirname, '..', 'public', file), 'utf8');
const plain = (text) => text.replace(/[  ]/g, ' ');

test('17 nov · Home cuts a title at its last whole word, with «…», and shows it whole on the pointer', () => {
  const home = pub('salas-mac.js');
  assert.match(home, /function chatNameNode\(tag, title\)/);
  assert.match(home, /whole\.length >= 80 \? `\$\{whole\.replace\(\/\\s\+\\S\*\$\/, ''\)/);
  assert.match(home, /if \(node\.textContent !== whole\) node\.title = whole;/);
  // The recent summary and a project's card both use it.
  assert.match(home, /words\.append\(chatNameNode\('b', one\.title\)\)/);
  assert.match(home, /chat\.append\(chatNameNode\('b', glance\.chat\.title\)\)/);
});

test('17 nov · a date reads in MADRE\'s language, not the browser\'s', () => {
  const before = language();
  const at = new Date(2026, 10, 15, 16, 11, 5);
  try {
    setLanguage('es');
    assert.equal(plain(dateWords(at)), '15/11/2026, 16:11');
    assert.equal(plain(dateWords(at, { time: false })), '15/11/2026');
    setLanguage('en');
    assert.equal(plain(dateWords(at)), '11/15/2026, 4:11 PM');
    assert.equal(dateWords('not a date'), '');
  } finally { setLanguage(before); }
  // Settings › Version, the memory's cards and dates, the chats' list and Home's notices use it.
  const room = pub('app.js');
  assert.match(room, /const when = info\.checkedAt \? dateWords\(info\.checkedAt\) : null;/);
  assert.match(room, /\{ when: dateWords\(d\.exportedAt\), train: d\.train, valid: d\.valid \}/);
  assert.match(room, /cardPart\(card, 'when'\)\.textContent = memory\.created \? dateWords\(memory\.created\) : '';/);
  assert.match(pub('salas-mac.js'), /t\('from \{date\}', \{ date: dateWords\(one\.from\) \}\)/);
  assert.match(pub('macroverso.js'), /memory\.created \? dateWords\(memory\.created\) : null/);
});

test('17 nov · on a Modules sheet of 480 px or less the kinds of request keep their columns, as in Settings', () => {
  const css = pub('styles.css');
  const four = css.indexOf('.mods-detail .mods-reading .intents-table { grid-template-columns: minmax(0, 1.1fr) minmax(64px, .55fr) minmax(52px, auto) minmax(0, 2fr) !important;');
  const narrow = css.indexOf('.mods-detail .mods-reading .intents-table { grid-template-columns: minmax(0, 1fr) auto auto !important; column-gap: 14px !important; }');
  assert.ok(four > 0 && narrow > four, 'the narrow sheet\'s columns come after the four they replace, so they win');
  assert.match(css, /\.mods-detail \.mods-reading \.intents-table > span\.intent-state:nth-child\(4n\) \{ grid-column: 1 \/ -1;/);
  assert.match(css, /\.mods-detail \.mods-reading \.intents-table > \.intent-head:nth-child\(4\) \{ display: none; \}/);
  assert.ok(!css.includes('.mods-detail .mods-reading .intents-table :is(.intent-rung, .intent-n) { display: none; }'), 'the level and the turns are hidden again, and «Nivel» stands alone');
});

test('17 nov · a notice folds without moving what is read: the place is put back, or the space closes gently', () => {
  const room = pub('app.js');
  assert.match(room, /const reading = !quiet && !replaying && !drawingRecord \? readingPlace\(node\) : null;/);
  assert.match(room, /if \(reading\) keepReading\(reading, strip, \{ overRow: strip === after \}\);/);
  const keep = room.slice(room.indexOf('function keepReading('), room.indexOf('function foldNotice('));
  assert.match(keep, /const left = shrunk - \(was\.top - scroller\.top\);/);
  assert.match(keep, /if \(reducedMotion\(\) \|\| typeof strip\.animate !== 'function'\) return;/);
  assert.match(keep, /strip\.animate\(\[\{ \[side\]: `\$\{rest \+ shrunk\}px` \}, \{ \[side\]: `\$\{rest\}px` \}\]/);
  assert.match(keep, /if \(Math\.abs\(scroller\.top - was\.top\) >= 1\) \{ ourScroll\(\); scroller\.top = was\.top; \}/);
});

test('17 nov · five texts said plainly', () => {
  const before = language();
  try {
    setLanguage('es');
    // Settings › Local AI and Memory: both «Quién…».
    assert.equal(t('Archivist'), 'Quién resume la memoria');
    assert.equal(t('Who does it first'), 'Quién lo hace primero');
    // Open the memory: «las IAs», in both languages.
    assert.match(t('The archive of this project: every memory the agents distilled, linked by what they share.'), /resumieron las IAs/);
    setLanguage('en');
    assert.match(t('The archive of this project: every memory the agents distilled, linked by what they share.'), /your AIs/);
    // Modules › Continuity says its status in the room's language.
    setLanguage('es');
    assert.equal(t('cli {version}', { version: '1.4.2' }), 'programa 1.4.2');
    assert.equal(t('protocol {version}', { version: '1.4.0' }), 'protocolo 1.4.0');
    // The Coordinator's box: every project, not one.
    assert.equal(t('What do you need? Ask anything about all your projects…'), '¿Qué necesitas? Pregunta lo que quieras de todos tus proyectos…');
  } finally { setLanguage(before); }
  assert.match(readFileSync(join(import.meta.dirname, '..', 'src', 'modules', 'ahp.mjs'), 'utf8'), /t\('cli \{version\}', \{ version: pinned \}\)/);
  const room = pub('app.js');
  assert.match(room, /state\.salas \? PLACEHOLDERS\.coordinator : PLACEHOLDERS\.plain;/);
  // Token saver's cards say their title in sentence case from the script: the stylesheet no longer
  // lowercases «Ahorro de tokens».
  assert.match(room, /el\('span', null, sentenceCase\(title\)\)/);
  assert.match(pub('styles.css'), /\.module-app \.card-head span \{ display: inline-block; text-transform: none; \}/);
});

test('closing the first-time card of «Plan actual» leaves the panel open (2026-11-17)', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const activity = await readFile(join(import.meta.dirname, '..', 'public', 'activity.js'), 'utf8');
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // A press on the card is not a press outside the panel.
  assert.match(activity, /!key\.contains\(event\.target\) && !event\.target\?\.closest\?\.\('\.hint-card'\)\) close\(\);/);
  // Escape puts the card away without reaching the panel's own Escape.
  assert.match(app, /const escape = \(event\) => \{ if \(event\.key === 'Escape'\) \{ event\.stopPropagation\(\); close\(\); \} \};/);
});
