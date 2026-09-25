import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OutboundLog, outboundView, classify, lineFor, DESTINATIONS, KEEP } from '../src/outbound.mjs';
import { createPulseServer } from '../src/server.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('outbound: a line says where it went and never what was in it', () => {
  // The Gemini embedding endpoint takes the key in the URL. The parameter name is useful; the
  // value is the one thing a log of what left this machine must never hold.
  const line = lineFor({ url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=AIzaSy-real-key&alt=json', method: 'POST', status: 200, ok: true, ms: 120, bytes: 4096 });
  assert.equal(line.id, 'embeddings');
  assert.deepEqual(line.params, ['key', 'alt']);
  assert.ok(!JSON.stringify(line).includes('AIzaSy-real-key'), 'a key reached the log');
  assert.equal(line.bytes, 4096, 'how much was sent is said, which is not the same as what');

  // The same host is two different things, and they are told apart by what is being asked of it.
  assert.equal(classify('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent').id, 'image');
  assert.equal(classify('https://registry.npmjs.org/@jossuealcala%2Fmadre/latest').id, 'npm');
  assert.equal(classify('https://api.github.com/repos/ollama/ollama/releases/latest').id, 'github');
  assert.equal(classify('https://api.anthropic.com/api/oauth/usage').id, 'anthropic');
  // The collector's address is a setting, so it is recognised by the address in use.
  assert.equal(classify('https://someone.workers.dev/v1/reports', { reportHost: 'someone.workers.dev' }).id, 'reports');
  // Local is local, and Ollama is named because a person should see it never leaves.
  assert.deepEqual(classify('http://127.0.0.1:11434/api/embed'), { id: 'ollama', to: '127.0.0.1:11434', local: true });
  assert.equal(classify('http://localhost:4400/api/state').local, true);
  // And an address nothing declares is said to be exactly that, rather than quietly counted.
  assert.equal(classify('https://analytics.example.com/collect').id, 'unknown');
});

test('outbound: every declaration answers for itself, and no address hides from the list', async () => {
  for (const one of DESTINATIONS) {
    assert.ok(one.what && one.what.length > 30, `${one.id} does not say what it sends`);
    assert.ok(one.when && one.when.length > 5, `${one.id} does not say when`);
    assert.ok(one.where && one.where.length > 5, `${one.id} does not say where it is turned off`);
  }
  // The guard: every address written anywhere in the source is either one MADRE reaches — and
  // then it is declared above, with what it sends and where it is turned off — or one MADRE only
  // ever puts in front of a person as a link to click. There is no third kind, and a new host
  // added by anybody has to say which it is here. This is the whole promise of that floor: the
  // list is complete. It is also the kind of promise that rots silently the next time somebody
  // adds a call, which is why it is a test and not a paragraph.
  const SHOWN_AS_LINKS = new Set([
    'github.com',                 // the issue a person opens with a report in hand
    'ollama.com',                 // where Ollama is downloaded from, by the human
    'console.anthropic.com', 'platform.openai.com', 'openrouter.ai', 'aistudio.google.com', 'ai.studio', // where a key is made
  ]);
  const declared = new Set(DESTINATIONS.map((one) => one.host).filter(Boolean));
  const dir = join(import.meta.dirname, '..', 'src');
  const files = [];
  const walk = async (at) => {
    for (const entry of await readdir(at, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(join(at, entry.name));
      else if (entry.name.endsWith('.mjs')) files.push(join(at, entry.name));
    }
  };
  await walk(dir);
  const seen = new Map();
  for (const file of files) {
    for (const [, host] of (await readFile(file, 'utf8')).matchAll(/https:\/\/([a-z0-9.-]+)/g)) if (!seen.has(host)) seen.set(host, file);
  }
  assert.ok(seen.size >= 10, 'the scan found almost nothing, so it is guarding almost nothing');
  for (const [host, file] of seen) {
    assert.ok(declared.has(host) || SHOWN_AS_LINKS.has(host),
      `${file} names ${host}, which is neither declared in DESTINATIONS nor listed as an address MADRE only shows a person`);
  }
  // And the four MADRE actually calls are declared, not merely tolerated.
  for (const host of ['registry.npmjs.org', 'api.github.com', 'generativelanguage.googleapis.com', 'api.anthropic.com']) {
    assert.ok(declared.has(host), `${host} is reached by MADRE and not declared`);
  }
});

test('outbound: the wrapper records what went out without touching what came back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-outbound-'));
  try {
    const file = join(root, 'outbound.jsonl');
    const log = new OutboundLog({ file });
    const body = JSON.stringify({ hello: 'world' });
    const fake = async (url) => (String(url).includes('boom')
      ? Promise.reject(Object.assign(new Error('getaddrinfo ENOTFOUND registry.npmjs.org'), { code: 'ENOTFOUND' }))
      : new Response(body, { status: 200 }));
    const watched = log.watch(fake);

    const response = await watched('https://registry.npmjs.org/madre/latest', { method: 'GET' });
    // The response is handed back whole: a log that consumed what it watched would break it.
    assert.equal(await response.text(), body);

    await assert.rejects(() => watched('https://registry.npmjs.org/boom/latest'), /ENOTFOUND/);
    // The failure is kept by its code, never by its message: a message carries the address.
    const [failed, ok] = log.recent();
    assert.equal(failed.error, 'ENOTFOUND');
    assert.equal(failed.ok, false);
    assert.equal(ok.ok, true);
    assert.equal(ok.status, 200);
    assert.deepEqual(log.counts().npm, { calls: 2, failed: 1, last: failed.at });

    // It is on disk, and a room that opens again reads it back.
    await log.drain();
    const lines = (await readFile(file, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    const reopened = await new OutboundLog({ file }).load();
    assert.equal(reopened.counts().npm.calls, 2);

    // Wrapping a watched fetch again does not double-count it.
    assert.equal(log.watch(watched), watched);
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('outbound: a writer holding only its own lines never rewrites the file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-outbound-trim-'));
  try {
    // The image studio appends from a process of its own and knows nothing of what came before.
    const file = join(root, 'outbound.jsonl');
    await writeFile(file, `${'x'.repeat(600 * 1024)}\n`);
    const studio = new OutboundLog({ file });
    studio.record({ url: 'https://generativelanguage.googleapis.com/v1beta/models/x:generateContent', method: 'POST', status: 200, ok: true, ms: 900 });
    await studio.drain();
    const after = await readFile(file, 'utf8');
    assert.ok(after.length > 600 * 1024, 'a process holding two lines threw the room\'s log away');
    assert.match(after, /generateContent/);
    assert.equal(studio.recent()[0].id, 'image');
    assert.ok(KEEP > 1);
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('outbound: the image studio writes its own line from its own process', async () => {
  const { generateImage } = await import('../src/mcp/image-server.mjs');
  const root = await mkdtemp(join(tmpdir(), 'pulse-outbound-image-'));
  try {
    const file = join(root, 'outbound.jsonl');
    const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
    const body = JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png, mimeType: 'image/png' } }] } }] });
    const made = await generateImage({
      prompt: 'a poster of the ship',
      fileName: 'poster.png',
      outDir: root,
      env: { GEMINI_API_KEY: 'AIzaSy-real-key', PULSE_OUTBOUND_LOG: file },
      fetchImpl: async () => new Response(body, { status: 200 }),
    });
    assert.match(made.path, /poster\.png$/);

    // The one request MADRE makes that carries somebody's words to Google is made from another
    // process. Without this it would be the one request the log could not see.
    let written = '';
    for (let tries = 0; tries < 40 && !written; tries += 1) {
      written = await readFile(file, 'utf8').catch(() => '');
      if (!written) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const line = JSON.parse(written.trim());
    assert.equal(line.id, 'image');
    assert.equal(line.ok, true);
    assert.equal(line.method, 'POST');
    // And the key it was sent with is not in it. That key travels in a header, and headers are
    // not written here at all.
    assert.ok(!written.includes('AIzaSy-real-key'));
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('outbound: the view answers for each address and admits what it cannot see', () => {
  const log = new OutboundLog();
  log.record({ url: 'https://registry.npmjs.org/madre/latest', status: 200, ok: true, ms: 10 });
  log.record({ url: 'https://analytics.example.com/collect', status: 204, ok: true, ms: 10 });
  const view = outboundView({
    log,
    agents: [{ id: 'claude', detected: true }, { id: 'madre', detected: true, local: true }],
    state: { crew: true, npm: true, embeddings: false, ollama: true },
  });
  const by = Object.fromEntries(view.destinations.map((one) => [one.id, one]));
  assert.equal(by.npm.calls, 1);
  assert.equal(by.npm.on, true);
  assert.equal(by.embeddings.on, false);
  assert.equal(by.image.on, null, 'a destination with nothing known about it claims nothing');
  // The crew is named by where each agent's own process talks to, and @madre is not in the list
  // because @madre answers here.
  assert.equal(by.crew.to, '@claude → Anthropic');
  // What MADRE cannot see, it says it cannot see: the crew's own conversation with its provider
  // happens in a process of its own. The image studio also runs outside, but it writes its own
  // line into this log, so it is not in that category.
  assert.equal(by.crew.inside, false);
  assert.equal(by.image.inside, true);
  // And an address nobody declared is reported rather than buried.
  assert.equal(view.undeclared, 1);
  assert.match(view.says, /went to an address nothing here declares/);
});

test('outbound: the room answers for what left it, and the log holds what it did', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-outbound-room-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-outbound-proj-'));
  try {
    const { server } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake/claude', version: '1' }],
      probe: async () => ({ claude: { state: 'signed-in', detail: 'subscription' } }),
      reportFetch: async () => new Response('{}', { status: 200 }),
      ollamaProbe: async () => ({ running: false, host: null, models: [], embedModel: null, chatModel: null }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const view = await fetch(`${base}/api/outbound`).then((response) => response.json());
      assert.deepEqual(view.destinations.map((one) => one.id).sort(), DESTINATIONS.map((one) => one.id).sort());
      const crew = view.destinations.find((one) => one.id === 'crew');
      assert.equal(crew.to, '@claude → Anthropic');
      assert.match(crew.what, /briefing/i);
      // Every row says where it is switched off, which is what makes the list actionable.
      for (const one of view.destinations) assert.ok(one.where.length > 5, `${one.id} points nowhere`);
      // The room names the file the image studio writes its own line into.
      assert.equal(process.env.PULSE_OUTBOUND_LOG?.endsWith('outbound.jsonl'), true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('outbound: the floor shows the declaration and the log that checks it', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /doc\.append\(renderCoreOutbound\(core\.outbound\)\)/);
  assert.match(app, /WHAT LEFT THIS MACHINE/);
  assert.match(app, /THE LAST REQUESTS THIS PROCESS MADE/);
  assert.match(app, /NO BODY, NO HEADER AND NO QUERY VALUE IS EVER WRITTEN HERE/);
  // It is read once per visit, not on every keystroke: it is about the room, not about this turn.
  assert.match(app, /fetch\('\/api\/outbound'\)/);
  assert.match(css, /\.egress\.off \{ opacity: \.55; \}/);
});
