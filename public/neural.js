// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Neural mode (1.0.3): the Memory map and the Projects map drawn as the neurons of a brain
// (nostromo-engine.js, drawNeural; macroverso.js). What both maps share lives here: the key's
// drawing, the watch over whether this machine is giving the map the frames it needs, and the
// invitation to try the mode when it is not — an invitation to a way of seeing, never a warning:
// the person chooses when to use each.
import { t } from './i18n.js';

// A neuron: its body, four dendrites, a bead at the end of each. Open, the body fills.
export const NEURAL_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle class="ic-f" cx="10" cy="10" r="2.7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 7.3V4M12.4 11.3l3 2.4M7.6 11.3l-3 2.4M12.5 8.7l2.9-1.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="3.4" r="1.15" fill="currentColor"/><circle cx="15.9" cy="14.1" r="1.15" fill="currentColor"/><circle cx="4.1" cy="14.1" r="1.15" fill="currentColor"/><circle cx="15.9" cy="6.5" r="1.15" fill="currentColor"/></svg>';

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
  title.textContent = t('Try neural mode');
  const line = document.createElement('span');
  line.textContent = t('The same network, as neurons: only the paths something travels light up.');
  words.append(title, line);
  const acts = document.createElement('div');
  acts.className = 'neural-invite-acts';
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'neural-invite-go';
  go.textContent = t('Try it');
  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'neural-invite-later';
  later.textContent = t('Not now');
  acts.append(go, later);
  card.append(mark, words, acts);
  const close = () => { card.remove(); key.classList.remove('invite'); };
  go.addEventListener('click', () => { close(); onTry(); });
  later.addEventListener('click', close);
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
