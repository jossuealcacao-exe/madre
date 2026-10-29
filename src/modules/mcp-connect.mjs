// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// CONNECT MCP: MCP servers a person adds to one project, for its agents (2026-10-14).
//
// The settings live in the project's Settings › Connect MCP, and only there: this module has no
// card in MODULES (`card: 'settings'`). What it does, in the order a server goes through it:
//
//   1. Added by hand (a command, or an address with no sign-in, a token or OAuth) or imported from
//      the person's other apps (.mcp.json, Claude Code, Codex, Gemini CLI, Cursor, opencode.json).
//      Secrets go to the vault; src/mcp/connect.mjs says how.
//   2. Checked at once: MADRE starts it through the same proxy a turn uses, does the MCP
//      handshake and reads its tools. A server that does not answer stays out of every turn and
//      its row says why, so a broken server costs a line in Settings, never a turn.
//   3. Handed to the turns of this project, through src/mcp/proxy.mjs, with the tools that read
//      from #1 and the ones that act from the mode chosen for it (#4 unless lowered).

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineModule } from './sdk.mjs';
import { summary as vaultSummary } from '../vault.mjs';
import { declareDestinations } from '../outbound.mjs';
import { t } from '../i18n.mjs';
import {
  ACTION_MODES, SERVER_ID, authorizeUrl, cleanServer, discoverOAuth, exchangeCode, forgetServerSecrets,
  grantFrom, importable, keepOAuth, keepSecrets, pkce, readMcp, readOAuth, registerClient, writeMcp,
} from '../mcp/connect.mjs';

export const PROXY = fileURLToPath(new URL('../mcp/proxy.mjs', import.meta.url));
const CHECK_MS = 30000;

// The argv every CLI is given for a connected server: the proxy, the project and the server. No
// secret, ever; the allowed tools travel so the proxy can refuse the others.
export const proxyArgs = ({ stateRoot, projectRoot, id, allow = null }) => [PROXY, '--state', stateRoot, '--project', projectRoot, '--server', id, ...(allow ? ['--allow', allow.join(',')] : [])];

// Starts the server the way a turn would and asks it what it has. Resolves with its tools — each
// with whether it only reads — or with the reason it did not answer.
export function checkServer({ stateRoot, projectRoot, id, timeoutMs = CHECK_MS, command = process.execPath }) {
  return new Promise((resolve) => {
    let child;
    let out = '';
    let err = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child?.stdin.end(); child?.kill('SIGTERM'); } catch { /* gone */ }
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, problem: t('it did not answer within {seconds}s', { seconds: Math.round(timeoutMs / 1000) }) }), timeoutMs);
    try {
      child = spawn(command, proxyArgs({ stateRoot, projectRoot, id }), { cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
    } catch (error) { finish({ ok: false, problem: error.message }); return; }
    const send = (message) => { if (!settled) child.stdin.write(`${JSON.stringify(message)}\n`); };
    child.stdin.on('error', () => {});
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { err = `${err}${chunk}`.slice(-2000); });
    child.on('error', (error) => finish({ ok: false, problem: error.message }));
    child.on('close', (code) => finish({ ok: false, problem: lastLine(err) ?? t('it exited with code {code} before it spoke', { code }) }));
    let info = null;
    child.stdout.on('data', (chunk) => {
      out += chunk;
      for (let newline = out.indexOf('\n'); newline >= 0; newline = out.indexOf('\n')) {
        const line = out.slice(0, newline).trim();
        out = out.slice(newline + 1);
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1) {
          if (message.error) { finish(authFailure(message.error.message) ?? { ok: false, problem: String(message.error.message ?? 'initialize failed').slice(0, 300) }); return; }
          info = message.result?.serverInfo ?? null;
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
        } else if (message.id === 2) {
          if (message.error) { finish(authFailure(message.error.message) ?? { ok: false, problem: String(message.error.message ?? 'tools/list failed').slice(0, 300) }); return; }
          const tools = (message.result?.tools ?? []).filter((tool) => typeof tool?.name === 'string').slice(0, 200).map((tool) => ({
            name: tool.name,
            readOnly: tool.annotations?.readOnlyHint === true,
            description: String(tool.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
          }));
          finish({ ok: true, tools, server: info ? { name: String(info.name ?? ''), version: String(info.version ?? '') } : null });
          return;
        }
      }
    });
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'madre', version: '1' } } });
  });
}
const lastLine = (text) => String(text ?? '').trim().split('\n').filter(Boolean).at(-1)?.replace(/^MADRE MCP [^:]+:\s*/, '').slice(0, 300) ?? null;
const authFailure = (message) => (/MADRE_AUTH_REQUIRED/.test(String(message ?? '')) ? { ok: false, needsAuth: true, problem: /refused the credentials/.test(String(message)) ? t('The server refused the credentials. Check the token.') : t('Sign in to this server again.') } : null);

// What a turn is handed for one server: the tools that read, and the ones that act when the mode
// allows them. Nothing for a ghost, nothing unchecked, nothing for an agent it was not given to.
export function serverForTurn(server, { stateRoot, projectRoot, agent, mode }) {
  if (!server.enabled || server.problem || !server.tools?.length || mode === 0) return null;
  if (server.agents && !server.agents.includes(agent)) return null;
  const reading = server.tools.filter((tool) => tool.readOnly).map((tool) => tool.name);
  const acting = server.tools.filter((tool) => !tool.readOnly).map((tool) => tool.name);
  const actionsFrom = ACTION_MODES.includes(server.actions) ? server.actions : 4;
  const acts = mode >= actionsFrom;
  const tools = acts ? [...reading, ...acting] : reading;
  if (!tools.length) return null;
  return {
    name: server.id,
    command: process.execPath,
    args: proxyArgs({ stateRoot, projectRoot, id: server.id, allow: tools }),
    env: {},
    tools,
    // The core keeps the rule for #4 itself: tools that act and need #4 are declared as sending.
    sends: actionsFrom === 4 ? acting : [],
    brief: `${server.label}${server.server?.name && server.server.name !== server.label ? ` (${server.server.name})` : ''}, connected by the human for this project.${acting.length ? acts ? ' Its tools that act are on in this turn: say what you will do before calling one.' : ` Only its tools that read are on; the ones that act need #${actionsFrom}.` : ''}`,
  };
}

// What Settings shows: everything but values. Whether a secret is held is said by name.
async function publicServers(ctx) {
  const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
  const held = new Set((await vaultSummary(ctx.stateRoot, 'mcp').catch(() => [])).map((one) => one.name));
  return Promise.all(servers.map(async (server) => ({
    ...server,
    signedIn: server.auth === 'oauth' ? Boolean((await readOAuth(ctx.stateRoot, server.id))?.access_token) : undefined,
    tokenHeld: server.auth === 'token' ? held.has(`${server.id}_token`) : undefined,
  })));
}

async function saveChecked(ctx, server) {
  const check = await checkServer({ stateRoot: ctx.stateRoot, projectRoot: ctx.projectRoot, id: server.id });
  const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
  const next = servers.map((one) => (one.id === server.id ? {
    ...one,
    tools: check.ok ? check.tools : one.tools,
    server: check.ok ? check.server : one.server ?? null,
    checkedAt: new Date().toISOString(),
    problem: check.ok ? null : check.problem,
    needsAuth: check.needsAuth || undefined,
  } : one));
  await writeMcp(ctx.stateRoot, ctx.projectRoot, { servers: next });
  await ctx.record('mcp.checked', { id: server.id, ok: check.ok, tools: check.ok ? check.tools.length : undefined, problem: check.ok ? undefined : check.problem });
  return check;
}

// A refusal of cleanServer, in the room's language: its slots filled, a command's reason too.
const said = ({ error, errorArgs = {} }) => t(error, { ...errorArgs, ...(errorArgs.why ? { why: t(errorArgs.why, errorArgs.whyArgs ?? {}) } : {}) });
const refuseFromPhone = (viaPhone) => (viaPhone ? { status: 403, body: { error: t('MCP servers are connected from the computer, not from the phone.') } } : null);
// Sign-ins in flight: the state the server will send back, and what is needed to finish.
const pending = new Map();   // state -> { id, verifier, clientId, redirectUri, authorization, resource, at }

export default defineModule({
  id: 'mcp',
  name: 'Outside tools (MCP)',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'MCP servers you add to this project, for its agents: a command on this computer or an address on the internet. Each one is started and checked before any agent can use it; tools that read work from #1, tools that act from the mode you choose.',
  creates: ['the list of servers, kept in MADRE\'s own folder for this project, never inside the project', 'its secrets in MADRE\'s vault, never in the list'],
  requires: ['nothing; a server is checked when you add it'],
  card: 'settings',
  settings: { enabled: true },
  async status(ctx) {
    const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
    const ready = servers.filter((one) => one.enabled && !one.problem && one.tools?.length).length;
    return { status: { installed: true, detail: servers.length ? t('{ready} of {total} tools ready', { ready, total: servers.length }) : t('no tools yet') } };
  },
  async toolsForTurn(ctx, turn) {
    const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
    return servers.map((server) => serverForTurn(server, { stateRoot: ctx.stateRoot, projectRoot: ctx.projectRoot, agent: turn.agent, mode: Number(turn.mode) })).filter(Boolean);
  },
  routes: [
    { method: 'GET', path: '/api/x/mcp/servers', async handler(ctx) { return { status: 200, body: { servers: await publicServers(ctx) } }; } },
    {
      method: 'POST', path: '/api/x/mcp/servers',
      async handler(ctx, { payload, viaPhone }) {
        const refused = refuseFromPhone(viaPhone); if (refused) return refused;
        const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
        const before = servers.find((one) => one.id === payload?.id);
        const made = cleanServer({ ...payload, replace: Boolean(payload?.replace && before) }, { existing: servers });
        if (made.error) return { status: 400, body: { error: said(made) } };
        const kept = await keepSecrets(ctx.stateRoot, made.secrets);
        if (!kept.ok) return { status: 400, body: { error: t(kept.error) } };
        // An edit keeps what the check learned until it is checked again.
        const server = before ? { ...made.server, tools: before.tools, server: before.server } : made.server;
        await writeMcp(ctx.stateRoot, ctx.projectRoot, { servers: [...servers.filter((one) => one.id !== server.id), server] });
        await ctx.record('mcp.connected', { id: server.id, transport: server.transport, auth: server.auth });
        const check = server.auth === 'oauth' && !(await readOAuth(ctx.stateRoot, server.id))?.access_token ? { ok: false, needsAuth: true } : await saveChecked(ctx, server);
        return { status: 200, body: { check, servers: await publicServers(ctx) } };
      },
    },
    {
      method: 'POST', path: /^\/api\/x\/mcp\/servers\/([a-z][a-z0-9-]{0,30})\/(check|toggle|actions|agents|remove)$/,
      async handler(ctx, { payload, params: [id, what], viaPhone }) {
        const refused = refuseFromPhone(viaPhone); if (refused) return refused;
        const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
        const server = servers.find((one) => one.id === id);
        if (!server) return { status: 404, body: { error: t('That server is not connected in this project.') } };
        if (what === 'check') return { status: 200, body: { check: await saveChecked(ctx, server), servers: await publicServers(ctx) } };
        if (what === 'remove') {
          await forgetServerSecrets(ctx.stateRoot, server);
          await writeMcp(ctx.stateRoot, ctx.projectRoot, { servers: servers.filter((one) => one.id !== id) });
          await ctx.record('mcp.removed', { id });
          return { status: 200, body: { servers: await publicServers(ctx) } };
        }
        const change = what === 'toggle' ? { enabled: payload?.enabled === true }
          : what === 'actions' ? { actions: ACTION_MODES.includes(Number(payload?.actions)) ? Number(payload.actions) : server.actions }
            : { agents: Array.isArray(payload?.agents) && payload.agents.length ? payload.agents.filter((one) => /^[a-z0-9_-]+$/.test(one)) : null };
        await writeMcp(ctx.stateRoot, ctx.projectRoot, { servers: servers.map((one) => (one.id === id ? { ...one, ...change } : one)) });
        return { status: 200, body: { servers: await publicServers(ctx) } };
      },
    },
    // What the person's other apps already have: names, places and what kind; never a value.
    {
      method: 'GET', path: '/api/x/mcp/import',
      async handler(ctx, { viaPhone }) {
        const refused = refuseFromPhone(viaPhone); if (refused) return refused;
        const found = await importable({ projectRoot: ctx.projectRoot });
        const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
        return { status: 200, body: { found: found.map((one, index) => ({ index, source: one.source, name: one.name, id: one.id, transport: one.transport, where: one.url ?? one.command?.join(' ') ?? '', env: Object.keys(one.env ?? {}), headers: Object.keys(one.headers ?? {}), disabled: one.disabled, taken: servers.some((server) => server.id === one.id) })) } };
      },
    },
    {
      method: 'POST', path: '/api/x/mcp/import',
      async handler(ctx, { payload, viaPhone }) {
        const refused = refuseFromPhone(viaPhone); if (refused) return refused;
        const found = await importable({ projectRoot: ctx.projectRoot });
        const picks = (Array.isArray(payload?.picks) ? payload.picks : []).map(Number).filter((index) => Number.isInteger(index) && found[index]);
        const results = [];
        for (const index of picks) {
          const one = found[index];
          const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
          // Every value an app kept is treated as a secret: the vault is the only place it goes.
          const quote = (word) => (/[\s"'\\$`|&;<>()*?[#~]/.test(word) ? `'${String(word).replace(/'/g, '')}'` : word);
          const made = cleanServer({
            id: one.id, label: one.name, transport: one.transport, url: one.url, auth: one.url && Object.keys(one.headers ?? {}).some((name) => name.toLowerCase() === 'authorization') ? 'none' : 'none',
            command: one.command ? one.command.map(quote).join(' ') : '',
            env: Object.entries(one.env ?? {}).map(([name, value]) => ({ name, value: String(value), secret: true })),
            headers: Object.entries(one.headers ?? {}).map(([name, value]) => ({ name, value: String(value), secret: true })),
            enabled: !one.disabled,
          }, { existing: servers });
          if (made.error) { results.push({ id: one.id, ok: false, problem: said(made) }); continue; }
          const kept = await keepSecrets(ctx.stateRoot, made.secrets);
          if (!kept.ok) { results.push({ id: one.id, ok: false, problem: t(kept.error) }); continue; }
          await writeMcp(ctx.stateRoot, ctx.projectRoot, { servers: [...servers, made.server] });
          await ctx.record('mcp.connected', { id: made.server.id, transport: made.server.transport, auth: made.server.auth, from: one.source });
          const check = await saveChecked(ctx, made.server);
          results.push({ id: made.server.id, ok: check.ok, problem: check.problem, needsAuth: check.needsAuth });
        }
        return { status: 200, body: { results, servers: await publicServers(ctx) } };
      },
    },
    // OAuth: the page asks for the address to open; the server comes back to the callback below.
    {
      method: 'POST', path: /^\/api\/x\/mcp\/servers\/([a-z][a-z0-9-]{0,30})\/signin$/,
      async handler(ctx, { params: [id], viaPhone, url }) {
        const refused = refuseFromPhone(viaPhone); if (refused) return refused;
        const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
        const server = servers.find((one) => one.id === id && one.transport === 'http');
        if (!server) return { status: 404, body: { error: t('That server is not connected in this project.') } };
        // MADRE's own process reaches this server to sign in: the list of what left the machine
        // names it as the server the person connected, not as an address nothing declares.
        declareDestinations('mcp', [{ id: server.id, host: new URL(server.url).hostname, to: t('{name} · an MCP server you connected', { name: server.label }), what: t('the sign-in: how to sign in, the registration of MADRE and the token'), when: t('when you press Sign in on it'), where: t('Settings › Outside tools (MCP)') }]);
        const found = await discoverOAuth(server.url).catch((error) => ({ ok: false, problem: error.message }));
        if (!found.ok) return { status: 409, body: { error: t(found.problem) } };
        const redirectUri = `${url.origin}/api/x/mcp/oauth/callback`;
        const client = await registerClient(found.authorization, redirectUri).catch((error) => ({ ok: false, problem: error.message }));
        if (!client.ok) return { status: 409, body: { error: t('The server did not let MADRE register: {problem}', { problem: client.problem }) } };
        const { verifier, challenge } = pkce();
        const state = randomBytes(18).toString('hex');
        for (const [key, one] of pending) if (Date.now() - one.at > 15 * 60000) pending.delete(key);
        pending.set(state, { id, verifier, clientId: client.clientId, redirectUri, authorization: found.authorization, resource: found.resource, at: Date.now() });
        return { status: 200, body: { open: authorizeUrl({ authorization: found.authorization, clientId: client.clientId, redirectUri, challenge, state, resource: found.resource, scopes: found.scopes }) } };
      },
    },
    {
      method: 'GET', path: '/api/x/mcp/oauth/callback',
      async handler(ctx, { url }) {
        const page = (title, text) => ({ status: 200, html: `<!doctype html><meta charset="utf-8"><title>MADRE</title><body style="font:15px system-ui;margin:12vh auto;max-width:34em;padding:0 16px;color:#1d2321"><h1 style="font-size:20px">${title}</h1><p>${text}</p></body>` });
        const state = url.searchParams.get('state') ?? '';
        const flow = pending.get(state);
        pending.delete(state);
        if (!flow) return page(t('This sign-in expired'), t('Sign in again from Settings › Outside tools (MCP).'));
        if (url.searchParams.get('error')) return page(t('The sign-in was not completed'), t('The server said: {problem}', { problem: String(url.searchParams.get('error_description') ?? url.searchParams.get('error')).replace(/[<>&]/g, '') }));
        const done = await exchangeCode({ authorization: flow.authorization, clientId: flow.clientId, redirectUri: flow.redirectUri, code: url.searchParams.get('code') ?? '', verifier: flow.verifier, resource: flow.resource }).catch((error) => ({ ok: false, problem: error.message }));
        if (!done.ok) return page(t('The sign-in was not completed'), t('The server said: {problem}', { problem: String(done.problem).replace(/[<>&]/g, '') }));
        await keepOAuth(ctx.stateRoot, flow.id, { ...grantFrom(done.tokens), token_endpoint: flow.authorization.token_endpoint, client_id: flow.clientId, resource: flow.resource });
        const { servers } = await readMcp(ctx.stateRoot, ctx.projectRoot);
        const server = servers.find((one) => one.id === flow.id);
        const check = server ? await saveChecked(ctx, server) : { ok: false };
        return page(check.ok ? t('Connected') : t('Signed in'), check.ok ? t('{name} is connected to this project with {n} tools. You can close this tab and go back to MADRE.', { name: server?.label ?? flow.id, n: check.tools.length }) : t('You are signed in, but the server did not answer yet: {problem}. Check it again from Settings › Outside tools (MCP).', { problem: String(check.problem ?? '').replace(/[<>&]/g, '') }));
      },
    },
  ],
});

export { SERVER_ID };
