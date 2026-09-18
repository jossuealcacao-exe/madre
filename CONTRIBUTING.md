# Contributing · CREW MANUAL

MADRE is one local room where several AI coding CLIs work on a project together. Changes land through pull requests against `main`; CI runs the suite, packs the tarball and installs it on Ubuntu and macOS with Node 22 and 24.

## Before you start

```
node --version          # ≥ 22.5
npm test                # 111 tests, no model calls
npm run pack:check      # packs, installs, exercises the CLI
node ./bin/madre.mjs doctor --catalog   # what MU/TH/UR already knows
```

## What a good change looks like

- One idea per commit, in the imperative voice the log already speaks.
- A test for every behaviour you touch: `test/pulse.test.mjs` for the room and adapters, `test/memory.test.mjs` for memory, NOSTROMO and MOTHER, `test/sentinel.test.mjs` for the sentinel. No test may call a real model.
- Nothing leaves the machine without the human's say-so. If your change sends anything anywhere, it needs a switch, off by default, and a line in the threat model.
- Agents never write outside their lease. If you widen what an agent may do, the permission modes and MU/TH/UR's catalog must say so.
- MU/TH/UR speaks in uppercase and in short sentences; the room speaks like a person. Keep both voices.

## Where things live

```
bin/madre.mjs        the CLI · start, doctor, setup
src/server.mjs       HTTP + SSE, settings, modules, sentinel routes
src/room.mjs         the turn engine: send, dispatch, turns, plans, handoff, scopes
src/room/            its pieces: prompt (what an agent reads), context (transcript + recall),
                     control (checkpoint, diff, undo), escalation (waiting for the human),
                     archivist (distillation), vectors (embeddings), budget (token window),
                     ghost (off the record), attachments
src/adapters/        one file per CLI: Codex, Claude Code, Gemini CLI, OpenCode
src/memory.mjs       SQLite index, distilled notes, vectors, recall
src/distiller.mjs    the archivist's prompt and parsing
src/mcp/             MADRE's own MCP servers: pulse-image, pulse-memory
src/mother.mjs       MOTHER's coded channel, CODE000
src/sentinel-errors.mjs   unknown conditions and crashes → redacted reports
public/              the room UI; troubleshooting.js is MU/TH/UR's knowledge base
docs/report-collector/    the Worker that turns sentinel reports into issues
```

## Versions

- A version is **closed only when it is on npm**. Until then its changelog section reads *Sin publicar* and keeps growing; no new number is opened while the previous one is unpublished.
- One published version = one `vX.Y.Z` tag = one GitHub release = one changelog section. Tags and releases are created at publish time, never before.
- Patch (`0.2.x`) for fixes and additions inside existing modules; the patch number may reach two digits. Minor (`0.x`) for a new mode, a new module, a new agent, or a change to what leaves the machine. Major when the room's ledger or memory format stops being readable by the previous version.
- `scripts/release.mjs` does the closing in one go: checks the tree is clean and CI-green, runs the suite and pack:check, turns *Sin publicar* into the dated section, tags, pushes, creates the release and prints the publish command.

Open questions go to issues with the `question` label. Ideas go through `✎ FEEDBACK` in MU/TH/UR or a plain issue. Be kind to the crew.
