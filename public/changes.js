// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «What changed» (2026-11-11): what a reply changed in the project, said in one sentence for
// someone who does not program. The sentence is the agent's own when it gave one and nothing it did
// was put back (src/room/changes.mjs); otherwise it is said from the files alone, and never more
// than the files say. The card that carries it is drawn in app.js (changesCard).

import { t } from './i18n.js';

// What git says (A, M, D, R) and what a CREATE turn says (created, changed), as one word.
const KINDS = { A: 'created', created: 'created', M: 'changed', changed: 'changed', modified: 'changed', D: 'deleted', deleted: 'deleted', R: 'renamed', renamed: 'renamed' };
const ORDER = ['created', 'changed', 'deleted', 'renamed'];
const NAMES_SHOWN = 3;

export function changeKind(status) {
  return KINDS[String(status ?? '')] ?? 'changed';
}

// One row per path, in the order the turn reported them; the last word about a path wins.
export function changedFiles(list = []) {
  const byPath = new Map();
  for (const file of list ?? []) {
    const path = String(file?.path ?? '').trim();
    if (!path) continue;
    byPath.set(path, { path, name: path.split('/').pop(), kind: changeKind(file.status) });
  }
  return [...byPath.values()];
}

// «a», «a and b», «a, b and c»: the language says where the last «and» goes.
function joined(items) {
  if (items.length <= 1) return items[0] ?? '';
  return t('{a} and {b}', { a: items.slice(0, -1).join(', '), b: items.at(-1) });
}

// «Created gastos.html and changed index.html.» Up to three names a kind; more are counted.
export function filesSummary(list = []) {
  const files = changedFiles(list);
  if (!files.length) return '';
  const parts = [];
  for (const kind of ORDER) {
    const mine = files.filter((file) => file.kind === kind);
    if (!mine.length) continue;
    const what = mine.length > NAMES_SHOWN ? t('{n} files', { n: mine.length }) : joined(mine.map((file) => file.name));
    parts.push(kind === 'created' ? t('created {files}', { files: what })
      : kind === 'deleted' ? t('deleted {files}', { files: what })
      : kind === 'renamed' ? t('renamed {files}', { files: what })
      : t('changed {files}', { files: what }));
  }
  const sentence = joined(parts);
  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}.`;
}

// The sentence the card shows: the agent's, or the files'.
export function changeSentence({ summary = null, files = [] } = {}) {
  const said = String(summary ?? '').trim();
  return said || filesSummary(files);
}

// What «See» opens: the first file that is still there.
export function fileToSee(list = []) {
  return changedFiles(list).find((file) => file.kind !== 'deleted') ?? null;
}
