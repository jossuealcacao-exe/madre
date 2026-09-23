import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { versionOf, madreRelease } from '../src/modules/sdk.mjs';
import { MODULES } from '../src/modules/index.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('a version on a card is the module\'s own, or the version of what it wraps', async () => {
  const release = await madreRelease();
  const pkg = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'));
  assert.equal(release, pkg.version, 'MADRE does not read its own release');

  // A module that ships with MADRE declares its own version, and they all start at 1.0.0.
  assert.deepEqual(await versionOf({ kind: 'builtin' }, { declared: '1.0.0' }), { version: '1.0.0', source: 'declared' });
  assert.deepEqual(await versionOf({ kind: 'builtin' }, {}), { version: '1.0.0', source: 'declared' });

  // A module that wraps something else shows what was found here, and nothing found is not a
  // version: the card says it is not installed instead of inventing a number.
  assert.deepEqual(await versionOf({ kind: 'builtin' }, { declared: '1.0.0', tracked: '0.0.41' }), { version: '0.0.41', source: 'tracked' });
  assert.deepEqual(await versionOf({ kind: 'builtin' }, { declared: '1.0.0', tracked: null }), { version: null, source: 'tracked' });

  // Someone else's module keeps what it declares, and unversioned falls back to its file's day.
  assert.deepEqual(await versionOf({ external: true, file: 'x.mjs' }, { declared: '2.1.0' }), { version: '2.1.0', source: 'declared' });
  const dir = await mkdtemp(join(tmpdir(), 'madre-version-'));
  try {
    const file = join(dir, 'thing.mjs');
    await writeFile(file, 'export default {};');
    const when = new Date('2031-04-09T12:00:00Z');
    await utimes(file, when, when);
    assert.deepEqual(await versionOf({ external: true, file }, {}), { version: '2031-04-09', source: 'file' });
    assert.deepEqual(await versionOf({ external: true, file: join(dir, 'gone.mjs') }, {}), { version: null, source: 'none' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('MADRE\'s own modules start at 1.0.0; the ones that wrap something else track it instead', async () => {
  for (const module of MODULES) {
    if (module.tracks) {
      assert.equal(module.version, null, `${module.id} tracks ${module.tracks.name} and should not also declare a version`);
      assert.ok(module.tracks.npm || module.tracks.github, `${module.id} tracks something with no place to look for a newer one`);
    } else {
      assert.match(String(module.version), /^\d+\.\d+\.\d+$/, `${module.id} has no version of its own`);
    }
  }
  const { MODULES: list } = await import('../src/modules/index.mjs');
  const tracked = list.filter((module) => module.tracks).map((module) => module.id);
  assert.deepEqual(tracked.sort(), ['ahp', 'ollama', 'playwright'], 'the modules that wrap an outside thing changed');
});

test('a card says what it is running, and what is not installed is not a version', async () => {
  const app = await read('app.js');
  const label = app.slice(app.indexOf('function versionLabel('), app.indexOf('function updateWord('));
  assert.match(label, /item\.versionSource !== 'tracked'/);
  assert.match(label, /NOT INSTALLED/);
  assert.match(label, /INSTALLS \$\{target\}/);

  // The dependencies come normalised from the server, so a module cannot invent a shape.
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
  assert.ok(shell.includes('versionLabel(item)'), 'the card does not say what version is running');
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

test('every card carries a button that goes and looks for a newer version', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // One button, beside the version, on every card — and the screen itself never waits on a
  // registry: what it shows on open is whatever the day's cache already knew.
  assert.match(app, /const check = el\('button', 'check', '↻'\)/);
  assert.match(app, /fetch\(`\/api\/extensions\/\$\{item\.id\}\/updates`, \{ method: 'POST' \}\)/);
  assert.match(app, /const known = updateWord\(item\.update\)/, 'a card ignores what was already checked');
  assert.match(css, /\.module-card \.vendor \.check \{/);
  assert.match(css, /\.module-card \.vendor \.update\.new \{[^}]*var\(--warn\)/, 'a new version is not marked');

  // The server answers for one card at a time, and MODULES reads from the cache only.
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  assert.ok(server.includes('extensions\\/([a-z0-9-]+)\\/updates$/'), 'no route answers a single card');
  assert.match(server, /moduleUpdate\(item, \{ force: true \}\)/);
  const index = await readFile(join(import.meta.dirname, '..', 'src', 'modules', 'index.mjs'), 'utf8');
  assert.match(index, /await look\(item\)\.catch\(\(\) => null\)/);

  // And MADRE looks on its own: after the screen is answered, at most once an hour, and only
  // while the release channel is on. Nothing installed is never called up to date.
  assert.match(server, /void warmModuleUpdates\(extensions\)/, 'nothing keeps the cache warm, so the cards only ever know what a button found');
  assert.match(server, /if \(!updatesEnabled\(\) \|\| now - warmedAt < 60 \* 60 \* 1000\) return;/);
  assert.match(app, /NEWEST IS \$\{update\.latest\}/);
});

test('a module declares where a newer version would come from, and the check is cached a day', async () => {
  const { moduleUpdate, checkGithubRelease } = await import('../src/modules/updates.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'madre-updates-'));
  try {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));
      if (String(url).includes('registry')) return { ok: true, json: async () => ({ version: '0.0.9' }) };
      return { ok: true, json: async () => ({ tag_name: 'v0.31.0' }) };
    };

    // A module that ships with MADRE cannot update on its own: what can be newer is MADRE.
    const ash = await moduleUpdate({ id: 'ash', version: '1.0.0', tracks: null }, {
      stateRoot: dir, madre: { name: '@jossuealcala/madre', version: '0.4.0' }, fetchImpl, force: true,
    });
    assert.equal(ash.via, 'madre');
    assert.equal(ash.ships, '0.4.0');
    assert.equal(ash.latest, '0.0.9');

    // One that wraps a package asks the registry about that package, and compares what is here.
    const playwright = await moduleUpdate({ id: 'playwright', version: '0.0.4', tracks: { name: '@playwright/mcp', npm: '@playwright/mcp', github: null } }, {
      stateRoot: dir, madre: { name: 'm', version: '1' }, fetchImpl, force: true,
    });
    assert.equal(playwright.via, 'npm');
    assert.equal(playwright.available, true, '0.0.4 is older than 0.0.9');

    // One that wraps a program asks its releases, and the tag is a version like any other.
    const ollama = await moduleUpdate({ id: 'ollama', version: '0.30.11', tracks: { name: 'ollama', npm: null, github: 'ollama/ollama' } }, {
      stateRoot: dir, madre: { name: 'm', version: '1' }, fetchImpl, force: true,
    });
    assert.equal(ollama.via, 'github');
    assert.equal(ollama.latest, '0.31.0');
    assert.equal(ollama.available, true);

    // A screen reads the cache and never goes out.
    const before = calls.length;
    const cached = await moduleUpdate({ id: 'ollama', version: '0.30.11', tracks: { name: 'ollama', npm: null, github: 'ollama/ollama' } }, {
      stateRoot: dir, madre: { name: 'm', version: '1' }, fetchImpl,
    });
    assert.equal(calls.length, before, 'opening MODULES went to the network');
    assert.equal(cached.latest, '0.31.0', 'the cache is not read back');

    // And with the release channel off, nothing leaves at all.
    const off = await checkGithubRelease({ repo: 'ollama/ollama', current: '0.1.0', cacheFile: join(dir, 'x.json'), fetchImpl, enabled: false, force: true });
    assert.equal(off.source, 'off');
    assert.equal(calls.length, before, 'a disabled check still reached out');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
