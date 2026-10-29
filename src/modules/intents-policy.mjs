// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Intenciones: how hard a turn needs to think, said before it is paid for.
//
// Pure functions. The room hands in the words, the thread they belong to and whatever the
// calibration has measured; nothing here calls a model, reads a file or touches the ledger.
//
// Only agents whose CLI takes an effort per run are in scope (EFFORTS in models.mjs). A
// suggestion for a CLI that has no such knob would be a guess about something MADRE cannot set.
//
// What this file does NOT do: decide. It says which effort the turn looks like it needs and why,
// and the human keeps or changes it. Like the @madre offer in routing.js, a caller that cannot say
// WHY it is suggesting something does not suggest it.
//
// Two kinds of why, and they are never confused:
//   rule      — the shape of the request (a lookup, a stack trace, "think it through"). Cheap,
//               immediate, and unmeasured: it is what the request looks like, not what it needed.
//   measured  — the calibration put real questions from this project to the same agent at two
//               efforts and a blind judge could not tell them apart. Measured beats rule.
//   observed  — the room's own turns, read after the fact (intents-observe.mjs): at this rung, for
//               this kind of request, the human moved on instead of asking again. It costs no
//               token, and it is weaker than a measurement: nobody saw the other rung's answer.
//               Measured beats observed, and observed beats rule.

import { EFFORTS } from '../models.mjs';
import { archiveQuestion } from '../../public/routing.js';

// The three tiers a rule may speak in, lightest first (light, standard, deep). They name rungs both
// ladders share, so a rule never proposes an extreme: `minimal`, `xhigh` and `max` are reached only
// by measurement or by the human choosing them.
export const TIER_EFFORT = { light: 'low', standard: 'medium', deep: 'high' };

// What each kind of request asks of a model before anything else is known about it. `archive` is
// absent on purpose: a question about what the room already said is routing.js's to answer, by
// offering @madre, and two offers on one message would compete.
export const INTENT_TIER = {
  chat: 'light',
  lookup: 'light',
  explain: 'standard',
  review: 'standard',
  implement: 'standard',
  diagnose: 'deep',
  design: 'deep',
};

// OpenCode's rungs are each model's (2026-10-14): with no one ladder to climb, Intenciones leaves it be.
export const effortLadder = (agentId) => (agentId === 'opencode' ? null : EFFORTS[agentId] ?? null);

const fold = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// The verb that says what is being asked. In Spanish it can sit anywhere: "quiero que trabajes
// en…" carries its verb in the middle, and so does "perfecto, comencemos: cablea…". The earliest
// one wins, and the imperative, infinitive and subjunctive forms all count because all three are
// how people write to an agent. English only counts at the head of the request, because half its
// verbs are also nouns — "the build", "the update", "the fix" — and a noun is not an order.
const VERBS = [
  ['diagnose', /\b(arregl(a|ar|es|emos)|corrig(e|as|amos)|correg(ir|imos)|repar(a|ar|es)|depur(a|ar|es)|investig(a|ar|ues)|diagnostic(a|ar|ues))\b/, 'fix|debug|troubleshoot|investigate|diagnose'],
  ['implement', /\b(implement(a|ar|es|emos)?|agreg(a|ar|ues|uemos)|anad(e|ir|as|amos)|cre(a|ar|emos)|escrib(e|ir|as|amos)|haz|hacer|hagas|hagamos|cambi(a|ar|es|emos)|refactoriz(a|ar|es)|migr(a|ar|es|emos)|renombr(a|ar|es)|muev(e|as)|mover|elimin(a|ar|es)|borr(a|ar|es)|actualiz(a|ar|es)|constru(ye|ir|yas|yamos)|trabaj(a|ar|es|emos)|cabl(ea|ear|ees|eemos)|conect(a|ar|es))\b/, 'implement|add|create|write|build|make|change|refactor|rename|move|remove|delete|update|wire|ship'],
  ['review', /\b(revis(a|ar|es|emos)|audit(a|ar|es)|evalu(a|ar|es)|critic(a|ar|ques)|analiz(a|ar|es|amos)|verific(a|ar|ques))\b/, 'review|audit|evaluate|assess|critique|analy[sz]e|check'],
  ['design', /\b(disen(a|ar|es|emos)|plane(a|ar|es)|planific(a|ar|ques)|propon(er|gas|gamos)?|compar(a|ar|es|emos))\b/, 'design|plan|propose|compare|architect'],
  ['explain', /\b(explic(a|ar|ques)|describ(e|ir|as)|resum(e|ir|as)|cuentame|ensename)\b/, 'explain|describe|summari[sz]e|walk me through'],
].map(([intent, spanish, english]) => [intent, spanish, new RegExp(`^\\W*(?:(?:please|pls|can you|could you|would you|will you|i want you to|i need you to|let'?s|now|then|also|and|ok|okay)[\\s,]+)*(?:${english})\\b`)]);

// What refines a verb. "Explica por qué falla" is a diagnosis however politely it is asked, and
// "analiza esta idea" is a design question rather than a code review.
const FAILURE = /\b(errore?s?|fallan?|fallando|fallo|crash(ea)?|truena|tronando|se cae|se rompe|rot[oa]|rompio|no funciona|sin funcionar|sigue fallando|no sirve|no jala|no arranca|no compila|no carga|bugs?|traceback|stack ?trace|exception|excepcion|regresion|regression|broken|broke|fails?|failing|failed|doesn'?t work|not working|throws?|panic)\b/;
const STACK = /^\s+at \S.*:\d+(:\d+)?\)?\s*$|^Traceback \(most recent call last\)|^\s*File "[^"]+", line \d+|^\w*(Error|Exception): \S/m;
const DESIGN = /\b(idea|estrategia|propuesta|arquitectura|trade-?offs?|monetiz\w*|negocio|enfoque|alternativas?|opciones|conviene|deberiamos|vale la pena|pros y contras|roadmap|should we|which approach|architecture|strategy|proposal|approach|worth it)\b/;
const EXPLAIN = /\b(como funciona|por que|que hace|para que sirve|how does|how do|why|what does)\b/;
const LOOKUP = /^\W*(donde|cual(es)?|cuant[oa]s?|cuando|quien|que (version|puerto|comando|archivo|rama|modelo|variable)|hay (un|una|algun)|where|which|when|who|how many|is there|what('s| is) the)\b/;
const THANKS = /^\W*(gracias|thanks|thank you|ok(ay)?|vale|perfecto|genial|excelente|listo|entendido|got it|great|nice|cool)\b/;

// "Sí, hazlo" means whatever was being discussed, done. The message carries no intent of its own.
// Only the whole message counts: "si cambias X, ¿qué pasa?" starts like a yes and is a question.
const GO_AHEAD = /^\W*((ok(ay)?|perfecto|va|bien|genial|si)[\s,.!]+)*(si|dale|va|adelante|hazlo|procede|comencemos|empecemos|continua|sigue|go ahead|do it|proceed|yes|yep|sure|ship it|let'?s go|let'?s do it)([\s,.!]+(por favor|please|hazlo|adelante|dale|con eso|asi))*\W*$/;
const GO_AHEAD_MAX = 60;
// A go-ahead after a proposal, a review or a diagnosis is the order to carry it out; after an
// explanation it is "keep going" and stays what it was.
const CARRIED_OUT = new Set(['design', 'review', 'diagnose', 'implement']);

export function classifyIntent(text = '', { previous = null } = {}) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  if (archiveQuestion(raw)) return { intent: 'archive', cues: ['archive'] };
  const said = fold(raw);

  if (raw.length <= GO_AHEAD_MAX && GO_AHEAD.test(said) && previous?.intent && previous.intent !== 'archive') {
    return { intent: CARRIED_OUT.has(previous.intent) ? 'implement' : previous.intent, cues: ['go-ahead'] };
  }

  let lead = null;
  let at = Infinity;
  for (const [intent, spanish, english] of VERBS) {
    const match = spanish.exec(said) ?? english.exec(said);
    if (match && match.index < at) { lead = intent; at = match.index; }
  }
  const failing = FAILURE.test(said) || STACK.test(raw);
  const cues = lead ? [`verb:${lead}`] : [];
  if (failing) cues.push('failure');

  // A fix with nothing failing in it is an edit: "arregla el typo del README" is not a hunt.
  if (lead === 'diagnose' && !failing) return { intent: 'implement', cues };
  if (lead === 'diagnose' || lead === 'implement') return { intent: lead, cues };
  // A request to read or explain something that is failing is a diagnosis; a review of an idea or
  // of a choice between approaches is design. The verb alone undersells both. Designing the error
  // handling is still design, and explaining the architecture is still an explanation.
  if (failing && lead !== 'design') return { intent: 'diagnose', cues };
  if ((lead === null || lead === 'review') && DESIGN.test(said)) return { intent: 'design', cues: [...cues, 'design'] };
  if (lead) return { intent: lead, cues };
  if (EXPLAIN.test(said)) return { intent: 'explain', cues: ['explain'] };
  if (LOOKUP.test(said) && raw.length <= 160) return { intent: 'lookup', cues: ['lookup'] };
  if (THANKS.test(said) && raw.length <= 40 && !raw.includes('?')) return { intent: 'chat', cues: ['thanks'] };
  // Something was asked and nothing above says what kind of thing: the middle of the ladder is
  // the honest default, and it is the one most CLIs start at anyway.
  return { intent: 'explain', cues: ['unclassified'] };
}

// What the human said about effort in so many words. Both at once cancel out.
const QUICK = /\b(rapido|rapidito|breve|brevemente|corto|en una linea|en pocas palabras|solo dime|nada mas dime|sin rodeos|quick(ly)?|brief(ly)?|short answer|in one line|tl;?dr|just tell me)\b/;
const DEEP = /(\bpiensa (bien|a fondo|con calma|detenidamente)\b|\ba fondo\b|\bcon cuidado\b|\bdetenidamente\b|\bprofund\w*|\bexhaustiv\w*|\bminucios\w*|\briguros\w*|\bthink (hard|harder|carefully|deeply)\b|\bcarefully\b|\bin depth\b|\bthorough(ly)?\b|\bultrathink\b)/;
// The same request again, because the last answer did not do it.
const RETRY = /\b(sigue sin|sigue fallando|todavia no (funciona|sirve|jala)|aun no (funciona|sirve|jala)|no funciono|no sirvio|still (fails|failing|broken|not working)|didn'?t work|doesn'?t work yet)\b/;
// Long enough that reading it is work: a pasted log, a spec, several files at once.
export const HEAVY_CHARS = 1500;
export const HEAVY_FILES = 3;

// Every way the turn's own context moves the effort, one rung each, with its name.
export function contextSignals(text = '', { previous = null, references = 0, attachments = 0, quota = null } = {}) {
  const raw = String(text ?? '');
  const said = fold(raw);
  const signals = [];
  const quick = QUICK.test(said);
  const deep = DEEP.test(said);
  if (quick && !deep) signals.push({ id: 'asked-quick', shift: -1 });
  if (deep && !quick) signals.push({ id: 'asked-deep', shift: 1 });
  if (raw.length > HEAVY_CHARS || STACK.test(raw) || Number(references) + Number(attachments) >= HEAVY_FILES) signals.push({ id: 'heavy', shift: 1 });
  if (['failed', 'bad'].includes(previous?.outcome) || RETRY.test(said)) signals.push({ id: 'retry', shift: 1 });
  // An agent near the end of its window is not the place for the deepest rung: the next turn may
  // be the one that does not run at all. A cap, not a push down: light work stays light.
  if (['critical', 'exhausted'].includes(quota?.level)) signals.push({ id: 'quota', cap: 'standard' });
  return signals;
}

// What the last exchange in this conversation asked and how it went, read from the ledger. The
// outcome is the human's word on the reply if there is one, or the fact that it failed.
export function threadContext(events = [], { agent = null } = {}) {
  let last = null;
  const replies = new Map();
  const failed = new Set();
  const ratings = new Map();
  for (const event of events) {
    if (!event || event.ghost) continue;
    const p = event.payload ?? {};
    if (event.type === 'message.created' && p.role === 'user' && p.sender === 'you' && (!agent || p.target === agent)) last = p;
    if (event.type === 'message.created' && p.role === 'assistant' && p.parentMessageId) replies.set(p.parentMessageId, p.messageId);
    if (event.type === 'message.failed' && p.messageId) failed.add(p.messageId);
    if (event.type === 'message.rated' && p.messageId) ratings.set(p.messageId, p.rating);
  }
  if (!last) return null;
  const reply = replies.get(last.messageId);
  const rating = reply ? ratings.get(reply) : null;
  const outcome = failed.has(last.messageId) ? 'failed'
    : ['bad', 'never'].includes(rating) ? 'bad'
      : ['good', 'preference'].includes(rating) ? 'good'
        : null;
  return { intent: classifyIntent(last.text)?.intent ?? null, effort: last.effort ?? null, outcome };
}

/* ---------- measured ---------- */

// A cheaper rung is enough when, against the agent's usual rung, a blind judge rarely prefers the
// usual one. "Rarely" with a number on it: at 80% confidence the cheaper one loses at most one
// comparison in four. With six cases that means none lost; with twelve, one.
export const MIN_COMPARISONS = 6;
export const MAX_COMPARISONS = 20;
export const LOSS_BAR = 0.25;
export const CONFIDENCE_Z = 1.28;
export const COMPARISON_VERDICTS = ['worse', 'same', 'better'];

function wilson(hits, n, z, sign) {
  if (!n) return sign > 0 ? 1 : 0;
  const p = hits / n;
  const z2 = z * z;
  const centre = p + z2 / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.min(1, Math.max(0, (centre + sign * spread) / (1 + z2 / n)));
}
export const wilsonUpper = (hits, n, z = CONFIDENCE_Z) => wilson(hits, n, z, 1);
export const wilsonLower = (hits, n, z = CONFIDENCE_Z) => wilson(hits, n, z, -1);

// One rung against the reference: enough, not enough, or not known yet. Twenty comparisons that
// still cannot show it is enough are an answer too: not cheaply enough to be worth suggesting.
export function rungStatus(stats) {
  const n = Number(stats?.n ?? 0);
  const worse = Number(stats?.worse ?? 0);
  if (n < MIN_COMPARISONS) return 'open';
  if (wilsonUpper(worse, n) <= LOSS_BAR) return 'sufficient';
  if (n >= MAX_COMPARISONS || wilsonLower(worse, n) > LOSS_BAR) return 'insufficient';
  return 'open';
}

export const evidenceKey = (agent, model, intent) => `${agent}|${model ?? 'default'}|${intent}`;

// Every comparison the calibration kept, folded per agent, model and intent. A comparison made
// under another version of the CLI measured another program and is left out; one made against a
// different reference rung answers a different question, so only the latest reference counts.
export function foldEvidence(records = [], { versions = {} } = {}) {
  const usable = records.filter((record) => record
    && !record.skipped
    // A control measures the judge, not a rung; an untrusted comparison was made by a judge that
    // failed its controls, so its word is not evidence of anything.
    && !record.control
    && !record.untrusted
    && COMPARISON_VERDICTS.includes(record.verdict)
    && effortLadder(record.agent)
    && !(versions[record.agent] && record.version && record.version !== versions[record.agent]));
  const reference = new Map();
  for (const record of usable) reference.set(evidenceKey(record.agent, record.model, record.intent), record.reference);
  const cells = new Map();
  for (const record of usable) {
    const key = evidenceKey(record.agent, record.model, record.intent);
    if (record.reference !== reference.get(key)) continue;
    const cell = cells.get(key) ?? { agent: record.agent, model: record.model ?? null, intent: record.intent, reference: record.reference, rungs: {}, tokens: {} };
    const rung = cell.rungs[record.effort] ?? { n: 0, worse: 0, same: 0, better: 0 };
    rung.n += 1;
    rung[record.verdict] += 1;
    cell.rungs[record.effort] = rung;
    for (const [effort, spent] of [[record.effort, record.tokens?.effort], [record.reference, record.tokens?.reference]]) {
      if (!Number.isFinite(spent)) continue;
      (cell.tokens[effort] ??= []).push(spent);
    }
    cells.set(key, cell);
  }
  return cells;
}

// The cheapest rung that is enough, walking down from the reference. "Low was as good as high" is a
// measurement of low, whatever nobody asked of medium, so a rung nobody measured is stepped over.
// A rung that was not enough is where the walk stops: below it, a lucky run is not believed. When
// the first rung measured on the way down was not enough, the answer is the reference itself.
export function lowestSufficient(cell, ladder) {
  if (!cell || !ladder) return null;
  const top = ladder.indexOf(cell.reference);
  if (top < 0) return null;
  let best = null;
  for (let i = top - 1; i >= 0; i -= 1) {
    const status = rungStatus(cell.rungs[ladder[i]]);
    if (status === 'sufficient') { best = ladder[i]; continue; }
    if (status === 'insufficient') {
      if (best === null) return { effort: cell.reference, n: cell.rungs[ladder[i]]?.n ?? 0, needsReference: true };
      break;
    }
  }
  return best ? { effort: best, n: cell.rungs[best].n, needsReference: false } : null;
}

// The rung the calibration should test next for one cell: the first one down that is still open.
// Null when the cell is settled — a rung was found not to be enough, or the ladder ran out.
export function nextRung(cell, ladder, reference) {
  const top = ladder?.indexOf(reference) ?? -1;
  if (top < 0) return null;
  for (let i = top - 1; i >= 0; i -= 1) {
    const status = rungStatus(cell?.rungs?.[ladder[i]]);
    if (status === 'open') return ladder[i];
    if (status === 'insufficient') return null;
  }
  return null;
}

/* ---------- observed ---------- */

// A rung is enough in real use when, out of at least eight turns of one kind at it, the human moved
// on often enough that even the pessimistic end of the interval is three in four. And it is not
// enough, whatever its own rate, when the rung above it was clearly better in the same use: a rung
// that holds 80% next to one that holds 99% is costing the human the other 19%.
export const OBSERVED_MIN_TURNS = 8;
export const OBSERVED_HELD_BAR = 0.75;

// The lowest rung of the ladder that real use showed to be enough, or null. `cell` is one entry of
// foldObserved(): { rungs: { [effort]: { n, held, short, tokens } } }. A rung outside the ladder
// (`default`, a turn sent with no effort to a CLI that never says its own) is never an answer.
export function lowestObservedSufficient(cell, ladder) {
  if (!cell?.rungs || !ladder) return null;
  for (let i = 0; i < ladder.length; i += 1) {
    const rung = cell.rungs[ladder[i]];
    if (!rung || rung.n < OBSERVED_MIN_TURNS || wilsonLower(rung.held, rung.n) < OBSERVED_HELD_BAR) continue;
    const above = ladder.slice(i + 1).map((effort) => cell.rungs[effort]).find((one) => one?.n > 0);
    if (above && above.n >= OBSERVED_MIN_TURNS && wilsonLower(above.held, above.n) > wilsonUpper(rung.held, rung.n)) continue;
    return { effort: ladder[i], n: rung.n, held: rung.held, heldRate: rung.held / rung.n };
  }
  return null;
}

// Whether a rung real use has seen enough of was not enough: the walk above passed over it with
// eight turns or more in hand. A raise from it is something the room saw, not something it guessed.
const observedShort = (cell, ladder, effort) => {
  const rung = cell?.rungs?.[effort];
  if (!rung || rung.n < OBSERVED_MIN_TURNS) return false;
  const lowest = lowestObservedSufficient(cell, ladder);
  return !lowest || ladder.indexOf(lowest.effort) > ladder.indexOf(effort);
};

const median = (list = []) => {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/* ---------- the suggestion ---------- */

// Which effort this turn looks like it needs, and why. Null when there is nothing honest to say:
// an agent without a ladder, a question for the archive, or a suggestion equal to what the turn
// would already run at.
//
// `effort` is what the composer has chosen (null = the CLI's own default); `defaultEffort` is that
// default when MADRE knows it (Codex's config.toml). `evidence` is foldEvidence()'s result and
// `observed` is foldObserved()'s (intents-observe.mjs): what the room's own turns showed.
export function suggestEffort({ text = '', agent, model = null, effort = null, defaultEffort = null, previous = null, references = 0, attachments = 0, quota = null, evidence = null, observed = null } = {}) {
  const ladder = effortLadder(agent);
  if (!ladder) return null;
  const read = classifyIntent(text, { previous });
  if (!read || read.intent === 'archive') return null;
  const from = effort ?? defaultEffort ?? null;

  const cell = evidence?.get?.(evidenceKey(agent, model, read.intent)) ?? null;
  const measured = lowestSufficient(cell, ladder);
  // Real use speaks only where the calibration has not, and only about what it saw: a cheaper rung
  // that held, or a raise from a rung it watched fall short. A rung nobody used is not a rung that
  // failed, so the lowest rung with enough turns says nothing about the ones below it.
  const seenCell = measured ? null : observed?.get?.(evidenceKey(agent, model, read.intent)) ?? null;
  let seen = lowestObservedSufficient(seenCell, ladder);
  if (seen && from !== null && ladder.includes(from) && ladder.indexOf(seen.effort) > ladder.indexOf(from) && !observedShort(seenCell, ladder, from)) seen = null;
  // With no rung known to start from, turns sent with no effort are the CLI's default at work. If
  // they held at least as well, and cost no more, there is nothing to say about a named rung.
  if (seen && from === null) {
    const usual = seenCell.rungs.default;
    if (usual?.n >= OBSERVED_MIN_TURNS && wilsonLower(usual.held, usual.n) >= OBSERVED_HELD_BAR
      && !(Number.isFinite(usual.tokens) && Number.isFinite(seenCell.rungs[seen.effort].tokens) && seenCell.rungs[seen.effort].tokens < usual.tokens)) seen = null;
  }
  const ruled = TIER_EFFORT[INTENT_TIER[read.intent]];
  const anchor = measured?.effort ?? seen?.effort ?? null;
  let index = ladder.indexOf(anchor ?? ruled);
  // A rule stays inside low…high. A measurement or an observation may go further in either
  // direction, because it was seen to be enough (or needed) rather than assumed.
  const floor = Math.min(ladder.indexOf(TIER_EFFORT.light), anchor ? ladder.indexOf(anchor) : Infinity);
  const ceiling = Math.max(ladder.indexOf(TIER_EFFORT.deep), cell ? ladder.indexOf(cell.reference) : -1, seen ? ladder.indexOf(seen.effort) : -1);

  const signals = contextSignals(text, { previous, references, attachments, quota });
  const moved = [];
  for (const signal of signals) {
    if (!signal.shift) continue;
    const next = Math.min(ceiling, Math.max(floor, index + signal.shift));
    if (next !== index) moved.push(signal.id);
    index = next;
  }
  // The cap gives way to a measurement: a rung the calibration, or real use, saw fall short is not
  // offered to save quota.
  const cap = signals.find((signal) => signal.cap);
  const capped = cap ? ladder.indexOf(TIER_EFFORT[cap.cap]) : -1;
  if (cap && index > capped && rungStatus(cell?.rungs?.[ladder[capped]]) !== 'insufficient' && !observedShort(seenCell, ladder, ladder[capped])) { index = capped; moved.push(cap.id); }

  const suggested = ladder[index];
  if (suggested === from) return null;
  const direction = from && ladder.includes(from) ? (ladder.indexOf(suggested) < ladder.indexOf(from) ? 'lower' : 'raise') : null;
  // An observation vouches for the rung it saw and nothing else: once the turn's own context has
  // moved the suggestion off it, what is left is a rule's word, and it is said as one.
  const basis = measured ? 'measured' : seen && suggested === seen.effort ? 'observed' : 'rule';

  // What the cheaper rung actually cost against the one it replaces, when both were measured — or,
  // from real use, the middle turn at each rung. With no rung to start from, the turns sent with no
  // effort are what the human pays today.
  let saving = null;
  if (basis === 'observed') {
    const here = seenCell.rungs[suggested]?.tokens;
    const there = seenCell.rungs[from ?? 'default']?.tokens;
    if (direction !== 'raise' && Number.isFinite(here) && Number.isFinite(there) && there > 0) saving = Number((1 - here / there).toFixed(2));
  } else {
    const spentHere = median(cell?.tokens?.[suggested]);
    const spentThere = median(cell?.tokens?.[from]);
    saving = direction === 'lower' && spentHere !== null && spentThere ? Number((1 - spentHere / spentThere).toFixed(2)) : null;
  }

  return {
    agent,
    model,
    intent: read.intent,
    cues: read.cues,
    effort: suggested,
    from,
    direction,
    basis,
    signals: moved,
    measured: measured ? { n: measured.n, reference: cell.reference, needsReference: measured.needsReference } : null,
    observed: basis === 'observed' ? { n: seen.n, held: seen.held, heldRate: Number(seen.heldRate.toFixed(2)), rung: seen.effort } : null,
    saving,
  };
}

// Whether a suggestion is worth putting in front of the human. A measured one always is: the room
// saw it. A rule only speaks up to raise the effort, because a request that looks like a hunt run
// cheaply wastes the whole turn, while a rule that says "this looks cheap" has measured nothing and
// would be asking the human to trust a guess with their answer.
//
// When the CLI never says what effort it runs at by default (Claude does not), there is no rung to
// raise from. A rule then still speaks for the deep kinds — «this one wants HIGH» names a level,
// not a comparison — and the light ones become an invitation to measure, below.
const deepEnough = (suggestion) => (effortLadder(suggestion.agent) ?? []).indexOf(suggestion.effort) >= (effortLadder(suggestion.agent) ?? []).indexOf(TIER_EFFORT.deep);
// An observed one is offered like a measured one: the room saw it in this project's own turns.
export const offerable = (suggestion) => Boolean(suggestion) && (['measured', 'observed'].includes(suggestion.basis) || suggestion.direction === 'raise' || (suggestion.direction === null && suggestion.from === null && deepEnough(suggestion)));

// The other half: a rule that says a cheaper rung would do. It is never offered as advice, because
// nothing backs it; it is offered as a question worth measuring — and only for the kinds of request
// a read-only test can measure.
export const MEASURABLE = ['lookup', 'explain', 'review', 'diagnose', 'design'];
export const invitable = (suggestion) => Boolean(suggestion) && suggestion.basis === 'rule' && MEASURABLE.includes(suggestion.intent)
  && (suggestion.direction === 'lower' || (suggestion.direction === null && suggestion.from === null && !deepEnough(suggestion)));
