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
src/room.mjs         turns, permission modes, plans, CONTROL, handoff, memory hooks
src/adapters/        one file per CLI: Codex, Claude Code, Gemini CLI, OpenCode
src/memory.mjs       SQLite index, distilled notes, vectors, recall
src/distiller.mjs    the archivist's prompt and parsing
src/mcp/             MADRE's own MCP servers: pulse-image, pulse-memory
src/mother.mjs       MOTHER's coded channel, CODE000
src/sentinel-errors.mjs   unknown conditions and crashes → redacted reports
public/              the room UI; troubleshooting.js is MU/TH/UR's knowledge base
docs/report-collector/    the Worker that turns sentinel reports into issues
```

Open questions go to issues with the `question` label. Ideas go through `✎ FEEDBACK` in MU/TH/UR or a plain issue. Be kind to the crew.
