import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyKey, normalizeKey, keyPlanFor, OPENCODE_PROVIDERS } from '../src/credentials.mjs';
import { createPulseServer } from '../src/server.mjs';

const KEY = 'AIzaSyD-not-a-real-key-000000000000000';
const mode = async (path) => (await stat(path)).mode & 0o777;

test('a pasted key is checked before anything is written, and only the CLIs that read one take it', () => {
  assert.deepEqual(normalizeKey('  '), { ok: false, error: 'Paste the key first.' });
  assert.match(normalizeKey('sk-abc def').error, /spaces or line breaks/);
  assert.match(normalizeKey('short').error, /check you copied all of it/);
  assert.deepEqual(normalizeKey(`  ${KEY}\n`), { ok: true, key: KEY });
  assert.equal(keyPlanFor('gemini').writesTo, '~/.gemini/.env');
  assert.equal(keyPlanFor('claude').writesTo, '~/.claude/settings.json');
  assert.match(keyPlanFor('claude').note, /every Claude Code|Claude Code uses on this computer/, 'a key there is the whole machine\'s, and that is said');
  assert.deepEqual(keyPlanFor('opencode').providers.map((provider) => provider.id), OPENCODE_PROVIDERS.map((provider) => provider.id));
  // Codex takes an OpenAI key too (2026-10-28): handed to its own CLI, which keeps it.
  assert.deepEqual([keyPlanFor('codex').writesTo, keyPlanFor('codex').keyUrl], ['~/.codex/auth.json', 'https://platform.openai.com/api-keys']);
  assert.match(keyPlanFor('codex').note, /MADRE keeps no copy/);
});

test('Codex: the key goes to its own CLI on stdin, never in its arguments, and a refusal puts its file back', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-key-codex-'));
  const KEY_OPENAI = 'sk-proj-not-a-real-key-000000000000';
  const before = process.env.CODEX_HOME;
  delete process.env.CODEX_HOME;
  try {
    const file = join(home, '.codex', 'auth.json');
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(file, '{"tokens":"the account it had"}');
    const runs = [];
    // What `codex login --with-api-key` does: reads the key from stdin and writes its own file.
    const codex = (code) => async (executable, args, input) => { runs.push({ executable, args, input }); await writeFile(file, JSON.stringify({ OPENAI_API_KEY: input })); return { code, out: code ? 'Error: invalid key\n' : 'Successfully logged in\n' }; };
    const refused = await applyKey({ agent: 'codex', key: KEY_OPENAI, home, executable: '/x/codex', run: codex(1), probe: async () => assert.fail('asked who is signed in after a refusal') });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /did not take the key \(Error: invalid key\)[\s\S]*Nothing was changed/);
    assert.equal(await readFile(file, 'utf8'), '{"tokens":"the account it had"}', 'the account it had is back');
    assert.deepEqual(runs[0], { executable: '/x/codex', args: ['login', '--with-api-key'], input: KEY_OPENAI });
    assert.ok(!runs[0].args.some((arg) => arg.includes(KEY_OPENAI)), 'the key never shows in the process list');

    const done = await applyKey({ agent: 'codex', key: KEY_OPENAI, home, run: codex(0), probe: async () => ({ state: 'signed-in', detail: 'via API key' }) });
    assert.deepEqual(done, { ok: true, detail: 'via API key' });
    assert.equal(runs[1].executable, 'codex', 'Codex, not another agent, when no path is given');
    // Its CLI took it, but it still reads as signed out: put back too.
    await writeFile(file, '{"tokens":"again"}');
    const odd = await applyKey({ agent: 'codex', key: KEY_OPENAI, home, run: codex(0), probe: async () => ({ state: 'signed-out' }) });
    assert.equal(odd.ok, false);
    assert.equal(await readFile(file, 'utf8'), '{"tokens":"again"}');
  } finally {
    if (before === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = before;
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Claude: the key goes into the settings its own CLI reads, and everything else there survives', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-key-claude-'));
  const file = join(home, '.claude', 'settings.json');
  const KEY_ANTHROPIC = 'sk-ant-api03-not-a-real-key-0000000000';
  try {
    await mkdir(join(home, '.claude'), { recursive: true });
    await writeFile(file, JSON.stringify({ model: 'opus', env: { SOMETHING_ELSE: 'keep-me' } }, null, 2));

    // The CLI is the judge. If it still reads as signed out, the file comes back as it was.
    const refused = await applyKey({ agent: 'claude', key: KEY_ANTHROPIC, home, probe: async () => ({ state: 'signed-out', detail: 'not logged in' }) });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /still reads as signed-out[\s\S]*Nothing was changed/);
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { model: 'opus', env: { SOMETHING_ELSE: 'keep-me' } });

    const done = await applyKey({ agent: 'claude', key: KEY_ANTHROPIC, home, probe: async () => ({ state: 'signed-in', detail: 'via api_key' }) });
    assert.deepEqual(done, { ok: true, detail: 'via api_key' });
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { model: 'opus', env: { SOMETHING_ELSE: 'keep-me', ANTHROPIC_API_KEY: KEY_ANTHROPIC } }, 'the key is added; the rest of the settings are left alone');
    assert.equal(await mode(file), 0o600, 'readable only by the owner');

    // No settings file at all is the common case, and a broken one is not a reason to refuse.
    const fresh = await mkdtemp(join(tmpdir(), 'pulse-key-claude-new-'));
    try {
      const made = await applyKey({ agent: 'claude', key: KEY_ANTHROPIC, home: fresh, probe: async () => ({ state: 'signed-in', detail: 'via api_key' }) });
      assert.equal(made.ok, true);
      assert.deepEqual(JSON.parse(await readFile(join(fresh, '.claude', 'settings.json'), 'utf8')), { env: { ANTHROPIC_API_KEY: KEY_ANTHROPIC } });
    } finally {
      await rm(fresh, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    }
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('Gemini: the key lands where its CLI reads it, locked to the owner, and a refusal leaves nothing behind', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-key-gemini-'));
  try {
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', '.env'), 'OTHER=keep-me\nGEMINI_API_KEY=old\n');
    await writeFile(join(home, '.gemini', 'settings.json'), JSON.stringify({ ui: { theme: 'dark' } }));

    // The probe refuses: both files must come back exactly as they were.
    const refused = await applyKey({ agent: 'gemini', key: KEY, home, probe: async () => ({ state: 'signed-out', detail: 'never signed in' }) });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /still reads as signed-out[\s\S]*Nothing was changed/);
    assert.equal(await readFile(join(home, '.gemini', '.env'), 'utf8'), 'OTHER=keep-me\nGEMINI_API_KEY=old\n');
    assert.deepEqual(JSON.parse(await readFile(join(home, '.gemini', 'settings.json'), 'utf8')), { ui: { theme: 'dark' } });

    const done = await applyKey({ agent: 'gemini', key: KEY, home, probe: async () => ({ state: 'signed-in', detail: 'via API key' }) });
    assert.deepEqual(done, { ok: true, detail: 'via API key' });
    const env = await readFile(join(home, '.gemini', '.env'), 'utf8');
    assert.equal(env, `OTHER=keep-me\nGEMINI_API_KEY=${KEY}\n`, 'the old key is replaced, everything else kept');
    const settings = JSON.parse(await readFile(join(home, '.gemini', 'settings.json'), 'utf8'));
    assert.deepEqual(settings, { ui: { theme: 'dark' }, security: { auth: { selectedType: 'gemini-api-key' } } }, 'the CLI is told to use the key, and its other settings survive');
    assert.equal(await mode(join(home, '.gemini', '.env')), 0o600, 'readable only by the owner');
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('OpenCode: the provider entry is written and confirmed by OpenCode itself, or put back', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-key-opencode-'));
  const file = join(home, '.local', 'share', 'opencode', 'auth.json');
  try {
    await mkdir(join(home, '.local', 'share', 'opencode'), { recursive: true });
    await writeFile(file, JSON.stringify({ openai: { type: 'oauth', access: 'x' } }));

    assert.match((await applyKey({ agent: 'opencode', key: KEY, home, provider: 'nope', run: async () => '' })).error, /Pick the provider/);

    // OpenCode does not list it: MADRE guessed the shape wrong and puts the file back.
    const refused = await applyKey({ agent: 'opencode', key: KEY, home, provider: 'anthropic', run: async () => 'openai   oauth' });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /does not list anthropic[\s\S]*opencode auth login/);
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { openai: { type: 'oauth', access: 'x' } });

    const asked = [];
    const done = await applyKey({ agent: 'opencode', key: KEY, home, provider: 'anthropic', executable: '/fake/opencode', run: async (executable, args) => { asked.push([executable, ...args].join(' ')); return 'anthropic   api\nopenai   oauth'; } });
    assert.deepEqual(done, { ok: true, detail: 'anthropic (api)' });
    assert.deepEqual(asked, ['/fake/opencode auth list'], 'OpenCode is the one that confirms it');
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { openai: { type: 'oauth', access: 'x' }, anthropic: { type: 'api', key: KEY } });
    assert.equal(await mode(file), 0o600);
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the key route: this computer only, and the room records that a key was set, never the key', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-key-route-'));
  const root = await mkdtemp(join(tmpdir(), 'pulse-key-state-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-key-project-'));
  const geminiHome = process.env.GEMINI_CLI_HOME;
  try {
    process.env.GEMINI_CLI_HOME = home;   // the probe reads the same home the key is written to
    await mkdir(join(home, '.gemini'), { recursive: true });
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      credentialHome: home,
      agents: [
        { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/fake/gemini', version: '1' },
        { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: '1' },
        { id: 'cursor', label: 'Cursor', detected: true, ready: true, adapter: 'cursor-readonly', path: '/fake/cursor-agent', version: '1' },
      ],
      probe: async () => ({ gemini: { state: 'signed-in', detail: 'via API key' }, codex: { state: 'signed-out', detail: 'not logged in' }, cursor: { state: 'signed-out' } }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const send = (id, payload) => fetch(`${base}/api/agents/${id}/key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    try {
      const state = await fetch(`${base}/api/state`).then((response) => response.json());
      assert.equal(state.agents.find((agent) => agent.id === 'gemini').key.writesTo, '~/.gemini/.env', 'the bridge knows it can offer a key here');
      assert.equal(state.agents.find((agent) => agent.id === 'codex').key.writesTo, '~/.codex/auth.json', 'Codex takes an OpenAI key too');
      assert.equal(state.agents.find((agent) => agent.id === 'cursor').key, null);

      assert.equal((await send('cursor', { key: KEY })).status, 400, 'an agent that signs in with a click takes no key');
      // Codex is handed the key by its own CLI; one that is not there changes nothing.
      const noCodex = await send('codex', { key: KEY });
      assert.equal(noCodex.status, 422);
      assert.match((await noCodex.json()).error, /Codex did not take the key[\s\S]*Nothing was changed/);
      assert.equal((await send('gemini', { key: 'tiny' })).status, 422);

      const ok = await send('gemini', { key: KEY });
      assert.equal(ok.status, 200);
      assert.equal((await ok.json()).session.state, 'signed-in');
      assert.equal(await readFile(join(home, '.gemini', '.env'), 'utf8'), `GEMINI_API_KEY=${KEY}\n`);

      const events = await store.readAll();
      const recorded = events.find((event) => event.type === 'connection.key.set');
      assert.deepEqual(recorded.payload, { agent: 'gemini', label: 'Gemini', provider: null, detail: 'via API key' });
      assert.ok(!JSON.stringify(events).includes(KEY), 'the key is nowhere in the ledger');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    if (geminiHome === undefined) delete process.env.GEMINI_CLI_HOME; else process.env.GEMINI_CLI_HOME = geminiHome;
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
