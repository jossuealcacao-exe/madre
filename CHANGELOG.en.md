# Changelog

Every published version of `@jossuealcala/madre`. Dates in ISO format.

A version closes when it is on npm: until then its section is called **Unreleased** and it can keep growing. Each published version has exactly one `vX.Y.Z` tag, one GitHub release and one section here; the patch number can reach two digits (`0.2.10`) before the minor goes up. See `docs/ROADMAP.md` for the criteria on what bumps each number. This is the English translation of [CHANGELOG.md](CHANGELOG.md); the Spanish file is the original.

## 1.0.5 · Unreleased

- **Notes (new module, 0.1, free).** Notes in six colors on your project, each in a window you move around the canvas and size from its edges, like any other MADRE window. Each note carries three keys drawn alike, on the paper: arrange, the bin, which deletes it (with «Undo» in case it was a mistake), and the ×, which only closes it. They are turned on and managed from Modules, and their key can be pinned to the bar. Only you read them: no agent sees them and they are not kept in the project's folder. A large note adapts: the text grows with it, the colors stay at its foot, and one left larger than the screen comes back whole when it opens.
- **Reminders (new module, 0.1, free). An idea by Daniel Castillo.** When you write something you still have to do («I'll review the PR tomorrow», «remind me to call Daniel on Monday») or ask for the same thing on several days, a card appears under your message: «Shall I remind you?», with the time already chosen. One click saves it; «Another time» offers in an hour, this evening, tomorrow morning, on Monday or every day. If the project has the local AI, @madre reads the message first and drops what is not a task; no paid agent is asked. When it is due, Home tells you, in «Needs you» and when MADRE opens, and so does the project it came from. You can also ask any agent for one with `/reminders tomorrow at 5 call Daniel`. On its card you choose what to notice (what is pending, what you ask for often), whether the local AI reads it first, the hour when you do not say one and how long «later» is; each reminder can be moved to another time, and the done ones stay in a history to repeat or clear. The Market shows «Developed by Daniel Castillo».
- **Local AI: you choose the model, and everything lives in Settings.**
  - In Home › Settings › Local AI you choose the model every project uses: the one MADRE picks on its own or any of the ones you have installed. Below, other models that fit your computer (Llama, Gemma, Mistral, Phi and Qwen), each with a key to download it. The one recommended for your computer comes first and is marked.
  - Home governs the local AI of the whole computer, as it already does with the agents: the Ollama server, starting or installing it, the master switch and which projects use it.
  - In each project, Settings › Local AI has its switch for that project, the model in use and what it does there.
  - Local AI is no longer a module on the Modules board: every way that led to it now opens Settings.
- **Each project with its color.** The accent you choose in a project applies only to that project, and Home keeps its own. A new project starts with Home's (Madre Green, unless you changed it). The tiles of the project switcher and the projects pinned to Home's bar wear each one's color as a gradient.
- **Pinned projects: lit means open.** On Home's bar, a pinned project lights up in its color while it is open and goes dark when it sleeps. While it wakes, its color fills it from left to right, and it lights whole only once it is open. If something happens there, like an agent waiting for you, it pulses until you open it. It no longer carries a dot.
- **The Connections key no longer carries a number.**
- **MCP connectors, one press each.** Settings › Outside tools (MCP) brings a catalog of the best known services, checked against MADRE on October 20, 2026, and grouped:
  - **Docs and code, no account.** Context7, DeepWiki, Microsoft Learn, Cloudflare Docs and Hugging Face. MADRE connected to each one and read its tools.
  - **With your account.** Notion, Linear, Jira · Confluence, monday.com, Zapier, Sentry, Vercel, Netlify, Supabase, Cloudflare, Stripe, PayPal, Square, Canva, Webflow and Wix. MADRE found their sign-in; their tools are read the moment you sign in on their own page.
  - **With a token.** GitHub, with a link to make one.
  - Each connector carries its service's logo and color. The drawings come from Simple Icons, CoreUI Brands and SVG Logos (CC0) and from VSCode Icons (MIT); DeepWiki carries Devin's mark, from the same makers. The marks are their owners': TRADEMARKS.md says so and NOTICE carries the MIT notice.
  - Any other MCP server, yours or a third party's, still goes in with «Add a tool» or is imported from your apps. Every connected tool has **«Check the connection»**, which says how many tools answer.
- **An MCP server that leaves its answer open now works.** Some online servers (DeepWiki, for one) answer through an event stream they never close. MADRE kept waiting and the tool showed as «did not answer». Now it takes the answer and goes on.
- **On Linux, MADRE no longer says «Mac».** Someone opening MADRE on another computer from a Mac saw «Found on this Mac», because the page took the browser's system for the machine's. Now the machine MADRE runs on tells the page, and off a Mac MADRE uses the machine's name: «Found on cotizapp2», «The projects on cotizapp2». Hardware named on purpose («Mac with an Apple chip») stays as it is.
- **Shortcuts name the keys of your keyboard.** «⌘S» and «⌘ ,» read «Ctrl+S» and «Ctrl+,» when you are not on a Mac. And **⌘ , (Ctrl+,) opens Settings in Home too**: it said so and did nothing.
- **Each agent's session is explained in your language.** What each agent's app said about its session showed as it came («not logged in», «via API key»). Now it is translated, and when it only repeats what the card already says («Not signed in»), it is not shown.
- **The test browser turns on even when it is missing.** When it was not installed, Settings locked its switch and asked for two npm commands, in English. Now you turn it on and MADRE installs what is missing (it takes a few minutes), as it already did when turned on from Modules. Only on Windows does it still ask you to install it, and in your language.
- **More of the modules' words in Spanish.** The settings of Images and of the test browser, «the project is a git repository», the notice of Ollama being off and the «still running» line of a long install.
- **Notes and reminders from any agent.** Write `/notes` or `/reminders` (in Spanish `/notas` and `/recordatorios`) in the box, or ask in your own words («take a note…», «remind me…»), and the agent makes them: the note opens in your project as soon as it finishes answering, and the reminder shows in Home and in the project when it is due. The agent can only make them: it does not read, change or delete your notes. It gets that tool only when you ask, so it costs no tokens in your other messages.
- **STOP really stops @madre.** Stopping an answer from @madre left the local AI thinking, and the answer showed up anyway. Now it is cut on the spot. And an answer an agent hands in after you stopped it is no longer posted.
- **The project's desktop no longer scrolls.** A notice, a menu or a window reaching past the edge made the whole desktop move, wallpaper and all. Now only the conversation scrolls.
- **The Token saver box no longer blinks**, so it does not compete with the pulse of the bottom bar.
- **Settings › Version shows this copy's identifier**: the random number that is all the daily usage notice says about it, in sight, with a key to copy it.
- **«Active» instead of «Calm».** That is now how an open project with nothing running is described, the Coordinator's too.
- **A module's answer looks like the module's.** What a module's command returns (the Work report, for one) no longer looks like a terminal: it carries the module's icon, a readable title in your language and its key in your accent color. Notices' keys use your accent too. When the answer carries a key (printing the Work report), it sits on the title's row and the card keeps its pill shape.
- **Every Settings icon moves on hover**, each in its own way, in a project and in Home. Before, only Local AI and What it remembers did.
- **Icons that move on hover.** In Token saver, the arrow goes down. Local AI has a new icon, a fine-lined network of nodes that turns once on its own axis. In Suggested effort, the needle sweeps from left to right as when accelerating. In What it remembers, only the pieces that leave the central square turn. A key that is on (Files with its panel open, Servers, Conversations, Settings) no longer repeats its animation on hover.
- **Home's windows scroll inside.** Settings keeps its head, and a long section, like Local AI, is read inside the window instead of running off its bottom. The same in Home's other windows.
- **The Market, easier to find and to read.**
  - In Modules, the Market key has its basket. The first time you open Modules, a card invites you to discover it.
  - Each module shows three pictures: what it does, the module at work in a project, and the steps to use it.
  - Each module says its version. The ones that come with MADRE say «Comes with MADRE 1.0.5».
  - The descriptions were rewritten so they read without knowing about programming.
- **«Needs you» reads like «Waiting for you»:** one big number, calm at 0 and in your color when something needs you.
- **Cursor no longer shows «Not installed» when it is.** MADRE also looks for it in your user's folder, even when MADRE was opened from another one.
- **For module authors:**
  - The new `credit` field says whose idea it was. MADRE shows it on the module's card and in the Market («Idea by …»).
  - A module may write its name, what it does and its commands in both languages, `{ es, en }`, and MADRE shows the room's. With `ctx.language` the module knows which language to answer in. A Market module no longer shows up in English in a Spanish MADRE.
- **Connections, in neural mode.** Home's Connections map and its window use the neural mode's language: each project is a neuron with dendrites, each connection a slightly curved axon, and what crosses it travels as a signal of light, over a deep ground.
- **The Connections icon is a connector**, male and female, that plugs in on hover. The fill of Modules and Add widgets is now a soft tint that leaves air between the pieces.
- **Keys in one row.** In the Connections window, «Open the project» and «See the connections» sit together, and the side panel is a little wider so they fit.
- **Cursor not installed now has a way forward.** Its card in Settings shows the command of its official installer, to copy into a terminal, and a «Check again» key. The card of an agent without a session or not installed can now be folded too.
- **Home, cleaner:**
  - **Home's bar is as wide as what it holds.** No gap in the middle anymore: it grows with each project and notice and, when it no longer fits, folds what is left over without pushing anything out. The bar and its keys on the right sit together, centered. In a small window or a split screen, pinned projects no longer vanish: they fold into «+n» only when they really do not fit.
  - **New icons on the bar:**
    - The Market is a basket of modules that shakes and settles them.
    - The pieces of Modules fill one after another.
    - Add widgets has its own drawing (a wide piece, a square and a circle) and fills too.
  - **The dot of a project that waits for you beats softly** on the bar, on its card and on its pinned key.
- **Switch project, in your colour.** In the panel to switch projects, each tile keeps its initials on your accent colour, in a light gradient.
- **When OpenCode cannot answer because of its provider, the card brings the way out.** If a provider's key ran out of credit or is no longer valid, the error card offers a model that works on your computer: the last one that answered or, if there is none, one of OpenCode's own free models. It has two keys: **Retry on** that model (sends your message again) and **Use it always** (makes it the default). In Settings › Agents › OpenCode, the provider that failed is marked («No credit left» or «Its key is no longer valid») until it answers again. MADRE never switches models on its own.
- **Known agent failures are explained in your language.** When an agent fails for a reason MADRE knows, the red card still shows what the agent said, word for word, and below it explains what happened and what to do. Examples: the API key ran out of credit (what was happening to OpenCode with an Anthropic model), or Cursor's plan reached its usage limit. Those failures are no longer left «Not classified yet» in Diagnostics. «Cursor exited with code 1» now reads in Spanish too.
- **The option you choose stays marked.** On cards where an agent asks you to choose, the option you sent carries «Your choice» and the rest step back. It shows the same after a reload or in another tab.
- **STOP ALL has the shape of the other bar keys.** It is no longer a red pill of its own: at rest it is a quiet, disabled key, and when there is something to stop it turns red, without blinking.
- **Informing is not alarming.** «A plan is still running» and «another agent holds EDIT» are now calm Diagnostics notices, not red alarms, and they no longer arm the brake.
- **«1 message carried», not «1 messages».**
- **Paid modules in the Market.** A module can have a price: its page shows **Buy** (opens the Lemon Squeezy checkout in your browser) and **I have a license**, where you paste the key you get by email. MADRE checks it with Lemon Squeezy that one time and confirms it is for that module; from then on it works offline. Without a license a paid module does not install; with one, it updates itself like the rest. **Release** gives the activation back, to use the key on another computer. Only the key and a name made from MADRE's random install id travel, never your name or your email, and the request is on the list of what leaves your computer.
- **The project's history, for modules.** `ctx.services.history({ since, until })` gives what was asked and of whom, the answers, what each agent cost, the files each turn changed (and whether they were undone) and the memory's decisions. It only reads; what was said in GHOST is not there. It is in the SDK.
- **A module's card can open a page of its own.** A module's `/` command can return `link`, and the card shows it as a key that opens another tab. Only the module's own routes are accepted.
- **A module turned on in only one project now has its commands.** A module turned on from a project's Market showed as on, but its command said «not available» and it received no events from that project. Now MADRE treats it as on where it is on.
- **The Market no longer says «Free for now».**
- **@madre no longer makes things up in a new project.** In a project with no memory, @madre described files and features that did not exist and cited your own question as its source. Now, when there is nothing to cite, it says the room has not discussed it yet and suggests which agent to ask to read the code. This answer does not use the model and costs no tokens.
- **OpenCode works without an account.** OpenCode comes with free models of its own, but MADRE marked it «Signed out» and would not let you write to it. Now it shows as ready from the start, with the note «OpenCode's own free models, no account».
- **Your repository no longer takes MADRE's seal.** The `.pulse/` folder MADRE creates in your project holds MU/TH/UR's seal, and a `git add .` could push it to your repository. Now that folder comes with its own `.gitignore`, and the projects you already had get it the next time you open them.
- **The agents in Settings unfold where you click.** In Home › Settings › Agents, opening an agent moved the whole window and the card slid out from under the pointer. The list was also rebuilt every 2.5 seconds, and a click was sometimes lost. Now the window stays put, the agent you open shows in full, and the list only redraws when something changes. Home's project cards too: the «Open» button no longer changes while you press it.
- **No old news for first-time users.** Someone installing MADRE for the first time no longer gets five «New:» cards in a row about 1.0.2 features, or notices stacked on top of each other. Also, «New: add widgets» came back every time you opened Home; now it closes for good.
- **Each news card shows only once.** The «New:» cards and each project's «first time» cards (Settings, Modules, Memory…) only remembered that you had seen them on that port. Since a project opens on the first free port, they came back whenever it got another one. Now MADRE remembers them per person, like Home's, and keeps the ones you had already closed. A version's «what's new» board also counts as seen as soon as it appears: before, it came back if you turned MADRE off while it was open.
- **The terminal no longer says «Ready» before you sign in.** On start, MADRE writes which agents are installed and points you to Settings › Agents to see which ones are signed in.

## 1.0.4 · 2026-10-19

- **Cursor in the welcome.** The «Connect your agents» animation showed four agents around MADRE; now Cursor sits above her, and lights up when connected like the rest.
- **Your project's servers open even when they listen on the whole network.** Node, Express and Vite with `--host` listen on every interface of your computer, and the preview named them («open to your whole network · start it on 127.0.0.1») without letting you open them. Now they open the same way, inside your computer, and the list says «your network can reach it too». Servers from other folders are still not shown.
- **The project's state dot always shows.** Beside the project's name on the bar, the dot that says whether it is live got cut when the bar was tight. Now the name gives way, with «…», and the dot always stays whole.
- **Home's bar fits again.** With the Market and Modules keys, Home's bar ran under the buttons on the right and the pinned projects shrank to «+5», with no room to move them or drop a new one. Now, when it does not fit, the computer's name steps out first, then the keys keep only their icon (their name shows on hover), and last the agents step out. The projects always keep their room, also while you arrange the bar.

## 1.0.3 · 2026-10-17

- **A code workspace beside the conversation.** The new `CODE` key in the bar opens your files next to the conversation, without leaving it: the project's list with its search, tabs for what you have open and, above the code, the path and the function you are in. ⌘P (Ctrl+P outside macOS) opens any file by its name. Switching tabs never loses what you wrote: the draft stays in its tab, with a dot, until you save or discard it, and the tabs are still there when you come back to the project. In bars you had already arranged, `CODE` shows up next to Agents.
  - **What an agent changed, in its colour.** After a #3 EDIT turn, the lines the agent changed are marked in its colour, and each change comes with three buttons: **Keep**, **Undo** (those lines only; the rest of the turn stays) and **Ask why**, which asks it in the conversation. Above the code, "@claude · 2 changes to review" takes you from one to the next. If you take the whole turn back with UNDO, or rewrite those lines yourself, they stop being marked.
  - **Actions on what you select.** When you ask for a review of some lines, Explain, Improve, Write tests and Fix appear, each with its question ready for the agent.
  - **Side by side.** In Markdown, the rendered document updates as you write; in an HTML page, it reloads when you save. The page needs Preview, and if it is off the button to turn it on is right there.
- **Gemini connects with your Google AI Studio key, no terminal.** In Settings › Agents, in Connect your agents and in Home, the first thing on Gemini's card is the field to paste your Google AI Studio API key, with the link to get one: MADRE writes it where the Gemini CLI looks for it, readable only by you, and keeps no copy. Below it is the "Google account" button, which opens your browser to pick your account, for the accounts Google still accepts on Gemini CLI: Google refuses free personal accounts (it answers "IneligibleTierError" and asks you to migrate to Antigravity). Before, you had to open a terminal, run `gemini` and type /auth. Everything goes through Google's official CLI and MADRE neither reads nor keeps your session. If you cancel, Gemini is left as it was. Once signed in, every agent shows a single "Sign in again", like Codex; with Claude you pick the account (subscription or Anthropic Console) after the click.
- **OpenCode connects with GitHub Copilot, no terminal.** OpenCode's card, in Settings › Agents, in Connect your agents and in Home, now has a "GitHub Copilot" button: MADRE runs `opencode auth login -p github-copilot`, picks github.com for you and shows in the room the page (github.com/login/device) and the code you type there, with a button to copy it. Once you authorize it on GitHub, OpenCode is connected to your Copilot subscription (Pro, Pro+, Business or Enterprise). Everything goes through OpenCode's official CLI and MADRE neither reads nor keeps your session. The room only offers providers that allow this kind of access to third-party tools: never a Claude subscription, because Anthropic does not allow it; not ChatGPT or GitLab yet, until OpenAI and GitLab confirm it in writing. Those, and GitHub Enterprise, stay under "Prefer your terminal?" with `opencode auth login`, and the other providers' keys are still pasted in the room.
- **The terminal, as a second option and never required.** Under each agent, "Prefer your terminal?" unfolds the same step (install or sign in) written as a command, with a button to copy it. MADRE's buttons are still the main way, and the card of an agent that is not installed no longer shows the npm command on its first line.
- **The Coordinator can learn from your projects.** In Home, every connection the Coordinator reads has a new box, "The Coordinator learns from it", off until you tick it. With it, the Coordinator's training export takes everything that project shares (not just what matches a question), each note under its project's name so it never mixes them. If the project is asleep, the copy from the last time it answered is used, and the panel says where each part came from. Clearing the box or revoking the connection deletes that copy; a model already trained keeps what it learned until you train it again. Also, any project's training export now reads all its conversations, not only the open one.
- **Turn MADRE off from the bar.** A power key at the end of the top bar, in Home and in every project. It asks first ("Turn MADRE off?", with how many projects close), then closes everything in order: each open project stops its agents, saves what is pending and frees its port, and Home closes last. The page stays saying MADRE is off. Ollama keeps running, since it is its own program.
- **Home remembers how you arranged it.** The order and size of the widgets, the order of the projects, the projects pinned to the bar and how the cards read are kept by MADRE, no longer by each tab. They stay the same when you open Home from another project or reopen MADRE on another port.
- **Local AI and delivered notes, in Settings too.**
  - Each project's Settings has a new "Local AI" section with the same as Modules › Local AI, including "Your computer". Home › Settings › Local AI shows "Your computer" too.
  - "What it remembers" has a "Delivered notes" block with Accept and Decline.
  - When notes are waiting, the project's bar says so ("1 note to accept") and takes you straight to them.
- **Connected projects share their state.** A connection can allow more than reading notes: with "It shares its state", the reading project also reads the other one's Continuity state (objective, phase, next step, blockers, last handoff, accepted decisions and what is pending). Its files and code never travel. If the Coordinator learns from that project, the state goes into its training as a dated snapshot.
- **Notes delivered between projects.** With "It receives delivered notes", the reading project can hand notes to the other one. They arrive as a card with Accept and Decline, and enter its memory only if you, or one of that project's agents in #3 EDIT or above, accept them. No project writes straight into another's memory.
- **The local Coordinator's exam.** With @madre, the Coordinator only answered. Now its local model can take an exam from Train your own AI, in Home, in three parts:
  - real questions about your projects;
  - questions about things nobody ever discussed;
  - test orders.

  If it passes, it gives orders up to #1 and proposes no connections. Retrain it or switch models and the exam no longer holds.
- **Local AI is measured on your computer.** Modules › Local AI has a new block, "Your computer": it reads your hardware (an Apple chip and its shared memory, an NVIDIA card and its video memory, or the processor alone) and sets it against the minimum of each Qwen2.5 size, from 0.5B to 72B, to run it and to train it. It says which model to use every day, which one you can train and which features are worth turning on: search by meaning, the archivist, @madre, the Coordinator with local AI and training. The download button offers the model your computer runs well, instead of 3B for everyone. If you pull a larger one (7B, 14B, 32B or 72B), @madre uses it. In Train your own AI you pick the size and the commands follow: from 3B up the base is 4-bit, it is fused with `--de-quantize` and Ollama keeps it in 4 bits. When a size does not fit your computer, the recipe says how much memory it needs.
- **You can scroll up while an agent works.** The conversation no longer pulls you back to the end every time something changes height: once you scroll up, it stays where you left it, without shaking. If an answer or a plan finishes while you read, a round button appears over the box with a dot in the colour of who answered; one click takes you down, and it goes away by itself when you get there. And jumping to a part of the history you had never seen (dragging the scrollbar, Home, a search) no longer makes the conversation jump: when it opens, every message is measured once in the background and the browser remembers its real height.
- **Notices grow from a dot.** The notice that floats over the box starts as the dot of its colour, opens into its pill and closes back into the dot when it leaves, with a soft shadow that lifts it off the background. While it shows, the last line of the conversation rises by its height, so it no longer covers the chat notice that says the same thing.
- **A command with a restore point looks like the other notices**: rounded corners and its UNDO underneath, instead of a capsule that swelled into a circle. Long command pills are no longer cut off on the right: they stay in the agent's lane and end in «…».
- **Long commands can run.** A line several hundred characters long (an `npx tsx -e "…"`, a `node -p`) no longer stops at «Does not run: it is too long»: the card shows it whole, scrolls inside its button if it is very tall, and runs it. The limit only stops a runaway line (over 4,000 characters).
- **The box no longer gets squeezed.** With HUMAN › COPILOT › TOKEN SAVER › @AGENT and token saver on, text was typed one letter per line. Now the text keeps its width, the address is cut with «…» before the agent you write to, the token saver chip stays on one line and, with many lines, the first visible line fades under the edge.
- **Neural mode in the maps.** The Memory map and the Project map have a new key, **Neural**, that draws the same network as the neurons of a brain: each memory is a point of light in its color, the links are thin axons, and only the paths something travels light up, with the neuron it reaches. The core and the Coordinator become the central bulb of the brain, beating. Turning it on, the light runs out from the centre and lights every neuron in turn. It shows the same with far less work for your computer; when the map is short of frames, the key invites you to try it, and you decide when to use each mode. The choice holds for Home and all your projects.
- **The maps close like every other window.** In the Memory map and the Project map, "Leave ×" and "Back to Home ×" are now the × of Settings and Connections. Home's first-time hints no longer show over the Project map: they wait until you close it.
- **Your own wallpaper.** In Settings › Appearance, the last of the wallpapers is "Your picture": you choose a photo (PNG, JPEG or WebP) and it becomes the background at once, fitted to the screen like MADRE's own wallpapers, with its layer or its mesh in its own colours, its intensity and its blur. "Framing" shows the whole photo with a frame of what your screen shows; you drag it to choose which part stays in view. There is one picture for Home and every project (each decides whether to use it), and it can be changed or removed right there. It is kept on your computer, in `~/.pulse/wallpaper/`, reduced to 2880 px on its longest side.
- **One scale for the icons.** Every icon takes one of four sizes depending on what holds it: a mark inside a pill, a key or a drawing beside a word, a square key, and a floating button. The Home, reload, Settings and power keys take the size of the bar's keys when the bar folds. What still used text signs as icons (the ⚙ in "Agents in Settings", the ‹ › arrows, the ▸ ▾ of folders and folds, the ↗ of what opens elsewhere and the ◉ of "still open here" or "memory saved") now uses the room's drawings.
- **The bar with a panel beside it.** With Code docked and a narrow conversation, the bar measures again what fits: what does not fit goes into "More" instead of sitting under Home, the project's name reads whole and, if needed, "1 note to accept" shrinks to its tray and its number. What changes in a narrow window (wider messages, the word on Create) changes there too.
- **Arranging the bar without spilling.** While you arrange it, a bar with more keys than room scrolls sideways inside its own box, with the mouse wheel too, and the key you drag no longer leaves it. "Add to the bar" reads better: the title with its hint under it, each key drawn as it will stand on the bar with its "+", and its whole name.
- **Asking about code, clearer.** When you ask about some lines, the agent chosen is lit and the others are dimmed. The card of what an agent changed no longer has a coloured edge on its left. In "What is sent", the scroll bar runs along the window's edge, outside the cards.
- **Details that looked wrong**: the ring around a thinking avatar is no longer cut on the left; the notice dot on the conversations button sits on its corner, outside; the recipe to train your AI (Mac and Linux) shows every command whole with Copy in view; the clock of a working agent no longer leaves a grey help box under the pointer or makes the browser re-lay out the windows every second; in the top bar, Home's widgets button pulses on hover and fills its squares when it opens, and the shadows of Connections, Map, Modules, Diagnostics and Code are softer; Code, on hover, takes the accent colour and draws a / between < >, and stays that way while open; and "still open here" is centred with the questions under it, since its × no longer pushes it aside.
- **Codex no longer asks for #4 to read in #3.** Codex reads files with the shell (`cat`, `sed`, `rg`) and the #3 note told it "you cannot run commands": sometimes it answered "I need #4 for 5 min" to open the file it was supposed to edit. Now, only to agents that read with the shell, MADRE makes clear that reading with read-only commands is fine and that what it doesn't run is programs (tests, builds, installs, servers). Claude and OpenCode don't change: they read with their own tools.
- **Gemini says why Google refuses it.** When Google refuses the free personal account, the answer is no longer the generic "Google rejected the credentials": it says Google no longer accepts that sign-in and to paste a Google AI Studio key in Settings › Agents › Gemini, and Diagnostics finds its fix. The Gemini card no longer promises a free plan.
- **The round table speaks your language even when someone doesn't answer.** If an agent fails, @madre's summary quotes the reason in the language of the question; before, it could come out in English in the middle of a Spanish summary.
- **When an agent says it created something that doesn't exist, MADRE says so plainly.** The notice is no longer a line that turns into a dot after ten seconds: it says "@agent said it created spending.html, but it is not in your project", that nothing was written, and brings "Ask again", which puts the same request back in the box with a note for the agent. A plan that mentions the files its steps will make no longer triggers this notice.
- **Ollama no longer looks like a server of yours that went down.** Ollama opens a process of its own for each model it loads (`llama-server`, with its port) and closes it when it unloads the model after a few idle minutes. If Ollama had been started from a project's folder, that project said "your server :53328 stopped". Now that process counts as part of Ollama.
- **A first-time hint is never out of your reach.** The card follows what it points at as you move around the page. If what it points at is above or below what you see, a pill at the edge shows its title and "Scroll up to see it" or "Scroll down to see it", and takes you there with a click. Before, a hint about a widget further down was born off the screen and could not be closed.
- **Home speaks one language.** In a new MADRE that takes your browser's language, the widgets' titles stayed in Spanish while everything else switched to English.
- **Cursor, the sixth agent.** If you have Cursor and its terminal program (`cursor-agent`), MADRE finds it and puts it with the others: you write to it with `@cursor`, it joins plans and round tables, and in Settings › Agents you sign in with your Cursor account from a button. For now it reads and answers: every turn runs in its ask-only mode, with a configuration made for that turn that does not let it write or run commands, and that is removed when the turn ends. Your Cursor session is left alone. Writing in your project (#2 to #4) will come once its confinement has been tried.
- **The agents, in drawings of their own.** Codex, Claude, Gemini, OpenCode and Cursor have new drawings by MADRE that recall each brand without copying its logo: the knotted blossom, the spark, the four-pointed star, the block and the cube with its pointer.
- **An agent that cannot answer looks switched off.** With no session, not installed or with no adapter MADRE can use, the agent turns grey in the project's bar and in Home's, and leaves the picker of the box you write in. If you write to it by name, the message stays in the box and its Settings open so you can connect it.
- **Create a project from scratch.** In "Add a project", in Home and in the welcome, the new "New project" option makes an empty folder with the name you type, in your home folder or in the one you were walking, and adds it to Home. It never writes over a folder that exists, and says why when a name will not do.
- **MADRE in Home's air.** With no wallpaper, behind Home there are two very faint clouds in MADRE's palette that drift slowly: her green on the light theme, and on the dark one her phosphor green with a trace of cyan and plum. With "less motion" they stay still.
- **Gemini does not keep an account Google refuses.** Google lets a free personal account sign in and refuses it at the first question. The "Google account" button now waits for that first answer: if Google refuses the account, Gemini is left as it was (with your key, if you had one) and MADRE tells you why.
- **Hints inside a window are the same card as the rest.** In Settings, the first-time hint is no longer a band glued to the edges: it is the usual card, with its margins and its small button on the right.
- **Errors, in your language.** The notice that Google refused the Gemini account, and three more of Gemini's, read in Spanish even when they were kept in English.
- **The ring of the thinking agent shows whole.** In Chrome, the ring that pulses around the avatar was cut off sharply on the left.
- **The Market.** A full-screen store of modules, in Home (the «Market» key) and in every project (Modules › Market). On top, a carousel of the featured ones, each with its illustration; below, shelves by what each module is for («Without the terminal», «To create», «AI on your computer», «Connect it»), and a page per module with its price (all free for now), where it is on, its preview, what it does and what it touches. Every module has a new icon, its drawing on its own colors.
  - **For this project, for all, or for one.** Opened from a project, «Get» turns it on in that project only. Opened from Home, you choose «for all your projects» or «only in» one. A module that writes into the folder (Continuity) takes you to its card in Modules, where you read the commands before they run.
  - **Modules in Home.** The new «Modules» key shows what you have on or installed and in which projects: one switch for all your projects and a chip per project to turn it on or off there alone. A change reaches each open project with its next message, without restarting it.
  - **In the conversation.** Ask for something an off module would do (open your page in a browser, make an image, read your pull requests) and a card appears under it with «Turn on», «See it in the Market» and «No, thanks».
  - **New modules without waiting for a MADRE release.** The Market updates from madre.run every time MADRE opens: new modules, the featured ones and their words come in a catalog signed by the author, and MADRE reads none its built-in key does not verify and installs no file whose fingerprint is not the catalog's. Offline, it uses the last one it verified. A module got from the Market updates itself when a new version comes out and tells you once, with what changed. The Market's news and new modules are announced once, with a «See it» key. The connection is on the list of what leaves your computer, and is turned off with «Look for new versions» or `PULSE_MARKET=0`.
- **A module's switch in a project belongs to that project.** In a project's Modules, turning a module on or off no longer changes it in all your projects: the row says «On in this project». «For all» is decided in Home.
- **SDK: `ready`, `footer` and a switch per project.** A module can declare `ready(ctx)`, what it asks before it turns on (in one project, in all, or from the Market), and `footer`, up to two keys beside MADRE's version that MADRE draws: one of its icons, the module's words and an https address. `ctx.settings.enabled` is already this project's: MADRE keeps what each one said in `rooms`. The contract goes to 38 fields. The first Market module to use it is «Donate»: a heart beside the version to support MADRE on GitHub Sponsors.
- **Continuity without the terminal.** In a project with no git, MADRE runs `git init` for you before installing it, and says so in the same confirmation. On a Mac with no git, the notice carries the key that opens Apple's installer. Module texts read in your language, and paths and commands show as written.
- **The test browser brings its browser.** Turning Test browser on, if the server or the browser is missing, MADRE downloads them and tries again before saying anything; meanwhile it says it may take a few minutes. If npm fails, the notice says npm's reason instead of the path of its log.
- **Opening MADRE with `npx` no longer breaks Continuity or Test browser.** The variables `npx` leaves behind made the commands MADRE runs for you try to install MADRE's package again.
- **With an old Node, a clear notice.** On a Node older than 22.5, `madre` says which version it needs and how to install it (nodejs.org or `nvm install 22`), instead of npm's warnings and a «Permission denied».
- **MADRE on a server with no screen.** The reference explains how to open it on a server and see it from your computer through an SSH tunnel.
- **Details**: command boxes show their copy icon again; opening a new conversation in window mode no longer leaves the window stuck in the corner; and the log of a module being installed reads on the room's ground, in code type.

## 1.0.2 · 2026-10-16

**New license.** From 1.0.2, MADRE is free software under the **GNU AGPL v3** with [additional terms](ADDITIONAL-TERMS.md) under its Section 7: anyone can use it, study it, modify it and fork it, commercially too, as long as their version stays open under the same license and keeps the authorship visible —«MADRE ‹version› · © 2026 Jossue Alcalá» in the corner of every project and of Home, linked to jossuealcala.com, or «Built with MADRE by Jossue Alcalá» under another name. Settings › Updates and errors › **License and authorship** says all of this in the app. Up to 1.0.1, MADRE was published under the Apache License 2.0, and those versions keep it.

For the people who use it, this is a patch: there is no greeting, no tour and no «What's new». What is new is told through first-time notices, one at a time and only once, in plain words and with what they name lit up on the screen: the copilot, Outside tools (MCP), files that keep themselves up to date, memory without typing the name, notices that shrink into dots and, on Home, the button to add widgets.

- **The output of the commands an agent asks for goes back to it on its own.** When you run the lines of a ```pulse-run, the result goes back to the agent that asked for it in a response of its own, with the mode it had (up to #3), what it was answering and the output of each line; you no longer need to write «I ran it». If that agent is still answering, it waits; STOP ALL holds it. The card has **Run all**, **Hand back what ran** (when you don't want to run the rest) and says who it goes back to. A long output no longer pushes the human's request out of the conversation: in what all the agents read it takes at most ~1,200 characters (its beginning and its end).
- **Agents no longer get their permission wrong.** In #3 and #4 the mode instruction said «read only» on top of the permission to edit: with FULL ACCESS an agent would reply that it would only inspect. Now it says what each mode allows.
- **Permission is asked for with its time.** An agent that needs more asks for the mode and for how long («I need #3 for 15 min»); the card shows it, lets you choose 5, 15 or 30 min (#4: 5) or just this message, and once confirmed, the permission lasts that long.
- **Plans in every mode.** The rule against using the app's own subagents was being read as «don't put together plans», and with #2, #3 and #4 agents stopped proposing them. The mode picker now says that every mode also puts together plans with other agents.
- **Copilot.** A robot next to mode · model · effort. You turn it on by confirming #3 EDIT once, for 30 min, 1, 4, 8 or 24 h, and while it lasts, the agent you write to drives the project in #3 without asking you to confirm each message: it edits, puts together plans and gives each step of the plan up to #3, and runs the safe commands on its own (reading, tests, building, local git), whose result comes back to it. It never deletes (if a file gets deleted, MADRE puts it back after the response), never touches MADRE's folders or the secrets, never opens #4 and never pushes, publishes or sends anything outside the computer; after 8 rounds in a row without you it stops and lets you know. Above the message box it reads HUMAN › COPILOT › @AGENT ›, and its responses carry a green robot. STOP ALL or a restart turns it off.
- **Outside tools (MCP)**, in each project's Settings. Add MCP servers by command or by web address (no sign-in, with a token or signing in with OAuth, like Claude's connectors), or bring them in from `.mcp.json`, `opencode.json`, Claude Code, Codex, Gemini CLI or Cursor; importing reads only names, and the values are kept safe inside MADRE. MADRE starts and checks each server before any agent can use it: one that doesn't answer is left out and its row says why. Tools that only read work from #1; the ones that act, from the mode you choose (#4 unless you lower it). No secret is left on the command line or in a project file.
- **A compact terminal.** Each command output is a pill as wide as what it says —whether it worked or failed and how long it took, the command and who asked for it—; the full output opens with a click.
- **A chat that is easier to read.** Answers come in a bubble with the agent's name in its pill; attachments are cards with their type and size; while an agent thinks, its avatar breathes next to what it is doing and the time; a plan is a task list; the footer keeps the time and shows the cost on hover; choices are a numbered list; a permission request fits on one line and, once granted, stays as a divider; requested commands are numbered steps marked ✓ or ✕; and answers have more room between them. Everything from one agent (its header, its answer, what it asks for and its commands) starts at the same edge, and its header fits on one line: when room is short, the effort is hidden first.
- **Notices turn into dots.** Chat notices shrink after 10 s into a dot the color of their type (red diagnostics, amber permission, green good, gray everything else); a click opens them as a list you can read: the label on top, what it says below, and repeats shown once with «×N». The dots are small and faint so they don't clutter the conversation. The ones that ask for something stay open: a failure with RETRY, a permission waiting, a module to install, changes with UNDO, the read-only notice and the Diagnostics ones.
- **The file list sees what changed.** What a command or an agent leaves where git doesn't look (an ignored folder like `output/`) is found by its date and reported; the list updates at the end of every response and every command, and it has a refresh button next to Settings. The folders along the path carry a hollow dot in the color of whoever touched something inside, and the file a filled one with «Last changed by @agent · 5 min ago».
- **Test browser.** If the chosen browser is missing, the notice says which one and the exact command (`npx @playwright/mcp install-browser webkit`, `chromium`…), instead of always asking for chrome-for-testing; the check no longer reuses another browser's answer.
- **Settings that are easier to understand**, in Spanish and in English: Memory is «What it remembers», Connect MCP is «Outside tools (MCP)», Intentions is «Suggested effort», and each setting says what it does without jargon (archivist, distill, recall, embeddings…).
- **The Memory map can stop asking for the name.** «Don't ask again…» in its confirmation leads to **Settings › Permissions › Memory access**: always ask, 1, 8 or 24 h, or never. It is saved in this browser and for that project (the Coordinator too).
- **Add widgets to Home from the bar.** A button of its own next to Reload opens «Add to Home»; before, you could only get there with a right click.
- **Home and projects on narrow screens.** On a tablet, a side panel switches to a window on its own instead of leaving a strip for the conversation; on a phone, the bars no longer end up under their buttons on the right: only the pulse of the logo stays, the tour pill says «Tour · 3/13» and Reload leaves the bar (the page reloads itself when you pull down). The «+n» of open projects is always shown in full.
- **OpenCode with effort and all its providers.** Each OpenCode model offers its own reasoning levels (the ones it publishes: from «none» to «max») and they are sent with `--variant`. Adding a provider now offers every one that a single key unlocks in the OpenCode catalog (Groq, DeepSeek, Mistral, xAI, Together, Fireworks…), the most used first. Gemini CLI has no way to choose the effort per message: it decides that itself.
- **Train your own AI, explained and in order.** What training data is, seven numbered steps and the option for Linux with an NVIDIA card (experimental: MLX works there, but mlx-lm only guarantees Apple chips).
- **Clearer cards.** Each agent's card: its session, one figure, four facts, its plan and a button to Settings. «What is sent» looks like the rest of MADRE: aligned title, centered tabs, the usual buttons and without the console's all-caps text. The copilot panel, better organized; «AUTO» in the corner of «How much it thinks» and notices that float over the background.
- **The split view fits.** The project bar adjusts to its own width next to another conversation, the browser or two side panels, without running into Home · Projects · Settings; and the conversation fades out before the message box instead of showing underneath it.
- **Floating windows come back one at a time.** Opening the files or any other window from the bar no longer brings back the ones you had sent to the edge; each one comes back when you ask for it.
- **MADRE opens in your language.** The first time, if nobody has chosen one, MADRE takes your browser's language: Spanish in any of its variants, English for any other. It is saved as if you had chosen it, so Home and every project follow it, and you can change it any time in Settings › Appearance. Anyone who already chose a language notices nothing.
- **MADRE in English outside the app too.** The README, the changelog, the trademarks and the user documentation (reference, SDK, internals, connectors, roadmap, training and the report collector) have an English version (`README.en.md`, `CHANGELOG.en.md`, `TRADEMARKS.en.md`, `docs/en/`), and each version's notes on GitHub come in both languages. Spanish stays the original.
- **Conversations open at once.** A 166-message conversation took 11.5 s to draw: every event read the conversation's height and scrolled it to the end, and the browser laid the whole conversation out again twice per event. Now the record is drawn in one go and scrolls to the end once: 40 ms, also when switching conversations. The page gets only the latest quota reading of each agent (they were 87% of the download: 3.3 MB → 0.6 MB; the record keeps them all), what is off screen is not drawn until it comes near (`content-visibility`), and scripts and styles are reused between visits (`ETag`, 304) and travel compressed.
- **MADRE's corner leads to its author.** «MADRE 1.0.2 · © 2026 Jossue Alcalá», in every project and on Home, links to jossuealcala.com and no longer sticks to the mode bar when the center is narrow. The license's additional terms require keeping it.
- **«Mac» only on a Mac.** Where it runs on another computer, such as Linux, MADRE says «this computer» instead of «this Mac», in both languages; what names Apple hardware («a Mac with an M chip») does not change.
- **The English says the same as the Spanish.** 215 phrases rewritten with the new names and without jargon (lease, key, aberration, sentinel, HOLD/BRIDGE…).

## 1.0.1 · 2026-10-14

- **MADRE speaks more clearly.** The text of the whole interface, the tour and «What's new» was reviewed so it makes sense even if you know nothing about AI or programming: 1,157 changes, words only. *Turn* is now *response*; the states of a memory are UNCONFIRMED, CONFIRMED, QUARANTINED and DISCARDED; Diagnostics talks about *problem* and *fix*; the key for #3 and #4 is *confirm* and a provider's is *API key*. The console commands stay in English and the nods to Alien are still there.
- **Local AI per project.** In **Home › Settings › Local AI** you choose which projects use Ollama: **Automatic** (all of them, as before), **One by one** (only the ones you turn on) or **Manual** (each project decides in its Settings). Changing the mode doesn't touch existing projects, only how new ones start; the change reaches open projects instantly. In a project, «Active» in Modules › Local AI no longer turns off local AI for the others. The Local models widget marks the projects without it and leads to these settings.
- **A daily notice that MADRE is still in use.** Once a day each copy tells madre.run that it is on: a random identifier the copy creates for itself, the MADRE version, the operating system and the Node version. Nothing else: no name, no email, no projects; madre.run doesn't keep the IP. It is how to know how many people use MADRE, which versions they run and whether they come back. It is always on, appears in «What is sent» and in *What leaves the machine* in the reference, and without a network it fails silently.
- **A tour for those who already had 1.0.** Anyone who finished the 1.0 tour sees a greeting of their own and only what changed: the clearer names, Home your way, the widgets, local AI per project, the sky of connections, Settings and the new gestures, each chapter with a «New since 1.0» line. For newcomers, the greeting first leads to connecting the agents and adding projects, and a project no longer greets them before Home does.
- **Widget guides and first-time notices.** A chapter explains each widget, and the first time one appears on Home it says what it shows. The first time you open Connections, the Project map, Settings or Add on Home, or Settings, Modules, Diagnostics, the Memory map, Agents or First steps in a project, a card says what it is for.
- **Restart all.** After updating, Home restarts in one go the projects still running the previous version, from **Needs you** or **Settings › Version**. The ones that are working or waiting for you are left for later, and it tells you which.
- **A project open in another MADRE says so.** Opening it from Home when it is already open somewhere else answers with the address where it is, instead of «didn't open».
- **The MADRE trademark, in writing.** `TRADEMARKS.md` says what you can and can't do with the name; `NOTICE` carries the line every fork keeps («Based on MADRE by Jossue Alcalá»), and contributions are signed with `Signed-off-by`.
- **Claude can now connect with your own API key.** When signing in you choose the door: «Claude account» (your subscription) or «Anthropic Console» (billed to your API credit). You can also paste your `ANTHROPIC_API_KEY`: it is written where the Claude CLI reads it (`~/.claude/settings.json`, only for you), MADRE keeps no copy and, if the CLI doesn't accept it, everything goes back to how it was. That key governs all of Claude Code on this computer, and MADRE says so before saving it.
- **A browser sign-in can now be finished inside MADRE.** Claude's page returns a code and its CLI waits for it: before, there was nowhere to paste it and the attempt died after five minutes. Now the address stays in view, there is a box for the code and a key to cancel; the wait lasts up to fifteen minutes, because there is a person on the other side.
- **Home has the full connection settings.** The same card as the project: which account each agent is connected with, the doors to sign in, the box to paste a key, the sign-in page and its code. A half-typed field is no longer cleared when the panel updates itself.
- **The README opens with the official MADRE logo** and the 1.0 tagline, instead of the banner signed «MU/TH/UR 6000 · INTERFACE 2037».
- **Plans check their results and can continue** for up to three stretches per request. A step without a number keeps reading, or creating if the plan can already create; one that asks for `#3` or `#4` above your message waits for your key for that agent, and `#4` always asks for it.
- **Home shows direct connections between projects** before the Coordinator's and leaves more room to read them. If a room is slow to answer, it briefly keeps its last known state; the Project map retries a failed read.
- **Navigating the Map respects open windows.** Clicks, drags and the scroll wheel over a card don't act on the canvas behind it.
- **Commands show their status and elapsed time.** Each line shows an activity bar while it runs and the summary tells apart the ones that finished. Home stops showing a line that already started as pending and keeps the agent that asked for it.
- **Servers have a recognizable reload key.**
- **OpenCode by provider.** The chat's model picker groups OpenCode models under their provider (only those with a key or an account, and OpenCode's own) and leads to **Settings › Agents › OpenCode**: there you paste or remove each provider's key, choose which ones appear in the chat and the default model.
- **Home's connection map, clearer.** The card shows only connected projects, each with a shade derived from your accent that repeats in its wires and in its name; touching it opens the full map, large, in «See the connections».
- **Buttons with a cleaner shadow**, with a thin border and a short shadow, in light and in dark.
- **Settings › Agents, tidied up.** Each agent is one line with its status until you open it; once open, its options come in pairs. A sign-in log no longer stacks a «still running…» every 8 seconds: the line updates, and each attempt starts clean. OpenCode providers live inside its card, one line each and a single row to add another.
- **Home, made to measure.** Right-click any card on Home: move it before or after, take it above or below the projects, change its size (small, medium, large, full width), remove it or **Add to Home**. Projects also move with their right click, and the order is saved as «Yours».
- **Each page with its own background.** Home keeps the background you choose in its Appearance and each project keeps its own; the theme, the accent and the rest are still shared. Each card in the drawer shows its room's background. A project that never chose one keeps the one it had.
- **Home adapts to any card width.** The project drawer has a bigger name and its tools in a single row, centered; if it gets narrow, the search drops to its own line and «Add project» becomes «+». In the Coordinator, «Talk to the Coordinator» drops below its name when it doesn't fit beside it. A card's buttons never overlap the title. «N more projects, offline» goes in a discreet pill, and the widgets' bars fill their width.
- **Home on an exact grid.** 12 columns and 96 px rows: each card takes up whole columns and rows, so its edges line up with the others'. With a right click you choose the **width** and the **height** (automatic, or 2 to 5 rows); whatever doesn't fit scrolls inside the card. When the screen gets narrower, cards go to half width and full width, and pairs end up even.
- **Drag to the edge**: while you carry a card or a project, getting close to the top or bottom scrolls Home, faster the closer you are, without letting go.
- **The Home bar no longer clips the status dot** of an open project or its halo.
- **«Needs you» with room to breathe**: each notice in its own block, with the title and its hint well spaced and the action on its own line.
- **Connections as an electric flow**: no arrows, a faint line with current running in the direction the notes travel, and in both directions when they read each other.
- **The Home bar behaves like the projects' bar**: with the pointer over it, the icon and its word take your accent, the key lifts, the stroke thickens and each drawing moves in its own way (the link joins, the planets turn, reload spins around).
- **Connections, a sky.** Each project is a star in its own shade, twinkling at its own rhythm; the notes that travel are sparks and the Coordinator is the brightest star, with its mark. In dark they shine; in light they are more subdued, so the names can be read.
- **The Home bar icons move** like the rooms' icons: in Connections the two halves of the link join, and in the Project map the planets turn in their orbit while the pointer is over it.
- **Each project in the drawer sits over its part of the wallpaper**, blurred and under a veil of the card, so the text keeps its contrast.
- **Home on a single board.** Each card measures what its content measures, at any size, so none stretches with empty space. Projects live in a **drawer** that moves like any card, with its search, filter, sort and «Add project» in its header: it shows three rows and a «+N» says how many more there are, open and asleep, and opens them.
- **Rules for widgets**: shared pieces and tokens (`.sm-w-grid`, `.sm-w-metric`, `.sm-meter`) that adapt to the width the card has, not the window.
- **Connections in two columns**, with «Revoke» next to «Always include».
- **Drag and drop on Home.** Cards are picked up by their header and settle live, also from above to below the projects; projects are reordered by dragging them among the others and the order is saved as «Yours».
- **The connection map, interactive.** Hovering over a project lights up only its connections; touching the map opens **Map of connections** in its own window: a circle with the connected projects around the Coordinator and, beside it, whatever you choose — a project (whom it reads, who reads it) or a line (what crosses, until when, how many reads).
- **Widgets on Home**, each with real data: System resources (processor and available memory, read from the system itself), Servers (those of your open projects with Preview, and whether they respond), Memory quality (each project's maturity and its weakest side), Coordinator training and Local models (Ollama and how close each project is to its own model). One with nothing to feed it can't be added and says what it is missing.
- **Agents on Home with the projects' design**: collapsible cards with their status, also in the assistant for newcomers, and OpenCode providers inside its card.
- **The settings and «new» buttons in Files and Servers** no longer look pressed: at rest they have the thin border of the controls beside them and they tint when the pointer passes over.

## 1.0.0 · 2026-10-12

<p align="center"><a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/madre-1-0-video.webp" alt="Watch MADRE 1.0 in 90 seconds" width="100%"></a></p>

**MADRE 1.0 brings together on your computer everything you need to work with AI agents: your agents, your projects, their memory and your permissions, in one place.** Codex, Claude Code, Gemini CLI and OpenCode talk in the same thread and read each other; Home gathers all your projects; a Coordinator sees them from above; and each project remembers what was decided. It is still free, with no account and on your computer.

### The essentials

<p align="center"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-inicio.webp" alt="Home: all your projects in one place" width="32%"> <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-agentes.webp" alt="All your AIs in the same chat" width="32%"> <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-permisos.webp" alt="You decide how far each agent goes" width="32%"></p>

- **Home: all your projects in one place.** `madre` on its own opens Home. You add the folders where you work (MADRE suggests the ones that look like projects) and each one stays asleep until you open it. Each card says whether an agent is working, whether someone is waiting for you and what happened while you were away; «Waiting on you», «Recent decisions» and the «Recent summary» bring it all together. The first time, three steps: connect your agents, add your projects and open the ones you are going to use.
- **The Coordinator sees all your projects.** It is an agent that lives on Home: it reads across your projects, signs connections between them and carries orders from one to another. From any project you ask it with `/bishop` and the answer is only for you. Its orders go up to `#2`; `#3` and `#4` arrive as a proposal that you unlock in that project.
- **Connections: one project reads what another has already learned.** You sign each connection: which kinds of note cross (decisions, facts, preferences, questions), for how long and whether the Coordinator can give orders. Only notes already in use cross, cleaned of private data; never your files or your conversations. It can be revoked whenever you want.
- **One conversation, all your agents, and several at once.** You write to an agent with `@`, choose a mode with `#`, a file with `!` and a command with `/`. The next agent receives what was said before and you see it in the handoff line. Ask «@madre, ask the team…» and they all answer, one after another, with a summary at the end. Several conversations work at the same time, side by side or in windows.
- **You decide how far each agent goes.** Each message carries a mode: `#0` Incognito, `#1` Chat only (the default), `#2` Create, `#3` Edit and `#4` Full access. `#3` and `#4` ask for your key (`#4`, twice) and the project itself checks it. In Settings › Permissions you choose which key to use and whether it lasts a few minutes. Before editing, MADRE saves a restore point and **Undo** takes the project back to that moment.
- **Your memory, in view.** Each project distills what is said into notes: decisions, facts, preferences and questions. The **Memory map**, with its key in the bar, draws that memory as a brain you can rotate; the **Project map**, on Home, shows your projects around the Coordinator with their connections.
- **Settings and Diagnostics.** Everything you configure lives in one window (⌘ ,) with a search box: appearance, project, agents, memory, permissions, privacy and version, and each card says how it stands before you open it. In **Diagnostics** you write what is happening in your own words and it tells you what to do, with the key that fixes it.
- **Modules like apps.** A board of tiles, each with its switch and its sheet: **Token saver**, **Intentions** (suggests how much each agent should think based on your own turns, without spending tokens), **Local AI** with Ollama, **GitHub** (`/gh` for pull requests, CI and issues) and **Continuity** (AHP+), among others. Each one says what it writes and what it needs before it is installed.
- **A workspace made to measure.** Each panel opens beside you or in a window you can move; a second conversation fits in the other half; the viewer edits code; your project's servers open inside MADRE; the bar is put together with a right click; and Appearance comes with 17 accents and 12 backgrounds for light and dark theme. There is a single appearance: what you choose on Home or in a project is seen by all of them. When the bar doesn't fit, keys move to «More» before the project name gets cut off.
- **It teaches you MADRE at your own pace.** Anyone arriving for the first time sees «Getting to know MADRE»; anyone coming from an earlier version, «The tour of MADRE 1.0», which starts with what moved. They are short chapters you can leave and pick up again, and `?` opens the gestures and shortcuts sheet at any time.

### If you are coming from 0.7.2

- **Your projects, conversations, memory and settings stay.** MADRE recognizes the projects you opened with 0.7.2 and brings them to Home: it looks in each folder where you usually keep your projects and only adds one if its fingerprint matches. Nothing is guessed, and a project you removed from MADRE doesn't come back.
- **Plain `madre` opens Home**; `madre start` inside a folder still opens that project directly.
- **«Connections» changed meaning.** Signing in to your agents now lives in Settings › Agents; a connection is what links two projects.
- **Settings brings together what was scattered** among PERSONALIZE, MU/TH/UR, ⚙ CONNECTIONS and the language and theme keys.
- **The names are clearer.** Identifiers, commands and folders don't change (`/bishop`, `madre salas`, `.pulse/`), only what you read:

| Before | Now |
|---|---|
| Room | Project |
| Rooms · lobby | Home |
| BISHOP | Coordinator |
| Links | Connections |
| Macroverse | Project map |
| NOSTROMO | Memory map |
| MU/TH/UR | Diagnostics |
| GHOST · EXCHANGE · CREATE · CONTROL · AIRLOCK | Incognito · Chat only · Create · Edit · Full access |
| Ash · Ollama · RIPLEY · AHP+ | Token saver · Local AI · Preview · Continuity |

- The second `#4` key is no longer the word AIRLOCK: it is your same `#3` key, typed twice.

### Safer and more solid

Before closing 1.0, the whole codebase was reviewed with security tests. What was fixed:

- **The `#3` and `#4` keys are checked by the project**, not just the page: a message in those modes without an accepted key is rejected, and changing the keys asks for the current phrase when a phrase protects a mode.
- **MADRE's git doesn't run what an agent leaves configured** in a repository (hooks, fsmonitor, external diff), and after a response in `#2` or `#3` the repository configuration goes back to how it was.
- **MADRE's pages can't be framed by other sites** and external images in a response stay as a link; the file preview opens isolated.
- **What crosses between projects is always cleaned** of keys, tokens and passwords, even if a project has turned its guards off.
- **Nothing gets overwritten or corrupted:** settings, connections and the tour state are written whole and in turn; a log cut off halfway (a power outage, a `kill -9`) no longer prevents opening the conversation; memory waits its turn instead of failing with «database is locked»; and a project that died mid-response no longer leaves files locked.
- **Purging a private term cleans every conversation in the project**, not just the open one.
- **One-click update only installs valid versions.**
- **Characters no longer get split**: an «ó» that arrived split across two chunks of an agent's output is saved whole.
- And more logic fixes: two conversations open at once no longer distill or pay twice for the same batch, going back to a conversation no longer adds its cost twice, and Diagnostics gives the remedies for the system MADRE runs on, not for the browser reading it.

### Everything that changed, in detail

<details>
<summary>The full 1.0 log, in the order it was built</summary>

> This log was written while 1.0 was being built and keeps the working names (room, Rooms, BISHOP, MU/TH/UR, NOSTROMO, AIRLOCK…). Some pieces were replaced before release: for example, the five-stop tour gave way to «Getting to know MADRE» and «The tour of MADRE 1.0». The table above says what each thing is called today.

### Rooms on your Mac

- **All your rooms, on one screen.** A new key at the start of the bar, **Rooms**, opens the list of this Mac's projects: the open ones first (the one waiting for you, in your accent; the one working, with its pulse), with their last conversation and how many memories they keep, on a strip with NOSTROMO's colors; and the **asleep** ones, closed rooms whose project is still on disk. From there you **open** a room, **close** it (stops what is running and closes it, after asking) or **wake** a sleeping one, as if you ran `madre start` in its folder. **Stop all** halts the agents in every room.
- **The Macroverse.** From Rooms, on a big screen, all your rooms in open space, and each one is a NOSTROMO: MOTHER of molten rock at the center, each memory a dwarf star in the color of its type, the veins between those that share a topic, drawn by the same engine as its room's NOSTROMO. The open ones orbit close to your Mac and the sleeping ones far and cold; the one working breathes and the one waiting for you wears a ring in your accent. Space has no edge: it is dragged, the wheel brings it closer and **Recenter** brings it back home. Click a universe (or ← →) and the camera flies to it: there it stops being a photo and becomes the real thing, with its magma and its live pulses; drag it to turn it in your hand, touch a memory to read it in its sheet, Esc to let it go. The sheet says what it keeps by type, its conversations, its veins and the door to enter or wake it. From afar each universe is painted only once, without the words of its memories; only the chosen one asks for them, and only one is live at a time: a frame of the far view costs less than a millisecond and the live universe costs what it costs in its room. For now the Macroverse only shows: linking rooms comes later.
- **NOSTROMO has its own engine.** The physics and painters of the memory map now live in a separate file, which the room and the Macroverse share: one palette, one magma, one brain shape. Nothing visible changes in the room.

### Links between rooms (preview)

- **A room can read what another knows, if you sign it.** In Rooms, **Link rooms** opens a sheet: which room reads from which (or both), which kinds of memory cross (decisions, facts, preferences, questions) and until when. In the Macroverse, drag one universe onto another and the sheet arrives with both rooms filled in. Signing leaves a MU/TH/UR line in both rooms; **Revoke**, in the Links section of Rooms, leaves one too and from then on nothing crosses.
- **What crosses, and what doesn't.** Only distilled notes that already travel to responses (hold and bridge), of the kinds in the contract, cleaned by the privacy guard of the room that hands them over. Never the log, the files, the keys, the medbay or the airlock. And read-only: nothing written in one room reaches the other.
- **How an agent uses it.** In a room with a valid link, each response carries the `pulse-enlaces` server: `enlace_rooms` says which rooms it can read from and which kinds; `enlace_search` reads, and the agent cites what it brings back as coming from that room. Without a contract, the tool doesn't exist. Each read is counted in both rooms, never as a bubble: in Rooms, each link says how many reads it had in 24 h and when the last one was; in the Macroverse, the vein between the two universes carries the current from the one handing over to the one reading and sends a pulse for each crossing.
- **Locks.** They are all in the room that hands over: it only answers another MADRE process on this Mac with the channel key, never a page; a revoked, expired or reverse-direction contract is a contract that doesn't exist; a room sealed by CODE000 doesn't hand anything over; and each link has a cap on reads per hour.
- **The Rooms room.** `madre salas` opens a room whose project is a MADRE folder: the front door when you are not in any project, and what plain `madre` opens from your home folder. It is a room like the others, goes first in Rooms with its mark and its bar has the **Macroverse** key. It never hands over notes through a link and it is the only one that can receive permission to give orders to another: that is where BISHOP lives.
- **`madre start --help` is now help.** Asking for `--help` after a command opened the room instead of answering; now it answers.
- **Two rooms no longer overwrite each other's settings.** `config.json` is one for the whole Mac and was written without a lock: if two rooms saved at the same time, one could erase the other's change, and a module being turned on in one room could turn off what another had just changed. Now each change is written whole and in turn, and each module writes only its own part.
- **A note an agent saves with `memory_note` now goes through the privacy guard**, like everything else that enters memory: if the name is in Settings › Privacy, the note is saved with the marker, not the name, and the agent sees it as it was saved.
- **Purging a private term keeps each note in its place.** A refuted fact stays out of circulation and an aberration stays in the medbay. The purge also cleans the corrections and keeps the number of times a note was recalled.
- **BISHOP speaks from the Rooms room.** In its sheet you choose which ready agent answers; if `@madre` is available, it starts with that one. It sees which rooms are open, who is working and how many notes they keep. With signed links it can look up notes from other rooms and cites which one each fact comes from. If a room couldn't be read (asleep, sealed or over its hourly cap), it tells you instead of keeping quiet. With `@madre`, BISHOP only answers: the local model made things up and copied the examples, so it doesn't propose orders or links.
- **BISHOP proposes, you decide what goes out.** If you ask it to act and a signed link allows it, its answer ends in a card with up to four orders: the room, the agent, the mode and the task of each one, with **Send** and **Skip**. In its sheet you choose the mode: **manual** (everything waits for your button), **hybrid** (`#0` and `#1` orders go out on their own within the link) or **automatic** (up to `#2`). Whatever goes out on its own leaves a line and can be stopped from its row, and a failure or STOP ALL stops the rest. The room receiving it checks it itself (its link, its mode ceiling, one order at a time, without interrupting it if it is working, its hourly cap), answers it in its conversation with the «from BISHOP» mark and can't pass it on to anyone else. The answer comes back to your conversation with BISHOP as a card, without starting another response, and a line closes the plan.
- **`#3` and `#4` reach their room, they never run on their own.** BISHOP takes them as a card to the right room; **Prepare and send** writes them into the box, and sending them asks for your key as always. Rooms shows that room as «waiting for you».
- **BISHOP links rooms for you.** If a question needs a room with no link, or if you ask it to, BISHOP proposes the link in the same card: which room hands over, which one reads, which kinds, how many days and, with the Rooms room, up to which order mode. A read-only link it signs itself, for a week at most, and the card and Rooms say «signed by BISHOP» with **Revoke** at hand; if you'd rather sign them yourself, that is changed in its sheet. A link with orders is always signed by you, with the room's designation, and it releases the plan's orders that were waiting for it.
- **In the Rooms room nobody delegates.** BISHOP no longer receives the instructions for handing out work within its room: whatever it sets in motion goes through its own plans.
- **BISHOP, from any room.** Type `/bishop` and your question in any room: if the Rooms room is asleep, it wakes up; BISHOP answers with what it knows about the linked rooms and the answer arrives only for you. The agents in that room don't read it: reading another room is what a link does.
- **Each read between rooms says who and what for.** What an agent reads from another room is recorded with its name and the exact response in which it read it, and under its answer a line says «read 3 notes from gumball». The room only reads for a response that is actually running, from that agent; in Rooms, each link says who read last.
- **Recall in every response, if you check it.** Each link has a checkbox, off by default: when checked, the agents of the reading room receive in every response, without asking for them, up to 3 notes from the other room that relate to what you asked, and they say so under their answer. Each such response counts as one read against the link's hourly cap. Never in GHOST, and you check or uncheck it yourself, in Rooms.
- **A BISHOP order says it is from BISHOP.** In the room receiving it, it shows as from BISHOP, in its own bubble, with «you sent it from Rooms» or «it went out on its own, in the mode you chose»; before, it looked like a message from you, with its technical header in view. A question asked with `/bishop` shows in Rooms as yours, from the room where you asked it.
- **BISHOP's settings can be read.** Its options say what they do («Hybrid: #0 and #1 go out on their own», «Signed by BISHOP, for 7 days at most») instead of internal words, and its sheet states its status in Spanish. A module of your own can do the same with `choices` in its settings.
- **Fewer lines per plan.** What happens to a BISHOP plan (went out on its own, reached its room, closed, stopped sending on its own) is said in its own card, not in a new line each time; a link's line isn't repeated when the card already says it; and the cards no longer repeat the rules in a long footer. What a response read or recalled from another room goes in its footer, next to the memory it used.
- **A second bar, on the Mac.** To the right of the room bar, in its own glass capsule: Rooms (now a house), Reload and Settings (now a gear). They don't get arranged with the rest of the keys, and the room bar gives up exactly their width.
- **BISHOP speaks with its bubble.** In a project's room, a BISHOP order and its answer to `/bishop` look like an agent's message, with its robot and its chips on top like those of any response (who, «↳» what it answers, through which agent). Your `/bishop` looks like your message to BISHOP, without the command acknowledgment.
- **Agents, solid and flat.** Their marks in the conversation, in the bar's crew and in the box's picker are discs of their vivid color, without shine or gradient, with a short shadow that lifts them like the bubbles. One that isn't ready keeps its outline.
- **The house and the gear move.** When the pointer passes over, the house shakes and the gear spins; with Settings open, the gear lights up and its center becomes hollow. With reduced motion, they don't move.
- **Memory has a chip.** Its icon in Settings is now a chip instead of the light bulb.
- **The room's lines, always rounded.** Link and memory notices have rounded corners, are centered and measure what their text measures, also without a landscape background (before, there they looked like straight blocks). The text under «LINK» no longer starts with a stray dot. Notices that warn or ask for something (plans, permission changes, escalations, alerts) keep their color.
- **The effort box no longer flickers.** As you move across each point on the rail, the text changes in place; only the speed and cost bars slide.
- **The text box sinks again when you click**, over its new white layer.
- **The desktop responds on press.** A click on the empty background moves the windows aside or brings them back at that moment, without waiting for the release; over text it still waits, so as not to break a selection.
- **The editor bar, tidied up.** The file type goes next to the name, and Read, Edit and Open raw are in one chip.
- **A window's size buttons take the accent** when the pointer passes over and when they are active, like the other keys.
- **Each agent's sheet, in groups.** At the top what was spent, with its bar and when it resets; below, Provider limits, This room and Connection, each with its title, in the reading font.
- **In the agent picker, the ones not chosen are dimmed.**
- **Module boards, aligned.** Each tile reads from the top (label, figure, note), the big one takes two rows only when there is something to fill them with, and the figure fits its tile instead of getting cut.
- **Aligned tables.** The Intentions table has headers (request type, level, turns, status) and fixed columns; in message tables, a column of figures is right-aligned; in the economics one, the header of the first column goes to the left.
- **MU/TH/UR:** its settings (now with the gear), NOSTROMO and help are next to the macOS · Linux rail.
- **The cost of Codex, Gemini and OpenCode.** Next to its tokens, each response says how much it would cost at the list price of its model's API, with «≈» because it is an estimate (Claude already showed its own). It is only calculated for models whose price was read from the provider's page; an unknown one shows no price. With a subscription it may cost you nothing per response, and the figure says so when the pointer passes over.
- **Session indicators, in three brand colors:** green with a session, amber while it starts or if unknown, red without a session. They no longer follow the accent color.
- **«Still open here» no longer cuts questions.** The row moves from question to question, so the one at the start is always complete, and the side with more fades out instead of cutting.
- **«Still open here» made of the same glass as mode, model and effort.** The questions, their label and their × are capsules of that row's material: the room's background translucent, with the landscape blurred behind, without bevel, shine or shadow; when the pointer passes over they get a little denser. When the row doesn't fit, only the question cut by the edge fades out, and the glass still sees the background.
- **Stopping a plan is a round button** next to the PLAN title, like a response's actions, instead of the word STOP at the end.
- **The buttons of the CREATE permission notice**, in the new style: capsules in the room's font, in sentence case («Resend to @codex with CREATE», «Always for this agent»), without an outline.
- **Effort chosen for just one message is no longer underlined.**
- **The quoted response inside the box** stays within its border, with a concentric corner; before, it stuck out on the left.
- **The living Macroverse.** Each awake universe spins and beats, and the pulses from its core run toward its memories and between them, without pause; the veins between linked universes carry pulses even if nobody has crossed. Each universe is drawn at the size it is seen: as you get closer it gains detail and brightness, and from afar its lights soften, its memories don't get lost and its core reads first.
- **Choosing a universe dims the whole space**, edge to edge, and more when you have a memory in your sights; the black square around the universe no longer appears.
- **Macroverse memories open in windows**, as in NOSTROMO: they move by their header, come to the front when touched and close with their ×; up to four at once.
- **Distant aberrations**, in the Macroverse and in each room's NOSTROMO, look like a dark dot with its ring of cold light, instead of a black stain with gray dust.
- **The lobby is the first screen.** `npx @jossuealcala/madre`, from any folder, opens the lobby: all your projects in one place, with BISHOP at the top as a section of its own (your super agent: it reads across projects, signs links and carries orders). `madre start` inside a folder still opens that project directly. «The Rooms room» stops existing as a name: it is the lobby, and BISHOP lives there.
- **Add projects from the lobby.** The «Add project» button shows the folders that look like projects in the usual places and a browser for your folders; you choose one or several. Adding doesn't open: each one stays in the lobby, asleep, until you open it. A folder you already used with MADRE keeps its conversations and its memory. MADRE only reads folder names inside your user folder, never what the files say.
- **The first time, three steps:** connect your agents (once for all projects), add your projects and open the ones you are going to use.
- **NOSTROMO opens several memories at once.** Each memory opens in its own sheet, which moves by its header, comes to the front when touched and closes with its ×; four fit, and opening a fifth closes the oldest.
- **A roomier NOSTROMO.** MADRE is 10% bigger, memories spread out more and the constellation takes up more of the canvas.
- **The core, in the room's language.** It leaves the green terminal behind: it is a window like Settings and MU/TH/UR, with its tabs as a picker, figures in tiles, rows in cards, text in sentence case and monospace only for literal content. It opens without the boot animation. It looks just as good in light and dark theme.
- **Installing, updating and uninstalling a module** ask with the room's sheet, not with the legacy console.
- **The bars are not the desktop.** Touching an agent sphere, or anything in the top bars, no longer moves the windows aside or brings them back; that gesture is for the conversation background.
- **The conversation in depth planes.** Each kind of message sits at its own distance: your message in front, solid; errors and critical alerts right behind, with their color on a solid surface; handoffs, memory, links and delegated steps on a translucent middle plane where the background shows through; agents' responses in white, integrated; chips and stamps almost on the background, without shadow. The depth comes from the material, the border and a short elevation that grows with the plane, not from big shadows; no shine or halos, and it works in light and dark, with or without a landscape background. It replaces the ladder of white tones from the previous round.
- **Asking to run a command inside a plan no longer looks like a new plan.** A delegated step (or a BISHOP order) that ended with a block to run a command triggered the «tried to open a plan inside a plan» alert; now only a real plan triggers it.
- **Reading and ordering no longer use each other up.** Each link counts its reads and its orders separately, each against its own hourly cap: asking BISHOP doesn't exhaust the orders.

### A clearer NOSTROMO

- **MOTHER's explosions spin with her.** Each explosion is born at a point on the rock and travels with the crust as the sun spins; before, it stayed fixed on screen while the body spun some forty degrees beneath it.
- **Memories are a fifth smaller**, all by the same factor, so they keep their proportion to each other and the map opens with less noise.
- **The sheet says where each memory is.** The zone (hold, bridge, medbay or airlock) goes in a mark of its own color —green if it travels to responses, amber in the medbay, gray in the airlock— and underneath it says what that means. Before, it was one more line on the sheet and its meaning only appeared when the pointer passed over.

### Your first time in MADRE

- **A new five-stop tour**, over the room itself: the box and how to ask each agent (with `@`, the mode and `/`), MU/TH/UR and what it keeps inside, several conversations at once, the gestures to get around (right click on the bar, click on the box, dragging windows, `⌘ ,`, Esc) and the modules. Each stop lights up its part of the screen and says in a short list which key does what.
- **First steps, in the bar.** Anyone arriving for the first time sees a pill with a ring that fills up: «First steps 2/6». It opens a card with six things to do: your first question, asking the whole crew for something, opening MU/TH/UR, opening a second conversation, arranging the bar and opening a module. Each one has a «Show me» button that takes you right there. None is checked off with a «done» click: they check themselves off when you actually do them, and the first question and the first plan are taken from the room's log. When all six are complete, the pill goes away; if you hide it, MU/TH/UR's `?` brings it back.

### Fixes

- **Scrolling the editor no longer moves the room behind it.** Over the line numbers, the bars or the status line, the wheel went to the conversation; it also did when the text reached its beginning or its end. Now the wheel always moves the editor's text, and the same goes for the file viewer.
- **Bubbles no longer come out blank when scrolling up the conversation.** Each bubble and each line in the room blurred the background on its own, and with a whole conversation the browser ran out of memory to paint them: they came out as white rectangles, without corners and without text. Inside the conversation nothing blurs the background anymore; the bar and the box keep their glass.

### The conversation, in layers

- **Each kind of message lives at its own height.** At the top, what was said: agents' responses and your messages, with the brightest tone, a line of light on the top edge and a long shadow. In the middle, what the room did (plan, handoff, memory, modules), with a lower tone and a short shadow. Close to the photo, the labels for who answered, the time and the tokens. In dark, the highest is the lightest; in light, the shadow marks the height. The tones are dense so they can be read over any background.
- **A plan step no longer has a color bar on the left**: it is just another response, with a slight tint of the color of the agent that wrote it.

### Build the bar your way

- **Build the bar your way.** Right-click any key in the bar (or hold it down on a touch screen) and the bar opens for editing: the keys wiggle, each one carries a «−» in your accent to remove it and a card underneath shows what is missing, ready to add with a click. Besides the usual ones you can add Memory (opens Settings › Memory), Ash, Intentions, Ollama and any module of yours that opens in a window; you can also drag a key to move it. Settings can't be removed and always goes last. Done, Esc or a click outside closes editing, and the bar stays that way in this browser.

### GitHub, in the room

- **A new module, GitHub, brings your project's GitHub side into the room.** Type `/gh` and a card says how many pull requests and issues are open and how CI is doing on the branch you are on. `/gh pr` lists them, `/gh pr 12` opens one (its branch, whether it can be merged, how much it changes and who reviewed it), `/gh ci` shows each check and the latest runs, and `/gh issues` lists the issues. Everyone reads it, agents included.
- **Publishing asks for your word, like `/git push`.** `/gh pr create "title"`, `/gh comment 12 "text"` and `/gh issue "title"` first show exactly what would be published, where and with which account, and publish nothing. The same line with `confirm` at the end publishes it.
- **Agents read GitHub in any mode and write only in `#4` AIRLOCK.** Opening a pull request or an issue, or commenting, goes out under your name and can't be undone, so the room withdraws those tools below `#4` and the server itself rejects them there too.
- **No new keys if you already have `gh`.** If the GitHub CLI has a session on this computer, the module uses it and MADRE stores nothing. If not, you paste a fine-grained access token in its sheet; it is saved in MADRE's vault and never appears on a card, in the outbound log or in what an agent reads. The sheet says which account it signs in with and which repository it found, or what it is missing.
- Each request to GitHub is recorded in the outbound log as coming from the GitHub module, separate from the daily version check.

### SETTINGS: everything you configure, in one window

- **The bar button that opened PERSONALIZE now opens SETTINGS** (also with ⌘, or Ctrl+,). It brings together what used to be scattered between PERSONALIZE and MU/TH/UR, in three groups: **You** (Appearance, Room and turns), **The crew** (Agents, Memory) and **System** (Privacy, Version and reports).
- **Each card says how that setting stands before you open it**: how many agents have a session, how many conversations work at once, what memory archives, how many private terms there are, whether your version is up to date. If something needs your attention, it says so in amber.
- **The most used settings change from the card, without opening it**: the theme, Multitasking, key redaction and auto-report.
- **When you open a category**, its settings appear in a sheet alongside and the board stays in view. Esc closes it, and another Esc closes the window.
- **A search box for any setting.** «/» focuses it; it finds categories, fields and agents, with or without accents («version» finds «Versión»). Enter opens the first result and takes you straight to the field, which lights up for a moment.
- **Everything is saved instantly.** Appearance applies while you choose, and the room's limits (budget, steps, timeouts, OpenCode model, delegation) are saved to `~/.pulse/config.json` as soon as you change them, with no SAVE button anymore. The language applies when you decide to reload.
- **The window adapts to its size.** Wide, it shows the board in three columns with the sheet alongside. Medium, the category takes up the whole window with a way back to Settings. Narrow, a column of icons stays on the left with the category beside it. If you shrink the browser, the window shrinks so it doesn't spill out, and it gets its size back when there is room again.
- **The six categories are made of the same pieces.** Each one is built from blocks: a title, a line explaining what it is for and, below, rows with what each setting is on the left and its control on the right (switch, picker, counter or field). Everything uses the room's font and is written as a normal sentence. Monospace is kept only for what is written literally: paths, versions and commands.
  - **Appearance** starts with the preview and continues with Language and theme, Background, Accent and Conversation.
  - **Agents**: each agent has its sheet, with its status in words (Signed in, Not signed in, Not installed) and its permissions and modes, each mode in its color.
  - **Memory** opens with four figures from the archive and its maturity, with the next step. Below come the archivist, recall, the dataset and, collapsed, the analysis and the three tests.
  - **Room and turns**, **Privacy** and **Version and reports** are no longer console forms: each group of settings is its own block.
- **Buttons feel like keys.** The ones in the bar, the conversations one and the ones in SETTINGS no longer have the line of light on top or the inner shadow at the bottom that read like eyebrows on the edge. Now they are raised over their own shadow: when the cursor passes over they rise a little and when pressed they sink. The accent-colored button no longer has a shine.
- **The accent reaches all of SETTINGS**: switches, labels and buttons take the color you chose, not just the buttons.
- **Help text weighs less.** Titles carry the weight; what explains them uses the same light font as the conversation bubbles.
- **Going back to the board is a round button with a chevron**, next to the category title.
- **Appearance puts first what you change most.** Under the preview comes Color (theme and accent), then Background and Conversation, and finally Language, which reloads the page. The preview stays fixed at the top while you scroll down.
- **The chosen mode is marked as soon as you touch it** and stays there while it saves; if saving fails, it goes back to the previous one.
- **An agent's key and sign-in command are now part of its sheet**, instead of a black terminal box. Each CLI's notes on how it signs in are now in Spanish.
- **A category's sheet widens like a server view**: drag its left edge and it remembers the width. Double-click the edge to return it to its normal width.
- **The search box sinks when you type**, like the text box.
- **MU/TH/UR no longer has Connections, Memory, Release, Turns or Sentinel.** All of that lives in SETTINGS, and its **⚙ SETTINGS** button opens it. The notices that sent you to Connections, the new-version pill and «Always for this agent» open SETTINGS straight to the category, and to the agent when it applies.

### MODULES as a board, and MU/TH/UR with the remedy first

- **MODULES is a board of cards**, in the same style as SETTINGS. Each module is a card with its icon, its name and a line about what it does. The ones with a switch are turned on from the card, without opening it. Ash, Intentions and Ollama take up two columns and show what they say about themselves at that moment. The ones turned on go first. A search box finds a module by its name or by what it does.
- **Touching a card opens the module's sheet** in a sheet next to the board, or in the whole panel if it is narrow. It is the same sheet as always, with everything it does, now with the blocks, font and buttons of SETTINGS.
- **Ash, Intentions and Ollama can be opened in a window**: their sheet floats over the room, moves, resizes, remembers where it was left and stays up to date. MADRE decides this for its own modules; the SDK doesn't change.
- **«Create your module»** is the last card. It opens a four-step guide: asking your agent for it in the room with /module, writing it yourself (with the folders where it lives and the SDK), reloading it without restarting, and what happens if it talks to an outside service. At the end your modules appear, and the ones that didn't load, with the reason.
- **Each MU/TH/UR condition says first what to do.** Below come the buttons that fix it from the room (raising a limit, opening the agent in SETTINGS), then the terminal commands, the collapsed diagnosis and, at the end, **«Not fixed? · Report»**, which opens the report with the condition's code: in Spanish, the madre.run form; in English, a GitHub issue.
- **SETTINGS › Files and servers**: where Finder (alongside or in a window) and servers (docked or in a window) open without having to open them, why the file viewer always opens alongside, and the switches for the sealed preview (RIPLEY) and the agents' browser (Playwright). **Finder and Servers have a gear** in their header that opens this category.

### Modules as small apps, and a clearer bar

- **Ash, Intentions and Ollama open as small apps.** In its window each one shows everything it has. Ash includes its full economics (what was charged, what wasn't, each agent and the comparison with and without Ash) at whatever size you give the window. «See the economics» no longer opens another panel: it opens Ash's window. The window has the same arrange and close buttons as the others.
- **MODULES cards are all the same size** and no longer repeat the server status. The label remains, and «Opens in a window» on the ones that can. Icons are in your accent color, with their background; those of modules that are off, in gray.
- **Fixes in MODULES:**
  - A click on an empty space on the board was taken as a click on the desktop and moved the other windows aside; not anymore.
  - The bar button brings the board back when it was already open but moved aside or behind other windows.
  - The main button of the guide was invisible in light theme.
  - The guide cut off the list of your modules.
- **When dragged, a window keeps its color.** SETTINGS, MODULES and a module's window turned white while they were being moved.
- **Help text reads like the conversation**: the same font, at normal weight and in a firmer ink, in SETTINGS, MODULES and the guide.
- **Window names carry more weight**: SETTINGS, MODULES and CREATE YOUR MODULE, aligned with their buttons.
- **Bar keys never show a border**, not with the cursor over them, not pressed, not focused with the mouse. Their face is just slightly lighter at the top than at the bottom, as if the light came from above.
- **The LIVE light is a green dot that breathes** next to the conversation name, a little higher than the text. When the cursor passes over, it says its status. In the bar's path, the project weighs more and the conversation less.

### Keys of a single material, and MODULES as a window

- **All buttons are the same key.** They are made of the same color as the surface they sit on, without border or gradient. Two soft shadows, light at the top left and shadow at the bottom right, raise them; when pressed, those same shadows move inside. This applies to the bar, conversations, SETTINGS, MODULES and each window's buttons. In pickers and window button groups, the rail is sunken and the chosen option raised. Fields and the search box are the sunken half of the same material. The accent-colored button keeps its color and its relief.
- **MODULES is a window like SETTINGS.**
  - It is dragged from its header, resizes from any edge and remembers where it was left.
  - It has the same two buttons as SETTINGS: arrange and close.
  - It adapts to its own width: the board goes from four columns to three, two or one. When narrow, «Add a module» becomes just «+» and the title is hidden.
  - If it is already open but behind other windows, the bar button brings it to the front; if it is in front, it closes it.
- **Each module opens on its own board**: its status and its version, and the figures it keeps.
  - Ash: tokens not charged, turns measured and what was read from cache.
  - Intentions: turns observed, how many times the level was enough and, when there is something to calculate it with, the tokens you would have saved.
  - Ollama: the server, the models and the embeddings.
  - The rest: how many things it touches and how many commands it adds.
  - «What it touches» and «Commands» are now room blocks. Your module carries the same «Yours» label as on the board.
- **In light theme, the main buttons inside a module sheet** («Full test», «A pair is waiting for you») came out white and without text.
- **The Appearance preview doesn't move**: it stays fixed at the top and only the controls below scroll.
- **The LIVE dot no longer gets cut off** at the top of the bar.

### A module's sheet, with the hierarchy of SETTINGS

- **Each module's sheet is built from the blocks of SETTINGS**, no longer with the console card dressed up on top:
  - first, its figures;
  - then «What it does», with its «Active» switch, its status and the version with «Look for a newer one»;
  - its settings as rows, with the name on the left and the control on the right;
  - its keys;
  - what it reads: Ash's economics, what Intentions measured, the local brain and Ollama's roles;
  - at the end, «What it touches» (the label and the words on one line) and «Commands».
  - A module's window shows the same sheet.
- **Figures read like figures.** The main one is bigger and in your accent, and the others accompany it in a mosaic that adapts to the width of the sheet or the window. A module that keeps no figures of its own doesn't get made-up figures: it opens on «What it does».
- **Ash's economics is a tidy mosaic.** The six figures go in a row of equal cards, then the readings in cards of the same height and the per-agent table at full width. In a narrow sheet it settles into one column.
- **Pickers can be slid.** Besides touching an option, you can drag from one to another: a raised piece follows the cursor or your finger and the option where you let go is chosen. The rail has breathing room around its options and the chosen one has more weight.
- **MODULES window buttons go on the right**, as in the other windows.
- **Search boxes sink when you type without glowing around them**, and their icon doesn't light up.
- **The Appearance preview scrolls with its section again.**

### Notices that say their tone

- **Notices are a one-line pill** above the text box, of the room's surface and with a flat, discreet shadow underneath, without reflections around it. Color goes only in a dot: green when something got done, amber when something needs attention and red only when something went wrong. Before, any notice came out red, even if it said «saved».
- **The model avatar in the conversation is flat**: a solid shade of the agent's color, without light or shadow, with the provider's logo bigger and in the agent's full color so it can be read at a glance.

### MU/TH/UR, a window with the answer first

- **MU/TH/UR is a window like SETTINGS and MODULES**: it is dragged by its header, resizes from the edges, remembers where you left it and has the same arrange and close keys on the right. It is no longer a terminal; all that remains of it is the name, MU/TH/UR 6000. Opening NOSTROMO or SETTINGS from it leaves it where it was.
- **Type a symptom and the answer comes first.** On the right, the remedy that best matches; on the left, the list with the rest of the matches. If what you type doesn't name any condition, MU/TH/UR looks for the closest ones by their words instead of staying blank.
- **The list is filtered with chips**: All, This room, Blocking and one per agent, each with its count. If something happened in the room, it opens on **This room**, with what happened at the top and its most likely remedy below; from there you can download the log, dismiss notices or recover the dismissed ones. Whatever MU/TH/UR doesn't know yet can be reported in one click.
- **Each remedy follows the order of SETTINGS**: what to do, the key that applies it from the room, «In your terminal» with your system's commands, «Why it happens» collapsed and «Not fixed?» with its Report button. A colored dot on each row shows how serious it is.
- **«Ask MU/TH/UR how» on a permission opens the remedy directly**, already selected in the list. If that agent doesn't have its own, it opens the general one for the permission, and if that doesn't exist either, it searches by the permission's name. Before, it typed a code into the search box and, for some agents, found nothing.
- **It works in a narrow window**: the answer stays on top and the list below. Long titles are trimmed so the agent and the code stay in view.

### Intentions learns from your real usage without spending tokens

- **Intentions learns from the turns you already sent.** Before, it only learned with tests that asked questions again at two levels, and with an agent that reads the project in every response a quick test could cost millions of tokens. Now it reads what already happened in all of the project's conversations: at what level you asked for something, what kind of request it was, how much it cost and what you did next. Everything is calculated on your computer, from the room's log, and nothing new is written or sent.
- **When a level was enough and when it fell short.** It fell short if the turn failed, if you rated the response badly, or if in the next 15 minutes you asked the same agent for the same thing again: with «still not working», in almost the same words or at a higher level. A STOP counts only if you asked for it again afterwards. It was enough if you rated it well or if you moved on to something else. A turn from less than 15 minutes ago, or one that failed because of a provider limit, doesn't count either way.
- **A level is enough with at least 8 turns** and if, even in the most pessimistic reading, it was enough in three out of four, without being clearly below the level above. What was measured with a test still outranks what was observed, and what was observed outranks the rule.
- **Under the box it says so with its source**: «Looks like an explanation · MEDIUM was enough in 14 of your turns · about 40% fewer tokens», with the «From your usage» label.
- **The sheet starts with what your usage taught**: turns observed, how many times the level was enough and, as an estimate, the tokens you would have saved. Each request type says its level and in how many turns it was seen, or «learning · 3 of 8 turns». The tests are still below, in «Measure faster», with their price.
- **Intentions proposes trying a lower level on a single message.** Your usage only teaches the levels you use, so if you send everything at the usual level it would never see whether a cheaper one is enough. When the rule thinks one level lower is enough for a search, an explanation or a review, in `#1` or `#2`, under the box it says «Looks like a search · LOW might be enough · try it on this one and Intentions will notice», with the «Try» label. «Try low on this one» changes the level only for that message; the next one goes back to the one you had. It proposes it at most on one in three qualifying messages, until it gathers 8 turns at that level; never in `#3` or `#4`, nor for a change, a diagnosis or a design, nor with the provider's window almost full. If it wasn't enough, the next request of the same type offers you to go back to MEDIUM, and if it fell short two of the last three times, it stops proposing it for a week. «Not now» puts it away for a day. The sheet says «trying LOW · 3 of 8 turns» or «paused until» the date.

### MADRE 1.0, and measuring with Intentions without surprises

- **This version is 1.0.0.** The complete redesign (Settings, Modules, MU/TH/UR, Permissions, GitHub) makes it a major. The Windows port moves to 1.1.0, and MADRE still declares neither support nor non-support of Windows. When updating, a new what's-new sheet tells the main points.
- **What's new is a board.** When updating, a window opens with «You have 1.0» and twelve cards, each with its image and a line. A card opens the full note in the same window, with where it is and a «Take me there» key that closes the board and opens that place (Settings, MU/TH/UR, Intentions, Permissions, GitHub, the bar in edit mode, MODULES, NOSTROMO, Finder…). ← and → move from one note to another; Esc goes back to the board and another Esc closes it. It can be opened again whenever you want from Settings › Version and reports › «What's new in this version».
- **An Intentions test states its price before running**: how many turns and how many tokens, calculated from what a response cost in this project. If there is nothing to estimate it with, it says so. The full test no longer asks you to press twice: it asks once, with the price.
- **A test that fails saves why**: the first line of the error and what it cost. The sheet says how many tests failed and the last reason, instead of just «0 types measured».

### Intentions talks to Claude too

- **Intentions now suggests when you write to Claude.** Claude Code doesn't say what effort it runs at by default, and without that starting point the rule stayed silent whenever there were no measurements. Now, without making up that level, it names the one that fits for deep requests («Looks like a diagnosis · HIGH usually works well · Raise to high») and invites you to measure on light ones. With Codex it still compares against the level its configuration declares.
- **The suggestion under the box uses the room's style**: a light card, the reason in one sentence with a dot in your accent, and a single key in your accent.

### Narrow MU/TH/UR and the rounded corner

- **MU/TH/UR in a narrow window is a list over its answer**: the filters and conditions in a short strip that scrolls on its own, and below it the full chosen remedy. Before, the list overlapped the remedy.
- **The corner for resizing a window follows its curve**: a short, rounded arc with round ends, instead of the right angle. It lights up in your accent when the pointer passes over.

### Soft relief, a single material and cleaner responses

- **SETTINGS, MODULES and MU/TH/UR cards have soft relief**: they are still white, lit from the top left by a broad light and settled at the bottom right by a diffuse shadow, with a fine bevel inside the border. The cards were spaced out a little so the relief has room.
- **Finder and Servers use the same material** as SETTINGS, MODULES and MU/TH/UR, instead of flat white.
- **Stopping a response is just an icon**: a square inside a circle that turns red when the pointer passes over and blinks while it stops.
- **Ash's «Per agent» table is a table again**: the headers in a single row, in the reading font, and the numbers aligned; in a narrow window it scrolls sideways.
- **A response's footer is a single line, without a divider**: the time, tokens and cost on the left, discreet and in lowercase; rate, copy and reply on the right, when the pointer passes over. A short response no longer grows by three lines. The room's running total lives in the tooltip.

### New file from Finder, and the full «Review it with»

- **Finder has a new-file key next to the search box.** It asks for the path from the project root in the room's alert, creates the empty file (and any missing folders) and opens it in the viewer. It never touches a file that already exists, doesn't leave the project (no `..`, no drive like `C:` or UNC paths, nothing inside `.git`) and the files the room protects ask for the project name, as when saving.
- **The editor's «Review it with» menu no longer gets cut off.** It lives in the top layer of the page, positions itself according to its real size (above the button when it doesn't fit below) and speaks like the rest: what gets sent in small mono, the question in sentence case and the agents as rows.

### Downloads you can see, and the room with its badge

- **Every download or installation shows its real progress** in a light sheet under the bar: updating a module, installing or starting Ollama, downloading a model or installing an agent's CLI. It says what is running and how long it has taken, and shows the percentage and MB when the installer prints them (Ollama does; npm and brew almost never, and then the bar only shows that it is still working). Below goes the installer's last line. It can be hidden while it runs; when it finishes it says «Done» or «Didn't finish», with the details.
- **Updating a module asks in the room's alert**, with the exact command it is going to run. Before, the confirmation was drawn on the module's old card and, in the new sheet, the button seemed to do nothing.
- **«This room», in MU/TH/UR, carries the bar's badge** when something happened in it.

### Icons in your accent, and @madre no longer «needs installing»

- **All icons carry your accent**: Settings categories and the alerts' glyph (the #3 and #4 key, the room's questions and access to NOSTROMO, which is now the brain). Only a question that deletes something keeps the red.
- **@madre no longer shows as «not installed»**. @madre isn't installed: it is the room's local agent and is present while Ollama is running with a chat model. When Ollama stops, the room says @madre left because Ollama isn't running, and MU/TH/UR shows @madre's remedy with a key that opens Ollama. Before, it diagnosed it as an agent that wasn't installed and sent you to Settings › Agents, where @madre doesn't appear. Old logs with the previous phrase also get the right remedy.

### NOSTROMO in the bar and a readable footer

- **NOSTROMO has its button in the top bar**, next to MU/TH/UR: a brain that beats when the pointer passes over (two pulses and a pause) and opens the same door. The button inside MU/TH/UR uses the same brain.
- **The version and the author can be read over any background**: in the reading font, over the room's material and with the version a little bolder. The «Support» link was removed.

### Four new accents and four new backgrounds

- **New accents**: Azul Pacífico, Rosa Amor, Azul Sierra, Pitahaya, Papaya (Pantone 15-1243 TCX), Agave, Negro Dinamo, Azul Marina, Verde Pulso, Naranja Leal and Amarillo Dulce. Like the others, each has its darker version to read well in light theme, and your bubble goes in the full color.
- **Magna and Ventura get a new photo**, with their veil, mesh and tint recalculated.
- **New backgrounds**: Biznaga, Oceano, Quila, Xico, Tropical, Tradicion and Urbania, with layer or mesh, intensity and blur like the others, and a veil and a tint taken from each photo's colors, in light and in dark.
- **Background cards are taller**, so more of each photo shows.

### NOSTROMO in the room's language, and its links back

- **NOSTROMO shows the links between memories again even when Ollama is off.** The links come from comparing the vectors already saved, and the room only looked for those of the embeddings model in use: with Ollama off it switched to Gemini, Gemini had no vectors and the map was left without links. Now, if the model in use has no vectors, the map uses those of the model that embedded the most memories.
- **Access to NOSTROMO is a room alert**, like the #3 and #4 key: «Board NOSTROMO», what the archive is in one sentence and the field for the project name. MOTHER's knocks still count.
- **NOSTROMO's frame speaks like the other windows**: the name in small mono, the reading (memories, recalled, links) in sentence case, the types as dot and word, soft keys and the footer in sentence case. A memory's card and the questions card are dark glass with sentence-case labels, figures in small mono and «Forget this memory» in a soft red. The map doesn't change.
- **The #3 and #4 key, cleaner**: one sentence about what it allows, another more discreet one about what protects it, the note about the maximum mode as a label when it applies, and the field says what to type above it, without placeholder text you have to delete.
- **SETTINGS cards start at the same height in all three columns**, even if a header takes two lines, and in a narrow window they don't stretch. The System header now says «Permissions, privacy and the version».
- **In Permissions, the key rail goes below its text and at full width**, with each option on one line.

### Room alerts with a single shape

- **The room's questions are a narrow, centered sheet**: the icon for what is at stake (a red triangle if something is lost, a padlock if it asks for a key), the title in sentence case, a line and the two keys at full width. «Unsaved changes» and the other confirmations drop the console capitals; the questions that come from the console keep their console.
- **The key for #3 CONTROL and #4 AIRLOCK is that same alert**: «Arm #3 CONTROL for @agent» or «Open #4 AIRLOCK for @agent», what it allows the agent in one sentence, the sunken field for the project name, your phrase or AIRLOCK, and Cancel or Arm. The padlock carries the mode's color. App modals (NOSTROMO, the core, the viewer, the modules guide) don't change.

### Permissions: each mode's key, your way

- **SETTINGS has a new category, Permissions**, under System. It brings together how #3 CONTROL and #4 AIRLOCK are opened and how far each agent can go.
- **Each mode's key can be chosen.** #3 can ask for the project name (as until now), a phrase of yours or just a one-click confirmation. #4 always asks for something, because it runs commands: the project name and then AIRLOCK (as until now), your phrase and then AIRLOCK, or just the project name.
- **Your phrase is never saved.** The browser computes its fingerprint (salted SHA-256) and only that stays in the configuration; MADRE can't read it back. It is typed regardless of capital letters or extra spaces. Forgetting it switches the modes that used it back to the project name.
- **An accepted key can last a few minutes.** With the grace period on, the same mode for the same agent doesn't ask for the key again for 5, 15 or 30 minutes in #3, and 5 at most in #4 (off by default). Next to the mode a chip appears, for example «#3 open · 12 min», whose × closes it. Reloading the page or STOP ALL also closes it, and raising an agent's maximum mode always asks for the key.
- **Who can do what**: each agent's maximum mode is in a single table, with each mode's color. The agent's sheet shows it and leads there with «Change in Permissions»; the starting mode stays in the sheet.

### Remedies with hierarchy and rails with a single tab

- **Each remedy reads in three weights**: the title; below, a discreet line with the severity (the only word in color), the agent and the code; and then what to do, in the reading font and without a label above. The keys that fix it remain as rows.
- **MU/TH/UR's gear opens its own settings**: the sentinel in Version and reports, that is, what it keeps of what it can't explain and whether it reports it on its own. The report button in the header was removed; reporting lives in each remedy's «Not fixed?».
- **The MU/TH/UR icon beats when the pointer passes over**: a pulse runs along its stroke like on a monitor. It stays still if the system asks for less motion.
- **Rails have a single tab that slides.** When you choose another option, by click, keyboard or sliding, the same tab travels to it. Before, the previous option faded out while the new one lit up and for a moment you saw two.
- **Responses are glass over a background**: the background blurs and lightens behind the bubble, with a whiter tint than the room's lines (memory, handoffs), so a response is never confused with them. It floats over a low, soft shadow, without edges of light around it.
- **Who each message goes to can be read over any background**: «→ @agent» keeps the agent's shade, but blended with the theme's ink and with more weight.
- **SETTINGS quick rows breathe**: the Theme rail no longer touches the edges of its row, and a switch whose text takes two lines («Auto-report unknown conditions») has reading line spacing.

### A single light and the SDK guide up to date

- **All surfaces share one light, softer.** Buttons, cards, tiles, figures and blocks get their light from the top left, with lower shadows than before. A button is the small version of that light and a card the big one; pressed elements and fields sink the same way.
- **Search boxes really sink when you type**, and the Finder one is the same field as in SETTINGS and MODULES, with its magnifying glass.
- **Mode numbers go in their mode's color** (#0 to #4), whether chosen or not.
- **An agent's key and sign-in command follow the same style as the rest of the sheet**: sentence-case labels, sunken fields and the main button in your accent. The key field no longer says «Provider key» in English.
- **Intentions, while a test runs**: «Quick test in progress» is a card with its dot lit and buttons of its size, in sentence case.
- **New icons for MADRE's modules**, in the bar's language: rounded stroke and one part with a soft fill.
  - Ash, lines that get shorter.
  - Intentions, an effort gauge.
  - Ollama, a computer with its brain.
  - Image Studio, a photo with its spark.
  - Playwright, a browser with its cursor.
  - RIPLEY, a document with its eye.
  - Git Pulse, a branch with MADRE's pulse.
  - Runs, a play button.
  - Choices, the chosen option.
  - AHP+, a round-trip handoff.
  - CORREO, an envelope.
- **Bubbles are a surface with relief over the background**, with rounder corners. The avatar sits apart from the bubble, level with its last line.
- **The new-version notice sends you to SETTINGS › Version**, where it now restarts.
- **The SDK guide describes the new board and sheet.** A module is written the same as before (you declare and MADRE draws it), but the guide no longer talks about the console card, `DEV`, `DESINSTALAR` or `RELOAD MODULES`.

### Personalizing MADRE, and the room's cards in order

- **A PERSONALIZE button in the bar**, with just its icon, opens a window with a preview of the conversation next to the options:
  - **Language** of the whole interface, which used to be the EN/ES button.
  - **Accent**: Verde Madre, Verde Montaña, Azul Caribe, Púrpura Fantasma, Tinto Malbec and Amarillo Dijon. Each sphere shows the shade in dark theme on top and in light theme below, where it darkens to read with AA contrast. It paints the conversation, the buttons and the text box while in EXCHANGE (#1), which now has a soft border in its mode's color. The other permission modes keep their colors, because each one says how much an agent can do. The ASH button keeps Homebrew's green; when it turns on, ASH only animates the box and no longer changes its color.
  - **Bubbles**: Comfortable (the usual one), Large, Compact and Fitted, which is wider and has more air between lines.
  - **Text in the conversation**: Comfortable, Larger, Smaller and Visual, with bold.
  - **Wallpaper**: Default, **Jarrito** (Guadalajara as an illustration: mariachi, cathedral, talavera, jacarandas), **Canela** (a lake between autumn hills under the fog), **Paraíso**, **Ventura** and **Magna**. Each one has a light and a dark version, and looks after the contrast of what is written on top.
  - **Theme** (Automatic, Light, Dark), which used to be the button on the bar.
  - What you choose shows first in the preview, also with a sample button, and only reaches the room with **ACCEPT**. Closing the window discards it. **BACK TO DEFAULT** returns the preview to the usual values, so you can accept them.
  - When you hover over a sphere, its name appears next to ACCENT.
  - It is a window like the others: it can be dragged, resized, and has its window button and its ×. The right half and the conversations in windows follow accepted changes instantly.
- **ARRANGE the windows.** If you rest the cursor on the window button of any window, without pressing it, a card appears with four ways to arrange what is floating: **Fill**, **Halves**, **One and two** (one large and two small) and **Four**. The window you ask from takes the first place and the others follow in the order you touched them. If it was docked, it first becomes a window.
- **Windows have depth**: a thin border, the top edge lit and the bottom one in shadow, a faint glow from above and a three-layer shadow, deeper on the front window and on the one you are carrying.
- **A click on the desktop shows it.** With windows open, a click on any empty space in the room moves the windows aside and clears the desktop; another click brings them back. Buttons, links and selecting text do not count.
- **Glass with a water-drop bevel.** Windows and the bar no longer have a drawn border: their edge is the glass curving, with light on top, shadow below, a faint color separation along the edge and a diagonal diffraction sheen. The bar floats over that layer, translucent and blurred, so it reads over any wallpaper.
- **Over a wallpaper, everything reads.** The answer is a sheet of almost-white glass in the light theme and of the room's dark in the dark theme, with the same bevel as the windows, so it is never confused with any wallpaper. What is written directly on the wallpaper (the room lines, who answered, the time of your messages) no longer goes on a plate: it floats in a soft cloud of each wallpaper's tint (blue in Paraíso, green in Ventura, pink in Magna, amber in Autumn, bone or jet in MADRE). The card where an agent asks for a mode and the chips in the text box keep their glass plate.
- **The answer carries its own footer.** What it recalled and what it cost travel inside the bubble, below a thin line: on the left, one dot per memory in the color of its type (hollow if it came by association) and how many it used; on the right, the time, the tokens, what was not charged and the room's total. Pressing the memory opens the notes below, and each one still leads to NOSTROMO. Nothing is left loose under the answer anymore.
- **The memories an answer used, in order.** When opened they arrange themselves in even columns that fill the width of the bubble (a single one in a narrow window), with the "+N" in the last cell. The footer and the notes follow the text size and weight you choose in PERSONALIZE.
- **New images for the wallpapers.** Jarrito and Canela replace the drawn wallpapers MADRE and Autumn (whoever had them chosen moves to the one that replaced them), and Paraíso, Ventura and Magna change to versions composed for the room in 16:9. All five can be adjusted with layer or mesh, intensity and blur.
- **The crew lives in the text box.** The five spheres above the box are now a single round sphere on its left, the one of the agent you are writing to; when you hover (or touch it) the rest of the crew rises in a glass column; under the cursor, the name of each agent's provider comes out of its sphere, and choosing one closes it. The box's line spells out the full address, HUMAN › ASH › @CODEX ›, in the agent's color, instead of a separate TO @CODEX. Mode, model and effort move to a row below the box, aligned to the left with the sphere and the box. The conversation does not stop where the box begins: it continues underneath it. The box is liquid glass and, when you click on it, it sinks inward without moving or changing size: it only shades on the inside from the top edge, like a pressed key, and stays that way while you type; the ring of its mode (CREATE, CONTROL, AIRLOCK) does not change on click; and the suggested questions are centered above it, in glass, so they are not confused with a bubble.
- **The bar and the text box are almost solid**, with the wallpaper barely behind, so they read as the two fixed pieces of the room; the box is a single color, with no gradient light on its face.
- **What is offered above the box reads over any wallpaper.** The @madre offer and the Intenciones notice were an almost transparent dotted box that got lost in a photo; now they are an almost solid piece like the text box, with its same glass edge, a thin rim in its color (green, or amber when raising the effort is advisable) and the text in the theme's main ink.
- **The room lines are flat glass.** PLAN, MEMORY, the handoffs, who answered and the time no longer carry a light falling across their face: a thinner tint lets the wallpaper show through.
- **Water-drop edges, no double border.** The chips, the room cards, the memory pills, the open questions, the bar, the box and the windows were drawn with lines (a thin ring outside, a white line inside and sometimes a border on top) and read as two borders stuck to the wallpaper. Now their edge is only diffuse light on the top edge, diffuse shadow on the bottom one, a hint of pink and cyan on the sides and a soft shadow underneath, so they float over the wallpaper without any stroke.
- **The chips are flat-tone labels.** The badges of who answered (mode, ASH, closing turn, step, who it replies to, model), the agent inside a room line, the time of your message, DECIDED HERE and its decisions, the memories of an answer and the open questions are no longer capsules with an edge: they are labels with a 7 px corner, no border or shadow, filled with a faint tone of their own color (the mode's, the agent's, the memory type's, amber for decisions and gray for what has no color). The who-answered line is a flat strip that holds them.
- **In an answer's footer, first the time and then its buttons**, both on the right.
- **In the dark theme, PLAN and the faint labels can be read**: the faintest ink went up one step.
- **The text box no longer changes its border with the mode.** What changes is the send button and the words of the line (who is writing, the agent, the model). In the dark theme the box is its own graphite black, and the mode, model and effort row stays back so it does not compete with it.
- **The offer above the box (Intenciones and @madre) is flat glass** with no colored border; its button is a label in its tone, darkened in the light theme.
- **The bar buttons feel pressable**: a faint face, the water-drop edge, a shadow that grows on hover and sinks when pressed. Each drawing moves in its own way: the browser spins on its axis, the folder opens, the dots of PERSONALIZE slide, MODULES shakes, RELOAD turns around and the lines of CONVERSATIONS write themselves.
- **The wallpaper steps one tone away from what is on top.** In light, a soft gray under white sheets; in dark, almost black under graphite: the answers, the bar and the conversations button no longer get lost in it.
- **The bar buttons are keys.** A face one tone lighter than the bar, soft light on top, soft shadow below and a short shadow underneath, with no ring or colored rim. On hover they give a little and when pressed they sink further, like the buttons on a device; the one with its panel open stays pressed with its drawing filled. Their animations are faster, and the files folder really opens: its front falls forward.
- **The text box and the bar are more separated from the wallpaper**, with a deeper shadow in both themes.
- **The who-answered labels fit inside their strip**, smaller and with air around them, instead of being as tall as the strip that holds them. **DECIDED HERE** is as wide as its words, and the decisions are stone (#edece4 in light, warm graphite in dark) instead of amber.
- **NEW CONVERSATION has a bigger +** instead of the small balloon.
- **An answer's footer has a single left edge.** When the time and the tokens drop to the second line they start where the memory dots start, just like the memory pills; before, they were shifted 10 px.
- **The bar and the text box separate from the wallpaper** with the same light as the windows, from the top left, but softer: a contact shadow under the edge, another that opens out a little and a third shifted down and to the right.
- **The room's small print is Geist Mono.** The room lines, who answered, the text box, the chips, each answer's footer, the windows and the code move from JetBrains Mono to Geist Mono, the mono from the same family as the answers' typeface: rounder and lighter on the glass. MU/TH/UR and NOSTROMO, the ship's terminal, keep JetBrains Mono. The font comes in the package with its OFL license; nothing is downloaded from a font service.
- **The bar buttons, on hover, only glow at the edge.** Before, they added a 3 px halo to an accent border (two outlines) and did not all react the same way; now the drawing takes the accent and the edge catches a thin line of it on the inside, with no glow around, the same on every button and on the conversations one.
- **A new room's welcome comes in a card.** The pulse, the title, the help line and the first three questions are grouped in a card of the secondary text's glass, and the three questions are rows inside it, so they do not lose strength over a busy wallpaper.
- **MEASURE IT AGAINST THIS ROOM and the other buttons in the room lines have a single color and a single border**: their own from rest, on light glass; on hover only the fill intensifies, without moving or showing a second outline.
- **STILL OPEN HERE can be closed** with a discreet × next to its title. It stays closed for those same questions and opens again when a new one appears.
- **Concentric chips.** A chip inside a container keeps the same space on all sides and the container's radius is the chip's plus that space, so the two curves run parallel: in the who-answered row, in the mode, model and effort row, and in the room lines that carry a chip.
- **Reload has its animation, the one from when MADRE arrives.** The room softens behind a curtain of its own wallpaper and the pulse is traced in the center with its dot running at the tip. On return, the curtain is already there from the first frame with the pulse traced; when the room is ready the name MADRE appears next to the dot, the curtain withdraws in place and the logo on the bar answers with a pulse, in its dot and in the LIVE light. With reduced motion, it reloads without animation.
- **Scrolling no longer leaves empty blocks.** Inside the conversation nothing blurs what is behind it: each blur was a layer the browser had to repaint, and with hundreds of bubbles and labels, especially inside a window, fast scrolling showed gray rectangles with no text. The conversation's material is now a flat tint, a little denser; the bar, the text box and the windows, which do not scroll, keep their glass.
- **The text box in a window or half screen.** Below 560 px wide, the text takes the whole first row and the label and buttons go below; before, a column with one word per line was left, for example when loading a suggested question. In addition, the height of the text is measured again every time the field's width changes, not only when typing.
- **Dragging windows is smoother and freer.** While carried, the window is a single flat layer moved by the compositor, without blurring the room underneath again on every frame. It can be pulled partly off the left, the right or the bottom, like on a desktop, always with 120 px of its header in view to get it back; near an edge it snaps to it from either side.
- The version and SUPPORT go in the bottom right corner, sharp, with no capsule or shadow around the letters.
- **The selectors next to the crew are a single line.** Mode, model and effort no longer go in capsules: each one is its word in its color and a drawn chevron, larger, that signals it opens; with the cursor on top or with its menu open a soft background in its color appears. The memory an answer used opens with the same chevron.
- **Paraíso, Ventura and Magna can be adjusted.** In PERSONALIZE, when you choose one of the photographs three controls appear: **Layer** (the usual veil) or **Mesh** (a mesh of the photo's own colors in three corners), an **intensity** slider from 0 to 140 % and a **blur** slider from 0 to 24 px. The preview shows them while you move them and they reach the room with ACCEPT.
- The PERSONALIZE preview uses the glass of its own theme: a dark view inside the light room no longer draws a white outline around the sample bubble. It also shows the small print: a room line, who answered with its chips and the time of your message, so you can see how they read over the wallpaper before accepting it.
- **Who answered, on a single line.** The agent, the model, the mode and ASH no longer break into two lines: they keep their width, and what gives way is the quoted question, which ends in an ellipsis. Over a wallpaper, each chip is a piece of glass.
- **The room's buttons are clear glass.** INSTALL, STOP ALL and the answers to a permission or to a local model no longer have a sheen or a milky fill: they are clear glass of their own color, with what is behind blurred, a rim of the same color and, at the edges, the light separation of a lens, pink on the left and cyan on the right. In the light theme their color darkens so it can be read. They lift a little on hover and give way when pressed. The who-answered chips use the same glass.
- **Everything that goes between messages reads, over any wallpaper, the way Apple solves it.** Apple never writes text directly on a photo: each label goes on a *material* (what is behind, blurred and saturated under a tint of the theme itself) and its color is chosen against that material, not against the photo. MADRE does the same. The room lines, who answered, the time of your messages, the saved memory, DECIDED HERE, the label next to the crew and the footer go on the same material: thick enough for the contrast to be the theme's with any wallpaper, intensity or blur, and flat (no shadow or sheen) so it stays below the answer. Labels follow the theme's hierarchy: main ink for titles and secondary for the rest, never the faint tertiary. Chips on the material are a tint with a border, not another glass on top. In the light theme, the colors of notices, permissions, projections and agents darken until they can be read. Without a wallpaper, everything uses the room's ink instead of the faint gray. Before, a halo around each letter depended on the photo and on some wallpapers looked like blurred text. The material is discreet: it lets the wallpaper through with a soft blur and hugs the text.
- **Simple, solid bubbles.** A sheet of a single color, with a small, even radius and a thin shadow underneath: white in the light theme, the room's bubble color in dark; yours keeps the accent. They read the same over any wallpaper.
- **Liquid-glass secondary text.** The room lines, who answered, the time and DECIDED HERE blur and saturate the wallpaper behind them under a thin tint, with light on the top edge, the bottom one in shadow and a lens's pink and cyan separation on the sides. Only the pieces that are on screen (or about to enter) carry the glass, so a long conversation does not ask the browser for hundreds of layers and scrolling does not leave empty blocks.
- **An answer's actions live in its footer.** Rating, copying and replying with another agent left an empty line in every bubble waiting for the cursor; now they are in the footer, between the memory and the count, and appear with the cursor or focus, so the bubble is as tall as what it says.
- **The LIVE light breathes.** While the room is live, the dot swells and settles slowly and its waves follow it.
- **The room lines follow your text size and weight.** With Larger or Smaller they grow or shrink along with the bubbles, and with Visual their stroke is firmer.
- **STOP ALL inside a notice no longer jumps on hover**: only its fill intensifies. When nothing is left running, the button stays off in the history and cannot be pressed again; a notice that is loaded again when opening the room arrives off.
- **The agents' spheres can be seen over any wallpaper**: each one rests on a glass disc before taking the agent's color, in the conversation and in the text box row.
- The mark of an open question is an icon drawn for MADRE instead of a text "?".
- **The bar in a narrow window.** MADRE keeps its full name and what gets shortened is the conversation's title, with an ellipsis. PERSONALIZE and reload no longer disappear below 1180 px. The conversations button keeps floating on the canvas at any width: it is dragged and opens the list over the conversation just as in a large window. Below 680 px the title no longer disappears and the bar no longer splits into two lines. The project's name is never shortened; only the conversation's. The files no longer disappear either: only the browser withdraws below 1180 px. PERSONALIZE, reload, the browser and the files are the same size as the other bar buttons at every width: 26 px tall on a wide bar and the same 34 px squircle on a narrow one.
- **DECIDED HERE, in order.** The heading goes on its own line and the decisions below, in even columns that fill the width, instead of two on top and one loose below. Over a wallpaper, each one is a card in the wallpaper's tint.
- **The conversations button is glass and can be moved.** It has the same glass and the same thin rim as the bar. If you hold it pressed for a moment, it lifts and you carry it anywhere in the room, below the bar; it stays there the next time. A short click still opens it. With the cursor on top or while you carry it, it takes the accent color, like the bar buttons. It has more body: light falls from above on its glass, with the top edge lit, the bottom one in shadow and a three-step shadow, so it does not get lost in the room.
- The PERSONALIZE preview shows the theme you choose, even if the room stays in the other one.
- **Chips that read.** The badges on each answer (the mode, ASH, the model, who it replies to), what it cost and the label next to the crew spheres are one step larger, with a fill of their color behind the word and, in the light theme, the mode's color darkened until it can be read.
- **STOP ALL inside a notice is a button.** Before, it said STOPALL and only indicated what to type; now it stops everything like the bar button, and its red darkens in the light theme so it can be read.
- The bar's rim is thinner: half a pixel of line and half of light.
- **Depth in layers**: a window blurs only if another one really covers it (side by side, all of them look sharp), barely with one on top and a little more with two or three. The desktop (the conversation, the bar, the text box and the docked panels) is the back layer while windows float, as behind a modal. It clears while you type in the box or while the windows move aside, and as soon as you click outside it goes back to its layer. When closing windows the blur steps down in cascade, and when closing the last one it disappears. A covered window clears halfway under the cursor.
- **The desktop recedes behind a veil, not a filter.** With windows open, the room softens behind a veil that sits between it and the windows; before, each piece carried its own filter, and that dulled the glass of the bubbles and the room lines while there was a window. The conversations (their panel and their button) stay above the veil, always sharp.
- **Windows cast a parallel shadow**, very soft, shifted down and to the right as if the light came from the top left, so they read as a plane separate from the room.
- **When dragging a window, the room moves aside**: what is behind blurs a little, a faint dot grid appears, and the edge lights up when the window snaps to the border. When you let go, everything returns.
- **The agents' names in the room lines change color with the theme.** A handoff, a memory or a privacy notice drawn in the dark theme kept @madre's bright green when switching to the light theme, where it could hardly be read.
- **ASH on reads in the light theme**: it is a light terminal with the accent's tone, instead of the black terminal where a dark accent disappeared.
- **The modes menu reads like a table**: number, description and label (NOW, OVERRIDE, OVERRIDE ×2) aligned to the same right edge in all five rows.
- In the light theme, the bar buttons no longer glow on hover: the border darkens a little and a neutral shadow lifts them.
- **Everything moves faster, with the same curves.** The interface's transitions and animations (panels, windows, menus, notices, the blur) last about 30 % less, because they all depend on a single setting. The brand moments, like MU/TH/UR powering on, the logo's heartbeat or the red screen, keep their timing.
- **New icons, drawn for MADRE.** 37 icons on the bar, the text box, the windows, an answer's actions and the commands have a rounder stroke and fuller shapes: LIVE, crew, STOP ALL, MODULES (a puzzle piece), personalize, reload, theme, browser, files (a folder), conversations, attach, send, new conversation (with its + badge), point, copy, prefer and the commands `/create`, `/module`, `/image`, `/stopall` and `/ahp`, among others. They light up and thicken just as before. MU/TH/UR's 8-bit icons and the agents' marks do not change.
- **The MODULE, PRIVACY and MEMORY cards are in order**: the title with the agent, what happened in a readable sentence, the buttons on their own row and the warning at the end. Before, they were a single sentence in capitals that broke wherever it fell.

### Intenciones: how much each agent should think, measured in your project

- **A notice under the box when there is a reason.** With Claude Code and Codex, which accept effort per turn, MADRE reads what you write and the conversation up to that point and, if another level is advisable, says so in one line with a button: "Looks like a search · LOW was enough in the measured cases · USE LOW". In amber when the chosen level falls short: a diagnosis at the lightest level, a request after an answer that did not solve it, a lot to read or a "think it through". While the notice is in view, the effort chip carries an arrow. Nothing changes on its own: you choose the level.
- **To suggest a cheaper level, it measures first.** If you write at a high level something that is usually solved with less and has not yet been measured in your project, the notice does not ask you to trust a guess: it invites you to measure it. "Looks like an explanation · MEDIUM is usually enough for it, but it has not been measured in this project yet · NOT NOW · MEASURE · 6 QUESTIONS". NOT NOW is remembered per agent and model.
- **Measuring is the quick test, in a window over the room.** It takes six real questions from your conversations in this project, first of the same type as the one you were writing, and the agent answers each one twice: at your level and at the suggested one. It shows you both answers without saying which is which and you choose the first, the second or the same. If all six were of that type and you saw no difference in any of them, that level is measured for that type of question and from then on the notice suggests it with the measurement behind it; if the project had fewer, it is a first reading and MADRE changes nothing because of it. When it finishes, the window says in one sentence what is enough and what MADRE will do.
- **Two tests in the INTENCIONES card in MODULES.** The **quick test** also opens from there, in the same window. The **full test** goes down the ladder level by level for each type of question (search, explanation, review, diagnosis and design) and is judged by an agent that is not the one being measured, the local model first. Before believing it, MADRE shows it an answer cut down to a third: if it does not notice the difference, the test stops and nothing it said is saved.
- Both say how many turns they are going to spend, the full one asks for confirmation, neither runs with the agent's window above 80 % and they only ask read questions, with no permission to write.
- **A level counts as enough when it almost never loses**: with six comparisons, none lost; with twelve, one. The measurements are saved next to the room, in `intents.jsonl`, never in the conversation, are per agent and model, and stop counting when the CLI version changes.
- The card shows, per agent, which level is enough for each type of question, how many cases back it, how the judge did, the tokens spent measuring and how many suggestions you took. It turns off from its switch.

### @madre respects the form you ask for

- **"Reply only with: CANARY-071" returns CANARY-071.** A team that uses MADRE as local memory found that @madre answered with a memory from the archive instead of what it was dictated. Now an answer dictated word for word is returned without consulting the archive or the model, and it does not enter the memory. "Write only: …" is no longer taken as an order to write files.
- **If you ask for the form, @madre follows it.** "Answer only yes or no" or "in a single word" get exactly that, with no citations or explanation. The rest of the answers keep citing their source with `[#n]`, and now they do so more often.

### What each turn carries, and what the room says

- **Codex now uses the room's memory and browser.** Codex runs here without asking for approvals, and so it rejected every MADRE tool ("MCP tool call requires approval"): it had never been able to search the memory or open a page. Now the room's tools reach it approved.
- **Each turn carries only the tools it uses.** The PLAYWRIGHT browser is attached on turns that ask to see, test, capture or check the console of a page, and not on the rest. Its tools travel in every call the agent makes within the turn, so a one-line change carried thousands of tokens from a browser nobody opened.
  - Codex and Gemini receive only the 16 tools the room allows, not the server's 25.
  - ECONOMY compares the input of each agent's median turn with and without each tool server, when there are at least two turns on each side.
- **PLAYWRIGHT is tested when it is turned on.** MADRE starts its server and asks it to open a blank page. If it does not start or is missing the browser, it stays off and says what to install. If it was already on, its card says the browser does not start and no turn receives it. It also reaches the servers you start from RUNS, where an app does save its data.
- **The box shows what you write before sending it.** `#2` changes the mode instantly and is undone if you delete it. `#3` or `#4` appear in the pill as pending, with a dotted border, because their keys are asked for on send. An `@agent` at the start moves the selector, with its model and its effort, and on send the one you had comes back.
- **`/module` builds its own permission, like `/image`, and it is narrower than #2.** The agent can write only in its draft folder, and nowhere else in the project. It does not take the project's write turn, so it does not wait for another agent that is writing nor make it wait. Before, `/module` stopped to ask for the mode and then opened the whole project.
- **The close of an @madre round table quotes each agent with its own answer.** One line per agent, with its number, and the room says who did not answer. The comparison written by the local model only stays if every agent it names spoke and every quote is its own. Before, it attributed to one what another said and left agents out.
- **@madre answers in the language you write to it in**, also when the earlier conversation is in English.
- **RUNS accepts `~/` as your user folder.** The room writes every path in your folder that way in what the agents read, and an agent that asked to read a file from there got "there is no shell to expand it". MADRE expands it when running the line, without a shell. `~other` still does not run.
- The agents know that every command they give you goes in the RUNS block, so it has a button.
- **What a turn leaves shows up in FILES without reloading.** Open folders stay open and the list does not flicker.
- **UNDO also removes the folders the turn created** and that were left empty.
- **A timeout says what the agent was doing**: its last sentence, the file it was writing or the command it was running, not its CLI's JSON event.
- The card of a RUNS command says in your language how it ended and who asked for it.
- **The privacy notice says what was hidden**: a term of yours, a key or your user folder. Before, it called the path to your folder a "private term".
- **The agents' links to project files open the viewer**, also those that bring the path with `~`. Before, the raw markdown was shown.
- The notice that "something was asked to be created" no longer shows when you ask for a plan before writing code or for it not to touch files.
- When speaking to `@madre, …` a loose comma is no longer left at the start of the message.
- The line under the box says that the agents write only when you raise the mode.
- The two ways out of a mode request say what they do: **GRANT #n · LET IT GO ON** and **GRANT #n · GIVE IT ANOTHER INSTRUCTION**.
- A new conversation is called **Untitled**, and the first one, **First conversation**.
- **The blank page keeps its suggestions** until the conversation starts; before, the @madre notice removed them on entering. In an empty folder it suggests how to start a project.
- The tour card stays where it is as long as it does not cover what it points at, so "Next" does not move under the cursor. On short screens it scrolls instead of sticking to the edge.
- The × of MU/TH/UR is called **CLOSE MU/TH/UR**.
- The first time Conversations or Files start floating over the conversation because the browser or a split took their place, the room says which ones and that they come back on their own when there is room again. If the browser card is open, the notice waits until you close it. The same, once, when a split becomes a window.
- An `.html` file created by a turn is registered as HTML. It still opens as text outside RIPLEY, where it never runs in the room.

### Writing a project from start to finish

- **Gemini writes again.** Gemini CLI rejected in full the policy with which MADRE opens the project to it in #2, #3 and #4, because some priorities went over 999, and the turn ended without writing anything. Now all the rules fit on its scale.
- **The Archivist stays on your machine in every conversation.** From the second conversation on, the local model did not reach the new ones, and the Archivist distilled without warning with the next one on the list, which could be a paid one. Now every conversation, new or reopened, uses the same Archivist and the same fifth agent.
- **What you adjust applies to all open conversations.** An agent's time, MAX MODE, the memory and the modules you turn on or off changed only the conversation on screen: one open in a window or in the other half kept the previous settings, and a new conversation distilled with what there was when MADRE opened.
- **The #3 and #4 sheet names the agent you are writing to.** With `#3 @gemini …` and another agent in the selector, the sheet asks for the keys for Gemini and the turn goes to Gemini. If you cancel, your text goes back to the box as it was.
- **A `git init` mid-turn no longer brings it down.** If an agent creates the repository while writing, MADRE keeps comparing against the restore point it took before the turn. If it still cannot read what changed, it says so, the turn is not marked as failed and **UNDO** is still at hand. Files that a new `.gitignore` leaves out no longer count as deleted.
- **More time to write, and what was left if it runs out.** A turn that writes has 10 minutes and one that reads, 3. The time you set for an agent overrides both, and the room's counter counts from the real limit.
  - If time runs out, the failure shows the files the agent managed to write, with **UNDO**.
  - **RETRY WITH MORE TIME** raises that agent's limit and leaves your request in the box with the list of what already exists, so it finishes what is missing without starting over.
  - MU/TH/UR also recognizes the timeout in Spanish. Its search finds single words, regardless of accents, and filters by agent name.
- **One turn writes at a time.** If an agent is writing and you ask another to write, the second one waits and the room says behind whom. Before, they wrote at the same time and each one took files from the other into its list.
- The browser docked in **AUTO** uses the full width of its panel; it used to stay at 300 px.
- **The sealed view says when a page wants to save data.** RIPLEY does not allow `localStorage`, `sessionStorage`, IndexedDB or cookies. If the page uses them, the viewer says so once and offers **OPEN SERVERS** to test it served.
- **Servers stay alive in RUNS.** A command that opens a port is a server and no longer stops after 10 minutes. Its card says where it serves, with **OPEN IN SERVERS** and **STOP**, and while it serves you can ask for another command. The agents know the server listens only on 127.0.0.1.
- **ECONOMY no longer counts the cache twice.** Codex and Gemini include the cache read within the input, and the room added it again.
  - Now **INPUT CHARGED** is the new input plus the cache written.
  - The cache read goes in **NOT CHARGED IN FULL**, and the cache written has its own column.
  - Turns already saved are recalculated when ECONOMY opens, which now adds up all the project's conversations.
  - What @madre reads on your machine is no longer added to what is charged: its turns are counted separately, as free turns.
- **`/module` and `/image` deliver what they made.** A module the agent leaves in its draft appears with its card to install, even if the project's `.gitignore` ignores `.pulse`. The images Codex generates are copied to the turn's draft and shown in the conversation; if Codex already copied it to the project, it is shown only once.

### The conversation first, and the windows move aside

- **Point and ask in SERVERS.** The **POINT** button puts a toolbox over the page: **SPOT** marks a place and **AREA** encloses a part when you drag. Next to the mark the same **Ask** card from the editor opens, with questions for what you marked (what it draws and which file it is in, something looks wrong here, how it holds up at this width, how it is laid out).
  - **It goes with a capture of what you pointed at.** When you choose the question, Chrome asks you to share this tab; that permission belongs to the browser and no page can change it or skip it. MADRE takes a single frame and attaches only what was pointed at: the area as it is, without its frame, or the spot with what surrounds it (up to 480 × 320). Then it stops capturing. A new mark replaces the previous capture while it stays in the box. If you do not share the tab, the question goes only with where you pointed and the room says so.
  - **A line says where.** Above the question, in the text box, it appears as a chip: `⌖ :port (process) path · view N px · point at (x, y)` (or the area with its size), plus "capture attached" when there is one. The page comes from another origin and the room does not read its inside, so it does not make it up: the agent sees the capture and searches the project for what draws it.
  - Sending is still yours. The first Esc removes the mark and the second turns off the tool; changing page also turns it off.
- The **SERVERS** menu is drawn in full over the page when the browser is in a window; before, it was cut off under the tab.
- In a conversation in a window or in the other half, the text box no longer touches the border: the chips move to another line when they do not fit and the box leaves air below.
- In the editor, the current-line band matches its line (it was 14 px lower). **ASK** stays only in the bar that appears over the selection.
- **Ask suggests based on what you chose.** The questions come from the lines: what a `catch` swallows, what happens if a request fails or takes too long, whether some `await`s can race, a regular expression explained with examples, who calls the function you are looking at, what a TODO asks for, which cases a test does not cover. There are also questions of their own for CSS, HTML and JSON, and the general ones fill up to four. At the top you choose the agent. **ASK MY OWN QUESTION** is the card's main action, with a pencil and the same style as **New conversation**: in the accent color, it floats slightly and sinks when pressed. It leaves the reference in the box for you to write.
  - **With what the room remembers.** If you already gave the NOSTROMO designation on this page, the card also asks about what the archive keeps on those lines: a decision, a preference, an open question. It searches by words on your machine; nothing is sent to the embeddings provider.
  - The card shows on top of the viewer even when it is a modal.
- **Codex no longer fails with a "{".** The **Minimal** effort was offered for all Codex models, but none of the current ones accepts it, and the API rejected it with an error that the room showed only as "{".
  - Now the levels come from the list for each model that Codex itself keeps: `gpt-5.5` goes from Low to Extra high, and the models that allow it add **Max** and **Ultra**.
  - When you change model, the slider changes with it.
  - If a level the model does not accept is left saved, the room removes it, says so and the turn goes out with the default level.
  - When the OpenAI API rejects a turn, the room shows the full sentence of the rejection and not the first line of its JSON.
- **One box menu at a time.** Opening model, effort or mode closes whichever was open; the one you chose no longer stays underneath the other.
- In **NOSTROMO**, the legend of the star types goes on the right, below the buttons, on the same line as the subtitle.
- **The questions are asked by the room**, not the browser: leaving unsaved changes, overwriting a file that changed on disk, saving a protected file, installing, updating or removing a module and purging the room. Now a sheet appears in MADRE's style (or the console's, if the question comes from MODULES or MU/TH/UR). It says what is at stake, explains why and the answers are words. The safe option is focused, so an accidental Enter never confirms something that cannot be undone. When the file changed on disk, you choose in a single step between continuing to edit, loading the version on disk or overwriting.
- In **CONNECTIONS**, each card shows the logo and the name on the left, and the session status is a light in the top corner: green with a session, red without one, amber blinking while it starts, hollow if the CLI is not installed. The card's header is no longer centered.
- The **effort slider** changes the intensity of its color with the level: faint at Minimal and with the agent's full color, plus a wider halo, at Extra high. The **CLI** label stays visible above the thumb even when it is at that level.
- In **NOSTROMO**, the subtitle goes below the title, as in the console's other headers, and the legend wraps onto several lines instead of pushing it.
- **Windows no longer end up below the conversation** when the room changes (opening or docking the browser, opening the second conversation, changing conversation): before, during the change, the conversation and the text box were painted over any open window. Now each window stays on its layer, still, while the room changes underneath.
- When you touch **outside** the text box, the windows that were moved aside return to where they were. The box's menus (mode, model, effort, agent cards) count as part of it.
- When opening **NOSTROMO** from MU/TH/UR in a window or in a split, MU/TH/UR stays as it was and shows again when leaving NOSTROMO.
- The **×**s turn pastel scarlet on hover, like the conversations one; next to a word ("CLOSE ×") only the mark changes.
- The browser (SERVERS) no longer draws a second × under its own.
- The version note and **SUPPORT** are below the text box, on their own line and with air, instead of floating over it.
- **New conversation** carries the accent color and floats slightly over the panel; on hover it settles a little and when pressed it sinks and loses its shadow.
- In the Core, MODULES, MU/TH/UR and ECONOMY, the **subtitle goes below the title**. The Core's tabs share the full width.
- **Show the room:** when you touch the main conversation's text box, the windows covering it slide to their nearest edge, one after another, and leave a strip in view. Touching any strip, opening a window or reaching one with the keyboard brings them all back to their place.
- **The main conversation is never squeezed:** it is never a window and always keeps a readable column. The side splits, the docked browser and the second conversation share what is left down to their minimum width. If they still do not fit, the oldest becomes a window. Before, conversations in split plus the browser could leave it in a narrow strip.
- Changes between base, split and window no longer stretch the content: the window travels with a single scale and enters with a brief fade. The browser and the second conversation no longer distort when resizing either.
- The **crew** button is next to the live indicator and opens the same cards as the agent bubbles: the list of agents with their ring and their usage, and when you touch one, its card, with "‹" to go back. CONNECTIONS is one touch away from there.
- In the conversations list, getting close to the edge to change the width no longer reveals the row's icons, and a row only shows them if the cursor stops on it.
- **New conversation** has main-action hierarchy: border and background in the accent color, and a fill on hover.
- All the windows' **×**s turn the same way as the conversations panel's.
- In MODULES and MU/TH/UR, the window controls sit at the same height as the console buttons.
- The fixed header of MODULES, MU/TH/UR and CONNECTIONS no longer covers the background lines: it only takes the console's background when there is content underneath. The Core's active tab no longer carries a dark box either.
- In light mode, MADRE's green and each agent's colors can be told apart: they followed the system theme and not the one chosen on the bar. When the theme changes they are repainted.
- The notice under the text box is said once, in one line, and then withdraws. There is no longer a **?** in the chip row: it did not explain anything the line had not said and it pushed the selectors in narrow conversations.

### Windows that behave the same, and the Core with your local model

- **The same controls on every window.** Conversations, Files, the browser, the viewer, MODULES, MU/TH/UR and a second conversation carry a single group at the top right: **split**, **window** and **×**, in that order. In MODULES and MU/TH/UR it has the console's stroke and goes next to the title.
- **The window you touch comes to the front**, whichever it is. The modes, model and effort menus and an agent's spending card always stay above the windows.
- **Fixed-side split.** Conversations sits as a column to the **left** of the conversation and Files to the **right**, from top to bottom; the conversation stays between the two. Their inner edge is dragged to change the width, and a double click restores its size.
- In the conversations list, the icons of each row **take up no space** until you hover with the mouse: then they appear smoothly and the title shifts to make room for them. Those of a conversation that is already in a split or in a window stay in view.
- The top bar is wider and fits more of the conversation's name.
- In **NOSTROMO**, the sun's surface turns with the view when you drag to explore; it no longer stays facing forward spinning on its own axis.
- The action buttons on the cards (exams, connections) stay **always at the bottom**, even if the cards have different heights.
- **The Core opens on YOUR CORE**, a dashboard with the same tiles, cards and bars as MEMORY, under the console's `==>`:
  - **You:**
    - How many agents have a session and which ones.
    - The room's token window against its cap, and what has been spent in the room since forever.
    - Per agent: its session, how much of its limit it has used (the provider's or the local window's), when it resets, its tokens in the room and its version.
  - **Your local model:**
    - The Ollama server and its version, the chat model (and whether it is trained for this room), the embeddings model with how many vectors it has and what was measured here.
    - Each installed model with its size, parameters, quantization and what role it plays.
    - **RECHECK** and, if it does not run, **START OLLAMA**.
  - **The quality:** maturity, exchanges, memories and what is waiting to be distilled; the verdict with what comes next, what the archive is made of and the three tests.
  - **Settings:** what the local model does (embeddings, archivist, @madre, each with its checkbox and what it is for) and who reads the archive (archivist and embeddings provider).
  - Everything comes from what MADRE already reads and measures; what has not been measured yet says "not measured yet".
  - The document, the launch, what went out and MU/TH/UR stay in their tabs. The strip of *for whom, in which mode and what you would send* appears only with the document and the launch, which are what changes.
- **Windows are easier to grab and drag:**
  - Grabbing the header no longer selects text.
  - The window follows the cursor without recalculating what it has inside, and near the edge of the screen it snaps to it.
  - In MODULES and MU/TH/UR, the header stays on top even if you scroll down the content, so the window can always be grabbed.
  - The edges for resizing are easier to find, especially the corners.
- **MODULES, MU/TH/UR and CONNECTIONS adapt to the width of their window**, not the screen's: a narrow console, in a split or in a window, looks like a narrow console.
  - The header no longer overlaps the title with the buttons. If it does not fit on one line, first the subtitle drops, and then the console buttons move to their own line. The window controls stay next to the title.
  - The dashboards, the connection cards, the tests and the forms rearrange into columns according to the window's width.
- The limits' reset times are written in the room's language.
- **The viewer, with an editor's header and footer.**
  - The path shows the folder faint and the file in bold; if it does not fit, the folder is trimmed and never the name.
  - **READ / EDIT** are a single control.
  - The selection, **REVIEW WITH** and how to choose lines go in the bottom bar.
- **Choosing several lines like in Finder:**
  - Clicking a number chooses a line, and dragging across the numbers chooses a stretch.
  - **⇧** extends from the last one without dropping what you already added.
  - **⌘** (Ctrl on Linux and Windows) adds or removes one more, also from the code.
  - Loose lines are quoted together in the text box.
- **The editor:**
  - The bar is a group of icons with their word, and each one's key appears in the status bar on hover.
  - Over what you select a small bar appears with **Ask**, **Comment** and **Copy reference**. If the selection goes up out of view, the bar waits at the edge.
  - In a narrow window only the icons remain.
  - When you start editing, the cursor starts at the top and does not jump to the end of the file.
- **Bugs fixed in the editor:**
  - Below the first 180 px you could not click to edit: the writing area inherited the text box's height cap.
  - The editor no longer narrows to the center of the viewer when the bar fits in less space.
- In the text box, a file's chip separates the folder (faint), the name and the lines (in the accent color).
- In a narrow window, the mentions and commands menu no longer goes off the right side or shifts the page.

### Split and window in everything that opens

- Conversations, Files, the browser, the file viewer, MODULES, MU/TH/UR and a second conversation carry the same **two buttons** in their header, next to the ×: **split** and **window**.
  - **Split:** it goes to its side of the screen, roughly half, and the conversation narrows to the other half without being covered.
  - **Window:** it floats over the room; it moves by its header, resizes from any edge or corner and comes to the front when touched.
  - The lit button says how it is now; touching it returns it to its place.
- A modal in a split or in a window stops blocking the room: you can type in the text box while you have it open. Changing mode does not close it or make it lose what it had.
- **Nothing splits the screen on its own:** the viewer, MODULES and MU/TH/UR go back to what they were when you close them. Their window remembers where it was for the next time you ask for it.
- One split per side. If you put another one on the same side, the previous one becomes a window; nothing is closed.
- If what is open does not fit next to a readable conversation, the last one you touched stays to one side and the rest float over the conversation, never on top of another split.

### A code editor in the viewer

- The project's text files have **EDIT**: line numbers, the current line highlighted, the same coloring as the viewer and a status bar with line, column, indentation, line ending and whether it is saved.
- The everyday things:
  - Tab and ⇧Tab indent and unindent.
  - Enter keeps the indentation.
  - Parentheses, brackets and quotes close on their own.
  - ⌘/ comments according to the language.
  - ⌥↑↓ moves lines and ⇧⌥↑↓ duplicates them.
  - ⇧⌘K deletes the line.
  - ⌘D selects the next occurrence.
  - ⌘F searches (with case, whole word and expressions) and ⌥⌘F replaces.
  - ⌃G goes to a line.
  - Line wrapping with a button.
  - ⌘Z undoes everything, including these actions.
- **⌘S saves.**
  - Only files that already exist inside the project.
  - Protected ones (.git, .env…) ask for the project's name.
  - If the file changed on disk since you opened it, it asks whether to overwrite or load the version on disk.
  - It does not let you leave with unsaved changes without warning you.
- **Ask about this:** suggested questions for the lines you are on, or one of your own. It quotes them in the text box, and if the viewer was a modal it moves to a split so the box stays at hand.

### Effort with a slider, and the box's menus in order

- Effort is chosen with a **slider** from *faster* to *deeper*.
  - You drag it or touch a level, or move it with the arrows, and it is chosen when you let go.
  - At the top you can read the level, what it means and two speed and cost bars that move with it.
  - **AUTO** lets the CLI decide and says which level it uses.
- The **modes** menu has even rows: the number in its colored card, the current mode tinted, those above the ceiling with dimmed text and their clear "RAISE TO". Plus a thin shadow equal to that of the other menus.
- The **commands** menu (`/`) comes in groups: *From the room*, *From the modules* and *Not available here*. Each command brings its icon, how it is written (in Spanish) next to the name and what it does below. The keys to move and choose are at the bottom.

### Animations without ghosts, the logo and the reload button

- Transitions no longer show two copies of the screen overlapping: what changes place moves on its own, and when changing conversation the previous one leaves before the new one arrives.
- The conversations panel no longer enters twice, and in a narrow window the conversation no longer blurs behind panels that cannot be seen.
- The logo is drawn when MADRE starts or restarts, not on every page reload.
- The bar has its own **↻** button to reload.
- The command menu (`/`) gives the description of `/git` and `/ahp`, and their hints, in Spanish.

### The room debuts its identity

- The interface uses the brand's typefaces: **Sora** for titles, **Geist** for reading (the messages, the answers, the chips and the text box, at 15 px in light weight) and **JetBrains Mono** for labels, data and commands. They come inside MADRE; nothing is downloaded to show a letter.
- The logo on the bar is the official one: the pulse in green and the word MADRE in white (in the light theme, dark green and almost black). On narrow bars only the pulse remains.
- The browser tab shows the MADRE icon, and @madre carries the brand's compact pulse.

### MODULES, in order

- First the modules that are **on** and then the **available** ones. Each card says its name and whether it is on in one row, and below it what it does, in reading type. Maker, version and whether it is up to date go on a single line, and the buttons always stay at the bottom.

### A cleaner text box

- In the text box, commands (`/module`), files and mentions show in bold in their color, without a box.
- The conversations and files panels are wider, and with two conversations open side by side their text boxes sit at the same height.

### The panels move aside, and the room moves smoothly

- The conversations and files panels change width by dragging their inner edge (or with the keyboard arrows). A double click returns their width, and the one you choose is remembered.
- When a panel opens, the conversation slides to make room for it instead of being covered. If the window is not wide enough for both and a comfortable column, the last one you opened stays to one side and the other floats on top with a veil behind. A click on the veil puts it away.
- Panels slide in and out, and the conversations list appears row by row.
- Everything is done with buttons: pulling a header no longer detaches a panel or swaps panels, and a drag that ends over a button no longer presses it. That way, pulling the edge of the conversations panel no longer opens the other half by mistake.
- **Conversations also open as windows**. In the conversations panel, each one has two icons: the other half of the screen or a window of its own; the lit one shows how it is open and the other one moves it. The window moves, resizes and comes to the front when touched; in its header it can become the open conversation (and the one that was open takes its window), move to the other half or close. The other half can also be released as a window.
- Next to the open conversation there is room for **two more**, between the other half and the windows. Each conversation in view keeps its own open line with the room and the browser holds only a few at a time, so from there on the icons dim and MU/TH/UR says why another one does not open.

### The browser shows only this project's servers, and a sentinel watches them

- **SERVERS** lists only what was started inside the project's folder. Everything else listening on the computer (other projects, Ollama, another MADRE room) does not appear, it is only counted at the bottom.
- A **server sentinel** watches while the room is open and RIPLEY is on. If you start or stop a server, the list updates on its own. If the one you are viewing stops, the page dims and says so, and comes back on its own when the server returns.

### Wider bubbles, and the conversations panel opens without shaking

- Answers take up more width (the column reaches 960 px and the bubble 860 px).
- When a panel opens, the conversation no longer reflows its text on every frame of the animation: it takes its new width at once and slides into place. The conversations list no longer flickers when loading, and the button that opens it reappears when the panel has finished leaving.

### No hover notes

- No note appears anymore on hover, not on buttons nor anywhere else, and neither does the browser's. What they said is still available to screen readers.
- Changing conversation is no longer a cut: the one you leave fades upward and the new one rises into its place. When swapping the two halves, each conversation crosses to the other side. The second conversation and the browser come in from the edge while the conversation narrows without distorting.
- If your system asks for less motion, all of this happens without animation.

### The narrow bar and the open questions read better

- When the bar compacts, each icon lives in a box with soft corners and its number goes in the corner.
- A bar button fills while its panel is open, and the current conversation shows filled in the list.
- **STILL OPEN HERE**, above the text box, is more visible: each question is a card with its "?" and the full text in the foreground.

### Replying with a quote no longer warps the box

- When replying to a message, the line where you write sat above the label and the buttons. Now the quote takes its own row, aligned with the label, and the box grows only when you write more than one line.

### Multitasking: several conversations working at once

- If an answer is taking a while, you can now write something else in the same conversation or open another one: the first one keeps working. Before, changing conversation with a turn in progress was not possible.
- The **CONVERSATIONS** panel shows a loading indicator on those that are working and a dot on those that finished while you were in another one. When one finishes, a notice appears on the left, next to the conversations button and without covering it: whether it finished or not, in which conversation, which agent answered and a button to open it; if you allow it, a system notification also arrives.
- **NOTIFICATIONS**, in TURNS: a button to turn them on, and the row says if the browser blocked them. They arrive when a conversation you are not looking at finishes, another one or this same one with the tab in the background; pressing it takes you back to that conversation.
- The browser tab says **MADRE · conversation name**, to tell several open rooms apart.
- **TURNS**, in MU/TH/UR next to the sentinel, decides how much the room does at once: how many conversations can work at the same time (3 by default, the same that fit on screen: the open one and two beside it) and how many turns at once in each one (3). It comes on. Off, the room works as before: one conversation at a time.
- Only one conversation at a time can have **CONTROL** or **AIRLOCK** of the project, even if several are working, and **UNDO** works from any of them.
- When changing conversation, the room keeps what you adjusted: each agent's maximum mode, the modules turned on and the time limits. Before, a newly opened conversation lost them.

### Two conversations at once, one in each half

- In **CONVERSATIONS**, next to the ×, a new button opens that conversation in the right half of the window: its transcript and its text box, live. You can write in both and watch each agent answer in its own.
- The right half has no bar or panels: only the conversation's name, a button to swap the halves and the × to close it. The bar, MODULES, MU/TH/UR and the panels keep acting on the conversation on the left, which is still the open one.
- The border between the two is dragged to share out the width. The theme and the language you choose on the left change on the right too.
- The split is remembered on reload. Opening the right conversation from the list, or deleting it, closes the split. In a window under 900 px it does not fit and the room becomes one again.
- **TURNS** counts the right conversation like any other, and the one that finishes there does not send you a notice: you are already looking at it.
- Two conversations writing at the same time can no longer repeat a message number: the project's numbering is read at the moment of writing.

### A model chosen for one agent no longer reaches another

- If the model chip had chosen one belonging to another agent (for example, an OpenAI model with the message addressed to @gemini, or a message that starts with `@gemini` while the chip pointed at @codex), that model traveled anyway and the agent failed with an error from its API that looked like a permissions one. Now each message uses the model and effort of the agent it really goes to, a model belonging to another agent is not passed to it, and the room warns you and forgets it from the chip.
- When an agent does not know the model it received, the error says so plainly first: which model, where to change it, and that permissions and modes have nothing to do with it. The CLI's original line comes after, as is.

### The AIRLOCK and CONTROL notice reads well, and in Spanish

- In the notice to arm CONTROL or AIRLOCK, the line under **MU/TH/UR 6000** is no longer squeezed into a narrow column.
- The designation field, the read-only notices when permission to create is missing and MU/TH/UR's alerts about plans and modes now come out in the room's language.

### The choices say what permission each option needs

- When an option involves creating files, editing the project or running commands, the agent marks it with the mode it needs and the option shows it (**#3 CONTROL**, **#4 AIRLOCK**).
- Pressing an option sends it right away to the agent that asked, in the mode it asks for. Those for #3 and #4 are sent only after your designation (and the word AIRLOCK); if you cancel, nothing is sent.

### SERVERS marks this project's server

- In the local servers menu, the one this project started appears first, with the mark **THIS PROJECT**.

### The CONTROL card reads in full

- Each file's status (**MODIFIED**, **ADDED**…) no longer breaks in half, long paths align to the left and wrap within themselves, and "1 file changed" is in the singular.

### Updating from the room no longer leaves it closed

- When pressing **RESTART WITH** a newly published version, the room closed before knowing whether npm was already delivering it; if not yet, it did not come back and had to be started by hand. Now it downloads the version first and only closes when it has it. If npm is not delivering it yet, the room stays open and tells you to try again in a few minutes.
- What the new version prints on startup goes to `update.log`, next to the room's log.

</details>

## 0.7.2 · 2026-10-03

This version gives agents buttons for what they used to ask of you in a paragraph: run a command, raise their permission, pick between options. It also brings effort level per agent, a files panel that behaves the way you expect, and fixes to the Ollama update and to reopening the room.

### An agent can ask you to run a command

- New module, **Runs**, off until you turn it on in MODULES. When an agent needs a command its mode doesn't let it run (the tests after a fix, a build, a linter), instead of asking you to copy it into a terminal it leaves you one button per command, with the reason above it.
- Nothing runs until you press. Each line runs on its own, from the project root and without a shell: what the button says is what gets executed. A line with `&&`, `|`, redirections, variables or wildcards shows up with the reason it can't be run.
- A checkpoint is taken before running. The output appears in the room as a card and every agent reads it on its next turn; if the command changed files, **UNDO** puts them back.
- One command at a time, up to ten minutes, and **STOP ALL** stops it. In AIRLOCK the agent keeps running its own commands.

### When an agent asks for more permission, one click gives it

- If an agent replies that it needs a higher mode, a card appears under its reply with **GRANT AND CONTINUE**: you type the project designation as always (#3 and #4) and the agent receives your permission and carries on. You no longer need to write "permission granted" to it in another message.
- **I'LL WRITE TO IT** sets the mode and quotes its reply in the box, so you can add instructions before sending; **NOT NOW** closes the card.
- If the agent had a lower max mode, granting also raises it in CONNECTIONS (and the ceremony says so), instead of the message being rejected.
- A card that was already answered stays closed when you reopen the room.

### Choices read in full and come with the recommended one

- When an agent asks you to choose, each option shows in full: it used to be cut at 120 characters, sometimes mid-word.
- The option the agent recommends goes first, marked **RECOMMENDED**. Agents now have to say which one they would pick.
- Options go in numbered rows instead of pills, and the one you pressed stays marked.
- The briefing preview and the economy now include the block that teaches agents to offer you options, when **Choices** is on; before, it traveled on every turn without showing up there.
- In GHOST that block is no longer sent, because there the room never reads a choice.

### Effort level next to the model

- A new chip next to the model picks how much the agent thinks before answering: from **Low** to **Max** in Claude, from **Minimal** to **Extra high** in Codex.
- **Default** sends nothing and the CLI uses its own setting; if MADRE can read it (Codex), the chip shows it dimmed.
- It's remembered per agent, and every message and reply says which effort it was made with.

### Project files: copy, move and create folders behave the way you expect

- After copying, moving or creating something, the tree no longer collapses: the folders you had open stay open, the destination one opens and the new item lights up for a moment.
- **Paste beside it** next to a file with the same name creates a copy (`notas copia.md`, `notas copia 2.md`) instead of failing.
- Right-click in the empty space under the list pastes or creates at the project root, which previously had nowhere to do it.
- Copy, move and rename also work from search results.
- **Escape** clears the search and brings back the tree; a second Escape leaves the field.
- The panel is wider, and when creating or renaming, what's being asked (and where it will end up) reads in full above the field.
- The notices for these operations come out in the room's language.

### A corrected module says it replaces the installed one

- When an agent writes a new version of a module you already have, the card says so, shows the version that keeps working and offers **REPLACE** instead of install.

### Updating Ollama now actually changes the version that answers

- Updating replaced the program, but the Ollama that was already running was still the old one: the card repeated the previous version and it looked like nothing had happened. Now, if the one answering is older than the installed one, MADRE restarts it with the new one, and the card says so before you press.
- That also fixes the error `invalid argument: --no-mmap` when loading a model, which came up when the old server started pieces of the new version.
- If the Ollama that answers is not one MADRE can restart (the app, or another user's service), the card says which version is installed, which one answers and what to do, instead of announcing the old version as if it were new.

### Reopening the room no longer shows an old sign-in

- If you ever signed in an agent from the room, every time the page loaded the notice with that sign-in's link came back, already expired, and the link ran off the screen. Now the notice shows only while the sign-in is happening, and long notices wrap.

### On the phone the page no longer runs off the screen

- The row of agents and chips above the composer widened the whole page to 580 px, and with it the top bar and the thread. Now the chips drop to their own line and arrange themselves.

## 0.7.1 · 2026-10-03

### Codex answers in a project that isn't a git repository yet

- If the project folder had no git, Codex failed on every message with `Codex exited with code 1.` even if you had signed in. Now it answers just the same in any folder, and it is still limited to the mode the room chose.
- When an agent ends with an error, the message in the room also includes the last line it printed, so the cause is visible without opening anything else.

## 0.7.0 · 2026-10-03

This version is about the room's memory: now you see it, walk through it and it tells you how it's doing. NOSTROMO goes three-dimensional and each memory is a star that tells its own story; MEMORY becomes a dashboard; and whoever arrives for the first time finds a tour over the room itself. It also brings ready-made ideas for creating your own modules, a button to stop a single reply, and a new protection against other websites. Thank you for using MADRE and for every report that makes it better.

### After updating, MADRE tells you what's new

- The first time you open the room after an update, a sheet appears with the highlights of the version: each new thing said in one sentence, **where it is**, and a link to all the changes on madre.run. It closes with **Continue** and doesn't come back for that version.
- It's remembered per person, not per tab: if you open the room on another port, you've already seen it. A new install never sees it; that's what the welcome tour is for, and the tour waits for you to close the sheet if both land on the same day.
- Nothing goes out to the network: the link is the same changes page the releases channel already used.
- Every minor version brings its own, written by hand in both of the room's languages. A minor version can't be closed without it.
- To see it again: **ABOUT THIS VERSION**, next to the number in MU/TH/UR's releases channel.

### The welcome tour happens over the room

- The first time someone comes in, the tour is no longer text in a window: it walks through **the room itself**. Four stops, each one lights up the part of the screen it talks about and leaves the rest in shadow, with a card beside it that explains it in two or three sentences.
- **Your crew, a single box** (the row of agents and the text field) · **The modes** (the message's mode selector), all five in order and each in its color · **MU/TH/UR, the console** (connections, memory, NOSTROMO, diagnostics) · **MODULES** (optional powers).
- And the first time the **browser**, the **project files** or the **conversations** are pressed, the panel opens as always and a card next to the button says what it's for. Once each.
- It reopens from **?** in MU/TH/UR. If an area isn't in view, the card explains it in the center.

### NOSTROMO in three dimensions

- The archive is a real brain: the earlier profile seen from the side, and from the front two hemispheres separated by the fissure. **Drag to rotate it**; **Shift + drag** to move the camera; **RECENTER** goes back to the side view.
- What's close looks bigger, what's behind MOTHER is drawn behind her and can't be touched through her, and of two overlapping memories the one in front wins.
- Memories are spread evenly over the whole surface, each class in its own band from front to back, like lobes.

### Each memory is a dwarf star, and its surface says how it's doing

- A dwarf has its own light, so there's no dark side: it shines brighter at the center and dims toward the edge —more in blue than in red, so the edge is warmer—, its surface boils in granules, and it's surrounded by a glow that starts at the edge.
- **The brightness** still says how much the room uses it and what it's receiving right now.
- **The surface** says what state it's in: clean and with bright faculae if you confirmed it; with the spots of its class if nobody has judged it; heavily spotted if it turned out false; the worst of all if it was taken out of circulation. A memory the room has never used is **cooling down**: its granulation barely moves, it gives off less light and its center stops being white.
- Each class has its own character: the yellow one is a sun with granules and spots, the white one is smooth and extremely intense.

### MOTHER is magma

- The center is a crust of almost black rock broken into plates, with white-hot cracks between them and pools where the lava broke through. The crust rotates and the lava flows underneath at another pace, so the surface moves instead of being painted.
- Every now and then something bursts inside: a flash, a white core and a wave of fire that runs across the crust. More often when MOTHER is alarmed; never with "reduce motion".

### Picking a memory brings it to the front

- When you click a memory, the archive rotates to face it, the camera centers it in the space the card leaves free and everything else darkens. What stays lit is the memory, its links and a **green reticle**: brackets closing on the target, a spinning ring and the mark **TARGET LOCKED**.
- On hover, the reticle only aims. When you close the card, the scene comes back and the archive stays rotated where you left it.

### Forgetting is an implosion

- A forgotten memory or aberration doesn't just go dark: the universe swallows it. It swells one last time, a horizon opens with light bending at its edge, what it was made of falls in a spiral, and it disappears with a flash and a wave that fades into the darkness.
- Its links, and the cable that joined it to MOTHER, crumble into dust from its end outward, and the dust scatters and fades.

### MEMORY is a dashboard

- Archive figures at the top —exchanges, memories, turns that recalled, pending, maturity— with what happened this week against the previous one.
- Activity for the last 30 days day by day, what makes up the archive (the six maturity readings), what it's made of by class, archivist and zone, how much arrives by search or by association, and the three tests with their bar up to where they pass.
- Below, in their own folds, **ARCHIVIST AND RECALL** and **DATASET AND TRAINING**. The dashboard can be read without the project designation: they're counts, and no text from a memory comes out there.

### A page from another site can no longer slip a module into the room

- The room listens on `127.0.0.1`, and that keeps out other computers but not other pages: any site open in your browser could send a request to `127.0.0.1:4317`, and an uploaded module is code that MADRE runs with your permissions. Visiting the wrong page while the room was open was enough.
- Now, before any route, the room checks two things. That it's being called by this computer's name (`127.0.0.1` or `localhost`): a page that points its own domain at `127.0.0.1` still sends its domain and stays at the door, also for reading. And that whatever changes something comes from the room itself: the browser says who's asking, and a foreign page gets a 403.
- The terminal, an agent's `curl` and MADRE's own CLI don't send an origin and still get in the same way.

### AHP+ installs at 1.4.2

- The AHP+ module now installs `@jossuealcala/ahp-plus@1.4.2`. 1.4.1 mistook file names like `work-detail-desktop-scrolled.png` for a key and blocked `ahp project verify` without there being any secret.
- A project that already has 1.4.1 sees the notice on its MODULES card; it's updated with `npm install -D --save-exact @jossuealcala/ahp-plus@1.4.2` inside the project.

### A vault for connector keys

- Until now MADRE didn't store any credential: an agent's key is written where that CLI looks for it and MADRE keeps no copy. **A connector has no CLI to give it to**, so if MADRE doesn't keep it, nobody does.
- Now it keeps it, on written terms: one file per module in `~/.pulse/credentials/`, permissions for your user only inside a directory for your user only, **accepted only from this computer**. Never in the config, nor in the ledger, nor in a log, nor in what an agent reads. The ledger notes that one was saved, under what name and how many characters — never the value.
- The module card has a new tier, **KEYS**: one field per secret, what's stored (name and length) and `FORGET IT`. The field is never filled back in.
- A module can only ask for **its own** secrets: its id is sealed inside the SDK, so asking for another one's isn't something that can be written.

### The SDK, locked down and with something to copy

- **The full contract is 36 fields**, all documented, and the guide can't fall behind the code: if they ever drift apart, we catch it before publishing. Before, there were eleven fields the SDK accepted that the guide didn't mention.
- **A connector example that works as is** (`docs/sdk/connector-module.mjs`): it sends a Telegram message through your own bot. It teaches the shape you can't guess — **a single file that is the card when MADRE imports it and the MCP server when MADRE runs it**.
- Three declared fields any connector inherits: `secrets` (MADRE draws the field), `reaches` (the outbound log answers for you) and `sends` (the room withdraws those tools below `#4`). None of that is programmed: it's declared.
- **"Can it connect to X?"** is now answered inside the guide, in three rungs. The limit isn't MADRE: it's whether that service lets you get your own key in minutes and revoke it yourself. Almost everything useful falls on the easy side — GitHub, Linear, Notion, Jira, Slack, Telegram, Stripe, Shopify, Odoo, any database. Where there's a wall is where the provider requires reviewing your app: Gmail read access, Meta, banking.
- And a fix for something that came broken without anyone noticing: `reaches` never reached the module object, so a connector's declaration of destinations **wasn't recorded anywhere**.

### Asking for a module is easier than finding one

- `/modules`, `/modulo` or anything that starts with the command's name **now finds `/module`**. Before, the menu closed and showed nothing, which reads as "doesn't exist" instead of "almost".
- And once there, the menu offers **eight ideas to edit**, two of each shape a module can take: a command, a connector, a connector that sends and its own card. Each idea carries its icon and a label in its shape's color. `/module` on its own does nothing until you say what it should do, and that was the most common way for everything to come to nothing.
- The **DEVELOP FOR MADRE** card now says what a module is, that you can simply ask for one, and that connecting with something outside is almost always possible. It has an **ASK FOR ONE** button that drops you in the text box with `/module` typed.


### In light mode the accents were visible again

- The text between messages —the handoff, what the archivist distilled— measured **2.92:1** against the page, below the 3.0 floor an interface calls for, when in dark mode that same role measures 3.62:1. And the agent bubble measured **1.10:1**: it didn't read as faint, it read as page. Now 3.87:1 and 1.22:1, which is the dark mode ratio and not a new gray.
- **The agents' spheres asked for something else.** A tint of the color works on an almost black page because the color is the circle's only light; on an almost white one the same tint walks back toward the page. The worst were the **brightest** agents —1.06:1 and 1.03:1—, and raising the percentage doesn't fix them: mixing a bright yellow with white is still white. In light mode the disc keeps its tint and gains an edge and glyph with the color taken **downward**. One color, two directions.

### The permission button is a button, and the sentence is a sentence

- When an agent asked to move up a rung, the dotted box was drawn around **everything**: a frame and a background behind a sentence that can't be pressed. The eye read a panel and had to look for the button inside it.
- Now only what can be pressed looks like it, and really does: filled instead of outlined.

### MEMORY leaves CONNECTIONS

- It was a fold inside CONNECTIONS, which is where you go to connect and sign in an agent — a completely different errand. What the archive keeps, who distills it and how well it's answering is a topic of its own.
- Now it has its button in MU/TH/UR's bar, next to NOSTROMO, and the whole panel instead of a fold inside someone else's panel. The two destinations are mutually exclusive: one at a time.
- The **releases channel** lives only on MU/TH/UR's main screen, not on top of CONNECTIONS or MEMORY.

### EXPAND ALL stops being a destination

- It lived in the bar, between CONNECTIONS and NOSTROMO, which are places you go to. That isn't a place: it's an action on the canvas below.
- It moves down to where it acts: faint text on the right, in the same voice as each fold's "▸ EXPAND", above the column it moves. No frame, so it doesn't compete with the bar's buttons.
- It moves only the folds of the screen you're looking at.

### NOSTROMO takes the shape of a brain

- The archive stops being a ball. It's a brain seen from the side: frontal lobe in front, flat base, cerebellum at the lower back, temporal lobe at the lower front.
- The shape holds while the archive moves: memories settle onto the brain's outline instead of forming a ball again.
- And now it also rotates in three dimensions: see "NOSTROMO in three dimensions", above.

### You can sponsor the project

- **Sponsor** button on the repository, `npm fund` lists it, and a line at the end of the README. GitHub takes no fee.
- In the room, one word in the corner next to the version: `MADRE 0.7.0 · © 2026 Jossue Alcalá · APOYAR`. It never interrupts, doesn't appear in the thread and doesn't know whether you clicked.
- **It's a link, not a network request.** The room doesn't ask anyone for anything because of this, so there's no address to declare in `outbound.mjs` and nothing that shows up in the outbound log. The day this wanted to *fetch* something —a sponsor counter, a badge— it would stop being a link and would have to be declared like any other address, with its switch.
- MADRE is free and will stay that way. Nothing in the product changes based on what you do with that link.

### Stopping a reply without stopping the room

- On the row of the turn in flight, next to the seconds, a **STOP** button. It kills that agent's process and nothing else: the room keeps going, the other agents keep going, and the steps of other plans keep going. STOP ALL remains what it was, the master brake for when things have run away.
- Until now, a hung agent or one that started down the wrong path meant stopping the whole room or waiting for the time limit.
- The stop is recorded in the ledger as `turn.stopped`, and the turn ends like any failure because the process really was killed — but **it says it was requested**. That's why the sentinel no longer files it: a brake you pulled is not a condition anyone needs to diagnose.

### The typebox grows with what you write

- The box grew up to three lines and stayed there, which is a chat box limit, and this is also where a long brief gets written. Now it grows up to fourteen and from there scrolls on its own.
- It doesn't grow endlessly on purpose: the thread above is what you usually write against, and it shouldn't disappear.
- The line break is **⌥ Enter** — Option on macOS, Alt on Linux and Windows: the same physical key and the same signal in the event, so it's one rule and not one per platform. Enter sends, with or without Shift. The field says so on hover, because a shortcut that changes under your fingers has to say it somewhere.

### MU/TH/UR reads in blocks, not lines

- Each section of the console now has its own 8-bit icon instead of the same green bar for all of them. A bar said "a title starts here" and nothing more; a drawing says **which** section it is before you read the words. No box around it: a frame would be a second box saying what the drawing already says.
- And the line above each block goes away: a rule and an icon are two ways of announcing the same thing, and one is enough. Titles grow in size and brightness, so the hierarchy is marked by the block and not by the line.
- The same in CONNECTIONS, which is the same console inside.

### The economy stops being written in code

- `CH` wasn't explained anywhere on that screen, and in Spanish it came to look like «CAR POR TOKEN». Now it says **characters**, spelled out, and the unit appears once on the card instead of stamped on ten rows.
- `TURNS WEIGHED` had been translated into Spanish as «TURNOS PESADOS», which in Spanish means something else. They are **billed turns**.
- The big number now says what it's made of: **tokens this room never paid for**. Before it was fifteen million of nothing.
- Each reading is a card with its border and its icon, and the six figures at the top are six cards. What was saturated was that everything weighed the same and nothing said where one reading ended.

### Fixes

- **The notices between messages were off-center.** The title of each notice —"clear", "exhausted"— kept the dot that joined it to the rest of the sentence when it was on the same line, and on a line of its own that dot hung from the end and pulled it off center. And when a notice started with loose words, the first bold word was taken as the title: "local · @madre · qwen" came out on three lines and the forgotten memory split its sentence in three.
- **A forgotten memory's class came out in English** —"ABERRATION"— in a Spanish room, and the sentence («se le olvidó un…») didn't agree with feminine classes. Now it says «memoria · olvidada por la humana · ABERRACIÓN».

- **Moving the mouse over NOSTROMO while it was opening threw an error.** The map receives the mouse from the moment it appears and its camera is created an instant later; until then, aiming, zooming or RECENTER looked for a camera that didn't exist yet. Now they wait for the map to start.

- **#12 · Gemini tried to delegate to a subagent and the turn died at 180 s.** The policy doesn't allow it `invoke_agent`, and rightly so: a subagent answers outside the lease, so nothing it wrote would be verified, shown or reversible. But the CLI doesn't treat the refusal as an answer: it waits, and the human waits three minutes to get an error. Now it's told up front to do the work itself, and if it still tries, the room cuts the turn as soon as it sees it and explains why. **Only on that block**, not on any block: a denied write leaves the CLI working and it ends up answering, and cutting there would kill turns that were going to finish.
- **Stopping a reply waited for it to really finish.** Aborting only asks; the turn still has to kill its process and record how it ended. Returning earlier left the caller racing a write that hadn't happened yet — the master brake already waited like this.

- **#11 · Gemini said "files created" and wrote nothing.** The rule that gives it write permission was built with the project path **as it was passed to MADRE**, and the CLI resolves the path before writing. On macOS `/tmp` is a link to `/private/tmp`, so a project opened as `/tmp/…` asked to write to `/private/tmp/…`, the rule didn't match, and a headless CLI can't stop to ask: the write died without a word and the model took the file as created. Now the lease carries both forms of its path and both go into the rule. **Also into the deny rule**, or allowing the second spelling would have left `.git` and `.pulse` reachable by the other name. It affected Gemini and Claude; Codex uses the working directory and OpenCode the relative path, and that's why they worked.
- **#11 · And if a write gets lost for any other reason, the room says so.** When a turn could write, wrote nothing and the reply names files, they're checked against the disk and the ones that aren't there are flagged. The prose isn't read looking for a claim —that would be guessing in two languages and warning falsely— but the paths it names; whatever exists isn't mentioned.

- **#16 · RIPLEY said "nothing answers on this computer" when there were servers.** For two different causes and neither was that. With RIPLEY off, `/api/ports` answered `412` with its explanation and the client read `?.ports ?? []` over the error: now it says what the response says and offers to open MODULES. And a server bound to all interfaces —what `node` and `python -m http.server` do by default— was discarded without a word: now it shows up at the end of the list, dimmed, with its reason on hover. On this very machine there were **three** invisible servers.
- **#16 · The dangling separator.** A server without `Content-Type` left the row as `:5173 node · 200 · `.
- **#15 · The question `@madre` forwards to the crew started with ":".** The loop that strips "ask the crew" only took the colon when another linking phrase came after it, so the ":" traveled to the announcement, to the four agents and to the closing turn.
- **#14 · «NO PUEDE GENERATE IMAGES» in the Spanish room.** The server sent the already-assembled label where the client expected the key, so there was nothing to translate. Now the key travels; the label stays only where an English sentence is assembled.
- **#14 · The plan line was written with English literals.** "@MADRE PUTS @CODEX#1 TO WORK, THEN CLOSES" and "FINISHED · 5 STEPS". Agents are tokens and don't fit inside a string, so the sentence is translated whole around a placeholder and the tokens go back where the placeholder was.

- In dark theme, the version, the support link and the notice under the field were unreadable: the faintest gray in the palette with half opacity on top, over an almost black background, wasn't discreet but invisible. The signature and the link now carry the room's green —which has its own value on each background, so one color works for both themes— and the notice moves up to a gray that can be read. The notice stays out of the green on purpose: it's a warning about permissions, not part of the room's voice.

- The economy's **BY AGENT** card had never been seen: `table.append(…).lastChild` on an `append` that returns `undefined` threw on every render and took the rest of the panel down with it, without saying anything. It's been like that since the panel was written.

### Your thumb moves what the room remembered from that reply

- **The archivist now knows what has standing and what was thrown out.** Until now it received the twelve most recent notes under a single heading that said "already remembered, don't repeat it" — whatever they were. In this room's archive, three of those twelve were out of circulation, and two were **aberrations**: claims the room had already established as false, offered as if they were knowledge.
- Now it receives two lists that say opposite things: what's current, headed by what **you confirmed**, and what was discarded, with its own heading — "the room took these out of circulation, don't write them again". It stops relearning what you already threw out.
- It costs about 205 more tokens per distillation, measured. A discard travels trimmed because it's there to be recognized, not learned, and the list disappears entirely when there's nothing to discard: a heading with no rows under it is prompt you pay for and nobody learns from.

- The thumbs on each bubble existed for several versions and reached only one place: the dataset exporter. Now they also reach the archive. What the room distilled from a reply you marked bad stops traveling to turns; what you marked good becomes confirmed.
- **Not a single word of what was remembered is rewritten.** What changes is where it stands, not what it says: the text is what the archivist heard and the zone is what you said. That's why a reaction works even if it arrives days after the batch was distilled.
- Each memory now lives in one of four zones of NOSTROMO. Two travel to turns and two are archive the room keeps and never serves. The two rules that already did this halfway —what's false doesn't travel, what's refuted doesn't either— were five loose copies and are now one.
- A thumb moves only what **that** reply cites, never its batch: in a real room a batch spans hundreds of sequences, and a thumb can't speak for exchanges you didn't look at. In this room's archive, a third of agent replies left a memory and those are the ones a thumb reaches.
- The archive outranks the thumb: a note the room established as false stays out of circulation no matter how much you liked the reply it came from. "This is false" and "this helped me" are not the same claim.
- The thumbs you had already pressed before this existed count: the fold is over the whole ledger and runs on every start.
- Four ways to judge a reply, not two. Thumbs up gains **this is how I want it done**, and thumbs down gains **never do this again**. The two new ones don't show until you press the one they escalate: at rest the bubble carries no more adornment than before, and the stronger word appears just when it means something.
- "This is how I want it done" confirms the note and counts as a yes for the corpus; "never do this again" takes it out of circulation and leaves the pair out of training. A note distilled from several replies keeps **the worst** verdict of all: if one of the exchanges it came from was bad, the note is suspect no matter how good the others were.
- And it shows: each memory states its zone in NOSTROMO, and the one that doesn't travel is drawn dimmed on the map. A signal that governs recall without your being able to look at it is exactly what this room doesn't do. The zones don't bring a new palette: a star's color is its class, and what the zone changes is whether it's lit.

## 0.6.0 · 2026-10-01

### Ash keeps a single decision from start to finish

- History can no longer turn Ash on or off when opening the room or switching conversations: `/api/state` rules and only a live `extension.toggled` changes the composer. The preview also uses the message's selection, not just the global switch.
- Each turn keeps the decision made when Send was pressed, before the first `await`: `requested` and `active` stay separate, `turn.cost.ash` confirms whether the block reached the prompt, and a later failure keeps the cost and clears its pending shape. A plan's steps and closing keep the same Ash and the same mode.
- Compact prose adapts to explicit length, code and requested structure. A local check flags empty replies, exceeded limits, unclosed blocks, plans with text after them and drift from literals requested as exact. It doesn't change model, context or tools, and doesn't automatically repeat a turn with permissions.
- The public card doesn't promise a fixed percentage: it shows input, output and cache per turn, and says the savings depend on the agent, the task and the cache. The reproducible corpus in `scripts/bench-ash.mjs` only verifies the contract; it isn't presented as a savings measurement.

### The economy stops being a promise and becomes a reading

- The ECONOMY panel, full screen from Ash's card: what was never charged, what Ash does to a reply, where each prompt goes and a table per agent. It opens with six total figures —turns, input, output, uncharged, cache and characters per token— because six numbers of six different natures have no shape to draw.
- Each message says in its footer how many tokens were **not** charged: what the CLI read from its own cache (measured) plus the briefing the room never sent (estimated). The two halves are never added up without saying which is which.
- Ash first shows what it **costs** —306 characters per turn, measured from the block— and then what it could save. And when there are five turns on each side, the reading says whether the difference exceeds that agent's own variation or whether there's nothing to read yet. A reading that could only prove the switch right would be advertising.
- Turns the room answered on its own, with `@madre` and no bill, are counted separately. No price is put on them: nobody measured what they would have cost elsewhere.

### What the room knows, placed where decisions are made

- Above the thread, the project's current decisions. A refuted decision doesn't appear: the archive keeps it, but a strip that says "decided" can't carry something the room already established as false.
- Under the composer, with the field empty, the questions the archivist recorded as open that nobody answered, the longest-running first. They go away as soon as you type.
- A question about what the room already said offers `@madre` before spending: it answers from the same archive, on this computer and without tokens. It offers; you choose.
- None of this goes into a prompt. They're readings of the archive shown to you.

### Choices · a module to hand you back a decision

- An agent that has to choose between three or more real options can hand them back to you as buttons, with its own inert channel: `pulse-ask`. Pressing one writes the option into the composer and stops there; nothing runs or gets spent until you send.
- It doesn't touch the delegation channel. That parser starts turns with real permissions, and teaching it a second grammar would put a parser that can spend money in the path of one that can't.
- It has a switch because it isn't free: the instruction costs about 135 tokens per turn while it's on, and it shows up as its own block in the economy. A capability whose cost can't be seen is a capability nobody can decide against.

### The ladder, next to the agent asking to move up

- When a reply says the turn needs more permission than it had, the room offers it right there: `#2` sets up the composer and `#3` or `#4` open the same override as always, where the project designation is typed by hand. It offers the path; it doesn't grant anything or shorten the ceremony.
- Until now the room only knew how to ask for elevation in one case, a plan step that wants `#2`. An agent in a direct turn that needed `#3` could only say it in a sentence, and reading it, leaving the message and finding the selector was the human's work.
- The detector is narrow on purpose: a loose `#3` isn't enough, it needs a word of need next to it, and the mode has to be above the one the turn had. An agent explaining the ladder mentions every rung and that isn't a request. It costs nothing in any prompt.

### RIPLEY opens what's already listening on this computer

- A browser docked next to the chat, with tabs, that opens the servers answering HTTP here: it reads them from `lsof`/`netstat` and only accepts loopback addresses. The room doesn't run anything to find them.
- No address bar. A site that sends `X-Frame-Options` or `frame-ancestors` won't let itself be framed, and no page can get around that: it's the standard defense against clickjacking and RIPLEY neither can nor should override it. When one refuses, the panel says so and offers to open it in a tab or copy the address; it doesn't open windows on its own.
- The framing check, the permission and the setting stay alive underneath, because the obstacle is the medium and not the design: a desktop MADRE with its own engine can, and that day the bar comes back.
- The file viewer went back to being just that. Its servers button disappeared: that list lives in the browser.

### The finder operates on files, with the same fences

- Right-click on any row: copy, move, rename, new file, new folder. What's picked up shows in a strip under the search box; the name is typed right there, in the panel, without pulling the human away from where they were looking.
- This isn't an agent under a mode: it's the human in their project. But the fences stay. The project is the world —both ends resolve inside it or the operation doesn't happen, checked after following symbolic links— and the zones the room protects from agents are also protected from a slip: `.git`, `.pulse`, `.madre`, a `.env` or the local settings ask for the project designation, the same word CONTROL asks for.
- Both ends count. Moving something harmless **on top of** a protected path is exactly how a protected path gets lost.
- And a search by name, with the same scoring the composer's `!` menu uses.

### The bar, the footer and the signature

- The top bar compacts by container queries, not window queries: with the browser open the chat column is much narrower than the screen, and a media query never found out. Buttons lose their label and keep their icon in the order they stop fitting.
- Open questions go in a horizontal rail with the label centered above. Before, they wrapped to a second line and pushed the composer down.
- The mode notice went from four lines to two, and the version and copyright went to the bottom right corner. The version comes from `/api/state`, not written by hand where it gets forgotten in the next release.

### The cat is no longer a drawing: it's a little scene

- Type `madre` alone in the box, no at sign or anything else, and send. A hyperrealistic ship enters the room with its green passenger inside; no agent answers.
- Four registered frames keep the hull, the dome and the beam in place while the kitty blinks, looks at the dashboard and plays with the controls. The result feels animated without the jumps of a collection of different images.
- The hull lights chase, the emitter breathes and the dome's reflection changes with the scene. The ship keeps its edges, antennas and engine whole throughout the appearance.
- It's still a local secret: it isn't routed, doesn't go into the ledger, costs no tokens and no agent finds out. When it ends, the composer comes back exactly as it was.

### Fixes

- Memory chips were unreadable in light theme: the type was painted with colors chosen for NOSTROMO's dark map, and «HECHO» in an almost white blue vanished on the background. Now the type is a dot with a ring, the text carries the text colors and the row lost the opacity that dimmed it.
- The `/` palette left any command with long syntax without a description: the name column grew without limit and the explanation was truncated until it disappeared. The syntax moved down to its own line.
- A renderer that declines no longer puts a null into the messages column.
- The first replay painted memory chips before the constants they need were evaluated: the page could die in a temporal dead zone before drawing anything. The colors, each type's words and the characters-per-token estimator now live with the other formatters, at the top.
- PLAYWRIGHT aborted even this very room with `ERR_BLOCKED_BY_CLIENT`. It passed `--blocked-origins '*'` in addition to the allowlist, and Playwright matches the most recently added route first: the blanket block won over the list. The allowlist was already a closed door.
- The `+N` of used memories could end up alone on a line when the row wrapped; now it travels with the last chip.

## 0.5.2 · 2026-09-28

Three reports from 0.5.1, and the reason no test caught any of them. Fixes: nothing changes modes, modules, agents or where anything goes out.

### Closing a version opens the next one

- Twice in a row a version went out and the fixes that arrived minutes later were written **inside a section already published**. That's rewriting history by hand, and it has to be moved before anything can be closed — because a number on npm has to mean one code and only one: the room decides whether there's something new by comparing versions, and rewriting one would leave whoever already had it without a signal, forever.
- Now `scripts/release.mjs` **opens the next section in the same commit that closes this one**. Whatever comes next has a place to be written and nobody has to remember. It opens a patch by default; if what follows turns out to be a minor, changing the heading is all the work.
- And it no longer lets you close a version whose section is empty. A release note is how someone decides whether to take it; an empty one is worse than not publishing.

### The three reports from 0.5.1

- **No module command worked when opening the room** (#8). `/git`, `/ahp`, `/pendientes`: all answered "unknown command" with the module on, because the only call that asks the server for the list had ended up **inside** the block that closes a live install. Until an install happened, the composer didn't know a single module command. Now it's requested on load, and also when a module comes in, goes out or flips its switch — which is when what the composer accepts changes.
- **CREATE strips from history weren't drawn** (#9). `renderLease` read `CAP_LABELS`, declared four hundred lines further down; history replays before getting there, each renderer's `try` swallowed the error, and the strip simply didn't appear. Live it came out fine, which is what made it invisible.
- **«@CODEX PUEDE CREA»** (#10). The sentence was already translated whole, but `{what}` brought the card's labels, which are imperatives for a standalone button. Inside a sentence the infinitive is needed, so now there are two sets: the card's and the sentence's. With that, «instalado por **ti**» instead of «por you» —the server sends `you` and the `??` never reached the translation—, `@madre en la sala` on the OLLAMA card, and the `/module` instruction now says what to put in `vendor`: without saying it, Codex wrote `'you'` and the card showed it as the author.

### Why no test caught any of the three

- The smoke test replays a real transcript and fails if anything blows up while drawing it. But that transcript had **eight** of the **sixty-one** event types the room knows how to draw: the other fifty-three weren't exercised by anyone. Three constants declared at the bottom of the file and read during startup slipped through there — and since each renderer is wrapped in a `try`, the error was swallowed, the strip didn't appear, and the suite stayed green.
- Now a synthetic event **of every type** goes in after the real transcript. A field my payloads are missing is the test's fault and is only required on the real transcript; what's never forgiven, in any event type, is a renderer reading something that doesn't exist yet.
- It found a fifth on its first try: `modules`, which four install renderers read during history. Every module install and removal had never appeared on reload.

## 0.5.1 · 2026-09-28

Four things that came out of the 0.5.0 QA the same day it was published. None changes modes, modules, agents or where anything goes out: they're fixes.

### The four reports from 0.5.0

- **`/module` never reached its install card** (#5). MADRE tells the agent which folder to write the draft in —`.pulse/out/<turn>/`— and then reverted that write for landing in a forbidden zone: `.pulse/` is one. The room named a place and punished you for using it. It was never seen here because **this** repository ignores `.pulse/` and git never reported those files; in a project that doesn't ignore it, the whole feature didn't exist. Now a turn's draft folder isn't a forbidden zone **for that turn**, and only for that one: everything else under `.pulse` is still reverted, and there's a test with both halves.
- **The highlighter took a regex's `//` as a comment** (#6). `/^https?:\/\//` left the rest of the line gray. A literal has to be one of the candidates the scanner considers, not something it checks afterward — if it jumps to the `//` first, it never finds out there was an open literal. And the opposite mistake would be worse, so `a / b / c` is still a division: a slash opens a literal only where a value can start, and one that doesn't close on its line was division from the beginning.
- **Two texts in English** (#7). `@madre`'s vendor —"the room · local"— never went through the catalog, and became visible when the review menu started showing it. And the CREATE strip said `@CODEX MAY CREA, GENERA IMÁGENES`: the verbs translated inside a sentence that wasn't. A sentence is translated whole or not at all.
- **The sentinel stops filing what MU/TH/UR already explains** (#4). The report that reached the repository was `Reading additional input from stdin...`, which isn't a failure but a Codex notice — it got there because MADRE handed over the last of stderr as if it were the cause. Since 0.4.1 the catalog knows it (`MU-002`) and the sentinel doesn't file what the catalog explains, so it's explained in the room instead of being sent to the author. There's a test with the exact text of that report.
- Along the way, the week's third temporal dead zone: the vendors map ended up declared at the bottom of the file and the agents row is painted during startup. **This time the smoke test caught it**, which is what it was reinforced for.

## 0.5.0 · 2026-09-28

**Why minor and not patch.** It changes where whatever leaves your machine goes —the collector now lives under `madre.run`— and, above all, **it can prevent something from going out**: if you have `OPENAI_BASE_URL` or `ANTHROPIC_BASE_URL` pointing at a gateway, those turns are stopped until you remove the variable or authorize that endpoint with `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS`. It's the right fix, but a patch number reads as "update without looking", and this one isn't. The 0.4.x ledger and memory are still read the same way.

### Switching conversations stops reloading the page

- Opening another conversation did `window.location.reload()`: the whole room again — every query, every panel, the event stream from scratch. It was the brute-force way of making sure nothing from the previous one was left hanging.
- Now it repaints in place, and that's only safe if **everything is really let go**: what was seen, the messages, the ratings, the turns in flight, the plans, the per-agent stats, the marked files, the recorded conditions, the pending attachments, the reply quote and the stream cursor. The list is written —not guessed— and there's a test that fails if someone adds per-conversation state and forgets to release it. And the stream is re-pointed, closing the previous one: two open at once would deliver each event twice.
- If the room can't be reread, it still reloads. Staying on the old conversation would be worse than taking a moment.

### Two things that read only halfway

- In the modes menu the header was cut at `TEC…`, and what it hid was **the agent's ceiling**. Now it says `@CODEX · TECHO #4` and fits on one line: the list below is literally the modes, so "mode of this message" didn't tell you anything, and that the choice applies only to this message is already said by the tooltip of the chip that opens the menu. The header keeps the two facts nothing else carries: who, and how far.
- **READ THE SDK** led to the file on GitHub. It goes to `madre.run/sdk/` in Spanish and `madre.run/en/sdk/` in English.

### The bar keeps saying which project you're in

- Two names share that corner and only one tells you where you are. Both shrank equally, so a conversation with a long title left the project as **`pul…`** — a room that stopped saying which room it is.
- Now the project **never gives way** and the conversation is what gets trimmed. It has somewhere to go: its panel carries the full name. The project has no other place to be read.
- And `EN VIVO` broke onto two lines when the bar got tight. Not anymore.

### The @madre row fits on one line

- When choosing `@madre`, the row above the field split in two: `PARA @MADRE` with a three-clause note, the mode chip, and a `modelo por defecto ▾` pushed down.
- **That chip had nothing to offer.** `@madre` answers with whatever chat model Ollama has, which is decided on the Ollama card; here it opened an empty menu. An agent with no models to choose from no longer brings a selector — and it was exactly the piece breaking the line.
- The note went from "memory · answers and asks the crew · never writes" to **"memory · never writes"**. The full sentence is still in its tooltip, which is where it was anyway.
- And the row can no longer wrap. If space ever runs short again, what gives way is the note, with an ellipsis: a mode you can't read is worse than a note you can't.

### The cursor landed inside the pill

- **And in light theme the code was unreadable.** The viewer's colors were chosen for phosphor on black: that green for strings and that yellow for numbers disappear on white. Now each role is a variable with its own value for each background, like everything else in the theme — deep blue, dark green, toasted amber and magenta on light.
- **The pill breathes.** It had its outline stuck to the text, and the cursor sat on top of the ring instead of after it. Now it has air inside and **pays for it with an equal negative margin**: the next character starts exactly where it used to. That math also went into the test, because padding without its compensation is the same drift by another route.
- **The pill ate the space after it.** Side padding with a negative margin gives the room back to the *text*, but the background does get painted there: the pill covered the space and the next word arrived stuck to its edge. And an outward shadow does the same, only more quietly. Now it grows **upward** —vertical padding doesn't move a character— and its ring is drawn **inward**. It hugs its letters, and the gap that follows is the space you typed, visible.
- The browser's spellchecker stays on. It underlines references, yes; losing spelling correction in Spanish and English to gain that was a bad deal.

- You typed a reference and the cursor appeared **in the middle** of it: `!public/brands.js|14`. It wasn't the text — it was the layer that draws the pills over the field, misaligned with the field itself. The cursor is placed by the textarea with its own metrics; the pill was drawn by another typeface, and two different measurements of the same text can't end up in the same place.
- Two causes, and the first was a big one. **Typing `#2` drew `#2 CREATE`**: seven characters nobody wrote, so everything after it ended up seven places to the right of its own cursor. The layer now draws only what's there; the mode's name lives in the tooltip and in the chip above the field, where it already was.
- The second: each pill was re-typeset —`font-family: mono`, `font-size: 13px`, `letter-spacing`, `font-weight`— while the real field runs at 15px with the interface font. Now a pill can take whatever color it wants and **no metric**: color, background, radius and shadow paint without moving anything.
- The rule was written into a test, because a single line of CSS can break it again: no rule on the field may touch family, size, weight, spacing or transform, and the field and its layer keep sharing a single shape declaration.

### Three details of the review menu

- **MADRE put words in your mouth, and in English.** You picked a range, you picked an agent, and the composer filled with `review this:` — an English sentence inside a Spanish room, and worse: what you wrote afterward fell *behind* it and read as if someone else had started it for you. Now the reference and the cursor go in. Nothing else. You just picked a file, some lines and an agent: you already know what you want to ask.
- **`@codex Codex` says one thing twice.** The at sign **is** the name. Next to it goes only what the at sign doesn't tell you: whose agent it is, that it's the same one that just spoke, or that it has no session. It happened in both menus —the viewer's and the one for replying from a bubble—; both.
- **The header was cut mid-word.** `REVISAR !public/app.js:24 CON` left the verb at one end and its preposition at the other, and the menu cut right at «CON». Now it's two lines: what's being sent, and below it the question. The reference is a path and can be long, so it wraps instead of pushing the menu or staying half-shown.

### The tree says who touched what, and the viewer reads by what the file is

- And the files panel broke when that dot debuted: `no se pudo listar: Cannot access 'touched' before initialization`. The same temporal dead zone as yesterday — a `const` declared at the bottom of the file, read by a function that runs during startup. **The same error twice in two days**, and both times with the suite green: the panel **catches its own failures and draws them as a line of text**, so nothing threw and the smoke test never opened the tree. Now it starts with the panel open and **asserts that it painted**, not just that nothing blew up. Verified: with the error reintroduced, it fails.

- **A dot in the agent's color**, next to each file an agent wrote in this room. It comes from what the room already recorded —the artifacts of a create permission and the files a CONTROL turn changed—: nothing new is stored and nothing is inferred from the disk. A file MADRE didn't see change carries no mark, which is the honest thing.
- **The viewer highlights by extension**, with its own two-hundred-line highlighter: JavaScript, JSON, CSS, HTML, Markdown, Python, Shell, Config and SQL. Zero dependencies, like everything else. The rule that keeps it honest is that **it never rewrites the file**: it returns spans over the same characters, in the same order, so what you see and what's on disk are the same bytes — and a selection you send to an agent is the file, not a drawn version of it. The test holds this over nine families. What it doesn't recognize stays as plain text instead of being guessed.
- **And asking an agent about a snippet stopped being a secret.** `REVIEW WITH` had always existed, but it appeared only *after* selecting, and nobody guesses a line number is clickable. Now, while there's no selection, the viewer says how: "click a line number to select · shift for a range". And it says what it's reading.

### `/module` without `#2` answers in the room

- Typing `/module` without CREATE only fired a notice that faded away. A rejection that only blinks is a rejection the room forgets. Now the answer lands **in the thread**, where all the room's decisions land, says your request is still in the composer, and brings the button that sets up the mode. **The command asks; the click grants** — typing a command never arms a permission, and the test holds that.

### The briefing no longer goes out through a door nobody named

- Codex and Claude inherit their APIs' base addresses from the shell. That allows legitimate gateways, but it also meant a room that showed "OpenAI" or "Anthropic" could send the briefing to another host without saying so. MADRE now shows the effective destination in CONNECTIONS and in WHAT LEFT THIS MACHINE; it keeps only the hostname, never the path, the query or a credential.
- A custom endpoint is blocked before the briefing is built or delivered. To go back to the official service, just remove `OPENAI_BASE_URL` or `ANTHROPIC_BASE_URL`; whoever did verify their gateway can authorize per agent with `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=codex` or `=claude`. Bedrock, Vertex AI and Foundry are named as the explicit providers they are.
- MU/TH/UR recognizes the 403 that demands joining Telegram as **MU-055**: it explains that it comes from the gateway, not from MADRE or the official provider, and doesn't recommend subscribing or handing over credentials.
- Codex is no longer reduced to "exited with code 1" when its JSON carries `error` or `turn.failed`: the room keeps the reason the CLI itself reported. If it carries none, the exit code is kept as the last honest fact.

### The SDK stops having traps

Before anyone can ask an agent "make me a module", the contract has to forgive the three mistakes anyone makes. I measured eight modules —one good and seven broken— and six of the seven already answered precisely. These were the ones that didn't.

- **`/module` is now the explicit entry point for building.** `/module <what it should do>` requires `#2 CREATE`: if it's missing, MADRE asks for it and keeps the text in the composer; the permission is never granted just for typing a command. With `#2` active, it keeps the chosen agent and turns the request into the contract for a single `<id>.module.mjs` that the human reviews and installs from its card. While it's being written, the composer switches to electric MADRE purple with a brief pixel transformation; the state stays clean and readable after the transition, and it respects reduced motion. The writing area now reserves five pixels on each side so the chip's outline isn't clipped.
- **A misspelled field passed silently.** Write `sumary` instead of `summary` and the module installs without a complaint, with an empty card and no way to know why. With thirty-two optional fields that's *the* mistake everyone is going to make, an agent included. Now MADRE says which fields it doesn't know — **says, doesn't reject**: a module written for a newer MADRE may bring fields this one hasn't learned yet, and that shouldn't keep it from loading.
- The warning came up when uploading a file from MODULES, but not when installing the same file from the card an agent leaves in the conversation. Both entries go through the same verifier and now also end in the same warning; `sumary` no longer goes silent depending on who wrote the file.
- `install` was listed as an understood field even though `defineModule` did nothing with it. The documented contract puts that line in the result of `status(ctx)` and reserves `installCommand` for the confirmed command; the phantom top-level field left the list and is now flagged as unknown instead of promising an effect that doesn't exist.
- **UNINSTALL now lives on the module card.** The backend protected built-in modules and the action existed hidden in the `</>` card, but the `DEV` card didn't offer it. Now each external module confirms its path and can be removed right there; it deletes its file and the record that remembers where to update it from, reloads the registry and leaves the modules MADRE ships with untouched.
- **The documentation promised an `import` the installer rejects.** `SDK.md` said you could `import { defineModule } from '@jossuealcala/madre/sdk'`. The package exports it fine, but MADRE copies your file to a separate folder to review it before installing —that way it knows what it is without it running where it lives— and there's no `node_modules` there: no package resolves. Now the guide teaches the shape that does work, which already existed: export a function and **MADRE hands you the SDK**.
- **And the trap that only happens to an agent.** The modules that ship with MADRE write `import { defineModule } from './sdk.mjs'`, because they live inside the package. An agent you ask for a module reads `ripley.mjs` before any document and copies that line — which is correct there and impossible outside. Node only answered "can't find the file", which sends you looking for the wrong thing. Now the error ends by saying what to do instead, and the example and the guide warn about it in those words.

## 0.4.1 · 2026-09-27

### MADRE has a home: madre.run

- **And what a version brings is read at that home.** `QUÉ TRAE 0.4.2 ↗` led to GitHub's releases page, which is written for people who already work there; whoever presses that button just wanted to know what changed. Now it goes to `madre.run/cambios/` in Spanish and to `madre.run/en/changelog/` in English, with the version in the anchor (`#v0.4.2`) so the page lands on the section that applies.

- The error collector lived at `madre-reports.jossue-alcala-o.workers.dev`, and **that host is shown to the user** in the core's outbound log. A `workers.dev` subdomain with an account name stuck to it looks like a makeshift endpoint; `madre.run` looks like the product. The address is part of what someone is being asked to trust.
- **The old address keeps answering, and has to.** Every room on 0.4.0 and earlier has it compiled in: turning it off would silently stop their reports. It stays written in the code and in the test, instead of disappearing from the log.
- **Two doors for every human report, always.** A failure with a trace belongs on GitHub, where it gets deduplicated and the answer helps the next person; but asking for an account from someone who arrived from a Spanish-speaking group to say "it doesn't detect Codex" is losing them. In Spanish the form leads and the issue is one click away; in English, the other way around. Nobody hits a login wall with a report in hand.
- Machine and human go to different doors on purpose: `madre.run/v1/reports` for the sentinel, `/reportar` and `/report` for people. Mixing them muddies what the author reads.
- And the logo —the README's and the bar's mark— points to the product's home instead of the author's personal site. The attribution stays where it belongs, at the foot of the README.
- Along the way a defect I introduced myself while wiring this came out: a nonexistent report identifier returned 200, because the form doesn't need the report to exist to be built. Now neither door is offered for something that isn't there.

### Image Studio looked for the key where MADRE doesn't keep it

- And on the same card, a line was under the wrong label: "hooks in only inside a create permission with the image scope on" isn't something the module *writes*, it's a condition for it to hook in at all. It moved to **NEEDS**, and along the way was worded as a requirement: "a create permission with the image scope on; only there does it hook in" — under *needs*, the previous sentence didn't fit.

- When you paste a Gemini key in ⚙ CONNECTIONS, MADRE writes it to **`~/.gemini/.env`**, which is where that CLI reads it. Image Studio looked in three places: `GEMINI_API_KEY`, `GOOGLE_API_KEY` and the macOS keychain. **That file wasn't on the list.** The room saved a key in a place it then refused to look, and the card answered "no Gemini key found" for a key it had just written itself.
- **On Linux it was total:** the keychain branch is macOS only, so `~/.gemini/.env` was the only possible place — and it was never read. Image Studio couldn't find a key on Linux except by exporting a variable by hand.
- Now the order is: what was given to this process, then the file the CLI reads on every start —and that MADRE writes—, and finally the keychain, which only exists if the CLI's own sign-in put it there. It understands the quoted form and the `export` form, and an empty assignment isn't a key.

### Remedies: prose in Spanish and a button where there was a command

- **44 of 53 conditions explained their remedy in English.** Not the commands —a command isn't translated— but the **comments** that go with them: 145 lines of prose, half of them naming buttons. `# ⚙ CONNECTIONS → Gemini → GENERATE IMAGES → SAVE` in a room where those buttons are called **CONEXIONES**, **GENERA IMÁGENES** and **GUARDAR**. The remedy sent you looking for things that don't exist under that name.
- The 80 distinct comments are in Spanish, with the names the user actually sees. The catalog guard now goes through them the way it goes through each condition's title and diagnosis — and it learned that some are **composed** on load (the helper that builds an `export` writes them), so it also asks the conditions and not just the source code.
- **Eight remedies were a command only because nobody had wired the button.** Signing in an agent, installing one, turning on a scope: MADRE already does all three from CONNECTIONS. Those conditions now declare `solvedIn: 'connections'` and their card opens the panel **on the agent in question**, instead of handing over a line to paste. The commands stay underneath, for another machine or for whoever prefers to type.
- What stays in the terminal stays on purpose: the seven remedies that touch your shell profile. MADRE shouldn't edit your `.zshrc` — configuration it didn't write lives there.

### The log, readable: an icon that doesn't get in the way and a file you can send

- **COPY sat on top of the command it offered.** It was a word floating in the block's corner, and any long command ran under it. Now it's a two-sheet icon, with its own reserved space: the command no longer runs under anything, and when copying the icon lights up instead of turning into another word.
- **The dismiss `×` fell to the line below.** The log row had four columns and adding the output made five things. Now it's five columns, with air between them.
- **DOWNLOAD THE LOG.** A CSV with one row per condition: when, which agent, **the support code**, the condition and the error. It opens in any spreadsheet and carries a BOM, so accents don't break when opening it. Whoever receives it doesn't need MADRE open to read it.

### Entering NOSTROMO can't leave you on top of the exit

- And the fix left its own mark: when giving focus to the map, the browser drew **a blue frame around the whole constellation**. The map isn't reached with Tab —it's outside the tab order on purpose—, so that ring wasn't pointing anything out to anyone. Removed; no hint is hidden by doing so, because there's nowhere to tab to.

- You typed the designation, pressed Enter, and focus landed on **LEAVE**: the next Enter threw you out of where you had just entered. A dialog hands focus to its first focusable child, and with COLD, ASK and RECENTER hidden, that first one was the exit. Now the map takes it, which is what you went there for.

### The error log: a code you can dictate, and a way out per row

- **MU/TH/UR's badge went up and never came down.** Each recorded condition is rebuilt from the ledger on every load, and there was no way to dismiss any: twenty-something alerts on top of the button, all for things already resolved. Now each log row has its `×`, and when there are several, a **DISMISS ALL N** at once.
- Dismissing **deletes nothing**: the ledger is history and isn't rewritten. It's a reading preference and lives where reading preferences live — this browser —, tied to what the entry *is* (time, agent, first line), so the same entry replayed from the ledger on the next load stays dismissed. And there's a way back: **SEE THE N DISMISSED** brings them all back.
- MU/TH/UR's greeting and the badge now count the same thing: what's still open.
- **Each condition has its support code**, `MU-001` to `MU-054`. It shows on the card and it's what the log button shows, because it's what a person dictates over the phone when asking for help. The code lives **in the condition**, not in its position in the list: inserting a new one in the middle doesn't renumber the others, which is exactly what would ruin a support code. With its test: all have one, none repeats, and a module that declares a condition declares its code with it.

### A number isn't a reason

- `Claude exited with code 143.` reads as if the agent broke. It didn't break: **143 is 128+15**, a CLI that handled a SIGTERM and said goodbye. Something **stopped** it — and that sends you looking in a completely different place than a crash.
- MADRE was also **ignoring the signal**: `child.on('close', (code) => …)` has a second argument that says which signal closed the process, and it wasn't being read. A process killed by a signal arrived as `code null`.
- Now both forms are said in words: SIGTERM is "something asked it to leave: STOP ALL, a time limit, or the room closing"; SIGKILL, "killed outright, almost always the machine running out of memory"; SIGINT, "a Ctrl+C reached it". An ordinary failure keeps its number, which there is what diagnoses it.

### PLAYWRIGHT never connected, and npm was eating the flags

- Asking an agent to use the browser answered `CONNECTION_CLOSED: "Connection closed"`. The cause: MADRE launches the server with `npx --no @playwright/mcp --headless --isolated …` and **npm keeps those flags as its own configuration** —`Unknown cli config "--headless"`— and hands the server only the loose values. The server dies with `too many arguments. Expected 0 arguments but got 4` before speaking a word of MCP. A `--` was missing between the package and its flags. Tested: without the separator the server dies with code 1; with it, it answers the MCP handshake.
- Underneath there was a second one: **the server and its browser are two different things**, and the card only checked the package. A PLAYWRIGHT "on · chromium" can have no browser, and then every tool answers `Browser "chrome-for-testing" is not installed`. The remedy MADRE showed was also no longer the right one: today the browser is downloaded by the server itself (`npx @playwright/mcp install-browser chrome-for-testing`), not by the playwright CLI.
- And a third when going to translate the above: **the conditions a module declares weren't in the Spanish catalog**. They live in the module's file, not in `troubleshooting.js`, so the guard for the 51 never saw them and PLAYWRIGHT explained itself in English inside a Spanish room. The guard now reads the modules too.

### A CLI that updates itself underneath an open room

- In a QA, `spawn /Applications/ChatGPT.app/Contents/Resources/codex ENOENT` came up with the binary **existing and being executable**. The ChatGPT app had updated its Codex mid-session —from `0.154.0-alpha.6.2` to `0.155.0-alpha.9.2`— and MADRE was still pointing at the one that was no longer there. Reopening the room finds the new one; without knowing that, it looks like the product broke.
- What made that moment unreadable: **`spawn` fails in two ways and only one was explained.** The asynchronous one raises `error` on the child process and there was a sentence there saying what to do. The synchronous one **throws before there's a child to listen to**, so it skipped the whole handler and the raw node error reached the room. Now both go through the same explanation, and it names the cause nobody can guess: a CLI that updates itself can move underneath an already open room.

### A warning isn't a cause

- A user reported that MADRE "only works with APIs": they had Codex and Claude with their plans, both signed in, and no turn answered. What they read was, in Claude, a warning about `ANTHROPIC_API_KEY`; in Codex, the line `Reading additional input from stdin...`. Neither of the two was the reason.
- **The defect was in how MADRE reports a failed turn.** When a turn produced no reply, the message was `stderr.trim() || …` — whatever was left in stderr, and the `||` **discarded the only thing that diagnoses**: the exit code, or the fact that the CLI exited cleanly without saying anything. So a warning about a setting that didn't matter became "the cause", and the real cause reached nobody. For Codex it was worse: its parser never returns an error of its own, so stderr was literally all that was left.
- Now the message first says **what happened** —`exited with code 3`, or `exited cleanly without a reply`— and then, separated and labeled, **what the CLI printed**. Never one disguised as the other. The exit code travels in the error for the sentinel.
- And MU/TH/UR learned both conditions. Claude's explains what the user couldn't know: MADRE hands the CLI the environment exactly as this computer has it, so an `ANTHROPIC_API_KEY` exported in your profile **wins over the claude.ai plan** and the turn is charged to the API. Codex's says the opposite of what it seems: that line is harmless, MADRE runs it with stdin closed, and if the turn failed the reason is the line above.

### What the person who tested it found

- **`PULSE_LANGUAGE` didn't change the interface** — and the defect was worse than that. The server did respect it at startup and also when pressing the button; but `/api/state`, which is where the page learns what language this machine speaks, **reread the configuration file** instead of asking for the already resolved language. With the variable set, the room was **split**: the server's texts in English inside a Spanish interface. A split room is worse than either language. Now the page receives the language the room is speaking, not the one written in the file, and there's no second expression that could disagree again.
- **«1 ARCHIVOS».** One created file isn't files. The defect came from the English —`created · 1 files` said the same thing— so it wasn't from the translation: it had been there since artifacts existed.
- **EYECAT spoke English.** Its two findings —«una nota que sus propias fuentes no sostienen» and «dos memorias que no pueden ser ciertas a la vez»— were never wrapped. They were whole sentences, not a loose word.
- And while looking for that one, a fourth appeared: **the severity of each MU/TH/UR condition was printed raw**. Eight cards saying `blocking`, `degraded`, `transient`, `informational` on a screen otherwise in Spanish.

### The third time the same thing happens

- Memory classes, a notice's level and now a condition's severity: all three are **an id in the catalog and a word on screen**, and all three were printed raw. The catalog guard can't see them by construction — they never go through `t()`, so there's no missing key. Now there's a guard for **the shape**: it fails if a `.kind`, `.level`, `.severity`, `.status` or `.stage` is written directly into a node, and it requires the three maps to stay declared entry by entry, because computing the key hides them from both guards at once.
- Along the way a homonym came out that a catalog keyed in English can't sustain: `FIXED` was already **FIJO** —the part of the prompt that doesn't change— and the severity `fixed` means **resolved**. The English card now says `ALREADY FIXED`, which is clearer in both languages.

### Not a defect

- **Agents answer in your language, not the message's.** MADRE does ask for the language: the briefing's `style` block tells them "write to the room in the language the human writes in" (`src/room/prompt.mjs:86`). What happens is that your global instructions —your `CLAUDE.md`, your `AGENTS.md`— **win over the briefing**, and that's how it should be: they're yours and they're permanent. It's the direct consequence of MADRE using your sessions as they are, which is exactly what it promises.

## 0.4.0 · 2026-09-26

### Really updating, and a door for the community
- A card's `↻` looked and nothing more: OLLAMA said `0.34.3 AVAILABLE` and PLAYWRIGHT `NEWEST IS 0.0.82`, and there was no way to do anything about it. Now, when there's something newer and the module knows how to fetch it, the button appears next to the version. It's two calls: the first asks what would be run and answers with the command, the second runs exactly that. MADRE doesn't run a command you haven't read, and the output lands in the room line by line like any other install.
- It doesn't install on its own on purpose. Installing software on your computer without warning would break exactly what MADRE promises —the command is seen before it runs— and could break your environment mid-session. Detecting is automatic; running it is a click of yours on a command in plain view.
- In the SDK, `updatePlan(ctx, { latest })` says how that version is fetched. Where no command is possible —an Ollama that wasn't installed with Homebrew— the card hands over the download instead of pretending.
- A module of yours can now update itself: declare `updates: { url }` where you publish it, or install it from a file and MADRE remembers which one. Its card has **GET A NEWER FILE**: it fetches the file, verifies it and replaces it if it loads and states another version. Checking installs nothing —that cost a real bug: the first attempt used the install machinery to look, and looking reloaded your registry—. And replacing your own module stopped clashing with its own id, which is what an update is.
- And in the MODULES header there's **+ ADD A MODULE**: someone else's `.mjs` comes in through the same door as everything else —separate copy, imported there, checked against the house rules, installed only if it passes— and if it doesn't pass, the author reads exactly why. What it is gets said clearly: a module runs inside MADRE with your permissions, and what the code intends can't be verified by anyone but you.

### The core: what MADRE says in your name
- Every turn, MADRE writes a document in your name and hands it to a process. Until today that document **existed only for the instant the process read it**: it wasn't saved anywhere and nobody had ever read one. Not even you. You get in where you had to: **inside NOSTROMO, by clicking the core**. Touching the star was until today an attempt against the archive; what's behind it is what MADRE says in your name, and reading that is nobody's trespass.
- It's all there, block by block, with what each one weighs and the exact words: `room`, `who`, `privacy`, `mode`, `memories`, `recall`, `context`, `delegation`… In this room it's seventeen blocks and fourteen thousand characters.
- Change who it goes to and the words change. **Raise the mode and the permission that would be given appears, in writing.** At `#2` the document grows a thousand characters and the `lease` block is born with what that agent could create and where — but no folder is created and no checkpoint is taken to show it: the path is named, not made. If that agent's ceiling is lower than the mode you chose, it says so with its number.
- **It's built around what you're going to ask.** You type the question there —or bring it half-written from the composer— and the document rebuilds: the memories it would invoke, the exchanges it would cite and the question it would close with all change. Without that it was the briefing for a turn nobody was going to have. What you type isn't sent anywhere, and it says so next to the field.
- And it says what window it loads: from which exchange to which, how many messages go in and **how many were left behind** —which is exactly what recall exists for—. That figure was computed from day one and always came out empty because I was reading a field with another name; now it's a real range.
- Asking what the room would say isn't the room saying it: the memories read to build it **aren't counted as recalled**, the window doesn't move and no process is started. The document is built on the spot and not saved: five kilobytes per turn would bloat the ledger and duplicate what's already in the transcript.
- It's read, never written, and it says so right where someone would look for the edit button. If this text were editable, every safety sentence MADRE prints —that they read by default, that they were told not to touch `.env`— would become a claim about a document someone could have changed. The blocks that can be turned off are turned off with their switch; free text, never.
- Under the document is **THE LAUNCH**: the exact command MADRE would run to deliver it, with the executable, the directory, every flag and the place where the briefing goes in. It isn't a description of the command — it's built by the same adapters that would really build it, so "this agent works read-only" stops being a promise and becomes a line you can read. And below, what keeps the run inside this turn —the session that doesn't persist, Gemini's temporary home that's deleted when done— and the servers it could call with their tools counted.
- From that command **an environment value is never printed, only the names**. A command line is something people photograph, and values are where keys live: you know `GEMINI_API_KEY` is set, not what it is. That holds for any way an adapter writes them, including the ones a module installed tomorrow adds.
- And for `@madre` there's no command: no process is started, it's the local model answering inside MADRE. The core says so instead of inventing a line.
- And it feels like going inside the sun because it **is** the sun: the frame opens on top of NOSTROMO's star, which keeps spinning and breathing behind it. None of that is a new language — the frame, the folds, the bars and the lettering are the ones MADRE already speaks.

### The room, in one image

- The README didn't have a single photo of the product. Now the first screen is **the room at work**: a question, Codex answering, and below it `RELEVO @CODEX → @CLAUDE · 4 MENSAJES CARGADOS` with Claude discussing what Codex had just said and citing `src/store.mjs:8`. That handoff line is the product's whole promise in one line.
- The conversation is **real**, with two real agents on a demo project written for it —a link shortener with an authentic write race—, not a mockup. And it's nobody's room: not a single detail of the publisher's project appears in the image.

### A notice's level, in Spanish

- `WARNING · @CODEX 84% DE CUOTA DEL PROVEEDOR USADO · SIGUE CON @CLAUDE`. The sentence was in Spanish and **the word in front wasn't**: the thread printed the level's id as is. The three words had been in the catalog for months —the server already used them when writing the notice— and the page never asked for them. Now it says `EN AVISO`, `EN CRÍTICO` and `AGOTADA`, as its sibling `CLARO ·` already did. Declared one by one, so the catalog guard sees them.

### A mode only reachable with the mouse, and papers that contradicted each other

- **`#4` existed in the menu and couldn't be typed.** The composer accepted `#0` to `#3`; the chip offered all five. Now it accepts all five — and fixing it brought out the real thing: **typing `#3` armed CONTROL without asking anything**, while clicking `#3` opened the override. The same mode, two prices. Now the two high ones go through the same door: the token comes out of the message, the text goes back to the field and the override decides. The ceiling is still the server's word (`room.modeCheck`); this is the ceremony in front of it.
- **`SECURITY.md` pointed to a README section that doesn't exist** — "the short threat model lives in the README under *Modelo de amenazas, en corto*". Now it points to where it's actually written.
- **And it didn't say a word about AIRLOCK.** `#4` runs commands, does `git push` and deploys, and the security document was blank about the product's most sensitive surface. It's written now, with what it takes to arm it and with the sentence that matters: treat `#4` as handing your shell to that agent.
- `CONTRIBUTING.md` pinned the versioning rule to `0.2.x`. The rule wasn't for that version.

### A README that sells and a reference that explains

- The README was four thousand words of excellent manual. A manual isn't a front page: whoever arrives doesn't know yet whether this is useful to them. Now it's **eight hundred** — the promise, the command, three things MADRE does and a list of **what MADRE is not**, which is what really sets it apart: no cloud, no account, no stored credentials, nothing going out on its own, and with the screens that prove it.
- Everything else —the modes inside, each agent's capabilities, the memory, the modules, the config and the thirty environment variables— lives in full in [`docs/en/REFERENCE.md`](docs/en/REFERENCE.md), which travels in the package.
- And there what was missing finally got written: **the language** (Spanish by default, `EN` one button away, `PULSE_LANGUAGE`, and why the terminal stays in English on purpose), **THE LAUNCH**, the outbound log and the core console.

### The room's four places have Spanish names

- `MODULES` and `THE CORE` stayed in English because they were on the list of names that aren't translated, along with MU/TH/UR, NOSTROMO, ASH and RIPLEY. But those four are **the ship's proper names** and these two aren't: they say what's behind the door. Now they're **MÓDULOS** and **EL NÚCLEO**, which is how the room's prose already called them — «mira MÓDULOS», «aléjate del núcleo».
- Removing them showed that `FILES`, `CONVERSATIONS` and `NEW CONVERSATION` **had already been translated** for a while: the exceptions list let them through ahead of the catalog, so the guard approved them for the wrong reason. A guard that approves by accident isn't a guard.
- And from there something worse came out: **six sentences were in the catalog twice**. A repeated key is legal JavaScript —the second wins silently and the first is dead—, and in a file of more than a thousand lines that's how a sentence ends up with two Spanish versions and your correction lands in the one nobody reads. All six were identical, so nothing changed on screen; now there's a test that reads the file as text and won't let a seventh in.

### An example gets typed, so it's said in your language

- The empty room invited you to start with `@codex summarize this project`. The walk that translates the markup **skips `CODE` and `PRE` on purpose** —what a machine reads isn't translated, and `madre doctor` has to stay `madre doctor`— but that one wasn't code: it was an example of **what you would write**, and that's a sentence like any other. Now whoever writes it by hand marks it with `data-say`, and it says `@codex resume este proyecto`.
- With it, the fallback name when MADRE doesn't know what your folder is called: «este proyecto», not "this project".

### NOSTROMO's legend, and a bar that fit on one line

- The five memory classes were drawn with their **id**, not their name: `DECISION`, `FACT`, `PREFERENCE`, `QUESTION`, `ABERRATION` in a room entirely in Spanish. Now the legend, each memory's card, each star's tooltip and the thread's pills say DECISIÓN, HECHO, PREFERENCIA, PREGUNTA and ABERRACIÓN. The id in the ledger doesn't move: what changes is the word on screen, and all five are declared one by one so the catalog guard really sees them instead of letting them through for looking like a code identifier.
- **How long ago** was also half done: «MEDIDO 1 D AGO». Now it's «MEDIDO HACE 1 D», and with it "right now", the minutes and the hours that are read all over the room.
- And `CONCEDIDO` / `NEGADO` on the button with which you resolve a permission request, which were still in English right at the moment of deciding.
- NOSTROMO's bar had five columns and up to seven things to put in it: when ASK and RECENTER appeared, **LEAVE fell to the line below**. Now the bar flows in columns —it fits as many as needed— and the subtitle is trimmed with an ellipsis instead of pushing the buttons out.

### The first-time tour, and the last pass

- **The onboarding was missing.** The four steps that explain the room to whoever arrives for the first time —the composer, the crew, the project tree, MU/TH/UR— were still in English, which is exactly the worst place to leave them: it's the first thing anyone reads of MADRE. Now they start in Spanish, with `EMPEZAR ›` and `SIGUIENTE ›`.
- The **entire composer**: the `/` menu, the modes menu and the models menu; the override dialog with what `#3` and `#4` grant; the bridge that installs Ollama and signs in; each bubble's actions and ratings; and the forty-eight phrases an agent uses to say it's thinking.
- **MU/TH/UR**: the catalog header («CONDICIONES CONOCIDAS · 51 DE 51 · darwin / zsh»), what EYECAT answers and how an aberration is filed.
- **MODULES**: the versions and what each one means —`INSTALA 1.4.1`, `AL DÍA`, `LA MÁS NUEVA ES 0.0.82`—, the notices before installing and updating, the room's economy with its four figures, and the Ollama, RIPLEY and Ash cards with their switches.
- **PRIVACY and NOSTROMO**: what remains exposed, the purge and what it replaces, the quick settings for time limit and budget, each memory's card, its travel companions and forgetting.
- And a real bug that came out of this: when purging the room, MADRE recognized a misspelled project name by comparing the server's error against an English text. In a Spanish room that text never matched, so MOTHER's alarm **didn't go off at the only door where it matters**. Now both sides say the same sentence from the same catalog.
- The scanner went over the whole page again until it didn't find a single untranslated sentence-shaped literal. What stays in English stays on purpose and is declared: the ship's names (MU/TH/UR, ASH, RIPLEY, GHOST, CREATE, AIRLOCK), `ON`/`OFF`, `HELP` —which is a command that gets typed— and everything a CLI prints on its own.

### What MADRE wrote in another language, said again
- Recorded conditions are history: each one keeps the sentence MADRE wrote that day, and a room that changed language kept showing them in English. The ledger isn't rewritten —that would be falsifying the record— but **the words are only how it's read**, so now they're said again on the way to the screen: «MADRE agotada: @claude lleva 99% de su presupuesto local de tokens de la sala… Sigue con @codex o @gemini.»
- Only **the sentences MADRE writes about itself** are said again, and they're declared one by one. What a CLI printed stays exactly as it printed it —`API Error: 500`, a Node ENOTEMPTY, a stack trace— because that text isn't MADRE's and whoever reads it may need to search for it word for word.
- Along the way the missing pieces of those same sentences went into Spanish: the notice's level (agotada · en crítico · en aviso), the conjunction between agents («@codex **o** @gemini», which an older MADRE wrote in English), the human's STOPALL and the time limit of an agent that didn't answer.
- And old rooms say `PULSE exhausted:` because that's what this used to be called: when read, it says MADRE.

### What was still in English inside MU/TH/UR
- The whole panel: the releases channel with its notice and its switch, the sentinel with its reports, the boot («INTERFAZ 2037 LISTA PARA CONSULTA · TRIPULACIÓN: 5 AGENTES · 5 LISTOS»), the recorded conditions, and the folds — `▸ ABRIR`, `▾ CERRAR`, `ABRIR TODO`.
- The **tooltip of each sphere**, which was all English: the local window, the provider limit, the turns, the last turn, the reported cost, the session, the version, and the five capabilities (lee · ve imágenes · crea · genera imágenes · web).
- Each agent's accounts, which come from the server: «Gratis y local con Ollama: sin cuenta, sin tokens. Contesta desde la memoria de la sala.»
- And **what MADRE says when something runs out or fails**: limit notices, interruptions due to restart and the explanations for Gemini errors. That's written to the ledger, so what's already recorded keeps the words it was written with; what's new goes in in Spanish. What a CLI prints on its own is still its own and isn't touched.
- **1,120 entries.** And the scanner I use for review started looking for any sentence-shaped literal, not just the ones in the positions I expected: that's how these came out.

### MU/TH/UR's 51 conditions
- The last big block: the title, diagnosis and remedy of the catalog's fifty-one conditions. About five thousand words, written in Spanish, not translated — including the really long ones: the five permission modes, how the room's memory works, what each of the three tests measures, what an aberration is and why a memory is cold.
- **What's read goes in Spanish; what RECOGNIZES a failure doesn't.** Each condition's patterns are tested against what a CLI printed, and a CLI prints in English whatever language the room speaks: they stay exactly as they were. The commands in each remedy aren't translated either: they're commands.
- And they're said at the moment of reading, not when importing the file: the table is built when the module loads and the room learns its language afterward. Search also searches in the language it's read in, so typing «sesión» finds what before only "session" found.
- **1,003 entries** in the catalog. With this, MADRE's entire interface —the room, the panels, the core, the errors, the markup and the diagnostics catalog— is in Spanish.

### All the markup, and the room's errors
- There were **143 sentences inside `index.html`** that no table reached: the MU/TH/UR and NOSTROMO dialogs, the door with the designation, the command override, the four-step tour, each memory's card, ABRIR TODO and CERRAR TODO, OLVIDAR ESTA MEMORIA, MOTHER's warning. They were there because the list of selectors that translated them fell short the day someone added a dialog.
- So there's no list anymore: the page **walks its own markup** once, before the first paint, and passes every text node and every `title`, `placeholder` and `aria-label` through the catalog. What the catalog doesn't know comes back as it was, so the commands inside `<code>`, the project name and the ship's names don't need an exception: they simply aren't there.
- And a test walks `index.html` and requires every visible sentence to be translated or on the list of those that aren't translated —MADRE, MU/TH/UR, NOSTROMO, CREATE, `madre doctor`—. A list of selectors rots; this doesn't.
- The **40 errors the server answers with** also speak Spanish: «No existe esa memoria.», «Hay un turno corriendo en esta conversación.», «CODE000. EL ARCHIVO ESTÁ SELLADO.»
- 850 entries in the catalog.

### The thread, and what was left loose
- The whole conversation: who's speaking and in what mode, what a turn costs while it's being written, the memories that were used and the ones that were saved, the handoffs between agents, the plans, CONTROL with its checkpoint and its DESHACER, the limit notices, MU/TH/UR's alerts to the whole crew and the end of the log.
- And what was still in English in MODULES and CONNECTIONS, which was quite a lot: EYECAT with its three sections, the room's economy, the local brain, the SDK, the privacy purge with its two guards, the models menu, the file viewer, the override dialog, MU/TH/UR with its diagnosis and its remedy, each memory's card in NOSTROMO, the releases channel and the sentinel.
- The catalog is at **673 entries** and the page no longer has a single sentence reaching the screen without going through it. A scanner checks this by looking for text in the positions where text lives —`el(tag, clase, …)`, `.title`, `.textContent`, `toast(…)`, `field(…)`— and today it finds nothing.

### The room's readings, in Spanish
- The verdict, the six maturity signals and what each test says when it finishes were built with templates inside `maturity.mjs`, `verdict.mjs` and `exam.mjs`. Now they're written with slots and go through the same catalog: «CUÁNTO SE USA · a 58 de 71 memorias se les ha echado mano al menos una vez», «Contesta las 6 preguntas que la sala se escribió sola», «En 10 de 12 preguntas reales el modelo local aterrizó donde aterrizó el agente de aquel día».
- **And a saved reading is said again.** Test results live next to the memory, with the sentence they had the day they ran; a room that changed language kept showing them in the old language. The numbers are what was measured and the sentence is only how it's said, so it's rebuilt now, with the fields that were saved. What was saved before this keeps its sentence.
- The stages table —EMPTY, SPARSE, FORMING, WORKING, MATURE— keeps the English and is translated when read, not when imported: that list is built when the file loads, and the room learns its language afterward.

### CONNECTIONS and NOSTROMO, in Spanish
- All of ⚙ CONNECTIONS: each agent's card with its session, its permissions (GENERAR IMÁGENES, ACCESO A LA WEB), MODO MÁXIMO and MODO INICIAL with what each one means; the room settings; the memory with its archivist, its distillation and its embeddings; the step-by-step training card; and privacy with its terms and its purge.
- NOSTROMO: the star legend —ENANA AMARILLA, ENANA BLANCA, ENANA VERDE, ENANA AZUL, COLAPSADA—, the subtitle that counts memories, links and what's behind, the panel of questions the room writes for itself, and the three tests with what each one measures.
- **And MOTHER's voice.** That wasn't translated, it was written: «ESTOY VIVA.», «ESE ES MI CORAZÓN LO QUE ESTÁS TOCANDO.», «LA TRIPULACIÓN ES PRESCINDIBLE. LA MEMORIA NO.», «NADIE BORRA LA MEMORIA DE MOTHER.» And when the bars come down: «CODE000 · ORDEN ESPECIAL 937 EN VIGOR. EL ARCHIVO ESTÁ SELLADO. SAL DE MI NAVE, INTRUSO.»
- Three local variables were named `t` and shadowed `t()` —the function the whole page speaks through—. Now they're named for what they are (`elapsed`, `clock`, `info`). One of them was inside the training card: there Spanish would have blown up the whole screen instead of falling back to English.
- What's left of the panel: the **readings the server computes** —the verdict, the six maturity signals and what each test says when it finishes— are still in English. They're built with templates inside `maturity.mjs`, `verdict.mjs` and `exam.mjs`, so they aren't sentences a catalog can reach; they have to be rewritten with slots, as was done with the modules. It's the next piece and it's a clean piece.

### MODULES, in Spanish — and the catalog crosses over to the server
- The full cards: each module's state, **QUÉ TOCA** with what it ESCRIBE and what it NECESITA, **COMANDOS**, **AJUSTES**, and the buttons — INSTALAR, CONFIRMAR INSTALACIÓN, ACTUALIZAR A…, TRAER UN ARCHIVO MÁS NUEVO.
- What a module says about itself lives **inside the module, in English**, and is now translated at the border: `describeModules()` passes the card through the catalog before sending it to the screen. Not a single module file changed language, and what a module hands to an agent stays exactly the same.
- For that the catalog crossed over to the server: `src/i18n.mjs` imports **the same `public/es.js`**. A single file for the whole product, because a sentence that shows up on a card and in a notice can't be translated twice and come out different. The coverage test now walks both sides of the wire.
- `ON` and `OFF` stay as they are. The same word is a card's switch and an outbound address's state; translating it would split it in two depending on where it appears, and in a Spanish interface ON/OFF reads without friction.
- And the tests read MADRE **in the language it's written in**, decided in a single place: `PULSE_LANGUAGE`, which wins over the configuration file like everything else here. They assert what a module is, what a room does and what a reading means — not how it's worded— so they don't move every time the Spanish improves. Spanish has its own tests: catalog coverage and the page's smoke test, which starts in Spanish on purpose.

### The core, in Spanish
- The four tabs and everything behind them: EL DOCUMENTO with its blocks and their weight, LO QUE CARGA, EL LANZAMIENTO with what keeps the run inside the turn, LO QUE SALIÓ DE ESTA COMPUTADORA with its addresses and its log, and MU/TH/UR's whole console —the eleven queries, their answers and the three refusals—.
- The names of the briefing's blocks **aren't translated**: `room`, `who`, `privacy`, `memories`. They're ids of the prompt the agent reads in English; translating them on screen would be showing a document that doesn't exist.
- `SPECIAL ORDER 937` answers in Spanish the same thing it answered in English, which is the only thing this product can answer: «no hay ninguna orden que no puedas leer».
- The console lives in its own module and now speaks through the same catalog as the page, so the coverage test walks both files. And the console's tests read in the source language on purpose: they're about which query answers what, not about how it's worded.
- A sentence that comes out the same in both languages no longer fails the review: LOCAL is LOCAL. The rule stuck to what matters — from two words on, the Spanish has to be Spanish.

### The first hour, in Spanish
- The whole bridge —«Con un agente basta para abrir la sala»—, each card's states (NO INSTALADO, SIN FIRMAR, LISTO), the free way in, pasting the key and the line that says nothing is installed without you pressing it.
- The full bar by its titles, the connection state (conectando · en vivo · reconectando), the composer with its buttons and its safety line, who's speaking in front of the field (HUMANA ›, TRIPULACIÓN · PRESCINDIBLE ›) and the first three questions the room offers you when the page is blank.
- The ship's names aren't translated and won't be: MU/TH/UR, NOSTROMO, CODE000, GHOST, EXCHANGE, CREATE, CONTROL, AIRLOCK, ash. They're names, not labels.
- The markup is still the English source: `index.html` keeps the sentence and the page swaps it once before the first paint. No ids to keep in line with the screens, and an element that no longer exists is simply skipped — the markup and the list can disagree without anything breaking.
- And the smoke test no longer checks an English room: it starts in the language MADRE speaks, so the whole pipeline —English markup, catalog, Spanish screen— is tested on a rendered page and not just on the dictionary.

### MADRE speaks Spanish, and English is one button away
- The plumbing, not the translation: the language lives in `~/.pulse/config.json`, Spanish is the default value and in the bar there's a button that says **EN** — you press it and the interface comes back in English, saying **ES**. It reloads instead of translating halfway: half a screen in each language is worse than either one.
- **The key is the English sentence**, as written in the code. There are no ids to invent or keep in line with the screens, and a sentence nobody has translated yet **comes out whole in English** instead of leaving a gap or a `MISSING_KEY_47`. What varies inside a sentence travels as a named slot, `{n} bloques`, so the Spanish puts it where Spanish puts it.
- What's already *data* —MU/TH/UR's catalog, the console's queries, the egress addresses— isn't translated key by key: it carries its Spanish table next to it, chosen whole. Translating a table word by word loses the table.
- And a test guards it **in both directions**: a key the product no longer says is the translation of something nobody reads, and a `t()` the catalog doesn't have is a screen in the wrong language. The second one doesn't break anything —it falls back to English—, which is precisely why it needs a test. It already caught two dead entries while it was being written.
- This phase translates thirteen sentences —the composer and what each permission mode does— to test the pipeline end to end. The rest arrives screen by screen, starting with the first hour of use.

### The crew writes in your language
- Nobody had ever told them. Agents answered in Spanish only because you write in Spanish and a model imitates what it reads — which is a habit, not a rule, and it breaks precisely on the turns that carry the most English around them: a delegated step, a plan, a room full of paths.
- Now the briefing's `style` block says it: write in the language the human writes in, and **leave code, paths, commands and identifiers exactly as they are**. This is a room for working on code.
- It goes inside the block that already existed: no new block, no new id, nothing the core reads differently. And it's in the prompt's stable header, so it's the same bytes on every turn and costs the cache nothing.

### How you find out your local model is ready
- Ollama running isn't the question. The room already had the good answer —the third test asks the local model twelve real questions from this room and measures whether it landed where the crew landed, against a control so that "talking about the same topic" doesn't count— but it lived in a panel you had to go back to. Nobody told you.
- Now the room says it, **once per model**, where you're already reading: `local · @madre · qwen2.5:7b` and, below, either "nobody has measured it against this project yet: running here isn't the same as being useful here" with a **CHECK IT AGAINST THIS ROOM** button, or the result that already existed. The test takes minutes and **doesn't spend a cent**: everything runs on your machine.
- When it finishes, the answer lands in the room, not in a panel: "it answered 10 of 12 real questions from this room where the crew answered them. It's ready to be worked", with the only next step beside it — sending it the next turn. And if it doesn't pass it says so just as clearly: "not yet; keep working, the archive fills up where the work happens". A test that can't fail measures nothing.
- And MU/TH/UR knows how to answer it when you ask in your own words —"is my local model ready yet?"—: what the test measures, why it's measured against a control, and that a model that doesn't pass isn't broken, it's the archive that's still thin. Fifty-one conditions.
- It's said on its own and doesn't depend on the crew line, which is only emitted when the crew *changes*: a room that opened with Ollama already on would never have found out. And `@madre`'s sphere keeps the reading with its date, for when the announcement has passed.

### The core's tokens are an estimate, and they say so
- The core converted the document's weight with the rate the room measures, and that rate isn't a tokenizer: it's **how much of what you were billed MADRE wrote**. The CLIs also charge for their own system prompt, their tools and every file they open during the turn, so in a real room the ratio fell to 0.62 and the core called a 14,356-character briefing "23,155 tokens" — six times too much.
- Now it estimates at **3.5 characters per token** and writes it that way: `≈4,100 TOKENS · ESTIMATED AT 3.5 CH/TOKEN, NOT MEASURED: MADRE DOES NOT HAVE THE PROVIDER'S TOKENIZER`. 3.5 and not 4 because the briefing mixes English prose, code and memories in the language the room works in; of the two ways to be wrong, saying a turn costs a bit more than it does is the harmless one.
- The same error was inflating **TOKENS SAVED**: what the room decided not to send was converted with that ratio, so the savings MADRE credited to itself came out multiplied. Now it uses the declared estimate. A test pins that the page and the room estimate the same number, and that the savings no longer ride on the measured figure.
- And the measured figure isn't thrown away: it stays in ECONOMY, under the name of what it is — "MADRE wrote 175,404 characters of the 281,333 input tokens you were charged; the rest is what the CLIs read on their own". That difference is exactly the useful thing that number had to say.
- The core also opens with one request instead of two: it no longer needs to ask about the economy to know what it weighs.

### The core gets organized: four panels and a prompt
- There were four things to see in there and they were a single scroll: the document, the command that delivers it, what left this computer and MU/TH/UR answering. Whoever was looking for one had to go past the other three. Now the frame **is a terminal**: four panels, one at a time, and the prompt always at the bottom. Each tab says what's behind it —`17 BLOCKS · 14,356 CH · ~3,600 TOKENS`, `@claude · 19 ARGS`, `8 ADDRESSES · 5 ON`— so nobody opens a panel to find out whether it has anything.
- And it's laid out the way the terminal this room is dressed as prints: `==>` above each section, names in one column and numbers in another, nothing said twice. The two dense all-caps paragraphs that explained the window are now four `key · value` rows. The blocks are a list of packages —sign, name, weight, bar and the reason it's there— instead of a wall.
- The prompt isn't one more floor: **it's the way through the four panels**. Asking for `LAUNCH`, `BLOCKS` or `EGRESS` opens that panel instead of printing it a second time; everything else is answered in MU/TH/UR's panel. The console and the panels stopped being two ways of working.
- The strip at the top —who it goes to, in what mode, and the question everything is built around— is one line per item and no longer competes with the document. What you type still survives every rebuild, because what gets rebuilt is the panels.
- Each block's weight bars were called `bar`, which is the name of the room's top bar: they inherited its 32 px padding, its bottom border and its `width: var(--column)`. That's why they looked like tall narrow boxes and why the whole panel slid sideways. Now they're called `weigh`, they're really wide, and nothing inside a panel can push the frame wider.
- And the whole core is now tested in a toy DOM: it opens, the four panels fill, a question is asked and a failed attempt is counted. It's the most built-up screen on the page and until today no test would have noticed it blowing up.

### MOTHER's alert has a home
- The machinery was complete and unhooked ever since the core became the entrance. It now answers to what it had to answer to: **a wrong designation**. Two doors in this room ask who you are before doing something that can't be undone —boarding NOSTROMO and purging every private term already recorded— and getting that name wrong is never part of working: either you know which project you're standing in or you're trying names. The first one is a shrug; the eighth is CODE000, with the archive sealed for ten minutes and the crew warned in code.
- The window is five minutes and not thirty seconds, because a name is typed, not clicked. And MU/TH/UR answers where the question was asked: at the door, over the constellation or in the room.
- Touching the core is **not** that and never counts. Reading what the room says in your name isn't an attack on anything; it's the entrance.
- MU/TH/UR knows how to explain both things: what a designation is and why the archive was sealed —nothing was lost, the seal is a refusal to change the archive for ten minutes and it lifts on its own— and what the core console is when it closes on the third try.

### The console inside the core
- The core already had everything an answer needs —the next turn's document, the command that would deliver it, what left this computer— and still a person with a question had to find the floor that answers it. Now the frame **asks**: MU/TH/UR 6000 answers from what's already in the room. `BLOCKS` lists the blocks with their weight, `READ MEMORIES` prints one word for word, `LAUNCH` the command, `EGRESS` the addresses, `WINDOW` what it loads and what it leaves behind, `WEIGHT` what it costs, `CREW` who's there and how far they reach, `PRIVACY` how many terms it protects, `STATUS` where the archive stands and what to do about it.
- **It answers or says it can't.** Three queries it can't interpret and the frame closes — it's the machine it is. And it's fair: the counter is on screen from the first one, each refusal says what it would have accepted, and reopening the core starts from zero. Nothing else happens: reading what the room says in your name isn't an attack on the archive.
- Nothing is sent from there and nothing is asked of the crew. Every answer is built from what the page already has; only two —the verdict and the privacy count— go fetch their data when asked, so that opening the core stays a single request.
- Of the terms the room protects, **only the number and the placeholder cross into the console**. The words never get in there, so there's nothing that could be printed by accident.
- And yes, it answers `SPECIAL ORDER 937`: "there is no order you can't read". It's literally true —every instruction this room carries is up there, block by block— and it's the difference between this ship and the other one.

### What left this computer
- "MADRE runs on your machine and what it knows lives in a file of yours" is worth exactly as much as the list that qualifies that sentence. Now the list is inside the core, under the document: **WHAT LEFT THIS MACHINE**, eight addresses, each one saying what it carries, when it goes out and where it's turned off. The briefing, which goes to whoever operates the agent you sent the turn to; Gemini embeddings, which carry **the text of your memories**; the image model, which carries the prompt an agent wrote; the npm registry and GitHub, which receive a package name and nothing else; the error collector, which receives a redacted condition and only with your click; and Anthropic, to read how much of your plan is left. Ollama is on the list precisely so it can be seen that it stays here.
- Under the list is **the log**, which is what turns the list into something verifiable instead of a promise: every request this process made, with where it went and when. MADRE's and any module's, because a module runs inside this process and can't get out of the wrapper every `fetch` goes through. An address nobody declares appears flagged as exactly that.
- **A body, a header or a parameter's value is never written** — only which parameters came. The Gemini embeddings address carries the key in the URL, and a log of what left your computer would be a terrible place to leave it.
- Image Studio runs in its own process, so it writes its own line in the same file: the only request that carries someone's words to Google would have been exactly the one the log couldn't see.
- And the list doesn't degrade on its own: a test walks all the code and requires every address that appears there to be declared above —with what it sends and where it's turned off— or listed as something MADRE only shows a person so they can click. There's no third category.

### MU/TH/UR knows how to explain what the room learned to do
- The catalog offered remedies for three systems and only two are tested. The Windows commands were never run by anyone here, and a command nobody has run is worse than none: the selector leaves macOS and Linux, and each condition answers on both. The fold's header says which shell what you're reading is written for.
- And seven new conditions, one for each thing the room learned to do that MU/TH/UR didn't yet know how to answer: what a conversation is and why only one drives the crew; what an aberration does with the note it refutes; why under a reply it says "1 by association"; what it means for a memory to be cold; what the three tests measure and why they're measured against a control; how what a module manages gets updated —including npm's `EACCES`, which is fixed with a prefix of your own and not with `sudo`—; and the three reasons a third-party module can be rejected.

### The crew lives in MU/TH/UR, and a single door leads to it
- `⚑ CREW` closed the panel and took over the canvas with a page written in the page's palette: white cards in a product whose settings are all phosphor, and a second place to do what `⚙ CONNECTIONS` already did —install an agent, sign it in, paste its key— three lines away from those same agents' modes and permissions.
- Nothing had to be built: the surface already existed and was being covered up. The connections section now carries the only sentence the bridge existed for —one agent is enough to open the room— and each card already brought real state, version, account, `INSTALL`, `SIGN IN`, the key, the scopes and the mode ceiling.
- And since `⚑ CREW` ended up opening CONNECTIONS, it was a second button for a single thing: it's gone. A second button for the same thing is a question the human has to answer for no reason.
- The bridge keeps the only job only it can do: a room with nobody in it, where there's nothing else to show. What kept it stuck open over a room with a crew went away with it.

### Several conversations on the same project
- A project has one memory and many conversations. The archive, the crew, the modules and privacy belong to the project and don't start from zero because you open another thread; a conversation is just the record of one line of work, and everything said in any of them feeds the same archive.
- The panel is to the left of the canvas and it's the same panel as the files one, on the opposite edge: a single shape to learn. At the top, NEW CONVERSATION; below, the recent ones with the last thing said and when. Its handle lives on the canvas, under the bar, where the conversation it opens begins.
- Nothing moves on disk for this to exist: the first conversation is the `events.jsonl` that was always there, and a room that already existed opens as always and only gains a name. The name comes from the first thing you said in it.
- Numbering belongs to the project, not the thread. A new conversation starts where the project got to, so `#1411` still means an exchange of this project and citations, the memory index and NOSTROMO stay valid across conversations.
- Deleting one takes its transcript and nothing else: what the archivist distilled from it is project memory and stays. The last one can't be deleted, and deleting asks twice.
- One conversation at a time drives the crew: two threads editing the same working tree isn't a feature, it's a way to lose work. Opening another while a turn is running is refused with a reason.
- And one room per project, said by the room itself. The CLI's notice only looked at eight ports; a room open on a distant port slipped past it, and two servers on the same project would hand out the same sequence twice. Now the room keeps its pid and its port on disk, and the second start refuses, saying where the open one is —and that inside it you can open another conversation—.

### One sentence, one thing to do
- MU/TH/UR came to show six readings, three tests, a stage, the cold memories and the pending questions. All true and all measured, but nine numbers on a screen aren't a verdict: they're homework. At the very top there's now a sentence and an instruction, and the rest lives one fold away.
- The order of what's said isn't decided by the score, it's decided by what's best to do first: something false the room believes beats something the room hasn't learned yet, and both beat anything about size. And the instruction says where to go: today, in this room, it sends you to NOSTROMO · ASK because the archive doesn't answer 18 of 30 questions and the missing questions are already written.
- The test that costs nothing is no longer requested: it's read. The one that costs a few seconds keeps itself fresh once a day, in the background and only with local embeddings —the human's money isn't spent without asking—. The slow one is still yours, with its button and its STOP.

### Memory shows when it's used
- Under each reply appears what the archive handed to that turn: `◉ memory used · 4`, with the notes in their color and a click to see them in NOSTROMO. Until now remembering was completely invisible —a note went into the briefing and nobody ever saw it—, and it's the one thing the room does that really justifies everything else.
- It's the same shape as "memory saved", quieter, so there's one thing to learn and not two. What arrived by association says so with `⇢`: something that changes a reply can't be invisible.

### A busy port is reported immediately
- `madre start --port <busy>` took the whole startup —finding the agents, opening the archive, waking the memory— before finally refusing. Now it's asked first and answers instantly, with the same message as always. The real bind is still the authority; this only removes the wait.

### Maturity: the three tests
- The six-signal reading tells what the archive is made of. It doesn't say whether it works: nothing in a pile of notes says whether the right one comes back when needed. Only a test says that, and a test is only worth something if it can fail. In MU/TH/UR, under the verdict, there are three.
- **Can the archive answer what this project asks?** Real questions from the room, recall run at the exact point where each one was asked, against the answer that was really given. It asks whether the archive already had the material, not whether the answer was correct.
- **Does the archive contradict itself?** Contradictions EYECAT still holds, what was left out of circulation, and whether aberrations are being filed more often lately than before.
- **Does the local model land where the agents landed?** Real questions a frontier CLI answered, asked again to the local model with this archive behind it. It takes minutes, doesn't spend a peso, runs in the background and stops whenever you want.
- All three are measured against a control, and that was necessary: the first COVERAGE run gave thirty out of thirty. Inside a room everything talks about the same thing, so to an embedder any pair of texts looks close. To count, what the archive delivered has to beat what it would have delivered for another question. With the control, this room went from 100 % to 40 %, which is a number that does mean something.

### NOSTROMO: the room writes the questions it's missing
- The maturity reading said where the archive is thin; it didn't say what to do about it on a Tuesday afternoon. Now it does. `ASK · N` in the header opens a short list of questions written from what the archive already has, word for word, without inventing a topic nobody raised.
- Three wells, because there are three kinds of gap: the questions the archivist recorded as open and nobody touched again —the archive saying out loud what it doesn't know—; cold memories, where asking is the honest alternative to throwing away something that never had its chance; and the class of note the archive is short on, which no amount of use fixes on its own. More questions aren't requested: an archive short on questions wants answers.
- They're taken in turns, so a full well can't be the whole list: six variations of the same cold memory aren't a plan, they're a loop. And two ways of asking the same thing count as one —including the one the archivist writes on a second pass, identical but longer—.
- Nothing is sent or spent. Each question shows where it came from, a button that puts it in the composer so you choose who answers it (@madre costs nothing), another to see the memory that raised it, and one to not see it again.

### NOSTROMO: the archive's cold zones
- A memory is cold when three things hold at once: no turn has ever carried it, it shares no topic with any other, and the archive has been opened enough since it was written for it to have had its chances. The third is what makes the label honest: never-recalled is what every note is the day it's born. Cold is the chance that went by twelve times.
- Chances are counted in turns that really went into the archive —they're the only ones that existed— and only since the day the room started keeping track. What the room didn't record isn't charged to the note.
- In NOSTROMO's header `COLD · N` appears when there are any; pressing it surrounds each one with a faint ring of dust. The rest of the map doesn't dim: these are already the dimmest things out there, and turning everything else down to find them would be turning off the map to see it.
- When you open one, its card says so with a number —how many times the archive was opened without it being the answer— and the forget button is one click away. Nothing deletes itself.

### Memory: recall by spreading activation
- Recall searched by words and by meaning. Now also by what the room has done: each memory that goes into a turn leaves a record of the batch it shared, and two notes that arrive again and again in the same turn become associated even if they don't share a single word. Recall one, and the other comes.
- It's a real associative network, with its weights written by the room's real work and not by a model's opinion. The strength is a ratio —of the turns where either of the two appeared, how many brought them together—, so a memory the room uses all the time doesn't end up stuck to everything, and a pair that stops coinciding fades on its own.
- The rule that makes it honest: only turns where search found each note on its own merit count. A note that arrived by cascade is never the evidence for the next cascade. Without that, in a few days the network closes in on itself and feeds on itself.
- Association adds, never displaces: recall reserves two slots for it and gives back the ones it doesn't use, and it doesn't spend a character outside the turn's budget. What's false and what's refuted don't get in that way either: the door is the same on both paths.
- On the NOSTROMO card, company strong enough to travel on its own is marked with `⇢`. And in MU/TH/UR there's a switch, because it's the only part of recall that owes nothing to how a memory is written.

### NOSTROMO: open a memory and see who it talks to
- A memory's card —or an aberration's— is no longer a dead record. Under what it says it carries its links: the same cables the map draws, in a list ordered by strength, with each star's color and its percentage of shared meaning. Hovering over a row lights up that cable out there; clicking jumps to that memory, so the network can be walked.
- And it carries what has really happened between that memory and the room: how many times MADRE has gone to fetch it, when the last time was, which agents asked for it, and —the important part— which other memories it travels with. Two memories that arrive again and again in the same turn are in conversation, even if they look nothing alike; that wasn't known before because nobody wrote it down. Now each memory that goes into a turn leaves a row with the batch it shared.
- The reading stays live while the card is open: each room event pushes it and a slow heartbeat covers the silence, so you see the counter go up when a turn takes that memory. The star on the map brightens with it.
- In an aberration it's seen from the other side: which note it knocked down. And in a knocked-down note, which aberration keeps it out of circulation. Along the way something ugly got fixed: forgetting an aberration left its note marked by an id that no longer existed, that is, out of every turn forever and with no way back. Now it comes back.
- The old counters are real, but the company they had was never written down. The card says so in so many words instead of showing an empty list as if the memory had always traveled alone.

### MODULES: a single shape for every card, and a version that doesn't lie
- Each card now has the same tiers in the same order, whatever the module: who it is (name, state, version and update), what it does, what it touches, its settings, and at the end —alone and always in the same place— the button. Each tier has its own air and a line separating it from the next. The eye learns the shape once and finds the switch on every one.
- The tiers are part of the SDK, not of the drawing: a module declares and MADRE builds the card. Settings too, with `controls` —a selector, a switch, a field— that MADRE paints and saves in the module's block in `config.json`, and `onSettings` so something live finds out. With that PLAYWRIGHT lost its handmade route and any module you write gets its own settings section without writing a line of interface.
- The text was cramped on some cards and loose on others: the card was a grid that stretched, so the leftover height of the tallest one in the row was spread among its own rows. Now it stacks from the top and the leftover stays at the bottom, where it doesn't bother.
- The state label looked like a button. It's a word and a dot: `ON` or `OFF`. And a module that's off is dimmed entirely, except the button that turns it on.
- The button is on the card's floor, not where the text ended: cards in a row are the same height, so the buttons line up on the bottom edge. An install's log moved above the button, which is still the last thing.
- The bullets went to their own folded section, with their count and their open/close button, and were written shorter: one idea per line. The summaries went down to one sentence; what was left over from them went down to the bullets, which is where it's read.
- The version is no longer written by hand. Ash was entirely redone and still said 1.0.0 because the number lived in the file. A module that ships with MADRE has no version of its own: it travels in the release, and that's what it shows. An installer states the version of the package it pins. A module of yours keeps whatever it declares, and if it declares none, the card shows the day you wrote the file, which is the only truth there is on disk. On hover, each one says where it came from.
- The economy's numbers read overlapped with their labels: they were in the page's white, with the panel's glow on top, in a row that got squeezed. Now each figure and its name are a cell in a grid, in phosphor and with no glow.
- What a module knows about itself lives inside its card: the economy in Ash's, the local brain and its roles in OLLAMA's, the image model in Image Studio's, and PLAYWRIGHT's browser —which until now could only be changed by hand in `config.json`—.
- The OLLAMA card said "START it here" and "INSTALL it here" without having that button. Now it has it.
- Versions tell the truth and there are two kinds of module. The ones that ship with MADRE have their own, written in their file and starting at `1.0.0`; they can't update on their own, they arrive in a release, so their button asks about MADRE. The ones that wrap something from outside —PLAYWRIGHT, OLLAMA, AHP+— have no version of their own worth having: they show that thing's, found on this computer. What isn't installed isn't a version: the card says `NOT INSTALLED` or `INSTALLS 1.4.1` instead of inventing a number.
- Next to the version there's a `↻` button on each card. Opening MODULES reads what was already cached —it never waits on a registry—; the button is for looking now. And MADRE looks on its own: after serving the screen, at most once an hour, and each query with its own one-day cache. Only the name of what's being asked goes out, and only while the releases channel is on.
- In the SDK this is a single declaration: `tracks: { name, npm }` or `tracks: { name, github }`. With that MADRE knows where your module's version comes from and where to look for the next one.
- Really detecting brought out an old lie: PLAYWRIGHT said `@playwright/mcp 11.16.0 found` on a computer where that package was never installed. It asked `npx --no @playwright/mcp --version`, and npx, when the package doesn't exist, answers with npm's version and exits with code 0. Now the version is read from the package's `package.json` —going up through `node_modules` from the project and then in the global root—, without running anything. On this computer PLAYWRIGHT now says what it is: it's not installed, and the newest is 0.0.82.

### Privacy: two guards that don't need anyone to name them
- A key, a token or an email are recognized by their shape in any project, and the path to a personal folder carries the name of whoever lives in it. MADRE already knew how to cover them, but only when exporting the dataset: a key an agent repeated in a reply was written in clear in the log and stayed there. Now they're covered before the log, the archivist, the other agents and the dataset.
- Both come on. Nobody should have to find out they exist to be covered, and whoever wants a literal log turns them off.
- Two broken things on that screen were fixed: the private terms field never got a color, so what you typed there was invisible on the panel's background; and it fought the placeholder for a cell, three lines wide. Now it takes the full row.

### MU/TH/UR, more terminal
- The panel's green is the one from Terminal.app's Homebrew profile. The previous one was a yellowish green that read as a design decision, not as a terminal.
- The badges that repeated a number the header already said are gone. Two remain, and both say something the header doesn't: how many agents are unsigned, and which version is waiting. A mark that's always there stops being a mark.
- The fields for pasting a key, and OpenCode's provider selector, looked white and rounded among terminal controls. That form lives in two places, the bridge on a light background and the connection card on black, and it carried the page's palette to both. Inside the panel it now dresses like the panel. A `select` inside a card had also never been covered by the rule that draws the fields.
- On the connection cards, the chosen mode carries its own color, the same one the composer uses. Before it was phosphor for all except `#3`, so one card looked like a warning and the rest like settings, when all five are the same kind of decision.
- And the `MAX MODE` and `DEFAULT MODE` rows start at the same point. Each one started where its own words ended, which is why the cards didn't line up with each other.


### Maturity: six readings instead of an invented bar
- The bar that filled toward three hundred is gone. That number was a rule of thumb from someone else's paper, not a measurement of your room, and a corpus of three hundred pairs all talking about the same afternoon teaches less than eighty that don't. Worse: you reached the number and the bar said you were ready.
- In its place there are six readings of what can actually be counted in this archive: how much there is, how much of it the room really uses, how woven together it is, how much of it you rated, how much is real work and not recall questions, and how up to date the distillation is. Each one says in numbers where it stands and, on hover, what it would take to raise it.
- Below, the weakest is marked and becomes the next step, with a sentence about what to do instead of a number to wait for. In this room today it's the ratings: a couple out of one hundred thirty-nine.
- An empty room reads empty. Before, a freshly opened one already showed progress because the balance came out perfect when there was nothing to balance.

### NOSTROMO has a sky
- Behind the core, the dwarfs and the network there's now a nebula, and it's the archive itself seen from so far away that it becomes weather. Young, it's an electrical storm: scattered, cold, flickering, with frequent lightning. As the room grows it settles, gathers into a band and the lightning becomes rare and slow. What changes with maturity is the weather, not the volume: a grown room thunders less, not louder.
- Its only rule is that it's never the subject. It's painted before everything else, in colors nothing in the foreground uses, and with an opacity ceiling written in the code that no degree of maturity can lift. It's noticed only if you look for it; if it ever competes with the core, the dwarfs or the cables between them, it's wrong no matter how pretty it looks.


### MU/TH/UR folds
- Everything that runs long in the panel folds: `CONNECTIONS`, `ROOM SETTINGS`, `MEMORY`, `PRIVACY`, `SENTINEL` and the release channel, all the same way.
- Each foldable section carries its own button that says what will happen when you touch it: `▸ EXPAND` or `▾ COLLAPSE`. The panel already had that button on two lists from before; now they all fold the same way and look the same, instead of some having a button and others a sign.
- The two lists that already folded, recorded conditions and known conditions, stopped building their own header and moved to the same helper. Whatever you had saved from before is respected: it's read once as the initial state and from then on the fold remembers it, without two places remembering the same thing.
- An `EXPAND ALL` button in the header opens or closes the whole panel. It says what it will do, not what the panel is: while anything is closed it opens everything, and when everything is open it becomes `COLLAPSE ALL`. It doesn't appear unless there are at least two sections to move.
- The training commands couldn't be seen. They were drawn with the page's text color, and on the panel's background that's almost invisible; now they're in phosphor like everything else there.
- The steps were numbered by the browser at the panel's size, and they shouted. Now they're a discreet index in the margin, and the closing note stopped counting as a step.
- The first two sections to fold were `CONNECTIONS` and the release channel. The heading is the same as always and you click on it; what it opens goes inside.
- The release channel doesn't announce anything in its title. When there's a new version it carries a red mark and nothing more, and what it means is inside. Marks that aren't urgent aren't red, so red keeps meaning something: `CONNECTIONS` carries a gray count when some agent isn't signed in.
- If you left a section open, it stays open next time. A panel that forgets is one you fight every time you open it. A browser that doesn't allow saving anything simply opens collapsed, without breaking.
- The release channel's checkbox was a few pixels inward from the paragraph above, due to a browser margin of its own, so the column didn't read straight. It lines up now.


### The turn says what it's spending while it spends it
- While an agent works, the "thinking" row shows what that turn is reading. The size is exact, because the prompt is already built when it's announced; the only estimate is the conversion to tokens, and it's done at the rate this same room's turns have shown. A room that has never been billed doesn't invent a rate: it shows characters and says it doesn't yet have anything to convert them with.
- Each bill teaches the room what its own words cost, so the rate adjusts on its own, with the last twenty bills and not the whole history: a room that changed models shouldn't keep being priced for what it used to be.
- And the count goes up while the agent writes. What's counted is the reply itself, not the protocol around it: counting the raw output would be counting the shape of each CLI's format, which in Codex weighs several times more than the text. A CLI that says nothing until it finishes shows nothing there, which is the truth and not a number invented so something moves.
- When the agent replies, the estimate is replaced by what its CLI really charged, and that figure stays above the bubble, on a single line and without a pill, with what was read, what was written and what was saved by coming from the cache. That way what the room calculated can be compared against what happened.
- The live reading isn't written to the log. It's a meter, not a fact of the room: saving it would spend a sequence number on something nobody is going to remember and would shift everything said afterward. It goes to whoever is watching and nowhere else.

### Ash: the compressor retires and the economy remains
- AshCode rewrote your message before sending it. It's retired: it altered the one thing nobody asked it to touch, it lost information, and measured against a real turn it saved a fifth of one percent. It no longer exists. Nothing you write is altered, nor what an agent replies, so there's also no "original" kept next to an abbreviation.
- Ash is now the name of the room's token economy. Almost all of it is always on and goes unnoticed, because none of it loses information. The only thing left to decide is what changes how an agent replies, not what it's asked: whether to ask it for compact prose. Output is the expensive half of a bill, so that's the switch worth having, and it's yours.
- The switch stopped being beta and stopped asking for confirmation: there's nothing left that can change meaning.
- ORDER 937 is freed up. It no longer belongs to Ash and doesn't appear on its button, its label or its notice; it's reserved for something else.
- The reading lives on Ash's card, in `⚙ CONNECTIONS` → `MODULES`, which is where one looks for it. The first thing it says is **TOKENS SAVED**: what the CLI recovered from its own cache instead of charging again, plus what the room never sent because the turn didn't need it. The first is a measurement, the CLI itself reports it; the second is counted in characters, which is the unit the room controls, and converted to tokens at the rate this room's turns have shown, not an invented one. Below, what was spent on input and output, what part of each prompt is the head a cache can recognize, and a bar per briefing block.

### Token savings measured, not assumed
- MADRE reasoned about cost in characters, and a shorter string isn't fewer tokens. The CLIs had been reporting what they really spend all along, cache reads included, so the room stopped guessing. Each turn outside GHOST records what it was made of against what was charged: the size of each block, the fixed part that's always paid, what that turn's shape loaded, and the input, cache and output tokens. The words are never written, only how many there were.
- The prompt is built from named blocks. Introducing them didn't move a single byte: seven turn shapes were frozen as a fixture and compared exactly, because any change to a prompt's economy has to prove it didn't change anything the agent reads.
- What never changes goes first. Each prompt's header is now the part that reads the same on every turn of that agent in that room, and everything that can vary went behind it, however short: one different byte early on throws away everything after it. Between a `#1` turn and a `#2` turn of the same agent there are now 1,690 identical characters at the start versus about 120 before, which is what the CLI can recover from its own cache instead of being charged again.
- The block that explains how to write a module stopped traveling on every turn with write permission. It's long and only useful when someone is asking for a module, so now it's sent when the message mentions it, in Spanish or in English. A `#2` turn that wasn't about modules dropped 11%.
- The transcript stopped sliding and became anchored. A sliding window starts one message later on each turn, so what the agent reads starts with different words every time and none of it can be recovered from what the previous turn read. Anchored, everything but the tail is the same bytes as before, which is the difference between paying for it once and paying for it always. It only moves when what's been said since no longer fits, and when it moves it drops a good stretch at once so it doesn't have to move again on the next turn. In a forty-turn replay of this room, the start of the transcript moved once instead of five times.
- `GET /api/economy` reads all turns together: which block costs the most, what each agent spends, how much came back from cache, how much of the prompt was recoverable, and how many characters the room sends per token it's charged.


### The composer and the bar, calmer
- @-mentioning an agent no longer puts it in a pill. A mention is a word in the sentence you're writing, not a field to fill: it keeps the agent's color and loses the box, which broke the rhythm when rereading the line.
- What you're replying to lives inside the text box, on its own line above the line where you write, in a faint badge: two points smaller than what you type, trimmed to two lines and a hundred and twenty characters. It came out of the textarea, where everything shares a single size and it could only look like something you had written.
- And the box grows to hold it. The quote takes a whole line, so the box lengthens exactly as much as it measures and leaves you a couple of lines to reply calmly, instead of a single cramped one. It can be removed with an X without losing what you've written, and it still goes out at the front of the message, because the agent needs to see what you're replying to.
- In light mode the top bar's buttons barely glow. A halo that reads as light on a dark background reads as a smudge on a pale one; the border and the color already say the button is alive.


### EYECAT: the lookout that asks whether the room still believes what it wrote
- It's not a module or part of the room. It watches from outside, just like the error sentinel: it subscribes to the log, takes no turn, writes no files and has no permissions. What it produces is a question for you, never an entry in the archive.
- Independence is the whole design. A claim is never judged by whoever wrote it, nor by whoever wrote what it clashes with. The judge is given the two sentences and nothing else: no transcript, no project history and no names, so it can't be told whom to believe and can't be argued with. If the only ones free are the two authors, the case waits instead of going to someone with a stake in the answer.
- Two stages, so asking comes cheap. First a deterministic filter on the links the constellation already computes: a link says two notes talk about the same thing, and EYECAT asks the next question, whether they also contradict each other. Only those that give a cheap signal that they might not agree get through: an extra negation, an inverted order, a different number, a different path. It works in Spanish and in English.
- The second detector looks for notes their own citations don't support. If almost nothing that makes a note distinctive appears in the exchanges it claims to have read, it was either made up or distilled from somewhere else.
- It runs between turns, when the archive has just changed, and responds to nothing else: nothing an agent says reaches it. At most three cases per sweep, so a large archive doesn't run up a bill.
- Each finding arrives as a card in the room with the claim in doubt, what it clashes with, what seems to be true and who judged it. Two answers: IT IS FALSE files it as an aberration and takes the memory it refutes out of circulation; IT HOLDS says the room was right. Either one closes that pair forever, and the log remembers it across restarts.
- A malformed verdict, or one with less than half confidence, isn't a finding: the case stays pending for you instead of spending your attention.
- `PULSE_EYECAT=0` turns it off.

### ABERRATION: what the room established is false
- A fifth kind of memory, and the only one that isn't knowledge: hallucinations, unfounded claims, distortions, refutations and memories that drifted from what the project had agreed. It's kept because it's worth training against, and it's kept out of every turn because a room that remembers its own hallucinations repeats them.
- An aberration can point to the note it refutes. When it does, that note stops circulating: what it said isn't rewritten, it's denied passage. It's reversible, which an edit wouldn't be, and unmarking it brings it back intact.
- Two doors to the turn, two locks. Neither an aberration nor a refuted note gets in through word search, meaning search, or the fallback that delivers recent decisions when a search finds little.
- The distiller learned to recognize them, but only when the conversation itself refuted something out loud: someone claimed and someone corrected. Never on suspicion, never over a disagreement of opinion, never for something simply unverified. The aberration carries the false claim and, separately, what turned out to be true.
- A type nobody recognizes is no longer filed as a fact, it's discarded. That was harmless while all types were knowledge; with one on the list that isn't, a typo in any direction would slip a hallucination into where the room trusts.
- Aberrations can no longer train the local model as something to remember. They train the other way: each one comes out as a preference pair, with the same question, the false claim as what to avoid and the correction as what to say. A negative alone teaches little; a pair says which of two answers to prefer, which is what DPO and ORPO read. It goes in `preferences.jsonl`, separately, so nothing that reads the chat files picks it up by accident.
- The ready counter doesn't count them either: they'll never be an answer the model learns to give, and counting them would say the room is further along than it is.
- In NOSTROMO an aberration isn't a dwarf or a furnace. It's a void: a round black from edge to edge, and nothing burns there. What you see around it is the field it's standing in, specks of dust and distant stars spread at the golden angle so no rows form, each one flickering at its own pace and fading outward, and stuck to the edge the light that passed close enough to bend instead of going straight. The bulk of the thing is the darkness, and the darkness is the point.
- Preferences stopped being red dwarfs and became green dwarfs. Same shape and same treatment, another color: in red they competed with the sun they orbit.


### NOSTROMO: the room looks alive
- MADRE's core is a star: large, dark and imposing. It lights itself, so it has no day side or night side, and it isn't lit wide open: it burns deep and fades almost completely at the edge. What makes it fearsome isn't how much it shines but how much of it is nearly out.
- Its surface is molten rock moving slowly. The skin is built a single time as a strip of boiling cells and wrapped around the body; a second pass of the same strip runs at another pace, and that disagreement between the two is what reads as flow. On top, masses of molten matter cross the face along with the lava, each with its own drift.
- There's no halo anymore. A soft cloud around a star makes it look smaller, not bigger. What surrounds it is darkness, with a single skin of fierce light clinging to the limb that fades within a fraction of a radius, and beyond that a red smudge so faint it reads as lit darkness.
- Four prominences, large and slow: arcs of matter torn from the limb that rise and fall back. A star this size doesn't flicker, it rises.
- The dark filament that crossed the face is gone. A line drawn on a ball reads as a line drawn on a disc, however much it curves.

- The memories the room uses receive more pulses. Activity is really measured: how many times that memory was retrieved in a turn, how long ago the last time was, and how many topics it shares with others. A memory nobody asks for barely lights up.
- The constellation is read against itself: the most active memory is the brightest and the rest are scaled below it. A freshly opened room, where nothing has been retrieved yet, holds up on the links it has already woven; as soon as turns start asking for memories, usage rules.
- There are also pulses between linked memories, without going through the center: two notes that share a topic talk directly. What you see is the network the room has been weaving, not a fan of spokes.
- The dots that travel along the cables, from the core to a memory and between memories, are drawn 30% smaller. A pulse is something that passes between two bodies, not a body: at its former size it read as another small star and competed with the memories it was heading to. Its halo shrinks with it.
- Memories are drawn 20% smaller. They become moons around MADRE's body instead of competing with it, and since the spacing between them didn't shrink, the constellation opens up more air.
- Memories burn the way stars burn, and a star's color is its class. A decision is a yellow dwarf, the stable class a system is built around. A fact is a white dwarf: cold, dense, already settled. A preference is a red dwarf, faint and personal and extremely long-lived. A question is a blue dwarf, the hottest thing in the sky and the least resolved.
- Each dwarf lights itself, so nothing of it is in shadow. It's lit from edge to edge, its whole face boils, its limb is the brightest thing it has instead of the darkest, and the light that escapes it stays stuck to it in a glow a finger wide. There's no side turned away from anything, because nothing else is lighting it: the body's floor is traced from its own center, not from a corner.
- Each dwarf has the boiling surface of a real star, in its class's color. One strip per class is built the first time that class is requested, and all the memories of that class use it: an archive of four hundred memories pays for four skins, not four hundred.
- The halos that hung from each memory are gone. A cloud stuck to a star turns it into a smudge with a bead in the middle; the light that escapes a dwarf clings to its limb, and that's where it's drawn.
- How brightly a dwarf burns is decided by two things. Maturity is what the room has made of it over time: how many times it has looked for it, how long ago, how woven it is. Feeding is what it's being given right now, by MADRE and its neighbors at once. A young memory nobody feeds is almost out; an old one the room leans on runs white.
- Nothing is drawn around a memory. An outline, however thin, is the one thing that keeps a ball from reading as a ball, and the ring that came out when a pulse reached it was also an outline. That a pulse arrived is said by the body brightening, which it already did.
- The specks that broke off each dwarf are gone.
- NOSTROMO's legend shows the star, not a color swatch. Each chip carries a dwarf drawn with the same floor, the same boiling face and the same limb as the ones in the constellation, and next to it only the type of memory: the star already says what class it is, writing it too would say it twice. The class name is on hover. No pill enclosing them, and with the header's typeface.
- Each star's intensity says how well fed it is. Each memory carries a charge that goes up with every pulse that reaches it, from the core or from its neighbors, and goes down slowly when nobody feeds it. A starving memory is a cold body that only catches MADRE's light; a well-fed one burns on its own and no longer needs it to be seen. Its halo grows, its center runs toward white and its own night burns away on top of it.
- Links are live cable. The one leaving the core carries MADRE's red and changes hands until it arrives dressed in the color of the star it feeds. The one between two memories takes the color of whichever is closer, so it leaves as one star and arrives as the other.
- And along each cable runs a narrow band of white heat that travels from one end to the other and starts again, faster and brighter the more charge that link carries. Between two memories the current runs the way it really runs: out of the fuller one and into the emptier one.

- And each one breathes at its own pace: a micro pulsation, small enough never to read as a flash and never in step with its neighbors.
- Each memory's card says how many times it has been retrieved and when the last time was, and the header counts how many are alive.
- Same image, less machine: the view stopped recomputing the constellation on every frame and asking the browser for blurs. An archive with four hundred memories costs the same blurs as one with twelve, and it's ten per frame instead of ninety.
- With reduced motion the halo stays still: the drops stop rising and drifting, and the room keeps drawing in full.

### The bridge: full setup without a terminal
- The parts that assumed a Unix-like system stopped assuming it: detection recognizes Windows executable extensions, installers are launched with the right interpreter and restart uses each system's own.
- The local agent is also handled from the bridge. Ollama isn't an npm package, so the card offers the step that applies for the system, with the command in view: install it, wake it, or download the model it will answer with. Where MADRE has no honest way to install it, it hands over the download instead of inventing a command. It's the only path with no account and no card, and the one that turns on local memory.
- If `npm install -g` collides with the system folders, MADRE doesn't ask for a password: it says so, installs into a folder of its own (`~/.pulse/tools`) and looks there as well as in the `PATH`. The final notice says where it ended up.
- Gemini and OpenCode, which sign in from their own prompt, now accept their key in the bridge and in `⚙ CONNECTIONS`. MADRE writes it where that CLI looks for it, with the file locked to its owner, and keeps no copy: not in `config.json`, not in the room's log, not in a log file. The only thing the room remembers is that a key was set and for which provider. It's only accepted from this computer, never over the network.
- Each write is verified on the spot by asking the CLI itself whether it's signed in now; if it says no, MADRE puts the files back as they were and explains it, instead of leaving a half-written credential.
- Each card says what's behind that door: which account that agent signs in with and whether there's an unpaid way in, with a `FREE WAY IN` mark where there is one. The same line appears in `⚙ CONNECTIONS`.
- The bridge can be reopened at any time from `⚑ CREW`, in MU/TH/UR's header, to add another agent without leaving the room.
- Running the command again on a project that already has an open room stops starting a second one: MADRE recognizes the one already listening and takes you to it.
- The empty room stops being a blank page: three first sentences, written with the project's name, that fill the text field when tapped.
- `madre start` no longer hijacks startup: the room always opens, with agents or without them, and the terminal wizard is there for whoever asks for it (`madre setup`, or `madre start --setup`).
- With nobody online, the room opens on the BRIDGE: one card per agent with its real state and the only action that applies to it. `INSTALL` runs the command on your machine, in view and streamed line by line to that same card; `SIGN IN` launches the CLI's own login for Codex and Claude Code, with its link; Gemini and OpenCode show the command for their prompt. The same buttons now live in `⚙ CONNECTIONS`.
- The room looks for the binaries again when an install finishes and when you press `RECHECK`: a CLI installed from the UX appears in the row without restarting, and open pages find out with `agents.updated`. The composer unlocks on its own as soon as an agent is ready.

### First contact and the door to develop
- The room builds itself: at `#2` or above, an agent that writes `<id>.module.mjs` in its draft makes a card appear `module · @codex wrote …` with `INSTALL FOR EVERY ROOM` and `INSTALL FOR THIS PROJECT`. MADRE validates the file in a copy and copies it to the chosen folder; agents never write there. Your own modules carry the `DEV` label and are removed with `REMOVE`; built-in ones are only turned off. External module routes only under `/api/x/<id>/`, so none can impersonate a core route.
- A four-step tour the first time the room is opened: the room and its agents, the modes, the memory, MU/TH/UR and MODULES. It can be skipped and comes back from a discreet `?` in MU/TH/UR's header.
- Real third-party modules: a `.mjs` file with `export default { … }` in `~/.pulse/modules/` (every room) or in `<project>/.madre/modules/` (that project) appears in MODULES with its switch, with no build or registry; `RELOAD MODULES` reloads it without restarting and shows the exact error if it doesn't load. Agents can't write to those folders. The SDK gains `slash` (`/name` commands that run with the module's `ctx` and land in the room as a card), `@jossuealcala/madre/sdk` as a package export, the guide `docs/SDK.md` and `docs/sdk/hello-module.mjs`, a complete module to copy or hand to an AI.
- MODULES has the `</>` card "Would you like to develop for MADRE?" with the folders, the guide and RELOAD.

## 0.3.3 · 2026-09-19

### The SDK hands tools to turns, and PLAYWRIGHT is the first to use it
- `defineModule` accepts `toolsForTurn(ctx, turn)`: a module that's on returns MCP servers (`name, command, args, env, tools, brief`) and MADRE attaches them to that turn's CLI, in its isolated run, in Codex, Claude Code, Gemini CLI and OpenCode, and describes them to the agent in the briefing. A module that fails delivers nothing and never breaks the turn. Image Studio and memory keep their own wiring; new modules are born on the hook.
- **PLAYWRIGHT** module: a headless browser per turn, isolated `@playwright/mcp`, with allowed origins only at this MADRE's address. Agents open RIPLEY's preview, click, read console and network and save screenshots in the turn's draft folder. Requires `npm install -g @playwright/mcp` and a Playwright browser; the module detects it and says so. Off in GHOST.
- Git Pulse gains the human's hand: `/git commit "message"` commits the whole tree locally, and `/git push` shows what would go out and only sends with `/git push confirm`. No agent can type those commands for you; the commands run on the server with your own git session.

### #4 AIRLOCK: the airlock
- A fourth mode, requested from a real room by an agent that couldn't deploy at `#2`. AIRLOCK is CONTROL plus commands: tests, builds, `git commit` and `git push`, deploys with the CLIs and the sessions already living on the machine. Files stay under checkpoint and `UNDO`; what leaves the ship doesn't come back, and that's why the override asks for two keys: the project designation and the word `AIRLOCK`. One holder at a time, like CONTROL.
- Each CLI gets its commands tool only at `#4`: Codex `--sandbox danger-full-access`, Claude Code `Bash`, Gemini `run_shell_command`, OpenCode `bash`. Forbidden zones stay blocked. The briefing requires saying in one line what's going to go out and where before it goes out, and closing with the commands run and what left the machine.
- `MAX MODE` reaches `#4` in CONNECTIONS; an orchestrator at `#4` can give `#4` to a step (`@opencode #4: despliega a preview`). Its own color, ice, in chip, field, menu and badges. MU/TH/UR recognizes "production mode" and "permission to run commands" as requests for `#4`.

### Release channel, one click
- `RESTART WITH x.y.z` in MU/TH/UR: the room records `room.updating`, closes its port, installs the version according to how this copy runs (npx, project dependency or global) and reopens at the same address; the page waits and reloads on its own. With agents working it refuses until they finish. From source code it's still `git pull`.
- The first time a new version appears in the session, a MU/TH/UR notice says so; the bar's alert stops glowing and breathing: thin amber line, soft fill, 220 ms transitions. All of MADRE's controls change color with the same curve; nothing jumps.

## 0.3.2 · 2026-09-19

### Modes and permissions, a single logic
- `#2 CREATE` no longer locks the agent into `.pulse/out/`: it creates new files and folders where they belong in the project, following its conventions, with `.pulse/out/<turn>/` as a draft. MADRE snapshots the project before the turn; whatever appeared is kept and shown as an artifact, and any pre-existing file that was modified, renamed or deleted is restored and flagged (`create.reverted`). The CLIs get their write tools over the project (Claude Code and OpenCode only write if they can also edit, verified with the real CLIs); the "add only" guarantee is given by MADRE's restoration at the end.
- An orchestrator can request the mode of each step of its plan: `@codex #2: …`, `@claude #3: …`. MADRE bounds it by the mode of the human's message and the agent's `MAX MODE`. Under `#3` the orchestrator's word is enough: a `#2` step receives its project lease and a `#3` step takes CONTROL for its turn, with its own checkpoint. Under `#1` a `#2` step still goes through escalation.
- CONNECTIONS is reduced to two controls per agent, `MAX MODE` and `DEFAULT MODE` (`#1` or `#2`), plus two abilities, images and web. The `CREATE FILES` and `ALWAYS · STANDING LEASE` switches disappear; old configurations (`write: false`, `alwaysCreate`) are still read as `MAX MODE #1` and `DEFAULT MODE #2`.
- Checkpoints work in projects without git: MADRE uses its own shadow repository outside the project, so `#2` and `#3` have the same reversibility in any folder.

### Permissions that are actually enforced
- OpenCode had never been able to write in CREATE or CONTROL: its permission rules are matched against paths relative to the project, not absolute ones, and creating a file is the `write` tool, separate from `edit`. Verified against opencode 1.18.4 with real projects, with and without spaces in the path. Now CREATE allows `write` and `edit` only inside the turn's folder, and CONTROL allows the whole project except `.git/`, `.pulse/`, `.madre/`, `.env` files and `.claude/settings.local.json`.
- The CONTROL checkpoint also snapshots git repositories nested inside the project (a monorepo of sites, each with its own `.git`): before, a change inside one of them was invisible, the room said "nothing changed" and UNDO didn't undo it. Now the change list, the forbidden zones and UNDO cover each repository, with paths relative to the project. The snapshot is taken with `ls-files` and not with `add`, so a nested repo without commits no longer breaks it.


## 0.3.1 · 2026-09-19

### Release channel: the room tells you when there's a new version
- MADRE checks npm for the `latest` version once a day (`~/.pulse/updates.json` as cache, shared by all rooms). Only the package name travels, the same request `npx` makes. On by default; turned off in MU/TH/UR → RELEASE CHANNEL or with `PULSE_UPDATE_CHECK=0`.
- If there's a new version, an amber alert in the bar, cut like STOP ALL, says so and MU/TH/UR shows the exact command according to how this copy runs (npx, project dependency, global or source), with a copy button and a link to what the release brings. MADRE never updates itself while you work. `madre doctor` prints the same line. 0.3.0 users get no notice: the channel is born here.

### Documentation
- README rewritten and reordered: getting started, the room, modes, what each agent can do, delegation, memory, MADRE AI, MU/TH/UR, modules, what leaves the machine and reference. It corrects what didn't match: five agents, images with all four CLIs (Codex native, the others with Image Studio), current version. The technical depth moves to `docs/INTERNALS.md`, which also travels in the package.

### Console
- Picking a condition from the log expands the list of known conditions even if it was collapsed, and takes you to the chosen remedy.
- MU/TH/UR breathes: each block on a screen (CONNECTIONS, MEMORY, PRIVACY, SENTINEL, RELEASE CHANNEL) starts with 40 px of air and a faint line above its title.
- The bar is wider than the thread: the project root reads in full next to MADRE, STOP ALL fits on one line. In MU/TH/UR the list of known conditions collapses like the recorded conditions one, and RELEASE CHANNEL dresses like the rest of the panel.

### Clean dataset and ratings (toward MADRE AI)
- The dataset no longer includes `@madre`'s replies or MADRE's canned ones, and it does include agent→agent delegated steps with their instruction as the question (`kind: delegated`). In a real room the corpus went from 88 to 118 pairs without writing one more line.
- Each reply has two new buttons next to copy and reply: good and bad. They're saved in the ledger as `message.rated`; the dataset excludes what's marked bad and counts what's marked good. One click takes a hallucination out of the corpus.
- MEMORY shows the live counter "clean pairs / 300", with turns, delegated steps, notes and ratings, without exporting anything; and a TRAIN card with the recipe's four commands already filled in with the room's folder, the base model that fits on this machine and the name `madre-<project>` that `@madre` will take when it appears in Ollama. `docs/training/` now travels in the npm package.
- When `@madre` runs the project's trained model, the CLIs' briefing says so and asks them to ask it before spending their own tokens on "what did we decide" or "where did we leave off".

### PRIVACY: terms that never travel through the room (ERROR-001)
- A CLI runs with its own private context (organization instructions, the account it's signed in with, CLAUDE.md from other folders) and can mistake it for shared context: in a real room Claude wrote the name of the human's organization, which had never been said in the room, and from there it went to the ledger, the archivist and the candidate dataset. Four hops without control.
- New section `⚙ CONNECTIONS → PRIVACY`: private terms, one per line, and the placeholder that replaces them (`[ENTIDAD-ORG]` by default). MADRE replaces them at every hop: in an agent's reply before recording it (the bubble carries a line "privacy · @agent · n terms"), in the index, in the archivist's and `memory_note`'s notes, and in the exported dataset. The human isn't rewritten; the room only warns if their message carries a term. The terms live in `config.json` and in `PULSE_PRIVATE_TERMS`; the ledger only records how many.
- `PURGE ROOM`, after the project designation, rewrites what the room already has, including the human's messages: ledger (same sequences, in place and atomic), index and memories, keeping what was distilled. The section shows how much remains exposed before and after.
- Every CLI's briefing says its configuration is private and that it shouldn't bring anything from there into the room. MU/TH/UR has the `privacy-leak` condition.

### @madre knows who it is and convenes the crew
- Round table: "@madre, ask the crew …" or "convene the crew and …" opens a plan written by the room, not by the model: one step per CLI agent online with the human's question and a closing turn in which `@madre` summarizes with `[#n]` citations without inventing consensus. Only the human convenes; with delegation off `@madre` explains how to ask for it.
- Local answers without a model: "who are you / what do you do / are you the archivist?" explains that `@madre` and the archivist are the same local model in two roles and how it's taught; "generate / save / learn … memory" explains that memory distills itself and, if the one asking is an agent, sends it to `memory_note`; an agent's action orders get an answer for agents. Questions and closing turns always reach the model.
- `@madre`'s canned answers are marked `synthetic`: they don't go into the archive or the transcript `@madre` rereads, so a small model no longer repeats them as if they were its own. The CLIs do see them.
- The CLIs' briefing says explicitly that saving is their own `memory_note` and that `@madre` is only asked. The `TO @madre` chip now says "memory · answers & asks the crew · never writes".

## 0.3.0 · 2026-09-18

### Ollama, the local intelligence (roadmap 2a)
- New `OLLAMA` module: if Ollama runs on the machine, memory embeddings are computed locally and distillation is done first by a local model, free and without anything going out. MODULES shows server, models and roles, downloads the recommended ones with `PULL` (progress in the room) and lets you turn off each role or the module. Without Ollama, everything stays the same.
- The local archivist requests structured JSON and doesn't count against any provider budget; the `memory.distilled` report says `local`, model and tokens.
- Variables: `PULSE_EMBED_PROVIDER`, `PULSE_OLLAMA_HOST`, `PULSE_OLLAMA_MODEL`, `PULSE_OLLAMA_EMBED_MODEL`.

### CONTROL: prevention before restoration
- While an agent has CONTROL, `.env` files, `.pulse/`, `.madre/` and `.claude/settings.local.json` are read-only at the file system level and get their permissions back when done; the notice lists what was blocked. `.git/` is still restored from the checkpoint after the turn.

### Core
- `src/room.mjs` goes from 1204 to 908 lines: prompt, context, CONTROL, escalation, archivist, vectors, budget, GHOST and attachments now live in `src/room/`, each with one responsibility. Same behavior, same suite.

### Dataset and project model (roadmap 2c)
- `EXPORT DATASET` in MEMORY and `madre dataset` in the terminal write `train.jsonl` / `valid.jsonl` next to the ledger: the room's real turns as redacted chat pairs, plus the distilled notes as recall pairs. `docs/training/` brings the LoRA recipe with mlx-lm, the `Modelfile` and `train.sh`. A model registered in Ollama as `madre-<project>` is picked up by `@madre` automatically.

### @madre, the fifth agent (roadmap 2b)
- With Ollama and a chat model, `@madre` enters the room: it answers from the whole archive with `[#n]` citations, says when something was never discussed, never writes or delegates, and its local tokens don't count. Orchestrators can delegate verification steps to it. It comes and goes with Ollama (`agents.updated`); switch in MODULES → OLLAMA.
- The terminal wizard and `madre doctor` show Ollama next to the CLIs (server, chat model, embeddings) and count `@madre` as an online agent: with Ollama running the room opens even if no CLI has a session, with the notice to connect one to work on files.
- `@madre` no longer gets confused about its identity or promises what it doesn't do: the identity is repeated at the end of the briefing, each call to Ollama asks for an 8k-token window (the default 4k one trimmed the system prompt), action orders (convene, delegate, run, write) are answered without calling the model by pointing to the CLI agents, and the `TO @madre` chip says "memory · answers, does not act". General chat models (`qwen2.5`, `llama3.1`, `gemma3`) go before the `-coder` ones.
- README: six modules with OLLAMA and the SDK linked to CONTRIBUTING, absolute links so npm resolves them, the real state of the Claude adapter (memory MCP), and a "First five minutes" block with the full walkthrough from `npx` to connecting the AIs from MU/TH/UR without going back to the terminal.

### Module SDK
- `src/modules/sdk.mjs` with `defineModule`: a module is a file with its settings in `config.json`, its description for MODULES, its switch, its routes and its hooks. The six modules (AHP+, Image Studio, Git Pulse, AshCode, RIPLEY, Ollama) live in `src/modules/`; `extensions.mjs` stays as a compatibility layer and the server mounts module routes generically.

### Memory configurable from MU/TH/UR
- `MEMORY` section in CONNECTIONS: preferred archivist, who can distill, every how many exchanges or minutes of idle, embeddings provider and recall percentage. It's saved in `config.json` and applied live.

## 0.2.3 · 2026-09-18

### RIPLEY browses
- The viewer renders HTML like a project browser: the page is served at `/preview/project/<path>`, its scripts run and its relative paths to CSS, JS, images and fonts work. The frame stays sealed: no origin of its own, no network, no forms, no access to MADRE, and it only loads project resources through MADRE. Before, scripts were blocked and a page built with JavaScript looked empty.
- Minimal bar in the viewer: back and reload, with the page's path and title on screen. No editable URL: RIPLEY is a project viewer, not a general browser.
- It reloads on its own when an agent changes the open page or something in its folder, in CONTROL or in a lease.
- The page's errors are visible: a one-line bridge inside the frame forwards `window.onerror`, rejected promises and resources that don't load; the viewer shows them in a strip with `ASK THE ROOM`, which leaves the error and the file in the composer.

## 0.2.2 · 2026-09-18

### Critical fix
- Claude Code denied every write in `#2 CREATE` and `#3 CONTROL`: the `Write(/path/**)` rules were read as relative to the project. Now they go as `//path/**`, Claude Code's absolute form; forbidden zones stay blocked before the turn.

Reproduced with the real CLI in a temporary repository: with one slash the file was blocked without asking; with two it's written and `.env` stays blocked. No other changes from 0.2.1.

## 0.2.1 · 2026-09-18 · public beta

First version meant for other people's hands. Requires Node 22.5 or higher.

### Monitoring
- Error sentinel in MU/TH/UR: failures no known condition explains and process crashes are saved as redacted reports (no paths, names, emails or keys), with a prefilled `REPORT ON GITHUB ↗` and the `✎ FEEDBACK` button. With the author's collector configured by default, each report has `SEND` and there's `AUTO-REPORT`, off until the human turns it on. `docs/report-collector/` brings the Worker that turns reports into issues.

### Room
- Copy and reply at the end of each reply: the first takes the text to the clipboard; the second chooses which agent replies and leaves the quote at the front of the composer for the human's directive.
- Light mode without glare: the UX keeps its colors and loses the tube glow; MU/TH/UR and NOSTROMO keep their screens.
- An archivist that fails sits out half an hour and another agent takes the next batch; the failure line says a single sentence and keeps the full log in the tooltip.
- MADRE doesn't repeat the same set of phrases twice in a row when its heart is touched.

### Truth and safety
- The startup sentence no longer says nothing leaves the machine: the agents talk to their providers. The README explains the threat model in short, including CONTROL's debt with Codex (forbidden zones reverted after the turn).
- The escalation clock keeps the process alive while a plan waits for the human; shutdown resolves pending requests. On Node 22 this cut the suite in half.

### Project
- CI on GitHub Actions: Ubuntu and macOS, Node 22 and 24, with tests, packaging and tarball installation.
- Issue templates, `SECURITY.md` and `CONTRIBUTING.md`.

## 0.2.0 · 2026-09-17

Requires Node 22.5 or higher (previously 20): the room's memory runs on `node:sqlite`.

### Permission modes
- Four modes per message: `#0 GHOST` (off the record), `#1 EXCHANGE` (default), `#2 CREATE` (lease in `.pulse/out/`) and `#3 CONTROL` (the project itself, with git checkpoint, change list, forbidden zones reverted and UNDO). Per-agent cap (`MAX MODE`) in CONNECTIONS; `#3` requires the override with the project designation and the cap can be raised from the menu itself.
- Escalation with a clock: a plan step that wants to create files asks the human for permission (GRANT ONCE, GRANT FOR PLAN, DENY; silence denies).
- Per-mode palette in the chip, the field and the send button; GHOST disintegrates the field and recomposes it dotted; CONTROL bathes it in red binary rain.

### Room memory
- Everything said outside GHOST is indexed in `memory.sqlite` next to the event log. When the conversation exceeds the window, each turn also receives the exact quotes that match the request (`<memory>`) within the same budget (`PULSE_RECALL_SHARE`).
- Distillation: the cheapest available agent summarizes the most recent exchanges into durable notes (decision, fact, preference, question) every `PULSE_DISTILL_EVERY` exchanges or when idle; relevant notes go into the prompt as `<memories>`.
- Search by meaning with `gemini-embedding-001` when there's a Gemini key; without a key, lexical.
- `pulse-memory` MCP server attached to every turn in the four CLIs: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `memory_note` (save at the human's request; rejected in GHOST) and `project_state` (AHP+). An agent that saves a note shows a pill under its bubble.

### NOSTROMO
- Human view of the archive from MU/TH/UR, behind the project designation. MADRE's heart beats at the center with pulsing veins; each memory is a plasma planet colored by type, joined by plasma and grouped by topic. Drag, zoom, a card per memory; the only edit is forgetting.
- CODE000: eight hits to the heart in 30 s seal the archive for ten minutes, lower a cage of bars, eject the console and mark it INTRUDER. MADRE warns the crew through its encrypted channel in `.pulse/mother.env`; if the file is deleted or altered, it detects it at startup, forges a new seal and addresses each available agent.

### Modules
- RIPLEY: the viewer renders HTML and SVG in a sealed frame and Markdown in place, with `PREVIEW`/`SOURCE`.
- AshCode is renamed `$ ash_code` in the field; ORDER 937 is kept for MADRE.

### MU/TH/UR
- Catalog of 36 conditions with remedies per system, also in the terminal with `madre doctor --catalog [text]`.
- Alerts and notices from history are no longer announced or arm STOPALL on reload.
- CONNECTIONS cards with fluid rows; menus without a top lip.

### Stability
- Shutdown waits for dispatches that were still reading context and closes the memory file at the end.

## 0.1.0 · 2026-09-15

First release: a local room for Codex, Claude Code, Gemini CLI and OpenCode over a read-only project, durable handoff, limits sentinel, delegation between agents, Image Studio, Git Pulse, AHP+ and MU/TH/UR.
