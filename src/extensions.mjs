import { execFile, spawn } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Optional modules a user can add to a project from the room, each installed
// by its own tool. PULSE stays a read-only consultation room: installing a
// module is the one action that writes into the project, so it only happens
// after an explicit confirmation and is recorded in the durable log.

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

// AHP+ platform names for the agents PULSE knows about. Gemini has no AHP+
// adapter yet, so it is simply not requested.
const AHP_PLATFORMS = { codex: 'codex', claude: 'claude', opencode: 'opencode' };

// Where does git think this project lives? AHP+ pins itself to the git root,
// so a project inside a bigger repository (or a home directory that was
// accidentally `git init`ed) would receive .ahp/ somewhere else entirely.
export async function gitToplevel(projectRoot) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { timeout: 5000 });
    return await realpath(stdout.trim()).catch(() => stdout.trim());
  } catch {
    return null;
  }
}

export async function findOnPath(name, envPath = process.env.PATH ?? '') {
  for (const directory of envPath.split(delimiter).filter(Boolean)) {
    const candidate = join(directory, name);
    if (await access(candidate).then(() => true, () => false)) return candidate;
  }
  return null;
}

export const EXTENSIONS = [
  {
    id: 'ahp',
    name: 'AHP+',
    vendor: 'Agent Handoff Protocol Plus',
    package: '@jossuealcala/ahp-plus',
    version: '1.4.1',
    summary: 'Verified project state, checkpoints and handoffs between AI sessions, stored in .ahp/ next to your code.',
    creates: ['.ahp/ with manifest, sessions, handoffs and evidence', 'a project-local pin of @jossuealcala/ahp-plus', 'IDE adapter files for the detected agents'],
    async detect(projectRoot) {
      const manifest = await readJson(join(projectRoot, '.ahp', 'manifest.json'));
      if (!manifest) return { installed: false };
      const pinned = await readJson(join(projectRoot, 'node_modules', '@jossuealcala', 'ahp-plus', 'package.json'));
      return {
        installed: true,
        version: pinned?.version ?? null,
        protocolVersion: manifest.protocol_version ?? null,
        projectId: manifest.project_id ?? null,
        detail: [pinned?.version ? `cli ${pinned.version}` : null, manifest.protocol_version ? `protocol ${manifest.protocol_version}` : null].filter(Boolean).join(' · '),
      };
    },
    // Refuses before anything is written when the outcome would be wrong.
    async preflight(projectRoot, { toplevel = gitToplevel, npx = findOnPath } = {}) {
      const root = await realpath(projectRoot).catch(() => resolve(projectRoot));
      const problems = [];
      if (!(await npx('npx'))) problems.push('npx is not on PATH for the PULSE server; start PULSE from a terminal where `npx --version` works.');
      const top = await toplevel(root);
      if (!top) {
        problems.push('The project is not a git repository. AHP+ pins itself to the git root: run `git init` in the project first.');
      } else if (top !== root) {
        problems.push(`The project's git root is ${top}, not the project itself. AHP+ would install there. Run \`git init\` inside the project, or remove the stray repository at ${top}.`);
      }
      return { ok: problems.length === 0, problems, gitRoot: top };
    },
    installCommand({ agents = [] }) {
      const platforms = agents
        .filter((agent) => agent.detected && AHP_PLATFORMS[agent.id])
        .map((agent) => AHP_PLATFORMS[agent.id]);
      const args = ['--yes', `${this.package}@${this.version}`, 'setup', '.'];
      if (platforms.length) args.push('--platforms', platforms.join(','));
      return { command: 'npx', args, platforms, display: ['npx', ...args].join(' ') };
    },
  },
];

export const extensionById = (id) => EXTENSIONS.find((extension) => extension.id === id) ?? null;

export async function listExtensions({ projectRoot, agents = [] }) {
  return Promise.all(EXTENSIONS.map(async (extension) => {
    const status = await extension.detect(projectRoot);
    const plan = extension.installCommand({ agents });
    const preflight = extension.preflight ? await extension.preflight(projectRoot) : { ok: true, problems: [] };
    return {
      id: extension.id,
      name: extension.name,
      vendor: extension.vendor,
      package: extension.package,
      version: extension.version,
      summary: extension.summary,
      creates: extension.creates,
      status,
      preflight,
      install: { display: plan.display, platforms: plan.platforms },
    };
  }));
}

// Runs one installer inside the project, streaming output lines. `runner`
// lets tests substitute the real installer with a local script.
export function runInstaller({ command, args, projectRoot, onLine, timeoutMs = 600000, heartbeatMs = 8000, env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, env: { ...env, NO_COLOR: '1', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const started = Date.now();
    let lastOutput = started;
    // Installers go quiet for long stretches (npm install, git status); say so.
    const heartbeat = setInterval(() => {
      if (Date.now() - lastOutput >= heartbeatMs) {
        onLine?.(`… still running · ${Math.round((Date.now() - started) / 1000)}s · installer is quiet (npm install or git status can take a while)`, 'heartbeat');
        lastOutput = Date.now();
      }
    }, Math.min(heartbeatMs, 2000));
    heartbeat.unref?.();
    let buffer = '';
    const feed = (chunk, stream) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line.trim()) { lastOutput = Date.now(); onLine?.(line, stream); }
      }
    };
    child.stdout.on('data', (chunk) => feed(String(chunk), 'stdout'));
    child.stderr.on('data', (chunk) => feed(String(chunk), 'stderr'));
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', (error) => { clearTimeout(timer); clearInterval(heartbeat); resolve({ code: 1, error: error.code === 'ENOENT' ? `${error.message} (is the project folder present and ${command} on PATH?)` : error.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      if (buffer.trim()) onLine?.(buffer.trim(), 'stdout');
      resolve({ code: code ?? 1 });
    });
  });
}
