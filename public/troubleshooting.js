// MU/TH/UR knowledge base: known conditions, how to recognise them in the
// room's own failure records, and the remedy as terminal commands per OS.
//
// Pure module (no DOM) so the catalog can be unit-tested and reused by the CLI.

export const PLATFORMS = {
  darwin: { label: 'macOS', shell: 'zsh' },
  linux: { label: 'Linux', shell: 'bash' },
  win32: { label: 'Windows', shell: 'PowerShell' },
};

const envExport = (name, value) => ({
  darwin: [`export ${name}="${value}"`, `# persist: echo 'export ${name}="${value}"' >> ~/.zshrc`],
  linux: [`export ${name}="${value}"`, `# persist: echo 'export ${name}="${value}"' >> ~/.bashrc`],
  win32: [`$env:${name}="${value}"`, `# persist: setx ${name} "${value}"`],
});

const installAgent = {
  codex: {
    darwin: ['npm install -g @openai/codex', '# or install the ChatGPT desktop app, which bundles codex'],
    linux: ['npm install -g @openai/codex'],
    win32: ['npm install -g @openai/codex'],
  },
  claude: {
    darwin: ['brew install --cask claude-code', '# or: npm install -g @anthropic-ai/claude-code'],
    linux: ['npm install -g @anthropic-ai/claude-code'],
    win32: ['npm install -g @anthropic-ai/claude-code'],
  },
  gemini: {
    darwin: ['npm install -g @google/gemini-cli'],
    linux: ['npm install -g @google/gemini-cli'],
    win32: ['npm install -g @google/gemini-cli'],
  },
  opencode: {
    darwin: ['brew install opencode', '# or: npm install -g opencode-ai'],
    linux: ['curl -fsSL https://opencode.ai/install | bash', '# or: npm install -g opencode-ai'],
    win32: ['npm install -g opencode-ai'],
  },
};

const loginAgent = {
  codex: { darwin: ['codex login', 'codex login status'], linux: ['codex login', 'codex login status'], win32: ['codex login', 'codex login status'] },
  claude: { darwin: ['claude auth login', 'claude auth status --text'], linux: ['claude auth login', 'claude auth status --text'], win32: ['claude auth login', 'claude auth status --text'] },
  gemini: { darwin: ['gemini', '# inside gemini: /auth  → "Use Gemini API key" or Google login'], linux: ['gemini', '# inside gemini: /auth'], win32: ['gemini', '# inside gemini: /auth'] },
  opencode: { darwin: ['opencode auth login', 'opencode auth list'], linux: ['opencode auth login', 'opencode auth list'], win32: ['opencode auth login', 'opencode auth list'] },
};

const same = (commands) => ({ darwin: commands, linux: commands, win32: commands });

export const CONDITIONS = [
  {
    id: 'gemini-ineligible-tier',
    agent: 'gemini',
    severity: 'blocking',
    title: 'Gemini refuses the personal Google login',
    match: /IneligibleTierError|no longer supported for Gemini Code Assist|migrate to the Antigravity/i,
    diagnosis: 'Google closed Gemini Code Assist for individuals to this client. The OAuth login still exists but every request is rejected before it reaches a model.',
    remedy: 'Switch Gemini to an API key from Google AI Studio. PULSE copies only the auth selection into its isolated home, so the key can stay in the keychain or in ~/.gemini/.env.',
    fixes: {
      darwin: ['gemini', '# inside gemini: /auth → "Use Gemini API key" and paste the key from https://aistudio.google.com/app/apikey', '# or, without the prompt:', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').darwin],
      linux: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux],
      win32: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').win32],
    },
  },
  {
    id: 'gemini-high-demand',
    agent: 'gemini',
    severity: 'transient',
    title: 'Gemini model under high demand (503)',
    match: /status 503|high demand|UNAVAILABLE/i,
    diagnosis: 'Google is shedding load on the selected model. The CLI retries with backoff on its own; the turn failed only if every retry failed.',
    remedy: 'Ask again in a minute, or hand the question to another agent. Nothing to configure.',
    fixes: same(['# wait, then resend — or continue with @codex / @claude / @opencode']),
  },
  {
    id: 'opencode-default-provider',
    agent: 'opencode',
    severity: 'blocking',
    title: 'OpenCode picked a provider without a valid session',
    match: /invalid x-api-key|APIError.*401|statusCode.{0,6}401/i,
    diagnosis: 'Without a model in its config, `opencode run` falls back to its default provider. On this machine that provider holds a stale or invalid key.',
    remedy: 'Tell PULSE which provider/model OpenCode should use in the room, or remove the stale credential so the default changes.',
    fixes: {
      darwin: ['npx @jossuealcala/pulse setup', '# press [m] and pick a provider/model that has a session, e.g. openai/gpt-5.6-sol', '# one-off alternative:', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/pulse start', '# or drop the stale key:', 'opencode auth logout anthropic'],
      linux: ['npx @jossuealcala/pulse setup', '# press [m] and pick a provider/model that has a session', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/pulse start', 'opencode auth logout anthropic'],
      win32: ['npx @jossuealcala/pulse setup', '# press [m] and pick a provider/model that has a session', '$env:PULSE_OPENCODE_MODEL="openai/gpt-5.6-sol"; npx @jossuealcala/pulse start', 'opencode auth logout anthropic'],
    },
  },
  {
    id: 'not-signed-in',
    severity: 'blocking',
    title: 'Agent installed but signed out',
    match: /not logged in|sign in required|Error authenticating|unauthorized|please (?:log|sign) ?in|no credentials/i,
    diagnosis: 'The CLI is on this computer but has no session for its provider. PULSE never stores credentials; each agent keeps its own.',
    remedy: 'Sign in with the agent\'s own command. `pulse setup` runs these for you and rescans.',
    fixes: same(['npx @jossuealcala/pulse setup', '# or directly:', 'codex login', 'claude auth login', 'opencode auth login', 'gemini   # then /auth']),
    perAgent: loginAgent,
  },
  {
    id: 'not-installed',
    severity: 'blocking',
    title: 'Agent not found on this computer',
    match: /is not installed on this computer|not found on this computer|ENOENT.*(codex|claude|gemini|opencode)/i,
    diagnosis: 'PULSE looks for `codex`, `claude`, `gemini` and `opencode` on PATH plus a few known locations. Nothing answered.',
    remedy: 'Install the CLI, then reload the room or run `pulse setup` → [r].',
    fixes: same(['# pick the agent you want; see per-agent commands below']),
    perAgent: installAgent,
  },
  {
    id: 'adapter-pending',
    severity: 'blocking',
    title: 'Agent detected, adapter not enabled',
    match: /adapter is not enabled yet|does not have a supported PULSE adapter/i,
    diagnosis: 'Your PULSE build predates the adapter for this agent, or a newer CLI changed its interface.',
    remedy: 'Run the latest PULSE.',
    fixes: same(['npx @jossuealcala/pulse@latest doctor', 'npx @jossuealcala/pulse@latest start']),
  },
  {
    id: 'claude-args',
    agent: 'claude',
    severity: 'fixed',
    title: 'Claude read the prompt as an MCP config path',
    match: /Invalid MCP configuration|ENAMETOOLONG/i,
    diagnosis: 'Older PULSE builds placed the prompt right after a variadic flag, so Claude tried to open the prompt text as a file.',
    remedy: 'Fixed in PULSE 0.1.0. Run the latest build.',
    fixes: same(['npx @jossuealcala/pulse@latest start']),
  },
  {
    id: 'timeout',
    severity: 'tunable',
    title: 'Agent did not respond before the timeout',
    match: /did not respond before the timeout/i,
    diagnosis: 'The agent was still reading files or reasoning when the per-agent timeout (default 180 s) expired. Long questions over many files take longer; PULSE killed the whole process tree.',
    remedy: 'Raise the timeout for that agent or for all of them, then ask again. Values are milliseconds.',
    fixes: {
      darwin: ['# all agents, 5 minutes:', ...envExport('PULSE_AGENT_TIMEOUT_MS', '300000').darwin.slice(0, 1), '# one agent:', 'export PULSE_CLAUDE_TIMEOUT_MS="600000"', '# or persist in ~/.pulse/config.json → {"timeouts":{"default":300000}}'],
      linux: ['export PULSE_AGENT_TIMEOUT_MS="300000"', 'export PULSE_CLAUDE_TIMEOUT_MS="600000"', '# or persist in ~/.pulse/config.json → {"timeouts":{"default":300000}}'],
      win32: ['$env:PULSE_AGENT_TIMEOUT_MS="300000"', '$env:PULSE_CLAUDE_TIMEOUT_MS="600000"', '# or persist in %USERPROFILE%\\.pulse\\config.json → {"timeouts":{"default":300000}}'],
    },
  },
  {
    id: 'interrupted',
    severity: 'informational',
    title: 'Turn interrupted by a PULSE restart',
    match: /interrupted because PULSE is shutting down|PULSE stopped while|turn was not completed/i,
    diagnosis: 'PULSE closed (Ctrl+C, SIGTERM or a crash) while this agent was answering. The log records the turn as failed so the room never shows a ghost "thinking" bubble.',
    remedy: 'Nothing to fix. Ask again; the durable transcript is intact.',
    fixes: same(['# resend the question']),
  },
  {
    id: 'message-too-long',
    severity: 'tunable',
    title: 'Message rejected for length',
    match: /Message is too long/i,
    diagnosis: 'Single messages are capped (20,000 characters by default) so the prompt fits every CLI\'s argument limits.',
    remedy: 'Split the message, or raise the cap if your CLIs cope.',
    fixes: {
      darwin: ['export PULSE_MAX_MESSAGE_CHARS="40000"'],
      linux: ['export PULSE_MAX_MESSAGE_CHARS="40000"'],
      win32: ['$env:PULSE_MAX_MESSAGE_CHARS="40000"'],
    },
  },
  {
    id: 'budget-exhausted',
    severity: 'tunable',
    title: 'Local token budget exhausted for an agent',
    match: /PULSE exhausted|local room token budget/i,
    diagnosis: 'The room keeps a soft per-agent budget (500,000 tokens by default) so one agent does not quietly eat a whole session. It is local bookkeeping, not the provider\'s quota.',
    remedy: 'Continue with another agent, or raise the budget.',
    fixes: {
      darwin: ['export PULSE_SOFT_TOKEN_BUDGET="1000000"', '# or ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}'],
      linux: ['export PULSE_SOFT_TOKEN_BUDGET="1000000"'],
      win32: ['$env:PULSE_SOFT_TOKEN_BUDGET="1000000"'],
    },
  },
  {
    id: 'port-in-use',
    severity: 'blocking',
    title: 'Port already in use',
    match: /EADDRINUSE|already in use/i,
    diagnosis: 'Another process, often another PULSE, is listening on the port.',
    remedy: 'Use a different port, or find and stop the process holding it.',
    fixes: {
      darwin: ['npx @jossuealcala/pulse start --port 4318', '# who holds 4317?', 'lsof -nP -iTCP:4317 -sTCP:LISTEN'],
      linux: ['npx @jossuealcala/pulse start --port 4318', 'ss -ltnp | grep 4317'],
      win32: ['npx @jossuealcala/pulse start --port 4318', 'netstat -ano | findstr :4317', '# then: taskkill /PID <pid> /F'],
    },
  },
  {
    id: 'stream-reconnecting',
    severity: 'blocking',
    title: 'Live stream keeps reconnecting',
    match: /reconnecting|EventSource|ECONNREFUSED/i,
    diagnosis: 'The page lost the server. PULSE exited, the laptop slept, or the port changed.',
    remedy: 'Start PULSE again from the project folder and reload. The transcript is on disk; nothing is lost.',
    fixes: same(['cd /path/to/project', 'npx @jossuealcala/pulse start']),
  },
  {
    id: 'node-version',
    severity: 'blocking',
    title: 'Node.js too old',
    match: /SyntaxError: Unexpected token|ERR_REQUIRE_ESM|engines|Unsupported engine/i,
    diagnosis: 'PULSE needs Node 20 or newer (ES modules, fetch, AbortSignal).',
    remedy: 'Update Node.',
    fixes: {
      darwin: ['node --version', 'brew install node', '# or: nvm install --lts'],
      linux: ['node --version', 'nvm install --lts', '# or your distro package for Node ≥ 20'],
      win32: ['node --version', 'winget install OpenJS.NodeJS.LTS'],
    },
  },
];

export function detectPlatform(nav = globalThis.navigator) {
  const hint = `${nav?.userAgentData?.platform ?? ''} ${nav?.platform ?? ''} ${nav?.userAgent ?? ''}`.toLowerCase();
  if (/mac|iphone|ipad|darwin/.test(hint)) return 'darwin';
  if (/win/.test(hint)) return 'win32';
  if (/linux|android|x11/.test(hint)) return 'linux';
  return 'darwin';
}

// Which conditions explain a recorded failure. Agent-specific conditions
// only match their own agent; generic ones match anyone.
export function diagnose(errorText, agent = null) {
  const text = String(errorText ?? '');
  return CONDITIONS.filter((condition) => (!condition.agent || !agent || condition.agent === agent) && condition.match.test(text));
}

export function searchConditions(query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return CONDITIONS;
  return CONDITIONS.filter((condition) => [condition.id, condition.title, condition.diagnosis, condition.remedy, condition.agent ?? '']
    .join(' ').toLowerCase().includes(needle));
}

export function fixesFor(condition, platform, agent = null) {
  const base = condition.fixes?.[platform] ?? condition.fixes?.darwin ?? [];
  const perAgent = condition.perAgent?.[agent]?.[platform];
  return perAgent ? [...perAgent, ...(base.length && !base[0].startsWith('#') ? base : [])] : base;
}
