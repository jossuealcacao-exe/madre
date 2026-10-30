// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// ROOMS, on the phone: every room open on the Mac, in one list (docs/MOBILE.md, MOV-004).
//
// The bridge serves this page and answers what it asks: which rooms are open, what each one is
// doing, and where the person was on the Mac. A row opens its room; the room's own page takes it
// from there, behind the same address. STOP ALL halts every agent in every room, after a second
// touch, because a phone in a pocket touches things.

import { setLanguage, t } from './i18n.js';
import { dropStickyHover } from './touch.js';

// A tapped card does not stay lit on the phone (public/touch.js).
dropStickyHover();

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const ui = { list: $('salas-list'), empty: $('salas-empty'), foot: $('salas-foot'), mac: $('salas-mac'), stop: $('salas-stop'), carry: $('salas-continue'), welcome: $('salas-welcome') };
let language = 'es';
let timer = 0;
let arming = 0;

// The room's looks, from this browser: the same keys the room's own page keeps.
(() => {
  let theme = 'auto';
  let accent = null;
  try { theme = localStorage.getItem('pulse.theme') ?? 'auto'; accent = localStorage.getItem('pulse.accent'); } catch { /* no storage */ }
  const light = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  root.dataset.scheme = theme === 'auto' ? (light ? 'light' : 'dark') : theme;
  if (accent && accent !== 'madre') root.dataset.accent = accent;
})();

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
};

const chatName = (title) => (title === 'First conversation' ? t('First conversation') : title === 'Untitled' ? t('Untitled') : title === 'Coordinator' ? t('Coordinator') : title);

function ago(iso) {
  const at = Date.parse(iso ?? '');
  if (!Number.isFinite(at)) return '';
  const seconds = (at - Date.now()) / 1000;
  const away = Math.abs(seconds);
  const words = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' });
  if (away < 60) return t('now');
  if (away < 3600) return words.format(Math.round(seconds / 60), 'minute');
  if (away < 86400) return words.format(Math.round(seconds / 3600), 'hour');
  if (away < 604800) return words.format(Math.round(seconds / 86400), 'day');
  return new Date(at).toLocaleDateString(language, { day: 'numeric', month: 'short' });
}

async function openRoom(id, { carry = false, chat = null } = {}) {
  const answer = await fetch('/bridge/open', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: id }) });
  if (!answer.ok) { await refresh(); return; }
  // A conversation by its own address: the phone never moves the one the room has open on the Mac.
  location.href = carry ? '/?continuar=mac' : chat ? `/?en=${encodeURIComponent(chat)}` : '/';
}

// The modes as the room names them (app.js, MODES): asked when shown, so the language is the page's.
const modeName = (n) => [t('INCOGNITO'), t('CHAT ONLY'), t('CREATE'), t('EDIT'), t('FULL ACCESS')][n] ?? '';
// What an agent is waiting for, in one line.
function askLine(ask) {
  if (ask.kind === 'mode') return t('@{agent} asks for #{n} {label}', { agent: ask.agent, n: ask.mode, label: modeName(ask.mode) });
  if (ask.kind === 'run') return ask.text ? t('@{agent} wants to run {line}', { agent: ask.agent, line: ask.text }) : t('@{agent} wants to run a command', { agent: ask.agent });
  if (ask.kind === 'bishop') return t('The Coordinator proposes #{n} to @{agent}: confirm it to unlock it', { n: ask.mode, agent: ask.agent });
  if (ask.kind === 'plan') return ask.text ? t('The Coordinator waits for you to confirm: {reason}', { reason: ask.text }) : t('The Coordinator waits for you to confirm');
  return ask.text ? t('@{agent} asks you: {question}', { agent: ask.agent, question: ask.text }) : t('@{agent} asks you to choose', { agent: ask.agent });
}

function drawRoom(room) {
  const item = el('li');
  const row = el('button', 'salas-room');
  row.type = 'button';
  const head = el('span', 'salas-room-head');
  head.append(el('b', null, room.coordinator ? t('Coordinator') : room.project), el('time', null, ago(room.chat?.at)));
  row.append(head);
  if (room.waitingCount) row.classList.add('waiting');
  if (room.outdated || room.unreachable) {
    row.disabled = true;
    row.append(el('span', 'salas-room-note', room.outdated ? t('Update MADRE in this project on your Mac to use it from here.') : t('This project is not answering.')));
  } else {
    const ask = room.waiting?.[0];
    if (ask) {
      // What waits comes first, in the accent: it is the one thing on this screen that needs you.
      const mark = el('span', 'salas-room-wait');
      mark.append(el('b', null, room.waitingCount > 1 ? t('Waiting for you · {n}', { n: room.waitingCount }) : t('Waiting for you')), el('span', null, askLine(ask)));
      row.append(mark);
      if (ask.chatTitle) row.append(el('span', 'salas-room-chat', chatName(ask.chatTitle)));
    } else {
      if (room.chat) row.append(el('span', 'salas-room-chat', chatName(room.chat.title)));
      if (room.chat?.preview) row.append(el('span', 'salas-room-preview', room.chat.preview));
    }
    // The macroverse on a phone (docs/MACROVERSO.md): no map, the archive of each room as one line
    // in NOSTROMO's colours, and how much it holds.
    if (room.census?.memories) {
      const strip = el('span', 'salas-room-strip');
      for (const kind of ['decision', 'fact', 'preference', 'question', 'aberration']) {
        const count = room.census.kinds?.[kind] ?? 0;
        if (!count) continue;
        const part = el('i', `k-${kind}`);
        part.style.flexGrow = String(count);
        strip.append(part);
      }
      row.append(strip, el('span', 'salas-room-count', room.census.memories === 1 ? t('1 memory') : t('{n} memories', { n: room.census.memories })));
    }
    if (room.working?.length) {
      const busy = el('span', 'salas-room-busy');
      busy.append(el('i', null), document.createTextNode(t('{agents} working', { agents: room.working.map((id) => `@${id}`).join(', ') })));
      row.append(busy);
    }
    row.addEventListener('click', () => { void openRoom(room.id, { chat: ask?.chat ?? null }); });
  }
  item.append(row);
  return item;
}

function drawCarry(entry, rooms) {
  const open = entry && rooms.some((room) => room.id === entry.room && !room.outdated && !room.unreachable);
  ui.carry.hidden = !open;
  if (!open) return;
  ui.carry.replaceChildren();
  const words = el('span', 'salas-continue-words');
  words.append(el('b', null, t('Pick up where you were')), el('span', null, [entry.project, entry.chatTitle ? chatName(entry.chatTitle) : null].filter(Boolean).join(' · ')));
  if (entry.draft) words.append(el('span', 'salas-continue-draft', `“${entry.draft.slice(0, 80)}${entry.draft.length > 80 ? '…' : ''}”`));
  ui.carry.append(words, el('span', 'salas-continue-go', '›'));
  ui.carry.onclick = () => { void openRoom(entry.room, { carry: true }); };
}

async function refresh() {
  let data;
  try {
    const answer = await fetch('/bridge/rooms', { cache: 'no-store' });
    if (answer.status === 401) { location.reload(); return; }
    data = await answer.json();
  } catch {
    ui.foot.textContent = t('Your Mac is not answering. Check that it is awake and on the same Wi-Fi.');
    return;
  }
  if (data.language && data.language !== language) { language = setLanguage(data.language); root.lang = language; translateStatic(); }
  ui.mac.textContent = t('On {mac}', { mac: data.mac });
  // What waits for you first, then what is working, then the rest as the Mac lists them, and last
  // the rooms this phone cannot use yet.
  const weight = (room) => (room.outdated || room.unreachable ? -1 : (room.waitingCount ? 2 : 0) + (room.working?.length ? 1 : 0));
  const ordered = [...data.rooms].sort((a, b) => weight(b) - weight(a));
  ui.list.replaceChildren(...ordered.map(drawRoom));
  ui.empty.hidden = data.rooms.length > 0;
  ui.empty.textContent = t('No project is open on your Mac. Open MADRE in a project there and it appears here.');
  ui.stop.hidden = !data.rooms.some((room) => room.working?.length);
  ui.foot.textContent = t('Your projects run on your Mac. This phone reaches them over your Wi-Fi.');
  drawCarry(data.handoff, data.rooms);
}

function translateStatic() {
  document.querySelector('.salas-title').textContent = t('Home');
  ui.stop.querySelector('span').textContent = arming ? t('Touch again to stop') : t('Stop all');
}

ui.stop.addEventListener('click', async () => {
  if (!arming) {
    ui.stop.classList.add('armed');
    arming = setTimeout(() => { arming = 0; ui.stop.classList.remove('armed'); translateStatic(); }, 3000);
    translateStatic();
    return;
  }
  clearTimeout(arming);
  arming = 0;
  ui.stop.classList.remove('armed');
  ui.stop.disabled = true;
  try { await fetch('/bridge/stop-all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); } finally { ui.stop.disabled = false; translateStatic(); await refresh(); }
});

// Right after pairing: it worked, and how to keep MADRE on the home screen.
function welcome() {
  if (!new URLSearchParams(location.search).has('listo')) return;
  history.replaceState(null, '', '/salas');
  const apple = /iPhone|iPad|Macintosh/i.test(navigator.userAgent);
  $('salas-welcome-title').textContent = t('Done. Your Mac is on your phone.');
  $('salas-welcome-text').textContent = t('To open MADRE like an app, add it to your home screen:');
  const steps = apple
    ? [t('Touch Share, at the bottom of Safari.'), t('Choose «Add to Home Screen».')]
    : [t('Touch the ⋮ menu of your browser.'), t('Choose «Add to Home screen».')];
  $('salas-welcome-steps').replaceChildren(...steps.map((step) => el('li', null, step)));
  $('salas-welcome-ok').textContent = t('Got it');
  $('salas-welcome-ok').onclick = () => { ui.welcome.hidden = true; };
  ui.welcome.hidden = false;
}

function tick() {
  clearInterval(timer);
  if (document.visibilityState !== 'visible') return;
  timer = setInterval(() => { void refresh(); }, 4000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh(); tick(); });

translateStatic();
await refresh();
welcome();
tick();
