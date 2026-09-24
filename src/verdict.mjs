// One sentence about where a room stands, and one thing to do about it.
//
// Everything needed to say it was already being measured: six readings of what the archive is
// made of, three tests of whether it works, the memories nothing has ever reached for, and the
// questions the room cannot answer. What was missing was somebody deciding which of those matters
// today. Nine numbers on a screen is not a verdict — it is homework.
//
// The order is the order a person should act in, and it is not negotiable by score: something the
// room believes that is false outranks something the room has not learned yet, and both outrank
// anything about size. Whatever is chosen, it is one thing, and it says where to go and do it.

export const WHERE = { nostromo: 'NOSTROMO', ask: 'NOSTROMO · ASK', room: 'THE ROOM', tests: 'THE THREE TESTS' };

export function verdictFor({ maturity = null, exams = {}, cold = null, asks = 0 } = {}) {
  const consistency = exams.consistency ?? null;
  const coverage = exams.coverage ?? null;
  const match = exams.match ?? null;
  const stage = maturity?.stage ?? null;
  const weakest = maturity?.signals?.find((signal) => signal.id === maturity.weakest) ?? null;

  // 1 · Something false, first. An archive that contradicts itself teaches the contradiction.
  if (consistency?.ran && consistency.open > 0) {
    return {
      headline: stage?.label ?? null,
      says: consistency.says,
      next: { text: `Settle the ${consistency.open} contradiction${consistency.open === 1 ? '' : 's'} EYECAT is holding. Until they are settled, everything built on this archive inherits them.`, where: WHERE.nostromo },
    };
  }

  // 2 · Then what it cannot answer. The room already wrote the questions; pointing at them is
  // more use than repeating the number.
  if (coverage?.ran && !coverage.passed) {
    return {
      headline: stage?.label ?? null,
      says: coverage.says,
      next: asks
        ? { text: `Answer the ${asks} question${asks === 1 ? '' : 's'} the room wrote for itself. They are the holes this test is finding.`, where: WHERE.ask }
        : { text: 'Keep working in the room. The archive fills where the work happens, and this test measures exactly that.', where: WHERE.room },
    };
  }

  // 3 · Then whatever the readings say is thinnest. That advice is already written where the
  // reading is taken, so it is quoted rather than invented here.
  if (weakest && weakest.value < 0.6) {
    return { headline: stage?.label ?? null, says: `${weakest.label.toLowerCase()}: ${weakest.detail}.`, next: { text: weakest.next, where: WHERE.room } };
  }

  // 4 · And when nothing is wrong, the only honest thing left is the test nobody has run.
  if (!match?.ran) {
    return {
      headline: stage?.label ?? null,
      says: coverage?.ran ? coverage.says : 'Nothing contradicts anything and the archive answers what this room asks.',
      next: { text: 'Run the third test: it puts real questions from this room back to the local model and says whether it lands where the agents landed.', where: WHERE.tests },
    };
  }

  const dead = cold?.count ?? 0;
  return {
    headline: stage?.label ?? null,
    says: match.passed
      ? `${match.says} This room is ready to be worked in with the local model.`
      : match.says,
    next: match.passed
      ? (dead
        ? { text: `Nothing is wrong. ${dead} memor${dead === 1 ? 'y has' : 'ies have'} had every chance and were never the answer: look at them and decide.`, where: WHERE.nostromo }
        : { text: 'Nothing to fix. Keep using the room; the archive grows where the work is.', where: WHERE.room })
      : { text: 'The local model does not land where the agents land yet. Keep the archive growing and run this test again in a week.', where: WHERE.tests },
  };
}
