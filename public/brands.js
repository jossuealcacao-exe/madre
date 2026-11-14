// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Visual identity per agent.
//
// Colors follow each vendor's public palette so a Codex bubble reads as Codex
// and a Claude bubble as Claude. Since 2026-11-06, by the author's decision, Codex, Claude, Gemini,
// OpenCode and Grok show their owners' official marks, in their one-colour version and unaltered
// (taken from the Lobe Icons collection, @lobehub/icons-static-svg 1.102.0, the set most multi-model
// apps use), only to identify each service; the room says whose trademarks they are. Cursor keeps
// MADRE's own drawing (2026-10-17). A mark is never redrawn or retouched: an official one goes in
// whole, or MADRE draws its own.
//
// `mark` receives no arguments and must return an SVG string with
// `fill="currentColor"` so the monogram inherits the agent color.

const glyph = (body) => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${body}</svg>`;
// An official mark, one colour, exactly as its owner draws it (24 × 24, as published): the paths are
// never edited. The wider box is only the clear space around it, so it sits like the others.
const official = (body) => `<svg viewBox="-3 -3 30 30" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false">${body}</svg>`;

export const BRANDS = {
  codex: {
    label: 'Codex',
    vendor: 'OpenAI',
    color: '#10A37F',
    colorLight: '#0B7A5F',
    ink: '#FFFFFF',
    // OpenAI's Codex mark, official and unaltered (2026-11-06, the author's choice): the monochrome one.
    mark: () => official("<path clip-rule=\"evenodd\" d=\"M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z\"></path>"),
  },
  claude: {
    label: 'Claude',
    vendor: 'Anthropic',
    color: '#D97757',
    colorLight: '#B85C3C',
    ink: '#FFFFFF',
    // Anthropic's Claude mark, official and unaltered (2026-11-06, the author's choice).
    mark: () => official("<path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"></path>"),
  },
  gemini: {
    label: 'Gemini',
    vendor: 'Google',
    color: '#8E75E8',
    colorLight: '#5B45B8',
    ink: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #4796E3 0%, #8E75E8 55%, #D96570 100%)',
    // Google's Gemini mark, official and unaltered (2026-11-06, the author's choice): its one-colour version,
    // on Gemini's own gradient.
    mark: () => official("<path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\"></path>"),
  },
  opencode: {
    label: 'OpenCode',
    vendor: 'OpenCode',
    color: '#F2C94C',
    colorLight: '#9A7A12',
    ink: '#111111',
    // OpenCode's mark, official and unaltered (2026-11-06, the author's choice).
    mark: () => official("<path d=\"M16 6H8v12h8V6zm4 16H4V2h16v20z\"></path>"),
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
  grok: {
    label: 'Grok',
    vendor: 'xAI',
    color: '#E6E6E6',
    colorLight: '#262626',
    ink: '#111111',
    // xAI's Grok mark, official and unaltered (2026-11-06, the author's choice).
    mark: () => official("<path d=\"M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815\"></path>"),
  },
};

BRANDS.madre = {
  // The local AI is called as it is called in a chat (2026-11-14, the author): MADRE is the place.
  label: '@madre',
  vendor: 'the project · local',
  color: '#34d399',
  colorLight: '#10b981',
  ink: '#04261a',
  // MADRE's M of one stroke and its dot (the rebranding, 2026-11-13), on the 32 grid of the marks.
  mark: () => glyph('<path d="M6.1 25.24V12.04C6.1 5.11 13.03 5.11 14.68 11.05L16.0 15.34L17.32 11.05C18.97 5.11 25.9 5.11 25.9 12.04V17.98" fill="none" stroke="currentColor" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25.9" cy="24.91" r="3.1" fill="currentColor"/>'),
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
