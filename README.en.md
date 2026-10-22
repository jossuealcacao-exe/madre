<p align="center">
  <a href="https://madre.run"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/banner.png" alt="MADRE · All your AIs in one chat · Codex, Claude Code, Gemini CLI, Cursor and OpenCode" width="100%"></a>
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

**MADRE is not another AI.** It is a free app that runs on your computer and brings the AIs you already use (Codex, Claude Code, Gemini, Cursor and OpenCode) into one chat, inside your project’s folder. You write to them in your own words, each one reads what the others said, and you decide what they may change. What gets decided is kept, so you repeat nothing when you switch from one to another.

```
npx @jossuealcala/madre
```

You need Node 22.5 or newer and at least one AI signed in. There is no account to create: MADRE uses the sessions your AIs already have on your computer. It runs on macOS and Linux; Windows arrives in version 1.1.

<p align="center">
  <a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0.5/madre-tour-en.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/video.webp" alt="See how MADRE works in 80 seconds" width="100%"></a>
</p>

## How it works

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/how.webp" alt="The AIs you already use on the left; MADRE in the middle, with one chat for all of them, permissions, memory and undo; your project on the right. Everything runs on your computer." width="100%">
</p>

This is what a real round table looks like: you ask the team, Codex, Claude, Gemini and OpenCode answer, and @madre sums up where they agree.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/mesa-redonda.gif" alt="A real round table in MADRE: four AIs answer one after another and @madre sums up" width="100%">
</p>

## What it’s for

From code to business. You ask in your own words and each AI does the part it does best.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/uses.webp" alt="Six cases: fixing a bug between Claude, Codex and Gemini; your business’s page; several opinions before you decide; a local AI for what is private; reminders; a module made to fit" width="100%">
</p>

## What you can do

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-mesa.webp" alt="Round table: ask the team and they answer one after another; @madre sums up"><br><b>Round table.</b> Ask the team and they answer one after another; @madre sums up.</td>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-inicio.webp" alt="Home and Coordinator: all your projects at a glance"><br><b>Home and Coordinator.</b> All your projects at a glance.</td>
  </tr>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-permisos.webp" alt="Permissions and undo: you decide how far each AI goes"><br><b>Permissions and undo.</b> You decide how far each AI goes.</td>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-codigo.webp" alt="Code: ask about any line of your project"><br><b>Code.</b> Ask about any line of your project.</td>
  </tr>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-memoria.webp" alt="Memory: what gets decided stays saved"><br><b>Memory.</b> What gets decided stays saved.</td>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-modulos.webp" alt="Modules and Market: turn on only what you need"><br><b>Modules and Market.</b> Turn on only what you need.</td>
  </tr>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-local.webp" alt="Local AI: an AI on your computer, no tokens spent"><br><b>Local AI.</b> An AI on your computer, no tokens spent.</td>
    <td width="50%"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0.5/en/card-ayuda.webp" alt="Diagnostics: if something fails, it tells you the fix"><br><b>Diagnostics.</b> If something fails, it tells you the fix.</td>
  </tr>
</table>

## Start in three steps

1. **Open it.** Run `npx @jossuealcala/madre` in the Terminal. It opens in your browser, in English or Spanish.
2. **Connect your AIs.** MADRE finds the ones you have installed. If one is not signed in, Settings › Agents has the button to sign in; if one is not installed, MADRE installs it for you.
3. **Add your project and ask.** Pick the folder and write, for example: `@codex explain this project in five lines`.

The first time, MADRE shows you each thing with tips, step by step. The [manual](https://madre.run/en/manual/) takes you from zero to your first project in about ten minutes; it is also inside MADRE (Settings › System) and as a PDF.

```
npx @jossuealcala/madre             # opens Home, with all your projects
npx @jossuealcala/madre start       # opens the project of the folder you are in
npx @jossuealcala/madre doctor      # which AIs you have and which are signed in
```

MADRE updates itself: the same command gets the newest version, and inside MADRE a notice lets you update in one click.

## If something fails

Open **Diagnostics** and write what you see, like “Gemini does not answer” or “Claude is not signed in”. It tells you what is going on and gives you the button that fixes it, or the command for the Terminal. Without opening MADRE, `npx @jossuealcala/madre doctor` checks your AIs. The most common problems are in the [manual](https://madre.run/en/manual/#help).

## Your data

- **No cloud.** MADRE has no server and no account. It runs on `127.0.0.1` and stops when you close the Terminal.
- **Your keys are not copied.** Each AI keeps its own session; if you paste a key, MADRE writes it where that AI looks for it and keeps no copy.
- **You know what leaves.** What an AI reads travels to its provider, with your account, as if you used it in your Terminal. In Diagnostics you see everything that leaves your computer and how to turn it off.
- **Zero dependencies.** Node and nothing else.

## New in 1.0.5

- A manual with real pictures and every step marked, inside MADRE and as a PDF, with a guide to train your own AI on your project.
- Tips that teach you Home and your first project in minutes.
- Notes and Reminders, which you can also ask any AI for.
- In Code, you ask about any line: explain, improve, write tests or fix.
- Connectors in one click: GitHub, Notion, Linear, Stripe and more.
- Cursor and Gemini show the models of your plan, and Cursor now works with all four permissions.
- Gemini under load tells you what really happened.

The details are in the [CHANGELOG](CHANGELOG.en.md). How each thing works: [docs/en/REFERENCE.md](docs/en/REFERENCE.md) · Inside: [docs/en/INTERNALS.md](docs/en/INTERNALS.md) · Writing a module: [docs/en/SDK.md](docs/en/SDK.md)

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
