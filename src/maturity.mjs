// How grown a room is, and how far from being worth training on.
//
// Pure functions. The room hands in what it has; nothing here reads a file or calls a model.
//
// This replaces a bar that filled toward three hundred. That number was a rule of thumb from
// somebody else's paper, not a measurement of this room, and a corpus of three hundred pairs all
// about the same afternoon teaches less than eighty that are not. What is measured here is what
// can actually be counted about this archive, and each reading says plainly what would raise it.

// How much of the whole each reading is worth. Volume counts, but it is one voice of six: a room
// can be large and still be narrow, unjudged and lopsided.
import { t } from './i18n.mjs';

export const WEIGHTS = { volume: 0.2, coverage: 0.2, weave: 0.15, judgement: 0.2, balance: 0.15, upkeep: 0.1 };
export const VOLUME_TARGET = 300;   // the usual floor for a small adapter, and nothing more than that

const share = (part, whole) => (whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0);
const round = (value) => Number(value.toFixed(3));

// Six readings, each 0 to 1, each with the one thing that would raise it.
export function maturity({ readiness = null, notes = [], links = [], stats = null } = {}) {
  const standing = notes.filter((note) => note.kind !== 'aberration' && !note.refutedBy);
  const pairs = Number(readiness?.pairs ?? 0);
  const rated = Number(readiness?.good ?? 0) + Number(readiness?.bad ?? 0);
  const turns = Number(readiness?.turns ?? 0) + Number(readiness?.delegated ?? 0);
  const noteShare = pairs > 0 ? Number(readiness?.notes ?? 0) / pairs : 0;

  const recalled = standing.filter((note) => Number(note.recalled ?? 0) > 0).length;
  const linked = new Set(links.flatMap((link) => [link.a, link.b]));
  const connected = standing.filter((note) => linked.has(note.id)).length;
  const pending = Number(stats?.pending ?? 0);
  const entries = Number(stats?.entries ?? 0);

  const signals = [
    {
      id: 'volume', label: t('HOW MUCH THERE IS'),
      value: round(share(pairs, VOLUME_TARGET)),
      detail: t('{pairs} of about {target} exchanges worth training on', { pairs, target: VOLUME_TARGET }),
      next: t('Use the room. Nothing else fills this.'),
    },
    {
      id: 'coverage', label: t('HOW MUCH OF IT GETS USED'),
      value: round(share(recalled, standing.length)),
      detail: t('{recalled} of {total} memories have been reached for at least once', { recalled, total: standing.length }),
      next: t('Memories nobody has needed may be noise, or may simply not have come up yet. Ask the room about older decisions and see which ones answer.'),
    },
    {
      id: 'weave', label: t('HOW WOVEN IT IS'),
      value: round(share(connected, standing.length)),
      detail: t('{connected} of {total} memories share a subject with another', { connected, total: standing.length }),
      next: t('An archive of unrelated notes is a list. Depth comes from returning to the same subjects.'),
    },
    {
      id: 'judgement', label: t('HOW MUCH OF IT YOU JUDGED'),
      // A tenth rated is enough to steer a small adapter; asking for all of it would never be met.
      value: round(share(rated, Math.max(1, pairs * 0.1))),
      detail: t('{rated} of {pairs} replies rated', { rated, pairs }),
      next: t('Rate replies with the thumbs on a bubble. A corpus nobody judged teaches what the agents said, not what you approved.'),
    },
    {
      id: 'balance', label: t('HOW MUCH OF IT IS REAL WORK'),
      // Half recall pairs is healthy; a corpus that is mostly recall teaches recitation. A room
      // with no corpus at all is not balanced, it is empty, and saying otherwise would show
      // progress where there is none.
      value: pairs > 0 ? round(1 - Math.min(1, Math.max(0, (noteShare - 0.5) / 0.5))) : 0,
      detail: t('{share}% of the corpus is recall questions, {turns} exchanges are real work', { share: Math.round(noteShare * 100), turns }),
      next: t('Recall pairs are made from notes and cost nothing, so they pile up. Work in the room to balance them.'),
    },
    {
      id: 'upkeep', label: t('HOW CURRENT IT IS'),
      value: round(entries > 0 ? 1 - share(pending, Math.max(1, entries * 0.15)) : 0),
      detail: t('{pending} exchanges nobody has distilled yet, of {entries}', { pending, entries }),
      next: t('The archivist catches up on its own. A backlog that never clears means it cannot run: check who is allowed to distil.'),
    },
  ];

  const score = round(signals.reduce((sum, signal) => sum + signal.value * (WEIGHTS[signal.id] ?? 0), 0));
  return { score, stage: stageOf(score), signals, weakest: [...signals].sort((a, b) => a.value - b.value)[0]?.id ?? null };
}

// What to call it. A name is not a measurement, but a number alone tells nobody whether to act.
export const STAGES = [
  { at: 0.85, id: 'mature', label: 'MATURE', says: 'Worth training on. Export and run the recipe.' },
  { at: 0.6, id: 'working', label: 'WORKING', says: 'Usable, and it will be better for waiting.' },
  { at: 0.35, id: 'forming', label: 'FORMING', says: 'It has a shape. Too thin to train on.' },
  { at: 0.12, id: 'sparse', label: 'SPARSE', says: 'A few things remembered, little connecting them.' },
  { at: 0, id: 'empty', label: 'EMPTY', says: 'Nothing has been distilled yet.' },
];
// The table holds the English, and the stage is said in the room's language when it is asked
// for: this list is built when the file is imported, and the room learns its language after.
export function stageOf(score) {
  const stage = STAGES.find((one) => score >= one.at) ?? STAGES.at(-1);
  return { ...stage, label: t(stage.label), says: t(stage.says) };
}
