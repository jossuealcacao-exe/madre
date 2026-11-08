// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE WELCOME'S STAGE (1.1, 2026-11-08, docs/private/BIENVENIDA-1.1.md): one picture above every step
// that shows what that step is doing, so the welcome reads as one story and not as six forms.
//
// It is drawn with the brand book's own pieces (madre-landing/brand-kit, §3–§6), nothing else: the
// near-black ground #050605 with its faint green glow and scan lines, the PULSE of the logo — a flat
// line that beats once (a high peak, a valley, a small peak) and goes on — and its DOT, «MADRE is
// ready». Phosphor #9bff66 is kept scarce and means something: what is connected, chosen or arriving.
// Labels are JetBrains Mono in capitals. Motion as the book says: fades of 0.4 s, entries that rise
// 24 px and settle, no spinning, no bouncing, no neon. Everything ends in the dot.
//
//   hello     the pulse sweeps like a monitor while MADRE reads the computer; then it settles into
//             the logo's own beat and its dot, and what was found rises in labels
//   use       one line per use; the ones chosen light up, beat, and bend into the dot
//   agents    each agent, with its owner's official mark, joined to the dot; a connected one sends
//             beats along its line
//   project   each folder found sends a thread to the dot; the folders stay where they are
//   ai        the pulse is the download: it grows from the left with the beat at its head, and when
//             it is complete it is the logo's beat, alive
//   ready     the pulse reaches a message that writes itself; the dot is its cursor
//
// A person who asked for less motion gets each picture still, in its final state.

const BG = '#050605';
const PHOSPHOR = [155, 255, 102];
const TEXT = [238, 241, 234];
const TEXT2 = [154, 161, 151];
const CARD = '#161a16';
const MONO = '600 10.5px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const READ = '450 13px Sora, Geist, ui-sans-serif, system-ui, sans-serif';
const FADE = 0.4;        // s, the book's fade
const RISE = 24;         // px an entry rises
// The logo's beat is about as tall as it is wide (40 high for 47.5 long): the same here, wherever it is.
const BEAT_PX = 64;
const BEAT_AMP = 22;

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { const v = clamp01(x); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const frac = (x) => x - Math.floor(x);

// The beat of the logo (madre-mark: M1 10H20 L23.5 2 L28 18 L32 10 L35 10 L37 6 L39 10H52, dot at
// 60): 19 units long, 8 up and 8 down around the line, then the small peak. `u` runs 0…1 along it;
// the answer is the height in units of 8 (negative is up).
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

// An official mark as a picture for the canvas: the same SVG the room uses, in one light ink.
const marks = new Map();
function markImage(svg, ink) {
  const key = `${ink}:${svg}`;
  if (marks.has(key)) return marks.get(key);
  const image = new Image();
  image.decoding = 'async';
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/currentColor/g, ink).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '))}`;
  marks.set(key, image);
  return image;
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
  let scene = null;            // { id, data(), since }
  let leaving = null;          // the scene that fades out under the new one
  const born = new Map();      // what has appeared, and when: each label rises once
  const fit = () => {
    const box = node.getBoundingClientRect();
    if (!box.width) return;
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = box.width;
    h = box.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  observer?.observe(node);

  // ---- The pieces every picture is drawn with.
  const at = (now, key) => { if (!born.has(key)) born.set(key, now); return now - born.get(key); };
  const entry = (now, key, delay = 0) => { const age = at(now, key) - delay; return still ? { a: 1, dy: 0 } : { a: easeOut(age / FADE), dy: RISE * (1 - easeOut(age / (FADE * 1.6))) }; };
  function label(text, x, y, { a = 1, ink = TEXT2, align = 'left', font = MONO } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (font === MONO && 'letterSpacing' in ctx) ctx.letterSpacing = '1.4px';
    ctx.fillStyle = rgba(ink, a);
    ctx.fillText(font === MONO ? String(text).toLocaleUpperCase() : text, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function dot(x, y, r, a = 1) {
    ctx.fillStyle = rgba(PHOSPHOR, a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // A beat that arrives at the dot makes it breathe once: no glow, only its size.
  function liveDot(x, y, r, a, pulse = 0) { dot(x, y, r * (1 + 0.28 * Math.sin(Math.PI * clamp01(pulse))), a); }
  // A line from a to b along which a beat travels: the beat's shape rides on the line itself.
  function beatingLine(ax, ay, bx, by, { t, a = 1, amp = 7, speed = 0.55, offset = 0, width = 1.6, ink = PHOSPHOR, bend = 0 } = {}) {
    const steps = 90;
    const head = frac(t * speed + offset);
    const span = Math.min(0.3, (BEAT_PX * 0.7) / Math.max(1, Math.hypot(bx - ax, by - ay)));
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(ink, a);
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      // A bent line is a gentle curve that leaves level and arrives level.
      const x = ax + (bx - ax) * u;
      const y = bend ? by + (ay - by) * (1 - easeInOut(u)) : ay + (by - ay) * u;
      const k = (u - (head - span)) / span;
      const yy = y + (still ? 0 : beatAt(k) * amp);
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    return head;
  }
  function plainLine(ax, ay, bx, by, { a = 1, ink = TEXT2, dash = null, width = 1, bend = false } = {}) {
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(ink, a);
    ctx.setLineDash(dash ?? []);
    ctx.beginPath();
    if (bend) {
      for (let i = 0; i <= 60; i += 1) { const u = i / 60; const x = ax + (bx - ax) * u; const y = by + (ay - by) * (1 - easeInOut(u)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    } else { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // The logo's pulse, whole, from x0 to x1 on the line y, with its dot: the shape MADRE signs with.
  function logoPulse(x0, x1, y, { a = 1, amp = 10, beatFrom = 0.38, beatSpan = 0.3, drawn = 1, width = 1.9 } = {}) {
    const end = x0 + (x1 - x0) * clamp01(drawn);
    ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(PHOSPHOR, a);
    ctx.beginPath();
    const steps = 160;
    for (let i = 0; i <= steps; i += 1) {
      const x = x0 + ((end - x0) * i) / steps;
      const u = (x - x0) / (x1 - x0);
      const yy = y + beatAt((u - beatFrom) / beatSpan) * amp;
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    return end;
  }
  function ground(t) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    // The brand's one allowed glow: radial, faint, behind everything.
    const glow = ctx.createRadialGradient(w * 0.62, h * 0.5, 0, w * 0.62, h * 0.5, Math.max(w, h) * 0.6);
    glow.addColorStop(0, rgba(PHOSPHOR, 0.075));
    glow.addColorStop(1, rgba(PHOSPHOR, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Scan lines: 1 px every 4, phosphor at 3.5 %.
    ctx.fillStyle = rgba(PHOSPHOR, 0.035);
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    void t;
  }
  const rows = (n, top, bottom) => Array.from({ length: n }, (_, i) => (n === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (n - 1)));

  // ---- The pictures.
  const PICTURES = {
    hello(t, now, data) {
      const y = h * 0.38;
      const x0 = w * 0.08;
      const x1 = w * 0.92;
      const dx = Math.min(w * 0.92 - 10, x1 + 18);
      if (!data.scanned) {
        // A monitor's sweep: the head runs left to right, the beat rides with it, the trail fades.
        const head = still ? 0.6 : frac(t * 0.32);
        const hx = x0 + (x1 - x0) * head;
        ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        const steps = 220;
        for (let i = 1; i <= steps; i += 1) {
          const ua = (i - 1) / steps;
          const ub = i / steps;
          const xa = x0 + (x1 - x0) * ua;
          const xb = x0 + (x1 - x0) * ub;
          const behind = (hx - xb) / (x1 - x0);
          if (behind < 0) continue;
          const alpha = Math.max(0, 1 - behind * 2.2);
          const span = BEAT_PX / (x1 - x0);
          const ya = y + beatAt((ua - (head - span)) / span) * BEAT_AMP;
          const yb = y + beatAt((ub - (head - span)) / span) * BEAT_AMP;
          ctx.strokeStyle = rgba(PHOSPHOR, alpha);
          ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
        }
        dot(hx, y, 3, 1);
        plainLine(x0, y, x1, y, { a: 0.08, ink: TEXT });
      } else {
        const age = at(now, 'hello:settled');
        const drawn = still ? 1 : easeInOut(age / 1.1);
        logoPulse(x0, x1, y, { drawn, amp: BEAT_AMP, beatFrom: 0.44, beatSpan: BEAT_PX / (x1 - x0) });
        // The dot falls in once the line has arrived, then breathes with every beat.
        const fall = still ? 1 : easeOut((age - 1.0) / 0.45);
        const beat = still ? 0 : frac((age - 1.4) / 2.6);
        if (drawn >= 1) liveDot(dx, y - 16 * (1 - fall), 4.6, fall, beat < 0.18 ? beat / 0.18 : 0);
      }
      // What MADRE found, rising one by one under the line.
      const facts = data.facts ?? [];
      facts.forEach((fact, i) => {
        const e = entry(now, `hello:fact:${fact}`, i * 0.18);
        const last = facts.length - 1;
        const x = last ? x0 + ((x1 - x0) * i) / last : x0;
        label(fact, x, h * 0.7 + e.dy, { a: e.a * 0.95, align: !last || i === 0 ? 'left' : i === last ? 'right' : 'center' });
      });
    },
    use(t, now, data) {
      const items = data.items ?? [];
      const ys = rows(items.length, h * 0.13, h * 0.66);
      const lx = w * 0.06;
      const sx = w * 0.3;
      const dx = w * 0.86;
      const dy = h * 0.4;
      let arriving = 0;
      items.forEach((item, i) => {
        const e = entry(now, `use:${item.id}`, i * 0.08);
        const y = ys[i] + e.dy * 0.5;
        label(item.label, lx, y, { a: e.a * (item.on ? 1 : 0.55), ink: item.on ? TEXT : TEXT2 });
        if (item.on) {
          const lit = still ? 1 : easeOut(at(now, `use:on:${item.id}`) / 0.5);
          plainLine(sx, y, dx - 8, dy, { a: 0.1 * e.a, ink: TEXT, bend: true });
          ctx.save();
          ctx.beginPath(); ctx.rect(sx - 2, 0, (dx - sx) * lit + 4, h); ctx.clip();
          const head = beatingLine(sx, y, dx - 8, dy, { t, a: e.a, amp: 9, speed: 0.42, offset: i * 0.23, bend: true });
          ctx.restore();
          if (head > 0.92) arriving = Math.max(arriving, (head - 0.92) / 0.08);
        } else {
          plainLine(sx, y, sx + (dx - sx) * 0.42, y, { a: 0.14 * e.a, ink: TEXT, dash: [2, 5] });
        }
      });
      const any = items.some((item) => item.on);
      liveDot(dx, dy, 5, any ? 1 : 0.35, arriving);
    },
    agents(t, now, data) {
      const items = data.items ?? [];
      const ys = rows(items.length, h * 0.12, h * 0.68);
      const lx = w * 0.07;
      const sx = lx + 120;
      const dx = w * 0.86;
      const dy = h * 0.4;
      let arriving = 0;
      items.forEach((item, i) => {
        const e = entry(now, `agents:${item.id}`, i * 0.07);
        const y = ys[i] + e.dy * 0.5;
        const image = item.mark ? markImage(item.mark, item.on ? '#eef1ea' : '#7c8479') : null;
        if (image?.complete && image.naturalWidth) { ctx.globalAlpha = e.a * (item.on ? 1 : 0.7); ctx.drawImage(image, lx, y - 9, 18, 18); ctx.globalAlpha = 1; }
        label(item.label, lx + 26, y, { a: e.a * (item.on ? 1 : 0.6), ink: item.on ? TEXT : TEXT2 });
        if (item.on) {
          const lit = still ? 1 : easeOut(at(now, `agents:on:${item.id}`) / 0.6);
          ctx.save(); ctx.beginPath(); ctx.rect(sx - 2, 0, (dx - sx) * lit + 4, h); ctx.clip();
          const head = beatingLine(sx, y, dx - 8, dy, { t, a: e.a, amp: 9, speed: 0.5, offset: i * 0.17, bend: true });
          ctx.restore();
          if (head > 0.92) arriving = Math.max(arriving, (head - 0.92) / 0.08);
        } else {
          plainLine(sx, y, dx - 8, dy, { a: 0.1 * e.a, ink: TEXT, dash: [2, 6], bend: true });
        }
      });
      liveDot(dx, dy, 5.2, items.some((item) => item.on) ? 1 : 0.35, arriving);
      if (data.count) label(data.count, dx, dy + 24, { a: 0.9, align: 'center' });
    },
    project(t, now, data) {
      const items = (data.items ?? []).slice(0, 6);
      const ys = rows(items.length || 1, h * 0.12, h * 0.68);
      const lx = w * 0.07;
      const sx = Math.min(w * 0.42, lx + 190);
      const dx = w * 0.86;
      const dy = h * 0.4;
      let arriving = 0;
      items.forEach((item, i) => {
        const e = entry(now, `project:${item.path}`, i * 0.07);
        const y = ys[i] + e.dy * 0.5;
        // A folder, drawn as a glyph of the book: one stroke, round ends.
        ctx.strokeStyle = rgba(item.on ? TEXT : TEXT2, e.a * (item.on ? 0.9 : 0.5));
        ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lx, y - 5); ctx.lineTo(lx + 5, y - 5); ctx.lineTo(lx + 7, y - 3); ctx.lineTo(lx + 15, y - 3); ctx.lineTo(lx + 15, y + 6); ctx.lineTo(lx, y + 6); ctx.closePath();
        ctx.stroke();
        const name = item.name.length > 22 ? `${item.name.slice(0, 21)}…` : item.name;
        label(name, lx + 24, y, { a: e.a * (item.on ? 1 : 0.55), ink: item.on ? TEXT : TEXT2 });
        if (item.on) {
          const lit = still ? 1 : easeOut(at(now, `project:on:${item.path}`) / 0.6);
          ctx.save(); ctx.beginPath(); ctx.rect(sx - 2, 0, (dx - sx) * lit + 4, h); ctx.clip();
          const head = beatingLine(sx, y, dx - 8, dy, { t, a: e.a * 0.95, amp: 8, speed: 0.38, offset: i * 0.19, bend: true, width: 1.4 });
          ctx.restore();
          if (head > 0.92) arriving = Math.max(arriving, (head - 0.92) / 0.08);
        }
      });
      if ((data.items ?? []).length > items.length) label(`+${data.items.length - items.length}`, lx + 24, h * 0.78, { a: 0.6 });
      liveDot(dx, dy, 5.2, items.some((item) => item.on) ? 1 : 0.35, arriving);
      if (data.count) label(data.count, dx, dy + 24, { a: 0.9, align: 'center' });
    },
    ai(t, now, data) {
      const y = h * 0.4;
      const x0 = w * 0.08;
      const x1 = w * 0.84;
      const dx = w * 0.9;
      if (data.state === 'downloading') plainLine(x0, y, x1, y, { a: 0.12, ink: TEXT });
      if (data.state === 'ready') {
        const age = at(now, 'ai:ready');
        const drawn = still ? 1 : easeInOut(age / 0.9);
        logoPulse(x0, x1, y, { drawn, amp: BEAT_AMP, beatFrom: 0.46, beatSpan: BEAT_PX / (x1 - x0) });
        const beat = still ? 0 : frac((age - 1) / 2.4);
        if (drawn >= 1) liveDot(dx, y, 5, 1, beat < 0.18 ? beat / 0.18 : 0);
      } else if (data.state === 'downloading') {
        const pct = clamp01((data.pct ?? 0) / 100);
        const end = x0 + (x1 - x0) * pct;
        // The pulse grows with the download; its head beats while it works.
        ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(PHOSPHOR, 1);
        ctx.beginPath();
        const steps = 140;
        const phase = still ? 0.6 : frac(t * 0.9);
        for (let i = 0; i <= steps; i += 1) {
          const x = x0 + ((end - x0) * i) / steps;
          const k = (x - (end - BEAT_PX * 0.8)) / (BEAT_PX * 0.8);
          const yy = y + beatAt(k) * BEAT_AMP * 0.8 * (0.55 + 0.45 * Math.abs(Math.sin(phase * Math.PI)));
          if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        dot(end, y, 3, 1);
        liveDot(dx, y, 5, 0.3, 0);
      } else {
        // Waiting for a choice, or left for later: the pulse it will be, faint, and its dot, quiet. A
        // ghost of the beat crosses it now and then, the way the line of a monitor waits.
        logoPulse(x0, x1, y, { a: data.state === 'skip' ? 0.12 : 0.22, amp: BEAT_AMP, beatFrom: 0.46, beatSpan: BEAT_PX / (x1 - x0), width: 1.4 });
        if (data.state !== 'skip' && !still) { const sweep = frac(t * 0.18); ctx.save(); ctx.beginPath(); ctx.rect(x0 + (x1 - x0) * sweep - 60, 0, 60, h); ctx.clip(); logoPulse(x0, x1, y, { a: 0.55, amp: BEAT_AMP, beatFrom: 0.46, beatSpan: BEAT_PX / (x1 - x0), width: 1.6 }); ctx.restore(); }
        liveDot(dx, y, 5, data.state === 'skip' ? 0.25 : 0.5, 0);
      }
      if (data.model) label(data.model, x0, h * 0.7, { a: 0.9 });
      if (data.detail) label(data.detail, x1, h * 0.7, { a: 0.9, align: 'right', ink: data.state === 'ready' ? PHOSPHOR : TEXT2 });
    },
    ready(t, now, data) {
      const y = h * 0.4;
      const x0 = w * 0.06;
      const bx = Math.max(w * 0.4, w - Math.min(w * 0.52, 420) - w * 0.06);
      const bw = w - bx - w * 0.06;
      const bh = 46;
      const age = at(now, `ready:${data.text}`);
      // The pulse comes in from the left and arrives at the message.
      const drawn = still ? 1 : easeInOut(age / 0.9);
      logoPulse(x0, bx - 10, y, { drawn, amp: BEAT_AMP * 0.9, beatFrom: 0.4, beatSpan: (BEAT_PX * 0.9) / (bx - 10 - x0) });
      // The message: the book's capsule, its words typed in, the dot as the cursor.
      const shown = still ? 1 : easeOut((age - 0.7) / FADE);
      ctx.globalAlpha = shown;
      ctx.fillStyle = CARD;
      ctx.beginPath();
      ctx.roundRect?.(bx, y - bh / 2, bw, bh, 14) ?? ctx.rect(bx, y - bh / 2, bw, bh);
      ctx.fill();
      ctx.strokeStyle = rgba(TEXT, 0.14); ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 1;
      const text = String(data.text ?? '');
      const typed = still ? text.length : Math.max(0, Math.floor((age - 1.0) * 26));
      ctx.save(); ctx.beginPath(); ctx.rect(bx + 12, y - bh / 2, bw - 24, bh); ctx.clip();
      ctx.font = READ;
      const visible = text.slice(0, Math.min(text.length, typed));
      const width = ctx.measureText(visible).width;
      const shift = Math.max(0, width - (bw - 44));
      label(visible, bx + 16 - shift, y + 1, { a: shown, ink: TEXT, font: READ });
      ctx.restore();
      const blink = still || typed < text.length ? 1 : (Math.sin(age * 5) > 0 ? 1 : 0.25);
      dot(Math.min(bx + 16 + width - shift + 7, bx + bw - 14), y, 3.4, shown * blink);
    },
  };

  function draw(nowMs) {
    frame = 0;
    if (!node.isConnected) return;
    if (!w) fit();
    if (!ctx || !w) { if (!still) frame = requestAnimationFrame(draw); return; }
    const now = nowMs / 1000;
    const t = still ? 1 : now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ground(t);
    // The scene that leaves fades out for 0.4 s under the one that comes.
    if (leaving) {
      const gone = (now - leaving.since) / FADE;
      if (gone >= 1 || still) leaving = null;
      else { ctx.globalAlpha = 1 - easeOut(gone); PICTURES[leaving.id]?.(t, now, leaving.data()); ctx.globalAlpha = 1; }
    }
    if (scene) {
      const age = still ? 1 : (now - scene.since) / FADE;
      ctx.save();
      ctx.globalAlpha = easeOut(age);
      ctx.translate(0, still ? 0 : RISE * 0.5 * (1 - easeOut(age)));
      PICTURES[scene.id]?.(t, now, scene.data() ?? {});
      ctx.restore();
    }
    if (!still) frame = requestAnimationFrame(draw);
  }
  const start = () => { if (!frame) frame = requestAnimationFrame(draw); };

  return {
    node,
    // A step's picture: its id and a function that says, each time it is drawn, what it shows now.
    show(id, data = () => ({})) {
      if (scene?.id === id) { scene.data = data; start(); return; }
      const now = (globalThis.performance?.now() ?? Date.now()) / 1000;
      if (scene) leaving = { ...scene, since: now };
      scene = { id, data, since: now };
      for (const key of [...born.keys()]) if (!key.startsWith(`${id}:`)) born.delete(key);
      start();
      if (still) requestAnimationFrame(draw);
    },
    // The line under the picture: what is happening now, in a few words.
    say(text) {
      if (words.textContent === text) return;
      words.textContent = text;
      if (!still) { caption.classList.remove('new'); void caption.offsetWidth; caption.classList.add('new'); }
      if (still) requestAnimationFrame(draw);
    },
    // Still pictures are drawn again when what they show changes.
    redraw() { if (still) requestAnimationFrame(draw); else start(); },
    stop() { if (frame) cancelAnimationFrame(frame); frame = 0; observer?.disconnect(); },
  };
}
