import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHAPTERS, cameBefore, changeTour, readTour, recoverProject, roomsWithoutProject } from '../src/tour.mjs';
import { projectRoomId, salasRoomId } from '../src/salas.mjs';
import { tickAsk } from '../src/review-ask.mjs';
import { createPulseServer } from '../src/server.mjs';

// The welcome of 1.0 (2026-10-11): kept in ~/.pulse/tour.json, one per person and not one per
// port; and the projects of 0.7.2 brought to Home by their folder's name, proved by its hash.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const room = async (state, id, files = {}) => {
  await mkdir(join(state, 'rooms', id), { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(state, 'rooms', id, name, '..'), { recursive: true });
    await writeFile(join(state, 'rooms', id, name), text);
  }
};
// A line of a room's record: what the room writes the moment it opens, and a message of a person.
const OPENED = '{"id":"a","sequence":1,"type":"local.present","timestamp":"2026-10-11T10:00:00.000Z","payload":{"model":null}}\n';
const SAID = '{"id":"b","sequence":2,"type":"message.created","timestamp":"2026-09-01T10:00:00.000Z","payload":{"messageId":"m","role":"user","text":"hola"}}\n';

test('tour · kept in ~/.pulse, one change at a time, and a file for another version starts it again', async () => {
  const state = await scratch('madre-tour-');
  try {
    const first = await readTour(state);
    assert.deepEqual(first, { version: '1.1', path: null, bonjourAt: null, done: [], at: null, closed: false, finished: null, hints: {}, held: null, before: null, met: null });
    // One tab holds it while it shows it; only that tab lets go.
    await changeTour(state, { hold: 'tab-aaaaaa' });
    assert.equal((await readTour(state)).held.by, 'tab-aaaaaa');
    await changeTour(state, { release: 'tab-bbbbbb' });
    assert.equal((await readTour(state)).held.by, 'tab-aaaaaa', 'another tab let go of it');
    await changeTour(state, { release: 'tab-aaaaaa' });
    assert.equal((await readTour(state)).held, null);
    assert.equal((await changeTour(state, { hold: '../../x' })).error, 'tab');
    const now = new Date('2026-10-11T10:00:00Z');
    await changeTour(state, { path: 'back', bonjour: true }, now);
    await changeTour(state, { chapter: 'links', at: 'links' }, now);
    await changeTour(state, { chapter: 'moved' }, now);
    // The bonjour is dated once; seen again, it keeps its first day.
    await changeTour(state, { bonjour: true }, new Date('2026-10-12T10:00:00Z'));
    const kept = await readTour(state);
    assert.equal(kept.bonjourAt, now.toISOString());
    assert.deepEqual(kept.done, ['moved', 'links'], 'chapters kept out of their order');
    assert.equal(kept.at, 'links');
    await changeTour(state, { closed: true });
    assert.equal((await readTour(state)).closed, true);
    await changeTour(state, { finished: true, hint: 'key4' });
    const finished = await readTour(state);
    assert.ok(finished.finished && !finished.closed && finished.hints.key4);
    // What is not a change is refused, and nothing is written.
    for (const wrong of [{ path: 'sideways' }, { chapter: 'nowhere' }, { at: 'nowhere' }, { hint: 'everything' }, null]) {
      assert.ok((await changeTour(state, wrong)).error, `${JSON.stringify(wrong)} was taken`);
    }
    assert.deepEqual(await readTour(state), finished);
    // Read field by field: what a hand wrote wrong is dropped, the rest stays.
    await writeFile(join(state, 'tour.json'), JSON.stringify({ ...finished, done: ['home', 'nowhere'], path: 'sideways', hints: { switch: 'yesterday', links: now.toISOString() } }));
    const read = await readTour(state);
    assert.deepEqual(read.done, ['home']);
    assert.equal(read.path, null);
    assert.deepEqual(Object.keys(read.hints), ['links']);
    await writeFile(join(state, 'tour.json'), JSON.stringify({ ...finished, version: '0.7' }));
    assert.equal((await readTour(state)).bonjourAt, null, 'a tour of another version counted as this one');
    assert.deepEqual((await changeTour(state, { reset: true })).done, []);
    assert.equal(CHAPTERS.length, 16);
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test('tour · who came before, and the projects of 0.7.2 found by name and proved by hash', async () => {
  const state = await scratch('madre-tour-rooms-');
  const home = await realpath(await scratch('madre-tour-home-'));
  try {
    // A project added in Home and never opened is not someone who came before; the Coordinator's
    // own room is not either; nor a room just opened — `madre start` on a first install makes its
    // record and its memory before anyone writes a word.
    await room(state, salasRoomId(state), { 'events.jsonl': SAID });
    await room(state, 'fresh-0123456789abcdef', { 'project.json': '{}' });
    await room(state, 'opened-0123456789abcdef', { 'events.jsonl': OPENED, 'memory.sqlite': '', 'chats/c1/events.jsonl': OPENED });
    assert.equal(await cameBefore(state), false);
    // A person's word in any conversation of a room, the first or a later one, is.
    await room(state, 'talked-0123456789abcdef', { 'chats/c2/events.jsonl': OPENED + SAID });
    assert.equal(await cameBefore(state), true);
    await rm(join(state, 'rooms', 'talked-0123456789abcdef'), { recursive: true, force: true });
    await rm(join(state, 'rooms', 'opened-0123456789abcdef'), { recursive: true, force: true });

    // Three rooms of 0.7.2: one whose folder is in ~/Projects, one forgotten on purpose, one whose
    // folder is gone; and a folder with the right name in the wrong place for another hash.
    const alpha = join(home, 'Projects', 'alpha');
    await mkdir(alpha, { recursive: true });
    const alphaId = projectRoomId(await realpath(alpha));
    await room(state, alphaId, { 'events.jsonl': OPENED + SAID });
    await room(state, 'beta-0123456789abcdef', { 'events.jsonl': SAID, 'project.forgotten.json': '{}' });
    await room(state, 'gone-fedcba9876543210', { 'memory.sqlite': '' });
    await mkdir(join(home, 'gone'), { recursive: true });
    assert.equal(await cameBefore(state), true);
    assert.deepEqual(await roomsWithoutProject(state), [{ id: alphaId, name: 'alpha' }, { id: 'gone-fedcba9876543210', name: 'gone' }]);

    const found = await recoverProject({ stateRoot: state, home, id: alphaId });
    assert.deepEqual(found, { id: alphaId, name: 'alpha', root: await realpath(alpha), found: true });
    const record = JSON.parse(await readFile(join(state, 'rooms', alphaId, 'project.json'), 'utf8'));
    assert.equal(record.root, await realpath(alpha));
    assert.deepEqual(await recoverProject({ stateRoot: state, home, id: 'gone-fedcba9876543210' }), { id: 'gone-fedcba9876543210', name: 'gone', found: false }, 'a folder with the name but not the hash was taken');
    assert.deepEqual(await roomsWithoutProject(state), [{ id: 'gone-fedcba9876543210', name: 'gone' }]);
    assert.equal((await recoverProject({ stateRoot: state, home, id: 'beta-0123456789abcdef' })).error, 'unknown', 'a forgotten project came back');
  } finally {
    await Promise.all([state, home].map((dir) => rm(dir, { recursive: true, force: true })));
  }
});

test('tour · the review ask keeps quiet on the day of the bonjour', async () => {
  const state = await scratch('madre-tour-ask-');
  try {
    const start = Date.parse('2026-10-11T10:00:00Z');
    // Nineteen minutes: the twentieth comes with the quiet day, so the moment is not handed out
    // before (a moment handed to a page is held for it a while, WEB-12).
    for (let minute = 0; minute <= 19; minute += 1) await tickAsk(state, start + minute * 60 * 1000);
    const quietSince = new Date(start + 5 * 60 * 1000).toISOString();
    assert.equal((await tickAsk(state, start + 21 * 60 * 1000, { quietSince })).due, null, 'asked on the day of the bonjour');
    assert.equal((await tickAsk(state, start + 22 * 60 * 1000)).due, 'm20');
    assert.equal((await tickAsk(state, start + 26 * 60 * 60 * 1000, { quietSince })).due, 'm20', 'quiet for more than a day');
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test('tour · the routes: the pages of this Mac only, never a phone', async () => {
  const state = await scratch('madre-tour-routes-');
  const project = await scratch('madre-tour-routes-project-');
  const home = await realpath(await scratch('madre-tour-routes-home-'));
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const before = process.env.PULSE_LOBBY_HOME;
  process.env.PULSE_LOBBY_HOME = home;
  let server;
  try {
    const old = join(home, 'old');
    await mkdir(old, { recursive: true });
    const oldId = projectRoomId(await realpath(old));
    await room(state, oldId, { 'events.jsonl': SAID });
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const get = (path, headers = {}) => fetch(`${base}${path}`, { headers });
    const post = (path, payload, headers = { origin: base }) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload ?? {}) });

    const told = await (await get('/api/tour')).json();
    assert.equal(told.owed, true);
    assert.equal(told.returning, true, 'a room with a conversation is someone who came before');
    assert.equal((await (await get('/api/tour', { 'x-madre-device': 'phone-1' })).json()).owed, false, 'a phone was offered the bonjour');
    assert.equal((await post('/api/tour', { bonjour: true }, {})).status, 403, 'changed by a process with no page');
    assert.equal((await post('/api/tour', { bonjour: true }, { origin: 'http://127.0.0.1:1' })).status, 403, 'changed from another page');
    assert.equal((await post('/api/tour', { bonjour: true }, { origin: base, 'x-madre-device': 'phone-1' })).status, 403, 'changed from a phone');
    assert.equal((await post('/api/tour', { chapter: 'nowhere' })).status, 422);
    const changed = await (await post('/api/tour', { path: 'back', bonjour: true, chapter: 'moved' })).json();
    assert.deepEqual(changed.state.done, ['moved']);
    assert.equal((await (await get('/api/tour')).json()).owed, false, 'the bonjour came twice');

    // (The room this server serves has no record either: a test starts it without one.)
    assert.deepEqual((await (await get('/api/tour/projects')).json()).rooms.find((one) => one.id === oldId), { id: oldId, name: 'old' });
    const brought = await (await post('/api/tour/projects', { id: oldId })).json();
    assert.equal(brought.found, true);
    assert.equal(brought.root, await realpath(old));
    assert.equal((await post('/api/tour/projects', { id: oldId })).status, 404, 'brought twice');
    assert.ok(!(await (await get('/api/tour/projects')).json()).rooms.some((one) => one.id === oldId), 'still listed once brought');
  } finally {
    if (before === undefined) delete process.env.PULSE_LOBBY_HOME; else process.env.PULSE_LOBBY_HOME = before;
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project, home]) await rm(dir, { recursive: true, force: true });
  }
});

test('tour · the chapters the page tells are the ones the server keeps, in both languages', async () => {
  const { CHAPTERS: told, GESTURES, ORDER } = await import('../public/tour-chapters.js');
  assert.deepEqual(told.map((chapter) => chapter.id), CHAPTERS, 'a chapter the server would refuse, or one it keeps that the page never tells');
  // Three tours of the same chapters: a new person never reads what moved or what was renamed;
  // Home as a board is told inside «Home» there, and on its own only to whoever came from 1.0;
  // whoever came from 0.7.2 starts with what moved, and every other chapter tells them, in one
  // line, what is new or different; whoever came from 1.0 reads only what changed after it.
  assert.deepEqual(Object.keys(ORDER), ['new', 'back', 'since']);
  assert.deepEqual([...ORDER.new].sort(), CHAPTERS.filter((id) => !['moved', 'renamed', 'board'].includes(id)).sort(), 'the tour of the essentials lacks a chapter, or tells one twice');
  assert.deepEqual([...ORDER.back].sort(), CHAPTERS.filter((id) => !['renamed', 'board'].includes(id)).sort(), 'the tour of what changed lacks a chapter, or tells one twice');
  assert.equal(ORDER.back[0], 'moved');
  assert.equal(ORDER.since[0], 'renamed');
  for (const chapter of told.filter((one) => !['moved', 'renamed'].includes(one.id))) {
    assert.ok(['new', 'changed'].includes(chapter.news?.kind) && chapter.news.es && chapter.news.en, `${chapter.id} does not say what changed since 0.7.2`);
  }
  // What moved is told against what 0.7.2 had: BISHOP and PERSONALIZE never shipped in it.
  assert.ok(!JSON.stringify(told[0].moved).match(/BISHOP|PERSONALI/), 'what moved names something 0.7.2 never had');
  for (const chapter of told) {
    for (const field of ['title', 'lead']) assert.ok(chapter[field]?.es && chapter[field]?.en, `${chapter.id} has no ${field} in both languages`);
    // A chapter told in one language only (the clearer names: the English did not change) says nothing in the other.
    if (!chapter.only) assert.equal(chapter.points.es.length, chapter.points.en.length, `${chapter.id} says more in one language`);
    // The gestures are a sheet and the widgets a guide, one line per widget; the rest, three sentences.
    if (!['gestures', 'widgets'].includes(chapter.id)) assert.equal(chapter.points[chapter.only ?? 'es'].length, 3, `${chapter.id} is not three sentences`);
    for (const where of chapter.where) assert.ok(['home', 'room'].includes(where));
    // Nothing is told as «coming soon»: what is not offered is not told (the phone, 2026-10-12).
    assert.equal(chapter.soon, undefined, `${chapter.id} still tells what is coming`);
  }
  for (const [group, rows] of GESTURES) {
    assert.ok(group.es && group.en);
    for (const [what] of rows) assert.ok(what.es && what.en, `${group.es}: a gesture with one language`);
  }
  // Served beside the page, like the loader.
  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  assert.match(server, /'\/loader\.js', '\/tour\.js', '\/tour-chapters\.js'[,\]]/);
  for (const page of ['app.js', 'salas-mac.js']) assert.match(await readFile(join(import.meta.dirname, '..', 'public', page), 'utf8'), /from '\.\/tour\.js'/, `${page} has no welcome`);
});

test('tour · whoever read the tour of 1.0 is told what changed since, and stays someone who came from 1.0', async () => {
  const state = await scratch('madre-tour-since-');
  let server;
  try {
    // The file a person who finished the tour of 1.0 has.
    await writeFile(join(state, 'tour.json'), JSON.stringify({ version: '1.0', path: 'new', bonjourAt: '2026-10-11T10:00:00.000Z', done: ['home', 'gestures'], at: 'gestures', closed: false, finished: '2026-10-11T10:05:00.000Z', hints: { links: '2026-10-11T10:06:00.000Z' }, held: null }));
    const read = await readTour(state);
    assert.deepEqual([read.version, read.bonjourAt, read.finished, read.before], ['1.1', null, null, '1.0'], 'the tour starts again, remembering where it came from');
    await changeTour(state, { path: 'since', bonjour: true, hint: 'w-models' });
    assert.equal((await readTour(state)).path, 'since');
    assert.ok((await readTour(state)).hints['w-models']);
    assert.equal((await changeTour(state, { reset: true })).before, '1.0', 'again from the start, still someone who came from 1.0');
    const project = await scratch('madre-tour-since-project-');
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const told = await fetch(`http://127.0.0.1:${port}/api/tour`).then((response) => response.json());
    assert.deepEqual([told.owed, told.returning, told.from], [true, true, '1.0']);
    await rm(project, { recursive: true, force: true });
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await rm(state, { recursive: true, force: true });
  }
});

test('tour · every path names chapters that exist, and the clearer names are told only in Spanish', async () => {
  const { ORDER, CHAPTERS: TOLD } = await import('../public/tour-chapters.js');
  for (const [path, ids] of Object.entries(ORDER)) for (const id of ids) {
    assert.ok(TOLD.some((chapter) => chapter.id === id), `${path} names ${id}`);
    assert.ok(CHAPTERS.includes(id), `the server does not keep ${id}`);
  }
  assert.equal(TOLD.find((chapter) => chapter.id === 'renamed').only, 'es');
  // Whoever came from 1.0 reads a line on what changed in every chapter but the names.
  for (const id of ORDER.since) if (id !== 'renamed') assert.ok(TOLD.find((chapter) => chapter.id === id).since, `${id} says nothing of what changed since 1.0`);
});

test('tour · the bonjour writes the version a person met MADRE with, so the news of a version reaches only who met it before (2026-10-21)', async () => {
  const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join: joinPath } = await import('node:path');
  const { changeTour, readTour, NEWS_LEVEL } = await import('../src/tour.mjs');
  const root = await mkdtemp(joinPath(tmpdir(), 'madre-tour-met-'));
  try {
    assert.equal((await readTour(root)).met, null);
    await changeTour(root, { path: 'new' });
    const met = await changeTour(root, { bonjour: true });
    assert.equal(met.met, NEWS_LEVEL);
    // A second bonjour does not move it.
    assert.equal((await changeTour(root, { bonjour: true })).met, NEWS_LEVEL);
    // A tour.json from before it was written reads as someone who met MADRE before.
    await writeFile(joinPath(root, 'tour.json'), JSON.stringify({ version: '1.1', path: 'new', bonjourAt: '2026-10-15T10:00:00.000Z', hints: {} }));
    assert.equal((await readTour(root)).met, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
