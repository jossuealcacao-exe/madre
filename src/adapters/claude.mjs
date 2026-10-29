// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { runReadonlyProcess } from './process.mjs';
import { claudeSubagents, jsonLines } from './subagents.mjs';

// dontAsk denies any tool use that is not pre-approved, so under a lease the
// Write/Edit tools exist but only paths inside the lease directory are
// allowed; everything else in the project is refused without a prompt.
// Claude's own subagents (the Agent tool), from #1 to #3 (2026-10-29): a subagent gets exactly the
// tools of this run and answers to the same allow and deny rules (verified with the real CLI: in
// #1 the subagent read and could not write). In #4 only the agent itself works.
export const claudeMaySpawn = (lease = null) => !lease?.airlock;
export function claudeTools({ lease = null, scopes = null } = {}) {
  const tools = ['Read', 'Glob', 'Grep'];
  if (lease) tools.push('Write', 'Edit');
  if (lease?.airlock) tools.push('Bash');   // AIRLOCK (#4): commands, git, deploy CLIs
  if (scopes?.web) tools.push('WebFetch', 'WebSearch');
  if (claudeMaySpawn(lease)) tools.push('Agent');
  return tools;
}

export function mcpServersFor({ imageStudio = null, memoryServer = null, mcpServers = [] } = {}) {
  const servers = {};
  if (memoryServer) servers[memoryServer.name] = { command: memoryServer.command, args: memoryServer.args, env: memoryServer.env };
  if (imageStudio) servers[imageStudio.name] = { command: imageStudio.command, args: imageStudio.args, env: imageStudio.env };
  for (const server of mcpServers) servers[server.name] = { command: server.command, args: server.args ?? [], env: server.env ?? {} };
  return servers;
}
// Claude's permission names for a module's server: each tool, or the whole server when the list is open.
export const claudeMcpTools = (server) => (server.tools?.length ? server.tools.map((tool) => `mcp__${server.name}__${tool}`) : [`mcp__${server.name}`]);

// Every spelling of the lease directory. One unless the path given to MADRE goes through a
// symlink, in which case the resolved one travels too — see the note in createLease.
export const leaseRoots = (lease) => [...new Set([lease?.outDir, lease?.realOutDir].filter(Boolean))];

export function buildClaudeArgs({ prompt, model = null, effort = null, attachmentsDir = null, lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [] }) {
  const tools = claudeTools({ lease, scopes });
  const mcpTools = [
    ...(memoryServer ? memoryServer.tools.map((tool) => `mcp__${memoryServer.name}__${tool}`) : []),
    ...(imageStudio ? [`mcp__${imageStudio.name}__${imageStudio.tool}`] : []),
    ...mcpServers.flatMap(claudeMcpTools),
  ];
  const allowed = [
    'Read', 'Glob', 'Grep',
    // Claude Code reads `/path` as relative to the project and `//path` as an absolute path.
    // Claude Code grants Write only when Edit is allowed on the same paths (verified with the real
    // CLI: a lone Write rule is denied under dontAsk), so both come together; in CREATE the room
    // restores existing files after the turn.
    ...(lease ? leaseRoots(lease).flatMap((root) => [`Write(//${root}/**)`, `Edit(//${root}/**)`]) : []),
    ...(lease?.airlock ? ['Bash'] : []),
    ...(scopes?.web ? ['WebFetch', 'WebSearch'] : []),
    ...(claudeMaySpawn(lease) ? ['Agent'] : []),
    ...mcpTools,
  ];
  // Only MADRE's own MCP servers ever reach Claude here; --strict-mcp-config
  // keeps the user's servers out of the isolated run.
  const anyMcp = Boolean(imageStudio || memoryServer || mcpServers.length);
  const mcpConfig = JSON.stringify({ mcpServers: mcpServersFor({ imageStudio, memoryServer, mcpServers }) });
  return [
    '-p',
    ...(model ? ['--model', model] : []),
    ...(effort ? ['--effort', effort] : []),
    // Attachments live outside the project; Read needs the folder allowed.
    ...(attachmentsDir ? ['--add-dir', attachmentsDir] : []),
    // One event per line (2026-10-29): the answer as it is written, and what each subagent does
    // while it does it (src/adapters/subagents.mjs). --verbose is what -p asks for to stream.
    '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'dontAsk',
    '--tools', tools.join(','),
    ...(lease || scopes?.web || anyMcp ? ['--allowedTools', allowed.join(',')] : []),
    // CONTROL: the whole project is writable except MADRE's forbidden zones.
    ...(lease?.control || lease?.create ? ['--disallowedTools', ['.git/**', '.pulse/**', '.madre/**', '.env', '.env.*', '**/.env', '**/.env.*', '.claude/settings.local.json'].flatMap((glob) => leaseRoots(lease).flatMap((root) => [`Write(//${root}/${glob})`, `Edit(//${root}/${glob})`])).join(',')] : []),
    // --safe-mode disables every MCP server, ours included. With a MADRE server
    // attached we drop it and instead load no setting sources at all: no user
    // hooks, plugins or MCP servers, only the project's CLAUDE.md and ours.
    ...(anyMcp ? ['--setting-sources', ''] : ['--safe-mode']),
    '--disable-slash-commands',
    '--no-session-persistence',
    '--no-chrome',
    '--strict-mcp-config',
    '--mcp-config', mcpConfig,
    // --tools and --mcp-config are variadic; `--` stops them from swallowing the prompt.
    '--',
    prompt,
  ];
}

// What Claude answered: one JSON object (the old --output-format json, still read) or its stream.
// A turn whose subagents ran in the background ends twice — a first answer while they work, and
// the last one once they are done (seen with Claude 2.1.267) — so the text is the last answer's,
// the cost is the last one's (Claude counts it whole), and the tokens are every answer's, summed.
export function parseClaudeOutput(output, { root = null } = {}) {
  const events = jsonLines(output);
  const results = events.filter((event) => event?.type === 'result');
  if (!results.length) {
    // The old format: the whole output is the one result.
    try { const single = JSON.parse(String(output).trim()); if (single && typeof single === 'object' && !Array.isArray(single) && single.type !== 'assistant' && single.type !== 'system') results.push(single); } catch { /* nothing to read */ }
  }
  const subagents = claudeSubagents(events, { root });
  const last = results.at(-1);
  if (!last) return { text: '', usage: null, ...(subagents.length ? { subagents } : {}) };
  if (last.is_error) {
    return {
      text: '',
      usage: null,
      error: typeof last.result === 'string' ? last.result : 'Claude returned an error.',
    };
  }
  const sum = (key) => results.reduce((total, one) => total + (one.usage?.[key] ?? 0), 0);
  const usage = results.some((one) => one.usage)
    ? {
        inputTokens: sum('input_tokens'),
        cacheCreationInputTokens: sum('cache_creation_input_tokens'),
        cachedInputTokens: sum('cache_read_input_tokens'),
        outputTokens: sum('output_tokens'),
        reasoningTokens: 0,
        totalTokens: sum('input_tokens') + sum('cache_creation_input_tokens') + sum('cache_read_input_tokens') + sum('output_tokens'),
        costUsd: last.total_cost_usd ?? null,
        source: 'claude-json',
      }
    : null;
  return { text: typeof last.result === 'string' ? last.result.trim() : '', usage, ...(subagents.length ? { subagents } : {}) };
}

// While it runs: what the agent itself has written so far, and its subagents.
export function claudeProgress(output, { root = null } = {}) {
  const events = jsonLines(output);
  let chars = 0;
  for (const event of events) {
    if (event?.type !== 'assistant' || event.parent_tool_use_id) continue;
    for (const part of event.message?.content ?? []) if (part?.type === 'text') chars += String(part.text ?? '').length;
  }
  return { chars, subagents: claudeSubagents(events, { root }) };
}

export function invokeClaude({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, effort = null, attachments = [], lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [], onProgress = null }) {
  return runReadonlyProcess({
    onProgress: onProgress ? (out) => onProgress(claudeProgress(out, { root: projectRoot })) : null,
    executable,
    args: buildClaudeArgs({ prompt, model, effort, attachmentsDir: attachments[0]?.dir ?? null, lease, scopes, imageStudio, memoryServer, mcpServers }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Claude',
    parse: (out) => parseClaudeOutput(out, { root: projectRoot }),
  });
}
