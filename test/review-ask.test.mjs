import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { answerAsk, dueMoment, readAsk, tickAsk } from '../src/review-ask.mjs';
import { createPulseServer } from '../src/server.mjs';

// Asking for a star or a review (2026-10-10): after twenty minutes in use, on the second day and on
// the seventh, once each; never twice within a day, never an earlier moment after a later one, and
// never again once answered. Kept in ~/.pulse, not in a browser, and never asked on a phone.
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));

test('review ask · twenty minutes of use, then the second and the seventh day, once each', async () => {
  const root = await scratch('madre-ask-');
  try {
    const start = Date.parse('2026-10-10T10:00:00Z');
    // A minute is counted once a minute, however many pages say it.
    let answer = await tickAsk(root, start);
    assert.equal(answer.minutes, 0);
    assert.equal(answer.due, null, 'asked at the very first look');
    await tickAsk(root, start + 10 * 1000);
    assert.equal((await readAsk(root)).minutes, 0, 'two pages in the same minute counted twice');
    for (let minute = 1; minute < 20; minute += 1) answer = await tickAsk(root, start + minute * MIN);
    assert.equal(answer.minutes, 19);
    assert.equal(answer.due, null, 'asked before twenty minutes');
    answer = await tickAsk(root, start + 20 * MIN);
    assert.equal(answer.due, 'm20');
    // «Not now»: that moment passes, the next ones still come.
    await answerAsk(root, { moment: 'm20', answer: 'later' }, start + 21 * MIN);
    assert.equal((await tickAsk(root, start + 22 * MIN)).due, null);
    assert.equal((await tickAsk(root, start + 2 * DAY + MIN)).due, 'd2');
    await answerAsk(root, { moment: 'd2', answer: 'later' }, start + 2 * DAY + 2 * MIN);
    assert.equal((await tickAsk(root, start + 7 * DAY + MIN)).due, 'd7');
    await answerAsk(root, { moment: 'd7', answer: 'later' }, start + 7 * DAY + 2 * MIN);
    assert.equal((await tickAsk(root, start + 30 * DAY)).due, null, 'asked a fourth time');
    // Kept as a file of its own, never in a browser.
    const kept = JSON.parse(await readFile(join(root, 'review-ask.json'), 'utf8'));
    assert.deepEqual(Object.keys(kept.shown).sort(), ['d2', 'd7', 'm20']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review ask · a later moment takes the earlier ones with it, never twice within a day, and an answer ends it', () => {
  const now = Date.parse('2026-10-20T10:00:00Z');
  const state = (over) => ({ first: '2026-10-10T10:00:00Z', minutes: 300, lastTick: null, shown: {}, answer: null, ...over });
  // Away for ten days: the seventh day is what is asked, not the twentieth minute.
  assert.equal(dueMoment(state(), now), 'd7');
  assert.equal(dueMoment(state(), Date.parse('2026-10-11T09:00:00Z')), 'm20');
  // Asked a few hours ago: not again today, whatever is due.
  assert.equal(dueMoment(state({ shown: { m20: '2026-10-20T04:00:00Z' } }), now), null);
  // Answered: never again.
  for (const answer of ['star', 'review', 'donate', 'never']) assert.equal(dueMoment(state({ answer }), now), null, `${answer} did not end the asking`);
});

test('review ask · answering a later moment marks the earlier ones; a wrong answer is refused', async () => {
  const root = await scratch('madre-ask-answer-');
  try {
    const start = Date.parse('2026-10-10T10:00:00Z');
    await tickAsk(root, start);
    assert.equal((await answerAsk(root, { moment: 'd7', answer: 'star' }, start + 8 * DAY)).answer, 'star');
    const kept = await readAsk(root);
    assert.deepEqual(Object.keys(kept.shown).sort(), ['d2', 'd7'], 'the second day could still come after the seventh');
    assert.equal(kept.answer, 'star');
    assert.equal((await answerAsk(root, { moment: 'd7', answer: 'maybe' })).error, 'answer');
    assert.equal((await answerAsk(root, { moment: 'd30', answer: 'later' })).error, 'moment');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review ask · the routes: a page ticks and answers; a phone is never asked', async () => {
  const state = await scratch('madre-ask-routes-');
  const project = await scratch('madre-ask-routes-project-');
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, ...headers }, body: JSON.stringify(payload ?? {}) });
    const ticked = await (await post('/api/review-ask/tick')).json();
    assert.equal(ticked.due, null);
    assert.equal((await post('/api/review-ask/answer', { moment: 'm20', answer: 'never' })).status, 200);
    assert.equal((await readAsk(state)).answer, 'never');
    assert.equal((await post('/api/review-ask/answer', { moment: 'm20', answer: 'whatever' })).status, 422);
    const phone = { 'x-madre-device': 'phone-1' };
    assert.deepEqual(await (await post('/api/review-ask/tick', null, phone)).json(), { due: null });
    assert.equal((await post('/api/review-ask/answer', { moment: 'm20', answer: 'star' }, phone)).status, 403);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
