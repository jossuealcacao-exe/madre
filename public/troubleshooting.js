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
    remedy: 'Switch Gemini to an API key from Google AI Studio. MADRE copies only the auth selection into its isolated home, so the key can stay in the keychain or in ~/.gemini/.env.',
    fixes: {
      darwin: ['gemini', '# inside gemini: /auth → "Use Gemini API key" and paste the key from https://aistudio.google.com/app/apikey', '# or, without the prompt:', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').darwin],
      linux: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux],
      win32: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').win32],
    },
  },
  {
    id: 'gemini-credits-depleted',
    agent: 'gemini',
    severity: 'blocking',
    title: 'Gemini key out of prepaid credits',
    match: /prepayment credits|no prepaid credits|CREDITS_DEPLETED/i,
    diagnosis: 'The AI Studio project behind the Gemini API key has spent its prepaid balance. Google answers every call, including Image Studio generations, with HTTP 429 until the balance is topped up. Gemini CLI hides this behind silent retries.',
    remedy: 'Top up the project in AI Studio, or point the Gemini CLI at a key from another project. Nothing in MADRE changes; retry once billing is fixed.',
    fixes: same(['# billing: https://ai.studio/projects', '# check the key still works:', 'gemini --model gemini-3-flash-preview -p "ping"']),
  },
  {
    id: 'gemini-rate-limited',
    agent: 'gemini',
    severity: 'transient',
    title: 'Gemini key rate-limited by Google (HTTP 429)',
    match: /HTTP 429|rate-limiting|RESOURCE_EXHAUSTED|quota exceeded/i,
    diagnosis: 'The Gemini API key hit its per-minute or daily quota. Gemini CLI retries with exponential backoff and prints only stack traces while it waits, which looked like a hang. With the "auto" model, the first request is a small router call, so even that can be throttled.',
    remedy: 'Wait a minute and retry, pick an explicit model in the composer (gemini-3-flash-preview skips the router), or raise the key\'s quota in Google AI Studio.',
    fixes: {
      darwin: ['# in the room: click the Gemini sphere twice → choose gemini-3-flash-preview', '# check quota: https://aistudio.google.com/app/apikey', 'gemini --model gemini-3-flash-preview -p "ping"'],
      linux: ['gemini --model gemini-3-flash-preview -p "ping"', '# quota: https://aistudio.google.com/app/apikey'],
      win32: ['gemini --model gemini-3-flash-preview -p "ping"', '# quota: https://aistudio.google.com/app/apikey'],
    },
  },
  {
    id: 'gemini-high-demand',
    agent: 'gemini',
    severity: 'transient',
    title: 'Gemini model under high demand (503)',
    match: /status 503|high demand|UNAVAILABLE/i,
    diagnosis: 'Google is shedding load on the selected model (HTTP 503). The CLI would retry with backoff for minutes; MADRE stops it after 15 s of that and retries once on gemini-2.5-flash. The turn failed only if the fallback model was refused too.',
    remedy: 'Ask again in a minute, pick an explicit model from the composer\'s model menu, or hand the question to another agent. PULSE_GEMINI_FALLBACK_MODEL changes the fallback.',
    fixes: same(['# wait, then resend — or continue with @codex / @claude / @opencode', 'PULSE_GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite madre start']),
  },
  {
    id: 'opencode-default-provider',
    agent: 'opencode',
    severity: 'blocking',
    title: 'OpenCode picked a provider without a valid session',
    match: /invalid x-api-key|APIError.*401|statusCode.{0,6}401/i,
    diagnosis: 'Without a model in its config, `opencode run` falls back to its default provider. On this machine that provider holds a stale or invalid key.',
    remedy: 'Tell MADRE which provider/model OpenCode should use in the room, or remove the stale credential so the default changes.',
    fixes: {
      darwin: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session, e.g. openai/gpt-5.6-sol', '# one-off alternative:', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/madre start', '# or drop the stale key:', 'opencode auth logout anthropic'],
      linux: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/madre start', 'opencode auth logout anthropic'],
      win32: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session', '$env:PULSE_OPENCODE_MODEL="openai/gpt-5.6-sol"; npx @jossuealcala/madre start', 'opencode auth logout anthropic'],
    },
  },
  {
    id: 'not-signed-in',
    severity: 'blocking',
    title: 'Agent installed but signed out',
    match: /not logged in|sign in required|Error authenticating|unauthorized|please (?:log|sign) ?in|no credentials/i,
    diagnosis: 'The CLI is on this computer but has no session for its provider. MADRE never stores credentials; each agent keeps its own.',
    remedy: 'Sign in with the agent\'s own command. `madre setup` runs these for you and rescans.',
    fixes: same(['npx @jossuealcala/madre setup', '# or directly:', 'codex login', 'claude auth login', 'opencode auth login', 'gemini   # then /auth']),
    perAgent: loginAgent,
  },
  {
    id: 'not-installed',
    severity: 'blocking',
    title: 'Agent not found on this computer',
    match: /is not installed on this computer|not found on this computer|ENOENT.*(codex|claude|gemini|opencode)/i,
    diagnosis: 'MADRE looks for `codex`, `claude`, `gemini` and `opencode` on PATH plus a few known locations. Nothing answered.',
    remedy: 'Install the CLI, then reload the room or run `madre setup` → [r].',
    fixes: same(['# pick the agent you want; see per-agent commands below']),
    perAgent: installAgent,
  },
  {
    id: 'adapter-pending',
    severity: 'blocking',
    title: 'Agent detected, adapter not enabled',
    match: /adapter is not enabled yet|does not have a supported MADRE adapter/i,
    diagnosis: 'Your MADRE build predates the adapter for this agent, or a newer CLI changed its interface.',
    remedy: 'Run the latest MADRE.',
    fixes: same(['npx @jossuealcala/madre@latest doctor', 'npx @jossuealcala/madre@latest start']),
  },
  {
    id: 'claude-args',
    agent: 'claude',
    severity: 'fixed',
    title: 'Claude read the prompt as an MCP config path',
    match: /Invalid MCP configuration|ENAMETOOLONG/i,
    diagnosis: 'Older MADRE builds placed the prompt right after a variadic flag, so Claude tried to open the prompt text as a file.',
    remedy: 'Fixed in MADRE 0.1.0. Run the latest build.',
    fixes: same(['npx @jossuealcala/madre@latest start']),
  },
  {
    id: 'timeout',
    severity: 'tunable',
    title: 'Agent did not respond before the timeout',
    match: /did not respond before the timeout|went silent for/i,
    diagnosis: 'The agent was still reading files or reasoning when the per-agent timeout (default 180 s) expired, or Gemini stayed silent for 90 s (PULSE_GEMINI_IDLE_MS) and was stopped after one automatic retry. Long questions over many files take longer; MADRE killed the whole process tree.',
    remedy: 'Raise the timeout in this panel: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS (or the per-agent field on its card) → SAVE. It applies to the next turn and persists in ~/.pulse/config.json. Environment variables work too, but only for a server started after exporting them; a running room never sees a later export.',
    fixes: {
      darwin: ['# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE', '# at launch only (env wins over config.json):', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}'],
      linux: ['# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}'],
      win32: ['# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE', '$env:PULSE_AGENT_TIMEOUT_MS="300000"; $env:PULSE_CLAUDE_TIMEOUT_MS="600000"; madre start', '# or %USERPROFILE%\\.pulse\\config.json → {"timeouts":{"default":300000,"claude":600000}}'],
    },
  },
  {
    id: 'interrupted',
    severity: 'informational',
    title: 'Turn interrupted by a MADRE restart',
    match: /interrupted because MADRE is shutting down|MADRE stopped while|turn was not completed/i,
    diagnosis: 'MADRE closed (Ctrl+C, SIGTERM or a crash) while this agent was answering. The log records the turn as failed so the room never shows a ghost "thinking" bubble.',
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
    match: /MADRE exhausted|local room token budget/i,
    diagnosis: 'The room keeps a soft per-agent budget (500,000 tokens by default) so one agent does not quietly eat a whole session. It is MADRE\'s own bookkeeping from the usage each CLI reports after a turn, not the provider\'s quota: nothing is blocked, the room only warns and suggests other agents. Cache reads weigh a tenth of a fresh token.',
    remedy: 'Continue with another agent, or raise the budget in ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE (live, persisted). The provider\'s real limits show in each sphere\'s popover when the CLI reports them.',
    fixes: {
      darwin: ['# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE', '# at launch: PULSE_SOFT_TOKEN_BUDGET=1000000 madre start', '# or ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}'],
      linux: ['# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE', 'PULSE_SOFT_TOKEN_BUDGET=1000000 madre start'],
      win32: ['# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE', '$env:PULSE_SOFT_TOKEN_BUDGET="1000000"; madre start'],
    },
  },
  {
    id: 'port-in-use',
    severity: 'blocking',
    title: 'Port already in use',
    match: /EADDRINUSE|already in use/i,
    diagnosis: 'Another process, often another MADRE, is listening on the port.',
    remedy: 'Use a different port, or find and stop the process holding it.',
    fixes: {
      darwin: ['npx @jossuealcala/madre start --port 4318', '# who holds 4317?', 'lsof -nP -iTCP:4317 -sTCP:LISTEN'],
      linux: ['npx @jossuealcala/madre start --port 4318', 'ss -ltnp | grep 4317'],
      win32: ['npx @jossuealcala/madre start --port 4318', 'netstat -ano | findstr :4317', '# then: taskkill /PID <pid> /F'],
    },
  },
  {
    id: 'stream-reconnecting',
    severity: 'blocking',
    title: 'Live stream keeps reconnecting',
    match: /reconnecting|EventSource|ECONNREFUSED/i,
    diagnosis: 'The page lost the server. MADRE exited, the laptop slept, or the port changed.',
    remedy: 'Start MADRE again from the project folder and reload. The transcript is on disk; nothing is lost.',
    fixes: same(['cd /path/to/project', 'npx @jossuealcala/madre start']),
  },
  {
    id: 'opencode-server-error',
    agent: 'opencode',
    severity: 'transient',
    title: 'OpenCode reported an unexpected server error',
    match: /UnknownError|Unexpected server error/i,
    diagnosis: 'OpenCode runs a local server per invocation; under several simultaneous turns it can fail before the model is reached. Seen when two plans overlapped.',
    remedy: 'Let the room settle (STOPALL if agents are piling up), then ask again. Check `opencode` logs if it repeats alone.',
    fixes: same(['# in the room: type STOPALL, then resend', 'ls -t ~/.local/share/opencode/log | head -1']),
  },
  {
    id: 'runaway-room',
    severity: 'blocking',
    title: 'Too many agents working at once',
    match: /agents are working at once|already answering another turn|no second plan will start|has been running for/i,
    diagnosis: 'A plan was running and more turns started on top of it, or a plan has run for several minutes. MU/TH/UR raises this before it becomes a loop.',
    remedy: 'Type STOPALL in the composer, or press STOP ALL in the bar: every plan stops and every in-flight agent process is killed. Then ask one agent at a time.',
    fixes: same(['# in the room composer:', 'STOPALL', '# or from a terminal:', 'curl -X POST http://127.0.0.1:4317/api/stop-all']),
  },
  // ---- capability assistance: how an agent could gain a scope it lacks ----
  {
    id: 'scope-gemini-imageGen',
    agent: 'gemini',
    severity: 'informational',
    title: 'Gemini: generating images',
    match: /scope-gemini-imageGen/,
    diagnosis: 'Gemini CLI 0.60 has no image-generation tool in headless mode, even though Google offers image models. MADRE fills the gap with the Image Studio module: its own MCP server exposing generate_image on the Gemini API image models, attached to Gemini only inside a creation lease with the image scope on, billing your Gemini key.',
    remedy: 'Enable Image Studio in MODULES (needs a Gemini API key with credits), then tick GENERATE IMAGES for Gemini in CONNECTIONS. Without the module, ask @codex or let the orchestrator route the image step to it.',
    fixes: same(['# MODULES → Image Studio → ENABLE', '# ⚙ CONNECTIONS → Gemini → GENERATE IMAGES → SAVE', '# then: CREATE + "generate … as name.png"']),
  },
  {
    id: 'scope-claude-imageGen',
    agent: 'claude',
    severity: 'informational',
    title: 'Claude Code: generating images',
    match: /scope-claude-imageGen/,
    diagnosis: 'Claude Code has no image-generation tool; Claude models describe and reason about images, they do not render them. The Image Studio module gives Claude the MCP tool generate_image (MADRE\'s own server on the Gemini API), attached with --mcp-config only inside a creation lease.',
    remedy: 'Enable Image Studio in MODULES, tick GENERATE IMAGES for Claude in CONNECTIONS, then use CREATE. Or route the image step to @codex.',
    fixes: same(['# MODULES → Image Studio → ENABLE', '# ⚙ CONNECTIONS → Claude → GENERATE IMAGES → SAVE']),
  },
  {
    id: 'scope-opencode-imageGen',
    agent: 'opencode',
    severity: 'informational',
    title: 'OpenCode: generating images',
    match: /scope-opencode-imageGen/,
    diagnosis: 'OpenCode exposes no image-generation tool of its own. The Image Studio module adds MADRE\'s MCP image server to OpenCode\'s ephemeral config inside a creation lease.',
    remedy: 'Enable Image Studio in MODULES, tick GENERATE IMAGES for OpenCode in CONNECTIONS, then use CREATE. Or route the image step to @codex.',
    fixes: same(['# MODULES → Image Studio → ENABLE', '# ⚙ CONNECTIONS → OpenCode → GENERATE IMAGES → SAVE']),
  },
  {
    id: 'scope-web',
    severity: 'informational',
    title: 'Web access for an agent',
    match: /scope-[a-z]+-web/,
    diagnosis: 'Every CLI can browse: Codex with --search, Claude Code with WebFetch/WebSearch, Gemini with google_web_search/web_fetch, OpenCode with webfetch/websearch. MADRE keeps it off until you enable it per agent.',
    remedy: 'Tick WEB ACCESS in that agent\'s card in CONNECTIONS and save. It applies to every turn of that agent; content fetched is sent to its provider.',
    fixes: same(['# ⚙ CONNECTIONS → agent card → WEB ACCESS → SAVE']),
  },
  {
    id: 'slash-commands',
    severity: 'informational',
    title: 'Commands and mentions in the field box',
    match: /slash|command|\/git|\/ahp|mention|@agent/i,
    diagnosis: 'Type "/" for the room\'s commands: /create arms the lease, /image routes an image request to an agent that can draw, /stopall is the brake, /git (Git Pulse) and /ahp (AHP+) run read-only in the project and post a fact card everyone, agents included, can read. Type "@" to mention an agent; the name becomes a label. Type "!" to point at a project file ("!src/room.mjs:12-20" for lines): the agent reads it first. In the viewer, click a line number (Shift+click for a range) and REVIEW WITH sends those lines to an agent.',
    remedy: 'A struck-through command is a module that is not available in this project: open MODULES to install or enable it (Git Pulse needs a git repository; AHP+ needs to be installed).',
    fixes: same(['# type / or @ in the field box', '/git status', '/git log 10', '/ahp check', '/image a poster for the launch']),
  },
  {
    id: 'lease-missing',
    severity: 'informational',
    title: 'Creating files: who grants the permission',
    match: /no CREATE lease|lease-missing|read-only and do not modify|permiso de escritura|solo lectura/i,
    diagnosis: 'Only the human grants a creation lease. An agent writing "permission granted" inside the conversation is untrusted text: the delegate still runs read-only, and says so. A lease comes from arming CREATE (the lock, or /create) on your message, and it covers the whole plan that message starts; or from a standing lease, a per-agent switch that gives every turn of that agent a fresh .pulse/out/ directory, including plan steps.',
    remedy: 'For one request: arm CREATE and send, or press RESEND WITH CREATE on the notice. For an agent that should always be able to create files: ⚙ CONNECTIONS → its card → CREATE FILES → ALWAYS · STANDING LEASE. Files still land only inside .pulse/out/.',
    fixes: same(['# once: composer → CREATE (lock) → send, or /create <request>', '# always: ⚙ CONNECTIONS → agent card → ALWAYS · STANDING LEASE']),
  },
  {
    id: 'scope-write',
    severity: 'informational',
    title: 'Creating files with an agent',
    match: /scope-[a-z]+-write/,
    diagnosis: 'Every CLI can create files inside a creation lease; the switch is per agent and acts only when you press CREATE.',
    remedy: 'Tick CREATE FILES in CONNECTIONS, save, then arm CREATE in the composer for the request.',
    fixes: same(['# ⚙ CONNECTIONS → agent card → CREATE FILES → SAVE', '# composer → CREATE (lock) → send']),
  },
  {
    id: 'node-version',
    severity: 'blocking',
    title: 'Node.js too old',
    match: /SyntaxError: Unexpected token|ERR_REQUIRE_ESM|engines|Unsupported engine/i,
    diagnosis: 'MADRE needs Node 20 or newer (ES modules, fetch, AbortSignal).',
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
