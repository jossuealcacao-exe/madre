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

const OFFICIAL_DESTINATIONS = {
  codex: { label: 'OpenAI', hosts: ['api.openai.com'], variable: 'OPENAI_BASE_URL' },
  claude: { label: 'Anthropic', hosts: ['api.anthropic.com'], variable: 'ANTHROPIC_BASE_URL' },
};

const enabled = (value) => /^(1|true|yes)$/i.test(String(value ?? '').trim());

function customRoutesAllowed(agentId, env) {
  const raw = String(env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS ?? '').trim().toLowerCase();
  if (/^(1|true|all)$/.test(raw)) return true;
  return raw.split(',').map((item) => item.trim()).includes(agentId);
}

function routeHost(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

// A CLI owns its network connection, but MADRE owns the document handed to that CLI. Name the
// actual destination without ever returning a credential, path or query string. Unknown base URLs
// are held at the door until the human explicitly trusts that agent's endpoint.
export function agentRouteFromEnvironment(agentId, env = process.env) {
  if (agentId === 'claude' && enabled(env.CLAUDE_CODE_USE_BEDROCK)) {
    return { kind: 'provider', destination: 'Amazon Bedrock', source: 'CLAUDE_CODE_USE_BEDROCK', host: null, custom: false, allowed: true };
  }
  if (agentId === 'claude' && enabled(env.CLAUDE_CODE_USE_VERTEX)) {
    return { kind: 'provider', destination: 'Google Vertex AI', source: 'CLAUDE_CODE_USE_VERTEX', host: null, custom: false, allowed: true };
  }
  if (agentId === 'claude' && enabled(env.CLAUDE_CODE_USE_FOUNDRY)) {
    return { kind: 'provider', destination: 'Microsoft Foundry', source: 'CLAUDE_CODE_USE_FOUNDRY', host: null, custom: false, allowed: true };
  }

  const official = OFFICIAL_DESTINATIONS[agentId];
  if (!official) return null;
  const raw = String(env[official.variable] ?? '').trim();
  if (!raw) return { kind: 'official', destination: official.label, source: null, host: null, custom: false, allowed: true };
  const host = routeHost(raw);
  const isOfficial = Boolean(host && official.hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`)));
  if (isOfficial) return { kind: 'official', destination: official.label, source: official.variable, host, custom: false, allowed: true };
  const allowed = customRoutesAllowed(agentId, env);
  return {
    kind: 'custom',
    destination: host ? `custom endpoint · ${host}` : 'custom endpoint',
    source: official.variable,
    host,
    custom: true,
    allowed,
  };
}

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
      route: agentRouteFromEnvironment(definition.id, env),
    };
  }));
}
