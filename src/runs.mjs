// An agent asking the human to run a command.
//
// Below #4 AIRLOCK no agent runs anything: it reads, it writes where its mode allows, and that is
// all. Some answers still turn on a command — the tests after a fix, a build, a linter — and the
// agent used to say "run npm test and tell me", leaving the human to copy it into a terminal and
// paste the output back. This gives the request a shape. ```pulse-run carries the reason and the
// commands; MADRE shows each one as a button; the human presses; the output lands in the room as
// a card every agent reads on its next turn.
//
// Inert, like ```pulse-ask: parsing it runs nothing. The press is the human's, line by line.
//
//   ```pulse-run
//   Check that the fix did not break the parser
//   $ npm test
//   $ node --check src/runs.mjs
//   ```
//
// One command per line, and no shell. A line becomes an argv the way a POSIX shell would split
// it — quotes and backslashes — and nothing else: no pipes, no `&&`, no redirections, no `$VAR`,
// no globs. Without a shell those would arrive at the program as literal characters and do
// something other than what the human read on the button, so a line that has one is refused and
// says why. Running it through a shell instead would hand an agent's text to `sh` or `cmd.exe`
// (WIN-016): the human approves a line, and the line that runs has to be the one they read.

export const MAX_COMMANDS = 5;
const MAX_REASON = 300;
const MAX_LINE = 500;

// Shell builtins: without a shell they are not programs, or they are programs that change nothing.
const BUILTINS = new Set(['cd', 'export', 'source', '.', 'alias', 'unset', 'set', 'eval', 'exec', 'pushd', 'popd']);

function clip(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

// A line split into words the way sh would, without anything sh would expand. Returns
// { argv } or { why } when the line needs a shell to mean what it says.
export function splitCommand(line) {
  const argv = [];
  let word = '';
  let inWord = false;
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote === "'") {
      if (char === "'") quote = null; else word += char;
      continue;
    }
    if (quote === '"') {
      if (char === '"') { quote = null; continue; }
      if (char === '\\' && i + 1 < line.length && '"\\$`'.includes(line[i + 1])) { word += line[i + 1]; i += 1; continue; }
      if (char === '$' || char === '`') return { why: 'expands a variable or a command inside quotes; there is no shell to expand it' };
      word += char;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; inWord = true; continue; }
    if (char === '\\') {
      if (i + 1 < line.length) { word += line[i + 1]; i += 1; inWord = true; continue; }
      return { why: 'ends in a lone backslash' };
    }
    if (/\s/.test(char)) {
      if (inWord) { argv.push(word); word = ''; inWord = false; }
      continue;
    }
    if ('|&;<>()'.includes(char)) return { why: 'uses "{char}", which needs a shell; put each command on its own line', whyArgs: { char } };
    if (char === '$' || char === '`') return { why: 'expands a variable or a command; there is no shell to expand it' };
    if (char === '*' || char === '?' || char === '[') return { why: 'uses "{char}" as a glob; there is no shell to expand it, name the files', whyArgs: { char } };
    if (char === '~' && !inWord) return { why: 'starts a word with "~"; there is no shell to expand it, write the path' };
    if (char === '#' && !inWord) return { why: 'carries a "#" comment, which only a shell would drop; say it in the reason' };
    word += char;
    inWord = true;
  }
  if (quote) return { why: 'leaves a quote open' };
  if (inWord) argv.push(word);
  if (!argv.length) return { why: 'is empty' };
  if (BUILTINS.has(argv[0])) return { why: '"{name}" is a shell builtin; every line already runs from the project root', whyArgs: { name: argv[0] } };
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) return { why: 'sets an environment variable, which needs a shell' };
  return { argv };
}

// A refusal is a template so the room can say it in the human's language; this fills it in.
export const whyText = (command) => String(command?.why ?? '').replace(/\{(\w+)\}/g, (match, key) => command?.whyArgs?.[key] ?? match);

// The last ```pulse-run block of a reply, if it closes the reply. Returns null for anything else:
// a block quoted mid-answer is an example, and an example is not a request.
export function parseRunRequest(text) {
  const source = String(text ?? '');
  const blocks = [...source.matchAll(/```pulse-run\s*\n([\s\S]*?)```/gi)];
  if (!blocks.length) return null;
  const last = blocks.at(-1);
  if (source.slice(last.index + last[0].length).trim()) return null;

  const lines = last[1].split('\n').map((line) => line.trim()).filter(Boolean);
  const reason = lines[0] && !lines[0].startsWith('$') ? clip(lines[0], MAX_REASON) : null;
  const commands = [];
  const seen = new Set();
  for (const raw of lines.slice(reason ? 1 : 0)) {
    if (!raw.startsWith('$')) continue;
    const line = raw.slice(1).trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    if (commands.length === MAX_COMMANDS) break;
    if (line.length > MAX_LINE) { commands.push({ line: clip(line, MAX_LINE), why: 'is too long to read before pressing it' }); continue; }
    const split = splitCommand(line);
    commands.push(split.argv ? { line, argv: split.argv } : { line, why: split.why, ...(split.whyArgs ? { whyArgs: split.whyArgs } : {}) });
  }
  // A request without a reason asks the human to run something on faith.
  if (!reason || !commands.length) return null;
  return { reason, commands };
}

// What the reply reads as once the block has been lifted out of it: the room shows the commands
// as buttons, so leaving the raw fence in the text would say everything twice.
export function withoutRunRequest(text) {
  const source = String(text ?? '');
  if (!parseRunRequest(source)) return source;
  const last = [...source.matchAll(/```pulse-run\s*\n[\s\S]*?```/gi)].at(-1);
  return source.slice(0, last.index).trimEnd();
}
