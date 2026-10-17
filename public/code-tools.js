// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The code workspace's arithmetic (1.0.3), kept apart from the page so it can be tested on its own:
// what an agent changed in a file line by line, where each of those changes stands in the file as
// it is now, what the file reads like with one of them taken back, and which function a line is in.
// Nothing here touches the page, the network or the disk.

const lines = (text) => String(text ?? '').replace(/\r\n/g, '\n').split('\n');

// The changes between two texts as runs of lines: each says where it starts on each side and what
// it removed and put. The common start and end are set aside first; what is left is compared line
// by line (longest common subsequence). Past `maxCells` comparisons the middle is one change: a
// file rewritten that much is read as rewritten, not taken apart.
export function lineDiff(beforeText, afterText, { maxCells = 2_000_000 } = {}) {
  const a = lines(beforeText);
  const b = lines(afterText);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const A = a.slice(start, endA);
  const B = b.slice(start, endB);
  if (!A.length && !B.length) return [];
  if (A.length * B.length > maxCells) return [{ beforeStart: start, before: A, afterStart: start, after: B }];
  const n = A.length;
  const m = B.length;
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * width + j] = A[i] === B[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const hunks = [];
  let open = null;
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { if (open) { hunks.push(open); open = null; } i += 1; j += 1; continue; }
    if (!open) open = { beforeStart: start + i, before: [], afterStart: start + j, after: [] };
    if (j < m && (i === n || table[i * width + j + 1] >= table[(i + 1) * width + j])) { open.after.push(B[j]); j += 1; }
    else { open.before.push(A[i]); i += 1; }
  }
  if (open) hunks.push(open);
  return hunks;
}

// Where each change of an agent stands in the file as it is now. Untouched since the turn, a change
// is where the turn left it. Edited since, it is found by its own lines, nearest to where it was; a
// change whose lines are no longer there (the human rewrote them) is no longer the agent's, and is
// left out. A change that only removed lines is found by the line the turn left just before it.
export function placeHunks(currentText, afterText, hunks) {
  const now = lines(currentText);
  if (afterText === null || afterText === undefined || String(afterText).replace(/\r\n/g, '\n') === now.join('\n')) return hunks.map((hunk) => ({ ...hunk, at: hunk.afterStart }));
  const after = lines(afterText);
  const out = [];
  for (const hunk of hunks) {
    let at = -1;
    if (hunk.after.length) at = nearest(now, hunk.after, hunk.afterStart);
    else {
      const before = hunk.afterStart > 0 ? after[hunk.afterStart - 1] : null;
      if (before === null) at = now.length && now[0] === after[0] ? 0 : -1;
      else { const found = nearest(now, [before], hunk.afterStart - 1); at = found < 0 ? -1 : found + 1; }
    }
    if (at >= 0) out.push({ ...hunk, at });
  }
  return out;
}
function nearest(haystack, block, hint) {
  let best = -1;
  for (let k = 0; k + block.length <= haystack.length; k += 1) {
    let same = true;
    for (let x = 0; x < block.length; x += 1) if (haystack[k + x] !== block[x]) { same = false; break; }
    if (same && (best < 0 || Math.abs(k - hint) < Math.abs(best - hint))) best = k;
  }
  return best;
}

// The file with one change taken back: the lines the agent put, where they stand now, become the
// lines it removed. Everything else stays byte for byte, line endings included.
export function revertHunk(currentText, hunk) {
  const text = String(currentText ?? '');
  const crlf = /\r\n/.test(text);
  const now = lines(text);
  now.splice(hunk.at, hunk.after.length, ...hunk.before);
  return now.join(crlf ? '\r\n' : '\n');
}

// A change named by what it says, so «kept» survives a reload and never sticks to another change.
export function hunkKey(hunk) {
  let hash = 0x811c9dc5;
  const said = `${hunk.before.join('\n')}\u0000${hunk.after.join('\n')}`;
  for (let i = 0; i < said.length; i += 1) {
    hash ^= said.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// The function, class or heading a line belongs to, for the path above the code: the nearest line
// above it that opens one and is indented no deeper. `null` when nothing encloses it.
const OPENS = {
  js: [
    /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,
    /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/,
    /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/,
    /^\s*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?(#?[A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/,
  ],
  py: [/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/, /^\s*class\s+([A-Za-z_]\w*)/],
  css: [/^\s*([^{}@\s][^{}]*?)\s*\{\s*$/, /^\s*(@media[^{]*?)\s*\{/],
  sh: [/^\s*(?:function\s+)?([A-Za-z_][\w-]*)\s*\(\)\s*\{?/],
};
const NOT_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'else', 'do', 'try']);
export function symbolAt(textOrLines, index, familyId) {
  const all = Array.isArray(textOrLines) ? textOrLines : lines(textOrLines);
  if (index < 0 || index >= all.length) return null;
  if (familyId === 'md') {
    for (let k = index; k >= 0; k -= 1) { const heading = all[k].match(/^#{1,6}\s+(.+?)\s*#*\s*$/); if (heading) return heading[1]; }
    return null;
  }
  const patterns = OPENS[familyId];
  if (!patterns) return null;
  const depth = (line) => line.match(/^\s*/)[0].replace(/\t/g, '  ').length;
  let limit = all[index].trim() ? depth(all[index]) : Infinity;
  // A block closed above the line (a sibling function that ended) is skipped whole: its closing
  // line is counted at its depth, and the opening line at that depth that matches it is passed over.
  const closed = new Map();
  for (let k = index; k >= 0 && index - k < 4000; k -= 1) {
    const line = all[k];
    const said = line.trim();
    if (!said) continue;
    const indent = depth(line);
    if (k !== index && indent > limit) continue;
    if (k !== index && /^[}\])]/.test(said) && !/[{([]\s*$/.test(said)) { closed.set(indent, (closed.get(indent) ?? 0) + 1); continue; }
    const name = patterns.map((pattern) => said && line.match(pattern)?.[1]).find(Boolean) ?? null;
    const opens = Boolean(name) || /[{([]\s*$/.test(said) || (familyId === 'py' && /:\s*$/.test(said));
    if (k !== index && opens && (closed.get(indent) ?? 0) > 0) { closed.set(indent, closed.get(indent) - 1); continue; }
    if (name && !NOT_NAMES.has(name)) return name.trim().slice(0, 80);
    if (k !== index) limit = Math.min(limit, indent);
  }
  return null;
}
