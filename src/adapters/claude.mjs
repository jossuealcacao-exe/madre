import { runReadonlyProcess } from './process.mjs';

export function buildClaudeArgs({ prompt, model = null }) {
  return [
    '-p',
    ...(model ? ['--model', model] : []),
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--tools', 'Read,Glob,Grep',
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

export function invokeClaude({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null }) {
  return runReadonlyProcess({
    executable,
    args: buildClaudeArgs({ prompt, model }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Claude',
    parse: parseClaudeOutput,
  });
}
