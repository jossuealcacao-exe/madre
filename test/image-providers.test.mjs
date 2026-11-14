// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Images draws with Gemini, OpenAI or Grok (2026-11-14): what the person already has is found
// without asking, what they do not is offered with a field for the key, and the image server draws
// with the model chosen. Nothing here reaches a provider: every request goes to a fake fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IMAGE_MODELS, IMAGE_PROVIDERS, defaultModel, drawImage, explainProviderError, findImageSources, pickImageModel, providerOf, providerTakesKey, resolveImageKey } from '../src/modules/image-providers.mjs';
import { generateImage, handleRequest, TOOL } from '../src/mcp/image-server.mjs';
import { imageStudioFor } from '../src/image-studio.mjs';
import { buildClaudeArgs } from '../src/adapters/claude.mjs';
import { leaseInstructions } from '../src/lease.mjs';
import { classify, DESTINATIONS } from '../src/outbound.mjs';
import { moduleById } from '../src/modules/index.mjs';
import { listExtensions } from '../src/extensions.mjs';
import { readSecret, writeSecret } from '../src/vault.mjs';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
const JPEG = Buffer.from('ffd8ffe000104a46', 'hex').toString('base64');
const answer = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const scratch = (name) => mkdtemp(join(tmpdir(), `madre-img-${name}-`));
const clean = (dir) => rm(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });

// A home with the files each CLI keeps its keys in, as those CLIs write them.
async function homeWith({ opencode = null, codex = null, gemini = null } = {}) {
  const home = await scratch('home');
  if (opencode) {
    await mkdir(join(home, '.local', 'share', 'opencode'), { recursive: true });
    await writeFile(join(home, '.local', 'share', 'opencode', 'auth.json'), JSON.stringify(opencode));
  }
  if (codex) {
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify(codex));
  }
  if (gemini) {
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', '.env'), `GEMINI_API_KEY=${gemini}\n`);
  }
  return home;
}

test('Images: three providers, each model knows whose it is, and the first found draws until one is chosen', () => {
  assert.deepEqual(IMAGE_PROVIDERS.map((one) => one.id), ['gemini', 'openai', 'xai']);
  // The names read from each provider's documentation on 2026-11-14; none of the retired ones.
  assert.ok(IMAGE_MODELS.includes('gemini-nano-banana-2.1') && IMAGE_MODELS.includes('gemini-3-pro-image'));
  assert.ok(IMAGE_MODELS.includes('gpt-image-2.6-flare') && IMAGE_MODELS.includes('gpt-image-2.5-sunburst'));
  assert.ok(IMAGE_MODELS.includes('grok-imagine-image-2.0') && IMAGE_MODELS.includes('grok-imagine-image'));
  assert.ok(!IMAGE_MODELS.includes('gpt-image-1') && !IMAGE_MODELS.some((model) => /dall-e|imagen-4/.test(model)), 'a model its provider shut down is offered');
  for (const provider of IMAGE_PROVIDERS) {
    assert.match(provider.keyUrl, /^https:\/\//, `${provider.id} says where its key is made`);
    for (const model of provider.models) assert.equal(providerOf(model.id), provider.id, model.id);
  }
  // A Gemini model an older config saved still goes to Google.
  assert.equal(providerOf('gemini-2.0-flash-preview-image-generation'), 'gemini');
  assert.equal(providerOf('something-else'), null);
  assert.equal(defaultModel('openai'), 'gpt-image-2.6-flare');

  assert.equal(pickImageModel(null, {}), null, 'nothing found, nothing to draw with');
  assert.deepEqual(pickImageModel(null, { openai: { from: 'codex' } }), { model: 'gpt-image-2.6-flare', provider: 'openai', auto: true });
  assert.deepEqual(pickImageModel(null, { gemini: { from: 'env' }, xai: { from: 'madre' } }), { model: 'gemini-2.5-flash-image', provider: 'gemini', auto: true });
  // A choice is kept even without its key: changing provider in silence would bill another account.
  assert.deepEqual(pickImageModel('grok-imagine-image', { gemini: { from: 'env' } }), { model: 'grok-imagine-image', provider: 'xai', auto: false });
});

test('Images: the keys a person already has are found where each CLI keeps them, and a screen is told only where', async () => {
  const state = await scratch('state');
  const home = await homeWith({ opencode: { xai: { type: 'api', key: 'xai-from-opencode-123456' }, google: { type: 'api', key: 'google-from-opencode-123' }, openai: { type: 'oauth', refresh: 'not-a-key' } }, codex: { OPENAI_API_KEY: 'sk-from-codex-123456789', tokens: null } });
  try {
    const env = { GEMINI_API_KEY: 'gemini-from-env-12345' };
    assert.deepEqual(await resolveImageKey('openai', { env, home, stateRoot: state }), { key: 'sk-from-codex-123456789', from: 'codex' }, 'an OpenCode sign-in that is not a key draws nothing');
    assert.deepEqual(await resolveImageKey('xai', { env, home, stateRoot: state }), { key: 'xai-from-opencode-123456', from: 'opencode' });
    assert.deepEqual(await resolveImageKey('gemini', { env, home, stateRoot: state }), { key: 'gemini-from-env-12345', from: 'env' });
    // What was pasted in Images wins: it was pasted for this.
    await writeSecret(state, 'image-studio', 'openai', 'sk-pasted-here-12345678');
    assert.deepEqual(await resolveImageKey('openai', { env: { OPENAI_API_KEY: 'sk-env-1234567890' }, home, stateRoot: state }), { key: 'sk-pasted-here-12345678', from: 'madre' });
    assert.deepEqual(await resolveImageKey('openai', { env: { OPENAI_API_KEY: 'sk-env-1234567890' }, home, stateRoot: null }), { key: 'sk-env-1234567890', from: 'env' });

    const sources = await findImageSources({ env, home, stateRoot: state });
    assert.deepEqual(sources, { gemini: { from: 'env' }, openai: { from: 'madre' }, xai: { from: 'opencode' } });
    assert.doesNotMatch(JSON.stringify(sources), /sk-|xai-from|gemini-from|google-from/, 'a key reached what a screen is told');

    // Nothing anywhere: nothing found, and no provider asked.
    const empty = await scratch('empty');
    try {
      assert.equal(await resolveImageKey('xai', { env: {}, home: empty, stateRoot: empty }), null);
      assert.equal(await resolveImageKey('openai', { env: {}, home: empty, stateRoot: empty }), null);
    } finally { await clean(empty); }
  } finally { await clean(home); await clean(state); }
});

test('Images: each provider is asked in its own shape, and its answer becomes the image', async () => {
  const seen = [];
  const fake = (body) => async (url, init) => { seen.push({ url, init, sent: JSON.parse(init.body) }); return answer(200, body); };

  const google = await drawImage({ model: 'gemini-3-pro-image', prompt: 'a logo', key: 'g-key', fetchImpl: fake({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG } }] } }] }) });
  assert.match(seen[0].url, /\/v1beta\/models\/gemini-3-pro-image:generateContent$/);
  assert.equal(seen[0].init.headers['x-goog-api-key'], 'g-key');
  assert.deepEqual(seen[0].sent.generationConfig, { responseModalities: ['IMAGE'] });
  assert.equal(google.mimeType, 'image/png');
  assert.equal(google.bytes.length, 8);

  const openai = await drawImage({ model: 'gpt-image-2.6-sunburst', prompt: 'a banner', key: 'sk-o', fetchImpl: fake({ data: [{ b64_json: PNG }], output_format: 'png' }) });
  assert.equal(seen[1].url, 'https://api.openai.com/v1/images/generations');
  assert.equal(seen[1].init.headers.authorization, 'Bearer sk-o');
  assert.deepEqual(seen[1].sent, { model: 'gpt-image-2.6-sunburst', prompt: 'a banner', n: 1 });
  assert.equal(openai.provider, 'openai');

  const grok = await drawImage({ model: 'grok-imagine-image-2.0', prompt: 'an illustration', key: 'xai-k', fetchImpl: fake({ data: [{ b64_json: JPEG, mime_type: 'image/jpeg' }] }) });
  assert.equal(seen[2].url, 'https://api.x.ai/v1/images/generations');
  assert.equal(seen[2].init.headers.authorization, 'Bearer xai-k');
  assert.equal(seen[2].sent.response_format, 'b64_json', 'without it xAI answers with an address to download, not the image');
  assert.equal(grok.mimeType, 'image/jpeg');
  // Every request carries a limit: an image that never comes back does not hold the turn forever.
  assert.ok(seen.every((one) => one.init.signal));

  // What went wrong, said so the person can act on it.
  assert.equal(explainProviderError('openai', 429, { error: { code: 'insufficient_quota', message: 'You exceeded your current quota' } }).code, 'CREDITS_DEPLETED');
  assert.match(explainProviderError('openai', 401, { error: { message: 'Incorrect API key' } }).message, /MODULES › Images/);
  assert.equal(explainProviderError('xai', 403, { error: 'Your team has no credits' }).code, 'CREDITS_DEPLETED');
  assert.equal(explainProviderError('xai', 429, {}).code, 'RATE_LIMITED');
  assert.equal(explainProviderError('gemini', 403, {}).code, 'AUTH');
  await assert.rejects(drawImage({ model: 'gpt-image-2.6-flare', prompt: 'p', key: 'k', fetchImpl: async () => answer(400, { error: { message: 'Your request was rejected by the safety system.' } }) }), /safety system/);
  await assert.rejects(drawImage({ model: 'grok-imagine-image', prompt: 'p', key: 'k', fetchImpl: async () => answer(200, { data: [] }) }), (error) => error.code === 'EMPTY');
});

test('Images: the server draws with the model chosen, the key it reads itself, and says which key is missing', async () => {
  const out = await scratch('out');
  const state = await scratch('state');
  const home = await homeWith();
  try {
    await writeSecret(state, 'image-studio', 'xai', 'xai-pasted-1234567890');
    const env = { PULSE_IMAGE_MODEL: 'grok-imagine-image', PULSE_IMAGE_STATE: state, PULSE_IMAGE_HOME: home };
    let asked = null;
    const made = await generateImage({ prompt: 'a mascot', fileName: 'mascot.png', outDir: out, env, fetchImpl: async (url, init) => { asked = { url, init }; return answer(200, { data: [{ b64_json: JPEG, mime_type: 'image/jpeg' }] }); } });
    assert.equal(asked.init.headers.authorization, 'Bearer xai-pasted-1234567890');
    assert.match(made.path, /mascot\.jpg$/, 'a JPEG is not saved as .png');
    assert.equal(made.model, 'grok-imagine-image');
    assert.equal((await readFile(made.path)).length, 8);

    // A model chosen whose provider has no key here: said, with where to connect one, and nothing asked.
    let called = false;
    await assert.rejects(
      generateImage({ prompt: 'p', fileName: 'x.png', outDir: out, env: { PULSE_IMAGE_MODEL: 'gpt-image-2.6-flare', PULSE_IMAGE_STATE: state, PULSE_IMAGE_HOME: home }, fetchImpl: async () => { called = true; return answer(500, {}); } }),
      (error) => error.code === 'NO_KEY' && /OpenAI/.test(error.message) && /MODULES › Images/.test(error.message),
    );
    assert.equal(called, false);

    // Through the tool, the agent reads the same sentence.
    const call = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'generate_image', arguments: { prompt: 'p', file_name: 'y.png' } } }, { outDir: out, env: { PULSE_IMAGE_MODEL: 'gpt-image-2.6-flare', PULSE_IMAGE_STATE: state, PULSE_IMAGE_HOME: home } });
    assert.equal(call.result.isError, true);
    assert.match(call.result.content[0].text, /NO_KEY/);
    assert.match(TOOL.description, /Gemini, OpenAI or Grok/);
  } finally { await clean(out); await clean(state); await clean(home); }
});

test('Images: no key travels in the server\'s environment, which Claude Code receives in its arguments', () => {
  const studio = imageStudioFor({ enabled: true, model: 'gpt-image-2.6-flare', outDir: '/p/.pulse/out/x', stateRoot: '/home/me/.pulse', home: '/home/me', env: { OPENAI_API_KEY: 'sk-secret-in-env-123', XAI_API_KEY: 'xai-secret-in-env-123' } });
  assert.deepEqual(studio.env, { PULSE_IMAGE_OUT_DIR: '/p/.pulse/out/x', PULSE_IMAGE_MODEL: 'gpt-image-2.6-flare', PULSE_IMAGE_STATE: '/home/me/.pulse', PULSE_IMAGE_HOME: '/home/me' });
  assert.equal(studio.vendor, 'OpenAI');
  const args = buildClaudeArgs({ prompt: 'q', lease: { outDir: '/p/.pulse/out/x', scopes: { imageGen: true } }, imageStudio: studio });
  assert.doesNotMatch(args.join(' '), /sk-secret|xai-secret/);
  // Nothing chosen: no model is passed, and the server draws with the first key it finds.
  assert.equal(imageStudioFor({ enabled: true, outDir: '/p', env: {} }).env.PULSE_IMAGE_MODEL, undefined);

  // The AI is told who draws, that it is billed to the person, and where a key is connected.
  const told = leaseInstructions({ outDir: '/p', agentId: 'claude', scopes: { write: true, imageGen: true }, imageStudio: studio, create: true });
  assert.match(told, /draws with OpenAI gpt-image-2\.6-flare, billed to the human's own key/);
  assert.match(told, /MODULES › Images/);
  assert.match(leaseInstructions({ outDir: '/p', agentId: 'claude', scopes: { write: true, imageGen: true }, imageStudio: imageStudioFor({ enabled: true, outDir: '/p', env: {} }) }), /with the first image key MADRE finds/);
});

test('Images: every address the image studio reaches is declared, and the log knows each one', () => {
  assert.equal(classify('https://api.openai.com/v1/images/generations').id, 'image-openai');
  assert.equal(classify('https://api.x.ai/v1/images/generations').id, 'image-xai');
  assert.equal(classify('https://api.openai.com/v1/models').id, 'image-key');
  assert.equal(classify('https://api.x.ai/v1/models').id, 'image-key-xai');
  assert.equal(classify('https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent').id, 'image');
  for (const id of ['image-openai', 'image-xai', 'image-key', 'image-key-xai']) {
    const one = DESTINATIONS.find((entry) => entry.id === id);
    assert.ok(one?.inside, `${id} is not in the log`);
    assert.match(one.where, /Modules › Images/);
  }
});

test('Images: the outbound log hears OpenAI from the server\'s own process, and never the key', async () => {
  const out = await scratch('log');
  try {
    const file = join(out, 'outbound.jsonl');
    await generateImage({ prompt: 'a poster', fileName: 'poster.png', outDir: out, env: { PULSE_IMAGE_MODEL: 'gpt-image-2.6-flare', OPENAI_API_KEY: 'sk-real-looking-key-123', PULSE_OUTBOUND_LOG: file, PULSE_IMAGE_HOME: out }, fetchImpl: async () => new Response(JSON.stringify({ data: [{ b64_json: PNG }] }), { status: 200 }) });
    let written = '';
    for (let tries = 0; tries < 40 && !written; tries += 1) {
      written = await readFile(file, 'utf8').catch(() => '');
      if (!written) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const line = JSON.parse(written.trim());
    assert.equal(line.id, 'image-openai');
    assert.equal(line.method, 'POST');
    assert.ok(!written.includes('sk-real-looking-key-123'));
  } finally { await clean(out); }
});

test('Images: a key pasted on its page is checked, kept only for MADRE, chosen, and forgotten on request', async () => {
  const root = await scratch('route');
  const studio = moduleById('image-studio');
  const route = (path) => studio.routes.find((one) => one.path === path).handler;
  const writes = [];
  const events = [];
  const told = [];
  let verified = [];
  let verdict = { ok: true };
  const ctx = () => ({
    stateRoot: root, config: { modules: { imageStudio: writes.at(-1)?.modules.imageStudio ?? {} } },
    updateConfig: async (patch) => { writes.push(patch); },
    record: async (type, payload) => { events.push({ type, payload }); },
    services: { verifyImageKey: async (provider, key) => { verified.push([provider, key]); return verdict; }, setImageModule: (state) => told.push(state), imageHome: '/home/me' },
  });
  const local = { socket: { remoteAddress: '127.0.0.1' } };
  const key = 'sk-proj-pasted-0123456789';
  try {
    // Never over the network, and never a Gemini key: that one goes where Gemini CLI reads it.
    assert.equal((await route('/api/image-studio/key')(ctx(), { request: { socket: { remoteAddress: '192.168.1.20' } }, payload: { provider: 'openai', key } })).status, 403);
    assert.equal((await route('/api/image-studio/key')(ctx(), { request: local, payload: { provider: 'openai', key }, viaPhone: true })).status, 403);
    assert.equal((await route('/api/image-studio/key')(ctx(), { request: local, payload: { provider: 'gemini', key } })).status, 400);
    assert.equal((await route('/api/image-studio/key')(ctx(), { request: local, payload: { provider: 'openai', key: 'short' } })).status, 400);
    assert.deepEqual(verified, [], 'a provider was asked about a key that was refused before');

    // A key the provider refuses is not kept.
    verdict = { ok: false, status: 401 };
    const refused = await route('/api/image-studio/key')(ctx(), { request: local, payload: { provider: 'openai', key } });
    assert.equal(refused.status, 422);
    assert.match(refused.body.error, /OpenAI did not accept this key \(HTTP 401\)/);
    assert.equal(await readSecret(root, 'image-studio', 'openai'), null);

    verdict = { ok: true };
    const kept = await route('/api/image-studio/key')(ctx(), { request: local, payload: { provider: 'openai', key: `  ${key}  ` } });
    assert.equal(kept.status, 200, JSON.stringify(kept.body));
    assert.equal(kept.body.model, 'gpt-image-2.6-flare', 'what was just connected is what draws');
    assert.deepEqual(verified.at(-1), ['openai', key]);
    assert.equal(await readSecret(root, 'image-studio', 'openai'), key);
    assert.equal((await stat(join(root, 'credentials', 'image-studio.json'))).mode & 0o777, 0o600);
    assert.equal(writes.at(-1).modules.imageStudio.model, 'gpt-image-2.6-flare');
    assert.equal(told.at(-1).model, 'gpt-image-2.6-flare', 'the running room was not told');
    assert.equal(told.at(-1).stateRoot, root);
    // The ledger knows a key was kept and how long it is, never the key.
    assert.deepEqual(events.at(-1), { type: 'module.secret.kept', payload: { module: 'image-studio', name: 'openai', bytes: key.length } });
    assert.doesNotMatch(JSON.stringify([events, writes, told, kept.body]), new RegExp(key));

    const gone = await route('/api/image-studio/key/forget')(ctx(), { request: local, payload: { provider: 'openai' } });
    assert.equal(gone.status, 200);
    assert.equal(await readSecret(root, 'image-studio', 'openai'), null);
    assert.equal(writes.at(-1).modules.imageStudio.model, null, 'a model whose key went is no longer the choice');
    assert.equal(events.at(-1).type, 'module.secret.forgotten');
  } finally { await clean(root); }
});

test('Images: its page is told every provider, whether its key is here and where, and never the key', async () => {
  const sources = { gemini: null, openai: { from: 'opencode' }, xai: null };
  const [studio] = (await listExtensions({ projectRoot: '/tmp', config: {}, services: { imageSources: async () => sources } })).filter((item) => item.id === 'image-studio');
  assert.equal(studio.preflight.ok, true);
  assert.equal(studio.drawing.provider, 'openai');
  assert.equal(studio.drawing.auto, true, 'nothing was chosen, so the key found first draws');
  assert.equal(studio.status.detail, 'on · gpt-image-2.6-flare');
  assert.deepEqual(studio.drawing.providers.map((one) => [one.id, one.ready, one.from]), [['gemini', false, null], ['openai', true, 'opencode'], ['xai', false, null]]);
  assert.deepEqual(studio.drawing.native, ['codex', 'grok']);
  assert.ok(studio.drawing.providers.every((one) => one.keyUrl && one.models.length && one.models.every((model) => model.hint)));

  // Chosen, without its key: said, and the page knows which one is missing.
  const chosen = (await listExtensions({ projectRoot: '/tmp', config: { modules: { imageStudio: { model: 'grok-imagine-image' } } }, services: { imageSources: async () => sources } })).find((item) => item.id === 'image-studio');
  assert.equal(chosen.status.detail, 'on · grok-imagine-image · no xAI key found');
  assert.equal(chosen.preflight.ok, false);
  assert.equal(chosen.drawing.auto, false);

  // Nothing anywhere.
  const none = (await listExtensions({ projectRoot: '/tmp', config: {}, services: { imageSources: async () => ({ gemini: null, openai: null, xai: null }) } })).find((item) => item.id === 'image-studio');
  assert.equal(none.status.detail, 'on · no image key found');
  assert.equal(none.drawing.model, null);
});

test('Images: the page draws «With what it draws» and «To connect» from the module, and pastes keys as MADRE does', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(app, /if \(item\.id === 'image-studio'\) imageSourcesBlock\(host, item\);/);
  assert.match(app, /item\.controls\?\.length && item\.id !== 'image-studio'/, 'the bare select of every model is drawn too');
  const block = app.slice(app.indexOf('function imageSourcesBlock'), app.indexOf('async function forgetImageKey'));
  assert.match(block, /input\.type = 'password'/);
  assert.match(block, /autocomplete = 'off'/);
  assert.match(block, /'\/api\/agents\/gemini\/key'/, 'a Gemini key does not go where Gemini CLI reads it');
  assert.match(block, /'\/api\/image-studio\/key'/);
  assert.match(block, /input\.value = '';/, 'the pasted key stays in the field');
  assert.doesNotMatch(block, /<svg|console\.log/);
});
