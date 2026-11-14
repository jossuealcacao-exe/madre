// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE FIELD BEHIND «BEFORE YOU START» — THE ANTEROOM (2026-11-13, the author: «only the spheres of smoke
// in the colours, very subtle, floating over the whole screen, beautiful, never taking the person's
// attention; when they accept, the opening condenses them and begins»). The same six colours the opening
// blends (loader.js, playOpening), each a soft sphere drifting slowly across the whole window; nothing
// else. `smoke()` says where each one is at that moment, so the opening starts from exactly there. It
// follows the look on (light or dark), stops when the gate goes, and a person who asked for less motion
// gets one still frame.
//
// THE PRELUDE (2026-11-13, the author: «a micro animation before "Before you start" that begins to tell
// the story»): `start({ prelude: true })` lets the smoke be born. Six points of light, one per AI, each
// in its colour and each on its own, come one after another, beat once, and open into the spheres the
// anteroom keeps — the smoke is the AIs; the opening later condenses it into MADRE.

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
// The prelude, in seconds: when each point comes, when they open into smoke, and when it is over.
export const PRELUDE = { first: 0.25, step: 0.14, open: 1.35, done: 2.8 };
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;
const easeInOut = (x) => { const v = clamp01(x); return v < 0.5 ? 4 * v * v * v : 1 - ((-2 * v + 2) ** 3) / 2; };

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
  let prelude = false;
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
    const since = t - 8;
    if (prelude && since < PRELUDE.done) drawBirth(since, spheres(t));
    else for (const one of spheres(t)) glow(one.x, one.y, one.r, one.hex, one.alpha);
    ctx.globalCompositeOperation = 'source-over';
  }

  // The smoke being born: each AI a point of its own round the middle, apart from the others, which
  // beats once as it comes; then each opens into its sphere, travelling to where the sphere floats now.
  function drawBirth(since, smoke) {
    const reach = Math.min(w, h);
    const open = easeInOut((since - PRELUDE.open) / (PRELUDE.done - PRELUDE.open));
    smoke.forEach((one, i) => {
      const at = PRELUDE.first + i * PRELUDE.step;
      const come = easeOut((since - at) / 0.35);
      if (come <= 0) return;
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / smoke.length;
      const px = w / 2 + Math.cos(angle) * reach * 0.26;
      const py = h / 2 + Math.sin(angle) * reach * 0.17;
      const beat = 1 + 0.55 * Math.exp(-(((since - at - 0.2) / 0.11) ** 2));
      const x = px + (one.x - px) * open;
      const y = py + (one.y - py) * open;
      // The halo grows into the sphere; the bright core goes as it opens.
      glow(x, y, (22 * beat) + (one.r - 22 * beat) * open, one.hex, (0.38 + (one.alpha - 0.38) * open) * come);
      glow(x, y, 5.5 * beat * (1 - open * 0.6), one.hex, 0.95 * come * (1 - open));
    });
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
    start({ prelude: born = false } = {}) {
      fit();
      if (still || !ctx) { draw(8); canvas.classList.add('on'); return false; }
      prelude = born;
      if (prelude) canvas.classList.add('on', 'born');
      frame = requestAnimationFrame(loop);
      requestAnimationFrame(() => canvas.classList.add('on'));
      // Whether the prelude plays (the gate waits for it before showing its card).
      return prelude;
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      resizer?.disconnect();
      watcher?.disconnect();
    },
  };
}
