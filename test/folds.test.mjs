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

test('mother: a badge says something the header does not, or it is not there', async () => {
  const app = await read('app.js');
  // Four sections carried a badge repeating a number their own header already stated. A mark
  // that is always there stops being a mark, and the same number twice is noise.
  const badges = [...app.matchAll(/folding\([^;]*?badge: ([^;]*?)\}\);/gs)];
  assert.equal(badges.length, 2, `${badges.length} sections carry a badge; only connections and the release channel say something their header does not`);
  for (const [, body] of badges) assert.match(body, /urgent: true/, 'a badge that is not urgent survived');

  // And the two that remain are the two that add something: how many are NOT signed in, and
  // which version is waiting. Neither number appears in its own header.
  assert.match(app, /badge: out > 0 \? \{ text: String\(out\)/, 'connections no longer says how many are out');
  assert.match(app, /badge: info\.available \? \{ text: info\.latest/, 'the release channel no longer names the version waiting');
});

test('mother: the panel reads as a terminal, and nothing in it is drawn in the page colour', async () => {
  const css = await read('styles.css');

  // Terminal.app's own Homebrew profile. The panel used to be a softer yellow-green that read as
  // a design choice rather than as a terminal.
  // NOSTROMO has a red phosphor of its own, so this is the panel's, not the first one found.
  const panel = css.match(/\n\s*\/\* Terminal\.app's Homebrew profile[^\n]*\n\s*--ph: (#[0-9a-f]{6});/i);
  assert.ok(panel, 'the panel has no phosphor of its own');
  assert.equal(panel[1].toLowerCase(), '#28fe14');
  const brew = css.match(/--brew: (#[0-9a-f]{6});/i);
  assert.equal(brew[1].toLowerCase(), '#28fe14', 'the panel and the terminal green have drifted apart');

  // Every field in these forms is drawn in phosphor on black. A textarea was left out of that
  // rule, so what you typed into it was invisible; nothing may be left out again.
  const fields = css.match(/\.conn-card input, \.settings \.room-form input, \.settings \.room-form select([^{]*)\{([^}]*)\}/);
  assert.ok(fields, 'the fields no longer share one rule');
  assert.match(fields[1], /textarea/, 'a textarea is not drawn like the other fields');
  assert.match(fields[2], /color: var\(--ph\)/);
});

test('mother: a chosen mode wears its own colour, and the rows line up', async () => {
  const css = await read('styles.css');

  // It was phosphor for every mode but #3, which made one card look like a warning and the rest
  // like settings, when all five are the same kind of choice.
  const chosen = css.match(/\.conn-card \.seg-option\.current \{([^}]*)\}/);
  assert.ok(chosen, 'a chosen mode has no styling');
  assert.match(chosen[1], /background: var\(--mode/);
  // The red that used to be painted onto #3 alone. It still belongs elsewhere, so the check is
  // of the mode chips rather than of the whole stylesheet.
  const chips = css.slice(css.indexOf('.conn-card .seg {'), css.indexOf('.conn-card .seg-option:disabled'));
  assert.ok(!/#[0-9a-f]{6}/i.test(chips.replace(/--mode-ink, #041004/g, '')), 'a mode chip still carries a colour of its own instead of the mode\'s');
  for (const n of [0, 1, 2, 3, 4]) {
    assert.match(css, new RegExp(`\\.conn-card \\.seg-option\\.o${n} \\{[^}]*--mode: var\\(--mode-${n}\\)`), `mode ${n} does not carry its own colour`);
  }

  // The label column is one width, so MAX MODE and DEFAULT MODE start at the same place instead
  // of each beginning where its own words happen to end.
  const row = css.match(/\.conn-card \.ceiling \{([^}]*)\}/);
  assert.ok(row, 'the mode rows have no layout');
  assert.match(row[1], /grid-template-columns: \d+px/, 'the label column is still sized to its own words');
});
