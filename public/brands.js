// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Visual identity per agent.
//
// Colors follow each vendor's public palette so a Codex bubble reads as Codex
// and a Claude bubble as Claude. The marks are drawn by MADRE: free takes that
// recall each vendor's mark without reproducing it (2026-10-17), because the
// vendors' logos are registered trademarks and their brand guidelines do not
// allow embedding them in third-party products without permission. To use an
// official asset under a license you hold, set `mark` to that inline SVG.
//
// `mark` receives no arguments and must return an SVG string with
// `fill="currentColor"` so the monogram inherits the agent color.

const glyph = (body) => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${body}</svg>`;

export const BRANDS = {
  codex: {
    label: 'Codex',
    vendor: 'OpenAI',
    color: '#10A37F',
    colorLight: '#0B7A5F',
    ink: '#FFFFFF',
    // A free take on OpenAI's blossom (2026-10-17): three rounded links turned 60° and knotted.
    mark: () => glyph('<g fill="none" stroke="currentColor" stroke-width="2.4"><rect x="11.2" y="4.4" width="9.6" height="23.2" rx="4.8"/><rect x="11.2" y="4.4" width="9.6" height="23.2" rx="4.8" transform="rotate(60 16 16)"/><rect x="11.2" y="4.4" width="9.6" height="23.2" rx="4.8" transform="rotate(120 16 16)"/></g>'),
  },
  claude: {
    label: 'Claude',
    vendor: 'Anthropic',
    color: '#D97757',
    colorLight: '#B85C3C',
    ink: '#FFFFFF',
    // A free take on Claude's spark (2026-10-17): ten tapered rays of uneven length round a heart.
    mark: () => glyph('<circle cx="16" cy="16" r="3" fill="currentColor"/><path fill="currentColor" d="M15.5 14.48L16.4 2.61L17.4 2.07L18.27 2.79L16.8 14.61ZM16.49 14.48L22.85 7.14L23.85 7.19L24.02 8.18L17.46 15.34ZM17.29 15.05L28.29 12.41L29.09 13.15L28.67 14.16L17.57 16.33ZM17.6 15.99L25.98 19.58L26.25 20.51L25.38 20.93L17.07 17.19ZM17.3 16.93L23.66 27.24L23.16 28.26L22.02 28.2L16.17 17.59ZM16.5 17.52L15.65 27.59L14.78 28.14L14.04 27.43L15.2 17.39ZM15.51 17.52L8.41 25.81L7.35 25.7L7.12 24.65L14.54 16.66ZM14.71 16.95L6.02 18.92L5.25 18.34L5.71 17.49L14.43 15.67ZM14.4 16.01L3.57 11.55L3.37 10.45L4.32 9.86L14.93 14.81ZM14.7 15.07L9.8 6.91L10.15 5.98L11.13 6.14L15.83 14.41Z"/>'),
  },
  gemini: {
    label: 'Gemini',
    vendor: 'Google',
    color: '#8E75E8',
    colorLight: '#5B45B8',
    ink: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #4796E3 0%, #8E75E8 55%, #D96570 100%)',
    // A free take on Gemini's sparkle (2026-10-17): four points in long curves, taller than wide.
    mark: () => glyph('<path fill="currentColor" d="M16 2.4C16.8 10.2 21.4 15 29 16 21.4 17 16.8 21.8 16 29.6 15.2 21.8 10.6 17 3 16 10.6 15 15.2 10.2 16 2.4z"/>'),
  },
  opencode: {
    label: 'OpenCode',
    vendor: 'OpenCode',
    color: '#F2C94C',
    colorLight: '#9A7A12',
    ink: '#111111',
    // A free take on OpenCode's block letter (2026-10-17): a square ring with a lighter block inside.
    mark: () => glyph('<path fill="currentColor" fill-rule="evenodd" d="M6 6h20v20H6zM10.4 10.4v11.2h11.2V10.4z"/><path fill="currentColor" opacity=".5" d="M10.4 15.2h11.2v6.4H10.4z"/>'),
  },
  // MADRE's own drawing for Cursor (2026-10-17), a free take on its mark rather than the mark: a
  // cube seen from above, its three faces in three weights, and a pointer cut out of the right face.
  cursor: {
    label: 'Cursor',
    vendor: 'Cursor',
    color: '#D9DEE5',
    colorLight: '#3A3F47',
    ink: '#111111',
    mark: () => glyph('<path fill="currentColor" d="M16 3.2 27.4 9.6 16 16 4.6 9.6z"/><path fill="currentColor" opacity=".42" d="M4.6 9.6 16 16v12.8L4.6 22.4z"/><path fill="currentColor" fill-rule="evenodd" opacity=".7" d="M27.4 9.6v12.8L16 28.8V16zM16 16l11.4-6.4-6.2 12-1.9-3.9z"/>'),
  },
};

BRANDS.madre = {
  label: 'MADRE',
  vendor: 'the project · local',
  color: '#9bff66',
  colorLight: '#2f8a1c',
  ink: '#0a1405',
  // The brand kit's compact pulse, the one drawn for 64 px and under (favicon, icon), with its dot.
  mark: () => glyph('<path d="M3.5 16h5.5l2.3-5.5 4 11 3.2-7.5 1.8 2h2.2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26.4" cy="16" r="2.4" fill="currentColor"/>'),
};

BRANDS.ollama = {
  label: 'Ollama',
  vendor: 'local',
  color: '#E6E6E6',
  colorLight: '#3A3A3A',
  ink: '#111111',
  mark: () => glyph('<circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12.5" cy="15" r="1.6" fill="currentColor"/><circle cx="19.5" cy="15" r="1.6" fill="currentColor"/>'),
};

// BISHOP, the guardian of the rooms (docs/MACROVERSO.md): MADRE's own robot, not a vendor's.
// Its mark is a white robot on #5C255E (2026-10-10, the owner's choice): `solid` is that disc.
// Written as text or drawn as a ring on a dark ground, that plum all but vanishes, so `color` is
// the same hue lifted; on a light ground the plum itself reads.
BRANDS.bishop = {
  label: 'Coordinator',
  vendor: 'Home',
  color: '#D598D7',
  colorLight: '#5C255E',
  solid: '#5C255E',
  ink: '#FFFFFF',
  mark: () => glyph('<path d="M16 9.6V6.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="5.2" r="1.9" fill="currentColor"/><rect x="7" y="9.6" width="18" height="14.4" rx="4.4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12.3" cy="16" r="2.1" fill="currentColor"/><circle cx="19.7" cy="16" r="2.1" fill="currentColor"/><path d="M12.6 20.6h6.8M4.4 14.6v4.6M27.6 14.6v4.6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>'),
};

export const fallbackBrand = (id) => ({
  label: id,
  vendor: '',
  color: '#8A8F98',
  colorLight: '#5B6068',
  ink: '#FFFFFF',
  mark: () => glyph(`<text x="16" y="21" text-anchor="middle" font-size="16" font-family="ui-monospace, Menlo, monospace" fill="currentColor">${String(id).slice(0, 1).toUpperCase()}</text>`),
});

export const brandOf = (id) => BRANDS[id] ?? fallbackBrand(id);

// A project's own mark (2026-10-10): its two letters, on the square keys of Home's bar and on the
// icons of a room's switcher. The first letters of its first two words, or the first two of its one
// word; a word is what starts with a letter, so «AHP 1.4.1 Field Test» is «AF» and «pulse» is «Pu».
export function monogram(name) {
  const words = String(name ?? '').split(/[\s._-]+/).filter((word) => /^\p{L}/u.test(word));
  if (!words.length) return Array.from(String(name ?? '').trim())[0] ?? '?';
  if (words.length > 1) return words.slice(0, 2).map((word) => Array.from(word)[0].toLocaleUpperCase()).join('');
  const [first = '', second = ''] = Array.from(words[0]);
  return first.toLocaleUpperCase() + second.toLocaleLowerCase();
}
