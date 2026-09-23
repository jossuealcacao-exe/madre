// Release channel: is there a newer MADRE on npm? One read of the public registry, at most
// once a day, cached in ~/.pulse/updates.json. It sends the package name and nothing else,
// the same request `npx` makes; PULSE_UPDATE_CHECK=0 or the switch in MU/TH/UR turns it off.
// MADRE never updates itself: the room is in use and the process belongs to the human. It
// shows the exact command for how this copy was launched.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const REGISTRY = 'https://registry.npmjs.org';
export const UPDATE_TTL_MS = 24 * 60 * 60 * 1000;

const parse = (version) => String(version ?? '').trim().replace(/^v/, '').split(/[.+-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);

// -1 when a < b, 0 when equal, 1 when a > b. Pre-release tags are ignored: a room compares releases.
export function compareVersions(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
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

export function updateCommand(install, name, version = 'latest') {
  switch (install) {
    case 'npx': return `npx ${name}@${version} start`;
    case 'project': return `npm install ${name}@${version}`;
    case 'global': return `npm install -g ${name}@${version}`;
    default: return 'git pull';
  }
}

// One shell line that installs the version and starts the same room on the same port.
// The room's own process runs it detached after closing its listener, then exits.
const shq = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
export function applyCommand({ install, name, version, port, projectRoot }) {
  const start = `start --no-open --port ${Number(port) || 4317} --project ${shq(projectRoot)}`;
  switch (install) {
    case 'npx': return `exec npx -y ${name}@${version} ${start}`;
    case 'project': return `npm install ${name}@${version} --no-fund --no-audit && exec npx --no ${name.split('/').pop()} ${start}`;
    case 'global': return `npm install -g ${name}@${version} --no-fund --no-audit && exec ${name.split('/').pop()} ${start}`;
    default: return null;   // source: the human pulls
  }
}

export function releaseUrl(repository, version) {
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
  let latest = cached?.name === name ? cached.latest ?? null : null;
  let checkedAt = cached?.name === name ? cached.checkedAt ?? null : null;
  let source = latest ? 'cache' : 'none';
  let error = null;
  if (enabled && !cacheOnly && (force || !fresh)) {
    try {
      const response = await fetchImpl(`${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}/latest`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
      const doc = await response.json();
      if (typeof doc?.version !== 'string') throw new Error('registry answered without a version');
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
