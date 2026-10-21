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

MADRE is an app that runs on your computer and puts the AIs you already use (Codex, Claude Code, Gemini CLI, OpenCode and Cursor) in one chat. You write to them as you would to a person, they read your project, and you decide what they may change. They all remember the same things, so you repeat nothing when you switch from one to another.

```
npx @jossuealcala/madre
```

You need Node 22.5 or newer and at least one agent signed in. There is no account to create: MADRE uses the sessions your agents already have on your machine.

<p align="center">
  <a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/madre-1-0-video.webp" alt="Watch MADRE in 90 seconds" width="100%"></a>
</p>

## What it does

- **One chat, every agent.** Type `@codex` and Codex answers; type `@claude` and Claude answers having read what Codex just said. No copying and pasting between windows.
- **You set the limit.** Every message carries a permission: `#1` only talks, `#2` creates files, `#3` edits them with a point to undo, `#4` runs commands and asks you to confirm twice.
- **One memory for the whole project.** What gets decided is kept, and any agent gets it when it is needed, even if another one said it weeks ago.
- **All your projects in Home.** You see where each one stands, who is waiting for you, and a Coordinator that can look up what each project learned.
- **Code, notes, reminders and more.** You read and edit code beside the chat, ask about any line, and turn on modules when you need them.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-agentes.webp" alt="Claude answers after Codex in the same MADRE chat" width="100%">
</p>

## How it helps

- **You stop jumping between terminals.** Four AIs, one thread.
- **You do not explain your project every time.** The memory tells the agent you ask.
- **No nasty surprises.** No agent changes a file until you raise the permission, and what it does can be undone.
- **You learn it fast.** The first time, MADRE shows you each thing step by step, and the [manual](https://madre.run/en/manual/) has pictures of every screen.

## What's new in 1.0.5

- A manual with real pictures and every step marked, inside MADRE and as a PDF.
- Tips that teach you Home and your first project in minutes; if you used MADRE before, you only see what is new.
- Notes and Reminders, which you can also ask any agent for.
- In Code, you ask about any line: explain, improve, write tests or fix.
- Connectors in one click: GitHub, Notion, Linear, Stripe and more.
- Cursor and Gemini show the models of your plan, and Cursor now works with all four permissions.

The detail is in the [CHANGELOG](CHANGELOG.en.md).

## Your data

- **There is no cloud.** MADRE has no server and no account. It runs on `127.0.0.1` and stops when you close the terminal.
- **Your keys are not copied.** Each agent keeps its own session; if you paste a key, MADRE writes it where that agent looks for it and keeps no copy.
- **You know what leaves.** What an agent reads goes to its provider, with your account, as if you ran it in your terminal. In Diagnostics you see each thing that leaves your computer and how to turn it off.
- **Zero dependencies.** Node and nothing else.

## Getting started

```
npx @jossuealcala/madre             # opens Home
npx @jossuealcala/madre start       # opens the project of the folder you are in
npx @jossuealcala/madre doctor      # which agents are there and which are signed in
```

MADRE keeps itself up to date: the same command fetches the newest version, and inside MADRE a notice lets you update in one click. It speaks English and Spanish; the first time it uses your browser's language.

- **Manual:** [madre.run/en/manual](https://madre.run/en/manual/), also inside MADRE in Settings › System.
- **How each thing works:** [docs/REFERENCE.md](docs/REFERENCE.md) · **Under the hood:** [docs/INTERNALS.md](docs/INTERNALS.md) · **Writing a module:** [docs/SDK.md](docs/SDK.md)

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
