// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The icons written into the HTML pages are copies of public/icons.js (Trazo MADRE): a page draws its
// keys before any script runs, so it carries them in its own text. Each copy says which drawing it is
// (data-icon); this keeps it equal to the drawing. `node scripts/icons.mjs` lists what differs,
// `node scripts/icons.mjs --write` rewrites it; the tests (test/icons.test.mjs) ask for none.
import { readFile, writeFile } from 'node:fs/promises';
import { ICONS, trazo } from '../public/icons.js';

export const PAGES = ['index.html', 'salas-mac.html', 'salas.html'];
const COPY = /<svg\b([^>]*)\bdata-icon="([a-z0-9-]+)"[^>]*>[\s\S]*?<\/svg>/g;
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) ?? [])[1] ?? '';

// Each copy as the drawing would write it: its own classes and size kept, the rest from icons.js.
function redraw(copy, head, name) {
  if (!ICONS[name]) return null;
  const size = ['width', 'height'].map((key) => (attr(head, key) ? `${key}="${attr(head, key)}"` : '')).filter(Boolean).join(' ');
  return trazo(name, attr(head, 'class'), size);
}

export async function iconCopies({ write = false } = {}) {
  const drift = [];
  for (const page of PAGES) {
    const file = new URL(`../public/${page}`, import.meta.url);
    const text = await readFile(file, 'utf8');
    const next = text.replace(COPY, (copy, head, name) => {
      const want = redraw(copy, head, name);
      if (want === null) { drift.push({ page, name, problem: 'no such drawing' }); return copy; }
      if (want !== copy) drift.push({ page, name, problem: 'differs' });
      return want;
    });
    if (write && next !== text) await writeFile(file, next);
  }
  return drift;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes('--write');
  const drift = await iconCopies({ write });
  for (const one of drift) console.log(`${one.page} · ${one.name}: ${one.problem}`);
  console.log(drift.length ? `${drift.length} ${write ? 'rewritten' : 'to rewrite (--write)'}` : 'Every copy is its drawing.');
}
