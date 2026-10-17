// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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

// «Mac» only on a Mac (2026-10-15): MADRE installs on Linux too, and a sentence about the machine
// it runs on says «computer» there. Same rule as public/i18n.js (hostWords); hardware named on
// purpose («a Mac with an M chip») has no article in front and is left alone.
let hostIsMac = process.platform === 'darwin';
export const setHostIsMac = (value) => { hostIsMac = Boolean(value); return hostIsMac; };
export function hostWords(text) {
  if (hostIsMac || typeof text !== 'string' || !text.includes('Mac')) return text;
  return text
    .replace(/\b(this|your|the|This|Your|The) Mac\b/g, '$1 computer')
    .replace(/(^|[^\p{L}])(esta|tu|la|Esta|Tu|La) Mac\b/gu, '$1$2 computadora');
}

// A sentence MADRE wrote in one language, quoted in the other. A failure is recorded in the
// language the room spoke when it happened, and @madre's round summary quoted it as it was: a
// Spanish summary said «(Google rejected the Gemini credentials…)» (manual tests, 2026-10-17).
// Only whole sentences of the catalogue are swapped, never a word inside one, so ids, commands and
// whatever an agent wrote stay as they are.
let sentencePairs = null;
export function inLanguage(text, lang) {
  let out = String(text ?? '');
  sentencePairs ??= Object.entries(ES).filter(([en, es]) => typeof es === 'string' && en !== es && en.length >= 24 && /[.!?»)]$/.test(en));
  for (const [en, es] of sentencePairs) {
    const [from, to] = lang === 'es' ? [en, hostWords(es)] : [hostWords(es), en];
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

export function t(text, vars = null) {
  if (typeof text !== 'string' || !text) return text;
  const said = hostWords(CATALOGUES[current]?.[text] ?? text);
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
