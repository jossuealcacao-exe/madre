// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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

// What a secret looks like, whatever project it turns up in. The same list the crash reporter
// has used since the beginning, brought where the room can use it: a credential does not become
// safe by being in a reply rather than in a stack trace.
// Widened 2026-10-12 (INI-05 of the 1.0 review): what crosses between projects was cleaned of a few
// shapes only, and Stripe's live keys, AWS's, private keys, Google's access tokens, a password
// written as a setting, a bearer token and the credentials inside an address went across as they
// were. A replacement may be a function of the match, to keep the name and hide only the value.
const SECRETS = [
  [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '[private key]'],
  [/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}\b/g, '[key]'],
  [/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, '[key]'],
  [/\bya29\.[0-9A-Za-z_-]{20,}/g, '[token]'],
  [/\b(Bearer)\s+[A-Za-z0-9._~+/-]{20,}=*/g, (match, word) => `${word} [token]`],
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi, (match, scheme) => `${scheme}[credentials]@`],
  [/\b(aws_secret_access_key|password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)(\s*[=:]\s*)(["']?)[^\s"']{6,}\3/gi, (match, name, between, quote) => `${name}${between}${quote}[secret]${quote}`],
  [/\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, '[phone]'],
  [/\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, '[key]'],
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[key]'],
  [/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, '[token]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[token]'],
  [/\bnpm_[A-Za-z0-9]{20,}\b/g, '[token]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, '[token]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[jwt]'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]'],
];

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
  // The two shape guards default to on. Someone who wants a verbatim ledger can turn them off,
  // but nobody should have to know they exist to be protected by them.
  return {
    terms: normalizeTerms([...fromEnv, ...fromConfig]), marker, envWins: fromEnv.length > 0,
    secrets: config.privacy?.secrets !== false,
    paths: config.privacy?.paths !== false,
  };
}

export class Privacy {
  #terms = [];
  #pattern = null;
  #marker = PRIVACY_MARKER;
  // Two guards that need no list of words, because what they catch has a shape rather than a
  // name. A key is a key in any project, and the path to a home directory carries whoever lives
  // in it. Both are on by default: a credential written into a plain-text ledger is a real
  // exposure, and nobody chose to put it there.
  #secrets = true;
  #paths = true;
  #home = null;

  constructor({ terms = [], marker = PRIVACY_MARKER, secrets = true, paths = true, home = null } = {}) {
    this.set(terms, marker);
    this.setGuards({ secrets, paths, home });
  }

  set(terms, marker = this.#marker) {
    this.#terms = normalizeTerms(terms);
    this.#pattern = privacyPattern(this.#terms);
    this.#marker = String(marker ?? PRIVACY_MARKER).trim() || PRIVACY_MARKER;
    return this;
  }

  setGuards({ secrets, paths, home } = {}) {
    if (secrets !== undefined) this.#secrets = Boolean(secrets);
    if (paths !== undefined) this.#paths = Boolean(paths);
    if (home !== undefined) this.#home = home ? String(home) : null;
    return this;
  }

  get guards() { return { secrets: this.#secrets, paths: this.#paths }; }

  get terms() { return [...this.#terms]; }
  get marker() { return this.#marker; }
  get enabled() { return this.#pattern !== null || this.#secrets || this.#paths; }

  // How many private terms a text carries.
  hits(text) {
    if (!this.#pattern || typeof text !== 'string' || !text) return 0;
    return (text.match(this.#pattern) ?? []).length;
  }

  // The text with every private term replaced by the marker, and the count. The shape guards run
  // too: a key or a home path is caught whether or not anyone thought to name it.
  // `kinds` says what was replaced: a term the human named, a key, or a home path. The room's
  // notice used to call all of them «private terms», so a home path turned into ~ read as a term
  // that was never written.
  // `always`: secrets and paths are hidden even where this project switched those guards off —
  // what one project hands to another (a connection) is not this project's to leave open (INI-05).
  redact(text, { always = false } = {}) {
    if (typeof text !== 'string' || !text) return { text, hits: 0, kinds: { terms: 0, secrets: 0, paths: 0 } };
    const kinds = { terms: 0, secrets: 0, paths: 0 };
    let out = text;
    if (this.#pattern) out = out.replace(this.#pattern, () => { kinds.terms += 1; return this.#marker; });
    if (this.#secrets || always) {
      for (const [pattern, replacement] of SECRETS) out = out.replace(pattern, (...match) => { kinds.secrets += 1; return typeof replacement === 'function' ? replacement(...match) : replacement; });
    }
    if (this.#paths || always) {
      if (this.#home) { const parts = out.split(this.#home); kinds.paths += parts.length - 1; out = parts.join('~'); }
      // The folder named as it was (`RegExp.$1` read whatever the last match anywhere left there,
      // so a /home/ path came back as /Users/).
      out = out.replace(/\/(Users|home)\/[^/\s"']+/g, (match, top) => { kinds.paths += 1; return `/${top}/…`; });
      out = out.replace(/[A-Za-z]:\\Users\\[^\\\s"']+/g, () => { kinds.paths += 1; return 'C:\\Users\\…'; });
    }
    return { text: out, hits: kinds.terms + kinds.secrets + kinds.paths, kinds };
  }

  // Every string inside a value (an event payload, a plan), replaced in place of
  // a copy. Ids and numbers are untouched; only prose can carry a name.
  redactDeep(value) {
    if (!this.enabled) return { value, hits: 0 };
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
