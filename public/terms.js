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
import { MADRE_LOGO } from './loader.js';

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
  dialog.append(card);
  // Esc is no answer here: without accepting, MADRE does not start.
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  let diagnostics = answer.diagnosticsFixed ? false : answer.diagnostics !== false;
  const returning = answer.before === true;

  const paintAsk = () => {
    card.replaceChildren();
    const logo = el('div', 'terms-logo');
    logo.innerHTML = MADRE_LOGO; // trusted: our own SVG string
    const title = el('h1', 'terms-title', returning ? t('MADRE 1.1 has a new license') : t('Before you start'));
    title.id = 'terms-title';
    const lead = el('p', 'terms-lead', returning
      ? t('It is still free for you and for teams of up to 10 people. To keep using it, accept the license and the privacy notice.')
      : t('MADRE is free for you and for teams of up to 10 people, also when you use it to work for your clients.'));

    const license = el('section', 'terms-block');
    license.append(
      el('h2', null, t('The license, in short')),
      el('p', null, t('You can use MADRE, change it and share it. An organization of more than 10 people, or whoever offers MADRE as a service, needs a commercial license.')),
      link(pick(answer.links?.license), t('Read the license')),
    );

    const help = el('section', 'terms-block terms-help');
    const head = el('div', 'terms-help-head');
    const words = el('div');
    words.append(el('h2', null, t('Help make MADRE better')), el('p', null, returning
      ? t('MADRE is made by one person. From this version your copy also tells the author, anonymously, how it runs, so the next versions fix first what fails for you. Never what you write, your projects or your files.')
      : t('MADRE is made by one person. So it gets better where it matters to you, your copy tells the author, anonymously, what fails and how it is used. Never what you write, your projects or your files.')));
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
      else if (diagnostics) said.append(t('You can change it whenever you like in Settings.'), ' ', link(pick(answer.links?.privacy), t('See what is sent')));
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
      dialog.classList.add('leaving');
      setTimeout(() => { dialog.close(); dialog.remove(); done(); }, 260);
    });
    actions.append(no, yes);
    card.append(logo, title, lead, license, help, foot, error, actions);
    setTimeout(() => yes.focus(), 0);
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
    setTimeout(() => back.focus(), 0);
  };

  paintAsk();
  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
