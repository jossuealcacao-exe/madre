import test from 'node:test';
import assert from 'node:assert/strict';
import { coldNotes, coldReading, COLD_CHANCES } from '../src/cold.mjs';

const day = (n) => new Date(Date.UTC(2026, 0, n)).toISOString();
const note = (id, extra = {}) => ({ id, kind: 'fact', text: `note ${id}`, created: day(1), recalled: 0, refutedBy: null, ...extra });
// Turns that reached into the archive, one a day from the second onward.
const turns = (n, from = 2) => Array.from({ length: n }, (_, i) => day(from + i));

test('cold: a memory nobody has needed is not cold until it has had its chances', () => {
  const notes = [note(1)];
  // Written on the first day, and the archive has been opened three times since. That is a new
  // memory, not a cold one, and calling it cold would be inviting the human to throw it away.
  assert.equal(coldNotes({ notes, batches: turns(3) }).size, 0);
  assert.equal(coldNotes({ notes, batches: turns(COLD_CHANCES - 1) }).size, 0);
  // Opened often enough, and never once was it the answer.
  const cold = coldNotes({ notes, batches: turns(COLD_CHANCES) });
  assert.deepEqual([...cold.keys()], [1]);
  assert.equal(cold.get(1).chances, COLD_CHANCES);
});

test('cold: what is used, what is woven, and what is false are never cold', () => {
  const batches = turns(40);
  // Reached for even once: the archive has an answer about it.
  assert.equal(coldNotes({ notes: [note(1, { recalled: 1 })], batches }).size, 0);
  // Sharing a subject with another memory: the cascade and the map can both reach it sideways,
  // so it is adrift in a way that forgetting is not the answer to.
  assert.equal(coldNotes({ notes: [note(1), note(2)], links: [{ a: 1, b: 2, weight: 0.7 }], batches }).size, 0);
  // An aberration is a record of something false; it is not supposed to be recalled at all.
  assert.equal(coldNotes({ notes: [note(1, { kind: 'aberration' })], batches }).size, 0);
  // And a note already taken out of circulation is answered by its refutation, not by this.
  assert.equal(coldNotes({ notes: [note(1, { refutedBy: 9 })], batches }).size, 0);
});

test('cold: chances are only counted from the day the room started keeping the trail', () => {
  const notes = [note(1, { created: day(1) })];
  const batches = turns(20, 30);   // every one of them long after the note was written
  assert.equal(coldNotes({ notes, batches }).size, 1, 'a note with twenty chances behind it is cold');
  // But if the trail itself only started yesterday, those turns were never written down and
  // cannot be held against the note: what the room does not know, it does not get to claim.
  assert.equal(coldNotes({ notes, batches, since: day(45) }).size, 0);
  assert.equal(coldNotes({ notes, batches: [...batches, ...turns(COLD_CHANCES, 46)], since: day(45) }).size, 1);
});

test('cold: the count is always a count of something', () => {
  const notes = [note(1), note(2, { recalled: 3 }), note(3, { kind: 'aberration' }), note(4, { refutedBy: 3 })];
  const cold = coldNotes({ notes, batches: turns(40) });
  const reading = coldReading(cold, notes);
  assert.equal(reading.count, 1);
  assert.equal(reading.standing, 2, 'an aberration and a refuted note are not part of the archive that stands');
  assert.equal(reading.share, 0.5);
  assert.deepEqual(coldReading(new Map(), []), { count: 0, standing: 0, share: 0 });
});
