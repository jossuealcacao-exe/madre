// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// GitHub, as the GITHUB module and its MCP server both speak to it.
//
// Two ways in, and the order matters. First the `gh` CLI, if this computer has it and it is
// signed in: then MADRE holds no credential at all, the session lives where gh keeps it, and gh
// makes the request. Only without one, a fine-grained token the human pasted into MADRE's vault,
// sent as `Authorization: Bearer` from this process. Neither is ever written by this file: not
// in a result, not in an error, not in the outbound log.
//
// Everything that runs a process goes through `client.run`, without a shell and with an
// argument array (docs/WINDOWS.md, WIN-016): a title or a comment is somebody's words, and a
// shell would read `&`, `|` and `%VAR%` inside them. A `gh` that resolves to a .cmd or .bat shim
// cannot be run that way, so it is treated as absent and the token path is offered instead.
//
// What comes back is trimmed to what a person or an agent reads: numbers, names, states, links.
// GitHub's own payloads are large, and a turn pays for every character it is handed.

import { spawn } from 'node:child_process';
import { findExecutable } from './runtime-detection.mjs';

export const API_HOST = 'api.github.com';
const API = `https://${API_HOST}`;
const WEB_HOST = 'github.com';

// The four answers `src/outbound.mjs` asks of any destination. Here and not in the module
// because the MCP server is a process of its own and must declare the same thing to its log.
export const REACHES = [{
  id: 'api',
  host: API_HOST,
  to: 'GitHub · the repository of this project, with your own account',
  what: 'What you or an agent asked for: which pull requests, issues or checks to read, and — only when you confirm one or an agent in #4 AIRLOCK posts one — the title and text of a pull request, issue or comment. The credential is your gh session or your token.',
  when: 'When you type /gh in the room or an agent uses a GitHub tool. Writing needs your confirm in the room, or a turn in #4 AIRLOCK.',
  where: 'Modules › GitHub: switch it off, or forget its token, and nothing reaches GitHub.',
}];

// The seam every outside effect passes through, so a test can answer for git, gh and GitHub
// without any of them being installed and without a byte leaving the machine.
export const client = {
  which: (name, env = process.env) => findExecutable([name], env.PATH ?? '', env),
  run: runProcess,
  fetch: (...args) => globalThis.fetch(...args),
};

// One process, no shell, its output collected. `quiet` sends stdout nowhere: asking `gh auth
// token` whether a session exists must not bring the token into this process to find out.
export function runProcess(file, args, { input = null, env = process.env, cwd = undefined, timeout = 20000, quiet = false } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(file, args, { cwd, env, shell: false, windowsHide: true, stdio: [input == null ? 'ignore' : 'pipe', quiet ? 'ignore' : 'pipe', quiet ? 'ignore' : 'pipe'] });
    } catch (error) {
      resolve({ code: -1, stdout: '', stderr: '', error: error.code ?? 'SPAWN' });
      return;
    }
    let stdout = '';
    let stderr = '';
    let done = false;
    const finish = (result) => { if (!done) { done = true; clearTimeout(timer); resolve(result); } };
    const timer = setTimeout(() => { try { child.kill(); } catch { /* already gone */ } finish({ code: -1, stdout, stderr, error: 'TIMEOUT' }); }, timeout);
    child.stdout?.setEncoding('utf8').on('data', (chunk) => { if (stdout.length < 4 * 1024 * 1024) stdout += chunk; });
    child.stderr?.setEncoding('utf8').on('data', (chunk) => { if (stderr.length < 64 * 1024) stderr += chunk; });
    child.on('error', (error) => finish({ code: -1, stdout, stderr, error: error.code ?? 'SPAWN' }));
    child.on('close', (code) => finish({ code: code ?? -1, stdout, stderr }));
    if (input != null) { child.stdin.on('error', () => {}); child.stdin.end(input); }
  });
}

// ── The repository this project is ────────────────────────────────────────────────────────────

const SEGMENT = /^[A-Za-z0-9_.-]+$/;
const GITHUB_HOSTS = new Set([WEB_HOST, `www.${WEB_HOST}`, `ssh.${WEB_HOST}`]);

// `owner/repo` out of whatever a git remote says, for github.com only. Enterprise hosts and every
// other forge answer null: the module would otherwise send a credential for github.com to them.
export function repoFromRemote(url) {
  const text = String(url ?? '').trim();
  if (!text) return null;
  let host;
  let path;
  const scp = text.match(/^(?:[^@/\s]+@)?([^:/\s]+):(?!\/\/)(.+)$/);          // git@github.com:owner/repo.git
  if (scp && scp[2].includes('/')) {
    [, host, path] = scp;
  } else {
    let parsed;
    try { parsed = new URL(text); } catch { return null; }
    if (!['https:', 'http:', 'ssh:', 'git:', 'git+ssh:', 'ssh+git:'].includes(parsed.protocol)) return null;
    host = parsed.hostname;
    path = decodeURIComponent(parsed.pathname);
  }
  if (!GITHUB_HOSTS.has(String(host).toLowerCase())) return null;
  const parts = path.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '').split('/');
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!SEGMENT.test(owner) || !SEGMENT.test(repo) || /^\.+$/.test(owner) || /^\.+$/.test(repo)) return null;
  return { owner, repo, slug: `${owner}/${repo}` };
}

async function git(root, args, env) {
  const result = await client.run('git', ['-C', root, ...args], { env, timeout: 5000 });
  return result.code === 0 ? result.stdout.trim() : null;
}

// What the project says about itself: whether it is a repository, which remote is GitHub's, and
// the branch it is on. All of it read from git on this computer; nothing asks GitHub.
export async function projectRepo(root, { env = process.env } = {}) {
  if (!root) return { git: false, repo: null, remote: null };
  const top = await git(root, ['rev-parse', '--show-toplevel'], env);
  if (!top) return { git: false, repo: null, remote: null };
  const names = (await git(root, ['remote'], env) ?? '').split('\n').map((one) => one.trim()).filter(Boolean);
  const order = [...names.filter((one) => one === 'origin'), ...names.filter((one) => one === 'upstream'), ...names.filter((one) => one !== 'origin' && one !== 'upstream')];
  for (const remote of order) {
    const repo = repoFromRemote(await git(root, ['remote', 'get-url', remote], env));
    if (repo) return { git: true, repo, remote };
  }
  return { git: true, repo: null, remote: null, remotes: names.length };
}

export async function currentBranch(root, { env = process.env } = {}) {
  const branch = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], env);
  return branch && branch !== 'HEAD' ? branch : null;
}

// Whether the branch is on a remote at all. A pull request from a branch GitHub has never seen
// is refused there with a sentence about refs; saying «push it first» here is kinder.
export async function upstreamOf(root, { env = process.env } = {}) {
  return git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], env);
}

// ── Which credential ──────────────────────────────────────────────────────────────────────────

// A `gh` this file can run, signed in to github.com. Both questions are answered from files gh
// keeps on this computer: who is signed in from its config, and — only when the config names
// nobody — whether it holds a token at all, with stdout sent nowhere so the token never arrives.
export async function ghSession({ env = process.env } = {}) {
  // PULSE_GH=0 leaves gh out of it: the token is the only way in (and the suite asks nothing).
  if (env.PULSE_GH === '0') return null;
  const gh = await client.which('gh', env);
  if (!gh || /\.(cmd|bat)$/i.test(gh)) return null;
  const ghEnv = { ...env, GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' };
  const user = await client.run(gh, ['config', 'get', 'user', '-h', WEB_HOST], { env: ghEnv, timeout: 5000 });
  const login = user.code === 0 ? user.stdout.trim().split('\n')[0].trim() : '';
  if (login && /^[A-Za-z0-9-]+$/.test(login)) return { kind: 'gh', gh, login };
  const held = await client.run(gh, ['auth', 'token', '-h', WEB_HOST], { env: ghEnv, timeout: 5000, quiet: true });
  return held.code === 0 ? { kind: 'gh', gh, login: null } : null;
}

// Asked once a minute at most: a card is drawn often, and the answer changes when somebody signs
// in or out, which is not often.
const sessions = new Map();
export const forgetSession = () => sessions.clear();
export async function cachedSession({ env = process.env, ttlMs = 60000, now = Date.now() } = {}) {
  const key = String(env.PATH ?? '');
  const known = sessions.get(key);
  if (known && now - known.at < ttlMs) return known.session;
  const session = await ghSession({ env });
  sessions.set(key, { at: now, session });
  return session;
}

// The gh session when there is one, the token when there is not, null when neither.
export async function resolveAuth({ env = process.env, token = null, session = undefined } = {}) {
  const gh = session === undefined ? await cachedSession({ env }) : session;
  if (gh) return gh;
  const value = String(token ?? '').trim();
  return value ? { kind: 'token', token: value } : null;
}

// What a card or a brief may say about the credential: never the credential.
export const authLabel = (auth) => (auth?.kind === 'gh' ? `gh · ${auth.login ? `@${auth.login}` : 'github.com'}` : auth?.kind === 'token' ? 'token' : null);

// ── One request ───────────────────────────────────────────────────────────────────────────────

export class GithubError extends Error {
  constructor(code, message, { status = null, detail = null } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

// Fixed sentences, so a screen can say them in its own language. GitHub's own words, when it
// gives any, travel separately in `detail`.
export const ERRORS = {
  UNAUTHORIZED_GH: 'GitHub did not accept the gh session on this computer. Sign in again with gh auth login.',
  UNAUTHORIZED_TOKEN: 'GitHub did not accept the token. It may have expired or been revoked: make a new one and paste it in Modules › GitHub.',
  NOT_FOUND: 'GitHub says it is not there: the repository or that number is not visible with this credential.',
  RATE_LIMIT: 'This credential has used up its GitHub rate limit. Try again in a while.',
  FORBIDDEN: 'This credential is not allowed to do that here. A fine-grained token needs that permission on this repository.',
  INVALID: 'GitHub refused the request as it was written.',
  NETWORK: 'GitHub could not be reached from this computer.',
  NO_SESSION: 'gh is on this computer but not signed in. Sign in with gh auth login, or paste a token in Modules › GitHub.',
  FAILED: 'GitHub answered with an error.',
  INVALID_NUMBER: 'That is not a pull request or issue number.',
  NO_BRANCH: 'There is no branch to ask about: the project is not on one.',
  NO_TITLE: 'It needs a title.',
  NO_BODY: 'There is nothing to post.',
  NO_BASE: 'There is no base branch to open it against.',
};

function explain({ status, data, kind, rateLimited = false, stderr = '' }) {
  const said = typeof data?.message === 'string' ? data.message.slice(0, 200) : null;
  const errors = Array.isArray(data?.errors) ? data.errors.map((one) => (typeof one === 'string' ? one : one?.message ?? one?.code)).filter(Boolean).join('; ').slice(0, 300) : '';
  const detail = [said, errors].filter(Boolean).join(' · ') || null;
  if (status === 401) return new GithubError('UNAUTHORIZED', kind === 'gh' ? ERRORS.UNAUTHORIZED_GH : ERRORS.UNAUTHORIZED_TOKEN, { status });
  if (status === 404) return new GithubError('NOT_FOUND', ERRORS.NOT_FOUND, { status });
  if ((status === 403 || status === 429) && (rateLimited || /rate limit/i.test(`${said ?? ''} ${stderr}`))) return new GithubError('RATE_LIMIT', ERRORS.RATE_LIMIT, { status });
  if (status === 403) return new GithubError('FORBIDDEN', ERRORS.FORBIDDEN, { status, detail });
  if (status === 422) return new GithubError('INVALID', ERRORS.INVALID, { status, detail });
  return new GithubError(status ? `HTTP_${status}` : 'FAILED', ERRORS.FAILED, { status, detail });
}

// `gh api --include` prints the status line and headers, a blank line, then the body.
export function parseIncluded(text) {
  const raw = String(text ?? '');
  const split = raw.search(/\r?\n\r?\n/);
  const head = split >= 0 ? raw.slice(0, split) : raw;
  const body = split >= 0 ? raw.slice(split).replace(/^\r?\n\r?\n/, '') : '';
  const status = Number(head.match(/^HTTP\/[\d.]+\s+(\d{3})/)?.[1]) || null;
  const remaining = head.match(/^x-ratelimit-remaining:\s*(\d+)/im)?.[1];
  let data = null;
  try { data = body.trim() ? JSON.parse(body) : null; } catch { data = null; }
  return { status, data, rateLimited: remaining === '0' };
}

// One request to the REST API. `log` is an OutboundLog: gh makes its own connection, so its line
// is written here; fetch goes through the log's wrapper, which is the same wrapper the room
// already has installed — it notices that and does not count the request twice. Either way the
// line holds the method, the address, whether it went and how long it took. Never a body, never
// a header, never the credential.
export async function githubRequest({ method = 'GET', path, body = null, auth, log = null, env = process.env, timeoutMs = 20000 }) {
  if (!auth) throw new GithubError('NO_CREDENTIAL', ERRORS.NO_SESSION);
  if (!String(path ?? '').startsWith('/')) throw new GithubError('FAILED', ERRORS.FAILED);
  const verb = String(method).toUpperCase();
  const url = `${API}${path}`;
  const started = Date.now();
  if (auth.kind === 'gh') {
    const args = ['api', '--method', verb, '--include', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', path.replace(/^\/+/, '')];
    if (body != null) args.push('--input', '-');
    // GH_HOST pinned: a session for an enterprise host in the environment must not take this
    // request anywhere but the host the module declared.
    const result = await client.run(auth.gh, args, { env: { ...env, GH_HOST: WEB_HOST, GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' }, input: body != null ? JSON.stringify(body) : null, timeout: timeoutMs });
    const parsed = parseIncluded(result.stdout);
    const ok = Boolean(parsed.status && parsed.status < 300);
    log?.record({ url: url.split('?')[0], method: verb, status: parsed.status, ok, ms: Date.now() - started, ...(parsed.status ? {} : { error: result.error ?? 'GH' }) });
    if (ok) return { status: parsed.status, data: parsed.data };
    if (!parsed.status) {
      if (/auth login|not logged in|authentication/i.test(result.stderr)) throw new GithubError('NO_SESSION', ERRORS.NO_SESSION);
      throw new GithubError('NETWORK', ERRORS.NETWORK);
    }
    throw explain({ ...parsed, kind: 'gh', stderr: result.stderr });
  }
  // In the room, fetch is already watched and the request is logged there; wrapping it again
  // would count it twice. In the MCP server's own process nothing watches it but this.
  const send = log && !globalThis.fetch?.watched ? log.watch(client.fetch) : client.fetch;
  let response;
  try {
    response = await send(url, {
      method: verb,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'MADRE',
        authorization: `Bearer ${auth.token}`,
        ...(body != null ? { 'content-type': 'application/json' } : {}),
      },
      ...(body != null ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new GithubError('NETWORK', ERRORS.NETWORK);
  }
  const data = await response.json().catch(() => null);
  if (response.ok) return { status: response.status, data };
  throw explain({ status: response.status, data, kind: 'token', rateLimited: response.headers?.get?.('x-ratelimit-remaining') === '0' });
}

// ── What a person or an agent asks for, trimmed ───────────────────────────────────────────────

const cut = (text, max) => { const value = String(text ?? '').trim(); return value.length > max ? `${value.slice(0, max - 1)}…` : value; };
const base = (repo) => `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
const number = (value) => {
  const n = Number(String(value ?? '').replace(/^#/, ''));
  if (!Number.isInteger(n) || n < 1) throw new GithubError('INVALID_NUMBER', ERRORS.INVALID_NUMBER);
  return n;
};
const per = (value, fallback, max = 50) => Math.min(Math.max(Number(value) || fallback, 1), max);

export async function getRepo({ repo, ...rest }) {
  const { data } = await githubRequest({ path: base(repo), ...rest });
  return { slug: repo.slug, defaultBranch: data?.default_branch ?? null, private: Boolean(data?.private), openIssuesAndPulls: data?.open_issues_count ?? null, url: data?.html_url ?? null };
}

export async function listPulls({ repo, limit = 20, ...rest }) {
  const { data } = await githubRequest({ path: `${base(repo)}/pulls?state=open&per_page=${per(limit, 20, 100)}`, ...rest });
  return (Array.isArray(data) ? data : []).map((pr) => ({
    number: pr.number, title: cut(pr.title, 140), author: pr.user?.login ?? null, branch: pr.head?.ref ?? null, base: pr.base?.ref ?? null, draft: Boolean(pr.draft), updated: pr.updated_at ?? null, url: pr.html_url ?? null,
  }));
}

// The latest review of each reviewer decides; a comment after an approval does not undo it.
export function reviewState(reviews = []) {
  const latest = new Map();
  for (const review of Array.isArray(reviews) ? reviews : []) {
    const who = review?.user?.login;
    if (!who || !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
    latest.set(who, review.state);
  }
  const approved = [...latest].filter(([, state]) => state === 'APPROVED').map(([who]) => who);
  const changes = [...latest].filter(([, state]) => state === 'CHANGES_REQUESTED').map(([who]) => who);
  return { state: changes.length ? 'changes requested' : approved.length ? 'approved' : 'no review yet', approved, changesRequested: changes };
}

export async function getPull({ repo, number: n, ...rest }) {
  const id = number(n);
  const [{ data: pr }, { data: reviews }] = await Promise.all([
    githubRequest({ path: `${base(repo)}/pulls/${id}`, ...rest }),
    githubRequest({ path: `${base(repo)}/pulls/${id}/reviews?per_page=100`, ...rest }),
  ]);
  return {
    number: pr?.number ?? id,
    title: cut(pr?.title, 200),
    state: pr?.merged_at ? 'merged' : pr?.state ?? null,
    draft: Boolean(pr?.draft),
    author: pr?.user?.login ?? null,
    branch: pr?.head?.ref ?? null,
    base: pr?.base?.ref ?? null,
    mergeable: pr?.mergeable ?? null,
    mergeableState: pr?.mergeable_state ?? null,
    additions: pr?.additions ?? null,
    deletions: pr?.deletions ?? null,
    changedFiles: pr?.changed_files ?? null,
    commits: pr?.commits ?? null,
    review: reviewState(reviews),
    body: cut(pr?.body, 1200),
    url: pr?.html_url ?? null,
  };
}

// One word for a ref: the old commit statuses and the newer check runs, folded together. Any
// failure is a failure; anything still running is pending; nothing at all is said to be nothing.
export function foldChecks({ statuses = [], runs = [] }) {
  const checks = [
    ...statuses.map((one) => ({ name: one.context ?? 'status', state: one.state === 'success' ? 'success' : one.state === 'pending' ? 'pending' : 'failure' })),
    ...runs.map((one) => ({ name: one.name ?? 'check', state: one.status !== 'completed' ? 'pending' : ['success', 'neutral', 'skipped'].includes(one.conclusion) ? 'success' : 'failure' })),
  ];
  const state = !checks.length ? 'none' : checks.some((one) => one.state === 'failure') ? 'failure' : checks.some((one) => one.state === 'pending') ? 'pending' : 'success';
  return { state, checks: checks.slice(0, 30) };
}

export async function ciStatus({ repo, ref, ...rest }) {
  if (!ref) throw new GithubError('NO_BRANCH', ERRORS.NO_BRANCH);
  const at = encodeURIComponent(ref);
  const [{ data: combined }, { data: checks }] = await Promise.all([
    githubRequest({ path: `${base(repo)}/commits/${at}/status`, ...rest }),
    githubRequest({ path: `${base(repo)}/commits/${at}/check-runs?per_page=50`, ...rest }),
  ]);
  return { ref, ...foldChecks({ statuses: combined?.statuses ?? [], runs: checks?.check_runs ?? [] }) };
}

export async function workflowRuns({ repo, branch, limit = 5, ...rest }) {
  const query = `per_page=${per(limit, 5, 20)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`;
  const { data } = await githubRequest({ path: `${base(repo)}/actions/runs?${query}`, ...rest });
  return (data?.workflow_runs ?? []).map((run) => ({
    name: cut(run.name, 80), status: run.status ?? null, conclusion: run.conclusion ?? null, event: run.event ?? null, sha: String(run.head_sha ?? '').slice(0, 7), created: run.created_at ?? null, url: run.html_url ?? null,
  }));
}

export async function listIssues({ repo, limit = 20, ...rest }) {
  const { data } = await githubRequest({ path: `${base(repo)}/issues?state=open&per_page=${per(limit, 20, 100)}`, ...rest });
  // The issues endpoint lists pull requests too; they have their own list.
  return (Array.isArray(data) ? data : []).filter((issue) => !issue.pull_request).map((issue) => ({
    number: issue.number, title: cut(issue.title, 140), author: issue.user?.login ?? null, labels: (issue.labels ?? []).map((one) => (typeof one === 'string' ? one : one?.name)).filter(Boolean).slice(0, 6), comments: issue.comments ?? 0, updated: issue.updated_at ?? null, url: issue.html_url ?? null,
  }));
}

export async function getIssue({ repo, number: n, ...rest }) {
  const { data: issue } = await githubRequest({ path: `${base(repo)}/issues/${number(n)}`, ...rest });
  return {
    number: issue?.number ?? number(n), title: cut(issue?.title, 200), state: issue?.state ?? null, author: issue?.user?.login ?? null,
    labels: (issue?.labels ?? []).map((one) => (typeof one === 'string' ? one : one?.name)).filter(Boolean).slice(0, 10),
    comments: issue?.comments ?? 0, isPullRequest: Boolean(issue?.pull_request), body: cut(issue?.body, 1500), url: issue?.html_url ?? null,
  };
}

// ── Writes. Each one posts under the human's name and does not come back. ─────────────────────

const required = (value, code) => {
  const text = String(value ?? '').trim();
  if (!text) throw new GithubError(code, ERRORS[code]);
  return text;
};

export async function createPull({ repo, title, body = '', head, base: into = null, ...rest }) {
  const target = into || (await getRepo({ repo, ...rest })).defaultBranch;
  const { data } = await githubRequest({ method: 'POST', path: `${base(repo)}/pulls`, body: { title: required(title, 'NO_TITLE'), head: required(head, 'NO_BRANCH'), base: required(target, 'NO_BASE'), body: String(body ?? '') }, ...rest });
  return { number: data?.number ?? null, url: data?.html_url ?? null, head, base: target };
}

export async function comment({ repo, number: n, body, ...rest }) {
  const { data } = await githubRequest({ method: 'POST', path: `${base(repo)}/issues/${number(n)}/comments`, body: { body: required(body, 'NO_BODY') }, ...rest });
  return { number: number(n), url: data?.html_url ?? null };
}

export async function createIssue({ repo, title, body = '', ...rest }) {
  const { data } = await githubRequest({ method: 'POST', path: `${base(repo)}/issues`, body: { title: required(title, 'NO_TITLE'), body: String(body ?? '') }, ...rest });
  return { number: data?.number ?? null, url: data?.html_url ?? null };
}
