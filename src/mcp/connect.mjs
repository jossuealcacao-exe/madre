// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// CONNECT MCP: the MCP servers a person adds to one project, for its agents (2026-10-14).
//
// Pure-ish helpers shared by the module (src/modules/mcp-connect.mjs), which owns the settings and
// hands servers to turns, and the proxy (src/mcp/proxy.mjs), which is what each CLI actually
// starts. The rules, so nothing added here can break the room:
//
//   · A server is handed to a turn only after MADRE has started it and read its tool list. One
//     that fails its check stays off and says why; a turn never carries a server nobody saw work.
//   · Every CLI starts the same proxy, with the project, the server's id and the tools it may
//     use: no secret is ever in an argv, where `ps` shows it (the env of a CLI's MCP entry is).
//     The proxy reads its secrets from the vault itself and refuses any tool not allowed.
//   · Secrets — environment values marked secret, a token, OAuth tokens — live in the vault
//     (src/vault.mjs) under the module `mcp`. The settings file holds names, never values.
//   · A tool that only reads (the server says `readOnlyHint`) works from #1. A tool that acts is
//     handed only from the mode the person chose for that server, #4 FULL ACCESS unless they
//     lower it, which is the rule every connector of MADRE already follows (docs/CONECTORES.md).
//
// The settings live beside the project's room, in `<state>/rooms/<room>/mcp.json`: they are of
// this project only, as the person asked, and they never land in the project's own folder.

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { forgetSecret, readSecret, writeSecret } from '../vault.mjs';
import { projectRoomId } from '../salas.mjs';
import { splitCommand } from '../runs.mjs';

export const MCP_VAULT = 'mcp';
export const SERVER_ID = /^[a-z][a-z0-9-]{0,30}$/;
// Names MADRE's own servers use, so a person's server can never stand in for one of them.
const RESERVED = /^(pulse|madre|mcp)(-|$)/;
export const ACTION_MODES = [1, 2, 3, 4];
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;

export const mcpFile = (stateRoot, projectRoot) => join(stateRoot, 'rooms', projectRoomId(projectRoot), 'mcp.json');

export async function readMcp(stateRoot, projectRoot) {
  try {
    const stored = JSON.parse(await readFile(mcpFile(stateRoot, projectRoot), 'utf8'));
    return { servers: Array.isArray(stored?.servers) ? stored.servers.filter((one) => one && SERVER_ID.test(one.id)) : [] };
  } catch { return { servers: [] }; }
}

export async function writeMcp(stateRoot, projectRoot, settings) {
  const file = mcpFile(stateRoot, projectRoot);
  await mkdir(join(file, '..'), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify({ servers: settings.servers ?? [] }, null, 2)}\n`);
  await rename(temp, file);
}

// The vault names of a server's secrets: one per environment value, one per header, one for OAuth.
export const secretName = (id, kind, key = '') => `${id}_${kind}${key ? `_${key}` : ''}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64);

// What a person typed, made into a server or refused with the reason. Values marked secret are
// returned apart (`secrets`), for the vault; what is kept here has names only.
export function cleanServer(input = {}, { existing = [] } = {}) {
  const id = String(input.id ?? '').trim().toLowerCase();
  if (!SERVER_ID.test(id)) return { error: 'The name is a short word: lowercase letters, digits and dashes, starting with a letter.' };
  if (RESERVED.test(id)) return { error: 'That name belongs to MADRE. Choose another.' };
  if (existing.some((one) => one.id === id) && input.replace !== true) return { error: 'There is already a server with that name in this project.' };
  const transport = input.transport === 'http' ? 'http' : 'stdio';
  const server = {
    id,
    label: String(input.label ?? '').trim().slice(0, 60) || id,
    transport,
    enabled: input.enabled !== false,
    actions: ACTION_MODES.includes(Number(input.actions)) ? Number(input.actions) : 4,
    agents: Array.isArray(input.agents) && input.agents.length ? input.agents.filter((one) => /^[a-z0-9_-]+$/.test(one)) : null,
    env: [],
    headers: [],
    auth: 'none',
    tools: Array.isArray(input.tools) ? input.tools : [],
    checkedAt: input.checkedAt ?? null,
    problem: input.problem ?? null,
  };
  const secrets = [];
  if (transport === 'stdio') {
    const line = String(input.command ?? '').trim();
    const split = splitCommand(line);
    if (!line) return { error: 'Write the command that starts the server.' };
    // The refusal is said the way a run request says it (src/runs.mjs), in the room's language.
    if (!split.argv) return { error: 'The command {why}; write it as one program and its arguments.', errorArgs: { why: split.why, whyArgs: split.whyArgs ?? {} } };
    [server.command, ...server.args] = split.argv;
    // Words that open with «~/» are the home folder, put in only when the server starts.
    if (split.home?.length) server.home = split.home;
    server.line = line;
  } else {
    let url;
    try { url = new URL(String(input.url ?? '').trim()); } catch { return { error: 'Write the full address of the server; a remote one starts with https.' }; }
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return { error: 'A remote server has to be https://; plain http:// only on this computer.' };
    if (url.username || url.password) return { error: 'Put the credentials in the token field, not in the address.' };
    server.url = url.toString();
    server.auth = ['token', 'oauth'].includes(input.auth) ? input.auth : 'none';
  }
  for (const row of Array.isArray(input.env) ? input.env : []) {
    const name = String(row?.name ?? '').trim();
    if (!name) continue;
    if (!ENV_NAME.test(name)) return { error: '{name} is not a variable name.', errorArgs: { name } };
    if (row.secret) {
      server.env.push({ name, secret: true });
      if (typeof row.value === 'string' && row.value.trim()) secrets.push({ name: secretName(id, 'env', name), value: row.value.trim() });
    } else server.env.push({ name, value: String(row.value ?? '') });
  }
  for (const row of Array.isArray(input.headers) ? input.headers : []) {
    const name = String(row?.name ?? '').trim();
    if (!name) continue;
    if (!HEADER_NAME.test(name)) return { error: '{name} is not a header name.', errorArgs: { name } };
    // «Bearer abc» is a prefix and a secret; the vault holds the part with no spaces.
    const value = String(row.value ?? '').trim();
    const cut = value.lastIndexOf(' ');
    const prefix = row.secret && cut > 0 ? value.slice(0, cut + 1) : row.prefix ?? '';
    if (row.secret) {
      server.headers.push({ name, prefix, secret: true });
      const secret = cut > 0 ? value.slice(cut + 1) : value;
      if (secret) secrets.push({ name: secretName(id, 'hdr', name), value: secret });
    } else server.headers.push({ name, value });
  }
  if (transport === 'http' && server.auth === 'token') {
    server.headers = server.headers.filter((one) => one.name.toLowerCase() !== 'authorization');
    if (typeof input.token === 'string' && input.token.trim()) secrets.push({ name: secretName(id, 'token'), value: input.token.trim().replace(/^Bearer\s+/i, '') });
  }
  return { server, secrets };
}

export async function keepSecrets(stateRoot, secrets) {
  for (const one of secrets) {
    const kept = await writeSecret(stateRoot, MCP_VAULT, one.name, one.value);
    if (!kept.ok) return kept;
  }
  return { ok: true };
}

export async function forgetServerSecrets(stateRoot, server) {
  const names = [
    ...(server.env ?? []).filter((one) => one.secret).map((one) => secretName(server.id, 'env', one.name)),
    ...(server.headers ?? []).filter((one) => one.secret).map((one) => secretName(server.id, 'hdr', one.name)),
    secretName(server.id, 'token'), secretName(server.id, 'oauth'),
  ];
  for (const name of names) await forgetSecret(stateRoot, MCP_VAULT, name);
}

// The environment the server starts with: the literal values and the secrets, read now.
export async function resolveEnv(stateRoot, server) {
  const env = {};
  for (const one of server.env ?? []) {
    env[one.name] = one.secret ? (await readSecret(stateRoot, MCP_VAULT, secretName(server.id, 'env', one.name))) ?? '' : String(one.value ?? '');
  }
  return env;
}

export async function resolveHeaders(stateRoot, server) {
  const headers = {};
  for (const one of server.headers ?? []) {
    headers[one.name] = one.secret ? `${one.prefix ?? ''}${(await readSecret(stateRoot, MCP_VAULT, secretName(server.id, 'hdr', one.name))) ?? ''}` : String(one.value ?? '');
  }
  if (server.auth === 'token') {
    const token = await readSecret(stateRoot, MCP_VAULT, secretName(server.id, 'token'));
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (server.auth === 'oauth') {
    const grant = await readOAuth(stateRoot, server.id);
    if (grant?.access_token) headers.Authorization = `Bearer ${grant.access_token}`;
  }
  return headers;
}

// ---------- OAuth, the way remote MCP servers ask to be signed in to ----------
//
// The server says where its authorization server is (RFC 9728), that server says how to register
// a client and where to send the person (RFC 8414 / 7591), and the code comes back to this room
// with PKCE (RFC 7636) and the server named as the resource (RFC 8707). MADRE registers itself as
// a public client — no secret, because a secret kept on a laptop is not one — and keeps the
// tokens in the vault. The proxy refreshes them when the server says they ran out.

const b64url = (buffer) => Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function pkce() {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
}

async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export async function discoverOAuth(serverUrl, { fetchImpl = globalThis.fetch } = {}) {
  const url = new URL(serverUrl);
  // The server's own pointer first: a 401 names its resource metadata in WWW-Authenticate.
  let resourceMeta = null;
  const probe = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'madre', version: '1' } } }), signal: AbortSignal.timeout(10000) }).catch(() => null);
  const pointer = probe?.headers?.get?.('www-authenticate')?.match(/resource_metadata="([^"]+)"/)?.[1];
  const candidates = [
    pointer,
    `${url.origin}/.well-known/oauth-protected-resource${url.pathname === '/' ? '' : url.pathname}`,
    `${url.origin}/.well-known/oauth-protected-resource`,
  ].filter(Boolean);
  for (const one of candidates) { resourceMeta = await getJson(fetchImpl, one).catch(() => null); if (resourceMeta) break; }
  const issuer = resourceMeta?.authorization_servers?.[0] ?? url.origin;
  const issuerUrl = new URL(issuer);
  const suffix = issuerUrl.pathname === '/' ? '' : issuerUrl.pathname;
  let authMeta = null;
  for (const one of [`${issuerUrl.origin}/.well-known/oauth-authorization-server${suffix}`, `${issuerUrl.origin}/.well-known/openid-configuration${suffix}`]) {
    authMeta = await getJson(fetchImpl, one).catch(() => null);
    if (authMeta?.authorization_endpoint && authMeta?.token_endpoint) break;
    authMeta = null;
  }
  if (!authMeta) return { ok: false, problem: 'The server does not publish how to sign in to it (no OAuth metadata). Use a token instead.' };
  if (!authMeta.registration_endpoint) return { ok: false, problem: 'The server only accepts clients it already knows; it does not let MADRE register. Use a token instead.' };
  return { ok: true, resource: resourceMeta?.resource ?? url.toString(), scopes: resourceMeta?.scopes_supported ?? authMeta.scopes_supported ?? [], authorization: authMeta };
}

export async function registerClient(authorization, redirectUri, { fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(authorization.registration_endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ client_name: 'MADRE', redirect_uris: [redirectUri], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' }),
    signal: AbortSignal.timeout(10000),
  });
  const said = await response.json().catch(() => ({}));
  if (!response.ok || !said.client_id) return { ok: false, problem: said.error_description ?? said.error ?? `the server refused the registration (HTTP ${response.status})` };
  return { ok: true, clientId: said.client_id };
}

export function authorizeUrl({ authorization, clientId, redirectUri, challenge, state, resource, scopes = [] }) {
  const url = new URL(authorization.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('resource', resource);
  if (scopes.length) url.searchParams.set('scope', scopes.join(' '));
  return url.toString();
}

async function tokenRequest(tokenEndpoint, form, fetchImpl) {
  const response = await fetchImpl(tokenEndpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams(form).toString(), signal: AbortSignal.timeout(15000) });
  const said = await response.json().catch(() => ({}));
  if (!response.ok || !said.access_token) return { ok: false, problem: said.error_description ?? said.error ?? `HTTP ${response.status}` };
  return { ok: true, tokens: said };
}

export async function exchangeCode({ authorization, clientId, redirectUri, code, verifier, resource }, { fetchImpl = globalThis.fetch } = {}) {
  return tokenRequest(authorization.token_endpoint, { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier, resource }, fetchImpl);
}

export async function refreshGrant(stateRoot, id, { fetchImpl = globalThis.fetch } = {}) {
  const grant = await readOAuth(stateRoot, id);
  if (!grant?.refresh_token || !grant.token_endpoint) return { ok: false, problem: 'no refresh token' };
  const renewed = await tokenRequest(grant.token_endpoint, { grant_type: 'refresh_token', refresh_token: grant.refresh_token, client_id: grant.client_id, resource: grant.resource }, fetchImpl);
  if (!renewed.ok) return renewed;
  await keepOAuth(stateRoot, id, { ...grant, ...grantFrom(renewed.tokens), refresh_token: renewed.tokens.refresh_token ?? grant.refresh_token });
  return { ok: true };
}

export const grantFrom = (tokens) => ({
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token ?? null,
  expires_at: Number.isFinite(Number(tokens.expires_in)) ? Date.now() + Number(tokens.expires_in) * 1000 : null,
});

// The vault takes one word per secret: the grant is kept as base64url JSON.
export async function keepOAuth(stateRoot, id, grant) {
  return writeSecret(stateRoot, MCP_VAULT, secretName(id, 'oauth'), b64url(Buffer.from(JSON.stringify(grant))));
}
export async function readOAuth(stateRoot, id) {
  const kept = await readSecret(stateRoot, MCP_VAULT, secretName(id, 'oauth'));
  if (!kept) return null;
  try { return JSON.parse(Buffer.from(kept.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
}

// ---------- servers the person already set up in their other apps ----------
//
// Read only when they press IMPORT, only the MCP entries, and shown by name: a value never leaves
// this computer and is put in the vault the moment it is imported.

function fromJsonServers(source, entries) {
  return Object.entries(entries ?? {}).map(([name, one]) => {
    if (!one || typeof one !== 'object') return null;
    const url = one.url ?? one.httpUrl ?? one.serverUrl ?? null;
    const command = Array.isArray(one.command) ? one.command : one.command ? [one.command, ...(one.args ?? [])] : null;
    return { source, name, url, command, env: one.env ?? one.environment ?? {}, headers: one.headers ?? {}, disabled: one.enabled === false || one.disabled === true };
  }).filter(Boolean);
}

// The [mcp_servers.<name>] tables of Codex's config.toml: command, args, url and an env table.
// Only those shapes, read line by line; anything else in the file is not looked at.
export function codexServers(text) {
  const found = new Map();
  let current = null;
  let inEnv = false;
  const value = (raw) => {
    const trimmed = raw.trim();
    if (/^".*"$/.test(trimmed)) { try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); } }
    if (/^'.*'$/.test(trimmed)) return trimmed.slice(1, -1);
    if (/^\[.*\]$/.test(trimmed)) { try { return JSON.parse(trimmed.replace(/'/g, '"')); } catch { return []; } }
    if (trimmed === 'true' || trimmed === 'false') return trimmed === 'true';
    return trimmed;
  };
  for (const line of String(text ?? '').split('\n')) {
    const table = line.match(/^\s*\[mcp_servers\.([A-Za-z0-9_-]+)(\.env)?\]\s*$/);
    if (table) { current = table[1]; inEnv = Boolean(table[2]); if (!found.has(current)) found.set(current, { env: {} }); continue; }
    if (/^\s*\[/.test(line)) { current = null; continue; }
    if (!current) continue;
    const pair = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!pair) continue;
    if (inEnv) found.get(current).env[pair[1]] = String(value(pair[2]));
    else found.get(current)[pair[1]] = value(pair[2]);
  }
  return [...found.entries()].map(([name, one]) => ({
    source: 'Codex', name, url: one.url ?? null,
    command: one.command ? [one.command, ...(Array.isArray(one.args) ? one.args : [])] : null,
    env: one.env, headers: {}, disabled: one.enabled === false,
  }));
}

export async function importable({ projectRoot, home = homedir() } = {}) {
  const read = (path) => readFile(path, 'utf8').catch(() => null);
  const json = async (path) => { const text = await read(path); try { return text ? JSON.parse(text) : null; } catch { return null; } };
  const found = [];
  const project = await json(join(projectRoot, '.mcp.json'));
  found.push(...fromJsonServers('.mcp.json (this project)', project?.mcpServers));
  const opencode = await json(join(projectRoot, 'opencode.json'));
  found.push(...fromJsonServers('opencode.json (this project)', opencode?.mcp));
  const claude = await json(join(home, '.claude.json'));
  found.push(...fromJsonServers('Claude Code', claude?.mcpServers));
  found.push(...fromJsonServers('Claude Code (this project)', claude?.projects?.[projectRoot]?.mcpServers));
  found.push(...fromJsonServers('~/.mcp.json', (await json(join(home, '.mcp.json')))?.mcpServers));
  found.push(...fromJsonServers('Gemini CLI', (await json(join(home, '.gemini', 'settings.json')))?.mcpServers));
  found.push(...fromJsonServers('Cursor', (await json(join(home, '.cursor', 'mcp.json')))?.mcpServers));
  const toml = await read(join(home, '.codex', 'config.toml'));
  if (toml) found.push(...codexServers(toml));
  // A name that is not a usable id gets one; values are counted, never shown.
  return found.map((one) => ({
    ...one,
    id: String(one.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^[^a-z]+/, '').replace(/-+$/, '').slice(0, 31) || 'server',
    transport: one.url ? 'http' : 'stdio',
  }));
}
