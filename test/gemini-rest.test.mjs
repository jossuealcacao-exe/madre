// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diagnoseGeminiRestError, invokeGeminiRest, DEFAULT_GEMINI_REST_MODEL } from '../src/adapters/gemini-rest.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';
import { geminiAuthState, loginPlanFor, probeAgentAuth } from '../src/auth-probe.mjs';
import { resolveScopes, setAgentsViaApi, capabilitySummary } from '../src/capabilities.mjs';
import { classify } from '../src/outbound.mjs';
import { applyKey } from '../src/credentials.mjs';
import { defaultInvokers } from '../src/room.mjs';

const sse = (events) => events.map((one) => `data: ${JSON.stringify(one)}\n\n`);
function mockSseResponse(chunks, { status = 200 } = {}) {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  return { ok: status >= 200 && status < 300, status, body: stream, async text() { return chunks.join(''); }, async json() { return JSON.parse(chunks.join('')); } };
}
const refusal = (status, error) => ({ ok: false, status, async json() { return { error }; } });
const modelOf = (url) => url.match(/models\/([^:]+):streamGenerateContent/)?.[1] ?? '';

test('Google\'s refusals are said as what they are', () => {
  assert.equal(diagnoseGeminiRestError(429, { message: 'Your prepayment credits are depleted.' }).code, 'CREDITS_DEPLETED');
  assert.equal(diagnoseGeminiRestError(429, { status: 'RESOURCE_EXHAUSTED' }).code, 'RATE_LIMITED');
  assert.equal(diagnoseGeminiRestError(400, { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' }).code, 'AUTH');
  assert.equal(diagnoseGeminiRestError(404, { status: 'NOT_FOUND' }).code, 'MODEL_NOT_FOUND');
  assert.equal(diagnoseGeminiRestError(500, { message: 'Internal error' }).code, 'UNAVAILABLE');
  // Review of 2026-11-06: any message naming «models/» read as a missing model.
  assert.equal(diagnoseGeminiRestError(400, { message: 'The input token count (1200000) exceeds the maximum number of tokens allowed (1048576) for models/gemini-3-flash-preview.' }).code, 'TOO_LONG');
});

test('without a key it says so and calls nobody', async () => {
  let calls = 0;
  await assert.rejects(
    invokeGeminiRest({ prompt: 'hello', key: '', env: {}, fetchImpl: async () => { calls += 1; } }),
    (error) => error.code === 'AUTH' && /API key/.test(error.message),
  );
  assert.equal(calls, 0);
});

test('the key travels in a header, the answer streams, and thinking is billed', async () => {
  const progress = [];
  const fetchImpl = async (url, options) => {
    assert.match(url, /\/v1beta\/models\/gemini-3-flash-preview:streamGenerateContent\?alt=sse$/);
    assert.doesNotMatch(url, /key=/, 'never in the address');
    assert.equal(options.headers['x-goog-api-key'], 'test-key-123');
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].text, 'Say hello');
    assert.match(body.systemInstruction.parts[0].text, /cannot open, read, list, create or change any file/);
    return mockSseResponse(sse([
      { candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: 'Hello' }] } }] },
      { candidates: [{ content: { parts: [{ text: ' world!' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6, thoughtsTokenCount: 5000, totalTokenCount: 5018 } },
    ]));
  };
  const result = await invokeGeminiRest({ prompt: 'Say hello', key: 'test-key-123', env: {}, fetchImpl, onProgress: ({ chars }) => progress.push(chars) });
  assert.equal(result.text, 'Hello world!');
  assert.deepEqual(progress, [5, 12]);
  assert.equal(result.usage.inputTokens, 12);
  assert.equal(result.usage.outputTokens, 6);
  assert.equal(result.usage.reasoningTokens, 5000);
  assert.equal(result.model, DEFAULT_GEMINI_REST_MODEL);
  // 5006 output tokens, not 6: the thinking is paid for.
  assert.ok(result.usage.costUsd > 0.01, `priced with its thinking: ${result.usage.costUsd}`);
});

test('«auto» is the CLI\'s router: through the API it is the default model', async () => {
  const asked = [];
  await invokeGeminiRest({ prompt: 'x', model: 'auto', key: 'k', env: {}, fetchImpl: async (url) => { asked.push(modelOf(url)); return mockSseResponse(sse([{ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }])); } });
  assert.deepEqual(asked, [DEFAULT_GEMINI_REST_MODEL]);
});

test('a refused or missing model tries the spare once, and keeps the first reason when that fails too', async () => {
  const asked = [];
  const answered = await invokeGeminiRest({
    prompt: 'x', model: 'gemini-3-pro-preview', fallbackModel: 'gemini-3-flash-preview', key: 'k', env: {},
    fetchImpl: async (url) => {
      asked.push(modelOf(url));
      return modelOf(url) === 'gemini-3-pro-preview' ? refusal(404, { status: 'NOT_FOUND', message: 'models/gemini-3-pro-preview is not found for API version v1beta' }) : mockSseResponse(sse([{ candidates: [{ content: { parts: [{ text: 'by flash' }] } }] }]));
    },
  });
  assert.equal(answered.text, 'by flash');
  assert.equal(answered.model, 'gemini-3-flash-preview');
  assert.equal(answered.fallbackFrom, 'gemini-3-pro-preview');
  assert.deepEqual(asked, ['gemini-3-pro-preview', 'gemini-3-flash-preview']);

  await assert.rejects(
    invokeGeminiRest({
      prompt: 'x', model: 'gemini-3-pro-preview', fallbackModel: 'gemini-3-flash-preview', key: 'k', env: {},
      fetchImpl: async (url) => (modelOf(url) === 'gemini-3-pro-preview' ? refusal(429, { message: 'Your prepayment credits are depleted.' }) : refusal(503, { status: 'UNAVAILABLE' })),
    }),
    (error) => error.code === 'CREDITS_DEPLETED' && /also tried gemini-3-flash-preview/.test(error.message),
  );
  // The spare hangs: the first refusal is still why.
  await assert.rejects(
    invokeGeminiRest({
      prompt: 'x', model: 'gemini-3-pro-preview', fallbackModel: 'gemini-3-flash-preview', key: 'k', env: {}, timeoutMs: 50,
      fetchImpl: async (url, { signal }) => (modelOf(url) === 'gemini-3-pro-preview' ? refusal(503, { status: 'UNAVAILABLE' }) : new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))),
    }),
    (error) => error.code === 'UNAVAILABLE',
  );
});

test('time running out mid-answer, no network and a blocked message are each said plainly', async () => {
  const hanging = () => ({ ok: true, status: 200, body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(sse([{ candidates: [{ content: { parts: [{ text: 'half' }] } }] }])[0])); } }) });
  await assert.rejects(
    invokeGeminiRest({ prompt: 'x', key: 'k', env: {}, timeoutMs: 80, fallbackModel: '', fetchImpl: async (url, { signal }) => {
      const response = hanging();
      const reader = response.body.getReader();
      return { ...response, body: { async *[Symbol.asyncIterator]() { for (;;) { const step = await Promise.race([reader.read(), new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))]); if (step.done) return; yield step.value; } } } };
    } }),
    (error) => error.code === 'TIMEOUT',
  );
  await assert.rejects(
    invokeGeminiRest({ prompt: 'x', key: 'k', env: {}, fallbackModel: '', fetchImpl: async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }); } }),
    (error) => error.code === 'NETWORK' && /ENOTFOUND/.test(error.message),
  );
  await assert.rejects(
    invokeGeminiRest({ prompt: 'x', key: 'k', env: {}, fetchImpl: async () => mockSseResponse(sse([{ promptFeedback: { blockReason: 'SAFETY' } }])) }),
    (error) => error.code === 'BLOCKED' && /SAFETY/.test(error.message),
  );
});

// The fault of a575180: the room never hands a key in, and `key = null` meant «no key», so every
// turn ended in «Gemini requires an API key» without reaching Google. Through the room's own
// invoker, against a server on this computer, with the key only in the environment.
test('the room\'s own invoker finds the key and reaches Google with it', async () => {
  const seen = [];
  const server = createServer((request, response) => {
    seen.push({ url: request.url, key: request.headers['x-goog-api-key'] });
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end(sse([{ candidates: [{ content: { parts: [{ text: 'hola desde la API' }] } }] }]).join(''));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const saved = { url: process.env.PULSE_GEMINI_API_URL, key: process.env.GEMINI_API_KEY };
  process.env.PULSE_GEMINI_API_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.GEMINI_API_KEY = 'key-from-the-environment';
  try {
    const result = await defaultInvokers['gemini-rest']({ executable: null, projectRoot: process.cwd(), prompt: 'hola', model: null, timeoutMs: 5000, attachments: [], lease: null });
    assert.equal(result.text, 'hola desde la API');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].key, 'key-from-the-environment');
    assert.doesNotMatch(seen[0].url, /key=/);
  } finally {
    process.env.PULSE_GEMINI_API_URL = saved.url;
    if (saved.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved.key;
    server.close();
  }
});

test('found with only a Gemini key, Gemini answers through the API, and nothing more', async () => {
  const noCli = async () => null;
  const viaKey = (await detectAgents({ env: { PATH: '' }, keyPresent: async () => true, finder: noCli })).find((agent) => agent.id === 'gemini');
  assert.equal(viaKey.detected, true);
  assert.equal(viaKey.ready, true);
  assert.equal(viaKey.adapter, 'gemini-rest');
  assert.equal(viaKey.viaApi, true);
  assert.equal(viaKey.path, null);
  assert.ok(defaultInvokers[viaKey.adapter], 'the room has an invoker for it');
  // A GOOGLE_API_KEY is any Google key (Maps, say): it does not make Gemini appear.
  const { geminiApiKeyPresent } = await import('../src/runtime-detection.mjs');
  assert.equal(await geminiApiKeyPresent({ GOOGLE_API_KEY: 'maps-key', GEMINI_CLI_HOME: '/nonexistent' }), false);
  assert.equal(await geminiApiKeyPresent({ GEMINI_API_KEY: 'k' }), true);
  // With its CLI there, the CLI answers, unless PULSE_GEMINI_ADAPTER=rest says otherwise.
  const withCli = async (candidates) => (candidates.includes('gemini') ? '/usr/bin/true' : null);
  assert.equal((await detectAgents({ env: { PATH: '' }, keyPresent: async () => true, finder: withCli })).find((agent) => agent.id === 'gemini').adapter, 'gemini-readonly');
  assert.equal((await detectAgents({ env: { PATH: '', PULSE_GEMINI_ADAPTER: 'rest' }, keyPresent: async () => true, finder: withCli })).find((agent) => agent.id === 'gemini').adapter, 'gemini-rest');

  // It answers at #1 at most: no reading, no writing, no images, no web.
  setAgentsViaApi([viaKey]);
  try {
    const scopes = resolveScopes('gemini', { maxMode: 4 });
    assert.equal(scopes.maxMode, 1);
    assert.equal(scopes.write.capable, false);
    assert.equal(scopes.imageGen.capable, false);
    assert.equal(capabilitySummary('gemini').read, false);
  } finally {
    setAgentsViaApi([]);
  }
  assert.ok(resolveScopes('gemini', { maxMode: 3 }).write.capable, 'the CLI keeps its own');
  // No Google door: there is no CLI to sign in with.
  assert.equal(loginPlanFor(viaKey), null);
  // And what it sends is declared, as Gemini through its API.
  assert.equal(classify('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse').id, 'gemini-answer');
});

test('without its CLI, Gemini is signed in by its key alone, and a key Google refuses is not saved', async () => {
  const home = await mkdtemp(join(tmpdir(), 'madre-gemini-'));
  const saved = { home: process.env.GEMINI_CLI_HOME, key: process.env.GEMINI_API_KEY };
  process.env.GEMINI_CLI_HOME = home;
  delete process.env.GEMINI_API_KEY;
  try {
    const agent = { id: 'gemini', detected: false, path: null };
    assert.equal((await probeAgentAuth(agent)).state, 'not-installed');
    // Leftovers of the CLI (a Google sign-in, a Vertex setting) say nothing without it.
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', 'settings.json'), JSON.stringify({ security: { auth: { selectedType: 'vertex-ai' } } }));
    await writeFile(join(home, '.gemini', 'oauth_creds.json'), '{}');
    assert.equal((await probeAgentAuth(agent)).state, 'not-installed');

    const refused = await applyKey({ agent: 'gemini', key: 'AIza-made-up', home, probe: () => probeAgentAuth(agent), verifyGemini: async () => ({ ok: false, status: 400 }) });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /Google did not accept this Gemini key/);
    assert.equal((await probeAgentAuth(agent)).state, 'not-installed', 'nothing written');

    const taken = await applyKey({ agent: 'gemini', key: 'AIza-good-one', home, probe: () => probeAgentAuth(agent), verifyGemini: async () => ({ ok: true }) });
    assert.equal(taken.ok, true);
    assert.equal((await probeAgentAuth(agent)).state, 'signed-in');
  } finally {
    if (saved.home === undefined) delete process.env.GEMINI_CLI_HOME; else process.env.GEMINI_CLI_HOME = saved.home;
    if (saved.key !== undefined) process.env.GEMINI_API_KEY = saved.key;
    await rm(home, { recursive: true, force: true });
  }
});

test('with its CLI, a key without a chosen sign-in is still the CLI\'s to judge', () => {
  assert.equal(geminiAuthState({ settings: null, hasOauth: false, hasApiKey: true }).state, 'unknown');
  assert.equal(geminiAuthState({ settings: { security: { auth: { selectedType: 'gemini-api-key' } } }, hasOauth: false, hasApiKey: true }).state, 'signed-in');
});
