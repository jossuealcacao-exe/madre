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

test('mother: every long section folds, and one button moves all of them', async () => {
  const [app, page, css] = await Promise.all([read('app.js'), read('index.html'), read('styles.css')]);

  // Everything in the panel that runs long folds, and all of it through the same helper.
  for (const [key, header] of [
    ['connections', 'CONNECTIONS'], ['room-settings', 'ROOM SETTINGS'], ['memory', 'MEMORY'],
    ['privacy', 'PRIVACY'], ['sentinel', 'SENTINEL'], ['update', 'RELEASE CHANNEL'],
  ]) {
    const at = app.indexOf(`key: '${key}'`);
    assert.ok(at > 0, `${header} does not fold`);
    // The key belongs to the call that folds that header, not to some other one nearby.
    const call = app.slice(Math.max(0, at - 400), at);
    assert.ok(call.includes('folding(section'), `${header}'s key is not on a folding call`);
    assert.ok(call.includes(header), `the ${key} fold does not carry the ${header} header`);
  }

  // Nothing appends a bare header any more where a fold should be.
  for (const header of ['ROOM SETTINGS', 'SENTINEL ·', 'PRIVACY ·', 'MEMORY ·']) {
    assert.ok(!app.includes(`section.append(el('h3', null, '${header}'`), `${header} is still a plain header`);
  }

  // One button for the panel, and it says what it will do rather than what the panel is.
  assert.match(page, /id="fold-all"/, 'there is no way to open everything at once');
  const all = app.slice(app.indexOf('function everyFold('), app.indexOf('function folding('));
  assert.match(all, /some\(\(fold\) => !fold\.open\) \? 'EXPAND ALL' : 'COLLAPSE ALL'/, 'the button does not say what it will do');
  assert.match(all, /button\.hidden = folds\.length < 2/, 'the button shows even when there is nothing to move');
  assert.match(all, /rememberFold\(fold\.dataset\.fold, open\)/, 'moving everything at once is not remembered');
});

test('mother: a command in the panel can be read, and the steps do not shout', async () => {
  const css = await read('styles.css');

  // The panel is phosphor on black. A command drawn in the page's own text colour was all but
  // invisible there, which is how it shipped.
  const code = css.match(/\.mother-section \.update-command code \{([^}]*)\}/);
  assert.ok(code, 'commands in the panel have no colour of their own');
  assert.match(code[1], /color: var\(--ph\)/);

  // The browser numbered the steps at the panel's own size, which made them shout. They are an
  // index in the margin now.
  const steps = css.match(/\.mother-section \.train-steps \{([^}]*)\}/);
  assert.ok(steps, 'the steps are still numbered by the browser');
  assert.match(steps[1], /list-style: none/);
  const marker = css.match(/\.mother-section \.train-steps > li::before \{([^}]*)\}/);
  assert.ok(marker, 'the steps lost their numbers entirely');
  assert.match(marker[1], /content: counter\(step\)/);
  const size = Number(marker[1].match(/font-size: ([\d.]+)px/)?.[1]);
  assert.ok(size && size <= 10, `a step number at ${size}px is still shouting`);
  // The closing note is not a step and is not numbered as one.
  assert.match(css, /\.mother-section \.train-steps > li\.note::before \{ content: none; \}/);
});

test('mother: every section that folds carries the same button, and there is only one kind', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // The panel had two ways of folding: a pair of sections with a real EXPAND/COLLAPSE button,
  // and the newer ones with a bare glyph. One way now, and it is the one that uses words.
  const helper = app.slice(app.indexOf('function folding('), app.indexOf('function connectionCard('));
  assert.match(helper, /'▾ COLLAPSE' : '▸ EXPAND'/, 'the fold does not say what clicking it will do');
  assert.match(helper, /box\.addEventListener\('toggle', \(\) => \{ label\(\)/, 'the button does not change when the section does');

  // The older pair go through the same helper now, so nothing is left rendering its own header.
  for (const key of ['recorded', 'known']) {
    assert.match(app, new RegExp(`key: '${key}'`), `the ${key} list no longer folds`);
  }
  assert.ok(!app.includes("el('h3', 'toggle')"), 'a section is still building its own folding header');
  assert.ok(!app.includes("headButton.setAttribute('aria-expanded'"), 'a hand-rolled disclosure survived');
  // And a native disclosure needs no aria of its own, which is half the reason for using one.
  assert.equal((app.match(/el\('details', 'fold'\)/g) ?? []).length, 1, 'folds are being built in more than one place');

  // The glyph is gone from the stylesheet with it.
  assert.ok(!/fold > summary::after \{ content: '\+'/.test(css), 'the bare glyph is still styled');
  assert.match(css, /\.fold > summary \.caret \{/, 'the button has no styling of its own');
});

test('mother: a preference set before the folds existed is not thrown away', async () => {
  const app = await read('app.js');
  // Both lists were remembered under their own keys long before there was one helper. Those are
  // read once as the default, and from then on the fold remembers like every other section.
  assert.match(app, /localStorage\.getItem\('pulse\.mother\.log'\)/, 'the old preference for the log is ignored');
  assert.match(app, /localStorage\.getItem\('pulse\.mother\.known'\)/, 'the old preference for the list is ignored');
  assert.match(app, /open: !collapsed/, 'the old preference is read but not used');
  // Nothing writes to the old keys any more: two places remembering the same thing is one too many.
  assert.ok(!app.includes("localStorage.setItem('pulse.mother.log'"), 'the log still writes to its old key');
  assert.ok(!app.includes("localStorage.setItem('pulse.mother.known'"), 'the list still writes to its old key');
  // Choosing a fix from the log opens the list through the fold, not behind its back.
  assert.match(app, /rememberFold\('known', true\)/);
});
