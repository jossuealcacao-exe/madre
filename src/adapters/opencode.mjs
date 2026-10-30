// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { ENV_TEMPLATES } from '../checkpoint.mjs';
import { t } from '../i18n.mjs';
import { runReadonlyProcess } from './process.mjs';
import { jsonLines, openCodeSubagents } from './subagents.mjs';

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
export function buildOpenCodeArgs({ projectRoot, prompt, model = process.env.PULSE_OPENCODE_MODEL, effort = null, attachments = [] }) {
  return [
    '--pure',
    'run',
    '--format', 'json',
    // Its errors on stderr (QA 1.1.0, ACT-02): when the free models' limit is reached OpenCode
    // retries in silence and writes nothing on stdout, so MADRE waited the whole clock to say «did
    // not respond». The log line says why at once (see watchOpenCodeErrors).
    '--print-logs', '--log-level', 'ERROR',
    '--agent', 'pulse-readonly',
    ...(model ? ['--model', model] : []),
    // The model's reasoning rung, as OpenCode names it (`--variant`, 1.18).
    ...(effort ? ['--variant', effort] : []),
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
// OpenCode's last matching rule wins, so the templates of .env are allowed after the deny (NUE-21).
const ENV_TEMPLATE_GLOBS = ENV_TEMPLATES.flatMap((name) => [name, `**/${name}`]);
export function writeRules(relativeDir, { control = false, create = false } = {}) {
  if (control || create) return { '*': 'allow', ...Object.fromEntries(FORBIDDEN_GLOBS.map((glob) => [glob, 'deny'])), ...Object.fromEntries(ENV_TEMPLATE_GLOBS.map((glob) => [glob, 'allow'])) };
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
  return withSubagents(config, lease);
}

// OpenCode's own subagents, from #1 to #3 (2026-10-29). A subagent does not inherit the permissions
// of the agent that calls it: it has its own, and OpenCode's `general` writes and runs commands out
// of the box (verified with the real CLI: told it was allowed, it wrote a file in #1). So only
// `explore` and `general` may be called, each with exactly the permissions of this run, and neither
// may call another. In #4 only the agent itself works.
export const SUBAGENTS = ['explore', 'general'];
const SUBAGENT_LINE = 'launch subagents other than explore and general, which work with exactly your permissions';
export function withSubagents(config, lease = null) {
  if (lease?.airlock) return config;
  const main = config.agent['pulse-readonly'];
  const own = { ...main.permission, task: 'deny' };
  return {
    ...config,
    agent: {
      ...config.agent,
      'pulse-readonly': {
        ...main,
        prompt: main.prompt.replace('launch subagents', SUBAGENT_LINE),
        permission: { ...main.permission, task: { '*': 'deny', ...Object.fromEntries(SUBAGENTS.map((name) => [name, 'allow'])) } },
      },
      ...Object.fromEntries(SUBAGENTS.map((name) => [name, { permission: own }])),
    },
  };
}

export function openCodeEnvironment(environment = process.env, { lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [] } = {}) {
  return {
    ...environment,
    OPENCODE_AUTO_SHARE: 'false',
    OPENCODE_CONFIG_CONTENT: JSON.stringify(openCodeConfig({ lease, scopes, imageStudio, memoryServer, mcpServers })),
    OPENCODE_DISABLE_AUTOUPDATE: 'true',
  };
}

// The answer is what OpenCode says in its last step. A step before a tool call is narration
// («I'll take a look at the project to answer accurately.»), and glued to the answer with nothing
// between them it opened the bubble in English and left «## Qué es» as a literal line (QA 1.1.0,
// NUE-17). Short narration goes; anything longer than the answer stays, a paragraph apart.
const NARRATION_LIMIT = 400;
export function answerOfSteps(steps) {
  const said = steps.map((parts) => parts.join('').replace(/^[\s\u200b]+|[\s\u200b]+$/g, '')).filter(Boolean);
  if (said.length < 2) return said[0] ?? '';
  const last = said.at(-1);
  const before = said.slice(0, -1).join('\n\n');
  return before.length <= NARRATION_LIMIT && last.length >= before.length ? last : said.join('\n\n');
}

export function parseOpenCodeOutput(output, { root = null } = {}) {
  const steps = [[]];
  let usage = null;
  let error = null;
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'error' && event.error) {
        const detail = event.error.data?.message ?? event.error.message ?? '';
        error = [event.error.name, detail].filter(Boolean).join(': ') || 'OpenCode returned an error.';
      }
      if (event.type === 'step_start' && steps.at(-1).length) steps.push([]);
      if (event.type === 'text' && typeof event.part?.text === 'string') {
        steps.at(-1).push(event.part.text);
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
  // What its subagents did (src/adapters/subagents.mjs): each `task` call, said once it is over.
  const subagents = openCodeSubagents(jsonLines(output), { root });
  return { text: answerOfSteps(steps), usage, ...(error ? { error } : {}), ...(subagents.length ? { subagents } : {}) };
}

// What in OpenCode's error log ends a turn that will never answer. Only a limit that does not pass
// by retrying: a rate limit of a few seconds OpenCode rides out on its own and still answers.
export function watchOpenCodeErrors(stderr) {
  if (/Free usage limit reached/i.test(String(stderr ?? ''))) {
    const error = new Error(t('The free use of OpenCode ran out for now: its own free models have a limit and OpenCode stopped answering. Connect a provider of yours in Settings › Agents › OpenCode, or ask @madre or another agent.'));
    error.code = 'FREE_LIMIT';
    return error;
  }
  return null;
}

export function invokeOpenCode({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, effort = null, attachments = [], lease = null, scopes = null, imageStudio = null, memoryServer = null, mcpServers = [], onProgress = null }) {
  return runReadonlyProcess({
    // The answer written so far and its subagents, not the length of the protocol around them.
    onProgress: onProgress ? (out) => { const said = parseOpenCodeOutput(out, { root: projectRoot }); onProgress({ chars: said.text.length, subagents: said.subagents ?? [] }); } : null,
    executable,
    args: buildOpenCodeArgs({ projectRoot, prompt, attachments, effort, ...(model ? { model } : {}) }),
    cwd: projectRoot,
    env: openCodeEnvironment(process.env, { lease, scopes, imageStudio, memoryServer, mcpServers }),
    timeoutMs,
    signal,
    label: 'OpenCode',
    watchStderr: watchOpenCodeErrors,
    parse: (out) => parseOpenCodeOutput(out, { root: projectRoot }),
  });
}
