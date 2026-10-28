import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localAiConfig, localAiFor, localAiPatch } from '../src/local-ai.mjs';
import { createPulseServer } from '../src/server.mjs';

test('local AI per project: auto by default, pick starts off, manual starts on, the master switch wins', () => {
  // Nothing written is what MADRE did before: every project uses it, and its switch does not move.
  assert.deepEqual(localAiFor({}, 'a'), { mode: 'auto', master: true, chosen: true, on: true, editable: false });
  const pick = { localAi: { mode: 'pick', rooms: { a: true } } };
  assert.equal(localAiFor(pick, 'a').on, true);
  assert.equal(localAiFor(pick, 'b').on, false, 'a project nobody picked starts without it');
  const manual = { localAi: { mode: 'manual', rooms: { a: false } } };
  assert.equal(localAiFor(manual, 'a').on, false);
  assert.equal(localAiFor(manual, 'b').on, true, 'a project that never decided starts with it');
  assert.equal(localAiFor(manual, 'b').editable, true);
  // Off in Modules is off everywhere, whatever a project chose.
  const off = { modules: { ollama: { enabled: false } }, localAi: { mode: 'manual', rooms: { a: true } } };
  assert.deepEqual([localAiFor(off, 'a').chosen, localAiFor(off, 'a').on], [true, false]);
  // Home's own room, the Coordinator's, is not a project: it follows the master switch only.
  assert.equal(localAiFor(pick, 'salas', { home: true }).on, true);
  assert.equal(localAiFor(off, 'salas', { home: true }).on, false);
  // Junk in the file is read as nothing.
  assert.deepEqual(localAiConfig({ localAi: { mode: 'sometimes', rooms: { a: 'yes', b: false } } }), { mode: 'auto', rooms: { b: false }, model: null });
  assert.equal(localAiConfig({ localAi: { model: 'rm -rf /' } }).model, null);
});

test('local AI per project: a patch keeps the projects it does not name and can forget one', () => {
  const config = { localAi: { mode: 'pick', rooms: { a: true, b: false } } };
  assert.deepEqual(localAiPatch(config, { rooms: { c: true } }), { localAi: { mode: 'pick', rooms: { a: true, b: false, c: true }, model: null } });
  assert.deepEqual(localAiPatch(config, { rooms: { a: null } }), { localAi: { mode: 'pick', rooms: { b: false }, model: null } });
  assert.deepEqual(localAiPatch(config, { mode: 'nope' }).localAi.mode, 'pick');
  assert.deepEqual(localAiPatch(config, { mode: 'manual' }).localAi.mode, 'manual');
});

test('local AI: the chosen model is kept beside the projects, and null gives the choice back to MADRE', () => {
  const config = { localAi: { mode: 'pick', rooms: { a: true } } };
  const chose = localAiPatch(config, { model: 'llama3.1:8b' });
  assert.deepEqual(chose, { localAi: { mode: 'pick', rooms: { a: true }, model: 'llama3.1:8b' } });
  // A patch about the projects keeps the model; junk changes nothing; null forgets it.
  assert.equal(localAiPatch(chose, { rooms: { b: true } }).localAi.model, 'llama3.1:8b');
  assert.equal(localAiPatch(chose, { model: 'no spaces allowed' }).localAi.model, 'llama3.1:8b');
  assert.equal(localAiPatch(chose, { model: null }).localAi.model, null);
});

test('local AI per project: Home sets the mode, the project moves its own switch only outside auto, and a new mode changes nothing already there', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-local-ai-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-local-ai-project-'));
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const call = (path, payload) => fetch(`http://127.0.0.1:${port}${path}`, payload === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async (response) => ({ status: response.status, body: await response.json() }));
    const config = async () => JSON.parse(await readFile(join(state, 'config.json'), 'utf8').catch(() => '{}'));

    assert.equal((await call('/api/local-ai')).body.project.mode, 'auto');
    // In auto Home decides: the project's switch does not move, and nothing is written.
    assert.equal((await call('/api/local-ai', { on: false })).status, 409);
    assert.equal((await call('/api/local-ai', { on: 'no' })).status, 400);
    assert.equal((await config()).localAi, undefined);

    const home = await call('/api/salas/local-ai', { mode: 'manual' });
    assert.equal(home.status, 200);
    assert.equal(home.body.mode, 'manual');
    const id = Object.keys((await config()).localAi.rooms)[0];
    assert.ok(id, 'switching the mode wrote down what each project already had');
    assert.equal((await config()).localAi.rooms[id], true);

    const here = await call('/api/local-ai', { on: false });
    assert.equal(here.status, 200);
    assert.deepEqual([here.body.project.chosen, here.body.project.on], [false, false]);
    // One by one keeps it off: a new mode is for new projects.
    await call('/api/salas/local-ai', { mode: 'pick' });
    assert.equal((await config()).localAi.rooms[id], false);
    const listed = (await call('/api/salas/local-ai')).body;
    assert.equal(listed.mode, 'pick');
    assert.equal(listed.projects.find((one) => one.id === id)?.on, false);
    // Home switches it back on, and the project reads it at once.
    await call('/api/salas/local-ai', { rooms: { [id]: true } });
    assert.equal((await call('/api/local-ai')).body.project.on, true);
    // The card's «Active» outside auto is this project's switch: it never turns the local AI off
    // for every other project.
    assert.equal((await call('/api/extensions/ollama/install', {})).status, 200);
    assert.equal((await config()).localAi.rooms[id], false);
    assert.equal((await config()).modules?.ollama?.enabled, undefined);
    // In auto it is the switch for all of them, as it always was.
    await call('/api/salas/local-ai', { mode: 'auto' });
    await call('/api/extensions/ollama/install', {});
    assert.equal((await config()).modules.ollama.enabled, false);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

// The welcome of 1.0.6 (2026-10-28): the AI of another computer — or Windows' own, from inside WSL
// — is tried before it is kept, then every reading goes there; and a first word with the model.
test('local AI: another computer\'s Ollama is tried before it is kept, and the welcome\'s «try it» answers with its model', async () => {
  const { createServer } = await import('node:http');
  const { probeOllama } = await import('../src/ollama.mjs');
  const asked = [];
  const fake = createServer((request, response) => {
    asked.push(`${request.method} ${request.url}`);
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      response.setHeader('content-type', 'application/json');
      if (request.url === '/api/tags') return response.end(JSON.stringify({ models: [{ name: 'qwen2.5:1.5b', size: 986e6, details: { family: 'qwen2' } }] }));
      if (request.url === '/api/version') return response.end(JSON.stringify({ version: '0.12.6' }));
      if (request.url === '/api/chat') {
        // As Ollama streams: one line per piece of the answer, then done.
        const said = JSON.parse(body);
        asked.push(`turns ${said.messages.length}`);
        response.setHeader('content-type', 'application/x-ndjson');
        response.write(`${JSON.stringify({ message: { content: '¡Hola! ' } })}\n`);
        response.write(`${JSON.stringify({ message: { content: `(${said.model}: ${said.messages.at(-1).content})` } })}\n`);
        return response.end(`${JSON.stringify({ done: true })}\n`);
      }
      response.statusCode = 404;
      response.end('{}');
    });
  });
  const fakePort = await new Promise((resolve) => fake.listen(0, '127.0.0.1', () => resolve(fake.address().port)));
  const state = await mkdtemp(join(tmpdir(), 'madre-local-host-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-local-host-project-'));
  const before = { pulse: process.env.PULSE_OLLAMA_HOST, ollama: process.env.OLLAMA_HOST };
  delete process.env.PULSE_OLLAMA_HOST;
  delete process.env.OLLAMA_HOST;
  let server;
  try {
    // The probe the room uses reads the address where every reading does: the environment. Until
    // one is kept, this computer has no Ollama (the suite never reaches the real one on 11434).
    const nothing = { running: false, host: null, models: [], embedModel: null, chatModel: null };
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true, ollamaProbe: async () => (process.env.PULSE_OLLAMA_HOST ? probeOllama() : nothing) }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const page = { origin: `http://127.0.0.1:${port}` };
    const call = (path, payload, headers = page) => fetch(`http://127.0.0.1:${port}${path}`, payload === undefined ? { headers } : { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) })
      .then(async (response) => ({ status: response.status, body: await response.json() }));
    const config = async () => JSON.parse(await readFile(join(state, 'config.json'), 'utf8').catch(() => '{}'));

    // Only MADRE's own page: an address chosen by any other would send the memory's text there.
    assert.equal((await call('/api/local-ai/host', { host: `127.0.0.1:${fakePort}` }, { origin: 'https://example.com' })).status, 403);
    assert.equal((await call('/api/local-ai/host', { host: `127.0.0.1:${fakePort}` }, {})).status, 403, 'kept with no page at all');
    assert.equal((await call('/api/local-ai/host', { host: `127.0.0.1:${fakePort}` }, { ...page, 'sec-fetch-site': 'cross-site' })).status, 403);
    assert.equal((await call('/api/local-ai/try', { text: 'hola' }, { origin: 'https://example.com' })).status, 403);
    assert.equal((await config()).ollama, undefined, 'a refused address was kept');
    assert.equal((await call('/api/local-ai/host', { host: 'not an address at all' })).status, 400);
    // Nothing answers there: nothing is kept, and it says where it looked.
    const dead = await call('/api/local-ai/host', { host: '127.0.0.1:9' });
    assert.equal(dead.status, 422);
    assert.match(dead.body.error, /127\.0\.0\.1:9/);
    assert.equal((await config()).ollama, undefined);
    assert.equal((await call('/api/local-ai/try', { text: 'hola' })).status, 412, 'answered with no model');

    // It answers: kept with Ollama's port when none was written, and every reading goes there.
    const kept = await call('/api/local-ai/host', { host: `127.0.0.1:${fakePort}` });
    assert.equal(kept.status, 200);
    assert.equal(kept.body.host, `http://127.0.0.1:${fakePort}`);
    assert.deepEqual(kept.body.models, ['qwen2.5:1.5b']);
    assert.equal((await config()).ollama.host, `http://127.0.0.1:${fakePort}`);
    assert.equal(process.env.PULSE_OLLAMA_HOST, `http://127.0.0.1:${fakePort}`);
    // It answers as it writes, and remembers the turns before: the welcome's «try it» is a talk.
    const talk = await fetch(`http://127.0.0.1:${port}/api/local-ai/try`, { method: 'POST', headers: { 'content-type': 'application/json', ...page }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: '¡Hola!' }, { role: 'user', content: '¿qué haces?' }] }) });
    assert.equal(talk.status, 200);
    assert.equal(talk.headers.get('x-madre-model'), 'qwen2.5:1.5b');
    assert.equal(await talk.text(), '¡Hola! (qwen2.5:1.5b: ¿qué haces?)');
    assert.ok(asked.includes('turns 4'), 'the system line and the three turns reach the model');
    assert.equal((await call('/api/local-ai/try', { messages: [{ role: 'assistant', content: 'solo' }] })).status, 400, 'nothing asked');
    assert.equal((await call('/api/local-ai/host', { host: `127.0.0.1:${fakePort}` }, { ...page, 'x-madre-device': 'phone-1' })).status, 403, 'changed from a phone');

    // Empty puts it back on this computer.
    const back = await call('/api/local-ai/host', { host: '' });
    assert.equal(back.status, 200);
    assert.equal(back.body.host, null);
    assert.equal((await config()).ollama.host, null);
    assert.equal(process.env.PULSE_OLLAMA_HOST, undefined);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await new Promise((resolve) => fake.close(() => resolve()));
    for (const [name, value] of [['PULSE_OLLAMA_HOST', before.pulse], ['OLLAMA_HOST', before.ollama]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
