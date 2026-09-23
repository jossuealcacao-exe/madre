// Is there a newer version of what a module is? Two kinds of answer, because there are two kinds
// of module.
//
// A module that ships with MADRE has its own version, written in its file and starting at 1.0.0.
// It cannot update on its own: it arrives in a release, so its update is MADRE's update, and the
// card says which release it travels in.
//
// A module that is a wrapper around something else — @playwright/mcp, Ollama, the AHP+ CLI — has
// no version of its own worth showing. Its version is that thing's version, found on this
// computer, and its update is that thing's next release. A module declares this once, in the SDK:
//
//   tracks: { name: '@playwright/mcp', npm: '@playwright/mcp' }
//   tracks: { name: 'ollama', github: 'ollama/ollama' }
//
// Every check is cached a day in ~/.pulse/updates/, goes out only while the release channel is on,
// and sends nothing but the name of the thing being asked about. A screen never waits on it:
// MODULES reads the cache, and the button on a card is what forces a fresh look.

import { join, dirname } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { checkForUpdate, compareVersions, UPDATE_TTL_MS } from '../updates.mjs';

export const GITHUB_RELEASES = 'https://api.github.com/repos';

async function readCache(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

// The newest release of a repository, by its tag. Same shape and same cache as the registry read,
// because a card does not care where a version comes from.
export async function checkGithubRelease({ repo, current, cacheFile, fetchImpl = globalThis.fetch, now = Date.now(), ttlMs = UPDATE_TTL_MS, enabled = true, force = false, cacheOnly = false, timeoutMs = 4000 } = {}) {
  const cached = cacheFile ? await readCache(cacheFile) : null;
  const known = cached?.name === repo ? cached : null;
  const fresh = known && Number.isFinite(known.checkedAt) && now - known.checkedAt < ttlMs;
  let latest = known?.latest ?? null;
  let checkedAt = known?.checkedAt ?? null;
  let source = latest ? 'cache' : 'none';
  let error = null;
  if (enabled && !cacheOnly && (force || !fresh)) {
    try {
      const response = await fetchImpl(`${GITHUB_RELEASES}/${repo}/releases/latest`, { headers: { accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`github HTTP ${response.status}`);
      const doc = await response.json();
      const tag = String(doc?.tag_name ?? doc?.name ?? '').trim().replace(/^v/, '');
      if (!tag) throw new Error('github answered without a release');
      latest = tag;
      checkedAt = now;
      source = 'github';
      if (cacheFile) {
        await mkdir(dirname(cacheFile), { recursive: true }).catch(() => {});
        await writeFile(cacheFile, JSON.stringify({ name: repo, latest, checkedAt })).catch(() => {});
      }
    } catch (cause) {
      error = cause.message;
      if (!latest) source = 'error';
    }
  }
  if (!enabled) source = latest ? 'cache' : 'off';
  return { enabled, current: current ?? null, latest, available: Boolean(latest && current && compareVersions(current, latest) < 0), checkedAt, source, error };
}

// What one card should say about being up to date. `item` is a described module.
export async function moduleUpdate(item, { stateRoot, madre, fetchImpl = globalThis.fetch, enabled = true, force = false, cacheOnly = !force, now = Date.now() } = {}) {
  const tracks = item?.tracks ?? null;
  const common = { fetchImpl, enabled, force, cacheOnly, now };
  if (!tracks) {
    // It ships with MADRE, so what can be newer is MADRE.
    const check = await checkForUpdate({ name: madre.name, current: madre.version, cacheFile: join(stateRoot, 'updates.json'), ...common });
    return { via: 'madre', name: madre.name, current: item?.version ?? null, ships: madre.version, latest: check.latest, available: check.available, checkedAt: check.checkedAt, source: check.source, error: check.error };
  }
  const cacheFile = join(stateRoot, 'updates', `${item.id}.json`);
  if (tracks.npm) {
    const check = await checkForUpdate({ name: tracks.npm, current: item.version, cacheFile, ...common });
    return { via: 'npm', name: tracks.npm, current: item.version ?? null, latest: check.latest, available: check.available, checkedAt: check.checkedAt, source: check.source, error: check.error };
  }
  if (tracks.github) {
    const check = await checkGithubRelease({ repo: tracks.github, current: item.version, cacheFile, ...common });
    return { via: 'github', name: tracks.name ?? tracks.github, latest: check.latest, current: item.version ?? null, available: check.available, checkedAt: check.checkedAt, source: check.source, error: check.error };
  }
  return { via: 'none', name: tracks.name ?? item.name, current: item.version ?? null, latest: null, available: false, checkedAt: null, source: 'none', error: null };
}
