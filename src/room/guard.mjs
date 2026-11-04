// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Prevention before restoration: while an agent holds CONTROL, the forbidden
// zones that can be made read-only are made read-only. .env files and MADRE's
// own folders lose their write bits for the turn and get them back after;
// .git stays writable because the CLIs need it, so it is still restored from
// the checkpoint afterwards. A CLI that respects the filesystem cannot touch
// them; one that chmods its way through is caught by the checkpoint anyway.

import { chmod, lstat, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { isForbidden } from '../checkpoint.mjs';
import { writeWhole } from '../json-file.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

// Files and folders to lock: every .env / .env.* up to four levels deep (not its templates:
// .env.example and the like, src/checkpoint.mjs isForbidden), .pulse/, .madre/ and .claude/settings.local.json.
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
      } else if (isForbidden(rel) || rel === '.claude/settings.local.json') {
        targets.push({ path, kind: 'file' });
      }
    }
  };
  await walk(projectRoot, 0);
  return targets;
}

// A .env that git ignores (the usual) is not in the checkpoint, so a CLI that gave itself the write
// bit back could change it and nothing saw it (external review #9, 2026-11-03; SECURITY.md promised
// otherwise). Each forbidden file is kept as it was, in memory only and never on disk — they hold
// secrets — and `restoreChanged` puts back the one a turn changed or deleted.
const KEEP_AT_MOST = 1024 * 1024;

// Locks the targets. Returns what was locked and a function that unlocks them, in any case.
// `record`: a file outside the project where what was locked, and how it was before, is written
// for the length of the turn (2026-10-12, LOG-13 of the 1.0 review). A room that dies in the
// middle of a turn — the Terminal closed, a kill -9, the Mac shut down — never ran the unlock, and
// the .env files and MADRE's folders stayed read-only for good. The next room to open reads it
// back (restoreGuard) and gives them their modes again.
export async function guardForbidden(projectRoot, { record = null } = {}) {
  const targets = await forbiddenTargets(projectRoot);
  const locked = [];
  const kept = [];
  for (const target of targets) {
    if (target.kind === 'file') {
      try {
        const info = await lstat(target.path);
        if (info.isFile() && info.size <= KEEP_AT_MOST) kept.push({ path: target.path, rel: relative(projectRoot, target.path), bytes: await readFile(target.path), mode: info.mode & 0o777 });
      } catch { /* unreadable: the checkpoint still covers it if git sees it */ }
    }
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
  // What the turn changed or deleted among them, put back as it was (still read-only until release
  // gives the mode back). A link put in a file's place is removed first, never written through.
  const restoreChanged = async () => {
    const back = [];
    for (const item of kept) {
      const now = await lstat(item.path).catch(() => null);
      if (now?.isFile() && (await readFile(item.path).catch(() => null))?.equals(item.bytes)) continue;
      try {
        if (now && !now.isFile()) await rm(item.path, { recursive: true, force: true });
        else if (now) await chmod(item.path, item.mode | 0o600);
        await writeFile(item.path, item.bytes, { mode: item.mode | 0o600 });
        await chmod(item.path, locked.some((one) => one.path === item.path) ? item.mode & 0o555 : item.mode);
        back.push(item.rel);
      } catch { /* not ours to write: said by the checkpoint's own diff if git sees it */ }
    }
    return back;
  };
  return { locked: locked.map((item) => item.rel + (item.kind === 'dir' ? '/' : '')), release, restoreChanged };
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
