// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, rmdir, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
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
// Read without regard to case (2026-10-12, SRV-05): on a Mac the disk does not tell `.ENV` from
// `.env`, so `.ENV` was the same file under a name no rule caught.
export const FORBIDDEN = [
  /^\.git(\/|$)/i,
  /^\.pulse(\/|$)/i,
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)\.madre(\/|$)/i,
  /(^|\/)\.claude\/settings\.local\.json$/i,
];
export const isForbidden = (path) => FORBIDDEN.some((pattern) => pattern.test(path));

export async function isGitRepo(root) {
  return access(join(root, '.git')).then(() => true, () => false);
}

// A project that is not a git repository still gets photographs: MADRE keeps a shadow
// repository of its own outside the project (one per project path) and runs git with the
// project as work tree. Nothing appears inside the project; UNDO and diffs work the same.
const shadows = new Map();
async function shadowFor(root) {
  const canonical = resolve(root);
  if (!shadows.has(canonical)) {
    const dir = join(tmpdir(), 'madre-shadow', createHash('sha1').update(canonical).digest('hex').slice(0, 16));
    await mkdir(dir, { recursive: true });
    const isRepo = await access(join(dir, 'HEAD')).then(() => true, () => false);
    if (!isRepo) await execFileAsync('git', ['init', '-q', '--bare', dir]);
    shadows.set(canonical, dir);
  }
  return shadows.get(canonical);
}
// Which repository a photograph lives in: null for the project's own, or the shadow's path. A
// checkpoint keeps the answer it was taken with. Asked again after the turn, the answer changes the
// moment an agent runs `git init` in a project that had none: the diff then looked for the
// shadow's commits in the brand-new repository, git failed, and a turn that had done exactly what
// it was asked was reported as failed, with no list of changes and no UNDO.
async function repositoryFor(root) {
  return (await isGitRepo(root)) ? null : shadowFor(root);
}
async function gitArgs(root, via) {
  const dir = via === undefined ? await repositoryFor(root) : via;
  return dir ? ['--git-dir', dir, '--work-tree', root] : [];
}

// How MADRE runs git in a project (2026-10-12, CKP-01 of the 1.0 review): never running anything the
// repository's own settings name. `.git` stays writable while an agent works — the CLIs need it —
// and git status never shows what changes inside it, so a `core.fsmonitor` written into
// `.git/config` during a #3 turn ran, with MADRE's rights and outside the agent's sandbox, the
// next time MADRE photographed the project. Hooks, external diffs and text conversions are named
// the same way; none of them is needed to take or compare a photograph.
const SAFE = ['-c', 'core.quotepath=off', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-c', 'diff.external='];
async function git(root, args, { env = {}, via } = {}) {
  const { stdout } = await execFileAsync('git', [...SAFE, ...(await gitArgs(root, via)), ...args], { cwd: root, env: { ...process.env, GIT_PAGER: 'cat', ...env }, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

// What a repository runs on its own: its settings, its hooks and its attributes (which name the
// filters the settings define). Photographed before a turn that may write, put back after it before
// git runs again — a write into `.git` is a write into a forbidden zone like any other.
const CONTROLS = ['config', 'info/attributes'];
async function gitDirOf(root, via) {
  if (via) return via;
  const dotgit = join(root, '.git');
  const info = await stat(dotgit).catch(() => null);
  if (info?.isDirectory()) return dotgit;
  if (info?.isFile()) {
    const pointer = (await readFile(dotgit, 'utf8').catch(() => '')).match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
    return pointer ? resolve(root, pointer) : null;
  }
  return null;
}
async function photographControls(root, via, label) {
  const gitDir = await gitDirOf(root, via);
  if (!gitDir) return null;
  const files = {};
  for (const name of CONTROLS) files[name] = await readFile(join(gitDir, name)).catch(() => null);
  for (const name of await readdir(join(gitDir, 'hooks')).catch(() => [])) files[`hooks/${name}`] = await readFile(join(gitDir, 'hooks', name)).catch(() => null);
  return { gitDir, label, files };
}
// Puts back what changed and answers what it put back, as the project would name it.
async function restoreControls(shot) {
  if (!shot) return [];
  const back = [];
  const now = {};
  for (const name of CONTROLS) now[name] = await readFile(join(shot.gitDir, name)).catch(() => null);
  for (const name of await readdir(join(shot.gitDir, 'hooks')).catch(() => [])) now[`hooks/${name}`] = await readFile(join(shot.gitDir, 'hooks', name)).catch(() => null);
  for (const name of new Set([...Object.keys(shot.files), ...Object.keys(now)])) {
    const was = shot.files[name] ?? null;
    const is = now[name] ?? null;
    if (was === null && is === null) continue;
    if (was && is && was.equals(is)) continue;
    const path = join(shot.gitDir, name);
    if (was === null) await rm(path, { force: true, recursive: true }).catch(() => {});
    else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, was); }
    back.push(`${shot.label}${name}`);
  }
  return back;
}

// A tree object of the working tree as it is right now: tracked and untracked
// files, ignored ones left out. Built in a temporary index.
export async function worktreeTree(root, { exclude = [], via } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'madre-index-'));
  const index = join(dir, 'index');
  try {
    const env = { GIT_INDEX_FILE: index };
    const extra = await gitArgs(root, via);
    await git(root, ['read-tree', '--empty'], { env, via });
    // Every file of the working tree that git would not ignore, listed against the empty
    // index. Nested repositories come back as `dir/` entries and are left out: they are
    // photographed on their own, and `git add` would refuse one without commits anyway.
    const listed = await git(root, ['ls-files', '-z', '--others', '--exclude-standard', '--', '.'], { env, via });
    const skip = new Set(exclude.map((path) => path.replace(/\/$/, '')));
    // Lock folders (MADRE's own `*.lock/`) come and go between the listing and the indexing.
    const files = listed.split('\0').filter((path) => path && !path.endsWith('/') && !/(^|\/)[^/]+\.lock\//.test(path) && ![...skip].some((dir) => path === dir || path.startsWith(`${dir}/`)));
    if (files.length) {
      // --remove: a file that vanished since the listing is dropped instead of aborting the photograph.
      const index_ = (list) => new Promise((resolvePromise, reject) => {
        const child = execFile('git', [...SAFE, ...extra, 'update-index', '--add', '--remove', '-z', '--stdin'], { cwd: root, env: { ...process.env, GIT_PAGER: 'cat', ...env }, maxBuffer: 64 * 1024 * 1024 }, (error) => (error ? reject(error) : resolvePromise()));
        child.stdin.end(list.join('\0') + '\0');
      });
      try { await index_(files); } catch {
        // Something still raced us: photograph what exists right now.
        const alive = [];
        for (const path of files) if (await access(join(root, path)).then(() => true, () => false)) alive.push(path);
        if (alive.length) await index_(alive);
      }
    }
    return (await git(root, ['write-tree'], { env, via })).trim();
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
  const via = await repositoryFor(root);
  const tree = await worktreeTree(root, { exclude, via });
  const head = (await git(root, ['rev-parse', '--verify', '-q', 'HEAD'], { via }).catch(() => '')).trim() || null;
  const commit = (await git(root, ['commit-tree', tree, ...(head ? ['-p', head] : []), '-m', `${label} ${id}`], { via, env: { GIT_AUTHOR_NAME: 'MADRE', GIT_AUTHOR_EMAIL: 'madre@localhost', GIT_COMMITTER_NAME: 'MADRE', GIT_COMMITTER_EMAIL: 'madre@localhost' } })).trim();
  await git(root, ['update-ref', `${CHECKPOINT_REF}/${id}`, commit], { via });
  return { commit, tree, head, via };
}

export async function createCheckpoint(root, { id, label = 'MADRE checkpoint' } = {}) {
  const dirs = await nestedRepos(root);
  const outer = await checkpointOne(root, { id, label, exclude: dirs });
  const nested = [];
  for (const dir of dirs) {
    try { nested.push({ dir, ...(await checkpointOne(join(root, dir), { id, label })) }); } catch { /* a broken nested repo is left alone */ }
  }
  const controls = [await photographControls(root, outer.via, outer.via ? 'MADRE · ' : '.git/')];
  for (const part of nested) controls.push(await photographControls(join(root, part.dir), part.via, `${part.dir}/.git/`));
  return { id, ...outer, nested, exclude: dirs, controls: controls.filter(Boolean), createdAt: new Date().toISOString() };
}

// After a turn that could write, before git runs again: the repositories' own settings, hooks and
// attributes as they were. Once per checkpoint; answers what was put back.
export async function settleControls(checkpoint) {
  if (!checkpoint || checkpoint.controlsSettled) return [];
  checkpoint.controlsSettled = true;
  const back = [];
  for (const shot of checkpoint.controls ?? []) back.push(...await restoreControls(shot));
  return back;
}

// What changed since the checkpoint: name-status per file and git's --stat.
async function diffOne(root, before, prefix = '', exclude = []) {
  const via = before.via;
  const after = await worktreeTree(root, { exclude, via });
  if (after === before.tree) return { files: [], stat: '' };
  const nameStatus = await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-M', before.tree, after], { via });
  const listed = nameStatus.split('\n').filter(Boolean).map((line) => {
    const [status, ...rest] = line.split('\t');
    const path = prefix + rest.at(-1);
    return { status: status[0], path, inner: rest.at(-1), from: status[0] === 'R' ? prefix + rest[0] : undefined };
  });
  // A file the turn taught git to ignore (a new .gitignore line) drops out of the second
  // photograph while it is still on disk, untouched. That is not a deletion, and restoring it
  // would report a write into a forbidden zone that never happened.
  const files = [];
  for (const file of listed) {
    if (file.status === 'D' && await access(join(root, file.inner)).then(() => true, () => false)) continue;
    files.push({ status: file.status, path: file.path, from: file.from });
  }
  if (!files.length) return { files: [], stat: '' };
  const only = files.length < listed.length ? ['--', ...files.flatMap((file) => [file.path.slice(prefix.length), ...(file.from ? [file.from.slice(prefix.length)] : [])])] : [];
  const stat = (await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--stat=100', before.tree, after, ...only], { via })).trim();
  // The tree the turn left is kept with what it changed (the code workspace reads it back): the
  // agent's own lines stay its own even after the human edits the file again.
  return { files, afterTree: after, stat: prefix && stat ? stat.split('\n').map((line) => (line.startsWith(' ') ? ` ${prefix}${line.trimStart()}` : line)).join('\n') : stat };
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

// What a file said at a photograph, or in the tree a turn left behind, read from git and never from
// the disk. `null` when git no longer has it (a shadow repository gone with a restart, a tree git
// pruned), when the file was not there, or when the path is not a path inside the project.
const CHECKPOINT_ID = /^[0-9A-Za-z][\w-]{0,79}$/;
const TREE_ID = /^[0-9a-f]{40,64}$/;
export async function readAt(root, { checkpointId = null, tree = null, path = '' } = {}) {
  const inner = String(path ?? '');
  if (!inner || inner.startsWith('/') || inner.startsWith('-') || inner.split('/').includes('..')) return null;
  const rev = checkpointId ? (CHECKPOINT_ID.test(String(checkpointId)) ? `${CHECKPOINT_REF}/${checkpointId}` : null) : (TREE_ID.test(String(tree ?? '')) ? tree : null);
  if (!rev) return null;
  try { return await git(root, ['show', `${rev}:${inner}`]); } catch { return null; }
}

// Which repository a project-relative path belongs to, and the path inside it.
function repoFor(root, checkpoint, path) {
  for (const part of checkpoint.nested ?? []) {
    if (path.startsWith(`${part.dir}/`)) return { dir: join(root, part.dir), commit: part.commit, via: part.via, inner: path.slice(part.dir.length + 1) };
  }
  return { dir: root, commit: checkpoint.commit, via: checkpoint.via, inner: path };
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
        await git(origin.dir, ['restore', '--source', origin.commit, '--worktree', '--', origin.inner], { via: origin.via });
        restored.push(file.from);
        removed.push(file.path);
        continue;
      }
      await git(repo.dir, ['restore', '--source', repo.commit, '--worktree', '--', repo.inner], { via: repo.via });
      restored.push(file.path);
    }
  }
  await dropFoldersBornAfter(root, removed, Date.parse(checkpoint.createdAt));
  return { removed, restored };
}

// A folder the turn made for the files it added goes with them. Git keeps no folders, so after
// UNDO an empty docs/ was the one trace left of a turn taken back. Only a folder born after the
// checkpoint, deepest first, and only while it is empty: rmdir refuses anything else. Where the
// system does not say when a folder was born, it stays.
async function dropFoldersBornAfter(root, paths, since) {
  if (!Number.isFinite(since) || !paths.length) return;
  const canonicalRoot = resolve(root);
  const folders = new Set();
  for (const path of paths) {
    for (let dir = dirname(resolve(root, path)); dir.startsWith(canonicalRoot + sep); dir = dirname(dir)) folders.add(dir);
  }
  for (const dir of [...folders].sort((a, b) => b.length - a.length)) {
    const born = (await stat(dir).catch(() => null))?.birthtimeMs;
    if (born > 0 && born >= since) await rmdir(dir).catch(() => {});
  }
}

export async function dropCheckpoint(root, checkpoint) {
  await git(root, ['update-ref', '-d', `${CHECKPOINT_REF}/${checkpoint.id}`], { via: checkpoint.via }).catch(() => {});
  for (const part of checkpoint.nested ?? []) await git(join(root, part.dir), ['update-ref', '-d', `${CHECKPOINT_REF}/${checkpoint.id}`], { via: part.via }).catch(() => {});
}
