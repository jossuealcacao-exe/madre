// The room's language.
//
// MADRE is written in Spanish and answers in English when it is asked to. That is the way round
// it is because of who works in it, and because a product that ships one language and calls the
// other a "locale" ends up with a second-class one.
//
// How it works, and why this way:
//
// The KEY IS THE ENGLISH SENTENCE. There are no invented ids to keep in step with the screens —
// `t('Type here, human. Ask the room…')` is what is written where the words are used, and the
// catalogue answers with the Spanish. A sentence nobody has translated yet comes back in
// English, whole, rather than as a hole or an id: half a translated screen is a screen, and a
// screen full of MISSING_KEY_47 is a bug report.
//
// What varies inside a sentence travels as a named slot, `t('{n} blocks', { n })`, so the
// Spanish can put it where Spanish puts it rather than where English did.
//
// And what is already DATA — the troubleshooting catalogue, the console's inquiries, the
// addresses in WHAT LEFT THIS MACHINE — is not dictionary work: those get a Spanish table beside
// the English one, through `pick()`, because translating a table key by key loses the table.
//
// Nothing here is a framework. It is a lookup, a fallback and a switch.

import { ES } from './es.js';

export const LANGUAGES = { es: { id: 'es', name: 'ESPAÑOL', other: 'en' }, en: { id: 'en', name: 'ENGLISH', other: 'es' } };
export const DEFAULT_LANGUAGE = 'es';
const CATALOGUES = { es: ES, en: {} };

let current = DEFAULT_LANGUAGE;

export const language = () => current;
export const isLanguage = (id) => Object.hasOwn(LANGUAGES, String(id ?? ''));

export function setLanguage(id) {
  current = isLanguage(id) ? id : DEFAULT_LANGUAGE;
  return current;
}

// `{name}` is filled from `vars` after the sentence is chosen, so the Spanish can put the number
// where Spanish puts it. A slot with nothing to fill it is left as it is rather than printed as
// "undefined": a visible brace is a bug you can see.
export function fill(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
}

export function t(text, vars = null) {
  const said = CATALOGUES[current]?.[text] ?? text;
  return fill(said, vars);
}

// A table that carries both languages: `{ en: …, es: … }` anywhere inside it. Whole objects,
// whole arrays — the shape is the table's own and this only chooses the side.
export function pick(value) {
  if (Array.isArray(value)) return value.map(pick);
  if (!value || typeof value !== 'object') return value;
  if (Object.hasOwn(value, 'en') && Object.hasOwn(value, current)) return pick(value[current] ?? value.en);
  const out = {};
  for (const [key, inner] of Object.entries(value)) out[key] = pick(inner);
  return out;
}

// What the catalogue holds, for the test that keeps it honest: every key it has must be a
// sentence the product actually says, and every sentence the product asks for must be in it.
export const catalogue = (id = current) => CATALOGUES[id] ?? {};
