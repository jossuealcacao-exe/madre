// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// UNINSTALLING MADRE (2026-10-29), from Home's Settings: what MADRE put on this computer goes, and
// nothing else. Asked first (`uninstallPlan`, said in full on the page before anything happens),
// done last (`removeMadre`), once Home and every open project have closed the way «Turn MADRE off»
// closes them, so nothing writes again into a folder that is being taken away.
//
// What goes:
//   · MADRE's own folder (~/.pulse, or PULSE_HOME): conversations, memory, settings, modules, the
//     catalog, the identifier of this copy, and the AIs MADRE installed in its own folder (tools/).
//   · Inside each project MADRE knows, its folder `.pulse/` — except `.pulse/out/`, where the AIs
//     put what they created at #2, unless the person asks for that to go too.
//   · Each of those projects' restore points (the shadow repository in the temporary folder).
//   · The copy of MADRE npx downloaded. A global or a project install is npm's to remove: the page
//     says the command.
// What stays: the projects and their files, `.madre/` inside a project (modules a person wrote),
// the AIs installed elsewhere and their sign-ins, Ollama and its models, npm's own cache.
import { readFileSync } from 'node:fs';
import { chmod, lstat, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { shadowFolderFor } from './checkpoint.mjs';
import { insideFolder, isSalasRoom, knownRooms } from './salas.mjs';

const KEEP_INSIDE = 'out';
// Something MADRE always writes in its folder: a folder with none of these is not taken for it.
const MADRE_MARKS = ['install-id', 'config.json', 'rooms', 'salas'];

const folderAt = async (path) => {
  const found = await lstat(path).catch(() => null);
  return Boolean(found?.isDirectory() && !found.isSymbolicLink());
};

// How many files are under a folder, links not followed. Counted to say it, never read.
async function countFiles(folder, limit = 100000) {
  let count = 0;
  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (count >= limit) return;
      if (entry.isDirectory()) await walk(join(dir, entry.name));
      else count += 1;
    }
  };
  await walk(folder);
  return count;
}

// The state folder is taken away whole, so it has to be MADRE's beyond doubt: absolute, never the
// home folder or one above it, never the root, and with something MADRE always writes in it.
export async function checkStateRoot(stateRoot, { home = homedir() } = {}) {
  if (typeof stateRoot !== 'string' || !isAbsolute(stateRoot)) return false;
  const root = resolve(stateRoot);
  if (root === dirname(root) || insideFolder(resolve(home), root)) return false;
  if (!(await folderAt(root))) return false;
  const names = await readdir(root).catch(() => []);
  return MADRE_MARKS.some((mark) => names.includes(mark));
}

// The folders npx made for this package: `…/_npx/<hash>/` whose own package.json asks for it and
// for nothing else. One per version ever run with npx, the running one among them.
export async function npxFolders({ script = process.argv[1] ?? '', name }) {
  const path = String(script);
  const at = path.replace(/\\/g, '/').indexOf('/_npx/');
  if (at < 0 || !name) return [];
  const base = path.slice(0, at + '/_npx'.length);
  const out = [];
  for (const hash of await readdir(base).catch(() => [])) {
    if (!/^[0-9a-f]{8,}$/i.test(hash)) continue;
    const folder = join(base, hash);
    const wanted = await readFile(join(folder, 'package.json'), 'utf8').then((text) => Object.keys(JSON.parse(text).dependencies ?? {}), () => []);
    if (wanted.length === 1 && wanted[0] === name && await folderAt(folder)) out.push(folder);
  }
  return out;
}

// What uninstalling would do, said before anything is done. Paths are this computer's own and only
// travel to a page of this computer.
export async function uninstallPlan({ stateRoot, install = 'npx', script = process.argv[1] ?? '', name = packageName(), home = homedir(), toolsBin = join(stateRoot, 'tools', 'bin') }) {
  if (!(await checkStateRoot(stateRoot, { home }))) return { ok: false, error: 'This is not a MADRE folder MADRE would take away.' };
  const root = resolve(stateRoot);
  const projects = [];
  for (const room of await knownRooms(root)) {
    if (!room.root || isSalasRoom(room.root, root) || insideFolder(resolve(room.root), root)) continue;
    const pulse = join(room.root, '.pulse');
    const there = await folderAt(pulse);
    const shadow = shadowFolderFor(room.root);
    projects.push({
      name: room.name,
      root: room.root,
      pulse: there ? pulse : null,
      made: there ? await countFiles(join(pulse, KEEP_INSIDE)) : 0,
      shadow: (await folderAt(shadow)) ? shadow : null,
      modules: await folderAt(join(room.root, '.madre')),
    });
  }
  const tools = (await readdir(toolsBin).catch(() => [])).filter((one) => !one.startsWith('.')).sort();
  const npx = install === 'npx' ? await npxFolders({ script, name }) : [];
  const program = install === 'npx' ? { install, command: null }
    : install === 'global' ? { install, command: `npm uninstall -g ${name}` }
      : install === 'project' ? { install, command: `npm uninstall ${name}` }
        : { install: 'source', command: null, folder: sourceFolder(script) };
  return {
    ok: true,
    stateRoot: root,
    projects,
    made: projects.reduce((sum, one) => sum + one.made, 0),
    tools,
    npx,
    program,
    modules: projects.filter((one) => one.modules).map((one) => one.name),
  };
}

function packageName() {
  try { return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).name; } catch { return '@jossuealcala/madre'; }
}
const sourceFolder = (script) => (script ? dirname(dirname(resolve(script))) : null);

// Takes a folder away whole. A turn's guard can leave folders read-only (src/room/guard.mjs), and
// a read-only folder keeps what is inside it: those are opened for this user first, then removed.
async function removeTree(path) {
  try {
    await rm(path, { recursive: true, force: true, maxRetries: 2 });
  } catch (error) {
    if (error?.code !== 'EACCES' && error?.code !== 'EPERM' && error?.code !== 'ENOTEMPTY') throw error;
    await openForRemoval(path);
    await rm(path, { recursive: true, force: true, maxRetries: 2 });
  }
}
async function openForRemoval(dir) {
  const found = await lstat(dir).catch(() => null);
  if (!found?.isDirectory() || found.isSymbolicLink()) return;
  await chmod(dir, 0o700).catch(() => null);
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) await openForRemoval(join(dir, entry.name));
  }
}

// Does what the plan says. `made`: the person asked for `.pulse/out/` to go too. Each step on its
// own: one that fails is said, and the others still happen.
export async function removeMadre(plan, { made = false } = {}) {
  const removed = [];
  const failed = [];
  const take = async (path) => {
    try { await removeTree(path); removed.push(path); } catch (error) { failed.push({ path, error: String(error?.message ?? error).slice(0, 200) }); }
  };
  if (!plan?.ok) return { removed, failed: [{ path: null, error: plan?.error ?? 'no plan' }] };
  for (const project of plan.projects) {
    if (project.pulse) {
      if (made || project.made === 0) await take(project.pulse);
      else for (const name of await readdir(project.pulse).catch(() => [])) if (name !== KEEP_INSIDE) await take(join(project.pulse, name));
    }
    if (project.shadow) await take(project.shadow);
  }
  // The shadows' own folder, once nothing of anyone else's is in it.
  const shadows = plan.projects.map((one) => one.shadow).filter(Boolean);
  if (shadows.length) await rmdir(dirname(shadows[0])).catch(() => null);
  await take(plan.stateRoot);
  for (const folder of plan.npx) await take(folder);
  return { removed, failed };
}

// The plan as the page shows it: names and counts, and paths with the home folder said as ~.
export function planView(plan, { home = homedir() } = {}) {
  if (!plan?.ok) return plan;
  const tilde = (path) => (path && insideFolder(resolve(path), resolve(home)) ? `~${resolve(path).slice(resolve(home).length) || ''}` : path);
  return {
    ok: true,
    stateRoot: tilde(plan.stateRoot),
    projects: plan.projects.map((one) => ({ name: one.name, root: tilde(one.root), pulse: Boolean(one.pulse), made: one.made, shadow: Boolean(one.shadow) })),
    made: plan.made,
    tools: plan.tools,
    npx: plan.npx.length > 0,
    program: { install: plan.program.install, command: plan.program.command, folder: tilde(plan.program.folder ?? null) },
    modules: plan.modules,
    name: basename(plan.stateRoot),
  };
}
