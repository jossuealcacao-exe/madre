import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('mother: a window like AJUSTES, with the answer first and the list beside it', async () => {
  const [app, page, css] = await Promise.all([read('app.js'), read('index.html'), read('styles.css')]);
  // MU/TH/UR is a window of the room now: carried by its head, pulled by its edges, remembered.
  assert.match(page, /<dialog id="mother" class="surface window settings-window mother-window"/);
  assert.match(page, /<span class="custom-title mother-mark">DIAGNOSTICS<\/span>/, 'the window says what it is');
  assert.match(app, /carryWindowBy\(head, node, \{ box: \(\) => motherWindow\.box, place: placeMother, done: rememberMotherBox \}\);/);
  assert.match(app, /windowEdgesFor\(node, \{ box: \(\) => motherWindow\.box, place: placeMother, done: rememberMotherBox, minW: 340, minH: 320 \}\);/);
  assert.match(app, /localStorage\.setItem\('pulse\.motherWindow'/);
  // It is not a surface to split any more, and it does not trap the room.
  assert.ok(!/\{ key: 'mother', kind:/.test(app), 'MU/TH/UR is a split surface again');
  assert.match(app, /function openMother\(\) \{[\s\S]*?if \(DIALOG\) DIALOG\.show\.call\(node\); else node\.show\?\.\(\);/);
  // Escape clears what was written before it closes.
  assert.match(app, /if \(mother\.input\.value\) \{ mother\.input\.value = ''; answerQuery\(''\); return; \}/);
  // The list and the answer side by side; a narrow window puts the answer first.
  assert.match(page, /<section id="mother-list" class="mother-list"[\s\S]*<section id="mother-answer" class="mother-detail"/);
  assert.match(css, /dialog\.mother-window \{[^}]*container: motherwin \/ inline-size;/);
  // The folds of the old console are gone with it.
  for (const gone of ['id="fold-all"', 'class="fold-all-row"', 'id="mother-recorded"', 'id="mother-known"']) assert.ok(!page.includes(gone), `${gone} survived`);
  for (const gone of ['function everyFold(', 'function folding(', 'function conditionCard(']) assert.ok(!app.includes(gone), `${gone} survived`);
  // Both columns keep to their width: a long title is cut, the agent and the code stay in view.
  assert.match(css, /\.mother-list \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.remedy-rows \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
  // «Ask MU/TH/UR how» lands on a remedy: its own, the permission's general one, or a search by its name.
  assert.match(app, /conditionById\(conditionId\) \?\? conditionById\(conditionId\.replace\(\/\^scope-\[\^-\]\+-\/, 'scope-'\)\)/);
  assert.match(app, /askMotherAbout\(`scope-\$\{agent\.id\}-\$\{key\}`, labelText\)/);
});

test('settings: a new version is said once, in amber, where the version lives', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  // The version left MU/TH/UR for AJUSTES. A new one is a chip beside the number, in the tone that
  // means «look at this», and the room's top bar keeps its pill that opens it there.
  const release = app.slice(app.indexOf('function drawRelease('), app.indexOf('function renderMotherSentinel('));
  assert.match(release, /info\.available \? sxChip\(t\('\{version\} available', \{ version: info\.latest \}\), 'warn'\)/, 'a new version raises no mark');
  assert.match(release, /if \(!info\.available\) return;/, 'a room that is up to date still shows how to update');
  assert.match(app, /updateUI\.pill\?\.addEventListener\('click', \(\) => openSettings\(true, \{ category: 'release' \}\)\)/, 'the pill does not open the version');
  assert.match(css, /\.sx-chip\.busy, \.sx-chip\.warn \{/);
});

test('mother: the checkbox lines up with the words above it', async () => {
  const css = await read('styles.css');
  // It sat a few pixels in from the paragraph above, on a browser's own margin, so the column
  // did not read straight down.
  const box = css.match(/\.mother-section\.sentinel \.toggle input[^{]*\{([^}]*)\}/);
  assert.ok(box, 'the checkbox has no styling of its own');
  assert.match(box[1], /margin: 0/, 'the checkbox keeps the browser margin that pushed it out of line');
  assert.match(box[1], /flex: none/, 'the checkbox can still be squeezed out of shape');
});

test('mother: the list starts where the trouble is, and a search never comes back empty-handed for no reason', async () => {
  const app = await read('app.js');
  const paint = app.slice(app.indexOf('function paintRemedies('), app.indexOf('function renderMotherOs('));
  // With nothing written and something recorded, the room's own records come first.
  assert.match(paint, /const filter = remedies\.filter \?\? \(!matches && records\.length \? 'room' : 'all'\);/);
  for (const chip of ["t('This project')", "t('Blocking')", "t('Matches') : t('All')"]) assert.ok(paint.includes(chip), `the ${chip} chip is gone`);
  // A sentence that names no condition still finds the closest ones, ranked.
  assert.match(paint, /if \(!matches\.length\) matches = looseConditions\(text\);/);
  assert.match(app, /function looseConditions\(text\) \{/);
  // The detail is never blank while the list has something in it.
  assert.match(paint, /const pick = stillThere \? remedies\.selected : first;/);
  // The record keeps the ledger's tools: download, dismiss, bring back.
  for (const key of ["t('Download the log')", "t('Dismiss all {n}'", "t('Show the {n} dismissed'"]) assert.ok(paint.includes(key), `${key} is gone`);
});

test('mother: the commands and numbered steps of the old panels are gone with them (Lote 4 of the 1.0 review)', async () => {
  const css = await read('styles.css');
  for (const gone of ['.update-command', '.train-steps', '.train-card', '.sentinel-controls', '.room-form', '.memory-form']) assert.ok(!css.includes(gone), `${gone} is still styled with nothing to style`);
});

test('mother: a badge says something the header does not, or it is not there', async () => {
  const app = await read('app.js');
  // The two sections that carried one — how many agents are out, which version waits — live in
  // AJUSTES now, where their card says it. Nothing in MU/TH/UR repeats a number as a badge.
  const badges = [...app.matchAll(/folding\([^;]*?badge: ([^;]*?)\}\);/gs)];
  for (const [, body] of badges) assert.match(body, /urgent: true/, 'a badge that is not urgent survived');
  assert.equal(badges.length, 0, 'a section of MU/TH/UR carries a badge again');
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
  // MEMORY has its own panel, and its fields are drawn by the very same rule.
  const fields = css.match(/\.conn-card input, \.conn-card select([^{]*)\{([^}]*)\}/);
  assert.ok(fields, 'the fields no longer share one rule');
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

test('mother: nothing inside a connection card is drawn in the page palette', async () => {
  const css = await read('styles.css');

  // The key form belongs to two places: the bridge, on the page's light ground, and a connection
  // card, where everything is phosphor on black. It carried the page's palette into both, so a
  // key field sat there white and rounded among terminal fields.
  const shared = css.match(/\.key-form input, \.key-form select \{([^}]*)\}/);
  assert.ok(shared, 'the key form lost its own styling, which the bridge still needs');
  assert.match(shared[1], /var\(--bg\)/, 'the bridge form no longer uses the page palette, so this guard is moot');

  const inside = css.match(/\.conn-card \.key-form input, \.conn-card \.key-form select \{([^}]*)\}/);
  assert.ok(inside, 'inside a card the key form still wears the page palette');
  assert.match(inside[1], /color: var\(--ph\)/);
  assert.match(inside[1], /background: #000/);
  assert.match(inside[1], /border-radius: 0/, 'a rounded field among square ones reads as borrowed from elsewhere');

  // A select in a card was never in the rule that draws the fields, so the provider dropdown was
  // a browser default among terminal controls.
  const fields = css.match(/\.conn-card input, \.conn-card select[^{]*\{([^}]*)\}/);
  assert.ok(fields, 'a select inside a card is still left out of the rule that draws the fields');
  assert.match(fields[1], /background: #000/);

  // Everything else the form brings with it follows the panel too, or the labels and notes stay
  // in the page's greys while the fields turn green.
  for (const piece of ['.conn-card .key-form .k', '.conn-card .key-row button', '.conn-card .key-link:hover']) {
    assert.ok(css.includes(piece), `${piece} is still the page's, not the panel's`);
  }
});

test('mother: a dialog head keeps its buttons on one line, in the order they are used', async () => {
  const [page, css] = await Promise.all([read('index.html'), read('styles.css')]);
  // The head is three columns: title, subtitle, and whatever can be pressed. Loose buttons fall
  // out of the third column onto a line of their own, which is what MODULES was doing.
  assert.match(css, /\.mother-head \{[^}]*grid-template-columns: auto 1fr auto/);
  // MODULES is a window like AJUSTES now: its head is the same, add before close, close last.
  const modules = page.slice(page.indexOf('id="modules"'), page.indexOf('id="modules-list"'));
  assert.match(modules, /class="custom-head settings-head mods-head"/);
  assert.ok(modules.indexOf('modules-add') < modules.indexOf('modules-close'), 'closing comes before adding');
});

test('mother: the verdict is written the way the rest of the panel is written', async () => {
  const css = await read('styles.css');
  // It was the one paragraph in a terminal that was not in the terminal's own hand.
  // It lives on the MEMORY dashboard now, framed like every other block there: one hairline all
  // round, no thicker edge competing with the words.
  const next = css.match(/\.mem-verdict \.maturity-next \{([^}]*)\}/);
  assert.ok(next, 'the one thing to do has no styling of its own');
  assert.match(next[1], /var\(--mono\)/);
  assert.match(next[1], /text-transform: uppercase/);
  assert.doesNotMatch(next[1], /border-left/, 'the instruction grew an edge again');
  const says = css.match(/\.mem-verdict \.says \{([^}]*)\}/);
  assert.match(says[1], /text-transform: uppercase/);
});

test('mother: one door to the crew, and the bridge is first contact and nothing else', async () => {
  const [app, page, readme] = await Promise.all([read('app.js'), read('index.html'), readFile(join(import.meta.dirname, '..', 'README.md'), 'utf8')]);

  // ⚑ CREW closed the panel and took over the canvas to do what CONNECTIONS already does. Once
  // it opened CONNECTIONS instead, it was a second button for one thing, and a second button for
  // one thing is a question the human has to answer for no reason.
  assert.ok(!page.includes('id="crew-button"'), 'there are two doors to the crew again');
  assert.ok(!app.includes('crew-button'), 'the second door still has a handler');
  assert.ok(!readme.includes('⚑ CREW'), 'the README still sends people to a button that is gone');
  assert.match(page, /id="mother-settings-button" class="surface-gear"/);
  // MU/TH/UR's gear opens MU/TH/UR's own settings — the sentinel — and the report lives on each remedy.
  assert.match(page, /title="Diagnostics settings: what the failure monitor keeps and whether it reports"/);
  assert.match(app, /settingsUI\.button\?\.addEventListener\('click', \(\) => openSettingsOn\('release', \{ part: 'sentinel' \}\)\);/);
  assert.ok(!page.includes('id="feedback-button"'), 'a second report button is back in the head');

  // The bridge shows when there is nobody to talk to, and that is the whole of its job now.
  assert.match(app, /els\.onboarding\.hidden = usable\.length > 0;/);
  assert.ok(!app.includes('bridgePinned'), 'the machinery for pinning the bridge open is still there, unreachable');
  assert.ok(!app.includes('function openBridge'), 'a way to open the bridge on a room that has a crew survives');

  // And what the bridge said about needing only one agent is said where the crew now lives.
  assert.match(app, /One agent is enough to start\. MADRE uses the AI apps already on this computer/);
});

test('settings: every sheet is built from the same blocks, and the sheet is as wide as you pull it', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  const body = (name) => { const at = app.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm')); return app.slice(at, app.indexOf('\n}\n', at)); };
  // One way to draw a setting: a block, its rows. No console fold, no form of its own.
  for (const name of ['connectionCard', 'drawRoomSettings', 'drawPrivacy', 'drawMemory', 'drawRelease', 'drawSentinel', 'renderTurns']) {
    const fn = body(name);
    assert.match(fn, /sx(Block|Row)\(/, `${name} is not built from blocks`);
    assert.ok(!/folding\(/.test(fn), `${name} still folds like the console`);
    assert.ok(!/el\('form'/.test(fn), `${name} still builds a form`);
  }
  // Appearance too, the preview first.
  const look = body('drawCustom');
  assert.ok(look.indexOf("t('Preview')") < look.indexOf("t('Colour')"), 'the preview is not the first block of Appearance');
  // The colours sit right under it and the language, which reloads the page, comes last.
  assert.ok(look.indexOf("t('Colour')") < look.indexOf("t('Wallpaper')") && look.indexOf("t('Conversation')") < look.indexOf("sxBlock(page, t('Language'))"), 'Appearance is not in the order it is used');
  assert.match(css, /\.sx-look > \.sx-preview \{ position: sticky;/, 'the preview scrolls away from the colours it shows');
  // The accent reaches the whole window, not only its buttons.
  assert.match(css, /:root\[data-accent\] #settings \{ --phosphor: var\(--acc\);/);
  // The helper text is the room's: sentence case, not the console's capitals.
  assert.match(css, /\.sx-head h3 \{[^}]*font-family: var\(--read\);[^}]*text-transform: none;/);
  // The sheet takes a grip on its edge, like a server's view, and remembers the width.
  assert.match(app, /function gripSettingsSheet\(sheet\)/);
  assert.match(app, /localStorage\.setItem\('pulse\.settingsSheet'/);
  assert.match(css, /\.settings-grip \{[^}]*cursor: ew-resize;/);
  // And the search sinks while it is written in, as the composer does.
  assert.match(css, /\.settings-search:focus-within \{[^}]*box-shadow: inset 0 4px 12px/);
});

test('modules: a board of tiles, a sheet for each, windows only for MADRE\'s own readings, and the SDK untouched', async () => {
  const [app, page, sdk] = await Promise.all([read('app.js'), read('index.html'), readFile(join(import.meta.dirname, '..', 'src', 'modules', 'sdk.mjs'), 'utf8')]);
  const board = app.slice(app.indexOf('function moduleIcon(item) {'), app.indexOf('function renderModulesDev()'));
  assert.match(board, /function moduleTile\(item\)/);
  assert.match(board, /function moduleDetail\(item\)/);
  // The card in the sheet is the module's own card: one renderer, wherever it shows.
  // The sheet and the window are the same sheet, built from AJUSTES' blocks.
  assert.match(board, /detail\.append\(head\);\n  moduleSheet\(detail, item\);/);
  assert.match(board, /entry\.body\.replaceChildren\(\);\n  moduleSheet\(entry\.body, item\);/);
  assert.match(board, /function moduleSheet\(host, item\) \{\n  host\.append\(moduleGlance\(item\)\);/);
  // A module that keeps no figures gets none made up.
  assert.match(board, /return strip\.childElementCount \|\| strip\.classList\.contains\('loading'\) \? strip : document\.createDocumentFragment\(\);/);
  // A module somebody wrote that installs keeps its install card, inside a block.
  assert.match(board, /install\.rows\.append\(moduleCard\(item\)\);/);
  // Every module opens on its own dashboard, and what it touches is a block of the room.
  assert.match(board, /function moduleGlance\(item\)/);
  assert.match(board, /function moduleFacts\(host, item\)/);
  // Which modules float is MADRE's decision for its own: the ones with a reading, and Notes and
  // Reminders (1.0.5), whose window is their list; nothing asked of the SDK.
  // The faces live in market.js since the Market (2026-10-18): the room and Home draw the same marks.
  const faces = await read('market.js');
  const floating = [...faces.matchAll(/^ {2}([\w'-]+): \{[^\n]*window: true/gm)].map((match) => match[1].replace(/'/g, ''));
  assert.deepEqual(floating.sort(), ['ash', 'intents', 'notes', 'ollama', 'reminders']);
  for (const field of ['window', 'widget', 'glance']) assert.ok(!new RegExp(`'${field}'`).test(sdk.slice(sdk.indexOf('MODULE_FIELDS'), sdk.indexOf('unknownFields'))), `the SDK grew a ${field} field`);
  // The last tile invites, and opens the guide instead of the SDK.
  assert.match(board, /make\.addEventListener\('click', \(\) => openModuleGuide\(\)\)/);
  assert.match(page, /<dialog id="module-guide"[\s\S]*id="modules-dev"/);
});

test('mother: a remedy says what to do first, the keys before the terminal, the why folded, and it can be reported', async () => {
  const app = await read('app.js');
  const card = app.slice(app.indexOf('function remedyDetail('), app.indexOf('function recordDetail('));
  const at = (needle) => card.indexOf(needle);
  const order = ["t('What to do')", "t('Apply')", "condition.solvedIn === 'connections'", "t('In your terminal')", "t('Why it happens')", "t('Not fixed?')"];
  for (let i = 1; i < order.length; i += 1) assert.ok(at(order[i - 1]) > 0 && at(order[i - 1]) < at(order[i]), `${order[i - 1]} does not come before ${order[i]}`);
  assert.match(card, /el\('details', 'sx-more remedy-why'\)/, 'the diagnosis is not folded');
  assert.match(card, /sxButton\(t\('Report ↗'\), \(\) => reportCondition\(condition\)\)/);
  assert.match(app, /url\.searchParams\.set\('about', about\.slice\(0, 120\)\)/, 'the report does not say which condition it is about');
});

test('settings: the Finder and the servers carry a gear to their own category', async () => {
  const [app, page] = await Promise.all([read('app.js'), read('index.html')]);
  for (const id of ['tree-settings', 'browser-settings']) assert.match(page, new RegExp(`id="${id}" class="surface-gear"`), `${id} is missing`);
  assert.match(app, /for \(const id of \['#tree-settings', '#browser-settings'\]\) document\.querySelector\(id\)\?\.addEventListener\('click', \(\) => openSettings\(true, \{ category: 'files' \}\)\);/);
  // The viewer is said, not switched: it opens beside on purpose.
  assert.match(app, /sxRow\(where, t\('File viewer'\), t\('It always opens beside the conversation/);
});

test('modules: a press inside a dialog is never the desktop, the button brings an open board back, Ash reads in its own window', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  // A click on the board's empty space used to count as a click on the desktop and send every
  // other window aside.
  assert.match(app, /target\.closest\(WINDOW_SELECTOR\) \|\| target\.closest\('dialog'\) \|\| target\.closest\('#composer'\)/);
  // MODULES is a window like AJUSTES: open but aside or behind, the button brings it to the front.
  assert.match(app, /function openModules\(\) \{[\s\S]*?placeModules\(modulesBoxFor\(\), \{ chosen: false \}\);\n  \}\n  bringWindowForward\(node\);/);
  assert.match(app, /if \(node\.open && node\.classList\.contains\('front'\) && !node\.classList\.contains\('aside'\)\) \{ closeModules\(\); return; \}/);
  assert.match(app, /carryWindowBy\(head, node, \{ box: \(\) => modulesWindow\.box, place: placeModules, done: rememberModulesBox \}\);/);
  assert.match(app, /windowEdgesFor\(node, \{ box: \(\) => modulesWindow\.box, place: placeModules, done: rememberModulesBox, minW: 320, minH: 300 \}\);/);
  // Ash's economy is its window's own content, and its card's button opens that window.
  // (The old SPENDING dialog that nothing opened is gone: the economy draws only into a box it is given.)
  assert.match(app, /async function renderEconomy\(box\) \{\n  if \(!box\) return;/);
  assert.match(app, /if \(item\.id === 'ash'\) \{\n    const block = sxBlock\(host, t\('Spending'\)[\s\S]{0,260}void renderEconomy\(app\);/);
  assert.match(app, /open\.addEventListener\('click', \(\) => floatModule\('ash'\)\);/);
  // A window carried keeps its own colour.
  assert.match(css, /dialog\.surface\.window:is\(\.settings-window, \.module-window\)\.lifted \{ background-color: var\(--bg-2\) !important; \}/);
});

test('bar: the live light breathes on the conversation it is live for, and says its word under the pointer', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /els\.connection\?\.closest\('\.bar'\)\?\.querySelector\('\.bar-left'\)\?\.append\(els\.connection\);/);
  assert.match(app, /els\.connection\.dataset\.said = /);
  assert.match(css, /\.bar-left \.connection\[data-state="live"\] \.connection-dot \{[^}]*animation: state-pulse/);
  assert.match(css, /\.bar-left #project \{ color: var\(--text\); font-weight: 600; \}/);
  assert.match(css, /\.bar-left \.project\.chat-here \{ color: var\(--text-2\); font-weight: 400; \}/);
});

test('selectors: a raised thumb in a pressed track, the chosen option heavier, and a slide chooses', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /const SEG_TRACKS = '\.sx-seg, \.settings-seg, \.custom-seg';/);
  // A slide that ends on another option chooses it, carrying the tab from where the finger left it.
  assert.match(app, /if \(segChosen\(seg\) === over\) \{[\s\S]{0,200}seg\.dataset\.slideFrom = JSON\.stringify\(segRect\(over\)\);\n      over\.click\(\);/);
  assert.match(css, /\.seg-thumb \{[^}]*box-shadow: var\(--key-rest\)/);
  assert.match(css, /:is\(\.sx-seg button\[aria-checked="true"\], \.settings-seg button\.on, \.sx-look \.custom-seg \.seg-option\[aria-checked="true"\]\) \{ font-weight: 700 !important;/);
  // Every key is the soft one: two shadows out at rest, the same two inside when pressed.
  assert.match(css, /--key-rest: -2px -2px 5px var\(--neu-hi\), 3px 3px 7px var\(--neu-lo\);/);
  assert.match(css, /--key-down: inset 2px 2px 5px var\(--neu-lo\), inset -2px -2px 5px var\(--neu-hi\);/);
});

test('one light for every surface, bubbles with a tail, modes in their colours, one search field', async () => {
  const [app, page, css, sdk] = await Promise.all([read('app.js'), read('index.html'), read('styles.css'), readFile(join(import.meta.dirname, '..', 'docs', 'SDK.md'), 'utf8')]);
  // Cards and keys share one light, softer than before.
  assert.match(css, /--raise: -2px -2px 8px var\(--neu-hi\), 3px 4px 14px var\(--neu-lo\);/);
  assert.match(css, /:is\(\.sx-block:not\(\.mods-reading\), \.settings-card, \.mods-tile:not\(\.make\)[^{]*\{\n  box-shadow: var\(--raise\) !important;/);
  // A field sinks clearly when written in.
  assert.match(css, /:is\(\.sx-input:focus, \.sx-num:focus-within, \.settings-search:focus-within\) \{ box-shadow: var\(--key-sink\) !important; \}/);
  // Every permission mode in its colour, chosen or not.
  for (const n of [0, 1, 2, 3, 4]) assert.match(css, new RegExp(`\\.sx-seg button\\.o${n} \\{ color: var\\(--mode-${n}\\) !important; \\}`));
  // The Finder's search is the same field as AJUSTES' and MODULES'.
  assert.match(page, /<form id="tree-search" class="tree-search"><label class="settings-search tree-find">/);
  // A bubble is a surface over the canvas, with no tail; the model's mark is a raised sphere.
  assert.ok(!/\.bubble::after/.test(css), 'the bubbles grew a tail again');
  // The model's mark is flat: no light, no shadow, its logo larger and in the agent's full ink.
  assert.match(css, /#messages \.row > \.avatar:not\(\.gradient\) \{\n  background-image: none !important; box-shadow: none !important;/);
  assert.match(css, /#messages \.row > \.avatar svg \{ width: 64%; height: 64%;/);
  // The news of a new version points where the version lives now.
  assert.match(app, /Open SETTINGS › Version to restart with it\./);
  // The guide an agent reads to write a module describes the board it will appear on.
  assert.ok(!/RELOAD MODULES|DESINSTALAR|tarjeta `<\/>`/.test(sdk), 'the SDK guide still describes the console card');
  assert.match(sdk, /«Crea tu módulo» → «Recargar módulos»/);
});

test('notices: a pill whose dot says done, worth a look, or wrong — red only for what went wrong', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  const at = app.indexOf('const TOAST_WRONG');
  const code = app.slice(at, app.indexOf('function toast(', at));
  const TOAST_WRONG = new RegExp(code.match(/const TOAST_WRONG = \/(.+)\/i;/)[1], 'i');
  const TOAST_LOOK = new RegExp(code.match(/const TOAST_LOOK = \/(.+)\/i;/)[1], 'i');
  const tone = (message) => (TOAST_WRONG.test(message) ? 'wrong' : TOAST_LOOK.test(message) ? 'look' : 'done');
  assert.equal(tone('MU/TH/UR › ASH: cada agente va a contestar en prosa compacta.'), 'done');
  assert.equal(tone('MU/TH/UR › local budget saved: 500k tokens per agent per 5h window.'), 'done');
  assert.equal(tone('El ajuste no se guardó: HTTP 500'), 'wrong');
  assert.equal(tone('The setting was not saved: HTTP 500'), 'wrong');
  assert.equal(tone('MU/TH/UR › MADRE 1.0.0 está en npm. Abre AJUSTES › Versión para reiniciar con ella.'), 'look');
  // The colour lives in the dot alone.
  assert.match(css, /\.toast\[data-tone="wrong"\] \.toast-dot \{ background: var\(--danger\);/);
  // A plain shadow under it and no light around it: no halo over a photograph.
  assert.match(css, /\.toast:not\(\[hidden\]\) \{[^}]*box-shadow: 0 0 0 \.5px color-mix\(in srgb, var\(--text\) 14%, transparent\), inset 0 1px 0 rgb\(255 255 255 \/ \.06\), 0 2px 4px rgba\(0, 0, 0, \.24\), 0 12px 28px -6px/);
  assert.ok(!/\.toast:not\(\[hidden\]\) \{[^}]*var\(--raise\)/.test(css), 'the notice wears the keys\' light again');
});

test('rails: one tab that travels, the remedy in three weights, the trace that beats, the turn that reads', async () => {
  const [app, page, css] = await Promise.all([read('app.js'), read('index.html'), read('styles.css')]);
  // A choice on any rail moves the one tab from where it was; the options never fade their own in.
  assert.match(app, /function segTravel\(seg, from, was\) \{/);
  assert.match(app, /document\.addEventListener\?\.\('click', \(event\) => \{[\s\S]{0,400}segTravel\(seg,/);
  assert.match(css, /:is\(\.sx-seg, \.settings-seg, \.custom-seg\)\.seg-sliding > :is\(button, \.seg-option\):not\(\.seg-thumb\) \{[^}]*background: transparent !important;/);
  assert.match(css, /:is\(\.sx-seg button, \.settings-seg button, \.custom-seg \.seg-option\) \{ transition: color [^}]*opacity[^}]*!important; \}/);
  // A remedy: title, one quiet line that places it, then what to do in the reading ink.
  assert.match(app, /el\('span', `remedy-sev tone-\$\{tone\}`/);
  assert.match(app, /const what = el\('p', 'remedy-what', condition\.remedy\);/);
  assert.ok(!app.includes("what.append(el('b', null, t('What to do'))"), 'the remedy has its label back over it');
  // MU/TH/UR's trace beats under the pointer, and stays still when motion is reduced.
  assert.match(page, /<path class="ic-beat" pathLength="1"/);
  assert.match(css, /\.mother-button:hover \.ic-beat, \.mother-button:focus-visible \.ic-beat \{ opacity: 1; animation: mother-beat/);
  // On a wallpaper the answer is glass, whiter than the room's lines, floating on a soft shadow.
  assert.match(css, /:root\[data-scheme="light"\]\[data-wallpaper\]:not\(\[data-wallpaper="default"\]\) #messages \.row:is\(\.assistant, \.thinking\) \.bubble \{\n  background-color: rgba\(255, 255, 255, \.92\) !important;/);
  // Who a message went to is inked against its material.
  assert.match(css, /\.user:not\(\.expendable\) \.stamp \.to \{ font-weight: 600; color: color-mix\(in srgb, var\(--agent, var\(--text\)\) 58%, var\(--text\)\) !important; \}/);
  // A card's quick rows keep air around a rail, and a label on two lines keeps its line height.
  assert.match(css, /\.settings-quick-row \{ min-height: 44px; padding-block: 8px; \}/);
  assert.match(css, /\.settings-quick-row > span:first-child \{ line-height: 1\.4; \}/);
});

test('bar: NOSTROMO is a brain in the bar that beats, and the corner says the version without asking for anything', async () => {
  const [app, page, css] = await Promise.all([read('app.js'), read('index.html'), read('styles.css')]);
  assert.match(page, /<button id="nostromo-bar" class="tree-button nostromo-bar"/);
  assert.match(app, /document\.querySelector\('#nostromo-bar'\)\?\.addEventListener\('click', \(\) => nostromo\.button\?\.click\(\)\);/);
  assert.match(css, /\.bar \.nostromo-bar:hover \.brain-glyph, \.bar \.nostromo-bar:focus-visible \.brain-glyph \{ animation: brain-beat/);
  assert.ok(!app.includes('github.com/sponsors'), 'the corner asks for support again');
  assert.match(app, /drawAttribution\(document\.querySelector\('#colophon'\), initial\.version\)/);
});

test('bar: right-click opens it for editing, AJUSTES stays last, and the choice is kept in this browser', async () => {
  const [app, page, css] = await Promise.all([read('app.js'), read('index.html'), read('styles.css')]);
  // AJUSTES closes the row in the markup too, so the first paint is the bar as it ships.
  const header = page.slice(page.indexOf('<header id="bar" class="bar">'), page.indexOf('</header>'));
  assert.ok(header, 'the bar has no id to be found by');
  assert.ok(header.lastIndexOf('<button id="custom-button"') > header.lastIndexOf('<button id="tree-button"'), 'AJUSTES is not the last key of the bar');
  // The ids are stable: they are what the browser keeps.
  assert.match(app, /const BAR_KEY = 'pulse\.barItems';/);
  assert.match(app, /const BAR_FIXED = 'settings';/);
  assert.match(app, /const BAR_DEFAULT = \['salas', 'macroverso', 'crew', 'code', 'modules', 'mother', 'nostromo', 'reload', 'servers', 'finder', 'phone'\];/);
  assert.match(app, /crew: \{ nodes: \['#agents', '#agents-compact'\]/, 'the crew is not one key with two forms');
  // Read with a guard, written with a guard: a private window still gets a bar.
  assert.match(app, /function barStored\(\) \{[\s\S]*?try \{\n    const raw = JSON\.parse\(localStorage\.getItem\(BAR_KEY\) \?\? 'null'\);[\s\S]*?\} catch \{[^}]*\}\n  return \[\.\.\.BAR_DEFAULT\];/);
  assert.match(app, /try \{ localStorage\.setItem\(BAR_KEY, JSON\.stringify\(barKit\.saved\)\); \} catch \{/);
  assert.match(app, /barKit\.order = barStored\(\)\.filter\(\(id\) => id !== BAR_FIXED && catalogue\.has\(id\)\);/, 'an unknown id or AJUSTES can land in the order');
  // What the new keys open.
  assert.match(app, /out\.set\('memory', \{ id: 'memory', name: t\('What it remembers'\), icon: SETTINGS_CATS\.memory\.icon, open: \(\) => openSettingsOn\('memory'\) \}\);/);
  assert.match(app, /if \(face\.window\) offered\.set\(id,/);
  assert.match(app, /for \(const item of items\) if \(item\.external\) offered\.set\(item\.id, item\);/);
  assert.match(app, /floatModule\(id\);/);
  // Right-click, a long press, Esc, a press outside, and a key that is placed rather than pressed.
  assert.match(app, /node\.addEventListener\('contextmenu', \(event\) => \{\n    event\.preventDefault\(\);/);
  assert.match(app, /setTimeout\(\(\) => \{\n      barKit\.swallow = true;[\s\S]*?\}, 500\);/);
  assert.match(app, /document\.addEventListener\('keydown', barKeys, true\);/);
  assert.match(app, /if \(!barKit\.editing \|\| event\.key !== 'Escape'\) return;/);
  assert.match(app, /badge\.setAttribute\('aria-label', t\('Remove \{name\} from the bar', \{ name \}\)\);/);
  assert.match(app, /tile\.setAttribute\('aria-label', t\('Add \{name\}', \{ name: entry\.name \}\)\);/);
  // The tremble: a degree and a half each way, out of step; AJUSTES never trembles; still without motion.
  assert.match(css, /@keyframes bar-jiggle \{ 0%, 100% \{ rotate: -1\.5deg; \} 50% \{ rotate: 1\.5deg; \} \}/);
  assert.match(css, /\.bar\.bar-editing > \[data-bar-item\]:not\(\[data-bar-item="settings"\]\) \{\n  animation: bar-jiggle calc\(260ms/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n  \.bar\.bar-editing > \[data-bar-item\], \.bar-badge \{ animation: none; \}/);
  // The «−» in the accent with a ring of the bar's own ground; the card without glow.
  assert.match(css, /\.bar-badge \{[\s\S]*?width: 16px; height: 16px;[\s\S]*?background: var\(--phosphor\); color: var\(--phosphor-ink\);[\s\S]*?box-shadow: 0 0 0 1\.5px var\(--bar-ring\)/);
  const cardRule = css.match(/\.bar-card \{[^}]*\}/)?.[0] ?? '';
  assert.ok(cardRule && !/glow|0 0 \d+px var\(--phosphor\)/.test(cardRule), 'the card glows');
  assert.match(css, /\.bar > \.bar-off \{ display: none !important; \}/);
});


test('@madre gone is not a missing install: the room says Ollama, MU/TH/UR opens Ollama, and every icon wears the accent', async () => {
  const { diagnose } = await import('../public/troubleshooting.js');
  const [room, app] = await Promise.all([readFile(join(import.meta.dirname, '..', 'src', 'room.mjs'), 'utf8'), read('app.js')]);
  assert.match(room, /@\$\{targetId\} left the project: Ollama is not running\. Start Ollama, or open Local AI in Modules\./);
  assert.equal(diagnose('@madre left the room: Ollama is not running. Start Ollama, or open Ollama in Modules.')[0].id, 'madre-agent');
  // Rooms that recorded the old sentence get the right remedy too, and never the install one.
  assert.deepEqual(diagnose('madre is not installed on this computer.').map((one) => one.id), ['madre-agent']);
  assert.deepEqual(diagnose('gemini is not installed on this computer.').map((one) => one.id), ['not-installed']);
  // Since 1.0.5 Local AI lives in Settings, not in Modules: the remedy opens it there.
  assert.match(app, /if \(condition\.solvedIn === 'ollama'\) \{[\s\S]{0,200}openSettingsOn\('local'\)/);
  assert.match(app, /span\.style\.setProperty\('--cat', 'var\(--phosphor\)'\)/);
});

test('installs and updates show their real progress in one sheet, and this room\'s count wears the badge', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  // Fed by the room's own install events, live only: modules, Ollama and its models, agents' CLIs.
  for (const type of ['extension.install.started', 'connection.install.started', 'connection.install.output']) assert.ok(app.includes(`case '${type}'`), type);
  assert.match(app, /case 'extension\.install\.output': appendModuleOutput\(event\); if \(!replaying\) jobProgress\(event\); return;/);
  // The percentage is the installer's own, when it prints one; otherwise the bar says it is working.
  assert.match(app, /clean\.matchAll\(\/\(\\d\{1,3\}\(\?:\\\.\\d\+\)\?\)\\s\?%\/g\)/);
  assert.match(css, /\.job-sheet\.known \.job-bar i, \.job-sheet\.done \.job-bar i, \.job-sheet\.failed \.job-bar i \{ animation: none;/);
  // The state lives on a function: an install's first event may arrive before the file has run that far.
  assert.match(app, /function jobsOf\(\) \{ return \(jobsOf\.state \?\?= /);
  // Updating a module asks in the room's alert, with the command word for word.
  assert.match(app, /command: asked\.result\.plan\.display,/);
  assert.match(app, /el\('span', id === 'room' && count \? 'remedy-badge' : null, String\(count\)\)/);
});

test('bar: on a narrow screen what does not fit waits behind «more», and settings and the brand stay', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /function barFit\(\) \{/);
  assert.match(app, /if \(barKit\.editing \|\| !barSpills\(bar\)\) \{ barCloseMore\(\); return; \}/);
  // A key that only crosses into the bar's padding spills too: Safari counts that as no overflow.
  assert.match(app, /function barSpills\(bar\) \{\n  if \(bar\.scrollWidth > bar\.clientWidth \+ 1\) return true;/);
  assert.match(app, /if \(node\.getBoundingClientRect\(\)\.right > end \+ 0\.5\) return true;/);
  // «more» closes the bar; AJUSTES follows it only where it has no second bar to live in (a phone).
  assert.match(app, /if \(barKit\.more\) want\.push\(barKit\.more\);\n  \/\/ AJUSTES closes this bar unless it lives in the second one\.\n  if \(!homeOn\(\)\) want\.push\(\.\.\.barNodes\(BAR_FIXED\)\);/, '«more» is not right before settings');
  assert.match(css, /\.bar \.bar-overflow \{ display: none !important; \}/);
  assert.match(css, /\.bar > \.bar-left \{ min-width: 58px; flex-shrink: 1; \}/, 'the brand can be squeezed out again');
});


test('memory access: the gate offers «don\'t ask again», which lands in Permissions, and a held choice opens the map straight', async () => {
  const [app, html] = await Promise.all([read('app.js'), read('index.html')]);
  assert.match(html, /<button id="nostromo-gate-skip" class="key-skip" type="button">Don't ask again…<\/button>/);
  assert.match(app, /openSettingsOn\('permissions', \{ anchor: 'perm-memory' \}\);/);
  assert.match(app, /if \(nostromo\.armed \|\| memoryAccess\(\)\) \{ void openNostromo\(\); return; \}/);
  // 1 h, 8 h, 24 h or never, and «always ask» to undo it; an hour that passed asks again.
  assert.match(app, /const MEMORY_ACCESS = \[\['ask', [^\n]*\['60', [^\n]*\['480', [^\n]*\['1440', [^\n]*\['never', /);
  assert.match(app, /if \(held\?\.choice === 'never' \|\| \(held && Number\(held\.until\) > Date\.now\(\)\)\) return held;/);
  assert.match(app, /access\.id = 'perm-memory';/);
});

test('1.0.2: what is new is said with first-time cards, one at a time, with no welcome and no «what is new»', async () => {
  const [app, home] = await Promise.all([read('app.js'), read('salas-mac.js')]);
  const { notesFor } = await import('../src/whats-new.mjs');
  assert.equal(notesFor('1.0.2'), null, 'a patch opened the «what is new» board');
  for (const id of ['new-copilot', 'new-mcp', 'new-finder', 'new-memory-access', 'new-dots']) assert.match(app, new RegExp(`\\{ id: '${id}', level: '1\\.0\\.2', button: `));
  // A key kept behind «more» is pointed at there, and a card with nothing to point at waits.
  assert.match(app, /const anchorOf = \(hint\) => \(hint\.onScreen \? inView\(hint\.button\) : shown\(hint\.button\)\) \?\? shown\(hint\.spill\);/);
  // The dots are pointed at where the person is reading, not at the top of the thread.
  assert.match(app, /\{ id: 'new-dots', level: '1\.0\.2', button: '#messages \.sys-dots:not\(\.open\)', onScreen: true,/);
  assert.match(app, /if \(!next\) \{ if \(pending\.length && \(newHintTries \+= 1\) <= 10\) showNewHints\(30000\); return; \}/);
  assert.match(home, /homeTour\.hint\('new-add-widgets', key, /);
  // News only to whoever had the version before (2026-10-19): someone new got five «New:» cards.
  // News reaches whoever met MADRE before it came, even someone who began new (2026-10-21).
  // Whoever is new gets the way in first; then the news, only for whoever met MADRE before it (the
  // version written on the bonjour, src/tour.mjs `met`).
  assert.match(app, /const walk = \[\.\.\.\(isNewcomer\(\) \? GUIDE_HINTS : \[\]\), \.\.\.NEW_HINTS\.filter\(isNewsFor\)\];\n {4}const pending = walk\.filter\(\(hint\) => !hintsSeen\(\)\[hint\.id\]\);/);
  assert.match(app, /if \(met\) return levelBelow\(met, hint\.level\);/);
  assert.match(home, /if \(homeTour\.path\(\) === 'new'\) return;/);
});

test('1.0.5: the hints are a short walk, once each; whoever knew MADRE is told only what is new', async () => {
  const [app, home, tour] = await Promise.all([read('app.js'), read('salas-mac.js'), read('tour.js')]);
  const { HINTS } = await import('../src/tour.mjs');
  // Kept as seen the moment it shows: one left open and the page reloaded came back every time.
  assert.match(tour, /hintNode = card;\n {4}void keep\(\{ hint: id \}\);/);
  assert.doesNotMatch(tour.slice(tour.indexOf('const done = () => {'), tour.indexOf('const shown = (node)')), /keep\(/);
  // Whoever met MADRE before this version (`met` below the server's `level`) is told only the news.
  assert.match(tour, /const returning = \(\) => Boolean\(state\?\.bonjourAt\) && \(!state\.met \|\| \(Boolean\(info\?\.level\) && below\(state\.met, info\.level\)\)\);/);
  assert.match(tour, /const forThem = \(id\) => !returning\(\) \|\| id\.startsWith\('new-'\) \|\| \(id === 'links' && path\(\) === 'back'\);/);
  assert.match(tour, /state\.hints\?\.\[id\] \|\| !forThem\(id\) \|\|/);
  assert.match(app, /if \(state\.device \|\| roomTour\(\)\.returning\(\)\) return;/);
  // «2 of 5» and «Next», in a project and in Home; «Skip the tips» puts the rest away.
  assert.match(app, /showFirstTouch\(behind \? .*, anchorOf\(next\), \{ step, of: here\.length, skip \}\);/);
  assert.match(home, /step: at \+ 1,\n {8}of: here\.length,/);
  // Someone new: Home's walk after the bonjour, the project's with Code and the manual.
  const walk = [...home.slice(home.indexOf('const HOME_WALK = ['), home.indexOf('let walkTries')).matchAll(/id: '([\w-]+)'/g)].map((match) => match[1]);
  assert.deepEqual(walk, ['home-start', 'home-coordinator', 'links', 'home-manual']);
  const guides = [...app.slice(app.indexOf('const GUIDE_HINTS = ['), app.indexOf('const NEWS_SINCE')).matchAll(/\{ id: '([\w-]+)'/g)].map((match) => match[1]);
  assert.deepEqual(guides, ['guide-talk', 'guide-agent', 'guide-mode', 'guide-code', 'guide-manual']);
  for (const id of [...walk, ...guides]) assert.ok(HINTS.includes(id), `${id} is shown but never kept as seen`);
  // The server says which version's news this code tells, so a page can tell who is back.
  assert.match(await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8'), /hints: HINTS, level: NEWS_LEVEL \}\);/);
});

test('every hint the pages ask for is one the server keeps: a refused id came back on every visit', async () => {
  const { HINTS } = await import('../src/tour.mjs');
  const pages = await Promise.all(['app.js', 'salas-mac.js', 'tour.js'].map(read));
  const asked = new Set(pages.flatMap((page) => [...page.matchAll(/\.hint\('([\w-]+)'/g)].map((match) => match[1])));
  assert.ok(asked.has('new-add-widgets'));
  for (const id of asked) assert.ok(HINTS.includes(id), `${id} is shown but never kept as seen`);
  // A project's own cards, its news and its first touches, are the person's too, not the port's: a
  // project opens on the first free port, and they came back with every new one (2026-10-19).
  const [app] = pages;
  const news = [...app.slice(app.indexOf('const NEW_HINTS = ['), app.indexOf('let newHintTries')).matchAll(/\{ id: '([\w-]+)'/g)].map((match) => match[1]);
  const touches = [...app.slice(app.indexOf('const FIRST_TOUCH = {'), app.indexOf('const HINTS_KEY')).matchAll(/^ {2}([a-z]+): \{$/gm)].map((match) => `touch-${match[1]}`);
  // 1.0.2's five, 1.0.5's four and the five of the way in for whoever is new (2026-10-21).
  assert.equal(news.length, 14);
  assert.ok(touches.length >= 9);
  for (const id of [...news, ...touches]) assert.ok(HINTS.includes(id), `${id} is kept only by the page, on one port`);
  assert.match(app, /if \(!state\.device\) void roomTour\(\)\.seen\(keptId\(id\)\)/);
  // The board of a version is seen when it shows: left open at a shutdown, it came back.
  assert.match(app, /dialog\.showModal\(\);\n {4}if \(!news\.preview\) void fetch\('\/api\/whats-new\/seen'/);
});
