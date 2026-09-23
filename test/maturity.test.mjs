import test from 'node:test';
import assert from 'node:assert/strict';
import { maturity, stageOf, WEIGHTS, VOLUME_TARGET, STAGES } from '../src/maturity.mjs';

const note = (id, extra = {}) => ({ id, kind: 'fact', recalled: 0, refutedBy: null, created: '2026-09-01T00:00:00.000Z', ...extra });
const room = ({ pairs = 0, good = 0, bad = 0, turns = 0, delegated = 0, notes: noteShare = 0, memories = [], links = [], pending = 0, entries = 0 } = {}) =>
  maturity({ readiness: { pairs, good, bad, turns, delegated, notes: noteShare }, notes: memories, links, stats: { pending, entries } });

test('maturity: an empty room is empty, and says so instead of showing progress', () => {
  const nothing = room();
  assert.equal(nothing.score, 0);
  assert.equal(nothing.stage.id, 'empty');
  assert.equal(nothing.signals.length, 6);
  for (const signal of nothing.signals) {
    assert.equal(signal.value, 0, `${signal.id} claims progress in an empty room`);
    assert.ok(signal.next && signal.next.length > 20, `${signal.id} does not say what would raise it`);
    assert.ok(signal.detail.length > 5, `${signal.id} reports no numbers`);
  }
});

test('maturity: size alone is not maturity, which is the whole reason for this', () => {
  // A room that reached the old target and nothing else. Under the bar that filled toward three
  // hundred this read as ready to train; it is narrow, unjudged and made mostly of recall.
  const large = room({ pairs: VOLUME_TARGET, notes: VOLUME_TARGET, memories: Array.from({ length: 60 }, (_, i) => note(i + 1)), entries: 400, pending: 0 });
  assert.equal(large.signals.find((s) => s.id === 'volume').value, 1, 'the corpus is not at the target');
  assert.ok(large.score < 0.55, `a corpus with nothing but size scored ${large.score}`);
  assert.notEqual(large.stage.id, 'mature', 'size alone was called mature');
  // And it names the one thing most worth doing rather than leaving it to be worked out.
  assert.ok(['judgement', 'coverage', 'weave', 'balance'].includes(large.weakest));

  // The same size, used, woven, judged and balanced, is another thing entirely.
  const grown = room({
    pairs: VOLUME_TARGET, good: 30, turns: 120, delegated: 30, notes: 150,
    memories: Array.from({ length: 60 }, (_, i) => note(i + 1, { recalled: 2 })),
    links: Array.from({ length: 59 }, (_, i) => ({ a: i + 1, b: i + 2 })),
    entries: 400, pending: 2,
  });
  assert.ok(grown.score > 0.85, `a room that is large, used, woven and judged scored ${grown.score}`);
  assert.equal(grown.stage.id, 'mature');
});

test('maturity: every reading answers to the thing it claims to measure', () => {
  const base = { pairs: 100, turns: 50, delegated: 0, notes: 50, entries: 200, pending: 0, memories: Array.from({ length: 20 }, (_, i) => note(i + 1)) };
  const value = (read, id) => read.signals.find((signal) => signal.id === id).value;

  // Rating replies raises judgement and nothing else.
  const judged = room({ ...base, good: 10 });
  assert.ok(value(judged, 'judgement') > value(room(base), 'judgement'));
  assert.equal(value(judged, 'weave'), value(room(base), 'weave'));

  // A corpus that is all recall questions teaches recitation, and balance says so.
  assert.equal(value(room({ ...base, notes: 100 }), 'balance'), 0);
  assert.equal(value(room({ ...base, notes: 50 }), 'balance'), 1, 'half recall pairs is healthy and should not be punished');

  // Memories nobody ever reached for do not count as coverage.
  const used = room({ ...base, memories: base.memories.map((n, i) => note(n.id, { recalled: i < 10 ? 3 : 0 })) });
  assert.equal(value(used, 'coverage'), 0.5);

  // A refuted memory is not counted among what the room stands on.
  const refuted = room({ ...base, memories: [note(1, { recalled: 1 }), note(2, { refutedBy: 9 }), { ...note(9), kind: 'aberration' }] });
  assert.equal(value(refuted, 'coverage'), 1, 'a refuted note or an aberration was counted as standing');

  // A backlog the archivist never clears is the room falling behind.
  assert.ok(value(room({ ...base, pending: 60 }), 'upkeep') < value(room(base), 'upkeep'));
});

test('maturity: the stages are ordered, and the weights are a whole', () => {
  const total = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `the readings add up to ${total}, so the score is not a share of anything`);
  // Every reading carries a weight, and every weight belongs to a reading.
  assert.deepEqual(Object.keys(WEIGHTS).sort(), room().signals.map((s) => s.id).sort());

  for (let i = 1; i < STAGES.length; i += 1) assert.ok(STAGES[i].at < STAGES[i - 1].at, 'the stages are not in order');
  assert.equal(stageOf(1).id, 'mature');
  assert.equal(stageOf(0).id, 'empty');
  assert.equal(stageOf(0.5).id, 'forming');
  // Every stage says what it means for what to do next, not only what it is called.
  for (const stage of STAGES) assert.ok(stage.says.length > 15, `${stage.id} says nothing`);
});
