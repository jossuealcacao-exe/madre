// The archivist's turn: every so often the cheapest agent in the room reads
// the exchanges nobody has distilled yet and writes the few notes worth
// keeping for every later turn. Pure functions here; the room schedules and
// invokes. Nothing in this file talks to a model.

import { MEMORY_KINDS } from './memory.mjs';

// Cheapest first, by the models these CLIs run by default.
export const DISTILLER_ORDER = ['gemini', 'opencode', 'codex', 'claude'];
export const MAX_MEMORIES_PER_RUN = 5;
export const MAX_MEMORY_CHARS = 240;

// The agent that pays for distillation: the human's pick if it is usable, else
// the cheapest ready one that has an adapter and no turn in flight.
export function pickDistiller(agents, { preferred = null, busy = new Set(), invokers = null } = {}) {
  const usable = (agent) => agent?.detected && agent.ready && !busy.has(agent.id) && (!invokers || Boolean(invokers[agent.adapter]));
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

export function distillPrompt({ entries, projectName = 'the project', existing = [] }) {
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
    'Skip greetings, restatements, transient status, anything a reader of the code would see anyway, and anything the exchanges do not actually establish.',
    `Output only JSON lines, one object per memory, at most ${MAX_MEMORIES_PER_RUN}, nothing else:`,
    `{"kind":"decision|fact|preference|question","text":"one self-contained sentence in the language the room uses, at most ${MAX_MEMORY_CHARS} characters, naming files, agents and numbers exactly","sources":[sequence numbers it comes from]}`,
    'If nothing durable was said, output exactly: NONE',
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
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim().replace(/^```(?:json)?$|^```$/g, '').replace(/^[-*]\s+/, '');
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start < 0 || end <= start) continue;
    let parsed;
    try { parsed = JSON.parse(line.slice(start, end + 1)); } catch { continue; }
    if (!parsed || typeof parsed !== 'object') continue;
    const memoryText = String(parsed.text ?? '').replace(/\s+/g, ' ').trim();
    if (!memoryText) continue;
    const kind = MEMORY_KINDS.includes(parsed.kind) ? parsed.kind : 'fact';
    const inRange = (n) => Number.isInteger(n) && (fromSequence == null || n >= fromSequence) && (throughSequence == null || n <= throughSequence);
    const sources = (Array.isArray(parsed.sources) ? parsed.sources : []).map(Number).filter(inRange);
    const key = memoryText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    memories.push({ kind, text: memoryText.length > MAX_MEMORY_CHARS ? `${memoryText.slice(0, MAX_MEMORY_CHARS - 1)}…` : memoryText, sources });
    if (memories.length >= MAX_MEMORIES_PER_RUN) break;
  }
  return memories;
}
