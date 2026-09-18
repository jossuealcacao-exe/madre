// The error sentinel: what MADRE tells its author when something goes wrong
// that MU/TH/UR cannot explain. A failure that matches no known condition, or a
// crash of the process, becomes a report: the error redacted (no home paths,
// no user names, no keys, no emails), the versions involved, the platform.
// Reports stay in the room ledger (sentinel.report) and can be sent two ways:
// by hand as a prefilled GitHub issue, or automatically to a collector the
// author runs, only when the human switched AUTO-REPORT on. Off by default.
// Nothing leaves the machine otherwise.

import { createHash } from 'node:crypto';
import { homedir, platform, arch, release } from 'node:os';
import { diagnose } from '../public/troubleshooting.js';

export const REPORT_WINDOW_MS = 24 * 3600 * 1000;
const MAX_ERROR_CHARS = 4000;

const SECRET_PATTERNS = [
  [/\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, '[key]'],
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[key]'],
  [/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, '[token]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[token]'],
  [/\bnpm_[A-Za-z0-9]{20,}\b/g, '[token]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, '[token]'],
  [/\b[Bb]earer\s+[A-Za-z0-9._~+/=-]{12,}/g, 'Bearer [token]'],
  [/\b[A-Fa-f0-9]{32,}\b/g, '[hex]'],
  [/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[blob]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  [/(\?)[^\s"')]+/g, '$1…'],
];

// The error as the author may read it: paths and identities out, shape intact.
export function redact(text, { home = homedir(), user = process.env.USER ?? process.env.USERNAME ?? '' } = {}) {
  let out = String(text ?? '');
  // Secrets and emails first, while they still have their shape; then places and names.
  for (const [pattern, replacement] of SECRET_PATTERNS) out = out.replace(pattern, replacement);
  if (home) out = out.split(home).join('~');
  out = out.replace(/\/(Users|home)\/[^/\s"']+/g, '/$1/…');
  out = out.replace(/[A-Za-z]:\\Users\\[^\\\s"']+/g, 'C:\\Users\\…');
  if (user && user.length > 2) out = out.split(user).join('…');
  return out.length > MAX_ERROR_CHARS ? `${out.slice(0, MAX_ERROR_CHARS - 1)}…` : out;
}

// Same failure, same fingerprint: numbers, paths and ids do not count.
export function fingerprint(agent, error) {
  const shape = String(error ?? '').toLowerCase().replace(/~?\/[^\s"']+/g, 'P').replace(/[0-9a-f]{8,}/g, 'H').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 600);
  return createHash('sha1').update(`${agent ?? 'room'}|${shape}`).digest('hex').slice(0, 12);
}

export function repoFromPackage(pkg) {
  const url = typeof pkg?.repository === 'string' ? pkg.repository : pkg?.repository?.url ?? '';
  const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
  return match ? match[1] : null;
}

export class ErrorSentinel {
  #reports = [];
  #seen = new Map();   // fingerprint -> last report time
  #pkg;
  #agents;
  #settings;
  #fetch;
  #emit;
  #save;

  constructor({ pkg = {}, agents = [], settings = {}, fetchImpl = globalThis.fetch, emit = async () => {}, save = async () => {} } = {}) {
    this.#pkg = pkg;
    this.#agents = agents;
    this.#settings = { autoReport: Boolean(settings.autoReport), reportUrl: String(settings.reportUrl ?? '').trim() };
    this.#fetch = fetchImpl;
    this.#emit = emit;
    this.#save = save;
  }

  settings() { return { ...this.#settings, canSend: Boolean(this.#settings.reportUrl), repo: repoFromPackage(this.#pkg) }; }
  async setSettings(patch = {}) {
    if (typeof patch.autoReport === 'boolean') this.#settings.autoReport = patch.autoReport;
    if (typeof patch.reportUrl === 'string') this.#settings.reportUrl = patch.reportUrl.trim();
    await this.#save({ ...this.#settings });
    return this.settings();
  }
  reports() { return [...this.#reports]; }
  report(id) { return this.#reports.find((item) => item.id === id) ?? null; }

  // Facts about this installation that help a fix and identify nobody.
  environment() {
    return {
      madre: this.#pkg.version ?? 'dev',
      node: process.version,
      platform: `${platform()} ${release()} ${arch()}`,
      agents: this.#agents.filter((agent) => agent.detected).map((agent) => `${agent.id}@${agent.version ?? '?'}`),
    };
  }

  // A room event goes by: a failure MU/TH/UR cannot classify is worth a report.
  async observe(event) {
    if (event?.type !== 'message.failed') return null;
    const { target, error } = event.payload ?? {};
    if (typeof error !== 'string' || !error.trim()) return null;
    const known = diagnose(error, target ?? null);
    if (known.length) return null;
    return this.record({ kind: 'unknown', agent: target ?? null, error, at: event.timestamp });
  }

  // The process itself failed somewhere the room did not catch.
  async crash(error, origin = 'uncaughtException') {
    const text = error instanceof Error ? `${error.stack ?? error.message}` : String(error);
    return this.record({ kind: 'crash', agent: null, error: `${origin}: ${text}` });
  }

  // Reports are seeded from the ledger on start, so a restart forgets nothing.
  seed(events) {
    for (const event of events) {
      if (event.type === 'sentinel.report') { this.#reports.push({ ...event.payload }); this.#seen.set(event.payload.fingerprint, new Date(event.timestamp).getTime()); }
      if (event.type === 'sentinel.sent') { const report = this.report(event.payload.id); if (report) report.sent = { ok: event.payload.ok, status: event.payload.status ?? null, at: event.timestamp, error: event.payload.error ?? null }; }
    }
    this.#reports = this.#reports.slice(-50);
  }

  async record({ kind, agent, error, at = new Date().toISOString() }) {
    const print = fingerprint(agent, error);
    const last = this.#seen.get(print) ?? 0;
    const now = new Date(at).getTime() || Date.now();
    if (now - last < REPORT_WINDOW_MS) {
      const existing = [...this.#reports].reverse().find((item) => item.fingerprint === print);
      if (existing) { existing.count = (existing.count ?? 1) + 1; existing.lastAt = at; }
      return null;
    }
    this.#seen.set(print, now);
    const report = { id: createHash('sha1').update(`${print}${at}`).digest('hex').slice(0, 10), kind, fingerprint: print, agent, error: redact(error), conditions: [], at, count: 1, ...this.environment(), sent: null };
    this.#reports.push(report);
    if (this.#reports.length > 50) this.#reports.shift();
    await this.#emit('sentinel.report', report);
    if (this.#settings.autoReport && this.#settings.reportUrl) await this.send(report.id).catch(() => null);
    return report;
  }

  // To the collector the author runs, when there is one and the human allowed it.
  async send(id) {
    const report = this.report(id);
    if (!report) return { ok: false, status: 404, error: 'No such report.' };
    if (!this.#settings.reportUrl) return { ok: false, status: 412, error: 'No report endpoint configured.' };
    let outcome;
    try {
      const response = await this.#fetch(this.#settings.reportUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': `madre/${this.#pkg.version ?? 'dev'}` }, body: JSON.stringify({ ...report, sent: undefined }), signal: AbortSignal.timeout(6000) });
      outcome = { ok: response.ok, status: response.status, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      outcome = { ok: false, status: null, error: error.message };
    }
    report.sent = { ...outcome, at: new Date().toISOString() };
    await this.#emit('sentinel.sent', { id, ...outcome });
    return outcome;
  }

  // A prefilled issue, the manual road: opens in the browser, the human reads it before posting.
  issueUrl(id) {
    const repo = repoFromPackage(this.#pkg);
    const report = this.report(id);
    if (!repo || !report) return null;
    const env = this.environment();
    const title = `[sentinel] ${report.kind === 'crash' ? 'crash' : `unknown condition${report.agent ? ` · @${report.agent}` : ''}`} · ${report.fingerprint}`;
    const body = [
      `**MADRE** ${env.madre} · **Node** ${env.node} · **Platform** ${env.platform}`,
      `**Agents** ${env.agents.join(', ') || 'none detected'}`,
      `**Kind** ${report.kind} · **Fingerprint** \`${report.fingerprint}\` · **Seen** ${report.count}× since ${report.at}`,
      '',
      '### What MU/TH/UR recorded',
      '```', report.error.slice(0, 3000), '```',
      '',
      '### What I was doing',
      '_(one or two lines; anything you would rather not share, leave out)_',
      '',
      '_Redacted automatically by MADRE\'s sentinel: no paths, names or keys._',
    ].join('\n');
    return `https://github.com/${repo}/issues/new?${new URLSearchParams({ title, body, labels: 'sentinel' })}`;
  }

  feedbackUrl({ about = '' } = {}) {
    const repo = repoFromPackage(this.#pkg);
    if (!repo) return null;
    const env = this.environment();
    const title = about ? `[feedback] ${about.slice(0, 80)}` : '[feedback] ';
    const body = ['### What happened, or what you wish MADRE did', '', '', '### Environment', `MADRE ${env.madre} · Node ${env.node} · ${env.platform}`, `Agents: ${env.agents.join(', ') || 'none detected'}`].join('\n');
    return `https://github.com/${repo}/issues/new?${new URLSearchParams({ title, body, labels: 'feedback' })}`;
  }
}
