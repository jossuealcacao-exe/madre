import { brandOf } from './brands.js';
import { CONDITIONS, detectPlatform, diagnose, fixesFor, PLATFORMS, searchConditions } from './troubleshooting.js';

const els = {
  project: document.querySelector('#project'),
  agents: document.querySelector('#agents'),
  thread: document.querySelector('#messages'),
  column: document.querySelector('#thread-inner'),
  crewLabel: document.querySelector('#crew-label'),
  onboarding: document.querySelector('#onboarding'),
  onboardingList: document.querySelector('#onboarding-list'),
  composer: document.querySelector('#composer'),
  picker: document.querySelector('#picker'),
  target: document.querySelector('#target'),
  input: document.querySelector('#message'),
  attach: document.querySelector('#attach'),
  createToggle: document.querySelector('#create-toggle'),
  fileInput: document.querySelector('#file-input'),
  attachments: document.querySelector('#attachments'),
  send: document.querySelector('#composer button[type="submit"]'),
  connection: document.querySelector('#connection'),
  toast: document.querySelector('#toast'),
};

const state = {
  agents: new Map(),
  budget: null,
  timeouts: {},
  seen: new Set(),
  userMessages: new Map(), // messageId -> { text, target }
  lastSequence: 0,
  lastSender: null,        // for iMessage-style grouping of consecutive bubbles
  failures: [],            // recorded conditions for MU/TH/UR
  expendable: false,       // easter egg armed: the next human message is reviewed by MOTHER
  running: new Map(),      // messageId -> agent, turns in flight
  plansRunning: new Set(),
  brakeArmed: false,       // STOP ALL is a brake against runaway sequences: armed only by MU/TH/UR alerts
  agentStats: new Map(),   // id -> { turns, lastTurnMs, lastTurnTokens, cost, started }
  sessions: {},            // id -> { state, detail } from the last probe
  loginLogs: new Map(),    // id -> streamed sign-in lines
  models: {},              // id -> { models, default, note } from /api/models
  capabilities: {},        // id -> { read, imageIn, write, imageGen, web }
  pending: [],             // attachments uploaded for the next message
  projectRoot: '',
  create: false,           // creation lease armed for the next message
  chosenModel: {},         // id -> model name picked in the composer
};
try { state.chosenModel = JSON.parse(localStorage.getItem('pulse.chosenModel') ?? '{}') || {}; } catch { state.chosenModel = {}; }

const AGENT_HINTS = {
  codex: 'Install the Codex CLI and sign in with your ChatGPT account.',
  claude: 'Install Claude Code and run `claude` once to sign in.',
  gemini: 'Install Gemini CLI and sign in or set GEMINI_API_KEY.',
  opencode: 'Install OpenCode and run `opencode auth login`.',
};

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
function toast(message) {
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
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(!\[[^\]\n]*\]\(([^)\s]+)\))|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;
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
async function openViewer({ root = 'project', path = null, url = null, label = null, line = null }) {
  const src = url ?? `/api/files?root=${root}&path=${encodeURIComponent(path)}`;
  viewer.path.textContent = label ?? (root === 'project' ? `/${path}` : path);
  viewer.open.href = src;
  viewer.body.replaceChildren(el('div', null, 'loading…'));
  viewer.dialog.showModal();
  try {
    const response = await fetch(src);
    if (!response.ok) { const err = await response.json().catch(() => ({})); viewer.body.replaceChildren(el('div', 'err', err.error ?? `HTTP ${response.status}`)); return; }
    const type = response.headers.get('content-type') ?? '';
    if (type.startsWith('image/')) { const img = el('img'); img.src = src; img.alt = viewer.path.textContent; viewer.body.replaceChildren(img); return; }
    if (type === 'application/pdf' || type.startsWith('video/') || type.startsWith('audio/')) {
      const frame = el(type === 'application/pdf' ? 'iframe' : type.startsWith('video/') ? 'video' : 'audio');
      frame.src = src; if (frame.tagName !== 'IFRAME') frame.controls = true;
      viewer.body.replaceChildren(frame); return;
    }
    const text = await response.text();
    const pre = el('pre');
    if (line) {
      const lines = text.split('\n');
      lines.forEach((content, index) => {
        const span = el('span', index + 1 === line ? 'hl' : null, `${content}\n`);
        if (index + 1 === line) span.style.background = 'color-mix(in srgb, var(--phosphor) 18%, transparent)';
        pre.append(span);
      });
    } else pre.textContent = text;
    viewer.body.replaceChildren(pre);
    if (line) pre.querySelector('.hl')?.scrollIntoView({ block: 'center' });
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

function renderAgents() {
  els.agents.replaceChildren();
  for (const agent of state.agents.values()) {
    const percent = state.budget && agent.tokens ? Math.min(100, (agent.tokens / state.budget) * 100) : 0;
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
      agent.tokens ? `${agent.tokens.toLocaleString()} local tokens · ${Math.round(percent)}% of local budget` : 'No local usage yet',
      Number.isFinite(agent.officialPercent) ? `Provider quota ${Math.round(agent.officialPercent)}% used` : 'Provider quota not published',
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
      els.target.value = agent.id;
      renderPicker();
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
    const chosen = state.chosenModel[current.id];
    const modelChip = el('button', 'model-chip', chosen ? `${chosen} ▾` : 'default model ▾');
    modelChip.type = 'button';
    modelChip.title = 'Choose the model for this agent';
    modelChip.addEventListener('click', (event) => { event.stopPropagation(); toggleModelMenu(current.id, modelChip); });
    text.append(modelChip);
    els.picker.append(text);
  }
  if (typeof renderCreateScopes === 'function') renderCreateScopes();
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

function renderOnboarding() {
  const ready = [...state.agents.values()].filter((agent) => agent.ready);
  els.onboarding.hidden = ready.length > 0;
  els.composer.setAttribute('aria-disabled', ready.length ? 'false' : 'true');
  els.input.disabled = !ready.length;
  els.send.disabled = !ready.length;
  if (ready.length) return;
  els.onboardingList.replaceChildren();
  for (const agent of state.agents.values()) {
    const item = paint(el('li'), agent.id);
    item.append(avatar(agent.id, { size: 28, status: agent.detected ? 'detected' : 'offline' }));
    item.append(el('span', 'name', agent.label));
    const status = el('span', 'state');
    status.append(el('b', null, agent.ready ? 'Ready' : agent.detected ? 'Installed, adapter not enabled' : 'Not installed'));
    status.append(` · ${agent.detected ? (agent.version ?? 'version unknown') : AGENT_HINTS[agent.id] ?? 'Install it and reload.'}`);
    item.append(status);
    els.onboardingList.append(item);
  }
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
  const { messageId, target, text, model, attachments = [], create } = event.payload;
  state.userMessages.set(messageId, { text, target, model });
  const reviewed = state.expendable;
  const node = row('user');
  if (reviewed) node.classList.add('expendable');
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  const who = el('div', 'who');
  who.append(el('b', null, reviewed ? 'YOU · CREW (EXPENDABLE)' : 'YOU · CREW'));
  if (create) who.append(el('span', 'badge lease', 'create'));
  col.append(who);
  const bubble = el('div', 'bubble', text);
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
  const { messageId, parentMessageId, sender, target, text, status, step, totalSteps, model } = event.payload;
  const delegated = status === 'delegated';
  const compact = state.lastSender === sender && !delegated;
  const node = row('assistant', sender, { compact });
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
  if (event.payload.artifacts?.length) bubble.append(artifactTiles(event.payload.artifacts));
  col.append(bubble);
  const stamp = el('div', 'stamp');
  stamp.id = `usage-${messageId}`;
  stamp.append(el('span', null, formatTime(event.timestamp)));
  col.append(stamp);
  node.append(col);
  state.lastSender = sender;
  return node;
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

function renderThinking(event) {
  const { messageId, agent } = event.payload;
  const node = row('thinking', agent);
  node.id = `working-${messageId}`;
  const bubble = el('div', 'bubble');
  bubble.append(el('i'), el('i'), el('i'));
  const elapsed = el('span', 'elapsed');
  bubble.append(elapsed);
  const startedAt = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
  const limitMs = state.timeouts[agent] ?? 180000;
  const limit = Math.round(limitMs / 1000);
  let timer = null;
  let wasConnected = false;
  const tick = () => {
    // Stop once the bubble has been in the document and was removed again.
    if (node.isConnected) wasConnected = true;
    else if (wasConnected && timer) { clearInterval(timer); return; }
    const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    elapsed.textContent = `${seconds}s / ${limit}s`;
    elapsed.classList.toggle('late', seconds >= limit * 0.6);
    bubble.title = `${label(agent)} is reading the project… ${seconds}s so far; PULSE gives up at ${limit}s.`;
  };
  tick();
  timer = setInterval(tick, 1000);
  timer.unref?.();
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
    ? ` · ${messageCount} message${messageCount === 1 ? '' : 's'} carried${omittedMessages ? ` · ${omittedMessages} older omitted` : ''}`
    : ' · no prior context');
  if (kind && kind !== 'automatic') node.append(` · ${kind}`);
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
  toast(`MU/TH/UR › ${message}`);
  state.lastSender = null;
  return node;
}

function renderLease(event) {
  const { agent, outDir, scopes = [], unavailable = [] } = event.payload;
  const node = el('div', 'system lease');
  node.style.setProperty('--agent', agentColor(agent));
  node.append(el('b', null, 'creation lease · '));
  node.append(`@${agent} may ${scopes.map((scope) => CAP_LABELS[scope] ?? scope).join(', ') || 'create files'}${unavailable.length ? ` (cannot ${unavailable.join(', ')})` : ''} in `);
  const link = el('a', 'file-link', outDir);
  link.href = '#';
  link.addEventListener('click', (ev) => { ev.preventDefault(); });
  node.append(link);
  state.lastSender = null;
  return node;
}

function attachArtifacts(event) {
  const { responseMessageId, files = [] } = event.payload;
  const bubble = document.getElementById(`msg-${responseMessageId}`)?.querySelector('.bubble');
  if (!bubble || bubble.querySelector('.artifacts')) return;
  bubble.append(artifactTiles(files));
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
  state.brakeArmed = true;
  updateStopAll();
  const node = el('div', 'system alert');
  node.append(el('b', null, 'MU/TH/UR › '));
  node.append(message.replace(/\s*Type STOPALL[^.]*\.?$/i, '').replace(/\s*STOPALL halts[^.]*\.?$/i, ''));
  node.append(el('span', 'cmd', 'STOPALL'));
  toast(`MU/TH/UR › ${message}`);
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
    node.append(`@${orchestrator} puts ${steps.map((step) => `@${step.agent}`).join(', ')} to work${closing ? ', then closes' : ''}`);
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
    entry.tokens = roomTotalTokens;
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
  const { agent, usedPercent } = event.payload;
  const entry = state.agents.get(agent);
  if (!entry) return;
  entry.officialPercent = usedPercent;
  renderAgents();
}

function renderEvent(event) {
  if (state.seen.has(event.id)) return;
  state.seen.add(event.id);
  state.lastSequence = Math.max(state.lastSequence, event.sequence ?? 0);
  try {
    renderEventNode(event);
  } catch (error) {
    // One malformed or unexpected event must never take the whole room down.
    console.error(`PULSE could not render event ${event.sequence} (${event.type}):`, error);
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
    case 'room.settings': return;
    case 'message.created':
      node = event.payload.role === 'user' ? renderUserMessage(event) : renderAssistantMessage(event);
      if (event.payload.role !== 'user') removeThinking(event.payload.parentMessageId);
      break;
    case 'agent.started': state.running.set(event.payload.messageId, event.payload.agent); updateStopAll(); node = renderThinking(event); break;
    case 'agent.completed': state.running.delete(event.payload.messageId); updateStopAll(); removeThinking(event.payload.messageId); return;
    case 'message.failed': state.running.delete(event.payload.messageId); updateStopAll(); node = renderFailure(event); break;
    case 'handoff.created': node = renderHandoff(event); break;
    case 'limit.warning': node = renderWarning(event); break;
    case 'usage.recorded': applyUsage(event); return;
    case 'quota.updated': applyQuota(event); return;
    case 'extension.install.started':
    case 'extension.install.finished':
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
    case 'plan.ignored': node = renderPlanIgnored(event); break;
    case 'artifacts.created': attachArtifacts(event); return;
    default: return;
  }
  removeEmpty();
  const stickToBottom = els.thread.scrollHeight - els.thread.scrollTop - els.thread.clientHeight < 120;
  els.column.append(node);
  if (stickToBottom) scrollToEnd();
}

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
  els.crewLabel.textContent = 'CREW · EXPENDABLE ›';
  els.input.placeholder = 'Type here, human. MOTHER is listening.';
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
  els.crewLabel.textContent = 'HUMAN ›';
  els.input.placeholder = 'Type here, human. Ask the room…';
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
state.budget = Number.isFinite(initial.softTokenBudget) && initial.softTokenBudget > 0 ? initial.softTokenBudget : null;
state.timeouts = initial.timeouts ?? {};
state.sessions = initial.sessions ?? {};
state.capabilities = initial.capabilities ?? {};
state.projectRoot = initial.projectRoot ?? '';
for (const plan of initial.plans ?? []) state.plansRunning.add(plan.planId);
updateStopAll();
for (const agent of initial.agents) {
  state.agents.set(agent.id, { ...agent, tokens: 0, officialPercent: null });
  if (agent.ready) els.target.add(new Option(agent.label, agent.id));
}
if (!els.target.options.length) els.target.add(new Option('No agent ready', ''));
renderAgents();
renderPicker();
renderOnboarding();
for (const event of initial.events) renderEvent(event);
scrollToEnd();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { renderAgents(); renderPicker(); });

/* ---------- live stream ---------- */

function setConnection(value) {
  els.connection.dataset.state = value;
  els.connection.querySelector('.connection-label').textContent = value;
}
const stream = new EventSource(`/api/events?since=${state.lastSequence}`);
stream.onopen = () => setConnection('live');
stream.onerror = () => setConnection('reconnecting');
stream.onmessage = ({ data }) => renderEvent(JSON.parse(data));

/* ---------- composer ---------- */

const autosize = () => {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, state.create ? 320 : 180)}px`;
};
els.input.addEventListener('input', autosize);
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
els.createToggle.addEventListener('click', () => {
  state.create = !state.create;
  els.createToggle.setAttribute('aria-pressed', String(state.create));
  renderCreateScopes();
  els.composer.classList.toggle('creating', state.create);
  els.crewLabel.textContent = state.create ? 'HUMAN · CREATE ›' : (state.expendable ? 'CREW · EXPENDABLE ›' : 'HUMAN ›');
  els.input.placeholder = state.create ? 'Creation lease on: describe what to create, where it goes (.pulse/out/), and how it should look.' : 'Type here, human. Ask the room…';
  autosize();
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
  els.input.disabled = true;
  els.send.disabled = true;
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, target: els.target.value || null, model: state.chosenModel[els.target.value] ?? null, attachments: ready.map((item) => item.id), create: state.create }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: `Request failed (${response.status}).` }));
      toast(result.error ?? 'The room rejected the message.');
    } else {
      els.input.value = '';
      state.pending = [];
      renderPendingAttachments();
      if (state.create) els.createToggle.click(); // one lease per message; the human re-arms explicitly
      autosize();
    }
  } catch (error) {
    toast(`Could not reach PULSE: ${error.message}`);
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

function conditionCard(condition, { hit = false, agent = null } = {}) {
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
  const remedy = el('p');
  remedy.append(el('b', null, 'REMEDY'));
  remedy.append(condition.remedy);
  card.append(remedy);
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
  mother.recorded.append(el('h3', null, `RECORDED CONDITIONS · THIS ROOM · ${state.failures.length}`));
  if (!state.failures.length) {
    mother.recorded.append(el('p', 'mother-answer', 'NO CONDITIONS RECORDED. ALL SYSTEMS NOMINAL.'));
    return;
  }
  for (const failure of [...state.failures].reverse().slice(0, 40)) {
    const rowNode = paint(el('div', 'mother-record'), failure.agent);
    rowNode.append(el('span', 't', formatTime(failure.time)));
    rowNode.append(el('span', 'a', failure.agent ?? 'room'));
    rowNode.append(el('span', 'e', String(failure.error).split('\n')[0].slice(0, 220)));
    const matches = diagnose(failure.error, failure.agent);
    const links = el('span', 'k');
    if (!matches.length) links.append(el('span', 'none', 'UNCLASSIFIED'));
    for (const condition of matches) {
      const jump = el('button', null, condition.id);
      jump.type = 'button';
      jump.addEventListener('click', () => {
        mother.input.value = '';
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
  mother.known.append(el('h3', null, `KNOWN CONDITIONS · ${list.length} OF ${CONDITIONS.length} · ${PLATFORMS[mother.platform].label.toUpperCase()} / ${PLATFORMS[mother.platform].shell.toUpperCase()}`));
  const grid = el('div', 'mother-grid');
  const ordered = [...list].sort((a, b) => Number(hits.has(b.id)) - Number(hits.has(a.id)));
  for (const condition of ordered) grid.append(conditionCard(condition, { hit: hits.has(condition.id), agent: agent && condition.perAgent ? agent : null }));
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
  }
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
    modules.items = data.extensions ?? [];
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

function moduleCard(item) {
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
    confirm.append(el('span', 'warn', 'THIS WRITES INTO THE PROJECT. PULSE WILL RUN, IN THE PROJECT FOLDER:'));
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
  const percent = state.budget && agent.tokens ? Math.min(100, (agent.tokens / state.budget) * 100) : 0;
  paint(pop, id);
  pop.replaceChildren();
  const head = el('div', 'head');
  head.append(avatar(id, { size: 24 }));
  head.append(el('b', null, agent.label));
  head.append(el('span', 'vendor', brandOf(id).vendor));
  pop.append(head);
  const big = el('div', 'big', formatTokens(agent.tokens ?? 0) || '0');
  big.append(el('small', null, `tokens · this room`));
  pop.append(big);
  const gauge = el('div', `gauge${percent >= 80 ? ' hot' : ''}`);
  const fill = el('i'); fill.style.width = `${percent}%`; gauge.append(fill);
  pop.append(gauge);
  const dl = el('dl');
  const row = (k, v, cls) => { dl.append(el('dt', null, k)); dl.append(el('dd', cls, v)); };
  row('local budget', state.budget ? `${Math.round(percent)}% of ${formatTokens(state.budget)}` : 'unbounded');
  row('turns', String(stats.turns));
  row('last turn', `${fmtMs(stats.lastTurnMs)}${stats.lastTurnTokens ? ` · ${formatTokens(stats.lastTurnTokens)} tok` : ''}`);
  if (stats.cost > 0) row('cost (reported)', `$${stats.cost.toFixed(2)}`);
  row('session', session ? session.state.replace('-', ' ') : agent.ready ? 'unknown' : 'not ready', session?.state === 'signed-in' ? 'on' : session?.state === 'signed-out' ? 'off' : null);
  if (session?.detail) row('via', session.detail);
  row('provider quota', Number.isFinite(agent.officialPercent) ? `${Math.round(agent.officialPercent)}% used` : 'not published');
  row('timeout', `${Math.round((state.timeouts[id] ?? 180000) / 1000)}s`);
  if (agent.version) row('version', agent.version);
  pop.append(dl);
  pop.append(capabilityBadges(id));
  pop.append(el('div', 'foot', 'local counts, not the provider\'s bill · ⚙ connections in MU/TH/UR'));
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
  if (finished) { state.sessions[agent] = session ?? state.sessions[agent]; if (state.settingsOpen) void loadSettings(); }
  state.lastSender = null;
  return node;
}
function appendLoginOutput(event) {
  const { agent, line, url } = event.payload;
  const log = state.loginLogs.get(agent) ?? [];
  log.push({ line, url });
  state.loginLogs.set(agent, log.slice(-60));
  const box = document.getElementById(`login-log-${agent}`);
  if (box) { box.append(loginLine({ line, url })); box.scrollTop = box.scrollHeight; }
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
  card.append(meta);
  const scopes = el('div', 'scopes');
  const agentScopes = settingsUI.data.settings.capabilities?.[agent.id]?.scopes ?? {};
  for (const [key, labelText] of [['write', 'CREATE FILES'], ['imageGen', 'GENERATE IMAGES'], ['web', 'WEB ACCESS']]) {
    const scope = agentScopes[key] ?? { capable: false, enabled: false, wired: false };
    const line = el('label', `scope${!scope.capable || !scope.wired ? ' unavailable' : ''}`);
    const box = el('input'); box.type = 'checkbox'; box.checked = Boolean(scope.enabled); box.disabled = !scope.capable || !scope.wired;
    box.dataset.agent = agent.id; box.dataset.scope = key; box.className = 'scope-input';
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
  card.append(scopes);

  const row = el('div', 'row');
  const recheck = el('button', null, 'RECHECK');
  recheck.type = 'button';
  recheck.addEventListener('click', async () => {
    recheck.disabled = true;
    const result = await fetch('/api/agents/probe', { method: 'POST' }).then((response) => response.json()).catch(() => null);
    if (result?.sessions) { settingsUI.data.sessions = result.sessions; state.sessions = result.sessions; renderSettings(); }
    recheck.disabled = false;
  });
  row.append(recheck);
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
  if (agent.detected && agent.login && !agent.login.headless) slot.append(commandBlock([agent.login.display, `# ${agent.login.note}`]));
  card.append(slot);

  const timeout = el('label');
  timeout.append(`TIMEOUT · SECONDS`);
  const input = el('input');
  input.type = 'number'; input.min = '10'; input.step = '10';
  input.value = String(Math.round((settingsUI.data.settings.timeouts[agent.id] ?? 180000) / 1000));
  input.dataset.agent = agent.id;
  input.className = 'timeout-input';
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
  section.append(el('p', 'note', 'EACH AGENT KEEPS ITS OWN CREDENTIALS IN ITS OWN CLI. PULSE ONLY ASKS THE CLI WHETHER IT IS SIGNED IN, AND CAN START THE CLI\'S OWN SIGN-IN FOR YOU.'));
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
}

function askMotherAbout(conditionId) {
  // Leave the settings view and put the matching MU/TH/UR card front and centre.
  if (settingsUI.open) settingsUI.button.click();
  mother.input.value = conditionId;
  answerQuery(conditionId);
  setTimeout(() => document.getElementById(`mother-${conditionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

settingsUI.button.addEventListener('click', async () => {
  settingsUI.open = !settingsUI.open;
  state.settingsOpen = settingsUI.open;
  settingsUI.button.setAttribute('aria-pressed', String(settingsUI.open));
  settingsUI.section.hidden = !settingsUI.open;
  for (const id of ['mother-boot', 'mother-query', 'mother-answer', 'mother-recorded', 'mother-known']) {
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
  for (const id of ['mother-boot', 'mother-query', 'mother-answer', 'mother-recorded', 'mother-known']) {
    const node = document.getElementById(id);
    if (node) node.hidden = false;
  }
});
