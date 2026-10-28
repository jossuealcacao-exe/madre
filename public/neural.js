// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Neural mode (1.0.3): the Memory map and the Projects map drawn as the neurons of a brain
// (nostromo-engine.js, drawNeural; macroverso.js). What both maps share lives here: the key's
// drawing, the watch over whether this machine is giving the map the frames it needs, and the
// invitation to try the mode when it is not — an invitation to a way of seeing, never a warning:
// the person chooses when to use each.
import { t } from './i18n.js';
import { trazo } from './icons.js';

// A neuron: its body, four dendrites, a bead at the end of each. Open, the body fills.
export const NEURAL_ICON = trazo('neural');

// HOW TO MOVE ROUND A MAP (2026-10-28): the gestures as keys, in this computer's own words — ⇧ on a
// Mac and Shift elsewhere, a trackpad's pinch on a Mac —, read from the system, never asked. In
// place of the long line of small print the maps carried under them.
export const mapSystem = () => {
  const said = String(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '').toLowerCase();
  return said.includes('mac') ? 'mac' : said.includes('win') ? 'windows' : 'other';
};
export function mapKeys(which = 'memory') {
  const mac = mapSystem() === 'mac';
  const shift = mac ? '⇧' : 'Shift';
  const closer = mac ? t('Pinch or wheel') : t('Wheel');
  const steps = which === 'projects'
    ? [[[t('Drag')], t('pan')], [[closer], t('come closer')], [[t('Click')], t('look at a project')], [[t('Drag a project')], t('onto another to connect them')], [['←', '→'], t('from one to the next')], [['Esc'], t('back')]]
    : [[[t('Drag')], t('turn')], [[shift, t('Drag')], t('pan')], [[closer], t('come closer')], [[t('Click')], t('read a memory')]];
  const line = document.createElement('span');
  line.className = 'map-keys';
  line.dataset.system = mapSystem();
  for (const [keys, words] of steps) {
    const step = document.createElement('span');
    step.className = 'map-key';
    keys.forEach((key, index) => {
      if (index && keys[0] !== '←') { const plus = document.createElement('i'); plus.textContent = '+'; step.append(plus); }
      const cap = document.createElement('kbd');
      cap.textContent = key;
      step.append(cap);
    });
    const said = document.createElement('span');
    said.textContent = words;
    step.append(said);
    line.append(step);
  }
  return line;
}

const KEY = 'pulse.neural';
export function neuralChosen() {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}
export function rememberNeural(on) {
  try { if (on) localStorage.setItem(KEY, 'on'); else localStorage.removeItem(KEY); } catch { /* this page only */ }
}

// The key in a map's head: its drawing and its word, pressed while the mode is on.
export function neuralKey(button) {
  button.innerHTML = `${NEURAL_ICON}<span>${t('Neural')}</span>`; // trusted: our own SVG string and our own word
  button.title = t('Neural mode · your memories as the neurons of a brain: only what travels lights up');
  return button;
}
export function paintNeuralKey(button, on) {
  button?.setAttribute('aria-pressed', String(Boolean(on)));
  button?.classList.remove('invite');
}

// Whether the map is getting its frames: the work one frame takes and the time between frames,
// read as a median over a couple of seconds once the map has settled. A page in the background is
// not counted. Told once; `reset` starts the watch again (the map was opened again).
export function createStrain({ onStrain, settle = 2500, sample = 120, work = 12, gap = 30 } = {}) {
  let since = 0;
  let last = 0;
  let told = false;
  const works = [];
  const gaps = [];
  const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
  const watch = {
    frame(spent, now) {
      if (told || globalThis.document?.hidden) { last = 0; return; }
      if (!since) since = now;
      if (last) gaps.push(now - last);
      last = now;
      works.push(spent);
      if (now - since < settle) { works.length = 0; gaps.length = 0; return; }
      while (works.length > sample) works.shift();
      while (gaps.length > sample) gaps.shift();
      if (works.length < sample) return;
      const heap = globalThis.performance?.memory;
      const full = heap ? heap.usedJSHeapSize / heap.jsHeapSizeLimit > 0.85 : false;
      if (median(works) > work || median(gaps) > gap || full) { told = true; onStrain(); }
    },
    reset() { since = 0; last = 0; told = false; works.length = 0; gaps.length = 0; },
  };
  return watch;
}

// The invitation: the key breathes in the accent and a small card under it says what the mode is,
// with the way to try it and the way to leave it be. Once a session for each map.
export function inviteNeural({ key, host, map, onTry }) {
  if (!key || !host || key.getAttribute('aria-pressed') === 'true') return null;
  const seen = `pulse.neural.invited.${map}`;
  try { if (sessionStorage.getItem(seen)) return null; sessionStorage.setItem(seen, '1'); } catch { /* shown once on this page */ }
  return keyCard({ key, host, title: t('Try neural mode'), line: t('The same network, as neurons: only the paths something travels light up.'), go: t('Try it'), later: t('Not now'), onGo: onTry });
}

// The two drawings, said once (2026-10-28): the first times a map opens, the same card under the
// same key says the map can be planets or neurons, with the way to switch right there. Who calls it
// keeps that it was said (the tour, src/tour.mjs `map-views`), so it is said once for every map.
export function tellViews({ key, host, neural = false, onSwitch }) {
  if (!key || !host || host.querySelector('.neural-invite')) return null;
  return keyCard({
    key, host,
    title: t('Two ways to see it'),
    line: t('Planets or neurons: the same map, drawn two ways. Switch with this key whenever you want.'),
    go: neural ? t('See it as planets') : t('See it as neurons'),
    later: t('Got it'),
    onGo: onSwitch,
  });
}

function keyCard({ key, host, title: said, line: lead, go: goes, later: leaves, onGo }) {
  key.classList.add('invite');
  const card = document.createElement('div');
  card.className = 'neural-invite';
  card.setAttribute('role', 'status');
  const mark = document.createElement('span');
  mark.className = 'neural-invite-mark';
  mark.innerHTML = NEURAL_ICON; // trusted: our own SVG string
  const words = document.createElement('div');
  words.className = 'neural-invite-words';
  const title = document.createElement('b');
  title.textContent = said;
  const line = document.createElement('span');
  line.textContent = lead;
  words.append(title, line);
  const acts = document.createElement('div');
  acts.className = 'neural-invite-acts';
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'neural-invite-go';
  go.textContent = goes;
  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'neural-invite-later';
  later.textContent = leaves;
  acts.append(go, later);
  card.append(mark, words, acts);
  const close = () => { card.remove(); key.classList.remove('invite'); };
  go.addEventListener('click', () => { close(); onGo(); });
  later.addEventListener('click', close);
  // Pressing the key itself is the answer too.
  key.addEventListener('click', close, { once: true });
  host.append(card);
  // Under the key, never past the edge of what holds it.
  const place = () => {
    const box = host.getBoundingClientRect();
    const at = key.getBoundingClientRect();
    const width = card.offsetWidth || 320;
    card.style.top = `${Math.round(at.bottom - box.top + 10)}px`;
    card.style.left = `${Math.round(Math.max(12, Math.min(box.width - width - 12, at.right - box.left - width)))}px`;
  };
  place();
  requestAnimationFrame?.(place);
  setTimeout(() => { if (card.isConnected) close(); }, 14000);
  return card;
}
