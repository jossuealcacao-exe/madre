import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { chatIndex, chatLedger, createChat, deleteChat, isChatId, lastSequenceOf, listChats, openChat, projectFloor, renameChat, touchChat, adoptStrays, MAIN_CHAT } from '../src/chats.mjs';
import { EventStore } from '../src/event-store.mjs';

const room = () => mkdtemp(join(tmpdir(), 'pulse-chats-'));

test('chats: a room that predates conversations opens as one, and no file moves to add them', async () => {
  const dir = await room();
  try {
    // The ledger that was always there.
    await writeFile(join(dir, 'events.jsonl'), `${JSON.stringify({ id: 'a', sequence: 1, type: 'message.created', payload: {} })}\n`);
    const before = await listChats(dir);
    assert.equal(before.active, MAIN_CHAT);
    assert.deepEqual(before.chats.map((chat) => chat.id), [MAIN_CHAT]);
    assert.equal(chatLedger(dir, MAIN_CHAT), join(dir, 'events.jsonl'), 'the first conversation was moved');
    assert.match(await readFile(join(dir, 'events.jsonl'), 'utf8'), /"sequence":1/);

    const made = await createChat(dir);
    assert.equal(isChatId(made.id), true);
    assert.equal(chatLedger(dir, made.id), join(dir, 'chats', made.id, 'events.jsonl'));
    const after = await listChats(dir);
    assert.equal(after.active, made.id, 'starting a conversation does not open it');
    assert.equal(after.chats.length, 2);
  } finally { await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('chats: a conversation takes its name from the first thing said in it, and can be renamed', async () => {
  const dir = await room();
  try {
    const made = await createChat(dir);
    assert.equal(made.named, false);
    await touchChat(dir, made.id, { text: '  Why does the webhook   verify after parsing?  ' });
    const find = async (id) => (await listChats(dir)).chats.find((chat) => chat.id === id);
    const first = await find(made.id);
    assert.equal(first.title, 'Why does the webhook verify after parsing?');
    assert.equal(first.preview, 'Why does the webhook verify after parsing?');
    assert.equal(first.messages, 1);

    // What is said later moves the preview but never renames what is already named.
    await touchChat(dir, made.id, { text: 'And the refunds?' });
    const again = await find(made.id);
    assert.equal(again.title, 'Why does the webhook verify after parsing?');
    assert.equal(again.preview, 'And the refunds?');
    assert.equal(again.messages, 2);

    const named = await renameChat(dir, made.id, 'Webhooks');
    assert.equal(named.title, 'Webhooks');
    assert.equal(named.named, true);
    // An empty name gives it back to the room rather than leaving a blank row.
    assert.equal((await renameChat(dir, made.id, '   ')).named, false);
  } finally { await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('chats: the project numbers its exchanges once, across every conversation', async () => {
  const dir = await room();
  try {
    const main = await new EventStore(chatLedger(dir, MAIN_CHAT)).initialize();
    for (let i = 0; i < 3; i += 1) await main.append('message.created', { text: `main ${i}` });
    assert.equal(await lastSequenceOf(chatLedger(dir, MAIN_CHAT)), 3);

    // A second conversation starts where the project got to, so #4 means one exchange in this
    // project and not one in each thread: the memory index and every citation depend on it.
    const made = await createChat(dir);
    const floor = await projectFloor(dir, { except: made.id });
    assert.equal(floor, 3);
    const other = await new EventStore(chatLedger(dir, made.id), { floor }).initialize();
    const written = await other.append('message.created', { text: 'other' });
    assert.equal(written.sequence, 4);
    assert.equal((await other.readAll()).map((event) => event.sequence).join(), '4');

    // And the first one carries on above both of them when it is opened again.
    const back = await new EventStore(chatLedger(dir, MAIN_CHAT), { floor: await projectFloor(dir, { except: MAIN_CHAT }) }).initialize();
    assert.equal((await back.append('message.created', { text: 'main again' })).sequence, 5);
    assert.equal(await lastSequenceOf(chatLedger(dir, 'nope')), 0, 'a ledger that does not exist is sequence zero, not a crash');
  } finally { await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('chats: deleting takes the transcript and never the last conversation', async () => {
  const dir = await room();
  try {
    const only = await deleteChat(dir, MAIN_CHAT);
    assert.match(only.error, /always has one conversation/);

    const made = await createChat(dir);
    await new EventStore(chatLedger(dir, made.id)).initialize().then((store) => store.append('message.created', { text: 'x' }));
    const gone = await deleteChat(dir, made.id);
    assert.equal(gone.deleted, made.id);
    assert.equal(gone.active, MAIN_CHAT, 'deleting what was open leaves the room somewhere to talk');
    assert.equal(await lastSequenceOf(chatLedger(dir, made.id)), 0, 'the transcript is still on disk');
    assert.deepEqual((await listChats(dir)).chats.map((chat) => chat.id), [MAIN_CHAT]);
    assert.equal(await deleteChat(dir, 'nothing'), null);
  } finally { await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('chats: a conversation on disk that no index knows about is adopted, not ignored', async () => {
  const dir = await room();
  try {
    const stray = 'a1b2c3d4e5f60718';
    await mkdir(join(dir, 'chats', stray), { recursive: true });
    await writeFile(chatLedger(dir, stray), `${JSON.stringify({ id: 'z', sequence: 9, type: 'message.created', payload: {} })}\n`);
    await mkdir(join(dir, 'chats', 'not a chat id'), { recursive: true });
    const { adopted } = await adoptStrays(dir);
    assert.deepEqual(adopted, [stray], 'a transcript is not disposable, and a stray folder is not a conversation');
    assert.equal((await listChats(dir)).chats.some((chat) => chat.id === stray), true);
    assert.equal((await openChat(dir, stray)).active, true);
    assert.equal((await chatIndex(dir)).active, stray);
  } finally { await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('chats: the panel is the files panel on the other edge, and its handle is in the canvas', async () => {
  const read = async (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');
  const [page, css, app] = await Promise.all([read('index.html'), read('styles.css'), read('app.js')]);

  // The same panel, so there is one shape to learn: it carries the files panel's own class.
  assert.match(page, /<aside id="chats" class="tree chats"/);
  assert.match(page, /<button id="chats-new"/);
  // It is the files panel's twin, so it has to win against it: same class, higher specificity.
  assert.match(css, /\.tree\.chats \{[^}]*justify-self: start/);
  assert.match(css, /\.tree \{[^}]*justify-self: end/);
  // The conversations are the panel; starting one lives under them, not on top of them.
  assert.ok(page.indexOf('id="chats-body"') < page.indexOf('id="chats-new"'), 'the way to start a conversation sits above the conversations');
  // One line each: the title is the summary, so a preview under it says the same thing twice.
  assert.ok(!app.includes("el('span', 'said', chat.preview)"), 'a conversation is two lines again');
  // The handle is how a closed panel is opened; once it is open it would only stand on top of it.
  // On a phone the handle is a key in the bar, under the sheet, and stays.
  assert.match(app, /if \(els\.chatsButton && !state\.device\) els\.chatsButton\.hidden = open;/);
  // And the handle is lit the way the buttons in the bar are, not with a halo of its own.
  assert.match(css, /\.chats-button:hover,\n:root\[data-theme="light"\]|:root\[data-theme="light"\] \.chats-button:hover/);
  // The handle sits in the canvas, under the bar, where the conversation it opens begins.
  assert.match(css, /\.chats-button \{[^}]*grid-row: 3[^}]*justify-self: start/);
  // Never both edges at once on a narrow screen: the files step out below 1180px, and the
  // handle stays at every width: on a narrow window it is carried and opened on the canvas too.
  assert.doesNotMatch(css, /\.chats-button \{ display: none; \}/);

  // Opening one is a reload: a conversation is a different record of the same room, and the page
  // is built from a record.
  assert.match(app, /async function openChat\(id[^)]*\) \{[\s\S]*window\.location\.reload\(\)/);
  // Where you are reads as one path: MADRE / project / conversation.
  assert.match(app, /el\('span', 'project chat-here', chatTitle\(here\.title\)\)/);
  assert.match(css, /\.project::before \{ content: "\/ "; \}/);
  // The conversation sits against the project it belongs to, not at the far end of the bar — and
  // when the bar runs out of room it is the conversation that gives way, never the project: a room
  // whose project reads `pul…` has stopped saying which room it is. The conversation has a panel
  // of its own with its whole name in it; the project has nowhere else to be read.
  assert.match(css, /\.project \{ flex: 0 0 auto/);
  assert.match(css, /\.project\.chat-here \{ flex: 0 1 auto/);
  assert.match(app, /(fetch|reach)\('\/api\/chats', \{ method: 'POST'/, 'nothing starts a conversation');
  // Deleting says what it takes and what it leaves, and asks twice.
  assert.match(app, /Its transcript goes; what the archive learned from it stays/);
  assert.match(app, /drop\.classList\.contains\('sure'\)/);
  // And the panel says the one thing a person has to understand about all of this.
  assert.match(page, /ONE PROJECT, ONE MEMORY\. EVERY CONVERSATION FEEDS THE SAME ARCHIVE\./);
});

test('chats: one server per project, said by the room itself', async () => {
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  // Two servers on one project would hand out the same sequence twice and the archive would
  // quietly keep one of them. The CLI's nearby-room check walks eight ports; a distant one
  // walked past it.
  assert.match(server, /const openMark = join\(roomDir, 'open\.json'\)/);
  assert.match(server, /error\.code = 'ROOM_IN_USE'/);
  assert.match(server, /releaseOpen\(\);/, 'the mark is never released, so a room stays taken after it closes');
  // The refusal says where the room is and what to do instead of closing it.
  assert.match(server, /open another conversation inside it/, 'the refusal does not point at the way out');
  const cli = await readFile(join(import.meta.dirname, '..', 'bin', 'madre.mjs'), 'utf8');
  assert.match(cli, /if \(error\.code === 'ROOM_IN_USE'\)/);
});

test('switching conversations repaints in place, and leaves nothing of the last one behind', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join: joinPath } = await import('node:path');
  const app = await readFile(joinPath(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');

  // It used to reload the page, which is the brute way to be sure nothing was left over — and it
  // cost a whole boot: every fetch again, every panel again, the stream again. In place is faster
  // and only safe while everything that belongs to one conversation is actually let go.
  const open = app.slice(app.indexOf('async function openChat(id'), app.indexOf('function setChats(open)'));
  assert.ok(!/window\.location\.reload\(\);\n\}/.test(open), 'switching still reloads the whole page');
  assert.match(open, /await paintConversation\(payload\)/);
  // A reload is still the honest fallback when the room cannot be re-read.
  assert.match(open, /if \(!payload\) \{ window\.location\.reload\(\); return; \}/, 'a failed re-read leaves the room showing the old conversation');

  const forget = app.slice(app.indexOf('function forgetConversation()'), app.indexOf('// The new conversation, painted'));
  for (const held of ['state.seen', 'state.userMessages', 'state.ratings', 'state.ratingNodes', 'state.running', 'state.plansRunning', 'state.agentStats', 'touched', 'state.failures', 'state.pending']) {
    assert.ok(forget.includes(held), `${held} survives a switch, so one conversation bleeds into the next`);
  }
  assert.match(forget, /state\.lastSequence = 0;/, 'the cursor carries over and the new stream asks from the wrong place');
  assert.match(forget, /els\.column\.replaceChildren\(\);/, 'the old thread stays on screen under the new one');

  // And the stream has to be re-pointed: it was opened once, at boot, against the old cursor.
  assert.match(app, /function connectStream\(\) \{\n  stream\?\.close\?\.\(\);/, 'the old stream is never closed, so two of them deliver at once');
  assert.match(app.slice(app.indexOf('async function paintConversation')), /connectStream\(\);/);
});

test('panels: nothing on the column measures itself from the window edges, or a docked panel pushes it off screen', async () => {
  const css = await readFile(join(import.meta.dirname, '..', 'public', 'styles.css'), 'utf8');
  // The reported break: ASH widened the composer to the window minus 40px while it kept the
  // column's left edge, so with the files panel docked it ran under the panel and off the window.
  for (const state of ['creating', 'control', 'ash-on']) {
    assert.ok(!new RegExp(`\\.composer\\.${state} \\{[^}]*width: min\\(1180px, 100% - 40px\\)`).test(css), `.composer.${state} ignores the rails`);
  }
  assert.match(css, /\.composer:is\(\.creating, \.control, \.ash-on\) \{ width: var\(--wide-column\); margin-left: var\(--wide-left\); \}/);
  assert.match(css, /--wide-column: min\(1180px, 100% - var\(--rail-l\) - var\(--rail-r\)\)/);
});

test('hover: nothing in the room speaks on hover, and the browser does not either', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const css = await readFile(join(import.meta.dirname, '..', 'public', 'styles.css'), 'utf8');
  // Buttons were silenced first; chips, headers and grips still raised a card. None does now.
  assert.ok(!/function showTip\(/.test(app), 'the hover card is back');
  assert.ok(!/\n\.tip \{/.test(css), 'the hover card still has a style');
  // Titles are still taken off on first contact, or the browser shows its own grey box instead.
  assert.match(app, /document\.addEventListener\('pointerover', takeTitle, true\)/);
  assert.match(app, /node\.removeAttribute\('title'\)/);
});

test('conversation windows: two beside the open one at most, the split counted with them', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // Every conversation on screen keeps a live line to the room, and a browser holds six to one
  // server: three conversations leave the page room to load, a fourth does not.
  assert.match(app, /const MAX_BESIDE = 2;/);
  assert.match(app, /function besideCount\(\) \{ return \(split\.chat \? 1 : 0\) \+ convWindows\.size; \}/);
  // Moving one between the split and a window, or replacing what the split shows, never needs room.
  assert.match(app, /function canOpenBeside\(id\) \{ return id === split\.chat \|\| convWindows\.has\(id\) \|\| besideCount\(\) < MAX_BESIDE; \}/);
  assert.match(app, /if \(!split\.chat && !canOpenBeside\(id\)\) \{ besideFull\(\); return; \}/);
  // One conversation is never on screen twice.
  assert.match(app, /if \(convWindows\.has\(id\)\) closeConvWindow\(id, \{ animate: false \}\);/);
});

test('windows: floating and docking are buttons, and a drag is never a click', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // Pulling a header undocked a panel, traded two panes or moved a window depending on where the
  // pointer was. None of those gestures is left; a header only carries what is already a window.
  for (const gone of ['carryPaneBy', 'showDockGhost', "addEventListener('dblclick', (event) => {\n    if (event.target.closest"]) {
    assert.ok(!app.includes(gone), `${gone} is back`);
  }
  assert.match(app, /carryWindowBy\(head, node, \{ active: \(\) => isWindow\(surface\)/);
  assert.match(app, /function surfaceButtons\(surface\)/);
  // The button is drawn while app.js is still being read: an icon declared below that point is
  // a ReferenceError that stops the whole page, and the boot test's bare DOM never reaches it.
  for (const icon of ['FLOAT_ICON', 'SPLIT_LEFT_ICON', 'SPLIT_RIGHT_ICON']) {
    assert.ok(app.indexOf(`const ${icon} =`) > -1 && app.indexOf(`const ${icon} =`) < app.indexOf('    surfaceButtons(surface);'), `${icon} is declared after the surfaces are built`);
  }
  // A press that travelled and was let go over a row's button used to press it.
  assert.match(app, /if \(travelled > 6 && event\.target\?\.closest\?\.\('\.tree, \.surface, \.conv-window, \.browser-dock, \.split-dock'\)\)/);
});

test('windows: a header is held without selecting, carried on the compositor, and stays in reach', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  const carry = app.slice(app.indexOf('function carryWindowBy('), app.indexOf("if (!SPLIT_CHAT) {\n  // A press inside a conversation's frame"));
  // A press on a header started a text selection that followed the drag across the room.
  assert.match(carry, /event\.preventDefault\(\);/);
  // Held, the window is only translated — nothing it holds is laid out under the pointer — and
  // it takes its real place once, where it is let go.
  assert.match(carry, /node\.style\.translate = `\$\{to\.x - from\.x\}px \$\{to\.y - from\.y\}px`/);
  assert.match(carry, /node\.style\.removeProperty\('translate'\);\n      if \(carrying && to\) \{ place\(to\); done\?\.\(\); \}/);
  // Near the room's edge it sits on the edge, from either side of it, and past an edge it keeps
  // enough header on screen to be taken back.
  assert.match(carry, /if \(Math\.abs\(x - WINDOW_INSET\) < WINDOW_SNAP\) x = WINDOW_INSET;/);
  assert.match(carry, /WINDOW_REACH - from\.w/);
  // A size is laid out once a frame, however fast the pointer reports.
  assert.match(app, /frame = requestAnimationFrame\(\(\) => place\(next\)\);/);
  // The console's header is the window's handle, so it stays on top at any depth of its content,
  // and the window's controls are the header's own, beside the title.
  assert.match(css, /dialog\.surface:is\(\.split, \.window\)\.mother \.mother-head \{ position: sticky; top: -18px;/);
  // At rest it has no ground of its own, so it never covers the console's scanlines.
  assert.match(css, /\.mother-head\.stuck \{ background: inherit; \}/);
  assert.match(app, /if \(group\.parentElement\?\.matches\?\.\('\.mother-actions'\)\) node\.querySelector\(surface\.head\)\?\.append\(group\);/);
  // What is inside a console answers to its own window's width, not to the screen's.
  assert.match(css, /\.mother-frame \{ container: console \/ inline-size; \}/);
  for (const rule of ['.mem-card.span-3', '.mem-dash .exams', '.privacy-form', '.ash-bar']) {
    assert.ok(!new RegExp(`@media \\(max-width: \\d+px\\) \\{ ${rule.replace(/[.]/g, '\\.')}`).test(css), `${rule} still answers to the screen`);
  }
  // A container is where a fixed element is placed from: never the viewer, whose menu is placed
  // in the window's own coordinates.
  assert.ok(!/dialog\.viewer \{ container/.test(css), 'the viewer is a container again and its menu opens away from the click');
});

test('surfaces: every one carries split and window in its header, and a dialog is modal only in its base', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  for (const key of ['chats', 'tree', 'viewer']) assert.match(app, new RegExp(`\\{ key: '${key}', kind: '(panel|dialog)'`), `${key} is not a surface`);
  // Every caller still asks for showModal; split or floating, the dialog opens without trapping the room.
  assert.match(app, /node\.showModal = function showInItsMode\(\)/);
  // Changing how an open dialog is shown is not closing it: its own close handlers must not run.
  assert.match(app, /event\.stopImmediatePropagation\(\);/);
  // One split per side; the one already there goes to a window, nothing closes.
  assert.match(app, /if \(other !== surface && other\.side === surface\.side && isSplit\(other\)\) setSurfaceMode\(other, 'window', \{ animate: false \}\);/);
});

test('room: the conversation never gives way, and what stands beside it does, oldest first', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  // Splits, the browser's dock and the second conversation all count against one width; when even
  // their floors do not fit beside a readable conversation, the oldest floats as a window — and the
  // first time that happens, the room says what moved and how to put it back, once per browser.
  assert.match(app, /\} finally \{ givingWay = false; \}\n  saidGaveWay\(oldest\);/);
  assert.match(app, /if \(seen\.gaveWay\) return;[\s\S]{0,200}gaveWay: true[\s\S]{0,600}moved to a window so the conversation stays readable/);
  // A panel in its base that stood docked and now floats over the conversation (the browser took its
  // room) is said too, once, and after the browser's own first-touch card has been closed.
  assert.match(app, /if \(floating && dockedBefore\.has\(one\.key\)\) floated\.push\(one\.key\);/);
  assert.match(app, /if \(seen\.floated\) return;[\s\S]{0,200}floated: true[\s\S]{0,300}sayWhenQuiet\(/);
  assert.match(app, /const card = document\.querySelector\('\.hint-card'\);\n    if \(!card\) \{ say\(\); return; \}/);
  assert.match(app, /members\.reduce\(\(sum, one\) => sum \+ one\.floor, COLUMN_MIN\) <= window\.innerWidth/);
  assert.match(app, /const oldest = \[\.\.\.members\]\.sort\(\(a, b\) => rank\(a\) - rank\(b\)\)\[0\];/);
  assert.match(app, /if \(oldest\.kind === 'side'\) setSurfaceMode\(oldest\.surface, 'window', \{ animate: false \}\);/);
  // A side split may not take the floors of the dock and the second conversation either.
  assert.match(app, /const room = window\.innerWidth - other - COLUMN_MIN - grid - 3 \* SIDE_GAP;/);
  // And the dock and the second conversation narrow toward their floors before the conversation does.
  assert.match(app, /function fitGridBeside\(\)/);
  // The split's state exists before the layout that keeps a floor for it.
  assert.ok(app.indexOf('const split = {') < app.indexOf('function besideNow()'), 'the layout reads the split before it is declared');
  // A move between modes keeps one scale for both sides: text is never stretched on the way.
  const flip = app.slice(app.indexOf('function flipPanel('), app.indexOf('// A dialog is modal only in its base:'));
  assert.ok(!/scale\(\$\{sx\}, \$\{sy\}\)/.test(flip), 'the move scales each side on its own again');
  assert.match(flip, /scale\(\$\{scale\}\)/);
  assert.match(css, /::view-transition-new\(madre-split\) \{ height: 100%; object-fit: cover;/);
});

test('room: a press in the conversation\'s box sends the windows to the edges, and the one asked for comes back alone', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  assert.match(app, /document\.querySelector\('#composer \.field'\)\?\.addEventListener\('pointerdown', \(\) => setWindowsAside\(true, \{ over: \[threadBox\] \}\)\);/);
  // Only what lies over the place in use moves, to its nearer edge, leaving a strip in view.
  assert.match(app, /overTheRoom\(node, areas\)/);
  // Code, the files and the browser docked beside the conversation are places in use too: a press
  // or the first key typed there sets aside what covers them, and they are never the desktop
  // that brings the windows back (2026-10-20).
  assert.match(app, /const DOCKED = '\.tree:not\(\.window\), dialog\.viewer\.split, \.browser-dock:not\(\.window\)';/);
  assert.match(app, /if \(area\) setWindowsAside\(true, \{ over: \[area\] \}\);/);
  assert.match(app, /const area = target\.closest\('#composer'\) \? threadBox : target\.closest\(DOCKED\);/);
  assert.match(app, /target\.closest\('#composer'\) \|\| target\.closest\(DOCKED\) \|\|/);
  // The code being edited is not read through the veil.
  assert.match(app, /const writing = \(\) => Boolean\(document\.activeElement\?\.closest\?\.\(`#composer, \$\{DOCKED\}`\)\);/);
  assert.match(app, /toLeft \? ASIDE_PEEK - box\.right : window\.innerWidth - ASIDE_PEEK - box\.left/);
  // A window wanted — pressed, opened, or reached by the keyboard — comes back alone: opening the
  // Finder from the bar does not bring Settings back with it (2026-10-14).
  assert.match(app, /if \(windowsAside\) setWindowsAside\(false, \{ only: node \}\);/);
  assert.match(app, /addEventListener\?\.\('focusin', \(event\) => \{ const win = windowsAside && event\.target\?\.closest\?\.\('\.aside'\); if \(win\) setWindowsAside\(false, \{ only: win \}\); \}\);/);
  // A key of the bar whose window is at the edge brings it back instead of closing it.
  assert.match(app, /openSettings\(!settingsWindow\.node\?\.open \|\| atTheEdge\(settingsWindow\.node\)\)/);
  assert.match(app, /setTree\(!tree\.open \|\| atTheEdge\(els\.tree\)\)/);
  // A translate on the compositor, and a strip is one press: nothing inside it is pressed.
  assert.match(css, /\.aside \{ translate: var\(--aside-x, 0px\) 0;/);
  assert.match(css, /\.aside > \* \{ pointer-events: none; \}/);
});

test('crew and closes: the crew button opens the cards the spheres open, and every × turns the same way', async () => {
  const [app, html] = await Promise.all(['app.js', 'index.html'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  // Beside the live dot, and it opens the crew's cards rather than sending the human to a screen.
  assert.ok(html.indexOf('id="connection"') < html.indexOf('id="agents-compact"'), 'the crew is no longer beside the live dot');
  assert.match(app, /if \(!pop\.hidden && pop\.dataset\.from === 'crew'\) closeAgentPop\(\); else openCrewPop\(agentsCompact\);/);
  assert.match(app, /openAgentPop\(agent\.id, anchor, \{ back: \(\) => openCrewPop\(anchor\) \}\)/);
  // A window's × is the conversations panel's: the shared mark and its quarter turn.
  assert.match(app, /close\.className = 'surface-mode close x-close x-only';\n  close\.replaceChildren\?\.\(xIcon\(\)\);/);
  // Agent colours follow the room's theme, not only the system's.
  assert.match(app, /const scheme = document\.documentElement\?\.dataset\?\.scheme;/);
});

test('windows: a change of the room never paints the conversation across a window', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  const morph = app.slice(app.indexOf('function morph(kind, change) {'), app.indexOf('function setTree(open) {'));
  // The thread and the composer are lifted into the transition; every window on screen is lifted
  // with them in its own layer, so it stays above them, and is let go when the change is done.
  assert.match(morph, /node\.style\.setProperty\('view-transition-name', `madre-held-\$\{index\}`\);/);
  assert.match(morph, /node\.style\.removeProperty\('view-transition-name'\);/);
  assert.match(css, /::view-transition-group\(\.madre-held\) \{ animation: none; \}/);
  // A press on something that does a thing leaves the windows where they are; a press on the
  // desktop sends aside what is still over it, and with nothing left there brings them all back.
  assert.ok(!/if \(!windowsAside \|\| target\?\.closest\?\.\('#composer/.test(app), 'a press on the bar brings every window back again');
  assert.match(app, /const deskToggle = \(\) => setWindowsAside\(windowsUp\(\)\.length > 0 \|\| !windowsAside, \{ always: true \}\);/);
  // On the bare ground it answers on the press (no wait for the release); on words, on release.
  assert.match(app, /if \(event\.button !== 0 \|\| event\.target\?\.closest\?\.\(DESK_WORDS\) \|\| !deskPress\(event\)\) return;\n    deskAnswered = true;\n    deskToggle\(\);/);
  assert.match(app, /if \(deskAnswered\) \{ deskAnswered = false; return; \}\n    if \(deskPress\(event\)\) deskToggle\(\);/);
  // The bars and an agent's sphere are never the desktop: a press there does not move the windows.
  assert.match(app, /const NOT_DESK = '[^']*\.bar[^']*\.avatar[^']*';/);
  assert.match(app, /target\.closest\(DESK_ACTIVE\) \|\| target\.closest\(NOT_DESK\)\) return false;/);
  // NOSTROMO opened from MU/TH/UR leaves it as it was: MU/TH/UR is a window, not a base.
  assert.ok(!/motherSurface/.test(app), 'MU/TH/UR is closed under NOSTROMO again');
  // The servers' close is the cluster's ×, not a second one drawn after it.
  assert.ok(!/#browser-close::after/.test(css), 'the browser draws a second × again');
  // Every × warms to the conversations' scarlet.
  assert.match(css, /\.x-close\.x-only:not\(\.chat-drop\):hover, \.x-close\.x-only:not\(\.chat-drop\):focus-visible \{ color: var\(--danger\);/);
  // The version sits under the composer in its own row, not over it.
  assert.match(css, /\.shell > \.colophon \{ grid-row: 6; \}/);
  assert.ok(!/\.colophon \{ position: fixed;/.test(css), 'the version floats over the composer again');
  // Console headers: the subtitle under the title, the core's tabs across the whole width.
  assert.match(css, /grid-template-areas: "title actions modes" "sub actions modes";/);
  assert.match(css, /\.core-tabs \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\);/);
});

test('room: no question is left to the browser\'s grey box, and every one is asked in the room\'s voice', async () => {
  const [app, editor, css] = await Promise.all(['app.js', 'editor.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  for (const [file, text] of [['app.js', app], ['editor.js', editor]]) {
    assert.ok(!/window\.(confirm|prompt|alert)\(/.test(text), `${file} asks through the browser again`);
  }
  // One sheet, with answers that are words; the console's questions in the console's look.
  assert.match(app, /function roomAsk\(\{ title, body = '', choices, input = null, command = null, icon = null, console: inConsole = false \}\)/);
  assert.match(app, /sheet\.dialog\.classList\.toggle\('console', inConsole\);/);
  assert.match(css, /dialog\.room-ask\.console \.room-ask-card \{/);
  // The safe answer is the one a stray Enter lands on.
  assert.match(app, /\{ value: 'stay', label: t\('KEEP EDITING'\), focus: true \}/);
  // Leaving unsaved work waits for the answer instead of reading a synchronous yes or no.
  assert.match(app, /async function leaveEditor\(\{ ask = true, stash = false \} = \{\}\)/);
  assert.match(app, /if \(!await leaveEditor\(\)\) return;/);
});

test('console details: NOSTROMO reads like every console header, effort shows its strength, a connection is a light', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  // Title over subtitle on the left; buttons over the legend on the right, each line in tune.
  assert.match(css, /grid-template-areas: "title actions" "sub legend";/);
  assert.match(css, /\.nostromo-head > \.nostromo-legend \{ grid-area: legend;/);
  // The colour gains strength with the level, and the CLI's tag rides clear of the thumb.
  assert.match(app, /effortMenu\.style\.setProperty\('--strength', String\(last \? index \/ last : 1\)\);/);
  assert.match(css, /--level-tone: color-mix\(in srgb, var\(--tone\) calc\(25% \+ var\(--strength, 1\) \* 75%\), var\(--text-3\)\);/);
  assert.match(css, /\.effort-slider \.tick\.cli::after \{ bottom: 17px;/);
  // A connection's state is said in words, in a chip of its own tone: colour is never the only
  // way it is told.
  assert.match(app, /const chip = sxChip\(said, lamp\);\n[^\n]*session-lamp[^\n]*\n  toggle\.append\(words, chip, el\('span', 'sx-chevron'\)\);/);
  assert.ok(!/el\('span', `session\$\{busy/.test(app), 'the session word in a box is back');
  assert.match(css, /\.sx-chip\.on \{[^}]*var\(--phosphor\)/);
  assert.match(css, /\.sx-chip\.off \{[^}]*var\(--danger\)/);
});

test('servers: point and ask hands the agent only what the room knows, and the question waits in the composer', async () => {
  const [app, html, css] = await Promise.all(['app.js', 'index.html', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  assert.match(html, /<button id="browser-point" class="nav point" type="button" aria-pressed="false" aria-label="Point and ask">/);
  const tool = app.slice(app.indexOf('/* ---------- point and ask, on the project\'s own server ---------- */'), app.indexOf("// What the sentinel saw happen to one of the project's servers."));
  // A point and an area, and nothing to point at without a page.
  assert.match(tool, /tool\('dot', POINT_DOT_ICON, t\('SPOT'\)\), tool\('area', POINT_AREA_ICON, t\('AREA'\)\)/);
  assert.match(tool, /if \(on && \(!browser\.stage \|\| !browser\.frame \|\| !tab \|\| tab\.url === 'about:blank'\)\)/);
  // The context is the server, its process, the address, the width and where the mark is — the
  // page is another origin, and nothing is read from inside it.
  assert.ok(!/contentDocument|contentWindow/.test(tool), 'the tool reaches into the page it cannot read');
  // What it looks like is captured from the tab the human shares, asked at each question: one frame,
  // the part pointed at cut out of it, and the capture stops. The browser's own crop handed back
  // white frames in Chrome, so it is not used.
  assert.match(tool, /navigator\.mediaDevices\.getDisplayMedia\(\{ video: \{ displaySurface: 'browser' \}, audio: false, preferCurrentTab: true/);
  assert.equal(tool.match(/getDisplayMedia\(/g).length, 1, 'the tab is asked for from one place');
  assert.match(tool, /for \(const one of stream\?\.getTracks\(\) \?\? \[\]\) one\.stop\(\);/);
  assert.ok(!/cropTo|CropTarget/.test(tool), 'the browser crop is back, and with it the white frames');
  assert.match(tool, /drawImage\(video, \(box\.left \+ part\.left\) \* sx, \(box\.top \+ part\.top\) \* sy, part\.width \* sx, part\.height \* sy,/);
  // Asking puts the tool away; a new spot's picture replaces the last one still in the composer.
  const send = tool.slice(tool.indexOf('async function pointSend('), tool.indexOf("browser.point?.addEventListener('click'"));
  assert.match(send, /setPointing\(false\);\n  if \(capture\) void addFiles\(\[capture\]\);/);
  assert.match(send, /if \(lastAsk\?\.capture\) \{ state\.pending = state\.pending\.filter\(\(item\) => item\.name !== lastAsk\.capture\); renderPendingAttachments\(\); \}/);
  assert.match(tool, /if \(!on\) \{\n    closeAskCard\(\);\n    pointing\.observer\?\.disconnect\(\);/);
  assert.match(tool, /if \(capture\) void addFiles\(\[capture\]\);/);
  // The picture is what was pointed at: the area itself, or the spot with what surrounds it, inside
  // the page; where the browser can, what it shares is cropped to that part before the room sees it.
  const region = vm.runInNewContext(`${tool.slice(tool.indexOf('const POINT_AROUND'), tool.indexOf('// What was pointed at, as a picture.'))}; pointRegion`);
  const page = { width: 900, height: 700 };
  assert.deepEqual({ ...region({ kind: 'area', x1: 200, y1: 90, x2: 40, y2: 10 }, page) }, { left: 40, top: 10, width: 160, height: 80 });
  assert.deepEqual({ ...region({ kind: 'dot', x: 20, y: 690 }, page) }, { left: 0, top: 380, width: 480, height: 320 });
  assert.deepEqual({ ...region({ kind: 'dot', x: 450, y: 350 }, page) }, { left: 210, top: 190, width: 480, height: 320 });
  assert.deepEqual({ ...region({ kind: 'dot', x: 150, y: 100 }, { width: 300, height: 200 }) }, { left: 0, top: 0, width: 300, height: 200 });
  assert.match(css, /\.point-layer\.capturing :is\(\.point-tools, \.point-hint, \.point-area\) \{ visibility: hidden; \}/);
  // Asking one's own question is the card's first action, the same key as a new conversation.
  assert.match(css, /\.chats-new-button, \.ask-own \{\n  border: 1px solid var\(--phosphor\); background: var\(--phosphor\); color: var\(--phosphor-ink\);/);
  assert.match(css, /:is\(\.chats-new-button, \.ask-own\):active \{ transform: translateY\(1px\);/);
  // One line that says where, drawn as a chip, the question under it, and the room's own card.
  assert.match(tool, /const line = `⌖ \$\{name\} \$\{path\} · \$\{t\('view \{width\} px', \{ width \}\)\} · \$\{where\}/);
  assert.match(tool, /openAskCard\(\{/);
  // The card is the editor's too, and it rides in the top layer so the modal viewer never covers it;
  // what the archive remembers is asked only once its designation was given.
  assert.match(app, /askCard\.setAttribute\('popover', 'manual'\);/);
  assert.match(app, /if \(about && nostromo\.armed\) \{\n    void fetch\(`\/api\/memory\/about\?designation=/);
  assert.match(app, /onAsk: askAboutCode/);
  // One of the composer's menus at a time.
  assert.match(app, /modelMenuFor === id\) \{ closeModelMenu\(\); return; \}\n[^]*?closeEffortMenu\(\);\n  closeModeMenu\(\);\n  modelMenuFor = id;/);
  // Sending stays the human's: the question is put in the composer with the agent chosen.
  assert.ok(!/requestSubmit|\.submit\(\)/.test(tool), 'pointing sends on its own');
  assert.match(tool, /if \(agentId && state\.agents\.get\(agentId\)\?\.ready\) \{ els\.target\.value = agentId; renderPicker\(\); \}/);
  // Esc takes back the mark and its card first, and only then puts the tool away.
  assert.ok(app.includes('if (pointing.mark) pointClear(); else setPointing(false);'));
  // Leaving the page or the tab, or closing the browser, ends it.
  for (const where of ['function browserSelect(id) {\n  setPointing(false);', 'async function browserOpen(url, { tab = null } = {}) {\n  setPointing(false);']) assert.ok(app.includes(where), `${where.split('(')[0]} leaves the tool on`);
  // The state exists before the browser's functions that end it.
  assert.ok(app.indexOf('const pointing = {') < app.indexOf('async function browserOpen('));
  // The servers' menu is drawn above the page when the browser is a window.
  assert.match(css, /\.browser-dock \.browser-head \{ position: relative; z-index: 6; \}/);
});

test('editor and composer: one ask, a line band on its line, chips that wrap, a ? that never stands alone', async () => {
  const [editor, css] = await Promise.all(['editor.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  // Asking lives on the bar over the selection, once.
  assert.ok(!/data-act="ask"/.test(editor), 'the editor bar has its own ask again');
  assert.match(editor, /data-float="ask"/);
  // A line's offset already counts the page's padding; the band adds none of its own.
  assert.match(css, /\.ed-active \{ position: absolute; left: 0; right: 0; top: 0;/);
  assert.match(editor, /const top = row \? row\.offsetTop : padTop \+ \(line - 1\) \* lineHeight;/);
  assert.match(css, /\.picker \{ flex-wrap: wrap; row-gap: 10px; \}/);
  assert.match(css, /\.split-pane \.shell > \.composer \{ margin-bottom: 16px; \}/);
});

test('after the QA: the browser fills its dock, the sealed preview says it keeps no data, a running command can be stopped, and a cut turn shows what it left', async () => {
  const [app, css] = await Promise.all(['app.js', 'styles.css'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  const { RIPLEY_BRIDGE } = await import('../src/server.mjs');
  // AUTO is the dock's width: the iframe's own 300 px used to size the column.
  assert.match(css, /\.viewer-stage \{ position: relative; display: grid; grid-template-rows: minmax\(0, 1fr\); grid-template-columns: minmax\(0, 1fr\); justify-items: center;/);
  // The bridge tells the viewer once that the page reached for storage; the viewer points at SERVERS.
  // Run the bridge against a window shaped like Chrome's: Window is the global interface, so its
  // storage getters live on window itself, and in the sealed frame they throw.
  const sent = [];
  const sealed = () => { throw new Error('SecurityError'); };
  const window = { postMessage: () => {} };
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(window, name, { configurable: true, enumerable: true, get: sealed });
  class Window {}
  class Document {}
  Object.defineProperty(Document.prototype, 'cookie', { configurable: true, get: sealed, set: sealed });
  const document = Object.create(Document.prototype, { title: { value: 'Phobos' } });
  const context = vm.createContext({ window, Window, Document, document, location: { pathname: '/index.html' }, parent: { postMessage: (message) => sent.push(message) }, addEventListener: () => {}, Object, String });
  vm.runInContext(RIPLEY_BRIDGE.replace(/^<script data-ripley>/, '').replace(/<\/script>$/, ''), context);
  assert.throws(() => vm.runInContext('window.localStorage.getItem("phobos")', context), /SecurityError/, 'the access still fails as it did');
  assert.throws(() => vm.runInContext('window.sessionStorage', context));
  assert.deepEqual(JSON.parse(JSON.stringify(sent.filter((message) => message.type === 'storage'))), [{ ripley: 1, type: 'storage', what: 'localStorage' }], 'said once, for the first store reached');
  assert.match(app, /\} else if \(data\.type === 'storage'\) \{\n    ripleyShowStorage\(/);
  assert.match(app, /const open = el\('button', null, t\('OPEN YOUR SERVERS'\)\);/);
  // A command that is alive has a line of its own: where it serves, open it, stop it.
  assert.match(app, /case 'run\.serving': markRun\(event\.payload, 'serving', event\.payload\); return;/);
  assert.match(app, /fetch\('\/api\/runs\/stop', \{ method: 'POST'/);
  assert.match(app, /void browserOpen\(`http:\/\/127\.0\.0\.1:\$\{where\.port\}\/`\)/);
  // A turn cut short: what it left, its UNDO, and one press to try again with more time.
  assert.match(app, /if \(partial\) node\.append\(partialWork\(partial\)\);/);
  assert.match(app, /if \(timeout && state\.agents\.has\(target\)\) node\.append\(retryLonger\(/);
  assert.match(app, /const limitMs = event\.payload\.timeoutMs \?\? state\.timeouts\[agent\] \?\? 180000;/);
  // Two writers do not share the project: the second one is said to be waiting.
  assert.match(app, /case 'write\.waiting': \{/);
});
