// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// WHAT AN AGENT IS DOING, STEP BY STEP (2026-11-09). While a turn runs, the room showed three dots
// and phrases taken in turn from a list; the CLIs already say, as they go, every file they read,
// every search, every change and every command. These readers turn that into one short list the
// room shows the same way for every agent: a line that says the step in front, and quiet cards for
// the ones before it (public/app.js, showSteps).
//
// One step: { kind, what }. kind is one of read · search · edit · write · run · web · fetch · think ·
// plan · tool; what is the file (from the project), the search, the command or the address, or null.
// Nothing is guessed: a CLI that does not say its steps gives none, and the room keeps its phrases.
//   · Claude says each tool it uses, with its input (stream-json, tool_use).
//   · Codex says each command, file change, search and tool as it starts (exec --json, item.started).
// What the room shows still goes through its privacy guard first (src/room.mjs).

export const STEPS_KEPT = 40;
const WHAT_LIMIT = 90;

const clip = (text, limit = WHAT_LIMIT) => {
  const said = String(text ?? '').replace(/\s+/g, ' ').trim();
  return said.length > limit ? `${said.slice(0, limit - 1)}…` : said || null;
};
const fromProject = (path, root) => {
  const said = String(path ?? '');
  if (!root || !said) return said || null;
  const base = String(root).replace(/\/+$/, '');
  return said.startsWith(`${base}/`) ? said.slice(base.length + 1) : said === base ? '.' : said;
};
const host = (url) => { try { return new URL(String(url)).host; } catch { return clip(url, 60); } };
// Two of the same in a row (reading a file twice, thinking twice) are one step.
const push = (steps, step) => {
  const last = steps.at(-1);
  if (last && last.kind === step.kind && last.what === step.what) return;
  steps.push(step);
};

const CLAUDE = {
  Read: (input, root) => ({ kind: 'read', what: clip(fromProject(input?.file_path, root)) }),
  NotebookRead: (input, root) => ({ kind: 'read', what: clip(fromProject(input?.notebook_path, root)) }),
  Grep: (input) => ({ kind: 'search', what: clip(input?.pattern) }),
  Glob: (input) => ({ kind: 'search', what: clip(input?.pattern) }),
  LS: (input, root) => ({ kind: 'read', what: clip(fromProject(input?.path, root)) }),
  Edit: (input, root) => ({ kind: 'edit', what: clip(fromProject(input?.file_path, root)) }),
  MultiEdit: (input, root) => ({ kind: 'edit', what: clip(fromProject(input?.file_path, root)) }),
  NotebookEdit: (input, root) => ({ kind: 'edit', what: clip(fromProject(input?.notebook_path, root)) }),
  Write: (input, root) => ({ kind: 'write', what: clip(fromProject(input?.file_path, root)) }),
  Bash: (input) => ({ kind: 'run', what: clip(input?.command, 70) }),
  WebSearch: (input) => ({ kind: 'web', what: clip(input?.query) }),
  WebFetch: (input) => ({ kind: 'fetch', what: host(input?.url) }),
  TodoWrite: () => ({ kind: 'plan', what: null }),
};

// Claude, from its stream (one JSON object per line, already parsed). A subagent's own steps
// (parent_tool_use_id) are the subagent's, shown with it, not here.
export function claudeSteps(events, { root = null } = {}) {
  const steps = [];
  for (const event of events ?? []) {
    if (event?.type !== 'assistant' || event.parent_tool_use_id) continue;
    for (const part of event.message?.content ?? []) {
      if (part?.type === 'thinking' || part?.type === 'redacted_thinking') { push(steps, { kind: 'think', what: null }); continue; }
      if (part?.type !== 'tool_use' || part.name === 'Agent' || part.name === 'Task') continue;
      const read = CLAUDE[part.name];
      push(steps, read ? read(part.input, root) : { kind: 'tool', what: clip(String(part.name ?? '').replace(/^mcp__[^_]+__/, '')) });
    }
  }
  return steps.slice(-STEPS_KEPT);
}

// Codex, from its exec --json output: each item as it starts.
export function codexSteps(output, { root = null } = {}) {
  const steps = [];
  for (const line of String(output ?? '').split('\n')) {
    if (!line.startsWith('{')) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.type !== 'item.started' && event?.type !== 'item.completed') continue;
    const item = event.item ?? {};
    // A step is said once, when it starts; a completed one that never said it started still counts.
    if (event.type === 'item.completed' && steps.some((step) => step.id === item.id)) continue;
    let step = null;
    if (item.type === 'command_execution') step = { kind: 'run', what: clip(String(item.command ?? '').replace(/^(\/bin\/)?(ba|z)?sh -lc '?|'$/g, ''), 70) };
    else if (item.type === 'file_change') {
      const change = (item.changes ?? [])[0];
      step = { kind: change?.kind === 'add' ? 'write' : 'edit', what: clip(fromProject(change?.path, root)) };
    } else if (item.type === 'web_search') step = { kind: 'web', what: clip(item.query) };
    else if (item.type === 'mcp_tool_call') step = { kind: 'tool', what: clip(item.tool) };
    else if (item.type === 'reasoning') step = { kind: 'think', what: null };
    else if (item.type === 'todo_list') step = { kind: 'plan', what: null };
    if (!step) continue;
    if (item.id) step.id = item.id;
    push(steps, step);
  }
  return steps.slice(-STEPS_KEPT).map(({ kind, what }) => ({ kind, what }));
}
