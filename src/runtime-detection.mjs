import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
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

export async function findExecutable(candidates, envPath = process.env.PATH ?? '') {
  for (const candidate of candidates) {
    if (candidate.includes('/') && await executable(candidate)) return candidate;
    if (!candidate.includes('/')) {
      for (const directory of envPath.split(delimiter).filter(Boolean)) {
        const path = join(directory, candidate);
        if (await executable(path)) return path;
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

export async function detectAgents() {
  return Promise.all(definitions.map(async (definition) => {
    const path = await findExecutable(definition.candidates);
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
