// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Reminders (0.1, 2026-10-20). An idea by Daniel Castillo.
//
// What a person says they still have to do gets lost in a conversation: «mañana reviso el PR»,
// «recuérdame llamar a Daniel el lunes», the same request made every morning. This hears the
// person's own messages and, when one holds something pending or something they keep doing, puts
// a card under it — «¿Te lo recuerdo?» with the time already chosen — so a reminder takes one press.
// Nothing is set without that press.
//
// Two ways to notice, the cheap one first:
//   · pending   words that mean «later» or «remember» (src/reminder-time.mjs reads the when);
//   · frequent  the same request on three different days: offered as a daily reminder.
// When the project has the local AI, @madre's model reads a candidate before it is offered: it
// drops what is not a task and writes the task short, in the person's language. Without it the
// person's own words are offered as they are. No provider's agent is asked: a reminder costs
// no tokens.
//
// Reminders are kept for the whole computer, in ~/.pulse/reminders.json, each with the project and
// the conversation it came from: when it is due, Home shows it in «Needs you», and the project it
// came from shows it the moment it opens. A repeating one, marked done, comes back at its next time.

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defineModule } from './sdk.mjs';
import { oneAtATime, writeWhole } from '../json-file.mjs';
import { ollamaGenerate } from '../ollama.mjs';
import { REPEATS, nextOccurrence, parseWhen, tomorrowMorning } from '../reminder-time.mjs';
import { language, t } from '../i18n.mjs';

export const REMINDERS_MAX = 500;
export const REMINDER_TEXT_MAX = 200;
const ID = /^[a-z0-9-]{6,64}$/i;
const remindersFile = (stateRoot) => join(stateRoot, 'reminders.json');
const habitsFile = (roomDir) => join(roomDir, 'reminder-habits.json');
const iso = (value) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null);
const fold = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function reminderOf(raw) {
  if (!raw || typeof raw !== 'object' || !ID.test(String(raw.id ?? '')) || !iso(raw.due)) return null;
  const text = String(raw.text ?? '').trim().slice(0, REMINDER_TEXT_MAX);
  if (!text) return null;
  return {
    id: raw.id,
    text,
    due: iso(raw.due),
    repeat: REPEATS.includes(raw.repeat) ? raw.repeat : null,
    room: typeof raw.room === 'string' && raw.room.length <= 200 ? raw.room : null,
    project: typeof raw.project === 'string' ? raw.project.slice(0, 120) : null,
    chat: typeof raw.chat === 'string' && raw.chat.length <= 120 ? raw.chat : null,
    why: ['pending', 'frequent', 'asked', 'manual'].includes(raw.why) ? raw.why : 'manual',
    done: iso(raw.done),
    at: iso(raw.at) ?? new Date(0).toISOString(),
  };
}
export async function readReminders(stateRoot) {
  if (!stateRoot) return [];
  const raw = await readFile(remindersFile(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  return (Array.isArray(raw?.reminders) ? raw.reminders : []).map(reminderOf).filter(Boolean).slice(0, REMINDERS_MAX);
}
const writeReminders = (stateRoot, reminders) => writeWhole(remindersFile(stateRoot), `${JSON.stringify({ reminders }, null, 2)}\n`);
const change = (stateRoot, work) => oneAtATime(remindersFile(stateRoot), async () => {
  const reminders = await readReminders(stateRoot);
  const answer = await work(reminders);
  if (answer?.write !== false) await writeReminders(stateRoot, reminders.filter((one) => !one.drop).map(({ drop, ...one }) => one));
  return answer;
});

export function addReminder(stateRoot, { text, due, repeat = null, room = null, project = null, chat = null, why = 'manual' }, now = new Date()) {
  const made = reminderOf({ id: randomUUID(), text, due, repeat, room, project, chat, why, at: new Date(now).toISOString() });
  if (!made) return Promise.resolve({ error: 'reminder' });
  return change(stateRoot, (reminders) => {
    // Done ones go first when the file is full: they are only history.
    const open = reminders.filter((one) => !one.done);
    if (open.length >= REMINDERS_MAX) return { error: 'full', write: false };
    if (reminders.length >= REMINDERS_MAX) reminders.splice(reminders.findIndex((one) => one.done), 1);
    reminders.push(made);
    return { reminder: made };
  });
}
// Done: a repeating one moves to its next time; any other is kept as done.
export function doneReminder(stateRoot, id, now = new Date()) {
  return change(stateRoot, (reminders) => {
    const one = reminders.find((item) => item.id === id);
    if (!one) return { error: 'unknown', write: false };
    if (one.repeat) one.due = nextOccurrence(one.due, one.repeat, now).toISOString();
    else one.done = new Date(now).toISOString();
    return { reminder: one };
  });
}
export function snoozeReminder(stateRoot, id, until) {
  return change(stateRoot, (reminders) => {
    const one = reminders.find((item) => item.id === id);
    if (!one || !iso(until)) return { error: 'unknown', write: false };
    one.due = iso(until);
    one.done = null;
    return { reminder: one };
  });
}
export function clearDone(stateRoot, room = null) {
  return change(stateRoot, (reminders) => {
    let cleared = 0;
    for (const one of reminders) if (one.done && (!room || one.room === room)) { one.drop = true; cleared += 1; }
    return { cleared };
  });
}
export function deleteReminder(stateRoot, id) {
  return change(stateRoot, (reminders) => {
    const one = reminders.find((item) => item.id === id);
    if (!one) return { error: 'unknown', write: false };
    one.drop = true;
    return { deleted: id };
  });
}

// PENDING: words that mean «later», «remember», «I still have to». Strong ones only: «luego» and
// «después» are how half the sentences of a conversation begin.
const PENDING = /\b(recuerd(a|ame|anos|ale)|recordarme|no (me )?(dejes|deje) olvidar|que no se me olvide|no olvides|no olvidar|pendiente|tengo que|tenemos que|manana|pasado manana|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|la proxima semana|mas tarde|esta tarde|esta noche|cada (dia|semana|lunes|martes|miercoles|jueves|viernes|manana)|todos los (dias|lunes|martes|miercoles|jueves|viernes)|remind me|don'?t (let me )?forget|to-?do|tomorrow|next week|later today|this afternoon|tonight|every (day|week|morning|monday|tuesday|wednesday|thursday|friday)|follow up|dar seguimiento)\b/;
// When it is due is the card's to say: «mañana a las 5», «el lunes», «tomorrow at 9am» at the head
// of the sentence are taken off what the reminder says.
const LEADING_WHEN = /^(?:(?:pasado\s+)?ma[nñ]ana|hoy|esta\s+(?:tarde|noche)|(?:el|este|el\s+pr[oó]ximo)\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|la\s+pr[oó]xima\s+semana|en\s+\d+\s+(?:minutos?|horas?|d[ií]as?)|tomorrow|today|tonight|next\s+week|(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+\d+\s+(?:minutes?|hours?|days?))?\s*(?:(?:a\s+las?|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|de\s+la\s+(?:ma[nñ]ana|tarde|noche))?)?\s*(?:,\s*)?(?:que\s+|to\s+)?/i;
// What a reminder says, from the message: the cue words taken off its head, the rest as it was.
export function taskFromWords(text) {
  const line = String(text ?? '').split('\n').map((one) => one.trim()).find(Boolean) ?? '';
  const bare = line
    .replace(/^(oye|hey|ok|vale|bueno|porfa|por favor|please)[,\s]+/i, '')
    .replace(/^(recu[eé]rd(ame|anos|ale|a)|remind me|no (me )?(dejes|deje) olvidar|no olvides|don'?t (let me )?forget)\s*(?:(?:que|de|to|that)\b)?\s*/i, '')
    .replace(LEADING_WHEN, '')
    .replace(LEADING_WHEN, '')
    .replace(/[.!?¿¡]+$/, '')
    .trim();
  return (bare.charAt(0).toUpperCase() + bare.slice(1)).slice(0, REMINDER_TEXT_MAX);
}
export function pendingIn(text) {
  const words = fold(text);
  if (words.length < 6 || words.length > 600 || !PENDING.test(words)) return null;
  const asked = /\b(recuerd(a|ame|anos|ale)|recordarme|remind me|no olvides|don'?t (let me )?forget|que no se me olvide)\b/.test(words);
  return { why: asked ? 'asked' : 'pending', text: taskFromWords(text) };
}

// FREQUENT: a request said again and again, read as its first content words.
const STOP = new Set('a al algo como con de del el en es esa ese eso esta este esto la las le lo los me mi mis no o para pero por que se si sin su sus te tu un una uno y ya yo the a an and to of in on for is it this that be with you me my please can could would por favor puedes podrias'.split(' '));
export function habitKey(text) {
  const words = fold(text).replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter((word) => word.length >= 3 && !STOP.has(word));
  if (words.length < 2 || words.length > 25) return null;
  return words.slice(0, 5).join(' ');
}
// Seen once more; frequent the third time on a different day. Kept per project, small.
export function noteHabit(roomDir, text, now = new Date()) {
  const key = habitKey(text);
  if (!key) return Promise.resolve(null);
  const file = habitsFile(roomDir);
  return oneAtATime(file, async () => {
    const raw = await readFile(file, 'utf8').then((body) => JSON.parse(body)).catch(() => ({}));
    const habits = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const day = new Date(now).toISOString().slice(0, 10);
    const seen = habits[key] && Array.isArray(habits[key].days) ? habits[key] : { days: [], offered: false };
    if (!seen.days.includes(day)) seen.days = [...seen.days, day].slice(-10);
    seen.sample = String(text).slice(0, REMINDER_TEXT_MAX);
    seen.hour = new Date(now).getHours();
    habits[key] = seen;
    // The newest two hundred, so the file stays small.
    const kept = Object.fromEntries(Object.entries(habits).sort((a, b) => String(b[1].days?.at(-1)).localeCompare(String(a[1].days?.at(-1)))).slice(0, 200));
    const frequent = seen.days.length >= 3 && !seen.offered;
    if (frequent) kept[key].offered = true;
    await writeWhole(file, `${JSON.stringify(kept)}\n`);
    return frequent ? { why: 'frequent', text: taskFromWords(text), hour: seen.hour } : null;
  });
}

// The local model's reading of a candidate: is it a task, and how would a reminder say it.
const LOCAL_SYSTEM = 'You read one message a person wrote to their AI agents about their project. Decide whether it holds something the PERSON must do or remember later: a pending task, a deadline, a follow-up, or something they asked to be reminded of. Questions, instructions for the agents to do now, and plans already done are not. Answer with JSON only: {"remind": true|false, "what": "the task as a short reminder, imperative, in the same language as the message, at most 80 characters", "when": "when it is due, in the words of the message, or empty"}.';
export async function readWithLocal({ host, model, text, fetchImpl = globalThis.fetch, timeoutMs = 45000 }) {
  try {
    const answer = await ollamaGenerate({ host, model, system: LOCAL_SYSTEM, prompt: String(text).slice(0, 2000), json: true, fetchImpl, timeoutMs, temperature: 0 });
    const parsed = JSON.parse(answer.text);
    if (typeof parsed?.remind !== 'boolean') return null;
    return { remind: parsed.remind, what: typeof parsed.what === 'string' ? parsed.what.trim().replace(/[.!¡]+$/, '').slice(0, REMINDER_TEXT_MAX) : '', when: typeof parsed.when === 'string' ? parsed.when.slice(0, 120) : '' };
  } catch { return null; }
}

// One offer per conversation every few minutes, unless the person asked for it in words.
const lastOffer = new Map();
const OFFER_GAP_MS = 10 * 60 * 1000;
export async function offerFor(ctx, event, { now = new Date(), fetchImpl = globalThis.fetch } = {}) {
  const said = event?.payload ?? {};
  if (event?.type !== 'message.created' || said.role !== 'user' || said.via || said.synthetic) return null;
  const text = String(said.text ?? '');
  if (!text.trim() || text.trim().startsWith('/')) return null;
  const prefs = ctx.settings ?? {};
  const dayHour = hourOf(prefs);
  let found = prefs.offer === false ? null : pendingIn(text);
  const habit = ctx.roomDir && prefs.habits !== false ? await noteHabit(ctx.roomDir, text, now).catch(() => null) : null;
  if (!found && habit) found = habit;
  if (!found) return null;
  const chatKey = `${ctx.roomId ?? 'home'}|${ctx.chat ?? ''}`;
  if (found.why !== 'asked' && Date.now() - (lastOffer.get(chatKey) ?? 0) < OFFER_GAP_MS) return null;
  // The local AI, when this project has it, reads it first and says it shorter.
  let what = found.text;
  let whenWords = text;
  let by = 'words';
  const local = ctx.services?.ollama?.state?.() ?? null;
  const project = await Promise.resolve(ctx.services?.ollama?.project?.()).catch(() => null);
  const model = local?.madreModel ?? local?.chatModel ?? null;
  if (prefs.local !== false && local?.running && model && project?.on !== false && found.why !== 'frequent') {
    const read = await readWithLocal({ host: local.host, model, text, fetchImpl });
    if (read && !read.remind && found.why !== 'asked') return null;
    if (read?.what) { what = read.what; by = 'local'; }
    if (read?.when) whenWords = `${read.when} ${text}`;
  }
  if (!what) return null;
  const when = found.why === 'frequent'
    ? { due: nextOccurrence(new Date(new Date(now).setHours(found.hour ?? 9, 0, 0, 0)), 'daily', now), repeat: 'daily' }
    : parseWhen(whenWords, now, { hour: dayHour }) ?? { due: tomorrowMorning(now, dayHour), repeat: null };
  lastOffer.set(chatKey, Date.now());
  return { offer: randomUUID(), what, due: when.due.toISOString(), repeat: when.repeat ?? null, why: found.why, by, messageId: said.messageId ?? null };
}

const reply = (status, body) => ({ status, body });
// What the person set in Reminders' settings: the hour a day starts at, and how long «later» is.
export const HOURS = ['7', '8', '9', '10', '11', '12'];
export const SNOOZES = ['15', '30', '60', '180'];
const hourOf = (prefs) => (HOURS.includes(String(prefs?.hour)) ? Number(prefs.hour) : 9);
const snoozeOf = (prefs) => (SNOOZES.includes(String(prefs?.snooze)) ? Number(prefs.snooze) : 60);
const prefsOf = (ctx) => reminders.settingsFrom(ctx.config, ctx.roomId);
// A due time said as a person reads it, in the room's language.
export const whenWords = (due) => new Intl.DateTimeFormat(language() === 'en' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(due));
const projectOf = (ctx) => (ctx.roomId ? basename(ctx.projectRoot ?? '') || null : null);
// The quick times a card offers beside the one it chose, said as data the page puts in words.
export function quickTimes(now = new Date()) {
  const hour = new Date(now.getTime() + 3600000);
  const evening = new Date(now); evening.setHours(18, 0, 0, 0);
  const monday = parseWhen('el lunes', now).due;
  return [
    { id: 'hour', due: hour.toISOString(), repeat: null },
    ...(evening > new Date(now.getTime() + 30 * 60000) ? [{ id: 'evening', due: evening.toISOString(), repeat: null }] : []),
    { id: 'tomorrow', due: tomorrowMorning(now).toISOString(), repeat: null },
    { id: 'monday', due: monday.toISOString(), repeat: null },
  ];
}

const reminders = defineModule({
  id: 'reminders',
  name: 'Reminders',
  vendor: 'MADRE',
  version: '0.1.0',
  credit: 'Daniel Castillo',
  summary: 'Notices what you say you still have to do, or what you ask for every day, and offers to remind you with one press. Reminders show in Home and in the project they came from. Read on your computer, with the local AI when you have it; no agent is asked.',
  creates: ['nothing in the project', 'a reminders.json file in ~/.pulse, one for the whole computer'],
  settings: { enabled: false, offer: true, habits: true, local: true, hour: '9', snooze: '60' },
  controls: [
    { key: 'offer', type: 'switch', label: 'Offer a reminder when you write something pending', note: 'A card under your message, with the time already chosen. Nothing is set without your click.' },
    { key: 'habits', type: 'switch', label: 'Notice what you ask for often', note: 'The same request on three different days is offered as a daily reminder.' },
    { key: 'local', type: 'switch', label: 'Let the local AI read it first', note: 'When the project has it, it drops what is not a task and says it shorter. Without it, your own words are offered.' },
    { key: 'hour', type: 'select', label: 'Hour when you do not say one', options: HOURS, choices: HOURS.map((hour) => ({ value: hour, label: `${hour}:00` })), note: '«Tomorrow» with no hour is tomorrow at this hour.' },
    { key: 'snooze', type: 'select', label: 'Put off by', options: SNOOZES, choices: [{ value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: '180', label: '3 hours' }], note: 'What the «later» key on a reminder that is due waits.' },
  ],
  async status(ctx) {
    const enabled = Boolean(ctx.settings.enabled);
    const list = (await readReminders(ctx.stateRoot)).filter((one) => !one.done && (!ctx.roomId || one.room === ctx.roomId));
    return {
      status: { installed: enabled, detail: enabled ? t('{n} reminders ahead', { n: list.length }) : t('off') },
      install: { display: enabled ? 'turn off Reminders' : 'turn on Reminders', platforms: [] },
    };
  },
  async onEvent(ctx, event) {
    const offer = await offerFor(ctx, event);
    if (offer) await ctx.record('reminder.offered', offer);
  },
  slash: [{
    name: 'remind', usage: '/remind <what and when>', title: 'Reminders',
    summary: 'Sets a reminder in your own words: «/remind tomorrow at 5 call Daniel».',
    async execute(ctx, args) {
      const words = (Array.isArray(args) ? args.join(' ') : String(args ?? '')).trim();
      if (!words) return { ok: false, title: 'Reminders', text: t('Write what and when after /remind.') };
      const dayHour = hourOf(ctx.settings);
      const when = parseWhen(words, new Date(), { hour: dayHour }) ?? { due: tomorrowMorning(new Date(), dayHour), repeat: null };
      const made = await addReminder(ctx.stateRoot, { text: taskFromWords(words), due: when.due.toISOString(), repeat: when.repeat, room: ctx.roomId ?? null, project: projectOf(ctx), why: 'asked' });
      if (made.error) return { ok: false, title: 'Reminders', text: t('The reminder was not set.') };
      return { ok: true, title: 'Reminders', text: t('Reminder set: «{what}», {when}', { what: made.reminder.text, when: whenWords(made.reminder.due) }) };
    },
  }],
  routes: [
    // This project's reminders, or every one in Home; the due ones first.
    { method: 'GET', path: '/api/reminders', handler: async (ctx, { url }) => {
      const all = !ctx.roomId || url?.searchParams?.get('all') === '1';
      const mine = (await readReminders(ctx.stateRoot)).filter((one) => all || one.room === ctx.roomId);
      const list = mine.filter((one) => !one.done).sort((a, b) => a.due.localeCompare(b.due));
      // The done ones, newest first, only when asked: the sheet's history.
      const done = url?.searchParams?.get('done') === '1' ? mine.filter((one) => one.done).sort((a, b) => b.done.localeCompare(a.done)).slice(0, 20) : undefined;
      const prefs = prefsOf(ctx);
      return reply(200, { reminders: list, done, room: ctx.roomId ?? null, now: new Date().toISOString(), times: quickTimes(), prefs: { hour: hourOf(prefs), snooze: snoozeOf(prefs) } });
    } },
    { method: 'POST', path: '/api/reminders', handler: async (ctx, { payload }) => {
      const text = String(payload?.text ?? '').trim();
      if (!text) return reply(400, { error: t('Write what to remember.') });
      const dayHour = hourOf(prefsOf(ctx));
      const when = iso(payload?.due) ? { due: new Date(payload.due), repeat: REPEATS.includes(payload?.repeat) ? payload.repeat : null } : parseWhen(`${payload?.when ?? ''} ${text}`, new Date(), { hour: dayHour }) ?? { due: tomorrowMorning(new Date(), dayHour), repeat: null };
      const made = await addReminder(ctx.stateRoot, { text: taskFromWords(text), due: when.due.toISOString(), repeat: when.repeat, room: ctx.roomId ?? null, project: projectOf(ctx), why: 'manual' });
      return made.error ? reply(409, { error: t('The reminder was not set.') }) : reply(200, made);
    } },
    // The answer to a card: yes with the time it offered or one of the quick ones, or no.
    { method: 'POST', path: '/api/reminders/answer', handler: async (ctx, { payload }) => {
      const offer = String(payload?.offer ?? '');
      if (!ID.test(offer)) return reply(400, { error: t('That offer is not known.') });
      const chat = typeof payload?.chat === 'string' ? payload.chat : null;
      let made = null;
      if (payload?.accept === true) {
        const due = iso(payload?.due);
        if (!due) return reply(400, { error: t('Say when.') });
        made = await addReminder(ctx.stateRoot, { text: String(payload?.text ?? ''), due, repeat: REPEATS.includes(payload?.repeat) ? payload.repeat : null, room: ctx.roomId ?? null, project: projectOf(ctx), chat, why: ['pending', 'frequent', 'asked'].includes(payload?.why) ? payload.why : 'pending' });
        if (made.error) return reply(409, { error: t('The reminder was not set.') });
      }
      const settled = { offer, accepted: Boolean(made), id: made?.reminder.id ?? null, due: made?.reminder.due ?? null, repeat: made?.reminder.repeat ?? null };
      await ctx.services.recordIn(chat, 'reminder.answered', settled).catch(() => null);
      return reply(200, { ...settled, reminder: made?.reminder ?? null });
    } },
    { method: 'POST', path: '/api/reminders/done', handler: async (ctx, { payload }) => {
      const done = await doneReminder(ctx.stateRoot, String(payload?.id ?? ''));
      return done.error ? reply(404, { error: t('That reminder is no longer here.') }) : reply(200, done);
    } },
    { method: 'POST', path: '/api/reminders/snooze', handler: async (ctx, { payload }) => {
      const minutes = Number(payload?.minutes);
      const until = iso(payload?.until) ?? (Number.isFinite(minutes) && minutes > 0 && minutes <= 60 * 24 * 30 ? new Date(Date.now() + minutes * 60000).toISOString() : null);
      if (!until) return reply(400, { error: t('Say when.') });
      const moved = await snoozeReminder(ctx.stateRoot, String(payload?.id ?? ''), until);
      return moved.error ? reply(404, { error: t('That reminder is no longer here.') }) : reply(200, moved);
    } },
    // The history emptied: the done ones of this project, or of every project in Home.
    { method: 'POST', path: '/api/reminders/clear-done', handler: async (ctx) => {
      const cleared = await clearDone(ctx.stateRoot, ctx.roomId ?? null);
      return reply(200, cleared);
    } },
    { method: 'POST', path: '/api/reminders/delete', handler: async (ctx, { payload }) => {
      const gone = await deleteReminder(ctx.stateRoot, String(payload?.id ?? ''));
      return gone.error ? reply(404, { error: t('That reminder is no longer here.') }) : reply(200, gone);
    } },
  ],
});
export default reminders;
