import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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
    return {
      id: extension.id,
      name: extension.name,
      vendor: extension.vendor,
      package: extension.package,
      version: extension.version,
      summary: extension.summary,
      creates: extension.creates,
      status,
      install: { display: plan.display, platforms: plan.platforms },
    };
  }));
}

// Runs one installer inside the project, streaming output lines. `runner`
// lets tests substitute the real installer with a local script.
export function runInstaller({ command, args, projectRoot, onLine, timeoutMs = 600000, env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, env: { ...env, NO_COLOR: '1', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    const feed = (chunk, stream) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line.trim()) onLine?.(line, stream);
      }
    };
    child.stdout.on('data', (chunk) => feed(String(chunk), 'stdout'));
    child.stderr.on('data', (chunk) => feed(String(chunk), 'stderr'));
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', (error) => { clearTimeout(timer); resolve({ code: 1, error: error.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (buffer.trim()) onLine?.(buffer.trim(), 'stdout');
      resolve({ code: code ?? 1 });
    });
  });
}
