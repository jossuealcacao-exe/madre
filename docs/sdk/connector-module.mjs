// CONNECTOR · a complete MADRE connector in one file, no imports from npm, no build.
//
// This one really works: it sends you a Telegram message. Getting the credential takes about a
// minute (talk to @BotFather, /newbot, copy the token; then message your bot once and read your
// chat id from https://api.telegram.org/bot<TOKEN>/getUpdates). Install it, paste the token, and
// an agent in #4 AIRLOCK can write to you.
//
// Copy it to ~/.pulse/modules/telegram.mjs (every project) or <project>/.madre/modules/
// (this project), then MODULES → RELOAD. Or just ask for one: /module <what it should do>.
//
// ─── The one shape worth copying ──────────────────────────────────────────────────────────────
//
// A connector needs two things that look like they need two files: a module MADRE imports, and
// an MCP server MADRE runs as its own process. They are the same file. It is the spec when
// imported and the server when executed, and it tells the two apart at the bottom.
//
// ─── Four rules, and the reason for each ──────────────────────────────────────────────────────
//
//   1. Import nothing but node: builtins. MADRE loads your file from a scratch folder to check it
//      before installing, and there is no node_modules there. `node:fs`, `node:url`, `node:tls`
//      and friends always resolve; anything else fails the install. And never copy
//      `import { defineModule } from './sdk.mjs'` out of MADRE's own modules — they live inside
//      the package and you do not. That is the one mistake that looks right and never works.
//
//   2. Declare your secrets; never invent a place to put them. MADRE draws the field, keeps the
//      value in its vault under your id (0600 inside 0700), accepts it only from this computer,
//      and hands it back only to you through ctx.vault. The value goes into the environment of
//      the process you spawn and nowhere else — not the prompt, not the brief, not a tool result.
//
//   3. Declare where you reach. Four answers, the same ones MADRE gives for its own addresses.
//      Without them your traffic reads in the log as «an address nothing here declares», and the
//      human cannot tell your connector from something going wrong.
//
//   4. Say which of your tools SEND. Anything whose effect does not come back — a message, an
//      order, a row in somebody's system — goes in `sends`, and MADRE withholds it below
//      #4 AIRLOCK. You do not enforce this; the core does. Declaring is the whole of your part.

import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const SECRET = 'bot-token';
const API = 'api.telegram.org';

export default {
  id: 'telegram',
  name: 'TELEGRAM',
  vendor: 'you',
  version: '0.1.0',
  summary: 'Lets an agent send you one Telegram message through your own bot. Sending is only offered in #4 AIRLOCK, and a sent message cannot be unsent.',
  creates: ['nothing in the project', 'an entry in ~/.pulse/config.json', 'your bot token in MADRE’s vault'],
  requires: ['a bot token from @BotFather', 'your chat id'],

  // Plain settings. MADRE draws these on the card and saves them in your block of config.json.
  settings: { enabled: false, chatId: '' },
  controls: [{ key: 'chatId', label: 'CHAT ID', type: 'text', note: 'Who the message goes to. Message your bot once, then read it from /getUpdates.' }],

  // RULE 2 · the secret, declared. MADRE draws a password field, keeps the value, and shows the
  // card only its length — never the value, not even back to you.
  secrets: [{
    name: SECRET,
    label: 'BOT TOKEN',
    note: 'From @BotFather. Revoke it there any time without touching your account.',
    where: 'https://t.me/botfather',
  }],

  // RULE 3 · where this reaches, in the four answers.
  reaches: [{
    id: 'api',
    host: API,
    to: 'Telegram, through your own bot',
    what: 'The text of the message you asked to send, and your bot token to sign in.',
    when: 'Only when an agent in #4 AIRLOCK calls send_telegram, and only for that one message.',
    where: 'Switch off TELEGRAM, or forget its token, and nothing can leave.',
  }],

  async status(ctx) {
    const held = await ctx.vault.held();
    const problems = [];
    if (!held.some((one) => one.name === SECRET)) problems.push('No bot token yet: talk to @BotFather, then paste it above.');
    if (!String(ctx.settings.chatId ?? '').trim()) problems.push('No chat id yet: message your bot once, then read it from /getUpdates.');
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? (problems.length ? 'on · not configured' : `on · chat ${ctx.settings.chatId}`) : 'off' },
      preflight: { ok: !problems.length, problems },
    };
  },

  // The tool, for one turn. Check here what could be missing rather than leave the model to find
  // out: a tool that is offered and always fails is worse than no tool at all.
  async toolsForTurn(ctx) {
    const chatId = String(ctx.settings.chatId ?? '').trim();
    const token = await ctx.vault.get(SECRET);
    if (!chatId || !token) return [];
    return [{
      name: 'telegram',
      command: process.execPath,
      args: [SELF],                       // ← the same file, run as a process. See the bottom.
      env: { TELEGRAM_TOKEN: token, TELEGRAM_CHAT: chatId },
      tools: ['send_telegram'],
      sends: ['send_telegram'],           // RULE 4 · withheld below #4 AIRLOCK, by the core
      brief: `You can send the human one Telegram message with the MCP tool send_telegram (server telegram). It reaches them personally and cannot be unsent: say in one line what you are about to send, then send it.`,
    }];
  },
};

// ─── From here down, this file is the MCP server ──────────────────────────────────────────────

const TOOL = {
  name: 'send_telegram',
  description: 'Send the human one short Telegram message. This cannot be undone: state in one line what it says before calling it.',
  inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The message, as plain text.' } }, required: ['text'] },
};

async function sendMessage(text, env = process.env) {
  if (!String(text ?? '').trim()) throw Object.assign(new Error('There is nothing to send.'), { code: 'EMPTY' });
  const response = await fetch(`https://${API}/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT, text: String(text).slice(0, 4000) }),
  });
  const body = await response.json().catch(() => ({}));
  // Telegram answers 200 with ok:false, so the status alone is not the answer.
  if (!response.ok || body.ok !== true) throw Object.assign(new Error(body.description ?? `Telegram answered HTTP ${response.status}.`), { code: `TELEGRAM_${response.status}` });
  return { chat: env.TELEGRAM_CHAT, chars: String(text).length };
}

// Minimal JSON-RPC 2.0 over stdio: one newline-delimited message per line.
export function handleRequest(message, { env = process.env, send = sendMessage } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'telegram', version: '0.1.0' } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      return Promise.resolve(reply({ tools: [TOOL] }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (name !== TOOL.name) return Promise.resolve(reply({ content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }));
      return send(args.text, env)
        .then((sent) => reply({ content: [{ type: 'text', text: `Sent ${sent.chars} characters to chat ${sent.chat}.` }], isError: false }))
        // A failure comes back as an error RESULT, never as a sentence that reads like success.
        .catch((error) => reply({ content: [{ type: 'text', text: `Nothing was sent (${error.code ?? 'ERROR'}): ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } });
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
      try { message = JSON.parse(line); } catch { continue; }
      pending += 1;
      void handleRequest(message, { env })
        .then((answer) => { if (answer) output.write(`${JSON.stringify(answer)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  input.on('end', () => { ended = true; finish(); });
}

// Imported, or executed? Resolve BOTH paths before comparing them.
//
// `process.argv[1] === SELF` looks equivalent and mostly is: when MADRE spawns this, it passes
// the very SELF computed below, already resolved by Node's loader. But the moment YOU run the
// file by hand to try it — `node ~/.pulse/modules/telegram.mjs`, or anything through /tmp, which
// on macOS is a link to /private/tmp — argv[1] keeps the spelling you typed and SELF does not.
// The comparison is false, this branch never runs, the process starts, answers nothing and exits
// successfully. Nothing is printed and nothing is wrong on paper. Two lines buy you that.
const real = async (path) => (path ? realpath(path).catch(() => path) : null);
if ((await real(process.argv[1])) === (await real(SELF))) serve();
