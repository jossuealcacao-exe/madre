import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { installModuleText, loadExternalModules } from '../src/modules/index.mjs';
import { updateConfig } from '../src/config.mjs';

// Q-6 (2026-11-05): a module a person installs runs each call in a Node process of its own
// (RX-2), so every event a module listens to starts one. One switched off must hear nothing: the
// SDK promises `onEvent` «while your module is on», and an external module is a switch like any
// built-in one (kind 'builtin', off until it is turned on).
const LISTENER = `export default ({ defineModule }) => defineModule({
  id: 'oyente', name: 'Oyente', summary: 'Hears the conversation for a test.', version: '1.0.0',
  async onEvent(ctx, event) {
    if (event.type === 'message.created') await ctx.record('oyente.heard', { of: event.type });
  },
});
`;

test('modules · an installed module switched off hears no event, and one switched on does (Q-6)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-q6-'));
  const project = join(root, 'project');
  await mkdir(project, { recursive: true });
  const installed = await installModuleText({ text: LISTENER, name: 'oyente.mjs', stateRoot: root, projectRoot: project });
  const heard = async (on) => {
    if (on) await updateConfig(root, { modules: { [installed.configKey ?? 'oyente']: { enabled: true } } });
    const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: '1' }], invokers: { 'codex-readonly': async () => ({ text: 'Hola.', usage: null }) }, testMode: true });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hola', target: 'codex' }) });
      // Long enough for a process of its own to start, hear and answer.
      for (let tries = 0; tries < 60; tries += 1) {
        if ((await store.readAll()).some((event) => event.type === 'oyente.heard')) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return (await store.readAll()).filter((event) => event.type === 'oyente.heard').length;
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  };
  try {
    assert.equal(await heard(false), 0, 'a module switched off heard the conversation');
    assert.ok(await heard(true) > 0, 'a module switched on heard nothing');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await loadExternalModules({ stateRoot: root, projectRoot: project }).catch(() => null);
  }
});

// What an author reads about it: each event a new process, so nothing kept in a variable survives,
// and the plan notices arrive even when nobody writes.
test('modules · the SDK says onEvent starts a new process each time, in both languages (Q-6)', async () => {
  const es = await readFile(new URL('../docs/SDK.md', import.meta.url), 'utf8');
  const en = await readFile(new URL('../docs/en/SDK.md', import.meta.url), 'utf8');
  assert.match(es, /cada evento abre un proceso nuevo: lo que guardes en una variable no llega al siguiente/);
  assert.match(en, /each event starts a new process: what you keep in a variable doesn't reach the next one/);
});
