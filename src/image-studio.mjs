import { fileURLToPath } from 'node:url';
import { resolveGeminiKey } from './mcp/image-server.mjs';

// How MADRE attaches its image MCP server to a CLI during a lease.
export const IMAGE_SERVER_PATH = fileURLToPath(new URL('./mcp/image-server.mjs', import.meta.url));
export const IMAGE_SERVER_NAME = 'pulse-image';
export const IMAGE_TOOL = 'generate_image';

export function imageStudioFor({ enabled, model, outDir, env = process.env }) {
  if (!enabled || !outDir) return null;
  return {
    name: IMAGE_SERVER_NAME,
    tool: IMAGE_TOOL,
    command: process.execPath,
    args: [IMAGE_SERVER_PATH],
    env: {
      PULSE_IMAGE_OUT_DIR: outDir,
      PULSE_IMAGE_MODEL: model ?? 'gemini-2.5-flash-image',
      ...(env.GEMINI_API_KEY ? { GEMINI_API_KEY: env.GEMINI_API_KEY } : {}),
      ...(env.PULSE_IMAGE_FAKE ? { PULSE_IMAGE_FAKE: env.PULSE_IMAGE_FAKE } : {}),
    },
  };
}

export { resolveGeminiKey };
