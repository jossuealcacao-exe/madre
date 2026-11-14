#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE Image Studio: a tiny MCP server (stdio, JSON-RPC 2.0) that exposes one
// tool, generate_image, backed by the image model chosen in MODULES › Images —
// Google's Gemini, OpenAI's GPT Image or xAI's Grok Imagine — and the person's
// own key for it (src/modules/image-providers.mjs). MADRE attaches it to the
// isolated homes of the CLIs that cannot generate images natively (Gemini CLI,
// Claude Code, OpenCode), only during a creation lease whose image scope is on.
// Files are written inside the lease directory given in PULSE_IMAGE_OUT_DIR,
// never anywhere else.
//
// Environment:
//   PULSE_IMAGE_OUT_DIR   required, absolute lease directory
//   PULSE_IMAGE_MODEL     the model chosen; without one, the first provider whose key is found
//   PULSE_IMAGE_HOME      the person's home, where each CLI keeps its key (default: this HOME)
//   PULSE_IMAGE_STATE     MADRE's own folder, whose vault keeps a key pasted in MODULES › Images
//   GEMINI_API_KEY        optional; otherwise ~/.gemini/.env, then the macOS keychain entry the
//                         Gemini CLI stores (service gemini-cli-api-key)
//   PULSE_IMAGE_FAKE=1    write a 1×1 PNG without calling any provider (tests)
//
// No key travels in this server's environment but the Gemini one it always took: Claude Code is
// handed its MCP servers in its arguments, where `ps` shows them. The server reads the key itself,
// from the same places MODULES › Images says it found it, at the moment it draws.

import { mkdir, writeFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, extname, resolve, sep } from 'node:path';
import { OutboundLog } from '../outbound.mjs';
import { IMAGE_PROVIDERS, defaultModel, drawImage, imageProvider, providerOf, resolveImageKey } from '../modules/image-providers.mjs';

export { explainGoogleError, keyFromGeminiEnvFile, resolveGeminiKey } from '../modules/image-providers.mjs';

const SERVER_NAME = 'pulse-image';
const SERVER_VERSION = '0.2.0';
const FAKE_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

export function safeImageName(name, fallback = 'image.png') {
  const cleaned = basename(String(name ?? fallback)).replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '') || fallback;
  return extname(cleaned) ? cleaned : `${cleaned}.png`;
}

// The image studio runs in a process of its own, so it writes its own line into the room's
// outbound log. Without this, the one request MADRE makes that carries somebody's words to an
// image provider would be the one request the log could not see.
let outboundLog = null;
function outboundFetch(fetchImpl, file) {
  if (!file) return fetchImpl;
  outboundLog ??= new OutboundLog({ file });
  return outboundLog.watch(fetchImpl);
}

// Which model draws and with which key: the one chosen, or — until one is chosen — the first
// provider whose key is found, with its first model (the same choice MODULES › Images shows).
async function keyedModel(model, lookup) {
  if (model) {
    const providerId = providerOf(model);
    if (!providerId) throw Object.assign(new Error(`MADRE does not know which provider draws ${model}. Choose another model in MODULES › Images.`), { code: 'MODEL' });
    return { model, providerId, key: (await resolveImageKey(providerId, lookup))?.key ?? null };
  }
  for (const provider of IMAGE_PROVIDERS) {
    const hit = await resolveImageKey(provider.id, lookup).catch(() => null);
    if (hit) return { model: defaultModel(provider.id), providerId: provider.id, key: hit.key };
  }
  return { model: null, providerId: null, key: null };
}

// The name the file keeps follows what came back: a JPEG is not saved as .png.
function namedFor(target, mimeType) {
  if (/jpe?g/.test(mimeType) && !/\.jpe?g$/i.test(target)) return target.replace(/\.(png|webp)$/i, '.jpg');
  if (/webp/.test(mimeType) && !/\.webp$/i.test(target)) return target.replace(/\.png$/i, '.webp');
  return target;
}

export async function generateImage({ prompt, fileName, outDir, model = null, env = process.env, fetchImpl = fetch }) {
  if (!prompt || typeof prompt !== 'string') throw Object.assign(new Error('A text prompt is required.'), { code: 'INVALID' });
  const root = await realpath(outDir).catch(() => null);
  if (!root) throw Object.assign(new Error('The lease directory does not exist.'), { code: 'NO_LEASE' });
  const target = resolve(root, safeImageName(fileName));
  if (!target.startsWith(root + sep)) throw Object.assign(new Error('The file must stay inside the lease directory.'), { code: 'INVALID' });
  await mkdir(root, { recursive: true });

  if (env.PULSE_IMAGE_FAKE === '1') {
    await writeFile(target, FAKE_PNG);
    return { path: target, bytes: FAKE_PNG.length, mimeType: 'image/png', model: 'fake' };
  }
  const lookup = { env, home: env.PULSE_IMAGE_HOME || homedir(), stateRoot: env.PULSE_IMAGE_STATE || null };
  const chosen = await keyedModel(model ?? env.PULSE_IMAGE_MODEL ?? null, lookup);
  if (!chosen.key) {
    const provider = imageProvider(chosen.providerId);
    const message = provider
      ? `No ${provider.vendor} key for ${chosen.model}: the human connects one in MODULES › Images (or sets ${provider.variable}).`
      : 'No image key yet: the human connects Gemini, OpenAI or Grok in MODULES › Images. Each image is billed to that key.';
    throw Object.assign(new Error(message), { code: 'NO_KEY' });
  }
  const { bytes, mimeType } = await drawImage({ model: chosen.model, prompt, key: chosen.key, fetchImpl: outboundFetch(fetchImpl, env.PULSE_OUTBOUND_LOG) });
  const finalPath = namedFor(target, mimeType);
  await writeFile(finalPath, bytes);
  return { path: finalPath, bytes: bytes.length, mimeType, model: chosen.model };
}

export const TOOL = {
  name: 'generate_image',
  description: 'Generate an image from a text prompt with the image model the human chose in MADRE (Gemini, OpenAI or Grok, on their own key) and save it inside the current creation lease directory. Returns the saved path.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'What the image should show; be specific about style, colors and composition.' },
      file_name: { type: 'string', description: 'File name for the image, e.g. poster.png. Saved inside the lease directory; a JPEG answer is saved as .jpg.' },
    },
    required: ['prompt', 'file_name'],
  },
};

// Minimal JSON-RPC 2.0 over stdio: newline-delimited messages (MCP stdio).
export function handleRequest(message, { outDir, env = process.env, generate = generateImage } = {}) {
  const reply = (result) => ({ jsonrpc: '2.0', id: message.id, result });
  const fail = (code, text) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  switch (message.method) {
    case 'initialize':
      return Promise.resolve(reply({ protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }));
    case 'notifications/initialized':
    case 'initialized':
      return Promise.resolve(null);
    case 'ping':
      return Promise.resolve(reply({}));
    case 'tools/list':
      return Promise.resolve(reply({ tools: [TOOL] }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (name !== TOOL.name) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      return generate({ prompt: args.prompt, fileName: args.file_name, outDir, env })
        .then((result) => reply({ content: [{ type: 'text', text: `Saved ${result.path} (${result.bytes} bytes, ${result.mimeType}, model ${result.model}).` }], isError: false }))
        .catch((error) => reply({ content: [{ type: 'text', text: `Image generation failed (${error.code ?? 'ERROR'}): ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, outDir = process.env.PULSE_IMAGE_OUT_DIR, env = process.env } = {}) {
  let buffer = '';
  let pending = 0;
  let ended = false;
  const finish = () => { if (ended && pending === 0) process.exit(0); };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`); continue; }
      pending += 1;
      void handleRequest(message, { outDir, env })
        .then((response) => { if (response) output.write(`${JSON.stringify(response)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  // stdin closing means the client is gone; answer what is in flight, then leave.
  input.on('end', () => { ended = true; finish(); });
}

const invokedDirectly = process.argv[1] && (await realpath(process.argv[1]).catch(() => process.argv[1])) === (await realpath(new URL(import.meta.url).pathname).catch(() => null));
if (invokedDirectly) {
  if (!process.env.PULSE_IMAGE_OUT_DIR) {
    process.stderr.write('PULSE_IMAGE_OUT_DIR is required.\n');
    process.exit(2);
  }
  serve();
}
