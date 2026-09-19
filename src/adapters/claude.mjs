import { runReadonlyProcess } from './process.mjs';

// dontAsk denies any tool use that is not pre-approved, so under a lease the
// Write/Edit tools exist but only paths inside the lease directory are
// allowed; everything else in the project is refused without a prompt.
export function claudeTools({ lease = null, scopes = null } = {}) {
  const tools = ['Read', 'Glob', 'Grep'];
  if (lease) tools.push('Write', 'Edit');
  if (scopes?.web) tools.push('WebFetch', 'WebSearch');
  return tools;
}

export function mcpServersFor({ imageStudio = null, memoryServer = null } = {}) {
  const servers = {};
  if (memoryServer) servers[memoryServer.name] = { command: memoryServer.command, args: memoryServer.args, env: memoryServer.env };
  if (imageStudio) servers[imageStudio.name] = { command: imageStudio.command, args: imageStudio.args, env: imageStudio.env };
  return servers;
}

export function buildClaudeArgs({ prompt, model = null, attachmentsDir = null, lease = null, scopes = null, imageStudio = null, memoryServer = null }) {
  const tools = claudeTools({ lease, scopes });
  const mcpTools = [
    ...(memoryServer ? memoryServer.tools.map((tool) => `mcp__${memoryServer.name}__${tool}`) : []),
    ...(imageStudio ? [`mcp__${imageStudio.name}__${imageStudio.tool}`] : []),
  ];
  const allowed = [
    'Read', 'Glob', 'Grep',
    // Claude Code reads `/path` as relative to the project and `//path` as an absolute path.
    // Claude Code grants Write only when Edit is allowed on the same paths (verified with the real
    // CLI: a lone Write rule is denied under dontAsk), so both come together; in CREATE the room
    // restores existing files after the turn.
    ...(lease ? [`Write(//${lease.outDir}/**)`, `Edit(//${lease.outDir}/**)`] : []),
    ...(scopes?.web ? ['WebFetch', 'WebSearch'] : []),
    ...mcpTools,
  ];
  // Only MADRE's own MCP servers ever reach Claude here; --strict-mcp-config
  // keeps the user's servers out of the isolated run.
  const anyMcp = Boolean(imageStudio || memoryServer);
  const mcpConfig = JSON.stringify({ mcpServers: mcpServersFor({ imageStudio, memoryServer }) });
  return [
    '-p',
    ...(model ? ['--model', model] : []),
    // Attachments live outside the project; Read needs the folder allowed.
    ...(attachmentsDir ? ['--add-dir', attachmentsDir] : []),
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--tools', tools.join(','),
    ...(lease || scopes?.web || anyMcp ? ['--allowedTools', allowed.join(',')] : []),
    // CONTROL: the whole project is writable except MADRE's forbidden zones.
    ...(lease?.control || lease?.create ? ['--disallowedTools', ['.git/**', '.pulse/**', '.madre/**', '.env', '.env.*', '**/.env', '**/.env.*', '.claude/settings.local.json'].flatMap((glob) => [`Write(//${lease.outDir}/${glob})`, `Edit(//${lease.outDir}/${glob})`]).join(',')] : []),
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

export function parseClaudeOutput(output) {
  try {
    const result = JSON.parse(output.trim());
    if (result.is_error) {
      return {
        text: '',
        usage: null,
        error: typeof result.result === 'string' ? result.result : 'Claude returned an error.',
      };
    }
    const tokens = result.usage;
    const usage = tokens
      ? {
          inputTokens: tokens.input_tokens ?? 0,
          cacheCreationInputTokens: tokens.cache_creation_input_tokens ?? 0,
          cachedInputTokens: tokens.cache_read_input_tokens ?? 0,
          outputTokens: tokens.output_tokens ?? 0,
          reasoningTokens: 0,
          totalTokens: (tokens.input_tokens ?? 0)
            + (tokens.cache_creation_input_tokens ?? 0)
            + (tokens.cache_read_input_tokens ?? 0)
            + (tokens.output_tokens ?? 0),
          costUsd: result.total_cost_usd ?? null,
          source: 'claude-json',
        }
      : null;
    return { text: typeof result.result === 'string' ? result.result.trim() : '', usage };
  } catch {
    return { text: '', usage: null };
  }
}

export function invokeClaude({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, attachments = [], lease = null, scopes = null, imageStudio = null, memoryServer = null }) {
  return runReadonlyProcess({
    executable,
    args: buildClaudeArgs({ prompt, model, attachmentsDir: attachments[0]?.dir ?? null, lease, scopes, imageStudio, memoryServer }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Claude',
    parse: parseClaudeOutput,
  });
}
