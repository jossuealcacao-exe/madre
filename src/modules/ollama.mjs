// OLLAMA: local intelligence. Embeddings and distillation on this machine when
// Ollama runs. The server offers the wiring through ctx.services.ollama.

import { defineModule } from './sdk.mjs';
import { RECOMMENDED } from '../ollama.mjs';

export default defineModule({
  id: 'ollama',
  name: 'OLLAMA',
  vendor: 'MADRE · LOCAL INTELLIGENCE',
  summary: 'Recall by meaning and memory distillation on this machine through Ollama: no provider tokens, nothing leaves. Needs Ollama running with an embedding model and a chat model; MADRE can pull the recommended ones.',
  creates: ['nothing in the project', 'an ollama block in ~/.pulse/config.json', 'models in Ollama\'s own store when you press PULL'],
  requires: ['Ollama installed and running (ollama serve, or the Ollama app)'],
  settings: { enabled: true, embeddings: true, archivist: true },
  card: 'ollama',
  async status(ctx) {
    const probe = ctx.services.ollama?.state() ?? { running: false, models: [], embedModel: null, chatModel: null };
    const settings = ctx.settings;
    const roles = [settings.embeddings && probe.embedModel ? `embeddings · ${probe.embedModel}` : null, settings.archivist && probe.chatModel ? `archivist · ${probe.chatModel}` : null].filter(Boolean);
    const detail = !probe.running ? 'not running · start Ollama and RECHECK'
      : !settings.enabled ? `off · ${probe.models.length} model${probe.models.length === 1 ? '' : 's'} available`
        : roles.length ? `on · ${roles.join(' · ')}` : 'on · no usable model yet · PULL one';
    return {
      models: probe.models.map((model) => model.name),
      status: { installed: settings.enabled && probe.running && roles.length > 0, detail },
      ollama: { ...probe, settings },
      recommended: RECOMMENDED,
      preflight: probe.running ? { ok: true, problems: [] } : { ok: false, problems: ['Ollama is not running: open the Ollama app or run `ollama serve`, then RECHECK.'] },
      install: { display: settings.enabled ? 'disable Ollama' : 'enable Ollama (config.json)', platforms: [] },
    };
  },
  async toggle(ctx) {
    const enabled = !(ctx.settings.enabled ?? true);
    await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), ollama: { ...(ctx.config.modules?.ollama ?? {}), enabled } } });
    const status = await ctx.services.ollama.wire();
    await ctx.record('extension.toggled', { id: 'ollama', name: 'OLLAMA', enabled });
    return { status: 200, body: { enabled, ollama: status } };
  },
  routes: [
    { method: 'GET', path: '/api/ollama', handler: async (ctx) => ({ status: 200, body: { ollama: await ctx.services.ollama.wire({ probe: false }), recommended: RECOMMENDED } }) },
    { method: 'POST', path: '/api/ollama/probe', handler: async (ctx) => ({ status: 200, body: { ollama: await ctx.services.ollama.wire(), recommended: RECOMMENDED } }) },
    { method: 'POST', path: '/api/ollama/settings', handler: async (ctx, { payload }) => {
      const next = { ...(ctx.config.modules?.ollama ?? {}) };
      for (const key of ['embeddings', 'archivist', 'enabled']) if (typeof payload[key] === 'boolean') next[key] = payload[key];
      await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), ollama: next } });
      return { status: 200, body: { ollama: await ctx.services.ollama.wire({ probe: false }) } };
    } },
    { method: 'POST', path: '/api/ollama/pull', handler: async (ctx, { payload }) => {
      const model = String(payload.model ?? '').trim();
      if (!/^[a-z0-9][a-z0-9._:/-]{1,80}$/i.test(model)) return { status: 400, body: { error: 'Give a model name like nomic-embed-text or qwen2.5:3b.' } };
      if (!ctx.services.ollama.state().running) return { status: 412, body: { error: 'Ollama is not running.' } };
      const started = await ctx.services.ollama.pull(model);
      return started.ok ? { status: 202, body: { pulling: model } } : { status: 409, body: { error: started.error } };
    } },
  ],
});
