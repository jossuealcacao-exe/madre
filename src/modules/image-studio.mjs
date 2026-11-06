// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Image Studio: MADRE's own MCP image server on the Gemini image models, for
// the CLIs that cannot draw natively. Always on, as Options and Commands are (2026-11-06, the author):
// it attaches only inside a permission to create with images, granted turn by turn, so being on spends
// nothing by itself. The model is in config.json.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

const MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];

export default defineModule({
  id: 'image-studio',
  configKey: 'imageStudio',
  name: 'Images',
  vendor: 'MADRE · Gemini API',
  version: '1.0.0',
  summary: 'Gives Gemini CLI, Claude Code and OpenCode an image tool, through a MADRE-owned MCP server on the Gemini image models and your own key and credits.',
  creates: ['nothing in the project \u00b7 images land in the lease folder', 'the model in ~/.pulse/config.json', 'an MCP server per turn, started and stopped by the project'],
  // Not something it writes: a condition for it to attach at all, which is what REQUIRES is for.
  requires: ['a Gemini API key with credits (the one the Gemini CLI stores, or GEMINI_API_KEY)', 'attached only inside a permission to create with images on'],
  models: MODELS,
  settings: { enabled: true, model: MODELS[0] },
  card: 'fixed',
  controls: [{ key: 'model', label: 'MODEL', type: 'select', options: MODELS, note: 'The Gemini image model Image Studio draws with. It bills against your own key.' }],
  // Changing the model has to reach the running room, not just the file.
  async onSettings(ctx, settings) { ctx.services.setImageModule({ enabled: true, model: settings.model }); },
  async status(ctx) {
    const key = await ctx.services.imageKey();
    const model = ctx.settings.model ?? MODELS[0];
    return {
      model,
      // Without a key it is on all the same; it says so, since an image asked for would fail.
      status: { installed: true, detail: `${t('on')} · ${model}${key ? '' : t(' · no Gemini key found')}` },
      preflight: key ? { ok: true, problems: [] } : { ok: false, problems: ['No Gemini API key: sign in with the Gemini CLI (/auth → API key) or set GEMINI_API_KEY. Image models bill against that key.'] },
      install: { display: 'always on', platforms: ['gemini', 'claude', 'opencode'] },
      fixed: true,
    };
  },
  async toggle() { return { status: 405, body: { error: 'Images has no switch: it is always on.' } }; },
});
