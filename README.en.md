<p align="center">
  <a href="https://madre.run"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/madre-banner.png" alt="MADRE · All your AIs in one chat · Codex, Claude Code, Gemini CLI and OpenCode" width="100%"></a>
</p>

<p align="center"><a href="README.md">Español</a> · <b>English</b></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@jossuealcala/madre"><img alt="npm" src="https://img.shields.io/npm/v/@jossuealcala/madre?style=flat-square&label=npm&color=9bff66&labelColor=050605"></a>
  <a href="https://github.com/jossuealcacao-exe/madre/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/jossuealcacao-exe/madre/ci.yml?style=flat-square&label=CI&color=9bff66&labelColor=050605"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A5%2022.5-9bff66?style=flat-square&labelColor=050605">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-9bff66?style=flat-square&labelColor=050605">
  <img alt="license" src="https://img.shields.io/badge/license-AGPL--3.0-9bff66?style=flat-square&labelColor=050605">
</p>

<br>

# All your AIs in one chat.

Codex, Claude Code, Gemini CLI and OpenCode working on your projects,
in the same conversation, remembering the same things. All your projects in one place,
and a Coordinator that sees them from above.

```
npx @jossuealcala/madre
```

That's it. No account to create, no cloud to set up, no key to paste.
MADRE uses the sessions those CLIs already have on your machine.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/home.webp" alt="MADRE Home: the Coordinator with its recent summary, who is waiting for you, the connections and one card per project" width="100%">
</p>

<p align="center"><sub>Home, with all your projects. The 90-second tour is <a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4">in Spanish for now</a>. Also at <a href="https://madre.run/en/">madre.run</a>.</sub></p>

<br>

---

<br>

## What's new in 1.0

- **Home**: all your projects in one place, open or asleep, with what happened in each one.
- **The Coordinator**: an agent that reads across your projects, signs connections and carries orders from one to another.
- **Connections**: one project looks up what another has already learned, only through a connection that you sign or, if you allow it, the Coordinator.
- **Permissions your way**: from `#0` Incognito to `#4` Full access, with the key you choose.
- **Settings and Diagnostics**: everything you configure in one window, and the fix when something breaks.
- **Modules as apps**, several conversations at once and a code editor in the viewer.

If you're coming from 0.7.2, your projects, conversations, memory and settings stay. The details are in the [CHANGELOG](CHANGELOG.en.md).

<br>

## One conversation, not four terminals

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/one-chat.webp" alt="All your AIs in one chat: each answer with its agent, and the handoff line that says how many messages the next one received" width="100%">
</p>

You type `@codex` and Codex answers. You type `@claude` and Claude answers, **reading what Codex just said**. You type "@madre, ask the team…" and each one gives its take in turn on the same thing; at the end, @madre sums up where they agree and where they don't, citing each answer.

Today that's four windows, four contexts and you copying and pasting between them. MADRE turns it into one thread.

## All your projects, in one place

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/connect-agents.webp" alt="The first time in Home: connect your agents, once for all your projects" width="100%">
</p>

`npx @jossuealcala/madre` opens **Home**. The first time, it walks you through three steps: connect your agents (once for all your projects), add your folders and open the ones you'll use. Each card says whether an agent is working, whether someone is waiting for you and what was decided while you were away.

## A Coordinator that sees all your projects

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/coordinator.webp" alt="The Coordinator answers what was decided in two connected projects, saying which one each fact came from" width="100%">
</p>

The **Coordinator** lives in Home. It reads what your projects have learned —only from the ones you connect— and answers you saying which project each fact came from. If you allow it, it carries tasks from one project to another, up to `#2`; anything that needs more permission arrives as a proposal that you unlock. From any project you ask it with `/bishop`.

A **connection** says which kinds of note cross over (decisions, facts, preferences, questions) and until when. Never your files or your conversations, and you can revoke it whenever you want.

## A memory that outlives the session

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/memory-map.webp" alt="The Memory map: colored memories around a magma core, joined by their links" width="100%">
</p>

Everything that's said gets indexed. When the conversation outgrows the context window, each agent gets back what it needs, cited. Every ten exchanges, the project distills what was said into typed notes: a decision, a fact, a preference, an open question.

You ask *"why did we choose Postgres?"* three weeks later and the project answers, even if that decision was made by another agent in another session.

With [Ollama](https://ollama.com) running, that memory also **talks**: `@madre` is a fifth agent, local, free, that answers from the whole archive with citations and writes nothing. And you can **see** it: the **Memory map** is a three-dimensional brain you turn with the mouse, where each memory is a star the color of its type.

## They read by default. They write when you say so.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/modes.webp" alt="The mode menu, from #0 Incognito to #4 Full access" width="60%">
</p>

Every message goes out with a permission mode, and your mode is the ceiling for everything that message starts.

| | | |
|---|---|---|
| `#1` | **CHAT ONLY** | Read and coordinate. The default. |
| `#2` | **CREATE** | Add new files. Whatever already existed is restored when it's done. |
| `#3` | **EDIT** | Edit the project. A restore point before, a list of changes and `UNDO` after. |
| `#4` | **FULL ACCESS** | Commands, `git push`, deploys. Asks for the key twice. |

There's also `#0 INCOGNITO`, for what shouldn't be kept anywhere.

Moving up to `#3` or `#4` is deliberate: MADRE asks for your key —by default, the name of the project folder; in Settings › Permissions you can choose a phrase of your own— and the project itself checks it. No agent can grant itself a permission by writing it in its answer.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/undo.webp" alt="Claude changed two files in #3 Edit and the Undo button takes the project back to the restore point" width="60%">
</p>

## Your space, your way

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/en/workspace.webp" alt="The conversation on the left and the code editor beside it, in Edit mode" width="100%">
</p>

Each panel opens alongside or in a window you can move. Several conversations work at once, the viewer edits code, your project's servers open inside MADRE and you build the bar with a right click. **Settings** (⌘ ,) brings together everything you configure, with search, and **Diagnostics** gives you the fix when something breaks.

<br>

---

<br>

## Make it yours

MADRE comes with twelve modules —Token saver, Suggested effort, Local AI, GitHub, Continuity and more—, on an app-style board. You write the next one, or you ask an agent to.

**A module is one file.** No build, no dependencies, no signing up anywhere. You copy it into a folder, reload and it shows up with its switch, its settings and its card. With one you can add a `/whatever` command the project understands, give the agents a tool they didn't have before, change how MADRE behaves, or connect it to something you already use.

**Or you don't write it.** In the text box:

```
/module a command that tells me what changed in the repo this week
```

The agent reads the SDK, writes the file, and MADRE shows you a card to review it before installing it. It never installs itself, and no agent can write to the modules folder.

**Connecting it to an outside service** is the most requested thing, and the short answer is *almost always yes*: the limit isn't MADRE, it's how that service lets you hand over your own key. It's worth it when you can get the key in under five minutes without being a developer and revoke it yourself — GitHub, Linear, Notion, Jira, Slack, Telegram, Stripe, Shopify, Odoo, any database. Where there's a wall is where the provider requires reviewing your app before letting you through: Gmail read access, Meta, banking.

Your module declares which key it needs and MADRE draws the field; it declares where it connects to and the outbound log accounts for it; it declares which of its tools **send** something, and the project takes those away from the agents except at step `#4`. You don't program any of that: you declare it.

**[Write a module →](docs/en/SDK.md)** · with two complete examples that work as they are: [the minimal one](docs/sdk/hello-module.mjs) and [an integration](docs/sdk/connector-module.mjs).

<br>

---

<br>

## What MADRE is not

This matters more than any feature.

**There is no cloud.** MADRE has no server, no account, no backend. It runs on `127.0.0.1` and dies when you close the terminal.

**Your keys, where they're needed and nowhere else.** When you give an agent's key, MADRE writes it to the file where that CLI looks for it, locked to your user, and keeps no copy. An integration has no CLI to give it to, so that one —and only that one— MADRE keeps, in its own vault on your machine, with permissions for your user only, accepted only from this computer. Never in its config, its records or its logs, or anything an agent reads: the card only shows that one is saved and how many characters it has.

**Nothing goes out on its own.** What an agent reads travels to *its* provider, with your account and your limits — as if you had run it in your terminal, because that's exactly what MADRE does. What MADRE looks up on its own is declared, along with what turns it off: the daily check for new versions (npm and GitHub), your Claude plan's quota, Gemini embeddings and images if you turn them on, and crash reports, off by default. And once a day, always, a notice that this copy is still in use: a random identifier, the MADRE version, the operating system and the Node version. No name, email, IP or anything from your projects; it's how the author knows how many people use MADRE.

**And it lets you read it.** Touch the core of the Memory map and "What is sent" opens: the exact document MADRE writes on your behalf every turn, the exact command it delivers it with, and the log of every call that left this machine. It's not a promise: it's a screen.

**Zero dependencies.** Node and nothing else.

<br>

---

<br>

## Getting started

You need **Node 22.5** or later and at least one of these CLIs with a signed-in session: Codex, Claude Code, Gemini CLI or OpenCode.

```
npx @jossuealcala/madre
```

From any folder, it opens **Home** at `http://127.0.0.1:4317/salas`: all your projects in one place, with the Coordinator at the top. The first time, it walks you through three steps: **connect your agents** (install and sign in to each CLI right there, once for all your projects), **add your projects** (you choose the folders; adding them doesn't open them) and **open** the ones you'll use. Each project runs on its own, with its own memory.

If you'd rather go straight into a project, as before:

```
cd your-project
npx @jossuealcala/madre start
```

```
npx @jossuealcala/madre doctor    # what's installed, who's signed in
```

**Updating.** `npx @jossuealcala/madre` with no version fetches the newest one each time it starts: close it and open it again, or use the new-version notice inside MADRE, which updates it in one click. If you installed it with `npm install -g`, install it again: `npm install -g @jossuealcala/madre@latest`.

MADRE speaks **Spanish** and **English**: the first time, it opens in your browser's language, and you can change it any time in Settings › Appearance.

<br>

**How each thing works, with the exact numbers:** [docs/en/REFERENCE.md](docs/en/REFERENCE.md)
**How it works inside:** [docs/en/INTERNALS.md](docs/en/INTERNALS.md) · **Write a module:** [docs/en/SDK.md](docs/en/SDK.md)

<br>

---

<br>

## Status

Public beta. The core is tested and under CI on macOS and Linux with Node 22 and 24; the surface keeps changing. The decisions that still hurt are written down, without embellishment, in [*What leaves the machine*](docs/en/REFERENCE.md#what-leaves-the-machine).

A version is closed when it's on npm. The details of each one in [CHANGELOG.en.md](CHANGELOG.en.md); what's coming, in the [roadmap](https://github.com/jossuealcacao-exe/madre/blob/main/docs/en/ROADMAP.md).

Problems: from any fix in Diagnostics ("Not fixed?") or in [issues](https://github.com/jossuealcacao-exe/madre/issues).
Security: [SECURITY.md](SECURITY.md) · Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

MADRE is free and will stay that way. If it saves you time and you want it to keep growing,
you can [sponsor it](https://github.com/sponsors/jossuealcacao-exe). Nothing in the product
changes based on what you do with that link.

AGPL-3.0 with additional terms · © 2026 [Jossue Alcalá](https://jossuealcala.com/en/)

The code is free software under the [GNU AGPL v3](LICENSE) with [additional terms](ADDITIONAL-TERMS.md):
use it, modify it and fork it, as long as your version stays open under the same license and keeps the
authorship visible —«MADRE ‹version› · © 2026 Jossue Alcalá» in the corner of every project and of Home,
linked to jossuealcala.com, or «Built with MADRE by Jossue Alcalá» under another name. The name
**MADRE**, its logo and madre.run are trademarks of Jossue Alcalá: a modified version goes by another
name. Up to 1.0.1, MADRE was published under the Apache License 2.0. What's allowed and what isn't:
[TRADEMARKS.en.md](TRADEMARKS.en.md).

<br>

```
NOBODY DELETES MOTHER'S MEMORY.
```
