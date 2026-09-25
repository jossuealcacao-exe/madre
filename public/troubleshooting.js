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
};

const loginAgent = {
  codex: { darwin: ['codex login', 'codex login status'], linux: ['codex login', 'codex login status']},
  claude: { darwin: ['claude auth login', 'claude auth status --text'], linux: ['claude auth login', 'claude auth status --text']},
  gemini: { darwin: ['gemini', '# inside gemini: /auth  → "Use Gemini API key" or Google login'], linux: ['gemini', '# inside gemini: /auth']},
  opencode: { darwin: ['opencode auth login', 'opencode auth list'], linux: ['opencode auth login', 'opencode auth list']},
};

const same = (commands) => ({ darwin: commands, linux: commands });

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
      linux: ['gemini', '# inside gemini: /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux]
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
      linux: ['gemini --model gemini-3-flash-preview -p "ping"', '# quota: https://aistudio.google.com/app/apikey']
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
      linux: ['npx @jossuealcala/madre setup', '# press [m] and pick a provider/model that has a session', 'PULSE_OPENCODE_MODEL=openai/gpt-5.6-sol npx @jossuealcala/madre start', 'opencode auth logout anthropic']
    },
  },
  {
    id: 'not-signed-in',
    severity: 'blocking',
    title: 'Agent installed but signed out',
    match: /not logged in|sign in required|Error authenticating|unauthorized|please (?:log|sign) ?in|no credentials/i,
    diagnosis: 'The CLI is on this computer but has no session for its provider. MADRE never stores credentials; each agent keeps its own.',
    remedy: 'Press SIGN IN on the agent\'s card: on first contact the room opens on the bridge, and later the same button lives in ⚙ CONNECTIONS. Codex and Claude sign in with a browser flow MADRE runs for you; Gemini and OpenCode hand you their command. `madre setup` does the same from a terminal.',
    fixes: same(['npx @jossuealcala/madre setup', '# or directly:', 'codex login', 'claude auth login', 'opencode auth login', 'gemini   # then /auth']),
    perAgent: loginAgent,
  },
  {
    id: 'not-installed',
    severity: 'blocking',
    title: 'Agent not found on this computer',
    match: /is not installed on this computer|not found on this computer|ENOENT.*(codex|claude|gemini|opencode)/i,
    diagnosis: 'MADRE looks for `codex`, `claude`, `gemini` and `opencode` on PATH plus a few known locations. Nothing answered.',
    remedy: 'Press INSTALL on the agent\'s card: MADRE shows the exact command, runs it here and looks again when it finishes, no restart. `madre setup` does the same from a terminal.',
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
    remedy: 'Press the RAISE button on this card, or type a new number in ⚙ CONNECTIONS (DEFAULT TIMEOUT · SECONDS, or the field on the agent\'s card): fields save the moment you leave them. It applies to the next turn and persists in ~/.pulse/config.json. Environment variables work too, but only for a server started after exporting them; a running room never sees a later export.',
    fixes: {
      darwin: ['# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE', '# at launch only (env wins over config.json):', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}'],
      linux: ['# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE', 'PULSE_AGENT_TIMEOUT_MS=300000 PULSE_CLAUDE_TIMEOUT_MS=600000 madre start', '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}']
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
      linux: ['export PULSE_MAX_MESSAGE_CHARS="40000"']
    },
  },
  {
    id: 'limits-real',
    severity: 'informational',
    title: 'Where the rings get their numbers',
    match: /ring|quota|limit window|resets|rollout|oauth usage|window reset|limits-real/i,
    diagnosis: 'Each sphere\'s ring shows the provider\'s real limit when the CLI publishes it: Codex writes its 5-hour and weekly windows (used %, reset time) into every session rollout under ~/.codex/sessions; Claude Code\'s /usage comes from Anthropic\'s OAuth usage endpoint; MADRE can ask it with the token Claude Code keeps in the keychain when you start with PULSE_CLAUDE_USAGE=1 (macOS may ask once to allow the keychain read). Gemini and OpenCode publish nothing locally, so their ring shows MADRE\'s own rolling 5-hour window of budget tokens. A window whose reset time has passed counts as empty until the CLI reports again, and the sentinel says "clear" when a full window resets.',
    remedy: 'Click a sphere to see both windows and when they reset. If a ring looks stale, run one turn with that agent: Codex only rewrites its limits when it runs. Set PULSE_OFFICIAL_QUOTA=0 to stop reading provider limits altogether.',
    fixes: same(['# click the sphere → 5h / 7d windows and reset times', 'PULSE_CLAUDE_USAGE=1 madre start     # also read Claude Code\'s usage windows', 'PULSE_OFFICIAL_QUOTA=0 madre start   # local window only']),
  },
  {
    id: 'budget-exhausted',
    severity: 'tunable',
    title: 'Local token budget exhausted for an agent',
    match: /MADRE exhausted|local room token budget/i,
    diagnosis: 'The room keeps a soft per-agent budget (500,000 tokens by default) so one agent does not quietly eat a whole session. It is MADRE\'s own bookkeeping from the usage each CLI reports after a turn, not the provider\'s quota: nothing is blocked, the room only warns and suggests other agents. Cache reads weigh a tenth of a fresh token.',
    remedy: 'Continue with another agent, press RAISE LOCAL BUDGET on this card, or type a number in ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT (saves on leaving the field). The provider\'s real limits show in each sphere\'s popover when the CLI reports them.',
    fixes: {
      darwin: ['# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE', '# at launch: PULSE_SOFT_TOKEN_BUDGET=1000000 madre start', '# or ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}'],
      linux: ['# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE', 'PULSE_SOFT_TOKEN_BUDGET=1000000 madre start']
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
      linux: ['npx @jossuealcala/madre start --port 4318', 'ss -ltnp | grep 4317']
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
    id: 'modes',
    severity: 'informational',
    title: 'Permission modes: #0 GHOST · #1 EXCHANGE · #2 CREATE · #3 CONTROL · #4 AIRLOCK',
    match: /mode|ghost|exchange|control|airlock|deploy|despleg|producci|override|designation|max mode|#[0-4]\b/i,
    diagnosis: 'Every message goes out at a mode, chosen in the chip after TO @agent (or typed as #2 in the text). #0 GHOST is off the record: nothing is saved, no other agent remembers it, gone on reload, no delegation. #1 EXCHANGE is the default: read and coordinate. #2 CREATE lets the agent add new files and folders anywhere in the project, where they belong; whatever existed before is put back after the turn and the room says so. #3 CONTROL puts one agent in command of the project itself: a git checkpoint is taken first, every change is listed afterwards, writes into .git, .pulse or .env files are reverted on the spot, and UNDO restores the checkpoint. One holder at a time; it needs MAX MODE 3 and a git repository. Your mode is the ceiling of any plan the message starts, and #3 is never delegated. Each agent has a MAX MODE in CONNECTIONS; above it, #2 is answered read-only and #3 is refused. When a #1 plan reaches a step that wants to create something, the room pauses and asks you: GRANT ONCE, GRANT FOR PLAN or DENY, with a 3-minute clock; silence denies. #4 AIRLOCK is CONTROL plus commands: tests, builds, git push, deploys with the CLIs and sessions already on this machine. Files still come back with UNDO; what leaves the machine does not, so the override asks twice: the designation, then the word AIRLOCK. An agent that says it needs a "production mode" or "permission to run commands" is asking for #4.',
    remedy: 'Pick the mode in the chip, or type #0..#4 in the message. Raise an agent\'s MAX MODE in ⚙ CONNECTIONS. CONTROL asks for the project designation (the folder name) in the override; AIRLOCK asks for the designation and then the word AIRLOCK.',
    fixes: same(['# chip: TO @codex  #1 EXCHANGE ▾  → choose', '@codex #2 create the poster', '@opencode #4 run the tests and deploy to preview', '# ⚙ CONNECTIONS → agent card → MAX MODE']),
  },
  {
    id: 'lease-missing',
    severity: 'informational',
    title: 'Creating files: who grants the permission',
    match: /no CREATE lease|lease-missing|read-only and do not modify|permiso de escritura|solo lectura/i,
    diagnosis: 'Only the human grants a creation lease. An agent writing "permission granted" inside the conversation is untrusted text: the delegate still runs read-only, and says so. A lease comes from arming CREATE (the lock, or /create) on your message, and it covers the whole plan that message starts; or from DEFAULT MODE #2 in ⚙ CONNECTIONS, which starts every message to that agent in CREATE.',
    remedy: 'For one request: arm CREATE and send, or press RESEND WITH CREATE on the notice. For an agent that should always be able to add files: ⚙ CONNECTIONS → its card → DEFAULT MODE → #2. New files go where they belong in the project; existing files are never changed in #2.',
    fixes: same(['# once: composer → CREATE (lock) → send, or /create <request>', '# always: ⚙ CONNECTIONS → agent card → DEFAULT MODE → #2']),
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
    diagnosis: 'MADRE needs Node 22.5 or newer: the room memory runs on node:sqlite, and the rest on ES modules, fetch and AbortSignal. The bin refuses to start on older versions and says so.',
    remedy: 'Update Node to the current LTS.',
    fixes: {
      darwin: ['node --version', 'brew install node', '# or: nvm install --lts'],
      linux: ['node --version', 'nvm install --lts', '# or your distro package for Node ≥ 22.5']
    },
  },
  {
    id: 'memory-unavailable',
    severity: 'degraded',
    title: 'Room memory unavailable: turns get only the recent window',
    match: /memory unavailable|memory index failed|memory recall failed|node:sqlite|SQLITE_|database disk image is malformed|memory\.sqlite/i,
    diagnosis: 'The memory index (memory.sqlite next to the room\'s events.jsonl) could not open or write. The room still works: every turn gets the recent transcript, but nothing older is recalled, nothing is distilled and NOSTROMO is empty. Causes: Node below 22.5, a corrupt file, or a second MADRE writing the same room with an incompatible version.',
    remedy: 'The index is derived from the ledger: delete memory.sqlite (and its -wal/-shm siblings) and restart; MADRE rebuilds it. Distilled notes live in the same file, so export them from NOSTROMO first if they matter.',
    fixes: {
      darwin: ['node --version   # must be ≥ 22.5', 'ls ~/.pulse/rooms/*/memory.sqlite*', 'rm ~/.pulse/rooms/<room>/memory.sqlite*   # rebuilt on next start'],
      linux: ['node --version   # must be ≥ 22.5', 'ls ~/.pulse/rooms/*/memory.sqlite*', 'rm ~/.pulse/rooms/<room>/memory.sqlite*   # rebuilt on next start']
    },
  },
  {
    id: 'memory-recall',
    severity: 'informational',
    title: 'Room memory: what an agent remembers and how',
    match: /\brecall\b|recuerd|\bremember\b|memoria de la sala|<memory>|<memories>/i,
    diagnosis: 'Everything said outside GHOST is indexed (full text plus meaning, when a Gemini key exists). When a room is longer than the context window, each turn also receives the older exchanges that match the request, quoted with their ledger sequence (<memory>), and the distilled notes that match (<memories>), inside PULSE_RECALL_SHARE of the window (30 % by default). Every agent reads the same memory, so a decision taken with one reaches the others. Ghost turns may read it but never write it.',
    remedy: 'Nothing to do; it is automatic. To give it more room raise PULSE_RECALL_SHARE (max 0.6); to switch it off set it to 0. Ask any agent "what did we decide about …" and it will search with memory_search before answering.',
    fixes: same(['# more recall per turn', ...envExport('PULSE_RECALL_SHARE', '0.45').darwin, '# off', 'PULSE_RECALL_SHARE=0 madre start']),
  },
  {
    id: 'memory-distill',
    severity: 'degraded',
    title: 'Distilled memories: the archivist did not run, or failed',
    match: /could not distil|distill|destil|batch skipped|archivist|memory\.distilled|memories? (were|was) not/i,
    diagnosis: 'Every PULSE_DISTILL_EVERY undistilled exchanges (10), or after PULSE_DISTILL_IDLE_MS of quiet (10 min), the cheapest available agent (Gemini, then OpenCode, Codex, Claude) reads the newest undistilled batch and keeps up to five notes. It runs only when no turn is in flight and one batch per trigger, so a long backlog drains slowly. A run that fails is retried; after three failures on the same batch it is skipped and the room says so. Common causes: the archivist agent is rate-limited or signed out, or PULSE_DISTILL=0.',
    remedy: 'Check the archivist\'s session in ⚙ CONNECTIONS, or pick another with PULSE_DISTILL_AGENT. Lower PULSE_DISTILL_EVERY to distil sooner; raise PULSE_DISTILL_MAX_CHARS to read more per run. Set PULSE_DISTILL=0 to stop paying for it.',
    fixes: same(['madre doctor', ...envExport('PULSE_DISTILL_AGENT', 'claude').darwin, ...envExport('PULSE_DISTILL_EVERY', '6').darwin, 'PULSE_DISTILL=0 madre start   # off']),
  },
  {
    id: 'memory-embeddings',
    severity: 'degraded',
    title: 'Embeddings paused: recall is lexical only',
    match: /embeddings paused|embedding timed out|Gemini embeddings HTTP|batchEmbedContents|LINKS NEED EMBEDDINGS/i,
    diagnosis: 'Meaning-aware recall and the links between memories in NOSTROMO need Gemini embeddings through your own key (GEMINI_API_KEY or the Gemini CLI\'s keychain entry). Without a key, or when the API answers 429/5xx, MADRE pauses vectors for a minute and retries; recall keeps working on words alone.',
    remedy: 'Sign the Gemini CLI in with an API key (/auth) or export GEMINI_API_KEY, then restart. If you do not want embeddings at all, set PULSE_EMBED=0 and the pause message stops.',
    fixes: {
      darwin: ['gemini   # /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').darwin, 'PULSE_EMBED=0 madre start   # lexical only, no messages'],
      linux: ['gemini   # /auth → "Use Gemini API key"', ...envExport('GEMINI_API_KEY', 'YOUR_KEY').linux, 'PULSE_EMBED=0 madre start']
    },
  },
  {
    id: 'memory-tools',
    severity: 'degraded',
    title: 'An agent says it cannot search the memory (pulse-memory MCP)',
    match: /pulse-memory|memory_search|memory_recall|memory_notes|memory_timeline|memory_note|mcp.*(failed|error|not found|unavailable)|MCP server/i,
    diagnosis: 'Every turn attaches MADRE\'s memory as an MCP server named pulse-memory: Claude through --mcp-config, Gemini through its isolated settings and policy, OpenCode through config.mcp, Codex through -c mcp_servers.* overrides. If a CLI does not list its tools the server did not start in that CLI: an old CLI without MCP support, a sandbox that blocks the SQLite file, or PULSE_MEMORY_TOOLS=0. The automatic <memory> blocks in the prompt still work without it.',
    remedy: 'Update the CLI, then check that it sees the server. Codex can list servers from a config override; Claude accepts an inline --mcp-config. If a CLI keeps failing, PULSE_MEMORY_TOOLS=0 removes the tools for everyone and the room continues on automatic recall.',
    fixes: {
      darwin: ['codex mcp list', 'claude --version', 'gemini --version', 'PULSE_MEMORY_TOOLS=0 madre start   # tools off, recall stays'],
      linux: ['codex mcp list', 'claude --version', 'gemini --version', 'PULSE_MEMORY_TOOLS=0 madre start']
    },
  },
  {
    id: 'memory-note',
    severity: 'informational',
    title: 'Saving a memory on request; GHOST refuses',
    match: /save (a |the |this )?memory|guarda.*memoria|memory saved|off the record.*nothing can be saved|remember this|memory_note/i,
    diagnosis: 'Memories are distilled automatically; you never need to ask. When you do ask an agent to remember or save something, it calls memory_note and a pill appears under its reply with the note; clicking the pill opens it in NOSTROMO. In a GHOST turn the note is refused: nothing off the record reaches the archive. "Already remembered" means the same note exists.',
    remedy: 'Ask in any mode but #0: "remember that …" or "save this as a decision: …". Notes saved this way are marked "on the human\'s request" in NOSTROMO and can be forgotten there.',
    fixes: same(['@claude remember: the webhook verifies the signature before parsing', '# then: MU/TH/UR → ◉ NOSTROMO']),
  },
  {
    id: 'nostromo-access',
    severity: 'informational',
    title: 'NOSTROMO: boarding, reading and forgetting',
    match: /nostromo|designation|UNABLE TO COMPUTE|ARCHIVE IS SEALED|forget this memory/i,
    diagnosis: 'NOSTROMO is the human\'s view of the archive, from MU/TH/UR. Boarding asks for the project designation: the name of the project folder, exactly as CONTROL does; a wrong one answers UNABLE TO COMPUTE. Access stays open until the page reloads. Inside, every distilled memory is a planet around the room\'s core; drag to move, wheel to zoom, click a planet for its card. The only edit is FORGET (two presses): the note leaves every future turn, the ledger stays. If the archive answers SEALED with a number of minutes, wait them out: repeated strikes at the core close it for a while and the composer reads INTRUDER until it opens again.',
    remedy: 'Type the folder name shown in the room header as the designation. To find a memory quickly, ask an agent to search instead. Do not strike the core.',
    fixes: same(['# MU/TH/UR → ◉ NOSTROMO → designation = project folder name', 'basename "$PWD"']),
  },
  {
    id: 'ripley',
    severity: 'informational',
    title: 'RIPLEY: rendering HTML, SVG and Markdown in the viewer',
    match: /ripley|RIPLEY is off|renders \.html|render(ed|ing)? (the )?(html|svg|markdown)/i,
    diagnosis: 'With RIPLEY on (MODULES), the file viewer renders .html and .svg through /preview/project/<path> inside a sealed frame: the page\'s own scripts run, but the frame has no origin, no network, no forms and no way to reach MADRE, and it loads CSS, JS, images and fonts only from the project through MADRE. Relative links work. Markdown renders in place; PREVIEW / SOURCE switches. Off, those files show as text with a note. 412 means RIPLEY is off. Plain /api/files always serves HTML as text.',
    remedy: 'Enable RIPLEY in MODULES. If a page looks broken in PREVIEW it is usually because it fetches something from the internet or another server, which the frame forbids by design: open it with OPEN RAW in a normal tab if you trust it.',
    fixes: same(['# MODULES → RIPLEY → ENABLE RIPLEY', '# viewer → PREVIEW / SOURCE']),
  },
  {
    id: 'ollama',
    severity: 'informational',
    title: 'Ollama: local embeddings and a local archivist',
    match: /ollama|11434|local model|nomic-embed|qwen|llama3/i,
    diagnosis: 'When Ollama runs on this machine with an embedding model and a chat model, MADRE embeds the memory locally (recall by meaning without any key) and distils memories with the local model first, before Gemini and the others. Nothing leaves the machine for remembering. Off or absent, everything falls back to the providers. MODULES shows what Ollama has, lets you pull the recommended models, and switches each role.',
    remedy: 'Install Ollama (ollama.com), start it, then in MODULES press RECHECK and PULL the models it suggests. Set PULSE_OLLAMA_MODEL or PULSE_OLLAMA_EMBED_MODEL to prefer others; PULSE_EMBED_PROVIDER=gemini keeps embeddings on Gemini even with Ollama running.',
    fixes: {
      darwin: ['brew install ollama', 'ollama serve', 'ollama pull nomic-embed-text', 'ollama pull qwen2.5:3b'],
      linux: ['curl -fsSL https://ollama.com/install.sh | sh', 'ollama serve', 'ollama pull nomic-embed-text', 'ollama pull qwen2.5:3b']
    },
  },
  {
    id: 'madre-agent',
    severity: 'informational',
    title: '@madre: the room\'s own memory, as an agent',
    match: /@madre|madre-local|needs Ollama running with a chat model/i,
    diagnosis: 'When Ollama runs with a chat model, a fifth agent joins the room: @madre. It answers from the whole archive (distilled notes and exact quotes, cited as [#n]) and from what the message carries, locally, for free. It never writes, draws, browses or delegates; when the room never discussed something it says so. Other agents may delegate a step to it to check what was decided. It leaves the room when Ollama stops, and MU/TH/UR says so.',
    remedy: 'Start Ollama and PULL a chat model in MODULES → OLLAMA; the switch @MADRE IN THE ROOM turns the agent off if you do not want it. Ask it "what did we decide about …" or "did we ever discuss …".',
    fixes: same(['ollama serve', 'ollama pull qwen2.5:3b', '@madre what did we decide about the webhook?']),
  },
  {
    id: 'install-needs-admin',
    severity: 'informational',
    title: 'Installing a CLI: npm cannot write to the system folder',
    match: /EACCES|EPERM|permission denied|Missing write access|npm ERR!.*sudo|administrator/i,
    diagnosis: 'A global npm install writes into a folder that belongs to the system. With Node installed from its own installer that folder needs an administrator, so npm stops with a permission error. MADRE does not ask for your password: when it sees that wall it installs the CLI into a folder of its own, ~/.pulse/tools, and looks there as well as along PATH. The agent works the same; only the file lives somewhere else.',
    remedy: 'Nothing to do: press INSTALL again and MADRE takes the second way by itself. If you would rather have the CLI everywhere in your terminal, install it yourself with your package manager, or give npm a folder of your own.',
    fixes: {
      darwin: ['# MADRE does this for you; these are the alternatives:', 'brew install --cask claude-code', 'npm config set prefix ~/.npm-global   # then add ~/.npm-global/bin to your PATH'],
      linux: ['# MADRE does this for you; these are the alternatives:', 'npm config set prefix ~/.npm-global   # then add ~/.npm-global/bin to your PATH']
    },
  },
  {
    id: 'privacy-leak',
    severity: 'warning',
    title: 'Privacy: an agent brought its own configuration into the room',
    match: /privacy\.redacted|privacy\.purged|private terms?|\[ENTIDAD-ORG\]|organi[sz]ation(al)? instructions|leak(ed)? (a|the) (name|company|domain)/i,
    diagnosis: 'A CLI agent runs with its own system context: organisation instructions, the account it is signed in with, CLAUDE.md files elsewhere. It can mistake that private context for shared context and write a company, a brand or a domain into a reply. Once in the ledger the term reaches the archivist, every other agent and the dataset.',
    remedy: 'Name the terms in ⚙ CONNECTIONS → PRIVACY. From then on MADRE replaces them with the marker before the ledger, the index, the notes and the dataset see them, and every reply that needed it shows a privacy line. PURGE ROOM rewrites what the room already holds; re-export the dataset afterwards. The terms never leave config.json.',
    fixes: same(['# ⚙ CONNECTIONS → PRIVACY → one term per line → PURGE ROOM', 'export PULSE_PRIVATE_TERMS="Acme Corp,acme.com"   # same list from the environment', 'grep -c "ENTIDAD-ORG" ~/.pulse/rooms/*/events.jsonl']),
  },
  {
    id: 'control-changes',
    severity: 'informational',
    title: 'CONTROL: what changed, what was reverted, UNDO',
    match: /control\.changed|forbidden zones?|reverted|UNDO|checkpoint|changed \d+ file/i,
    diagnosis: 'A #3 CONTROL turn takes a git checkpoint before the agent runs, then lists every file it added, modified or deleted. Writes into .git, .pulse or any .env file are reverted on the spot and named. UNDO restores the checkpoint in one click; STOPALL revokes CONTROL. One holder at a time, never delegated, needs MAX MODE 3 and a git repository.',
    remedy: 'Read the list under the reply before moving on. If the change is wrong press UNDO; if the agent should not have had it, lower its MAX MODE in ⚙ CONNECTIONS.',
    fixes: same(['git log --oneline -5   # checkpoints are ordinary commits on a side ref', 'git stash list', '# room → UNDO under the CONTROL notice']),
  },
  {
    id: 'conversations',
    severity: 'informational',
    title: 'Conversations: many per project, one memory, one at a time',
    match: /conversation|already open for this project|ROOM_IN_USE|a turn is running in this conversation|new conversation|chats\.json/i,
    diagnosis: 'A project has one memory and many conversations. The archive, the crew, the modules and the privacy list belong to the project and do not start over when you open another thread; a conversation is only the record of one line of work, and everything said in any of them feeds the same archive. The first conversation is the ledger that was always there, so a room that existed before opens exactly as it did. The numbering is the project\'s, not the thread\'s: a new conversation starts where the project got to, which is why a citation like #1411 means the same exchange in all of them. One conversation drives the crew at a time — two threads editing the same working tree is a way to lose work — so opening another while a turn runs is refused until it finishes. And one server per project: a second `madre start` on the same project is refused with the address of the room that is already open, because two servers would hand out the same sequence twice and the archive would quietly keep one of them.',
    remedy: 'The panel on the left of the canvas lists them: open one, or start another at the bottom. Deleting one takes its transcript and nothing else — what the archivist distilled from it is the project\'s memory and stays. If MADRE says the project is already open, use that room and open a conversation inside it instead of starting a second server.',
    fixes: same(['# room → the handle under the bar, on the left → NEW CONVERSATION', '# the address of the open room is in the refusal itself', 'ls ~/.pulse/rooms/*/chats.json   # their names and which one is open']),
  },
  {
    id: 'memory-aberrations',
    severity: 'informational',
    title: 'Aberrations: what the room established is false',
    match: /aberration|aberraci|eyecat|contradict|refut|false claim|hallucinat|alucina/i,
    diagnosis: 'An aberration is a claim the room established is false, kept on purpose rather than deleted: it is what the local model learns not to repeat. It never travels into a turn, and the note it refutes is taken out of circulation with it — a refuted memory is never recalled again, by words or by meaning. EYECAT watches for two agents saying opposite things about the same subject and raises the pair for a third agent to judge, one that took no part in either side. Confirming files the aberration and quarantines what it refutes; dismissing says the room was right and the pair is never raised again. Forgetting an aberration gives its note back.',
    remedy: 'NOSTROMO shows them as collapsed bodies: open one to read what it took down, or clear it if the room was wrong about being wrong. The three tests report open contradictions under CONSISTENCY.',
    fixes: same(['# room → ◉ NOSTROMO → the dark bodies are aberrations', '# ⚙ CONNECTIONS → MEMORY → THE THREE TESTS → CONSISTENCY']),
  },
  {
    id: 'memory-cascade',
    severity: 'informational',
    title: 'Memory used · N by association',
    match: /by association|cascade|spreading activation|keeps arriving with|memory used/i,
    diagnosis: 'Under a reply, MADRE says what the archive handed that turn. Most of it was matched to what you asked, by words and by meaning. A note marked "by association" came along for a different reason: this room keeps carrying it in the same turn as one of the others, so the archive brings it too, however differently it reads. The strength is a ratio over the turns where each was found on its own merits — a memory the room reaches for constantly does not end up attached to everything, and a pair that stops meeting fades on its own. Association adds and never displaces: recall keeps two slots for it and hands back the ones it does not use.',
    remedy: 'Click a note to see it in NOSTROMO, where the wires it travels on are drawn. It is the one part of recall that owes nothing to how a memory reads, so it can be switched off in MEMORY.',
    fixes: same(['# ⚙ CONNECTIONS → MEMORY → CARRY WHAT A MEMORY KEEPS ARRIVING WITH', 'PULSE_RECALL_CASCADE=0 npx @jossuealcala/madre start']),
  },
  {
    id: 'memory-cold',
    severity: 'informational',
    title: 'Cold memories: what the archive has had its chances with',
    match: /cold memor|cold zone|never once carried|had its chances/i,
    diagnosis: 'A memory is cold when three things are true at once: no turn has ever carried it, it shares a subject with nothing so nothing can reach it sideways either, and the archive has been opened at least a dozen times since it was written. The third is what makes the label worth acting on — never-recalled is what every memory is on the day it is written. Chances are counted in turns that actually reached into the archive, and only from the day the room started keeping that trail, so what was never written down is not held against the note.',
    remedy: 'NOSTROMO shows COLD · N in its header when there are any; pressing it rings each one on the map. Open one and its card says the number plainly, with FORGET one press away. Asking about it is the other way out: the room writes that question for you under ASK.',
    fixes: same(['# room → ◉ NOSTROMO → COLD', '# room → ◉ NOSTROMO → ASK → PUT IN THE COMPOSER']),
  },
  {
    id: 'maturity-tests',
    severity: 'informational',
    title: 'The three tests: whether the archive works',
    match: /three tests|coverage|consistency|held-out|match test|maturity|madurez|ready to be worked in/i,
    diagnosis: 'The six readings count what the archive is made of; they cannot say whether it works, because nothing about a pile of notes says whether the right one comes back when it is needed. COVERAGE takes real questions from this room, runs recall at the exact point each was asked, and scores what came back against the reply that was actually given. CONSISTENCY reads the contradictions EYECAT still holds and whether aberrations are being filed more often lately. MATCH puts real questions a frontier CLI answered back to the local model with this archive behind it. All three measure against a control, because everything in one room is about the same handful of subjects and any two pieces of it read as close to an embedder: to count, what the archive handed over has to beat what it would have handed over for a different question.',
    remedy: 'Read the one sentence and the one instruction at the top of MEMORY; the readings and the tests are a fold below it. The free test is read as the panel opens, the cheap one keeps itself fresh once a day while the embeddings are local, and the slow one is yours to start and to stop. None of them spends a provider turn.',
    fixes: same(['# ⚙ CONNECTIONS → MEMORY → THE THREE TESTS', '# MATCH needs Ollama running with a chat model, and embeddings on']),
  },
  {
    id: 'module-update',
    severity: 'common',
    title: 'Updating what a module drives',
    match: /EACCES|permission denied.*npm|npm ERR!.*EACCES|update to \d|newest is|brew upgrade|install -g @playwright/i,
    diagnosis: 'When something newer exists and the module knows how to fetch it, the button is beside the version on its card. It asks twice on purpose: the first press answers with the command, the second runs exactly that, and the output lands in the room line by line. Nothing installs by itself — putting software on your computer unannounced would break the one thing MADRE promises, that a command is seen before it runs. The usual failure is npm refusing a global install with EACCES, which means the global prefix belongs to root; sudo works and leaves you with root-owned files, so a user-owned prefix or a version manager is the better answer.',
    remedy: 'Press the button beside the version, read the command, run it. If npm refuses with EACCES, point npm at a prefix you own or use a version manager, then press it again.',
    fixes: {
      darwin: ['npm config get prefix', 'npm config set prefix ~/.npm-global', 'echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> ~/.zshrc', '# or: brew install node   # a Homebrew node owns its own prefix'],
      linux: ['npm config get prefix', 'npm config set prefix ~/.npm-global', 'echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> ~/.bashrc', '# or use nvm, which owns the prefix it installs into'],
    },
  },
  {
    id: 'module-add',
    severity: 'common',
    title: 'Installing a module somebody else wrote',
    match: /already taken|must live under \/api\/x\/|not a module|default export must be a module|module file|\.module\.mjs|add a module/i,
    diagnosis: 'MODULES has + ADD A MODULE for a .mjs somebody wrote. It comes through the same door as everything else: written to a scratch copy, imported there, checked against the house rules, and installed only if it passes. Three things get a file refused, each with the reason: an id that belongs to a module MADRE ships with, a route outside its own corner of the API (/api/x/<id>/), and a file that will not load at all. Said plainly, because it is what it is: a module runs inside MADRE, with your permissions, on this computer. MADRE checks that it loads and stays in its corral; what the code intends is the one thing nobody can check for you.',
    remedy: 'Install it only if you trust where it came from. A module you wrote can also be updated from where you publish it: declare updates: { url } in the file, or install it from a file and MADRE remembers which, and its card carries GET A NEWER FILE.',
    fixes: same(['# MODULES → + ADD A MODULE', 'ls ~/.pulse/modules   # every module you installed, and where it came from', '# docs/SDK.md is the whole contract, and docs/sdk/hello-module.mjs is one that works']),
  },
  {
    id: 'outbound',
    severity: 'common',
    title: 'What leaves this computer, and how to stop each thing that does',
    match: /what left this machine|outbound|leaves? (this )?(computer|machine)|sends? (my )?(code|data)|telemetry|phone home|privacy/i,
    diagnosis: 'MADRE runs here and keeps what it knows in a file you own, and the list that qualifies that sentence is inside the core, under WHAT LEFT THIS MACHINE. Seven addresses, each saying what it carries and where it is switched off: the briefing, which goes to whoever runs the agent you sent the turn to; Gemini embeddings, which carry the text of your memories; the image model, which carries the prompt an agent wrote; the npm registry and GitHub, which get a package name and nothing else; the error collector, which gets a redacted condition and only with your press; and Anthropic, for how much of your Claude plan is left. Ollama is on the list to be seen staying here.',
    remedy: 'Under the list is the log itself: every request this process made, MADRE\'s own and any a module made, because a module runs inside MADRE and cannot opt out of the wrapper. No body, no header and no query value is ever written there — only which parameters were set. An address nothing declares is reported as exactly that.',
    fixes: same([
      '# NOSTROMO → click the core → WHAT LEFT THIS MACHINE',
      'cat ~/.pulse/rooms/*/outbound.jsonl | tail -20   # the same log, on disk',
      '# embeddings, to keep memories on this computer: MU/TH/UR → MEMORY → EMBEDDINGS → OLLAMA',
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
