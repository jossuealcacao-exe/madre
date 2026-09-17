import { execFile, spawn } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Optional room modules. Built-ins only change MADRE's local configuration;
// the external AHP+ installer can write into the selected project, so it
// requires explicit confirmation and records that action in the durable log.

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

// AHP+ platform names for the agents MADRE knows about. Gemini has no AHP+
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
      if (!(await npx('npx'))) problems.push('npx is not on PATH for the MADRE server; start MADRE from a terminal where `npx --version` works.');
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

// Built-in module: no project write, no npm. "Installing" it enables MADRE's own
// MCP image server for the CLIs that cannot generate images natively.
export const IMAGE_STUDIO = {
  id: 'image-studio',
  kind: 'builtin',
  name: 'Image Studio',
  vendor: 'MADRE · Gemini API',
  package: null,
  version: '0.1.0',
  summary: 'Gives Gemini CLI, Claude Code and OpenCode an image-generation tool through a MADRE-owned MCP server on the Gemini API image models, using your own Gemini key and credits. Attached only inside a creation lease with the image scope on.',
  creates: ['nothing in the project: images land in the lease directory like any artifact', 'an "image-studio" entry in ~/.pulse/config.json', 'an MCP server process per turn, started and stopped by the CLI'],
  requires: ['a Gemini API key with credits (the key the Gemini CLI stores, or GEMINI_API_KEY)'],
  models: ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'],
};
EXTENSIONS.push(IMAGE_STUDIO);

// Git Pulse: read-only repository facts in the room via /git. Nothing to
// install; it is on wherever the project is a git repository.
export const GIT_PULSE = {
  id: 'git-pulse',
  kind: 'builtin',
  name: 'Git Pulse',
  vendor: 'MADRE',
  package: null,
  version: '0.1.0',
  summary: 'Type /git in the composer to bring the repository\'s branch, uncommitted changes, recent commits or diff stats into the room as a shared fact card, without spending an agent turn.',
  creates: ['nothing: read-only git commands run inside the project'],
  requires: ['the project is a git repository'],
  models: [],
  commands: ['/git status', '/git log [n]', '/git diff', '/git branches'],
};
EXTENSIONS.push(GIT_PULSE);

export const ASHCODE = {
  id: 'ashcode',
  kind: 'builtin',
  name: 'AshCode',
  vendor: 'MADRE · ORDER 937',
  package: null,
  version: '0.1.0-beta',
  summary: 'Opt-in Spanish/English prompt and reply abbreviation. Keeps the original visible; may change meaning. Shorter characters do not guarantee fewer provider tokens.',
  creates: ['nothing in the project', 'an ashCode switch in ~/.pulse/config.json', 'original and abbreviated text in the room event log when applied'],
  requires: [],
  models: [],
};
EXTENSIONS.push(ASHCODE);

export const extensionById = (id) => EXTENSIONS.find((extension) => extension.id === id) ?? null;

export async function listExtensions({ projectRoot, agents = [], config = {}, imageKey = async () => null }) {
  return Promise.all(EXTENSIONS.map(async (extension) => {
    if (extension.id === 'git-pulse') {
      const isRepo = await gitToplevel(projectRoot);
      return {
        id: extension.id, kind: 'builtin', name: extension.name, vendor: extension.vendor, package: null, version: extension.version,
        summary: extension.summary, creates: extension.creates, requires: extension.requires, models: [], commands: extension.commands,
        status: { installed: Boolean(isRepo), detail: isRepo ? 'on · project is a git repository' : 'not a git repository' },
        preflight: isRepo ? { ok: true, problems: [] } : { ok: false, problems: ['Run `git init` in the project to use /git.'] },
        install: { display: '/git in the composer', platforms: [] },
        fixed: true,
      };
    }
    if (extension.id === 'ashcode') {
      const enabled = Boolean(config.modules?.ashCode?.enabled);
      return {
        id: extension.id, kind: 'builtin', name: extension.name, vendor: extension.vendor, package: null, version: extension.version,
        summary: extension.summary, creates: extension.creates, requires: [], models: [],
        status: { installed: enabled, detail: enabled ? 'on · beta · ORDER 937 available' : 'off · beta' },
        preflight: { ok: true, problems: [] },
        install: { display: enabled ? 'disable AshCode' : 'enable AshCode (config.json)', platforms: [] },
        warning: 'Beta: abbreviation may alter meaning or introduce errors. Review the original. Character reduction is not verified token savings.',
      };
    }
    if (extension.kind === 'builtin') {
      const enabled = Boolean(config.modules?.imageStudio?.enabled);
      const key = await imageKey();
      return {
        id: extension.id,
        kind: 'builtin',
        name: extension.name,
        vendor: extension.vendor,
        package: null,
        version: extension.version,
        summary: extension.summary,
        creates: extension.creates,
        requires: extension.requires,
        models: extension.models,
        model: config.modules?.imageStudio?.model ?? extension.models[0],
        status: { installed: enabled, detail: enabled ? `on · ${config.modules?.imageStudio?.model ?? extension.models[0]}${key ? '' : ' · no Gemini key found'}` : key ? 'key found' : 'no Gemini key found' },
        preflight: key ? { ok: true, problems: [] } : { ok: false, problems: ['No Gemini API key: sign in with the Gemini CLI (/auth → API key) or set GEMINI_API_KEY. Image models bill against that key\'s AI Studio credits.'] },
        install: { display: enabled ? 'disable Image Studio' : 'enable Image Studio (config.json)', platforms: ['gemini', 'claude', 'opencode'] },
      };
    }
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
