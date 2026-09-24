import test from 'node:test';
import assert from 'node:assert/strict';
import { questionsFor, ASK_LIMIT, THIN_FLOOR } from '../src/asking.mjs';

const note = (id, kind, text, extra = {}) => ({ id, kind, text, created: '2026-01-01T00:00:00.000Z', recalled: 0, refutedBy: null, ...extra });
const many = (n, kind = 'fact') => Array.from({ length: n }, (_, i) => note(100 + i, kind, `fact number ${i}`));

test('asking: an archive with nothing open and nothing adrift has nothing to ask', () => {
  assert.deepEqual(questionsFor({ notes: [note(1, 'fact', 'the webhook verifies the signature')] }), []);
  assert.deepEqual(questionsFor({}), []);
});

test('asking: the archive\'s own open questions come first, and the ones it keeps carrying come before those', () => {
  const notes = [
    note(1, 'question', 'Do we bill the usage or the seats?'),
    note(2, 'question', 'Who owns the migration after the launch?', { recalled: 4 }),
    note(3, 'fact', 'The banner is phosphor green'),
  ];
  const asks = questionsFor({ notes });
  assert.deepEqual(asks.map((ask) => ask.memoryId), [2, 1], 'an open question the room keeps needing is not asked first');
  // The question is the archive's own words, not a rewrite of them.
  assert.equal(asks[0].text, 'Who owns the migration after the launch?');
  assert.match(asks[0].why, /carried this open question into 4 turns/);
  assert.match(asks[1].why, /recorded this as open/);
  assert.equal(asks[0].id, 'open:2');
});

test('asking: a cold memory is asked about rather than thrown away, and it quotes it exactly', () => {
  const notes = [note(7, 'decision', 'Refunds are issued from the ledger.')];
  const cold = new Map([[7, { chances: 31 }]]);
  const [ask] = questionsFor({ notes, cold });
  assert.equal(ask.source, 'cold');
  assert.equal(ask.memoryId, 7);
  assert.match(ask.text, /Is this still true.*"Refunds are issued from the ledger\."/);
  assert.match(ask.why, /opened 31 times .* never once carried it/);
});

test('asking: a kind the archive is short of is a question about shape, and only once there is an archive', () => {
  // Too small for shares to mean anything: twelve notes of one kind say nothing about balance.
  assert.equal(questionsFor({ notes: many(12) }).length, 0);
  const asks = questionsFor({ notes: many(THIN_FLOOR + 4) });
  assert.ok(asks.length, 'a lopsided archive raised nothing');
  assert.ok(asks.every((ask) => ask.source === 'thin'));
  const decisions = asks.find((ask) => ask.id === 'thin:decision');
  assert.ok(decisions, 'an archive with no decisions at all is not asked about decisions');
  assert.equal(decisions.memoryId, null, 'a question about shape does not belong to one memory');
  assert.match(decisions.why, /0 of 24 notes are decisions/);
  // A kind that is well represented is never raised.
  assert.equal(asks.some((ask) => ask.id === 'thin:fact'), false);
});

test('asking: no single well fills the whole list, and what was waved off stays away', () => {
  const notes = [
    ...['billing', 'migrations', 'onboarding', 'refunds', 'telemetry'].map((subject, i) => note(i + 1, 'question', `Who owns ${subject} after the launch?`)),
    ...[
      'Refunds are issued from the ledger, never from the payment gateway.',
      'The weekly digest goes out on Mondays at seven, in the customer timezone.',
      'Uploads over twenty megabytes are rejected at the edge with a plain message.',
      'Staging is wiped every Friday and rebuilt from the seed script.',
      'The scheduler retries three times, then files the job for a human to look at.',
    ].map((text, i) => note(i + 10, 'decision', text)),
  ];
  const cold = new Map(Array.from({ length: 5 }, (_, i) => [i + 10, { chances: 20 + i }]));
  const asks = questionsFor({ notes, cold });
  assert.equal(asks.length, ASK_LIMIT);
  const sources = asks.map((ask) => ask.source);
  assert.ok(sources.filter((source) => source === 'open').length >= 3, 'the open questions were crowded out');
  assert.ok(sources.includes('cold'), 'six variations on one well is a loop, not a plan');

  // Waving one off removes exactly that one; the list fills from behind it.
  const after = questionsFor({ notes, cold, dismissed: [asks[0].id] });
  assert.equal(after.some((ask) => ask.id === asks[0].id), false);
  assert.equal(after.length, ASK_LIMIT);
});

test('asking: nothing false or refuted is ever the subject of a question', () => {
  const notes = [
    note(1, 'aberration', 'The webhook parses before verifying.'),
    note(2, 'question', 'Is the webhook safe?', { refutedBy: 1 }),
  ];
  assert.deepEqual(questionsFor({ notes, cold: new Map([[1, { chances: 40 }], [2, { chances: 40 }]]) }), []);
});

test('asking: the same question asked twice is one question', async () => {
  const { sameQuestion } = await import('../src/asking.mjs');
  // The archivist distils on several passes and sometimes records a question twice, a word apart.
  assert.equal(sameQuestion('¿Por qué @gemini no respondió al debate sobre TRAINING?', '¿Por qué el agente @gemini no respondió al debate sobre TRAINING?'), true);
  assert.equal(sameQuestion('Who owns the migration?', 'How do we bill usage?'), false);
  // Two short questions that share their opening are not the same question either.
  assert.equal(sameQuestion('Who owns the billing?', 'Who owns the migration?'), false);
  // One question wholly inside another is that question said at more length, however much the
  // longer one adds. This is the shape the archivist actually produces on a second pass.
  assert.equal(sameQuestion(
    '¿Por qué @gemini no respondió al debate sobre TRAINING/MOTHER-1 en la secuencia #1411?',
    '¿Por qué el agente @gemini no respondió al debate sobre TRAINING/MOTHER-1 en la secuencia #1411, dado que se descartó relación con el fallo de créditos #246?',
  ), true);
  assert.equal(sameQuestion('', 'anything'), false);

  const notes = [
    note(1, 'question', '¿Por qué @gemini no respondió al debate sobre TRAINING?', { recalled: 3 }),
    note(2, 'question', '¿Por qué el agente @gemini no respondió al debate sobre TRAINING?', { recalled: 1 }),
    note(3, 'question', 'Who owns the migration after the launch?'),
  ];
  const asks = questionsFor({ notes });
  assert.deepEqual(asks.map((ask) => ask.memoryId), [1, 3], 'the same question was offered twice');
});
