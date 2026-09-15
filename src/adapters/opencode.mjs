import { runReadonlyProcess } from './process.mjs';

const readonlyConfig = {
  share: 'disabled',
  agent: {
    'pulse-readonly': {
      description: 'PULSE project consultation without mutations',
      mode: 'primary',
      prompt: 'Answer the user directly. Inspect project files only when necessary. Never modify files, run commands, browse the web, or launch subagents.',
      permission: {
        '*': 'deny',
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
      },
    },
  },
};

export function buildOpenCodeArgs({ projectRoot, prompt }) {
  return [
    '--pure',
    'run',
    '--format', 'json',
    '--agent', 'pulse-readonly',
    '--dir', projectRoot,
    prompt,
  ];
}

export function openCodeEnvironment(environment = process.env) {
  return {
    ...environment,
    OPENCODE_AUTO_SHARE: 'false',
    OPENCODE_CONFIG_CONTENT: JSON.stringify(readonlyConfig),
    OPENCODE_DISABLE_AUTOUPDATE: 'true',
  };
}

export function parseOpenCodeOutput(output) {
  const text = [];
  let usage = null;
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'text' && typeof event.part?.text === 'string') {
        text.push(event.part.text);
      }
      if (event.type === 'step_finish' && event.part?.tokens) {
        const tokens = event.part.tokens;
        usage = {
          inputTokens: tokens.input ?? 0,
          cachedInputTokens: tokens.cache?.read ?? 0,
          outputTokens: tokens.output ?? 0,
          reasoningTokens: tokens.reasoning ?? 0,
          totalTokens: tokens.total ?? ((tokens.input ?? 0) + (tokens.output ?? 0)),
          costUsd: event.part.cost ?? null,
          source: 'opencode-json',
        };
      }
    } catch {
      // Ignore non-event diagnostic lines; stderr is reported when the process fails.
    }
  }
  return { text: text.join('').trim(), usage };
}

export function invokeOpenCode({ executable, projectRoot, prompt, timeoutMs = 120000 }) {
  return runReadonlyProcess({
    executable,
    args: buildOpenCodeArgs({ projectRoot, prompt }),
    cwd: projectRoot,
    env: openCodeEnvironment(),
    timeoutMs,
    label: 'OpenCode',
    parse: parseOpenCodeOutput,
  });
}
