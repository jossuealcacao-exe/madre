// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// AHP+: the one module that writes into the project, through a confirmed npx
// command. Verified project state, checkpoints and handoffs in .ahp/.

import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import { t } from '../i18n.mjs';
import { realpath } from 'node:fs/promises';
import { defineModule } from './sdk.mjs';
import { readJson, gitToplevel, findOnPath, packageVersion } from './helpers.mjs';

// AHP+ platform names for the agents MADRE knows about. Gemini has no AHP+
// adapter yet, so it is simply not requested.
const AHP_PLATFORMS = { codex: 'codex', claude: 'claude', opencode: 'opencode' };
const PACKAGE = '@jossuealcala/ahp-plus';
const VERSION = '1.4.2';

async function detect(projectRoot) {
  const manifest = await readJson(join(projectRoot, '.ahp', 'manifest.json'));
  if (!manifest) return { installed: false, detail: t('not in this project') };
  const pinned = await packageVersion(PACKAGE, { projectRoot });
  return {
    installed: true,
    version: pinned ?? null,
    protocolVersion: manifest.protocol_version ?? null,
    projectId: manifest.project_id ?? null,
    detail: [pinned ? `cli ${pinned}` : null, manifest.protocol_version ? `protocol ${manifest.protocol_version}` : null].filter(Boolean).join(' · '),
  };
}

// Whether git can run here. On a Mac, /usr/bin/git is there even without Apple's command line
// tools, and running it only opens their installer: git is ready when the tools are, or when a git
// of its own (Homebrew's) comes first on the PATH.
const execFileAsync = promisify(execFile);
export async function gitReady({ platform = process.platform, find = findOnPath, run = execFileAsync } = {}) {
  const git = await find('git');
  if (!git) return false;
  if (platform !== 'darwin' || git !== '/usr/bin/git') return true;
  return run('xcode-select', ['-p'], { timeout: 4000 }).then(() => true, () => false);
}

// Refuses before anything is written when the outcome would be wrong, and says what MADRE does
// first when it can do it for the person (2026-10-17): a project that does not use git yet gets
// `git init` from MADRE, in the same confirmed install, instead of a trip to the terminal. A Mac
// with no git gets the key that opens Apple's own installer.
async function preflight(projectRoot, { toplevel = gitToplevel, npx = findOnPath, git = gitReady, platform = process.platform } = {}) {
  const root = await realpath(projectRoot).catch(() => resolve(projectRoot));
  const problems = [];
  const prepare = [];
  let fix = null;
  if (!(await npx('npx'))) problems.push(t('npx is not on PATH for the MADRE server; start MADRE from a terminal where `npx --version` works.'));
  const top = await toplevel(root);
  if (!top) {
    if (await git()) {
      prepare.push({ command: 'git', args: ['init'], display: 'git init', note: t('The project does not use git yet. MADRE runs `git init` in it first: it adds a .git folder and leaves your files as they are.') });
    } else if (platform === 'darwin') {
      problems.push(t('Continuity keeps its history with git, and this Mac does not have it yet. Install it with Apple\'s command line tools: it takes a few minutes, then come back here.'));
      fix = { command: 'xcode-select', args: ['--install'], display: 'xcode-select --install', label: t('Install git') };
    } else {
      problems.push(t('Continuity keeps its history with git, and this computer does not have it yet. Install git with your system\'s package manager, then come back here.'));
    }
  } else if (top !== root) {
    problems.push(t('The project\'s git root is {top}, not the project itself. AHP+ would install there. Run `git init` inside the project, or remove the stray repository at {top}.', { top }));
  }
  return { ok: problems.length === 0, problems, gitRoot: top, prepare, fix };
}

function installCommand({ agents = [] }) {
  const platforms = agents.filter((agent) => agent.detected && AHP_PLATFORMS[agent.id]).map((agent) => AHP_PLATFORMS[agent.id]);
  const args = ['--yes', `${PACKAGE}@${VERSION}`, 'setup', '.'];
  if (platforms.length) args.push('--platforms', platforms.join(','));
  return { command: 'npx', args, platforms, display: ['npx', ...args].join(' ') };
}

// D-S16 · the project's canonical state, as Continuity keeps it in .ahp/ (AHP+ §4), in the short
// shape a connection may carry: where the project stands, its last handoff, what it decided and what
// is still open. Never the git details, the files, the evidence or the sessions: what a project
// knows, not where its code lives. Every text goes through `redact` (the serving room's privacy
// guard) and is clipped; a missing or unreadable .ahp/ is `null`, never an error.
export const STATE_DECISIONS = 30;
export const STATE_OPEN = 20;
const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'ACTIVE', 'PENDING']);
async function records(dir) {
  const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith('.json')).sort();
  return (await Promise.all(names.map((name) => readJson(join(dir, name))))).filter((record) => record && typeof record === 'object');
}
export async function readContinuity(projectRoot, { redact = (text) => text } = {}) {
  const base = join(projectRoot, '.ahp');
  const project = await readJson(join(base, 'state', 'project.json'));
  if (!project || typeof project !== 'object') return null;
  const say = (value, max = 400) => (typeof value === 'string' && value.trim() ? String(redact(value.replace(/\s+/g, ' ').trim())).slice(0, max) : null);
  const list = (value, max = 12) => (Array.isArray(value) ? value.map((item) => say(typeof item === 'string' ? item : item?.title ?? item?.description ?? '')).filter(Boolean).slice(0, max) : []);
  const byId = new Map();
  const kinds = { decisions: [], tasks: [], risks: [], bugs: [] };
  for (const kind of Object.keys(kinds)) {
    kinds[kind] = await records(join(base, 'records', kind));
    for (const record of kinds[kind]) if (typeof record.id === 'string') byId.set(record.id, record);
  }
  const titled = (ids) => (Array.isArray(ids) ? ids.map((id) => say(byId.get(id)?.title ?? (typeof id === 'string' && !/^[A-Z]+-\d{8}-[0-9A-F]+$/.test(id) ? id : ''), 200)).filter(Boolean) : []);
  const handoffs = (await records(join(base, 'handoffs'))).filter((one) => Number.isFinite(Date.parse(one.created_at))).sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
  const last = handoffs.at(-1) ?? null;
  const when = (record) => record.updated_at ?? record.created_at ?? null;
  const open = (records_) => records_.filter((record) => OPEN_STATUSES.has(String(record.status ?? '').toUpperCase())).sort((x, y) => Date.parse(when(y) ?? 0) - Date.parse(when(x) ?? 0)).slice(0, STATE_OPEN).map((record) => ({ title: say(record.title, 200), status: String(record.status).toUpperCase() })).filter((record) => record.title);
  return {
    source: 'ahp',
    project: {
      objective: say(project.objective), phase: say(project.phase, 40), confidence: say(project.confidence, 40), nextAction: say(project.next_action),
      blockers: list(project.blockers), updatedAt: project.updated_at ?? project.created_at ?? null,
    },
    handoff: last ? {
      at: last.created_at, from: say(last.from, 60), to: say(last.to, 60), objective: say(last.objective),
      completed: list(last.completed), inProgress: list(last.in_progress), pending: list(last.pending),
      decisions: titled(last.decisions), risks: titled(last.risks), blockers: list(last.blockers),
      nextAction: say(last.next_action), doneCriteria: list(last.done_criteria), notes: say(last.notes, 600),
    } : null,
    decisions: kinds.decisions.filter((record) => String(record.status ?? '').toUpperCase() === 'ACCEPTED')
      .sort((x, y) => Date.parse(when(y) ?? 0) - Date.parse(when(x) ?? 0)).slice(0, STATE_DECISIONS)
      .map((record) => ({ title: say(record.title, 200), description: say(record.description, 500), at: when(record) })).filter((record) => record.title),
    open: { tasks: open(kinds.tasks), risks: open(kinds.risks), bugs: open(kinds.bugs) },
  };
}

// The state as lines a model reads, oldest facts last. Said once, for the tool and for training.
export function continuityText(name, state) {
  if (!state) return null;
  const { project, handoff, decisions, open } = state;
  const lines = [`Project ${name} · canonical state (Continuity, AHP+) as of ${String(project.updatedAt ?? '').slice(0, 10) || 'an unknown date'}.`];
  if (project.objective) lines.push(`Objective: ${project.objective}`);
  if (project.phase || project.confidence) lines.push(`Phase: ${[...new Set([project.phase, project.confidence].filter(Boolean))].join(' · ')}`);
  if (project.nextAction) lines.push(`Next action: ${project.nextAction}`);
  if (project.blockers.length) lines.push(`Blockers: ${project.blockers.join('; ')}`);
  if (handoff) {
    lines.push(`Last handoff ${String(handoff.at).slice(0, 10)}${handoff.from ? ` from ${handoff.from}` : ''}${handoff.to ? ` to ${handoff.to}` : ''}:`);
    for (const [label, items] of [['done', handoff.completed], ['in progress', handoff.inProgress], ['pending', handoff.pending], ['decisions', handoff.decisions], ['risks', handoff.risks], ['blockers', handoff.blockers], ['done when', handoff.doneCriteria]]) if (items.length) lines.push(`- ${label}: ${items.join('; ')}`);
    if (handoff.nextAction) lines.push(`- next: ${handoff.nextAction}`);
    if (handoff.notes) lines.push(`- notes: ${handoff.notes}`);
  }
  if (decisions.length) lines.push('Accepted decisions:', ...decisions.map((one) => `- ${one.title}${one.description ? `: ${one.description}` : ''}`));
  for (const [label, items] of [['Open tasks', open.tasks], ['Open risks', open.risks], ['Open bugs', open.bugs]]) if (items.length) lines.push(`${label}: ${items.map((one) => `${one.title}${one.status !== 'OPEN' ? ` (${one.status.toLowerCase().replace('_', ' ')})` : ''}`).join('; ')}`);
  return lines.join('\n');
}

export default defineModule({
  id: 'ahp',
  kind: 'installer',
  name: 'Continuity',
  vendor: 'Agent Handoff Protocol Plus',
  package: PACKAGE,
  tracks: { name: PACKAGE, npm: PACKAGE },
  summary: 'Verified project state, checkpoints and handoffs between AI sessions, stored in .ahp/ next to your code.',
  requires: ['git on this computer (MADRE runs `git init` in the project when it does not use git yet)', 'npx on the PATH of the terminal MADRE was started from'],
  creates: ['.git/ when the project does not use git yet', '.ahp/ with manifest, sessions, handoffs and evidence', 'a project-local pin of @jossuealcala/ahp-plus', 'IDE adapter files for the detected agents'],
  detect, preflight, installCommand,
  async status(ctx) {
    const status = await detect(ctx.projectRoot);
    const plan = installCommand({ agents: ctx.agents });
    const checked = await preflight(ctx.projectRoot);
    return { status, runs: [{ name: PACKAGE, version: await packageVersion(PACKAGE, { projectRoot: ctx.projectRoot }), target: VERSION }], preflight: checked, install: { display: plan.display, platforms: plan.platforms, prepare: checked.prepare.map(({ display, note }) => ({ display, note })) } };
  },
});
