import { execFile } from 'node:child_process';
import { access, mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// CONTROL turns run between two photographs of the project. The photograph
// is a real git commit, kept under MADRE's own ref namespace so the user's
// branch, index and stash never notice; it is taken with a throwaway index
// so it includes untracked files (but never ignored ones). UNDO restores the
// working tree to that photograph and removes what appeared since.

export const CHECKPOINT_REF = 'refs/madre/checkpoints';

// Paths no agent touches even in CONTROL. Enforced after the turn: whatever
// changed here is restored from the checkpoint and reported.
export const FORBIDDEN = [
  /^\.git(\/|$)/,
  /^\.pulse(\/|$)/,
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.madre(\/|$)/,
  /(^|\/)\.claude\/settings\.local\.json$/,
];
export const isForbidden = (path) => FORBIDDEN.some((pattern) => pattern.test(path));

async function git(root, args, { env = {} } = {}) {
  const { stdout } = await execFileAsync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, env: { ...process.env, GIT_PAGER: 'cat', ...env }, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

export async function isGitRepo(root) {
  return access(join(root, '.git')).then(() => true, () => false);
}

// A tree object of the working tree as it is right now: tracked and untracked
// files, ignored ones left out. Built in a temporary index.
export async function worktreeTree(root) {
  const dir = await mkdtemp(join(tmpdir(), 'madre-index-'));
  const index = join(dir, 'index');
  try {
    const env = { GIT_INDEX_FILE: index };
    await git(root, ['read-tree', '--empty'], { env });
    await git(root, ['add', '-A', '--', '.'], { env });
    return (await git(root, ['write-tree'], { env })).trim();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function createCheckpoint(root, { id, label = 'MADRE checkpoint' } = {}) {
  const tree = await worktreeTree(root);
  const head = (await git(root, ['rev-parse', '--verify', '-q', 'HEAD']).catch(() => '')).trim() || null;
  const commit = (await git(root, ['commit-tree', tree, ...(head ? ['-p', head] : []), '-m', `${label} ${id}`], { env: { GIT_AUTHOR_NAME: 'MADRE', GIT_AUTHOR_EMAIL: 'madre@localhost', GIT_COMMITTER_NAME: 'MADRE', GIT_COMMITTER_EMAIL: 'madre@localhost' } })).trim();
  await git(root, ['update-ref', `${CHECKPOINT_REF}/${id}`, commit]);
  return { id, commit, tree, head, createdAt: new Date().toISOString() };
}

// What changed since the checkpoint: name-status per file and git's --stat.
export async function diffCheckpoint(root, checkpoint) {
  const after = await worktreeTree(root);
  if (after === checkpoint.tree) return { afterTree: after, files: [], stat: '', forbidden: [] };
  const nameStatus = await git(root, ['diff', '--name-status', '-M', checkpoint.tree, after]);
  const files = nameStatus.split('\n').filter(Boolean).map((line) => {
    const [status, ...rest] = line.split('\t');
    const path = rest.at(-1);
    return { status: status[0], path, from: status[0] === 'R' ? rest[0] : undefined };
  });
  const stat = (await git(root, ['diff', '--stat=100', checkpoint.tree, after])).trim();
  return { afterTree: after, files, stat, forbidden: files.filter((file) => isForbidden(file.path)).map((file) => file.path) };
}

// Put the working tree back to the checkpoint: files added since are removed,
// everything else is restored from the checkpoint commit. `paths` limits the
// restore to those files (used for forbidden zones right after a turn).
export async function restoreCheckpoint(root, checkpoint, { paths = null } = {}) {
  const { files } = await diffCheckpoint(root, checkpoint);
  const chosen = paths ? files.filter((file) => paths.includes(file.path)) : files;
  const removed = [];
  const restored = [];
  const canonicalRoot = resolve(root);
  for (const file of chosen) {
    const absolute = resolve(root, file.path);
    if (!absolute.startsWith(canonicalRoot + sep)) continue;
    if (file.status === 'A') {
      await unlink(absolute).catch(() => {});
      removed.push(file.path);
    } else {
      if (file.status === 'R' && file.from) {
        await unlink(absolute).catch(() => {});
        await git(root, ['restore', '--source', checkpoint.commit, '--worktree', '--', file.from]);
        restored.push(file.from);
        removed.push(file.path);
        continue;
      }
      await git(root, ['restore', '--source', checkpoint.commit, '--worktree', '--', file.path]);
      restored.push(file.path);
    }
  }
  return { removed, restored };
}

export async function dropCheckpoint(root, checkpoint) {
  await git(root, ['update-ref', '-d', `${CHECKPOINT_REF}/${checkpoint.id}`]).catch(() => {});
}
