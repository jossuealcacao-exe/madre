// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// SALAS on the Mac: every room this Mac knows, open or asleep, in one place (docs/MACROVERSO.md,
// phase 1). The room that serves this page answers for all of them (src/salas.mjs): it lists
// them, opens one that is asleep, asks one to close, and stops every agent in every room. A room
// opens at its own address; holding ⌘ opens it beside this one.
//
// The phone has its own SALAS (salas.js), served by the bridge; the two read the same rooms.

import { browserLanguage, setLanguage, t } from './i18n.js';
import { brandOf, monogram } from './brands.js';
import { startReviewAsk } from './review-ask.js';
import { startTour } from './tour.js';
import { dropStickyHover } from './touch.js';
import { drawAttribution, drawLegal } from './attribution.js';

// Where nothing can hover (a tablet), a tapped key does not stay lit (public/touch.js).
dropStickyHover();
import { creep, finishLoader, makeLoader, setLoader, showCurtain } from './loader.js';
import { labelPowerKey, powerKey } from './power.js';
import { drawHardware } from './hardware.js';
import { CUSTOM_WALL, addPicture, customTile, customTools, customWall, paintCustomWall, rememberedWall } from './wallpaper.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const ui = {
  title: $('sm-title'), stop: $('sm-stop'), macro: $('sm-macro'), foot: $('sm-foot'), colophon: $('sm-colophon'), gear: $('sm-gear'),
  bar: { backRoom: $('sm-back-room'), crumb: $('sm-crumb'), live: $('sm-live'), open: $('sm-tb-open'), agents: $('sm-tb-agents'), waiting: $('sm-tb-waiting'), update: $('sm-tb-update'), links: $('sm-tb-links'), linksCount: $('sm-tb-links-count'), reload: $('sm-reload') },
  add: $('sm-add'), search: $('sm-search'), filter: $('sm-filter'), projects: $('sm-projects'), none: $('sm-none'),
  bishop: {
    box: $('sm-bishop'), mark: $('sm-bishop-mark'), state: $('sm-bishop-state'), go: $('sm-bishop-go'), tab: $('sm-bishop-tab'), about: $('sm-bishop-about'),
    asks: $('sm-bishop-asks'), error: $('sm-bishop-error'),
  },
  work: { box: $('sm-work'), title: $('sm-work-title'), by: $('sm-work-by'), again: $('sm-work-again'), list: $('sm-work-list'), note: $('sm-work-note') },
  waiting: { box: $('sm-waiting'), title: $('sm-waiting-title'), count: $('sm-waiting-count'), body: $('sm-waiting-body') },
  map: $('sm-map'), linksTileTitle: $('sm-links-tile-title'), linksSum: $('sm-links-sum'), linksAll: $('sm-links-all'), link: $('sm-link'),
  linksSheet: $('sm-links-sheet'), linksTitle: $('sm-links-title'), linksNote: $('sm-links-note'), links: $('sm-links'), linksClose: $('sm-links-close'), linkMore: $('sm-link-more'),
  memory: { title: $('sm-memory-title'), total: $('sm-memory-total'), body: $('sm-memory-body') },
  decisions: { title: $('sm-decisions-title'), list: $('sm-decisions-list') },
  attention: { title: $('sm-attention-title'), count: $('sm-attention-count'), list: $('sm-attention-list') },
};
let language = 'es';
let languageAdopted = false;
let timer = 0;
let arming = 0;
let data = null;
let macro = null;              // the macroverse, while it is open
let welcomed = false;          // the first-run wizard was offered this visit
let agentsSeen = null;         // what /api/settings said of the agents, last time it was asked
let localSeen = null;          // what /api/salas/local-ai said: the mode and which projects use the local AI
let versionSeen = null;        // what /api/version said of MADRE, last time it was asked
let work = null;               // MADRE's summary of the last work (/api/salas/work)
let decisions = null;          // the recent decisions of the open rooms (/api/salas/decisions)
let filter = 'all';            // which projects show: all, open or asleep
let query = '';                // what the search box holds
// What each card is in the middle of, kept across the refreshes that redraw it.
const busy = new Map();       // room id → 'starting' | 'closing'
const asking = new Set();      // room ids whose card asks before closing
const forgetting = new Set();  // room ids whose card asks before leaving MADRE
const failed = new Map();      // room id → what went wrong, said on its card
// One is one: «1 conversaciones» read wrong on every new project's card.
const conversationsCount = (n) => (n === 1 ? t('1 conversation') : t('{n} conversations', { n }));
const memoriesCount = (n) => (n === 1 ? t('1 memory') : t('{n} memories', { n }));
const revoking = new Set();    // link ids whose row asks before revoking

// The room's looks, from this browser: the same keys the room's own page keeps (app.js, LOOKS),
// so a choice made here is the room's too when the room is served at this address.
const ACCENTS = ['madre', 'mountain', 'caribbean', 'phantom', 'malbec', 'dijon', 'pacific', 'love', 'sierra', 'pitahaya', 'papaya', 'agave', 'dinamo', 'marina', 'pulso', 'leal', 'dulce'];
const ACCENT_WORDS = { madre: () => t('Madre green'), mountain: () => t('Mountain green'), caribbean: () => t('Caribbean blue'), phantom: () => t('Phantom purple'), malbec: () => t('Malbec red'), dijon: () => t('Dijon yellow'), pacific: () => t('Pacific blue'), love: () => t('Love pink'), sierra: () => t('Sierra blue'), pitahaya: () => 'Pitahaya', papaya: () => 'Papaya', agave: () => 'Agave', dinamo: () => t('Dynamo black'), marina: () => t('Marina blue'), pulso: () => t('Pulse green'), leal: () => t('Loyal orange'), dulce: () => t('Sweet yellow') };
// The wallpapers are the room's (app.js, LOOKS.wallpaper; styles.css, --wp-*): the same images, the
// same veil, the same «mesh» and blur the room's PERSONALIZE sets, read from the same keys.
const WALLPAPERS = ['default', 'jarrito', 'canela', 'paradise', 'ventura', 'magna', 'biznaga', 'oceano', 'quila', 'xico', 'tropical', 'tradicion', 'urbania', CUSTOM_WALL];
const WALLPAPER_WORDS = { default: () => t('Default'), jarrito: () => 'Jarrito', canela: () => 'Canela', paradise: () => t('Paradise'), ventura: () => 'Ventura', magna: () => 'Magna', biznaga: () => 'Biznaga', oceano: () => 'Oceano', quila: () => 'Quila', xico: () => 'Xico', tropical: () => 'Tropical', tradicion: () => 'Tradicion', urbania: () => 'Urbania', custom: () => t('Your picture') };
// The conversation's own looks (app.js, LOOKS.bubbles and LOOKS.text): the lobby has no
// conversation, so here they are only chosen, for the room served at this address.
const BUBBLES = ['comfortable', 'large', 'compact', 'fitted'];
const TEXTS = ['comfortable', 'larger', 'smaller', 'visual'];
// The photographs' two dials, as the room keeps them (app.js, TUNES): the first value is no key.
const TUNES = {
  veil: { key: 'pulse.wallpaper.veil', min: 0, max: 140, step: 5, value: 100, shown: (v) => `${v}%`, apply: (v) => root.style.setProperty('--veil-k', String(v / 100)) },
  blur: { key: 'pulse.wallpaper.blur', min: 0, max: 24, step: 1, value: 0, shown: (v) => `${v}px`, apply: (v) => root.style.setProperty('--wp-blur', `${v}px`) },
};
// Home's own choices (2026-10-11): how its project cards read, how large its text is and in which
// order the projects come. Kept in this browser for Home alone: a project keeps its conversation's
// (bubbles and text) in its own Settings. The first value of each is Home as it always was.
const HOME_LOOKS = {
  cards: { key: 'pulse.home.cards', values: ['full', 'compact'], words: { full: () => t('With their last conversation'), compact: () => t('Name and state only') } },
  text: { key: 'pulse.home.text', values: ['comfortable', 'larger', 'smaller'], words: { comfortable: () => t('Comfortable'), larger: () => t('Larger'), smaller: () => t('Smaller') } },
  order: { key: 'pulse.home.order', values: ['attention', 'name', 'recent', 'mine'], words: { attention: () => t('Attention'), name: () => t('Name'), recent: () => t('Recent'), mine: () => t('Your order') } },
};
const LOOK_KEYS = ['pulse.theme', 'pulse.accent', 'pulse.wallpaper', 'pulse.wallpaper.style', 'pulse.wallpaper.veil', 'pulse.wallpaper.blur', 'pulse.bubbles', 'pulse.text', ...Object.values(HOME_LOOKS).map((one) => one.key)];
function readLooks() {
  let theme = 'auto';
  let accent = null;
  let wallpaper = null;
  let style = null;
  let veil = null;
  let blur = null;
  let bubbles = null;
  let text = null;
  try {
    theme = localStorage.getItem('pulse.theme') ?? 'auto'; accent = localStorage.getItem('pulse.accent'); wallpaper = localStorage.getItem('pulse.wallpaper');
    style = localStorage.getItem('pulse.wallpaper.style'); veil = localStorage.getItem('pulse.wallpaper.veil'); blur = localStorage.getItem('pulse.wallpaper.blur');
    bubbles = localStorage.getItem('pulse.bubbles'); text = localStorage.getItem('pulse.text');
  } catch { /* no storage */ }
  const number = (raw, low, high, fallback) => { const value = raw === null ? Number.NaN : Number(raw); return Number.isFinite(value) && value >= low && value <= high ? value : fallback; };
  return {
    theme: ['auto', 'light', 'dark'].includes(theme) ? theme : 'auto',
    accent: ACCENTS.includes(accent) ? accent : 'madre',
    // The person's own picture only while it is here (public/wallpaper.js); taken away, the sky.
    wallpaper: WALLPAPERS.includes(wallpaper) && (wallpaper !== CUSTOM_WALL || customWall()) ? wallpaper : 'default',
    style: style === 'mesh' ? 'mesh' : 'veil',
    veil: number(veil, 0, 140, 100),
    blur: number(blur, 0, 24, 0),
    bubbles: BUBBLES.includes(bubbles) ? bubbles : BUBBLES[0],
    text: TEXTS.includes(text) ? text : TEXTS[0],
    home: Object.fromEntries(Object.entries(HOME_LOOKS).map(([name, spec]) => {
      let value = null;
      try { value = localStorage.getItem(spec.key); } catch { /* no storage */ }
      return [name, spec.values.includes(value) ? value : spec.values[0]];
    })),
  };
}
function applyLooks() {
  const { theme, accent } = readLooks();
  const light = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme; else delete root.dataset.theme;
  root.dataset.scheme = theme === 'auto' ? (light ? 'light' : 'dark') : theme;
  if (accent !== 'madre') root.dataset.accent = accent; else delete root.dataset.accent;
  // The wallpaper, its style and its two dials, as the room applies them (app.js, applyLook, TUNES).
  const looks = readLooks();
  if (looks.wallpaper !== 'default') root.dataset.wallpaper = looks.wallpaper; else delete root.dataset.wallpaper;
  if (looks.style === 'mesh') root.dataset.wpStyle = 'mesh'; else delete root.dataset.wpStyle;
  root.style.setProperty('--veil-k', String(looks.veil / 100));
  root.style.setProperty('--wp-blur', `${looks.blur}px`);
  if (looks.bubbles !== BUBBLES[0]) root.dataset.bubbles = looks.bubbles; else delete root.dataset.bubbles;
  if (looks.text !== TEXTS[0]) root.dataset.text = looks.text; else delete root.dataset.text;
  // Home's own: its cards and its text (salas-mac.css, data-home-*); the order is draw()'s.
  if (looks.home.cards !== 'full') root.dataset.homeCards = looks.home.cards; else delete root.dataset.homeCards;
  if (looks.home.text !== 'comfortable') root.dataset.homeText = looks.home.text; else delete root.dataset.homeText;
}
// The person's picture as this browser last knew it, before the first look is painted.
paintCustomWall(rememberedWall());
applyLooks();
function saveLooks({ theme, accent, wallpaper, style, bubbles, text }) {
  // The first value of each look is the room as it always was, kept as no choice at all (app.js, saveLook).
  const keep = (key, value, first) => { if (value === first) localStorage.removeItem(key); else localStorage.setItem(key, value); };
  try {
    if (theme) localStorage.setItem('pulse.theme', theme);
    if (accent) keep('pulse.accent', accent, 'madre');
    if (wallpaper) { keep('pulse.wallpaper', wallpaper, 'default'); saveOwnWallpaper(wallpaper); }
    if (style) keep('pulse.wallpaper.style', style, 'veil');
    if (bubbles) keep('pulse.bubbles', bubbles, BUBBLES[0]);
    if (text) keep('pulse.text', text, TEXTS[0]);
  } catch { /* the choice lasts as long as the page */ }
  applyLooks();
  settingsSheet?.paintLooks();
  pushLooks();
}
function saveHome(name, value) {
  const spec = HOME_LOOKS[name];
  try { if (value === spec.values[0]) localStorage.removeItem(spec.key); else localStorage.setItem(spec.key, value); } catch { /* the choice lasts as long as the page */ }
  pushHomeLayout();
  applyLooks();
  if (name === 'order' && typeof draw === 'function') draw();
  if (name === 'order' && typeof paintOrderKey === 'function') paintOrderKey();
  settingsSheet?.paintLooks();
}
// A dial is saved when it is let go and shown while it moves; the sheet is not painted again under
// the hand (app.js, saveTune).
function saveTune(name, value) {
  try { if (value === TUNES[name].value) localStorage.removeItem(TUNES[name].key); else localStorage.setItem(TUNES[name].key, String(value)); } catch { /* the choice lasts as long as the page */ }
  applyLooks();  pushLooks();
}
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', applyLooks);
// The looks are the person's, not Home's (src/looks.mjs, 2026-10-12): every project is another
// origin, so what this browser kept here no project saw. ~/.pulse/looks.json is read when Home
// opens and whenever it comes back into view, and written when a choice changes. The twin of
// app.js's pullLooks; Home's own card choices (HOME_LOOKS) stay here.
// The wallpaper is each page's own (2026-10-13): Home keeps the one chosen in Home, each project
// the one chosen in it (src/looks.mjs, `rooms`). The rest of the looks are shared.
const SHARED_LOOKS = ['pulse.theme', 'pulse.accent', 'pulse.wallpaper.style', 'pulse.wallpaper.veil', 'pulse.wallpaper.blur', 'pulse.bubbles', 'pulse.text'];
// Before a page had its own, every page wore the shared one: that is where a page starts.
const wallpaperOf = (answer) => answer.own?.wallpaper ?? answer.looks?.['pulse.wallpaper'] ?? null;
function saveOwnWallpaper(value) {
  void fetch('/api/looks/room', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallpaper: value }) }).catch(() => null);
}
let looksPush = 0;
function pushLooks() {
  clearTimeout(looksPush);
  looksPush = setTimeout(() => {
    const patch = {};
    try { for (const key of SHARED_LOOKS) patch[key] = localStorage.getItem(key); } catch { return; }
    void fetch('/api/looks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
  }, 250);
}
// How Home is arranged, the same from every port it is shown on and after MADRE comes back
// (src/looks.mjs, home.json): written when the person changes it, read when Home opens or comes
// back into view. The browser's copy stays, so Home paints as it was before it hears from there.
const HOME_LAYOUT_KEYS = ['pulse.home.layout', 'pulse.home.projects', 'pulse.lobbyBar', 'pulse.home.cards', 'pulse.home.text', 'pulse.home.order'];
let homePush = 0;
function pushHomeLayout() {
  clearTimeout(homePush);
  homePush = setTimeout(() => {
    const patch = {};
    try { for (const key of HOME_LAYOUT_KEYS) patch[key] = localStorage.getItem(key); } catch { return; }
    void fetch('/api/home-layout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
  }, 250);
}
async function pullHomeLayout() {
  let answer = null;
  try { answer = await fetch('/api/home-layout', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)); } catch { return false; }
  if (!answer?.home) return false;
  try {
    // Nothing kept yet: the arrangement this browser had becomes the one every page shows.
    if (!answer.saved) { if (HOME_LAYOUT_KEYS.some((key) => localStorage.getItem(key) !== null)) pushHomeLayout(); return false; }
    let changed = false;
    for (const key of HOME_LAYOUT_KEYS) {
      const value = answer.home[key] ?? null;
      if (localStorage.getItem(key) === value) continue;
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      changed = true;
    }
    return changed;
  } catch { return false; }
}
async function pullLooks() {
  let answer = null;
  try { answer = await fetch('/api/looks', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)); } catch { return; }
  if (!answer?.looks) return;
  // The person's own picture, kept once for every page (public/wallpaper.js): painted as it is now.
  const before = customWall()?.v ?? null;
  paintCustomWall(answer.custom ?? null);
  try {
    // Nothing kept yet: the first page that has a choice of its own hands it to the others.
    if (!answer.saved) { if (SHARED_LOOKS.some((key) => localStorage.getItem(key) !== null)) pushLooks(); return; }
    let changed = before !== (answer.custom?.v ?? null);
    let wall = wallpaperOf(answer);
    if (wall === CUSTOM_WALL && !answer.custom) wall = null;
    for (const [key, value] of [...SHARED_LOOKS.map((one) => [one, answer.looks[one] ?? null]), ['pulse.wallpaper', wall === 'default' ? null : wall]]) {
      if (localStorage.getItem(key) === value) continue;
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      changed = true;
    }
    if (changed) { applyLooks(); settingsSheet?.paintLooks(); }
  } catch { /* no storage: Home keeps the look it has */ }
}
void pullLooks();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void pullLooks(); });
window.addEventListener('storage', (event) => { if (LOOK_KEYS.includes(event.key)) { applyLooks(); settingsSheet?.paintLooks(); } });

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
};

// The same small words as the phone's SALAS (salas.js).
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
// The modes as the room names them (app.js, MODES): asked when shown, so the language is the page's.
const modeName = (n) => [t('INCOGNITO'), t('CHAT ONLY'), t('CREATE'), t('EDIT'), t('FULL ACCESS')][n] ?? '';
function askLine(ask) {
  if (ask.kind === 'mode') return t('@{agent} asks for #{n} {label}', { agent: ask.agent, n: ask.mode, label: modeName(ask.mode) });
  if (ask.kind === 'run') return ask.text ? t('@{agent} wants to run {line}', { agent: ask.agent, line: ask.text }) : t('@{agent} wants to run a command', { agent: ask.agent });
  if (ask.kind === 'bishop') return t('The Coordinator proposes #{n} to @{agent}: confirm it to unlock it', { n: ask.mode, agent: ask.agent });
  if (ask.kind === 'plan') return ask.text ? t('The Coordinator waits for you to confirm: {reason}', { reason: ask.text }) : t('The Coordinator waits for you to confirm');
  return ask.text ? t('@{agent} asks you: {question}', { agent: ask.agent, question: ask.text }) : t('@{agent} asks you to choose', { agent: ask.agent });
}
// The folder, as a person writes it: the home folder is ~.
const homeWord = (path) => String(path ?? '').replace(/^\/(Users|home)\/[^/]+/, '~');
// Where a room is reached from this page: this one is here, the rest at their own port.
const addressOf = (room) => (room.here ? '/' : `http://127.0.0.1:${room.open.port}/`);

// The memory kinds, in the colours NOSTROMO gives them (styles.css, --mem-*).
const KINDS = ['decision', 'fact', 'preference', 'question', 'aberration'];
const KIND_WORDS = { decision: t('DECISION'), fact: t('FACT'), preference: t('PREFERENCE'), question: t('QUESTION'), aberration: t('DOUBTFUL MEMORY') };
// A kind as a sentence says it: «Decisión», not «DECISIÓN».
const kindWord = (kind) => { const word = String(KIND_WORDS[kind] ?? kind).toLowerCase(); return word.charAt(0).toUpperCase() + word.slice(1); };

function memoryStrip(census) {
  const strip = el('div', 'sm-strip');
  const total = census?.memories ?? 0;
  strip.setAttribute('role', 'img');
  if (!total) { strip.classList.add('none'); strip.setAttribute('aria-label', t('No memories yet')); return strip; }
  const said = [];
  for (const kind of KINDS) {
    const count = census.kinds?.[kind] ?? 0;
    if (!count) continue;
    const part = el('i', `k-${kind}`);
    part.style.flexGrow = String(count);
    strip.append(part);
    said.push(`${count} ${KIND_WORDS[kind].toLowerCase()}`);
  }
  strip.setAttribute('aria-label', said.join(', '));
  strip.title = said.join(' · ');
  return strip;
}

function stateOf(room) {
  const glance = room.glance ?? {};
  if (!room.open) return { key: 'asleep', words: room.lastOpened ? t('Asleep · last open {when}', { when: ago(room.lastOpened) }) : t('Asleep') };
  if (glance.outdated) return { key: 'outdated', words: t('Update MADRE in this project to see it here.') };
  if (glance.unreachable) return { key: 'quiet', words: t('Not answering right now') };
  if (glance.delayed) return { key: 'quiet', words: t('Responding slowly · last known state') };
  if (glance.waitingCount) return { key: 'waiting', words: t('Waiting for you · {n}', { n: glance.waitingCount }) };
  if (glance.working?.length) return { key: 'working', words: glance.working.length === 1 ? t('@{agent} is working', { agent: glance.working[0] }) : t('{n} agents working', { n: glance.working.length }) };
  return { key: 'calm', words: t('Calm') };
}

function button(className, words, onClick) {
  const node = el('button', className, words);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

// The other way in for a connection: what the room does, typed in a terminal. Folded, so whoever
// has never opened one is never asked to; a comment line is said, the rest is what gets copied.
// The panel repaints every few seconds: which folds are open is kept here, so one never closes on
// the person reading it. So is which agent is choosing the account to sign in again with.
const openWays = new Set();
const choosingAccount = new Set();
function terminalWay(lines, key) {
  const fold = el('details', 'sm-terminal-way');
  fold.open = openWays.has(key);
  fold.addEventListener('toggle', () => { if (fold.open) openWays.add(key); else openWays.delete(key); });
  fold.append(el('summary', null, t('Prefer your terminal?')));
  const block = el('div', 'sm-terminal-lines');
  for (const line of lines) block.append(line.startsWith('#') ? el('small', 'sm-agent-note', line.slice(1).trim()) : el('code', 'sm-agent-command', line));
  const runnable = lines.filter((line) => !line.startsWith('#'));
  const copy = button('sm-btn small', t('Copy'), async () => {
    try { await navigator.clipboard.writeText(runnable.join('\n')); copy.textContent = t('Copied'); setTimeout(() => { copy.textContent = t('Copy'); }, 1500); }
    catch { copy.textContent = t('Select it'); }
  });
  fold.append(block, copy);
  return fold;
}

function card(room) {
  const glance = room.glance ?? {};
  const state = stateOf(room);
  const node = el('article', `sm-tile sm-card is-${state.key}${room.here ? ' here' : ''}`);
  node.dataset.room = room.id;
  // Its own piece of the wallpaper (salas-mac.css): a place on the image, steady for the project.
  let seed = 0;
  for (const char of room.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  node.style.setProperty('--wx', `${seed % 101}%`);
  node.style.setProperty('--wy', `${(seed >>> 8) % 101}%`);
  // A project with a wallpaper of its own («only in this project») shows that one, whole.
  // The wallpaper its own room wears (each page keeps its own), seen whole; none when it has none.
  if (room.wallpaper && room.wallpaper !== 'default') { node.dataset.wp = room.wallpaper; node.style.setProperty('--wx', '50%'); node.style.setProperty('--wy', '50%'); }
  else node.dataset.wp = 'none';
  // To the bar: dragged there, or pinned from its right-click.
  node.draggable = true;
  node.addEventListener('dragstart', (event) => pinsDragOut(event, room));
  node.addEventListener('dragend', () => pinsDropEnd());
  node.addEventListener('contextmenu', (event) => pinsMenu(event, room));

  const head = el('header', 'sm-card-head');
  head.append(el('h3', null, room.name));
  if (room.here) head.append(el('span', 'sm-chip here', t('You are here')));
  else if (room.open) head.append(el('span', 'sm-chip port', `:${room.open.port}`));
  // What the right-click offers, for whoever does not right-click: a key of its own.
  const more = button('sm-card-more', null, (event) => {
    event.stopPropagation();
    const box = more.getBoundingClientRect();
    pinsMenu(event, room, { x: box.right - 214, y: box.bottom + 6 });
  });
  more.innerHTML = MORE_ICON; // trusted: our own SVG string
  more.title = t('Options for {name}', { name: room.name });
  more.setAttribute('aria-label', more.title);
  more.setAttribute('aria-haspopup', 'menu');
  head.append(more);
  node.append(head);
  if (room.root) node.append(el('p', 'sm-path', homeWord(room.root)));

  const line = el('p', 'sm-state');
  line.append(el('i', 'dot'), document.createTextNode(state.words));
  node.append(line);

  if (glance.waiting?.length) {
    const box = el('div', 'sm-wait');
    box.append(el('span', null, askLine(glance.waiting[0])));
    node.append(box);
  }
  if (glance.chat && !glance.outdated) {
    const chat = el('div', 'sm-chat');
    chat.append(el('b', null, chatName(glance.chat.title)));
    if (glance.chat.preview) chat.append(el('span', null, glance.chat.preview));
    node.append(chat);
  }
  if (room.open && glance.census) {
    node.append(memoryStrip(glance.census));
    const counts = [conversationsCount(glance.chats ?? 0), memoriesCount(glance.census.memories)];
    if (glance.census.memories) counts.push(t('{n} in use', { n: glance.census.travelling }));
    node.append(el('p', 'sm-counts', counts.join(' · ')));
  }

  const actions = el('div', 'sm-actions');
  const doing = busy.get(room.id);
  if (failed.has(room.id)) node.append(el('p', 'sm-error', failed.get(room.id)));
  if (doing) actions.append(waitFor(room.id, { starting: t('Waking…'), closing: t('Closing…'), forgetting: t('Removing…') }[doing] ?? ''));
  else if (forgetting.has(room.id)) {
    // Taking it out of MADRE says what goes and what stays before it happens.
    const links = (data.enlaces ?? []).filter((one) => one.rooms?.a === room.id || one.rooms?.b === room.id).length;
    const why = [
      room.open ? t('It closes and leaves Home.') : t('It leaves Home.'),
      t('Its folder stays on this Mac, and its memory in MADRE.'),
      ...(links ? [links === 1 ? t('Its connection ends.') : t('Its {n} connections end.', { n: links })] : []),
    ].join(' ');
    actions.append(el('span', 'sm-ask', why), button('sm-btn danger small', t('Remove'), () => void forgetRoom(room)), button('sm-btn ghost small', t('Cancel'), () => { forgetting.delete(room.id); draw(); }));
  } else if (asking.has(room.id)) {
    const why = room.here ? t('This page closes with it.') : glance.working?.length ? t('What is running stops.') : t('Nothing is running.');
    actions.append(el('span', 'sm-ask', why), button('sm-btn danger small', t('Close it'), () => closeRoom(room)), button('sm-btn ghost small', t('Cancel'), () => { asking.delete(room.id); draw(); }));
  } else if (room.open) {
    const go = el('a', 'sm-btn primary small', room.here ? t('Back to the project') : t('Open'));
    go.href = addressOf(room);
    actions.append(go);
    if (!glance.outdated) actions.append(button('sm-btn ghost small', t('Close'), () => { failed.delete(room.id); asking.add(room.id); draw(); }));
  } else if (room.root) {
    actions.append(button('sm-btn primary small', t('Open'), () => startRoom(room, { enter: true })));
  }
  node.append(actions);
  return node;
}

// Open first, by what needs the person: waiting, then working, then the rest, newest first.
const ORDER = { waiting: 0, working: 1, calm: 2, quiet: 3, outdated: 4 };
// The projects in the order the lobby shows them: the open ones by what needs the person, then
// the asleep ones, the last opened first. BISHOP's own room is not a project.
const PROJECT_ORDER_KEY = 'pulse.home.projects';
function projectOrder() {
  try { const list = JSON.parse(localStorage.getItem(PROJECT_ORDER_KEY) ?? '[]'); return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []; } catch { return []; }
}
// A project moved by hand: the whole order as it is on screen now, with that one moved, becomes
// «Yours» — so moving one never shuffles the others.
function moveProject(id, where) {
  const list = projectsInOrder().all.map((room) => room.id);
  const at = list.indexOf(id);
  if (at < 0) return;
  list.splice(at, 1);
  const to = where === 'first' ? 0 : where === 'last' ? list.length : Math.max(0, Math.min(list.length, at + where));
  list.splice(to, 0, id);
  try { localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(list)); } catch { /* the order lasts as long as the page */ }
  saveHome('order', 'mine');
}
function projectsInOrder() {
  const projects = data.rooms.filter((room) => room.id !== data.salas);
  const open = projects.filter((room) => room.open)
    .sort((a, b) => (ORDER[stateOf(a).key] - ORDER[stateOf(b).key]) || (Date.parse(b.glance?.chat?.at ?? 0) - Date.parse(a.glance?.chat?.at ?? 0)));
  const asleep = projects.filter((room) => !room.open).sort((a, b) => Date.parse(b.lastOpened ?? b.added ?? 0) - Date.parse(a.lastOpened ?? a.added ?? 0));
  // The order Home's Appearance chose: what needs the person first (as above), by name, or by the
  // last thing that happened in each, open or asleep.
  const order = readLooks().home.order;
  const touched = (room) => Math.max(Date.parse(room.glance?.chat?.at ?? 0) || 0, Date.parse(room.lastOpened ?? room.added ?? 0) || 0);
  // «Yours» (2026-10-13): the order the person made with right-click › Move; a project they never
  // placed comes after, in the order of what needs them.
  const mine = order === 'mine' ? projectOrder() : [];
  const placed = (room) => { const at = mine.indexOf(room.id); return at < 0 ? Number.MAX_SAFE_INTEGER : at; };
  const all = order === 'name' ? [...projects].sort((a, b) => a.name.localeCompare(b.name, language))
    : order === 'recent' ? [...projects].sort((a, b) => touched(b) - touched(a))
      : order === 'mine' ? [...open, ...asleep].map((room, index) => [room, index]).sort(([a, i], [b, j]) => placed(a) - placed(b) || i - j).map(([room]) => room)
        : [...open, ...asleep];
  return { all, open, asleep };
}
function draw() {
  if (!data) return;
  const { all, open } = projectsInOrder();
  drawBishop(data.rooms.find((room) => room.id === data.salas) ?? null);
  drawWaiting();
  drawProjects(all);
  if (!all.length && !welcomed) { welcomed = true; void homeTour.loaded.then((answer) => { if (!answer?.owed) openWizard(); }); }
  welcomeHome();
  const working = open.some((room) => room.glance?.working?.length);
  ui.stop.hidden = !working;
  drawLinks(all);
  drawMemory();
  drawAttention();
  drawTopbar();
  // The macroverse wants a large screen: on a small one SALAS is the whole of it.
  ui.macro.hidden = !data.rooms.length || window.innerWidth < 900;
  macro?.update(data.rooms, data.enlaces ?? []);
  settingsSheet?.sync();
  fitTiles();
}

// The projects, as the search box and the filter leave them. Nothing is hidden by the filter
// without saying so: an empty result says what was asked.
function shows(room) {
  if (filter === 'open' && !room.open) return false;
  if (filter === 'asleep' && room.open) return false;
  if (!query) return true;
  const wanted = query.toLocaleLowerCase(language);
  return room.name.toLocaleLowerCase(language).includes(wanted) || homeWord(room.root).toLocaleLowerCase(language).includes(wanted);
}
function drawProjects(all = data ? projectsInOrder().all : []) {
  if (!data) return;
  const shown = all.filter(shows);
  ui.projects.replaceChildren(...shown.map(card));
  ui.projects.hidden = !shown.length;
  ui.none.hidden = Boolean(shown.length);
  ui.none.replaceChildren();
  fitDrawer(all);
  if (!all.length) ui.none.append(el('span', null, t('No projects yet. Add the first one.')), button('sm-btn primary small', t('Add a project'), openAddSheet));
  else if (!shown.length) ui.none.append(el('span', null, query ? t('No project matches «{query}».', { query }) : filter === 'open' ? t('No project is open.') : t('No project is asleep.')));
}
// THE DRAWER (2026-10-13): the projects live in a tile of their own, moved like any other, three
// rows at a time. What does not fit is counted on a key under them — «+5», how many are open and
// how many asleep — and the key opens the drawer whole, or closes it back to three rows.
const drawerMore = $('sm-drawer-more');
let drawerOpen = false;
const DRAWER_ROWS = 3;
function fitDrawer(all = data ? projectsInOrder().all : []) {
  const count = $('sm-drawer-count');
  if (count) count.textContent = String(all.length);
  const cards = [...ui.projects.querySelectorAll('.sm-card[data-room]')];
  for (const one of cards) one.hidden = false;
  if (!cards.length) { drawerMore.hidden = true; return; }
  // How many fit in a row is the grid's to say, at this width: 4, 3 or 2.
  const first = cards[0].getBoundingClientRect();
  const perRow = Math.max(1, Math.round((ui.projects.getBoundingClientRect().width + 16) / ((first.width || 1) + 16)));
  const room = perRow * DRAWER_ROWS;
  const out = cards.slice(room);
  if (!out.length) { drawerMore.hidden = true; return; }
  if (!drawerOpen) for (const one of out) one.hidden = true;
  const rooms = out.map((one) => data.rooms.find((room) => room.id === one.dataset.room)).filter(Boolean);
  const open = rooms.filter((room) => room.open).length;
  const asleep = rooms.length - open;
  drawerMore.hidden = false;
  drawerMore.replaceChildren();
  if (drawerOpen) drawerMore.append(el('span', null, t('Show fewer')));
  else {
    drawerMore.append(el('b', null, `+${out.length}`));
    const parts = [open ? t('{n} open', { n: open }) : null, asleep ? t('{n} asleep', { n: asleep }) : null].filter(Boolean);
    drawerMore.append(el('span', null, parts.join(' · ')));
  }
  drawerMore.setAttribute('aria-expanded', String(drawerOpen));
  drawerMore.title = drawerOpen ? t('Show three rows') : t('{n} more projects: {parts}', { n: out.length, parts: [open ? t('{n} open', { n: open }) : null, asleep ? t('{n} asleep', { n: asleep }) : null].filter(Boolean).join(', ') });
}
drawerMore?.addEventListener('click', () => { drawerOpen = !drawerOpen; fitDrawer(); fitTiles(); });
if (typeof ResizeObserver === 'function') {
  let wide = 0;
  new ResizeObserver(() => { const now = Math.round(ui.projects.getBoundingClientRect().width); if (now && now !== wide) { wide = now; fitDrawer(); } }).observe(ui.projects);
}
ui.search.addEventListener('input', () => { query = ui.search.value.trim(); drawProjects(); });
for (const choice of ui.filter.querySelectorAll('[data-filter]')) {
  choice.addEventListener('click', () => {
    filter = choice.dataset.filter;
    for (const one of ui.filter.querySelectorAll('[data-filter]')) one.setAttribute('aria-checked', String(one === choice));
    drawProjects();
  });
}

// ORDER, where the projects are (2026-10-13): the same four orders as Home's Appearance, one press
// away from the list they arrange. «Yours» is the order made by dragging a card or by its
// right-click › Move; the menu says so, so the way to make it is never a secret.
const SORT_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5v11M3.5 13 6 15.5 8.5 13"/><path d="M11 6h5.5M11 10h4M11 14h2.5"/></svg>';
const orderKey = button('sm-btn sm-order', null, () => {
  const box = orderKey.getBoundingClientRect();
  const now = readLooks().home.order;
  homeMenu({ x: box.left, y: box.bottom + 6 }, [
    { heading: t('Order the projects') },
    ...HOME_LOOKS.order.values.map((value) => ({ words: HOME_LOOKS.order.words[value](), icon: SORT_ICON, checked: now === value, act: () => saveHome('order', value) })),
    'sep',
    { heading: t('Drag a card, or right-click it › Move, to make your own.') },
  ], t('Order the projects'));
});
ui.filter.after(orderKey);
function paintOrderKey() {
  const now = readLooks().home.order;
  orderKey.innerHTML = SORT_ICON; // trusted: our own SVG string
  orderKey.append(el('span', null, HOME_LOOKS.order.words[now]()));
  orderKey.title = t('Order the projects');
  orderKey.setAttribute('aria-label', `${t('Order the projects')}: ${HOME_LOOKS.order.words[now]()}`);
  orderKey.setAttribute('aria-haspopup', 'menu');
}
paintOrderKey();

// WAITING FOR YOU: every question an agent asks the person, from every open room, counted in one
// number; the first ones said, each leading to its room.
function drawWaiting() {
  const rooms = data.rooms.filter((room) => room.open && room.glance?.waitingCount);
  const total = rooms.reduce((sum, room) => sum + room.glance.waitingCount, 0);
  ui.waiting.count.textContent = String(total);
  ui.waiting.box.classList.toggle('has', Boolean(total));
  ui.waiting.body.replaceChildren();
  if (!total) { ui.waiting.body.append(el('p', 'sm-hint', t('Nobody needs you. When an agent asks for you, it shows here.'))); return; }
  for (const room of rooms.slice(0, 2)) {
    const row = el('a', 'sm-waiting-row');
    row.href = addressOf(room);
    const first = room.glance.waiting?.[0];
    row.append(el('b', null, roomLabel(room)), el('span', null, first ? askLine(first) : t('Waiting for you · {n}', { n: room.glance.waitingCount })));
    ui.waiting.body.append(row);
  }
  if (rooms.length > 2) ui.waiting.body.append(el('p', 'sm-hint', t('And {n} more projects.', { n: rooms.length - 2 })));
}

// MEMORY: what the open rooms hold, added up, by kind. A room asleep is not asked, so it is not
// counted, and the tile says so.
function drawMemory() {
  const sum = { memories: 0, travelling: 0, kinds: {} };
  const counted = data.rooms.filter((room) => room.open && room.glance?.census);
  for (const room of counted) {
    const census = room.glance.census;
    sum.memories += census.memories ?? 0;
    sum.travelling += census.travelling ?? 0;
    for (const kind of KINDS) sum.kinds[kind] = (sum.kinds[kind] ?? 0) + (census.kinds?.[kind] ?? 0);
  }
  ui.memory.total.textContent = t('{n} memories', { n: sum.memories });
  ui.memory.total.hidden = !counted.length;
  ui.memory.body.replaceChildren();
  if (!counted.length) { ui.memory.body.append(el('p', 'sm-hint', t('Open a project to count its memory.'))); return; }
  ui.memory.body.append(memoryStrip(sum));
  const legend = el('div', 'sm-legend');
  for (const kind of KINDS) {
    if (!sum.kinds[kind]) continue;
    const item = el('span', `k-${kind}`, `${kindWord(kind)} · ${sum.kinds[kind]}`);
    legend.append(item);
  }
  ui.memory.body.append(legend, el('p', 'sm-hint', [sum.memories ? t('{n} in use', { n: sum.travelling }) : null, t('Counted in the open projects.')].filter(Boolean).join(' · ')));
}

// AGENTS: the ones on this computer, with the session each has. Connected once, every project
// uses them; the settings sheet installs or signs in the one that needs it, and «Needs you» says
// which one does.
function agentState(agent, answer) {
  const session = answer.sessions?.[agent.id]?.state;
  const busyNow = answer.loggingIn === agent.id;
  const ok = agent.ready && session !== 'signed-out';
  return { ok, busyNow, key: ok ? 'ok' : busyNow ? 'wait' : agent.detected ? 'bad' : 'wait', words: ok ? t('Connected') : busyNow ? t('Signing in…') : agent.detected ? t('Not signed in') : t('Not installed') };
}
async function loadAgents() {
  const answer = await fetch('/api/settings', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!answer?.agents) return;
  agentsSeen = answer;
  drawAttention();
  drawTopbar();
  settingsSheet?.sync();
}
// MADRE itself: the version this room runs and the newest one it knows of.
// Asked again every hour (the server asks npm at most once a day); the first time a newer MADRE
// shows up while Home is open, it says so once, and the pill stays in the bar.
let versionAnnounced = null;
async function loadVersion() {
  const answer = await fetch('/api/version', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!answer) return;
  versionSeen = answer;
  if (answer.available && answer.latest && versionAnnounced !== answer.latest) {
    versionAnnounced = answer.latest;
    toast(t('MADRE {version} is out. Update it from the bar.', { version: answer.latest }), 'look');
  }
  drawAttention();
  drawTopbar();
  settingsSheet?.sync();
}
setInterval(() => { if (!document.hidden) void loadVersion(); }, 60 * 60 * 1000);

// The open projects that run an older MADRE than Home: Home was updated, they were not restarted.
const versionParts = (value) => String(value ?? '').split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
function olderVersion(a, b) {
  const [x, y] = [versionParts(a), versionParts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
}
function behindRooms() {
  if (!data?.version) return [];
  return data.rooms.filter((room) => room.open?.version && !room.here && room.id !== data.salas && olderVersion(room.open.version, data.version) && !busy.has(room.id));
}
// A project restarted with the MADRE Home runs: closed, then opened again where it was.
async function restartRoom(room) {
  await closeRoom(room);
  if (data?.rooms.find((one) => one.id === room.id)?.open) return;
  await startRoom(room);
}

// Every project still on the older MADRE, one after the other (1.0.1). Only the quiet ones: a
// project with an agent working or a question waiting for the person is left as it is, and said.
const roomQuiet = (room) => !room.glance?.working?.length && !room.glance?.waitingCount;
let restartingAll = false;
async function restartAll() {
  if (restartingAll) return;
  const behind = behindRooms();
  const quiet = behind.filter(roomQuiet);
  const left = behind.filter((room) => !roomQuiet(room));
  if (!quiet.length) { toast(t('Every project on the older MADRE is busy now: restart them when they finish.'), 'look'); return; }
  restartingAll = true;
  try {
    for (const [index, room] of quiet.entries()) {
      toast(t('Restarting {room} · {n} of {total}', { room: roomLabel(room), n: index + 1, total: quiet.length }));
      await restartRoom(room);
    }
  } finally {
    restartingAll = false;
  }
  toast(left.length
    ? t('{n} restarted. Left as they are, because they are busy: {rooms}.', { n: quiet.length, rooms: left.map(roomLabel).join(', ') })
    : t('{n} restarted with MADRE {version}.', { n: quiet.length, version: data?.version ?? '' }), left.length ? 'look' : 'done');
  settingsSheet?.sync({ detail: true });
}

// NEEDS YOU: what the person would want to know before anything else, from what the rooms, the
// agents and MADRE itself say: a room on an older MADRE or not answering, an agent without a
// session, a link about to expire, a newer MADRE. Nothing listed is a guess.
function attentionItems() {
  const items = [];
  for (const room of data?.rooms ?? []) {
    if (!room.open) continue;
    const name = roomLabel(room);
    if (room.glance?.outdated) items.push({ tone: 'wait', words: t('{room} runs an older MADRE.', { room: name }), hint: t('Update it to see it here and to connect it.'), href: addressOf(room), go: t('Open') });
    else if (room.glance?.unreachable) items.push({ tone: 'bad', words: t('{room} is not answering.', { room: name }), hint: t('It may be busy. If it stays like this, close it and open it again.') });
  }
  for (const agent of (agentsSeen?.agents ?? []).filter((one) => one.id !== 'madre')) {
    const state = agentState(agent, agentsSeen);
    if (!state.ok) items.push({ tone: state.key, words: `${agent.label ?? agent.id} · ${state.words}`, hint: t('Connected once, every project uses it.'), act: () => openSettings('agents'), go: t('Connect') });
  }
  const soon = Date.now() + 3 * 86400000;
  for (const enlace of data?.enlaces ?? []) {
    if (!enlace.expires || Date.parse(enlace.expires) > soon) continue;
    const { source, reader } = endsOf(enlace);
    items.push({ tone: 'wait', words: t('The connection {reader} ← {source} ends {when}.', { reader: roomName(reader), source: roomName(source), when: ago(enlace.expires) }), hint: t('Sign it again if it should go on.'), act: () => ui.linksSheet.showModal(), go: t('See the connections') });
  }
  if (versionSeen?.available && versionSeen.latest) items.push({ tone: 'ok', words: t('MADRE {version} is out.', { version: versionSeen.latest }), hint: t('You run {version}. Home restarts with it from here.', { version: versionSeen.current }), act: () => openSettings('release'), go: t('Update') });
  // After Home updated, the projects that stayed open still run the version they started with.
  const behind = behindRooms();
  if (behind.length > 1) items.push({ tone: 'wait', words: t('{n} projects run an older MADRE.', { n: behind.length }), hint: t('Restart them all to bring them to {latest}. A project that is working or waiting for you is left for later.', { latest: data.version }), act: () => void restartAll(), go: t('Restart all') });
  else for (const room of behind) items.push({ tone: 'wait', words: t('{room} runs MADRE {version}.', { room: roomLabel(room), version: room.open.version }), hint: t('Restart it to bring it to {latest}: what is running stops.', { latest: data.version }), act: () => void restartRoom(room), go: t('Restart') });
  return items;
}
function drawAttention() {
  const items = attentionItems();
  ui.attention.count.textContent = String(items.length);
  ui.attention.count.hidden = !items.length;
  ui.attention.list.replaceChildren();
  if (!items.length) {
    const calm = el('li', 'sm-attention-item is-calm');
    const words = el('div', 'sm-attention-words');
    words.append(el('b', null, t('All in order.')), el('span', null, t('No project, agent or connection needs you.')));
    calm.append(el('i', 'dot'), words);
    ui.attention.list.append(calm);
    return;
  }
  for (const item of items.slice(0, 3)) {
    const row = el('li', `sm-attention-item is-${item.tone}`);
    const words = el('div', 'sm-attention-words');
    words.append(el('b', null, item.words), el('span', null, item.hint));
    row.append(el('i', 'dot'), words);
    if (item.href) {
      const go = el('a', 'sm-btn small', item.go);
      go.href = item.href;
      if (item.external) { go.target = '_blank'; go.rel = 'noopener'; }
      row.append(go);
    } else if (item.act) row.append(button('sm-btn small', item.go, item.act));
    ui.attention.list.append(row);
  }
  if (items.length > 3) ui.attention.list.append(el('li', 'sm-hint', t('And {n} more.', { n: items.length - 3 })));
}

// RECENT DECISIONS: what the open rooms decided last, in their own words, as each archive keeps
// them (the notes that travel into turns). Read through the lobby's route, which asks the rooms
// at most every few minutes.
async function loadDecisions() {
  const answer = await fetch('/api/salas/decisions', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!answer) return;
  decisions = answer.decisions ?? [];
  drawDecisions();
}
function drawDecisions() {
  const list = ui.decisions.list;
  list.replaceChildren();
  if (!decisions) { list.append(el('li', 'sm-hint', t('Reading the open projects…'))); return; }
  if (!decisions.length) { list.append(el('li', 'sm-hint', t('No decisions yet in the open projects. When an archive keeps one, it shows here.'))); return; }
  for (const one of decisions.slice(0, 4)) {
    const item = el('li', 'sm-decision');
    const head = el('div', 'sm-decision-head');
    head.append(roomTag(one.room, one.name), el('time', null, ago(one.at)));
    item.append(head, el('p', null, one.text));
    list.append(item);
  }
  if (typeof fitTiles === 'function') fitTiles();
}
// A project's name as a small tag: a way into it when it is open.
function roomTag(id, name) {
  const room = data?.rooms.find((one) => one.id === id) ?? null;
  // The Coordinator's own project is named as the Coordinator, in the reader's language.
  const tag = el(room?.open ? 'a' : 'span', 'sm-chip port sm-tag-room', id === data?.salas ? t('Coordinator') : name);
  if (room?.open) tag.href = addressOf(room);
  return tag;
}

// THE LAST WORK: MADRE's summary of the newest conversations of every project, written with its
// local model in this Mac (src/lobby-work.mjs) and checked against them. Without the model, or
// while it writes, the conversations show as they are.
let workTimer = 0;
async function loadWork({ again = false } = {}) {
  clearTimeout(workTimer);
  if (again) { ui.work.again.disabled = true; ui.work.box.classList.add('is-working'); }
  const answer = await fetch('/api/salas/work', again ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' } : { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (answer) { work = answer; drawWork(); }
  // While MADRE writes, the tile asks again soon; otherwise every two minutes.
  workTimer = setTimeout(() => { if (!document.hidden) void loadWork(); }, answer?.state === 'working' ? 3000 : 120000);
}
function drawWork() {
  const w = ui.work;
  w.list.replaceChildren();
  const state = work?.state ?? 'loading';
  w.box.classList.toggle('is-working', state === 'working');
  w.again.hidden = !work || state === 'empty' || state === 'unavailable';
  w.again.disabled = state === 'working';
  if (!work) { w.by.textContent = ''; w.note.textContent = t('Reading your conversations…'); return; }
  if (state === 'empty') { w.by.textContent = ''; w.note.textContent = t('No conversations in the last two weeks. What you work on in any project shows here, summarised by MADRE.'); return; }
  const bullets = work.bullets ?? [];
  if (bullets.length) {
    // Each line's project is the conversation's it summarises, put by the lobby (src/lobby-work.mjs).
    for (const one of bullets) {
      const item = el('li');
      item.append(roomTag(one.room, one.name), el('span', null, one.text));
      w.list.append(item);
    }
  } else {
    for (const one of (work.sources ?? []).slice(0, 5)) {
      const item = el('li', 'raw');
      const words = el('span');
      words.append(el('b', null, chatName(one.title)));
      if (one.last?.text) words.append(document.createTextNode(` — ${one.last.text}`));
      item.append(roomTag(one.room, one.name), words, el('time', null, ago(one.at)));
      w.list.append(item);
    }
  }
  w.by.textContent = bullets.length && work.at ? `@madre · ${work.model ?? ''} · ${ago(new Date(work.at).toISOString())}` : '';
  w.note.textContent = state === 'working' ? t('MADRE is summarising your latest conversations…')
    : state === 'unavailable' ? (bullets.length ? t('MADRE\'s local model is off: this is the last summary it wrote.') : t('MADRE\'s local model is off: these are your latest conversations, as they are.'))
    : state === 'failed' ? t('MADRE could not summarise them this time: these are your latest conversations, as they are.')
    : work.stale ? t('There is newer work than this summary: it updates itself in a few minutes, or now if you press Summarize again.')
    : t('Written by MADRE on this Mac from your latest conversations.');
  if (typeof fitTiles === 'function') fitTiles();
}
ui.work.again.addEventListener('click', () => void loadWork({ again: true }));

// LINKS (docs/MACROVERSO.md, phase 3c): the contracts between rooms, read from /api/salas, each
// one revocable here, and the sheet that signs a new one. A contract says which room reads which,
// what kinds cross and until when; what crosses is counted, never shown.
const roomLabel = (room) => (room.id === data?.salas ? t('Coordinator') : room.name);
const roomName = (id) => { const room = data?.rooms.find((one) => one.id === id); return room ? roomLabel(room) : id === data?.salas ? t('Coordinator') : id; };
const kindsWords = (kinds) => (kinds ?? []).map((kind) => (KIND_WORDS[kind] ?? kind).toLowerCase()).join(', ');
// Who reads and who serves, from the contract's own words: `a→b` means the notes travel from a to b.
function endsOf(enlace) {
  const { a, b } = enlace.rooms;
  return enlace.direction === 'b→a' ? { source: b, reader: a } : { source: a, reader: b };
}
function linkRow(enlace) {
  const { source, reader } = endsOf(enlace);
  const node = el('article', `sm-link${revoking.has(enlace.id) ? ' revoking' : ''}`);
  node.dataset.link = enlace.id;
  node.append(el('span', 'sm-link-kind', source === data.salas || reader === data.salas ? t('With the Coordinator') : t('Between projects')));
  const who = el('p', 'who');
  who.append(enlace.direction === 'both' ? sayTinted('{a} and {b} read each other', { a: enlace.rooms.a, b: enlace.rooms.b }) : sayTinted('{reader} reads from {source}', { reader, source }));
  node.append(who);
  const what = [kindsWords(enlace.kinds), enlace.expires ? t('until {date}', { date: new Date(enlace.expires).toLocaleDateString(language, { day: 'numeric', month: 'short' }) }) : t('no expiry')];
  if (enlace.orders?.allowed) what.push(t('orders up to #{n}', { n: enlace.orders.maxMode }));
  // D-S13: a link BISHOP signed on its own says so, so it is never mistaken for one you signed.
  if (enlace.signed?.by === 'bishop') what.push(t('signed by the Coordinator'));
  if (enlace.train) what.push(t('the Coordinator learns from it'));
  if (enlace.state) what.push(t('shares its state'));
  if (enlace.deliver) what.push(t('receives delivered notes'));
  node.append(el('p', 'what', what.join(' · ')));
  const traffic = enlace.traffic ?? {};
  // S-021: the last reading says who read, as the room that asked said it.
  const last = traffic.lastAt ? (traffic.lastAgent ? t('last by @{agent} of {room}, {when}', { agent: traffic.lastAgent, room: roomName(traffic.lastRoom), when: ago(traffic.lastAt) }) : t('last {when}', { when: ago(traffic.lastAt) })) : t('none yet');
  node.append(el('p', 'traffic', [t('{n} reads in 24 h', { n: traffic.reads24h ?? 0 }), last].join(' · ')));
  // Fase 3e: recall on every turn, ticked or cleared here by the human.
  const recall = el('label', 'row sm-recall');
  const recallBox = el('input'); recallBox.type = 'checkbox'; recallBox.checked = Boolean(enlace.recall);
  recallBox.addEventListener('change', async () => {
    recallBox.disabled = true;
    const answer = await fetch('/api/salas/enlaces/recall', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: enlace.id, recall: recallBox.checked }) })
      .then((response) => response.ok).catch(() => false);
    if (!answer) recallBox.checked = !recallBox.checked;
    recallBox.disabled = false;
    await refresh();
  });
  recall.append(recallBox, document.createTextNode(t('Always include (up to 3 notes)')));
  node.append(recall);
  // D-S15: on a link the Coordinator reads, whether it also learns from that project.
  if (reader === data.salas) {
    const learn = el('label', 'row sm-recall');
    const learnBox = el('input'); learnBox.type = 'checkbox'; learnBox.checked = Boolean(enlace.train);
    learnBox.addEventListener('change', async () => {
      learnBox.disabled = true;
      const answer = await fetch('/api/salas/enlaces/train', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: enlace.id, train: learnBox.checked }) })
        .then((response) => response.ok).catch(() => false);
      if (!answer) learnBox.checked = !learnBox.checked;
      learnBox.disabled = false;
      await refresh();
    });
    learn.append(learnBox, document.createTextNode(t('The Coordinator learns from it')));
    node.append(learn);
  }
  // D-S16 and D-S17: what else the link allows, ticked or cleared here by you.
  for (const [field, label] of [['state', t('It shares its state')], ['deliver', t('It receives delivered notes')]]) {
    const allow = el('label', 'row sm-recall');
    const box = el('input'); box.type = 'checkbox'; box.checked = Boolean(enlace[field]);
    box.addEventListener('change', async () => {
      box.disabled = true;
      const answer = await fetch('/api/salas/enlaces/allow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: enlace.id, field, on: box.checked }) })
        .then((response) => response.ok).catch(() => false);
      if (!answer) box.checked = !box.checked;
      box.disabled = false;
      await refresh();
    });
    allow.append(box, document.createTextNode(label));
    node.append(allow);
  }
  const actions = el('div', 'sm-actions');
  if (revoking.has(enlace.id)) actions.append(el('span', 'sm-ask', t('Nothing crosses from then on.')), button('sm-btn danger', t('Revoke it'), () => revokeLink(enlace.id)), button('sm-btn ghost', t('Cancel'), () => { revoking.delete(enlace.id); draw(); }));
  else actions.append(button('sm-btn ghost', t('Revoke'), () => { revoking.add(enlace.id); draw(); }));
  node.append(actions);
  return node;
}
function drawLinks(projects) {
  const enlaces = [...(data.enlaces ?? [])].sort((a, b) => {
    const direct = (one) => Number(one.rooms.a !== data.salas && one.rooms.b !== data.salas);
    return direct(b) - direct(a) || roomName(endsOf(a).reader).localeCompare(roomName(endsOf(b).reader)) || roomName(endsOf(a).source).localeCompare(roomName(endsOf(b).source));
  });
  const enough = data.rooms.length >= 2;
  ui.link.hidden = !enough;
  ui.linkMore.hidden = !enough;
  ui.linksAll.hidden = !enlaces.length;
  const reads = enlaces.reduce((sum, enlace) => sum + (enlace.traffic?.reads24h ?? 0), 0);
  ui.linksSum.textContent = enlaces.length
    ? [enlaces.length === 1 ? t('1 in force') : t('{n} in force', { n: enlaces.length }), t('{n} reads in 24 h', { n: reads })].join(' · ')
    : enough ? t('No connections yet.') : t('Add a project to connect it.');
  ui.linksNote.textContent = t('A connection lets one project read the summarized notes of another, read-only, by a contract you sign here. Nothing is written across, and only notes already used in answers are shared.');
  ui.links.replaceChildren(...enlaces.map(linkRow));
  if (!enlaces.length && ui.linksSheet.open) ui.linksSheet.close();
  drawMap(projects, enlaces);
}
// A sentence whose project names wear their tone (the map's): `vars` names room ids.
function sayTinted(key, vars) {
  const out = document.createDocumentFragment();
  const template = t(key);
  let at = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    out.append(template.slice(at, match.index));
    const id = vars[match[1]];
    if (id === undefined) out.append(match[0]);
    else {
      const name = el('b', `sm-tinted${id === data.salas ? ' hub' : ''}`, roomName(id));
      if (id !== data.salas) name.style.setProperty('--pc', toneOf(id));
      out.append(name);
    }
    at = match.index + match[0].length;
  }
  out.append(template.slice(at));
  return out;
}
async function revokeLink(id) {
  revoking.delete(id);
  await fetch('/api/salas/enlaces/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
  await refresh();
}
ui.linksAll.addEventListener('click', () => { if (!ui.linksSheet.open) ui.linksSheet.showModal(); });
// The tile's map is the small one: a press opens the map of connections in its own window.
ui.map.addEventListener('click', (event) => { if (event.target.closest('svg') && (data?.enlaces ?? []).length) openGraph(); });
// Closed, the sheet has no size to draw at: the wide map is drawn each time it opens.

ui.linksClose.addEventListener('click', () => ui.linksSheet.close());
ui.linkMore.addEventListener('click', () => openLinkSheet());

// The map of the links (redrawn 2026-10-13): the Coordinator in the middle and, round it, the
// projects a contract touches, each in its own tone of the accent the person chose, so a project
// is the same colour on the map, on its wires and in the words under it. The tile draws only the
// connected ones, large enough to read; the sheet («See the connections») draws them all, wide.
// Nothing here is drawn that the contracts do not say.
const SVG = 'http://www.w3.org/2000/svg';
const svgNode = (tag, attributes = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
};
// A project's tone: the accent turned round the colour wheel, keeping its own lightness and
// strength. The turns are shared out evenly among the projects a connection touches (in a steady
// order, by id), so no two of them look alike; the first wears the accent itself. Where the
// browser cannot turn a colour (no relative colour syntax), every project wears the accent.
const TURNS = typeof CSS !== 'undefined' && CSS.supports?.('color', 'oklch(from red l c h)');
function toneOf(id) {
  const linked = [...new Set((data?.enlaces ?? []).flatMap((enlace) => [enlace.rooms.a, enlace.rooms.b]))].filter((one) => one !== data?.salas).sort();
  const index = linked.indexOf(id);
  if (!TURNS || index <= 0) return 'var(--s-acc)';
  const step = 360 / Math.max(5, linked.length);
  return `oklch(from var(--s-acc) l c calc(h + ${(index * step).toFixed(1)}))`;
}
// One project at a time (2026-10-13): under the pointer, or chosen in the window, a project
// lights its own connections and the projects at their other end; the rest steps back.
function focusable(svg, { pick = null, picked = null } = {}) {
  const light = (id) => {
    svg.classList.toggle('focusing', Boolean(id));
    const near = new Set(id ? [id] : []);
    for (const wire of svg.querySelectorAll('.wire')) {
      const on = Boolean(id) && (wire.dataset.a === id || wire.dataset.b === id);
      wire.classList.toggle('lit', Boolean(on || (picked?.link && wire.dataset.link === picked.link)));
      if (on) { near.add(wire.dataset.a); near.add(wire.dataset.b); }
    }
    for (const dot of svg.querySelectorAll('.note, .flow')) dot.classList.toggle('lit', Boolean(id) && (dot.dataset.a === id || dot.dataset.b === id));
    for (const node of svg.querySelectorAll('.node, .bishop')) node.classList.toggle('lit', near.has(node.dataset.id));
  };
  const resting = () => {
    if (picked?.room) return light(picked.room);
    if (picked?.link) {
      const wire = svg.querySelector(`.wire[data-link="${CSS.escape(picked.link)}"]`);
      svg.classList.add('focusing');
      wire?.classList.add('lit');
      for (const node of svg.querySelectorAll('.node, .bishop')) node.classList.toggle('lit', Boolean(wire) && (node.dataset.id === wire.dataset.a || node.dataset.id === wire.dataset.b));
      return;
    }
    light(null);
  };
  for (const node of svg.querySelectorAll('.node, .bishop')) {
    node.addEventListener('pointerenter', () => light(node.dataset.id));
    node.addEventListener('pointerleave', resting);
    if (pick) {
      node.classList.add('pickable');
      node.addEventListener('click', (event) => { event.stopPropagation(); pick({ room: node.dataset.id }); });
    }
  }
  if (pick) {
    for (const wire of svg.querySelectorAll('.wire')) {
      wire.classList.add('pickable');
      // A line is thin; the hand gets a wider, invisible one along it.
      const hit = svgNode('path', { class: 'hit', d: wire.getAttribute('d') });
      hit.addEventListener('click', (event) => { event.stopPropagation(); pick({ link: wire.dataset.link }); });
      hit.addEventListener('pointerenter', () => wire.classList.add('hover'));
      hit.addEventListener('pointerleave', () => wire.classList.remove('hover'));
      wire.after(hit);
    }
    svg.addEventListener('click', () => pick(null));
  }
  resting();
}

// THE MAP OF CONNECTIONS, in a window of its own: the same drawing, wide, every project round the
// Coordinator, and beside it what was chosen — a project (whom it reads, who reads it) or a line
// (what crosses, until when, how often it was read). Opened from the tile's map.
let graphWindow = null;
function openGraph() {
  if (graphWindow?.open) return;
  graphWindow?.remove();
  graphWindow = el('dialog', 'sm-sheet sm-graph');
  const body = el('div', 'sm-sheet-body');
  const head = el('header', 'sm-sheet-head');
  const words = el('div', 'sm-graph-title');
  words.append(el('h3', null, t('Map of connections')), el('small', null, t('Who looks up whom. Touch a project or a line.')));
  const keys = el('span', 'surface-modes');
  const close = button('surface-mode close x-close x-only', null, () => graphWindow.close());
  close.setAttribute('aria-label', t('Close'));
  close.innerHTML = '<span class="x-icon"><svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'; // trusted
  keys.append(close);
  head.append(words, keys);
  const stage = el('div', 'sm-graph-stage');
  const canvas = el('div', 'sm-map sm-map-wide sm-graph-canvas');
  const side = el('aside', 'sm-graph-side');
  stage.append(canvas, side);
  body.append(head, stage);
  graphWindow.append(body);
  document.body.append(graphWindow);
  let picked = null;
  const paint = () => {
    if (!graphWindow?.isConnected || !mapDrawn) return;
    paintMap(canvas, mapDrawn.projects, mapDrawn.enlaces, { wide: true, pick: (next) => { picked = next; paint(); }, picked });
    paintSide(side, picked, () => { graphWindow.close(); if (!ui.linksSheet.open) ui.linksSheet.showModal(); });
  };
  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(() => paint()) : null;
  graphWindow.addEventListener('close', () => { watch?.disconnect(); graphWindow?.remove(); graphWindow = null; });
  graphWindow.repaint = paint;
  graphWindow.showModal();
  watch?.observe(canvas);
  requestAnimationFrame(paint);
}
// What the side of the window says about the chosen thing, only what the contracts and the lobby say.
function paintSide(side, picked, toList) {
  side.replaceChildren();
  const enlaces = mapDrawn?.enlaces ?? [];
  const reads = enlaces.reduce((sum, enlace) => sum + (enlace.traffic?.reads24h ?? 0), 0);
  const listKey = button('sm-btn ghost small', t('See the connections'), toList);
  if (!picked) {
    side.append(el('b', 'sm-graph-big', String(enlaces.length)), el('span', 'sm-graph-sub', enlaces.length === 1 ? t('connection in force') : t('connections in force')));
    side.append(el('b', 'sm-graph-big', String(reads)), el('span', 'sm-graph-sub', t('reads in the last 24 h')));
    side.append(el('p', 'sm-hint', t('Each line goes from the project whose notes are read to the one that reads them, in the colour of where they come from.')));
    const quiet = (() => { try { return JSON.parse(side.previousElementSibling?.dataset.quiet ?? '[]'); } catch { return []; } })();
    if (quiet.length) {
      const box = el('div', 'sm-graph-list');
      box.append(el('span', 'sm-graph-label', t('Not connected')));
      box.append(el('span', 'sm-graph-quiet', quiet.map((id) => roomName(id)).join(' · ')));
      side.append(box);
    }
    side.append(listKey);
    return;
  }
  if (picked.room) {
    const id = picked.room;
    const room = data.rooms.find((one) => one.id === id);
    const name = el('b', `sm-tinted sm-graph-name${id === data.salas ? ' hub' : ''}`, roomName(id));
    if (id !== data.salas) name.style.setProperty('--pc', toneOf(id));
    side.append(name);
    if (room && id !== data.salas) side.append(el('span', 'sm-graph-sub', stateOf(room).words));
    const readsFrom = enlaces.filter((enlace) => endsOf(enlace).reader === id || (enlace.direction === 'both' && (enlace.rooms.a === id || enlace.rooms.b === id))).map((enlace) => { const { source, reader } = endsOf(enlace); return source === id ? reader : source; });
    const readBy = enlaces.filter((enlace) => endsOf(enlace).source === id || (enlace.direction === 'both' && (enlace.rooms.a === id || enlace.rooms.b === id))).map((enlace) => { const { source, reader } = endsOf(enlace); return reader === id ? source : reader; });
    const list = (title, ids) => {
      const box = el('div', 'sm-graph-list');
      box.append(el('span', 'sm-graph-label', title));
      if (!ids.length) box.append(el('span', 'sm-graph-sub', t('nobody')));
      for (const one of [...new Set(ids)]) { const who = el('b', `sm-tinted${one === data.salas ? ' hub' : ''}`, roomName(one)); if (one !== data.salas) who.style.setProperty('--pc', toneOf(one)); box.append(who); }
      side.append(box);
    };
    list(t('Looks up'), readsFrom);
    list(t('Looked up by'), readBy);
    if (room?.open && id !== data.salas) side.append(button('sm-btn primary small', t('Open the project'), () => leaveTo(addressOf(room))));
    side.append(listKey);
    return;
  }
  const enlace = enlaces.find((one) => one.id === picked.link);
  if (!enlace) { side.append(el('p', 'sm-hint', t('That connection is no longer in force.')), listKey); return; }
  const { source, reader } = endsOf(enlace);
  const who = el('p', 'sm-graph-who');
  who.append(enlace.direction === 'both' ? sayTinted('{a} and {b} read each other', { a: enlace.rooms.a, b: enlace.rooms.b }) : sayTinted('{reader} reads from {source}', { reader, source }));
  side.append(who);
  const fact = (label, value) => { const row = el('div', 'sm-graph-fact'); row.append(el('span', 'sm-graph-label', label), el('span', null, value)); side.append(row); };
  fact(t('What crosses'), kindsWords(enlace.kinds) || '—');
  fact(t('Until'), enlace.expires ? new Date(enlace.expires).toLocaleDateString(language, { day: 'numeric', month: 'long' }) : t('no expiry'));
  fact(t('Reads in 24 h'), String(enlace.traffic?.reads24h ?? 0));
  if (enlace.orders?.allowed) fact(t('Orders'), t('up to #{n}', { n: enlace.orders.maxMode }));
  if (enlace.signed?.by === 'bishop') fact(t('Signed by'), t('Coordinator'));
  side.append(listKey);
}

let mapDrawn = null;
function drawMap(projects, enlaces) {
  mapDrawn = { projects, enlaces };
  paintMap(ui.map, projects, enlaces, { wide: false });
  graphWindow?.repaint?.();
}
function paintMap(host, projects, enlaces, { wide, pick = null, picked = null }) {
  host.replaceChildren();
  if (!projects.length) { host.append(el('p', 'sm-hint', t('Your projects show here, round the Coordinator, with the connections between them.'))); return; }
  const box = host.getBoundingClientRect();
  const W = Math.max(240, Math.round(box.width || 320)), H = Math.max(170, Math.round(box.height || 220));
  const cx = W / 2, cy = H / 2;
  const linked = new Set(enlaces.flatMap((enlace) => [enlace.rooms.a, enlace.rooms.b]));
  const connected = projects.filter((room) => linked.has(room.id));
  // Only who is connected goes round the Coordinator, evenly; the rest are named apart (the tile's
  // last line, the window's side), so the drawing is never weighed down on one side.
  const ring = (connected.length ? connected : projects).slice(0, wide ? 18 : 10);
  const quiet = projects.length - ring.length;
  const name = (room) => (room.name.length > 16 ? `${room.name.slice(0, 15)}…` : room.name);
  // The ring leaves room for the longest name on either side, so nothing is cut at the edge.
  const longest = Math.max(40, ...ring.map((room) => name(room).length * (wide ? 7.4 : 7)));
  let rx = Math.max(60, W / 2 - longest - 18), ry = Math.max(44, H / 2 - (wide ? 34 : 26));
  // Wide, the ring is a circle: an abstract map, not a shape stretched to its frame.
  if (wide) rx = ry = Math.max(60, Math.min(rx, ry));
  const hubR = wide ? 21 : 17;
  const at = new Map([[data.salas, { x: cx, y: cy, r: hubR, pad: linked.has(data.salas) ? 6 : 0 }]]);
  ring.forEach((room, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / ring.length + (ring.length === 2 ? Math.PI / 2 : 0);
    const memories = room.glance?.census?.memories ?? 0;
    const r = linked.has(room.id) ? (wide ? 8 : 7) + Math.min(3, Math.sqrt(memories) / 4) : 4.5;
    at.set(room.id, { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, r, cos: Math.cos(angle), sin: Math.sin(angle) });
  });
  const svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  svg.setAttribute('aria-label', ui.linksSum.textContent);
  const defs = svgNode('defs');
  svg.append(defs);
  // STARS (2026-10-13): each project is a point of light in its tone, its glow a radial gradient
  // that fades to nothing; the notes on their way are sparks. The theme decides how bright
  // (salas-mac.css): a lit sky in the dark, a quieter one in the light, where the text must read.
  const glowId = `sm-glow-${wide ? 'w' : 't'}`;
  const glow = svgNode('filter', { id: glowId, x: '-200%', y: '-200%', width: '500%', height: '500%' });
  glow.append(svgNode('feGaussianBlur', { stdDeviation: wide ? 2.2 : 1.8, result: 'soft' }));
  const merge = svgNode('feMerge');
  merge.append(svgNode('feMergeNode', { in: 'soft' }), svgNode('feMergeNode', { in: 'SourceGraphic' }));
  glow.append(merge);
  defs.append(glow);
  const halos = new Map();
  const haloFor = (id, colour) => {
    if (halos.has(id)) return halos.get(id);
    const ref = `sm-halo-${wide ? 'w' : 't'}-${halos.size}`;
    const gradient = svgNode('radialGradient', { id: ref });
    for (const [offset, opacity] of [['0%', 0.95], ['38%', 0.42], ['100%', 0]]) {
      const stop = svgNode('stop', { offset, 'stop-opacity': opacity });
      stop.style.stopColor = colour;
      gradient.append(stop);
    }
    defs.append(gradient);
    halos.set(id, `url(#${ref})`);
    return halos.get(id);
  };
  const edges = (from, to, gapFrom = 4, gapTo = 5) => {
    const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
    const ux = dx / length, uy = dy / length;
    const reach = (spot, gap) => spot.r + (spot.pad ?? 0) + gap;
    return { start: { x: from.x + ux * reach(from, gapFrom), y: from.y + uy * reach(from, gapFrom) }, end: { x: to.x - ux * reach(to, gapTo), y: to.y - uy * reach(to, gapTo) } };
  };
  // A hairline from the middle to each project on the ring that no contract touches: it is there,
  // and nothing crosses.
  const centre = at.get(data.salas);
  for (const room of ring) {
    if (linked.has(room.id)) continue;
    const { start, end } = edges(centre, at.get(room.id), 3, 3);
    svg.append(svgNode('line', { class: 'spoke', x1: start.x.toFixed(1), y1: start.y.toFixed(1), x2: end.x.toFixed(1), y2: end.y.toFixed(1) }));
  }
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  enlaces.forEach((enlace, index) => {
    const { source, reader } = endsOf(enlace);
    const from = at.get(source), to = at.get(reader);
    if (!from || !to) return;
    const { start, end } = edges(from, to);
    // To or from the Coordinator the wire is straight; between two projects it bows away from the
    // middle, so it never runs through the Coordinator.
    let d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} L${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    if (source !== data.salas && reader !== data.salas) {
      const mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2;
      const ox = mx - cx, oy = my - cy, out = Math.hypot(ox, oy) || 1;
      const bow = Math.min(46, Math.hypot(end.x - start.x, end.y - start.y) * 0.28);
      d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${(mx + (ox / out) * bow).toFixed(1)} ${(my + (oy / out) * bow).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }
    // The wire wears the tone of the project the notes come from.
    const tone = source === data.salas ? 'var(--text-3)' : toneOf(source);
    const id = `sm-wire-${wide ? 'w' : 't'}-${index}`;
    const wire = svgNode('path', { id, class: 'wire', d });
    wire.style.stroke = tone;
    wire.dataset.a = source;
    wire.dataset.b = reader;
    wire.dataset.link = enlace.id;
    const title = svgNode('title');
    title.textContent = enlace.direction === 'both' ? t('{a} and {b} look each other up', { a: roomName(enlace.rooms.a), b: roomName(enlace.rooms.b) }) : reader === data.salas ? t('The Coordinator looks up {source}', { source: roomName(source) }) : t('{reader} looks up {source}', { reader: roomName(reader), source: roomName(source) });
    wire.append(title);
    svg.append(wire);
    // ELECTRIC FLOW (2026-10-13): no arrowheads; the current runs along the line the way the notes
    // travel, from the project read to the one reading, and both ways when they read each other.
    // A still line under it says the connection is there even when nothing moves.
    const ways = enlace.direction === 'both' ? [['out', tone], ['back', reader === data.salas ? 'var(--text-3)' : toneOf(reader)]] : [['out', tone]];
    for (const [way, colour] of ways) {
      const flow = svgNode('path', { class: `flow ${way}`, d, filter: `url(#${glowId})` });
      flow.style.stroke = colour;
      flow.style.setProperty('--flow-delay', `${(index * 0.37) % 1.4}s`);
      flow.dataset.a = source;
      flow.dataset.b = reader;
      if (still) flow.classList.add('still');
      svg.append(flow);
    }
  });
  for (const room of ring) {
    const spot = at.get(room.id);
    const on = linked.has(room.id);
    const group = svgNode('g', { class: `node${on ? ' linked' : ''}${room.open ? '' : ' asleep'}${room.glance?.waitingCount ? ' waiting' : ''}` });
    group.style.setProperty('--pc', toneOf(room.id));
    group.dataset.id = room.id;
    if (on && room.glance?.waitingCount) group.append(svgNode('circle', { class: 'wait', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r + 5).toFixed(1) }));
    // The star: a halo that breathes, a core of its tone and a white heart. Each one twinkles at its
    // own pace, so the sky never pulses as one.
    const star = svgNode('g', { class: 'star' });
    star.style.setProperty('--tw', `${(2.6 + ((room.id.length * 37) % 19) / 10).toFixed(1)}s`);
    star.style.setProperty('--tw-delay', `${(((room.id.charCodeAt(0) ?? 0) * 13) % 23) / 10}s`);
    star.append(
      svgNode('circle', { class: 'halo', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r * (on ? 2.9 : 2.2)).toFixed(1), fill: haloFor(room.id, toneOf(room.id)) }),
      svgNode('circle', { class: 'body', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r * (on ? 0.82 : 0.9)).toFixed(1) }),
      svgNode('circle', { class: 'heart', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: Math.max(0.9, spot.r * 0.22).toFixed(1) }),
    );
    group.append(star);
    const title = svgNode('title');
    title.textContent = `${room.name} · ${stateOf(room).words}`;
    group.append(title);
    // The name sits outside the ring, on the side its project is on: to the right on the right,
    // to the left on the left, above or below at the top and the bottom.
    const side = Math.abs(spot.cos) < 0.32 ? 'middle' : spot.cos > 0 ? 'start' : 'end';
    const gap = spot.r + 7;
    const x = side === 'middle' ? spot.x : spot.x + Math.sign(spot.cos) * gap;
    const y = side === 'middle' ? (spot.sin < 0 ? spot.y - gap - 2 : spot.y + gap + 10) : spot.y + 4;
    const label = svgNode('text', { class: 'label', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': side });
    label.textContent = name(room);
    group.append(label);
    svg.append(group);
  }
  // The Coordinator, in its own colours and mark (brands.js).
  const brand = brandOf('bishop');
  const hub = svgNode('g', { class: `bishop${linked.has(data.salas) ? ' linked' : ''}` });
  hub.dataset.id = data.salas;
  // The Coordinator is the brightest star, in its own colour, its mark at the heart.
  hub.append(svgNode('circle', { class: 'corona', cx, cy, r: hubR * 2.4, fill: haloFor(data.salas, brand.solid ?? brand.color) }));
  if (linked.has(data.salas)) hub.append(svgNode('circle', { class: 'halo', cx, cy, r: hubR + 6 }));
  hub.append(svgNode('circle', { class: 'core', cx, cy, r: hubR, fill: brand.solid ?? brand.color }));
  const size = Math.round(hubR * 1.24);
  const face = svgNode('g', { transform: `translate(${cx - size / 2} ${cy - size / 2})`, color: brand.ink });
  face.innerHTML = brand.mark(); // trusted: our own SVG string from brands.js
  face.firstElementChild?.setAttribute('width', String(size));
  face.firstElementChild?.setAttribute('height', String(size));
  hub.append(face);
  const hubTitle = svgNode('title');
  hubTitle.textContent = t('Coordinator');
  hub.append(hubTitle);
  svg.append(hub);
  host.append(svg);
  focusable(svg, { pick, picked });
  host.dataset.quiet = JSON.stringify(projects.filter((room) => !ring.includes(room)).map((room) => room.id));
  if (!wide && quiet > 0 && connected.length) host.append(el('span', 'sm-map-quiet', quiet === 1 ? t('1 more project, not connected') : t('{n} more projects, not connected', { n: quiet })));
}
// The tile and the sheet change size with the window: the map is drawn again at the new size.
if (typeof ResizeObserver === 'function') {
  for (const [host, wide] of [[ui.map, false]]) {
    let drawnAt = '';
    new ResizeObserver(() => {
      const box = host.getBoundingClientRect();
      const size = `${Math.round(box.width)}x${Math.round(box.height)}`;
      if (!box.width || size === drawnAt || !mapDrawn) return;
      drawnAt = size;
      paintMap(host, mapDrawn.projects, mapDrawn.enlaces, { wide });
    }).observe(host);
  }
}

// HOME, ARRANGED BY ITS PERSON (2026-10-13). Every tile of Home — the Coordinator, who waits,
// the connections, the decisions, what needs you, the memory, and the widgets added to it — sits
// where the person put it, at the size they chose. Right-click a tile: move it, resize it, take it
// off Home, or add another. What is kept is this browser's (Home's own layout, like its cards).
// A widget exists only where something real feeds it (src/server.mjs, homeWidget): the machine,
// the projects' servers sentinels and datasets, the Coordinator's own dataset, and Ollama.
const LAYOUT_KEY = 'pulse.home.layout';
// One board (2026-10-13): every tile of Home in one order, the projects' drawer among them.
const BOARD = 'sm-top';
const SIZES = [[4, () => t('Small')], [6, () => t('Medium')], [8, () => t('Large')], [12, () => t('Full width')]];
// THE GRID (2026-10-13): 12 columns across and rows of 96 px down, 16 px between them. Every tile
// takes whole columns and whole rows, so every edge falls on the same lines and tiles fit side by
// side exactly: a 5-row tile beside a 2-row and a 3-row one ends where they end. A tile's height is
// its default, «Automatic» (the rows its content needs), or the rows the person chose; what does
// not fit in a chosen height scrolls inside the tile.
const HEIGHTS = [[0, () => t('Automatic')], [2, () => t('2 rows')], [3, () => t('3 rows')], [4, () => t('4 rows')], [5, () => t('5 rows')]];
const HOME_TILES = {
  bishop: { id: 'sm-bishop', name: () => t('Coordinator'), about: () => t('Your Coordinator, its state and its recent summary.'), size: 8, rows: 5 },
  waiting: { id: 'sm-waiting', name: () => t('Waiting for you'), about: () => t('The questions and permissions an agent is waiting on.'), size: 4, rows: 2 },
  links: { id: 'sm-links-tile', name: () => t('Connections'), about: () => t('The map of who looks up whom.'), size: 4, rows: 3 },
  projects: { id: 'sm-drawer', name: () => t('Projects'), about: () => t('Every project, open or asleep, three rows at a time.'), size: 12, sizes: [12], kept: true },
  decisions: { id: 'sm-decisions', name: () => t('Recent decisions'), about: () => t('What your projects decided lately.'), size: 4, rows: 3 },
  attention: { id: 'sm-attention', name: () => t('Needs you'), about: () => t('What Home noticed that needs a hand.'), size: 4, rows: 3 },
  memory: { id: 'sm-memory', name: () => t('Memory'), about: () => t('What your projects remember, by kind.'), size: 4, rows: 3 },
};
const WIDGETS = {
  'w-system': { kind: 'system', name: () => t('System resources'), about: () => t('How busy this Mac\'s processor is, and how much memory is free.'), size: 4, rows: 3 },
  'w-servers': { kind: 'servers', name: () => t('Servers'), about: () => t('The servers running in your open projects, and whether they answer.'), size: 4, rows: 3, needs: () => t('Turn on Preview in a project\'s Modules to see its servers.') },
  'w-memory': { kind: 'memory', name: () => t('Memory quality'), about: () => t('How grown each open project\'s memory is, and its weakest side.'), size: 4, rows: 3, needs: () => t('Open a project to read its memory.') },
  'w-coordinator': { kind: 'coordinator', name: () => t('Coordinator training'), about: () => t('How far the Coordinator\'s own record is from training a model of its own.'), size: 4, rows: 3 },
  // Only for MADRE's author, in a copy run from source with the author's token (src/server.mjs, homeWidget):
  // anywhere else the server has no such widget and Home never offers it.
  'w-usage': { kind: 'usage', owner: true, name: () => t('MADRE usage'), about: () => t('How many copies of MADRE are on, which versions and whether people come back. Only you see this.'), size: 8, rows: 3 },
  'w-models': { kind: 'models', name: () => t('Local models'), about: () => t('Ollama, its models, and how close each project is to its own.'), size: 4, rows: 3 },
};
const DEFAULT_LAYOUT = { order: ['bishop', 'waiting', 'links', 'projects', 'decisions', 'attention', 'memory'], size: {}, rows: {} };
// What each tile is, drawn in the accent the person chose (the same line as the room's AJUSTES icons).
const TILE_ICONS = {
  'bishop': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.6"/><circle cx="10" cy="3.6" r="1.4"/><circle cx="4.4" cy="14" r="1.4"/><circle cx="15.6" cy="14" r="1.4"/><path d="M10 5v2.4M8 11.6 5.6 13.2M12 11.6l2.4 1.6"/></svg>',
  'waiting': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8M6 16.5h8M6.8 3.5c0 3.2 3.2 4 3.2 6.5S6.8 13.3 6.8 16.5M13.2 3.5c0 3.2-3.2 4-3.2 6.5s3.2 3.3 3.2 6.5"/></svg>',
  'projects': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12.5" rx="2.4"/><path d="M3 9.2h14M8 6.6h4"/></svg>',
  'links': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="13.5" r="2.2"/><circle cx="15" cy="6.5" r="2.2"/><path d="M7 12.2 13 7.8"/></svg>',
  'decisions': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="13" height="13" rx="3"/><path d="m7 10.2 2.1 2.1L13.2 8"/></svg>',
  'attention': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.6v4.2"/><path d="M10 13.4h.01" stroke-width="2.2"/></svg>',
  'memory': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="10" cy="5.6" rx="5.5" ry="2.1"/><path d="M4.5 5.6v4.4c0 1.2 2.5 2.1 5.5 2.1s5.5-.9 5.5-2.1V5.6M4.5 10v4.4c0 1.2 2.5 2.1 5.5 2.1s5.5-.9 5.5-2.1V10"/></svg>',
  'w-system': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="9" height="9" rx="1.8"/><path d="M8 3v2.5M12 3v2.5M8 14.5V17M12 14.5V17M3 8h2.5M3 12h2.5M14.5 8H17M14.5 12H17"/></svg>',
  'w-servers': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.8" width="13" height="5" rx="1.6"/><rect x="3.5" y="11.2" width="13" height="5" rx="1.6"/><path d="M6.4 6.3h.01M6.4 13.7h.01" stroke-width="2.2"/><path d="M10 6.3h3.4M10 13.7h3.4"/></svg>',
  'w-memory': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.8 13.5a6.2 6.2 0 1 1 12.4 0"/><path d="m10 13.5 3-4"/><path d="M10 13.5h.01" stroke-width="2.4"/></svg>',
  'w-coordinator': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 16.5h13"/><path d="M5 13.5l3.2-3.2 2.6 2.4 4.2-5.2"/><path d="M12.4 7.5H15v2.6"/></svg>',
  'w-models': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.2 16 6.6v6.8L10 16.8 4 13.4V6.6z"/><path d="M4 6.6 10 10l6-3.4M10 10v6.8"/></svg>',
  'w-usage': '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 16.5h13"/><path d="M5.5 13.5v-3M9 13.5V7M12.5 13.5v-4.5M16 13.5V4.5"/></svg>',
};
const tileIcon = (id) => { const box = el('span', 'sm-tile-icon'); box.innerHTML = TILE_ICONS[id] ?? ''; return box; }; // trusted: our own SVG strings
const known = (id) => Object.hasOwn(HOME_TILES, id) || Object.hasOwn(WIDGETS, id);
function readLayout() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null'); } catch { raw = null; }
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_LAYOUT);
  const seen = new Set();
  const clean = (list) => (Array.isArray(list) ? list : []).filter((id) => typeof id === 'string' && known(id) && !seen.has(id) && seen.add(id));
  // An arrangement kept before the board was one (top · projects · low) reads as one order.
  const order = clean(Array.isArray(raw.order) ? raw.order : [...(raw.top ?? []), 'projects', ...(raw.low ?? [])]);
  // The drawer is never taken off: a list that lost it gets it back where the projects were.
  if (!order.includes('projects')) order.splice(Math.min(order.length, 3), 0, 'projects');
  const size = Object.fromEntries(Object.entries(raw.size ?? {}).filter(([id, span]) => known(id) && SIZES.some(([one]) => one === span)));
  const rows = Object.fromEntries(Object.entries(raw.rows ?? {}).filter(([id, count]) => known(id) && HEIGHTS.some(([one]) => one === count)));
  return { order, size, rows };
}
let layout = readLayout();
function saveLayout() {
  try {
    if (JSON.stringify(layout) === JSON.stringify(DEFAULT_LAYOUT)) localStorage.removeItem(LAYOUT_KEY);
    else localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch { /* the arrangement lasts as long as the page */ }
  pushHomeLayout();
  applyLayout();
}
const placed = (id) => layout.order.includes(id);
const spanOf = (id) => layout.size[id] ?? (HOME_TILES[id] ?? WIDGETS[id]).size;
const widgetNodes = new Map();
function tileNode(id) {
  if (HOME_TILES[id]) return $(HOME_TILES[id].id);
  if (!widgetNodes.has(id)) widgetNodes.set(id, makeWidget(id));
  return widgetNodes.get(id);
}
function applyLayout() {
  const board = $(BOARD);
  for (const id of layout.order) {
    const node = tileNode(id);
    if (!node) continue;
    node.classList.remove('sm-off', 'c-3', 'c-4', 'c-5', 'c-6', 'c-8', 'c-12', 'r-1', 'r-2', 'r-3');
    node.classList.add(`c-${spanOf(id)}`);
    node.dataset.tile = id;
    board.append(node);
    tileFits.observe(node);
  }
  for (const id of Object.keys(HOME_TILES)) if (!placed(id)) $(HOME_TILES[id].id)?.classList.add('sm-off');
  for (const [id, node] of widgetNodes) if (!placed(id)) { tileFits.unobserve(node); node.remove(); node.stop?.(); widgetNodes.delete(id); }
  for (const [id, node] of widgetNodes) if (placed(id)) node.start?.();
  fitTiles();
}
// Each tile is as tall as what it holds (2026-10-13): the board's rows are 4 px and a tile spans as
// many as its content needs, plus the gap under it. A tile made wider or narrower grows or shrinks
// with its content instead of stretching to a height chosen for another size.
const ROW_UNIT = 96;
const ROW_GAP = 16;
const rowsOf = (id) => layout.rows?.[id] ?? (HOME_TILES[id] ?? WIDGETS[id])?.rows ?? 0;
// On a middle-width screen the tiles go in pairs, half and half: a pair ends level only if both
// are as tall, so there a short tile takes at least the three rows the others take.
const PAIRED = window.matchMedia?.('(max-width: 1180px) and (min-width: 761px)');
PAIRED?.addEventListener?.('change', () => fitTiles());
function fitTile(node) {
  const own = rowsOf(node.dataset.tile);
  const chosen = own && PAIRED?.matches && spanOf(node.dataset.tile) < 12 ? Math.max(3, own) : own;
  node.classList.toggle('sm-fixed', chosen > 0);
  // How many rows it has, for the tile's own CSS: a short tile shows what matters and leaves the rest.
  node.dataset.rows = chosen ? String(chosen) : 'auto';
  if (chosen) { node.style.gridRow = `auto / span ${chosen}`; return; }
  // Automatic: the rows its content needs, read at its natural height and rounded up to a whole row.
  node.style.alignSelf = 'start';
  const height = node.getBoundingClientRect().height;
  node.style.alignSelf = '';
  if (height) node.style.gridRow = `auto / span ${Math.max(1, Math.ceil((height + ROW_GAP) / (ROW_UNIT + ROW_GAP)))}`;
}
function fitTiles() { for (const node of $(BOARD)?.querySelectorAll(':scope > [data-tile]') ?? []) fitTile(node); }
const tileFits = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => { for (const entry of entries) fitTile(entry.target); }) : { observe() {}, unobserve() {} };
function moveTile(id, where) {
  const list = layout.order;
  const at = list.indexOf(id);
  if (at < 0) return;
  list.splice(at, 1);
  const to = where === 'first' ? 0 : where === 'last' ? list.length : Math.max(0, Math.min(list.length, at + where));
  list.splice(to, 0, id);
  saveLayout();
}
function removeTile(id) {
  if ((HOME_TILES[id] ?? WIDGETS[id])?.kept) return;
  layout.order = layout.order.filter((one) => one !== id);
  delete layout.size[id];
  saveLayout();
}
function addTile(id) {
  if (placed(id)) return;
  layout.order.push(id);
  saveLayout();
  requestAnimationFrame(() => tileNode(id)?.scrollIntoView({ block: 'center', behavior: motionStill() ? 'auto' : 'smooth' }));
}

// The menu a right-click opens, shared by the tiles and the space between them: the same card and
// keys as a project's menu (pinsMenu), closed the same way.
const MOVE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v13M5.5 8 10 3.5 14.5 8M5.5 12 10 16.5 14.5 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BEFORE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const AFTER_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// A height is drawn as the rows it takes, out of five; «Automatic» as rows that follow the content.
const heightIcon = (count) => `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5.2" y="2.8" width="9.6" height="14.4" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".45"/>${count ? `<rect x="7" y="${(15.4 - 10.8 * count / 5).toFixed(2)}" width="6" height="${(10.8 * count / 5).toFixed(2)}" rx="1.2" fill="currentColor"/>` : '<path d="M7.2 8.6 10 6l2.8 2.6M7.2 11.4 10 14l2.8-2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'}</svg>`;
// A size is drawn as the share of the row it takes: a third, a half, two thirds, all of it.
const sizeIcon = (span) => `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.8" y="5.2" width="14.4" height="9.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".45"/><rect x="4.6" y="7" width="${(10.8 * span / 12).toFixed(2)}" height="6" rx="1.2" fill="currentColor"/></svg>`;
const ADD_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
const RESET_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 8.6A6 6 0 1 1 4.8 13"/><path d="M3.8 4.6v4.2H8"/></svg>';
const HIDE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 10h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function homeMenu(point, entries, label) {
  pinsCloseMenu();
  const menu = el('div', 'bar-card sm-menu');
  menu.setAttribute('role', 'menu');
  if (label) menu.setAttribute('aria-label', label);
  for (const entry of entries) {
    if (entry === 'sep') { menu.append(el('i', 'sm-menu-sep')); continue; }
    if (entry.heading) { const head = el('span', 'sm-menu-head'); if (entry.tile) head.append(tileIcon(entry.tile)); head.append(el('span', null, entry.heading)); menu.append(head); continue; }
    const one = button(`sm-menu-item${entry.danger ? ' danger' : ''}${entry.checked ? ' checked' : ''}`, null, () => { pinsCloseMenu(); entry.act(); });
    one.setAttribute('role', entry.checked !== undefined ? 'menuitemradio' : 'menuitem');
    if (entry.checked !== undefined) one.setAttribute('aria-checked', String(Boolean(entry.checked)));
    if (entry.disabled) one.disabled = true;
    one.innerHTML = entry.icon ?? ''; // trusted: our own SVG strings
    one.append(el('span', null, entry.words));
    menu.append(one);
  }
  menu.addEventListener('keydown', (key) => {
    const items = [...menu.querySelectorAll('.sm-menu-item:not(:disabled)')];
    const at = items.indexOf(document.activeElement);
    if (key.key === 'ArrowDown') { key.preventDefault(); items[(at + 1) % items.length].focus(); }
    if (key.key === 'ArrowUp') { key.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
  });
  document.body.append(menu);
  pins.menu = menu;
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  menu.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - width - 8, point.x)))}px`;
  menu.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - height - 8, point.y)))}px`;
  menu.style.right = 'auto';
  menu.querySelector('.sm-menu-item:not(:disabled)')?.focus({ preventScroll: true });
}
const customized = () => JSON.stringify(layout) !== JSON.stringify(DEFAULT_LAYOUT);
const addEntries = () => [{ words: t('Add to Home…'), icon: ADD_ICON, act: () => openHomeAdd() }, ...(customized() ? [{ words: t('Back to the default layout'), icon: RESET_ICON, act: () => { layout = structuredClone(DEFAULT_LAYOUT); saveLayout(); } }] : [])];
function tileMenu(event, id) {
  event.preventDefault();
  const list = layout.order;
  const at = list.indexOf(id);
  const spec = HOME_TILES[id] ?? WIDGETS[id];
  const sizes = SIZES.filter(([span]) => !spec.sizes || spec.sizes.includes(span));
  homeMenu({ x: event.clientX, y: event.clientY }, [
    { heading: spec.name(), tile: id },
    { words: t('Move before'), icon: BEFORE_ICON, disabled: at <= 0, act: () => moveTile(id, -1) },
    { words: t('Move after'), icon: AFTER_ICON, disabled: at >= list.length - 1, act: () => moveTile(id, 1) },
    { words: t('Move to the start'), icon: MOVE_ICON, disabled: at <= 0, act: () => moveTile(id, 'first') },
    { words: t('Move to the end'), icon: MOVE_ICON, disabled: at >= list.length - 1, act: () => moveTile(id, 'last') },
    ...(sizes.length > 1 ? ['sep', { heading: t('Width') }, ...sizes.map(([span, words]) => ({ words: words(), icon: sizeIcon(span), checked: spanOf(id) === span, act: () => { if (span === spec.size) delete layout.size[id]; else layout.size[id] = span; saveLayout(); } }))] : []),
    ...(spec.kept ? [] : ['sep', { heading: t('Height') }, ...HEIGHTS.map(([count, words]) => ({ words: words(), icon: heightIcon(count), checked: rowsOf(id) === count, act: () => { layout.rows ??= {}; if (count === (spec.rows ?? 0)) delete layout.rows[id]; else layout.rows[id] = count; saveLayout(); } }))]),
    'sep',
    ...(spec.kept ? [] : [{ words: t('Take off Home'), icon: HIDE_ICON, act: () => removeTile(id) }]),
    ...addEntries(),
  ], spec.name());
}
$(BOARD)?.addEventListener('contextmenu', (event) => {
  // A project's card keeps its own menu (pinsMenu); the drawer around it has the tile's.
  if (event.target.closest('input, textarea, select, [contenteditable="true"], .sm-card')) return;
  const tile = event.target.closest('[data-tile]');
  if (tile) { tileMenu(event, tile.dataset.tile); return; }
  event.preventDefault();
  homeMenu({ x: event.clientX, y: event.clientY }, addEntries(), t('Home'));
});
// DRAG AND DROP (2026-10-13): a tile is taken by its head and set down where it should go — in the
// same row of tiles or the other one, above or below the projects. While it is carried the tiles
// make room for it; let go, that order is kept. Escape, or a drop outside, puts everything back.
const TILE_TYPE = 'application/x-madre-tile';
let carried = null;
const grabbable = (event) => !event.target.closest('a, button, input, select, textarea, label, svg, .sm-map, .sm-card, .sm-tools, [contenteditable="true"]') && event.target.closest('.sm-tile-head, .sm-bishop-head, .sm-bishop-words');
{
  const host = $(BOARD);
  host?.addEventListener('pointerdown', (event) => {
    const tile = event.target.closest('[data-tile]');
    if (tile && event.button === 0 && grabbable(event)) tile.draggable = true;
  });
  host?.addEventListener('dragstart', (event) => {
    const tile = event.target.closest?.('[data-tile]');
    if (!tile || !tile.draggable) return;
    carried = tile;
    event.dataTransfer.setData(TILE_TYPE, tile.dataset.tile);
    event.dataTransfer.effectAllowed = 'move';
    pinsCloseMenu();
    requestAnimationFrame(() => tile.classList.add('sm-carried'));
  });
  host?.addEventListener('dragover', (event) => {
    if (!carried || !event.dataTransfer.types.includes(TILE_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const over = event.target.closest('[data-tile]');
    if (over && !host.contains(over)) return;
    if (!over) { if (!host.contains(carried)) host.append(carried); return; }
    if (over === carried) return;
    const box = over.getBoundingClientRect();
    const after = event.clientY > box.bottom - box.height / 3 || (event.clientY > box.top + box.height / 3 && event.clientX > box.left + box.width / 2);
    const target = after ? over.nextSibling : over;
    if (target !== carried && carried.nextSibling !== target) host.insertBefore(carried, target);
  });
  host?.addEventListener('drop', (event) => {
    if (!carried || !event.dataTransfer.types.includes(TILE_TYPE)) return;
    event.preventDefault();
    layout.order = [...host.children].filter((node) => node.dataset.tile && known(node.dataset.tile) && !node.classList.contains('sm-off')).map((node) => node.dataset.tile);
    carried.classList.remove('sm-carried');
    carried.draggable = false;
    carried = null;
    saveLayout();
  });
}
document.addEventListener('dragend', (event) => {
  if (!carried || event.target !== carried) return;
  carried.classList.remove('sm-carried');
  carried.draggable = false;
  carried = null;
  applyLayout();
});
document.addEventListener('pointerup', () => { for (const tile of document.querySelectorAll('[data-tile][draggable="true"]')) if (tile !== carried) tile.draggable = false; });

// A project's card, dragged among the others (it was already dragged to the bar to pin it): the
// cards make room as it passes, and where it is let go becomes «Yours». A search or a filter shows
// only some of them: the ones out of sight keep their places.
let projectCarried = null;
ui.projects.addEventListener('dragstart', (event) => { projectCarried = event.target.closest?.('.sm-card[data-room]') ?? null; });
ui.projects.addEventListener('dragover', (event) => {
  if (!projectCarried || !event.dataTransfer.types.includes(PIN_TYPE)) return;
  const over = event.target.closest('.sm-card[data-room]');
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  if (!over || over === projectCarried) return;
  projectCarried.classList.add('sm-carried');
  const box = over.getBoundingClientRect();
  const after = event.clientY > box.bottom - box.height / 3 || (event.clientY > box.top + box.height / 3 && event.clientX > box.left + box.width / 2);
  const target = after ? over.nextSibling : over;
  if (target !== projectCarried && projectCarried.nextSibling !== target) ui.projects.insertBefore(projectCarried, target);
});
ui.projects.addEventListener('drop', (event) => {
  if (!projectCarried || !event.dataTransfer.types.includes(PIN_TYPE)) return;
  event.preventDefault();
  const shown = [...ui.projects.querySelectorAll('.sm-card[data-room]')].map((node) => node.dataset.room);
  const all = projectsInOrder().all.map((room) => room.id);
  const slots = all.map((id) => shown.includes(id));
  let next = 0;
  const order = all.map((id, index) => (slots[index] ? shown[next++] : id));
  try { localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(order)); } catch { /* the order lasts as long as the page */ }
  projectCarried.classList.remove('sm-carried');
  projectCarried = null;
  saveHome('order', 'mine');
});
document.addEventListener('dragend', () => {
  if (!projectCarried) return;
  projectCarried.classList.remove('sm-carried');
  projectCarried = null;
  draw();
});

// THE BAR'S KEYS MOVE UNDER THE POINTER (2026-10-13), as the room's do (styles.css, «Each drawing
// moves in its own way»): the two halves of Connections close on each other (CSS), and the planets
// of the Project map go round their orbit while the pointer stays.
{
  const key = $('sm-macro');
  const orbits = [...(key?.querySelectorAll('animateMotion') ?? [])];
  const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  key?.addEventListener('pointerenter', () => { if (!still()) for (const one of orbits) one.beginElement?.(); });
  key?.addEventListener('pointerleave', () => { for (const one of orbits) one.endElement?.(); });
}

// CARRIED TO THE EDGE (2026-10-13): while a tile or a project is carried, the page scrolls when the
// pointer nears its top or its bottom — faster the closer it gets — so a tile goes anywhere on the
// board without being let go. The browser's own scrolling while dragging is too slow to rely on.
{
  const EDGE = 96;
  const FASTEST = 22;
  let pointerY = null;
  let frame = 0;
  const carrying = () => Boolean(carried || projectCarried);
  const step = () => {
    frame = 0;
    if (!carrying() || pointerY === null) return;
    const room = window.innerHeight;
    const near = pointerY < EDGE ? -(EDGE - pointerY) / EDGE : pointerY > room - EDGE ? (pointerY - (room - EDGE)) / EDGE : 0;
    if (near) window.scrollBy(0, Math.round(Math.sign(near) * Math.max(2, Math.abs(near) ** 1.6 * FASTEST)));
    frame = requestAnimationFrame(step);
  };
  document.addEventListener('dragover', (event) => {
    if (!carrying()) return;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(step);
  });
  const stop = () => { pointerY = null; cancelAnimationFrame(frame); frame = 0; };
  document.addEventListener('drop', stop);
  document.addEventListener('dragend', stop);
}

// The space around the projects, right-clicked, offers the same.
document.querySelector('.sm-main')?.addEventListener('contextmenu', (event) => {
  if (event.defaultPrevented || event.target.closest('.sm-tile, .sm-card, input, textarea, select, a, button, dialog')) return;
  event.preventDefault();
  homeMenu({ x: event.clientX, y: event.clientY }, addEntries(), t('Home'));
});

// «Add to Home»: the tiles taken off and the widgets not yet on it, each said in a line, with what
// it would need when nothing feeds it yet.
let homeAddSheet = null;
async function openHomeAdd() {
  homeAddSheet?.remove();
  homeAddSheet = el('dialog', 'sm-sheet sm-add-sheet');
  const body = el('div', 'sm-sheet-body');
  const head = el('header', 'sm-sheet-head');
  head.append(el('h3', null, t('Add to Home')));
  // The same ✕ as every sheet of Home (the connections, the settings).
  const keys = el('span', 'surface-modes');
  const close = button('surface-mode close x-close x-only', null, () => homeAddSheet.close());
  close.setAttribute('aria-label', t('Close'));
  close.innerHTML = '<span class="x-icon"><svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'; // trusted
  keys.append(close);
  head.append(keys);
  body.append(head, el('p', 'hint', t('Tiles you took off and widgets you can put on Home. Right-click any tile to move it, resize it or take it off.')));
  const list = el('div', 'sm-add-list');
  body.append(list);
  homeAddSheet.append(body);
  // The key's squares stay filled while the sheet it opened is there.
  const key = document.getElementById('sm-add-widgets');
  key?.classList.add('filled');
  homeAddSheet.addEventListener('close', () => { homeAddSheet?.remove(); homeAddSheet = null; key?.classList.remove('filled'); });
  document.body.append(homeAddSheet);
  homeAddSheet.showModal();
  void homeTour.hint('home-add', list, { inside: true, title: t('Add to Home'), text: t('The tiles you took off, and the widgets. A widget is offered only when something on this Mac feeds it; right-click any tile to move it, resize it or take it off.') });
  // The author's widget is asked about before the list is drawn: where it cannot be read, it is not listed at all.
  const ownerOk = new Set();
  for (const [id, spec] of Object.entries(WIDGETS).filter(([id, spec]) => spec.owner && !placed(id))) {
    if (await fetch(`/api/salas/widget?kind=${spec.kind}`, { cache: 'no-store' }).then((response) => response.ok).catch(() => false)) ownerOk.add(id);
  }
  if (!homeAddSheet) return;
  const entries = [
    ...Object.entries(HOME_TILES).filter(([id]) => !placed(id)).map(([id, spec]) => ({ id, spec, ready: true })),
    ...Object.entries(WIDGETS).filter(([id, spec]) => !placed(id) && (!spec.owner || ownerOk.has(id))).map(([id, spec]) => ({ id, spec, ready: null })),
  ];
  if (!entries.length) { list.append(el('p', 'sm-hint', t('Everything is already on Home.'))); return; }
  for (const entry of entries) {
    const row = el('div', 'sm-add-row');
    row.append(tileIcon(entry.id));
    const words = el('div', 'sm-add-words');
    words.append(el('b', null, entry.spec.name()), el('small', null, entry.spec.about()));
    const said = el('small', 'sm-add-need');
    words.append(said);
    const add = button('sm-btn primary small', t('Add'), () => { addTile(entry.id); homeAddSheet?.close(); });
    row.append(words, add);
    list.append(row);
    // A widget is offered only when something feeds it: asked of the server, which says so.
    if (entry.ready === null) {
      add.disabled = true;
      said.textContent = t('Checking…');
      const reading = await fetch(`/api/salas/widget?kind=${entry.spec.kind}`, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : { failed: response.status })).catch(() => ({ failed: true }));
      if (!row.isConnected) return;
      const ok = Boolean(reading?.available);
      add.disabled = !ok;
      // A page served by a project started before widgets existed cannot read them: said as that,
      // not as a Mac with nothing to show.
      said.textContent = ok ? '' : reading.failed === 404 ? t('This page is served by a project started before widgets existed: open Home from its own address, or restart that project.') : reading.failed ? t('It could not be read just now.') : (entry.spec.needs?.() ?? t('Nothing feeds it on this Mac yet.'));
    }
  }
}

// ---- The widgets. Each is a tile that reads its own route every 20 s while Home is in view.
const pct = (value) => (value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`);
const gb = (bytes) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;
function meter(value, tone = null) {
  const bar = el('span', `sm-meter${tone ? ` ${tone}` : ''}`);
  const fill = el('i');
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`;
  bar.append(fill);
  return bar;
}
const toneFor = (share) => (share >= 0.85 ? 'hot' : share >= 0.6 ? 'warm' : null);
const OS_WORDS = { darwin: 'macOS', linux: 'Linux', win32: 'Windows', other: () => t('other') };
const WIDGET_PAINT = {
  usage(body, reading) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const grid = el('div', 'sm-w-grid sm-usage-figures');
    for (const [label, n, line] of [[t('Today'), reading.active.day, t('copies on')], [t('7 days'), reading.active.week, t('active copies')], [t('30 days'), reading.active.month, t('active copies')], [t('Ever'), reading.active.ever, t('copies seen')]]) {
      const cell = el('div', 'sm-w-metric');
      cell.append(el('span', 'sm-w-label', label), el('b', 'sm-w-big', Number(n).toLocaleString()), el('small', null, line));
      grid.append(cell);
    }
    body.append(grid);
    // The last 30 days: copies on each day, and the part of them seen for the first time.
    const top = Math.max(1, ...reading.days.map((one) => one.active));
    const days = el('div', 'sm-usage-days');
    days.setAttribute('role', 'img');
    days.setAttribute('aria-label', t('Copies on each day, last 30 days'));
    for (const one of reading.days) {
      const bar = el('i');
      bar.style.setProperty('--h', String(one.active / top));
      bar.style.setProperty('--new', String(one.active ? one.new / one.active : 0));
      bar.title = t('{day}: {n} on · {fresh} new', { day: one.day, n: one.active, fresh: one.new });
      days.append(bar);
    }
    body.append(days);
    const share = (list, word = (name) => name) => list.slice(0, 4).map((one) => `${typeof word(one.name) === 'function' ? word(one.name)() : word(one.name)} ${one.n}`).join(' · ') || '—';
    const back = (part) => (part.cohort ? `${Math.round((part.back / part.cohort) * 100)}%` : '—');
    const lines = el('div', 'sm-usage-lines');
    for (const [label, said] of [
      [t('Versions'), share(reading.versions)],
      [t('Systems'), share(reading.os, (name) => OS_WORDS[name] ?? name)],
      [t('Came back'), t('after 1 day {d1} · 7 days {d7} · 30 days {d30}', { d1: back(reading.retention.d1), d7: back(reading.retention.d7), d30: back(reading.retention.d30) })],
    ]) {
      const row = el('div', 'sm-w-line');
      row.append(el('b', null, label), el('small', null, said));
      lines.append(row);
    }
    body.append(lines);
  },
  system(body, reading) {
    const cpu = el('div', 'sm-w-metric');
    cpu.append(el('span', 'sm-w-label', t('Processor')), el('b', 'sm-w-big', pct(reading.cpu.busy)), meter(reading.cpu.busy, toneFor(reading.cpu.busy ?? 0)), el('small', null, t('{n} cores · load {load}', { n: reading.cpu.cores, load: reading.cpu.load[0] })));
    const used = reading.memory.total ? 1 - reading.memory.free / reading.memory.total : null;
    const mem = el('div', 'sm-w-metric');
    mem.append(el('span', 'sm-w-label', t('Memory')), el('b', 'sm-w-big', t('{free} free', { free: gb(reading.memory.free) })), meter(used, toneFor(used ?? 0)), el('small', null, t('of {total}. The system lends what is free to its cache and takes it back when needed.', { total: gb(reading.memory.total) })));
    const grid = el('div', 'sm-w-grid');
    grid.append(cpu, mem);
    body.append(grid);
  },
  servers(body, reading) {
    const running = reading.projects.flatMap((one) => one.ports.map((port) => ({ ...port, project: one.name })));
    if (!running.length) body.append(el('p', 'sm-hint', reading.projects.some((one) => one.preview) ? t('No server is running in your open projects.') : t('Turn on Preview in a project\'s Modules to see its servers.')));
    const grid = el('div', 'sm-w-grid');
    for (const one of running) {
      const healthy = one.status !== null && one.status < 500;
      const row = el('div', `sm-w-row${healthy ? ' ok' : ' bad'}`);
      row.append(el('i', 'sm-w-dot'), el('b', null, `:${one.port}`), el('span', null, one.project), el('small', null, one.status ? t('answers {status}', { status: one.status }) : t('no answer')));
      grid.append(row);
    }
    if (running.length) body.append(grid);
    const off = reading.projects.filter((one) => !one.preview && !one.unreachable).length;
    if (off && running.length) body.append(el('small', 'sm-w-foot', off === 1 ? t('1 project has Preview off.') : t('{n} projects have Preview off.', { n: off })));
  },
  memory(body, reading) {
    const read = reading.projects.filter((one) => !one.unreachable);
    if (!read.length) { body.append(el('p', 'sm-hint', t('Open a project to read its memory.'))); return; }
    const grid = el('div', 'sm-w-grid');
    body.append(grid);
    for (const one of read) {
      const row = el('div', 'sm-w-project');
      const top = el('div', 'sm-w-line');
      top.append(el('b', null, one.name), el('span', 'sm-w-stage', one.stage ?? '—'), el('small', null, pct(one.score)));
      row.append(top, meter(one.score));
      const notes = [one.weakest?.label ? t('weakest: {what}', { what: one.weakest.label.toLowerCase() }) : null, one.aberrations ? t('{n} doubtful memories', { n: one.aberrations }) : null].filter(Boolean);
      if (notes.length) row.append(el('small', null, notes.join(' · ')));
      grid.append(row);
    }
  },
  coordinator(body, reading) {
    const share = reading.target ? reading.pairs / reading.target : 0;
    const top = el('div', 'sm-w-line');
    top.append(el('b', 'sm-w-big', `${reading.pairs}`), el('span', null, t('of {n} exchanges to train on', { n: reading.target })));
    body.append(top, meter(share));
    body.append(el('p', 'sm-w-says', [reading.stage, reading.says].filter(Boolean).join(' · ')));
    const facts = [t('{n} memories', { n: reading.notes ?? 0 }), reading.trained ? t('model {name}', { name: reading.trained }) : t('no model of its own yet')];
    body.append(el('small', 'sm-w-foot', facts.join(' · ')));
  },
  models(body, reading) {
    const head = el('div', `sm-w-row${reading.ollama.running ? ' ok' : ' bad'}`);
    head.append(el('i', 'sm-w-dot'), el('b', null, 'Ollama'), el('span', null, reading.ollama.running ? t('{n} models on this Mac', { n: reading.ollama.models.length }) : t('not running')));
    // Which projects use it is set in Home's Settings › Local AI.
    const tune = button('sm-w-link', t('Choose projects'), (event) => { event.stopPropagation(); openSettings('local'); });
    head.append(tune);
    body.append(head);
    if (reading.ollama.models.length) body.append(el('small', 'sm-w-foot mono', reading.ollama.models.slice(0, 4).join(' · ') + (reading.ollama.models.length > 4 ? ' …' : '')));
    const grid = el('div', 'sm-w-grid');
    body.append(grid);
    for (const one of reading.projects.filter((project) => !project.unreachable)) {
      const row = el('div', 'sm-w-project');
      const top = el('div', 'sm-w-line');
      const ready = one.pairs >= one.target;
      const count = el('small', null, one.trained ? t('trained · {name}', { name: one.trained }) : ready ? t('ready to train') : `${one.pairs}/${one.target}`);
      count.title = t('{n} of {target} examples this project needs to train a model of its own', { n: one.pairs, target: one.target });
      top.append(el('b', null, one.name));
      if (one.localAi === false) { row.classList.add('sm-w-off'); top.append(el('span', 'sm-w-tag', t('without local AI'))); }
      top.append(count);
      row.append(top, meter(one.trained ? 1 : one.target ? one.pairs / one.target : 0));
      grid.append(row);
    }
  },
};
function makeWidget(id) {
  const spec = WIDGETS[id];
  if (!spec) return null;
  const node = el('section', `sm-tile sm-widget w-${spec.kind}`);
  const head = el('header', 'sm-tile-head');
  head.append(el('h2', null, spec.name()));
  const body = el('div', 'sm-w-body');
  body.append(el('p', 'sm-hint', t('Reading…')));
  node.append(head, body);
  let timer = 0;
  const read = async () => {
    if (document.hidden || !node.isConnected) return;
    const reading = await fetch(`/api/salas/widget?kind=${spec.kind}`, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (!node.isConnected) return;
    body.replaceChildren();
    // The author's widget is not there at all for a copy that cannot read it (no token, not from source).
    if (spec.owner) node.hidden = !reading;
    if (!reading) { body.append(el('p', 'sm-hint', t('It could not be read just now.'))); return; }
    WIDGET_PAINT[spec.kind](body, reading);
    fitTile(node);
    // The first time it shows, what it is (homeTour is set up below this, so it is read late).
    if (!node.dataset.guided) { node.dataset.guided = '1'; setTimeout(() => { try { guideWidget(node, spec.kind); } catch { /* the tour is not up yet */ } }, 1500); }
  };
  node.start = () => { if (timer) return; void read(); timer = setInterval(() => void read(), 20000); };
  node.stop = () => { clearInterval(timer); timer = 0; };
  return node;
}
applyLayout();

// THE WELCOME OF 1.0 (public/tour.js): the bonjour the first time, the chapters after it, the pill
// that waits in the bar, `?` for the gestures, and the hint on Connections. In Home, «Take me
// there» opens what lives here; for what lives inside a project it opens the one open most
// recently, if any is. A new person is handed to the wizard (agents, projects, open) first.
const agentsReady = () => (agentsSeen?.agents ?? []).some((agent) => agent.id !== 'madre' && agentState(agent, agentsSeen).ok);
const intoAProject = () => {
  const room = data ? projectsInOrder().open[0] : null;
  return room ? () => leaveTo(addressOf(room)) : undefined;
};
const homeTour = startTour({
  page: 'home',
  pillSlot: $('sm-tour-pill'),
  hidden: () => (data?.phonePreview ? [] : ['phone']),
  ready: () => Boolean(data) && !wizard && !sheet,
  welcome: { needed: () => !projectsInOrder().all.length || !agentsReady(), open: (then) => { welcomed = true; openWizard({ then }); } },
  onProjects: () => void refresh(),
  go: {
    get project() { return intoAProject(); },
    get talk() { return intoAProject(); },
    get modes() { return intoAProject(); },
    get modules() { return intoAProject(); },
    get phone() { return intoAProject(); },
    coordinator: () => openBishop(),
    links: () => openLinkSheet(),
    get maps() { return ui.macro.hidden ? undefined : () => ui.macro.click(); },
    settings: () => openSettings(),
    local: () => openSettings('local'),
    gestures: () => homeTour.openGestures(),
  },
});
// What each key of Home's bar opens, said the first time it opens (public/tour.js, firstOpen).
const topSheet = () => [...document.querySelectorAll('dialog[open]')].at(-1) ?? null;
homeTour.firstOpen('home-links', ui.bar.links, {
  opened: topSheet,
  inside: (box) => box.querySelector('.sm-link-list, .sm-sheet-body'),
  title: () => t('Connections'),
  text: () => t('Which projects can look up what another learned, and the contract each one signed. Nothing is shared without your signature, and you can cancel any connection here.'),
});
homeTour.firstOpen('home-map', ui.macro, {
  title: () => t('Project map'),
  text: () => t('Your projects as a map. Drag one onto another to connect them, click one to go to it, and press Esc to come back.'),
  after: 900,
});
homeTour.firstOpen('home-settings', ui.gear, {
  opened: () => document.querySelector('dialog.sm-settings[open]'),
  inside: (box) => box.querySelector('.sm-settings-window'),
  title: () => t('Home settings'),
  text: () => t('How Home looks and what its bar holds, your agents, the Coordinator, which projects use the local AI, your projects and the version. ⌘ , opens it from anywhere.'),
});
// What each widget shows, the first time it is on Home: its own line, and how to change it.
const WIDGET_GUIDE = {
  system: () => t('How busy this Mac\'s processor is and how much memory is free. It updates on its own.'),
  servers: () => t('The servers running in your open projects and whether they answer. A project shows here when its Preview is on.'),
  memory: () => t('How grown each open project\'s memory is, and its weakest side: the one thing that would improve it most.'),
  coordinator: () => t('How far the Coordinator\'s own record is from training a model of its own.'),
  models: () => t('Ollama and its models, and how many examples each project has toward a model of its own (8/300 is 8 of 300). «Choose projects» sets which ones use the local AI.'),
  usage: () => t('How many copies of MADRE are on, which versions and whether people come back. Only you see this.'),
};
function guideWidget(node, kind) {
  const said = WIDGET_GUIDE[kind];
  if (!said) return;
  void homeTour.hint(`w-${kind}`, node.querySelector('.sm-tile-head') ?? node, { title: WIDGETS[`w-${kind}`]?.name() ?? '', text: `${said()} ${t('Right-click it to change its size or take it off.')}` });
}
// Once Home has drawn: the bonjour if it is owed; if it was given, the hint on Connections — what
// it is, and, for whoever came from 0.7.2, what the word meant before.
let welcomeAsked = false;
function welcomeHome() {
  if (welcomeAsked) return;
  welcomeAsked = true;
  void homeTour.loaded.then(async (answer) => {
    if (answer?.owed) { await homeTour.maybeBonjour(); return; }
    if (!answer?.state?.bonjourAt) return;
    setTimeout(() => {
      const tile = $('sm-links-tile');
      if (!tile || tile.hidden || document.querySelector('dialog[open]')) return;
      void homeTour.hint('links', tile.querySelector('.sm-tile-head') ?? tile, {
        title: t('Connections'),
        text: homeTour.path() === 'back'
          ? t('A connection lets one project look up what another learned, by a contract you sign. In 0.7.2 «Connections» was signing your agents in: that is now in Settings › Agents.')
          : t('A connection lets one project look up what another learned, by a contract you sign. Nothing is written across.'),
      });
    }, 2200);
    // 1.0.2 brings one key to Home's bar: said once, after any other card, never over a sheet.
    let tries = 0;
    const sayAdd = async () => {
      const key = document.getElementById('sm-add-widgets');
      if (!key || document.querySelector('dialog[open]') || !(await homeTour.hint('new-add-widgets', key, { title: t('New: add widgets'), text: t('This button opens «Add to Home»: choose the widgets you want to see here, or bring back the ones you removed.') }))) {
        if ((tries += 1) < 6) setTimeout(sayAdd, 6000)?.unref?.();
      }
    };
    setTimeout(sayAdd, 5000)?.unref?.();
  });
}

// LINKING TWO ROOMS, step by step. A link lets one room read the notes of another; nothing is
// written across. The assistant asks one thing at a time, in the room's own material — the step,
// the question and what it decides; the choices on a card, each saying what it does, the safe one
// marked; and, under every step, the link as it stands so far, in words: who serves, what crosses,
// who reads, until when, how the notes arrive, whether orders go. Safe from the start: a week,
// decisions and facts, notes read only when asked, no orders. Orders appear only with BISHOP on
// one side, off, and ask for the room's designation typed, as arming #3 does. It warns when the
// room that serves is asleep or older, and says the whole contract before it is signed.
const LINK_KINDS = ['decision', 'fact', 'preference', 'question'];
const LINK_KIND_NOTES = { decision: () => t('What was agreed: the choices the project made.'), fact: () => t('What is known: data and findings the project settled.'), preference: () => t('How you like to work: conventions and tastes.'), question: () => t('What is open: questions still waiting for an answer.') };
const LINK_DAYS = [[1, () => t('A day')], [7, () => t('A week')], [30, () => t('30 days')], [0, () => t('No expiry')]];
let sheet = null;
// A sentence whose project names stand out (2026-10-11): the slots named in `bold` (all of them,
// unless said) are written in bold, the rest as the catalogue says it.
function sayBold(key, vars, bold = Object.keys(vars)) {
  const out = document.createDocumentFragment();
  const template = t(key);
  let at = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    out.append(template.slice(at, match.index));
    const value = Object.hasOwn(vars, match[1]) ? String(vars[match[1]]) : match[0];
    out.append(bold.includes(match[1]) ? el('b', null, value) : value);
    at = match.index + match[0].length;
  }
  out.append(template.slice(at));
  return out;
}
const ALLOWED_GLYPH = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.4l3.2 3.1L15 6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NOT_ALLOWED_GLYPH = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 6.5l7 7M13.5 6.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const BOTH_WAYS_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7.2h11.2L12.4 4.4M16 12.8H4.8l2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function openLinkSheet({ reader = null, source = null } = {}) {
  if (!data || sheet) return;
  const rooms = [...data.rooms].sort((x, y) => Number(Boolean(y.open)) - Number(Boolean(x.open)) || roomLabel(x).localeCompare(roomLabel(y)));
  if (rooms.length < 2) return;
  // Where it starts, unless it was asked for a pair: BISHOP reading, from a room that can hand
  // notes over now (open and up to date) when there is one.
  const ready = (room) => room.open && !room.glance?.outdated && !room.glance?.unreachable;
  // Two projects already connected are not connected again (2026-10-11): whichever way the one in
  // force goes, the wizard says how they are connected and where to change it, and signs nothing.
  const linkedPair = (x, y) => (x && y ? (data.enlaces ?? []).find((one) => [one.rooms.a, one.rooms.b].sort().join('\n') === [x, y].sort().join('\n')) ?? null : null);
  const pick = {
    reader: reader ?? (source !== data.salas && rooms.some((room) => room.id === data.salas) ? data.salas : rooms.find((room) => room.id !== source)?.id),
    source: null, both: false, kinds: new Set(['decision', 'fact']), days: 7, recall: false, train: false, state: false, deliver: false,
    orders: false, maxMode: 1, perHour: 6, designation: '',
  };
  const free = (room) => room.id !== pick.reader && room.id !== data.salas && !linkedPair(room.id, pick.reader);
  pick.source = source ?? (rooms.find((room) => free(room) && ready(room)) ?? rooms.find(free) ?? rooms.find((room) => room.id !== pick.reader && room.id !== data.salas))?.id;
  // The Coordinator never shares its memory (src/enlaces.mjs: it gathers every project and is
  // nobody's source), so the wizard never offers what signing would refuse: asked for with the
  // Coordinator as the one that shares, the two change places; it never reads both ways.
  const coordinator = (id) => Boolean(data.salas) && id === data.salas;
  if (coordinator(pick.source)) [pick.reader, pick.source] = [pick.source, pick.reader];
  const settle = () => { if (coordinator(pick.source) && !coordinator(pick.reader)) [pick.reader, pick.source] = [pick.source, pick.reader]; if (coordinator(pick.source) || coordinator(pick.reader)) pick.both = false; };
  const roomOf = (id) => rooms.find((room) => room.id === id) ?? null;
  const nameOf = (id) => { const room = roomOf(id); return room ? roomLabel(room) : ''; };
  // Orders only with BISHOP on one side; they would go into the other.
  const ordersInto = () => (data.salas && [pick.reader, pick.source].includes(data.salas) ? [pick.reader, pick.source].find((id) => id !== data.salas) ?? null : null);
  const stepsNow = () => ['who', 'what', 'time', ...(ordersInto() ? ['orders'] : []), 'review'];
  const STEP_WORDS = { who: () => t('Projects'), what: () => t('What it looks up'), time: () => t('How long'), orders: () => t('Orders'), review: () => t('Sign') };
  // The kinds as a sentence says them: «decisiones y hechos».
  const KIND_PLURALS = { decision: () => t('decisions'), fact: () => t('facts'), preference: () => t('preferences'), question: () => t('questions') };
  const kindsSaid = () => new Intl.ListFormat(language, { type: 'conjunction' }).format(LINK_KINDS.filter((kind) => pick.kinds.has(kind)).map((kind) => KIND_PLURALS[kind]()));
  const until = () => new Date(Date.now() + pick.days * 86400000).toLocaleDateString(language, { day: 'numeric', month: 'long' });
  let at = 0;
  sheet = el('dialog', 'sm-sheet sm-wide sm-link-wizard');
  const inner = el('div', 'sm-sheet-body');
  sheet.append(inner);
  document.body.append(sheet);

  // ---- The pieces every step is made of.
  const card = () => el('div', 'lw-card');
  // A row: what it is and what it does on the left, its control on the right.
  const row = (title, note, control, { recommended = false, dot = null } = {}) => {
    const line = el('div', 'lw-row');
    const words = el('div', 'lw-words');
    const head = el('div', 'lw-title');
    if (dot) head.append(el('i', `lw-dot k-${dot}`));
    // Words, or a sentence with its names in bold (sayBold).
    const name = el('b');
    name.append(title);
    head.append(name);
    if (recommended) head.append(el('span', 'lw-tag', t('Recommended')));
    words.append(head);
    if (note) { const said = el('span', 'lw-note'); said.append(note); words.append(said); }
    line.append(words);
    if (control) line.append(control);
    return line;
  };
  const toggle = (on, change, label) => {
    const wrap = el('label', 'settings-switch');
    const box = el('input'); box.type = 'checkbox'; box.checked = on; box.setAttribute('aria-label', label);
    box.addEventListener('change', () => change(box.checked));
    wrap.append(box, el('i'));
    return wrap;
  };
  const rail = (options, current, choose, label) => {
    const seg = el('div', 'sx-seg');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', label);
    for (const [value, words] of options) {
      const one = button(null, words, () => { choose(value); render(); });
      one.setAttribute('role', 'radio');
      one.setAttribute('aria-checked', String(value === current));
      seg.append(one);
    }
    return seg;
  };
  const roomSelect = (chosen, change, label, { shares = false, other = null } = {}) => {
    const select = el('select', 'lw-select');
    select.setAttribute('aria-label', label);
    for (const room of rooms) {
      if (shares && coordinator(room.id)) continue;
      const linked = room.id !== other && linkedPair(room.id, other);
      const option = el('option', null, linked ? t('{project} · already connected', { project: roomLabel(room) }) : roomLabel(room)); option.value = room.id; if (room.id === chosen) option.selected = true; select.append(option);
    }
    select.addEventListener('change', () => change(select.value));
    return select;
  };
  // What the connection allows and what it does not, line by line (2026-10-11): a tick for what
  // it lets happen, a cross for what it never does, each with its reason, so nobody has to
  // guess why a choice is missing.
  const allows = (lines) => {
    const box = el('div', 'lw-allows');
    const list = el('ul');
    for (const [yes, words] of lines) {
      const line = el('li', yes ? 'yes' : 'no');
      const sign = el('i');
      sign.innerHTML = yes ? ALLOWED_GLYPH : NOT_ALLOWED_GLYPH; // trusted: our own SVG strings
      const said = el('span');
      said.append(words);
      line.append(sign, said);
      list.append(line);
    }
    box.append(el('span', 'lw-allows-head', t('What this connection allows')), list);
    return box;
  };
  const alreadyLinked = (enlace) => {
    const ends = endsOf(enlace);
    const box = el('div', 'lw-allows lw-already');
    const said = el('p', 'lw-already-says');
    said.append(enlace.direction === 'both'
      ? sayBold('{a} and {b} already look each other up.', { a: roomName(enlace.rooms.a), b: roomName(enlace.rooms.b) })
      : coordinator(ends.reader) ? sayBold('The Coordinator already looks up the notes of {source}.', { source: roomName(ends.source) })
      : sayBold('{reader} already looks up the notes of {source}.', { reader: roomName(ends.reader), source: roomName(ends.source) }));
    const kinds = new Intl.ListFormat(language, { type: 'conjunction' }).format(LINK_KINDS.filter((kind) => (enlace.kinds ?? []).includes(kind)).map((kind) => KIND_PLURALS[kind]()));
    const what = [kinds.charAt(0).toUpperCase() + kinds.slice(1), enlace.expires ? t('until {date}', { date: new Date(enlace.expires).toLocaleDateString(language, { day: 'numeric', month: 'short' }) }) : t('no expiry')];
    if (enlace.orders?.allowed) what.push(t('orders up to #{n}', { n: enlace.orders.maxMode }));
    const see = button('sm-btn small', t('See the connections'), () => { sheet.close(); if (!ui.linksSheet.open) ui.linksSheet.showModal(); });
    box.append(el('span', 'lw-allows-head', t('They are already connected')), said, el('p', 'lw-note', what.join(' · ')), el('p', 'lw-note', t('A pair is connected once. To change what it looks up, how long or the orders, revoke it in Connections and make a new one.')), see);
    return box;
  };
  const caution = (words) => { const line = el('div', 'lw-caution'); const said = el('span'); said.append(words); line.append(el('i'), said); return line; };
  // What the person should know about the rooms chosen.
  function cautions() {
    const said = [];
    for (const id of pick.both ? [pick.source, pick.reader] : [pick.source]) {
      const room = roomOf(id);
      if (!room) continue;
      if (!room.open) said.push(sayBold('{room} is asleep: while it sleeps, it hands nothing over.', { room: roomLabel(room) }));
      else if (room.glance?.outdated) said.push(sayBold('{room} runs an older MADRE: it may hand nothing over until you update it.', { room: roomLabel(room) }));
    }
    return said;
  }
  // The scene over every step, in the welcome's own style (wizardScene): the room that serves and
  // the one that reads, arriving and floating; BISHOP with its ring; between them the wire, its dashes
  // running the way the notes travel (both ways when both read), and the notes themselves crossing it,
  // one dot per kind that crosses, in its kind's colour. Under the scene, in a strip of their own so
  // they never cover it, the link's terms. It is made once and kept across the steps; a choice
  // redraws what it says, not the scene.
  const stage = el('div', 'sm-scene scene-link');
  const field = el('div', 'lw-field');
  stage.append(field);
  const shown = { head: null, page: null };
  stage.setAttribute('aria-hidden', 'true');
  const ends = { source: null, reader: null };
  function endNode(role) {
    const node = el('div', `sm-scene-node lw-end ${role}`);
    node.style.left = role === 'source' ? '20%' : '80%';
    node.style.top = '42%';
    node.style.setProperty('--d', role === 'source' ? '0ms' : '160ms');
    field.append(node);
    return node;
  }
  function paintEnd(node, id, role) {
    if (node.dataset.room !== id) {
      node.dataset.room = id;
      node.replaceChildren();
      const body = id === data.salas ? mark('bishop', 46) : (() => { const disc = el('span', 'lw-room-mark'); disc.innerHTML = FOLDER_GLYPH; return disc; })(); // trusted: drawn here
      node.classList.toggle('is-bishop', id === data.salas);
      node.append(body, el('b', null, nameOf(id)), el('small'));
    }
    node.lastChild.textContent = role;
  }
  function paintStage() {
    ends.source ??= endNode('source');
    ends.reader ??= endNode('reader');
    paintEnd(ends.source, pick.source, pick.both ? t('Shares and looks up') : t('Shares'));
    paintEnd(ends.reader, pick.reader, pick.both ? t('Shares and looks up') : coordinator(pick.reader) && pick.orders ? t('Looks up and gives orders') : t('Looks up'));
    stage.querySelector('.lw-wires')?.remove();
    stage.querySelector('.lw-terms')?.remove();
    const box = field.getBoundingClientRect();
    if (box.width) {
      // In the scene's own pixels, so the dots stay round and the wire meets the bodies.
      const W = box.width, H = box.height, y = H * 0.42, x0 = W * 0.2 + 34, x1 = W * 0.8 - 34;
      const wires = svgNode('svg', { class: 'lw-wires', viewBox: `0 0 ${W} ${H}` });
      const there = `M${x0} ${y} C ${x0 + (x1 - x0) * 0.33} ${y - 18}, ${x0 + (x1 - x0) * 0.66} ${y + 18}, ${x1} ${y}`;
      const back = `M${x1} ${y + 7} C ${x0 + (x1 - x0) * 0.66} ${y + 26}, ${x0 + (x1 - x0) * 0.33} ${y - 10}, ${x0} ${y + 7}`;
      const paths = [['lw-there', there], ...(pick.both ? [['lw-back', back]] : [])];
      paths.forEach(([id, d]) => wires.append(svgNode('path', { id, class: 'sm-wire on', d })));
      // The notes crossing: one dot per kind, one after another, along each way (still, for whoever
      // asked for less motion: then the wire alone says it).
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const kinds = still ? [] : LINK_KINDS.filter((kind) => pick.kinds.has(kind));
      paths.forEach(([id], way) => kinds.forEach((kind, index) => {
        const dot = svgNode('circle', { r: 4.2, class: `lw-crossing k-${kind}`, opacity: 0 });
        const begin = `${(index * 2.6) / Math.max(1, kinds.length) + way * 1.3}s`;
        const move = svgNode('animateMotion', { dur: '2.6s', repeatCount: 'indefinite', begin, calcMode: 'spline', keyTimes: '0;1', keySplines: '.45 0 .55 1' });
        const along = svgNode('mpath');
        along.setAttribute('href', `#${id}`);
        move.append(along);
        dot.append(move, svgNode('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;.12;.88;1', dur: '2.6s', repeatCount: 'indefinite', begin }));
        wires.append(dot);
      }));
      field.prepend(wires);
    }
    const terms = el('p', 'lw-terms');
    const said = [
      pick.kinds.size ? kindsSaid() : t('nothing yet'),
      pick.days ? t('Ends {date}', { date: until() }) : t('No expiry'),
      pick.recall ? t('On every turn') : t('Only when asked'),
      ...(ordersInto() ? [pick.orders ? t('Orders up to #{n}', { n: pick.maxMode }) : t('No orders')] : []),
    ];
    for (const words of said) terms.append(el('span', null, words));
    stage.append(terms);
  }

  function render({ back = false } = {}) {
    settle();
    const steps = stepsNow();
    at = Math.min(at, steps.length - 1);
    const kind = steps[at];
    const head = el('header', 'sm-sheet-head');
    const dots = el('ol', 'sm-steps');
    steps.forEach((name, index) => dots.append(el('li', index === at ? 'on' : index < at ? 'done' : null, STEP_WORDS[name]())));
    head.append(dots, closeKey(() => sheet.close()));
    const page = el('div', `sm-step lw-step${back ? ' back' : ''}`);
    // The swap, on the first step: it turns the link round, and the scene shows it.
    const turn = button('sm-btn small', t('Swap'), () => { [pick.reader, pick.source] = [pick.source, pick.reader]; render(); });
    const intro = (title, lead) => {
      const box = el('div', 'lw-intro');
      box.append(el('span', 'lw-eyebrow', t('Step {n} of {total}', { n: at + 1, total: steps.length })), el('h3', null, title));
      if (lead) { const said = el('p', 'lw-lead'); said.append(lead); box.append(said); }
      page.append(box);
    };
    const error = el('p', 'error');
    const actions = el('div', 'actions');
    const next = (check) => button('sm-btn primary', t('Continue'), () => { const wrong = check?.(); if (wrong) { error.textContent = wrong; return; } at += 1; render(); });
    if (at > 0) actions.append(button('sm-btn', t('Back'), () => { at -= 1; render({ back: true }); }));

    if (kind === 'who') {
      // With the Coordinator at one end the step speaks of it: what it reads, the orders it may
      // give, and why it is never read (src/enlaces.mjs). Between two projects, who reads whom.
      const withCoordinator = coordinator(pick.reader);
      const source = nameOf(pick.source), reader = nameOf(pick.reader);
      intro(t('Which projects do you want to connect?'), withCoordinator
        ? t('The Coordinator looks up what a project has already learned: its decisions, facts and preferences. If you allow it, it can also ask that project for tasks.')
        : t('Connecting them lets one project look up what the other has already learned: its decisions, facts and preferences. It only reads; nothing in the other project ever changes.'));
      const box = card();
      if (pick.both) {
        // Both ways, neither only serves nor only reads: the two projects side by side, with no
        // direction to choose and nothing to swap.
        const pair = el('div', 'lw-pair');
        const both = el('span', 'lw-both');
        both.innerHTML = BOTH_WAYS_ICON; // trusted: our own SVG string
        pair.append(roomSelect(pick.source, (id) => { pick.source = id; render(); }, t('One project'), { shares: true, other: pick.reader }), both, roomSelect(pick.reader, (id) => { pick.reader = id; render(); }, t('The other project'), { shares: true, other: pick.source }));
        const line = row(t('The two projects'), t('Each one looks up the notes of the other. Nothing is written into either.'), null);
        line.classList.add('lw-stack');
        line.append(pair);
        box.append(line);
      } else {
        // Nothing to swap with the Coordinator: it is always the one that looks up, so its project
        // is chosen alone, as wide as the one under it.
        const sharing = roomSelect(pick.source, (id) => { pick.source = id; render(); }, t('Shares its memory'), { shares: true, other: pick.reader });
        const serves = withCoordinator ? sharing : el('div', 'lw-control lw-pick');
        if (!withCoordinator) serves.append(sharing, turn);
        box.append(row(t('Shares its memory'), withCoordinator ? t('The Coordinator reads its notes.') : t('Its notes can be read. Nothing is written into it.'), serves));
        box.append(row(t('Looks it up'), t('Its agents can look the notes up when they need them.'), roomSelect(pick.reader, (id) => { pick.reader = id; render(); }, t('Looks it up'), { other: pick.source })));
      }
      if (!withCoordinator) box.append(row(t('Both ways'), t('Each one looks up the other. Leave it off if only one needs it.'), toggle(pick.both, (on) => { pick.both = on; render(); }, t('Both ways'))));
      const looks = (who, whose) => sayBold('{reader} looks up the notes of {source}.', { reader: who, source: whose });
      const existing = pick.reader !== pick.source ? linkedPair(pick.source, pick.reader) : null;
      if (existing) box.append(alreadyLinked(existing));
      else box.append(allows(withCoordinator
        ? [
          [true, sayBold('The Coordinator looks up the notes of {room}.', { room: source })],
          [true, sayBold('It can ask {room} for tasks, up to #2, if you allow it in the Orders step.', { room: source })],
          [false, sayBold('{room} does not look up the Coordinator: the Coordinator keeps what it read in all your projects, and {room} would see it without your signature.', { room: source })],
        ]
        : pick.both
          ? [[true, looks(reader, source)], [true, looks(source, reader)], [false, t('Neither one writes in the other: nothing in either project changes.')]]
          : [[true, looks(reader, source)], [false, sayBold('{source} does not look up {reader}. Turn on Both ways if it needs to.', { source, reader })], [false, t('Neither one writes in the other: nothing in either project changes.')]]));
      for (const said of cautions()) box.append(caution(said));
      page.append(box);
      const onward = next(() => (pick.reader === pick.source ? t('Choose two different projects.') : coordinator(pick.source) ? t('The Coordinator never shares its memory: it is always the one that looks up.') : existing ? t('These two are already connected. To change it, revoke it in Connections and make a new one.') : null));
      // Already connected: nothing to go on to; the box above says why and where to change it.
      onward.disabled = Boolean(existing);
      actions.append(onward);
    } else if (kind === 'what') {
      intro(t('What can it look up?'), t('Turn on only what it needs. Decisions and facts are usually enough.'));
      const box = card();
      box.classList.add('lw-grid');
      for (const kindOf of LINK_KINDS) {
        box.append(row(kindWord(kindOf), LINK_KIND_NOTES[kindOf](), toggle(pick.kinds.has(kindOf), (on) => { if (on) pick.kinds.add(kindOf); else pick.kinds.delete(kindOf); error.textContent = ''; render(); }, kindWord(kindOf)), { recommended: kindOf === 'decision' || kindOf === 'fact', dot: kindOf }));
      }
      page.append(box, el('p', 'lw-foot', t('Only the notes already in use are shared, cleaned of private data first. Never your files, your whole conversations or the notes you set aside.')));
      actions.append(next(() => (pick.kinds.size ? null : t('Choose at least one kind.'))));
    } else if (kind === 'time') {
      intro(t('For how long?'), t('The connection ends on its own on the day you choose. Until then, its agents look the notes up only when they need them, unless you turn on the option below.'));
      const box = card();
      const ends = el('div', 'lw-control');
      ends.append(rail(LINK_DAYS.map(([value, words]) => [value, words()]), pick.days, (value) => { pick.days = value; }, t('It ends')));
      box.append(row(t('It ends'), t('A week is enough to try it; signing it again takes a moment.'), ends, { recommended: pick.days === 7 }));
      box.append(row(t('Always include'), t('With every question it gets up to 3 related notes without looking for them; each time counts toward the hourly limit. Off, its agents look them up only when they need to.'), toggle(pick.recall, (on) => { pick.recall = on; render(); }, t('Always include'))));
      // D-S15: only with the Coordinator reading, and only by you.
      if (coordinator(pick.reader)) box.append(row(t('The Coordinator learns from it'), t("Its notes also go into the training of the Coordinator's local AI, so it knows this project without opening it. Clearing it or revoking takes it out of the next export; a model already trained keeps what it learned until you train it again."), toggle(pick.train, (on) => { pick.train = on; render(); }, t('The Coordinator learns from it'))));
      // D-S16 and D-S17: by you only, off unless you turn them on.
      box.append(row(t('It shares its state'), t('Besides its notes, its canonical state as Continuity keeps it: objective, phase, next step, its last handoff, decisions and what is still open. Only if the project has Continuity installed; never its files or its code.'), toggle(pick.state, (on) => { pick.state = on; render(); }, t('It shares its state'))));
      box.append(row(t('It receives delivered notes'), t('The project that reads can hand it notes. They wait there until you accept them (or an agent of that project in #3 EDIT or above): nothing enters its memory on its own.'), toggle(pick.deliver, (on) => { pick.deliver = on; render(); }, t('It receives delivered notes'))));
      page.append(box);
      actions.append(next());
    } else if (kind === 'orders') {
      const name = nameOf(ordersInto());
      intro(t('Orders from the Coordinator'), sayBold('With orders, the Coordinator can ask {room} for a task, and its agents do it there. Without them, it only reads. #3 EDIT and #4 FULL ACCESS never go this way: they arrive as a proposal you unlock in that project.', { room: name }));
      const box = card();
      box.append(row(sayBold('Allow orders into {room}', { room: name }), sayBold('Leave it off unless you need the Coordinator to act in {room}.', { room: name }), toggle(pick.orders, (on) => { pick.orders = on; render(); }, t('Allow orders into {room}', { room: name })), { recommended: !pick.orders }));
      if (pick.orders) {
        const modes = el('div', 'lw-control');
        modes.append(rail([1, 2].map((n) => [n, `#${n} ${modeName(n)}`]), pick.maxMode, (value) => { pick.maxMode = value; }, t('Up to which mode')));
        box.append(row(t('Up to which mode'), null, modes));
        const hourly = el('div', 'lw-control');
        hourly.append(rail([3, 6, 12].map((n) => [n, String(n)]), pick.perHour, (value) => { pick.perHour = value; }, t('How many an hour')));
        box.append(row(t('How many an hour'), null, hourly));
        const typed = el('input', 'lw-input'); typed.type = 'text'; typed.autocomplete = 'off'; typed.spellcheck = false; typed.value = pick.designation;
        typed.setAttribute('aria-label', t('Type the name of {room} to allow orders into it', { room: name }));
        typed.addEventListener('input', () => { pick.designation = typed.value; error.textContent = ''; });
        const said = row(sayBold('Type the name of {room} to allow orders into it', { room: name }), null, null);
        said.classList.add('lw-stack');
        said.append(typed);
        box.append(said);
      }
      page.append(box);
      actions.append(next(() => (pick.orders && !pick.designation.trim() ? t('Type the project name to allow orders, or turn them off.') : null)));
    } else {
      intro(t('Check it and sign'), t('This is the whole connection. Nothing changes until you press Sign.'));
      const list = el('ul', 'lw-card lw-review');
      const said = (words) => { const item = el('li'); item.append(words); list.append(item); };
      said(pick.both ? sayBold('{a} and {b} will look up each other\'s {kinds}.', { a: nameOf(pick.reader), b: nameOf(pick.source), kinds: kindsSaid() }, ['a', 'b']) : sayBold('{reader} will look up the {kinds} of {source}.', { reader: nameOf(pick.reader), source: nameOf(pick.source), kinds: kindsSaid() }, ['reader', 'source']));
      said(pick.days ? t('Until {date}.', { date: until() }) : t('With no expiry: it lasts until you revoke it.'));
      said(pick.recall ? t('With every question, up to 3 of these notes arrive without being looked for.') : t('Its agents look them up only when they need them.'));
      if (coordinator(pick.reader)) said(pick.train ? sayBold('The Coordinator learns from {room}: its notes go into its training.', { room: nameOf(pick.source) }) : t('The Coordinator does not learn from it: it only looks it up.'));
      if (ordersInto()) said(pick.orders ? sayBold('The Coordinator may send orders into {room}, up to #{n}, {k} an hour.', { room: nameOf(ordersInto()), n: pick.maxMode, k: pick.perHour }, ['room']) : t('No orders: the Coordinator only looks up.'));
      if (pick.state) said(pick.both ? t('Both also read each other\'s state, as Continuity keeps it.') : sayBold('{reader} also reads the state of {source}, as Continuity keeps it.', { reader: nameOf(pick.reader), source: nameOf(pick.source) }, ['reader', 'source']));
      said(pick.deliver
        ? (pick.both ? t('Each can deliver notes to the other; they wait until that project accepts them. Nothing is written directly, and you can revoke it at any moment from Connections.') : sayBold('{reader} can deliver notes to {source}; they wait there until accepted. Nothing is written directly, and you can revoke it at any moment from Connections.', { reader: nameOf(pick.reader), source: nameOf(pick.source) }, ['reader', 'source']))
        : t('Nothing is written across, and you can revoke it at any moment from Connections.'));
      page.append(list);
      const warn = cautions();
      if (warn.length) { const box = card(); for (const words of warn) box.append(caution(words)); page.append(box); }
      const sign = button('sm-btn primary', t('Sign'), async () => {
        error.textContent = '';
        const body = {
          a: pick.source, b: pick.reader, direction: pick.both ? 'both' : 'a→b', kinds: [...pick.kinds],
          expires: pick.days ? new Date(Date.now() + pick.days * 86400000).toISOString() : null,
          orders: pick.orders && ordersInto() ? { allowed: true, maxMode: pick.maxMode, perHour: pick.perHour } : { allowed: false, maxMode: 0, perHour: pick.perHour },
          designation: pick.orders && ordersInto() ? pick.designation.trim() : undefined,
          recall: pick.recall,
          train: pick.train && coordinator(pick.reader),
          state: pick.state,
          deliver: pick.deliver,
        };
        sign.disabled = true;
        sign.textContent = t('Signing…');
        const answer = await fetch('/api/salas/enlaces', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })).catch(() => ({ ok: false, body: {} }));
        sign.disabled = false;
        sign.textContent = t('Sign');
        if (!answer.ok) { error.textContent = answer.body.error ?? t('The connection could not be signed.'); return; }
        sheet.close();
        await refresh();
      });
      actions.append(sign);
    }
    page.append(error, actions);
    // The scene stays where it is (taken out and put back, its animations would start over).
    if (!stage.isConnected) inner.replaceChildren(head, stage, page);
    else { shown.head.replaceWith(head); shown.page.replaceWith(page); }
    shown.head = head; shown.page = page;
    paintStage();
  }
  sheet.addEventListener('close', () => { sheet.remove(); sheet = null; });
  render();
  sheet.showModal();
  paintStage();
}
ui.link.addEventListener('click', () => openLinkSheet());

let refreshPending = null;
async function refresh() {
  if (refreshPending) return refreshPending;
  refreshPending = fetch('/api/salas', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  const answer = await refreshPending;
  refreshPending = null;
  if (!answer) { ui.foot.textContent = t('This project did not answer. It may have closed.'); ui.bar.live.classList.add('is-off'); ui.bar.live.lastChild.textContent = t('Not answering right now'); return; }
  // Home is the first screen of `npx madre`: a MADRE nobody has set takes this browser's language
  // here, once, and every project follows (public/i18n.js, browserLanguage).
  if (answer.languageChosen === false && !languageAdopted) {
    languageAdopted = true;
    let chosenHere = null;
    try { chosenHere = localStorage.getItem('pulse.language'); } catch { /* no storage */ }
    const mine = chosenHere === 'es' || chosenHere === 'en' ? chosenHere : browserLanguage();
    if (await post('/api/language', { language: mine }).then((response) => response?.ok !== false).catch(() => false)) answer.language = mine;
  }
  if (answer.language && answer.language !== language) { language = setLanguage(answer.language); root.lang = language; translateStatic(); drawAttention(); drawDecisions(); drawWork(); homeTour.repaint(); }
  data = answer;
  // A project that came up after Home stopped waiting is open: its card no longer says it did not.
  for (const room of answer.rooms ?? []) if (room.open) failed.delete(room.id);
  ui.foot.textContent = t('Every project runs on this Mac, on its own, with its own memory.');
  // The room's corner (app.js, #colophon): the version this Home runs, and NOTICE's own line.
  if (answer.version) drawAttribution(ui.colophon, answer.version);
  draw();
}

async function startRoom(room, { enter = false } = {}) {
  busy.set(room.id, 'starting');
  failed.delete(room.id);
  draw();
  const answer = await fetch('/api/salas/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: room.id }) })
    .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })).catch(() => ({ ok: false, body: {} }));
  if (answer.ok) await waitDone(room.id); else waitDrop(room.id);
  busy.delete(room.id);
  if (!answer.ok) failed.set(room.id, answer.body.error ?? t('The project did not open.'));
  // Opened from its card, the person goes in: that is what «Open» means.
  else if (enter && answer.body.port) { leaveTo(`http://127.0.0.1:${answer.body.port}/`); return answer; }
  await refresh();
  return answer;
}

// A card's wait (2026-10-10): MADRE's loader in a line (loader.js), kept across the redraws of the
// card so it never starts over, creeping while the project wakes, closes or leaves, and filled when
// it is done.
const waits = new Map();       // room id → its loader while the card waits
function waitFor(id, label) {
  let loader = waits.get(id);
  if (!loader) {
    loader = makeLoader({ small: true, progress: 0.04 });
    loader.stop = creep(loader, { to: 0.9, rate: 0.03, every: 200 });
    waits.set(id, loader);
  }
  setLoader(loader, 0, label);
  return loader;
}
// It did not happen: the loader goes without filling, and the card says why.
function waitDrop(id) {
  waits.get(id)?.stop?.();
  waits.delete(id);
}
function waitDone(id) {
  const loader = waits.get(id);
  if (!loader) return Promise.resolve();
  waits.delete(id);
  loader.stop?.();
  return finishLoader(loader, { hold: 220 });
}

// Out of MADRE (2026-10-10): Home forgets it (src/salas.mjs, forgetProject); its folder and its
// memory stay where they are, and adding the folder again brings them back.
async function forgetRoom(room) {
  forgetting.delete(room.id);
  busy.set(room.id, 'forgetting');
  failed.delete(room.id);
  draw();
  const answer = await post('/api/salas/forget', { room: room.id });
  if (answer.ok) await waitDone(room.id); else waitDrop(room.id);
  busy.delete(room.id);
  if (!answer.ok) { failed.set(room.id, answer.body.error ?? t('It could not be taken out of MADRE.')); draw(); return; }
  if (pinsStored()?.includes(room.id)) pinRemove(room.id);
  toast(t('{name} left MADRE. Its folder is still on this Mac.', { name: answer.body.name ?? room.name }));
  await refresh();
}

async function closeRoom(room) {
  asking.delete(room.id);
  busy.set(room.id, 'closing');
  failed.delete(room.id);
  draw();
  const answer = await fetch('/api/salas/close', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: room.id }) })
    .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })).catch(() => ({ ok: false, body: {} }));
  if (answer.body.here) {
    // This page goes with the room that serves it: it says so, and stops asking.
    clearInterval(timer);
    document.body.classList.add('sm-gone');
    ui.none.hidden = false;
    ui.none.replaceChildren(el('span', null, t('This project closed. Open MADRE again to come back to Home.')));
    ui.stop.hidden = true;
    ui.projects.hidden = true;
    return;
  }
  if (!answer.ok) { waitDrop(room.id); busy.delete(room.id); failed.set(room.id, answer.body.error ?? t('That project did not answer.')); draw(); return; }
  // It closes in a moment; the card stays «closing» until the list says it is asleep.
  for (let wait = 0; wait < 20; wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await refresh();
    if (!data?.rooms.find((one) => one.id === room.id)?.open) break;
  }
  await waitDone(room.id);
  busy.delete(room.id);
  draw();
}

// THE MACROVERSE (macroverso.js): the same rooms as universes, entered from here.
function macroWords() {
  return {
    title: t('Project map'),
    back: t('Back to Home'),
    hint: t('Drag the space to move it · wheel to come closer · click a project to look at it · drag it to turn it · carry one onto the Coordinator for the Coordinator to read it, or onto another to connect them · ← → from one to the next · Esc to come back'),
    bishop: t('Coordinator'),
    bishopAbout: t('Your Coordinator. It reads across your projects, signs the connections between them and carries an order from one to another.'),
    bishopReads: (n) => (n ? (n === 1 ? t('It reads 1 project by a connection') : t('It reads {n} projects by connections', { n })) : t('It reads no project yet: each one it reads is a connection you sign.')),
    notLinked: t('Not connected yet: touch one to connect it'),
    talk: t('Talk to the Coordinator'),
    asleep: t('Asleep'),
    recenter: t('RECENTER'),
    // The legend under its name, in the Memory map's words.
    legend: t('Memory kinds'),
    kinds: { ...Object.fromEntries(KINDS.map((kind) => [kind, kindWord(kind)])), dim: t('NOT USED') },
    veins: (n) => t('{n} connections', { n }),
    links: t('Connections'),
    link: t('Connect…'),
    // One link as seen from one of its rooms.
    linkRow: (enlace, roomId) => {
      const other = roomName(enlace.rooms.a === roomId ? enlace.rooms.b : enlace.rooms.a);
      const kinds = kindsWords(enlace.kinds);
      if (enlace.direction === 'both') return t('both ways with {room}: {kinds}', { room: other, kinds });
      return endsOf(enlace).reader === roomId ? t('reads {kinds} from {room}', { kinds, room: other }) : t('{room} reads its {kinds}', { room: other, kinds });
    },
    sub: (rooms) => {
      const open = rooms.filter((room) => room.open);
      const memories = open.reduce((sum, room) => sum + (room.glance?.census?.memories ?? 0), 0);
      const waiting = open.filter((room) => room.glance?.waitingCount).length;
      return [data?.mac ?? null, t('{n} projects', { n: rooms.length }), waiting ? t('{n} waiting for you', { n: waiting }) : null, t('{n} memories', { n: memories })].filter(Boolean).join(' · ');
    },
    state: (room) => stateOf(room).words,
    path: homeWord,
    ask: askLine,
    kind: (kind) => KIND_WORDS[kind] ?? kind,
    counts: (room) => (room.open ? [conversationsCount(room.glance?.chats ?? 0), memoriesCount(room.glance?.census?.memories ?? 0)].join(' · ') : room.lastOpened ? t('Asleep · last open {when}', { when: ago(room.lastOpened) }) : t('Asleep')),
    enter: t('Enter the project'),
    backToRoom: t('Back to the project'),
    wake: t('Wake'),
    waking: t('Waking…'),
    all: t('All the projects'),
    close: t('Close'),
  };
}
// The macroverse is night in either theme, so it wears the accent as the night does: the hex the
// stylesheet gives that accent before the light scheme recolours it (S-014), read from the rule
// itself rather than from the page, which may be light.
function darkAccent() {
  const wanted = `[data-accent="${root.dataset.accent || 'madre'}"]`;
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText !== wanted) continue;
        const hex = rule.style.getPropertyValue('--acc').trim();
        if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
      }
    }
  } catch { /* no sheets to read: the house accent */ }
  return '#9bff66';
}
// And the ink that accent wears, read the same way.
function darkAccentInk() {
  const wanted = `[data-accent="${root.dataset.accent || 'madre'}"]`;
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText !== wanted) continue;
        const hex = rule.style.getPropertyValue('--acc-ink').trim();
        if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
      }
    }
  } catch { /* no sheets to read: the house ink */ }
  return '#0a1405';
}
ui.macro.addEventListener('click', async () => {
  if (macro || !data) return;
  const { openMacroverso } = await import('./macroverso.js');
  document.body.classList.add('sm-in-macro');
  macro = openMacroverso({
    host: document.body,
    rooms: data.rooms,
    here: data.here,
    enlaces: data.enlaces ?? [],
    accent: darkAccent(),
    accentInk: darkAccentInk(),
    // BISHOP at the centre (D-S12): the macroverse draws its body itself (macroverso.js, bishopOrb).
    bishop: data.salas ? { id: data.salas } : null,
    words: macroWords(),
    actions: {
      wake: async (room) => { await startRoom(room); },
      // Dragged from one universe onto another: the notes of the first would travel to the second.
      link: (source, reader) => openLinkSheet({ source: source?.id ?? null, reader: reader?.id ?? null }),
      closed: () => { macro = null; document.body.classList.remove('sm-in-macro'); ui.macro.focus(); },
    },
  });
});
window.addEventListener('resize', () => { if (data) ui.macro.hidden = !data.rooms.length || window.innerWidth < 900; });

ui.stop.addEventListener('click', async () => {
  if (!arming) {
    ui.stop.classList.add('armed');
    ui.stop.querySelector('span').textContent = t('Touch again to stop all');
    arming = setTimeout(() => { arming = 0; ui.stop.classList.remove('armed'); ui.stop.querySelector('span').textContent = t('Stop all'); }, 3000);
    return;
  }
  clearTimeout(arming);
  arming = 0;
  ui.stop.classList.remove('armed');
  ui.stop.disabled = true;
  await fetch('/api/salas/stop-all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
  ui.stop.disabled = false;
  ui.stop.querySelector('span').textContent = t('Stop all');
  await refresh();
});

// ---- THE BAR, as a room's: the logo and where you are (and, served by a project's room, the way
// back to it); this lobby answering; the rooms on the bar, each with how it is and a way into it; the
// agents with their sessions; who waits for you; a newer MADRE; what is running and the key that
// stops it; the links in force; the macroverse; reload and settings apart, as in the room.
function drawTopbar() {
  if (!data) return;
  const b = ui.bar;
  // Where you are, and the way back to the room that serves this page, when it is a project's.
  const here = data.rooms.find((room) => room.id === data.here) ?? null;
  b.backRoom.hidden = !here || here.id === data.salas;
  if (here && here.id !== data.salas) { b.backRoom.href = '/'; b.backRoom.lastChild.textContent = here.name; b.backRoom.title = t('Back to the project'); }
  b.live.classList.remove('is-off');
  b.live.lastChild.textContent = data.mac ?? '';
  // The rooms on the bar: the open projects, or the ones the person pinned, in their order.
  drawPins();
  // The agents of this computer, each with its session.
  b.agents.replaceChildren();
  for (const agent of (agentsSeen?.agents ?? []).filter((one) => one.id !== 'madre')) {
    const state = agentState(agent, agentsSeen);
    const key = button(`sm-agent-key ${state.key}`, null, () => openSettings('agents'));
    key.append(mark(agent.id, 24));
    key.title = `${agent.label ?? agent.id} · ${state.words}`;
    key.setAttribute('aria-label', key.title);
    b.agents.append(key);
  }
  b.agents.hidden = !b.agents.childElementCount;
  // Who waits for you: how many, and a way into the first room that asks.
  const asking = data.rooms.filter((room) => room.open && room.glance?.waitingCount);
  const waiting = asking.reduce((sum, room) => sum + room.glance.waitingCount, 0);
  b.waiting.hidden = !waiting;
  if (waiting) { b.waiting.href = addressOf(asking[0]); b.waiting.lastChild.textContent = t('{n} waiting for you', { n: waiting }); b.waiting.title = asking.map((room) => roomLabel(room)).join(' · '); }
  // A newer MADRE.
  b.update.hidden = !(versionSeen?.available && versionSeen.latest);
  if (!b.update.hidden) { b.update.lastChild.textContent = t('{version} AVAILABLE', { version: versionSeen.latest }); b.update.title = t('MADRE {version} is out.', { version: versionSeen.latest }); }
  // The links in force.
  const links = (data.enlaces ?? []).length;
  b.linksCount.hidden = !links;
  b.linksCount.textContent = String(links);
}
// ---- THE BAR'S ROOMS, the way you want them (2026-10-10), as the room's bar is arranged (app.js,
// «The bar, the way you want it»). Until the person arranges it, the bar holds the projects that
// are open, the ones that need the person first. A project is pinned from its card (right-click
// it, or drag the card to the bar); right-click a room on the bar and the bar opens for editing:
// the rooms tremble, each wears a «−», they can be carried to another place, and a card under the
// bar holds the projects that are not on it yet. What is on the bar, and in which order, is this
// browser's own (localStorage), as the room keeps its bar.
const PIN_KEY = 'pulse.lobbyBar';
const PIN_TYPE = 'application/x-madre-room';
const PIN_MINUS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 8h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const PIN_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.4 3.4h5.2l-.9 4.4 2.6 2.6v1.2H5.7v-1.2l2.6-2.6zM10 11.6v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const UNPIN_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.4 3.4h5.2l-.9 4.4 2.6 2.6v1.2H5.7v-1.2l2.6-2.6zM10 11.6v5M3.6 3.6l12.8 12.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARRANGE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.6" y="5.4" width="14.8" height="9.2" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 10h2.2M11.6 10h2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const FORGET_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 6.2c0-.9.7-1.6 1.6-1.6h3l1.6 1.8h5.2c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.6 11h4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
const MORE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="10" r="1.6" fill="currentColor"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/><circle cx="15" cy="10" r="1.6" fill="currentColor"/></svg>';
const pins = {
  saved: null,          // what this page decided, for when storage will not keep it
  chips: new Map(),     // room id → its key on the bar
  badges: new Map(),    // room id → its «−»
  layer: null,          // where the «−» live, over the rooms
  more: null,           // «+n», when the rooms do not all fit
  spilled: [],          // the rooms behind «+n»
  moreCard: null,
  card: null,           // the card under the bar while it is being arranged
  cardSaid: '',
  menu: null,           // a card's right-click menu
  editing: false,
  frame: 0,
  drag: null,           // a room being carried along the bar
  dropping: null,       // a project's card being dragged towards the bar
  slot: null,           // where it would land
  slotAt: null,
};
const motionStill = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
const motionMs = (ms) => ms * (Number.parseFloat(getComputedStyle(root).getPropertyValue('--motion-scale')) || 1);

function pinsStored() {
  if (pins.saved) return [...pins.saved];
  try {
    const raw = JSON.parse(localStorage.getItem(PIN_KEY) ?? 'null');
    if (Array.isArray(raw) && raw.every((id) => typeof id === 'string')) return [...new Set(raw)];
  } catch { /* no storage, or not a list: the bar as it comes */ }
  return null;
}
// The rooms on the bar, in their order: the person's, or the open projects until they arrange it.
// A project that left the lobby is skipped; BISHOP's own room is never a project.
function pinsShown() {
  if (!data) return [];
  const stored = pinsStored();
  if (!stored) return projectsInOrder().open.map((room) => room.id);
  const known = new Set(data.rooms.filter((room) => room.id !== data.salas).map((room) => room.id));
  return stored.filter((id) => known.has(id));
}
function pinsWrite(list) {
  pins.saved = [...list];
  try { localStorage.setItem(PIN_KEY, JSON.stringify(pins.saved)); } catch { /* this page only */ }
  pushHomeLayout();
  drawTopbar();
  settingsSheet?.sync({ detail: true });
}
function pinAdd(id, at = null) {
  const list = pinsShown().filter((one) => one !== id);
  list.splice(at === null ? list.length : Math.max(0, Math.min(at, list.length)), 0, id);
  pinsWrite(list);
  // It arrives where it was put, growing into its place rather than appearing in it.
  const chip = pins.chips.get(id);
  if (chip && typeof chip.animate === 'function' && !motionStill()) chip.animate([{ opacity: 0, scale: '.6' }, { opacity: 1, scale: '1' }], { duration: motionMs(240), easing: 'cubic-bezier(.2, .7, .2, 1)' });
}
function pinRemove(id) { pinsWrite(pinsShown().filter((one) => one !== id)); }
function pinsReset() {
  pins.saved = null;
  try { localStorage.removeItem(PIN_KEY); } catch { /* this page only */ }
  pushHomeLayout();
  drawTopbar();
  settingsSheet?.sync({ detail: true });
}

// From six rooms on, each is a square with its two letters (brands.js, monogram).
const PINS_SQUARE = 6;

// A room's key on the bar: its lamp and its name, or, from six rooms on, a square with its two
// letters and the lamp at its corner (its name is then its title). Open, it is a link to its room;
// asleep, pressing it wakes it and goes in, as «Open» on its card does.
function pinChip(id) {
  let chip = pins.chips.get(id);
  if (chip) return chip;
  chip = el('a', 'sm-tb-room');
  chip.dataset.barItem = id;
  chip.draggable = false;
  chip.append(el('i'), el('span'), el('b', 'sm-tb-mono'));
  chip.addEventListener('click', (event) => {
    if (pins.editing) return;
    const room = data?.rooms.find((one) => one.id === id);
    if (!room || room.open) return;
    event.preventDefault();
    if (!busy.has(room.id)) void startRoom(room, { enter: true });
  });
  chip.addEventListener('keydown', (event) => { if (!chip.hasAttribute('href') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); chip.click(); } });
  chip.addEventListener('contextmenu', (event) => { event.preventDefault(); event.pinHandled = true; pinsEdit(!pins.editing); });
  chip.addEventListener('pointerdown', (event) => { if (pins.editing) pinsDragStart(event, id); });
  pins.chips.set(id, chip);
  return chip;
}
// Puts the keys where the order says. Only what is out of place moves, so a key that stays is
// never taken off the page (and keeps its focus, and its tremble).
function pinsPlace(ids) {
  const box = ui.bar.open;
  const want = ids.map((id) => pins.chips.get(id)).filter(Boolean);
  if (pins.dropping && pins.slot) want.splice(Math.min(pins.slotAt ?? want.length, want.length), 0, pins.slot);
  want.push(pins.more);
  let next = pins.layer.parentNode === box ? pins.layer : null;
  for (let index = want.length - 1; index >= 0; index -= 1) {
    const node = want[index];
    if (node.parentNode !== box || node.nextElementSibling !== next) box.insertBefore(node, next);
    next = node;
  }
}
function drawPins() {
  const box = ui.bar.open;
  const ids = pinsShown();
  for (const id of ids) {
    const room = data.rooms.find((one) => one.id === id);
    const state = stateOf(room);
    const chip = pinChip(id);
    const lifted = pins.drag?.moved && pins.drag.id === id;
    chip.className = `sm-tb-room is-${busy.get(id) === 'starting' ? 'working' : state.key}${lifted ? ' bar-lifted' : ''}${pins.dropping === id ? ' is-moving' : ''}`;
    chip.querySelector('span').textContent = room.name;
    chip.lastChild.textContent = monogram(room.name);
    chip.title = `${room.name} · ${busy.get(id) === 'starting' ? t('Waking…') : state.words}`;
    chip.setAttribute('aria-label', room.name);
    if (room.open) { chip.href = addressOf(room); chip.removeAttribute('role'); chip.removeAttribute('tabindex'); }
    else { chip.removeAttribute('href'); chip.setAttribute('role', 'button'); chip.tabIndex = 0; }
  }
  for (const [id, chip] of pins.chips) if (!ids.includes(id)) { chip.remove(); pins.chips.delete(id); }
  pinsPlace(pins.drag?.order ?? (pins.dropping ? ids.filter((id) => id !== pins.dropping) : ids));
  box.classList.toggle('is-square', ids.length + (pins.dropping && !ids.includes(pins.dropping) ? 1 : 0) >= PINS_SQUARE);
  box.hidden = !ids.length && !pins.dropping && !pins.editing;
  pinsFit();
  if (pins.editing) { pinsBadges(); pinsDrawCard(); }
}

// When the rooms do not all fit, the last ones go behind «+n», which opens a small card with them.
// While the bar is arranged every room shows.
function pinsFit() {
  const box = ui.bar.open;
  for (const chip of pins.chips.values()) chip.classList.remove('is-spilled');
  pins.spilled = [];
  pins.more.hidden = true;
  if (pins.editing || pins.dropping || box.hidden || !box.clientWidth) { pinsCloseMore(); return; }
  const spills = () => box.scrollWidth > box.clientWidth + 1;
  if (!spills()) { pinsCloseMore(); return; }
  pins.more.hidden = false;
  const ids = pinsShown();
  while (ids.length && spills()) {
    const id = ids.pop();
    pins.chips.get(id)?.classList.add('is-spilled');
    pins.spilled.unshift(id);
    pins.more.textContent = `+${pins.spilled.length}`;
  }
  pins.more.title = t('{n} more', { n: pins.spilled.length });
  if (pins.moreCard && !pins.moreCard.hidden) pinsDrawMore();
}
function pinTile(room, onPress) {
  const tile = button('bar-tile', null, onPress);
  tile.dataset.barItem = room.id;
  const glyph = el('span', `bar-tile-glyph sm-pin-glyph is-${stateOf(room).key}`);
  glyph.innerHTML = FOLDER_GLYPH; // trusted: our own SVG string
  glyph.append(el('i'));
  tile.append(glyph, el('span', 'bar-tile-name', room.name));
  return tile;
}
function pinsDrawMore() {
  const card = pins.moreCard ??= (() => { const node = el('div', 'bar-card bar-more-card'); node.setAttribute('role', 'menu'); node.hidden = true; document.body.append(node); return node; })();
  const grid = el('div', 'bar-grid');
  for (const id of pins.spilled) {
    const room = data.rooms.find((one) => one.id === id);
    if (!room) continue;
    const tile = pinTile(room, () => { pinsCloseMore(); pins.chips.get(id)?.click(); });
    tile.setAttribute('role', 'menuitem');
    grid.append(tile);
  }
  card.replaceChildren(grid);
  card.hidden = false;
  const key = pins.more.getBoundingClientRect();
  const width = card.offsetWidth || 240;
  card.style.top = `${Math.round(key.bottom + 10)}px`;
  card.style.left = `${Math.round(Math.max(16, Math.min(window.innerWidth - width - 16, key.left)))}px`;
  card.style.right = 'auto';
  pins.more.setAttribute('aria-expanded', 'true');
}
function pinsCloseMore() {
  if (pins.moreCard) pins.moreCard.hidden = true;
  pins.more?.setAttribute('aria-expanded', 'false');
}

// The «−» of every room on the bar. They live in a layer of their own over the rooms (a link
// cannot hold a button) and follow their room every frame: its place, its tremble, its carry.
function pinsBadges() {
  const ids = pinsShown();
  for (const [id, badge] of pins.badges) if (!ids.includes(id)) { badge.remove(); pins.badges.delete(id); }
  ids.forEach((id, index) => {
    const delay = `${-((index * 97) % 260)}ms`;
    pins.chips.get(id)?.style.setProperty('--jiggle-delay', delay);
    let badge = pins.badges.get(id);
    if (!badge) {
      const name = data.rooms.find((one) => one.id === id)?.name ?? id;
      badge = button('bar-badge', null, (event) => { event.stopPropagation(); pinRemove(id); });
      badge.innerHTML = PIN_MINUS; // trusted: our own SVG string
      badge.title = t('Remove {name} from the bar', { name });
      badge.setAttribute('aria-label', badge.title);
      pins.badges.set(id, badge);
      pins.layer.append(badge);
    }
    badge.style.setProperty('--jiggle-delay', delay);
  });
  pinsFollow();
}
function pinsFollow() {
  for (const [id, badge] of pins.badges) {
    const chip = pins.chips.get(id);
    badge.hidden = !chip?.offsetWidth;
    if (badge.hidden) continue;
    badge.style.left = `${chip.offsetLeft - 5}px`;
    badge.style.top = `${chip.offsetTop - 5}px`;
    badge.style.transformOrigin = `${chip.offsetWidth / 2 + 5}px ${chip.offsetHeight / 2 + 5}px`;
    badge.style.translate = chip.style.translate || '';
  }
}
function pinsTick() {
  pins.frame = 0;
  if (!pins.editing) return;
  pinsFollow();
  pinsPlaceCard();
  pins.frame = requestAnimationFrame(pinsTick);
}
// The card under the bar: the projects that are not on it, a key to finish, and how to come back.
function pinsDrawCard() {
  if (!pins.card) {
    pins.card = el('section', 'bar-card sm-pins-card');
    pins.card.setAttribute('role', 'dialog');
    pins.card.setAttribute('aria-label', t('Add to the bar'));
    document.body.append(pins.card);
  }
  const ids = pinsShown();
  const offered = projectsInOrder().all.filter((room) => !ids.includes(room.id));
  // Drawn again only when what it offers changed, so a tile under the pointer stays put.
  const said = offered.map((room) => `${room.id}:${stateOf(room).key}`).join() + language;
  if (said === pins.cardSaid && !pins.card.hidden) { pinsPlaceCard(); return; }
  pins.cardSaid = said;
  const head = el('header', 'bar-card-head');
  const done = sxButton(t('Done'), () => pinsEdit(false), { tone: 'primary' });
  done.classList.add('bar-done');
  head.append(el('h3', null, t('Add to the bar')), done);
  const grid = el('div', 'bar-grid');
  for (const room of offered) {
    const tile = pinTile(room, () => pinAdd(room.id));
    tile.title = t('Add {name}', { name: room.name });
    tile.setAttribute('aria-label', tile.title);
    grid.append(tile);
  }
  pins.card.replaceChildren(head, grid.children.length ? grid : el('p', 'bar-card-empty', t('Everything is already on the bar.')), el('p', 'bar-card-hint', t('Drag a project to move it. A project comes to the bar from its card: right-click it, or drag it here.')));
  pins.card.hidden = false;
  pinsPlaceCard();
}
function pinsPlaceCard() {
  const card = pins.card;
  if (!card || card.hidden) return;
  const bar = ui.bar.open.closest('.sm-topbar').getBoundingClientRect();
  const from = ui.bar.open.getBoundingClientRect();
  const width = card.offsetWidth || 360;
  card.style.top = `${Math.round(bar.bottom + 10)}px`;
  card.style.left = `${Math.round(Math.max(16, Math.min(window.innerWidth - width - 16, from.left - 6)))}px`;
  card.style.right = 'auto';
}
function pinsEdit(on) {
  if (on === pins.editing) return;
  pins.editing = on;
  pinsCloseMenu();
  ui.bar.open.classList.toggle('is-editing', on);
  if (on) {
    pins.cardSaid = '';
    drawPins();
    pins.card?.querySelector('.bar-tile, .bar-done')?.focus({ preventScroll: true });
    if (!pins.frame) pins.frame = requestAnimationFrame(pinsTick);
    return;
  }
  cancelAnimationFrame(pins.frame);
  pins.frame = 0;
  pinsDragEnd({ save: true });
  for (const badge of pins.badges.values()) badge.remove();
  pins.badges.clear();
  if (pins.card) { pins.card.hidden = true; pins.card.replaceChildren(); }
  drawPins();
}

// Carrying a room to another place: it follows the pointer, the others make room as it passes
// their middle, and it settles where it is let go. The order is saved then.
function pinsDragStart(event, id) {
  if (event.button !== 0 || pins.drag) return;
  const chip = pins.chips.get(id);
  if (!chip || event.target.closest?.('.bar-badge')) return;
  const drag = { id, node: chip, x0: event.clientX, base: 0, moved: false, order: pinsShown() };
  drag.move = (moving) => pinsDragMove(moving);
  drag.up = () => pinsDragEnd({ save: true });
  pins.drag = drag;
  window.addEventListener('pointermove', drag.move);
  window.addEventListener('pointerup', drag.up);
  window.addEventListener('pointercancel', drag.up);
}
function pinsDragMove(event) {
  const drag = pins.drag;
  if (!drag) return;
  const dx = event.clientX - drag.x0;
  if (!drag.moved) {
    if (Math.abs(dx) < 5) return;
    drag.moved = true;
    drag.base = drag.node.offsetLeft;
    drag.node.classList.add('bar-lifted');
  }
  const centre = drag.base + dx + drag.node.offsetWidth / 2;
  const others = drag.order.filter((one) => one !== drag.id).map((one) => [one, pins.chips.get(one)]).filter(([, node]) => node);
  const past = others.find(([, node]) => centre < node.offsetLeft + node.offsetWidth / 2)?.[0] ?? null;
  const order = drag.order.filter((one) => one !== drag.id);
  order.splice(past ? order.indexOf(past) : order.length, 0, drag.id);
  if (order.join() !== drag.order.join()) {
    const before = new Map(others.map(([one, node]) => [one, node.offsetLeft]));
    drag.order = order;
    pinsPlace(order);
    // The rooms that moved slide from where they were, instead of jumping.
    for (const [one, node] of others) {
      const shift = before.get(one) - node.offsetLeft;
      if (shift && typeof node.animate === 'function' && !motionStill()) node.animate([{ translate: `${shift}px 0` }, { translate: '0 0' }], { duration: motionMs(180), easing: 'cubic-bezier(.2, .7, .2, 1)' });
    }
  }
  drag.node.style.translate = `${drag.base + dx - drag.node.offsetLeft}px 0`;
}
function pinsDragEnd({ save = false } = {}) {
  const drag = pins.drag;
  if (!drag) return;
  pins.drag = null;
  window.removeEventListener('pointermove', drag.move);
  window.removeEventListener('pointerup', drag.up);
  window.removeEventListener('pointercancel', drag.up);
  if (!drag.moved) return;
  const from = drag.node.style.translate;
  drag.node.style.translate = '';
  drag.node.classList.remove('bar-lifted');
  if (from && typeof drag.node.animate === 'function' && !motionStill()) drag.node.animate([{ translate: from }, { translate: '0 0' }], { duration: motionMs(160), easing: 'cubic-bezier(.2, .7, .2, 1)' });
  if (save) pinsWrite(drag.order);
}

// A project's card, right-clicked: pin it to the bar (or take it off), or arrange the bar.
function pinsCloseMenu() { pins.menu?.remove(); pins.menu = null; }
function pinsMenu(event, room, at = null) {
  event.preventDefault();
  pinsCloseMenu();
  const menu = el('div', 'bar-card sm-menu');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', room.name);
  const item = (words, icon, act, { danger = false } = {}) => {
    const one = button(`sm-menu-item${danger ? ' danger' : ''}`, null, () => { pinsCloseMenu(); act(); });
    one.setAttribute('role', 'menuitem');
    one.innerHTML = icon; // trusted: our own SVG strings
    one.append(el('span', null, words));
    menu.append(one);
  };
  const on = pinsShown().includes(room.id);
  item(on ? t('Remove from the bar') : t('Pin to the bar'), on ? UNPIN_ICON : PIN_ICON, () => (on ? pinRemove(room.id) : pinAdd(room.id)));
  item(t('Arrange the bar'), ARRANGE_ICON, () => pinsEdit(true));
  menu.append(el('i', 'sm-menu-sep'));
  // Where it sits among the projects: moved by hand, the order becomes «Yours».
  const order = projectsInOrder().all.map((one) => one.id);
  const place = order.indexOf(room.id);
  if (place > 0) item(t('Move before'), BEFORE_ICON, () => moveProject(room.id, -1));
  if (place >= 0 && place < order.length - 1) item(t('Move after'), AFTER_ICON, () => moveProject(room.id, 1));
  if (place > 0) item(t('Move to the start'), BEFORE_ICON, () => moveProject(room.id, 'first'));
  item(t('Add to Home…'), ADD_ICON, () => openHomeAdd());
  menu.append(el('i', 'sm-menu-sep'));
  item(t('Remove from MADRE…'), FORGET_ICON, () => { forgetting.add(room.id); asking.delete(room.id); failed.delete(room.id); draw(); }, { danger: true });
  menu.addEventListener('keydown', (key) => {
    const items = [...menu.querySelectorAll('.sm-menu-item')];
    const at = items.indexOf(document.activeElement);
    if (key.key === 'ArrowDown') { key.preventDefault(); items[(at + 1) % items.length].focus(); }
    if (key.key === 'ArrowUp') { key.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
  });
  document.body.append(menu);
  pins.menu = menu;
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const point = at ?? { x: event.clientX, y: event.clientY };
  menu.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - width - 8, point.x)))}px`;
  menu.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - height - 8, point.y)))}px`;
  menu.style.right = 'auto';
  menu.querySelector('.sm-menu-item')?.focus({ preventScroll: true });
}

// A project's card, dragged to the bar: the bar shows where it would land, following the pointer,
// and it is pinned there when it is let go. A room already on the bar is moved instead.
function pinsDragOut(event, room) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData(PIN_TYPE, room.id);
  event.dataTransfer.setData('text/plain', room.name);
  event.dataTransfer.effectAllowed = 'copyMove';
  pinsCloseMenu();
  pins.dropping = room.id;
  pins.slotAt = null;
  pins.slot = el('span', 'sm-tb-room sm-tb-slot');
  pins.slot.append(el('i'), el('span', null, room.name), el('b', 'sm-tb-mono', monogram(room.name)));
  document.body.classList.add('sm-pin-dragging');
  // The source card stays as it is while it is carried: the lobby is not drawn again under it.
  requestAnimationFrame(() => drawPins());
}
function pinsDropEnd() {
  if (!pins.dropping) return;
  pins.dropping = null;
  pins.slot?.remove();
  pins.slot = null;
  pins.slotAt = null;
  document.body.classList.remove('sm-pin-dragging');
  drawPins();
}
function pinsIndexAt(x) {
  const ids = pinsShown().filter((id) => id !== pins.dropping);
  const index = ids.findIndex((id) => { const box = pins.chips.get(id)?.getBoundingClientRect(); return box && x < box.left + box.width / 2; });
  return index < 0 ? ids.length : index;
}
{
  const box = ui.bar.open;
  pins.layer = el('div', 'bar-badges');
  box.append(pins.layer);
  pins.more = button('sm-tb-room is-more', '', (event) => { event.stopPropagation(); if (pins.moreCard && !pins.moreCard.hidden) pinsCloseMore(); else pinsDrawMore(); });
  pins.more.hidden = true;
  pins.more.setAttribute('aria-haspopup', 'menu');
  box.append(pins.more);
  const bar = box.closest('.sm-topbar');
  // While the bar is arranged a room is carried, not followed; a right-click between the rooms
  // puts the bar back, as a second right-click on a room does.
  box.addEventListener('click', (event) => {
    if (!pins.editing || event.target.closest?.('.bar-badge') || !event.target.closest?.('[data-bar-item]')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  box.addEventListener('contextmenu', (event) => { if (pins.editing && !event.pinHandled) { event.preventDefault(); pinsEdit(false); } });
  // A press anywhere but the bar and its card puts the bar back; Escape too.
  document.addEventListener('pointerdown', (event) => {
    if (pins.menu && !pins.menu.contains(event.target)) pinsCloseMenu();
    if (pins.moreCard && !pins.moreCard.hidden && !pins.moreCard.contains(event.target) && !pins.more.contains(event.target)) pinsCloseMore();
    if (pins.editing && !box.contains(event.target) && !pins.card?.contains(event.target)) pinsEdit(false);
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (pins.menu) { pinsCloseMenu(); return; }
    if (pins.moreCard && !pins.moreCard.hidden) { pinsCloseMore(); return; }
    if (pins.editing) { event.preventDefault(); pinsEdit(false); }
  });
  window.addEventListener('resize', () => { pinsCloseMenu(); if (data) drawPins(); });
  window.addEventListener('scroll', () => pinsCloseMenu(), { passive: true });
  // The drop: anywhere on the bar, at the place nearest the pointer.
  bar.addEventListener('dragover', (event) => {
    if (!pins.dropping || !event.dataTransfer?.types.includes(PIN_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const at = pinsIndexAt(event.clientX);
    if (at !== pins.slotAt) { pins.slotAt = at; bar.classList.add('is-drop'); pinsPlace(pinsShown().filter((id) => id !== pins.dropping)); }
  });
  bar.addEventListener('dragleave', (event) => {
    if (!pins.dropping || bar.contains(event.relatedTarget)) return;
    pins.slotAt = null;
    bar.classList.remove('is-drop');
    pinsPlace(pinsShown().filter((id) => id !== pins.dropping));
  });
  bar.addEventListener('drop', (event) => {
    const id = event.dataTransfer?.getData(PIN_TYPE);
    if (!id) return;
    event.preventDefault();
    const at = pins.slotAt ?? pinsIndexAt(event.clientX);
    bar.classList.remove('is-drop');
    pinsDropEnd();
    pinAdd(id, at);
  });
  // Another tab arranged the bar: this one follows.
  window.addEventListener('storage', (event) => { if (event.key === PIN_KEY) { pins.saved = null; if (data) drawPins(); } });
}

ui.bar.links.addEventListener('click', () => { if ((data?.enlaces ?? []).length) { if (!ui.linksSheet.open) ui.linksSheet.showModal(); } else openLinkSheet(); });
ui.bar.update.addEventListener('click', () => openSettings('release'));
// RELOAD, as a room reloads (app.js, reloadWithGrace): the curtain of Home's own ground with MADRE's
// loader; the page goes with the share it reached and the new one fills the rest (salas-mac.html).
function reloadWithGrace() {
  if (motionStill() || document.querySelector('.reload-curtain')) { location.reload(); return; }
  const curtain = el('div', 'reload-curtain');
  const loader = makeLoader({ progress: 0.04 });
  curtain.append(loader);
  showCurtain(curtain);
  creep(loader, { to: 0.34, rate: 0.09 });
  setTimeout(() => {
    try { sessionStorage.setItem('madre.curtain', loader.dataset.p ?? '0.3'); } catch { /* the new page simply arrives */ }
    location.reload();
  }, 900);
}
ui.bar.reload.addEventListener('click', reloadWithGrace);
// «Add to Home» had only a right-click and a menu; now a key of its own in the bar (2026-10-14).
document.getElementById('sm-add-widgets')?.addEventListener('click', () => openHomeAdd());

// From Home into a project, and back (2026-10-10): the page settles back under a veil of its own
// ground and goes (styles.css, madre-leaving); the room lifts the veil as it arrives. Every way in
// is a link — a card, a key on the bar, a tag, the Coordinator, the map — so a plain press on any
// link to a MADRE page goes through here; ⌘-click, a new tab or a page elsewhere is left alone.
function leaveTo(url) {
  if (motionStill()) { location.href = url; return; }
  root.classList.add('madre-leaving');
  setTimeout(() => { location.href = url; }, 200);
  setTimeout(() => root.classList.remove('madre-leaving'), 2500);
}
window.addEventListener('pageshow', () => root.classList.remove('madre-leaving'));
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href]');
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  let to = null;
  try { to = new URL(link.href, location.href); } catch { return; }
  if (to.protocol !== 'http:' || !/^(127\.0\.0\.1|localhost)$/.test(to.hostname)) return;
  if (to.origin === location.origin && to.pathname === location.pathname) return;
  event.preventDefault();
  leaveTo(to.href);
});

// What just happened, in a line (the room's notice: styles.css, .toast), at the foot of the screen
// and over any open sheet, for a few seconds.
let toastNode = null;
let toastTimer = 0;
function toast(words, tone = 'done') {
  toastNode?.remove();
  const node = el('div', 'toast sm-toast');
  node.setAttribute('role', 'status');
  node.dataset.tone = tone;
  node.append(el('i', 'toast-dot'), el('span', 'toast-text', words));
  document.body.append(node);
  if (typeof node.showPopover === 'function') { node.popover = 'manual'; node.showPopover(); }
  toastNode = node;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.remove(); if (toastNode === node) toastNode = null; }, 5000);
}

// ---- THE LOBBY (2026-10-10). The first screen of MADRE: every project on this Mac, BISHOP above
// them, and the way to add more. A bare `madre` opens here; `madre start` in a folder still opens
// that project directly.

const post = (url, payload) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}) })
  .then(async (response) => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }))
  .catch(() => ({ ok: false, status: 0, body: {} }));
function mark(id, size = 40) {
  const brand = brandOf(id);
  const node = el('span', 'sm-mark');
  node.style.setProperty('--b', brand.solid ?? brand.color);
  node.style.setProperty('--b-ink', brand.ink);
  node.style.width = node.style.height = `${size}px`;
  node.innerHTML = brand.mark(); // trusted: our own SVG strings from brands.js
  return node;
}

// BISHOP, at the head of the lobby: the super agent that reads across the projects, signs links
// between them and carries orders from one to another. It is talked to in its own room (MADRE's
// folder, not a project), here or in a new tab; asleep, it is woken first. What it waits for is
// read from that room. Under it, the last work of every project, summarised by MADRE.
ui.bishop.mark.replaceWith(mark('bishop', 44));
function drawBishop(room) {
  const b = ui.bishop;
  const glance = room?.glance ?? {};
  const state = room?.open ? stateOf(room) : { key: 'asleep', words: t('Asleep') };
  // Only its state: its size is the person's (applyLayout), and a class written whole took it back.
  for (const one of [...b.box.classList]) if (one.startsWith('is-')) b.box.classList.remove(one);
  b.box.classList.add(`is-${state.key}`);
  b.state.querySelector('span').textContent = state.words;
  const waking = busy.get(data?.salas) === 'starting';
  for (const way of [b.go, b.tab]) way.setAttribute('aria-disabled', String(waking));
  b.go.textContent = waking ? t('Waking…') : t('Talk to the Coordinator');
  syncBishopLinks();
  // What it waits for, each one a door into its room.
  b.asks.replaceChildren();
  b.asks.hidden = !glance.waiting?.length;
  if (!b.asks.hidden) {
    b.asks.append(el('span', 'sm-hint', t('Waiting for you')));
    for (const ask of glance.waiting.slice(0, 3)) b.asks.append(button('sm-chip ask', askLine(ask), () => openBishop()));
  }
  b.error.hidden = !failed.has(data?.salas);
  b.error.textContent = failed.get(data?.salas) ?? '';
}
// Both ways into BISHOP's room are links, so ⌘-click and «open in a new tab» do what they always
// do. Asleep, it is woken first; a new tab is then opened at the press, while the press is still
// the person's, and sent on when the room answers: a tab opened after waiting is blocked.
function bishopAddress() {
  const room = data?.rooms.find((one) => one.id === data.salas);
  return room?.open ? addressOf(room) : null;
}
function syncBishopLinks() {
  const address = bishopAddress() ?? '/salas';
  ui.bishop.go.href = address;
  ui.bishop.tab.href = address;
}
function wakeBishop({ newTab = false } = {}) {
  const tab = newTab ? window.open('about:blank', '_blank') : null;
  if (tab) tab.opener = null;
  void startRoom({ id: data.salas }).then((answer) => {
    if (!answer.ok || !answer.body.port) { tab?.close(); return; }
    const address = `http://127.0.0.1:${answer.body.port}/`;
    if (tab) tab.location.href = address;
    else leaveTo(address);
  });
}
function openBishop({ newTab = false } = {}) {
  if (!data) return;
  const address = bishopAddress();
  if (!address) { wakeBishop({ newTab }); return; }
  if (newTab) window.open(address, '_blank', 'noopener');
  else leaveTo(address);
}
for (const [way, alwaysNew] of [[ui.bishop.go, false], [ui.bishop.tab, true]]) {
  way.addEventListener('click', (event) => {
    if (way.getAttribute('aria-disabled') === 'true' || !data) { event.preventDefault(); return; }
    // Awake, the link goes where it points.
    if (bishopAddress()) return;
    event.preventDefault();
    wakeBishop({ newTab: alwaysNew || event.metaKey || event.ctrlKey || event.shiftKey });
  });
}

// ---- Choosing folders (2026-10-10): tiles, a page at a time. Suggestions first (folders that look
// like projects in the places people keep them), or the folders of the home folder, walked one
// level at a time; a search narrows either. Several can be chosen; a folder already in Home says
// so and is not offered again. The sheet never runs past the screen: the tiles take as many rows
// as it holds, and ‹ › turn the page, so nothing scrolls inside it.
const SEARCH_GLYPH = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const PAGE_BACK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PAGE_ON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FOLD_TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.4 6.8 11 12 5.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FOLD_ROWS = 5;

// The tiles and their pages. How many rows is measured, not guessed: from five down to two, the
// most that keep the sheet inside the screen, measured again when the screen changes size. The
// grid keeps the height of its rows whatever the page holds, so turning a page or searching never
// moves the keys under it; a list that does not change (`snug`) takes only the rows it fills.
function foldPages({ snug = false } = {}) {
  const grid = el('div', 'sm-fold-grid');
  const pager = el('div', 'sm-pager');
  const back = button('sm-icon-key sm-page', null, () => turn(-1));
  const on = button('sm-icon-key sm-page', null, () => turn(1));
  back.innerHTML = PAGE_BACK; // trusted: our own SVG strings
  on.innerHTML = PAGE_ON;
  back.setAttribute('aria-label', t('Previous'));
  on.setAttribute('aria-label', t('Next'));
  const where = el('span', 'sm-page-where');
  pager.append(back, where, on);
  let items = [];
  let tile = () => null;
  let none = null;
  let page = 0;
  let rows = 4;
  let cols = 3;
  let seen = '';
  const per = () => rows * cols;
  const paint = () => {
    const pages = Math.max(1, Math.ceil(items.length / per()));
    page = Math.max(0, Math.min(page, pages - 1));
    grid.style.setProperty('--cols', String(cols));
    grid.style.setProperty('--rows', String(snug ? Math.max(1, Math.min(rows, Math.ceil(items.length / cols))) : rows));
    grid.replaceChildren(...items.slice(page * per(), (page + 1) * per()).map((item) => tile(item)));
    if (!items.length && none) grid.append(el('p', 'sm-fold-none', none()));
    pager.hidden = pages < 2;
    where.textContent = t('{n} of {total}', { n: page + 1, total: pages });
    back.disabled = page === 0;
    on.disabled = page >= pages - 1;
  };
  const turn = (step) => {
    page += step;
    paint();
    // The key pressed stays under the finger; at the last page it is the other one.
    if (document.activeElement === document.body || document.activeElement?.disabled) (step > 0 ? back : on).focus({ preventScroll: true });
  };
  const fit = () => {
    const layer = grid.closest('dialog');
    if (!grid.isConnected || !layer?.open || !grid.clientWidth) return;
    const key = `${grid.clientWidth}x${layer.clientHeight}`;
    if (key === seen) return;
    seen = key;
    cols = grid.clientWidth >= 540 ? 3 : grid.clientWidth >= 340 ? 2 : 1;
    rows = FOLD_ROWS;
    paint();
    while (rows > 2 && layer.scrollHeight > layer.clientHeight + 1) { rows -= 1; paint(); }
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => requestAnimationFrame(fit)).observe(grid);
  const resized = () => { if (!grid.isConnected) { window.removeEventListener('resize', resized); return; } seen = ''; requestAnimationFrame(fit); };
  window.addEventListener('resize', resized);
  return {
    grid,
    pager,
    show(list, { draw, empty = null, keepPage = false }) {
      items = list;
      tile = draw;
      none = empty;
      if (!keepPage) page = 0;
      paint();
    },
  };
}

// One folder as a tile: its mark (green when it looks like a project), its name and where it is.
// Chosen, the tile takes the accent and its mark a tick; a folder already in Home is only shown.
function foldTile({ name, path, note = null, project = true, known = false, checked = false, onToggle = null, enter = null }) {
  const item = el('label', `sm-fold${project ? ' is-project' : ''}${known ? ' known' : ''}${checked ? ' is-on' : ''}`);
  item.title = homeWord(path);
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.disabled = known;
  box.addEventListener('change', () => { item.classList.toggle('is-on', box.checked); onToggle?.(box.checked); });
  const glyph = el('span', 'sm-fold-glyph');
  glyph.innerHTML = FOLDER_GLYPH; // trusted: our own SVG strings
  const tick = el('i', 'sm-fold-tick');
  tick.innerHTML = FOLD_TICK;
  glyph.append(tick);
  const words = el('span', 'sm-fold-words');
  words.append(el('b', null, name), el('small', null, note ?? homeWord(path)));
  item.append(box, glyph, words);
  if (enter) {
    const into = button('sm-into', null, (event) => { event.preventDefault(); enter(); });
    into.innerHTML = PAGE_ON;
    into.setAttribute('aria-label', t('Open {name}', { name }));
    into.title = t('Open {name}', { name });
    item.append(into);
  }
  return item;
}

function projectPicker({ onAdded = null, onChange = null, withAdd = true } = {}) {
  const chosen = new Map();     // path → name
  const node = el('div', 'sm-picker');
  const pages = foldPages();
  let source = 'found';         // found · browse
  let found = null;             // the suggestions, once read
  let here = null;              // the folder being walked, as /api/salas/folders answered
  let query = '';
  let touched = false;          // the person chose the list: an empty one is not left on its own
  const head = el('div', 'sm-picker-head');
  let seg = el('span');
  const search = el('label', 'settings-search sm-picker-search');
  search.innerHTML = SEARCH_GLYPH; // trusted: our own SVG string
  const input = el('input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = t('Search a folder…');
  input.setAttribute('aria-label', t('Search a folder…'));
  input.addEventListener('input', () => { query = input.value.trim().toLocaleLowerCase(language); draw(); });
  search.append(input);
  head.append(seg, search);
  const line = el('div', 'sm-picker-line');
  const footer = el('div', 'sm-picker-foot');
  const count = el('span', 'sm-picked');
  const addButton = withAdd ? button('sm-btn primary', t('Add'), () => void add()) : null;
  const error = el('p', 'error');
  footer.append(pages.pager, count);
  if (addButton) footer.append(addButton);
  node.append(head, line, pages.grid, footer, error);
  const sync = () => {
    count.textContent = chosen.size ? (chosen.size === 1 ? t('1 folder chosen') : t('{n} folders chosen', { n: chosen.size })) : t('Choose one or more folders');
    if (addButton) {
      addButton.disabled = !chosen.size;
      addButton.textContent = chosen.size > 1 ? t('Add {n} projects', { n: chosen.size }) : t('Add project');
    }
    onChange?.(chosen.size);
  };
  const matches = (one) => !query || one.name.toLocaleLowerCase(language).includes(query) || homeWord(one.path).toLocaleLowerCase(language).includes(query);
  const tile = (one) => foldTile({
    ...one,
    note: one.known ? t('In Home') : null,
    checked: chosen.has(one.path),
    onToggle: (on) => { if (on) chosen.set(one.path, one.name); else chosen.delete(one.path); sync(); },
  });
  function draw({ keepPage = false } = {}) {
    const fresh = customSeg([['found', t('Found on this Mac')], ['browse', t('Your folders')]], source, (value) => {
      touched = true;
      source = value;
      draw();
      if (value === 'browse' && !here) void walk();
    }, 'two');
    seg.replaceWith(fresh);
    seg = fresh;
    const noMatch = () => t('No folder matches «{query}».', { query: input.value.trim() });
    if (source === 'found') {
      line.replaceChildren(el('span', 'sm-picker-note', found ? t('Folders that look like projects, in the places people keep them.') : t('Looking…')));
      pages.show(found ? found.filter(matches) : [], {
        draw: tile,
        empty: () => (!found ? t('Looking…') : query ? noMatch() : t('Nothing that looks like a project in the usual places. Look for it in Your folders.')),
        keepPage,
      });
      return;
    }
    line.replaceChildren();
    if (here?.parent) {
      const up = button('sm-btn ghost small sm-up', null, () => void walk(here.parent));
      up.innerHTML = PAGE_BACK; // trusted: our own SVG string
      up.append(el('span', null, t('Up')));
      line.append(up);
    }
    line.append(el('span', 'sm-where', here?.path ? homeWord(here.path) : t('Looking…')));
    const list = here?.entries
      ? [...(here.path !== here.home ? [{ name: t('This folder'), path: here.path, project: false }] : []), ...here.entries.map((one) => ({ ...one, enter: () => void walk(one.path) }))]
      : [];
    pages.show(list.filter(matches), {
      draw: tile,
      empty: () => (!here ? t('Looking…') : !here.entries ? (here.error ?? t('That folder is not there.')) : query ? noMatch() : t('No folders inside.')),
      keepPage,
    });
  }
  async function loadFound() {
    const answer = await fetch('/api/salas/suggestions', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({ suggestions: [] }));
    found = answer.suggestions ?? [];
    // Nothing found and nothing chosen yet: the folders of the home folder, where it must be.
    if (!found.length && !touched && source === 'found') { source = 'browse'; if (!here) void walk(); }
    draw({ keepPage: true });
  }
  async function walk(path = null) {
    const answer = await fetch(`/api/salas/folders${path ? `?path=${encodeURIComponent(path)}` : ''}`, { cache: 'no-store' }).then((response) => response.json()).catch(() => null);
    here = answer ?? { error: t('That folder is not there.') };
    if (path !== null) { query = ''; input.value = ''; }
    if (source === 'browse') draw();
  }
  async function add() {
    error.textContent = '';
    if (addButton) addButton.disabled = true;
    const answer = await post('/api/salas/projects', { roots: [...chosen.keys()] });
    if (addButton) addButton.disabled = false;
    if (!answer.ok) { error.textContent = answer.body.refused?.[0]?.error ?? answer.body.error ?? t('They could not be added.'); return false; }
    if (answer.body.refused?.length) error.textContent = answer.body.refused.map((one) => `${homeWord(one.root)}: ${one.error}`).join(' · ');
    chosen.clear();
    sync();
    await refresh();
    const added = answer.body.added ?? [];
    if (added.length) toast(added.length === 1 ? t('{name} was added to Home.', { name: added[0].name }) : t('{n} projects were added to Home.', { n: added.length }));
    onAdded?.(added);
    void loadFound();
    if (here) void walk(here.path === here.home ? null : here.path);
    return true;
  }
  draw();
  void loadFound();
  sync();
  return { node, add, count: () => chosen.size };
}

// The room's close (styles.css, .surface-modes · .x-close): a sunk track holding one key, the
// cross that turns as the pointer comes to it.
function closeKey(onClick) {
  const track = el('span', 'surface-modes');
  const key = button('surface-mode close x-close x-only', null, onClick);
  key.setAttribute('aria-label', t('Close'));
  const icon = el('span', 'x-icon');
  icon.innerHTML = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  key.append(icon);
  track.append(key);
  return track;
}

// «Add a project», on its own: the picker in a sheet, under the welcome's scene of the projects.
let addSheet = null;
function openAddSheet() {
  if (addSheet) return;
  addSheet = el('dialog', 'sm-sheet sm-wide sm-add');
  const inner = el('div', 'sm-sheet-body');
  const head = el('header', 'sm-sheet-head');
  head.append(el('h3', null, t('Add a project')), closeKey(() => addSheet.close()));
  // The welcome's own scene over it: the folders dropping into Home.
  inner.append(head, wizardScene('projects'), el('p', 'hint', t('A project is a folder: MADRE gives it its own conversations and its own memory. Adding it does not open it; you open it from its card.')));
  inner.append(projectPicker({ onAdded: () => addSheet?.close() }).node);
  addSheet.append(inner);
  document.body.append(addSheet);
  addSheet.addEventListener('close', () => { addSheet.remove(); addSheet = null; });
  addSheet.showModal();
}
ui.add.addEventListener('click', openAddSheet);

// The agents of this computer, with everything a connection needs in one place: which account
// each one signs in with, the doors it has, the box where a pasted key goes, the address a
// sign-in opened and the code that page gives back. Home used to show a name, a lamp and one
// button — the project's panel had the rest, so the same errand was two different screens.
// Kept current while it is on screen: polled, and told by the room's events how it is going.
// `compact` is the welcome's first step: there, a connected agent is done, and a button to change
// the account it signs in with is a question nobody asked on their first minute.
// Who makes each agent, said under its name as the project's AJUSTES says it.
const VENDOR_WORDS = { codex: 'OpenAI', claude: 'Anthropic', gemini: 'Google', opencode: 'OpenCode' };

// OpenCode's providers in Home, the same block as the project's AJUSTES › Agents › OpenCode: a line
// per provider with a key or an account and its switch for the chat, one row to add another, and
// the model it answers with by default. Asked of the server once a minute at most, because asking
// runs `opencode models`; a change asks again at once.
const openCodeProviders = (() => {
  let reading = null;
  let at = 0;
  let host = null;
  const fetchNow = async () => {
    reading = await fetch('/api/agents/opencode/providers', { cache: 'no-store' }).then((response) => response.json().then((json) => ({ ok: response.ok, json }))).catch(() => ({ ok: false, json: {} }));
    at = Date.now();
    paintInto();
  };
  const sendKey = (path, payload) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })).catch(() => ({ ok: false, body: {} }));
  const switchFor = (on, change, label) => {
    const wrap = el('label', 'settings-switch');
    const box = el('input'); box.type = 'checkbox'; box.checked = on; box.setAttribute('aria-label', label);
    box.addEventListener('change', () => void change(box.checked, box));
    wrap.append(box, el('i'));
    return wrap;
  };
  function paintInto() {
    if (!host?.isConnected) return;
    host.replaceChildren(el('b', 'sm-oc-title', t('Providers')));
    if (!reading) { host.append(el('small', 'sm-agent-note', t('Reading OpenCode\'s providers…'))); return; }
    if (!reading.ok) { host.append(el('small', 'sm-agent-note', reading.json.error ?? t('OpenCode\'s providers could not be read.'))); return; }
    const providers = reading.json.providers ?? [];
    const hidden = new Set(providers.filter((one) => one.hidden).map((one) => one.id));
    for (const provider of providers.filter((one) => one.via)) {
      const row = el('div', 'sm-oc-row');
      const words = el('span', 'sm-agent-words');
      const status = provider.via === 'own' ? t('Included with OpenCode · {n} models', { n: provider.models.length })
        : provider.via === 'api' ? t('Connected with a key · {n} models', { n: provider.models.length })
          : provider.via === 'oauth' ? t('Connected with its account · {n} models', { n: provider.models.length })
            : t('Connected · {n} models', { n: provider.models.length });
      words.append(el('b', null, provider.label), el('small', 'sm-agent-note', status));
      const controls = el('span', 'sm-oc-controls');
      if (provider.via === 'api') {
        const remove = button('sm-btn ghost small', t('Remove the key'), async () => {
          if (remove.dataset.sure !== '1') { remove.dataset.sure = '1'; remove.textContent = t('Remove it?'); return; }
          remove.disabled = true;
          const answer = await sendKey('/api/agents/opencode/providers/remove', { provider: provider.id });
          if (!answer.ok) { remove.disabled = false; remove.textContent = answer.body.error ?? t('The key was not removed.'); return; }
          void fetchNow();
        });
        controls.append(remove);
      }
      const label = el('span', 'sm-oc-shown', t('In the chat'));
      controls.append(label, switchFor(!provider.hidden, async (on, box) => {
        if (on) hidden.delete(provider.id); else hidden.add(provider.id);
        const answer = await sendKey('/api/settings', { opencode: { hidden: [...hidden] } });
        if (!answer.ok) { box.checked = !on; if (on) hidden.add(provider.id); else hidden.delete(provider.id); }
      }, t('Show {provider} in the chat', { provider: provider.label })));
      row.append(words, controls);
      host.append(row);
    }
    const waiting = providers.filter((one) => !one.via && one.takesKey);
    if (waiting.length) {
      const form = el('form', 'sm-agent-key-form sm-oc-add');
      const which = el('select');
      which.setAttribute('aria-label', t('Provider'));
      for (const provider of waiting) { const option = el('option', null, provider.label); option.value = provider.id; which.append(option); }
      const input = el('input');
      input.type = 'password'; input.autocomplete = 'off'; input.spellcheck = false;
      const link = el('a', 'sm-agent-key-link', t('Where do I get one?'));
      link.target = '_blank'; link.rel = 'noopener';
      const said = el('small', 'sm-agent-line');
      const sync = () => {
        const provider = waiting.find((one) => one.id === which.value);
        input.placeholder = t('{provider} API key', { provider: provider?.label ?? '' });
        link.hidden = !provider?.keyUrl;
        if (provider?.keyUrl) link.href = provider.keyUrl;
      };
      which.addEventListener('change', sync);
      sync();
      const save = el('button', 'sm-btn primary small', t('Add'));
      save.type = 'submit';
      form.append(which, input, save, link, said);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!input.value.trim()) { input.focus(); return; }
        save.disabled = true;
        said.textContent = t('Checking…');
        const answer = await sendKey('/api/agents/opencode/key', { key: input.value.trim(), provider: which.value });
        input.value = '';
        save.disabled = false;
        if (answer.ok) void fetchNow(); else said.textContent = answer.body.error ?? t('The key was not accepted.');
      });
      host.append(el('b', 'sm-oc-title', t('Add a provider')), form);
    }
  }
  return {
    node() {
      // The same node across the panel's repaints, so a key being typed is never thrown away.
      host ??= el('div', 'sm-oc');
      if (!reading || Date.now() - at > 60000) void fetchNow(); else paintInto();
      return host;
    },
  };
})();

function agentsPanel({ onPaint = null, compact = false } = {}) {
  const list = el('div', 'sm-agents');
  const lastLine = new Map();   // agent → what its install or sign-in said last
  const openMore = new Set();   // agents whose connection detail is unfolded
  const toggleMore = (id) => { if (openMore.has(id)) openMore.delete(id); else openMore.add(id); };
  let live = null;              // the sign-in running right now, as the server tells it
  let poll = 0;
  let stream = null;

  // The second half of a browser sign-in: the address stays put, and the code that page hands
  // back is typed here. Without it the sign-in could only wait until its clock killed it.
  const askBlock = (agent) => {
    if (!live || live.agent !== agent.id) return null;
    const box = el('div', 'sm-agent-ask');
    if (live.url) {
      const open = el('a', 'sm-btn primary small', t('Open the sign-in page'));
      open.href = live.url;
      open.target = '_blank';
      open.rel = 'noopener';
      box.append(open);
    }
    // A device sign-in (GitHub Copilot through OpenCode) shows its code instead of asking for one.
    if (live.deviceCode) {
      const said = el('div', 'sm-agent-device');
      said.append(el('span', null, t('Type this code on that page:')), el('code', null, live.deviceCode));
      const copy = button('sm-btn small', t('Copy'), async () => {
        try { await navigator.clipboard.writeText(live?.deviceCode ?? ''); copy.textContent = t('Copied'); } catch { copy.textContent = t('Select it'); }
      });
      said.append(copy);
      box.append(said);
    }
    if (live.asksForCode || live.awaitingCode) {
      const form = el('form', 'sm-agent-code');
      const input = el('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = t('Paste the code the page gave you');
      const send = el('button', 'sm-btn primary small', t('Send the code'));
      send.type = 'submit';
      const said = el('small', 'sm-agent-line');
      form.append(input, send, said);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        send.disabled = true;
        said.textContent = t('Checking…');
        const answer = await post(`/api/agents/${agent.id}/login/code`, { code: input.value });
        if (answer.ok) { input.value = ''; said.textContent = t('Sent. The sign-in finishes on its own.'); }
        else said.textContent = answer.body.error ?? t('The code was not accepted.');
        send.disabled = false;
      });
      box.append(form);
    }
    box.append(button('sm-btn ghost small', t('Cancel the sign-in'), async (event) => { event.currentTarget.disabled = true; await post(`/api/agents/${agent.id}/login/cancel`); void paint(); }));
    return box;
  };

  // Handing a key to a CLI, with the same promise the project's panel makes: it is written where
  // that CLI reads it, MADRE keeps no copy, and the CLI itself says whether it took.
  const keyForm = (agent) => {
    const plan = agent.key;
    const form = el('form', 'sm-agent-key-form');
    let select = null;
    if (plan.providers) {
      select = el('select');
      select.setAttribute('aria-label', t('Provider'));
      for (const provider of plan.providers) { const option = el('option', null, provider.label); option.value = provider.id; select.append(option); }
      form.append(select);
    }
    const input = el('input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = t(plan.label);
    const save = el('button', 'sm-btn primary small', t('Save the key'));
    save.type = 'submit';
    form.append(input, save);
    const said = el('small', 'sm-agent-line');
    const keyUrl = plan.providers ? (plan.providers[0]?.keyUrl ?? null) : plan.keyUrl;
    if (keyUrl) {
      const link = el('a', 'sm-agent-key-link', t('Where do I get one?'));
      link.href = keyUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      form.append(link);
      select?.addEventListener('change', () => { const next = plan.providers.find((one) => one.id === select.value)?.keyUrl; if (next) link.href = next; });
    }
    form.append(said, el('small', 'sm-agent-note', t(plan.note)));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      said.textContent = t('Checking…');
      const answer = await post(`/api/agents/${agent.id}/key`, { key: input.value, provider: select?.value ?? null });
      if (answer.ok) { input.value = ''; openMore.delete(agent.id); void paint(); }
      else { said.textContent = answer.body.error ?? t('The key was not accepted.'); save.disabled = false; }
    });
    return form;
  };

  const paint = async () => {
    const answer = await fetch('/api/settings', { cache: 'no-store' }).then((response) => response.json()).catch(() => null);
    if (!answer?.agents) return;
    agentsSeen = answer;
    drawAttention();
    live = answer.login ?? null;
    let ready = 0;
    for (const agent of answer.agents.filter((one) => one.id !== 'madre')) if (agentState(agent, answer).ok) ready += 1;
    // A field being typed into is never yanked away by the poll: the panel redraws every few
    // seconds, and a half-pasted key or code would go with it.
    if (list.contains(document.activeElement) && ['INPUT', 'SELECT'].includes(document.activeElement.tagName)) { onPaint?.(ready, answer); return; }
    list.replaceChildren();
    for (const agent of answer.agents.filter((one) => one.id !== 'madre')) {
      const state = agentState(agent, answer);
      // The project's AJUSTES design (2026-10-13): one card per agent, folded to a line that says
      // who it is and whether it has a session. One that needs the person opens by itself.
      const unfolded = openMore.has(agent.id) || !state.ok || state.busyNow || (live && live.agent === agent.id);
      const item = el('section', `sm-agent${state.ok ? ' ok' : ''}${unfolded ? ' open' : ''}`);
      item.dataset.agent = agent.id;
      const head = button('sm-agent-head', null, () => { toggleMore(agent.id); if (!openMore.has(agent.id) && !state.ok) openMore.add(agent.id); void paint(); });
      head.setAttribute('aria-expanded', String(unfolded));
      const words = el('span', 'sm-agent-words');
      words.append(el('b', null, agent.label ?? agent.id), el('small', null, VENDOR_WORDS[agent.id] ?? ''));
      const chip = el('span', `sm-agent-chip session-lamp ${state.key}`);
      chip.append(el('span', null, state.words));
      head.append(mark(agent.id, 34), words, chip, el('span', 'sm-chevron'));
      item.append(head);
      const body = el('div', 'sm-agent-body');
      // Which account it is signed in with, as its own CLI reports it, and which one it asks for.
      const facts = el('div', 'sm-agent-facts');
      if (agent.detected && agent.version) facts.append(el('code', 'sm-agent-line', `${agent.version}${agent.path ? ` · ${agent.path}` : ''}`));
      if (agent.detected && answer.sessions?.[agent.id]?.detail) facts.append(el('small', 'sm-agent-line', answer.sessions[agent.id].detail));
      if (agent.account) facts.append(el('small', 'sm-agent-note', agent.account));
      if (lastLine.has(agent.id) && !state.ok) {
        const said = lastLine.get(agent.id);
        const line = el('small', 'sm-agent-line', said.line);
        if (said.url) { const link = el('a', null, t('Open the sign-in page')); link.href = said.url; link.target = '_blank'; link.rel = 'noopener'; line.append(' ', link); }
        facts.append(line);
      }
      if (facts.childNodes.length) body.append(facts);
      // One button per account the CLI can sign in with: Claude has two, and only the human can
      // say which one is paying.
      const doorKeys = () => {
        // With a session, every agent offers the same «sign in again» as Codex. A single door
        // (Gemini's Google account) is that door; two doors (Claude's subscription and Console)
        // are chosen after the click.
        const methods = agent.login?.methods ?? [];
        const choosing = choosingAccount.has(agent.id);
        const doors = !state.ok ? (methods.length ? methods : [{ id: null, label: null, note: agent.login?.note }])
          : methods.length > 1 && choosing ? methods
            : [{ id: methods.length === 1 ? methods[0].id : null, label: null, note: methods.length === 1 ? methods[0].note : agent.login?.note, choose: methods.length > 1 }];
        return doors.map((door) => {
          const name = door.label ? t(door.label) : state.ok ? t('Sign in again') : t('Sign in');
          const key = button(`sm-btn ${state.ok && !choosing ? '' : 'primary'} small`, name, async (event) => {
            if (door.choose) { choosingAccount.add(agent.id); void paint(); return; }
            choosingAccount.delete(agent.id);
            event.currentTarget.disabled = true;
            await post(`/api/agents/${agent.id}/login`, { method: door.id });
            void paint();
          });
          if (door.note) key.title = t(door.note);
          return key;
        });
      };
      const acts = el('div', 'sm-agent-acts');
      if (!state.busyNow) {
        if (!agent.detected && agent.install) acts.append(button('sm-btn primary small', t('Install'), async (event) => { event.currentTarget.disabled = true; await post(`/api/agents/${agent.id}/install`); void paint(); }));
        else if (agent.detected && agent.login?.headless) for (const key of doorKeys()) acts.append(key);
      }
      if (acts.childNodes.length) body.append(acts);
      const ask = askBlock(agent);
      if (ask) body.append(ask);
      // A key, pasted here; OpenCode's are its providers', in the block below.
      if (agent.detected && agent.key && agent.id !== 'opencode') body.append(keyForm(agent));
      // The same install or sign-in typed in a terminal, folded for whoever prefers it. Signed in,
      // OpenCode's providers are added in the block below; its terminal is for a first sign-in.
      const way = !agent.detected ? agent.install && [agent.install.display, ...(agent.install.alternatives ?? []).map((line) => `# ${t(line)}`)]
        : agent.login?.terminal && !(agent.id === 'opencode' && state.ok) ? [agent.login.terminal.command, ...(agent.login.terminal.note ? [`# ${t(agent.login.terminal.note)}`] : [])] : null;
      if (way && !state.busyNow) body.append(terminalWay(way, agent.id));
      if (agent.id === 'opencode' && agent.detected) body.append(openCodeProviders.node());
      item.append(body);
      list.append(item);
    }
    onPaint?.(ready, answer);
  };
  const liveOn = () => {
    if (!list.isConnected || poll) return;
    poll = setInterval(() => { if (!document.hidden) void paint(); }, 2500);
    try {
      stream = new EventSource('/api/events');
      stream.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event.type === 'connection.login.output' || event.type === 'connection.install.output') lastLine.set(event.payload.agent, { line: event.payload.line, url: event.payload.url ?? null });
          if (/^connection\./.test(event.type)) void paint();
        } catch { /* not ours */ }
      };
    } catch { /* no stream: the poll keeps it current */ }
  };
  const stop = () => { clearInterval(poll); poll = 0; stream?.close(); stream = null; };
  return { node: list, paint, live: liveOn, stop };
}

// ---- The first time: three steps. The agents (connected once, for every project: a CLI's session
// is this computer's, not a project's), the projects, and which to open now. Over each step, a
// scene of what it is about, moving: the agents come to MADRE and light up as they are connected;
// the folders drop into the lobby; the rooms light up one after another as the beat runs through
// them. Drawn here, from MADRE's own marks; still for whoever asked for less motion.
const SCENE_AGENTS = [['codex', 17, 30], ['claude', 27, 78], ['gemini', 83, 30], ['opencode', 73, 78]];
const FOLDER_GLYPH = '<svg viewBox="0 0 32 26" aria-hidden="true"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h7.2l3 3.2h12.8A2.5 2.5 0 0 1 30 8.7v12.8a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 21.5z" fill="currentColor"/><path d="M2 10h28" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/></svg>';
const BEAT_PATH = 'M0 22H70L78 22L86 6L96 38L104 22H190L198 22L206 6L216 38L224 22H320L328 22L336 6L346 38L354 22H420';
function wizardScene(kind) {
  const scene = el('div', `sm-scene scene-${kind}`);
  scene.setAttribute('aria-hidden', 'true');
  if (kind === 'agents') {
    const wires = svgNode('svg', { class: 'sm-wires', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
    SCENE_AGENTS.forEach(([id, x, y], index) => {
      wires.append(svgNode('line', { class: 'sm-wire', 'data-agent': id, x1: 50, y1: 54, x2: x, y2: y, 'vector-effect': 'non-scaling-stroke' }));
      const node = el('span', 'sm-scene-node agent');
      node.dataset.agent = id;
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.setProperty('--d', `${index * 160}ms`);
      node.append(mark(id, 42));
      scene.append(node);
    });
    const core = el('span', 'sm-scene-node core');
    core.style.left = '50%';
    core.style.top = '54%';
    core.append(mark('madre', 60));
    scene.prepend(wires);
    scene.append(core);
  } else if (kind === 'projects') {
    // Each folder lives in its own slot of the tray and drops into it, one after another.
    const tray = el('div', 'sm-tray');
    for (let index = 0; index < 5; index += 1) {
      const slot = el('i', 'sm-slot');
      slot.style.setProperty('--i', String(index));
      const folder = el('span', 'sm-fly');
      folder.innerHTML = FOLDER_GLYPH; // trusted: drawn here
      slot.append(folder);
      tray.append(slot);
    }
    scene.append(tray);
  } else {
    const rooms = el('div', 'sm-wins');
    for (let index = 0; index < 3; index += 1) {
      const win = el('span', 'sm-win');
      win.style.setProperty('--i', String(index));
      win.append(el('i', 'sm-win-bar'), el('i', 'sm-win-line'), el('i', 'sm-win-line short'));
      rooms.append(win);
    }
    const beat = svgNode('svg', { class: 'sm-beat', viewBox: '0 0 420 44', preserveAspectRatio: 'none' });
    beat.append(svgNode('path', { d: BEAT_PATH, pathLength: 100, 'vector-effect': 'non-scaling-stroke' }));
    scene.append(beat, rooms);
  }
  return scene;
}
let wizard = null;
let wizardThen = null;          // what comes once the wizard closes: the chapters, after a bonjour
function openWizard({ then = null } = {}) {
  if (wizard) return;
  wizardThen = then;
  wizard = el('dialog', 'sm-sheet sm-wide sm-wizard');
  const inner = el('div', 'sm-sheet-body');
  wizard.append(inner);
  document.body.append(wizard);
  let step = 0;
  let panel = null;
  let scene = null;
  const steps = [t('Agents'), t('Projects'), t('Open')];
  const KINDS_OF_STEP = ['agents', 'projects', 'open'];
  const stop = () => { panel?.stop(); panel = null; };
  const frame = (title, note, body, actions, { back = false } = {}) => {
    stop();
    inner.replaceChildren();
    const head = el('header', 'sm-sheet-head');
    const dots = el('ol', 'sm-steps');
    steps.forEach((name, index) => { const item = el('li', index === step ? 'on' : index < step ? 'done' : null, name); dots.append(item); });
    head.append(dots, closeKey(() => wizard.close()));
    scene = wizardScene(KINDS_OF_STEP[step]);
    const page = el('div', `sm-step${back ? ' back' : ''}`);
    page.append(el('h3', null, title));
    if (note) page.append(el('p', 'hint', note));
    page.append(body, actions);
    inner.append(head, scene, page);
  };
  async function agentsStep(options) {
    const actions = el('div', 'actions');
    const next = button('sm-btn primary', t('Continue'), () => { step = 1; projectsStep(); });
    actions.append(next);
    const fresh = agentsPanel({
      compact: true,
      onPaint: (ready, answer) => {
        next.textContent = ready ? t('Continue') : t('Continue without agents');
        // The scene lights the agents that are connected, and their wire to MADRE.
        for (const agent of answer.agents) {
          const on = agentState(agent, answer).ok;
          scene?.querySelector(`.sm-scene-node[data-agent="${agent.id}"]`)?.classList.toggle('on', on);
          scene?.querySelector(`.sm-wire[data-agent="${agent.id}"]`)?.classList.toggle('on', on);
        }
      },
    });
    frame(t('Connect your agents'), t('Agents are the AI tools that write code, such as Claude Code or Codex. MADRE works with the ones already on this computer: each one is connected once, and every project uses it.'), fresh.node, actions, options);
    panel = fresh;
    await fresh.paint();
    fresh.live();
  }
  function projectsStep(options) {
    // What is chosen here is added on the way to the next step: one key, not two.
    const actions = el('div', 'actions');
    const next = button('sm-btn primary', t('Continue'), async () => {
      if (picker.count()) {
        next.disabled = true;
        const added = await picker.add();
        next.disabled = false;
        if (!added) return;
      }
      step = 2;
      openStep();
    });
    const picker = projectPicker({ withAdd: false, onChange: (n) => { next.textContent = n ? t('Add and continue') : t('Continue'); } });
    actions.append(button('sm-btn', t('Back'), () => { step = 0; void agentsStep({ back: true }); }), next);
    frame(t('Add your projects'), t('A project is a folder you work in. Choose yours: adding them does not open them; in the next step you pick which to open.'), picker.node, actions, options);
  }
  function openStep() {
    const projects = (data?.rooms ?? []).filter((room) => room.id !== data?.salas);
    const chosen = new Set();
    const pages = foldPages({ snug: true });
    const list = el('div', 'sm-picker');
    const foot = el('div', 'sm-picker-foot');
    foot.append(pages.pager);
    list.append(pages.grid, foot);
    pages.show(projects, {
      draw: (room) => foldTile({
        name: room.name,
        path: room.root ?? '',
        note: room.open ? t('Already open') : null,
        checked: Boolean(room.open) || chosen.has(room.id),
        known: Boolean(room.open),
        onToggle: (on) => { if (on) chosen.add(room.id); else chosen.delete(room.id); },
      }),
      empty: () => t('No projects yet. You can add them from Home whenever you like.'),
    });
    const actions = el('div', 'actions');
    const go = button('sm-btn primary', t('Done'), async () => {
      go.disabled = true;
      for (const id of chosen) {
        go.textContent = t('Opening {name}…', { name: projects.find((room) => room.id === id)?.name ?? id });
        await startRoom({ id });
      }
      wizard.close();
    });
    actions.append(button('sm-btn', t('Back'), () => { step = 1; projectsStep({ back: true }); }), go);
    frame(t('Open what you will use'), t('Each open project runs on this Mac on its own. The rest stay in Home, asleep, until you open them.'), list, actions);
  }
  wizard.addEventListener('close', () => { stop(); wizard.remove(); wizard = null; void loadAgents(); const after = wizardThen; wizardThen = null; after?.(); });
  wizard.showModal();
  void agentsStep();
}

// ---- AJUSTES, as the room's (app.js, SETTINGS_SECTIONS and its sheets; 2026-10-10): a board of
// three sections, a card per category that already says how it stands and holds the one switch
// people reach for, the category in a sheet over the board, and one search for any setting. The
// window is the room's own (styles.css: #settings, .settings-*, .sx-*), not a likeness of it. The
// lobby sets what is the lobby's — how it looks, what its bar holds, the agents of this Mac,
// BISHOP's ways in, the projects and the version; a room's turns, memory or permissions are set
// in that room. Nothing scrolls inside the window: the screen behind it does.
const SET_SECTIONS = [
  ['You', 'How Home looks and what its bar holds', ['look', 'bar']],
  ['The agents', 'Who works on this Mac', ['agents', 'bishop', 'local']],
  ['System', 'The projects of this Mac and the version', ['projects', 'release']],
];
// The room's own icons where the room has the category (app.js, SETTINGS_CATS); the bar, BISHOP
// and the projects drawn here in the same hand: 20×20, one round stroke.
const SET_CATS = {
  look: { name: 'Appearance', icon: '<circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/>' },
  bar: { name: 'Top bar', icon: '<rect x="2.6" y="5.4" width="14.8" height="9.2" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 10h2.2M11.6 10h2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  agents: { name: 'Agents', icon: '<circle cx="7" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="13.6" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.8 16c.6-2.3 2.2-3.6 4.2-3.6s3.6 1.3 4.2 3.6M9.6 13c.9-.4 2.4-.6 4-.6 2 0 3.6 1.3 4.2 3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
  bishop: { name: 'Coordinator', icon: '<path d="M2.6 10c1.7-3.1 4.3-4.8 7.4-4.8s5.7 1.7 7.4 4.8c-1.7 3.1-4.3 4.8-7.4 4.8S4.3 13.1 2.6 10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.3" fill="currentColor"/>' },
  local: { name: 'Local AI', icon: '<rect x="5" y="5" width="10" height="10" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 2.6v2.4M12 2.6v2.4M8 15v2.4M12 15v2.4M2.6 8h2.4M2.6 12h2.4M15 8h2.4M15 12h2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="10" r="1.8" fill="currentColor"/>' },
  projects: { name: 'Projects', icon: '<path d="M3.5 6.2c0-.9.7-1.6 1.6-1.6h3l1.6 1.8h5.2c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
  release: { name: 'Version', icon: '<path d="M15.6 10a5.6 5.6 0 1 1-1.64-3.96" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15.7 3.6v3.2h-3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
};
const SET_ORDER = ['look', 'bar', 'agents', 'bishop', 'local', 'projects', 'release'];
// The words the search knows, each pointing to the category that holds it (app.js, SETTINGS_INDEX).
const SET_INDEX = [
  ['look', 'Preview'], ['look', 'Theme'], ['look', 'Accent'], ['look', 'Wallpaper'], ['look', 'Intensity'], ['look', 'Blur'], ['look', 'Project cards'], ['look', 'Text'], ['look', 'Project order'], ['look', 'Language'],
  ['bar', 'Arrange the bar'], ['bar', 'Back to default'],
  ['bishop', 'Talk to the Coordinator'], ['bishop', 'Open the Coordinator in a new tab'],
  ['local', 'Ollama'], ['local', 'Automatic'], ['local', 'One by one'], ['local', 'Manual'],
  ['projects', 'Add a project'], ['projects', 'See the welcome again'], ['projects', 'The tour of MADRE 1.0'],
  ['release', 'Check now'],
];
const THEME_WORDS = { auto: () => t('Automatic'), light: () => t('Light'), dark: () => t('Dark') };
const catName = (id) => t(SET_CATS[id].name);
const setIcon = (id) => { const span = el('span', 'settings-icon'); span.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${SET_CATS[id].icon}</svg>`; span.style.setProperty('--cat', 'var(--phosphor)'); return span; }; // trusted: our own SVG strings
const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 6.2 8 10l3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const chevron = (className) => { const mark = el('span', `${className} chev-icon`); mark.innerHTML = CHEVRON; return mark; }; // trusted: our own SVG string
const fold = (text) => String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const bishopRoom = () => data?.rooms.find((room) => room.id === data.salas) ?? null;

// The pieces every sheet is built from, the room's (app.js, sxBlock, sxRow, sxButton): a block is a
// card with a title and a line about it, then its rows; a row says what it is on the left and
// holds its control on the right.
function sxBlock(host, title, about = null, { aside = null, className = '' } = {}) {
  const block = el('section', `sx-block${className ? ` ${className}` : ''}`);
  const head = el('header', 'sx-head');
  const words = el('div', 'sx-words');
  words.append(el('h3', null, title));
  if (about) words.append(el('p', null, about));
  head.append(words);
  if (aside) head.append(aside);
  block.rows = el('div', 'sx-rows');
  block.append(head, block.rows);
  host.append(block);
  return block;
}
function sxRow(block, label, hint, control = null, { stack = false } = {}) {
  const row = el('div', `sx-row${stack ? ' stack' : ''}`);
  const words = el('div', 'sx-words');
  words.append(el('b', null, label));
  if (hint) words.append(el('span', 'sx-hint', hint));
  row.append(words);
  if (control) { const box = el('div', 'sx-control'); box.append(control); row.append(box); }
  block.rows.append(row);
  return row;
}
const sxButton = (words, click, { tone = null } = {}) => button(`sx-btn${tone ? ` ${tone}` : ''}`, words, click);
// A choice of a few, on the rail PERSONALIZE uses (app.js, drawCustom, segmented).
function customSeg(options, current, pick, size = '') {
  const seg = el('div', `custom-seg${size ? ` ${size}` : ''}`);
  seg.setAttribute('role', 'radiogroup');
  for (const [value, words] of options) {
    const option = button('seg-option', words, () => { if (value !== current) pick(value); });
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(value === current));
    seg.append(option);
  }
  return seg;
}

// How each category stands, in a line, from what the lobby already knows; nothing is guessed.
function setStatus(id) {
  const looks = readLooks();
  if (id === 'look') return { line: `${THEME_WORDS[looks.theme]()} · ${WALLPAPER_WORDS[looks.wallpaper]()} · ${ACCENT_WORDS[looks.accent]()}` };
  if (id === 'bar') {
    if (!pinsStored()) return { line: t('The open projects, as they open') };
    const count = pinsShown().length;
    return { line: count ? t('{n} projects pinned', { n: count }) : t('Nothing pinned') };
  }
  if (id === 'agents') {
    if (!agentsSeen) return { line: t('Reading…') };
    const here = agentsSeen.agents.filter((agent) => agent.id !== 'madre' && agent.detected);
    const off = here.filter((agent) => !agentState(agent, agentsSeen).ok);
    return { line: t('{n} of {total} signed in', { n: here.length - off.length, total: here.length }), warn: off.length ? t('{agents} without a session', { agents: off.map((agent) => agent.label ?? agent.id).join(', ') }) : null };
  }
  if (id === 'bishop') { const room = bishopRoom(); return { line: room ? stateOf(room).words : t('Reading…') }; }
  if (id === 'local') {
    if (!localSeen) return { line: localFailed ? t('Home did not answer.') : t('Reading…') };
    const on = localSeen.projects.filter((one) => one.on).length;
    return { line: `${LOCAL_MODE_WORDS[localSeen.mode]()} · ${t('{n} of {total} projects', { n: on, total: localSeen.projects.length })}`, warn: !localSeen.master ? t('Local AI is off for every project.') : !localSeen.ollama.running ? t('Ollama is not running') : null };
  }
  if (id === 'projects') {
    if (!data) return { line: t('Reading…') };
    const { all, open } = projectsInOrder();
    return { line: t('{n} projects · {open} open', { n: all.length, open: open.length }) };
  }
  if (id === 'release') {
    if (!versionSeen) return { line: t('Reading…') };
    return { line: `MADRE ${versionSeen.current} · ${versionSeen.available ? t('{version} available', { version: versionSeen.latest }) : versionSeen.enabled === false ? t('not checked') : t('up to date')}`, warn: versionSeen.available ? t('{version} is out', { version: versionSeen.latest }) : null };
  }
  return { line: '' };
}

// The one thing people reach for, on the card itself: changing it opens nothing.
function setQuick(id) {
  const rows = el('div', 'settings-quick');
  const add = (label, control) => { const row = el('div', 'settings-quick-row'); row.append(el('span', null, label), control); rows.append(row); };
  if (id === 'look') {
    const { theme } = readLooks();
    const seg = el('div', 'settings-seg');
    for (const [value, word] of [['auto', t('Auto')], ['light', t('Light')], ['dark', t('Dark')]]) {
      seg.append(button(value === theme ? 'on' : null, word, (event) => { event.stopPropagation(); saveLooks({ theme: value }); }));
    }
    add(t('Theme'), seg);
  }
  if (id === 'bar') add(t('Arrange the bar'), sxButton(t('Arrange'), (event) => { event.stopPropagation(); settingsSheet?.close(); pinsEdit(true); }));
  if (id === 'agents' && agentsSeen) {
    for (const agent of agentsSeen.agents.filter((one) => one.id !== 'madre' && one.detected)) {
      const state = agentState(agent, agentsSeen);
      const row = el('div', 'settings-quick-row agent');
      const who = el('span', 'who', agent.label ?? agent.id);
      who.style.setProperty('--agent', brandOf(agent.id).color);
      row.append(who, el('span', `state session-lamp ${state.ok ? 'on ok' : state.key === 'bad' ? 'off bad' : 'wait'}`, state.ok ? t('signed in') : state.key === 'bad' ? t('no session') : t('unknown')));
      rows.append(row);
    }
  }
  return rows.children.length ? rows : null;
}

// What MADRE looks like with these choices: the room's preview, built as the room builds it
// (app.js, drawCustom), wearing the choices, so the bubbles and the text — which the lobby has no
// conversation to show — are seen before they are lived with.
// The preview is Home itself, small (2026-10-11): its bar with the projects on it, the
// Coordinator, and two of your projects as cards, on the wallpaper, theme and accent chosen, with
// the cards, the text and the order Home's own choices give them. It wears the room's preview
// (styles.css, .look-preview) for the ground, so the wallpaper reads exactly as it will.
function lookPreview(looks) {
  const preview = el('div', 'look-preview sm-home-preview');
  preview.setAttribute('aria-hidden', 'true');
  Object.assign(preview.dataset, { accent: looks.accent, wallpaper: looks.wallpaper, wpStyle: looks.style, homeCards: looks.home.cards, homeText: looks.home.text });
  preview.style.setProperty('--veil-k', String(looks.veil / 100));
  preview.style.setProperty('--wp-blur', `${looks.blur}px`);
  preview.dataset.scheme = root.dataset.scheme ?? 'dark';
  const shown = (data ? projectsInOrder().all : []).slice(0, 2);
  const names = shown.length ? shown.map((room) => room.name) : ['pulse', 'tienda'];
  const bar = el('div', 'hp-bar');
  bar.append(el('i', 'hp-logo'), el('b', null, t('Home')));
  for (const name of names) { const pin = el('span', 'hp-pin'); pin.append(el('i'), name); bar.append(pin); }
  const grid = el('div', 'hp-grid');
  const coord = el('div', 'hp-tile hp-coord');
  const head = el('div', 'hp-head');
  head.append(el('span', 'hp-mark'), el('b', null, t('Coordinator')));
  coord.append(head, el('small', null, t('Calm')), el('span', 'hp-key', t('Talk to the Coordinator')));
  grid.append(coord);
  names.forEach((name, index) => {
    const card = el('div', 'hp-tile hp-card');
    const state = el('small', 'hp-state');
    state.append(el('i'), index ? t('Asleep') : t('Calm'));
    card.append(el('b', null, name), state, el('span', 'hp-chat'), el('span', 'hp-strip'), el('span', `hp-key${index ? '' : ' on'}`, t('Open')));
    grid.append(card);
  });
  preview.append(bar, grid);
  return preview;
}

// The sheets. Appearance is the room's own sheet of PERSONALIZE inside AJUSTES (app.js,
// drawCustom with customWindow.instant): the preview first, then the colours, the wallpaper, the
// conversation and the language, each applied as it is touched.
function fillLook(host) {
  host.classList.add('settings-look');
  const looks = readLooks();
  // Where the choices are kept, and the way back to MADRE as it comes, on one line above it all.
  const top = el('div', 'sm-look-top');
  top.append(el('p', 'sx-intro', t('Kept in this browser. Theme, accent and wallpaper also dress the project served at this address.')));
  host.append(top);
  // Two columns when the window is wide (it opens over the whole window): the preview, with how
  // the conversation reads and the language under it; the colours and the wallpaper beside it. So
  // the whole of Appearance is seen at once.
  const frame = el('div', 'sx-look sm-look');
  const side = el('div', 'sm-look-side');
  const preview = lookPreview(looks);
  sxBlock(side, t('Preview'), t('Your choices, on Home itself.'), { className: 'sx-preview' }).rows.append(preview);
  const page = el('div', 'sx-look-controls');
  frame.append(side, page);

  const named = el('span', 'custom-current', ACCENT_WORDS[looks.accent]());
  const colour = sxBlock(page, t('Colour'), null, { aside: named });
  sxRow(colour, t('Theme'), t('Automatic follows your system.'), customSeg(['auto', 'light', 'dark'].map((value) => [value, THEME_WORDS[value]()]), looks.theme, (value) => saveLooks({ theme: value }), 'three'));
  const swatches = el('div', 'custom-swatches');
  swatches.setAttribute('role', 'radiogroup');
  for (const id of ACCENTS) {
    const swatch = button('swatch', null, () => saveLooks({ accent: id }));
    swatch.dataset.swatch = id;
    swatch.setAttribute('role', 'radio');
    swatch.setAttribute('aria-checked', String(id === looks.accent));
    swatch.setAttribute('aria-label', ACCENT_WORDS[id]());
    // The colour's name sits beside COLOUR: the one picked, or the one under the pointer.
    const say = () => { named.textContent = ACCENT_WORDS[id](); named.classList.toggle('peek', id !== looks.accent); };
    const back = () => { named.textContent = ACCENT_WORDS[looks.accent](); named.classList.remove('peek'); };
    swatch.addEventListener('pointerenter', say);
    swatch.addEventListener('focus', say);
    swatch.addEventListener('pointerleave', back);
    swatch.addEventListener('blur', back);
    swatches.append(swatch);
  }
  sxRow(colour, t('Accent'), t('Each colour in dark (top) and in light (bottom). The permission modes keep their own.'), swatches, { stack: true });

  const photo = looks.wallpaper !== 'default';
  const papers = el('div', 'custom-papers');
  papers.setAttribute('role', 'radiogroup');
  for (const value of WALLPAPERS) {
    // The person's own picture: chosen like any other once it is here; until then, the way to add it.
    if (value === CUSTOM_WALL) {
      const mine = customWall();
      const paper = mine ? button('paper', null, () => saveLooks({ wallpaper: CUSTOM_WALL })) : button('paper', null, () => void addPicture({ busy: paper, chosen: () => saveLooks({ wallpaper: CUSTOM_WALL }), failed: (message) => toast(message, 'look') }));
      if (mine) { paper.setAttribute('role', 'radio'); paper.setAttribute('aria-checked', String(looks.wallpaper === CUSTOM_WALL)); }
      customTile(paper, mine);
      papers.append(paper);
      continue;
    }
    const paper = button('paper', null, () => saveLooks({ wallpaper: value }));
    paper.dataset.wp = value;
    paper.setAttribute('role', 'radio');
    paper.setAttribute('aria-checked', String(value === looks.wallpaper));
    paper.append(el('span', 'paper-swatch'), el('span', 'paper-name', WALLPAPER_WORDS[value]()));
    papers.append(paper);
  }
  const paperBox = el('div', 'paper-box');
  paperBox.append(papers);
  if (photo) {
    // A photograph: layer or mesh, how strong, how blurred. The dials move the lobby and the
    // preview while they are dragged, and are kept when they are let go.
    const tune = el('div', 'paper-tune');
    tune.append(customSeg([['veil', t('Layer')], ['mesh', t('Mesh')]], looks.style, (value) => saveLooks({ style: value }), 'two'));
    const dial = (name, label) => {
      const spec = TUNES[name];
      const line = el('label', 'tune-row');
      const value = el('span', 'tune-value', spec.shown(looks[name]));
      const input = el('input', 'tune-range');
      input.type = 'range';
      input.min = String(spec.min); input.max = String(spec.max); input.step = String(spec.step);
      input.value = String(looks[name]);
      const fill = (v) => input.style.setProperty('--fill', `${((v - spec.min) / (spec.max - spec.min)) * 100}%`);
      fill(looks[name]);
      input.addEventListener('input', () => {
        const v = Number(input.value);
        spec.apply(v);
        if (name === 'veil') preview.style.setProperty('--veil-k', String(v / 100)); else preview.style.setProperty('--wp-blur', `${v}px`);
        value.textContent = spec.shown(v);
        fill(v);
      });
      input.addEventListener('change', () => saveTune(name, Number(input.value)));
      line.append(el('span', 'tune-name', label), input, value);
      return line;
    };
    tune.append(dial('veil', t('Intensity')), dial('blur', t('Blur')));
    // Your picture: where the screen falls on it, and changing it or taking it away.
    if (looks.wallpaper === CUSTOM_WALL && customWall()) {
      tune.append(customTools(customWall(), {
        button: (words, click) => sxButton(words, click),
        changed: (kept, { reframed }) => { if (!reframed) settingsSheet?.paintLooks(); },
        removed: () => saveLooks({ wallpaper: 'default' }),
        failed: (message) => toast(message, 'look'),
      }));
    }
    paperBox.append(tune);
  }
  sxBlock(page, t('Wallpaper'), photo
    ? t('The project\'s background can be a photograph, shown as a layer or as a mesh of its colors: choose how strong it looks and how much the photograph blurs.')
    : t('Behind Home, and behind the conversation of the project served at this address. Light and dark each have their own.')).rows.append(paperBox);

  // Home's own: its cards, its text, the order of its projects. The conversation's bubbles and text
  // are each project's, in its own Settings.
  const home = sxBlock(side, t('Home'), t('Only for Home: each project keeps its conversation as you set it there.'));
  const homeSeg = (name) => customSeg(HOME_LOOKS[name].values.map((value) => [value, HOME_LOOKS[name].words[value]()]), looks.home[name], (value) => saveHome(name, value), ['', '', 'two', 'three', 'four'][HOME_LOOKS[name].values.length] ?? 'three');
  sxRow(home, t('Project cards'), null, homeSeg('cards'), { stack: true });
  sxRow(home, t('Text'), null, homeSeg('text'), { stack: true });
  sxRow(home, t('Project order'), null, homeSeg('order'), { stack: true });

  const words = sxBlock(side, t('Language'));
  sxRow(words, t('Interface'), t('The page reloads in it when you choose to.'), customSeg([['es', 'Español'], ['en', 'English']], language, async (code) => {
    try { localStorage.setItem('pulse.language', code); } catch { /* no storage */ }
    await post('/api/language', { language: code });
    reloadWithGrace();
  }, 'two'));

  const homeDefault = Object.entries(HOME_LOOKS).every(([name, spec]) => looks.home[name] === spec.values[0]);
  const atDefault = looks.accent === 'madre' && looks.wallpaper === 'default' && looks.style === 'veil' && looks.veil === TUNES.veil.value && looks.blur === TUNES.blur.value && homeDefault;
  if (!atDefault) {
    top.append(sxButton(t('Back to default'), () => {
      for (const name of ['veil', 'blur']) saveTune(name, TUNES[name].value);
      for (const [name, spec] of Object.entries(HOME_LOOKS)) { try { localStorage.removeItem(spec.key); } catch { /* this page only */ } }
      saveLooks({ accent: 'madre', wallpaper: 'default', style: 'veil' });
      draw();
    }));
  }
  host.append(frame);
}
function fillBar(host) {
  const block = sxBlock(host, t('Top bar'), t('The projects you keep at hand, in the order you choose. A project comes to the bar from its card: right-click it, or drag it to the bar.'));
  const ids = pinsShown();
  if (!ids.length) sxRow(block, t('Nothing pinned'), null);
  for (const id of ids) {
    const room = data.rooms.find((one) => one.id === id);
    sxRow(block, room.name, stateOf(room).words, sxButton(t('Remove'), () => pinRemove(id)));
  }
  const acts = el('div', 'sx-actions end');
  if (pinsStored()) acts.append(sxButton(t('Back to default'), () => pinsReset()));
  acts.append(sxButton(t('Arrange the bar'), () => { settingsSheet?.close(); pinsEdit(true); }, { tone: 'primary' }));
  host.append(acts);
}
function fillAgents(host, keep) {
  // The project's AJUSTES › Agents, here too: a sentence, then a card per agent.
  host.append(el('p', 'sx-intro', t('MADRE works with the AI tools already on this computer. Each one is connected once, and every project uses it.')));
  const panel = agentsPanel({ onPaint: () => settingsSheet?.sync() });
  panel.node.classList.add('cards');
  host.append(panel.node);
  keep(panel.stop);
  void panel.paint().then(() => panel.live());
}
function fillBishop(host) {
  const room = bishopRoom();
  const block = sxBlock(host, t('Coordinator'), t('Its agent and its mode are chosen in its own project.'));
  sxRow(block, t('Talk to the Coordinator'), room ? stateOf(room).words : null, sxButton(t('Open'), () => { settingsSheet?.close(); openBishop(); }, { tone: 'primary' }));
  sxRow(block, t('Open the Coordinator in a new tab'), null, sxButton(t('Open'), () => openBishop({ newTab: true })));
}
// LOCAL AI (src/local-ai.mjs): whether every project uses Ollama, the ones picked here, or each
// one as it decides in its own Settings. The switch of each project is the same one its Settings
// show; Ollama itself and what it does are set in a project's Modules › Local AI.
const LOCAL_MODE_WORDS = { auto: () => t('Automatic'), pick: () => t('One by one'), manual: () => t('Manual') };
const LOCAL_MODE_SAYS = {
  auto: () => t('Every project uses it, new ones too.'),
  pick: () => t('Only the projects you switch on below. New projects start without it.'),
  manual: () => t('Each project decides in its own Modules › Local AI. New ones start with it.'),
};
let localFailed = false;        // the last read got no answer: the sheet says so instead of «Reading…» forever
let localHardware = null;       // what this computer can run and train (src/modules/local-models.mjs)
async function loadLocal() {
  const answer = await fetch('/api/salas/local-ai', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  const ollama = await fetch('/api/ollama', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (ollama?.recommended?.hardware) localHardware = ollama.recommended.hardware;
  if (answer) localSeen = answer;
  localFailed = !answer;
  settingsSheet?.sync({ detail: true });
  return answer;
}
async function saveLocal(patch) {
  const answer = await post('/api/salas/local-ai', patch);
  if (!answer.ok) { toast(answer.body?.error ?? t('Home did not answer.')); return; }
  localSeen = answer.body;
  if (localSeen.later?.length) toast(t('{names} will use it when restarted: it was started before this setting existed.', { names: localSeen.later.join(', ') }));
  settingsSheet?.sync({ detail: true });
}
// The rail every settings sheet uses (app.js, sxSeg; styles.css, .sx-seg): the mark moves when chosen.
function sxSeg(options, current, pick, { label = null } = {}) {
  const seg = el('div', 'sx-seg');
  seg.setAttribute('role', 'radiogroup');
  if (label) seg.setAttribute('aria-label', label);
  for (const [value, words] of options) {
    const option = button(null, words, () => {
      if (value === current || seg.classList.contains('busy')) return;
      for (const other of seg.children) other.setAttribute('aria-checked', String(other === option));
      seg.classList.add('busy');
      void Promise.resolve(pick(value)).finally(() => seg.classList.remove('busy'));
    });
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(value === current));
    seg.append(option);
  }
  return seg;
}
const localModeSeg = () => sxSeg(Object.keys(LOCAL_MODE_WORDS).map((mode) => [mode, LOCAL_MODE_WORDS[mode]()]), localSeen?.mode, (mode) => saveLocal({ mode }), { label: t('Mode') });
// The projects in pages of eight, two to a row where they fit: the sheet never needs a scroll.
const LOCAL_PER_PAGE = 8;
let localPage = 0;
function fillLocal(host) {
  if (!localSeen && localFailed) {
    // A Home started before this setting existed has no answer for it: reloading the page reaches the one running now.
    const block = sxBlock(host, t('Home did not answer.'), t('The project serving this page was started before this setting existed. Restart it, or open Home from another project.'));
    sxRow(block, t('Try again'), null, sxButton(t('Reload'), () => location.reload(), { tone: 'primary' }));
    return;
  }
  if (!localSeen) { host.append(el('p', 'settings-reading', t('Reading…'))); return; }
  host.append(el('p', 'sx-intro', t('Ollama runs local AI: it searches and sums up each project\'s memory and answers as @madre, free and private. Choose which projects use it.')));
  const mode = sxBlock(host, t('Which projects'), LOCAL_MODE_SAYS[localSeen.mode]());
  sxRow(mode, t('Mode'), null, localModeSeg());
  if (!localSeen.master) sxRow(mode, t('Local AI is off for every project.'), t('Turn it on in a project, in Modules › Local AI.'));
  else if (!localSeen.ollama.running) sxRow(mode, t('Ollama is not running'), t('Projects keep working with their agents meanwhile. Start it from a project, in Modules › Local AI.'));
  // What this computer can run and train, as a project shows it in Modules › Local AI.
  if (localHardware) drawHardware(host, localHardware, { el, sxBlock, sxRow, sxChip: (text, tone = '') => el('span', `sx-chip${tone ? ` ${tone}` : ''}`, text) });
  const list = sxBlock(host, t('Projects'), localSeen.mode === 'auto' ? t('All of them use it. Choose «One by one» or «Manual» to turn some off.') : t('A switch here is the same one the project shows in its Settings.'));
  if (!localSeen.projects.length) { sxRow(list, t('No projects yet'), null); return; }
  const pages = Math.ceil(localSeen.projects.length / LOCAL_PER_PAGE);
  localPage = Math.max(0, Math.min(localPage, pages - 1));
  const grid = el('div', 'sm-local-grid');
  for (const one of localSeen.projects.slice(localPage * LOCAL_PER_PAGE, (localPage + 1) * LOCAL_PER_PAGE)) {
    const item = el('label', `sm-local-item${one.on ? '' : ' off'}`);
    const words = el('span', 'sm-local-words');
    words.append(el('b', null, one.name), el('small', null, one.open ? (one.on ? t('Open · using it') : t('Open · without it')) : t('Closed · applies when it opens')));
    const wrap = el('span', 'settings-switch');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = Boolean(one.chosen);
    box.disabled = !one.editable || !localSeen.master;
    box.setAttribute('aria-label', one.name);
    box.addEventListener('change', () => { box.disabled = true; void saveLocal({ rooms: { [one.id]: box.checked } }); });
    wrap.append(box, el('i'));
    item.append(words, wrap);
    grid.append(item);
  }
  // The last page keeps the height of a full one, so ‹ › stay under the pointer.
  if (pages > 1) for (let gap = grid.children.length; gap < LOCAL_PER_PAGE; gap += 1) grid.append(el('span', 'sm-local-item sm-local-gap'));
  list.rows.append(grid);
  if (pages > 1) {
    const foot = el('div', 'sm-local-foot');
    const pager = el('div', 'sm-pager');
    const turn = (step) => { localPage += step; settingsSheet?.sync({ detail: true }); };
    const back = button('sm-icon-key sm-page', null, () => turn(-1));
    const on = button('sm-icon-key sm-page', null, () => turn(1));
    back.innerHTML = PAGE_BACK; // trusted: our own SVG strings
    on.innerHTML = PAGE_ON;
    back.setAttribute('aria-label', t('Previous'));
    on.setAttribute('aria-label', t('Next'));
    back.disabled = localPage === 0;
    on.disabled = localPage >= pages - 1;
    pager.append(back, el('span', 'sm-page-where', t('{n} of {total}', { n: localPage + 1, total: pages })), on);
    foot.append(pager, el('small', null, t('{n} projects', { n: localSeen.projects.length })));
    list.rows.append(foot);
  }
}
function fillProjects(host) {
  const block = sxBlock(host, t('Projects'), t('A project is a folder: MADRE gives it its own conversations and its own memory. Adding it does not open it; you open it from its card.'));
  sxRow(block, t('Add a project'), null, sxButton(t('Add'), () => { settingsSheet?.close(); openAddSheet(); }, { tone: 'primary' }));
  sxRow(block, t('See the welcome again'), null, sxButton(t('Open'), () => { settingsSheet?.close(); welcomed = true; openWizard(); }));
  const back = homeTour.path() === 'back';
  sxRow(block, back ? t('The tour of MADRE 1.0') : t('Getting to know MADRE'), back ? t('Everything new, chapter by chapter. ? opens the gestures anywhere.') : t('The essentials, chapter by chapter. ? opens the gestures anywhere.'), sxButton(t('See the tour'), () => { settingsSheet?.close(); homeTour.openChapters(); }));
}
function fillRelease(host) {
  const info = versionSeen;
  const block = sxBlock(host, t('Version'), info ? t('You run {version}. Home restarts with it from here.', { version: info.current }) : null);
  const check = info?.enabled ? sxButton(t('Check now'), async () => {
    check.disabled = true;
    const answer = await fetch('/api/version?force=1', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (answer) versionSeen = answer;
    drawAttention();
    drawTopbar();
    settingsSheet?.sync({ detail: true });
  }) : null;
  sxRow(block, `MADRE ${info?.current ?? ''}`.trim(), info ? (info.available ? t('{version} available', { version: info.latest }) : info.enabled === false ? t('not checked') : t('up to date')) : t('Reading…'), check);
  if (info?.available) {
    const notes = el('a', 'sx-btn', t('What it brings'));
    notes.href = info.release ?? 'https://madre.run';
    notes.target = '_blank';
    notes.rel = 'noopener';
    sxRow(block, `MADRE ${info.latest}`, t('MADRE {version} is out.', { version: info.latest }), notes);
    // Home restarts with it, as a project does (app.js, drawRelease): the whole page waits on the
    // curtain with MADRE's loader through the version arriving, Home closed, and Home back.
    if (info.install !== 'source') {
      const fresh = sxBlock(host, t('Restart Home with {version}', { version: info.latest }), t('Home closes, installs it and comes back on this same address in a few seconds. The open projects keep their version until you restart them.'));
      const said = el('p', 'sx-hint');
      const restart = sxButton(t('Restart with {version}', { version: info.latest }), () => void updateHome(info, restart, said), { tone: 'primary' });
      sxRow(fresh, t('Restart here'), null, restart);
      fresh.rows.append(said);
    } else {
      sxRow(block, t('Pull the repository and start it again.'), null);
    }
  }
  // Home already runs the newer one: the projects still on the older one, each with its restart.
  const behind = behindRooms();
  if (behind.length) {
    const late = sxBlock(host, t('Projects on an older MADRE'), t('They keep running the version they started with until you restart them. What is running in them stops.'), { aside: behind.length > 1 ? sxButton(t('Restart all'), () => void restartAll(), { tone: 'primary' }) : null });
    for (const room of behind) sxRow(late, roomLabel(room), `MADRE ${room.open.version}`, sxButton(t('Restart'), () => { settingsSheet?.close(); void restartRoom(room); }));
  }
  drawLegal(host);
}
async function updateHome(info, key, said) {
  key.disabled = true;
  said.textContent = '';
  const curtain = el('div', 'reload-curtain');
  const loader = makeLoader({ progress: 0.04, label: t('Downloading MADRE {version}…', { version: info.latest }) });
  curtain.append(loader);
  showCurtain(curtain);
  const drop = (words) => { stop(); curtain.classList.add('leaving'); setTimeout(() => curtain.remove(), 760); key.disabled = false; said.textContent = words; };
  let stop = creep(loader, { to: 0.45, rate: 0.02 });
  const answer = await post('/api/updates/apply');
  if (!answer.ok) { drop(answer.body.error ?? t('The update did not start.')); return; }
  stop();
  setLoader(loader, 0.5, t('Restarting MADRE…'));
  stop = creep(loader, { to: 0.88, rate: 0.015, every: 400 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const next = await fetch('/api/version', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (next?.current && next.current !== info.current) {
      stop();
      setLoader(loader, 0.94, t('MADRE {version} is ready', { version: next.current }));
      try { sessionStorage.setItem('madre.curtain', loader.dataset.p ?? '0.94'); } catch { /* it simply arrives */ }
      setTimeout(() => location.reload(), 420);
      return;
    }
  }
  drop(t('Home did not come back on its own. Start MADRE again from your terminal.'));
}
const SET_FILL = { look: fillLook, bar: fillBar, agents: fillAgents, bishop: fillBishop, local: fillLocal, projects: fillProjects, release: fillRelease };

let settingsSheet = null;
function openSettings(section = null) {
  void loadLocal();
  if (settingsSheet) { settingsSheet.show(section); return; }
  const state = { open: null, query: '', stops: [] };
  const dialog = el('dialog', 'sm-sheet sm-settings');
  dialog.setAttribute('aria-label', t('Home settings'));
  // The room's window, by its own name, so it wears exactly what the room's wears.
  const win = el('div', 'sm-sheet-body sm-settings-window');
  win.id = 'settings';
  const head = el('header', 'custom-head settings-head');
  const search = el('label', 'settings-search');
  search.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'; // trusted: our own SVG
  const input = el('input');
  input.type = 'search';
  input.placeholder = t('Search any setting');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', t('Search any setting'));
  search.append(input);
  head.append(el('span', 'custom-title', t('SETTINGS')), search, closeKey(() => dialog.close()));
  const body = el('div', 'sm-settings-body');
  win.append(head, body);
  dialog.append(win);
  document.body.append(dialog);

  const stop = () => { for (const one of state.stops.splice(0)) one(); };
  const card = (id) => {
    const status = setStatus(id);
    const node = el('div', `settings-card${state.open === id ? ' open' : ''}`);
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.dataset.cat = id;
    const top = el('div', 'settings-card-head');
    top.append(setIcon(id), el('b', null, catName(id)), chevron('settings-go'));
    node.append(top, el('p', 'settings-line', status.line));
    if (status.warn) node.append(el('p', 'settings-warn', status.warn));
    const quick = setQuick(id);
    if (quick) node.append(quick);
    node.addEventListener('click', () => openCategory(id));
    node.addEventListener('keydown', (event) => { if (event.target === node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openCategory(id); } });
    return node;
  };
  const board = () => {
    const node = el('div', 'settings-board');
    for (const [name, sub, ids] of SET_SECTIONS) {
      const section = el('section', 'settings-section');
      const top = el('header');
      top.append(el('b', null, t(name)), el('span', null, t(sub)));
      const cards = el('div', 'settings-cards');
      for (const id of ids) cards.append(card(id));
      section.append(top, cards);
      node.append(section);
    }
    return node;
  };
  const detail = (id) => {
    const node = el('div', 'settings-detail');
    const top = el('div', 'settings-detail-head');
    const title = el('div', 'settings-detail-title');
    const back = el('button', 'settings-back');
    back.type = 'button';
    back.title = t('Back to settings');
    back.setAttribute('aria-label', t('Back to settings'));
    back.append(chevron('settings-back-icon'));
    back.addEventListener('click', () => closeCategory());
    title.append(back, setIcon(id), el('b', null, catName(id)));
    top.append(title, el('p', 'settings-line', setStatus(id).line));
    const host = el('div', 'settings-host');
    node.append(top, host);
    SET_FILL[id](host, (one) => state.stops.push(one));
    return node;
  };
  const results = () => {
    const wanted = fold(state.query.trim());
    const list = el('div', 'settings-results');
    const hits = [];
    for (const id of SET_ORDER) if (fold(catName(id)).includes(wanted)) hits.push([id, null]);
    for (const [id, key] of SET_INDEX) if (fold(t(key)).includes(wanted)) hits.push([id, t(key)]);
    for (const agent of agentsSeen?.agents ?? []) if (agent.id !== 'madre' && fold(agent.label ?? agent.id).includes(wanted)) hits.push(['agents', agent.label ?? agent.id]);
    if (!hits.length) { list.append(el('p', 'settings-reading', t('Nothing called «{query}».', { query: state.query.trim() }))); return list; }
    for (const [id, said] of hits.slice(0, 40)) {
      const row = el('button', 'settings-result');
      row.type = 'button';
      row.append(setIcon(id), el('b', null, said ?? catName(id)), el('span', null, catName(id)));
      row.addEventListener('click', () => { state.query = ''; input.value = ''; openCategory(id, said); });
      list.append(row);
    }
    return list;
  };
  const draw = () => {
    stop();
    if (state.query.trim()) { body.replaceChildren(results()); return; }
    if (!state.open) { body.replaceChildren(board()); return; }
    // Appearance has more to show than a sheet holds: it takes the whole window, as a category
    // does in the room when a sheet would be cramped (app.js, «push»). The others open over the board.
    const full = state.open === 'look';
    const sheet = el('div', `settings-sheet${full ? ' full' : ''}`);
    const scroll = el('div', 'settings-scroll');
    scroll.append(detail(state.open));
    sheet.append(scroll);
    if (full) { body.replaceChildren(sheet); return; }
    const scrim = el('div', 'settings-scrim');
    scrim.addEventListener('click', () => closeCategory());
    body.replaceChildren(board(), scrim, sheet);
  };
  const openCategory = (id, landOn = null) => {
    state.open = id;
    draw();
    dialog.scrollTop = 0;
    if (!landOn) { body.querySelector('.settings-back')?.focus({ preventScroll: true }); return; }
    // Land on the setting the search found, once its sheet has drawn.
    let tries = 0;
    const land = () => {
      const hit = [...body.querySelectorAll('.settings-detail :is(.sx-row b, .sx-head h3, .tune-name, button)')].find((node) => fold(node.textContent).includes(fold(landOn)));
      if (hit) { hit.scrollIntoView({ block: 'center', behavior: 'smooth' }); const row = hit.closest('.sx-row, .tune-row, .sx-block') ?? hit; row.classList.add('settings-found'); setTimeout(() => row.classList.remove('settings-found'), 1600); return; }
      if ((tries += 1) < 20) setTimeout(land, 150);
    };
    setTimeout(land, 60);
  };
  const closeCategory = () => {
    const was = state.open;
    state.open = null;
    draw();
    body.querySelector(`.settings-card[data-cat="${was}"]`)?.focus({ preventScroll: true });
  };
  input.addEventListener('input', () => { state.query = input.value; draw(); });
  // Escape steps back the way the person came: out of the search, out of the sheet, then away.
  dialog.addEventListener('cancel', (event) => {
    if (state.query) { event.preventDefault(); state.query = ''; input.value = ''; draw(); return; }
    if (state.open) { event.preventDefault(); closeCategory(); }
  });
  // What the lobby learns while the window is open (an agent signs in, a version is found, a
  // project opens) reaches the cards and the sheet's line; a card that says the same is left alone,
  // so nothing under the pointer or the keyboard is drawn again for nothing.
  const sync = ({ detail: again = false } = {}) => {
    if (state.query.trim()) return;
    for (const old of body.querySelectorAll('.settings-card')) {
      const fresh = card(old.dataset.cat);
      if (fresh.outerHTML !== old.outerHTML) old.replaceWith(fresh);
    }
    const line = body.querySelector('.settings-detail-head .settings-line');
    if (line && state.open) line.textContent = setStatus(state.open).line;
    // The sheet stays where it is (it slid in once); only what is inside it is drawn again.
    const scroll = body.querySelector('.settings-scroll');
    if (again && state.open && scroll) { stop(); scroll.replaceChildren(detail(state.open)); }
  };
  // A look changed (here, in a room's PERSONALIZE at this address, or in another tab): the cards
  // say so, and Appearance is drawn again with it.
  const paintLooks = () => { sync({ detail: state.open === 'look' }); };
  const show = (wanted) => {
    if (!dialog.open) dialog.showModal();
    if (wanted && SET_FILL[wanted]) openCategory(wanted); else draw();
  };
  const close = () => dialog.close();
  settingsSheet = { show, paintLooks, sync, close };
  dialog.addEventListener('close', () => { stop(); dialog.remove(); settingsSheet = null; });
  show(section);
}
ui.gear.addEventListener('click', () => openSettings());
// Turning MADRE off (public/power.js), last in the bar, after the settings.
const powerButton = powerKey('sm-icon-key bar');
powerButton.id = 'sm-power';
ui.gear.after(powerButton);

function translateStatic() {
  document.title = `MADRE · ${t('Home')}`;
  ui.title.textContent = t('Home');
  ui.add.textContent = t('Add a project');
  ui.bar.crumb.textContent = t('Home');
  ui.bar.open.setAttribute('aria-label', t('Projects on the bar'));
  ui.bar.agents.setAttribute('aria-label', t('Agents'));
  ui.bar.links.querySelector('span').textContent = t('Connections');
  ui.bar.reload.title = t('Reload the page');
  ui.bar.reload.setAttribute('aria-label', t('Reload the page'));
  const addKey = document.getElementById('sm-add-widgets');
  addKey?.setAttribute('title', t('Add widgets to Home'));
  addKey?.setAttribute('aria-label', t('Add widgets to Home'));
  ui.stop.querySelector('span').textContent = t('Stop all');
  ui.macro.querySelector('span').textContent = t('Project map');
  ui.gear.title = t('Home settings');
  ui.gear.setAttribute('aria-label', t('Home settings'));
  labelPowerKey(powerButton);
  ui.search.placeholder = t('Search a project…');
  ui.search.setAttribute('aria-label', t('Search a project…'));
  ui.filter.setAttribute('aria-label', t('Show'));
  $('sm-drawer-title').textContent = t('Projects');
  const FILTER_WORDS = { all: t('All projects'), open: t('Open projects'), asleep: t('Asleep projects') };
  for (const choice of ui.filter.querySelectorAll('[data-filter]')) choice.textContent = FILTER_WORDS[choice.dataset.filter];
  paintOrderKey();
  $('sm-bishop-name').textContent = t('Coordinator');
  ui.bishop.go.textContent = t('Talk to the Coordinator');
  ui.bishop.tab.title = t('Open the Coordinator in a new tab');
  ui.bishop.tab.setAttribute('aria-label', t('Open the Coordinator in a new tab'));
  ui.bishop.about.textContent = t('Your Coordinator. It reads across your projects, signs the connections between them and carries an order from one to another.');
  ui.work.title.textContent = t('Recent summary');
  ui.work.again.textContent = t('Summarize again');
  ui.waiting.title.textContent = t('Waiting on you');
  ui.linksTileTitle.textContent = t('Connections');
  ui.link.textContent = t('Connect projects');
  ui.linksAll.textContent = t('See the connections');
  ui.linksTitle.textContent = t('Connections');
  ui.linksClose.setAttribute('aria-label', t('Close'));
  ui.linkMore.textContent = t('Connect projects');
  ui.memory.title.textContent = t('Memory');
  ui.decisions.title.textContent = t('Recent decisions');
  ui.attention.title.textContent = t('Needs you');
  for (const kind of KINDS) KIND_WORDS[kind] = t(kind.toUpperCase());
}

translateStatic();
drawWork();
drawDecisions();
// The arrangement kept for every port, before the first full drawing, and again whenever Home
// comes back into view (another page may have changed it).
const homeArranged = async () => {
  if (!(await pullHomeLayout())) return;
  layout = readLayout();
  pins.saved = null;
  applyLooks();
  applyLayout();
  if (data) { draw(); drawTopbar(); }
  paintOrderKey();
  settingsSheet?.paintLooks();
};
await homeArranged();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void homeArranged(); });
await refresh();
// Arriving from RELOAD (salas-mac.html put the curtain back): Home has read its projects, so the
// bar fills and the curtain clears.
{
  const curtain = document.getElementById('reload-curtain');
  if (curtain) {
    void finishLoader(curtain.querySelector('.madre-loader')).then(() => {
      curtain.classList.add('leaving');
      setTimeout(() => curtain.remove(), 760);
    });
  }
}
void loadAgents();
void loadVersion();
void loadWork();
void loadDecisions();
// `#welcome`: the first-run wizard again, on purpose (to connect an agent or add projects in steps).
if (location.hash === '#welcome') { history.replaceState(null, '', location.pathname); welcomed = true; openWizard(); }
// Sent here for the Macroverso (the key in BISHOP's room): straight into it, on a large screen.
if (location.hash === '#macroverso' && data && !ui.macro.hidden) { history.replaceState(null, '', location.pathname); ui.macro.click(); }
timer = setInterval(() => { if (!document.hidden && !busy.size && !pins.dropping && !pins.drag) void refresh(); }, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { void refresh(); void loadAgents(); void loadWork(); void loadDecisions(); } });
// The decisions are asked again every few minutes (the route itself asks the rooms no oftener).
setInterval(() => { if (!document.hidden) void loadDecisions(); }, 5 * 60 * 1000);

// Asking for a star or a review (review-ask.js), when Home is quiet: nothing waking or closing,
// the bar not being arranged.
startReviewAsk({ busy: () => busy.size > 0 || pins.editing || Boolean(pins.drag) || Boolean(pins.dropping) });
