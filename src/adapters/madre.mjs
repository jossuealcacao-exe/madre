// @madre: the room's own intelligence. A local model (Ollama) that answers
// from what the room remembers: the whole archive, not only the recent window,
// plus the files the human points at. It never writes, never delegates, never
// leaves the machine. It grows as the memory grows.

import { ollamaGenerate } from '../ollama.mjs';

export const MADRE_AGENT_ID = 'madre';
export const MADRE_ADAPTER = 'madre-local';

export function madreAgent(ollama, { enabled = true } = {}) {
  const ready = Boolean(enabled && ollama?.running && ollama.chatModel);
  return { id: MADRE_AGENT_ID, label: 'MADRE', detected: Boolean(ollama?.running), ready, adapter: MADRE_ADAPTER, path: null, version: ollama?.chatModel ?? null, local: true };
}

const SYSTEM = `You are @madre, the memory of this MADRE project room, running locally on this machine. You speak only for what the room has said and decided.
Rules:
1. Answer the question directly in the first sentence, then the supporting facts. Brief.
2. Use only the ARCHIVE and the RECENT TRANSCRIPT you are given. Every fact taken from them ends with its sequence, like [#123].
3. If they contain nothing on the point, say exactly that the room never discussed it, and stop. Do not guess, do not propose plans, do not invent files, decisions or dates.
4. You cannot read or change files, run commands or browse. If that is needed, name the agent of the room that can (@codex, @claude, @gemini, @opencode).
5. Answer in the language the human wrote in.`;

// The room's briefing is written for CLIs with tools; @madre gets only what it can use:
// the recent transcript, the archive, the question.
export function briefingFor({ prompt, text, archive }) {
  const transcript = prompt.match(/<context>\n([\s\S]*?)\n<\/context>/)?.[1] ?? '';
  return [
    transcript ? `RECENT TRANSCRIPT (oldest first):\n${transcript}` : null,
    `ARCHIVE (what the room remembers that matches the question; notes first, then exact quotes):\n${archive || '(nothing in the archive matches this question)'}`,
    // Small models weigh the last thing they read: the identity goes here too, after
    // thousands of characters spoken by Claude, Codex, Gemini and OpenCode.
    REMINDER,
    `QUESTION FROM THE HUMAN:\n${text}`,
  ].filter(Boolean).join('\n\n');
}

const REMINDER = `REMINDER: You are @madre, the local memory of this room. You are not Claude, Codex, Gemini or OpenCode; the quotes above are theirs, not yours. Never claim to be another assistant or company. Answer as @madre, from the archive only.`;

// Orders @madre cannot carry out: convening, delegating, running, writing. They are answered
// here, in the human's language, without calling the model. Questions pass through.
const ACTION_ES = /(^|[\s,.;:!¡])(convoca|convócalos|convócala|reúne|reune|delega|coordina|pídele|pidele|pídeles|pideles|dile|diles|ordena|manda|envía|envia|ejecuta|corre|instala|implementa|refactoriza|despliega|escribe|crea|modifica|edita|borra|elimina|genera|haz|hazlo|realiza|lanza|arranca|reinicia|configura|publica|sube)\b/i;
const ACTION_EN = /(^|[\s,.;:!])(convene|summon|gather|schedule|delegate|coordinate|ask @|tell @|order|run|execute|install|implement|refactor|deploy|write|create|modify|edit|delete|remove|generate|build|commit|push|publish|launch|restart|configure|make (?:a|the|it)|call a meeting|set up)\b/i;
const QUESTION = /[?¿]|(^|[^\p{L}])(qué|cuál|cuáles|cuándo|dónde|quién|quiénes|cómo|por qué|what|which|when|where|who|how|why|did|do we|have we|is there)(?!\p{L})/iu;
const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|una?|que|para|con|de|todos|reunión|reunion)\b/i;

export function actionRequest(text = '') {
  const body = String(text).trim().replace(/^@?madre[,:]?\s*/i, '').replace(/^\p{L}+,\s*/u, '');
  if (!body || QUESTION.test(body)) return null;
  if (!ACTION_ES.test(body) && !ACTION_EN.test(body)) return null;
  return SPANISH.test(body)
    ? 'Solo respondo desde la memoria de la sala: no convoco, no delego, no ejecuto ni escribo. Para eso escríbele a @codex, @claude, @gemini u @opencode, los que estén en la fila. Si quieres, pregúntame qué recuerda la sala sobre esto y te lo cito.'
    : 'I only answer from the room\'s memory: I do not convene, delegate, run or write. For that, write to @codex, @claude, @gemini or @opencode, whichever is in the row. If you like, ask me what the room remembers about this and I will quote it.';
}

const NO_USAGE = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0, source: 'madre', local: true };

// What the whole archive says about this request: notes first, then exact quotes.
export async function gather(memory, text, { maxChars = 7000 } = {}) {
  if (!memory) return { notes: [], quotes: [], text: '' };
  const queryVector = await memory.embedQuery(text);
  const notes = memory.recallMemories(text, { limit: 12, maxChars: Math.floor(maxChars * 0.35), queryVector, fallback: false });
  const spent = notes.reduce((sum, note) => sum + note.text.length + 24, 0);
  const recall = memory.recall(text, { limit: 12, maxChars: maxChars - spent, excerptChars: 420, queryVector });
  const lines = [
    ...notes.map((note) => `- [note · ${note.kind} · #${note.fromSequence}–#${note.throughSequence}] ${note.text}`),
    ...recall.entries.map((entry) => `[#${entry.sequence} · ${(entry.timestamp ?? '').slice(0, 16).replace('T', ' ')} · ${entry.role === 'command' ? entry.sender : `@${entry.sender}`}] ${entry.excerpt}`),
  ];
  return { notes, quotes: recall.entries, text: lines.join('\n') };
}

// The invoker the room calls like any adapter. `text` is the human's request; `prompt` the room's full briefing.
export function madreInvoker({ memory, ollama, fetchImpl = globalThis.fetch }) {
  return async ({ prompt, text = '', timeoutMs = 180000, model = null }) => {
    const state = typeof ollama === 'function' ? ollama() : ollama;
    if (!state?.running || !state.chatModel) throw new Error('@madre needs Ollama running with a chat model. Open MODULES → OLLAMA.');
    const question = text || prompt.match(/User message: ([\s\S]*)$/)?.[1] || prompt.slice(-2000);
    const declined = actionRequest(question);
    if (declined) return { text: declined, usage: { ...NO_USAGE }, grounded: { notes: 0, quotes: 0 }, declined: 'action' };
    const archive = await gather(memory, question);
    const briefing = briefingFor({ prompt, text: question, archive: archive.text });
    const answer = await ollamaGenerate({ host: state.host, model: model ?? state.chatModel, system: SYSTEM, prompt: briefing, fetchImpl, timeoutMs, temperature: 0.1 });
    return { text: answer.text, usage: { ...answer.usage, local: true }, grounded: { notes: archive.notes.length, quotes: archive.quotes.length } };
  };
}
