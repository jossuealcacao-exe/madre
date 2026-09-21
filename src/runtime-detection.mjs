import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const definitions = [
  {
    id: 'codex',
    label: 'Codex',
    candidates: ['codex', '/Applications/ChatGPT.app/Contents/Resources/codex'],
    versionArgs: ['--version'],
    adapter: 'codex-readonly',
  },
  {
    id: 'claude',
    label: 'Claude',
    candidates: ['claude', '/opt/homebrew/bin/claude'],
    versionArgs: ['--version'],
    adapter: 'claude-readonly',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    candidates: ['gemini', '/opt/homebrew/bin/gemini'],
    versionArgs: ['--version'],
    adapter: 'gemini-readonly',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    candidates: ['opencode', '/opt/homebrew/bin/opencode'],
    versionArgs: ['--version'],
    adapter: 'opencode-readonly',
  },
];

async function executable(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// On Windows a CLI on PATH is `name.cmd`, `name.exe` or `name.ps1`: npm installs a .cmd shim.
// PATHEXT is the system's own list of what counts as runnable, and the file has no execute bit.
const extensions = (env = process.env) => (process.platform === 'win32'
  ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((extension) => extension.toLowerCase())
  : ['']);

export async function findExecutable(candidates, envPath = process.env.PATH ?? '', env = process.env) {
  const suffixes = extensions(env);
  const runnable = async (path) => (process.platform === 'win32' ? access(path).then(() => true, () => false) : executable(path));
  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      for (const suffix of candidate.includes('.') ? [''] : suffixes) if (await runnable(`${candidate}${suffix}`)) return `${candidate}${suffix}`;
      continue;
    }
    for (const directory of envPath.split(delimiter).filter(Boolean)) {
      for (const suffix of suffixes) {
        const path = join(directory, `${candidate}${suffix}`);
        if (await runnable(path)) return path;
      }
    }
  }
  return null;
}

async function readVersion(path, args) {
  try {
    const { stdout, stderr } = await execFileAsync(path, args, { timeout: 3000 });
    return (stdout || stderr).trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

// Where MADRE puts a CLI when the system folders are not writable: its own prefix, no
// administrator, nothing outside ~/.pulse. Detection looks here as well as along PATH, so an
// agent installed this way is found without the human touching their PATH.
export const toolsPrefix = (env = process.env) => join(env.PULSE_HOME ?? join(homedir(), '.pulse'), 'tools');
export const toolsBin = (env = process.env) => (process.platform === 'win32' ? toolsPrefix(env) : join(toolsPrefix(env), 'bin'));

export async function detectAgents({ env = process.env } = {}) {
  const searchPath = [env.PATH ?? '', toolsBin(env)].filter(Boolean).join(delimiter);
  return Promise.all(definitions.map(async (definition) => {
    const path = await findExecutable(definition.candidates, searchPath);
    const detected = Boolean(path);
    return {
      id: definition.id,
      label: definition.label,
      detected,
      ready: detected && Boolean(definition.adapter),
      adapter: definition.adapter ?? null,
      path,
      version: path ? await readVersion(path, definition.versionArgs) : null,
    };
  }));
}
