// What a turn actually costs, and where it went.
//
// Pure functions here. The room hands in the blocks a prompt was built from and what the CLI
// reported spending; nothing in this file builds a prompt, calls a model or reads a file.
//
// The reason this exists at all: MADRE used to reason about token cost in characters, and a
// shorter string is not fewer tokens. The CLIs already report what they really spent, including
// what they read from their own cache, so the room can stop guessing. Everything that comes
// after this — trimming the briefing, keeping the prefix stable so a cache hits, holding a
// session open — is only worth doing if it can be seen to have worked.

// Blocks the room sends every turn no matter what is asked, and blocks it sends only when the
// shape of the turn calls for them. The split is what makes the fixed cost of a room visible.
export const ALWAYS = new Set(['room', 'who', 'mode', 'inspect', 'style', 'privacy', 'ask']);

// The blocks that read the same on every turn of a given agent in a given room. Kept together
// at the head of the prompt so the longest possible run of it comes back from the CLI's own
// cache instead of being charged again. Anything that can change between two turns belongs
// after them, however short it is: one differing byte early throws away everything after it.
export const STABLE = ['room', 'who', 'style', 'privacy', 'madre', 'memory-server'];

// How much of a prompt could be read back from a cache: the run of unchanging blocks at its
// head, in the order they were actually built. It stops at the first block that can vary,
// because that is exactly where a prefix match stops.
export function stablePrefix(parts = []) {
  let chars = 0;
  for (let i = 0; i < parts.length; i += 1) {
    if (!STABLE.includes(parts[i]?.id)) break;
    chars += String(parts[i].text ?? '').length + (i > 0 ? 1 : 0);
  }
  return chars;
}

// One turn, measured. `parts` is what promptParts gave, `usage` is what the CLI said it spent.
export function turnCost(parts = [], usage = null) {
  const blocks = {};
  let chars = 0;
  for (const part of parts) {
    const size = String(part?.text ?? '').length;
    if (!part?.id || !size) continue;
    blocks[part.id] = (blocks[part.id] ?? 0) + size;
    chars += size;
  }
  const fixed = Object.entries(blocks).reduce((sum, [id, size]) => sum + (ALWAYS.has(id) ? size : 0), 0);
  const input = Number(usage?.inputTokens ?? 0) || 0;
  const cached = Number(usage?.cachedInputTokens ?? 0) || 0;
  const created = Number(usage?.cacheCreationInputTokens ?? 0) || 0;
  const output = Number(usage?.outputTokens ?? 0) || 0;
  // What the CLI charged for reading, against what the room actually handed it. A ratio well
  // over the prompt's own size means the agent read files or tools of its own; well under means
  // most of the prompt came back from its cache.
  const perToken = input > 0 ? Number((chars / input).toFixed(2)) : null;
  return {
    chars, fixed, carried: chars - fixed, blocks, prefix: stablePrefix(parts),
    input, cached, created, output,
    cacheShare: input + cached > 0 ? Number((cached / (input + cached)).toFixed(3)) : null,
    charsPerInputToken: perToken,
  };
}

// Many turns, read together. This is the view that says where a room's tokens go.
export function economy(events = []) {
  const turns = [];
  for (const event of events) {
    if (event?.type !== 'turn.cost') continue;
    const cost = event.payload;
    if (cost && typeof cost === 'object') turns.push(cost);
  }
  if (!turns.length) return { turns: 0, blocks: [], agents: [], totals: null };

  const blocks = new Map();
  const agents = new Map();
  const totals = { chars: 0, fixed: 0, carried: 0, prefix: 0, input: 0, cached: 0, created: 0, output: 0 };
  for (const turn of turns) {
    for (const key of Object.keys(totals)) totals[key] += Number(turn[key] ?? 0) || 0;
    for (const [id, size] of Object.entries(turn.blocks ?? {})) {
      const seen = blocks.get(id) ?? { id, chars: 0, turns: 0, always: ALWAYS.has(id) };
      seen.chars += size;
      seen.turns += 1;
      blocks.set(id, seen);
    }
    const who = turn.agent ?? 'unknown';
    const mine = agents.get(who) ?? { agent: who, turns: 0, input: 0, cached: 0, output: 0, chars: 0 };
    mine.turns += 1;
    for (const key of ['input', 'cached', 'output', 'chars']) mine[key] += Number(turn[key] ?? 0) || 0;
    agents.set(who, mine);
  }

  // A block's share is of what the room sent, not of what was charged: the same block costs a
  // different number of tokens to different models, and this is the part the room controls.
  const ranked = [...blocks.values()]
    .map((block) => ({ ...block, share: totals.chars ? Number((block.chars / totals.chars).toFixed(4)) : 0, perTurn: Math.round(block.chars / block.turns) }))
    .sort((a, b) => b.chars - a.chars);

  // What was not paid for. Two kinds, and only one of them is a measurement.
  //
  // Cache reads are real: the CLI said it read those tokens back instead of charging them as
  // fresh input, so they are money the room did not spend. Everything else here is what the
  // room chose not to send in the first place, counted in characters because that is the unit
  // the room controls; it becomes tokens at whatever rate this room's turns have shown.
  const perToken = totals.input > 0 ? totals.chars / totals.input : null;
  const spared = turns.reduce((sum, turn) => sum + (Number(turn.spared ?? 0) || 0), 0);
  const saved = {
    cachedTokens: totals.cached,
    cachedShare: totals.input + totals.cached > 0 ? Number((totals.cached / (totals.input + totals.cached)).toFixed(3)) : null,
    unsentChars: spared,
    unsentTokens: perToken ? Math.round(spared / perToken) : null,
    // Where it would have been charged had nothing changed: what was read back plus what was
    // never sent. A room with no cache and nothing trimmed would show zero here.
    tokens: totals.cached + (perToken ? Math.round(spared / perToken) : 0),
  };

  return {
    turns: turns.length,
    saved,
    blocks: ranked,
    agents: [...agents.values()]
      .map((agent) => ({ ...agent, charsPerInputToken: agent.input > 0 ? Number((agent.chars / agent.input).toFixed(2)) : null, cacheShare: agent.input + agent.cached > 0 ? Number((agent.cached / (agent.input + agent.cached)).toFixed(3)) : null }))
      .sort((a, b) => b.input - a.input),
    totals: {
      ...totals,
      fixedShare: totals.chars ? Number((totals.fixed / totals.chars).toFixed(4)) : null,
      prefixShare: totals.chars ? Number((totals.prefix / totals.chars).toFixed(4)) : null,
      cacheShare: totals.input + totals.cached > 0 ? Number((totals.cached / (totals.input + totals.cached)).toFixed(3)) : null,
      charsPerInputToken: totals.input > 0 ? Number((totals.chars / totals.input).toFixed(2)) : null,
    },
  };
}
