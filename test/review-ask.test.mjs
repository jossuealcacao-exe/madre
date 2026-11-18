import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { answerAsk, askVia, dueMoment, readAsk, tickAsk } from '../src/review-ask.mjs';
import { createPulseServer } from '../src/server.mjs';

// Asking for a star or a review (2026-10-10): after thirty minutes with an AI at work (2026-11-18),
// then on the second day and on the seventh, once each; never twice within a day, never an earlier
// moment after a later one, and never again once answered. Kept in ~/.pulse, not in a browser, and
// never asked on a phone.
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));

test('review ask · thirty minutes with an AI at work, then the second and the seventh day, once each', async () => {
  const root = await scratch('madre-ask-');
  try {
    const start = Date.parse('2026-10-10T10:00:00Z');
    // A window open with nothing going on counts nothing (2026-11-18).
    let answer;
    for (let minute = 0; minute < 60; minute += 1) answer = await tickAsk(root, start + minute * MIN);
    assert.equal(answer.aiMinutes, 0, 'a page in view with no AI at work was counted');
    assert.equal(answer.due, null, 'asked without an AI ever at work');
    // A minute with an AI at work is counted once a minute, however many pages say it.
    const from = start + 60 * MIN;
    await tickAsk(root, from, { using: true });
    await tickAsk(root, from + 10 * 1000, { using: true });
    assert.equal((await readAsk(root)).aiMinutes, 1, 'two pages in the same minute counted twice');
    for (let minute = 1; minute < 29; minute += 1) answer = await tickAsk(root, from + minute * MIN, { using: true });
    assert.equal(answer.aiMinutes, 29);
    assert.equal(answer.due, null, 'asked before thirty minutes with an AI at work');
    answer = await tickAsk(root, from + 29 * MIN, { using: true });
    assert.equal(answer.due, 'm30');
    // «Not now»: that moment passes, the next ones still come.
    await answerAsk(root, { moment: 'm30', answer: 'later' }, from + 30 * MIN);
    assert.equal((await tickAsk(root, from + 31 * MIN)).due, null);
    assert.equal((await tickAsk(root, start + 2 * DAY + MIN)).due, 'd2');
    await answerAsk(root, { moment: 'd2', answer: 'later' }, start + 2 * DAY + 2 * MIN);
    assert.equal((await tickAsk(root, start + 7 * DAY + MIN)).due, 'd7');
    await answerAsk(root, { moment: 'd7', answer: 'later' }, start + 7 * DAY + 2 * MIN);
    assert.equal((await tickAsk(root, start + 30 * DAY)).due, null, 'asked a fourth time');
    // Kept as a file of its own, never in a browser.
    const kept = JSON.parse(await readFile(join(root, 'review-ask.json'), 'utf8'));
    assert.deepEqual(Object.keys(kept.shown).sort(), ['d2', 'd7', 'm30']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review ask · the days never come before thirty minutes with an AI at work', async () => {
  const root = await scratch('madre-ask-days-');
  try {
    const start = Date.parse('2026-10-10T10:00:00Z');
    await tickAsk(root, start);
    // Ten days later, MADRE opened every day but no AI at work: nothing is asked.
    assert.equal((await tickAsk(root, start + 10 * DAY)).due, null, 'the seventh day asked someone who never used an AI');
    let answer;
    for (let minute = 0; minute < 30; minute += 1) answer = await tickAsk(root, start + 10 * DAY + minute * MIN, { using: true });
    // At the thirtieth minute the latest moment reached is asked, and only it.
    assert.equal(answer.due, 'd7');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review ask · a file from before: its window minutes are left behind, and its twenty-minute ask counts as the first', async () => {
  const root = await scratch('madre-ask-before-');
  try {
    const now = Date.parse('2026-11-18T12:00:00Z');
    await writeFile(join(root, 'review-ask.json'), JSON.stringify({ first: '2026-11-18T08:00:00Z', minutes: 200, lastTick: '2026-11-18T11:59:00Z', shown: {}, answer: null }));
    assert.equal((await tickAsk(root, now)).due, null, 'minutes of a window in view asked as if an AI had worked them');
    await writeFile(join(root, 'review-ask.json'), JSON.stringify({ first: '2026-11-10T08:00:00Z', aiMinutes: 40, shown: { m20: '2026-11-10T09:00:00Z' }, answer: null }));
    const kept = await readAsk(root);
    assert.deepEqual(kept.shown, { m30: '2026-11-10T09:00:00Z' });
    assert.equal(dueMoment(kept, Date.parse('2026-11-11T08:00:00Z')), null, 'asked again at thirty minutes after the twenty-minute ask');
    // A page opened before the change answers «m20»: it is the first moment.
    assert.equal((await answerAsk(root, { moment: 'm20', answer: 'never' }, now)).answer, 'never');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review ask · where it sends: the desktop app to a review, npm or the source to a star', () => {
  assert.equal(askVia({ MADRE_APP: '1' }), 'app');
  assert.equal(askVia({}), 'npm');
});

test('review ask · a later moment takes the earlier ones with it, never twice within a day, and an answer ends it', () => {
  const now = Date.parse('2026-10-20T10:00:00Z');
  const state = (over) => ({ first: '2026-10-10T10:00:00Z', aiMinutes: 300, lastUse: null, shown: {}, answer: null, ...over });
  // Away for ten days: the seventh day is what is asked, not the thirtieth minute.
  assert.equal(dueMoment(state(), now), 'd7');
  assert.equal(dueMoment(state(), Date.parse('2026-10-11T09:00:00Z')), 'm30');
  // Asked a few hours ago: not again today, whatever is due.
  assert.equal(dueMoment(state({ shown: { m30: '2026-10-20T04:00:00Z' } }), now), null);
  // Answered: never again.
  for (const answer of ['star', 'review', 'donate', 'never']) assert.equal(dueMoment(state({ answer }), now), null, `${answer} did not end the asking`);
});

test('review ask · answering a later moment marks the earlier ones; a wrong answer is refused', async () => {
  const root = await scratch('madre-ask-answer-');
  try {
    const start = Date.parse('2026-10-10T10:00:00Z');
    for (let minute = 0; minute < 30; minute += 1) await tickAsk(root, start + minute * MIN, { using: true });
    assert.equal((await answerAsk(root, { moment: 'd7', answer: 'star' }, start + 8 * DAY)).answer, 'star');
    const kept = await readAsk(root);
    assert.deepEqual(Object.keys(kept.shown).sort(), ['d2', 'd7', 'm30'], 'the second day could still come after the seventh');
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
    assert.equal(ticked.aiMinutes, 0, 'a page with no AI at work was counted');
    assert.equal(ticked.via, process.env.MADRE_APP === '1' ? 'app' : 'npm');
    // The page says whether an AI is at work in it; only then is the minute counted.
    assert.equal((await (await post('/api/review-ask/tick', { using: true })).json()).aiMinutes, 1);
    assert.equal((await post('/api/review-ask/answer', { moment: 'm30', answer: 'never' })).status, 200);
    assert.equal((await readAsk(state)).answer, 'never');
    assert.equal((await post('/api/review-ask/answer', { moment: 'm30', answer: 'whatever' })).status, 422);
    const phone = { 'x-madre-device': 'phone-1' };
    assert.deepEqual(await (await post('/api/review-ask/tick', null, phone)).json(), { due: null });
    assert.equal((await post('/api/review-ask/answer', { moment: 'm30', answer: 'star' }, phone)).status, 403);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
