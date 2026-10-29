// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { runReadonlyProcess } from './process.mjs';

// With a lease, the working root is the lease directory (the only writable
// place) and the sandbox allows workspace writes; the project stays readable.
// A TOML value for `-c key=value`: strings quoted, arrays and tables inline.
export function tomlValue(value) {
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`;
  if (value && typeof value === 'object') return `{ ${Object.entries(value).map(([key, item]) => `${/^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key)} = ${tomlValue(item)}`).join(', ')} }`;
  return JSON.stringify(String(value));
}

// The room's memory as an MCP server for this run only: Codex reads
// mcp_servers.<name> from its config, and -c overrides it on the command line
// without touching the user's config.toml.
export function codexMcpOverrides(servers) {
  const list = (Array.isArray(servers) ? servers : [servers]).filter(Boolean);
  return list.flatMap((server) => {
    const key = `mcp_servers.${server.name}`;
    return [
      '-c', `${key}.command=${tomlValue(server.command)}`,
      '-c', `${key}.args=${tomlValue(server.args ?? [])}`,
      '-c', `${key}.env=${tomlValue(server.env ?? {})}`,
      // Only the tools the room allows reach the model: every tool a server lists rides in every
      // call Codex makes inside the turn, and @playwright/mcp lists 25 where the room uses 16.
      ...(server.tools?.length ? ['-c', `${key}.enabled_tools=${tomlValue(server.tools)}`] : []),
      // And those are callable. Codex runs here with --ask-for-approval never, and under that policy
      // it refuses every MCP call that is not pre-approved («MCP tool call requires approval, but
      // approval policy is never»): Codex never reached the room's memory or its browser.
      '-c', `${key}.default_tools_approval_mode="approve"`,
    ];
  });
}

export function buildCodexArgs({ projectRoot, prompt, model = null, effort = null, attachments = [], lease = null, scopes = null, memoryServer = null, mcpServers = [] }) {
  const images = attachments.filter((file) => /^image\//.test(file.contentType ?? ''));
  return [
    // AIRLOCK (#4): commands with network, so pushes and deploys can leave; otherwise the sandbox.
    '--sandbox', lease?.airlock ? 'danger-full-access' : lease ? 'workspace-write' : 'read-only',
    '--ask-for-approval', 'never',
    // Live web search is a global Codex flag; the human's web scope decides.
    ...(scopes?.web ? ['--search'] : []),
    '-C', lease ? lease.outDir : projectRoot,
    ...codexMcpOverrides([memoryServer, ...mcpServers]),
    // Image generation is a Codex feature; the human's scope decides per turn.
    ...(effort ? ['-c', `model_reasoning_effort=${tomlValue(effort)}`] : []),
    ...(lease && (scopes?.imageGen === false || lease.scopes?.imageGen === false) ? ['-c', 'features.image_generation=false'] : []),
    'exec',
    // Codex refuses to run outside a git repository it has not been told to trust, and a new
    // project is often a bare folder. The sandbox above is MADRE's to decide, not this check's.
    '--skip-git-repo-check',
    ...(model ? ['--model', model] : []),
    ...images.flatMap((file) => ['--image', file.path]),
    '--ephemeral',
    '--color', 'never',
    '--json',
    prompt,
  ];
}

// An API refusal reaches Codex's events as the response body, JSON in a string, and the room keeps
// one line of a failure: what it kept was «{». The body's own sentence is the reason.
function apiReason(message) {
  const text = String(message ?? '').trim();
  if (!text.startsWith('{')) return text;
  try {
    const body = JSON.parse(text);
    const said = body?.error?.message ?? body?.message;
    return typeof said === 'string' && said.trim() ? said.trim() : text;
  } catch {
    return text;
  }
}

export function parseCodexOutput(output) {
  let text = '';
  let threadId = null;
  let usage = null;
  let error = null;
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'thread.started' && typeof event.thread_id === 'string') threadId = event.thread_id;
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        // One turn can say several things («I'll look at the file.», then the answer); they are
        // paragraphs, not one run-on line: «…ese texto.Cambié el lema…».
        text += `${text && event.item.text ? '\n\n' : ''}${event.item.text ?? ''}`;
      }
      if (event.type === 'turn.completed' && event.usage) {
        usage = {
          inputTokens: event.usage.input_tokens ?? 0,
          cachedInputTokens: event.usage.cached_input_tokens ?? 0,
          outputTokens: event.usage.output_tokens ?? 0,
          reasoningTokens: event.usage.reasoning_output_tokens ?? 0,
          totalTokens: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
          source: 'codex-json',
        };
      }
      if (event.type === 'error' && typeof event.message === 'string') error = apiReason(event.message);
      if (event.type === 'turn.failed' && typeof event.error?.message === 'string') error = apiReason(event.error.message);
    } catch {
      // Ignore CLI diagnostics that are not JSON events.
    }
  }
  return { text: text.trim(), usage, ...(threadId ? { threadId } : {}), ...(error ? { error } : {}) };
}

// Where Codex keeps the images its own tool made in a thread: ~/.codex/generated_images/<thread>.
// The tool shows them in Codex's own window and nowhere else, so a `/image` run through the room
// made the picture, said «it is shown above», and the room never saw a file.
export async function codexGeneratedImages(threadId, { home = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  if (!threadId || !/^[A-Za-z0-9-]+$/.test(threadId)) return [];
  const dir = join(home, 'generated_images', threadId);
  const names = await readdir(dir).catch(() => []);
  return names.filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name)).sort().map((name) => join(dir, name));
}

export async function invokeCodex({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, effort = null, attachments = [], lease = null, scopes = null, memoryServer = null, mcpServers = [], onProgress = null }) {
  const result = await runReadonlyProcess({
    onProgress: onProgress ? (out) => onProgress({ chars: parseCodexOutput(out).text.length }) : null,
    executable,
    args: buildCodexArgs({ projectRoot, prompt, model, effort, attachments, lease, scopes, memoryServer, mcpServers }),
    cwd: lease ? lease.outDir : projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Codex',
    parse: parseCodexOutput,
  });
  // Under a lease, what Codex's image tool made in this thread goes back to the room to be kept.
  return lease ? { ...result, generatedImages: await codexGeneratedImages(result.threadId) } : result;
}
