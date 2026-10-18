// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The Market's pictures (2026-10-18): drawn here, in code, not photographed. One scene for each
// module the carousel features — what it does, shown the way a person would see it happen — and a
// poster made from the icon for every other module. No words inside the drawings, so they read the
// same in both languages; each sits on its module's own colors (market.js, `hue`), whatever the
// room's light. Every id inside a drawing is made unique, because two of them can share a page.

import { cleanSvg, moduleFace, remoteEntry } from './market.js';

let drawn = 0;
const svg = (body, { width = 560, height = 400 } = {}) => `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
// A soft shadow under a card, and a card itself: the glass every scene is built from.
const shadow = (id) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".22"/></filter>`;
const bar = (x, y, w, h, fill, opacity = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" fill-opacity="${opacity}"/>`;

// TEST BROWSER: a page open in a browser, the pointer pressing its button, the screenshot that
// comes back, and the console the agent reads.
function browserScene() {
  const id = `mka${++drawn}`;
  return svg(`<defs>${shadow(`${id}s`)}<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfdbfe"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs>
  <g filter="url(#${id}s)">
    <rect x="60" y="44" width="440" height="296" rx="18" fill="#ffffff"/>
    <path d="M78 44h404a18 18 0 0 1 18 18v22H60V62a18 18 0 0 1 18-18z" fill="#eef2f7"/>
    <circle cx="84" cy="64" r="5.5" fill="#ff5f57"/><circle cx="101" cy="64" r="5.5" fill="#febc2e"/><circle cx="118" cy="64" r="5.5" fill="#28c840"/>
    <rect x="150" y="54" width="260" height="20" rx="10" fill="#ffffff" stroke="#dbe3ee"/>
    ${bar(166, 61, 120, 6, '#94a3b8', .7)}
    ${bar(88, 108, 200, 16, '#1d4ed8', .92)}
    ${bar(88, 134, 160, 9, '#94a3b8', .55)}${bar(88, 150, 186, 9, '#94a3b8', .4)}
    <rect x="88" y="174" width="96" height="30" rx="15" fill="#1d4ed8"/>${bar(108, 186, 56, 6, '#ffffff', .9)}
    <rect x="316" y="104" width="156" height="104" rx="14" fill="url(#${id}h)"/>
    <circle cx="352" cy="136" r="12" fill="#ffffff" fill-opacity=".8"/><path d="M316 192l40-36 30 26 22-18 64 48v6a14 14 0 0 1-14 14H330a14 14 0 0 1-14-14z" fill="#1d4ed8" fill-opacity=".45"/>
    <rect x="88" y="228" width="118" height="84" rx="14" fill="#f1f5f9"/><rect x="221" y="228" width="118" height="84" rx="14" fill="#f1f5f9"/><rect x="354" y="228" width="118" height="84" rx="14" fill="#f1f5f9"/>
    ${bar(102, 244, 44, 8, '#1d4ed8', .55)}${bar(102, 262, 84, 6, '#94a3b8', .5)}${bar(102, 276, 66, 6, '#94a3b8', .4)}
    ${bar(235, 244, 44, 8, '#1d4ed8', .55)}${bar(235, 262, 84, 6, '#94a3b8', .5)}${bar(235, 276, 66, 6, '#94a3b8', .4)}
    ${bar(368, 244, 44, 8, '#1d4ed8', .55)}${bar(368, 262, 84, 6, '#94a3b8', .5)}${bar(368, 276, 66, 6, '#94a3b8', .4)}
  </g>
  <circle cx="160" cy="196" r="20" fill="#ffffff" fill-opacity=".35"/><circle cx="160" cy="196" r="11" fill="#ffffff" fill-opacity=".55"/>
  <path d="M158 192l26 10-11 4-4 11z" fill="#0f172a" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
  <g filter="url(#${id}s)" transform="rotate(-7 455 300)">
    <rect x="380" y="250" width="150" height="104" rx="12" fill="#ffffff"/>
    <rect x="390" y="260" width="130" height="70" rx="7" fill="#e0e7ff"/>${bar(398, 268, 60, 7, '#1d4ed8', .8)}${bar(398, 282, 44, 5, '#94a3b8', .6)}<rect x="398" y="294" width="32" height="12" rx="6" fill="#1d4ed8"/>
    <rect x="466" y="268" width="46" height="34" rx="6" fill="url(#${id}h)"/>
    ${bar(390, 338, 70, 6, '#94a3b8', .5)}
  </g>
  <circle cx="523" cy="252" r="16" fill="#22c55e" stroke="#ffffff" stroke-width="3"/><path d="M516 252l5 5 9-10" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <g filter="url(#${id}s)">
    <rect x="24" y="292" width="178" height="78" rx="14" fill="#0f172a" fill-opacity=".94"/>
    ${bar(40, 310, 12, 6, '#4ade80')}${bar(58, 310, 96, 6, '#e2e8f0', .7)}
    ${bar(40, 326, 12, 6, '#4ade80')}${bar(58, 326, 120, 6, '#e2e8f0', .5)}
    ${bar(40, 342, 12, 6, '#60a5fa')}${bar(58, 342, 70, 6, '#e2e8f0', .35)}
  </g>`);
}

// CONTINUITY: one agent hands the work to another, and the project's state stays in .ahp/, beside
// the code, with what was checked.
function handoffScene() {
  const id = `mka${++drawn}`;
  const row = (y, done = true) => `<circle cx="210" cy="${y}" r="11" fill="${done ? '#10b981' : '#e2e8f0'}"/>${done ? `<path d="M205 ${y}l4 4 7-8" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${bar(232, y - 9, 118, 8, '#0f172a', .7)}${bar(232, y + 3, 82, 6, '#94a3b8', .5)}`;
  return svg(`<defs>${shadow(`${id}s`)}
    <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#ea580c"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#818cf8"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>
  <path d="M120 150C150 80 200 70 236 82" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <path d="M376 300c40 30 70 22 92-6" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <g filter="url(#${id}s)">
    <path d="M176 84h66l14 16h112a20 20 0 0 1 20 20v188a20 20 0 0 1-20 20H176a20 20 0 0 1-20-20V104a20 20 0 0 1 20-20z" fill="#ffffff"/>
    <rect x="182" y="118" width="70" height="22" rx="11" fill="#ecfdf5"/>
    <text x="217" y="133.5" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12.5" font-weight="700" fill="#047857">.ahp/</text>
    ${row(170)}${row(214)}${row(258)}${row(302, false)}
  </g>
  <g filter="url(#${id}s)"><circle cx="96" cy="182" r="40" fill="url(#${id}a)"/></g>
  <path d="M96 164l5 12.5 13 5.5-13 5.5-5 12.5-5-12.5-13-5.5 13-5.5z" fill="#ffffff"/>
  <g filter="url(#${id}s)"><circle cx="474" cy="262" r="40" fill="url(#${id}b)"/></g>
  <path d="M458 262l10 10 20-22" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <g filter="url(#${id}s)" transform="rotate(-18 432 112)"><rect x="404" y="98" width="62" height="26" rx="13" fill="#ffffff"/>${bar(418, 108, 34, 6, '#10b981', .9)}</g>
  <circle cx="470" cy="70" r="5" fill="#ffffff" fill-opacity=".7"/><circle cx="74" cy="300" r="4" fill="#ffffff" fill-opacity=".6"/><circle cx="520" cy="170" r="3" fill="#ffffff" fill-opacity=".6"/>`);
}

// IMAGES: what was asked, in a line, and what came back: the picture, with its other takes beside it.
function imagesScene() {
  const id = `mka${++drawn}`;
  const take = (y, stops, chosen = false) => `<g filter="url(#${id}s)"><rect x="384" y="${y}" width="128" height="68" rx="12" fill="url(#${id}${stops})"/>${chosen ? `<rect x="381" y="${y - 3}" width="134" height="74" rx="14" fill="none" stroke="#ffffff" stroke-width="3"/>` : ''}<path d="M384 ${y + 52}l30-20 22 16 18-12 58 22v2a12 12 0 0 1-12 12H396a12 12 0 0 1-12-12z" fill="#000" fill-opacity=".22"/></g>`;
  return svg(`<defs>${shadow(`${id}s`)}
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fb7185"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
    <linearGradient id="${id}t1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7f3d0"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient>
    <linearGradient id="${id}t2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef3c7"/><stop offset="1" stop-color="#f97316"/></linearGradient>
    <linearGradient id="${id}t3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#9333ea"/></linearGradient>
    <linearGradient id="${id}go" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#c026d3"/></linearGradient>
    <clipPath id="${id}c"><rect x="56" y="116" width="304" height="232" rx="18"/></clipPath></defs>
  <g filter="url(#${id}s)">
    <rect x="56" y="36" width="456" height="54" rx="27" fill="#ffffff"/>
    <circle cx="84" cy="63" r="14" fill="#fdf2f8"/><path d="M84 54l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill="#db2777"/>
    ${bar(108, 54, 170, 8, '#0f172a', .65)}${bar(108, 68, 120, 6, '#94a3b8', .55)}
    <rect x="404" y="45" width="96" height="36" rx="18" fill="url(#${id}go)"/>${bar(426, 60, 52, 6, '#ffffff', .9)}
  </g>
  <g filter="url(#${id}s)">
    <rect x="56" y="116" width="304" height="232" rx="18" fill="url(#${id}sky)"/>
    <g clip-path="url(#${id}c)">
      <circle cx="244" cy="206" r="40" fill="#fff7ed" fill-opacity=".92"/>
      <path d="M56 300l70-70 50 44 46-40 70 56 68-46v104H56z" fill="#831843" fill-opacity=".72"/>
      <path d="M56 330l92-52 64 34 58-28 90 46v18H56z" fill="#4c1d95" fill-opacity=".85"/>
    </g>
    <rect x="56" y="116" width="304" height="232" rx="18" fill="none" stroke="#ffffff" stroke-width="5"/>
  </g>
  ${take(116, 't1')}${take(198, 't2', true)}${take(280, 't3')}
  <path d="M30 150l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" fill="#ffffff" fill-opacity=".85"/>
  <path d="M530 116l2.2 5.4 5.4 2.2-5.4 2.2-2.2 5.4-2.2-5.4-5.4-2.2 5.4-2.2z" fill="#ffffff" fill-opacity=".8"/>
  <path d="M352 104l1.8 4.4 4.4 1.8-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.8z" fill="#ffffff" fill-opacity=".8"/>`);
}

// LOCAL AI: the computer itself thinking — a memory of linked notes on its screen — with no cloud
// above it and a lock beside it: nothing leaves.
function localScene() {
  const id = `mka${++drawn}`;
  const nodes = [[220, 132], [300, 112], [360, 160], [326, 214], [244, 206], [200, 172], [288, 166]];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5]];
  const net = links.map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="#86efac" stroke-opacity=".55" stroke-width="2"/>`).join('')
    + nodes.map(([x, y], index) => (index === 6 ? `<circle cx="${x}" cy="${y}" r="22" fill="#4ade80" fill-opacity=".22"/><circle cx="${x}" cy="${y}" r="13" fill="#4ade80"/>` : `<circle cx="${x}" cy="${y}" r="7" fill="#bbf7d0"/>`)).join('');
  return svg(`<defs>${shadow(`${id}s`)}<radialGradient id="${id}g" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#14532d"/><stop offset="1" stop-color="#052e16"/></radialGradient></defs>
  <g filter="url(#${id}s)">
    <rect x="128" y="64" width="320" height="206" rx="16" fill="#ffffff"/>
    <rect x="140" y="76" width="296" height="182" rx="9" fill="url(#${id}g)"/>
    <path d="M96 278h384l-26 30H122z" fill="#ffffff"/><rect x="250" y="282" width="76" height="7" rx="3.5" fill="#cbd5e1"/>
  </g>
  ${net}
  <g filter="url(#${id}s)">
    <rect x="22" y="112" width="104" height="58" rx="12" fill="#ffffff"/>${bar(36, 128, 58, 7, '#15803d', .85)}${bar(36, 142, 76, 6, '#94a3b8', .55)}${bar(36, 154, 48, 6, '#94a3b8', .4)}
    <rect x="452" y="186" width="104" height="58" rx="12" fill="#ffffff"/>${bar(466, 202, 58, 7, '#15803d', .85)}${bar(466, 216, 76, 6, '#94a3b8', .55)}${bar(466, 228, 48, 6, '#94a3b8', .4)}
  </g>
  <path d="M126 141c40 0 50-6 74 28" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round"/>
  <path d="M452 215c-46 0-60 2-92-50" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round"/>
  <g transform="translate(452 40)">
    <path d="M22 50h52a20 20 0 0 0 2-40 28 28 0 0 0-52-6A22 22 0 0 0 22 50z" fill="#ffffff" fill-opacity=".9"/>
    <path d="M14 8l70 52" stroke="#15803d" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g filter="url(#${id}s)"><circle cx="80" cy="282" r="34" fill="#ffffff"/></g>
  <rect x="66" y="280" width="28" height="22" rx="5" fill="#15803d"/><path d="M71 280v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#15803d" stroke-width="4.5"/>
  <circle cx="80" cy="290" r="3" fill="#ffffff"/>`);
}

const SCENES = { playwright: browserScene, ahp: handoffScene, 'image-studio': imagesScene, ollama: localScene };

// Every other module: its icon, large, with the cards of what it touches floating round it.
function poster(item) {
  const id = `mka${++drawn}`;
  const face = moduleFace(item);
  return svg(`<defs>${shadow(`${id}s`)}<radialGradient id="${id}r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
  <circle cx="280" cy="200" r="190" fill="url(#${id}r)"/>
  <g filter="url(#${id}s)">
    <rect x="58" y="74" width="138" height="72" rx="14" fill="#ffffff" fill-opacity=".92"/>${bar(74, 92, 70, 8, '#0f172a', .6)}${bar(74, 108, 100, 6, '#94a3b8', .55)}${bar(74, 122, 64, 6, '#94a3b8', .4)}
    <rect x="370" y="258" width="138" height="72" rx="14" fill="#ffffff" fill-opacity=".92"/>${bar(386, 276, 70, 8, '#0f172a', .6)}${bar(386, 292, 100, 6, '#94a3b8', .55)}${bar(386, 306, 64, 6, '#94a3b8', .4)}
    <rect x="200" y="120" width="160" height="160" rx="38" fill="#ffffff" fill-opacity=".2" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/>
  </g>
  <g transform="translate(220 140) scale(6)" color="#ffffff">${face.icon}</g>
  <circle cx="420" cy="110" r="6" fill="#ffffff" fill-opacity=".7"/><circle cx="140" cy="300" r="5" fill="#ffffff" fill-opacity=".6"/>`);
}

// The picture of a module: its own scene when it has one — drawn here, or sent with the catalog
// (kept to the shapes a drawing needs, market.js) — and its poster otherwise.
export const marketArt = (item) => (SCENES[item?.id] ? SCENES[item.id]() : cleanSvg(remoteEntry(item?.id)?.art) ?? poster(item));
export const hasScene = (item) => Boolean(SCENES[item?.id] || remoteEntry(item?.id)?.art);
