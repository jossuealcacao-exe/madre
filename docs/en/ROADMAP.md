# MADRE · ROADMAP

Where MADRE goes after the 0.2 beta. Three lines, in order of dependency, and one rule so the core doesn't grow into a monster: **the model is replaceable; the room, the ledger, the authority and the project's memory are not.**

## 0 · Version discipline (now)

- A version is closed when it's on npm. `Sin publicar` is the only open section of the changelog.
- `vX.Y.Z` = tag = release = section. Patch up to two digits; minor for modes, modules, agents or any change in what leaves the machine; major only if the ledger or the memory can no longer be read by the previous version.
- `scripts/release.mjs` does the closing in one go and `madre --version` reports version and commit.

## 1 · Harden the core (0.2.x)

Before more surface:

- **`room.mjs` in pieces** · done: `src/room/{prompt,context,control,escalation,archivist,vectors,budget,ghost,attachments}`; the turn and plan engine stays in `room.mjs`.
- **CONTROL with Codex** · partly done: `.env`, `.pulse/`, `.madre/` and `settings.local.json` read-only during the turn (`src/room/guard.mjs`); `.git/` is still handled by restoring.
- **Catalog and sentinel** keep absorbing every condition that shows up in other people's hands.

## 2 · MADRE AI · the distillation that learns (0.3)

Today distillation produces notes. The idea: that it produces **an intelligence of the project's own**, local, with Ollama, that grows with every exchange. Three layers, each one useful on its own and the basis for the next:

### 2a · Ollama as the local backbone
- Local embeddings (`nomic-embed-text` or similar) instead of Gemini: recall by meaning with no quota or key, and nothing leaves the machine.
- Ollama as archivist: it distills with a local model; Gemini and the others remain as backup. Distillation stops costing other providers' tokens.
- Detect Ollama the way each CLI is detected; without Ollama, everything stays as it is today.

### 2b · `@madre`, the fifth agent · done in `src/adapters/madre.mjs`
- An Ollama adapter that answers **from the room's memory and the project's files** (RAG over `memory.sqlite` + reading the project). It doesn't delegate, it doesn't write, it only knows.
- It grows on its own: every distilled note and every indexed exchange expands what `@madre` can answer. It's the "MADRE AI" visible from day one, without training anything.
- It serves as a cheap judge: has this request already been resolved? Does it contradict a decision?

### 2c · Real distillation: one model per project · dataset and recipe done (`madre dataset`, `docs/training/`); training runs outside, `@madre` picks up `madre-<proyecto>`
- **Dataset first.** Export (context, answer) pairs from the ledger, without GHOST, redacted, with agent and mode labels, to `~/.pulse/rooms/<sala>/dataset.jsonl`. It accumulates from now on even if training comes later.
- **Periodic local training:** LoRA on a small model (Qwen2.5-Coder 7B or similar) with `mlx-lm` on Apple Silicon, when the room is idle and the dataset has grown enough. The result is registered in Ollama as `madre-<proyecto>:<fecha>` and `@madre` switches to it.
- **Evaluation before promoting:** a fixed set of project questions with known answers; the new model replaces the previous one only if it answers better. Everything stays in the ledger.
- Honest risks: scarce data at the start, training time on the user's machine, quality that is hard to measure. That's why 2a and 2b come first and are already worth it on their own.
- **Quality can be measured**, and the signal already exists without being read: the thumbs on each answer only reach the dataset. Connecting them to the archivist, giving each memory a life cycle and building the evaluation set on its own is designed in [`docs/ZONAS.md`](../ZONAS.md).

## 3 · Internal module SDK (0.3) · done in `src/modules/`

The five current modules touch four files each. A module should be **one file**:

```
defineModule({
  id, name, vendor, summary,
  settings: { key: default },          // en config.json, con interruptor en MODULES
  detect(),                            // ¿está disponible en este proyecto?
  routes: { 'GET /api/x': handler },   // rutas propias, ya autenticadas por MADRE
  card(state),                         // su tarjeta en MODULES
  conditions: [ ... ],                 // lo que MU/TH/UR debe saber de él
  hooks: { onEvent(event), onTurn(ctx) }
})
```

With that, RIPLEY, Git Pulse, Image Studio, Ash, the sentinel and the future Ollama become files in `src/modules/`, and the room doesn't change when a new one arrives.

## 4 · Windows (1.0)

MADRE was born on POSIX and its central promise —"they read by default, they write when you say so"— rests today on three mechanisms that Windows doesn't have in the same form: the file system's write bit, process groups and the sandbox each CLI builds on seatbelt or Landlock. The port isn't path compatibility: it's finding out whether that permission ceiling holds on Windows, and declaring with reasons what holds and what doesn't.

Four phases —measure, make it start, make it confine, make it explain itself— with traceability by id, on the `windows/1.0` branch. **Since 2026-10-21 the announcement is that Windows arrives in version 1.1; nothing says it already works until phase 4 closes and 1.1 is out.**

The single document is **`docs/WINDOWS.md`**: findings with permanent ids, open decisions, phases, versions and log. Nothing about Windows is decided outside of it.

## 5 · Connectors (0.7.x)

Bringing an outside service into the room is a **module**, not a new category: IMAGE STUDIO
and the memory server already do it. What was missing from the core —that a module can
declare where it connects to— is done. What's left to decide, and the first connector (email),
is in [`docs/en/CONNECTORS.md`](CONNECTORS.md).

What follows is still true: a connector talks from this machine to a service of the
user's, with their credentials. There's no MADRE cloud in between.

## Out of scope, on purpose

- A general browser, tabs, history outside the project.
- An interactive terminal inside the room. The commands an agent needs under AIRLOCK are requested with `pulse-run` and run by the human, one per line and without a shell (Runs module, 0.7.2). A console with a PTY would require native dependencies and would reinterpret what the human approves.
- Any MADRE cloud. If there's ever sync between machines, it will be through the ledger and with the user's key.
