// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { constants } from 'node:fs';
import { access, readFile, realpath, stat, writeFile, rename } from 'node:fs/promises';
import { homedir, tmpdir, userInfo } from 'node:os';
import { delimiter, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const accountHome = () => { try { return userInfo().homedir || homedir(); } catch { return homedir(); } };

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
  {
    // Cursor's agent CLI (2026-10-17). Its installer puts it in ~/.local/bin, which is not always
    // on the PATH a room is started with.
    id: 'cursor',
    label: 'Cursor',
    // Also the account's own home, as the system knows it (2026-10-20): a MADRE started with
    // another HOME (a test home, a launcher) still finds the CLI the person installed.
    candidates: [...new Set(['cursor-agent', join(homedir(), '.local', 'bin', 'cursor-agent'), join(accountHome(), '.local', 'bin', 'cursor-agent')])],
    versionArgs: ['--version'],
    adapter: 'cursor-readonly',
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

// Inside WSL the PATH also carries Windows' own folders (/mnt/c/…/AppData/Roaming/npm): every file
// there looks runnable, so a CLI installed on Windows counted as installed here, «install» said it
// already was, and every turn failed for want of the Linux one. Those folders are Windows', not WSL's.
const windowsSide = (directory, env) => process.platform === 'linux' && Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP) && /^\/mnt\/[a-z]\//i.test(directory);

export async function findExecutable(candidates, envPath = process.env.PATH ?? '', env = process.env) {
  const suffixes = extensions(env);
  const runnable = async (path) => (process.platform === 'win32' ? access(path).then(() => true, () => false) : executable(path));
  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      for (const suffix of candidate.includes('.') ? [''] : suffixes) if (await runnable(`${candidate}${suffix}`)) return `${candidate}${suffix}`;
      continue;
    }
    for (const directory of envPath.split(delimiter).filter(Boolean)) {
      if (windowsSide(directory, env)) continue;
      for (const suffix of suffixes) {
        const path = join(directory, `${candidate}${suffix}`);
        if (await runnable(path)) return path;
      }
    }
  }
  return null;
}

// What each CLI answered to --version, kept per binary (its real path, size and date) for every
// MADRE of this user (QA 1.1.0, ACT-15): each project used to run `gemini --version` as it came up,
// and several coming up together left Gemini's half-written projects.json.<uuid>.tmp behind in
// ~/.gemini. A binary that changes is asked again.
const versionsFile = () => join(tmpdir(), `madre-versions-${process.getuid?.() ?? 'user'}.json`);
async function rememberedVersions() { try { return JSON.parse(await readFile(versionsFile(), 'utf8')) ?? {}; } catch { return {}; } }
async function readVersion(path, args) {
  let key = null;
  try {
    const real = await realpath(path);
    const found = await stat(real);
    key = `${real}:${found.size}:${Math.round(found.mtimeMs)}:${args.join(' ')}`;
    const kept = (await rememberedVersions())[key];
    if (typeof kept === 'string' && kept) return kept;
  } catch { /* asked below */ }
  try {
    const { stdout, stderr } = await execFileAsync(path, args, { timeout: 3000 });
    const version = (stdout || stderr).trim().split('\n')[0] || null;
    if (version && key) {
      const all = { ...(await rememberedVersions()), [key]: version };
      const temp = `${versionsFile()}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-40)))).then(() => rename(temp, versionsFile())).catch(() => {});
    }
    return version;
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
