# MADRE · REFERENCE

Everything MADRE does, with the exact numbers. To get started in five minutes, see the [README](../../README.en.md).

- [Getting started](#getting-started--the-first-five-minutes) · [The project](#the-project) · [Language](#language)
- [Permission modes](#permission-modes) · [What each agent can do](#what-each-agent-can-do) · [Plans](#plans)
- [Memory](#memory) · [Your model](#your-model) · [What is sent](#what-is-sent) · [Diagnostics](#diagnostics) · [Modules](#modules)
- [What leaves the machine](#what-leaves-the-machine) · [Config and variables](#reference)

---

## GETTING STARTED · THE FIRST FIVE MINUTES

You need Node 22.5 or later and at least one of these CLIs with a signed-in session: **Codex**, **Claude Code**, **Gemini CLI**, **OpenCode**. If **Ollama** is also running with a chat model, the project gets a fifth, local agent.

1. Run `npx @jossuealcala/madre` from any folder: it opens Home, with all your projects and the Coordinator at the top. The first time, a three-step assistant walks you through it: connect the agents (each with its own button to install it and sign in, right there; once for all projects), add the projects (you choose folders inside your user folder; adding does not open them) and open the ones you are going to use. `npx @jossuealcala/madre start` inside a folder still opens that project directly; if there are no agents, the project opens anyway on Connect your agents so you can install them and sign in.
2. The project opens at `http://127.0.0.1:4317`. Pick an agent in the selector or type `@claude …`. The chip next to `to @agente` says which mode the message goes out in; `#1 CHAT ONLY`, read-only, is the default.
3. To add or reconnect an AI later: Settings → Agents (the settings button in the bar, or ⌘, / Ctrl+,), where the agents live alongside the rest of the settings. Codex, Claude Code, Gemini (with your Google account) and OpenCode (with GitHub Copilot) sign in with one click; Gemini and OpenCode also accept their key right there. Under each agent, "Prefer your terminal?" unfolds the same step written as a command, for whoever prefers to do it by hand. MADRE does not store provider credentials: each session and each key goes to its own CLI's file.
4. With Ollama, the Local AI module (Modules, in the bar) is already on: memory is embedded locally and `@madre` appears in the row.
5. Settings → Memory decides who distills the memory and how often. The Memory map, from the Diagnostics header, shows what the project remembers.

```bash
npx @jossuealcala/madre doctor      # which agents exist, who is signed in, whether there is a new version
npx @jossuealcala/madre setup       # the same setup, from the terminal, if you prefer it
npx @jossuealcala/madre start --no-open --project RUTA
```

**Three names.** **MADRE** is the product. **Diagnostics** is its operational voice: failures, connections, settings. **Log** is the channel the project runs on: the event record, the plan block, the `.pulse/` folder where artifacts land; those identifiers keep their old name, PULSE.

---

## THE PROJECT

**Connect your agents.** With no agents online, the project opens on Connect your agents: one card per agent with its real status and the one action that applies to it, `INSTALL` or `SIGN IN`. Everything runs on your machine, with the command in view, and the output streams to the same screen. Codex, Claude Code and Gemini sign in with one click because their CLI opens the browser (Gemini has no sign-in command: MADRE selects "Login with Google" in its settings, answers for you the yes it asks before opening the browser and stops the run as soon as the CLI saves its session; if it does not finish, its files are left as they were). OpenCode signs in with GitHub Copilot: MADRE runs `opencode auth login -p github-copilot`, picks github.com in its menu and shows the page and the device code you type on GitHub. The room only offers providers that allow this kind of access to third-party tools: never a Claude subscription (Anthropic does not allow it) and, for now, not ChatGPT or GitLab either; those and GitHub Enterprise stay in `opencode auth login`, in your terminal. Gemini and OpenCode also accept their key right there, which MADRE writes where that CLI looks for it, with the file locked to your user and without keeping a copy anywhere, only from this computer. Each card also says which account that agent signs in with and whether there is a free entry, so choosing is not a blind guess. That screen folds away as soon as an agent is ready and does not come back: it is the first contact of a project with no one inside. From then on the agents live in `⚙ CONNECTIONS`, with the same buttons and, alongside, each agent's modes, permissions and keys.

**The bar.** The brand with its heartbeat, the project root, the agents, `LIVE`, the alerts (`STOP ALL`, new version), `MODULES`, `Diagnostics`, theme and files panel. Each agent sphere carries its usage, what it has consumed: the provider's real limit when the CLI publishes it, otherwise MADRE's local window. One click expands it.

**The bubbles.** Each reply says who is speaking, to whom, in which mode and with which model; below, the time, the turn's tokens and the running total. Full Markdown, tables, code blocks with COPY. Paths an agent mentions (`src/room.mjs:42`) open the viewer. On hover: rate it good or bad, copy, reply with another agent.

**The Write box.**

| You type | What happens |
|---|---|
| `@codex`, `@claude`, `@gemini`, `@opencode`, `@madre` | Mentions an agent; `@` opens the list |
| `!src/room.mjs:12-20` | Attaches a project file, with lines if you give them; `!` searches the files |
| `#0` to `#4` | Sets that message's permission mode. `#3` and `#4` open the unlock, just like the chip: a mode that asks for two keys with the mouse does not come free by typing it |
| `/create …`, `/image …`, `/stopall`, `/git …`, `/ahp …` | Commands; `/` opens the menu. `/git push` shows what would go out; only `/git push confirm` sends it |
| `STOPALL` | Master brake |
| Clip, drag or paste an image | Attachment for the project, never inside its folder |
| `@madre, pregúntale a los agentes …` | Ask everyone: one step per online agent, with a cited wrap-up |

A second click on the chosen sphere, or the `default model ▾` chip, picks the model for that request: Codex, Claude, Gemini and OpenCode with their real lists, or a free-form name. It is remembered per agent.

**Files.** The icon on the right opens the project tree in read-only mode. The viewer numbers lines; click and Shift+click select a range and `REVIEW WITH` sends it to an agent. With **Preview** turned on in `MODULES`, HTML, SVG and Markdown are rendered in a sealed frame instead of showing their code, with a back/reload bar and automatic reload when an agent changes the file.

**Code.** The `CODE` key in the bar opens the viewer beside the conversation as a code workspace: the project's files with their search, tabs (up to 12, still there after a reload) and, above the code, the path and the function the caret is in. ⌘P (Ctrl+P outside macOS) opens a file by its name. Switching tabs never loses what you wrote: the draft stays in its tab, marked with a dot, until you save or discard it. What an agent changed in its last `#3` EDIT turn is marked in its colour, with one card per change: **Keep** (it stops being marked), **Undo** (puts back what was there in those lines only; the rest of the turn stays) and **Ask why** (asks the agent in the conversation). A turn taken back with `UNDO`, or lines you rewrote yourself, are no longer marked. When you ask for a review of some lines, `REVIEW WITH` offers Explain, Improve, Write tests and Fix. **Side by side** puts the rendered Markdown next to the code as you write, or the HTML page reloaded when you save (the latter with Preview on). What you kept is stored in `code-reviewed.json`, next to the project's record (`GET /api/files/changes`, `POST /api/files/changes/review`).

**Theme.** Sun/moon in the bar: automatic, light or dark. The light theme does not glare; the Diagnostics screen stays phosphor.

**Language.** The project speaks **Spanish** by default. The `EN` button in the bar switches it to English and the browser remembers it; `PULSE_LANGUAGE=en` overrides the config on the next start. A language is only how things read: what was written in the ledger keeps the words it was written with, and when shown it is said again in the project's language.

The **terminal stays in English on purpose**: `madre doctor` and the startup print what people paste into an issue or search for in a search engine, and in English it can be found. What a CLI prints on its own is never touched either.

---

## PERMISSION MODES

Every message goes out with a mode. Your mode is the ceiling of any plan that message starts.

| Mode | Name | What it allows |
|---|---|---|
| `#0` | **INCOGNITO** | Off the record. Nothing is written to the ledger, no one remembers it, it disappears on reload. Tokens do count. |
| `#1` | **CHAT ONLY** | Read the project and coordinate. The default. |
| `#2` | **CREATE** | Add new files and folders where they belong in the project. What already existed does not change: if an agent touches it, MADRE restores it when the turn ends and says so. |
| `#3` | **EDIT** | Edit the real project without per-action approval. One holder per project, a restore point before, a list of changes and `UNDO` after. |
| `#4` | **FULL ACCESS** | Everything in EDIT plus running commands: tests, builds, `git push`, deploys with the CLIs and sessions already on the machine. Files come back with `UNDO`; what leaves the ship does not. The unlock asks for the same key twice: the project name (or your phrase), typed twice. |

**CREATE under the hood.** The agent decides where new things go according to the project's conventions, and creates folders if needed; `.pulse/out/<turno>/` remains as a scratch area for what has no place. MADRE takes a restore point before the turn and, when it ends, keeps what appeared, shows it under the reply as artifacts, and restores any pre-existing file that was modified, renamed or deleted, with a notice in the project. The CLIs receive their write tools over the project and the instruction not to touch what exists; the guarantee comes from MADRE's restore at the end, not from the rule beforehand.

**EDIT under the hood.** Before the turn, a real commit under `refs/madre/checkpoints/` that does not touch your branch, your index or your stash. During the turn, `.git/`, `.pulse/`, `.madre/`, the `.env` files and `.claude/settings.local.json` are read-only at the file-system level and get their permissions back when it ends. Afterwards, the list of added, modified and deleted files, and `UNDO` restores the restore point. Unlocking `#3` asks for the project name; unlocking `#4` asks for it twice. In `#4` each CLI receives its command tool (Codex without a network sandbox, Claude `Bash`, Gemini `run_shell_command`, OpenCode `bash`) and the instruction to say in one line what is going to go out and where before it does.

**Permission request.** If a plan in `#1` reaches a step that wants to create something, the project stops and asks: `GRANT ONCE · GRANT FOR PLAN · DENY`, with a three-minute timer. Only the human grants; a permission written by an agent inside the conversation does not count. A step that asks for `#3` or `#4` also stops: it is unlocked with the key for that mode and that agent. Granting it for the plan does not unlock the other agents.

**A permission with a time limit.** An agent that needs more asks for it in one line with the mode and for how long ("I need #3 for 15 min: …"). Its reply carries a card with the mode, the time it asked for and the options available (#3: 5, 15 or 30 min; #4: 5 min) or just that message; the key opens that window for that agent.

**Copilot.** The robot next to mode · model · effort. It is turned on with the `#3` key, once, for 30 min, 1, 4, 8 or 24 h; `STOP ALL`, turning it off or a restart end it. While it lasts, a message in `#3` does not ask for the key and goes to the agent you are writing to, even if its Max mode is `#2`, as long as its CLI can write. That agent edits the project, builds plans and gives each step up to `#3`, and the commands it asks for that are safe —reading (`ls`, `cat`, `rg`…), tests and builds (`npm test`, `npm run build`, `node --test`, `pytest`, `go test`…), local git (`status`, `diff`, `log`, `add`, `commit`)— run on their own and their result goes back to it; any other line waits for your button. What it deletes comes back when the turn ends, it never touches `.git/`, `.pulse/`, `.madre/` or the `.env` files, and `#4` still asks for its own key. After eight rounds of commands without you writing, it stops and lets you know.

**Mode per step.** An orchestrator can ask for each step's mode: `@codex #2: crea la página`, `@claude #3: arregla el router`. Without a number, the step only reads, or creates if the plan can already create: `#3` is asked for by name. MADRE respects each agent's `MAX MODE`. With your message in `#3`, the orchestrator's word is enough for a `#3` step; with your message in `#1`, a `#2` step goes through the permission request and `#3` or `#4` asks for your key. A `#4` step always asks for that agent's key, even if your message is in `#4`.

**Two controls per agent.** The Max mode, in Settings → Permissions, says how far a message addressed to each agent can go; the Starting mode, in Settings → Agents, says where it starts: `#1` read-only until you arm CREATE, or `#2` so that every turn can add files without asking. Separately, two abilities: generating images and web.

**Commands an agent asks for.** With the **Commands** module on, an agent in `#1`, `#2` or `#3` that needs a command it cannot run (the tests, a build, a linter) ends its reply with a `pulse-run` block: the reason on the first line and one command per line, each with `$`. MADRE shows each line as a button and runs nothing until you press it. Each line runs on its own, from the project root and **without a shell**: what you read on the button is exactly what runs, so lines with `|`, `&&`, `;`, redirections, `$VARIABLES`, wildcards, `~` or `cd` are shown with the reason and cannot be run. Before running, MADRE takes a restore point; the output stays in the project as a collapsed card and, once all the lines that can run have run, **it goes back to the agent that asked for them** in a turn of its own, with the mode it had (up to `#3`; from the phone, up to `#2`), what it was answering and each line's output. If that agent is still answering, it waits; `STOP ALL` holds it. **Run all** runs the lines one after another and **Hand back what ran** delivers what there is without the rest. If the command changed files, `UNDO` brings them back. Whatever the command sent off the machine does not come back. One command at a time, ten minutes at most, and `STOP` on its card or `STOP ALL` stop it. A command that opens a port is a server: it has no time limit, its card says where it listens and opens it in YOUR SERVERS, and while it serves you can run another command. Agents know that a server for the project listens only on `127.0.0.1`. In `#4` the agent runs its own commands and is not shown the block.

---

## WHAT EACH AGENT CAN DO

| | Reads the project | Receives images | Creates files, scoped | Generates images | Web |
|---|---|---|---|---|---|
| **Codex** | yes | `-i` | write sandbox | yes, native, with its ChatGPT account | `web_search` |
| **Claude Code** | yes | reads the path | per-path permission rules | yes, with **Images** | WebFetch / WebSearch |
| **Gemini CLI** | yes | `read_file` | per-pattern policy | yes, with **Images** | `google_web_search` |
| **OpenCode** | yes | `-f` | per-pattern `edit` permissions | yes, with **Images** | webfetch / websearch |
| **@madre** | the memory | no | no | no | no |

**Images** is a MADRE module: its own MCP server that exposes `generate_image` on top of the Gemini API's image models, with your own key and your credits. Today **only Gemini**, and for a reason: it is the only agent account whose key MADRE already finds without asking you for a new one, and it has a free tier. Anthropic does not generate images —Claude reads them, it does not make them—, the ChatGPT account Codex signs in with does not give access to the images API, and OpenCode depends on the provider you point it at. It is connected to Claude, Gemini and OpenCode only inside a CREATE permission with the image scope turned on, in their isolated homes, and the image lands in the turn's folder like any artifact. `/image <petición>` sets up the permission and routes to the agent that can generate. With all four agents you can ask for an image; Codex makes it with its own tools, the others with Images.

Web access is a permanent per-agent permission, off by default, turned on in Settings → Agents, with Web access.

---

## PLANS

An agent can put the others to work. If you ask it to coordinate, it ends its reply with a `pulse` block, one step per line:

```
@gemini: Sintetiza en un párrafo quién es el autor, separando hechos de inferencias.
@codex: Misma pregunta; señala la afirmación menos sustentada.
@claude: Compara ambas síntesis y marca dónde divergen.
```

MADRE runs the steps as normal turns: each one stays in the ledger and goes through handoff, budget and timeout. After the replies, the orchestrator gets a wrap-up turn even if it did not write it as a step. It can propose the next stretch if there is still work within the permissions granted; MADRE allows up to three stretches per request. Delegates do not open plans of their own. Each stretch has at most four steps plus the wrap-up.

**TURNS.** In Diagnostics, next to the sentinel. On by default: a conversation that is still working when you open another one does not stop, it keeps writing its record and the conversations panel marks it until it finishes. Two limits: conversations working at the same time (2) and turns at the same time in each one (3); a message that would exceed them is rejected with the reason before it starts. All conversations share a single holder of EDIT or FULL ACCESS. When it is off, a single conversation drives the agents and you cannot switch away from one that is working. `STOP ALL` stops them all.

**STOP ALL.** The button in the bar, `STOPALL` in the Write box or `curl -X POST http://127.0.0.1:4317/api/stop-all` stop all plans and kill all agent processes. Diagnostics warns in red when the project gets out of hand: three agents at once, one agent with two overlapping turns, a plan longer than five minutes.

---

## MEMORY

Everything said outside INCOGNITO is indexed alongside the ledger, in `~/.pulse/rooms/<sala>/memory.sqlite`. None of this needs a command: it happens on its own.

**Recall.** When the conversation exceeds the context window, each turn receives the earlier exchanges that match the request, quoted with their sequence number, for any agent.

**Distilled notes.** Every ten exchanges or after ten minutes idle, the archivist reads what has not been distilled and saves up to five typed notes: decision, fact, preference, open question. The archivist is the cheapest allowed agent; with Ollama it is the local model and costs nothing.

**By meaning.** With Ollama (`nomic-embed-text`) or with a Gemini key, exchanges and notes are embedded in the background; a question in Spanish finds a decision written in English.

**Tools.** Each turn has the `pulse-memory` MCP server attached: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `project_state` and `memory_note`, which saves a note when you explicitly ask to remember something. The bubble shows `◉ memory saved`.

**Memory map.** The memory as a map, behind the project name: MADRE is a beating red sun, each memory a planet in the color of its type, joined by pulsing veins. You can navigate it and read it, and the only thing you can do to it is delete, with double confirmation. Eight taps on the heart activate the Temporary lock and seal the archive for ten minutes.

**Neural mode.** The **Neural** key in the header of the Memory map and the Project map draws the same network as the neurons of a brain: each memory is a point of light in the color of its type, the links are thin axons, and only the paths a pulse travels and the neuron it reaches light up. The core (and, in the Project map, the Coordinator) is the central bulb of that brain, with its stem, and it beats. Turning it on, the light runs out from the core and reaches every neuron in turn. It shows the same and costs a fraction: no surface shaded point by point, no nebula, no stars. When the computer does not give the map the frames it needs, the key invites you to try it, once a session; you choose when to use each mode. The choice is remembered for Home and every project (`pulse.neural` in `~/.pulse/looks.json`).

**@madre.** With Ollama and a chat model, the memory speaks: `@madre` answers from the whole archive with `[#n]` citations, says when the project never discussed something, does not write or run anything, and summons the agents if you ask it to. Its tokens are local and do not count. When there is a model trained on the project, it uses it.

**Settings.** Settings → Memory: who distills, who may, how often, where embedding happens, how much context recall can take up. All in `~/.pulse/config.json`, without restarting.

**Privacy.** A CLI runs with its own private context and can write it into a reply. In Settings → Privacy you name the terms that must not travel through the project: MADRE replaces them with `[ENTIDAD-ORG]` before they reach the ledger, the archivist, the other agents or the dataset, and Erase private data cleans what the project already had. The terms live in `config.json`; the project only records how many there are.

---

## YOUR MODEL

The project gathers training material while you work. `MEMORY` shows live how many clean pairs it has toward a LoRA, with 300 as the goal: human→agent turns, plan steps and distilled notes; left out are `@madre`'s replies, canned replies and whatever you mark as a bad reply with each bubble's thumb.

`EXPORT DATASET` writes `train.jsonl` and `valid.jsonl` next to the ledger, redacted. The `TRAIN` card brings the commands already filled in with your project folder and the base model that fits on your machine. Training runs outside MADRE, with mlx on Apple Silicon; the recipe lives in [`docs/training/`](training/README.md). As soon as Ollama has a `madre-<proyecto>` model, `@madre` answers with it and the other CLIs are told to ask it first: the project's memory stops costing tokens.

**Ollama.** If it runs on the machine, MADRE uses it without any configuration: local smart search, local archivist, `@madre`. The Local AI module, in Modules, shows the server, models and roles, downloads the recommended ones and lets you turn off each role. The model it offers comes from your hardware, not from a fixed rule: the "Your computer" block reads the Apple chip and its shared memory, the NVIDIA card and its video memory, or the processor alone, and shows each Qwen2.5 size (0.5B to 72B) with its minimum to run and to train (for example, `qwen2.5:7b` from 12 GB and `qwen2.5:3b` from 8 GB). With several downloaded, it uses the largest; it prefers general chat models over the `-coder` ones.

---

## WHAT IS SENT

Enter the **Memory map** from the Diagnostics header and click the core, the star in the center. Every turn, the project writes a document on your behalf and hands it to a process; until now that document existed only for the instant the process read it. There it is in full: block by block, with what each one weighs and the exact words the agent receives.

Change who it goes to and the words change; raise the mode and the permission it would be given appears, written out —without creating a folder or taking a restore point to show it—. Asking what the project would say is not the project saying it: nothing is counted, nothing is saved, nothing goes out. And it is read, never written: what MADRE promises about the agents is true because those words are fixed.

**THE LAUNCH.** Below the document, the exact command MADRE would run to deliver it: the executable, the directory, every flag and the place where the briefing goes in. It is not a description — it is built by the same adapters that would build it for real. Below that, what keeps the run inside the turn (the session that does not persist, the temporary home that is deleted when it ends) and the MCP servers it could call, with their tools counted. **No environment value from that command is ever printed, only the names**: a command line is something people take photos of.

**Outbound.** The record of what went out: every destination MADRE or an agent called, with its count. Never bodies, headers or query values — only where and how many times.

**The console.** Inside the core, Diagnostics answers from what the project already has. Three answers it does not understand and the interface closes.

## DIAGNOSTICS

The button in the bar opens the diagnostics screen. Type a symptom, an agent or a word and Diagnostics ranks the conditions recorded in this project against its catalog, with the remedy for your operating system; when the project can apply it, the remedy comes with Apply. The same catalog in the terminal: `madre doctor --catalog [texto]`. Each CLI's session, the modes, the abilities, the timeouts, the memory and privacy are in Settings.

| In the header | What it does |
|---|---|
| Memory map (brain) | The memory as a map. It is also in the top bar |
| Settings (gear) | Opens Settings › Version and reports, where the sentinel lives: the failures no condition explains and the process crashes, with paths, users, emails and keys removed. Each report is read before it is sent; auto-reporting comes turned off |
| Not fixed? | At the foot of each remedy: reports that it did not work, with the condition's code |
| `?` | The five-stop tour, the same one that opens the first time. If you left the First steps list half done and hid it, it also brings it back |

---

## MODULES

`MODULES` in the bar lists the available ones and their status. None of them writes to the project except the Continuity install, which shows the command and asks for confirmation.

| Module | What it adds |
|---|---|
| **Git** | `/git status`, `/git log [n]`, `/git diff`, `/git branches`: facts about the repository as a card in the thread, which the agents also read. `/git commit "mensaje"` and `/git push confirm`: your hand on the repository, with a preview of what would go out |
| **Images** | `generate_image` for Claude, Gemini and OpenCode, with your Gemini key, inside CREATE |
| **Preview** | The viewer renders HTML, SVG and Markdown in a sealed frame, with automatic reload |
| **Local AI** | Smart search, archivist and `@madre` locally, free and without an account. It is installed, woken up and downloads its model from Connect your agents |
| **Test browser** | A headless browser in turns that ask to see, test or capture a page. It only reaches this MADRE and the servers you started from COMMANDS: open the Preview or the served app, click, read the console, screenshots to the turn's scratch area. When you turn it on, MADRE checks that the server starts with its browser. Requires `@playwright/mcp` |
| **GitHub** | `/gh`: open pull requests, your branch's CI and open issues as a card. `/gh pr [n]`, `/gh ci`, `/gh issues`. `/gh pr create "título"`, `/gh comment <n> "texto"` and `/gh issue "título"` first show what would be published and only publish with `confirm`. Agents read in any mode and write only in `#4` FULL ACCESS. It signs in with your `gh` session; without it, with a fine-grained access token stored in MADRE's vault |
| **Commands** | An agent asks you to run a command its mode does not let it run; each line is a button, runs without a shell from the project root, with a restore point before, and when it finishes the output goes back to the agent that asked for it so it can continue. A command that opens a port is a server: it keeps running until you stop it from its card, and while it serves you can run another one. It costs about 300 tokens of instructions per turn below FULL ACCESS while it is on |
| **Token saver** | The project's token economy. The switch asks the agents for replies in compact prose; the rest is always on and goes unnoticed: the briefing carries only the blocks the turn can use, what never changes is read first so the cache recognizes it, and the transcript stays still instead of sliding. Nothing you write is altered. In its window, in Modules, you can see where the tokens go |
| **Suggested effort** | Under the box, how much Claude Code or Codex should think for the message you are writing: go up when the request seems to need more, go down only when it has been seen or measured that it is enough. It learns first from your real use, without spending tokens: it reads in the project's record which level you used for each kind of request and whether it was enough (you moved on to something else) or fell short (failure, bad rating or you asked again within 15 minutes); that reading lives only in memory. The quick and full tests on its card measure faster, with real questions from the project and a blind judgment, which level is enough for each kind of question. The measurements live in `~/.pulse/rooms/<sala>/intents.jsonl`. Nothing changes on its own |
| **Continuity** | Optional external integration: verified project state, checkpoints and handoffs in `.ahp/`; `/ahp status`, `/ahp check`, `/ahp context` |

**Outside tools (MCP)** (formerly "Conectar MCP") lives in each project's **Settings › Outside tools (MCP)**, not in Modules. Add an MCP server by local command or by web address (no session, with a token or signing in with OAuth: MADRE registers as a public client, with no secret, and the callback lands in the project itself), or bring it in from `.mcp.json`, `opencode.json`, Claude Code, Codex, Gemini CLI or Cursor; when importing, only the names are read and the values go to the vault. Before handing it to a turn, MADRE starts it and asks for its tools: if it does not respond, it stays out and its row says why. Tools the server marks as read-only are available from `#1`; the ones that act, from the mode you choose per server (`#4` if you do not lower it). All four CLIs start the same MADRE intermediary (`src/mcp/proxy.mjs`), which reads the secrets from the vault, lets through only the allowed tools and speaks HTTP with remote servers: no secret ends up on the command line or in a project file. The list lives next to the project's record (`~/.pulse/rooms/<sala>/mcp.json`).

Each module is one file. Yours go in `~/.pulse/modules/` (all projects) or in `<proyecto>/.madre/modules/` (that project): an `.mjs` with `export default { … }`, no build or registration, with a switch, settings, `/nombre` commands, MCP tools for the agents and its own routes. `RELOAD MODULES` reloads it without restarting. Guide and ready-to-copy example in [`docs/SDK.md`](SDK.md). How to write one, in [CONTRIBUTING.md](../../CONTRIBUTING.md#writing-a-module).

---

## HOME · ALL YOUR PROJECTS

**Home** brings together all your projects: the three-circles key at the start of the bar. It shows the projects open on this Mac (who is waiting for you, who is working, their latest conversation and how many memories they keep, by type) and the **asleep** ones: closed projects whose folder is still on disk. The full plan lives in `docs/MACROVERSO.md`.

| In Home | What happens |
|---|---|
| **Open** | Takes you to that project on its port; with ⌘ it opens alongside |
| **Close** | Stops what is running in that project and closes it, like `Ctrl+C` in its terminal. It asks first |
| **Wake** | Opens an asleep project the way `madre start --project <carpeta>` would; what it says on startup stays in `start.log`, next to its record |
| **Stop all** | Stops all the agents in all the projects |
| **Remove from MADRE** (⋯ on its card, or right-click) | Takes it out of Home. If it is open, it closes it first, and ends its connections. Its folder on the Mac is not touched, and its memory stays in MADRE: if you add it again, it is there. It asks first |

In a project, the key next to the house **switches project**: its indicator says who is waiting for you (a number), who is working (it pulses) and who finished while you were in another one (green). It opens a panel with the other open projects; one click takes you there and ⌘-click opens another tab. It reads this from `GET /api/salas/open`: the open rooms, each with its summary and without the census; this Mac only.

**The Project map**, from Home on a screen 900 px wide or more: your projects in open space, and each one is a Memory map drawn by the same engine as its project's (`public/nostromo-engine.js`). Drag the space to move it, scroll to zoom in, **Recenter** to go back home. Click or ← → to fly to one: the chosen project is the only one alive, with its magma and its pulses; drag it to rotate it, tap a memory to read it in the card, Esc to let it go and Esc again to go back. From afar each project is read from its own process without the words of its memories (`GET /api/salas/universe?id=`); only the chosen one asks for them (`&full=1`).

**Connections.** A connection is a contract between two projects that you sign in Home (**Connect projects**, or by dragging one project onto another in the Project map): who reads from whom (or both), which types cross over and until when. Only distilled notes that travel to turns cross over (hold and bridge), cleaned by the privacy guard of the project that delivers them; never the record, files, keys, medbay or airlock; and read-only. In the project that can read, each turn carries the `pulse-enlaces` MCP server (`enlace_rooms`, `enlace_search`); without a contract it does not exist. Signing and revoking leave a line in both projects; each read is counted (`enlace.read` in the one that delivers, `enlace.received` in the one that reads) and can be seen in Home and as pulses on the connection in the Project map.

**Who read.** Each read belongs to a turn: the tool states its agent and its turn, and the reading project checks that the turn is running there, for that agent and above INCOGNITO; if not, it reads nothing (and does not say whether the connection exists). The read is recorded with its agent and its turn in the project that reads, with the agent in the one that delivers, and under that turn's reply a line says "read 3 notes from gumball". In Home, each connection says who read last.

**Always include.** One checkbox per connection, off by default, on the signing sheet and on each connection in Home. When checked, each turn of the reading project receives, without asking for them, up to 3 notes from the other project that match the question (in a block of the prompt, "recalled 3 notes from gumball" under the reply). Each such turn counts as one read against the connection's hourly cap; past the cap, the turn continues without notes. Never in INCOGNITO, never for `@madre`, never in the Coordinator's project. Only you check or uncheck it, from Home; the Coordinator never checks it on the connections it signs.

| Route | What | Who |
|---|---|---|
| `POST /api/salas/enlaces` · `POST /api/salas/enlaces/revoke` | Sign and revoke. Two projects connect only once: while there is a current connection between them, in either direction, signing another one returns 409 | The Home page |
| `POST /api/salas/forget` | Remove a project from MADRE: closes it if it is open, revokes its connections and sets its `project.json` aside as `project.forgotten.json`. Never the Coordinator's | The Home page with its `Origin`, never a process |
| `GET /api/tour` · `POST /api/tour` | The 1.0 tour: whether the bonjour is due, whether the person comes from 0.7.2, chapters read, where they left off, hints seen. Saved in `~/.pulse/tour.json`, one per person, not one per port | The pages on this Mac |
| `GET /api/looks` · `POST /api/looks` | The appearance that Home and all projects share: theme, accent, background and its two dials, bubbles and text. Saved in `~/.pulse/looks.json`, one per person; each page reads it when it opens and when it becomes visible again, and writes it when it changes. What Home chooses for its cards stays in its browser | The pages on this Mac |
| `GET /api/looks/wallpaper` · `PUT /api/looks/wallpaper` · `POST /api/looks/wallpaper/frame` · `DELETE /api/looks/wallpaper` | Your own wallpaper (1.0.3): one for every page, in `~/.pulse/wallpaper/`. The page fits it (2880 px on its longest side), encodes it and takes its colours for the veil, the mesh and the tint; the server keeps only a WebP, JPEG or PNG picture of up to 8 MB, recognised by its first bytes (never SVG), and serves it with its type and `nosniff`. `GET /api/looks` includes it as `custom`; each page still chooses it or not (`pulse.wallpaper` = `custom`) | The pages on this Mac |
| `GET /api/tour/projects` · `POST /api/tour/projects` | The 0.7.2 projects that Home cannot list (without `project.json`) and bringing one in: its folder is looked up by name in the usual folders and confirmed by the hash of its id. Projects removed on purpose do not come back | The pages on this Mac |
| `POST /api/override/arm` | The #3 and #4 key, checked by the project (`src/override.mjs`): what was typed, once or twice, and a pass for that agent and that mode. A message at #3 or #4 goes out only with its pass; without a remembered permission it opens one message, with it, as many as fit in its minutes. STOP ALL and a restart revoke them. Eight wrong keys in one minute return 429. The phrase's fingerprint never goes out through `GET /api/settings` or `/api/state` | The pages on this Mac |
| `GET /api/copilot` · `POST /api/copilot` · `POST /api/copilot/off` | The copilot: whether it is on and until when; turning it on with the `#3` key (`{ minutes, words }`, 30 to 1440 min) and turning it off. A message with `copilot: true` in `#3` goes without a pass while it lasts; when off it returns 409 with `copilotOff`. Never from a phone | The pages on this Mac |
| `POST /api/runs/return` | Hand back to the agent what ran from its command request without the rest (`{ responseMessageId }`). When all its lines run, it is handed back on its own | The project's pages |
| `GET/POST /api/x/mcp/servers` · `POST /api/x/mcp/servers/<id>/check · toggle · actions · remove · signin` · `GET/POST /api/x/mcp/import` · `GET /api/x/mcp/oauth/callback` | Outside tools (MCP): the list without values, add and check, turn on, from which mode it acts, remove (with its secrets), sign in with OAuth and its callback, and what can be brought in from other apps | The pages on this Mac; the OAuth callback, the browser |
| `GET /api/enlace/memories` | What this project delivers under a contract: only `travels()` and the contract's types, redacted; 404 if the contract does not serve whoever asks, 423 sealed, 429 over the cap | Another MADRE process with the channel key (`~/.pulse/credentials/enlaces.json`), without `Origin` |
| `POST /api/enlace/ask` | What this project asks of another; only for a turn running here (409 if not); records `enlace.received` with agent and turn | A turn's `pulse-enlaces` server, with the key |
| `POST /api/salas/enlaces/recall` | Check or uncheck "Always include" on a connection | The Home page, never a process |
| `GET /api/enlace/corpus` | (D-S15) Everything this project lets the Coordinator learn under a contract with `train`: the notes that travel, of the contract's types, up to 5,000, redacted; 404 if the contract does not allow it, 423 sealed, 429 over its cap of 6 an hour | The Coordinator's room, with the channel key, without `Origin` |
| `POST /api/salas/enlaces/train` | Check or uncheck "The Coordinator learns from it"; unchecking it deletes the copy Salas kept | The Home page, never a process |
| `GET /api/enlace/state` | (D-S16) This project's canonical Continuity (AHP+) state under a contract with `state`: objective, phase, next step, blockers, last handoff, accepted decisions and what is open, redacted; `state: null` without `.ahp/`; 404 if the contract does not allow it, 423 sealed, 429 over `perHour` | The reading room, with the channel key, without `Origin` |
| `POST /api/enlace/deliver` | (D-S17) Notes the reading room delivers under a contract with `deliver` (1 to 5, of the standing kinds, 600 characters); they wait in the inbox; 429 over `perHour` or with 50 waiting | The reading room, with the channel key, without `Origin` |
| `POST /api/enlace/ask-state`, `POST /api/enlace/send` | The asking side of the above, for the `enlace_state` and `enlace_deliver` tools of a turn running here | A process of this Mac with the key and a live turn |
| `GET /api/enlace/inbox` · `POST /api/enlace/inbox/decide` | (D-S17) The notes delivered to this project, and accepting or declining one; accepted, it enters the memory (`origin: 'delivered'`) | The project's page, or one of its agents in #3/#4 with the key |
| `POST /api/salas/enlaces/allow` | (D-S16, D-S17) Check or uncheck "It shares its state" (`state`) or "It receives delivered notes" (`deliver`) | The Home page, never a process |
| `POST /api/madre/shutdown` | Turn MADRE off: asks every open project to close the way Home closes one, waits up to 15 s and closes itself; answers `closed` and `stuck` | Only MADRE's own page on this computer (its own `Origin`), never a process or the phone |
| `GET /api/home-layout` · `POST /api/home-layout` | Home's arrangement in `~/.pulse/home.json` (widgets, project order, pinned bar, cards), the same from any port | The Home page |
| `GET /api/x/bishop/exam` · `POST /api/x/bishop/exam` | (D-S18) The last exam of the Coordinator's local model and whether it still holds for the model in use; starting it (it runs in the background) | The Home page |
| `POST /api/enlace/notice` | The Diagnostics line when signing or revoking | The project that serves Home, with the key |

Contracts live in `~/.pulse/config.json` under `enlaces` and the crossings in `enlaces.jsonl` next to each project's record.

Each project remembers where its folder is (`project.json`, next to its record); a project last opened with an earlier MADRE appears when it is opened again.

**The Coordinator's project.** `madre salas` opens a project that lives in a MADRE folder (`~/.pulse/salas`, created the first time): the front door when you are not in any project, and also what plain `madre` opens from your home folder. It is a project like the others —its conversation, its memory, its modes— and in Home it comes first, with its badge. Its bar carries the **Project map** key. It never delivers notes through a connection, and it is the only one that can receive permission to give orders to another (the signing sheet asks for it with that project's name).

**The Coordinator**, the guardian of your projects, lives in its own project: that is also where what it knows about all of them lives (contracts, census and notes from the connected projects). In its MODULES card you choose which ready agent speaks for it (`@madre` by default if Ollama is ready) and its orders mode. With `@madre`, the Coordinator only answers: it does not propose orders or connections. With any other agent, if you ask it to act or connect, it closes its reply with a `pulse-salas` block: the reason, up to 4 orders `@sala/agente #modo: tarea` and up to 2 connections `enlace A → B: tipos; 7 días; órdenes #1`. The project turns it into a card with one row per order and per connection. If a question needs a project with no connection, the Coordinator proposes the connection on its own.

| Mode (Coordinator card) | `#0`–`#1` | `#2` | `#3`–`#4` | Connections |
|---|---|---|---|---|
| **Manual** (default) | Waits for **Send** | Waits for **Send** | Reaches its project as a proposal | See below |
| **Hybrid** | Goes out on its own within the contract | Waits for **Send** | Reaches its project as a proposal | See below |
| **Automatic** | Goes out on its own within the contract | Goes out on its own within the contract | Reaches its project as a proposal | See below |

| Rule | Where it is enforced |
|---|---|
| Only the Coordinator gives orders, and only in reply to a message you wrote in its project; never in reply to a question brought from another project | The module, in the Coordinator's project |
| A read-only connection, without orders, is signed by the Coordinator when it proposes it, for 7 days at most; the row says "Signed by the Coordinator" and has **Revoke**. In the card, "Connections to read: you" leaves them all to you. A connection with orders, which allows editing, is always signed by you: **Sign** on its row, with the name of the project that would receive orders. Once signed, the plan's orders that were waiting for it are released | The contract (`src/enlaces.mjs`) and the same signature as the Home sheet |
| An order reaches up to the mode the contract signed and never goes beyond `#2`. `#3` and `#4` reach their project as an **Unlock and send** card, which writes it into the box; when you send it, the project asks for the usual key. Home shows it as "Waiting for you" | The receiving project |
| One order at a time per project; it never interrupts a project that is working; the contract's hourly cap on orders, counted separately from reads | The receiving project |
| What goes out on its own goes out once: if it cannot, it is held with its reason and waits for your button. An order that fails or a STOP ALL in the Coordinator's project stop the plan's automatic sending | The module, in the Coordinator's project |
| The ordered project answers in its conversation ("from the Coordinator · order n of m") and cannot build a plan or give orders. An order in progress is stopped from its row | The core: the order runs at depth 1 and without a plan |
| The reply comes back to the plan's conversation as a card (≤ 1200 characters, starts with the project and the agent) and does not start any turn; one line closes the plan | The Coordinator's project |
| An order or a question brought by the Coordinator is not your word: it does not go into the training dataset | `src/dataset.mjs` |

**Calling the Coordinator from any project:** `/bishop ¿qué decidió gumball sobre los pagos?`. If the Coordinator's project is asleep, it wakes it; the question runs there, with what the Coordinator knows about the connected projects, and the answer comes back to the project where you asked as a card **only for you**: that project's agents do not read it, because reading another project is what a connection does.

| Route | What | Who |
|---|---|---|
| `POST /api/x/bishop/send` · `skip` · `propose` · `stop` · `link` | Send, skip, take a proposal to its project, stop an order in progress, sign a proposed connection; the server acts on what it recorded, never on what the page says | The Coordinator's project page |
| `POST /api/x/bishop/order` · `proposal` · `halt` | An order, a `#3`/`#4` proposal or a halt arriving at the project it is meant for; the project checks key, contract, origin, mode, agent, busy state and cap | The Coordinator's project, with the channel key |
| `POST /api/x/bishop/result` · `consult` | The reply to an order, and a `/bishop` question | The project that obeyed or that asked, with the key |
| `POST /api/x/bishop/answer` | The answer to `/bishop`, as `bishop.answer` | The Coordinator's project, with the key |

Plans live in `bishop-plans.json` next to the record of the Coordinator's project (the last 40) and each order received is counted in `enlaces.jsonl` of the project that received it.

---

## WHAT LEAVES THE MACHINE

- **No cloud, no account.** MADRE has no account and no backend that stores your things. It does not store provider credentials.
- **What an agent reads travels to its provider.** Codex to OpenAI, Claude Code to Anthropic, Gemini CLI to Google, OpenCode to whatever it is configured with. If `OPENAI_BASE_URL` or `ANTHROPIC_BASE_URL` changes that destination, MADRE shows only the hostname and blocks the turn before building the briefing; a verified gateway is authorized per agent with `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS`. The account, limits and terms of the effective destination apply. `@madre` and the archivist with Ollama do not leave the machine.
- **A daily notice that it is still in use, always on.** Once a day each copy tells madre.run that it is in use: a random identifier the copy created for itself (`~/.pulse/install-id`), the MADRE version, the operating system and the Node major version. Nothing else: no name, no email, no project, no paths, no agents, nothing of what is said in a project; madre.run does not keep the IP. It is how the author knows how many people use MADRE, which versions are running and whether they come back. It goes out through the same record as everything else, so it appears in "What is sent". Without a network, it fails silently. (`src/heartbeat.mjs`)
- **Two sends of its own under your switch.** The sentinel, off by default, sends redacted reports to the project's collector. The release channel, on by default, asks npm for the latest version: only the package name travels, the same request `npx` makes. `PULSE_UPDATE_CHECK=0` turns it off.
- **Writing.** In `#1` no one writes. In `#2` things are only added: what existed is restored when the turn ends. In `#3` the whole project except the forbidden zones, with a restore point and `UNDO`. In a project without git, MADRE keeps its snapshots in a shadow repository outside the project. A command an agent asks for is run by you, with a restore point before and `UNDO` after.
- **Memory.** Everything said outside INCOGNITO stays in `~/.pulse/rooms/<sala>/` and comes back into the prompts of all the agents in that project. INCOGNITO is the way out for what must not be remembered; PRIVACY, for names that must never appear.

---

## REFERENCE

**`~/.pulse/config.json`**, or `PULSE_HOME/config.json`. Diagnostics writes it; environment variables take precedence on the next start.

```json
{
  "opencode": { "model": "openai/gpt-5.6-sol" },
  "timeouts": { "default": 300000, "claude": 600000 },
  "room": { "softTokenBudget": 500000, "delegation": true, "maxPlanSteps": 4 },
  "memory": { "archivist": "auto", "every": 10, "idleMinutes": 10, "embedProvider": "auto", "recallShare": 0.3 },
  "privacy": { "terms": [], "marker": "[ENTIDAD-ORG]" },
  "updates": { "check": true },
  "telemetry": { "autoReport": false }
}
```

**Environment variables**

| Variable | Default | Effect |
|---|---|---|
| `PULSE_HOME` | `~/.pulse` | Root of the projects and the config |
| `PULSE_LANGUAGE` | from the config, otherwise `es` | `es` or `en`; takes precedence over the config and over what the browser remembers |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Local token budget per agent, rolling 5 h window |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Injected transcript window |
| `PULSE_RECALL_SHARE` | `0.3` | Share of the window for recalled memory (`0` turns it off) |
| `PULSE_DISTILL` · `_EVERY` · `_IDLE_MS` · `_MAX_CHARS` · `_AGENT` · `_MODEL` | `1` · `10` · `600000` · `6000` · — · — | Note distillation |
| `PULSE_EMBED` · `PULSE_EMBED_PROVIDER` | `1` · `auto` | Smart search; `ollama`, `gemini`, `auto` |
| `PULSE_OLLAMA` · `_HOST` · `_MODEL` · `_EMBED_MODEL` | `1` · `http://127.0.0.1:11434` · the best · the best | Ollama |
| `PULSE_MEMORY_TOOLS` | `1` | `pulse-memory` MCP server on every turn |
| `PULSE_PRIVATE_TERMS` · `PULSE_PRIVATE_MARKER` | — · `[ENTIDAD-ORG]` | Extra hidden data and its marker |
| `PULSE_UPDATE_CHECK` | `1` | `0` turns off the daily npm check |
| `PULSE_GH` | `1` | `0` makes the GitHub module ignore the `gh` session and sign in only with the token you pasted |
| `PULSE_REPORT_URL` · `PULSE_AUTO_REPORT` | the project's collector · `0` | Sentinel |
| `PULSE_AGENT_TIMEOUT_MS` · `PULSE_<AGENTE>_TIMEOUT_MS` | `180000` · — | Timeouts |
| `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS` | — | Comma-separated list (`codex`, `claude`) of gateways the human verified and allows; without it, an unofficial base address is blocked |
| `PULSE_MAX_MESSAGE_CHARS` | `20000` | Maximum size of a message |
| `PULSE_DELEGATION` · `PULSE_MAX_PLAN_STEPS` | `1` · `4` | Plans |
| `PULSE_ESCALATION_MS` | `180000` | Permission request timer |
| `PULSE_OPENCODE_MODEL` | from the config | `proveedor/modelo` for OpenCode |
| `PULSE_CLAUDE_USAGE` · `PULSE_OFFICIAL_QUOTA` | `0` · `1` | Claude's official quota (reads the keychain); `0` turns off all provider reads |
| `PULSE_GEMINI_IDLE_MS` · `PULSE_GEMINI_RETRIES` · `PULSE_GEMINI_FALLBACK_MODEL` | `90000` · `1` · `gemini-2.5-flash` | Gemini under load |

How the ledger, the stream, the memory, the adapters and recovery work under the hood: [`docs/INTERNALS.md`](INTERNALS.md).

---
