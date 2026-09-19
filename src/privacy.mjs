// Privacy: terms that must never travel through a room. ERROR-001 in a real room
// showed the channel: an agent's own configuration (organisation instructions,
// the account it runs under) leaks into its reply, the reply enters the shared
// ledger, the archivist distils it into a durable memory, the memory becomes a
// training example. Four hops, no control at any of them.
//
// This module is the control. The human names the terms in MU/TH/UR → PRIVACY
// (or PULSE_PRIVATE_TERMS); MADRE replaces them with a marker at every hop:
// agent replies before they are recorded, notes before they are kept, entries
// before they are indexed, dataset pairs before they are written. A purge does
// the same to what the room already holds. The terms themselves stay in
// ~/.pulse/config.json and are never written to the ledger or to any prompt.

export const PRIVACY_MARKER = '[ENTIDAD-ORG]';
export const MAX_TERMS = 64;

const ACCENTS = { a: '[aáàäâ]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöô]', u: '[uúùüû]', n: '[nñ]', c: '[cç]' };

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One term as a pattern: case- and accent-insensitive, tolerant of the spacing
// people use between the words of a name ("Come Verde", "ComeVerde", "come-verde").
function termPattern(term) {
  const words = term.trim().split(/\s+/).map((word) => [...word.toLowerCase()].map((char) => ACCENTS[char] ?? escape(char)).join(''));
  return words.join('[\\s._-]*');
}

export function normalizeTerms(list) {
  const seen = new Set();
  const terms = [];
  for (const raw of Array.isArray(list) ? list : String(list ?? '').split(/[\n,;]+/)) {
    const term = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (term.length < 3 || term.length > 80) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= MAX_TERMS) break;
  }
  // Longest first, so "Come Verde Holdings" is replaced whole before "Come Verde" gets to it.
  return terms.sort((a, b) => b.length - a.length);
}

export function privacyPattern(terms) {
  const list = normalizeTerms(terms);
  if (!list.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.map(termPattern).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

// From config.json (`privacy.terms`, `privacy.marker`) and the environment.
export function privacySettings(config = {}, env = process.env) {
  const fromEnv = env.PULSE_PRIVATE_TERMS ? String(env.PULSE_PRIVATE_TERMS).split(/[,;\n]+/) : [];
  const fromConfig = Array.isArray(config.privacy?.terms) ? config.privacy.terms : [];
  const marker = String(config.privacy?.marker ?? env.PULSE_PRIVATE_MARKER ?? PRIVACY_MARKER).trim() || PRIVACY_MARKER;
  return { terms: normalizeTerms([...fromEnv, ...fromConfig]), marker, envWins: fromEnv.length > 0 };
}

export class Privacy {
  #terms = [];
  #pattern = null;
  #marker = PRIVACY_MARKER;

  constructor({ terms = [], marker = PRIVACY_MARKER } = {}) {
    this.set(terms, marker);
  }

  set(terms, marker = this.#marker) {
    this.#terms = normalizeTerms(terms);
    this.#pattern = privacyPattern(this.#terms);
    this.#marker = String(marker ?? PRIVACY_MARKER).trim() || PRIVACY_MARKER;
    return this;
  }

  get terms() { return [...this.#terms]; }
  get marker() { return this.#marker; }
  get enabled() { return this.#pattern !== null; }

  // How many private terms a text carries.
  hits(text) {
    if (!this.#pattern || typeof text !== 'string' || !text) return 0;
    return (text.match(this.#pattern) ?? []).length;
  }

  // The text with every private term replaced by the marker, and the count.
  redact(text) {
    if (!this.#pattern || typeof text !== 'string' || !text) return { text, hits: 0 };
    let hits = 0;
    const out = text.replace(this.#pattern, () => { hits += 1; return this.#marker; });
    return { text: out, hits };
  }

  // Every string inside a value (an event payload, a plan), replaced in place of
  // a copy. Ids and numbers are untouched; only prose can carry a name.
  redactDeep(value) {
    if (!this.#pattern) return { value, hits: 0 };
    let hits = 0;
    const walk = (node) => {
      if (typeof node === 'string') { const r = this.redact(node); hits += r.hits; return r.text; }
      if (Array.isArray(node)) return node.map(walk);
      if (node && typeof node === 'object') {
        const out = {};
        for (const [key, item] of Object.entries(node)) out[key] = walk(item);
        return out;
      }
      return node;
    };
    return { value: walk(value), hits };
  }
}
