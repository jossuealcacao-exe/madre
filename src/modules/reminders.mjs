// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Reminders (0.1, 2026-10-20). An idea by Daniel Castillo.
//
// What a person says they still have to do gets lost in a conversation: «mañana reviso el PR»,
// «recuérdame llamar a Daniel el lunes», the same request made every morning. This hears the
// person's own messages and, when one holds something pending or something they keep doing, puts
// a card under it — «¿Te lo recuerdo?» with the time already chosen — so a reminder takes one press.
// Nothing is set without that press.
//
// Two ways to notice, the cheap one first:
//   · pending   words that mean «later» or «remember» (WHEN, below, reads the when);
//   · frequent  the same request on three different days: offered as a daily reminder.
// When the project has the local AI, @madre's model reads a candidate before it is offered: it
// drops what is not a task and writes the task short, in the person's language. Without it the
// person's own words are offered as they are. No provider's agent is asked: a reminder costs
// no tokens.
//
// Reminders are kept for the whole computer, in ~/.pulse/reminders.json, each with the project and
// the conversation it came from: when it is due, Home shows it in «Needs you», and the project it
// came from shows it the moment it opens. A repeating one, marked done, comes back at its next time.
//
// ONE FILE (SDK 2, 2026-10-25). Everything Reminders is lives here: reading the when, its files,
// the cards, and the tool server an agent uses. It imports nothing from MADRE — the room's words
// come through ctx.t and the local AI through ctx.services.ollama — so a newer Reminders can come
// from the Market, signed, without waiting for a new MADRE (src/builtin-updates.mjs). When an
// agent runs it with node, the same file is the tool server (at the bottom).

import { mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

// FILES THAT MORE THAN ONE THING CHANGES (the same rules as MADRE's src/json-file.mjs): written
// whole, through a draft renamed over the file, and one change at a time — in this process by a
// queue, and between the rooms of this computer and the tool server by a lock file beside it.
async function writeWhole(file, text, { mode } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const draft = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(draft, text, mode ? { mode } : undefined);
    await rename(draft, file);
  } catch (error) {
    await rm(draft, { force: true }).catch(() => {});
    throw error;
  }
}

const STALE_MS = 5000;
async function lockBeside(file) {
  const lock = `${file}.lock`;
  await mkdir(dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 250; attempt += 1) {
    try {
      await (await open(lock, 'wx')).close();
      return () => rm(lock, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const since = await stat(lock).catch(() => null);
      if (since && Date.now() - since.mtimeMs > STALE_MS) { await rm(lock, { force: true }); continue; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`${file} is being changed by another room; try again.`);
}

const queues = new Map();
function oneAtATime(file, work) {
  const run = async () => {
    const release = await lockBeside(file);
    try {
      return await work();
    } finally {
      await release();
    }
  };
  const before = queues.get(file) ?? Promise.resolve();
  const turn = before.then(run, run);
  const settled = turn.catch(() => {});
  queues.set(file, settled);
  void settled.then(() => { if (queues.get(file) === settled) queues.delete(file); });
  return turn;
}

// WHEN, read from a person's own words.
// When a reminder is due, read from a person's own words (Reminders, 2026-10-20).
//
// «mañana a las 5», «el lunes», «en 2 horas», «cada día», «tomorrow at 9am», «every monday»: what
// people write when they say when, in Spanish or in English. Read here, without a model, so the
// same words always give the same hour and a reminder never depends on a model being awake. What
// is not said is filled the way a person would: a day without an hour is at 9:00, an hour without
// a day is the next time that hour comes, and «a las 5» with nothing else is in the afternoon.


const fold = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const REPEATS = ['daily', 'weekdays', 'weekly'];
const DAYS = [
  ['domingo', 'sunday'], ['lunes', 'monday'], ['martes', 'tuesday'], ['miercoles', 'wednesday'],
  ['jueves', 'thursday'], ['viernes', 'friday'], ['sabado', 'saturday'],
];
const dayIndex = (word) => DAYS.findIndex((names) => names.includes(word));
const DAY_WORDS = DAYS.flat().join('|');
const NUMBERS = { un: 1, una: 1, uno: 1, a: 1, an: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5, diez: 10, ten: 10, quince: 15, fifteen: 15, veinte: 20, twenty: 20, treinta: 30, thirty: 30 };
const UNIT_MS = { min: 60000, hor: 3600000, hou: 3600000, dia: 86400000, day: 86400000, sem: 7 * 86400000, wee: 7 * 86400000 };
export const DEFAULT_HOUR = 9;

const at = (base, hour, minute = 0) => { const next = new Date(base); next.setHours(hour, minute, 0, 0); return next; };
const plusDays = (base, days) => { const next = new Date(base); next.setDate(next.getDate() + days); return next; };

// The hour said, if any: «a las 5», «a las 17:30», «at 9am», «5 pm», «10:15».
function hourSaid(text) {
  const match = text.match(/\b(?:a las|a la|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|de la manana|de la tarde|de la noche|hrs|h)?\b/)
    ?? text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/)
    ?? text.match(/\b(\d{1,2})()\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const tag = match[3] ?? '';
  if (hour > 23 || minute > 59) return null;
  if (/pm|p\.m\.|tarde|noche/.test(tag) && hour < 12) hour += 12;
  else if (/am|a\.m\.|manana/.test(tag) && hour === 12) hour = 0;
  // «a las 5» with nothing else: a person at work means the afternoon, not dawn.
  else if (!tag && hour >= 1 && hour <= 7) hour += 12;
  return { hour, minute };
}

// The part of the day said in words, when no hour was.
function partOfDay(text) {
  if (/\b(esta noche|en la noche|por la noche|tonight|in the evening)\b/.test(text)) return { hour: 20, minute: 0 };
  if (/\b(esta tarde|en la tarde|por la tarde|this afternoon|in the afternoon)\b/.test(text)) return { hour: 17, minute: 0 };
  if (/\b(en la manana|por la manana|in the morning)\b/.test(text)) return { hour: 9, minute: 0 };
  if (/\b(al mediodia|a mediodia|at noon|noon)\b/.test(text)) return { hour: 12, minute: 0 };
  return null;
}

// What repeats, and on which day for a weekly one.
function repeatOf(text) {
  const weekly = text.match(new RegExp(`\\b(?:cada|todos los|every)\\s+(${DAY_WORDS})s?\\b`));
  if (weekly) return { repeat: 'weekly', day: dayIndex(weekly[1]) };
  if (/\b(entre semana|de lunes a viernes|every weekday|weekdays)\b/.test(text)) return { repeat: 'weekdays' };
  if (/\b(cada dia|todos los dias|diario|diariamente|cada manana|todas las mananas|every day|everyday|daily|each day|every morning)\b/.test(text)) return { repeat: 'daily' };
  if (/\b(cada semana|semanal(mente)?|every week|weekly)\b/.test(text)) return { repeat: 'weekly' };
  return null;
}

// The next time a repeating reminder comes after `after`.
export function nextOccurrence(due, repeat, after = new Date()) {
  let next = new Date(due);
  if (!REPEATS.includes(repeat)) return next;
  const step = () => {
    if (repeat === 'weekly') next = plusDays(next, 7);
    else {
      next = plusDays(next, 1);
      if (repeat === 'weekdays') while (next.getDay() === 0 || next.getDay() === 6) next = plusDays(next, 1);
    }
  };
  for (let guard = 0; next <= after && guard < 4000; guard += 1) step();
  return next;
}

// { due, repeat, said } for the words, or null when they say no time at all.
export function parseWhen(words, now = new Date(), { hour: dayHour = DEFAULT_HOUR } = {}) {
  const text = fold(words);
  const base = new Date(now);
  const repeated = repeatOf(text);
  const hour = hourSaid(text) ?? partOfDay(text);
  const said = [];

  // «en 2 horas», «en media hora», «in 20 minutes»: a moment from now, the hour does not apply.
  const relative = text.match(/\b(?:en|in|dentro de)\s+(\d+|media|half an?|un|una|uno|a|an|one|dos|two|tres|three|cuatro|four|cinco|five|diez|ten|quince|fifteen|veinte|twenty|treinta|thirty)\s+(min\w*|hor\w*|hou\w*|dia\w*|day\w*|sem\w*|wee\w*)/);
  if (relative && !repeated) {
    const amount = /^(media|half)/.test(relative[1]) ? 0.5 : Number(relative[1]) || NUMBERS[relative[1]] || 1;
    const unit = UNIT_MS[relative[2].slice(0, 3)] ?? 3600000;
    return { due: new Date(base.getTime() + amount * unit), repeat: null, said: relative[0] };
  }

  let day = null;
  if (/\bpasado manana\b|\bday after tomorrow\b/.test(text)) { day = plusDays(base, 2); said.push('pasado mañana'); }
  // «mañana» is tomorrow unless it is the morning: «la mañana», «de la mañana», «por la mañana».
  else if (/(^|[^a-z])(manana)(?![a-z])/.test(text.replace(/\b(la|las|en la|por la|de la|cada|todas las)\s+manana(s)?\b/g, ' ')) || /\btomorrow\b/.test(text)) { day = plusDays(base, 1); said.push('mañana'); }
  else if (/\b(hoy|today|tonight|esta tarde|esta noche|this afternoon)\b/.test(text)) { day = new Date(base); said.push('hoy'); }
  else if (/\b(la proxima semana|la semana que viene|next week)\b/.test(text)) {
    day = plusDays(base, ((8 - base.getDay()) % 7) || 7);
    said.push('la próxima semana');
  } else {
    const named = text.match(new RegExp(`\\b(?:el|este|el proximo|on|next|this)?\\s*(${DAY_WORDS})\\b`));
    if (named && !repeated) {
      const target = dayIndex(named[1]);
      const ahead = (target - base.getDay() + 7) % 7;
      day = plusDays(base, ahead || 7);
      said.push(named[1]);
    }
  }

  if (repeated) {
    let first = at(base, hour?.hour ?? dayHour, hour?.minute ?? 0);
    if (repeated.repeat === 'weekly' && Number.isInteger(repeated.day)) first = plusDays(first, (repeated.day - base.getDay() + 7) % 7);
    if (repeated.repeat === 'weekdays') while (first.getDay() === 0 || first.getDay() === 6) first = plusDays(first, 1);
    const due = first > base ? first : nextOccurrence(first, repeated.repeat, base);
    return { due, repeat: repeated.repeat, said: 'repeat' };
  }
  if (day) return { due: at(day, hour?.hour ?? dayHour, hour?.minute ?? 0), repeat: null, said: said.join(' ') };
  if (hour) {
    const today = at(base, hour.hour, hour.minute);
    return { due: today > base ? today : plusDays(today, 1), repeat: null, said: 'hour' };
  }
  return null;
}

// When nothing was said: tomorrow, at the start of the day (the person's own start, from Reminders' settings).
export const tomorrowMorning = (now = new Date(), hour = DEFAULT_HOUR) => at(plusDays(now, 1), hour);

// A message that asks for a reminder (2026-10-20): «/recordatorios …», «/reminders …», «recuérdame».
export const ASKS_FOR_REMINDER = /(^|\s)\/(recordatorios?|reminders?|remind)\b|recu[eé]rd(ame|anos|ale)|\brecordatorios?\b|\bremind(er|ers)?\b/i;

export const REMINDERS_MAX = 500;
export const REMINDER_TEXT_MAX = 200;
const ID = /^[a-z0-9-]{6,64}$/i;
const remindersFile = (stateRoot) => join(stateRoot, 'reminders.json');
const habitsFile = (roomDir) => join(roomDir, 'reminder-habits.json');
const iso = (value) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null);

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
export async function readWithLocal({ generate, model = null, text, timeoutMs = 45000 }) {
  try {
    const answer = await generate({ model, system: LOCAL_SYSTEM, prompt: String(text).slice(0, 2000), json: true, timeoutMs, temperature: 0 });
    const parsed = JSON.parse(answer.text);
    if (typeof parsed?.remind !== 'boolean') return null;
    return { remind: parsed.remind, what: typeof parsed.what === 'string' ? parsed.what.trim().replace(/[.!¡]+$/, '').slice(0, REMINDER_TEXT_MAX) : '', when: typeof parsed.when === 'string' ? parsed.when.slice(0, 120) : '' };
  } catch { return null; }
}

// One offer per conversation every few minutes, unless the person asked for it in words.
const lastOffer = new Map();
const OFFER_GAP_MS = 10 * 60 * 1000;
export async function offerFor(ctx, event, { now = new Date() } = {}) {
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
  const generate = ctx.services?.ollama?.generate;
  if (prefs.local !== false && typeof generate === 'function' && local?.running && model && project?.on !== false && found.why !== 'frequent') {
    const read = await readWithLocal({ generate, model, text });
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
const prefsOf = (ctx) => ctx.settings ?? {};
// A due time said as a person reads it, in the room's language.
export const whenWords = (due, language = 'es') => new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(due));
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

// The room's words (ctx.t, SDK 2); outside a room — a test, the tool server — the English as written.
const say = (ctx, text, vars = null) => (typeof ctx?.t === 'function' ? ctx.t(text, vars) : String(text).replace(/\{(\w+)\}/g, (whole, name) => (vars && Object.hasOwn(vars, name) ? String(vars[name]) : whole)));

export default {
  sdk: 2,
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
      status: { installed: enabled, detail: enabled ? say(ctx, '{n} reminders ahead', { n: list.length }) : say(ctx, 'off') },
      install: { display: enabled ? 'turn off Reminders' : 'turn on Reminders', platforms: [] },
    };
  },
  async onEvent(ctx, event) {
    const offer = await offerFor(ctx, event);
    if (offer) await ctx.record('reminder.offered', offer);
  },
  // An agent sets a reminder when the person asks for one (this same file, run as its tool server):
  // it can only add.
  async toolsForTurn(ctx, turn) {
    if (turn?.text !== undefined && !ASKS_FOR_REMINDER.test(turn.text)) return [];
    return [{
      name: 'madre-reminders',
      command: process.execPath,
      args: [SELF],
      env: { PULSE_REMINDERS_STATE: ctx.stateRoot, PULSE_ROOM_ID: ctx.roomId ?? '', PULSE_PROJECT: projectOf(ctx) ?? '', PULSE_REMINDER_HOUR: String(hourOf(ctx.settings)) },
      tools: ['create_reminder'],
      brief: 'When the person asks to be reminded of something (they may write /recordatorios or /reminders), set it with the create_reminder tool of server madre-reminders: what to remember, short, in their language, and when, in their own words. Then tell them when it is due.',
    }];
  },
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
      if (!text) return reply(400, { error: say(ctx, 'Write what to remember.') });
      const dayHour = hourOf(prefsOf(ctx));
      const when = iso(payload?.due) ? { due: new Date(payload.due), repeat: REPEATS.includes(payload?.repeat) ? payload.repeat : null } : parseWhen(`${payload?.when ?? ''} ${text}`, new Date(), { hour: dayHour }) ?? { due: tomorrowMorning(new Date(), dayHour), repeat: null };
      const made = await addReminder(ctx.stateRoot, { text: taskFromWords(text), due: when.due.toISOString(), repeat: when.repeat, room: ctx.roomId ?? null, project: projectOf(ctx), why: 'manual' });
      return made.error ? reply(409, { error: say(ctx, 'The reminder was not set.') }) : reply(200, made);
    } },
    // The answer to a card: yes with the time it offered or one of the quick ones, or no.
    { method: 'POST', path: '/api/reminders/answer', handler: async (ctx, { payload }) => {
      const offer = String(payload?.offer ?? '');
      if (!ID.test(offer)) return reply(400, { error: say(ctx, 'That offer is not known.') });
      const chat = typeof payload?.chat === 'string' ? payload.chat : null;
      let made = null;
      if (payload?.accept === true) {
        const due = iso(payload?.due);
        if (!due) return reply(400, { error: say(ctx, 'Say when.') });
        made = await addReminder(ctx.stateRoot, { text: String(payload?.text ?? ''), due, repeat: REPEATS.includes(payload?.repeat) ? payload.repeat : null, room: ctx.roomId ?? null, project: projectOf(ctx), chat, why: ['pending', 'frequent', 'asked'].includes(payload?.why) ? payload.why : 'pending' });
        if (made.error) return reply(409, { error: say(ctx, 'The reminder was not set.') });
      }
      const settled = { offer, accepted: Boolean(made), id: made?.reminder.id ?? null, due: made?.reminder.due ?? null, repeat: made?.reminder.repeat ?? null };
      await ctx.services.recordIn(chat, 'reminder.answered', settled).catch(() => null);
      return reply(200, { ...settled, reminder: made?.reminder ?? null });
    } },
    { method: 'POST', path: '/api/reminders/done', handler: async (ctx, { payload }) => {
      const done = await doneReminder(ctx.stateRoot, String(payload?.id ?? ''));
      return done.error ? reply(404, { error: say(ctx, 'That reminder is no longer here.') }) : reply(200, done);
    } },
    { method: 'POST', path: '/api/reminders/snooze', handler: async (ctx, { payload }) => {
      const minutes = Number(payload?.minutes);
      const until = iso(payload?.until) ?? (Number.isFinite(minutes) && minutes > 0 && minutes <= 60 * 24 * 30 ? new Date(Date.now() + minutes * 60000).toISOString() : null);
      if (!until) return reply(400, { error: say(ctx, 'Say when.') });
      const moved = await snoozeReminder(ctx.stateRoot, String(payload?.id ?? ''), until);
      return moved.error ? reply(404, { error: say(ctx, 'That reminder is no longer here.') }) : reply(200, moved);
    } },
    // The history emptied: the done ones of this project, or of every project in Home.
    { method: 'POST', path: '/api/reminders/clear-done', handler: async (ctx) => {
      const cleared = await clearDone(ctx.stateRoot, ctx.roomId ?? null);
      return reply(200, cleared);
    } },
    { method: 'POST', path: '/api/reminders/delete', handler: async (ctx, { payload }) => {
      const gone = await deleteReminder(ctx.stateRoot, String(payload?.id ?? ''));
      return gone.error ? reply(404, { error: say(ctx, 'That reminder is no longer here.') }) : reply(200, gone);
    } },
  ],
};

// THE TOOL SERVER (MCP over stdio, JSON-RPC 2.0), when an agent's turn runs this file with node:
// one tool, create_reminder. It only adds — it cannot read, change or delete the person's
// reminders, which stay theirs — and it writes the same file the page reads.
//
// Environment:
//   PULSE_REMINDERS_STATE  ~/.pulse, where reminders.json is kept
//   PULSE_ROOM_ID          the project's room id, kept on each reminder
//   PULSE_PROJECT          the project's name, for Home
//   PULSE_REMINDER_HOUR    the hour a day starts at for a reminder with no hour (Reminders' setting)
const SERVER_NAME = 'madre-reminders';
const SERVER_VERSION = '2.0.0';
const REMINDER_TOOL = {
  name: 'create_reminder',
  description: 'Set a reminder for the person. Use it when they ask to be reminded of something (they may write /recordatorios or /reminders). MADRE tells them when it is due, in Home and in this project.',
  inputSchema: { type: 'object', properties: { what: { type: 'string', description: 'What to remember, short, in the person\'s language.' }, when: { type: 'string', description: 'When, in the person\'s own words: «mañana a las 5», «el lunes», «every day at 9», «in 2 hours». Empty for tomorrow morning.' } }, required: ['what'] },
};

async function createReminder(args, env) {
  const what = taskFromWords(String(args.what ?? '').trim());
  if (!what) throw new Error('The reminder needs what to remember.');
  const hour = Number(env.PULSE_REMINDER_HOUR) || 9;
  const when = parseWhen(String(args.when ?? ''), new Date(), { hour }) ?? { due: tomorrowMorning(new Date(), hour), repeat: null };
  const made = await addReminder(env.PULSE_REMINDERS_STATE, { text: what, due: when.due.toISOString(), repeat: when.repeat, room: env.PULSE_ROOM_ID || null, project: env.PULSE_PROJECT || null, why: 'asked' });
  if (made.error) throw new Error('The reminder was not set.');
  return `Reminder set: «${made.reminder.text}», due ${made.reminder.due}${made.reminder.repeat ? `, repeating ${made.reminder.repeat}` : ''}. Tell the person when, in their words.`;
}

export function handleRequest(message, { env = process.env } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  const tools = env.PULSE_REMINDERS_STATE ? [REMINDER_TOOL] : [];
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      return Promise.resolve(reply({ tools }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (!tools.some((tool) => tool.name === name)) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      return createReminder(args, env)
        .then((text) => reply({ content: [{ type: 'text', text }], isError: false }))
        .catch((error) => reply({ content: [{ type: 'text', text: `Nothing was saved: ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, env = process.env } = {}) {
  let buffer = '';
  let pending = 0;
  let ended = false;
  const finish = () => { if (ended && pending === 0) process.exit(0); };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`); continue; }
      pending += 1;
      void handleRequest(message, { env })
        .then((response) => { if (response) output.write(`${JSON.stringify(response)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  input.on('end', () => { ended = true; finish(); });
}

// Both paths resolved before they are compared (WIN-004), as the other servers do.
const real = async (path) => (path ? realpath(path).catch(() => path) : null);
if (process.argv[1] && (await real(process.argv[1])) === (await real(SELF))) {
  if (!process.env.PULSE_REMINDERS_STATE) {
    process.stderr.write('PULSE_REMINDERS_STATE is required.\n');
    process.exit(2);
  }
  serve();
}
