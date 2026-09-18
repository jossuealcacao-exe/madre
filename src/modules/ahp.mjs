// AHP+: the one module that writes into the project, through a confirmed npx
// command. Verified project state, checkpoints and handoffs in .ahp/.

import { join, resolve } from 'node:path';
import { realpath } from 'node:fs/promises';
import { defineModule } from './sdk.mjs';
import { readJson, gitToplevel, findOnPath } from './helpers.mjs';

// AHP+ platform names for the agents MADRE knows about. Gemini has no AHP+
// adapter yet, so it is simply not requested.
const AHP_PLATFORMS = { codex: 'codex', claude: 'claude', opencode: 'opencode' };
const PACKAGE = '@jossuealcala/ahp-plus';
const VERSION = '1.4.1';

async function detect(projectRoot) {
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
}

// Refuses before anything is written when the outcome would be wrong.
async function preflight(projectRoot, { toplevel = gitToplevel, npx = findOnPath } = {}) {
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
}

function installCommand({ agents = [] }) {
  const platforms = agents.filter((agent) => agent.detected && AHP_PLATFORMS[agent.id]).map((agent) => AHP_PLATFORMS[agent.id]);
  const args = ['--yes', `${PACKAGE}@${VERSION}`, 'setup', '.'];
  if (platforms.length) args.push('--platforms', platforms.join(','));
  return { command: 'npx', args, platforms, display: ['npx', ...args].join(' ') };
}

export default defineModule({
  id: 'ahp',
  kind: 'installer',
  name: 'AHP+',
  vendor: 'Agent Handoff Protocol Plus',
  package: PACKAGE,
  version: VERSION,
  summary: 'Verified project state, checkpoints and handoffs between AI sessions, stored in .ahp/ next to your code.',
  creates: ['.ahp/ with manifest, sessions, handoffs and evidence', 'a project-local pin of @jossuealcala/ahp-plus', 'IDE adapter files for the detected agents'],
  detect, preflight, installCommand,
  async status(ctx) {
    const status = await detect(ctx.projectRoot);
    const plan = installCommand({ agents: ctx.agents });
    return { status, preflight: await preflight(ctx.projectRoot), install: { display: plan.display, platforms: plan.platforms } };
  },
});
