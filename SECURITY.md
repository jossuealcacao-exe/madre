# Security · MU/TH/UR 6000 · PRIORITY ONE

MADRE runs on your machine, talks to no cloud of its own and stores no credentials. Its agents are CLIs you installed; they talk to their providers. What leaves the machine, and what never does, is written out in [`docs/REFERENCE.md`](docs/REFERENCE.md#lo-que-sale-de-la-máquina).

## Reporting

If you find a way for an agent to write outside its lease, to keep CONTROL it should not have, to reach the memory of a room it is not in, or to make MADRE send anything you did not allow, tell the author privately first:

- GitHub: open a **private security advisory** at https://github.com/jossuealcacao-exe/madre/security/advisories/new
- Or write through https://jossuealcala.com/en/

Please include the MADRE version (`madre doctor --json`), the platform, which agent and mode were involved, and the smallest sequence of messages that reproduces it. A fix ships as a patch release and the advisory is published once it is out. Reports that are about a CLI's own behaviour (Codex, Claude Code, Gemini CLI, OpenCode) are forwarded to that project.

## Known, accepted for the beta

- In `#3 CONTROL`, `.env` files, `.pulse/`, `.madre/` and `.claude/settings.local.json` are made read-only for the length of the turn and restored from the checkpoint afterwards; `.git/` stays writable because the CLIs need it and is only restored after the turn. An agent that changes permissions on purpose is caught by that restoration, not prevented.
- `#4 AIRLOCK` runs commands with the CLIs and sessions already on the machine: tests, builds, `git push`, deploys. Files come back with `UNDO`; **what leaves the machine does not**. Arming it asks for two keys — the project designation and the word `AIRLOCK` — and the agent's `MAX MODE` in CONNECTIONS must already reach it, which is a separate deliberate act. No agent can raise its own ceiling, and a permission an agent writes into its own answer is not a permission. Treat `#4` as handing that agent your shell.
- Everything said outside `#0 GHOST` is kept in the room's memory and reaches every agent of that room. Use GHOST for what must not be remembered.

NOBODY DELETES MOTHER'S MEMORY. EVERYTHING ELSE IS FAIR GAME.
