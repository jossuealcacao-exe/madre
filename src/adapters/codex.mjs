import { runReadonlyProcess } from './process.mjs';

// With a lease, the working root is the lease directory (the only writable
// place) and the sandbox allows workspace writes; the project stays readable.
export function buildCodexArgs({ projectRoot, prompt, model = null, attachments = [], lease = null, scopes = null }) {
  const images = attachments.filter((file) => /^image\//.test(file.contentType ?? ''));
  return [
    '--sandbox', lease ? 'workspace-write' : 'read-only',
    '--ask-for-approval', 'never',
    // Live web search is a global Codex flag; the human's web scope decides.
    ...(scopes?.web ? ['--search'] : []),
    '-C', lease ? lease.outDir : projectRoot,
    // Image generation is a Codex feature; the human's scope decides per turn.
    ...(lease && (scopes?.imageGen === false || lease.scopes?.imageGen === false) ? ['-c', 'features.image_generation=false'] : []),
    'exec',
    ...(lease ? ['--skip-git-repo-check'] : []),
    ...(model ? ['--model', model] : []),
    ...images.flatMap((file) => ['--image', file.path]),
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

export function invokeCodex({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, attachments = [], lease = null, scopes = null }) {
  return runReadonlyProcess({
    executable,
    args: buildCodexArgs({ projectRoot, prompt, model, attachments, lease, scopes }),
    cwd: lease ? lease.outDir : projectRoot,
    env: process.env,
    timeoutMs,
    signal,
    label: 'Codex',
    parse: parseCodexOutput,
  });
}
