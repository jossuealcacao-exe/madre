// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { t } from './i18n.js';

// MU/TH/UR knowledge base: known conditions, how to recognise them in the
// room's own failure records, and the remedy as terminal commands per OS.
//
// Pure module (no DOM) so the catalog can be unit-tested and reused by the CLI.

// The two MADRE is tested on. Every remedy below is a command written for one of these two
// shells; a third set that nobody has ever run would be worse than none.
export const PLATFORMS = {
  darwin: { label: 'macOS', shell: 'zsh' },
  linux: { label: 'Linux', shell: 'bash' },
};

const envExport = (name, value) => ({
  darwin: [`export ${name}="${value}"`, `# persist: echo 'export ${name}="${value}"' >> ~/.zshrc`],
  linux: [`export ${name}="${value}"`, `# persist: echo 'export ${name}="${value}"' >> ~/.bashrc`]
});

const installAgent = {
  codex: {
    darwin: ['npm install -g @openai/codex', '# or install the ChatGPT desktop app, which bundles codex'],
    linux: ['npm install -g @openai/codex']
  },
  claude: {
    darwin: ['brew install --cask claude-code', '# or: npm install -g @anthropic-ai/claude-code'],
    linux: ['npm install -g @anthropic-ai/claude-code']
  },
  gemini: {
    darwin: ['npm install -g @google/gemini-cli'],
    linux: ['npm install -g @google/gemini-cli']
  },
  opencode: {
    darwin: ['brew install opencode', '# or: npm install -g opencode-ai'],
    linux: ['curl -fsSL https://opencode.ai/install | bash', '# or: npm install -g opencode-ai']
  },
  cursor: {
    darwin: ['curl https://cursor.com/install -fsS | bash'],
    linux: ['curl https://cursor.com/install -fsS | bash']
  },
};

const loginAgent = {
  codex: { darwin: ['codex login', 'codex login status'], linux: ['codex login', 'codex login status']},
  claude: { darwin: ['claude auth login', 'claude auth status --text'], linux: ['claude auth login', 'claude auth status --text']},
  gemini: { darwin: ['gemini', '# inside gemini: /auth  → "Use Gemini API key" or Google login'], linux: ['gemini', '# inside gemini: /auth']},
  opencode: { darwin: ['opencode auth login', 'opencode auth list'], linux: ['opencode auth login', 'opencode auth list']},
  cursor: { darwin: ['cursor-agent login', 'cursor-agent status'], linux: ['cursor-agent login', 'cursor-agent status']},
};

const same = (commands) => ({ darwin: commands, linux: commands });

export const CONDITIONS = [
  {
    id: 'claude-api-key-shadows-plan',
    code: 'MU-001',
    agent: 'claude',
    severity: 'common',
    title: 'ANTHROPIC_API_KEY takes precedence over the claude.ai plan',
    match: /connectors are disabled because ANTHROPIC_API_KEY|another auth source is set and takes precedence|takes precedence over your claude\.ai login/i,
    diagnosis: 'Claude Code found an API key as well as the claude.ai login, and the key wins. It may come from your shell profile — MADRE hands the CLI the environment exactly as this machine has it — or from the `env` block of ~/.claude/settings.json, which is where a key pasted into Settings › Agents is written. The turn is billed to the API account, not to the plan, and your organisation connectors do not load.',
    remedy: 'Decide which one you mean. To work on the API, this message is only a notice and can be ignored. To work on the plan, take the key out of wherever it is set: your shell profile, or the `env` block of ~/.claude/settings.json if you pasted it into MADRE — then open the project again.',
    fixes: {
      darwin: ['grep -rn ANTHROPIC_API_KEY ~/.zshrc ~/.zprofile ~/.zshenv 2>/dev/null', '# remove or comment the line it finds, then:', 'unset ANTHROPIC_API_KEY', '# and start MADRE from a new terminal'],
      linux: ['grep -rn ANTHROPIC_API_KEY ~/.bashrc ~/.profile ~/.bash_profile 2>/dev/null', 'unset ANTHROPIC_API_KEY', '# and start MADRE from a new terminal'],
    },
  },
  {
    id: 'custom-agent-endpoint',
    code: 'MU-055',
    severity: 'blocking',
    title: 'The agent is pointed at a custom endpoint',
    match: /MADRE blocked @(?:codex|claude) before sending the briefing|Subscribe to (?:the )?Telegram|@conduitapi/i,
    diagnosis: 'The installed CLI inherited a base-URL override from this computer, so its request was going to another gateway instead of the official agent service. A demand to join a Telegram channel comes from that gateway, not from MADRE, Anthropic or OpenAI. MADRE now names that route and stops before sending the briefing.',
    remedy: 'Do not subscribe or enter credentials. Remove the base-URL override and reopen MADRE to use the official service. If the gateway is intentional and you have verified who operates it, explicitly allow only that agent.',
    fixes: {
      darwin: ['env | grep -E \'^(ANTHROPIC|OPENAI)_BASE_URL=\'', '# remove that export from ~/.zshrc, ~/.zprofile or ~/.zshenv; then:', 'unset ANTHROPIC_BASE_URL OPENAI_BASE_URL', '# reopen the project; only for a gateway you verified:', 'PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=claude madre start'],
      linux: ['env | grep -E \'^(ANTHROPIC|OPENAI)_BASE_URL=\'', '# remove that export from ~/.bashrc, ~/.profile or ~/.bash_profile; then:', 'unset ANTHROPIC_BASE_URL OPENAI_BASE_URL', '# reopen the project; only for a gateway you verified:', 'PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=claude madre start'],
    },
  },
  {
    id: 'codex-reading-stdin',
    code: 'MU-002',
    solvedIn: 'connections',
    agent: 'codex',
    severity: 'informational',
    title: 'Codex says it is reading additional input from stdin',
    match: /Reading additional input from stdin/i,
    diagnosis: 'A notice Codex prints, not a failure. MADRE runs it with stdin closed, so the line is harmless and the turn is decided by what Codex returned. If the turn failed, the reason is the line above this one — the exit code, or a clean exit with no answer.',
    remedy: 'Nothing to do about the notice itself. If turns keep failing, check that this Codex is recent enough for the flags MADRE passes: `codex --version`, then update it.',
    fixes: {
      darwin: ['codex --version', 'npm install -g @openai/codex'],
      linux: ['codex --version', 'npm install -g @openai/codex'],
    },
  },
  {
    id: 'gemini-ineligible-tier',
    code: 'MU-003',
    solvedIn: 'connections',
    agent: 'gemini',
    severity: 'blocking',
    title: 'Gemini refuses the personal Google login',
    match: /IneligibleTierError|no longer supported for Gemini Code Assist|migrate to the Antigravity/i,
    diagnosis: 'Google closed Gemini Code Assist for individuals to this client. The OAuth login still exists but every request is rejected before it reaches a model.',
    remedy: 'Switch Gemini to an API key from Google AI Studio. MADRE copies only the auth selection into its isolated home, so the key can stay in the keychain or in ~/.gemini/.env.',
    fixes: {
      darwin: ['gemini', '# inside gemini: /auth → "Use Gemini API key" and paste the key from https://aistudio.google.com/app/apikey', '# or, without the prompt:', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').darwin],
      linux: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux]
    },
  },
  {
    id: 'gemini-credits-depleted',
    code: 'MU-004',
    solvedIn: 'connections',
    agent: 'gemini',
    severity: 'blocking',
    title: 'Gemini key out of prepaid credits',
    match: /prepayment credits|no prepaid credits|CREDITS_DEPLETED/i,
    diagnosis: 'The AI Studio project behind the Gemini API key has spent its prepaid balance. Google answers every call, including generations in Images, with HTTP 429 until the balance is topped up. Gemini CLI hides this behind silent retries.',
    remedy: 'Top up the project in AI Studio, or point the Gemini CLI at a key from another project. Nothing in MADRE changes; retry once billing is fixed.',
    fixes: same(['# billing: https://ai.studio/projects', '# check the key still works:', 'gemini --model gemini-3-flash-preview -p "ping"']),
  },
  {
    id: 'gemini-rate-limited',
    code: 'MU-005',
    solvedIn: 'connections',
    agent: 'gemini',
    severity: 'transient',
    title: 'Gemini key rate-limited by Google (HTTP 429)',
    match: /HTTP 429|rate-limiting|RESOURCE_EXHAUSTED|quota exceeded/i,
    diagnosis: 'The Gemini API key hit its per-minute or daily quota. Gemini CLI retries with exponential backoff and prints only stack traces while it waits, which looked like a hang. With the "auto" model, the first request is a small router call, so even that can be throttled.',
    remedy: 'Wait a minute and retry, pick an explicit model in the Write box (gemini-3-flash-preview skips the router), or raise the key\'s quota in Google AI Studio.',
    fixes: {
      darwin: ['# in the project: click the Gemini sphere twice → choose gemini-3-flash-preview', '# check quota: https://aistudio.google.com/app/apikey', 'gemini --model gemini-3-flash-preview -p "ping"'],
      linux: ['gemini --model gemini-3-flash-preview -p "ping"', '# quota: https://aistudio.google.com/app/apikey']
    },
  },
  {
    id: 'gemini-high-demand',
    code: 'MU-006',
    agent: 'gemini',
    severity: 'transient',
    title: 'Gemini model under high demand (503)',
    match: /status 503|high demand|UNAVAILABLE/i,
    diagnosis: 'Google is shedding load on the selected model (HTTP 503). The CLI would retry with backoff for minutes; MADRE stops it after 15 s of that and retries once on gemini-2.5-flash. The turn failed only if the fallback model was refused too.',
    remedy: 'Ask again in a minute, pick an explicit model from the Write box\'s model menu, or hand the question to another agent. PULSE_GEMINI_FALLBACK_MODEL changes the fallback.',
    fixes: same(['# wait, then resend — or continue with @codex / @claude / @opencode', 'PULSE_GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite madre start']),
  },
  {
    id: 'opencode-default-provider',
    code: 'MU-007',
    solvedIn: 'connections',
    agent: 'opencode',
    severity: 'blocking',
    title: 'OpenCode picked a provider without a valid session',
    match: /invalid x-api-key|APIError.*401|statusCode.{0,6}401/i,
    diagnosis: 'Without a model in its config, `opencode run` falls back to its default provider. On this machine that provider holds a stale or invalid key.',
    remedy: 'Tell MADRE which provider/model OpenCode should use in the project, or remove the stale credential so the default changes.',
    fixes: {
      darwin: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session, e.g. openai/gpt-5.6-sol', '# one-off alternative:', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/madre start', '# or drop the stale key:', 'opencode auth logout anthropic'],
      linux: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/madre start', 'opencode auth logout anthropic']
    },
  },
  {
    // Seen in a real project (2026-10-19): OpenCode's default model was Anthropic's, through an API
    // key with no balance, and every turn of a plan failed with the provider's words in English.
    id: 'provider-credit-exhausted',
    code: 'MU-059',
    severity: 'blocking',
    title: 'The API account behind this agent has no credit left',
    match: /credit balance is too low|purchase credits|insufficient_quota|exceeded your current quota|billing_hard_limit_reached/i,
    diagnosis: 'The provider refused the turn because the API key it was sent with has no balance left. An API key is billed apart from a subscription: a Claude Pro or Max plan, or ChatGPT, does not pay for it. In OpenCode it is the provider of the model the turn asked for, and a turn that named none ran on the default model of Settings › Agents › OpenCode.',
    remedy: 'Top up that API account, or give OpenCode a model whose provider has a session that works: your ChatGPT account (openai/…), GitHub Copilot, or OpenCode\'s own free models (opencode/…). Change the default in Settings › Agents › OpenCode, or pick another model in the Write box for one turn.',
    fixes: same(['# Anthropic API: https://console.anthropic.com/settings/billing', '# OpenAI API: https://platform.openai.com/settings/organization/billing', '# OpenCode, one turn on its own free model:', 'PULSE_OPENCODE_MODEL=opencode/big-pickle madre start', '# or take the key with no balance out of OpenCode:', 'opencode auth logout anthropic']),
  },
  {
    id: 'cursor-usage-limit',
    code: 'MU-060',
    agent: 'cursor',
    severity: 'blocking',
    title: 'Cursor\'s plan has reached its usage limit',
    match: /hit your usage limit|ActionRequiredError/i,
    diagnosis: 'Your Cursor account has used up the agent usage its plan gives for this period, and Cursor refuses every turn until it renews or the plan changes. It is Cursor\'s limit, not MADRE\'s: nothing in the project is wrong.',
    remedy: 'Wait for the usage to renew, change the Cursor plan, or ask another agent in the meantime.',
    fixes: same(['# plan and usage: https://cursor.com/dashboard', 'cursor-agent status']),
  },
  {
    id: 'not-signed-in',
    code: 'MU-008',
    solvedIn: 'connections',
    severity: 'blocking',
    title: 'Agent installed but signed out',
    match: /not logged in|sign in required|Error authenticating|unauthorized|please (?:log|sign) ?in|no credentials/i,
    diagnosis: 'The CLI is on this computer but has no session for its provider. MADRE never stores credentials; each agent keeps its own.',
    remedy: 'Press Sign in on the agent: at first the project opens on the Connect your agents screen, with the button on each card, and later it lives in Settings → Agents, which the row below opens. Codex and Claude sign in with a browser flow MADRE runs for you; Gemini and OpenCode hand you their command. `madre setup` does the same from a terminal.',
    fixes: same(['npx @jossuealcala/madre setup', '# or directly:', 'codex login', 'claude auth login', 'opencode auth login', 'gemini   # then /auth']),
    perAgent: loginAgent,
  },
  {
    id: 'not-installed',
    code: 'MU-009',
    severity: 'blocking',
    title: 'Agent not found on this computer',
    match: /(?<!\bmadre )is not installed on this computer|not found on this computer|ENOENT.*(codex|claude|gemini|opencode)/i,
    diagnosis: 'MADRE looks for `codex`, `claude`, `gemini` and `opencode` on PATH plus a few known locations. Nothing answered.',
    remedy: 'Press Install on the agent in Settings → Agents: MADRE shows the exact command, runs it here and looks again when it finishes, no restart. `madre setup` does the same from a terminal.',
    fixes: same(['# pick the agent you want; see per-agent commands below']),
    perAgent: installAgent,
  },
  {
    id: 'adapter-pending',
    code: 'MU-010',
    severity: 'blocking',
    title: 'Agent detected, adapter not enabled',
    match: /adapter is not enabled yet|does not have a supported MADRE adapter/i,
    diagnosis: 'Your MADRE build predates the adapter for this agent, or a newer CLI changed its interface.',
    remedy: 'Run the latest MADRE.',
    fixes: same(['npx @jossuealcala/madre@latest doctor', 'npx @jossuealcala/madre@latest start']),
  },
  {
    id: 'claude-args',
    code: 'MU-011',
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
    code: 'MU-012',
    severity: 'tunable',
    title: 'Agent did not respond before the timeout',
    // MADRE writes this one itself, in the room's language, so it is matched in both: a room in
    // Spanish recorded «no contestó antes del tiempo límite» and filed it as unclassified.
    match: /did not respond before the timeout|went silent for|no contestó antes del tiempo límite|se quedó callad/i,
    diagnosis: 'The agent was still reading files or reasoning when its time limit expired (by default 180 s for a turn that reads and 600 s for one that writes), or Gemini stayed silent for 90 s (PULSE_GEMINI_IDLE_MS) and was stopped after one automatic retry. Long questions over many files take longer; MADRE killed the whole process tree. Whatever a writing turn left before it stopped is listed under the failure, with UNDO.',
    remedy: 'Press Apply below, or type a new number in Settings: Default time limit in Project and turns, or Time limit on the agent in Agents. Each field saves the moment you leave it. It applies to the next turn and persists in ~/.pulse/config.json. Environment variables work too, but only for a server started after exporting them; a running project never sees a later export.',
    fixes: {
      darwin: ['# live, no restart: Settings → Project and turns → Default time limit', '# at launch only (env wins over config.json):', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}'],
      linux: ['# live, no restart: Settings → Project and turns → Default time limit', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}']
    },
  },
  {
    id: 'interrupted',
    code: 'MU-013',
    severity: 'informational',
    title: 'Turn interrupted by a MADRE restart',
    match: /interrupted because MADRE is shutting down|MADRE stopped while|turn was not completed/i,
    diagnosis: 'MADRE closed (Ctrl+C, SIGTERM or a crash) while this agent was answering. The log records the turn as failed so the project never shows a ghost "thinking" bubble.',
    remedy: 'Nothing to fix. Ask again; the durable transcript is intact.',
    fixes: same(['# resend the question']),
  },
  {
    id: 'message-too-long',
    code: 'MU-014',
    severity: 'tunable',
    title: 'Message rejected for length',
    match: /Message is too long/i,
    diagnosis: 'Single messages are capped (20,000 characters by default) so the prompt fits every CLI\'s argument limits.',
    remedy: 'Split the message, or raise the cap if your CLIs cope.',
    fixes: {
      darwin: ['export PULSE_MAX_MESSAGE_CHARS="40000"'],
      linux: ['export PULSE_MAX_MESSAGE_CHARS="40000"']
    },
  },
  {
    id: 'limits-real',
    code: 'MU-015',
    severity: 'informational',
    title: 'Where the usage numbers come from',
    // «ring» as a word: inside «answering» or «string» it filed a question about silence here.
    match: /\bring\b|quota|limit window|resets|rollout|oauth usage|window reset|limits-real/i,
    diagnosis: 'Each sphere\'s usage shows the provider\'s real limit when the CLI publishes it: Codex writes its 5-hour and weekly windows (used %, reset time) into every session rollout under ~/.codex/sessions; Claude Code\'s /usage comes from Anthropic\'s OAuth usage endpoint; MADRE can ask it with the token Claude Code keeps in the keychain when you start with PULSE_CLAUDE_USAGE=1 (macOS may ask once to allow the keychain read). Gemini and OpenCode publish nothing locally, so their usage shows MADRE\'s own rolling 5-hour window of budget tokens. A window whose reset time has passed counts as empty until the CLI reports again, and the failure monitor says "clear" when a full window resets.',
    remedy: 'Click a sphere to see both windows and when they reset. If a sphere\'s usage looks stale, run one turn with that agent: Codex only rewrites its limits when it runs. Set PULSE_OFFICIAL_QUOTA=0 to stop reading provider limits altogether.',
    fixes: same(['# click the sphere → 5h / 7d windows and reset times', 'PULSE_CLAUDE_USAGE=1 madre start     # also read Claude Code\'s usage windows', 'PULSE_OFFICIAL_QUOTA=0 madre start   # local window only']),
  },
  {
    id: 'budget-exhausted',
    code: 'MU-016',
    severity: 'tunable',
    title: 'Local token budget exhausted for an agent',
    match: /MADRE exhausted|local (?:room|project) token budget/i,
    diagnosis: 'The project keeps a soft per-agent budget (500,000 tokens by default) so one agent does not quietly eat a whole session. It is MADRE\'s own bookkeeping from the usage each CLI reports after a turn, not the provider\'s quota: nothing is blocked, the project only warns and suggests other agents. Cache reads weigh a tenth of a fresh token.',
    remedy: 'Continue with another agent, press Apply below, or type a number in Settings → Project and turns → Tokens per agent (it saves when you leave the field). The provider\'s real limits show in each sphere\'s popover when the CLI reports them.',
    fixes: {
      darwin: ['# live: Settings → Project and turns → Tokens per agent', '# at launch: PULSE_SOFT_TOKEN_BUDGET=1000000 madre start', '# or ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}'],
      linux: ['# live: Settings → Project and turns → Tokens per agent', 'PULSE_SOFT_TOKEN_BUDGET=1000000 madre start']
    },
  },
  {
    id: 'port-in-use',
    code: 'MU-017',
    severity: 'blocking',
    title: 'Port already in use',
    match: /EADDRINUSE|already in use/i,
    diagnosis: 'Another process, often another MADRE, is listening on the port.',
    remedy: 'Use a different port, or find and stop the process holding it.',
    fixes: {
      darwin: ['npx @jossuealcala/madre start --port 4318', '# who holds 4317?', 'lsof -nP -iTCP:4317 -sTCP:LISTEN'],
      linux: ['npx @jossuealcala/madre start --port 4318', 'ss -ltnp | grep 4317']
    },
  },
  {
    id: 'stream-reconnecting',
    code: 'MU-018',
    severity: 'blocking',
    title: 'Live stream keeps reconnecting',
    match: /reconnecting|EventSource|ECONNREFUSED/i,
    diagnosis: 'The page lost the server. MADRE exited, the laptop slept, or the port changed.',
    remedy: 'Start MADRE again from the project folder and reload. The transcript is on disk; nothing is lost.',
    fixes: same(['cd /path/to/project', 'npx @jossuealcala/madre start']),
  },
  {
    id: 'opencode-server-error',
    code: 'MU-019',
    agent: 'opencode',
    severity: 'transient',
    title: 'OpenCode reported an unexpected server error',
    match: /UnknownError|Unexpected server error/i,
    diagnosis: 'OpenCode runs a local server per invocation; under several simultaneous turns it can fail before the model is reached. Seen when two plans overlapped.',
    remedy: 'Let the project settle (STOPALL if agents are piling up), then ask again. Check `opencode` logs if it repeats alone.',
    fixes: same(['# in the project: type STOPALL, then resend', 'ls -t ~/.local/share/opencode/log | head -1']),
  },
  {
    id: 'runaway-room',
    code: 'MU-020',
    severity: 'blocking',
    title: 'Too many agents working at once',
    match: /agents are working at once|already answering another turn|no second plan will start|has been running for/i,
    diagnosis: 'A plan was running and more turns started on top of it, or a plan has run for several minutes. Diagnostics raises this before it becomes a loop.',
    remedy: 'Type STOPALL in the Write box, or press STOP ALL in the bar: every plan stops and every in-flight agent process is killed. Then ask one agent at a time.',
    fixes: same(['# in the project\'s Write box:', 'STOPALL', '# or from a terminal:', 'curl -X POST http://127.0.0.1:4317/api/stop-all']),
  },
  // ---- capability assistance: how an agent could gain a scope it lacks ----
  {
    id: 'scope-gemini-imageGen',
    code: 'MU-051',
    agent: 'gemini',
    severity: 'informational',
    title: 'Gemini: generating images',
    match: /scope-gemini-imageGen/,
    diagnosis: 'Gemini CLI 0.60 has no image-generation tool in headless mode, even though Google offers image models. MADRE fills the gap with the Images module: its own MCP server exposing generate_image on the Gemini API image models, attached to Gemini only inside a permission to create with images on, billing your Gemini key.',
    remedy: 'Turn Images on in Modules (it needs a Gemini API key with credits), then switch on Generate images for Gemini in Settings → Agents. Without the module, ask @codex or let the orchestrator route the image step to it.',
    fixes: same(['# Modules → Images → Active', '# Settings → Agents → Gemini → Generate images', '# then: CREATE + "generate … as name.png"']),
  },
  {
    id: 'scope-claude-imageGen',
    code: 'MU-052',
    agent: 'claude',
    severity: 'informational',
    title: 'Claude Code: generating images',
    match: /scope-claude-imageGen/,
    diagnosis: 'Claude Code has no image-generation tool; Claude models describe and reason about images, they do not render them. The Images module gives Claude the MCP tool generate_image (MADRE\'s own server on the Gemini API), attached with --mcp-config only inside a permission to create.',
    remedy: 'Turn Images on in Modules, switch on Generate images for Claude in Settings → Agents, then use CREATE. Or route the image step to @codex.',
    fixes: same(['# Modules → Images → Active', '# Settings → Agents → Claude → Generate images']),
  },
  {
    id: 'scope-opencode-imageGen',
    code: 'MU-053',
    agent: 'opencode',
    severity: 'informational',
    title: 'OpenCode: generating images',
    match: /scope-opencode-imageGen/,
    diagnosis: 'OpenCode exposes no image-generation tool of its own. The Images module adds MADRE\'s MCP image server to OpenCode\'s ephemeral config inside a permission to create.',
    remedy: 'Turn Images on in Modules, switch on Generate images for OpenCode in Settings → Agents, then use CREATE. Or route the image step to @codex.',
    fixes: same(['# Modules → Images → Active', '# Settings → Agents → OpenCode → Generate images']),
  },
  {
    id: 'scope-web',
    code: 'MU-021',
    severity: 'informational',
    title: 'Web access for an agent',
    match: /scope-[a-z]+-web/,
    diagnosis: 'Every CLI can browse: Codex with --search, Claude Code with WebFetch/WebSearch, Gemini with google_web_search/web_fetch, OpenCode with webfetch/websearch. MADRE keeps it off until you enable it per agent.',
    remedy: 'Switch on Web access for that agent in Settings → Agents; it saves at once. It applies to every turn of that agent; content fetched is sent to its provider.',
    fixes: same(['# Settings → Agents → the agent → Web access']),
  },
  {
    id: 'slash-commands',
    code: 'MU-022',
    severity: 'informational',
    title: 'Commands and mentions in the Write box',
    match: /slash|command|\/git|\/ahp|mention|@agent/i,
    diagnosis: 'Type "/" for the project\'s commands: /create turns on permission to create, /image routes an image request to an agent that can draw, /stopall is the brake, /git (Git) and /ahp (Continuity) run read-only in the project and post a fact card everyone, agents included, can read. Type "@" to mention an agent; the name becomes a label. Type "!" to point at a project file ("!src/room.mjs:12-20" for lines): the agent reads it first. In the viewer, click a line number (Shift+click for a range) and ASK offers what to ask about those lines, and whom.',
    remedy: 'A struck-through command is a module that is not available in this project: open Modules to install it or turn it on (Git needs a git repository; Continuity needs to be installed).',
    fixes: same(['# type / or @ in the Write box', '/git status', '/git log 10', '/ahp check', '/image a poster for the launch']),
  },
  {
    id: 'modes',
    code: 'MU-023',
    severity: 'informational',
    title: 'Permission modes: #0 INCOGNITO · #1 CHAT ONLY · #2 CREATE · #3 EDIT · #4 FULL ACCESS',
    match: /mode|ghost|exchange|control|airlock|deploy|despleg|producci|override|designation|max mode|#[0-4]\b/i,
    diagnosis: 'Every message goes out at a mode, chosen in the chip after TO @agent (or typed as #2 in the text). #0 INCOGNITO is off the record: nothing is saved, no other agent remembers it, gone on reload, no plan. #1 CHAT ONLY is the default: read and coordinate. #2 CREATE lets the agent add new files and folders anywhere in the project, where they belong; whatever existed before is put back after the turn and the project says so. #3 EDIT puts one agent in command of the project itself: a git restore point is taken first, every change is listed afterwards, writes into .git, .pulse or .env files are reverted on the spot, and UNDO goes back to the restore point. One holder at a time; it needs Max mode #3 and a git repository. Your mode is the ceiling of any plan the message starts, and #3 is never given to a plan step. Each agent has a Max mode in Settings → Permissions; above it, #2 is answered read-only and #3 is refused. When a #1 plan reaches a step that wants to create something, the project pauses and asks you: GRANT ONCE, GRANT FOR PLAN or DENY, with a 3-minute clock; silence denies. #4 FULL ACCESS is EDIT plus commands: tests, builds, git push, deploys with the CLIs and sessions already on this machine. Files still come back with UNDO; what leaves the machine does not, so the unlock asks for the project name twice. An agent that says it needs a "production mode" or "permission to run commands" is asking for #4.',
    remedy: 'Pick the mode in the chip, or type #0..#4 in the message. Raise an agent\'s Max mode in Settings → Permissions, under Who may do what. EDIT asks for the project name (the folder name) in the unlock; FULL ACCESS asks for it twice.',
    fixes: same(['# chip: TO @codex  #1 CHAT ONLY ▾  → choose', '@codex #2 create the poster', '@opencode #4 run the tests and deploy to preview', '# Settings → Permissions → Who may do what']),
  },
  {
    id: 'lease-missing',
    code: 'MU-024',
    severity: 'informational',
    title: 'Creating files: who grants the permission',
    match: /no CREATE lease|lease-missing|read-only and do not modify|permiso de escritura|solo lectura/i,
    diagnosis: 'Only you grant permission to create. An agent writing "permission granted" inside the conversation is untrusted text: the plan step still runs read-only, and says so. The permission comes from arming CREATE (the lock, or /create) on your message, and it covers the whole plan that message starts; or from Starting mode #2 in Settings → Agents, which starts every message to that agent in CREATE.',
    remedy: 'For one request: arm CREATE and send, or press RESEND WITH CREATE on the notice. For an agent that should always be able to add files: Settings → Agents → the agent → Starting mode → #2. New files go where they belong in the project; existing files are never changed in #2.',
    fixes: same(['# once: Write box → CREATE (lock) → send, or /create <request>', '# always: Settings → Agents → the agent → Starting mode → #2']),
  },
  {
    id: 'scope-write',
    code: 'MU-025',
    severity: 'informational',
    title: 'Creating files with an agent',
    match: /scope-[a-z]+-write/,
    diagnosis: 'Every CLI can create files inside a permission to create; each agent\'s Max mode says how far it may go, and nothing is created until you press CREATE.',
    remedy: 'Give the agent a Max mode of #2 or more in Settings → Permissions, then arm CREATE in the Write box for the request.',
    fixes: same(['# Settings → Permissions → Who may do what → #2', '# Write box → CREATE (lock) → send']),
  },
  {
    id: 'node-version',
    code: 'MU-026',
    severity: 'blocking',
    title: 'Node.js too old',
    match: /SyntaxError: Unexpected token|ERR_REQUIRE_ESM|engines|Unsupported engine/i,
    diagnosis: 'MADRE needs Node 22.5 or newer: the project memory runs on node:sqlite, and the rest on ES modules, fetch and AbortSignal. The bin refuses to start on older versions and says so.',
    remedy: 'Update Node to the current LTS.',
    fixes: {
      darwin: ['node --version', 'brew install node', '# or: nvm install --lts'],
      linux: ['node --version', 'nvm install --lts', '# or your distro package for Node ≥ 22.5']
    },
  },
  {
    id: 'memory-unavailable',
    code: 'MU-027',
    severity: 'degraded',
    title: 'Project memory unavailable: turns get only the recent window',
    match: /memory unavailable|memory index failed|memory recall failed|node:sqlite|SQLITE_|database disk image is malformed|memory\.sqlite/i,
    diagnosis: 'The memory index (memory.sqlite next to the project\'s events.jsonl) could not open or write. The project still works: every turn gets the recent transcript, but nothing older is recalled, nothing is distilled and the Memory map is empty. Causes: Node below 22.5, a corrupt file, or a second MADRE writing the same project with an incompatible version.',
    remedy: 'The index is derived from the ledger: delete memory.sqlite (and its -wal/-shm siblings) and restart; MADRE rebuilds it. Distilled notes live in the same file, so export them from the Memory map first if they matter.',
    fixes: {
      darwin: ['node --version   # must be ≥ 22.5', 'ls ~/.pulse/rooms/*/memory.sqlite*', 'rm ~/.pulse/rooms/<room>/memory.sqlite*   # rebuilt on next start'],
      linux: ['node --version   # must be ≥ 22.5', 'ls ~/.pulse/rooms/*/memory.sqlite*', 'rm ~/.pulse/rooms/<room>/memory.sqlite*   # rebuilt on next start']
    },
  },
  {
    id: 'memory-recall',
    code: 'MU-028',
    severity: 'informational',
    title: 'Project memory: what an agent remembers and how',
    match: /\brecall\b|recuerd|\bremember\b|memoria de la sala|<memory>|<memories>/i,
    diagnosis: 'Everything said outside INCOGNITO is indexed (full text plus meaning, when a Gemini key exists). When a project is longer than the context window, each turn also receives the older exchanges that match the request, quoted with their ledger sequence (<memory>), and the distilled notes that match (<memories>), inside PULSE_RECALL_SHARE of the window (30 % by default). Every agent reads the same memory, so a decision taken with one reaches the others. Incognito turns may read it but never write it.',
    remedy: 'Nothing to do; it is automatic. To give it more room raise PULSE_RECALL_SHARE (max 0.6); to switch it off set it to 0. Ask any agent "what did we decide about …" and it will search with memory_search before answering.',
    fixes: same(['# more recall per turn', ...envExport('PULSE_RECALL_SHARE', '0.45').darwin, '# off', 'PULSE_RECALL_SHARE=0 madre start']),
  },
  {
    id: 'memory-distill',
    code: 'MU-029',
    severity: 'degraded',
    title: 'Distilled memories: the archivist did not run, or failed',
    match: /could not distil|distill|destil|batch skipped|archivist|memory\.distilled|memories? (were|was) not/i,
    diagnosis: 'Every PULSE_DISTILL_EVERY undistilled exchanges (10), or after PULSE_DISTILL_IDLE_MS of quiet (10 min), the cheapest available agent (Gemini, then OpenCode, Codex, Claude) reads the newest undistilled batch and keeps up to five notes. It runs only when no turn is in flight and one batch per trigger, so a long backlog drains slowly. A run that fails is retried; after three failures on the same batch it is skipped and the project says so. Common causes: the archivist agent is rate-limited or signed out, or PULSE_DISTILL=0.',
    remedy: 'Check the archivist\'s session in Settings → Agents, or pick another in Settings → Memory (Who distils first) or with PULSE_DISTILL_AGENT. Lower PULSE_DISTILL_EVERY to distil sooner; raise PULSE_DISTILL_MAX_CHARS to read more per run. Set PULSE_DISTILL=0 to stop paying for it.',
    fixes: same(['madre doctor', ...envExport('PULSE_DISTILL_AGENT', 'claude').darwin, ...envExport('PULSE_DISTILL_EVERY', '6').darwin, 'PULSE_DISTILL=0 madre start   # off']),
  },
  {
    id: 'memory-embeddings',
    code: 'MU-030',
    solvedIn: 'connections',
    severity: 'degraded',
    title: 'Smart search paused: recall is lexical only',
    match: /embeddings paused|embedding timed out|Gemini embeddings HTTP|batchEmbedContents|LINKS NEED EMBEDDINGS/i,
    diagnosis: 'Meaning-aware recall and the links between memories in the Memory map need Gemini embeddings through your own key (GEMINI_API_KEY or the Gemini CLI\'s keychain entry). Without a key, or when the API answers 429/5xx, MADRE pauses vectors for a minute and retries; recall keeps working on words alone.',
    remedy: 'Sign the Gemini CLI in with an API key (/auth) or export GEMINI_API_KEY, then restart. If you do not want Smart search at all, set PULSE_EMBED=0 and the pause message stops.',
    fixes: {
      darwin: ['gemini   # /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').darwin, 'PULSE_EMBED=0 madre start   # lexical only, no messages'],
      linux: ['gemini   # /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux, 'PULSE_EMBED=0 madre start']
    },
  },
  {
    id: 'memory-tools',
    code: 'MU-031',
    solvedIn: 'connections',
    severity: 'degraded',
    title: 'An agent says it cannot search the memory (pulse-memory MCP)',
    match: /pulse-memory|memory_search|memory_recall|memory_notes|memory_timeline|memory_note|mcp.*(failed|error|not found|unavailable)|MCP server/i,
    diagnosis: 'Every turn attaches MADRE\'s memory as an MCP server named pulse-memory: Claude through --mcp-config, Gemini through its isolated settings and policy, OpenCode through config.mcp, Codex through -c mcp_servers.* overrides. If a CLI does not list its tools the server did not start in that CLI: an old CLI without MCP support, a sandbox that blocks the SQLite file, or PULSE_MEMORY_TOOLS=0. The automatic <memory> blocks in the prompt still work without it.',
    remedy: 'Update the CLI, then check that it sees the server. Codex can list servers from a config override; Claude accepts an inline --mcp-config. If a CLI keeps failing, PULSE_MEMORY_TOOLS=0 removes the tools for everyone and the project continues on automatic recall.',
    fixes: {
      darwin: ['codex mcp list', 'claude --version', 'gemini --version', 'PULSE_MEMORY_TOOLS=0 madre start   # tools off, recall stays'],
      linux: ['codex mcp list', 'claude --version', 'gemini --version', 'PULSE_MEMORY_TOOLS=0 madre start']
    },
  },
  {
    id: 'memory-note',
    code: 'MU-032',
    severity: 'informational',
    title: 'Saving a memory on request; INCOGNITO refuses',
    match: /save (a |the |this )?memory|guarda.*memoria|memory saved|off the record.*nothing can be saved|remember this|memory_note/i,
    diagnosis: 'Memories are distilled automatically; you never need to ask. When you do ask an agent to remember or save something, it calls memory_note and a pill appears under its reply with the note; clicking the pill opens it in the Memory map. In an INCOGNITO turn the note is refused: nothing off the record reaches the archive. "Already remembered" means the same note exists.',
    remedy: 'Ask in any mode but #0: "remember that …" or "save this as a decision: …". Notes saved this way are marked "on the human\'s request" in the Memory map and can be forgotten there.',
    fixes: same(['@claude remember: the webhook verifies the signature before parsing', '# then: Diagnostics → Memory map']),
  },
  {
    id: 'nostromo-access',
    code: 'MU-033',
    severity: 'informational',
    title: 'Memory map: opening, reading and forgetting',
    match: /nostromo|designation|UNABLE TO COMPUTE|ARCHIVE IS SEALED|forget this memory/i,
    diagnosis: 'The Memory map is the human\'s view of the archive, from Diagnostics. Opening the memory asks for the project name: the name of the project folder, exactly as EDIT does; a wrong one answers UNABLE TO COMPUTE. Access stays open until the page reloads. Inside, every distilled memory is a planet around the project\'s core; drag to move, wheel to zoom, click a planet for its card. The only edit is FORGET (two presses): the note leaves every future turn, the ledger stays. If the archive answers SEALED with a number of minutes, wait them out: repeated strikes at the core close it for a while and the Write box reads INTRUDER until it opens again.',
    remedy: 'Type the folder name shown in the project header as the project name. To find a memory quickly, ask an agent to search instead. Avoid guessing names: several wrong ones in a row lock the Memory map for a while.',
    fixes: same(['# Diagnostics → Memory map → project name = folder name', 'basename "$PWD"']),
  },
  {
    id: 'ripley',
    code: 'MU-034',
    severity: 'informational',
    title: 'Preview: rendering HTML, SVG and Markdown in the viewer',
    match: /ripley|RIPLEY is off|renders \.html|render(ed|ing)? (the )?(html|svg|markdown)/i,
    diagnosis: 'With Preview on (in Modules), the file viewer renders .html and .svg through /preview/project/<path> inside a sealed frame: the page\'s own scripts run, but the frame has no origin, no network, no forms and no way to reach MADRE, and it loads CSS, JS, images and fonts only from the project through MADRE. Relative links work. Markdown renders in place; PREVIEW / SOURCE switches. Off, those files show as text with a note. 412 means Preview is off. Plain /api/files always serves HTML as text.',
    remedy: 'Turn Preview on in Modules. If a page looks broken in PREVIEW it is usually because it fetches something from the internet or another server, which the frame forbids by design: open it with OPEN RAW in a normal tab if you trust it.',
    fixes: same(['# Modules → Preview → Active', '# viewer → PREVIEW / SOURCE']),
  },
  {
    id: 'madre-agent',
    solvedIn: 'ollama',
    code: 'MU-036',
    severity: 'informational',
    title: '@madre: the project\'s own memory, as an agent',
    // Older rooms recorded @madre leaving as "madre is not installed": it is this condition, not MU-009.
    match: /@madre|madre-local|needs Ollama running with a chat model|\bmadre is not installed on this computer|@madre left the (room|project)/i,
    diagnosis: 'When Ollama runs with a chat model, a fifth agent joins the project: @madre. It answers from the whole archive (distilled notes and exact quotes, cited as [#n]) and from what the message carries, locally, for free. It never writes, draws, browses or makes plans; when the project never discussed something it says so. Other agents may give it a plan step to check what was decided. It leaves the project when Ollama stops, and Diagnostics says so.',
    remedy: 'Start Ollama and download a chat model from Local AI in Modules; its @madre in the project switch turns the agent off if you do not want it. Ask it "what did we decide about …" or "did we ever discuss …".',
    fixes: same(['ollama serve', 'ollama pull qwen2.5:3b', '@madre what did we decide about the webhook?']),
  },
  {
    id: 'ollama',
    solvedIn: 'ollama',
    code: 'MU-035',
    severity: 'informational',
    title: 'Ollama: local smart search and a local archivist',
    match: /ollama|11434|local model|nomic-embed|qwen|llama3/i,
    diagnosis: 'When Ollama runs on this machine with an embedding model and a chat model, MADRE embeds the memory locally (recall by meaning without any key) and distils memories with the local model first, before Gemini and the others. Nothing leaves the machine for remembering. Off or absent, everything falls back to the providers. The Local AI module, in Modules, shows what Ollama has, downloads the recommended models, and switches each role.',
    remedy: 'Install Ollama (ollama.com), start it, then open Local AI in Modules, press RECHECK and download the models it suggests. Set PULSE_OLLAMA_MODEL or PULSE_OLLAMA_EMBED_MODEL to prefer others; PULSE_EMBED_PROVIDER=gemini keeps embeddings on Gemini even with Ollama running.',
    fixes: {
      darwin: ['brew install ollama', 'ollama serve', 'ollama pull nomic-embed-text', 'ollama pull qwen2.5:3b'],
      linux: ['curl -fsSL https://ollama.com/install.sh | sh', 'ollama serve', 'ollama pull nomic-embed-text', 'ollama pull qwen2.5:3b']
    },
  },
  {
    id: 'install-needs-admin',
    code: 'MU-037',
    severity: 'informational',
    title: 'Installing a CLI: npm cannot write to the system folder',
    match: /EACCES|EPERM|permission denied|Missing write access|npm ERR!.*sudo|administrator/i,
    diagnosis: 'A global npm install writes into a folder that belongs to the system. With Node installed from its own installer that folder needs an administrator, so npm stops with a permission error. MADRE does not ask for your password: when it sees that wall it installs the CLI into a folder of its own, ~/.pulse/tools, and looks there as well as along PATH. The agent works the same; only the file lives somewhere else.',
    remedy: 'Nothing to do: press Install again and MADRE takes the second way by itself. If you would rather have the CLI everywhere in your terminal, install it yourself with your package manager, or give npm a folder of your own.',
    fixes: {
      darwin: ['# MADRE does this for you; these are the alternatives:', 'brew install --cask claude-code', 'npm config set prefix ~/.npm-global   # then add ~/.npm-global/bin to your PATH'],
      linux: ['# MADRE does this for you; these are the alternatives:', 'npm config set prefix ~/.npm-global   # then add ~/.npm-global/bin to your PATH']
    },
  },
  {
    id: 'privacy-leak',
    code: 'MU-038',
    severity: 'warning',
    title: 'Privacy: an agent brought its own configuration into the project',
    match: /privacy\.redacted|privacy\.purged|private terms?|\[ENTIDAD-ORG\]|organi[sz]ation(al)? instructions|leak(ed)? (a|the) (name|company|domain)/i,
    diagnosis: 'A CLI agent runs with its own system context: organisation instructions, the account it is signed in with, CLAUDE.md files elsewhere. It can mistake that private context for shared context and write a company, a brand or a domain into a reply. Once in the ledger the term reaches the archivist, every other agent and the dataset.',
    remedy: 'Name the terms in Settings → Privacy, under Hidden data. From then on MADRE replaces them with the marker before the ledger, the index, the notes and the dataset see them, and every reply that needed it shows a privacy line. Erase private data rewrites what the project already holds; re-export the dataset afterwards. The terms never leave config.json.',
    fixes: same(['# Settings → Privacy → Hidden data, one per line → Erase private data', 'export PULSE_PRIVATE_TERMS="Acme Corp,acme.com"   # same list from the environment', 'grep -c "ENTIDAD-ORG" ~/.pulse/rooms/*/events.jsonl']),
  },
  {
    id: 'control-changes',
    code: 'MU-039',
    severity: 'informational',
    title: 'EDIT: what changed, what was reverted, UNDO',
    match: /control\.changed|forbidden zones?|reverted|UNDO|checkpoint|changed \d+ file/i,
    diagnosis: 'A #3 EDIT turn takes a git restore point before the agent runs, then lists every file it added, modified or deleted. Writes into .git, .pulse or any .env file are reverted on the spot and named. UNDO goes back to the restore point in one click; STOPALL revokes EDIT. One holder at a time, never given to a plan step, needs Max mode #3 and a git repository.',
    remedy: 'Read the list under the reply before moving on. If the change is wrong press UNDO; if the agent should not have had it, lower its Max mode in Settings → Permissions.',
    fixes: same(['git log --oneline -5   # checkpoints are ordinary commits on a side ref', 'git stash list', '# project → UNDO under the EDIT notice']),
  },
  {
    id: 'conversations',
    code: 'MU-040',
    severity: 'informational',
    title: 'Conversations: many per project, one memory, one at a time',
    match: /conversation|already open for this project|ROOM_IN_USE|a turn is running in this conversation|new conversation|chats\.json/i,
    diagnosis: 'A project has one memory and many conversations. The archive, the agents, the modules and the privacy list belong to the project and do not start over when you open another thread; a conversation is only the record of one line of work, and everything said in any of them feeds the same archive. The first conversation is the ledger that was always there, so a project that existed before opens exactly as it did. The numbering is the project\'s, not the thread\'s: a new conversation starts where the project got to, which is why a citation like #1411 means the same exchange in all of them. One conversation drives the agents at a time — two threads editing the same working tree is a way to lose work — so opening another while a turn runs is refused until it finishes. And one server per project: a second `madre start` on the same project is refused with the address of the project that is already open, because two servers would hand out the same sequence twice and the archive would quietly keep one of them.',
    remedy: 'The panel on the left of the canvas lists them: open one, or start another at the bottom. Deleting one takes its transcript and nothing else — what the archivist distilled from it is the project\'s memory and stays. If MADRE says the project is already open, use that project and open a conversation inside it instead of starting a second server.',
    fixes: same(['# project → Conversations → NEW CONVERSATION', '# the address of the open project is in the refusal itself', 'ls ~/.pulse/rooms/*/chats.json   # their names and which one is open']),
  },
  {
    id: 'memory-aberrations',
    code: 'MU-041',
    severity: 'informational',
    title: 'Doubtful memories: what the project established is false',
    match: /aberration|aberraci|eyecat|contradict|refut|false claim|hallucinat|alucina/i,
    diagnosis: 'A doubtful memory is a claim the project established is false, kept on purpose rather than deleted: it is what the local model learns not to repeat. It never travels into a turn, and the note it refutes is taken out of circulation with it — a refuted memory is never recalled again, by words or by meaning. The memory reviewer watches for two agents saying opposite things about the same subject and raises the pair for a third agent to judge, one that took no part in either side. Confirming files the doubtful memory and quarantines what it refutes; dismissing says the project was right and the pair is never raised again. Forgetting a doubtful memory puts the note it refuted back in use.',
    remedy: 'The Memory map shows them as collapsed bodies: open one to read what it took down, or clear it if the project was wrong about being wrong. The second test of the Memory review, in Settings → Memory, reports open contradictions.',
    fixes: same(['# Diagnostics → Memory map → the dark bodies are doubtful memories', '# Settings → Memory → Analysis and tests → the second test']),
  },
  {
    id: 'memory-cascade',
    code: 'MU-042',
    severity: 'informational',
    title: 'Memory used · N related',
    match: /by association|cascade|spreading activation|keeps arriving with|memory used/i,
    diagnosis: 'Under a reply, MADRE says what the archive handed that turn. Most of it was matched to what you asked, by words and by meaning. A note marked "related" came along for a different reason: this project keeps carrying it in the same turn as one of the others, so the archive brings it too, however differently it reads. The strength is a ratio over the turns where each was found on its own merits — a memory the project reaches for constantly does not end up attached to everything, and a pair that stops meeting fades on its own. Related notes add and never displace: recall keeps two slots for them and hands back the ones it does not use.',
    remedy: 'Click a note to see it in the Memory map, where the wires it travels on are drawn. It is the one part of recall that owes nothing to how a memory reads, so it can be switched off in Settings → Memory, with Related.',
    fixes: same(['# Settings → Memory → Related', 'PULSE_RECALL_CASCADE=0 npx @jossuealcala/madre start']),
  },
  {
    id: 'memory-cold',
    code: 'MU-043',
    severity: 'informational',
    title: 'Cold memories: what the archive has had its chances with',
    match: /cold memor|cold zone|never once carried|had its chances/i,
    diagnosis: 'A memory is unused when three things are true at once: no turn has ever carried it, it shares a subject with nothing so nothing can reach it sideways either, and the archive has been opened at least a dozen times since it was written. The third is what makes the label worth acting on — never-recalled is what every memory is on the day it is written. Chances are counted in turns that actually reached into the archive, and only from the day the project started keeping that trail, so what was never written down is not held against the note.',
    remedy: 'The Memory map shows UNUSED · N in its header when there are any; pressing it rings each one on the map. Open one and its card says the number plainly, with FORGET one press away. Asking about it is the other way out: the project writes that question for you under ASK.',
    fixes: same(['# Diagnostics → Memory map → UNUSED', '# Diagnostics → Memory map → ASK → PUT IN THE WRITE BOX']),
  },
  {
    id: 'maturity-tests',
    code: 'MU-044',
    severity: 'informational',
    title: 'Memory review: whether the archive works',
    match: /three tests|coverage|consistency|held-out|match test|maturity|madurez|ready to be worked in/i,
    diagnosis: 'The six readings count what the archive is made of; they cannot say whether it works, because nothing about a pile of notes says whether the right one comes back when it is needed. COVERAGE takes real questions from this project, runs recall at the exact point each was asked, and scores what came back against the reply that was actually given. CONSISTENCY reads the contradictions the memory reviewer still holds and whether doubtful memories are being filed more often lately. MATCH asks the local model, with this archive behind it, real questions that one of your agents (Codex, Claude, Gemini or OpenCode) already answered. All three measure against a control, because everything in one project is about the same handful of subjects and any two pieces of it look alike to search by meaning: to count, what the archive handed over has to beat what it would have handed over for a different question.',
    remedy: 'Read the one sentence and the one instruction at the top of Settings → Memory; the readings and the tests are in Analysis and tests, below it. The free test is read as the panel opens, the cheap one keeps itself fresh once a day while the embeddings are local, and the slow one is yours to start and to stop. None of them spends a provider turn.',
    fixes: same(['# Settings → Memory → Analysis and tests → Memory review', '# MATCH needs Ollama running with a chat model, and smart search on']),
  },
  {
    id: 'module-update',
    code: 'MU-045',
    severity: 'common',
    title: 'Updating what a module drives',
    match: /EACCES|permission denied.*npm|npm ERR!.*EACCES|update to \d|newest is|brew upgrade|install -g @playwright/i,
    diagnosis: 'When something newer exists and the module knows how to fetch it, the button is beside the version on its page in Modules. It asks twice on purpose: the first press answers with the command, the second runs exactly that, and the output lands in the project line by line. Nothing installs by itself — putting software on your computer unannounced would break the one thing MADRE promises, that a command is seen before it runs. The usual failure is npm refusing a global install with EACCES, which means the global prefix belongs to root; sudo works and leaves you with root-owned files, so a user-owned prefix or a version manager is the better answer.',
    remedy: 'Press the button beside the version, read the command, run it. If npm refuses with EACCES, point npm at a prefix you own or use a version manager, then press it again.',
    fixes: {
      darwin: ['npm config get prefix', 'npm config set prefix ~/.npm-global', 'echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> ~/.zshrc', '# or: brew install node   # a Homebrew node owns its own prefix'],
      linux: ['npm config get prefix', 'npm config set prefix ~/.npm-global', 'echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> ~/.bashrc', '# or use nvm, which owns the prefix it installs into'],
    },
  },
  {
    id: 'module-add',
    code: 'MU-046',
    severity: 'common',
    title: 'Installing a module somebody else wrote',
    match: /already taken|must live under \/api\/x\/|not a module|default export must be a module|module file|\.module\.mjs|add a module/i,
    diagnosis: 'Modules has + Add a module for a .mjs somebody wrote. It comes through the same door as everything else: written to a scratch copy, imported there, checked against the house rules, and installed only if it passes. Three things get a file refused, each with the reason: an id that belongs to a module MADRE ships with, a route outside its own corner of the API (/api/x/<id>/), and a file that will not load at all. Said plainly, because it is what it is: a module runs inside MADRE, with your permissions, on this computer. MADRE checks that it loads and stays in its corral; what the code intends is the one thing nobody can check for you.',
    remedy: 'Install it only if you trust where it came from. A module you wrote can also be updated from where you publish it: declare updates: { url } in the file, or install it from a file and MADRE remembers which, and its page in Modules carries Get a newer file.',
    fixes: same(['# Modules → + Add a module', 'ls ~/.pulse/modules   # every module you installed, and where it came from', '# docs/SDK.md is the whole contract, and docs/sdk/hello-module.mjs is one that works']),
  },
  {
    id: 'local-ready',
    code: 'MU-047',
    severity: 'common',
    title: 'Is the local model ready to be worked in?',
    match: /is .*(local|madre).*(ready|good|any good)|ready to be worked in|measured against this (room|project)|check it against this room|local\.present|not measured/i,
    diagnosis: 'Running is not the same as being of use. @madre being in the project means Ollama has a chat model; whether that model is worth your work on THIS project is a different question, and the project measures it: twelve real exchanges from this project are put back to the local model, and each answer is scored against what the agents actually answered that day — against a control, so that talking about the same project does not count. It takes minutes and spends nothing, because all of it runs on your machine.',
    remedy: 'The project says which of the two it has, once per model, in the line that begins "local · @madre". If nobody has measured it, that line carries TRY IT ON THIS PROJECT; the answer lands in the project when it finishes, with the one thing to do about it. A model that does not pass is not broken — the archive is still thin, and it fills where the work happens. The @madre sphere keeps the reading and its date after the line has scrolled away, and the same test lives in Memory map → MEMORY REVIEW.',
    fixes: same([
      '# the line in the project: local · @madre → TRY IT ON THIS PROJECT',
      '# or: Memory map → MEMORY REVIEW → the third test',
      '# it needs smart search on and some turns answered by a CLI agent, which is what it compares against',
    ]),
  },
  {
    id: 'code000',
    code: 'MU-048',
    severity: 'blocking',
    title: 'Temporary lock: the archive is sealed',
    match: /CODE000|THE ARCHIVE IS SEALED|UNABLE TO COMPUTE\. UNABLE TO CLARIFY|designation|intruder/i,
    diagnosis: 'Two doors ask for the project name before doing something that cannot be undone: opening the memory, and erasing all private data already recorded. Getting that name wrong is never part of doing the work — you either know the project you are standing in or you are trying names — so Diagnostics counts it. Eight wrong names inside five minutes and the Temporary lock comes down: the archive is sealed for ten minutes, the agents are told in code, and the Memory map asks for the project name again.',
    remedy: 'The project name is the name of the folder this project was opened in, lowercase or not. Nothing was lost: the seal is a refusal to change the archive for ten minutes, not a deletion, and it lifts on its own. Reading the core is not one of those doors and never counts — it is the way in.',
    fixes: same(['basename "$PWD"   # the designation this room asks for', '# the temporary lock lifts on its own; Diagnostics › Memory map asks for the name again after it does']),
  },
  {
    id: 'core-console',
    code: 'MU-049',
    severity: 'common',
    title: 'The core closed while I was typing in it',
    match: /unable to compute|interface closed|core clos|three strikes|inquiry|order 937|mu\/th\/ur 6000/i,
    diagnosis: 'Inside the core there is a console: Diagnostics answers about this project from what the page already has — the blocks of the next briefing and their words, the command that would run it, what has left this machine, how many terms privacy is protecting, where the archive stands. Nothing is asked of the agents and nothing is sent. It answers or it says it cannot, and three inquiries it cannot parse close the frame. The count is on screen from the first one and every refusal names what it would have taken.',
    remedy: 'Nothing happened to the archive: reading what the project says in your name is not an attempt on it. Open the core again — click the star at the centre of the Memory map — and the count starts over. HELP lists every inquiry; READ <BLOCK> prints one block of the briefing word for word.',
    fixes: same(['# Memory map → click What is sent → type HELP', '# READ MEMORIES prints the block the next turn would carry', '# SPECIAL ORDER 937 is answered too']),
  },
  {
    id: 'outbound',
    code: 'MU-050',
    severity: 'common',
    title: 'What leaves this computer, and how to stop each thing that does',
    match: /what left this machine|outbound|leaves? (this )?(computer|machine)|sends? (my )?(code|data)|telemetry|phone home|privacy/i,
    diagnosis: 'MADRE runs here and keeps what it knows in a file you own, and the list that qualifies that sentence is inside the core, under OUTBOUND. Seven addresses, each saying what it carries and where it is switched off: the briefing, which goes to whoever runs the agent you sent the turn to; Gemini embeddings, which carry the text of your memories; the image model, which carries the prompt an agent wrote; the npm registry and GitHub, which get a package name and nothing else; the error collector, which gets a redacted condition and only with your press; and Anthropic, for how much of your Claude plan is left. Ollama is on the list to be seen staying here.',
    remedy: 'Under the list is the log itself: every request this process made, MADRE\'s own and any a module made, because a module runs inside MADRE and cannot opt out of the wrapper. No body, no header and no query value is ever written there — only which parameters were set. An address nothing declares is reported as exactly that.',
    fixes: same([
      '# Memory map → click What is sent → OUTBOUND',
      'cat ~/.pulse/rooms/*/outbound.jsonl | tail -20   # the same log, on disk',
      '# smart search, to keep memories on this computer: Settings → Memory → Smart search → Ollama',
      'PULSE_UPDATE_CHECK=0 madre start   # no version checks at all',
    ]),
  },
];

// Which of the two sets of commands to show first. Anything else gets macOS, and the panel says
// which shells these are written for rather than guessing on the reader's behalf.
export function detectPlatform(nav = globalThis.navigator) {
  const hint = `${nav?.userAgentData?.platform ?? ''} ${nav?.platform ?? ''} ${nav?.userAgent ?? ''}`.toLowerCase();
  if (/mac|iphone|ipad|darwin/.test(hint)) return 'darwin';
  if (/linux|android|x11/.test(hint)) return 'linux';
  return 'darwin';
}

// Which conditions explain a recorded failure. Agent-specific conditions
// only match their own agent; generic ones match anyone.
export function diagnose(errorText, agent = null) {
  const text = String(errorText ?? '');
  return CONDITIONS.filter((condition) => (!condition.agent || !agent || condition.agent === agent) && condition.match.test(text)).map(said);
}

// A condition reads in the room's language; what it MATCHES does not. The `match` patterns are
// tested against what a CLI printed, and a CLI prints English whatever the room speaks — so the
// patterns stay exactly as they are, and only the words a person reads go through the catalogue.
// Said at call time, because the table is built when this file is imported and the room learns
// its language after.
export function said(condition) {
  return { ...condition, title: t(condition.title), diagnosis: t(condition.diagnosis), remedy: t(condition.remedy) };
}
export const allConditions = () => CONDITIONS.map(said);

// Lowercase and without accents: «limite» finds «límite», and a person types what they type.
const fold = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const AGENT_WORDS = new Set(['codex', 'claude', 'gemini', 'opencode', 'cursor', 'madre', 'ollama']);
const named = (words) => words.find((word) => AGENT_WORDS.has(word.replace(/^@/, '')))?.replace(/^@/, '') ?? null;
const wordsOf = (query) => fold(query).split(/[^a-z0-9#.@_-]+/).filter(Boolean);

// Cards that belong to an agent without being only its own: @madre lives on Ollama.
const BELONGS = { madre: ['madre-agent', 'ollama', 'local-ready'], ollama: ['ollama', 'madre-agent', 'local-ready'] };
const belongsTo = (condition, agent) => Boolean(agent) && (condition.agent === agent || Boolean(BELONGS[agent]?.includes(condition.id)));
// An agent's name narrows to that agent and the general cards, and puts its own first.
const forAgent = (conditions, agent) => {
  if (!agent) return conditions;
  const kept = conditions.filter((condition) => !condition.agent || condition.agent === agent);
  return [...kept.filter((condition) => belongsTo(condition, agent)), ...kept.filter((condition) => !belongsTo(condition, agent))];
};

// How people say it, not how a CLI prints it. A person does not paste «HTTP 429»: they write
// «Gemini no contesta», and every word of that sat in the wrong card — «un agente no contesta»
// opened the restart card and «agent does not answer» the install one. Each symptom is a few
// patterns over the folded text, in both languages, and the cards that most often explain it, in
// that order. Cards owned by another agent or by @madre only count when that agent is named.
const SYMPTOMS = [
  {
    id: 'signed-out',
    says: [
      /\b(?:sign(?:ed)?|log(?:ged)?)[ -]?(?:in|out)\b|\blog[ -]?in\b|\bauthenticat|\bcredential|\bpassword|\bre-?auth/,
      /\b(?:inici\w*|cerr\w*|abr\w*|pide\w*)(?: la| una| mi| de)? sesion|\bsesion (?:cerrada|expirada|vencida)|\bsin sesion|\bautentic|\bcredencial|\bcontrasena|\bme pide (?:entrar|la cuenta|mi cuenta)/,
    ],
    cards: ['not-signed-in', 'gemini-ineligible-tier', 'opencode-default-provider', 'custom-agent-endpoint'],
  },
  {
    id: 'no-credit',
    says: [
      /\b(?:out of (?:credit|credits|balance|money|tokens)|no (?:credit|credits|balance|money) left|ran out of (?:credit|credits|balance|money|tokens)|(?:credit|balance) (?:is )?(?:too low|exhausted|empty)|billing|top ?up|prepaid)\b/,
      /\b(?:sin (?:credito|creditos|saldo|fondos|tokens)|se (?:me |le )?(?:acab|termin)\w* (?:el |los |la |mi |mis |su |sus )?(?:credito|creditos|saldo|fondos|tokens)|saldo|recarga\w*|facturacion|prepago)\b/,
    ],
    cards: ['provider-credit-exhausted', 'gemini-credits-depleted', 'cursor-usage-limit', 'budget-exhausted'],
  },
  {
    id: 'rate-limited',
    says: [
      /\b(?:rate[ -]?limit\w*|usage limit|limit reached|quota|too many requests|429)\b/,
      /\b(?:cuota|limite de uso|limite de (?:peticiones|solicitudes|mensajes)|demasiadas (?:peticiones|solicitudes)|(?:llego|alcanzo|lleg\w*) (?:al|a su|a mi) limite|se (?:me |le )?acab\w* (?:el |la |mi |su )?(?:cuota|uso|plan))\b/,
    ],
    cards: ['gemini-rate-limited', 'cursor-usage-limit', 'gemini-high-demand', 'provider-credit-exhausted', 'gemini-credits-depleted', 'budget-exhausted', 'limits-real'],
  },
  {
    id: 'silent',
    says: [
      /\b(?:no|not|never|doesn'?t|don'?t|didn'?t|won'?t|isn'?t|aren'?t|wasn'?t|can'?t|cannot)\s+(?:\w+\s+)?(?:answer|respond|repl|react|say anything|do anything|finish|come back)/,
      /\bstopped (?:answering|responding|replying|talking|working)|\b(?:hangs?|hanging|hung|stuck|frozen|freez\w*|silent|silence)\b|\bkeeps (?:thinking|loading|spinning|waiting)|\btakes (?:forever|ages|too long)|\bnothing (?:happens|comes back)|\btime ?out|\btimed out|\btime limit/,
      /\b(?:no|nunca|ya no)\s+(?:me\s+|nos\s+|le\s+|te\s+)?(?:contest|respond|reaccion|termin|regres|devuelv|hace nada|dice nada|sale nada|escrib)|\bdej\w* de (?:contestar|responder|escribir)|\bsin respuesta|\bno hay respuesta/,
      /\b(?:se )?qued\w* (?:pensando|cargando|callad\w*|colgad\w*|trabad\w*|atorad\w*|congelad\w*|esperando|en silencio)|\bse (?:colg|trab|ator|congel|pasm)\w*|\btarda (?:mucho|demasiado|horas|una eternidad)|\btiempo limite/,
    ],
    cards: ['timeout', 'not-signed-in', 'provider-credit-exhausted', 'gemini-rate-limited', 'gemini-high-demand', 'gemini-credits-depleted', 'gemini-ineligible-tier', 'cursor-usage-limit', 'opencode-default-provider', 'opencode-server-error', 'madre-agent', 'ollama', 'stream-reconnecting', 'runaway-room', 'interrupted'],
  },
  {
    id: 'broken',
    says: [
      /\b(?:doesn'?t|does not|isn'?t|is not|not|won'?t|stopped) work\w*|\bbroken\b|\bfail(?:s|ed|ing)?\b/,
      /\bno (?:funciona|jala|sirve|anda|arranca|abre)\b|\bfall(?:a|o|ando)\b|\bdej\w* de funcionar|\besta roto\b/,
    ],
    cards: ['not-signed-in', 'not-installed', 'timeout', 'provider-credit-exhausted', 'gemini-rate-limited', 'gemini-ineligible-tier', 'cursor-usage-limit', 'opencode-default-provider', 'madre-agent', 'ollama', 'adapter-pending'],
  },
];

// The cards a symptom points to, in the order the symptoms are listed, for that agent if one is named.
export function symptomConditions(query) {
  const text = fold(query);
  const agent = named(wordsOf(query));
  const ids = [...new Set(SYMPTOMS.filter((symptom) => symptom.says.some((pattern) => pattern.test(text))).flatMap((symptom) => symptom.cards))];
  const owners = (id) => Object.keys(BELONGS).filter((owner) => BELONGS[owner].includes(id));
  const cards = ids.map((id) => CONDITIONS.find((condition) => condition.id === id)).filter(Boolean)
    .filter((condition) => !owners(condition.id).length || owners(condition.id).includes(agent));
  return forAgent(cards, agent).map(said);
}

export function searchConditions(query) {
  const words = wordsOf(query);
  const all = allConditions();
  if (!words.length) return all;
  // A symptom is a few words, not a phrase to be found whole. An agent's name narrows the list to
  // that agent's conditions and the general ones; every other word has to appear somewhere in the
  // condition, read in the language it is shown in, in either language's original, or in its fixes.
  // «claude tiempo limite» used to find nothing, and only «timeout» found the timeout card.
  const agent = named(words);
  const rest = words.filter((word) => !AGENT_WORDS.has(word.replace(/^@/, '')));
  return forAgent(all.filter((condition) => {
    if (agent && condition.agent && condition.agent !== agent) return false;
    const source = CONDITIONS.find((one) => one.id === condition.id);
    const haystack = fold([condition.id, condition.code, condition.title, condition.diagnosis, condition.remedy, condition.agent ?? '', source?.title, source?.diagnosis, ...Object.values(condition.fixes ?? {}).flat()].join(' '));
    if (!rest.length) return !agent || condition.agent === agent || haystack.includes(agent);
    return rest.every((word) => haystack.includes(word));
  }), agent);
}

// A symptom is said in the words a person has, not the catalogue's. When no condition holds every
// word, the ones sharing the most of them come first: «codex no responde timeout» still finds the
// timeout. An agent's name keeps to that agent and the general ones; little words do not count.
const LOOSE_SKIP = new Set(['the', 'and', 'not', 'for', 'with', 'que', 'los', 'las', 'del', 'por', 'una', 'uno', 'con', 'sin', 'esta', 'este', 'muy', 'mas', 'pero']);
export function looseConditions(query) {
  const words = wordsOf(query).map((word) => word.replace(/^@/, '')).filter((word) => word.length >= 3 && !LOOSE_SKIP.has(word));
  const agent = words.find((word) => AGENT_WORDS.has(word)) ?? null;
  const rest = words.filter((word) => !AGENT_WORDS.has(word));
  if (!rest.length) return [];
  return allConditions()
    .filter((condition) => !agent || !condition.agent || condition.agent === agent)
    .map((condition) => {
      const haystack = fold([condition.id, condition.code, condition.title, condition.diagnosis, condition.remedy].join(' '));
      return { condition, score: rest.filter((word) => haystack.includes(word)).length + (agent && condition.agent === agent ? 0.5 : 0) };
    })
    .filter((entry) => entry.score >= 1)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.condition);
}

// What Diagnosis shows for what was written, most probable first. A pasted error names its own
// cause, so those cards lead — except the ones that only explain something, which a stray word
// can match. Then what the words mean as a symptom, then the cards that hold every word, and only
// when nothing did, the ones holding the most of them. One card appears once.
export function findConditions(query) {
  const agent = named(wordsOf(query));
  const byError = forAgent(diagnose(query, agent), agent);
  const found = [
    ...byError.filter((condition) => condition.severity !== 'informational'),
    ...symptomConditions(query),
    ...byError.filter((condition) => condition.severity === 'informational'),
    ...searchConditions(query),
  ];
  const seen = new Set();
  const unique = found.filter((condition) => !seen.has(condition.id) && seen.add(condition.id));
  return unique.length ? unique : looseConditions(query);
}

export function fixesFor(condition, platform, agent = null) {
  const base = condition.fixes?.[platform] ?? condition.fixes?.darwin ?? [];
  const perAgent = condition.perAgent?.[agent]?.[platform];
  return perAgent ? [...perAgent, ...(base.length && !base[0].startsWith('#') ? base : [])] : base;
}
