// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Native Google AI Studio Generative Language API adapter for Gemini.
// Direct HTTP/SSE connection via fetch(); zero global npm dependencies,
// instant execution, and reliable structured errors.

import { resolveGeminiKey } from '../mcp/image-server.mjs';
import { withListPrice } from '../prices.mjs';
import { t } from '../i18n.mjs';

export const DEFAULT_GEMINI_REST_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

// Diagnoses HTTP status codes and structured error bodies returned by Google Generative Language API.
export function diagnoseGeminiRestError(status, errorBody = {}) {
  const message = String(errorBody?.message ?? errorBody?.error?.message ?? '');
  const errorStatus = String(errorBody?.status ?? errorBody?.error?.status ?? '');

  if (/prepayment credits are depleted/i.test(message)) {
    return {
      code: 'CREDITS_DEPLETED',
      message: t('Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.'),
      hint: t('Add credits at https://ai.studio/projects, or switch the Gemini CLI to another key.'),
    };
  }

  if (status === 429 || errorStatus === 'RESOURCE_EXHAUSTED' || /quota exceeded|rate limit/i.test(message)) {
    return {
      code: 'RATE_LIMITED',
      message: t('Google is rate-limiting this Gemini key (HTTP 429).'),
      hint: t('Wait a minute, or pick an explicit model such as gemini-2.5-flash; check the key\'s quota at aistudio.google.com.'),
    };
  }

  if (status === 401 || status === 403 || errorStatus === 'PERMISSION_DENIED' || /API key not valid|unauthorized/i.test(message)) {
    return {
      code: 'AUTH',
      message: t('Google rejected the Gemini credentials.'),
      hint: t('Check GEMINI_API_KEY in your environment or ~/.gemini/.env.'),
    };
  }

  if (status === 404 || errorStatus === 'NOT_FOUND' || /model not found|models\//i.test(message)) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: t('Google reported that the requested Gemini model does not exist or is not available for this key.'),
      hint: t('Check the model name or use gemini-2.5-flash.'),
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
  const apiKey = key !== undefined ? key : await keyResolver(env);
  if (!apiKey) {
    const error = new Error(t('Gemini requires an API key. Set GEMINI_API_KEY or save it in Settings.'));
    error.code = 'AUTH';
    throw error;
  }

  let currentModel = model || env.PULSE_GEMINI_MODEL || DEFAULT_GEMINI_REST_MODEL;
  let switched = false;
  let firstTrouble = null;

  for (;;) {
    const cleanModel = String(currentModel).replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: String(prompt ?? '') }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const callSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);

    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: callSignal,
      });
    } catch (fetchError) {
      if (signal?.aborted) throw fetchError;
      if (callSignal.aborted && !signal?.aborted) {
        const error = new Error(t('Gemini did not respond before the timeout ({seconds}s).', { seconds: Math.round(timeoutMs / 1000) }));
        error.code = 'TIMEOUT';
        throw error;
      }
      throw fetchError;
    }

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {
        try {
          const rawText = await response.text();
          errorBody = { message: rawText };
        } catch { /* empty */ }
      }

      const diagnosis = diagnoseGeminiRestError(response.status, errorBody);

      if (switched && firstTrouble && !signal?.aborted) {
        const error = new Error(`${firstTrouble.message} ${firstTrouble.hint}${t(' (also tried {model})', { model: fallbackModel })}`);
        error.code = firstTrouble.code;
        error.diagnosis = firstTrouble;
        throw error;
      }

      if (diagnosis.code === 'AUTH') {
        const error = new Error(`${diagnosis.message} ${diagnosis.hint}`.trim());
        error.code = diagnosis.code;
        error.diagnosis = diagnosis;
        throw error;
      }

      if ((diagnosis.code === 'UNAVAILABLE' || diagnosis.code === 'RATE_LIMITED' || diagnosis.code === 'CREDITS_DEPLETED') && fallbackModel && !switched && cleanModel !== fallbackModel) {
        switched = true;
        firstTrouble = diagnosis;
        currentModel = fallbackModel;
        continue;
      }

      const error = new Error(`${diagnosis.message} ${diagnosis.hint}${switched ? t(' (also tried {model})', { model: fallbackModel }) : ''}`.trim());
      error.code = diagnosis.code;
      error.diagnosis = diagnosis;
      throw error;
    }

    // Process SSE stream
    let accumulatedText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedInputTokens = 0;
    let totalTokens = 0;

    const decoder = new TextDecoder();
    let buffer = '';

    if (response.body) {
      for await (const chunk of response.body) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const jsonText = line.slice(5).trim();
          if (!jsonText || jsonText === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonText);
            const parts = data.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
              for (const part of parts) {
                if (typeof part.text === 'string') {
                  accumulatedText += part.text;
                  onProgress?.({ chars: accumulatedText.length });
                }
              }
            }
            if (data.usageMetadata) {
              inputTokens = data.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens = data.usageMetadata.candidatesTokenCount ?? outputTokens;
              totalTokens = data.usageMetadata.totalTokenCount ?? totalTokens;
              cachedInputTokens = data.usageMetadata.cachedContentTokenCount ?? cachedInputTokens;
            }
          } catch {
            // Malformed partial chunk
          }
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      try {
        const data = JSON.parse(buffer.trim().slice(5).trim());
        const parts = data.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part.text === 'string') accumulatedText += part.text;
          }
        }
        if (data.usageMetadata) {
          inputTokens = data.usageMetadata.promptTokenCount ?? inputTokens;
          outputTokens = data.usageMetadata.candidatesTokenCount ?? outputTokens;
          totalTokens = data.usageMetadata.totalTokenCount ?? totalTokens;
          cachedInputTokens = data.usageMetadata.cachedContentTokenCount ?? cachedInputTokens;
        }
      } catch { /* empty */ }
    }

    totalTokens = totalTokens || (inputTokens + outputTokens);
    const rawUsage = {
      inputTokens,
      outputTokens,
      cachedInputTokens,
      reasoningTokens: 0,
      totalTokens,
      source: 'gemini-json',
      model: cleanModel,
    };
    const usage = withListPrice(rawUsage, cleanModel);

    return {
      text: accumulatedText.trim(),
      usage,
      toolCalls: 0,
    };
  }
}
