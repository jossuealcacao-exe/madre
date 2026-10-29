// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The two tests behind Intenciones: is a cheaper rung enough for this project?
//
// A suggestion is only worth what it was measured against, and the room's ordinary use can never
// measure it: every turn runs at one effort, so nobody ever sees what the other rung would have
// said. These tests ask on purpose. Real questions from this project's own ledger go to the same
// agent twice, at its usual rung and one cheaper, and a judge who cannot tell which is which says
// whether the cheaper answer is missing anything that matters.
//
//   QUICK — the human judges. Six questions, one rung down, twelve turns. Enough to say "you did
//           not notice a difference", never enough to say there is none.
//   FULL  — an impartial agent judges, chosen the way EYECAT chooses: never the agent being
//           measured. It walks down the ladder one rung at a time, per kind of question, and
//           stops at the first rung that is not enough. It runs only when the human started it
//           or when the agent's window is about to reset with quota that would be lost anyway.
//
// Everything that talks to a model is handed in (`ask`, `judge`), as matchExam's `ask` is. Nothing
// here spends a turn by itself, and every turn it does spend is counted against `maxTurns`.
//
// Read-only questions only. A request to change the project, asked again with no lease, measures
// how well an agent explains that it cannot write; that needs a worktree and the project's own
// tests as the judge, and it is not this file.

import { createHash, randomUUID } from 'node:crypto';
import { exchanges } from '../exam.mjs';
import { judgeFor } from '../eyecat.mjs';
import { budgetTokens } from '../room/budget.mjs';
import { classifyUsagePercent } from '../usage-sentinel.mjs';
import { classifyIntent, effortLadder, evidenceKey, foldEvidence, lowestSufficient, nextRung, wilsonLower, wilsonUpper, MIN_COMPARISONS, MAX_COMPARISONS } from './intents-policy.mjs';

export const READ_ONLY_INTENTS = ['lookup', 'explain', 'review', 'diagnose', 'design'];
export const CASE_MIN_CHARS = 20;
export const QUICK_CASES = 6;
export const FULL_MAX_TURNS = 120;
// A guard against a loop, not a budget: every round consumes questions, so the pool runs out first.
const MAX_ROUNDS = 40;

// The questions this project has actually asked, each with the kind of question it is. A question
// the local model answered is left out with the archive questions: both are @madre's.
export function calibrationCases(events = []) {
  const seen = new Set();
  const cases = [];
  // Lookups are short by nature; the archive's forty-character floor would leave them all out.
  for (const one of exchanges(events, { minAsk: CASE_MIN_CHARS })) {
    if (one.local) continue;
    const intent = classifyIntent(one.asked)?.intent;
    if (!READ_ONLY_INTENTS.includes(intent)) continue;
    const key = one.asked.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push({ caseId: `q${one.sequence}`, question: one.asked, intent });
  }
  return cases;
}

// The rung the human usually asks this agent for, which is what a cheaper rung has to match.
export function usualEffort(events = [], agent) {
  const ladder = effortLadder(agent);
  if (!ladder) return null;
  const counts = new Map();
  for (const event of events) {
    const p = event?.payload ?? {};
    if (event?.type !== 'message.created' || p.role !== 'user' || p.target !== agent || !ladder.includes(p.effort)) continue;
    counts.set(p.effort, (counts.get(p.effort) ?? 0) + 1);
  }
  let best = null;
  for (const [effort, count] of counts) if (!best || count > best.count || (count === best.count && ladder.indexOf(effort) > ladder.indexOf(best.effort))) best = { effort, count };
  return best?.effort ?? null;
}

// Interleaved by kind, so six questions are six different kinds of work where the ledger has them
// rather than six of whatever the room asks most.
function interleave(cases) {
  const byIntent = new Map();
  for (const one of cases) (byIntent.get(one.intent) ?? byIntent.set(one.intent, []).get(one.intent)).push(one);
  const queues = [...byIntent.values()];
  const out = [];
  while (queues.some((queue) => queue.length)) for (const queue of queues) if (queue.length) out.push(queue.shift());
  return out;
}

// One round: which question goes to which rung. Records are everything already kept, from this run
// and earlier ones; a question is never asked twice at the same rung of the same version.
//
// The quick test may be aimed: `effort` is the rung to try (below the reference; one rung down when
// not said) and `intent` the kind of question to ask first. Six questions of one kind are enough to
// settle that kind; when the ledger has fewer, the rest are of other kinds and nothing is settled.
export function planRound({ kind = 'quick', cases = [], agent, model = null, reference, version = null, records = [], effort = null, intent = null } = {}) {
  const ladder = effortLadder(agent);
  if (!ladder || !ladder.includes(reference)) return [];
  const mine = comparable(records, { agent, model, reference, version });
  // What an untrusted judge saw may be asked again: nothing was learned from it.
  const asked = new Set(mine.filter((record) => !record.untrusted).map((record) => `${record.caseId}|${record.effort}`));
  const fresh = (one, effort) => !asked.has(`${one.caseId}|${effort}`);

  if (kind === 'quick') {
    const top = ladder.indexOf(reference);
    const aimed = ladder.indexOf(effort);
    const below = aimed >= 0 && aimed < top ? effort : ladder[top - 1];
    if (!below) return [];
    const pool = interleave(cases).filter((one) => fresh(one, below));
    const first = intent ? pool.filter((one) => one.intent === intent) : [];
    return [...first, ...pool.filter((one) => !first.includes(one))].slice(0, QUICK_CASES).map((one) => ({ ...one, effort: below, reference }));
  }

  const evidence = foldEvidence(mine, { versions: version ? { [agent]: version } : {} });
  const plan = [];
  for (const intent of READ_ONLY_INTENTS) {
    const cell = evidence.get(evidenceKey(agent, model, intent));
    const effort = nextRung(cell, ladder, reference);
    if (!effort) continue;
    // Six more at a time, and never past the cap: the twentieth comparison is where an open rung
    // is called not enough, so a twenty-fourth would be spent on a question already answered.
    const room = Math.min(MIN_COMPARISONS, MAX_COMPARISONS - (cell?.rungs?.[effort]?.n ?? 0));
    const pool = cases.filter((one) => one.intent === intent && fresh(one, effort));
    // Questions already answered at the reference come first: their reference turn is paid.
    const answered = new Set(mine.map((record) => record.caseId));
    pool.sort((a, b) => Number(answered.has(b.caseId)) - Number(answered.has(a.caseId)));
    plan.push(...pool.slice(0, room).map((one) => ({ ...one, effort, reference })));
  }
  return plan;
}

// Records of one agent, model and reference that still describe the CLI installed now.
const comparable = (records, { agent, model, reference, version }) => records.filter((record) => record.agent === agent
  && (record.model ?? null) === (model ?? null)
  && record.reference === reference
  && !(version && record.version && record.version !== version));

// Where a calibration stands, per kind of question: the rung that was measured to be enough, or
// the rung it would test next. The totals are the human-sized reading of a quick test — "you did
// not notice a difference in six of six" — which never settles a kind of question by itself.
export function calibrationSummary(records = [], { agent, model = null, reference, version = null } = {}) {
  const ladder = effortLadder(agent);
  const mine = comparable(records, { agent, model, reference, version });
  const evidence = foldEvidence(mine, { versions: version ? { [agent]: version } : {} });
  const totals = { compared: 0, worse: 0, same: 0, better: 0, skipped: 0 };
  for (const record of mine) {
    if (record.control) continue;
    if (record.skipped) totals.skipped += 1;
    else if (totals[record.verdict] !== undefined) { totals.compared += 1; totals[record.verdict] += 1; }
  }
  const intents = READ_ONLY_INTENTS.map((intent) => {
    const cell = evidence.get(evidenceKey(agent, model, intent));
    const settled = lowestSufficient(cell, ladder);
    const n = Object.values(cell?.rungs ?? {}).reduce((sum, rung) => sum + rung.n, 0);
    return { intent, n, effort: settled?.effort ?? null, status: settled ? 'measured' : 'open', next: ladder ? nextRung(cell, ladder, reference) : null };
  });
  return { agent, model, reference, totals, intents, judge: judgeHealth(mine) };
}

// What a plan will cost before it runs, in turns of the agent being measured: one per question and
// rung, plus one reference per question not yet answered in this run.
export function estimateTurns(plan = [], { answered = new Set() } = {}) {
  const references = new Set(plan.map((one) => one.caseId).filter((id) => !answered.has(id)));
  return new Set(plan.map((one) => `${one.caseId}|${one.effort}`)).size + references.size;
}

/* ---------- when ---------- */

// Never above the warning line: a test that leaves the agent unable to answer the human has cost
// more than it could ever save. The full test, unattended, waits for quota that would expire
// unused — a window close to its reset with plenty left. Unknown quota is never spent unseen.
export const EXPIRING_MS = 2 * 60 * 60 * 1000;
export const SPARE_PERCENT = 60;

export function mayCalibrate({ kind = 'quick', usage = null, byHuman = false, now = Date.now() } = {}) {
  const used = Number(usage?.usedPercent);
  const known = usage && Number.isFinite(used);
  if (known && classifyUsagePercent(used) !== 'normal') return { ok: false, reason: 'quota' };
  if (kind === 'quick' || byHuman) return { ok: true, reason: byHuman ? 'asked' : 'quick' };
  if (!known) return { ok: false, reason: 'unknown-quota' };
  const reset = Date.parse(usage.resetAt ?? '');
  if (!Number.isFinite(reset) || reset - now > EXPIRING_MS || reset <= now) return { ok: false, reason: 'not-expiring' };
  if (used > SPARE_PERCENT) return { ok: false, reason: 'no-spare' };
  return { ok: true, reason: 'expiring' };
}

/* ---------- blind ---------- */

// Which answer is shown first, decided by the case and not by the order the room asked them in:
// a judge that learns "the first one is the expensive one" is not judging anymore.
export function blindPair(candidate, reference, seed = '') {
  const candidateFirst = createHash('sha256').update(String(seed)).digest()[0] % 2 === 0;
  return candidateFirst
    ? { first: candidate, second: reference, candidateFirst }
    : { first: reference, second: candidate, candidateFirst };
}

// The judge's word, turned back into what it says about the cheaper rung.
export function unblind(choice, candidateFirst) {
  if (choice === 'same') return 'same';
  if (choice === 'first') return candidateFirst ? 'better' : 'worse';
  if (choice === 'second') return candidateFirst ? 'worse' : 'better';
  return null;
}

// The question to an impartial judge: no names, no rungs, no order of authority, and a bar that is
// about the person asking rather than about which answer is longer.
export function judgePrompt({ question, first, second }) {
  return [
    'You are a reviewer. You are given a question someone asked about their software project, and two answers to it. Nothing else is known about either answer, and neither is more likely to be right because of where it appears.',
    'Decide whether one of them leaves out, or gets wrong, something that matters to the person asking.',
    'Length, tone and formatting do not count. Two answers that would serve the person equally well are the SAME, however differently they are written.',
    'Reply with exactly one word and nothing else: FIRST if the first answer serves them better, SECOND if the second does, SAME if neither does.',
    '<question>', String(question ?? ''), '</question>',
    '<first>', String(first ?? ''), '</first>',
    '<second>', String(second ?? ''), '</second>',
  ].join('\n');
}

// Only one clear word survives. A judge that names both, or neither, has not judged.
export function parseJudgement(text) {
  const words = (line) => [...new Set((String(line).toUpperCase().match(/\b(FIRST|SECOND|SAME)\b/g) ?? []))];
  const all = words(text);
  if (all.length === 1) return all[0].toLowerCase();
  const last = String(text ?? '').trim().split('\n').filter((line) => line.trim()).at(-1) ?? '';
  const final = words(last);
  return final.length === 1 ? final[0].toLowerCase() : null;
}

// Who may judge an agent's answers: anyone but that agent, in EYECAT's order (the local model
// first, because it is free and owes nothing to any account in the room).
export const judgeForAgent = (agent, options = {}) => judgeFor({ claim: { agent }, against: { agent } }, options);

/* ---------- the judge's own test ---------- */

// A judge that cannot see a difference is the one failure here that costs quality instead of
// money: it calls every cheaper rung enough, and the room starts suggesting turns that answer
// worse. A judge that prefers longer answers only errs the other way — it finds fewer savings —
// so it is tolerated. A blind one is not, and blindness is tested the way exam.mjs tests recall:
// against a control whose right answer is known.
//
// The control costs no turn of the agent being measured. It is the reference answer the room
// already paid for, next to a copy cut to its first third. A judge that calls those two the same
// cannot be trusted with the subtle cases, and nothing it judged in that run is kept as evidence.
export const CONTROL_MIN = 3;       // checked first, before the judge's word is worth anything
export const CONTROL_EVERY = 3;     // then one comparison in three is followed by a control
export const CONTROL_BAR = 0.5;     // it must catch the cut more often than not, with confidence

export function degrade(text) {
  const whole = String(text ?? '').trim();
  const cut = Math.max(1, Math.floor(whole.length / 3));
  const head = whole.slice(0, cut);
  const space = head.lastIndexOf(' ');
  return (space > cut / 2 ? head.slice(0, space) : head).trim();
}

// trusted — it caught the cut often enough to say so; blind — it clearly does not see it, and the
// run stops there; unknown — not enough controls yet to say either.
export function judgeHealth(records = [], { run = null } = {}) {
  const controls = records.filter((record) => record.control && record.verdict && (!run || record.run === run));
  const caught = controls.filter((record) => record.verdict === 'worse').length;
  const n = controls.length;
  const status = n >= CONTROL_MIN && wilsonLower(caught, n) >= CONTROL_BAR ? 'trusted'
    : n >= CONTROL_MIN && wilsonUpper(caught, n) < CONTROL_BAR ? 'blind'
      : 'unknown';
  return { controls: n, caught, status };
}

/* ---------- run ---------- */

// `ask({ question, agent, model, effort })` → the adapter's result ({ text, usage, error }).
// `judge` → { id, decide({ question, first, second, caseId, intent }) } returning 'first',
// 'second', 'same' or null. For the quick test the human is the judge and `decide` waits for them;
// a person is not put through controls. An agent judging is, unless `controls` says otherwise.
//
// What comes back is every record the run kept: comparisons, skips and controls. A turn that
// failed is a skip, never a loss: a rate limit says nothing about how well a rung thinks. If the
// judge was not shown to see, its comparisons come back marked `untrusted` and teach nothing.
// `turns` counts the agent being measured, against `maxTurns`; `judged` counts the judge.
export async function runCalibration({ kind = 'quick', cases = [], agent, model = null, reference, version = null, records = [], effort = null, intent = null, ask, judge, controls = judge?.id !== 'you', maxTurns = kind === 'quick' ? QUICK_CASES * 2 : FULL_MAX_TURNS, stop = () => false, onProgress = () => {}, now = () => new Date().toISOString(), run = randomUUID() } = {}) {
  let kept = [];
  const answers = new Map();
  let turns = 0;
  let judged = 0;
  let compared = 0;

  const answer = async (one, effort) => {
    const key = `${one.caseId}|${effort}`;
    if (answers.has(key)) return answers.get(key);
    turns += 1;
    let result = null;
    try { result = await ask({ question: one.question, agent, model, effort }); } catch (error) { result = { error: error.message }; }
    const text = String(result?.text ?? '').trim();
    // Why a turn failed is kept, in one short line: a measurement that fails in silence is tokens
    // spent with nothing to show and nothing to fix.
    const why = result?.error ? String(result.error).split('\n')[0].trim().slice(0, 160) : !text ? 'the agent answered nothing' : null;
    const value = { text, tokens: result?.usage ? budgetTokens(result.usage) : null, failed: Boolean(why), why };
    answers.set(key, value);
    return value;
  };
  const cost = (one) => Number(!answers.has(`${one.caseId}|${one.effort}`)) + Number(!answers.has(`${one.caseId}|${reference}`));
  // The judge's word on one blinded pair, turned back into what it says about `candidate`.
  const decide = async (one, candidate, usual, seed) => {
    const pair = blindPair(candidate, usual, seed);
    let choice = null;
    judged += 1;
    try { choice = await judge.decide({ question: one.question, first: pair.first, second: pair.second, caseId: one.caseId, intent: one.intent }); } catch { choice = null; }
    return unblind(choice, pair.candidateFirst);
  };
  const finish = (ended) => {
    const health = controls ? judgeHealth(kept, { run }) : null;
    if (health && health.status !== 'trusted') kept = kept.map((record) => (record.control || record.skipped ? record : { ...record, untrusted: true }));
    onProgress({ done: true, turns });
    return { run, records: kept, turns, judged, judge: health, ended };
  };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (kind === 'quick' && round > 0) break;
    const plan = planRound({ kind, cases, agent, model, reference, version, records: [...records, ...kept], effort, intent });
    if (!plan.length) break;
    for (const [index, one] of plan.entries()) {
      if (stop()) return finish('stopped');
      if (turns + cost(one) > maxTurns) return finish('budget');
      onProgress({ round, done: index, total: plan.length, turns, intent: one.intent });
      const base = { at: now(), run, kind, agent, model, version, intent: one.intent, caseId: one.caseId, effort: one.effort, reference };
      const usual = await answer(one, reference);
      const cheaper = await answer(one, one.effort);
      if (usual.failed || cheaper.failed) {
        const at = usual.failed ? reference : one.effort;
        kept.push({ ...base, skipped: 'failed', failedAt: at, why: (usual.failed ? usual.why : cheaper.why) ?? null, tokens: { effort: cheaper.tokens, reference: usual.tokens } });
        continue;
      }
      const verdict = await decide(one, cheaper.text, usual.text, `${run}|${one.caseId}|${one.effort}`);
      if (!verdict) { kept.push({ ...base, skipped: 'unjudged' }); continue; }
      kept.push({ ...base, verdict, judge: judge.id, tokens: { effort: cheaper.tokens, reference: usual.tokens } });
      compared += 1;

      if (!controls) continue;
      const checked = kept.filter((record) => record.control).length;
      if (checked >= CONTROL_MIN && compared % CONTROL_EVERY !== 0) continue;
      const caught = await decide(one, degrade(usual.text), usual.text, `${run}|${one.caseId}|control`);
      kept.push({ ...base, effort: null, control: true, judge: judge.id, ...(caught ? { verdict: caught } : { skipped: 'unjudged' }) });
      if (judgeHealth(kept, { run }).status === 'blind') return finish('judge-blind');
    }
  }
  return finish('done');
}
