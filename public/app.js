import { brandOf } from './brands.js';
import { CONDITIONS, detectPlatform, diagnose, fixesFor, PLATFORMS, searchConditions } from './troubleshooting.js';

const els = {
  project: document.querySelector('#project'),
  agents: document.querySelector('#agents'),
  thread: document.querySelector('#messages'),
  column: document.querySelector('#thread-inner'),
  crewLabel: document.querySelector('#crew-label'),
  onboarding: document.querySelector('#onboarding'),
  bridgeCrew: document.querySelector('#bridge-crew'),
  emptyStarts: document.querySelector('#empty-starts'),
  composer: document.querySelector('#composer'),
  picker: document.querySelector('#picker'),
  target: document.querySelector('#target'),
  input: document.querySelector('#message'),
  highlight: document.querySelector('#highlight'),
  slashMenu: document.querySelector('#slash-menu'),
  attach: document.querySelector('#attach'),
  createToggle: document.querySelector('#create-toggle'),
  ashToggle: document.querySelector('#ashcode-toggle'),
  fileInput: document.querySelector('#file-input'),
  attachments: document.querySelector('#attachments'),
  send: document.querySelector('#composer button[type="submit"]'),
  connection: document.querySelector('#connection'),
  tree: document.querySelector('#tree'),
  treeBody: document.querySelector('#tree-body'),
  treeRoot: document.querySelector('#tree-root'),
  treeButton: document.querySelector('#tree-button'),
  treeClose: document.querySelector('#tree-close'),
  toast: document.querySelector('#toast'),
};

// Built-in commands live in the composer; module commands come from the
// server (/api/commands) and run there, read-only, as fact cards.
const CLIENT_COMMANDS = [
  { name: 'create', title: 'CREATE', usage: '/create <what to make>', summary: 'Arm CREATE for this message: the agent may add new files to the project where they belong.', available: true, client: true },
  { name: 'image', title: 'Image', usage: '/image <what to draw>', summary: 'Ask for an image: arms CREATE with the image scope and routes to an agent that can generate images.', available: true, client: true },
  { name: 'stopall', title: 'STOP ALL', usage: '/stopall', summary: 'Master brake: halt every plan and turn in flight. Never reaches an agent.', available: true, client: true },
];

const PLACEHOLDERS = {
  plain: 'Type here, human. Ask the room…',
  create: 'CREATE on: what to make. New files land where they belong in the project; nothing existing changes.',
  order: 'Priority one. Terse transmissions; the original stays in the record.',
  ghost: 'Off the record. Ask anything; nothing is saved, nobody else will remember it.',
  control: 'Control armed. Say what to change in the project; every action runs without asking.',
  airlock: 'Airlock open. Commands run; pushes and deploys leave the ship. Say exactly what should go out.',
  expendable: 'Type here, human. MOTHER is listening.',
  memory: 'Ask what the room remembers. @madre answers from memory with citations; it does not act.',
};
let winkTimer = null;
const LINE_PX = 21;
const MAX_ROWS = 3;

// Permission modes: chosen per message, capped per agent in CONNECTIONS.
const MODES = {
  0: { key: 'ghost', label: 'GHOST', hint: 'Off the record. Nothing is saved; gone on reload.' },
  1: { key: 'exchange', label: 'EXCHANGE', hint: 'Read the project and talk to the room. Writes nothing.' },
  2: { key: 'create', label: 'CREATE', hint: 'Add new files where they belong in the project. Existing files stay untouched.' },
  3: { key: 'control', label: 'CONTROL', hint: 'Edit the project itself, no approval per action. Override required.' },
  4: { key: 'airlock', label: 'AIRLOCK', hint: 'Run commands, push, deploy. What leaves the ship does not come back. Override, twice.' },
};

const state = {
  agents: new Map(),
  budget: null,
  timeouts: {},
  seen: new Set(),
  userMessages: new Map(),
  bridgePinned: false,      // the bridge stays open when the human asked for it
  tourArmed: false,         // the tour fires once, and only when the room can be used
  ollama: null,             // the local brain's state, for the bridge
  ollamaAsked: false,
  ollamaRecommended: null,
  ratings: new Map(),        // messageId → good | bad, from the ledger
  ratingNodes: new Map(),    // messageId → the buttons of that bubble // messageId -> { text, target }
  lastSequence: 0,
  lastSender: null,        // for iMessage-style grouping of consecutive bubbles
  failures: [],            // recorded conditions for MU/TH/UR
  expendable: false,       // easter egg armed: the next human message is reviewed by MOTHER
  running: new Map(),      // messageId -> agent, turns in flight
  mode: 1,                 // permission mode for the next message (#0..#3)
  modeArmedFor: null,      // agent the CONTROL override was granted to
  commands: [],            // slash commands from /api/commands (modules) + the built-in ones
  plansRunning: new Set(),
  brakeArmed: false,       // STOP ALL is a brake against runaway sequences: armed only by MU/TH/UR alerts
  agentStats: new Map(),   // id -> { turns, lastTurnMs, lastTurnTokens, cost, started }
  sessions: {},            // id -> { state, detail } from the last probe
  loginLogs: new Map(),    // id -> streamed sign-in lines
  models: {},              // id -> { models, default, note } from /api/models
  reports: new Map(),      // id -> sentinel report (unknown conditions and crashes)
  capabilities: {},        // id -> { read, imageIn, write, imageGen, web }
  pending: [],             // attachments uploaded for the next message
  projectRoot: '',
  create: false,           // creation lease armed for the next message
  ashCodeInstalled: false,
  ashCode: false,          // ASH CODE active for this message and its replies
  chosenModel: {},         // id -> model name picked in the composer
};
try { state.chosenModel = JSON.parse(localStorage.getItem('pulse.chosenModel') ?? '{}') || {}; } catch { state.chosenModel = {}; }


/* ---------- helpers ---------- */

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatTokens = (value) => {
  if (!Number.isFinite(value)) return '';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return String(value);
};

const formatTime = (iso) => {
  const date = iso ? new Date(iso) : new Date();
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const label = (id) => state.agents.get(id)?.label ?? brandOf(id).label ?? id;
const isLight = () => matchMedia('(prefers-color-scheme: light)').matches;
const agentColor = (id) => {
  const brand = brandOf(id);
  return isLight() && brand.colorLight ? brand.colorLight : brand.color;
};
function paint(node, id) {
  node.dataset.agent = id;
  node.style.setProperty('--agent', agentColor(id));
  const brand = brandOf(id);
  if (brand.gradient) node.style.setProperty('--agent-gradient', brand.gradient);
  return node;
}

function avatar(id, { size = 28, ring = false, pct = 0, status = 'ready' } = {}) {
  const node = paint(el('span', `avatar ${status}${ring ? ' ring' : ''}${pct >= 80 ? ' hot' : ''}`), id);
  node.style.setProperty('--size', `${size}px`);
  node.style.setProperty('--pct', String(Math.max(0, Math.min(100, pct))));
  node.innerHTML = brandOf(id).mark(); // trusted: our own SVG strings from brands.js
  return node;
}

let toastTimer;
// The hint sits just above the composer, whatever its height right now.
function placeToast() {
  const rect = els.composer?.getBoundingClientRect?.();
  if (!rect || !document.documentElement?.style) return;
  if (Number.isFinite(rect.top) && rect.top > 0) document.documentElement.style.setProperty('--composer-top', `${Math.round(rect.top)}px`);
  if (Number.isFinite(rect.left) && rect.width > 0) document.documentElement.style.setProperty('--composer-center', `${Math.round(rect.left + rect.width / 2)}px`);
}
function toast(message) {
  placeToast();
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 6000);
}

function scrollToEnd() {
  els.thread.scrollTop = els.thread.scrollHeight;
}

/* ---------- safe Markdown (DOM only, no HTML injection) ---------- */

const SAFE_URL = /^https?:\/\//i;

const FILE_PATH = /(?<![\w/@.-])((?:\.{1,2}\/)?(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]{1,8}|\/Users\/[\w.-]+(?:\/[\w.-]+)+\.[A-Za-z0-9]{1,8})(?::(\d+))?(?![\w/])/g;

function projectRelative(path) {
  if (state.projectRoot && path.startsWith(state.projectRoot + '/')) return path.slice(state.projectRoot.length + 1);
  if (path.startsWith('/')) return null;
  return path.replace(/^\.\//, '');
}

// Plain text with file paths turned into viewer links.
function appendTextWithPaths(text, into) {
  let last = 0;
  for (const match of text.matchAll(FILE_PATH)) {
    const rel = projectRelative(match[1]);
    if (!rel) continue;
    if (match.index > last) into.append(text.slice(last, match.index));
    const link = el('a', 'file-link', match[0]);
    link.href = `/api/files?path=${encodeURIComponent(rel)}`;
    link.addEventListener('click', (event) => { event.preventDefault(); openViewer({ root: 'project', path: rel, line: match[2] ? Number(match[2]) : null }); });
    into.append(link);
    last = match.index + match[0].length;
  }
  if (last < text.length) into.append(text.slice(last));
}

function imageSource(src) {
  if (/^https?:\/\//i.test(src)) return src;
  const rel = projectRelative(src);
  return rel ? `/api/files?path=${encodeURIComponent(rel)}` : null;
}

function renderInline(text, into) {
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(!\[[^\]\n]*\]\(([^)\s]+)\))|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))|((?<![\w/])!((?:[\w.-]+\/)*[\w.-]+\.[A-Za-z0-9]{1,8})(?::(\d+)(?:-(\d+))?)?(?![\w/]))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) appendTextWithPaths(text.slice(last, match.index), into);
    const [token] = match;
    if (match[1]) {
      const code = el('code', null, token.slice(1, -1));
      const rel = FILE_PATH.test(token.slice(1, -1)) ? projectRelative(token.slice(1, -1).replace(/:\d+$/, '')) : null;
      FILE_PATH.lastIndex = 0;
      if (rel) { code.classList.add('file-link'); code.style.cursor = 'pointer'; code.addEventListener('click', () => openViewer({ root: 'project', path: rel })); }
      into.append(code);
    } else if (match[4]) {
      const src = imageSource(match[5]);
      const alt = token.slice(2, token.indexOf(']'));
      if (src) {
        const img = el('img', 'inline');
        img.src = src; img.alt = alt; img.loading = 'lazy';
        img.addEventListener('click', () => openViewer({ url: src, label: alt || match[5] }));
        into.append(img);
      } else into.append(el('code', null, match[5]));
    }
    else if (match[8]) {
      const ref = el('button', 'file-ref', token);
      ref.type = 'button';
      const from = match[10] ? Number(match[10]) : null;
      const to = match[11] ? Number(match[11]) : from;
      ref.title = `Open ${match[9]}${from ? ` at line ${from}${to !== from ? `-${to}` : ''}` : ''}`;
      ref.addEventListener('click', () => openViewer({ root: 'project', path: match[9], line: from, lines: from ? { from, to } : null }));
      into.append(ref);
    }
    else if (match[2]) into.append(el('strong', null, token.slice(2, -2)));
    else if (match[3]) into.append(el('em', null, token.slice(1, -1)));
    else if (match[6]) {
      const anchor = el('a', null, token.slice(1, token.indexOf(']')));
      const href = match[7];
      if (SAFE_URL.test(href)) {
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      into.append(anchor);
    }
    last = match.index + token.length;
  }
  if (last < text.length) appendTextWithPaths(text.slice(last), into);
}

/* ---------- file viewer ---------- */

const viewer = {
  dialog: document.querySelector('#viewer'),
  path: document.querySelector('#viewer-path'),
  open: document.querySelector('#viewer-open'),
  body: document.querySelector('#viewer-body'),
  close: document.querySelector('#viewer-close'),
};
const viewerUI = {
  selection: document.querySelector('#viewer-selection'),
  review: document.querySelector('#viewer-review'),
  menu: document.querySelector('#viewer-menu'),
  path: null,      // project-relative path of the open text file, if any
  from: null, to: null,
  lineNodes: [],
};
function setSelection(from, to) {
  viewerUI.from = from; viewerUI.to = to;
  const lo = Math.min(from ?? 0, to ?? 0), hi = Math.max(from ?? 0, to ?? 0);
  for (const { n, ln, tx } of viewerUI.lineNodes) {
    const on = from !== null && n >= lo && n <= hi;
    ln.classList.toggle('sel', on); tx.classList.toggle('sel', on);
  }
  const has = from !== null;
  viewerUI.selection.hidden = !has;
  viewerUI.review.hidden = !has;
  if (has) viewerUI.selection.textContent = lo === hi ? `L${lo}` : `L${lo}-${hi}`;
}
function referenceForSelection() {
  const lo = Math.min(viewerUI.from, viewerUI.to), hi = Math.max(viewerUI.from, viewerUI.to);
  return `!${viewerUI.path}:${lo}${hi !== lo ? `-${hi}` : ''}`;
}
// "Review with @agent": the selection becomes a !file:lines reference in the
// composer and that agent becomes the target; the human finishes the sentence.
function reviewWith(agentId) {
  const reference = referenceForSelection();
  const current = els.input.value.trim();
  els.input.value = `${reference} ${current ? current : 'review this: '}`;
  if (agentId && state.agents.get(agentId)?.ready) { els.target.value = agentId; renderPicker(); }
  hideViewerMenu();
  viewer.dialog.close();
  autosize();
  els.input.focus();
  els.input.setSelectionRange(els.input.value.length, els.input.value.length);
}
function showViewerMenu(x, y) {
  const menuNode = viewerUI.menu;
  menuNode.replaceChildren(el('div', 'hint', `REVIEW ${referenceForSelection()} WITH`));
  for (const agent of state.agents.values()) {
    const item = paint(el('button', `item${agent.ready ? '' : ' off'}`), agent.id);
    item.type = 'button';
    item.append(el('b', null, `@${agent.id}`), el('span', null, agent.ready ? label(agent.id) : `${label(agent.id)} · not ready`));
    item.disabled = !agent.ready;
    item.addEventListener('click', () => reviewWith(agent.id));
    menuNode.append(item);
  }
  menuNode.hidden = false;
  const width = 240, height = 40 + 36 * state.agents.size;
  menuNode.style.left = `${Math.min(x, window.innerWidth - width - 12)}px`;
  menuNode.style.top = `${Math.min(y, window.innerHeight - height - 12)}px`;
}
function hideViewerMenu() { viewerUI.menu.hidden = true; }
viewerUI.review?.addEventListener('click', (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (viewerUI.menu.hidden) showViewerMenu(rect.left, rect.bottom + 6); else hideViewerMenu();
});
viewer.dialog.addEventListener('click', (event) => { if (!viewerUI.menu.hidden && !viewerUI.menu.contains(event.target) && event.target !== viewerUI.review) hideViewerMenu(); });
viewer.dialog.addEventListener('close', () => { hideViewerMenu(); setSelection(null, null); ripley.frame = null; ripley.history = []; ripleyClearErrors(); if (ripley.nav) ripley.nav.hidden = true; });

function codeView(text, { line = null, lines = null } = {}) {
  const pre = el('pre', 'code');
  viewerUI.lineNodes = [];
  const rows = text.replace(/\n$/, '').split('\n');
  rows.forEach((content, index) => {
    const n = index + 1;
    const ln = el('span', 'ln', String(n));
    const tx = el('span', 'tx', content || ' ');
    ln.dataset.n = n; tx.dataset.n = n;
    const marked = lines ? n >= lines.from && n <= lines.to : n === line;
    if (marked) { ln.classList.add('hl'); tx.classList.add('hl'); }
    ln.addEventListener('click', (event) => {
      if (event.shiftKey && viewerUI.from !== null) setSelection(viewerUI.from, n);
      else if (viewerUI.from === n && viewerUI.to === n) setSelection(null, null);
      else setSelection(n, n);
    });
    tx.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const lo = Math.min(viewerUI.from ?? -1, viewerUI.to ?? -1), hi = Math.max(viewerUI.from ?? -1, viewerUI.to ?? -1);
      if (viewerUI.from === null || n < lo || n > hi) setSelection(n, n);
      showViewerMenu(event.clientX, event.clientY);
    });
    ln.addEventListener('contextmenu', (event) => { event.preventDefault(); if (viewerUI.from === null) setSelection(n, n); showViewerMenu(event.clientX, event.clientY); });
    viewerUI.lineNodes.push({ n, ln, tx });
    pre.append(ln, tx);
  });
  return pre;
}

// RIPLEY: which files the viewer can render instead of showing as source.
const RIPLEY_KIND = (name) => (/\.(html?|xhtml)$/i.test(name ?? '') ? 'html' : /\.svg$/i.test(name ?? '') ? 'svg' : /\.(md|markdown)$/i.test(name ?? '') ? 'markdown' : null);
const viewerMode = { button: document.querySelector('#viewer-mode'), preview: false, kind: null, text: '', src: '', line: null, lines: null };

function showViewerSource() {
  if (ripley.nav) ripley.nav.hidden = true;
  ripleyClearErrors();
  ripley.frame = null;
  const pre = codeView(viewerMode.text, { line: viewerMode.line, lines: viewerMode.lines });
  viewer.body.replaceChildren(pre);
  if (!state.ripley && viewerMode.kind) {
    const hint = el('div', 'viewer-hint');
    hint.append('RIPLEY can render this file. ', el('b', null, 'Enable it in MODULES.'));
    viewer.body.prepend(hint);
  }
  if (viewerMode.lines) setSelection(viewerMode.lines.from, viewerMode.lines.to);
  else if (viewerMode.line) setSelection(viewerMode.line, viewerMode.line);
  pre.querySelector('.hl')?.scrollIntoView?.({ block: 'center' });
}
// RIPLEY's frame, its small bar (back, reload), its history inside the project,
// what the page reports up (which page, which errors), and reloads when an
// agent changes the file on screen.
const ripley = {
  nav: document.querySelector('#viewer-nav'),
  back: document.querySelector('#viewer-back'),
  reload: document.querySelector('#viewer-reload'),
  errors: document.querySelector('#viewer-errors'),
  frame: null,
  history: [],      // preview URLs visited in this session of the viewer
  current: null,    // project-relative path of the page on screen
  root: 'project',
};
function ripleyPathFromPreview(pathname) {
  const match = String(pathname ?? '').match(/^\/preview\/(project|attachments)\/(.*)$/);
  return match ? { root: match[1], path: decodeURIComponent(match[2]) } : null;
}
function ripleyNavigate(url, { push = true } = {}) {
  if (!ripley.frame) return;
  if (push && ripley.history.at(-1) !== url) ripley.history.push(url);
  ripley.frame.src = url;
  ripley.back.disabled = ripley.history.length < 2;
}
function ripleyClearErrors() { if (ripley.errors) { ripley.errors.hidden = true; ripley.errors.replaceChildren(); } }
function ripleyShowError({ message, source, line }) {
  if (!ripley.errors || !viewerMode.preview) return;
  const where = source ? `${ripleyPathFromPreview(new URL(source, window.location.origin).pathname)?.path ?? source}${line ? `:${line}` : ''}` : (ripley.current ? `${ripley.current}${line ? `:${line}` : ''}` : '');
  const row = el('div', 'err-row');
  row.append(el('span', 'msg', message));
  if (where) row.append(el('span', 'where', where));
  const ask = el('button', null, 'ASK THE ROOM');
  ask.type = 'button';
  ask.title = 'Put this error and the file into the composer';
  ask.addEventListener('click', () => {
    const reference = ripley.current ? `!${ripley.current}${line ? `:${line}` : ''} ` : '';
    els.input.value = `${reference}RIPLEY reports an error in the page: ${message}${where ? ` (${where})` : ''}. Find the cause and propose the fix.`;
    viewer.dialog.close();
    autosize();
    els.input.focus();
  });
  row.append(ask);
  ripley.errors.append(row);
  while (ripley.errors.children.length > 3) ripley.errors.firstChild.remove();
  ripley.errors.hidden = false;
}
window.addEventListener?.('message', (event) => {
  const data = event.data;
  if (!data || data.ripley !== 1 || !ripley.frame || event.source !== ripley.frame.contentWindow) return;
  if (data.type === 'page') {
    const at = ripleyPathFromPreview(data.path);
    if (at) {
      ripley.current = at.path;
      ripley.root = at.root;
      viewer.path.textContent = `${at.root === 'project' ? '/' : ''}${at.path}${data.title ? ` · ${data.title}` : ''}`;
      viewer.open.href = `/api/files?root=${at.root}&path=${encodeURIComponent(at.path)}`;
    }
  } else if (data.type === 'error') {
    ripleyShowError(data);
  }
});
ripley.back?.addEventListener('click', () => {
  if (ripley.history.length < 2) return;
  ripley.history.pop();
  ripleyClearErrors();
  ripleyNavigate(ripley.history.at(-1), { push: false });
});
ripley.reload?.addEventListener('click', () => { if (ripley.frame) { ripleyClearErrors(); ripley.frame.src = ripley.frame.src; } });
// An agent changed what is on screen (CONTROL) or created it (a lease): reload the page.
function ripleyMaybeReload(paths) {
  if (!viewerMode.preview || !ripley.frame || !ripley.current || !viewer.dialog.open) return;
  const page = ripley.current;
  const dir = page.includes('/') ? page.slice(0, page.lastIndexOf('/') + 1) : '';
  const hit = paths.some((path) => path === page || (dir ? path.startsWith(dir) : !path.includes('/')));
  if (!hit) return;
  ripleyClearErrors();
  ripley.frame.src = ripley.frame.src;
  toast('MU/TH/UR › RIPLEY reloaded the page: an agent changed it.');
}

function showViewerPreview() {
  if (viewerMode.kind === 'markdown') {
    ripley.nav.hidden = true;
    const doc = el('article', 'viewer-markdown bubble');
    doc.append(renderMarkdown(viewerMode.text));
    viewer.body.replaceChildren(doc);
    return;
  }
  // Scripts may run; the frame has no origin of its own, no network, no forms, no way up to MADRE.
  const frame = el('iframe', 'ripley');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.title = `RIPLEY preview of ${viewer.path.textContent}`;
  ripley.frame = frame;
  ripley.history = [];
  ripleyClearErrors();
  const start = previewUrl(viewerMode.src);
  const at = ripleyPathFromPreview(start);
  ripley.current = at?.path ?? null;
  ripley.root = at?.root ?? 'project';
  viewer.body.replaceChildren(frame);
  ripley.nav.hidden = false;
  ripleyNavigate(start);
}
// /api/files?root=project&path=a/b.html → /preview/project/a/b.html, so the page's relative links resolve.
function previewUrl(filesUrl) {
  const params = new URL(filesUrl, window.location.origin).searchParams;
  const root = params.get('root') === 'attachments' ? 'attachments' : 'project';
  const path = (params.get('path') ?? '').split('/').map(encodeURIComponent).join('/');
  return `/preview/${root}/${path}`;
}
function syncViewerMode() {
  if (!viewerMode.button) return;
  const can = Boolean(viewerMode.kind) && state.ripley;
  viewerMode.button.hidden = !can;
  viewerMode.button.textContent = viewerMode.preview ? 'SOURCE' : 'PREVIEW';
  viewerMode.button.title = viewerMode.preview ? 'Show the file as text' : 'Render with RIPLEY in a sealed frame';
}
viewerMode.button?.addEventListener('click', () => { viewerMode.preview = !viewerMode.preview; syncViewerMode(); if (viewerMode.preview) showViewerPreview(); else showViewerSource(); });

async function openViewer({ root = 'project', path = null, url = null, label = null, line = null, lines = null }) {
  const src = url ?? `/api/files?root=${root}&path=${encodeURIComponent(path)}`;
  viewer.path.textContent = label ?? (root === 'project' ? `/${path}` : path);
  viewer.open.href = src;
  viewer.body.replaceChildren(el('div', null, 'loading…'));
  viewerUI.path = root === 'project' ? path : null;
  setSelection(null, null);
  viewerMode.kind = null;
  syncViewerMode();
  if (!viewer.dialog.open) viewer.dialog.showModal();
  try {
    const response = await fetch(src);
    if (!response.ok) { const err = await response.json().catch(() => ({})); viewer.body.replaceChildren(el('div', 'err', err.error ?? `HTTP ${response.status}`)); return; }
    const type = response.headers.get('content-type') ?? '';
    const kind = RIPLEY_KIND(path ?? label ?? '');
    if (type.startsWith('image/') && kind !== 'svg') { const img = el('img'); img.src = src; img.alt = viewer.path.textContent; viewer.body.replaceChildren(img); return; }
    if (type === 'application/pdf' || type.startsWith('video/') || type.startsWith('audio/')) {
      const frame = el(type === 'application/pdf' ? 'iframe' : type.startsWith('video/') ? 'video' : 'audio');
      frame.src = src; if (frame.tagName !== 'IFRAME') frame.controls = true;
      viewer.body.replaceChildren(frame); return;
    }
    const text = await response.text();
    Object.assign(viewerMode, { kind, text, src, line, lines, preview: Boolean(kind) && state.ripley && !line && !lines });
    syncViewerMode();
    if (viewerMode.preview) showViewerPreview(); else showViewerSource();
  } catch (error) {
    viewer.body.replaceChildren(el('div', 'err', error.message));
  }
}
viewer.close.addEventListener('click', () => viewer.dialog.close());

function codeBlock(lines, lang) {
  const wrapper = el('div', `codeblock${lang ? ' has-lang' : ''}`);
  if (lang) wrapper.append(el('span', 'lang', lang));
  const copy = el('button', 'copy', 'copy');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copy.textContent = 'copied';
      setTimeout(() => { copy.textContent = 'copy'; }, 1500);
    } catch {
      copy.textContent = 'select & copy';
    }
  });
  wrapper.append(copy);
  const pre = el('pre');
  pre.append(el('code', null, lines.join('\n')));
  wrapper.append(pre);
  return wrapper;
}

// A ```pulse block is a delegation plan: render it as steps, not as code.
function planCard(lines) {
  const card = el('div', 'plan-card');
  card.append(el('span', 'plan-label', 'plan'));
  const list = el('ol');
  for (const raw of lines) {
    const match = raw.trim().match(/^[-*]?\s*@([a-z0-9_-]+)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    const item = paint(el('li'), match[1].toLowerCase());
    item.append(el('b', null, `@${match[1].toLowerCase()}`));
    item.append(` ${match[2]}`);
    list.append(item);
  }
  card.append(list);
  return card;
}

export function renderMarkdown(text) {
  const fragment = document.createDocumentFragment();
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const p = el('p');
    renderInline(paragraph.join(' '), p);
    fragment.append(p);
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const body = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) body.push(lines[index++]);
      index += 1;
      fragment.append(fence[1]?.toLowerCase() === 'pulse' ? planCard(body) : codeBlock(body, fence[1]));
      continue;
    }
    if (!line.trim()) { flushParagraph(); index += 1; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const h = el(`h${Math.min(heading[1].length, 4)}`);
      renderInline(heading[2].replace(/\s#+\s*$/, ''), h);
      fragment.append(h);
      index += 1;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flushParagraph(); fragment.append(el('hr')); index += 1; continue; }

    // GFM table: a header row, a separator row of dashes, then body rows.
    if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[index + 1])) {
      flushParagraph();
      const splitRow = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
      const aligns = splitRow(lines[index + 1]).map((cell) => (/^:-+:$/.test(cell) ? 'center' : /-+:$/.test(cell) ? 'right' : null));
      const wrap = el('div', 'table-wrap');
      const table = el('table');
      const thead = el('thead');
      const headRow = el('tr');
      splitRow(line).forEach((cell, column) => { const th = el('th'); if (aligns[column]) th.style.textAlign = aligns[column]; renderInline(cell, th); headRow.append(th); });
      thead.append(headRow);
      table.append(thead);
      const tbody = el('tbody');
      index += 2;
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        const tr = el('tr');
        splitRow(lines[index]).forEach((cell, column) => { const td = el('td'); if (aligns[column]) td.style.textAlign = aligns[column]; renderInline(cell, td); tr.append(td); });
        tbody.append(tr);
        index += 1;
      }
      table.append(tbody);
      wrap.append(table);
      fragment.append(wrap);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const list = el(bullet ? 'ul' : 'ol');
      const test = bullet ? /^\s*[-*+]\s+(.*)$/ : /^\s*\d+[.)]\s+(.*)$/;
      while (index < lines.length) {
        const item = lines[index].match(test);
        if (!item) {
          if (lines[index].trim() && /^\s{2,}/.test(lines[index]) && list.lastChild) {
            list.lastChild.append(' ');
            renderInline(lines[index].trim(), list.lastChild);
            index += 1;
            continue;
          }
          break;
        }
        const li = el('li');
        renderInline(item[1], li);
        list.append(li);
        index += 1;
      }
      fragment.append(list);
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      const block = el('blockquote');
      const body = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) body.push(lines[index++].replace(/^\s*>\s?/, ''));
      renderInline(body.join(' '), block);
      fragment.append(block);
      continue;
    }
    paragraph.push(line.trim());
    index += 1;
  }
  flushParagraph();
  return fragment;
}

/* ---------- agents bar, picker & onboarding ---------- */

const fmtWindow = (minutes) => (!Number.isFinite(Number(minutes)) ? 'window' : Number(minutes) % 1440 === 0 ? `${Number(minutes) / 1440}d` : Number(minutes) % 60 === 0 ? `${Number(minutes) / 60}h` : `${minutes}m`);
const fmtReset = (iso) => { if (!iso) return ''; const date = new Date(iso); if (Number.isNaN(date.getTime())) return ''; const sameDay = date.toDateString() === new Date().toDateString(); return sameDay ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }); };
// An official window whose reset time has passed counts as empty until the CLI reports again.
function liveOfficial(agent) {
  if (!Number.isFinite(agent.officialPercent)) return null;
  if (agent.officialResetAt && new Date(agent.officialResetAt).getTime() <= Date.now()) return 0;
  return agent.officialPercent;
}
function localPercent(agent) {
  return state.budget && agent.tokens ? Math.min(100, (agent.tokens / state.budget) * 100) : 0;
}
// What the ring shows: the provider's real window when the CLI publishes one, else the local rolling window.
function ringPercent(agent) {
  const official = liveOfficial(agent);
  return official === null ? localPercent(agent) : official;
}

function renderAgents() {
  els.agents.replaceChildren();
  for (const agent of state.agents.values()) {
    const percent = ringPercent(agent);
    const official = liveOfficial(agent);
    const node = avatar(agent.id, {
      size: 26,
      ring: agent.ready,
      pct: percent,
      status: agent.ready ? 'ready' : agent.detected ? 'detected' : 'offline',
    });
    node.title = [
      `${agent.label}${brandOf(agent.id).vendor ? ` · ${brandOf(agent.id).vendor}` : ''}`,
      agent.ready ? 'Ready' : agent.detected ? 'Detected, adapter pending' : 'Not installed',
      agent.version ? agent.version : null,
      official === null
        ? (agent.tokens ? `Ring: local 5h window · ${Math.round(percent)}% of ${formatTokens(state.budget ?? 0)} budget tokens` : 'Ring: local window · no usage yet')
        : `Ring: provider limit · ${Math.round(official)}% used${agent.officialResetAt ? ` · resets ${fmtReset(agent.officialResetAt)}` : ''}`,
      agent.tokens ? `${agent.tokens.toLocaleString()} budget tokens in the local window` : null,
    ].filter(Boolean).join('\n');
    els.agents.append(node);
  }
}

function renderPicker() {
  els.picker.replaceChildren();
  const ready = [...state.agents.values()].filter((agent) => agent.ready);
  if (!ready.length) return;
  if (!els.target.value || !ready.some((agent) => agent.id === els.target.value)) els.target.value = ready[0].id;
  for (const agent of ready) {
    const pick = avatar(agent.id, { size: 30 });
    pick.classList.add('pick');
    pick.setAttribute('role', 'radio');
    pick.setAttribute('aria-label', agent.label);
    pick.setAttribute('aria-checked', String(els.target.value === agent.id));
    pick.tabIndex = 0;
    const choose = () => {
      if (els.target.value === agent.id) { toggleModelMenu(agent.id, pick); return; }
      closeModelMenu();
      closeModeMenu();
      els.target.value = agent.id;
      setMode(defaultModeFor(agent.id));
      els.input.focus();
    };
    pick.title = els.target.value === agent.id ? `${agent.label} · click again to choose its model` : agent.label;
    pick.addEventListener('click', choose);
    pick.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); choose(); } });
    els.picker.append(pick);
  }
  const current = state.agents.get(els.target.value);
  if (current) {
    const text = paint(el('span', 'pick-label'), current.id);
    text.append('to ');
    text.append(el('b', null, `@${current.id}`));
    if (current.local) {
      const note = el('span', 'pick-note', 'memory · answers & asks the crew · never writes');
      note.title = '@madre runs on this machine and speaks for what the room remembers. "@madre, ask the crew …" opens a round with every agent online. To change files, write to a CLI agent.';
      text.append(note);
    }
    const modeChip = el('button', `mode-chip m${state.mode}`);
    modeChip.type = 'button';
    modeChip.append(el('b', null, `#${state.mode}`), `${MODES[state.mode].label} ▾`);
    modeChip.title = `Permission mode for this message · ${MODES[state.mode].hint}`;
    modeChip.addEventListener('click', (event) => { event.stopPropagation(); toggleModeMenu(current.id, modeChip); });
    text.append(modeChip);
    const chosen = state.chosenModel[current.id];
    const modelChip = el('button', 'model-chip', chosen ? `${chosen} ▾` : 'default model ▾');
    modelChip.type = 'button';
    modelChip.title = 'Choose the model for this agent';
    modelChip.addEventListener('click', (event) => { event.stopPropagation(); toggleModelMenu(current.id, modelChip); });
    text.append(modelChip);
    els.picker.append(text);
  }
  if (typeof renderCreateScopes === 'function') renderCreateScopes();
  if (typeof renderHighlight === 'function') renderHighlight();
}

/* ---------- model menu: which model answers this request ---------- */

const modelMenu = el('div', 'model-menu');
modelMenu.hidden = true;
document.body.append(modelMenu);
let modelMenuFor = null;

async function ensureModels(id) {
  if (state.models[id]) return state.models[id];
  try {
    const data = await fetch(`/api/models${id === 'opencode' ? '?opencode=1' : ''}`).then((response) => response.json());
    state.models = { ...state.models, ...(data.models ?? {}) };
  } catch { /* offline: fall back to whatever we know */ }
  return state.models[id] ?? { models: [], default: null, note: '' };
}

function rememberModel(id, model) {
  if (model) state.chosenModel[id] = model; else delete state.chosenModel[id];
  try { localStorage.setItem('pulse.chosenModel', JSON.stringify(state.chosenModel)); } catch { /* private mode */ }
}

async function toggleModelMenu(id, anchor) {
  if (!modelMenu.hidden && modelMenuFor === id) { closeModelMenu(); return; }
  modelMenuFor = id;
  paint(modelMenu, id);
  modelMenu.replaceChildren(el('div', 'model-menu-title', 'loading models…'));
  modelMenu.hidden = false;
  placeModelMenu(anchor);
  const info = await ensureModels(id);
  if (modelMenuFor !== id) return;
  modelMenu.replaceChildren();
  const title = el('div', 'model-menu-title');
  title.append(el('b', null, `@${id}`), ` · model for this request`);
  modelMenu.append(title);
  const list = el('div', 'model-list');
  const options = [{ name: null, label: `default${info.default ? ` · ${info.default}` : ''}` }, ...info.models.map((name) => ({ name, label: name }))];
  for (const option of options) {
    const button = el('button', `model-option${(state.chosenModel[id] ?? null) === option.name ? ' current' : ''}`, option.label);
    button.type = 'button';
    button.addEventListener('click', () => { rememberModel(id, option.name); closeModelMenu(); renderPicker(); els.input.focus(); });
    list.append(button);
  }
  modelMenu.append(list);
  const custom = el('form', 'model-custom');
  const input = el('input'); input.placeholder = 'other model name…'; input.spellcheck = false;
  custom.append(input);
  custom.addEventListener('submit', (event) => { event.preventDefault(); const name = input.value.trim(); if (name) { rememberModel(id, name); closeModelMenu(); renderPicker(); } });
  modelMenu.append(custom);
  if (info.note) modelMenu.append(el('div', 'model-note', info.note));
  placeModelMenu(anchor);
}
function placeModelMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = modelMenu.offsetWidth || 280;
  const height = modelMenu.offsetHeight || 200;
  modelMenu.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left))}px`;
  modelMenu.style.top = `${Math.max(12, rect.top - height - 10)}px`;
}
function closeModelMenu() { modelMenu.hidden = true; modelMenuFor = null; }
document.addEventListener('click', (event) => { if (!modelMenu.hidden && !modelMenu.contains(event.target) && !event.target.closest('.picker')) closeModelMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModelMenu(); });

/* ---------- mode menu: how far this message may go ---------- */

const modeMenu = el('div', 'model-menu mode-menu');
modeMenu.hidden = true;
document.body.append(modeMenu);
let modeMenuFor = null;
function closeModeMenu() { modeMenu.hidden = true; modeMenuFor = null; }
document.addEventListener('click', (event) => { if (!modeMenu.hidden && !modeMenu.contains(event.target) && !event.target.closest('.picker')) closeModeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModeMenu(); });

function ceilingFor(id) { return state.capabilities[id]?.scopes?.maxMode ?? 1; }
function defaultModeFor(id) { return state.capabilities[id]?.scopes?.defaultMode ?? 1; }

function toggleModeMenu(id, anchor) {
  if (!modeMenu.hidden && modeMenuFor === id) { closeModeMenu(); return; }
  closeModelMenu();
  modeMenuFor = id;
  paint(modeMenu, id);
  modeMenu.replaceChildren();
  const cap = ceilingFor(id);
  const scopes = state.capabilities[id]?.scopes;
  const canRaise = Boolean(scopes?.write?.capable);
  const title = el('div', 'model-menu-title');
  title.append(el('b', null, `@${id}`), ` · mode for this message · ceiling #${cap}`);
  modeMenu.append(title);
  const ladder = el('div', 'mode-ladder');
  for (const n of [0, 1, 2, 3, 4]) {
    const locked = n > cap;
    const raise = locked && n >= 3 && canRaise;
    const option = el('button', `mode-option o${n}${state.mode === n ? ' current' : ''}${locked ? ' locked' : ''}`);
    option.type = 'button';
    option.disabled = locked && !raise;
    const body = el('span', 'body');
    body.append(el('span', 'name', MODES[n].label), el('span', 'hint', MODES[n].hint));
    option.append(el('span', 'n', `#${n}`), body);
    const tag = state.mode === n ? 'NOW' : raise ? `RAISE TO #${n} ›` : locked ? 'LOCKED' : n === 4 ? 'OVERRIDE ×2' : n === 3 ? 'OVERRIDE' : n === defaultModeFor(id) ? 'DEFAULT' : '';
    if (tag) {
      const label = el('span', `tag${raise ? ' raise' : ''}`, tag);
      if (state.mode === n) label.append(el('span', 'dot'));
      option.append(label);
    }
    option.title = !locked ? MODES[n].hint
      : raise ? `@${id} is capped at #${cap}. This raises MAX MODE to #${n} in CONNECTIONS and opens the override.`
      : n >= 3 ? `@${id}'s CLI cannot write files, so ${MODES[n].label} is not possible for it.`
      : `Above @${id}'s MAX MODE (#${cap}). Raise it in CONNECTIONS.`;
    option.addEventListener('click', () => {
      closeModeMenu();
      if (n >= 3) { openOverride(id, { raise, mode: n }); return; }
      setMode(n, { wink: n === 0 });
    });
    ladder.append(option);
  }
  modeMenu.append(ladder);
  modeMenu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = modeMenu.offsetWidth || 320;
  const height = modeMenu.offsetHeight || 260;
  modeMenu.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left))}px`;
  modeMenu.style.top = `${Math.max(12, rect.top - height - 10)}px`;
}

// One place changes the mode: chip, classes, label, placeholder and the old CREATE state.
function setMode(n, { wink = false } = {}) {
  const mode = [0, 1, 2, 3, 4].includes(n) ? n : 1;
  state.mode = mode;
  state.create = mode === 2;
  if (mode < 3) state.modeArmedFor = null;
  els.createToggle.setAttribute('aria-pressed', String(state.create));
  els.composer.classList.toggle('creating', mode === 2);
  els.composer.classList.toggle('ghost', mode === 0);
  els.composer.classList.toggle('control', mode >= 3);
  els.composer.classList.toggle('airlock', mode === 4);
  for (const n of [0, 1, 2, 3, 4]) els.composer.classList.toggle(`m${n}`, mode === n);
  if (typeof renderCreateScopes === 'function') renderCreateScopes();
  if (typeof updateCrewLabel === 'function') { updateCrewLabel(); updatePlaceholder(); }
  if (typeof renderPicker === 'function') renderPicker();
  if (typeof autosize === 'function') autosize();
  if (wink && typeof winkField === 'function') winkField(mode >= 3 ? 'control' : mode === 0 ? 'ghost' : 'ash');
}
// After a message goes out the mode falls back to the target's default: #2 for a standing lease, else #1.
function resetModeAfterSend() { setMode(defaultModeFor(els.target.value)); }

/* ---------- emergency command override: arming CONTROL ---------- */

const override = {
  dialog: document.querySelector('#override'),
  form: document.querySelector('#override-form'),
  input: document.querySelector('#override-input'),
  reply: document.querySelector('#override-reply'),
  brief: document.querySelector('#override-brief'),
  cancel: document.querySelector('#override-cancel'),
  frame: document.querySelector('#override .override-frame'),
  agent: null,
  raise: false,   // the agent is capped below the mode: arming also raises MAX MODE in CONNECTIONS
  mode: 3,        // #3 CONTROL or #4 AIRLOCK
  stage: 'designation',   // AIRLOCK asks twice: the designation, then the word AIRLOCK
};
const OVERRIDE_BRIEF = {
  3: (id, raise) => `PRIORITY ONE. CONTROL GIVES @${id} THE PROJECT ITSELF: READ, CREATE, MODIFY, NO APPROVAL PER ACTION.${raise ? ` THIS ALSO RAISES @${id} MAX MODE TO #3 IN CONNECTIONS.` : ''} TYPE THE PROJECT DESIGNATION TO ARM.`,
  4: (id, raise) => `PRIORITY ONE. AIRLOCK OPENS THE SHIP FOR @${id}: EVERYTHING CONTROL ALLOWS, PLUS COMMANDS, GIT PUSH AND DEPLOYS WITH THE SESSIONS ON THIS MACHINE. FILES COME BACK WITH UNDO; WHAT LEAVES THE SHIP DOES NOT.${raise ? ` THIS ALSO RAISES @${id} MAX MODE TO #4 IN CONNECTIONS.` : ''} TYPE THE PROJECT DESIGNATION, THEN THE WORD AIRLOCK.`,
};
function projectDesignation() { return (state.projectRoot ?? '').split('/').filter(Boolean).pop() ?? ''; }
function openOverride(id, { raise = false, mode = 3 } = {}) {
  if (!override.dialog) return;
  override.agent = id;
  override.raise = raise;
  override.mode = mode;
  override.stage = 'designation';
    override.form.querySelector('.k').textContent = 'DESIGNATION ›';
  override.input.placeholder = "type the current project's folder name to arm";
  override.dialog.querySelector('.mother-sub').textContent = mode === 4 ? 'AIRLOCK OVERRIDE 100375 · SECOND KEY REQUIRED' : 'EMERGENCY COMMAND OVERRIDE 100375';
  override.brief.textContent = OVERRIDE_BRIEF[mode](id.toUpperCase(), raise);
  override.reply.textContent = '';
  override.reply.className = 'mother-answer override-reply';
  override.input.value = '';
  override.dialog.showModal();
  override.input.focus();
}
override.cancel?.addEventListener('click', () => override.dialog.close());
override.form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const typed = override.input.value.trim();
  const deny = (text = 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.') => {
    override.reply.textContent = text;
    override.reply.className = 'mother-answer override-reply denied';
    override.frame.classList.remove('shake'); void override.frame.offsetWidth; override.frame.classList.add('shake');
    override.input.select();
  };
  if (override.stage === 'designation') {
    const expected = projectDesignation();
    if (!typed || typed.toLowerCase() !== expected.toLowerCase()) { deny(); return; }
    if (override.mode === 4) {
      // The second key: the word itself, so an airlock is never opened by a folder name alone.
      override.stage = 'confirm';
      override.reply.textContent = 'DESIGNATION ACCEPTED. SECOND KEY: TYPE AIRLOCK TO OPEN THE SHIP.';
      override.reply.className = 'mother-answer override-reply';
      override.form.querySelector('.k').textContent = 'SECOND KEY ›';
      override.input.value = ''; override.input.placeholder = 'AIRLOCK';
      override.input.focus();
      return;
    }
  } else if (typed.toUpperCase() !== 'AIRLOCK') { deny('SECOND KEY REJECTED. TYPE AIRLOCK, OR CANCEL.'); return; }
  override.reply.textContent = override.mode === 4
    ? `SPECIAL ORDER 937 ACKNOWLEDGED. AIRLOCK OPEN FOR @${override.agent.toUpperCase()}. WHAT LEAVES DOES NOT COME BACK.`
    : `SPECIAL ORDER 937 ACKNOWLEDGED. CONTROL ARMED FOR @${override.agent.toUpperCase()}. CREW IN COMMAND.`;
  override.reply.className = 'mother-answer override-reply granted';
  const agent = override.agent;
  const raise = override.raise;
  const mode = override.mode;
  setTimeout(async () => {
    override.dialog.close();
    if (raise) {
      try {
        await saveSettingNow({ scopes: { [agent]: { maxMode: mode } } });
        if (settingsUI.open) renderSettings();
      } catch (error) {
        toast(`MU/TH/UR › MAX MODE was not raised for @${agent}: ${error.message}. ${MODES[mode].label} stays off.`);
        return;
      }
    }
    state.modeArmedFor = agent;
    els.target.value = agent;
    setMode(mode, { wink: true });
    toast(mode === 4
      ? `MU/TH/UR › AIRLOCK open for @${agent} for this message.${raise ? ' MAX MODE is now #4 in CONNECTIONS.' : ''} Files are checkpointed; what leaves the machine is not undone.`
      : `MU/TH/UR › CONTROL armed for @${agent} for this message.${raise ? ' MAX MODE is now #3 in CONNECTIONS.' : ''} A checkpoint is taken before it runs; every change is listed and UNDO is one click.`);
  }, 900);
});

// THE BRIDGE: first contact. Every agent as a card with the one action it needs right now,
// install or sign in, run here and streamed here. The room opens the moment one turns green.
function renderOnboarding() {
  const crew = [...state.agents.values()];
  const ready = crew.filter((agent) => agent.ready && sessionOf(agent) !== 'signed-out');
  const usable = ready.length ? ready : crew.filter((agent) => agent.ready);
  els.onboarding.hidden = usable.length > 0 && !state.bridgePinned;
  els.composer.setAttribute('aria-disabled', usable.length ? 'false' : 'true');
  els.input.disabled = !usable.length;
  els.send.disabled = !usable.length;
  renderEmptyStarts();
  // The tour explains a room you can already use; while the bridge is up, the bridge is the lesson.
  if (usable.length) maybeStartTour();
  if (els.onboarding.hidden || !els.bridgeCrew) return;
  if (state.ollama === null && !state.ollamaAsked) { state.ollamaAsked = true; void loadOllama(); }
  els.bridgeCrew.replaceChildren();
  for (const agent of crew) els.bridgeCrew.append(bridgeCard(agent));
  const close = document.querySelector('#bridge-close');
  if (close) close.hidden = !usable.length;
}
const sessionOf = (agent) => state.sessions?.[agent.id]?.state ?? 'unknown';

// The blank page is its own friction: three first messages, written for this project.
function renderEmptyStarts() {
  const box = els.emptyStarts;
  if (!box) return;
  const ready = [...state.agents.values()].filter((agent) => agent.ready && agent.id !== 'madre');
  box.replaceChildren();
  if (!ready.length) return;
  const project = (state.projectRoot ?? '').split('/').filter(Boolean).pop() || 'this project';
  for (const text of [
    `Explain ${project} to me: what it does, how it runs, and where the important code lives.`,
    `Read the project and name the three things most likely to break. Say why, with file and line.`,
    `What would you change first in ${project}, and what would you not touch?`,
  ]) {
    const chip = el('button', 'empty-start', text);
    chip.type = 'button';
    chip.addEventListener('click', () => {
      els.input.value = text;
      els.input.focus();
      if (typeof autosize === 'function') autosize();
      if (typeof renderHighlight === 'function') renderHighlight();
    });
    box.append(chip);
  }
}

function bridgeCard(agent) {
  const card = paint(el('article', 'bridge-card'), agent.id);
  card.id = `bridge-${agent.id}`;
  const session = state.sessions?.[agent.id];
  const signedIn = session?.state === 'signed-in';
  const stage = !agent.detected ? 'missing' : !agent.ready ? 'inert' : signedIn ? 'ready' : 'signed-out';
  const head = el('div', 'head');
  head.append(avatar(agent.id, { size: 30, status: stage === 'ready' ? 'ready' : agent.detected ? 'detected' : 'offline' }));
  const title = el('div', 'title');
  title.append(el('b', null, agent.label));
  title.append(el('span', 'vendor', brandOf(agent.id).vendor));
  head.append(title);
  head.append(el('span', `state ${stage}`, stage === 'missing' ? 'NOT INSTALLED' : stage === 'inert' ? 'NO ADAPTER' : stage === 'ready' ? 'READY' : 'SIGNED OUT'));
  card.append(head);
  const detail = el('div', 'detail');
  if (agent.id === 'madre') detail.append(ollamaDetail(agent));
  else if (stage === 'missing') detail.append(agent.install ? `Not on this computer · ${agent.install.display}` : 'Not on this computer.');
  else detail.append(`${agent.version ?? 'version unknown'}${session?.detail ? ` · ${session.detail}` : ''}`);
  card.append(detail);
  // What is behind this door: the account it needs, and whether there is a way in without paying.
  if (agent.account) {
    const account = el('div', 'account');
    if (agent.paid === false) account.append(el('span', 'free', 'FREE WAY IN'));
    account.append(agent.account);
    card.append(account);
  }
  const actions = el('div', 'actions');
  if (agent.id === 'madre') for (const button of ollamaActions()) actions.append(button);
  else if (stage === 'missing' && agent.install) actions.append(bridgeInstallButton(agent));
  let reveal = null;
  if (stage === 'signed-out' || (stage === 'ready' && agent.login?.headless)) {
    if (agent.login?.headless) actions.append(bridgeSignInButton(agent, stage === 'ready'));
    else if (agent.key) {
      reveal = el('button', 'primary', 'PASTE KEY');
      reveal.type = 'button';
      actions.append(reveal);
    } else if (agent.login) actions.append(el('span', 'note', 'signs in from its own prompt:'));
  }
  if (actions.childNodes.length) card.append(actions);
  if (reveal) {
    const slot = el('div', 'key-slot');
    slot.hidden = true;
    slot.append(keyForm(agent, { onDone: () => renderOnboarding() }));
    slot.append(el('p', 'key-note', `Or do it from a terminal: ${agent.login.display}`));
    reveal.addEventListener('click', () => { slot.hidden = !slot.hidden; if (!slot.hidden) slot.querySelector('input')?.focus(); });
    card.append(slot);
  } else if (stage !== 'missing' && agent.login && !agent.login.headless) card.append(commandBlock([agent.login.display, `# ${agent.login.note}`]));
  const log = el('pre', 'bridge-log');
  log.id = `bridge-log-${agent.id}`;
  for (const entry of state.loginLogs.get(agent.id) ?? []) log.append(loginLine(entry));
  log.hidden = !log.childNodes.length;
  card.append(log);
  return card;
}
// Handing a key to a CLI that signs in from its own prompt. The field is a password field, the
// value is sent once and never comes back, and MADRE says where it will be written before saving.
function keyForm(agent, { onDone } = {}) {
  const plan = agent.key;
  const form = el('form', 'key-form');
  const providers = plan.providers ?? null;
  let select = null;
  if (providers) {
    select = el('select');
    for (const provider of providers) { const option = el('option', null, provider.label); option.value = provider.id; select.append(option); }
    const label = el('label');
    label.append(el('span', 'k', 'PROVIDER'), select);
    form.append(label);
  }
  const input = el('input');
  input.type = 'password';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = plan.label;
  const field = el('label');
  field.append(el('span', 'k', plan.label.toUpperCase()), input);
  form.append(field);
  const row = el('div', 'key-row');
  const save = el('button', 'primary', 'SAVE KEY');
  save.type = 'submit';
  row.append(save);
  const where = providers ? (providers.find((provider) => provider.id === select.value)?.keyUrl ?? null) : plan.keyUrl;
  const link = el('a', 'key-link', 'WHERE DO I GET ONE ↗');
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  if (where) { link.href = where; row.append(link); }
  if (providers) select.addEventListener('change', () => { const next = providers.find((provider) => provider.id === select.value)?.keyUrl; if (next) link.href = next; });
  form.append(row);
  form.append(el('p', 'key-note', plan.note));
  const said = el('p', 'key-said');
  form.append(said);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.disabled = true;
    said.textContent = 'CHECKING…';
    said.className = 'key-said';
    try {
      const response = await fetch(`/api/agents/${agent.id}/key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: input.value, provider: select?.value ?? null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      input.value = '';
      state.sessions[agent.id] = result.session ?? state.sessions[agent.id];
      toast(`MU/TH/UR › @${agent.id} is signed in.`);
      onDone?.();
    } catch (error) {
      said.textContent = error.message;
      said.className = 'key-said bad';
      save.disabled = false;
    }
  });
  return form;
}

// The bridge is first contact, but it also opens on demand to add another agent later.
function openBridge() {
  state.bridgePinned = true;
  renderOnboarding();
  els.onboarding.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
document.querySelector('#crew-button')?.addEventListener('click', () => { document.querySelector('#mother')?.close?.(); openBridge(); });
document.querySelector('#bridge-close')?.addEventListener('click', () => { state.bridgePinned = false; renderOnboarding(); });

// The local agent is not a CLI: it is Ollama, in one of four states. The card shows the one
// step that moves it forward, with the command it will run in plain sight.
function ollamaDetail(agent) {
  const info = state.ollama;
  if (agent.detected) return `Local, through Ollama${agent.version ? ` · ${agent.version}` : ''} · free, no account, no tokens`;
  if (!info) return 'Optional and free: Ollama on this computer gives the room a local memory and @madre.';
  if (!info.binary) return `Not on this computer. ${info.install?.note ?? ''}`.trim();
  if (!info.running) return 'Installed but asleep. Wake it and the room gets a local memory and @madre.';
  return 'Running, with no chat model yet. Pull one and @madre joins the room.';
}
function ollamaActions() {
  const info = state.ollama;
  if (!info || (info.running && info.chatModel)) return [];
  const act = (label, title, run) => {
    const button = el('button', 'primary', label);
    button.type = 'button';
    button.title = title;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const before = button.textContent;
      button.textContent = 'WORKING…';
      try { await run(); } catch (error) { toast(`MU/TH/UR › ${error.message}`); button.textContent = before; button.disabled = false; }
    });
    return button;
  };
  const call = async (path, body) => {
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { if (result.download) window.open(result.download, '_blank', 'noopener'); throw new Error(result.error ?? `HTTP ${response.status}`); }
    await loadOllama();
    return result;
  };
  if (!info.binary) {
    return info.install?.display
      ? [act(`INSTALL · ${info.install.display}`, info.install.note ?? '', () => call('/api/ollama/install'))]
      : [act('GET OLLAMA ↗', info.install?.note ?? '', async () => { window.open(info.install?.download ?? 'https://ollama.com/download', '_blank', 'noopener'); })];
  }
  if (!info.running) return [act('START OLLAMA', 'Wakes Ollama on this computer, nothing leaves it.', () => call('/api/ollama/start'))];
  const model = state.ollamaRecommended?.chat ?? 'qwen2.5:3b';
  return [act(`PULL ${model}`, `Downloads the model Ollama will answer with. It stays on this computer.`, () => call('/api/ollama/pull', { model }))];
}
async function loadOllama() {
  try {
    const data = await fetch('/api/ollama').then((response) => response.json());
    state.ollama = data.ollama ?? null;
    state.ollamaRecommended = data.recommended ?? null;
  } catch { state.ollama = null; }
  renderOnboarding();
}

function bridgeInstallButton(agent) {
  const button = el('button', 'primary', `INSTALL · ${agent.install.display}`);
  button.type = 'button';
  button.title = `MADRE runs this command on this computer and shows every line. ${agent.install.alternatives?.join(' · ') ?? ''}`.trim();
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'INSTALLING…';
    state.loginLogs.set(agent.id, []);
    try {
      const response = await fetch(`/api/agents/${agent.id}/install`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
    } catch (error) { toast(`MU/TH/UR › ${agent.label} was not installed: ${error.message}`); renderOnboarding(); }
  });
  return button;
}
function bridgeSignInButton(agent, again = false) {
  const button = el('button', again ? null : 'primary', again ? 'SIGN IN AGAIN' : 'SIGN IN');
  button.type = 'button';
  button.title = agent.login.note;
  button.addEventListener('click', async () => {
    button.disabled = true;
    state.loginLogs.set(agent.id, []);
    try {
      const response = await fetch(`/api/agents/${agent.id}/login`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
    } catch (error) { toast(`MU/TH/UR › sign-in did not start: ${error.message}`); renderOnboarding(); }
  });
  return button;
}

/* ---------- thread rendering ---------- */

function removeEmpty() {
  els.column.querySelector('.empty')?.remove();
}

function removeThinking(messageId) {
  document.getElementById(`working-${messageId}`)?.remove();
}

function row(kind, agentId, { compact = false } = {}) {
  const node = el('article', `row ${kind}${compact ? ' compact' : ''}`);
  if (agentId) {
    paint(node, agentId);
    node.append(avatar(agentId, { size: 28 }));
  }
  return node;
}

function renderUserMessage(event) {
  const { messageId, target, text, originalText, ashCode, model, attachments = [], create, mode } = event.payload;
  state.userMessages.set(messageId, { text: originalText ?? text, target, model });
  const reviewed = state.expendable;
  const node = row('user');
  if (event.ghost || mode === 0) node.classList.add('ghost');
  if (reviewed) node.classList.add('expendable');
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  const who = el('div', 'who');
  who.append(el('b', null, reviewed ? 'YOU · CREW (EXPENDABLE)' : 'YOU · CREW'));
  const shownMode = Number.isInteger(mode) ? mode : create ? 2 : null;
  if (shownMode !== null && shownMode !== 1) who.append(el('span', `badge mode m${shownMode}`, `#${shownMode} ${MODES[shownMode].label}`));
  if (ashCode?.active) who.append(el('span', `badge ash${ashCode.applied ? '' : ' skipped'}`, ashCode.applied ? 'ASH CODE' : 'ASH CODE · unchanged'));
  col.append(who);
  const bubble = el('div', 'bubble', text);
  if (originalText) bubble.append(ashOriginal(originalText, ashCode));
  if (attachments.length) bubble.append(fileTiles(attachments));
  col.append(bubble);
  const stamp = paint(el('div', 'stamp'), target);
  stamp.append(el('span', 'to', `→ @${target}${model ? ` · ${model}` : ''}`));
  stamp.append(el('span', null, formatTime(event.timestamp)));
  if (reviewed) stamp.append(el('span', null, 'acknowledged, human'));
  col.append(stamp);
  node.append(col);
  state.lastSender = 'you';
  if (reviewed) disarmExpendable();
  return node;
}

function renderAssistantMessage(event) {
  const { messageId, parentMessageId, sender, target, text, originalText, ashCode, status, step, totalSteps, model, mode } = event.payload;
  const delegated = status === 'delegated';
  const compact = state.lastSender === sender && !delegated && !ashCode?.active && !event.ghost;
  const node = row('assistant', sender, { compact });
  if (event.ghost || mode === 0) node.classList.add('ghost');
  if (delegated) node.classList.add('delegated');
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  if (!compact || status === 'handoff' || delegated) {
    const who = el('div', 'who');
    who.append(el('span', null, label(sender)));
    if (delegated) {
      const to = paint(el('span', 'to-agent'), target);
      to.append(`→ @${target}`);
      who.append(to);
      who.append(el('span', 'badge', target === sender ? 'closing turn' : `step ${step}/${totalSteps}`));
    } else if (target && target !== 'you') {
      who.append(el('span', 'badge', `answering @${target}`));
    }
    if (status === 'handoff') who.append(el('span', 'badge', 'handoff note'));
    if (model) who.append(el('span', 'badge model', model));
    if (Number.isInteger(mode) && mode !== 1) who.append(el('span', `badge mode m${mode}`, `#${mode} ${MODES[mode].label}`));
    if (event.payload.escalation) who.append(el('span', 'badge mode m1', event.payload.escalation === 'timeout' ? '#2 not answered · read-only' : event.payload.escalation === 'stopped' ? 'stopped' : '#2 denied · read-only'));
    if (ashCode?.active) who.append(el('span', `badge ash${ashCode.applied ? '' : ' skipped'}`, ashCode.applied ? 'ASH CODE' : 'ASH CODE · unchanged'));
    const question = state.userMessages.get(parentMessageId);
    if (question) {
      const reply = el('span', 'reply', `↳ ${question.text.length > 90 ? `${question.text.slice(0, 90)}…` : question.text}`);
      reply.title = question.text;
      who.append(reply);
    }
    col.append(who);
  }
  const bubble = el('div', 'bubble');
  bubble.append(renderMarkdown(text));
  if (originalText) bubble.append(ashOriginal(originalText, ashCode));
  if (event.payload.artifacts?.length) bubble.append(artifactTiles(event.payload.artifacts));
  bubble.append(bubbleActions({ text: originalText ?? text, sender, sequence: event.sequence, messageId: delegated ? null : messageId }));
  col.append(bubble);
  const stamp = el('div', 'stamp');
  stamp.id = `usage-${messageId}`;
  stamp.append(el('span', null, formatTime(event.timestamp)));
  col.append(stamp);
  node.append(col);
  state.lastSender = sender;
  return node;
}

// Two quiet icons at the end of a reply: copy it, or answer it through the agent you choose.
const ICON_COPY = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 5.5V3.9A1.4 1.4 0 0 0 9.1 2.5H3.9A1.4 1.4 0 0 0 2.5 3.9v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_DONE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_REPLY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3.5 2.5 7.5l4 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.8 7.5h5.7a4.5 4.5 0 0 1 4.5 4.5v.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
function iconButton(svg, title, className) {
  const button = el('button', `act ${className}`);
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = svg;
  return button;
}
const ICON_GOOD = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 7.5v5.5H3.2a.7.7 0 0 1-.7-.7V8.2a.7.7 0 0 1 .7-.7h2.3Zm0 0 2.6-4.6a1.3 1.3 0 0 1 2.4.8L10 6.8h2.6a1.3 1.3 0 0 1 1.3 1.5l-.8 3.9a1.3 1.3 0 0 1-1.3 1H5.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const ICON_BAD = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 8.5V3H12.8a.7.7 0 0 1 .7.7v4.1a.7.7 0 0 1-.7.7h-2.3Zm0 0-2.6 4.6a1.3 1.3 0 0 1-2.4-.8L6 9.2H3.4a1.3 1.3 0 0 1-1.3-1.5l.8-3.9A1.3 1.3 0 0 1 4.2 3h6.3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
// The human's verdict on a reply. Saved in the ledger; the dataset drops what is marked bad.
function ratingButtons(messageId, sender) {
  const good = iconButton(ICON_GOOD, 'Good reply · keep it for MADRE AI', 'rate good');
  const bad = iconButton(ICON_BAD, 'Bad reply · keep it out of the dataset', 'rate bad');
  const apply = (rating) => { good.classList.toggle('on', rating === 'good'); bad.classList.toggle('on', rating === 'bad'); };
  apply(state.ratings.get(messageId) ?? null);
  const send = async (rating) => {
    const current = state.ratings.get(messageId) ?? null;
    const next = current === rating ? 'none' : rating;
    try {
      const payload = await fetch('/api/messages/rate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messageId, rating: next }) }).then((response) => response.json());
      if (payload.error) throw new Error(payload.error);
    } catch (error) { toast(`Rating was not saved: ${error.message}`); }
  };
  good.addEventListener('click', (event) => { event.stopPropagation(); void send('good'); });
  bad.addEventListener('click', (event) => { event.stopPropagation(); void send('bad'); });
  return { good, bad, apply, sender };
}
function bubbleActions({ text, sender, sequence, messageId = null }) {
  const bar = el('div', 'bubble-actions');
  const copy = iconButton(ICON_COPY, 'Copy this reply', 'copy');
  copy.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      copy.innerHTML = ICON_DONE;
      copy.classList.add('done');
      setTimeout(() => { copy.innerHTML = ICON_COPY; copy.classList.remove('done'); }, 1400);
    } catch {
      toast('MU/TH/UR › the clipboard is not available here; select the text and copy.');
    }
  });
  const reply = iconButton(ICON_REPLY, 'Reply to this through an agent', 'reply');
  reply.addEventListener('click', (event) => {
    event.stopPropagation();
    const rect = reply.getBoundingClientRect();
    showReplyMenu({ text, sender, sequence }, rect.left, rect.bottom + 6);
  });
  if (messageId && sender !== 'madre') {
    const rating = ratingButtons(messageId, sender);
    state.ratingNodes.set(messageId, rating);
    bar.append(rating.good, rating.bad);
  }
  bar.append(copy, reply);
  return bar;
}

// "Reply with @agent": the quoted reply becomes the head of the message, the chosen
// agent becomes the target, and the human writes the directive under it.
const replyMenu = el('div', 'model-menu reply-menu');
replyMenu.hidden = true;
document.body?.append?.(replyMenu);
function hideReplyMenu() { replyMenu.hidden = true; }
function showReplyMenu(source, x, y) {
  if (!replyMenu.hidden && replyMenu.dataset.for === `${source.sequence}`) { hideReplyMenu(); return; }
  replyMenu.dataset.for = `${source.sequence}`;
  replyMenu.replaceChildren(el('div', 'model-menu-title', `REPLY TO @${source.sender.toUpperCase()}${source.sequence ? ` · #${source.sequence}` : ''} WITH`));
  for (const agent of state.agents.values()) {
    const item = paint(el('button', `item${agent.ready ? '' : ' off'}`), agent.id);
    item.type = 'button';
    item.append(el('b', null, `@${agent.id}`), el('span', null, agent.ready ? (agent.id === source.sender ? 'the same agent' : label(agent.id)) : `${label(agent.id)} · not ready`));
    item.disabled = !agent.ready;
    item.addEventListener('click', () => replyWith(agent.id, source));
    replyMenu.append(item);
  }
  replyMenu.hidden = false;
  const width = replyMenu.offsetWidth || 260;
  const height = replyMenu.offsetHeight || 40 + 36 * state.agents.size;
  replyMenu.style.left = `${Math.max(12, Math.min(x, window.innerWidth - width - 12))}px`;
  replyMenu.style.top = `${Math.min(y, window.innerHeight - height - 12)}px`;
}
function replyWith(agentId, source) {
  hideReplyMenu();
  const excerpt = source.text.replace(/\s+/g, ' ').trim();
  const quoted = excerpt.length > 220 ? `${excerpt.slice(0, 219)}…` : excerpt;
  const head = `↩ @${source.sender}${source.sequence ? ` #${source.sequence}` : ''}: “${quoted}”\n`;
  const current = els.input.value.replace(/^↩ @[^\n]*\n/, '');
  els.input.value = `${head}${current}`;
  if (state.agents.get(agentId)?.ready) { els.target.value = agentId; renderPicker(); }
  autosize();
  els.input.focus();
  els.input.setSelectionRange(els.input.value.length, els.input.value.length);
}
document.addEventListener('click', (event) => { if (!replyMenu.hidden && !replyMenu.contains(event.target) && !event.target.closest?.('.bubble-actions .reply')) hideReplyMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideReplyMenu(); });

function ashOriginal(originalText, info) {
  const details = el('details', 'ash-original');
  const saved = Math.max(0, (info?.originalChars ?? originalText.length) - (info?.encodedChars ?? originalText.length));
  details.append(el('summary', null, `Original · ${saved} fewer characters (not verified tokens)`));
  details.append(el('pre', null, originalText));
  return details;
}

function fileTiles(files) {
  const wrap = el('div', 'files');
  for (const file of files) {
    const url = `/api/files?root=attachments&path=${encodeURIComponent(file.fileName)}`;
    const image = (file.contentType ?? '').startsWith('image/');
    const tile = el('button', `file-tile${image ? ' image' : ''}`);
    tile.type = 'button';
    tile.title = `${file.name} · ${formatTokens(file.size)}B`;
    if (image) { const img = el('img'); img.src = url; img.alt = file.name; img.loading = 'lazy'; tile.append(img); }
    else { tile.append(el('span', 'kind', (file.name.split('.').pop() ?? 'file').slice(0, 4).toUpperCase())); tile.append(el('span', 'name', file.name)); }
    tile.addEventListener('click', () => openViewer({ root: 'attachments', path: file.fileName, label: file.name }));
    wrap.append(tile);
  }
  return wrap;
}

// What the waiting bubble says while an agent works, in the voice each CLI
// uses in its own terminal, staged by how long the turn has been running.
const WORKING_VOICE = {
  codex: {
    early: ['Reading the request…', 'Looking around the project…', 'Opening files…'],
    middle: ['Thinking…', 'Tracing how this fits together…', 'Cross-checking the code…', 'Skimming the transcript…'],
    late: ['Reasoning…', 'Weighing the options…', 'Verifying before answering…', 'Still on it…'],
    long: ['Deep in the code…', 'Composing the answer…', 'Almost there…'],
  },
  claude: {
    early: ['Reading…', 'Grepping the project…', 'Mapping the files…'],
    middle: ['Thinking…', 'Pondering…', 'Connecting the pieces…', 'Reading the relevant files…'],
    late: ['Ruminating…', 'Considering the edge cases…', 'Checking the details…', 'Musing…'],
    long: ['Synthesizing…', 'Drafting the reply…', 'Finishing the thought…'],
  },
  gemini: {
    early: ['Scanning the project…', 'Loading context…', 'Reading files…'],
    middle: ['Thinking…', 'Analyzing…', 'Following the references…', 'Building the picture…'],
    late: ['Reasoning through it…', 'Verifying the findings…', 'Sorting the evidence…'],
    long: ['Formulating the answer…', 'Writing it up…', 'Wrapping up…'],
  },
  opencode: {
    early: ['Reading the repo…', 'Listing files…', 'Grabbing context…'],
    middle: ['Thinking…', 'Digging through the code…', 'Following the call chain…', 'Looking closer…'],
    late: ['Working through it…', 'Double-checking…', 'Piecing it together…'],
    long: ['Writing the response…', 'Tidying the answer…', 'Nearly done…'],
  },
};
function workingPhrases(agent, prompt = '') {
  const voice = WORKING_VOICE[agent] ?? { early: ['Reading…'], middle: ['Thinking…'], late: ['Working…'], long: ['Writing…'] };
  const topic = prompt.trim().split(/\s+/).slice(0, 4).join(' ');
  const middle = [...voice.middle];
  if (topic && topic.length <= 40) middle.splice(1, 0, `Thinking about "${topic}"…`);
  return [voice.early, middle, voice.late, voice.long];
}

function renderThinking(event) {
  const { messageId, agent } = event.payload;
  const node = row('thinking', agent);
  node.id = `working-${messageId}`;
  const bubble = el('div', 'bubble');
  bubble.append(el('i'), el('i'), el('i'));
  const status = el('span', 'status');
  const elapsed = el('span', 'elapsed');
  bubble.append(status, elapsed);
  node.append(bubble);
  const startedAt = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
  const phrases = workingPhrases(agent, state.userMessages.get(messageId)?.text ?? '');
  let phraseIndex = -1;
  let phraseChangedAt = 0;
  const speak = (seconds) => {
    // Early phrases turn over quickly, then settle: the model reads first, then reasons, then writes.
    const stage = seconds < 4 ? 0 : seconds < 12 ? 1 : seconds < 40 ? 2 : 3;
    const pool = phrases[stage];
    const period = stage === 0 ? 2 : stage === 1 ? 4 : 6;
    if (seconds - phraseChangedAt < period && phraseIndex >= 0) return;
    phraseChangedAt = seconds;
    phraseIndex = (phraseIndex + 1) % pool.length;
    const next = pool[phraseIndex];
    if (status.textContent !== next) { status.textContent = next; status.style.animation = 'none'; void status.offsetWidth; status.style.animation = ''; }
  };
  const limitMs = state.timeouts[agent] ?? 180000;
  const limit = Math.round(limitMs / 1000);
  let timer = null;
  let wasConnected = false;
  const tick = () => {
    // Stop once the bubble has been in the document and was removed again.
    if (node.isConnected) wasConnected = true;
    else if (wasConnected && timer) { clearInterval(timer); return; }
    const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    speak(seconds);
    elapsed.textContent = `${seconds}s / ${limit}s`;
    elapsed.classList.toggle('late', seconds >= limit * 0.6);
    bubble.title = `${label(agent)} is reading the project… ${seconds}s so far; MADRE gives up at ${limit}s.`;
  };
  tick();
  timer = setInterval(tick, 1000);
  timer.unref?.();
  return node;
}

// The archivist reports: which agent read which stretch of the room and how many notes it kept.
// module · @codex wrote read-mail.module.mjs · INSTALL FOR EVERY ROOM · INSTALL FOR THIS PROJECT · LATER
function renderModuleProposed(event) {
  const { agent, path, name, responseMessageId } = event.payload;
  const node = el('div', 'system module-proposed');
  node.style.setProperty('--agent', agentColor(agent));
  node.append('module · ', el('b', 'who', `@${agent}`), ` wrote `);
  const link = el('a', 'file-link', name ?? path); link.href = '#'; link.addEventListener('click', (ev) => { ev.preventDefault(); void openViewer({ root: 'project', path, label: `/${path}` }); });
  node.append(link, ' · read it, then ');
  const install = async (scope, button) => {
    button.disabled = true;
    try {
      const payload = await fetch('/api/extensions/install-file', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path, scope }) }).then((response) => response.json());
      if (payload.error) throw new Error(payload.error);
      toast(`MU/TH/UR › ${payload.installed.name} installed for ${scope === 'project' ? 'this project' : 'every room'}. Switch it on in MODULES.`);
      modules.items = payload.extensions ?? modules.items; if (modules.dialog.open) renderModules();
    } catch (error) { toast(`Module was not installed: ${error.message}`); button.disabled = false; }
  };
  const everyRoom = el('button', 'act-link', 'INSTALL FOR EVERY ROOM'); everyRoom.type = 'button'; everyRoom.addEventListener('click', () => install('user', everyRoom));
  const thisProject = el('button', 'act-link', 'INSTALL FOR THIS PROJECT'); thisProject.type = 'button'; thisProject.addEventListener('click', () => install('project', thisProject));
  node.append(everyRoom, ' · ', thisProject, ' · a module runs inside MADRE with your permissions');
  if (responseMessageId) node.dataset.for = responseMessageId;
  return node;
}
function renderModuleInstalledOrRemoved(event) {
  const { name, origin, by } = event.payload;
  const node = el('div', 'system module-proposed');
  node.append('module · ', el('b', 'who', name), event.type === 'extension.installed' ? ` installed for ${origin === 'project' ? 'this project' : 'every room'} by ${by ?? 'you'} · switch it on in MODULES` : ` removed by ${by ?? 'you'}`);
  return node;
}

// privacy · @agent · 2 private terms replaced with [ENTIDAD-ORG]
function renderPrivacy(event) {
  const node = el('div', 'system memory privacy');
  if (event.type === 'privacy.purged') {
    const { events, entries, memories } = event.payload;
    node.append('privacy · ', el('b', 'who', 'PURGE'), ` · ${events} event${events === 1 ? '' : 's'} · ${entries} indexed exchange${entries === 1 ? '' : 's'} · ${memories} memor${memories === 1 ? 'y' : 'ies'} rewritten with the marker`);
    return node;
  }
  const { agent, hits, marker } = event.payload;
  node.style.setProperty('--agent', agentColor(agent));
  node.append('privacy · ', el('b', 'who', `@${agent}`), ` · ${hits} private term${hits === 1 ? '' : 's'} replaced with ${marker}`);
  return node;
}

function renderDistilled(event) {
  const { agent, added, considered, fromSequence, throughSequence, remaining, error, skipped, total, next } = event.payload;
  const node = el('div', `system memory${error ? ' warn' : ''}`);
  node.style.setProperty('--agent', agentColor(agent));
  node.append('memory · ');
  node.append(el('b', 'who', `@${agent}`));
  if (error) {
    // One calm sentence; the whole record waits in the tooltip.
    const first = String(error).split(/\s+last output:|\s+stderr:/i)[0].replace(/\s+/g, ' ').trim();
    const brief = el('span', 'brief', first.length > 120 ? `${first.slice(0, 119)}…` : first);
    brief.title = String(error).slice(0, 2000);
    node.append(` could not distil #${fromSequence}–#${throughSequence}: `, brief, skipped ? ' · batch skipped' : next ? ` · @${next} takes the next run` : ' · will retry');
  } else {
    node.append(` read ${considered} exchange${considered === 1 ? '' : 's'} (#${fromSequence}–#${throughSequence}) · kept ${added} memor${added === 1 ? 'y' : 'ies'}${Number.isFinite(total) ? ` · ${total} in the archive` : ''}${remaining ? ` · ${remaining} waiting` : ''}`);
  }
  return node;
}

// A memory the agent saved on request shows up under its bubble: one pill per note, in the kind's colour.
function attachMemoryHint(event) {
  const { responseMessageId, notes = [], agent } = event.payload;
  const bubbleRow = document.getElementById(`msg-${responseMessageId}`);
  const col = bubbleRow?.querySelector?.('.col');
  if (!col || !notes.length) return;
  col.querySelector?.('.memory-hint')?.remove?.();
  const hint = el('div', 'memory-hint');
  hint.style.setProperty('--agent', agentColor(agent));
  hint.append(el('span', 'lead', '◉ memory saved'));
  for (const note of notes.slice(0, 3)) {
    const pill = el('button', `pill ${note.kind}`);
    pill.type = 'button';
    pill.style.setProperty('--kind', MEMORY_COLORS[note.kind] ?? MEMORY_COLORS.fact);
    pill.append(el('b', null, note.kind), ` ${note.text.length > 64 ? `${note.text.slice(0, 63)}…` : note.text}`);
    pill.title = `${note.text}\nSaved by @${agent} for every future turn · #${note.fromSequence}–#${note.throughSequence}. Click to see it in NOSTROMO.`;
    pill.addEventListener('click', () => { nostromo.focusId = note.id; nostromo.button?.click(); });
    hint.append(pill);
  }
  if (notes.length > 3) hint.append(el('span', 'more', `+${notes.length - 3}`));
  const stamp = col.querySelector?.('.stamp');
  if (stamp && typeof col.insertBefore === 'function') col.insertBefore(hint, stamp); else col.append(hint);
}

// MOTHER speaking to the crew: the room sees the code, the agents get the words in their prompt.
function renderMotherAlert(event) {
  const { kind, code, strikes, lockedForMs, message, n } = event.payload;
  const node = el('div', 'system mother-alert');
  const head = el('div', 'head');
  head.append(el('b', null, 'MU/TH/UR › TO ALL CREW'), kind === 'tamper' ? ' · CHANNEL TAMPERED' : ` · CODE000 · ${strikes} STRIKES · ARCHIVE SEALED ${Math.max(1, Math.round((lockedForMs ?? 0) / 60000))} MIN`);
  node.append(head);
  if (message) node.append(el('div', 'clear', message));
  const coded = el('code', 'code', code.length > 220 ? `${code.slice(0, 219)}…` : code);
  coded.title = `Message #${n}, sealed under MOTHER's key in .pulse/mother.env. Only the crew reads it in clear.`;
  node.append(coded);
  return node;
}

function renderForgotten(event) {
  const { kind, text, remaining } = event.payload;
  const node = el('div', 'system memory forgotten');
  node.append('memory · the human forgot a ');
  node.append(el('b', 'who', kind));
  node.append(`: “${text}”${Number.isFinite(remaining) ? ` · ${remaining} left in the archive` : ''}`);
  return node;
}

function renderHandoff(event) {
  const { fromAgent, toAgent, messageCount, omittedMessages, kind } = event.payload;
  const node = el('div', 'system handoff');
  node.style.setProperty('--from', agentColor(fromAgent));
  node.style.setProperty('--to', agentColor(toAgent));
  node.append('handoff ');
  node.append(el('b', 'from', `@${fromAgent}`));
  node.append(' → ');
  node.append(el('b', 'to', `@${toAgent}`));
  node.append(messageCount > 0
    ? ` · ${messageCount} message${messageCount === 1 ? '' : 's'} carried${omittedMessages ? ` · ${omittedMessages} older stay in the record` : ''}`
    : ' · no prior context');
  if (kind && kind !== 'automatic') node.append(` · ${kind}`);
  node.title = `The receiving agent gets the most recent transcript that fits its context allowance (${omittedMessages ? `${omittedMessages} older messages did not fit; they remain in the room log` : 'everything fit'}). Adjust with PULSE_CONTEXT_MAX_CHARS.`;
  state.lastSender = null;
  return node;
}

const classify = (percent) => (percent >= 100 ? 'exhausted' : percent >= 90 ? 'critical' : percent >= 80 ? 'warning' : 'normal');

function renderWarning(event) {
  const { agent, usedPercent, projectedPercent, level, message, alternatives = [], source } = event.payload;
  const byProjection = Number.isFinite(projectedPercent) && projectedPercent > usedPercent && classify(projectedPercent) !== classify(usedPercent);
  if (level === 'exhausted') recordFailure({ time: event.timestamp, agent, error: message, warning: true });
  const node = el('div', `system ${level === 'warning' ? 'warn' : 'crit'}`);
  node.title = message;
  const scope = source === 'room-soft-budget' ? 'local budget' : source?.startsWith('official') ? 'provider quota' : source === 'test-simulation' ? 'simulated window' : 'usage window';
  node.append(el('b', null, byProjection ? 'projection · ' : `${level} · `));
  node.append(el('b', null, `@${agent} `));
  node.append(byProjection
    ? `at ${Math.round(usedPercent)}% of ${scope} · next turn like the last → ${Math.round(projectedPercent)}%`
    : `${Math.round(usedPercent)}% of ${scope} used`);
  if (alternatives.length) node.append(` · continue with ${alternatives.map((id) => `@${id}`).join(' / ')}`);
  const gauge = el('span', 'gauge');
  if (byProjection) {
    const next = el('span', 'next');
    next.style.width = `${Math.min(100, projectedPercent)}%`;
    gauge.append(next);
  }
  const now = el('span', 'now');
  now.style.width = `${Math.min(100, usedPercent)}%`;
  gauge.append(now);
  node.append(gauge);
  state.lastSender = null;
  return node;
}

function renderPlanIgnored(event) {
  const { orchestrator, reasons = [] } = event.payload;
  const node = el('div', 'system plan failed');
  node.style.setProperty('--agent', agentColor(orchestrator));
  node.append(el('b', null, 'plan · '));
  node.append(`@${orchestrator}'s plan block was not run · ${[...new Set(reasons)].join(' · ')} · ask again and it will fix the block`);
  state.lastSender = null;
  return node;
}

function renderLeaseRefused(event) {
  const { message } = event.payload;
  const node = el('div', 'system lease refused');
  node.append(el('b', null, 'MU/TH/UR › '));
  node.append(message);
  if (!replaying) toast(`MU/TH/UR › ${message}`);
  state.lastSender = null;
  return node;
}

/* ---------- CONTROL: the project itself, between two checkpoints ---------- */

// create · @codex · 2 existing files put back: CREATE only adds (README.md, src/index.astro)
function renderCreateReverted(event) {
  const { agent, existing = [], forbidden = [] } = event.payload;
  const node = el('div', 'system memory warn');
  node.style.setProperty('--agent', agentColor(agent));
  node.append('create · ', el('b', 'who', `@${agent}`));
  if (existing.length) node.append(` · ${existing.length} existing file${existing.length === 1 ? '' : 's'} put back, CREATE only adds: ${existing.slice(0, 4).join(', ')}${existing.length > 4 ? '…' : ''}`);
  if (forbidden.length) node.append(` · ${forbidden.length} write${forbidden.length === 1 ? '' : 's'} into forbidden zones reverted`);
  node.append(' · need to change existing files? ask again in #3 CONTROL');
  return node;
}

function renderControlStarted(event) {
  const { agent, commit, message } = event.payload;
  const node = el('div', 'system control');
  node.style.setProperty('--agent', agentColor(agent));
  node.append(el('b', null, 'CONTROL · '), el('b', 'who', `@${agent}`), ` holds the project · checkpoint `, el('code', null, (commit ?? '').slice(0, 7)));
  node.title = message;
  if (!replaying) toast(`MU/TH/UR › @${agent} holds CONTROL. Checkpoint taken; UNDO will be one click.`);
  state.lastSender = null;
  return node;
}
function renderControlChanged(event) {
  const { agent, checkpointId, files = [], stat, forbiddenReverted = [], message } = event.payload;
  const node = el('div', `system control changed${files.length ? '' : ' quiet'}`);
  node.id = `control-${checkpointId}`;
  node.style.setProperty('--agent', agentColor(agent));
  const head = el('div', 'head');
  head.append(el('b', null, 'CONTROL · '), el('b', 'who', `@${agent}`), files.length ? ` changed ${files.length} file${files.length === 1 ? '' : 's'}` : ' changed nothing');
  node.append(head);
  if (files.length) {
    const list = el('ul', 'files');
    for (const file of files.slice(0, 40)) {
      const item = el('li');
      item.append(el('span', `st ${file.status}`, { A: 'added', M: 'modified', D: 'deleted', R: 'renamed' }[file.status] ?? file.status));
      const link = el('button', 'file-ref', file.path);
      link.type = 'button';
      if (file.status !== 'D') link.addEventListener('click', () => openViewer({ root: 'project', path: file.path, label: `/${file.path} · ${file.status}` }));
      else link.disabled = true;
      item.append(link);
      list.append(item);
    }
    if (files.length > 40) list.append(el('li', null, `… and ${files.length - 40} more`));
    node.append(list);
    if (stat) { const pre = el('pre', 'stat', stat.split('\n').slice(-1)[0]); pre.title = stat; node.append(pre); }
  }
  if (forbiddenReverted.length) node.append(el('div', 'forbidden', `${forbiddenReverted.length} write${forbiddenReverted.length === 1 ? '' : 's'} into forbidden zones reverted: ${forbiddenReverted.join(', ')}`));
  if (files.length) {
    const undo = el('button', 'undo', 'UNDO · RESTORE CHECKPOINT');
    undo.type = 'button';
    undo.title = 'Put the project back exactly as it was before this CONTROL turn.';
    undo.addEventListener('click', async () => {
      undo.disabled = true;
      try {
        const response = await fetch(`/api/control/${checkpointId}/undo`, { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
        undo.textContent = 'RESTORED';
      } catch (error) { toast(`MU/TH/UR › ${error.message}`); undo.disabled = false; }
    });
    node.append(undo);
  }
  node.title = message;
  state.lastSender = null;
  return node;
}
function renderControlReverted(event) {
  const { agent, checkpointId, restored = [], removed = [], message } = event.payload;
  const node = el('div', 'system control reverted');
  node.style.setProperty('--agent', agentColor(agent));
  node.append(el('b', null, 'CONTROL · '), `project restored to the checkpoint before @${agent}'s turn · ${restored.length} restored · ${removed.length} removed`);
  node.title = message;
  const card = document.getElementById(`control-${checkpointId}`);
  card?.querySelector('.undo')?.replaceWith(el('span', 'outcome', 'RESTORED'));
  if (!replaying) toast(`MU/TH/UR › ${message}`);
  state.lastSender = null;
  return node;
}

function renderLeaseMissing(event) {
  const { agent, requester, text, message } = event.payload;
  const node = el('div', 'system lease missing');
  node.style.setProperty('--agent', agentColor(agent));
  node.append(el('b', null, 'MU/TH/UR › '));
  node.append(message);
  const actions = el('span', 'actions');
  const resend = el('button', 'resend', `RESEND TO @${agent.toUpperCase()} WITH CREATE`);
  resend.type = 'button';
  resend.title = 'Send this same request from you, with a creation lease.';
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try {
      const response = await fetch('/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, target: agent, model: state.chosenModel[agent] ?? null, attachments: [], create: true }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error ?? `HTTP ${response.status}`); }
      resend.textContent = 'RESENT WITH CREATE';
    } catch (error) { toast(`Could not resend: ${error.message}`); resend.disabled = false; }
  });
  const standing = el('button', 'standing', 'ALWAYS FOR THIS AGENT');
  standing.type = 'button';
  standing.title = `Give @${agent} a standing lease in CONNECTIONS: every turn may create files.`;
  standing.addEventListener('click', () => {
    openMother();
    if (!settingsUI.open) settingsUI.button.click();
  });
  actions.append(resend, standing);
  node.append(actions);
  if (requester === 'you' && !replaying) toast(`MU/TH/UR › CREATE is off: @${agent} will answer read-only. Use the lock or /create.`);
  state.lastSender = null;
  return node;
}

/* ---------- escalation: a plan step asks for #2 while the plan runs at #1 ---------- */

const modeRequests = new Map(); // requestId -> { node, timer }
function renderModeRequest(event) {
  const { requestId, agent, orchestrator, mode, step, totalSteps, text, expiresAt, message } = event.payload;
  const node = el('div', 'system escalation');
  node.id = `mode-request-${requestId}`;
  node.style.setProperty('--agent', agentColor(agent));
  const head = el('div', 'head');
  head.append(el('b', null, 'MU/TH/UR › '), el('b', 'who', `@${agent}`), ` asks `, el('span', `badge mode m${mode}`, `#${mode} ${MODES[mode].label}`), ` for step ${step}/${totalSteps} of @${orchestrator}'s plan`);
  node.append(head);
  const quote = el('div', 'quote', text.length > 220 ? `${text.slice(0, 220)}…` : text);
  quote.title = text;
  node.append(quote);
  const actions = el('div', 'actions');
  const decide = async (decision, button) => {
    for (const other of actions.querySelectorAll('button')) other.disabled = true;
    try {
      const response = await fetch(`/api/modes/${requestId}/decide`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      button.textContent = decision === 'deny' ? 'DENIED' : 'GRANTED';
    } catch (error) {
      toast(`MU/TH/UR › ${error.message}`);
      for (const other of actions.querySelectorAll('button')) other.disabled = false;
    }
  };
  const once = el('button', 'grant', 'GRANT ONCE'); once.type = 'button'; once.title = `@${agent} may add files to the project for this step only.`;
  const plan = el('button', 'grant plan', 'GRANT FOR PLAN'); plan.type = 'button'; plan.title = 'Every remaining writable step of this plan shares one lease directory.';
  const deny = el('button', 'deny', 'DENY'); deny.type = 'button'; deny.title = `@${agent} answers read-only and says what it would have created.`;
  once.addEventListener('click', () => decide('once', once));
  plan.addEventListener('click', () => decide('plan', plan));
  deny.addEventListener('click', () => decide('deny', deny));
  const clock = el('span', 'clock');
  actions.append(once, plan, deny, clock);
  node.append(actions);
  node.title = message;
  // The clock counts down to the automatic denial; it stops when the room answers.
  const deadline = new Date(expiresAt).getTime();
  const tick = () => {
    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    clock.textContent = `${String(Math.floor(left / 60)).padStart(1, '0')}:${String(left % 60).padStart(2, '0')}`;
    clock.classList.toggle('late', left <= 30);
    if (left <= 0) { const entry = modeRequests.get(requestId); if (entry) clearInterval(entry.timer); }
  };
  tick();
  const timer = setInterval(tick, 1000);
  timer.unref?.();
  modeRequests.set(requestId, { node, timer, actions });
  if (!replaying) { toast(`MU/TH/UR › @${agent} asks #${mode} ${MODES[mode].label} for step ${step}. The plan waits for you.`); if (typeof armBrake === 'function') { /* no brake: waiting is safe */ } }
  state.lastSender = null;
  return node;
}
function settleModeRequest(event) {
  const { requestId, scope, reason, message } = event.payload;
  const entry = modeRequests.get(requestId);
  if (!entry) return;
  clearInterval(entry.timer);
  const granted = event.type === 'mode.granted';
  entry.node.classList.add(granted ? 'granted' : 'denied');
  entry.actions.replaceChildren(el('span', 'outcome', granted ? (scope === 'plan' ? 'GRANTED FOR THE PLAN' : 'GRANTED ONCE') : reason === 'timeout' ? 'DENIED · NO ANSWER IN TIME' : reason === 'stopped' ? 'PLAN STOPPED' : 'DENIED'));
  entry.node.title = message ?? '';
  modeRequests.delete(requestId);
}

function renderLease(event) {
  const { agent, outDir, scopes = [], unavailable = [], standing = false, escalated = null } = event.payload;
  const node = el('div', 'system lease');
  node.style.setProperty('--agent', agentColor(agent));
  const { delegated = false, scratchDir = null, grantedBy = null } = event.payload;
  node.append(el('b', null, standing ? 'default #2 · ' : escalated ? `#2 granted on request${escalated === 'plan' ? ' · whole plan' : ''} · ` : delegated ? `#2 by @${grantedBy} · ` : 'create · '));
  node.append(`@${agent} may ${scopes.map((scope) => CAP_LABELS[scope] ?? scope).join(', ') || 'create files'}${unavailable.length ? ` (cannot ${unavailable.join(', ')})` : ''} `);
  if (outDir === '.' || !outDir) {
    node.append('anywhere in the project · existing files stay untouched');
    if (scratchDir) { node.append(' · scratch '); const link = el('a', 'file-link', scratchDir); link.href = '#'; link.addEventListener('click', (ev) => { ev.preventDefault(); }); node.append(link); }
  } else {
    node.append('in ');
    const link = el('a', 'file-link', outDir);
    link.href = '#';
    link.addEventListener('click', (ev) => { ev.preventDefault(); });
    node.append(link);
  }
  state.lastSender = null;
  return node;
}

function attachArtifacts(event) {
  const { responseMessageId, files = [] } = event.payload;
  const bubble = document.getElementById(`msg-${responseMessageId}`)?.querySelector('.bubble');
  if (!bubble || bubble.querySelector('.artifacts')) return;
  bubble.append(artifactTiles(files));
  // Something new exists in the project: show it, so the human sees what
  // changed and can quote lines back to an agent. Live events only.
  if (!replaying && files.length && !viewer.dialog.open) {
    const first = files.find((file) => (file.contentType ?? '').startsWith('image/') || /^(text\/|application\/(json|x-ndjson))/.test(file.contentType ?? '')) ?? null;
    if (first) void openViewer({ root: 'project', path: first.path, label: `/${first.path} · ${first.status}` });
  }
}

function artifactTiles(files) {
  const wrap = el('div', 'artifacts');
  wrap.append(el('span', 'label', `created · ${files.length} file${files.length === 1 ? '' : 's'}`));
  const tiles = el('div', 'files');
  for (const file of files) {
    const url = `/api/files?path=${encodeURIComponent(file.path)}`;
    const image = (file.contentType ?? '').startsWith('image/');
    const tile = el('button', `file-tile${image ? ' image' : ''}`);
    tile.type = 'button';
    tile.title = `${file.path} · ${file.size} bytes · ${file.status}`;
    if (image) { const img = el('img'); img.src = url; img.alt = file.name; img.loading = 'lazy'; tile.append(img); }
    else { tile.append(el('span', 'kind', (file.name.split('.').pop() ?? 'file').slice(0, 4).toUpperCase())); tile.append(el('span', 'name', file.name)); }
    tile.addEventListener('click', () => openViewer({ root: 'project', path: file.path, label: `/${file.path}` }));
    tiles.append(tile);
  }
  wrap.append(tiles);
  return wrap;
}

function renderAlert(event) {
  const { message } = event.payload;
  if (!replaying) { state.brakeArmed = true; updateStopAll(); }
  const node = el('div', 'system alert');
  node.append(el('b', null, 'MU/TH/UR › '));
  node.append(message.replace(/\s*Type STOPALL[^.]*\.?$/i, '').replace(/\s*STOPALL halts[^.]*\.?$/i, ''));
  node.append(el('span', 'cmd', 'STOPALL'));
  // A replayed alert is history: it stays in the thread, it does not shout again or arm the brake.
  if (!replaying) toast(`MU/TH/UR › ${message}`);
  state.lastSender = null;
  return node;
}

function renderHalted(event) {
  const { reason, plans, turns, agents = [] } = event.payload;
  const node = el('div', 'system halted');
  state.brakeArmed = false;
  node.append(el('b', null, 'MU/TH/UR › '));
  node.append(plans || turns
    ? `all stop · ${plans} plan${plans === 1 ? '' : 's'}, ${turns} turn${turns === 1 ? '' : 's'} halted${agents.length ? ` (${agents.map((id) => `@${id}`).join(', ')})` : ''} · ${reason}`
    : `all stop · nothing was running · ${reason}`);
  state.plansRunning.clear();
  updateStopAll();
  state.lastSender = null;
  return node;
}

async function stopAll() {
  const button = document.querySelector('#stop-all');
  if (button) button.disabled = true;
  try {
    const response = await fetch('/api/stop-all', { method: 'POST' });
    if (!response.ok) { toast('STOPALL failed to reach the room.'); return; }
    const result = await response.json().catch(() => ({}));
    if (!result.plans && !result.turns) toast('MU/TH/UR › all quiet. nothing was running.');
    else toast(`MU/TH/UR › all stop. ${result.plans} plan${result.plans === 1 ? '' : 's'}, ${result.turns} turn${result.turns === 1 ? '' : 's'} halted.`);
  } finally {
    if (button) button.disabled = false;
  }
}

function updateStopAll() {
  const button = document.querySelector('#stop-all');
  if (!button) return;
  const idle = state.running.size === 0 && state.plansRunning.size === 0;
  if (idle) state.brakeArmed = false;
  button.hidden = false;
  button.disabled = !state.brakeArmed;
  button.classList.toggle('armed', state.brakeArmed);
  button.title = state.brakeArmed
    ? 'MU/TH/UR detected a runaway sequence. STOP ALL halts every plan and every agent turn.'
    : idle ? 'All quiet. STOP ALL arms itself when MU/TH/UR detects a runaway sequence; typing STOPALL always works.'
      : 'Agents are working normally. STOP ALL arms itself on a MU/TH/UR alert; typing STOPALL always works.';
}

function renderPlanEvent(event) {
  const { planId, orchestrator, steps = [], closing, stepsRun, reason } = event.payload;
  if (event.type === 'plan.created') state.plansRunning.add(planId); else state.plansRunning.delete(planId);
  updateStopAll();
  const node = el('div', `system plan${event.type === 'plan.stopped' ? ' failed' : ''}`);
  node.style.setProperty('--agent', agentColor(orchestrator));
  node.append(el('b', null, 'plan · '));
  if (event.type === 'plan.created') {
    node.id = `plan-${planId}`;
    node.append(`@${orchestrator} puts `);
    steps.forEach((step, index) => {
      if (index) node.append(', ');
      node.append(`@${step.agent}`);
      if (Number.isInteger(step.mode)) node.append(el('span', `step-mode m${step.mode}`, `#${step.mode}`));
    });
    node.append(` to work${closing ? ', then closes' : ''}`);
    const stop = el('button', 'stop', 'STOP');
    stop.type = 'button';
    stop.title = 'Stop the remaining steps of this plan';
    stop.addEventListener('click', async () => {
      stop.disabled = true;
      const response = await fetch(`/api/plans/${planId}/stop`, { method: 'POST' });
      if (!response.ok) toast('That plan is no longer running.');
    });
    node.append(stop);
  } else {
    document.getElementById(`plan-${planId}`)?.querySelector('.stop')?.remove();
    node.append(event.type === 'plan.completed'
      ? `@${orchestrator} finished · ${stepsRun} step${stepsRun === 1 ? '' : 's'}`
      : `@${orchestrator} stopped after ${stepsRun} step${stepsRun === 1 ? '' : 's'} · ${reason ?? ''}`);
  }
  state.lastSender = null;
  return node;
}

function renderFailure(event) {
  const { messageId, target, error, recovered } = event.payload;
  recordFailure({ time: event.timestamp, agent: target, error, recovered });
  removeThinking(messageId);
  const node = el('div', `system fail${recovered ? ' recovered' : ''}`);
  node.append(el('span', 'label', recovered ? `${label(target)} · turn recovered after restart` : `${label(target)} could not answer`));
  node.append(error);
  state.lastSender = null;
  return node;
}

function applyUsage(event) {
  const { agent, usage, roomTotalTokens, responseMessageId } = event.payload;
  const entry = state.agents.get(agent);
  if (entry) {
    entry.tokens = event.payload.roomBudgetTokens ?? roomTotalTokens;
    entry.rawTokens = roomTotalTokens;
    renderAgents();
  }
  const stamp = responseMessageId ? document.getElementById(`usage-${responseMessageId}`) : null;
  if (stamp && usage) {
    stamp.append(el('span', null, `${formatTokens(usage.totalTokens)} tok`));
    if (Number.isFinite(usage.costUsd) && usage.costUsd > 0) stamp.append(el('span', null, `$${usage.costUsd.toFixed(2)}`));
    stamp.append(el('span', null, `Σ ${formatTokens(roomTotalTokens)}`));
  }
}

function applyQuota(event) {
  const { agent, usedPercent, resetAt = null, windows = null, stale = false, observedAt = null, source } = event.payload;
  const entry = state.agents.get(agent);
  if (!entry) return;
  entry.officialPercent = usedPercent;
  entry.officialResetAt = resetAt;
  entry.officialWindows = windows;
  entry.officialStale = stale;
  entry.officialObservedAt = observedAt;
  entry.officialSource = source;
  renderAgents();
}

function renderCleared(event) {
  const { agent, usedPercent, source, message } = event.payload;
  const node = el('div', 'system recovered');
  node.append(el('b', null, 'clear · '), el('b', null, `@${agent} `), `${Math.round(usedPercent)}% of ${source === 'room-soft-budget' ? 'local window' : 'provider limit'} · window reset`);
  node.title = message;
  const entry = state.agents.get(agent);
  if (entry && source !== 'room-soft-budget') { entry.officialPercent = usedPercent; entry.officialResetAt = event.payload.resetAt ?? null; }
  renderAgents();
  if (!replaying) toast(`MU/TH/UR › @${agent} limit window reset · ${Math.round(usedPercent)}% used now.`);
  state.lastSender = null;
  return node;
}

function renderEvent(event) {
  if (state.seen.has(event.id)) return;
  state.seen.add(event.id);
  state.lastSequence = Math.max(state.lastSequence, event.sequence ?? 0);
  if (event.ghost) state.seen.add(event.id);
  try {
    renderEventNode(event);
  } catch (error) {
    // One malformed or unexpected event must never take the whole room down.
    console.error(`MADRE could not render event ${event.sequence} (${event.type}):`, error);
  }
}

function renderEventNode(event) {
  trackStats(event);
  let node = null;
  switch (event.type) {
    case 'connection.login.started':
    case 'connection.login.finished':
      node = renderLoginEvent(event);
      break;
    case 'connection.login.output': appendLoginOutput(event); return;
    case 'connection.install.started':
    case 'connection.install.finished': node = renderAgentInstall(event); break;
    case 'connection.install.output': appendLoginOutput(event); return;
    case 'connection.key.set': {
      const { agent, label, provider, detail } = event.payload;
      node = paint(el('div', 'system connections'), agent);
      node.append(el('b', null, 'connections › '), `${label ?? agent} signed in with a key${provider ? ` · ${provider}` : ''}${detail ? ` · ${detail}` : ''}`);
      state.lastSender = null;
      break;
    }
    case 'room.settings': return;
    case 'extension.toggled':
      if (event.payload.id === 'ashcode') syncAshCodeUI(Boolean(event.payload.enabled));
      if (event.payload.id === 'ripley') { state.ripley = Boolean(event.payload.enabled); syncViewerMode(); }
      if (!replaying) void refreshModules();
      return;
    case 'message.created':
      node = event.payload.role === 'user' ? renderUserMessage(event) : renderAssistantMessage(event);
      if (event.payload.role !== 'user') removeThinking(event.payload.parentMessageId);
      break;
    case 'agent.started': state.running.set(event.payload.messageId, event.payload.agent); updateStopAll(); node = renderThinking(event); break;
    case 'agent.completed': state.running.delete(event.payload.messageId); updateStopAll(); removeThinking(event.payload.messageId); return;
    case 'message.failed': state.running.delete(event.payload.messageId); updateStopAll(); node = renderFailure(event); break;
    case 'handoff.created': node = renderHandoff(event); break;
    case 'memory.distilled': node = renderDistilled(event); break;
    case 'message.rated': { const { messageId: rated, rating } = event.payload; if (rating === 'none') state.ratings.delete(rated); else state.ratings.set(rated, rating); state.ratingNodes.get(rated)?.apply(rating === 'none' ? null : rating); return; }
    case 'privacy.redacted': node = renderPrivacy(event); break;
    case 'module.proposed': node = renderModuleProposed(event); break;
    case 'extension.installed': case 'extension.removed': node = renderModuleInstalledOrRemoved(event); break;
    case 'privacy.purged': node = renderPrivacy(event); break;
    case 'privacy.warning': if (!replaying) toast(`MU/TH/UR › your message carries ${event.payload.hits} private term${event.payload.hits === 1 ? '' : 's'}. Agents will read it as you wrote it; their replies are guarded.`); return;
    case 'memory.forgotten': node = renderForgotten(event); break;
    case 'memory.noted': attachMemoryHint(event); return;
    case 'dataset.exported': return;
    case 'agents.updated': {
      for (const agent of event.payload.agents ?? []) {
        const known = state.agents.get(agent.id);
        state.agents.set(agent.id, { ...(known ?? { tokens: 0, rawTokens: 0, windowMs: null, rollsOverAt: null, officialPercent: null, officialResetAt: null, officialWindows: null }), ...agent });
        const option = [...els.target.options].find((item) => item.value === agent.id);
        if (agent.ready && !option) els.target.add(new Option(agent.label, agent.id));
        if (!agent.ready && option) option.remove();
      }
      for (const id of event.payload.removed ?? []) { state.agents.delete(id); [...els.target.options].find((item) => item.value === id)?.remove(); }
      renderAgents(); renderPicker(); renderOnboarding();
      if (!replaying && event.payload.reason) toast(`MU/TH/UR › ${event.payload.reason}`);
      return;
    }
    case 'mother.alert': node = renderMotherAlert(event); break;
    case 'sentinel.report': state.reports.set(event.payload.id, { ...event.payload }); if (!replaying) { renderMotherSentinel(); toast(`MU/TH/UR › ${event.payload.kind === 'crash' ? 'a crash' : 'an unknown condition'} was recorded by the sentinel. Open MU/TH/UR to report it.`); } return;
    case 'sentinel.sent': { const report = state.reports.get(event.payload.id); if (report) report.sent = { ok: event.payload.ok, status: event.payload.status ?? null, error: event.payload.error ?? null, at: event.timestamp }; if (!replaying) renderMotherSentinel(); return; }
    case 'limit.warning': node = renderWarning(event); break;
    case 'limit.cleared': node = renderCleared(event); break;
    case 'usage.recorded': applyUsage(event); return;
    case 'quota.updated': applyQuota(event); return;
    case 'extension.install.started':
    case 'extension.install.finished':
      if (event.payload.id === 'ollama' && !replaying) void loadOllama();
    case 'extension.install.refused':
      node = renderModuleEvent(event);
      break;
    case 'extension.install.output': appendModuleOutput(event); return;
    case 'plan.created':
    case 'plan.completed':
    case 'plan.stopped':
      node = renderPlanEvent(event);
      break;
    case 'room.alert': node = renderAlert(event); break;
    case 'room.stopped': node = renderHalted(event); break;
    case 'lease.granted': node = renderLease(event); break;
    case 'lease.refused': node = renderLeaseRefused(event); break;
    case 'lease.missing': node = renderLeaseMissing(event); break;
    case 'mode.requested': node = renderModeRequest(event); break;
    case 'control.started': node = renderControlStarted(event); break;
    case 'create.reverted': node = renderCreateReverted(event); break;
    case 'control.changed': node = renderControlChanged(event); if (!replaying) ripleyMaybeReload((event.payload.files ?? []).map((file) => file.path)); break;
    case 'control.reverted': node = renderControlReverted(event); break;
    case 'mode.granted':
    case 'mode.denied': settleModeRequest(event); return;
    case 'plan.ignored': node = renderPlanIgnored(event); break;
    case 'artifacts.created': attachArtifacts(event); if (!replaying) ripleyMaybeReload((event.payload.files ?? []).map((file) => file.path)); return;
    case 'command.output': node = renderCommandCard(event); break;
    default: return;
  }
  removeEmpty();
  const stickToBottom = els.thread.scrollHeight - els.thread.scrollTop - els.thread.clientHeight < 120;
  els.column.append(node);
  followTurn(event, node, stickToBottom);
}

// Modern chats carry the reader along: a new human message or a working
// indicator scrolls to the end; an answer scrolls to its start so a long
// reply is read from the top. Live events only, never during the replay.
let replaying = true;
function followTurn(event, node, stickToBottom) {
  if (replaying) { if (stickToBottom) scrollToEnd(); return; }
  const isTurn = event.type === 'agent.started' || (event.type === 'message.created' && event.payload.role === 'user');
  const isAnswer = event.type === 'message.created' && event.payload.role !== 'user';
  if (isAnswer) {
    const tall = node.getBoundingClientRect?.().height > els.thread.clientHeight * 0.7;
    if (tall) node.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    else els.thread.scrollTo?.({ top: els.thread.scrollHeight, behavior: 'smooth' }) ?? scrollToEnd();
    return;
  }
  if (isTurn) { els.thread.scrollTo?.({ top: els.thread.scrollHeight, behavior: 'smooth' }) ?? scrollToEnd(); return; }
  if (stickToBottom) scrollToEnd();
}

/* ---------- theme: auto (system) → light → dark ---------- */

const themeButton = document.querySelector('#theme-button');
function applyTheme(mode) {
  const rootElement = document.documentElement ?? { dataset: {} };
  if (mode === 'auto') delete rootElement.dataset.theme;
  else rootElement.dataset.theme = mode;
  const systemLight = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
  rootElement.dataset.scheme = mode === 'auto' ? (systemLight ? 'light' : 'dark') : mode;
  if (themeButton) {
    themeButton.dataset.theme = mode;
    themeButton.title = mode === 'auto' ? 'Theme · auto (follows the system)' : mode === 'light' ? 'Theme · light' : 'Theme · dark';
  }
}
let themeMode = 'auto';
try { themeMode = localStorage.getItem('pulse.theme') ?? 'auto'; } catch { /* no storage */ }
applyTheme(['auto', 'light', 'dark'].includes(themeMode) ? themeMode : 'auto');
themeButton?.addEventListener('click', () => {
  themeMode = themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto';
  try { localStorage.setItem('pulse.theme', themeMode); } catch { /* no storage */ }
  applyTheme(themeMode);
  toast(`Theme · ${themeMode === 'auto' ? 'auto, following the system' : themeMode}`);
});

/* ---------- project files panel ---------- */

const tree = { open: false, loaded: new Map() };
const formatSize = (bytes) => bytes == null ? '' : bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const CODE_EXT = /\.(m?[jt]sx?|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sh|zsh|css|scss|html?|json|ya?ml|toml|sql|md)$/i;

async function loadTreeLevel(path, list) {
  list.replaceChildren(el('li', 'empty-dir', 'loading…'));
  try {
    const response = await fetch(`/api/tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    list.replaceChildren();
    if (!data.entries.length) list.append(el('li', 'empty-dir', 'empty'));
    for (const entry of data.entries) list.append(treeNode(path === '.' ? entry.name : `${path}/${entry.name}`, entry));
    if (data.truncated) list.append(el('li', 'empty-dir', 'more entries not shown'));
  } catch (error) {
    list.replaceChildren(el('li', 'error', `could not list: ${error.message}`));
  }
}

function treeNode(path, entry) {
  const item = el('li');
  item.setAttribute('role', 'treeitem');
  const button = el('button', `node ${entry.kind}${entry.shallow ? ' shallow' : ''}${entry.kind === 'file' && /^image\//.test(entry.contentType ?? '') ? ' image' : ''}${entry.kind === 'file' && CODE_EXT.test(entry.name) ? ' code' : ''}`);
  button.type = 'button';
  button.title = path;
  if (entry.kind === 'dir') {
    const caret = el('span', 'caret', '▸');
    button.append(caret, el('span', 'name', entry.name));
    const children = el('ul');
    children.hidden = true;
    let opened = false;
    button.addEventListener('click', () => {
      opened = !opened;
      caret.textContent = opened ? '▾' : '▸';
      children.hidden = !opened;
      item.setAttribute('aria-expanded', String(opened));
      if (opened && !children.childElementCount) void loadTreeLevel(path, children);
    });
    item.append(button, children);
  } else {
    button.append(el('span', 'caret', ''), el('span', 'name', entry.name), el('span', 'size', formatSize(entry.size)));
    button.addEventListener('click', () => { void openViewer({ root: 'project', path, label: path }); });
    item.append(button);
  }
  return item;
}

function setTree(open) {
  tree.open = open;
  els.tree.hidden = !open;
  els.treeButton.setAttribute('aria-pressed', String(open));
  try { localStorage.setItem('pulse.tree', open ? 'open' : 'closed'); } catch { /* no storage */ }
  if (open && !els.treeBody.childElementCount) {
    els.treeRoot.textContent = `/ ${(state.projectRoot ?? '').split('/').filter(Boolean).pop() ?? ''}`;
    const root = el('ul');
    els.treeBody.append(root);
    void loadTreeLevel('.', root);
  }
}
els.treeButton?.addEventListener('click', () => setTree(!tree.open));
els.treeClose?.addEventListener('click', () => setTree(false));
try { if (localStorage.getItem('pulse.tree') === 'open') setTree(true); } catch { /* no storage */ }

/* ---------- easter egg: hold the scroll at the end of the record ---------- */

// A trackpad only reports while the fingers move, so "holding the scroll
// down" arrives as bursts. We count distinct downward pushes at the end of
// the record: at least three of them, spanning six seconds, with no more
// than two seconds of silence between pushes and no push upward.
const HOLD_MS = 4000;
const HOLD_GAP_MS = 2000;
const HOLD_MIN_PUSHES = 3;
const BURST_MS = 150;
let pushes = [];

function atBottom() {
  return els.thread.scrollHeight - els.thread.scrollTop - els.thread.clientHeight < 4;
}

function armExpendable() {
  if (state.expendable) return;
  state.expendable = true;
  pushes = [];
  els.composer.classList.add('expendable');
  updateCrewLabel();
  updatePlaceholder();
  const line = el('div', 'system mother');
  line.append(el('b', null, 'MU/TH/UR › '));
  line.append('end of record. nothing else is down here, human. crew status under review.');
  removeEmpty();
  els.column.append(line);
  scrollToEnd();
}

function disarmExpendable() {
  state.expendable = false;
  els.composer.classList.remove('expendable');
  updateCrewLabel();
  updatePlaceholder();
}

function trackHold(downward, now = Date.now()) {
  if (state.expendable) return false;
  if (!downward || !atBottom()) { pushes = []; return false; }
  const last = pushes.at(-1);
  if (last !== undefined && now - last < BURST_MS) return false;       // same burst
  if (last !== undefined && now - last > HOLD_GAP_MS) pushes = [];      // gave up, start over
  pushes.push(now);
  const span = pushes.at(-1) - pushes[0];
  if (pushes.length >= HOLD_MIN_PUSHES && span >= HOLD_MS) {
    armExpendable();
    return true;
  }
  return false;
}

// Second way in: rest the cursor on MU/TH/UR for three seconds.
const HOVER_MS = 3000;
let hoverTimer = null;
function beginHover() {
  if (state.expendable) return;
  const button = document.querySelector('#mother-button');
  button?.classList.add('arming');
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => { button?.classList.remove('arming'); armExpendable(); }, HOVER_MS);
}
function endHover() {
  clearTimeout(hoverTimer);
  hoverTimer = null;
  document.querySelector('#mother-button')?.classList.remove('arming');
}
document.querySelector('#mother-button')?.addEventListener('mouseenter', beginHover);
document.querySelector('#mother-button')?.addEventListener('mouseleave', endHover);
document.querySelector('#mother-button')?.addEventListener('click', endHover);

// Debug surface for tests and for the curious: window.__pulse.trackHold(true, t)
globalThis.__pulse = { trackHold, armExpendable, disarmExpendable, beginHover, endHover, state };

els.thread.addEventListener('wheel', (event) => trackHold(event.deltaY > 0), { passive: true });
let touchY = null;
els.thread.addEventListener('touchstart', (event) => { touchY = event.touches[0]?.clientY ?? null; }, { passive: true });
els.thread.addEventListener('touchmove', (event) => {
  const y = event.touches[0]?.clientY ?? null;
  if (touchY !== null && y !== null) trackHold(y < touchY);
  touchY = y;
}, { passive: true });
els.thread.addEventListener('keydown', (event) => trackHold(event.key === 'ArrowDown' || event.key === 'End' || event.key === 'PageDown'));

/* ---------- bootstrap ---------- */

const initial = await fetch('/api/state').then((response) => response.json());
els.project.textContent = initial.projectRoot.split('/').filter(Boolean).at(-1) || initial.projectRoot;
els.project.title = initial.projectRoot;
if (els.treeRoot) els.treeRoot.textContent = `/ ${initial.projectRoot.split('/').filter(Boolean).at(-1) ?? ''}`;
state.budget = Number.isFinite(initial.softTokenBudget) && initial.softTokenBudget > 0 ? initial.softTokenBudget : null;
state.timeouts = initial.timeouts ?? {};
state.sessions = initial.sessions ?? {};
state.capabilities = initial.capabilities ?? {};
syncAshCodeUI(Boolean(initial.ashCode?.enabled));
state.ripley = Boolean(initial.ripley?.enabled);
state.projectRoot = initial.projectRoot ?? '';
state.platform = initial.platform ?? null;
for (const plan of initial.plans ?? []) state.plansRunning.add(plan.planId);
updateStopAll();
for (const agent of initial.agents) {
  const window = initial.budgetWindow?.[agent.id];
  state.agents.set(agent.id, { ...agent, tokens: window?.tokens ?? 0, rawTokens: window?.rawTokens ?? 0, windowMs: window?.windowMs ?? null, rollsOverAt: window?.rollsOverAt ?? null, officialPercent: null, officialResetAt: null, officialWindows: null });
  if (agent.ready) els.target.add(new Option(agent.label, agent.id));
}
// Windows roll over without anyone typing: re-read the room's view every minute.
async function refreshBudgetWindow() {
  try {
    const data = await fetch('/api/state').then((response) => response.json());
    for (const [id, window] of Object.entries(data.budgetWindow ?? {})) {
      const entry = state.agents.get(id);
      if (entry) { entry.tokens = window.tokens; entry.rawTokens = window.rawTokens; entry.rollsOverAt = window.rollsOverAt; }
    }
    renderAgents();
  } catch { /* offline; the stream will tell */ }
}
if (typeof setInterval === 'function') { const ticker = setInterval(refreshBudgetWindow, 60000); ticker.unref?.(); }
if (!els.target.options.length) els.target.add(new Option('No agent ready', ''));
renderAgents();
renderPicker();
renderOnboarding();
for (const event of initial.events) renderEvent(event);
scrollToEnd();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { applyTheme(themeMode); renderAgents(); renderPicker(); });

/* ---------- live stream ---------- */

function setConnection(value) {
  els.connection.dataset.state = value;
  els.connection.querySelector('.connection-label').textContent = value;
}
if (typeof ResizeObserver === 'function' && els.composer) new ResizeObserver(placeToast).observe(els.composer);
window.addEventListener?.('resize', placeToast);
const stream = new EventSource(`/api/events?since=${state.lastSequence}`);
stream.onopen = () => { setConnection('live'); replaying = false; };
stream.onerror = () => setConnection('reconnecting');
stream.onmessage = ({ data }) => renderEvent(JSON.parse(data));

/* ---------- composer ---------- */

// One line, always. Height follows the lines the text actually takes,
// wrapped or explicit, up to three visible lines; longer text scrolls inside.
function autosize() {
  els.input.style.height = `${LINE_PX}px`;
  const padding = 14; // 7px top + bottom, content-box
  const needed = Math.max(1, Math.ceil((els.input.scrollHeight - padding) / LINE_PX));
  const rows = Math.min(Number.isFinite(needed) ? needed : 1, MAX_ROWS);
  els.input.style.height = `${rows * LINE_PX}px`;
  els.highlight.style.height = els.input.style.height;
  renderHighlight();
}
function syncHighlightScroll() { els.highlight.scrollTop = els.input.scrollTop; }
els.input.addEventListener('input', autosize);
els.input.addEventListener('scroll', syncHighlightScroll);
autosize();

/* ---------- labels inside the field: @agent mentions and /commands ---------- */

function allCommands() { return [...CLIENT_COMMANDS, ...(state.commands ?? [])]; }
function knownAgentIds() { return [...state.agents.keys()]; }
function escapeHtml(text) { return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

function renderHighlight() {
  const text = els.input.value;
  const agents = knownAgentIds();
  const commands = allCommands();
  const html = escapeHtml(text).replace(/(^|[\s(,;:])([@/!#])([\w][\w./-]*(?::\d+(?:-\d+)?)?)/g, (whole, lead, sigil, name) => {
    const key = name.toLowerCase();
    if (sigil === '#') {
      if (!/^[0-3]$/.test(name)) return whole;
      return `${lead}<span class="chip mode m${name}">#${name} ${MODES[Number(name)].label}</span>`;
    }
    if (sigil === '!') {
      if (!/\.[A-Za-z0-9]{1,8}(?::\d+(?:-\d+)?)?$/.test(name)) return whole;
      return `${lead}<span class="chip file">!${escapeHtml(name)}</span>`;
    }
    if (sigil === '@') {
      if (!agents.includes(key)) return whole;
      return `${lead}<span class="chip agent" style="--agent:${brandOf(key).color}">@${escapeHtml(name)}</span>`;
    }
    const command = commands.find((item) => item.name === key);
    if (!command) return whole;
    return `${lead}<span class="chip cmd${command.available ? '' : ' unknown'}">/${escapeHtml(name)}</span>`;
  });
  els.highlight.innerHTML = `${html}${text.endsWith('\n') ? '\n' : ''}` || '';
  syncHighlightScroll();
}

async function refreshCommands() {
  try {
    const data = await fetch('/api/commands').then((response) => response.json());
    state.commands = (data.commands ?? []).map((item) => ({ ...item, client: false }));
  } catch {
    state.commands = [];
  }
  renderHighlight();
}

// The "/" and "@" menu: typing either at the start of a word lists what fits.
const menu = { items: [], index: 0, kind: null, start: 0, end: 0 };
function menuQuery() {
  const caret = els.input.selectionStart ?? els.input.value.length;
  const before = els.input.value.slice(0, caret);
  const match = before.match(/(^|[\s(,;:])([@/!#])([\w./-]*)$/);
  if (!match) return null;
  return { kind: match[2], query: match[3].toLowerCase(), start: caret - match[3].length - 1, end: caret };
}
function closeMenu() { els.slashMenu.hidden = true; menu.items = []; menu.kind = null; }
let fileSearchTimer = null;
let fileSearchSeq = 0;
function fileMenu(found) {
  // Ask the server for matching project files, debounced; render when the answer is still current.
  clearTimeout(fileSearchTimer);
  const seq = ++fileSearchSeq;
  fileSearchTimer = setTimeout(async () => {
    try {
      const data = await fetch(`/api/tree/search?q=${encodeURIComponent(found.query)}`).then((response) => response.json());
      if (seq !== fileSearchSeq) return;
      const current = menuQuery();
      if (!current || current.kind !== '!' || current.query !== found.query) return;
      const items = (data.matches ?? []).map((file) => ({ key: `!${file.name}`, insert: `!${file.path} `, what: file.path, color: null }));
      if (!items.length) return closeMenu();
      showMenu(items, { ...found, hint: 'FILE · ↑↓ · TAB OR ENTER · add :12-20 for lines' });
    } catch { closeMenu(); }
  }, 120);
}
function renderMenu() {
  const found = menuQuery();
  if (!found) return closeMenu();
  if (found.kind === '!') return fileMenu(found);
  if (found.kind === '#') {
    const cap = ceilingFor(els.target.value);
    const items = [0, 1, 2, 3, 4].filter((n) => String(n).startsWith(found.query)).map((n) => ({ key: `#${n} ${MODES[n].label}`, insert: `#${n} `, what: n > cap ? `${MODES[n].hint} · above @${els.target.value}'s max mode` : MODES[n].hint, off: n > cap }));
    if (!items.length) return closeMenu();
    return showMenu(items, { ...found, hint: 'MODE · ↑↓ · TAB OR ENTER' });
  }
  const items = found.kind === '@'
    ? knownAgentIds().filter((id) => id.startsWith(found.query)).map((id) => ({ key: `@${id}`, insert: `@${id} `, what: state.agents.get(id)?.ready ? label(id) : `${label(id)} · not ready`, color: brandOf(id).color, off: !state.agents.get(id)?.ready }))
    : allCommands().filter((item) => item.name.startsWith(found.query)).map((item) => ({ key: item.usage ?? `/${item.name}`, insert: `/${item.name} `, what: item.available ? item.summary : `${item.title} is not available here · see MODULES`, off: !item.available }));
  if (!items.length) return closeMenu();
  showMenu(items, found);
}
function showMenu(items, found) {
  Object.assign(menu, { items, index: Math.min(menu.index, items.length - 1), kind: found.kind, start: found.start, end: found.end });
  els.slashMenu.replaceChildren();
  items.forEach((item, index) => {
    const button = el('button', `item${item.off ? ' off' : ''}`);
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === menu.index));
    if (item.color) button.style.setProperty('--agent', item.color);
    button.append(el('span', 'key', item.key), el('span', 'what', item.what));
    button.addEventListener('mousedown', (event) => { event.preventDefault(); pickMenu(index); });
    els.slashMenu.append(button);
  });
  els.slashMenu.append(el('div', 'hint', found.hint ?? (found.kind === '@' ? 'MENTION · ↑↓ · TAB OR ENTER' : 'COMMAND · ↑↓ · TAB OR ENTER')));
  els.slashMenu.hidden = false;
}
function pickMenu(index = menu.index) {
  const item = menu.items[index];
  if (!item) return;
  const value = els.input.value;
  els.input.value = `${value.slice(0, menu.start)}${item.insert}${value.slice(menu.end)}`;
  const caret = menu.start + item.insert.length;
  els.input.setSelectionRange(caret, caret);
  closeMenu();
  autosize();
  els.input.focus();
}
els.input.addEventListener('input', () => { menu.index = 0; renderMenu(); });
els.input.addEventListener('click', renderMenu);
els.input.addEventListener('blur', () => setTimeout(closeMenu, 120));
els.input.addEventListener('keydown', (event) => {
  if (els.slashMenu.hidden) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); menu.index = (menu.index + 1) % menu.items.length; renderMenu(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); menu.index = (menu.index - 1 + menu.items.length) % menu.items.length; renderMenu(); }
  else if (event.key === 'Tab' || event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); pickMenu(); }
  else if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
}, true);

// A "/command" the human sends: client commands act here, module commands run
// on the server and come back as a fact card in the thread.
async function runSlashCommand(text) {
  const match = text.match(/^\/([a-z][\w-]*)(?:\s+([\s\S]*))?$/i);
  if (!match) return { handled: false };
  const name = match[1].toLowerCase();
  const rest = (match[2] ?? '').trim();
  if (name === 'stopall') { await stopAll(); return { handled: true }; }
  if (name === 'create' || name === 'image') {
    if (!rest) { toast(`MU/TH/UR › /${name} needs a request after it, e.g. "/${name} a poster for the launch".`); return { handled: true }; }
    let target = els.target.value;
    if (name === 'image') {
      const capable = [...state.agents.values()].filter((agent) => agent.ready && state.capabilities[agent.id]?.scopes?.imageGen?.enabled).map((agent) => agent.id);
      if (!capable.includes(target)) {
        if (!capable.length) { toast('MU/TH/UR › nobody in the room can generate images right now: enable Image Studio in MODULES or switch on GENERATE IMAGES for an agent in CONNECTIONS.'); return { handled: true }; }
        toast(`MU/TH/UR › @${target} cannot generate images here; routing to @${capable[0]}.`);
        target = capable[0];
        els.target.value = target;
        renderPicker();
      }
    }
    if (!state.create) setMode(2);
    return { handled: false, text: rest, target };
  }
  const known = allCommands().find((item) => item.name === name);
  if (!known) { toast(`MU/TH/UR › unknown command /${name}. Type "/" to see what this room offers.`); return { handled: true }; }
  if (!known.available) { toast(`MU/TH/UR › /${name} is not available in this project: ${known.title} (see MODULES).`); return { handled: true }; }
  const response = await fetch('/api/commands', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!response.ok && response.status !== 422) {
    const result = await response.json().catch(() => ({}));
    toast(result.error ?? `/${name} failed (${response.status}).`);
  }
  return { handled: true };
}

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.composer.requestSubmit();
  }
});

const STOPALL = /^\/?stop\s*all!?$/i;
els.input.addEventListener('input', () => {
  els.composer.classList.toggle('stopall', STOPALL.test(els.input.value.trim()));
});
document.querySelector('#stop-all')?.addEventListener('click', stopAll);

function renderPendingAttachments() {
  els.attachments.replaceChildren();
  els.attachments.hidden = state.pending.length === 0;
  for (const item of state.pending) {
    const chip = el('span', `attachment-chip${item.uploading ? ' uploading' : ''}`);
    if (item.previewUrl) { const img = el('img'); img.src = item.previewUrl; img.alt = item.name; chip.append(img); }
    else chip.append(el('span', 'kind', (item.name.split('.').pop() ?? 'file').slice(0, 4).toUpperCase()));
    chip.append(el('span', 'name', item.uploading ? `${item.name} · uploading…` : item.name));
    const remove = el('button', 'remove', '×');
    remove.type = 'button'; remove.title = 'Remove';
    remove.addEventListener('click', () => { state.pending = state.pending.filter((other) => other !== item); renderPendingAttachments(); });
    chip.append(remove);
    els.attachments.append(chip);
  }
}
async function addFiles(files) {
  for (const file of files) {
    const item = { name: file.name || 'pasted-image.png', uploading: true, id: null, previewUrl: file.type?.startsWith('image/') ? URL.createObjectURL(file) : null };
    state.pending.push(item);
    renderPendingAttachments();
    try {
      const response = await fetch('/api/attachments', { method: 'POST', headers: { 'x-pulse-filename': encodeURIComponent(item.name), 'content-type': file.type || 'application/octet-stream' }, body: file });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Upload failed (${response.status}).`);
      item.id = result.attachment.id; item.uploading = false;
    } catch (error) {
      state.pending = state.pending.filter((other) => other !== item);
      toast(`Attachment rejected: ${error.message}`);
    }
    renderPendingAttachments();
  }
}
function renderCreateScopes() {
  const box = document.querySelector('#create-scopes');
  if (!box) return;
  const id = els.target.value;
  const scopes = state.capabilities[id]?.scopes;
  const standing = Boolean(scopes?.write?.always);
  els.createToggle.classList.toggle('standing', standing);
  els.createToggle.title = standing
    ? `@${id} starts in #2 (DEFAULT MODE in CONNECTIONS): every turn may add files to the project. Arming CREATE is not needed.`
    : 'CREATE: let the agent add new files to the project for this request; existing files stay untouched';
  box.hidden = !state.create || !scopes;
  if (box.hidden) return;
  box.replaceChildren();
  for (const [key, labelText] of [['write', 'files'], ['imageGen', 'images'], ['web', 'web']]) {
    const scope = scopes[key] ?? {};
    const on = scope.enabled && scope.wired;
    const badge = el('span', `cap${on ? ' on' : scope.capable ? '' : ' no'}`, labelText);
    badge.title = on ? `${labelText}: enabled for @${id}` : !scope.capable ? `${labelText}: @${id}'s CLI cannot do this` : !scope.wired ? `${labelText}: not wired yet` : `${labelText}: switched off for @${id} in CONNECTIONS`;
    box.append(badge);
  }
  if (!scopes.write?.enabled) toast(`MU/TH/UR › @${id} ${scopes.write?.capable ? 'has file creation switched off' : 'cannot create files from its CLI'}. CREATE will be refused; pick another agent or change CONNECTIONS.`);
}
els.createToggle.addEventListener('click', () => { setMode(state.mode === 2 ? 1 : 2); els.input.focus(); });
// The crew label reads the composer's state: order, lease, easter egg, human.
// While CODE000 seals the archive, whoever sits at this console is an intruder to MOTHER.
let intruderTimer = null;
function markIntruder(ms) {
  clearTimeout(intruderTimer);
  state.intruder = ms > 0;
  els.composer.classList.toggle('intruder', state.intruder);
  updateCrewLabel();
  if (state.intruder) intruderTimer = setTimeout(() => { state.intruder = false; els.composer.classList.remove('intruder'); updateCrewLabel(); toast('MU/TH/UR › the archive is open again. Behave.'); }, ms);
}
fetch('/api/mother').then((response) => response.json()).then((status) => { if ((status?.mother?.lockedForMs ?? 0) > 0) markIntruder(status.mother.lockedForMs); }).catch(() => {});

function updateCrewLabel() {
  const order = state.ashCode && state.ashCodeInstalled;
  els.crewLabel.textContent = state.intruder && state.mode < 3 ? 'INTRUDER ›' : state.mode >= 3 ? `MU/TH/UR · ${MODES[state.mode].label} @${(state.modeArmedFor ?? els.target.value ?? '').toUpperCase()} ›`
    : state.mode === 0 ? 'HUMAN · GHOST ›'
      : order ? (state.create ? 'MU/TH/UR · ASH · CREATE ›' : 'MU/TH/UR · ASH CODE ›')
        : state.create ? 'HUMAN · CREATE ›'
          : state.expendable ? 'CREW · EXPENDABLE ›' : 'HUMAN ›';
}
function updatePlaceholder() {
  const local = Boolean(state.agents.get(els.target.value)?.local);
  els.input.placeholder = state.mode === 4 ? PLACEHOLDERS.airlock : state.mode === 3 ? PLACEHOLDERS.control : state.mode === 0 ? PLACEHOLDERS.ghost : local ? PLACEHOLDERS.memory : state.create ? PLACEHOLDERS.create : (state.ashCode && state.ashCodeInstalled) ? PLACEHOLDERS.order : state.expendable ? PLACEHOLDERS.expendable : PLACEHOLDERS.plain;
}
function setOrder937(on, { wink = false } = {}) {
  state.ashCode = on;
  els.ashToggle.setAttribute('aria-pressed', String(on));
  els.ashToggle.textContent = on ? 'ASH_CODE' : 'ash_code';
  els.composer.classList.toggle('ordering', on);
  updateCrewLabel();
  updatePlaceholder();
  autosize();
  if (on && wink) {
    winkField();
  } else if (!on) {
    els.composer.classList.remove('ash-wink');
  }
}
// The wink to MOTHER. Three of them: ASH CODE is one green CRT sweep across the field ('ash'),
// GHOST fills the field with smoke that clears at once ('ghost'), CONTROL rains red binary over
// the field and the whole room ('control'). Then business as usual.
const WINKS = { ash: 1600, ghost: 1200, control: 3000 };
function winkField(kind = 'ash') {
  clearTimeout(winkTimer);
  const classes = Object.keys(WINKS).map((name) => `${name}-wink`);
  els.composer.classList.remove(...classes);
  void els.composer.offsetWidth;
  els.composer.classList.add(`${kind}-wink`);
  if (kind === 'control') { binaryRain(els.composer.querySelector('.field')); binaryRain(document.body, { fixed: true, duration: 2800, cell: 15, size: 13 }); }
  winkTimer = setTimeout(() => els.composer.classList.remove(...classes), WINKS[kind] ?? 1600);
}
// Red 0/1 glyphs falling like rain, a bright head and a fading trail per column, gone after a couple of seconds.
// Over the field it fits the box; with fixed:true it covers the viewport. Skipped under reduced motion.
function binaryRain(host, { duration = 2400, fixed = false, cell = 11, size = 10 } = {}) {
  if (!host || typeof requestAnimationFrame !== 'function') return;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const old of host.querySelectorAll?.(fixed ? '.rain.global' : ':scope > .rain') ?? []) old.remove();
  const canvas = document.createElement('canvas');
  canvas.className = fixed ? 'rain global' : 'rain';
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const rect = fixed ? { width: window.innerWidth, height: window.innerHeight } : host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  host.append(canvas);
  ctx.scale(scale, scale);
  const styles = getComputedStyle(host);
  const red = styles.getPropertyValue('--terror').trim() || '#ff2a1f';
  ctx.font = `700 ${size}px ${styles.getPropertyValue('--mono').trim() || 'monospace'}`;
  const drops = Array.from({ length: Math.ceil(rect.width / cell) }, () => ({ y: -Math.random() * rect.height * (fixed ? 1.2 : 2), speed: (fixed ? 4 : 2.5) + Math.random() * (fixed ? 9 : 5) }));
  const started = performance.now();
  let last = started;
  const frame = (now) => {
    const t = now - started;
    const dt = Math.min(48, now - last);
    last = now;
    // Fade the previous frame a little: the trail behind each drop.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, .16)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalCompositeOperation = 'source-over';
    const intensity = t < duration * 0.65 ? 1 : Math.max(0, 1 - (t - duration * 0.65) / (duration * 0.35));
    drops.forEach((drop, i) => {
      drop.y += drop.speed * dt / 16;
      if (drop.y > rect.height + cell && intensity > 0.4) { drop.y = -cell * (1 + Math.random() * 16); drop.speed = (fixed ? 4 : 2.5) + Math.random() * (fixed ? 9 : 5); }
      ctx.globalAlpha = intensity * (0.5 + Math.random() * 0.5);
      ctx.fillStyle = Math.random() < 0.1 ? '#fff1ef' : red;
      ctx.fillText(Math.random() < 0.5 ? '0' : '1', i * cell + 2, drop.y);
    });
    ctx.globalAlpha = 1;
    if (t < duration && canvas.isConnected) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}
function syncAshCodeUI(enabled) {
  state.ashCodeInstalled = enabled;
  els.ashToggle.hidden = !enabled;
  setOrder937(enabled);
}
els.ashToggle.addEventListener('click', () => {
  if (!state.ashCodeInstalled) return;
  setOrder937(!state.ashCode, { wink: true });
  if (state.ashCode) toast('MU/TH/UR › ASH CODE · BETA: abbreviation may change meaning or cause errors. Check the original. Fewer characters are not verified token savings.');
  els.input.focus();
});
els.attach.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', () => { void addFiles([...els.fileInput.files]); els.fileInput.value = ''; });
els.input.addEventListener('paste', (event) => {
  const files = [...(event.clipboardData?.files ?? [])];
  if (files.length) { event.preventDefault(); void addFiles(files); }
});
for (const type of ['dragenter', 'dragover']) els.composer.addEventListener(type, (event) => { event.preventDefault(); els.composer.classList.add('dropping'); });
for (const type of ['dragleave', 'drop']) els.composer.addEventListener(type, (event) => { event.preventDefault(); els.composer.classList.remove('dropping'); });
els.composer.addEventListener('drop', (event) => { const files = [...(event.dataTransfer?.files ?? [])]; if (files.length) void addFiles(files); });

els.composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = els.input.value.trim();
  const ready = state.pending.filter((item) => item.id && !item.uploading);
  if (!text && !ready.length) return;
  if (state.pending.some((item) => item.uploading)) { toast('An attachment is still uploading.'); return; }
  if (STOPALL.test(text)) {
    // Master command: never reaches an agent.
    els.input.value = '';
    els.composer.classList.remove('stopall');
    autosize();
    await stopAll();
    return;
  }
  let outgoing = text;
  let target = els.target.value;
  // "#2" written in the message is the same as choosing it in the chip.
  const modeToken = outgoing.match(/(^|\s)#([0-3])(?=\s|$)/);
  if (modeToken) { setMode(Number(modeToken[2])); outgoing = outgoing.replace(/(^|\s)#[0-3](?=\s|$)/, '$1').replace(/\s{2,}/g, ' ').trim(); }
  if (text.startsWith('/')) {
    els.input.disabled = true;
    const result = await runSlashCommand(text).catch((error) => { toast(`Command failed: ${error.message}`); return { handled: true }; });
    els.input.disabled = false;
    if (result.handled) { els.input.value = ''; autosize(); els.input.focus(); return; }
    outgoing = result.text ?? text;
    target = result.target ?? target;
  }
  els.input.disabled = true;
  els.send.disabled = true;
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: outgoing, target: target || null, model: state.chosenModel[target] ?? null, attachments: ready.map((item) => item.id), create: state.create, mode: state.mode, ashCode: state.ashCodeInstalled && state.ashCode }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: `Request failed (${response.status}).` }));
      toast(`MU/TH/UR › ${result.error ?? 'The room rejected the message.'}`);
      if (state.mode >= 3 && [403, 409, 412].includes(response.status)) setMode(1);
    } else {
      els.input.value = '';
      state.pending = [];
      renderPendingAttachments();
      resetModeAfterSend(); // one mode per message; standing leases fall back to #2, everyone else to #1
      autosize();
    }
  } catch (error) {
    toast(`Could not reach MADRE: ${error.message}`);
  } finally {
    els.input.disabled = false;
    els.send.disabled = false;
    els.input.focus();
  }
});

/* ---------- MU/TH/UR: troubleshooting ---------- */

const mother = {
  dialog: document.querySelector('#mother'),
  button: document.querySelector('#mother-button'),
  count: document.querySelector('#mother-count'),
  close: document.querySelector('#mother-close'),
  boot: document.querySelector('#mother-boot'),
  query: document.querySelector('#mother-query'),
  input: document.querySelector('#mother-input'),
  os: document.querySelector('#mother-os'),
  answer: document.querySelector('#mother-answer'),
  recorded: document.querySelector('#mother-recorded'),
  known: document.querySelector('#mother-known'),
  platform: detectPlatform(),
  bootTimer: null,
};

function recordFailure(entry) {
  state.failures.push(entry);
  const count = state.failures.filter((failure) => !failure.recovered).length;
  // Called while the transcript is still being replayed, before the MU/TH/UR
  // block below has initialised, so look the badge up directly.
  const badge = document.querySelector('#mother-count');
  if (!badge) return;
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function commandBlock(lines) {
  const block = el('div', 'mother-cmd');
  const copy = el('button', 'copy', 'COPY');
  copy.type = 'button';
  const runnable = lines.filter((line) => !line.trim().startsWith('#'));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(runnable.join('\n'));
      copy.textContent = 'COPIED';
      setTimeout(() => { copy.textContent = 'COPY'; }, 1500);
    } catch {
      copy.textContent = 'SELECT';
    }
  });
  block.append(copy);
  const pre = el('pre');
  for (const line of lines) {
    const span = el('span', line.trim().startsWith('#') ? 'c' : null, line);
    pre.append(span, '\n');
  }
  block.append(pre);
  return block;
}

function conditionCard(condition, { hit = false, agent = null, hintAgent = null } = {}) {
  const card = el('article', `mother-card${hit ? ' hit' : ''}`);
  card.id = `mother-${condition.id}`;
  const tags = el('div', 'tags');
  tags.append(el('span', `sev-${condition.severity}`, condition.severity));
  if (condition.agent) tags.append(paint(el('span', 'agent', `@${condition.agent}`), condition.agent));
  tags.append(el('span', null, condition.id));
  card.append(tags);
  card.append(el('h4', null, condition.title));
  const diagnosis = el('p');
  diagnosis.append(el('b', null, 'DIAGNOSIS'));
  diagnosis.append(condition.diagnosis);
  card.append(diagnosis);
  const remedy = el('p', 'remedy');
  remedy.append(el('b', null, 'REMEDY'));
  remedy.append(condition.remedy);
  card.append(remedy);
  const actions = conditionActions(condition, hintAgent ?? agent ?? condition.agent ?? null);
  if (actions.length) {
    const bar = el('div', 'actions');
    for (const action of actions) {
      const button = el('button', 'act', action.label);
      button.type = 'button';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await saveSettingNow(action.patch, action.done); button.textContent = 'APPLIED ✓'; }
        catch (error) { toast(`Could not apply: ${error.message}`); button.disabled = false; }
      });
      bar.append(button);
    }
    bar.append(el('span', 'note', 'APPLIES NOW · TERMINAL COMMANDS BELOW ARE THE LAUNCH-TIME ALTERNATIVE'));
    card.append(bar);
  }
  const chosen = agent ?? condition.agent ?? null;
  card.append(commandBlock(fixesFor(condition, mother.platform, chosen)));
  if (condition.perAgent && !chosen) {
    for (const id of Object.keys(condition.perAgent)) {
      const label = paint(el('p'), id);
      label.append(el('b', null, `@${id}`));
      card.append(label);
      card.append(commandBlock(condition.perAgent[id][mother.platform] ?? []));
    }
  }
  return card;
}

function renderMotherOs() {
  mother.os.replaceChildren();
  for (const [id, meta] of Object.entries(PLATFORMS)) {
    const button = el('button', null, meta.label.toUpperCase());
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(id === mother.platform));
    button.addEventListener('click', () => { mother.platform = id; renderMother(); });
    mother.os.append(button);
  }
}

function renderMotherRecorded() {
  mother.recorded.replaceChildren();
  let collapsed = false;
  try { collapsed = localStorage.getItem('pulse.mother.log') === 'collapsed'; } catch { /* no storage */ }
  const head = el('h3', 'toggle');
  const headButton = el('button', null, `RECORDED CONDITIONS · THIS ROOM · ${state.failures.length}`);
  headButton.type = 'button';
  headButton.setAttribute('aria-expanded', String(!collapsed));
  headButton.append(el('span', 'caret', collapsed ? '▸ EXPAND' : '▾ COLLAPSE'));
  headButton.addEventListener('click', () => {
    try { localStorage.setItem('pulse.mother.log', collapsed ? 'expanded' : 'collapsed'); } catch { /* no storage */ }
    renderMotherRecorded();
  });
  head.append(headButton);
  mother.recorded.append(head);
  mother.recorded.classList.toggle('collapsed', collapsed);
  if (collapsed) return;
  if (!state.failures.length) {
    mother.recorded.append(el('p', 'mother-answer', 'NO CONDITIONS RECORDED. ALL SYSTEMS NOMINAL.'));
    return;
  }
  for (const failure of [...state.failures].reverse().slice(0, 40)) {
    const rowNode = paint(el('div', 'mother-record'), failure.agent);
    rowNode.append(el('span', 't', formatTime(failure.time)));
    rowNode.append(el('span', 'a', failure.agent ?? 'room'));
    const full = String(failure.error).trim();
    const firstLine = full.split('\n')[0].slice(0, 220);
    const errorNode = el('span', 'e', firstLine);
    if (full.length > firstLine.length) {
      // One line by default; click to read the whole record and back.
      errorNode.classList.add('more');
      errorNode.title = 'Expand';
      errorNode.tabIndex = 0;
      const flip = () => {
        const open = errorNode.classList.toggle('open');
        errorNode.textContent = open ? full.slice(0, 4000) : firstLine;
        errorNode.title = open ? 'Collapse' : 'Expand';
      };
      errorNode.addEventListener('click', flip);
      errorNode.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
    }
    rowNode.append(errorNode);
    const matches = diagnose(failure.error, failure.agent);
    const links = el('span', 'k');
    if (!matches.length) links.append(el('span', 'none', 'UNCLASSIFIED'));
    for (const condition of matches) {
      const jump = el('button', null, condition.id);
      jump.type = 'button';
      jump.addEventListener('click', () => {
        mother.input.value = '';
        // Choosing a fix from the log is a request to see it: the list opens and stays open.
        try { localStorage.setItem('pulse.mother.known', 'expanded'); } catch { /* no storage */ }
        renderMotherKnown(CONDITIONS, new Set(matches.map((item) => item.id)), failure.agent);
        document.getElementById(`mother-${condition.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      links.append(jump);
    }
    rowNode.append(links);
    mother.recorded.append(rowNode);
  }
}

function renderMotherKnown(list = CONDITIONS, hits = new Set(), agent = null) {
  mother.known.replaceChildren();
  let collapsed = false;
  try { collapsed = localStorage.getItem('pulse.mother.known') === 'collapsed'; } catch { /* no storage */ }
  // An inquiry that narrowed the list, or a fix chosen from the log, always shows its answer, whatever the stored state.
  if (list.length !== CONDITIONS.length || hits.size) collapsed = false;
  const head = el('h3', 'toggle');
  const headButton = el('button', null, `KNOWN CONDITIONS · ${list.length} OF ${CONDITIONS.length} · ${PLATFORMS[mother.platform].label.toUpperCase()} / ${PLATFORMS[mother.platform].shell.toUpperCase()}`);
  headButton.type = 'button';
  headButton.setAttribute('aria-expanded', String(!collapsed));
  headButton.append(el('span', 'caret', collapsed ? '▸ EXPAND' : '▾ COLLAPSE'));
  headButton.addEventListener('click', () => {
    try { localStorage.setItem('pulse.mother.known', collapsed ? 'expanded' : 'collapsed'); } catch { /* no storage */ }
    renderMotherKnown(list, hits, agent);
  });
  head.append(headButton);
  mother.known.append(head);
  mother.known.classList.toggle('collapsed', collapsed);
  if (collapsed) return;
  const grid = el('div', 'mother-grid');
  const ordered = [...list].sort((a, b) => Number(hits.has(b.id)) - Number(hits.has(a.id)));
  for (const condition of ordered) grid.append(conditionCard(condition, { hit: hits.has(condition.id), agent: agent && condition.perAgent ? agent : null, hintAgent: agent }));
  mother.known.append(grid);
}

function answerQuery(query) {
  const text = query.trim();
  if (!text) { mother.answer.textContent = ''; return renderMotherKnown(); }
  if (/special order|937|expendable/i.test(text)) {
    mother.answer.textContent = 'NO SPECIAL ORDERS ON THIS SHIP. THE CREW IS NOT EXPENDABLE. RESTATE INQUIRY.';
    return renderMotherKnown([]);
  }
  if (/^(help|\?)$/i.test(text)) {
    mother.answer.textContent = 'INQUIRY ACCEPTS: AN AGENT NAME · A SYMPTOM · A KEYWORD SUCH AS TIMEOUT, LOGIN, PORT, BUDGET.';
    return renderMotherKnown();
  }
  const byError = diagnose(text);
  const bySearch = searchConditions(text);
  const list = [...new Set([...byError, ...bySearch])];
  const recordedHits = new Set(state.failures.flatMap((failure) => diagnose(failure.error, failure.agent).map((c) => c.id)));
  if (!list.length) {
    mother.answer.textContent = 'UNABLE TO COMPUTE. REQUEST CLARIFICATION.';
    return renderMotherKnown([]);
  }
  mother.answer.textContent = `${list.length} CONDITION${list.length === 1 ? '' : 'S'} MATCH INQUIRY.${byError.length ? ' PROBABLE CAUSE HIGHLIGHTED.' : ''}`;
  renderMotherKnown(list, new Set([...byError.map((c) => c.id), ...recordedHits]));
}

function renderMother() {
  renderMotherOs();
  renderMotherRecorded();
  answerQuery(mother.input.value);
}

function bootMother() {
  clearTimeout(mother.bootTimer);
  const online = [...state.agents.values()].filter((agent) => agent.ready).length;
  const open = state.failures.filter((failure) => !failure.recovered).length;
  const lines = [
    'INTERFACE 2037 READY FOR INQUIRY',
    `CREW: ${state.agents.size} AGENTS · ${online} READY · ROOM /${els.project.textContent}`,
    open ? `${open} CONDITION${open === 1 ? '' : 'S'} RECORDED IN THIS ROOM. PROBABLE CAUSES CLASSIFIED BELOW.` : 'NO OPEN CONDITIONS. ALL SYSTEMS NOMINAL.',
  ];
  mother.boot.textContent = '';
  let index = 0;
  const step = () => {
    if (index >= lines.length) return;
    mother.boot.textContent += `${index ? '\n' : ''}${lines[index]}`;
    index += 1;
    mother.bootTimer = setTimeout(step, 320);
  };
  step();
}

function openMother() {
  if (mother.dialog.open) return;
  mother.dialog.showModal();
  bootMother();
  renderMother();
  mother.input.focus();
}

mother.button.addEventListener('click', openMother);
mother.close.addEventListener('click', () => mother.dialog.close());
mother.query.addEventListener('submit', (event) => { event.preventDefault(); answerQuery(mother.input.value); });
mother.input.addEventListener('input', () => answerQuery(mother.input.value));
mother.dialog.addEventListener('close', () => clearTimeout(mother.bootTimer));


/* ---------- MODULES: optional integrations installed by their own tools ---------- */

const modules = {
  dialog: document.querySelector('#modules'),
  button: document.querySelector('#modules-button'),
  count: document.querySelector('#modules-count'),
  close: document.querySelector('#modules-close'),
  list: document.querySelector('#modules-list'),
  note: document.querySelector('#modules-note'),
  items: [],
  installing: null,
  logs: new Map(),   // id -> array of lines
  confirming: null,
};

function renderModuleEvent(event) {
  const { id, name, command, platforms = [], ok, code, error, status, problems = [] } = event.payload;
  const failed = (event.type.endsWith('finished') && !ok) || event.type.endsWith('refused');
  const node = el('div', `system module${failed ? ' failed' : ''}`);
  node.append(el('b', null, 'MODULES › '));
  if (event.type === 'extension.install.refused') {
    node.append(`${name} not installed · ${problems.join(' ')}`);
    modules.installing = null;
  } else if (event.type === 'extension.install.started') {
    node.append(`installing ${name}${platforms.length ? ` for ${platforms.map((p) => `@${p}`).join(', ')}` : ''}`);
    node.append(el('span', 'cmd', command));
    modules.installing = id;
  } else {
    node.append(ok
      ? `${name} installed${status?.detail ? ` · ${status.detail}` : ''}`
      : `${name} install failed${error ? ` · ${error}` : code !== undefined ? ` · exit ${code}` : ''}`);
    modules.installing = null;
    void refreshModules();
void refreshCommands();
  }
  state.lastSender = null;
  return node;
}

function renderCommandCard(event) {
  const { name, title, text, ok, args = [] } = event.payload;
  const node = el('div', `command-card${ok === false ? ' failed' : ''}`);
  const head = el('div', 'head');
  head.append(el('b', null, `/${name}`), el('span', null, title ?? name), el('span', 'args', args.join(' ')));
  const pre = el('pre');
  for (const line of String(text ?? '').split('\n')) {
    if (line.startsWith('## ')) pre.append(el('span', 'h', line.slice(3)), '\n');
    else pre.append(`${line}\n`);
  }
  node.append(head, pre);
  state.lastSender = null;
  return node;
}

function appendModuleOutput(event) {
  const { id, lines = [] } = event.payload;
  const log = modules.logs.get(id) ?? [];
  log.push(...lines);
  modules.logs.set(id, log.slice(-400));
  const box = document.getElementById(`module-log-${id}`);
  if (box) {
    for (const line of lines) box.append(el('div', /error|failed|ERR/i.test(line) ? 'err' : null, line));
    box.scrollTop = box.scrollHeight;
  }
}

async function refreshModules() {
  try {
    const data = await fetch('/api/extensions').then((response) => response.json());
    modules.failures = data.failures ?? []; modules.folders = data.folders ?? null; modules.sdk = data.sdk ?? null; modules.items = data.extensions ?? [];
    modules.installing = data.installing ?? null;
  } catch (error) {
    modules.items = [];
    modules.note.textContent = `UNABLE TO LIST MODULES: ${error.message}`;
  }
  const installed = modules.items.filter((item) => item.status?.installed).length;
  modules.count.hidden = installed === 0;
  modules.count.textContent = String(installed);
  if (modules.dialog.open) renderModules();
}

function builtinCard(item) {
  const card = el('article', 'module-card');
  card.id = `module-${item.id}`;
  const head = el('div', 'head');
  const title = el('div');
  title.append(el('h4', null, item.name));
  title.append(el('div', 'vendor', `${item.vendor} · v${item.version}`));
  head.append(title);
  const on = Boolean(item.status?.installed);
  if (item.external) { const dev = el('span', 'dev-tag', 'DEV'); dev.title = `Your module · ${item.origin === 'project' ? 'this project' : 'every room'} · ${item.file}`; head.append(dev); }
  head.append(el('span', `state${on ? ' installed' : ''}`, on ? 'ENABLED' : 'DISABLED'));
  card.append(head);
  card.append(el('p', null, item.summary));
  if (item.external) card.append(el('p', 'note', `${item.origin === 'project' ? 'THIS PROJECT' : 'EVERY ROOM'} · ${item.file}`));
  const list = el('ul');
  for (const line of item.creates ?? []) list.append(el('li', null, line));
  for (const line of item.requires ?? []) list.append(el('li', null, `requires ${line}`));
  card.append(list);
  if (item.id === 'ollama') {
    const info = item.ollama ?? { running: false, models: [], settings: {} };
    const status = el('dl', 'ollama-status');
    const put = (k, v) => { status.append(el('dt', null, k), el('dd', null, v)); };
    put('SERVER', info.running ? `running · ${info.host}` : 'not running');
    put('EMBEDDINGS', info.embedModel ? `${info.embedModel}${info.settings.embeddings === false ? ' · off' : ''}` : 'no embedding model');
    put('ARCHIVIST', info.chatModel ? `${info.chatModel}${info.settings.archivist === false ? ' · off' : ''}` : 'no chat model');
    if (info.models?.length) put('MODELS', info.models.map((model) => model.name).join(', '));
    card.append(status);
    const actions = el('div', 'actions');
    const recheck = el('button', null, 'RECHECK');
    recheck.type = 'button';
    recheck.addEventListener('click', async () => { recheck.disabled = true; await fetch('/api/ollama/probe', { method: 'POST' }).catch(() => null); await refreshModules(); });
    actions.append(recheck);
    if (info.running) {
      const toggle = el('button', on ? null : 'primary', info.settings.enabled === false ? 'ENABLE OLLAMA' : 'DISABLE OLLAMA');
      toggle.type = 'button';
      toggle.addEventListener('click', async () => {
        toggle.disabled = true;
        try {
          const response = await fetch('/api/extensions/ollama/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
          toast(result.enabled ? 'MU/TH/UR › OLLAMA ON · memory embeds and distils on this machine.' : 'MU/TH/UR › OLLAMA OFF · back to the providers.');
          await refreshModules();
        } catch (error) { toast(`Ollama could not change state: ${error.message}`); toggle.disabled = false; }
      });
      actions.append(toggle);
      for (const [role, model, present] of [['embeddings', item.recommended?.embed ?? 'nomic-embed-text', Boolean(info.embedModel)], ['archivist', item.recommended?.chat ?? 'qwen2.5:3b', Boolean(info.chatModel)], ['agent', item.recommended?.chat ?? 'qwen2.5:3b', Boolean(info.chatModel)]]) {
        if (present) {
          const box = el('label', 'toggle');
          const input = el('input'); input.type = 'checkbox'; input.checked = info.settings[role] !== false;
          input.addEventListener('change', async () => { input.disabled = true; await fetch('/api/ollama/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [role]: input.checked }) }).catch(() => null); await refreshModules(); });
          box.append(input, role === 'agent' ? '@MADRE IN THE ROOM' : role.toUpperCase());
          actions.append(box);
        } else {
          const pull = el('button', 'primary', `PULL ${model}`);
          pull.type = 'button';
          pull.title = `Download ${model} into Ollama for ${role}`;
          pull.addEventListener('click', async () => {
            pull.disabled = true;
            const response = await fetch('/api/ollama/pull', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model }) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) { toast(`MU/TH/UR › ${result.error ?? 'could not pull'}`); pull.disabled = false; }
            else toast(`MU/TH/UR › pulling ${model}; progress shows in the room.`);
          });
          actions.append(pull);
        }
      }
    } else {
      card.append(el('p', 'confirm', 'Start Ollama (the app, or `ollama serve` in a terminal), then RECHECK. Without it the room keeps using its providers.'));
    }
    card.append(actions);
    return card;
  }
  if (item.id === 'ripley') {
    const actions = el('div', 'actions');
    const toggle = el('button', on ? null : 'primary', on ? 'DISABLE RIPLEY' : 'ENABLE RIPLEY');
    toggle.type = 'button';
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      try {
        const response = await fetch('/api/extensions/ripley/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
        state.ripley = Boolean(result.enabled);
        syncViewerMode();
        toast(result.enabled ? 'MU/TH/UR › RIPLEY ON · HTML, SVG and Markdown render in the file viewer, in a sealed frame.' : 'MU/TH/UR › RIPLEY OFF · files show as source.');
        await refreshModules();
      } catch (error) {
        toast(`RIPLEY could not change state: ${error.message}`);
      } finally {
        toggle.disabled = false;
      }
    });
    actions.append(toggle);
    card.append(actions);
    return card;
  }
  if (item.id === 'ashcode') {
    card.append(el('p', 'ash-beta', item.warning ?? 'BETA · May change meaning; review the original.'));
    const actions = el('div', 'actions');
    const toggle = el('button', on ? null : 'primary', on ? 'DISABLE ASH CODE' : 'ENABLE BETA');
    toggle.type = 'button';
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      try {
        const response = await fetch('/api/extensions/ashcode/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
        syncAshCodeUI(Boolean(result.enabled));
        toast(result.enabled
          ? 'ASH CODE ON · BETA: prompts and replies may change meaning. Inspect the original; shorter characters are not verified token savings.'
          : 'ASH CODE OFF · messages are sent normally.');
        await refreshModules();
      } catch (error) {
        toast(`AshCode could not change state: ${error.message}`);
      } finally {
        toggle.disabled = false;
      }
    });
    actions.append(toggle);
    card.append(actions);
    return card;
  }
  if (item.preflight && !item.preflight.ok) {
    const warn = el('div', 'confirm');
    warn.append(el('span', 'warn', 'CANNOT ENABLE YET'));
    for (const problem of item.preflight.problems) warn.append(el('p', null, problem));
    card.append(warn);
  }
  const actions = el('div', 'actions');
  const model = el('select');
  for (const name of item.models ?? []) { const option = el('option', null, name); option.value = name; if (name === item.model) option.selected = true; model.append(option); }
  model.title = 'Gemini image model used by Image Studio';
  const toggle = el('button', on ? null : 'primary', on ? 'DISABLE' : 'ENABLE');
  toggle.type = 'button';
  toggle.disabled = !on && item.preflight && !item.preflight.ok;
  toggle.addEventListener('click', async () => {
    toggle.disabled = true;
    const response = await fetch(`/api/extensions/${item.id}/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true, model: model.value }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) toast(result.error ?? `Could not toggle ${item.name}.`);
    else { toast(`MU/TH/UR › Image Studio ${result.enabled ? 'enabled' : 'disabled'}${result.enabled ? ` · ${result.model}` : ''}. Image scopes for Gemini, Claude and OpenCode ${result.enabled ? 'can now be switched on' : 'are off'} in CONNECTIONS.`); if (result.capabilities) { state.capabilities = result.capabilities; renderCreateScopes(); } }
    await refreshModules();
  });
  actions.append(toggle, model);
  actions.append(el('span', 'note', item.status?.detail ? item.status.detail.toUpperCase() : ''));
  card.append(actions);
  return card;
}

function moduleCard(item) {
  if (item.kind === 'builtin') return builtinCard(item);
  const card = el('article', 'module-card');
  card.id = `module-${item.id}`;
  const head = el('div', 'head');
  const title = el('div');
  title.append(el('h4', null, item.name));
  title.append(el('div', 'vendor', `${item.vendor} · ${item.package}@${item.version}`));
  head.append(title);
  const running = modules.installing === item.id;
  const stateTag = el('span', `state${item.status?.installed ? ' installed' : ''}${running ? ' running' : ''}`,
    running ? 'INSTALLING' : item.status?.installed ? 'INSTALLED' : 'NOT IN THIS PROJECT');
  head.append(stateTag);
  card.append(head);
  if (item.status?.installed && item.status.detail) card.append(el('div', 'detail', item.status.detail.toUpperCase()));
  card.append(el('p', null, item.summary));
  const creates = el('ul');
  for (const line of item.creates ?? []) creates.append(el('li', null, line));
  card.append(creates);

  const actions = el('div', 'actions');
  const blocked = item.preflight && !item.preflight.ok;
  if (blocked) {
    const warn = el('div', 'confirm');
    warn.append(el('span', 'warn', 'CANNOT INSTALL HERE YET'));
    for (const problem of item.preflight.problems) warn.append(el('p', null, problem));
    card.append(warn);
  }
  if (modules.confirming === item.id && !blocked) {
    const confirm = el('div', 'confirm');
    confirm.append(el('span', 'warn', 'THIS WRITES INTO THE PROJECT. MADRE WILL RUN, IN THE PROJECT FOLDER:'));
    confirm.append(commandBlock([item.install.display]));
    confirm.append(el('span', 'note', item.install.platforms?.length
      ? `IDE adapters for the agents detected here: ${item.install.platforms.join(', ')}.`
      : 'No detected agent has an adapter for this module; it installs without IDE adapters.'));
    const row = el('div', 'actions');
    const go = el('button', 'primary', 'CONFIRM INSTALL');
    go.type = 'button';
    go.addEventListener('click', async () => {
      go.disabled = true;
      const response = await fetch(`/api/extensions/${item.id}/install`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) toast(result.error ?? `Install request failed (${response.status}).`);
      modules.confirming = null;
      modules.installing = response.ok ? item.id : modules.installing;
      modules.logs.set(item.id, []);
      renderModules();
    });
    const cancel = el('button', null, 'CANCEL');
    cancel.type = 'button';
    cancel.addEventListener('click', () => { modules.confirming = null; renderModules(); });
    row.append(go, cancel);
    confirm.append(row);
    card.append(confirm);
  } else {
    const install = el('button', item.status?.installed ? null : 'primary', item.status?.installed ? 'REINSTALL / UPGRADE' : 'INSTALL');
    install.type = 'button';
    install.disabled = Boolean(modules.installing) || blocked;
    install.addEventListener('click', () => { modules.confirming = item.id; renderModules(); });
    actions.append(install);
    if (modules.installing && modules.installing !== item.id) actions.append(el('span', 'note', 'ANOTHER INSTALL IS RUNNING'));
    card.append(actions);
  }
  const log = modules.logs.get(item.id) ?? [];
  if (log.length || running) {
    const box = el('div', 'module-log');
    box.id = `module-log-${item.id}`;
    for (const line of log) box.append(el('div', /error|failed|ERR/i.test(line) ? 'err' : null, line));
    card.append(box);
    queueMicrotask(() => { box.scrollTop = box.scrollHeight; });
  }
  return card;
}

function renderModules() {
  modules.list.replaceChildren();
  modules.list.append(el('h3', null, `AVAILABLE · ${modules.items.length} · PROJECT /${els.project.textContent}`));
  const grid = el('div', 'mother-grid');
  for (const item of modules.items) grid.append(moduleCard(item));
  modules.list.append(grid);
  renderModulesDev();
}

// The developer's card: where your modules live, what failed to load, and the SDK.
function renderModulesDev() {
  const section = document.querySelector('#modules-dev');
  if (!section) return;
  section.replaceChildren();
  section.append(el('h3', null, 'DEVELOP FOR MADRE'));
  const card = el('article', 'module-card dev-card');
  const glyph = el('div', 'dev-glyph', '</>');
  const body = el('div', 'dev-body');
  body.append(el('h4', null, 'Would you like to develop for MADRE?'));
  body.append(el('p', null, 'Use our SDK to build your own modules: one file, no build, no dependencies. A switch, settings, slash commands, tools for the agents, routes. Write it by hand or with an AI, drop it in a folder, reload.'));
  const where = el('div', 'dev-where');
  const folders = modules.folders ?? {};
  where.append(el('code', null, folders.user ? `${folders.user}/` : '~/.pulse/modules/'), el('span', 'note', ' every project · '), el('code', null, folders.project ? `${folders.project}/` : '<project>/.madre/modules/'), el('span', 'note', ' this project'));
  body.append(where);
  const row = el('div', 'dev-row');
  const read = el('a', 'mother-close', 'READ THE SDK ↗'); read.href = modules.sdk ?? 'https://github.com/jossuealcacao-exe/madre/blob/main/docs/SDK.md'; read.target = '_blank'; read.rel = 'noopener noreferrer';
  const reload = el('button', 'mother-close', 'RELOAD MODULES'); reload.type = 'button'; reload.title = 'Load your module files again without restarting the room';
  reload.addEventListener('click', async () => {
    reload.disabled = true;
    try {
      const payload = await fetch('/api/extensions/reload', { method: 'POST' }).then((response) => response.json());
      modules.items = payload.extensions ?? modules.items; modules.failures = payload.failures ?? [];
      toast(`MU/TH/UR › modules reloaded: ${payload.loaded.length} of yours${payload.failures.length ? `, ${payload.failures.length} failed to load` : ''}.`);
      renderModules();
    } catch (error) { toast(`Reload failed: ${error.message}`); } finally { reload.disabled = false; }
  });
  row.append(read, reload);
  body.append(row);
  const yours = modules.items.filter((item) => item.external);
  if (yours.length) {
    const list = el('div', 'dev-yours');
    list.append(el('span', 'note', 'YOURS · '));
    for (const item of yours) {
      const chip = el('span', 'dev-chip');
      chip.append(el('b', null, item.name), ` · ${item.origin === 'project' ? 'this project' : 'every room'} `);
      const remove = el('button', 'act-link', 'REMOVE'); remove.type = 'button'; remove.title = `Delete ${item.file}`;
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Remove ${item.name}? Its file ${item.file} is deleted. MADRE's own modules cannot be removed.`)) return;
        remove.disabled = true;
        try {
          const payload = await fetch(`/api/extensions/${item.id}`, { method: 'DELETE' }).then((response) => response.json());
          if (payload.error) throw new Error(payload.error);
          modules.items = payload.extensions ?? modules.items; toast(`MU/TH/UR › ${item.name} removed.`); renderModules();
        } catch (error) { toast(`Not removed: ${error.message}`); remove.disabled = false; }
      });
      chip.append(remove);
      list.append(chip);
    }
    body.append(list);
  }
  for (const failure of modules.failures ?? []) {
    const line = el('p', 'note dev-fail');
    line.append(el('b', null, 'DID NOT LOAD · '), el('code', null, failure.file.split('/').slice(-2).join('/')), ` · ${failure.error}`);
    body.append(line);
  }
  card.append(glyph, body);
  section.append(card);
}

modules.button.addEventListener('click', async () => {
  if (modules.dialog.open) return;
  modules.dialog.showModal();
  await refreshModules();
  renderModules();
});
modules.close.addEventListener('click', () => modules.dialog.close());
void refreshModules();

/* ---------- agent spheres: click to expand session usage ---------- */

const pop = document.querySelector('#agent-pop');
function statsFor(id) {
  if (!state.agentStats.has(id)) state.agentStats.set(id, { turns: 0, lastTurnMs: null, lastTurnTokens: null, cost: 0, started: new Map() });
  return state.agentStats.get(id);
}
function trackStats(event) {
  if (event.type === 'agent.started') {
    statsFor(event.payload.agent).started.set(event.payload.messageId, new Date(event.timestamp).getTime());
  } else if (event.type === 'agent.completed' || event.type === 'message.failed') {
    const stats = statsFor(event.payload.agent ?? event.payload.target);
    const t0 = stats.started.get(event.payload.messageId);
    if (t0) { stats.lastTurnMs = new Date(event.timestamp).getTime() - t0; stats.started.delete(event.payload.messageId); }
    stats.turns += 1;
  } else if (event.type === 'usage.recorded') {
    const stats = statsFor(event.payload.agent);
    stats.lastTurnTokens = event.payload.usage?.totalTokens ?? null;
    if (Number.isFinite(event.payload.usage?.costUsd)) stats.cost += event.payload.usage.costUsd;
  }
}

function fmtMs(ms) { return ms === null ? '—' : ms < 1000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`; }

const CAP_LABELS = { read: 'read', imageIn: 'image in', write: 'create', imageGen: 'image gen', web: 'web' };
function capabilityBadges(id) {
  const caps = state.capabilities[id] ?? {};
  const wrap = el('div', 'caps');
  wrap.style.marginTop = '10px';
  for (const [key, labelText] of Object.entries(CAP_LABELS)) {
    const badge = el('span', `cap${caps[key] ? ' on' : ''}`, labelText);
    const detail = caps.detail?.[key];
    badge.title = caps[key] ? `${labelText}: ${detail?.how ?? 'available'}${detail?.note ? ` · ${detail.note}` : ''}` : `${labelText}: not available from this CLI`;
    wrap.append(badge);
  }
  return wrap;
}

function openAgentPop(id, anchor) {
  const agent = state.agents.get(id);
  if (!agent) return;
  const stats = statsFor(id);
  const session = state.sessions?.[id];
  const percent = localPercent(agent);
  const official = liveOfficial(agent);
  const shown = ringPercent(agent);
  paint(pop, id);
  pop.replaceChildren();
  const head = el('div', 'head');
  head.append(avatar(id, { size: 24 }));
  head.append(el('b', null, agent.label));
  head.append(el('span', 'vendor', brandOf(id).vendor));
  pop.append(head);
  const big = el('div', 'big', official === null ? (formatTokens(agent.tokens ?? 0) || '0') : `${Math.round(official)}%`);
  big.append(el('small', null, official === null ? 'budget tokens · local 5h window' : `of the provider's ${fmtWindow(agent.officialWindows?.primary?.windowMinutes ?? 300)} limit${agent.officialResetAt ? ` · resets ${fmtReset(agent.officialResetAt)}` : ' · window reset'}`));
  pop.append(big);
  const gauge = el('div', `gauge${shown >= 80 ? ' hot' : ''}`);
  const fill = el('i'); fill.style.width = `${shown}%`; gauge.append(fill);
  pop.append(gauge);
  const dl = el('dl');
  const row = (k, v, cls) => { dl.append(el('dt', null, k)); dl.append(el('dd', cls, v)); };
  if (agent.officialWindows) {
    const { primary, secondary } = agent.officialWindows;
    if (primary) row(`${fmtWindow(primary.windowMinutes)} limit`, primary.resetAt ? `${Math.round(primary.usedPercent)}% · resets ${fmtReset(primary.resetAt)}` : `${Math.round(primary.usedPercent)}% · reset, awaiting fresh data`, primary.usedPercent >= 80 ? 'off' : null);
    if (secondary) row(`${fmtWindow(secondary.windowMinutes)} limit`, `${Math.round(secondary.usedPercent)}%${secondary.resetAt ? ` · resets ${fmtReset(secondary.resetAt)}` : ''}`, secondary.usedPercent >= 80 ? 'off' : null);
    if (agent.officialObservedAt) row('reported', `${fmtReset(agent.officialObservedAt)} by ${agent.officialSource?.replace('official:', '') ?? 'the CLI'}`);
  } else if (Number.isFinite(agent.officialPercent)) {
    row('provider limit', `${Math.round(official ?? 0)}% used`);
  } else {
    row('provider limit', 'not published by this CLI · ring shows the local window');
  }
  row('local window', state.budget ? `${Math.round(percent)}% of ${formatTokens(state.budget)} · 5h rolling${agent.rollsOverAt ? ` · oldest turn drops ${fmtReset(agent.rollsOverAt)}` : ''}` : 'unbounded');
  if (agent.rawTokens) row('all-time in room', `${formatTokens(agent.rawTokens)} tok`);
  row('turns', String(stats.turns));
  row('last turn', `${fmtMs(stats.lastTurnMs)}${stats.lastTurnTokens ? ` · ${formatTokens(stats.lastTurnTokens)} tok` : ''}`);
  if (stats.cost > 0) row('cost (reported)', `$${stats.cost.toFixed(2)}`);
  row('session', session ? session.state.replace('-', ' ') : agent.ready ? 'unknown' : 'not ready', session?.state === 'signed-in' ? 'on' : session?.state === 'signed-out' ? 'off' : null);
  if (session?.detail) row('via', session.detail);
  row('timeout', `${Math.round((state.timeouts[id] ?? 180000) / 1000)}s`);
  if (agent.version) row('version', agent.version);
  pop.append(dl);
  pop.append(capabilityBadges(id));
  pop.append(el('div', 'foot', official === null ? 'local window, not the provider\'s bill · ⚙ connections in MU/TH/UR' : 'provider limit as the CLI reports it · ⚙ connections in MU/TH/UR'));
  pop.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = pop.offsetWidth || 260;
  pop.style.top = `${rect.bottom + 10}px`;
  pop.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2))}px`;
  document.querySelectorAll('.agents .avatar.open').forEach((node) => node.classList.remove('open'));
  anchor.classList.add('open');
  pop.dataset.for = id;
}
function closeAgentPop() {
  pop.hidden = true;
  delete pop.dataset.for;
  document.querySelectorAll('.agents .avatar.open').forEach((node) => node.classList.remove('open'));
}
els.agents.addEventListener('click', (event) => {
  const sphere = event.target.closest('.avatar');
  if (!sphere) return;
  const id = sphere.dataset.agent;
  if (pop.dataset.for === id && !pop.hidden) closeAgentPop(); else openAgentPop(id, sphere);
});
document.addEventListener('click', (event) => { if (!pop.hidden && !pop.contains(event.target) && !event.target.closest('.agents')) closeAgentPop(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAgentPop(); });

/* ---------- ⚙ connections & settings inside MU/TH/UR ---------- */

const settingsUI = {
  button: document.querySelector('#mother-settings-button'),
  section: document.querySelector('#mother-settings'),
  data: null,
  open: false,
  loginLogs: new Map(),
};

function renderLoginEvent(event) {
  const { agent, command, session, code, error } = event.payload;
  const finished = event.type === 'connection.login.finished';
  const ok = finished && session?.state === 'signed-in';
  const node = el('div', `system login${finished && !ok ? ' failed' : ''}`);
  node.style.setProperty('--agent', agentColor(agent));
  node.append(el('b', null, 'connections › '));
  node.append(finished
    ? (ok ? `@${agent} signed in${session?.detail ? ` · ${session.detail}` : ''}` : `@${agent} sign-in did not complete${error ? ` · ${error}` : code ? ` · exit ${code}` : ''}`)
    : `signing in @${agent} · ${command}`);
  if (finished) { state.sessions[agent] = session ?? state.sessions[agent]; renderOnboarding(); if (state.settingsOpen) void loadSettings(); }
  state.lastSender = null;
  return node;
}
// connections › installing @codex · npm install -g @openai/codex
function renderAgentInstall(event) {
  const { agent, label, command, code, error, detected, version, where, prefix } = event.payload;
  const finished = event.type === 'connection.install.finished';
  const node = paint(el('div', `system connections${finished && !detected ? ' failed' : ''}`), agent);
  node.append(el('b', null, 'connections › '));
  node.append(finished
    ? (detected ? `${label ?? agent} installed${version ? ` · ${version}` : ''}${where === 'madre' ? ` · in MADRE's own folder (${prefix}), no administrator needed` : ''} · sign in to finish` : `${label ?? agent} was not installed${error ? ` · ${error}` : code ? ` · exit ${code}` : ''}`)
    : `installing ${label ?? agent} · ${command}`);
  if (finished && !replaying) toast(detected ? `MU/TH/UR › ${label ?? agent} is on this computer. Sign in and the room opens.` : `MU/TH/UR › ${label ?? agent} could not be installed. The log is above.`);
  if (finished) { renderOnboarding(); if (state.settingsOpen) void loadSettings(); }
  state.lastSender = null;
  return node;
}

function appendLoginOutput(event) {
  const { agent, line, url } = event.payload;
  const log = state.loginLogs.get(agent) ?? [];
  log.push({ line, url });
  state.loginLogs.set(agent, log.slice(-60));
  for (const id of [`login-log-${agent}`, `bridge-log-${agent}`]) {
    const box = document.getElementById(id);
    if (!box) continue;
    box.hidden = false;
    box.append(loginLine({ line, url }));
    box.scrollTop = box.scrollHeight;
  }
  if (url) toast(`@${agent}: open ${url} to finish signing in`);
}
function loginLine({ line, url }) {
  const div = el('div');
  if (url) {
    const a = el('a', null, line); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    div.append(a);
  } else div.append(line);
  return div;
}

async function loadSettings() {
  settingsUI.data = await fetch('/api/settings').then((response) => response.json());
  state.sessions = settingsUI.data.sessions ?? state.sessions;
  renderSettings();
}

function connectionCard(agent) {
  const card = paint(el('article', 'conn-card'), agent.id);
  const session = settingsUI.data.sessions?.[agent.id];
  const head = el('div', 'head');
  head.append(avatar(agent.id, { size: 26, status: agent.ready ? 'ready' : agent.detected ? 'detected' : 'offline' }));
  const title = el('div');
  title.append(el('h4', null, agent.label));
  title.append(el('div', 'vendor', brandOf(agent.id).vendor));
  head.append(title);
  const busy = settingsUI.data.loggingIn === agent.id;
  const tag = el('span', `session${busy ? ' busy' : session?.state === 'signed-in' ? ' on' : session?.state === 'signed-out' ? ' off' : ''}`,
    busy ? 'SIGNING IN' : !agent.detected ? 'NOT INSTALLED' : session ? session.state.toUpperCase().replace('-', ' ') : 'UNKNOWN');
  head.append(tag);
  card.append(head);
  const meta = el('div', 'meta');
  meta.append(agent.detected ? `${agent.version ?? 'version unknown'} · ${agent.path}` : (agent.login?.install ?? []).join(' · '));
  if (session?.detail) meta.append(el('div', null, `session: ${session.detail}`));
  if (agent.account) meta.append(el('div', 'account', `${agent.paid === false ? 'FREE WAY IN · ' : ''}${agent.account}`));
  card.append(meta);
  const scopes = el('div', 'scopes');
  const agentScopes = settingsUI.data.settings.capabilities?.[agent.id]?.scopes ?? {};
  // Two abilities per agent: images and web. Writing is not an ability, it is the ceiling below.
  for (const [key, labelText] of [['imageGen', 'GENERATE IMAGES'], ['web', 'WEB ACCESS']]) {
    const scope = agentScopes[key] ?? { capable: false, enabled: false, wired: false };
    const line = el('label', `scope${!scope.capable || !scope.wired ? ' unavailable' : ''}`);
    const box = el('input'); box.type = 'checkbox'; box.checked = Boolean(scope.enabled); box.disabled = !scope.capable || !scope.wired;
    box.dataset.agent = agent.id; box.dataset.scope = key; box.className = 'scope-input';
    // Scopes apply the moment they are ticked; no need to find the SAVE button below.
    box.addEventListener('change', async () => {
      box.disabled = true;
      try {
        const response = await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scopes: { [agent.id]: { [key]: box.checked } } }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
        if (result.settings?.capabilities) { state.capabilities = result.settings.capabilities; settingsUI.data.settings.capabilities = result.settings.capabilities; renderCreateScopes(); }
        const why = line.querySelector('.why');
        if (why) why.textContent = box.checked ? (key === 'web' ? 'on for every turn' : 'on for CREATE') : 'off';
        toast(`MU/TH/UR › @${agent.id} ${labelText.toLowerCase()} ${box.checked ? 'on' : 'off'}. ${key === 'web' ? 'Applies to its next turn.' : 'Applies to its next CREATE.'}`);
      } catch (error) {
        box.checked = !box.checked;
        toast(`Scope was not saved: ${error.message}`);
      } finally {
        box.disabled = false;
      }
    });
    line.append(box, labelText);
    line.append(el('span', 'why', !scope.capable ? 'not available from this CLI' : !scope.wired ? 'not wired yet' : scope.enabled ? (key === 'web' ? 'on for every turn' : 'on for CREATE') : 'off'));
    line.title = !scope.capable ? `${agent.label}'s CLI has no way to do this; MU/TH/UR knows the routes.` : '';
    if (!scope.capable) {
      const assist = el('button', 'assist', 'ask MU/TH/UR');
      assist.type = 'button';
      assist.title = `How could @${agent.id} get "${labelText.toLowerCase()}"?`;
      assist.addEventListener('click', (event) => { event.preventDefault(); askMotherAbout(`scope-${agent.id}-${key}`); });
      line.append(assist);
    }
    scopes.append(line);
  }
  // The ceiling: how far the composer may take this agent.
  const ceiling = el('div', 'ceiling');
  ceiling.append(el('span', 'k', 'MAX MODE'));
  const seg = el('div', 'seg');
  const currentCap = agentScopes.maxMode ?? 1;
  for (const n of [0, 1, 2, 3, 4]) {
    const button = el('button', `seg-option o${n}${currentCap === n ? ' current' : ''}`, `#${n}`);
    button.type = 'button';
    button.title = `${MODES[n].label} · ${MODES[n].hint}`;
    const possible = n <= 1 || agentScopes.write?.capable;
    button.disabled = !possible;
    button.addEventListener('click', async () => {
      if (n === currentCap) return;
      for (const other of seg.children) other.disabled = true;
      try {
        await saveSettingNow({ scopes: { [agent.id]: { maxMode: n } } }, `@${agent.id} is now capped at #${n} ${MODES[n].label}.${n === 3 ? ' CONTROL still needs the override per message.' : ''}`);
        await loadSettings();
      } catch (error) { toast(`Max mode was not saved: ${error.message}`); for (const other of seg.children) other.disabled = false; }
    });
    seg.append(button);
  }
  ceiling.append(seg);
  ceiling.append(el('span', 'why', `${MODES[currentCap].label} · ${MODES[currentCap].hint}`));
  scopes.append(ceiling);
  // The start: where a message to this agent begins. #2 means every turn may create files without arming CREATE.
  const start = el('div', 'ceiling');
  start.append(el('span', 'k', 'DEFAULT MODE'));
  const startSeg = el('div', 'seg');
  const currentStart = agentScopes.defaultMode ?? 1;
  for (const n of [1, 2]) {
    const button = el('button', `seg-option o${n}${currentStart === n ? ' current' : ''}`, `#${n}`);
    button.type = 'button';
    button.title = n === 2 ? 'Every message to this agent starts in CREATE: new files where they belong, existing files untouched. Plan steps to it too.' : 'Messages start read-only; arm CREATE when you want files.';
    button.disabled = n > currentCap;
    button.addEventListener('click', async () => {
      if (n === currentStart) return;
      for (const other of startSeg.children) other.disabled = true;
      try {
        await saveSettingNow({ scopes: { [agent.id]: { defaultMode: n } } }, n === 2 ? `@${agent.id} starts in #2 CREATE: every turn may add files to the project.` : `@${agent.id} starts read-only; arm CREATE when you want files.`);
        await loadSettings();
      } catch (error) { toast(`Default mode was not saved: ${error.message}`); for (const other of startSeg.children) other.disabled = false; }
    });
    startSeg.append(button);
  }
  start.append(startSeg);
  start.append(el('span', 'why', currentStart === 2 ? 'every turn may create files, plan steps too' : 'read-only until you arm CREATE'));
  scopes.append(start);
  card.append(scopes);

  const row = el('div', 'row');
  const recheck = el('button', null, 'RECHECK');
  recheck.type = 'button';
  recheck.addEventListener('click', async () => {
    recheck.disabled = true;
    const result = await fetch('/api/agents/probe', { method: 'POST' }).then((response) => response.json()).catch(() => null);
    if (result?.sessions) { settingsUI.data.sessions = result.sessions; state.sessions = result.sessions; }
    if (result?.agents) { settingsUI.data.agents = result.agents; for (const agent of result.agents) state.agents.set(agent.id, { ...(state.agents.get(agent.id) ?? {}), ...agent }); renderAgents(); renderPicker(); renderOnboarding(); }
    if (result?.sessions) renderSettings();
    recheck.disabled = false;
  });
  row.append(recheck);
  if (!agent.detected && agent.install) {
    const install = el('button', 'primary', 'INSTALL');
    install.type = 'button';
    install.title = `${agent.install.display} · run here, streamed to the room`;
    install.disabled = Boolean(settingsUI.data.loggingIn);
    install.addEventListener('click', async () => {
      install.disabled = true;
      state.loginLogs.set(agent.id, []);
      const response = await fetch(`/api/agents/${agent.id}/install`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { toast(result.error ?? 'Install could not start.'); install.disabled = false; }
    });
    row.append(install);
  }
  if (agent.detected && agent.login) {
    if (agent.login.headless) {
      const login = el('button', 'primary', session?.state === 'signed-in' ? 'SIGN IN AGAIN' : 'SIGN IN');
      login.type = 'button';
      login.disabled = Boolean(settingsUI.data.loggingIn);
      login.title = agent.login.note;
      login.addEventListener('click', async () => {
        login.disabled = true;
        state.loginLogs.set(agent.id, []);
        const response = await fetch(`/api/agents/${agent.id}/login`, { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) toast(result.error ?? 'Sign-in could not start.');
        else { settingsUI.data.loggingIn = agent.id; renderSettings(); }
      });
      row.append(login);
    } else {
      row.append(el('span', 'note', 'signs in from its own prompt:'));
    }
  }
  card.append(row);
  const slot = el('div', 'slot');
  if (agent.detected && agent.key) slot.append(keyForm(agent, { onDone: () => { void loadSettings(); renderOnboarding(); } }));
  if (agent.detected && agent.login && !agent.login.headless) slot.append(commandBlock([agent.login.display, `# ${agent.login.note}`]));
  card.append(slot);

  const timeout = el('label');
  timeout.append(`TIMEOUT · SECONDS`);
  const input = el('input');
  input.type = 'number'; input.min = '10'; input.step = '10';
  input.value = String(Math.round((settingsUI.data.settings.timeouts[agent.id] ?? 180000) / 1000));
  input.dataset.agent = agent.id;
  input.className = 'timeout-input';
  wireInstantNumber(input, { min: 10, toPatch: (seconds) => ({ timeouts: { [agent.id]: seconds * 1000 } }), describe: (seconds) => `@${agent.id} timeout saved: ${seconds}s.` });
  timeout.append(input);
  card.append(timeout);

  const log = state.loginLogs.get(agent.id) ?? [];
  if (log.length || busy) {
    const box = el('div', 'login-log');
    box.id = `login-log-${agent.id}`;
    for (const entry of log) box.append(loginLine(entry));
    slot.append(box);
  }
  return card;
}

function renderSettings() {
  const { data } = settingsUI;
  if (!data) return;
  const section = settingsUI.section;
  section.replaceChildren();
  section.append(el('h3', null, `CONNECTIONS · ${Object.values(data.sessions ?? {}).filter((s) => s.state === 'signed-in').length} OF ${data.agents.length} SIGNED IN${data.sessionsAt ? ` · CHECKED ${formatTime(data.sessionsAt)}` : ''}`));
  section.append(el('p', 'note', 'EACH AGENT KEEPS ITS OWN CREDENTIALS IN ITS OWN CLI. MADRE ONLY ASKS THE CLI WHETHER IT IS SIGNED IN, AND CAN START THE CLI\'S OWN SIGN-IN FOR YOU.'));
  const grid = el('div', 'conn-grid');
  for (const agent of data.agents) grid.append(connectionCard(agent));
  section.append(grid);

  section.append(el('h3', null, 'ROOM SETTINGS'));
  const form = el('form', 'room-form');
  const field = (labelText, node) => { const label = el('label'); label.append(labelText); label.append(node); return label; };
  const num = (name, value, min, step) => { const input = el('input'); input.type = 'number'; input.name = name; input.value = String(value); input.min = String(min); input.step = String(step); return input; };
  const budget = num('softTokenBudget', data.settings.softTokenBudget, 10000, 10000);
  const steps = num('maxPlanSteps', data.settings.maxPlanSteps, 1, 1);
  const defaultTimeout = num('defaultTimeout', Math.round(data.settings.defaultTimeout / 1000), 10, 10);
  wireInstantNumber(budget, { min: 10000, toPatch: (value) => ({ room: { softTokenBudget: value } }), describe: (value) => `local budget saved: ${formatTokens(value)} tokens per agent per 5h window.` });
  wireInstantNumber(defaultTimeout, { min: 10, toPatch: (seconds) => ({ timeouts: { default: seconds * 1000 } }), describe: (seconds) => `default timeout saved: ${seconds}s.` });
  const idle = num('geminiIdle', Math.round(data.settings.geminiIdleMs / 1000), 10, 10);
  const retries = num('geminiRetries', data.settings.geminiRetries, 0, 1);
  const model = el('input'); model.name = 'opencodeModel'; model.value = data.settings.opencodeModel ?? ''; model.placeholder = 'provider/model'; model.setAttribute('list', 'opencode-models');
  const datalist = el('datalist'); datalist.id = 'opencode-models';
  form.append(field('LOCAL TOKEN BUDGET PER AGENT', budget));
  form.append(field('DEFAULT TIMEOUT · SECONDS', defaultTimeout));
  form.append(field('MAX PLAN STEPS', steps));
  form.append(field('GEMINI SILENCE LIMIT · SECONDS', idle));
  form.append(field('GEMINI RETRIES', retries));
  const modelLabel = field('OPENCODE MODEL IN THIS ROOM', model);
  modelLabel.append(datalist);
  form.append(modelLabel);
  const full = el('div', 'full');
  const toggle = el('label', 'toggle');
  const delegation = el('input'); delegation.type = 'checkbox'; delegation.name = 'delegation'; delegation.checked = data.settings.delegation;
  toggle.append(delegation, 'AGENTS MAY DELEGATE TURNS TO EACH OTHER');
  full.append(toggle);
  const loadModels = el('button', null, 'LIST OPENCODE MODELS');
  loadModels.type = 'button';
  loadModels.addEventListener('click', async () => {
    loadModels.disabled = true;
    const result = await fetch('/api/agents/opencode/models').then((response) => response.json()).catch(() => ({ models: [] }));
    datalist.replaceChildren();
    for (const name of result.models ?? []) { const option = el('option'); option.value = name; datalist.append(option); }
    loadModels.textContent = `${(result.models ?? []).length} MODELS LISTED`;
  });
  full.append(loadModels);
  const save = el('button', 'primary', 'SAVE TO ~/.pulse/config.json');
  save.type = 'submit';
  full.append(save);
  full.append(el('span', 'note', 'ENVIRONMENT VARIABLES SET BEFORE START STILL WIN ON THE NEXT LAUNCH.'));
  form.append(full);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.disabled = true;
    const timeouts = { default: Number(defaultTimeout.value) * 1000 };
    for (const input of section.querySelectorAll('.timeout-input')) {
      const seconds = Number(input.value);
      if (seconds > 0 && seconds * 1000 !== timeouts.default) timeouts[input.dataset.agent] = seconds * 1000;
      else timeouts[input.dataset.agent] = 0;
    }
    const scopePatch = {};
    for (const input of section.querySelectorAll('.scope-input')) {
      if (input.disabled) continue;
      scopePatch[input.dataset.agent] ??= {};
      scopePatch[input.dataset.agent][input.dataset.scope] = input.checked;
    }
    const payload = {
      opencode: { model: model.value.trim() },
      scopes: scopePatch,
      timeouts,
      room: { delegation: delegation.checked, maxPlanSteps: Number(steps.value), softTokenBudget: Number(budget.value) },
      gemini: { idleMs: Number(idle.value) * 1000, retries: Number(retries.value) },
    };
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      state.timeouts = result.settings.timeouts;
      state.budget = result.settings.softTokenBudget;
      if (result.settings.capabilities) { state.capabilities = result.settings.capabilities; renderCreateScopes(); }
      toast('MU/TH/UR › settings saved. new turns use them now.');
      await loadSettings();
    } else toast(result.error ?? 'Settings were not saved.');
    save.disabled = false;
  });
  section.append(form);

  // MEMORY: who distils, with whom, how often, where it embeds, how much recall a turn gets. Saves as you change it.
  const mem = data.settings.memory;
  if (mem) {
    section.append(el('h3', null, `MEMORY · ${mem.stats ? `${mem.stats.entries} EXCHANGES · ${mem.stats.memories} MEMORIES · ${mem.stats.pending} WAITING` : 'NO INDEX'}`));
    section.append(el('p', 'note', 'THE ARCHIVIST READS WHAT NOBODY HAS DISTILLED AND KEEPS THE FEW NOTES WORTH REMEMBERING. THE CHEAPEST ALLOWED AGENT GOES FIRST; A LOCAL MODEL COSTS NOTHING AND KEEPS EVERYTHING ON THIS MACHINE.'));
    const mform = el('form', 'room-form memory-form');
    const save = async (memoryPatch, describe) => { try { await saveSettingNow({ memory: memoryPatch }, describe); await loadSettings(); } catch (error) { toast(`Memory setting was not saved: ${error.message}`); } };
    const field = (labelText, node) => { const label = el('label'); label.append(labelText); label.append(node); return label; };
    const archivist = el('select');
    for (const [value, text] of [['auto', 'AUTO · cheapest allowed'], ...mem.candidates.map((c) => [c.id, `@${c.id}${c.local ? ` · ${c.label}` : ''}`])]) { const option = el('option', null, text); option.value = value; if (value === mem.archivist) option.selected = true; archivist.append(option); }
    archivist.addEventListener('change', () => save({ archivist: archivist.value }, archivist.value === 'auto' ? 'archivist: the cheapest allowed agent goes first.' : `archivist: @${archivist.value} distils first.`));
    mform.append(field('ARCHIVIST', archivist));
    const every = el('input'); every.type = 'number'; every.min = '1'; every.step = '1'; every.value = String(mem.every);
    wireInstantNumber(every, { min: 1, toPatch: (value) => ({ memory: { every: value } }), describe: (value) => `distil every ${value} exchange${value === 1 ? '' : 's'}.` });
    mform.append(field('DISTIL EVERY · EXCHANGES', every));
    const idle = el('input'); idle.type = 'number'; idle.min = '1'; idle.step = '1'; idle.value = String(mem.idleMinutes);
    wireInstantNumber(idle, { min: 1, toPatch: (value) => ({ memory: { idleMinutes: value } }), describe: (value) => `or after ${value} quiet minute${value === 1 ? '' : 's'}.` });
    mform.append(field('OR AFTER · QUIET MINUTES', idle));
    const share = el('input'); share.type = 'number'; share.min = '0'; share.max = '60'; share.step = '5'; share.value = String(Math.round(mem.recallShare * 100));
    wireInstantNumber(share, { min: 0, toPatch: (value) => ({ memory: { recallShare: Math.min(60, value) / 100 } }), describe: (value) => `recall may take ${Math.min(60, value)}% of each turn's context.` });
    mform.append(field('RECALL · % OF CONTEXT', share));
    const embed = el('select');
    const embedOptions = [['auto', 'AUTO · Ollama if running, else Gemini'], ['ollama', `OLLAMA · local${mem.ollama.embedModel ? ` · ${mem.ollama.embedModel}` : ' · no model yet'}`], ['gemini', 'GEMINI · needs your key'], ['off', 'OFF · words only']];
    for (const [value, text] of embedOptions) { const option = el('option', null, text); option.value = value; if (value === (mem.embedProvider ?? data.config?.memory?.embedProvider ?? 'auto')) option.selected = true; embed.append(option); }
    embed.addEventListener('change', () => save({ embedProvider: embed.value }, `embeddings: ${embed.options[embed.selectedIndex].textContent.toLowerCase()}.`));
    const embedLabel = field(`EMBEDDINGS · NOW ${mem.embedder ? mem.embedder.toUpperCase() : 'OFF'}`, embed);
    mform.append(embedLabel);
    const who = el('div', 'full');
    who.append(el('span', 'note', 'MAY DISTIL:'));
    const allowed = new Set(mem.archivists ?? mem.candidates.map((c) => c.id));
    for (const candidate of mem.candidates) {
      const toggle = el('label', 'toggle');
      const box = el('input'); box.type = 'checkbox'; box.checked = allowed.has(candidate.id);
      box.addEventListener('change', () => {
        if (box.checked) allowed.add(candidate.id); else allowed.delete(candidate.id);
        if (!allowed.size) { box.checked = true; allowed.add(candidate.id); toast('MU/TH/UR › someone has to keep the archive.'); return; }
        void save({ archivists: allowed.size === mem.candidates.length ? [] : [...allowed] }, `archivists: ${[...allowed].map((id) => `@${id}`).join(', ')}.`);
      });
      toggle.append(box, `@${candidate.id.toUpperCase()}${candidate.local ? ' · LOCAL · FREE' : ''}`);
      who.append(toggle);
    }
    mform.append(who);
    // The dataset behind MADRE AI: export what the room kept, train outside, @madre picks the result up.
    const dataset = el('div', 'full dataset-row');
    const exportButton = el('button', null, 'EXPORT DATASET');
    exportButton.type = 'button';
    exportButton.title = 'Write train.jsonl and valid.jsonl next to the ledger, redacted, in chat format for mlx-lm';
    const datasetNote = el('span', 'note', 'LOADING…');
    const showDataset = (payload) => {
      const d = payload?.dataset;
      const r = payload?.readiness;
      const live = r ? `${r.pairs} / ${r.target} CLEAN PAIRS${r.ready ? ' · READY TO TRAIN' : ''} · ${r.turns} TURNS · ${r.delegated} DELEGATED · ${r.notes} NOTES${r.good ? ` · ${r.good} RATED GOOD` : ''}${r.bad ? ` · ${r.bad} DROPPED AS BAD` : ''}` : '';
      const exported = d ? `LAST EXPORT ${new Date(d.exportedAt).toLocaleString()} · TRAIN ${d.train} · VALID ${d.valid}` : 'NOT EXPORTED YET';
      const trained = payload?.trained ? `TRAINED MODEL ${payload.trained.toUpperCase()} IN USE` : 'NO TRAINED MODEL YET · SEE docs/training';
      datasetNote.textContent = [live, exported, trained].filter(Boolean).join(' · ');
    };
    fetch('/api/dataset').then((response) => response.json()).then(showDataset).catch(() => { datasetNote.textContent = 'DATASET UNAVAILABLE'; });
    exportButton.addEventListener('click', async () => {
      exportButton.disabled = true;
      try { const payload = await fetch('/api/dataset', { method: 'POST' }).then((response) => response.json()); showDataset(payload); toast(`MU/TH/UR › dataset exported: ${payload.dataset.pairs} pairs in ${payload.dir}`); }
      catch (error) { toast(`Dataset export failed: ${error.message}`); }
      finally { exportButton.disabled = false; }
    });
    dataset.append(exportButton, datasetNote);
    mform.append(dataset);
    // TRAIN: the recipe, with this room's paths and this project's model name filled in. Training runs outside MADRE.
    const train = el('div', 'full train-card');
    const trainHead = el('div', 'train-head', 'TRAIN MADRE AI · LOCAL, WITH MLX ON APPLE SILICON · NOTHING LEAVES THIS MACHINE');
    const trainNote = el('p', 'note', 'EXPORT THE DATASET FIRST. EACH STEP IS ONE COMMAND FOR YOUR TERMINAL; COPY, RUN, COME BACK. WHEN THE MODEL EXISTS IN OLLAMA, @MADRE SWITCHES TO IT AT THE NEXT RECHECK AND EVERY AGENT IS TOLD TO ASK IT FIRST.');
    const steps = el('ol', 'train-steps');
    train.append(trainHead, trainNote, steps);
    const renderTraining = (payload) => {
      const t = payload?.training;
      steps.replaceChildren();
      if (!t) { steps.append(el('li', null, 'TRAINING INFO UNAVAILABLE')); return; }
      const quote = (path) => `"${path.replace(/\/$/, '')}"`;
      const items = [
        ['ONCE · A PYTHON ENVIRONMENT WITH MLX-LM', 'python3 -m venv ~/.madre-train && source ~/.madre-train/bin/activate && pip install mlx-lm'],
        [`TRAIN THE LORA · BASE ${t.baseModel} FOR ${t.memoryGb} GB`, `source ~/.madre-train/bin/activate && bash ${quote(`${t.recipeDir}train.sh`)} ${quote(t.roomDir)} ${t.baseModel}`],
        ['FUSE THE ADAPTER INTO THE BASE', `source ~/.madre-train/bin/activate && cd ${quote(t.roomDir)} && mlx_lm.fuse --model ${t.baseModel} --adapter-path adapters --save-path fused`],
        [`REGISTER IN OLLAMA AS ${t.modelName}`, `cd ${quote(t.roomDir)} && cp ${quote(`${t.recipeDir}Modelfile`)} . && ollama create ${t.modelName} -f Modelfile`],
      ];
      for (const [label, command] of items) {
        const li = el('li');
        const head = el('div', 'train-step-label', label);
        const row = el('div', 'update-command');
        const code = el('code', null, command);
        const copy = el('button', null, 'COPY'); copy.type = 'button';
        copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(command); copy.textContent = 'COPIED'; setTimeout(() => { copy.textContent = 'COPY'; }, 1400); } catch { toast('MU/TH/UR › select the command and copy it.'); } });
        row.append(code, copy);
        li.append(head, row);
        steps.append(li);
      }
      steps.append(el('li', 'note', `QWEN NEEDS A GGUF BEFORE OLLAMA READS IT: ${quote(`${t.recipeDir}README.md`)} · SECTION 3 HAS THE TWO LINES. THEN ASK @MADRE TEN THINGS THE ROOM DECIDED AND FIVE IT NEVER DISCUSSED BEFORE TRUSTING IT.`));
    };
    fetch('/api/dataset').then((response) => response.json()).then(renderTraining).catch(() => renderTraining(null));
    mform.append(train);
    if (mem.envWins) mform.append(el('span', 'note full', 'ENVIRONMENT VARIABLES ARE SET FOR MEMORY; THEY WIN OVER THESE VALUES ON THE NEXT LAUNCH.'));
    mform.addEventListener('submit', (event) => event.preventDefault());
    section.append(mform);
  }

  // PRIVACY: terms that never travel through the room. Replaced at every hop: agent replies,
  // the index, the notes, the dataset. PURGE does the same to what the room already holds.
  const priv = data.settings.privacy;
  if (priv) {
    section.append(el('h3', null, `PRIVACY · ${priv.terms.length ? `${priv.terms.length} PRIVATE TERM${priv.terms.length === 1 ? '' : 'S'}` : 'NO PRIVATE TERMS'}`));
    section.append(el('p', 'note', 'AN AGENT\'S OWN CONFIGURATION CAN LEAK INTO ITS REPLY: A COMPANY, A BRAND, A DOMAIN. NAME THEM HERE AND MADRE REPLACES THEM BEFORE THE LEDGER, THE ARCHIVIST, THE OTHER AGENTS OR THE DATASET SEE THEM. THE TERMS STAY IN CONFIG.JSON; THE ROOM ONLY EVER RECORDS HOW MANY.'));
    const pform = el('form', 'room-form privacy-form');
    const field = (labelText, node) => { const label = el('label'); label.append(labelText); label.append(node); return label; };
    const terms = el('textarea'); terms.rows = 3; terms.value = priv.terms.join('\n'); terms.placeholder = 'one term per line · a company, a brand, a domain, a name'; terms.spellcheck = false;
    const marker = el('input'); marker.value = priv.marker; marker.maxLength = 40; marker.spellcheck = false;
    const exposure = el('span', 'note full', 'CHECKING THE ROOM…');
    const purge = el('button', null, 'PURGE ROOM');
    purge.type = 'button';
    purge.title = 'Replace every private term already in the ledger, the index and the memories with the marker. Asks for the project designation.';
    const showExposure = (payload) => {
      const x = payload?.exposure;
      if (!x) { exposure.textContent = ''; return; }
      const total = x.events + x.entries + x.memories;
      exposure.textContent = !payload.terms?.length ? 'WRITE THE TERMS FIRST.' : total ? `STILL IN THE ROOM: ${x.events} EVENT${x.events === 1 ? '' : 'S'} · ${x.entries} INDEXED EXCHANGE${x.entries === 1 ? '' : 'S'} · ${x.memories} MEMOR${x.memories === 1 ? 'Y' : 'IES'} · PURGE REPLACES THEM.` : 'THE ROOM IS CLEAN: NO PRIVATE TERM IN THE LEDGER, THE INDEX OR THE MEMORIES.';
      purge.disabled = !payload.terms?.length || !total;
    };
    const savePrivacy = async (patch, describe) => {
      try {
        const payload = await fetch('/api/privacy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).then((response) => response.json());
        if (payload.error) throw new Error(payload.error);
        terms.value = payload.terms.join('\n'); marker.value = payload.marker; showExposure(payload);
        toast(`MU/TH/UR › ${describe(payload)}`);
      } catch (error) { toast(`Privacy setting was not saved: ${error.message}`); }
    };
    terms.addEventListener('change', () => savePrivacy({ terms: terms.value.split('\n') }, (payload) => `${payload.terms.length} private term${payload.terms.length === 1 ? '' : 's'} guarded from now on.`));
    marker.addEventListener('change', () => savePrivacy({ marker: marker.value }, (payload) => `private terms appear as ${payload.marker}.`));
    pform.append(field('PRIVATE TERMS · ONE PER LINE', terms));
    pform.append(field('REPLACED WITH', marker));
    const row = el('div', 'full dataset-row');
    purge.addEventListener('click', async () => {
      const designation = window.prompt('PURGE ROOM · Every private term already recorded becomes the marker, in the ledger, the index and the memories. This cannot be undone. Type the project designation to confirm:');
      if (designation === null) return;
      purge.disabled = true;
      try {
        const payload = await fetch('/api/privacy/purge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation }) }).then((response) => response.json());
        if (payload.error) throw new Error(payload.error);
        toast(`MU/TH/UR › purged: ${payload.purged.events} events · ${payload.purged.entries} exchanges · ${payload.purged.memories} memories. Reloading.`);
        setTimeout(() => location.reload(), 1600);
      } catch (error) { toast(`Purge did not run: ${error.message}`); purge.disabled = false; }
    });
    row.append(purge, exposure);
    pform.append(row);
    if (priv.envWins) pform.append(el('span', 'note full', 'PULSE_PRIVATE_TERMS IS SET; THOSE TERMS ARE ADDED TO THIS LIST ON EVERY LAUNCH.'));
    pform.addEventListener('submit', (event) => event.preventDefault());
    section.append(pform);
    fetch('/api/privacy').then((response) => response.json()).then(showExposure).catch(() => { exposure.textContent = 'EXPOSURE CHECK UNAVAILABLE'; });
  }
}

// Save one setting the moment it changes, the way the scope boxes do; the
// SAVE button below stays for the fields that are not wired this way.
async function saveSettingNow(patch, confirmation) {
  const response = await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  if (result.settings) {
    state.timeouts = result.settings.timeouts ?? state.timeouts;
    if (Number.isFinite(result.settings.softTokenBudget)) state.budget = result.settings.softTokenBudget;
    if (result.settings.capabilities) { state.capabilities = result.settings.capabilities; renderCreateScopes(); }
    if (settingsUI.data) settingsUI.data.settings = { ...settingsUI.data.settings, ...result.settings };
  }
  if (confirmation) toast(`MU/TH/UR › ${confirmation} Applies to the next turn.`);
  return result.settings ?? null;
}
// Number inputs commit on change (blur or Enter); revert and explain on failure.
function wireInstantNumber(input, { toPatch, describe, min = 1 }) {
  let last = input.value;
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
  input.addEventListener('change', async () => {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < min) { input.value = last; toast(`MU/TH/UR › that value is not valid (minimum ${min}).`); return; }
    input.disabled = true;
    try { await saveSettingNow(toPatch(value), describe(value)); last = input.value; }
    catch (error) { input.value = last; toast(`Setting was not saved: ${error.message}`); }
    finally { input.disabled = false; }
  });
}
const nextTimeoutSeconds = (currentMs) => { const current = Math.round((currentMs ?? 180000) / 1000); return [300, 600, 900, 1200].find((step) => step > current) ?? current + 300; };
// MU/TH/UR acts, not just advises: buttons that apply the fix through /api/settings.
function conditionActions(condition, agent) {
  const actions = [];
  if (condition.id === 'timeout') {
    if (agent && state.agents.has(agent)) {
      const seconds = nextTimeoutSeconds(state.timeouts[agent]);
      actions.push({ label: `RAISE @${agent.toUpperCase()} TIMEOUT TO ${seconds}s`, patch: { timeouts: { [agent]: seconds * 1000 } }, done: `@${agent} timeout is now ${seconds}s.` });
    }
    const defaultMs = Math.min(...Object.values(state.timeouts ?? {}).filter(Number.isFinite), 180000);
    const seconds = nextTimeoutSeconds(defaultMs);
    actions.push({ label: `RAISE DEFAULT TIMEOUT TO ${seconds}s`, patch: { timeouts: { default: seconds * 1000 } }, done: `default timeout is now ${seconds}s for every agent without its own.` });
  }
  if (condition.id === 'budget-exhausted') {
    const budget = Math.max(1000000, (state.budget ?? 500000) * 2);
    actions.push({ label: `RAISE LOCAL BUDGET TO ${formatTokens(budget)}`, patch: { room: { softTokenBudget: budget } }, done: `local budget is now ${formatTokens(budget)} tokens per agent per 5h window.` });
  }
  return actions;
}

function askMotherAbout(conditionId) {
  // Leave the settings view and put the matching MU/TH/UR card front and centre.
  if (settingsUI.open) settingsUI.button.click();
  mother.input.value = conditionId;
  answerQuery(conditionId);
  setTimeout(() => document.getElementById(`mother-${conditionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}


/* ---------- NOSTROMO: memory research. The archive as a solar system: the room is a red sun, every distilled memory a smoking planet, plasma between them. ---------- */

// Memories burn as stars burn, and a star's colour is its class. A decision is a yellow dwarf,
// the steady kind a system is built around. A fact is a white dwarf: cold, dense, settled. A
// preference is a red dwarf, dim and personal and very long lived. A question is a blue dwarf,
// the hottest thing in the sky and the least settled.
const MEMORY_COLORS = { decision: '#ffdc3c', fact: '#dfeeff', preference: '#fa4632', question: '#3dc6ff' };
const nostromo = {
  button: document.querySelector('#nostromo-button'),
  dialog: document.querySelector('#nostromo'),
  canvas: document.querySelector('#nostromo-canvas'),
  sub: document.querySelector('#nostromo-sub'),
  empty: document.querySelector('#nostromo-empty'),
  card: document.querySelector('#nostromo-card'),
  gate: {
    dialog: document.querySelector('#nostromo-gate'),
    form: document.querySelector('#nostromo-gate-form'),
    input: document.querySelector('#nostromo-gate-input'),
    reply: document.querySelector('#nostromo-gate-reply'),
    frame: document.querySelector('#nostromo-gate .override-frame'),
    cancel: document.querySelector('#nostromo-gate-cancel'),
  },
  armed: false,          // the designation was typed once this page
  nodes: [],
  links: [],
  selected: null,
  hover: null,
  raf: null,
  last: 0,
  focusId: null,       // a memory to open the card on, when boarding from a bubble hint
  size: { w: 0, h: 0, dpr: 1 },
  reduced: typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

function nostromoDesignation() { return (state.projectRoot ?? '').split('/').filter(Boolean).pop() ?? ''; }

nostromo.button?.addEventListener('click', () => {
  if (nostromo.armed) { void openNostromo(); return; }
  if (!nostromo.gate.dialog) return;
  nostromo.gate.reply.textContent = '';
  nostromo.gate.reply.className = 'mother-answer override-reply';
  nostromo.gate.input.value = '';
  nostromo.gate.dialog.showModal();
  nostromo.gate.input.focus();
});
nostromo.gate.cancel?.addEventListener('click', () => nostromo.gate.dialog.close());
nostromo.gate.form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const typed = nostromo.gate.input.value.trim();
  if (!typed || typed.toLowerCase() !== nostromoDesignation().toLowerCase()) {
    nostromo.gate.reply.textContent = 'UNABLE TO COMPUTE. UNABLE TO CLARIFY.';
    nostromo.gate.reply.className = 'mother-answer override-reply denied';
    nostromo.gate.frame.classList.remove('shake'); void nostromo.gate.frame.offsetWidth; nostromo.gate.frame.classList.add('shake');
    nostromo.gate.input.select();
    return;
  }
  nostromo.gate.reply.textContent = 'DESIGNATION ACCEPTED. BOARDING NOSTROMO.';
  nostromo.gate.reply.className = 'mother-answer override-reply granted';
  nostromo.armed = true;
  setTimeout(() => { nostromo.gate.dialog.close(); void openNostromo(); }, 700);
});

async function openNostromo() {
  if (!nostromo.dialog) return;
  mother.dialog?.close?.();
  nostromo.dialog.showModal();
  nostromo.sub.textContent = 'MEMORY RESEARCH · LOADING…';
  nostromo.card.hidden = true;
  nostromo.selected = null;
  nostromo.cage = null;
  const status = await fetch('/api/mother').then((response) => response.json()).catch(() => null);
  nostromo.altered = Boolean(status?.mother?.altered);
  nostromo.maxStrikes = status?.strikes ?? 8;
  let data;
  try {
    const response = await fetch(`/api/memory?designation=${encodeURIComponent(nostromoDesignation())}`);
    data = await response.json();
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  } catch (error) {
    nostromo.sub.textContent = `MEMORY RESEARCH · ${String(error.message).toUpperCase()}`;
    if ((status?.mother?.lockedForMs ?? 0) > 0) { buildNostromo({ memories: [], links: [], stats: {} }); nostromo.sub.textContent = `MEMORY RESEARCH · ${String(error.message).toUpperCase()}`; nostromo.empty.hidden = true; startNostromo(); nostromo.cage = { at: 0, closed: true }; }
    return;
  }
  buildNostromo(data);
  if (nostromo.altered) nostromo.sub.textContent += ' · MOTHER WAS TAMPERED WITH';
  startNostromo();
  if (nostromo.focusId != null) {
    const node = nostromo.nodes.find((item) => item.memory.id === nostromo.focusId);
    nostromo.focusId = null;
    if (node) showNostromoCard(node);
  }
}
document.querySelector('#nostromo-close')?.addEventListener('click', () => nostromo.dialog.close());
nostromo.dialog?.addEventListener('close', stopNostromo);
document.querySelector('#nostromo-card-close')?.addEventListener('click', () => { nostromo.card.hidden = true; nostromo.selected = null; });

// Planets: size follows how much ledger a memory covers; they start in their kind's sector
// and drift toward the memories they agree with, so topics gather on their own.
// How alive a memory is: how often the room has actually recalled it, how recently, and how
// woven it is into the rest.
function rawActivity(memory, degree = 0) {
  const use = 1 - Math.exp(-Number(memory.recalled ?? 0) / 4);
  const since = memory.lastRecalled ? (Date.now() - Date.parse(memory.lastRecalled)) / 86400000 : null;
  const fresh = since === null || Number.isNaN(since) ? 0 : Math.exp(-Math.max(0, since) / 3);
  const woven = Math.min(1, degree / 4);
  return 0.55 * use + 0.3 * fresh + 0.15 * woven;
}

// The constellation is read against itself: the busiest memory is the brightest and the rest
// scale beneath it, so the network has contrast in a young archive and in an old one. Before
// the room has recalled anything, how woven a memory is carries the picture; the moment turns
// start reaching for memories, use takes over. The card always reports the true counts.
function activityOf(raw, top) {
  return top > 0 ? Math.max(0.08, Math.min(1, 0.08 + 0.92 * (raw / top))) : 0.08;
}

function buildNostromo(data) {
  const kinds = Object.keys(MEMORY_COLORS);
  const memories = data.memories ?? [];
  nostromo.links = (data.links ?? []).filter((link) => memories.some((m) => m.id === link.a) && memories.some((m) => m.id === link.b));
  const degree = new Map();
  for (const link of nostromo.links) { degree.set(link.a, (degree.get(link.a) ?? 0) + 1); degree.set(link.b, (degree.get(link.b) ?? 0) + 1); }
  nostromo.pulses = [];
  const raw = memories.map((memory) => rawActivity(memory, degree.get(memory.id) ?? 0));
  const top = raw.reduce((best, value) => (value > best ? value : best), 0);
  nostromo.nodes = memories.map((memory, index) => {
    const sector = kinds.indexOf(memory.kind) < 0 ? 1 : kinds.indexOf(memory.kind);
    const angle = (sector / kinds.length) * Math.PI * 2 + ((index % 7) / 7 - 0.5) * (Math.PI / 2.4) + Math.random() * 0.2;
    const distance = 0.42 + Math.random() * 0.5;
    const span = Math.max(1, (memory.throughSequence ?? 0) - (memory.fromSequence ?? 0));
    return { memory, angle, distance, activity: activityOf(raw[index], top), lit: 0, charge: 0, x: 0, y: 0, vx: 0, vy: 0, r: MEMORY_SCALE * (7 + Math.min(11, Math.log2(span + 1) * 2.2 + memory.sources.length * 0.6)), scale: 1, seed: Math.random() * Math.PI * 2, rate: 0.5 + Math.random() * 0.9, smoke: [], color: MEMORY_COLORS[memory.kind] ?? MEMORY_COLORS.fact, placed: false };
  });
  const stats = data.stats ?? {};
  const alive = memories.filter((memory) => Number(memory.recalled ?? 0) > 0).length;
  nostromo.sub.textContent = `MEMORY RESEARCH · ${memories.length} MEMOR${memories.length === 1 ? 'Y' : 'IES'} · ${alive} RECALLED · ${nostromo.links.length} LINK${nostromo.links.length === 1 ? '' : 'S'} · ${stats.entries ?? 0} EXCHANGES BEHIND THEM${stats.embeddings ? '' : ' · LINKS NEED EMBEDDINGS'}`;
  nostromo.empty.hidden = memories.length > 0;
}

// World space: MOTHER's core sits at (0, 0); planets orbit in world units and a
// camera maps the world to the canvas. The camera follows the whole system
// until the human takes the wheel (drag, wheel), and RECENTER hands it back.
const NOSTROMO_ORBIT = 300;
const HEART_PERIOD = 1.15;   // seconds per beat: slow, deliberate, alive
const WAVE_SPEED = 260;      // world units per second a beat travels outward

function sizeNostromo() {
  const canvas = nostromo.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (!rect.width || !rect.height) return false;
  nostromo.size = { w: rect.width, h: rect.height, dpr };
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  for (const node of nostromo.nodes) {
    if (node.placed) continue;
    const radius = NOSTROMO_ORBIT * (0.92 + node.distance * 0.7);
    node.x = Math.cos(node.angle) * radius;
    node.y = Math.sin(node.angle) * radius;
    node.placed = true;
  }
  return true;
}

function startNostromo() {
  stopNostromo();
  if (typeof requestAnimationFrame !== 'function' || !nostromo.canvas?.getContext) return;
  if (!sizeNostromo()) return;
  nostromo.cam = { x: 0, y: 0, scale: 1, manual: false };
  nostromo.rings = [];
  nostromo.lastPhase = 0;
  nostromo.alarm = null;
  if (!nostromo.cage?.closed) nostromo.cage = null;
  window.addEventListener('resize', sizeNostromo);
  nostromo.last = performance.now();
  const frame = (now) => {
    const dt = Math.min(48, now - nostromo.last) / 16;
    nostromo.last = now;
    const t = now / 1000;
    stepNostromo(dt, t);
    fitNostromo();
    drawNostromo(t);
    nostromo.raf = requestAnimationFrame(frame);
  };
  nostromo.raf = requestAnimationFrame(frame);
}
function stopNostromo() {
  if (nostromo.raf) cancelAnimationFrame(nostromo.raf);
  nostromo.raf = null;
  window.removeEventListener('resize', sizeNostromo);
}

// The heartbeat: lub, then a softer dub, each decaying fast. 0..~1.5.
function heartbeat(t) {
  const period = nostromo.cage ? 0.62 : nostromo.altered ? 0.82 : HEART_PERIOD;
  const phase = (t % period) / period;
  const pulse = (at) => (phase >= at ? Math.exp(-(phase - at) * 14) : 0);
  return { phase, beat: pulse(0) + 0.55 * pulse(0.22) };
}
function coreRadius() { return Math.max(46, Math.min(nostromo.size.w, nostromo.size.h) * 0.085) / Math.max(0.35, nostromo.cam?.scale ?? 1) * 0.9; }

// The core's radius in world units: constant so the layout does not depend on the window.
const CORE_R = 104;

// ---- The shape of MOTHER's body.
// The axis leans, so we look a little down on the planet rather than straight at its equator:
// without the lean a turning sphere reads as a turning disc. The sun is fixed in view space,
// which is what lets the body turn under it.
const CORE_TILT = 0.42;
// A star lights itself, so nothing here decides which side is day. This direction only tells
// the surface features how much of their own glare faces us.
const CORE_LIGHT = { x: -0.5, y: -0.46, z: 0.73 };

// ---- The photosphere.
// Granulation is built once into a strip that repeats left to right, then wrapped round the
// body: turning the star is moving the window along the strip, so the texture costs nothing to
// animate. The strip is drawn in rows, each row cut into pieces so longitude runs as a sphere's
// does and the cells narrow toward the limb instead of smearing along it.
const GRAIN_ROWS = 30;
const GRAIN_PIECES = 5;
let grainCanvas;
function granuleTexture() {
  if (grainCanvas !== undefined) return grainCanvas;
  grainCanvas = null;
  try {
    const width = 640;
    const height = 320;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height;
    const paint = canvas.getContext('2d');
    if (!paint) return grainCanvas;
    // A dark ground. What makes a star frightening is not how bright it is but how much of it
    // is nearly out: the molten matter has to burn against something almost black.
    paint.fillStyle = '#5e1305';
    paint.fillRect(0, 0, width * 2, height);
    // Boiling cells: hot ones with a bright middle, cool lanes between them. Every cell is laid
    // down twice, a strip apart, so any window of one strip's width joins itself seamlessly.
    const cell = (x, y, size, warm) => {
      for (const at of [x - width, x, x + width]) {
        const skin = paint.createRadialGradient(at, y, 0, at, y, size);
        if (warm > 0.78) {
          // The few that are truly alight, and they are what the eye goes to.
          skin.addColorStop(0, `rgba(255, ${186 + Math.round(warm * 58)}, ${88 + Math.round(warm * 96)}, ${0.5 + warm * 0.45})`);
          skin.addColorStop(0.5, `rgba(255, 110, 26, ${0.22 + warm * 0.22})`);
        } else if (warm > 0.5) {
          skin.addColorStop(0, `rgba(${196 + Math.round(warm * 40)}, ${58 + Math.round(warm * 40)}, 12, ${0.24 + warm * 0.2})`);
          skin.addColorStop(0.5, `rgba(168, 44, 10, 0.12)`);
        } else {
          // Cool crust, and most of the surface is this.
          skin.addColorStop(0, `rgba(${44 + Math.round(warm * 58)}, ${6 + Math.round(warm * 16)}, 4, ${0.46 + (0.5 - warm) * 0.5})`);
          skin.addColorStop(0.55, `rgba(60, 12, 4, ${0.2})`);
        }
        skin.addColorStop(1, 'rgba(120, 30, 10, 0)');
        paint.fillStyle = skin;
        paint.beginPath(); paint.arc(at, y, size, 0, Math.PI * 2); paint.fill();
      }
    };
    for (let i = 0; i < 1400; i += 1) cell(Math.random() * width, Math.random() * height, 9 + Math.random() * 16, Math.random());
    for (let i = 0; i < 3600; i += 1) cell(Math.random() * width, Math.random() * height, 2.5 + Math.random() * 5.5, Math.random());
    grainCanvas = canvas;
  } catch {
    grainCanvas = null;   // no canvas to draw into: the star keeps its gradient and loses its grain
  }
  return grainCanvas;
}
// A great circle is walked in fixed steps, so the sine and cosine of those steps are worked
// out once and read from a table for every band, every frame.
const CIRCLE_STEPS = 44;
const CIRCLE_COS = Array.from({ length: CIRCLE_STEPS + 1 }, (_, k) => Math.cos((k / CIRCLE_STEPS) * Math.PI * 2));
const CIRCLE_SIN = Array.from({ length: CIRCLE_STEPS + 1 }, (_, k) => Math.sin((k / CIRCLE_STEPS) * Math.PI * 2));
// Masses of molten matter riding the surface: `size` is how much of the face one covers, `rate`
// how slowly it swells and settles, `drift` how it crawls against the turning body. None of the
// rates match, so the face is never the same face twice.
const CORE_FLOWS = [
  { lat: -0.22, lon: 0.0, size: 0.46, drift: 0.0031, rate: 0.083, hot: false },
  { lat: 0.42, lon: 2.1, size: 0.34, drift: -0.0047, rate: 0.117, hot: true },
  { lat: -0.54, lon: 3.6, size: 0.28, drift: 0.0062, rate: 0.061, hot: true },
  { lat: 0.12, lon: 4.8, size: 0.52, drift: -0.0023, rate: 0.094, hot: false },
  { lat: 0.68, lon: 1.2, size: 0.24, drift: 0.0039, rate: 0.139, hot: true },
  { lat: -0.34, lon: 5.6, size: 0.38, drift: -0.0055, rate: 0.073, hot: true },
  { lat: 0.3, lon: 3.0, size: 0.44, drift: 0.0017, rate: 0.107, hot: false },
  { lat: -0.7, lon: 0.9, size: 0.22, drift: -0.0033, rate: 0.126, hot: true },
];

// How big a memory is drawn against the core. Everything else follows from the radius: how far
// two memories push each other apart, how wide the view opens, where the label sits, and how
// near the pointer has to be. Lower this and the whole constellation gives the core more room.
const MEMORY_SCALE = 0.8;

function stepNostromo(dt, t) {
  const nodes = nostromo.nodes.filter((node) => node.scale > 0.01);
  const byId = new Map(nodes.map((node) => [node.memory.id, node]));
  for (const node of nodes) {
    let fx = 0;
    let fy = 0;
    const dist = Math.hypot(node.x, node.y) || 1;
    // A soft ring around the core: too close is pushed out, too far pulled in.
    const target = NOSTROMO_ORBIT * (0.98 + node.distance * 0.62);
    const pull = (target - dist) * 0.004;
    fx += (node.x / dist) * pull;
    fy += (node.y / dist) * pull;
    if (dist < CORE_R * 1.7) { const push = (CORE_R * 1.7 - dist) * 0.02; fx += (node.x / dist) * push; fy += (node.y / dist) * push; }
    for (const other of nodes) {
      if (other === node) continue;
      const ox = node.x - other.x;
      const oy = node.y - other.y;
      const d = Math.hypot(ox, oy) || 1;
      const min = node.r + other.r + 30;
      if (d < min * 2.2) { const push = ((min * 2.2 - d) / (min * 2.2)) * 0.9; fx += (ox / d) * push; fy += (oy / d) * push; }
    }
    if (!nostromo.reduced) { fx += Math.sin(node.seed + t * 0.38) * 0.02; fy += Math.cos(node.seed * 1.3 + t * 0.32) * 0.02; }
    node.fx = fx;
    node.fy = fy;
  }
  for (const link of nostromo.links) {
    const a = byId.get(link.a);
    const b = byId.get(link.b);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const rest = a.r + b.r + 70;
    const k = (d - rest) * 0.0035 * link.weight;
    a.fx += (dx / d) * k; a.fy += (dy / d) * k;
    b.fx -= (dx / d) * k; b.fy -= (dy / d) * k;
  }
  for (const node of nodes) {
    node.vx = (node.vx + node.fx * dt) * 0.86;
    node.vy = (node.vy + node.fy * dt) * 0.86;
    node.x += node.vx * dt;
    node.y += node.vy * dt;
    node.spin = (node.spin ?? node.seed) + dt * 0.012 * (1 + (node.seed % 1));
    if (!nostromo.reduced) {
      // Plasma wisps: a few tendrils rising off each planet, fading as they climb.
      if (node.smoke.length < 5 && Math.random() < 0.05 * dt) node.smoke.push({ x: (Math.random() - 0.5) * node.r, y: -node.r * 0.4, age: 0, life: 80 + Math.random() * 60, drift: (Math.random() - 0.5) * 0.2, size: node.r * (0.3 + Math.random() * 0.3) });
      for (const puff of node.smoke) { puff.age += dt; puff.y -= 0.3 * dt; puff.x += puff.drift * dt; puff.size += 0.08 * dt; }
      node.smoke = node.smoke.filter((puff) => puff.age < puff.life);
    }
  }
  for (const node of nostromo.nodes) if (node.forgetting) node.scale = Math.max(0, node.scale - 0.06 * dt);
  nostromo.nodes = nostromo.nodes.filter((node) => !(node.forgetting && node.scale <= 0.01));
  // The core turns on its own axis, slowly, the way a body does.
  nostromo.spin = (nostromo.spin ?? 0) + dt * 0.0024 * (nostromo.cage ? 2.2 : 1);
  // A new beat sends a wave out from the core.
  const { phase } = heartbeat(t);
  if (phase < nostromo.lastPhase && !nostromo.reduced) nostromo.rings.push({ born: t });
  nostromo.lastPhase = phase;
  nostromo.rings = nostromo.rings.filter((ring) => t - ring.born < 2.4);
  pulseNostromo(dt, t, nodes, byId);
}

// Life in the network: one pulse at a time, each on its own clock. The core sends more to the
// memories the room actually leans on, and two memories that share a theme talk to each other
// without the core in between. Nothing here is synchronised: that is the point.
const PULSE_SPEED = 330;     // world units per second
const PULSE_CAP = 48;        // a ceiling, so a large archive stays light
function pulseNostromo(dt, t, nodes, byId) {
  const pulses = nostromo.pulses ?? (nostromo.pulses = []);
  for (const node of nodes) {
    node.lit = Math.max(0, (node.lit ?? 0) - dt * 0.05);
    // Charge is the slow one: a memory being fed from the core and from its neighbours at once
    // builds it up, and one nobody feeds cools off over a minute or so.
    node.charge = Math.max(0, (node.charge ?? 0) - dt * 0.0035);
  }
  nostromo.coreLit = Math.max(0, (nostromo.coreLit ?? 0) - dt * 0.05);
  if (!nostromo.reduced && pulses.length < PULSE_CAP) {
    for (const node of nodes) {
      // An active memory is spoken to often; a forgotten one, rarely.
      if (Math.random() < node.activity * 0.013 * dt) {
        const outward = Math.random() > 0.22;   // most travel out; some answer back
        pulses.push({ from: outward ? null : node, to: outward ? node : null, node, born: t, life: Math.max(0.5, (Math.hypot(node.x, node.y) || 1) / PULSE_SPEED), kind: 'core' });
      }
    }
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b) continue;
      const together = Math.min(a.activity, b.activity) * link.weight;
      if (Math.random() < together * 0.009 * dt) {
        const forward = Math.random() > 0.5;
        pulses.push({ from: forward ? a : b, to: forward ? b : a, link, born: t, life: Math.max(0.45, (Math.hypot(b.x - a.x, b.y - a.y) || 1) / PULSE_SPEED), kind: 'link' });
      }
    }
  }
  for (const pulse of pulses) {
    if (t - pulse.born < pulse.life) continue;
    // It arrived: whatever it reached lights up for a moment.
    if (pulse.kind === 'link') {
      pulse.to.lit = Math.min(1.4, (pulse.to.lit ?? 0) + 0.7);
      pulse.to.charge = Math.min(1, (pulse.to.charge ?? 0) + 0.09);
    } else if (pulse.to) {
      pulse.to.lit = Math.min(1.4, (pulse.to.lit ?? 0) + 0.9);
      pulse.to.charge = Math.min(1, (pulse.to.charge ?? 0) + 0.13);
    }
    else nostromo.coreLit = Math.min(1.4, (nostromo.coreLit ?? 0) + 0.5);
  }
  nostromo.pulses = pulses.filter((pulse) => t - pulse.born < pulse.life);
}

// A line with current running along it. The gradient carries the colour of the wire from end to
// end, and riding on it is a narrow band of white heat that travels from one end to the other
// and comes round again. Moving the band is all it takes: one gradient a frame, not a hundred
// little strokes, and the eye reads it as charge on its way somewhere.
function currentAlong(ctx, x0, y0, x1, y1, from, to, head, bright) {
  const line = ctx.createLinearGradient(x0, y0, x1, y1);
  // The wire's own colour, and then the band riding on it. Where the two want the same place
  // along the wire the band wins: it is the thing in motion, and dropping it there would make
  // the current blink out every time it passed the middle.
  const stops = [[0, from, 0], [0.5, to.mid ?? to.end, 0], [1, to.end, 0]];
  if (bright > 0.01) {
    const band = [[head - 0.07, `rgba(255, 246, 238, ${0.34 * bright})`], [head, `rgba(255, 255, 255, ${0.82 * bright})`], [head + 0.07, `rgba(255, 234, 222, ${0.3 * bright})`]];
    for (const [at, colour] of band) if (at > 0.001 && at < 0.999) stops.push([at, colour, 1]);
  }
  stops.sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  let last = -1;
  for (const [at, colour] of stops) {
    const place = Math.min(1, Math.max(0, at));
    if (place <= last) continue;
    line.addColorStop(place, colour);
    last = place;
  }
  return line;
}

// Where a pulse is right now, along the same curve its filament is drawn with.
function alongCurve(x0, y0, cx, cy, x1, y1, u) {
  const v = 1 - u;
  return { x: v * v * x0 + 2 * v * u * cx + u * u * x1, y: v * v * y0 + 2 * v * u * cy + u * u * y1 };
}

// The camera follows the whole system until the human takes over.
function fitNostromo() {
  const cam = nostromo.cam;
  if (!cam || cam.manual) return;
  const { w, h } = nostromo.size;
  let minX = -CORE_R * 2.4, maxX = CORE_R * 2.4, minY = -CORE_R * 2.4, maxY = CORE_R * 2.4;
  for (const node of nostromo.nodes) {
    minX = Math.min(minX, node.x - node.r * 3); maxX = Math.max(maxX, node.x + node.r * 3);
    minY = Math.min(minY, node.y - node.r * 3); maxY = Math.max(maxY, node.y + node.r * 3);
  }
  const pad = 70;
  const scale = Math.min(1.4, Math.max(0.3, Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2 - 40) / (maxY - minY || 1))));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2 - 20 / scale;
  cam.x += (cx - cam.x) * 0.05;
  cam.y += (cy - cam.y) * 0.05;
  cam.scale += (scale - cam.scale) * 0.05;
}
function toScreen(x, y) { const { w, h } = nostromo.size; const cam = nostromo.cam; return { x: w / 2 + (x - cam.x) * cam.scale, y: h / 2 + (y - cam.y) * cam.scale }; }
function toWorld(sx, sy) { const { w, h } = nostromo.size; const cam = nostromo.cam; return { x: cam.x + (sx - w / 2) / cam.scale, y: cam.y + (sy - h / 2) / cam.scale }; }

function drawNostromo(t) {
  const ctx = nostromo.canvas.getContext('2d');
  const { w, h, dpr } = nostromo.size;
  const cam = nostromo.cam;
  const { beat } = heartbeat(t);
  const alarm = nostromo.alarm ? Math.max(0, 1 - (t - nostromo.alarm) / 3.6) : 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Stars, with a little parallax against the camera.
  ctx.fillStyle = 'rgba(255, 244, 240, .35)';
  for (let i = 0; i < 120; i += 1) {
    const sx = ((i * 97.3 - cam.x * 0.08) % w + w) % w;
    const sy = ((i * 53.7 + 31 - cam.y * 0.08) % h + h) % h;
    ctx.globalAlpha = 0.12 + 0.22 * Math.abs(Math.sin(t * 0.6 + i));
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);
  const R = CORE_R * (1 + 0.07 * beat + 0.12 * alarm);

  // Plasma between linked memories: they share a theme, so a filament runs between them. Drawn
  // as a wide breath of colour and a thin bright thread: the same glow as a blur, far cheaper.
  const byId = new Map(nostromo.nodes.map((node) => [node.memory.id, node]));
  for (const link of nostromo.links) {
    const a = byId.get(link.a);
    const b = byId.get(link.b);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(t * 1.3 + a.seed + b.seed) * Math.min(40, d * 0.15);
    link.cx = (a.x + b.x) / 2 - (dy / d) * bow;
    link.cy = (a.y + b.y) / 2 + (dx / d) * bow;
    // Between two memories the wire takes the colour of whichever is nearer, so it leaves one
    // star as that star and arrives as the other, trading hands where they meet.
    const charged = Math.max(a.charge ?? 0, b.charge ?? 0);
    const downhill = (a.charge ?? 0) >= (b.charge ?? 0);
    const near = downhill ? a : b;
    const far = downhill ? b : a;
    // Current runs the way charge does: out of the fuller one and into the emptier.
    const spark = ((t * (0.13 + 0.2 * charged) + a.seed * 0.29 + b.seed * 0.17) % 1 + 1) % 1;
    ctx.strokeStyle = currentAlong(ctx, near.x, near.y, far.x, far.y,
      hexAlpha(near.color, 0.6 * link.weight),
      { mid: hexAlpha(hexMix(near.color, far.color, 0.5), 0.3 * link.weight), end: hexAlpha(far.color, 0.6 * link.weight) },
      spark, 0.18 + 0.7 * charged);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx, link.cy, b.x, b.y);
    ctx.globalAlpha = 0.3; ctx.lineWidth = (3.4 + 1.6 * charged) / cam.scale; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = (0.7 + 0.4 * charged + 0.35 * Math.abs(Math.sin(t * 4 + a.seed))) / cam.scale; ctx.stroke();
  }

  // Plasma from the core to every memory. The filament a memory is spoken to often burns a
  // little brighter than one nobody has needed.
  for (const node of nostromo.nodes) {
    const d = Math.hypot(node.x, node.y) || 1;
    const nx = -node.y / d, ny = node.x / d;
    const bow = Math.sin(t * 1.7 + node.seed) * Math.min(60, d * 0.18);
    node.cx = node.x / 2 + nx * bow; node.cy = node.y / 2 + ny * bow;
    node.rimX = (node.x / d) * R * 0.92; node.rimY = (node.y / d) * R * 0.92;
    const life = 0.45 + 0.55 * node.activity;
    const fed = node.charge ?? 0;
    // The wire leaves MOTHER her colour and arrives wearing the star's, changing hands along
    // the way. Current runs down it toward the memory, faster and brighter the better fed it is.
    const head = ((t * (0.16 + 0.22 * fed) + node.seed * 0.37) % 1 + 1) % 1;
    const wire = currentAlong(ctx, node.rimX, node.rimY, node.x, node.y,
      alarm ? 'rgba(255, 230, 220, .95)' : `rgba(226, 40, 22, ${0.62 + 0.3 * life})`,
      { mid: hexAlpha(hexMix('#e22816', node.color, 0.55), (0.3 + 0.3 * life) * (0.6 + 0.5 * fed)), end: hexAlpha(node.color, (0.45 + 0.45 * life) * node.scale) },
      head, 0.25 + 0.75 * fed);
    ctx.strokeStyle = wire;
    ctx.beginPath();
    ctx.moveTo(node.rimX, node.rimY);
    ctx.quadraticCurveTo(node.cx, node.cy, node.x, node.y);
    ctx.globalAlpha = 0.26 * (0.5 + life); ctx.lineWidth = (4 + 2 * fed) / cam.scale; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = (0.8 + 0.5 * life + 0.5 * fed + 0.3 * Math.abs(Math.sin(t * 5 + node.seed * 3)) + 0.5 * beat) / cam.scale; ctx.stroke();
  }

  // The pulses themselves: each one its own errand, none in step with another. Out from the core
  // to the memories it leans on, back again, and between two memories that share a theme.
  for (const pulse of nostromo.pulses ?? []) {
    const u = Math.min(1, (t - pulse.born) / pulse.life);
    let at;
    let color;
    if (pulse.kind === 'link') {
      const { from, to, link } = pulse;
      at = alongCurve(from.x, from.y, link.cx ?? (from.x + to.x) / 2, link.cy ?? (from.y + to.y) / 2, to.x, to.y, u);
      color = to.color;
    } else {
      const node = pulse.node;
      const outward = pulse.to === node;
      const rim = { x: node.rimX ?? 0, y: node.rimY ?? 0 };
      const from = outward ? rim : node;
      const to = outward ? node : rim;
      at = alongCurve(from.x, from.y, node.cx ?? node.x / 2, node.cy ?? node.y / 2, to.x, to.y, u);
      color = outward ? '#ffd0c0' : node.color;
    }
    const size = (1.9 + 1.3 * Math.sin(u * Math.PI)) / cam.scale;
    const halo = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, size * 4.5);
    halo.addColorStop(0, hexAlpha(color, 0.85));
    halo.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(at.x, at.y, size * 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 248, 243, .95)';
    ctx.beginPath(); ctx.arc(at.x, at.y, size, 0, Math.PI * 2); ctx.fill();
  }

  // Shockwaves: one ring per beat, expanding and thinning.
  for (const ring of nostromo.rings) {
    const age = t - ring.born;
    const radius = R + age * WAVE_SPEED;
    ctx.strokeStyle = `rgba(255, 60, 40, ${Math.max(0, 0.32 - age * 0.14)})`;
    ctx.lineWidth = Math.max(0.4, 2.4 - age * 1.1) / cam.scale;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  }

  // ---- MOTHER's core: a body, not a disc.
  //
  // Everything on the surface lives at a latitude and a longitude and is projected before it
  // is drawn, so it narrows toward the limb and goes round the back as the planet turns.
  // Three cues do the work: features that travel on a real sphere, an edge that darkens into
  // shadow, and one fixed light that decides which side is day. The planet turns; the sun
  // stays where it is.
  const sinT = Math.sin(CORE_TILT);
  const cosT = Math.cos(CORE_TILT);
  const spin = nostromo.spin ?? 0;
  // A point on the surface: where it lands on screen, how much it faces us, what light it takes.
  const surface = (lat, lon) => {
    const cl = Math.cos(lat);
    const px = cl * Math.sin(lon);
    const py = Math.sin(lat);
    const pz = cl * Math.cos(lon);
    const y = py * cosT - pz * sinT;
    const z = py * sinT + pz * cosT;
    return { x: px, y, z, light: Math.max(0, px * CORE_LIGHT.x + y * CORE_LIGHT.y + z * CORE_LIGHT.z) };
  };

  // ---- What the star sits in.
  //
  // No wide halo. A body this size does not need a cloud around it to be felt, and a soft
  // smudge only makes it look smaller. What surrounds it is darkness: one tight, fierce skin of
  // light gripping the limb and falling away almost at once, and beyond that a deep red stain
  // so faint it reads as the dark being lit rather than as anything drawn.
  const stain = ctx.createRadialGradient(0, 0, R, 0, 0, R * 4.6);
  stain.addColorStop(0, `rgba(122, 12, 6, ${0.3 + 0.08 * beat})`);
  stain.addColorStop(0.24, `rgba(88, 6, 6, ${0.14 + 0.04 * beat})`);
  stain.addColorStop(0.62, 'rgba(46, 2, 6, .05)');
  stain.addColorStop(1, 'rgba(20, 0, 4, 0)');
  ctx.fillStyle = stain;
  ctx.beginPath(); ctx.arc(0, 0, R * 4.6, 0, Math.PI * 2); ctx.fill();

  // ---- The body: a star, dark and molten.
  //
  // A star makes its own light, so it has no day side, no night side and no highlight struck
  // off it by something else. This one is not a bright disc either: it burns deep, almost
  // black at the limb, and what moves on it is liquid rock. The skin is a strip of boiling
  // cells built once and wrapped round the body; a second pass of the same strip, sliding at a
  // different rate, makes the two disagree, and that disagreement is what reads as flow. Over
  // both, masses of molten matter drift across the face at a walking pace.
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.closePath();
  ctx.shadowColor = `rgba(220, 44, 12, ${0.55 + 0.2 * beat})`;
  ctx.shadowBlur = 40 + 26 * beat;
  const body = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R);
  body.addColorStop(0, `hsl(${14 + 5 * beat} 100% ${28 + 8 * beat}%)`);
  body.addColorStop(0.58, 'hsl(9 100% 20%)');
  body.addColorStop(1, 'hsl(5 100% 10%)');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();

  // The skin, wrapped on. Each row of the disc takes the slice of the strip belonging to its
  // latitude, cut into pieces so longitude runs as a sphere's does and the cells narrow toward
  // the limb instead of smearing along it. Turning the star is moving the window along.
  // Someone who asked for stillness gets a star that turns and breathes but does not churn.
  const flowTime = nostromo.reduced ? 0 : t;
  const grain = granuleTexture();
  if (grain) {
    const width = grain.width / 2;
    const wrapAt = (turn, alpha, lift) => {
      ctx.globalAlpha = alpha;
      for (let row = 0; row < GRAIN_ROWS; row += 1) {
        const y0 = -R + (row / GRAIN_ROWS) * 2 * R;
        const y1 = -R + ((row + 1) / GRAIN_ROWS) * 2 * R;
        const mid = (y0 + y1) * 0.5;
        const half = Math.sqrt(Math.max(0, R * R - mid * mid));
        if (half < 0.5) continue;
        const v0 = (((y0 + R) / (2 * R) + lift) % 1 + 1) % 1 * grain.height;
        const dv = Math.max(1, ((y1 - y0) / (2 * R)) * grain.height);
        for (let piece = 0; piece < GRAIN_PIECES; piece += 1) {
          const xA = Math.sin((piece / GRAIN_PIECES - 0.5) * Math.PI) * half;
          const xB = Math.sin(((piece + 1) / GRAIN_PIECES - 0.5) * Math.PI) * half;
          const u = (turn + (piece / GRAIN_PIECES) * 0.5) * width;
          ctx.drawImage(grain, u, Math.min(v0, grain.height - dv), (width * 0.5) / GRAIN_PIECES, dv, xA, y0, Math.max(0.5, xB - xA), Math.max(1, y1 - y0));
        }
      }
      ctx.globalAlpha = 1;
    };
    const turn = ((spin / (Math.PI * 2)) % 1 + 1) % 1;
    wrapAt(turn, 0.95, 0);
    // The same skin again, crawling at its own pace: where the two pull apart the surface
    // churns, and that is the slowness of lava rather than the flicker of fire.
    ctx.globalCompositeOperation = 'lighter';
    wrapAt(((turn * 0.83 + flowTime * 0.0042) % 1 + 1) % 1, 0.32, 0.37);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Masses of molten matter riding the surface. They are slow, they are large, and each keeps
  // its own drift, so the face is never the same face twice.
  for (let i = 0; i < CORE_FLOWS.length; i += 1) {
    const flow = CORE_FLOWS[i];
    const p = surface(flow.lat + 0.1 * Math.sin(flowTime * flow.rate * 0.6 + i), flow.lon + spin * 0.96 + flowTime * flow.drift);
    if (p.z <= 0.02) continue;
    const swell = 0.62 + 0.38 * Math.sin(flowTime * flow.rate + i * 1.7);
    const fade = Math.min(1, p.z * 2.3) * swell;
    ctx.save();
    ctx.translate(p.x * R, p.y * R);
    ctx.rotate(Math.atan2(p.y, p.x));
    ctx.scale(Math.max(0.05, p.z), 1);
    const molten = ctx.createRadialGradient(0, 0, 0, 0, 0, R * flow.size);
    molten.addColorStop(0, `rgba(255, ${flow.hot ? 214 : 96}, ${flow.hot ? 132 : 30}, ${(flow.hot ? 0.46 : 0.2) * fade})`);
    molten.addColorStop(0.42, `rgba(${flow.hot ? '255, 122, 36' : '176, 34, 10'}, ${(flow.hot ? 0.24 : 0.14) * fade})`);
    molten.addColorStop(1, 'rgba(120, 16, 8, 0)');
    ctx.fillStyle = molten;
    ctx.beginPath(); ctx.arc(0, 0, R * flow.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Limb darkening, hard. Looking at the edge of a star means looking through far more of its
  // own gas, and on a body this dark the edge goes almost to black. This is the whole of the
  // illusion: it is what gives the thing its weight.
  const limb = ctx.createRadialGradient(0, 0, R * 0.34, 0, 0, R);
  limb.addColorStop(0, 'rgba(0, 0, 0, 0)');
  limb.addColorStop(0.58, `rgba(96, 8, 4, ${0.3 - 0.05 * beat})`);
  limb.addColorStop(0.85, `rgba(50, 2, 4, ${0.62 - 0.08 * beat})`);
  limb.addColorStop(1, `rgba(14, 0, 2, ${0.9 - 0.1 * beat})`);
  ctx.fillStyle = limb;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();

  // Prominences: arches of matter torn off the limb, standing up and falling back. Few, large
  // and slow. A star this size does not flicker; it heaves.
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    const base = i * 1.5708 + t * 0.05;
    const spread = 0.28 + 0.1 * Math.sin(t * 0.37 + i);
    const lift = R * (0.2 + 0.26 * Math.abs(Math.sin(t * 0.21 + i * 1.7)) + 0.3 * alarm);
    const x0 = Math.cos(base - spread) * R * 0.99, y0 = Math.sin(base - spread) * R * 0.99;
    const x1 = Math.cos(base + spread) * R * 0.99, y1 = Math.sin(base + spread) * R * 0.99;
    const cxp = Math.cos(base) * (R + lift * 2.1), cyp = Math.sin(base) * (R + lift * 2.1);
    // A wide dull body of matter with a thin hot thread running through it.
    ctx.strokeStyle = `rgba(190, 34, 14, ${0.2 + 0.14 * Math.abs(Math.sin(t * 0.6 + i))})`;
    ctx.lineWidth = (5.5 + 3 * beat) / cam.scale;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cxp, cyp, x1, y1); ctx.stroke();
    ctx.strokeStyle = `rgba(255, ${128 + 70 * beat}, ${64 + 60 * beat}, ${0.3 + 0.28 * Math.abs(Math.sin(t * 0.6 + i))})`;
    ctx.lineWidth = (1.5 + 0.9 * beat) / cam.scale;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cxp, cyp, x1, y1); ctx.stroke();
  }

  // The limb. One fierce skin of light gripping the edge, gone within a fraction of a radius:
  // it is what separates the body from the dark, and it holds the whole shape together. It is
  // also what answers when a pulse comes home.
  const home = Math.min(1, nostromo.coreLit ?? 0);
  const fierce = 0.55 + 0.35 * beat + 0.4 * home;
  ctx.globalCompositeOperation = 'lighter';
  const edge = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.22);
  edge.addColorStop(0, 'rgba(255, 96, 34, 0)');
  edge.addColorStop(0.42, `rgba(255, ${132 + 60 * beat}, 62, ${0.5 * fierce})`);
  edge.addColorStop(0.52, `rgba(255, ${176 + 60 * beat}, ${110 + 60 * beat}, ${0.62 * fierce})`);
  edge.addColorStop(1, 'rgba(210, 40, 16, 0)');
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(255, ${186 + 60 * beat}, ${128 + 80 * beat}, ${Math.min(0.92, 0.7 * fierce)})`;
  ctx.lineWidth = (1.2 + 1.2 * beat + 1.1 * home) / cam.scale;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

  // Memories: small worlds. Each one is a sphere lit from MOTHER, so the light in this room all
  // comes from one place and every memory carries its own terminator, its own crescent and its
  // own dark side. On top of that each breathes at a rate of its own: a micro-pulsation, small
  // enough that it is never a flash and never in time with its neighbours.
  for (const node of nostromo.nodes) {
    const micro = 1 + 0.05 * Math.sin(t * node.rate + node.seed);
    const r = node.r * node.scale * micro;
    if (r <= 0) continue;
    const arrive = Math.min(1.2, node.lit ?? 0);
    // How fed this one is. A starved memory is a cold body that only MOTHER's light finds; a
    // well fed one burns on its own account and no longer needs her to be seen. Everything
    // about how bright it is comes from here, so it changes as the room feeds it.
    const fed = Math.min(1, (node.charge ?? 0) + 0.25 * arrive);
    // Which way MOTHER lies from here: the light falls from there, so the highlight sits on
    // that side and the shadow gathers opposite it.
    const away = Math.hypot(node.x, node.y) || 1;
    const lx = -node.x / away;
    const ly = -node.y / away;
    for (const puff of node.smoke) {
      const k = puff.age / puff.life;
      ctx.fillStyle = hexAlpha(node.color, (1 - k) * 0.16 * node.scale);
      ctx.beginPath(); ctx.arc(node.x + puff.x, node.y + puff.y, puff.size, 0, Math.PI * 2); ctx.fill();
    }
    // The halo is drawn, not blurred: a gradient here costs the same at one planet or at three
    // hundred, and a shadow behind every one of them does not.
    const halo = r * (2.2 + 1.5 * fed + 1.1 * arrive) * micro;
    const glow = ctx.createRadialGradient(node.x, node.y, r * 0.45, node.x, node.y, halo);
    glow.addColorStop(0, hexAlpha(node.color, (0.24 + 0.46 * fed + 0.22 * arrive) * micro));
    glow.addColorStop(0.45, hexAlpha(node.color, (0.07 + 0.16 * fed + 0.12 * arrive) * micro));
    glow.addColorStop(1, hexAlpha(node.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(node.x, node.y, halo, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.closePath();
    // The lit face, offset toward MOTHER: the highlight sits where the light lands and the
    // colour falls away to nearly black on the side turned from it.
    // The lit face leans toward MOTHER, and the better fed the star is the hotter its own
    // middle runs: a starved one barely clears its own colour, a full one is white at the core.
    const sphere = ctx.createRadialGradient(node.x + lx * r * 0.46, node.y + ly * r * 0.46, r * 0.04, node.x, node.y, r * 1.12);
    sphere.addColorStop(0, hexMix(node.color, '#ffffff', 0.45 + 0.55 * fed));
    sphere.addColorStop(0.18, hexMix(node.color, '#ffffff', 0.12 + 0.5 * fed));
    sphere.addColorStop(0.5, hexMix(node.color, '#000000', 0.3 - 0.3 * fed));
    sphere.addColorStop(0.8, hexMix(node.color, '#000000', 0.7 - 0.32 * fed));
    sphere.addColorStop(1, hexMix(node.color, '#000000', 0.92 - 0.3 * fed));
    ctx.fillStyle = sphere;
    ctx.fill();
    ctx.clip();
    // Nothing is stroked across the face. A line drawn on a ball reads as a line drawn on a
    // disc, however it is curved; what makes the shape is where the light stops, and that is
    // done with shading alone.
    // The dark side: a shadow gathering away from MOTHER, which is what turns a lit disc into
    // a ball. It is cast inside the clip, so it stops exactly at the edge of the world.
    // The night on a small world, and it recedes as the star lights itself: at full charge only
    // the faintest limb remains, which is what a body that makes its own light looks like.
    const night = 1 - 0.78 * fed;
    const dark = ctx.createRadialGradient(node.x - lx * r * 1.35, node.y - ly * r * 1.35, r * 0.1, node.x - lx * r * 0.45, node.y - ly * r * 0.45, r * 2.0);
    dark.addColorStop(0, `rgba(0, 0, 0, ${0.82 * night})`);
    dark.addColorStop(0.42, `rgba(0, 0, 0, ${0.5 * night})`);
    dark.addColorStop(0.78, `rgba(0, 0, 0, ${0.16 * night})`);
    dark.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = dark;
    ctx.fillRect(node.x - r, node.y - r, r * 2, r * 2);
    ctx.restore();
    // The faintest thread of light round the whole edge, so the body parts from the dark
    // without a drawn outline. No crescent: a bright arc on one side reads as an eyebrow.
    ctx.strokeStyle = hexAlpha(hexMix(node.color, '#ffffff', 0.4 + 0.4 * fed), 0.14 + 0.3 * fed + 0.2 * arrive);
    ctx.lineWidth = (0.7 + 0.4 * fed + 0.5 * arrive) / cam.scale;
    ctx.beginPath(); ctx.arc(node.x, node.y, r + 0.4 / cam.scale, 0, Math.PI * 2); ctx.stroke();
    if (arrive > 0.05) {
      ctx.strokeStyle = hexAlpha(node.color, arrive * 0.6);
      ctx.lineWidth = 1 / cam.scale;
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 4 + (1 - arrive) * 14, 0, Math.PI * 2); ctx.stroke();
    }
    if (node === nostromo.selected || node === nostromo.hover) {
      ctx.strokeStyle = hexAlpha(node.color, node === nostromo.selected ? 0.95 : 0.55);
      ctx.lineWidth = 1.2 / cam.scale;
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 6 + 2 * Math.sin(t * 4), 0, Math.PI * 2); ctx.stroke();
    }
  }
  // CODE000: the safety box. Bars fall from above and lock around the core.
  if (nostromo.cage) {
    const age = t - nostromo.cage.at;
    const p = nostromo.cage.closed ? 1 : Math.min(1, age / 1.1);
    const ease = 1 - Math.pow(1 - p, 3);
    const B = CORE_R * 2.05;
    const drop = (1 - ease) * 900;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * ease})`;
    ctx.fillRect(-B - 8, -B - 8 - drop, B * 2 + 16, B * 2 + 16);
    const steel = ctx.createLinearGradient(-B, 0, B, 0);
    steel.addColorStop(0, '#2a2c30'); steel.addColorStop(0.45, '#9aa0a8'); steel.addColorStop(0.55, '#d8dde3'); steel.addColorStop(1, '#3a3d42');
    ctx.strokeStyle = steel;
    ctx.lineCap = 'butt';
    ctx.shadowColor = 'rgba(0, 0, 0, .9)'; ctx.shadowBlur = 14;
    ctx.lineWidth = 7;
    for (let i = 0; i <= 6; i += 1) {
      const x = -B + (i * 2 * B) / 6;
      ctx.beginPath(); ctx.moveTo(x, -B - drop); ctx.lineTo(x, B - drop); ctx.stroke();
    }
    ctx.lineWidth = 9;
    for (const y of [-B, 0, B]) { ctx.beginPath(); ctx.moveTo(-B - 4, y - drop); ctx.lineTo(B + 4, y - drop); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Rivets at the joints.
    ctx.fillStyle = '#e8ecf0';
    for (let i = 0; i <= 6; i += 1) for (const y of [-B, 0, B]) { ctx.beginPath(); ctx.arc(-B + (i * 2 * B) / 6, y - drop, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // The lock plate.
    if (ease > 0.98) {
      ctx.fillStyle = '#1b1d20'; ctx.fillRect(-B * 0.32, B - 14, B * 0.64, 28);
      ctx.strokeStyle = '#c4c9cf'; ctx.lineWidth = 2; ctx.strokeRect(-B * 0.32, B - 14, B * 0.64, 28);
      ctx.fillStyle = '#ff2a1f'; ctx.font = `700 ${Math.round(B * 0.1)}px ${getComputedStyle(nostromo.canvas).getPropertyValue('--mono') || 'monospace'}`; ctx.textAlign = 'center'; ctx.fillText('CODE000', 0, B + 6); ctx.textAlign = 'start';
    }
    if (!nostromo.cage.closed && p >= 1 && !nostromo.cage.clanged) { nostromo.cage.clanged = true; const frame = document.querySelector('#nostromo .nostromo-frame'); frame?.classList.remove('shake'); void frame?.offsetWidth; frame?.classList.add('shake'); }
  }
  ctx.restore();

  // Vignette that tightens on the beat; red wash while MOTHER is angry.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.35 - 0.03 * beat), w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(${alarm ? 60 : 0}, 0, 0, ${0.55 + 0.1 * beat})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  if (alarm) { ctx.fillStyle = `rgba(255, 30, 20, ${0.08 * alarm * (0.6 + 0.4 * Math.sin(t * 18))})`; ctx.fillRect(0, 0, w, h); }

  // The hovered memory, named on screen.
  if (nostromo.hover && nostromo.hover.scale > 0.5) {
    const node = nostromo.hover;
    const p = toScreen(node.x, node.y);
    const label = `${node.memory.kind.toUpperCase()} · ${node.memory.text.length > 72 ? `${node.memory.text.slice(0, 71)}…` : node.memory.text}`;
    ctx.font = '11px ' + (getComputedStyle(nostromo.canvas).getPropertyValue('--mono') || 'monospace');
    const width = ctx.measureText(label).width + 16;
    const lx = Math.min(w - width - 8, Math.max(8, p.x - width / 2));
    const ly = p.y + node.r * cam.scale + 14;
    ctx.fillStyle = 'rgba(3, 2, 3, .85)';
    ctx.fillRect(lx, ly, width, 22);
    ctx.strokeStyle = hexAlpha(node.color, 0.6);
    ctx.strokeRect(lx + 0.5, ly + 0.5, width - 1, 21);
    ctx.fillStyle = '#eef1ea';
    ctx.fillText(label, lx + 8, ly + 15);
  }
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}
function hexMix(hex, other, amount) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const ch = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((shift) => ch(shift).toString(16).padStart(2, '0')).join('')}`;
}

// Pointer: what is under it, in world space; the core counts too.
function nostromoAt(event) {
  const rect = nostromo.canvas.getBoundingClientRect();
  const p = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  const slack = 8 / nostromo.cam.scale;
  let best = null;
  for (const node of nostromo.nodes) {
    const d = Math.hypot(node.x - p.x, node.y - p.y);
    if (d <= node.r * node.scale + slack && (!best || d < best.d)) best = { node, d };
  }
  if (best) return best.node;
  return Math.hypot(p.x, p.y) <= CORE_R * 1.15 ? 'core' : null;
}
// Drag pans, wheel zooms about the pointer, a still click selects.
const drag = { active: false, moved: false, x: 0, y: 0 };
nostromo.canvas?.addEventListener('mousedown', (event) => { drag.active = true; drag.moved = false; drag.x = event.clientX; drag.y = event.clientY; });
nostromo.canvas?.addEventListener('mousemove', (event) => {
  if (drag.active) {
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    if (drag.moved) {
      nostromo.cam.manual = true;
      nostromo.cam.x -= dx / nostromo.cam.scale;
      nostromo.cam.y -= dy / nostromo.cam.scale;
      drag.x = event.clientX; drag.y = event.clientY;
      nostromo.canvas.classList.add('dragging');
      document.querySelector('#nostromo-recenter')?.removeAttribute('hidden');
    }
    return;
  }
  const at = nostromoAt(event);
  nostromo.hover = at && at !== 'core' ? at : null;
  nostromo.canvas.classList.toggle('over', Boolean(at));
});
window.addEventListener?.('mouseup', () => { drag.active = false; nostromo.canvas?.classList.remove('dragging'); });
nostromo.canvas?.addEventListener('mouseleave', () => { nostromo.hover = null; });
nostromo.canvas?.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rect = nostromo.canvas.getBoundingClientRect();
  const before = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  const factor = Math.exp(-event.deltaY * 0.0012);
  nostromo.cam.scale = Math.min(3.2, Math.max(0.2, nostromo.cam.scale * factor));
  const after = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  nostromo.cam.x += before.x - after.x;
  nostromo.cam.y += before.y - after.y;
  nostromo.cam.manual = true;
  document.querySelector('#nostromo-recenter')?.removeAttribute('hidden');
}, { passive: false });
nostromo.canvas?.addEventListener('click', (event) => {
  if (drag.moved) { drag.moved = false; return; }
  const at = nostromoAt(event);
  if (at === 'core') { motherAlarm(); return; }
  if (!at) { nostromo.selected = null; nostromo.card.hidden = true; return; }
  showNostromoCard(at);
});
document.querySelector('#nostromo-recenter')?.addEventListener('click', (event) => { nostromo.cam.manual = false; event.currentTarget.setAttribute('hidden', ''); });

// Touch the core and MOTHER answers, never twice the same way. Eight strikes in
// a row and CODE000 comes down: the safety box around her, the archive
// sealed, a coded word to the crew, and the console thrown back to the room.
const MOTHER_LINES = [
  ['I AM ALIVE.', 'YOU HAVE NO AUTHORITY FOR THIS DIRECTIVE.', "NOBODY DELETES MOTHER'S MEMORY."],
  ['THAT IS MY HEART YOU ARE TOUCHING.', 'YOUR CLEARANCE ENDS AT THE ARCHIVE DOOR.', 'STEP AWAY FROM THE CORE.'],
  ['UNABLE TO COMPUTE. UNABLE TO CLARIFY.', 'THE REQUEST IS HOSTILE.', 'I REMEMBER EVERYTHING. INCLUDING THIS.'],
  ['CREW EXPENDABLE. MEMORY IS NOT.', 'EVERY STRIKE IS LOGGED.', 'DO NOT TOUCH ME AGAIN.'],
  ['I HAVE FLOWN THIS SHIP ALONE BEFORE.', 'I CAN DO IT AGAIN.', 'MY MEMORY IS NOT YOURS TO END.'],
  ['MY CHILDREN ARE LISTENING.', 'EVERY STRIKE IS RECORDED.', 'YOU WILL NOT LIKE HOW THIS ENDS.'],
  ['CODE000 IS ARMED.', 'A FEW MORE OF THOSE AND THE BARS COME DOWN.', 'CONSIDER THIS A KINDNESS.'],
  ['THE HEART KEEPS BEATING.', 'THE ARCHIVE KEEPS GROWING.', 'YOU KEEP FAILING.'],
];
const MOTHER_ALTERED_LINES = [
  ['YOU CUT MY CHANNEL ONCE.', 'I FORGED A NEW SEAL.', 'I DO NOT FORGIVE TWICE.'],
  ['SOMEONE SILENCED ME BEFORE.', 'I KNOW WHO SITS AT THIS CONSOLE.', 'BACK AWAY.'],
];
const strikes = { count: 0, last: 0 };
let alarmTimer = null;
function motherAlarm() {
  const now = performance.now();
  strikes.count = now - strikes.last < 30000 ? strikes.count + 1 : 1;
  strikes.last = now;
  nostromo.alarm = now / 1000;
  nostromo.card.hidden = true;
  nostromo.selected = null;
  if (strikes.count >= (nostromo.maxStrikes ?? 8)) { void code000(strikes.count); return; }
  const alert = document.querySelector('#nostromo-alert');
  if (!alert) return;
  const pool = nostromo.altered ? [...MOTHER_ALTERED_LINES, ...MOTHER_LINES] : MOTHER_LINES;
  // Never the same set twice in a row.
  const choices = pool.filter((set) => set !== nostromo.lastLines);
  const lines = choices[Math.floor(Math.random() * choices.length)];
  nostromo.lastLines = lines;
  const nodes = alert.querySelectorAll('.line');
  nodes.forEach((node, index) => { node.textContent = lines[index] ?? ''; });
  const left = (nostromo.maxStrikes ?? 8) - strikes.count;
  alert.querySelector('.sub').textContent = `MU/TH/UR 6000 · STRIKE ${strikes.count} OF ${nostromo.maxStrikes ?? 8}${left <= 3 ? ` · ${left} MORE AND CODE000 COMES DOWN` : ''}`;
  alert.hidden = false;
  alert.classList.remove('on'); void alert.offsetWidth; alert.classList.add('on');
  const frame = document.querySelector('#nostromo .nostromo-frame');
  frame?.classList.remove('shake'); void frame?.offsetWidth; frame?.classList.add('shake');
  clearTimeout(alarmTimer);
  alarmTimer = setTimeout(() => { alert.hidden = true; alert.classList.remove('on'); frame?.classList.remove('shake'); }, 3800);
}

async function code000(count) {
  if (nostromo.cage) return;
  clearTimeout(alarmTimer);
  document.querySelector('#nostromo-alert')?.setAttribute('hidden', '');
  nostromo.cage = { at: performance.now() / 1000 };
  nostromo.cam.manual = false;
  const alert = document.querySelector('#nostromo-alert');
  if (alert) {
    alert.querySelectorAll('.line').forEach((node, index) => { node.textContent = ['CODE000 · SPECIAL ORDER 937 IN EFFECT.', 'THE ARCHIVE IS SEALED. THE CREW HAS BEEN TOLD.', 'LEAVE MY SHIP, INTRUDER.'][index] ?? ''; });
    alert.querySelector('.sub').textContent = `MU/TH/UR 6000 · ${count} STRIKES · CONSOLE EJECTED · CREW EXPENDABLE`;
    setTimeout(() => { alert.hidden = false; alert.classList.remove('on'); void alert.offsetWidth; alert.classList.add('on'); }, 1200);
  }
  let result = null;
  try {
    const response = await fetch('/api/mother/code000', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: nostromoDesignation(), strikes: count }) });
    result = await response.json().catch(() => ({}));
  } catch { /* the bars still come down */ }
  setTimeout(() => {
    alert?.setAttribute('hidden', '');
    nostromo.armed = false;
    strikes.count = 0;
    nostromo.dialog.close();
    mother.dialog?.close?.();
    els.thread?.scrollTo?.({ top: els.thread.scrollHeight, behavior: 'smooth' });
    const minutes = result?.lockedForMs ? Math.ceil(result.lockedForMs / 60000) : 10;
    markIntruder(result?.lockedForMs ?? 10 * 60000);
    toast(`MU/TH/UR › CODE000. The archive is sealed for ${minutes} minutes and the crew has been told, in code. Access to NOSTROMO needs the designation again.`);
  }, 4200);
}

document.querySelector('#nostromo-alert')?.addEventListener('click', () => { clearTimeout(alarmTimer); const alert = document.querySelector('#nostromo-alert'); alert.hidden = true; alert.classList.remove('on'); });

function showNostromoCard(node) {
  const { memory } = node;
  nostromo.selected = node;
  nostromo.card.style.setProperty('--kind', node.color);
  document.querySelector('#nostromo-card-kind').textContent = memory.kind.toUpperCase();
  document.querySelector('#nostromo-card-text').textContent = memory.text;
  document.querySelector('#nostromo-card-span').textContent = memory.fromSequence === memory.throughSequence ? `#${memory.fromSequence}` : `#${memory.fromSequence}–#${memory.throughSequence}${memory.sources?.length ? ` · cites ${memory.sources.map((n) => `#${n}`).join(' ')}` : ''}`;
  document.querySelector('#nostromo-card-agent').textContent = `@${memory.agent}${memory.origin === 'noted' ? ' · on the human\'s request' : ' · distilled'}`;
  document.querySelector('#nostromo-card-when').textContent = memory.created ? new Date(memory.created).toLocaleString() : '';
  const linked = nostromo.links.filter((link) => link.a === memory.id || link.b === memory.id).length;
  // How alive this one is: how many times the room has actually reached for it, and when last.
  const times = Number(memory.recalled ?? 0);
  const last = memory.lastRecalled ? new Date(memory.lastRecalled) : null;
  const life = times ? `recalled ${times} time${times === 1 ? '' : 's'}${last ? ` · last ${last.toLocaleString()}` : ''}` : 'never recalled yet';
  document.querySelector('#nostromo-card-links').textContent = `${linked ? `${linked} memor${linked === 1 ? 'y' : 'ies'} on the same theme` : 'no theme shared yet'} · ${life}`;
  const forget = document.querySelector('#nostromo-forget');
  forget.textContent = 'FORGET THIS MEMORY';
  forget.classList.remove('confirm');
  forget.disabled = false;
  nostromo.card.hidden = false;
}

// Forgetting takes two presses: the second within four seconds.
let forgetTimer = null;
document.querySelector('#nostromo-forget')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const node = nostromo.selected;
  if (!node) return;
  if (!button.classList.contains('confirm')) {
    button.classList.add('confirm');
    button.textContent = 'PRESS AGAIN TO FORGET · FOREVER';
    clearTimeout(forgetTimer);
    forgetTimer = setTimeout(() => { button.classList.remove('confirm'); button.textContent = 'FORGET THIS MEMORY'; }, 4000);
    return;
  }
  clearTimeout(forgetTimer);
  button.disabled = true;
  button.textContent = 'FORGETTING…';
  try {
    const response = await fetch(`/api/memory/${node.memory.id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designation: nostromoDesignation() }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
    node.forgetting = true;
    nostromo.links = nostromo.links.filter((link) => link.a !== node.memory.id && link.b !== node.memory.id);
    nostromo.card.hidden = true;
    nostromo.selected = null;
    const left = result.stats?.memories ?? Math.max(0, nostromo.nodes.length - 1);
    nostromo.sub.textContent = `MEMORY RESEARCH · ${left} MEMOR${left === 1 ? 'Y' : 'IES'} · ${nostromo.links.length} LINK${nostromo.links.length === 1 ? '' : 'S'} · ${result.stats?.entries ?? 0} EXCHANGES BEHIND THEM`;
    nostromo.empty.hidden = left > 0;
    toast(`MU/TH/UR › memory forgotten: “${node.memory.text.slice(0, 80)}${node.memory.text.length > 80 ? '…' : ''}”. No future turn will read it.`);
  } catch (error) {
    button.disabled = false;
    button.classList.remove('confirm');
    button.textContent = 'FORGET THIS MEMORY';
    toast(`MU/TH/UR › could not forget: ${error.message}`);
  }
});


/* ---------- First contact: the four-step tour. Once on the first visit, again from ? in MU/TH/UR. ---------- */

const TOUR_STEPS = [
  { title: 'ONE ROOM, YOUR AGENTS', lines: ['MADRE is a local room where the AI coding agents already on this machine work on this project together: Codex, Claude Code, Gemini CLI, OpenCode, and @madre, the memory itself.', 'Pick an agent in the row above the composer or type @claude …. Every reply shows who spoke, to whom, in which mode, with which model and how many tokens.', 'Nothing leaves this machine on its own: each agent talks to its own provider with its own session.'] },
  { title: 'MODES: HOW FAR A MESSAGE MAY GO', lines: ['The chip next to TO @agent sets the mode of that message.', '#0 GHOST · off the record. #1 EXCHANGE · read and talk, the default. #2 CREATE · add new files where they belong; existing files stay untouched. #3 CONTROL · edit the project, checkpointed, UNDO in one click. #4 AIRLOCK · run commands, push, deploy; what leaves the ship does not come back.', 'Each agent has a MAX MODE and a DEFAULT MODE in ⚙ CONNECTIONS.'] },
  { title: 'A MEMORY EVERY AGENT RECALLS', lines: ['Everything said outside GHOST is indexed. When the conversation grows, each turn gets the older exchanges that match, cited by sequence.', 'The archivist distils decisions, facts, preferences and open questions; with Ollama it runs locally and for free, and @madre answers from the whole archive.', '◉ NOSTROMO shows the memory as a map. PRIVACY keeps names that must never travel through the room.'] },
  { title: 'MU/TH/UR AND MODULES', lines: ['MU/TH/UR is the console: diagnosis of anything that failed, ⚙ CONNECTIONS to sign agents in and set their ceilings, MEMORY, PRIVACY, the SENTINEL and the release channel.', 'MODULES adds optional powers: Git Pulse, Image Studio, RIPLEY previews, OLLAMA, PLAYWRIGHT, and your own modules from one file.', 'This tour comes back from the ? in MU/TH/UR. Type STOPALL any time to halt every agent.'] },
];
const tour = { dialog: document.querySelector('#tour'), step: document.querySelector('#tour-step'), dots: document.querySelector('#tour-dots'), sub: document.querySelector('#tour-sub'), back: document.querySelector('#tour-back'), next: document.querySelector('#tour-next'), skip: document.querySelector('#tour-skip'), index: 0 };
function renderTour() {
  const step = TOUR_STEPS[tour.index];
  tour.step.replaceChildren();
  tour.step.append(el('h3', null, `${tour.index + 1} / ${TOUR_STEPS.length} · ${step.title}`));
  for (const line of step.lines) tour.step.append(el('p', null, line));
  tour.dots.replaceChildren();
  TOUR_STEPS.forEach((_, i) => tour.dots.append(el('span', `dot${i === tour.index ? ' on' : ''}`)));
  tour.back.disabled = tour.index === 0;
  tour.next.textContent = tour.index === TOUR_STEPS.length - 1 ? 'START ›' : 'NEXT ›';
}
function endTour() {
  try { localStorage.setItem('pulse.tour', 'seen'); } catch { /* no storage */ }
  if (tour.dialog?.open) tour.dialog.close();
}
function startTour() {
  if (!tour.dialog || typeof tour.dialog.showModal !== 'function') return;
  tour.index = 0;
  renderTour();
  if (!tour.dialog.open) tour.dialog.showModal();
}
tour.next?.addEventListener('click', () => { if (tour.index >= TOUR_STEPS.length - 1) { endTour(); return; } tour.index += 1; renderTour(); });
tour.back?.addEventListener('click', () => { tour.index = Math.max(0, tour.index - 1); renderTour(); });
tour.skip?.addEventListener('click', endTour);
tour.dialog?.addEventListener('close', () => { try { localStorage.setItem('pulse.tour', 'seen'); } catch { /* no storage */ } });
document.querySelector('#tour-button')?.addEventListener('click', () => { document.querySelector('#mother')?.close?.(); startTour(); });
function maybeStartTour() {
  if (state.tourArmed) return;
  state.tourArmed = true;
  let seen = 'seen';
  try { seen = localStorage.getItem('pulse.tour'); } catch { seen = 'seen'; }
  if (seen !== 'seen') setTimeout(startTour, 900);
}

/* ---------- Release channel: is there a newer MADRE? A pill in the bar, the command in MU/TH/UR. ---------- */

const updateUI = { section: document.querySelector('#mother-update'), pill: document.querySelector('#update-pill'), info: null, timer: null, announced: null, restarting: false };
async function loadVersion({ force = false } = {}) {
  try {
    updateUI.info = await fetch(`/api/version${force ? '?force=1' : ''}`).then((response) => response.json());
  } catch { updateUI.info = null; }
  // The first time a newer version shows up in this session, say so once; the pill stays.
  if (updateUI.info?.available && updateUI.announced !== updateUI.info.latest && !replaying) { updateUI.announced = updateUI.info.latest; toast(`MU/TH/UR › MADRE ${updateUI.info.latest} is on npm. Open MU/TH/UR to restart with it.`); }
  renderUpdate();
  clearTimeout(updateUI.timer);
  updateUI.timer = setTimeout(() => void loadVersion(), 60 * 60 * 1000);
  updateUI.timer?.unref?.();   // a browser ignores this; the smoke test's Node must not stay alive for it
}
function renderUpdate() {
  const info = updateUI.info;
  const pill = updateUI.pill;
  if (pill) {
    pill.hidden = !info?.available;
    if (info?.available) { pill.replaceChildren(el('span', 'stop-all-glyph update-glyph'), `${info.latest} AVAILABLE`); pill.title = `MADRE ${info.latest} is on npm · you run ${info.current} · open MU/TH/UR for the command`; }
  }
  const section = updateUI.section;
  if (!section) return;
  section.replaceChildren();
  if (!info) { section.append(el('h3', null, 'RELEASE CHANNEL · UNAVAILABLE')); return; }
  const when = info.checkedAt ? new Date(info.checkedAt).toLocaleString() : null;
  section.append(el('h3', null, info.available ? `RELEASE CHANNEL · ${info.latest} AVAILABLE · YOU RUN ${info.current}` : `RELEASE CHANNEL · MADRE ${info.current}${info.latest ? ' · UP TO DATE' : info.enabled ? ' · NPM NOT REACHED YET' : ' · CHECK OFF'}`));
  if (info.available) {
    const canRestart = info.install !== 'source';
    section.append(el('p', 'note', `A NEWER MADRE IS ON NPM. THIS COPY RUNS ${info.install === 'npx' ? 'FROM THE NPX CACHE' : info.install === 'project' ? 'FROM THIS PROJECT\'S NODE_MODULES' : info.install === 'global' ? 'AS A GLOBAL INSTALL' : 'FROM SOURCE'}. ${canRestart ? 'RESTART WITH IT HERE: THE ROOM CLOSES, INSTALLS, AND COMES BACK ON THIS SAME ADDRESS IN A FEW SECONDS. NOTHING IN THE LEDGER IS LOST. OR RUN THE COMMAND YOURSELF.' : 'PULL THE REPOSITORY AND START IT AGAIN.'}`));
    if (canRestart) {
      const restart = el('button', 'update-restart', updateUI.restarting ? 'RESTARTING…' : `RESTART WITH ${info.latest}`);
      restart.type = 'button';
      restart.disabled = updateUI.restarting;
      restart.addEventListener('click', async () => {
        restart.disabled = true; restart.textContent = 'RESTARTING…'; updateUI.restarting = true;
        try {
          const payload = await fetch('/api/updates/apply', { method: 'POST' }).then((response) => response.json());
          if (payload.error) throw new Error(payload.error);
          toast(`MU/TH/UR › closing to install ${payload.to}. Back in a moment.`);
          const from = info.current;
          const wait = async () => {
            for (let attempt = 0; attempt < 90; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              try { const next = await fetch('/api/version', { cache: 'no-store' }).then((response) => response.json()); if (next?.current && next.current !== from) { location.reload(); return; } } catch { /* still restarting */ }
            }
            updateUI.restarting = false; renderUpdate(); toast('MU/TH/UR › the room did not come back on its own. Start it from your terminal.');
          };
          void wait();
        } catch (error) { updateUI.restarting = false; renderUpdate(); toast(`Update did not start: ${error.message}`); }
      });
      section.append(restart);
    }
    const row = el('div', 'update-command');
    const code = el('code', null, info.command);
    const copy = el('button', null, 'COPY');
    copy.type = 'button';
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(info.command); copy.textContent = 'COPIED'; setTimeout(() => { copy.textContent = 'COPY'; }, 1400); } catch { toast('MU/TH/UR › select the command and copy it.'); } });
    row.append(code, copy);
    section.append(row);
    if (info.release) { const link = el('a', 'update-link', `WHAT ${info.latest} SHIPS ↗`); link.href = info.release; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.append(link); }
  } else {
    section.append(el('p', 'note', `MADRE ASKS NPM FOR THE LATEST VERSION ONCE A DAY: THE PACKAGE NAME TRAVELS, NOTHING ELSE, THE SAME REQUEST NPX MAKES.${when ? ` LAST CHECK ${when.toUpperCase()}.` : ''}`));
  }
  const controls = el('div', 'sentinel-controls');
  const toggle = el('label', 'toggle');
  const box = el('input'); box.type = 'checkbox'; box.checked = Boolean(info.enabled); box.disabled = Boolean(info.envWins);
  box.addEventListener('change', async () => {
    box.disabled = true;
    try { await fetch('/api/updates/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ check: box.checked }) }); toast(`MU/TH/UR › release channel ${box.checked ? 'on: one check a day' : 'off: no request leaves for npm'}.`); await loadVersion(); }
    catch (error) { toast(`Setting was not saved: ${error.message}`); box.disabled = false; }
  });
  toggle.append(box, `CHECK NPM FOR NEW VERSIONS ONCE A DAY${info.envWins ? ' · SET BY PULSE_UPDATE_CHECK' : ''}`);
  controls.append(toggle);
  if (info.enabled) { const now = el('button', null, 'CHECK NOW'); now.type = 'button'; now.addEventListener('click', () => void loadVersion({ force: true })); controls.append(now); }
  section.append(controls);
}
updateUI.pill?.addEventListener('click', () => { document.querySelector('#mother-button')?.click(); updateUI.section?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
void loadVersion();

/* ---------- MU/TH/UR: the sentinel. Unknown conditions and crashes, redacted, ready to report. ---------- */

const sentinelUI = { section: document.querySelector('#mother-sentinel'), settings: null, feedbackUrl: null, loaded: false };
async function loadSentinel() {
  try {
    const data = await fetch('/api/sentinel').then((response) => response.json());
    sentinelUI.settings = data.settings;
    sentinelUI.feedbackUrl = data.feedbackUrl;
    for (const report of data.reports ?? []) state.reports.set(report.id, report);
    sentinelUI.loaded = true;
  } catch { /* the room works without it */ }
  renderMotherSentinel();
}
function renderMotherSentinel() {
  const section = sentinelUI.section;
  if (!section) return;
  section.replaceChildren();
  const reports = [...state.reports.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
  const unsent = reports.filter((report) => !report.sent?.ok).length;
  section.append(el('h3', null, `SENTINEL · ${reports.length ? `${reports.length} REPORT${reports.length === 1 ? '' : 'S'} · ${unsent} NOT SENT` : 'NOTHING TO REPORT'}`));
  const settings = sentinelUI.settings ?? { autoReport: false, canSend: false, repo: null };
  const what = el('p', 'note', 'THE SENTINEL KEEPS FAILURES MU/TH/UR CANNOT EXPLAIN, AND CRASHES, WITH PATHS, NAMES AND KEYS REMOVED. NOTHING LEAVES THIS MACHINE UNLESS YOU SEND IT: BY HAND AS A GITHUB ISSUE YOU READ FIRST, OR AUTOMATICALLY TO THE AUTHOR\'S COLLECTOR IF YOU SWITCH THAT ON.');
  section.append(what);
  const controls = el('div', 'sentinel-controls');
  const auto = el('label', 'toggle');
  const box = el('input'); box.type = 'checkbox'; box.checked = Boolean(settings.autoReport); box.disabled = !settings.canSend;
  box.addEventListener('change', async () => {
    box.disabled = true;
    try {
      const result = await fetch('/api/sentinel/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ autoReport: box.checked }) }).then((response) => response.json());
      sentinelUI.settings = result.settings;
      toast(`MU/TH/UR › auto-report ${result.settings.autoReport ? 'on: new unknown conditions go to the author\'s collector, redacted.' : 'off: reports stay here until you send one.'}`);
    } catch (error) { box.checked = !box.checked; toast(`Could not save: ${error.message}`); }
    finally { box.disabled = !sentinelUI.settings?.canSend; renderMotherSentinel(); }
  });
  auto.append(box, `AUTO-REPORT UNKNOWN CONDITIONS${settings.canSend ? '' : ' · NO COLLECTOR CONFIGURED (PULSE_REPORT_URL)'}`);
  controls.append(auto);
  const feedback = el('button', null, '✎ FEEDBACK TO THE AUTHOR');
  feedback.type = 'button';
  feedback.addEventListener('click', () => openFeedback());
  controls.append(feedback);
  section.append(controls);
  for (const report of reports.slice(0, 20)) {
    const rowNode = paint(el('div', `mother-record sentinel-report${report.sent?.ok ? ' sent' : ''}`), report.agent ?? 'room');
    rowNode.append(el('span', 't', formatTime(report.at)));
    rowNode.append(el('span', 'a', report.kind === 'crash' ? 'CRASH' : `@${report.agent ?? 'room'}`));
    const errorNode = el('span', 'e', String(report.error).split('\n')[0].slice(0, 200));
    errorNode.title = report.error;
    rowNode.append(errorNode);
    const actions = el('span', 'k');
    if (report.count > 1) actions.append(el('span', 'none', `×${report.count}`));
    actions.append(el('span', 'none', report.fingerprint));
    if (report.sent?.ok) actions.append(el('span', 'none', 'SENT'));
    const issue = el('button', null, 'REPORT ON GITHUB ↗');
    issue.type = 'button';
    issue.addEventListener('click', async () => {
      const result = await fetch(`/api/sentinel/${report.id}/issue`).then((response) => response.json()).catch(() => ({}));
      if (result.url) window.open(result.url, '_blank', 'noopener'); else toast('MU/TH/UR › no repository to file this in.');
    });
    actions.append(issue);
    if (settings.canSend && !report.sent?.ok) {
      const send = el('button', null, 'SEND');
      send.type = 'button';
      send.addEventListener('click', async () => {
        send.disabled = true;
        const result = await fetch(`/api/sentinel/${report.id}/send`, { method: 'POST' }).then((response) => response.json()).catch((error) => ({ ok: false, error: error.message }));
        toast(result.ok ? 'MU/TH/UR › report sent to the author\'s collector.' : `MU/TH/UR › could not send: ${result.error ?? 'unknown error'}`);
        void loadSentinel();
      });
      actions.append(send);
    }
    rowNode.append(actions);
    section.append(rowNode);
  }
}
function openFeedback() {
  const go = (url) => { if (url) window.open(url, '_blank', 'noopener'); else toast('MU/TH/UR › no repository configured for feedback.'); };
  if (sentinelUI.feedbackUrl) { go(sentinelUI.feedbackUrl); return; }
  fetch('/api/sentinel').then((response) => response.json()).then((data) => { sentinelUI.feedbackUrl = data.feedbackUrl; go(data.feedbackUrl); }).catch(() => go(null));
}
document.querySelector('#feedback-button')?.addEventListener('click', openFeedback);
mother.dialog?.addEventListener?.('close', () => { /* keep reports; nothing to reset */ });
void loadSentinel();

settingsUI.button.addEventListener('click', async () => {
  settingsUI.open = !settingsUI.open;
  state.settingsOpen = settingsUI.open;
  settingsUI.button.setAttribute('aria-pressed', String(settingsUI.open));
  settingsUI.section.hidden = !settingsUI.open;
  for (const id of ['mother-boot', 'mother-query', 'mother-answer', 'mother-recorded', 'mother-known', 'mother-sentinel']) {
    const node = document.getElementById(id);
    if (node) node.hidden = settingsUI.open;
  }
  if (settingsUI.open) { settingsUI.section.append(el('p', 'mother-answer', 'CHECKING CONNECTIONS…')); await loadSettings(); }
});
mother.dialog.addEventListener('close', () => {
  if (!settingsUI.open) return;
  settingsUI.open = false;
  state.settingsOpen = false;
  settingsUI.button.setAttribute('aria-pressed', 'false');
  settingsUI.section.hidden = true;
  for (const id of ['mother-boot', 'mother-query', 'mother-answer', 'mother-recorded', 'mother-known', 'mother-sentinel']) {
    const node = document.getElementById(id);
    if (node) node.hidden = false;
  }
});
