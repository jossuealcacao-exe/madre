// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Turning MADRE off from the page (2026-10-16): one key in the top bar of Home and of every
// project, a question before anything happens, and then the server closes every open project and
// itself the clean way (src/server.mjs, /api/madre/shutdown). What is left on screen says MADRE is
// off, so a page that no longer answers is never mistaken for one that broke.
import { t } from './i18n.js';
import { trazo } from './icons.js';

export const POWER_ICON = trazo('power');

const node = (tag, className, text) => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text !== undefined && text !== null) made.textContent = text;
  return made;
};

export const RESTART_ICON = trazo('refresh');
const SLEEP_ICON = trazo('out');

// The key itself, in the classes of the bar it sits in. Since 2026-10-28 it holds restarting too: a
// press opens two choices, restart and turn off, and the bar has no reload key of its own.
// In a project (`project: true`) it also holds closing that project alone (2026-10-28): it sleeps, Home
// and the other projects stay. Not in the Coordinator, which lives in Home's own process.
export function powerKey(className, { project = false } = {}) {
  const key = node('button', `${className} power-key`);
  key.type = 'button';
  key.innerHTML = POWER_ICON; // trusted: our own SVG string
  labelPowerKey(key);
  key.setAttribute('aria-haspopup', 'menu');
  key.addEventListener('click', () => openPowerMenu(key));
  if (project) asProjectKey(key);
  return key;
}
// A key that opens these choices in a project's page offers closing that project too.
export function asProjectKey(key) {
  void whereAmI().then((place) => { if (place?.here && place.here.id !== place.home?.id) key.dataset.project = '1'; });
  return key;
}
// This page's project and Home, as Home knows them (/api/salas): the address to go back to.
async function whereAmI() {
  try {
    const data = await fetch('/api/salas', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null));
    if (!data) return null;
    return { here: (data.rooms ?? []).find((room) => room.here) ?? null, home: (data.rooms ?? []).find((room) => room.id === data.salas) ?? null };
  } catch { return null; }
}
export function labelPowerKey(key) {
  key.title = t('Restart or turn off MADRE');
  key.setAttribute('aria-label', t('Restart or turn off MADRE'));
}

// The two choices, beside the key that opened them: above it when the key is low on the screen (the
// sidebar's foot), under it when it is high (a bar). Escape, a press elsewhere or a choice closes them.
let powerMenu = null;
export function openPowerMenu(anchor) {
  // A second press on the same key puts the choices away.
  const was = powerMenu;
  if (was) { was.close(); if (was.anchor === anchor) return; }
  const card = node('div', 'power-menu');
  card.setAttribute('role', 'menu');
  card.setAttribute('aria-label', t('Restart or turn off MADRE'));
  const close = () => {
    card.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', keys, true);
    anchor?.setAttribute?.('aria-expanded', 'false');
    if (powerMenu?.card === card) powerMenu = null;
  };
  const item = (icon, words, about, run, danger = false) => {
    const one = node('button', `power-item${danger ? ' danger' : ''}`);
    one.type = 'button';
    one.setAttribute('role', 'menuitem');
    one.innerHTML = icon; // trusted: our own SVG strings
    const said = node('span', 'power-words');
    said.append(node('b', null, words), node('small', null, about));
    one.append(said);
    one.addEventListener('click', () => { close(); run(); });
    return one;
  };
  const items = [
    ...(anchor?.dataset?.project === '1' ? [item(SLEEP_ICON, t('Close this project'), t('It sleeps; Home and your other projects stay open'), () => void askCloseProject())] : []),
    item(RESTART_ICON, t('Restart MADRE'), t('Home and every open project start again'), () => void askRestart()),
    item(POWER_ICON, t('Turn MADRE off'), t('Home and every open project close'), () => void askPowerOff(), true),
  ];
  card.append(...items);
  document.body.append(card);
  const at = anchor.getBoundingClientRect();
  const box = card.getBoundingClientRect();
  const low = at.top > window.innerHeight / 2;
  const top = low ? at.top - box.height - 6 : at.bottom + 6;
  const left = Math.max(8, Math.min(window.innerWidth - box.width - 8, at.left + at.width / 2 > window.innerWidth / 2 ? at.right - box.width : at.left));
  card.style.top = `${Math.round(Math.max(8, top))}px`;
  card.style.left = `${Math.round(left)}px`;
  const outside = (event) => { if (!card.contains(event.target) && !anchor.contains(event.target)) close(); };
  const keys = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); anchor.focus?.(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const at = items.indexOf(document.activeElement);
    items[(at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
  };
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', keys, true);
  anchor.setAttribute?.('aria-expanded', 'true');
  powerMenu = { card, anchor, close };
  items[0]?.focus();
}

// How many projects are open besides this page, to say what closes.
async function openProjects() {
  try {
    const data = await fetch('/api/salas', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null));
    return (data?.rooms ?? []).filter((room) => room.open && room.id !== data.salas).length;
  } catch { return null; }
}

export async function askPowerOff() {
  if (document.querySelector('dialog.power-ask')) return;
  const open = await openProjects();
  const dialog = node('dialog', 'room-ask power-ask');
  dialog.setAttribute('aria-labelledby', 'power-ask-title');
  const card = node('div', 'room-ask-card');
  const icon = node('span', 'room-ask-icon');
  icon.innerHTML = POWER_ICON; // trusted: our own SVG string
  const title = node('h2', 'room-ask-title', t('Turn MADRE off?'));
  title.id = 'power-ask-title';
  const what = open === null ? t('Home and every open project close.') : open === 0 ? t('Home closes.') : open === 1 ? t('Home and the one open project close.') : t('Home and the {n} open projects close.', { n: open });
  const body = node('p', 'room-ask-body', `${what} ${t('If an agent is working, it stops and the conversation says so; everything else is kept as it is.')}`);
  const again = node('p', 'key-safe', t('To use it again, open MADRE the way you always do. Your projects, conversations and settings will be there.'));
  const reply = node('p', 'key-reply');
  reply.setAttribute('aria-live', 'polite');
  const actions = node('div', 'room-ask-actions');
  const cancel = node('button', 'room-ask-choice', t('Cancel'));
  cancel.type = 'button';
  const go = node('button', 'room-ask-choice danger', t('Turn off'));
  go.type = 'button';
  actions.append(cancel, go);
  card.append(icon, title, body, again, reply, actions);
  dialog.append(card);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  cancel.addEventListener('click', () => dialog.close());
  go.addEventListener('click', async () => {
    go.disabled = true;
    cancel.disabled = true;
    go.textContent = t('Turning off…');
    reply.textContent = '';
    let answer = null;
    try {
      const response = await fetch('/api/madre/shutdown', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      answer = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(answer.error ?? `HTTP ${response.status}`);
    } catch (error) {
      reply.textContent = error.message;
      go.disabled = false;
      cancel.disabled = false;
      go.textContent = t('Turn off');
      return;
    }
    dialog.close();
    showOff(answer?.stuck ?? []);
  });
  dialog.showModal();
  cancel.focus();
}

// RESTARTING MADRE (2026-10-28): the same question, then the server — Home and every open project —
// closes and comes back on the same addresses (src/server.mjs, /api/madre/restart). The page says
// so while it waits, and loads again by itself the moment MADRE answers.
export async function askRestart() {
  if (document.querySelector('dialog.power-ask')) return;
  const open = await openProjects();
  const dialog = node('dialog', 'room-ask power-ask');
  dialog.setAttribute('aria-labelledby', 'restart-ask-title');
  const card = node('div', 'room-ask-card');
  const icon = node('span', 'room-ask-icon');
  icon.innerHTML = RESTART_ICON; // trusted: our own SVG string
  const title = node('h2', 'room-ask-title', t('Restart MADRE?'));
  title.id = 'restart-ask-title';
  const what = open === null ? t('Home and every open project close and open again.') : open === 0 ? t('Home closes and opens again.') : open === 1 ? t('Home and the one open project close and open again.') : t('Home and the {n} open projects close and open again.', { n: open });
  const body = node('p', 'room-ask-body', `${what} ${t('If an agent is working, it stops and the conversation says so; everything else is kept as it is.')}`);
  const again = node('p', 'key-safe', t('It takes a few seconds. Every page you have open comes back on its own.'));
  const reply = node('p', 'key-reply');
  reply.setAttribute('aria-live', 'polite');
  const actions = node('div', 'room-ask-actions');
  const cancel = node('button', 'room-ask-choice', t('Cancel'));
  cancel.type = 'button';
  const go = node('button', 'room-ask-choice primary', t('Restart'));
  go.type = 'button';
  actions.append(cancel, go);
  card.append(icon, title, body, again, reply, actions);
  dialog.append(card);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  cancel.addEventListener('click', () => dialog.close());
  go.addEventListener('click', async () => {
    go.disabled = true;
    cancel.disabled = true;
    go.textContent = t('Restarting…');
    reply.textContent = '';
    try {
      const response = await fetch('/api/madre/restart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(answer.error ?? `HTTP ${response.status}`);
    } catch (error) {
      reply.textContent = error.message;
      go.disabled = false;
      cancel.disabled = false;
      go.textContent = t('Restart');
      return;
    }
    dialog.close();
    await waitForRestart();
  });
  dialog.showModal();
  go.focus();
}
// While MADRE is away: a screen that says so, until this page's own server answers again — first
// gone, then back — and the page loads. A minute at most; after it, the screen says what to do.
async function waitForRestart() {
  const screen = node('div', 'madre-off madre-restarting');
  screen.setAttribute('role', 'status');
  const mark = node('span', 'madre-off-mark');
  mark.innerHTML = RESTART_ICON; // trusted: our own SVG string
  const said = node('p', null, t('Home and your projects close and open again on the same addresses.'));
  screen.append(mark, node('h1', null, t('Restarting MADRE…')), said);
  document.body.append(screen);
  document.documentElement.classList.add('madre-is-off');
  const answers = () => fetch(`/api/version?ts=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(1500) }).then((response) => response.ok).catch(() => false);
  const until = Date.now() + 60000;
  let gone = false;
  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const up = await answers();
    if (!up) gone = true;
    else if (gone) { location.reload(); return; }
  }
  said.textContent = t('MADRE is taking longer than usual. Open it the way you always do; your projects, conversations and settings are there.');
}

// What stays on screen once MADRE is off.
function showOff(stuck) {
  const screen = node('div', 'madre-off');
  screen.setAttribute('role', 'status');
  const mark = node('span', 'madre-off-mark');
  mark.innerHTML = POWER_ICON; // trusted: our own SVG string
  screen.append(mark, node('h1', null, t('MADRE is off')), node('p', null, t('You can close this tab. To use it again, open MADRE the way you always do.')));
  if (stuck.length) screen.append(node('p', 'madre-off-stuck', t('These projects did not answer and may still be open: {list}. Open MADRE again and close them from Home.', { list: stuck.join(', ') })));
  document.body.append(screen);
  document.documentElement.classList.add('madre-is-off');
}

// Closing this project alone (2026-10-28): it sleeps the way Home's «Close» puts it to sleep — what
// runs stops, its memory is put away — and the page goes back to Home. Home and the other projects
// are not touched. If Home is not open, the page says how to come back.
export async function askCloseProject() {
  if (document.querySelector('dialog.power-ask')) return;
  const place = await whereAmI();
  const name = place?.here?.name ?? '';
  const dialog = node('dialog', 'room-ask power-ask');
  dialog.setAttribute('aria-labelledby', 'close-project-title');
  const card = node('div', 'room-ask-card');
  const icon = node('span', 'room-ask-icon');
  icon.innerHTML = SLEEP_ICON; // trusted: our own SVG string
  const title = node('h2', 'room-ask-title', name ? t('Close «{name}»?', { name }) : t('Close this project?'));
  title.id = 'close-project-title';
  const body = node('p', 'room-ask-body', t('Only this project sleeps: Home and your other projects stay open. If an agent is working, it stops and the conversation says so.'));
  const again = node('p', 'key-safe', t('You open it again from Home, as it was.'));
  const reply = node('p', 'key-reply');
  reply.setAttribute('aria-live', 'polite');
  const actions = node('div', 'room-ask-actions');
  const cancel = node('button', 'room-ask-choice', t('Cancel'));
  cancel.type = 'button';
  const go = node('button', 'room-ask-choice primary', t('Close'));
  go.type = 'button';
  actions.append(cancel, go);
  card.append(icon, title, body, again, reply, actions);
  dialog.append(card);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  cancel.addEventListener('click', () => dialog.close());
  go.addEventListener('click', async () => {
    go.disabled = true;
    cancel.disabled = true;
    go.textContent = t('Closing…');
    try {
      const response = await fetch('/api/room/close', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      reply.textContent = error.message;
      go.disabled = false;
      cancel.disabled = false;
      go.textContent = t('Close');
      return;
    }
    dialog.close();
    const port = place?.home?.open?.port;
    if (port) { location.href = `${location.protocol}//${location.hostname}:${port}/salas`; return; }
    const screen = node('div', 'madre-off');
    screen.setAttribute('role', 'status');
    const mark = node('span', 'madre-off-mark');
    mark.innerHTML = SLEEP_ICON; // trusted: our own SVG string
    screen.append(mark, node('h1', null, name ? t('«{name}» is asleep', { name }) : t('This project is asleep')), node('p', null, t('Open MADRE the way you always do to come back to Home.')));
    document.body.append(screen);
    document.documentElement.classList.add('madre-is-off');
  });
  dialog.showModal();
  go.focus();
}