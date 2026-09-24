// What the room should ask next.
//
// The maturity reading says where the archive is thin; it does not say what to do about it on a
// Tuesday afternoon. This does. It reads the archive the room already has and writes the handful
// of questions whose answers are missing — and it writes them from the archive itself, word for
// word, never inventing a subject the room has not raised.
//
// Three wells, because there are three different kinds of hole:
//
//   · questions the archivist already recorded as open, which nobody ever went back to. This is
//     the archive saying out loud what it does not know.
//   · cold memories: nothing has ever reached for them. Asking is the only way to find out
//     whether they are noise or simply never came up, and it is the honest alternative to
//     forgetting something that was never given a chance.
//   · a kind of note the archive is short of. A room with forty facts and two decisions is
//     recording what is true and not what was chosen, and no amount of use fixes that on its own.
//
// Nothing here spends a turn or writes anything. It hands the human a question; sending it is
// theirs, as is ignoring it.

export const ASK_LIMIT = 6;
export const THIN_SHARE = 0.12;      // a kind under this much of the archive is thin
export const THIN_FLOOR = 20;        // and only once there is enough archive for shares to mean anything

// Open questions are deliberately not here. An archive short of them is not a problem that
// asking for more questions solves; what is wanted is answers, and those come from the first
// well. Only the three kinds a thin archive is genuinely poorer for.
const KIND_ASK = {
  decision: 'What have we decided lately that is not written down anywhere?',
  preference: 'What do I keep asking for that nobody has written down as a preference?',
  fact: 'What is true about this project that a new agent would have to be told?',
};

const KIND_WHY = {
  decision: 'decisions',
  preference: 'preferences',
  fact: 'facts',
};

const quote = (text) => `"${String(text ?? '').replace(/\s+/g, ' ').trim()}"`;

// Two ways of asking the same thing are one question. The archivist writes on several passes and
// sometimes records a question twice in slightly different words; offering both of them back is
// how a list of six turns into a list of four.
const words = (text) => new Set(String(text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) ?? []);
export function sameQuestion(a, b, floor = 0.72) {
  const one = words(a);
  const two = words(b);
  if (!one.size || !two.size) return false;
  let shared = 0;
  for (const word of one) if (two.has(word)) shared += 1;
  // Against the union, not the shorter of the two: "who owns the billing" and "who owns the
  // migration" are three words apiece in common and are not the same question at all. But one
  // question wholly inside another is the same question said at more length, and the union
  // punishes exactly that, so containment is asked separately and asked strictly.
  const inside = shared / Math.min(one.size, two.size);
  return shared / (one.size + two.size - shared) >= floor || inside >= 0.9;
}

// The questions, most worth asking first, each one traceable to what raised it.
export function questionsFor({ notes = [], cold = new Map(), dismissed = [], limit = ASK_LIMIT } = {}) {
  const skip = new Set(dismissed ?? []);
  const standing = notes.filter((note) => note && note.kind !== 'aberration' && !note.refutedBy);
  const asks = { open: [], cold: [], thin: [] };

  // What the archive itself recorded as open. One the room keeps reaching for and still has no
  // answer to is the most worth asking of anything here.
  for (const note of standing.filter((note) => note.kind === 'question')) {
    asks.open.push({
      id: `open:${note.id}`,
      source: 'open',
      memoryId: note.id,
      text: note.text,
      why: Number(note.recalled ?? 0) > 0
        ? `the room has carried this open question into ${note.recalled} turn${Number(note.recalled) === 1 ? '' : 's'} and still has no answer`
        : 'the archivist recorded this as open and nothing has answered it',
      weight: 100 + Number(note.recalled ?? 0),
    });
  }

  // What nothing has ever reached for. Asking settles it either way.
  for (const note of standing) {
    const chill = cold.get?.(note.id) ?? null;
    if (!chill) continue;
    asks.cold.push({
      id: `cold:${note.id}`,
      source: 'cold',
      memoryId: note.id,
      text: `Is this still true, and does it still matter here? ${quote(note.text)}`,
      why: `the archive has been opened ${chill.chances} times since this was written and never once carried it`,
      weight: 50 + chill.chances,
    });
  }

  // What the archive is short of. Not a memory: a shape.
  if (standing.length >= THIN_FLOOR) {
    const counts = new Map();
    for (const note of standing) counts.set(note.kind, (counts.get(note.kind) ?? 0) + 1);
    for (const kind of Object.keys(KIND_ASK)) {
      const count = counts.get(kind) ?? 0;
      if (count / standing.length >= THIN_SHARE) continue;
      asks.thin.push({
        id: `thin:${kind}`,
        source: 'thin',
        memoryId: null,
        text: KIND_ASK[kind],
        why: `${count} of ${standing.length} notes are ${KIND_WHY[kind]}`,
        weight: 40 - count,
      });
    }
  }

  for (const list of Object.values(asks)) list.sort((a, b) => b.weight - a.weight);
  // Taken in turn rather than by weight alone, so one full well cannot be the whole list: six
  // variations on the same cold note is not a plan, it is a loop.
  const order = ['open', 'cold', 'thin'];
  const chosen = [];
  while (chosen.length < limit && order.some((well) => asks[well].length)) {
    for (const well of order) {
      if (chosen.length >= limit) break;
      const next = asks[well].shift();
      if (!next || skip.has(next.id)) continue;
      if (chosen.some((already) => sameQuestion(already.text, next.text))) continue;
      chosen.push(next);
    }
  }
  return chosen;
}
