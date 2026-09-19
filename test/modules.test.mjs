import test from 'node:test';
import assert from 'node:assert/strict';
import { defineModule, matchRoute } from '../src/modules/sdk.mjs';
import { MODULES, moduleById, describeModules, findModuleRoute } from '../src/modules/index.mjs';
import { EXTENSIONS, extensionById, listExtensions } from '../src/extensions.mjs';

const fakeCtx = (config = {}, extra = {}) => {
  const writes = [];
  const events = [];
  return {
    ctx: { projectRoot: '/p', stateRoot: '/s', config, env: {}, agents: [], room: { setAshCode() {}, capabilities: () => ({}) }, readConfig: async () => config, updateConfig: async (patch) => { writes.push(patch); }, record: async (type, payload) => { events.push({ type, payload }); }, services: { imageKey: async () => null, setImageModule() {}, ...extra } },
    writes, events,
  };
};

test('sdk: defineModule normalises a builtin into a switch with settings in config.json under a camelCase key', async () => {
  const module = defineModule({ id: 'night-vision', name: 'Night Vision', summary: 'Sees in the dark.', settings: { gain: 2 } });
  assert.equal(module.kind, 'builtin');
  assert.equal(module.configKey, 'nightVision');
  assert.deepEqual(module.defaults, { enabled: false, gain: 2 });
  assert.deepEqual(module.settingsFrom({ modules: { nightVision: { enabled: true } } }), { enabled: true, gain: 2 });
  assert.throws(() => defineModule({ id: 'Bad Id', name: 'x' }), /kebab-case/);
  assert.throws(() => defineModule({ id: 'ok' }), /needs a name/);
  const { ctx, writes, events } = fakeCtx({ modules: {} });
  const off = await module.describe(ctx);
  assert.equal(off.status.installed, false);
  assert.equal(off.install.display, 'enable Night Vision (config.json)');
  assert.equal(off.card, 'switch');
  const flipped = await module.toggle(ctx, {});
  assert.deepEqual(flipped, { status: 200, body: { enabled: true } });
  assert.deepEqual(writes, [{ modules: { nightVision: { enabled: true } } }]);
  assert.deepEqual(events, [{ type: 'extension.toggled', payload: { id: 'night-vision', name: 'Night Vision', enabled: true } }]);
  Object.isFrozen(module);
});

test('sdk: a guarded switch refuses without confirm, an installer has no switch, routes match by string and RegExp', async () => {
  const guarded = defineModule({ id: 'beta-thing', name: 'Beta', confirm: 'Send confirm.' });
  const { ctx } = fakeCtx({ modules: {} });
  assert.deepEqual(await guarded.toggle(ctx, {}), { status: 400, body: { error: 'Send confirm.' } });
  assert.equal((await guarded.toggle(ctx, { confirm: true })).status, 200);
  const installer = defineModule({ id: 'ext', kind: 'installer', name: 'Ext', detect: async () => ({ installed: false }) });
  assert.equal(installer.toggle, null);
  assert.equal(installer.card, 'installer');
  const routes = defineModule({ id: 'r', name: 'R', routes: [{ method: 'get', path: '/api/r' }, { method: 'POST', path: /^\/api\/r\/(\d+)$/ }] }).routes;
  assert.equal(routes[0].method, 'GET');
  assert.deepEqual(matchRoute(routes, 'GET', '/api/r').params, []);
  assert.deepEqual(matchRoute(routes, 'POST', '/api/r/42').params, ['42']);
  assert.equal(matchRoute(routes, 'DELETE', '/api/r'), null);
});

test('registry: seven modules in MODULES order, the compat layer answers with the same objects, and Ollama serves its routes', async () => {
  assert.deepEqual(MODULES.map((module) => module.id), ['ahp', 'image-studio', 'git-pulse', 'ashcode', 'ripley', 'ollama', 'playwright']);
  assert.equal(EXTENSIONS, MODULES);
  assert.equal(extensionById('ahp'), moduleById('ahp'));
  assert.equal(typeof moduleById('ahp').installCommand, 'function');
  assert.equal(moduleById('ahp').kind, 'installer');
  assert.equal(moduleById('ashcode').configKey, 'ashCode');
  assert.equal(moduleById('image-studio').configKey, 'imageStudio');
  for (const path of ['/api/ollama', '/api/ollama/probe', '/api/ollama/settings', '/api/ollama/pull']) assert.equal(findModuleRoute(path === '/api/ollama' ? 'GET' : 'POST', path)?.module.id, 'ollama', path);
  assert.equal(findModuleRoute('GET', '/api/nothing'), null);

  const listed = await listExtensions({ projectRoot: '/tmp', config: { modules: { ripley: { enabled: true }, ashCode: { enabled: false } } } });
  const byId = Object.fromEntries(listed.map((item) => [item.id, item]));
  assert.equal(byId.ripley.status.detail, 'on · PREVIEW in the file viewer');
  assert.equal(byId.ashcode.status.detail, 'off · beta');
  assert.match(byId.ashcode.warning, /^Beta:/);
  assert.equal(byId['git-pulse'].fixed, true);
  assert.equal(byId.ollama.status.detail, 'not running · start Ollama and RECHECK');
  assert.equal(byId.ollama.recommended.embed, 'nomic-embed-text');
  assert.equal(byId['image-studio'].preflight.ok, false);
  assert.equal(byId.ahp.kind, 'installer');
  // describeModules with a fuller ctx is what the server uses.
  const { ctx } = fakeCtx({ modules: {} });
  assert.equal((await describeModules(ctx)).length, 6);
});

test('registry: the AshCode switch confirms, persists under ashCode and tells the room it is beta', async () => {
  const { ctx, writes, events } = fakeCtx({ modules: { imageStudio: { enabled: false } } });
  const ashcode = moduleById('ashcode');
  assert.equal((await ashcode.toggle(ctx, {})).status, 400);
  const on = await ashcode.toggle(ctx, { confirm: true });
  assert.equal(on.body.enabled, true);
  assert.equal(on.body.beta, true);
  assert.deepEqual(writes[0], { modules: { imageStudio: { enabled: false }, ashCode: { enabled: true } } });
  assert.equal(events[0].payload.beta, true);
});
