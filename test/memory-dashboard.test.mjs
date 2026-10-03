import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { PASS } from '../src/exam.mjs';
import { memoryDashboard, windowDays, localDay } from '../src/memory-dashboard.mjs';

test('memory dashboard: the window is calendar days, oldest first, and crosses a month like any other day', () => {
  const days = windowDays(5, new Date(2026, 9, 2, 23, 30));
  assert.deepEqual(days, ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  assert.equal(localDay(new Date(2026, 0, 3)), '2026-01-03');
});

test('memory dashboard: a quiet day is still a day, and a week is compared with the one before it', () => {
  const now = new Date(2026, 9, 14, 12);
  const dash = memoryDashboard({
    now,
    days: 14,
    stats: { entries: 40, memories: 9, pending: 3 },
    activity: {
      entries: [['2026-10-01', 4], ['2026-10-14', 10], ['2026-09-01', 99]],
      memories: [['2026-10-10', 2]],
      recalls: [],
      kinds: { fact: 6, decision: 3 },
      agents: { ollama: 9 },
      zones: { hold: 9 },
      via: { search: 5, cascade: 1 },
      turns: 4,
      reached: 2,
    },
  });
  assert.equal(dash.days.length, 14);
  assert.equal(dash.series.entries.length, 14);
  // A day outside the window is not drawn, a day inside with nothing in it is a zero.
  assert.equal(dash.series.entries.reduce((a, b) => a + b, 0), 14);
  assert.equal(dash.series.entries.at(-1), 10);
  assert.equal(dash.series.entries[0], 4);
  assert.deepEqual(dash.series.recalls, new Array(14).fill(0));
  assert.deepEqual(dash.weeks.entries, { last: 10, before: 4, delta: 6 });
  assert.deepEqual(dash.weeks.memories, { last: 2, before: 0, delta: 2 });
  assert.deepEqual(dash.totals, { entries: 40, memories: 9, pending: 3, turns: 4, reached: 2 });
  assert.deepEqual(dash.via, { search: 5, cascade: 1 });
  // The line each test is measured against comes from the tests themselves, not from the page.
  assert.deepEqual(dash.pass, PASS);
  assert.equal(dash.vectors, null);
  assert.equal(memoryDashboard({ activity: null }), null);
});

test('memory dashboard: the archive counts what it did today, and no memory text leaves through it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-dashboard-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    await store.append('message.created', { messageId: 'm1', role: 'user', sender: 'you', target: 'codex', text: 'Where does the webhook signature get verified?' });
    await store.append('message.created', { messageId: 'm1', role: 'assistant', sender: 'codex', target: 'you', text: 'In src/webhook.mjs, before the body is parsed.' });
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    memory.addMemories([
      { kind: 'decision', text: 'Webhook signatures are verified before parsing.', sources: [1, 2] },
      { kind: 'fact', text: 'The webhook handler lives in src/webhook.mjs.', sources: [2] },
    ], { agent: 'gemini', fromSequence: 1, throughSequence: 2 });
    memory.recallMemories('webhook signature parsing', { track: true, by: 'claude' });

    const activity = memory.activity({ days: 7 });
    const today = localDay(new Date());
    assert.deepEqual(activity.entries, [[today, 2]]);
    assert.deepEqual(activity.memories, [[today, 2]]);
    assert.deepEqual(activity.recalls, [[today, 1]], 'one turn, however many notes it carried');
    assert.deepEqual(activity.kinds, { decision: 1, fact: 1 });
    assert.deepEqual(activity.agents, { gemini: 2 });
    assert.equal(activity.turns, 1);
    assert.ok(activity.reached >= 1);

    const dash = memoryDashboard({ activity, stats: { entries: memory.count(), memories: memory.memoryCount(), pending: memory.undistilledCount() }, days: 7 });
    assert.equal(dash.series.entries.at(-1), 2);
    const wire = JSON.stringify(dash);
    for (const said of ['Webhook signatures', 'src/webhook.mjs', 'Where does the webhook']) assert.ok(!wire.includes(said), `"${said}" leaked into the dashboard`);
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
