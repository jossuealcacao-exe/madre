// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Grok Build (`grok`, xAI's own CLI, npm @xai-official/grok), added 2026-11-06. It read only at
// first; the same day it was opened to every mode, after its own tests (below, «Writing»).
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
//
// Writing (2026-11-06, the real CLI in a test repository). #2 and #3: the reading tools plus its edit
// and write tools, `--permission-mode dontAsk`, writing allowed everywhere and every place nobody
// writes denied one rule at a time. It created a file, changed another, was refused .env and
// .git/hooks and went on, and had no terminal to run `touch` with. #4: the terminal too, with
// `--always-approve` (a command that waited for an approval would cancel the turn): it ran `touch`
// and `git status`, was refused .env and went on. The room is the wall behind Grok's own: it locks
// .env, .git and its folders read-only for the turn and puts back whatever reaches them, and at #2
// everything that existed (room/control.mjs) — a terminal can write where a rule cannot see.
import { chmod, copyFile, mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, extname, join, sep } from 'node:path';
import { ENV_SECRETS } from '../checkpoint.mjs';
import { grokImagesDir } from '../lease.mjs';
import { t } from '../i18n.mjs';
import { runReadonlyProcess } from './process.mjs';
import { grokSteps } from './steps.mjs';
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

// What a writing turn adds: its edit tool (search_replace) and its write tool; #4, the terminal.
export const WRITE_TOOLS = ['search_replace', 'write'];
export const SHELL_TOOL = 'run_terminal_cmd';
// The places no turn writes, whatever its mode (as Cursor's and OpenCode's). `.pulse` is left to the
// room when the turn has a draft folder there, because a denial wins over an allowance and would
// shut that folder too; the room locks every other `.pulse` path itself. `.grok/` is the project's
// own Grok configuration (hooks, MCP servers, permission rules): a turn that wrote it would arm the
// next one.
const NEVER_WRITTEN = ['.git/**', '.madre/**', '.grok/**', ...ENV_SECRETS.flatMap((name) => [name, `**/${name}`]), '.claude/settings.local.json'];

// The sandbox for a turn: read-only to read, the project (and Grok's own folder, and the temporary
// ones) to write. #4 runs none: its commands install, push and deploy with what is outside the project.
export function grokSandbox(environment = process.env, lease = null) {
  const chosen = String(environment.PULSE_GROK_SANDBOX ?? '').trim().toLowerCase();
  if (chosen === 'off' || chosen === '0' || chosen === 'false') return null;
  if (lease?.airlock) return null;
  return lease ? 'workspace' : 'read-only';
}

// What the turn may do, from the lease the room gave it: none, read; #2 and #3, write; #4, also run.
export function grokPermissionsFor(lease = null) {
  if (!lease) return { tools: READ_TOOLS, mode: null, allow: [], deny: READ_DENY };
  const everywhere = Boolean(lease.create || lease.control || lease.airlock);
  const dir = String(lease.relativeDir ?? '.').replace(/^\.\/+/, '').replace(/\/+$/, '');
  const roots = everywhere || !dir || dir === '.' ? ['**'] : [`${dir}/**`];
  const never = [...NEVER_WRITTEN, ...(lease.scratchDir ? [] : ['.pulse/**'])].flatMap((glob) => [`Write(${glob})`, `Edit(${glob})`]);
  if (lease.airlock) return { tools: [...READ_TOOLS, ...WRITE_TOOLS, SHELL_TOOL], mode: 'always-approve', allow: [], deny: never };
  return { tools: [...READ_TOOLS, ...WRITE_TOOLS], mode: 'dontAsk', allow: roots.flatMap((root) => [`Write(${root})`, `Edit(${root})`]), deny: ['Bash', ...never] };
}

// The web (2026-11-07): Grok's own search and page reader, both run by xAI's servers, neither asking
// for an approval (tried in a reading turn: it searched and opened nodejs.org and example.com). Off
// until the person turns on Web access for Grok, as for every agent.
export const WEB_TOOLS = ['web_search', 'web_fetch'];
// Images (2026-11-08): Grok's own image tool, run by xAI, allowed by name (without the rule it waits for
// an approval and the turn is cancelled; with it, it generated). Only in a writing turn with images on.
export const IMAGE_TOOL = 'image_gen';

export function buildGrokArgs({ projectRoot, promptFile, model = process.env.PULSE_GROK_MODEL || null, effort = null, lease = null, scopes = null, environment = process.env }) {
  const sandbox = grokSandbox(environment, lease);
  const allowed = grokPermissionsFor(lease);
  const web = Boolean(scopes?.web);
  const images = Boolean(lease && scopes?.imageGen);
  return [
    // From a file, word for word: a message that starts with «/» or «-» is not a command or a flag.
    '--prompt-file', promptFile,
    '--verbatim',
    '--output-format', 'streaming-messages-json',
    '--cwd', projectRoot,
    '--tools', [...allowed.tools, ...(web ? WEB_TOOLS : []), ...(images ? [IMAGE_TOOL] : [])].join(','),
    '--disallowed-tools', MCP_META_TOOLS.join(','),
    // #4 approves every call of its own (a command waiting for an approval would cancel the turn);
    // #2 and #3 approve only what is allowed below and refuse the rest without asking.
    ...(allowed.mode === 'always-approve' ? ['--always-approve'] : allowed.mode ? ['--permission-mode', allowed.mode] : []),
    ...allowed.allow.flatMap((rule) => ['--allow', rule]),
    ...(images ? ['--allow', IMAGE_TOOL] : []),
    ...allowed.deny.flatMap((rule) => ['--deny', rule]),
    ...(sandbox ? ['--sandbox', sandbox] : []),
    '--no-subagents',
    ...(web ? [] : ['--disable-web-search']),
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
// The images its tool saved, as the tool reported them: `{"type":"ImageGen","path":"…"}` in a result.
export function grokImagesIn(events) {
  const paths = [];
  for (const event of events) {
    if (event?.type !== 'user') continue;
    for (const part of event.message?.content ?? []) {
      if (part?.type !== 'tool_result' || typeof part.content !== 'string') continue;
      try { const said = JSON.parse(part.content); if (said?.type === 'ImageGen' && typeof said.path === 'string') paths.push(said.path); } catch { /* not an image */ }
    }
  }
  return [...new Set(paths)];
}

export function parseGrokOutput(output) {
  const events = jsonLines(output);
  const images = grokImagesIn(events);
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
  return { text: typeof last.result === 'string' ? last.result.trim() : '', usage, ...(images.length ? { images } : {}) };
}

// While it runs: what it has written so far.
export function grokProgress(output, { root = null } = {}) {
  let chars = 0;
  const events = jsonLines(output);
  for (const event of events) {
    if (event?.type !== 'assistant' || event.parent_tool_use_id) continue;
    for (const part of event.message?.content ?? []) if (part?.type === 'text') chars += String(part.text ?? '').length;
  }
  return { chars, steps: grokSteps(events, { root }) };
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

export function parseGrokStatus(output, env = process.env, { saved = false } = {}) {
  const said = String(output ?? '');
  if (/you are logged in|signed in as/i.test(said)) return { state: 'signed-in', detail: said.match(/logged in with ([^\s.]+(?:\.[^\s.]+)*)/i)?.[1] ?? 'grok.com' };
  if (/not authenticated|not signed in|not logged in/i.test(said)) {
    // A key is Grok's fallback when there is no session (its manual; not yet tried here).
    if (env.XAI_API_KEY) return { state: 'signed-in', detail: 'via XAI_API_KEY' };
    // `grok models` does not renew an expired session; a turn does (2026-11-08: a copy started while the
    // session was due was told «not authenticated», and Grok renewed it minutes later). While its saved
    // session is there (~/.grok/auth.json, gone after `grok logout`), Grok is not signed out.
    return saved ? { state: 'signed-in', detail: 'grok.com · session saved' } : { state: 'signed-out', detail: 'grok login' };
  }
  return { state: 'unknown', detail: said.trim().split('\n')[0]?.slice(0, 120) || 'no answer from grok models' };
}

// The images go into the project only from Grok's own folder, and only as images: a path the tool
// reported that leads anywhere else is left where it is. A name already taken gets a number.
const IMAGE_KINDS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
export async function copyGrokImages(paths, { projectRoot, lease, environment = process.env }) {
  const home = await realpath(environment.GROK_HOME || join(homedir(), '.grok')).catch(() => null);
  if (!home) return [];
  const dir = grokImagesDir(lease);
  const target = join(projectRoot, dir);
  const saved = [];
  for (const path of paths) {
    const real = await realpath(path).catch(() => null);
    if (!real || !real.startsWith(home + sep) || !IMAGE_KINDS.has(extname(real).toLowerCase())) continue;
    if (!(await stat(real).catch(() => null))?.isFile()) continue;
    await mkdir(target, { recursive: true });
    const ext = extname(real).toLowerCase();
    const stem = basename(real, extname(real)).replace(/[^\w.-]+/g, '-').slice(0, 60) || 'imagen';
    let name = `grok-${stem}${ext}`;
    for (let n = 2; await stat(join(target, name)).catch(() => null); n += 1) name = `grok-${stem}-${n}${ext}`;
    await copyFile(real, join(target, name));
    saved.push(`${dir}/${name}`);
  }
  return saved;
}

export async function invokeGrok({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, effort = null, lease = null, scopes = null, onProgress = null }) {
  // The message goes in a file only this person can read, made for the turn and removed after it.
  const dir = await mkdtemp(join(tmpdir(), 'madre-grok-'));
  try {
    const promptFile = join(dir, 'prompt.md');
    await writeFile(promptFile, String(prompt ?? ''), { mode: 0o600 });
    await chmod(promptFile, 0o600).catch(() => {});
    const result = await runReadonlyProcess({
      onProgress: onProgress ? (out) => onProgress(grokProgress(out, { root: projectRoot })) : null,
      executable,
      args: buildGrokArgs({ projectRoot, promptFile, ...(model ? { model } : {}), effort, lease, scopes }),
      cwd: projectRoot,
      env: grokEnvironment(process.env),
      timeoutMs,
      signal,
      label: 'Grok',
      parse: parseGrokOutput,
    });
    if (!lease || !result.images?.length) return result;
    const saved = await copyGrokImages(result.images, { projectRoot, lease, environment: process.env });
    if (!saved.length) return result;
    return { ...result, text: `${result.text}\n\n${t('Images MADRE saved in the project: {list}', { list: saved.join(', ') })}` };
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }).catch(() => {});
  }
}
