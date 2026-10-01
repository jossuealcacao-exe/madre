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

// How many characters this room has been sending per token it was charged for reading. Every
// model counts differently and every room writes differently, so a number borrowed from anywhere
// else would be a guess. This one is the room's own arithmetic, and until it has turns to divide
// there is no answer to give.
export const RATE_WINDOW = 20;
export function observedRate(events = []) {
  let chars = 0;
  let input = 0;
  const recent = [];
  for (const event of events) if (event?.type === 'turn.cost' && event.payload) recent.push(event.payload);
  for (const turn of recent.slice(-RATE_WINDOW)) {
    if (!(Number(turn.input) > 0)) continue;
    chars += Number(turn.chars) || 0;
    input += Number(turn.input) || 0;
  }
  return input > 0 ? chars / input : null;
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
  // most of the prompt came back from its cache. It is NOT a tokenizer: see CH_PER_TOKEN.
  const perToken = input > 0 ? Number((chars / input).toFixed(2)) : null;
  return {
    chars, fixed, carried: chars - fixed, blocks, prefix: stablePrefix(parts),
    input, cached, created, output,
    cacheShare: input + cached > 0 ? Number((cached / (input + cached)).toFixed(3)) : null,
    charsPerInputToken: perToken,
  };
}

// Characters to tokens, when a count of tokens is wanted for text nobody was charged for.
//
// This is an estimate and it is written as one. MADRE does not have the provider's tokenizer,
// and the ratio this room DOES measure — what MADRE wrote against what the CLI was charged for
// reading — is a different quantity entirely: the CLIs bill their own system prompt, their own
// tools and every file they open during a turn, so that ratio fell to 0.62 in a real room and
// would have called a 14,000-character briefing 23,000 tokens. A fixed rate cannot do that.
//
// 3.5 rather than 4: the briefing is English prose, code, and memories in whatever language the
// room is worked in, and of the two ways to be wrong, saying a turn costs more than it does is
// the harmless one.
export const CH_PER_TOKEN = 3.5;
export const tokensFor = (chars) => Math.round((Number(chars) || 0) / CH_PER_TOKEN);

// Ash, measured instead of claimed.
//
// There is no honest way to say what a turn "would have cost" without Ash: the room never runs
// the same turn twice, so a saving attributed to it would be a number nobody measured. What CAN
// be measured is what this room has actually seen — the output tokens of the turns that ran
// compact against the ones that did not, for the same agent.
//
// Median, not mean: one long answer drags a mean and says nothing about the usual turn. Per
// agent, because agents differ far more from each other than Ash differs from itself. And only
// once both sides have enough turns to be worth reading, because a difference of two turns
// against one is noise wearing a percentage sign.
//
// What this is NOT: a controlled comparison. The human decides when to ask for compact prose,
// so the two sides are different tasks, not the same task twice. It is an observation of this
// room, and the reading says so.
export const ASH_MIN_TURNS = 5;

// How far the usual turn sits from the middle one. Median absolute deviation rather than a
// standard deviation: one four-thousand-token answer among five short ones would carry a
// standard deviation away with it, and that answer is exactly what this has to survive.
function spread(values) {
  const middle = median(values);
  if (middle === null) return 0;
  return median(values.map((value) => Math.abs(value - middle))) ?? 0;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// turn.cost events -> per agent, the output tokens seen with Ash on and with Ash off. Turns
// weighed before the room recorded the switch carry no boolean and are left out entirely:
// guessing which side they belong to would poison both.
export function ashObservation(turns = [], { minTurns = ASH_MIN_TURNS } = {}) {
  const sides = new Map();
  for (const turn of turns) {
    if (turn?.failed) continue;
    if (typeof turn?.ash !== 'boolean') continue;
    const output = Number(turn.output ?? 0) || 0;
    if (output <= 0) continue;
    const who = turn.agent ?? 'unknown';
    const mine = sides.get(who) ?? { on: [], off: [] };
    mine[turn.ash ? 'on' : 'off'].push(output);
    sides.set(who, mine);
  }
  const agents = [...sides.entries()].map(([agent, mine]) => {
    const on = { turns: mine.on.length, medianOutput: median(mine.on), spread: spread(mine.on) };
    const off = { turns: mine.off.length, medianOutput: median(mine.off), spread: spread(mine.off) };
    const comparable = on.turns >= minTurns && off.turns >= minTurns;
    const entry = { agent, on, off, comparable };
    if (comparable) {
      entry.delta = off.medianOutput - on.medianOutput;
      entry.share = off.medianOutput > 0 ? Number((entry.delta / off.medianOutput).toFixed(3)) : null;
      // Two medians are not a finding. Turn length varies enormously from one question to the
      // next — a paired run against the real CLIs put the spread at ninety-seven percentage
      // points — so a gap smaller than that variation is the room's own noise wearing a number.
      // Saying so is the whole point: a reading that can only ever agree with the switch is an
      // advertisement, not a measurement.
      entry.readable = Math.abs(entry.delta) > on.spread + off.spread;
    }
    return entry;
  }).sort((a, b) => (b.on.turns + b.off.turns) - (a.on.turns + a.off.turns));
  return { minTurns, agents, comparable: agents.some((agent) => agent.comparable) };
}

// Many turns, read together. This is the view that says where a room's tokens go.
export function economy(events = []) {
  const turns = [];
  for (const event of events) {
    if (event?.type !== 'turn.cost') continue;
    const cost = event.payload;
    if (cost && typeof cost === 'object') turns.push(cost);
  }
  if (!turns.length) return { turns: 0, blocks: [], agents: [], totals: null, free: { turns: 0, share: 0, paidOutputMedian: null }, ash: ashObservation([]) };

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
  // the room controls; it becomes tokens at the estimate above, never at the measured ratio —
  // that ratio carries whatever the agents read on their own, and using it here made the room
  // claim it had saved six times what it saved.
  const spared = turns.reduce((sum, turn) => sum + (Number(turn.spared ?? 0) || 0), 0);
  const saved = {
    cachedTokens: totals.cached,
    cachedShare: totals.input + totals.cached > 0 ? Number((totals.cached / (totals.input + totals.cached)).toFixed(3)) : null,
    unsentChars: spared,
    unsentTokens: spared ? tokensFor(spared) : null,
    // Where it would have been charged had nothing changed: what was read back plus what was
    // never sent. A room with no cache and nothing trimmed would show zero here.
    tokens: totals.cached + tokensFor(spared),
  };

  // Turns the room answered itself. @madre runs on this computer and reports no usage at all, so
  // these are not a saving measured against something — they are turns with no bill. The median
  // of what a paid turn cost in THIS room is given beside them so the count has a scale, and it
  // is named as what it is: what other turns cost, not what these would have.
  const free = turns.filter((turn) => turn.agent === 'madre');
  const paidOutputs = turns.filter((turn) => turn.agent !== 'madre' && (Number(turn.output) || 0) > 0).map((turn) => Number(turn.output));
  const freeTurns = {
    turns: free.length,
    share: turns.length ? Number((free.length / turns.length).toFixed(3)) : 0,
    paidOutputMedian: paidOutputs.length ? median(paidOutputs) : null,
  };

  return {
    turns: turns.length,
    saved,
    free: freeTurns,
    ash: ashObservation(turns),
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
