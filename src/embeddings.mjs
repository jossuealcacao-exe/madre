// Embeddings for the room memory: meaning-aware recall on top of the lexical
// index. Gemini's embedding model through the user's own key (the same key
// Image Studio and the Gemini CLI use); no key, no embeddings, and recall stays
// lexical. PULSE_EMBED_FAKE=1 swaps in a deterministic local embedder so tests
// never call Google.

export const DEFAULT_EMBED_MODEL = 'gemini-embedding-001';
export const DEFAULT_EMBED_DIMS = 768;
const MAX_TEXT_CHARS = 2000;   // one entry is embedded from its first 2000 characters
const BATCH = 100;             // batchEmbedContents accepts up to 100 requests

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function toBlob(vector) { return Buffer.from(Float32Array.from(vector).buffer); }
export function fromBlob(blob) {
  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

// Hashed word and trigram bag, unit length: stable, local, good enough to test the plumbing.
export function fakeEmbedding(text, dims = 64) {
  const vector = new Float32Array(dims);
  const clean = String(text ?? '').toLowerCase();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  for (const word of clean.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2)) {
    vector[hash(word) % dims] += 1;
    for (let i = 0; i + 3 <= word.length; i += 1) vector[hash(word.slice(i, i + 3)) % dims] += 0.35;
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

async function geminiEmbed(texts, { key, model, dims, query, fetchImpl, timeoutMs }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${encodeURIComponent(key)}`;
  const out = [];
  for (let start = 0; start < texts.length; start += BATCH) {
    const slice = texts.slice(start, start + BATCH);
    const body = {
      requests: slice.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text: String(text ?? '').slice(0, MAX_TEXT_CHARS) || ' ' }] },
        taskType: query ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: dims,
      })),
    };
    const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`Gemini embeddings HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    const vectors = payload?.embeddings ?? [];
    if (vectors.length !== slice.length) throw new Error(`Gemini embeddings returned ${vectors.length} vectors for ${slice.length} texts.`);
    for (const item of vectors) out.push(Float32Array.from(item.values ?? []));
  }
  return out;
}

// The embedder the memory uses: { model, dims, embed(texts, { query }) } or null when off.
export function createEmbedder({ key = null, env = process.env, fetchImpl = globalThis.fetch, timeoutMs = Number(env.PULSE_EMBED_TIMEOUT_MS ?? 8000) } = {}) {
  if (env.PULSE_EMBED === '0') return null;
  if (env.PULSE_EMBED_FAKE === '1') {
    return { model: 'fake-64', dims: 64, embed: async (texts) => texts.map((text) => fakeEmbedding(text)) };
  }
  if (!key) return null;
  const model = env.PULSE_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
  const dims = Number(env.PULSE_EMBED_DIMS ?? DEFAULT_EMBED_DIMS);
  return { model: `${model}@${dims}`, dims, embed: (texts, { query = false } = {}) => geminiEmbed(texts, { key, model, dims, query, fetchImpl, timeoutMs }) };
}
