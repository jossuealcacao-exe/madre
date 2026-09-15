import { runReadonlyProcess } from './process.mjs';

export function buildCodexArgs({ projectRoot, prompt }) {
  return [
    '--sandbox', 'read-only',
    '--ask-for-approval', 'never',
    '-C', projectRoot,
    'exec',
    '--ephemeral',
    '--color', 'never',
    '--json',
    prompt,
  ];
}

export function parseCodexOutput(output) {
  let text = '';
  let usage = null;
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        text += event.item.text ?? '';
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
    } catch {
      // Ignore CLI diagnostics that are not JSON events.
    }
  }
  return { text: text.trim(), usage };
}

export function invokeCodex({ executable, projectRoot, prompt, timeoutMs = 120000 }) {
  return runReadonlyProcess({
    executable,
    args: buildCodexArgs({ projectRoot, prompt }),
    cwd: projectRoot,
    env: process.env,
    timeoutMs,
    label: 'Codex',
    parse: parseCodexOutput,
  });
}
