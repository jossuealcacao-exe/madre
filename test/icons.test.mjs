// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ICONS, STROKE, trazo, trazoDrawing } from '../public/icons.js';
import { iconCopies } from '../scripts/icons.mjs';

const pub = (file) => new URL(`../public/${file}`, import.meta.url);

test('Trazo MADRE: one grid, one stroke, round ends, and the drawing says nothing of its own weight', () => {
  assert.equal(STROKE, 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"');
  for (const [name, inner] of Object.entries(ICONS)) {
    // The weight is the <svg>'s, so the CSS thickens every line of a key at once (--icon-w).
    assert.doesNotMatch(inner, /stroke-width=/, `${name} draws one weight`);
    assert.doesNotMatch(inner, /stroke-linecap="(butt|square)"|stroke-linejoin="(miter|bevel)"/, `${name} has no sharp end`);
    // Inside the 20 grid, 2 of margin aside (a ring may reach 1.6): every number a coordinate can be.
    for (const [, x, y] of inner.matchAll(/\s(?:cx|x)="([\d.]+)"[^>]*?\s(?:cy|y)="([\d.]+)"/g)) {
      assert.ok(Number(x) >= 1.5 && Number(x) <= 18.5 && Number(y) >= 1.5 && Number(y) <= 18.5, `${name} stays in its square`);
    }
  }
  assert.equal(trazo('close'), `<svg viewBox="0 0 20 20" ${STROKE} aria-hidden="true" data-icon="close">${ICONS.close}</svg>`);
  assert.equal(trazo('lock', 'lock closed'), `<svg class="lock closed" viewBox="0 0 20 20" ${STROKE} aria-hidden="true" data-icon="lock">${ICONS.lock}</svg>`);
  assert.equal(trazoDrawing('add'), `<g ${STROKE}>${ICONS.add}</g>`);
  assert.throws(() => trazo('nothing'), /No icon called nothing/);
});

test('Trazo MADRE: the parts the CSS moves and fills are still in the drawings that move', () => {
  const has = (name, ...classes) => { for (const one of classes) assert.match(ICONS[name], new RegExp(`class="[^"]*\\b${one}\\b`), `${name} keeps ${one}`); };
  has('links-key', 'ic-male', 'ic-female');
  has('market-key', 'ic-basket', 'ic-mods', 'ic-m1', 'ic-m2', 'ic-m3');
  has('modules', 'ic-q1', 'ic-q2', 'ic-q3', 'ic-q4');
  has('widgets', 'ic-w1', 'ic-w2', 'ic-w3');
  has('map-key', 'ic-planet');
  assert.equal(ICONS['map-key'].match(/<animateMotion begin="indefinite"/g).length, 2, 'the moons go round the ring when Home begins them');
  has('brain', 'brain-l', 'brain-r', 'brain-folds', 'ic-f');
  has('folder-key', 'ic-f', 'ic-k', 'ic-open');
  has('chat-key', 'ic-f', 'ic-k');
  has('mother', 'ic-disc', 'ic-k', 'ic-beat');
  has('globe', 'ic-f', 'ic-k', 'ic-ring');
  has('code', 'code-slash');
  has('trash', 'ic-lid');
  has('chip', 'ic-pins');
  has('spark', 'ic-spark-big', 'ic-spark-small');
  has('mod-intents', 'ic-needle');
  has('mod-ash', 'ic-arrow');
  // The Project map is a planet with its ring in both places (2026-10-28), the key's with its moons.
  assert.ok(ICONS['map-key'].startsWith(ICONS.map), 'the key is the map with moons');
  // The ring is broken where it passes behind the planet: one arc, not an ellipse crossing it.
  assert.match(ICONS.map, /<path d="M[\d.]+ [\d.]+A8 2\.9 -22 1 1 [\d.]+ [\d.]+"\/>/);
  // The gear fills as one piece with its hole (custom-button, aria-pressed).
  assert.match(ICONS.settings, /^<path class="ic-f" fill-rule="evenodd" d="M[^"]+ZM12\.3 10a2\.3 2\.3 0 1 1-4\.6 0 2\.3 2\.3 0 1 1 4\.6 0z"\/>$/);
  // The other projects' key moves the window behind on hover: svg > path.
  assert.match(ICONS.switch, /^<rect class="ic-f"[^>]*\/><path d="[^"]+"\/>$/);
});

test('Trazo MADRE: every copy written into a page is its drawing, and every page icon is one of them', async () => {
  assert.deepEqual(await iconCopies(), []);
  for (const page of ['index.html', 'salas-mac.html', 'salas.html']) {
    const text = await readFile(pub(page), 'utf8');
    for (const [svg] of text.matchAll(/<svg\b[^>]*viewBox="0 0 (?:16 16|20 20|24 24)"[^>]*>/g)) {
      // The progress ring of the steps pill is a meter, not an icon.
      if (/class="steps-ring"/.test(svg)) continue;
      assert.match(svg, /data-icon="[a-z0-9-]+"/, `${page}: ${svg}`);
    }
  }
});

test('Trazo MADRE: the scripts draw their icons from icons.js, not from copies of their own', async () => {
  const files = (await readdir(pub(''))).filter((file) => file.endsWith('.js') && file !== 'icons.js');
  // Drawings that are not icons: the brand, the loader, MADRE's 8-bit faces, the agents' marks,
  // the Market's art and a module's own drawing being cleaned (market.js), the tour's scenes, the Connections arrows (60 wide), the folder of «Add a
  // project» (32 wide) and the size and height a tile takes (drawn from its numbers).
  const ART = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg">\$\{markup\}|viewBox="(?:-4\.8|-2 -1|0 0 8 8|0 0 32 32|0 0 \$\{|0 0 320 150|0 0 60 16|0 0 32 26)|<svg>\$\{|logoBox|const (?:heightIcon|sizeIcon) = /;
  for (const file of files) {
    const text = await readFile(pub(file), 'utf8');
    for (const line of text.split('\n')) {
      for (const [svg] of line.matchAll(/<svg\b[^>]*>(?:(?!<\/svg>).)*<\/svg>/g)) {
        if (ART.test(svg) || ART.test(line)) continue;
        // A drawing given to a place that wraps it: ${…} inside, from icons.js or a module's own.
        assert.match(svg, /^<svg viewBox="0 0 20 20" aria-hidden="true">\$\{[^}]+\}<\/svg>$/, `${file}: ${svg.slice(0, 120)}`);
      }
    }
  }
});
