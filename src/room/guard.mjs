// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Prevention before restoration: while an agent holds CONTROL, the forbidden
// zones that can be made read-only are made read-only. .env files and MADRE's
// own folders lose their write bits for the turn and get them back after;
// .git stays writable because the CLIs need it, so it is still restored from
// the checkpoint afterwards. A CLI that respects the filesystem cannot touch
// them; one that chmods its way through is caught by the checkpoint anyway.

import { chmod, readdir, readFile, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { writeWhole } from '../json-file.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

// Files and folders to lock: every .env / .env.* up to four levels deep, .pulse/, .madre/ and .claude/settings.local.json.
export async function forbiddenTargets(projectRoot, { maxDepth = 4 } = {}) {
  const targets = [];
  const walk = async (dir, depth) => {
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      const rel = relative(projectRoot, path);
      if (entry.isDirectory()) {
        if (rel === '.pulse' || rel === '.madre') { targets.push({ path, kind: 'dir' }); continue; }
        if (SKIP.has(entry.name) || depth >= maxDepth) continue;
        await walk(path, depth + 1);
      } else if (/^\.env(\.|$)/.test(entry.name) || rel === '.claude/settings.local.json') {
        targets.push({ path, kind: 'file' });
      }
    }
  };
  await walk(projectRoot, 0);
  return targets;
}

// Locks the targets. Returns what was locked and a function that unlocks them, in any case.
// `record`: a file outside the project where what was locked, and how it was before, is written
// for the length of the turn (2026-10-12, LOG-13 of the 1.0 review). A room that dies in the
// middle of a turn — the Terminal closed, a kill -9, the Mac shut down — never ran the unlock, and
// the .env files and MADRE's folders stayed read-only for good. The next room to open reads it
// back (restoreGuard) and gives them their modes again.
export async function guardForbidden(projectRoot, { record = null } = {}) {
  const targets = await forbiddenTargets(projectRoot);
  const locked = [];
  for (const target of targets) {
    try {
      const info = await stat(target.path);
      const readOnly = info.mode & 0o555;
      if ((info.mode & 0o777) === readOnly) continue;   // already read-only: leave it as it is
      await chmod(target.path, readOnly);
      locked.push({ ...target, mode: info.mode & 0o777, rel: relative(projectRoot, target.path) });
    } catch { /* gone or not ours: the checkpoint still covers it */ }
  }
  if (record && locked.length) await writeWhole(record, JSON.stringify({ pid: process.pid, at: new Date().toISOString(), locked: locked.map(({ path, mode }) => ({ path, mode })) })).catch(() => {});
  const release = async () => {
    for (const item of locked) { try { await chmod(item.path, item.mode); } catch { /* removed during the turn */ } }
    if (record) await rm(record, { force: true }).catch(() => {});
  };
  return { locked: locked.map((item) => item.rel + (item.kind === 'dir' ? '/' : '')), release };
}

// What a room that died mid-turn left locked: each path given back the mode it had, unless someone
// changed it since (then it is theirs). Answers the paths given back.
export async function restoreGuard(record) {
  const kept = await readFile(record, 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  if (!kept) return [];
  const back = [];
  for (const { path, mode } of Array.isArray(kept.locked) ? kept.locked : []) {
    if (typeof path !== 'string' || !Number.isInteger(mode)) continue;
    const now = await stat(path).catch(() => null);
    if (!now || (now.mode & 0o777) !== (mode & 0o555)) continue;
    try { await chmod(path, mode); back.push(path); } catch { /* not ours to change */ }
  }
  await rm(record, { force: true }).catch(() => {});
  return back;
}
