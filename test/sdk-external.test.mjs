import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULES, loadExternalModules, moduleById, moduleCommands, describeModules, toolsForTurn } from '../src/modules/index.mjs';

test('external modules: a plain object in ~/.pulse/modules or .madre/modules becomes a module with its switch, command and tools; a broken file is reported, not fatal', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'pulse-sdk-state-'));
  const projectRoot = await mkdtemp(join(tmpdir(), 'pulse-sdk-project-'));
  try {
    await mkdir(join(stateRoot, 'modules'), { recursive: true });
    await mkdir(join(projectRoot, '.madre', 'modules'), { recursive: true });
    // The shipped example, verbatim: it must load as documented.
    await writeFile(join(stateRoot, 'modules', 'hello.mjs'), await readFile(new URL('../docs/sdk/hello-module.mjs', import.meta.url), 'utf8'));
    await writeFile(join(projectRoot, '.madre', 'modules', 'lens.mjs'), `export default ({ defineModule }) => defineModule({ id: 'lens', name: 'LENS', settings: { enabled: true }, toolsForTurn: async (ctx, turn) => [{ name: 'lens', command: 'node', args: ['lens.mjs'], tools: ['peek'], brief: 'peeks at port ' + turn.port }] });`);
    await writeFile(join(projectRoot, '.madre', 'modules', 'broken.mjs'), 'export default { name: "no id" };');
    await writeFile(join(projectRoot, '.madre', 'modules', 'dupe.mjs'), 'export default { id: "ripley", name: "IMPOSTOR" };');
    await writeFile(join(projectRoot, '.madre', 'modules', 'notes.txt'), 'ignored');

    const outcome = await loadExternalModules({ stateRoot, projectRoot });
    assert.deepEqual(outcome.loaded.map((m) => [m.id, m.origin]), [['hello', 'user'], ['lens', 'project']]);
    assert.deepEqual(outcome.failures.map((f) => [f.file.split('/').pop(), f.error]), [['broken.mjs', 'Module id must be kebab-case: undefined'], ['dupe.mjs', 'the id "ripley" is already taken']]);
    assert.equal(moduleById('hello').external, true);
    assert.equal(moduleById('hello').configKey, 'hello');
    assert.equal(moduleById('ripley').name, 'RIPLEY', 'a built-in is never replaced');

    const ctxOff = { projectRoot, stateRoot, config: { modules: {} }, env: {}, agents: [{ id: 'codex', ready: true }], room: null, readConfig: async () => ({}), updateConfig: async () => {}, record: async () => {}, services: { imageKey: async () => null, ollama: { state: () => ({ running: false, models: [], embedModel: null, chatModel: null }), wire: async () => ({}), pull: async () => ({ ok: false }) } } };
    const described = await describeModules(ctxOff);
    const hello = described.find((m) => m.id === 'hello');
    assert.deepEqual([hello.external, hello.origin, hello.status.installed, hello.status.detail, hello.commands], [true, 'user', false, 'off', ['/hello [name]']]);

    const commands = moduleCommands();
    const cmd = commands.find((c) => c.name === 'hello');
    assert.equal(cmd.module.id, 'hello');
    const ctxOn = { ...ctxOff, config: { modules: { hello: { enabled: true, greeting: 'hi' } } } };
    const settings = cmd.module.settingsFrom(ctxOn.config);
    const answer = await cmd.execute({ ...ctxOn, settings }, ['ripley']);
    assert.equal(answer.ok, true);
    assert.match(answer.text, /^hi, ripley\. Project: pulse-sdk-project-[\s\S]*Agents online: @codex\.$/);

    const tools = await toolsForTurn(ctxOff, { port: 4317, mode: 1 });
    assert.deepEqual(tools.map((t) => [t.name, t.brief]), [['lens', 'peeks at port 4317']], 'LENS declared enabled: true as its default, so it hands tools with an empty config');
    assert.deepEqual(await toolsForTurn({ ...ctxOff, config: { modules: { lens: { enabled: false } } } }, { port: 4317, mode: 1 }), [], 'switched off in config.json: nothing');

    // Reload after a fix: the broken file now loads, nothing is duplicated.
    await writeFile(join(projectRoot, '.madre', 'modules', 'broken.mjs'), 'export default { id: "fixed", name: "FIXED" };');
    const again = await loadExternalModules({ stateRoot, projectRoot });
    assert.deepEqual(again.loaded.map((m) => m.id), ['hello', 'fixed', 'lens']);
    assert.equal(again.failures.length, 1);
    assert.equal(MODULES.filter((m) => m.id === 'hello').length, 1);
  } finally {
    await loadExternalModules({ stateRoot: join(stateRoot, 'none'), projectRoot: join(projectRoot, 'none') });   // leave the registry as the other tests expect it
    await rm(stateRoot, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});
