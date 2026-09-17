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
//   gemini, opencode  Nothing published locally: the room's own rolling
//           window stands in.
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

// Codex is on by default: a local file read. Claude's usage endpoint needs
// the CLI's OAuth token from the keychain, which macOS may ask about, so it is
// opt-in: PULSE_CLAUDE_USAGE=1. PULSE_OFFICIAL_QUOTA=0 turns everything off.
export function defaultQuotaSources({ env = process.env } = {}) {
  if (env.PULSE_OFFICIAL_QUOTA === '0') return [];
  const sources = [codexRolloutSource()];
  if (env.PULSE_CLAUDE_USAGE === '1') sources.push(claudeUsageSource());
  return sources;
}

// Human-readable window label for the room: "5h" / "7d" / "300m".
export function windowLabel(minutes) {
  if (!Number.isFinite(Number(minutes))) return 'window';
  const m = Number(minutes);
  if (m % 1440 === 0) return `${m / 1440}d`;
  if (m % 60 === 0) return `${m / 60}h`;
  return `${m}m`;
}
