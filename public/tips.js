// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// TIPS (2026-11-07): one small, solid label for every key that explains itself, in Home and in every
// project, instead of the browser's own (late, and drawn differently by each one). A key keeps
// saying what it says through `title`: when the pointer rests on it or the keyboard lands on it,
// the words move to `data-tip` for as long as the tip shows (so the browser's tip does not show
// too) and go back after. A key with no words of its own keeps them as its accessible name.
//
// One element for the whole page, under the key or over it when there is no room, never under the
// pointer's way, gone at the first press, scroll or key. Nothing shows on touch.

const SHOW_AFTER = 380;     // ms resting on a key before its tip shows
const AGAIN_WITHIN = 600;   // ms after one hides in which the next shows at once
const GAP = 7;

let tip = null;
let current = null;
let timer = null;
let hiddenAt = 0;

// A key that already shows its own label (an agent's sphere in the crew's column) says `data-tip-off`.
const keyOf = (target) => {
  const key = target?.closest?.('button[title], [role="button"][title], a[title], label[title], summary[title], [data-tip]') ?? null;
  return key && !key.closest('[data-tip-off]') ? key : null;
};

function ensure() {
  if (tip?.isConnected) return tip;
  tip = document.createElement('div');
  tip.className = 'madre-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

function words(key) {
  const said = key.getAttribute('title');
  if (said) {
    // The words leave `title` while the tip is up, and the key keeps a name if it had none.
    key.dataset.tip = said;
    key.removeAttribute('title');
    if (!key.getAttribute('aria-label') && !key.textContent.trim()) key.setAttribute('aria-label', said);
  }
  return key.dataset.tip ?? '';
}

function restore(key) {
  if (!key?.dataset?.tip) return;
  key.setAttribute('title', key.dataset.tip);
  delete key.dataset.tip;
}

function place(key) {
  const node = ensure();
  const box = key.getBoundingClientRect();
  node.hidden = false;
  node.classList.remove('shown');
  const own = node.getBoundingClientRect();
  const below = box.bottom + GAP + own.height <= window.innerHeight - 4;
  const top = below ? box.bottom + GAP : box.top - GAP - own.height;
  const left = Math.min(Math.max(4, box.left + box.width / 2 - own.width / 2), window.innerWidth - own.width - 4);
  node.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  node.dataset.side = below ? 'below' : 'above';
  requestAnimationFrame(() => node.classList.add('shown'));
}

function show(key) {
  const said = words(key);
  if (!said) return;
  current = key;
  const node = ensure();
  node.textContent = said;
  place(key);
}

export function hideTip() {
  clearTimeout(timer);
  timer = null;
  if (current) { restore(current); hiddenAt = performance.now(); }
  current = null;
  if (tip) { tip.classList.remove('shown'); tip.hidden = true; }
}

function arm(key) {
  if (key === current) return;
  hideTip();
  const soon = performance.now() - hiddenAt < AGAIN_WITHIN;
  timer = setTimeout(() => show(key), soon ? 0 : SHOW_AFTER);
}

export function installTips(root = globalThis.document) {
  // A page without a document or events (the tests' stand-in window) has no tips to show.
  if (!root || typeof root.addEventListener !== 'function' || typeof globalThis.window?.addEventListener !== 'function' || root.__madreTips) return;
  root.__madreTips = true;
  root.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const key = keyOf(event.target);
    if (key) arm(key);
  });
  root.addEventListener('pointerout', (event) => {
    const key = keyOf(event.target);
    if (!key || key.contains(event.relatedTarget)) return;
    hideTip();
  });
  root.addEventListener('focusin', (event) => {
    const key = keyOf(event.target);
    if (key && key.matches(':focus-visible')) arm(key);
  });
  root.addEventListener('focusout', () => hideTip());
  for (const type of ['pointerdown', 'keydown', 'wheel']) root.addEventListener(type, () => hideTip(), { capture: true, passive: true });
  window.addEventListener('scroll', () => hideTip(), { capture: true, passive: true });
  window.addEventListener('blur', () => hideTip());
}
