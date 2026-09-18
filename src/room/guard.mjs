// Prevention before restoration: while an agent holds CONTROL, the forbidden
// zones that can be made read-only are made read-only. .env files and MADRE's
// own folders lose their write bits for the turn and get them back after;
// .git stays writable because the CLIs need it, so it is still restored from
// the checkpoint afterwards. A CLI that respects the filesystem cannot touch
// them; one that chmods its way through is caught by the checkpoint anyway.

import { chmod, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

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
export async function guardForbidden(projectRoot) {
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
  const release = async () => {
    for (const item of locked) { try { await chmod(item.path, item.mode); } catch { /* removed during the turn */ } }
  };
  return { locked: locked.map((item) => item.rel + (item.kind === 'dir' ? '/' : '')), release };
}
