// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { fileURLToPath } from 'node:url';

// How MADRE attaches the room's memory to a CLI as an MCP server, every turn:
// the agent can search what was said, read a stretch of the ledger exactly,
// list the distilled notes, see the latest exchanges and read AHP+'s state.
export const MEMORY_SERVER_PATH = fileURLToPath(new URL('./mcp/memory-server.mjs', import.meta.url));
export const MEMORY_SERVER_NAME = 'pulse-memory';
export const MEMORY_TOOLS = ['memory_search', 'memory_recall', 'memory_notes', 'memory_timeline', 'memory_note', 'project_state'];

// The same server, told who is calling: memory_note signs its notes with the
// agent and the turn, and a GHOST turn is refused any write.
// It embeds the agent's searches the way the room embeds its own, or not at all (2026-11-01,
// external review #20): `embedder` is the room's. Before, the server built its own from the Gemini
// key in the keychain, so «Memory › off» or «Ollama» in Settings still sent each search to Google,
// and an INCOGNITO search with them. Gemini only when the room uses Gemini; a room on Ollama or with
// no embedder searches by words here (the server has no Ollama of its own), and #0 always does.
export function memoryServerForTurn(server, { agent, messageId, mode = 1, embedder = null }) {
  if (!server) return null;
  const same = Number(mode) !== 0 && (embedder?.provider === 'gemini' || embedder?.provider === 'fake');
  const embed = same ? (embedder.provider === 'gemini' ? { PULSE_EMBED_PROVIDER: 'gemini' } : {}) : { PULSE_EMBED: '0' };
  return { ...server, env: { ...server.env, ...embed, PULSE_MEMORY_AGENT: agent, PULSE_MEMORY_MESSAGE: messageId, PULSE_MEMORY_MODE: String(mode) } };
}

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
