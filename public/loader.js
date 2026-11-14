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

// MADRE's logo (2026-11-13, the author's rebranding): the M of one stroke, its dot beside it and not
// touching it, and «madre» in Space Grotesk bold (styles.css). The classes are the old pulse's (.pulse,
// .beat, .beat-dot, .word) so every drawing and state that styled it still does. Shared by the windows
// that wear it in their head — the welcome, the chapters, the license.
import { t } from './i18n.js';
import { BRANDS } from './brands.js';

export const MADRE_LOGO = '<svg class="brand-logo" viewBox="12 17.5 281.5 74" aria-hidden="true"><g class="pulse" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="beat" d="M20 82V42C20 21 41 21 46 39L50 52L54 39C59 21 80 21 80 42V60" stroke-width="14.5" pathLength="100"/><circle class="beat-dot" cx="80" cy="81" r="9.5" stroke="none"/></g><text class="word" x="116.7" y="71.4" font-size="62" letter-spacing="-2.17">madre</text></svg>';
export const LOADER_MARK = '<svg viewBox="10 16 82 76" aria-hidden="true"><path class="madre-loader-trace" d="M20 82V42C20 21 41 21 46 39L50 52L54 39C59 21 80 21 80 42V60" fill="none" stroke="currentColor" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round"/><path class="madre-loader-beat" d="M20 82V42C20 21 41 21 46 39L50 52L54 39C59 21 80 21 80 42V60" pathLength="100" fill="none" stroke="currentColor" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round"/><circle class="madre-loader-dot" cx="80" cy="81" r="9.5" fill="currentColor"/></svg>';

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
// THE OPENING AS A MIX (2026-11-13, the author chose «Mezcla» among three sketches): each AI is a colour
// on its own, a soft field drifting apart from the others; they come together and blend into one calm
// field in MADRE's emerald, and out of it the M is written and its dot lands. Nothing else on the
// stage: no badges, no threads, no sparks. About seven seconds, two lines of words.
// Grander since the same day (the author: «impactful; people must see this is professional software
// that will help them do many things»): the colours fill the stage and come in as a vortex, their meeting
// is one emerald flash and a wave across the stage, the M comes large and settles as it is written, a
// light runs along it, the dot lands with its own ring, and under the name what it is for goes by.
// And, as the rebranding drew it (2026-11-13, claude-personal), the M is born as a heart: where the
// colours meet a point appears, two strokes leave it and draw a heart, the heart beats once and becomes
// the M, and then the M's own dot lands, beating twice.
const INTRO = {
  near: 500, merged: 2900, field: 2500, fielded: 3600, impact: 2900,
  seed: 2700, draw: 3000, drawn: 3750, heart: 3800, morph: 4200, morphed: 4850,
  dot: 4850, sheen: 5150, word: 5400, hold: 11300, out: 650,
  // One sentence at a time, on one line, each in step with the picture (2026-11-13, the author: only
  // sentences that change, in the same place, saying what MADRE is).
  story: [300, 2900, 5400, 7500, 9400],
};
// The heart and the M as two halves from the same point, each three curves, so one becomes the other.
// A classic heart, round lobes and sides (2026-11-13: the first one touched the logo's box at its left
// lobe and its top, and the box cut it flat there; see INTRO_VIEW).
const HEART_R = [[50, 33], [52.6, 28.6, 57.4, 24.5, 64, 24.5], [73.5, 24.5, 81, 32, 81, 41.6], [81, 54, 66, 67, 50, 81.4]];
const HEART_L = [[50, 33], [47.4, 28.6, 42.6, 24.5, 36, 24.5], [26.5, 24.5, 19, 32, 19, 41.6], [19, 54, 34, 67, 50, 81.4]];
const M_R = [[50, 52], [51.3, 47.7, 52.7, 43.3, 54, 39], [59, 21, 80, 21, 80, 42], [80, 48, 80, 54, 80, 60]];
const M_L = [[50, 52], [48.7, 47.7, 47.3, 43.3, 46, 39], [41, 21, 20, 21, 20, 42], [20, 55.3, 20, 68.7, 20, 82]];
const halfPath = (a, b, k) => {
  const at = a.map((point, i) => point.map((value, j) => value + (b[i][j] - value) * k));
  return `M${at[0].join(' ')}C${at[1].join(' ')}C${at[2].join(' ')}C${at[3].join(' ')}`;
};
const easeIn = (x) => x * x * x;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const span = (now, from, to) => Math.max(0, Math.min(1, (now - from) / (to - from)));
// The opening's logo drawing has room all round (2026-11-13): MADRE_LOGO's own box ends where the M's
// stroke ends, and the heart, wider and taller than the M and swelling as it beats, was cut at its two
// lobes. The same centre (152.75, 54.5), the same size on the stage (the mark grows with the box).
const INTRO_VIEW = { x: 0, y: 5.5, w: 305.5, h: 98 };
const LOGO_VIEW_W = 281.5;
const VIEW_CENTRE = INTRO_VIEW.x + INTRO_VIEW.w / 2;
// The M's own centre (its stroke from 12.75 to 87.25, the dot to 89.5) and the heart's (50), each alone
// at the stage's centre.
const M_CENTRE = 51.1;

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

export function playOpening(dialog, { skipLabel = 'Skip', from = null } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
  openingDone = true;
  return new Promise((resolve) => {
    const light = document.documentElement.dataset.scheme === 'light';
    const brand = light ? '#10b981' : '#34d399'; // the logo's dot
    // Two lines: what you have now, then what MADRE does with it.
    // What MADRE is, one sentence at a time, each replacing the one before in the same place.
    const lines = [
      // What MADRE does, said plainly (2026-11-13, the author: «easier to understand»).
      t('Claude, ChatGPT, Gemini… each one in its own app.'),
      t('MADRE brings them into one chat.'),
      t('You ask, and they work on your files.'),
      t('And it remembers what they decide.'),
      t('Your AIs, together.'),
    ];
    // Only the picture is hidden from a screen reader: the words and «Skip» stay for it.
    const stage = make('div', 'wl-intro');
    const sky = make('canvas', 'wl-intro-sky');
    sky.setAttribute('aria-hidden', 'true');
    const mark = make('div', 'wl-intro-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = MADRE_LOGO.replace('class="brand-logo"', 'class="wl-intro-logo"'); // trusted: our own SVG string
    mark.querySelector('svg').setAttribute('viewBox', `${INTRO_VIEW.x} ${INTRO_VIEW.y} ${INTRO_VIEW.w} ${INTRO_VIEW.h}`);
    mark.style.width = `calc(min(440px, 66vw) * ${(INTRO_VIEW.w / LOGO_VIEW_W).toFixed(5)})`;
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
    // Coming from the smoke of «Before you start», the stage does not fade in: it is already there.
    const smoke = Array.isArray(from) && from.length === INTRO_AGENTS.length ? from : null;
    if (smoke) stage.classList.add('continues');
    dialog.append(stage);
    dialog.classList.add('intro');
    const beat = mark.querySelector('.beat');
    const dot = mark.querySelector('.beat-dot');
    const word = mark.querySelector('.word');
    beat.style.strokeDasharray = '100 200';
    beat.style.strokeDashoffset = '100';
    // A light that runs along the M once it is written: the same stroke, painted by a moving band.
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const band = document.createElementNS(ns, 'linearGradient');
    band.id = 'wl-sheen';
    band.setAttribute('gradientUnits', 'userSpaceOnUse');
    band.setAttribute('y1', '0');
    band.setAttribute('y2', '0');
    for (const [offset, alpha] of [[0, 0], [0.5, light ? 0.55 : 0.75], [1, 0]]) {
      const stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', String(offset));
      stop.setAttribute('stop-color', light ? '#ffffff' : '#ffffff');
      stop.setAttribute('stop-opacity', String(alpha));
      band.append(stop);
    }
    defs.append(band);
    mark.querySelector('svg').prepend(defs);
    const sheen = beat.cloneNode();
    sheen.removeAttribute('class');
    sheen.setAttribute('stroke', 'url(#wl-sheen)');
    sheen.style.strokeDasharray = '';
    sheen.style.opacity = '0';
    beat.after(sheen);
    // The heart: two halves from the point in the middle, drawn over the M's place; the M's own stroke
    // shows once the heart has become it.
    const halves = ['l', 'r'].map((side) => {
      const half = document.createElementNS(ns, 'path');
      half.setAttribute('class', `half half-${side}`);
      half.setAttribute('pathLength', '100');
      half.setAttribute('stroke-width', beat.getAttribute('stroke-width') || '14.5');
      half.style.strokeDasharray = '100 300';
      half.style.opacity = '0';
      beat.before(half);
      return half;
    });
    const seed = document.createElementNS(ns, 'circle');
    seed.setAttribute('class', 'seed');
    seed.setAttribute('cx', '50');
    seed.setAttribute('cy', '36');
    seed.setAttribute('r', '0');
    beat.parentNode.append(seed);
    beat.style.opacity = '0';
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
    const rgba = (hex, alpha) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${Math.max(0, Math.min(1, alpha))})`;
    };
    // Each AI's own colour (brands.js), as a field of light; the grey ones (Grok, Cursor) quieter, so
    // the mix stays a mix of colours and not a wash of grey.
    const fields = INTRO_AGENTS.map((id, index) => {
      const hue = light ? BRANDS[id].colorLight : BRANDS[id].color;
      const value = Number.parseInt(hue.slice(1), 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      const grey = Math.max(r, g, b) - Math.min(r, g, b) < 24;
      return { hue, weight: grey ? 0.45 : 1, angle: (index / INTRO_AGENTS.length) * Math.PI * 2 - Math.PI / 2, phase: index * 1.3 };
    });
    // A colour on its way to another (both #rrggbb).
    const mix = (from, to, k) => {
      const a = Number.parseInt(from.slice(1), 16);
      const b = Number.parseInt(to.slice(1), 16);
      const channel = (shift) => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * k));
      return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
    };
    const glow = (x, y, radius, hue, alpha) => {
      if (alpha <= 0.002 || radius <= 0) return;
      const fill = pen.createRadialGradient(x, y, 0, x, y, radius);
      fill.addColorStop(0, rgba(hue, alpha));
      fill.addColorStop(0.55, rgba(hue, alpha * 0.45));
      fill.addColorStop(1, rgba(hue, 0));
      pen.fillStyle = fill;
      pen.beginPath();
      pen.arc(x, y, radius, 0, Math.PI * 2);
      pen.fill();
    };
    // Where the mark stands: the M alone at the centre, then the whole logo as the name comes in —
    // centred by what is drawn (the M's left edge to the name's last letter), not by its box: the name
    // runs a little past the box, and centred by the box the logo sat to the right of the words under it.
    let inkCentre = null;
    const centreOfInk = () => {
      if (inkCentre !== null) return inkCentre;
      try {
        const box = word.getBBox();
        if (box.width > 0) inkCentre = (12.75 + box.x + box.width) / 2;
      } catch { /* not laid out yet */ }
      return inkCentre ?? VIEW_CENTRE;
    };
    const place = (time) => {
      const settle = easeInOut(span(time, INTRO.word - 300, INTRO.word + 900));
      const near = 0.24 * (1 - easeOut(span(time, INTRO.draw - 200, INTRO.word + 700)));
      // The scale grows the drawing about the box's centre, so the shift grows with it: the heart and
      // the M stay on the stage's centre line, the same line as the words under them.
      const unit = (mark.clientWidth / INTRO_VIEW.w) * (1 + near);
      const heartOrM = 50 + (M_CENTRE - 50) * span(time, INTRO.morph, INTRO.morphed);
      const alone = (VIEW_CENTRE - heartOrM) * unit;
      const whole = (VIEW_CENTRE - centreOfInk()) * unit;
      mark.style.transform = `translate(calc(-50% + ${(whole + (alone - whole) * (1 - settle)).toFixed(2)}px), -50%) scale(${(1 + near).toFixed(4)})`;
    };
    place(0);
    // The M's centre on the stage, where the colours meet.
    const centre = () => {
      const box = beat.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      return { x: box.left + box.width / 2 - stageBox.left, y: box.top + box.height / 2 - stageBox.top };
    };
    let meet = centre();
    let started = 0;
    let frame = 0;
    let done = false;
    let line = -1;
    const onResize = () => { fit(); meet = centre(); };
    globalThis.addEventListener('resize', onResize);

    function paint(now) {
      if (!started) started = now;
      const time = now - started;
      pen.clearRect(0, 0, width, height);
      place(time);
      if (time < INTRO.word) meet = centre();
      // The words under the picture: one line per moment, each coming in as the one before goes.
      const at = INTRO.story.filter((from) => time >= from).length - 1;
      if (at !== line) {
        line = at;
        const said = lines[at] ?? '';
        const leaving = shown[front];
        front = 1 - front;
        const coming = shown[front];
        leaving.classList.remove('in');
        leaving.classList.add('out');
        coming.classList.remove('out', 'in');
        coming.replaceChildren(make('span', 'wl-intro-strong', said));
        coming.classList.toggle('last', at === lines.length - 1);
        void coming.offsetWidth;
        coming.classList.add('in');
      }
      // THE MIX: the fields drift apart, slowly turning; then they come in and blend over the M.
      const reach = Math.min(width, height);
      const appear = smoke ? 1 : easeOut(span(time, 0, 600));
      // From the smoke: each sphere starts where it floated, as faint as it was, and condenses.
      const takeUp = smoke ? easeInOut(span(time, 0, 1700)) : 1;
      const together = easeInOut(span(time, INTRO.near, INTRO.merged));
      const field = easeInOut(span(time, INTRO.field, INTRO.fielded));
      // Screen on dark and plain paint on light: stacked, the colours stay colours and never go grey.
      pen.globalCompositeOperation = light ? 'source-over' : 'screen';
      const tint = easeInOut(span(time, INTRO.near + 900, INTRO.impact + 300));
      // They come in as a vortex: the closer they are, the faster they turn.
      const spin = time * 0.00009 + 2.6 * easeIn(together);
      for (const one of fields) {
        const turn = one.angle + spin;
        // Apart, they fill the whole stage; together, they ring the M closely, not on one point.
        const apart = reach * (0.44 * (1 - together) + 0.12);
        const x = meet.x + Math.cos(turn) * apart * 1.4 + Math.sin(time * 0.0004 + one.phase) * reach * 0.025;
        const y = meet.y + Math.sin(turn) * apart * 0.82 + Math.cos(time * 0.00033 + one.phase) * reach * 0.025;
        const radius = reach * (0.42 + 0.02 * together);
        // As they blend, each one turns into MADRE's colour: the mix is the green of the dot.
        // On light, the field quiets more once it is MADRE's colour: the black M must stand out on it.
        const alpha = (light ? 0.34 : 0.46) * (one.weight + (1 - one.weight) * tint) * appear * (1 - (light ? 0.6 : 0.35) * field);
        const was = smoke?.[fields.indexOf(one)];
        if (was && takeUp < 1) glow(was.x + (x - was.x) * takeUp, was.y + (y - was.y) * takeUp, was.r + (radius - was.r) * takeUp, mix(one.hue, brand, tint), was.alpha + (alpha - was.alpha) * takeUp);
        else glow(x, y, radius, mix(one.hue, brand, tint), alpha);
      }
      glow(meet.x, meet.y, reach * (0.3 + 0.12 * field), brand, (light ? 0.07 : 0.16) * field);
      // THE MEETING: one emerald flash over the whole stage, and a wave that crosses it.
      const flash = span(time, INTRO.impact, INTRO.impact + 1300);
      if (flash > 0 && flash < 1) {
        const spread = Math.max(width, height) * (0.25 + 0.75 * easeOut(flash));
        glow(meet.x, meet.y, spread, brand, (light ? 0.22 : 0.32) * Math.sin(Math.PI * Math.min(1, flash * 1.6)) * (1 - flash));
      }
      pen.globalCompositeOperation = 'source-over';
      const wave = span(time, INTRO.impact + 60, INTRO.impact + 1700);
      if (wave > 0 && wave < 1) {
        pen.strokeStyle = rgba(brand, (light ? 0.35 : 0.45) * (1 - easeOut(wave)));
        pen.lineWidth = 1.5 + 1.5 * (1 - wave);
        pen.beginPath();
        pen.arc(meet.x, meet.y, 20 + easeOut(wave) * Math.hypot(width, height) * 0.55, 0, Math.PI * 2);
        pen.stroke();
      }
      // Out of the field: the point, the heart drawn from it, its beat, the heart becoming the M.
      const seedIn = easeOut(span(time, INTRO.seed, INTRO.seed + 350));
      const seedOut = span(time, INTRO.draw + 80, INTRO.draw + 360);
      seed.setAttribute('r', String(Math.max(0, 8 * seedIn * (1 - seedOut) * (1 + 0.2 * Math.sin(time * 0.012) * (1 - seedOut)))));
      const drawn = easeInOut(span(time, INTRO.draw, INTRO.drawn));
      const morph = easeInOut(span(time, INTRO.morph, INTRO.morphed));
      const beatAt = span(time, INTRO.heart, INTRO.heart + 380);
      const swell = beatAt > 0 && beatAt < 1 ? 1 + 0.07 * Math.sin(beatAt * Math.PI) : 1;
      const whole = time >= INTRO.morphed;
      halves.forEach((half, index) => {
        half.setAttribute('d', index ? halfPath(HEART_R, M_R, morph) : halfPath(HEART_L, M_L, morph));
        half.style.strokeDashoffset = String(100 - 100 * drawn);
        half.style.opacity = drawn > 0.004 && !whole ? '1' : '0';
        half.setAttribute('transform', `translate(50 60) scale(${swell.toFixed(4)}) translate(-50 -60)`);
      });
      beat.style.opacity = whole ? '1' : '0';
      beat.style.strokeDashoffset = '0';
      // Then the M's dot lands, beating twice like a heart.
      const dotIn = easeOut(span(time, INTRO.dot, INTRO.dot + 380));
      const lub = (x) => 1 + 0.3 * Math.exp(-((x / 70) ** 2)) + 0.17 * Math.exp(-(((x - 220) / 70) ** 2));
      dot.style.opacity = String(dotIn);
      dot.style.transform = `scale(${(dotIn * lub(time - INTRO.dot - 260)).toFixed(4)})`;
      // The light along the M, once, left to right.
      const run = span(time, INTRO.sheen, INTRO.sheen + 900);
      sheen.style.opacity = run > 0 && run < 1 ? '1' : '0';
      band.setAttribute('x1', String(-30 + 150 * easeInOut(run)));
      band.setAttribute('x2', String(10 + 150 * easeInOut(run)));
      // The dot lands with a ring of its own.
      const ring = span(time, INTRO.dot + 120, INTRO.dot + 1100);
      if (ring > 0 && ring < 1) {
        const box = dot.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        pen.strokeStyle = rgba(brand, 0.6 * (1 - easeOut(ring)));
        pen.lineWidth = 1.5;
        pen.beginPath();
        pen.arc(box.left + box.width / 2 - stageBox.left, box.top + box.height / 2 - stageBox.top, box.width / 2 + easeOut(ring) * 46, 0, Math.PI * 2);
        pen.stroke();
      }
      const wordIn = easeExpo(span(time, INTRO.word, INTRO.word + 1200));
      word.style.opacity = String(Math.min(1, wordIn * 1.4));
      word.style.transform = `translateX(${(18 * (1 - wordIn)).toFixed(2)}px)`;
      word.style.filter = wordIn < 1 ? `blur(${(4 * (1 - wordIn)).toFixed(2)}px)` : '';
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
// M is traced in one stroke (the pulse until the rebranding, 2026-11-13), its dot beats once with a ring, and where the welcome writes MADRE the
// project writes its own name; then everything comes closer and fades, and the room is under it. About
// a second and a half; a click or any key goes straight on, and less motion skips it (app.js).
export function playProjectOpening(dialog, { name = '', skipLabel = 'Skip' } = {}) {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
  return new Promise((resolve) => {
    const stage = make('div', 'wl-intro po-stage');
    const mark = make('div', 'po-mark');
    mark.setAttribute('aria-hidden', 'true');
    const pulse = make('span', 'po-pulse');
    pulse.innerHTML = '<svg viewBox="8 13 86 82" aria-hidden="true"><path class="po-beat" d="M20 82V42C20 21 41 21 46 39L50 52L54 39C59 21 80 21 80 42V60" pathLength="100" fill="none" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round"/><circle class="po-ring" cx="80" cy="81" r="9.5" fill="none" stroke-width="2"/><circle class="po-dot" cx="80" cy="81" r="9.5"/></svg>'; // trusted: our own SVG string
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