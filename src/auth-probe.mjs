import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const stripAnsi = (text) => String(text ?? '').replace(/\[[0-9;]*[A-Za-z]/g, '');

// Pure parsers, one per CLI, so the probe can be tested without the binaries.

export function parseCodexLoginStatus({ stdout = '', stderr = '', code = 0 }) {
  const text = stripAnsi(`${stdout}\n${stderr}`);
  if (/not logged in/i.test(text)) return { state: 'signed-out', detail: 'not logged in' };
  if (code === 0 && /logged in/i.test(text)) {
    const method = text.match(/logged in (?:using|with) ([^\n.]+)/i)?.[1]?.trim();
    return { state: 'signed-in', detail: method ? `via ${method}` : 'logged in' };
  }
  return { state: 'unknown', detail: text.trim().split('\n')[0] || 'no status' };
}

export function parseClaudeAuthStatus({ stdout = '' }) {
  try {
    const status = JSON.parse(stripAnsi(stdout).trim());
    if (status.loggedIn === true) return { state: 'signed-in', detail: status.authMethod ? `via ${status.authMethod}` : 'logged in' };
    if (status.loggedIn === false) return { state: 'signed-out', detail: 'not logged in' };
  } catch {
    // fall through
  }
  return { state: 'unknown', detail: 'no status' };
}

export function parseOpenCodeAuthList({ stdout = '' }) {
  const providers = stripAnsi(stdout)
    .split('\n')
    .map((line) => line.match(/^\s*[●○◆◇*-]\s+(.+?)\s{2,}(\S+)\s*$/) ?? line.match(/^\s*[●○◆◇*]\s+(.+?)\s+(oauth|api|apikey|token)\s*$/i))
    .filter(Boolean)
    .map((match) => ({ name: match[1].trim(), type: match[2].trim() }));
  if (providers.length) {
    return { state: 'signed-in', detail: providers.map((provider) => `${provider.name} (${provider.type})`).join(', '), providers };
  }
  return { state: 'signed-out', detail: 'no providers configured', providers: [] };
}

export function geminiAuthState({ settings, hasOauth, hasApiKey }) {
  const type = settings?.security?.auth?.selectedType;
  if (type === 'gemini-api-key') return hasApiKey ? { state: 'signed-in', detail: 'via API key' } : { state: 'signed-out', detail: 'API key selected but not found' };
  if (type === 'oauth-personal' || type === 'oauth-enterprise') return hasOauth ? { state: 'signed-in', detail: 'via Google account' } : { state: 'signed-out', detail: 'Google login selected but no token' };
  if (type === 'vertex-ai') return { state: 'signed-in', detail: 'via Vertex AI' };
  if (hasApiKey || hasOauth) return { state: 'unknown', detail: 'credentials present, auth type not selected' };
  return { state: 'signed-out', detail: 'never signed in' };
}

async function run(path, args, timeout = 6000) {
  try {
    const { stdout, stderr } = await execFileAsync(path, args, { timeout, env: { ...process.env, NO_COLOR: '1' } });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? '', stderr: error.stderr ?? error.message, code: error.code ?? 1 };
  }
}

const exists = (path) => access(path).then(() => true, () => false);

async function geminiHasKeychainKey() {
  if (process.platform !== 'darwin') return false;
  const result = await run('/usr/bin/security', ['find-generic-password', '-s', 'gemini-cli-api-key'], 3000);
  return result.code === 0;
}

export async function probeGemini({ env = process.env } = {}) {
  const home = env.GEMINI_CLI_HOME ?? homedir();
  const dir = join(home, '.gemini');
  let settings = null;
  try {
    settings = JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8'));
  } catch {
    settings = null;
  }
  const hasOauth = await exists(join(dir, 'oauth_creds.json'));
  const hasApiKey = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY) || await geminiHasKeychainKey();
  return geminiAuthState({ settings, hasOauth, hasApiKey });
}

// What each CLI needs from the user. Commands are run in the user's terminal
// by the setup wizard; install hints are only printed.
export const AGENT_SETUP = {
  codex: {
    install: ['npm install -g @openai/codex', 'or install the ChatGPT desktop app, which bundles codex'],
    login: ['login'],
    loginNote: 'Opens your browser to sign in with ChatGPT.',
    browser: true,
    // What a newcomer needs to know before choosing this door: which account, and whether
    // there is a way in without paying. `paid: null` means it depends on the provider you pick.
    vendor: 'OpenAI',
    account: 'Signs in with a ChatGPT account. An OpenAI API key works too.',
    paid: true,
  },
  claude: {
    install: ['npm install -g @anthropic-ai/claude-code', 'or: brew install --cask claude-code'],
    login: ['auth', 'login'],
    loginNote: 'Opens your browser to sign in with your Claude account.',
    browser: true,
    vendor: 'Anthropic',
    account: 'Signs in with a Claude account. An Anthropic API key works too.',
    paid: true,
  },
  gemini: {
    install: ['npm install -g @google/gemini-cli'],
    login: [],
    loginNote: 'Gemini signs in from its own prompt: run `gemini`, type /auth, pick "Use Gemini API key" (get one at aistudio.google.com/app/apikey) or Google login.',
    interactive: true,
    vendor: 'Google',
    account: 'Signs in with a Google account and has a free tier. A Gemini API key from AI Studio works too.',
    paid: false,
  },
  opencode: {
    install: ['brew install opencode', 'or: npm install -g opencode-ai'],
    login: ['auth', 'login'],
    loginNote: 'Pick a provider and paste its key or complete its OAuth flow.',
    vendor: 'OpenCode',
    account: 'Brings no model of its own: you point it at a provider you already use, in the cloud or on this computer.',
    paid: null,
  },
};

// Installing a CLI from the room itself. npm is the common denominator: every one of these
// ships an npm package, and whoever reached MADRE through npx already has npm on the machine.
// The prose in AGENT_SETUP.install stays as the alternatives a human may prefer.
export const AGENT_PACKAGE = {
  codex: '@openai/codex',
  claude: '@anthropic-ai/claude-code',
  gemini: '@google/gemini-cli',
  opencode: 'opencode-ai',
};
// One honest line per agent about the account it needs, for the bridge and for CONNECTIONS.
export function accountNoteFor(id) {
  if (id === 'madre') return { account: 'Free and local through Ollama: no account, no tokens. It answers from the room\'s memory.', paid: false, vendor: 'MADRE' };
  const setup = AGENT_SETUP[id];
  return setup ? { account: setup.account, paid: setup.paid, vendor: setup.vendor } : null;
}

export function installPlanFor(agent) {
  const name = AGENT_PACKAGE[agent?.id];
  if (!name) return null;
  return {
    package: name,
    command: 'npm',
    args: ['install', '-g', name, '--no-fund', '--no-audit'],
    display: `npm install -g ${name}`,
    alternatives: (AGENT_SETUP[agent.id]?.install ?? []).slice(1),
  };
}

// How the room can (re)connect an agent. Codex and Claude sign in with a
// browser flow their own CLI drives, so the server can run them and stream the
// URL; Gemini and OpenCode need their interactive prompt, so the user gets the
// exact command instead.
export function loginPlanFor(agent) {
  const setup = AGENT_SETUP[agent.id];
  if (!setup) return null;
  const headless = Boolean(setup.browser) && setup.login.length > 0;
  return {
    headless,
    command: agent.path ?? agent.id,
    args: headless ? setup.login : [],
    display: headless ? `${agent.id} ${setup.login.join(' ')}` : agent.id === 'gemini' ? 'gemini   # then type /auth' : `${agent.id} ${setup.login.join(' ')}`,
    note: setup.loginNote,
    install: setup.install,
  };
}

export async function probeAgentAuth(agent) {
  if (agent.id === 'madre') return agent.ready ? { state: 'signed-in', detail: `local · ${agent.version ?? 'Ollama'}` } : { state: 'signed-out', detail: 'Ollama is not running or has no chat model' };
  if (!agent.detected || !agent.path) return { state: 'not-installed', detail: 'not found on this computer' };
  switch (agent.id) {
    case 'codex': return parseCodexLoginStatus(await run(agent.path, ['login', 'status']));
    case 'claude': return parseClaudeAuthStatus(await run(agent.path, ['auth', 'status', '--json']));
    case 'opencode': return parseOpenCodeAuthList(await run(agent.path, ['auth', 'list']));
    case 'gemini': return probeGemini();
    default: return { state: 'unknown', detail: 'no probe for this agent' };
  }
}

export async function probeAll(agents) {
  const results = await Promise.all(agents.map((agent) => probeAgentAuth(agent)));
  return Object.fromEntries(agents.map((agent, index) => [agent.id, results[index]]));
}
