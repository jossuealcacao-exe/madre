// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Turning MADRE off from the page (2026-10-16): one key in the top bar of Home and of every
// project, a question before anything happens, and then the server closes every open project and
// itself the clean way (src/server.mjs, /api/madre/shutdown). What is left on screen says MADRE is
// off, so a page that no longer answers is never mistaken for one that broke.
import { t } from './i18n.js';

export const POWER_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.9v6.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6.2 5.3a6.1 6.1 0 1 0 7.6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

const node = (tag, className, text) => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text !== undefined && text !== null) made.textContent = text;
  return made;
};

// The key itself, in the classes of the bar it sits in.
export function powerKey(className) {
  const key = node('button', `${className} power-key`);
  key.type = 'button';
  key.innerHTML = POWER_ICON; // trusted: our own SVG string
  labelPowerKey(key);
  key.addEventListener('click', () => void askPowerOff());
  return key;
}
export function labelPowerKey(key) {
  key.title = t('Turn MADRE off');
  key.setAttribute('aria-label', t('Turn MADRE off'));
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
  const what = open === null ? t('Home and every open project close.') : open === 1 ? t('Home and the one open project close.') : t('Home and the {n} open projects close.', { n: open });
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
