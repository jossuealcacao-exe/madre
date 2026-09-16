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

export function buildClaudeArgs({ prompt, model = null, attachmentsDir = null, lease = null, scopes = null, imageStudio = null }) {
  const tools = claudeTools({ lease, scopes });
  const mcpTool = imageStudio ? `mcp__${imageStudio.name}__${imageStudio.tool}` : null;
  const allowed = [
    'Read', 'Glob', 'Grep',
    ...(lease ? [`Write(${lease.outDir}/**)`, `Edit(${lease.outDir}/**)`] : []),
    ...(scopes?.web ? ['WebFetch', 'WebSearch'] : []),
    ...(mcpTool ? [mcpTool] : []),
  ];
  // Only PULSE's own MCP server ever reaches Claude here; --strict-mcp-config
  // keeps the user's servers out of the isolated run.
  const mcpConfig = JSON.stringify({ mcpServers: imageStudio ? { [imageStudio.name]: { command: imageStudio.command, args: imageStudio.args, env: imageStudio.env } } : {} });
  return [
    '-p',
    ...(model ? ['--model', model] : []),
    // Attachments live outside the project; Read needs the folder allowed.
    ...(attachmentsDir ? ['--add-dir', attachmentsDir] : []),
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--tools', tools.join(','),
    ...(lease || scopes?.web || imageStudio ? ['--allowedTools', allowed.join(',')] : []),
    '--safe-mode',
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

export function invokeClaude({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, attachments = [], lease = null, scopes = null, imageStudio = null }) {
  return runReadonlyProcess({
    executable,
    args: buildClaudeArgs({ prompt, model, attachmentsDir: attachments[0]?.dir ?? null, lease, scopes, imageStudio }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Claude',
    parse: parseClaudeOutput,
  });
}
