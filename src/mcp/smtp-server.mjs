#!/usr/bin/env node
// MADRE CORREO: a tiny MCP server (stdio, JSON-RPC 2.0) exposing one tool, send_email, that
// hands one message to the user's own mail provider over SMTP+TLS with the user's own app
// password. There is no MADRE in the middle: this process talks to smtp.gmail.com (or whatever
// host the module was pointed at) and to nothing else.
//
// This is the first MADRE tool whose effect does not come back. A file can be undone; a sent
// message cannot. So three things hold, and each is enforced somewhere a module cannot reach:
//
//   · The room only hands this server's tool to a turn at #4 AIRLOCK (toolsForTurn, `sends`),
//     where the agent must already say in one line what leaves and where before it leaves.
//   · The password arrives in this process's environment from the vault, and is never written
//     anywhere: not in the tool result, not in the outbound log, not in the ledger.
//   · If the module set a list of allowed recipients, a message to anybody else is refused here
//     rather than in the prompt, because a prompt is a suggestion.
//
// Environment:
//   PULSE_SMTP_FROM       required, the address messages are sent from
//   PULSE_SMTP_PASSWORD   required, the app password (from the vault)
//   PULSE_SMTP_USER       the account to authenticate as; defaults to PULSE_SMTP_FROM
//   PULSE_SMTP_FROM_NAME  optional display name
//   PULSE_SMTP_HOST       default smtp.gmail.com
//   PULSE_SMTP_PORT       default 465 (implicit TLS)
//   PULSE_SMTP_ALLOW      optional comma list of addresses or @domains; empty means anyone
//   PULSE_OUTBOUND_LOG    where to append the one line this send leaves behind
//   PULSE_SMTP_FAKE=1     write the message to PULSE_SMTP_FAKE_FILE instead of sending (tests)

import { appendFile, realpath } from 'node:fs/promises';
import { OutboundLog, declareDestinations } from '../outbound.mjs';
import { SMTP_PORT, buildMessage, sendMail, validAddress } from '../smtp.mjs';

const SERVER_NAME = 'pulse-correo';
const SERVER_VERSION = '0.1.0';
const DEFAULT_HOST = 'smtp.gmail.com';

// The four answers `src/outbound.mjs` demands of any destination. They live here rather than in
// the module because this server is a different process — `declareDestinations` in the room says
// nothing to `declareDestinations` here — and both sides must give the same answers.
//
// The id stays `smtp` whatever the host is, so re-declaring a changed host REPLACES the entry
// rather than leaving the room vouching for a server it no longer talks to.
export const reachesFor = (host = DEFAULT_HOST) => [{
  id: 'smtp',
  host,
  to: host === DEFAULT_HOST ? 'Google · Gmail, with your own account' : `${host}, with your own account`,
  what: 'The message you asked to send: its recipients, subject and body, and your app password to sign in.',
  when: 'Only when an agent in #4 AIRLOCK calls send_email, and only for that one message.',
  where: 'Switch off the CORREO module, or forget its app password, and nothing can leave.',
}];
export const REACHES = reachesFor();

// Who may receive. An empty list is "anyone" — deliberate, because narrowing it is a setting the
// human turns on, not a default that would quietly swallow the first thing they try to send.
export function parseAllow(raw) {
  return String(raw ?? '').split(',').map((one) => one.trim().toLowerCase()).filter(Boolean);
}

export function allowed(address, allow = []) {
  if (!allow.length) return true;
  const one = String(address ?? '').toLowerCase();
  const domain = one.slice(one.indexOf('@'));
  return allow.some((rule) => (rule.startsWith('@') ? rule === domain : rule === one));
}

// A TLS socket is not `fetch`, so the wrapper that watches every other outbound call cannot see
// this one. The server writes its own line instead: the host, whether it went, how long it took
// and how many bytes. Never a recipient, never a subject, never the password — the log says that
// something left and where to, the same as it does for every other destination.
function noteSend({ env, host, ok, ms, bytes, error = null }) {
  if (!env.PULSE_OUTBOUND_LOG) return;
  declareDestinations('correo', reachesFor(host));
  try {
    new OutboundLog({ file: env.PULSE_OUTBOUND_LOG })
      .record({ url: `smtps://${host}:${env.PULSE_SMTP_PORT || SMTP_PORT}/`, method: 'SMTP', ok, ms, bytes, ...(error ? { error } : {}) });
  } catch { /* the log must never be the reason a message fails */ }
}

export async function send({ to, subject, body, env = process.env, send: sendImpl = sendMail }) {
  const from = env.PULSE_SMTP_FROM ?? '';
  if (!validAddress(from)) throw Object.assign(new Error('CORREO has no sending address configured.'), { code: 'NO_FROM' });
  const recipients = (Array.isArray(to) ? to : String(to ?? '').split(',')).map((one) => String(one).trim()).filter(Boolean);
  if (!recipients.length) throw Object.assign(new Error('Say who it goes to.'), { code: 'NO_RECIPIENT' });
  const allow = parseAllow(env.PULSE_SMTP_ALLOW);
  const refused = recipients.filter((one) => !allowed(one, allow));
  if (refused.length) throw Object.assign(new Error(`CORREO is limited to ${allow.join(', ')}; it will not write to ${refused.join(', ')}.`), { code: 'NOT_ALLOWED' });
  if (!String(subject ?? '').trim()) throw Object.assign(new Error('A message with no subject reads as spam. Give it one.'), { code: 'NO_SUBJECT' });
  if (!String(body ?? '').trim()) throw Object.assign(new Error('There is nothing in the message.'), { code: 'NO_BODY' });

  const host = env.PULSE_SMTP_HOST || DEFAULT_HOST;
  const started = Date.now();

  if (env.PULSE_SMTP_FAKE === '1') {
    const message = buildMessage({ from, fromName: env.PULSE_SMTP_FROM_NAME ?? '', to: recipients, subject, body });
    if (env.PULSE_SMTP_FAKE_FILE) await appendFile(env.PULSE_SMTP_FAKE_FILE, `${JSON.stringify({ host, from, to: recipients, message })}\n`);
    noteSend({ env, host, ok: true, ms: Date.now() - started, bytes: Buffer.byteLength(message, 'utf8') });
    return { to: recipients, bytes: Buffer.byteLength(message, 'utf8'), host, reply: 'fake' };
  }

  try {
    const result = await sendImpl({
      host,
      port: Number(env.PULSE_SMTP_PORT) || SMTP_PORT,
      user: env.PULSE_SMTP_USER || from,
      password: env.PULSE_SMTP_PASSWORD ?? '',
      from,
      fromName: env.PULSE_SMTP_FROM_NAME ?? '',
      to: recipients,
      subject,
      body,
    });
    noteSend({ env, host, ok: true, ms: Date.now() - started, bytes: result.bytes });
    return { ...result, host };
  } catch (error) {
    noteSend({ env, host, ok: false, ms: Date.now() - started, bytes: null, error: error.code ?? 'ERROR' });
    throw error;
  }
}

export const TOOL = {
  name: 'send_email',
  description: 'Send one plain-text email from the human\'s own mail account. This cannot be undone and the message carries their name: before calling it, state in one line exactly who it goes to and what it says. Attachments, HTML and CC/BCC are not supported.',
  inputSchema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient address. Several are allowed, separated by commas.' },
      subject: { type: 'string', description: 'The subject line.' },
      body: { type: 'string', description: 'The message, as plain text. Line breaks are kept.' },
    },
    required: ['to', 'subject', 'body'],
  },
};

export function handleRequest(message, { env = process.env, sendImpl = send } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      return Promise.resolve(reply({ tools: [TOOL] }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (name !== TOOL.name) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      return sendImpl({ to: args.to, subject: args.subject, body: args.body, env })
        .then((result) => reply({ content: [{ type: 'text', text: `Sent to ${result.to.join(', ')} via ${result.host} (${result.bytes} bytes).` }], isError: false }))
        .catch((error) => reply({ content: [{ type: 'text', text: `Nothing was sent (${error.code ?? 'ERROR'}): ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, env = process.env } = {}) {
  let buffer = '';
  let pending = 0;
  let ended = false;
  const finish = () => { if (ended && pending === 0) process.exit(0); };
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

const invokedDirectly = process.argv[1] && (await realpath(process.argv[1]).catch(() => process.argv[1])) === (await realpath(new URL(import.meta.url).pathname).catch(() => null));
if (invokedDirectly) {
  if (!process.env.PULSE_SMTP_FROM || !process.env.PULSE_SMTP_PASSWORD) {
    process.stderr.write('PULSE_SMTP_FROM and PULSE_SMTP_PASSWORD are required.\n');
    process.exit(2);
  }
  serve();
}
