// CORREO: MADRE's first connector. It gives a turn one tool, send_email, that hands a message to
// the human's own mail account over SMTP+TLS, with the human's own app password.
//
// Three things are true of this module that are not true of any other, and they are the reason
// the connector door took three pieces of groundwork before it could be opened:
//
//   · It holds a secret. `ctx.vault` is this module's own corner of `src/vault.mjs`; the password
//     only ever leaves it into the environment of the server process spawned for one turn.
//   · It declares where it reaches. `reaches` puts the mail host in the outbound log as something
//     this module vouched for, instead of as an address nothing here declares.
//   · What it does does not come back. `sends: ['send_email']` makes the room withhold the tool
//     below #4 AIRLOCK — the core enforces it, not this file's good intentions.
//
// Sending only. Reading mail is a separate decision (D-003's second half in docs/CONECTORES.md):
// IMAP is a different protocol with a different shape of risk, and everything it brings into the
// room travels to whichever model the agent runs on.

import { fileURLToPath } from 'node:url';
import { declareDestinations } from '../outbound.mjs';
import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';
import { REACHES, reachesFor } from '../mcp/smtp-server.mjs';
import { validAddress } from '../smtp.mjs';

const SERVER = fileURLToPath(new URL('../mcp/smtp-server.mjs', import.meta.url));
const SECRET = 'app-password';

export default defineModule({
  id: 'correo',
  configKey: 'correo',
  name: 'CORREO',
  vendor: 'MADRE · SMTP',
  version: '1.0.0',
  summary: 'Lets an agent send one plain-text email from your own account, through your provider, with an app password you keep here. Sending is only offered in #4 AIRLOCK, and a sent message cannot be undone.',
  creates: ['nothing in the project', 'an entry in ~/.pulse/config.json', 'your app password in MADRE’s vault, 0600', 'an MCP server per turn, started and stopped by the room'],
  requires: ['an app password from your mail provider (Gmail: Account → Security → 2-Step Verification → App passwords)', 'the turn must be in #4 AIRLOCK: below that the tool is not offered at all'],
  settings: { enabled: false, from: '', fromName: '', host: 'smtp.gmail.com', allow: '' },
  controls: [
    { key: 'from', label: 'FROM', type: 'text', note: 'The address messages are sent from. It is also the account that signs in, unless your provider says otherwise.' },
    { key: 'fromName', label: 'NAME', type: 'text', note: 'The display name beside the address. Optional.' },
    { key: 'host', label: 'SMTP HOST', type: 'text', note: 'smtp.gmail.com for Gmail. Always port 465, TLS from the first byte.' },
    { key: 'allow', label: 'ONLY TO', type: 'text', note: 'Addresses or @domains an agent may write to, separated by commas. Empty means anyone — narrow it if you want a floor under a mistake.' },
  ],
  secrets: [{
    name: SECRET,
    label: 'APP PASSWORD',
    note: 'Not your account password. A 16-character app password, which you can revoke from your provider without touching anything else.',
    where: 'https://myaccount.google.com/apppasswords',
  }],
  // The default, declared at load. A human who points CORREO at another provider re-declares it
  // below under the same id, so the log never vouches for a host this module stopped using.
  reaches: REACHES,

  async onSettings(ctx, settings) { declareDestinations('correo', reachesFor(String(settings.host ?? '').trim() || 'smtp.gmail.com')); },

  async status(ctx) {
    const held = await ctx.vault.held();
    const hasSecret = held.some((one) => one.name === SECRET);
    const from = String(ctx.settings.from ?? '').trim();
    const problems = [];
    if (!from) problems.push('No sending address yet: put the account in FROM.');
    else if (!validAddress(from)) problems.push(`FROM is not an address: ${from}`);
    if (!hasSecret) problems.push('No app password yet. Gmail: Account → Security → 2-Step Verification → App passwords, then paste it above.');
    const ready = !problems.length;
    const allow = String(ctx.settings.allow ?? '').trim();
    return {
      status: {
        installed: Boolean(ctx.settings.enabled),
        detail: !ctx.settings.enabled ? (ready ? t('off · ready') : t('off')) : ready ? `${t('on')} · ${from}${allow ? ` · ${t('only to')} ${allow}` : ''}` : t('on · not configured'),
      },
      preflight: { ok: ready, problems },
      install: { display: ctx.settings.enabled ? 'disable CORREO' : 'enable CORREO (config.json)', platforms: ['claude', 'codex', 'gemini', 'opencode'] },
    };
  },

  // The tool, for one turn. Everything that could be missing is checked here rather than left for
  // the model to discover: a tool that is offered and then always fails is worse than no tool.
  async toolsForTurn(ctx) {
    const from = String(ctx.settings.from ?? '').trim();
    if (!validAddress(from)) return [];
    const password = await ctx.vault.get(SECRET);
    if (!password) return [];
    const host = String(ctx.settings.host ?? '').trim() || 'smtp.gmail.com';
    const allow = String(ctx.settings.allow ?? '').trim();
    declareDestinations('correo', reachesFor(host));
    return [{
      name: 'correo',
      command: process.execPath,
      args: [SERVER],
      env: {
        PULSE_SMTP_FROM: from,
        PULSE_SMTP_FROM_NAME: String(ctx.settings.fromName ?? '').trim(),
        PULSE_SMTP_HOST: host,
        PULSE_SMTP_PASSWORD: password,
        ...(allow ? { PULSE_SMTP_ALLOW: allow } : {}),
        // So the one call that carries somebody's words out of this machine lands in the same
        // log as everything else. A TLS socket is not fetch, so the server writes its own line.
        ...(ctx.env?.PULSE_OUTBOUND_LOG ? { PULSE_OUTBOUND_LOG: ctx.env.PULSE_OUTBOUND_LOG } : {}),
        ...(ctx.env?.PULSE_SMTP_FAKE ? { PULSE_SMTP_FAKE: ctx.env.PULSE_SMTP_FAKE, ...(ctx.env.PULSE_SMTP_FAKE_FILE ? { PULSE_SMTP_FAKE_FILE: ctx.env.PULSE_SMTP_FAKE_FILE } : {}) } : {}),
      },
      tools: ['send_email'],
      // What makes the room hold this back below #4. Declared here, enforced in modules/index.mjs.
      sends: ['send_email'],
      brief: `You can send one plain-text email from ${from} with the MCP tool send_email (server correo), through ${host}. It is the human's own account and their name on it, and a sent message cannot be recalled: say in one line who it goes to and what it says, then send.${allow ? ` Only these recipients are allowed: ${allow}.` : ''}`,
    }];
  },
});
