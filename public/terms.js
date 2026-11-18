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
import { PRELUDE, createTermsField } from './terms-field.js';

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
  // Behind the card, over the window's right half: MADRE at work, in the abstract (terms-field.js).
  const field = createTermsField();
  dialog.append(field.node, card);
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
        // Drawn in once: put back in the card it would draw itself in again (2026-11-13, the author: the
        // logo «animates as when changing language»), so from here it is the drawn mark, still.
        askLogo.classList.add('still');
        paintAsk();
        await fetch('/api/language', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: code }) }).catch(() => null);
      });
      tongue.append(key);
    }
    // Said to be read in seconds and to calm, not to warn (2026-11-13, the author: «I read that and I
    // would not install it»): free, two quick things, and each one's detail one click away.
    const title = el('h1', 'terms-title', returning ? (app ? t('MADRE is an app now') : t('MADRE 1.1 has a new license')) : t('Before you start'));
    title.id = 'terms-title';
    // Q-26 (2026-11-17, the author): the app never says it is free for you. With the author's switch
    // on (answer.trialDays) it names the first days with everything and the one project after them;
    // with it off it promises nothing either way. The source code keeps its words (BSL).
    const days = Number.isInteger(answer.trialDays) && answer.trialDays > 0 ? answer.trialDays : null;
    const lead = el('p', 'terms-lead', app
      ? (days
        ? (returning
          ? t('The first {days} days you have all of MADRE App; then it stays free with one project. Two quick things and you carry on where you left off.', { days })
          : t('The first {days} days you have all of MADRE App; then it stays free with one project. Two quick things and you are in.', { days }))
        : (returning ? t('Two quick things and you carry on where you left off.') : t('MADRE App is ready. Two quick things and you are in.')))
      : returning
        ? t('It is still free for you and for teams of up to 10 people. Two quick things and you carry on where you left off.')
        : t('MADRE is free for you and for teams of up to 10 people. Two quick things and you are in.'));

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
      el('h2', null, app ? t('Your license') : t('Free for you and your team')),
      el('p', null, app
        ? (days
          ? t('A personal license: the first {days} days with everything, then free with one project, or everything with the subscription. What you make with it is yours.', { days })
          : t('A personal license, for your computers and your projects. Everything you make with it is yours.'))
        : t('Use it, change it and share it. Everything you make with it is yours; a company of more than 10 people writes to us for its license.')),
      link(pick(answer.links?.license), t('Read the license')),
    );

    const help = el('section', 'terms-block terms-help');
    const head = el('div', 'terms-help-head');
    const words = el('div');
    // What it is for and what never leaves, in two lines; what is sent, every detail of it (the daily
    // notice too), is one click away (2026-11-13, the author: «summarise it very quickly»).
    words.append(el('h2', null, t('Help make MADRE better')), el('p', null, t('If something fails, your copy tells me without saying who you are, and I fix it first. Your files and what you write never leave your computer.')));
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
      else said.append(t('Off. MADRE works the same; it will just take me longer to find out if something fails for you.'));
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
      // The opening takes up the smoke where it is (terms-field.js), and condenses it.
      await playOpening(dialog, { skipLabel: t('Skip'), from: field.smoke?.() ?? null });
      veilPage();
      dialog.classList.add('leaving');
      setTimeout(() => { field.stop(); dialog.close(); dialog.remove(); done(); }, 260);
    });
    actions.append(no, yes);
    // The language key belongs to the window's top right corner, never to the card (2026-11-13, the
    // author): inside the card, the card's own movement as it arrives carried it next to the title.
    dialog.querySelector(':scope > .terms-lang')?.remove();
    dialog.append(tongue);
    card.append(logo, title, lead, ...(returning ? [] : [about]), license, help, foot, error, actions);
    setTimeout(() => card.focus({ preventScroll: true }), 0);
  };

  const paintDeclined = () => {
    card.replaceChildren();
    dialog.querySelector(':scope > .terms-lang')?.remove();
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
  // The story begins before the card (2026-11-13, the author): the AIs come as points of light and open
  // into the smoke, one line says where it all starts, and then the card arrives over the smoke.
  dialog.classList.add('prelude');
  const story = el('p', 'terms-prelude', t('It all starts with your AIs.'));
  story.setAttribute('aria-hidden', 'true');
  dialog.append(story);
  const born = field.start({ prelude: true });
  setTimeout(() => { dialog.classList.remove('prelude'); setTimeout(() => story.remove(), 900); }, born ? (PRELUDE.done - 0.55) * 1000 : 0);
}
