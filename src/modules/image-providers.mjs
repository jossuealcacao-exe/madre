// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Who draws for Images (2026-11-14): the providers whose image models MADRE's image tool can use,
// where the person's own key for each is found, and how one image is asked of each.
//
// The models were read from each provider's own documentation on 2026-11-14:
//   · Google   aistudio.google.com/docs/models and /docs/image-generation (the Nano Banana family;
//              gemini-2.5-flash-image is retired by Google on 2027-03-15). generateContent «remains
//              fully supported» (ai.google.dev/gemini-api/docs/migrate-to-interactions), and it is
//              what Images has always called.
//   · OpenAI   developers.openai.com/api/docs/models and /guides/image-generation: POST
//              /v1/images/generations, the image in data[0].b64_json. gpt-image-1 was shut down on
//              2026-10-23, so none of the first ones is offered.
//   · xAI      docs.x.ai/docs/models and the images reference: POST /v1/images/generations with
//              response_format b64_json, the image in data[0].b64_json and its type in mime_type.
// Ollama drew images for a while on the Mac only, and its own runner stopped (ollama/ollama#17893,
// still refused in 0.40.15, #19615): it is not offered until it draws again.
//
// A key is never handed to anyone here but the provider it belongs to. Where it was found is said
// (`from`), never what it is. Every place read is one a CLI of the person's own already keeps it
// in, or MADRE's vault, where a key pasted in MODULES › Images is kept (src/vault.mjs).

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readSecret } from '../vault.mjs';

const execFileAsync = promisify(execFile);
export const IMAGE_MODULE_ID = 'image-studio';

// What each one is, for a person choosing. `hint` is a few words on when to pick that model.
export const IMAGE_PROVIDERS = [
  {
    id: 'gemini', name: 'Gemini', vendor: 'Google', variable: 'GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    // The first is the one that draws until the person chooses: the one Images has always called through
    // generateContent. Google documents the newer ones only through its Interactions API (checked
    // 2026-11-14), so they are offered but not made the default until one draws here with a real key.
    models: [
      { id: 'gemini-2.5-flash-image', label: 'Nano Banana', hint: 'the one MADRE has always used; Google retires it on March 15, 2027' },
      { id: 'gemini-nano-banana-2.1', label: 'Nano Banana 2.1', hint: 'Google\'s newest everyday one' },
      { id: 'gemini-3.1-flash-lite-image', label: 'Nano Banana 2 Lite', hint: 'the fastest and cheapest' },
      { id: 'gemini-3-pro-image', label: 'Nano Banana Pro', hint: 'the most careful, and the most expensive' },
      { id: 'gemini-3.1-flash-image', label: 'Nano Banana 2', hint: 'the one before 2.1' },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', vendor: 'OpenAI', variable: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-image-2.6-flare', label: 'GPT Image 2.6 Flare', hint: 'fast, to try ideas' },
      { id: 'gpt-image-2.6-sunburst', label: 'GPT Image 2.6 Sunburst', hint: 'the most detailed' },
      { id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare', hint: 'the one before, fast' },
      { id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst', hint: 'the one before, detailed' },
    ],
  },
  {
    id: 'xai', name: 'Grok', vendor: 'xAI', variable: 'XAI_API_KEY',
    keyUrl: 'https://console.x.ai/team/default/api-keys',
    models: [
      { id: 'grok-imagine-image-2.0', label: 'Grok Imagine 2.0', hint: 'the newest' },
      { id: 'grok-imagine-image', label: 'Grok Imagine', hint: 'the cheapest' },
    ],
  },
];
export const IMAGE_MODELS = IMAGE_PROVIDERS.flatMap((provider) => provider.models.map((model) => model.id));
export const imageProvider = (id) => IMAGE_PROVIDERS.find((provider) => provider.id === id) ?? null;
// A model says whose it is by its name. A Gemini model this list no longer names (one saved in an
// older config) still goes to Google, which answers for it.
export function providerOf(model) {
  const name = String(model ?? '');
  if (/^gemini-/.test(name)) return 'gemini';
  if (/^gpt-image-/.test(name)) return 'openai';
  if (/^grok-/.test(name)) return 'xai';
  return null;
}
export const defaultModel = (providerId) => imageProvider(providerId)?.models[0]?.id ?? null;

// ---- Where a key is found.
//
// `home` is the person's home (where each CLI keeps its files); `stateRoot` is MADRE's own folder,
// whose vault holds a key pasted for Images. Each answer is { key, from }: `from` is what a screen
// may say, the key is what only the request to its own provider may carry.

const readIfThere = (path) => readFile(path, 'utf8').catch(() => null);
const parsed = (text) => { try { const value = JSON.parse(text ?? ''); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; } };

// The file Gemini CLI reads on every run, which is also where MADRE writes a Gemini key pasted in
// Settings › Your AIs. Left out once, MADRE saved a key in a place Images then refused to look.
export async function keyFromGeminiEnvFile(env, home = homedir()) {
  const text = await readIfThere(join(env.GEMINI_CLI_HOME ?? home, '.gemini', '.env'));
  if (!text) return null;
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2').trim();
    if (value) return value;
  }
  return null;
}

// The macOS keychain entry Gemini CLI's own sign-in leaves. It occasionally answers empty under
// concurrent reads; one retry.
async function keyFromGeminiKeychain() {
  if (process.platform !== 'darwin') return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { stdout } = await execFileAsync('/usr/bin/security', ['find-generic-password', '-s', 'gemini-cli-api-key', '-w'], { timeout: 4000 });
      const raw = stdout.trim();
      if (!raw) continue;
      const json = parsed(raw);
      return json ? (json.token?.accessToken ?? json.token?.apiKey ?? json.apiKey ?? null) : raw;
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

// A provider's key in OpenCode's own auth.json (src/credentials.mjs writes the same shape): only a
// key (`api`), never an account signed in with OpenCode's login.
async function keyFromOpenCode(provider, env, home) {
  const auth = parsed(await readIfThere(join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'opencode', 'auth.json')));
  const entry = auth?.[provider];
  return entry?.type === 'api' && typeof entry.key === 'string' && entry.key.trim() ? entry.key.trim() : null;
}

// The key Codex signed in with, when it signed in with one ($CODEX_HOME/auth.json, OPENAI_API_KEY;
// the field is empty when Codex signed in with a ChatGPT account, whose sign-in draws nothing here).
async function keyFromCodex(env, home) {
  const auth = parsed(await readIfThere(join(env.CODEX_HOME || join(home, '.codex'), 'auth.json')));
  const key = auth?.OPENAI_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

const fromVault = async (stateRoot, provider) => (stateRoot ? readSecret(stateRoot, IMAGE_MODULE_ID, provider) : null);
const found = (key, from) => (key ? { key, from } : null);

// Where each provider's key is looked for, in the order it is trusted: what was pasted in MODULES ›
// Images first (it was pasted for this), then what this process was given, then the CLIs' own files.
// Gemini keeps the order it has always had, and adds OpenCode's Google key last.
async function geminiOwnKey(env, home) {
  if (env.GEMINI_API_KEY) return found(env.GEMINI_API_KEY, 'env');
  if (env.GOOGLE_API_KEY) return found(env.GOOGLE_API_KEY, 'env');
  return found(await keyFromGeminiEnvFile(env, home), 'gemini-cli') ?? found(await keyFromGeminiKeychain(), 'keychain');
}
export async function resolveImageKey(providerId, { env = process.env, home = homedir(), stateRoot = null } = {}) {
  if (providerId === 'gemini') return (await geminiOwnKey(env, home)) ?? found(await keyFromOpenCode('google', env, home), 'opencode');
  if (providerId === 'openai') {
    return found(await fromVault(stateRoot, 'openai'), 'madre')
      ?? found(env.OPENAI_API_KEY, 'env')
      ?? found(await keyFromOpenCode('openai', env, home), 'opencode')
      ?? found(await keyFromCodex(env, home), 'codex');
  }
  if (providerId === 'xai') {
    return found(await fromVault(stateRoot, 'xai'), 'madre')
      ?? found(env.XAI_API_KEY, 'env')
      ?? found(await keyFromOpenCode('xai', env, home), 'opencode');
  }
  return null;
}

// Gemini's own key alone, as MADRE has always asked for it. Embeddings and Gemini's model list use
// it too, so OpenCode's Google key stays out of it: that one only ever draws.
export async function resolveGeminiKey(env = process.env) {
  return (await geminiOwnKey(env, homedir()))?.key ?? null;
}

// What a screen may know: for each provider, where its key was found, or null. Never a key.
export async function findImageSources(options = {}) {
  const out = {};
  for (const provider of IMAGE_PROVIDERS) {
    const hit = await resolveImageKey(provider.id, options).catch(() => null);
    out[provider.id] = hit ? { from: hit.from } : null;
  }
  return out;
}

// The model that draws: the one the person chose, or — until they choose — the first provider
// whose key MADRE finds, with that provider's first model. `auto` says which of the two it was.
export function pickImageModel(chosen, sources = {}) {
  if (chosen && providerOf(chosen)) return { model: chosen, provider: providerOf(chosen), auto: false };
  const first = IMAGE_PROVIDERS.find((provider) => sources[provider.id]);
  return first ? { model: defaultModel(first.id), provider: first.id, auto: true } : null;
}

// ---- One image, asked of its provider.

const errorOf = (code, message, status) => Object.assign(new Error(message), { code, status });

// Google's error strings, turned into something a human can act on.
export function explainGoogleError(status, body) {
  const message = body?.error?.message ?? '';
  if (/prepayment credits are depleted|billing/i.test(message)) return { code: 'CREDITS_DEPLETED', message: 'Google reports the AI Studio project has no prepaid credits left. Top up at https://ai.studio/projects and try again.' };
  if (status === 429) return { code: 'RATE_LIMITED', message: 'Google is rate-limiting this key (HTTP 429). Wait a minute and retry.' };
  if (status === 401 || status === 403) return { code: 'AUTH', message: `Google rejected the Gemini key (HTTP ${status}). Check GEMINI_API_KEY or sign in again with the Gemini CLI.` };
  if (status === 404) return { code: 'MODEL', message: `Image model not available to this key (HTTP 404): ${message}` };
  return { code: 'ERROR', message: message || `Google returned HTTP ${status}.` };
}

// OpenAI's and xAI's, which answer in the same shape.
export function explainProviderError(providerId, status, body) {
  if (providerId === 'gemini') return explainGoogleError(status, body);
  const vendor = imageProvider(providerId)?.vendor ?? providerId;
  const message = String(body?.error?.message ?? (typeof body?.error === 'string' ? body.error : '') ?? '');
  const code = String(body?.error?.code ?? body?.code ?? '');
  const topUp = providerId === 'openai' ? 'https://platform.openai.com/account/billing/overview' : 'https://console.x.ai';
  if (/insufficient_quota|billing|credit|balance|spending limit/i.test(`${code} ${message}`)) return { code: 'CREDITS_DEPLETED', message: `${vendor} reports the account has no credit left for images. Add credit at ${topUp} and try again.` };
  if (status === 429) return { code: 'RATE_LIMITED', message: `${vendor} is rate-limiting this key (HTTP 429). Wait a minute and retry.` };
  if (status === 401) return { code: 'AUTH', message: `${vendor} rejected the key (HTTP 401). Paste a new one in MODULES › Images.` };
  if (status === 403) return { code: 'AUTH', message: `${vendor} did not allow this image model for this key (HTTP 403)${message ? `: ${message}` : '.'}` };
  if (status === 404) return { code: 'MODEL', message: `Image model not available to this key (HTTP 404)${message ? `: ${message}` : '.'}` };
  return { code: 'ERROR', message: message || `${vendor} returned HTTP ${status}.` };
}

// Each provider's request and where its answer keeps the image.
const REQUESTS = {
  gemini: ({ model, prompt, key }) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    init: { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'] } }) },
    read: (body) => {
      const part = body.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
      return part ? { data: part.inlineData.data, mimeType: part.inlineData.mimeType ?? 'image/png' } : { empty: body.candidates?.[0]?.finishReason ?? null };
    },
  }),
  openai: ({ model, prompt, key }) => ({
    url: 'https://api.openai.com/v1/images/generations',
    init: { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, prompt, n: 1 }) },
    read: (body) => {
      const data = body.data?.[0]?.b64_json;
      const format = String(body.output_format ?? 'png').toLowerCase();
      return data ? { data, mimeType: format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png' } : { empty: null };
    },
  }),
  xai: ({ model, prompt, key }) => ({
    url: 'https://api.x.ai/v1/images/generations',
    init: { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, prompt, n: 1, response_format: 'b64_json' }) },
    read: (body) => {
      const one = body.data?.[0];
      return one?.b64_json ? { data: one.b64_json, mimeType: one.mime_type ?? 'image/jpeg' } : { empty: null };
    },
  }),
};

// Draws one image with a model and a key, and hands back its bytes. Nothing is written here.
export async function drawImage({ model, prompt, key, fetchImpl = fetch, timeoutMs = 180000 }) {
  const providerId = providerOf(model);
  if (!providerId) throw errorOf('MODEL', `MADRE does not know which provider draws ${model}.`);
  const { url, init, read } = REQUESTS[providerId]({ model, prompt, key });
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const explained = explainProviderError(providerId, response.status, body);
    throw errorOf(explained.code, explained.message, response.status);
  }
  const image = read(body ?? {});
  if (!image.data) throw Object.assign(errorOf('EMPTY', `${imageProvider(providerId).vendor} returned no image data.`), { detail: image.empty ?? null });
  return { bytes: Buffer.from(image.data, 'base64'), mimeType: image.mimeType, provider: providerId };
}

// Whether OpenAI or xAI takes a key pasted in MODULES › Images: listing the models spends nothing.
// `ok: null` when the provider said nothing about the key (offline, its own trouble): that is not
// the key's fault, and the key is kept.
// The address can be moved (PULSE_OPENAI_API_URL, PULSE_XAI_API_URL) so the test suite never asks.
const MODEL_LISTS = {
  openai: () => `${(process.env.PULSE_OPENAI_API_URL ?? 'https://api.openai.com').replace(/\/$/, '')}/v1/models`,
  xai: () => `${(process.env.PULSE_XAI_API_URL ?? 'https://api.x.ai').replace(/\/$/, '')}/v1/models`,
};
export async function providerTakesKey(providerId, key, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const url = MODEL_LISTS[providerId]?.();
  if (!url) return { ok: null, status: null };
  try {
    const answer = await fetchImpl(url, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(timeoutMs) });
    if (answer.ok) return { ok: true };
    return { ok: answer.status === 401 || answer.status === 403 ? false : null, status: answer.status };
  } catch {
    return { ok: null, status: null };
  }
}
