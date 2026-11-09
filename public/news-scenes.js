// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The moving pictures of «what's new» (1.1.3).
//
// Each card shows the thing itself, small: MADRE's own pieces (a card, a dock of agents, a window
// with its hint) acted out in a few beats, the way a phone shows you a new feature. Not a
// screenshot, which ages with every change of the interface, and not abstract points, which said
// nothing to the author (2026-11-08). The agents wear their official marks, untouched (brands.js).
//
// A scene is a run of beats: each adds a class to the stage (`b1`, `b2`…) and CSS moves what that
// beat moves (styles.css, `.ns`). At the end the stage fades, the beats are taken back and it
// starts again. With reduced motion it shows the last beat and stays still.
//
// The few words a scene says are data in both languages, chosen with pick() like the notes are.

import { brandOf } from './brands.js';
import { trazo } from './icons.js';
import { pick } from './i18n.js';

const WORDS = {
  skill: { es: 'Así cotizo', en: 'How I quote' },
  skillTag: { es: 'Habilidad', en: 'Skill' },
  joined: { es: 'Conectado con tu cuenta', en: 'Connected with your account' },
  can: [
    { es: 'Lee y escribe', en: 'Reads and writes' },
    { es: 'Busca en internet', en: 'Searches the web' },
    { es: 'Hace imágenes', en: 'Makes images' },
  ],
  hintTitle: { es: 'Plan actual', en: 'Running now' },
  hintLine: { es: 'Lo que hace cada IA, en vivo.', en: 'What each AI is doing, live.' },
  hours: { es: '5 h', en: '5 h' },
  week: { es: '7 días', en: '7 days' },
};

const node = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// An agent in its own colours with its official mark (brands.js), as the room draws it.
function face(id, cls = 'ns-face') {
  const brand = brandOf(id);
  const n = node('span', cls);
  n.style.setProperty('--ns-brand', brand.gradient ?? brand.color);
  n.style.setProperty('--ns-ink', brand.ink ?? '#111');
  n.innerHTML = brand.mark(); // trusted: our own SVG strings from brands.js
  return n;
}

const icon = (name, cls) => {
  const n = node('span', cls);
  n.innerHTML = trazo(name); // trusted: our own SVG strings from icons.js
  return n;
};

const SCENES = {
  // «Teach it once how you work»: a skill is written, then each AI picks it up.
  skills(stage) {
    const doc = node('div', 'ns-doc');
    const head = node('div', 'ns-doc-head');
    head.append(icon('book', 'ns-doc-icon'), node('b', null, pick(WORDS.skill)));
    doc.append(head);
    for (let i = 0; i < 3; i += 1) {
      const line = node('i', 'ns-line');
      line.style.setProperty('--i', i);
      doc.append(line);
    }
    doc.append(node('span', 'ns-tag', pick(WORDS.skillTag)));
    const agents = node('div', 'ns-agents');
    ['claude', 'codex', 'grok'].forEach((id, i) => {
      const row = node('div', 'ns-row');
      row.style.setProperty('--i', i);
      const pill = node('span', 'ns-pill');
      pill.append(node('span', null, pick(WORDS.skill)), icon('check', 'ns-check'));
      row.append(face(id), pill);
      agents.append(row);
    });
    stage.append(doc, agents);
    return [400, 1500, 2700, 3700];
  },

  // «Grok, now among your AIs»: it joins the dock, bounces once and says what it can do.
  newagent(stage) {
    const dock = node('div', 'ns-dock');
    for (const id of ['codex', 'claude', 'gemini', 'opencode']) dock.append(face(id, 'ns-app'));
    dock.append(face('grok', 'ns-app ns-new'));
    const status = node('div', 'ns-status');
    status.append(node('i', 'ns-dot'), node('span', null, pick(WORDS.joined)));
    const can = node('div', 'ns-can');
    WORDS.can.forEach((word, i) => {
      const chip = node('span', 'ns-chip', pick(word));
      chip.style.setProperty('--i', i);
      can.append(chip);
    });
    stage.append(dock, status, can);
    return [700, 1500, 2300, 2900];
  },

  // «MADRE explains each thing»: a first click opens its note, and the AI shows its plan in bars.
  tips(stage) {
    const win = node('div', 'ns-win');
    const bar = node('div', 'ns-bar');
    const brand = icon('mother', 'ns-brand');
    const keys = node('div', 'ns-keys');
    const target = icon('running', 'ns-key ns-target');
    keys.append(icon('attach', 'ns-key'), target, icon('agents', 'ns-key'));
    bar.append(brand, keys);
    const body = node('div', 'ns-body');
    const plan = node('div', 'ns-plan');
    const meters = node('div', 'ns-meters');
    [[WORDS.hours, 0.42], [WORDS.week, 0.18]].forEach(([label, share], i) => {
      const meter = node('div', 'ns-meter');
      meter.style.setProperty('--share', share);
      meter.style.setProperty('--i', i);
      meter.append(node('span', null, pick(label)), node('i'));
      meters.append(meter);
    });
    plan.append(face('claude'), meters);
    body.append(plan);
    const hint = node('div', 'ns-hint');
    hint.append(node('b', null, pick(WORDS.hintTitle)), node('span', null, pick(WORDS.hintLine)));
    // The arrow is drawn by CSS (styles.css, .ns-pointer::before): icons come from icons.js only.
    const pointer = node('span', 'ns-pointer');
    win.append(bar, body, hint);
    stage.append(win, pointer);
    return [500, 1500, 1800, 3700];
  },
};

export const NEWS_SCENES = Object.keys(SCENES);

// One stage. `stop()` clears its timers when the sheet closes.
export function createNewsScene(id) {
  const stage = node('div', `ns ns-${id}`);
  stage.setAttribute('aria-hidden', 'true');
  const beats = SCENES[id]?.(stage) ?? [];
  const timers = new Set();
  const later = (ms, fn) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
  const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const HOLD = 3200;
  // Measured, because the frame's size decides where things are: where the skill card starts, where
  // the pointer goes and where the note's arrow points.
  const aim = () => {
    // The skill card starts in the middle of the frame: as far right as half of what comes beside it.
    const agents = stage.querySelector('.ns-agents');
    if (agents?.offsetWidth) stage.style.setProperty('--ns-doc-shift', `${(agents.offsetWidth + parseFloat(getComputedStyle(stage).columnGap || 0)) / 2}px`);
    const pointer = stage.querySelector('.ns-pointer');
    const target = stage.querySelector('.ns-target');
    const hint = stage.querySelector('.ns-hint');
    if (!pointer || !target) return;
    const from = pointer.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!to.width) return;
    stage.style.setProperty('--ns-to-x', `${to.left + to.width * 0.55 - from.left}px`);
    stage.style.setProperty('--ns-to-y', `${to.top + to.height * 0.55 - from.top}px`);
    if (hint) {
      const box = hint.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(hint).fontSize) || 10;
      stage.style.setProperty('--ns-arrow', `${box.right - (to.left + to.width / 2) - 0.35 * em}px`);
    }
  };
  // Measured just before the first beat, not at creation: the stage is put on the page after it is
  // made, and while nothing shows yet a change of place is not seen.
  const run = () => {
    later(Math.max(0, (beats[0] ?? 0) - 200), aim);
    beats.forEach((ms, i) => later(ms, () => stage.classList.add(`b${i + 1}`)));
    const end = (beats.at(-1) ?? 0) + HOLD;
    later(end, () => stage.classList.add('out'));
    later(end + 420, () => {
      stage.classList.add('reset');
      beats.forEach((_, i) => stage.classList.remove(`b${i + 1}`));
      void stage.offsetWidth; // the reset lands before the stage comes back
      stage.classList.remove('reset', 'out');
      run();
    });
  };
  if (still) beats.forEach((_, i) => stage.classList.add(`b${i + 1}`));
  else run();
  return {
    node: stage,
    stop() { for (const timer of timers) clearTimeout(timer); timers.clear(); },
  };
}
