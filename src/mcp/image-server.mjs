#!/usr/bin/env node
// PULSE Image Studio: a tiny MCP server (stdio, JSON-RPC 2.0) that exposes one
// tool, generate_image, backed by the Gemini API image models and the user's
// own Gemini key. PULSE attaches it to the isolated homes of the CLIs that
// cannot generate images natively (Gemini CLI, Claude Code, OpenCode), only
// during a creation lease whose image scope is on. Files are written inside
// the lease directory given in PULSE_IMAGE_OUT_DIR, never anywhere else.
//
// Environment:
//   PULSE_IMAGE_OUT_DIR   required, absolute lease directory
//   PULSE_IMAGE_MODEL     default gemini-2.5-flash-image
//   GEMINI_API_KEY        optional; otherwise the macOS keychain entry the
//                         Gemini CLI stores (service gemini-cli-api-key)
//   PULSE_IMAGE_FAKE=1    write a 1×1 PNG without calling Google (tests)

import { execFile } from 'node:child_process';
import { mkdir, writeFile, realpath } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SERVER_NAME = 'pulse-image';
const SERVER_VERSION = '0.1.0';
const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const FAKE_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

export async function resolveGeminiKey(env = process.env) {
  if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;
  if (env.GOOGLE_API_KEY) return env.GOOGLE_API_KEY;
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execFileAsync('/usr/bin/security', ['find-generic-password', '-s', 'gemini-cli-api-key', '-w'], { timeout: 4000 });
    const raw = stdout.trim();
    try {
      const parsed = JSON.parse(raw);
      return parsed?.token?.accessToken ?? parsed?.token?.apiKey ?? parsed?.apiKey ?? null;
    } catch {
      return raw || null;
    }
  } catch {
    return null;
  }
}

export function safeImageName(name, fallback = 'image.png') {
  const cleaned = basename(String(name ?? fallback)).replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '') || fallback;
  return extname(cleaned) ? cleaned : `${cleaned}.png`;
}

// Google's error strings, turned into something a human can act on.
export function explainGoogleError(status, body) {
  const message = body?.error?.message ?? '';
  if (/prepayment credits are depleted|billing/i.test(message)) return { code: 'CREDITS_DEPLETED', message: 'Google reports the AI Studio project has no prepaid credits left. Top up at https://ai.studio/projects and try again.' };
  if (status === 429) return { code: 'RATE_LIMITED', message: 'Google is rate-limiting this key (HTTP 429). Wait a minute and retry.' };
  if (status === 401 || status === 403) return { code: 'AUTH', message: `Google rejected the Gemini key (HTTP ${status}). Check GEMINI_API_KEY or sign in again with the Gemini CLI.` };
  if (status === 404) return { code: 'MODEL', message: `Image model not available to this key (HTTP 404): ${message}` };
  return { code: 'ERROR', message: message || `Google returned HTTP ${status}.` };
}

export async function generateImage({ prompt, fileName, outDir, model = process.env.PULSE_IMAGE_MODEL || DEFAULT_MODEL, env = process.env, fetchImpl = fetch }) {
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
  const key = await resolveGeminiKey(env);
  if (!key) throw Object.assign(new Error('No Gemini API key: set GEMINI_API_KEY or sign in with the Gemini CLI (/auth → API key).'), { code: 'NO_KEY' });
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const explained = explainGoogleError(response.status, body);
    throw Object.assign(new Error(explained.message), { code: explained.code, status: response.status });
  }
  const part = body.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  if (!part) throw Object.assign(new Error('Google returned no image data.'), { code: 'EMPTY', detail: body.candidates?.[0]?.finishReason ?? null });
  const bytes = Buffer.from(part.inlineData.data, 'base64');
  const mimeType = part.inlineData.mimeType ?? 'image/png';
  const finalPath = /jpe?g/.test(mimeType) && !/\.jpe?g$/i.test(target) ? target.replace(/\.png$/i, '.jpg') : target;
  await writeFile(finalPath, bytes);
  return { path: finalPath, bytes: bytes.length, mimeType, model };
}

export const TOOL = {
  name: 'generate_image',
  description: 'Generate an image from a text prompt with a Gemini image model and save it as a PNG inside the current creation lease directory. Returns the saved path.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'What the image should show; be specific about style, colors and composition.' },
      file_name: { type: 'string', description: 'File name for the PNG, e.g. poster.png. Saved inside the lease directory.' },
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
