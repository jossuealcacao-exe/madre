// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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

// Where to go and do it. These name places on the screen, so they are said in the room's
// language and read at call time, not when this file is imported.
import { t } from './i18n.mjs';

export const WHERE = { nostromo: 'MEMORY MAP', ask: 'MEMORY MAP · ASK', room: 'THE PROJECT', tests: 'MEMORY REVIEW' };
const where = (key) => t(WHERE[key]);
// And what the page's key does there (2026-10-28): the place, or for a thin reading the act itself.
// `go` is read by public/app.js (memNextKey); `where` stays for a page too old to know it.
const to = (key, go = key) => ({ where: where(key), go });

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
      next: { text: (consistency.open === 1 ? t('Settle the contradiction the memory reviewer found. Until it is settled, everything built on this memory inherits it.') : t('Settle the {n} contradictions the memory reviewer found. Until they are settled, everything built on this memory inherits them.', { n: consistency.open })), ...to('nostromo') },
    };
  }

  // 2 · Then what it cannot answer. The room already wrote the questions; pointing at them is
  // more use than repeating the number.
  if (coverage?.ran && !coverage.passed) {
    return {
      headline: stage?.label ?? null,
      says: coverage.says,
      next: asks
        ? { text: t('Answer the {n} questions the project wrote for itself. They are the holes this test is finding.', { n: asks }), ...to('ask') }
        : { text: t('Keep working in the project. The archive fills where the work happens, and this test measures exactly that.'), ...to('room') },
    };
  }

  // 3 · Then whatever the readings say is thinnest. That advice is already written where the
  // reading is taken, so it is quoted rather than invented here.
  if (weakest && weakest.value < 0.6) {
    return { headline: stage?.label ?? null, says: `${weakest.label.toLowerCase()}: ${weakest.detail}.`, next: { text: weakest.next, ...to('room', weakest.id === 'judgement' ? 'rate' : 'room') } };
  }

  // 4 · And when nothing is wrong, the only honest thing left is the test nobody has run.
  if (!match?.ran) {
    return {
      headline: stage?.label ?? null,
      says: coverage?.ran ? coverage.says : t('Nothing contradicts anything and the archive answers what this project asks.'),
      next: { text: t('Run the third test: it puts real questions from this project back to the local model and says whether it lands where the agents landed.'), ...to('tests') },
    };
  }

  const dead = cold?.count ?? 0;
  return {
    headline: stage?.label ?? null,
    says: match.passed
      ? `${match.says} ${t('This project is ready to be worked on with the local model.')}`
      : match.says,
    next: match.passed
      ? (dead
        ? { text: t('Nothing is wrong. {n} memories have had every chance and were never the answer: look at them and decide.', { n: dead }), ...to('nostromo') }
        : { text: t('Nothing to fix. Keep using the project; the archive grows where the work is.'), ...to('room') })
      : { text: t('The local model does not land where the agents land yet. Keep the archive growing and run this test again in a week.'), ...to('tests') },
  };
}
