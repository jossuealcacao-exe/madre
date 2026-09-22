import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationContext, CONTEXT_KEEP } from '../src/conversation-context.mjs';

const said = (sequence, text, sender = 'codex') => ({
  sequence, type: 'message.created',
  payload: { messageId: `m${sequence}`, role: sender === 'you' ? 'user' : 'assistant', sender, target: sender === 'you' ? 'codex' : 'you', text },
});
const room = (n, size = 400) => Array.from({ length: n }, (_, i) => said(i + 1, `${'x'.repeat(size)} ${i + 1}`, i % 2 ? 'codex' : 'you'));

test('context: the window is held still and only lets go when what was said no longer fits', () => {
  const budget = 4000;
  const events = room(40);

  // With no anchor it starts fresh, and it starts well under its budget so there is room for
  // many turns of new words before it has to move again.
  const first = buildConversationContext(events.slice(0, 10), { maxChars: budget });
  assert.ok(first.messages.length > 0);
  const weight = (context) => context.messages.reduce((n, m) => n + m.sender.length + m.role.length + m.text.length + 4, 0);
  assert.ok(weight(first) <= budget);

  // Held: as long as everything since the anchor still fits, the transcript begins where it
  // began last time, word for word.
  let anchor = first.anchor;
  let moves = 0;
  const starts = [];
  for (let upto = 11; upto <= 40; upto += 1) {
    const window = buildConversationContext(events.slice(0, upto), { maxChars: budget, anchor });
    assert.ok(weight(window) <= budget, `the window went over budget at ${upto} messages`);
    // Whatever else it drops, the newest thing said is always in it.
    assert.equal(window.messages.at(-1).sequence, upto, `the newest message fell out at ${upto}`);
    if (window.anchor !== anchor) { moves += 1; starts.push(upto); }
    anchor = window.anchor;
  }
  // A sliding window moves on almost every turn; an anchored one moves only when it must.
  assert.ok(moves < 8, `the window moved ${moves} times in thirty turns, at ${starts.join(', ')}`);

  // And when it does move it lets go of a chunk, so it does not have to move again next turn.
  const tight = buildConversationContext(events, { maxChars: budget, anchor: 1 });
  assert.ok(weight(tight) <= budget * CONTEXT_KEEP + 900, 'the window let go of one message and will have to move again at once');
});

test('context: what the window holds is the same whether it was held still or not', () => {
  const events = room(12, 200);
  // The anchoring decides where a window starts, never what a message says. Given the same
  // start, the two are the same transcript: this is an eviction policy, not an edit.
  const fresh = buildConversationContext(events, { maxChars: 100000 });
  const held = buildConversationContext(events, { maxChars: 100000, anchor: 1 });
  assert.deepEqual(held.messages.map((m) => [m.sequence, m.text]), fresh.messages.map((m) => [m.sequence, m.text]));
  assert.equal(held.omittedMessages, 0);

  // An anchor pointing at something long gone does not strand the window in the past.
  const stale = buildConversationContext(events, { maxChars: 1200, anchor: -50 });
  assert.equal(stale.messages.at(-1).sequence, 12);
  assert.ok(stale.messages.length > 0);
  // Nor does one pointing past the end.
  const ahead = buildConversationContext(events, { maxChars: 1200, anchor: 9999 });
  assert.equal(ahead.messages.at(-1).sequence, 12);
});

test('context: an anchored window still reports what it left behind', () => {
  const events = room(30, 300);
  const window = buildConversationContext(events, { maxChars: 2500, anchor: 20 });
  assert.ok(window.omittedMessages > 0, 'the window claims to hold a room it cannot fit');
  assert.equal(window.omittedMessages + window.messages.length, 30);
  assert.equal(window.firstSequence, window.anchor, 'the anchor and the first message disagree');
  assert.equal(window.throughSequence, 30);
});
