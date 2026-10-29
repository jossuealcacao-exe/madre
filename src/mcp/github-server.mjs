#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE GITHUB: a small MCP server (stdio, JSON-RPC 2.0) that lets an agent read the GitHub side
// of this project — pull requests, issues, checks — and, in #4 AIRLOCK only, open a pull request,
// open an issue or leave a comment. There is no MADRE in the middle: this process asks gh, or
// GitHub's API with the human's token, and nothing else.
//
// Reading comes back; writing does not. A comment carries the human's name the moment it lands,
// so three things hold, each somewhere a prompt cannot reach:
//
//   · The room hands the write tools to a turn only at #4 AIRLOCK (`sends` in the module, enforced
//     in src/modules/index.mjs). This server checks again: unless PULSE_GITHUB_WRITES=1 it does
//     not list them and refuses to run them.
//   · The credential is gh's own session, which this process never sees, or a token in its
//     environment. Neither is written anywhere: not in a result, not in the outbound log.
//   · The repository is the one the module found in the project's remotes. A tool cannot be
//     pointed at another one.
//
// Environment:
//   PULSE_GITHUB_REPO      required, owner/repo
//   PULSE_GITHUB_ROOT      the project, to read the current branch from git
//   PULSE_GITHUB_AUTH      'gh' or 'token'
//   PULSE_GITHUB_GH        the gh executable, with PULSE_GITHUB_AUTH=gh
//   PULSE_GITHUB_TOKEN     the token, with PULSE_GITHUB_AUTH=token (from MADRE's vault)
//   PULSE_GITHUB_WRITES    '1' only in a #4 AIRLOCK turn
//   PULSE_OUTBOUND_LOG     where each request leaves its line

import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { OutboundLog, declareDestinations } from '../outbound.mjs';
import * as github from '../github.mjs';

const SERVER_NAME = 'pulse-github';
const SERVER_VERSION = '1.0.0';
const SELF = fileURLToPath(import.meta.url);

export const READ_TOOLS = ['github_list_prs', 'github_get_pr', 'github_ci_status', 'github_list_issues', 'github_get_issue'];
export const WRITE_TOOLS = ['github_create_pr', 'github_comment', 'github_create_issue'];

const n = { type: 'integer', minimum: 1 };
export const TOOLS = [
  { name: 'github_list_prs', description: 'List the open pull requests of this project\'s GitHub repository: number, title, author, branch, base, draft.', inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 100, description: 'How many, newest first. Default 20.' } } } },
  { name: 'github_get_pr', description: 'One pull request: title, state, branch and base, whether it can merge, additions/deletions, changed files, and the review state.', inputSchema: { type: 'object', properties: { number: { ...n, description: 'The pull request number.' } }, required: ['number'] } },
  { name: 'github_ci_status', description: 'The checks and CI of a branch: one overall state (success, failure, pending, none), each check, and the latest workflow runs. Defaults to the branch the project is on.', inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'A branch, tag or commit. Default: the current branch.' } } } },
  { name: 'github_list_issues', description: 'List the open issues (not pull requests): number, title, author, labels, comment count.', inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 100, description: 'How many, newest first. Default 20.' } } } },
  { name: 'github_get_issue', description: 'One issue: title, state, author, labels and its text.', inputSchema: { type: 'object', properties: { number: { ...n, description: 'The issue number.' } }, required: ['number'] } },
  { name: 'github_create_pr', description: 'Open a pull request on GitHub under the human\'s name. It cannot be undone from here: before calling it, state in one line its title, from which branch and into which. The branch must already be pushed.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string', description: 'The description, Markdown.' }, head: { type: 'string', description: 'The branch to merge from. Default: the current branch.' }, base: { type: 'string', description: 'The branch to merge into. Default: the repository\'s default branch.' } }, required: ['title'] } },
  { name: 'github_comment', description: 'Post a comment on a pull request or issue under the human\'s name. It cannot be undone from here: before calling it, state in one line where it goes and what it says.', inputSchema: { type: 'object', properties: { number: { ...n, description: 'The pull request or issue number.' }, body: { type: 'string', description: 'The comment, Markdown.' } }, required: ['number', 'body'] } },
  { name: 'github_create_issue', description: 'Open an issue on GitHub under the human\'s name. It cannot be undone from here: before calling it, state in one line its title and what it says.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string', description: 'The text, Markdown.' } }, required: ['title'] } },
];

// What this process was handed, as the client wants it. The token is read here and only here.
export function contextFrom(env = process.env) {
  const [owner, repo] = String(env.PULSE_GITHUB_REPO ?? '').split('/');
  const auth = env.PULSE_GITHUB_AUTH === 'gh' && env.PULSE_GITHUB_GH ? { kind: 'gh', gh: env.PULSE_GITHUB_GH }
    : env.PULSE_GITHUB_AUTH === 'token' && env.PULSE_GITHUB_TOKEN ? { kind: 'token', token: env.PULSE_GITHUB_TOKEN }
      : null;
  // gh is handed an environment without the token variable it never needed.
  const { PULSE_GITHUB_TOKEN: _drop, ...clean } = env;
  return { repo: owner && repo ? { owner, repo, slug: `${owner}/${repo}` } : null, root: env.PULSE_GITHUB_ROOT || null, auth, writes: env.PULSE_GITHUB_WRITES === '1', env: clean };
}

let outbound = null;
function logFor(env) {
  if (!env.PULSE_OUTBOUND_LOG) return null;
  // This process has its own copy of the declarations; without this, its lines would read as an
  // address nothing here declares.
  declareDestinations('github', github.REACHES);
  outbound ??= new OutboundLog({ file: env.PULSE_OUTBOUND_LOG });
  return outbound;
}

export async function callTool(name, args = {}, { env = process.env, api = github } = {}) {
  const here = contextFrom(env);
  if (!here.repo) throw new github.GithubError('NO_REPO', 'No repository was handed to this server.');
  if (!here.auth) throw new github.GithubError('NO_CREDENTIAL', github.ERRORS.NO_SESSION);
  if (WRITE_TOOLS.includes(name) && !here.writes) throw new github.GithubError('NOT_AIRLOCK', 'Writing to GitHub needs a turn in #4 AIRLOCK. Nothing was posted.');
  const common = { repo: here.repo, auth: here.auth, log: logFor(env), env: here.env };
  const branch = async () => (here.root ? api.currentBranch(here.root, { env: here.env }) : null);
  switch (name) {
    case 'github_list_prs': return { repo: here.repo.slug, pulls: await api.listPulls({ ...common, limit: args.limit }) };
    case 'github_get_pr': return await api.getPull({ ...common, number: args.number });
    case 'github_ci_status': {
      const ref = String(args.ref ?? '').trim() || await branch();
      const [ci, runs] = await Promise.all([api.ciStatus({ ...common, ref }), api.workflowRuns({ ...common, branch: ref, limit: 5 }).catch(() => [])]);
      return { ...ci, runs };
    }
    case 'github_list_issues': return { repo: here.repo.slug, issues: await api.listIssues({ ...common, limit: args.limit }) };
    case 'github_get_issue': return await api.getIssue({ ...common, number: args.number });
    case 'github_create_pr': {
      const head = String(args.head ?? '').trim() || await branch();
      return await api.createPull({ ...common, title: args.title, body: args.body ?? '', head, base: String(args.base ?? '').trim() || null });
    }
    case 'github_comment': return await api.comment({ ...common, number: args.number, body: args.body });
    case 'github_create_issue': return await api.createIssue({ ...common, title: args.title, body: args.body ?? '' });
    default: throw new github.GithubError('UNKNOWN_TOOL', `Unknown tool: ${name}`);
  }
}

export function handleRequest(message, { env = process.env, api = github } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  const writes = env.PULSE_GITHUB_WRITES === '1';
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      // Below #4 the write tools are not merely refused: they are not here.
      return Promise.resolve(reply({ tools: TOOLS.filter((tool) => writes || !WRITE_TOOLS.includes(tool.name)) }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (!TOOLS.some((tool) => tool.name === name)) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      const writing = WRITE_TOOLS.includes(name);
      return callTool(name, args, { env, api })
        .then((result) => reply({ content: [{ type: 'text', text: writing ? `Posted to GitHub: ${JSON.stringify(result)}` : JSON.stringify(result) }], isError: false }))
        .catch((error) => {
          const detail = error.detail ? ` GitHub said: ${error.detail}` : '';
          const lead = writing ? 'Nothing was posted' : 'GitHub did not answer';
          return reply({ content: [{ type: 'text', text: `${lead} (${error.code ?? 'ERROR'}): ${error.message}${detail}` }], isError: true });
        });
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, env = process.env } = {}) {
  let buffer = '';
  let pending = 0;
  let ended = false;
  const finish = () => { if (ended && pending === 0) void (outbound?.drain() ?? Promise.resolve()).finally(() => process.exit(0)); };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`); continue; }
      pending += 1;
      void handleRequest(message, { env })
        .then((response) => { if (response) output.write(`${JSON.stringify(response)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  input.on('end', () => { ended = true; finish(); });
}

// Both paths resolved before they are compared: `new URL(import.meta.url).pathname` would be
// /C:/… on Windows (WIN-004), and a path through a symlink would never match its target.
const real = async (path) => (path ? realpath(path).catch(() => path) : null);
if (process.argv[1] && (await real(process.argv[1])) === (await real(SELF))) {
  if (!process.env.PULSE_GITHUB_REPO) {
    process.stderr.write('PULSE_GITHUB_REPO is required.\n');
    process.exit(2);
  }
  serve();
}
