import test from 'node:test';
import assert from 'node:assert/strict';
import { exchanges, spread, wordScore, cosine, coverageExam, consistencyExam, matchExam, PASS } from '../src/exam.mjs';

const said = (sequence, payload, type = 'message.created') => ({ sequence, type, payload });
const asked = (sequence, id, text) => said(sequence, { messageId: id, role: 'user', sender: 'you', target: 'codex', text });
const answered = (sequence, id, parent, sender, text) => said(sequence, { messageId: id, parentMessageId: parent, role: 'assistant', sender, text });
const long = (what) => `${what} ${'and the rest of the sentence carries on '.repeat(2)}`;

test('exam: only real exchanges count, and a ghost turn never happened', () => {
  const events = [
    asked(1, 'a', long('how does the webhook verify the signature?')),
    answered(2, 'a1', 'a', 'codex', long('it verifies before parsing')),
    asked(3, 'b', 'ok'),                                        // too short to have an answer
    answered(4, 'b1', 'b', 'codex', long('nothing to say')),
    asked(5, 'c', long('what about refunds from the ledger?')),
    { ...answered(6, 'c1', 'c', 'claude', long('they come from the ledger')), ghost: true },
    asked(7, 'd', long('and the digest on mondays?')),
    answered(8, 'd1', 'd', 'madre', long('seven in the customer timezone')),
    answered(9, 'x1', 'nobody', 'codex', long('an answer to nothing')),
  ];
  const pairs = exchanges(events);
  assert.deepEqual(pairs.map((one) => one.agent), ['codex', 'madre'], 'a ghost turn, a short question and an orphan reply all counted');
  assert.equal(pairs[0].sequence, 1, 'the case is anchored where the question was asked, not where it was answered');
  assert.equal(pairs[1].local, true, 'the local model is not marked as such, so it would be tested against itself');
});

test('exam: a sample is spread across the ledger, not taken off the end', () => {
  const items = Array.from({ length: 100 }, (_, i) => i);
  assert.deepEqual(spread(items, 4), [0, 25, 50, 75]);
  assert.deepEqual(spread([1, 2], 5), [1, 2]);
});

test('exam: coverage asks whether the answer was already in the archive, and says how it measured', async () => {
  const events = [
    asked(1, 'a', long('how does the webhook verify the stripe signature?')),
    answered(2, 'a1', 'a', 'codex', 'The webhook verifies the stripe signature before parsing the body.'),
    asked(3, 'b', long('what is the retention policy for uploads?')),
    answered(4, 'b1', 'b', 'codex', 'Uploads older than ninety days are moved to cold storage nightly.'),
  ];
  // The archive holds the first answer and knows nothing about the second.
  const recall = async (text) => (/webhook/i.test(text) ? ['The webhook verifies the stripe signature before parsing.'] : ['The banner is phosphor green.']);
  const result = await coverageExam({ events, recall });
  assert.equal(result.ran, true);
  assert.equal(result.n, 2);
  assert.equal(result.hits, 1, 'the archive was credited for an answer it does not hold');
  assert.equal(result.rate, 0.5);
  assert.equal(result.method, 'words', 'without an embedder it must not claim to have matched meaning');
  assert.equal(result.passed, false);
  assert.match(result.says, /1 of 2/);

  // With an embedder it says so, and the bar is the one for meaning. The fake stands each subject
  // on its own axis, so nothing matches by simply not being the other thing.
  const axis = (text) => (/webhook|stripe|signature/i.test(text) ? [1, 0, 0] : /upload|storage|retention/i.test(text) ? [0, 1, 0] : [0, 0, 1]);
  const embed = async (texts) => texts.map(axis);
  const meaning = await coverageExam({ events, recall, embed });
  assert.equal(meaning.method, 'meaning');
  assert.equal(meaning.hits, 1);
  assert.equal(meaning.bar > 0.5, true);

  // The control is what makes it able to fail. An archive that hands back the same thing whatever
  // it is asked is about the room's subject and is not answering the question: it scores nothing,
  // however high the bare similarity is.
  const same = async () => ['The webhook verifies the stripe signature before parsing.'];
  const flat = await coverageExam({ events, recall: same, embed });
  assert.equal(flat.hits, 0, 'an archive that answers everything with one note passed the test');
  assert.equal(flat.control >= flat.mean, true, 'the control was not measured against the same material');

  // A room with nothing to test says so rather than reporting a perfect score of nothing.
  const empty = await coverageExam({ events: [], recall });
  assert.equal(empty.ran, false);
  assert.match(empty.says, /No exchange/);
});

test('exam: consistency fails while a contradiction is open, and notices aberrations rising', () => {
  const notes = [
    { id: 1, kind: 'fact', text: 'a', created: '2026-01-01T00:00:00.000Z' },
    { id: 2, kind: 'fact', text: 'b', created: '2026-01-02T00:00:00.000Z' },
    { id: 3, kind: 'fact', text: 'c', created: '2026-01-03T00:00:00.000Z', refutedBy: 5 },
    { id: 4, kind: 'fact', text: 'd', created: '2026-01-04T00:00:00.000Z' },
    { id: 5, kind: 'aberration', text: 'e', created: '2026-01-05T00:00:00.000Z' },
  ];
  const clean = consistencyExam({ findings: [], notes });
  assert.equal(clean.standing, 3, 'an aberration and a refuted note are not notes that stand');
  assert.equal(clean.refuted, 1);
  assert.equal(clean.trend, 'rising', 'every aberration is recent and that is not called out');
  assert.equal(clean.passed, false, 'a room filing more aberrations lately is not consistent yet');

  const older = consistencyExam({ findings: [], notes: [{ id: 9, kind: 'aberration', text: 'x', created: '2026-01-01T00:00:00.000Z' }, ...notes.slice(0, 4)] });
  assert.equal(older.trend, 'falling');
  assert.equal(older.passed, true);
  assert.match(older.says, /Nothing contradicts anything/);

  // One unsettled contradiction is enough to fail, whatever the trend says.
  const held = consistencyExam({ findings: [{ id: 'f1', settled: false }, { id: 'f2', settled: true }], notes });
  assert.equal(held.open, 1);
  assert.equal(held.passed, false);
  assert.match(held.says, /holding 1 contradiction/);
});

test('exam: the match test never grades the local model against itself, and can be stopped', async () => {
  const events = [
    asked(1, 'a', long('how does the webhook verify the signature?')),
    answered(2, 'a1', 'a', 'codex', 'It verifies the signature before parsing.'),
    asked(3, 'b', long('and what about the weekly digest?')),
    answered(4, 'b1', 'b', 'madre', 'Mondays at seven.'),
  ];
  const seen = [];
  const ask = async (question) => { seen.push(question); return 'It verifies the signature before parsing.'; };
  const embed = async (texts) => texts.map((text) => (/verifies/i.test(text) ? [1, 0] : [0, 1]));
  const result = await matchExam({ events, ask, embed });
  assert.equal(seen.length, 1, 'a question the local model already answered was put back to it');
  assert.equal(result.n, 1);
  assert.equal(result.matched, 1);
  assert.equal(result.passed, true);
  assert.equal(result.rate >= PASS.match, true);
  assert.equal(result.control, null, 'with a single case there is no control, and the result must not imply one');

  // Without embeddings it refuses rather than comparing two answers by their words.
  const refused = await matchExam({ events, ask, embed: null });
  assert.equal(refused.ran, false);
  assert.match(refused.says, /needs embeddings/);

  // And the human can stop it: what it has done so far is not reported as a result.
  const stopped = await matchExam({ events, ask, embed, stop: () => true });
  assert.equal(stopped.ran, false);
  assert.equal(stopped.stopped, true);
});

test('exam: the two ways of scoring behave the way they are named', () => {
  assert.equal(wordScore('the webhook verifies the stripe signature', 'stripe signature checks run before parsing') > 0.3, true);
  assert.equal(wordScore('the webhook verifies the stripe signature', 'the banner is green'), 0);
  assert.equal(wordScore('', 'anything'), 0);
  assert.equal(Number(cosine([1, 0], [1, 0]).toFixed(3)), 1);
  assert.equal(Number(cosine([1, 0], [0, 1]).toFixed(3)), 0);
  assert.equal(cosine([1, 0], null), 0);
});
