// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Gemini without its CLI: Google AI Studio's API, called by MADRE with the person's own key.
//
// What it is and what it is not (review of 2026-11-06). The CLI reads the project, sees what is
// attached and writes where a permission lets it; this is a request with the briefing in it and an
// answer back. So the room gives it what it can do (capabilities.mjs, `gemini-rest`): it answers,
// at #1 at most, and it is told it cannot open a file. The key travels in a header, never in the
// address, and the request goes through the same watch as every other one this process makes
// (outbound.mjs, `gemini-answer`).

import { resolveGeminiKey } from '../mcp/image-server.mjs';
import { withListPrice } from '../prices.mjs';
import { t } from '../i18n.mjs';

// The ones Google still gives a new key (models.mjs): 2.5 Flash is not among them any more.
export const DEFAULT_GEMINI_REST_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3-flash-preview';
export const geminiApiBase = (env = process.env) => env.PULSE_GEMINI_API_URL ?? 'https://generativelanguage.googleapis.com';

// Said to the model before the briefing: the briefing speaks of a project it was not given.
export const REST_INSTRUCTION = 'You are answering through Google\'s Gemini API, called by MADRE. You have no tools here: you cannot open, read, list, create or change any file of the project, run a command or search the web. Answer only from what this message contains. When asked about a file or folder you were not shown, say you cannot read it from here and that the Gemini CLI, once installed, can.';

// Google's own words, turned into something a person can act on.
export function diagnoseGeminiRestError(status, errorBody = {}) {
  const message = String(errorBody?.message ?? errorBody?.error?.message ?? '');
  const errorStatus = String(errorBody?.status ?? errorBody?.error?.status ?? '');

  if (/prepayment credits are depleted/i.test(message)) {
    return {
      code: 'CREDITS_DEPLETED',
      message: t('Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.'),
      hint: t('Add credits at https://ai.studio/projects, or paste another Gemini key in Settings › Agents › Gemini.'),
    };
  }
  if (status === 429 || errorStatus === 'RESOURCE_EXHAUSTED' || /quota exceeded|rate limit/i.test(message)) {
    return {
      code: 'RATE_LIMITED',
      message: t('Google is rate-limiting this Gemini key (HTTP 429).'),
      hint: t('Wait a minute, or pick another model; check the key\'s quota at aistudio.google.com.'),
    };
  }
  // A bad key is a 400 at Google (API_KEY_INVALID), not a 401.
  if (status === 401 || status === 403 || errorStatus === 'PERMISSION_DENIED' || /API key not valid|API_KEY_INVALID|unauthorized/i.test(message)) {
    return {
      code: 'AUTH',
      message: t('Google rejected the Gemini credentials.'),
      hint: t('Paste the key again in Settings › Agents › Gemini, or check GEMINI_API_KEY in your environment or ~/.gemini/.env.'),
    };
  }
  if (/input token count|exceeds the maximum number of tokens|too many tokens/i.test(message)) {
    return {
      code: 'TOO_LONG',
      message: t('The message is longer than this Gemini model takes in one go.'),
      hint: t('Start a new conversation, or attach less text.'),
    };
  }
  if (status === 404 || errorStatus === 'NOT_FOUND' || /model .*not found|is not found for API version|is not supported for generateContent/i.test(message)) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: t('Google reported that the requested Gemini model does not exist or is not available for this key.'),
      hint: t('Pick another model under the box.'),
    };
  }
  if (status >= 500 || errorStatus === 'UNAVAILABLE') {
    return {
      code: 'UNAVAILABLE',
      message: t('Google reported the model as unavailable (HTTP {status}).', { status }),
      hint: t('Try again shortly or choose another model.'),
    };
  }
  return {
    code: 'API_ERROR',
    message: message || t('Google Gemini API request failed with HTTP {status}.', { status }),
    hint: '',
  };
}

const failure = (diagnosis, also = '') => {
  const error = new Error(`${diagnosis.message} ${diagnosis.hint}${also}`.trim());
  error.code = diagnosis.code;
  error.diagnosis = diagnosis;
  return error;
};

// What the stream says, piece by piece: text, the bill, and why it stopped.
function readEvent(data, into) {
  const candidate = data.candidates?.[0];
  for (const part of candidate?.content?.parts ?? []) {
    // A thought is the model's reasoning, not its answer; it is billed (usageMetadata), not shown.
    if (typeof part.text === 'string' && !part.thought) into.text += part.text;
  }
  if (candidate?.finishReason) into.finish = candidate.finishReason;
  if (data.promptFeedback?.blockReason) into.blocked = data.promptFeedback.blockReason;
  const usage = data.usageMetadata;
  if (usage) {
    into.inputTokens = usage.promptTokenCount ?? into.inputTokens;
    into.outputTokens = usage.candidatesTokenCount ?? into.outputTokens;
    into.reasoningTokens = usage.thoughtsTokenCount ?? into.reasoningTokens;
    into.cachedInputTokens = usage.cachedContentTokenCount ?? into.cachedInputTokens;
    into.totalTokens = usage.totalTokenCount ?? into.totalTokens;
  }
}

async function oneCall({ base, model, apiKey, prompt, json, signal, timeoutMs, fetchImpl, onProgress }) {
  const url = `${base}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const body = {
    systemInstruction: { parts: [{ text: REST_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: String(prompt ?? '') }] }],
    generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) },
  };
  const clock = AbortSignal.timeout(timeoutMs);
  const callSignal = signal ? AbortSignal.any([signal, clock]) : clock;
  const late = () => {
    const error = new Error(t('Gemini did not respond before the timeout ({seconds}s).', { seconds: Math.round(timeoutMs / 1000) }));
    error.code = 'TIMEOUT';
    return error;
  };
  // Every way the wire can fail, said as what happened: stopped by the person, out of time, offline.
  const wire = (error) => {
    if (signal?.aborted) return error;
    if (clock.aborted) return late();
    const offline = new Error(t('MADRE could not reach Google\'s Gemini API: {reason}. Check this computer\'s internet connection.', { reason: error?.cause?.code ?? error?.message ?? 'no answer' }));
    offline.code = 'NETWORK';
    return offline;
  };
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: callSignal,
    });
  } catch (error) {
    throw wire(error);
  }
  if (!response.ok) {
    let errorBody = {};
    try { errorBody = await response.json(); } catch {
      try { errorBody = { message: await response.text() }; } catch { /* nothing said */ }
    }
    return { trouble: diagnoseGeminiRestError(response.status, errorBody) };
  }

  const got = { text: '', finish: null, blocked: null, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedInputTokens: 0, totalTokens: 0 };
  const decoder = new TextDecoder();
  let buffer = '';
  let told = 0;
  const take = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const jsonText = trimmed.slice(5).trim();
    if (!jsonText || jsonText === '[DONE]') return;
    try { readEvent(JSON.parse(jsonText), got); } catch { /* a partial line */ }
    if (got.text.length > told) { told = got.text.length; onProgress?.({ chars: told }); }
  };
  try {
    if (response.body) {
      for await (const chunk of response.body) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(take);
      }
    }
  } catch (error) {
    throw wire(error);
  }
  take(buffer);
  return { got };
}

export async function invokeGeminiRest({
  prompt,
  model = null,
  signal = null,
  timeoutMs = 120000,
  key = undefined,
  env = process.env,
  keyResolver = resolveGeminiKey,
  fetchImpl = globalThis.fetch,
  onProgress = null,
  fallbackModel = env.PULSE_GEMINI_FALLBACK_MODEL ?? DEFAULT_GEMINI_FALLBACK_MODEL,
  json = false,
} = {}) {
  // `null` and `undefined` both mean «find it»: the room never hands a key in.
  const apiKey = key ?? await keyResolver(env);
  if (!apiKey) {
    const error = new Error(t('Gemini requires an API key. Set GEMINI_API_KEY or save it in Settings.'));
    error.code = 'AUTH';
    throw error;
  }
  const base = geminiApiBase(env).replace(/\/$/, '');
  // «auto» is the CLI's router; the API has no such model, so it means the default here.
  const asked = String(model || env.PULSE_GEMINI_MODEL || DEFAULT_GEMINI_REST_MODEL).replace(/^models\//, '');
  const first = asked === 'auto' ? DEFAULT_GEMINI_REST_MODEL : asked;
  const spare = fallbackModel && fallbackModel !== first ? fallbackModel : null;

  let current = first;
  let firstTrouble = null;
  for (;;) {
    let outcome;
    try {
      outcome = await oneCall({ base, model: current, apiKey, prompt, json, signal, timeoutMs, fetchImpl, onProgress });
    } catch (error) {
      // The spare hung or the wire broke after the first model's refusal: that refusal is still why.
      if (firstTrouble && !signal?.aborted) throw failure(firstTrouble, t(' (also tried {model})', { model: current }));
      throw error;
    }
    if (outcome.trouble) {
      if (firstTrouble) throw failure(firstTrouble, t(' (also tried {model})', { model: current }));
      if (spare && current !== spare && ['UNAVAILABLE', 'RATE_LIMITED', 'CREDITS_DEPLETED', 'MODEL_NOT_FOUND'].includes(outcome.trouble.code)) {
        firstTrouble = outcome.trouble;
        current = spare;
        continue;
      }
      throw failure(outcome.trouble);
    }
    const { got } = outcome;
    if (!got.text.trim() && (got.blocked || ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'].includes(got.finish))) {
      throw failure({ code: 'BLOCKED', message: t('Google\'s Gemini API refused to answer this message ({reason}).', { reason: got.blocked ?? got.finish }), hint: t('Rephrase it, or ask another agent.') });
    }
    const usage = withListPrice({
      inputTokens: got.inputTokens,
      outputTokens: got.outputTokens,
      cachedInputTokens: got.cachedInputTokens,
      // Gemini bills its thinking apart from the answer (prices.mjs, gemini-json: reasoningIn false).
      reasoningTokens: got.reasoningTokens,
      totalTokens: got.totalTokens || (got.inputTokens + got.outputTokens + got.reasoningTokens),
      source: 'gemini-json',
      model: current,
    }, current);
    return { text: got.text.trim(), usage, toolCalls: 0, model: current, ...(current !== first ? { fallbackFrom: first } : {}) };
  }
}
