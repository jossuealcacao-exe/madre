import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  foldObserved, lowestObservedSufficient, observable, observedSummary, observeTurns, similarity,
  NEAR_REPEAT, OBSERVE_WINDOW_MS, OBSERVED_HELD_BAR, OBSERVED_MIN_TURNS,
} from '../src/modules/intents-observe.mjs';
import { evidenceKey, foldEvidence, invitable, offerable, suggestEffort, wilsonLower, wilsonUpper } from '../src/modules/intents-policy.mjs';
import { IntentsDesk } from '../src/modules/intents-desk.mjs';
import { EFFORTS } from '../src/models.mjs';

const ladder = EFFORTS.claude;
const MIN = 60 * 1000;
const T0 = Date.parse('2026-10-01T10:00:00Z');
const NOW = T0 + 10 * 24 * 60 * MIN;

// A ledger the way the room writes it, with a clock: each turn is the human's message, the reply
// (or the failure) a minute later, its usage, and whatever the human did about it.
function ledger() {
  let sequence = 0;
  let id = 0;
  const events = [];
  const push = (type, payload, at, more = {}) => events.push({ id: `e${sequence + 1}`, sequence: ++sequence, type, timestamp: new Date(at).toISOString(), payload, ...more });
  const turn = ({ text, agent = 'claude', effort = null, model = null, at, tokens = 1000, rating = null, fail = null, stopped = false, reply = true, mode = 1, chat = undefined }) => {
    const messageId = `m${++id}`;
    const extra = chat ? { chat } : {};
    push('message.created', { messageId, mode, role: 'user', sender: 'you', target: agent, text, model, effort: effort ?? undefined, status: 'sent' }, at, extra);
    if (stopped) push('turn.stopped', { messageId, agent, reason: 'stopped by the human', by: 'you' }, at + 30000, extra);
    if (fail || stopped) {
      push('message.failed', { messageId, target: agent, error: fail ?? 'stopped by the human', ...(stopped ? { stopped: true } : {}) }, at + MIN, extra);
      return { messageId };
    }
    if (!reply) return { messageId };
    const replyId = `r${id}`;
    push('message.created', { messageId: replyId, parentMessageId: messageId, role: 'assistant', sender: agent, target: 'you', text: `Respuesta a ${text}`, status: 'completed', model, effort: effort ?? undefined }, at + MIN, extra);
    if (tokens !== null) push('usage.recorded', { agent, usage: { inputTokens: tokens, source: 'claude-json' }, budgetTokens: tokens, messageId, responseMessageId: replyId }, at + MIN, extra);
    if (rating) push('message.rated', { messageId: replyId, rating, by: 'you' }, at + 2 * MIN, extra);
    return { messageId, replyId };
  };
  return { events, turn };
}

const outcomes = (events, options = {}) => observeTurns(events, { now: NOW, ...options }).map((one) => [one.outcome, one.why]);

test('intenciones · uso real: each turn is held, fell short, or not known yet, read from what the human did next', () => {
  const { events, turn } = ledger();
  let at = T0;
  const next = (minutes = 3) => { at += minutes * MIN; return at; };
  turn({ text: 'explica cómo funciona el destilador de memoria', at: next() });              // 1 · moved on
  turn({ text: '¿dónde está definido el puerto por defecto?', at: next() });                  // 2 · quiet (nothing within 15 min)
  turn({ text: 'explica por qué falla la prueba de memoria', at: next(30), fail: 'The agent stopped answering after 180 s.' });  // 3 · failed
  turn({ text: 'revisa el cambio de src/room.mjs antes del commit', at: next(30), rating: 'bad' });   // 4 · rated down
  turn({ text: 'revisa el diseño de la sala nueva por favor', at: next(30), rating: 'good' });       // 5 · rated up, even with a repeat after
  turn({ text: 'revisa el diseño de la sala nueva por favor otra vez', at: next(2) });               // 6 · quiet
  turn({ text: 'arregla el error de la prueba de memoria que truena', at: next(30) });               // 7 · retry follows
  turn({ text: 'sigue sin funcionar', at: next(4) });                                               // 8 · quiet
  turn({ text: 'explica cómo funciona el archivista de la sala', at: next(30) });                    // 9 · near-repeat follows
  turn({ text: 'explica como funciona el archivista de esta sala', at: next(5) });                  // 10 · quiet
  turn({ text: 'revisa el cambio del archivo de rutas', effort: 'low', at: next(30) });              // 11 · re-sent higher
  turn({ text: 'revisa las pruebas nuevas del módulo', effort: 'high', at: next(3) });             // 12 · quiet
  turn({ text: 'explica cómo funciona la memoria vectorial', at: next(30), fail: 'Claude hit its usage limit; try again at 5pm.' });  // 13 · not the answer's
  turn({ text: 'explica cómo funciona el enrutador', at: next(30), stopped: true });                // 14 · stopped, nothing after
  turn({ text: 'explica cómo funciona el guardia de permisos', at: next(30), stopped: true });      // 15 · stopped, then asked again
  turn({ text: 'explica cómo funciona el guardia de permisos, completo', at: next(2) });           // 16 · quiet
  turn({ text: 'explica cómo funciona el auditor', at: next(30) });                                 // 17 · asked again, but 20 minutes later
  turn({ text: 'explica cómo funciona el auditor', at: next(21) });                                 // 18 · quiet

  assert.deepEqual(outcomes(events), [
    ['held', 'moved-on'], ['held', 'quiet'], ['fell-short', 'failed'], ['fell-short', 'rated'], ['held', 'rated'], ['held', 'quiet'],
    ['fell-short', 'retry'], ['held', 'quiet'], ['fell-short', 'repeat'], ['held', 'quiet'], ['fell-short', 'higher'], ['held', 'quiet'],
    ['unknown', 'not-the-answer'], ['unknown', 'stopped'], ['fell-short', 'stopped'], ['held', 'quiet'], ['held', 'quiet'], ['held', 'quiet'],
  ]);
});

test('intenciones · uso real: a failure that was the machine\'s, or a STOP said only in words, is not the rung\'s', () => {
  const { events, turn } = ledger();
  turn({ text: 'explica cómo funciona el destilador', agent: 'codex', at: T0, fail: 'Codex was interrupted because PULSE is shutting down.' });
  turn({ text: 'explica cómo funciona el archivista', agent: 'codex', at: T0 + 30 * MIN, fail: 'Codex exited with code 1.' });
  turn({ text: 'explica cómo funciona el enrutador', agent: 'codex', at: T0 + 60 * MIN, fail: 'Codex se interrumpió: detenido por el humano.' });
  turn({ text: 'explica cómo funciona el guardia', agent: 'codex', at: T0 + 90 * MIN, fail: 'Codex did not respond before the timeout (300s).' });
  assert.deepEqual(outcomes(events), [['unknown', 'not-the-answer'], ['unknown', 'not-the-answer'], ['unknown', 'stopped'], ['fell-short', 'failed']]);
});

test('intenciones · uso real: a STOP said in today\'s Spanish is still a stop, not a failure (2026-11-17)', () => {
  const { events, turn } = ledger();
  turn({ text: 'explica cómo funciona el enrutador', agent: 'codex', at: T0, fail: 'lo detuviste tú' });
  turn({ text: 'explica cómo funciona el guardia', agent: 'codex', at: T0 + 30 * MIN, fail: 'detenido por ti' });
  assert.deepEqual(outcomes(events).map(([, why]) => why), ['stopped', 'stopped']);
});

test('intenciones · uso real: a turn too recent to know, or still running, is not counted', () => {
  const { events, turn } = ledger();
  turn({ text: 'explica cómo funciona el destilador de memoria', at: NOW - 5 * MIN });
  turn({ text: 'explica cómo funciona la memoria vectorial', agent: 'codex', at: NOW - 3 * MIN, reply: false });
  const [recent, running] = observeTurns(events, { now: NOW });
  assert.equal(recent.outcome, 'unknown');
  assert.equal(recent.why, 'recent');
  assert.equal(recent.settles, NOW - 4 * MIN + OBSERVE_WINDOW_MS, 'it says when it will be old enough to decide');
  assert.deepEqual([running.outcome, running.why], ['unknown', 'in-flight']);
  // Fifteen minutes on, the same turn has said what it was going to say.
  assert.deepEqual(observeTurns(events, { now: NOW + 20 * MIN })[0].outcome, 'held');
  assert.equal(foldObserved(observeTurns(events, { now: NOW })).size, 0, 'an undecided turn was folded in');
});

test('intenciones · uso real: only turns to an agent with an effort, never a ghost, each conversation on its own', () => {
  const { events, turn } = ledger();
  turn({ text: 'explica cómo funciona el destilador', agent: 'gemini', at: T0 });
  turn({ text: '¿qué decidimos sobre el puerto?', agent: 'madre', at: T0 + MIN });
  turn({ text: 'explica cómo funciona el destilador de la sala', at: T0 + 2 * MIN, mode: 0 });
  turn({ text: 'explica cómo funciona el destilador de memoria', agent: 'codex', at: T0 + 30 * MIN, tokens: 2400 });
  turn({ text: 'explica cómo funciona el archivista de la sala', at: T0 + 60 * MIN, chat: 'a1b2c3d4' });
  turn({ text: 'explica cómo funciona el archivista de la sala', at: T0 + 62 * MIN, chat: 'e5f6a7b8' });
  // An event the room flagged as a ghost is skipped like a #0 message.
  events.push({ ...events.at(-1), ghost: true });

  const seen = observeTurns(events, { now: NOW, defaults: { codex: 'medium' } });
  assert.deepEqual(seen.map((one) => one.agent), ['codex', 'claude', 'claude']);
  const [codex, first, second] = seen;
  assert.equal(codex.effort, 'medium', 'a turn sent with no effort ran at the CLI default MADRE knows');
  assert.equal(codex.tokens, 2400);
  assert.equal(first.effort, 'default', "Claude never says its default, so the rung is «its default»");
  assert.equal(first.outcome, 'held', 'a repeat in another conversation is not a repeat');
  assert.equal(first.intent, 'explain');
  // A model's own default beats the CLI's.
  assert.equal(observeTurns(events, { now: NOW, defaults: { codex: { effort: 'medium', byModel: { 'gpt-5.5': 'high' } } } })[0].effort, 'medium');
});

test('intenciones · uso real: the reader keeps only what observing needs', () => {
  assert.equal(observable({ type: 'turn.cost', payload: {} }), null);
  assert.equal(observable({ type: 'message.created', payload: { role: 'assistant', sender: 'claude' } }), null, 'a reply with no question is not a turn');
  const reply = observable({ type: 'message.created', sequence: 4, timestamp: 'x', payload: { messageId: 'r1', parentMessageId: 'm1', role: 'assistant', sender: 'claude', text: 'x'.repeat(50000) } }, 'main');
  assert.deepEqual(reply, { type: 'message.created', sequence: 4, timestamp: 'x', chat: 'main', payload: { messageId: 'r1', parentMessageId: 'm1', role: 'assistant', sender: 'claude' } });
  const usage = observable({ type: 'usage.recorded', payload: { agent: 'codex', messageId: 'm1', usage: { inputTokens: 1000, cachedInputTokens: 800, outputTokens: 50, source: 'codex-json' } } });
  assert.equal(usage.payload.budgetTokens, 330, 'the tokens are the budget the room charges, cache weighed at a tenth');
});

test('intenciones · uso real: similarity is shared words over all words, and short messages never repeat', () => {
  assert.ok(similarity('explica cómo funciona el archivista de la sala', 'explica como funciona el archivista de esta sala') >= NEAR_REPEAT);
  assert.ok(similarity('explica cómo funciona el archivista', 'revisa las pruebas nuevas del módulo') < NEAR_REPEAT);
  assert.equal(similarity('sí, dale', 'sí, dale'), 0);
});

// Observations straight into the fold: n turns at a rung, `held` of them held, each at `tokens`.
const seen = (effort, n, held, { intent = 'explain', agent = 'claude', model = null, tokens = 1000 } = {}) => Array.from({ length: n }, (_, i) => ({
  agent, model, intent, effort, tokens, outcome: i < held ? 'held' : 'fell-short',
}));

test('intenciones · uso real: "enough" in real use is eight turns and a pessimistic three in four', () => {
  assert.equal(OBSERVED_MIN_TURNS, 8);
  assert.equal(OBSERVED_HELD_BAR, 0.75);
  const cell = (list) => foldObserved(list).get(evidenceKey('claude', null, 'explain'));

  assert.deepEqual(lowestObservedSufficient(cell(seen('low', 8, 8)), ladder), { effort: 'low', n: 8, held: 8, heldRate: 1 });
  assert.equal(lowestObservedSufficient(cell(seen('low', 7, 7)), ladder), null, 'seven turns are not a reading');
  assert.ok(wilsonLower(7, 8) < OBSERVED_HELD_BAR);
  assert.equal(lowestObservedSufficient(cell(seen('low', 8, 7)), ladder), null, 'one miss in eight is not three in four with confidence');
  // The lowest that passes, walking up.
  assert.equal(lowestObservedSufficient(cell([...seen('low', 10, 4), ...seen('medium', 12, 12), ...seen('high', 30, 30)]), ladder).effort, 'medium');

  // Held often enough by itself, and still clearly worse than the rung above it.
  const close = [...seen('low', 20, 18), ...seen('medium', 60, 60)];
  assert.ok(wilsonLower(18, 20) >= OBSERVED_HELD_BAR && wilsonLower(60, 60) > wilsonUpper(18, 20));
  assert.equal(lowestObservedSufficient(cell(close), ladder).effort, 'medium');
  // The rung above has too few turns to compare against: no comparison, the lower one stands.
  assert.equal(lowestObservedSufficient(cell([...seen('low', 20, 18), ...seen('medium', 5, 5)]), ladder).effort, 'low');
  // A turn sent with no effort to a CLI that never says its own is never the answer.
  assert.equal(lowestObservedSufficient(cell(seen('default', 30, 30)), ladder), null);

  const folded = cell([...seen('low', 3, 2, { tokens: 900 }), { agent: 'claude', model: null, intent: 'explain', effort: 'low', tokens: null, outcome: 'held' }, { agent: 'claude', model: null, intent: 'explain', effort: 'low', tokens: 100, outcome: 'unknown' }]);
  assert.deepEqual(folded.rungs.low, { n: 4, held: 3, short: 1, tokens: 900, priced: 3 });
});

test('intenciones · uso real: observed beats rule, measured beats observed, and it says what it saved', () => {
  const text = 'explica cómo funciona el destilador';
  const observed = foldObserved([...seen('low', 10, 10, { tokens: 1000 }), ...seen('high', 10, 10, { tokens: 4000 })]);

  const said = suggestEffort({ text, agent: 'claude', effort: 'high', observed });
  assert.equal(said.effort, 'low', 'the rule would have said medium');
  assert.equal(said.basis, 'observed');
  assert.deepEqual(said.observed, { n: 10, held: 10, heldRate: 1, rung: 'low' });
  assert.equal(said.saving, 0.75);
  assert.equal(said.direction, 'lower');
  assert.equal(offerable(said), true, 'a rung seen to hold is offered like a measured one');
  assert.equal(invitable(said), false);

  // The calibration says medium: it wins, and real use is not even read.
  const records = Array.from({ length: 6 }, (_, i) => ({ caseId: `c${i}`, agent: 'claude', model: null, intent: 'explain', effort: 'medium', reference: 'high', verdict: 'same' }));
  const both = suggestEffort({ text, agent: 'claude', effort: 'high', observed, evidence: foldEvidence(records) });
  assert.equal(both.basis, 'measured');
  assert.equal(both.effort, 'medium');
  assert.equal(both.observed, null);

  // Thin real use says nothing: the rule speaks, and a rule saying "less" is not offered.
  const thin = suggestEffort({ text, agent: 'claude', effort: 'high', observed: foldObserved(seen('low', 5, 5)) });
  assert.equal(thin.basis, 'rule');
  assert.equal(thin.effort, 'medium');
  assert.equal(offerable(thin), false);
  // Another model is another reading.
  assert.equal(suggestEffort({ text, agent: 'claude', model: 'opus', effort: 'high', observed }).basis, 'rule');

  // The turn's own context moves the rung off what was seen: then it is the rule talking.
  const deeper = suggestEffort({ text: 'explica a fondo cómo funciona el destilador', agent: 'claude', effort: 'high', observed });
  assert.equal(deeper.effort, 'medium');
  assert.equal(deeper.basis, 'rule');
});

test('intenciones · uso real: a raise needs the current rung seen to fall short; a rung nobody used is not one that failed', () => {
  const text = 'explica cómo funciona el destilador';
  const short = foldObserved([...seen('low', 10, 3), ...seen('high', 10, 10)]);
  const raise = suggestEffort({ text, agent: 'claude', effort: 'low', observed: short });
  assert.equal(raise.effort, 'high', 'the rule would have stopped at medium');
  assert.equal(raise.basis, 'observed');
  assert.equal(raise.direction, 'raise');
  assert.equal(raise.saving, null);

  const unused = suggestEffort({ text, agent: 'claude', effort: 'low', observed: foldObserved(seen('high', 10, 10)) });
  assert.equal(unused.basis, 'rule');
  assert.equal(unused.effort, 'medium');
});

test('intenciones · uso real: with no rung to start from, the turns sent with no effort are what it is compared with', () => {
  const text = 'explica cómo funciona el destilador';
  const cheaper = foldObserved([...seen('medium', 9, 9, { tokens: 1500 }), ...seen('default', 12, 12, { tokens: 6000 })]);
  const said = suggestEffort({ text, agent: 'claude', observed: cheaper });
  assert.equal(said.effort, 'medium');
  assert.equal(said.basis, 'observed');
  assert.equal(said.from, null);
  assert.equal(said.direction, null);
  assert.equal(said.saving, 0.75);
  assert.equal(offerable(said), true);

  // The default held just as well and costs less: naming a rung would only cost more.
  const dearer = foldObserved([...seen('medium', 9, 9, { tokens: 6000 }), ...seen('default', 12, 12, { tokens: 1500 })]);
  const rule = suggestEffort({ text, agent: 'claude', observed: dearer });
  assert.equal(rule.basis, 'rule', 'the default already does it');
  assert.equal(offerable(rule), false, 'nothing changed for a rule when the default is unknown');
});

test('intenciones · uso real: what the sheet reads, with the tokens a lower rung would have saved as an estimate', () => {
  const list = [
    ...seen('low', 8, 8, { tokens: 1000 }),
    ...seen('high', 4, 4, { tokens: 5000 }),
    ...seen('medium', 3, 1, { intent: 'diagnose' }),
    { agent: 'claude', model: null, intent: 'explain', effort: 'high', tokens: 9000, outcome: 'unknown' },
    ...seen('low', 9, 9, { model: 'opus' }),
  ];
  const summary = observedSummary(list, { agent: 'claude', model: null });
  assert.equal(summary.turns, 15);
  assert.equal(summary.held, 13);
  assert.equal(summary.short, 2);
  assert.equal(summary.pending, 1);
  assert.equal(summary.tokensSaved, 16000, 'four turns at HIGH, each 4,000 above the middle LOW turn');
  const explain = summary.byIntent.find((row) => row.intent === 'explain');
  assert.deepEqual(explain, { intent: 'explain', rung: 'low', n: 12, heldRate: 1, seen: { n: 8, held: 8 }, most: 8 });
  const diagnose = summary.byIntent.find((row) => row.intent === 'diagnose');
  assert.deepEqual([diagnose.rung, diagnose.n, diagnose.most], [null, 3, 3]);
  assert.deepEqual(summary.byIntent.map((row) => row.intent), ['lookup', 'explain', 'review', 'implement', 'diagnose', 'design', 'chat']);

  // Nothing settled with a price: nothing to estimate.
  assert.equal(observedSummary(seen('low', 5, 5), { agent: 'claude' }).tokensSaved, null);
});

test('intenciones · uso real: the desk learns from the ledger it already has, and offers what it saw', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'pulse-observe-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { events, turn } = ledger();
  // Ten explanations at LOW that the human moved on from, and four at HIGH that cost four times more.
  for (let i = 0; i < 10; i += 1) turn({ text: `explica cómo funciona el módulo ${i} de la sala`, effort: 'low', at: T0 + i * 30 * MIN, tokens: 1000 });
  for (let i = 0; i < 4; i += 1) turn({ text: `explica cómo funciona la pieza ${i} del núcleo`, effort: 'high', at: T0 + (20 + i) * 30 * MIN, tokens: 4000 });
  const agents = [{ id: 'claude', label: 'Claude Code', adapter: 'claude', path: '/bin/claude', version: '2.0.1', detected: true, ready: true }];
  let reads = 0;
  const desk = new IntentsDesk({
    file: join(dir, 'intents.jsonl'), offersFile: join(dir, 'intents-offers.json'),
    events: async () => { reads += 1; return events; },
    bench: () => ({ agents, invokers: {}, busy: new Set(), benched: new Set() }), projectRoot: dir,
  });

  const said = await desk.suggest({ text: 'explica cómo funciona el destilador', agent: 'claude', effort: 'high' });
  assert.equal(said.kind, 'offer');
  assert.equal(said.basis, 'observed');
  assert.equal(said.effort, 'low');
  assert.deepEqual(said.observed, { n: 10, held: 10, heldRate: 1, rung: 'low' });
  assert.equal(said.saving, 0.75);

  const view = await desk.view();
  const observed = view.agents[0].observed;
  assert.equal(observed.turns, 14);
  assert.equal(observed.held, 14);
  assert.equal(observed.tokensSaved, 12000);
  assert.equal(observed.byIntent.find((row) => row.intent === 'explain').rung, 'low');
  // Read once, kept in memory: the composer asks on every pause in the typing.
  const before = reads;
  await desk.observations();
  await desk.observations();
  assert.equal(reads, before, 'the ledger was read again for nothing');
});
