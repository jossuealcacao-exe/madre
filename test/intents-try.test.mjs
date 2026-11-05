import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IntentsDesk } from '../src/modules/intents-desk.mjs';
import { OBSERVED_MIN_TURNS } from '../src/modules/intents-policy.mjs';
import { tryCooldown, tryRung, TRY_COOLDOWN_MS, TRY_EVERY } from '../src/modules/intents-try.mjs';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const T0 = Date.parse('2026-10-01T10:00:00Z');

// A ledger the way the room writes it, with a clock: the human's message, the reply a minute later,
// and the human's word on it when there is one.
function ledger() {
  let sequence = 0;
  let id = 0;
  const events = [];
  const push = (type, payload, at) => events.push({ id: `e${sequence + 1}`, sequence: ++sequence, type, timestamp: new Date(at).toISOString(), payload });
  const turn = ({ text, agent = 'codex', effort = null, model = null, at, rating = null, mode = 1 }) => {
    const messageId = `m${++id}`;
    push('message.created', { messageId, mode, role: 'user', sender: 'you', target: agent, text, model, effort: effort ?? undefined, status: 'sent' }, at);
    const replyId = `r${id}`;
    push('message.created', { messageId: replyId, parentMessageId: messageId, role: 'assistant', sender: agent, target: 'you', text: `Respuesta a ${text}`, status: 'completed' }, at + MIN);
    push('usage.recorded', { agent, usage: { inputTokens: 1000, source: 'codex-json' }, budgetTokens: 1000, messageId, responseMessageId: replyId }, at + MIN);
    if (rating) push('message.rated', { messageId: replyId, rating, by: 'you' }, at + 2 * MIN);
    return messageId;
  };
  return { events, turn };
}

// One desk on a clock the test moves. Codex runs at MEDIO by default, and nothing was measured.
async function deskOn(t, { events = [], records = [] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pulse-try-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  if (records.length) await writeFile(join(dir, 'intents.jsonl'), `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  const clock = { now: T0 + 30 * DAY };
  const agents = [{ id: 'codex', label: 'Codex', adapter: 'codex', path: '/bin/codex', version: '0.50.0', detected: true, ready: true }];
  const desk = new IntentsDesk({
    file: join(dir, 'intents.jsonl'), offersFile: join(dir, 'intents-offers.json'),
    events: async () => events, defaults: async () => ({ codex: 'medium' }),
    bench: () => ({ agents, invokers: {}, busy: new Set(), benched: new Set() }), projectRoot: dir,
    clock: () => clock.now,
  });
  // The desk keeps its reading of the ledger a few seconds; the test steps past that between asks.
  const tick = (ms = 30 * 1000) => { clock.now += ms; };
  return { desk, clock, tick };
}

const LOOKUP = '¿dónde está definido el puerto por defecto del servidor?';
const asked = (more = {}) => ({ text: LOOKUP, agent: 'codex', effort: null, defaultEffort: 'medium', mode: 1, ...more });

test('intenciones · probar: which rung a try runs at, by the rung the message would run at', () => {
  // One rung below the rung it would run at, and only where the rule points there.
  assert.equal(tryRung({ agent: 'codex', intent: 'lookup', from: 'medium', rule: 'low' }), 'low');
  assert.equal(tryRung({ agent: 'codex', intent: 'explain', from: 'medium', rule: 'medium' }), null);
  assert.equal(tryRung({ agent: 'codex', intent: 'explain', from: 'high', rule: 'medium' }), 'medium');
  assert.equal(tryRung({ agent: 'codex', intent: 'lookup', from: 'xhigh', rule: 'low' }), null, 'two rungs down is not a try');
  // Only the kinds that read.
  for (const intent of ['implement', 'diagnose', 'design', 'chat', 'archive']) assert.equal(tryRung({ agent: 'codex', intent, from: 'medium', rule: 'low' }), null, intent);
  // No rung known to start from: the lightest rung for lookups and explanations, nothing for a review…
  assert.equal(tryRung({ agent: 'claude', intent: 'lookup', from: null, rule: 'low' }), 'low');
  assert.equal(tryRung({ agent: 'claude', intent: 'explain', from: null, rule: 'medium' }), 'low');
  assert.equal(tryRung({ agent: 'claude', intent: 'review', from: null, rule: 'medium' }), null);
  // …unless real use showed the default held: then the rule's own rung, never the deep tier.
  assert.equal(tryRung({ agent: 'claude', intent: 'review', from: null, rule: 'medium', defaultHeld: true }), 'medium');
  assert.equal(tryRung({ agent: 'claude', intent: 'explain', from: null, rule: 'high', defaultHeld: true }), null);
  // A CLI without a ladder.
  assert.equal(tryRung({ agent: 'gemini', intent: 'lookup', from: null, rule: 'low' }), null);
});

test('intenciones · probar: a try is proposed only when every rule holds', async (t) => {
  const { desk } = await deskOn(t);
  const tried = await desk.consider(asked());
  assert.deepEqual(
    (({ kind, agent, model, intent, effort, from, observedAtLower, needs }) => ({ kind, agent, model, intent, effort, from, observedAtLower, needs }))(tried.suggestion),
    { kind: 'try', agent: 'codex', model: null, intent: 'lookup', effort: 'low', from: 'medium', observedAtLower: 0, needs: OBSERVED_MIN_TURNS },
  );
  assert.deepEqual(tried.explore, { agent: 'codex', model: null, intent: 'lookup', effort: 'low' });
  // The effort chosen in the composer counts as much as the CLI's default.
  assert.equal((await desk.suggest(asked({ effort: 'medium', defaultEffort: null }))).kind, 'try');

  // CONTROL, AIRLOCK, GHOST, or a mode nobody said: no try.
  for (const mode of [3, 4, 0, null]) {
    const said = await desk.consider(asked({ mode }));
    assert.notEqual(said.suggestion?.kind, 'try', `mode ${mode}`);
    assert.equal(said.explore, null, `mode ${mode}`);
  }
  // A hunt, a change or a design call is never tried cheaper.
  for (const text of ['explica por qué falla la prueba de memoria', 'implementa el selector de esfuerzo en el compositor', '¿conviene usar SQLite o JSONL para el archivo?']) {
    assert.notEqual((await desk.suggest(asked({ text })))?.kind, 'try', text);
  }
  // An explanation at MEDIO: the rule does not point lower, so there is nothing to try.
  assert.equal((await desk.consider(asked({ text: 'explica cómo funciona el destilador de memoria' }))).explore, null);
  // …but at ALTO it does: one rung down is MEDIO.
  assert.deepEqual((({ kind, effort, from }) => ({ kind, effort, from }))(await desk.suggest(asked({ text: 'explica cómo funciona el destilador de memoria', effort: 'high' }))), { kind: 'try', effort: 'medium', from: 'high' });
});

test('intenciones · probar: the window nearly gone, or the rung measured, wins over a try', async (t) => {
  const tight = await deskOn(t, { events: [{ type: 'quota.updated', sequence: 1, timestamp: new Date(T0).toISOString(), payload: { agent: 'codex', usedPercent: 96, resetAt: null } }] });
  const capped = await tight.desk.consider(asked());
  assert.notEqual(capped.suggestion?.kind, 'try');
  assert.equal(capped.explore, null);

  // The calibration measured LOW as enough for lookups: that is an offer, not a try.
  const records = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((caseId) => ({ agent: 'codex', model: null, version: '0.50.0', intent: 'lookup', reference: 'medium', caseId, effort: 'low', verdict: 'same', judge: 'you', tokens: { effort: 900, reference: 1500 } }));
  const measured = await deskOn(t, { records });
  const said = await measured.desk.suggest(asked());
  assert.deepEqual([said.kind, said.basis, said.effort], ['offer', 'measured', 'low']);
});

test('intenciones · probar: once real use has seen enough turns at the cheaper rung, it speaks instead', async (t) => {
  const { events, turn } = ledger();
  for (let i = 0; i < OBSERVED_MIN_TURNS - 1; i += 1) turn({ text: `¿dónde está el archivo de rutas número ${i}?`, effort: 'low', at: T0 + i * 30 * MIN });
  const few = await deskOn(t, { events });
  assert.deepEqual((({ kind, observedAtLower }) => ({ kind, observedAtLower }))(await few.desk.suggest(asked())), { kind: 'try', observedAtLower: OBSERVED_MIN_TURNS - 1 });
  const view = await few.desk.view({ efforts: { codex: 'medium' } });
  assert.deepEqual(view.agents[0].tries.find((one) => one.intent === 'lookup'), { intent: 'lookup', effort: 'low', n: 7, needs: 8, status: 'trying', cooldownUntil: null });

  turn({ text: '¿dónde está el archivo de rutas número ocho?', effort: 'low', at: T0 + 10 * 30 * MIN });
  const enough = await deskOn(t, { events });
  const said = await enough.desk.consider(asked());
  assert.deepEqual([said.suggestion.kind, said.suggestion.basis, said.suggestion.effort], ['offer', 'observed', 'low']);
  assert.equal(said.explore, null);
});

test('intenciones · probar: two shortfalls in the last three at the cheaper rung pause the tries for a week', async (t) => {
  const { events, turn } = ledger();
  turn({ text: '¿dónde está el archivo de rutas principal?', effort: 'low', at: T0, rating: 'bad' });
  turn({ text: '¿cuál es el puerto del servidor de pruebas?', effort: 'low', at: T0 + DAY, rating: 'good' });
  turn({ text: '¿dónde vive la configuración del archivista?', effort: 'low', at: T0 + 2 * DAY, rating: 'bad' });
  // Something else since, so the thread itself does not ask for more on the next message.
  turn({ text: 'agrega una prueba para el puerto del servidor', at: T0 + 2 * DAY + 30 * MIN });
  const { desk, clock, tick } = await deskOn(t, { events });
  clock.now = T0 + 3 * DAY;
  const until = T0 + 2 * DAY + TRY_COOLDOWN_MS;
  assert.equal(tryCooldown(await desk.observations(), { agent: 'codex', model: null, intent: 'lookup', effort: 'low' }), until);
  const paused = await desk.consider(asked());
  assert.notEqual(paused.suggestion?.kind, 'try');
  assert.equal(paused.explore, null);
  const row = (await desk.view({ efforts: { codex: 'medium' } })).agents[0].tries.find((one) => one.intent === 'lookup');
  assert.deepEqual([row.status, row.cooldownUntil], ['paused', new Date(until).toISOString()]);
  // Another kind of request is not paused by it.
  assert.equal((await desk.suggest(asked({ text: 'explica cómo funciona el destilador', effort: 'high' }))).kind, 'try');

  // A week after the latest shortfall, the tries come back.
  clock.now = until + MIN;
  tick();
  assert.equal((await desk.suggest(asked())).kind, 'try');

  // One shortfall out of the last three is not a pause.
  const once = ledger();
  once.turn({ text: '¿dónde está el archivo de rutas principal?', effort: 'low', at: T0, rating: 'bad' });
  once.turn({ text: '¿cuál es el puerto del servidor de pruebas?', effort: 'low', at: T0 + DAY, rating: 'good' });
  const calm = await deskOn(t, { events: once.events });
  assert.equal((await calm.desk.suggest(asked())).kind, 'try');
});

test('intenciones · probar: at most one try out of every three messages that qualify', async (t) => {
  const { desk } = await deskOn(t);
  const kinds = [];
  for (let i = 0; i < 7; i += 1) {
    const { suggestion, explore } = await desk.consider(asked({ text: `¿dónde está definido el puerto del servicio ${i}?` }));
    assert.ok(explore, 'every one of these messages qualifies');
    kinds.push(suggestion?.kind ?? null);
    // Keystrokes do not count: asking again about the same draft changes nothing.
    assert.equal((await desk.consider(asked({ text: `¿dónde está definido el puerto del servicio ${i}?` }))).suggestion?.kind ?? null, kinds.at(-1));
    // The message leaves: shown and declined when it was a try, only counted when it was not.
    await desk.offered({ shown: suggestion?.kind === 'try', kind: suggestion?.kind ?? null, accepted: false, explore });
  }
  assert.equal(TRY_EVERY, 3);
  assert.deepEqual(kinds.map((kind) => kind === 'try'), [true, false, false, true, false, false, true]);
  // Paced per agent, model and kind: an explanation at ALTO has its own count.
  assert.equal((await desk.suggest(asked({ text: 'explica cómo funciona el destilador', effort: 'high' }))).kind, 'try');
  assert.equal((await desk.suggest(asked({ text: '¿dónde está definido el puerto, otra vez?', model: 'gpt-5.6-luna' }))).kind, 'try');
});

test('intenciones · probar: a try that fell short brings the next message of its kind an offer to go back up, once', async (t) => {
  const { events, turn } = ledger();
  const { desk, clock, tick } = await deskOn(t, { events });
  const start = clock.now;
  const first = await desk.consider(asked());
  assert.equal(first.suggestion.kind, 'try');
  // Taken: the message leaves at LOW, and the reply is rated down.
  await desk.offered({ accepted: true, kind: 'try', agent: 'codex', model: null, intent: 'lookup', effort: 'low', from: 'medium', explore: first.explore });
  turn({ text: LOOKUP, effort: 'low', at: start + 2000 });
  // Before the human says anything, nothing to go back from.
  clock.now = start + 90 * 1000;
  assert.notEqual((await desk.suggest(asked({ text: '¿cuál es el puerto de pruebas?' })))?.basis, 'tried');
  events.push({ id: 'rated', sequence: events.length + 1, type: 'message.rated', timestamp: new Date(start + 2 * MIN).toISOString(), payload: { messageId: events.at(-2).payload.messageId, rating: 'bad', by: 'you' } });
  clock.now = start + 3 * MIN;
  tick();
  const back = await desk.suggest(asked({ text: '¿cuál es el puerto del servidor de pruebas?' }));
  assert.deepEqual(
    (({ kind, basis, effort, from, direction, tried }) => ({ kind, basis, effort, from, direction, tried }))(back),
    { kind: 'offer', basis: 'tried', effort: 'medium', from: 'medium', direction: 'raise', tried: { effort: 'low', why: 'rated' } },
  );
  // Another kind of request is not about that try.
  assert.notEqual((await desk.suggest(asked({ text: 'explica cómo funciona el destilador', effort: 'high' })))?.basis, 'tried');
  // Said once: the message it went out with puts it away.
  await desk.offered({ accepted: false, kind: 'offer', basis: 'tried', agent: 'codex', model: null, intent: 'lookup' });
  assert.notEqual((await desk.suggest(asked({ text: '¿cuál es el puerto del servidor de producción?' })))?.basis, 'tried');

  // A try that held is simply forgotten: nothing to go back from.
  const calm = ledger();
  const other = await deskOn(t, { events: calm.events });
  const at = other.clock.now;
  await other.desk.offered({ accepted: true, kind: 'try', agent: 'codex', model: null, intent: 'lookup', effort: 'low', from: 'medium' });
  calm.turn({ text: LOOKUP, effort: 'low', at: at + 2000, rating: 'good' });
  other.clock.now = at + 3 * MIN;
  other.tick();
  assert.notEqual((await other.desk.suggest(asked({ text: '¿cuál es el puerto del servidor de pruebas?' })))?.basis, 'tried');
});

test('intenciones · probar: with no rung known to go back to, the way back is to the CLI default (D-4)', async (t) => {
  // A try taken when neither the chip nor the CLI said a rung: the way back names none, and the
  // page says «back to the agent's default» (it broke on it in 1.1.2, intentReason; test/ui-smoke).
  const { events, turn } = ledger();
  const { desk, clock, tick } = await deskOn(t, { events });
  const start = clock.now;
  await desk.offered({ accepted: true, kind: 'try', agent: 'codex', model: null, intent: 'lookup', effort: 'low', from: null });
  turn({ text: LOOKUP, effort: 'low', at: start + 2000, rating: 'bad' });
  clock.now = start + 3 * MIN;
  tick();
  const next = await desk.suggest(asked({ text: '¿cuál es el puerto del servidor de pruebas?', defaultEffort: null }));
  assert.equal(next?.basis, 'tried');
  assert.equal(next.effort, null);
  assert.equal(next.tried.effort, 'low');
});
