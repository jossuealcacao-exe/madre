// The three tests that answer "is this room ready to be developed with?"
//
// The maturity reading counts what the archive is made of. It cannot tell you whether the archive
// works, because nothing about a pile of notes says whether the right one comes back when it is
// needed. Only a test says that, and a test is only worth running if it can fail.
//
//   1 · COVERAGE   — when this project asks its own questions, does the archive already hold the
//                    answer? Real human messages from the ledger, recall run at the point each
//                    one was asked, scored against the reply that was actually given.
//   2 · CONSISTENCY — does the archive contradict itself? Contradictions EYECAT is still holding,
//                    what has been taken out of circulation, and whether aberrations are being
//                    filed more often lately or less.
//   3 · MATCH      — does the local model, with this archive behind it, land where the frontier
//                    CLI landed? Real questions from the ledger, asked again locally, compared
//                    against the answer that was given at the time.
//
// What every one of them refuses to do is grade itself generously. Each reports how it measured
// (meaning or words), how many cases it had, and the bar it used, because a number without those
// three is a decoration.

import { t } from './i18n.mjs';

export const COVERAGE_SAMPLE = 30;
export const COVERAGE_BAR = 0.55;      // cosine between the reply and the closest thing recalled
export const COVERAGE_WORDS_BAR = 0.25;
export const MATCH_SAMPLE = 12;        // a local model answering is slow; honesty about that beats a big number
export const MATCH_BAR = 0.6;
// Every text in one room is about the same handful of subjects, so any two pieces of it read as
// similar to an embedder. Measured against a bar alone, the first run of coverage scored thirty
// out of thirty — a test that cannot fail measures nothing. So each case is also measured against
// a control: the same question scored against another case's material. To count, what the archive
// actually handed over has to beat what it would have handed over for something else.
export const CONTROL_MARGIN = 0.05;
export const MIN_ASK = 40;             // shorter than this is "ok", "sí", "dale": nothing to answer
export const PASS = { coverage: 0.7, match: 0.7 };

const rare = (text) => new Set(String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9][a-z0-9_/.-]{3,}/g) ?? []);

// How close two pieces of text are when there is nothing to embed them with. Not a semantic
// score and never reported as one: the share of the answer's own uncommon words that were
// already in front of the room.
export function wordScore(reference, candidate) {
  const want = rare(reference);
  const have = rare(candidate);
  if (!want.size || !have.size) return 0;
  let shared = 0;
  for (const word of want) if (have.has(word)) shared += 1;
  return shared / want.size;
}

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; left += a[i] * a[i]; right += b[i] * b[i]; }
  return left && right ? dot / Math.sqrt(left * right) : 0;
}

// Every human message in the ledger that actually got an answer, oldest first. Ghost turns never
// happened as far as the archive is concerned, and a one-word message has no answer to find.
export function exchanges(events = [], { minAsk = MIN_ASK, local = ['madre'] } = {}) {
  const asked = new Map();
  const out = [];
  for (const event of events) {
    if (!event || event.ghost) continue;
    const payload = event.payload ?? {};
    if (event.type !== 'message.created') continue;
    if (payload.role === 'user' && payload.sender === 'you') {
      const text = String(payload.text ?? '').trim();
      if (text.length >= minAsk && !text.startsWith('/')) asked.set(payload.messageId, { sequence: event.sequence, text, target: payload.target });
      continue;
    }
    if (payload.role !== 'assistant') continue;
    const parent = payload.parentMessageId ?? payload.replyTo ?? payload.inReplyTo ?? null;
    const question = parent ? asked.get(parent) : null;
    if (!question) continue;
    const answer = String(payload.text ?? '').trim();
    if (answer.length < minAsk) continue;
    asked.delete(parent);
    out.push({ sequence: question.sequence, answerSequence: event.sequence, asked: question.text, answered: answer, agent: payload.sender, local: local.includes(payload.sender) });
  }
  return out;
}

// The control partner for each case: far enough down the list that it is a different day and a
// different subject, and deterministic so a run can be repeated.
export const controlOf = (index, n) => (n > 1 ? (index + Math.floor(n / 2)) % n : 0);

// A sample spread across the whole ledger rather than taken off the end: fifty questions from one
// afternoon test one afternoon.
export function spread(items, size) {
  if (items.length <= size) return [...items];
  const step = items.length / size;
  return Array.from({ length: size }, (_, i) => items[Math.floor(i * step)]);
}

/* ---------- 1 · COVERAGE ---------- */

// `recall(text, beforeSequence)` hands back what the room would have been given at that moment.
// `embed(texts)` is optional; without it the scoring says so and uses words.
export async function coverageExam({ events = [], recall, embed = null, sample = COVERAGE_SAMPLE, bar = null } = {}) {
  const all = exchanges(events);
  const cases = spread(all, sample);
  if (!cases.length) return { id: 'coverage', ran: false, says: t('No exchange in this room is long enough to test with yet.') };
  const found = [];
  for (const one of cases) {
    const held = await recall(one.asked, one.sequence);
    found.push(held.map((item) => String(item ?? '')).filter(Boolean));
  }
  const method = embed ? 'meaning' : 'words';
  const used = bar ?? (embed ? COVERAGE_BAR : COVERAGE_WORDS_BAR);
  const scores = [];
  const controls = [];
  if (embed) {
    // One batch for the answers and one for everything that was recalled, so a remote embedder
    // is asked twice and not sixty times.
    const flat = found.flat();
    const vectors = await embed([...cases.map((one) => one.answered), ...flat]);
    const answers = vectors.slice(0, cases.length);
    const rest = vectors.slice(cases.length);
    const sets = [];
    let at = 0;
    for (const items of found) { sets.push(rest.slice(at, at + items.length)); at += items.length; }
    for (let i = 0; i < cases.length; i += 1) {
      const best = (set) => set.reduce((top, vector) => Math.max(top, cosine(answers[i], vector)), 0);
      scores.push(best(sets[i]));
      controls.push(best(sets[controlOf(i, cases.length)]));
    }
  } else {
    for (let i = 0; i < cases.length; i += 1) {
      const best = (set) => set.reduce((top, text) => Math.max(top, wordScore(cases[i].answered, text)), 0);
      scores.push(best(found[i]));
      controls.push(best(found[controlOf(i, cases.length)]));
    }
  }
  // To count, the archive must have handed over this answer's material, and material it would
  // not have handed over for a different question. With a single case there is nothing to
  // compare against, and the result says so rather than pretending otherwise.
  const controlled = cases.length > 1;
  const hit = scores.map((score, i) => score >= used && (!controlled || score > controls[i] + CONTROL_MARGIN));
  const hits = hit.filter(Boolean).length;
  const rate = Number((hits / cases.length).toFixed(3));
  const mean = (list) => Number((list.reduce((sum, value) => sum + value, 0) / list.length).toFixed(3));
  return {
    id: 'coverage', ran: true, at: new Date().toISOString(), n: cases.length, hits, rate, method, bar: used,
    mean: mean(scores), control: controlled ? mean(controls) : null,
    passed: rate >= PASS.coverage,
    says: t('{hits} of {n} questions this room actually asked had their answer already in the archive, matched by {method}{control}.', { hits, n: cases.length, method: t(method), control: controlled ? t(' and against a control') : '' }),
  };
}

/* ---------- 2 · CONSISTENCY ---------- */

// Pure. Contradictions still open, how much has been taken out of circulation, and whether the
// room is filing aberrations more often lately than it used to.
export function consistencyExam({ findings = [], notes = [], now = Date.now() } = {}) {
  const standing = notes.filter((note) => note && note.kind !== 'aberration' && !note.refutedBy);
  const refuted = notes.filter((note) => note && note.refutedBy).length;
  const aberrations = notes.filter((note) => note && note.kind === 'aberration');
  const open = findings.filter((finding) => !finding?.settled).length;
  const times = aberrations.map((note) => Date.parse(note.created)).filter((at) => Number.isFinite(at)).sort((a, b) => a - b);
  const written = notes.map((note) => Date.parse(note.created)).filter((at) => Number.isFinite(at)).sort((a, b) => a - b);
  let trend = null;
  if (written.length > 4 && times.length) {
    const middle = written[Math.floor(written.length / 2)];
    const before = times.filter((at) => at < middle).length;
    const after = times.length - before;
    trend = after === before ? 'level' : after < before ? 'falling' : 'rising';
  }
  const passed = open === 0 && trend !== 'rising';
  return {
    id: 'consistency', ran: true, at: new Date(now).toISOString(),
    open, refuted, standing: standing.length, aberrations: aberrations.length, trend,
    passed,
    says: open
      ? t('EYECAT is holding {n} contradictions nobody has settled.', { n: open })
      : trend === 'rising'
        ? t('Nothing is open, but aberrations are being filed more often lately than they used to be.')
        : t('Nothing contradicts anything: {standing} notes stand, {refuted} were taken out of circulation.', { standing: standing.length, refuted }),
  };
}

/* ---------- 3 · MATCH ---------- */

// `ask(question)` is the local model with this archive behind it. `embed` is needed: comparing
// two answers by their words rewards copying the question back.
export async function matchExam({ events = [], ask, embed, sample = MATCH_SAMPLE, bar = MATCH_BAR, onProgress = () => {}, stop = () => false } = {}) {
  if (!embed) return { id: 'match', ran: false, says: t('This test needs embeddings: two answers cannot be compared by their words alone.') };
  const all = exchanges(events).filter((one) => !one.local);   // a model is not tested against itself
  const cases = spread(all, sample);
  if (!cases.length) return { id: 'match', ran: false, says: t('No question in this room was answered by an agent other than the local one yet.') };
  const mine = [];
  for (const [index, one] of cases.entries()) {
    if (stop()) return { id: 'match', ran: false, stopped: true, says: t('Stopped after {index} of {n}.', { index, n: cases.length }) };
    onProgress({ done: index, total: cases.length });
    try { mine.push(String((await ask(one.asked)) ?? '')); } catch { mine.push(''); }
  }
  onProgress({ done: cases.length, total: cases.length });
  const vectors = await embed([...cases.map((one) => one.answered), ...mine]);
  const theirs = vectors.slice(0, cases.length);
  const ours = vectors.slice(cases.length);
  const scores = cases.map((_, i) => (mine[i] ? cosine(theirs[i], ours[i]) : 0));
  // Same control as coverage: an answer that is merely about the same project as every other
  // answer in the room has not landed anywhere.
  const controlled = cases.length > 1;
  const controls = cases.map((_, i) => (mine[i] && controlled ? cosine(ours[i], theirs[controlOf(i, cases.length)]) : 0));
  const matched = scores.filter((score, i) => score >= bar && (!controlled || score > controls[i] + CONTROL_MARGIN)).length;
  const rate = Number((matched / cases.length).toFixed(3));
  const mean = (list) => Number((list.reduce((sum, value) => sum + value, 0) / list.length).toFixed(3));
  return {
    id: 'match', ran: true, at: new Date().toISOString(), n: cases.length, matched, rate, mean: mean(scores), control: controlled ? mean(controls) : null, bar,
    passed: rate >= PASS.match,
    says: t('On {matched} of {n} real questions the local model landed where the agent of the day landed{control}.', { matched, n: cases.length, control: controlled ? t(', and not merely in the same project') : '' }),
  };
}

// A reading that was taken months ago is still read today, and the room may have changed its
// language since. The numbers are what was measured; the sentence is only how they are said, so
// it is said again, now, from the fields that were stored. A stored result that predates this
// keeps whatever sentence it was written with.
export function saysFor(result) {
  if (!result?.ran) return result?.says ?? null;
  if (result.id === 'coverage' && Number.isFinite(result.hits)) {
    return t('{hits} of {n} questions this room actually asked had their answer already in the archive, matched by {method}{control}.',
      { hits: result.hits, n: result.n, method: t(result.method ?? 'words'), control: result.control === null || result.control === undefined ? '' : t(' and against a control') });
  }
  if (result.id === 'match' && Number.isFinite(result.matched)) {
    return t('On {matched} of {n} real questions the local model landed where the agent of the day landed{control}.',
      { matched: result.matched, n: result.n, control: result.control === null || result.control === undefined ? '' : t(', and not merely in the same project') });
  }
  if (result.id === 'consistency' && Number.isFinite(result.open)) {
    return result.open
      ? t('EYECAT is holding {n} contradictions nobody has settled.', { n: result.open })
      : result.trend === 'rising'
        ? t('Nothing is open, but aberrations are being filed more often lately than they used to be.')
        : t('Nothing contradicts anything: {standing} notes stand, {refuted} were taken out of circulation.', { standing: result.standing, refuted: result.refuted });
  }
  return result.says ?? null;
}
