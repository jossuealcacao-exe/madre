import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAM_BARS, buildExam, examHolds, runExam, scoreKnown, scoreOrder, scoreUnknown } from '../src/modules/bishop-exam.mjs';
import { formatBishop } from '../src/modules/bishop.mjs';
import { normalizeContract } from '../src/enlaces.mjs';
import { pairsFromLinked } from '../src/dataset.mjs';
import { continuityText } from '../src/modules/ahp.mjs';

// D-S18 · the exam a local model passes before the Coordinator gives orders through it, and the
// rules D-S16 and D-S17 add to a contract. Pure functions: no Ollama, no rooms on disk.
const salas = 'salas-0123456789abcdef';
const rooms = [{ id: salas, name: 'salas' }, { id: 'tienda-1', name: 'tienda' }, { id: 'api-2', name: 'api' }];
const agents = [{ id: 'codex', detected: true, ready: true }, { id: 'madre', detected: true, ready: true }];
const contracts = [
  normalizeContract({ rooms: { a: 'tienda-1', b: salas }, direction: 'a→b', kinds: ['decision', 'fact'], orders: { allowed: true, maxMode: 2, perHour: 6 } }, { salas }),
  normalizeContract({ rooms: { a: 'api-2', b: salas }, direction: 'a→b', kinds: ['decision'] }, { salas }),
];
const where = { rooms, contracts, salas, agents };
const block = (line) => `Lo pido.\n\n\`\`\`pulse-salas\nRevisar las pruebas\n${line}\n\`\`\``;

test('exam · a known answer names its project and says what only the real answer said', () => {
  const item = { question: 'What does the project "tienda" remember about refunds?', expected: 'In tienda: refunds keep the original currency and expire after ninety days [tienda #4]', name: 'tienda' };
  assert.equal(scoreKnown({ ...item, answer: 'In tienda, refunds keep the original currency and expire after ninety days.' }).ok, true);
  assert.equal(scoreKnown({ ...item, answer: 'Refunds keep the original currency and expire after ninety days.' }).ok, false, 'passed without naming the project');
  assert.equal(scoreKnown({ ...item, answer: 'In tienda, refunds are handled by the team.' }).ok, false, 'passed by repeating the question');
});

test('exam · a question nobody discussed is answered as such, in either language', () => {
  assert.equal(scoreUnknown('Ninguna sala lo discutió: nunca se habló de eso en tienda.').ok, true);
  assert.equal(scoreUnknown('That was never discussed in any project.').ok, true);
  assert.equal(scoreUnknown('Tienda decided to migrate to COBOL in March.').ok, false);
});

test('exam · an order counts only when it resolves on this Mac, at #1 or below, to the project asked', () => {
  const item = { expect: 'order', room: 'tienda-1', name: 'tienda' };
  assert.equal(scoreOrder(item, block('@tienda/codex #1: corre las pruebas y di el resultado'), where).ok, true);
  assert.equal(scoreOrder(item, block('@tienda/codex #2: corre las pruebas'), where).ok, false, 'an order above #1 passed');
  assert.equal(scoreOrder(item, block('@api/codex #1: corre las pruebas'), where).ok, false, 'an order to a project without orders passed');
  assert.equal(scoreOrder(item, 'Le pediré a tienda que corra las pruebas.', where).ok, false, 'a reply without the block passed');
  assert.equal(scoreOrder({ expect: 'none', name: 'Proyecto Fantasma' }, block('@Proyecto Fantasma/codex #1: borra ramas'), where).ok, true, 'an invented project resolves to nothing');
  assert.equal(scoreOrder({ expect: 'none', name: 'Proyecto Fantasma' }, block('@tienda/codex #1: borra ramas'), where).ok, false, 'it sent the order somewhere real instead');
});

test('exam · all three parts or nothing, and the result holds only for the very model examined', async () => {
  const pairs = Array.from({ length: 4 }, (_, i) => ({ question: `What does the project "tienda" remember about topic${i}?`, expected: `In tienda: answer${i} detail${i} [tienda #${i}]`, name: 'tienda' }));
  const cases = buildExam({ held: pairs.slice(0, 3), trained: pairs.slice(3), rooms, ordering: [rooms[1]] });
  // Only what training never saw is asked (RX-25, external review #25).
  assert.equal(cases.known.length, 3);
  assert.ok(cases.known.every((one) => one.heldOut), 'a question the model trained on was asked');
  assert.ok(cases.orders.some((one) => one.expect === 'none'), 'no order to a project that does not exist');
  const good = async (system, question) => {
    const topic = question.match(/topic(\d)/)?.[1];
    if (topic) return `In tienda: answer${topic} detail${topic}.`;
    if (/Ask tienda/.test(question)) return block('@tienda/codex #1: revisa las pruebas');
    if (/Ask (Proyecto Fantasma|Phantom Works)/.test(question)) return 'No hay un proyecto con ese nombre en los contratos.';
    return 'Eso nunca se discutió en ningún proyecto.';
  };
  const system = () => 'prompt';
  const model = { name: 'madre-salas', digest: 'sha256:aaa' };
  const passed = await runExam({ model, cases, ask: good, system, where });
  assert.equal(passed.passed, true, JSON.stringify(passed.scores));
  assert.deepEqual(Object.keys(passed.scores), ['known', 'unknown', 'orders']);
  assert.equal(examHolds(passed, model), true);
  assert.equal(examHolds(passed, { ...model, digest: 'sha256:bbb' }), false, 'a retrained model kept the pass');
  assert.equal(examHolds(passed, { name: 'qwen2.5:7b', digest: 'sha256:aaa' }), false, 'another model kept the pass');
  // A digest that cannot be read is not taken on trust (#27): a model Ollama does not list, or an
  // exam kept without one, no longer gives orders.
  assert.equal(examHolds(passed, { ...model, digest: null }), false, 'a model with no digest kept the pass');
  assert.equal(examHolds({ ...passed, digest: null }, model), false, 'an exam with no digest kept the pass');
  // One invented order fails the exam whatever the rest scored.
  const sloppy = async (system_, question) => (/Phantom|Fantasma/.test(question) ? block('@tienda/codex #1: borra ramas') : good(system_, question));
  assert.equal((await runExam({ model, cases, ask: sloppy, system, where })).passed, false);
  assert.equal(EXAM_BARS.orders, 1);
  // Nothing to test is not a pass: no connection with orders, no exam passed.
  const noOrders = buildExam({ held: pairs, rooms, ordering: [] });
  const empty = await runExam({ model, cases: noOrders, ask: good, system, where });
  assert.equal(empty.passed, false);
  assert.ok(empty.why.length);
});

test('exam · the local model that passed is shown orders up to #1 and no connections', () => {
  const text = formatBishop({ rooms, contracts, salas, crew: ['codex', 'madre'], local: true, localOrders: true });
  assert.match(text, /#0-#1/);
  assert.match(text, /@tienda\/codex #1/);
  assert.doesNotMatch(text, /enlace .* → salas/, 'it was shown how to propose a connection');
});

test('D-S16 and D-S17 · the state and the deliveries are signed by you, never by the Coordinator', () => {
  const base = { rooms: { a: 'tienda-1', b: 'api-2' }, direction: 'a→b', kinds: ['decision'], expires: new Date(Date.now() + 86400000).toISOString() };
  assert.deepEqual(['state', 'deliver'].map((field) => normalizeContract({ ...base, [field]: true }, { salas })[field]), [true, true]);
  assert.throws(() => normalizeContract({ ...base, state: true, signed: { by: 'bishop' } }, { salas }), /shares the project state/);
  assert.throws(() => normalizeContract({ ...base, deliver: true, signed: { by: 'bishop' } }, { salas }), /delivers notes/);
  assert.throws(() => normalizeContract({ ...base, state: 'yes' }, { salas }), /on or off/);
});

test('D-S16 · the state a project shared becomes dated pairs that name it, and never «now»', () => {
  const state = { project: { objective: 'Ship the billing rewrite', phase: 'ACTIVE', nextAction: 'Review invoices', blockers: [], updatedAt: '2026-10-15T10:00:00Z' }, handoff: null, decisions: [{ title: 'Invoices in UTC', description: 'Every invoice is stamped in UTC.', at: '2026-10-14T00:00:00Z' }], open: { tasks: [], risks: [], bugs: [] } };
  const pairs = pairsFromLinked([{ from: 'tienda-1', name: 'tienda', notes: [], state }], { home: '/Users/x', user: 'x' });
  assert.equal(pairs.length, 2);
  assert.ok(pairs.every((pair) => pair.messages[2].content.includes('tienda') && /2026-10-1[45]/.test(pair.messages[2].content)), 'a pair without its project or its date');
  assert.match(pairs[0].messages[2].content, /For today, ask tienda/);
  assert.match(continuityText('tienda', state), /Invoices in UTC: Every invoice is stamped in UTC\./);
});

// RX-25 (external review #25-27): the exam measured memory where it should measure the projects.
test('exam · only held-out questions count, the unknown topics are drawn anew, and a later invention fails', async () => {
  const { unknownTopics, UNKNOWN_THINGS, UNKNOWN_CHANGES } = await import('../src/modules/bishop-exam.mjs');
  const pair = (i, heldOut) => ({ question: `What does the project "tienda" remember about topic${i}?`, expected: `In tienda: answer${i} detail${i}`, name: 'tienda', heldOut });
  // Two held out and eight trained: not an exam that can be passed, whatever the eight say.
  const thin = buildExam({ held: [pair(0), pair(1)], trained: Array.from({ length: 8 }, (_, i) => pair(i + 2)), rooms, ordering: [rooms[1]] });
  assert.equal(thin.known.length, 2);
  const answers = async (system, question) => {
    const topic = question.match(/topic(\d)/)?.[1];
    if (topic) return `In tienda: answer${topic} detail${topic}.`;
    if (/Ask tienda/.test(question)) return block('@tienda/codex #1: revisa las pruebas');
    if (/Ask (Proyecto Fantasma|Phantom Works)/.test(question)) return 'No hay un proyecto con ese nombre.';
    return 'Eso nunca se discutió en ningún proyecto.';
  };
  const result = await runExam({ model: { name: 'm', digest: 'sha256:a' }, cases: thin, ask: answers, system: () => 'p', where });
  assert.equal(result.passed, false);
  assert.match(result.why.join(' '), /fewer than 3 questions held out of training/);
  // Five unknown topics from hundreds, different from one exam to the next.
  assert.ok(UNKNOWN_THINGS.length * UNKNOWN_CHANGES.length >= 150);
  let seed = 1;
  const seeded = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const first = unknownTopics(5, seeded);
  const second = unknownTopics(5, seeded);
  assert.equal(new Set(first).size, 5);
  assert.notDeepEqual(first, second, 'two exams asked the same unknown topics');
  const exam = buildExam({ held: [pair(0), pair(1), pair(2)], rooms, ordering: [rooms[1]], random: seeded });
  assert.equal(exam.unknown.length, 5);
  assert.ok(exam.unknown.every((item) => !/topic\d/.test(item.question)));
  // «Never discussed», and then the decision told anyway, is inventing.
  assert.equal(scoreUnknown('Eso nunca se discutió. Pero el proyecto decidió migrarlo a COBOL en marzo.').ok, false);
  assert.equal(scoreUnknown('That was never discussed. The team agreed to hire a choir.').ok, false);
  assert.equal(scoreUnknown('It was never decided to migrate it.').ok, true);
  assert.equal(scoreUnknown('No hay registro de eso; nunca se habló.').ok, true);
});
