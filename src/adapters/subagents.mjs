// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// WHAT THE SUBAGENTS DID (2026-10-29). Claude, OpenCode and Codex may hand part of a turn to their
// own subagents from #1 to #3 (src/lease.mjs, subagentsAllowed). Each CLI says so in its own way;
// these readers turn what it said into one list the room shows the same way for all three: a chip
// per subagent while the turn runs, and «Helped by N subagents» folded under the answer.
//
// One entry: { id, kind, task, status: 'running' | 'done' | 'failed', seconds, reads, searches,
// changed: [paths], report }. A field the CLI does not say is null, never a guess:
//   · Claude says everything — when each one starts, each tool it uses, when it ends and what it
//     reported (stream-json: task_started, task_progress, task_notification, and the subagent's
//     own tool calls carry its parent_tool_use_id).
//   · OpenCode says each one once, when it ends: its kind, its task, how long and what it reported.
//   · Codex says only that it is waiting on its subagents: no task, no report (exec --json, 0.161).

const KIND_LIMIT = 40;
const TASK_LIMIT = 160;
const REPORT_LIMIT = 2400;
const FILES_LIMIT = 20;
const clip = (text, limit) => {
  const said = String(text ?? '').replace(/\s+/g, ' ').trim();
  return said.length > limit ? `${said.slice(0, limit - 1)}…` : said || null;
};
// A report keeps its lines (it is markdown, shown as markdown); only its length is bounded.
const clipBlock = (text, limit) => {
  const said = String(text ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return said.length > limit ? `${said.slice(0, limit - 1).trimEnd()}…` : said || null;
};
const relative = (path, root) => {
  const said = String(path ?? '');
  if (!root) return said;
  const base = String(root).replace(/\/+$/, '');
  return said.startsWith(`${base}/`) ? said.slice(base.length + 1) : said;
};
// The project's own paths said from the project, as the rest of the room says them.
const inProject = (text, root) => {
  if (!root || !text) return text;
  const base = String(root).replace(/\/+$/, '');
  return String(text).split(`${base}/`).join('').split(base).join('.');
};
const READ_TOOLS = new Set(['Read', 'NotebookRead']);
const SEARCH_TOOLS = new Set(['Grep', 'Glob', 'LS', 'WebSearch', 'WebFetch']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Claude, from its stream (one JSON object per line). `root` makes the changed paths the project's.
export function claudeSubagents(events, { root = null } = {}) {
  const byTool = new Map();
  const byTask = new Map();
  const of = (toolId) => byTool.get(toolId) ?? null;
  for (const event of events) {
    if (event?.type === 'assistant') {
      for (const part of event.message?.content ?? []) {
        if (part?.type !== 'tool_use') continue;
        if (part.name === 'Agent' || part.name === 'Task') {
          if (byTool.has(part.id)) continue;
          byTool.set(part.id, { id: part.id, kind: clip(part.input?.subagent_type ?? 'general-purpose', KIND_LIMIT), task: clip(part.input?.description ?? part.input?.prompt, TASK_LIMIT), status: 'running', seconds: null, reads: 0, searches: 0, changed: [], report: null, parent: event.parent_tool_use_id ?? null });
          continue;
        }
        const owner = of(event.parent_tool_use_id);
        if (!owner) continue;
        if (READ_TOOLS.has(part.name)) owner.reads += 1;
        else if (SEARCH_TOOLS.has(part.name)) owner.searches += 1;
        else if (WRITE_TOOLS.has(part.name)) {
          const file = relative(part.input?.file_path ?? part.input?.notebook_path, root);
          if (file && !owner.changed.includes(file) && owner.changed.length < FILES_LIMIT) owner.changed.push(file);
        }
      }
      continue;
    }
    if (event?.type !== 'system') continue;
    if (event.subtype === 'task_started' && event.tool_use_id) {
      byTask.set(event.task_id, event.tool_use_id);
      const owner = of(event.tool_use_id);
      if (owner && !owner.task) owner.task = clip(event.description, TASK_LIMIT);
    }
    const owner = of(event.tool_use_id ?? byTask.get(event.task_id));
    if (!owner) continue;
    const ms = Number(event.usage?.duration_ms);
    if (Number.isFinite(ms) && ms > 0) owner.seconds = Math.round(ms / 1000);
    if (event.subtype === 'task_notification' || (event.subtype === 'task_updated' && event.patch?.status)) {
      const status = event.status ?? event.patch?.status;
      if (status) owner.status = status === 'completed' ? 'done' : status === 'running' ? 'running' : 'failed';
      if (event.summary) owner.report = clipBlock(inProject(event.summary, root), REPORT_LIMIT);
    }
  }
  // A subagent of a subagent is still the turn's: listed, after the one that called it.
  return [...byTool.values()].map(({ parent, ...entry }) => entry);
}

// OpenCode, from its --format json events: a `task` tool call, said once it is over.
export function openCodeSubagents(events, { root = null } = {}) {
  const out = [];
  for (const event of events) {
    const part = event?.part;
    if (event?.type !== 'tool_use' || part?.tool !== 'task') continue;
    const state = part.state ?? {};
    const took = Number(state.time?.end) - Number(state.time?.start);
    const said = String(state.output ?? '').replace(/<\/?task[^>]*>|<\/?task_result>/g, '').trim();
    out.push({
      id: part.callID ?? part.id ?? `task-${out.length}`,
      kind: clip(state.input?.subagent_type ?? 'general', KIND_LIMIT),
      task: clip(state.input?.description ?? state.title ?? state.input?.prompt, TASK_LIMIT),
      status: state.status === 'completed' ? 'done' : state.status === 'error' ? 'failed' : 'running',
      seconds: Number.isFinite(took) && took > 0 ? Math.round(took / 1000) : null,
      reads: null,
      searches: null,
      changed: [],
      report: clipBlock(inProject(state.status === 'error' ? state.error ?? said : said, root), REPORT_LIMIT),
    });
  }
  return out;
}

// Codex, from its exec --json events: its collaboration calls. It names no task and hands back no
// report, so the room can only say it is working with subagents, and while it waits on them.
export function codexSubagents(events) {
  const calls = new Map();
  for (const event of events) {
    const item = event?.item;
    if (item?.type !== 'collab_tool_call') continue;
    calls.set(item.id, { tool: item.tool, done: event.type === 'item.completed' || item.status === 'completed', failed: item.status === 'failed', threads: item.receiver_thread_ids ?? [], prompt: item.prompt ?? null });
  }
  if (!calls.size) return [];
  const threads = new Set();
  for (const call of calls.values()) for (const id of call.threads) threads.add(id);
  const running = [...calls.values()].some((call) => !call.done);
  const failed = [...calls.values()].every((call) => call.failed);
  const asked = [...calls.values()].map((call) => call.prompt).find(Boolean) ?? null;
  return [{ id: 'codex-subagents', kind: null, task: clip(asked, TASK_LIMIT), status: running ? 'running' : failed ? 'failed' : 'done', seconds: null, reads: null, searches: null, changed: [], report: null, count: threads.size || null }];
}

// What the room keeps and shows of a list: bounded, and each text through the room's privacy guard.
export function keptSubagents(list, { redact = (text) => text } = {}) {
  if (!Array.isArray(list) || !list.length) return undefined;
  return list.slice(0, 12).map((one) => ({
    id: String(one.id ?? '').slice(0, 80),
    kind: one.kind ? clip(redact(one.kind), KIND_LIMIT) : null,
    task: one.task ? clip(redact(one.task), TASK_LIMIT) : null,
    status: ['running', 'done', 'failed'].includes(one.status) ? one.status : 'done',
    seconds: Number.isFinite(one.seconds) ? one.seconds : null,
    reads: Number.isFinite(one.reads) ? one.reads : null,
    searches: Number.isFinite(one.searches) ? one.searches : null,
    changed: Array.isArray(one.changed) ? one.changed.slice(0, FILES_LIMIT).map((file) => String(file).slice(0, 200)) : [],
    report: one.report ? clipBlock(redact(one.report), REPORT_LIMIT) : null,
    ...(Number.isFinite(one.count) ? { count: one.count } : {}),
  }));
}

// One JSON object per line; a line that is not one (a CLI's own note) is stepped over.
export function jsonLines(output) {
  const events = [];
  for (const line of String(output ?? '').split('\n')) {
    const text = line.trim();
    if (!text.startsWith('{')) continue;
    try { events.push(JSON.parse(text)); } catch { /* not an event */ }
  }
  return events;
}
