// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Intenciones, trying a cheaper rung on one message.
//
// Real use (intents-observe.mjs) can only vouch for the rungs the human actually uses. Somebody who
// sends everything at the CLI's default never runs a cheaper rung, so real use never sees one hold
// and Intenciones never has a reason to suggest saving. A try closes that gap: when the rule thinks
// one rung lower is enough for a read-only kind of request, it proposes running THIS message at it,
// and the same observation rules that read every other turn say whether it held.
//
// A try is never the default and never every message. It is offered only where a wrong answer
// costs little (a lookup, an explanation, a review, in a mode that writes nothing), only while real
// use has not yet seen enough turns at the cheaper rung to say, at most once every three messages
// that qualify, and it stops for a week where the cheaper rung fell short twice in its last three.
//
// Pure functions. The desk keeps the counts and the tries in memory and hands everything in.

import {
  effortLadder, OBSERVED_HELD_BAR, OBSERVED_MIN_TURNS, TIER_EFFORT, wilsonLower,
} from './intents-policy.mjs';
import { counted } from './intents-observe.mjs';

// The kinds of request a try may touch: the ones that only read. A change, a hunt or a design call
// run cheaply can waste the whole turn, and a short reply or a question for the archive has no rung
// worth learning.
export const TRY_INTENTS = ['lookup', 'explain', 'review'];
// With no rung known to start from and nothing seen to hold there, only the lightest kinds.
export const TRY_BLIND_INTENTS = ['lookup', 'explain'];
// The modes a try may run in: EXCHANGE and CREATE. CONTROL and AIRLOCK act on the project, and a
// GHOST turn leaves nothing in the ledger for the observation to read.
export const TRY_MODES = [1, 2];
// At most one try out of every this many messages that qualify, per agent, model and kind.
export const TRY_EVERY = 3;
// Fell short this many times in the last so many decided turns at the cheaper rung: a pause.
export const TRY_SHORT = 2;
export const TRY_LAST = 3;
export const TRY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
// A try is reported when the message leaves; the ledger stamps the message a moment later or, on
// a slow clock, a moment earlier. The observation of the try is the first one after this much slack.
export const TRY_SLACK_MS = 60 * 1000;

// Whether turns sent with no effort — the CLI's own default at work — held in real use: enough of
// them, and the pessimistic end of the interval at three in four.
export function defaultHeld(cell) {
  const usual = cell?.rungs?.default;
  return Boolean(usual) && usual.n >= OBSERVED_MIN_TURNS && wilsonLower(usual.held, usual.n) >= OBSERVED_HELD_BAR;
}

// The effort a CLI runs at when told none, where MADRE knows it. `defaults` is { agent: effort } or
// { agent: { effort, byModel: { model: effort } } }, as the desk receives it.
export function knownDefault(defaults = {}, agent, model = null) {
  const ladder = effortLadder(agent) ?? [];
  const known = defaults?.[agent];
  const said = typeof known === 'string' ? known : (model && known?.byModel?.[model]) || known?.effort || null;
  return ladder.includes(said) ? said : null;
}

// The rung a try would run at, or null. `rule` is the rung the rule names for this message (with
// its own context taken into account); `from` the rung the message would run at, or null when the
// CLI never says its default. With a rung to start from, a try is exactly one rung below it and only
// where the rule points there. Without one, the rule's rung when real use shows the default held,
// and otherwise the lightest rung, for lookups and explanations only. Never the deep tier.
export function tryRung({ agent, intent, from = null, rule = null, defaultHeld: held = false } = {}) {
  const ladder = effortLadder(agent);
  if (!ladder || !TRY_INTENTS.includes(intent) || !ladder.includes(rule)) return null;
  if (from !== null && from !== undefined) {
    const at = ladder.indexOf(from);
    return at > 0 && ladder.indexOf(rule) === at - 1 ? rule : null;
  }
  if (ladder.indexOf(rule) >= ladder.indexOf(TIER_EFFORT.deep)) return null;
  if (held) return rule;
  return TRY_BLIND_INTENTS.includes(intent) ? TIER_EFFORT.light : null;
}

const sameCell = (one, { agent, model, intent }) => one.agent === agent && (one.model ?? null) === (model ?? null) && one.intent === intent;
const stamp = (one) => { const at = Date.parse(one?.at ?? ''); return Number.isFinite(at) ? at : null; };

// When the pause on a rung ends, in ms, or null when there is none: the cheaper rung fell short at
// least twice in its last three decided turns for this agent, model and kind. It runs a week from
// the latest of those shortfalls, so a turn that held after it does not stretch it.
export function tryCooldown(observations = [], { agent, model = null, intent, effort } = {}) {
  const last = observations.filter((one) => counted(one) && sameCell(one, { agent, model, intent }) && one.effort === effort).slice(-TRY_LAST);
  const short = last.filter((one) => one.outcome === 'fell-short');
  if (short.length < TRY_SHORT) return null;
  const at = stamp(short.at(-1));
  return at === null ? null : at + TRY_COOLDOWN_MS;
}

// How a try went, read like every other turn: the first observation of that agent, model and kind
// at the rung tried, from the moment the try left. Null while nothing in the ledger says yet.
export function triedOutcome(observations = [], { agent, model = null, intent, effort, at } = {}) {
  return observations.find((one) => sameCell(one, { agent, model, intent }) && one.effort === effort && (stamp(one) ?? -Infinity) >= at - TRY_SLACK_MS) ?? null;
}
