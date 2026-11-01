// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// COPILOT: the human hands one project to whichever agent they write to, for a while (2026-10-14).
//
// Turned on with the #3 key, once, for up to 24 hours. While it lasts, a message sent at #3 needs no
// key: the agent it goes to edits the project, plans with the others and gives each step up to #3,
// and asks for the commands it needs — the safe ones MADRE runs by itself and hands back (src/room/
// returns.mjs); the rest wait for the human. What stays the human's whatever happens: deleting (a
// deleted file is put back after the turn), MADRE's own folders and secrets (already forbidden in
// CONTROL), and anything that leaves the machine — a push, a deploy, a publication, a message —
// which is #4 and keeps its own key. STOP ALL ends it, and so does a restart.
//
// Pure: no state lives here. The server holds the window; the room asks it.

// How long it may last, in minutes. Twenty-four hours at most, as the person asked.
export const COPILOT_WINDOWS = Object.freeze([30, 60, 240, 480, 1440]);
// Rounds of «ran by itself, handed back, asked again» in a row before the room stops and asks the
// human: a copilot that loops is a bill, not help.
export const COPILOT_MAX_ROUNDS = 8;

// The commands a copilot may run without the human pressing: reading, and reading git. Narrow on
// purpose — a list of what is allowed, never of what is not — so a command nobody thought of waits
// for the human instead of running.
//
// Tests, builds, linters and commits used to run by themselves too, and wait for the human since
// 2026-11-01 (external review #3, the person's decision): each runs code the project defines — a
// script in package.json, a test file, a config in JS, build.rs, a hook in .husky — and the copilot
// edits the project. What it wrote in its turn then ran with the person's rights and the network,
// which is what #4 and its own key are for. Reading runs nothing of the project's; git reads after
// the turn let go of the project, when .git/config and its hooks are already back as they were.
const READERS = new Set(['ls', 'cat', 'head', 'tail', 'wc', 'pwd', 'file', 'stat', 'du', 'tree', 'which', 'diff', 'grep', 'rg', 'echo', 'date']);
const GIT_READ = new Set(['status', 'log', 'diff', 'show', 'rev-parse', 'ls-files', 'blame', 'shortlog', 'describe']);

export function copilotSafe(argv = []) {
  const [program, ...rest] = (Array.isArray(argv) ? argv : []).map(String);
  const name = String(program ?? '').split('/').pop();
  if (!name) return false;
  // Readers that can still run or write something with one flag: rg's --pre runs a program on each
  // file, tree -o writes its output wherever it is told.
  if (name === 'rg' && rest.some((word) => /^--pre(-glob)?(=|$)/.test(word))) return false;
  if (name === 'tree' && rest.some((word) => /^(-o|--output)/.test(word))) return false;
  if (READERS.has(name)) return true;
  if (name === 'find') return !rest.some((word) => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(word));
  if (name === 'git') {
    // The subcommand first, with no options before it: `--git-dir`, `-c` or `--exec-path` would
    // point git at settings the project holds, and those can name a program to run. And no
    // --output, which writes a file.
    const sub = rest[0];
    if (rest.some((word) => /^--output(=|$)/.test(word))) return false;
    if (GIT_READ.has(sub)) return true;
    if (sub === 'branch') return !rest.some((word) => /^-(d|D|m|M|c|C|-delete|-move|-copy|f|-force)$/.test(word)) && rest.filter((word) => !word.startsWith('-')).length === 1;
    if (sub === 'stash') return rest.includes('list');
    return false;
  }
  // Parsing a file runs none of it.
  if (name === 'node') return rest[0] === '--check';
  return false;
}

const clock = (until) => new Date(until).toISOString().slice(11, 16);

// What the agent reads in a copilot turn, beside the CONTROL lease it already holds.
export function copilotBrief({ until }) {
  return [
    `COPILOT: the human made you their copilot for this project until ${clock(until)} UTC. Drive the work to done without asking at every step.`,
    'You may create, write and edit the project\'s files; you may end a reply with a pulse plan for the other agents and give each step the mode it needs, up to #3; and you may ask for the commands you need with a ```pulse-run block: MADRE runs the ones that only read by itself (ls, cat, rg, git status, diff and log) and hands you their output in a new turn; tests, builds, linters, commits and any other line wait for the human to press them, so ask for them once, together, when the work is ready to check.',
    'What stays with the human: never delete files (MADRE puts them back after your turn), never touch .git, .pulse, .madre, .env files or credentials, and never push, publish, deploy or send anything off this machine — say what would need to go out and stop there.',
    'When the task is done, end with what changed, what you checked, and what is left for the human.',
  ].join('\n');
}
