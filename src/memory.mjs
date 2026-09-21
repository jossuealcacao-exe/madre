// MADRE's durable room memory, two layers in one SQLite file next to the ledger.
//   entries   everything ever said in the room outside GHOST, indexed for
//             full-text recall: exact quotes handed to a turn when they match.
//             Derived from the ledger alone; rebuilt whenever it is stale.
//   memories  short durable notes an agent distils from those entries every
//             so often (decisions, verified facts, the human's preferences,
//             open questions), each citing the sequences it came from. These
//             cost a model call, so a schema change keeps them.
//   vectors   embeddings of both, when an embedder is attached, so recall can
//             match meaning and not only words. Filled in the background.
// GHOST events never reach the ledger, so they never reach here either.

import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { messageEntry } from './conversation-context.mjs';
import { cosine, toBlob, fromBlob } from './embeddings.mjs';

export const MEMORY_SCHEMA_VERSION = 3;
export const MEMORY_KINDS = ['decision', 'fact', 'preference', 'question'];

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
  #embedder = null;
  #privacy = null;

  constructor(file) {
    this.#file = file;
  }

  get file() { return this.#file; }

  // Opens (or rebuilds) the index, then catches up with the ledger if given.
  async initialize(store = null) {
    if (this.#file !== ':memory:') await mkdir(dirname(this.#file), { recursive: true });
    ({ DatabaseSync: this.#Database } = await loadSqlite());
    this.#open();
    if (this.#metaValue('schema') !== String(MEMORY_SCHEMA_VERSION)) this.#rebuildEntries();
    if (store) await this.catchUp(store);
    return this;
  }

  // The entries index is derived, so a stale schema just drops it and lets the
  // ledger fill it again; the distilled memories are kept.
  #rebuildEntries() {
    this.#db.exec(`
      DROP TRIGGER IF EXISTS entries_ai; DROP TRIGGER IF EXISTS entries_ad;
      DROP TABLE IF EXISTS entries_fts; DROP TABLE IF EXISTS entry_vectors; DROP TABLE IF EXISTS entries;
      DELETE FROM meta WHERE key IN ('last_sequence');
    `);
    this.#createSchema();
    this.#setMeta.run('schema', String(MEMORY_SCHEMA_VERSION));
  }

  #open() {
    this.#db = new this.#Database(this.#file);
    if (this.#file !== ':memory:') this.#db.exec('PRAGMA journal_mode = WAL');
    this.#createSchema();
    this.#meta = this.#db.prepare('SELECT value FROM meta WHERE key = ?');
    this.#setMeta = this.#db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    this.#insert = this.#db.prepare('INSERT OR IGNORE INTO entries (sequence, event_id, timestamp, type, role, sender, target, message_id, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (this.#metaValue('schema') === null) this.#setMeta.run('schema', String(MEMORY_SCHEMA_VERSION));
  }

  #createSchema() {
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
        text TEXT NOT NULL,
        distilled INTEGER NOT NULL DEFAULT 0
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(text, sender, content='entries', content_rowid='sequence', tokenize='trigram');
      CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, text, sender) VALUES (new.sequence, new.text, new.sender);
      END;
      CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, text, sender) VALUES ('delete', old.sequence, old.text, old.sender);
      END;
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        norm TEXT NOT NULL UNIQUE,
        from_sequence INTEGER NOT NULL,
        through_sequence INTEGER NOT NULL,
        sources TEXT NOT NULL,
        agent TEXT NOT NULL,
        recalled INTEGER NOT NULL DEFAULT 0,
        last_recalled TEXT
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(text, kind, content='memories', content_rowid='id', tokenize='trigram');
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, text, kind) VALUES (new.id, new.text, new.kind);
      END;
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, text, kind) VALUES ('delete', old.id, old.text, old.kind);
      END;
      CREATE TABLE IF NOT EXISTS entry_vectors (sequence INTEGER PRIMARY KEY, model TEXT NOT NULL, vec BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS memory_vectors (id INTEGER PRIMARY KEY, model TEXT NOT NULL, vec BLOB NOT NULL);
    `);
    // Older files predate the recall counters; adding them is harmless and keeps the notes.
    for (const column of ['recalled INTEGER NOT NULL DEFAULT 0', 'last_recalled TEXT']) {
      try { this.#db.exec(`ALTER TABLE memories ADD COLUMN ${column}`); } catch { /* already there */ }
    }
    // Older files: each entry remembers whether it was distilled (the old watermark seeds it).
    const entryColumns = this.#db.prepare('PRAGMA table_info(entries)').all().map((column) => column.name);
    if (entryColumns.length && !entryColumns.includes('distilled')) {
      this.#db.exec('ALTER TABLE entries ADD COLUMN distilled INTEGER NOT NULL DEFAULT 0');
      const watermark = Number(this.#db.prepare("SELECT value FROM meta WHERE key = 'last_distilled'").get()?.value ?? 0);
      if (watermark > 0) this.#db.prepare('UPDATE entries SET distilled = 1 WHERE sequence <= ?').run(watermark);
    }
    // Notes written on the human's request carry where they came from; older files gain the columns in place.
    const columns = this.#db.prepare('PRAGMA table_info(memories)').all().map((column) => column.name);
    if (!columns.includes('origin')) this.#db.exec("ALTER TABLE memories ADD COLUMN origin TEXT NOT NULL DEFAULT 'distilled'");
    if (!columns.includes('message_id')) this.#db.exec('ALTER TABLE memories ADD COLUMN message_id TEXT');
  }

  /* ---------- embeddings ---------- */

  attachEmbedder(embedder) { this.#embedder = embedder ?? null; return this; }

  // Private terms never enter the index or the notes, whoever wrote them.
  attachPrivacy(privacy) { this.#privacy = privacy ?? null; return this; }
  #guard(text) { return this.#privacy ? this.#privacy.redact(text).text : text; }

  // What the archive still carries: entries and notes with a private term, for MU/TH/UR.
  exposure() {
    if (!this.#privacy?.enabled) return { entries: 0, memories: 0 };
    let entries = 0;
    for (const row of this.#db.prepare('SELECT text FROM entries').iterate()) if (this.#privacy.hits(row.text)) entries += 1;
    let memories = 0;
    for (const row of this.#db.prepare('SELECT text FROM memories').iterate()) if (this.#privacy.hits(row.text)) memories += 1;
    return { entries, memories };
  }

  // Replaces private terms in every entry and note already kept. FTS tables are external
  // content with insert/delete triggers only, so a changed row is deleted and re-inserted
  // with its own rowid; its vector goes with it and is recomputed later. Distilled flags stay.
  purge() {
    if (!this.#privacy?.enabled) return { entries: 0, memories: 0 };
    const counts = { entries: 0, memories: 0 };
    const entryRows = this.#db.prepare('SELECT sequence, event_id, timestamp, type, role, sender, target, message_id, text, distilled FROM entries').all();
    const memoryRows = this.#db.prepare('SELECT id, created, kind, text, norm, from_sequence, through_sequence, sources, agent, origin, message_id FROM memories').all();
    const deleteEntry = this.#db.prepare('DELETE FROM entries WHERE sequence = ?');
    const deleteEntryVector = this.#db.prepare('DELETE FROM entry_vectors WHERE sequence = ?');
    const insertEntry = this.#db.prepare('INSERT INTO entries (sequence, event_id, timestamp, type, role, sender, target, message_id, text, distilled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const deleteMemory = this.#db.prepare('DELETE FROM memories WHERE id = ?');
    const deleteMemoryVector = this.#db.prepare('DELETE FROM memory_vectors WHERE id = ?');
    const insertMemory = this.#db.prepare('INSERT INTO memories (id, created, kind, text, norm, from_sequence, through_sequence, sources, agent, origin, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    this.#db.exec('BEGIN');
    try {
      for (const row of entryRows) {
        const { text, hits } = this.#privacy.redact(row.text);
        if (!hits) continue;
        deleteEntryVector.run(row.sequence);
        deleteEntry.run(row.sequence);
        insertEntry.run(row.sequence, row.event_id, row.timestamp, row.type, row.role, row.sender, row.target, row.message_id, text, row.distilled);
        counts.entries += 1;
      }
      for (const row of memoryRows) {
        const { text, hits } = this.#privacy.redact(row.text);
        if (!hits) continue;
        deleteMemoryVector.run(row.id);
        deleteMemory.run(row.id);
        // Two notes may collapse into the same redacted sentence: the later one is dropped.
        const clash = this.#db.prepare('SELECT id FROM memories WHERE norm = ?').get(normalizeMemory(text));
        if (!clash) insertMemory.run(row.id, row.created, row.kind, text, normalizeMemory(text), row.from_sequence, row.through_sequence, row.sources, row.agent, row.origin, row.message_id);
        counts.memories += 1;
      }
      this.#db.exec('COMMIT');
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
    return counts;
  }
  get embedder() { return this.#embedder; }

  // Entries and notes without a vector for the current model, oldest first.
  pendingVectors({ limit = 100 } = {}) {
    if (!this.#embedder) return { entries: [], memories: [] };
    const model = this.#embedder.model;
    return {
      entries: this.#db.prepare('SELECT e.sequence, e.text FROM entries e LEFT JOIN entry_vectors v ON v.sequence = e.sequence AND v.model = ? WHERE v.sequence IS NULL ORDER BY e.sequence DESC LIMIT ?').all(model, limit),
      memories: this.#db.prepare('SELECT m.id, m.text FROM memories m LEFT JOIN memory_vectors v ON v.id = m.id AND v.model = ? WHERE v.id IS NULL ORDER BY m.id DESC LIMIT ?').all(model, limit),
    };
  }

  // Embeds one batch of what is pending. Returns how many vectors were stored.
  async embedPending({ limit = 100 } = {}) {
    if (!this.#embedder || !this.#db) return 0;
    const pending = this.pendingVectors({ limit });
    const texts = [...pending.entries.map((row) => row.text), ...pending.memories.map((row) => row.text)];
    if (!texts.length) return 0;
    const vectors = await this.#embedder.embed(texts, { query: false });
    const model = this.#embedder.model;
    const putEntry = this.#db.prepare('INSERT OR REPLACE INTO entry_vectors (sequence, model, vec) VALUES (?, ?, ?)');
    const putMemory = this.#db.prepare('INSERT OR REPLACE INTO memory_vectors (id, model, vec) VALUES (?, ?, ?)');
    this.#db.exec('BEGIN');
    try {
      pending.entries.forEach((row, index) => putEntry.run(row.sequence, model, toBlob(vectors[index])));
      pending.memories.forEach((row, index) => putMemory.run(row.id, model, toBlob(vectors[pending.entries.length + index])));
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return texts.length;
  }

  vectorCounts() {
    if (!this.#embedder) return { entries: 0, memories: 0 };
    return {
      entries: this.#db.prepare('SELECT COUNT(*) AS n FROM entry_vectors WHERE model = ?').get(this.#embedder.model).n,
      memories: this.#db.prepare('SELECT COUNT(*) AS n FROM memory_vectors WHERE model = ?').get(this.#embedder.model).n,
    };
  }

  // The query's vector, or null when there is no embedder or it fails: recall then stays lexical.
  async embedQuery(text, { timeoutMs = 2500 } = {}) {
    if (!this.#embedder) return null;
    try {
      const [vector] = await Promise.race([
        this.#embedder.embed([String(text ?? '').slice(0, 2000)], { query: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('embedding timed out')), timeoutMs).unref?.()),
      ]);
      return vector ?? null;
    } catch { return null; }
  }

  // Cosine scores of every stored vector against the query, above a floor.
  #semanticScores(table, key, queryVector, { beforeSequence, floor }) {
    if (!queryVector || !this.#embedder) return new Map();
    const rows = table === 'entry_vectors'
      ? this.#db.prepare('SELECT sequence AS key, vec FROM entry_vectors WHERE model = ? AND sequence < ?').all(this.#embedder.model, beforeSequence)
      : this.#db.prepare('SELECT v.id AS key, v.vec FROM memory_vectors v JOIN memories m ON m.id = v.id WHERE v.model = ? AND m.through_sequence < ?').all(this.#embedder.model, beforeSequence);
    // Embedding models differ in how similar "unrelated" looks, so the cut is
    // relative to the best match as well as absolute: close seconds stay,
    // the long tail goes.
    const scored = rows.map((row) => [row.key, cosine(queryVector, fromBlob(row.vec))]);
    const best = Math.max(0, ...scored.map(([, score]) => score));
    const cut = Math.max(floor, best - 0.12);
    return new Map(scored.filter(([, score]) => score >= cut));
  }

  // Lexical scores (rarity weighted, 0..1 after normalisation) and semantic
  // scores (cosine) fused: an item found by both wins, one found only by
  // meaning still surfaces.
  static fuse(lexical, semantic, { lexicalWeight = 0.55 } = {}) {
    const max = Math.max(0, ...lexical.values()) || 1;
    const fused = new Map();
    for (const [key, score] of lexical) fused.set(key, lexicalWeight * (score / max));
    for (const [key, score] of semantic) fused.set(key, (fused.get(key) ?? 0) + (1 - lexicalWeight) * score);
    return [...fused.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  }

  // Odds and ends other modules keep here, away from files a human might delete.
  metaGet(key) { return this.#metaValue(`x_${key}`); }
  metaSet(key, value) { this.#setMeta.run(`x_${key}`, String(value)); }

  /* ---------- distilled memories ---------- */

  lastDistilled() { return this.#db.prepare('SELECT COALESCE(MAX(sequence), 0) AS n FROM entries WHERE distilled = 1').get().n; }
  // Marks entries as distilled: a list of sequences, or everything up to a sequence.
  markDistilled(sequences) {
    if (Array.isArray(sequences)) {
      const mark = this.#db.prepare('UPDATE entries SET distilled = 1 WHERE sequence = ?');
      this.#db.exec('BEGIN');
      try { for (const sequence of sequences) mark.run(sequence); this.#db.exec('COMMIT'); } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    } else {
      this.#db.prepare('UPDATE entries SET distilled = 1 WHERE sequence <= ?').run(Number(sequences) || 0);
    }
  }
  undistilledCount() { return this.#db.prepare('SELECT COUNT(*) AS n FROM entries WHERE distilled = 0').get().n; }
  memoryCount() { return this.#db.prepare('SELECT COUNT(*) AS n FROM memories').get().n; }

  // The next batch to distil: the NEWEST entries nobody has distilled, cut at a
  // character budget so one run stays cheap, returned in ledger order. What was
  // just said becomes memory first; an old backlog drains behind it, batch by
  // batch. `remaining` says how many entries still wait.
  undistilled({ maxChars = 6000 } = {}) {
    const rows = this.#db.prepare('SELECT sequence, timestamp, role, sender, target, message_id AS messageId, text FROM entries WHERE distilled = 0 ORDER BY sequence DESC').all();
    const batch = [];
    let used = 0;
    for (const row of rows) {
      const cost = Math.min(row.text.length, 1600) + 40;
      if (batch.length && used + cost > maxChars) break;
      batch.push({ ...row, text: row.text.length > 1600 ? `${row.text.slice(0, 1600)}…` : row.text });
      used += cost;
    }
    batch.sort((a, b) => a.sequence - b.sequence);
    return { entries: batch, sequences: batch.map((row) => row.sequence), fromSequence: batch[0]?.sequence ?? null, throughSequence: batch.at(-1)?.sequence ?? null, remaining: rows.length - batch.length };
  }

  // Stores distilled memories; a note already held (same text, ignoring case
  // and punctuation) is not stored twice. Returns how many were new.
  addMemories(list, { agent, fromSequence, throughSequence, origin = 'distilled', messageId = null }) {
    const insert = this.#db.prepare('INSERT OR IGNORE INTO memories (created, kind, text, norm, from_sequence, through_sequence, sources, agent, origin, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    let added = 0;
    this.#db.exec('BEGIN');
    try {
      for (const memory of list) {
        const text = this.#guard(String(memory.text ?? '').trim());
        if (!text) continue;
        const kind = MEMORY_KINDS.includes(memory.kind) ? memory.kind : 'fact';
        const sources = (Array.isArray(memory.sources) ? memory.sources : []).filter((n) => Number.isInteger(n));
        const result = insert.run(now, kind, text, normalizeMemory(text), fromSequence ?? sources[0] ?? 0, throughSequence ?? sources.at(-1) ?? 0, JSON.stringify(sources), agent, origin, messageId);
        added += Number(result.changes ?? 0);
      }
      this.#db.exec('COMMIT');
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
    return added;
  }

  // Exact text of a stretch of the ledger, capped so a tool answer stays readable.
  range({ from = 1, through = Number.MAX_SAFE_INTEGER, limit = 40, maxChars = 12000 } = {}) {
    const rows = this.#db.prepare('SELECT sequence, timestamp, type, role, sender, target, message_id AS messageId, text FROM entries WHERE sequence >= ? AND sequence <= ? ORDER BY sequence LIMIT ?').all(from, through, limit + 1);
    const out = [];
    let used = 0;
    for (const row of rows.slice(0, limit)) {
      const text = row.text.length > maxChars - used ? `${row.text.slice(0, Math.max(0, maxChars - used - 1))}…` : row.text;
      out.push({ ...row, text });
      used += text.length;
      if (used >= maxChars) break;
    }
    return { entries: out, truncated: rows.length > limit || used >= maxChars };
  }

  // The latest entries, newest first, one line each.
  timeline({ since = 0, limit = 30 } = {}) {
    return this.#db.prepare('SELECT sequence, timestamp, role, sender, target, substr(text, 1, 200) AS text FROM entries WHERE sequence > ? ORDER BY sequence DESC LIMIT ?').all(since, limit);
  }

  // Forgetting is the one edit a human makes to the archive: the note and its vector go.
  deleteMemory(id) {
    const row = this.#db.prepare('SELECT id, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, agent FROM memories WHERE id = ?').get(id);
    if (!row) return null;
    this.#db.exec('BEGIN');
    try {
      this.#db.prepare('DELETE FROM memory_vectors WHERE id = ?').run(id);
      this.#db.prepare('DELETE FROM memories WHERE id = ?').run(id);
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return row;
  }

  // Which notes are about the same thing: pairs whose vectors agree, strongest
  // first, a few per note. Empty without an embedder or vectors.
  memoryLinks({ floor = 0.6, maxPerNode = 4 } = {}) {
    if (!this.#embedder) return [];
    const rows = this.#db.prepare('SELECT id, vec FROM memory_vectors WHERE model = ?').all(this.#embedder.model).map((row) => ({ id: row.id, vec: fromBlob(row.vec) }));
    const links = [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const weight = cosine(rows[i].vec, rows[j].vec);
        if (weight >= floor) links.push({ a: rows[i].id, b: rows[j].id, weight: Number(weight.toFixed(3)) });
      }
    }
    links.sort((x, y) => y.weight - x.weight);
    const degree = new Map();
    return links.filter((link) => {
      const da = degree.get(link.a) ?? 0;
      const db = degree.get(link.b) ?? 0;
      if (da >= maxPerNode || db >= maxPerNode) return false;
      degree.set(link.a, da + 1);
      degree.set(link.b, db + 1);
      return true;
    });
  }

  maxMemoryId() { return this.#db.prepare('SELECT COALESCE(MAX(id), 0) AS n FROM memories').get().n; }

  // Notes an agent wrote after a point: what a turn saved through memory_note.
  notesSince(id, { agent = null } = {}) {
    const rows = agent
      ? this.#db.prepare('SELECT id, created, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, sources, agent, origin, message_id AS messageId FROM memories WHERE id > ? AND agent = ? ORDER BY id').all(id, agent)
      : this.#db.prepare('SELECT id, created, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, sources, agent, origin, message_id AS messageId FROM memories WHERE id > ? ORDER BY id').all(id);
    return rows.map((row) => ({ ...row, sources: JSON.parse(row.sources) }));
  }

  memories({ limit = 50, kind = null } = {}) {
    if (kind) {
      return this.#db.prepare('SELECT id, created, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, sources, agent, origin, message_id AS messageId, recalled, last_recalled AS lastRecalled FROM memories WHERE kind = ? ORDER BY id DESC LIMIT ?').all(kind, limit)
        .map((row) => ({ ...row, sources: JSON.parse(row.sources) }));
    }
    return this.#db.prepare('SELECT id, created, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, sources, agent, origin, message_id AS messageId, recalled, last_recalled AS lastRecalled FROM memories ORDER BY id DESC LIMIT ?').all(limit)
      .map((row) => ({ ...row, sources: JSON.parse(row.sources) }));
  }

  // Distilled memories for a request: the ones matching its terms (rarity
  // weighted, like entries) and, when few match, the most recent decisions and
  // preferences, all from before `beforeSequence` so they add to the window
  // rather than repeat it, within a character budget.
  // `fallback` fills a thin match with the latest decisions and preferences; @madre turns it off to stay honest.
  recallMemories(text, { beforeSequence = Number.MAX_SAFE_INTEGER, limit = 6, maxChars = 1200, queryVector = null, semanticFloor = 0.45, fallback = true, track = true } = {}) {
    if (!this.#db) return [];
    const total = this.memoryCount();
    if (!total) return [];
    const terms = queryTerms(text);
    const semantic = this.#semanticScores('memory_vectors', 'id', queryVector, { beforeSequence, floor: semanticFloor });
    const scores = new Map();
    const lookup = this.#db.prepare('SELECT m.id FROM memories_fts JOIN memories m ON m.id = memories_fts.rowid WHERE memories_fts MATCH ? AND m.through_sequence < ? LIMIT 500');
    for (const term of terms) {
      let rows;
      try { rows = lookup.all(`"${term.replaceAll('"', '""')}"`, beforeSequence); } catch { continue; }
      if (!rows.length || (terms.length > 1 && rows.length > Math.max(8, total * 0.35))) continue;
      const weight = Math.log(1 + total / rows.length) * (1 + Math.min(term.length, 12) / 12);
      for (const { id } of rows) scores.set(id, (scores.get(id) ?? 0) + weight);
    }
    const ids = RoomMemory.fuse(scores, semantic).map(([id]) => id);
    if (fallback && ids.length < 2) {
      const recent = this.#db.prepare("SELECT id FROM memories WHERE through_sequence < ? AND kind IN ('decision', 'preference') ORDER BY id DESC LIMIT ?").all(beforeSequence, limit);
      for (const { id } of recent) if (!ids.includes(id)) ids.push(id);
    }
    const fetch = this.#db.prepare('SELECT id, created, kind, text, from_sequence AS fromSequence, through_sequence AS throughSequence, sources, agent, origin, message_id AS messageId FROM memories WHERE id = ?');
    const chosen = [];
    let remaining = Math.max(0, maxChars);
    for (const id of ids) {
      if (chosen.length >= limit) break;
      const row = fetch.get(id);
      if (!row) continue;
      const cost = row.text.length + 24;
      if (cost > remaining) continue;
      remaining -= cost;
      chosen.push({ ...row, sources: JSON.parse(row.sources) });
    }
    // A note that just travelled into a turn has been used: the archive counts it, so the room
    // can tell which memories it actually leans on.
    if (track && chosen.length) this.#markRecalled(chosen.map((note) => note.id));
    return chosen.sort((a, b) => a.fromSequence - b.fromSequence || a.id - b.id);
  }

  #markRecalled(ids) {
    try {
      const now = new Date().toISOString();
      const mark = this.#db.prepare('UPDATE memories SET recalled = recalled + 1, last_recalled = ? WHERE id = ?');
      this.#db.exec('BEGIN');
      try { for (const id of ids) mark.run(now, id); this.#db.exec('COMMIT'); } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    } catch (error) { console.error(`MADRE could not count a recall: ${error.message}`); }
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
        // MADRE's canned replies are not the room's knowledge; they never enter the archive.
        if (event.payload?.synthetic) continue;
        const entry = messageEntry(event);
        if (!entry) continue;
        const result = this.#insert.run(event.sequence, event.id ?? `seq-${event.sequence}`, event.timestamp ?? null, event.type, entry.role, entry.sender, entry.target ?? null, entry.messageId ?? null, this.#guard(entry.text));
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
  recall(text, { beforeSequence = Number.MAX_SAFE_INTEGER, excludeMessageId = null, limit = 6, maxChars = 4000, excerptChars = 360, queryVector = null, semanticFloor = 0.45 } = {}) {
    const terms = queryTerms(text);
    if (!this.#db) return { terms, entries: [], omitted: 0 };
    const total = this.count();
    if (!total) return { terms, entries: [], omitted: 0 };
    const semantic = this.#semanticScores('entry_vectors', 'sequence', queryVector, { beforeSequence, floor: semanticFloor });
    if (!terms.length && !semantic.size) return { terms, entries: [], omitted: 0 };
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
    if (!scores.size && !semantic.size) return { terms, entries: [], omitted: 0 };
    const ranked = RoomMemory.fuse(scores, semantic).slice(0, limit * 4);
    const fetch = this.#db.prepare('SELECT sequence, timestamp, type, role, sender, target, message_id AS messageId, text FROM entries WHERE sequence = ?');
    const chosen = [];
    let remaining = Math.max(0, maxChars);
    let seen = 0;
    for (const [sequence, score] of ranked) {
      const row = fetch.get(sequence);
      if (!row || (excludeMessageId && row.messageId === excludeMessageId)) continue;
      seen += 1;
      if (chosen.length >= limit) break;
      const text2 = excerpt(row.text, matchedTerms.length ? matchedTerms : terms, { maxChars: excerptChars });
      const cost = text2.length + 48;
      if (cost > remaining) continue;
      remaining -= cost;
      chosen.push({ sequence: row.sequence, timestamp: row.timestamp, type: row.type, role: row.role, sender: row.sender, target: row.target, messageId: row.messageId, excerpt: text2, score, semantic: semantic.get(row.sequence) ?? 0 });
    }
    chosen.sort((a, b) => a.sequence - b.sequence);
    return { terms: matchedTerms, entries: chosen, omitted: Math.max(0, seen - chosen.length), semantic: semantic.size > 0 };
  }

  close() {
    this.#db?.close();
    this.#db = null;
  }
}

export function normalizeMemory(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// The block an agent reads for distilled memories: kind, where it came from, the note.
export function formatMemories(list) {
  if (!list?.length) return '';
  return list.map((memory) => {
    const span = memory.fromSequence === memory.throughSequence ? `#${memory.fromSequence}` : `#${memory.fromSequence}–#${memory.throughSequence}`;
    return `- [${memory.kind} · ${span}] ${memory.text}`;
  }).join('\n');
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
