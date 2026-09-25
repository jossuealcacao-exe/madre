// Image Studio: MADRE's own MCP image server on the Gemini image models, for
// the CLIs that cannot draw natively. A switch and a model in config.json.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

const MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];

export default defineModule({
  id: 'image-studio',
  configKey: 'imageStudio',
  name: 'Image Studio',
  vendor: 'MADRE · Gemini API',
  version: '1.0.0',
  summary: 'Gives Gemini CLI, Claude Code and OpenCode an image tool, through a MADRE-owned MCP server on the Gemini image models and your own key and credits.',
  creates: ['nothing in the project \u00b7 images land in the lease folder', 'an entry in ~/.pulse/config.json', 'an MCP server per turn, started and stopped by the room', 'attached only inside a creation lease with the image scope on'],
  requires: ['a Gemini API key with credits (the one the Gemini CLI stores, or GEMINI_API_KEY)'],
  models: MODELS,
  settings: { enabled: false, model: MODELS[0] },
  card: 'image-studio',
  controls: [{ key: 'model', label: 'MODEL', type: 'select', options: MODELS, note: 'The Gemini image model Image Studio draws with. It bills against your own key.' }],
  // Changing the model while it is on has to reach the running room, not just the file.
  async onSettings(ctx, settings) { if (settings.enabled) ctx.services.setImageModule({ enabled: true, model: settings.model }); },
  async status(ctx) {
    const key = await ctx.services.imageKey();
    const model = ctx.settings.model ?? MODELS[0];
    return {
      model,
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? `${t('on')} · ${model}${key ? '' : t(' · no Gemini key found')}` : key ? t('key found') : t('no Gemini key found') },
      preflight: key ? { ok: true, problems: [] } : { ok: false, problems: ['No Gemini API key: sign in with the Gemini CLI (/auth → API key) or set GEMINI_API_KEY. Image models bill against that key.'] },
      install: { display: ctx.settings.enabled ? 'disable Image Studio' : 'enable Image Studio (config.json)', platforms: ['gemini', 'claude', 'opencode'] },
    };
  },
  async toggle(ctx, payload) {
    const enabled = !ctx.settings.enabled;
    const key = await ctx.services.imageKey();
    if (enabled && !key) return { status: 412, body: { error: 'No Gemini API key found. Sign in with the Gemini CLI (/auth → API key) or set GEMINI_API_KEY, then enable Image Studio.' } };
    const model = typeof payload?.model === 'string' && payload.model ? payload.model : (ctx.settings.model ?? MODELS[0]);
    await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), imageStudio: { enabled, model } } });
    ctx.services.setImageModule({ enabled, model });
    await ctx.record('extension.toggled', { id: 'image-studio', name: 'Image Studio', enabled, model });
    return { status: 200, body: { enabled, model, capabilities: ctx.room.capabilities() } };
  },
});
