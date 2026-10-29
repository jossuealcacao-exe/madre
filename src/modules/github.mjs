// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// GITHUB: the GitHub side of this project, in the room. /gh reads the open pull requests, the CI of
// the branch you are on and the open issues as a card everyone reads, agents included; and it
// opens a pull request, an issue or a comment the way /git push sends commits — the first call
// shows exactly what would be posted, and only `confirm` posts it.
//
// Agents get the same reads as MCP tools in any mode. The three writes are declared in `sends`,
// so the core withholds them below #4 AIRLOCK, and the server refuses them there as well.
//
// No credential of its own when it can help it: the `gh` CLI's session is used where gh is
// signed in, and MADRE never sees it. Only without one is a fine-grained token asked for, kept in
// MADRE's vault and handed to nothing but the request and the server process of one turn.

import { fileURLToPath } from 'node:url';
import { OutboundLog } from '../outbound.mjs';
import { t } from '../i18n.mjs';
import { defineModule } from './sdk.mjs';
import * as github from '../github.mjs';
import { READ_TOOLS, WRITE_TOOLS } from '../mcp/github-server.mjs';

const SERVER = fileURLToPath(new URL('../mcp/github-server.mjs', import.meta.url));
const SECRET = 'token';
// What gh and git need to find themselves and their configuration in a process the agent's CLI
// starts, which may hand on less of the environment than the room has.
const PASS = ['PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'GH_CONFIG_DIR', 'SystemRoot'];

// Words the card says, chosen at the moment it is said so they follow the room's language.
const ciWord = (state) => ({ success: t('passing'), failure: t('failing'), pending: t('running'), none: t('no checks yet') }[state] ?? state);
const prWord = (state) => ({ open: t('open'), closed: t('closed'), merged: t('merged') }[state] ?? state);
const reviewWord = (review) => (review.state === 'approved' ? t('approved by {who}', { who: review.approved.map((one) => `@${one}`).join(', ') })
  : review.state === 'changes requested' ? t('changes requested by {who}', { who: review.changesRequested.map((one) => `@${one}`).join(', ') })
    : t('no review yet'));
const mark = (state) => ({ success: '✓', failure: '✗', pending: '…' }[state] ?? '·');

// What is true of this project right now, for the card, a command or a turn.
async function where(ctx) {
  const env = ctx.env ?? process.env;
  const project = await github.projectRepo(ctx.projectRoot, { env });
  const token = await ctx.vault.get(SECRET).catch(() => null);
  const auth = await github.resolveAuth({ env, token });
  return { env, project, auth };
}

function problemsOf({ project, auth }) {
  const problems = [];
  if (!project.git) problems.push(t('This project is not a git repository, so there is no GitHub repository to read.'));
  else if (!project.repo) problems.push(t('No remote of this repository points at github.com. Add one with git remote add, or open the project that has it.'));
  if (!auth) problems.push(t('There is no GitHub session on this computer and no token in MADRE. Sign in with gh auth login, or paste a fine-grained token in Modules › GitHub.'));
  return problems;
}

const said = (error) => (error instanceof github.GithubError
  ? `${t(error.message)}${error.detail ? ` ${t('GitHub said: {detail}', { detail: error.detail })}` : ''}`
  : t('Something went wrong talking to GitHub: {message}', { message: error?.message ?? String(error) }));

// The composer splits on spaces, so quotes are put back together here: "a title with spaces"
// is one piece. A bare `confirm` at the end is the word that sends.
export function tokenize(args) {
  const line = (Array.isArray(args) ? args : [args]).join(' ');
  const pieces = [];
  for (const match of line.matchAll(/"([^"]*)"|“([^”]*)”|(\S+)/g)) {
    pieces.push(match[3] !== undefined ? { text: match[3], quoted: false } : { text: match[1] ?? match[2] ?? '', quoted: true });
  }
  const last = pieces[pieces.length - 1];
  const confirm = Boolean(last && !last.quoted && last.text.toLowerCase() === 'confirm');
  return { pieces: confirm ? pieces.slice(0, -1) : pieces, confirm };
}

// A title and an optional body: quoted pieces when there are any, the bare words otherwise.
function titleAndBody(pieces) {
  const quoted = pieces.filter((one) => one.quoted);
  if (quoted.length) return { title: quoted[0].text.trim(), body: (quoted[1]?.text ?? '').trim() };
  return { title: pieces.map((one) => one.text).join(' ').trim(), body: '' };
}

const quote = (text) => `"${text}"`;
const card = (title, text, ok = true) => ({ ok, title, text });

async function summary(ctx, { project, auth, env, log }) {
  const common = { repo: project.repo, auth, log, env };
  const branch = await github.currentBranch(ctx.projectRoot, { env });
  const [repo, pulls, ci] = await Promise.all([
    github.getRepo(common),
    github.listPulls({ ...common, limit: 100 }),
    branch ? github.ciStatus({ ...common, ref: branch }).catch((error) => ({ error })) : null,
  ]);
  const issues = Number.isFinite(repo.openIssuesAndPulls) ? Math.max(repo.openIssuesAndPulls - pulls.length, 0) : null;
  const lines = [
    `## ${project.repo.slug} · ${github.authLabel(auth)}`,
    t('Open pull requests: {n}', { n: pulls.length >= 100 ? '100+' : pulls.length }),
    t('Open issues: {n}', { n: issues ?? '?' }),
    !branch ? t('CI: the project is not on a branch.')
      : ci?.error ? t('CI on {branch}: {why}', { branch, why: said(ci.error) })
        : t('CI on {branch}: {state} ({n} checks)', { branch, state: ciWord(ci.state), n: ci.checks.length }),
  ];
  const mine = branch ? pulls.find((one) => one.branch === branch) : null;
  if (mine) lines.push(t('This branch has pull request #{n}: {title}', { n: mine.number, title: mine.title }));
  return card('GitHub', lines.join('\n'));
}

async function pulls(ctx, { project, auth, env, log }, which) {
  const common = { repo: project.repo, auth, log, env };
  if (!which) {
    const list = await github.listPulls({ ...common, limit: 30 });
    if (!list.length) return card('GitHub · pr', `## ${project.repo.slug}\n${t('No open pull requests.')}`);
    return card('GitHub · pr', [`## ${t('Open pull requests · {repo}', { repo: project.repo.slug })}`, ...list.map((pr) => `#${pr.number} ${pr.title} · @${pr.author} · ${pr.branch} → ${pr.base}${pr.draft ? ` · ${t('draft')}` : ''}`)].join('\n'));
  }
  const pr = await github.getPull({ ...common, number: which });
  const mergeable = pr.mergeable === true ? t('it can merge') : pr.mergeable === false ? t('it has conflicts') : t('GitHub is still working out whether it can merge');
  return card(`GitHub · pr #${pr.number}`, [
    `## #${pr.number} · ${pr.title}`,
    `${prWord(pr.state)}${pr.draft ? ` · ${t('draft')}` : ''} · @${pr.author}`,
    `${pr.branch} → ${pr.base} · ${mergeable}`,
    t('+{add} −{del} · {files} files · {commits} commits', { add: pr.additions ?? '?', del: pr.deletions ?? '?', files: pr.changedFiles ?? '?', commits: pr.commits ?? '?' }),
    t('Review: {state}', { state: reviewWord(pr.review) }),
    pr.url ?? '',
  ].filter(Boolean).join('\n'));
}

async function ci(ctx, { project, auth, env, log }) {
  const common = { repo: project.repo, auth, log, env };
  const branch = await github.currentBranch(ctx.projectRoot, { env });
  if (!branch) return card('GitHub · ci', t('The project is not on a branch, so there is no CI to ask about.'), false);
  const [status, runs] = await Promise.all([github.ciStatus({ ...common, ref: branch }), github.workflowRuns({ ...common, branch, limit: 5 }).catch(() => [])]);
  const lines = [`## ${t('CI on {branch}: {state}', { branch, state: ciWord(status.state) })}`, ...status.checks.map((one) => `${mark(one.state)} ${one.name}`)];
  if (runs.length) {
    lines.push('', `## ${t('Latest workflow runs')}`);
    for (const run of runs) lines.push(`${mark(run.status !== 'completed' ? 'pending' : run.conclusion === 'success' ? 'success' : 'failure')} ${run.name} · ${run.conclusion ?? run.status} · ${run.sha}`);
  }
  return card('GitHub · ci', lines.join('\n'));
}

async function issues(ctx, { project, auth, env, log }) {
  const list = await github.listIssues({ repo: project.repo, auth, log, env, limit: 30 });
  if (!list.length) return card('GitHub · issues', `## ${project.repo.slug}\n${t('No open issues.')}`);
  return card('GitHub · issues', [`## ${t('Open issues · {repo}', { repo: project.repo.slug })}`, ...list.map((one) => `#${one.number} ${one.title} · @${one.author}${one.labels.length ? ` · ${one.labels.join(', ')}` : ''}`)].join('\n'));
}

// The three writes. Each one is two steps, like /git push: without `confirm` it says exactly what
// would be posted, where and as whom, and posts nothing; with it, it posts that and nothing else.
const leaving = (again) => `\n\n${t('This posts under your name and cannot be undone from MADRE. Post it with: {command}', { command: again })}`;

async function openPull(ctx, { project, auth, env, log }, pieces, confirm) {
  const common = { repo: project.repo, auth, log, env };
  const { title, body } = titleAndBody(pieces);
  if (!title) return card('GitHub · pr create', t('Give it a title in quotes: /gh pr create "what it changes" ["more detail"]'), false);
  const branch = await github.currentBranch(ctx.projectRoot, { env });
  if (!branch) return card('GitHub · pr create', t('The project is not on a branch, so there is nothing to open a pull request from.'), false);
  if (!(await github.upstreamOf(ctx.projectRoot, { env }))) return card('GitHub · pr create', t('{branch} is not on GitHub yet. Push it first, then try again.', { branch }), false);
  const repo = await github.getRepo(common);
  if (repo.defaultBranch === branch) return card('GitHub · pr create', t('You are on {branch}, the default branch. A pull request goes from another branch into it.', { branch }), false);
  const shown = [
    `## ${confirm ? t('Opening a pull request on {repo}', { repo: project.repo.slug }) : t('Would open a pull request on {repo}', { repo: project.repo.slug })}`,
    t('Title: {title}', { title }),
    t('From {head} into {base}', { head: branch, base: repo.defaultBranch }),
    t('As: {who}', { who: github.authLabel(auth) }),
    body ? `${t('Description:')}\n${body}` : t('No description.'),
  ].join('\n');
  if (!confirm) return card('GitHub · pr create · preview', shown + leaving(`/gh pr create ${quote(title)}${body ? ` ${quote(body)}` : ''} confirm`));
  const made = await github.createPull({ ...common, title, body, head: branch, base: repo.defaultBranch });
  return card('GitHub · pr create', `## ${t('Opened pull request #{n} on {repo}', { n: made.number, repo: project.repo.slug })}\n${t('Title: {title}', { title })}\n${made.url ?? ''}`.trim());
}

async function postComment(ctx, { project, auth, env, log }, pieces, confirm) {
  const common = { repo: project.repo, auth, log, env };
  const [first, ...rest] = pieces;
  const which = Number(String(first?.text ?? '').replace(/^#/, ''));
  const quoted = rest.filter((one) => one.quoted);
  const text = (quoted.length ? quoted[0].text : rest.map((one) => one.text).join(' ')).trim();
  if (!Number.isInteger(which) || which < 1 || !text) return card('GitHub · comment', t('Say where and what: /gh comment 12 "the comment"'), false);
  // Read first: the preview names the thread by its title, so a wrong number is seen before it posts.
  const thread = await github.getIssue({ ...common, number: which });
  const about = { n: which, title: thread.title };
  const heading = thread.isPullRequest
    ? (confirm ? t('Commenting on pull request #{n} · {title}', about) : t('Would comment on pull request #{n} · {title}', about))
    : (confirm ? t('Commenting on issue #{n} · {title}', about) : t('Would comment on issue #{n} · {title}', about));
  const shown = [
    `## ${heading}`,
    t('On: {repo}', { repo: project.repo.slug }),
    t('As: {who}', { who: github.authLabel(auth) }),
    `${t('Comment:')}\n${text}`,
  ].join('\n');
  if (!confirm) return card('GitHub · comment · preview', shown + leaving(`/gh comment ${which} ${quote(text)} confirm`));
  const made = await github.comment({ ...common, number: which, body: text });
  return card('GitHub · comment', `## ${t('Commented on #{n} · {repo}', { n: which, repo: project.repo.slug })}\n${made.url ?? ''}`.trim());
}

async function openIssue(ctx, { project, auth, env, log }, pieces, confirm) {
  const common = { repo: project.repo, auth, log, env };
  const { title, body } = titleAndBody(pieces);
  if (!title) return card('GitHub · issue', t('Give it a title in quotes: /gh issue "what is wrong" ["more detail"]'), false);
  const shown = [
    `## ${confirm ? t('Opening an issue on {repo}', { repo: project.repo.slug }) : t('Would open an issue on {repo}', { repo: project.repo.slug })}`,
    t('Title: {title}', { title }),
    t('As: {who}', { who: github.authLabel(auth) }),
    body ? `${t('Description:')}\n${body}` : t('No description.'),
  ].join('\n');
  if (!confirm) return card('GitHub · issue · preview', shown + leaving(`/gh issue ${quote(title)}${body ? ` ${quote(body)}` : ''} confirm`));
  const made = await github.createIssue({ ...common, title, body });
  return card('GitHub · issue', `## ${t('Opened issue #{n} on {repo}', { n: made.number, repo: project.repo.slug })}\n${t('Title: {title}', { title })}\n${made.url ?? ''}`.trim());
}

export async function runGh(ctx, args = []) {
  const { pieces, confirm } = tokenize(args);
  const what = (pieces[0]?.quoted ? '' : pieces[0]?.text ?? '').toLowerCase();
  const facts = await where(ctx);
  const problems = problemsOf(facts);
  if (problems.length) return card('GitHub', problems.join('\n'), false);
  // In the room, fetch is already watched; gh is not fetch, so its line is written here.
  const log = facts.env.PULSE_OUTBOUND_LOG ? new OutboundLog({ file: facts.env.PULSE_OUTBOUND_LOG }) : null;
  const here = { ...facts, log };
  try {
    if (!what) return await summary(ctx, here);
    if (what === 'pr' && pieces[1]?.text?.toLowerCase() === 'create' && !pieces[1].quoted) return await openPull(ctx, here, pieces.slice(2), confirm);
    if (what === 'pr' || what === 'prs') return await pulls(ctx, here, pieces[1]?.text ?? null);
    if (what === 'ci' || what === 'checks') return await ci(ctx, here);
    if (what === 'issues') return await issues(ctx, here);
    if (what === 'comment') return await postComment(ctx, here, pieces.slice(1), confirm);
    if (what === 'issue') return await openIssue(ctx, here, pieces.slice(1), confirm);
    return card('GitHub', t('Unknown subcommand "{what}". Use /gh, /gh pr [n], /gh ci, /gh issues, /gh pr create "title", /gh comment <n> "text" or /gh issue "title".', { what }), false);
  } catch (error) {
    return card('GitHub', said(error), false);
  } finally {
    await log?.drain();
  }
}

export default defineModule({
  id: 'github',
  name: 'GitHub',
  vendor: 'MADRE · GitHub',
  version: '1.0.0',
  summary: 'Reads this project’s pull requests, issues and CI with your gh session or a token, and posts to GitHub only when you confirm it in the project or an agent works in #4 FULL ACCESS.',
  creates: ['nothing in the project', 'an entry in ~/.pulse/config.json', 'your token in MADRE’s vault, 0600, only if you paste one', 'an MCP server per turn, started and stopped by the project', 'a pull request, an issue or a comment on GitHub, only when you confirm it or an agent in #4 FULL ACCESS posts it'],
  requires: ['the project is a git repository', 'a remote on github.com', 'the gh CLI signed in (gh auth login), or a fine-grained token pasted here'],
  settings: { enabled: false },
  secrets: [{
    name: SECRET,
    label: 'Fine-grained token',
    note: 'Only needed without a gh session. Give it access to this repository with Contents read, Pull requests read and write, Issues read and write, and Checks and Actions read. You can revoke it on GitHub at any time.',
    where: 'https://github.com/settings/personal-access-tokens/new',
  }],
  reaches: github.REACHES,
  slash: [{
    name: 'gh',
    usage: '/gh [pr [n] | ci | issues | pr create "title" | comment <n> "text" | issue "title"] [confirm]',
    summary: 'GitHub for this project as a card: open pull requests, the CI of your branch and open issues. Opening a pull request, an issue or a comment first shows what would be posted, and posts it only with confirm.',
    execute: runGh,
  }],

  async status(ctx) {
    const facts = await where(ctx);
    const problems = problemsOf(facts);
    const ready = !problems.length;
    // Which credential and which repository, whenever both are there: the card says what it would use.
    const using = ready ? ` · ${github.authLabel(facts.auth)} · ${facts.project.repo.slug}` : '';
    return {
      status: {
        installed: Boolean(ctx.settings.enabled),
        detail: !ctx.settings.enabled ? (ready ? `${t('off · ready')}${using}` : t('off')) : ready ? `${t('on')}${using}` : t('on · not configured'),
      },
      preflight: { ok: ready, problems },
      install: { display: ctx.settings.enabled ? 'disable GitHub' : 'enable GitHub (config.json)', platforms: ['claude', 'codex', 'gemini', 'opencode'] },
    };
  },

  // The tools, for one turn. Reads at any rung; the writes ride along only at #4, and the server is
  // told so in its own environment, so it refuses them even if the list it was given were wrong.
  async toolsForTurn(ctx, turn) {
    const { env, project, auth } = await where(ctx);
    if (!project.repo || !auth) return [];
    const writes = Number(turn?.mode) === 4;
    const passed = Object.fromEntries(PASS.filter((name) => env[name]).map((name) => [name, env[name]]));
    const label = github.authLabel(auth);
    return [{
      name: 'github',
      command: process.execPath,
      args: [SERVER],
      env: {
        ...passed,
        PULSE_GITHUB_REPO: project.repo.slug,
        PULSE_GITHUB_ROOT: ctx.projectRoot,
        PULSE_GITHUB_AUTH: auth.kind,
        ...(auth.kind === 'gh' ? { PULSE_GITHUB_GH: auth.gh } : { PULSE_GITHUB_TOKEN: auth.token }),
        ...(writes ? { PULSE_GITHUB_WRITES: '1' } : {}),
        ...(env.PULSE_OUTBOUND_LOG ? { PULSE_OUTBOUND_LOG: env.PULSE_OUTBOUND_LOG } : {}),
      },
      tools: [...READ_TOOLS, ...WRITE_TOOLS],
      // What makes the room hold the writes back below #4. Declared here, enforced in modules/index.mjs.
      sends: [...WRITE_TOOLS],
      brief: `You can read GitHub for ${project.repo.slug}, signed in as ${label}, with the MCP tools of server github: ${READ_TOOLS.join(', ')}.${writes ? ` You can also write: ${WRITE_TOOLS.join(', ')}. Each posts under the human's name and cannot be undone from here: say in one line what will be posted and where, then do it.` : ''}`,
    }];
  },

  conditions: [{
    id: 'github-no-session',
    code: 'MU-056',
    severity: 'informational',
    title: 'GitHub: no gh session and no token',
    match: /no GitHub session on this computer|gh is on this computer but not signed in/i,
    diagnosis: 'The GitHub module uses the gh CLI when it is signed in, and a token kept in MADRE when it is not. Neither is there, so it has nothing to sign in with.',
    remedy: 'Sign in to gh once in your terminal, or paste a fine-grained token in Modules › GitHub, and open the card again.',
    fixes: { darwin: ['gh auth login'], linux: ['gh auth login'] },
  }, {
    id: 'github-rejected',
    code: 'MU-057',
    severity: 'blocking',
    title: 'GitHub: the session or the token was refused',
    match: /GitHub did not accept the (gh session|token)/i,
    diagnosis: 'GitHub answered 401: the gh session or the token MADRE holds is no longer valid. Tokens expire on the date chosen when they were made, and either can be revoked from GitHub.',
    remedy: 'Sign in to gh again, or make a new fine-grained token and paste it in Modules › GitHub in place of the old one.',
    fixes: { darwin: ['gh auth login'], linux: ['gh auth login'] },
  }, {
    id: 'github-no-remote',
    code: 'MU-058',
    severity: 'informational',
    title: 'GitHub: this project has no remote on github.com',
    match: /No remote of this repository points at github\.com/i,
    diagnosis: 'The GitHub module reads the repository from the project’s git remotes, and none of them is on github.com. Other hosts, GitHub Enterprise included, are not reached, so a credential for github.com never goes to them.',
    remedy: 'Add the GitHub repository as a remote in your terminal, or open the project that already has it, and look at Modules › GitHub again.',
    fixes: { darwin: ['git remote -v', 'git remote add origin git@github.com:OWNER/REPO.git'], linux: ['git remote -v', 'git remote add origin git@github.com:OWNER/REPO.git'] },
  }],
});
