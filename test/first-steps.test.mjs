import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', file), 'utf8');

test('first contact: the five-stop tour of 0.7 is gone; the welcome of 1.0 (public/tour.js) is the only one', async () => {
  const [app, page] = await Promise.all([read('public/app.js'), read('public/index.html')]);
  assert.ok(!app.includes('TOUR_STEPS') && !/function startTour\(\)/.test(app), 'the old tour still has code');
  assert.ok(!page.includes('id="tour"'), 'the old tour still has its dialog');
  assert.match(app, /import \{ (?:spotlight, )?startTour as startWelcome \} from '\.\/tour\.js';/);
});

test('first steps: one list, the five missions; the six steps of 0.7 that rode beside them are gone (2026-11-14)', async () => {
  const [app, page, css, tour] = await Promise.all([read('public/app.js'), read('public/index.html'), read('public/styles.css'), read('public/tour.js')]);
  // Two «First steps» in the bar at once, a ring of six and a pill of five, read as a mistake: the
  // missions (public/missions.js) replaced the six, and the six leave with their pill and card.
  for (const gone of ['const FIRST_STEPS = [', 'function stepDone(', 'stepsSaw(', 'stepsResume(', "'#steps-pill'"]) assert.ok(!app.includes(gone), `${gone} is still in app.js`);
  assert.ok(!page.includes('id="steps-pill"'), 'the pill of the six steps is still in the page');
  assert.ok(!/\.steps-pill|\.steps-card/.test(css), 'styles of the six steps are still there');
  assert.match(tour, /fill\(t\('Your first steps · \{n\} of \{total\}'\)/);
  // ? opens the tour's chapters; it no longer brings back a hidden list.
  assert.match(app, /document\.querySelector\('#mother'\)\?\.close\?\.\(\); roomTour\(\)\.openChapters\(\);/);
  assert.match(app, /const BAR_CONTEXTUAL = \['#tour-pill-slot', '#handoff-pill', '#update-pill', '#stop-all'\];/);
});

test('scrolling: the editor keeps its wheel, and the conversation scrolls without layers of glass', async () => {
  const [editor, css, app] = await Promise.all([read('public/editor.js'), read('public/styles.css'), read('public/app.js')]);
  assert.match(editor, /node\.addEventListener\('wheel', \(event\) => \{\n {4}if \(event\.ctrlKey \|\| event\.target === input\) return;/);
  assert.match(css, /scrollbar-width: thin; overscroll-behavior: contain;\n\}/);
  assert.match(css, /\.viewer-body \{ height: calc\(100% - 46px\); overflow: auto; overscroll-behavior: contain;/);
  // Nothing in the conversation blurs what is behind it: a layer per row is what drew empty,
  // square bubbles while scrolling. The glass stays on the bar and the box, which do not scroll.
  assert.match(css, /:root\[data-wallpaper\] #messages, :root\[data-wallpaper\] #messages \* \{ -webkit-backdrop-filter: none !important; backdrop-filter: none !important; \}/);
  assert.ok(!app.includes("classList.toggle('in-view'"), 'rows are still lit one by one as they scroll in');
  assert.ok(!/\.in-view/.test(css), 'a rule still waits for a row to come into view');
});

test('depth: what was said sits highest, what the room did below it, labels flat on the picture', async () => {
  const css = await readFile(join(import.meta.dirname, '..', 'public/styles.css'), 'utf8');
  const block = css.slice(css.indexOf('DEPTH OF THE CONVERSATION'));
  for (const token of ['--d3-fill', '--d3-light', '--d3-shadow', '--d2-fill', '--d2-shadow', '--d1-fill']) assert.ok(block.includes(`${token}:`), `${token} is not defined`);
  assert.match(block, /\.row:is\(\.assistant, \.thinking\) \.bubble \{\n  background-color: var\(--d3-fill\) !important;\n  box-shadow: var\(--d3-light\), var\(--d3-shadow\) !important;/);
  assert.match(block, /\.row\.user \.bubble \{\n  box-shadow: inset 0 1px 0 rgba\(255, 255, 255, \.22\), var\(--d3-shadow\) !important;/);
  assert.match(block, /\.thread-inner > \.system:not\(\.mother-alert\) \{ box-shadow: var\(--d2-shadow\) !important; \}/);
  // A step of a plan is told by its tone, not by a bar on its left edge.
  assert.ok(!/delegated \.bubble::before/.test(css), 'a step of a plan still wears a bar on its left');
});
