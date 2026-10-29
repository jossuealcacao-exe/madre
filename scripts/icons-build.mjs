// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Trazo MADRE (2026-10-28): writes public/icons.js. Every drawing on a 20 grid inside 2..18, one
// stroke (1.6, set on the <svg>), round caps and joins, no sharp corner, no line crossing another.
// The classes inside the drawings are the hooks the CSS animates (ic-f fills, ic-k knocks out,
// ic-male/ic-female slide, …): a drawing keeps them when it is redrawn. The shapes that are worked
// out (the cog, the ring behind the planet, the rounded triangle, star and cube) are computed here
// and written as plain numbers. After a change: `node scripts/icons-build.mjs`, then
// `node scripts/icons.mjs --write` for the copies in the pages.
import { writeFileSync } from 'node:fs';

const f = (n) => Number(n.toFixed(2)).toString();
function roundPoly(points, r) {
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[(i - 1 + n) % n];
    const b = points[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la / 2);
    const rb = Math.min(r, lb / 2);
    const s = [p[0] + ((a[0] - p[0]) * ra) / la, p[1] + ((a[1] - p[1]) * ra) / la];
    const e = [p[0] + ((b[0] - p[0]) * rb) / lb, p[1] + ((b[1] - p[1]) * rb) / lb];
    d += `${i === 0 ? 'M' : 'L'}${f(s[0])} ${f(s[1])}Q${f(p[0])} ${f(p[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return `${d}Z`;
}
function cog({ cx = 10, cy = 10, outer = 7.4, inner = 5.5, teeth = 6, top = 0.42, root = 0.5, r = 0.9 } = {}) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const t = (step * top) / 2;
    const g = (step * root) / 2;
    pts.push([cx + inner * Math.cos(a - t - g * 0.55), cy + inner * Math.sin(a - t - g * 0.55)]);
    pts.push([cx + outer * Math.cos(a - t), cy + outer * Math.sin(a - t)]);
    pts.push([cx + outer * Math.cos(a + t), cy + outer * Math.sin(a + t)]);
    pts.push([cx + inner * Math.cos(a + t + g * 0.55), cy + inner * Math.sin(a + t + g * 0.55)]);
  }
  return roundPoly(pts, r);
}
// The ring of the planet, broken where it passes behind it.
const RING = { cx: 10, cy: 10, rx: 8, ry: 2.9, rot: -22, planet: 4.7, gap: 1.2 };
function ringAt(t) {
  const c = Math.cos((RING.rot * Math.PI) / 180);
  const s = Math.sin((RING.rot * Math.PI) / 180);
  const x = RING.rx * Math.cos(t);
  const y = RING.ry * Math.sin(t);
  return [RING.cx + x * c - y * s, RING.cy + x * s + y * c];
}
function ring() {
  const hidden = (t) => { const [x, y] = ringAt(t); return Math.sin(t) < 0 && Math.hypot(x - RING.cx, y - RING.cy) < RING.planet + RING.gap; };
  const N = 1440;
  const step = (Math.PI * 2) / N;
  let from = null;
  let to = null;
  for (let i = 0; i < N; i++) {
    const t = i * step;
    if (hidden(t) && !hidden(t - step)) from = t;
    if (!hidden(t) && hidden(t - step)) to = t;
  }
  const a = ringAt(to);
  const b = ringAt(from);
  return `M${f(a[0])} ${f(a[1])}A${RING.rx} ${RING.ry} ${RING.rot} 1 1 ${f(b[0])} ${f(b[1])}`;
}
// A moon that goes round the ring from where it rests (sm-macro, salas-mac.js begins it).
function moon(t, r, extra = '') {
  const [x, y] = ringAt(t);
  const [ox, oy] = ringAt(t + Math.PI);
  const dx = f(ox - x);
  const dy = f(oy - y);
  const back = `${f(x - ox)} ${f(y - oy)}`;
  return `<circle class="ic-planet" cx="${f(x)}" cy="${f(y)}" r="${r}" fill="currentColor" stroke="none"${extra}><animateMotion begin="indefinite" dur="2.4s" repeatCount="indefinite" path="M0 0a${RING.rx} ${RING.ry} ${RING.rot} 1 1 ${dx} ${dy}a${RING.rx} ${RING.ry} ${RING.rot} 1 1 ${back}"/></circle>`;
}
const dot = (x, y) => `<path d="M${x} ${y}h.01"/>`;
const filled = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
const tri = roundPoly([[10, 3.2], [17.2, 16], [2.8, 16]], 2.2);
const star = roundPoly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 3.3 : 7.2; return [10 + r * Math.cos(a), 10.6 + r * Math.sin(a)]; }), 1.1);
const hexCube = roundPoly([[10, 3], [16.2, 6.5], [16.2, 13.5], [10, 17], [3.8, 13.5], [3.8, 6.5]], 1.4);
const COG = cog();
const GEAR_HOLE = 'M12.3 10a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0z';

// Shapes shared by several drawings.
const BOX = '<rect x="2.8" y="3.8" width="14.4" height="12.4" rx="3"/>';
const FOLDER = 'M2.8 6.4a2.2 2.2 0 0 1 2.2-2.2h2.7a1.6 1.6 0 0 1 1.2.55l1 1.25h5.1a2.2 2.2 0 0 1 2.2 2.2v5.8a2.2 2.2 0 0 1-2.2 2.2H5a2.2 2.2 0 0 1-2.2-2.2z';
const BUBBLE = 'M10 3.4c3.9 0 6.8 2.6 6.8 5.9s-2.9 5.9-6.8 5.9c-.8 0-1.6-.1-2.3-.3l-3.4 1.5.8-3.1C3.9 12.2 3.2 10.8 3.2 9.3 3.2 6 6.1 3.4 10 3.4z';
const BAG = 'M5.3 6.8h9.4a1.1 1.1 0 0 1 1.1 1.2l-.7 6.9a2 2 0 0 1-2 1.8H6.9a2 2 0 0 1-2-1.8L4.2 8a1.1 1.1 0 0 1 1.1-1.2z';
const BAG_HANDLE = 'M7.2 6.8v-.6a2.8 2.8 0 0 1 5.6 0v.6';
const SHIELD = 'M9.3 3.1 5.2 4.7a1.2 1.2 0 0 0-.8 1.1v3.6c0 3.6 2.4 6.4 5.6 7.8 3.2-1.4 5.6-4.2 5.6-7.8V5.8a1.2 1.2 0 0 0-.8-1.1l-4.1-1.6a1.9 1.9 0 0 0-1.4 0z';
const PIN = 'M7.4 3.6h5.2M8.4 3.6l-.5 4-2.4 2.2a.9.9 0 0 0 .6 1.6h7.8a.9.9 0 0 0 .6-1.6l-2.4-2.2-.5-4M10 11.4v5';
const REFRESH = '<path d="M16.2 10a6.2 6.2 0 1 1-1.9-4.5l1.9 1.9"/><path d="M16.2 3.6v3.8h-3.8"/>';
const BRAIN_L = 'M9.3 4.6C8.6 3.4 6.5 3.3 5.9 4.9 4.3 5 3.3 6.7 4 8.1 2.8 9.1 2.9 11.1 4.3 11.8 4.1 13.6 5.7 15.1 7.5 14.6 7.9 15.6 8.6 16.2 9.3 16.2z';
const BRAIN_R = 'M10.7 4.6C11.4 3.4 13.5 3.3 14.1 4.9 15.7 5 16.7 6.7 16 8.1 17.2 9.1 17.1 11.1 15.7 11.8 15.9 13.6 14.3 15.1 12.5 14.6 12.1 15.6 11.4 16.2 10.7 16.2z';
const BRAIN_FOLDS = 'M6.4 9.4c.9 0 1.6.5 1.9 1.3M13.6 9.4c-.9 0-1.6.5-1.9 1.3M7.2 6.6c.5.2.9.6 1 1.1M12.8 6.6c-.5.2-.9.6-1 1.1';
const SPARK_BIG = 'M8 5.2Q8.85 10.65 14.3 11.5Q8.85 12.35 8 17.8Q7.15 12.35 1.7 11.5Q7.15 10.65 8 5.2z';
const SPARK_SMALL = 'M15 2.2Q15.4 4.6 17.8 5Q15.4 5.4 15 7.8Q14.6 5.4 12.2 5Q14.6 4.6 15 2.2z';
const PULSE = 'M2 10h3.2l1.6-4.4 2.6 8.8 2-4.4h1.4l1.2-2.4 1.2 2.4H18';
const GAUGE = 'M3.2 14.2a6.8 6.8 0 0 1 13.6 0';
const PLUG = '<path d="M7.4 3v3.4M12.6 3v3.4"/><path d="M5.2 6.4h9.6v2.8a4.8 4.8 0 0 1-9.6 0z"/><path d="M10 14v3"/>';
const CHAIN_BAR = 'M8.4 11.6l3.2-3.2';
const CHAIN_A = 'M8.6 6.7l1.3-1.3a3.4 3.4 0 0 1 4.8 4.8L13.4 11.5';
const CHAIN_B = 'M11.4 13.3l-1.3 1.3a3.4 3.4 0 0 1-4.8-4.8L6.6 8.5';
const PEOPLE = '<circle cx="7.6" cy="7" r="2.7"/><path d="M2.8 16.4a4.8 4.8 0 0 1 9.6 0"/><path d="M12.4 4.5a2.7 2.7 0 0 1 0 5M14.6 12a4.8 4.8 0 0 1 2.6 4.4"/>';
const HUB = '<circle cx="10" cy="10" r="2.4"/><circle cx="10" cy="3.8" r="1.4"/><circle cx="4.6" cy="14" r="1.4"/><circle cx="15.4" cy="14" r="1.4"/><path d="M10 5.2v2.4M5.8 13.2l2.1-1.6M14.2 13.2l-2.1-1.6"/>';

export const ICONS = {
  // ---- Moving about
  close: '<path d="M5.4 5.4l9.2 9.2M14.6 5.4l-9.2 9.2"/>',
  add: '<path d="M10 4.4v11.2M4.4 10h11.2"/>',
  minus: '<path d="M4.4 10h11.2"/>',
  chevron: '<path d="M5.6 8 10 12.4 14.4 8"/>',
  back: '<path d="M12.2 5.2 7.4 10l4.8 4.8"/>',
  next: '<path d="M7.8 5.2 12.6 10l-4.8 4.8"/>',
  'arrow-down': '<path d="M10 4v11.6M5.6 11.2 10 15.6l4.4-4.4"/>',
  'arrow-up': '<path d="M10 16V4.4M5.6 8.8 10 4.4l4.4 4.4"/>',
  return: '<path d="M15.6 4.4v4.4a2.8 2.8 0 0 1-2.8 2.8H4.6"/><path d="M8.2 8 4.6 11.6l3.6 3.6"/>',
  reply: '<path d="M8 5 4 9l4 4"/><path d="M4.4 9h6.8a4.6 4.6 0 0 1 4.6 4.6v.8"/>',
  out: '<path d="M6.2 13.8 13.6 6.4M7.6 6.2h6.2v6.2"/>',
  open: '<path d="M9 4.2H6.6a2.4 2.4 0 0 0-2.4 2.4v6.8a2.4 2.4 0 0 0 2.4 2.4h6.8a2.4 2.4 0 0 0 2.4-2.4V11"/><path d="M12 4.2h3.8V8M15.6 4.4l-5.4 5.4"/>',
  move: '<path d="M10 3.6v12.8M6 7.6l4-4 4 4M6 12.4l4 4 4-4"/>',
  swap: '<path d="M4 7h11.6M12.6 4l3 3-3 3M16 13H4.4M7.4 10l-3 3 3 3"/>',
  goto: '<path d="M3.6 10h9.2M9.6 6.4l3.6 3.6-3.6 3.6M16.4 4.4v11.2"/>',
  // ---- Answers and states
  check: '<path d="M4.6 10.4l3.6 3.6 7.2-7.6"/>',
  more: `${filled(5, 10, 1.5)}${filled(10, 10, 1.5)}${filled(15, 10, 1.5)}`,
  warning: `<path d="${tri}"/><path d="M10 8.2v3.2"/>${dot(10, 13.8)}`,
  alert: `<circle cx="10" cy="10" r="6.8"/><path d="M10 6.6v4"/>${dot(10, 13.4)}`,
  help: `<circle cx="10" cy="10" r="7"/><path d="M7.9 8a2.1 2.1 0 1 1 2.9 1.9c-.5.2-.8.6-.8 1.1v.4"/>${dot(10, 13.7)}`,
  never: '<circle cx="10" cy="10" r="6.6"/><path d="M5.4 14.6l9.2-9.2"/>',
  stop: '<rect x="5.4" y="5.4" width="9.2" height="9.2" rx="2.6" fill="currentColor" stroke="none"/>',
  'stop-key': '<rect class="ic-f" x="4.4" y="4.4" width="11.2" height="11.2" rx="3.2"/>',
  'stop-circle': '<circle cx="10" cy="10" r="7.4"/><rect x="7.2" y="7.2" width="5.6" height="5.6" rx="1.6"/>',
  good: '<path d="M6.6 9v7H4.4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z"/><path d="M6.6 9l3-5.2a1.6 1.6 0 0 1 2.9 1.1L12 8.2h3.2a1.6 1.6 0 0 1 1.6 1.9l-1 4.6a1.6 1.6 0 0 1-1.6 1.3H6.6"/>',
  bad: '<g transform="rotate(180 10 10)"><path d="M6.6 9v7H4.4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z"/><path d="M6.6 9l3-5.2a1.6 1.6 0 0 1 2.9 1.1L12 8.2h3.2a1.6 1.6 0 0 1 1.6 1.9l-1 4.6a1.6 1.6 0 0 1-1.6 1.3H6.6"/></g>',
  star: `<path d="${star}"/>`,
  'star-filled': `<path d="${star}" fill="currentColor"/>`,
  heart: '<path d="M10 16.2s-6-3.4-6-7.8A3.4 3.4 0 0 1 10 6.6a3.4 3.4 0 0 1 6 1.8c0 4.4-6 7.8-6 7.8z"/>',
  target: '<circle cx="10" cy="10" r="6.6"/><circle cx="10" cy="10" r="2.4"/>',
  crosshair: `<circle cx="10" cy="10" r="5.2"/>${filled(10, 10, 1.4)}<path d="M10 2.4v2.4M10 15.2v2.4M2.4 10h2.4M15.2 10h2.4"/>`,
  area: '<path d="M7.2 4.6h5.6M7.2 15.4h5.6M4.6 7.2v5.6M15.4 7.2v5.6"/><rect x="2.8" y="2.8" width="3.6" height="3.6" rx="1.2"/><rect x="13.6" y="2.8" width="3.6" height="3.6" rx="1.2"/><rect x="2.8" y="13.6" width="3.6" height="3.6" rx="1.2"/><rect x="13.6" y="13.6" width="3.6" height="3.6" rx="1.2"/>',
  pointer: '<path d="M5.4 4.2v10.9c0 .6.7.9 1.1.5l2.4-2.3 1.9 4c.2.4.7.6 1.1.4l.9-.4c.4-.2.6-.7.4-1.1l-1.9-4h3.3c.6 0 .9-.7.4-1.1L6.5 3.6c-.4-.4-1.1-.1-1.1.6z"/>',
  // ---- Doing things
  search: '<circle cx="9" cy="9" r="5.4"/><path d="m13.1 13.1 3.5 3.5"/>',
  refresh: REFRESH,
  sync: '<path d="M15.8 8.6A6 6 0 0 0 4.9 6.4"/><path d="M4.2 11.4a6 6 0 0 0 10.9 2.2"/><path d="M15.9 3.6v5h-5M4.1 16.4v-5h5"/>',
  reset: '<path d="M3.8 10a6.2 6.2 0 1 0 1.9-4.5L3.8 7.4"/><path d="M3.8 3.6v3.8h3.8"/>',
  download: '<path d="M10 3.6v8.8M6.4 9l3.6 3.6L13.6 9"/><path d="M3.8 13.4v.8a2.2 2.2 0 0 0 2.2 2.2h8a2.2 2.2 0 0 0 2.2-2.2v-.8"/>',
  copy: '<rect x="7.2" y="7.2" width="9.4" height="9.4" rx="2.6"/><path d="M12.8 7.2V6a2.6 2.6 0 0 0-2.6-2.6H6A2.6 2.6 0 0 0 3.4 6v4.2A2.6 2.6 0 0 0 6 12.8h1.2"/>',
  trash: '<g class="ic-lid"><path d="M3.8 5.8h12.4"/><path d="M8 5.8V4.6a1.2 1.2 0 0 1 1.2-1.2h1.6A1.2 1.2 0 0 1 12 4.6v1.2"/></g><path d="M5.4 5.8l.7 9a2 2 0 0 0 2 1.8h3.8a2 2 0 0 0 2-1.8l.7-9"/><path d="M8.6 9.2v4.2M11.4 9.2v4.2"/>',
  pin: `<path d="${PIN}"/>`,
  unpin: `<path d="${PIN}"/><path d="M3.6 3.6l12.8 12.8"/>`,
  pencil: '<path d="M13 4.2a2 2 0 0 1 2.8 2.8l-8.4 8.4-3.8 1 1-3.8z"/><path d="M11.6 5.6l2.8 2.8"/>',
  compose: '<path d="M9 3.8H6.4a2.6 2.6 0 0 0-2.6 2.6v7.2a2.6 2.6 0 0 0 2.6 2.6h7.2a2.6 2.6 0 0 0 2.6-2.6V11"/><path d="M13.9 3.6a1.77 1.77 0 0 1 2.5 2.5l-5.3 5.3-3.1.8.8-3.1z"/>',
  sliders: '<path d="M3.8 6.4h5.4M12.8 6.4h3.4M3.8 13.6h2.4M9.8 13.6h6.4"/><circle cx="11" cy="6.4" r="1.8"/><circle cx="8" cy="13.6" r="1.8"/>',
  sort: '<path d="M6 4.4v11.2M3.6 13.2 6 15.6l2.4-2.4"/><path d="M11 6h5.4M11 10h4M11 14h2.6"/>',
  list: '<path d="M4 5.6h12M4 10h12M4 14.4h8"/>',
  arrange: '<rect x="2.6" y="5.4" width="14.8" height="9.2" rx="3"/><path d="M6.4 10h2M11.6 10h2"/>',
  power: '<path d="M10 3.4v6"/><path d="M6.2 5.6a6 6 0 1 0 7.6 0"/>',
  attach: '<path d="M15.4 9.8 10 15.2a3.6 3.6 0 0 1-5.1-5.1l5.8-5.8a2.4 2.4 0 0 1 3.4 3.4l-5.7 5.7a1.2 1.2 0 0 1-1.7-1.7l5.2-5.2"/>',
  replace: '<path d="M4 7h10.6M12 4.4 14.6 7 12 9.6M16 13H5.4M8 10.4 5.4 13 8 15.6"/>',
  comment: '<path d="M8.8 4 6 16M14.4 4l-2.8 12"/>',
  wrap: '<path d="M3.6 5.6h12.8M3.6 10h10a2.6 2.6 0 0 1 0 5.2H10.4"/><path d="M12 13.4l-1.8 1.8 1.8 1.8M3.6 15.2h3.4"/>',
  keyboard: `<rect x="2.8" y="5.4" width="14.4" height="9.2" rx="2.6"/>${dot(6, 8.6)}${dot(8.7, 8.6)}${dot(11.3, 8.6)}${dot(14, 8.6)}<path d="M7 11.6h6"/>`,
  // ---- Windows and panels
  window: '<path class="ic-k" d="M3.4 12.6V6a2.6 2.6 0 0 1 2.6-2.6h6.6"/><rect class="ic-f" x="6.4" y="6.4" width="10.2" height="10.2" rx="2.6"/>',
  split: '<rect class="ic-f" x="2.8" y="3.8" width="14.4" height="12.4" rx="3"/><path class="ic-k" d="M10 6.4v7.2"/>',
  'split-left': `${BOX}<rect class="ic-h" x="5.2" y="6.2" width="3.6" height="7.6" rx="1.4"/><path d="M11 6.6v6.8"/>`,
  'split-right': `${BOX}<rect class="ic-h" x="11.2" y="6.2" width="3.6" height="7.6" rx="1.4"/><path d="M9 6.6v6.8"/>`,
  beside: `${BOX}<path d="M10 3.8v12.4"/><path d="M5.4 7.6h2.2M5.4 10h1.4M5.4 12.4h2.2"/><rect x="12" y="8.2" width="3" height="3.6" rx="1"/>`,
  sidebar: `${BOX}<path d="M7.8 3.8v12.4"/>`,
  card: '<rect x="3" y="4" width="14" height="12.4" rx="3"/><path d="M3 8.8h14M8 6.4h4"/>',
  // ---- Places and things
  home: '<path d="M3.2 9.4 8.7 4.6a2 2 0 0 1 2.6 0l5.5 4.8"/><path class="ic-f" d="M5 8.2v6.2a2.2 2.2 0 0 0 2.2 2.2h1v-2.8a1.8 1.8 0 0 1 3.6 0v2.8h1a2.2 2.2 0 0 0 2.2-2.2V8.2"/>',
  chat: `<path class="ic-f" d="${BUBBLE}"/>`,
  'chat-key': `<path class="ic-f" d="${BUBBLE}"/><path class="ic-k" pathLength="1" d="M7 8.6h6M7 11.2h3.6"/>`,
  // The other open projects (app.js, switchKey): the one behind slides out on hover (svg > path).
  switch: '<rect class="ic-f" x="3.4" y="6.6" width="10" height="10" rx="2.6"/><path d="M6.6 3.4h7.4a2.6 2.6 0 0 1 2.6 2.6v7.4"/>',
  folder: `<path d="${FOLDER}"/>`,
  'folder-key': `<path class="ic-f" d="${FOLDER}"/><path class="ic-k" d="M3 8.6h14"/><path class="ic-open" d="M2.9 15.9 5.2 10.1a1.4 1.4 0 0 1 1.3-.9h11.3c.7 0 1.2.7.9 1.4l-2 5.3"/>`,
  forget: `<path d="${FOLDER}"/><path d="M7.8 11h4.4"/>`,
  'file-new': '<path d="M11.4 3.2H6.4A2.4 2.4 0 0 0 4 5.6v8.8a2.4 2.4 0 0 0 2.4 2.4h7.2a2.4 2.4 0 0 0 2.4-2.4V7.8z"/><path d="M11.4 3.2v2.6a2 2 0 0 0 2 2H16"/><path d="M10 10.2v4M8 12.2h4"/>',
  note: '<path d="M5.2 3.6h9.6a2 2 0 0 1 2 2v6.4l-4.8 4.8H5.2a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2z"/><path d="M16.8 12h-3a1.8 1.8 0 0 0-1.8 1.8v3"/><path d="M6.6 7.4h6.8M6.6 10.2h4.2"/>',
  book: '<path d="M3.6 4.6h4.2A2.2 2.2 0 0 1 10 6.8v9a1.8 1.8 0 0 0-1.8-1.8H3.6z"/><path d="M16.4 4.6h-4.2A2.2 2.2 0 0 0 10 6.8v9a1.8 1.8 0 0 1 1.8-1.8h4.6z"/>',
  inbox: '<path d="M3.2 11.2 5.3 5a1.6 1.6 0 0 1 1.5-1.1h6.4A1.6 1.6 0 0 1 14.7 5l2.1 6.2v3.4a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z"/><path d="M3.4 11.2h3.6l1 2h4l1-2h3.6"/>',
  lock: `<path d="M6.8 8.6V6.8a3.2 3.2 0 0 1 6.4 0v1.8"/><rect x="4.2" y="8.6" width="11.6" height="8" rx="2.6"/>${filled(10, 12.6, 1)}`,
  'lock-open': `<path d="M13.2 8.6V6.6a3.2 3.2 0 0 0-6.1-1.3"/><rect x="4.2" y="8.6" width="11.6" height="8" rx="2.6"/>${filled(10, 12.6, 1)}`,
  shield: `<path d="${SHIELD}"/><circle cx="10" cy="8.8" r="1.7"/><path d="M10 10.5v2.6"/>`,
  'shield-check': `<path d="${SHIELD}"/><path d="M7.6 10.2l1.7 1.7 3.1-3.3"/>`,
  phone: '<rect class="ic-f" x="5.6" y="2.8" width="8.8" height="14.4" rx="2.6"/><path class="ic-k" d="M8.8 14.4h2.4"/>',
  code: '<path d="M6.6 6.2 2.8 10l3.8 3.8M13.4 6.2l3.8 3.8-3.8 3.8"/><path class="code-slash" pathLength="10" d="M11.2 4.8 8.8 15.2"/>',
  globe: '<circle class="ic-f" cx="10" cy="10" r="7"/><path class="ic-k" d="M3 10h14M10 3c-1.9 1.9-2.9 4.3-2.9 7s1 5.1 2.9 7c1.9-1.9 2.9-4.3 2.9-7s-1-5.1-2.9-7z"/><circle class="ic-ring" cx="10" cy="10" r="7"/>',
  broadcast: '<circle cx="10" cy="10" r="1.7"/><path d="M6.8 13.2a4.6 4.6 0 0 1 0-6.4M13.2 6.8a4.6 4.6 0 0 1 0 6.4M4.4 15.6a8 8 0 0 1 0-11.2M15.6 4.4a8 8 0 0 1 0 11.2"/>',
  agents: PEOPLE,
  robot: `<rect x="4" y="6.6" width="12" height="9.4" rx="3"/><path d="M10 6.6V4.6"/>${filled(10, 3.6, 1.1)}<path d="M2.4 10.4v2.2M17.6 10.4v2.2"/>${filled(7.6, 11, 1.2)}${filled(12.4, 11, 1.2)}`,
  puzzle: '<path class="ic-f" d="M3.6 7.6a2 2 0 0 1 2-2h1.8a1.9 1.9 0 1 1 3.2 0h1.8a2 2 0 0 1 2 2v1.8a1.9 1.9 0 1 1 0 3.2v1.8a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z"/>',
  settings: `<path class="ic-f" fill-rule="evenodd" d="${COG}${GEAR_HOLE}"/>`,
  mother: `<circle class="ic-disc" cx="10" cy="10" r="9"/><path class="ic-k" d="${PULSE}"/><path class="ic-beat" pathLength="1" d="${PULSE}"/>`,
  brain: `<path class="ic-f brain-l" d="${BRAIN_L}"/><path class="ic-f brain-r" d="${BRAIN_R}"/><path class="brain-folds" pathLength="1" d="${BRAIN_FOLDS}"/>`,
  neural: '<circle class="ic-f" cx="10" cy="10" r="2.6"/><path d="M10 7.4V4.8M12.15 11.47l2.56 1.75M7.85 11.47l-2.56 1.75M12.23 8.67l2.44-1.46"/><circle cx="10" cy="3.6" r="1.2"/><circle cx="15.7" cy="13.9" r="1.2"/><circle cx="4.3" cy="13.9" r="1.2"/><circle cx="15.7" cy="6.6" r="1.2"/>',
  map: `<circle cx="10" cy="10" r="${RING.planet}"/><path d="${ring()}"/>`,
  'map-key': `<circle cx="10" cy="10" r="${RING.planet}"/><path d="${ring()}"/>${moon(0, 1.2)}${moon(Math.PI, 0.9, ' opacity=".7"')}`,
  coordinator: HUB,
  salas: '<circle cx="5.6" cy="6.4" r="2.6"/><circle cx="14.4" cy="6.4" r="2.6"/><circle cx="10" cy="14.4" r="2.6"/><path d="M8.2 6.4h3.6M7 8.7l1.7 3.2M13 8.7l-1.7 3.2" opacity=".55"/>',
  market: `<path d="${BAG}"/><path d="${BAG_HANDLE}"/>`,
  'market-key': `<g class="ic-basket"><path d="${BAG}"/><path d="${BAG_HANDLE}"/><g class="ic-mods"><rect class="ic-m1" x="6.3" y="10.4" width="2.3" height="2.3" rx=".8"/><circle class="ic-m2" cx="10" cy="11.55" r="1.2"/><rect class="ic-m3" x="11.4" y="10.4" width="2.3" height="2.3" rx=".8"/></g></g>`,
  modules: '<rect class="ic-q1" x="3.4" y="3.4" width="5.6" height="5.6" rx="1.9"/><rect class="ic-q2" x="11" y="3.4" width="5.6" height="5.6" rx="1.9"/><rect class="ic-q3" x="3.4" y="11" width="5.6" height="5.6" rx="1.9"/><rect class="ic-q4" x="11" y="11" width="5.6" height="5.6" rx="1.9"/>',
  widgets: '<rect class="ic-w1" x="3" y="3" width="14" height="5.6" rx="2.2"/><rect class="ic-w2" x="3" y="11" width="5.8" height="5.8" rx="1.9"/><circle class="ic-w3" cx="14.1" cy="13.9" r="2.9"/>',
  links: `<path d="${CHAIN_BAR}"/><path d="${CHAIN_A}"/><path d="${CHAIN_B}"/>`,
  'links-key': `<g class="ic-male"><path d="${CHAIN_BAR}"/><path d="${CHAIN_B}"/></g><g class="ic-female"><path d="${CHAIN_A}"/></g>`,
  plug: PLUG,
  spark: `<path class="ic-spark-big" d="${SPARK_BIG}"/><path class="ic-spark-small" d="${SPARK_SMALL}"/>`,
  appearance: '<circle cx="10" cy="10" r="6.6"/><path d="M10 3.4a6.6 6.6 0 0 1 0 13.2z" fill="currentColor" stroke="none"/>',
  image: `${BOX}<circle cx="7.4" cy="8.2" r="1.4"/><path d="M3.4 14.2l3.8-3.8a1 1 0 0 1 1.4 0l2.4 2.4 1.4-1.4a1 1 0 0 1 1.4 0l2.8 2.8"/>`,
  git: '<circle cx="6.4" cy="5.4" r="1.8"/><circle cx="6.4" cy="14.6" r="1.8"/><circle cx="13.6" cy="7.8" r="1.8"/><path d="M6.4 7.2v5.6M13.6 9.6c0 2.6-2.4 3.2-5.2 3.8"/>',
  guard: `<path d="${SHIELD}"/>`,
  slash: '<path d="M12.6 3.6 7.4 16.4"/>',
  // ---- Home's tiles and widgets
  hourglass: '<path d="M6 3.4h8M6 16.6h8"/><path d="M6.8 3.4c0 3.2 3.2 4 3.2 6.6S6.8 13.4 6.8 16.6M13.2 3.4c0 3.2-3.2 4-3.2 6.6s3.2 3.4 3.2 6.6"/>',
  edge: '<circle cx="5.2" cy="13.6" r="2.2"/><circle cx="14.8" cy="6.4" r="2.2"/><path d="M6.96 12.28 13.04 7.72"/>',
  checkbox: '<rect x="3.4" y="3.4" width="13.2" height="13.2" rx="3.4"/><path d="M7 10.2l2.1 2.1L13.2 8"/>',
  database: '<ellipse cx="10" cy="5.6" rx="5.6" ry="2.2"/><path d="M4.4 5.6v8.8c0 1.2 2.5 2.2 5.6 2.2s5.6-1 5.6-2.2V5.6M4.4 10c0 1.2 2.5 2.2 5.6 2.2s5.6-1 5.6-2.2"/>',
  chip: '<rect x="5.4" y="5.4" width="9.2" height="9.2" rx="2.2"/><rect x="8.2" y="8.2" width="3.6" height="3.6" rx="1"/><path class="ic-pins" d="M8 2.8v2.6M12 2.8v2.6M8 14.6v2.6M12 14.6v2.6M2.8 8h2.6M2.8 12h2.6M14.6 8h2.6M14.6 12h2.6"/>',
  server: `<rect x="3.4" y="3.6" width="13.2" height="5.2" rx="2"/><rect x="3.4" y="11.2" width="13.2" height="5.2" rx="2"/>${dot(6.4, 6.2)}${dot(6.4, 13.8)}<path d="M10 6.2h3.6M10 13.8h3.6"/>`,
  gauge: `<path d="M3.6 13.6a6.4 6.4 0 1 1 12.8 0"/><path d="M10 13.6l3-4"/>${dot(10, 13.6)}`,
  trending: '<path d="M3.4 16.6h13.2"/><path d="M5 13.4l3.2-3.2 2.6 2.4 4.2-5.2"/><path d="M12.4 7.4H15V10"/>',
  cube: `<path d="${hexCube}"/><path d="M4.2 6.8 10 10l5.8-3.2M10 10v6.6"/>`,
  calendar: `<rect x="3.4" y="4.4" width="13.2" height="12.2" rx="2.8"/><path d="M3.4 8.4h13.2M7 2.8v3M13 2.8v3"/>${dot(7.2, 12)}${dot(10, 12)}${dot(12.8, 12)}`,
  bars: '<path d="M3.4 16.6h13.2"/><path d="M5.6 13.4v-3M9 13.4V7M12.4 13.4V8.8M15.8 13.4V4.6"/>',
  // ---- MADRE's own modules (public/market.js, MODULE_FACES): ic-f is the part tinted in the accent.
  'mod-ash': '<path d="M4 5.2h12M4 9.4h8.4M4 13.6h4.6"/><g class="ic-arrow"><path d="M15.2 8v7"/><path class="ic-f" d="M12.6 12.4l2.6 2.8 2.6-2.8"/></g>',
  'mod-intents': `<path d="${GAUGE}"/><path class="ic-f" d="M3.2 14.2a6.8 6.8 0 0 1 4.4-6.4L10 14.2z" fill="currentColor" fill-opacity=".28" stroke="none"/><path class="ic-needle" d="M10 14.2l3.4-4.8"/><circle cx="10" cy="14.2" r="1.5" fill="currentColor" stroke="none"/>`,
  'mod-image': `${BOX}<path class="ic-f" d="M3.4 14.6l4-4 2.8 2.6 2.1-1.8 4.3 3.4z" fill="currentColor" fill-opacity=".28" stroke="none"/><path d="M3.4 14.6l4-4 2.8 2.6 2.1-1.8 4.3 3.4"/><path d="M13.4 5.6l.55 1.25 1.25.55-1.25.55-.55 1.25-.55-1.25-1.25-.55 1.25-.55z" fill="currentColor" stroke="none"/>`,
  'mod-browser': `${BOX}<path d="M2.8 7.6h14.4"/>${filled(5.2, 5.7, 0.8)}${filled(7.5, 5.7, 0.8)}<path class="ic-f" d="M9.2 9.6l5.4 2-2.3.9-.9 2.3z" fill="currentColor" fill-opacity=".28"/>`,
  'mod-viewer': `${BOX}<path class="ic-f" d="M5.4 10s1.8-3 4.6-3 4.6 3 4.6 3-1.8 3-4.6 3-4.6-3-4.6-3z" fill="currentColor" fill-opacity=".28"/>${filled(10, 10, 1.3)}`,
  'mod-git': '<circle cx="5.6" cy="5" r="1.8"/><circle cx="5.6" cy="15" r="1.8"/><path d="M5.6 6.8v6.4"/><path class="ic-f" d="M8.8 11h2l1.2-3.4 1.6 6 1.2-2.6h1.6"/>',
  'mod-runs': `${BOX}<path class="ic-f" d="M6.2 7.8l2.6 2.2-2.6 2.2"/><path d="M10.6 12.4h3.4"/>`,
  'mod-choices': '<rect x="3.2" y="3.4" width="13.6" height="3.6" rx="1.8"/><rect class="ic-f" x="3.2" y="8.2" width="13.6" height="3.6" rx="1.8" fill="currentColor" fill-opacity=".28"/><path d="M12.2 10l1 1 1.9-1.9"/><rect x="3.2" y="13" width="13.6" height="3.6" rx="1.8"/>',
  'mod-ahp': '<path d="M4.4 8.4a5.9 5.9 0 0 1 10.4-2.7"/><path d="M15.3 2.9v3.2h-3.2"/><path d="M15.6 11.6a5.9 5.9 0 0 1-10.4 2.7"/><path d="M4.7 17.1v-3.2h3.2"/><circle class="ic-f" cx="10" cy="10" r="1.9" fill="currentColor" fill-opacity=".28"/>',
  'mod-mail': '<rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2.8"/><path class="ic-f" d="M3.4 6.2l6.6 4.6 6.6-4.6"/>',
  'mod-github': '<circle cx="5.6" cy="4.8" r="1.8"/><circle cx="5.6" cy="15.2" r="1.8"/><path d="M5.6 6.6v6.8"/><path d="M14.4 13.4V8.2a2.6 2.6 0 0 0-2.6-2.6H9.2"/><path d="M11 3.6l-2 2 2 2"/><circle class="ic-f" cx="14.4" cy="15.2" r="1.8" fill="currentColor" fill-opacity=".28"/>',
  'mod-notes': '<path d="M5.2 3.6h9.6a2 2 0 0 1 2 2v6.4l-4.8 4.8H5.2a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2z"/><path class="ic-f" d="M16.8 12h-3a1.8 1.8 0 0 0-1.8 1.8v3" fill="currentColor" fill-opacity=".28"/><path d="M6.6 7.4h6.8M6.6 10.2h4.2"/>',
  'mod-reminders': '<path d="M10 3.2a4.6 4.6 0 0 0-4.6 4.6v2.6c0 .9-.4 1.8-1 2.5l-.8.9h12.8l-.8-.9a3.7 3.7 0 0 1-1-2.5V7.8A4.6 4.6 0 0 0 10 3.2z"/><path class="ic-f" d="M8.1 15.6a2 2 0 0 0 3.8 0"/><path class="ic-ring" d="M2.8 6.4a6.6 6.6 0 0 1 1.8-3M17.2 6.4a6.6 6.6 0 0 0-1.8-3"/>',
  'mod-links': `<path d="${CHAIN_BAR}"/><path class="ic-f" d="${CHAIN_A}"/><path d="${CHAIN_B}"/>`,
  'mod-mcp': '<path d="M7.4 3v3.4M12.6 3v3.4"/><path class="ic-f" d="M5.2 6.4h9.6v2.8a4.8 4.8 0 0 1-9.6 0z" fill="currentColor" fill-opacity=".28"/><path d="M10 14v3"/>',
};

const head = `// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// TRAZO MADRE (2026-10-28): every icon of MADRE, drawn once. A 20 grid with its drawing inside
// 2..18, one stroke (1.6, the --icon-stroke the CSS thickens on hover), round ends and joins, no
// sharp corner and no line crossing another. The classes inside a drawing are the parts the CSS
// moves or fills (ic-f fills when on, ic-k is cut out of it, ic-male and ic-female slide…), so a
// drawing keeps them when it is redrawn. Built by scripts/icons-build.mjs; the copies written
// into the HTML pages are kept equal to these by scripts/icons.mjs.

// The stroke every drawing is made with, for a <svg> that holds one of these.
export const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

// What is inside each <svg>, by name.
export const ICONS = {
${Object.entries(ICONS).map(([key, value]) => `  ${/^[a-z][a-z0-9]*$/.test(key) ? key : `'${key}'`}: '${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`).join('\n')}
};

// Only the drawing, wearing its stroke, for a place that puts it in an <svg> of its own (a module's
// face, a category of Settings): the <svg> there carries no stroke, a module's own drawings their own.
export const trazoDrawing = (name) => \`<g \${STROKE}>\${ICONS[name]}</g>\`;

// The whole <svg>: \`cls\` for the classes its place gives it, \`attrs\` for anything else it
// needs. Called trazo, not icon: many places here already call a node of their own icon.
export function trazo(name, cls = '', attrs = '') {
  const inner = ICONS[name];
  if (inner === undefined) throw new Error(\`No icon called \${name}\`);
  return \`<svg\${cls ? \` class="\${cls}"\` : ''} viewBox="0 0 20 20" \${STROKE}\${attrs ? \` \${attrs}\` : ''} aria-hidden="true" data-icon="\${name}">\${inner}</svg>\`;
}
`;
writeFileSync(process.argv[2] ?? new URL('../public/icons.js', import.meta.url), head);
console.log(`${Object.keys(ICONS).length} drawings`);
