// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Asking for a star or a review (2026-10-10), in the room and in Home: the server keeps when to
// ask (src/review-ask.mjs); this page says once a minute that it is in view, and when a moment is
// due it asks — only when nothing is going on: no turn running, nothing half written, no other
// window open. Otherwise it waits for the next minute. The sheet is the room's question
// (styles.css, dialog.room-ask): a star on GitHub, a review on madre.run, not now, or never again.
// Both links open in the person's browser; MADRE itself sends nothing.

import { language, t } from './i18n.js';
import { trazo } from './icons.js';

export const STAR_URL = 'https://github.com/jossuealcacao-exe/madre';
export const REVIEW_URLS = { es: 'https://madre.run/resenas/', en: 'https://madre.run/en/reviews/' };
const TICK_MS = 60 * 1000;
const STAR = trazo('star');

const post = (url, payload) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}) })
  .then((response) => (response.ok ? response.json() : null)).catch(() => null);

export function startReviewAsk({ busy = () => false } = {}) {
  if (typeof document === 'undefined' || typeof setInterval !== 'function') return null;
  let dialog = null;
  async function tick() {
    if (document.hidden || dialog?.open) return;
    const answer = await post('/api/review-ask/tick');
    if (!answer?.due || document.hidden || busy() || document.querySelector('dialog[open], .reload-curtain')) return;
    ask(answer.due);
  }
  function ask(moment) {
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'room-ask review-ask';
    dialog.setAttribute('aria-labelledby', 'review-ask-title');
    const card = document.createElement('form');
    card.className = 'room-ask-card';
    card.method = 'dialog';
    const icon = document.createElement('span');
    icon.className = 'room-ask-icon';
    icon.innerHTML = STAR; // trusted: our own SVG string
    const title = document.createElement('h2');
    title.className = 'room-ask-title';
    title.id = 'review-ask-title';
    title.textContent = t('Are you enjoying MADRE?');
    const body = document.createElement('p');
    body.className = 'room-ask-body';
    body.textContent = t('If MADRE saves you work, a star on GitHub or a few words about it help more people find it. It takes a minute.');
    const actions = document.createElement('div');
    actions.className = 'room-ask-actions review-ask-actions';
    const choice = (words, tone, answer, href = null) => {
      const key = document.createElement(href ? 'a' : 'button');
      key.className = `room-ask-choice${tone ? ` ${tone}` : ''}`;
      key.textContent = words;
      if (href) { key.href = href; key.target = '_blank'; key.rel = 'noopener'; } else key.type = 'button';
      key.addEventListener('click', () => { settle(answer); });
      return key;
    };
    const quiet = document.createElement('div');
    quiet.className = 'review-ask-quiet';
    quiet.append(choice(t('Not now'), 'quiet', 'later'), choice(t('Don\'t ask again'), 'quiet', 'never'));
    actions.append(
      choice(t('Write a review'), null, 'review', REVIEW_URLS[language()] ?? REVIEW_URLS.es),
      choice(t('Give it a star on GitHub'), 'primary', 'star', STAR_URL),
    );
    const note = document.createElement('p');
    note.className = 'review-ask-note';
    note.textContent = t('Both open in your browser. MADRE sends nothing.');
    card.append(icon, title, body, actions, quiet, note);
    dialog.append(card);
    let settled = false;
    function settle(answer) {
      if (settled) return;
      settled = true;
      void post('/api/review-ask/answer', { moment, answer });
      dialog.close();
    }
    // It waits for an answer: a press on the dim ground around it does nothing (2026-10-11, it went
    // away under a stray click). Esc is an answer, «not now».
    dialog.addEventListener('cancel', () => settle('later'));
    dialog.addEventListener('close', () => { settle('later'); setTimeout(() => dialog?.remove(), 300); });
    document.body.append(dialog);
    dialog.showModal();
  }
  setTimeout(() => void tick(), 4000).unref?.();
  const timer = setInterval(() => void tick(), TICK_MS);
  timer.unref?.();
  return { tick, ask };
}
