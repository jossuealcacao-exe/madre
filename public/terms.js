// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// BEFORE YOU START (2026-10-30, src/terms.mjs): MADRE's license and privacy notice, accepted once per
// version of their text on this computer, before Home or a project can be used. A new person reads it
// as the first thing MADRE says; whoever came from a MADRE before 1.1.0 reads what changed. The
// anonymous diagnostics come on and are said in plain words, why they help and what never goes; they
// are no condition: the switch is right there, and in Settings later. Without accepting, MADRE does
// not start: the page says so and offers to read it again or to close MADRE.
//
// app.js and salas-mac.js wait on it before anything else is drawn (`await ensureTerms()`).

import { browserLanguage, language, setLanguage, t } from './i18n.js';
import { MADRE_LOGO, playOpening } from './loader.js';
import { trazo } from './icons.js';

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const link = (href, words) => {
  const node = el('a', 'terms-link', words);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
};
const pick = (pair) => pair?.[language()] ?? pair?.es ?? '#';

// The ground over the page while it is drawn (index.html, salas-mac.html: `madre-booting`), put back,
// with the same way out if nothing takes it away.
function veilPage() {
  const root = document.documentElement;
  if (root.classList.contains('madre-booting')) return;
  root.classList.remove('madre-arriving');
  root.classList.add('madre-booting');
  setTimeout(() => root.classList.remove('madre-booting'), 6000);
}

export async function ensureTerms() {
  if (typeof document === 'undefined' || typeof fetch !== 'function') return;
  let answer = null;
  try { answer = await fetch('/api/terms', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)); } catch { return; }
  // Only an explicit «not accepted» stops the page: an older room, or no answer, never locks anyone out.
  if (answer?.accepted !== false) return;
  setLanguage(answer.languageChosen ? answer.language : browserLanguage());
  await new Promise((done) => askTerms(answer, done));
}

function askTerms(answer, done) {
  const dialog = el('dialog', 'terms-gate');
  dialog.setAttribute('aria-labelledby', 'terms-title');
  const card = el('div', 'terms-card');
  // The dialog's first focus goes to the card, never to a link or a key with the browser's ring on it.
  card.tabIndex = -1;
  card.setAttribute('autofocus', '');
  dialog.append(card);
  // Esc is no answer here: without accepting, MADRE does not start.
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  let diagnostics = answer.diagnosticsFixed ? false : answer.diagnostics !== false;
  // Inside the desktop app (src/terms.mjs, `kind`) the license is the app's own, closed, and whoever
  // accepted the source code's before is told the app has one of its own.
  const app = answer.kind === 'app';
  const returning = app ? Boolean(answer.previous) : answer.before === true;

  // The logo draws itself in once: drawn again with every change of language, it started over.
  const askLogo = el('div', 'terms-logo');
  askLogo.innerHTML = MADRE_LOGO; // trusted: our own SVG string
  const paintAsk = () => {
    card.replaceChildren();
    const logo = askLogo;
    // THE LANGUAGE, by hand (2026-11-11, the author: «whatever language is detected, an ES key in the
    // top right corner»): ES and EN, the one on lit; the card is said again in the other at once,
    // and MADRE keeps it as the person's choice.
    const tongue = el('div', 'terms-lang');
    tongue.setAttribute('role', 'radiogroup');
    tongue.setAttribute('aria-label', 'Idioma · Language');
    for (const [code, word] of [['es', 'ES'], ['en', 'EN']]) {
      const key = el('button', null, word);
      key.type = 'button';
      key.setAttribute('role', 'radio');
      key.setAttribute('aria-checked', String(language() === code));
      key.setAttribute('aria-label', code === 'es' ? 'Español' : 'English');
      key.addEventListener('click', async () => {
        if (language() === code) return;
        setLanguage(code);
        paintAsk();
        await fetch('/api/language', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: code }) }).catch(() => null);
      });
      tongue.append(key);
    }
    const title = el('h1', 'terms-title', returning ? (app ? t('The MADRE app has a license of its own') : t('MADRE 1.1 has a new license')) : t('Before you start'));
    title.id = 'terms-title';
    const lead = el('p', 'terms-lead', app
      ? (returning ? t('On your computer, MADRE now comes as an app, with its own license of use. To keep using it, accept it and the privacy notice.') : t('Before you use MADRE, read and accept its license of use and its privacy notice.'))
      : returning
        ? t('It is still free for you and for teams of up to 10 people. To keep using it, accept the license and the privacy notice.')
        : t('MADRE is free for you and for teams of up to 10 people, also when you use it to work for your clients.'));

    // WHAT MADRE IS, before anything is asked (2026-11-11, the author: «a short description of what
    // MADRE is in the first window, where the license is accepted»): three lines, the same three ideas
    // the opening tells after it.
    const about = el('section', 'terms-about');
    about.append(el('h2', null, t('What MADRE is')));
    const points = el('ul', 'terms-about-list');
    for (const [icon, title, sub] of [
      ['agents', t('Your AIs, together'), t('Claude, ChatGPT, Gemini and more, in one place.')],
      ['folder', t('They work in your folders'), t('You ask the way you would ask someone on your team, and they do it in your files.')],
      ['brain', t('MADRE remembers'), t('What gets decided is kept, so nobody starts from zero.')],
    ]) {
      const item = el('li');
      const mark = el('span', 'terms-about-icon');
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = trazo(icon); // trusted: our own SVG string
      const words = el('span', 'terms-about-words');
      words.append(el('b', null, title), el('small', null, sub));
      item.append(mark, words);
      points.append(item);
    }
    about.append(points);
    const license = el('section', 'terms-block');
    license.append(
      el('h2', null, app ? t('License of use') : t('Personal license')),
      el('p', null, app
        ? t('You can install the MADRE app and use it on your computers, for yourself and for your work. Its code is private: it may not be copied, modified, taken apart or redistributed, and it is not offered as a service to others.')
        : t('You can use MADRE, change it and share it; an organization of more than 10 people, or whoever offers MADRE as a service, needs a commercial license.')),
      link(pick(answer.links?.license), t('Read the license')),
    );

    const help = el('section', 'terms-block terms-help');
    const head = el('div', 'terms-help-head');
    const words = el('div');
    words.append(el('h2', null, t('Help make MADRE better')), el('p', null, returning
      ? t('MADRE is made by one person. From this version your copy can share its errors with me anonymously, so the next versions fix first what fails for you. It is optional and you can turn it off whenever you like in Settings.')
      : t('MADRE is made by one person. Your copy can share its errors with me anonymously, so each version fixes first what fails for you. It is optional and you can turn it off whenever you like in Settings.')));
    const knob = el('button', 'terms-switch');
    knob.type = 'button';
    knob.setAttribute('role', 'switch');
    knob.setAttribute('aria-label', t('Help make MADRE better'));
    knob.append(el('span', 'terms-knob'));
    const said = el('p', 'terms-said');
    const paintKnob = () => {
      knob.setAttribute('aria-checked', String(diagnostics));
      knob.disabled = Boolean(answer.diagnosticsFixed);
      said.replaceChildren();
      if (answer.diagnosticsFixed) said.append(t('Off: MADRE was started with PULSE_TELEMETRY=0.'));
      else if (diagnostics) said.append(link(pick(answer.links?.privacy), t('See what is sent')));
      else said.append(t('Off: the author will not know when something fails for you, and it may take longer to fix.'));
    };
    knob.addEventListener('click', () => { diagnostics = !diagnostics; paintKnob(); });
    paintKnob();
    head.append(words, knob);
    help.append(head, said);

    const foot = el('p', 'terms-foot');
    foot.append(t('By continuing you accept MADRE\'s'), ' ', link(pick(answer.links?.license), t('license')), ' ', t('and its'), ' ', link(pick(answer.links?.privacy), t('privacy notice')), '.');
    const error = el('p', 'terms-error');
    const actions = el('div', 'terms-actions');
    const no = el('button', 'terms-btn quiet', t('I do not accept'));
    no.type = 'button';
    no.addEventListener('click', paintDeclined);
    const yes = el('button', 'terms-btn primary', returning ? t('Accept and continue') : t('Accept and start'));
    yes.type = 'button';
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      no.disabled = true;
      error.textContent = '';
      const saved = await fetch('/api/terms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accept: true, diagnostics }) }).then((response) => response.ok).catch(() => false);
      if (!saved) { yes.disabled = false; no.disabled = false; error.textContent = t('It could not be saved. Try again.'); return; }
      // MADRE's opening plays here, before Home is drawn behind it (2026-10-30): drawn first and the
      // opening over it, it looked like a jump. Since 2026-11-10 for someone new too: the page's veil
      // had gone while they read the license (loader.js, six seconds), so Home showed and the opening
      // came after it, with the welcome. The veil goes back over the page until the welcome opens or
      // Home is drawn (bootDone); the welcome does not play the opening again (openingPlayed).
      card.style.visibility = 'hidden';
      await playOpening(dialog, { skipLabel: t('Skip') });
      veilPage();
      dialog.classList.add('leaving');
      setTimeout(() => { dialog.close(); dialog.remove(); done(); }, 260);
    });
    actions.append(no, yes);
    card.append(tongue, logo, title, lead, ...(returning ? [] : [about]), license, help, foot, error, actions);
    setTimeout(() => card.focus({ preventScroll: true }), 0);
  };

  const paintDeclined = () => {
    card.replaceChildren();
    const logo = el('div', 'terms-logo');
    logo.innerHTML = MADRE_LOGO; // trusted: our own SVG string
    const title = el('h1', 'terms-title', t('MADRE cannot start without it'));
    title.id = 'terms-title';
    const lead = el('p', 'terms-lead', t('The license is what lets you use MADRE for free. If you change your mind, accept it here; or close MADRE.'));
    const said = el('p', 'terms-error');
    const actions = el('div', 'terms-actions');
    const back = el('button', 'terms-btn primary', t('Read it again'));
    back.type = 'button';
    back.addEventListener('click', paintAsk);
    const shut = el('button', 'terms-btn quiet', t('Close MADRE'));
    shut.type = 'button';
    shut.addEventListener('click', async () => {
      shut.disabled = true;
      back.disabled = true;
      const closed = await fetch('/api/madre/shutdown', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((response) => response.ok).catch(() => false);
      if (closed) { actions.remove(); lead.textContent = t('MADRE is closed. You can close this tab.'); return; }
      shut.disabled = false;
      back.disabled = false;
      said.textContent = t('MADRE could not be closed from here. Close the terminal where it runs.');
    });
    actions.append(shut, back);
    card.append(logo, title, lead, said, actions);
    setTimeout(() => card.focus({ preventScroll: true }), 0);
  };

  paintAsk();
  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
