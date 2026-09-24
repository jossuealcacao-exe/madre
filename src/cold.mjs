// Cold zones: the part of the archive nothing has ever reached for.
//
// A memory is cold when three things are true at once, and the three together are what make the
// claim strong enough to act on:
//
//   · no turn has ever carried it
//   · it shares a subject with no other memory, so nothing can reach it sideways either
//   · the room has reached into the archive often enough since it was written that it has plainly
//     had its chances
//
// That third one is the whole point. Never-recalled is not cold; never-recalled is what every
// memory is on the day it is written. What makes a memory cold is opportunity that went by: the
// archive was opened forty times and it was never the answer. Chances are counted in turns that
// actually reached into the archive, because those are the only chances that existed.
//
// Pure functions. The room hands in what it already has.

export const COLD_CHANCES = 12;   // turns that went into the archive without ever taking it

// How many of `times` (ascending) are at or after `from`.
function after(times, from) {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (times[middle] < from) low = middle + 1; else high = middle;
  }
  return times.length - low;
}

// Which memories are adrift, and how many chances each one has had. `since` is the day this room
// started keeping the trail: a memory older than that is only counted from there, because what
// happened before it was never written down and must not be held against the note.
export function coldNotes({ notes = [], links = [], batches = [], since = null, chances = COLD_CHANCES } = {}) {
  const linked = new Set(links.flatMap((link) => [link.a, link.b]));
  const times = batches.map((at) => Date.parse(at)).filter((at) => Number.isFinite(at)).sort((a, b) => a - b);
  const floor = since ? Date.parse(since) : 0;
  const cold = new Map();
  for (const note of notes) {
    if (!note || note.kind === 'aberration' || note.refutedBy) continue;   // a refutation is not a cold memory
    if (Number(note.recalled ?? 0) > 0) continue;
    if (linked.has(note.id)) continue;
    const written = Date.parse(note.created);
    const from = Math.max(Number.isFinite(written) ? written : 0, Number.isFinite(floor) ? floor : 0);
    const had = after(times, from);
    if (had >= chances) cold.set(note.id, { chances: had });
  }
  return cold;
}

// What the room should say about it. Never a number on its own: a count of cold memories means
// nothing without what it is a count of.
export function coldReading(cold, notes = []) {
  const standing = notes.filter((note) => note && note.kind !== 'aberration' && !note.refutedBy).length;
  return { count: cold.size, standing, share: standing > 0 ? Number((cold.size / standing).toFixed(3)) : 0 };
}
