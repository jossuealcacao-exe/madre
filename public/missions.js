// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE FIRST WEEK'S MISSIONS (2026-11-11, the author: «missions instead of a tour»; the ideas in
// docs/private/TEXTOS-PARA-LA-GENTE.md). The tour told where things are; a person who is new learns
// by doing something real. Five missions, each a result the person sees, each teaching a piece of
// MADRE on the way:
//
//   page       a page made by an AI, opened beside the conversation       → asking, the permission to create
//   two-ais    the same question to two AIs                                → talking to each one with @
//   undo       a change, and Undo                                          → nothing breaks for good
//   local-ai   a question to the AI on the computer                         → @madre, no internet, no cost
//   market     anything from the Market: a module, a skill, a connector   → MADRE grows with what you add
//
// Done is never claimed by a key: each one is seen happening (app.js and market-view.js call
// `markMission` from the room's own events), kept in ~/.pulse/tour.json (src/tour.mjs, MISSIONS), the
// same for every project and port. The page hands in what only it can do (`host`): write a message in
// the box, which AIs are connected, open the Market or Settings.

import { t } from './i18n.js';
import { trazo } from './icons.js';

export const MISSIONS = ['page', 'two-ais', 'undo', 'local-ai', 'market'];

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const button = (className, text, onClick) => {
  const node = el('button', className, text);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  return node;
};

// What each one is, in the person's words: what to do, and what it teaches.
const CARDS = {
  page: { icon: 'globe', title: () => t('Make your first page'), teaches: () => t('Ask an AI for a page and watch it appear. You learn how to ask, and how to let it create files.') },
  'two-ais': { icon: 'agents', title: () => t('Ask two AIs the same thing'), teaches: () => t('Compare their answers side by side. You learn to talk to each one with @ and its name.') },
  undo: { icon: 'reset', title: () => t('Undo a change'), teaches: () => t('Ask for a change and take it back with Undo. You learn that nothing breaks for good.') },
  'local-ai': { icon: 'chip', title: () => t('Talk to the AI on your computer'), teaches: () => t('@madre answers with what your project remembers, with no internet and at no cost.') },
  market: { icon: 'spark', title: () => t('Get something from the Market'), teaches: () => t('A module, a skill or a connector, with one click. You learn that MADRE grows with what you add.') },
};

let state = { missions: {}, missionsHidden: null };
let listeners = new Set();
const done = (id) => Boolean(state.missions?.[id]);
export const missionsLeft = () => MISSIONS.filter((id) => !done(id)).length;
export const missionsState = () => state;
export const onMissions = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const told = () => { for (const fn of listeners) { try { fn(state); } catch { /* a listener that fails does not stop the others */ } } };

// What the tour file says now (the tour reads it for its own reasons; it hands it here too).
export function setMissions(tour) {
  if (!tour) return;
  state = { missions: tour.missions ?? {}, missionsHidden: tour.missionsHidden ?? null };
  told();
}

const post = (change) => fetch('/api/tour', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) })
  .then((response) => (response.ok ? response.json() : null)).catch(() => null);

// A mission seen happening. Said once: the first time is the one that counts, and a second call is
// nothing to write. The person hears it in one line, and the last one is celebrated.
export async function markMission(id, { quiet = false, say = null } = {}) {
  if (!MISSIONS.includes(id) || done(id)) return false;
  state = { ...state, missions: { ...state.missions, [id]: new Date().toISOString() } };
  told();
  const answer = await post({ mission: id });
  const kept = answer?.state ?? answer;
  if (kept?.missions) state = { missions: kept.missions, missionsHidden: kept.missionsHidden ?? null };
  if (!quiet && say) say(missionsLeft() ? t('Step done: {name}. {n} to go.', { name: CARDS[id].title(), n: missionsLeft() }) : t('You did all five. You know what matters in MADRE.'));
  told();
  return true;
}
export async function hideMissions(hidden = true) {
  state = { ...state, missionsHidden: hidden ? new Date().toISOString() : null };
  told();
  await post({ missionsHidden: hidden });
}

// THE SHEET: the five, what each teaches, and one key to start it where it can be done.
let open = null;
export function openMissions(host = {}) {
  if (open) { open.focus(); return open; }
  const dialog = el('dialog', 'missions');
  dialog.setAttribute('aria-labelledby', 'missions-title');
  const card = el('div', 'missions-card');
  dialog.append(card);
  const close = () => { dialog.close(); };
  dialog.addEventListener('close', () => { stop(); dialog.remove(); open = null; });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });

  const paint = () => {
    const left = missionsLeft();
    const head = el('header', 'missions-head');
    const title = el('h2', null, left ? t('Your first steps') : t('You did all five'));
    title.id = 'missions-title';
    const x = button('missions-x', null, close);
    x.innerHTML = trazo('close'); // trusted: our own SVG string
    x.setAttribute('aria-label', t('Close'));
    head.append(title, x);
    const lead = el('p', 'missions-lead', left
      ? t('Five things to get to know MADRE by doing something real. Each one takes a couple of minutes, and you can do them in any order.')
      : t('You know what matters in MADRE: asking, letting it create, comparing AIs, undoing and adding what you need. From here on, it is yours.'));
    const bar = el('div', 'missions-bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(MISSIONS.length));
    bar.setAttribute('aria-valuenow', String(MISSIONS.length - left));
    // How far, from the left, whichever ones were done.
    for (let at = 0; at < MISSIONS.length; at += 1) bar.append(el('i', at < MISSIONS.length - left ? 'on' : null));
    const list = el('ol', 'missions-list');
    for (const id of MISSIONS) {
      const one = CARDS[id];
      const item = el('li', `mission${done(id) ? ' done' : ''}`);
      const mark = el('span', 'mission-icon');
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = trazo(done(id) ? 'check' : one.icon); // trusted: our own SVG string
      const words = el('div', 'mission-words');
      words.append(el('b', null, one.title()), el('small', null, one.teaches()));
      item.append(mark, words);
      if (done(id)) item.append(el('span', 'mission-done', t('Done')));
      else {
        const action = actionFor(id, host);
        if (action) item.append(button('mission-go', action.label, () => { close(); action.run(); }));
        if (action?.note) words.append(el('small', 'mission-note', action.note));
      }
      list.append(item);
    }
    const foot = el('footer', 'missions-foot');
    if (host.openTour) foot.append(button('missions-link', t('See where everything is'), () => { close(); host.openTour(); }));
    foot.append(el('span', 'missions-grow'));
    if (left) foot.append(button('missions-link quiet', t('Hide the first steps'), () => { void hideMissions(true); close(); }));
    else foot.append(button('missions-ok', t('Got it'), () => { void hideMissions(true); close(); }));
    card.replaceChildren(head, lead, bar, list, foot);
  };
  const stop = onMissions(() => { if (dialog.isConnected) paint(); });
  paint();
  document.body.append(dialog);
  dialog.showModal();
  open = dialog;
  return dialog;
}

// What the key of each mission does here. A project writes the message in its own box; Home opens a
// project with it written (host.draft decides). With what a mission needs missing — a second AI, the
// AI on the computer — the key goes where it is set up instead, and says so.
function actionFor(id, host) {
  const agents = host.agents?.() ?? [];
  const write = (text) => () => host.draft?.(text);
  if (id === 'page') return { label: t('Do it'), run: write(t('#2 Make me a simple page with a title, a short welcome and a button. Explain how to open it.')) };
  if (id === 'two-ais') {
    const two = agents.filter((agent) => agent !== 'madre').slice(0, 2);
    if (two.length < 2) return { label: t('Connect another AI'), run: () => host.settings?.('agents'), note: t('You need two AIs connected.') };
    return { label: t('Do it'), run: write(t('@{a} @{b} What would you improve first in this project? Your own idea, in three lines at most.', { a: two[0], b: two[1] })) };
  }
  if (id === 'undo') return { label: t('Do it'), run: write(t('#2 Create a file called note.txt that says hello. Then I will undo it.')), note: t('When it answers, press Undo on its reply.') };
  if (id === 'local-ai') {
    if (!host.localReady?.()) return { label: t('Get it ready'), run: () => host.settings?.('local'), note: t('First the AI on your computer has to be there.') };
    return { label: t('Do it'), run: write(t('@madre What do you remember about this project?')) };
  }
  if (id === 'market') return { label: t('Open the Market'), run: () => host.market?.('shop') };
  return null;
}
