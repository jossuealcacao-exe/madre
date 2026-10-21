import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseWhen, nextOccurrence } from '../src/reminder-time.mjs';
import reminders, { addReminder, deleteReminder, doneReminder, habitKey, offerFor, pendingIn, readReminders, snoozeReminder, taskFromWords } from '../src/modules/reminders.mjs';

// A Tuesday morning.
const NOW = new Date('2026-10-20T10:30:00');
const hm = (date) => [date.getDate(), date.getHours(), date.getMinutes()];

test('reminders: the when is read from the person\'s own words, in Spanish and in English', () => {
  assert.deepEqual(hm(parseWhen('mañana a las 5', NOW).due), [21, 17, 0]);
  assert.deepEqual(hm(parseWhen('el lunes llamar a Daniel', NOW).due), [26, 9, 0]);
  assert.deepEqual(hm(parseWhen('en 2 horas', NOW).due), [20, 12, 30]);
  assert.deepEqual(hm(parseWhen('tomorrow at 9am', NOW).due), [21, 9, 0]);
  assert.deepEqual(hm(parseWhen('esta tarde', NOW).due), [20, 17, 0]);
  // «por la mañana» is the morning, not tomorrow-as-a-day: the next 9:00.
  assert.deepEqual(hm(parseWhen('revisarlo por la mañana', NOW).due), [21, 9, 0]);
  const daily = parseWhen('cada día a las 8:30', NOW);
  assert.equal(daily.repeat, 'daily');
  assert.deepEqual(hm(daily.due), [21, 8, 30]);
  assert.equal(parseWhen('todos los lunes', NOW).repeat, 'weekly');
  assert.equal(parseWhen('nada de tiempo aquí', NOW), null);
  // A repeating one done moves to its next time, never to one already past; weekdays skip the weekend.
  const friday = new Date('2026-10-23T09:00:00');
  assert.equal(nextOccurrence(friday, 'weekdays', friday).getDay(), 1);
});

test('reminders: pending words are noticed, the task is said without the cue, and short chatter is not', () => {
  assert.equal(pendingIn('Recuérdame mañana revisar el PR de Daniel').why, 'asked');
  assert.equal(taskFromWords('Recuérdame mañana revisar el PR de Daniel.'), 'Revisar el PR de Daniel');
  assert.equal(taskFromWords('mañana a las 10 subir la versión 1.0.5'), 'Subir la versión 1.0.5');
  assert.equal(taskFromWords('remind me tomorrow at 9am to call Daniel'), 'Call Daniel');
  assert.equal(taskFromWords('Revisar el PR mañana'), 'Revisar el PR mañana');
  assert.equal(pendingIn('tengo que subir la versión el viernes').why, 'pending');
  assert.equal(pendingIn('hola'), null);
  assert.equal(pendingIn('luego vemos cómo queda el diseño'), null);
  assert.equal(habitKey('corre las pruebas del proyecto por favor'), habitKey('Corre las pruebas del proyecto'));
});

test('reminders: an offer is one card, the local model may drop what is not a task, and a habit on three days is offered daily', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-reminders-'));
  const roomDir = await mkdtemp(join(tmpdir(), 'madre-reminders-room-'));
  const event = (text, id = 'm1') => ({ type: 'message.created', payload: { role: 'user', text, messageId: id } });
  const ctx = { stateRoot: state, roomDir, roomId: 'p-1', chat: 'c1', services: {} };
  const offer = await offerFor(ctx, event('recuérdame mañana a las 5 llamar a Daniel'), { now: NOW });
  assert.equal(offer.why, 'asked');
  assert.equal(offer.what, 'Llamar a Daniel');
  assert.deepEqual(hm(new Date(offer.due)), [21, 17, 0]);
  // An agent's message or a slash command is never read.
  assert.equal(await offerFor(ctx, { type: 'message.created', payload: { role: 'assistant', text: 'mañana lo reviso' } }, { now: NOW }), null);
  // With the local AI: what it says is not a task is not offered; what it is, it says shorter.
  const local = (answer) => ({ ...ctx, chat: `c-${Math.random()}`, services: { ollama: { state: () => ({ running: true, host: 'http://ollama', chatModel: 'qwen2.5:7b' }), project: async () => ({ on: true }) } } });
  const fetchSaying = (json) => async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify(json) } }) });
  assert.equal(await offerFor(local(), event('tengo que pensar mañana si me gusta este diseño'), { now: NOW, fetchImpl: fetchSaying({ remind: false, what: '', when: '' }) }), null);
  const said = await offerFor(local(), event('tengo que subir la versión el viernes sin falta'), { now: NOW, fetchImpl: fetchSaying({ remind: true, what: 'Subir la versión', when: 'el viernes' }) });
  assert.deepEqual([said.what, said.by, new Date(said.due).getDay()], ['Subir la versión', 'local', 5]);
  // The same request on three different days.
  const habit = { ...ctx, chat: 'c-habit' };
  for (const day of ['2026-10-18T08:10:00', '2026-10-19T08:20:00']) assert.equal(await offerFor(habit, event('corre las pruebas del proyecto'), { now: new Date(day) }), null);
  const daily = await offerFor(habit, event('corre las pruebas del proyecto'), { now: NOW });
  assert.deepEqual([daily.why, daily.repeat], ['frequent', 'daily']);
});

test('reminders: kept for the whole computer; done, moved and thrown away', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-reminders-'));
  const { reminder } = await addReminder(state, { text: 'Revisar el PR', due: NOW.toISOString(), room: 'p-1', project: 'tienda' }, NOW);
  const { reminder: daily } = await addReminder(state, { text: 'Correr las pruebas', due: NOW.toISOString(), repeat: 'daily', room: 'p-2' }, NOW);
  assert.equal((await readReminders(state)).length, 2);
  await doneReminder(state, reminder.id, NOW);
  await doneReminder(state, daily.id, NOW);
  const [first, second] = await readReminders(state);
  assert.ok(first.done);
  assert.equal(second.done, null);
  assert.ok(new Date(second.due) > NOW);
  await snoozeReminder(state, reminder.id, '2026-10-22T09:00:00.000Z');
  assert.equal((await readReminders(state))[0].done, null);
  await deleteReminder(state, reminder.id);
  assert.equal((await readReminders(state)).length, 1);
  assert.equal(reminders.version, '0.1.0');
  assert.equal(reminders.credit, 'Daniel Castillo');
});

test('reminders for agents: handed when a reminder is asked for; the agent sets it in the person\'s words', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-reminders-agent-'));
  const ctx = { stateRoot: state, roomId: 'p-1', projectRoot: '/x/tienda', config: { modules: { reminders: { enabled: true, hour: '8' } } } };
  assert.equal((await reminders.toolsForTurn(ctx, { text: '/recordatorios mañana revisar el banner' })).length, 1);
  assert.equal((await reminders.toolsForTurn(ctx, { text: 'recuérdame llamar a Daniel' })).length, 1);
  assert.deepEqual(await reminders.toolsForTurn(ctx, { text: 'corre las pruebas' }), []);
  const [server] = await reminders.toolsForTurn(ctx, { text: '/reminders call Daniel' });
  const { handleRequest } = await import('../src/mcp/notes-server.mjs');
  const made = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_reminder', arguments: { what: 'Llamar a Daniel', when: 'mañana' } } }, { env: server.env });
  assert.equal(made.result.isError, false);
  const [kept] = await readReminders(state);
  assert.deepEqual([kept.text, kept.room, kept.project, new Date(kept.due).getHours()], ['Llamar a Daniel', 'p-1', 'tienda', 8]);
});
