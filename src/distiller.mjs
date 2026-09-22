// The archivist's turn: every so often the cheapest agent in the room reads
// the exchanges nobody has distilled yet and writes the few notes worth
// keeping for every later turn. Pure functions here; the room schedules and
// invokes. Nothing in this file talks to a model.

import { ABERRATION, MEMORY_KINDS } from './memory.mjs';

// Cheapest first, by the models these CLIs run by default.
// Ollama, when the room has it, is the cheapest of all: local and free.
export const DISTILLER_ORDER = ['ollama', 'gemini', 'opencode', 'codex', 'claude'];
export const OLLAMA_ARCHIVIST = { id: 'ollama', label: 'Ollama', detected: true, ready: true, adapter: 'ollama', path: null, version: null, local: true };
export const MAX_MEMORIES_PER_RUN = 5;
export const MAX_MEMORY_CHARS = 240;

// The agent that pays for distillation: the human's pick if it is usable, else
// the cheapest ready one that has an adapter and no turn in flight.
// `benched` holds agents that failed recently: they sit out until their bench time passes.
export function pickDistiller(agents, { preferred = null, busy = new Set(), invokers = null, benched = new Set() } = {}) {
  const usable = (agent) => agent?.detected && agent.ready && !busy.has(agent.id) && !benched.has(agent.id) && (!invokers || Boolean(invokers[agent.adapter]));
  if (preferred) {
    const chosen = agents.find((agent) => agent.id === preferred);
    if (usable(chosen)) return chosen;
  }
  for (const id of DISTILLER_ORDER) {
    const chosen = agents.find((agent) => agent.id === id);
    if (usable(chosen)) return chosen;
  }
  return agents.find(usable) ?? null;
}

export function distillPrompt({ entries, projectName = 'the project', existing = [], json = false }) {
  const transcript = entries.map((entry) => {
    const who = entry.role === 'command' ? entry.sender : `@${entry.sender}`;
    const to = entry.target && entry.target !== 'room' ? ` → ${entry.target === 'you' ? 'human' : `@${entry.target}`}` : '';
    return `[#${entry.sequence} · ${who} (${entry.role})${to}] ${entry.text}`;
  }).join('\n\n');
  const known = existing.length ? `\nAlready remembered (do not repeat these):\n${existing.map((memory) => `- ${memory.text}`).join('\n')}\n` : '';
  return [
    `You are the archivist of a MADRE project room for "${projectName}", shared by a human and several AI agents. Do not read or modify any file: everything you need is below.`,
    'Read these room exchanges (each stamped with its ledger sequence) and write only the memories worth keeping for future turns of any agent:',
    `- decision: something the human or the room settled on (what and, briefly, why)`,
    `- fact: a verified statement about the project or its environment that is not obvious from the code`,
    `- preference: how the human wants things done or said`,
    `- question: something left open that a later turn should not forget`,
    `- aberration: a claim the exchanges themselves showed to be false. Only when it was refuted out loud: someone stated something about this project and someone else corrected it, or the exchanges proved it wrong. Put the false claim in "text" and what turned out to be true in "correction". Never guess, never file a disagreement of opinion, and never file something merely unverified.`,
    'Skip greetings, restatements, transient status, anything a reader of the code would see anyway, and anything the exchanges do not actually establish.',
    json
      ? `Output one JSON object and nothing else: {"memories":[...]} with at most ${MAX_MEMORIES_PER_RUN} items, each {"kind":"${MEMORY_KINDS.join('|')}","text":"one self-contained sentence in the language the room uses, at most ${MAX_MEMORY_CHARS} characters, naming files, agents and numbers exactly","correction":"only on an aberration: what is true instead","sources":[sequence numbers it comes from]}. If nothing durable was said: {"memories":[]}`
      : `Output only JSON lines, one object per memory, at most ${MAX_MEMORIES_PER_RUN}, nothing else:`,
    json ? null : `{"kind":"${MEMORY_KINDS.join('|')}","text":"one self-contained sentence in the language the room uses, at most ${MAX_MEMORY_CHARS} characters, naming files, agents and numbers exactly","correction":"only on an aberration: what is true instead","sources":[sequence numbers it comes from]}`,
    json ? null : 'If nothing durable was said, output exactly: NONE',
    known,
    '<exchanges>',
    transcript,
    '</exchanges>',
  ].filter((line) => line !== null && line !== undefined).join('\n');
}

// Whatever came back, only the well-formed memories survive: known kinds,
// non-empty text within the limit, sources inside the batch.
export function parseDistillation(text, { fromSequence, throughSequence } = {}) {
  const memories = [];
  const seen = new Set();
  // A whole JSON object with a memories array (what local models return under format=json) is unrolled into lines.
  let source = String(text ?? '');
  const object = source.trim().match(/^\{[\s\S]*\}$/);
  if (object) {
    try { const parsed = JSON.parse(object[0]); if (Array.isArray(parsed?.memories)) source = parsed.memories.map((item) => JSON.stringify(item)).join('\n'); } catch { /* fall through: line by line */ }
  }
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim().replace(/^```(?:json)?$|^```$/g, '').replace(/^[-*]\s+/, '');
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start < 0 || end <= start) continue;
    let parsed;
    try { parsed = JSON.parse(line.slice(start, end + 1)); } catch { continue; }
    if (!parsed || typeof parsed !== 'object') continue;
    const memoryText = String(parsed.text ?? '').replace(/\s+/g, ' ').trim();
    if (!memoryText) continue;
    // An unknown kind used to be filed as a fact. That was harmless while every kind was
    // knowledge; now the list has one that is not, and a typo would turn a hallucination into
    // something the room believes. Anything unrecognised is dropped instead.
    if (!MEMORY_KINDS.includes(parsed.kind)) continue;
    const kind = parsed.kind;
    const inRange = (n) => Number.isInteger(n) && (fromSequence == null || n >= fromSequence) && (throughSequence == null || n <= throughSequence);
    const sources = (Array.isArray(parsed.sources) ? parsed.sources : []).map(Number).filter(inRange);
    const key = memoryText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const clip = (value) => (value.length > MAX_MEMORY_CHARS ? `${value.slice(0, MAX_MEMORY_CHARS - 1)}…` : value);
    const correction = kind === ABERRATION ? clip(String(parsed.correction ?? '').replace(/\s+/g, ' ').trim()) : '';
    memories.push({ kind, text: clip(memoryText), sources, ...(correction ? { correction } : {}) });
    if (memories.length >= MAX_MEMORIES_PER_RUN) break;
  }
  return memories;
}
