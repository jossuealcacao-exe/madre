// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Where the real limits come from, per CLI, when the CLI exposes them.
//
//   codex   The Codex CLI writes a `token_count` event with the account's
//           rate limits (5-hour and weekly windows, used_percent, resets_at)
//           into every session rollout under ~/.codex/sessions. Reading the
//           newest one costs nothing and needs no network.
//   claude  Claude Code shows /usage from Anthropic's OAuth usage endpoint.
//           MADRE asks the same endpoint with the OAuth token Claude Code
//           already keeps in the keychain (macOS) or ~/.claude/.credentials.json.
//           Read-only; the token never leaves this machine except toward
//           api.anthropic.com, which is where the CLI sends it anyway.
//   gemini  Signed in with a Google account (2026-11-10), Gemini CLI asks Code
//           Assist for the account's quota (v1internal:retrieveUserQuota, one
//           bucket per model with the fraction left and when it resets). MADRE
//           asks the same, with the token the CLI keeps in ~/.gemini, only while
//           that token is fresh: it never refreshes nor writes it. With an API
//           key Google publishes nothing: the room's window stands in.
//   opencode  By its provider (2026-11-10), from OpenCode's own auth.json: a GitHub Copilot sign-in
//           asks GitHub how many premium requests are left this month (the same endpoint the
//           editors use, copilot_internal/user); an OpenRouter key asks OpenRouter how much of its
//           limit or of the account's credits is spent (/api/v1/key, /api/v1/credits). The
//           tightest of the two is OpenCode's. Others publish nothing: the room's window.
//
// A window whose resets_at is already in the past is reported as fresh
// (0 % used, stale: true): the CLI only rewrites the file when it runs again,
// and a full ring after a reset was exactly the bug this file exists for.

const toIso = (seconds) => (Number.isFinite(Number(seconds)) && Number(seconds) > 0 ? new Date(Number(seconds) * (Number(seconds) > 1e12 ? 1 : 1000)).toISOString() : null);

export function interpretWindow(window, now = Date.now()) {
  if (!window || !Number.isFinite(Number(window.usedPercent))) return null;
  const resetAt = window.resetAt ?? null;
  const expired = resetAt ? new Date(resetAt).getTime() <= now : false;
  return {
    usedPercent: expired ? 0 : Math.max(0, Math.min(100, Number(window.usedPercent))),
    resetAt: expired ? null : resetAt,
    windowMinutes: window.windowMinutes ?? null,
    stale: expired,
  };
}

// Newest `rate_limits` with a populated primary window, from the most recent
// rollout files. Returns null when Codex has never reported limits here.
export async function readCodexRateLimits({ home = join(homedir(), '.codex'), maxFiles = 6, now = Date.now() } = {}) {
  const sessions = join(home, 'sessions');
  const files = [];
  async function walk(dir, depth) {
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && depth < 4) await walk(path, depth + 1);
      else if (entry.isFile() && /^rollout-.*\.jsonl$/.test(entry.name)) {
        const info = await stat(path).catch(() => null);
        if (info) files.push({ path, mtimeMs: info.mtimeMs });
      }
    }
  }
  await walk(sessions, 0);
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const file of files.slice(0, maxFiles)) {
    let text;
    try { text = await readFile(file.path, 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (!lines[index].includes('"used_percent"')) continue;
      let event;
      try { event = JSON.parse(lines[index]); } catch { continue; }
      const payload = event.payload ?? event;
      const limits = payload.rate_limits;
      if (!limits?.primary) continue;
      const primary = interpretWindow({ usedPercent: limits.primary.used_percent, resetAt: toIso(limits.primary.resets_at), windowMinutes: limits.primary.window_minutes }, now);
      const secondary = limits.secondary ? interpretWindow({ usedPercent: limits.secondary.used_percent, resetAt: toIso(limits.secondary.resets_at), windowMinutes: limits.secondary.window_minutes }, now) : null;
      return {
        agent: 'codex',
        usedPercent: Math.max(primary.usedPercent, secondary?.usedPercent ?? 0),
        resetAt: primary.resetAt ?? secondary?.resetAt ?? null,
        stale: primary.stale,
        windows: { primary, secondary },
        plan: limits.plan_type ?? null,
        observedAt: event.timestamp ?? null,
      };
    }
  }
  return null;
}

export const codexRolloutSource = (options = {}) => ({
  id: 'codex-rollout',
  agent: 'codex',
  read: () => readCodexRateLimits(options),
});

// Claude Code's OAuth token, the way the CLI stores it.
export async function readClaudeOauthToken({ env = process.env, platform = process.platform, home = homedir() } = {}) {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return env.CLAUDE_CODE_OAUTH_TOKEN;
  const parse = (raw) => {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.claudeAiOauth?.accessToken ?? null;
    } catch { return null; }
  };
  if (platform === 'darwin') {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { stdout } = await execFileAsync('/usr/bin/security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { timeout: 4000 });
        const token = parse(stdout.trim());
        if (token) return token;
      } catch { /* try the file */ }
    }
  }
  try {
    return parse(await readFile(join(home, '.claude', '.credentials.json'), 'utf8'));
  } catch { return null; }
}

export async function readClaudeUsage({ fetchImpl = fetch, tokenReader = readClaudeOauthToken, now = Date.now() } = {}) {
  const token = await tokenReader();
  if (!token) return null;
  const response = await fetchImpl('https://api.anthropic.com/api/oauth/usage', {
    headers: { authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20', accept: 'application/json' },
  });
  if (response.status === 401 || response.status === 403) throw new Error(`Anthropic rejected the Claude Code token (HTTP ${response.status}); sign in again with claude.`);
  if (!response.ok) throw new Error(`Anthropic usage endpoint answered HTTP ${response.status}.`);
  const body = await response.json();
  const five = body.five_hour ? interpretWindow({ usedPercent: body.five_hour.utilization, resetAt: body.five_hour.resets_at ?? null, windowMinutes: 300 }, now) : null;
  const week = body.seven_day ? interpretWindow({ usedPercent: body.seven_day.utilization, resetAt: body.seven_day.resets_at ?? null, windowMinutes: 10080 }, now) : null;
  if (!five && !week) return null;
  return {
    agent: 'claude',
    usedPercent: Math.max(five?.usedPercent ?? 0, week?.usedPercent ?? 0),
    resetAt: five?.resetAt ?? week?.resetAt ?? null,
    stale: Boolean(five?.stale),
    windows: { primary: five, secondary: week },
    observedAt: new Date(now).toISOString(),
  };
}

export const claudeUsageSource = (options = {}) => ({
  id: 'claude-usage',
  agent: 'claude',
  read: () => readClaudeUsage(options),
});

// Gemini CLI's own Google sign-in, as it keeps it: the token only while it is fresh, and only when
// the CLI is set to sign in with Google (an API key has no quota to ask about).
export async function readGeminiOauth({ home = homedir(), now = Date.now(), env = process.env } = {}) {
  const dir = join(home, '.gemini');
  let settings = {};
  try { settings = JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8')); } catch { settings = {}; }
  const kind = settings.security?.auth?.selectedType ?? settings.selectedAuthType ?? settings.selectedType ?? null;
  if (kind && kind !== 'oauth-personal') return null;
  let creds = null;
  try { creds = JSON.parse(await readFile(join(dir, 'oauth_creds.json'), 'utf8')); } catch { return null; }
  const expires = Number(creds?.expiry_date);
  if (!creds?.access_token || !Number.isFinite(expires) || expires - now < 60_000) return null;
  return { token: creds.access_token, project: env.GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT_ID || null };
}

const CODE_ASSIST = 'https://cloudcode-pa.googleapis.com/v1internal';
let geminiProject = null;
export async function readGeminiQuota({ fetchImpl = fetch, oauthReader = readGeminiOauth, now = Date.now() } = {}) {
  const auth = await oauthReader({ now });
  if (!auth) return null;
  const post = async (method, body) => {
    const response = await fetchImpl(`${CODE_ASSIST}:${method}`, { method: 'POST', headers: { authorization: `Bearer ${auth.token}`, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
    if (response.status === 401 || response.status === 403) throw new Error(`Google rejected Gemini CLI's sign-in (HTTP ${response.status}); sign in again with gemini.`);
    if (!response.ok) throw new Error(`Gemini's quota endpoint answered HTTP ${response.status}.`);
    return response.json();
  };
  // The account's Code Assist project, as the CLI finds it; asked once.
  let project = auth.project ?? geminiProject;
  if (!project) {
    const loaded = await post('loadCodeAssist', { metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' } });
    project = loaded?.cloudaicompanionProject?.id ?? loaded?.cloudaicompanionProject ?? null;
    if (typeof project !== 'string' || !project) return null;
    geminiProject = project;
  }
  const quota = await post('retrieveUserQuota', { project });
  // The tightest of its models: the one that runs out first is the one that stops a turn.
  const buckets = (quota?.buckets ?? []).filter((one) => one?.modelId && Number.isFinite(Number(one.remainingFraction)));
  if (!buckets.length) return null;
  const tightest = buckets.reduce((low, one) => (Number(one.remainingFraction) < Number(low.remainingFraction) ? one : low));
  const primary = interpretWindow({ usedPercent: (1 - Number(tightest.remainingFraction)) * 100, resetAt: tightest.resetTime ?? null, windowMinutes: 1440 }, now);
  return {
    agent: 'gemini',
    usedPercent: primary.usedPercent,
    resetAt: primary.resetAt,
    stale: primary.stale,
    windows: { primary, secondary: null },
    model: tightest.modelId,
    observedAt: new Date(now).toISOString(),
  };
}

export const geminiQuotaSource = (options = {}) => ({
  id: 'gemini-quota',
  agent: 'gemini',
  read: () => readGeminiQuota(options),
});

// OpenCode's providers as its auth.json keeps them (src/credentials.mjs writes the same file).
export async function readOpenCodeAuth({ home = homedir(), env = process.env } = {}) {
  const file = join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'opencode', 'auth.json');
  try {
    const auth = JSON.parse(await readFile(file, 'utf8'));
    return auth && typeof auth === 'object' && !Array.isArray(auth) ? auth : {};
  } catch { return {}; }
}

// GitHub Copilot: the premium requests of the month, with the GitHub token OpenCode signed in with.
export async function readCopilotQuota(entry, { fetchImpl = fetch, now = Date.now() } = {}) {
  const token = entry?.type === 'oauth' ? entry.refresh : null;
  if (typeof token !== 'string' || !token) return null;
  const response = await fetchImpl('https://api.github.com/copilot_internal/user', { headers: { authorization: `token ${token}`, accept: 'application/json', 'x-github-api-version': '2025-04-01' } });
  if (response.status === 401 || response.status === 403) throw new Error(`GitHub rejected OpenCode's Copilot sign-in (HTTP ${response.status}); sign in again with opencode auth login.`);
  if (!response.ok) throw new Error(`GitHub's Copilot endpoint answered HTTP ${response.status}.`);
  const body = await response.json();
  const premium = body?.quota_snapshots?.premium_interactions;
  if (!premium || premium.unlimited || !Number.isFinite(Number(premium.percent_remaining))) return null;
  const resetAt = body.quota_reset_date ? new Date(body.quota_reset_date).toISOString() : null;
  return { provider: 'github-copilot', ...interpretWindow({ usedPercent: 100 - Number(premium.percent_remaining), resetAt, windowMinutes: null }, now) };
}

// OpenRouter: the key's own limit when it has one, the account's credits when it does not.
export async function readOpenRouterQuota(entry, { fetchImpl = fetch, now = Date.now() } = {}) {
  const key = entry?.type === 'api' ? entry.key : null;
  if (typeof key !== 'string' || !key) return null;
  const ask = async (path) => {
    const response = await fetchImpl(`https://openrouter.ai/api/v1/${path}`, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) throw new Error(`OpenRouter rejected the key OpenCode has for it (HTTP ${response.status}).`);
    if (!response.ok) throw new Error(`OpenRouter answered HTTP ${response.status}.`);
    return (await response.json())?.data ?? null;
  };
  const own = await ask('key');
  if (Number(own?.limit) > 0) return { provider: 'openrouter', ...interpretWindow({ usedPercent: (Number(own.usage ?? 0) / Number(own.limit)) * 100, resetAt: null, windowMinutes: null }, now) };
  const credits = await ask('credits');
  if (!(Number(credits?.total_credits) > 0)) return null;
  return { provider: 'openrouter', ...interpretWindow({ usedPercent: (Number(credits.total_usage ?? 0) / Number(credits.total_credits)) * 100, resetAt: null, windowMinutes: null }, now) };
}

export async function readOpenCodeQuota({ authReader = readOpenCodeAuth, fetchImpl = fetch, now = Date.now() } = {}) {
  const auth = await authReader();
  const readings = (await Promise.all([
    auth['github-copilot'] ? readCopilotQuota(auth['github-copilot'], { fetchImpl, now }).catch(() => null) : null,
    auth.openrouter ? readOpenRouterQuota(auth.openrouter, { fetchImpl, now }).catch(() => null) : null,
  ])).filter(Boolean);
  if (!readings.length) return null;
  const tightest = readings.reduce((high, one) => (one.usedPercent > high.usedPercent ? one : high));
  return {
    agent: 'opencode',
    usedPercent: tightest.usedPercent,
    resetAt: tightest.resetAt,
    stale: tightest.stale,
    provider: tightest.provider,
    windows: { primary: tightest, secondary: null },
    observedAt: new Date(now).toISOString(),
  };
}

export const openCodeQuotaSource = (options = {}) => ({
  id: 'opencode-quota',
  agent: 'opencode',
  read: () => readOpenCodeQuota(options),
});

// Codex is on by default: a local file read. Claude's usage endpoint needs
// the CLI's OAuth token from the keychain, which macOS may ask about, so it is
// opt-in: PULSE_CLAUDE_USAGE=1. Gemini's is a file read and a question to Google with the CLI's own
// fresh token, and OpenCode's a question to GitHub or OpenRouter with what OpenCode signed in with,
// so they are on (PULSE_GEMINI_QUOTA=0, PULSE_OPENCODE_QUOTA=0 turn them off). PULSE_OFFICIAL_QUOTA=0 turns
// everything off.
export function defaultQuotaSources({ env = process.env } = {}) {
  if (env.PULSE_OFFICIAL_QUOTA === '0') return [];
  const sources = [codexRolloutSource()];
  if (env.PULSE_GEMINI_QUOTA !== '0') sources.push(geminiQuotaSource());
  if (env.PULSE_OPENCODE_QUOTA !== '0') sources.push(openCodeQuotaSource());
  if (env.PULSE_CLAUDE_USAGE === '1') sources.push(claudeUsageSource());
  return sources;
}

