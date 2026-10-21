import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

// An SSE connection that keeps every frame it hears and knows when the server ended it.
function watch(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const stream = { frames: [], ended: false, close: () => request.destroy() };
      let buffer = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const data = block.match(/^data: (.*)$/m)?.[1];
          if (data) stream.frames.push(JSON.parse(data));
        }
      });
      response.on('end', () => { stream.ended = true; });
      response.on('close', () => { stream.ended = true; });
      resolve(stream);
    });
    request.on('error', reject);
  });
}

// The window split in two: a second conversation, live, beside the one on screen. The server keeps
// one conversation "open" and holds the other by id: its own room, its own record, its own stream.
test('split: a conversation held beside the open one has its own state, stream and messages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-split-'));
  const agents = ['claude', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
  const releases = [];
  const slow = ({ signal }) => new Promise((resolve, reject) => {
    releases.push(() => resolve({ text: 'done', usage: null }));
    signal?.addEventListener('abort', () => reject(new Error('interrupted')), { once: true });
  });
  const quick = async () => ({ text: 'quick answer', usage: null });
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'claude-readonly': slow, 'codex-readonly': quick }, broadcastIntervalMs: 30, heldGraceMs: 200 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const get = (path) => fetch(`${base}${path}`).then((response) => response.json());
  // Up to ten seconds: three were not enough for the macOS machines of CI (1.0.0).
  const until = async (check, what) => { for (let i = 0; i < 1000; i += 1) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 10)); } assert.fail(`never happened: ${what}`); };
  const said = (events, text) => events.some((event) => event.type === 'message.created' && event.payload?.text === text);
  const streams = [];
  try {
    // Two conversations; the first is the one on screen.
    const first = (await get('/api/chats')).active;
    const second = (await (await post('/api/chats')).json()).opened;
    assert.equal((await post(`/api/chats/${first}`)).status, 200);
    assert.equal((await get('/api/chats')).active, first);

    // Read beside: the second conversation's own record, named as such. The open one is unchanged.
    const beside = await get(`/api/state?chat=${second}`);
    assert.equal(beside.chat, second);
    assert.equal((await get('/api/state')).chat, undefined, 'the open conversation says nothing new about itself');
    assert.equal((await get('/api/chats')).active, first, 'reading beside changed the conversation on screen');
    assert.equal((await fetch(`${base}/api/state?chat=zzzznope`)).status, 404);

    const main = await watch(`${base}/api/events`);
    const split = await watch(`${base}/api/events?chat=${second}`);
    streams.push(main, split);

    // A message sent beside lands in that record and that stream only.
    assert.equal((await post(`/api/messages?chat=${second}`, { text: 'beside one', target: 'codex' })).status, 202);
    await until(() => split.frames.some((event) => event.type === 'agent.completed'), 'the split stream heard its turn finish');
    assert.ok(said(split.frames, 'beside one'));
    assert.ok(!said(main.frames, 'beside one'), 'the open conversation heard a message sent beside it');
    assert.ok(said((await get(`/api/state?chat=${second}`)).events, 'beside one'));
    assert.ok(!said((await get('/api/state')).events, 'beside one'));
    // The list follows what was said in it, like any other conversation.
    await until(async () => (await get('/api/chats')).chats.find((chat) => chat.id === second)?.title === 'beside one', 'the list took the title');

    // And one sent to the open conversation stays there.
    assert.equal((await post('/api/messages', { text: 'on screen', target: 'codex' })).status, 202);
    await until(() => said(main.frames, 'on screen'), 'the main stream heard its own message');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(!said(split.frames, 'on screen'), 'the split stream heard the open conversation');

    // Opening a third conversation ends the main page's stream, not the one watching beside.
    const third = (await (await post('/api/chats')).json()).opened;
    await until(() => main.ended, 'the main stream ended when another conversation opened');
    assert.equal(split.ended, false, 'opening another conversation dropped the stream beside it');
    assert.equal((await post(`/api/messages?chat=${second}`, { text: 'still here', target: 'codex' })).status, 202);
    await until(() => said(split.frames, 'still here'), 'the split stream kept working');
    await until(() => split.frames.filter((event) => event.type === 'agent.completed' && event.payload?.agent === 'codex').length >= 2, 'the quick turn beside finished');
    await until(async () => (await get(`/api/state?chat=${second}`)).turns.length === 0, 'the room beside is idle');

    // A slow turn beside, then that conversation becomes the open one: the same room, still running.
    assert.equal((await post(`/api/messages?chat=${second}`, { text: 'slow beside', target: 'claude' })).status, 202);
    await until(() => releases.length === 1, 'the slow turn started');
    assert.equal((await get('/api/chats')).chats.find((chat) => chat.id === second)?.working, true);
    assert.equal((await post(`/api/chats/${second}`)).status, 200);
    await until(() => split.ended, 'the page beside heard its conversation move to the open side');
    const opened = await get('/api/state');
    assert.equal(opened.turns.length, 1, 'the running turn was not found in the conversation it moved to — a second room over its record');
    const again = await watch(`${base}/api/events`);
    streams.push(again);
    releases[0]();
    await until(() => again.frames.some((event) => event.type === 'agent.completed' && event.payload?.agent === 'claude'), 'the turn finished in the open conversation');
    const record = (await get('/api/state')).events;
    assert.equal(record.filter((event) => event.type === 'agent.completed' && event.payload?.agent === 'claude').length, 1, 'the turn was answered twice');

    // One numbering across the project, though two records were written at once.
    const everything = [first, second, third].map((id) => get(`/api/state?chat=${id}`));
    const sequences = (await Promise.all(everything)).flatMap((state) => state.events.map((event) => event.sequence));
    assert.equal(new Set(sequences).size, sequences.length, 'two conversations handed out the same sequence');

    // TURNS counts a conversation beside like any other.
    await post('/api/turns', { chats: 1 });
    assert.equal((await post(`/api/messages?chat=${first}`, { text: 'two at once', target: 'claude' })).status, 202);
    await until(() => releases.length === 2, 'the turn beside started');
    const crowded = await post('/api/messages', { text: 'meanwhile', target: 'claude' });
    assert.equal(crowded.status, 429, 'TURNS let a second conversation work while the limit was one');
    releases[1]();
  } finally {
    for (const stream of streams) stream.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('split: a conversation opened beside closes when nobody watches it, and can be deleted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-split-'));
  const agents = [{ id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, broadcastIntervalMs: 30, heldGraceMs: 100 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  try {
    const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;
    const second = (await (await post('/api/chats')).json()).opened;
    await post(`/api/chats/${first}`);
    const split = await watch(`${base}/api/events?chat=${second}`);
    // Deleting it ends the stream of the page watching it, and the conversation is gone.
    const gone = await fetch(`${base}/api/chats/${second}`, { method: 'DELETE' });
    assert.equal(gone.status, 200);
    for (let i = 0; i < 100 && !split.ended; i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(split.ended, true, 'the page beside kept watching a deleted conversation');
    assert.equal((await fetch(`${base}/api/state?chat=${second}`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// A page that starts watching a conversation beside while that conversation is being let go (its
// grace ran out with nobody watching yet). The feed is built over a few reads; the room used to
// close in between, and the page stayed on a dead room while the next message opened a new one
// it never heard (2026-10-21, «the split stream heard its turn finish» on a busy machine). A grace
// of 1 ms makes that window certain instead of rare.
test('split: a page that starts watching beside as the room is let go keeps hearing it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-split-'));
  const agents = [{ id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, broadcastIntervalMs: 30, heldGraceMs: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const streams = [];
  try {
    const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;
    const second = (await (await post('/api/chats')).json()).opened;
    await post(`/api/chats/${first}`);
    for (let round = 0; round < 2; round += 1) {
      const split = await watch(`${base}/api/events?chat=${second}`);
      streams.push(split);
      // Longer than the grace: a room with a page on it stays.
      await new Promise((resolve) => setTimeout(resolve, 50));
      const text = `beside ${round}`;
      assert.equal((await post(`/api/messages?chat=${second}`, { text, target: 'codex' })).status, 202);
      for (let i = 0; i < 300 && !split.frames.some((event) => event.type === 'agent.completed'); i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(split.frames.some((event) => event.type === 'message.created' && event.payload?.text === text), `round ${round}: the page beside never heard its own message — it watches a room that was closed`);
      assert.ok(split.frames.some((event) => event.type === 'agent.completed'), `round ${round}: the page beside never heard the turn finish`);
      split.close();
      // Let it go again before the next round opens it.
      await new Promise((resolve) => setTimeout(resolve, 1700));
    }
  } finally {
    for (const stream of streams) stream.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// A message sent to a conversation beside that nobody watches: the room is opened for it and let go
// if nothing comes. The message took a few reads to be accepted before its turn existed, the room
// counted as idle all that time, and a grace that ran out in between closed it: the human got 202
// and the turn never ran (2026-10-21, «the turn beside started» on a busy machine). 1 ms of grace
// makes that window certain.
test('split: a message sent beside is answered even if the grace runs out while it is accepted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-split-'));
  const agents = [{ id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, broadcastIntervalMs: 30, heldGraceMs: 1 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  try {
    const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;
    const second = (await (await post('/api/chats')).json()).opened;
    await post(`/api/chats/${first}`);
    for (let round = 0; round < 3; round += 1) {
      assert.equal((await post(`/api/messages?chat=${second}`, { text: `beside ${round}`, target: 'codex' })).status, 202);
      let answered = 0;
      for (let i = 0; i < 300 && answered <= round; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        answered = (await fetch(`${base}/api/state?chat=${second}`).then((response) => response.json())).events.filter((event) => event.type === 'agent.completed').length;
      }
      assert.equal(answered, round + 1, `round ${round}: the message was accepted and never answered`);
      // Let the room go before the next round opens it again.
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
