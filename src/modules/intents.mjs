// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Intenciones: how hard each agent should think for the message being written.
//
// It reads the request, the conversation it belongs to and what this project has measured, and
// when there is something worth saying it says it under the composer: this looks like a lookup and
// a lower rung was enough here, or this looks like a hunt and the rung chosen is too light. The
// human presses the button or does not. Nothing changes on its own.
//
// What it knows, it learns first from real use, for no tokens (intents-observe): every turn the
// human already sent, and whether the rung it ran at was enough — the human moved on, or asked
// again. Faster and stronger, for a price, are the two tests the human starts from this card
// (intents-calibration): the quick one, where the human compares two answers without knowing which
// is which, and the full one, where an impartial agent does, after proving it can see a difference.
//
// Only Claude Code and Codex take an effort per run, so only they are in it.

import { join } from 'node:path';
import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';
import { IntentsDesk } from './intents-desk.mjs';
import { moduleOnIn } from '../module-scope.mjs';

const desks = new Map();
// One desk per project room, made the first time anything asks for it.
export function deskFor(ctx) {
  const where = ctx.services?.intents;
  if (!where?.roomDir) return null;
  if (!desks.has(where.roomDir)) {
    desks.set(where.roomDir, new IntentsDesk({
      file: join(where.roomDir, 'intents.jsonl'),
      offersFile: join(where.roomDir, 'intents-offers.json'),
      events: where.events,
      projectEvents: where.projectEvents,
      ledgers: where.ledgers,
      defaults: where.defaults,
      bench: where.bench,
      projectRoot: ctx.projectRoot,
    }));
  }
  return desks.get(where.roomDir);
}

// On unless turned off, for every project or for this one (module-scope.mjs).
const enabled = (ctx) => moduleOnIn(ctx.config?.modules?.intents ?? {}, ctx.roomId ?? null, true);
const count = (value) => Math.max(0, Math.min(50, Number.parseInt(value, 10) || 0));
const modeOf = (value) => (Number.isInteger(value) && value >= 0 && value <= 4 ? value : null);
const nameOrNull = (value) => (typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,120}$/.test(value) ? value : null);

export default defineModule({
  id: 'intents',
  configKey: 'intents',
  name: 'Suggested effort',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'Suggests how hard Claude Code and Codex should think about your message, based on what worked in this project. You decide.',
  creates: ['nothing in the project', 'its measurements next to the project, in intents.jsonl'],
  settings: { enabled: true },
  card: 'intents',
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? t('on · suggests an effort when there is a reason to') : t('off · no suggestions under the Write box') },
      install: { display: ctx.settings.enabled ? 'stop suggesting an effort' : 'suggest an effort when there is a reason to', platforms: [] },
    };
  },
  routes: [
    {
      method: 'GET', path: '/api/intents',
      handler: async (ctx, { url }) => {
        const desk = deskFor(ctx);
        if (!desk) return { status: 503, body: { error: t('Suggested effort is not available in this project.') } };
        let models = {};
        try { models = JSON.parse(url.searchParams.get('models') ?? '{}') ?? {}; } catch { models = {}; }
        const chosen = Object.fromEntries(Object.entries(models).map(([agent, model]) => [agent, nameOrNull(model)]));
        let efforts = {};
        try { efforts = JSON.parse(url.searchParams.get('efforts') ?? '{}') ?? {}; } catch { efforts = {}; }
        const rungs = Object.fromEntries(Object.entries(efforts).map(([agent, effort]) => [agent, nameOrNull(effort)]));
        return { status: 200, body: { enabled: enabled(ctx), ...(await desk.view({ models: chosen, efforts: rungs })) } };
      },
    },
    {
      method: 'POST', path: '/api/intents/suggest',
      handler: async (ctx, { payload }) => {
        const desk = deskFor(ctx);
        if (!desk || !enabled(ctx)) return { status: 200, body: { suggestion: null, explore: null } };
        const text = String(payload?.text ?? '').slice(0, 20000);
        const { suggestion, explore } = await desk.consider({
          text,
          agent: String(payload?.agent ?? ''),
          model: nameOrNull(payload?.model),
          effort: nameOrNull(payload?.effort),
          defaultEffort: nameOrNull(payload?.defaultEffort),
          references: count(payload?.references),
          attachments: count(payload?.attachments),
          mode: modeOf(payload?.mode),
        });
        return { status: 200, body: { suggestion, explore } };
      },
    },
    {
      method: 'POST', path: '/api/intents/calibrate',
      handler: async (ctx, { payload }) => {
        const desk = deskFor(ctx);
        if (!desk) return { status: 503, body: { error: t('Suggested effort is not available in this project.') } };
        if (!enabled(ctx)) return { status: 409, body: { error: t('Turn Suggested effort on first.') } };
        const result = await desk.start({
          kind: payload?.kind === 'full' ? 'full' : 'quick',
          agent: String(payload?.agent ?? ''),
          model: nameOrNull(payload?.model),
          reference: nameOrNull(payload?.reference),
          effort: nameOrNull(payload?.effort),
          intent: nameOrNull(payload?.intent),
        });
        return { status: result.error ? 409 : 202, body: result };
      },
    },
    {
      method: 'POST', path: '/api/intents/answer',
      handler: async (ctx, { payload }) => {
        const result = deskFor(ctx)?.answer(String(payload?.choice ?? '')) ?? { error: t('Suggested effort is not available in this project.') };
        return { status: result.error ? 409 : 200, body: result };
      },
    },
    { method: 'POST', path: '/api/intents/stop', handler: async (ctx) => ({ status: 200, body: (await deskFor(ctx)?.stop()) ?? { stopping: false } }) },
    {
      method: 'POST', path: '/api/intents/offer',
      handler: async (ctx, { payload }) => {
        const desk = deskFor(ctx);
        if (!desk || !enabled(ctx)) return { status: 200, body: {} };
        const explore = payload?.explore && typeof payload.explore === 'object'
          ? { agent: nameOrNull(payload.explore.agent), model: nameOrNull(payload.explore.model), intent: nameOrNull(payload.explore.intent) }
          : null;
        return { status: 200, body: { offers: await desk.offered({
          accepted: payload?.accepted === true,
          // A message that only qualified for a try, with nothing shown, paces the tries and counts no offer.
          shown: payload?.shown !== false,
          kind: nameOrNull(payload?.kind),
          basis: nameOrNull(payload?.basis),
          agent: nameOrNull(payload?.agent),
          model: nameOrNull(payload?.model),
          intent: nameOrNull(payload?.intent),
          effort: nameOrNull(payload?.effort),
          from: nameOrNull(payload?.from),
          explore: explore?.agent && explore.intent ? explore : null,
        }) } };
      },
    },
  ],
});
