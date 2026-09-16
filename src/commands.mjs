import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const exists = (path) => access(path).then(() => true, () => false);

// Slash commands the human types in the composer. Some are client-side
// (/create, /stopall, /image arm things in the UI); these run on the server,
// read-only, inside the project, and land in the room as a command card so
// agents and humans share the same facts without spending an agent turn.

async function run(command, args, cwd, timeout = 15000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout, env: { ...process.env, NO_COLOR: '1', GIT_PAGER: 'cat', PAGER: 'cat' }, maxBuffer: 2 * 1024 * 1024 });
    return { ok: true, text: `${stdout}${stderr ? `\n${stderr}` : ''}`.trim() };
  } catch (error) {
    return { ok: false, text: (error.stderr || error.stdout || error.message || '').toString().trim() };
  }
}

export const COMMANDS = [
  {
    name: 'git',
    module: 'git-pulse',
    title: 'Git Pulse',
    usage: '/git [status|log|diff|branches]',
    summary: 'Repository status, recent commits, uncommitted changes and branches, read-only, from the project itself.',
    async available({ projectRoot }) {
      return exists(join(projectRoot, '.git'));
    },
    async execute({ projectRoot, args }) {
      const what = (args[0] ?? 'status').toLowerCase();
      const sections = [];
      const add = async (title, gitArgs) => {
        const result = await run('git', gitArgs, projectRoot);
        sections.push(`## ${title}\n${result.text || '(nothing)'}`);
      };
      if (what === 'status' || what === 'all') {
        await add('branch', ['-c', 'color.ui=never', 'status', '-sb']);
        await add('changes', ['-c', 'color.ui=never', 'status', '--short']);
        await add('last commits', ['-c', 'color.ui=never', 'log', '--oneline', '--decorate', '-n', '8']);
      } else if (what === 'log') {
        await add('last commits', ['-c', 'color.ui=never', 'log', '--oneline', '--decorate', '--stat', '-n', String(Math.min(Number(args[1]) || 10, 50))]);
      } else if (what === 'diff') {
        await add('uncommitted diff (stat)', ['-c', 'color.ui=never', 'diff', '--stat']);
        await add('staged (stat)', ['-c', 'color.ui=never', 'diff', '--cached', '--stat']);
      } else if (what === 'branches') {
        await add('branches', ['-c', 'color.ui=never', 'branch', '-avv']);
      } else {
        return { ok: false, title: 'Git Pulse', text: `Unknown subcommand "${what}". Use /git status, /git log [n], /git diff or /git branches.` };
      }
      return { ok: true, title: `Git Pulse · ${what}`, text: sections.join('\n\n') };
    },
  },
  {
    name: 'ahp',
    module: 'ahp',
    title: 'AHP+',
    usage: '/ahp [status|check|context]',
    summary: 'Ask the AHP+ installed in this project for its verified status, checks or session context.',
    async available({ projectRoot }) {
      return exists(join(projectRoot, '.ahp', 'manifest.json')) && exists(join(projectRoot, 'node_modules', '.bin', 'ahp'));
    },
    async execute({ projectRoot, args }) {
      const what = (args[0] ?? 'status').toLowerCase();
      const map = {
        status: ['project', 'status', '.'],
        check: ['project', 'check', '.'],
        context: ['session', 'context', '.', '--format', 'markdown', '--budget', '4000'],
      };
      if (!map[what]) return { ok: false, title: 'AHP+', text: `Unknown subcommand "${what}". Use /ahp status, /ahp check or /ahp context.` };
      const result = await run(join(projectRoot, 'node_modules', '.bin', 'ahp'), map[what], projectRoot, 60000);
      return { ok: result.ok, title: `AHP+ · ${what}`, text: result.text || '(no output)' };
    },
  },
];

export const commandByName = (name) => COMMANDS.find((command) => command.name === String(name ?? '').toLowerCase()) ?? null;

export async function listCommands({ projectRoot }) {
  return Promise.all(COMMANDS.map(async (command) => ({
    name: command.name,
    module: command.module,
    title: command.title,
    usage: command.usage,
    summary: command.summary,
    available: await command.available({ projectRoot }),
  })));
}

// "/git log 5" → { name: 'git', args: ['log', '5'] }; null when not a command.
export function parseCommand(text) {
  const match = String(text ?? '').trim().match(/^\/([a-z][\w-]*)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1].toLowerCase(), args: (match[2] ?? '').trim().split(/\s+/).filter(Boolean), raw: match[0] };
}
