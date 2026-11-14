// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE FIELD BEHIND «BEFORE YOU START» — THE ANTEROOM (2026-11-13, the author: «only the spheres of smoke
// in the colours, very subtle, floating over the whole screen, beautiful, never taking the person's
// attention; when they accept, the opening condenses them and begins»). The same six colours the opening
// blends (loader.js, playOpening), each a soft sphere drifting slowly across the whole window; nothing
// else. `smoke()` says where each one is at that moment, so the opening starts from exactly there. It
// follows the look on (light or dark), stops when the gate goes, and a person who asked for less motion
// gets one still frame.

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (hex, a) => { const v = Number.parseInt(hex.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${clamp01(a)})`; };
// The AIs' own colours, as brands.js has them (ChatGPT's Codex, Claude, Gemini, Grok, OpenCode, Cursor),
// the same the opening blends; the grey ones (Grok, Cursor) quieter, so the room stays colour and not grey.
const COLOURS = {
  dark: ['#10A37F', '#D97757', '#8E75E8', '#E6E6E6', '#F2C94C', '#D9DEE5'],
  light: ['#0B7A5F', '#B85C3C', '#5B45B8', '#262626', '#9A7A12', '#3A3F47'],
};
const GREY = [false, false, false, true, false, true];
// Faint: the card is what is read; the smoke is only there.
const LOOKS = {
  dark: { alpha: 0.15, blend: 'screen' },
  light: { alpha: 0.135, blend: 'source-over' },
};
// Where each sphere floats, as a share of the window: spread round the card, never all on one side.
const HOMES = [[0.16, 0.22], [0.84, 0.2], [0.1, 0.7], [0.9, 0.74], [0.52, 0.08], [0.5, 0.94]];

export function createTermsField({ still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'terms-field';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext?.('2d') ?? null;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let frame = 0;
  let last = 0;
  let begun = 0;
  let stopped = false;
  let scheme = 'dark';
  // Each colour on its own slow orbit round the dot, at its own distance, breathing at its own pace.
  const fields = COLOURS.dark.map((_, i) => ({
    home: HOMES[i],
    drift: 0.05 + hash(i + 7) * 0.04,
    speed: 0.05 + hash(i + 13) * 0.04,
    phase: hash(i + 3) * 6.28,
    breath: 6 + hash(i + 19) * 5,
    size: 0.85 + hash(i + 29) * 0.35,
  }));
  let now = 8;

  const readLook = () => { scheme = document.documentElement.dataset.scheme === 'light' ? 'light' : 'dark'; };
  readLook();
  const watcher = typeof MutationObserver === 'function' ? new MutationObserver(() => { readLook(); if (still) draw(8); }) : null;
  watcher?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });

  function fit() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !ctx) return;
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = box.width;
    h = box.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (still) draw(8);
  }
  const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  resizer?.observe(canvas);

  const glow = (x, y, radius, hex, alpha) => {
    if (alpha <= 0.002 || radius <= 0) return;
    const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
    fill.addColorStop(0, rgba(hex, alpha));
    fill.addColorStop(0.55, rgba(hex, alpha * 0.45));
    fill.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  // Each sphere at a moment: where it is, how large, its colour and how strong (window pixels).
  const spheres = (t) => {
    const look = LOOKS[scheme];
    const colours = COLOURS[scheme];
    const reach = Math.min(w, h);
    return fields.map((one, i) => {
      const x = (one.home[0] + Math.sin(t * one.speed + one.phase) * one.drift) * w;
      const y = (one.home[1] + Math.cos(t * one.speed * 0.8 + one.phase) * one.drift) * h;
      const breathe = 0.85 + 0.15 * Math.sin((t / one.breath) * Math.PI * 2);
      return { x, y, r: reach * 0.42 * one.size, hex: colours[i], alpha: look.alpha * (GREY[i] ? 0.5 : 1) * breathe };
    });
  };

  function draw(t) {
    now = t;
    if (!ctx || !w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = LOOKS[scheme].blend;
    for (const one of spheres(t)) glow(one.x, one.y, one.r, one.hex, one.alpha);
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    if (stopped) return;
    frame = requestAnimationFrame(loop);
    // About thirty frames a second: it moves slowly, and the card over it stays the busy part.
    if (now - last < 32) return;
    last = now;
    if (!begun) begun = now;
    draw((now - begun) / 1000 + 8);
  }

  return {
    node: canvas,
    // Where the smoke is right now, for the opening to begin from it.
    smoke: () => (w ? spheres(now) : null),
    start() {
      fit();
      if (still || !ctx) { draw(8); canvas.classList.add('on'); return; }
      frame = requestAnimationFrame(loop);
      requestAnimationFrame(() => canvas.classList.add('on'));
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      resizer?.disconnect();
      watcher?.disconnect();
    },
  };
}
