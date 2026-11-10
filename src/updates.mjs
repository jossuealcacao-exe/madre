// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Release channel: is there a newer MADRE on npm? One read of the public registry, at most
// once a day, cached in ~/.pulse/updates.json. It sends the package name and nothing else,
// the same request `npx` makes; PULSE_UPDATE_CHECK=0 or the switch in MU/TH/UR turns it off.
// MADRE never updates itself: the room is in use and the process belongs to the human. It
// shows the exact command for how this copy was launched.

import { constants, realpathSync } from 'node:fs';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const REGISTRY = 'https://registry.npmjs.org';
export const UPDATE_TTL_MS = 24 * 60 * 60 * 1000;

// A version read as semver reads it: three numbers, then the pre-release, if any; build metadata
// (after +) never counts.
const parse = (version) => {
  const text = String(version ?? '').trim().replace(/^v/, '').split('+')[0];
  const dash = text.indexOf('-');
  const core = (dash >= 0 ? text.slice(0, dash) : text).split('.').slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  while (core.length < 3) core.push(0);
  return { core, pre: dash >= 0 ? text.slice(dash + 1).split('.').filter(Boolean) : [] };
};

// -1 when a < b, 0 when equal, 1 when a > b, with semver's precedence for pre-releases (2026-10-12,
// LOG-16): `1.1.0-alpha.1` comes before `1.1.0`, and `alpha.2` after `alpha.1`. They were read as
// equal, so whoever ran an alpha was never told the release was out — and the Windows port (1.1)
// ships its alphas and betas this way.
export function compareVersions(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i += 1) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === undefined || q === undefined) return p === undefined ? -1 : 1;
    if (p === q) continue;
    const [pn, qn] = [/^\d+$/.test(p), /^\d+$/.test(q)];
    if (pn && qn) return Number(p) < Number(q) ? -1 : 1;
    if (pn !== qn) return pn ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

// How this copy runs, from the path of the script Node started: npx cache, the project's own
// node_modules, a global install, or the source tree. Or inside MADRE.app (Tauri), which
// says so and updates itself from madre.run: never by npm or git from here.
export function detectInstall({ script = process.argv[1] ?? '', projectRoot = process.cwd(), env = process.env } = {}) {
  if (env.MADRE_APP === '1') return 'app';
  // Followed to where it leads (Q-22): npm -g leaves `madre` as a link in a bin folder, and Node
  // keeps that path; read as written, a global copy looked like one run from source.
  let real = String(script);
  try { real = realpathSync(real); } catch { /* read as written */ }
  const path = real.replace(/\\/g, '/');
  if (/\/_npx\//.test(path)) return 'npx';
  if (projectRoot && path.startsWith(`${String(projectRoot).replace(/\\/g, '/').replace(/\/$/, '')}/node_modules/`)) return 'project';
  if (/\/node_modules\//.test(path)) return 'global';
  return 'source';
}

// A version as semver writes it, and nothing else (2026-10-12, SRV-07 of the 1.0 review). What the
// registry or the cache in ~/.pulse says is read as data: a «version» with a `;` in it went, whole,
// into the shell line that restarts the room.
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;
export const isVersion = (value) => typeof value === 'string' && VERSION.test(value);

export function updateCommand(install, name, version = 'latest') {
  switch (install) {
    case 'npx': return `npx ${name}@${version} start`;
    case 'project': return `npm install ${name}@${version}`;
    case 'global': return `npm install -g ${name}@${version}`;
    case 'app': return null;
    default: return 'git pull';
  }
}

// The version, downloaded into npm's own cache while the room is still open. A release is listed
// by the registry a little before its tarball can be fetched, and a room that closed first and
// then found nothing to start was simply gone: the restart below runs detached and nobody is left
// to say why. Fetched first, the restart starts from the cache; refused, the room stays.
export function fetchCommand({ name, version }) {
  if (!PACKAGE_NAME.test(String(name)) || !isVersion(version)) return null;
  return { command: 'npm', args: ['cache', 'add', `${name}@${version}`, '--no-fund', '--no-audit'] };
}

// One shell line that installs the version and starts the same room on the same port.
// The room's own process runs it detached after closing its listener, then exits.
const shq = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
export function applyCommand({ install, name, version, port, projectRoot }) {
  if (!PACKAGE_NAME.test(String(name)) || !isVersion(version)) return null;
  const start = `start --no-open --port ${Number(port) || 4317} --project ${shq(projectRoot)}`;
  const spec = shq(`${name}@${version}`);
  const bin = shq(name.split('/').pop());
  switch (install) {
    case 'npx': return `exec npx -y ${spec} ${start}`;
    case 'project': return `npm install ${spec} --no-fund --no-audit && exec npx --no ${bin} ${start}`;
    case 'global': return `npm install -g ${spec} --no-fund --no-audit && exec ${bin} ${start}`;
    default: return null;   // source: the human pulls
  }
}

// Whether npm -g can put the new version where this one is (Q-22, 2026-11-10): a copy installed with
// sudo lives in a folder of root's, and `npm install -g` without sudo failed there after MADRE had
// already closed. Asked before closing anything.
export async function canReplace(packageRoot) {
  try { await access(dirname(packageRoot), constants.W_OK); return true; } catch { return false; }
}

// TAKING ITS OWN PLACE (Q-23, 2026-11-10). Restarting or updating used to start a new MADRE and end
// this process. Whoever waits on this process saw MADRE end: the terminal gave its prompt back, and
// in WSL the Windows shortcut's wsl.exe ended with it, after which WSL put the distribution away
// (~15 s), with the new MADRE — and a half-done npm install — inside. On Linux the new one now takes
// this process's place (process.execve, Node 22.15 and later), with the same PID; elsewhere, or on
// an older Node, as before.
export const takesItsPlace = ({ platform, execve } = { platform: process.platform, execve: process.execve }) => platform === 'linux' && typeof execve === 'function';

// What takes its place: `file args…`, as is when a terminal shows what MADRE says (the new address
// with its ficha too), else through /bin/sh with everything it says going to `log`, the witness a
// restart or an update always had (restart.log, update.log). Returns [program, argv] for execve.
export function nextProcess({ file, args = [], log = null, terminal = false }) {
  if (terminal || !log) return [file, [file, ...args]];
  return ['/bin/sh', ['/bin/sh', '-c', 'exec >>"$1" 2>&1; shift; exec "$@"', 'madre', log, file, ...args]];
}

// Q-21 (2026-11-10): MADRE before 1.1.3 had no ficha, so a tab open on it has no cookie, and the start
// an update makes (PULSE_UPDATE_RESTART, without the browser) left that tab on «This tab needs to be
// opened from MADRE» with nobody to give it the address. The start that comes from an update and
// finds no ficha on file opens the browser at the address that carries it.
export const opensBrowser = ({ asked = false, env = process.env, hadFicha = true } = {}) => Boolean(asked) || (env.PULSE_UPDATE_RESTART === '1' && !hadFicha);

// L-13 (Carlos's server, 2026-11-10): an update restarted only the room it was pressed in, and Home
// and the other projects stayed on the older MADRE. The rooms an update still has to bring to this
// version: every other open one that says an older version, or none (a mark written before rooms
// said theirs).
export const roomsBehind = (rooms, { here, version }) => rooms.filter((one) => one.open && one.id !== here && (!isVersion(one.open.version) || compareVersions(one.open.version, version) < 0));

// Where a person reads what a version brought. The product's own house, in the language the room
// is speaking — a release page on a code host is written for people who already work there, and
// whoever pressed this button only wanted to know what changed. The repository stays the fallback
// for a build with no house to point at.
export const CHANGES_PAGE = { es: 'https://madre.run/cambios/', en: 'https://madre.run/en/changelog/' };

export function releaseUrl(repository, version, language = 'es') {
  const page = CHANGES_PAGE[language] ?? CHANGES_PAGE.es;
  if (page) return version ? `${page}#v${version}` : page;
  const url = String(repository?.url ?? repository ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
  return url ? `${url}/releases/tag/v${version}` : null;
}

async function readCache(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

// The check. `enabled: false` answers from the cache only and never touches the network.
// `cacheOnly` answers from what is already on disk and never touches the network: it is what a
// screen asks for, so opening MODULES never waits on a registry.
export async function checkForUpdate({ name, current, cacheFile, fetchImpl = globalThis.fetch, now = Date.now(), ttlMs = UPDATE_TTL_MS, enabled = true, force = false, cacheOnly = false, timeoutMs = 4000 } = {}) {
  const cached = cacheFile ? await readCache(cacheFile) : null;
  const fresh = cached && cached.name === name && Number.isFinite(cached.checkedAt) && now - cached.checkedAt < ttlMs;
  let latest = cached?.name === name && isVersion(cached.latest) ? cached.latest : null;
  let checkedAt = cached?.name === name ? cached.checkedAt ?? null : null;
  let source = latest ? 'cache' : 'none';
  let error = null;
  if (enabled && !cacheOnly && (force || !fresh)) {
    try {
      const response = await fetchImpl(`${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}/latest`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
      const doc = await response.json();
      if (!isVersion(doc?.version)) throw new Error('registry answered without a version');
      latest = doc.version;
      checkedAt = now;
      source = 'registry';
      if (cacheFile) {
        await mkdir(dirname(cacheFile), { recursive: true }).catch(() => {});
        await writeFile(cacheFile, JSON.stringify({ name, latest, checkedAt })).catch(() => {});
      }
    } catch (cause) {
      error = cause.message;
      if (!latest) source = 'error';
    }
  }
  if (!enabled) source = latest ? 'cache' : 'off';
  const available = Boolean(latest && current && compareVersions(current, latest) < 0);
  return { enabled, current: current ?? null, latest, available, checkedAt, source, error };
}
