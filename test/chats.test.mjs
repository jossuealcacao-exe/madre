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
  // On a phone the handle is a key in the bar, under the sheet, and stays. On the Mac it is the
  // first key of the bar since 2026-10-25 (route A): there too it stays, pressed, never hidden.
  assert.match(app, /if \(els\.chatsButton && !state\.device && !inBar\) els\.chatsButton\.hidden = open;/);
  assert.match(app, /if \(!state\.device && !SPLIT_CHAT\) \{[\s\S]{0,400}bar\.prepend\(key\)/);
  assert.match(css, /\.shell > \.bar > \.chats-button \{[^}]*translate: none !important/);
  // Sidebars as people know them (2026-10-25): the conversations, the files and the code open
  // docked at their side unless the person floated one; once, the old place inside the room moves
  // to the sidebar; the code remembers how it was left; the key wears the sidebar's drawing.
  assert.match(app, /const SIDEBAR_KEYS = \['chats', 'tree', 'viewer'\];/);
  assert.match(app, /const modeOf = \(surface\) => surfaceModes\[surface\.key\] \?\? \(sidebarsByDefault\(\) && SIDEBAR_KEYS\.includes\(surface\.key\) \? 'split' : 'base'\);/);
  assert.match(app, /if \(surfaceModes\[key\] === 'base'\) delete surfaceModes\[key\];/);
  assert.doesNotMatch(app, /if \(surface\.kind === 'dialog'\) \{ if \(modeOf\(surface\) !== 'base'\) surfaceModes\[surface\.key\] = 'base';/);
  assert.match(app, /key\.innerHTML = chatShellOn\(\) \? SIDEBAR_ICON : SPLIT_LEFT_ICON;/);
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
  // Several splits stand at one side (2026-10-25), in a row from the edge: the code at the right
  // edge, the files beside it, as in an editor. A second split no longer sends the first away.
  assert.match(app, /const SIDE_STACK = \{ left: \['chats'\], right: \['viewer', 'tree'\] \};/);
  assert.doesNotMatch(app, /other\.side === surface\.side && isSplit\(other\)\) setSurfaceMode\(other, 'window'/);
  // Each one's grip moves its own inner edge, measured from where it stands.
  assert.match(app, /const wanted = Math\.round\(surface\.side === 'left' \? moving\.clientX - box\.x : box\.x \+ box\.w - moving\.clientX\);/);
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
  assert.match(app, /const oldest = \[\.\.\.candidates\]\.sort\(\(a, b\) => rank\(a\) - rank\(b\)\)\[0\];/);
  // In the chat shell (2026-10-26) the sidebar never floats: the tools give way. When it alone does
  // not fit beside the conversation (1.1.0), it opens over it instead of shutting itself at once:
  // Home, the Market and the conversations are only there.
  assert.match(app, /const candidates = shelled \? members\.filter\(\(one\) => one\.key !== 'chats'\) : members;/);
  assert.match(app, /if \(shelled && !candidates\.length\) \{ chatsOver = true; return false; \}/);
  assert.match(app, /const sideLeft = width\.left && !chatsOver \?/);
  // Files closed from the strip of tabs goes through the viewer's own ✕, which keeps unsaved changes.
  assert.match(app, /key: 'viewer',[^\n]*close: \(\) => document\.querySelector\('#viewer-close'\)\?\.click\(\) \}/);
  assert.match(app, /threadBox\?\.addEventListener\('pointerdown', \(\) => \{ if \(chatsOver && chats\.open\) setChats\(false\); \}\);/);
  assert.match(app, /if \(surface\.key === 'chats' && next !== 'split' && chatShellOn\(\)\) return;/);
  assert.match(app, /if \(oldest\.kind === 'side'\) setSurfaceMode\(oldest\.surface, 'window', \{ animate: false \}\);/);
  // A side split may not take the floors of the dock and the second conversation either, and the
  // splits at one side share what is left without a floor pushing them past it.
  assert.match(app, /const room = window\.innerWidth - other - COLUMN_MIN - grid - \(stack\.length \+ 2\) \* GAP;/);
  // The gap is the room's own outside the chat shell; inside it the columns touch.
  assert.match(app, /const GAP = shelled \? 0 : SIDE_GAP;/);
  assert.match(app, /let excess = widths\.reduce\(\(sum, one\) => sum \+ one, 0\) - Math\.max\(0, room\);/);
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

test('chat shell: the sidebar, the conversation and the tool column, as people know a chat with an AI', async () => {
  const read = (name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8');
  const [page, css, app] = await Promise.all([read('index.html'), read('styles.css'), read('app.js')]);
  // On the Mac from the first frame; never on a phone (the bridge's port) nor in the right half.
  // The right half of a split wears it too, and builds none of the frame (2026-10-27).
  assert.match(page, /if \(location\.port !== '4316'\) document\.documentElement\.classList\.add\('chat-shell'\);/);
  assert.match(app, /if \(state\.device\) \{ root\.classList\.remove\('chat-shell'\); return; \}\n  if \(SPLIT_CHAT\) return;/);
  // The sidebar is the conversations panel, always docked; it carries the projects and the way Home.
  assert.match(app, /if \(chatsSurface && modeOf\(chatsSurface\) !== 'split'\) \{ surfaceModes\.chats = 'split';/);
  assert.match(app, /scroll\.append\(chatsLabel, els\.chatsBody, el\('div', 'side-label', t\('Projects'\)\), shellUI\.projects\);/);
  // The columns touch; the sidebar runs the window's height; a tool starts under its tabs.
  assert.match(app, /const top = shelled \? \(side === 'left' \? 0 : TOOL_HEAD\) : sideTop\(\);/);
  // At the right one tool at a time: the others wait behind it, still open, a tab away; a tool's
  // key brings it to the front before it closes it.
  assert.match(app, /const front = shelled && side === 'right' \? frontOf\(open\) : null;/);
  assert.match(app, /if \(!open \|\| !docked \|\| !node\.classList\.contains\('tool-behind'\)\) return;/);
  // The browser docked is one more tool of that column, not a column of the grid.
  assert.match(app, /const rightTools = \(\) => \[\.\.\.splitsOn\('right'\), \.\.\.\(browserDocked\(\) \? \[BROWSER_TOOL\] : \[\]\)\];/);
  assert.match(css, /html\.chat-shell \.shell\.with-browser, html\.chat-shell \.shell\.with-split\.with-browser \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/);
  // Home in the same look, and no wallpaper to choose where there is none.
  const home = await read('salas-mac.css');
  assert.match(home, /html\.chat-shell \.sm-sky \{ display: none !important; \}/);
  assert.match(app, /if \(!chatShellOn\(\)\) \{\n      const paperBlock = sxBlock\(page, t\('Wallpaper'\)/);
  assert.match(css, /html\.chat-shell \.tool-behind \{ visibility: hidden !important; pointer-events: none !important; \}/);
  // No picture behind the room, and the field's keys sit inside the one box you write in.
  assert.match(css, /html\.chat-shell \.shell::before \{ display: none !important; \}/);
  assert.match(css, /html\.chat-shell \.shell > \.composer > \.field \{ display: contents; \}/);
  // The crew in the middle of the bar; the keys with no plate, lit in the accent when pressed, in
  // two families with a hairline before each.
  assert.match(css, /html\.chat-shell \.shell > \.bar:not\(\.bar-home\) > #agents \{ position: absolute; left: 50%; top: 50%; transform: translate\(-50%, -50%\);/);
  assert.match(css, /html\.chat-shell \.shell > \.bar > :is\(\.mother-button, \.tree-button, \.chats-button\)\[aria-pressed="true"\] \{ background: none !important; color: var\(--phosphor\); \}/);
  // No plate in any state, over the older relief of CODE, Modules and Diagnostics (which names
  // them by id, so this one must too); and every drawing at one size to the eye, stroke kept.
  assert.match(css, /:root\.chat-shell \.shell > \.bar > :is\(#tree-button, #code-button, [^)]*\):not\(\.stop-all\):is\(\*, :hover, :active, :focus, :focus-visible, \[aria-pressed\]\) \{\n  background: none !important; box-shadow: none !important; transform: none !important;/);
  assert.match(css, /svg :is\(path, circle, ellipse, rect, line, polyline, polygon\) \{ stroke-width: calc\(var\(--icon-w, 1\.6\) \/ var\(--glyph, 1\)\); transition: none; \}/);
  assert.match(app, /const glyph = Math\.min\(1\.3, Math\.max\(\.75, \(SPAN \* view\) \/ \(20 \* span\)\)\);/);
  // Hover plays a key's own animation, never lifts it nor grows it; Modules wears no count; the apps and modules put on
  // the bar are a third family; the agents neither go nor move while the bar is arranged.
  assert.match(css, /html\.chat-shell \.shell > \.bar > :is\(\.mother-button, \.tree-button, \.bar-icon, \.chats-button\):is\(\*, :hover, :active\) svg \{ transform: none; \}/);
  assert.doesNotMatch(css, /\.chats-button\):hover svg \{ transform: translateY/);
  // MEMORY's beat grew it: its halves part and its folds draw again instead.
  assert.match(page, /<path class="brain-folds" pathLength="1" d="M6\.4 9\.4/);
  assert.match(css, /@keyframes brain-think \{ 0%, 20% \{ stroke-dashoffset: 1; \} 85%, 100% \{ stroke-dashoffset: 0; \} \}/);
  // The box as Claude's: it grows on the line it really draws, a «+» first and a quiet send last;
  // the modes mark the one in use with a check and say nothing of confirming; the models search
  // behind a magnifier and mark the default with a light badge.
  assert.match(app, /const line = Number\.parseFloat\(look\?\.lineHeight\) \|\| LINE_PX;/);
  assert.match(css, /"picker options create ash attach \. send";/);
  // 2026-10-27: the token saver is words in the row and only while on; models say what they can do;
  // Settings' cards lift no shadow; the window keys have no plate, the one in use in the accent.
  assert.match(css, /html\.chat-shell \.composer \.ash-toggle\[aria-pressed="false"\] \{ display: none !important; \}/);
  assert.match(app, /const brief = modelBrief\(info, name \?\? info\.default\);/);
  assert.match(css, /html\.chat-shell #settings \.settings-card:hover \{ box-shadow: 0 0 0 1\.5px/);
  assert.match(css, /html\.chat-shell \.surface-modes \.surface-mode:not\(\.close\)\[aria-pressed="true"\] \{ color: var\(--phosphor\) !important; \}/);
  assert.match(page, /<svg class="attach-clip"/);
  // 2026-10-27: the keys centre their drawing; effort is a list; Diagnostics a breathing dot; the
  // unlocks play over the whole box; the clip stays.
  assert.match(css, /align-items: center; justify-content: center; position: relative;/);
  assert.match(app, /if \(chatShellOn\(\)\) \{ effortList\(id, info, anchor\); return; \}/);
  assert.match(css, /@keyframes diag-dot \{ 0%, 100% \{ opacity: 1; \} 50% \{ opacity: \.35; \} \}/);
  assert.match(css, /html\.chat-shell \.shell > \.composer\.control-wink::before \{/);
  assert.match(app, /binaryRain\(chatShellOn\(\) \? els\.composer : els\.composer\.querySelector\('\.field'\)\)/);
  assert.doesNotMatch(css, /html\.chat-shell \.composer \.attach \.attach-plus/);
  assert.match(page, /<svg class="send-return"/);
  assert.match(app, /      if \(state\.mode === n\) option\.append\(menuCheck\(\)\);/);
  assert.match(app, /else if \(n === defaultModeFor\(id\)\) option\.querySelector\('\.name'\)\?\.append\(el\('span', 'model-default', t\('default'\)\)\);/);
  // 2026-10-27: no widening chip (it broke narrow windows); every line under a name is one short
  // line, the whole description in the tooltip.
  assert.doesNotMatch(app, /widenChip/);
  assert.match(app, /el\('span', 'hint', chatShellOn\(\) \? MODE_BRIEF\[n\] : MODES\[n\]\.hint\)/);
  assert.match(app, /t\(EFFORT_WORDS\[level\]\?\.brief \?\? EFFORT_WORDS\[level\]\?\.hint \?\? ''\)/);
  assert.match(css, /\.effort-option \.hint \{ display: block; white-space: nowrap;/);
  assert.match(app, /if \(isDefault && label !== t\('default'\)\) nameLine\.append\(el\('span', 'model-default', t\('default'\)\)\);/);
  assert.match(app, /find\.innerHTML = MENU_SEARCH;/);
  assert.match(css, /#modules-button \.modules-count \{ display: none !important; \}/);
  assert.match(app, /for \(const family of \['project', 'madre', 'apps'\]\)/);
  assert.match(css, /> \.bar-extra \{ order: 26; \}/);
  assert.match(app, /const barLocked = \(id\) => id === BAR_FIXED \|\| \(id === 'crew' && chatShellOn\(\)\);/);
  assert.match(app, /if \(barKit\.editing\) \{ if \(!barLocked\(id\)\) barDragStart\(event, id\); return; \}/);
  // The title and its pills at one end, the keys at the other; the agents back in the row when what
  // stands at either side would run under them; «More» takes the last family first.
  assert.match(app, /const spring = el\('span', 'bar-spring'\);/);
  assert.match(app, /bar\.classList\.toggle\('bar-crowded', middle\.left < left \+ 12 \|\| middle\.right > right - 12\);/);
  assert.match(css, /html\.chat-shell \.shell > \.bar\.bar-crowded:not\(\.bar-home\) > #agents \{ position: static; transform: none; order: 3; \}/);
  assert.match(app, /const order = chatShellOn\(\) \? barKit\.order\.filter\(\(id\) => !barLocked\(id\)\)\.sort\(\(a, b\) => rank\(a\) - rank\(b\)\) : \[\.\.\.barKit\.order\];/);
  // With the field as display: contents, the fade under the box is measured from the box itself.
  assert.match(app, /const field = fieldBox && fieldBox\.height > 0 \? fieldBox : box;/);
});

test('chat shell: Files holds the code, and the keys that open beside the conversation stand at the right of the bar', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  // Last on the bar, by the side they open at, and the last to go behind «More».
  assert.match(css, /> \.bar-family\.project \{ order: 34; \}/);
  assert.match(css, /> #code-button \{ order: 35; \}/);
  assert.match(css, /> #browser-button \{ order: 36; \}/);
  assert.match(app, /const BAR_SPLIT_KEYS = new Set\(\['code', 'servers'\]\);/);
  assert.match(app, /const rank = \(id\) => \(BAR_SPLIT_KEYS\.has\(id\) \? 9 :/);
  // One key: Code's, with its </>, named Files; whoever kept only Files keeps it.
  assert.match(app, /if \(id === 'finder' && chatShellOn\(\)\) continue;/);
  assert.match(app, /stored\.map\(\(id\) => \(id === 'finder' \? 'code' : id\)\)/);
  assert.doesNotMatch(app, /replaceWith\(folder\.cloneNode\(true\)\)/);
  assert.match(app, /const TOOL_NAMES = \{ viewer: \(\) => t\('Files'\), tree: \(\) => t\('Files'\), browser: \(\) => t\('Your servers'\) \};/);
  // The Finder's own tree (search, new file, its menu) stands where Code kept its list.
  assert.match(app, /const parts = \['#tree-search', '#tree-clip', '#tree-body', '#tree-menu'\]\.map/);
  assert.match(app, /if \(code\.finder\) \{ code\.browsing = false; void openCodeFile\(path\); return; \}/);
  assert.match(app, /const treeInView = \(\) => tree\.open \|\| Boolean\(code\.finder && !code\.explorer\.hidden\);/);
  assert.match(app, /const panel = \(menu\.offsetParent \?\? els\.tree\)\.getBoundingClientRect\(\);/);
  assert.match(app, /if \(open && !codeOn\(\)\) void toggleCode\(\);/);
  // Narrow, the files never hide behind a search: they take the column until a file is chosen.
  assert.match(app, /const browse = on && code\.narrow && \(code\.browsing \|\| !viewerUI\.path\);/);
  assert.match(css, /html\.chat-shell \.code-shell\.browse > \.viewer-body \{ display: none !important; \}/);
  // The open files ride in the head, beside Read and Edit.
  assert.match(app, /viewer\.dialog\.querySelector\('\.viewer-head > \.viewer-spacer'\)\?\.before\(code\.bar\);/);
  // Your servers in the same quiet hand: tabs as the tool tabs, words as a sentence.
  assert.match(css, /html\.chat-shell \.browser-dock \.browser-tab\.on \{ background: var\(--cs-sel, var\(--cs-hover\)\);/);
  assert.match(css, /html\.chat-shell \.browser-dock \.viewer-sizes button\[aria-pressed="true"\] \{ background: none; color: var\(--phosphor\); \}/);
});

test('chat shell: Code shows the text, both or what it makes; the preview is sized by hand; the card asks what fits reading or editing', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  // One choice in words, kept for the next file, instead of «Side by side» and «Preview».
  assert.match(app, /\[\['code', 'Code', 'Only the text'\], \['split', 'Both', 'The text and what it makes, side by side'\], \['preview', 'Preview', 'Only what it makes'\]\]/);
  assert.match(app, /view: \['code', 'split', 'preview'\]\.includes\(saved\.view\) \? saved\.view : saved\.beside === false \? 'preview' : 'split',/);
  assert.match(app, /!\(docked && code\.view !== 'preview'\), mtime/);
  assert.match(css, /\.viewer-head:has\(> \.code-views:not\(\[hidden\]\)\) > :is\(#viewer-mode, \.viewer-beside\) \{ display: none !important; \}/);
  // Dragged to the end, what it makes covers the text.
  assert.match(app, /code\.share = share > 0\.94 \? 1 : Math\.max\(0\.2, Math\.min\(1, share\)\);/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) calc\(var\(--share, \.46\) \* 100%\);/);
  // Reading asks to understand and offers to cite or edit; editing asks to change.
  assert.match(app, /actions: !shell \? CODE_ACTIONS : reading \? CODE_READ_ACTIONS : CODE_EDIT_ACTIONS,/);
  assert.match(app, /askAboutCode\(\{ runs, text, anchor, dirty: false, reading: true \}\);/);
  // «Reference copied» only once it is on the clipboard.
  assert.match(app, /tools\.push\(\[t\('Copy reference'\), async \(\) => \{[\s\S]{0,260}await navigator\.clipboard\.writeText/);
  assert.match(css, /html\.chat-shell \.ask-card \{ gap: 8px;/);
  // The key wears </> again.
  assert.doesNotMatch(app, /files-key/);
  // Your servers: its edge sizes the column, and the page's own edges stand clear of it.
  assert.match(app, /sideWidths\.browser = Math\.round\(box\.x \+ box\.w - moving\.clientX\);/);
  assert.match(css, /\.browser-dock \.viewer-stage \.stage-grip:first-of-type \{ left: max\(12px,/);
});

test('chat shell: thin scrollbars, a hairline before the tools, and a narrow box says the mode by number and the model by nickname', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /:where\(html\), :where\(html\) :where\(\*\) \{ scrollbar-width: thin;/);
  assert.match(css, /:is\(#viewer\.split, #tree\.split, #browser\.browser-dock, #split\.split-dock\)::after \{ content: ''; position: absolute;[^}]*pointer-events: none; \}/);
  assert.match(app, /const cut = \[\.\.\.box\.querySelectorAll\('\.pick-label > :is\(\.mode-chip, \.model-chip, \.effort-chip\) > \.word'\)\]\.some/);
  assert.match(css, /html\.chat-shell \.composer\.tight #pick-options \.model-chip > \.nick \{ display: inline; white-space: nowrap; \}/);
  // The nickname: the family's word, or the last word that is not a maker, a version or a date.
  const source = app.slice(app.indexOf('const MODEL_FAMILIES'), app.indexOf('/* ---------- model menu'));
  const modelNick = new Function(`${source}; return modelNick;`)();
  assert.equal(modelNick('gpt-6-astra'), 'astra');
  assert.equal(modelNick('claude-opus-4-1-20250805'), 'opus');
  assert.equal(modelNick('sonnet[1m]'), 'sonnet');
  assert.equal(modelNick('gemini-2.5-flash'), 'flash');
  assert.equal(modelNick(null), null);
});

test('servers: a new tab opens on this project\'s servers, the menu\'s own list, and goes when the tab gets an address', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /const blank = \(browserTab\(\)\?\.url \?\? 'about:blank'\) === 'about:blank' && Boolean\(browser\.stage\);/);
  assert.match(app, /browser\.lastRead = read;\n  paintBrowserStart\(\);/);
  assert.match(app, /else fillPorts\(list, read\);/);
  assert.match(app, /  fillPorts\(menu, read\);\n\}/);
  assert.match(app, /  browser\.tabsBar\.hidden = false;\n  browserStartShown\(\);/);
  assert.match(css, /\.browser-start \{ position: absolute; inset: 0; z-index: 3;/);
});

test('chat shell: the servers page says Refresh in words, the panel stands flush under its tab, and Modules wears Settings\' hand', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /const refresh = el\('button', 'browser-start-refresh', t\('Refresh'\)\);/);
  assert.match(css, /:root\.chat-shell \.shell > #browser\.browser-dock:not\(\.window\) \{ margin: 0 !important;/);
  assert.match(css, /html\.chat-shell #modules \.mods-tile:not\(\.make\):hover \{ box-shadow: 0 0 0 1\.5px color-mix\(in srgb, var\(--text\) 20%, transparent\) !important; transform: none !important; \}/);
  assert.match(css, /html\.chat-shell #modules \.mods-line \{ display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/);
});

test('chat shell: module lines fit one line, the windows\' buttons are flat, and the second conversation stands as the tools do', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const market = await readFile(new URL('../public/market.js', import.meta.url), 'utf8');
  // Measured in Spanish, the longer of the two: one line of a card is about forty characters.
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  for (const line of [...market.matchAll(/line: '((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replace(/\\'/g, "'"))) {
    const said = es.match(new RegExp(`^  '${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\'")}': '((?:[^'\\\\]|\\\\.)*)',$`, 'm'))?.[1] ?? line;
    assert.ok(said.length <= 40, `«${said}» is longer than one line`);
  }
  assert.match(css, /html\.chat-shell :is\(\.sx-btn, \.settings-back, [^{]*\):not\(\.primary\) \{\n  background-color: transparent !important; box-shadow: inset 0 0 0 1px var\(--cs-line\) !important;/);
  assert.match(app, /const chatShellOn = \(\) => !state\.device && Boolean/);
  assert.match(css, /html\.chat-shell:root:not\(\.via-phone\) \.shell\.with-split > \.split-dock \{ grid-row: 1 \/ -1; \}/);
  assert.match(css, /:root\.chat-shell \.shell > #split\.split-dock \{ margin: 0 !important;/);
});

test('chat shell: flat delegated cards, failures fold into a red dot, one sidebar drawing, a box as wide either way, and the author under the version', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /html\.chat-shell #messages#messages \.row\.delegated \.bubble \{ border: 0 !important;/);
  assert.match(app, /const NOTICE_KEEP_SHELL = NOTICE_KEEP\.replace\('\.fail, ', '\.fail\.answers-person, '\);/);
  assert.match(app, /!node\.matches\(chatShellOn\(\) \? NOTICE_KEEP_SHELL : NOTICE_KEEP\)/);
  assert.match(app, /\.fail:not\(\.recovered\)'\)\) return 'crit';/);
  assert.match(app, /key\.innerHTML = chatShellOn\(\) \? SIDEBAR_ICON : SPLIT_LEFT_ICON;/);
  assert.match(css, /html\.chat-shell \.shell > \.composer \{ width: var\(--wide-column\); margin-left: var\(--wide-left\); \}/);
  assert.match(app, /const copy = el\('a', 'side-copy', `© \$\{YEAR\} \$\{AUTHOR\}`\);/);
  // The author only in the sidebar, under «MADRE 1.0.5» as one name; under the box only module keys.
  assert.match(app, /who\.append\(el\('b', null, initial\.version \? `MADRE \$\{initial\.version\}` : 'MADRE'\)\);/);
  assert.match(css, /html\.chat-shell \.shell > \.colophon > \.colophon-link \{ display: none; \}/);
  assert.match(css, /html\.chat-shell\.split-pane \.shell > \.composer \{ margin-bottom: 14px; \}/);
  // The bar's and the sidebar's bare ground are desktop too; carried or set aside, a window stays itself.
  assert.match(app, /if \(chromePress\(target\)\) return Boolean\(globalThis\.getSelection\?\.\(\)\?\.isCollapsed\) && floatingWindows\(\)\.length > 0;/);
  assert.match(css, /html\.chat-shell :is\(\.tree\.window, dialog\.surface\.window, \.conv-window, \.browser-dock\.window\)\.aside \{ opacity: 1; \}/);
  assert.match(css, /html\.chat-shell dialog\.surface\.window:is\(\.settings-window, \.module-window\)\.lifted \{\n  background-color: var\(--cs-canvas\) !important;/);
  assert.match(css, /html\.chat-shell \.shell > \.composer \{ margin-bottom: 14px; \}/);
  // A row of dots is the size of a lone dot; open, a failure says what MADRE knows before the raw output.
  assert.match(css, /html\.chat-shell #messages#messages \.sys-dots:not\(\.open\):not\(\.single\) \{\n  height: 12px;/);
  assert.match(css, /\.system\.fail\.folded > \.fail-known \{ order: 1;/);
  assert.match(css, /\.system\.fail\.folded > \.fail-said \{\n  order: 2;/);
});

test('chat shell: notices read open without hover, a failure in one face, the reply keys whole, «Reply to» says what happens', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /html\.chat-shell #messages#messages \.sys-dots\.open > \.system\.folded:hover \{ background: transparent !important; \}/);
  assert.doesNotMatch(css, /\.fail-said \{[^}]*var\(--mono\)/);
  assert.match(css, /html\.chat-shell #messages#messages \.bubble-foot > \.bubble-actions \{ margin-right: 0 !important; \}/);
  assert.match(app, /t\('Reply to @\{agent\}\{seq\}', \{ agent: source\.sender, seq \}\)\), el\('span', null, t\('Choose which agent answers you\.'\)\)/);
  assert.match(app, /const ARRANGE_FRAME = '<rect class="frame"/);
  assert.match(css, /html\.chat-shell \.shell > \.composer:focus-within \{ box-shadow: 0 0 0 1px rgba\(20, 30, 20, \.1\), inset 0 1px 2px rgba\(20, 30, 20, \.05\) !important; \}/);
  assert.match(app, /item\.append\(avatar\(agent\.id, \{ size: 22 \}\), body\);/);
  assert.match(css, /html\.chat-shell \.reply-quote \.drop:is\(\*, :hover, :focus-visible\) \{/);
});

test('chat shell: the first steps and a newer MADRE read as quiet words in the bar', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /pill\.replaceChildren\(glyph, el\('span', 'update-words', t\('\{version\} available', \{ version: info\.latest \}\)\), get\);/);
  assert.match(css, /html\.chat-shell \.shell > \.bar > :is\(\.steps-pill, \.update-pill\):is\(\*, :hover, :active, :focus-visible, \[aria-expanded="true"\]\) \{/);
  assert.match(css, /html\.chat-shell \.shell > \.bar > \.update-pill \.update-glyph svg \{ display: none; \}/);
  // Never folded into the bar's square keys; narrow, the ring and count, and the arrow alone.
  assert.match(css, /html\.chat-shell \.shell > \.bar > :is\(\.steps-pill, \.update-pill\) \{ width: auto !important;/);
  assert.match(css, /html\.chat-shell \.shell > \.bar > \.update-pill :is\(\.update-words, \.update-glyph\) \{ display: none; \}/);
});

test('chat shell: a lower box that grows upward, a quiet «/» menu, no /create and no sweep on /module', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  // One line when empty; rows with nothing in them add no gap; up to two fifths of the window.
  assert.match(css, /html\.chat-shell \.shell > \.composer \{ row-gap: 0; padding: 10px 8px 6px 8px !important; \}/);
  assert.match(css, /html\.chat-shell \.composer \.editor :is\(textarea, \.highlight\) \{ max-height: min\(40vh, 336px\); \}/);
  // The menu: the canvas card, one line of what each does, the hover tone and never a colour.
  assert.match(css, /html\.chat-shell \.slash-menu \.item:is\(\[aria-selected="true"\], :hover\) \{ background: var\(--cs-hover\) !important;/);
  assert.match(css, /html\.chat-shell \.slash-menu\.with-starters \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(app, /el\('div', 'group starters', t\('Ideas to start from'\)\)/);
  // #2 is how something is created: /create is not in the menu any more.
  assert.doesNotMatch(app, /name: 'create', title: 'CREATE'/);
  assert.match(app, /if \(name === 'image' \|\| name === 'module'\) \{/);
});

test('the flat store: the chat shell\'s canvas, flat icons, featured cards that peek, shelves three rows deep', async () => {
  const view = await readFile(new URL('../public/market-view.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(view, /const root = el\('div', globalThis\.location\?\.port === '4316' \? 'mk' : 'mk flat'\);/);
  // A slide starts where it starts: the carousel no longer assumes each is the track's width.
  assert.match(view, /track\.scrollTo\(\{ left: startOf\(index\),/);
  assert.match(css, /\.mk\.flat :is\(\.mk-icon, \.mk-slide, \.mk-shot\), html\.chat-shell \.mk-icon \{ --mk-flat: color-mix\(in oklab,/);
  assert.match(css, /\.mk\.flat \.mk-icon \{ background: var\(--mk-flat\);/);
  assert.match(css, /\.mk\.flat \.mk-shelf \.mk-list \{\n  grid-template-columns: none; grid-template-rows: repeat\(3, auto\); grid-auto-flow: column;/);
});

test('the SDK: a module draws its own icon, and MADRE fits it to the tile in one of its colors', async () => {
  const { defineModule, MODULE_FIELDS } = await import('../src/modules/sdk.mjs');
  assert.ok(MODULE_FIELDS.has('icon'));
  assert.deepEqual(defineModule({ id: 'with-icon', name: 'I', icon: { svg: '<path d="M1 1h5"/>', color: '#ABCDEF' } }).icon, { svg: '<path d="M1 1h5"/>', color: '#abcdef' });
  assert.deepEqual(defineModule({ id: 'plain-icon', name: 'I', icon: '<circle r="2"/>' }).icon, { svg: '<circle r="2"/>', color: null });
  assert.equal(defineModule({ id: 'no-icon', name: 'I' }).icon, null);
  assert.throws(() => defineModule({ id: 'huge-icon', name: 'I', icon: { svg: 'x'.repeat(8001) } }), /8000/);
  // The page fits it, draws it in one color and keeps only drawing.
  const market = await readFile(new URL('../public/market.js', import.meta.url), 'utf8');
  assert.match(market, /const own = item\?\.icon\?\.svg \? fitIcon\(item\.icon\.svg\) : null;/);
  assert.match(market, /const scale = 14 \/ Math\.max\(width, height, 0\.001\);/);
  assert.match(market, /if \(PAINTED\.test\(attr\.name\) && attr\.value\.trim\(\)\.toLowerCase\(\) !== 'none'\) node\.setAttribute\(attr\.name, 'currentColor'\);/);
  // The agent that builds a module is told to draw it.
  const prompt = await readFile(new URL('../src/room/prompt.mjs', import.meta.url), 'utf8');
  assert.match(prompt, /Give it its own icon, as part of the module: 'icon: \{ svg, color \}'/);
});

test('the Market as a window of the room, by its own width; the room\'s chrome under every window', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const view = await readFile(new URL('../public/market-view.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(view, /const framed = host\.window\?\.\(\{ root, bar, close: \(\) => close\(\) \}\) \?\? null;/);
  assert.match(app, /host: \{\n      window: marketAsWindow,/);
  assert.match(app, /carryWindowBy\(bar, root, \{ box: \(\) => marketWindow\.box, place, done: remember \}\);/);
  assert.match(css, /\.mk\.flat \{ container: mk \/ inline-size; \}/);
  assert.match(css, /@container mk \(max-width: 760px\) \{/);
  // Its search is every other search: nothing of its own.
  assert.doesNotMatch(css, /\.mk\.flat \.mk-search \{[^}]*background/);
  // The tool tabs and the sidebar used to stand in the windows' layer and cut a window's top.
  assert.match(css, /html\.chat-shell \.tool-tabs \{ z-index: 19; \}/);
  assert.match(app, /const SHELL_CHROME = '#bar, #chats, \.tool-tabs, dialog\.viewer\.split > \.viewer-head,/);
  // The preview of the looks wears the chat shell.
  assert.match(app, /if \(chatShellOn\(\)\) attributes\.set\('class', 'chat-shell'\);/);
});

test('suggested effort, options, commands and connections are parts of MADRE, set in Settings', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const { inMarket, IN_MADRE } = await import('../public/market.js');
  for (const id of ['intents', 'choices', 'runs', 'enlaces']) {
    assert.ok(IN_MADRE.has(id));
    assert.equal(inMarket({ id, kind: 'builtin' }), false, `${id} is still sold in the Market`);
  }
  assert.equal(inMarket({ id: 'ash', kind: 'builtin' }), true);
  assert.match(app, /const IN_SETTINGS = \{ ollama: 'local', intents: 'room', choices: 'room', runs: 'room', enlaces: 'memory' \};/);
  assert.match(app, /if \(id === 'room'\) \{ part\('turns'\); part\('room'\); part\('parts-room'\); \}/);
  assert.match(app, /for \(const item of items\) moduleSheet\(target, item, \{ inSettings: true \}\);/);
  // A module's command wears its module's drawing in the «/» menu.
  assert.match(app, /else glyph = commandGlyph\(item\.glyph \?\? '', item\.module\);/);
});

test('chat shell: a sharp sidebar, your bubble in the accent, two more accents, quiet #3/#4 and one voice under the box', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  // Over the veil (20), under every window (30–49).
  assert.match(css, /html\.chat-shell \.shell > \.tree\.chats\.split \{ z-index: 21; \}/);
  assert.match(css, /html\.chat-shell #messages#messages \.row\.user \.bubble \{ background: color-mix\(in srgb, var\(--phosphor\) 15%, var\(--cs-canvas\)\) !important;/);
  // Pistachio's keys write in white on light; black and fortress blue join the accents everywhere.
  assert.match(css, /:root\[data-scheme="light"\]\[data-accent="pistache"\][^{]*\{ --acc: #049f38; --acc-ink: #ffffff;/);
  for (const id of ['negro', 'fortaleza']) {
    assert.match(css, new RegExp(`\\[data-accent="${id}"\\] \\{ --acc:`));
    assert.match(css, new RegExp(`:root\\[data-scheme="light"\\]\\[data-accent="${id}"\\]`));
    assert.match(css, new RegExp(`\\.swatch\\[data-swatch="${id}"\\] \\{ --sw-dark:`));
  }
  assert.match(css, /:root\[data-scheme="light"\]\[data-accent="fortaleza"\][^{]*\{ --acc: #0030ff;/);
  assert.match(css, /:root\[data-scheme="light"\]\[data-accent="negro"\][^{]*\{ --acc: #141414;/);
  for (const source of [app, home]) assert.match(source, /'pistache', 'petalo', 'negro', 'fortaleza'\]/);
  assert.match(es, /'Fortress blue': 'Azul Fortaleza',/);
  // #3 and #4 come without the rain in the chat shell.
  assert.match(app, /if \(wink && !\(mode >= 3 && chatShellOn\(\)\)\) winkField\(/);
  // The row in one face and size, the unlock tag included; send in the accent.
  assert.match(css, /font: 500 13px\/1\.2 var\(--read\) !important; letter-spacing: 0 !important;/);
  assert.match(css, /\.field > button\[type="submit"\]:not\(:disabled\):hover \{ color: var\(--phosphor\) !important; \}/);
});

test('chat shell: a plan says each step\'s mode in its colour, the bar\'s keys light in the accent, Local AI is two sparkles', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  const market = await readFile(new URL('../public/market.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(app, /node\.append\(el\('span', 'step-mode-in', ` \$\{t\('in mode'\)\} `\), el\('span', `step-mode m\$\{step\.mode\}`, `#\$\{step\.mode\}`\)\);/);
  assert.match(es, /'in mode': 'en modo',/);
  for (const n of [0, 2, 3, 4]) assert.match(css, new RegExp(`html\\.chat-shell #messages \\.system\\.plan \\.step-mode\\.m${n} \\{ color: var\\(--mode-${n}\\); \\}`));
  assert.match(css, /html\.chat-shell #messages \.system\.plan \.step-mode\.m1 \{ color: var\(--acc, var\(--mode-1\)\); \}/);
  assert.match(css, /html\.chat-shell \.shell > \.bar :is\(\.mother-button, \.tree-button, \.bar-icon, \.chats-button\):is\(:hover, :focus-visible\) \{ color: var\(--phosphor\) !important; \}/);
  // The same drawing wherever Local AI is shown, and no network left.
  // One drawing, Trazo MADRE's (public/icons.js, 2026-10-28), that each of them asks for by name.
  const icons = await readFile(new URL('../public/icons.js', import.meta.url), 'utf8');
  assert.match(icons, /spark: '<path class="ic-spark-big" d="[^"]+"\/><path class="ic-spark-small" d="[^"]+"\/>',/);
  assert.match(app, /local: \{ name: 'Local AI', color: '#7f77dd', icon: trazoDrawing\('spark'\) \}/);
  assert.match(market, /ollama: \{[^\n]*icon: trazoDrawing\('spark'\)/);
  assert.match(home, /local: \{ name: 'Local AI', icon: trazoDrawing\('spark'\) \}/);
  for (const source of [app, market, home, icons]) assert.doesNotMatch(source, /class="ic-net"/);
  // The sparkles play on the bar's key only; in Settings the drawing stays still (2026-10-28).
  assert.match(css, /:hover, :focus-visible\) svg \.ic-spark-big \{ transform: scale\(\.5\); \}/);
  assert.match(css, /:hover, :focus-visible\) svg \.ic-spark-small \{ transform: scale\(1\.6\); \}/);
  assert.doesNotMatch(css, /\.settings-card, \.settings-rail-item\):is\(:hover, :focus-visible\) svg \.ic-spark/);
});

test('chat shell: a module key stays filled while its thing is open, notes keep their colour, reminders by day, notices stand off the canvas', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /for \(const key of document\.querySelectorAll\('\.bar-extra\[data-bar-item\]'\)\) key\.setAttribute\('aria-pressed', String\(barExtraOpen\(key\.dataset\.barItem\)\)\);/);
  assert.match(app, /if \(IN_SETTINGS\[id\]\) return Boolean\(settingsWindow\.node\?\.open\) && settingsWindow\.open === IN_SETTINGS\[id\];/);
  assert.match(css, /html\.chat-shell \.shell > \.bar \[aria-pressed="true"\]:is\(\.mother-button, \.tree-button, \.chats-button\) \.ic-f \{ fill: currentColor; fill-opacity: 1; \}/);
  assert.match(css, /html\.chat-shell \.shell > \.bar :is\(\.mother-button, \.tree-button, \.bar-icon, \.chats-button\) svg \{ width: 16px !important; height: 16px !important; \}/);
  // The room's window rule gave a note the canvas: its colour is its own again.
  assert.match(css, /html\.chat-shell dialog\.surface\.window\.module-window\.note-window,\nhtml\.chat-shell dialog\.surface\.window\.module-window\.note-window:is\(\.lifted, \.front, \.behind\) \{\n  background: var\(--note, #fde68a\) !important;/);
  assert.match(app, /const GROUP_WORDS = \{ late: \(\) => t\('Overdue'\), today: \(\) => t\('Today'\), tomorrow: \(\) => t\('Tomorrow'\), later: \(\) => t\('Later'\) \};/);
  assert.match(css, /\.reminders-row \{ display: grid; grid-template-columns: 64px minmax\(0, 1fr\) auto;/);
  assert.match(css, /html\.chat-shell\[data-scheme="dark"\] #messages#messages \.sys-dots\.open \{ background: var\(--cs-input\); box-shadow: 0 0 0 1px rgb\(255 255 255 \/ \.11\)/);
});

test('chat shell: Diagnostics in two rows of filters, the memory map head in the room\'s voice, «What is sent» in plain words', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  assert.match(app, /const scope = el\('div', 'remedy-scope'\);/);
  assert.match(app, /if \(count\) chip\(`agent:\$\{agent\}`, `@\$\{agent\}`, count, byAgent\);/);
  assert.match(css, /html\.chat-shell #mother \.remedy-scope \{ display: flex;/);
  assert.match(css, /html\.chat-shell :is\(#nostromo, \.mv\) \.nostromo-head > \.mother-title \{ font: 600 14px var\(--read\);/);
  // Pressed, white words on a tone of the accent mixed with the map's black: any accent reads (2026-10-30).
  assert.match(css, /html\.chat-shell :is\(#nostromo, \.mv\) \.nostromo-actions \.mother-close\[aria-pressed="true"\] \{ background: color-mix\(in srgb, var\(--acc, var\(--phosphor\)\) 38%, #15171c\) !important; color: #fff !important;/);
  assert.match(app, /\{ id: 'egress', label: t\('Where it connects'\) \},/);
  assert.match(app, /head\.append\(el\('b', null, coreBlockName\(part\.id\)\)\);/);
  assert.match(es, /'What the agent reads': 'Lo que lee el agente',/);
});

test('neural mode: memories are neurons, links are tracts, and the core is never quiet', async () => {
  const engine = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  assert.match(engine, /export function neuronSprite\(hex, variant = 0, state = 'alive', life = state === 'spent' \? 0 : 1\) \{/);
  assert.match(engine, /export function fibreBundle\(ctx, x0, y0, cx, cy, x1, y1, \{ strands = 3, spread = 3, seed = 0 \} = \{\}\) \{/);
  assert.match(engine, /function bulbSparks\(t, count = SPARK_SLOTS\) \{/);
  assert.match(engine, /else ctx\.drawImage\(neuronSprite\(colour, shape, 'alive', baked\), node\.x - side \/ 2, node\.y - side \/ 2, side, side\);/);
  assert.match(engine, /fibreBundle\(ctx, a\.x, a\.y, link\.cx, link\.cy, b\.x, b\.y, \{ strands: 2,/);
  assert.match(engine, /for \(const spark of bulbSparks\(t\)\) \{/);
});

test('chat shell: «What is sent» without the console nor the hint, its reasons in the room\'s language; neurons after the photographs; flat banners', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  const engine = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  const art = await readFile(new URL('../public/market-art.js', import.meta.url), 'utf8');
  assert.match(app, /\.\.\.\(chatShellOn\(\) \? \[\] : \[renderCoreConsole\(\)\]\)\);/);
  assert.match(app, /for \(const tab of CORE_TABS\.filter\(\(one\) => !\(one\.id === 'console' && chatShellOn\(\)\)\)\) \{/);
  assert.doesNotMatch(app, /dataset\.about/);
  assert.match(app, /head\.append\(el\('span', 'when', part\.when === 'always' \? \(chatShellOn\(\) \? t\('always'\) : t\('ALWAYS'\)\) : t\(part\.when\)\)\);/);
  assert.match(es, /'the room has a memory': 'el proyecto tiene memoria',/);
  assert.match(engine, /export const NEURAL_COLORS = \{ decision: '#f0b47c', fact: '#9fd2ea',/);
  assert.match(engine, /export function neuronChip\(hex, size = 16, state = 'alive'\) \{/);
  assert.match(art, /const FLAT = 'var\(--mk-flat, var\(--mk-b, #334155\)\)';/);
  assert.match(art, /<rect x="210" y="130" width="140" height="140" rx="33" style="fill:\$\{FLAT\}"\/>/);
});

test('neural mode: a real neuron — body, branching dendrites, a sheathed axon — alive by use, going out unused, dead when doubtful; the legend shows it whole', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  const engine = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  assert.match(engine, /export function neuronSkeleton\(rnd, c, r, reach, \{ depth = 3, thin = 0\.4, trunks = 4 \+ Math\.floor\(rnd\(\) \* 3\) \} = \{\}\) \{/);
  assert.match(engine, /export function drawLivingNeuron\(paint, sk, hex, life = 1, \{ body = true, fibres = true \} = \{\}\) \{/);
  assert.match(engine, /export function drawDeadNeuron\(paint, sk, hex, rnd, \{ step = 3\.2, dot = 1 \} = \{\}\) \{/);
  assert.match(engine, /sheath: step > 0 && step < steps - 1, z: 1/);
  assert.match(engine, /ctx\.drawImage\(neuronSprite\(neuralTone\(node\), shape, 'dead'\), node\.x - side \/ 2, node\.y - side \/ 2, side, side\);/);
  assert.match(engine, /const life = cold \? 0\.08 \+ 0\.22 \* activity : 0\.3 \+ 0\.7 \* activity;/);
  assert.match(engine, /const baked = neuronLife\(life\);/);
  // The cells are not turned: their light comes from one side.
  assert.doesNotMatch(engine, /ctx\.rotate\(node\.seed \+/);
  assert.match(app, /const mark = nostromo\.neural \? neuronChip\(NEURAL_COLORS\[kind\] \?\? hex, 16, kind === COLLAPSED \? 'dead' : 'alive'\) : kind === COLLAPSED \? collapsedChip\(hex, 14\) : dwarfChip\(hex, 14\);/);
  assert.match(app, /neuronChip\(NEURAL_COLORS\.fact, 16, 'spent'\)/);
  assert.match(es, /'A neuron going out is a quarantined or discarded memory: it is kept, but never used in answers\.': 'Una neurona que se apaga es/);
});

test('neural mode: smaller viscous neurons, quiet light, and a body you can turn any way', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const engine = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  // Smaller, and sized in the world: nearer is larger.
  assert.match(engine, /const soma = \(4\.5 \+ 3\.5 \* activity\) \* persp \* farSize/);
  // Viscous: forks pool, fibres bead, each pass one seamless piece; synapses are tissue.
  assert.match(engine, /knots\.push\(\{ x, y, w: w \* 1\.5, z, part \}\);/);
  assert.match(engine, /paint\.drawImage\(neuronLayer, 0, 0\);/);
  assert.match(engine, /export function gooTube\(ctx, x0, y0, cx, cy, x1, y1,/);
  assert.match(engine, /gooTube\(ctx, a\.x, a\.y, link\.cx, link\.cy, b\.x, b\.y, \{ w: 2\.6 \* persp \* farSize,/);
  // Quiet light.
  assert.match(engine, /halo\.addColorStop\(0, hexAlpha\(tone, 0\.12 \* life\)\);/);
  assert.match(engine, /const glow = Math\.max\(light, cold \? 0 : 0\.12 \* life \* breath\);/);
  // In space: back to front around the core, the core turned as the memories are, any angle.
  assert.match(engine, /for \(const node of byDepth\) if \(\(node\.depth \?\? 0\) < 0\) drawNeuron\(node\);/);
  assert.match(engine, /yaw: \(nostromo\.spin \?\? 0\) \* 0\.2 \+ \(nostromo\.yaw \?\? 0\)/);
  assert.match(engine, /cp = Math\.cos\(pitch\), sp = Math\.sin\(pitch\);/);
  assert.match(app, /nostromo\.pitch = turned\.pitch;/);
  assert.doesNotMatch(app, /PITCH_LIMIT/);
});

test('Home framed as a project: the room\'s sidebar, its bar of quiet keys, flat widgets; CODE takes the accent', async () => {
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  // The same pieces as a project's sidebar: its head, its ways, the projects at hand, its foot.
  assert.match(home, /const side = el\('aside', 'sm-side'\);/);
  assert.match(home, /head\.append\(homeShell\.hide, \.\.\.\(brand \? \[brand\] : \[\]\), el\('span', 'side-grow'\), homeShell\.add\);/);
  assert.match(home, /home: sideRow\(HOME_GLYPH, t\('Home'\), .*\{ here: true \}\),/);
  assert.match(home, /foot\.append\(who, homeShell\.settings, homeShell\.power\);/);
  // The projects at hand are the bar's pins, drawn in the sidebar; a phone keeps the bar.
  assert.match(home, /if \(homeShellOn\(\)\) \{ box\.hidden = true; pinsFit\(\); drawSideProjects\(\); return; \}/);
  assert.match(home, /const SHELL_PHONE = '\(max-width: 560px\)';/);
  assert.match(home, /side \? t\('Keep in the sidebar'\) : t\('Pin to the bar'\)/);
  // Shut or open as it was left, over the canvas on a narrow window.
  assert.match(home, /localStorage\.setItem\(SIDE_KEY, open \? 'open' : 'shut'\)/);
  assert.match(homeCss, /html\.home-shell\.home-side body\.salas-mac \{ padding-left: var\(--side-w\); \}/);
  assert.match(homeCss, /html\.home-shell\.home-side \.sm-side-scrim \{ display: block;/);
  // The bar's keys: 16 px icons, the accent under the pointer; settings and power at the sidebar's foot.
  assert.match(homeCss, /html\.home-shell \.sm-top :is\(\.sm-barkey, \.sm-icon-key\.bar\) svg \{ width: 16px !important; height: 16px !important; \}/);
  assert.match(homeCss, /html\.home-shell \.sm-top :is\(#sm-gear, #sm-power\) \{ display: none !important; \}/);
  // Flat widgets.
  // Flat, with only a whisper of depth under the hairline (2026-10-28).
  assert.match(homeCss, /html\.home-shell \.sm-tile \{ gap: 12px; padding: 16px 18px; border-radius: 12px; background: var\(--cs-canvas\) !important; box-shadow: 0 0 0 1px var\(--cs-line\), 0 1px 2px rgba\(20, 30, 20, \.035\), 0 6px 18px -10px rgba\(20, 30, 20, \.08\) !important; \}/);
  assert.match(es, /'Keep in the sidebar': 'Dejar en la barra lateral',/);
  // CODE's drawing follows its key, as its neighbours' do.
  assert.match(css, /html\.chat-shell \.shell > \.bar > #code-button svg \{ color: inherit !important; \}/);
});

test('Home: the sidebar in Settings, the bar by families, the Market and Modules as windows, the Project map over all in the new head', async () => {
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const macro = await readFile(new URL('../public/macroverso.js', import.meta.url), 'utf8');
  // Settings calls the projects at hand what they are now, and has no bar to arrange.
  assert.match(home, /const catName = \(id\) => \(id === 'bar' && homeShellOn\(\) \? t\('Sidebar'\) : t\(SET_CATS\[id\]\.name\)\);/);
  assert.match(home, /if \(!side\) acts\.append\(sxButton\(t\('Arrange the bar'\)/);
  // The Coordinator with no summary is as tall as what it holds, its box says what will come.
  assert.match(home, /const unsaid = node\.id === 'sm-bishop' && !ui\.work\.list\.childElementCount/);
  assert.match(homeCss, /html\.home-shell \.sm-work:not\(\.is-working\):has\(> \.sm-work-list:empty\) > \.sm-hint::before \{/);
  // The bar by families, the project's piece for Modules, a round orbit for the map.
  assert.match(home, /links\.after\(ui\.macro\);/);
  assert.match(home, /const line = el\('span', 'sm-family'\);/);
  assert.match(homeCss, /html\.home-shell \.sm-top \.sm-family \{ display: block;/);
  // The Market and Modules open as a window: carried, sized, kept, over the sidebar.
  assert.match(home, /window: \(parts\) => homeWindow\(\{ \.\.\.parts, key: 'pulse\.homeMarketWindow\.wide', size: \{ w: 1920, h: 1400 \} \}\),/);
  assert.match(home, /const HOME_WINDOW_LAYER = 44;/);
  assert.match(home, /for \(const side of \['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'\]\) \{/);
  assert.match(homeCss, /html\.home-shell \.mk\.flat \.mk-mine \.mk-section \{ display: grid; grid-template-columns: repeat\(auto-fill, minmax\(210px, 1fr\)\); gap: 10px; \}/);
  // The Project map covers the sidebar, wears the Memory map's head, and its legend is neurons.
  assert.match(homeCss, /html\.home-shell \.mv \{ z-index: 60; \}/);
  assert.match(css, /html\.chat-shell :is\(#nostromo, \.mv\) \.nostromo-head \{/);
  assert.match(macro, /chip\.append\(asNeurons \? neuronChip\(NEURAL_COLORS\[kind\] \?\? hex, 16, kind === COLLAPSED \? 'dead' : 'alive'\)/);
  assert.match(macro, /paintNeuralKey\(neuralButton, on\);\n    paintLegend\(on\);/);
  assert.match(home, /KIND_WORDS\[kind\] = t\(kind === 'aberration' \? 'DOUBTFUL MEMORY' : kind\.toUpperCase\(\)\);/);
});

test('the maps: name over its state, as a window too; the neurons living tissue that sways; Home\'s Modules and Settings as a project\'s', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const engine = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const market = await readFile(new URL('../public/market-view.js', import.meta.url), 'utf8');
  // The name on its line, its state under it, the keys at the right of both.
  assert.match(css, /html\.chat-shell :is\(#nostromo, \.mv\) \.nostromo-head \{ grid-template-columns: minmax\(0, 1fr\) auto; grid-template-areas: "title actions" "sub actions" "legend legend";/);
  // The Memory map as a window, in a project and (the Project map) in Home.
  assert.match(app, /function showNostromoDialog\(\) \{/);
  assert.match(app, /carryWindowBy\(head, nostromo\.dialog, \{ active: nostromoFramed,/);
  assert.match(app, /windowEdgesFor\(nostromo\.dialog, \{ active: nostromoFramed,/);
  assert.match(css, /html\.chat-shell dialog#nostromo\.window \.nostromo-frame \{ height: 100%; grid-template-rows: auto minmax\(0, 1fr\); \}/);
  assert.match(home, /macroFrame = homeWindow\(\{ root: layer, bar: layer\.querySelector\('\.mv-head'\),/);
  // The neurons: a rig whose pieces sway on their roots, a biological palette, texture.
  assert.match(engine, /export function neuronRig\(hex, variant = 0, life = 1\) \{/);
  assert.match(engine, /function rigSway\(t, seed, index, kind\) \{/);
  assert.match(engine, /if \(!nostromo\.reduced && side \* cam\.scale > 44\) drawNeuronRig\(ctx, neuronRig\(colour, shape, baked\), node\.x, node\.y, side, t, node\.seed\);/);
  assert.match(engine, /\/\/ Spines along the thin dendrites/);
  assert.match(engine, /\/\/ Its grain: dark granules and pale ones/);
  // Home: no way back to one project on the bar; Modules in the accent, without Settings' own.
  assert.match(homeCss, /html\.home-shell \.sm-top #sm-back-room \{ display: none !important; \}/);
  assert.match(homeCss, /html\.home-shell \.mk\.flat \.mk-mine \.mk-icon \{ background: color-mix\(in srgb, var\(--phosphor\) 16%, transparent\) !important;/);
  assert.match(market, /const offered = items\.filter\(\(item\) => item\.card !== 'settings' && item\.id !== 'ollama'\);/);
  // Home's Settings a window, not a sheet over the page.
  assert.match(home, /const framed = homeWindow\(\{ root: dialog, bar: head, close: \(\) => dialog\.close\(\), key: 'pulse\.homeSettingsWindow',/);
  assert.match(home, /if \(!dialog\.open\) \{ if \(framed\) \{ dialog\.show\(\); framed\.raise\(\); \} else dialog\.showModal\(\); \}/);
});

test('Local AI and connectors are MADRE\'s own; restart lives in the power key; the keys play; the maps say their keys for this system', async () => {
  const { inMarket, IN_MADRE } = await import('../public/market.js');
  for (const id of ['ollama', 'mcp']) { assert.ok(IN_MADRE.has(id)); assert.equal(inMarket({ id, kind: 'builtin' }), false, `${id} is still sold in the Market`); }
  const power = await readFile(new URL('../public/power.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const neural = await readFile(new URL('../public/neural.js', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  // Restart and turn off, two choices of one key; no reload key on either bar.
  assert.match(power, /export function openPowerMenu\(anchor\) \{/);
  assert.match(power, /key\.addEventListener\('click', \(\) => openPowerMenu\(key\)\);/);
  assert.match(power, /item\(RESTART_ICON, t\('Restart MADRE'\), t\('Home and every open project start again'\), \(\) => void askRestart\(\)\),/);
  // In a project, closing that project alone comes first; turning off and restarting are MADRE's (2026-10-28).
  assert.match(power, /item\(SLEEP_ICON, t\('Close this project'\), t\('It sleeps; Home and your other projects stay open'\), \(\) => void askCloseProject\(\)\)/);
  assert.match(power, /fetch\('\/api\/room\/close'/);
  assert.match(power, /const response = await fetch\('\/api\/madre\/restart',/);
  assert.match(app, /homePower = powerKey\('tree-button', \{ project: true \}\);/);
  assert.match(home, /const powerButton = powerKey\('sm-icon-key bar'\);/);
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(request\.method === 'POST' && url\.pathname === '\/api\/madre\/restart'\) \{/);
  assert.match(server, /if \(!args\.includes\('--port'\)\) next\.push\('--port', String\(port\)\);/);
  assert.match(server, /if \(!args\.includes\('--no-open'\)\) next\.push\('--no-open'\);/);
  assert.match(css, /html\.chat-shell #reload-button \{ display: none !important; \}/);
  assert.match(homeCss, /html\.home-shell \.sm-top #sm-reload \{ display: none !important; \}/);
  // Modules shakes; the Project map stays still and only its moons go round (2026-10-28).
  assert.doesNotMatch(homeCss, /#sm-macro[^{]*svg \{ animation/);
  // Connections: joined at rest; under the pointer they part a little along their diagonal and join again.
  assert.match(homeCss, /@keyframes sm-links-male \{ 0%, 100% \{ transform: none; \} 40% \{ transform: translate\(-1\.1px, 1\.1px\); \} \}/);
  assert.match(homeCss, /@keyframes sm-links-female \{ 0%, 100% \{ transform: none; \} 40% \{ transform: translate\(1\.1px, -1\.1px\); \} \}/);
  // A light square under the pointer, as Settings and Turn off at the sidebar's foot.
  assert.match(homeCss, /html\.home-shell \.sm-top :is\(\.sm-barkey, \.sm-icon-key\.bar\):is\(:hover, :focus-visible\) \{ color: var\(--phosphor\); background: var\(--cs-hover\) !important; \}/);
  assert.match(css, /:not\(\.stop-all\):is\(:hover, :focus-visible\) \{ background: var\(--cs-hover\) !important; border-radius: 8px; \}/);
  assert.match(homeCss, /html\.home-shell #sm-tb-modules:is\(:hover, :focus-visible\) svg \{ animation: icon-shake/);
  // The maps' keys, this computer's own.
  assert.match(neural, /const shift = mac \? '⇧' : 'Shift';/);
  assert.match(app, /if \(chatShellOn\(\)\) help\.replaceChildren\(mapKeys\('memory'\)\);/);
  assert.match(home, /hint: homeShellOn\(\) \? mapKeys\('projects'\) :/);
  assert.match(es, /'Restart or turn off MADRE': 'Reiniciar o apagar MADRE',/);
});

test('Home says why an install or a sign-in failed, in plain words, where it happened', async () => {
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  // The server names the cause; Home turns it into words and keeps it until the agent works.
  assert.match(server, /trouble: found\?\.detected \? null : installTrouble\(/);
  assert.match(server, /const trouble = code === 0 && !error \? null : loginTrouble\(/);
  assert.match(home, /if \(event\.type === 'connection\.install\.finished' \|\| event\.type === 'connection\.login\.finished'\) \{/);
  assert.match(home, /if \(!answer\.ok\) \{ installing\.delete\(agent\.id\); trouble\.set\(agent\.id, \{ kind: 'install', words: answer\.body\?\.error \?\? t\('It did not install\.'\) \}\); \}/);
  assert.match(home, /const box = el\('div', `sm-agent-trouble/);
  // Said in Spanish, never the server's English.
  assert.match(es, /'Another install is running\. Wait for it to finish and try again\.': 'Ya hay otra instalación en curso/);
  assert.match(es, /'It could not download: there is no internet connection, or something on this network blocked it\. Check your connection and try again\.': 'No se pudo descargar/);
});

test('the welcome of 1.0.6: seven steps in place of the bonjour, kept in ~/.pulse, each adapted to where MADRE runs', async () => {
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const tour = await readFile(new URL('../public/tour.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const { WELCOME_STEPS: kept } = await import('../src/tour.mjs');
  // The page and the server name the same steps, in the same order.
  const said = welcome.match(/export const WELCOME_STEPS = (\[[^\]]+\]);/)[1].replace(/'/g, '"');
  assert.deepEqual(JSON.parse(said), kept);
  // Someone new in Home meets it in place of the bonjour; the three steps of 1.0 are gone.
  assert.match(tour, /if \(page === 'home' && path\(\) === 'new' && welcome\?\.instead\) \{/);
  assert.match(home, /welcome: \{ instead: true, needed: /);
  assert.doesNotMatch(home, /function openWizard\(/);
  assert.match(server, /'\/welcome\.js'/, 'served like every module of the page');
  // Where the person is goes to the server, and an unfinished welcome waits in «Needs you».
  assert.match(welcome, /const answer = await post\('\/api\/tour', \{ welcome: change \}\);/);
  assert.match(home, /if \(welcomeSeen\?\.at && !welcomeSeen\.finished\) \{/);
  // Each place has its own way: Windows' Ollama from WSL, a code over SSH, a virtual machine said.
  assert.match(welcome, /const suggested = windows \? `http:\/\/\$\{env\.wsl\?\.windowsHost \?\? 'localhost'\}:11434` : '';/);
  assert.match(welcome, /if \(env\.place === 'ssh' && agent\.detected && !state\.ok && \(agent\.login\?\.methods \?\? \[\]\)\.some\(\(method\) => method\.id === 'device'\)\)/);
  assert.match(welcome, /if \(env\.vm && env\.vm !== 'macOS'\) notes\.push/);
  // MADRE never asks for a password nor runs a downloaded installer: on Linux the line is copied.
  assert.match(welcome, /const OLLAMA_SCRIPT = 'curl -fsSL https:\/\/ollama\.com\/install\.sh \| sh';/);
  assert.match(welcome, /box\.append\(el\('p', 'wl-muted', why\), copyLine\(OLLAMA_SCRIPT\)\);/);
  assert.doesNotMatch(welcome, /post\('\/api\/[^']*', \{[^}]*password/i);
  // The download's share is the model's own piece, the first Ollama names.
  const PULL_LINE = new RegExp(welcome.match(/const PULL_LINE = \/(.+)\/;/)[1]);
  assert.deepEqual(PULL_LINE.exec('pulling 2bada8a74506 · 45%').slice(1), ['2bada8a74506', '45']);
  assert.equal(PULL_LINE.exec('pulling manifest'), null);
  // Training is made ready here and switched on in a project's Settings (B-7).
  assert.match(welcome, /you turn it on in your project\\'s Settings › Memory › Train your own AI/);
  // Its own window, the chat shell's grounds, and no sideways scroll on a phone.
  assert.match(css, /\.wl-window \{ position: relative; width: min\(980px, 100%\);/);
  assert.match(css, /@media \(max-width: 760px\) \{\n  \.wl-window \{ grid-template-columns: 1fr;/);
  // Settings keeps the address of another computer's Ollama.
  assert.match(home, /sxRow\(block, t\('Ollama address'\),/);
});

test('Diagnostics for the welcome (F7): each way it goes wrong has its card, for macOS, Linux, WSL and Windows, one press from where it happened', async () => {
  const { CONDITIONS, PLATFORMS, diagnose, fixesFor } = await import('../public/troubleshooting.js');
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const remedy = await readFile(new URL('../public/remedy.js', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const ids = (text) => diagnose(text).map((one) => one.id);
  // What the programs really print lands on its card.
  assert.ok(ids('npm ERR! request to https://registry.npmjs.org/@openai%2fcodex failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org').includes('install-offline'));
  assert.ok(ids('write /home/carlos/.ollama/models/blobs/sha256-x-partial: no space left on device').includes('disk-full'));
  assert.ok(ids('Error: spawn npm ENOENT').includes('node-missing'));
  assert.ok(ids('channel 3: open failed: connect failed: Connection refused').includes('tunnel-ipv6'));
  assert.ok(ids('Nothing answers at http://172.28.80.1:11434. Check that Ollama is open on that computer and accepts connections from your network.').includes('ollama-remote'));
  assert.ok(ids('Ollama did not answer. Open the Ollama app, then press RECHECK.').includes('ollama-not-starting'));
  assert.ok(ids('Ollama pull HTTP 500: pull model manifest: file does not exist').includes('model-download'));
  assert.ok(ids('/mnt/c/Users/juan/tienda').includes('wsl-windows-folder'));
  assert.deepEqual(ids('listen EADDRINUSE: address already in use 127.0.0.1:4317'), ['port-in-use'], 'a busy MADRE port is not Ollama\'s');
  // Codes are permanent and never shared.
  const codes = CONDITIONS.map((one) => one.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const id of ['no-browser', 'ssh-tunnel', 'tunnel-ipv6', 'install-offline', 'node-missing', 'sign-in-unfinished', 'ollama-not-starting', 'model-download', 'disk-full', 'ollama-remote', 'wsl-windows-folder', 'windows-use-wsl']) {
    const card = CONDITIONS.find((one) => one.id === id);
    assert.ok(card, `no card for ${id}`);
    for (const platform of Object.keys(PLATFORMS)) assert.ok(fixesFor(card, platform).length, `${id} says nothing on ${platform}`);
  }
  // Windows (1.1.0, docs/WINDOWS.md): MADRE runs inside WSL2. No card says MADRE runs on Windows itself.
  assert.match(CONDITIONS.find((one) => one.id === 'windows-use-wsl').diagnosis, /On Windows, MADRE runs inside WSL2.*It does not run on Windows directly\./);
  assert.doesNotMatch(welcome, /that is how MADRE runs on Windows/);
  // A project in WSL reads WSL's column; the card opens from the welcome and from an agent's failure.
  assert.match(server, /platform: await environmentOnce\(\)\.then\(\(one\) => \(one\?\.wsl \? 'wsl' : process\.platform\)/);
  assert.match(welcome, /const fix = \(id\) => \(id \? remedyKey\(id, \{ platform: platformOf\(s\.env\) \}\) : null\);/);
  for (const id of ['ssh-tunnel', 'windows-use-wsl', 'disk-full', 'model-download', 'ollama-remote', 'wsl-windows-folder', 'ollama-not-starting']) assert.match(welcome, new RegExp(`fix\\([^;]*'${id}'`), `the welcome never opens ${id}`);
  assert.match(home, /if \(wrong\.card\) box\.append\(remedyKey\(wrong\.card\)\);/);
  assert.match(home, /const troubleCard = \(agent, kind, cause\) =>/);
  assert.match(remedy, /const lines = fixesFor\(condition, system\);/);
  assert.match(server, /'\/remedy\.js'/);
});

test('the manual starts with «Start here»: the way in for each system, then the welcome, the same in both languages', async () => {
  const { MANUAL } = await import('../public/manual-content.js');
  const manualJs = await readFile(new URL('../public/manual.js', import.meta.url), 'utf8');
  for (const [lang, title] of [['es', 'Empieza aquí'], ['en', 'Start here']]) {
    const first = MANUAL[lang].sections[0];
    assert.equal(first.title, title);
    assert.equal(first.systems.length, 4, `${lang}: Mac, Linux, Windows with WSL, SSH or a virtual machine`);
    for (const system of first.systems) assert.deepEqual(system.code, ['npx @jossuealcala/madre']);
    // Windows says what docs/WINDOWS.md says: from 1.1.0, inside WSL2; opened on Windows itself it
    // explains the way there and stops (bin/madre.mjs). Its card is #windows, where that message and
    // the mail to the waiting list point.
    assert.match(first.systems[2].note, lang === 'es' ? /dentro de WSL2.*directo en Windows, te explica estos pasos y se detiene/ : /inside WSL2.*on Windows itself, it explains these steps and stops/);
    assert.equal(first.systems[2].id, 'windows');
    assert.ok(first.systems[2].steps.some((step) => step.includes('`wsl --install`')));
    // The intro points to it by its new name.
    assert.ok(MANUAL[lang].intro.some((line) => line.includes(`«${title}»`)));
  }
  // The two languages tell the same things: as many sections, systems, steps and problems.
  const shape = (copy) => copy.sections.map((one) => [one.id, one.systems?.map((system) => system.steps.length) ?? null, one.steps?.length ?? 0, one.problems?.length ?? 0]);
  assert.deepEqual(shape(MANUAL.es), shape(MANUAL.en));
  assert.match(manualJs, /if \(section\.systems\?\.length\) \{/);
  assert.match(manualJs, /if \(system\.id\) card\.id = system\.id;/);
});

// The manual of 1.1.0 (2026-10-28): each section with a picture has it in both languages, with one
// mark per step (null where a step has nothing to point at), every picture on disk, and no picture
// left over from a layout that is gone.
test('the manual\'s pictures: one per section and language, a mark per step, none left over', async () => {
  const { MANUAL } = await import('../public/manual-content.js');
  const { SHOTS } = await import('../public/manual-shots.js');
  const { readdirSync } = await import('node:fs');
  const used = new Set();
  for (const lang of ['es', 'en']) {
    for (const section of MANUAL[lang].sections.filter((one) => one.shot)) {
      const shot = SHOTS[lang][section.shot];
      assert.ok(shot, `${lang}: «${section.title}» has no picture (${section.shot})`);
      assert.equal(shot.marks.length, section.steps.length, `${lang}: «${section.title}» has ${section.steps.length} steps and ${shot.marks.length} marks`);
      used.add(`${lang}-${section.shot}.webp`);
    }
    for (const id of ['bienvenida', 'chats', 'modulos', 'licencia']) assert.ok(MANUAL[lang].sections.some((one) => one.id === id), `${lang}: no «${id}»`);
  }
  const files = readdirSync(new URL('../public/assets/manual/shots/', import.meta.url)).filter((name) => name.endsWith('.webp'));
  assert.deepEqual(files.filter((name) => !used.has(name)), [], 'pictures no section shows');
  assert.deepEqual([...used].filter((name) => !files.includes(name)), [], 'pictures a section shows and nobody took');
});

test('review of 2026-10-28: a download can be stopped, «try it» is a talk, Appearance opens from the side, text a touch firmer', async () => {
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const ollamaModule = await readFile(new URL('../src/modules/ollama.mjs', import.meta.url), 'utf8');
  // Stopping a download: the route, the signal into Ollama's pull, and the page says what stays.
  assert.match(ollamaModule, /path: '\/api\/ollama\/pull\/cancel'/);
  assert.match(server, /await pullModel\(\{ host: ollama\.host, model, fetchImpl: reportFetch, signal: stopper\.signal,/);
  assert.match(server, /if \(stopper\.signal\.aborted\) await room\.record\('extension\.install\.finished', \{[^}]*cancelled: true \}\);/);
  assert.match(welcome, /You cancelled the download\. What already arrived stays in Ollama: download it again and it picks up from there\./);
  // «Try it» greets first and streams.
  assert.match(welcome, /if \(!s\.talk\.greeted\) \{ s\.talk\.greeted = true; void say\(GREETING\(\), \{ hidden: true \}\); \}/);
  assert.match(welcome, /const reader = response\.body\.getReader\(\);/);
  assert.match(server, /if \(event\.message\?\.content\) response\.write\(event\.message\.content\);/);
  // The brandbook's logo, drawn once; the close key solid.
  assert.match(welcome, /import \{ MADRE_LOGO as BRAND_LOGO[^}]*\} from '\.\/loader\.js';/);
  assert.match(await readFile(new URL('../public/loader.js', import.meta.url), 'utf8'), /export const MADRE_LOGO = '<svg class="brand-logo"/);
  assert.match(homeCss, /\.wl-close\.surface-modes, \.wl-close \{ border-radius: 10px; background: var\(--wl-canvas\) !important;/);
  // Appearance opens from the side like every category, with Home as it looks now in its preview.
  assert.match(home, /const full = false;/);
  assert.match(home, /if \(root\.classList\.contains\('home-shell'\)\) \{\n    preview\.classList\.add\('shell'\);/);
  // Firmer text and darker quiet greys in the chat shell.
  assert.match(css, /html\.chat-shell body \{ font-weight: 450; \}/);
  assert.match(css, /--read-weight: 430;/);
  assert.match(home, /t\('All caught up\. When an agent asks you something, it shows up here\.'\)/);
});

test('review of 2026-10-28 (2): Home\'s sheets in the new look, Connections understood at a glance, «Add to Home» a window, the chapters with the logo', async () => {
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const homeCss = await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const tour = await readFile(new URL('../public/tour.js', import.meta.url), 'utf8');
  assert.match(homeCss, /html\.home-shell dialog\.sm-sheet:not\(\.sm-settings\) > \.sm-sheet-body \{\n  border-radius: 14px; background-color: var\(--cs-canvas\);/);
  // Connections: three steps, the pair drawn as on the map, switches that say what they do, a plain cancel.
  assert.match(home, /function drawLinkSteps\(\) \{/);
  assert.match(home, /pair\.append\(LINK_MARK\(reader\), arrow, LINK_MARK\(source\)\);/);
  assert.match(home, /option\(enlace\.deliver, t\('It receives delivered notes'\), t\('Notes can be handed to it; they wait for you to accept them before entering its memory\.'\)/);
  assert.match(home, /t\('Cancel the connection'\)/);
  // «Add to Home» is a window like Settings.
  assert.match(home, /const framed = homeWindow\(\{ root: sheetNow, bar: head, close: \(\) => sheetNow\.close\(\), key: 'pulse\.homeAddWindow'/);
  // The chapters wear the logo and the flat window.
  assert.match(tour, /logo\.innerHTML = MADRE_LOGO;/);
  assert.match(css, /html\.chat-shell dialog\.tour-window \.tour-sheet \{ border-radius: 14px; background: var\(--cs-canvas\) !important;/);
});

test('the agenda widget: every project\'s reminders by day, settled in place, and a new one written as you would say it', async () => {
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const { HINTS } = await import('../src/tour.mjs');
  assert.match(home, /'w-agenda': \{ kind: 'agenda', name: \(\) => t\('Agenda'\)/);
  assert.match(home, /fetch\('\/api\/reminders\?all=1'/);
  assert.match(home, /await settleReminder\('\/api\/reminders\/done', \{ id: one\.id \}\);/);
  assert.match(home, /const answer = await post\('\/api\/reminders', \{ text \}\);/);
  // A widget that reads for itself is offered when it can read, and never redrawn under a field being written.
  assert.match(home, /const reading = entry\.spec\.read \? \(\(await entry\.spec\.read\(\)\) \? \{ available: true \} : \{ failed: true \}\)/);
  assert.match(home, /if \(body\.contains\(document\.activeElement\) && document\.activeElement\.matches\('input, textarea'\)\) return;/);
  assert.ok(HINTS.includes('w-agenda'), 'its first-time card can be kept as seen');
});

test('the maps say once that they can be planets or neurons, under the key that switches them, in Home and in a project', async () => {
  const neural = await readFile(new URL('../public/neural.js', import.meta.url), 'utf8');
  const macro = await readFile(new URL('../public/macroverso.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const { HINTS } = await import('../src/tour.mjs');
  // One card for the invitation and for this: the way to switch is on it, and pressing the key answers it too.
  assert.match(neural, /export function tellViews\(\{ key, host, neural = false, onSwitch \}\)/);
  assert.match(neural, /go: neural \? t\('See it as planets'\) : t\('See it as neurons'\)/);
  assert.match(neural, /key\.addEventListener\('click', close, \{ once: true \}\);/);
  // Home's Project map: after the map's own first-time card, never over another, kept as said.
  assert.match(macro, /if \(tellViews\(\{ key: neuralButton, host: layer, neural, onSwitch: \(\) => setNeuralMode\(!neural\) \}\)\) actions\.toldViews\?\.\(\);/);
  assert.match(home, /mayTellViews: \(\) => \{ const seen = homeTour\.state\(\); return Boolean\(seen\?\.bonjourAt && seen\.hints\?\.\['home-map'\] && !seen\.hints\['map-views'\]/);
  // A project's Memory map, modal or a window: inside the dialog, so it can be pressed.
  assert.match(app, /tellViews\(\{ key: nostromo\.neuralKey, host: nostromo\.dialog, neural: nostromo\.neural, onSwitch: \(\) => setNostromoNeural\(!nostromo\.neural\) \}\)\) void tour\.seen\('map-views'\)/);
  assert.match(app, /function showNostromoDialog\(\) \{\n  sayMapViews\(\);/);
  assert.ok(HINTS.includes('map-views'), 'said once for every map, kept in the tour');
});

test('chat shell: choosing another conversation leaves the conversations open, their column does not go away', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  // Beside the conversation it stays; lying over it on a narrow window, it goes (2026-10-29).
  assert.match(app, /const chatsStay = \(\) => chatShellOn\(\) && !chatsOver;/);
  assert.match(app, /if \(id === chats\.active\) \{ if \(!chatsStay\(\)\) setChats\(false\); return; \}/);
  assert.match(app, /if \(beside\) openSplit\(beside, \{ animate: false \}\);\n  \}\);\n  if \(!chatsStay\(\)\) setChats\(false\);\n\}/);
});

// Search in the conversations (2026-10-30): by name and by what was said, without regard to
// accents or capitals, newest first, with where the words are for the page to light them.
test('chats: search finds a conversation by its name and by what was said, accents aside', async () => {
  const { searchChats } = await import('../src/chats.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'pulse-chat-search-'));
  try {
    const main = await new EventStore(chatLedger(dir, MAIN_CHAT)).initialize();
    await main.append('message.created', { messageId: 'm1', role: 'user', sender: 'you', text: '¿Cómo calculamos el ENVÍO gratis?' });
    const other = await createChat(dir, { title: 'Envío y cupones' });
    const store = await new EventStore(chatLedger(dir, other.id)).initialize();
    await store.append('message.created', { messageId: 'm2', role: 'assistant', sender: 'opencode', text: 'El cupón VERANO no cubre envíos internacionales.' });
    const found = await searchChats(dir, 'envio');
    assert.equal(found.results.length, 2);
    const named = found.results.find((one) => one.id === other.id);
    assert.equal(named.titleMatch, true);
    assert.equal(named.hits[0].who, 'opencode');
    const hit = named.hits[0];
    assert.equal(hit.text.slice(hit.mark[0], hit.mark[0] + hit.mark[1]).toLowerCase(), 'envío');
    assert.deepEqual((await searchChats(dir, 'x')).results, [], 'one letter is not a search');
    assert.deepEqual((await searchChats(dir, 'pagos')).results, []);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a sidebar dragged by its edge well past its narrowest closes when let go, keeping its width', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /const SIDE_CLOSE_PAST = \d+;/);
  assert.match(app, /closing = wanted < SIDE_MIN - SIDE_CLOSE_PAST;/);
  assert.match(app, /sideWidths\[surface\.key\] = Math\.max\(SIDE_MIN, wanted\);/);
  assert.match(app, /if \(closing\) \{\s*if \(before === undefined\) delete sideWidths\[surface\.key\]; else sideWidths\[surface\.key\] = before;\s*surface\.close\?\.\(\);/);
  assert.match(css, /\.closing-by-edge \{ opacity: \.45;/);
});
