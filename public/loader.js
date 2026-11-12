// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
import { t } from './i18n.js';
import { BRANDS } from './brands.js';

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
// THE OPENING (2026-10-28; told as a story since 2026-11-11, the author: «it is beautiful, but it does
// not say what MADRE does — a reveal so clear that the person understands MADRE without thinking»).
// Four short beats, each with one line of words under the picture:
//   1 · YOUR AIs — the AIs a person already uses come in as points of light, each in its own colour and
//       with its name, each drifting on its own.
//   2 · YOUR PROJECTS — three of the person's things appear below them (a shop, the invoices, a
//       website); fine threads go from the AIs to them and small sparks travel along: work being done.
//   3 · ONE MEMORY — everything comes together: the AIs onto one line that becomes MADRE's pulse, the
//       projects into its dot, which beats once: what they did is kept.
//   4 · MADRE — the name, and in one line what it is.
// About eight seconds; a click or any key goes straight to the welcome, and a computer that asked for
// less motion goes there without it. The picture is drawn on a canvas; the logo is MADRE's own
// drawing, moved by hand so the line passes each point at the moment it takes it in. MADRE's own style
// (brand kit): the phosphor is the only colour that means MADRE, nothing spins or glows like neon.
// The AIs MADRE works with, by their owners' official marks (brands.js, Lobe Icons, unaltered), in
// the order they stand: ChatGPT's Codex, Claude, Gemini, Grok, OpenCode and Cursor.
const INTRO_AGENTS = ['codex', 'claude', 'gemini', 'grok', 'opencode', 'cursor'];
// What people call each one, when it is not the name of the app.
const INTRO_SAID = { codex: 'ChatGPT' };
const INTRO = {
  appear: 250, labelsOut: 4000,
  projects: 1900, threads: 2400, sparks: 2700,
  gather: 4300, gathered: 5150, draw: 4800, drawn: 5750, beat: 5700, word: 6050, hold: 8900, out: 650,
  story: [300, 2050, 4350, 6100],
};
// Which project each AI works on, while they work: every project gets more than one, and no thread
// crosses another (the AIs and the projects both read left to right).
const INTRO_WORK = [[0], [0, 1], [1], [1], [1, 2], [2]];
// The pulse is drawn at the centre, alone; when the name comes it glides left to make room for it.
// The share of the logo's width between the pulse's centre and the whole logo's (loader.js viewBox).
const PULSE_OFF_CENTRE = (183.75 - 80) / 377.1;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeIn = (x) => x * x * x;
const easeExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const span = (now, from, to) => Math.max(0, Math.min(1, (now - from) / (to - from)));

// A window that opens does not open with its × lit (2026-11-10). With nothing marked `autofocus`, the
// browser gives the first key the focus, and in most windows that is the ×: it opened red, as if
// pointed at (Connections, Add project…). When the focus lands on a ×, the window takes it itself;
// Tab still reaches the × first, and a window whose first control is a field keeps it there. Here
// because Home and the project both load this file.
const CLOSE_KEYS = '.x-close, .surface-mode.close';
{
  const Dialog = globalThis.HTMLDialogElement;
  const open = Dialog?.prototype?.showModal;
  if (open && !Dialog.prototype.showModal.madreQuiet) {
    Dialog.prototype.showModal = function showModal(...args) {
      const done = open.apply(this, args);
      const now = globalThis.document?.activeElement;
      // Not only the ×: any key the browser lit on its own (2026-11-10, «Copy all» in what the project
      // sends opened marked). A field keeps the focus; a key the page focuses itself after this does too.
      if (now && now !== this && this.contains(now) && (now.matches?.(CLOSE_KEYS) || (!now.matches?.('input, textarea, select, [contenteditable="true"]') && !now.hasAttribute?.('autofocus')))) {
        if (!this.hasAttribute('tabindex')) this.tabIndex = -1;
        this.focus({ preventScroll: true });
      }
      return done;
    };
    Dialog.prototype.showModal.madreQuiet = true;
  }
  // A file picker put away with «Cancel» says `cancel`, and that event climbs to the window it sits
  // in, which took it as its own and closed (2026-11-10: Modules shut when the Finder was cancelled).
  globalThis.document?.addEventListener?.('cancel', (event) => {
    if (event.target?.matches?.('input[type="file"]')) event.stopPropagation();
  }, true);
}

// The page is ready (2026-10-30): the ground put over it before its first frame (index.html,
// salas-mac.html) fades out, the way a page arriving from another one does. Under an opening, it
// goes unseen; once is enough.
export function bootDone() {
  const root = globalThis.document?.documentElement;
  if (!root?.classList?.contains('madre-booting')) return;
  root.classList.remove('madre-booting');
  root.classList.add('madre-arriving');
  setTimeout(() => root.classList.remove('madre-arriving'), 700);
}

// Whether this page already played MADRE's opening: it is played once per page, never twice in a row.
let openingDone = false;
export const openingPlayed = () => openingDone;

export function playOpening(dialog, { skipLabel = 'Skip' } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
  openingDone = true;
  return new Promise((resolve) => {
    const light = document.documentElement.dataset.scheme === 'light';
    const brand = light ? '#2f8a1c' : '#9bff66';
    // What each beat says, and the three things of the person's that the AIs work on.
    // Each beat's words in two tones, as a product is presented: what it is, then the quieter half.
    const lines = [
      [t('You use several AIs.'), t('Each one on its own.')],
      [t('MADRE puts them to work together,'), t('on your projects.')],
      [t('And it remembers what they decide.'), t('Nobody starts from zero.')],
      [t('Your AIs, together,'), t('in your projects.')],
    ];
    const things = [t('Your shop'), t('Invoices'), t('Your website')];
    // Only the picture is hidden from a screen reader: the words and «Skip» stay for it.
    const stage = make('div', 'wl-intro');
    const sky = make('canvas', 'wl-intro-sky');
    sky.setAttribute('aria-hidden', 'true');
    const mark = make('div', 'wl-intro-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = MADRE_LOGO.replace('class="brand-logo"', 'class="wl-intro-logo"'); // trusted: our own SVG string
    const story = make('div', 'wl-intro-story');
    story.setAttribute('aria-live', 'polite');
    // Two lines on top of each other: the new one comes into focus as the one before leaves.
    const shown = [make('p', 'wl-intro-line'), make('p', 'wl-intro-line')];
    story.append(...shown);
    let front = 0;
    const skip = make('button', 'wl-intro-skip', skipLabel);
    skip.type = 'button';
    skip.addEventListener('click', () => end(true));
    stage.append(sky, mark, story, skip);
    dialog.append(stage);
    dialog.classList.add('intro');
    const beat = mark.querySelector('.beat');
    const dot = mark.querySelector('.beat-dot');
    const word = mark.querySelector('.word');
    const pen = sky.getContext('2d');
    const face = getComputedStyle(stage).fontFamily || 'system-ui, sans-serif';
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
    const lands = [0.05, 0.36, 0.5, 0.64, 0.8, 0.96];
    const length = beat.getTotalLength();
    const toStage = (point) => {
      const matrix = beat.getScreenCTM();
      const box = stage.getBoundingClientRect();
      return { x: matrix.a * point.x + matrix.c * point.y + matrix.e - box.left, y: matrix.b * point.x + matrix.d * point.y + matrix.f - box.top };
    };
    const landing = () => lands.map((share) => toStage(beat.getPointAtLength(share * length)));
    const dotAt = () => {
      const box = dot.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      return { x: box.left + box.width / 2 - stageBox.left, y: box.top + box.height / 2 - stageBox.top, r: box.width / 2 };
    };
    // Each mark drawn twice, as pictures the canvas can stamp: in its badge (its own colour on the
    // brand's ground) and quiet, in the page's ink, for the row under MADRE's name at the end.
    const picture = (svg, fill) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" `).replaceAll('currentColor', fill))}`;
      return image;
    };
    const agents = INTRO_AGENTS.map((id, index) => {
      const brand = BRANDS[id];
      const hue = light ? brand.colorLight : brand.color;
      return { id, hue, ground: brand.color, name: INTRO_SAID[id] ?? brand.label, badge: picture(brand.mark(), brand.ink), quiet: picture(brand.mark(), light ? '#5d625a' : '#b8bdb3'), phase: index * 1.7 };
    });
    const dust = Array.from({ length: 46 }, (_, index) => ({ x: ((index * 73) % 97) / 97, y: ((index * 41) % 89) / 89, r: 0.4 + ((index * 7) % 5) * 0.18, a: 0.05 + ((index * 11) % 7) * 0.016, drift: 0.004 + ((index * 5) % 9) * 0.0012 }));
    const ink = (hex, alpha) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${Math.max(0, Math.min(1, alpha))})`;
    };
    const textInk = (alpha) => (light ? `rgba(28, 32, 28, ${alpha})` : `rgba(236, 240, 232, ${alpha})`);
    // Where the mark stands: the pulse alone at the centre, then the whole logo as the name comes in.
    const place = (time) => {
      const settle = easeInOut(span(time, INTRO.word - 300, INTRO.word + 900));
      const scale = 1.035 - 0.035 * easeOut(span(time, INTRO.gathered, INTRO.word + 900));
      mark.style.transform = `translate(calc(-50% + ${(PULSE_OFF_CENTRE * mark.clientWidth * (1 - settle)).toFixed(2)}px), -50%) scale(${scale.toFixed(4)})`;
    };
    place(0);
    let targets = landing();
    let sink = dotAt();
    let started = 0;
    let frame = 0;
    let done = false;
    let line = -1;
    const onResize = () => { fit(); targets = landing(); sink = dotAt(); };
    globalThis.addEventListener('resize', onResize);
    // A card for one of the person's things: a folder's tab, its name, the faintest fill.
    const card = (x, y, name, alpha, scale, glow) => {
      const w = Math.max(96, Math.min(140, width * 0.13)) * scale;
      const h = 38 * scale;
      const left = x - w / 2;
      const top = y - h / 2;
      const r = 9 * scale;
      pen.save();
      pen.globalAlpha = alpha;
      pen.beginPath();
      pen.moveTo(left + r, top);
      pen.lineTo(left + w * 0.34, top);
      pen.lineTo(left + w * 0.34 + 6 * scale, top + 5 * scale);
      pen.lineTo(left + w - r, top + 5 * scale);
      pen.quadraticCurveTo(left + w, top + 5 * scale, left + w, top + 5 * scale + r);
      pen.lineTo(left + w, top + h - r);
      pen.quadraticCurveTo(left + w, top + h, left + w - r, top + h);
      pen.lineTo(left + r, top + h);
      pen.quadraticCurveTo(left, top + h, left, top + h - r);
      pen.lineTo(left, top + r);
      pen.quadraticCurveTo(left, top, left + r, top);
      pen.closePath();
      pen.fillStyle = light ? `rgba(255, 255, 255, ${0.82 + 0.18 * glow})` : `rgba(255, 255, 255, ${0.045 + 0.04 * glow})`;
      // Depth: a soft shadow under each card, as an object resting a little above the page.
      pen.shadowColor = light ? `rgba(24, 40, 24, ${0.1 * alpha})` : `rgba(0, 0, 0, ${0.45 * alpha})`;
      pen.shadowBlur = 22 * scale;
      pen.shadowOffsetY = 8 * scale;
      pen.fill();
      pen.shadowColor = 'transparent';
      pen.shadowBlur = 0;
      pen.shadowOffsetY = 0;
      pen.strokeStyle = glow > 0.01 ? ink(brand, 0.25 + 0.4 * glow) : textInk(light ? 0.16 : 0.18);
      pen.lineWidth = 1;
      pen.stroke();
      if (scale > 0.55) {
        pen.fillStyle = textInk(light ? 0.78 : 0.82);
        pen.font = `500 ${Math.round(12.5 * scale)}px ${face}`;
        pen.textAlign = 'center';
        pen.textBaseline = 'middle';
        pen.fillText(name, x, top + 5 * scale + (h - 5 * scale) / 2, w - 16);
      }
      pen.restore();
      return { x, y, top, w, h };
    };

    function paint(now) {
      if (!started) started = now;
      const time = now - started;
      pen.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.42;
      const band = Math.min(height * 0.18, 140);
      const gather = easeInOut(span(time, INTRO.gather, INTRO.gathered));
      const drawn = easeOut(span(time, INTRO.draw, INTRO.drawn));
      place(time);
      if (time < INTRO.drawn) { targets = landing(); sink = dotAt(); }
      // The line under the picture: one per beat, each coming in as the one before goes.
      const at = INTRO.story.filter((from) => time >= from).length - 1;
      if (at !== line) {
        line = at;
        const [strong, soft] = lines[at] ?? ['', ''];
        const leaving = shown[front];
        front = 1 - front;
        const coming = shown[front];
        leaving.classList.remove('in');
        leaving.classList.add('out');
        coming.classList.remove('out', 'in');
        coming.replaceChildren(make('span', 'wl-intro-strong', strong), ' ', make('span', 'wl-intro-soft', soft));
        coming.classList.toggle('last', at === lines.length - 1);
        void coming.offsetWidth;
        coming.classList.add('in');
      }
      // The dust drifts up, and goes when everything comes together.
      const dustFade = 1 - span(time, INTRO.gather, INTRO.gather + 700);
      for (const speck of dust) {
        const y = ((speck.y - time * speck.drift * 0.001) % 1 + 1) % 1;
        pen.fillStyle = light ? `rgba(20, 24, 20, ${speck.a * 0.8 * dustFade})` : `rgba(235, 240, 230, ${speck.a * dustFade})`;
        pen.beginPath();
        pen.arc(speck.x * width, y * height, speck.r, 0, Math.PI * 2);
        pen.fill();
      }
      // The person's things: in a row under the AIs, then into the dot, where they are kept.
      const projectsIn = easeOut(span(time, INTRO.projects, INTRO.projects + 700));
      const into = easeInOut(span(time, INTRO.gather + 200, INTRO.gathered + 200));
      const spread = Math.min(width * 0.27, 250);
      const homes = things.map((_, index) => ({ x: cx + (index - 1) * spread, y: cy + band * 0.85 }));
      const cards = homes.map((home, index) => {
        const lift = (1 - easeOut(span(time, INTRO.projects + index * 140, INTRO.projects + index * 140 + 700))) * 10;
        return { x: home.x + (sink.x - home.x) * into, y: home.y + lift + (sink.y - home.y) * into };
      });
      // The AIs: each on its own slow drift in a band above, until they glide to their places on the
      // pulse. While they work, each leans a little towards the project it works on.
      const work = easeInOut(span(time, INTRO.threads, INTRO.threads + 900)) * (1 - gather);
      const pos = agents.map((agent, index) => {
        const homeX = cx + (index - 2.5) * Math.min(width * 0.14, 150);
        const homeY = cy - band * (0.75 + 0.18 * Math.sin(index * 2.3));
        const wander = { x: Math.sin(time * 0.00042 + agent.phase) * 22, y: Math.cos(time * 0.00035 + agent.phase * 1.3) * 12 };
        const towards = cards[INTRO_WORK[index][0]];
        const free = { x: homeX + wander.x + (towards.x - homeX) * 0.12 * work, y: homeY + wander.y + (towards.y - homeY) * 0.1 * work };
        const target = targets[index];
        return { x: free.x + (target.x - free.x) * gather, y: free.y + (target.y - free.y) * gather };
      });
      // The threads of work: fine curves from each AI to its projects, with sparks running down them.
      const threadsIn = easeOut(span(time, INTRO.threads, INTRO.threads + 900));
      const threadsOut = 1 - span(time, INTRO.gather - 100, INTRO.gather + 450);
      if (threadsIn && threadsOut) {
        INTRO_WORK.forEach((projects, index) => {
          for (const [n, project] of projects.entries()) {
            const from = pos[index];
            const to = cards[project];
            const end = { x: to.x + (n ? 1 : -1) * (projects.length > 1 ? 14 : 0), y: to.y - 20 };
            // A soft S from the AI down into the project: it leaves straight down and arrives straight down.
            const dy = end.y - from.y;
            const c1 = { x: from.x, y: from.y + dy * 0.55 };
            const c2 = { x: end.x, y: end.y - dy * 0.55 };
            const along = (q) => {
              const r = 1 - q;
              return { x: r * r * r * from.x + 3 * r * r * q * c1.x + 3 * r * q * q * c2.x + q * q * q * end.x, y: r * r * r * from.y + 3 * r * r * q * c1.y + 3 * r * q * q * c2.y + q * q * q * end.y };
            };
            const grow = easeOut(span(time, INTRO.threads + (index * 2 + n) * 90, INTRO.threads + (index * 2 + n) * 90 + 800));
            const alpha = (light ? 0.38 : 0.32) * threadsOut;
            pen.strokeStyle = ink(agents[index].hue, alpha);
            pen.lineWidth = 1;
            pen.beginPath();
            pen.moveTo(from.x, from.y + 4);
            const steps = 32;
            for (let k = 1; k <= Math.round(steps * grow); k += 1) { const point = along(k / steps); pen.lineTo(point.x, point.y); }
            pen.stroke();
            // A spark: one little piece of work travelling down, again and again.
            if (time > INTRO.sparks && grow >= 1) {
              const q = ((time - INTRO.sparks) * 0.00055 + index * 0.27 + n * 0.5) % 1;
              const fade = Math.sin(q * Math.PI) * threadsOut;
              // A comet: the spark and a short tail that thins behind it.
              for (let k = 7; k >= 0; k -= 1) {
                const back = Math.max(0, q - k * 0.012);
                const { x: sx, y: sy } = along(easeInOut(back));
                pen.fillStyle = ink(agents[index].hue, 0.9 * fade * (1 - k / 8) ** 1.6);
                pen.beginPath();
                pen.arc(sx, sy, 2 * (1 - k / 10), 0, Math.PI * 2);
                pen.fill();
              }
            }
          }
        });
      }
      // Each project lights up a little while sparks reach it, and is drawn over its threads.
      const working = threadsIn * threadsOut * (time > INTRO.sparks ? 0.5 + 0.5 * Math.sin((time - INTRO.sparks) * 0.004) : 0);
      // Going into the dot, each card lets go of its shape and travels on as a point of MADRE's colour.
      cards.forEach((spot, index) => {
        const alpha = projectsIn * (1 - easeOut(Math.min(1, into * 2.4)));
        if (alpha > 0.01) card(spot.x, spot.y, things[index], alpha, 1 - 0.3 * into, Math.max(0, working * (0.6 + 0.4 * Math.sin(index * 2 + time * 0.003))));
        const travel = projectsIn * Math.min(1, into * 3) * (1 - span(time, INTRO.gathered - 100, INTRO.gathered + 250));
        if (travel > 0.01) {
          pen.fillStyle = ink(brand, 0.85 * travel);
          pen.beginPath();
          pen.arc(spot.x, spot.y, 2.6, 0, Math.PI * 2);
          pen.fill();
        }
      });
      // The AIs: each comes in with its name, and goes into the line when the line reaches it.
      const labels = 1 - easeOut(span(time, INTRO.labelsOut, INTRO.labelsOut + 600));
      agents.forEach((agent, index) => {
        const shown = easeOut(span(time, INTRO.appear + index * 160, INTRO.appear + index * 160 + 600));
        const taken = drawn >= lands[index] ? span(time, INTRO.draw + lands[index] * (INTRO.drawn - INTRO.draw) * 0.7, INTRO.draw + lands[index] * (INTRO.drawn - INTRO.draw) * 0.7 + 260) : 0;
        const alpha = shown * (1 - taken);
        if (!alpha) return;
        const { x, y } = pos[index];
        // The way it came: while they glide onto the line, each leaves a fine fading trail.
        const trail = (agent.trail ??= []);
        trail.push({ x, y });
        if (trail.length > 10) trail.shift();
        if (gather > 0.08 && gather < 0.97 && trail.length > 2) {
          for (let k = 1; k < trail.length; k += 1) {
            pen.strokeStyle = ink(agent.hue, 0.5 * alpha * (k / trail.length) ** 2);
            pen.lineWidth = 2.2 * (k / trail.length);
            pen.lineCap = 'round';
            pen.beginPath();
            pen.moveTo(trail[k - 1].x, trail[k - 1].y);
            pen.lineTo(trail[k].x, trail[k].y);
            pen.stroke();
          }
        }
        // Its badge: the official mark on its own colour, a small object with a soft shadow; as it
        // glides onto the line it shrinks to a point of its colour and goes into the pulse.
        const badge = 15 * (1 - 0.8 * easeInOut(gather)) * (1 + 0.3 * taken);
        pen.save();
        pen.globalAlpha = alpha;
        pen.shadowColor = light ? 'rgba(20, 30, 20, .16)' : 'rgba(0, 0, 0, .5)';
        pen.shadowBlur = 14 * (1 - gather);
        pen.shadowOffsetY = 5 * (1 - gather);
        pen.fillStyle = agent.ground;
        pen.beginPath();
        pen.arc(x, y, badge, 0, Math.PI * 2);
        pen.fill();
        pen.restore();
        if (light && (agent.id === 'grok' || agent.id === 'cursor')) {
          pen.strokeStyle = `rgba(20, 30, 20, ${0.14 * alpha})`;
          pen.lineWidth = 1;
          pen.beginPath();
          pen.arc(x, y, badge, 0, Math.PI * 2);
          pen.stroke();
        }
        const markIn = alpha * (1 - easeOut(Math.min(1, gather * 1.8)));
        if (markIn > 0.01 && agent.badge.complete && agent.badge.naturalWidth) {
          const m = badge * 1.25;
          pen.globalAlpha = markIn;
          pen.drawImage(agent.badge, x - m / 2, y - m / 2, m, m);
          pen.globalAlpha = 1;
        }
        if (labels > 0.01) {
          pen.fillStyle = textInk((light ? 0.6 : 0.58) * alpha * labels);
          pen.font = `500 11px ${face}`;
          pen.textAlign = 'center';
          pen.textBaseline = 'top';
          pen.fillText(agent.name, x, y + badge + 7);
        }
      });
      // THE ROW UNDER THE NAME: once MADRE is written, the same marks come back, small and quiet, in a
      // line under it — MADRE with the AIs it works with, one picture.
      const rowIn = span(time, INTRO.word + 500, INTRO.word + 1500);
      if (rowIn > 0) {
        const box = mark.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        const size = Math.max(16, Math.min(22, box.width * 0.042));
        const gap = size * 1.25;
        const total = agents.length * size + (agents.length - 1) * gap;
        const left = box.left - stageBox.left + box.width / 2 - total / 2;
        const top = box.bottom - stageBox.top + 26;
        agents.forEach((agent, index) => {
          const k = easeExpo(span(time, INTRO.word + 500 + index * 70, INTRO.word + 1300 + index * 70));
          if (!k || !agent.quiet.complete || !agent.quiet.naturalWidth) return;
          pen.globalAlpha = k * (light ? 0.8 : 0.75);
          pen.drawImage(agent.quiet, left + index * (size + gap), top + 8 * (1 - k), size, size);
          pen.globalAlpha = 1;
        });
      }
      // The pulse draws itself through them; then the beat, with one ring, and the name.
      beat.style.strokeDashoffset = String(100 - 100 * drawn);
      const beatIn = easeOut(span(time, INTRO.beat, INTRO.beat + 420));
      dot.style.opacity = String(beatIn);
      dot.style.transform = `scale(${0.4 + 0.6 * beatIn})`;
      // The beat lights the whole stage once, softly, from the dot: what they did is now kept.
      const bloom = span(time, INTRO.beat, INTRO.beat + 1400);
      if (bloom > 0 && bloom < 1) {
        const spot = dotAt();
        const reach = Math.max(width, height) * (0.25 + 0.5 * easeOut(bloom));
        const glow = pen.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, reach);
        glow.addColorStop(0, ink(brand, (light ? 0.12 : 0.16) * Math.sin(bloom * Math.PI)));
        glow.addColorStop(1, ink(brand, 0));
        pen.fillStyle = glow;
        pen.fillRect(0, 0, width, height);
      }
      for (const [delay, reach, strength] of [[60, 46, 0.42], [380, 74, 0.22]]) {
        const ring = span(time, INTRO.beat + delay, INTRO.beat + delay + 1000);
        if (ring > 0 && ring < 1) {
          const spot = dotAt();
          pen.strokeStyle = ink(brand, strength * (1 - easeOut(ring)));
          pen.lineWidth = 1.2;
          pen.beginPath();
          pen.arc(spot.x, spot.y, spot.r + easeOut(ring) * reach, 0, Math.PI * 2);
          pen.stroke();
        }
      }
      const wordIn = easeExpo(span(time, INTRO.word, INTRO.word + 1300));
      word.style.opacity = String(Math.min(1, wordIn * 1.4));
      word.style.transform = `translate(${193.5 + 22 * (1 - wordIn)}px, 7px)`;
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
      stage.classList.add('leaving');
      if (early) stage.classList.add('fast');
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
    const mark = make('div', 'po-mark');
    mark.setAttribute('aria-hidden', 'true');
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