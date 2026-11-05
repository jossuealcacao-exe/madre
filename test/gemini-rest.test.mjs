// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseGeminiRestError, invokeGeminiRest } from '../src/adapters/gemini-rest.mjs';
import { invokeGemini } from '../src/adapters/gemini.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';
import { geminiAuthState } from '../src/auth-probe.mjs';

function mockSseResponse(chunks, { status = 200, headers = {} } = {}) {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
      controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    body: stream,
    async text() {
      return chunks.join('');
    },
    async json() {
      return JSON.parse(chunks.join(''));
    },
  };
}

test('diagnoseGeminiRestError maps Google API error codes and messages', () => {
  assert.equal(diagnoseGeminiRestError(429, { message: 'Your prepayment credits are depleted. Please go to AI Studio' }).code, 'CREDITS_DEPLETED');
  assert.equal(diagnoseGeminiRestError(429, { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for QuotaId' }).code, 'RATE_LIMITED');
  assert.equal(diagnoseGeminiRestError(401, { message: 'API key not valid. Please pass a valid API key.' }).code, 'AUTH');
  assert.equal(diagnoseGeminiRestError(403, { status: 'PERMISSION_DENIED', message: 'Permission denied.' }).code, 'AUTH');
  assert.equal(diagnoseGeminiRestError(404, { status: 'NOT_FOUND', message: 'models/gemini-unknown is not found' }).code, 'MODEL_NOT_FOUND');
  assert.equal(diagnoseGeminiRestError(503, { status: 'UNAVAILABLE', message: 'The model is overloaded.' }).code, 'UNAVAILABLE');
  assert.equal(diagnoseGeminiRestError(500, { message: 'Internal error' }).code, 'UNAVAILABLE');
});

test('invokeGeminiRest rejects with AUTH if no API key is provided or found', async () => {
  await assert.rejects(
    invokeGeminiRest({ prompt: 'hello', key: '', env: {} }),
    (error) => error.code === 'AUTH' && /API key/.test(error.message),
  );
});

test('invokeGeminiRest parses SSE stream, accumulates text, usage, and calls onProgress', async () => {
  const progressCalls = [];
  const sseData = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"}}]}\n\n',
    'data: {"candidates":[{"content":{"parts":[{"text":" world!"}],"role":"model"}}],"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":6,"totalTokenCount":18}}\n\n',
    'data: [DONE]\n\n',
  ];

  const fetchImpl = async (url, options) => {
    assert.ok(url.includes('streamGenerateContent?alt=sse'));
    assert.ok(url.includes('models/gemini-2.5-flash'));
    assert.ok(url.includes('key=test-key-123'));
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].text, 'Say hello');
    return mockSseResponse(sseData);
  };

  const result = await invokeGeminiRest({
    prompt: 'Say hello',
    key: 'test-key-123',
    fetchImpl,
    onProgress: (prog) => progressCalls.push(prog.chars),
  });

  assert.equal(result.text, 'Hello world!');
  assert.deepEqual(progressCalls, [5, 12]);
  assert.equal(result.usage.inputTokens, 12);
  assert.equal(result.usage.outputTokens, 6);
  assert.equal(result.usage.totalTokens, 18);
  assert.equal(result.usage.source, 'gemini-json');
});

test('invokeGeminiRest retries on fallbackModel when credits are depleted or model is unavailable', async () => {
  const modelsRequested = [];
  const fetchImpl = async (url) => {
    const match = url.match(/models\/([^:]+):streamGenerateContent/);
    const model = match ? match[1] : '';
    modelsRequested.push(model);
    if (model === 'gemini-2.5-pro') {
      return {
        ok: false,
        status: 429,
        async json() {
          return { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Your prepayment credits are depleted.' } };
        },
      };
    }
    return mockSseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"Answered by Flash"}],"role":"model"}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"totalTokenCount":15}}\n\n',
    ]);
  };

  const result = await invokeGeminiRest({
    prompt: 'test prompt',
    model: 'gemini-2.5-pro',
    fallbackModel: 'gemini-2.5-flash',
    key: 'test-key',
    fetchImpl,
  });

  assert.equal(result.text, 'Answered by Flash');
  assert.deepEqual(modelsRequested, ['gemini-2.5-pro', 'gemini-2.5-flash']);
});

test('invokeGeminiRest preserves initial diagnosis when fallback model also fails', async () => {
  const fetchImpl = async (url) => {
    const match = url.match(/models\/([^:]+):streamGenerateContent/);
    const model = match ? match[1] : '';
    if (model === 'gemini-2.5-pro') {
      return {
        ok: false,
        status: 429,
        async json() {
          return { error: { code: 429, message: 'Your prepayment credits are depleted.' } };
        },
      };
    }
    return {
      ok: false,
      status: 503,
      async json() {
        return { error: { code: 503, status: 'UNAVAILABLE', message: 'Service unavailable' } };
      },
    };
  };

  await assert.rejects(
    invokeGeminiRest({
      prompt: 'test prompt',
      model: 'gemini-2.5-pro',
      fallbackModel: 'gemini-2.5-flash',
      key: 'test-key',
      fetchImpl,
    }),
    (error) => error.code === 'CREDITS_DEPLETED' && /prepaid credits left/.test(error.message) && /also tried gemini-2\.5-flash/.test(error.message),
  );
});

test('invokeGemini automatically delegates to invokeGeminiRest when executable is null', async () => {
  const sseData = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Delegated to REST"}],"role":"model"}}]}\n\n',
  ];
  const fetchImpl = async () => mockSseResponse(sseData);

  const result = await invokeGemini({
    executable: null,
    projectRoot: process.cwd(),
    prompt: 'test delegation',
    key: 'test-key',
    fetchImpl,
  });

  assert.equal(result.text, 'Delegated to REST');
});

test('detectAgents detects Gemini as ready via Google AI Studio REST when CLI is missing but API key is set', async () => {
  const fakeEnv = {
    PATH: '',
    GEMINI_API_KEY: 'AIzaSyFakeKey123',
  };

  const detected = await detectAgents({
    env: fakeEnv,
    keyResolver: async () => 'AIzaSyFakeKey123',
    finder: async () => null,
  });
  const gemini = detected.find((agent) => agent.id === 'gemini');

  assert.ok(gemini);
  assert.equal(gemini.detected, true);
  assert.equal(gemini.ready, true);
  assert.equal(gemini.path, null);
  assert.equal(gemini.version, 'Google AI Studio REST');
});

test('geminiAuthState recognises API key without CLI settings.json as signed-in', () => {
  const state = geminiAuthState({ settings: null, hasOauth: false, hasApiKey: true });
  assert.equal(state.state, 'signed-in');
  assert.equal(state.detail, 'via API key');
});
