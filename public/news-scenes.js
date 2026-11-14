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
  // The app (2026-11-10, the choice after an update on Home).
  tab: { es: 'MADRE', en: 'MADRE' },
  address: { es: '127.0.0.1:4317', en: '127.0.0.1:4317' },
  finished: { es: 'Claude terminó', en: 'Claude finished' },
  finishedLine: { es: 'Tu página ya está lista.', en: 'Your page is ready.' },
  // What changed, and what an AI makes opening by itself (1.1.4).
  changedTitle: { es: 'Qué cambió', en: 'What changed' },
  changedLine: { es: 'Agregué tu botón de WhatsApp', en: 'I added your WhatsApp button' },
  view: { es: 'Ver', en: 'View' },
  undo: { es: 'Deshacer', en: 'Undo' },
  pageButton: { es: 'Escríbenos', en: 'Message us' },
  // First steps (1.1.4): three of the five, checked one after another.
  stepsTitle: { es: 'Primeros pasos', en: 'First steps' },
  steps: [
    { es: 'Crea tu primera página', en: 'Make your first page' },
    { es: 'Pregúntale a dos IAs', en: 'Ask two AIs' },
    { es: 'Deshaz un cambio', en: 'Undo a change' },
  ],
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

// «MADRE as an app» (2026-11-10): MADRE in a browser window loses the browser around it and becomes an
// app of the person's own computer, then drops into where that computer keeps its apps, and an AI's
// notice arrives where that computer shows them. Each desktop as it is (`os`):
//   mac      the three lights on the left, the Dock at the bottom, notices top right;
//   windows  minimise, maximise and close on the right, the taskbar along the bottom, notices bottom
//            right, over it;
//   linux    one close key on the right, a bar along the top, the dock on the left, notices top centre.
// Used by the choice Home offers after an update (salas-mac.js, offerApp).
SCENES.desktopapp = (stage, { os = 'mac' } = {}) => {
  stage.classList.add(`os-${os}`);
  const win = node('div', 'ns-aw');
  const chrome = node('div', 'ns-aw-chrome');
  const tab = node('span', 'ns-aw-tab');
  tab.append(node('i', 'ns-aw-fav'), node('span', null, pick(WORDS.tab)));
  chrome.append(tab, node('span', 'ns-aw-url', pick(WORDS.address)));
  // The window's own keys: the Mac's lights, or Windows' and Linux's keys on the right.
  const keys = node('div', `ns-aw-keys ${os}`);
  const count = os === 'mac' ? 3 : os === 'windows' ? 3 : 1;
  for (let i = 0; i < count; i += 1) keys.append(node('i'));
  const body = node('div', 'ns-aw-body');
  const side = node('div', 'ns-aw-side');
  for (let i = 0; i < 4; i += 1) side.append(node('i'));
  const chat = node('div', 'ns-aw-chat');
  chat.append(node('i', 'ns-aw-msg mine'), node('i', 'ns-aw-msg'), node('i', 'ns-aw-msg short'), node('i', 'ns-aw-box'));
  body.append(side, chat);
  win.append(chrome, keys, body);
  // Where that computer keeps its apps: the Dock, the taskbar, the dock on the side.
  const shelf = node('div', `ns-aw-dock ${os}`);
  const apps = os === 'windows' ? ['search', 'folder', 'globe'] : ['folder', 'globe', 'chat'];
  for (const name of apps) shelf.append(icon(name, 'ns-aw-app'));
  const madre = node('img', 'ns-aw-madre');
  madre.src = '/assets/brand/madre-app.svg';
  madre.alt = '';
  shelf.append(madre);
  if (os === 'linux') { const top = node('div', 'ns-aw-topbar'); top.append(node('span', null, '10:24')); stage.append(top); }
  const toast = node('div', 'ns-aw-toast');
  const words = node('span', 'ns-aw-toast-words');
  words.append(node('b', null, pick(WORDS.finished)), node('span', null, pick(WORDS.finishedLine)));
  toast.append(face('claude'), words);
  stage.append(win, shelf, toast);
  return [300, 1400, 2500, 3500];
};

// «You see what changed» (1.1.4): an AI answers, the card of what it changed comes under the answer
// with «View» and «Undo», and the page it made opens beside, by itself.
SCENES.changes = (stage) => {
  const left = node('div', 'ns-ans');
  const msg = node('div', 'ns-ans-msg');
  const lines = node('div', 'ns-ans-lines');
  for (let i = 0; i < 2; i += 1) lines.append(node('i'));
  msg.append(face('claude'), lines);
  const card = node('div', 'ns-cc');
  const head = node('div', 'ns-cc-head');
  head.append(icon('pencil', 'ns-cc-icon'), node('b', null, pick(WORDS.changedTitle)));
  const keys = node('div', 'ns-cc-keys');
  keys.append(node('span', 'ns-cc-key view', pick(WORDS.view)), node('span', 'ns-cc-key', pick(WORDS.undo)));
  card.append(head, node('span', 'ns-cc-line', pick(WORDS.changedLine)), keys);
  left.append(msg, card);
  const page = node('div', 'ns-page');
  page.append(node('i', 'ns-page-bar'), node('i', 'ns-page-hero'), node('i', 'ns-page-line'), node('i', 'ns-page-line short'));
  const cta = node('span', 'ns-page-btn');
  cta.append(icon('chat', 'ns-page-btn-icon'), node('span', null, pick(WORDS.pageButton)));
  page.append(cta);
  stage.append(left, page);
  return [300, 1200, 2200, 2900];
};

// «Learn by doing» (1.1.4): First steps, three of its five checked one after another, the bar filling.
SCENES.missions = (stage) => {
  const box = node('div', 'ns-steps');
  const head = node('div', 'ns-steps-head');
  head.append(node('b', null, pick(WORDS.stepsTitle)), node('span', 'ns-steps-count'));
  const bar = node('div', 'ns-progress');
  bar.append(node('i'));
  const list = node('div', 'ns-step-list');
  WORDS.steps.forEach((word, i) => {
    const row = node('div', 'ns-step');
    row.style.setProperty('--i', i);
    row.append(icon('check', 'ns-step-box'), node('span', null, pick(word)));
    list.append(row);
  });
  box.append(head, bar, list);
  stage.append(box);
  return [300, 1200, 2000, 2800];
};

export const NEWS_SCENES = Object.keys(SCENES);

// One stage. `stop()` clears its timers when the sheet closes. `options` go to the scene (`os`).
export function createNewsScene(id, options = {}) {
  const stage = node('div', `ns ns-${id}`);
  stage.setAttribute('aria-hidden', 'true');
  // The desktop this page is on, for the scene of the app (1.1.4: the news board does not say it).
  const desk = /Mac/i.test(globalThis.navigator?.platform ?? '') ? 'mac' : /Win/i.test(globalThis.navigator?.platform ?? '') ? 'windows' : /Linux|X11/i.test(globalThis.navigator?.platform ?? '') ? 'linux' : 'mac';
  const beats = SCENES[id]?.(stage, { os: desk, ...options }) ?? [];
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
