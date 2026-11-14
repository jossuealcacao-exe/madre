// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «En marcha» (2026-10-30): a key on the bar with how many things MADRE is doing, and under it a
// panel with each one — the agents answering, the plans, the commands and servers, an install —
// in every project open on this computer, what ended a moment ago, and the reminders coming. A
// person sees and stops it all from there, without a terminal. The server says it (src/activity.mjs,
// GET /api/activity?everywhere=1); a project's page and Home's mount the same panel.
import { language, t } from './i18n.js';
import { brandOf } from './brands.js';
import { trazo } from './icons.js';

// How often it asks: often while the panel is open, seldom for the number on the key, never while
// the page is out of sight.
const OPEN_EVERY_MS = 1500;
const CLOSED_EVERY_MS = 5000;

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
function ago(at, now = Date.now()) {
  const minutes = Math.round((Date.parse(at) - now) / 60000);
  if (Math.abs(minutes) < 1) return t('just now');
  const words = new Intl.RelativeTimeFormat(language() === 'en' ? 'en' : 'es-MX', { numeric: 'auto', style: 'short' });
  return Math.abs(minutes) < 60 ? words.format(minutes, 'minute') : words.format(Math.round(minutes / 60), 'hour');
}
// What a project is called in the panel: its folder's name, or the Coordinator for Home's own chats.
const whereOf = (project) => (project.home ? t('Coordinator') : project.name ?? project.room);
// What runs, counted for the key: a plan once (its steps are inside it), never an outdated project.
const counted = (one) => one.kind !== 'turn' || !one.planId;

// A step's permission in the words the box uses (#1 Just chat … #4 Full access).
const MODE_WORDS = { 0: () => t('Not saved'), 1: () => t('Just chat'), 2: () => t('Can create'), 3: () => t('Can edit'), 4: () => t('Full access') };

function avatar(agent, { busy = false } = {}) {
  const brand = brandOf(agent);
  const face = el('span', `ap-av${busy ? ' busy' : ''}`);
  face.style.setProperty('--ap-c', brand.color);
  face.style.color = brand.ink;
  face.innerHTML = brand.mark(); // trusted: the brands' own SVG
  face.title = brand.label;
  return face;
}
function sysAvatar(icon, { busy = false } = {}) {
  const face = el('span', `ap-av sys${busy ? ' busy' : ''}`);
  face.innerHTML = trazo(icon); // trusted: our own SVG
  return face;
}

/**
 * Mounts «En marcha» on a key of the bar.
 * key: the button; badge: where the number goes; openChat({ project, chat, messageId }) opens a
 * conversation of THIS page's project (a project elsewhere opens in its own tab); toast(words).
 */
export function mountActivity({ key, badge, openChat, toast = () => {} }) {
  if (!key) return null;
  const state = { data: null, said: '', open: false, timer: 0, ticking: 0, opened: new Set(), seen: new Set(), confirmAll: 0, failing: 0, pressing: false, stale: false };
  const panel = el('div', 'activity-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', t('Running now'));
  panel.hidden = true;
  document.body.append(panel);
  key.setAttribute('aria-haspopup', 'dialog');
  key.setAttribute('aria-expanded', 'false');

  async function load() {
    try {
      const response = await fetch('/api/activity?everywhere=1', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const answer = await response.json();
      // Drawn again only when something changed: a panel rebuilt every second and a half swallowed
      // the click that landed between two drawings, and took the keyboard's place away. The clocks
      // move on their own (the tickers).
      const said = JSON.stringify({ projects: answer.projects, soon: answer.soon });
      const changed = said !== state.said || state.failing > 0;
      state.data = { ...answer, received: Date.now() };
      state.said = said;
      state.failing = 0;
      paintKey();
      if (state.open && changed) repaint();
      return;
    } catch {
      state.failing += 1;
    }
    paintKey();
    if (state.open) repaint();
  }
  // Never under a finger: what changed while the person presses waits until they let go.
  function repaint() {
    if (state.pressing) { state.stale = true; return; }
    paint();
  }
  panel.addEventListener('pointerdown', () => { state.pressing = true; });
  const letGo = () => { if (!state.pressing) return; state.pressing = false; if (state.stale) { state.stale = false; setTimeout(() => { if (state.open) paint(); }, 0); } };
  document.addEventListener?.('pointerup', letGo, true);
  document.addEventListener?.('pointercancel', letGo, true);
  function schedule() {
    clearTimeout(state.timer);
    if (document.visibilityState === 'hidden') return;
    state.timer = setTimeout(async () => { await load(); schedule(); }, state.open ? OPEN_EVERY_MS : CLOSED_EVERY_MS);
    // Where timers can hold a process open (the tests run this page in Node), this one never does.
    state.timer?.unref?.();
  }
  document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible') { void load(); schedule(); } else clearTimeout(state.timer); });

  const projects = () => (state.data?.projects ?? []).filter((one) => !one.outdated);
  const running = () => projects().flatMap((project) => (project.now ?? []).filter(counted).map((one) => ({ project, one })));

  function paintKey() {
    const n = running().length;
    key.classList.toggle('working', n > 0);
    key.title = n ? t('Running now · {n}', { n }) : t('Running now · nothing at the moment');
    key.setAttribute('aria-label', key.title);
    if (badge) { badge.hidden = !n; badge.textContent = n ? String(n) : ''; }
  }

  // Where an action goes: the project it belongs to, through this page's own server.
  async function stop(project, item) {
    const body = { room: project.here ? null : project.room, kind: item.kind, chat: item.chat ?? null, messageId: item.messageId, planId: item.planId, id: item.id };
    const response = await fetch('/api/activity/stop', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const answer = await response?.json().catch(() => ({}));
    if (!response?.ok) toast(answer?.error ?? t('It could not be stopped. Try again.'));
    await load();
  }
  async function stopAll() {
    const response = await fetch('/api/activity/stop-all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    if (!response?.ok) toast(t('It could not be stopped. Try again.'));
    state.confirmAll = 0;
    await load();
  }
  function goTo(project, chat, messageId) {
    if (!chat) return;
    if (project.here) { close(); openChat?.({ chat, messageId }); return; }
    window.open(`http://127.0.0.1:${project.port}/#chat=${encodeURIComponent(chat)}${messageId ? `:${encodeURIComponent(messageId)}` : ''}`, '_blank', 'noopener');
  }

  // One line of the panel, folded or open: what it is, where, how long, and what can be done.
  function row({ id, face, title, sub, time, timeTone = '', progress = null, more = null, tint = null }) {
    const open = state.opened.has(id);
    const box = el('div', `ap-row${open ? ' open' : ''}`);
    if (tint) box.style.setProperty('--ap-c', tint);
    const line = el('button', 'ap-line');
    line.type = 'button';
    line.setAttribute('aria-expanded', String(open));
    const words = el('span', 'ap-words');
    words.append(el('b', null, title), el('span', null, sub));
    const when = el('span', `ap-time${timeTone ? ` ${timeTone}` : ''}`);
    if (typeof time === 'function') { when.dataset.tick = '1'; when.textContent = time(); state.tickers.push(() => { when.textContent = time(); }); } else when.textContent = time ?? '';
    const chev = el('span', 'ap-chev');
    chev.innerHTML = trazo('next'); // trusted: our own SVG
    line.append(face, words, when, chev);
    if (progress) {
      const bar = el('span', 'ap-bar');
      const fill = el('i');
      const set = () => { fill.style.width = `${Math.round(Math.min(1, Math.max(0, progress())) * 100)}%`; };
      set();
      state.tickers.push(set);
      bar.append(fill);
      line.append(bar);
    }
    line.addEventListener('click', () => { if (state.opened.has(id)) state.opened.delete(id); else state.opened.add(id); paint(); });
    box.append(line);
    if (open && more) {
      const inside = el('div', 'ap-more');
      more(inside);
      box.append(inside);
    }
    return box;
  }
  const actions = (...buttons) => {
    const bar = el('div', 'ap-acts');
    for (const [words, tone, act] of buttons) {
      const button = el('button', tone || null, words);
      button.type = 'button';
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        button.disabled = true;
        try { await act(); } finally { button.disabled = false; }
      });
      bar.append(button);
    }
    return bar;
  };
  const skew = () => (state.data?.at ? Date.parse(state.data.at) - (state.data.received ?? Date.now()) : 0);
  const since = (at) => () => Date.now() + skew() - at;

  // An AI's own subagents, one chip each: what it was given, and whether it is still at it.
  function subChips(helpers) {
    const chips = el('div', 'ap-subs');
    for (const one of helpers) {
      const chip = el('span', `ap-sub ${one.status}`);
      chip.append(el('i'), el('b', null, one.kind ?? t('subagent')), document.createTextNode(` ${one.task ?? ''}`));
      if (Number.isFinite(one.seconds)) chip.append(el('em', null, clock(one.seconds * 1000)));
      chips.append(chip);
    }
    return chips;
  }

  function nowRow(project, item, steps) {
    const where = [whereOf(project), item.chatTitle].filter(Boolean).join(' · ');
    const uid = `${project.room}:${item.kind}:${item.messageId ?? item.planId ?? item.id ?? item.what}`;
    if (item.kind === 'turn') {
      const helpers = item.subagents ?? [];
      const busy = helpers.filter((one) => one.status === 'running').length;
      const doing = busy ? t('{n} subagents at work', { n: busy }) : t('Working on it…');
      return row({
        id: uid, face: avatar(item.agent, { busy: true }), tint: brandOf(item.agent).color,
        title: item.text || t('A turn of {agent}', { agent: brandOf(item.agent).label }),
        sub: `${where} · ${doing}`,
        time: item.timeoutMs ? () => t('{now} of {limit}', { now: clock(since(item.startedAt)()), limit: clock(item.timeoutMs) }) : () => clock(since(item.startedAt)()),
        progress: item.timeoutMs ? () => since(item.startedAt)() / item.timeoutMs : null,
        more: (inside) => {
          if (helpers.length) inside.append(subChips(helpers));
          inside.append(el('p', 'ap-meta', `${t('Permission: {mode}', { mode: `#${item.mode ?? 1} ${MODE_WORDS[item.mode ?? 1]?.() ?? ''}`.trim() })}${item.timeoutMs ? ` · ${t('it has up to {limit} to answer', { limit: clock(item.timeoutMs) })}` : ''}`));
          inside.append(actions([t('Go to the chat'), 'go', () => goTo(project, item.chat, item.messageId)], [t('Stop'), 'stop', () => stop(project, item)]));
        },
      });
    }
    if (item.kind === 'plan') {
      // A plan reads as a road (2026-11-14, the author: «Plan actual is very confusing»): who made it
      // and what it is for, one segment per step on a bar, and each step on a line of its own — the
      // AI's face, what it was asked, with which permission, and whether it is done, at work or
      // waiting its turn. Open by default the first time it shows.
      if (!state.seen.has(uid)) { state.seen.add(uid); state.opened.add(uid); }
      const listed = item.steps ?? [];
      const closes = item.total > listed.length;
      const stepNow = Math.max(1, item.step);
      const working = steps[0] ? brandOf(steps[0].agent).label : null;
      const others = new Set(listed.map((one) => one.agent).filter((one) => one !== item.orchestrator));
      return row({
        id: uid, face: avatar(item.orchestrator, { busy: true }), tint: brandOf(item.orchestrator).color,
        title: others.size ? t('{agent} puts {n} AIs to work', { agent: brandOf(item.orchestrator).label, n: others.size }) : t('Plan by {agent} · {n} steps', { agent: brandOf(item.orchestrator).label, n: item.total }),
        sub: `${where} · ${t('Step {step} of {total}', { step: stepNow, total: item.total })}${working ? ` · ${t('{agent} is answering', { agent: working })}` : ''}`,
        time: () => clock(since(item.startedAt)()),
        progress: () => Math.max(0, item.step - 1) / Math.max(1, item.total),
        more: (inside) => {
          inside.classList.add('ap-plan');
          inside.append(el('p', 'ap-plan-lead', t('{agent} split the request into {n} steps. Each AI works when the one before it finishes, and its answer reaches the next.', { agent: brandOf(item.orchestrator).label, n: item.total })));
          const road = [...listed.map((step) => ({ agent: step.agent, text: step.text, mode: step.mode })), ...(closes ? [{ agent: item.orchestrator, text: t('reads the answers and gives you the final answer'), closing: true }] : [])];
          // One segment per step, in each AI's colour: full when done, breathing while at work.
          const segs = el('div', 'ap-segs');
          segs.setAttribute('aria-hidden', 'true');
          road.forEach((step, index) => {
            const seg = el('i', index + 1 < stepNow ? 'done' : index + 1 === stepNow ? 'now' : 'wait');
            seg.style.setProperty('--seg', brandOf(step.agent).color);
            segs.append(seg);
          });
          inside.append(segs);
          const list = el('ol', 'ap-road');
          road.forEach((step, index) => {
            const at = index + 1 < stepNow ? 'done' : index + 1 === stepNow ? 'now' : 'wait';
            const li = el('li', `ap-step ${at}${step.closing ? ' closing' : ''}`);
            const mark = el('span', 'ap-step-mark');
            mark.append(avatar(step.agent, { busy: at === 'now' }));
            const badge = el('span', `ap-step-badge ${at}`);
            if (at === 'done') badge.innerHTML = trazo('check'); // trusted: our own SVG
            else badge.textContent = String(index + 1);
            mark.append(badge);
            const words = el('div', 'ap-step-words');
            const head = el('div', 'ap-step-head');
            head.append(el('b', null, brandOf(step.agent).label));
            if (Number.isInteger(step.mode)) head.append(el('span', `ap-step-mode m${step.mode}`, MODE_WORDS[step.mode]?.() ?? `#${step.mode}`));
            const said = el('span', `ap-step-state ${at}`);
            const turn = at === 'now' ? steps.find((one) => one.agent === step.agent) : null;
            const sayState = () => (at === 'done' ? t('Done') : at === 'now' ? (turn ? t('Working · {time}', { time: clock(since(turn.startedAt)()) }) : t('Starting…')) : t('Waits its turn'));
            said.textContent = sayState();
            if (at === 'now' && turn) state.tickers.push(() => { said.textContent = sayState(); });
            head.append(said);
            const text = el('p', 'ap-step-text', step.text);
            text.title = step.text;
            words.append(head, text);
            if (turn?.subagents?.length) words.append(subChips(turn.subagents));
            li.append(mark, words);
            list.append(li);
          });
          inside.append(list);
          inside.append(actions([t('Go to the chat'), 'go', () => goTo(project, item.chat)], [t('Stop the plan'), 'stop', () => stop(project, item)]));
        },
      });
    }
    if (item.kind === 'run') {
      const serving = item.serving;
      const host = serving ? (serving.host === '0.0.0.0' || serving.host === '::' ? '127.0.0.1' : serving.host) : null;
      return row({
        id: uid, face: sysAvatar(serving ? 'server' : 'mod-runs', { busy: !serving }),
        title: `$ ${item.line ?? ''}`,
        sub: `${where} · ${serving ? t('Listening on {host}:{port}', { host, port: serving.port }) : t('Running…')}`,
        time: () => clock(since(item.startedAt)()),
        more: (inside) => {
          if (item.agent) inside.append(el('p', 'ap-meta', t('Asked by {agent}', { agent: brandOf(item.agent).label })));
          const keys = [];
          if (serving) keys.push([t('Open'), 'go', () => { window.open(`http://${host.includes(':') ? `[${host}]` : host}:${serving.port}/`, '_blank', 'noopener'); }]);
          keys.push([t('Go to the chat'), '', () => goTo(project, item.chat, item.responseMessageId)]);
          keys.push([serving ? t('Stop the server') : t('Stop'), 'stop', () => stop(project, item)]);
          inside.append(actions(...keys));
        },
      });
    }
    // An install: an agent's program, Ollama or a model it downloads, or a module.
    const what = String(item.what ?? '');
    const title = what.startsWith('agent:') ? t('Installing {name}', { name: brandOf(what.slice(6)).label })
      : what === 'ollama' ? (item.model ? t('Downloading {name}', { name: item.model }) : t('Installing {name}', { name: 'Ollama' }))
        : t('Installing the module {name}', { name: what });
    // Opened, it says what the installer said last and how far it got; a model downloading can be
    // stopped from here, as in the welcome. It opened onto nothing before (2026-11-06, the author).
    const percent = (() => { const all = [...String(item.line ?? '').matchAll(/(\d{1,3}(?:\.\d+)?)\s?%/g)]; return all.length ? Math.min(100, Number(all.at(-1)[1])) : null; })();
    return row({
      id: uid, face: sysAvatar('download', { busy: true }), title,
      sub: `${project.home ? t('Home') : whereOf(project)} · ${t('It ends on its own; you can keep working.')}`,
      time: item.startedAt ? () => clock(since(item.startedAt)()) : '',
      progress: percent === null ? null : () => percent / 100,
      more: (inside) => {
        inside.append(el('p', 'ap-meta', t('It ends on its own; you can keep working.')));
        if (item.line) inside.append(el('pre', 'ap-out', item.line));
        if (item.stoppable) inside.append(actions([t('Stop the download'), 'stop', () => stop(project, item)]));
      },
    });
  }

  function doneRow(project, item) {
    const where = [whereOf(project), item.chatTitle].filter(Boolean).join(' · ');
    const said = item.state === 'ok' ? (item.tookMs != null ? t('Answered in {time}', { time: clock(item.tookMs) }) : t('Answered'))
      : item.state === 'stopped' ? t('You stopped it')
        : item.timeout ? t('Ran out of time') : t('Could not answer');
    const mark = { ok: '✓', failed: '✕', stopped: '■' }[item.state];
    const face = avatar(item.agent);
    face.classList.add('still');
    return row({
      id: `${project.room}:done:${item.messageId}:${item.at}`, face,
      title: item.closing ? `${brandOf(item.agent).label} ${t('reads the answers and closes the plan')}` : item.text || t('A turn of {agent}', { agent: brandOf(item.agent).label }),
      sub: `${where} · ${said}`,
      time: `${mark} ${ago(item.at)}`,
      timeTone: item.state === 'ok' ? 'ok' : item.state === 'failed' ? 'fail' : '',
      more: (inside) => {
        if (item.error) inside.append(el('pre', 'ap-out', item.error));
        inside.append(actions([t('Go to the chat'), 'go', () => goTo(project, item.chat, item.messageId)]));
      },
    });
  }

  function section(title, rows, { quiet = false } = {}) {
    if (!rows.length) return null;
    const box = el('section', 'ap-sec');
    box.append(el('h4', quiet ? 'quiet' : null, title));
    box.append(...rows);
    return box;
  }

  function paint() {
    state.tickers = [];
    // The key the keyboard was on comes back after the drawing, found by what it says and where.
    const focused = panel.contains(document.activeElement) ? [...panel.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    const focusedWords = focused >= 0 ? document.activeElement.textContent : null;
    const scroll = panel.querySelector('.ap-scroll');
    const kept = scroll?.scrollTop ?? 0;
    panel.replaceChildren();
    const head = el('header', 'ap-head');
    const name = el('h3', null, t('Running now'));
    const count = running().length;
    const shut = el('button', 'ap-x');
    shut.type = 'button';
    shut.setAttribute('aria-label', t('Close'));
    shut.innerHTML = trazo('close'); // trusted: our own SVG
    shut.addEventListener('click', close);
    head.append(name, el('small', null, count ? t('{n} now', { n: count }) : ''), el('span', 'ap-grow'), shut);
    panel.append(head);
    const body = el('div', 'ap-scroll');
    if (!state.data) {
      body.append(el('p', 'ap-wait', state.failing ? t('MADRE did not answer. Trying again…') : t('Asking every open project…')));
    } else {
      const now = [];
      const done = [];
      const outdated = [];
      for (const project of state.data.projects ?? []) {
        if (project.outdated) { outdated.push(project); continue; }
        const items = project.now ?? [];
        for (const item of items.filter(counted)) now.push(nowRow(project, item, item.kind === 'plan' ? items.filter((one) => one.kind === 'turn' && one.planId === item.planId) : []));
        for (const item of project.done ?? []) done.push({ at: item.at, node: () => doneRow(project, item) });
      }
      const soon = (state.data.soon ?? []).map((one) => row({
        id: `soon:${one.id}`, face: sysAvatar('mod-reminders'), title: one.text,
        sub: [one.project ?? t('Home'), new Intl.DateTimeFormat(language() === 'en' ? 'en-US' : 'es-MX', { hour: 'numeric', minute: '2-digit' }).format(new Date(one.due))].join(' · '),
        time: ago(one.due),
      }));
      if (!now.length) {
        const calm = el('div', 'ap-calm');
        calm.innerHTML = trazo('check'); // trusted: our own SVG
        calm.append(el('b', null, t('Nothing running')), el('span', null, t('When an agent answers, a command runs or something installs, you will see it here and can stop it.')));
        body.append(calm);
      }
      for (const part of [
        section(t('Now'), now),
        section(t('Ended a moment ago'), done.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8).map((one) => one.node()), { quiet: true }),
        section(t('Reminders coming up'), soon, { quiet: true }),
      ]) if (part) body.append(part);
      for (const project of outdated) body.append(el('p', 'ap-meta ap-old', t('{name} runs an older MADRE: update it to see here what it does.', { name: whereOf(project) })));
    }
    panel.append(body);
    body.scrollTop = kept;
    if (count) {
      const foot = el('footer', 'ap-foot');
      const places = new Set(running().map(({ project }) => project.room)).size;
      foot.append(el('span', null, places > 1 ? t('In {n} projects', { n: places }) : ''));
      const all = el('button', 'stop', state.confirmAll > Date.now() ? t('Stop everything? Yes') : t('Stop everything'));
      all.type = 'button';
      all.addEventListener('click', () => {
        if (state.confirmAll > Date.now()) { void stopAll(); return; }
        state.confirmAll = Date.now() + 4000;
        paint();
        setTimeout(() => { if (state.confirmAll && state.confirmAll <= Date.now()) { state.confirmAll = 0; if (state.open) paint(); } }, 4100);
      });
      foot.append(all);
      panel.append(foot);
    }
    place();
    if (focused >= 0) {
      const buttons = [...panel.querySelectorAll('button')];
      (buttons.find((one) => one.textContent === focusedWords) ?? buttons[Math.min(focused, buttons.length - 1)])?.focus({ preventScroll: true });
    }
  }

  // Under its key on a wide window; a sheet from the bottom on a narrow one (styles.css).
  function place() {
    const box = key.getBoundingClientRect();
    panel.style.setProperty('--ap-top', `${Math.round(box.bottom + 8)}px`);
    panel.style.setProperty('--ap-right', `${Math.max(12, Math.round(window.innerWidth - box.right - 8))}px`);
  }
  function openPanel() {
    state.open = true;
    panel.hidden = false;
    key.classList.add('on');
    key.setAttribute('aria-expanded', 'true');
    paint();
    void load();
    schedule();
    clearInterval(state.ticking);
    state.ticking = setInterval(() => { for (const tick of state.tickers ?? []) tick(); }, 1000);
    state.ticking?.unref?.();
    requestAnimationFrame(() => panel.classList.add('shown'));
  }
  function close() {
    if (!state.open) return;
    state.open = false;
    panel.classList.remove('shown');
    panel.hidden = true;
    key.classList.remove('on');
    key.setAttribute('aria-expanded', 'false');
    clearInterval(state.ticking);
    schedule();
  }
  key.addEventListener('click', () => (state.open ? close() : openPanel()));
  document.addEventListener?.('keydown', (event) => { if (event.key === 'Escape' && state.open) { close(); key.focus(); } });
  document.addEventListener?.('pointerdown', (event) => { if (state.open && !panel.contains(event.target) && !key.contains(event.target)) close(); }, true);
  globalThis.addEventListener?.('resize', () => { if (state.open) place(); });

  void load();
  schedule();
  return { open: openPanel, close, refresh: load };
}
