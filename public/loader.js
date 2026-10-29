// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// MADRE loading (2026-10-10): the pulse of the logo beating, a thin bar that fills and the share
// done under it, as a Mac starts. One loader for every wait that takes time — a RELOAD, the room
// or Home coming back after an update, a project waking, an agent installing — so a wait always
// looks the same and says how far it is.
//
// The share is what is known: steps reached, bytes received, a server that answers. When only the
// start and the end are known, `creep` moves the bar on its own towards a ceiling it never passes,
// slower the closer it gets, and the end fills it.

// MADRE's logo as the brandbook draws it (salas-mac.html, .brand-logo): the beat, then the word. Shared
// by the windows that wear it in their head — the welcome, the chapters (2026-10-28).
export const MADRE_LOGO = '<svg class="brand-logo" viewBox="-4.8 -4.8 377.1 49.6" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><g class="pulse" transform="translate(0 0) scale(2.5) translate(0 -2)"><path class="beat" d="M1 10H16L20 10L23.5 2L28 18L32 10L35 10L37 6L39 10H52" stroke-width="1.92" pathLength="100"/><circle class="beat-dot" cx="60" cy="10" r="3" stroke="none"/></g><g class="word" transform="translate(193.5 7)" stroke-width="4.8"><path d="M0 26V0L14 14.3L28 0V26"/><path transform="translate(36.5 0)" d="M0 26V7.8A7.8 7.8 0 0 1 7.8 0H17.2A7.8 7.8 0 0 1 25 7.8V26M0 15.6H25"/><path transform="translate(71.5 0)" d="M0 0H16A12 12 0 0 1 28 12V14A12 12 0 0 1 16 26H0Z"/><path transform="translate(110.5 0)" d="M0 26V0H20.85A7.15 7.15 0 0 1 28 7.15V7.15A7.15 7.15 0 0 1 20.85 14.3H0M15.12 14.3L28 26"/><path transform="translate(146 0)" d="M28 0H0V26H28M0 13H21"/></g></g></svg>';
export const LOADER_MARK = '<svg viewBox="-2 -1 66 22" aria-hidden="true"><path class="madre-loader-trace" d="M1 10H16L20 10L23.5 2L28 18L32 10L35 10L37 6L39 10H52" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path class="madre-loader-beat" d="M1 10H16L20 10L23.5 2L28 18L32 10L35 10L37 6L39 10H52" pathLength="100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle class="madre-loader-dot" cx="60" cy="10" r="3" fill="currentColor"/></svg>';

const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));

// `small`: in a line, for a card's own wait (a project waking in Home), the words first.
export function makeLoader({ progress = 0, label = '', small = false } = {}) {
  const node = document.createElement('div');
  node.className = `madre-loader${small ? ' small' : ''}`;
  node.setAttribute('role', 'progressbar');
  node.setAttribute('aria-valuemin', '0');
  node.setAttribute('aria-valuemax', '100');
  const mark = document.createElement('span');
  mark.className = 'madre-loader-mark';
  mark.innerHTML = LOADER_MARK; // trusted: our own SVG string
  const bar = document.createElement('span');
  bar.className = 'madre-loader-bar';
  bar.append(document.createElement('i'));
  const pct = document.createElement('span');
  pct.className = 'madre-loader-pct';
  const said = document.createElement('span');
  said.className = 'madre-loader-said';
  node.append(mark, bar, pct, said);
  setLoader(node, progress, label);
  return node;
}

// The share done (0–1), and optionally what is being waited for. The bar never goes back.
export function setLoader(node, value, label) {
  if (!node) return;
  const before = Number(node.dataset.p ?? 0);
  const p = Math.max(before, clamp(value));
  node.dataset.p = String(p);
  node.style.setProperty('--p', String(p));
  const shown = Math.round(p * 100);
  const pct = node.querySelector('.madre-loader-pct');
  if (pct) pct.textContent = `${shown} %`;
  node.setAttribute('aria-valuenow', String(shown));
  if (label !== undefined) {
    const said = node.querySelector('.madre-loader-said');
    if (said) said.textContent = label;
    if (label) node.setAttribute('aria-label', label);
  }
}

// For a wait whose middle is unknown: towards `to`, a little less of the way left each tick.
// Answers a stop.
export function creep(node, { to = 0.9, every = 160, rate = 0.035 } = {}) {
  const timer = setInterval(() => {
    const p = Number(node?.dataset.p ?? 0);
    if (!node?.isConnected || p >= to) { clearInterval(timer); return; }
    setLoader(node, Math.min(to, p + (to - p) * rate));
  }, every);
  return () => clearInterval(timer);
}

// A curtain over the whole page, in the top layer (a popover): above any window that is open and
// its blurred backdrop, so nothing ever lies over the loader. Where popovers do not exist it is an
// ordinary fixed layer.
export function showCurtain(node) {
  if (typeof node.showPopover === 'function') node.popover = 'manual';
  document.body.append(node);
  try { node.showPopover?.(); } catch { /* already shown, or not a popover: it is on the page */ }
  return node;
}

// Done: the bar fills, holds a moment, and whoever waited goes on.
export function finishLoader(node, { hold = 260 } = {}) {
  setLoader(node, 1);
  return new Promise((resolve) => setTimeout(resolve, hold));
}

// THE OPENING, shared (2026-10-28): before the welcome's first step (welcome.js) and when a project
// opens again after it was closed (app.js). Here, beside the logo it draws, because every MADRE
// already serves this file. `dialog` is the top-layer window it plays in: it takes the class `intro`
// while it plays and `arriving` as it goes, so what it covers can rise in under it.
const make = (tag, className, text = null) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== null) node.textContent = text;
  return node;
};
// THE OPENING (2026-10-28): before the first step, what MADRE is, said without words. The AIs a
// person already uses come in as points of light, each in its own color, find each other with fine
// lines and come together on one line that becomes MADRE's pulse: the beat, then the name. About five
// seconds; a click or any key goes straight to the welcome, and a computer that asked for less motion
// goes there without it. Drawn on a canvas, the points; the logo is MADRE's own drawing (loader.js),
// moved by hand so the line passes each point at the moment it takes it in.
const INTRO_HUES = {
  dark: ['#7fe3b6', '#f2a37c', '#93acff', '#ecece6', '#c8b5ff'],
  light: ['#1d9a68', '#cf6c40', '#4864d2', '#575a52', '#7a5ed2'],
};
const INTRO = { appear: 250, lines: 900, gather: 2300, gathered: 3300, draw: 2650, drawn: 3600, beat: 3550, word: 3850, hold: 5700, out: 650 };
// The pulse is drawn at the centre, alone; when the name comes it glides left to make room for it.
// The share of the logo's width between the pulse's centre and the whole logo's (loader.js viewBox).
const PULSE_OFF_CENTRE = (183.75 - 80) / 377.1;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const span = (now, from, to) => Math.max(0, Math.min(1, (now - from) / (to - from)));

export function playOpening(dialog, { skipLabel = 'Skip' } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
  return new Promise((resolve) => {
    const light = document.documentElement.dataset.scheme === 'light';
    const hues = INTRO_HUES[light ? 'light' : 'dark'];
    const stage = make('div', 'wl-intro');
    stage.setAttribute('aria-hidden', 'true');
    const sky = make('canvas', 'wl-intro-sky');
    const mark = make('div', 'wl-intro-mark');
    mark.innerHTML = MADRE_LOGO.replace('class="brand-logo"', 'class="wl-intro-logo"'); // trusted: our own SVG string
    const skip = make('button', 'wl-intro-skip', skipLabel);
    skip.type = 'button';
    skip.addEventListener('click', () => end(true));
    stage.append(sky, mark, skip);
    dialog.append(stage);
    dialog.classList.add('intro');
    const beat = mark.querySelector('.beat');
    const dot = mark.querySelector('.beat-dot');
    const word = mark.querySelector('.word');
    const pen = sky.getContext('2d');
    let width = 0;
    let height = 0;
    const fit = () => {
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
      width = stage.clientWidth;
      height = stage.clientHeight;
      sky.width = Math.round(width * ratio);
      sky.height = Math.round(height * ratio);
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    fit();
    // Where on the pulse each AI lands, as a share of its line: before the rise, the peak, the
    // valley, the small step and the end.
    const lands = [0.06, 0.4, 0.55, 0.74, 0.96];
    const length = beat.getTotalLength();
    const landing = () => lands.map((share) => {
      const point = beat.getPointAtLength(share * length);
      const matrix = beat.getScreenCTM();
      const box = stage.getBoundingClientRect();
      return { x: matrix.a * point.x + matrix.c * point.y + matrix.e - box.left, y: matrix.b * point.x + matrix.d * point.y + matrix.f - box.top };
    });
    // The five AIs, each at its own depth on a slow orbit, and a fine dust that gives the dark depth.
    const agents = hues.map((hue, index) => ({ hue, angle: (index / hues.length) * Math.PI * 2 + 0.35 * Math.sin(index * 2.1), reach: 0.62 + 0.38 * ((index * 37) % 5) / 4, depth: 0.75 + ((index * 3) % 5) * 0.1 }));
    const dust = Array.from({ length: 46 }, (_, index) => ({ x: ((index * 73) % 97) / 97, y: ((index * 41) % 89) / 89, r: 0.4 + ((index * 7) % 5) * 0.18, a: 0.05 + ((index * 11) % 7) * 0.016, drift: 0.004 + ((index * 5) % 9) * 0.0012 }));
    const edges = [];
    for (let a = 0; a < agents.length; a += 1) for (let b = a + 1; b < agents.length; b += 1) edges.push([a, b]);
    const ink = (hex, alpha) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
    };
    // Where the mark stands: the pulse alone at the centre, then the whole logo as the name comes in.
    const place = (time) => {
      const settle = easeInOut(span(time, INTRO.word - 300, INTRO.word + 900));
      const scale = 1.035 - 0.035 * easeOut(span(time, INTRO.gathered, INTRO.word + 900));
      mark.style.transform = `translate(calc(-50% + ${(PULSE_OFF_CENTRE * mark.clientWidth * (1 - settle)).toFixed(2)}px), -50%) scale(${scale.toFixed(4)})`;
    };
    place(0);
    let targets = landing();
    let started = 0;
    let frame = 0;
    let done = false;
    const onResize = () => { fit(); targets = landing(); };
    globalThis.addEventListener('resize', onResize);

    function paint(now) {
      if (!started) started = now;
      const time = now - started;
      pen.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.48;
      const radius = Math.min(width, height) * 0.2;
      const gather = easeInOut(span(time, INTRO.gather, INTRO.gathered));
      const drawn = easeOut(span(time, INTRO.draw, INTRO.drawn));
      place(time);
      if (time < INTRO.drawn) targets = landing();
      // The dust drifts up, and goes when the AIs come together.
      const dustFade = 1 - span(time, INTRO.gather, INTRO.gather + 700);
      for (const speck of dust) {
        const y = ((speck.y - time * speck.drift * 0.001) % 1 + 1) % 1;
        pen.fillStyle = light ? `rgba(20, 24, 20, ${speck.a * 0.8 * dustFade})` : `rgba(235, 240, 230, ${speck.a * dustFade})`;
        pen.beginPath();
        pen.arc(speck.x * width, y * height, speck.r, 0, Math.PI * 2);
        pen.fill();
      }
      // Where each AI is: on its orbit, turning slowly, until it glides to its place on the pulse.
      const turn = time * 0.00011;
      const at = agents.map((agent, index) => {
        const angle = agent.angle + turn * agent.depth;
        const free = { x: cx + Math.cos(angle) * radius * agent.reach * 1.35, y: cy + Math.sin(angle) * radius * agent.reach * 0.82 };
        const target = targets[index];
        return { x: free.x + (target.x - free.x) * gather, y: free.y + (target.y - free.y) * gather };
      });
      // The lines between them: drawn one after another, gone as they come together.
      const linesFade = 1 - span(time, INTRO.gather, INTRO.gather + 500);
      edges.forEach(([a, b], index) => {
        const grow = easeOut(span(time, INTRO.lines + index * 70, INTRO.lines + index * 70 + 700));
        if (!grow || !linesFade) return;
        const from = at[a];
        const to = at[b];
        const gradient = pen.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, ink(agents[a].hue, (light ? 0.3 : 0.22) * linesFade));
        gradient.addColorStop(1, ink(agents[b].hue, (light ? 0.3 : 0.22) * linesFade));
        pen.strokeStyle = gradient;
        pen.lineWidth = 0.8;
        pen.beginPath();
        pen.moveTo(from.x, from.y);
        pen.lineTo(from.x + (to.x - from.x) * grow, from.y + (to.y - from.y) * grow);
        pen.stroke();
      });
      // The AIs: each comes in on its own, and goes into the line when the line reaches it.
      agents.forEach((agent, index) => {
        const shown = easeOut(span(time, INTRO.appear + index * 160, INTRO.appear + index * 160 + 600));
        const taken = drawn >= lands[index] ? span(time, INTRO.draw + lands[index] * (INTRO.drawn - INTRO.draw) * 0.7, INTRO.draw + lands[index] * (INTRO.drawn - INTRO.draw) * 0.7 + 260) : 0;
        const alpha = shown * (1 - taken);
        if (!alpha) return;
        const { x, y } = at[index];
        const size = (2.8 - 0.8 * gather) * (1 + 0.5 * taken);
        if (!light) {
          const glow = pen.createRadialGradient(x, y, 0, x, y, size * 9);
          glow.addColorStop(0, ink(agent.hue, 0.42 * alpha));
          glow.addColorStop(1, ink(agent.hue, 0));
          pen.fillStyle = glow;
          pen.beginPath();
          pen.arc(x, y, size * 9, 0, Math.PI * 2);
          pen.fill();
        }
        pen.fillStyle = ink(agent.hue, alpha);
        pen.beginPath();
        pen.arc(x, y, size, 0, Math.PI * 2);
        pen.fill();
      });
      // The pulse draws itself through them; then the beat, with one ring, and the name.
      beat.style.strokeDashoffset = String(100 - 100 * drawn);
      const beatIn = easeOut(span(time, INTRO.beat, INTRO.beat + 420));
      dot.style.opacity = String(beatIn);
      dot.style.transform = `scale(${0.4 + 0.6 * beatIn})`;
      const ring = span(time, INTRO.beat + 60, INTRO.beat + 1000);
      if (ring > 0 && ring < 1) {
        const box = dot.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        const rx = box.left + box.width / 2 - stageBox.left;
        const ry = box.top + box.height / 2 - stageBox.top;
        pen.strokeStyle = ink(light ? '#2f8a1c' : '#9bff66', 0.42 * (1 - easeOut(ring)));
        pen.lineWidth = 1.2;
        pen.beginPath();
        pen.arc(rx, ry, box.width / 2 + easeOut(ring) * 46, 0, Math.PI * 2);
        pen.stroke();
      }
      const wordIn = easeOut(span(time, INTRO.word, INTRO.word + 800));
      word.style.opacity = String(wordIn);
      word.style.transform = `translate(${193.5 + 10 * (1 - wordIn)}px, 7px)`;
      if (time >= INTRO.hold) return end(false);
      frame = requestAnimationFrame(paint);
    }
    // Any key or click goes straight on; Esc too, without closing the welcome under it.
    const onKey = (event) => { event.preventDefault(); end(true); };
    const onCancel = (event) => { event.preventDefault(); end(true); };
    function end(early) {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      globalThis.removeEventListener('resize', onResize);
      dialog.removeEventListener('keydown', onKey, true);
      dialog.removeEventListener('cancel', onCancel);
      stage.removeEventListener('click', onClick);
      stage.classList.add(early ? 'leaving fast' : 'leaving');
      dialog.classList.remove('intro');
      dialog.classList.add('arriving');
      setTimeout(() => stage.remove(), early ? 280 : INTRO.out);
      // The welcome's own rise lasts a little longer than the stage takes to go.
      setTimeout(() => dialog.classList.remove('arriving'), 1000);
      resolve(true);
    }
    const onClick = () => end(true);
    dialog.addEventListener('keydown', onKey, true);
    dialog.addEventListener('cancel', onCancel);
    stage.addEventListener('click', onClick);
    frame = requestAnimationFrame(paint);
  });
}

// A PROJECT OPENS AGAIN (2026-10-28): its own opening, shorter than the welcome's and not the same — the
// pulse is traced in one stroke, its dot beats once with a ring, and where the welcome writes MADRE the
// project writes its own name; then everything comes closer and fades, and the room is under it. About
// a second and a half; a click or any key goes straight on, and less motion skips it (app.js).
export function playProjectOpening(dialog, { name = '', skipLabel = 'Skip' } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
  return new Promise((resolve) => {
    const stage = make('div', 'wl-intro po-stage');
    stage.setAttribute('aria-hidden', 'true');
    const mark = make('div', 'po-mark');
    const pulse = make('span', 'po-pulse');
    pulse.innerHTML = '<svg viewBox="-2 -12 76 44" aria-hidden="true"><path class="po-beat" d="M1 10H16L20 10L23.5 2L28 18L32 10L35 10L37 6L39 10H52" pathLength="100" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><circle class="po-ring" cx="60" cy="10" r="3" fill="none" stroke-width="1"/><circle class="po-dot" cx="60" cy="10" r="3"/></svg>'; // trusted: our own SVG string
    mark.append(pulse, make('span', 'po-name', name));
    const skip = make('button', 'wl-intro-skip', skipLabel);
    skip.type = 'button';
    stage.append(mark, skip);
    dialog.append(stage);
    dialog.classList.add('intro');
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      dialog.removeEventListener('keydown', onKey, true);
      dialog.removeEventListener('cancel', onKey);
      stage.classList.add('po-leaving');
      dialog.classList.remove('intro');
      setTimeout(() => stage.remove(), 520);
      resolve(true);
    };
    const onKey = (event) => { event.preventDefault(); end(); };
    const timer = setTimeout(end, 1500);
    dialog.addEventListener('keydown', onKey, true);
    dialog.addEventListener('cancel', onKey);
    stage.addEventListener('click', end);
  });
}