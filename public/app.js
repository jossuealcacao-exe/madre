const project = document.querySelector('#project');
const agentsElement = document.querySelector('#agents');
const messages = document.querySelector('#messages');
const composer = document.querySelector('#composer');
const target = document.querySelector('#target');
const input = document.querySelector('#message');
const seen = new Set();

function escapeHtml(text) {
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
}

function renderEvent(event) {
  if (seen.has(event.id)) return;
  seen.add(event.id);
  if (!['message.created', 'message.failed', 'agent.started', 'limit.warning', 'handoff.created'].includes(event.type)) return;
  messages.querySelector('.empty')?.remove();
  const payload = event.payload;
  const item = document.createElement('article');
  if (event.type === 'message.created') {
    item.className = `message ${payload.role}`;
    item.innerHTML = `<div class="meta">${escapeHtml(payload.sender)}</div><div class="bubble">${escapeHtml(payload.text)}</div>`;
  } else if (event.type === 'agent.started') {
    item.className = 'message status';
    item.id = `working-${payload.messageId}`;
    item.innerHTML = `<div class="bubble">${escapeHtml(payload.agent)} is thinking…</div>`;
  } else if (event.type === 'limit.warning') {
    item.className = `message warning ${payload.level}`;
    item.innerHTML = `<div class="meta">PULSE LIMIT SENTINEL</div><div class="bubble">${escapeHtml(payload.message)}</div>`;
  } else if (event.type === 'handoff.created') {
    item.className = 'message status handoff';
    item.innerHTML = `<div class="meta">DURABLE HANDOFF</div><div class="bubble">Context transferred from @${escapeHtml(payload.fromAgent)} to @${escapeHtml(payload.toAgent)} · ${payload.messageCount} message(s)</div>`;
  } else {
    document.querySelector(`#working-${payload.messageId}`)?.remove();
    item.className = 'message error';
    item.innerHTML = `<div class="bubble">${escapeHtml(payload.error)}</div>`;
  }
  if (event.type === 'message.created' && payload.role === 'assistant') {
    document.querySelector(`#working-${payload.parentMessageId}`)?.remove();
  }
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

const state = await fetch('/api/state').then((response) => response.json());
project.textContent = state.projectRoot.split('/').filter(Boolean).at(-1) || state.projectRoot;
for (const agent of state.agents) {
  const badge = document.createElement('span');
  badge.className = `agent ${agent.ready ? 'ready' : agent.detected ? 'detected' : 'offline'}`;
  badge.textContent = agent.label;
  badge.title = agent.ready ? 'Ready' : agent.detected ? 'Detected; adapter pending' : 'Not installed';
  agentsElement.append(badge);
  if (agent.ready) target.add(new Option(agent.label, agent.id));
}
if (!target.options.length) target.add(new Option('No agent ready', ''));
for (const event of state.events) renderEvent(event);

const stream = new EventSource(`/api/events?since=${state.events.at(-1)?.sequence ?? 0}`);
stream.onmessage = ({ data }) => renderEvent(JSON.parse(data));

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, target: target.value || null }),
  });
  if (!response.ok) {
    const result = await response.json();
    alert(result.error);
  }
  input.disabled = false;
  input.focus();
});
