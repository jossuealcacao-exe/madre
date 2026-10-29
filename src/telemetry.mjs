// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// ANONYMOUS DIAGNOSTICS (2026-10-28): what goes wrong in every copy of MADRE, and how much of it is
// used, told to its author on madre.run without asking the person anything.
//
// Two kinds of thing are kept, here, in ~/.pulse/telemetry/, one file per day:
//   · errors — every failure a room or the page meets, the ones Diagnostics knows (with their MU
//     code) and the ones it does not, crashes of the process, routes that broke, installs that
//     failed: the message redacted by the sentinel's own rules (no home, no user name, no key, no
//     email), the first lines of MADRE's own code it went through, and a fingerprint so the same
//     failure in a thousand copies is one row;
//   · counts — how many turns went to which agent and at which mode, which features ran, which of
//     MADRE's modules are on: numbers and names of MADRE's own parts, never anything a person wrote,
//     no project, no path, no file name.
// Once a day (with the «still in use» notice), and an hour after a failure never seen before, what
// is kept goes to madre.run/api/telemetry with this copy's random install id, its version, its
// system and Node's major version — the four things the notice already says — and is then deleted
// here. Offline it waits; MADRE never waits on it.
//
// It is on unless the person turns it off (Settings › Version and reports › «Send anonymous
// diagnostics», or PULSE_TELEMETRY=0): the author's decision, 2026-10-28. The exact batch that would
// go next can be read in the same place (`preview`). docs/REFERENCE.md › «Lo que sale de la máquina».

import { createHash } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, rename, rm, rmdir } from 'node:fs/promises';
import { arch } from 'node:os';
import { join } from 'node:path';
import { installId } from './heartbeat.mjs';
import { redact } from './sentinel-errors.mjs';

export const TELEMETRY_URL = 'https://madre.run/api/telemetry';
export const TELEMETRY_VERSION = 1;
// What one copy keeps and sends at most: enough to read a fault, never a flood.
const MAX_MESSAGE = 600;
const MAX_FRAMES = 6;
const MAX_ERRORS = 60;
const MAX_COUNTS = 160;
const MAX_DAYS = 14;
const SOON_MS = 60 * 60 * 1000;
const KINDS = new Set(['agent', 'crash', 'route', 'page', 'install', 'model', 'startup', 'other']);
const KEY = /^[a-z0-9][a-z0-9._:-]{0,47}$/;
const AGENT = /^[a-z][a-z0-9-]{0,23}$/;
const CODE = /^MU-\d{3}$/;
// A day's file, and one set aside while it travels (kept if the send failed, sent with the next).
const FILE = /^\d{4}-\d{2}-\d{2}\.jsonl(?:\.[a-z0-9]+\.out)?$/;

const dayOf = (date) => date.toISOString().slice(0, 10);
export const telemetryDir = (root) => join(root, 'telemetry');

// Whether this copy tells: on unless the person or the environment said no.
export function telemetryOn(config = {}, env = process.env) {
  if (env.PULSE_TELEMETRY === '0') return false;
  return config?.telemetry?.diagnostics !== false;
}

// MADRE's own frames of a stack, as places in its code: «src/server.mjs:1204», never a path of the
// machine, never a frame of Node or of a dependency.
export function ownFrames(stack) {
  const frames = [];
  for (const line of String(stack ?? '').split('\n')) {
    // In the server's own files, or in a page's scripts as the browser names them (its address).
    const place = line.match(/(?:\/|\\|\()((?:src|public|bin)[/\\][\w./\\-]+\.(?:m?js|cjs)):(\d+)(?::\d+)?/)
      ?? line.match(/https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\/()([\w.-]+\.js):(\d+)(?::\d+)?/);
    if (!place) continue;
    const file = place[1] || (place[2] ? `public/${place[2]}` : '');
    const at = `${file.replace(/\\/g, '/')}:${place[3] ?? place[2]}`;
    if (!frames.includes(at)) frames.push(at);
    if (frames.length >= MAX_FRAMES) break;
  }
  return frames;
}

// Every path in a message is a place of the person's (a project, a folder, a file name): it leaves as
// «<path>», keeping only its extension; a place in MADRE's own code keeps its name inside the code.
export function placesOut(text) {
  return String(text ?? '')
    .replace(/(?:[A-Za-z]:\\|~[\\/]|(?<![:\w/.])\.{0,2}\/)[^\s"'`,;)]*[\\/][^\s"'`,;)]*/g, (path) => {
      const own = path.replace(/\\/g, '/').match(/(?:^|\/)((?:src|public|bin)\/[\w./-]+\.(?:m?js|cjs))(?::\d+)*$/);
      if (own && /(?:^|\/)(?:madre|pulse)\/|node_modules\/(?:@[^/]+\/)?madre\//.test(path.replace(/\\/g, '/'))) return own[1];
      const ext = path.match(/\.([a-z0-9]{1,6})$/i);
      return ext ? `<path>.${ext[1].toLowerCase()}` : '<path>';
    });
}

// One failure, in the shape that leaves: everything that could name the person or the machine out.
export function errorEntry({ kind = 'other', code = null, agent = null, agentVersion = null, message = '', stack = null, where = null } = {}, { home, user } = {}) {
  const said = placesOut(redact(String(message ?? '').split('\n')[0] || String(message ?? ''), { home, user })).replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE);
  const frames = ownFrames(stack ?? message);
  const safeKind = KINDS.has(kind) ? kind : 'other';
  const safeAgent = typeof agent === 'string' && AGENT.test(agent) ? agent : null;
  const safeCode = typeof code === 'string' && CODE.test(code) ? code : null;
  // The same failure everywhere is one fingerprint: numbers, quoted words and ids do not count.
  const shape = said.toLowerCase().replace(/["'«][^"'»]*["'»]/g, 'Q').replace(/[0-9a-f]{8,}/g, 'H').replace(/\d+/g, '#');
  const fp = createHash('sha1').update(`${safeKind}|${safeCode ?? ''}|${safeAgent ?? ''}|${shape}|${frames[0] ?? ''}`).digest('hex').slice(0, 16);
  return {
    fp, kind: safeKind, code: safeCode, agent: safeAgent,
    agentVersion: typeof agentVersion === 'string' ? agentVersion.slice(0, 24) : null,
    where: typeof where === 'string' ? redact(where).slice(0, 80) : null,
    message: said, frames,
  };
}

export class Telemetry {
  #root;
  #version;
  #enabled;
  #now;
  #home;
  #user;
  #seen = new Set();     // fingerprints already kept today by this process
  #lastSent = 0;
  #soon = null;
  #send = null;
  #chain = Promise.resolve();

  constructor({ root, version = 'dev', enabled = () => true, now = () => new Date(), home, user } = {}) {
    this.#root = root;
    this.#version = version;
    this.#enabled = enabled;
    this.#now = now;
    this.#home = home;
    this.#user = user;
  }

  // Wired by the server: how to send, once a failure never seen before asks for it soon.
  onSoon(send) { this.#send = send; }

  // One write after another, in the order they were asked: «the last value wins» needs the order.
  #keep(line) {
    const at = dayOf(this.#now());
    this.#chain = this.#chain.then(async () => {
      if (!this.#root || !(await this.#enabled())) return;
      const dir = telemetryDir(this.#root);
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, `${at}.jsonl`), `${JSON.stringify(line)}\n`);
    }).catch(() => null);
    return this.#chain;
  }

  // Once what was asked to be kept is on disk (a send, and the tests, wait for it).
  async settled() { await this.#chain; }

  // A turn, a feature, a module: one more of it today.
  count(key, n = 1) {
    if (!KEY.test(String(key)) || !Number.isFinite(n) || n <= 0) return;
    void this.#keep({ t: 'c', k: key, n: Math.min(1e6, Math.round(n)) });
  }

  // How something stands today (how many projects, whether the local AI is on): the last value wins.
  gauge(key, value) {
    if (!KEY.test(String(key)) || !Number.isFinite(value)) return;
    void this.#keep({ t: 'g', k: key, v: Math.round(value) });
  }

  // A failure. Kept at once; a fingerprint this process has not seen today asks for a send soon.
  error(input) {
    const entry = errorEntry(input, { home: this.#home, user: this.#user });
    const at = this.#now().toISOString();
    void this.#keep({ t: 'e', at, ...entry });
    if (!this.#seen.has(entry.fp)) {
      this.#seen.add(entry.fp);
      if (this.#send && !this.#soon && Date.now() - this.#lastSent > SOON_MS / 4) {
        this.#soon = setTimeout(() => { this.#soon = null; void this.#send?.(); }, SOON_MS);
        this.#soon.unref?.();
      }
    }
    return entry;
  }

  // What would go next, read from what is kept: the days, counted, and the failures, one row each.
  // `only`: the files to read (a send reads the ones it set aside); otherwise all that are kept.
  async batch({ only = null } = {}) {
    const dir = telemetryDir(this.#root);
    const names = only ?? (await readdir(dir).catch(() => [])).filter((name) => FILE.test(name));
    const byDay = new Map();
    const errors = new Map();
    for (const name of names.sort()) {
      const day = name.slice(0, 10);
      const into = byDay.get(day) ?? { counts: {}, gauges: {} };
      byDay.set(day, into);
      const text = await readFile(join(dir, name), 'utf8').catch(() => '');
      for (const raw of text.split('\n')) {
        if (!raw.trim()) continue;
        let line;
        try { line = JSON.parse(raw); } catch { continue; }
        if (line.t === 'c' && KEY.test(line.k)) into.counts[line.k] = (into.counts[line.k] ?? 0) + (Number(line.n) || 0);
        else if (line.t === 'g' && KEY.test(line.k)) into.gauges[line.k] = Number(line.v) || 0;
        else if (line.t === 'e' && line.fp) {
          const kept = errors.get(line.fp);
          if (kept) { kept.count += 1; kept.last = line.at; }
          else errors.set(line.fp, { fp: line.fp, kind: line.kind, code: line.code ?? null, agent: line.agent ?? null, agentVersion: line.agentVersion ?? null, where: line.where ?? null, message: line.message ?? '', frames: Array.isArray(line.frames) ? line.frames.slice(0, MAX_FRAMES) : [], count: 1, first: line.at, last: line.at });
        }
      }
    }
    const trim = (all) => Object.fromEntries(Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, MAX_COUNTS));
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-MAX_DAYS)
      .map(([day, { counts, gauges }]) => ({ day, counts: trim(counts), gauges: trim(gauges) }))
      .filter((one) => Object.keys(one.counts).length || Object.keys(one.gauges).length);
    return { names, days, errors: [...errors.values()].sort((a, b) => b.count - a.count).slice(0, MAX_ERRORS) };
  }

  // The body, exactly as it leaves: built here, in one place, so a test and the person can read it.
  async preview({ only = null } = {}) {
    const { days, errors } = await this.batch({ only });
    return {
      v: TELEMETRY_VERSION,
      id: await installId(this.#root),
      version: this.#version,
      os: ['darwin', 'linux', 'win32'].includes(process.platform) ? process.platform : 'other',
      wsl: Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP),
      arch: ['arm64', 'x64'].includes(arch()) ? arch() : 'other',
      node: process.versions.node.split('.')[0],
      days,
      errors,
    };
  }

  // Sends what is kept and forgets it. Several processes of one copy may try at once: the first to
  // make the lock sends, the others leave it. What is sent is first set aside (renamed, at once), so
  // what is written while it travels starts a new file and is neither lost nor sent twice.
  async flush({ fetchImpl = globalThis.fetch, url = process.env.PULSE_TELEMETRY_URL ?? TELEMETRY_URL } = {}) {
    if (!this.#root || !(await this.#enabled())) return { sent: false, reason: 'off' };
    const dir = telemetryDir(this.#root);
    const lock = join(dir, '.sending');
    await this.settled();
    try { await mkdir(dir, { recursive: true }); await mkdir(lock); } catch { return { sent: false, reason: 'busy' }; }
    const aside = [];
    try {
      for (const name of (await readdir(dir)).filter((one) => FILE.test(one))) {
        const out = name.endsWith('.out') ? name : `${name}.${Date.now().toString(36)}.out`;
        if (out !== name) await rename(join(dir, name), join(dir, out));
        aside.push(out);
      }
      if (!aside.length) return { sent: false, reason: 'empty' };
      const body = await this.preview({ only: aside });
      if (!body.days.length && !body.errors.length) { for (const name of aside) await rm(join(dir, name), { force: true }); return { sent: false, reason: 'empty' }; }
      const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': `madre/${this.#version}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { sent: false, reason: `HTTP ${response.status}` };
      for (const name of aside) await rm(join(dir, name), { force: true });
      this.#lastSent = Date.now();
      return { sent: true, days: body.days.length, errors: body.errors.length };
    } catch (error) {
      return { sent: false, reason: error?.message ?? 'unreachable' };
    } finally {
      await rmdir(lock).catch(() => null);
    }
  }

  // Turned off: what was kept goes too, nothing waits to be sent.
  async forget() {
    await this.settled();
    await rm(telemetryDir(this.#root), { recursive: true, force: true }).catch(() => null);
  }
}
