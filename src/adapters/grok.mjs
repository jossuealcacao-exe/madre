// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Grok Build (`grok`, xAI's own CLI, npm @xai-official/grok), added 2026-11-06. It reads only.
//
// Tried against the real CLI (1.0.77, a Grok Plus account) on 2026-11-06, before a line was written
// here (docs/private/INVESTIGACION-GROK.md §8b):
//
//   · `--output-format streaming-messages-json` is Claude Code's stream-json, line for line: a
//     `system/init`, the `assistant` and `user` messages, and one closing `result` with the answer,
//     the turn's tokens summed over every model call, and the cost (also for an account session).
//   · Grok reads the person's Claude permissions: ~/.claude/settings.json always, and the project's
//     .claude/settings*.json once the folder is trusted. An `allow: Bash(cp *)` there let a headless
//     turn copy a file without asking. Its compatibility switches (GROK_CLAUDE_*_ENABLED) turn off
//     skills, hooks and the rest, never those permissions — so a reading turn is given only the
//     tools that read (`--tools`): a terminal it does not have cannot be allowed by anyone's rule.
//     With that, and the same Claude rule in place, it wrote nothing and said why.
//   · A call that needs an approval cancels the WHOLE turn (`errors: ["cancelled"]`, exit code 0)
//     instead of being refused and going on; an explicit `--deny` is refused and the turn goes on.
//     Hence the denials below, one rule per flag (two in one value were read as one tool name).
//   · `--sandbox read-only` (Seatbelt on macOS) refused a write outside /tmp with «Operation not
//     permitted» even under always-approve. It is the second wall, not the first. Not yet tried on
//     Linux or WSL2 (Landlock); PULSE_GROK_SANDBOX=off leaves it out where it cannot start.
//
// The folder is not trusted for the turn (no `--trust`): a headless read needs no trust, and trust
// is kept by Grok for good and would bring the project's Claude rules and .grok/ along with it.
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { t } from '../i18n.mjs';
import { runReadonlyProcess } from './process.mjs';
import { jsonLines } from './subagents.mjs';

// What a reading turn may use: the three tools that read. Everything else Grok offers by default
// (terminal, edits, `write`, subagents, schedulers, workflows, web, image and video) is absent.
export const READ_TOOLS = ['read_file', 'list_dir', 'grep'];
// Taken away even though --tools already leaves them out: a denial is refused and the turn goes on.
export const READ_DENY = ['Bash', 'Edit', 'Write'];
// Grok keeps its MCP meta-tools beside any --tools list; no server of the person's reaches a turn.
export const MCP_META_TOOLS = ['search_tool', 'use_tool'];
// What Grok would bring in from the other agents' folders. Off for a turn, so the person's Claude
// hooks never fire inside a Grok turn. Grok reads `false`, not `0` (tried with `grok inspect`).
const COMPAT_OFF = Object.fromEntries(['CLAUDE', 'CURSOR'].flatMap((vendor) => ['AGENTS', 'HOOKS', 'MCPS', 'RULES', 'SKILLS'].map((surface) => [`GROK_${vendor}_${surface}_ENABLED`, 'false'])));

export function grokSandbox(environment = process.env) {
  const chosen = String(environment.PULSE_GROK_SANDBOX ?? '').trim().toLowerCase();
  return chosen === 'off' || chosen === '0' || chosen === 'false' ? null : 'read-only';
}

export function buildGrokArgs({ projectRoot, promptFile, model = process.env.PULSE_GROK_MODEL || null, effort = null, environment = process.env }) {
  const sandbox = grokSandbox(environment);
  return [
    // From a file, word for word: a message that starts with «/» or «-» is not a command or a flag.
    '--prompt-file', promptFile,
    '--verbatim',
    '--output-format', 'streaming-messages-json',
    '--cwd', projectRoot,
    '--tools', READ_TOOLS.join(','),
    '--disallowed-tools', MCP_META_TOOLS.join(','),
    ...READ_DENY.flatMap((rule) => ['--deny', rule]),
    ...(sandbox ? ['--sandbox', sandbox] : []),
    '--no-subagents',
    '--disable-web-search',
    '--no-memory',
    '--no-wait-for-background',
    '--no-auto-update',
    ...(model && model !== 'default' ? ['--model', model] : []),
    ...(effort ? ['--effort', effort] : []),
  ];
}

export function grokEnvironment(environment = process.env) {
  return { ...environment, ...COMPAT_OFF, GROK_DISABLE_AUTOUPDATER: '1', GROK_MEMORY: '0' };
}

// xAI's refusals, in words a person can act on. The 403 is the one seen on 2026-11-06: an account
// whose plan was paid after its sign-in; signing in again fixed it.
export function grokFailure(raw) {
  const said = String(raw ?? '');
  if (/permission-denied|chat endpoint is denied|\b403\b/i.test(said)) {
    return t('xAI refused this Grok account (403). Sign in again (grok logout, then grok login); if it keeps happening, check at grok.com that your plan is active.');
  }
  if (/not signed in|not logged in|token expired|not authenticated/i.test(said)) {
    return t('Grok is not signed in. Sign in from Settings › Agents › Grok, or run grok login in a terminal.');
  }
  if (/\b429\b|rate.?limit|usage limit|quota/i.test(said)) {
    return t('Grok says this account has reached its usage limit for now.');
  }
  return null;
}

// The closing `result` carries the answer, the tokens of every model call of the run, and the
// cost; a cost of 0 means unknown, never free (Grok's own manual). An error carries `errors[]`.
export function parseGrokOutput(output) {
  const events = jsonLines(output);
  const last = events.filter((event) => event?.type === 'result').at(-1);
  if (!last) {
    // Cut short before its close: what it had written so far is all there is.
    const pieces = events.filter((event) => event?.type === 'assistant' && !event.parent_tool_use_id)
      .flatMap((event) => event.message?.content ?? []).filter((part) => part?.type === 'text').map((part) => part.text);
    return { text: pieces.join('').trim(), usage: null };
  }
  if (last.is_error) {
    const errors = Array.isArray(last.errors) ? last.errors.map(String) : [];
    const said = errors.join(' ');
    const error = grokFailure(said)
      ?? (errors.length === 1 && errors[0] === 'cancelled'
        ? t('Grok stopped the turn: a step needed an approval that a turn cannot give.')
        : (said.trim() ? t('Grok returned an error: {error}', { error: said.trim().slice(0, 300) }) : t('Grok returned an error.')));
    return { text: '', usage: null, error };
  }
  const tokens = last.usage && typeof last.usage === 'object' ? last.usage : null;
  const count = (key) => Number(tokens?.[key] ?? 0) || 0;
  const cost = Number(last.total_cost_usd);
  const usage = tokens
    ? {
        inputTokens: count('input_tokens'),
        cacheCreationInputTokens: count('cache_creation_input_tokens'),
        cachedInputTokens: count('cache_read_input_tokens'),
        outputTokens: count('output_tokens'),
        reasoningTokens: 0,
        totalTokens: count('input_tokens') + count('cache_creation_input_tokens') + count('cache_read_input_tokens') + count('output_tokens'),
        costUsd: Number.isFinite(cost) && cost > 0 ? cost : null,
        source: 'grok-json',
      }
    : null;
  return { text: typeof last.result === 'string' ? last.result.trim() : '', usage };
}

// While it runs: what it has written so far.
export function grokProgress(output) {
  let chars = 0;
  for (const event of jsonLines(output)) {
    if (event?.type !== 'assistant' || event.parent_tool_use_id) continue;
    for (const part of event.message?.content ?? []) if (part?.type === 'text') chars += String(part.text ?? '').length;
  }
  return { chars };
}

// `grok models` says whether there is a session, and lists the account's models (2026-11-06):
//   «You are logged in with grok.com.» / «You are not authenticated.»
//   «Default model: grok-4.7» then «  * grok-4.7 (default)», «  - grok-4.6»…
// It exits 0 either way: the words decide.
export function parseGrokModels(output) {
  const text = String(output ?? '');
  const models = [];
  let fallback = null;
  for (const line of text.split('\n')) {
    const listed = line.match(/^\s*[*-]\s+([\w.:-]+)(\s+\(default\))?\s*$/);
    if (listed) {
      models.push(listed[1]);
      if (listed[2]) fallback = listed[1];
    }
  }
  const named = text.match(/Default model:\s*([\w.:-]+)/);
  return { models, default: named?.[1] ?? fallback };
}

export function parseGrokStatus(output, env = process.env) {
  const said = String(output ?? '');
  if (/you are logged in|signed in as/i.test(said)) return { state: 'signed-in', detail: said.match(/logged in with ([^\s.]+(?:\.[^\s.]+)*)/i)?.[1] ?? 'grok.com' };
  if (/not authenticated|not signed in|not logged in/i.test(said)) {
    // A key is Grok's fallback when there is no session (its manual; not yet tried here).
    return env.XAI_API_KEY ? { state: 'signed-in', detail: 'via XAI_API_KEY' } : { state: 'signed-out', detail: 'grok login' };
  }
  return { state: 'unknown', detail: said.trim().split('\n')[0]?.slice(0, 120) || 'no answer from grok models' };
}

export async function invokeGrok({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, effort = null, onProgress = null }) {
  // The message goes in a file only this person can read, made for the turn and removed after it.
  const dir = await mkdtemp(join(tmpdir(), 'madre-grok-'));
  try {
    const promptFile = join(dir, 'prompt.md');
    await writeFile(promptFile, String(prompt ?? ''), { mode: 0o600 });
    await chmod(promptFile, 0o600).catch(() => {});
    return await runReadonlyProcess({
      onProgress: onProgress ? (out) => onProgress(grokProgress(out)) : null,
      executable,
      args: buildGrokArgs({ projectRoot, promptFile, ...(model ? { model } : {}), effort }),
      cwd: projectRoot,
      env: grokEnvironment(process.env),
      timeoutMs,
      signal,
      label: 'Grok',
      parse: parseGrokOutput,
    });
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }).catch(() => {});
  }
}
