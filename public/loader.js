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
