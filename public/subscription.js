// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE App's subscription, on the page (src/billing.mjs, docs/private/SUSCRIPCION.md). Nothing here
// draws unless the server says this copy runs inside the app with the author's switch on: MADRE from
// npm or from source never shows a price. Home and every project draw the same things from here:
// Settings › Subscription, the moments told once (the trial begins, two days left, the last day, the
// trial over, paid), and the card a limit shows instead of an error.

import { language, t } from './i18n.js';

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const button = (className, text, run) => {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', run);
  return node;
};
const post = (path, payload = {}) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  .then(async (response) => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }))
  .catch(() => ({ ok: false, status: 0, body: { error: t('Could not reach MADRE.') } }));
const locale = () => (language() === 'en' ? 'en-US' : 'es-MX');
export const money = (mxn) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(mxn);
const dayWords = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
const perMonth = (info) => t('{price} a month', { price: money(info.price?.mxn ?? 109) });

// What the subscription gives, and what stays without it: the same lines everywhere.
const GIVES = () => [t('All your projects at once'), t('Plans among several AIs'), t('The Coordinator, across your projects'), t('Updates and fixes, always')];
const KEEPS = () => [t('One project takes messages; the others stay, to read'), t('Chat with all your AIs'), t('Updates and fixes, always')];

let info = { state: 'off' };
let openSettingsHere = () => {};
const listeners = new Set();
export const subscriptionInfo = () => info;
export const subscriptionShown = () => info.state && info.state !== 'off';
export function onSubscription(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function took(next) {
  if (!next || typeof next.state !== 'string') return info;
  const changed = JSON.stringify(next) !== JSON.stringify(info);
  info = next;
  if (changed) for (const listener of listeners) { try { listener(info); } catch { /* one page part failing never stops the others */ } }
  return info;
}
export async function readSubscription() {
  const answer = await fetch('/api/subscription', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  return took(answer);
}

// Paying: madre.run's page opens in the browser, and this page asks every few seconds until the key
// is here (the server asks madre.run meanwhile). Nothing to copy or paste on this computer.
let waiting = null;
export async function subscribe() {
  const answer = await post('/api/subscription/subscribe');
  if (!answer.ok || !answer.body.url) return { error: answer.body.error ?? t('The payment page did not open. Try again in a moment.') };
  window.open(answer.body.url, '_blank', 'noopener');
  await readSubscription();
  if (!waiting) {
    const started = Date.now();
    waiting = setInterval(async () => {
      const now = await readSubscription();
      if (now.state === 'active' || Date.now() - started > 30 * 60 * 1000) { clearInterval(waiting); waiting = null; }
    }, 3000);
  }
  return { ok: true };
}
async function manage() {
  const answer = await post('/api/subscription/manage');
  if (answer.ok && answer.body.url) window.open(answer.body.url, '_blank', 'noopener');
  return answer.ok ? { ok: true } : { error: answer.body.error };
}

// Turning it on with the email of the payment: the server asks madre.run every few seconds for half
// an hour, and this page reads it until the subscription is on here.
let recovering = null;
async function recover(email) {
  const answer = await post('/api/subscription/recover', { email });
  if (!answer.ok) return { error: answer.body.error ?? t('madre.run did not answer. Try again in a moment.') };
  took(answer.body);
  if (!recovering) {
    const started = Date.now();
    recovering = setInterval(async () => {
      const now = await readSubscription();
      if (now.state === 'active' || !now.recovering || Date.now() - started > 31 * 60 * 1000) { clearInterval(recovering); recovering = null; }
    }, 3000);
  }
  return { ok: true };
}

function lists(host) {
  const both = el('div', 'madre-sub-lists');
  for (const [title, lines, kind] of [[t('With the subscription'), GIVES(), 'gives'], [t('In the limited mode'), KEEPS(), 'keeps']]) {
    const column = el('div', `madre-sub-list is-${kind}`);
    const list = el('ul');
    for (const line of lines) list.append(el('li', null, line));
    column.append(el('b', null, title), list);
    both.append(column);
  }
  host.append(both);
  return both;
}

// ---- Settings › Subscription ---------------------------------------------------------------------

// The line on its card and at the top of its page.
export function subscriptionLine(now = info) {
  if (now.state === 'trial') return now.daysLeft === 1 ? t('Free trial · last day') : t('Free trial · {n} days left', { n: now.daysLeft });
  if (now.state === 'active') return t('Active · renews on {day}', { day: dayWords(now.until) });
  if (now.state === 'limited') return t('Limited mode');
  return '';
}

export function drawSubscription(host, { projectPage = false } = {}) {
  if (!host) return null;
  const block = el('section', 'sx-block madre-sub-settings');
  const draw = () => {
    block.replaceChildren();
    const head = el('header', 'sx-head');
    const words = el('div', 'sx-words');
    const lead = {
      trial: t('Until {day} you have all of MADRE App. Then it is {price}, or you go on free in the limited mode. Nothing of yours is deleted.', { day: dayWords(info.trialEnds), price: perMonth(info) }),
      active: t('Thank you. It renews each month on its own, and you can cancel whenever you want.'),
      limited: t('Your projects, memories and files are all here. With the subscription, everything comes back.'),
    }[info.state] ?? '';
    words.append(el('h3', null, t('Subscription')), el('p', null, lead));
    head.append(words);
    const rows = el('div', 'sx-rows');
    const said = el('p', 'sx-foot madre-sub-said');
    const row = (title, hint, control) => {
      const line = el('div', 'sx-row');
      const text = el('div', 'sx-words');
      text.append(el('b', null, title));
      if (hint) text.append(el('span', 'sx-hint', hint));
      const box = el('div', 'sx-control');
      if (control) box.append(control);
      line.append(text, box);
      rows.append(line);
      return line;
    };
    if (info.state === 'active') {
      row(`MADRE App · ${perMonth(info)}`, t('Cancel, change your card or see your invoices.'), button('sx-btn', t('Manage'), async (event) => {
        event.currentTarget.disabled = true;
        const done = await manage();
        event.currentTarget.disabled = false;
        said.textContent = done.error ?? '';
      }));
    } else {
      row(`MADRE App · ${perMonth(info)}`, t('VAT included. Cancel whenever you want.'), button('sx-btn primary', info.waiting ? t('Open the payment again') : t('Subscribe'), async (event) => {
        event.currentTarget.disabled = true;
        const done = await subscribe();
        event.currentTarget.disabled = false;
        said.textContent = done.error ?? t('The payment opened in your browser. When you finish, it turns on here by itself.');
      }));
      if (info.waiting) row(t('Waiting for your payment'), t('It turns on by itself as soon as you finish in the browser.'), el('span', 'madre-sub-spin'));
    }
    if (info.state === 'limited' && projectPage && info.project) {
      const here = info.active?.room === info.project.room;
      row(t('The project that takes messages'), info.active?.name ? (here ? t('This one: {name}', { name: info.active.name }) : info.active.name) : t('The first one you write in'), here ? null : button('sx-btn', t('Use this project'), async (event) => {
        event.currentTarget.disabled = true;
        const answer = await post('/api/subscription/project');
        event.currentTarget.disabled = false;
        if (answer.ok) took(answer.body); else said.textContent = answer.body.error ?? '';
      }));
    }
    // Already subscribed (2026-11-18): the email of the payment gets a button, and this computer turns
    // on by itself once it is pressed, wherever the email was opened. Nothing to copy or paste.
    if (info.state !== 'active' && info.recovering) {
      row(t('Check your email'), t('Open the email from MADRE and press its button: this computer turns on by itself. If it does not arrive in a few minutes, look in spam, or check it is the email you paid with.'), button('sx-btn', t('Cancel'), async (event) => {
        event.currentTarget.disabled = true;
        const answer = await post('/api/subscription/recover/stop');
        if (answer.ok) took(answer.body);
      }));
    } else if (info.state !== 'active') {
      // A row like every other one in Settings (2026-11-18, the author's review: the folded box showed its
      // bare ▼, a narrow field that cut its own words, and a button out of line). Pressed, the row opens
      // to its full width: the email and the button side by side.
      const line = row(t('I already have a subscription'), t('We send a button to the email you paid with; you press it and this computer turns on by itself. A subscription works on up to two computers.'), null);
      const box = line.querySelector('.sx-control');
      const ask = () => {
        line.classList.add('stack');
        const form = el('form', 'madre-sub-email');
        const input = el('input', 'sx-input');
        input.type = 'email';
        input.autocomplete = 'email';
        input.required = true;
        input.placeholder = t('The email you paid with');
        input.setAttribute('aria-label', t('The email you paid with'));
        const send = el('button', 'sx-btn primary', t('Send me the email'));
        send.type = 'submit';
        form.append(input, send);
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          send.disabled = true;
          const done = await recover(input.value);
          send.disabled = false;
          said.textContent = done.error ?? '';
        });
        box.replaceChildren(form);
        input.focus();
      };
      box.append(button('sx-btn', t('Use my email'), ask));
    }
    lists(rows);
    rows.append(said);
    block.append(head, rows);
  };
  draw();
  const stop = onSubscription(() => { if (block.isConnected) draw(); else stop(); });
  host.append(block);
  return block;
}

// ---- The moments, told once ----------------------------------------------------------------------

function seen(moment) { void post('/api/subscription/seen', { moment }).then((answer) => { if (answer.ok) took(answer.body); }); }

// A sheet for the two that change what MADRE does (the trial begins, the trial is over); a short card
// in the corner for the rest. Calm: no countdown, no red, and closing it is always one press.
function sheet(moment) {
  const dialog = el('dialog', 'madre-sub-sheet');
  dialog.setAttribute('aria-labelledby', 'madre-sub-title');
  const kicker = el('small', 'madre-sub-kicker', 'MADRE App');
  const title = el('h2', null, moment === 'intro'
    ? t('You have {n} days with all of MADRE App', { n: info.trialDays })
    : t('Your free trial is over'));
  title.id = 'madre-sub-title';
  const body = el('p', 'madre-sub-body', moment === 'intro'
    ? t('From now on, MADRE App is a subscription of {price}. These {n} days are free, with no card. When they end you choose: subscribe, or go on free in the limited mode. Nothing of yours is deleted.', { price: perMonth(info), n: info.trialDays })
    : t('MADRE keeps working in the limited mode. Your projects, memories and files are all here.'));
  dialog.append(kicker, title, body);
  lists(dialog);
  const said = el('p', 'madre-sub-said');
  const actions = el('div', 'madre-sub-actions');
  const close = () => { seen(moment); dialog.close(); dialog.remove(); };
  if (moment === 'intro') {
    actions.append(
      button('madre-sub-btn primary', t('Start my {n} days', { n: info.trialDays }), close),
      button('madre-sub-btn', t('Subscribe now'), async () => { const done = await subscribe(); if (done.error) said.textContent = done.error; else close(); }),
    );
  } else {
    actions.append(
      button('madre-sub-btn primary', t('Subscribe · {price}', { price: perMonth(info) }), async () => { const done = await subscribe(); if (done.error) said.textContent = done.error; else close(); }),
      button('madre-sub-btn', t('Go on in the limited mode'), close),
    );
  }
  dialog.append(actions, said);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  document.body.append(dialog);
  dialog.showModal();
}
function corner(moment) {
  const card = el('section', 'madre-sub-toast');
  card.setAttribute('role', 'status');
  const words = {
    soon: t('Two days left of your MADRE App trial.'),
    last: t('Today is the last day of your MADRE App trial.'),
    paid: t('Done: your subscription is on. Thank you for keeping MADRE going.'),
    moved: t('Your subscription was turned on in two other computers, so this one is back in the limited mode. To use it here again, turn it on from Settings › Subscription.'),
  }[moment];
  card.append(el('p', null, words));
  const actions = el('div', 'madre-sub-actions');
  const close = () => { seen(moment); card.remove(); };
  if (moment !== 'paid') actions.append(button('madre-sub-btn primary', t('See the plan'), () => { close(); openSettingsHere(); }));
  actions.append(button('madre-sub-btn', t('Got it'), close));
  card.append(actions);
  document.body.append(card);
}
let told = null;
function tell(now) {
  if (!now.moment || told === now.moment || document.querySelector('.madre-sub-sheet[open], .madre-sub-toast')) return;
  told = now.moment;
  if (now.moment === 'intro' || now.moment === 'limited') sheet(now.moment); else corner(now.moment);
}

// ---- A limit, said where the message was refused -------------------------------------------------

// The server answered 402 with `subscription`: a card instead of a red line, with the way out.
export function showLimit(result) {
  document.querySelector('.madre-sub-toast.is-limit')?.remove();
  const card = el('section', 'madre-sub-toast is-limit');
  card.setAttribute('role', 'alert');
  card.append(el('small', 'madre-sub-kicker', t('Comes with the subscription')), el('p', null, result.error ?? ''));
  const actions = el('div', 'madre-sub-actions');
  const said = el('p', 'madre-sub-said');
  actions.append(button('madre-sub-btn primary', t('Subscribe'), async () => { const done = await subscribe(); if (done.error) said.textContent = done.error; else card.remove(); }));
  if (result.subscription?.limit === 'project') {
    actions.append(button('madre-sub-btn', t('Use this project'), async () => {
      const answer = await post('/api/subscription/project');
      if (answer.ok) { took(answer.body); card.remove(); } else said.textContent = answer.body.error ?? '';
    }));
  }
  actions.append(button('madre-sub-btn', t('Close'), () => card.remove()));
  card.append(actions, said);
  document.body.append(card);
  return card;
}

// Read when the page opens, when it comes back to the front, and every ten minutes: the author's
// switch reaches a copy the next time the person opens it.
export function mountSubscription({ openSettings = () => {} } = {}) {
  openSettingsHere = openSettings;
  const ask = async () => { if (!document.hidden) tell(await readSubscription()); };
  void ask();
  setInterval(() => void ask(), 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void ask(); });
  onSubscription((now) => tell(now));
  return ask;
}
