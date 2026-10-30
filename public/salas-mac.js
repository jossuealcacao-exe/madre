// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// SALAS on the Mac: every room this Mac knows, open or asleep, in one place (docs/MACROVERSO.md,
// phase 1). The room that serves this page answers for all of them (src/salas.mjs): it lists
// them, opens one that is asleep, asks one to close, and stops every agent in every room. A room
// opens at its own address; holding ⌘ opens it beside this one.
//
// The phone has its own SALAS (salas.js), served by the bridge; the two read the same rooms.

import { browserLanguage, sessionDetail, setLanguage, t } from './i18n.js';
import { brandOf, monogram } from './brands.js';
import { SPONSORS_URL, startReviewAsk } from './review-ask.js';
import { startTour } from './tour.js';
import { dropStickyHover } from './touch.js';
import { AUTHOR, AUTHOR_URL, YEAR, drawAttribution, drawColophonKeys, drawLegal } from './attribution.js';

// Where nothing can hover (a tablet), a tapped key does not stay lit (public/touch.js).
dropStickyHover();
import { creep, finishLoader, makeLoader, openingPlayed, playOpening, setLoader, showCurtain } from './loader.js';
import { POWER_ICON, askUninstall, labelPowerKey, openPowerMenu, powerKey } from './power.js';
import { drawHardware } from './hardware.js';
import { CUSTOM_WALL, addPicture, customTile, customTools, customWall, paintCustomWall, rememberedWall } from './wallpaper.js';
import { mapKeys, neuralChosen, rememberNeural } from './neural.js';
import { openMarket } from './market-view.js';
import { openWelcome, welcomeOpen, WELCOME_STEPS } from './welcome.js';
import { remedyKey } from './remedy.js';
import { loadMarket } from './market.js';
import { trazo, trazoDrawing } from './icons.js';
import { tellFailures } from './page-errors.js';
import { mountActivity } from './activity.js';
import { ensureTerms } from './terms.js';

// Nothing of MADRE starts before its license and privacy notice are accepted on this computer
// (public/terms.js, src/terms.mjs): the page waits here.
await ensureTerms();
// A failure of Home's page is told to MADRE's anonymous diagnostics (src/telemetry.mjs).
tellFailures('home');

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
let welcomed = false;          // the welcome was offered this visit (public/welcome.js)
let welcomeSeen = null;         // where the welcome is (src/tour.mjs, `welcome`), as last saved
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
const ACCENTS = ['madre', 'mountain', 'caribbean', 'phantom', 'malbec', 'dijon', 'pacific', 'love', 'sierra', 'pitahaya', 'papaya', 'agave', 'dinamo', 'marina', 'pulso', 'leal', 'dulce', 'marmol', 'durazno', 'pistache', 'petalo', 'negro', 'fortaleza'];
const ACCENT_WORDS = { madre: () => t('Madre green'), mountain: () => t('Mountain green'), caribbean: () => t('Caribbean blue'), phantom: () => t('Phantom purple'), malbec: () => t('Malbec red'), dijon: () => t('Dijon yellow'), pacific: () => t('Pacific blue'), love: () => t('Love pink'), sierra: () => t('Sierra blue'), pitahaya: () => 'Pitahaya', papaya: () => 'Papaya', agave: () => 'Agave', dinamo: () => t('Dynamo black'), marina: () => t('Marina blue'), pulso: () => t('Pulse green'), leal: () => t('Loyal orange'), dulce: () => t('Sweet yellow'), marmol: () => t('Marble gray'), durazno: () => t('Peach orange'), pistache: () => t('Pistachio green'), petalo: () => t('Petal pink'), negro: () => t('Black'), fortaleza: () => t('Fortress blue') };
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
const LOOK_KEYS = ['pulse.theme', 'pulse.accent', 'pulse.wallpaper', 'pulse.wallpaper.style', 'pulse.wallpaper.veil', 'pulse.wallpaper.blur', 'pulse.bubbles', 'pulse.text', 'pulse.neural', ...Object.values(HOME_LOOKS).map((one) => one.key)];
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
const SHARED_LOOKS = ['pulse.theme', 'pulse.accent', 'pulse.wallpaper.style', 'pulse.wallpaper.veil', 'pulse.wallpaper.blur', 'pulse.bubbles', 'pulse.text', 'pulse.neural'];
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
// A word the catalogue keeps in capitals, said in sentence case: «Decisión», «Centrar».
const asLabel = (text) => { const word = String(text).toLowerCase(); return word.charAt(0).toUpperCase() + word.slice(1); };
const kindWord = (kind) => asLabel(KIND_WORDS[kind] ?? kind);

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
  // Still on the MADRE it was opened with, after Home updated (QA 1.1.0, ACT-05): its card said
  // «Active» and a press took the person into the old version without a word.
  if (room.open?.version && data?.version && !room.here && olderVersion(room.open.version, data.version)) return { key: 'outdated', words: t('On MADRE {version} · restart it to bring it to {latest}', { version: room.open.version, latest: data.version }) };
  if (glance.unreachable) return { key: 'quiet', words: t('Not answering right now') };
  if (glance.delayed) return { key: 'quiet', words: t('Responding slowly · last known state') };
  if (glance.waitingCount) return { key: 'waiting', words: t('Waiting for you · {n}', { n: glance.waitingCount }) };
  if (glance.working?.length) return { key: 'working', words: glance.working.length === 1 ? t('@{agent} is working', { agent: glance.working[0] }) : t('{n} agents working', { n: glance.working.length }) };
  return { key: 'calm', words: t('Active') };
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
  // An empty Home opens the welcome where it was left, or at the project when it was finished
  // without one; someone new meets it in place of the bonjour (public/tour.js).
  // Not for whoever updated from before 1.1.0: they meet the news, and «Add project» is on Home (2026-10-30).
  if (!all.length && !welcomed) { welcomed = true; void homeTour.loaded.then((answer) => { if (!answer?.owed && !answer?.upgraded) openHomeWelcome({ at: answer?.state?.welcome?.finished ? 'project' : null }); }); }
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
const SORT_ICON = trazo('sort');
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
  if (!total) { ui.waiting.body.append(el('p', 'sm-hint', t('All caught up. When an agent asks you something, it shows up here.'))); return; }
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
  ui.memory.total.textContent = memoriesCount(sum.memories);
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
// REMINDERS (src/modules/reminders.mjs · an idea by Daniel Castillo): the due ones of every
// project, first in «Needs you», each with its project and the keys to settle it.
let remindersSeen = null;
let reminderPrefs = { hour: 9, snooze: 60 };   // Reminders' settings: how long «later» is
const reminderLocale = () => (document.documentElement.lang === 'en' ? 'en-US' : 'es-MX');
const reminderWhen = (due) => new Intl.DateTimeFormat(reminderLocale(), { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(due));
async function loadReminders({ opening = false } = {}) {
  const answer = await fetch('/api/reminders', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!answer) return;
  remindersSeen = answer.reminders ?? [];
  if (answer.prefs) reminderPrefs = answer.prefs;
  const due = remindersSeen.filter((one) => Date.parse(one.due) <= Date.now());
  // Said when MADRE opens, once: the reminders themselves stay in «Needs you» until settled.
  if (opening && due.length) toast(due.length === 1 ? t('A reminder is due: {what}', { what: due[0].text }) : t('{n} reminders are due. They are in «Needs you».', { n: due.length }), 'done');
  drawAttention();
}
async function settleReminder(path, payload) {
  const answer = await post(path, payload);
  if (!answer.ok) toast(answer.body?.error ?? t('The reminder did not change.'), 'error');
  await loadReminders();
}
function attentionItems() {
  const items = [];
  for (const one of (remindersSeen ?? []).filter((item) => Date.parse(item.due) <= Date.now())) {
    const room = data?.rooms.find((item) => item.id === one.room) ?? null;
    // Due is waiting for the person, said as when it fell due (ACT-09): a green dot and «jueves 8:41
    // p.m.» read as a thing done, not as one waiting.
    items.push({
      tone: 'wait', words: one.text,
      hint: [room ? roomLabel(room) : one.project, t('Reminder · due {when}', { when: ago(one.due) })].filter(Boolean).join(' · '),
      act: () => void settleReminder('/api/reminders/done', { id: one.id }), go: one.repeat ? t('Done for today') : t('Done'),
      later: { go: reminderPrefs.snooze === 60 ? t('In an hour') : reminderPrefs.snooze > 60 ? t('In {n} hours', { n: Math.round(reminderPrefs.snooze / 60) }) : t('In {n} minutes', { n: reminderPrefs.snooze }), act: () => void settleReminder('/api/reminders/snooze', { id: one.id, minutes: reminderPrefs.snooze }) },
    });
  }
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
  // The welcome left halfway: where it stopped, and the way back to it.
  if (welcomeSeen?.at && !welcomeSeen.finished) {
    const n = WELCOME_STEPS.indexOf(welcomeSeen.at) + 1;
    items.unshift({ tone: 'wait', words: t('MADRE is not ready yet.'), hint: t('The welcome stopped at step {n} of {total}.', { n, total: WELCOME_STEPS.length }), act: () => void openHomeWelcome(), go: t('Continue') });
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
  // Said like «Waiting for you» (1.0.5): one big number, calm at 0, in the accent when something needs a hand.
  ui.attention.count.textContent = String(items.length);
  ui.attention.count.hidden = false;
  ui.attention.count.closest('.sm-tile')?.classList.toggle('has', items.length > 0);
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
    } else if (item.later) {
      // Two keys in one row (a reminder: done, or in an hour).
      const acts = el('span', 'sm-attention-acts');
      acts.append(button('sm-btn small', item.go, item.act), button('sm-btn small quiet', item.later.go, item.later.act));
      row.append(acts);
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
  // Whatever it says, the Coordinator's tile is measured again once it is said (fitTile).
  queueMicrotask(() => { if (typeof fitTiles === 'function' && layout) fitTiles(); });
  const state = work?.state ?? 'loading';
  w.box.classList.toggle('is-working', state === 'working');
  w.again.hidden = !work || state === 'empty' || state === 'unavailable' || state === 'plain';
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
    : state === 'plain' ? t('The AI on this computer is small to summarise them well: these are your latest conversations, as they are.')
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
// A connection, said so it is understood at a glance (2026-10-28): who looks up whom, drawn as on the
// project map — the one that reads, an arrow, the one that shares —; what crosses, until when and
// whether orders go, as tags; what was read lately; and each thing it allows as a switch with one
// line on what it does. «Cancel the connection» asks once more before it does.
const LINK_MARK = (id) => {
  const face = el('span', `sm-link-end${id === data.salas ? ' hub' : ''}`);
  if (id === data.salas) face.append(mark('bishop', 30)); else { face.style.setProperty('--pc', toneOf(id)); face.append(el('i', null, roomName(id).slice(0, 1).toUpperCase())); }
  const words = el('span', 'sm-link-end-words');
  words.append(el('b', null, roomName(id)));
  const box = el('span', 'sm-link-end-box');
  box.append(face, words);
  return box;
};
const LINK_ARROW = '<svg viewBox="0 0 60 16" aria-hidden="true"><path d="M58 8H6M12 2.5 6 8l6 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LINK_BOTH = '<svg viewBox="0 0 60 16" aria-hidden="true"><path d="M6 8h48M12 2.5 6 8l6 5.5M48 2.5 54 8l-6 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function linkRow(enlace) {
  const { source, reader } = endsOf(enlace);
  const node = el('article', `sm-link${revoking.has(enlace.id) ? ' revoking' : ''}`);
  node.dataset.link = enlace.id;
  node.append(el('span', 'sm-link-kind', source === data.salas || reader === data.salas ? t('With the Coordinator') : t('Between projects')));
  // Who looks up whom, as the map draws it.
  const pair = el('div', 'sm-link-pair');
  const arrow = el('span', 'sm-link-arrow');
  arrow.innerHTML = enlace.direction === 'both' ? LINK_BOTH : LINK_ARROW; // trusted: our own SVG strings
  arrow.append(el('small', null, enlace.direction === 'both' ? t('read each other') : t('looks up')));
  pair.append(LINK_MARK(reader), arrow, LINK_MARK(source));
  // The drawing says it; the sentence is kept for whoever hears the page.
  const who = el('span');
  who.append(enlace.direction === 'both' ? sayTinted('{a} and {b} read each other', { a: enlace.rooms.a, b: enlace.rooms.b }) : sayTinted('{reader} reads from {source}', { reader, source }));
  pair.setAttribute('role', 'img');
  pair.setAttribute('aria-label', who.textContent);
  node.append(pair);
  // What crosses, until when, and whether orders go.
  const tags = el('div', 'sm-link-tags');
  for (const kind of enlace.kinds ?? []) {
    const word = String(KIND_WORDS[kind] ?? kind).toLocaleLowerCase(language);
    const tag = el('span', 'sm-link-tag');
    tag.append(el('i', `k-${kind}`), word.slice(0, 1).toLocaleUpperCase(language) + word.slice(1));
    tags.append(tag);
  }
  tags.append(el('span', 'sm-link-tag plain', enlace.expires ? t('until {date}', { date: new Date(enlace.expires).toLocaleDateString(language, { day: 'numeric', month: 'short' }) }) : t('no expiry')));
  tags.append(el('span', 'sm-link-tag plain', enlace.orders?.allowed ? t('orders up to #{n}', { n: enlace.orders.maxMode }) : t('no orders')));
  // D-S13: a link BISHOP signed on its own says so, so it is never mistaken for one you signed.
  if (enlace.signed?.by === 'bishop') tags.append(el('span', 'sm-link-tag plain', t('signed by the Coordinator')));
  node.append(tags);
  const traffic = enlace.traffic ?? {};
  // S-021: the last reading says who read, as the room that asked said it.
  const last = traffic.lastAt ? (traffic.lastAgent ? t('last by @{agent} of {room}, {when}', { agent: traffic.lastAgent, room: roomName(traffic.lastRoom), when: ago(traffic.lastAt) }) : t('last {when}', { when: ago(traffic.lastAt) })) : t('none yet');
  node.append(el('p', 'traffic', [t('{n} reads in 24 h', { n: traffic.reads24h ?? 0 }), last].join(' · ')));
  // What else it allows, each a switch that says what it does (Fase 3e, D-S15, D-S16, D-S17).
  const options = el('div', 'sm-link-options');
  const option = (on, title, says, path, payload) => {
    const line = el('label', 'sm-link-option');
    const words = el('span', 'sm-link-option-words');
    words.append(el('b', null, title), el('small', null, says));
    const wrap = el('span', 'settings-switch');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = Boolean(on);
    box.addEventListener('change', async () => {
      box.disabled = true;
      const answer = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload(box.checked)) })
        .then((response) => response.ok).catch(() => false);
      if (!answer) box.checked = !box.checked;
      box.disabled = false;
      await refresh();
    });
    wrap.append(box, el('i'));
    line.append(words, wrap);
    options.append(line);
  };
  option(enlace.recall, t('Always include its notes'), t('Up to 3 of its notes go with every answer, not only when an agent asks for them.'), '/api/salas/enlaces/recall', (on) => ({ id: enlace.id, recall: on }));
  if (reader === data.salas) option(enlace.train, t('The Coordinator learns from it'), t('What the Coordinator reads here also goes into what it is trained with.'), '/api/salas/enlaces/train', (on) => ({ id: enlace.id, train: on }));
  option(enlace.state, t('It shares its state'), t('Its goal, phase, next step and what is open can be read too, never its files.'), '/api/salas/enlaces/allow', (on) => ({ id: enlace.id, field: 'state', on }));
  option(enlace.deliver, t('It receives delivered notes'), t('Notes can be handed to it; they wait for you to accept them before entering its memory.'), '/api/salas/enlaces/allow', (on) => ({ id: enlace.id, field: 'deliver', on }));
  node.append(options);
  const actions = el('div', 'sm-actions');
  if (revoking.has(enlace.id)) actions.append(el('span', 'sm-ask', t('Nothing crosses from then on.')), button('sm-btn danger small', t('Yes, cancel it'), () => revokeLink(enlace.id)), button('sm-btn ghost small', t('Keep the connection'), () => { revoking.delete(enlace.id); draw(); }));
  else actions.append(button('sm-btn ghost small', t('Cancel the connection'), () => { revoking.add(enlace.id); draw(); }));
  node.append(actions);
  return node;
}
// How a connection works, in three steps under the sheet's title, as the project map says its own
// gestures: who shares, who looks up, and you sign — cancelled whenever you want.
function drawLinkSteps() {
  let steps = ui.linksSheet.querySelector('.sm-link-steps');
  if (!steps) { steps = el('ol', 'sm-link-steps'); ui.linksNote.after(steps); }
  steps.replaceChildren(...[
    [t('Choose what it shares'), t('A project and what it learned: decisions, facts, preferences.')],
    [t('Choose who looks it up'), t('Another project, or the Coordinator, which sees them all.')],
    [t('You sign it'), t('Until a date or with no end. Cancel it here whenever you want.')],
  ].map(([title, says], index) => { const item = el('li'); item.append(el('i', null, String(index + 1)), el('b', null, title), el('small', null, says)); return item; }));
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
  ui.linksNote.textContent = t('A connection lets one project look up what another already learned: its decisions, facts and preferences. It only reads, never changes the other project, and you can cancel it whenever you want.');
  drawLinkSteps();
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
  close.innerHTML = `<span class="x-icon">${trazo('close')}</span>`; // trusted
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
    // The keys go side by side, as everywhere else in MADRE (1.0.5): one under the other read as a list.
    const keys = el('div', 'sm-keys-row');
    if (room?.open && id !== data.salas) keys.append(button('sm-btn primary small', t('Open the project'), () => leaveTo(addressOf(room))));
    keys.append(listKey);
    side.append(keys);
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
  // NEURAL, 1.0.5: the connections drawn as the neural mode draws memory (public/neural.js), in a
  // light SVG of their own: a deep glow behind, each project a neuron (a soma that glows, short
  // dendrites with a bead at the end), each connection an axon that bends a little, and what
  // crosses it a signal of light that travels the axon. Only what travels lights up.
  const depthId = `sm-depth-${wide ? 'w' : 't'}`;
  const depthGradient = svgNode('radialGradient', { id: depthId });
  for (const [offset, opacity] of [['0%', 1], ['60%', 0.35], ['100%', 0]]) {
    const stop = svgNode('stop', { offset, 'stop-opacity': opacity, class: 'depth-stop' });
    depthGradient.append(stop);
  }
  defs.append(depthGradient);
  svg.append(svgNode('ellipse', { class: 'depth', cx, cy, rx: W * 0.55, ry: H * 0.62, fill: `url(#${depthId})` }));
  const seedOf = (id) => [...String(id)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7);
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
    // An axon to or from the Coordinator bends a little, to one side or the other by its index.
    const sideways = (index % 2 ? 1 : -1) * Math.min(14, Math.hypot(end.x - start.x, end.y - start.y) * 0.12);
    const lx = end.x - start.x, ly = end.y - start.y, ll = Math.hypot(lx, ly) || 1;
    let d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${((start.x + end.x) / 2 - (ly / ll) * sideways).toFixed(1)} ${((start.y + end.y) / 2 + (lx / ll) * sideways).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
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
    ways.forEach(([way, colour], wayIndex) => {
      // A signal of light that travels the axon, the way the notes go; both ways when they read
      // each other. With reduced motion the axon stays lit instead.
      if (still) {
        const lit = svgNode('path', { class: `flow ${way} still`, d });
        lit.style.stroke = colour;
        lit.dataset.a = source;
        lit.dataset.b = reader;
        svg.append(lit);
        return;
      }
      const signal = svgNode('circle', { class: `flow signal ${way}`, r: wide ? 2.6 : 2.2, filter: `url(#${glowId})` });
      signal.style.fill = colour;
      signal.dataset.a = source;
      signal.dataset.b = reader;
      const travel = svgNode('animateMotion', { dur: `${(2.8 + ((index + wayIndex) % 4) * 0.45).toFixed(2)}s`, begin: `-${((index * 0.61 + wayIndex * 1.3) % 2.4).toFixed(2)}s`, repeatCount: 'indefinite', path: d, ...(way === 'back' ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {}) });
      signal.append(travel);
      svg.append(signal);
    });
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
    // 1.0.5, quieter: a small soft halo, a solid dot of its tone and a hairline ring around it.
    star.append(
      svgNode('circle', { class: 'halo', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r * (on ? 1.9 : 1.5)).toFixed(1), fill: haloFor(room.id, toneOf(room.id)) }),
      svgNode('circle', { class: 'ring', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r * 0.95 + 3).toFixed(1) }),
      svgNode('circle', { class: 'body', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: (spot.r * (on ? 0.62 : 0.55)).toFixed(1) }),
      svgNode('circle', { class: 'heart', cx: spot.x.toFixed(1), cy: spot.y.toFixed(1), r: Math.max(0.8, spot.r * 0.18).toFixed(1) }),
    );
    // Its dendrites: three or four short fibres, each with a bead at the end, at angles of its own
    // (from its id, so a project always looks the same), never towards where its name is written.
    const seed = seedOf(room.id);
    const fibres = svgNode('g', { class: 'dendrites' });
    const count = on ? 4 : 3;
    for (let at = 0; at < count; at += 1) {
      const angle = Math.atan2(spot.sin, spot.cos) + Math.PI * (0.55 + (at / count) * 0.9) + ((seed % 17) - 8) * 0.03;
      const length = spot.r * (1.7 + ((seed >> at) % 5) * 0.18);
      const ax = spot.x + Math.cos(angle) * spot.r * 0.7, ay = spot.y + Math.sin(angle) * spot.r * 0.7;
      const bx = spot.x + Math.cos(angle) * (spot.r + length), by = spot.y + Math.sin(angle) * (spot.r + length);
      const bend = ((seed >> (at + 2)) % 2 ? 1 : -1) * length * 0.22;
      fibres.append(svgNode('path', { d: `M${ax.toFixed(1)} ${ay.toFixed(1)} Q ${((ax + bx) / 2 - Math.sin(angle) * bend).toFixed(1)} ${((ay + by) / 2 + Math.cos(angle) * bend).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}` }));
      fibres.append(svgNode('circle', { class: 'bead', cx: bx.toFixed(1), cy: by.toFixed(1), r: 1.05 }));
    }
    group.append(fibres, star);
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
  hub.append(svgNode('circle', { class: 'corona', cx, cy, r: hubR * 1.6, fill: haloFor(data.salas, brand.solid ?? brand.color) }));
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
  'w-usage': { kind: 'usage', owner: true, name: () => t('MADRE usage'), about: () => t('How many copies of MADRE are on, which versions and whether people come back. Only you see this.'), size: 8, rows: 5 },
  // What fails in every copy (src/telemetry.mjs, madre.run's /api/telemetry, 2026-10-28): the author's
  // too, with the same token, and nowhere else.
  'w-errors': { kind: 'errors', owner: true, name: () => t('MADRE errors'), about: () => t('What fails in every copy of MADRE, by how many copies it reaches: the ones Diagnostics knows and the ones nobody catalogued. Only you see this.'), size: 8, rows: 5 },
  // The author's board (2026-10-30, madre.run's /api/metrics): copies on right now and off, installs,
  // updates and uninstalls by day, and where MADRE runs. Only in the author's copy run from source.
  'w-live': { kind: 'live', owner: true, name: () => t('MADRE live'), about: () => t('How many copies of MADRE are on right now, and how many of this month\'s are off. Only you see this.'), size: 4, rows: 3 },
  'w-installs': { kind: 'installs', owner: true, name: () => t('Installs'), about: () => t('Installs, updates and uninstalls of MADRE by day, the last 30 days. Only you see this.'), size: 8, rows: 3 },
  'w-environments': { kind: 'environments', owner: true, name: () => t('Where MADRE runs'), about: () => t('The systems, memory, agents, projects per copy and modules of the copies this month. Only you see this.'), size: 8, rows: 5 },
  'w-models': { kind: 'models', name: () => t('Local models'), about: () => t('Ollama, its models, and how close each project is to its own.'), size: 4, rows: 3 },
  // Your agenda (2026-10-28): every project's reminders by when they are due — late, today, tomorrow,
  // this week, later —, each settled here, and a new one written as you would say it. Read from the
  // reminders themselves (src/modules/reminders.mjs), not from a widget of the server.
  'w-agenda': { kind: 'agenda', name: () => t('Agenda'), about: () => t('Your reminders from every project, by day, and a new one written as you would say it.'), size: 4, rows: 4, read: async () => {
    const answer = await fetch('/api/reminders?all=1', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (answer?.prefs) reminderPrefs = answer.prefs;
    return answer ? { reminders: answer.reminders ?? [] } : null;
  } },
};
const DEFAULT_LAYOUT = { order: ['bishop', 'waiting', 'links', 'projects', 'decisions', 'attention', 'memory'], size: {}, rows: {} };
// What each tile is, drawn in the accent the person chose (the same line as the room's AJUSTES icons).
const TILE_ICONS = {
  'bishop': trazo('coordinator'),
  'waiting': trazo('hourglass'),
  'projects': trazo('card'),
  'links': trazo('edge'),
  'decisions': trazo('checkbox'),
  'attention': trazo('alert'),
  'memory': trazo('database'),
  'w-system': trazo('chip'),
  'w-servers': trazo('server'),
  'w-memory': trazo('gauge'),
  'w-coordinator': trazo('trending'),
  'w-models': trazo('cube'),
  'w-agenda': trazo('calendar'),
  'w-usage': trazo('bars'),
  'w-errors': trazo('warning'),
  'w-live': trazo('broadcast'),
  'w-installs': trazo('download'),
  'w-environments': trazo('globe'),
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
  // The Coordinator with no summary yet, across the whole board, is as tall as what it holds (2026-10-28):
  // its five rows only kept an empty box open. Beside other tiles it keeps its rows, and the box says
  // what will come there (salas-mac.css, the empty summary).
  const unsaid = node.id === 'sm-bishop' && !ui.work.list.childElementCount && !layout.rows?.bishop && node.getBoundingClientRect().width > ($(BOARD)?.getBoundingClientRect().width ?? Infinity) * 0.9;
  const own = unsaid ? 0 : rowsOf(node.dataset.tile);
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
const MOVE_ICON = trazo('move');
const BEFORE_ICON = trazo('back');
const AFTER_ICON = trazo('next');
// A height is drawn as the rows it takes, out of five; «Automatic» as rows that follow the content.
const heightIcon = (count) => `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5.2" y="2.8" width="9.6" height="14.4" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/>${count ? `<rect x="7" y="${(15.4 - 10.8 * count / 5).toFixed(2)}" width="6" height="${(10.8 * count / 5).toFixed(2)}" rx="1.2" fill="currentColor"/>` : '<path d="M7.2 8.6 10 6l2.8 2.6M7.2 11.4 10 14l2.8-2.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'}</svg>`;
// A size is drawn as the share of the row it takes: a third, a half, two thirds, all of it.
const sizeIcon = (span) => `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.8" y="5.2" width="14.4" height="9.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><rect x="4.6" y="7" width="${(10.8 * span / 12).toFixed(2)}" height="6" rx="1.2" fill="currentColor"/></svg>`;
const ADD_ICON = trazo('add');
const RESET_ICON = trazo('reset');
const HIDE_ICON = trazo('minus');
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
  // Asked again while it is open: the same window comes forward, not a second one.
  if (homeAddSheet?.open) { homeAddSheet.focus?.(); homeWindowForward(homeAddSheet); return; }
  homeAddSheet?.remove();
  homeAddSheet = el('dialog', 'sm-sheet sm-add-sheet');
  const body = el('div', 'sm-sheet-body');
  const head = el('header', 'sm-sheet-head');
  head.append(el('h3', null, t('Add to Home')));
  // The same ✕ as every sheet of Home (the connections, the settings).
  const keys = el('span', 'surface-modes');
  const close = button('surface-mode close x-close x-only', null, () => homeAddSheet.close());
  close.setAttribute('aria-label', t('Close'));
  close.innerHTML = `<span class="x-icon">${trazo('close')}</span>`; // trusted
  keys.append(close);
  head.append(keys);
  body.append(head, el('p', 'hint', t('Tiles you took off and widgets you can put on Home. Right-click any tile to move it, resize it or take it off.')));
  const list = el('div', 'sm-add-list');
  body.append(list);
  homeAddSheet.append(body);
  // The key's squares stay filled while the sheet it opened is there.
  const key = document.getElementById('sm-add-widgets');
  key?.classList.add('filled');
  document.body.append(homeAddSheet);
  // A window of Home, as Settings and the Market are (2026-10-28): carried by its head, sized by its
  // sides, its place kept. On a phone it stays the sheet it was.
  const sheetNow = homeAddSheet;
  const framed = homeWindow({ root: sheetNow, bar: head, close: () => sheetNow.close(), key: 'pulse.homeAddWindow', minW: 420, minH: 240, keys: false, size: { w: 560, h: 640 } });
  // As tall as its list, unless the person gave it a size of their own (2026-10-28): with two widgets
  // a window of 640 px was mostly empty.
  const fit = () => {
    if (!framed || !sheetNow.isConnected) return;
    let sized = null;
    try { sized = localStorage.getItem('pulse.homeAddWindow'); } catch { /* no storage: fit it */ }
    if (sized) return;
    // Down to the foot of its list: scrollHeight never says less than the window already is.
    const below = getComputedStyle(body);
    const need = Math.ceil(list.getBoundingClientRect().bottom - body.getBoundingClientRect().top + body.scrollTop + Number.parseFloat(below.paddingBottom) + Number.parseFloat(below.borderBottomWidth));
    if (need < sheetNow.getBoundingClientRect().height) framed.resize({ h: Math.max(240, need) });
  };
  sheetNow.addEventListener('close', () => { framed?.drop(); sheetNow.remove(); if (homeAddSheet === sheetNow) homeAddSheet = null; key?.classList.remove('filled'); });
  if (framed) {
    sheetNow.classList.add('sm-add-framed');
    sheetNow.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); sheetNow.close(); } });
    sheetNow.show();
    framed.raise();
  } else sheetNow.showModal();
  void homeTour.hint('home-add', list, { inside: true, title: t('Add to Home'), text: t('The tiles you took off and the widgets you can add. A widget shows up only when this Mac has something to put in it. Right-click any tile to move it, change its size or take it off.') });
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
  if (!entries.length) { list.append(el('p', 'sm-hint', t('Everything is already on Home.'))); fit(); return; }
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
      // One that reads for itself (the agenda) is ready when it can read: it has a box to start with.
      const reading = entry.spec.read ? ((await entry.spec.read()) ? { available: true } : { failed: true })
        : await fetch(`/api/salas/widget?kind=${entry.spec.kind}`, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : { failed: response.status })).catch(() => ({ failed: true }));
      if (!row.isConnected) return;
      const ok = Boolean(reading?.available);
      add.disabled = !ok;
      // A page served by a project started before widgets existed cannot read them: said as that,
      // not as a Mac with nothing to show.
      said.textContent = ok ? '' : reading.failed === 404 ? t('This page is served by a project started before widgets existed: open Home from its own address, or restart that project.') : reading.failed ? t('It could not be read just now.') : (entry.spec.needs?.() ?? t('Nothing feeds it on this Mac yet.'));
    }
  }
  fit();
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
const osWord = (name) => { const word = OS_WORDS[name] ?? name; return typeof word === 'function' ? word() : word; };
const WIDGET_PAINT = {
  // The agenda: what is late and what is today first, then tomorrow, this week and later; a line per
  // reminder with its project and its keys; and a box for a new one, in the person's own words.
  agenda(body, reading, { again } = {}) {
    const list = reading.reminders ?? [];
    const now = new Date();
    const day = (offset) => { const one = new Date(now); one.setHours(0, 0, 0, 0); one.setDate(one.getDate() + offset); return one.getTime(); };
    const groups = [
      [t('Late'), (at) => at < now.getTime()],
      [t('Today'), (at) => at < day(1)],
      [t('Tomorrow'), (at) => at < day(2)],
      [t('This week'), (at) => at < day(7)],
      [t('Later'), () => true],
    ];
    const used = new Set();
    const time = (due) => new Intl.DateTimeFormat(reminderLocale(), { hour: 'numeric', minute: '2-digit' }).format(new Date(due));
    const date = (due) => new Intl.DateTimeFormat(reminderLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(due));
    const box = el('div', 'sm-agenda');
    let shown = 0;
    for (const [title, fits] of groups) {
      const mine = list.filter((one) => !used.has(one.id) && fits(Date.parse(one.due)));
      for (const one of mine) used.add(one.id);
      if (!mine.length || shown >= 6) continue;
      const group = el('div', `sm-agenda-group${title === t('Late') ? ' late' : ''}`);
      group.append(el('span', 'sm-agenda-day', title));
      for (const one of mine.slice(0, 6 - shown)) {
        shown += 1;
        const row = el('div', 'sm-agenda-row');
        const words = el('div', 'sm-agenda-words');
        const when = title === t('Today') || title === t('Late') || title === t('Tomorrow') ? time(one.due) : date(one.due);
        const room = data?.rooms.find((item) => item.id === one.room) ?? null;
        words.append(el('b', null, one.text), el('small', null, [when, room ? roomLabel(room) : one.project, one.repeat ? t('repeats') : null].filter(Boolean).join(' · ')));
        const done = button('sm-agenda-key', null, async () => { done.disabled = true; await settleReminder('/api/reminders/done', { id: one.id }); again?.(); });
        done.innerHTML = trazo('check'); // trusted
        done.setAttribute('aria-label', t('Done'));
        done.title = t('Done');
        const later = button('sm-agenda-later', t('Later'), async () => { later.disabled = true; await settleReminder('/api/reminders/snooze', { id: one.id, minutes: reminderPrefs.snooze }); again?.(); });
        row.append(done, words, later);
        group.append(row);
      }
      box.append(group);
    }
    if (!list.length) box.append(el('p', 'sm-hint sm-agenda-empty', t('Nothing on your agenda. Write one below, or ask an agent to remind you of something.')));
    else if (list.length > shown) box.append(el('p', 'sm-hint', t('And {n} more.', { n: list.length - shown })));
    // A new one, as you would say it: «tomorrow at 5 call Ana» (the time first is taken off the words).
    const form = el('form', 'sm-agenda-add');
    const input = el('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = t('Remind me… (tomorrow at 5 call Ana)');
    input.setAttribute('aria-label', t('New reminder'));
    const add = el('button', 'sm-btn small', t('Add'));
    add.type = 'submit';
    const said = el('small', 'sm-agenda-said');
    form.append(input, add, said);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      add.disabled = true;
      const answer = await post('/api/reminders', { text });
      add.disabled = false;
      if (!answer.ok) { said.textContent = answer.body?.error ?? t('The reminder was not set.'); return; }
      input.value = '';
      input.blur();
      const due = answer.body?.reminder?.due;
      if (due) toast(t('Reminder set: {when}.', { when: reminderWhen(due) }));
      again?.();
      void loadReminders();
    });
    body.append(box, form);
  },
  // The author's board (2026-10-30): one reading of madre.run's /api/metrics for the three.
  live(body, reading) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const live = reading.live ?? {};
    const lead = el('div', 'sm-usage-lead sm-live-lead');
    lead.append(el('i', `sm-live-dot${live.on ? ' on' : ''}`), el('b', 'sm-w-big', Number(live.on ?? 0).toLocaleString()), el('span', null, t('on right now')));
    body.append(lead);
    const grid = el('div', 'sm-w-grid sm-usage-figures');
    for (const [label, value, line] of [
      [t('Off now'), live.off, t('used this month, not on now')],
      [t('Last hour'), live.hour, t('on at some moment')],
      [t('Silent'), live.silent, t('diagnostics off or a MADRE before 1.1.0')],
    ]) {
      const cell = el('div', 'sm-w-metric');
      cell.append(el('span', 'sm-w-label', label), el('b', 'sm-w-big', Number(value ?? 0).toLocaleString()), el('small', null, line));
      grid.append(cell);
    }
    body.append(grid);
    const shares = (list, word = (name) => name) => {
      const total = list.reduce((sum, one) => sum + one.n, 0);
      return list.slice(0, 4).map((one) => `${word(one.name)} ${total ? Math.round((one.n / total) * 100) : 0}%`).join(' · ') || '—';
    };
    const lines = el('div', 'sm-usage-lines');
    for (const [label, said] of [[t('Versions'), shares(live.versions ?? [])], [t('Systems'), shares(live.os ?? [], osWord)]]) {
      const row = el('div', 'sm-w-line');
      row.append(el('b', null, label), el('small', null, said));
      lines.append(row);
    }
    body.append(lines);
  },
  installs(body, reading) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const life = reading.lifecycle ?? { days: [], totals: {} };
    const totals = life.totals ?? {};
    const grid = el('div', 'sm-w-grid sm-usage-figures');
    for (const [label, value, line, tone] of [
      [t('Installs'), totals.installs, t('new copies, 30 days'), 'up'],
      [t('Updates'), totals.updates, t('a new version opened'), null],
      [t('Uninstalls'), totals.uninstalls, t('from Settings'), 'down'],
      [t('Home opened'), totals.starts, t('times, every copy'), null],
    ]) {
      const cell = el('div', `sm-w-metric${tone ? ` sm-life-${tone}` : ''}`);
      cell.append(el('span', 'sm-w-label', label), el('b', 'sm-w-big', Number(value ?? 0).toLocaleString()), el('small', null, line));
      grid.append(cell);
    }
    body.append(grid);
    // Each day: installs up from the line, uninstalls down from it, updates as a quieter part of the bar.
    const days = life.days ?? [];
    const top = Math.max(1, ...days.map((one) => one.installs + one.updates), ...days.map((one) => one.uninstalls));
    const chart = el('div', 'sm-usage-chart');
    const bars = el('div', 'sm-life-days');
    bars.setAttribute('role', 'img');
    bars.setAttribute('aria-label', t('Installs, updates and uninstalls on each day, last 30 days'));
    const shortDay = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short' });
    for (const one of days) {
      const day = el('span');
      const up = el('i', 'up');
      up.style.setProperty('--h', String((one.installs + one.updates) / top));
      up.style.setProperty('--part', String(one.installs + one.updates ? one.installs / (one.installs + one.updates) : 0));
      const down = el('i', 'down');
      down.style.setProperty('--h', String(one.uninstalls / top));
      day.append(up, down);
      day.title = t('{day}: {installs} installed · {updates} updated · {uninstalls} uninstalled', { day: shortDay(one.day), installs: one.installs, updates: one.updates, uninstalls: one.uninstalls });
      bars.append(day);
    }
    const axis = el('div', 'sm-usage-axis');
    axis.append(el('small', null, shortDay(days[0]?.day ?? reading.today)), el('small', 'sm-usage-legend', ''), el('small', null, t('today')));
    axis.children[1].append(el('i', 'is-new'), t('installed'), el('i', 'is-on'), t('updated'), el('i', 'is-down'), t('uninstalled'));
    chart.append(bars, axis);
    body.append(chart);
    body.append(el('p', 'sm-hint', t('{n} copies were heard for the first time in these 30 days, those from before 1.1.0 included.', { n: Number(totals.firstSeen ?? 0).toLocaleString() })));
  },
  environments(body, reading) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const env = reading.env ?? {};
    const copies = Number(env.copies ?? 0);
    body.append(el('p', 'sm-hint', copies ? t('{n} copies this month, each by what it said last. Copies from before 1.1.0 say less: «?» is what they did not say.', { n: copies.toLocaleString() }) : t('No copy has said its environment yet: it starts with 1.1.0.')));
    if (!copies) return;
    const share = (n) => `${Math.round((n / copies) * 100)}%`;
    const SYSTEMS = { darwin: 'macOS', linux: 'Linux', win32: 'Windows', wsl: 'WSL', other: t('other') };
    const CHANNELS = { npx: 'npx', global: t('installed (npm -g)'), project: t('inside a project'), source: t('from source') };
    const LANGS = { es: t('Spanish'), en: t('English') };
    const AGENT_NAMES = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini', opencode: 'OpenCode', cursor: 'Cursor' };
    const said = (list, words = {}) => (list ?? []).filter((one) => one.name !== '?').slice(0, 5).map((one) => `${words[one.name] ?? one.name} ${share(one.n)}`).join(' · ') || '—';
    const lines = el('div', 'sm-usage-lines sm-env-lines');
    for (const [label, text] of [
      [t('Systems'), said(env.systems, SYSTEMS)],
      [t('Chip'), said(env.arch, { arm64: 'Apple / ARM', x64: 'x64' })],
      [t('Memory'), said(env.ram)],
      [t('Cores'), said(env.cores)],
      [t('Installed with'), said(env.channel, CHANNELS)],
      [t('Language'), said(env.language, LANGS)],
      [t('Shell'), said(env.shell)],
      [t('Node'), said(env.node, Object.fromEntries((env.node ?? []).map((one) => [one.name, `Node ${one.name}`])))],
      [t('Agents installed'), said(env.agents, AGENT_NAMES)],
      [t('Agents ready'), said(env.agentsReady, AGENT_NAMES)],
      [t('Local AI'), t('installed {a} · on {b}', { a: share(env.localAi?.installed ?? 0), b: share(env.localAi?.running ?? 0) })],
      [t('Modules on'), said(env.modules)],
    ]) {
      const row = el('div', 'sm-w-line');
      row.append(el('b', null, label), el('small', null, text));
      lines.append(row);
    }
    body.append(lines);
    // Projects per copy, the figure that sets the free limit of 1.1.1: a bar for each range.
    const ranges = ['0', '1', '2–5', '6–10', '11–20', '> 20'];
    const counts = new Map((env.projects ?? []).map((one) => [one.name, one.n]));
    const known = ranges.reduce((sum, name) => sum + (counts.get(name) ?? 0), 0);
    const box = el('div', 'sm-env-projects');
    box.append(el('b', null, t('Projects per copy')));
    for (const name of ranges) {
      const n = counts.get(name) ?? 0;
      const row = el('div', 'sm-env-range');
      row.append(el('span', null, name), meter(known ? n / known : 0), el('small', null, known ? `${n} · ${Math.round((n / known) * 100)}%` : '—'));
      box.append(row);
    }
    body.append(box);
  },
  usage(body, reading) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const n = (value) => Number(value ?? 0).toLocaleString();
    const pctOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
    // The figure that matters first: people using it this week, and whether that grew.
    const week = Number(reading.active.week ?? 0);
    const before = Number(reading.active.lastWeek ?? 0);
    const change = before ? Math.round(((week - before) / before) * 100) : null;
    const lead = el('div', 'sm-usage-lead');
    const trend = change === null ? (week ? t('first week with data') : '') : change === 0 ? t('same as the week before') : change > 0 ? t('{n}% more than the week before', { n: change }) : t('{n}% fewer than the week before', { n: -change });
    lead.append(el('b', 'sm-w-big', n(week)), el('span', null, t('copies used this week')), el('small', `sm-usage-trend${change > 0 ? ' up' : change < 0 ? ' down' : ''}`, trend));
    body.append(lead);
    const grid = el('div', 'sm-w-grid sm-usage-figures');
    for (const [label, value, line] of [
      [t('Today'), reading.active.day, t('on today')],
      [t('30 days'), reading.active.month, t('used this month')],
      [t('Stayed'), reading.stayed, t('came back another day')],
      [t('Tried it'), reading.tried, t('seen a single day')],
    ]) {
      const cell = el('div', 'sm-w-metric');
      cell.append(el('span', 'sm-w-label', label), el('b', 'sm-w-big', n(value)), el('small', null, line));
      grid.append(cell);
    }
    body.append(grid);
    // The last 30 days: copies on each day, and the part of them seen for the first time.
    const top = Math.max(1, ...reading.days.map((one) => one.active));
    const chart = el('div', 'sm-usage-chart');
    const days = el('div', 'sm-usage-days');
    days.setAttribute('role', 'img');
    days.setAttribute('aria-label', t('Copies on each day, last 30 days'));
    const shortDay = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short' });
    for (const one of reading.days) {
      const bar = el('i');
      bar.style.setProperty('--h', String(one.active / top));
      bar.style.setProperty('--new', String(one.active ? one.new / one.active : 0));
      bar.title = t('{day}: {n} on · {fresh} new', { day: shortDay(one.day), n: one.active, fresh: one.new });
      days.append(bar);
    }
    const axis = el('div', 'sm-usage-axis');
    axis.append(el('small', null, shortDay(reading.days[0]?.day ?? reading.today)), el('small', 'sm-usage-legend', ''), el('small', null, t('today')));
    axis.children[1].append(el('i', 'is-on'), t('on that day'), el('i', 'is-new'), t('new'));
    chart.append(days, axis);
    body.append(chart);
    // Each with its share; the newest version first if it is there, so «how many updated» reads at once.
    const shares = (list, word = (name) => name) => {
      const total = list.reduce((sum, one) => sum + one.n, 0);
      return list.slice(0, 4).map((one) => `${word(one.name)} ${pctOf(one.n, total)}%`).join(' · ') || '—';
    };
    const back = (part) => (part.cohort ? `${pctOf(part.back, part.cohort)}%` : '—');
    const lines = el('div', 'sm-usage-lines');
    for (const [label, said] of [
      [t('Versions'), shares(reading.versions)],
      [t('Systems'), shares(reading.os, (name) => { const word = OS_WORDS[name] ?? name; return typeof word === 'function' ? word() : word; })],
      [t('Came back'), t('after 1 day {d1} · 7 days {d7} · 30 days {d30}', { d1: back(reading.retention.d1), d7: back(reading.retention.d7), d30: back(reading.retention.d30) })],
    ]) {
      const row = el('div', 'sm-w-line');
      row.append(el('b', null, label), el('small', null, said));
      lines.append(row);
    }
    body.append(lines);
    // Yours do not count: this one never, and any other you name by its identifier.
    const foot = el('div', 'sm-usage-mine');
    foot.append(el('small', null, t('Your copies do not count: {n} left out, this one included.', { n: Math.max(1, Number(reading.excluded ?? 0)) })));
    const form = el('form', 'sm-usage-exclude');
    const field = el('input');
    field.type = 'text'; field.placeholder = t('Another copy of yours: its identifier'); field.spellcheck = false; field.autocomplete = 'off';
    field.setAttribute('aria-label', t('Another copy of yours: its identifier'));
    const go = button('sm-btn small', t('Leave it out'), null);
    go.type = 'submit';
    form.append(field, go);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = field.value.trim();
      if (!id) return;
      go.disabled = true;
      const answer = await post('/api/salas/usage/exclude', { id });
      go.disabled = false;
      if (!answer.ok) { toast(answer.body?.error ?? t('Home did not answer.'), 'error'); return; }
      field.value = '';
      // The tile reads itself again within 20 s; the server already forgot its old figures.
      toast(t('That copy no longer counts. The figures update in a moment.'), 'done');
    });
    foot.append(form);
    body.append(foot);
  },
  // What fails in every copy, the widest first (2026-10-28). Each with what it is (its MU code when
  // Diagnostics knows it), how many copies and times, which versions and systems, MADRE's own lines
  // it went through, and the author's word on it.
  errors(body, reading, { again } = {}) {
    if (!reading.available) { body.append(el('p', 'sm-hint', reading.status ? t('madre.run answered {status}.', { status: reading.status }) : t('madre.run could not be reached.'))); return; }
    const open = reading.errors.filter((one) => one.status !== 'ignored' && one.status !== 'fixed');
    const fresh = open.filter((one) => one.status === 'new').length;
    const lead = el('div', 'sm-usage-lead');
    lead.append(el('b', 'sm-w-big', String(open.length)), el('span', null, t('failures in the last 30 days')), el('small', `sm-usage-trend${fresh ? ' down' : ''}`, fresh ? t('{n} not looked at yet', { n: fresh }) : t('all looked at')));
    body.append(lead);
    // How much MADRE was used in the same days, so a failure reads against the work it interrupted.
    const turns = Object.entries(reading.usage?.totals ?? {}).filter(([key]) => /^turn\.[a-z]/.test(key) && !['turn.attachments', 'turn.ash'].includes(key));
    const modes = Object.entries(reading.usage?.totals ?? {}).filter(([key]) => /^mode\.\d$/.test(key));
    const all = (list) => list.reduce((sum, [, n]) => sum + n, 0);
    const lines = el('div', 'sm-usage-lines');
    for (const [label, said] of [
      [t('Copies'), t('{n} sent diagnostics', { n: reading.copies })],
      [t('Turns'), turns.length ? turns.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, n]) => `@${key.slice(5)} ${Math.round((n / all(turns)) * 100)}%`).join(' · ') : '—'],
      [t('Modes'), modes.length ? modes.sort((a, b) => a[0].localeCompare(b[0])).map(([key, n]) => `#${key.slice(5)} ${Math.round((n / all(modes)) * 100)}%`).join(' · ') : '—'],
    ]) {
      const row = el('div', 'sm-w-line');
      row.append(el('b', null, label), el('small', null, said));
      lines.append(row);
    }
    body.append(lines);
    const list = el('div', 'sm-errors');
    for (const one of reading.errors.slice(0, 12)) {
      const row = el('details', `sm-fail is-${one.status}`);
      const head = el('summary');
      const what = one.code ? one.code : { agent: t('Agent'), crash: t('Crash'), route: t('Route'), page: t('Page'), install: t('Install'), model: t('Model'), startup: t('Start'), other: t('Other') }[one.kind] ?? one.kind;
      head.append(el('span', 'sm-fail-what', `${what}${one.agent ? ` · @${one.agent}` : ''}`), el('span', 'sm-fail-said', one.message), el('small', null, t('{copies} copies · {hits} times', { copies: one.copies, hits: one.hits })));
      row.append(head);
      const systems = one.systems.map((name) => { const word = OS_WORDS[name] ?? name; return typeof word === 'function' ? word() : word; }).join(', ');
      const facts = el('p', 'sm-hint', [one.versions.map((v) => `v${v}`).join(', '), `${systems}${one.wsl ? ' · WSL' : ''}`, t('last {when}', { when: new Date(one.last_seen).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })].filter(Boolean).join(' · '));
      row.append(facts);
      if (one.frames.length) { const code = el('code', 'sm-error-frames', one.frames.join('\n')); row.append(code); }
      const keys = el('div', 'sm-error-keys');
      for (const [status, words] of [['known', t('Known')], ['fixed', t('Fixed')], ['ignored', t('Ignore')]]) {
        const key = button(`sm-btn small${one.status === status ? ' on' : ''}`, words, async () => {
          key.disabled = true;
          const answer = await post('/api/salas/errors/status', { fp: one.fp, status: one.status === status ? 'new' : status });
          if (!answer.ok) { key.disabled = false; toast(t('madre.run could not be reached.'), 'error'); return; }
          again?.();
        });
        keys.append(key);
      }
      row.append(keys);
      list.append(row);
    }
    if (!reading.errors.length) list.append(el('p', 'sm-hint', t('No failures in the last 30 days.')));
    body.append(list);
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
    const facts = [memoriesCount(reading.notes ?? 0), reading.trained ? t('model {name}', { name: reading.trained }) : t('no model of its own yet')];
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
    // A field being written in is never redrawn under the person (the agenda's new reminder).
    if (body.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    const reading = spec.read ? await spec.read() : await fetch(`/api/salas/widget?kind=${spec.kind}`, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (!node.isConnected) return;
    body.replaceChildren();
    // The author's widget is not there at all for a copy that cannot read it (no token, not from source).
    if (spec.owner) node.hidden = !reading;
    if (!reading) { body.append(el('p', 'sm-hint', t('It could not be read just now.'))); return; }
    WIDGET_PAINT[spec.kind](body, reading, { again: () => void read() });
    fitTile(node);
    // The first time it shows, what it is (homeTour is set up below this, so it is read late).
    if (!node.dataset.guided) { node.dataset.guided = '1'; setTimeout(() => { try { guideWidget(node, spec.kind); } catch { /* the tour is not up yet */ } }, 1500); }
  };
  node.start = () => { if (timer) return; void read(); timer = setInterval(() => void read(), 20000); };
  node.stop = () => { clearInterval(timer); timer = 0; };
  // Said again in the language Home settled on: a widget is made once, before the first answer
  // tells Home which language MADRE speaks (a new MADRE starts in Spanish and may adopt English),
  // and its title stayed in the first one (2026-10-17).
  node.say = () => { head.firstChild.textContent = spec.name(); if (timer) void read(); };
  return node;
}
applyLayout();

// THE WELCOME OF 1.0 (public/tour.js): the bonjour the first time, the chapters after it, the pill
// that waits in the bar, `?` for the gestures, and the hint on Connections. In Home, «Take me
// there» opens what lives here; for what lives inside a project it opens the one open most
// recently, if any is. A new person meets the welcome (public/welcome.js) in place of the bonjour,
// and its last step leads to the chapters.
const agentsReady = () => (agentsSeen?.agents ?? []).some((agent) => agent.id !== 'madre' && agentState(agent, agentsSeen).ok);
const intoAProject = () => {
  const room = data ? projectsInOrder().open[0] : null;
  return room ? () => leaveTo(addressOf(room)) : undefined;
};
const homeTour = startTour({
  page: 'home',
  pillSlot: $('sm-tour-pill'),
  hidden: () => (data?.phonePreview ? [] : ['phone']),
  ready: () => Boolean(data) && !welcomeOpen() && !sheet,
  welcome: { instead: true, needed: () => !projectsInOrder().all.length || !agentsReady(), open: (then) => openHomeWelcome({ then }) },
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
  // Under the map's own head, never beside Home's key, which the map covers.
  opened: () => document.querySelector('.mv .mv-head .mother-title'),
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
  errors: () => t('What fails in every copy of MADRE, by how many copies it reaches. Mark each one known, fixed or ignored; a fixed one that happens again comes back as new.'),
  live: () => t('Copies on right now: a copy is on when it said so in the last ten minutes. Off are the ones used this month that are not on now. It reads again every minute.'),
  installs: () => t('Installs, updates and uninstalls by day. An uninstall counts only when made from Settings; whoever simply stops using MADRE shows as off.'),
  environments: () => t('Each copy once, by what it said last this month: its system, memory, agents, how many projects and which modules. Copies from before 1.1.0 say less.'),
  agenda: () => t('Your reminders from every project, by day. ✓ settles one, «Later» moves it, and the box below sets a new one as you would say it.'),
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
    welcomeSeen = answer?.state?.welcome ?? null;
    drawAttention();
    // Someone new meets the bonjour and the chapters on this same visit: Home's cards come after
    // them, once Home is quiet again, not only on the next visit as they did (2026-10-20).
    // Someone who met MADRE just now (src/tour.mjs, `met`) is walked through Home once the bonjour
    // and its chapters are behind them (2026-10-21): their project, the Coordinator, connections
    // and where the manual is, «Next» from one card to the other. A step whose place is not on this
    // Home is left out of the count.
    const HOME_WALK = [
      {
        id: 'home-start',
        // The list, not a card in it: the cards are drawn again every few seconds, and a hint whose
        // place is gone puts itself away.
        anchor: () => (ui.projects?.querySelector?.(':scope > :not([hidden])') ? ui.projects : ui.add),
        title: () => (ui.projects?.querySelector?.(':scope > :not([hidden])') ? t('Your project lives here') : t('Begin with a project')),
        text: () => (ui.projects?.querySelector?.(':scope > :not([hidden])') ? t('Open it to start. Each project keeps its own chats and its own memory.') : t('Press «Add project» and choose the folder you work in. Nothing inside it changes.')),
      },
      {
        id: 'home-coordinator',
        anchor: () => $('sm-bishop-go'),
        title: () => t('Your Coordinator'),
        text: () => t('An agent that sees all your projects. Ask it «which project was I on yesterday?», or to pass an instruction from one project to another.'),
      },
      {
        id: 'links',
        anchor: () => { const tile = $('sm-links-tile'); return tile && !tile.hidden ? tile.querySelector('.sm-tile-head') ?? tile : null; },
        title: () => t('Connections'),
        text: () => t('With a connection, one project can look up what another learned. You decide what and until when; nothing is written into the other.'),
      },
      {
        id: 'home-manual',
        anchor: () => ui.gear,
        title: () => t('The user manual'),
        text: () => t('Pictures of MADRE with every step marked, for when you want to look something up. It is in Settings › System › User manual, and as a PDF.'),
      },
    ];
    // It waits for the bonjour and its chapters, however long they take: maybeBonjour only opens
    // the bonjour, and the walk asked once, before it was given, never came (2026-10-21).
    let walkTries = 0;
    const walk = async () => {
      if (!homeTour.state()?.bonjourAt) { setTimeout(walk, 2000)?.unref?.(); return; }
      if (!homeTour.newcomer()) return;
      const seen = homeTour.state()?.hints ?? {};
      const here = HOME_WALK.filter((one) => one.anchor()?.getClientRects().length);
      const at = here.findIndex((one) => !seen[one.id]);
      if (at < 0) return;
      const one = here[at];
      const shown = !document.querySelector('dialog[open]') && await homeTour.hint(one.id, one.anchor(), {
        title: one.title(),
        text: one.text(),
        step: at + 1,
        of: here.length,
        skip: () => { for (const rest of here.slice(at + 1)) void homeTour.seen(rest.id); },
        then: () => setTimeout(walk, 350),
      });
      // Not yet (the chapters are open, a sheet is): asked again, for as long as a first visit lasts.
      if (!shown && (walkTries += 1) < 600) setTimeout(walk, 2000)?.unref?.();
    };
    setTimeout(walk, 1500)?.unref?.();
    if (answer?.owed) await homeTour.maybeBonjour();
    if (!homeTour.state()?.bonjourAt) return;
    let linkTries = 0;
    // For whoever came back: what «Connections» is now. Someone new has it in the walk above.
    const sayLinks = async () => {
      const tile = $('sm-links-tile');
      if (!tile || tile.hidden || homeTour.newcomer() || homeTour.state()?.hints?.links) return;
      const shown = !document.querySelector('dialog[open]') && await homeTour.hint('links', tile.querySelector('.sm-tile-head') ?? tile, {
        title: t('Connections'),
        text: homeTour.path() === 'back'
          ? t('With a connection, one project can look up what another learned. In 0.7.2 «Connections» was where you signed your agents in; that is now Settings › Agents.')
          : t('With a connection, one project can look up what another learned. You decide what and until when; nothing is written into the other.'),
      });
      if (!shown && (linkTries += 1) < 40) setTimeout(sayLinks, 3000)?.unref?.();
    };
    setTimeout(sayLinks, 2200)?.unref?.();
    // 1.0.2 brings one key to Home's bar: said once, after any other card, never over a sheet.
    let tries = 0;
    const sayAdd = async () => {
      // News is for whoever had the version before; to someone new every key is new (2026-10-19).
      if (homeTour.path() === 'new') return;
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
const ALLOWED_GLYPH = trazo('check');
const NOT_ALLOWED_GLYPH = trazo('close');
const BOTH_WAYS_ICON = trazo('swap');
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
    // A choice slides the mark and says it over the scene; the step is not drawn again (2026-10-28:
    // drawing it again made the whole sheet blink at every press).
    for (const [value, words] of options) {
      const one = button(null, words, () => {
        choose(value);
        for (const other of seg.children) other.setAttribute('aria-checked', String(other === one));
        paintStage();
      });
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

  // `still`: the same step drawn again for a choice that adds or takes rows (orders), without the
  // step's entrance, so nothing blinks.
  function render({ back = false, still = false } = {}) {
    settle();
    const steps = stepsNow();
    at = Math.min(at, steps.length - 1);
    const kind = steps[at];
    const head = el('header', 'sm-sheet-head');
    const dots = el('ol', 'sm-steps');
    steps.forEach((name, index) => dots.append(el('li', index === at ? 'on' : index < at ? 'done' : null, STEP_WORDS[name]())));
    head.append(dots, closeKey(() => sheet.close()));
    const page = el('div', `sm-step lw-step${back ? ' back' : ''}${still ? ' still' : ''}`);
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
        box.append(row(kindWord(kindOf), LINK_KIND_NOTES[kindOf](), toggle(pick.kinds.has(kindOf), (on) => { if (on) pick.kinds.add(kindOf); else pick.kinds.delete(kindOf); error.textContent = ''; paintStage(); }, kindWord(kindOf)), { recommended: kindOf === 'decision' || kindOf === 'fact', dot: kindOf }));
      }
      page.append(box, el('p', 'lw-foot', t('Only the notes already in use are shared, cleaned of private data first. Never your files, your whole conversations or the notes you set aside.')));
      actions.append(next(() => (pick.kinds.size ? null : t('Choose at least one kind.'))));
    } else if (kind === 'time') {
      intro(t('For how long?'), t('The connection ends on its own on the day you choose. Until then, its agents look the notes up only when they need them, unless you turn on the option below.'));
      const box = card();
      const ends = el('div', 'lw-control');
      ends.append(rail(LINK_DAYS.map(([value, words]) => [value, words()]), pick.days, (value) => { pick.days = value; }, t('It ends')));
      box.append(row(t('It ends'), t('A week is enough to try it; signing it again takes a moment.'), ends, { recommended: pick.days === 7 }));
      box.append(row(t('Always include'), t('With every question it gets up to 3 related notes without looking for them; each time counts toward the hourly limit. Off, its agents look them up only when they need to.'), toggle(pick.recall, (on) => { pick.recall = on; paintStage(); }, t('Always include'))));
      // D-S15: only with the Coordinator reading, and only by you.
      if (coordinator(pick.reader)) box.append(row(t('The Coordinator learns from it'), t("Its notes also go into the training of the Coordinator's local AI, so it knows this project without opening it. Clearing it or revoking takes it out of the next export; a model already trained keeps what it learned until you train it again."), toggle(pick.train, (on) => { pick.train = on; paintStage(); }, t('The Coordinator learns from it'))));
      // D-S16 and D-S17: by you only, off unless you turn them on.
      box.append(row(t('It shares its state'), t('Besides its notes, its canonical state as Continuity keeps it: objective, phase, next step, its last handoff, decisions and what is still open. Only if the project has Continuity installed; never its files or its code.'), toggle(pick.state, (on) => { pick.state = on; paintStage(); }, t('It shares its state'))));
      box.append(row(t('It receives delivered notes'), t('The project that reads can hand it notes. They wait there until you accept them (or an agent of that project in #3 EDIT or above): nothing enters its memory on its own.'), toggle(pick.deliver, (on) => { pick.deliver = on; paintStage(); }, t('It receives delivered notes'))));
      page.append(box);
      actions.append(next());
    } else if (kind === 'orders') {
      const name = nameOf(ordersInto());
      intro(t('Orders from the Coordinator'), sayBold('With orders, the Coordinator can ask {room} for a task, and its agents do it there. Without them, it only reads. #3 EDIT and #4 FULL ACCESS never go this way: they arrive as a proposal you unlock in that project.', { room: name }));
      const box = card();
      box.append(row(sayBold('Allow orders into {room}', { room: name }), sayBold('Leave it off unless you need the Coordinator to act in {room}.', { room: name }), toggle(pick.orders, (on) => { pick.orders = on; render({ still: true }); }, t('Allow orders into {room}', { room: name })), { recommended: !pick.orders }));
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
// What the cards show now, without the clocks (`at`), and when they were drawn: the 4-second clock
// redraws only when a project changed, or once a minute for the «… min. ago». A board rebuilt every
// 4 s replaced the button under the pointer and the click went nowhere (2026-10-19).
let drawnRooms = '';
let drawnRoomsAt = 0;
// MADRE's pulse says how Home stands with its server (2026-10-28): the dot at its end green while it
// answers, red when it does not, amber while an answer is slow to come (styles.css, data-link).
const setLink = (state) => { root.dataset.link = state; };
setLink('waiting');
async function refresh({ polled = false } = {}) {
  if (refreshPending) return refreshPending;
  refreshPending = fetch('/api/salas', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  const slow = setTimeout(() => setLink('waiting'), 2500);
  const answer = await refreshPending;
  clearTimeout(slow);
  refreshPending = null;
  setLink(answer ? 'live' : 'lost');
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
  if (answer.language && answer.language !== language) sayIn(answer.language);
  data = answer;
  // A project that came up after Home stopped waiting is open: its card no longer says it did not.
  for (const room of answer.rooms ?? []) if (room.open) failed.delete(room.id);
  ui.foot.textContent = t('Every project runs on this Mac, on its own, with its own memory.');
  const said = JSON.stringify(answer, (key, value) => (key === 'at' ? undefined : value));
  if (polled && said === drawnRooms && Date.now() - drawnRoomsAt < 60000) return;
  drawnRooms = said;
  drawnRoomsAt = Date.now();
  // The room's corner (app.js, #colophon): the version this Home runs, and NOTICE's own line —
  // drawn when the answer changed, not on every poll.
  if (answer.version) { drawAttribution(ui.colophon, answer.version); void drawColophonKeys(ui.colophon); }
  draw();
  if (!newsAsked) { newsAsked = true; setTimeout(() => void homeNews(), 1200); }
}

// WHAT IS NEW, ON HOME (1.1, 2026-10-28): whoever comes from an older MADRE lands here first now, so
// Home says what changed — the same notes and the same board as a project (src/whats-new.mjs, app.js
// showWhatsNew), shorter: a card each, and «Start». Once per version, per person (the server
// remembers it); never over the welcome, a sheet or a window, nor on a first install.
let newsAsked = false;
async function homeNews(tries = 0) {
  const news = await fetch('/api/whats-new', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!news?.show || !news.notes) return;
  // The welcome or another window first: the board waits for them to close (a few minutes at most).
  if (welcomeOpen() || document.querySelector('dialog[open]')) { if (tries < 120) setTimeout(() => void homeNews(tries + 1), 3000); return; }
  const pick = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value[language] ?? value.es ?? value.en : value);
  const notes = news.notes;
  const dialog = el('dialog', 'whats-new home-news');
  dialog.setAttribute('aria-label', t("What's new in MADRE {version}", { version: news.version }));
  const sheet = el('div', 'wn-sheet');
  const head = el('header', 'wn-head');
  const words = el('div', 'wn-headline');
  const logo = document.querySelector('.side-brand .brand-logo, #sm-back .brand-logo')?.cloneNode?.(true);
  if (logo) { logo.setAttribute('class', 'brand-logo wn-logo'); words.append(logo); }
  words.append(el('span', 'wn-eyebrow', t("What's new")), el('h2', null, t('You now have {version}', { version: String(news.version).replace(/\.0$/, '') })));
  if (notes.intro) words.append(el('p', 'wn-intro', pick(notes.intro)));
  head.append(words, closeKey(() => dialog.close()));
  const grid = el('div', 'wn-board');
  for (const item of notes.items ?? []) {
    const card = el('div', 'wn-card');
    const shot = el('span', 'wn-shot wn-card-shot');
    if (item.image) {
      const image = el('img');
      image.alt = pick(item.title) ?? '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => { shot.classList.add('missing'); image.remove(); });
      image.addEventListener('load', () => shot.classList.add('loaded'));
      image.src = pick(item.image);
      shot.append(image);
    } else shot.classList.add('missing');
    card.append(shot, el('b', 'wn-card-title', pick(item.title)), el('span', 'wn-card-line', pick(item.body)));
    grid.append(card);
  }
  const body = el('div', 'wn-body');
  body.append(grid);
  const foot = el('footer', 'wn-foot');
  const changes = news.changes?.[language] ?? news.changes?.es;
  if (changes) {
    const link = el('a', 'wn-changes', t('See every change ↗'));
    link.href = changes; link.target = '_blank'; link.rel = 'noopener noreferrer';
    foot.append(link);
  }
  const start = button('wn-start', t('Start'), () => dialog.close());
  foot.append(start);
  sheet.append(head, body, foot);
  dialog.append(sheet);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  // Whoever comes from an older MADRE meets MADRE's opening first (2026-10-30), as a new person does in
  // the welcome (loader.js, playOpening), and the board comes after it — unless this page just played it
  // (public/terms.js, after the new license was accepted).
  if (openingPlayed()) start.focus({ preventScroll: true });
  else void playOpening(dialog, { skipLabel: t('Skip') }).then(() => start.focus({ preventScroll: true }));
  // Seen once shown, as in a project: a board left open and the page closed is not owed again.
  void fetch('/api/whats-new/seen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
}

// Home in another language, without a reload: what it says now, and every widget and the tour's pill.
function sayIn(code) {
  language = setLanguage(code);
  root.lang = language;
  translateStatic();
  drawAttention();
  drawDecisions();
  drawWork();
  for (const widget of document.querySelectorAll('.sm-widget')) widget.say?.();
  homeTour.repaint();
}
// Chosen in the welcome's first step: kept for every project (as Settings › Language keeps it), and
// said at once.
async function adoptLanguage(code) {
  try { localStorage.setItem('pulse.language', code); } catch { /* no storage */ }
  await post('/api/language', { language: code });
  sayIn(code);
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
    // Home as a project serves it (2026-10-28): closing that project took this page with it and it
    // read as all of MADRE off. When Home itself is open on its own address, the page goes there.
    const home = data?.rooms.find((one) => one.id === data.salas && one.open?.port);
    if (home && home.id !== room.id && String(home.open.port) !== location.port) {
      setTimeout(() => { location.href = `${location.protocol}//${location.hostname}:${home.open.port}/salas`; }, 900);
      return;
    }
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
    // How to move round it, as keys of this computer; on a phone, where there are none, its line.
    hint: homeShellOn() ? mapKeys('projects') : t('Drag the space to move it · wheel to come closer · click a project to look at it · drag it to turn it · carry one onto the Coordinator for the Coordinator to read it, or onto another to connect them · ← → from one to the next · Esc to come back'),
    bishop: t('Coordinator'),
    bishopAbout: t('Your Coordinator. It reads across your projects, signs the connections between them and carries an order from one to another.'),
    bishopReads: (n) => (n ? (n === 1 ? t('It reads 1 project by a connection') : t('It reads {n} projects by connections', { n })) : t('It reads no project yet: each one it reads is a connection you sign.')),
    notLinked: t('Not connected yet: touch one to connect it'),
    talk: t('Talk to the Coordinator'),
    asleep: t('Asleep'),
    recenter: asLabel(t('RECENTER')),
    // The legend under its name, in the Memory map's words.
    legend: t('Memory kinds'),
    kinds: { ...Object.fromEntries(KINDS.map((kind) => [kind, kindWord(kind)])), dim: asLabel(t('NOT USED')) },
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
      return [data?.mac ?? null, t('{n} projects', { n: rooms.length }), waiting ? t('{n} waiting for you', { n: waiting }) : null, memoriesCount(memories)].filter(Boolean).join(' · ');
    },
    state: (room) => stateOf(room).words,
    path: homeWord,
    ask: askLine,
    kind: (kind) => kindWord(kind),
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
    // Drawn as neurons when the person chose it (public/neural.js), here or in a project.
    neural: neuralChosen(),
    actions: {
      neural: (on) => { rememberNeural(on); pushLooks(); },
      wake: async (room) => { await startRoom(room); },
      // Dragged from one universe onto another: the notes of the first would travel to the second.
      link: (source, reader) => openLinkSheet({ source: source?.id ?? null, reader: reader?.id ?? null }),
      // Planets or neurons, said once and after the map itself was (homeTour 'home-map').
      mayTellViews: () => { const seen = homeTour.state(); return Boolean(seen?.bonjourAt && seen.hints?.['home-map'] && !seen.hints['map-views'] && !document.querySelector('.tour-hint')); },
      toldViews: () => void homeTour.seen('map-views'),
      closed: () => { macroFrame?.drop(); macroFrame = null; macro = null; document.body.classList.remove('sm-in-macro'); ui.macro.focus(); },
    },
  });
  frameMacro();
});
// THE PROJECT MAP AS A WINDOW (2026-10-28), as a project's Memory map can be one (app.js,
// showNostromoDialog): the whole screen, or a window over Home from a key in its head, carried and
// sized as Home's windows are (homeWindow). How it was left is how it opens the next time.
const MACRO_WINDOW_KEY = 'pulse.homeMapWindow';
let macroFrame = null;
const macroFloats = () => { try { return localStorage.getItem(`${MACRO_WINDOW_KEY}.on`) === '1'; } catch { return false; } };
function frameMacro() {
  const layer = macro?.layer;
  if (!layer || !homeShellOn()) return;
  let key = layer.querySelector('.nostromo-float');
  if (!key) {
    key = button('mother-close nostromo-float', null, () => {
      const on = !macroFrame;
      try { localStorage.setItem(`${MACRO_WINDOW_KEY}.on`, on ? '1' : '0'); } catch { /* as long as the page lasts */ }
      frameMacro();
    });
    key.innerHTML = trazo('window'); // trusted: our own SVG
    const track = layer.querySelector('.nostromo-actions > .surface-modes');
    if (track) track.before(key); else layer.querySelector('.nostromo-actions')?.append(key);
  }
  const floating = macroFloats();
  if (floating && !macroFrame) {
    macroFrame = homeWindow({ root: layer, bar: layer.querySelector('.mv-head'), close: () => macro?.close(), key: MACRO_WINDOW_KEY, minW: 480, minH: 360, keys: false, size: { w: 980, h: 680 } });
    document.body.classList.remove('sm-in-macro');
  } else if (!floating && macroFrame) {
    macroFrame.release();
    macroFrame = null;
    document.body.classList.add('sm-in-macro');
  }
  const said = macroFrame ? t('Fill the screen') : t('Open as a window');
  key.setAttribute('aria-pressed', String(Boolean(macroFrame)));
  key.title = said;
  key.setAttribute('aria-label', said);
}
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
    // An agent that cannot answer (no session, not installed) looks switched off, as in the room.
    const key = button(`sm-agent-key ${state.key}${!state.ok && !state.busyNow ? ' off' : ''}`, null, () => openSettings('agents'));
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
  // A key, not a counter (1.0.5): how many are in force is said on the Connections tile and in its window.
  b.linksCount.hidden = true;
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
const PIN_MINUS = trazo('minus');
const PIN_ICON = trazo('pin');
const UNPIN_ICON = trazo('unpin');
const ARRANGE_ICON = trazo('arrange');
const FORGET_ICON = trazo('forget');
const MORE_ICON = trazo('more');
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
  // In the chat shell the projects at hand are the sidebar's (drawSideProjects), not the bar's.
  if (homeShellOn()) { box.hidden = true; pinsFit(); drawSideProjects(); return; }
  const ids = pinsShown();
  for (const id of ids) {
    const room = data.rooms.find((one) => one.id === id);
    const state = stateOf(room);
    const chip = pinChip(id);
    const lifted = pins.drag?.moved && pins.drag.id === id;
    chip.className = `sm-tb-room is-${busy.get(id) === 'starting' ? 'waking' : state.key}${lifted ? ' bar-lifted' : ''}${pins.dropping === id ? ' is-moving' : ''}`;
    chip.querySelector('span').textContent = room.name;
    chip.lastChild.textContent = monogram(room.name);
    // Its accent (src/looks.mjs): the key lit in its colour while the project is open.
    if ((chip.dataset.accent ?? '') !== (room.accent ?? '')) { if (room.accent) chip.dataset.accent = room.accent; else delete chip.dataset.accent; }
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
  // In the chat shell the projects at hand live in the sidebar, and it says so; its order is the
  // menu's and the drop's, so there is no bar to arrange.
  const side = homeShellOn();
  item(on ? (side ? t('Remove from the sidebar') : t('Remove from the bar')) : (side ? t('Keep in the sidebar') : t('Pin to the bar')), on ? UNPIN_ICON : PIN_ICON, () => (on ? pinRemove(room.id) : pinAdd(room.id)));
  if (!side) item(t('Arrange the bar'), ARRANGE_ICON, () => pinsEdit(true));
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
    // ⌘ , (Ctrl+, off a Mac) opens Settings, as in a project: Home said so and did nothing (2026-10-20).
    if (event.key === ',' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) { event.preventDefault(); if (settingsSheet) settingsSheet.close(); else openSettings(); return; }
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

// THE BAR FITS ITS ROW (2026-10-18). Everything on it keeps its width but the projects, so with the
// Market and Modules keys it ran under the right group and left the projects a sliver («+5»), with
// no room to drop or move one. Now, when it does not fit, the computer's name steps out first; then
// the keys keep only their icons (their name stays in the tooltip); then the agents, as on a narrow
// screen. The
// projects keep at least BAR_ROOMS of the row, and all of it while the bar is being arranged.
const BAR_ROOMS = 220;
let barWatch = null;
function fitBar() {
  const bar = document.querySelector('.sm-top > .sm-topbar:first-child');
  const rooms = ui.bar.open;
  if (!bar) return;
  for (const key of bar.querySelectorAll('.sm-barkey')) { const words = key.querySelector('span')?.textContent?.trim(); if (words) { key.title = words; key.setAttribute('aria-label', words); } }
  bar.classList.remove('is-tight', 'is-tighter', 'is-tightest');
  // The projects fold the ones that do not fit behind «+n» on their own (pinsFit): asked again at
  // each step, they are short while some are folded and they have less than BAR_ROOMS.
  const roomsShort = () => {
    if (!data || !rooms || rooms.hidden) return false;
    if (pins.editing) return rooms.scrollWidth > rooms.clientWidth + 1;
    pinsFit();
    return pins.spilled.length > 0 && rooms.clientWidth < BAR_ROOMS;
  };
  const short = () => bar.scrollWidth > bar.clientWidth + 1 || roomsShort();
  for (const step of ['is-tight', 'is-tighter', 'is-tightest']) { if (!short()) break; bar.classList.add(step); }
  if (data && !pins.editing) pinsFit();
  // What fitting changed on the bar is its own doing, not a change to fit again.
  barWatch?.takeRecords();
}
{
  const bar = document.querySelector('.sm-top > .sm-topbar:first-child');
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fitBar(); }); };
  if (bar) {
    new ResizeObserver(later).observe(bar);
    // What sits on the bar changes it: rooms pinned or opened, agents, who waits, a newer MADRE.
    barWatch = new MutationObserver((changes) => { if (changes.some((change) => change.target !== bar)) later(); });
    barWatch.observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  }
  later();
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
// `action` ({ label, run }) puts one key at its end: the Market's news says «See it» (2026-10-18).
function toast(words, tone = 'done', action = null) {
  toastNode?.remove();
  const node = el('div', 'toast sm-toast');
  node.setAttribute('role', 'status');
  node.dataset.tone = tone;
  node.append(el('i', 'toast-dot'), el('span', 'toast-text', words));
  if (action) node.append(button('toast-act', action.label, () => { node.remove(); action.run(); }));
  document.body.append(node);
  if (typeof node.showPopover === 'function') { node.popover = 'manual'; node.showPopover(); }
  toastNode = node;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.remove(); if (toastNode === node) toastNode = null; }, action ? 9000 : 5000);
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
const SEARCH_GLYPH = trazo('search');
const PAGE_BACK = trazo('back');
const PAGE_ON = trazo('next');
const FOLD_TICK = trazo('check');
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
  words.append(el('b', null, name), el('small', note ? 'note' : null, note ?? homeWord(path)));
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
  let source = 'found';         // found · browse · new
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
  // A project from nothing (2026-10-17): its name, where the folder goes (the one being walked in
  // Your folders, else the home folder) and one key. Made, it is added like any chosen folder.
  const fresh = el('form', 'sm-new-project');
  fresh.hidden = true;
  const nameField = el('label', 'sm-new-name');
  const nameInput = el('input');
  nameInput.type = 'text';
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;
  nameInput.maxLength = 120;
  nameInput.placeholder = t('my-new-project');
  nameField.append(el('span', null, t('Project name')), nameInput);
  const whereLine = el('p', 'sm-new-where');
  const makeKey = button('sm-btn primary', t('Create project'), () => {});
  makeKey.type = 'submit';
  const freshError = el('p', 'error');
  fresh.append(nameField, whereLine, makeKey, freshError);
  const parentNow = () => (here?.path && here.path !== here.home ? here.path : here?.defaultParent ?? here?.home ?? null);
  const sayWhere = () => {
    whereLine.replaceChildren(el('span', null, t('The folder is made in')), ' ', el('code', null, parentNow() ? homeWord(parentNow()) : '~'), ' ');
    const other = button('sm-new-other', t('Choose another place'), () => { touched = true; source = 'browse'; draw(); if (!here) void walk(); });
    other.type = 'button';
    whereLine.append(other);
  };
  fresh.addEventListener('submit', async (event) => {
    event.preventDefault();
    freshError.textContent = '';
    makeKey.disabled = true;
    const answer = await post('/api/salas/new', { name: nameInput.value, parent: parentNow() });
    makeKey.disabled = false;
    if (!answer.ok) { freshError.textContent = answer.body.error ?? t('It could not be created.'); nameInput.focus(); return; }
    const added = answer.body.added ?? [];
    nameInput.value = '';
    await refresh();
    if (added[0]) toast(t('{name} was created and added to Home.', { name: added[0].name }));
    onAdded?.(added);
    void loadFound();
    if (here) void walk(here.path === here.home ? null : here.path);
  });
  node.append(head, line, pages.grid, fresh, footer, error);
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
    const options = customSeg([['found', t('Found on this Mac')], ['browse', t('Your folders')], ['new', t('New project')]], source, (value) => {
      touched = true;
      source = value;
      draw();
      if (value !== 'found' && !here) void walk();
      if (value === 'new') nameInput.focus();
    });
    seg.replaceWith(options);
    seg = options;
    const making = source === 'new';
    fresh.hidden = !making;
    pages.grid.hidden = making;
    footer.hidden = making;
    search.hidden = making;
    if (making) {
      line.replaceChildren(el('span', 'sm-picker-note', t('An empty folder, made for you, that becomes a project.')));
      sayWhere();
      return;
    }
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
    if (source !== 'found') draw();
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
  icon.innerHTML = trazo('close');
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

// THE MARKET and MODULES (2026-10-18), full screen (market-view.js): the store, and what is on in
// which project. From Home a module is turned on for every project or only in one; one that writes
// into a project's folder opens that project, on its card, where its commands are read first.
const openHomeMarket = (tab = 'shop', focus = null) => openMarket({
  where: 'home',
  tab,
  focus,
  host: {
    // In the chat shell the Market is a window, as in a project (homeWindow); on a phone, the screen.
    // It opens as wide as the screen allows (2026-10-30: a box in the middle read cramped); the size
    // a person gives it is kept under a new name, so the old narrow one is not brought back.
    window: (parts) => homeWindow({ ...parts, key: 'pulse.homeMarketWindow.wide', size: { w: 1920, h: 1400 } }),
    localAi: () => openSettings('local'),
    toast: (words) => toast(words),
    changed: () => drawColophonKeys(ui.colophon),
    openProject: async (projectId, item) => {
      const answer = await post('/api/salas/start', { room: projectId });
      if (!answer.ok || !answer.body.port) return false;
      window.open(`http://127.0.0.1:${answer.body.port}/#modulo=${encodeURIComponent(item.id)}`, '_blank', 'noopener');
      return true;
    },
  },
});
document.querySelector('#sm-tb-market')?.addEventListener('click', () => void openHomeMarket('shop'));
document.querySelector('#sm-tb-modules')?.addEventListener('click', () => void openHomeMarket('mine'));
// The Market's catalog from madre.run, and what it updated on its own since, said once.
void loadMarket({ toast: (words, action) => toast(words, action ? 'news' : 'done', action), open: (id) => openHomeMarket('shop', id) });

// The agents of this computer, with everything a connection needs in one place: which account
// each one signs in with, the doors it has, the box where a pasted key goes, the address a
// sign-in opened and the code that page gives back. Home used to show a name, a lamp and one
// button — the project's panel had the rest, so the same errand was two different screens.
// Kept current while it is on screen: polled, and told by the room's events how it is going.
// `compact` is the welcome's first step: there, a connected agent is done, and a button to change
// the account it signs in with is a question nobody asked on their first minute.
// Who makes each agent, said under its name as the project's AJUSTES says it.
const VENDOR_WORDS = { codex: 'OpenAI', claude: 'Anthropic', gemini: 'Google', opencode: 'OpenCode', cursor: 'Cursor' };

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
      // What went wrong with it the last time a turn used it (src/opencode-health.mjs).
      const trouble = provider.problem === 'no-credit' ? t('No credit left: its turns are refused') : provider.problem === 'bad-key' ? t('Its key is no longer valid') : null;
      if (trouble) words.append(el('small', 'oc-problem', trouble));
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

// What went wrong with an install or a sign-in, in plain words (2026-10-28): the server names the
// cause in one word (src/setup-trouble.mjs) and this says it and what to do. Home used to drop these
// failures: the person pressed Install, nothing happened, and nothing said why.
const TROUBLE_WORDS = {
  install: {
    network: () => t('It could not download: there is no internet connection, or something on this network blocked it. Check your connection and try again.'),
    permission: () => t('This computer did not let MADRE install it. Try again; if it fails again, install it from a terminal (below).'),
    disk: () => t('There is not enough free space on this computer to install it.'),
    'npm-missing': () => t('Installing it needs Node and npm, and this computer does not have them. Install Node from nodejs.org, then try again.'),
    timeout: () => t('It took too long and was stopped. Try again.'),
    unknown: () => t('It did not install.'),
  },
  login: {
    'refused-account': () => null,
    network: () => t('It could not connect: there is no internet connection, or something on this network blocked it.'),
    timeout: () => t('The connection was not finished in time. Start it again.'),
    cancelled: () => t('You cancelled the connection.'),
    unknown: () => t('The connection did not finish.'),
  },
};
// The card of Diagnostics for each of those (public/troubleshooting.js), opened beside the failure.
const TROUBLE_CARDS = {
  install: { network: 'install-offline', timeout: 'install-offline', permission: 'install-needs-admin', disk: 'disk-full', 'npm-missing': 'node-missing' },
  login: { network: 'install-offline', timeout: 'sign-in-unfinished', cancelled: 'sign-in-unfinished', unknown: 'sign-in-unfinished' },
};
const troubleCard = (agent, kind, cause) => (kind === 'login' && cause === 'refused-account' ? (agent === 'gemini' ? 'gemini-ineligible-tier' : 'not-signed-in') : TROUBLE_CARDS[kind]?.[cause] ?? null);
function agentsPanel({ onPaint = null, compact = false, explain = null } = {}) {
  const list = el('div', 'sm-agents');
  const lastLine = new Map();   // agent → what its install or sign-in said last
  // Installing right now, from a press here (QA 1.1.0, NUE-03): the key says so and waits, instead
  // of offering «Install» again while npm works; the installer's own last line goes when it ends.
  const installing = new Set();
  const trouble = new Map();    // agent → what went wrong last, said in plain words, until it works
  const openMore = new Set();   // agents whose connection detail is unfolded
  const foldedMore = new Set(); // agents the person folded, even one that would open by itself
  let live = null;              // the sign-in running right now, as the server tells it
  let poll = 0;
  let stream = null;
  let drawn = '';               // what the list shows now: the poll redraws only when it changed

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

  // `polled`: asked by the clock, not by the person. The clock redraws only when what the server
  // says changed: a list rebuilt every 2.5 s ate the click that landed on the old one (2026-10-19).
  const paint = async ({ polled = false } = {}) => {
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
    const said = JSON.stringify(answer);
    if (polled && said === drawn && list.childNodes.length) { onPaint?.(ready, answer); return; }
    drawn = said;
    list.replaceChildren();
    for (const agent of answer.agents.filter((one) => one.id !== 'madre')) {
      const state = agentState(agent, answer);
      // The project's AJUSTES design (2026-10-13): one card per agent, folded to a line that says
      // who it is and whether it has a session. One that needs the person opens by itself.
      // One that needs the person opens by itself, and still closes when the person folds it (1.0.5).
      const unfolded = !foldedMore.has(agent.id) && (openMore.has(agent.id) || !state.ok || state.busyNow || (live && live.agent === agent.id));
      const item = el('section', `sm-agent${state.ok ? ' ok' : ''}${unfolded ? ' open' : ''}`);
      item.dataset.agent = agent.id;
      // What opens is brought into view: the window grows downwards and an agent low in the list
      // opened below the edge of the screen, as if the arrow had done nothing.
      const head = button('sm-agent-head', null, async () => {
        if (unfolded) { openMore.delete(agent.id); foldedMore.add(agent.id); } else { foldedMore.delete(agent.id); openMore.add(agent.id); }
        await paint();
        if (openMore.has(agent.id)) list.querySelector(`.sm-agent[data-agent="${agent.id}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      });
      head.setAttribute('aria-expanded', String(unfolded));
      const words = el('span', 'sm-agent-words');
      words.append(el('b', null, agent.label ?? agent.id), el('small', null, VENDOR_WORDS[agent.id] ?? ''));
      const chip = el('span', `sm-agent-chip session-lamp ${state.key}`);
      chip.append(el('span', null, state.words));
      head.append(mark(agent.id, 34), words, chip, el('span', 'sm-chevron'));
      item.append(head);
      const body = el('div', 'sm-agent-body');
      // The welcome says first what this agent needs (public/welcome.js): Gemini's key, Cursor's own
      // installer, a code when MADRE runs on another computer.
      const why = explain?.(agent, state, answer);
      if (why) body.append(why);
      // Which account it is signed in with, as its own CLI reports it, and which one it asks for.
      const facts = el('div', 'sm-agent-facts');
      if (agent.detected && agent.version) facts.append(el('code', 'sm-agent-line', `${agent.version}${agent.path ? ` · ${agent.path}` : ''}`));
      const said = agent.detected ? sessionDetail(answer.sessions?.[agent.id]) : null;
      if (said) facts.append(el('small', 'sm-agent-line', said));
      // In the welcome, Gemini's account is already said above its card (welcome.js, explainAgent):
      // said twice in two ways, it read as two different requirements (QA 1.1.0, NUE-04).
      if (agent.account && !(compact && agent.id === 'gemini' && !state.ok)) facts.append(el('small', 'sm-agent-note', agent.account));
      // Installed, the installer's last line («added 2 packages in 4s») has nothing left to say.
      if (agent.detected && !installing.has(agent.id) && !state.busyNow && !answer.loggingIn) lastLine.delete(agent.id);
      if (lastLine.has(agent.id) && !state.ok && !trouble.has(agent.id)) {
        const said = lastLine.get(agent.id);
        const line = el('small', 'sm-agent-line', said.line);
        if (said.url) { const link = el('a', null, t('Open the sign-in page')); link.href = said.url; link.target = '_blank'; link.rel = 'noopener'; line.append(' ', link); }
        facts.append(line);
      }
      if (facts.childNodes.length) body.append(facts);
      // What went wrong, said where it happened, with what the program printed last for whoever
      // wants to look closer. It goes away once the agent works.
      if (state.ok) trouble.delete(agent.id);
      const wrong = trouble.get(agent.id);
      if (wrong && !state.busyNow) {
        const box = el('div', `sm-agent-trouble${wrong.tone === 'quiet' ? ' quiet' : ''}`);
        box.setAttribute('role', 'status');
        box.append(el('p', null, wrong.words));
        if (wrong.detail) {
          const more = el('details', 'sm-agent-trouble-more');
          more.append(el('summary', null, t('What it said')), el('code', null, wrong.detail));
          box.append(more);
        }
        if (wrong.card) box.append(remedyKey(wrong.card));
        body.append(box);
      }
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
          const key = button(`sm-btn ${(state.ok && !choosing) || agent.key?.first ? '' : 'primary'} small`, name, async (event) => {
            if (door.choose) { choosingAccount.add(agent.id); void paint(); return; }
            choosingAccount.delete(agent.id);
            event.currentTarget.disabled = true;
            trouble.delete(agent.id);
            const answer = await post(`/api/agents/${agent.id}/login`, { method: door.id });
            if (!answer.ok) trouble.set(agent.id, { kind: 'login', words: answer.body?.error ?? t('The connection did not finish.') });
            void paint();
          });
          if (door.note) key.title = t(door.note);
          return key;
        });
      };
      // Gemini's key is its way in (agent.key.first): the field before the Google door.
      const keyFirst = Boolean(agent.detected && agent.key?.first);
      if (keyFirst) body.append(keyForm(agent));
      const acts = el('div', 'sm-agent-acts');
      if (!state.busyNow) {
        if (!agent.detected && installing.has(agent.id)) {
          const wait = button('sm-btn primary small is-busy', t('Installing…'), () => {});
          wait.disabled = true;
          wait.setAttribute('aria-busy', 'true');
          acts.append(wait);
        } else if (!agent.detected && agent.install?.command) acts.append(button('sm-btn primary small', wrongAt(agent.id, 'install') ? t('Try again') : t('Install'), async (event) => {
          event.currentTarget.disabled = true;
          event.currentTarget.textContent = t('Installing…');
          trouble.delete(agent.id);
          installing.add(agent.id);
          const answer = await post(`/api/agents/${agent.id}/install`);
          if (!answer.ok) { installing.delete(agent.id); trouble.set(agent.id, { kind: 'install', words: answer.body?.error ?? t('It did not install.') }); }
          void paint();
        }));
        else if (agent.detected && agent.login?.headless) for (const key of doorKeys()) acts.append(key);
      }
      // Installed by hand in a terminal (its own installer): one press looks for it again. In the
      // welcome its line is unfolded, and the key says what the person just did.
      const byHand = !agent.detected && agent.install && !agent.install.command;
      if (byHand && compact) openWays.add(agent.id);
      if (byHand) acts.append(button('sm-btn small', compact ? t('I did it') : t('Check again'), async (event) => { event.currentTarget.disabled = true; await post('/api/agents/probe'); void paint(); }));
      if (acts.childNodes.length) body.append(acts);
      const ask = askBlock(agent);
      if (ask) body.append(ask);
      // A key, pasted here; OpenCode's are its providers', in the block below.
      if (agent.detected && agent.key && agent.id !== 'opencode' && !keyFirst) body.append(keyForm(agent));
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
    poll = setInterval(() => { if (!document.hidden) void paint({ polled: true }); }, 2500);
    try {
      stream = new EventSource('/api/events');
      stream.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event.type === 'connection.login.output' || event.type === 'connection.install.output') lastLine.set(event.payload.agent, { line: event.payload.line, url: event.payload.url ?? null });
          // An install or a sign-in that ended without working says why, in plain words.
          if (event.type === 'connection.install.finished' || event.type === 'connection.login.finished') {
            const { agent, trouble: cause, error, tail } = event.payload ?? {};
            const kind = event.type === 'connection.install.finished' ? 'install' : 'login';
            if (kind === 'install') { installing.delete(agent); if (!cause) lastLine.delete(agent); }
            if (cause) {
              const words = TROUBLE_WORDS[kind][cause]?.() ?? error ?? TROUBLE_WORDS[kind].unknown();
              trouble.set(agent, { kind, words: cause === 'refused-account' ? error : words, tone: cause === 'cancelled' ? 'quiet' : null, detail: (tail ?? []).slice(-3).join('\n') || error || null, card: troubleCard(agent, kind, cause) });
            } else trouble.delete(agent);
          }
          if (/^connection\./.test(event.type)) void paint();
        } catch { /* not ours */ }
      };
    } catch { /* no stream: the poll keeps it current */ }
  };
  const wrongAt = (id, kind) => trouble.get(id)?.kind === kind;
  const stop = () => { clearInterval(poll); poll = 0; stream?.close(); stream = null; };
  return { node: list, paint, live: liveOn, stop };
}

// ---- The first time: three steps. The agents (connected once, for every project: a CLI's session
// is this computer's, not a project's), the projects, and which to open now. Over each step, a
// scene of what it is about, moving: the agents come to MADRE and light up as they are connected;
// the folders drop into the lobby; the rooms light up one after another as the beat runs through
// them. Drawn here, from MADRE's own marks; still for whoever asked for less motion.
// Five since Cursor joined (1.0.3): the four around MADRE, and Cursor above her.
const SCENE_AGENTS = [['codex', 17, 30], ['claude', 27, 78], ['cursor', 50, 17], ['gemini', 83, 30], ['opencode', 73, 78]];
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
// THE WELCOME (2026-10-28, public/welcome.js): seven steps that leave MADRE ready — agents, an AI on
// this computer, the memory's search and the first project —, adapted to where MADRE runs. It took
// the place of the three steps of 1.0 (agents, projects, open). Home hands it its own panel of
// agents and its picker of folders, so the welcome and Home never say a thing two ways.
const welcomeHost = {
  agentsPanel: (options) => agentsPanel(options),
  projectPicker: (options) => projectPicker(options),
  mark: (id, size) => mark(id, size),
  closeKey: (onClick) => closeKey(onClick),
  agentState: (agent, answer) => agentState(agent, answer),
  projects: () => (data ? projectsInOrder().all : []),
  openProject: (room) => startRoom(room, { enter: true }),
  setLanguage: (code) => adoptLanguage(code),
  openLinks: () => openLinkSheet(),
  openMarket: () => void openHomeMarket('shop'),
  chapters: () => homeTour.openChapters('home'),
  saved: (welcome) => { welcomeSeen = welcome; drawAttention(); },
  closed: () => { void loadAgents(); void refresh(); },
};
function openHomeWelcome({ at = null, then = null } = {}) {
  welcomed = true;
  return openWelcome({ at, then, host: welcomeHost });
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
  ['System', 'The projects of this Mac, the version and the manual', ['projects', 'release', 'manual']],
];
// The room's own icons where the room has the category (app.js, SETTINGS_CATS); the bar, BISHOP
// and the projects drawn here in the same hand: 20×20, one round stroke.
const SET_CATS = {
  look: { name: 'Appearance', icon: trazoDrawing('appearance') },
  bar: { name: 'Top bar', icon: trazoDrawing('arrange') },
  agents: { name: 'Agents', icon: trazoDrawing('agents') },
  bishop: { name: 'Coordinator', icon: trazoDrawing('coordinator') },
  local: { name: 'Local AI', icon: trazoDrawing('spark') },
  projects: { name: 'Projects', icon: trazoDrawing('folder') },
  release: { name: 'Version', icon: trazoDrawing('refresh') },
  manual: { name: 'User manual', icon: trazoDrawing('book') },
};
const SET_ORDER = ['look', 'bar', 'agents', 'bishop', 'local', 'projects', 'release'];
// The words the search knows, each pointing to the category that holds it (app.js, SETTINGS_INDEX).
const SET_INDEX = [
  ['look', 'Preview'], ['look', 'Theme'], ['look', 'Accent'], ['look', 'Wallpaper'], ['look', 'Intensity'], ['look', 'Blur'], ['look', 'Project cards'], ['look', 'Text'], ['look', 'Project order'], ['look', 'Language'],
  ['bar', 'Arrange the bar'], ['bar', 'Back to default'],
  ['bishop', 'Talk to the Coordinator'], ['bishop', 'Open the Coordinator in a new tab'],
  ['local', 'Ollama'], ['local', 'Automatic'], ['local', 'One by one'], ['local', 'Manual'],
  ['projects', 'Add a project'], ['projects', 'See the welcome again'], ['projects', 'The tour of MADRE 1.0'],
  ['release', 'Check now'], ['release', 'Uninstall MADRE'],
];
const THEME_WORDS = { auto: () => t('Automatic'), light: () => t('Light'), dark: () => t('Dark') };
// In the chat shell the projects at hand live in the sidebar, and Settings calls them so (2026-10-28).
const SIDEBAR_CAT = trazoDrawing('sidebar');
const catName = (id) => (id === 'bar' && homeShellOn() ? t('Sidebar') : t(SET_CATS[id].name));
const setIcon = (id) => { const span = el('span', 'settings-icon'); span.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${id === 'bar' && homeShellOn() ? SIDEBAR_CAT : SET_CATS[id].icon}</svg>`; span.style.setProperty('--cat', 'var(--phosphor)'); return span; }; // trusted: our own SVG strings
const CHEVRON = trazo('chevron');
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
// The user manual (1.0.5): its own page in Home's language, and the same manual in PDF.
function openManual() { window.open(`/manual?lang=${language}`, '_blank', 'noopener'); }
function setStatus(id) {
  if (id === 'manual') return { line: t('With pictures, step by step. Also as a PDF.') };
  const looks = readLooks();
  // The new design shows no wallpaper (salas-mac.css, .sm-sky), so the summary no longer names one
  // that is nowhere to be seen (QA 1.1.0, ACT-06).
  if (id === 'look') return { line: document.documentElement.classList.contains('chat-shell')
    ? `${THEME_WORDS[looks.theme]()} · ${ACCENT_WORDS[looks.accent]()}`
    : `${THEME_WORDS[looks.theme]()} · ${WALLPAPER_WORDS[looks.wallpaper]()} · ${ACCENT_WORDS[looks.accent]()}` };
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
  if (id === 'manual') {
    const pdf = el('a', 'sx-btn settings-manual-pdf', t('PDF'));
    pdf.href = `/assets/manual/madre-manual-${language}.pdf`;
    pdf.setAttribute('download', '');
    pdf.addEventListener('click', (event) => event.stopPropagation());
    add(t('Download it to print or share'), pdf);
  }
  if (id === 'look') {
    const { theme } = readLooks();
    const seg = el('div', 'settings-seg');
    for (const [value, word] of [['auto', t('Auto')], ['light', t('Light')], ['dark', t('Dark')]]) {
      seg.append(button(value === theme ? 'on' : null, word, (event) => { event.stopPropagation(); saveLooks({ theme: value }); }));
    }
    add(t('Theme'), seg);
  }
  if (id === 'bar' && !homeShellOn()) add(t('Arrange the bar'), sxButton(t('Arrange'), (event) => { event.stopPropagation(); settingsSheet?.close(); pinsEdit(true); }));
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
  coord.append(head, el('small', null, t('Active')), el('span', 'hp-key', t('Talk to the Coordinator')));
  grid.append(coord);
  names.forEach((name, index) => {
    const card = el('div', 'hp-tile hp-card');
    const state = el('small', 'hp-state');
    state.append(el('i'), index ? t('Asleep') : t('Active'));
    card.append(el('b', null, name), state, el('span', 'hp-chat'), el('span', 'hp-strip'), el('span', `hp-key${index ? '' : ' on'}`, t('Open')));
    grid.append(card);
  });
  preview.append(bar, grid);
  // Home as it looks now (2026-10-28), in the chat shell: the sidebar, the bar, and flat cards on the
  // canvas, in the theme and accent chosen — the old preview drew the Home of glass and pills.
  if (root.classList.contains('home-shell')) {
    preview.classList.add('shell');
    const side = el('div', 'hps-side');
    const brand = el('i', 'hps-brand');
    side.append(brand);
    for (const [words, on] of [[t('Home'), true], [t('Coordinator'), false], [t('Market'), false]]) side.append(el('span', `hps-row${on ? ' on' : ''}`, words));
    side.append(el('small', 'hps-label', t('Projects')));
    names.forEach((name, index) => { const row = el('span', 'hps-row hps-project'); row.append(el('i', index ? 'asleep' : null), name); side.append(row); });
    const main = el('div', 'hps-main');
    const top = el('div', 'hps-top');
    top.append(el('b', null, t('Home')), el('span', 'hps-keys'));
    const tiles = el('div', 'hps-tiles');
    const coordTile = el('div', 'hps-tile hps-coord');
    const coordHead = el('div', 'hp-head');
    coordHead.append(el('span', 'hp-mark'), el('b', null, t('Coordinator')));
    coordTile.append(coordHead, el('span', 'hps-key on', t('Talk to the Coordinator')));
    const waiting = el('div', 'hps-tile hps-wait');
    waiting.append(el('b', null, t('Waiting on you')), el('strong', null, '0'));
    const cards = el('div', 'hps-tile hps-cards');
    names.forEach((name, index) => {
      const card = el('div', 'hps-card');
      const state = el('small', 'hp-state');
      state.append(el('i'), index ? t('Asleep') : t('Active'));
      card.append(el('b', null, name), state, el('span', 'hp-chat'), el('span', `hps-key${index ? '' : ' on'}`, t('Open')));
      cards.append(card);
    });
    tiles.append(coordTile, waiting, cards);
    main.append(top, tiles);
    preview.replaceChildren(side, main);
  }
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
  // The chat shell's look has no picture behind Home or a project (2026-10-26): no wallpaper to choose.
  if (!document.documentElement.classList.contains('chat-shell')) {
    sxBlock(page, t('Wallpaper'), photo
      ? t('The project\'s background can be a photograph, shown as a layer or as a mesh of its colors: choose how strong it looks and how much the photograph blurs.')
      : t('Behind Home, and behind the conversation of the project served at this address. Light and dark each have their own.')).rows.append(paperBox);
  }

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
  const side = homeShellOn();
  const block = side
    ? sxBlock(host, t('Sidebar'), t('The projects you keep at hand in the sidebar, in the order you choose. A project comes to it from its card: right-click it, or drag it onto the list.'))
    : sxBlock(host, t('Top bar'), t('The projects you keep at hand, in the order you choose. A project comes to the bar from its card: right-click it, or drag it to the bar.'));
  const ids = pinsShown();
  if (!ids.length) sxRow(block, side ? t('No project in the sidebar yet') : t('Nothing pinned'), null);
  for (const id of ids) {
    const room = data.rooms.find((one) => one.id === id);
    sxRow(block, room.name, stateOf(room).words, sxButton(t('Remove'), () => pinRemove(id)));
  }
  const acts = el('div', 'sx-actions end');
  if (pinsStored()) acts.append(sxButton(t('Back to default'), () => pinsReset()));
  if (!side) acts.append(sxButton(t('Arrange the bar'), () => { settingsSheet?.close(); pinsEdit(true); }, { tone: 'primary' }));
  if (acts.childElementCount) host.append(acts);
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
// show. Since 2026-10-20 Ollama itself is governed here too, as the agents are: the server, the
// switch for the whole computer and the model every project uses. What it does in one project
// (its roles) stays in that project's Settings › Local AI.
const LOCAL_MODE_WORDS = { auto: () => t('Automatic'), pick: () => t('One by one'), manual: () => t('Manual') };
const LOCAL_MODE_SAYS = {
  auto: () => t('Every project uses it, new ones too.'),
  pick: () => t('Only the projects you switch on below. New projects start without it.'),
  manual: () => t('Each project decides in its own Settings › Local AI. New ones start with it.'),
};
let localFailed = false;        // the last read got no answer: the sheet says so instead of «Reading…» forever
let localHardware = null;       // what this computer can run and train (src/modules/local-models.mjs)
let localOllama = null;         // what /api/ollama said: the server, its models, and every model this computer may choose
let localAllModels = false;     // «See every model» was pressed
async function loadLocal({ probe = false } = {}) {
  const answer = await fetch('/api/salas/local-ai', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  const ollama = probe ? await post('/api/ollama/probe').then((reply) => (reply.ok ? reply.body : null))
    : await fetch('/api/ollama', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (ollama?.recommended?.hardware) localHardware = ollama.recommended.hardware;
  if (ollama?.ollama) localOllama = ollama;
  if (answer) localSeen = answer;
  localFailed = !answer;
  settingsSheet?.sync({ detail: true, only: 'local' });
  return answer;
}
async function saveLocal(patch) {
  const answer = await post('/api/salas/local-ai', patch);
  if (!answer.ok) { toast(answer.body?.error ?? t('Home did not answer.')); return; }
  localSeen = answer.body;
  if (localSeen.later?.length) toast(t('{names} will use it when restarted: it was started before this setting existed.', { names: localSeen.later.join(', ') }));
  settingsSheet?.sync({ detail: true, only: 'local' });
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
  drawLocalServer(host);
  drawLocalModel(host);
  const mode = sxBlock(host, t('Which projects'), LOCAL_MODE_SAYS[localSeen.mode]());
  sxRow(mode, t('Mode'), null, localModeSeg());
  // What this computer can run and train, as a project shows it in Settings › Local AI.
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
// Ollama for the whole computer: is it there, is it running, is the local AI on at all.
function drawLocalServer(host) {
  const info = localOllama?.ollama ?? null;
  const block = sxBlock(host, t('Ollama'), t('One for the whole computer: every project uses the same one.'));
  if (!info) { sxRow(block, t('Reading…'), null); return; }
  const recheck = sxButton(t('Check again'), async () => { recheck.disabled = true; await loadLocal({ probe: true }); });
  sxRow(block, t('Server'), info.running ? t('Running · {host}', { host: info.host }) : t('Not running'), recheck);
  // Where Ollama is (2026-10-28, src/server.mjs, /api/local-ai/host): this computer's, or another
  // one's — Windows' own from inside WSL, a computer with a graphics card —, tried before it is kept.
  const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(info.host ?? '');
  const address = el('form', 'sm-agent-key-form sm-ollama-host');
  const field = el('input');
  field.type = 'text';
  field.spellcheck = false;
  field.autocomplete = 'off';
  field.value = local ? '' : info.host ?? '';
  field.placeholder = 'http://192.168.1.40:11434';
  field.setAttribute('aria-label', t('Ollama address'));
  const test = sxButton(t('Test'), () => {});
  test.type = 'submit';
  const keep = async (host) => {
    test.disabled = true;
    const answer = await post('/api/local-ai/host', { host });
    test.disabled = false;
    if (!answer.ok) { toast(answer.body?.error ?? t('Home did not answer.')); return; }
    await loadLocal({ probe: true });
  };
  address.addEventListener('submit', (event) => { event.preventDefault(); void keep(field.value.trim()); });
  address.append(field, test);
  if (!local) address.append(sxButton(t('This computer'), () => void keep(null)));
  sxRow(block, t('Ollama address'), local ? t('This computer. Write another computer\'s address to use its AI.') : t('Another computer\'s. Every project uses it.'), address, { stack: true });
  if (!info.running) {
    const step = info.binary
      ? { label: t('Start Ollama'), path: '/api/ollama/start', note: t('Wakes Ollama on this computer. Nothing leaves it.') }
      : info.install?.display ? { label: t('Install Ollama'), path: '/api/ollama/install', note: info.install.note ?? info.install.display } : null;
    if (step) {
      const go = sxButton(step.label, async () => {
        go.disabled = true;
        const answer = await post(step.path);
        if (!answer.ok) { if (answer.body?.download) window.open(answer.body.download, '_blank', 'noopener'); toast(answer.body?.error ?? t('Home did not answer.')); go.disabled = false; return; }
        await loadLocal({ probe: true });
      }, { tone: 'primary' });
      sxRow(block, step.label, step.note, go);
    } else if (info.install?.download) {
      sxRow(block, t('Get Ollama'), null, sxButton(t('Download ↗'), () => window.open(info.install.download, '_blank', 'noopener'), { tone: 'primary' }));
    }
    sxRow(block, t('Meanwhile'), t('Projects keep working with their agents.'));
  }
  const master = el('label', 'settings-switch');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = Boolean(localSeen.master);
  box.setAttribute('aria-label', t('Local AI'));
  box.addEventListener('change', async () => {
    box.disabled = true;
    await post('/api/ollama/settings', { enabled: box.checked });
    // Said to every open project at once, as a change of mode is.
    await saveLocal({});
    await loadLocal();
  });
  master.append(box, el('i'));
  sxRow(block, t('Local AI on this computer'), localSeen.master ? t('On. The projects you choose below use it.') : t('Off for every project.'), master);
}
// The model every project uses: MADRE's pick, or the person's, among the ones installed; then the
// ones this computer runs that are not here yet, the recommended one first.
const EMBEDDING = /embed|minilm|bge|nomic/i;
// The model that fits this computer best, said the way the room's tags say things: a small pill in
// the accent beside its name, never a grey bar the width of the row (2026-10-20).
const RECOMMENDED_ICON = trazo('star-filled');
function recommendedChip() {
  const chip = el('span', 'sx-recommend');
  chip.innerHTML = RECOMMENDED_ICON; // trusted: our own SVG string
  chip.append(el('span', null, t('Recommended for your computer')));
  return chip;
}
function drawLocalModel(host) {
  const info = localOllama?.ollama;
  if (!info?.running || !localSeen.master) return;
  const catalog = localOllama.recommended?.catalog ?? [];
  const known = (name) => catalog.find((one) => one.ollama === String(name).replace(/:latest$/, '')) ?? null;
  const best = catalog.find((one) => one.recommended) ?? null;
  const chosen = localSeen.model ?? null;
  const using = localSeen.ollama?.using ?? info.chatModel ?? null;
  const block = sxBlock(host, t('Model'), t('The one that answers as @madre and sums up the memory, in every project that uses the local AI.'));
  const pick = (model) => async () => { await saveLocal({ model }); await loadLocal(); };
  const inUse = () => el('span', 'sx-chip on', t('In use'));
  const autoWords = localSeen.ollama?.auto ? t('MADRE picks the best one installed: {model}.', { model: localSeen.ollama.auto }) : t('MADRE picks the best one installed.');
  sxRow(block, t('Automatic'), autoWords, chosen ? sxButton(t('Use'), pick(null)) : inUse());
  const chats = (info.models ?? []).filter((model) => !EMBEDDING.test(model.name) && !EMBEDDING.test(model.family ?? ''));
  for (const model of chats) {
    const face = known(model.name);
    const hint = [face?.maker, model.size ? gb(model.size) : null, face && face.run === 'no' ? t('May not fit in this computer\'s memory') : null].filter(Boolean).join(' · ');
    const row = sxRow(block, face?.label ?? model.name, hint, chosen && model.name === using ? inUse() : sxButton(t('Use'), pick(model.name)));
    if (face?.recommended) row.querySelector('.sx-words b')?.after(recommendedChip());
  }
  if (!chats.length) sxRow(block, t('No model yet'), t('Download one below: MADRE starts using it as soon as it arrives.'));
  // What this computer runs and has not got yet.
  const have = new Set(chats.map((model) => model.name.replace(/:latest$/, '')));
  const runs = catalog.filter((one) => one.run !== 'no' && !have.has(one.ollama))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.params - a.params);
  if (!runs.length) return;
  const more = sxBlock(host, t('More models for your computer'), t('Only the ones that fit in its memory. Each downloads once and stays in Ollama.'));
  for (const one of localAllModels ? runs : runs.slice(0, 5)) {
    const hint = [one.maker, t(one.note), one.run === 'slow' ? t('Slow without a graphics card') : null].filter(Boolean).join(' · ');
    const get = sxButton(pulling.has(one.ollama) ? t('Downloading…') : t('Download'), async () => {
      get.disabled = true;
      const answer = await post('/api/ollama/pull', { model: one.ollama });
      if (!answer.ok) { toast(answer.status === 409 ? t('Another download is running. When it ends, try this one.') : answer.body?.error ?? t('Home did not answer.')); get.disabled = false; return; }
      get.textContent = t('Downloading…');
      watchPull(one.ollama);
    }, { tone: one.recommended ? 'primary' : null });
    // Redrawn while it downloads: it stays «Downloading…», not a second «Download».
    if (pulling.has(one.ollama)) get.disabled = true;
    const row = sxRow(more, one.label, hint, get);
    if (one.recommended) row.querySelector('.sx-words b')?.after(recommendedChip());
  }
  if (runs.length > 5) {
    const all = sxButton(localAllModels ? t('See fewer') : t('See every model ({n})', { n: runs.length }), () => { localAllModels = !localAllModels; settingsSheet?.sync({ detail: true }); });
    sxRow(more, '', null, all);
  }
}
// A download takes minutes: Home looks every few seconds until the model is there, then says so.
const pulling = new Set();
function watchPull(model) {
  if (pulling.has(model)) return;
  pulling.add(model);
  toast(t('Downloading {model}. It shows here when it arrives.', { model }));
  const started = Date.now();
  const look = async () => {
    await loadLocal({ probe: true });
    if ((localOllama?.ollama?.models ?? []).some((one) => one.name.replace(/:latest$/, '') === model)) { pulling.delete(model); toast(t('{model} is ready. Choose it in Settings › Local AI.', { model })); return; }
    if (Date.now() - started > 60 * 60 * 1000) { pulling.delete(model); return; }
    setTimeout(look, 8000);
  };
  setTimeout(look, 8000);
}
function fillProjects(host) {
  const block = sxBlock(host, t('Projects'), t('A project is a folder: MADRE gives it its own conversations and its own memory. Adding it does not open it; you open it from its card.'));
  sxRow(block, t('Add a project'), null, sxButton(t('Add'), () => { settingsSheet?.close(); openAddSheet(); }, { tone: 'primary' }));
  sxRow(block, t('See the welcome again'), t('Agents, AI on your computer, memory and a project, step by step.'), sxButton(t('Open'), () => { settingsSheet?.close(); openHomeWelcome({ at: 'hello' }); }));
  const back = homeTour.path() === 'back';
  sxRow(block, back ? t('The tour of MADRE 1.0') : t('Getting to know MADRE'), back ? t('Everything new, chapter by chapter. ? opens the gestures anywhere.') : t('The essentials, chapter by chapter. ? opens the gestures anywhere.'), sxButton(t('See the tour'), () => { settingsSheet?.close(); homeTour.openChapters(); }));
}
function fillRelease(host) {
  const info = versionSeen;
  // Up to date there is nothing to restart with (QA 1.1.0, ACT-14).
  const block = sxBlock(host, t('Version'), info ? (info.available ? t('You run {version}. Home restarts with it from here.', { version: info.current }) : t('You run {version}, the newest.', { version: info.current })) : null);
  const check = info?.enabled ? sxButton(t('Check now'), async () => {
    check.disabled = true;
    const answer = await fetch('/api/version?force=1', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    if (answer) versionSeen = answer;
    drawAttention();
    drawTopbar();
    settingsSheet?.sync({ detail: true });
  }) : null;
  sxRow(block, `MADRE ${info?.current ?? ''}`.trim(), info ? (info.available ? t('{version} available', { version: info.latest }) : info.enabled === false ? t('not checked') : t('up to date')) : t('Reading…'), check);
  // The one thing the daily usage notice says about this copy (src/heartbeat.mjs), in sight.
  if (info?.copyId) {
    const copy = sxButton(t('Copy'), async () => {
      try { await navigator.clipboard.writeText(info.copyId); copy.textContent = t('Copied'); setTimeout(() => { copy.textContent = t('Copy'); }, 1400); } catch { toast(t('Select it and copy it.'), 'error'); }
    });
    const row = sxRow(block, t('This copy\'s identifier'), t('Random and unique: this copy made it for itself. It lets the author tell one copy\'s errors from another\'s and find the fix for yours, without knowing who you are: no name, no projects.'), copy);
    row.querySelector('.sx-words')?.append(el('code', 'sm-install-id', info.copyId));
  }
  drawDonate(host);
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
  // Uninstalling MADRE (2026-10-29): what goes and what stays is said before anything happens
  // (public/power.js, askUninstall).
  const leave = sxBlock(host, t('Uninstall MADRE'), t('Takes away what MADRE put on this computer: its conversations, memory and settings, and its folder inside your projects. Your projects and your AIs stay.'));
  sxRow(leave, t('Remove MADRE from this computer'), t('You will see the whole list before anything is removed.'), sxButton(t('Uninstall…'), () => void askUninstall(), { tone: 'danger' }));
  drawLegal(host);
}
// Supporting MADRE (2026-10-30): a donation on GitHub Sponsors, in the person's browser, under the
// version and this copy's identifier, as a project's Settings › Version has it (app.js).
function drawDonate(host) {
  const give = sxBlock(host, t('Support MADRE'), t('MADRE is free and made by one person. A donation helps keep it going and growing.'));
  const go = el('a', 'sx-btn primary', t('Donate'));
  go.href = SPONSORS_URL;
  go.target = '_blank';
  go.rel = 'noopener';
  sxRow(give, t('Donate on GitHub'), t('Once or every month, the amount you choose. GitHub keeps no commission.'), go);
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
  search.innerHTML = trazo('search'); // trusted: our own SVG
  const input = el('input');
  input.type = 'search';
  input.placeholder = t('Search any setting');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', t('Search any setting'));
  search.append(input);
  head.append(el('span', 'custom-title', t('Settings')), search, closeKey(() => dialog.close()));
  const body = el('div', 'sm-settings-body');
  win.append(head, body);
  dialog.append(win);
  document.body.append(dialog);
  // A window of Home in the chat shell (2026-10-28), as a project's Settings is one: not modal,
  // carried by its head, sized by its sides, its place kept (homeWindow). Its own × stays.
  const framed = homeWindow({ root: dialog, bar: head, close: () => dialog.close(), key: 'pulse.homeSettingsWindow', minW: 560, minH: 420, keys: false, size: { w: 980, h: 700 } });
  if (framed) {
    dialog.classList.add('sm-settings-framed');
    // Not modal, so Escape is asked here; it steps back the same way the modal sheet's does.
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      const ask = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(ask);
      if (!ask.defaultPrevented) dialog.close();
    });
  }

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
    // The manual is a page of its own, not a panel.
    const go = () => (id === 'manual' ? openManual() : openCategory(id));
    node.addEventListener('click', go);
    node.addEventListener('keydown', (event) => { if (event.target === node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); go(); } });
    return node;
  };
  const board = () => {
    const node = el('div', 'settings-board');
    for (const [name, sub, ids] of SET_SECTIONS) {
      const section = el('section', 'settings-section');
      const top = el('header');
      top.append(el('b', null, t(name)), el('span', null, t(homeShellOn() && sub === 'How Home looks and what its bar holds' ? 'How Home looks and what its sidebar holds' : sub)));
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
    // Every category opens over the board from the side, Appearance too, as in a project's Settings
    // (2026-10-28: it took the whole window, and read as another screen rather than one of its sheets).
    const full = false;
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
    if (id === 'manual') { openManual(); return; }
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
  // `only`: draw the open category again only when it is that one (a model downloading reloads Local
  // AI every few seconds, and redrew whatever was open — a key half pasted in Agents was lost).
  const sync = ({ detail: again = false, only = null } = {}) => {
    if (state.query.trim()) return;
    if (only && state.open !== only) again = false;
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
    if (!dialog.open) { if (framed) { dialog.show(); framed.raise(); } else dialog.showModal(); }
    if (wanted && SET_FILL[wanted]) openCategory(wanted); else draw();
  };
  const close = () => dialog.close();
  settingsSheet = { show, paintLooks, sync, close };
  dialog.addEventListener('close', () => { stop(); framed?.drop(); dialog.remove(); settingsSheet = null; });
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
  document.querySelector('.sm-topbar:not(.sm-tb-home)')?.setAttribute('aria-label', t('Home'));
  document.querySelector('.sm-tb-home')?.setAttribute('aria-label', t('Reload and settings'));
  ui.colophon.setAttribute('aria-label', t('MADRE version'));
  ui.bar.agents.setAttribute('aria-label', t('Agents'));
  ui.bar.links.querySelector('span').textContent = t('Connections');
  document.querySelector('#sm-tb-market span')?.replaceChildren(t('Market'));
  document.querySelector('#sm-tb-modules span')?.replaceChildren(t('Modules'));
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
  // A claim the room found false is said as everywhere else: a doubtful memory, not «aberration».
  for (const kind of KINDS) KIND_WORDS[kind] = t(kind === 'aberration' ? 'DOUBTFUL MEMORY' : kind.toUpperCase());
  sayHomeShell();
}

// ---- HOME IN THE CHAT SHELL (2026-10-27) ------------------------------------------------------
// Home framed as a project is (app.js, chatShell): a sidebar at the left that one key shows and
// hides — MADRE, the ways to go, the projects at hand, the version and the house's keys at its
// foot —, a bar of 48 px over the canvas with the page's name, the agents and the tools as quiet
// icons, and the widgets flat on the canvas. The same classes as the room's sidebar (styles.css,
// .side-*), so moving between Home and a project feels like one place. The projects at hand are
// the ones the bar held (the pins: the open ones, until the person chooses), and a card dropped on
// the list pins it there. Not on a phone, where the bar keeps them as before.
const SIDE_KEY = 'pulse.homeSide';
const SIDEBAR_GLYPH = trazo('sidebar');
const HOME_GLYPH = trazo('home');
// The Market drawn one way everywhere (2026-10-30): the basket with the modules inside; only the top bar's key moves on hover.
const MARKET_GLYPH = trazo('market-key');
const COORDINATOR_GLYPH = trazo('coordinator');
const ALL_GLYPH = trazo('list');
const homeShell = { side: null, list: null, said: '', open: false };
const homeShellOn = () => root.classList.contains('home-shell');
// A phone keeps Home as it was; a narrow window gets the sidebar over the canvas, shut at first.
const SHELL_PHONE = '(max-width: 560px)';
const SHELL_NARROW = '(max-width: 960px)';
function sideKey(icon, label, run) {
  const key = button('shell-key', null, (event) => { event.stopPropagation(); run(); });
  key.innerHTML = icon; // trusted: our own SVG strings
  key.setAttribute('aria-label', label);
  key.title = label;
  return key;
}
function sideRow(icon, label, run, { here = false } = {}) {
  const row = button('side-row', null, run);
  row.innerHTML = icon; // trusted: our own SVG strings
  row.append(el('span', null, label));
  if (here) row.setAttribute('aria-current', 'page');
  return row;
}
function setSide(open, { keep = true } = {}) {
  homeShell.open = open;
  root.classList.toggle('home-side', open);
  homeShell.side?.toggleAttribute('inert', !open);
  if (keep && !window.matchMedia(SHELL_NARROW).matches) { try { localStorage.setItem(SIDE_KEY, open ? 'open' : 'shut'); } catch { /* as long as the page lasts */ } }
}
function buildHomeShell() {
  if (!root.classList.contains('chat-shell') || homeShell.side) return;
  const side = el('aside', 'sm-side');
  side.id = 'sm-side';
  const head = el('div', 'side-head');
  const brand = document.getElementById('sm-back')?.cloneNode(true);
  if (brand) { brand.removeAttribute('id'); brand.className = 'side-brand'; }
  homeShell.add = sideKey(ADD_ICON, t('Add a project'), () => ui.add.click());
  homeShell.hide = sideKey(SIDEBAR_GLYPH, t('Hide the sidebar'), () => setSide(false));
  head.append(homeShell.hide, ...(brand ? [brand] : []), el('span', 'side-grow'), homeShell.add);
  const nav = el('nav', 'side-nav');
  homeShell.rows = {
    add: sideRow(ADD_ICON, t('Add a project'), () => ui.add.click()),
    home: sideRow(HOME_GLYPH, t('Home'), () => window.scrollTo({ top: 0, behavior: motionStill() ? 'auto' : 'smooth' }), { here: true }),
    coordinator: sideRow(COORDINATOR_GLYPH, t('Coordinator'), () => openBishop()),
    market: sideRow(MARKET_GLYPH, t('Market'), () => openHomeMarket('shop')),
  };
  nav.append(...Object.values(homeShell.rows));
  const scroll = el('div', 'side-scroll');
  homeShell.label = el('div', 'side-label', t('Projects'));
  homeShell.list = el('div', 'side-projects');
  scroll.append(homeShell.label, homeShell.list);
  // A project's card dropped on the list keeps it here, where it was let go.
  scroll.addEventListener('dragover', (event) => {
    if (!pins.dropping || !event.dataTransfer?.types.includes(PIN_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    scroll.classList.add('is-drop');
  });
  scroll.addEventListener('dragleave', (event) => { if (!scroll.contains(event.relatedTarget)) scroll.classList.remove('is-drop'); });
  scroll.addEventListener('drop', (event) => {
    const id = event.dataTransfer?.getData(PIN_TYPE);
    scroll.classList.remove('is-drop');
    if (!id) return;
    event.preventDefault();
    const rows = [...homeShell.list.querySelectorAll('[data-room]')];
    const at = rows.findIndex((row) => { const box = row.getBoundingClientRect(); return event.clientY < box.top + box.height / 2; });
    pinsDropEnd();
    pinAdd(id, at < 0 ? rows.length : at);
  });
  const foot = el('div', 'side-foot');
  const who = el('div', 'side-who');
  homeShell.version = el('b', null, 'MADRE');
  const copy = el('a', 'side-copy', `© ${YEAR} ${AUTHOR}`);
  copy.href = AUTHOR_URL;
  copy.target = '_blank';
  copy.rel = 'noopener';
  who.append(homeShell.version, copy);
  homeShell.settings = sideKey(ui.gear.innerHTML, t('Settings'), () => openSettings());
  homeShell.power = sideKey(POWER_ICON, t('Restart or turn off MADRE'), () => openPowerMenu(homeShell.power));
  homeShell.power.setAttribute('aria-haspopup', 'menu');
  foot.append(who, homeShell.settings, homeShell.power);
  side.append(head, nav, scroll, foot);
  document.body.prepend(side);
  homeShell.side = side;
  arrangeHomeBar();
  // In the bar, while the sidebar is shut: its key, before the page's name.
  homeShell.show = sideKey(SIDEBAR_GLYPH, t('Show the sidebar'), () => setSide(true));
  homeShell.show.classList.add('sm-side-show');
  document.querySelector('.sm-top > .sm-topbar:first-child')?.prepend(homeShell.show);
  // Over the canvas on a narrow window: a press outside, or Escape, puts it away.
  homeShell.scrim = el('div', 'sm-side-scrim');
  homeShell.scrim.addEventListener('click', () => setSide(false, { keep: false }));
  document.body.append(homeShell.scrim);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && homeShell.open && window.matchMedia(SHELL_NARROW).matches && !document.querySelector('dialog[open]')) setSide(false, { keep: false });
  });
  const place = () => {
    const was = homeShellOn();
    const on = !window.matchMedia(SHELL_PHONE).matches;
    root.classList.toggle('home-shell', on);
    if (on !== was && data) drawPins();
    let kept = null;
    try { kept = localStorage.getItem(SIDE_KEY); } catch { /* no storage */ }
    if (window.matchMedia(SHELL_NARROW).matches) setSide(false, { keep: false });
    else setSide(kept ? kept === 'open' : true, { keep: false });
  };
  window.matchMedia(SHELL_PHONE).addEventListener?.('change', place);
  window.matchMedia(SHELL_NARROW).addEventListener?.('change', place);
  place();
}
// The projects at hand, each with its state as the room's sidebar says it: a press goes there, or
// wakes it and goes in; ⌘-press opens it in a new tab. The rest are one row away, on Home itself.
function drawSideProjects() {
  if (!homeShell.list || !data) return;
  if (data.version) homeShell.version.textContent = `MADRE ${data.version}`;
  const ids = pinsShown();
  const rooms = ids.map((id) => data.rooms.find((one) => one.id === id)).filter(Boolean);
  const said = JSON.stringify([language, rooms.map((room) => [room.id, room.name, room.open?.port ?? 0, busy.get(room.id) ?? stateOf(room).key, room.glance?.waitingCount ?? 0])]);
  if (said === homeShell.said) return;
  homeShell.said = said;
  homeShell.label.textContent = t('Projects');
  const MOOD = { calm: 'calm', working: 'working', waiting: 'waiting', outdated: 'quiet', quiet: 'quiet', asleep: 'asleep' };
  const rows = rooms.map((room) => {
    const state = stateOf(room);
    const waking = busy.get(room.id) === 'starting';
    const row = el(room.open ? 'a' : 'button', `side-project${room.open ? '' : ' asleep'}`);
    row.dataset.room = room.id;
    row.append(el('i', `side-dot ${waking ? 'working' : MOOD[state.key] ?? 'calm'}`), el('span', 'side-project-name', room.name));
    if (state.key === 'waiting') row.append(el('small', 'side-count', String(room.glance.waitingCount)));
    row.title = `${room.name} · ${waking ? t('Waking…') : state.words}`;
    if (room.open) row.href = addressOf(room);
    else { row.type = 'button'; row.addEventListener('click', (event) => { if (busy.has(room.id)) return; if (event.metaKey || event.ctrlKey) void startRoom(room); else void startRoom(room, { enter: true }); }); }
    row.addEventListener('contextmenu', (event) => pinsMenu(event, room));
    return row;
  });
  const all = sideRow(ALL_GLYPH, t('All your projects'), () => document.getElementById('sm-drawer')?.scrollIntoView({ behavior: motionStill() ? 'auto' : 'smooth', block: 'start' }));
  all.classList.add('side-all');
  if (!rooms.length) rows.push(el('p', 'side-empty', t('Open a project and it shows here.')));
  homeShell.list.replaceChildren(...rows, all);
}
function sayHomeShell() {
  if (!homeShell.side) return;
  homeShell.side.setAttribute('aria-label', t('Home'));
  const words = { add: t('Add a project'), home: t('Home'), coordinator: t('Coordinator'), market: t('Market') };
  for (const [key, row] of Object.entries(homeShell.rows)) row.querySelector('span').textContent = words[key];
  for (const [key, label] of [[homeShell.add, t('Add a project')], [homeShell.hide, t('Hide the sidebar')], [homeShell.show, t('Show the sidebar')], [homeShell.settings, t('Settings')], [homeShell.power, t('Restart or turn off MADRE')]]) { key.title = label; key.setAttribute('aria-label', label); }
  homeShell.said = '';
  drawSideProjects();
}
// ---- WINDOWS IN HOME (2026-10-28), as a project's are (app.js, marketAsWindow and its helpers):
// the sheet carried by its bar, sized by its sides and corners, always whole inside the browser
// window, the one touched last in front, and its place kept for the next time. Over the sidebar,
// as a project's windows stand over its sidebar; the Market is the one that opens this way.
const HOME_WINDOW_LAYER = 44;
const HOME_WINDOW_INSET = 8;
const homeWindows = [];
function homeWindowForward(node) {
  const at = homeWindows.indexOf(node);
  if (at >= 0) homeWindows.splice(at, 1);
  homeWindows.push(node);
  homeWindows.forEach((one, index) => { one.style.zIndex = String(HOME_WINDOW_LAYER + index); one.classList.toggle('front', index === homeWindows.length - 1); });
}
// Depth of field in Home (2026-10-30), as in a project (app.js, paintDepth): while windows float
// over Home, the page behind them — its bar and its widgets — recedes under one veil, a little more
// for each window up to three, and clears the moment the last one closes. The sidebar stands over
// the veil and stays sharp, as a project's does. One veil, not a filter on each piece, so the glass
// of what is behind keeps working.
const homeVeil = el('div', 'desk-veil');
homeVeil.setAttribute('aria-hidden', 'true');
document.body.append(homeVeil);
function paintHomeDepth() {
  const open = [...document.querySelectorAll('.home-window')].filter((one) => one.isConnected && !one.hidden && (one.tagName !== 'DIALOG' || one.open) && one.getClientRects().length && !one.classList.contains('leaving'));
  const depth = Math.min(3, open.length);
  if (depth) homeVeil.style.setProperty('--desk-depth', String(depth)); else homeVeil.style.removeProperty('--desk-depth');
  root.classList.toggle('desk-behind', depth > 0);
}
let homeDepthFrame = 0;
const scheduleHomeDepth = () => { cancelAnimationFrame(homeDepthFrame); homeDepthFrame = requestAnimationFrame(paintHomeDepth); };
if (typeof MutationObserver === 'function') {
  // A window opened, closed, shown or put away, by whatever road.
  new MutationObserver(scheduleHomeDepth).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open'] });
  document.addEventListener?.('close', scheduleHomeDepth, true);
}
function homeWindowBox(box, { minW, minH }) {
  const w = Math.round(Math.max(minW, Math.min(box.w, window.innerWidth - 2 * HOME_WINDOW_INSET)));
  const h = Math.round(Math.max(minH, Math.min(box.h, window.innerHeight - 2 * HOME_WINDOW_INSET)));
  // Partly past a side is allowed; the bar always stays in reach, never under the top edge.
  const x = Math.round(Math.max(120 - w, Math.min(window.innerWidth - 120, box.x)));
  const y = Math.round(Math.max(HOME_WINDOW_INSET, Math.min(window.innerHeight - 48, box.y)));
  return { x, y, w, h };
}
function homeWindow({ root, bar, close, key, minW = 360, minH = 360, keys = true, size = { w: 1040, h: 780 } }) {
  if (!homeShellOn()) return null;
  let framed = true;
  root.classList.add('surface', 'window', 'home-window');
  scheduleHomeDepth();
  let kept = null;
  try { kept = JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { /* no storage */ }
  const fresh = () => {
    const w = Math.min(size.w, window.innerWidth - 32);
    const h = Math.min(size.h, window.innerHeight - 90);
    return { x: Math.max(16, Math.round((window.innerWidth - w) / 2)), y: 56, w, h };
  };
  let want = kept?.w && kept?.h ? kept : fresh();
  let box = null;
  const place = (next) => {
    want = { ...next };
    box = homeWindowBox(next, { minW, minH });
    root.style.left = `${box.x}px`;
    root.style.top = `${box.y}px`;
    root.style.width = `${box.w}px`;
    root.style.height = `${box.h}px`;
  };
  const remember = () => { try { localStorage.setItem(key, JSON.stringify(box)); } catch { /* as long as the page lasts */ } };
  place(want);
  // Its close, at the right of its bar, as every window's (styles.css, .surface-modes, .x-close).
  const group = el('span', 'surface-modes');
  const shut = button('surface-mode close x-close x-only', null, () => close());
  shut.setAttribute('aria-label', t('Close'));
  shut.innerHTML = `<span class="x-icon">${trazo('close')}</span>`; // trusted: our own SVG
  group.append(shut);
  if (keys) bar.append(group);
  // Carried by its bar, wherever the bar is not a key, a field or a tab.
  const hold = (handle, change, skip = () => false) => handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !framed || skip(event)) return;
    event.preventDefault();
    event.stopPropagation();
    homeWindowForward(root);
    try { handle.setPointerCapture(event.pointerId); } catch { /* a pointer the page no longer holds */ }
    const start = { ...box };
    const from = { x: event.clientX, y: event.clientY };
    let frame = 0;
    root.classList.add('moving');
    const move = (moving) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => place(change(start, moving.clientX - from.x, moving.clientY - from.y))); };
    const finish = () => {
      cancelAnimationFrame(frame);
      root.classList.remove('moving');
      for (const [type, run] of [['pointermove', move], ['pointerup', finish], ['pointercancel', finish], ['lostpointercapture', finish]]) handle.removeEventListener(type, run);
      remember();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
  });
  hold(bar, (start, dx, dy) => ({ ...start, x: start.x + dx, y: start.y + dy }), (event) => Boolean(event.target.closest('button, input, label, a, select, textarea, [role="tab"]')));
  for (const side of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
    const edge = el('div', `win-edge ${side}`);
    edge.setAttribute('aria-hidden', 'true');
    root.append(edge);
    hold(edge, (start, dx, dy) => {
      const next = { ...start };
      if (side.includes('e')) next.w = start.w + dx;
      if (side.includes('s')) next.h = start.h + dy;
      if (side.includes('w')) { next.w = Math.max(minW, start.w - dx); next.x = start.x + start.w - next.w; }
      if (side.includes('n')) { next.h = Math.max(minH, start.h - dy); next.y = start.y + start.h - next.h; }
      return next;
    });
  }
  root.addEventListener('pointerdown', () => { if (framed) homeWindowForward(root); }, true);
  const refit = () => { if (root.isConnected && framed) place(want); };
  window.addEventListener('resize', refit);
  homeWindowForward(root);
  return {
    raise: () => homeWindowForward(root),
    // Another size for now, not kept: a window fitted to what it shows (openHomeAdd).
    resize: (next) => { if (framed) place({ ...want, ...next }); },
    drop: () => {
      window.removeEventListener('resize', refit);
      const at = homeWindows.indexOf(root);
      if (at >= 0) homeWindows.splice(at, 1);
      homeWindows.at(-1)?.classList.add('front');
    },
    // Back to the whole screen: the same node, its place and its sides put away.
    release: () => {
      framed = false;
      window.removeEventListener('resize', refit);
      const at = homeWindows.indexOf(root);
      if (at >= 0) homeWindows.splice(at, 1);
      for (const side of ['left', 'top', 'width', 'height', 'z-index']) root.style.removeProperty(side);
      root.classList.remove('surface', 'window', 'home-window', 'front');
      scheduleHomeDepth();
      for (const edge of root.querySelectorAll(':scope > .win-edge')) edge.remove();
      group.remove();
    },
  };
}
// The bar's keys by family, a hairline between them as in a project (styles.css, .bar-family): the
// projects' own — how they connect and their map —, then MADRE's — the Market and the modules —,
// then Home's own after its line. The modules wear the project's piece, the same key there and here.
function arrangeHomeBar() {
  const links = $('sm-tb-links');
  const market = $('sm-tb-market');
  const modules = $('sm-tb-modules');
  if (!links || !market || !modules) return;
  links.after(ui.macro);
  const line = el('span', 'sm-family');
  line.setAttribute('aria-hidden', 'true');
  market.before(line);
  modules.querySelector('svg')?.replaceWith(Object.assign(document.createElement('span'), { innerHTML: MODULES_GLYPH }).firstElementChild);
  // The map keeps its own key (salas-mac.html): since Trazo MADRE (2026-10-28) it is the planet with
  // its ring, as in the side panel, and its moons still go round while the pointer stays.
}
const MODULES_GLYPH = trazo('puzzle');

buildHomeShell();
// «En marcha» (2026-10-30): the same key and panel as in a project (public/activity.js). Home's own
// conversations are the Coordinator's, on this room's page.
{
  const key = $('sm-tb-activity');
  const words = key?.querySelector(':scope > span');
  if (words) words.textContent = t('Running now');
  if (key) mountActivity({ key, badge: $('sm-tb-activity-count'), openChat: ({ chat, messageId }) => { location.href = `/#chat=${encodeURIComponent(chat)}${messageId ? `:${encodeURIComponent(messageId)}` : ''}`; }, toast: (said) => toast(said) });
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
void loadReminders({ opening: true });
// `#welcome`: the welcome again, on purpose (to connect an agent or add projects in steps).
if (location.hash === '#welcome') { history.replaceState(null, '', location.pathname); openHomeWelcome(); }
// Sent here for the Macroverso (the key in BISHOP's room): straight into it, on a large screen.
if (location.hash === '#macroverso' && data && !ui.macro.hidden) { history.replaceState(null, '', location.pathname); ui.macro.click(); }
// Sent here for the Market (a project's MODULES, or a module offered in the conversation): straight in,
// on that module's page when one is named.
// The Market's addresses: #mercado, #mercado=<module>, #modulos.
if (/^#mercado(=|$)/.test(location.hash)) openHomeMarket('shop', decodeURIComponent(location.hash.split('=')[1] ?? '') || null);
else if (location.hash === '#modulos') openHomeMarket('mine');
timer = setInterval(() => { if (!document.hidden && !busy.size && !pins.dropping && !pins.drag) void refresh({ polled: true }); }, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { void refresh(); void loadAgents(); void loadWork(); void loadDecisions(); } });
// The decisions are asked again every few minutes (the route itself asks the rooms no oftener).
setInterval(() => { if (!document.hidden) void loadDecisions(); }, 5 * 60 * 1000);
// A reminder comes due while Home is open: looked at every minute.
setInterval(() => { if (!document.hidden) void loadReminders(); }, 60 * 1000);

// Asking for a star or a review (review-ask.js), when Home is quiet: nothing waking or closing,
// the bar not being arranged.
startReviewAsk({ busy: () => busy.size > 0 || pins.editing || Boolean(pins.drag) || Boolean(pins.dropping) });
