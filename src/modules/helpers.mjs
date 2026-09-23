import { execFile } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

// Where does git think this project lives? AHP+ pins itself to the git root,
// so a project inside a bigger repository (or a home directory that was
// accidentally `git init`ed) would receive .ahp/ somewhere else entirely.
export async function gitToplevel(projectRoot) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { timeout: 5000 });
    return await realpath(stdout.trim()).catch(() => stdout.trim());
  } catch {
    return null;
  }
}

export async function findOnPath(name, envPath = process.env.PATH ?? '') {
  for (const directory of envPath.split(delimiter).filter(Boolean)) {
    const candidate = join(directory, name);
    if (await access(candidate).then(() => true, () => false)) return candidate;
  }
  return null;
}

// The version of an npm package that is actually on this machine, found by reading its
// package.json: up the node_modules chain from the project first, then npm's global root.
// Nothing is executed. Asking a package for its own --version through npx is not a test of
// anything: when the package is not installed at all, npx answers with npm's version and exits
// cleanly, which is how PLAYWRIGHT came to report a browser server that was never there.
let globalRoot;
async function npmGlobalRoot(env = process.env) {
  if (globalRoot !== undefined) return globalRoot;
  try { const { stdout } = await execFileAsync('npm', ['root', '-g'], { env, timeout: 10000 }); globalRoot = stdout.trim() || null; }
  catch { globalRoot = null; }
  return globalRoot;
}

export async function packageVersion(name, { projectRoot = process.cwd(), env = process.env } = {}) {
  const parts = name.split('/');
  let directory = projectRoot;
  for (let depth = 0; depth < 24; depth += 1) {
    const found = await readJson(join(directory, 'node_modules', ...parts, 'package.json'));
    if (found?.version) return found.version;
    const parent = join(directory, '..');
    if (parent === directory) break;
    directory = parent;
  }
  const root = await npmGlobalRoot(env);
  if (root) {
    const found = await readJson(join(root, ...parts, 'package.json'));
    if (found?.version) return found.version;
  }
  return null;
}

// What git this computer runs, for the card that depends on it. Cached: it does not change
// while a room is open.
let gitStamp;
export async function gitVersion(env = process.env) {
  if (gitStamp !== undefined) return gitStamp;
  try {
    const { stdout } = await execFileAsync('git', ['--version'], { env, timeout: 5000 });
    gitStamp = stdout.trim().match(/\d+\.\d+(\.\d+)?/)?.[0] ?? null;
  } catch { gitStamp = null; }
  return gitStamp;
}
