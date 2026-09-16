import { brandOf } from './brands.js';

const els = {
  project: document.querySelector('#project'),
  agents: document.querySelector('#agents'),
  thread: document.querySelector('#messages'),
  onboarding: document.querySelector('#onboarding'),
  onboardingList: document.querySelector('#onboarding-list'),
  composer: document.querySelector('#composer'),
  picker: document.querySelector('#picker'),
  target: document.querySelector('#target'),
  input: document.querySelector('#message'),
  send: document.querySelector('#composer button[type="submit"]'),
  connection: document.querySelector('#connection'),
  toast: document.querySelector('#toast'),
};

const state = {
  agents: new Map(),
  budget: null,
  seen: new Set(),
  userMessages: new Map(), // messageId -> { text, target }
  lastSequence: 0,
  lastSender: null,        // for iMessage-style grouping of consecutive bubbles
};

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

function renderInline(text, into) {
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) into.append(text.slice(last, match.index));
    const [token] = match;
    if (match[1]) into.append(el('code', null, token.slice(1, -1)));
    else if (match[2]) into.append(el('strong', null, token.slice(2, -2)));
    else if (match[3]) into.append(el('em', null, token.slice(1, -1)));
    else if (match[4]) {
      const anchor = el('a', null, token.slice(1, token.indexOf(']')));
      const href = match[5];
      if (SAFE_URL.test(href)) {
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      into.append(anchor);
    }
    last = match.index + token.length;
  }
  if (last < text.length) into.append(text.slice(last));
}

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
      fragment.append(codeBlock(body, fence[1]));
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
      els.target.value = agent.id;
      renderPicker();
      els.input.focus();
    };
    pick.addEventListener('click', choose);
    pick.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); choose(); } });
    els.picker.append(pick);
  }
  const current = state.agents.get(els.target.value);
  if (current) {
    const text = paint(el('span', 'pick-label'), current.id);
    text.append('to ');
    text.append(el('b', null, `@${current.id}`));
    els.picker.append(text);
  }
}

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
  els.thread.querySelector('.empty')?.remove();
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
  const { messageId, target, text } = event.payload;
  state.userMessages.set(messageId, { text, target });
  const node = row('user');
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  col.append(el('div', 'bubble', text));
  const stamp = paint(el('div', 'stamp'), target);
  stamp.append(el('span', 'to', `→ @${target}`));
  stamp.append(el('span', null, formatTime(event.timestamp)));
  col.append(stamp);
  node.append(col);
  state.lastSender = 'you';
  return node;
}

function renderAssistantMessage(event) {
  const { messageId, parentMessageId, sender, text, status } = event.payload;
  const compact = state.lastSender === sender;
  const node = row('assistant', sender, { compact });
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  if (!compact || status === 'handoff') {
    const who = el('div', 'who');
    who.append(el('span', null, label(sender)));
    if (status === 'handoff') who.append(el('span', 'badge', 'handoff note'));
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
  col.append(bubble);
  const stamp = el('div', 'stamp');
  stamp.id = `usage-${messageId}`;
  stamp.append(el('span', null, formatTime(event.timestamp)));
  col.append(stamp);
  node.append(col);
  state.lastSender = sender;
  return node;
}

function renderThinking(event) {
  const { messageId, agent } = event.payload;
  const node = row('thinking', agent);
  node.id = `working-${messageId}`;
  const bubble = el('div', 'bubble');
  bubble.append(el('i'), el('i'), el('i'));
  bubble.title = `${label(agent)} is reading the project…`;
  node.append(bubble);
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

function renderFailure(event) {
  const { messageId, target, error, recovered } = event.payload;
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
  let node = null;
  switch (event.type) {
    case 'message.created':
      node = event.payload.role === 'user' ? renderUserMessage(event) : renderAssistantMessage(event);
      if (event.payload.role !== 'user') removeThinking(event.payload.parentMessageId);
      break;
    case 'agent.started': node = renderThinking(event); break;
    case 'agent.completed': removeThinking(event.payload.messageId); return;
    case 'message.failed': node = renderFailure(event); break;
    case 'handoff.created': node = renderHandoff(event); break;
    case 'limit.warning': node = renderWarning(event); break;
    case 'usage.recorded': applyUsage(event); return;
    case 'quota.updated': applyQuota(event); return;
    default: return;
  }
  removeEmpty();
  const stickToBottom = els.thread.scrollHeight - els.thread.scrollTop - els.thread.clientHeight < 120;
  els.thread.append(node);
  if (stickToBottom) scrollToEnd();
}

/* ---------- bootstrap ---------- */

const initial = await fetch('/api/state').then((response) => response.json());
els.project.textContent = initial.projectRoot.split('/').filter(Boolean).at(-1) || initial.projectRoot;
els.project.title = initial.projectRoot;
state.budget = Number.isFinite(initial.softTokenBudget) && initial.softTokenBudget > 0 ? initial.softTokenBudget : null;
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
  els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
};
els.input.addEventListener('input', autosize);
els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.composer.requestSubmit();
  }
});

els.composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  els.input.disabled = true;
  els.send.disabled = true;
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, target: els.target.value || null }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: `Request failed (${response.status}).` }));
      toast(result.error ?? 'The room rejected the message.');
    } else {
      els.input.value = '';
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
