// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Image Studio: MADRE's own MCP image server, for the CLIs that cannot draw natively. Always on,
// as Options and Commands are (2026-11-06, the author): it attaches only inside a permission to
// create with images, granted turn by turn, so being on spends nothing by itself.
//
// Who draws (2026-11-14, the author: «facilitarle al usuario la creación de imágenes con sus
// agentes»): Google's Gemini, OpenAI's GPT Image or xAI's Grok Imagine, on the person's own key
// (src/modules/image-providers.mjs). What the person already has is found without asking — the key
// Gemini CLI keeps, the ones OpenCode and Codex signed in with — and what they do not have is
// offered with where to get it and a field to paste it. The model chosen is in config.json; until
// one is chosen, the first provider whose key is found draws.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';
import { normalizeKey } from '../credentials.mjs';
import { IMAGE_MODELS, IMAGE_PROVIDERS, defaultModel, imageProvider, pickImageModel, providerOf, providerTakesKey } from './image-providers.mjs';

// The IAs that draw with their own account and never use this module (src/capabilities.mjs).
const DRAW_ON_THEIR_OWN = ['codex', 'grok'];
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const fromHere = (request, viaPhone) => !viaPhone && LOCAL.has(request?.socket?.remoteAddress ?? '');

// Where the keys are, as a screen may know it: by the room's own lookup, or — in a context that
// offers only Gemini's (a test, an older caller) — Gemini's alone.
async function sourcesOf(ctx) {
  if (ctx.services?.imageSources) return ctx.services.imageSources();
  const key = await ctx.services?.imageKey?.().catch(() => null);
  return { gemini: key ? { from: 'gemini' } : null, openai: null, xai: null };
}
// The room's running copy has to hear about a new model at once, not only the file.
const tellRoom = (ctx, model) => ctx.services?.setImageModule?.({ enabled: true, model: model ?? null, stateRoot: ctx.stateRoot ?? null, home: ctx.services?.imageHome ?? null });
const keepModel = async (ctx, model) => {
  await ctx.updateConfig({ modules: { imageStudio: { ...(ctx.config?.modules?.imageStudio ?? {}), model } } });
  tellRoom(ctx, model);
};

export default defineModule({
  id: 'image-studio',
  configKey: 'imageStudio',
  name: 'Images',
  vendor: 'MADRE · Gemini, OpenAI, xAI',
  version: '1.1.0',
  summary: 'Gives Claude Code, Gemini CLI and OpenCode an image tool, through a MADRE-owned MCP server on the image model you choose (Gemini, OpenAI or Grok) and your own key and credits.',
  creates: ['nothing in the project · images land in the lease folder', 'the model in ~/.pulse/config.json', 'an MCP server per turn, started and stopped by the project', 'a key you paste here, in MADRE\'s vault, readable only by you'],
  // Not something it writes: a condition for it to attach at all, which is what REQUIRES is for.
  requires: ['a key with credit for Gemini, OpenAI or Grok: one your AIs already use, or one you paste here', 'attached only inside a permission to create with images on'],
  models: IMAGE_MODELS,
  // No model until the person picks one: the first provider whose key is found draws.
  settings: { enabled: true, model: null },
  card: 'fixed',
  controls: [{
    key: 'model', label: 'MODEL', type: 'select', options: IMAGE_MODELS,
    choices: IMAGE_PROVIDERS.flatMap((provider) => provider.models.map((model) => ({ value: model.id, label: `${provider.vendor} · ${model.label}` }))),
    note: 'The image model Images draws with. It bills against your own key.',
  }],
  // Changing the model has to reach the running room, not just the file.
  async onSettings(ctx, settings) { tellRoom(ctx, settings.model); },
  async status(ctx) {
    const sources = await sourcesOf(ctx);
    const pick = pickImageModel(ctx.settings.model ?? null, sources);
    const ready = Boolean(pick && sources[pick.provider]);
    const vendor = imageProvider(pick?.provider)?.vendor ?? '';
    return {
      model: pick?.model ?? null,
      // «With what it draws», for the module's page: every provider, whether its key is here and
      // where it was found — never the key — and its models.
      drawing: {
        chosen: ctx.settings.model ?? null,
        model: pick?.model ?? null,
        provider: pick?.provider ?? null,
        auto: Boolean(pick?.auto),
        native: DRAW_ON_THEIR_OWN,
        providers: IMAGE_PROVIDERS.map((provider) => ({
          id: provider.id, name: provider.name, vendor: provider.vendor, keyUrl: provider.keyUrl, variable: provider.variable,
          ready: Boolean(sources[provider.id]),
          from: sources[provider.id]?.from ?? null,
          models: provider.models.map((model) => ({ id: model.id, label: model.label, hint: model.hint })),
        })),
      },
      // Without a key it is on all the same; it says so, since an image asked for would fail.
      status: { installed: true, detail: !pick ? `${t('on')}${t(' · no image key found')}` : `${t('on')} · ${pick.model}${ready ? '' : t(' · no {vendor} key found', { vendor })}` },
      preflight: ready ? { ok: true, problems: [] } : { ok: false, problems: ['No image key yet: connect Gemini, OpenAI or Grok in Modules › Images. Each image is billed to that key.'] },
      install: { display: 'always on', platforms: ['gemini', 'claude', 'opencode'] },
      fixed: true,
    };
  },
  async toggle() { return { status: 405, body: { error: 'Images has no switch: it is always on.' } }; },
  routes: [
    // An OpenAI or xAI key pasted in MODULES › Images. Taken only from this computer, as every key is;
    // asked of its provider first (listing the models spends nothing), then kept in MADRE's vault under
    // this module's name, `0600`. The ledger keeps that a key was kept and how long it is, never the key.
    // A Gemini key is not kept here: it goes where Gemini CLI reads it (Settings › Your AIs, the same call).
    { method: 'POST', path: '/api/image-studio/key', handler: async (ctx, { request, payload = {}, viaPhone } = {}) => {
      if (!fromHere(request, viaPhone)) return { status: 403, body: { error: t('A key is only accepted from this computer, never over the network.') } };
      const provider = imageProvider(payload.provider);
      if (!provider || provider.id === 'gemini') return { status: 400, body: { error: t('Here a key is kept for OpenAI or Grok. A Gemini key is kept where Gemini CLI reads it.') } };
      const checked = normalizeKey(payload.key);
      if (!checked.ok) return { status: 400, body: { error: checked.error } };
      const taken = await (ctx.services?.verifyImageKey ?? providerTakesKey)(provider.id, checked.key);
      if (taken.ok === false) return { status: 422, body: { error: t('{vendor} did not accept this key (HTTP {status}): check you copied all of it, or make a new one. Nothing was kept.', { vendor: provider.vendor, status: taken.status }) } };
      const kept = await ctx.vault.keep(provider.id, checked.key);
      if (!kept.ok) return { status: 400, body: { error: kept.error } };
      await ctx.record('module.secret.kept', { module: 'image-studio', name: provider.id, bytes: kept.bytes });
      // What was just connected is what draws from now on; the page lets the person change it.
      const model = defaultModel(provider.id);
      await keepModel(ctx, model);
      return { status: 200, body: { ok: true, model, checked: taken.ok === true } };
    } },
    // Forgets a key MADRE kept for Images. The ones a CLI keeps are that CLI's: they are signed out there.
    { method: 'POST', path: '/api/image-studio/key/forget', handler: async (ctx, { request, payload = {}, viaPhone } = {}) => {
      if (!fromHere(request, viaPhone)) return { status: 403, body: { error: t('A key is only accepted from this computer, never over the network.') } };
      const provider = imageProvider(payload.provider);
      if (!provider || provider.id === 'gemini') return { status: 400, body: { error: t('Here a key is kept for OpenAI or Grok. A Gemini key is kept where Gemini CLI reads it.') } };
      const gone = await ctx.vault.forget(provider.id);
      if (!gone.ok) return { status: 400, body: { error: gone.error } };
      await ctx.record('module.secret.forgotten', { module: 'image-studio', name: gone.forgot });
      // A model of the provider whose key went is no longer a choice that can draw: back to the first found.
      if (providerOf(ctx.settings.model) === provider.id) await keepModel(ctx, null);
      return { status: 200, body: { ok: true } };
    } },
  ],
});
