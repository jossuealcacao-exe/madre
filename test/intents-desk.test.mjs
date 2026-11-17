import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IntentsDesk, usageOf } from '../src/modules/intents-desk.mjs';
import intents, { deskFor } from '../src/modules/intents.mjs';
import { QUICK_CASES } from '../src/modules/intents-calibration.mjs';

// A conversation the way the room writes it, with questions of every kind a read-only turn answers.
function conversation({ perIntent = 3, extra = [] } = {}) {
  let sequence = 0;
  const events = [];
  const say = (payload, more = {}) => events.push({ type: 'message.created', sequence: ++sequence, payload, ...more });
  const kinds = [
    (i) => `¿Dónde está definido el puerto del servicio ${i}?`,
    (i) => `explica cómo funciona el módulo ${i} de la sala`,
    (i) => `revisa el cambio ${i} de src/room.mjs antes del commit`,
    (i) => `explica por qué falla la prueba ${i} de memoria`,
    (i) => `¿conviene usar SQLite o JSONL para el caso ${i}?`,
  ];
  for (let i = 0; i < perIntent; i += 1) {
    for (const make of kinds) {
      const id = `m${sequence + 1}`;
      say({ messageId: id, role: 'user', sender: 'you', target: 'claude', text: make(i), effort: 'high' });
      say({ messageId: `r${sequence + 1}`, parentMessageId: id, role: 'assistant', sender: 'claude', text: `Una respuesta completa a «${make(i)}», con detalle suficiente.` });
    }
  }
  for (const event of extra) events.push({ sequence: ++sequence, ...event });
  return events;
}

const RUNGS = ['low', 'medium', 'high', 'xhigh', 'max'];
// Claude answers worse below medium on everything; the quality and an end marker ride in the text.
function crew({ ready = true, judge = true } = {}) {
  const asked = [];
  const invokers = {
    claude: async ({ prompt, effort, lease, scopes }) => {
      asked.push({ prompt, effort, lease, scopes });
      const quality = RUNGS.indexOf(effort) >= 1 ? 3 : 1;
      return { text: `[q${quality}] answer to ${prompt}${' detail'.repeat(RUNGS.indexOf(effort))} [end]`, usage: { inputTokens: 1000, outputTokens: 100 * (RUNGS.indexOf(effort) + 1), source: 'claude-json' } };
    },
    // A judge that reads the quality and notices a cut answer: what a judge is supposed to do.
    ollama: async ({ prompt }) => {
      const part = (name) => prompt.split(`<${name}>\n`)[1]?.split(`\n</${name}>`)[0] ?? '';
      const score = (text) => (/\[end\]$/.test(text) ? Number(/\[q(\d)\]/.exec(text)?.[1] ?? 0) : 0);
      const [a, b] = [score(part('first')), score(part('second'))];
      return { text: a === b ? 'SAME' : a > b ? 'FIRST' : 'SECOND' };
    },
  };
  const agents = [
    { id: 'claude', label: 'Claude Code', adapter: 'claude', path: '/bin/claude', version: '2.0.1', detected: true, ready },
    { id: 'gemini', label: 'Gemini CLI', adapter: 'gemini', path: '/bin/gemini', version: '1.0.0', detected: true, ready: true },
    ...(judge ? [{ id: 'ollama', label: 'Ollama', adapter: 'ollama', path: null, version: null, detected: true, ready: true, local: true }] : []),
  ];
  return { asked, bench: () => ({ agents, invokers, busy: new Set(), benched: new Set() }) };
}

async function room(t, { events = conversation(), ...options } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pulse-intents-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const agents = crew(options);
  const desk = new IntentsDesk({ file: join(dir, 'intents.jsonl'), offersFile: join(dir, 'intents-offers.json'), events: async () => events, bench: agents.bench, projectRoot: dir });
  return { dir, desk, events, ...agents };
}

// The run answers in the background; this waits for the next pair to reach the table.
async function pairOnTable(desk) {
  for (let i = 0; i < 500; i += 1) {
    const view = await desk.view();
    if (view.pending) return view.pending;
    if (!view.running) return null;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('no pair reached the table');
}

test('intenciones desk: under the composer it only speaks when there is a reason, read from the conversation itself', async (t) => {
  const { desk } = await room(t);
  // A CLI without an effort: nothing to say.
  assert.equal(await desk.suggest({ text: 'explica por qué falla la prueba de memoria', agent: 'gemini' }), null);
  // A cheap-looking request on a high rung nobody measured: not advice, an invitation to measure,
  // aimed at the rung the rule names and at questions of the same kind first.
  const invite = await desk.suggest({ text: '¿Dónde está definido el puerto por defecto?', agent: 'claude', effort: 'high' });
  assert.deepEqual([invite.kind, invite.from, invite.effort, invite.intent, invite.questions, invite.ofKind], ['invite', 'high', 'low', 'lookup', 6, 3]);
  // A request a read-only test cannot measure is never an invitation.
  assert.equal(await desk.suggest({ text: 'implementa el selector de esfuerzo en el compositor', agent: 'claude', effort: 'max' }), null);
  // An offer says which kind it is.
  assert.equal((await desk.suggest({ text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low' })).kind, 'offer');
  // A hunt run on the lightest rung: worth a word.
  const raise = await desk.suggest({ text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low' });
  assert.deepEqual([raise.effort, raise.direction, raise.basis], ['high', 'raise', 'rule']);

  // The last answer in this conversation was judged bad: the same kind of request asks for more.
  const rated = conversation({ perIntent: 1, extra: [
    { type: 'message.created', payload: { messageId: 'u9', role: 'user', sender: 'you', target: 'claude', text: 'explica cómo funciona el destilador' } },
    { type: 'message.created', payload: { messageId: 'a9', parentMessageId: 'u9', role: 'assistant', sender: 'claude', text: 'Así…' } },
    { type: 'message.rated', payload: { messageId: 'a9', rating: 'bad', by: 'you' } },
  ] });
  const again = await (await room(t, { events: rated })).desk.suggest({ text: 'explica cómo funciona el destilador', agent: 'claude', effort: 'medium' });
  assert.deepEqual([again.effort, again.signals], ['high', ['retry']]);

  // The provider says the window is nearly gone: a hunt is held at the middle rung.
  const tight = conversation({ perIntent: 1, extra: [{ type: 'quota.updated', payload: { agent: 'claude', usedPercent: 95, resetAt: null, official: true } }] });
  const capped = await (await room(t, { events: tight })).desk.suggest({ text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low' });
  assert.deepEqual([capped.effort, capped.signals], ['medium', ['quota']]);
  assert.deepEqual(usageOf(tight, 'claude'), { usedPercent: 95, resetAt: null });
  assert.equal(usageOf(tight, 'codex'), null);
});

test('intenciones desk: what was measured on this project turns into an offer to go cheaper', async (t) => {
  const { dir, desk } = await room(t);
  const records = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].flatMap((caseId) => ['medium', 'low'].map((effort) => ({ agent: 'claude', model: null, version: '2.0.1', intent: 'lookup', reference: 'high', caseId, effort, verdict: 'same', judge: 'you', tokens: { effort: effort === 'low' ? 900 : 1500, reference: 3000 } })));
  await writeFile(join(dir, 'intents.jsonl'), `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  const said = await desk.suggest({ text: '¿Dónde está definido el puerto por defecto?', agent: 'claude', effort: 'high' });
  assert.deepEqual([said.effort, said.direction, said.basis, said.saving], ['low', 'lower', 'measured', 0.7]);
  // Measured under another version of the CLI, it is not offered: it is asked again.
  const stale = await room(t);
  await writeFile(join(stale.dir, 'intents.jsonl'), `${records.map((record) => JSON.stringify({ ...record, version: '1.9.0' })).join('\n')}\n`);
  assert.equal((await stale.desk.suggest({ text: '¿Dónde está definido el puerto por defecto?', agent: 'claude', effort: 'high' })).kind, 'invite');
  // Measured under this one, but not for this kind of request: the card is where to measure more.
  assert.equal(await desk.suggest({ text: 'explica cómo funciona el módulo 1 de la sala', agent: 'claude', effort: 'high' }), null);
});

test('intenciones desk: the quick test puts real questions to both rungs and waits for the human on each pair', async (t) => {
  const { dir, desk, asked } = await room(t);
  const started = await desk.start({ kind: 'quick', agent: 'claude' });
  assert.deepEqual([started.started, started.reference, started.estimate], ['quick', 'high', QUICK_CASES * 2]);
  assert.match((await desk.start({ kind: 'quick', agent: 'claude' })).error, /already running/);

  for (let step = 1; step <= QUICK_CASES; step += 1) {
    const pair = await pairOnTable(desk);
    assert.equal(pair.step, step);
    assert.equal(pair.total, QUICK_CASES);
    assert.ok(pair.question && pair.first && pair.second);
    // Nothing on the table says which rung wrote which.
    assert.deepEqual(Object.keys(pair).sort(), ['first', 'intent', 'question', 'second', 'step', 'total']);
    assert.ok(desk.answer('same').ok);
  }
  await desk.settled();
  assert.equal(desk.answer('same').error !== undefined, true, 'nothing is waiting once the test is over');

  // Twelve turns, read-only: no lease, no web, no images. Half at the usual rung, half one down.
  assert.equal(asked.length, QUICK_CASES * 2);
  assert.ok(asked.every((call) => call.lease === null && call.scopes.web === false && call.scopes.imageGen === false));
  assert.deepEqual(new Set(asked.map((call) => call.effort)), new Set(['high', 'medium']));

  const kept = (await readFile(join(dir, 'intents.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(kept.length, QUICK_CASES);
  assert.ok(kept.every((record) => record.judge === 'you' && record.verdict === 'same' && record.version === '2.0.1' && record.effort === 'medium'));

  const view = await desk.view();
  assert.equal(view.running, null);
  assert.deepEqual([view.last.kind, view.last.ended, view.last.compared, view.last.same], ['quick', 'done', QUICK_CASES, QUICK_CASES]);
  const claude = view.agents.find((agent) => agent.id === 'claude');
  assert.equal(claude.summary.totals.same, QUICK_CASES);
  assert.ok(claude.spent > 0);
  // Gemini takes no effort and is not on the card; the local judge is not an agent to calibrate.
  assert.deepEqual(view.agents.map((agent) => agent.id), ['claude']);
});

test('intenciones desk: a new conversation still has the whole project to ask', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'pulse-intents-project-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { bench } = crew();
  // The open conversation says nothing yet; the others said plenty.
  const desk = new IntentsDesk({ file: join(dir, 'intents.jsonl'), offersFile: join(dir, 'intents-offers.json'), events: async () => [], projectEvents: async () => conversation({ perIntent: 7 }), bench, projectRoot: dir });
  const invite = await desk.suggest({ text: 'explica cómo funciona el destilador', agent: 'claude', effort: 'max' });
  assert.deepEqual([invite.kind, invite.questions, invite.ofKind], ['invite', QUICK_CASES, QUICK_CASES]);
  const claude = (await desk.view()).agents.find((agent) => agent.id === 'claude');
  assert.equal(claude.cases.explain, 7);
  assert.equal(claude.reference, 'high', 'the usual rung is read from the whole project too');
});

test('intenciones desk: the invitation starts a quick test aimed at the kind being written, and six of six settle it', async (t) => {
  const { desk, asked } = await room(t, { events: conversation({ perIntent: 7 }) });
  const invite = await desk.suggest({ text: 'explica cómo funciona el destilador', agent: 'claude', effort: 'max' });
  assert.deepEqual([invite.kind, invite.from, invite.effort, invite.ofKind], ['invite', 'max', 'medium', 6]);
  const started = await desk.start({ kind: 'quick', agent: 'claude', reference: invite.from, effort: invite.effort, intent: invite.intent });
  assert.equal(started.reference, 'max');
  for (let step = 0; step < QUICK_CASES; step += 1) {
    const pair = await pairOnTable(desk);
    assert.equal(pair.intent, 'explain', 'the aimed test asked another kind of question');
    desk.answer('same');
  }
  await desk.settled();
  assert.deepEqual(new Set(asked.map((call) => call.effort)), new Set(['max', 'medium']));
  const { last } = await desk.view();
  assert.deepEqual([last.intent, last.effort, last.settled], ['explain', 'medium', 'medium']);
  // From now on the composer offers it, measured.
  const offer = await desk.suggest({ text: 'explica cómo funciona el destilador', agent: 'claude', effort: 'max' });
  assert.deepEqual([offer.kind, offer.effort, offer.basis, offer.measured.n], ['offer', 'medium', 'measured', 6]);
  // A rung that is not below the reference, or a kind the test cannot read, is ignored, not obeyed.
  // Here the reference is the bottom rung and the "aim" is above it: there is nothing below to try.
  const odd = await (await room(t)).desk.start({ kind: 'quick', agent: 'claude', reference: 'low', effort: 'max', intent: 'implement' });
  assert.match(odd.error, /Nothing left to ask/);
});

test('intenciones desk: the full test is judged by an agent that is not the one measured, and checked first', async (t) => {
  const { desk, asked } = await room(t, { events: conversation({ perIntent: 8 }) });
  const started = await desk.start({ kind: 'full', agent: 'claude' });
  assert.equal(started.started, 'full');
  await desk.settled();
  const view = await desk.view();
  assert.ok(['done', 'budget'].includes(view.last.ended), view.last.ended);
  assert.equal(view.last.judge.status, 'trusted');
  assert.ok(view.last.compared > 0);
  // Claude never judged its own answers: every call it took was a question, never a verdict.
  assert.ok(asked.every((call) => !call.prompt.includes('<first>')));
  const claude = view.agents.find((agent) => agent.id === 'claude');
  assert.ok(claude.summary.intents.some((row) => row.status === 'measured'));
});

test('intenciones desk: it refuses, with the reason, whatever it should not start', async (t) => {
  assert.match((await (await room(t)).desk.start({ kind: 'quick', agent: 'gemini' })).error, /no effort per message/);
  assert.match((await (await room(t, { ready: false })).desk.start({ kind: 'quick', agent: 'claude' })).error, /not ready/);
  assert.match((await (await room(t)).desk.start({ kind: 'weird', agent: 'claude' })).error, /No such test/);
  const full = conversation({ extra: [{ type: 'quota.updated', payload: { agent: 'claude', usedPercent: 85 } }] });
  assert.match((await (await room(t, { events: full })).desk.start({ kind: 'quick', agent: 'claude' })).error, /usage limit for this period/);
  assert.match((await (await room(t, { judge: false })).desk.start({ kind: 'full', agent: 'claude' })).error, /impartial judge/);
  assert.match((await (await room(t, { events: [] })).desk.start({ kind: 'quick', agent: 'claude' })).error, /Nothing left to ask/);
});

test('intenciones desk: stop puts the pair on the table away unjudged and ends the run', async (t) => {
  const { desk } = await room(t);
  await desk.start({ kind: 'quick', agent: 'claude' });
  await pairOnTable(desk);
  assert.deepEqual(await desk.stop(), { stopping: true });
  const view = await desk.view();
  assert.equal(view.running, null);
  assert.equal(view.pending, null);
  assert.equal(view.last.ended, 'stopped');
  assert.deepEqual(await desk.stop(), { stopping: false });
});

test('intenciones desk: how often a suggestion is taken is counted per message and survives a restart', async (t) => {
  const { dir, desk, bench } = await room(t);
  await desk.offered({ accepted: true });
  assert.deepEqual(await desk.offered({}), { shown: 2, accepted: 1, tries: { shown: 0, accepted: 0 } });
  const again = new IntentsDesk({ file: join(dir, 'intents.jsonl'), offersFile: join(dir, 'intents-offers.json'), events: async () => [], bench, projectRoot: dir });
  assert.deepEqual((await again.view()).offers, { shown: 2, accepted: 1, tries: { shown: 0, accepted: 0 } });
});

test('intenciones module: its routes, its switch, and nothing from the request trusted as it came', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'pulse-intents-routes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { bench } = crew();
  const ctx = (enabled = true) => ({ projectRoot: dir, config: { modules: { intents: { enabled } } }, services: { intents: { roomDir: dir, events: async () => conversation(), bench } } });
  const route = (method, path) => intents.routes.find((one) => one.method === method && one.path === path).handler;

  assert.equal(intents.id, 'intents');
  assert.equal(deskFor(ctx()), deskFor(ctx()), 'one desk per room');
  assert.equal(deskFor({ services: {} }), null);

  const read = await route('GET', '/api/intents')(ctx(), { url: new URL('http://x/api/intents?models=%7B%22claude%22%3A%22opus%22%7D') });
  assert.equal(read.status, 200);
  assert.equal(read.body.enabled, true);
  assert.equal(read.body.agents[0].model, 'opus');
  const junk = await route('GET', '/api/intents')(ctx(), { url: new URL('http://x/api/intents?models=%7B%22claude%22%3A%22..%2F..%2Fetc%22%7D') });
  assert.equal(junk.body.agents[0].model, null, 'a model name that is not one is dropped');

  const raise = await route('POST', '/api/intents/suggest')(ctx(), { payload: { text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low', references: 'lots' } });
  assert.equal(raise.body.suggestion.effort, 'high');
  // Off is off: no suggestion, no test.
  assert.equal((await route('POST', '/api/intents/suggest')(ctx(false), { payload: { text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low' } })).body.suggestion, null);
  assert.equal((await route('POST', '/api/intents/calibrate')(ctx(false), { payload: { kind: 'quick', agent: 'claude' } })).status, 409);
  assert.equal((await route('POST', '/api/intents/answer')(ctx(), { payload: { choice: 'same' } })).status, 409);
  assert.deepEqual((await route('POST', '/api/intents/offer')(ctx(), { payload: { accepted: 'yes' } })).body.offers, { shown: 1, accepted: 0, tries: { shown: 0, accepted: 0 } });
});

test('intenciones over HTTP: the server hands the module its room, and the page can do everything through it', async (t) => {
  const { realpath } = await import('node:fs/promises');
  const { createPulseServer, projectRoomId } = await import('../src/server.mjs');
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pulse-intents-http-')));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }));
  const agents = [{ id: 'claude', label: 'Claude Code', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake/claude', version: 'test' }];
  const efforts = [];
  const invokers = { 'claude-readonly': async ({ prompt, effort }) => { efforts.push(effort ?? null); return { text: `Respuesta a: ${prompt.slice(-80)}`, usage: { inputTokens: 500, outputTokens: 50 } }; } };
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (response) => ({ status: response.status, body: await response.json() }));
  const read = () => fetch(`${base}/api/intents`).then((response) => response.json());
  const until = async (check) => { for (let i = 0; i < 400; i += 1) { const value = await check(); if (value) return value; await new Promise((resolve) => setTimeout(resolve, 5)); } throw new Error('never happened'); };

  // A conversation with something to ask: three real questions, answered.
  for (const text of ['explica cómo funciona el destilador de la sala', '¿dónde está definido el puerto por defecto del servidor?', 'revisa el cambio de src/room.mjs antes del commit']) {
    assert.equal((await post('/api/messages', { text, target: 'claude', effort: 'high' })).status, 202);
    await until(async () => (await store.readAll()).filter((event) => event.type === 'message.created' && event.payload.role === 'assistant').length >= efforts.length);
  }
  await until(async () => (await store.readAll()).filter((event) => event.type === 'message.created' && event.payload.role === 'assistant').length === 3);

  const card = await read();
  assert.equal(card.enabled, true);
  assert.deepEqual(card.agents.map((agent) => [agent.id, agent.reference]), [['claude', 'high']]);
  assert.equal(card.agents[0].estimate.quick, 6);

  const said = await post('/api/intents/suggest', { text: 'explica por qué falla la prueba de memoria', agent: 'claude', effort: 'low' });
  assert.deepEqual([said.body.suggestion.effort, said.body.suggestion.direction], ['high', 'raise']);

  const turnsBefore = efforts.length;
  assert.equal((await post('/api/intents/calibrate', { kind: 'quick', agent: 'claude' })).status, 202);
  for (let step = 0; step < 3; step += 1) {
    await until(async () => (await read()).pending);
    assert.equal((await post('/api/intents/answer', { choice: 'same' })).status, 200);
  }
  const done = await until(async () => { const view = await read(); return view.running ? null : view; });
  assert.deepEqual([done.last.ended, done.last.compared, done.last.same], ['done', 3, 3]);
  // Both rungs were asked of the CLI itself, and nothing about it reached the conversation.
  assert.deepEqual(new Set(efforts.slice(turnsBefore)), new Set(['high', 'medium']));
  assert.ok(!(await store.readAll()).some((event) => String(event.type).startsWith('intents')));
  const kept = await readFile(join(root, 'rooms', projectRoomId(root), 'intents.jsonl'), 'utf8');
  assert.equal(kept.trim().split('\n').length, 3);

  assert.deepEqual((await post('/api/intents/offer', { accepted: true })).body.offers, { shown: 1, accepted: 1, tries: { shown: 0, accepted: 0 } });
  // A try is an offer, and is also counted on its own; a message that only qualified counts none.
  assert.deepEqual((await post('/api/intents/offer', { accepted: true, kind: 'try', agent: 'claude', intent: 'lookup', effort: 'low', from: 'medium' })).body.offers, { shown: 2, accepted: 2, tries: { shown: 1, accepted: 1 } });
  assert.deepEqual((await post('/api/intents/offer', { shown: false, explore: { agent: 'claude', model: null, intent: 'lookup' } })).body.offers, { shown: 2, accepted: 2, tries: { shown: 1, accepted: 1 } });
});
