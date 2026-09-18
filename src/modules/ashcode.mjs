// AshCode: opt-in abbreviation of prompts and replies. Beta, so the switch asks
// for confirmation and the room says so every time it turns on.

import { defineModule } from './sdk.mjs';

const WARNING = 'Beta: abbreviation may alter meaning or introduce errors. Review the original. Character reduction is not verified token savings.';

export default defineModule({
  id: 'ashcode',
  configKey: 'ashCode',
  name: 'AshCode',
  vendor: 'MADRE · ORDER 937',
  version: '0.1.0-beta',
  summary: 'Opt-in Spanish/English prompt and reply abbreviation. Keeps the original visible; may change meaning. Shorter characters do not guarantee fewer provider tokens.',
  creates: ['nothing in the project', 'an ashCode switch in ~/.pulse/config.json', 'original and abbreviated text in the room event log when applied'],
  card: 'ashcode',
  confirm: 'AshCode is beta and can change meaning. Send { "confirm": true } to enable it.',
  toggledEvent: { beta: true },
  toggledBody: () => ({ beta: true, warning: 'AshCode beta may alter meaning; review the original. Character reduction is not verified token savings.' }),
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? 'on · beta · ORDER 937 available' : 'off · beta' },
      install: { display: ctx.settings.enabled ? 'disable AshCode' : 'enable AshCode (config.json)', platforms: [] },
      warning: WARNING,
    };
  },
  async onToggle(ctx, enabled) { ctx.room.setAshCode(enabled); return null; },
});
