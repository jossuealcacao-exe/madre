// OLLAMA: local intelligence. Embeddings and distillation on this machine when
// Ollama runs. The server offers the wiring through ctx.services.ollama.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';
import { findOnPath } from './helpers.mjs';
import { RECOMMENDED } from '../ollama.mjs';

// Ollama is not an npm package, so each system has its own way in. Where MADRE can run it, the
// command is shown on the button before it runs; where it cannot, it hands over the download.
export function ollamaInstallPlan({ platform = process.platform, brew = null } = {}) {
  if (platform === 'darwin') {
    return brew
      ? { command: brew, args: ['install', 'ollama'], display: 'brew install ollama', note: 'Installs Ollama with Homebrew, the package manager already on this computer.' }
      : { command: null, download: 'https://ollama.com/download', display: null, note: 'Homebrew is not on this computer. Download Ollama from ollama.com, open it once, and press RECHECK.' };
  }
  if (platform === 'linux') {
    return { command: 'sh', args: ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], display: 'curl -fsSL https://ollama.com/install.sh | sh', note: "Ollama's own install script, downloaded from ollama.com and run on this computer." };
  }
  return { command: null, download: 'https://ollama.com/download', display: null, note: 'Download the Ollama installer from ollama.com, run it, and press RECHECK.' };
}

// A newer Ollama. Where MADRE can do it, the command is shown before it runs; where it cannot,
// it hands over the download rather than pretending.
export function ollamaUpdatePlan({ platform = process.platform, brew = null } = {}) {
  if (platform === 'darwin') {
    return brew
      ? { command: brew, args: ['upgrade', 'ollama'], display: 'brew upgrade ollama', note: 'Upgrades Ollama with Homebrew. Your models stay where they are.' }
      : { command: null, download: 'https://ollama.com/download', display: null, note: 'Ollama was not installed with Homebrew. Download the newer one from ollama.com, open it once, and press RECHECK. Your models stay where they are.' };
  }
  if (platform === 'linux') {
    return { command: 'sh', args: ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], display: 'curl -fsSL https://ollama.com/install.sh | sh', note: "Ollama's own install script upgrades in place. Your models stay where they are." };
  }
  return { command: null, download: 'https://ollama.com/download', display: null, note: 'Download the newer Ollama from ollama.com and run it. Your models stay where they are.' };
}

// Waking it: the same command on every system, and the app on macOS does it too.
export const ollamaStartPlan = () => ({ command: 'ollama', args: ['serve'], display: 'ollama serve' });

// What the room needs to know about the local brain: its own state, whether it is even on this
// computer, and the one step that moves it forward. The card and the routes share this.
export async function ollamaView(probe, settings) {
  const binary = await findOnPath('ollama');
  return { ...probe, settings, binary, install: ollamaInstallPlan({ brew: await findOnPath('brew') }), start: ollamaStartPlan() };
}

export default defineModule({
  id: 'ollama',
  name: 'OLLAMA',
  vendor: 'MADRE · LOCAL INTELLIGENCE',
  tracks: { name: 'ollama', github: 'ollama/ollama' },
  summary: 'Recall by meaning and memory distillation on this machine, through Ollama: no provider tokens, nothing leaves.',
  creates: ['nothing in the project', 'a block in ~/.pulse/config.json', 'models in Ollama\'s own store when you press PULL'],
  requires: ['Ollama running (the app, or ollama serve)', 'an embedding model and a chat model \u00b7 MADRE can pull the recommended ones'],
  settings: { enabled: true, embeddings: true, archivist: true, agent: true },
  card: 'ollama',
  async status(ctx) {
    const probe = ctx.services.ollama?.state() ?? { running: false, models: [], embedModel: null, chatModel: null };
    const view = await ollamaView(probe, ctx.settings);
    const binary = view.binary;
    const settings = ctx.settings;
    const roles = [settings.embeddings && probe.embedModel ? `${t('embeddings')} · ${probe.embedModel}` : null, settings.archivist && probe.chatModel ? `${t('archivist')} · ${probe.chatModel}` : null, settings.agent !== false && probe.chatModel ? t('@madre in the room') : null].filter(Boolean);
    const detail = !probe.running ? (binary ? t('installed, not running · START it here') : t('not installed · INSTALL it here'))
      : !settings.enabled ? t('off · {n} models available', { n: probe.models.length })
        : roles.length ? `${t('on')} · ${roles.join(' · ')}` : t('on · no usable model yet · PULL one');
    return {
      runs: [{ name: 'ollama', version: probe.version ?? null }],
      models: probe.models.map((model) => model.name),
      status: { installed: settings.enabled && probe.running && roles.length > 0, detail },
      ollama: view,
      recommended: RECOMMENDED,
      preflight: probe.running ? { ok: true, problems: [] } : { ok: false, problems: ['Ollama is not running: open the Ollama app or run `ollama serve`, then RECHECK.'] },
      install: { display: settings.enabled ? 'disable Ollama' : 'enable Ollama (config.json)', platforms: [] },
    };
  },
  async updatePlan(ctx) {
    const { findOnPath } = await import('./helpers.mjs');
    return ollamaUpdatePlan({ brew: await findOnPath('brew') });
  },
  async toggle(ctx) {
    const enabled = !(ctx.settings.enabled ?? true);
    await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), ollama: { ...(ctx.config.modules?.ollama ?? {}), enabled } } });
    const status = await ctx.services.ollama.wire();
    await ctx.record('extension.toggled', { id: 'ollama', name: 'OLLAMA', enabled });
    return { status: 200, body: { enabled, ollama: status } };
  },
  routes: [
    { method: 'GET', path: '/api/ollama', handler: async (ctx) => ({ status: 200, body: { ollama: await ollamaView(await ctx.services.ollama.wire({ probe: false }), ctx.settings), recommended: RECOMMENDED } }) },
    { method: 'POST', path: '/api/ollama/probe', handler: async (ctx) => ({ status: 200, body: { ollama: await ollamaView(await ctx.services.ollama.wire(), ctx.settings), recommended: RECOMMENDED } }) },
    { method: 'POST', path: '/api/ollama/settings', handler: async (ctx, { payload }) => {
      const next = { ...(ctx.config.modules?.ollama ?? {}) };
      for (const key of ['embeddings', 'archivist', 'agent', 'enabled']) if (typeof payload[key] === 'boolean') next[key] = payload[key];
      await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), ollama: next } });
      return { status: 200, body: { ollama: await ctx.services.ollama.wire({ probe: false }) } };
    } },
    { method: 'POST', path: '/api/ollama/install', handler: async (ctx) => {
      const started = await ctx.services.ollama.install();
      return started.ok ? { status: 202, body: { installing: true, command: started.command } } : { status: started.download ? 412 : 409, body: { error: started.error, download: started.download ?? null } };
    } },
    { method: 'POST', path: '/api/ollama/start', handler: async (ctx) => {
      const started = await ctx.services.ollama.start();
      return started.ok ? { status: 200, body: { ollama: ctx.services.ollama.state() } } : { status: 412, body: { error: started.error } };
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
