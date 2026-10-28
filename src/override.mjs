// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { createHash, timingSafeEqual } from 'node:crypto';

// How #3 CONTROL and #4 AIRLOCK are unlocked, as the person chose it in AJUSTES › Permissions.
//
// The key is checked here, by the project, since 2026-10-12 (SRV-01 of the 1.0 review): before,
// only the browser checked it, and two POSTs from any process on the Mac opened #4 with no key.
// The page asks for the key and sends what was typed; `keyHolds` decides.
//
// Since 2026-10-28 (the person's decision) nothing has to be typed to unlock: #3 is one
// confirmation and #4 two, or the person's own phrase (once for #3, twice for #4) for whoever wants
// a key a program cannot know. The project's name, typed, is gone as a key: any process can read a
// folder's name, so it stopped a slip, not a program, and the confirmation stops the slip as well.
// The rules that never move, whatever the file says:
//   · #4 is never opened by one press: two confirmations, or the phrase twice;
//   · a personal phrase is never stored, only its salted SHA-256; the phrase typed to unlock is
//     compared here and forgotten, and the fingerprint never leaves the project (`publicOverride`);
//   · the grace has a limit: #3 up to 8 hours, #4 up to 1, and off unless chosen.
export const OVERRIDE_KEYS = Object.freeze({
  3: Object.freeze(['confirm', 'phrase']),
  4: Object.freeze(['confirm-airlock', 'phrase-airlock']),
});
// What the page sends for each press of a confirmation.
export const CONFIRMED = 'confirm';
// How long a confirmed mode stays open (2026-10-28, more room, as Claude's and Codex's auto modes
// give): #3 up to a working day, #4 up to an hour, and off unless chosen.
export const OVERRIDE_GRACE = Object.freeze({
  3: Object.freeze([0, 5, 15, 30, 60, 240, 480]),
  4: Object.freeze([0, 5, 15, 30, 60]),
});
const DEFAULT_KEYS = { 3: 'confirm', 4: 'confirm-airlock' };

const HEX = (length) => new RegExp(`^[0-9a-f]{${length}}$`);
function cleanPhrase(phrase) {
  if (!phrase || typeof phrase !== 'object') return null;
  const salt = String(phrase.salt ?? '').toLowerCase();
  const hash = String(phrase.hash ?? '').toLowerCase();
  return HEX(32).test(salt) && HEX(64).test(hash) ? { salt, hash } : null;
}

// Whatever is on disk, read as something the room can act on: unknown keys fall back to the
// default, a key that needs a phrase falls back when there is no phrase.
export function overrideSettings(stored = {}) {
  const source = stored && typeof stored === 'object' ? stored : {};
  const phrase = cleanPhrase(source.phrase);
  const keys = {};
  const grace = {};
  for (const mode of [3, 4]) {
    let key = source.keys?.[mode] ?? source.keys?.[String(mode)];
    if (!OVERRIDE_KEYS[mode].includes(key)) key = DEFAULT_KEYS[mode];
    if (key.startsWith('phrase') && !phrase) key = DEFAULT_KEYS[mode];
    keys[mode] = key;
    const minutes = Number(source.grace?.[mode] ?? source.grace?.[String(mode)] ?? 0);
    grace[mode] = OVERRIDE_GRACE[mode].includes(minutes) ? minutes : 0;
  }
  return { keys, grace, phrase };
}

// A change from AJUSTES over what is stored. `phrase: null` forgets the phrase, and with it any
// key that needed it.
export function mergeOverride(current = {}, patch = {}) {
  const base = overrideSettings(current);
  const next = {
    keys: { ...base.keys, ...(patch.keys && typeof patch.keys === 'object' ? patch.keys : {}) },
    grace: { ...base.grace, ...(patch.grace && typeof patch.grace === 'object' ? patch.grace : {}) },
    phrase: 'phrase' in patch ? patch.phrase : base.phrase,
  };
  return overrideSettings(next);
}

// What the pages are told: which key, the grace, and whether a phrase exists — never its
// fingerprint, which a program could otherwise read and try words against at leisure.
export function publicOverride(settings) {
  const { keys, grace, phrase } = overrideSettings(settings);
  return { keys, grace, phrase: phrase ? { set: true } : null };
}

// The fingerprint of a phrase: the same words however they were spaced or capitalised.
export function phraseHash(salt, phrase) {
  const words = String(phrase ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  return createHash('sha256').update(`${salt}:${words}`).digest('hex');
}
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Whether what was sent opens this mode with the key chosen for it. `words` holds one entry per
// press or phrase: «confirm» for a confirmation, the phrase as typed for a phrase; #4 sends two.
export function keyHolds(stored, { mode, words = [] } = {}) {
  if (mode !== 3 && mode !== 4) return false;
  const settings = overrideSettings(stored);
  const typed = (Array.isArray(words) ? words : []).map((word) => (typeof word === 'string' ? word.trim() : ''));
  const isPhrase = (word) => Boolean(word) && Boolean(settings.phrase) && same(phraseHash(settings.phrase.salt, word), settings.phrase.hash);
  switch (settings.keys[mode]) {
    case 'confirm': return mode === 3 && typed[0] === CONFIRMED;
    case 'phrase': return mode === 3 && isPhrase(typed[0]);
    case 'confirm-airlock': return mode === 4 && typed[0] === CONFIRMED && typed[1] === CONFIRMED;
    case 'phrase-airlock': return mode === 4 && isPhrase(typed[0]) && isPhrase(typed[1]);
    default: return false;
  }
}

// Whether a change to these settings must show the phrase first: while a phrase guards a mode, a
// program that could change the key could also take the phrase away.
export function changeNeedsPhrase(stored) {
  const settings = overrideSettings(stored);
  return Boolean(settings.phrase) && [3, 4].some((mode) => settings.keys[mode].startsWith('phrase'));
}
