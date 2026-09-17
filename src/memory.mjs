// MADRE's durable room memory: everything ever said in a room outside GHOST,
// indexed for full-text recall so an agent's turn can be handed the older
// exchanges that matter to it, exactly as they were said. It lives in a
// SQLite file next to the ledger, is derived from the ledger alone, and can be
// deleted at any time: the next start rebuilds it. GHOST events never reach
// the ledger, so they never reach here either.

import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { messageEntry } from './conversation-context.mjs';

export const MEMORY_SCHEMA_VERSION = 1;

// Words that carry no meaning for recall, in the two languages the rooms speak.
const STOPWORDS = new Set(('the and for with that this from what which where when have has are was were will would could should about into your you our their there here they them then than also just like only over under some any all not but can does did done been being make made use used using please into onto ' +
  'los las une una unos unas del con que por para como cuando donde este esta estos estas ese esa esos esas aquel aquella sobre entre hacia desde hasta pero sino porque aunque mientras también tambien muy mas más menos todo toda todos todas algo alguien nada nadie cada otro otra otros otras ser estar haber hacer tener puede pueden podemos quiero quieres queremos hay son fue era está esta están estan sea sean sido siendo tiene tienen tengo dame dime hazlo ahora luego antes después despues aquí aqui allí alli así asi bien mal ver revisa revisar mira dónde cómo qué cuál cuáles quién quiénes cuándo cuánto cuánta cuántos por qué').split(/\s+/));

// The terms worth searching for in a request: identifiers, paths and words of
// three letters or more that are not stopwords, longest first, at most 16.
export function queryTerms(text, { limit = 16 } = {}) {
  const seen = new Set();
  const terms = [];
  for (const raw of String(text ?? '').toLowerCase().split(/[^\p{L}\p{N}_./@#-]+/u)) {
    const term = raw.replace(/^[./@#-]+|[./-]+$/g, '');
    if (term.length < 3 || STOPWORDS.has(term) || seen.has(term)) continue;
    if (/^\d+$/.test(term) && term.length < 4) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms.sort((a, b) => b.length - a.length).slice(0, limit);
}

// A window of the entry's text around the first term that matches, so the
// agent reads the sentence that made the entry relevant, not its opening.
export function excerpt(text, terms, { maxChars = 360 } = {}) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const lower = clean.toLowerCase();
  let at = -1;
  for (const term of terms) { const index = lower.indexOf(term); if (index >= 0 && (at < 0 || index < at)) at = index; }
  if (at < 0) return `${clean.slice(0, maxChars - 1)}…`;
  const start = Math.max(0, Math.min(at - Math.floor(maxChars / 3), clean.length - maxChars));
  const end = Math.min(clean.length, start + maxChars);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end).trim()}${end < clean.length ? '…' : ''}`;
}

// node:sqlite is still flagged experimental; the room does not need to hear that on every start.
async function loadSqlite() {
  const original = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    const message = typeof warning === 'string' ? warning : warning?.message ?? '';
    if (message.includes('SQLite is an experimental feature')) return undefined;
    return original.call(process, warning, ...rest);
  };
  try {
    return await import('node:sqlite');
  } finally {
    process.emitWarning = original;
  }
}

export class RoomMemory {
  #file;
  #db = null;
  #Database = null;
  #insert;
  #meta;
  #setMeta;

  constructor(file) {
    this.#file = file;
  }

  get file() { return this.#file; }

  // Opens (or rebuilds) the index, then catches up with the ledger if given.
  async initialize(store = null) {
    if (this.#file !== ':memory:') await mkdir(dirname(this.#file), { recursive: true });
    ({ DatabaseSync: this.#Database } = await loadSqlite());
    this.#open();
    if (this.#metaValue('schema') !== String(MEMORY_SCHEMA_VERSION)) {
      this.close();
      if (this.#file !== ':memory:') await Promise.all(['', '-wal', '-shm'].map((suffix) => rm(`${this.#file}${suffix}`, { force: true })));
      this.#open();
    }
    if (store) await this.catchUp(store);
    return this;
  }

  #open() {
    this.#db = new this.#Database(this.#file);
    if (this.#file !== ':memory:') this.#db.exec('PRAGMA journal_mode = WAL');
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entries (
        sequence INTEGER PRIMARY KEY,
        event_id TEXT NOT NULL,
        timestamp TEXT,
        type TEXT NOT NULL,
        role TEXT NOT NULL,
        sender TEXT NOT NULL,
        target TEXT,
        message_id TEXT,
        text TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(text, sender, content='entries', content_rowid='sequence', tokenize='trigram');
      CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, text, sender) VALUES (new.sequence, new.text, new.sender);
      END;
      CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, text, sender) VALUES ('delete', old.sequence, old.text, old.sender);
      END;
    `);
    this.#meta = this.#db.prepare('SELECT value FROM meta WHERE key = ?');
    this.#setMeta = this.#db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    this.#insert = this.#db.prepare('INSERT OR IGNORE INTO entries (sequence, event_id, timestamp, type, role, sender, target, message_id, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (this.#metaValue('schema') === null) this.#setMeta.run('schema', String(MEMORY_SCHEMA_VERSION));
  }

  #metaValue(key) { return this.#meta.get(key)?.value ?? null; }

  // The last ledger sequence this index has seen, indexed or not.
  lastSequence() { return Number(this.#metaValue('last_sequence') ?? 0); }
  count() { return this.#db.prepare('SELECT COUNT(*) AS n FROM entries').get().n; }

  // Indexes the events that carry text (messages, failures, command cards).
  // Ghost events and anything without a sequence are skipped by construction;
  // an event already indexed is ignored, so two servers on one room are safe.
  index(events) {
    let last = this.lastSequence();
    let added = 0;
    this.#db.exec('BEGIN');
    try {
      for (const event of events) {
        if (!event || event.ghost || !Number.isInteger(event.sequence)) continue;
        if (event.sequence > last) last = event.sequence;
        const entry = messageEntry(event);
        if (!entry) continue;
        const result = this.#insert.run(event.sequence, event.id ?? `seq-${event.sequence}`, event.timestamp ?? null, event.type, entry.role, entry.sender, entry.target ?? null, entry.messageId ?? null, entry.text);
        added += Number(result.changes ?? 0);
      }
      this.#setMeta.run('last_sequence', String(last));
      this.#db.exec('COMMIT');
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
    return added;
  }

  // Indexes whatever the ledger holds beyond the last sequence seen.
  async catchUp(store) {
    const last = this.lastSequence();
    const events = await store.readAll();
    return this.index(events.filter((event) => event.sequence > last));
  }

  // Older exchanges matched to a request. Each term is looked up on its own
  // and weighted by how rare it is in this room (a word in a third of the
  // entries says nothing; a path or a name says a lot), so an entry matching
  // two rare terms beats one matching a common word many times. Only before
  // `beforeSequence` (the recent window the agent gets verbatim anyway), never
  // the request itself, within a character budget, oldest first so they read
  // as a timeline.
  recall(text, { beforeSequence = Number.MAX_SAFE_INTEGER, excludeMessageId = null, limit = 6, maxChars = 4000, excerptChars = 360 } = {}) {
    const terms = queryTerms(text);
    if (!terms.length || !this.#db) return { terms, entries: [], omitted: 0 };
    const total = this.count();
    if (!total) return { terms, entries: [], omitted: 0 };
    const lookup = this.#db.prepare('SELECT rowid FROM entries_fts WHERE entries_fts MATCH ? AND rowid < ? LIMIT 2000');
    const scores = new Map();
    const matchedTerms = [];
    for (const term of terms) {
      let rows;
      try { rows = lookup.all(`"${term.replaceAll('"', '""')}"`, beforeSequence); } catch { continue; }
      if (!rows.length) continue;
      // A term present in over a third of a room of any size carries no signal when others exist.
      if (terms.length > 1 && rows.length > Math.max(8, total * 0.35)) continue;
      matchedTerms.push(term);
      const weight = Math.log(1 + total / rows.length) * (1 + Math.min(term.length, 12) / 12);
      for (const { rowid } of rows) scores.set(rowid, (scores.get(rowid) ?? 0) + weight);
    }
    if (!scores.size) return { terms, entries: [], omitted: 0 };
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, limit * 4);
    const fetch = this.#db.prepare('SELECT sequence, timestamp, type, role, sender, target, message_id AS messageId, text FROM entries WHERE sequence = ?');
    const chosen = [];
    let remaining = Math.max(0, maxChars);
    let seen = 0;
    for (const [sequence, score] of ranked) {
      const row = fetch.get(sequence);
      if (!row || (excludeMessageId && row.messageId === excludeMessageId)) continue;
      seen += 1;
      if (chosen.length >= limit) break;
      const text2 = excerpt(row.text, matchedTerms, { maxChars: excerptChars });
      const cost = text2.length + 48;
      if (cost > remaining) continue;
      remaining -= cost;
      chosen.push({ sequence: row.sequence, timestamp: row.timestamp, type: row.type, role: row.role, sender: row.sender, target: row.target, messageId: row.messageId, excerpt: text2, score });
    }
    chosen.sort((a, b) => a.sequence - b.sequence);
    return { terms: matchedTerms, entries: chosen, omitted: Math.max(0, seen - chosen.length) };
  }

  close() {
    this.#db?.close();
    this.#db = null;
  }
}

// The block an agent reads: one exact quote per line group, stamped with the
// ledger sequence so anyone can go back to the original.
export function formatRecall(recall) {
  if (!recall?.entries?.length) return '';
  return recall.entries.map((entry) => {
    const when = entry.timestamp ? entry.timestamp.slice(0, 16).replace('T', ' ') : '';
    const who = entry.role === 'command' ? entry.sender : `@${entry.sender}`;
    const to = entry.target && entry.target !== 'room' ? ` → ${entry.target === 'you' ? 'human' : `@${entry.target}`}` : '';
    return `[#${entry.sequence}${when ? ` · ${when}` : ''} · ${who} (${entry.role})${to}] ${entry.excerpt}`;
  }).join('\n\n');
}
