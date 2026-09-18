// Ollama: the local intelligence MADRE leans on when it is there. Embeddings
// for recall by meaning and a model to distil memories, both on this machine,
// so remembering costs no tokens elsewhere and nothing leaves. Nothing here is
// required: without Ollama every path falls back to what it did before.

export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
// Embedding models we know how to talk to, best first.
export const EMBED_MODELS = ['nomic-embed-text', 'mxbai-embed-large', 'snowflake-arctic-embed', 'all-minilm', 'bge-m3'];
// Chat models that follow instructions well enough to distil, best first for a 16 GB machine.
// General chat models first: @madre speaks for the room in the human's language, and coder
// models drift into other voices. A coder is taken only when nothing else is there.
export const CHAT_MODELS = ['qwen2.5:7b', 'llama3.1:8b', 'gemma3:4b', 'qwen2.5:3b', 'llama3.2:3b', 'qwen2.5:1.5b', 'llama3.2:1b', 'qwen2.5-coder:7b', 'qwen2.5-coder:1.5b'];
// Ollama's default window is 4k tokens and it drops the OLDEST text when a prompt overflows:
// the system prompt goes first. Every MADRE call asks for a wider window.
export const DEFAULT_NUM_CTX = 8192;
export const RECOMMENDED = { embed: 'nomic-embed-text', chat: 'qwen2.5:3b' };

export function ollamaHost(env = process.env) {
  return (env.PULSE_OLLAMA_HOST ?? env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST).replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'http://');
}

const isEmbedModel = (model) => EMBED_MODELS.some((name) => model.name.startsWith(name)) || /embed|minilm|bge/i.test(model.name) || /bert|nomic/i.test(model.details?.family ?? '');
function pick(models, preferred, env) {
  const names = models.map((model) => model.name);
  const bare = (name) => name.replace(/:latest$/, '');
  if (env && names.some((name) => bare(name) === bare(env))) return names.find((name) => bare(name) === bare(env));
  for (const want of preferred) { const hit = names.find((name) => bare(name) === want || bare(name).startsWith(`${want}`)); if (hit) return hit; }
  return names[0] ?? null;
}

// Is Ollama there, and what can it do? Quick, never throws.
export async function probeOllama({ host = ollamaHost(), fetchImpl = globalThis.fetch, timeoutMs = 1500, env = process.env } = {}) {
  try {
    const response = await fetchImpl(`${host}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { running: false, host, models: [], embedModel: null, chatModel: null, error: `HTTP ${response.status}` };
    const payload = await response.json();
    const models = (payload.models ?? []).map((model) => ({ name: model.name, size: model.size ?? 0, family: model.details?.family ?? '', details: model.details ?? {} }));
    const embeds = models.filter(isEmbedModel);
    const chats = models.filter((model) => !isEmbedModel(model));
    return {
      running: true, host, models,
      embedModel: pick(embeds, EMBED_MODELS, env.PULSE_OLLAMA_EMBED_MODEL),
      chatModel: pick(chats, CHAT_MODELS, env.PULSE_OLLAMA_MODEL),
    };
  } catch (error) {
    return { running: false, host, models: [], embedModel: null, chatModel: null, error: error.message };
  }
}

// An embedder the memory understands: { model, dims, embed(texts, { query }) }.
// nomic wants a task prefix; the others take the text as it is.
export function ollamaEmbedder({ host = ollamaHost(), model, fetchImpl = globalThis.fetch, timeoutMs = 60000 } = {}) {
  if (!model) return null;
  const nomic = model.startsWith('nomic');
  return {
    model: `ollama:${model}`,
    dims: null,
    local: true,
    async embed(texts, { query = false } = {}) {
      const input = texts.map((text) => `${nomic ? (query ? 'search_query: ' : 'search_document: ') : ''}${String(text ?? '').slice(0, 2000) || ' '}`);
      const response = await fetchImpl(`${host}/api/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, input }), signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`Ollama embeddings HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`);
      const payload = await response.json();
      const vectors = payload.embeddings ?? [];
      if (vectors.length !== texts.length) throw new Error(`Ollama returned ${vectors.length} vectors for ${texts.length} texts.`);
      return vectors.map((values) => Float32Array.from(values));
    },
  };
}

// One answer from a local model. `json: true` asks Ollama for a JSON object.
export async function ollamaGenerate({ host = ollamaHost(), model, prompt, system = null, json = false, fetchImpl = globalThis.fetch, timeoutMs = 180000, temperature = 0.2, numCtx = DEFAULT_NUM_CTX } = {}) {
  const started = Date.now();
  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
  const response = await fetchImpl(`${host}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false, options: { temperature, num_ctx: numCtx }, ...(json ? { format: 'json' } : {}) }), signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`);
  const payload = await response.json();
  const inputTokens = payload.prompt_eval_count ?? 0;
  const outputTokens = payload.eval_count ?? 0;
  return {
    text: String(payload.message?.content ?? '').trim(),
    usage: { inputTokens, outputTokens, cachedInputTokens: 0, reasoningTokens: 0, totalTokens: inputTokens + outputTokens, costUsd: 0, source: 'ollama', local: true, model },
    elapsedMs: Date.now() - started,
  };
}

// The shape the room's invokers have: ({ prompt, timeoutMs }) → { text, usage }.
export function ollamaInvoker({ host = ollamaHost(), model, fetchImpl = globalThis.fetch } = {}) {
  if (!model) return null;
  return async ({ prompt, timeoutMs = 180000, json = false }) => ollamaGenerate({ host, model, prompt, json, fetchImpl, timeoutMs });
}

// Pulls a model, reporting progress lines as Ollama streams them.
export async function pullModel({ host = ollamaHost(), model, fetchImpl = globalThis.fetch, onLine = () => {}, timeoutMs = 30 * 60 * 1000 } = {}) {
  const response = await fetchImpl(`${host}/api/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, stream: true }), signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Ollama pull HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastStatus = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event.error) throw new Error(event.error);
      const status = event.total ? `${event.status} · ${Math.round((event.completed ?? 0) / event.total * 100)}%` : event.status;
      if (status && status !== lastStatus) { lastStatus = status; onLine(status); }
    }
  }
  return { model };
}
