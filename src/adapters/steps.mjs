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
//   · Grok writes Claude's stream with tools of its own names (read_file, list_dir, grep…).
//   · Gemini says each tool as it calls it (stream-json, tool_use: tool_name, parameters).
//   · Cursor says each tool as it starts (stream-json, tool_call/started: readToolCall.args…).
//   · OpenCode says each tool once it is done (--format json, tool_use: part.tool, state.input).
// Their names and fields were read from each CLI on 2026-11-09: Grok 1.0.77 and OpenCode in a real
// turn, Gemini and Cursor in the code they install (gemini-cli bundle; cursor-agent 2026.10.18).
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

// Any other CLI's tool, by its name: the same few kinds whichever agent says them. A tool that
// hands work to a subagent is the subagent's to show (subagents.mjs), not a step here.
const SUBAGENT_TOOLS = new Set(['Agent', 'Task', 'task', 'invoke_agent', 'taskToolCall']);
const pathOf = (input) => input?.file_path ?? input?.filePath ?? input?.target_file ?? input?.path ?? input?.absolute_path ?? input?.dir_path ?? input?.target_directory ?? input?.notebook_path ?? null;
const KINDS = [
  [/^(read|read_file|read_many_files|readToolCall|list|ls|list_dir|list_directory|lsToolCall)$/i, 'read'],
  [/^(grep|glob|grep_search|search_file_content|codesearch|grepToolCall|globToolCall|semSearchToolCall)$/i, 'search'],
  [/^(edit|replace|search_replace|multiedit|patch|apply_patch|editToolCall|deleteToolCall)$/i, 'edit'],
  [/^(write|write_file|create_file)$/i, 'write'],
  [/^(bash|shell|run_shell_command|run_terminal_cmd|run_terminal_command|shellToolCall)$/i, 'run'],
  [/^(websearch|web_search|google_web_search|webSearchToolCall)$/i, 'web'],
  [/^(webfetch|web_fetch|fetch|webFetchToolCall)$/i, 'fetch'],
  [/^(todowrite|todoread|write_todos|updateTodosToolCall|createPlanToolCall)$/i, 'plan'],
];
export function toolStep(name, input, { root = null } = {}) {
  const tool = String(name ?? '');
  if (!tool || SUBAGENT_TOOLS.has(tool)) return null;
  const kind = KINDS.find(([pattern]) => pattern.test(tool))?.[1] ?? 'tool';
  if (kind === 'read' || kind === 'edit' || kind === 'write') {
    const path = pathOf(input) ?? (Array.isArray(input?.paths) ? input.paths[0] : null) ?? (Array.isArray(input?.include) ? input.include[0] : null);
    return { kind, what: clip(fromProject(path, root)) };
  }
  if (kind === 'search') return { kind, what: clip(input?.pattern ?? input?.query ?? input?.globPattern ?? input?.searchTerm) };
  if (kind === 'run') return { kind, what: clip(input?.command, 70) };
  if (kind === 'web') return { kind, what: clip(input?.query ?? input?.searchTerm) };
  if (kind === 'fetch') return { kind, what: input?.url ? host(input.url) : (String(input?.prompt ?? '').match(/https?:\/\/\S+/) ? host(String(input.prompt).match(/https?:\/\/\S+/)[0]) : null) };
  if (kind === 'plan') return { kind, what: null };
  return { kind, what: clip(tool.replace(/^mcp__[^_]+__/, '').replace(/ToolCall$/, '')) };
}

// Claude, from its stream (one JSON object per line, already parsed). A subagent's own steps
// (parent_tool_use_id) are the subagent's, shown with it, not here.
export function claudeSteps(events, { root = null } = {}) {
  const steps = [];
  for (const event of events ?? []) {
    if (event?.type !== 'assistant' || event.parent_tool_use_id) continue;
    for (const part of event.message?.content ?? []) {
      if (part?.type === 'thinking' || part?.type === 'redacted_thinking') { push(steps, { kind: 'think', what: null }); continue; }
      if (part?.type !== 'tool_use' || SUBAGENT_TOOLS.has(part.name)) continue;
      const read = CLAUDE[part.name];
      const step = read ? read(part.input, root) : toolStep(part.name, part.input, { root });
      if (step) push(steps, step);
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

// Grok writes Claude's stream line for line (adapters/grok.mjs), its tools under names of its own.
export const grokSteps = claudeSteps;

const jsonEvents = (output) => String(output ?? '').split('\n').filter((line) => line.startsWith('{')).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });

// Gemini, from its stream-json: { type: 'tool_use', tool_name, parameters } as it calls each one.
export function geminiSteps(output, { root = null } = {}) {
  const steps = [];
  for (const event of jsonEvents(output)) {
    if (event?.type !== 'tool_use') continue;
    const step = toolStep(event.tool_name, event.parameters, { root });
    if (step) push(steps, step);
  }
  return steps.slice(-STEPS_KEPT);
}

// Cursor, from its stream-json: { type: 'tool_call', subtype: 'started', tool_call: { readToolCall:
// { args: { path } } } }, one kind of call per key; its thinking comes as { type: 'thinking' }.
export function cursorSteps(output, { root = null } = {}) {
  const steps = [];
  for (const event of jsonEvents(output)) {
    if (event?.type === 'thinking') { push(steps, { kind: 'think', what: null }); continue; }
    if (event?.type !== 'tool_call' || event.subtype !== 'started' || !event.tool_call || typeof event.tool_call !== 'object') continue;
    const [name, call] = Object.entries(event.tool_call)[0] ?? [];
    const step = name === 'mcpToolCall'
      ? { kind: 'tool', what: clip(call?.args?.toolName ?? call?.args?.name ?? 'MCP') }
      : toolStep(name, call?.args, { root });
    if (step) push(steps, step);
  }
  return steps.slice(-STEPS_KEPT);
}

// OpenCode, from its --format json: { type: 'tool_use', part: { tool, state: { input } } }, said once
// the tool is done; its reasoning as { type: 'reasoning' }.
export function openCodeSteps(output, { root = null } = {}) {
  const steps = [];
  for (const event of jsonEvents(output)) {
    if (event?.type === 'reasoning' && String(event.part?.text ?? '').trim()) { push(steps, { kind: 'think', what: null }); continue; }
    if (event?.type !== 'tool_use') continue;
    const step = toolStep(event.part?.tool, event.part?.state?.input, { root });
    if (step) push(steps, step);
  }
  return steps.slice(-STEPS_KEPT);
}
