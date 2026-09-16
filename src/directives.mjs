// Agent-to-agent delegation. An agent answering in the room may end its reply
// with a fenced block that puts other agents to work, in order:
//
//   ```pulse
//   @gemini: Synthesize who Jossue is in one paragraph.
//   @codex: Same question; name the least supported claim.
//   @claude: Compare both syntheses and mark where they diverge.
//   ```
//
// PULSE runs the steps sequentially as regular room turns, each recorded,
// each subject to handoff, budget and timeout, and each stoppable by the
// human. A step addressed to the orchestrator itself becomes its closing
// turn once the others have answered. Delegated agents cannot delegate
// further (depth is capped at one), so a plan always terminates.

export const DELEGATION_HELP = (self, others, maxSteps) => [
  `You may put other agents to work: ${others.map((id) => `@${id}`).join(', ')}.`,
  'Only do so when the human asked you to coordinate, or when it clearly serves the request.',
  'To delegate, end your answer with one fenced block, one step per line, in the order they should run:',
  '```pulse',
  `@${others[0] ?? 'codex'}: <question for that agent>`,
  `@${self}: <what you will do with their answers, optional closing turn for you>`,
  '```',
  `PULSE runs the steps in order (at most ${maxSteps}), shows every answer in the room, then hands you the closing turn if you asked for one.`,
  'Address each agent once. Do not delegate what you can answer yourself.',
].join('\n');

// Only a plan block that closes the reply counts. Blocks quoted earlier in
// the text (examples, explanations) are never executed.
export function parseDirectives(text, { self, available = [], maxSteps = 4 } = {}) {
  const source = String(text ?? '');
  const blocks = [...source.matchAll(/```pulse\s*\n([\s\S]*?)```/gi)];
  if (!blocks.length) return { steps: [], closing: null, ignored: [] };
  const last = blocks.at(-1);
  const trailing = source.slice(last.index + last[0].length);
  if (trailing.trim()) {
    return { steps: [], closing: null, ignored: [{ line: '```pulse … ```', reason: 'a plan block must be the last thing in the reply' }] };
  }
  const steps = [];
  const ignored = [];
  let closing = null;
  const seen = new Set();
  for (const block of [last]) {
    for (const raw of block[1].split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^[-*]?\s*@([a-z0-9_-]+)\s*[:：]\s*(.+)$/i);
      if (!match) { ignored.push({ line, reason: 'not a step (expected "@agent: text")' }); continue; }
      const agent = match[1].toLowerCase();
      const instruction = match[2].trim();
      if (agent === self) {
        if (closing) { ignored.push({ line, reason: 'only one closing step for the orchestrator' }); continue; }
        closing = instruction;
        continue;
      }
      if (!available.includes(agent)) { ignored.push({ line, reason: `@${agent} is not available in this room` }); continue; }
      if (seen.has(agent)) { ignored.push({ line, reason: `@${agent} already has a step` }); continue; }
      if (steps.length >= maxSteps) { ignored.push({ line, reason: `plan is capped at ${maxSteps} steps` }); continue; }
      seen.add(agent);
      steps.push({ agent, text: instruction });
    }
  }
  return { steps, closing, ignored };
}

// The reply text without the plan block, for readers who only want the prose.
export function stripDirectives(text) {
  return String(text ?? '').replace(/```pulse\s*\n[\s\S]*?```/gi, '').trim();
}
