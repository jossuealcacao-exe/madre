// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { fileURLToPath } from 'node:url';
import { resolveGeminiKey } from './mcp/image-server.mjs';
import { imageProvider, providerOf } from './modules/image-providers.mjs';

// How MADRE attaches its image MCP server to a CLI during a lease.
export const IMAGE_SERVER_PATH = fileURLToPath(new URL('./mcp/image-server.mjs', import.meta.url));
export const IMAGE_SERVER_NAME = 'pulse-image';
export const IMAGE_TOOL = 'generate_image';

// `model` is the one chosen in MODULES › Images, or none: then the server draws with the first
// provider whose key it finds. `stateRoot` and `home` say where to look for the key — paths, never
// a key: Claude Code receives this whole object in its arguments (see src/mcp/image-server.mjs).
export function imageStudioFor({ enabled, model = null, outDir, stateRoot = null, home = null, env = process.env }) {
  if (!enabled || !outDir) return null;
  const provider = model ? imageProvider(providerOf(model)) : null;
  return {
    name: IMAGE_SERVER_NAME,
    tool: IMAGE_TOOL,
    command: process.execPath,
    args: [IMAGE_SERVER_PATH],
    // What the prompt may say about who draws (src/lease.mjs).
    model: model ?? null,
    vendor: provider?.vendor ?? null,
    env: {
      PULSE_IMAGE_OUT_DIR: outDir,
      ...(model ? { PULSE_IMAGE_MODEL: model } : {}),
      ...(stateRoot ? { PULSE_IMAGE_STATE: stateRoot } : {}),
      ...(home ? { PULSE_IMAGE_HOME: home } : {}),
      ...(env.GEMINI_API_KEY ? { GEMINI_API_KEY: env.GEMINI_API_KEY } : {}),
      ...(env.PULSE_IMAGE_FAKE ? { PULSE_IMAGE_FAKE: env.PULSE_IMAGE_FAKE } : {}),
      // So the one request that carries a prompt to the image provider lands in the same log as the rest.
      ...(env.PULSE_OUTBOUND_LOG ? { PULSE_OUTBOUND_LOG: env.PULSE_OUTBOUND_LOG } : {}),
    },
  };
}

export { resolveGeminiKey };
