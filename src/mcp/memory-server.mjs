#!/usr/bin/env node
// MADRE memory: a tiny MCP server (stdio, JSON-RPC 2.0) that lets the agent in
// a turn consult the room's memory itself: everything said outside GHOST,
// the distilled notes, exact stretches of the ledger, and AHP+'s project
// state. Read-only over the SQLite file MADRE keeps next to the ledger.
//
// Environment:
//   PULSE_MEMORY_DB       required, the room's memory.sqlite
//   PULSE_PROJECT_ROOT    the project, for project_state (AHP+ in .ahp/)
//   GEMINI_API_KEY        optional; otherwise the macOS keychain entry of the
//                         Gemini CLI. Without a key search is lexical only.

import { readFile, readdir, stat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { RoomMemory, formatRecall, formatMemories, MEMORY_KINDS } from '../memory.mjs';
import { createEmbedder } from '../embeddings.mjs';
import { resolveGeminiKey } from './image-server.mjs';

const SERVER_NAME = 'pulse-memory';
const SERVER_VERSION = '0.1.0';

export const TOOLS = [
  {
    name: 'memory_search',
    description: 'Search the room\'s durable memory: everything said in this project room outside GHOST (all agents and the human) plus the distilled notes (decisions, facts, preferences, open questions). Matches meaning as well as words. Use it before saying something was never discussed. Returns exact quotes stamped with their ledger sequence.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What you are looking for, in any language.' },
      limit: { type: 'integer', description: 'Max quotes (1-12, default 6).' },
      scope: { type: 'string', enum: ['all', 'quotes', 'notes'], description: 'Search quotes, notes or both (default all).' },
    }, required: ['query'] },
  },
  {
    name: 'memory_recall',
    description: 'Read the exact text of a stretch of the room ledger by sequence numbers (as shown in [#n] stamps), e.g. to see the full message behind a quote or what was said right around it.',
    inputSchema: { type: 'object', properties: {
      from: { type: 'integer', description: 'First sequence to read.' },
      through: { type: 'integer', description: 'Last sequence to read (default: from + 20).' },
    }, required: ['from'] },
  },
  {
    name: 'memory_notes',
    description: 'List the distilled notes of this room: decisions, verified facts, the human\'s preferences and open questions, newest first, each citing its source sequences.',
    inputSchema: { type: 'object', properties: {
      kind: { type: 'string', enum: MEMORY_KINDS, description: 'Only this kind.' },
      limit: { type: 'integer', description: 'Max notes (default 20).' },
    } },
  },
  {
    name: 'memory_timeline',
    description: 'The latest exchanges of the room in order, one line each, newest first: who said what to whom, with sequence numbers.',
    inputSchema: { type: 'object', properties: {
      since: { type: 'integer', description: 'Only entries after this sequence.' },
      limit: { type: 'integer', description: 'Max lines (default 30).' },
    } },
  },
  {
    name: 'memory_note',
    description: 'Save one durable memory of this room, ONLY when the human explicitly asks you to remember, note or save something (memories are otherwise distilled automatically; never save on your own initiative). One self-contained sentence, at most 240 characters, in the language the room uses, with the ledger sequences it comes from when you know them. Refused in a GHOST turn.',
    inputSchema: { type: 'object', properties: {
      kind: { type: 'string', enum: MEMORY_KINDS, description: 'decision, fact, preference or question.' },
      text: { type: 'string', description: 'The memory, one sentence, names and numbers exact.' },
      sources: { type: 'array', items: { type: 'integer' }, description: 'Ledger sequences it comes from, if known.' },
    }, required: ['kind', 'text'] },
  },
  {
    name: 'project_state',
    description: 'The verified project state kept by AHP+ in .ahp/ (manifest and the latest handoff), if the project uses it.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function clamp(n, min, max, fallback) { const value = Number(n); return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : fallback; }

export async function openMemory({ dbFile = process.env.PULSE_MEMORY_DB, env = process.env, keyResolver = resolveGeminiKey } = {}) {
  if (!dbFile) throw new Error('PULSE_MEMORY_DB is required.');
  const memory = await new RoomMemory(dbFile).initialize();
  let embedder = null;
  if (env.PULSE_EMBED !== '0') {
    const key = env.PULSE_EMBED_FAKE === '1' ? null : await keyResolver(env).catch(() => null);
    embedder = createEmbedder({ key, env });
  }
  memory.attachEmbedder(embedder);
  return memory;
}

async function projectState(projectRoot) {
  if (!projectRoot) return 'No project root was given.';
  const ahp = join(projectRoot, '.ahp');
  const manifest = await readFile(join(ahp, 'manifest.json'), 'utf8').catch(() => null);
  if (manifest === null) return 'This project does not use AHP+ (no .ahp/manifest.json). The room memory tools are the durable record here.';
  const parts = [`AHP+ manifest (.ahp/manifest.json):\n${manifest.slice(0, 4000)}`];
  for (const dir of ['handoffs', 'sessions']) {
    const folder = join(ahp, dir);
    const names = await readdir(folder).catch(() => []);
    if (!names.length) continue;
    const dated = await Promise.all(names.map(async (name) => ({ name, mtime: (await stat(join(folder, name)).catch(() => null))?.mtimeMs ?? 0 })));
    const latest = dated.sort((a, b) => b.mtime - a.mtime)[0];
    const text = await readFile(join(folder, latest.name), 'utf8').catch(() => null);
    if (text) parts.push(`Latest in .ahp/${dir}/ (${latest.name}):\n${text.slice(0, 4000)}${text.length > 4000 ? '\n…' : ''}`);
  }
  return parts.join('\n\n');
}

export async function callTool(name, args = {}, { memory, projectRoot = process.env.PULSE_PROJECT_ROOT, agent = process.env.PULSE_MEMORY_AGENT ?? 'agent', mode = process.env.PULSE_MEMORY_MODE ?? '1', messageId = process.env.PULSE_MEMORY_MESSAGE ?? null }) {
  switch (name) {
    case 'memory_note': {
      if (String(mode) === '0') return 'This exchange is off the record (GHOST): nothing can be saved to the room memory.';
      const text = String(args.text ?? '').replace(/\s+/g, ' ').trim();
      if (!text) return 'Give me the memory as one sentence.';
      if (text.length > 240) return `Too long (${text.length} characters): one sentence of at most 240.`;
      const kind = MEMORY_KINDS.includes(args.kind) ? args.kind : 'fact';
      const sources = (Array.isArray(args.sources) ? args.sources : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      const last = memory.lastSequence();
      const before = memory.maxMemoryId();
      const added = memory.addMemories([{ kind, text, sources }], { agent, fromSequence: sources.length ? Math.min(...sources) : last, throughSequence: sources.length ? Math.max(...sources) : last, origin: 'noted', messageId });
      if (!added) return `Already remembered: "${text}"`;
      const [saved] = memory.notesSince(before, { agent });
      return `Saved memory #${saved?.id ?? '?'} (${kind}) for every future turn of this room: "${text}"`;
    }
    case 'memory_search': {
      const query = String(args.query ?? '').trim();
      if (!query) return 'Give me a query.';
      const limit = clamp(args.limit, 1, 12, 6);
      const scope = ['all', 'quotes', 'notes'].includes(args.scope) ? args.scope : 'all';
      const queryVector = await memory.embedQuery(query);
      const parts = [];
      if (scope !== 'quotes') {
        const notes = memory.recallMemories(query, { limit, maxChars: 2400, queryVector });
        if (notes.length) parts.push(`Distilled notes:\n${formatMemories(notes)}`);
      }
      if (scope !== 'notes') {
        const recall = memory.recall(query, { limit, maxChars: 6000, excerptChars: 480, queryVector });
        if (recall.entries.length) parts.push(`Quotes (${queryVector ? 'meaning and words' : 'words'}; use memory_recall with a sequence to read more):\n${formatRecall(recall)}`);
      }
      return parts.length ? parts.join('\n\n') : `Nothing in the room memory matches "${query}". The room holds ${memory.count()} exchanges and ${memory.memoryCount()} notes.`;
    }
    case 'memory_recall': {
      const from = clamp(args.from, 1, Number.MAX_SAFE_INTEGER, null);
      if (from === null) return 'Give me a starting sequence.';
      const through = clamp(args.through, from, from + 200, from + 20);
      const { entries, truncated } = memory.range({ from, through });
      if (!entries.length) return `No exchanges between #${from} and #${through}.`;
      const lines = entries.map((entry) => `[#${entry.sequence} · ${(entry.timestamp ?? '').slice(0, 16).replace('T', ' ')} · ${entry.role === 'command' ? entry.sender : `@${entry.sender}`} (${entry.role})${entry.target && entry.target !== 'room' ? ` → ${entry.target === 'you' ? 'human' : `@${entry.target}`}` : ''}]\n${entry.text}`);
      return `${lines.join('\n\n')}${truncated ? '\n\n[truncated; ask for a narrower range]' : ''}`;
    }
    case 'memory_notes': {
      const notes = memory.memories({ limit: clamp(args.limit, 1, 100, 20), kind: MEMORY_KINDS.includes(args.kind) ? args.kind : null });
      return notes.length ? formatMemories(notes) : 'No distilled notes yet.';
    }
    case 'memory_timeline': {
      const rows = memory.timeline({ since: clamp(args.since, 0, Number.MAX_SAFE_INTEGER, 0), limit: clamp(args.limit, 1, 100, 30) });
      return rows.length
        ? rows.map((row) => `#${row.sequence} · ${(row.timestamp ?? '').slice(0, 16).replace('T', ' ')} · ${row.role === 'command' ? row.sender : `@${row.sender}`}${row.target && row.target !== 'room' ? ` → ${row.target === 'you' ? 'human' : `@${row.target}`}` : ''}: ${row.text.replace(/\s+/g, ' ')}`).join('\n')
        : 'The room has no exchanges yet.';
    }
    case 'project_state':
      return projectState(projectRoot);
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  }
}

export function handleRequest(message, context) {
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
      return Promise.resolve(reply({ tools: TOOLS }));
    case 'tools/call': {
      const { name, arguments: args = {} } = message.params ?? {};
      if (!TOOLS.some((tool) => tool.name === name)) return Promise.resolve(fail(-32602, `Unknown tool: ${name}`));
      return callTool(name, args, context)
        .then((text) => reply({ content: [{ type: 'text', text }], isError: false }))
        .catch((error) => reply({ content: [{ type: 'text', text: `Memory tool failed: ${error.message}` }], isError: true }));
    }
    default:
      return Promise.resolve(message.id === undefined ? null : fail(-32601, `Method not found: ${message.method}`));
  }
}

export function serve({ input = process.stdin, output = process.stdout, context }) {
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
      void handleRequest(message, context)
        .then((response) => { if (response) output.write(`${JSON.stringify(response)}\n`); })
        .finally(() => { pending -= 1; finish(); });
    }
  });
  input.on('end', () => { ended = true; finish(); });
}

const invokedDirectly = process.argv[1] && (await realpath(process.argv[1]).catch(() => process.argv[1])) === (await realpath(new URL(import.meta.url).pathname).catch(() => null));
if (invokedDirectly) {
  try {
    const memory = await openMemory();
    serve({ context: { memory, projectRoot: process.env.PULSE_PROJECT_ROOT, agent: process.env.PULSE_MEMORY_AGENT ?? 'agent', mode: process.env.PULSE_MEMORY_MODE ?? '1', messageId: process.env.PULSE_MEMORY_MESSAGE ?? null } });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}
