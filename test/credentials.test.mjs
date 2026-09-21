import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyKey, normalizeKey, keyPlanFor, OPENCODE_PROVIDERS } from '../src/credentials.mjs';
import { createPulseServer } from '../src/server.mjs';

const KEY = 'AIzaSyD-not-a-real-key-000000000000000';
const mode = async (path) => (await stat(path)).mode & 0o777;

test('a pasted key is checked before anything is written, and only two agents take one', () => {
  assert.deepEqual(normalizeKey('  '), { ok: false, error: 'Paste the key first.' });
  assert.match(normalizeKey('sk-abc def').error, /spaces or line breaks/);
  assert.match(normalizeKey('short').error, /check you copied all of it/);
  assert.deepEqual(normalizeKey(`  ${KEY}\n`), { ok: true, key: KEY });
  assert.equal(keyPlanFor('gemini').writesTo, '~/.gemini/.env');
  assert.deepEqual(keyPlanFor('opencode').providers.map((provider) => provider.id), OPENCODE_PROVIDERS.map((provider) => provider.id));
  assert.equal(keyPlanFor('codex'), null, 'Codex signs in with a click');
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
    await rm(home, { recursive: true, force: true });
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
    await rm(home, { recursive: true, force: true });
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
      ],
      probe: async () => ({ gemini: { state: 'signed-in', detail: 'via API key' }, codex: { state: 'signed-out', detail: 'not logged in' } }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const send = (id, payload) => fetch(`${base}/api/agents/${id}/key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    try {
      const state = await fetch(`${base}/api/state`).then((response) => response.json());
      assert.equal(state.agents.find((agent) => agent.id === 'gemini').key.writesTo, '~/.gemini/.env', 'the bridge knows it can offer a key here');
      assert.equal(state.agents.find((agent) => agent.id === 'codex').key, null);

      assert.equal((await send('codex', { key: KEY })).status, 400, 'an agent that signs in with a click takes no key');
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
    await rm(home, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});
