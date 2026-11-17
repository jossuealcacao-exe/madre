import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

// TURNS: a conversation at work keeps working while the human moves to another, within limits
// the human sets, and the room says which conversations are working and when one finishes.
test('turns: a conversation at work is parked, not stopped, and the limits are said before a turn starts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-turns-'));
  const agents = ['claude', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
  const releases = [];
  const slow = ({ signal }) => new Promise((resolve, reject) => {
    releases.push(() => resolve({ text: 'done', usage: null }));
    signal.addEventListener('abort', () => reject(new Error('interrupted')), { once: true });
  });
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'claude-readonly': slow, 'codex-readonly': slow }, broadcastIntervalMs: 50 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const until = async (check) => { for (let i = 0; i < 200; i += 1) { if (await check()) return true; await new Promise((resolve) => setTimeout(resolve, 10)); } return false; };
  try {
    // On by default: three conversations, as many as fit on screen, and three turns each.
    const { turns } = await fetch(`${base}/api/turns`).then((response) => response.json());
    assert.deepEqual(turns, { enabled: true, chats: 3, turnsPerChat: 3 });

    // The first conversation starts a turn that takes its time.
    assert.equal((await post('/api/messages', { text: 'long one', target: 'claude' })).status, 202);
    assert.ok(await until(() => releases.length === 1));
    const first = (await fetch(`${base}/api/chats`).then((response) => response.json())).active;

    // Its turn cap is real: with the limit at 1, a second turn in the same conversation is refused.
    await post('/api/turns', { turnsPerChat: 1 });
    const capped = await post('/api/messages', { text: 'and this', target: 'codex' });
    assert.equal(capped.status, 429);
    // Said with the setting's place, Settings › Work and limits (voz, 2026-11-17).
    assert.match((await capped.json()).error, /your setting allows 1 at a time/);
    await post('/api/turns', { turnsPerChat: 3 });

    // A new conversation opens while the first works; the first is listed as working.
    const made = await post('/api/chats', {});
    assert.equal(made.status, 200, 'opening another conversation was refused while one was working');
    const listed = await made.json();
    assert.equal(listed.chats.find((chat) => chat.id === first)?.working, true);

    // With the conversation limit at 1, the new one may not start work while the first is busy.
    await post('/api/turns', { chats: 1 });
    const crowded = await post('/api/messages', { text: 'meanwhile', target: 'codex' });
    assert.equal(crowded.status, 429);
    await post('/api/turns', { chats: 2 });
    assert.equal((await post('/api/messages', { text: 'meanwhile', target: 'codex' })).status, 202);
    assert.ok(await until(() => releases.length === 2));

    // Back to the first: the same room, still working, not a second one over its record.
    assert.equal((await post(`/api/chats/${first}`)).status, 200);
    releases[0]();
    assert.ok(await until(async () => !(await fetch(`${base}/api/chats`).then((response) => response.json())).chats.find((chat) => chat.id === first)?.working), 'the first conversation never finished');
    releases[1]();

    // Off: switching away from a conversation at work is refused, as it always was.
    await post('/api/turns', { enabled: false });
    assert.equal((await post('/api/messages', { text: 'again', target: 'claude' })).status, 202);
    assert.ok(await until(() => releases.length === 3));
    assert.equal((await post('/api/chats', {})).status, 409);
    releases[2]();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
