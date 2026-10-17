import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCheckpoint, diffCheckpoint, readAt } from '../src/checkpoint.mjs';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { createPulseServer } from '../src/server.mjs';
import { hunkKey, lineDiff, placeHunks, revertHunk, symbolAt } from '../public/code-tools.js';

// The code workspace (1.0.3): what an agent changed in a file, line by line, found again in the
// file as it is now, taken back one change at a time, and the function a line is in. Then the two
// routes that serve it: the last change of an agent to a file, as git kept it, and the parts of it
// the human already kept.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const gitInit = (cwd) => new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd }, (error) => (error ? reject(error) : resolve())));
const roster = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' }];

const BEFORE = ['function total(cart) {', '  let sum = 0;', '  for (const item of cart) sum += item.price;', '  return sum;', '}', '', 'function line(item) {', '  return item.name;', '}', ''].join('\n');
const AFTER = ['function total(cart) {', '  // In cents.', '  const cents = cart.reduce((sum, item) => sum + item.cents, 0);', '  return cents / 100;', '}', '', 'function line(item) {', '  return `${item.name}!`;', '}', ''].join('\n');

test('code tools · a change is the lines it removed and the lines it put, and nothing else', () => {
  assert.deepEqual(lineDiff(BEFORE, BEFORE), []);
  const hunks = lineDiff(BEFORE, AFTER);
  assert.equal(hunks.length, 2);
  assert.deepEqual(hunks[0], { beforeStart: 1, before: ['  let sum = 0;', '  for (const item of cart) sum += item.price;', '  return sum;'], afterStart: 1, after: ['  // In cents.', '  const cents = cart.reduce((sum, item) => sum + item.cents, 0);', '  return cents / 100;'] });
  assert.deepEqual([hunks[1].beforeStart, hunks[1].afterStart, hunks[1].before, hunks[1].after], [7, 7, ['  return item.name;'], ['  return `${item.name}!`;']]);
  // Added and removed alone; line endings never make a change.
  assert.deepEqual(lineDiff('a\nb\n', 'a\nx\nb\n'), [{ beforeStart: 1, before: [], afterStart: 1, after: ['x'] }]);
  assert.deepEqual(lineDiff('a\nx\nb\n', 'a\nb\n'), [{ beforeStart: 1, before: ['x'], afterStart: 1, after: [] }]);
  assert.deepEqual(lineDiff('a\r\nb\r\n', 'a\nb\n'), []);
  assert.deepEqual(lineDiff('', 'new\n'), [{ beforeStart: 0, before: [], afterStart: 0, after: ['new'] }], 'a new file is its lines, added');
  // Rewritten past what is worth comparing, the middle is one change.
  const wide = lineDiff('s\na\nb\nc\ne', 's\nx\ny\nz\ne', { maxCells: 4 });
  assert.deepEqual(wide, [{ beforeStart: 1, before: ['a', 'b', 'c'], afterStart: 1, after: ['x', 'y', 'z'] }]);
});

test('code tools · each change is found where it stands now, and one the human rewrote is not the agent\'s any more', () => {
  const hunks = lineDiff(BEFORE, AFTER);
  // Untouched since the turn: where the turn left it.
  assert.deepEqual(placeHunks(AFTER, AFTER, hunks).map((hunk) => hunk.at), [1, 7]);
  assert.deepEqual(placeHunks(AFTER, null, hunks).map((hunk) => hunk.at), [1, 7], 'without the tree the turn left, the disk is it');
  // Two lines written above it: both move down by two.
  const pushed = `// head\n// more\n${AFTER}`;
  assert.deepEqual(placeHunks(pushed, AFTER, hunks).map((hunk) => hunk.at), [3, 9]);
  // The second rewritten by the human: only the first is left.
  const rewritten = AFTER.replace('  return `${item.name}!`;', '  return String(item.name);');
  assert.deepEqual(placeHunks(rewritten, AFTER, hunks).map((hunk) => hunk.afterStart), [1]);
  // A change that only removed lines is found by the line the turn left just before it.
  const removal = lineDiff('a\nb\nx\nc\n', 'a\nb\nc\n');
  assert.deepEqual(placeHunks('top\na\nb\nc\n', 'a\nb\nc\n', removal).map((hunk) => hunk.at), [3]);
  assert.deepEqual(placeHunks('a\nc\n', 'a\nb\nc\n', removal), [], 'the line before it is gone too');
});

test('code tools · taking one change back leaves every other line as it was, line endings included', () => {
  const hunks = placeHunks(AFTER, AFTER, lineDiff(BEFORE, AFTER));
  const one = revertHunk(AFTER, hunks[1]);
  assert.match(one, /return item\.name;/);
  assert.match(one, /const cents/, 'the other change went too');
  // Both taken back, last first so the first stays where it is: the file before the turn.
  assert.equal(revertHunk(revertHunk(AFTER, hunks[1]), hunks[0]), BEFORE);
  const crlf = AFTER.replace(/\n/g, '\r\n');
  const back = revertHunk(crlf, placeHunks(crlf, AFTER, lineDiff(BEFORE, AFTER))[1]);
  assert.ok(back.includes('  return item.name;\r\n') && !/[^\r]\n/.test(back), 'the file came back with other line endings');
});

test('code tools · a change is named by what it says', () => {
  const [first, second] = lineDiff(BEFORE, AFTER);
  assert.match(hunkKey(first), /^[0-9a-f]{8}$/);
  assert.equal(hunkKey(first), hunkKey({ ...first, beforeStart: 40, afterStart: 41, at: 99 }), 'moving it renamed it');
  assert.notEqual(hunkKey(first), hunkKey(second));
  assert.notEqual(hunkKey({ before: ['a'], after: [] }), hunkKey({ before: [], after: ['a'] }), 'adding and removing the same line read alike');
});

test('code tools · the function a line is in, past the ones that closed above it', () => {
  const js = ['import x from "y";', 'export function a() {', '  return 1;', '}', '', 'function b(z) {', '  if (z) {', '    return 2;', '  }', '  return 3;', '}', 'const c = async (v) => {', '  return v;', '};', 'const top = 1;'];
  assert.equal(symbolAt(js, 2, 'js'), 'a');
  assert.equal(symbolAt(js, 7, 'js'), 'b', 'the if around it was taken for its name');
  assert.equal(symbolAt(js, 9, 'js'), 'b', 'the closed if hid the function');
  assert.equal(symbolAt(js, 12, 'js'), 'c');
  assert.equal(symbolAt(js, 14, 'js'), null, 'a line outside every function');
  assert.equal(symbolAt(js, 0, 'js'), null);
  assert.equal(symbolAt(js.join('\n'), 2, 'js'), 'a', 'text and lines read alike');
  const py = ['class Cart:', '    def total(self):', '        return 1', '', 'def free():', '    pass'];
  assert.equal(symbolAt(py, 2, 'py'), 'total');
  assert.equal(symbolAt(py, 5, 'py'), 'free');
  assert.equal(symbolAt(['# Guide', 'intro', '## Install', 'run it'], 3, 'md'), 'Install');
  assert.equal(symbolAt(['.card {', '  color: red;', '}'], 1, 'css'), '.card');
  assert.equal(symbolAt(['anything'], 0, 'txt'), null, 'a kind of file it does not know');
  assert.equal(symbolAt(js, 99, 'js'), null);
});

test('code workspace · an EDIT turn leaves the tree it wrote, and git answers what the file said on each side', async () => {
  const root = await scratch('madre-code-turn-');
  const logDir = await scratch('madre-code-turn-log-');
  try {
    await gitInit(root);
    await writeFile(join(root, 'app.js'), BEFORE);
    const store = new EventStore(join(logDir, 'events.jsonl'));
    const room = new Room({ store, agents: roster, projectRoot: root, invokers: {
      'claude-readonly': async () => { await writeFile(join(root, 'app.js'), AFTER); return { text: 'counted in cents', usage: null }; },
    } });
    room.setScopes({ claude: { maxMode: 3 } });
    await room.send({ text: 'count in cents', target: 'claude', mode: 3 });
    const changed = (await store.readAll()).find((event) => event.type === 'control.changed');
    assert.match(changed.payload.afterTree ?? '', /^[0-9a-f]{40,64}$/, 'the turn did not say which tree it left');
    // The human goes on writing: git still answers what the turn left, not the disk.
    await writeFile(join(root, 'app.js'), `// mine\n${AFTER}`);
    assert.equal(await readAt(root, { checkpointId: changed.payload.checkpointId, path: 'app.js' }), BEFORE);
    assert.equal(await readAt(root, { tree: changed.payload.afterTree, path: 'app.js' }), AFTER);
    for (const path of ['../app.js', '/etc/hosts', '-p', '']) assert.equal(await readAt(root, { checkpointId: changed.payload.checkpointId, path }), null, `${path} was read`);
    assert.equal(await readAt(root, { checkpointId: '../x', path: 'app.js' }), null);
    assert.equal(await readAt(root, { tree: 'HEAD', path: 'app.js' }), null, 'a name that is not a tree was read');
    assert.equal(await readAt(root, { checkpointId: changed.payload.checkpointId, path: 'nope.js' }), null);
    await room.shutdown?.();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('code workspace · the last change of an agent to a file, the parts kept, and nothing once it was undone', async () => {
  const state = await scratch('madre-code-state-');
  const root = await realpath(await scratch('madre-code-proj-')); // not a repository: the shadow keeps it
  const server = await createPulseServer({ projectRoot: root, stateRoot: state, agents: roster, invokers: {} });
  const port = await listen(server.server);
  const base = `http://127.0.0.1:${port}`;
  const post = (body, origin = base) => fetch(`${base}/api/files/changes/review`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) });
  const changes = async (path) => (await fetch(`${base}/api/files/changes?path=${encodeURIComponent(path)}`)).json();
  try {
    await writeFile(join(root, 'app.js'), BEFORE);
    const checkpointId = `20261017000000-code0001`;
    const checkpoint = await createCheckpoint(root, { id: checkpointId, label: 'MADRE control @claude' });
    await writeFile(join(root, 'app.js'), AFTER);
    const diff = await diffCheckpoint(root, checkpoint);
    assert.equal((await changes('app.js')).change, null, 'a file no agent changed has a change');
    await server.store.append('control.changed', { checkpointId, agent: 'claude', mode: 3, files: diff.files, stat: diff.stat, afterTree: diff.afterTree, responseMessageId: 'msg-1' });
    // What the human did after the turn is not the agent's.
    await writeFile(join(root, 'app.js'), `// mine\n${AFTER}`);
    await server.store.append('control.changed', { checkpointId: '20261017000001-mine0001', agent: 'you', files: [{ path: 'app.js', status: 'M' }] });

    const seen = await changes('app.js');
    assert.deepEqual([seen.change.agent, seen.change.checkpointId, seen.change.status, seen.change.messageId], ['claude', checkpointId, 'M', 'msg-1']);
    assert.equal(seen.change.before, BEFORE);
    assert.equal(seen.change.after, AFTER, 'the file the turn left was read from the disk');
    assert.deepEqual(seen.reviewed, []);
    assert.ok(Date.parse(seen.change.at));
    assert.equal((await changes('other.js')).change, null);
    assert.equal((await fetch(`${base}/api/files/changes?path=..%2Fapp.js`)).status, 400);

    // Kept: it stays kept, once, for that change only.
    const [first] = placeHunks(`// mine\n${AFTER}`, seen.change.after, lineDiff(seen.change.before, seen.change.after));
    const kept = await post({ path: 'app.js', checkpointId, hunk: hunkKey(first) });
    assert.equal(kept.status, 200);
    assert.deepEqual((await kept.json()).reviewed, [hunkKey(first)]);
    await post({ path: 'app.js', checkpointId, hunk: hunkKey(first) });
    assert.deepEqual((await changes('app.js')).reviewed, [hunkKey(first)], 'kept twice, listed twice');
    for (const wrong of [{ path: 'app.js', checkpointId, hunk: 'not-hex' }, { path: '../app.js', checkpointId, hunk: 'abcdef12' }, { path: 'app.js', checkpointId: '../x', hunk: 'abcdef12' }, {}]) {
      assert.equal((await post(wrong)).status, 400, JSON.stringify(wrong));
    }
    assert.equal((await post({ path: 'app.js', checkpointId, hunk: 'abcdef12' }, 'https://example.com')).status, 403, 'another site kept a change');

    // Taken back with UNDO, the turn is no longer a change.
    await server.store.append('control.reverted', { checkpointId, agent: 'claude', restored: ['app.js'] });
    assert.equal((await changes('app.js')).change, null);
  } finally {
    await close(server.server);
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(state, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
