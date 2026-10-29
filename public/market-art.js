// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
  <path d="M120 150C150 80 200 70 236 82" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <path d="M376 300c40 30 70 22 92-6" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <g filter="url(#${id}s)">
    <path d="M176 84h66l14 16h112a20 20 0 0 1 20 20v188a20 20 0 0 1-20 20H176a20 20 0 0 1-20-20V104a20 20 0 0 1 20-20z" fill="#ffffff"/>
    <rect x="182" y="118" width="70" height="22" rx="11" fill="#ecfdf5"/>
    <text x="217" y="133.5" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12.5" font-weight="700" fill="#047857">.ahp/</text>
    ${row(170)}${row(214)}${row(258)}${row(302, false)}
  </g>
  <g filter="url(#${id}s)"><circle cx="96" cy="182" r="40" fill="#f59e0b"/></g>
  <path d="M96 164l5 12.5 13 5.5-13 5.5-5 12.5-5-12.5-13-5.5 13-5.5z" fill="#ffffff"/>
  <g filter="url(#${id}s)"><circle cx="474" cy="262" r="40" fill="#7c5cf0"/></g>
  <path d="M458 262l10 10 20-22" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <g filter="url(#${id}s)" transform="rotate(-18 432 112)"><rect x="404" y="98" width="62" height="26" rx="13" fill="#ffffff"/>${bar(418, 108, 34, 6, '#10b981', .9)}</g>
  <circle cx="470" cy="70" r="5" fill="currentColor" fill-opacity=".18"/><circle cx="74" cy="300" r="4" fill="currentColor" fill-opacity=".15"/><circle cx="520" cy="170" r="3" fill="currentColor" fill-opacity=".15"/>`);
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
  <path d="M30 150l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" fill="currentColor" fill-opacity=".4"/>
  <path d="M530 116l2.2 5.4 5.4 2.2-5.4 2.2-2.2 5.4-2.2-5.4-5.4-2.2 5.4-2.2z" fill="currentColor" fill-opacity=".35"/>
  <path d="M352 104l1.8 4.4 4.4 1.8-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.8z" fill="currentColor" fill-opacity=".35"/>`);
}

// LOCAL AI (2026-10-27): a laptop drawn as one — a dark screen in its bezel, a thin base with its notch —
// with the conversation answered on it by the two sparkles, and beside it what that means: no
// internet needed, nothing leaves. Its accents are the module's flat colour.
const FLAT = 'var(--mk-flat, var(--mk-b, #334155))';
function localScene() {
  const id = `mka${++drawn}`;
  const sparkle = (x, y, k) => `<path d="M${x} ${y - 10 * k}Q${x + 1.4 * k} ${y - 1.4 * k} ${x + 10 * k} ${y}Q${x + 1.4 * k} ${y + 1.4 * k} ${x} ${y + 10 * k}Q${x - 1.4 * k} ${y + 1.4 * k} ${x - 10 * k} ${y}Q${x - 1.4 * k} ${y - 1.4 * k} ${x} ${y - 10 * k}z"/>`;
  return svg(`<defs>${shadow(`${id}s`)}</defs>
  <g filter="url(#${id}s)">
    <rect x="110" y="52" width="340" height="226" rx="16" fill="#1c1f24"/>
    <rect x="122" y="64" width="316" height="198" rx="8" fill="#0f1216"/>
    <path d="M78 284h404a6 6 0 0 1 6 6v4a14 14 0 0 1-14 14H86a14 14 0 0 1-14-14v-4a6 6 0 0 1 6-6z" fill="#d5d9df"/>
    <path d="M244 284h72a0 0 0 0 1 0 0v2a6 6 0 0 1-6 6h-60a6 6 0 0 1-6-6v-2z" fill="#aab1ba"/>
  </g>
  <rect x="140" y="80" width="280" height="22" rx="6" fill="#ffffff" fill-opacity=".06"/>
  ${bar(150, 88, 60, 6, '#ffffff', .35)}
  <rect x="300" y="116" width="106" height="30" rx="14" fill="#ffffff" fill-opacity=".14"/>${bar(312, 128, 80, 6, '#ffffff', .6)}
  <g style="fill:${FLAT}">${sparkle(160, 178, 1.15)}${sparkle(176, 160, .55)}</g>
  <rect x="186" y="160" width="188" height="64" rx="14" fill="#ffffff" fill-opacity=".09"/>
  ${bar(200, 174, 150, 6, '#ffffff', .62)}${bar(200, 188, 128, 6, '#ffffff', .45)}${bar(200, 202, 96, 6, '#ffffff', .35)}
  <rect x="140" y="236" width="280" height="16" rx="8" fill="#ffffff" fill-opacity=".07"/>
  <g filter="url(#${id}s)">
    <rect x="404" y="164" width="138" height="44" rx="22" fill="#ffffff"/>
    <g transform="translate(418 174)" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"><path d="M2 9a16 16 0 0 1 20 0M6 13.5a9.5 9.5 0 0 1 12 0"/><circle cx="12" cy="18" r="1.4" fill="#0f172a" stroke="none"/><path d="M3 2l18 20"/></g>
    ${bar(450, 182, 76, 8, '#0f172a', .6)}
    <rect x="18" y="200" width="122" height="44" rx="22" fill="#ffffff"/>
    <g transform="translate(32 210)"><rect x="3" y="10" width="18" height="13" rx="3.5" style="fill:${FLAT}"/><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" style="stroke:${FLAT}" stroke-width="2.4"/></g>
    ${bar(64, 218, 60, 8, '#0f172a', .6)}
  </g>`);
}

const SCENES = { playwright: browserScene, ahp: handoffScene, 'image-studio': imagesScene, ollama: localScene };

// Every other module (2026-10-27): its app tile, large, in its flat colour with its drawing in white,
// and two cards of what it does floating round it, on the shot's own ground.
function poster(item) {
  const id = `mka${++drawn}`;
  const face = moduleFace(item);
  return svg(`<defs>${shadow(`${id}s`)}</defs>
  <circle cx="280" cy="200" r="150" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width="1.5"/>
  <circle cx="280" cy="200" r="110" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="1.5"/>
  <g filter="url(#${id}s)">
    <rect x="58" y="78" width="148" height="70" rx="16" fill="#ffffff"/>${bar(76, 96, 76, 8, '#0f172a', .6)}${bar(76, 112, 104, 6, '#94a3b8', .55)}${bar(76, 126, 64, 6, '#94a3b8', .4)}
    <rect x="356" y="254" width="148" height="70" rx="16" fill="#ffffff"/>${bar(374, 272, 76, 8, '#0f172a', .6)}${bar(374, 288, 104, 6, '#94a3b8', .55)}${bar(374, 302, 64, 6, '#94a3b8', .4)}
    <rect x="210" y="130" width="140" height="140" rx="33" style="fill:${FLAT}"/>
  </g>
  <g transform="translate(224 144) scale(5.6)" color="#ffffff">${face.icon}</g>`);
}

// THE MODULE AT WORK (1.0.5): a project as a person sees it — the conversation, the bar with the
// module's key lit, and its window open beside, switched on. Drawn from the module's own icon.
function roomScene(item) {
  const id = `mka${++drawn}`;
  const face = moduleFace(item);
  return svg(`<defs>${shadow(`${id}s`)}</defs>
  <g filter="url(#${id}s)">
    <rect x="40" y="40" width="480" height="320" rx="20" fill="#ffffff" fill-opacity=".94"/>
    <rect x="58" y="56" width="444" height="34" rx="12" fill="#eef2f1"/>
    ${bar(72, 69, 56, 8, '#0f172a', .55)}
    <circle cx="300" cy="73" r="10" fill="#e2e8f0"/><circle cx="326" cy="73" r="10" fill="#e2e8f0"/>
    <rect x="342" y="61" width="24" height="24" rx="8" style="fill:${FLAT}"/>
    <g transform="translate(346 65) scale(.8)" color="#ffffff">${face.icon}</g>
    <circle cx="384" cy="73" r="10" fill="#e2e8f0"/><circle cx="476" cy="73" r="10" fill="#e2e8f0"/>
    <rect x="72" y="112" width="190" height="44" rx="16" fill="#f1f5f9"/>${bar(88, 126, 130, 7, '#64748b', .55)}${bar(88, 140, 96, 7, '#64748b', .4)}
    <rect x="132" y="170" width="140" height="34" rx="14" fill="#16a34a" fill-opacity=".85"/>${bar(148, 184, 96, 7, '#ffffff', .9)}
    <rect x="72" y="218" width="200" height="58" rx="16" fill="#f1f5f9"/>${bar(88, 234, 150, 7, '#64748b', .55)}${bar(88, 248, 168, 7, '#64748b', .45)}${bar(88, 262, 90, 7, '#64748b', .35)}
    <rect x="72" y="300" width="200" height="38" rx="14" fill="#ffffff" stroke="#e2e8f0"/>${bar(88, 316, 110, 6, '#94a3b8', .5)}
  </g>
  <g filter="url(#${id}s)">
    <rect x="296" y="112" width="206" height="226" rx="18" fill="#ffffff"/>
    <rect x="314" y="130" width="40" height="40" rx="12" style="fill:${FLAT}"/>
    <g transform="translate(320 136) scale(1.4)" color="#ffffff">${face.icon}</g>
    ${bar(366, 140, 86, 9, '#0f172a', .65)}${bar(366, 156, 62, 6, '#94a3b8', .55)}
    <rect x="314" y="190" width="170" height="40" rx="12" fill="#f1f5f9"/>${bar(328, 207, 70, 7, '#475569', .55)}
    <rect x="440" y="200" width="34" height="20" rx="10" fill="#16a34a"/><circle cx="464" cy="210" r="7" fill="#ffffff"/>
    ${bar(314, 248, 160, 7, '#94a3b8', .5)}${bar(314, 264, 140, 7, '#94a3b8', .4)}${bar(314, 280, 118, 7, '#94a3b8', .35)}
    <rect x="314" y="300" width="80" height="24" rx="12" fill="#0f172a" fill-opacity=".08"/>
  </g>`);
}

// THREE STEPS (1.0.5): find it in the Market, switch it on, and it is working. No words: a basket,
// a switch and the module's own icon with a check, joined by the way they follow each other.
function stepsScene(item) {
  const id = `mka${++drawn}`;
  const face = moduleFace(item);
  const card = (x) => `<rect x="${x}" y="130" width="140" height="150" rx="22" fill="#ffffff" fill-opacity=".94"/>`;
  const arrow = (x) => `<path d="M${x} 205h26m-8-8 8 8-8 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>`;
  const basket = '<g fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.4" y="5.2" width="3.4" height="3.4" rx="1"/><circle cx="10" cy="5.3" r="1.8"/><rect x="12.2" y="5.2" width="3.4" height="3.4" rx="1"/><path d="M2.8 10.4h14.4l-1.5 5.4a1.6 1.6 0 0 1-1.6 1.2H5.9a1.6 1.6 0 0 1-1.6-1.2z"/></g>';
  return svg(`<defs>${shadow(`${id}s`)}</defs>
  <g filter="url(#${id}s)">${card(46)}${card(210)}${card(374)}</g>
  <g transform="translate(86 165) scale(3)">${basket}</g>${bar(86, 246, 60, 7, '#94a3b8', .55)}
  <rect x="244" y="184" width="72" height="40" rx="20" fill="#16a34a"/><circle cx="296" cy="204" r="15" fill="#ffffff"/>${bar(250, 246, 60, 7, '#94a3b8', .55)}
  <rect x="404" y="160" width="80" height="80" rx="22" style="fill:${FLAT}"/>
  <g transform="translate(420 176) scale(2.4)" color="#ffffff">${face.icon}</g>
  <circle cx="478" cy="166" r="15" fill="#16a34a" stroke="#ffffff" stroke-width="3"/><path d="M471 166l5 5 9-10" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  ${bar(414, 256, 60, 7, '#94a3b8', .55)}
  ${arrow(190)}${arrow(354)}`);
}

// The picture of a module: its own scene when it has one — drawn here, or sent with the catalog
// (kept to the shapes a drawing needs, market.js) — and its poster otherwise.
export const marketArt = (item) => (SCENES[item?.id] ? SCENES[item.id]() : cleanSvg(remoteEntry(item?.id)?.art) ?? poster(item));
export const hasScene = (item) => Boolean(SCENES[item?.id] || remoteEntry(item?.id)?.art);
// Its gallery (1.0.5): its picture, then two more — the ones its catalog entry sends (`shots`,
// drawings kept to their shapes), or the module at work and its three steps.
export function marketGallery(item) {
  const sent = (remoteEntry(item?.id)?.shots ?? []).map((one) => cleanSvg(one)).filter(Boolean).slice(0, 2);
  return [marketArt(item), sent[0] ?? roomScene(item), sent[1] ?? stepsScene(item)];
}
