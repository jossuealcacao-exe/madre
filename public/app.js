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
  failures: [],            // recorded conditions for MU/TH/UR
  expendable: false,       // easter egg armed: the next human message is reviewed by MOTHER
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
  const { messageId, target, text } = event.payload;
  state.userMessages.set(messageId, { text, target });
  const reviewed = state.expendable;
  const node = row('user');
  if (reviewed) node.classList.add('expendable');
  node.id = `msg-${messageId}`;
  const col = el('div', 'col');
  const who = el('div', 'who');
  who.append(el('b', null, reviewed ? 'YOU · CREW (EXPENDABLE)' : 'YOU · CREW'));
  col.append(who);
  col.append(el('div', 'bubble', text));
  const stamp = paint(el('div', 'stamp'), target);
  stamp.append(el('span', 'to', `→ @${target}`));
  stamp.append(el('span', null, formatTime(event.timestamp)));
  if (reviewed) stamp.append(el('span', null, 'acknowledged, human'));
  col.append(stamp);
  node.append(col);
  state.lastSender = 'you';
  if (reviewed) disarmExpendable();
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
    case 'extension.install.started':
    case 'extension.install.finished':
      node = renderModuleEvent(event);
      break;
    case 'extension.install.output': appendModuleOutput(event); return;
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
  const { id, name, command, platforms = [], ok, code, error, status } = event.payload;
  const node = el('div', `system module${event.type.endsWith('finished') && !ok ? ' failed' : ''}`);
  node.append(el('b', null, 'MODULES › '));
  if (event.type === 'extension.install.started') {
    node.append(`installing ${name}${platforms.length ? ` for ${platforms.map((p) => `@${p}`).join(', ')}` : ''} · `);
    node.append(el('span', null, command));
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
    running ? 'INSTALLING' : item.status?.installed ? `INSTALLED${item.status.detail ? ` · ${item.status.detail}` : ''}` : 'NOT IN THIS PROJECT');
  head.append(stateTag);
  card.append(head);
  card.append(el('p', null, item.summary));
  const creates = el('ul');
  for (const line of item.creates ?? []) creates.append(el('li', null, line));
  card.append(creates);

  const actions = el('div', 'actions');
  if (modules.confirming === item.id) {
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
    install.disabled = Boolean(modules.installing);
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
