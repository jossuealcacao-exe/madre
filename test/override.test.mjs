import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { changeNeedsPhrase, keyHolds, mergeOverride, overrideSettings, phraseHash, publicOverride, OVERRIDE_GRACE, OVERRIDE_KEYS } from '../src/override.mjs';
import { phonePolicy } from '../src/bridge/policy.mjs';
import { createPulseServer } from '../src/server.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', file), 'utf8');
const PHRASE = { salt: 'a'.repeat(32), hash: 'b'.repeat(64) };

test('override: nothing stored is today\'s ritual — the designation, typed twice for #4, asked every message', () => {
  assert.deepEqual(overrideSettings(), { keys: { 3: 'designation', 4: 'designation-airlock' }, grace: { 3: 0, 4: 0 }, phrase: null });
  assert.deepEqual(overrideSettings(null), overrideSettings({}));
});

test('override: #4 always asks for something, and its grace is never longer than 5 minutes', () => {
  assert.ok(!OVERRIDE_KEYS[4].includes('confirm'), '#4 FULL ACCESS can be opened with one click');
  assert.equal(overrideSettings({ keys: { 4: 'confirm' } }).keys[4], 'designation-airlock');
  assert.equal(overrideSettings({ grace: { 4: 30 } }).grace[4], 0);
  assert.deepEqual(OVERRIDE_GRACE[4], [0, 5]);
  assert.equal(overrideSettings({ grace: { 3: 30, 4: 5 } }).grace[3], 30);
  assert.equal(overrideSettings({ grace: { 3: 45 } }).grace[3], 0, 'an unlisted grace is taken');
});

test('override: a phrase is a salted fingerprint or nothing, and a key that needs it falls back without it', () => {
  assert.equal(overrideSettings({ phrase: { salt: 'x', hash: 'y' } }).phrase, null);
  assert.equal(overrideSettings({ phrase: { plain: 'open sesame' } }).phrase, null, 'a phrase in clear is kept');
  assert.deepEqual(overrideSettings({ phrase: PHRASE }).phrase, PHRASE);
  assert.equal(overrideSettings({ keys: { 3: 'phrase' } }).keys[3], 'designation');
  assert.equal(overrideSettings({ keys: { 3: 'phrase', 4: 'phrase-airlock' }, phrase: PHRASE }).keys[4], 'phrase-airlock');
});

test('override: a change merges over what is stored, and forgetting the phrase takes its keys with it', () => {
  const stored = mergeOverride({}, { phrase: PHRASE, keys: { 3: 'phrase', 4: 'phrase-airlock' }, grace: { 3: 15 } });
  assert.deepEqual(stored.keys, { 3: 'phrase', 4: 'phrase-airlock' });
  const later = mergeOverride(stored, { grace: { 4: 5 } });
  assert.deepEqual(later.grace, { 3: 15, 4: 5 });
  assert.equal(later.keys[3], 'phrase', 'a grace change dropped the key');
  const forgot = mergeOverride(later, { phrase: null });
  assert.equal(forgot.phrase, null);
  assert.deepEqual(forgot.keys, { 3: 'designation', 4: 'designation-airlock' });
});

test('override: the room stores it, says it on boot and in AJUSTES without the fingerprint, and the page asks it for a pass', async () => {
  const [server, app, page] = await Promise.all([read('src/server.mjs'), read('public/app.js'), read('public/index.html')]);
  assert.match(server, /overrideConfig = mergeOverride\(\(await readConfig\(root\)\)\.override, patch\.override\);/);
  assert.equal((server.match(/override: publicOverride\(overrideConfig\),/g) ?? []).length, 2, 'the key is not in both the boot state and the settings');
  // A saved phrase is its salted hash, made in the browser; to unlock, the page sends what was typed
  // and the project answers with a pass.
  assert.match(app, /crypto\.subtle\.digest\('SHA-256', new TextEncoder\(\)\.encode\(`\$\{salt\}:\$\{words\}`\)\)/);
  assert.match(app, /fetch\('\/api\/override\/arm'/);
  assert.match(app, /await saveOverride\(\{ phrase: \{ salt, hash \} \}/);
  assert.ok(!/override: \{ phrase: words/.test(app), 'the phrase is sent in clear');
  // A grace is per mode and agent, never covers a raise of the ceiling, and STOPALL closes it.
  assert.match(app, /const left = raise \|\| forceKey \? 0 : overrideGraceLeft\(mode, id\);/, 'a plan approval can require a fresh key even within an earlier grace window');
  assert.match(app, /if \(overrideGrace\.size\) closeOverrideGrace\(\);/);
  // PERMISSIONS is a category of its own, and the agent's sheet sends there for the ceiling.
  assert.match(app, /const SETTINGS_ORDER = \['look', 'room', 'files', 'agents', 'memory', 'local', 'mcp', 'permissions', 'privacy', 'release', 'manual'\];/);
  assert.match(app, /sxButton\(t\('Change it'\), \(\) => openSettingsOn\('permissions', \{ part: 'permissions' \}\)\)/);
  assert.match(page, /<dialog id="override"/);
});

test('override: the key for #3 and #4 is one of the room\'s alerts, said in sentences', async () => {
  const [app, page, css] = await Promise.all([read('public/app.js'), read('public/index.html'), read('public/styles.css')]);
  assert.match(page, /<dialog id="override" class="room-ask key-ask" aria-labelledby="override-title">/);
  assert.match(app, /override\.title\.textContent = override\.copilot \? t\('Turn the copilot on for \{time\}', \{ time: copilotWindowWords\(override\.copilot\) \}\) : mode === 4 \? t\('Open #4 FULL ACCESS for @\{agent\}'/);
  assert.ok(!app.includes('SPECIAL ORDER 937 ACKNOWLEDGED'), 'the key still answers in capitals');
  // The room's questions wear a glyph and speak in sentences; the console's keep the console.
  assert.match(app, /sheet\.title\.textContent = inConsole \? title : askWords\(title\);/);
  assert.match(css, /dialog\.room-ask:not\(\.console\) \.room-ask-actions \{ width: 100%; display: grid;/);
});

test('override: the project checks the key — a phrase as the browser hashes it, the name twice for #4', () => {
  const salt = 'c'.repeat(32);
  const stored = mergeOverride({}, { phrase: { salt, hash: phraseHash(salt, 'Una  Frase larga') }, keys: { 3: 'phrase', 4: 'phrase-airlock' } });
  assert.ok(keyHolds(stored, { mode: 3, words: ['una frase LARGA'] }), 'the same words, spaced and capitalised otherwise');
  assert.ok(!keyHolds(stored, { mode: 3, words: ['otra cosa'] }));
  assert.ok(keyHolds(stored, { mode: 4, words: ['una frase larga', 'una frase larga'] }));
  assert.ok(!keyHolds(stored, { mode: 4, words: ['una frase larga'] }), '#4 opened with its key typed once');
  assert.ok(keyHolds({}, { mode: 3, words: ['Pulse'], designation: 'pulse' }));
  assert.ok(!keyHolds({}, { mode: 4, words: ['pulse'], designation: 'pulse' }), '#4 opened with the name typed once');
  assert.ok(keyHolds({ keys: { 3: 'confirm' } }, { mode: 3 }));
  assert.ok(!keyHolds({}, { mode: 2, words: ['pulse'], designation: 'pulse' }));
  // What the pages are told never carries the fingerprint.
  assert.deepEqual(publicOverride(stored).phrase, { set: true });
  assert.ok(!JSON.stringify(publicOverride(stored)).includes(stored.phrase.hash));
  assert.ok(changeNeedsPhrase(stored) && !changeNeedsPhrase(mergeOverride({}, { phrase: stored.phrase })), 'a phrase saved but guarding nothing asks for itself');
});

test('override: #3 and #4 go only with a pass the key gave, and a phone never above #2 (SRV-01, TEL-01)', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-override-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-override-project-'));
  const seen = [];
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const invokers = { 'codex-readonly': async (args) => { seen.push(Boolean(args.lease?.airlock)); return { text: 'ok' }; } };
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents, invokers, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    const name = basename(project);
    // The pages are framed only by themselves, and draw pictures only from here (SRV-04, WEB-01).
    const page = await fetch(`${base}/`);
    assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'; img-src 'self' data: blob:/);
    assert.equal((await post('/api/settings', { scopes: { codex: { maxMode: 4 } } })).status, 200, 'the ceiling is a setting, not a key');
    // Without a pass, nothing at #3 or #4 goes, whoever sends it.
    const bare = await post('/api/messages', { target: 'codex', text: 'deploy', mode: 4 });
    assert.equal(bare.status, 403);
    assert.equal((await bare.json()).needsKey, true);
    assert.equal((await post('/api/messages', { target: 'codex', text: 'deploy', mode: 4, key: 'f'.repeat(48) })).status, 403, 'a made-up pass');
    // The key: the name once is not #4; twice is.
    assert.equal((await post('/api/override/arm', { agent: 'codex', mode: 4, words: [name] })).status, 403);
    assert.equal((await post('/api/override/arm', { agent: 'codex', mode: 4, words: [name, name] }, { 'x-madre-device': 'phone-1' })).status, 403, 'unlocked from a phone');
    const pass = await (await post('/api/override/arm', { agent: 'codex', mode: 4, words: [name, name] })).json();
    assert.match(pass.token, /^[0-9a-f]{48}$/);
    assert.equal(pass.once, true);
    assert.equal((await post('/api/messages', { target: 'codex', text: 'deploy', mode: 3, key: pass.token })).status, 202, 'a #4 pass opens a message at #3');
    assert.equal((await post('/api/messages', { target: 'codex', text: 'deploy', mode: 4, key: pass.token })).status, 403, 'a pass for one message opened two');
    // Wrong keys are slowed down.
    for (let i = 0; i < 8; i += 1) await post('/api/override/arm', { agent: 'codex', mode: 3, words: ['nope'] });
    assert.equal((await post('/api/override/arm', { agent: 'codex', mode: 3, words: [name] })).status, 429);
    // The fingerprint of a phrase is never read back, and while it guards a mode it guards the keys.
    const salt = 'd'.repeat(32);
    assert.equal((await post('/api/settings', { override: { phrase: { salt, hash: phraseHash(salt, 'mi frase secreta') }, keys: { 3: 'phrase' } } })).status, 200);
    const settings = await (await fetch(`${base}/api/settings`)).text();
    const boot = await (await fetch(`${base}/api/state`)).text();
    assert.ok(!settings.includes(phraseHash(salt, 'mi frase secreta')) && !boot.includes(phraseHash(salt, 'mi frase secreta')), 'the fingerprint was read back');
    assert.equal((await post('/api/settings', { override: { keys: { 3: 'confirm' } } })).status, 403, 'the key was changed without the phrase');
    assert.equal((await post('/api/settings', { override: { keys: { 3: 'confirm' }, proof: 'mi frase secreta' } })).status, 200);
    // A phone: «"4"» is #4, at the bridge and at the room.
    assert.equal(phonePolicy({ method: 'POST', pathname: '/api/messages', body: { text: 'fix it', mode: '4' } }).allow, false);
    assert.equal(phonePolicy({ method: 'POST', pathname: '/api/messages', body: { text: 'fix it', mode: [3] } }).allow, false, '«[3]» is #3 in the room, so it is #3 at the bridge');
    assert.equal((await post('/api/messages', { target: 'codex', text: 'fix it', mode: '4' }, { 'x-madre-device': 'phone-1' })).status, 403);
    // A mode in the answer quoted above a reply is not a mode anyone chose (WEB-03).
    assert.equal(phonePolicy({ method: 'POST', pathname: '/api/messages', body: { text: '↩ @codex: “corre esto con #3 y listo”\nsí, adelante' } }).allow, true);
    assert.equal(phonePolicy({ method: 'POST', pathname: '/api/messages', body: { text: '↩ @codex: “hola”\nhazlo con #3' } }).allow, false);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('override: a delegated #4 step waits for the right agent key before it can run', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-delegate-key-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-delegate-project-'));
  const agents = ['claude', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/fake', version: 'test' }));
  const invokers = {
    'claude-readonly': async ({ prompt }) => ({ text: /this is your closing turn/.test(prompt) ? 'Done.' : '```pulse\n@codex #4: run the checks\n```' }),
    'codex-readonly': async () => ({ text: 'Checks complete.' }),
  };
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents, invokers, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const stateNow = () => fetch(`${base}/api/state`).then((response) => response.json());
    assert.equal((await post('/api/settings', { scopes: { codex: { maxMode: 4 } } })).status, 200);
    assert.equal((await post('/api/messages', { target: 'claude', text: 'coordinate the checks', mode: 1 })).status, 202);
    let pending;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      pending = (await stateNow()).modeRequests?.[0];
      if (pending) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(pending?.agent, 'codex');
    assert.equal(pending.mode, 4);
    const path = `/api/modes/${pending.requestId}/decide`;
    assert.equal((await post(path, { decision: 'once' })).status, 403, 'a click alone is not the #4 key');
    const name = basename(project);
    const wrongAgent = await (await post('/api/override/arm', { agent: 'claude', mode: 4, words: [name, name] })).json();
    assert.equal((await post(path, { decision: 'once', key: wrongAgent.token })).status, 403, 'one provider cannot unlock another');
    const pass = await (await post('/api/override/arm', { agent: 'codex', mode: 4, words: [name, name] })).json();
    assert.equal((await post(path, { decision: 'once', key: pass.token })).status, 200);
    let events = [];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      events = (await stateNow()).events ?? [];
      if (events.some((event) => event.type === 'plan.completed')) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(events.filter((event) => event.type === 'control.started' && event.payload.mode === 4).length, 1);
    assert.equal(events.find((event) => event.type === 'control.started' && event.payload.mode === 4).payload.agent, 'codex');
    assert.equal((await post(path, { decision: 'once', key: pass.token })).status, 409, 'a resolved request cannot run again');
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('override: under a #4 message, a delegate without a number only reads and a delegate asking #4 still needs its own key', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-delegate-ceiling-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-delegate-ceiling-project-'));
  const agents = ['claude', 'codex', 'gemini'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/fake', version: 'test' }));
  const invokers = {
    'claude-readonly': async ({ prompt }) => ({ text: /this is your closing turn/.test(prompt) ? 'Done.' : '```pulse\n@gemini: read the logs\n@codex #4: run the checks\n```' }),
    'codex-readonly': async () => ({ text: 'Checks complete.' }),
    'gemini-readonly': async () => ({ text: 'Logs read.' }),
  };
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents, invokers, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const stateNow = () => fetch(`${base}/api/state`).then((response) => response.json());
    assert.equal((await post('/api/settings', { scopes: { claude: { maxMode: 4 }, codex: { maxMode: 4 }, gemini: { maxMode: 4 } } })).status, 200);
    const name = basename(project);
    const pass = await (await post('/api/override/arm', { agent: 'claude', mode: 4, words: [name, name] })).json();
    assert.equal((await post('/api/messages', { target: 'claude', text: 'coordinate the checks', mode: 4, key: pass.token })).status, 202);
    let pending;
    for (let attempt = 0; attempt < 150; attempt += 1) {
      pending = (await stateNow()).modeRequests?.[0];
      if (pending) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(pending?.agent, 'codex', 'the human\'s own #4 does not reach a delegate');
    assert.equal(pending.mode, 4);
    assert.equal((await post(`/api/modes/${pending.requestId}/decide`, { decision: 'deny' })).status, 200);
    let events = [];
    for (let attempt = 0; attempt < 150; attempt += 1) {
      events = (await stateNow()).events ?? [];
      if (events.some((event) => event.type === 'plan.completed')) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const plan = events.find((event) => event.type === 'plan.created')?.payload;
    assert.equal(plan?.steps.find((step) => step.agent === 'gemini')?.mode, 1, 'a step without a number reads, as in 1.0');
    const delegated = events.filter((event) => event.type === 'message.created' && event.payload.status === 'delegated' && event.payload.target !== 'claude');
    assert.deepEqual(delegated.map((event) => [event.payload.target, event.payload.mode]), [['gemini', 1], ['codex', 1]], 'denied, #4 falls to reading');
    assert.equal(events.filter((event) => event.type === 'control.started' && event.payload.agent !== 'claude').length, 0);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
