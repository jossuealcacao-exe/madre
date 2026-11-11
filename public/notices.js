// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's notices, on the page (Q-11, src/notices.mjs). Home shows every notice for this copy;
// a project only the important and security ones, as a thin strip above the conversation. Each stays
// until the person presses «Got it». Text only: a notice is never HTML, and its one link goes to
// madre.run (the server checked the signature and the link before it came here).

import { language, t } from './i18n.js';
import { inMacApp, notify } from './notifications.js';

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const pickWords = (pair) => (pair && typeof pair === 'object' ? pair[language()] ?? pair.es ?? pair.en ?? '' : String(pair ?? ''));
const LEVEL_WORDS = { info: () => t('Notice from MADRE'), important: () => t('Important notice from MADRE'), security: () => t('Security notice from MADRE') };

// In the Mac app, a notice also comes as a notification of the system (2026-11-10, asked by the author:
// «the ones I send»), once each, from Home only so several open pages do not say it several times.
// Security ones always; the others as the person chose (notifications.js, «Other notices from MADRE»).
function notifySystem(notice) {
  const title = pickWords(notice.title);
  const body = pickWords(notice.body);
  notify(notice.level === 'security' ? 'security' : 'notices', LEVEL_WORDS[notice.level]?.() ?? LEVEL_WORDS.info(), [title, body].filter(Boolean).join(' · '), { tag: `notice-${notice.id}`, once: `notice-${notice.id}` });
}

// Draws the notices into `host` and asks again every few minutes while the page is open.
// `levels`: which ones this page shows; `system`: whether this page also tells the system (Home).
// Returns a function that asks again at once.
export function mountNotices(host, { levels = ['info', 'important', 'security'], every = 5 * 60_000, system = false } = {}) {
  if (!host) return () => {};
  host.classList.add('madre-notices');
  host.setAttribute('aria-live', 'polite');
  let drawn = '';
  const draw = (notices) => {
    const shown = notices.filter((one) => !one.seen && levels.includes(one.level));
    if (system && inMacApp()) for (const notice of shown) notifySystem(notice);
    const key = JSON.stringify(shown.map((one) => one.id)) + language();
    if (key === drawn) return;
    drawn = key;
    host.replaceChildren();
    host.hidden = !shown.length;
    for (const notice of shown) {
      const card = el('section', `madre-notice is-${notice.level}`);
      card.setAttribute('role', notice.level === 'security' ? 'alert' : 'status');
      const words = el('div', 'madre-notice-words');
      words.append(el('small', 'madre-notice-kind', LEVEL_WORDS[notice.level]?.() ?? LEVEL_WORDS.info()), el('b', 'madre-notice-title', pickWords(notice.title)), el('p', 'madre-notice-body', pickWords(notice.body)));
      if (notice.link) {
        const link = el('a', 'madre-notice-link', t('Read more'));
        link.href = notice.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        words.append(link);
      }
      const done = el('button', 'madre-notice-done', t('Got it'));
      done.type = 'button';
      done.addEventListener('click', async () => {
        done.disabled = true;
        await fetch('/api/notices/seen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: notice.id }) }).catch(() => null);
        card.remove();
        if (!host.querySelector('.madre-notice')) host.hidden = true;
      });
      card.append(words, done);
      host.append(card);
    }
  };
  const ask = async () => {
    if (document.hidden) return;
    const answer = await fetch('/api/notices', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (answer && Array.isArray(answer.notices)) draw(answer.notices);
  };
  void ask();
  setInterval(() => void ask(), every);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void ask(); });
  return () => { drawn = ''; void ask(); };
}
