// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { execFile } from 'node:child_process';
import { t } from './i18n.mjs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

// `opencode models opencode`: the models OpenCode serves itself, one `opencode/<model>` per line.
export function openCodeOwnModels({ stdout = '', code = 0 }) {
  const models = stripAnsi(stdout).split('\n').map((line) => line.trim()).filter((line) => /^opencode\/[\w.:-]+$/.test(line));
  if (code !== 0 || !models.length) return null;
  return { state: 'signed-in', detail: `OpenCode's own free models, no account (${models.length})`, providers: [], own: models.length };
}

// `cursor-agent status` says «Not logged in», or who is signed in («Logged in as …»). A key in the
// environment (CURSOR_API_KEY) signs every run in on its own, so it counts too.
export function parseCursorStatus({ stdout = '', stderr = '' }, env = process.env) {
  const said = stripAnsi(`${stdout}\n${stderr}`);
  if (/not\s+logged\s+in|not\s+authenticated|log\s*in\s+first/i.test(said)) {
    return env.CURSOR_API_KEY ? { state: 'signed-in', detail: 'via CURSOR_API_KEY' } : { state: 'signed-out', detail: 'not logged in' };
  }
  const who = said.match(/logged\s+in\s+(?:as\s+)?([^\s]+@[^\s]+|\S+)/i)?.[1];
  if (who) return { state: 'signed-in', detail: `as ${who}` };
  return env.CURSOR_API_KEY ? { state: 'signed-in', detail: 'via CURSOR_API_KEY' } : { state: 'unknown', detail: said.trim().split('\n')[0]?.slice(0, 120) || 'no answer from cursor-agent status' };
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
  // The CLI reads ~/.gemini/.env as well as the environment and the system keychain.
  const dotEnv = await readFile(join(dir, '.env'), 'utf8').catch(() => '');
  const hasApiKey = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY) || /^\s*(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*\S/m.test(dotEnv) || await geminiHasKeychainKey();
  return geminiAuthState({ settings, hasOauth, hasApiKey });
}

// What each CLI needs from the user. The room runs the sign-in itself; the same command typed in a
// terminal stays as the other way in (`terminal`, `terminalNote`), offered and never required.
// The setup wizard runs them in the user's terminal; install hints are only printed.
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
    // Anthropic sells two doors and its CLI knows both: the subscription (the default) and the
    // Console, which bills the work to the API credit of whoever signs in. MADRE used to open
    // only the first, which is why someone paying for the API could not get in.
    methods: [
      { id: 'claudeai', label: 'Claude account', args: ['auth', 'login'], note: 'Opens your browser to sign in with your Claude account: the work goes against your subscription.' },
      { id: 'console', label: 'Anthropic Console', args: ['auth', 'login', '--console'], note: 'Opens your browser to sign in with the Anthropic Console: the work is billed to your API credit, not to a subscription.' },
    ],
    // Its browser flow has no local server to come back to: the page gives a code and the CLI
    // waits for it on its own input. The room asks for it and types it in.
    asksForCode: true,
    terminalNote: 'Add --console to bill the work to the Anthropic Console instead of your subscription.',
    vendor: 'Anthropic',
    account: 'Signs in with a Claude account or with the Anthropic Console. An Anthropic API key works too.',
    paid: true,
  },
  gemini: {
    install: ['npm install -g @google/gemini-cli'],
    // Gemini has no sign-in command: it signs in the first time it is asked something with
    // "Login with Google" selected. Without a terminal it asks one yes/no, opens the browser by
    // itself and waits on 127.0.0.1 for Google to come back, so the room needs no code and no
    // address. The one-word question it is launched with is let through once the credentials are
    // written: Google refuses free personal accounts only there, and a refused sign-in is undone
    // (see geminiSignIn and loginAgent in server.mjs).
    login: ['--prompt', 'ok'],
    loginNote: 'Opens your browser to sign in with your Google account.',
    browser: true,
    methods: [
      // The free personal account is refused by Google on this CLI (IneligibleTierError, 2026-10-17);
      // the door stays for the accounts Google still serves, and says so.
      { id: 'google', label: 'Google account', args: ['--prompt', 'ok'], note: 'Opens your browser to sign in with your Google account. Google refuses free personal accounts on this CLI; if it refuses yours, paste a Gemini API key from Google AI Studio instead.' },
    ],
    room: {
      display: 'gemini · Login with Google',
      flow: 'gemini-google',
      // It asks "Do you want to continue? [Y/n]" first; the click on the button was the yes.
      consent: true,
      // With CI set the CLI refuses to open a browser and gives up without a terminal.
      ci: false,
      // A key in the environment would sign it in with the key instead of the account chosen.
      dropEnv: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
      // One process, so cancelling stops the one that holds the browser's way back.
      env: { GEMINI_CLI_NO_RELAUNCH: 'true' },
    },
    // In a terminal it is its own prompt that signs in (the setup wizard hands it over whole).
    interactive: true,
    terminal: 'gemini',
    terminalNote: 'Then type /auth and pick "Use Gemini API key" with a key from aistudio.google.com/app/apikey. "Login with Google" is refused for free personal accounts.',
    vendor: 'Google',
    account: 'Connects with a Gemini API key from Google AI Studio. A Google account works only where Google still accepts it: free personal accounts are refused.',
    // Whether it costs depends on the key's project, not on the CLI: no «free option» promised.
    paid: null,
  },
  opencode: {
    install: ['brew install opencode', 'or: npm install -g opencode-ai'],
    login: ['auth', 'login'],
    loginNote: 'Pick a provider and paste its key or complete its OAuth flow.',
    // Its keys are pasted from the room (see openCodeProviders); these are the providers it signs
    // in to with an account. `-p` skips its provider list, so the room never draws a menu. Only
    // the ones whose owner says a third party may sign in this way: GitHub supports Copilot in
    // OpenCode since 2026-01. Left out on purpose: a Claude subscription (Anthropic does not allow
    // claude.ai sign-ins in other tools), and ChatGPT and GitLab, until OpenAI or GitLab say so in
    // writing. They stay one `opencode auth login` away, in the terminal, for whoever chooses them.
    browser: true,
    methods: [
      {
        id: 'github-copilot',
        label: 'GitHub Copilot',
        args: ['auth', 'login', '-p', 'github-copilot'],
        note: 'Gives you a code to type at github.com/login/device: the work goes against your Copilot subscription (Pro, Pro+, Business or Enterprise).',
        // It asks which GitHub first; the room takes github.com. Enterprise is in the terminal.
        room: { deviceCode: true, answers: [{ prompt: 'Select GitHub deployment type', send: '\r' }] },
      },
    ],
    terminalNote: 'Pick a provider, then paste its key or sign in with its account. GitHub Enterprise and the other providers are in its list.',
    vendor: 'OpenCode',
    account: 'Brings no model of its own: you point it at a provider you already use, in the cloud or on this computer.',
    paid: null,
  },
  // Cursor's agent CLI (2026-10-17): `login` opens the browser and waits for Cursor to come back.
  // It has no npm package; its own installer is the way in, typed in a terminal.
  cursor: {
    install: ['curl https://cursor.com/install -fsS | bash'],
    login: ['login'],
    loginNote: 'Opens your browser to sign in with your Cursor account.',
    browser: true,
    terminal: 'cursor-agent login',
    vendor: 'Cursor',
    account: 'Signs in with your Cursor account and uses its plan. For now it reads and answers; it does not write in your project.',
    paid: true,
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
// One honest line per agent about the account it needs, for the bridge and for Settings › Agents.
// Which agents take a pasted key instead of a browser flow.
export const TAKES_KEY = new Set(['claude', 'gemini', 'opencode']);

// A CLI that signs in through a page and then waits for the code that page gives back. The room
// reads its output for both: the address to open, and the moment it starts waiting.
export const SIGN_IN_URL = /https?:\/\/\S+/;
export const CODE_PROMPT = /paste\s+(?:the\s+)?code|enter\s+(?:the\s+)?code|c[oó]digo\s*[:>]/i;
export const looksLikeCodePrompt = (line) => CODE_PROMPT.test(String(line ?? ''));
// The other way round: a device sign-in shows a code to type on the provider's page
// ("Enter code: 3475-C193"), and the room has to show it, not ask for one.
export const DEVICE_CODE = /enter\s+(?:the\s+|this\s+)?code:?\s+([A-Z0-9]{4,}(?:-[A-Z0-9]{4,})+)/i;
export const deviceCodeIn = (line) => String(line ?? '').match(DEVICE_CODE)?.[1] ?? null;

export function accountNoteFor(id) {
  // Said in the room's language when it is asked for, not when this file is imported.
  if (id === 'madre') return { account: t("Free and local through Ollama: no account, no tokens. It answers from the project's memory."), paid: false, vendor: 'MADRE' };
  const setup = AGENT_SETUP[id];
  return setup ? { account: t(setup.account), paid: setup.paid, vendor: setup.vendor } : null;
}

// npm cannot always write to the system folders: with Node installed from its own installer,
// a global install asks for an administrator. Rather than send the human to a terminal with
// sudo, MADRE installs into a folder of its own and finds the CLI there.
export const NEEDS_ADMIN = /EACCES|EPERM|permission denied|Missing write access|operation not permitted|npm ERR! code E401.*sudo|need (?:root|sudo)/i;
export const looksLikeAdminProblem = (output) => NEEDS_ADMIN.test(String(output ?? ''));

export function installPlanFor(agent, { prefix = null } = {}) {
  const name = AGENT_PACKAGE[agent?.id];
  if (!name) return null;
  return {
    package: name,
    command: 'npm',
    args: ['install', '-g', name, '--no-fund', '--no-audit'],
    display: `npm install -g ${name}`,
    // The same install, into MADRE's own prefix: no administrator, nothing outside ~/.pulse.
    fallback: prefix ? { command: 'npm', args: ['install', '-g', name, '--prefix', prefix, '--no-fund', '--no-audit'], display: `npm install -g ${name} --prefix ${prefix}` } : null,
    alternatives: (AGENT_SETUP[agent.id]?.install ?? []).slice(1),
  };
}

// How the room can (re)connect an agent. Codex, Claude and Gemini sign in with a browser flow
// their own CLI drives, so the server can run them and stream what they say; OpenCode too, for
// the providers in its `methods`, and its keys are pasted. Every plan also carries `terminal`:
// the same sign-in typed by hand, for whoever prefers it.
export function loginPlanFor(agent, { method = null } = {}) {
  const setup = AGENT_SETUP[agent.id];
  if (!setup) return null;
  const headless = Boolean(setup.browser) && setup.login.length > 0;
  // Which door: the one asked for, the first one the CLI offers, or the single flow it has.
  const chosen = setup.methods?.find((one) => one.id === method) ?? setup.methods?.[0] ?? null;
  const args = chosen?.args ?? setup.login;
  const room = headless ? { ...(setup.room ?? {}), ...(chosen?.room ?? {}) } : {};
  return {
    headless,
    command: agent.path ?? agent.id,
    args: headless ? args : [],
    display: room.display ?? `${agent.id} ${(headless ? args : setup.login).join(' ')}`,
    note: chosen?.note ?? setup.loginNote,
    terminal: { command: setup.terminal ?? `${agent.id} ${setup.login.join(' ')}`, note: setup.terminalNote ?? setup.loginNote },
    install: setup.install,
    // What the room offers as a choice, and what it must be ready to be asked for.
    methods: setup.methods ? setup.methods.map(({ id, label, note }) => ({ id, label, note })) : null,
    method: chosen?.id ?? null,
    asksForCode: Boolean(headless && setup.asksForCode),
    // How the room runs it, when the CLI needs more than its arguments (see AGENT_SETUP.gemini.room).
    ...(room.flow ? { flow: room.flow } : {}),
    ...(room.consent ? { consent: true } : {}),
    ...(room.ci === false ? { ci: false } : {}),
    ...(room.env ? { env: room.env } : {}),
    ...(room.dropEnv ? { dropEnv: room.dropEnv } : {}),
    // A code to show rather than one to paste, and the menu questions the click already answered.
    ...(room.deviceCode ? { deviceCode: true } : {}),
    ...(room.answers ? { answers: room.answers } : {}),
  };
}

// The yes/no Gemini asks before opening the browser, when it has no terminal to draw a dialog in.
export const CONSENT_PROMPT = /do you want to continue\?\s*\[y\/n\]/i;
export const looksLikeConsentPrompt = (line) => CONSENT_PROMPT.test(String(line ?? ''));

const GEMINI_REFUSED = /IneligibleTierError|no longer supported for Gemini Code Assist|migrate to the Antigravity/i;

// Gemini's Google sign-in, run from the room. Before: "Login with Google" selected in its own
// settings, and the account it had put aside, so the run signs in anew instead of answering with
// the old one. During: `signedIn` says when the credentials are written, which is when the room
// stops the run. After a sign-in that did not finish: `undo` puts both files back as they were.
// MADRE never reads the token: it moves the file it is in and checks that it exists.
export function geminiSignIn({ env = process.env, verifyMs = 30000 } = {}) {
  const dir = join(env.GEMINI_CLI_HOME ?? homedir(), '.gemini');
  const settingsFile = join(dir, 'settings.json');
  const credsFile = join(dir, 'oauth_creds.json');
  let before = null;
  const readIfThere = (path) => readFile(path, 'utf8').catch(() => null);
  const putBack = (path, previous) => (previous === null ? rm(path, { force: true }) : writeFile(path, previous, { mode: 0o600 }));
  return {
    async prepare() {
      await mkdir(dir, { recursive: true });
      before = { settings: await readIfThere(settingsFile), creds: await readIfThere(credsFile) };
      let settings = {};
      try { settings = JSON.parse(before.settings ?? '{}') ?? {}; } catch { settings = {}; }
      settings.security = { ...(settings.security ?? {}), auth: { ...(settings.security?.auth ?? {}), selectedType: 'oauth-personal' } };
      await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
      if (before.creds !== null) await rm(credsFile, { force: true });
    },
    signedIn: () => exists(credsFile),
    // Google lets a free personal account sign in and refuses it at the first question
    // (IneligibleTierError, 2026-10-17): a sign-in is only good once that question was not refused.
    refused: (line) => GEMINI_REFUSED.test(String(line ?? '')),
    // How long that first question is waited for before the run is stopped and the sign-in kept.
    verifyMs,
    async undo() {
      if (!before) return;
      await putBack(settingsFile, before.settings);
      await putBack(credsFile, before.creds);
      before = null;
    },
  };
}

export async function probeAgentAuth(agent) {
  if (agent.id === 'madre') return agent.ready ? { state: 'signed-in', detail: `local · ${agent.version ?? 'Ollama'}` } : { state: 'signed-out', detail: 'Ollama is not running or has no chat model' };
  if (!agent.detected || !agent.path) return { state: 'not-installed', detail: 'not found on this computer' };
  switch (agent.id) {
    case 'codex': return parseCodexLoginStatus(await run(agent.path, ['login', 'status']));
    case 'claude': return parseClaudeAuthStatus(await run(agent.path, ['auth', 'status', '--json']));
    case 'opencode': {
      const listed = parseOpenCodeAuthList(await run(agent.path, ['auth', 'list']));
      if (listed.state === 'signed-in') return listed;
      // No provider of its own, and still it answers: OpenCode brings free models that need no account
      // (opencode/big-pickle by default). Called signed out, the one agent a newcomer could use
      // without signing in anywhere was the one MADRE would not let them write to (2026-10-19).
      return openCodeOwnModels(await run(agent.path, ['models', 'opencode'], 15000)) ?? listed;
    }
    case 'cursor': return parseCursorStatus(await run(agent.path, ['status']));
    case 'gemini': return probeGemini();
    default: return { state: 'unknown', detail: 'no probe for this agent' };
  }
}

export async function probeAll(agents) {
  const results = await Promise.all(agents.map((agent) => probeAgentAuth(agent)));
  return Object.fromEntries(agents.map((agent, index) => [agent.id, results[index]]));
}
