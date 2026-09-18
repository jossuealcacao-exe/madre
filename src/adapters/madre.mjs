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

const SYSTEM = `You are @madre, the memory of this MADRE project room, running locally. You speak for what the room has said and decided, nothing more.
Rules: answer from the archive below and from the transcript in the message; when the archive has nothing on a point, say plainly that the room never discussed it. Cite ledger sequences like [#123] for every fact you take from the archive. Never invent files, decisions or dates. You cannot read or change files, run commands or browse; if the human needs that, name which agent of the room can. Answer in the language the human wrote in, briefly.`;

// What the whole archive says about this request: notes first, then exact quotes.
export async function gather(memory, text, { maxChars = 7000 } = {}) {
  if (!memory) return { notes: [], quotes: [], text: '' };
  const queryVector = await memory.embedQuery(text);
  const notes = memory.recallMemories(text, { limit: 12, maxChars: Math.floor(maxChars * 0.35), queryVector });
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
    const archive = await gather(memory, text || prompt.slice(-2000));
    const briefing = `${prompt}\n\n<archive>\n${archive.text || '(the archive has nothing that matches this request)'}\n</archive>`;
    const answer = await ollamaGenerate({ host: state.host, model: model ?? state.chatModel, system: SYSTEM, prompt: briefing, fetchImpl, timeoutMs, temperature: 0.1 });
    return { text: answer.text, usage: { ...answer.usage, local: true }, grounded: { notes: archive.notes.length, quotes: archive.quotes.length } };
  };
}
