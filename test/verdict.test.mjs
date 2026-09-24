import test from 'node:test';
import assert from 'node:assert/strict';
import { verdictFor, WHERE } from '../src/verdict.mjs';

const stage = { id: 'working', label: 'WORKING', says: 'it is coming along' };
const signals = (weakest = 'coverage', value = 0.2) => ({
  stage, weakest,
  signals: [
    { id: 'volume', label: 'HOW MUCH THERE IS', value: 0.9, detail: '270 pairs', next: 'use the room' },
    { id: weakest, label: 'HOW MUCH OF IT GETS USED', value, detail: '4 of 40 memories', next: 'ask the room about older decisions' },
  ],
});

test('verdict: something false outranks everything, whatever the scores say', () => {
  const v = verdictFor({
    maturity: signals(),
    exams: {
      consistency: { ran: true, open: 2, says: 'EYECAT is holding 2 contradictions nobody has settled.' },
      coverage: { ran: true, passed: false, says: 'coverage is thin' },
      match: { ran: true, passed: false, says: 'the local model is behind' },
    },
  });
  assert.match(v.next.text, /Settle the 2 contradiction/);
  assert.equal(v.next.where, WHERE.nostromo);
  assert.match(v.says, /holding 2 contradictions/);
});

test('verdict: what the archive cannot answer points at the questions the room already wrote', () => {
  const asked = verdictFor({
    maturity: signals(),
    exams: { consistency: { ran: true, open: 0 }, coverage: { ran: true, passed: false, says: '12 of 30 questions…' } },
    asks: 6,
  });
  assert.match(asked.next.text, /Answer the 6 questions/);
  assert.equal(asked.next.where, WHERE.ask);

  // With nothing written to ask, it says the one thing that does fill an archive.
  const quiet = verdictFor({
    maturity: signals(),
    exams: { consistency: { ran: true, open: 0 }, coverage: { ran: true, passed: false, says: '12 of 30…' } },
    asks: 0,
  });
  assert.match(quiet.next.text, /Keep working in the room/);
  assert.equal(quiet.next.where, WHERE.room);
});

test('verdict: with nothing wrong it quotes the thinnest reading rather than inventing advice', () => {
  const v = verdictFor({
    maturity: signals('coverage', 0.2),
    exams: { consistency: { ran: true, open: 0 }, coverage: { ran: true, passed: true, says: 'it answers' } },
  });
  assert.equal(v.next.text, 'ask the room about older decisions', 'the advice is not the one written where the reading is taken');
  assert.match(v.says, /how much of it gets used/);
});

test('verdict: when everything passes, the only honest thing left is the test nobody ran', () => {
  const maturity = signals('coverage', 0.9);
  const exams = { consistency: { ran: true, open: 0 }, coverage: { ran: true, passed: true, says: '26 of 30 questions had their answer in the archive.' } };
  const v = verdictFor({ maturity, exams });
  assert.match(v.next.text, /Run the third test/);
  assert.equal(v.next.where, WHERE.tests);

  // And once it has run and passed, the room says so plainly and points at what is left over.
  const done = verdictFor({ maturity, exams: { ...exams, match: { ran: true, passed: true, says: 'On 10 of 12 real questions the local model landed where the agent landed.' } }, cold: { count: 3 } });
  assert.match(done.says, /ready to be worked in with the local model/);
  assert.match(done.next.text, /3 memories have had every chance/);

  // A local model that is not there yet is told to wait, not to be trusted.
  const behind = verdictFor({ maturity, exams: { ...exams, match: { ran: true, passed: false, says: 'On 3 of 12…' } } });
  assert.match(behind.next.text, /does not land where the agents land yet/);
});

test('verdict: a room with nothing measured yet still answers', () => {
  const v = verdictFor({});
  assert.ok(v.next.text);
  assert.equal(v.headline, null);
});
