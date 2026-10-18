// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The Market (2026-10-18): every module MADRE can turn on or install, shown as a shop in Home and
// in each project (market-view.js), and offered in the conversation the moment one would help
// (app.js, offerModule). What a module looks like — its line and its drawing — lives here once, for the
// project's board of MODULES and for the Market alike. Everything is free for now; `price` is where a
// paid module will say what it costs.
//
// What is written here is the Market MADRE ships with. The catalog the author publishes at
// madre.run/mercado/ (src/market-remote.mjs, signed) is read over it when there is one: its shelves,
// its featured order, its words, and the modules that came after this version of MADRE.

import { language, t } from './i18n.js';

// `icon` is drawn on a 20-unit grid in `currentColor`, with `ic-f` marking the part a tile tints;
// `hue` is the two colors of the module's own app icon, top to bottom (2026-10-18, the Market).
export const MODULE_FACES = {
  ash: { line: 'Compact replies from every agent', wide: true, window: true, hue: ['#38bdf8', '#0369a1'], icon: '<path d="M4 5.2h12M4 9.4h8.4M4 13.6h4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="ic-f" d="M12.6 12.2l2.6 3 2.6-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.2 8v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
  intents: { line: 'How hard each agent should think', wide: true, window: true, hue: ['#a78bfa', '#6d28d9'], icon: '<path d="M3.2 14.2a6.8 6.8 0 0 1 13.6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="ic-f" d="M3.2 14.2a6.8 6.8 0 0 1 4.4-6.4L10 14.2z" fill="currentColor" fill-opacity=".28" stroke="none"/><path d="M10 14.2l3.4-4.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="10" cy="14.2" r="1.5" fill="currentColor"/>' },
  ollama: { line: 'Memory by meaning, on this machine', wide: true, window: true, hue: ['#4ade80', '#15803d'], icon: '<rect x="5" y="5" width="10" height="10" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 2.6v2.4M12 2.6v2.4M8 15v2.4M12 15v2.4M2.6 8h2.4M2.6 12h2.4M15 8h2.4M15 12h2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle class="ic-f" cx="10" cy="10" r="2.1" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.4"/>' },
  'image-studio': { line: 'Images for the agents, with your key', hue: ['#fb7185', '#c026d3'], icon: '<rect x="2.8" y="3.8" width="14.4" height="12.4" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path class="ic-f" d="M3.4 14.6l4-4 2.8 2.6 2.1-1.8 4.3 3.4z" fill="currentColor" fill-opacity=".28" stroke="none"/><path d="M3.4 14.6l4-4 2.8 2.6 2.1-1.8 4.3 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M13.4 5.6l.55 1.25 1.25.55-1.25.55-.55 1.25-.55-1.25-1.25-.55 1.25-.55z" fill="currentColor"/>' },
  playwright: { line: 'A browser the agents can look through', hue: ['#60a5fa', '#1d4ed8'], icon: '<rect x="2.6" y="3.6" width="14.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.6 7.4h14.8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.1" cy="5.5" r=".8" fill="currentColor"/><circle cx="7.4" cy="5.5" r=".8" fill="currentColor"/><path class="ic-f" d="M9.2 9.4l5.4 2-2.3.9-.9 2.3z" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' },
  ripley: { line: 'Preview of HTML, SVG and Markdown', hue: ['#fbbf24', '#ea580c'], icon: '<rect x="2.6" y="3.6" width="14.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path class="ic-f" d="M5.4 10s1.8-3 4.6-3 4.6 3 4.6 3-1.8 3-4.6 3-4.6-3-4.6-3z" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="10" cy="10" r="1.3" fill="currentColor"/>' },
  'git-pulse': { line: 'The repository, posted to the project', hue: ['#94a3b8', '#475569'], icon: '<circle cx="5.5" cy="5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.5" cy="15" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 6.8v6.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="ic-f" d="M8.8 11h2l1.2-3.4 1.6 6 1.2-2.6h1.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' },
  runs: { line: 'Commands an agent asks you to run', hue: ['#6b7280', '#1f2937'], icon: '<rect x="2.6" y="3.6" width="14.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path class="ic-f" d="M6.2 7.8l2.6 2.2-2.6 2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6 12.4h3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
  choices: { line: 'Decisions as buttons, not paragraphs', hue: ['#2dd4bf', '#0f766e'], icon: '<rect x="3.2" y="3.4" width="13.6" height="3.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><rect class="ic-f" x="3.2" y="8.2" width="13.6" height="3.6" rx="1.8" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.5"/><path d="M12.2 10l1 1 1.9-1.9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.2" y="13" width="13.6" height="3.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
  ahp: { line: 'Project state and handoffs in .ahp/', hue: ['#34d399', '#047857'], icon: '<path d="M4.4 8.4a5.9 5.9 0 0 1 10.4-2.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15.3 2.9v3.2h-3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.6 11.6a5.9 5.9 0 0 1-10.4 2.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.7 17.1v-3.2h3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle class="ic-f" cx="10" cy="10" r="1.9" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.4"/>' },
  correo: { line: 'Send one email from your account', hue: ['#fb923c', '#c2410c'], icon: '<rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path class="ic-f" d="M3.4 6l6.6 4.8L16.6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' },
  github: { line: 'Pull requests, issues and CI, in the project', hue: ['#64748b', '#1e293b'], icon: '<circle cx="5.5" cy="4.8" r="1.9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.5" cy="15.2" r="1.9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 6.7v6.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 13.3V8.2a2.6 2.6 0 0 0-2.6-2.6H9.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3.6l-2 2 2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle class="ic-f" cx="14.5" cy="15.2" r="1.9" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.6"/>' },
  // Faces for the modules MODULES lists without one (2026-10-18, for the Market): their words and drawings.
  enlaces: { line: 'What other projects know, through a signed connection', hue: ['#f472b6', '#be123c'], icon: '<path d="M8.1 11.9l3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="ic-f" d="M9 5.5l1.6-1.6a3.3 3.3 0 0 1 4.7 4.7L13.7 10.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M11 14.5l-1.6 1.6a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
  mcp: { line: 'Other apps and services, for the agents', hue: ['#e879f9', '#7e22ce'], icon: '<path d="M7.6 2.8v3.4M12.4 2.8v3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="ic-f" d="M5.2 6.2h9.6v3.2a4.8 4.8 0 0 1-9.6 0z" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 14.2v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
};
export const MODULE_ANY = '<path d="M7.5 4.5h2.2a1.6 1.6 0 1 1 3.1 0H15v3.2a1.6 1.6 0 1 1 0 3.1V15h-3.2a1.6 1.6 0 1 0-3.1 0H5.5v-3.6a1.6 1.6 0 1 0 0-3.1V4.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>';
const HUE_ANY = ['#94a3b8', '#334155'];

export const moduleFace = (item) => {
  if (MODULE_FACES[item?.id]) return MODULE_FACES[item.id];
  // A module that came after this MADRE wears the face its catalog entry gives it.
  const entry = remoteEntry(item?.id);
  if (entry) return { line: pick(entry.line), icon: cleanSvg(entry.icon, { inner: true }) ?? MODULE_ANY, hue: entry.hue ?? HUE_ANY, name: pick(entry.name), summary: pick(entry.summary) };
  return { line: null, icon: MODULE_ANY, hue: HUE_ANY };
};
// A module's app icon: its drawing in white on its own two colors (the Market, Home's MODULES).
export function appIcon(item, size = 56) {
  const face = moduleFace(item);
  const [top, bottom] = face.hue ?? HUE_ANY;
  const mark = document.createElement('span');
  mark.className = 'mk-icon';
  mark.style.setProperty('--mk-size', `${size}px`);
  mark.style.setProperty('--mk-a', top);
  mark.style.setProperty('--mk-b', bottom);
  mark.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${face.icon}</svg>`; // trusted: our own SVG strings
  return mark;
}

// The shelves of the Market, in the order they are shown. Each module sits on one.
export const MARKET_SHELVES = [
  { id: 'no-terminal', title: 'Without the terminal', about: 'What used to take a command, in one press.' },
  { id: 'create', title: 'To create', about: 'Images, previews and decisions as buttons.' },
  { id: 'local-ai', title: 'AI on your computer', about: 'Free, private, and lighter on your plans.' },
  { id: 'connect', title: 'Connect it', about: 'Your other projects and the apps you already use.' },
];

// Where each module sits, whether it is turned on for every project (`everywhere`) or installed into
// one (`project`), and what it costs (0: free). A module MADRE has no entry for still shows, on the
// last shelf.
export const MARKET = {
  playwright: { shelf: 'no-terminal', scope: 'everywhere', price: 0, featured: 1, pitch: 'Let your agents see your page: they open it, click through it and bring back screenshots.' },
  ahp: { shelf: 'no-terminal', scope: 'project', price: 0, featured: 2, pitch: 'Hand work from one agent to another without losing the thread: the project keeps its state beside the code.' },
  runs: { shelf: 'no-terminal', scope: 'everywhere', price: 0 },
  github: { shelf: 'no-terminal', scope: 'everywhere', price: 0 },
  'image-studio': { shelf: 'create', scope: 'everywhere', price: 0, featured: 3, pitch: 'Ask for a logo, a banner or an illustration, and the agents make it with your own key.' },
  ripley: { shelf: 'create', scope: 'everywhere', price: 0 },
  choices: { shelf: 'create', scope: 'everywhere', price: 0 },
  ollama: { shelf: 'local-ai', scope: 'everywhere', price: 0, featured: 4, pitch: 'A memory that searches by meaning, and @madre, on your own computer: free and private.' },
  intents: { shelf: 'local-ai', scope: 'everywhere', price: 0 },
  ash: { shelf: 'local-ai', scope: 'everywhere', price: 0 },
  enlaces: { shelf: 'connect', scope: 'everywhere', price: 0 },
  mcp: { shelf: 'connect', scope: 'everywhere', price: 0 },
};
export const marketEntry = (id) => {
  const base = MARKET[id] ?? { shelf: 'connect', scope: 'everywhere', price: 0 };
  const entry = remoteEntry(id);
  if (!entry && !remote) return base;
  const featured = remote?.featured?.length ? remote.featured.indexOf(id) + 1 : base.featured;
  return { ...base, ...(entry ? { shelf: entry.shelf ?? base.shelf, scope: entry.scope ?? base.scope, price: entry.price ?? base.price, pitch: pick(entry.pitch) ?? base.pitch, minMadre: entry.minMadre ?? null } : {}), featured: featured || 0 };
};
// The shelves, the catalog's when it names them.
export const marketShelves = () => (remote?.shelves?.length ? remote.shelves.map((shelf) => ({ id: shelf.id, title: pick(shelf.title) ?? shelf.id, about: pick(shelf.about) ?? '' })) : MARKET_SHELVES);
// What the shop shows: every module that can be turned on or installed. One that is always there
// (Git) is part of MADRE, not something to get, and so is the Coordinator, which is Home itself.
export const inMarket = (item) => Boolean(item) && !item.fixed && item.kind !== undefined && item.id !== 'bishop';
// The ones the carousel shows, in their order.
export const marketFeatured = (items = []) => items.filter((item) => marketEntry(item.id).featured).sort((a, b) => marketEntry(a.id).featured - marketEntry(b.id).featured);

// THE OFFER IN THE CONVERSATION. A message that asks for what a module does, while that module is
// off, gets one card under it: what would help and the key to turn it on. Read from the person's
// own words only; one offer per message; never one that was declined, and never the same one twice
// in a page.
export const MARKET_OFFERS = [
  { id: 'playwright', when: /navegador|browser|playwright|captura|screenshot|pantallazo|\bclic\b|\bclick\b|consola|console|responsive|m[oó]vil|mobile|e2e|end.to.end|pru[eé]ba(lo|la|las|los)? en|abre (la|el) (p[aá]gina|app|sitio)|open the (page|app|site)/i, says: 'To open your page in a browser, click through it and take screenshots, the agents need Test browser.' },
  { id: 'ripley', when: /vista previa|\bpreview\b|c[oó]mo se ve|ver (la|mi) p[aá]gina|see (the|my) page/i, says: 'To see your pages as they look, beside the conversation, turn on Preview.' },
  { id: 'image-studio', when: /\b(genera|gener[aá]|crea|haz|dibuja|make|generate|draw)\w*\s+(me\s+)?(una?\s+|an?\s+)?(imagen|ilustraci[oó]n|logo|foto|banner|icono|image|illustration|picture|icon)/i, says: 'To make images, the agents need Images.' },
  { id: 'github', when: /\bgithub\b|pull request|\bPRs?\b|\bissues?\b|\bCI\b/i, says: 'To read your pull requests, issues and CI, the agents need GitHub.' },
  { id: 'ahp', when: /traspaso|handoff|continuidad|continuity|retom(a|ar) donde|pick up where|estado del proyecto|project state/i, says: 'To keep the project\'s state and hand work between agents and editors, install Continuity.' },
  { id: 'ollama', when: /@madre\b|sin internet|offline|ia local|local ai/i, says: 'For @madre and a memory that searches by meaning, turn on Local AI.' },
  { id: 'ash', when: /gast(ar|e|o) menos|ahorr(a|ar|o) tokens|demasiados tokens|too many tokens|save tokens/i, says: 'To have every agent answer shorter and spend less, turn on Token saver.' },
];
export function marketOffer(text, items = [], { declined = [], shown = [] } = {}) {
  const words = String(text ?? '');
  if (!words.trim()) return null;
  for (const offer of MARKET_OFFERS) {
    if (declined.includes(offer.id) || shown.includes(offer.id)) continue;
    const item = items.find((one) => one.id === offer.id);
    if (!item || item.status?.installed || !inMarket(item)) continue;
    if (offer.when.test(words)) return { item, says: offer.says };
  }
  return null;
}

// THE CATALOG from madre.run (src/market-remote.mjs). The page is handed it by /api/market, already
// checked against the author's signature; its words come in both languages, and its drawings are
// kept to the shapes a drawing needs before they reach the page (cleanSvg), signed or not.
let remote = null;
const pick = (value) => (value == null ? null : typeof value === 'string' ? value : value[language()] ?? value.en ?? value.es ?? null);
export function setMarketCatalog(catalog) {
  remote = catalog && Array.isArray(catalog.modules) ? { ...catalog, byId: new Map(catalog.modules.map((entry) => [entry.id, entry])) } : null;
}
export const remoteEntry = (id) => remote?.byId.get(id) ?? null;
// The catalog's modules this MADRE does not have yet, as the Market lists them: to get.
export function marketExtras(items = []) {
  if (!remote) return [];
  return remote.modules.filter((entry) => entry.file && !items.some((item) => item.id === entry.id)).map((entry) => ({
    id: entry.id, kind: 'remote', remote: entry, name: pick(entry.name) ?? entry.id, summary: pick(entry.summary) ?? '', version: entry.version,
    creates: [], requires: [], status: { installed: false }, preflight: { ok: true, problems: [] },
  }));
}
// A drawing from the catalog: only the elements and attributes a drawing is made of. No script,
// no link, no style, no outside address.
const SVG_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'filter', 'fedropshadow', 'fegaussianblur', 'text', 'tspan']);
const SVG_ATTRS = /^(d|x|y|x1|x2|y1|y2|cx|cy|r|fx|fy|rx|ry|dx|dy|width|height|points|viewbox|fill|fill-opacity|fill-rule|clip-rule|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-opacity|stroke-dasharray|opacity|transform|offset|stop-color|stop-opacity|id|class|clip-path|filter|gradientunits|gradienttransform|stddeviation|flood-color|flood-opacity|font-family|font-size|font-weight|text-anchor|xmlns|aria-hidden|focusable|preserveaspectratio)$/;
export function cleanSvg(markup, { inner = false } = {}) {
  if (typeof markup !== 'string' || !markup.trim() || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(inner ? `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>` : markup, 'image/svg+xml');
  const root = doc.documentElement;
  if (root?.nodeName?.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  const clean = (node) => {
    for (const attr of [...node.attributes]) {
      if (!SVG_ATTRS.test(attr.name.toLowerCase()) || /url\(\s*(?!#)/i.test(attr.value) || /javascript:|data:/i.test(attr.value)) node.removeAttribute(attr.name);
    }
    for (const child of [...node.children]) {
      if (!SVG_TAGS.has(child.nodeName.toLowerCase())) child.remove();
      else clean(child);
    }
  };
  clean(root);
  return inner ? root.innerHTML : root.outerHTML;
}

// Asked once when a page opens: the catalog for the faces and the Market, and two kinds of news,
// each said once, as the page's own notice. What the Market updated on its own; and what is new in
// it — the author's lines and the modules that arrived — with the key that opens it there.
export async function loadMarket({ toast = null, open = null } = {}) {
  const answer = await fetch('/api/market', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  if (!answer) return null;
  setMarketCatalog(answer.catalog);
  if (!toast) return answer;
  const updated = answer.news ?? [];
  if (updated.length) {
    toast(updated.map((one) => [t('{name} updated itself to version {version}.', { name: t(one.name ?? one.id), version: one.to }), pick(one.changes)].filter(Boolean).join(' ')).join(' '));
    void fetch('/api/market/seen', { method: 'POST' }).catch(() => null);
  }
  const fresh = answer.announce ?? { news: [], modules: [] };
  const arrived = fresh.modules ?? [];
  const lines = [
    ...(fresh.news ?? []).map((one) => pick(one.text)),
    ...(arrived.length === 1 ? [t('New in the Market: {name}.', { name: pick(arrived[0].name) ?? arrived[0].id })] : arrived.length > 1 ? [t('{n} new modules in the Market.', { n: arrived.length })] : []),
  ].filter(Boolean);
  if (lines.length) {
    const about = (fresh.news ?? []).find((one) => one.module)?.module ?? (arrived.length === 1 ? arrived[0].id : null);
    const tell = () => toast(lines.join(' '), open ? { label: t('See it'), run: () => open(about) } : null);
    // After the update notice, never over it.
    if (updated.length) setTimeout(tell, 6500); else tell();
    const keys = [...(fresh.news ?? []).map((one) => `news:${one.id}`), ...arrived.map((one) => `module:${one.id}`)];
    void fetch('/api/market/announced', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys }) }).catch(() => null);
  }
  return answer;
}
