import { runReadonlyProcess } from './process.mjs';

const readonlyConfig = {
  share: 'disabled',
  agent: {
    'pulse-readonly': {
      description: 'MADRE project consultation without mutations',
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

// Optional provider/model override (e.g. "openai/gpt-5.6-sol"). Without it,
// OpenCode picks its own default provider, which may not be the one the user
// actually signed in to.
export function buildOpenCodeArgs({ projectRoot, prompt, model = process.env.PULSE_OPENCODE_MODEL, attachments = [] }) {
  return [
    '--pure',
    'run',
    '--format', 'json',
    '--agent', 'pulse-readonly',
    ...(model ? ['--model', model] : []),
    ...attachments.flatMap((file) => ['--file', file.path]),
    '--dir', projectRoot,
    prompt,
  ];
}

// OpenCode matches permission patterns against paths relative to `--dir`, last matching rule
// wins, and creating a file is the `write` tool while changing one is `edit`: both need a rule.
// Verified against opencode 1.18.4: absolute patterns never match, so the lease is named by
// its directory relative to the project.
export const FORBIDDEN_GLOBS = ['.git/**', '.pulse/**', '.madre/**', '.env', '.env.*', '**/.env', '**/.env.*', '.claude/settings.local.json'];
export function writeRules(relativeDir, { control = false, create = false } = {}) {
  if (control || create) return { '*': 'allow', ...Object.fromEntries(FORBIDDEN_GLOBS.map((glob) => [glob, 'deny'])) };
  const dir = String(relativeDir ?? '.').replace(/^\.\/+/, '').replace(/\/+$/, '');
  return { '*': 'deny', [dir && dir !== '.' ? `${dir}/**` : '**']: 'allow' };
}

export function leaseConfig(outDir, { control = false, create = false, airlock = false, relativeDir = null } = {}) {
  const rules = writeRules(relativeDir ?? outDir, { control, create });
  // OpenCode gates its `write` tool behind the `edit` permission as well (denying edit leaves "no
  // file-writing tool"), so CREATE allows both and the room restores existing files afterwards.
  const editRules = rules;
  return {
    ...readonlyConfig,
    agent: {
      'pulse-readonly': {
        ...readonlyConfig.agent['pulse-readonly'],
        prompt: airlock
          ? 'Answer the user directly. AIRLOCK: you are in command of this project and may run commands in it, including git and deploy CLIs with the sessions already on this machine. Say what will leave the machine before it does. Never print secrets. Do not launch subagents.'
          : control
          ? 'Answer the user directly. You are in CONTROL of this project: create and edit files anywhere inside it except .git, .pulse, .madre and .env files. Do not run commands, browse the web, or launch subagents.'
          : create
            ? 'Answer the user directly. You may create new files and folders anywhere in this project where they belong; do not modify or delete existing files. Do not run commands, browse the web, or launch subagents.'
            : 'Answer the user directly. Inspect project files when necessary. You may create or edit files only inside the creation lease directory named in the request; never elsewhere. Do not run commands, browse the web, or launch subagents.',
        permission: {
          ...readonlyConfig.agent['pulse-readonly'].permission,
          edit: editRules,
          write: rules,
          ...(airlock ? { bash: 'allow' } : {}),   // AIRLOCK (#4): commands, git, deploy CLIs
        },
      },
    },
  };
}

export function openCodeConfig({ lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [] } = {}) {
  let config = lease ? leaseConfig(lease.outDir, { control: Boolean(lease.control), create: Boolean(lease.create), airlock: Boolean(lease.airlock), relativeDir: lease.relativeDir ?? null }) : readonlyConfig;
  if (scopes?.web) {
    config = {
      ...config,
      agent: {
        'pulse-readonly': {
          ...config.agent['pulse-readonly'],
          prompt: config.agent['pulse-readonly'].prompt.replace('browse the web, ', ''),
          permission: { ...config.agent['pulse-readonly'].permission, webfetch: 'allow', websearch: 'allow' },
        },
      },
    };
  }
  if (imageStudio && lease) {
    config = {
      ...config,
      mcp: { ...(config.mcp ?? {}), [imageStudio.name]: { type: 'local', command: [imageStudio.command, ...imageStudio.args], environment: imageStudio.env, enabled: true } },
    };
  }
  for (const server of [memoryServer, ...mcpServers].filter(Boolean)) {
    config = {
      ...config,
      mcp: { ...(config.mcp ?? {}), [server.name]: { type: 'local', command: [server.command, ...(server.args ?? [])], environment: server.env ?? {}, enabled: true } },
      agent: {
        'pulse-readonly': {
          ...config.agent['pulse-readonly'],
          permission: {
            ...config.agent['pulse-readonly'].permission,
            [`${server.name}*`]: 'allow',
            ...Object.fromEntries((server.tools ?? []).map((tool) => [`${server.name}_${tool}`, 'allow'])),
          },
        },
      },
    };
  }
  return config;
}

export function openCodeEnvironment(environment = process.env, { lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [] } = {}) {
  return {
    ...environment,
    OPENCODE_AUTO_SHARE: 'false',
    OPENCODE_CONFIG_CONTENT: JSON.stringify(openCodeConfig({ lease, scopes, imageStudio, memoryServer, mcpServers })),
    OPENCODE_DISABLE_AUTOUPDATE: 'true',
  };
}

export function parseOpenCodeOutput(output) {
  const text = [];
  let usage = null;
  let error = null;
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'error' && event.error) {
        const detail = event.error.data?.message ?? event.error.message ?? '';
        error = [event.error.name, detail].filter(Boolean).join(': ') || 'OpenCode returned an error.';
      }
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
  return { text: text.join('').trim(), usage, ...(error ? { error } : {}) };
}

export function invokeOpenCode({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, attachments = [], lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [] }) {
  return runReadonlyProcess({
    executable,
    args: buildOpenCodeArgs({ projectRoot, prompt, attachments, ...(model ? { model } : {}) }),
    cwd: projectRoot,
    env: openCodeEnvironment(process.env, { lease, scopes, imageStudio, memoryServer, mcpServers }),
    timeoutMs,
    signal,
    label: 'OpenCode',
    parse: parseOpenCodeOutput,
  });
}
