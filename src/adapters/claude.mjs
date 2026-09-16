import { runReadonlyProcess } from './process.mjs';

// dontAsk denies any tool use that is not pre-approved, so under a lease the
// Write/Edit tools exist but only paths inside the lease directory are
// allowed; everything else in the project is refused without a prompt.
export function buildClaudeArgs({ prompt, model = null, attachmentsDir = null, lease = null }) {
  return [
    '-p',
    ...(model ? ['--model', model] : []),
    // Attachments live outside the project; Read needs the folder allowed.
    ...(attachmentsDir ? ['--add-dir', attachmentsDir] : []),
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--tools', lease ? 'Read,Glob,Grep,Write,Edit' : 'Read,Glob,Grep',
    ...(lease ? ['--allowedTools', `Read,Glob,Grep,Write(${lease.outDir}/**),Edit(${lease.outDir}/**)`] : []),
    '--safe-mode',
    '--disable-slash-commands',
    '--no-session-persistence',
    '--no-chrome',
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
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

export function invokeClaude({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, attachments = [], lease = null }) {
  return runReadonlyProcess({
    executable,
    args: buildClaudeArgs({ prompt, model, attachmentsDir: attachments[0]?.dir ?? null, lease }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Claude',
    parse: parseClaudeOutput,
  });
}
