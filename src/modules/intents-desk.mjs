// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The desk behind Intenciones: what this project has measured, what is being measured now, and
// what that says about the message being written.
//
// One desk per project, because what an agent needs is a fact about this project's work and not
// about one conversation. Its measurements live next to the project's room, in intents.jsonl, and
// never in a conversation's ledger: a calibration is not something anybody said.
//
// It spends turns only when the human presses a button, and only through the same door the
// archivist uses: the agent's own CLI, read-only, with no lease and no tools beyond its own. The
// quick test waits for the human's word on each pair; the full one asks an impartial agent and
// tests that agent before believing it (intents-calibration.mjs).
//
// Most of what it knows it learns for free: every turn the human already sent, read after the fact
// (intents-observe.mjs). That reading lives in memory only; it is the ledger, looked at again.

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { t } from '../i18n.mjs';
import { classifyUsagePercent } from '../usage-sentinel.mjs';
import {
  classifyIntent, effortLadder, evidenceKey, foldEvidence, INTENT_TIER, invitable, lowestSufficient, offerable,
  rungStatus, suggestEffort, threadContext, OBSERVED_MIN_TURNS, TIER_EFFORT,
} from './intents-policy.mjs';
import { foldObserved, observable, observedSummary, observeTurns } from './intents-observe.mjs';
import { defaultHeld, knownDefault, triedOutcome, tryCooldown, tryRung, TRY_EVERY, TRY_INTENTS, TRY_MODES } from './intents-try.mjs';
import {
  calibrationCases, calibrationSummary, estimateTurns, judgeForAgent, judgePrompt, mayCalibrate,
  parseJudgement, planRound, runCalibration, usualEffort, QUICK_CASES, READ_ONLY_INTENTS,
} from './intents-calibration.mjs';

// A calibration turn is a real turn of the CLI, reading the project as it would for the human.
export const ASK_TIMEOUT_MS = 300000;
const CHOICES = new Set(['first', 'second', 'same']);

// What the provider last said about this agent's window, as the room heard it.
export function usageOf(events = [], agent) {
  let last = null;
  for (const event of events) if (event?.type === 'quota.updated' && event.payload?.agent === agent) last = event.payload;
  return last ? { usedPercent: last.usedPercent, resetAt: last.resetAt ?? null } : null;
}

const versionsOf = (agents = []) => Object.fromEntries(agents.filter((agent) => agent.version).map((agent) => [agent.id, agent.version]));

export class IntentsDesk {
  #file;
  #offersFile;
  #events;
  #projectEvents;
  #project = null;
  #ledgers;
  #defaults;
  #observed = null;
  #bench;
  #projectRoot;
  #records = null;
  #offers = null;
  #run = null;
  #last = null;
  #pending = null;
  #controller = null;
  #stopping = false;
  #running = null;
  // Where the run stands, for the pair the human is shown: which question of how many, and its kind.
  #pendingAt = { step: 0, total: 0, intent: null };
  // Trying a cheaper rung on one message (intents-try.mjs), kept in memory per agent, model and kind:
  // how many messages that qualified for a try have gone out, and the last try the human took.
  #tryPace = new Map();
  #tried = new Map();
  #clock;

  // `events()` is the open conversation's ledger: the thread a suggestion reads and the quota the
  // provider reported. `projectEvents()` is what was said in every conversation of the project,
  // where the questions to calibrate with come from. `bench()` is room.bench(): the agents, their
  // invokers and who is busy. Everything else is files under the project's room.
  // `ledgers()` is every conversation's turns, cut down by observable(), for learning from real use;
  // without it the open conversation is all there is. `defaults()` is the effort each CLI runs at
  // when it is told none, where MADRE knows it ({ codex: 'medium' }).
  // `clock()` is now, in ms; a test hands in its own.
  constructor({ file, offersFile, events, projectEvents = null, ledgers = null, defaults = null, bench, projectRoot, clock = () => Date.now() }) {
    this.#clock = clock;
    this.#file = file;
    this.#offersFile = offersFile;
    this.#events = events;
    this.#projectEvents = projectEvents ?? events;
    this.#ledgers = ledgers ?? (async () => (await events()).map((event) => observable(event)).filter(Boolean));
    this.#defaults = defaults ?? (async () => ({}));
    this.#bench = bench;
    this.#projectRoot = projectRoot;
  }

  // Every conversation of the project, read at most every few seconds: the composer asks while the
  // human types, and the questions in a project do not change between two keystrokes.
  static PROJECT_TTL_MS = 20000;
  async #said() {
    const now = Date.now();
    if (this.#project && now - this.#project.at < IntentsDesk.PROJECT_TTL_MS) return this.#project.events;
    const events = await this.#projectEvents();
    this.#project = { at: now, events };
    return events;
  }

  // Every turn of the project, as real use judged it. Read at most every few seconds, like the
  // questions, and worked out again only when the ledger grew or a turn that was too recent to say
  // has become old enough to.
  async observations() {
    const now = this.#clock();
    const kept = this.#observed;
    if (kept && now - kept.at < IntentsDesk.PROJECT_TTL_MS && now < kept.until) return kept.list;
    const [events, defaults] = await Promise.all([this.#ledgers(), this.#defaults().catch(() => ({}))]);
    const signature = `${events.length}|${events.at(-1)?.chat ?? ''}|${events.at(-1)?.sequence ?? ''}|${JSON.stringify(defaults ?? {})}`;
    if (kept && kept.signature === signature && now < kept.until) {
      kept.at = now;
      return kept.list;
    }
    const list = observeTurns(events, { defaults: defaults ?? {}, now });
    const until = list.reduce((soonest, one) => (one.settles ? Math.min(soonest, one.settles) : soonest), Infinity);
    this.#observed = { at: now, signature, until, list };
    return list;
  }

  async records() {
    if (this.#records) return this.#records;
    const text = await readFile(this.#file, 'utf8').catch(() => '');
    this.#records = text.split('\n').filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
    return this.#records;
  }

  async #keep(records) {
    if (!records.length) return;
    await this.records();
    await mkdir(dirname(this.#file), { recursive: true });
    await appendFile(this.#file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
    this.#records.push(...records);
  }

  async offers() {
    if (this.#offers) return this.#offers;
    let kept = {};
    try { kept = JSON.parse(await readFile(this.#offersFile, 'utf8')) ?? {}; } catch { kept = {}; }
    this.#offers = { shown: 0, accepted: 0, ...kept, tries: { shown: 0, accepted: 0, ...(kept.tries ?? {}) } };
    return this.#offers;
  }

  // A message went out. Counted once per message, never per keystroke: an offer shown with it, and
  // whether the human took it — how often they do is the only number that says whether this is
  // worth anything. A try is an offer too, and is also counted on its own; taken, it is the try the
  // next messages of its kind are read against. `explore` names the kind when the message qualified
  // for a try, shown or not: that is what paces them. `basis: 'tried'` is the word that a try fell
  // short, said once.
  async offered({ accepted = false, shown = true, kind = null, basis = null, agent = null, model = null, intent = null, effort = null, from = null, explore = null } = {}) {
    const offers = await this.offers();
    const ladder = effortLadder(agent);
    if (ladder && intent) {
      const key = evidenceKey(agent, model, intent);
      if (kind === 'try' && accepted && ladder.includes(effort)) this.#tried.set(key, { agent, model, intent, effort, from: ladder.includes(from) ? from : null, at: this.#clock() });
      else if (basis === 'tried') this.#tried.delete(key);
    }
    if (explore && effortLadder(explore.agent) && TRY_INTENTS.includes(explore.intent)) {
      const key = evidenceKey(explore.agent, explore.model ?? null, explore.intent);
      this.#tryPace.set(key, (this.#tryPace.get(key) ?? 0) + 1);
    }
    if (!shown) return offers;
    offers.shown += 1;
    if (accepted) offers.accepted += 1;
    if (kind === 'try') {
      offers.tries.shown += 1;
      if (accepted) offers.tries.accepted += 1;
    }
    await mkdir(dirname(this.#offersFile), { recursive: true });
    await writeFile(this.#offersFile, JSON.stringify(offers));
    return offers;
  }

  // What to say about the message being written, or null.
  async suggest(asked = {}) {
    return (await this.consider(asked)).suggestion;
  }

  // What to say about the message being written, and whether it qualifies for a try. In order:
  //   a measured offer — the strongest word there is;
  //   going back up, once, after a try fell short;
  //   any other offer offerable() lets through — something real use saw, or a rule that asks for more;
  //   a try — a rule that says one rung less would do, run on this one message so real use can see;
  //   an invitation — a rule that says less would do, on an agent nobody has measured here yet: not
  //   advice, a question worth six answers.
  // `mode` is the permission mode the message would go out in. `explore` is set whenever the message
  // qualifies for a try, offered or held back by the pace, so the message that leaves can be counted.
  async consider({ text = '', agent, model = null, effort = null, defaultEffort = null, references = 0, attachments = 0, mode = null } = {}) {
    const none = { suggestion: null, explore: null };
    if (!effortLadder(agent)) return none;
    const events = await this.#events();
    const usage = usageOf(events, agent);
    const { agents = [] } = this.#bench() ?? {};
    const records = await this.records();
    const observations = await this.observations();
    const evidence = foldEvidence(records, { versions: versionsOf(agents) });
    const observed = foldObserved(observations);
    const quota = usage ? { level: classifyUsagePercent(usage.usedPercent) } : null;
    const previous = threadContext(events, { agent });
    const asked = { text, agent, model, effort, defaultEffort, references, attachments, previous, quota };
    const suggestion = suggestEffort({ ...asked, evidence, observed });
    if (offerable(suggestion) && suggestion.basis === 'measured') return { suggestion: { ...suggestion, kind: 'offer' }, explore: null };
    const read = classifyIntent(text, { previous });
    const back = this.#goBack({ read, agent, model, from: effort ?? defaultEffort ?? null, observations });
    if (back) return { suggestion: back, explore: null };
    if (offerable(suggestion)) return { suggestion: { ...suggestion, kind: 'offer' }, explore: null };
    const trial = this.#trial({ read, asked, mode, evidence, observed, observations });
    if (trial.suggestion) return trial;
    const invite = await this.#invite(suggestion, { agent, model, agents, records });
    return { suggestion: invite, explore: trial.explore };
  }

  // After a try the human took fell short — asked again, a thumbs-down, a failure, sent again
  // higher — the next message of that kind to that agent offers to go back to where it was. Once:
  // it is put away when that message leaves, and a try that held is simply forgotten.
  #goBack({ read, agent, model, from, observations }) {
    const intent = read?.intent;
    if (!TRY_INTENTS.includes(intent)) return null;
    const key = evidenceKey(agent, model, intent);
    const tried = this.#tried.get(key);
    if (!tried) return null;
    const one = triedOutcome(observations, tried);
    if (!one || one.outcome === 'unknown') return null;
    const ladder = effortLadder(agent);
    const to = tried.from ?? from;
    if (one.outcome === 'held' || (from !== null && to !== null && ladder.indexOf(from) > ladder.indexOf(to))) {
      this.#tried.delete(key);
      return null;
    }
    return {
      kind: 'offer', agent, model, intent, cues: read.cues, effort: to, from,
      direction: 'raise', basis: 'tried', signals: [], measured: null, observed: null, saving: null,
      tried: { effort: tried.effort, why: one.why },
    };
  }

  // Whether this message qualifies for a try, and the try when the pace lets one through. Every rule
  // is in intents-try.mjs; what is checked here is the order they are read in.
  #trial({ read, asked, mode, evidence, observed, observations }) {
    const none = { suggestion: null, explore: null };
    const { agent, model, effort, defaultEffort, quota } = asked;
    const intent = read?.intent;
    if (!TRY_INTENTS.includes(intent) || !TRY_MODES.includes(mode)) return none;
    if (['critical', 'exhausted'].includes(quota?.level)) return none;
    const ladder = effortLadder(agent);
    const key = evidenceKey(agent, model, intent);
    // A measurement for this kind wins over a try, as it does over everything else.
    const cell = evidence.get(key) ?? null;
    if (lowestSufficient(cell, ladder)) return none;
    // What the rule alone says, with nothing measured or seen: a try is the rule's word, put to work.
    const rule = suggestEffort({ ...asked, evidence: null, observed: null });
    if (!rule || rule.basis !== 'rule') return none;
    const from = effort ?? defaultEffort ?? null;
    const seen = observed.get(key) ?? null;
    const lower = tryRung({ agent, intent, from, rule: rule.effort, defaultHeld: from === null && defaultHeld(seen) });
    if (!lower || rungStatus(cell?.rungs?.[lower]) === 'insufficient') return none;
    // Once real use has seen enough turns at the cheaper rung, it speaks for itself.
    const n = seen?.rungs?.[lower]?.n ?? 0;
    if (n >= OBSERVED_MIN_TURNS) return none;
    const until = tryCooldown(observations, { agent, model, intent, effort: lower });
    if (until !== null && this.#clock() < until) return none;
    const explore = { agent, model, intent, effort: lower };
    if ((this.#tryPace.get(key) ?? 0) % TRY_EVERY !== 0) return { suggestion: null, explore };
    return {
      suggestion: {
        kind: 'try', agent, model, intent, cues: rule.cues, effort: lower, from,
        direction: from === null ? null : 'lower', basis: 'try', signals: rule.signals,
        observedAtLower: n, needs: OBSERVED_MIN_TURNS,
      },
      explore,
    };
  }

  async #invite(suggestion, { agent, model, agents, records }) {
    if (!invitable(suggestion) || this.#run) return null;
    const subject = agents.find((one) => one.id === agent);
    if (!subject?.ready) return null;
    // Once this agent and model have been measured under the CLI installed now, the card is where
    // to measure more. A new version of the CLI is a new program, and the invitation comes back.
    const version = subject.version ?? null;
    if (records.some((record) => record.agent === agent && (record.model ?? null) === (model ?? null) && !(version && record.version && record.version !== version))) return null;
    const plan = planRound({ kind: 'quick', cases: calibrationCases(await this.#said()), agent, model, reference: suggestion.from, effort: suggestion.effort, intent: suggestion.intent, version, records });
    if (!plan.length) return null;
    return { ...suggestion, kind: 'invite', questions: plan.length, ofKind: plan.filter((one) => one.intent === suggestion.intent).length };
  }

  // The rung a cheaper one has to match: what the human usually asks this agent for, or the deep
  // tier when the ledger has never said.
  #reference(events, agent) {
    return usualEffort(events, agent) ?? TIER_EFFORT.deep;
  }

  // Where trying a cheaper rung stands for one agent and model, per kind a try may touch: the rung
  // a try would run at for a message of that kind with nothing else in it, how many decided turns
  // real use has at it, and whether tries are paused there. `from` is the rung messages go out at.
  #triesFor({ agent, model, from, evidence, observed, observations }) {
    const ladder = effortLadder(agent);
    const now = this.#clock();
    const out = [];
    for (const intent of TRY_INTENTS) {
      const key = evidenceKey(agent, model, intent);
      if (lowestSufficient(evidence.get(key), ladder)) continue;
      const seen = observed.get(key) ?? null;
      const effort = tryRung({ agent, intent, from, rule: TIER_EFFORT[INTENT_TIER[intent]], defaultHeld: from === null && defaultHeld(seen) });
      if (!effort) continue;
      const n = seen?.rungs?.[effort]?.n ?? 0;
      const until = tryCooldown(observations, { agent, model, intent, effort });
      const paused = until !== null && now < until;
      const status = paused ? 'paused' : n >= OBSERVED_MIN_TURNS ? 'settled' : n > 0 || this.#tried.has(key) ? 'trying' : 'ready';
      out.push({ intent, effort, n, needs: OBSERVED_MIN_TURNS, status, cooldownUntil: paused ? new Date(until).toISOString() : null });
    }
    return out;
  }

  // Everything the card shows. `models` is what the composer has chosen per agent: evidence is
  // per model, so the card reads the one the human would actually be sending to. `efforts` is the
  // rung each agent's messages go out at, when the composer knows it.
  async view({ models = {}, efforts = {} } = {}) {
    const events = await this.#said();
    const records = await this.records();
    const { agents = [] } = this.#bench() ?? {};
    const cases = calibrationCases(events);
    const crew = agents.filter((agent) => agent.detected && effortLadder(agent.id));
    const observations = await this.observations();
    const evidence = foldEvidence(records, { versions: versionsOf(agents) });
    const observed = foldObserved(observations);
    const defaults = await this.#defaults().catch(() => ({}));
    return {
      agents: crew.map((agent) => {
        const model = models[agent.id] ?? null;
        const reference = this.#reference(events, agent.id);
        const spec = { agent: agent.id, model, reference, version: agent.version ?? null };
        const full = planRound({ kind: 'full', cases, records, ...spec });
        const quick = planRound({ kind: 'quick', cases, records, ...spec });
        const mine = records.filter((record) => record.agent === agent.id && (record.model ?? null) === model);
        const spent = mine.reduce((sum, record) => sum + (record.tokens?.effort ?? 0) + (record.tokens?.reference ?? 0), 0);
        // What one answer has cost here, so a test says its price before it runs; and the tests that
        // failed, with the last reason, so a failure is something to fix, not a blank.
        const perAnswer = mine.flatMap((record) => [record.tokens?.effort, record.tokens?.reference]).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
        const typical = perAnswer.length ? perAnswer[Math.floor(perAnswer.length / 2)] : null;
        const failed = mine.filter((record) => record.skipped === 'failed');
        const lastFailed = failed.at(-1) ?? null;
        return {
          id: agent.id,
          label: agent.label ?? agent.id,
          version: agent.version ?? null,
          model,
          reference,
          ladder: effortLadder(agent.id),
          ready: Boolean(agent.ready),
          summary: calibrationSummary(records, spec),
          cases: Object.fromEntries(READ_ONLY_INTENTS.map((intent) => [intent, cases.filter((one) => one.intent === intent).length])),
          estimate: { quick: estimateTurns(quick), full: estimateTurns(full), perAnswer: typical },
          spent,
          failures: failed.length ? { n: failed.length, of: mine.length, why: lastFailed?.why ?? null, at: lastFailed?.at ?? null } : null,
          // What the turns the human already sent taught, at no cost: the lead of the card.
          observed: observedSummary(observations, { agent: agent.id, model }),
          // Trying a cheaper rung on one message, per kind: how far real use got at it, or the pause.
          tries: this.#triesFor({
            agent: agent.id, model, evidence, observed, observations,
            from: effortLadder(agent.id).includes(efforts[agent.id]) ? efforts[agent.id] : knownDefault(defaults ?? {}, agent.id, model),
          }),
        };
      }),
      // With how far it got (2026-10-28): the window shows the share of the test already done.
      running: this.#run ? { ...this.#run, step: this.#pendingAt?.step ?? 0, total: this.#pendingAt?.total ?? 0 } : null,
      // The pair on the table, with nothing in it that says which answer came from which rung.
      pending: this.#pending ? { step: this.#pending.step, total: this.#pending.total, intent: this.#pending.intent, question: this.#pending.question, first: this.#pending.first, second: this.#pending.second } : null,
      last: this.#last,
      offers: await this.offers(),
    };
  }

  // Starts a test in the background and answers at once. Refused, with the reason, when another
  // is running, when the agent cannot be asked, when its window is too full, or when there is
  // nothing in the ledger to ask it.
  // The quick test may be aimed (`reference`, `effort`, `intent`): the invitation under the composer
  // starts it from the rung the human is on, toward the one the rule names, on the kind of request
  // they were writing.
  async start({ kind = 'quick', agent, model = null, reference: from = null, effort = null, intent = null } = {}) {
    if (this.#run) return { error: t('A calibration is already running.') };
    if (!['quick', 'full'].includes(kind)) return { error: t('No such test "{kind}".', { kind }) };
    if (!effortLadder(agent)) return { error: t('@{agent} takes no effort per turn, so there is nothing to calibrate.', { agent }) };
    const bench = this.#bench() ?? {};
    const subject = (bench.agents ?? []).find((one) => one.id === agent);
    const invoke = subject ? bench.invokers?.[subject.adapter] : null;
    if (!subject?.ready || !invoke) return { error: t('@{agent} is not ready to answer.', { agent }) };

    const gate = mayCalibrate({ kind, usage: usageOf(await this.#events(), agent), byHuman: true });
    if (!gate.ok) return { error: t('@{agent} is too close to its usage limit for this period to spend turns on a test.', { agent }) };

    let judge;
    if (kind === 'quick') {
      judge = { id: 'you', decide: (shown) => new Promise((resolve) => { this.#pending = { ...shown, ...this.#pendingAt, resolve }; }) };
    } else {
      const picked = judgeForAgent(agent, bench);
      if (!picked) return { error: t('There is no impartial judge for @{agent}: another agent, or the local model, has to be ready.', { agent }) };
      judge = {
        id: picked.id,
        decide: async ({ question, first, second }) => {
          const result = await bench.invokers[picked.adapter]({ executable: picked.path, projectRoot: this.#projectRoot, prompt: judgePrompt({ question, first, second }), timeoutMs: ASK_TIMEOUT_MS, model: null, json: false, attachments: [], lease: null, scopes: { web: false, imageGen: false }, imageStudio: null, signal: this.#controller?.signal });
          return parseJudgement(result?.text);
        },
      };
    }

    const events = await this.#said();
    const records = await this.records();
    const cases = calibrationCases(events);
    const ladder = effortLadder(agent);
    const reference = ladder.includes(from) ? from : this.#reference(events, agent);
    const aimed = kind === 'quick' && ladder.indexOf(effort) >= 0 && ladder.indexOf(effort) < ladder.indexOf(reference) ? effort : null;
    const focus = kind === 'quick' && READ_ONLY_INTENTS.includes(intent) ? intent : null;
    const version = subject.version ?? null;
    const plan = planRound({ kind, cases, agent, model, reference, version, records, effort: aimed, intent: focus });
    if (!plan.length) return { error: t('Nothing left to ask @{agent} at this level: the history has no new questions of the kinds this test uses.', { agent }) };

    this.#controller = new AbortController();
    this.#stopping = false;
    this.#last = null;
    this.#pendingAt = { step: 0, total: kind === 'quick' ? Math.min(QUICK_CASES, plan.length) : plan.length, intent: null };
    this.#run = { kind, agent, model, reference, effort: kind === 'quick' ? plan[0].effort : null, intent: focus, judge: judge.id, startedAt: new Date().toISOString(), turns: 0, estimate: estimateTurns(plan) };
    const ask = ({ question, effort }) => invoke({ executable: subject.path, projectRoot: this.#projectRoot, prompt: question, timeoutMs: ASK_TIMEOUT_MS, model, effort, attachments: [], lease: null, scopes: { web: false, imageGen: false }, imageStudio: null, signal: this.#controller.signal });

    this.#running = (async () => {
      try {
        const result = await runCalibration({
          kind, cases, agent, model, reference, version, records, ask, judge, effort: aimed, intent: focus,
          stop: () => this.#stopping,
          onProgress: (at) => {
            if (at.done === true) return;
            this.#pendingAt = { step: at.done + 1, total: at.total, intent: at.intent ?? null };
            if (this.#run) this.#run.turns = at.turns;
          },
        });
        await this.#keep(result.records);
        const compared = result.records.filter((record) => record.verdict && !record.control);
        // Whether the kind the test was aimed at is now settled, and where: what the human is told
        // when it ends, and what the composer will offer from now on.
        const all = [...records, ...result.records];
        const row = focus ? calibrationSummary(all, { agent, model, reference, version }).intents.find((one) => one.intent === focus) : null;
        this.#last = {
          kind, agent, model, reference, effort: aimed ?? plan[0].effort, intent: focus,
          settled: row?.status === 'measured' ? row.effort : null,
          ended: result.ended, turns: result.turns, judge: result.judge,
          compared: compared.length,
          same: compared.filter((record) => record.verdict === 'same').length,
          worse: compared.filter((record) => record.verdict === 'worse').length,
        };
      } catch (error) {
        this.#last = { kind, agent, ended: 'error', error: error.message };
      } finally {
        this.#run = null;
        this.#pending = null;
        this.#controller = null;
      }
    })();
    return { started: kind, agent, reference, estimate: this.#run.estimate };
  }

  // The human's word on the pair on the table.
  answer(choice) {
    if (!this.#pending) return { error: t('There is no pair waiting for an answer.') };
    const { resolve } = this.#pending;
    this.#pending = null;
    resolve(CHOICES.has(choice) ? choice : null);
    return { ok: true };
  }

  // Stops after the turn in flight; a pair waiting for the human is put away unjudged.
  async stop() {
    if (!this.#run) return { stopping: false };
    this.#stopping = true;
    this.#controller?.abort();
    if (this.#pending) this.answer(null);
    await this.#running?.catch(() => null);
    return { stopping: true };
  }

  // For tests and for shutdown: the run in flight, settled.
  async settled() { await this.#running?.catch(() => null); }
}
