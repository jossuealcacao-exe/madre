// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «What changed» (2026-11-11): under each reply that touched the project, a card says in the
// person's words what changed. The agent says it best, so a writing turn asks it for one closing
// line (src/room/prompt.mjs, block `changes`); MADRE takes that line out of the reply and carries it
// beside the files the turn really changed. Pure: text in, text and sentence out.
//
// The sentence is the agent's, never MADRE's: when the turn wrote nothing it is dropped, and when
// MADRE put something back (CREATE only adds, forbidden zones, the copilot's deletes) it is dropped
// too, because it may tell of a change that is no longer there. The page then says it from the
// files alone («Created gastos.html and changed index.html»).

export const CHANGES_MARK = 'MADRE-CHANGES';
const SUMMARY_MAX = 280;
// A line of its own, as the agent may dress it: in bold, quoted, in backticks.
const LINE = /^[ \t>*_`]*MADRE-CHANGES[ \t*_`]*:[ \t]*(.*)$/gim;

const peel = (said) => said.trim()
  .replace(/^[*_`]+|[*_`]+$/g, '').trim()
  .replace(/^["«“](.*)["»”]$/, '$1').trim();
// Until nothing more comes off, because the dressing nests: «**…**», **«…»**.
const tidy = (said) => {
  let text = String(said ?? '');
  for (let left = 4; left > 0; left -= 1) { const next = peel(text); if (next === text) break; text = next; }
  return text;
};

// The reply without the line, and the sentence it carried (the last one, when there are several).
export function takeChangeSummary(text) {
  const source = String(text ?? '');
  if (!source.toUpperCase().includes(CHANGES_MARK)) return { text: source, summary: null };
  let summary = null;
  const rest = source.replace(LINE, (whole, said) => {
    const clean = tidy(said);
    if (clean) summary = clean;
    return '';
  });
  if (rest === source) return { text: source, summary: null };
  const clipped = summary && summary.length > SUMMARY_MAX ? `${summary.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : summary;
  return { text: rest.replace(/\n{3,}/g, '\n\n').trim(), summary: clipped };
}

// What the reply carries about its changes, or nothing when it changed nothing. `created`: the
// files a turn made (CREATE, or a draft folder); `create`/`control`: what the turn's restore point
// settled to (src/room/control.mjs).
export function turnChanges({ summary = null, created = [], create = null, control = null } = {}) {
  const changed = (control?.files ?? []).length + created.length;
  if (!changed) return null;
  const settled = control ?? create;
  const putBack = Boolean(
    create?.existingReverted?.length
    || settled?.forbiddenReverted?.length
    || settled?.deletesReverted?.length,
  );
  return {
    ...(settled?.checkpointId ? { checkpointId: settled.checkpointId } : {}),
    ...(summary && !putBack ? { summary } : {}),
  };
}
