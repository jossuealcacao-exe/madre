import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

// Home's bar fits its row (2026-10-18): with the Market and Modules keys it ran under the right
// group and left the pinned projects a sliver («+5»), with no room to drop or move one.
test('Home\'s bar: what steps out, in order, so the projects keep their room', async () => {
  const [js, css] = await Promise.all([read('salas-mac.js'), read('salas-mac.css')]);
  assert.match(js, /const BAR_ROOMS = 220;/);
  assert.match(js, /for \(const step of \['is-tight', 'is-tighter', 'is-tightest'\]\) \{ if \(!short\(\)\) break; bar\.classList\.add\(step\); \}/);
  // The projects are asked again at each step, and while the bar is arranged they all have to fit.
  assert.match(js, /pinsFit\(\);\n    return pins\.spilled\.length > 0 && rooms\.clientWidth < BAR_ROOMS;/);
  assert.match(js, /if \(pins\.editing\) return rooms\.scrollWidth > rooms\.clientWidth \+ 1;/);
  // Fitting is not a change to fit again.
  assert.match(js, /barWatch\?\.takeRecords\(\);/);
  // The computer's name first, then the keys' words (the name stays in the tooltip), then the agents.
  assert.match(css, /\.sm-topbar\.is-tight \.sm-live > span \{ display: none; \}/);
  assert.match(css, /\.sm-topbar\.is-tighter \.sm-barkey > span \{ display: none; \}/);
  assert.match(css, /\.sm-topbar\.is-tightest \.sm-tb-agents \{ display: none; \}/);
  assert.match(js, /key\.title = words; key\.setAttribute\('aria-label', words\);/);
});
