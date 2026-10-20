// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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
function hourOf(text) {
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
export function parseWhen(words, now = new Date()) {
  const text = fold(words);
  const base = new Date(now);
  const repeated = repeatOf(text);
  const hour = hourOf(text) ?? partOfDay(text);
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
    let first = at(base, hour?.hour ?? DEFAULT_HOUR, hour?.minute ?? 0);
    if (repeated.repeat === 'weekly' && Number.isInteger(repeated.day)) first = plusDays(first, (repeated.day - base.getDay() + 7) % 7);
    if (repeated.repeat === 'weekdays') while (first.getDay() === 0 || first.getDay() === 6) first = plusDays(first, 1);
    const due = first > base ? first : nextOccurrence(first, repeated.repeat, base);
    return { due, repeat: repeated.repeat, said: 'repeat' };
  }
  if (day) return { due: at(day, hour?.hour ?? DEFAULT_HOUR, hour?.minute ?? 0), repeat: null, said: said.join(' ') };
  if (hour) {
    const today = at(base, hour.hour, hour.minute);
    return { due: today > base ? today : plusDays(today, 1), repeat: null, said: 'hour' };
  }
  return null;
}

// When nothing was said: tomorrow, at the start of the day.
export const tomorrowMorning = (now = new Date()) => at(plusDays(now, 1), DEFAULT_HOUR);
