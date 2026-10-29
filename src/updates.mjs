// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Release channel: is there a newer MADRE on npm? One read of the public registry, at most
// once a day, cached in ~/.pulse/updates.json. It sends the package name and nothing else,
// the same request `npx` makes; PULSE_UPDATE_CHECK=0 or the switch in MU/TH/UR turns it off.
// MADRE never updates itself: the room is in use and the process belongs to the human. It
// shows the exact command for how this copy was launched.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
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
// node_modules, a global install, or the source tree.
export function detectInstall({ script = process.argv[1] ?? '', projectRoot = process.cwd() } = {}) {
  const path = String(script).replace(/\\/g, '/');
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
