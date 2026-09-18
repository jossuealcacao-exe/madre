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
