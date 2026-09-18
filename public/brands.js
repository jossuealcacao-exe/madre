// Visual identity per agent.
//
// Colors follow each vendor's public palette so a Codex bubble reads as Codex
// and a Claude bubble as Claude. The marks are MADRE's own monograms: the
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
    mark: () => glyph('<path fill="currentColor" d="M16 4l10.4 6v12L16 28 5.6 22V10L16 4zm0 3.4L8.5 11.7v8.6L16 24.6l7.5-4.3v-8.6L16 7.4zm0 4.2l3.9 2.2v4.4L16 20.4l-3.9-2.2v-4.4L16 11.6z"/>'),
  },
  claude: {
    label: 'Claude',
    vendor: 'Anthropic',
    color: '#D97757',
    colorLight: '#B85C3C',
    ink: '#FFFFFF',
    mark: () => glyph('<path fill="currentColor" d="M15 5h2l1.2 8.3 6.1-5.7 1.4 1.4-5.7 6.1L28.3 16v2l-8.3 1.2 5.7 6.1-1.4 1.4-6.1-5.7L17 29h-2l-1.2-8.3-6.1 5.7-1.4-1.4 5.7-6.1L3.7 18v-2l8.3-1.2-5.7-6.1 1.4-1.4 6.1 5.7L15 5z" opacity=".95"/>'),
  },
  gemini: {
    label: 'Gemini',
    vendor: 'Google',
    color: '#8E75E8',
    colorLight: '#5B45B8',
    ink: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #4796E3 0%, #8E75E8 55%, #D96570 100%)',
    mark: () => glyph('<path fill="currentColor" d="M16 3c.6 7.1 5.9 12.4 13 13-7.1.6-12.4 5.9-13 13-.6-7.1-5.9-12.4-13-13 7.1-.6 12.4-5.9 13-13z"/>'),
  },
  opencode: {
    label: 'OpenCode',
    vendor: 'OpenCode',
    color: '#F2C94C',
    colorLight: '#9A7A12',
    ink: '#111111',
    mark: () => glyph('<path fill="currentColor" d="M11 8l-7 8 7 8 2.2-2.2L7.4 16l5.8-5.8L11 8zm10 0l-2.2 2.2 5.8 5.8-5.8 5.8L21 24l7-8-7-8zm-3.6-1.5l2.3.6-5.1 18.4-2.3-.6 5.1-18.4z"/>'),
  },
};

BRANDS.ollama = {
  label: 'Ollama',
  vendor: 'local',
  color: '#E6E6E6',
  colorLight: '#3A3A3A',
  ink: '#111111',
  mark: () => glyph('<circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12.5" cy="15" r="1.6" fill="currentColor"/><circle cx="19.5" cy="15" r="1.6" fill="currentColor"/>'),
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
