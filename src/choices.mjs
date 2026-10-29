// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// An agent asking the human to choose.
//
// The room already has one fenced channel, ```pulse, and it puts other agents to work. This is
// its inert sibling: ```pulse-ask carries a question and the options an agent sees, and running
// it does nothing at all. MADRE renders the options under the answer; pressing one writes that
// option into the composer as the human's next message. Nothing is sent, nothing is decided and
// no turn is spent until the human presses.
//
// Separate from the delegation parser on purpose. That one is load-bearing — it starts real
// turns with real permissions — and a question is not a step. Teaching it a second grammar would
// put a parser that can spend money in the path of a parser that cannot.
//
//   ```pulse-ask
//   Where should the exported dataset live?
//   - In the project, so it travels with the repository (recommended)
//   - Beside the room log, with the rest of the archive
//   - Somewhere the human names each time
//   ```
//
// Two options are a yes/no, which a sentence already handles; the block earns its place from
// three. Above six it is a list, not a choice, and the room says so by refusing it.
//
// One option may carry the agent's own pick: "(recommended)" at the end of the line, in either
// language, or a ★ in front. An agent that asks without saying what it would do has handed the
// human the whole decision and kept the half it was asked for, so the briefing requires it; the
// parser only reads it, and a choice that forgot still reaches the human.

export const MIN_OPTIONS = 3;
export const MAX_OPTIONS = 6;
// Long enough for the option an agent actually writes — the reported one was cut at 120 in the
// middle of a word, and the half that was missing was the half that made it an option. Past
// this it is a paragraph, and it is cut at a word with an ellipsis rather than mid-letter.
const MAX_QUESTION = 300;
const MAX_OPTION = 320;

const RECOMMENDED = /\s*[(\[]\s*(?:recommended|recomendad[ao]|sugerid[ao])\s*[)\]]\s*$/i;
const STAR = /^[★☆⭐]\s*/;
// The mode an option needs, written by the agent at its end: (#3), [#2 CREATE], #4. Below #1
// nothing needs saying; an option that changes the project says which permission it will take,
// so the human sees it before pressing rather than after the agent refuses.
const MODE = /\s*[(\[]?\s*#([0-4])(?:\s+[A-Za-z]+)?\s*[)\]]?\s*$/;

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

// The last ```pulse-ask block of a reply, if it closes the reply. Returns null for anything
// else: a block quoted mid-answer is an example, and an example is not a question.
export function parseChoice(text) {
  const source = String(text ?? '');
  const blocks = [...source.matchAll(/```pulse-ask\s*\n([\s\S]*?)```/gi)];
  if (!blocks.length) return null;
  const last = blocks.at(-1);
  if (source.slice(last.index + last[0].length).trim()) return null;

  const lines = last[1].split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  const question = lines[0].startsWith('-') ? null : clip(lines[0], MAX_QUESTION);
  const options = [];
  const seen = new Set();
  let recommended = null;
  const modes = [];
  for (const line of lines.slice(question ? 1 : 0)) {
    const match = line.match(/^[-*•]\s+(.+)$/);
    if (!match) continue;
    let label = match[1].trim();
    // The two marks come in either order: «… (#3) (recommended)» or «… (recommended) #3».
    let marked = STAR.test(label);
    let mode = null;
    label = label.replace(STAR, '');
    for (let pass = 0; pass < 2; pass += 1) {
      if (RECOMMENDED.test(label)) { marked = true; label = label.replace(RECOMMENDED, ''); }
      const found = label.match(MODE);
      if (found && mode === null) { mode = Number(found[1]); label = label.replace(MODE, ''); }
    }
    label = clip(label.trim(), MAX_OPTION);
    // The same option twice is a mistake, and a choice that offers it twice reads as rigged.
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    // Only the first mark counts: two recommendations are no recommendation, but dropping both
    // would punish the agent for the half it got right.
    if (marked && recommended === null) recommended = options.length;
    options.push(label);
    modes.push(mode);
  }
  if (!question) return null;
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return null;
  // Modes travel only when an option has one: a choice that is all talk carries no column of nulls.
  return { question, options, recommended, ...(modes.some((mode) => mode !== null) ? { modes } : {}) };
}

// What the reply reads as once the block has been lifted out of it: the room shows the question
// as bubbles, so leaving the raw fence in the text would say everything twice.
export function withoutChoice(text) {
  const source = String(text ?? '');
  if (!parseChoice(source)) return source;
  const last = [...source.matchAll(/```pulse-ask\s*\n[\s\S]*?```/gi)].at(-1);
  return source.slice(0, last.index).trimEnd();
}
