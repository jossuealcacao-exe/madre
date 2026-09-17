import { fileURLToPath } from 'node:url';

// How MADRE attaches the room's memory to a CLI as an MCP server, every turn:
// the agent can search what was said, read a stretch of the ledger exactly,
// list the distilled notes, see the latest exchanges and read AHP+'s state.
export const MEMORY_SERVER_PATH = fileURLToPath(new URL('./mcp/memory-server.mjs', import.meta.url));
export const MEMORY_SERVER_NAME = 'pulse-memory';
export const MEMORY_TOOLS = ['memory_search', 'memory_recall', 'memory_notes', 'memory_timeline', 'project_state'];

export function memoryServerFor({ dbFile, projectRoot, env = process.env }) {
  if (!dbFile || env.PULSE_MEMORY_TOOLS === '0') return null;
  return {
    name: MEMORY_SERVER_NAME,
    tools: MEMORY_TOOLS,
    command: process.execPath,
    args: [MEMORY_SERVER_PATH],
    env: {
      PULSE_MEMORY_DB: dbFile,
      PULSE_PROJECT_ROOT: projectRoot,
      ...(env.GEMINI_API_KEY ? { GEMINI_API_KEY: env.GEMINI_API_KEY } : {}),
      ...(env.PULSE_EMBED ? { PULSE_EMBED: env.PULSE_EMBED } : {}),
      ...(env.PULSE_EMBED_FAKE ? { PULSE_EMBED_FAKE: env.PULSE_EMBED_FAKE } : {}),
      ...(env.PULSE_EMBED_MODEL ? { PULSE_EMBED_MODEL: env.PULSE_EMBED_MODEL } : {}),
      ...(env.PULSE_EMBED_DIMS ? { PULSE_EMBED_DIMS: env.PULSE_EMBED_DIMS } : {}),
    },
  };
}
