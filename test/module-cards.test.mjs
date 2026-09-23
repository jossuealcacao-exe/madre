import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { versionOf, madreRelease } from '../src/modules/sdk.mjs';
import { MODULES } from '../src/modules/index.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('a module reports the version it actually has, never one written by hand', async () => {
  const release = await madreRelease();
  const pkg = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'));
  assert.equal(release, pkg.version, 'MADRE does not read its own release');

  // A module that ships with MADRE has no version of its own: it moves with the release. Ash was
  // rebuilt from nothing and still said 1.0.0, because the number lived in the file.
  assert.deepEqual(await versionOf({ kind: 'builtin' }, '1.0.0'), { version: release, source: 'madre' });

  // An installer ships with MADRE too: what it pins is a dependency, and it says so as a tag.
  assert.deepEqual(await versionOf({ kind: 'installer' }, '1.4.1'), { version: release, source: 'madre' });

  // Someone else's module keeps what it declares.
  assert.deepEqual(await versionOf({ external: true, file: 'x.mjs' }, '2.1.0'), { version: '2.1.0', source: 'declared' });

  // And when it declares nothing, the day its file was last written is the only truth on disk.
  const dir = await mkdtemp(join(tmpdir(), 'madre-version-'));
  try {
    const file = join(dir, 'thing.mjs');
    await writeFile(file, 'export default {};');
    const when = new Date('2031-04-09T12:00:00Z');
    await utimes(file, when, when);
    assert.deepEqual(await versionOf({ external: true, file }, null), { version: '2031-04-09', source: 'file' });
    assert.deepEqual(await versionOf({ external: true, file: join(dir, 'gone.mjs') }, null), { version: 'unversioned', source: 'none' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('the modules that ship with MADRE declare no version of their own', async () => {
  for (const module of MODULES) {
    assert.equal(module.version, null, `${module.id} writes a version into its file, and it will go stale`);
  }
});

test('a version on a card belongs to something named, and what is missing says so', async () => {
  const app = await read('app.js');
  const tags = app.slice(app.indexOf('function versionTags('), app.indexOf('function cardFold('));

  // MADRE's own modules carry MADRE's release; a module someone wrote carries its own file.
  assert.match(tags, /MADRE \$\{item\.version\}/);
  assert.match(tags, /MODULE \$\{item\.version\}/);
  assert.match(tags, /FILE \$\{item\.version\}/);
  // And each outside thing it drives is its own tag: found, to be installed, or plainly absent.
  assert.match(tags, /NOT FOUND/);
  assert.match(tags, /INSTALLS \$\{dep\.target\}/);

  // The dependencies come normalised from the server, so a module cannot invent a tag shape.
  const { dependencies } = await import('../src/modules/sdk.mjs');
  assert.deepEqual(dependencies([{ name: 'git', version: '2.54.0' }, { name: 'x' }, null, { version: '1' }]), [
    { name: 'git', version: '2.54.0', target: null },
    { name: 'x', version: null, target: null },
  ]);
  assert.deepEqual(dependencies(undefined), []);
});

test('a dependency version is read from the package, never asked of npx', async () => {
  const { packageVersion } = await import('../src/modules/helpers.mjs');
  const here = join(import.meta.dirname, '..');

  // npm is a real package on this machine; nothing in MADRE's tree is called this.
  assert.equal(await packageVersion('@madre/nothing-is-called-this', { projectRoot: here }), null);

  // The bug this replaces: `npx --no <package> --version` answers with npm's own version and
  // exits 0 when the package is not installed, so PLAYWRIGHT reported a server that was absent.
  const playwright = await readFile(join(here, 'src', 'modules', 'playwright.mjs'), 'utf8');
  assert.ok(!playwright.includes("'--version'"), 'the browser server is still asked for its own version');
  assert.match(playwright, /packageVersion\(PLAYWRIGHT_PACKAGE/);

  // A package that is really there is read from its own package.json.
  const own = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'));
  const dependency = Object.keys(own.devDependencies ?? {})[0];
  if (dependency) assert.ok(await packageVersion(dependency, { projectRoot: here }), `${dependency} is installed but was not found`);
});

test('every card has the same floors, and the switch is always the last one', async () => {
  const app = await read('app.js');
  const shell = app.slice(app.indexOf('function cardShell('), app.indexOf('function ashReading('));

  // One shape for all of them: name and version, how it is doing, what it does, what it touches,
  // then the module's own panel and, last, the actions.
  assert.ok(shell.includes("el('h4', null, item.name)"), 'the card does not name the module');
  assert.ok(shell.includes('versionTags(item)'), 'the card carries no version tags');
  assert.ok(shell.includes("cardFold(card, 'WHAT IT TOUCHES'"), 'the bullets are not a section of their own');
  assert.match(shell, /card\.append\(panel, actions\);/, 'the actions are not the last floor of the card');

  // Both kinds of card are built through it, so neither can drift into its own shape.
  assert.match(app, /function builtinCard\(item\) \{[\s\S]{0,400}cardShell\(item/);
  assert.match(app, /function moduleCard\(item\) \{[\s\S]{0,400}cardShell\(item/);

  // What a module knows about itself belongs on its card: a reading, a setting, or both.
  assert.ok(app.includes("ashReading(panel)"), 'the economy is not on Ash\'s card');
  assert.ok(app.includes("cardBlock(panel, 'LOCAL BRAIN')"), 'Ollama does not report on its own card');
  assert.ok(app.includes("cardBlock(panel, 'ROLES')"), 'the local roles are not settings on the card');
  assert.ok(app.includes("cardBlock(panel, 'BROWSER')"), 'PLAYWRIGHT keeps its settings out of reach');
  assert.ok(app.includes("cardBlock(panel, 'MODEL')"), 'the image model is not a setting on the card');
});

test('the numbers on a card can never land on their own labels', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // Each figure and its name are separate cells in a grid that gives them room; they used to be
  // a flex row with the figure in the page's near-white and the panel's glow smeared over both.
  assert.match(app, /cell\.append\(el\('b', null, String\(value\)\), el\('span', null, label\)\)/);
  const grid = css.match(/\.module-card \.metrics \{([^}]*)\}/);
  assert.ok(grid && /display: grid/.test(grid[1]) && /auto-fit/.test(grid[1]), 'the metrics do not lay out as a grid');
  const figure = css.match(/\.module-card \.metric b \{([^}]*)\}/);
  assert.ok(figure, 'the figure has no styling of its own');
  assert.match(figure[1], /line-height:/, 'the figure has no line height, so it can overlap its label');
  assert.match(figure[1], /text-shadow: none/, 'the panel glow still smears the figure');
  assert.match(figure[1], /var\(--ph\)/, 'the figure wears the page palette inside the panel');
  const label = css.match(/\.module-card \.metric span \{([^}]*)\}/);
  assert.ok(label && /var\(--ph-dim\)/.test(label[1]), 'the label wears the page palette inside the panel');
});

test('a fold inside a card is not one of MU/TH/UR\'s sections, and carries its own button', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  const fold = app.slice(app.indexOf('function cardFold('), app.indexOf('function cardBlock('));

  // Fourteen folds in another dialog must not answer to the panel's EXPAND ALL.
  assert.ok(fold.includes("el('details', 'card-fold')"), 'a card fold is built as a panel section');
  assert.ok(!fold.includes("el('details', 'fold')"));
  assert.match(app, /function everyFold\(\) \{ return \[\.\.\.document\.querySelectorAll\('\.mother-section \.fold'\)\]/);

  // It says what clicking it will do, and it remembers being left open, like every other fold.
  assert.match(fold, /caret\.textContent = box\.open \? '▾ COLLAPSE' : '▸ EXPAND'/);
  assert.match(fold, /rememberFold\(key, box\.open\)/);
  assert.match(css, /\.module-card \.card-fold > summary \.caret \{/);
});
