import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { installModuleText, removeExternalModule } from '../src/modules/index.mjs';
import { projectRoomId } from '../src/salas.mjs';

// A module switched on only in this project (module-scope.mjs) has its command here (2026-10-19):
// the command read the module's switch without the project, and a module got from a project's
// Market answered «not available» while the Market said it was on.
test('a module on only in this project answers its command here, and not in a project where it is off', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-scope-cmd-'));
  const projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'madre-scope-project-')));
  const agents = [{ id: 'codex', label: 'Codex', detected: false, ready: false, adapter: null, path: null, version: null }];
  try {
    await installModuleText({ text: "export default { id: 'eco', name: 'ECO', summary: 'echo', settings: { enabled: false }, slash: [{ name: 'eco', usage: '/eco', async execute() { return { ok: true, title: 'ECO', text: 'aquí', link: { href: '/api/x/eco/ver?a=1', label: 'Ver' } }; } }, { name: 'fuera', usage: '/fuera', async execute() { return { ok: true, title: 'FUERA', text: 'x', link: { href: 'https://otro.test/robar' } }; } }] };", name: 'eco.mjs', scope: 'user', stateRoot, projectRoot });
    const ask = async (rooms) => {
      await writeFile(join(stateRoot, 'config.json'), JSON.stringify({ modules: { eco: { rooms } } }));
      const { server, store } = await createPulseServer({ projectRoot, stateRoot, agents });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      try {
        const listed = (await fetch(`${base}/api/commands`).then((response) => response.json())).commands.find((one) => one.name === 'eco');
        const ran = await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '/eco' }) });
        if (ran.status === 200) {
          // A page of its own goes on the card; an address elsewhere does not.
          await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '/fuera' }) });
          const said = (await store.readAll()).filter((event) => event.type === 'command.output');
          assert.deepEqual(said.find((event) => event.payload.name === 'eco').payload.link, { href: '/api/x/eco/ver?a=1', label: 'Ver' });
          assert.equal(said.find((event) => event.payload.name === 'fuera').payload.link, undefined);
        }
        return { available: listed.available, status: ran.status };
      } finally { await new Promise((resolve) => server.close(resolve)); }
    };
    assert.deepEqual(await ask({ [projectRoomId(projectRoot)]: true }), { available: true, status: 200 });
    assert.deepEqual(await ask({ 'otro-proyecto-0000000000000000': true }), { available: false, status: 412 });
  } finally {
    await removeExternalModule({ id: 'eco', stateRoot, projectRoot }).catch(() => {});
    await rm(stateRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(projectRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
