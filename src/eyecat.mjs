// EYECAT: the watcher that asks whether the room still believes what it wrote down.
//
// Pure functions here. Nothing in this file talks to a model, reads a file or touches the room;
// the server schedules it and hands it what it needs, the way it does with the distiller.
//
// What it watches for is not error but drift. Two notes that are about the same thing and cannot
// both be true; a note whose own citations do not say what it says. Either one quietly moves the
// project's context away from what was actually settled, and by the time a person notices, every
// turn since has been built on it.
//
// Independence is the whole design. A model that ratifies its own claim is worth nothing here,
// so a claim is never judged by whoever wrote it, nor by whoever wrote what it clashes with.
// The judge is given the two statements and nothing else: no transcript, no project history and
// no names, so it cannot be told who to believe and cannot be argued with. It runs after the
// turn, out of band, so no agent can address it or see its verdict.

const NEGATORS = /\b(no|not|never|non|sin|nunca|ningun[ao]?|jamas|isn't|aren't|doesn't|don't|won't|cannot|can't)\b/gi;
const ORDERINGS = [['before', 'after'], ['antes', 'despues'], ['first', 'last'], ['primero', 'ultimo'], ['above', 'below'], ['enabled', 'disabled'], ['on', 'off'], ['encendido', 'apagado']];

const fold = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const words = (text) => fold(text).match(/[a-z0-9][a-z0-9_./:-]*/g) ?? [];
// Terms worth comparing: the ones that carry meaning rather than grammar.
const TRIVIAL = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'be', 'it', 'its', 'this', 'that', 'with', 'by', 'at', 'as', 'from', 'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'en', 'un', 'una', 'que', 'se', 'su', 'es', 'son', 'por', 'para', 'con', 'al', 'lo']);
const meaningful = (text) => new Set(words(text).filter((word) => word.length > 2 && !TRIVIAL.has(word)));

const countNegations = (text) => (fold(text).match(NEGATORS) ?? []).length;
const numbersIn = (text) => (fold(text).match(/\b\d+(?:\.\d+)?\b/g) ?? []);
// Things a project is specific about: paths, flags, dotted names, ports.
const identifiersIn = (text) => (fold(text).match(/\b[a-z0-9_-]+(?:[./][a-z0-9_.-]+)+\b|--[a-z][a-z0-9-]*/g) ?? []);

// Why two statements about the same thing might not both be true. Each signal is a cheap,
// deterministic reason to look closer; none of them is a verdict.
export function contradictionSignals(a, b) {
  const signals = [];
  if (countNegations(a) !== countNegations(b)) signals.push('negation');
  const foldedA = fold(a);
  const foldedB = fold(b);
  for (const [one, other] of ORDERINGS) {
    const hasA = new RegExp(`\\b${one}\\b`).test(foldedA) && !new RegExp(`\\b${other}\\b`).test(foldedA);
    const hasB = new RegExp(`\\b${other}\\b`).test(foldedB) && !new RegExp(`\\b${one}\\b`).test(foldedB);
    const flipped = new RegExp(`\\b${other}\\b`).test(foldedA) && new RegExp(`\\b${one}\\b`).test(foldedB);
    if ((hasA && hasB) || flipped) { signals.push('order'); break; }
  }
  const [numbersA, numbersB] = [numbersIn(a), numbersIn(b)];
  if (numbersA.length && numbersB.length && numbersA.join() !== numbersB.join()) signals.push('number');
  const [idsA, idsB] = [identifiersIn(a), identifiersIn(b)];
  if (idsA.length && idsB.length && !idsA.some((id) => idsB.includes(id))) signals.push('identifier');
  return signals;
}

// Pairs worth a second look. The links are already computed for the constellation: a link says
// two notes are about the same thing. EYECAT asks the next question, whether they agree, and
// only where something cheap says they might not.
export function suspectPairs(links, notes, { floor = 0.72, settled = new Set() } = {}) {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const found = [];
  for (const link of links ?? []) {
    if ((link.weight ?? 0) < floor) continue;
    const a = byId.get(link.a);
    const b = byId.get(link.b);
    if (!a || !b) continue;
    // A note already taken out of circulation is not news, and neither is a pair a person settled.
    if (a.kind === 'aberration' || b.kind === 'aberration' || a.refutedBy || b.refutedBy) continue;
    const key = pairKey(a.id, b.id);
    if (settled.has(key)) continue;
    const signals = contradictionSignals(a.text, b.text);
    if (!signals.length) continue;
    // The newer of the two is the one on trial: drift moves forward, so the later claim is the
    // one that changed what the project had settled.
    const [older, newer] = a.id <= b.id ? [a, b] : [b, a];
    found.push({ key, kind: 'contradiction', claim: newer, against: older, weight: link.weight, signals });
  }
  return found.sort((x, y) => y.signals.length - x.signals.length || y.weight - x.weight);
}

// A note is supposed to come from the exchanges it cites. When almost none of what makes it
// distinctive appears in any of them, either it was invented or it was distilled from somewhere
// it does not name, and both are worth asking about.
export function unsupportedNotes(notes, entries, { share = 0.2, settled = new Set() } = {}) {
  const text = new Map((entries ?? []).map((entry) => [entry.sequence, entry.text ?? '']));
  const found = [];
  for (const note of notes ?? []) {
    if (note.kind === 'aberration' || note.refutedBy) continue;
    if (note.origin && note.origin !== 'distilled') continue;   // a person's own note cites nothing
    const cites = (note.sources ?? []).filter((sequence) => text.has(sequence));
    if (!cites.length) continue;
    const key = `note:${note.id}`;
    if (settled.has(key)) continue;
    const terms = meaningful(note.text);
    if (terms.size < 3) continue;
    const backing = meaningful(cites.map((sequence) => text.get(sequence)).join(' '));
    let held = 0;
    for (const term of terms) if (backing.has(term)) held += 1;
    const support = held / terms.size;
    if (support >= share) continue;
    found.push({ key, kind: 'unsupported', claim: note, against: null, support, cites });
  }
  return found.sort((a, b) => a.support - b.support);
}

export const pairKey = (a, b) => `pair:${Math.min(a, b)}:${Math.max(a, b)}`;

// Who may judge. Never whoever wrote the claim, never whoever wrote what it clashes with: a
// model that ratifies its own work is worth nothing here. The local model comes first because it
// is free and because it owes nothing to any of the accounts in the room.
export const EYECAT_ORDER = ['ollama', 'gemini', 'opencode', 'codex', 'claude'];
export function judgeFor(candidate, { agents = [], invokers = {}, busy = new Set(), benched = new Set() } = {}) {
  const conflicted = new Set([candidate?.claim?.agent, candidate?.against?.agent].filter(Boolean));
  const usable = agents.filter((agent) => agent.detected && agent.ready && !busy.has(agent.id) && !benched.has(agent.id) && invokers[agent.adapter]);
  const impartial = usable.filter((agent) => !conflicted.has(agent.id));
  for (const id of EYECAT_ORDER) {
    const found = impartial.find((agent) => agent.id === id);
    if (found) return found;
  }
  return impartial[0] ?? null;
}

// The question, with everything stripped that could tell the judge what to answer: no transcript,
// no project history, no names and no order of authority. Two statements, one question.
export function verdictPrompt(candidate, { json = false } = {}) {
  const shape = '{"verdict":"contradiction|agreement|unrelated","wrong":"a|b|unknown","correction":"one sentence with what is actually true, or an empty string","confidence":0.0}';
  if (candidate.kind === 'unsupported') {
    return [
      'You are a reviewer. You are given a statement recorded about a software project, and the exchanges it claims to come from. Nothing else is known about either.',
      'Decide whether those exchanges actually establish the statement.',
      'Answer "contradiction" if they say something else, "agreement" if they establish it, "unrelated" if they neither establish nor deny it.',
      `Output one JSON object and nothing else: ${shape}. Here "a" is the statement.`,
      '<statement>', candidate.claim.text, '</statement>',
      '<cited>', ...(candidate.citedText ?? []), '</cited>',
    ].filter(Boolean).join('\n');
  }
  return [
    'You are a reviewer. You are given two statements recorded as true about the same software project, and nothing else.',
    'You do not know who wrote either one, they carry no authority, and neither is more likely to be right because of where it appears.',
    'Decide whether both can be true at the same time.',
    'Answer "contradiction" only if believing one means the other is false. Answer "agreement" if both can stand. Answer "unrelated" if they are not about the same thing after all.',
    `Output one JSON object and nothing else: ${shape}`,
    '<a>', candidate.against?.text ?? '', '</a>',
    '<b>', candidate.claim.text, '</b>',
  ].join('\n');
}

const VERDICTS = ['contradiction', 'agreement', 'unrelated'];

// Whatever came back, only a well-formed verdict survives. Anything else is "no answer", which
// leaves the candidate where it was: pending, for a person to look at.
export function parseVerdict(text, candidate = null) {
  const raw = String(text ?? '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed;
  try { parsed = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const verdict = VERDICTS.includes(parsed.verdict) ? parsed.verdict : null;
  if (!verdict) return null;
  const wrong = ['a', 'b'].includes(parsed.wrong) ? parsed.wrong : 'unknown';
  const confidence = Number.isFinite(parsed.confidence) ? Math.min(1, Math.max(0, Number(parsed.confidence))) : null;
  const correction = String(parsed.correction ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
  // Which of the two the judge says is wrong, resolved back to a note. "a" is what was already
  // there, "b" is the newer claim; a judge that will not choose leaves it to the person.
  let accused = null;
  if (candidate && verdict === 'contradiction') {
    if (candidate.kind === 'unsupported') accused = candidate.claim;
    else if (wrong === 'a') accused = candidate.against;
    else if (wrong === 'b') accused = candidate.claim;
  }
  return { verdict, wrong, confidence, correction, accused: accused?.id ?? null };
}
