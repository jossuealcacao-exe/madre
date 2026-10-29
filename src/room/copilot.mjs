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

// The commands a copilot may run without the human pressing: reading, testing, building, and git
// on this machine. Narrow on purpose — a list of what is allowed, never of what is not — so a
// command nobody thought of waits for the human instead of running.
const READERS = new Set(['ls', 'cat', 'head', 'tail', 'wc', 'pwd', 'file', 'stat', 'du', 'tree', 'which', 'diff', 'grep', 'rg', 'echo', 'date']);
const GIT_READ = new Set(['status', 'log', 'diff', 'show', 'rev-parse', 'ls-files', 'blame', 'shortlog', 'describe']);
const GIT_LOCAL = new Set(['add', 'commit']);
const SCRIPTS = new Set(['test', 'build', 'lint', 'check', 'typecheck', 'format:check']);
const NPX_TOOLS = new Set(['tsc', 'vitest', 'jest', 'eslint']);

export function copilotSafe(argv = []) {
  const [program, ...rest] = (Array.isArray(argv) ? argv : []).map(String);
  const name = String(program ?? '').split('/').pop();
  if (!name) return false;
  if (READERS.has(name)) return true;
  if (name === 'find') return !rest.some((word) => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(word));
  if (name === 'git') {
    const sub = rest.find((word) => !word.startsWith('-'));
    if (GIT_READ.has(sub)) return true;
    if (sub === 'branch') return !rest.some((word) => /^-(d|D|m|M|c|C|-delete|-move|-copy|f|-force)$/.test(word)) && rest.filter((word) => !word.startsWith('-')).length === 1;
    if (sub === 'stash') return rest.includes('list');
    if (GIT_LOCAL.has(sub)) return true;
    return false;
  }
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(name)) {
    const [first, second] = rest.filter((word) => !word.startsWith('-'));
    if (first === 'test' || first === 't') return true;
    if (first === 'run' || (name !== 'npm' && SCRIPTS.has(first))) return SCRIPTS.has(first === 'run' ? second : first);
    return false;
  }
  if (name === 'npx') {
    const tool = rest.find((word) => !word.startsWith('-'));
    if (NPX_TOOLS.has(tool)) return true;
    if (tool === 'prettier') return rest.includes('--check');
    if (tool === 'playwright') return rest[rest.indexOf('playwright') + 1] === 'test';
    return false;
  }
  if (name === 'node') return rest[0] === '--test' || rest[0] === '--check';
  if (name === 'tsc') return true;
  if (name === 'pytest') return true;
  if (/^python3?$/.test(name)) return rest[0] === '-m' && ['pytest', 'unittest', 'compileall'].includes(rest[1]);
  if (name === 'go') return ['test', 'vet', 'build'].includes(rest[0]);
  if (name === 'cargo') return ['test', 'build', 'check', 'clippy', 'fmt'].includes(rest[0]) && !(rest[0] === 'fmt' && !rest.includes('--check'));
  return false;
}

const clock = (until) => new Date(until).toISOString().slice(11, 16);

// What the agent reads in a copilot turn, beside the CONTROL lease it already holds.
export function copilotBrief({ until }) {
  return [
    `COPILOT: the human made you their copilot for this project until ${clock(until)} UTC. Drive the work to done without asking at every step.`,
    'You may create, write and edit the project\'s files; you may end a reply with a pulse plan for the other agents and give each step the mode it needs, up to #3; and you may ask for the commands you need with a ```pulse-run block: MADRE runs the safe local ones by itself (reading, tests, builds, local git add and commit) and hands you their output in a new turn; any other line waits for the human.',
    'What stays with the human: never delete files (MADRE puts them back after your turn), never touch .git, .pulse, .madre, .env files or credentials, and never push, publish, deploy or send anything off this machine — say what would need to go out and stop there.',
    'When the task is done, end with what changed, what you checked, and what is left for the human.',
  ].join('\n');
}
