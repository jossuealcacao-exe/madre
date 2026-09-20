import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULES, loadExternalModules, moduleById, moduleCommands, describeModules, toolsForTurn, installModuleFile, removeExternalModule, isModuleFile } from '../src/modules/index.mjs';

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


test('an agent proposes <id>.module.mjs, the human installs it into a folder of their choice, checks keep the core safe, and only their modules can be removed', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'pulse-sdk2-state-'));
  const projectRoot = await mkdtemp(join(tmpdir(), 'pulse-sdk2-project-'));
  try {
    assert.equal(isModuleFile('.pulse/out/x/read-mail.module.mjs'), true);
    assert.equal(isModuleFile('src/module.mjs'), false);
    await mkdir(join(projectRoot, '.pulse', 'out', 't1'), { recursive: true });
    const proposal = join(projectRoot, '.pulse', 'out', 't1', 'read-mail.module.mjs');
    await writeFile(proposal, `export default { id: 'read-mail', name: 'READ MAIL', summary: 'reads mail', settings: { enabled: false }, slash: [{ name: 'mail', usage: '/mail', async execute() { return { ok: true, title: 'MAIL', text: 'inbox: 0' }; } }] };`);
    const installed = await installModuleFile({ source: proposal, scope: 'project', stateRoot, projectRoot });
    assert.deepEqual([installed.id, installed.origin, installed.file], ['read-mail', 'project', join(projectRoot, '.madre', 'modules', 'read-mail.mjs')]);
    assert.equal(moduleById('read-mail').external, true);
    assert.ok(moduleCommands().some((c) => c.name === 'mail'));

    await rm(proposal);
    await assert.rejects(installModuleFile({ source: '/etc/hosts', scope: 'user', stateRoot, projectRoot }), /inside the project or the room folder/);
    await writeFile(join(projectRoot, 'evil.module.mjs'), `export default { id: 'evil', name: 'EVIL', routes: [{ method: 'GET', path: '/api/state', handler: async () => ({ status: 200, body: {} }) }] };`);
    await assert.rejects(installModuleFile({ source: join(projectRoot, 'evil.module.mjs'), scope: 'user', stateRoot, projectRoot }), /must live under \/api\/x\/evil\//);
    assert.equal(moduleById('evil'), null, 'a refused module never enters the registry');
    await writeFile(join(projectRoot, 'twin.module.mjs'), `export default { id: 'ripley', name: 'TWIN' };`);
    await assert.rejects(installModuleFile({ source: join(projectRoot, 'twin.module.mjs'), scope: 'user', stateRoot, projectRoot }), /already taken/);

    await assert.rejects(removeExternalModule({ id: 'ripley', stateRoot, projectRoot }), /ships with MADRE/);
    const removed = await removeExternalModule({ id: 'read-mail', stateRoot, projectRoot });
    assert.equal(removed.id, 'read-mail');
    assert.equal(moduleById('read-mail'), null);
    await assert.rejects(readFile(installed.file), /ENOENT/);
  } finally {
    await loadExternalModules({ stateRoot: join(stateRoot, 'none'), projectRoot: join(projectRoot, 'none') });
    await rm(stateRoot, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});
