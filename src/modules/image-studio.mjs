// Image Studio: MADRE's own MCP image server on the Gemini image models, for
// the CLIs that cannot draw natively. A switch and a model in config.json.

import { defineModule } from './sdk.mjs';

const MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];

export default defineModule({
  id: 'image-studio',
  configKey: 'imageStudio',
  name: 'Image Studio',
  vendor: 'MADRE · Gemini API',
  summary: 'Gives Gemini CLI, Claude Code and OpenCode an image-generation tool through a MADRE-owned MCP server on the Gemini API image models, using your own Gemini key and credits. Attached only inside a creation lease with the image scope on.',
  creates: ['nothing in the project: images land in the lease directory like any artifact', 'an "image-studio" entry in ~/.pulse/config.json', 'an MCP server process per turn, started and stopped by the room'],
  requires: ['a Gemini API key with credits (the key the Gemini CLI stores, or GEMINI_API_KEY)'],
  models: MODELS,
  settings: { enabled: false, model: MODELS[0] },
  card: 'image-studio',
  async status(ctx) {
    const key = await ctx.services.imageKey();
    const model = ctx.settings.model ?? MODELS[0];
    return {
      model,
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? `on · ${model}${key ? '' : ' · no Gemini key found'}` : key ? 'key found' : 'no Gemini key found' },
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
