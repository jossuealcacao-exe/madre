import { execFile } from 'node:child_process';
import { access, mkdtemp, readdir, rm, unlink } from 'node:fs/promises';
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
export async function worktreeTree(root, { exclude = [] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'madre-index-'));
  const index = join(dir, 'index');
  try {
    const env = { GIT_INDEX_FILE: index };
    await git(root, ['read-tree', '--empty'], { env });
    // Every file of the working tree that git would not ignore, listed against the empty
    // index. Nested repositories come back as `dir/` entries and are left out: they are
    // photographed on their own, and `git add` would refuse one without commits anyway.
    const listed = await git(root, ['ls-files', '-z', '--others', '--exclude-standard', '--', '.'], { env });
    const skip = new Set(exclude.map((path) => path.replace(/\/$/, '')));
    const files = listed.split('\0').filter((path) => path && !path.endsWith('/') && ![...skip].some((dir) => path === dir || path.startsWith(`${dir}/`)));
    if (files.length) {
      await new Promise((resolvePromise, reject) => {
        const child = execFile('git', ['-c', 'core.quotepath=off', 'update-index', '--add', '-z', '--stdin'], { cwd: root, env: { ...process.env, GIT_PAGER: 'cat', ...env }, maxBuffer: 64 * 1024 * 1024 }, (error) => (error ? reject(error) : resolvePromise()));
        child.stdin.end(files.join('\0') + '\0');
      });
    }
    return (await git(root, ['write-tree'], { env })).trim();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Repositories nested inside the project (a monorepo of sites, each with its own .git). The
// outer git sees them as a single entry and never notices what changes inside, so each one
// gets its own photograph. Ignored folders are skipped; depth is capped.
const NESTED_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.pulse', '.madre', 'vendor']);
export async function nestedRepos(root, { maxDepth = 3 } = {}) {
  const found = [];
  const walk = async (dir, rel, depth) => {
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || NESTED_SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (await isGitRepo(path)) { found.push(relPath); continue; }   // a repo's own nested repos are its business
      if (depth + 1 < maxDepth) await walk(path, relPath, depth + 1);
    }
  };
  await walk(root, '', 0);
  return found.sort();
}

async function checkpointOne(root, { id, label, exclude = [] }) {
  const tree = await worktreeTree(root, { exclude });
  const head = (await git(root, ['rev-parse', '--verify', '-q', 'HEAD']).catch(() => '')).trim() || null;
  const commit = (await git(root, ['commit-tree', tree, ...(head ? ['-p', head] : []), '-m', `${label} ${id}`], { env: { GIT_AUTHOR_NAME: 'MADRE', GIT_AUTHOR_EMAIL: 'madre@localhost', GIT_COMMITTER_NAME: 'MADRE', GIT_COMMITTER_EMAIL: 'madre@localhost' } })).trim();
  await git(root, ['update-ref', `${CHECKPOINT_REF}/${id}`, commit]);
  return { commit, tree, head };
}

export async function createCheckpoint(root, { id, label = 'MADRE checkpoint' } = {}) {
  const dirs = await nestedRepos(root);
  const outer = await checkpointOne(root, { id, label, exclude: dirs });
  const nested = [];
  for (const dir of dirs) {
    try { nested.push({ dir, ...(await checkpointOne(join(root, dir), { id, label })) }); } catch { /* a broken nested repo is left alone */ }
  }
  return { id, ...outer, nested, exclude: dirs, createdAt: new Date().toISOString() };
}

// What changed since the checkpoint: name-status per file and git's --stat.
async function diffOne(root, before, prefix = '', exclude = []) {
  const after = await worktreeTree(root, { exclude });
  if (after === before.tree) return { files: [], stat: '' };
  const nameStatus = await git(root, ['diff', '--name-status', '-M', before.tree, after]);
  const files = nameStatus.split('\n').filter(Boolean).map((line) => {
    const [status, ...rest] = line.split('\t');
    const path = prefix + rest.at(-1);
    return { status: status[0], path, from: status[0] === 'R' ? prefix + rest[0] : undefined };
  });
  const stat = (await git(root, ['diff', '--stat=100', before.tree, after])).trim();
  return { files, stat: prefix && stat ? stat.split('\n').map((line) => (line.startsWith(' ') ? ` ${prefix}${line.trimStart()}` : line)).join('\n') : stat };
}

// What changed since the checkpoint, in the project and in every nested repository, paths
// relative to the project. Forbidden zones are judged on the path inside each repository too.
export async function diffCheckpoint(root, checkpoint) {
  const outer = await diffOne(root, checkpoint, '', checkpoint.exclude ?? []);
  const parts = [outer];
  for (const part of checkpoint.nested ?? []) {
    try { parts.push(await diffOne(join(root, part.dir), part, `${part.dir}/`)); } catch { /* left alone */ }
  }
  const files = parts.flatMap((part) => part.files);
  const stat = parts.map((part) => part.stat).filter(Boolean).join('\n');
  const forbiddenIn = (path) => isForbidden(path) || (checkpoint.nested ?? []).some((part) => path.startsWith(`${part.dir}/`) && isForbidden(path.slice(part.dir.length + 1)));
  return { afterTree: outer.afterTree ?? null, files, stat, forbidden: files.filter((file) => forbiddenIn(file.path)).map((file) => file.path) };
}

// Which repository a project-relative path belongs to, and the path inside it.
function repoFor(root, checkpoint, path) {
  for (const part of checkpoint.nested ?? []) {
    if (path.startsWith(`${part.dir}/`)) return { dir: join(root, part.dir), commit: part.commit, inner: path.slice(part.dir.length + 1) };
  }
  return { dir: root, commit: checkpoint.commit, inner: path };
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
    const repo = repoFor(root, checkpoint, file.path);
    if (file.status === 'A') {
      await unlink(absolute).catch(() => {});
      removed.push(file.path);
    } else {
      if (file.status === 'R' && file.from) {
        await unlink(absolute).catch(() => {});
        const origin = repoFor(root, checkpoint, file.from);
        await git(origin.dir, ['restore', '--source', origin.commit, '--worktree', '--', origin.inner]);
        restored.push(file.from);
        removed.push(file.path);
        continue;
      }
      await git(repo.dir, ['restore', '--source', repo.commit, '--worktree', '--', repo.inner]);
      restored.push(file.path);
    }
  }
  return { removed, restored };
}

export async function dropCheckpoint(root, checkpoint) {
  await git(root, ['update-ref', '-d', `${CHECKPOINT_REF}/${checkpoint.id}`]).catch(() => {});
  for (const part of checkpoint.nested ?? []) await git(join(root, part.dir), ['update-ref', '-d', `${CHECKPOINT_REF}/${checkpoint.id}`]).catch(() => {});
}
