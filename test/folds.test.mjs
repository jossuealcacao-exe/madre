import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('mother: the long sections fold, and remember whether you left them open', async () => {
  const app = await read('app.js');

  // Both of the sections that fill the panel are folded through one helper, so they behave the
  // same way and there is one place to change how folding works.
  const helper = app.slice(app.indexOf('const FOLD_KEY'), app.indexOf('function connectionCard('));
  assert.ok(helper.includes("el('details', 'fold')"), 'folding is not built on a native disclosure');
  assert.ok(helper.includes("el('summary')"), 'the header is not the thing you click');
  assert.match(app, /folding\(section, `CONNECTIONS/, 'connections does not fold');
  assert.match(app, /folding\(section, `RELEASE CHANNEL/, 'the release channel does not fold');

  // A panel that forgets is one you fight with on every visit, and a private window that cannot
  // remember must still open.
  assert.match(helper, /localStorage/);
  assert.match(app, /catch \{ return \{\}; \}/, 'a browser that refuses storage would break the panel');
  assert.match(helper, /box\.addEventListener\('toggle'/, 'closing a section is not remembered');
});

test('mother: a new version is a red mark and nothing else until it is opened', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // Closed by default: a room that is up to date has nothing to say there.
  const release = app.slice(app.indexOf('folding(section, `RELEASE CHANNEL'), app.indexOf('folding(section, `RELEASE CHANNEL') + 600);
  assert.match(release, /open: false/, 'the release channel opens itself');
  assert.match(release, /badge: info\.available \? \{[^}]*urgent: true/, 'a new version raises no mark');
  // The header no longer announces it: that is what the mark is for.
  assert.ok(!/RELEASE CHANNEL · \$\{info\.latest\} AVAILABLE/.test(app), 'the header still spells out the news the badge carries');

  // Red, and only when it is urgent. An ordinary count stays quiet.
  assert.match(css, /\.fold-badge\.urgent \{[^}]*background: var\(--danger\)/);
  const plain = css.match(/\.fold-badge \{([^}]*)\}/);
  assert.ok(plain && !/var\(--danger\)/.test(plain[1]), 'every badge is red, so red says nothing');

  // And the mark is on the summary, so it is visible while the section is shut.
  assert.match(app, /head\.append\(mark\)/);
});

test('mother: the checkbox lines up with the words above it', async () => {
  const css = await read('styles.css');
  // It sat a few pixels in from the paragraph above, on a browser's own margin, so the column
  // did not read straight down.
  const box = css.match(/\.mother-section\.sentinel \.toggle input[^{]*\{([^}]*)\}/);
  assert.ok(box, 'the checkbox has no styling of its own');
  assert.match(box[1], /margin: 0/, 'the checkbox keeps the browser margin that pushed it out of line');
  assert.match(box[1], /flex: none/, 'the checkbox can still be squeezed out of shape');
  const row = css.match(/\.mother-section\.sentinel \.sentinel-controls, \.mother-section\.update \.sentinel-controls \{[^}]*margin-left: 0/);
  assert.ok(row, 'the row that holds it is still indented');
});
