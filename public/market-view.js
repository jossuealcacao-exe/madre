// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
import { appIcon, communityOf, forSale, includedSkills, yourSkills, inMarket, isBought, loadMarket, marketEntry, marketExtras, marketFeatured, marketShelves, marketSkills, moduleFace, remoteEntry, skillHere } from './market.js';
import { marketArt, marketGallery } from './market-art.js';
import { ICONS, trazo, trazoDrawing } from './icons.js';
import { markMission } from './missions.js';

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
    const body = await response.json().catch(() => ({}));
    if (typeof body.error === 'string') body.error = t(body.error);
    return { ok: response.ok, body };
  } catch { return { ok: false, body: { error: t('MADRE did not answer. Check that it is still open.') } }; }
};
const getJson = (url) => fetch(url, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);

const GLYPH = {
  close: trazo('close'),
  back: trazo('back'),
  next: trazo('next'),
  search: trazo('search'),
};
// Back, the way Settings goes back (2026-11-13, the author: «the Market's back key, more coherent with
// the rest»): the same round key with its chevron, and where it goes in its name.
const backKey = (where, onClick) => {
  const key = button('settings-back mk-back', null, onClick);
  key.title = where;
  key.setAttribute('aria-label', where);
  const mark = el('span', 'settings-back-icon chev-icon');
  mark.innerHTML = trazo('chevron'); // trusted: our own SVG string
  key.append(mark);
  return key;
};
const glyph = (node, name) => { node.insertAdjacentHTML('afterbegin', GLYPH[name]); return node; }; // trusted: our own SVG strings

// A module from the catalog says its name and what it does in the room's language (market.js).
const nameOf = (item) => moduleFace(item).name ?? t(item.name ?? item.id);
const summaryOf = (item) => (moduleFace(item).summary ? t(moduleFace(item).summary) : t(item.summary ?? ''));
const lineOf = (item) => (moduleFace(item).line ? t(moduleFace(item).line) : t(item.summary ?? ''));
// Who made it: the catalog entry's author (a community module's, or one of the author's own, like
// Antes de subir, by Claude) or what a module says of itself.
const makerOf = (item) => remoteEntry(item.id)?.author?.name ?? item.credit ?? null;
const communityTag = () => el('span', 'mk-community', t('Community'));
const priceOf = (item) => (marketEntry(item.id).price ? `$${marketEntry(item.id).price}` : t('Free'));
// Beside a key only a price is said (2026-11-11, the author: «less like the App Store»): free is the
// rule, so a free one says nothing under its key.
const paidOf = (item) => (marketEntry(item.id).price ? priceOf(item) : '');
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
  if (current) { current.raise?.(); current.go({ tab, focus }); return current; }
  const home = where === 'home';
  const before = document.activeElement;
  // The flat store (2026-10-27): the chat shell's canvas, hairlines and flat icons, laid out as the
  // App Store on a phone. The classic room (port 4316) keeps the store it had.
  const root = el('div', globalThis.location?.port === '4316' ? 'mk' : 'mk flat');
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
    for (const [id, label] of [['shop', t('Market')], ['skills', t('Skills')], ['mine', t('Modules')]]) {
      const key = button('mk-tab', label, () => go({ tab: id }));
      key.setAttribute('role', 'tab');
      tabs[id] = key;
      seg.append(key);
    }
    middle.append(seg);
  } else {
    const here = el('span', 'mk-here');
    here.append(el('b', null, t('Market')), el('span', null, t('for {project}', { project: project?.name ?? t('this project') })));
    // A skill is not a module and does not share a shelf with one (H-8): its own tab, here too.
    const seg = el('div', 'mk-tabs');
    seg.setAttribute('role', 'tablist');
    for (const [id, label] of [['shop', t('Modules')], ['skills', t('Skills')]]) {
      const key = button('mk-tab', label, () => go({ tab: id }));
      key.setAttribute('role', 'tab');
      tabs[id] = key;
      seg.append(key);
    }
    middle.append(here, seg);
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
  // In a project the Market is one more window of the room (2026-10-27): carried by its bar, sized by
  // its edges, arranged and set aside with the others (app.js, marketAsWindow). Without that — Home —
  // it takes the whole screen, as before.
  const framed = host.window?.({ root, bar, close: () => close() }) ?? null;
  if (!framed) document.documentElement.classList.add('mk-open');
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
  // BEFORE IT IS INSTALLED (2026-10-25): what the module declares, read from its signed file, and the
  // one thing every module is — code that needs the person's review. Nothing is installed
  // until the person says so, and then it is that same file (its sha256).
  let reviewing = null;
  const reviewLines = (declares) => {
    const lines = [];
    for (const reach of declares?.reaches ?? []) lines.push(reach.to ? t('Connects to {to} ({host}).', { to: reach.to, host: reach.host ?? '?' }) : t('Connects to {host}.', { host: reach.host ?? '?' }));
    if (!(declares?.reaches ?? []).length) lines.push(t('It declares no address outside this computer.'));
    for (const secret of declares?.secrets ?? []) lines.push(t('Asks for a key: {label}. MADRE keeps it in its vault, only for this module.', { label: secret.label }));
    if (declares?.tools) lines.push(t('Hands tools to your agents during their turns.'));
    if (declares?.reads) lines.push(t('Reads the messages of your chats while it is on.'));
    if (declares?.commands?.length) lines.push(t('Adds commands to the box: {commands}.', { commands: declares.commands.join(', ') }));
    if (declares?.pages) lines.push(t('Serves pages of its own inside MADRE.'));
    if (declares?.writes) lines.push(t('Writes in your project, with a command you read and confirm before it runs.'));
    return lines;
  };
  const askToInstall = (item, review) => new Promise((resolve) => {
    const sheet = el('div', 'mk-review');
    sheet.setAttribute('role', 'alertdialog');
    sheet.setAttribute('aria-modal', 'true');
    const card = el('div', 'mk-review-card');
    const head = el('div', 'mk-review-head');
    head.append(appIcon(item, 44), el('h2', null, t('Before installing {name}', { name: nameOf(item) })));
    const list = el('ul', 'mk-review-list');
    for (const line of reviewLines(review.declares)) list.append(el('li', null, line));
    const warn = el('p', 'mk-review-warn', t('A module runs in a separate process with limited permissions. MADRE checks its signature and declarations; Node cannot guarantee containment of malicious code. Review the file and its network destinations before installing it.'));
    const keys = el('div', 'mk-review-keys');
    const done = (yes) => { reviewing = null; sheet.remove(); resolve(yes); };
    const no = button('mk-get big quiet', t('Not now'), () => done(false));
    const yes = button('mk-get big', t('Install'), () => done(true));
    keys.append(no, yes);
    const made = communityOf(item.id) ? t('Version {version} · made by {name}, from the community; the author of MADRE read it and signed it.', { version: review.version ?? '?', name: communityOf(item.id).author.name }) : t('Version {version}', { version: review.version ?? '?' });
    card.append(head, el('p', 'mk-review-version', made), list, warn, keys);
    sheet.append(card);
    sheet.addEventListener('click', (event) => { if (event.target === sheet) done(false); });
    reviewing = () => done(false);
    root.append(sheet);
    yes.focus();
  });
  const fetchFirst = async (item, line) => {
    if (item.kind !== 'remote') return item;
    said(line, t('Reading what {name} does…', { name: nameOf(item) }));
    const review = await post('/api/market/install', { id: item.id, review: true });
    if (!review.ok) throw new Error(review.body.error ?? t('{name} could not be installed.', { name: nameOf(item) }));
    if (!(await askToInstall(item, review.body))) throw Object.assign(new Error(''), { declined: true });
    said(line, t('Getting {name} from the Market…', { name: nameOf(item) }));
    const answer = await post('/api/market/install', { id: item.id, accept: review.body.sha256 });
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
  // Getting a module looks like getting it (2026-10-20): its key fills as a download does while
  // MADRE turns it on, a tick takes its place when it is done, and on its page the module's icon
  // drops into place with the tick on it. Turning one off is only a moment.
  const TICK = trazo('check');
  const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A chip keeps its words through it: it only fills, then lights (2026-11-11).
  const isChip = (key) => key.classList.contains('mk-chip');
  const startGetting = (key) => {
    key.classList.add('getting');
    key.dataset.from = String(Date.now());
    if (isChip(key)) return;
    key.dataset.was = key.textContent;
    key.textContent = t('Getting it…');
  };
  const landed = async (key) => {
    // A module turned on in an instant still shows its download for a moment: a key that blinks
    // from «Get» to the tick read as nothing having happened.
    const shown = Date.now() - Number(key.dataset.from || 0);
    if (!still() && shown < 700) await new Promise((resolve) => setTimeout(resolve, 700 - shown));
    key.classList.remove('getting');
    if (isChip(key)) { key.classList.add('on'); key.setAttribute('aria-pressed', 'true'); await new Promise((resolve) => setTimeout(resolve, still() ? 150 : 450)); return; }
    key.classList.add('got');
    key.innerHTML = TICK; // trusted: our own SVG string
    key.append(el('span', null, t('Done')));
    const icon = key.closest('.mk-product')?.querySelector('.mk-product-top > .mk-icon');
    if (icon) {
      icon.classList.add('landed');
      const badge = el('span', 'mk-got-badge');
      badge.innerHTML = TICK; // trusted: our own SVG string
      icon.append(badge);
    }
    await new Promise((resolve) => setTimeout(resolve, still() ? 300 : 1100));
  };
  const stopGetting = (key) => {
    if (!key.classList.contains('getting')) return;
    key.classList.remove('getting');
    if (!isChip(key)) key.textContent = key.dataset.was ?? key.textContent;
  };
  const turnHere = async (given, on, line, key) => {
    key.disabled = true;
    if (on) startGetting(key);
    let item = given;
    try { item = await fetchFirst(given, line); } catch (error) { key.disabled = false; stopGetting(key); said(line, error.message, error.declined ? '' : 'bad'); return; }
    said(line, on && item.id === 'playwright' ? t('Getting the test browser ready: MADRE downloads what it is missing. It can take a few minutes.') : t('One moment…'));
    const answer = await post(`/api/extensions/${encodeURIComponent(item.id)}/install`, { confirm: true });
    if (!answer.ok) { key.disabled = false; stopGetting(key); said(line, answer.body.error ?? t('{name} could not be turned on or off.', { name: nameOf(item) }), 'bad'); return; }
    if (on) { void markMission('market', { quiet: true }); await landed(key); }
    notice(on ? t('{name} is on in this project.', { name: nameOf(item) }) : t('{name} is off in this project.', { name: nameOf(item) }));
    await refresh();
  };
  const turnScope = async (given, change, line, key) => {
    key.disabled = true;
    const turningOn = change.all === true || Object.values(change.rooms ?? {}).includes(true);
    if (turningOn) startGetting(key);
    let item = given;
    try { item = await fetchFirst(given, line); } catch (error) { key.disabled = false; stopGetting(key); said(line, error.message, error.declined ? '' : 'bad'); return false; }
    said(line, turningOn && item.id === 'playwright' ? t('Getting the test browser ready: MADRE downloads what it is missing. It can take a few minutes.') : t('One moment…'));
    const answer = await post(`/api/extensions/${encodeURIComponent(item.id)}/scope`, { ...change, confirm: true });
    if (!answer.ok) { key.disabled = false; stopGetting(key); said(line, answer.body.error ?? t('{name} could not be turned on or off.', { name: nameOf(item) }), 'bad'); return false; }
    if (turningOn) { void markMission('market', { quiet: true }); await landed(key); }
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
      // One word for getting anything, «Install», and one for having it (2026-11-11, the author).
      if (on) return button('mk-get on', t('Installed'), () => go({ tab: 'shop', focus: item.id }));
      // A paid module not bought yet is bought on its page, where it says what it costs and how.
      if (unpaid(item)) return button('mk-get', t('Buy'), () => go({ tab: 'shop', focus: item.id }));
      if (!home && kind === 'switch') {
        const key = button('mk-get', t('Install'), async (event) => { event.stopPropagation(); const line = el('span'); await turnHere(item, true, line, key); if (line.dataset.tone === 'bad') { notice(line.textContent); key.disabled = false; } });
        return key;
      }
      if (!home && kind === 'install') return button('mk-get', t('Install'), () => { close(); host.installHere?.(item); });
      return button('mk-get', t('Install'), () => go({ tab: 'shop', focus: item.id, choose: true }));
    }
    return null;
  };

  const row = (item) => {
    const line = el('div', 'mk-row');
    const open = button('mk-row-open', null, () => go({ tab: 'shop', focus: item.id }));
    const words = el('span', 'mk-row-words');
    const title = el('b', null, nameOf(item));
    if (communityOf(item.id)) title.append(communityTag());
    words.append(title, el('span', null, lineOf(item)));
    open.append(appIcon(item, 58), words);
    const side = el('span', 'mk-row-side');
    side.append(getKey(item), el('small', null, isOn(item) ? '' : paidOf(item)));
    line.append(open, side);
    return line;
  };

  // THE CAROUSEL: the featured modules, each on its own colors with its picture. The rail that moves
  // them is shared with the skills' banners (2026-11-11): one slide as wide as the page, never the
  // next one peeking at the edge.
  const rail = (slides, label) => {
    const box = el('section', 'mk-carousel');
    box.setAttribute('aria-roledescription', t('carousel'));
    box.setAttribute('aria-label', label);
    const track = el('div', 'mk-track');
    const dots = el('div', 'mk-dots');
    let index = 0;
    slides.forEach((slide, at) => {
      slide.setAttribute('aria-roledescription', t('slide'));
      slide.setAttribute('aria-label', t('{n} of {total}', { n: at + 1, total: slides.length }));
      track.append(slide);
      const dot = button('mk-dot', null, () => show(at));
      dot.setAttribute('aria-label', t('{n} of {total}', { n: at + 1, total: slides.length }));
      dots.append(dot);
    });
    const startOf = (at) => (track.children[at]?.offsetLeft ?? 0) - (track.children[0]?.offsetLeft ?? 0);
    const show = (at, smooth = true) => {
      index = (at + slides.length) % slides.length;
      track.scrollTo({ left: startOf(index), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
      mark();
    };
    const mark = () => { [...dots.children].forEach((dot, at) => dot.setAttribute('aria-current', String(at === index))); };
    track.addEventListener('scroll', () => {
      let at = 0;
      slides.forEach((_, one) => { if (Math.abs(startOf(one) - track.scrollLeft) < Math.abs(startOf(at) - track.scrollLeft)) at = one; });
      if (at !== index) { index = at; mark(); }
    }, { passive: true });
    // A window sized narrower or wider keeps the card it showed in place, never half of two.
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (track.isConnected) track.scrollTo({ left: startOf(index), behavior: 'auto' }); }).observe(track);
    box.append(track);
    if (slides.length > 1) {
      const prev = glyph(button('mk-arrow prev', null, () => show(index - 1)), 'back');
      const next = glyph(button('mk-arrow next', null, () => show(index + 1)), 'next');
      prev.setAttribute('aria-label', t('Previous'));
      next.setAttribute('aria-label', t('Next'));
      box.append(prev, next, dots);
    }
    mark();
    // It moves on by itself, unless the person is reading it or asked for stillness.
    let resting = false;
    for (const [type, value] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) box.addEventListener(type, () => { resting = value; });
    clearInterval(timer);
    if (!reducedMotion() && slides.length > 1) timer = setInterval(() => { if (!resting && !document.hidden && box.isConnected) show(index + 1); }, 6500);
    return box;
  };
  const carousel = () => {
    const featured = marketFeatured(items);
    if (!featured.length) return null;
    const slides = featured.map((item) => {
      const slide = hueOf(el('article', 'mk-slide'), item);
      const words = el('div', 'mk-slide-words');
      const get = el('div', 'mk-slide-get');
      const who = el('span', 'mk-slide-who');
      who.append(el('b', null, nameOf(item)), el('span', null, isOn(item) ? reach(item) : paidOf(item) || lineOf(item)));
      get.append(appIcon(item, 48), who, button('mk-get light', isOn(item) ? t('See it') : unpaid(item) ? t('Buy') : kindOf(item) === 'local' ? t('Open') : t('Install'), (event) => { event.stopPropagation(); go({ tab: 'shop', focus: item.id, choose: !isOn(item) }); }));
      words.append(el('small', null, t('Featured')), el('h2', null, nameOf(item)), el('p', null, t(marketEntry(item.id).pitch ?? lineOf(item))), get);
      const art = el('div', 'mk-slide-art');
      art.innerHTML = marketArt(item); // trusted: our own drawings (market-art.js)
      slide.append(words, art);
      slide.addEventListener('click', () => go({ tab: 'shop', focus: item.id }));
      return slide;
    });
    return rail(slides, t('Featured'));
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
    // What the Market is, in a person's words (2026-11-10, the author: «better copy of what it is»).
    head.append(el('h1', null, t('Market')), el('p', null, home
      ? t('Tools that give your AIs new things to do: see your page, check your payments, remind you of what is pending. One button turns each on, with no terminal; you choose for every project or only one.')
      : t('Tools that give your AIs new things to do: see your page, check your payments, remind you of what is pending. One button turns each on, with no terminal; what you get here is for this project.')));
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
    page.append(backKey(t('Back to the Market'), () => go({ tab: 'shop' })));
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
    if (forSale(item.id) && isBought(item.id)) {
      const held = el('span', 'mk-license-held', t('Active on this computer'));
      const release = button('mk-link', t('Release'), async () => {
        release.disabled = true;
        const answer = await post('/api/market/license/release', { id: item.id });
        if (!answer.ok) { release.disabled = false; notice(answer.body.error ?? t('The license could not be released.')); return; }
        notice(t('License released: you can activate it on another computer. {name} stays installed here, without the Market\'s updates.', { name: nameOf(item) }));
        await refresh();
      });
      release.title = t('Gives this computer\'s activation back, to use the key on another one.');
      const value = el('span');
      value.append(held, ' ', release);
      const one = el('div');
      one.append(el('dt', null, t('License')), el('dd', null, ''));
      one.lastChild.append(value);
      facts.append(one);
    }
    fact(home ? t('Where') : t('Here'), reach(item));
    if (shelfOf(item)) fact(t('Shelf'), t(shelfOf(item).title));
    // MADRE's own modules have no version of their own: they are the version of MADRE they come with.
    fact(t('Version'), item.version ? `v${String(item.version).replace(/^v/, '')}` : madre ? t('Comes with MADRE {version}', { version: madre }) : t('Comes with MADRE'));
    // Who developed it, when a module or its catalog entry says (Reminders, 2026-10-20), only here: not
    // again under its name (2026-10-30).
    if (makerOf(item)) {
      fact(t('Developer'), makerOf(item));
      if (communityOf(item.id)) facts.lastChild.lastChild.prepend(communityTag(), ' ');
    }
    // A community module's author, and where to find them: their GitHub user, under their name.
    const github = communityOf(item.id)?.author.github;
    if (github) facts.lastChild.lastChild.append(el('small', 'mk-handle', `@${github}`));
    if (communityOf(item.id)?.spdx) fact(t('Code license'), communityOf(item.id).spdx);
    page.append(facts);

    // Three pictures (1.0.5), side by side and swiped like a store's: what it does, the module at
    // work in a project, and the three steps to use it.
    const gallery = el('section', 'mk-section');
    gallery.append(el('h2', null, t('Preview')));
    const strip = el('div', 'mk-gallery');
    for (const drawing of marketGallery(item)) {
      const shot = hueOf(el('div', 'mk-shot'), item);
      shot.innerHTML = drawing; // trusted: our own drawings, or the catalog's kept to their shapes (market-art.js)
      strip.append(shot);
    }
    gallery.append(strip);
    page.append(gallery);
    if (summaryOf(item)) {
      const about = el('section', 'mk-section');
      about.append(el('h2', null, t('What it does')), el('p', 'mk-about', summaryOf(item)));
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
  // A PAID MODULE (src/market-license.mjs): bought once at its checkout, then its key pasted here.
  // Until then it cannot be got; after, it is got like any other.
  const unpaid = (item) => item.kind === 'remote' && Boolean(forSale(item.id)) && !isBought(item.id);
  const drawPurchase = (item, keys, line) => {
    const sale = forSale(item.id);
    const buy = button('mk-get big', t('Buy · {price}', { price: priceOf(item) }), () => { globalThis.open?.(sale.checkout, '_blank', 'noopener'); said(line, t('The purchase opened in your browser. The license key arrives by email: paste it here with «I have a license».'), 'note'); });
    const have = button('mk-get big quiet', t('I have a license'), () => {
      have.remove();
      const form = el('form', 'mk-license');
      const field = el('input');
      field.type = 'text';
      field.autocomplete = 'off';
      field.spellcheck = false;
      field.placeholder = t('License key');
      field.setAttribute('aria-label', t('License key'));
      const activate = button('mk-get big', t('Activate'));
      activate.type = 'submit';
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        activate.disabled = true;
        said(line, t('Checking the license with Lemon Squeezy…'));
        const answer = await post('/api/market/license', { id: item.id, key: field.value });
        activate.disabled = false;
        if (!answer.ok) { said(line, answer.body.error ?? t('The license could not be activated.'), 'bad'); return; }
        notice(t('License activated: {name} is yours.', { name: nameOf(item) }));
        await refresh();
      });
      form.append(field, activate);
      keys.append(form);
      field.focus();
    });
    keys.append(buy, have);
    said(line, t('Paid once, through Lemon Squeezy. Its code is open like MADRE\'s: what you pay for is getting it from the Market, its updates and its support.'), 'note');
  };
  const drawKeys = (item, keys, line, { choose = false } = {}) => {
    keys.replaceChildren();
    const kind = kindOf(item);
    const on = isOn(item);
    if (item.preflight && !item.preflight.ok && !on) said(line, item.preflight.problems.map((problem) => t(problem)).join(' '), 'note');
    // A module from the catalog that asks for a newer MADRE says so, and waits for it.
    const needs = item.kind === 'remote' ? item.remote?.minMadre : null;
    if (needs && madre && !fits(madre, needs)) { keys.append(button('mk-get big', t('Needs MADRE {version}', { version: needs }))); keys.lastChild.disabled = true; said(line, t('Update MADRE to get this module.'), 'note'); return; }
    if (unpaid(item)) { drawPurchase(item, keys, line); return; }
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
    // Where it is on, said once and changed in the same place (2026-11-10, the author: «confusing»):
    // a chip for all your projects and one for each, lit where it is on; a press turns it on or off
    // there. The same chips as in Modules.
    const where = el('div', 'mk-where');
    where.append(el('b', 'mk-where-title', everywhere || mine.on.length ? t('It is on in') : t('Turn it on in')));
    const chips = el('div', 'mk-chips mk-where-chips');
    const allChip = button(`mk-chip all${everywhere ? ' on' : ''}`, t('All my projects'), async () => {
      if (await turnScope(item, { all: !everywhere }, line, allChip) && !everywhere) notice(t('{name} is on in all your projects.', { name: nameOf(item) }));
    });
    allChip.setAttribute('aria-pressed', String(everywhere));
    chips.append(allChip);
    for (const id of ids) {
      const here = everywhere || mine.on.includes(id);
      const chip = button(`mk-chip${here ? ' on' : ''}`, projectName(id), async () => {
        if (await turnScope(item, { rooms: { [id]: !here } }, line, chip) && !here) notice(t('{name} is on in {project}.', { name: nameOf(item), project: projectName(id) }));
      });
      chip.setAttribute('aria-pressed', String(here));
      chip.title = here ? t('On in {project}. Press to turn it off there.', { project: projectName(id) }) : t('Off in {project}. Press to turn it on there.', { project: projectName(id) });
      chips.append(chip);
    }
    where.append(chips, el('small', 'mk-where-note', t('«All my projects» includes the ones you add later.')));
    keys.append(where);
    if (choose) requestAnimationFrame(() => allChip.focus());
  };

  // MODULES, in Home: what is on and where, a switch for every project and one for each.
  const mine = (focusId = null) => {
    const page = el('div', 'mk-page mk-mine');
    const head = el('section', 'mk-head');
    head.append(el('h1', null, t('Modules')), el('p', null, t('What you have on, and in which projects. A change here reaches each project with its next message.')));
    page.append(head);
    // Local AI and the connectors are MADRE's own, set in Settings (2026-10-28), as a project's
    // Modules leaves them out (app.js, IN_SETTINGS): not a module to turn on here.
    const offered = items.filter((item) => item.card !== 'settings' && item.id !== 'ollama');
    const onNow = offered.filter((item) => isOn(item));
    const offNow = offered.filter((item) => !isOn(item));
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
    // What it does, in a person's words (2026-11-10): where it is on, the chips below say.
    words.append(el('b', null, nameOf(item)), el('span', null, lineOf(item)));
    const open = button('mk-card-open', null, () => go({ tab: 'shop', focus: item.id }));
    open.append(appIcon(item, 44), words);
    head.append(open);
    const line = el('p', 'mk-said');
    box.append(head);
    const kind = kindOf(item);
    if (kind === 'local') {
      head.append(button('mk-get', t('Local AI settings'), () => { close(); host.localAi?.(); }));
    } else if (kind === 'install') {
      // The projects it is in and the key to put it in another, on one line (2026-10-30): stacked, the
      // key and the project read as two keys of different sizes, one under the other.
      const foot = el('div', 'mk-card-foot');
      const chips = el('div', 'mk-chips');
      // Every project: lit where it is installed; one without it is a chip that leads to installing it
      // there (it installs from that project, where MADRE shows the commands first).
      const placed = scopeOf(item)?.on ?? [];
      for (const project of scope.projects) {
        if (placed.includes(project.id)) { chips.append(el('span', 'mk-chip on', project.name)); continue; }
        const chip = button('mk-chip', project.name, async () => { chip.disabled = true; await host.openProject?.(project.id, item); chip.disabled = false; });
        chip.title = t('Not in {project}. Press to install it there.', { project: project.name });
        chips.append(chip);
      }
      foot.append(chips);
      box.append(foot);
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

  // ---- SKILLS (H-8). Their own tab, because a skill is not a module: it adds no button and no
  // page, it tells whichever agent answers how the person works. So no tiles — a row with its
  // sentence, and a page with the whole text before anything is kept; since 2026-11-11 the shelf opens
  // with banners, as the Market does.
  //
  // Getting one is two steps, as a module's is: MADRE fetches every file and checks it against the
  // signature, shows what it says and what it carries, and only then — on the very seal that was
  // read — keeps it. Nothing of it runs: a program it carries could only ever run inside #4.
  // The shelf of skills (2026-11-10, the author): a search, then what you already keep, what comes
  // with MADRE, and what the community made; two columns, each skill with its drawing.
  const SKILL_ICON_GUESS = [[/client|correo|mensaje|whatsapp|mail/i, 'chat'], [/red|post|instagram|social/i, 'image'], [/hoja|excel|tabla|sheet|cálculo/i, 'bars'], [/página|web|sitio|page|site/i, 'globe'], [/resum|pendiente|summar|todo/i, 'list'], [/explic|aprend|learn|explain/i, 'help'], [/cotiza|precio|quote|price/i, 'note'], [/código|code|program/i, 'code']];
  const skillIcon = (skill) => (ICONS[skill.icon] ? skill.icon : null) ?? SKILL_ICON_GUESS.find(([test]) => test.test(`${skill.id} ${skill.name}`))?.[1] ?? 'spark';
  const skillRow = (skill, { tag = null, key = null } = {}) => {
    const row = el('article', 'mk-skill-row');
    const mark = el('span', 'mk-skill-icon');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = trazo(skillIcon(skill)); // trusted: our own SVG strings
    const words = el('div', 'mk-skill-words');
    const top = el('div', 'mk-skill-top');
    top.append(el('b', null, skill.name));
    if (tag) top.append(tag);
    words.append(top, el('p', 'mk-skill-line', skill.line || skill.summary || ''));
    row.append(mark, words);
    if (key) row.append(key);
    return row;
  };
  const skillShelf = (title, about, rows) => {
    const shelf = el('section', 'mk-skill-shelf');
    shelf.append(el('h3', 'mk-skill-shelf-title', title));
    if (about) shelf.append(el('p', 'mk-skill-shelf-about', about));
    const list = el('div', 'mk-skill-list');
    list.append(...rows);
    shelf.append(list);
    return shelf;
  };
  // THE SKILLS' BANNERS (2026-11-11, the author: «banners in Skills too»): the community's first —
  // to say out loud that people share them — then the ones MADRE comes with. Each on a colour of its
  // own, with a picture made from its drawing: a conversation where the skill comes in.
  const SKILL_HUES = [['#f9a8d4', '#be185d'], ['#6ee7b7', '#047857'], ['#93c5fd', '#1d4ed8'], ['#fcd34d', '#b45309'], ['#c4b5fd', '#6d28d9'], ['#fca5a5', '#b91c1c'], ['#67e8f9', '#0e7490']];
  const skillArt = (skill, [a, b]) => {
    const icon = trazoDrawing(skillIcon(skill));
    const line = (x, y, w, o = 0.5, c = '#94a3b8') => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${c}" fill-opacity="${o}"/>`;
    return `<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs><filter id="sk-${skill.id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".18"/></filter></defs>
      <g filter="url(#sk-${skill.id})">
        <rect x="250" y="58" width="240" height="56" rx="18" fill="${b}"/>${line(272, 78, 150, 0.9, '#ffffff')}${line(272, 94, 96, 0.6, '#ffffff')}
        <rect x="70" y="138" width="380" height="196" rx="20" fill="#ffffff"/>
        <rect x="92" y="160" width="150" height="30" rx="15" fill="${a}" fill-opacity=".35"/>
        <g transform="translate(101 166) scale(.9)" color="${b}">${icon}</g>
        ${line(128, 171, 96, 0.9, b)}
        ${line(92, 210, 320)}${line(92, 230, 290)}${line(92, 250, 304)}${line(92, 270, 210)}
        <rect x="92" y="294" width="120" height="22" rx="11" fill="${b}" fill-opacity=".9"/>${line(110, 301, 84, 0.95, '#ffffff')}
      </g>
      <g transform="translate(392 230)"><rect width="104" height="104" rx="28" fill="${b}"/><g transform="translate(22 22) scale(3)" color="#ffffff">${icon}</g></g>
    </svg>`;
  };
  const skillBanners = (included, community) => {
    const featured = [...community, ...included].slice(0, 6);
    if (!featured.length) return null;
    const slides = featured.map((skill, at) => {
      const hue = skill.hue ?? SKILL_HUES[at % SKILL_HUES.length];
      const slide = el('article', 'mk-slide mk-skill-slide');
      slide.style.setProperty('--mk-a', hue[0]);
      slide.style.setProperty('--mk-b', hue[1]);
      const words = el('div', 'mk-slide-words');
      const get = el('div', 'mk-slide-get');
      const mark = el('span', 'mk-skill-icon big');
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = trazo(skillIcon(skill)); // trusted: our own SVG strings
      const who = el('span', 'mk-slide-who');
      const by = skill.community ? (skill.author?.name ? t('by {name}', { name: skill.author.name }) : t('Made by the community')) : t('Comes with MADRE');
      who.append(el('b', null, skill.name), el('span', null, by));
      const have = skill.community ? skillHere(skill.id) : true;
      const key = button('mk-get light', have ? t('See it') : t('Install'), (event) => { event.stopPropagation(); go({ tab: 'skills', focus: skill.community ? skill.id : null }); });
      get.append(mark, who, key);
      words.append(el('small', null, skill.community ? t('From the community') : t('Comes with MADRE')), el('h2', null, skill.name), el('p', null, skill.line || skill.summary || ''), get);
      const art = el('div', 'mk-slide-art');
      art.innerHTML = skillArt(skill, hue); // trusted: our own drawing
      slide.append(words, art);
      if (skill.community) slide.addEventListener('click', () => go({ tab: 'skills', focus: skill.id }));
      return slide;
    });
    return rail(slides, t('Featured skills'));
  };
  const skillsPage = (focus) => {
    const page = el('div', 'mk-page mk-skills');
    const all = marketSkills();
    const one = focus ? all.find((skill) => skill.id === focus) : null;
    if (one) return skillPage(one);
    // The same head as the Market's and Modules' (2026-11-10): one title size, one line under it.
    const head = el('section', 'mk-head');
    head.append(el('h1', null, t('Skills')), el('p', null, t('How you like things done, told to your AIs: write a message to a customer, explain something simply, tidy a sheet. One skill works the same for Codex, Claude, Gemini, OpenCode, Cursor and Grok.')));
    // Bringing over the ones your agents already keep was only at the foot of Modules, where nobody
    // looked for it (2026-11-08): the shelf of skills offers it too, where a project can take it.
    if (host.importSkills) head.append(button('mk-get mk-skill-import', t('Bring over what you already have'), () => host.importSkills()));
    page.append(head);
    const words = input.value.trim().toLocaleLowerCase(language());
    const fits = (skill) => !words || `${skill.name} ${skill.line ?? ''} ${skill.summary ?? ''}`.toLocaleLowerCase(language()).includes(words);
    const mine = yourSkills().filter(fits);
    const included = includedSkills().filter(fits);
    const shared = all.filter((skill) => !mine.some((have) => have.id === skill.id)).filter(fits);
    const community = shared.filter((skill) => skill.community);
    const market = shared.filter((skill) => !skill.community);
    if (!words) { const banners = skillBanners(includedSkills(), all.filter((skill) => skill.community)); if (banners) page.append(banners); }
    const marketRow = (skill) => skillRow(skill, {
      tag: skill.community && skill.author?.name ? el('span', 'mk-skill-by', t('by {name}', { name: skill.author.name })) : skill.version ? el('span', 'mk-skill-tag', skill.version) : null,
      key: skillHere(skill.id) ? button('mk-get on', t('Yours'), () => go({ tab: 'skills', focus: skill.id })) : button('mk-get', t('Install'), () => go({ tab: 'skills', focus: skill.id })),
    });
    if (mine.length) page.append(skillShelf(t('Your skills'), t('The ones you already keep: your own, brought over from your agents, or got here. You switch them in MODULES → Skills.'), mine.map((skill) => skillRow(skill, { tag: el('span', 'mk-skill-tag', skill.origin === 'project' ? t('this project') : t('Yours')) }))));
    if (included.length) page.append(skillShelf(t('They come with MADRE'), t('Already on: each one comes in by itself when what you ask fits it.'), included.map((skill) => skillRow(skill, { tag: el('span', 'mk-skill-tag', t('Included')) }))));
    if (market.length) page.append(skillShelf(t('In the Market'), null, market.map(marketRow)));
    page.append(skillShelf(t('Made by the community'), t('Skills other people wrote and the author of MADRE reviewed. Read what each one tells your agents before you keep it.'), community.length ? community.map(marketRow) : [el('p', 'mk-empty', words ? t('No skill matches «{query}».', { query: input.value.trim() }) : t('None yet. You can write your own: type /habilidad in the conversation, and send it from MODULES → Skills.'))]));
    return page;
  };

  // One skill's page: what it tells the agents, whole, before it is kept. Read it and you have read
  // the review — which is the one thing a module's page can never offer.
  const skillPage = (skill) => {
    const page = el('div', 'mk-page mk-skill-page');
    page.append(backKey(t('Back to Skills'), () => go({ tab: 'skills' })));
    const head = el('header', 'mk-skill-head');
    head.append(el('h2', null, skill.name));
    const meta = el('div', 'mk-skill-meta');
    for (const word of [skill.version, skill.author?.name ? t('by {name}', { name: skill.author.name }) : null, skill.spdx, skill.credit ? t('Idea by {name}', { name: skill.credit }) : null].filter(Boolean)) meta.append(el('span', null, word));
    if (skill.community) meta.append(communityTag());
    head.append(el('p', 'mk-skill-line', skill.summary || skill.line), meta);
    page.append(head);
    const have = skillHere(skill.id);
    if (have) page.append(el('p', 'mk-skill-have', t('You have it, version {version}. It comes in when it fits; you decide that in MODULES → Skills.', { version: have.version })));
    if (!fits(madre, skill.minMadre)) {
      page.append(el('p', 'mk-skill-warn', t('It needs MADRE {version} or newer.', { version: skill.minMadre })));
      return page;
    }
    const body = el('div', 'mk-skill-read');
    const said = el('p', 'mk-skill-said');
    const keep = button('mk-get', have ? t('Install again') : t('Install'), null);
    keep.hidden = true;
    const read = button('mk-get', t('Read what it tells my agents'), async () => {
      read.disabled = true;
      said.textContent = t('Reading it…');
      const { ok, body: payload } = await post('/api/market/skills/install', { id: skill.id, review: true });
      read.disabled = false;
      if (!ok) { said.textContent = payload.error ?? t('It could not be read.'); return; }
      said.textContent = '';
      read.hidden = true;
      body.replaceChildren();
      if (payload.declares?.when) body.append(el('p', 'mk-skill-when', `${t('It comes in when:')} ${payload.declares.when}`));
      body.append(el('pre', 'mk-skill-body', payload.body));
      const carries = (payload.declares?.references ?? []).filter((path) => !/^(HABILIDAD|SKILL)\.md$/.test(path));
      if (carries.length) body.append(el('p', 'mk-skill-files', t('It carries: {list}', { list: carries.join(', ') })));
      if (payload.declares?.scripts?.length) {
        body.append(el('p', 'mk-skill-warn', `${t('It carries programs: {list}', { list: payload.declares.scripts.join(', ') })} ${t('MADRE never runs one. Only an agent can, and only in #4 AIRLOCK: in every other mode they do nothing. Read one before you open that mode.')}`));
      }
      keep.hidden = false;
      keep.onclick = async () => {
        keep.disabled = true;
        said.textContent = t('Keeping it…');
        const done = await post('/api/market/skills/install', { id: skill.id, accept: payload.seal });
        keep.disabled = false;
        if (!done.ok) { said.textContent = done.body.error ?? t('It could not be kept.'); return; }
        said.textContent = '';
        notice(t('{name} is yours now. It comes in when it fits; change that in MODULES.', { name: skill.name }));
        // One of the first steps (missions.js): something got from the Market.
        void markMission('market', { quiet: true });
        host.changed?.();
        await refresh();
        go({ tab: 'skills', focus: skill.id });
      };
    });
    page.append(read, body, keep, said);
    return page;
  };

  // WHERE IT IS: a view, the address that reopens it, and the page scrolled to the top.
  const render = () => {
    if (!current) return;
    for (const [id, key] of Object.entries(tabs)) key.setAttribute('aria-selected', String(id === view.tab));
    search.hidden = view.tab === 'mine' || Boolean(view.focus);
    input.placeholder = view.tab === 'skills' ? t('Search a skill, or what it does') : t('Search a module, or what it does');
    input.setAttribute('aria-label', input.placeholder);
    const item = view.focus ? items.find((one) => one.id === view.focus) : null;
    const page = view.tab === 'skills' ? skillsPage(view.focus) : view.tab === 'mine' ? mine(view.focus) : item ? detail(item, { choose: view.choose }) : shop();
    main.replaceChildren(page);
    if (view.tab === 'mine' && view.focus) requestAnimationFrame(() => document.getElementById(`mk-card-${view.focus}`)?.scrollIntoView({ block: 'center' }));
    const hash = view.tab === 'skills' ? (view.focus ? `#habilidades=${encodeURIComponent(view.focus)}` : '#habilidades') : view.tab === 'mine' ? '#modulos' : item ? `#mercado=${encodeURIComponent(item.id)}` : '#mercado';
    try { history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`); } catch { /* the address stays as it was */ }
  };
  const go = ({ tab: nextTab = view.tab, focus: nextFocus = null, choose = false } = {}) => {
    view = { tab: home || nextTab === 'skills' ? nextTab : 'shop', focus: nextFocus, choose };
    main.scrollTop = 0;
    render();
  };
  const close = () => {
    if (!current) return;
    clearInterval(timer);
    current = null;
    framed?.drop();
    document.documentElement.classList.remove('mk-open');
    root.classList.remove('in');
    try { history.replaceState(history.state, '', `${location.pathname}${location.search}`); } catch { /* fine */ }
    setTimeout(() => root.remove(), reducedMotion() ? 0 : 220);
    before?.focus?.();
  };
  input.addEventListener('input', () => { if (!view.focus && (view.tab === 'shop' || view.tab === 'skills')) { const at = input.selectionStart; render(); input.focus(); input.setSelectionRange(at, at); } });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    if (reviewing) { reviewing(); return; }
    if (input.value && document.activeElement === input) { input.value = ''; render(); return; }
    if (view.focus && view.tab === 'shop') go({ tab: 'shop' });
    else close();
  });

  current = { close, go, raise: () => framed?.raise() };
  main.append(el('p', 'mk-empty', t('Looking…')));
  root.focus();
  void load().then(() => { if (current) go({ tab, focus, choose: false }); });
  return current;
}
