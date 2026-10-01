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
//   - Beside the room log, with the rest of the archive
//   - In the project, so it travels with the repository
//   - Somewhere the human names each time
//   ```
//
// Two options are a yes/no, which a sentence already handles; the block earns its place from
// three. Above six it is a list, not a choice, and the room says so by refusing it.

export const MIN_OPTIONS = 3;
export const MAX_OPTIONS = 6;
const MAX_QUESTION = 200;
const MAX_OPTION = 120;

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
  const question = lines[0].startsWith('-') ? null : lines[0].slice(0, MAX_QUESTION);
  const options = [];
  const seen = new Set();
  for (const line of lines.slice(question ? 1 : 0)) {
    const match = line.match(/^[-*•]\s+(.+)$/);
    if (!match) continue;
    const label = match[1].trim().slice(0, MAX_OPTION);
    // The same option twice is a mistake, and a choice that offers it twice reads as rigged.
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    options.push(label);
  }
  if (!question) return null;
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return null;
  return { question, options };
}

// What the reply reads as once the block has been lifted out of it: the room shows the question
// as bubbles, so leaving the raw fence in the text would say everything twice.
export function withoutChoice(text) {
  const source = String(text ?? '');
  if (!parseChoice(source)) return source;
  const last = [...source.matchAll(/```pulse-ask\s*\n[\s\S]*?```/gi)].at(-1);
  return source.slice(0, last.index).trimEnd();
}
