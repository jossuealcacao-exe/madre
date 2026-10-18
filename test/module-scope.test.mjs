import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleOnIn, scopeIn, scopeView, settingsIn, switchIn } from '../src/module-scope.mjs';
import { defineModule } from '../src/modules/sdk.mjs';

// Which projects a module is on in (2026-10-18): a project's own word wins over «every project».
test('module scope · a project reads its own word, and every project the switch for all', () => {
  const block = { enabled: false, rooms: { 'web-0123456789abcdef': true } };
  assert.equal(moduleOnIn(block, 'web-0123456789abcdef'), true);
  assert.equal(moduleOnIn(block, 'api-0123456789abcdef'), false);
  assert.equal(moduleOnIn(block, null), false, 'Home reads the switch for every project');
  assert.equal(moduleOnIn({}, 'any', true), true, 'a module that starts on stays on with nothing written');
  assert.equal(moduleOnIn({ enabled: true, rooms: { a: false } }, 'a'), false, 'a project can say no to a module on for all');
  assert.deepEqual(settingsIn({ enabled: true, model: 'm', rooms: { a: false } }, 'a'), { enabled: false, model: 'm', rooms: { a: false } });
  assert.equal(moduleOnIn({ enabled: false, rooms: { '../x': true } }, '../x'), false, 'only a room id is a word');
});

test('module scope · a project\'s switch writes its word; Home\'s «every project» clears the words', () => {
  assert.deepEqual(switchIn({ enabled: false, model: 'm' }, 'a', true), { enabled: false, model: 'm', rooms: { a: true } });
  assert.deepEqual(switchIn({ enabled: false }, null, true), { enabled: true }, 'Home\'s own switch is every project\'s');
  assert.deepEqual(scopeIn({ enabled: false, rooms: { a: true, b: false } }, { all: true }), { enabled: true });
  assert.deepEqual(scopeIn({ enabled: false }, { rooms: { a: true } }), { enabled: false, rooms: { a: true } });
  assert.deepEqual(scopeIn({ enabled: false, rooms: { a: true } }, { rooms: { a: null } }), { enabled: false }, 'null lets the project follow every project again');
  const view = scopeView({ enabled: false, rooms: { a: true } }, false, ['a', 'b']);
  assert.deepEqual([view.all, view.on, view.everywhere], [false, ['a'], false]);
});

test('module scope · the SDK switch moves this project\'s word, and `scope` is Home\'s, asking `ready` first', async () => {
  let saved = {};
  const recorded = [];
  let readyAsked = 0;
  const module = defineModule({ id: 'demo-scope', name: 'Demo', ready: async () => { readyAsked += 1; return null; } });
  const ctx = (roomId) => ({ config: { modules: saved }, roomId, stateRoot: '/tmp', updateConfig: async (patch) => { saved = { ...saved, ...patch.modules }; }, record: async (type, payload) => recorded.push({ type, payload }) });
  const on = await module.toggle(ctx('a'));
  assert.equal(on.body.enabled, true);
  assert.deepEqual(saved.demoScope, { rooms: { a: true } }, 'only project a');
  assert.equal(readyAsked, 1);
  assert.equal((await module.describe(ctx('b'))).status.installed, false, 'project b is untouched');
  assert.deepEqual((await module.describe(ctx('a'))).scope, { all: false, here: true });
  const all = await module.scope(ctx(null), { all: true });
  assert.deepEqual(all.body, { all: true, rooms: {} });
  assert.equal((await module.describe(ctx('b'))).status.installed, true);
  assert.equal(readyAsked, 2);
  await module.scope(ctx(null), { all: false });
  assert.equal(readyAsked, 2, 'turning off asks nothing');
  assert.ok(recorded.every((one) => one.type === 'extension.toggled'));
});
