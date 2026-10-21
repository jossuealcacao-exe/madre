// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The welcome of MADRE 1.0 (2026-10-11), in Home and in every project: option B of «Recorrido de
// MADRE 1.0» — a bonjour, then a window of chapters read at the person's own pace — with two
// pieces of option C: a one-line hint the first time someone reaches a place that confuses, and
// the sheet of gestures that `?` opens anywhere.
//
// Where the person is lives in ~/.pulse/tour.json (src/tour.mjs), not in this browser: every
// project is its own origin, and a flag here would be forgotten or said twice. The page tells this
// module what it can do — `go`, one function per chapter that takes the person there — and when
// it must wait (`ready`): never over a turn that runs, never before an agent is connected.
//
// The bonjour asks nothing it can answer itself. Whoever wrote in a project before came from
// 0.7.2: their projects are brought back to Home first, with the loader's real progress (one step
// per project), and the chapters tell what changed — what moved first, then what is new, each
// chapter with one line on what is different. A new person is welcomed and, in Home, handed to the
// assistant that connects agents and adds projects; then the chapters tell the essentials, in the
// order they are used (public/tour-chapters.js, ORDER).

import { LOADER_MARK, finishLoader, makeLoader, setLoader } from './loader.js';
import { keyWords, language, t } from './i18n.js';
import { CHAPTERS, GESTURES, ORDER } from './tour-chapters.js';

const say = (pair) => (typeof pair === 'string' ? pair : pair?.[language()] ?? pair?.es ?? '');
const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Up, turned for down: the way to a hint whose place is out of view.
const ARROW_UP = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15.5V4.5M5.5 9 10 4.5 14.5 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const FOLDER = '<svg viewBox="0 0 32 26" aria-hidden="true"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h7.2l3 3.2h12.8A2.5 2.5 0 0 1 30 8.7v12.8a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 21.5z" fill="currentColor"/></svg>';
const ROBOT = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4.5V8M3 13v2M21 13v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9.5" cy="13.5" r="1.3" fill="currentColor"/><circle cx="14.5" cy="13.5" r="1.3" fill="currentColor"/></svg>';

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
}
function key(className, words, act) {
  const node = el('button', className, words);
  node.type = 'button';
  node.addEventListener('click', act);
  return node;
}

const tourApi = {
  read: () => fetch('/api/tour', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  change: (change) => fetch('/api/tour', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) })
    .then((response) => (response.ok ? response.json() : null)).catch(() => null),
};

// The scenes: one short drawing per chapter, made of a few shapes that move once and loop slowly.
// With reduced motion they stand still and say the same.
const SCENES = {
  moved: () => '',
  home: () => `<div class="ts-bar"><i class="ts-logo"></i><span class="ts-pin"></span><span class="ts-pin"></span><span class="ts-pin ts-arrive"></span></div>
    <div class="ts-grid"><span class="ts-card"></span><span class="ts-card ts-lift"></span><span class="ts-card"></span><span class="ts-card ts-dim"></span></div>`,
  project: () => `<div class="ts-bar"><i class="ts-logo"></i><span style="flex:1"></span><span class="ts-key"></span><span class="ts-key ts-lamp"></span><span class="ts-key"></span><span class="ts-key"></span></div>
    <div class="ts-switch"><span class="ts-tile"><i>${FOLDER}</i></span><span class="ts-tile on"><i>${FOLDER}</i></span><span class="ts-tile"><i>${FOLDER}</i></span></div>`,
  talk: () => `<div class="ts-bubble"></div><div class="ts-bubble mine"></div>
    <div class="ts-box"><span class="ts-type"><b>@codex</b><b>#2</b><b>!app.js</b><b>/gh</b></span></div>`,
  modes: () => `<div class="ts-modes">${[0, 1, 2, 3, 4].map((n) => `<span class="ts-mode m${n}">#${n}${n >= 3 ? '<i class="ts-lock"></i>' : ''}</span>`).join('')}</div>`,
  coordinator: () => `<svg class="ts-wires" viewBox="0 0 320 150" preserveAspectRatio="none" aria-hidden="true"><path id="ts-c1" d="M160 75L60 40"/><path id="ts-c2" d="M160 75L262 42"/><path id="ts-c3" d="M160 75L160 132"/>
    ${still() ? '' : ['ts-c1', 'ts-c2', 'ts-c3'].map((id, index) => `<path d="M0 0h0" class="ts-note"><animateMotion dur="2.6s" begin="${index * 0.8}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></path>`).join('')}</svg>
    <span class="ts-node" style="left:18.75%;top:26.6%">${FOLDER}</span><span class="ts-node" style="left:81.9%;top:28%">${FOLDER}</span><span class="ts-node" style="left:50%;top:88%">${FOLDER}</span>
    <span class="ts-hub">${ROBOT}</span>`,
  links: () => `<svg class="ts-wires" viewBox="0 0 320 150" preserveAspectRatio="none" aria-hidden="true"><path id="ts-l1" class="ts-dash" d="M86 75C140 50 180 100 234 75"/>
    ${still() ? '' : [0, 0.9, 1.8].map((lag) => `<path d="M0 0h0" class="ts-note"><animateMotion dur="2.7s" begin="${lag}s" repeatCount="indefinite"><mpath href="#ts-l1"/></animateMotion></path>`).join('')}</svg>
    <span class="ts-node big" style="left:23%;top:50%">${FOLDER}</span><span class="ts-node big" style="left:77%;top:50%">${FOLDER}</span>`,
  maps: () => `<div class="ts-orbit"><i class="ts-core"></i>${[0, 1, 2, 3, 4, 5].map((n) => `<b class="ts-star s${n}"></b>`).join('')}</div>`,
  settings: () => `<div class="ts-window"><span class="ts-search"><i></i><em></em></span><div class="ts-tiles"><span></span><span></span><span></span><span></span><span></span><span></span></div></div><span class="ts-cap">⌘ ,</span>`,
  modules: () => `<div class="ts-modules">${[0, 1, 2, 3, 4, 5].map((n) => `<span class="ts-module m${n}"><i></i></span>`).join('')}</div>`,
  phone: () => `<span class="ts-mac"><i></i></span><svg class="ts-wires" viewBox="0 0 320 150" preserveAspectRatio="none" aria-hidden="true"><path id="ts-p1" class="ts-dash" d="M206 80C178 62 150 62 124 76"/>
    ${still() ? '' : '<path d="M0 0h0" class="ts-note"><animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"><mpath href="#ts-p1"/></animateMotion></path>'}</svg>
    <span class="ts-phone"><i class="ts-qr"></i></span>`,
  board: () => SCENES.home(),
  widgets: () => `<div class="ts-grid ts-widgets"><span class="ts-card"><i style="--w:.62"></i><i style="--w:.34"></i></span><span class="ts-card"><i style="--w:.8"></i><i style="--w:.5"></i></span><span class="ts-card"><i style="--w:.4"></i><i style="--w:.7"></i></span><span class="ts-card ts-dim"><i style="--w:.25"></i><i style="--w:.55"></i></span></div>`,
  local: () => SCENES.modules(),
  gestures: () => `<div class="ts-caps"><span class="ts-cap c0">⌘ ,</span><span class="ts-cap c1">Esc</span><span class="ts-cap c2">?</span></div>`,
};

// What a first-time card speaks of, lit, and the rest of the page a shade quieter: the card needs
// no beak to say where it points (2026-10-15). A ring laid over the place, never the place itself
// lifted (a key inside the bar cannot leave the bar's layer). `place()` follows it when it moves;
// `remove()` takes it away with the card.
export function spotlight(node) {
  const none = { place() {}, remove() {} };
  if (!node?.getBoundingClientRect || typeof document === 'undefined') return none;
  const spot = document.createElement('div');
  spot.className = 'hint-spot';
  spot.setAttribute('aria-hidden', 'true');
  document.body.append(spot);
  const place = () => {
    if (!node.isConnected) { remove(); return; }
    const box = node.getBoundingClientRect();
    spot.hidden = !box.width && !box.height;
    if (spot.hidden) return;
    const radius = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) || 10;
    Object.assign(spot.style, { left: `${box.left - 4}px`, top: `${box.top - 4}px`, width: `${box.width + 8}px`, height: `${box.height + 8}px`, borderRadius: `${Math.min(radius + 4, (box.height + 8) / 2)}px` });
  };
  function remove() {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    spot.remove();
  }
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  place();
  return { place, remove, node: spot };
}

// `onChange` hears the kept state each time it is known or changes (null if it could not be read).
// `phone`: none of it here (a phone, or the right half of a split window); `device`: this page is a
// phone, which gets one card the first time instead of the bonjour.
// `hidden`: the chapters whose thing is not offered on this copy; they are not told at all.
export function startTour({ page, go = {}, ready = () => true, phone = false, device = false, pillSlot = null, welcome = null, onProjects = null, onChange = null, hidden = () => [] } = {}) {
  let info = null;
  let state = null;
  let windowNode = null;
  let sheetNode = null;
  let hintNode = null;
  let current = null;
  const loaded = (phone ? Promise.resolve(null) : tourApi.read()).then((answer) => {
    info = answer;
    state = answer?.state ?? null;
    paintPill();
    onChange?.(state);
    return answer;
  });
  const keep = async (change) => {
    const answer = await tourApi.change(change);
    if (answer?.state) state = answer.state;
    paintPill();
    onChange?.(state);
    return state;
  };
  // Three people (src/tour.mjs): new, back from 0.7.2, or back from 1.0 (`since`).
  const path = () => state?.path ?? (info?.from === '1.0' ? 'since' : info?.returning ? 'back' : 'new');
  const chapters = () => (ORDER[path()] ?? ORDER.new).filter((id) => !hidden().includes(id)).map((id) => CHAPTERS.find((chapter) => chapter.id === id)).filter((chapter) => chapter && (!chapter.only || chapter.only === language()));
  const busyWith = () => Boolean(windowNode?.open || sheetNode?.open || document.querySelector('dialog.tour-bonjour[open]'));

  // ---- One tab at a time. The tab that shows the bonjour or the chapters holds the tour and says
  // so every few seconds (src/tour.mjs, HELD_MS); another tab that finds it held says it is open
  // there, with a way to go on here, instead of a second bonjour. Tabs are different origins (one
  // port per project), so this is told through ~/.pulse, not between the tabs.
  const tab = `tab-${String(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '').slice(0, 24)}`;
  let holding = 0;
  const hold = () => {
    if (holding || phone) return;
    void keep({ hold: tab });
    holding = setInterval(() => { void tourApi.change({ hold: tab }); }, 15000);
  };
  const letGo = () => {
    if (!holding) return;
    clearInterval(holding);
    holding = 0;
    void fetch('/api/tour', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ release: tab }) }).catch(() => null);
  };
  const letGoIfDone = () => setTimeout(() => { if (!busyWith()) letGo(); }, 0);
  const heldElsewhere = (kept) => Boolean(kept?.held && kept.held.by !== tab && Date.now() - Date.parse(kept.held.at) < 45000);
  globalThis.addEventListener?.('pagehide', letGo);

  // ---- A bubble that says something once, near the top, with its keys: the card of the phone,
  // the tour open in another tab.
  function notice({ id, title, lines = [], actions = [] }) {
    document.querySelector(`.tour-notice[data-id="${id}"]`)?.remove();
    const card = el('section', 'tour-notice');
    card.dataset.id = id;
    card.setAttribute('role', 'status');
    card.append(el('b', null, title));
    for (const line of lines) card.append(el('p', null, line));
    const acts = el('div', 'tour-notice-acts');
    for (const [words, act, primary] of actions) acts.append(key(`tour-btn small${primary ? ' primary' : ' quiet'}`, words, () => { card.remove(); act?.(); }));
    card.append(acts);
    if (typeof card.showPopover === 'function') card.popover = 'manual';
    document.body.append(card);
    try { card.showPopover?.(); } catch { /* not a popover: on the page */ }
    return card;
  }
  function elsewhere() {
    notice({
      id: 'elsewhere',
      title: t('The tour is open in another tab'),
      lines: [t('It goes on there. If you closed that tab, go on here.')],
      actions: [[t('Not now'), null, false], [t('Go on here'), () => { if (!state?.bonjourAt) showBonjour(); else openChapters(state.at); }, true]],
    });
  }
  // The phone, the first time: what it does and what stays on the Mac, in three sentences. A phone
  // changes nothing in ~/.pulse, so this one is remembered by the phone itself.
  const PHONE_CARD = 'madre.phone.welcome';
  function phoneCard() {
    try { if (localStorage.getItem(PHONE_CARD)) return; } catch { return; }
    notice({
      id: 'phone',
      title: t('MADRE on your phone'),
      lines: [
        t('Here you follow your projects and talk to your agents, up to #2.'),
        t('#3 and #4, permissions and anything that installs stay on the Mac.'),
        t('What you start here you carry on on the Mac, and the other way round.'),
      ],
      actions: [[t('Got it'), () => { try { localStorage.setItem(PHONE_CARD, '1'); } catch { /* asked again next time */ } }, true]],
    });
  }
  if (device) setTimeout(phoneCard, 1200);

  // ---- The pill: «Continue the tour · 4 of 12», while there is a tour to continue.
  function paintPill() {
    if (!pillSlot) return;
    pillSlot.replaceChildren();
    const list = chapters();
    const show = state?.bonjourAt && !state.finished && !windowNode?.open && !phone;
    pillSlot.hidden = !show;
    if (!show) return;
    const done = list.filter((chapter) => state.done.includes(chapter.id)).length;
    const pill = el('span', 'tour-pill');
    const open = key('tour-pill-go', fill(t('Continue the tour · {n} of {total}'), { n: done, total: list.length }), () => openChapters(state.at));
    // On a narrow bar it says only where it goes and how far (styles.css, .tour-pill-go[data-short]).
    open.dataset.short = fill(t('Tour · {n}/{total}'), { n: done, total: list.length });
    const away = key('tour-pill-x', null, () => { void keep({ finished: true }); });
    away.innerHTML = CLOSE_ICON; // trusted: our own SVG string
    away.setAttribute('aria-label', t('Hide the tour'));
    away.title = t('Hide the tour. It stays in Settings.');
    pill.append(open, away);
    pillSlot.append(pill);
  }

  // ---- The bonjour.
  async function maybeBonjour() {
    const answer = await loaded;
    if (!answer?.owed || phone) return false;
    // Never over work in progress, a window the person opened, or an agent not yet connected.
    for (let tries = 0; tries < 720 && (!ready() || document.querySelector('dialog[open]')); tries += 1) await new Promise((resolve) => setTimeout(resolve, 500));
    if (!ready() || document.querySelector('dialog[open]')) return false;
    // Asked again now: another tab may have shown it while this one waited.
    const fresh = await tourApi.read();
    if (fresh?.state) state = fresh.state;
    if (!fresh?.owed) return false;
    if (heldElsewhere(fresh.state)) { elsewhere(); return false; }
    showBonjour();
    return true;
  }
  function showBonjour() {
    hold();
    const since = path() === 'since';
    const back = path() === 'back';
    const node = el('dialog', 'tour-bonjour');
    node.setAttribute('aria-labelledby', 'tour-bonjour-title');
    const stage = el('div', 'tour-bonjour-stage');
    const mark = el('span', 'madre-loader-mark tour-hello-mark');
    mark.innerHTML = LOADER_MARK; // trusted: our own SVG string
    const title = el('h1', 'tour-hello', back || since ? t('Hello again.') : t('Hello.'));
    title.id = 'tour-bonjour-title';
    const body = el('p', 'tour-hello-says', since
      ? t('Since 1.0, Home became a board you arrange, with widgets; the local AI is chosen project by project, and MADRE speaks more plainly. I tell you what changed, at your own pace.')
      : back
        ? t('MADRE changed a lot since 0.7.2. First I bring your projects to Home; then I tell you what is new, at your own pace.')
        : t('This is MADRE: all your AI agents in one place, with your projects, their memory and your permissions.'));
    const note = el('p', 'tour-hello-note');
    if (since) note.textContent = t('Nothing you set up changed: your projects, agents and permissions are as you left them.');
    else if (back) note.innerHTML = t('<code>madre</code> now opens Home; <code>madre start</code> still opens the project in the folder.'); // trusted: our own catalogue
    else note.textContent = page === 'home' && welcome?.needed?.() ? t('First we get an agent and a project ready; then I tell you the essentials, at your own pace.') : t('I tell you the essentials in a few short chapters, at your own pace.');
    const acts = el('div', 'tour-hello-acts');
    const later = key('tour-btn quiet', t('Later'), async () => {
      await keep({ path: path(), bonjour: true, closed: true });
      node.close();
      // The chapters can wait; the projects cannot (2026-10-12): left for later, someone coming from
      // 0.7.2 found Home empty and nothing offered to bring them again. They come quietly.
      if (back) void recoverProjects().then(({ found }) => { if (found.length) onProjects?.(); });
    });
    const onward = key('tour-btn primary', back || since ? t('Continue') : t('Start'), async () => {
      later.disabled = true; onward.disabled = true;
      await keep({ path: path(), bonjour: true });
      void fetch('/api/whats-new/seen', { method: 'POST' }).catch(() => null); // the chapters replace What's new 1.0
      if (back) { await bringProjects(stage); return; }
      node.close();
      if (since) { openChapters(chapters()[0]?.id ?? null); return; }
      if (page === 'home' && welcome?.needed?.()) welcome.open(() => openChapters('home'));
      else openChapters(page === 'home' ? 'home' : 'project');
    });
    acts.append(later, onward);
    stage.append(mark, title, body, note, acts);
    node.append(stage);
    node.addEventListener('cancel', (event) => { event.preventDefault(); later.click(); });
    node.addEventListener('close', () => { letGoIfDone(); setTimeout(() => node.remove(), 400); });
    document.body.append(node);
    node.showModal();
    onward.focus();
  }

  // ---- 0.7.2: the projects Home cannot list, brought back one by one, the loader saying how far.
  async function recoverProjects(step = () => {}) {
    const rooms = (await fetch('/api/tour/projects', { cache: 'no-store' }).then((response) => response.json()).catch(() => null))?.rooms ?? [];
    const found = [];
    const missing = [];
    for (const [index, room] of rooms.entries()) {
      step(index, rooms.length);
      const answer = await fetch('/api/tour/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: room.id }) })
        .then((response) => (response.ok ? response.json() : null)).catch(() => null);
      if (answer?.found) found.push(answer.name); else missing.push(room.name);
    }
    return { found, missing };
  }
  async function bringProjects(stage) {
    const loader = makeLoader({ progress: 0.04, label: t('Looking for your projects of 0.7.2…') });
    stage.replaceChildren(loader);
    const { found, missing } = await recoverProjects((index, total) => setLoader(loader, 0.08 + (0.84 * index) / Math.max(1, total), fill(t('Bringing your projects of 0.7.2 · {n} of {total}'), { n: index + 1, total })));
    await finishLoader(loader, { hold: 380 });
    if (found.length) onProjects?.();
    const list = (names) => new Intl.ListFormat(language(), { type: 'conjunction' }).format(names.map((name) => `«${name}»`));
    const done = el('div', 'tour-bonjour-done');
    const mark = el('span', 'madre-loader-mark tour-hello-mark');
    mark.innerHTML = LOADER_MARK; // trusted: our own SVG string
    done.append(mark, el('h1', 'tour-hello', found.length ? t('Your projects are in Home.') : t('Home is ready.')));
    done.append(el('p', 'tour-hello-says', found.length
      ? (found.length === 1 ? fill(t('I brought {list} to Home, with its conversations and its memory.'), { list: list(found) }) : fill(t('I brought {n} projects to Home, with their conversations and their memory: {list}.'), { n: found.length, list: list(found) }))
      : t('Your projects were already in Home.')));
    if (missing.length) done.append(el('p', 'tour-hello-note', missing.length === 1 ? t('One I could not find: its folder is no longer where it was. If you moved it, add it in Home and it gets back its conversations.') : fill(t('{n} I could not find: their folders are no longer where they were. If you moved them, add them in Home and they get back their conversations.'), { n: missing.length })));
    const acts = el('div', 'tour-hello-acts');
    const node = stage.closest('dialog');
    acts.append(key('tour-btn primary', t('See what is new'), () => { node.close(); openChapters('moved'); }));
    done.append(acts);
    stage.replaceChildren(done);
    acts.firstChild.focus();
  }

  // ---- The chapters.
  function openChapters(at = null) {
    const list = chapters();
    current = list.find((chapter) => chapter.id === at) ?? list.find((chapter) => !state?.done.includes(chapter.id)) ?? list[0];
    if (!windowNode) build();
    hold();
    if (!windowNode.open) windowNode.showModal();
    paintPill();
    show(current);
  }
  function build() {
    windowNode = el('dialog', 'whats-new tour-window');
    windowNode.setAttribute('aria-labelledby', 'tour-window-title');
    const sheet = el('div', 'wn-sheet tour-sheet');
    const head = el('header', 'tour-head');
    const words = el('div', 'tour-head-words');
    const title = el('h2');
    title.id = 'tour-window-title';
    words.append(el('span', 'wn-eyebrow'), title);
    const close = key('tour-close', null, () => windowNode.close());
    close.innerHTML = CLOSE_ICON; // trusted: our own SVG string
    close.setAttribute('aria-label', t('Close'));
    head.append(words, close);
    const body = el('div', 'tour-body');
    const nav = el('ol', 'tour-nav');
    nav.setAttribute('aria-label', t('Chapters'));
    const main = el('section', 'tour-main');
    main.setAttribute('aria-live', 'polite');
    body.append(nav, main);
    sheet.append(head, body);
    windowNode.append(sheet);
    windowNode.addEventListener('close', () => {
      letGoIfDone();
      const list = chapters();
      const all = list.every((chapter) => state?.done.includes(chapter.id));
      void keep(all ? { finished: true } : { closed: true });
    });
    windowNode.addEventListener('keydown', (event) => {
      if (event.target.closest?.('input, textarea')) return;
      const list = chapters();
      const index = list.indexOf(current);
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); show(list[Math.min(list.length - 1, index + 1)]); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); show(list[Math.max(0, index - 1)]); }
    });
    document.body.append(windowNode);
  }
  function show(shown) {
    const chapter = shown;
    current = shown;
    const back = path() === 'back';
    const since = path() === 'since';
    windowNode.querySelector('.tour-head .wn-eyebrow').textContent = since ? t('What is new since 1.0') : back ? t('The tour of MADRE 1.0') : t('Getting to know MADRE');
    windowNode.querySelector('#tour-window-title').textContent = since ? t('What changed, at your pace') : back ? t('Everything new, at your pace') : t('The essentials, at your pace');
    void keep({ chapter: chapter.id, at: chapter.id });
    if (!state.done.includes(chapter.id)) state.done = [...state.done, chapter.id];
    const list = chapters();
    const index = list.indexOf(shown);
    const nav = windowNode.querySelector('.tour-nav');
    nav.replaceChildren(...list.map((one, at) => {
      const item = el('li');
      const pick = key(`tour-nav-key${one === shown ? ' on' : ''}${state.done.includes(one.id) ? ' done' : ''}`, null, () => show(one));
      pick.append(el('span', 'tour-nav-n', String(at + 1)), el('span', 'tour-nav-name', say(one.title)));
      if (one === shown) pick.setAttribute('aria-current', 'step');
      item.append(pick);
      return item;
    }));
    const main = windowNode.querySelector('.tour-main');
    const page2 = el('article', `tour-chapter c-${chapter.id}`);
    const scene = el('div', `tour-scene s-${chapter.id}${chapter.moved ? ' s-table' : ''}`);
    scene.setAttribute('aria-hidden', 'true');
    if (chapter.moved) {
      const table = el('div', 'ts-moved');
      for (const [was, now] of chapter.moved) {
        const line = el('div', 'ts-moved-row');
        line.append(el('span', 'was', say(was)), el('i', null, '→'), el('span', 'now', say(now)));
        table.append(line);
      }
      scene.append(table);
    } else scene.innerHTML = SCENES[chapter.id]?.() ?? ''; // trusted: our own markup
    const words = el('div', 'tour-words');
    words.append(el('span', 'tour-step', fill(t('{n} of {total}'), { n: index + 1, total: list.length })), el('h3', null, say(chapter.title)));
    // Whoever came from 0.7.2 reads first what is new or different here.
    if (back && chapter.news) {
      const news = el('p', `tour-news ${chapter.news.kind}`);
      const said = el('span');
      said.innerHTML = say(chapter.news); // trusted: our own copy
      news.append(el('b', 'tour-news-tag', chapter.news.kind === 'new' ? t('New in 1.0') : t('Changed in 1.0')), said);
      words.append(news);
    }
    // Whoever came from 1.0 reads first what is new or different since.
    if (since && chapter.since) {
      const news = el('p', `tour-news ${chapter.since.kind}`);
      const said = el('span');
      said.innerHTML = say(chapter.since); // trusted: our own copy
      news.append(el('b', 'tour-news-tag', chapter.since.kind === 'new' ? t('New since 1.0') : t('Changed since 1.0')), said);
      words.append(news);
    }
    words.append(el('p', 'tour-lead', say(chapter.lead)));
    const points = chapter.points?.[language()] ?? chapter.points?.es ?? [];
    if (points.length) {
      const ul = el('ul', 'tour-points');
      for (const point of points) { const item = el('li'); item.innerHTML = point; ul.append(item); } // trusted: our own copy
      words.append(ul);
    }
    if (chapter.id === 'gestures') words.append(gestureGrid());
    else if (chapter.keys?.length) {
      const keys = el('dl', 'tour-keys');
      for (const [what, how] of chapter.keys) keys.append(el('dt', null, say(what)), el('dd', null, keyWords(say(how))));
      words.append(keys);
    }
    const acts = el('div', 'tour-acts');
    const here = typeof go[chapter.id] === 'function';
    if (here) {
      acts.append(key('tour-btn', t('Take me there'), () => {
        void keep({ at: chapter.id, closed: true });
        windowNode.close();
        setTimeout(() => go[chapter.id](), 60);
      }));
    } else if (chapter.where?.includes(page)) {
      acts.append(el('span', 'tour-where', t('It is right here, on this screen.')));
    } else if (chapter.where?.length) {
      acts.append(el('span', 'tour-where', chapter.where.includes('room') ? t('You try this inside a project.') : t('You try this in Home.')));
    }
    acts.append(el('span', 'tour-gap'));
    if (index > 0) acts.append(key('tour-btn quiet', t('Back'), () => show(list[index - 1])));
    if (index < list.length - 1) acts.append(key('tour-btn primary', t('Next chapter'), () => show(list[index + 1])));
    else acts.append(key('tour-btn primary', t('Finish'), () => { void keep({ finished: true }); windowNode.close(); }));
    words.append(acts);
    page2.append(scene, words);
    main.replaceChildren(page2);
    main.scrollTop = 0;
    acts.querySelector('.tour-btn.primary')?.focus({ preventScroll: true });
  }

  // ---- `?`: the sheet of gestures, anywhere. Its keys are the keyboard's in front of the person:
  // ⌘ on a Mac, Ctrl+ anywhere else.
  function gestureGrid() {
    const grid = el('div', 'tour-gestures');
    for (const [group, rows] of GESTURES) {
      const box = el('section', 'tour-gesture-group');
      box.append(el('h4', null, say(group)));
      const keys = el('dl', 'tour-keys');
      for (const [what, how] of rows) keys.append(el('dt', null, say(what)), el('dd', null, keyWords(say(how))));
      box.append(keys);
      grid.append(box);
    }
    return grid;
  }
  function openGestures() {
    if (windowNode?.open) { show(chapters().find((chapter) => chapter.id === 'gestures')); return; }
    if (!sheetNode) {
      sheetNode = el('dialog', 'whats-new tour-gesture-window');
      sheetNode.setAttribute('aria-labelledby', 'tour-gestures-title');
      const sheet = el('div', 'wn-sheet tour-sheet tour-gesture-sheet');
      const head = el('header', 'tour-head');
      const words = el('div', 'tour-head-words');
      words.append(el('span', 'wn-eyebrow', t('Press ? at any moment')));
      const title = el('h2', null, t('Gestures and shortcuts'));
      title.id = 'tour-gestures-title';
      words.append(title);
      const close = key('tour-close', null, () => sheetNode.close());
      close.innerHTML = CLOSE_ICON; // trusted: our own SVG string
      close.setAttribute('aria-label', t('Close'));
      head.append(words, close);
      const body = el('div', 'tour-gesture-body');
      body.append(gestureGrid());
      sheet.append(head, body);
      sheetNode.append(sheet);
      sheetNode.addEventListener('click', (event) => { if (event.target === sheetNode) sheetNode.close(); });
      document.body.append(sheetNode);
    }
    if (!sheetNode.open) sheetNode.showModal();
  }
  const typing = (target) => Boolean(target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  if (!phone) {
    document.addEventListener('keydown', (event) => {
      if (event.key !== '?' || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (sheetNode?.open) { sheetNode.close(); return; }
      event.preventDefault();
      openGestures();
    });
  }

  // ---- The hints: one line, once, the first time someone reaches a place that confuses. Never
  // two at once, never over the bonjour or the chapters, never before the bonjour was seen.
  // `inside`: the hint goes into that box, at its top (a window that is modal, where a card
  // floating over the page could not be pressed); it counts as seen when the box closes.
  async function hint(id, anchor, { title, text, inside = false }) {
    const answer = await loaded;
    // Nor over a card of the room's news (app.js, .hint-card): two at once covered each other.
    if (phone || !answer || !state?.bonjourAt || state.hints?.[id] || hintNode || busyWith() || document.querySelector('.hint-card')) return false;
    if (!anchor?.isConnected) return false;
    const box = anchor.getBoundingClientRect();
    if (!inside && !box.width && !box.height) return false;
    const card = el('section', `tour-hint${inside ? ' inline' : ''}`);
    card.setAttribute('role', 'note');
    card.append(el('span', 'tour-hint-eyebrow', t('The first time')), el('b', null, title), el('p', null, text));
    let spot = null;
    let away = null;
    let follow = null;
    const done = () => {
      if (!hintNode) return;
      void keep({ hint: id });
      spot?.remove();
      card.remove();
      away?.remove();
      hintNode = null;
      document.removeEventListener('keydown', onKey, true);
      if (follow) { window.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow); }
    };
    // Esc puts away the hint in sight, or the one its way-there key speaks of; one hidden under a
    // layer (the Project map) is not the one meant.
    const shown = (node) => Boolean(node?.isConnected) && getComputedStyle(node).display !== 'none';
    const onKey = (event) => { if (event.key === 'Escape' && hintNode && !inside && (shown(card) || shown(away))) { event.stopPropagation(); done(); } };
    card.append(key('tour-btn small primary', t('Got it'), done));
    hintNode = card;
    if (inside) {
      anchor.prepend(card);
      anchor.closest('dialog')?.addEventListener('close', done, { once: true });
      return true;
    }
    if (typeof card.showPopover === 'function') card.popover = 'manual';
    document.body.append(card);
    try { card.showPopover?.(); } catch { /* not a popover: on the page */ }
    // A bubble beside the place it speaks of, with no beak: under it when there is room, over it
    // otherwise, lined up with the side of the screen the place is on, never off the screen.
    const width = Math.min(300, window.innerWidth - 24);
    card.style.width = `${width}px`;
    const height = card.getBoundingClientRect().height;
    // When the place is scrolled out of view (or was never in it: a widget below the fold), the
    // bubble does not stay behind on its own, out of reach (2026-10-17): it steps aside, and a key at
    // the edge the place went past says where it is and takes the page there.
    away = key('tour-hint-away', '', () => anchor.scrollIntoView?.({ block: 'center', behavior: still() ? 'auto' : 'smooth' }));
    away.hidden = true;
    if (typeof away.showPopover === 'function') away.popover = 'manual';
    document.body.append(away);
    const sayAway = (up) => {
      away.dataset.side = up ? 'up' : 'down';
      away.innerHTML = ARROW_UP; // trusted: our own SVG string
      away.append(el('b', null, title), el('span', null, up ? t('Scroll up to see it') : t('Scroll down to see it')));
      away.setAttribute('aria-label', `${title} · ${up ? t('Scroll up to see it') : t('Scroll down to see it')}`);
    };
    const place = () => {
      if (!anchor.isConnected) { done(); return; }
      const at = anchor.getBoundingClientRect();
      const out = at.bottom < 8 ? 'up' : at.top > window.innerHeight - 8 ? 'down' : null;
      card.hidden = Boolean(out);
      if (out && away.dataset.side !== out) sayAway(out === 'up');
      if (out && away.hidden) { away.hidden = false; try { away.showPopover?.(); } catch { /* on the page */ } }
      if (!out && !away.hidden) { away.hidden = true; delete away.dataset.side; try { away.hidePopover?.(); } catch { /* on the page */ } }
      if (out) return;
      const onTheRight = at.left + at.width / 2 > window.innerWidth / 2;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, onTheRight ? at.right - width : at.left));
      const below = at.bottom + 10 + height < window.innerHeight;
      Object.assign(card.style, { left: `${left}px`, top: `${below ? at.bottom + 10 : Math.max(12, at.top - height - 10)}px` });
    };
    spot = spotlight(anchor);
    follow = () => place();
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    place();
    // Where it points: on the page, or on a layer over it (Home's Project map). A layer opened over
    // the page hides the hints that point under it, and they come back when it closes (salas-mac.css).
    const layer = anchor.closest?.('.mv') ? 'map' : 'page';
    card.dataset.under = layer;
    away.dataset.under = layer;
    if (spot.node) spot.node.dataset.under = layer;
    document.addEventListener('keydown', onKey, true);
    return true;
  }

  // ---- What a key opens, said the first time it opens (1.1): one line beside what opened — inside
  // it when it is a modal window, where a card floating over the page could not be pressed. `opened`
  // finds what the click opened; nothing found, the line goes beside the key itself.
  function firstOpen(id, node, { opened = () => null, inside = null, title, text, after = 450 }) {
    if (!node || node.dataset.firstOpen === id) return;
    node.dataset.firstOpen = id;
    node.addEventListener('click', () => {
      if (state?.hints?.[id]) return;
      setTimeout(() => {
        const box = opened();
        const modal = Boolean(box?.closest?.('dialog')?.matches?.(':modal'));
        const into = modal ? (inside?.(box) ?? box) : null;
        void hint(id, into ?? box ?? node, { title: title(), text: text(), inside: modal });
      }, after);
    });
  }

  return {
    loaded,
    firstOpen,
    // The page changed its language after it drew the pill: the pill says it again in the new one.
    repaint: () => paintPill(),
    maybeBonjour,
    bonjour: showBonjour,
    openChapters,
    openGestures,
    hint,
    // A card the page shows itself (app.js: first touches and news) is kept as seen here, per person.
    seen: (id) => keep({ hint: id }),
    state: () => state,
    path,
  };
}
