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
    `QUESTION FROM THE HUMAN:\n${text}`,
  ].filter(Boolean).join('\n\n');
}

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
    const archive = await gather(memory, question);
    const briefing = briefingFor({ prompt, text: question, archive: archive.text });
    const answer = await ollamaGenerate({ host: state.host, model: model ?? state.chatModel, system: SYSTEM, prompt: briefing, fetchImpl, timeoutMs, temperature: 0.1 });
    return { text: answer.text, usage: { ...answer.usage, local: true }, grounded: { notes: archive.notes.length, quotes: archive.quotes.length } };
  };
}
