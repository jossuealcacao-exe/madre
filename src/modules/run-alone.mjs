// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// One call into a human module. The parent starts this file with Node's permission model:
// the module can read its own file and MADRE's SDK, but cannot read other files, write or spawn.
// The only way back into MADRE is a named ctx method answered by the parent.
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { setLanguage, t } from '../i18n.mjs';
import { defineModule } from './sdk.mjs';

const wire = (value) => process.stdout.write(`\n${JSON.stringify({ madreModule: true, ...value })}\n`);
const pending = new Map();
let sequence = 0;
const ask = (method, args = []) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  wire({ type: 'ctx', id, method, args });
});

function context(input = {}) {
  const ctx = {
    projectRoot: input.projectRoot,
    stateRoot: input.stateRoot,
    roomId: input.roomId,
    chat: input.chat,
    config: input.config ?? {},
    settings: input.settings ?? {},
    env: {},
    agents: input.agents ?? [],
    language: input.language ?? 'en',
    t,
    readConfig: () => ask('readConfig'),
    updateConfig: (patch) => ask('updateConfig', [patch]),
    record: (type, payload) => ask('record', [type, payload]),
    vault: {
      get: (name) => ask('vault.get', [name]),
      held: () => ask('vault.held'),
      keep: (name, value) => ask('vault.keep', [name, value]),
      forget: (name) => ask('vault.forget', [name]),
    },
    services: {
      history: (range) => ask('services.history', [range]),
      ollama: {
        state: () => input.ollamaState ?? null,
        generate: (request) => ask('services.ollama.generate', [request]),
      },
    },
    room: input.hasRoom ? {
      capabilities: () => input.capabilities ?? null,
      runningTurn: (id) => id === input.turnId ? input.runningTurn ?? null : null,
      record: (type, payload) => ask('room.record', [type, payload]),
    } : null,
  };
  return ctx;
}

async function invoke(message) {
  setLanguage(message.ctx?.language ?? 'en');
  // The parent owns the log file. A hook may reach the network only when its module declared
  // a destination; every fetch it makes is reported without a body, header or query value.
  const fetchImpl = globalThis.fetch;
  globalThis.fetch = async (resource, init = {}) => {
    const url = typeof resource === 'string' ? resource : (resource?.url ?? String(resource));
    const method = init?.method ?? resource?.method ?? 'GET';
    const bytes = typeof init?.body === 'string' ? Buffer.byteLength(init.body) : null;
    const started = Date.now();
    try {
      const response = await fetchImpl(resource, init);
      await ask('outbound.record', [{ url, method, bytes, status: response?.status ?? null, ok: Boolean(response?.ok), ms: Date.now() - started }]).catch(() => null);
      return response;
    } catch (error) {
      await ask('outbound.record', [{ url, method, bytes, ok: false, ms: Date.now() - started, error: error?.code ?? error?.name ?? 'failed' }]).catch(() => null);
      throw error;
    }
  };
  const file = process.argv[2];
  const loaded = await import(pathToFileURL(file).href);
  let spec = loaded.default ?? loaded.module ?? null;
  if (typeof spec === 'function') spec = await spec({ defineModule });
  if (!spec || typeof spec !== 'object') throw new Error('the default export must be a module spec object');
  const module = typeof spec.describe === 'function' ? spec : defineModule(spec);
  if (module.id !== message.expectedId) throw new Error('the module changed its id after it was checked');
  const ctx = context(message.ctx);
  const args = message.args ?? [];
  if (message.operation === 'route') {
    const route = module.routes?.[message.index];
    if (typeof route?.handler !== 'function') throw new Error('the route has no handler');
    const request = args[0] ?? {};
    return route.handler(ctx, { ...request, request: { method: request.method, headers: request.headers }, url: request.url ? new URL(request.url) : null });
  }
  if (message.operation === 'slash' || message.operation === 'available') {
    const command = module.slash?.[message.index];
    const fn = command?.[message.operation === 'slash' ? 'execute' : 'available'];
    if (typeof fn !== 'function') throw new Error('the command has no such hook');
    return fn(ctx, ...args);
  }
  const fn = module[message.operation];
  if (typeof fn !== 'function') throw new Error(`the module has no ${message.operation} hook`);
  if (['detect', 'preflight', 'installCommand'].includes(message.operation)) return fn.call(module, ...args);
  if (message.operation === 'describe') return fn.call({ ...module, external: true, file }, ctx);
  return fn.call(module, ctx, ...args);
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (!message?.madreModule) return;
  if (message.type === 'ctxResult') {
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.ok) waiting.resolve(message.value);
    else waiting.reject(new Error(message.error ?? 'MADRE refused the call'));
    return;
  }
  if (message.type !== 'invoke') return;
  void invoke(message).then(
    (value) => wire({ type: 'done', ok: true, value }),
    (error) => wire({ type: 'done', ok: false, error: String(error?.message ?? error), code: error?.code ?? null }),
  ).finally(() => { lines.close(); process.stdin.pause(); });
});
