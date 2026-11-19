// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The welcome's «try the local AI» when Ollama closed after MADRE last saw it open (2026-11-19, the
// author: «La IA local no contestó: fetch failed»): MADRE looks again, opens it when it can, asks
// once more, and otherwise says what happened in words a person reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPulseServer } from '../src/server.mjs';

async function tryWith({ host, probes, chat }) {
  const root = await mkdtemp(join(tmpdir(), 'madre-local-try-'));
  let asked = 0;
  // Open until the first ask, then whatever the case says: `probes(asked)`.
  const ollamaProbe = async () => {
    const running = probes(asked);
    return { running, host, version: '0.40.3', models: [{ name: 'qwen2.5:7b' }], chatModel: running ? 'qwen2.5:7b' : null, embedModel: null };
  };
  const reportFetch = async (url, options) => {
    if (String(url).endsWith('/api/chat')) { asked += 1; return chat(asked, options); }
    return new Response('{}', { status: 404 });
  };
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents: [], invokers: {}, ollamaProbe, reportFetch });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    // MADRE saw it open when it started.
    await fetch(`${base}/api/ollama/probe`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    const response = await fetch(`${base}/api/local-ai/try`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: '¿Qué puedes hacer sin internet?' }] }) });
    const text = await response.text();
    return { status: response.status, text, asked };
  } finally {
    await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await rm(root, { recursive: true, force: true });
  }
}

test('local AI try: the first ask fails, MADRE looks again, finds it open and asks once more', async () => {
  const result = await tryWith({
    host: 'http://127.0.0.1:11434',
    probes: () => true,
    chat: (asked) => {
      if (asked === 1) throw new TypeError('fetch failed');
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`${JSON.stringify({ message: { content: 'Puedo ayudarte sin internet.' }, done: true })}\n`)); controller.close(); } }), { status: 200 });
    },
  });
  assert.equal(result.status, 200, result.text);
  assert.equal(result.asked, 2);
  assert.match(result.text, /Puedo ayudarte sin internet/);
});

test('local AI try: another computer that stops answering is said in words, never «fetch failed», and nothing is started here', async () => {
  const result = await tryWith({
    host: 'http://10.0.0.5:11434',
    probes: (asked) => asked === 0,
    chat: () => { throw new TypeError('fetch failed'); },
  });
  assert.equal(result.status, 502);
  const body = JSON.parse(result.text);
  assert.match(body.error, /did not answer|no contestó/);
  assert.match(body.error, /10\.0\.0\.5/);
  assert.doesNotMatch(body.error, /fetch failed/);
  assert.equal(body.stopped, true);
  assert.equal(result.asked, 1, 'it asked again with nothing open');
});

test('local AI try: on this computer a closed Ollama is opened quietly before saying anything', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  const route = source.slice(source.indexOf("url.pathname === '/api/local-ai/try'"), source.indexOf("response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache', 'x-madre-model'"));
  assert.match(route, /if \(!back && local\) back = \(await startOllama\(\{ quiet: true \}\)/);
  assert.match(route, /Ollama closed and MADRE could not open it again\. Open it in Settings › Local AI and try again\./);
  // Quiet: no install card in the room for an Ollama MADRE opened on its own.
  assert.match(source, /async function startOllama\(\{ quiet = false \} = \{\}\) \{/);
  assert.match(source, /if \(!quiet\) await room\.record\('extension\.install\.started'/);
});
