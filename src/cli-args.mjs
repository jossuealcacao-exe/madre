// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Tiny argv reader for the MADRE CLI. Accepts `--name value` and
// `--name=value`, and remembers which options the user set explicitly so the
// room can choose sensible defaults (like the next free port) only when they
// did not.

export function parseArgs(argv) {
  const args = [...argv];
  const helpFlags = new Set(['help', '--help', '-h']);
  // The first word is the command: `start` when there is none, or when the line opens with an
  // option. `salas` (docs/MACROVERSO.md, D-S09) is one more word here; what it opens is decided
  // beside the room of Salas, in src/salas.mjs.
  // `named`: whether a command word was written at all. A bare `madre` (or `npx madre`) opens the
  // lobby; `madre start` keeps opening the folder it is run in (src/salas.mjs, projectRootFor).
  const named = Boolean(args[0]) && !args[0].startsWith('-') && !helpFlags.has(args[0]);
  let command = helpFlags.has(args[0])
    ? 'help'
    : args[0]?.startsWith('-') ? 'start' : (args.shift() ?? 'start');

  const options = {};
  const flags = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const equals = arg.indexOf('=');
    if (equals > 0) {
      options[arg.slice(2, equals)] = arg.slice(equals + 1);
      continue;
    }
    const name = arg.slice(2);
    const next = args[index + 1];
    if (next !== undefined && !next.startsWith('-')) {
      options[name] = next;
      index += 1;
    } else {
      flags.add(name);
    }
  }
  // `--help` after a command asks for the help, not for the command: `madre salas --help` prints
  // what `salas` does instead of opening it. A value never starts with `-`, so `-h` on its own is
  // never something an option was given.
  if (flags.has('help') || args.includes('-h')) command = 'help';
  return {
    command,
    named,
    option: (name, fallback) => options[name] ?? fallback,
    has: (name) => flags.has(name) || name in options,
    explicit: (name) => name in options,
  };
}
