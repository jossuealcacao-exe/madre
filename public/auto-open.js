// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What an answer made opens on its own (2026-11-11).
//
// A person who asks for a page wants to see the page, not to go looking for a file. When an answer
// creates or changes something that can be looked at — a page, a picture, a PDF, a sheet, a
// document — the room opens it beside the conversation. Of several, the one that matters most: a
// page before a picture, the main page before the others. The rest stay a click away, on the
// answer's own tiles.
//
// This file only chooses. Opening, and whether the person is already looking at something else,
// is the room's (public/app.js, autoOpenMade).

export const AUTO_OPEN_KEY = 'madre.autoOpen';

// The kinds that can be looked at, in the order they win. Code, settings and data files are not
// here: they are read, not looked at, and a person who did not ask to read them is not shown them.
const KINDS = [
  ['page', /\.(html?|xhtml)$/i],
  ['image', /\.(png|jpe?g|gif|webp|avif|svg)$/i],
  ['pdf', /\.pdf$/i],
  ['sheet', /\.(csv|xlsx)$/i],
  ['document', /\.(md|markdown)$/i],
];

// A way of working an agent proposes (*.habilidad.md) or a module (*.module.mjs) has its own card
// to install it; what MADRE keeps for itself (.pulse/) is not the person's work.
const NOT_WORK = /(^|\/)\.pulse\/|\.habilidad\.md$/i;

export function kindOf(path) {
  const name = String(path ?? '');
  if (!name || NOT_WORK.test(name)) return null;
  return KINDS.find(([, test]) => test.test(name))?.[0] ?? null;
}

// Gone is not something to look at: «D» from an edit, «deleted» wherever it is said in words.
const gone = (file) => ['D', 'deleted'].includes(file?.status);

// The main page is the one a site opens on: index.html, nearest the project's top.
function mainness(path) {
  const name = path.split('/').pop().toLowerCase();
  return /^index\.(html?|xhtml)$/.test(name) ? 0 : 1;
}

// { first, rest }: the file to open, and the others that could be looked at, in the same order.
export function pickToOpen(files = []) {
  const order = KINDS.map(([kind]) => kind);
  const seen = new Set();
  const showable = [];
  for (const file of Array.isArray(files) ? files : []) {
    const path = String(file?.path ?? '');
    if (!path || gone(file) || seen.has(path)) continue;
    const kind = kindOf(path);
    if (!kind) continue;
    seen.add(path);
    showable.push({ ...file, path, kind });
  }
  showable.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)
    || mainness(a.path) - mainness(b.path)
    || a.path.split('/').length - b.path.split('/').length
    || a.path.localeCompare(b.path));
  return { first: showable[0] ?? null, rest: showable.slice(1) };
}

// On unless the person turned it off in Settings. Storage that cannot be read leaves it on.
export function autoOpenOn(storage = globalThis.localStorage) {
  try { return storage?.getItem(AUTO_OPEN_KEY) !== 'off'; } catch { return true; }
}
export function setAutoOpen(on, storage = globalThis.localStorage) {
  try { if (on) storage?.removeItem(AUTO_OPEN_KEY); else storage?.setItem(AUTO_OPEN_KEY, 'off'); } catch { /* this page only */ }
}

// A CSV read into rows, quotes and all, for the viewer's table. Only the first rows: a sheet is
// looked at, not loaded whole.
export function csvRows(text, { limit = 200 } = {}) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text ?? '').replace(/^﻿/, '');
  // A sheet saved with semicolons (as spreadsheets do where the comma is the decimal mark).
  const firstLine = source.split('\n', 1)[0];
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  for (let index = 0; index < source.length && rows.length < limit; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === separator) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += char;
  }
  if ((cell || row.length) && rows.length < limit) { row.push(cell); rows.push(row); }
  return rows;
}
