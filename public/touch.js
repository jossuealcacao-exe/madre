// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// A tap is not a hover (2026-10-11). On a screen with no pointer (a phone, a tablet without a
// trackpad), the browser gives :hover to whatever was tapped and keeps it until the next tap lands
// somewhere else: a button looked pressed after it was let go. So, where nothing can hover, the
// page's own rules for :hover are taken out as it opens. A selector that is only :hover goes; one
// that offers :hover among other states, as `:is(:hover, :focus-visible)` does, keeps the others.
// Where a pointer exists, nothing is touched.

const canHover = () => typeof matchMedia !== 'function' || !matchMedia('(hover: none)').matches;

// The parts of a list split at its top-level commas, never at a comma inside parentheses or quotes.
function topLevel(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) { if (c === quote && text[i - 1] !== '\\') quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// One selector without :hover, or null when it cannot match without one.
export function withoutHover(selector) {
  let out = '';
  let i = 0;
  while (i < selector.length) {
    const open = selector.slice(i).match(/^:(is|where|matches|-webkit-any)\(/);
    if (open) {
      // Find the parenthesis that closes it, and rewrite each of its alternatives.
      let depth = 1;
      let j = i + open[0].length;
      for (; j < selector.length && depth; j += 1) {
        if (selector[j] === '(') depth += 1;
        else if (selector[j] === ')') depth -= 1;
      }
      const inner = selector.slice(i + open[0].length, j - 1);
      const kept = topLevel(inner).map((part) => withoutHover(part)).filter((part) => part !== null);
      if (!kept.length) return null;
      out += `:${open[1]}(${kept.join(', ')})`;
      i = j;
      continue;
    }
    if (selector.startsWith(':hover', i) && !/[\w-]/.test(selector[i + 6] ?? '')) return null;
    out += selector[i];
    i += 1;
  }
  return out;
}

function sweep(rules, owner) {
  let changed = 0;
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];
    if (rule.cssRules?.length && !rule.selectorText) { changed += sweep(rule.cssRules, rule); continue; }
    if (!rule.selectorText || !rule.selectorText.includes(':hover')) continue;
    const kept = topLevel(rule.selectorText).map((selector) => withoutHover(selector)).filter((selector) => selector !== null);
    try {
      if (kept.length) rule.selectorText = kept.join(', ');
      else owner.deleteRule(index);
      changed += 1;
    } catch { /* a rule the browser would not let go of: left as it is */ }
  }
  return changed;
}

// Takes the :hover rules out of every stylesheet of this page, where nothing can hover. Answers how
// many rules it changed.
export function dropStickyHover(doc = globalThis.document) {
  if (!doc || canHover()) return 0;
  let changed = 0;
  for (const sheet of doc.styleSheets ?? []) {
    let rules = null;
    try { rules = sheet.cssRules; } catch { continue; } // another origin's sheet: not ours to read
    if (rules) changed += sweep(rules, sheet);
  }
  return changed;
}
