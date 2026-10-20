#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The one MCP server every CLI starts for a server a person connected (src/mcp/connect.mjs).
//
//   node proxy.mjs --state <stateRoot> --project <projectRoot> --server <id> [--allow a,b,c]
//
// It speaks MCP over stdio to the CLI, like any local server, and passes each message on to the
// real one: a local command it starts itself, or a remote address over Streamable HTTP. Three
// things happen on the way, and they are why it exists:
//
//   · Secrets are read here, from the vault, and handed to the real server in its environment or
//     its headers. Nothing secret is ever in the argv a CLI is given or in its config.
//   · Only the tools in --allow travel. tools/list comes back without the others, and a call to
//     one of them is answered here, without reaching the server. The list a CLI gets is already
//     the allowed one; this is the second lock, for a CLI that would call a tool it was not told.
//   · A remote server signed in with OAuth gets its token refreshed here when it says it expired.
//
// It never writes to stdout anything but MCP messages, and it says why it failed on stderr.

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readMcp, resolveEnv, resolveHeaders, refreshGrant } from './connect.mjs';

const option = (name) => { const at = process.argv.indexOf(`--${name}`); return at >= 0 ? process.argv[at + 1] : null; };
const stateRoot = option('state');
const projectRoot = option('project');
const serverId = option('server');
const allowArg = option('allow');
const allowed = allowArg === null ? null : new Set(allowArg.split(',').filter(Boolean));

const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const fail = (id, message, code = -32000) => { if (id !== undefined && id !== null) write({ jsonrpc: '2.0', id, error: { code, message } }); };
const say = (text) => process.stderr.write(`MADRE MCP ${serverId ?? '?'}: ${text}\n`);

// The ids of tools/list requests in flight, so their answers can be filtered on the way back.
const listing = new Set();
function filterOutbound(message) {
  if (!allowed || !message || message.id === undefined || !listing.has(message.id)) return message;
  listing.delete(message.id);
  const tools = message.result?.tools;
  if (!Array.isArray(tools)) return message;
  return { ...message, result: { ...message.result, tools: tools.filter((tool) => allowed.has(tool?.name)) } };
}
// A message from the CLI: answered here when it asks for a tool it may not use; passed on otherwise.
function admit(message) {
  if (message?.method === 'tools/list' && message.id !== undefined) listing.add(message.id);
  if (message?.method === 'tools/call' && allowed && !allowed.has(message.params?.name)) {
    write({ jsonrpc: '2.0', id: message.id, result: { isError: true, content: [{ type: 'text', text: `MADRE does not allow ${message.params?.name ?? 'that tool'} in this turn.` }] } });
    return false;
  }
  return true;
}

function lines(stream, onMessage) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    for (let newline = buffer.indexOf('\n'); newline >= 0; newline = buffer.indexOf('\n')) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      onMessage(message);
    }
  });
}

async function viaStdio(server) {
  const env = { ...process.env, ...(await resolveEnv(stateRoot, server)) };
  const home = new Set(server.home ?? []);
  const argv = [server.command, ...(server.args ?? [])].map((word, index) => (home.has(index) ? (word === '~' ? homedir() : join(homedir(), word.slice(2))) : word));
  const child = spawn(argv[0], argv.slice(1), { cwd: server.cwd ?? projectRoot, env, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
  child.on('error', (error) => { say(`could not start: ${error.message}`); process.exit(1); });
  child.on('close', (code) => process.exit(code ?? 0));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  child.stdin.on('error', () => {});
  lines(child.stdout, (message) => write(filterOutbound(message)));
  lines(process.stdin, (message) => { if (admit(message)) child.stdin.write(`${JSON.stringify(message)}\n`); });
  process.stdin.on('end', () => { child.stdin.end(); setTimeout(() => child.kill('SIGTERM'), 2000).unref(); });
}

// Streamable HTTP: each message is a POST; the answer is JSON or an event stream of messages.
async function viaHttp(server) {
  let session = null;
  let protocol = null;
  let refreshed = false;
  const post = async (message) => {
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(await resolveHeaders(stateRoot, server)) };
    if (session) headers['mcp-session-id'] = session;
    if (protocol) headers['mcp-protocol-version'] = protocol;
    return fetch(server.url, { method: 'POST', headers, body: JSON.stringify(message), signal: AbortSignal.timeout(300000) });
  };
  const send = async (message) => {
    let response = await post(message);
    // Expired: refreshed once, then asked again. A server that still refuses is said plainly.
    if (response.status === 401 && server.auth === 'oauth' && !refreshed) {
      refreshed = true;
      if ((await refreshGrant(stateRoot, server.id)).ok) response = await post(message);
    }
    if (response.status === 401 || response.status === 403) {
      fail(message.id, server.auth === 'oauth' ? 'MADRE_AUTH_REQUIRED: sign in to this server again from Settings › Connect MCP.' : 'MADRE_AUTH_REQUIRED: the server refused the credentials. Check the token in Settings › Connect MCP.');
      return;
    }
    if (response.status === 202 || response.status === 204) return;
    if (!response.ok) { fail(message.id, `the server answered HTTP ${response.status}`); return; }
    if (response.ok) refreshed = false;
    session = response.headers.get('mcp-session-id') ?? session;
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // A server may keep the stream open after it answered (DeepWiki does, 2026-10-20): read until
      // the answer to this request arrives, then let the stream go, or every message after it waits.
      const asked = message.id !== undefined && message.id !== null;
      let answered = false;
      while (!answered) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        for (let end = buffer.indexOf('\n\n'); end >= 0; end = buffer.indexOf('\n\n')) {
          const event = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          try {
            const out = JSON.parse(data);
            for (const one of Array.isArray(out) ? out : [out]) {
              deliver(one);
              if (asked && one?.id === message.id && ('result' in one || 'error' in one)) answered = true;
            }
          } catch { /* not a message */ }
        }
      }
      if (answered) await reader.cancel().catch(() => {});
      return;
    }
    const out = await response.json().catch(() => null);
    for (const one of Array.isArray(out) ? out : out ? [out] : []) deliver(one);
  };
  const deliver = (message) => {
    if (message?.result?.protocolVersion) protocol = message.result.protocolVersion;
    write(filterOutbound(message));
  };
  let queue = Promise.resolve();
  lines(process.stdin, (message) => {
    if (!admit(message)) return;
    // In order, as a stdio server would read them: the handshake has to land before the rest.
    queue = queue.then(() => send(message)).catch((error) => { say(error.message); fail(message.id, `could not reach the server: ${error.message}`); });
  });
  process.stdin.on('end', () => { void queue.finally(() => process.exit(0)); });
}

const settings = stateRoot && projectRoot && serverId ? await readMcp(stateRoot, projectRoot) : { servers: [] };
const server = settings.servers.find((one) => one.id === serverId);
if (!server) {
  say('this server is not connected in this project.');
  process.exit(2);
}
if (server.transport === 'http') await viaHttp(server); else await viaStdio(server);
