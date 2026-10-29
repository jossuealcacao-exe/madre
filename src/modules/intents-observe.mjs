// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Intenciones, learned from real use: how each turn the human already paid for went.
//
// The calibration (intents-calibration.mjs) asks real questions again, at two rungs, and a judge
// compares. It is the stronger evidence and it costs turns: with an agent that reads the project
// on every answer, a quick test is millions of tokens. This file costs none. It reads what the
// room already wrote — the human's message, the reply, the human's word on it, a failure, a STOP,
// and what the human did next — and says, per turn, whether the rung it ran at was enough.
//
// What counts as "not enough" is what a person does when an answer did not do it: says so (a
// thumbs-down), asks the same thing again within a few minutes, asks it again at a higher rung, or
// the turn failed. What counts as "enough" is the opposite: a thumbs-up, or moving on to something
// else. Everything in between — a turn too recent to know, a STOP nobody followed up, a failure
// that was the provider's and not the answer's — is not counted either way.
//
// Pure functions. Nothing here reads a file, calls a model or writes anything: the desk hands in
// the ledger events and keeps the result in memory.

import { budgetTokens } from '../room/budget.mjs';
import {
  classifyIntent, contextSignals, effortLadder, evidenceKey, lowestObservedSufficient,
  INTENT_TIER, OBSERVED_HELD_BAR, OBSERVED_MIN_TURNS,
} from './intents-policy.mjs';

export { lowestObservedSufficient, OBSERVED_HELD_BAR, OBSERVED_MIN_TURNS };

// How long after an answer the human's next move still says something about it. Past it, silence
// is moving on; inside it, a turn with nothing after it yet is not decided.
export const OBSERVE_WINDOW_MS = 15 * 60 * 1000;
// The same request again: most of the words of the one before, in any order. Short messages are
// left out, because "sí, dale" twice is two go-aheads and not one request repeated.
export const NEAR_REPEAT = 0.6;
export const NEAR_REPEAT_MIN_WORDS = 4;

const NEGATIVE = new Set(['never', 'bad']);
const POSITIVE = new Set(['good', 'preference']);
// A failure that was the provider's or the machine's, not the answer's: a rate limit says nothing
// about how hard the agent thought. The calibration skips these too.
// A crash of the CLI is one of them too: it ended the turn before anything was answered.
const NOT_THE_ANSWER = /rate.?limit|usage limit|quota|\b429\b|too many requests|overloaded|unavailable|HTTP 5\d\d|server error|not ready|not enabled|too long \(|does not know the model|is not found for|not supported|not logged in|\blog ?in\b|sign in|authenticat|unauthori[sz]ed|api.?key|ENOENT|ECONN|network|exited with code|shutting down|MADRE stopped while|waiting for the project/i;
// Ledgers written before a STOP carried its own flag say so only in words.
const STOPPED_WORDS = /stopped by the human|detenido por el humano|STOPALL/i;

/* ---------- what the reader keeps ---------- */

const OBSERVED_TYPES = new Set(['message.created', 'message.failed', 'message.rated', 'usage.recorded', 'turn.stopped']);

// One ledger event cut down to what observing needs, or null. The reader of every conversation in
// the project keeps these instead of whole events: a reply's text is most of a ledger and none of it
// is read here.
export function observable(event, chat = null) {
  if (!event || !OBSERVED_TYPES.has(event.type) || event.ghost) return null;
  const p = event.payload ?? {};
  const base = { type: event.type, sequence: event.sequence, timestamp: event.timestamp, ...(chat ? { chat } : {}) };
  if (event.type === 'message.created') {
    if (p.role === 'user' && p.sender === 'you') return { ...base, payload: { messageId: p.messageId, role: p.role, sender: p.sender, target: p.target, text: String(p.text ?? '').slice(0, 4000), model: p.model ?? null, effort: p.effort ?? null, mode: p.mode } };
    if (p.role === 'assistant' && p.parentMessageId) return { ...base, payload: { messageId: p.messageId, parentMessageId: p.parentMessageId, role: p.role, sender: p.sender } };
    return null;
  }
  if (event.type === 'message.failed') return { ...base, payload: { messageId: p.messageId, target: p.target, error: String(p.error ?? '').slice(0, 300), stopped: p.stopped === true } };
  if (event.type === 'message.rated') return { ...base, payload: { messageId: p.messageId, rating: p.rating } };
  if (event.type === 'usage.recorded') return { ...base, payload: { agent: p.agent, messageId: p.messageId ?? null, budgetTokens: Number.isFinite(p.budgetTokens) ? p.budgetTokens : budgetTokens(p.usage ?? {}) } };
  return { ...base, payload: { messageId: p.messageId, agent: p.agent } };
}

/* ---------- one turn ---------- */

const fold = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (text) => new Set(fold(text).match(/[\p{L}\p{N}]{2,}/gu) ?? []);

// Token Jaccard: the share of words the two messages have in common, out of all the words in them.
export function similarity(a, b) {
  const one = words(a);
  const two = words(b);
  if (Math.min(one.size, two.size) < NEAR_REPEAT_MIN_WORDS) return 0;
  let shared = 0;
  for (const word of one) if (two.has(word)) shared += 1;
  return shared / (one.size + two.size - shared);
}

const retrying = (text) => contextSignals(text).some((signal) => signal.id === 'retry');
const when = (event) => { const at = Date.parse(event?.timestamp ?? ''); return Number.isFinite(at) ? at : null; };

// The rung a turn ran at: the one sent with it, or the CLI's own default when the room knows it,
// or `default` when it does not (Claude never says). `defaults` is { agent: effort } or
// { agent: { effort, byModel: { model: effort } } }.
function rungOf(agent, model, effort, defaults = {}) {
  const ladder = effortLadder(agent) ?? [];
  if (ladder.includes(effort)) return effort;
  const known = defaults?.[agent];
  const said = typeof known === 'string' ? known : (model && known?.byModel?.[model]) || known?.effort || null;
  return ladder.includes(said) ? said : 'default';
}

// One observation per turn the human sent to an agent with an effort ladder, in every conversation
// handed in (an event's `chat` says which; without one they are all one conversation). `agents`
// narrows it to those ids; `now` is when "too recent" is measured from.
export function observeTurns(events = [], { agents = null, defaults = {}, now = Date.now(), windowMs = OBSERVE_WINDOW_MS } = {}) {
  const wanted = agents ? new Set(agents.map((agent) => (typeof agent === 'string' ? agent : agent?.id))) : null;
  const chats = new Map();
  for (const event of events) {
    if (!event || event.ghost) continue;
    const key = event.chat ?? 'main';
    (chats.get(key) ?? chats.set(key, []).get(key)).push(event);
  }
  const out = [];
  for (const [chat, list] of chats) out.push(...observeChat(chat, list, { wanted, defaults, now, windowMs }));
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function observeChat(chat, events, { wanted, defaults, now, windowMs }) {
  const humans = [];
  const replies = new Map();
  const failures = new Map();
  const stops = new Set();
  const ratings = new Map();
  const spent = new Map();
  for (const event of events) {
    const p = event.payload ?? {};
    if (event.type === 'message.created' && p.role === 'user' && p.sender === 'you' && p.mode !== 0) humans.push({ id: p.messageId, agent: p.target, text: String(p.text ?? ''), model: p.model ?? null, effort: p.effort ?? null, at: when(event), timestamp: event.timestamp });
    else if (event.type === 'message.created' && p.role === 'assistant' && p.parentMessageId && !replies.has(p.parentMessageId)) replies.set(p.parentMessageId, { id: p.messageId, at: when(event) });
    else if (event.type === 'message.failed' && p.messageId && !failures.has(p.messageId)) failures.set(p.messageId, { at: when(event), stopped: p.stopped === true, error: String(p.error ?? '') });
    else if (event.type === 'turn.stopped' && p.messageId) stops.add(p.messageId);
    else if (event.type === 'message.rated' && p.messageId) ratings.set(p.messageId, p.rating);
    else if (event.type === 'usage.recorded' && p.messageId) {
      const key = `${p.messageId}|${p.agent}`;
      const tokens = Number.isFinite(p.budgetTokens) ? p.budgetTokens : budgetTokens(p.usage ?? {});
      spent.set(key, (spent.get(key) ?? 0) + tokens);
    }
  }

  // What each message asks, read the way the composer reads it: with the one before it to the
  // same agent, so "sí, hazlo" after a proposal is the change it agrees to.
  const previous = new Map();
  for (const human of humans) {
    if (!effortLadder(human.agent)) continue;
    const before = previous.get(human.agent);
    human.intent = classifyIntent(human.text, { previous: before ? { intent: before } : null })?.intent ?? null;
    human.rung = rungOf(human.agent, human.model, human.effort, defaults);
    previous.set(human.agent, human.intent);
  }

  const out = [];
  for (const [index, turn] of humans.entries()) {
    const ladder = effortLadder(turn.agent);
    if (!ladder || (wanted && !wanted.has(turn.agent)) || !turn.intent || turn.intent === 'archive' || !INTENT_TIER[turn.intent]) continue;
    const reply = replies.get(turn.id) ?? null;
    const failure = failures.get(turn.id) ?? null;
    const stopped = stops.has(turn.id) || failure?.stopped === true || STOPPED_WORDS.test(failure?.error ?? '');
    const ended = reply?.at ?? failure?.at ?? null;
    const next = humans.slice(index + 1).find((one) => one.agent === turn.agent) ?? null;
    const soon = Boolean(next) && ended !== null && next.at !== null && next.at - ended <= windowMs;
    const higher = soon && ladder.includes(next.rung) && ladder.includes(turn.rung) && ladder.indexOf(next.rung) > ladder.indexOf(turn.rung);
    const again = !soon ? null
      : retrying(next.text) ? 'retry'
        : similarity(turn.text, next.text) >= NEAR_REPEAT ? 'repeat'
          : higher && next.intent === turn.intent ? 'higher'
            : null;
    const rating = reply ? ratings.get(reply.id) : undefined;
    const tokens = spent.has(`${turn.id}|${turn.agent}`) ? spent.get(`${turn.id}|${turn.agent}`) : null;

    let outcome;
    let why;
    let settles = null;
    if (NEGATIVE.has(rating)) [outcome, why] = ['fell-short', 'rated'];
    else if (POSITIVE.has(rating)) [outcome, why] = ['held', 'rated'];
    // A STOP is a fact about the turn, not about the rung: the human may have stopped it because
    // they changed their mind. Only asking again right after says it was not doing the job.
    else if (stopped) [outcome, why] = again ? ['fell-short', 'stopped'] : ['unknown', 'stopped'];
    else if (failure) [outcome, why] = NOT_THE_ANSWER.test(failure.error) ? ['unknown', 'not-the-answer'] : ['fell-short', 'failed'];
    else if (!reply) [outcome, why] = ['unknown', 'in-flight'];
    else if (again) [outcome, why] = ['fell-short', again];
    else if (soon) [outcome, why] = ['held', 'moved-on'];
    else if (ended !== null && now - ended < windowMs) { [outcome, why] = ['unknown', 'recent']; settles = ended + windowMs; }
    else [outcome, why] = ['held', 'quiet'];

    out.push({ at: turn.timestamp ?? null, chat, messageId: turn.id, agent: turn.agent, model: turn.model, intent: turn.intent, effort: turn.rung, tokens, outcome, why, ...(settles ? { settles } : {}) });
  }
  return out;
}

/* ---------- folded ---------- */

const median = (list = []) => {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const counted = (one) => one?.outcome === 'held' || one?.outcome === 'fell-short';

// Every decided observation, per agent, model and kind of request, per rung: how many, how many
// held, how many fell short, and the middle turn's tokens (null when no turn at that rung was
// priced). Keyed like the calibration's evidence, so the policy reads both the same way.
export function foldObserved(observations = []) {
  const cells = new Map();
  for (const one of observations) {
    if (!counted(one) || !effortLadder(one.agent)) continue;
    const key = evidenceKey(one.agent, one.model, one.intent);
    const cell = cells.get(key) ?? { agent: one.agent, model: one.model ?? null, intent: one.intent, rungs: {} };
    const rung = cell.rungs[one.effort] ?? { n: 0, held: 0, short: 0, spent: [] };
    rung.n += 1;
    if (one.outcome === 'held') rung.held += 1; else rung.short += 1;
    if (Number.isFinite(one.tokens)) rung.spent.push(one.tokens);
    cell.rungs[one.effort] = rung;
    cells.set(key, cell);
  }
  for (const cell of cells.values()) {
    for (const [effort, rung] of Object.entries(cell.rungs)) {
      const { spent, ...rest } = rung;
      cell.rungs[effort] = { ...rest, tokens: median(spent), priced: spent.length };
    }
  }
  return cells;
}

// The order the sheet reads kinds of request in: the read-only ones the calibration also knows,
// then the change, then the short reply.
export const OBSERVED_INTENTS = ['lookup', 'explain', 'review', 'implement', 'diagnose', 'design', 'chat'];

// What real use taught about one agent and model, for the sheet. `tokensSaved` is an estimate:
// for every decided turn that ran above the lowest rung real use showed to be enough for its kind,
// what it cost minus what the middle turn at that rung costs. Null when no kind has such a rung
// with a price; never below zero.
export function observedSummary(observations = [], { agent, model = null } = {}) {
  const ladder = effortLadder(agent);
  const mine = observations.filter((one) => one.agent === agent && (one.model ?? null) === (model ?? null));
  const decided = mine.filter(counted);
  const cells = foldObserved(decided);
  let saved = 0;
  let computable = false;
  const byIntent = OBSERVED_INTENTS.map((intent) => {
    const cell = cells.get(evidenceKey(agent, model, intent));
    const rungs = Object.values(cell?.rungs ?? {});
    const n = rungs.reduce((sum, rung) => sum + rung.n, 0);
    const held = rungs.reduce((sum, rung) => sum + rung.held, 0);
    const lowest = lowestObservedSufficient(cell, ladder);
    // How close the busiest rung is to the eight turns a reading needs.
    const most = rungs.reduce((top, rung) => Math.max(top, rung.n), 0);
    const price = lowest ? cell.rungs[lowest.effort].tokens : null;
    if (lowest && Number.isFinite(price)) {
      computable = true;
      for (const one of decided) {
        if (one.intent !== intent || !Number.isFinite(one.tokens) || !ladder.includes(one.effort)) continue;
        if (ladder.indexOf(one.effort) > ladder.indexOf(lowest.effort)) saved += one.tokens - price;
      }
    }
    return {
      intent,
      rung: lowest?.effort ?? null,
      n,
      heldRate: n ? Number((held / n).toFixed(2)) : null,
      seen: lowest ? { n: lowest.n, held: lowest.held } : null,
      most,
    };
  });
  return {
    turns: decided.length,
    held: decided.filter((one) => one.outcome === 'held').length,
    short: decided.filter((one) => one.outcome === 'fell-short').length,
    pending: mine.length - decided.length,
    byIntent,
    tokensSaved: computable ? Math.max(0, Math.round(saved)) : null,
    minTurns: OBSERVED_MIN_TURNS,
  };
}
