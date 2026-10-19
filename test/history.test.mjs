import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistory } from '../src/history.mjs';

// The history a module reads (docs/SDK.md, ctx.services.history): one shape for any report.
const event = (sequence, timestamp, type, payload, extra = {}) => ({ sequence, timestamp, type, payload, ...extra });

test('history: what was asked, who answered, what it cost, what changed and stayed, and the decisions of the period', () => {
  const main = [
    event(1, '2026-10-18T10:00:00.000Z', 'message.created', { role: 'user', sender: 'you', target: 'codex', mode: 1, text: 'Ayer' }),
    event(2, '2026-10-19T10:00:00.000Z', 'message.created', { role: 'user', sender: 'you', target: 'codex', mode: 3, text: 'Arregla el IVA' }),
    event(3, '2026-10-19T10:01:00.000Z', 'message.created', { role: 'assistant', sender: 'codex', parentMessageId: 'm', text: 'Cambié precio.mjs:4' }),
    event(4, '2026-10-19T10:01:00.000Z', 'usage.recorded', { agent: 'codex', usage: { totalTokens: 5000, costUsd: 0.02 } }),
    event(5, '2026-10-19T10:01:01.000Z', 'control.changed', { checkpointId: 'c1', agent: 'codex', mode: 3, files: [{ status: 'M', path: 'precio.mjs' }] }),
    event(6, '2026-10-19T10:05:00.000Z', 'control.changed', { checkpointId: 'c2', agent: 'claude', mode: 3, files: [{ status: 'A', path: 'borrador.md' }] }),
    event(7, '2026-10-19T10:06:00.000Z', 'control.reverted', { checkpointId: 'c2' }),
    event(8, '2026-10-19T10:07:00.000Z', 'message.failed', { target: 'gemini', error: '503' }),
    event(9, '2026-10-19T10:08:00.000Z', 'usage.recorded', { agent: 'madre', usage: { totalTokens: 536, costUsd: 0, local: true } }),
  ];
  const other = [event(1, '2026-10-19T11:00:00.000Z', 'message.created', { role: 'user', sender: 'you', target: 'claude', text: 'Pruebas' })];
  const memories = [
    { created: '2026-10-19T10:02:00.000Z', kind: 'decision', text: 'El IVA es 16%', agent: 'codex' },
    { created: '2026-10-19T10:03:00.000Z', kind: 'fact', text: 'no es decisión' },
    { created: '2026-10-17T10:03:00.000Z', kind: 'decision', text: 'fuera del periodo' },
  ];
  const history = summarizeHistory({ chats: [{ id: 'main', title: null, events: main }, { id: 'b', title: 'Pruebas', events: other }], memories, since: '2026-10-19T00:00:00.000Z', until: '2026-10-20T00:00:00.000Z' });

  assert.deepEqual(history.requests.map((one) => [one.chat, one.to, one.text]), [['main', 'codex', 'Arregla el IVA'], ['b', 'claude', 'Pruebas']]);
  assert.deepEqual(history.answers.map((one) => one.agent), ['codex']);
  assert.deepEqual(history.agents.codex, { turns: 1, failed: 0, tokens: 5000, costUsd: 0.02, local: false });
  assert.equal(history.agents.gemini.failed, 1);
  assert.equal(history.agents.madre.local, true);
  // A change taken back with UNDO is told as undone, and its files are not among what stayed.
  assert.deepEqual(history.changes.map((one) => [one.agent, one.undone]), [['codex', false], ['claude', true]]);
  assert.deepEqual(history.files, [{ path: 'precio.mjs', status: 'M' }]);
  assert.deepEqual(history.decisions.map((one) => one.text), ['El IVA es 16%']);
  assert.deepEqual(history.conversations, [{ id: 'main', title: null, requests: 1 }, { id: 'b', title: 'Pruebas', requests: 1 }]);
  assert.deepEqual(history.totals, { requests: 2, answers: 1, tokens: 5536, costUsd: 0.02 });
});

test('history: off the record stays off it, and no period means all of it', () => {
  const events = [
    event(1, '2026-10-19T10:00:00.000Z', 'message.created', { role: 'user', sender: 'you', target: 'codex', text: 'secreto' }, { ghost: true }),
    event(2, '2026-10-19T10:00:00.000Z', 'message.created', { role: 'user', sender: 'you', target: 'codex', text: 'x'.repeat(2000) }),
  ];
  const history = summarizeHistory({ chats: [{ id: 'main', events }] });
  assert.equal(history.requests.length, 1);
  assert.equal(history.requests[0].text.length, 600);
});
