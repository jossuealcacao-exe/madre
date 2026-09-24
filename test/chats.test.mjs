import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
  assert.match(css, /\.chats \{[^}]*justify-self: start/);
  assert.match(css, /\.tree \{[^}]*justify-self: end/);
  // The handle sits in the canvas, under the bar, where the conversation it opens begins.
  assert.match(css, /\.chats-button \{[^}]*grid-row: 3[^}]*justify-self: start/);
  // Never both edges at once on a narrow screen.
  assert.match(css, /@media \(max-width: 1100px\) \{ \.chats-button \{ display: none; \} \}/);

  // Opening one is a reload: a conversation is a different record of the same room, and the page
  // is built from a record.
  assert.match(app, /async function openChat\(id\) \{[\s\S]*window\.location\.reload\(\)/);
  assert.match(app, /fetch\('\/api\/chats', \{ method: 'POST'/, 'nothing starts a conversation');
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
