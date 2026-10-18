// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// THE MARKET, full screen (2026-10-18). The same store in Home and in every project, shaped like the
// stores people already know: the featured modules in a carousel with their pictures, shelves by
// what they are for, a page per module with its one key, and — in Home — MODULES, where what is on
// is managed project by project.
//
// Where it opens decides what its key does. In a project, a module is turned on for that project
// (its own word in ~/.pulse/config.json, src/module-scope.mjs), and one that writes into the folder
// opens its card in the project's MODULES, where the commands are read before they run. In Home,
// a module is turned on for every project or only in the one chosen; one that writes into a folder
// opens that project, on its card. Local AI keeps its own place: Settings › Local AI.
//
// The host page hands in what only it can do: `localAi()`, `installHere(item)` (a project),
// `openProject(projectId, item)` (Home), `toast(text)` and `changed()`.

import { t, language } from './i18n.js';
import { appIcon, inMarket, loadMarket, marketEntry, marketExtras, marketFeatured, marketShelves, moduleFace } from './market.js';
import { marketArt } from './market-art.js';

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const button = (className, text, onClick) => {
  const node = el('button', className, text);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  return node;
};
const post = async (url, payload = {}) => {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  } catch (error) { return { ok: false, body: { error: error.message } }; }
};
const getJson = (url) => fetch(url, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);

const GLYPH = {
  close: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 13l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};
const glyph = (node, name) => { node.insertAdjacentHTML('afterbegin', GLYPH[name]); return node; }; // trusted: our own SVG strings

const nameOf = (item) => t(item.name ?? item.id);
const lineOf = (item) => (moduleFace(item).line ? t(moduleFace(item).line) : t(item.summary ?? ''));
const priceOf = (item) => (marketEntry(item.id).price ? `$${marketEntry(item.id).price}` : t('Free'));
const shelfOf = (item) => marketShelves().find((shelf) => shelf.id === marketEntry(item.id).shelf) ?? null;
// What its key does: a switch MADRE flips, a folder it writes into, or Local AI's own settings. A
// module from the catalog this computer does not have yet is a switch too: it is got first.
const kindOf = (item) => (item.id === 'ollama' ? 'local' : item.kind === 'remote' ? 'switch' : item.kind !== 'builtin' || marketEntry(item.id).scope === 'project' ? 'install' : 'switch');
// Whether this MADRE is new enough for a module from the catalog.
const fits = (have, need) => {
  if (!need) return true;
  const parts = (value) => String(value).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parts(have), parts(need)];
  for (let at = 0; at < 3; at += 1) if ((a[at] ?? 0) !== (b[at] ?? 0)) return (a[at] ?? 0) > (b[at] ?? 0);
  return true;
};
const hueOf = (node, item) => { const [a, b] = moduleFace(item).hue ?? []; if (a) { node.style.setProperty('--mk-a', a); node.style.setProperty('--mk-b', b); } return node; };
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let current = null;
export const marketOpen = () => Boolean(current);
export function closeMarket() { current?.close(); }

export function openMarket({ where = 'home', tab = 'shop', focus = null, project = null, host = {} } = {}) {
  if (current) { current.go({ tab, focus }); return current; }
  const home = where === 'home';
  const before = document.activeElement;
  const root = el('div', 'mk');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('Market'));
  root.tabIndex = -1;

  // The bar: leave, where you are, the search.
  const bar = el('header', 'mk-bar');
  const leave = glyph(button('mk-leave', null, () => close()), 'close');
  leave.setAttribute('aria-label', t('Close'));
  leave.title = t('Close');
  const middle = el('div', 'mk-bar-mid');
  const tabs = {};
  if (home) {
    const seg = el('div', 'mk-tabs');
    seg.setAttribute('role', 'tablist');
    for (const [id, label] of [['shop', t('Market')], ['mine', t('Modules')]]) {
      const key = button('mk-tab', label, () => go({ tab: id }));
      key.setAttribute('role', 'tab');
      tabs[id] = key;
      seg.append(key);
    }
    middle.append(seg);
  } else {
    const here = el('span', 'mk-here');
    here.append(el('b', null, t('Market')), el('span', null, t('for {project}', { project: project?.name ?? t('this project') })));
    middle.append(here);
  }
  // The same search as every other one in MADRE (styles.css, .settings-search).
  const search = glyph(el('label', 'settings-search mk-search'), 'search');
  const input = el('input');
  input.type = 'search';
  input.placeholder = t('Search a module, or what it does');
  input.setAttribute('aria-label', t('Search a module, or what it does'));
  input.spellcheck = false;
  search.append(input);
  bar.append(leave, middle, search);
  const main = el('main', 'mk-main');
  root.append(bar, main);
  document.body.append(root);
  document.documentElement.classList.add('mk-open');
  requestAnimationFrame(() => root.classList.add('in'));

  let items = [];
  let scope = { projects: [], modules: [] };
  let view = { tab, focus };
  let timer = null;
  const said = (node, text, tone = '') => { node.textContent = text ?? ''; node.dataset.tone = tone; };
  // What went well is said by the page's own notice, the same pill as everywhere else, raised over
  // the Market while it is open (styles.css, html.mk-open .toast).
  const notice = (text) => host.toast?.(text);

  let madre = null;
  const load = async () => {
    const [extensions, scoped, market] = await Promise.all([getJson('/api/extensions'), home ? getJson('/api/modules/scope') : null, loadMarket({ toast: notice })]);
    madre = market?.madre ?? madre;
    items = (extensions?.extensions ?? []).filter(inMarket);
    items = [...items, ...marketExtras(items)];
    if (scoped) scope = scoped;
  };
  // A module from the catalog is got first — its signed file, checked, for every project — and
  // then turned on wherever the person said.
  const fetchFirst = async (item, line) => {
    if (item.kind !== 'remote') return item;
    said(line, t('Getting {name} from the Market…', { name: nameOf(item) }));
    const answer = await post('/api/market/install', { id: item.id });
    if (!answer.ok) throw new Error(answer.body.error ?? t('{name} could not be installed.', { name: nameOf(item) }));
    await load();
    return items.find((one) => one.id === item.id && one.kind !== 'remote') ?? item;
  };
  const scopeOf = (item) => scope.modules.find((one) => one.id === item.id) ?? null;
  const projectName = (id) => scope.projects.find((one) => one.id === id)?.name ?? id;
  // Whether a module is on: here, in a project; anywhere, in Home.
  const isOn = (item) => {
    if (!home || kindOf(item) === 'local') return Boolean(item.status?.installed);
    const mine = scopeOf(item);
    return mine ? (mine.on?.length ?? 0) > 0 || (kindOf(item) === 'switch' && !scope.projects.length && mine.all) : Boolean(item.status?.installed);
  };
  const reach = (item) => {
    const mine = scopeOf(item);
    if (!home) return item.scope?.all && item.scope?.here === null ? t('On in all your projects') : isOn(item) ? t('On in this project') : t('Off in this project');
    if (kindOf(item) === 'local') return isOn(item) ? t('On on this computer') : t('Off on this computer');
    if (kindOf(item) === 'install') return mine?.on?.length ? t('Installed in {n} of {total} projects', { n: mine.on.length, total: scope.projects.length }) : t('Not installed in any project');
    if (!mine) return isOn(item) ? t('Turned on') : t('Off in every project');
    if (mine.everywhere || (mine.all && !scope.projects.length)) return t('On in all your projects');
    return mine.on.length ? t('On in {n} of {total} projects', { n: mine.on.length, total: scope.projects.length }) : t('Off in every project');
  };
  const refresh = async () => { await load(); host.changed?.(); render(); };

  // ACTIONS. Each says what happened in the line under the key, and on the page when it went well.
  const turnHere = async (given, on, line, key) => {
    key.disabled = true;
    let item = given;
    try { item = await fetchFirst(given, line); } catch (error) { key.disabled = false; said(line, error.message, 'bad'); return; }
    said(line, on && item.id === 'playwright' ? t('Getting the test browser ready: MADRE downloads what it is missing. It can take a few minutes.') : t('One moment…'));
    const answer = await post(`/api/extensions/${encodeURIComponent(item.id)}/install`, { confirm: true });
    if (!answer.ok) { key.disabled = false; said(line, answer.body.error ?? t('{name} could not be turned on or off.', { name: nameOf(item) }), 'bad'); return; }
    notice(on ? t('{name} is on in this project.', { name: nameOf(item) }) : t('{name} is off in this project.', { name: nameOf(item) }));
    await refresh();
  };
  const turnScope = async (given, change, line, key) => {
    key.disabled = true;
    let item = given;
    try { item = await fetchFirst(given, line); } catch (error) { key.disabled = false; said(line, error.message, 'bad'); return false; }
    const turningOn = change.all === true || Object.values(change.rooms ?? {}).includes(true);
    said(line, turningOn && item.id === 'playwright' ? t('Getting the test browser ready: MADRE downloads what it is missing. It can take a few minutes.') : t('One moment…'));
    const answer = await post(`/api/extensions/${encodeURIComponent(item.id)}/scope`, { ...change, confirm: true });
    if (!answer.ok) { key.disabled = false; said(line, answer.body.error ?? t('{name} could not be turned on or off.', { name: nameOf(item) }), 'bad'); return false; }
    await refresh();
    return true;
  };

  // The key a row and a page share: what one press does, for this module, here.
  const getKey = (item, { onPage = false } = {}) => {
    const on = isOn(item);
    const kind = kindOf(item);
    if (kind === 'local') return button('mk-get', t('Open'), () => { close(); host.localAi?.(); });
    if (!onPage) {
      // On a shelf the key is short: what is on says so and opens its page; what is off gets it.
      if (on) return button('mk-get on', kind === 'install' ? t('Installed') : t('Turned on'), () => go({ tab: 'shop', focus: item.id }));
      if (!home && kind === 'switch') {
        const key = button('mk-get', t('Get'), async (event) => { event.stopPropagation(); const line = el('span'); await turnHere(item, true, line, key); if (line.dataset.tone === 'bad') { notice(line.textContent); key.disabled = false; } });
        return key;
      }
      if (!home && kind === 'install') return button('mk-get', t('Install'), () => { close(); host.installHere?.(item); });
      return button('mk-get', kind === 'install' ? t('Install') : t('Get'), () => go({ tab: 'shop', focus: item.id, choose: true }));
    }
    return null;
  };

  const row = (item) => {
    const line = el('div', 'mk-row');
    const open = button('mk-row-open', null, () => go({ tab: 'shop', focus: item.id }));
    const words = el('span', 'mk-row-words');
    words.append(el('b', null, nameOf(item)), el('span', null, lineOf(item)));
    open.append(appIcon(item, 58), words);
    const side = el('span', 'mk-row-side');
    side.append(getKey(item), el('small', null, isOn(item) ? '' : priceOf(item)));
    line.append(open, side);
    return line;
  };

  // THE CAROUSEL: the featured modules, each on its own colors with its picture.
  const carousel = () => {
    const featured = marketFeatured(items);
    if (!featured.length) return null;
    const box = el('section', 'mk-carousel');
    box.setAttribute('aria-roledescription', t('carousel'));
    box.setAttribute('aria-label', t('Featured'));
    const track = el('div', 'mk-track');
    const dots = el('div', 'mk-dots');
    let index = 0;
    featured.forEach((item, at) => {
      const slide = hueOf(el('article', 'mk-slide'), item);
      slide.setAttribute('aria-roledescription', t('slide'));
      slide.setAttribute('aria-label', t('{n} of {total}', { n: at + 1, total: featured.length }));
      const words = el('div', 'mk-slide-words');
      const get = el('div', 'mk-slide-get');
      const who = el('span', 'mk-slide-who');
      who.append(el('b', null, nameOf(item)), el('span', null, isOn(item) ? reach(item) : priceOf(item)));
      get.append(appIcon(item, 48), who, button('mk-get light', isOn(item) ? t('See it') : kindOf(item) === 'install' ? t('Install') : kindOf(item) === 'local' ? t('Open') : t('Get'), (event) => { event.stopPropagation(); go({ tab: 'shop', focus: item.id, choose: !isOn(item) }); }));
      words.append(el('small', null, t('Featured')), el('h2', null, nameOf(item)), el('p', null, t(marketEntry(item.id).pitch ?? lineOf(item))), get);
      const art = el('div', 'mk-slide-art');
      art.innerHTML = marketArt(item); // trusted: our own drawings (market-art.js)
      slide.append(words, art);
      slide.addEventListener('click', () => go({ tab: 'shop', focus: item.id }));
      track.append(slide);
      const dot = button('mk-dot', null, () => show(at));
      dot.setAttribute('aria-label', t('{n} of {total}', { n: at + 1, total: featured.length }));
      dots.append(dot);
    });
    const show = (at, smooth = true) => {
      index = (at + featured.length) % featured.length;
      track.scrollTo({ left: index * track.clientWidth, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
      mark();
    };
    const mark = () => { [...dots.children].forEach((dot, at) => dot.setAttribute('aria-current', String(at === index))); };
    track.addEventListener('scroll', () => { const at = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (at !== index) { index = at; mark(); } }, { passive: true });
    const prev = glyph(button('mk-arrow prev', null, () => show(index - 1)), 'back');
    const next = glyph(button('mk-arrow next', null, () => show(index + 1)), 'next');
    prev.setAttribute('aria-label', t('Previous'));
    next.setAttribute('aria-label', t('Next'));
    box.append(track, prev, next, dots);
    mark();
    // It moves on by itself, unless the person is reading it or asked for stillness.
    let resting = false;
    for (const [type, value] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) box.addEventListener(type, () => { resting = value; });
    clearInterval(timer);
    if (!reducedMotion() && featured.length > 1) timer = setInterval(() => { if (!resting && !document.hidden && box.isConnected) show(index + 1); }, 6500);
    return box;
  };

  const shop = () => {
    const words = input.value.trim().toLocaleLowerCase(language());
    const page = el('div', 'mk-page');
    if (words) {
      const found = items.filter((item) => `${nameOf(item)} ${lineOf(item)} ${t(item.summary ?? '')}`.toLocaleLowerCase(language()).includes(words));
      const head = el('section', 'mk-head');
      head.append(el('h1', null, t('Results')));
      page.append(head);
      if (!found.length) page.append(el('p', 'mk-empty', t('No module matches «{query}».', { query: input.value.trim() })));
      else { const list = el('div', 'mk-list'); for (const item of found) list.append(row(item)); page.append(list); }
      return page;
    }
    const head = el('section', 'mk-head');
    head.append(el('h1', null, t('Market')), el('p', null, home
      ? t('Modules add what MADRE does: more for your agents, less for the terminal. Free for now. From Home you choose: every project, or only one.')
      : t('Modules add what MADRE does: more for your agents, less for the terminal. Free for now. What you get here is for this project.')));
    page.append(head);
    const featured = carousel();
    if (featured) page.append(featured);
    for (const shelf of marketShelves()) {
      const mine = items.filter((item) => marketEntry(item.id).shelf === shelf.id);
      if (!mine.length) continue;
      const block = el('section', 'mk-shelf');
      const title = el('header');
      title.append(el('h2', null, t(shelf.title)), el('p', null, t(shelf.about)));
      const list = el('div', 'mk-list');
      for (const item of mine) list.append(row(item));
      block.append(title, list);
      page.append(block);
    }
    return page;
  };

  // A MODULE'S PAGE: its icon, its key, what it costs and where it works, its picture, what it
  // does and what it touches.
  const detail = (item, { choose = false } = {}) => {
    const page = el('div', 'mk-page mk-product');
    page.append(glyph(button('mk-back', t('Market'), () => go({ tab: 'shop' })), 'back'));
    const top = el('section', 'mk-product-top');
    const words = el('div', 'mk-product-words');
    words.append(el('h1', null, nameOf(item)), el('p', null, lineOf(item)));
    const keys = el('div', 'mk-keys');
    const line = el('p', 'mk-said');
    words.append(keys, line);
    top.append(appIcon(item, 128), words);
    page.append(top);
    drawKeys(item, keys, line, { choose });

    const facts = el('dl', 'mk-facts');
    const fact = (label, value) => { const one = el('div'); one.append(el('dt', null, label), el('dd', null, value)); facts.append(one); };
    fact(t('Price'), priceOf(item));
    fact(home ? t('Where') : t('Here'), reach(item));
    if (shelfOf(item)) fact(t('Shelf'), t(shelfOf(item).title));
    fact(t('Version'), item.version ? `v${String(item.version).replace(/^v/, '')}` : '—');
    page.append(facts);

    const gallery = el('section', 'mk-section');
    gallery.append(el('h2', null, t('Preview')));
    const shot = hueOf(el('div', 'mk-shot'), item);
    shot.innerHTML = marketArt(item); // trusted: our own drawings (market-art.js)
    gallery.append(shot);
    page.append(gallery);
    if (item.summary) {
      const about = el('section', 'mk-section');
      about.append(el('h2', null, t('What it does')), el('p', 'mk-about', t(item.summary)));
      page.append(about);
    }
    const touches = [...(item.creates ?? []).map((text) => [t('Writes'), t(text)]), ...(item.requires ?? []).map((text) => [t('Needs'), t(text)])];
    if (touches.length) {
      const block = el('section', 'mk-section');
      block.append(el('h2', null, t('What it touches')));
      const list = el('div', 'mk-touches');
      for (const [kind, text] of touches) { const one = el('div', 'mk-touch'); one.append(el('span', null, kind), el('span', null, text)); list.append(one); }
      block.append(list);
      page.append(block);
    }
    return page;
  };

  const projectPicker = (ids) => {
    const select = el('select', 'mk-select');
    select.setAttribute('aria-label', t('Project'));
    for (const id of ids) { const option = el('option', null, projectName(id)); option.value = id; select.append(option); }
    return select;
  };
  const drawKeys = (item, keys, line, { choose = false } = {}) => {
    keys.replaceChildren();
    const kind = kindOf(item);
    const on = isOn(item);
    if (item.preflight && !item.preflight.ok && !on) said(line, item.preflight.problems.map((problem) => t(problem)).join(' '), 'note');
    // A module from the catalog that asks for a newer MADRE says so, and waits for it.
    const needs = item.kind === 'remote' ? item.remote?.minMadre : null;
    if (needs && madre && !fits(madre, needs)) { keys.append(button('mk-get big', t('Needs MADRE {version}', { version: needs }))); keys.lastChild.disabled = true; said(line, t('Update MADRE to get this module.'), 'note'); return; }
    if (kind === 'local') { keys.append(button('mk-get big', t('Open Local AI'), () => { close(); host.localAi?.(); })); return; }
    if (!home) {
      if (kind === 'install') {
        keys.append(button(`mk-get big${on ? ' on' : ''}`, on ? t('See it in MODULES') : t('Install in this project'), () => { close(); host.installHere?.(item); }));
        if (!on) said(line, t('MADRE shows you the commands before it runs them, in this project\'s MODULES.'), 'note');
        return;
      }
      const key = button(`mk-get big${on ? ' quiet' : ''}`, on ? t('Turn off in this project') : t('Get it for this project'), () => turnHere(item, !on, line, key));
      keys.append(key);
      return;
    }
    const ids = scope.projects.map((one) => one.id);
    if (kind === 'install') {
      if (!ids.length) { said(line, t('Add a project first: this module is installed into one.'), 'note'); return; }
      const mine = scopeOf(item);
      const left = ids.filter((id) => !(mine?.on ?? []).includes(id));
      if (mine?.on?.length) keys.append(el('span', 'mk-state', t('Installed in: {projects}', { projects: mine.on.map(projectName).join(', ') })));
      if (!left.length) return;
      const select = projectPicker(left);
      const key = button('mk-get big', t('Install in this project'), async () => {
        key.disabled = true;
        said(line, t('Opening the project…'));
        const ok = await host.openProject?.(select.value, item);
        key.disabled = false;
        said(line, ok ? t('It opened in a new tab, on this module: MADRE shows you the commands there before it runs them.') : t('That project did not open.'), ok ? 'good' : 'bad');
      });
      keys.append(select, key);
      return;
    }
    const mine = scopeOf(item) ?? { all: on, on: [], everywhere: false, rooms: {} };
    const everywhere = mine.everywhere || (mine.all && !ids.length);
    if (everywhere) {
      const off = button('mk-get big quiet', t('Turn off in every project'), () => turnScope(item, { all: false }, line, off));
      keys.append(off);
    } else {
      const all = button('mk-get big', t('Get it for all your projects'), async () => { if (await turnScope(item, { all: true }, line, all)) notice(t('{name} is on in all your projects.', { name: nameOf(item) })); });
      keys.append(all);
      const left = ids.filter((id) => !mine.on.includes(id));
      if (left.length) {
        const only = el('div', 'mk-only');
        const select = projectPicker(left);
        const key = button('mk-get', t('Only in this one'), async () => { const name = projectName(select.value); if (await turnScope(item, { rooms: { [select.value]: true } }, line, key)) notice(t('{name} is on in {project}.', { name: nameOf(item), project: name })); });
        only.append(el('span', null, t('or only in')), select, key);
        keys.append(only);
        if (choose) requestAnimationFrame(() => all.focus());
      }
    }
    if (ids.length) keys.append(button('mk-link', t('Choose project by project'), () => go({ tab: 'mine', focus: item.id })));
  };

  // MODULES, in Home: what is on and where, a switch for every project and one for each.
  const mine = (focusId = null) => {
    const page = el('div', 'mk-page mk-mine');
    const head = el('section', 'mk-head');
    head.append(el('h1', null, t('Modules')), el('p', null, t('What you have on or installed, and in which projects. A change here reaches each project with its next message.')));
    page.append(head);
    const onNow = items.filter((item) => isOn(item));
    const offNow = items.filter((item) => !isOn(item));
    if (onNow.length) {
      const group = el('section', 'mk-section');
      group.append(el('h2', null, t('What is on')));
      for (const item of onNow) group.append(card(item, focusId === item.id));
      page.append(group);
    } else page.append(el('p', 'mk-empty', t('Nothing is on yet. The Market has what each module does.')));
    if (offNow.length) {
      const group = el('section', 'mk-section');
      group.append(el('h2', null, t('Not on')));
      for (const item of offNow) group.append(card(item, focusId === item.id));
      page.append(group);
    }
    return page;
  };
  const switchKey = (checked, label, onFlip) => {
    const key = button(`mk-switch${checked ? ' on' : ''}`, null, onFlip);
    key.setAttribute('role', 'switch');
    key.setAttribute('aria-checked', String(checked));
    key.setAttribute('aria-label', label);
    key.append(el('span', 'mk-knob'));
    return key;
  };
  const card = (item, focused = false) => {
    const box = el('article', `mk-card${focused ? ' focused' : ''}`);
    box.id = `mk-card-${item.id}`;
    const head = el('header', 'mk-card-head');
    const words = el('div', 'mk-card-words');
    words.append(el('b', null, nameOf(item)), el('span', null, reach(item)));
    const open = button('mk-card-open', null, () => go({ tab: 'shop', focus: item.id }));
    open.append(appIcon(item, 44), words);
    head.append(open);
    const line = el('p', 'mk-said');
    box.append(head);
    const kind = kindOf(item);
    if (kind === 'local') {
      head.append(button('mk-get', t('Local AI settings'), () => { close(); host.localAi?.(); }));
    } else if (kind === 'install') {
      head.append(button('mk-get', t('Install in another'), () => go({ tab: 'shop', focus: item.id })));
      const on = scopeOf(item)?.on ?? [];
      if (on.length) {
        const chips = el('div', 'mk-chips');
        for (const id of on) chips.append(el('span', 'mk-chip on', projectName(id)));
        box.append(chips);
      }
    } else {
      const mineScope = scopeOf(item) ?? { all: false, on: [], everywhere: false };
      const allOn = mineScope.everywhere || (mineScope.all && !scope.projects.length);
      const all = el('label', 'mk-all');
      const flip = switchKey(allOn, t('All your projects'), () => turnScope(item, { all: !allOn }, line, flip));
      all.append(el('span', null, t('All your projects')), flip);
      head.append(all);
      if (scope.projects.length) {
        const chips = el('div', 'mk-chips');
        for (const project of scope.projects) {
          const here = mineScope.on.includes(project.id);
          const chip = button(`mk-chip${here ? ' on' : ''}`, project.name, () => turnScope(item, { rooms: { [project.id]: !here } }, line, chip));
          chip.setAttribute('aria-pressed', String(here));
          chip.title = here ? t('On in {project}. Press to turn it off there.', { project: project.name }) : t('Off in {project}. Press to turn it on there.', { project: project.name });
          chips.append(chip);
        }
        box.append(chips);
      }
    }
    box.append(line);
    return box;
  };

  // WHERE IT IS: a view, the address that reopens it, and the page scrolled to the top.
  const render = () => {
    if (!current) return;
    for (const [id, key] of Object.entries(tabs)) key.setAttribute('aria-selected', String(id === view.tab));
    search.hidden = view.tab === 'mine' || Boolean(view.focus);
    const item = view.focus ? items.find((one) => one.id === view.focus) : null;
    const page = view.tab === 'mine' ? mine(view.focus) : item ? detail(item, { choose: view.choose }) : shop();
    main.replaceChildren(page);
    if (view.tab === 'mine' && view.focus) requestAnimationFrame(() => document.getElementById(`mk-card-${view.focus}`)?.scrollIntoView({ block: 'center' }));
    const hash = view.tab === 'mine' ? '#modulos' : item ? `#mercado=${encodeURIComponent(item.id)}` : '#mercado';
    try { history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`); } catch { /* the address stays as it was */ }
  };
  const go = ({ tab: nextTab = view.tab, focus: nextFocus = null, choose = false } = {}) => {
    view = { tab: home ? nextTab : 'shop', focus: nextFocus, choose };
    main.scrollTop = 0;
    render();
  };
  const close = () => {
    if (!current) return;
    clearInterval(timer);
    current = null;
    document.documentElement.classList.remove('mk-open');
    root.classList.remove('in');
    try { history.replaceState(history.state, '', `${location.pathname}${location.search}`); } catch { /* fine */ }
    setTimeout(() => root.remove(), reducedMotion() ? 0 : 220);
    before?.focus?.();
  };
  input.addEventListener('input', () => { if (!view.focus && view.tab === 'shop') { const at = input.selectionStart; render(); input.focus(); input.setSelectionRange(at, at); } });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    if (input.value && document.activeElement === input) { input.value = ''; render(); return; }
    if (view.focus && view.tab === 'shop') go({ tab: 'shop' });
    else close();
  });

  current = { close, go };
  main.append(el('p', 'mk-empty', t('Looking…')));
  root.focus();
  void load().then(() => { if (current) go({ tab, focus, choose: false }); });
  return current;
}
