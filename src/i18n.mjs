// The room's language, on this side of the wire.
//
// The catalogue is the page's: public/es.js, one file for the whole product, because a sentence
// that appears in a card and in a toast should not be translated twice and drift. What differs
// is only where the choice comes from — here it is ~/.pulse/config.json, read once when the room
// opens and again whenever it is changed — and what must never go through it:
//
//   · The prompt the agents read. It is English on purpose; see src/room/prompt.mjs.
//   · Anything written INTO the ledger. Those lines are the record of what happened, in the
//     language they happened in; translating the past is not translating, it is rewriting.
//
// So this is for text the server COMPUTES for a screen: what a module is, what it would create,
// what a reading means. Same rule as the page: the key is the English sentence, and a sentence
// nobody has translated comes back in English, whole.

import { ES } from '../public/es.js';

const CATALOGUES = { es: ES, en: {} };
let current = 'es';

export const language = () => current;
export function setLanguage(id) {
  current = id === 'en' ? 'en' : 'es';
  return current;
}

export function t(text, vars = null) {
  if (typeof text !== 'string' || !text) return text;
  const said = CATALOGUES[current]?.[text] ?? text;
  if (!vars) return said;
  return said.replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
}

// A card, a list, a note: whatever a screen is handed, with only the fields that are prose put
// through the catalogue. Everything else — ids, versions, paths, commands — is left alone,
// because those are not sentences and a translated id is a bug.
const PROSE = new Set(['summary', 'detail', 'note', 'says', 'brief', 'what', 'when', 'where', 'why', 'hint', 'title', 'label', 'remedy', 'diagnosis', 'creates', 'requires']);

export function translate(value, key = null) {
  if (Array.isArray(value)) return value.map((one) => translate(one, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [name, inner] of Object.entries(value)) out[name] = translate(inner, name);
    return out;
  }
  return typeof value === 'string' && key && PROSE.has(key) ? t(value) : value;
}
