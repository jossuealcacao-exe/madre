// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE WELCOME'S STAGE (1.1, 2026-11-08, docs/private/BIENVENIDA-1.1.md): one abstract picture above
// every step, so the welcome reads as one story and not as six forms. No words, no logos, no
// drawings of things: a field of points of light that takes a new shape at each step, and MADRE's
// DOT (the logo's, «MADRE is ready») at the centre of it all.
//
// The same points travel from one step to the next — they are never thrown away and made again —
// so every change of step is the field rearranging itself, not a cut:
//
//   hello     a cloud the computer is read through: a soft wave crosses it; once read, it settles
//             into a calm halo round the dot
//   use       five nebulae round the dot; the ones the person marks grow, brighten and come closer
//   agents    one small constellation per AI, round the dot; a connected one sends light to it
//   project   threads from the edge, one per folder chosen, gathering into a ring round the dot
//   ai        the points fall in a slow spiral into a core while it downloads, a fine arc saying how
//             much; once there, they settle in three quiet orbits
//   ready     the points draw the logo's pulse, whole, into the dot, fed from the edge; then a
//             message bubble opens beside the dot and its words are written in, the caret waiting
//
// MADRE's own style, from its brand book (madre-landing/brand-kit): the phosphor is the only colour
// and means something; nothing spins fast, bounces or glows like neon; changes take about 0.4 s and
// settle softly. It follows the look the person has on — light or dark, as their system or their
// Settings say (`data-scheme` on the page) — and changes with it. A person who asked for less
// motion gets each picture still, in its final shape.

const N = 220;
const RIPPLE = 2.6;          // s between two heartbeats of the dot

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const frac = (x) => x - Math.floor(x);
const easeInOut = (x) => { const v = clamp01(x); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

// The logo's beat (madre-mark: …H20 L23.5 2 L28 18 L32 10 L35 10 L37 6 L39 10…): along 0…1, the height
// in units of the beat (negative is up). The `ready` picture draws it with points.
const BEAT = [[0, 0], [3.5, -1], [8, 1], [12, 0], [15, 0], [17, -0.5], [19, 0]];
function beatAt(u) {
  if (u <= 0 || u >= 1) return 0;
  const x = u * 19;
  for (let i = 1; i < BEAT.length; i += 1) {
    const [x0, y0] = BEAT[i - 1];
    const [x1, y1] = BEAT[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}
const bezier = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;

// The two looks. In the dark the light adds up, as light does; in the light the points are ink.
const LOOKS = {
  dark: { ground: [5, 6, 5], ink: [155, 255, 102], soft: [238, 241, 234], glow: 0.075, scan: 0.03, blend: 'lighter', halo: 0.34 },
  light: { ground: [238, 240, 234], ink: [47, 138, 28], soft: [18, 21, 18], glow: 0.06, scan: 0, blend: 'source-over', halo: 0.18 },
};
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${clamp01(a)})`;

// One point of light, drawn once and stamped: a solid core and a short soft halo, never a blur.
function spriteOf(ink, halo) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(ink, 1));
  g.addColorStop(0.18, rgba(ink, 1));
  g.addColorStop(0.3, rgba(ink, halo));
  g.addColorStop(1, rgba(ink, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function createScene({ still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false } = {}) {
  const node = document.createElement('figure');
  node.className = 'wl-scene';
  node.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  const caption = document.createElement('figcaption');
  caption.className = 'wl-scene-cap';
  const words = document.createElement('span');
  caption.append(words);
  node.append(canvas, caption);
  const ctx = canvas.getContext?.('2d') ?? null;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let frame = 0;
  let scene = { id: 'hello', data: () => ({}), since: 0 };
  const dot = { a: 0, r: 4.5 };         // the dot, eased like the points
  let look = null;
  let ground = null;                    // the ground's colour now, eased between looks
  let sprite = null;
  const parts = Array.from({ length: N }, (_, i) => ({
    i, seed: hash(i + 1), seed2: hash(i + 1000), z: 0.35 + 0.65 * hash(i + 2000),
    x: 0, y: 0, vx: 0, vy: 0, a: 0, s: 1,
  }));
  let placed = false;

  const readLook = () => {
    const next = LOOKS[document.documentElement.dataset.scheme === 'light' ? 'light' : 'dark'];
    if (next === look) return;
    look = next;
    ground ??= [...look.ground];
    sprite = spriteOf(look.ink, look.halo);
  };
  readLook();
  // The look changes when the person or their system changes it: the picture goes with it.
  const watcher = typeof MutationObserver === 'function' ? new MutationObserver(() => { readLook(); redraw(); }) : null;
  watcher?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });

  function fit() {
    const box = node.getBoundingClientRect();
    if (!box.width) return;
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = box.width;
    h = box.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (!placed) {
      for (const p of parts) { p.x = w / 2 + (p.seed - 0.5) * w * 0.9; p.y = h / 2 + (p.seed2 - 0.5) * h * 0.8; }
      placed = true;
    }
    redraw();
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  observer?.observe(node);

  // ---- Where each point wants to be in each picture: [x, y, brightness, size]. Every picture keeps
  // the dot in the same place, a little above the middle, so the eye has one place to rest.
  const centre = () => ({ cx: w * 0.5, cy: h * 0.44, R: Math.min(h * 0.32, w * 0.16) });
  const drift = (p, t, k = 1) => [Math.sin(t * 0.5 + p.seed * 40) * 3 * k * p.z, Math.cos(t * 0.42 + p.seed2 * 40) * 2.4 * k * p.z];
  // The `ready` picture's line: flat, the beat, flat, into the dot. `at(u)` walks it by its length.
  const ON_LINE = 204;
  function pulseLine() {
    const { cx, cy } = centre();
    const x0 = Math.max(18, w * 0.07);
    const x1 = cx - 11;
    const bw = Math.min(150, (x1 - x0) * 0.46);
    const bx = x1 - bw - Math.min(40, (x1 - x0) * 0.12);
    const amp = Math.min(30, h * 0.19);
    const points = [[x0, cy], [bx, cy], ...BEAT.slice(1).map(([bx2, by]) => [bx + (bx2 / 19) * bw, cy + by * amp]), [x1, cy]];
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = lengths[lengths.length - 1] || 1;
    const at = (u) => {
      const d = clamp01(u) * total;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i += 1;
      const k = (d - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1);
      return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k];
    };
    return { x0, x1, bx, cy, at };
  }
  // The first message, after the line reaches the dot: a bubble opens to the right of it and its
  // words are written in, as the shape of text (never letters), with a caret that waits at the end.
  // Its words' widths are fixed once, so the message is always the same shape.
  const NOTE_WORDS = [0, 1, 2].map((row) => Array.from({ length: 9 }, (_, k) => 16 + Math.round(hash(row * 31 + k + 7) * 38)));
  function paintNote(data, age) {
    if (scene.id !== 'ready' || !data.note) return;
    const { cx, cy } = centre();
    const open = still ? 1 : easeInOut((age - 1.35) / 0.55);
    if (open <= 0) return;
    const left = cx + 22;
    const right = Math.min(w - 18, left + Math.max(140, w * 0.38));
    const rows = [0.92, 0.74, 0.46];
    const lineH = Math.min(15, h * 0.1);
    const top = cy - lineH * 1.5 - 9;
    const height = lineH * 3 + 18;
    const width = (right - left) * (0.35 + 0.65 * open);
    // The bubble: a fine edge and the faintest fill, its corner nearest the dot pointing at it.
    ctx.globalAlpha = open;
    ctx.fillStyle = rgba(look.ink, look === LOOKS.light ? 0.05 : 0.06);
    ctx.strokeStyle = rgba(look.ink, 0.32);
    ctx.lineWidth = 1;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(left + 4, cy);
    ctx.lineTo(left + 4, top + r);
    ctx.quadraticCurveTo(left + 4, top, left + 4 + r, top);
    ctx.lineTo(left + width - r, top);
    ctx.quadraticCurveTo(left + width, top, left + width, top + r);
    ctx.lineTo(left + width, top + height - r);
    ctx.quadraticCurveTo(left + width, top + height, left + width - r, top + height);
    ctx.lineTo(left + 4 + r, top + height);
    ctx.quadraticCurveTo(left + 4, top + height, left + 4, top + height - r);
    ctx.lineTo(left + 4, cy + 5);
    ctx.lineTo(left - 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The words, written in one after another.
    const room = width - 28;
    const total = rows.reduce((sum, share) => sum + share * room, 0);
    let written = (still ? 1 : easeInOut((age - 1.75) / 1.9)) * total;
    let caret = null;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, lineH * 0.34);
    rows.forEach((share, row) => {
      const y = top + 9 + lineH * (row + 0.5);
      let x = left + 18;
      const end = left + 18 + share * room;
      for (const word of NOTE_WORDS[row]) {
        if (x >= end || written <= 0) break;
        const full = Math.min(word, end - x);
        const len = Math.min(full, written);
        ctx.strokeStyle = rgba(look.soft, 0.22);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.max(0.1, len), y); ctx.stroke();
        written -= full + 7;
        caret = [x + len + 5, y];
        x += full + 7;
      }
    });
    // The caret waits where the writing stopped: the person only has to send it.
    if (caret && (still || frac(age * 0.9) < 0.6)) {
      ctx.strokeStyle = rgba(look.ink, 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(caret[0], caret[1] - lineH * 0.45); ctx.lineTo(caret[0], caret[1] + lineH * 0.45); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }
  const PICTURES = {
    hello(p, t, data) {
      const { cx, cy, R } = centre();
      const [dx, dy] = drift(p, t);
      if (!data.scanned) {
        // A wide soft cloud, and a wave that crosses it, as if the computer were read line by line.
        const ang = p.seed * Math.PI * 2;
        const rad = Math.sqrt(p.seed2);
        const x = cx + Math.cos(ang) * rad * w * 0.36;
        const y = cy + Math.sin(ang) * rad * R * 1.25;
        const sweep = w * (0.08 + 0.84 * frac(t * 0.24));
        const near = Math.exp(-(((x - sweep) / 46) ** 2));
        return [x + dx, y + dy - near * 7, 0.14 + 0.7 * near, 1 + near * 0.9];
      }
      // Read: the cloud gathers into a calm halo round the dot.
      const ang = p.seed * Math.PI * 2 + t * 0.04;
      const ring = R * (1.05 + (p.seed2 - 0.5) ** 2 * 2);
      return [cx + Math.cos(ang) * ring * 1.9 + dx, cy + Math.sin(ang) * ring * 0.62 + dy, 0.22 + 0.45 * (1 - p.seed2), 1];
    },
    use(p, t, data) {
      const { cx, cy, R } = centre();
      const items = data.items ?? [];
      const k = items.length ? p.i % items.length : 0;
      const on = Boolean(items[k]?.on);
      // Five nebulae on an ellipse round the dot; a marked one comes a third of the way in.
      const ang = -Math.PI / 2 + ((k + 0.5) / Math.max(1, items.length)) * Math.PI * 2;
      const pull = on ? 0.66 : 1;
      const nx = cx + Math.cos(ang) * w * 0.34 * pull;
      const ny = cy + Math.sin(ang) * R * 1.05 * pull;
      // A few points of a marked nebula carry light to the dot.
      if (on && p.seed < 0.16) {
        const q = frac(t * 0.3 + p.seed2 * 3);
        const bend = (p.seed2 - 0.5) * 40;
        return [bezier(nx, (nx + cx) / 2 + bend, cx, easeInOut(q)), bezier(ny, (ny + cy) / 2 - bend, cy, easeInOut(q)), 0.9 * Math.sin(q * Math.PI), 1.1];
      }
      const [dx, dy] = drift(p, t, on ? 1.4 : 0.8);
      const spread = (on ? 26 : 14) * Math.sqrt(p.seed2);
      const a2 = p.seed2 * 40 + t * (on ? 0.12 : 0.05);
      return [nx + Math.cos(a2) * spread * 1.3 + dx, ny + Math.sin(a2) * spread + dy, on ? 0.45 + 0.45 * (1 - p.seed2) : 0.13, on ? 1.15 : 0.85];
    },
    agents(p, t, data) {
      const { cx, cy, R } = centre();
      const items = data.items ?? [];
      const n = Math.max(1, items.length);
      const k = p.i % n;
      const on = Boolean(items[k]?.on);
      const ang = -Math.PI / 2 + ((k + 0.25) / n) * Math.PI * 2;
      const nx = cx + Math.cos(ang) * w * 0.38;
      const ny = cy + Math.sin(ang) * R * 1.1;
      // A connected AI sends a stream of light along a gentle curve into the dot.
      if (on && p.seed < 0.42) {
        const q = frac(t * 0.26 + p.seed2 * 2);
        const bend = Math.cos(ang) * 26;
        return [bezier(nx, (nx + cx) / 2, cx, easeInOut(q)), bezier(ny, (ny + cy) / 2 + bend, cy, easeInOut(q)), 0.75 * Math.sin(q * Math.PI) ** 0.7, 0.95];
      }
      const [dx, dy] = drift(p, t, 0.7);
      const spread = (on ? 13 : 8) * Math.sqrt(p.seed2);
      const a2 = p.seed2 * 40 + t * 0.1;
      return [nx + Math.cos(a2) * spread + dx, ny + Math.sin(a2) * spread * 0.8 + dy, on ? 0.6 + 0.3 * (1 - p.seed2) : 0.14, on ? 1.1 : 0.8];
    },
    project(p, t, data) {
      const { cx, cy, R } = centre();
      const n = Math.min(8, data.count ?? 0);
      // The ring round the dot: fuller with every folder that comes.
      const ringShare = 0.12 + 0.07 * n;
      const ringAng = p.seed * Math.PI * 2 + t * 0.06;
      const ringR = R * (0.9 + 0.22 * (p.seed2 - 0.5));
      const ring = [cx + Math.cos(ringAng) * ringR * 1.75, cy + Math.sin(ringAng) * ringR * 0.55];
      if (!n) { const [dx, dy] = drift(p, t); return [ring[0] + dx * 3, ring[1] + dy * 3, p.seed2 < 0.4 ? 0.14 : 0, 0.8]; }
      if (p.seed2 < ringShare) return [ring[0], ring[1], 0.28 + 0.4 * p.z, 0.95];
      // Threads: one from each folder chosen, coming in from the left edge, joining the ring.
      const k = p.i % n;
      const sy = h * (0.14 + (n === 1 ? 0.3 : (k / (n - 1)) * 0.6));
      const q = frac(t * 0.17 + p.seed * 1.7);
      const ex = cx - ringR * 1.75 * 0.98;
      return [bezier(-10, w * 0.22, ex, easeInOut(q)), bezier(sy, sy, cy, easeInOut(q)), 0.62 * Math.sin(q * Math.PI) ** 0.6, 0.9];
    },
    ai(p, t, data) {
      const { cx, cy, R } = centre();
      const pct = clamp01((data.pct ?? 0) / 100);
      if (data.state === 'ready') {
        // Three quiet orbits, each a little more tilted, slower further out.
        const shell = p.i % 3;
        const r = R * (0.5 + shell * 0.26);
        const ang = p.seed * Math.PI * 2 + t * (0.11 - shell * 0.025) * (shell === 1 ? -1 : 1);
        const tilt = [0.32, 0.48, 0.62][shell];
        return [cx + Math.cos(ang) * r * 1.6, cy + Math.sin(ang) * r * tilt, 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(ang * 2 + t * 0.6)) * p.z, 0.95];
      }
      if (data.state === 'downloading') {
        // Falling in, slowly, along a spiral: faster as more has arrived.
        const q = frac(t * (0.12 + 0.18 * pct) + p.seed);
        const r = R * (2.1 * (1 - q) + 0.28);
        const ang = p.seed2 * Math.PI * 2 + q * 3.2;
        return [cx + Math.cos(ang) * r * 1.5, cy + Math.sin(ang) * r * 0.6, 0.1 + 0.7 * q ** 1.4, 0.7 + 0.5 * q];
      }
      // Waiting, or left for later: a loose quiet disc.
      const [dx, dy] = drift(p, t);
      const ang = p.seed * Math.PI * 2;
      const r = R * (0.6 + 1.3 * Math.sqrt(p.seed2));
      return [cx + Math.cos(ang) * r * 1.6 + dx, cy + Math.sin(ang) * r * 0.55 + dy, data.state === 'skip' ? 0.07 : 0.15, 0.8];
    },
    ready(p, t, data, age) {
      // The logo's pulse, whole and continuous: almost every point is on it, laid by its length so the
      // steep strokes of the beat are as full as the flat ones. It draws itself from the left into the
      // dot; a few points keep arriving along it from the edge — the AIs feeding the project — and a
      // soft brightness runs along it the way a heartbeat travels. Then the first message (paintNote).
      const line = pulseLine();
      const drawn = still ? 1 : easeInOut(age / 1.5);
      if (p.i >= ON_LINE) {
        // The stream: from beyond the left edge, along the flat, into the start of the line.
        const q = frac(t * 0.21 + p.seed * 1.9);
        const x = line.x0 - w * 0.08 + (w * 0.08 + (line.bx - line.x0) * 0.9) * easeInOut(q);
        return [x, line.cy + (p.seed2 - 0.5) * 6 * (1 - q), drawn * 0.7 * Math.sin(q * Math.PI) ** 0.8, 0.8];
      }
      const u = p.i / (ON_LINE - 1);
      if (u > drawn) { const [x, y] = line.at(0); return [x, y, 0, 0.6]; }
      const [x, y] = line.at(u);
      const runner = Math.exp(-(((u - frac(t * 0.24)) / 0.05) ** 2));
      return [x, y, 0.42 + 0.55 * runner, 0.62 + 0.38 * runner];
    },
  };
  const dotOf = (id, data) => {
    if (id === 'hello') return data.scanned ? 1 : 0;
    if (id === 'use' || id === 'agents') return (data.items ?? []).some((one) => one.on) ? 1 : 0.45;
    if (id === 'project') return data.count ? 1 : 0.45;
    if (id === 'ai') return data.state === 'ready' ? 1 : data.state === 'downloading' ? 0.7 : data.state === 'skip' ? 0.3 : 0.5;
    return 1;
  };

  // ---- Drawing.
  function paintGround() {
    ground = ground.map((v, i) => v + (look.ground[i] - v) * (still ? 1 : 0.12));
    ctx.fillStyle = `rgb(${ground.map(Math.round).join(',')})`;
    ctx.fillRect(0, 0, w, h);
    const { cx, cy } = centre();
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
    glow.addColorStop(0, rgba(look.ink, look.glow));
    glow.addColorStop(1, rgba(look.ink, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    if (look.scan) { ctx.fillStyle = rgba(look.ink, look.scan); for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1); }
  }
  function paintDot(t) {
    if (dot.a < 0.01) return;
    const { cx, cy } = centre();
    // Its heartbeat: a fine ring that leaves it and fades, every few seconds.
    if (!still) {
      const beat = frac(t / RIPPLE);
      ctx.strokeStyle = rgba(look.ink, dot.a * 0.45 * (1 - beat));
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, dot.r + 4 + easeInOut(beat) * 26, 0, Math.PI * 2); ctx.stroke();
    }
    const r = dot.r * (1 + (still ? 0 : 0.16 * Math.exp(-(((frac(t / RIPPLE) * RIPPLE) / 0.25) ** 2))));
    ctx.globalAlpha = dot.a;
    ctx.drawImage(sprite, cx - r * 3.6, cy - r * 3.6, r * 7.2, r * 7.2);
    ctx.globalAlpha = 1;
  }
  // The download's arc: a fine track round the core and how much of it is done.
  function paintArc(data) {
    if (scene.id !== 'ai' || data.state !== 'downloading') return;
    const { cx, cy, R } = centre();
    const r = R * 0.62;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(look.soft, 0.1);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(look.ink, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01((data.pct ?? 0) / 100)); ctx.stroke();
  }

  function draw(nowMs) {
    frame = 0;
    if (!node.isConnected || !ctx) return;
    if (!w) { fit(); if (!w) return; }
    const now = nowMs / 1000;
    const t = still ? 2 : now;
    const age = still ? 99 : now - scene.since;
    const data = scene.data() ?? {};
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintGround();
    const want = PICTURES[scene.id] ?? PICTURES.hello;
    ctx.globalCompositeOperation = look.blend;
    for (const p of parts) {
      const [tx, ty, ta, ts] = want(p, t, data, age);
      if (still) { p.x = tx; p.y = ty; p.a = ta; p.s = ts; } else {
        // A soft spring: the points arrive and settle, never snap or bounce.
        p.vx = (p.vx + (tx - p.x) * 0.032) * 0.84;
        p.vy = (p.vy + (ty - p.y) * 0.032) * 0.84;
        p.x += p.vx;
        p.y += p.vy;
        p.a += (ta - p.a) * 0.07;
        p.s += (ts - p.s) * 0.07;
      }
      const alpha = p.a * (0.45 + 0.55 * p.z);
      if (alpha < 0.01) continue;
      const r = (0.75 + 1.05 * p.z) * p.s;
      ctx.globalAlpha = clamp01(alpha);
      ctx.drawImage(sprite, p.x - r * 3.2, p.y - r * 3.2, r * 6.4, r * 6.4);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    paintArc(data);
    paintNote(data, age);
    const target = dotOf(scene.id, data);
    dot.a = still ? target : dot.a + (target - dot.a) * 0.06;
    paintDot(t);
    if (!still) frame = requestAnimationFrame(draw);
  }
  function redraw() { if (!frame) frame = requestAnimationFrame(draw); }

  return {
    node,
    // A step's picture: its id and a function that says, each time it is drawn, what it shows now.
    show(id, data = () => ({})) {
      if (scene.id !== id) scene = { id, data, since: (globalThis.performance?.now() ?? Date.now()) / 1000 };
      else scene.data = data;
      redraw();
    },
    // The line under the picture: what is happening now, in a few words.
    say(text) {
      if (words.textContent === text) return;
      words.textContent = text;
      if (!still) { caption.classList.remove('new'); void caption.offsetWidth; caption.classList.add('new'); }
      redraw();
    },
    // What it shows changed (a still picture is drawn again; a moving one already is).
    redraw,
    stop() { if (frame) cancelAnimationFrame(frame); frame = 0; observer?.disconnect(); watcher?.disconnect(); },
  };
}
