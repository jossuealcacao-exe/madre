import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeSecret } from '../src/vault.mjs';
import { MODULE_FIELDS } from '../src/modules/sdk.mjs';
import { MODULES, sdkPaths, loadExternalModules, moduleById, moduleCommands, describeModules, toolsForTurn, installModuleFile, removeExternalModule, isModuleFile } from '../src/modules/index.mjs';

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
    await rm(stateRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(projectRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
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
    await writeFile(proposal, `export default { id: 'read-mail', name: 'READ MAIL', summary: 'reads mail', sumary: 'this typo must be reported', settings: { enabled: false }, slash: [{ name: 'mail', usage: '/mail', async execute() { return { ok: true, title: 'MAIL', text: 'inbox: 0' }; } }] };`);
    const installed = await installModuleFile({ source: proposal, scope: 'project', stateRoot, projectRoot });
    assert.deepEqual([installed.id, installed.origin, installed.file], ['read-mail', 'project', join(projectRoot, '.madre', 'modules', 'read-mail.mjs')]);
    assert.deepEqual(installed.unknown, ['sumary'], 'the proposal route must carry the typo back to the UI that installed it');
    const sourceRecord = installed.file.replace(/\.mjs$/, '.source.json');
    assert.match(await readFile(sourceRecord, 'utf8'), /read-mail\.module\.mjs/, 'the update origin was not remembered');
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
    assert.deepEqual(new Set(removed.removedFiles), new Set([installed.file, sourceRecord]));
    assert.equal(moduleById('read-mail'), null);
    await assert.rejects(readFile(installed.file), /ENOENT/);
    await assert.rejects(readFile(sourceRecord), /ENOENT/);
  } finally {
    await loadExternalModules({ stateRoot: join(stateRoot, 'none'), projectRoot: join(projectRoot, 'none') });
    await rm(stateRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(projectRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the SDK says what it did not understand, and the import that never works explains itself', async () => {
  const { verifyModuleText } = await import('../src/modules/index.mjs');
  const { defineModule, unknownFields, MODULE_FIELDS } = await import('../src/modules/sdk.mjs');

  // Thirty-two optional fields is generous until you misspell one. `sumary` used to install
  // without a word and leave a card with an empty summary — the likeliest mistake anyone makes,
  // an agent included, and the only one the contract answered with silence.
  assert.deepEqual(defineModule({ id: 'a', name: 'A', summary: 'ok' }).unknown, []);
  assert.deepEqual(defineModule({ id: 'b', name: 'B', sumary: 'x', comand: 'y' }).unknown, ['sumary', 'comand']);
  assert.deepEqual(defineModule({ id: 'c', name: 'C', install: { display: 'ignored before this fix' } }).unknown, ['install']);
  assert.equal(MODULE_FIELDS.size, 36);
  assert.ok(MODULE_FIELDS.has('summary') && MODULE_FIELDS.has('toolsForTurn'));
  // A connector says where it reaches, or its traffic shows up in the log as an address nothing
  // declares — true, and useless to a human trying to tell a module from a leak.
  assert.ok(MODULE_FIELDS.has('reaches'));
  // And which secrets it needs, so the card can ask for them without the module writing a form.
  assert.ok(MODULE_FIELDS.has('secrets'));
  assert.equal(MODULE_FIELDS.has('install'), false, 'a field the SDK ignores must not be advertised as understood');
  // Said, never refused: a module written for a newer MADRE may carry fields this one lacks.
  const carried = await verifyModuleText({ text: "export default { id: 'futuro', name: 'FUTURO', vibes: true };", name: 'c.mjs' });
  assert.deepEqual(carried.unknown, ['vibes']);
  assert.equal(carried.id, 'futuro', 'a field from the future should not stop a module from loading');
  assert.deepEqual(unknownFields({ id: 'x', name: 'X' }), []);

  // The one mistake that looks right and never works: MADRE's own modules import the SDK by
  // relative path because they live inside the package. An agent reads ripley.mjs and copies it.
  // The file is checked alone in a scratch folder, so nothing resolves — and node's own message
  // says only that a file is missing, which sends the author looking for the wrong thing.
  for (const line of ["import { defineModule } from './sdk.mjs';", "import { defineModule } from '@jossuealcala/madre/sdk';"]) {
    const failed = await verifyModuleText({ text: `${line}\nexport default defineModule({ id: 'z', name: 'Z' });`, name: 'c.mjs' }).then(() => null, (error) => error);
    assert.ok(failed, `${line} resolved, which it cannot do from a scratch folder`);
    assert.match(failed.message, /a module imports nothing/);
    assert.match(failed.message, /\(\{ defineModule \}\) => defineModule/, 'the message names the failure but not the way out');
  }

  // And the three shapes the documentation teaches all load.
  for (const [shape, text] of [
    ['plain object', "export default { id: 'plano', name: 'PLANO' };"],
    ['function form', "export default ({ defineModule }) => defineModule({ id: 'funcion', name: 'FUNCIÓN' });"],
  ]) {
    const ok = await verifyModuleText({ text, name: 'c.mjs' });
    assert.ok(ok.id, `${shape} no longer loads`);
  }
});

test('connectors: a sending tool only reaches a turn in #4, and a module cannot widen that by saying nothing', async () => {
  const { toolsForTurn, MODULES } = await import('../src/modules/index.mjs');
  const mail = {
    id: 'correo-prueba', name: 'CORREO', summary: 'x', external: true,
    toolsForTurn: async () => [{ name: 'correo', command: 'node', args: [], tools: ['read_inbox', 'send_email'], sends: ['send_email'], brief: 'Tu correo.' }],
  };
  const onlySends = {
    id: 'solo-manda', name: 'SOLO', summary: 'x', external: true,
    toolsForTurn: async () => [{ name: 'solo', command: 'node', args: [], tools: ['send_email'], sends: ['send_email'] }],
  };
  MODULES.push(mail, onlySends);
  try {
    // Reading is reading at every rung. Sending is not: what goes out carries the human's name
    // and does not come back, which is what #4 already means.
    for (const mode of [1, 2, 3]) {
      const servers = await toolsForTurn({}, { mode });
      const correo = servers.find((one) => one.name === 'correo');
      assert.deepEqual(correo.tools, ['read_inbox'], `sending reached a #${mode} turn`);
      assert.match(correo.brief, /AIRLOCK/, 'the agent was not told why the tool is short');
      // A server with nothing left to read does not travel at all: the model is never told about
      // a tool it may not use.
      assert.equal(servers.some((one) => one.name === 'solo'), false, `a send-only server reached a #${mode} turn`);
    }
    const open = await toolsForTurn({}, { mode: 4 });
    assert.deepEqual(open.find((one) => one.name === 'correo').tools, ['read_inbox', 'send_email']);
    assert.ok(open.some((one) => one.name === 'solo'));
  } finally {
    for (const one of [mail, onlySends]) MODULES.splice(MODULES.indexOf(one), 1);
  }
});

test('vault: a connector secret is held 0600, never shown, and never accepted over the network', async () => {
  const { forgetSecret, readSecret, summary, vaultDir, writeSecret } = await import('../src/vault.mjs');
  const root = await mkdtemp(join(tmpdir(), 'pulse-vault-'));
  try {
    assert.equal((await writeSecret(root, 'correo', 'app_password', 'abcd efgh')).ok, false, 'a secret with spaces was kept');
    assert.equal((await writeSecret(root, '../fuera', 'x', 'y')).ok, false, 'a module id that is a path was kept');
    assert.equal((await writeSecret(root, 'correo', '../../etc/passwd', 'y')).ok, false, 'a secret name that is a path was kept');

    assert.equal((await writeSecret(root, 'correo', 'app_password', 'abcdefghijklmnop')).ok, true);
    assert.equal(await readSecret(root, 'correo', 'app_password'), 'abcdefghijklmnop');

    // Readable by its owner and by nobody else on this machine.
    const { stat } = await import('node:fs/promises');
    assert.equal((await stat(vaultDir(root))).mode & 0o777, 0o700);
    assert.equal((await stat(join(vaultDir(root), 'correo.json'))).mode & 0o777, 0o600);

    // What the rest of MADRE is allowed to know: that it is there, its name, its length. The
    // value leaves this file for the module that owns it and for nothing else — a card, a ledger
    // entry or a prompt that could print it would undo the whole point of holding it.
    const held = await summary(root);
    assert.deepEqual(held, [{ module: 'correo', name: 'app_password', bytes: 16 }]);
    assert.equal(JSON.stringify(held).includes('abcdefghijklmnop'), false, 'the summary carried the secret');

    assert.equal((await forgetSecret(root, 'correo', 'app_password')).forgot, 'app_password');
    assert.deepEqual(await summary(root), []);
    assert.equal(await readSecret(root, 'correo', 'app_password'), null);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// The connector example is the only worked answer a user gets for the shape that is not
// guessable: one file that is the module when imported and the MCP server when executed. An
// example that rots is worse than none — the agent reads it and copies the rot — so it goes
// through the real door here, and it answers over real stdio.
test('the connector example installs as documented, waits for #4, and is its own MCP server', async () => {
  // The state root is reached through a symlink of the test's own making. macOS gives one for
  // free (/var is /private/var) and Linux does not, and the check below needs one to mean anything.
  const realState = await mkdtemp(join(tmpdir(), 'pulse-sdk-state-'));
  const linkHome = await mkdtemp(join(tmpdir(), 'pulse-sdk-link-'));
  const stateRoot = join(linkHome, 'state');
  await symlink(realState, stateRoot, 'dir');
  const projectRoot = await mkdtemp(join(tmpdir(), 'pulse-sdk-project-'));
  try {
    await mkdir(join(projectRoot, 'out'), { recursive: true });
    const source = join(projectRoot, 'out', 'telegram.module.mjs');
    await writeFile(source, await readFile(new URL('../docs/sdk/connector-module.mjs', import.meta.url), 'utf8'));
    assert.equal(isModuleFile(source), true, 'the example is not named the way the room recognises');

    // The same door a human uses: it is checked in a scratch folder with no node_modules, which
    // is what forbids an npm import and what catches an example that drifted.
    const installed = await installModuleFile({ source, scope: 'user', stateRoot, projectRoot });
    assert.equal(installed.id, 'telegram');
    assert.deepEqual(installed.unknown, [], 'the example declares a field this SDK does not answer to');
    await loadExternalModules({ stateRoot, projectRoot });

    const module = moduleById('telegram');
    assert.equal(module.external, true);
    // It declared its destination, in the four answers, and the log can name who vouched for it.
    assert.equal(module.reaches[0].host, 'api.telegram.org');
    for (const answer of ['to', 'what', 'when', 'where']) assert.ok(module.reaches[0][answer], `the example skips ${answer}`);
    // And its secret, so MADRE draws the field without the example writing any interface.
    assert.deepEqual(module.secrets.map((one) => one.name), ['bot-token']);

    const ctx = { projectRoot, stateRoot, env: {}, config: { modules: { telegram: { enabled: true, chatId: '99' } } } };
    assert.deepEqual(await toolsForTurn(ctx, { agent: 'codex', mode: 4 }), [], 'a tool was offered with no token kept');

    await writeSecret(stateRoot, 'telegram', 'bot-token', '123:FAKE');
    // Sending waits for #4, and below it the tool is not even named.
    for (const mode of [1, 2, 3]) {
      const below = await toolsForTurn(ctx, { agent: 'codex', mode });
      assert.equal(below.find((one) => one.name === 'telegram'), undefined, `the example's sending tool travelled at #${mode}`);
      assert.ok(!JSON.stringify(below).includes('send_telegram'), `send_telegram was named at #${mode}`);
    }
    const [server] = await toolsForTurn(ctx, { agent: 'codex', mode: 4 });
    assert.deepEqual(server.sends, ['send_telegram']);
    assert.equal(server.env.TELEGRAM_TOKEN, '123:FAKE', 'the token did not reach the process it is for');
    assert.ok(!server.brief.includes('123:FAKE'), 'the token reached the brief the model reads');

    // The half that cannot be checked by importing it: run the installed copy as a process and
    // speak JSON-RPC at it. It is spawned through the UNRESOLVED spelling of its path on purpose
    // — the one a person types while trying their own connector — because that is where the
    // obvious self-detection breaks. `process.argv[1] === SELF` holds when MADRE spawns it (SELF
    // is already resolved by the loader) and is false the moment a path crosses a symlink, as
    // the state root does here. Written that way, this answers nothing and exits a success.
    const byHand = join(stateRoot, 'modules', 'telegram.mjs');
    assert.notEqual(byHand, server.args[0], 'the state path does not cross a symlink, so this guards nothing here');
    const asked = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'send_telegram', arguments: { text: '   ' } } },
    ];
    const child = spawn(process.execPath, [byHand], { stdio: ['pipe', 'pipe', 'ignore'] });
    child.stdin.end(`${asked.map((one) => JSON.stringify(one)).join('\n')}\n`);
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const answers = out.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(answers.length, 3, `the example answered ${answers.length} of 3: as a server it is deaf`);
    assert.equal(answers[0].result.serverInfo.name, 'telegram');
    assert.deepEqual(answers[1].result.tools.map((one) => one.name), ['send_telegram']);
    // An empty message is refused before anything leaves, and it comes back as an error RESULT —
    // never as a sentence that reads like success.
    assert.equal(answers[2].result.isError, true);
    assert.match(answers[2].result.content[0].text, /^Nothing was sent/);

    await removeExternalModule({ id: 'telegram', stateRoot, projectRoot });
  } finally {
    await rm(linkHome, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(realState, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(projectRoot, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

// The SDK is a contract, and a contract whose documentation drifts is a contract nobody can keep.
// MADRE tells a module author which fields it did not understand, so the list of fields IS the
// public surface: every one of them has to be written down where somebody can read it before
// installing, and nothing may be written down that the code does not answer to.
test('the SDK contract and its guide say the same thing, in both directions', async () => {
  const guide = await readFile(new URL('../docs/SDK.md', import.meta.url), 'utf8');
  const undocumented = [...MODULE_FIELDS].filter((field) => !new RegExp(`\`${field}[\`(,]`).test(guide));
  assert.deepEqual(undocumented, [], 'the SDK answers to fields the guide never mentions');

  // And the other way: a field the guide promises but the code drops would be worse, because
  // somebody would write it, install cleanly and watch it do nothing.
  const promised = [...guide.matchAll(/^\| `([a-zA-Z]+)[`(,]/gm)].map((match) => match[1]);
  assert.ok(promised.length > 20, 'the field table stopped being readable by this check');
  for (const field of new Set(promised)) {
    assert.ok(MODULE_FIELDS.has(field), `the guide documents \`${field}\`, which the SDK would report as a field it did not understand`);
  }

  // The number is quoted in the guide, so it has to be the real one.
  assert.match(guide, new RegExp(`\\*\\*el contrato completo\\*\\*: ${MODULE_FIELDS.size} campos`), `the guide quotes a field count that is not ${MODULE_FIELDS.size}`);

  // Both examples are what the prompt points an agent at; neither may quietly disappear.
  for (const [key, file] of Object.entries(sdkPaths())) {
    assert.ok(await readFile(file, 'utf8').catch(() => null), `sdkPaths().${key} points at a file that is not there`);
  }
});
