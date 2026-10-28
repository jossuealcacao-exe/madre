// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// THE WELCOME of 1.0.6 (2026-10-28, docs/private/BIENVENIDA-1.0.6.md): after `npx madre`, the
// person never needs the terminal again. Seven steps leave MADRE ready — the agents, an AI on the
// computer when it can carry one, the memory's search and the first project — each adapted to where
// MADRE runs (src/environment.mjs: macOS, Linux, WSL, a virtual machine, SSH) and to what the
// computer can do (src/modules/local-models.mjs). Every step can be left for later and says what is
// lost; a failure is said in the same step, in plain words, with the way out.
//
// Where the person is lives in ~/.pulse/tour.json (src/tour.mjs, `welcome`), not in the browser:
// closing the page halfway brings them back to the same step, from any project or port.
//
// The host page hands in what only it can do: `agentsPanel(options)` and `projectPicker(options)`
// (Home's own), `mark(id, size)`, `closeKey(onClick)`, `projects()`, `openProject(room)`,
// `setLanguage(code)`, `agentState(agent, answer)`, `openLinks()`, `openMarket()`, `saved(welcome)`
// and `closed()`.

import { t, language } from './i18n.js';
import { platformOf, remedyKey } from './remedy.js';

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
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  } catch (error) { return { ok: false, status: 0, body: { error: error.message } }; }
};
const getJson = (url) => fetch(url, { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
const number = (value) => new Intl.NumberFormat(language(), { maximumFractionDigits: 1 }).format(value);

export const WELCOME_STEPS = ['hello', 'machine', 'agents', 'ai', 'memory', 'project', 'ready'];
const STEP_NAMES = {
  hello: () => t('Hello'), machine: () => t('Your computer'), agents: () => t('Your agents'), ai: () => t('AI on your computer'),
  memory: () => t('Memory'), project: () => t('Your project'), ready: () => t('Ready'),
};
// Ollama's own installer for Linux, shown to copy where it asks for the administrator's password: MADRE
// never asks for a password nor keeps one (src/modules/ollama.mjs, NEEDS_PASSWORD).
const OLLAMA_SCRIPT = 'curl -fsSL https://ollama.com/install.sh | sh';
const OLLAMA_DOWNLOAD = 'https://ollama.com/download';
// The memory's model for search by meaning (src/ollama.mjs, RECOMMENDED.embed), and what it weighs.
const EMBED_MODEL = 'nomic-embed-text';
const EMBED_MB = 274;
const EMBEDDING = /embed|minilm|bge|nomic/i;
const BEAT = '<svg viewBox="-2 -1 66 22" aria-hidden="true"><path d="M1 10H16L20 10L23.5 2L28 18L32 10L35 10L37 6L39 10H52" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="10" r="3" fill="currentColor"/></svg>';
const TICK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// What a failed install or download said, in one word (src/setup-trouble.mjs), in plain words.
const TROUBLE = {
  network: () => t('It could not download: there is no internet connection, or something on this network blocked it. Check your connection and try again.'),
  disk: () => t('There is not enough free space on this computer. Free up some space or choose a smaller model.'),
  permission: () => t('This computer did not let MADRE install it. Copy the line below into a terminal, once.'),
  timeout: () => t('It took too long and was stopped. Try again.'),
};

// The card of Diagnostics that explains each of those, with its steps for this system (remedy.js).
const TROUBLE_CARD = { network: 'install-offline', disk: 'disk-full', permission: 'install-needs-admin', timeout: 'install-offline', 'npm-missing': 'node-missing' };

// Ollama prints each piece it downloads as «pulling <digest> · 45%» (src/ollama.mjs, pullModel). The
// first piece is the model itself, by far the heaviest: its share is the download's.
const PULL_LINE = /^pulling ([0-9a-f]{6,})\b.*?(\d{1,3})%\s*$/;

let current = null;
export const welcomeOpen = () => Boolean(current);

export function openWelcome({ at = null, then = null, host = {} } = {}) {
  if (current) { if (at) current.go(at); return current; }
  const dialog = el('dialog', 'wl');
  dialog.setAttribute('aria-label', t('Welcome to MADRE'));
  const shell = el('div', 'wl-window');
  const rail = el('nav', 'wl-rail');
  rail.setAttribute('aria-label', t('Steps'));
  const main = el('section', 'wl-main');
  const content = el('div', 'wl-content');
  const actions = el('div', 'wl-actions');
  const close = host.closeKey?.(() => dialog.close()) ?? button('wl-close', '×', () => dialog.close());
  close.classList.add('wl-close');
  main.append(close, content, actions);
  shell.append(rail, main);
  dialog.append(shell);
  document.body.append(dialog);

  // Everything the steps decide on, read once when it opens and again when it changes.
  const s = {
    step: 0,
    progress: { at: null, done: [], skipped: [], finished: null },
    env: null, hardware: null, geminiKey: false, memory: null,
    ollama: null, recommended: null,
    choice: null,               // the AI step: here · windows · remote · skip
    model: null,                // the model chosen for this computer (a rung of the Qwen2.5 ladder)
    pulls: new Map(),           // model → { pct, first, phase, error, trouble, running }
    install: null,              // Ollama's own install, while it runs: { lines, error, trouble, running }
    tried: null,                // «try it»: { said, answer, error, busy }
    address: null,              // the AI of another computer: { host, busy, error, ok }
    memoryChoice: null,         // local · gemini · off
    agents: null,               // /api/settings, as the agents panel last read it
    ready: 0,                   // agents connected
    added: [],                  // the projects added while the welcome was open
  };
  let leave = null;             // what the step on screen stops when another one comes
  let pollTimer = 0;
  let stream = null;
  let finished = false;
  const stepId = () => WELCOME_STEPS[s.step];

  // ---- Where the person is, kept in ~/.pulse (src/tour.mjs).
  const save = async (change) => {
    const answer = await post('/api/tour', { welcome: change });
    if (answer.ok && answer.body?.state?.welcome) { s.progress = answer.body.state.welcome; host.saved?.(s.progress); }
    paintRail();
  };
  const go = (to, mark = null) => {
    const id = stepId();
    const next = Math.max(0, Math.min(WELCOME_STEPS.length - 1, typeof to === 'string' ? WELCOME_STEPS.indexOf(to) : to));
    if (mark === 'done') { s.progress.done = [...new Set([...s.progress.done, id])]; s.progress.skipped = s.progress.skipped.filter((one) => one !== id); }
    if (mark === 'skip') { s.progress.skipped = [...new Set([...s.progress.skipped, id])]; s.progress.done = s.progress.done.filter((one) => one !== id); }
    s.step = next;
    void save({ at: WELCOME_STEPS[next], ...(mark === 'done' ? { done: id } : mark === 'skip' ? { skipped: id } : {}) });
    show();
  };

  // ---- What Ollama and the computer say, asked again whenever something may have changed.
  const readOllama = async ({ probe = false } = {}) => {
    const answer = probe ? (await post('/api/ollama/probe')).body : await getJson('/api/ollama');
    if (answer?.ollama) { s.ollama = answer.ollama; s.recommended = answer.recommended ?? s.recommended; }
    return s.ollama;
  };
  const chatModels = () => (s.ollama?.models ?? []).filter((model) => !EMBEDDING.test(model.name) && !EMBEDDING.test(model.family ?? ''));
  const hasModel = (name) => (s.ollama?.models ?? []).some((model) => model.name === name || model.name === `${name}:latest` || model.name.replace(/:latest$/, '') === name);
  const localHost = (address) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(address ?? ''));
  const fit = () => s.hardware ?? null;
  const facts = () => fit()?.hardware ?? {};
  // What the computer can carry: well, slowly (no graphics card), or not at all.
  const canCarry = () => {
    const best = fit()?.recommended?.run;
    if (!best) return 'no';
    return fit().accelerated ? 'yes' : 'slow';
  };
  // The model offered first: the one MADRE recommends here, or the one the person stepped down to.
  const offered = () => s.model ?? fit()?.recommended?.run ?? null;
  const smaller = () => {
    const rungs = (fit()?.models ?? []).filter((model) => model.run !== 'no');
    const now = offered();
    const at = rungs.findIndex((model) => model.id === now?.id);
    return at > 0 ? rungs[at - 1] : null;
  };
  const roomFor = (gb) => (s.env?.disk?.freeGb == null ? true : s.env.disk.freeGb >= gb + 2);

  // ---- The rail: the seven steps, where the person is, what is done and what was left for later.
  function paintRail() {
    const brand = el('div', 'wl-brand');
    brand.innerHTML = BEAT; // trusted: our own SVG string
    brand.append(el('span', null, 'MADRE'));
    const list = el('ol', 'wl-steps');
    WELCOME_STEPS.forEach((id, index) => {
      const done = s.progress.done.includes(id);
      const skipped = s.progress.skipped.includes(id);
      const item = el('li');
      const key = button(`wl-step${done ? ' done' : ''}${skipped ? ' skipped' : ''}`, null, () => { s.step = index; void save({ at: id }); show(); });
      if (index === s.step) key.setAttribute('aria-current', 'step');
      const dot = el('i');
      if (done) dot.innerHTML = TICK; // trusted: our own SVG string
      else dot.textContent = skipped ? '–' : String(index + 1);
      key.append(dot, el('span', null, STEP_NAMES[id]()));
      if (skipped) key.title = t('Left for later');
      item.append(key);
      list.append(item);
    });
    rail.replaceChildren(brand, list, el('p', 'wl-rail-foot', t('Anything you leave for later can be done afterwards in Settings.')));
  }

  // ---- The parts every step is made of.
  const head = (title, lead) => {
    const nodes = [el('p', 'wl-eyebrow', s.step ? t('Step {n} of {total}', { n: s.step + 1, total: WELCOME_STEPS.length }) : t('Welcome')), el('h2', 'wl-title', title)];
    if (lead) nodes.push(el('p', 'wl-lead', lead));
    return nodes;
  };
  const note = (tone, ...children) => {
    const box = el('div', `wl-note${tone ? ` ${tone}` : ''}`);
    box.append(...children.filter(Boolean).map((child) => (typeof child === 'string' ? el('p', null, child) : child)));
    return box;
  };
  // «See how to fix it», under what went wrong: the card of Diagnostics for it, for this system.
  const fix = (id) => (id ? remedyKey(id, { platform: platformOf(s.env) }) : null);
  const chip = (tone, words) => { const node = el('span', `wl-chip${tone ? ` ${tone}` : ''}`); node.append(el('i'), el('span', null, words)); return node; };
  const copyLine = (line) => {
    const box = el('div', 'wl-copyline');
    const copy = button('wl-btn small', t('Copy'), async () => {
      try { await navigator.clipboard.writeText(line); copy.textContent = t('Copied'); setTimeout(() => { copy.textContent = t('Copy'); }, 1500); } catch { copy.textContent = t('Select it'); }
    });
    box.append(el('code', null, line), copy);
    return box;
  };
  const bar = (pct) => { const track = el('div', 'wl-bar'); const fill = el('i'); fill.style.width = `${Math.max(0, Math.min(100, pct))}%`; track.append(fill); track.setAttribute('role', 'progressbar'); track.setAttribute('aria-valuenow', String(Math.round(pct))); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); return track; };
  // A choice among a few, each with a line that says what it does.
  const choice = (name, value, current, title, sub, onPick, { badge = null, disabled = false } = {}) => {
    const option = button('wl-path', null, () => { if (!disabled) onPick(value); });
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(current === value));
    option.dataset.choice = `${name}:${value}`;
    if (disabled) option.setAttribute('aria-disabled', 'true');
    const words = el('span', 'wl-path-words');
    const line = el('b', null, title);
    if (badge) line.append(el('span', 'wl-badge', badge));
    words.append(line, el('small', null, sub));
    option.append(el('span', 'wl-radio'), words);
    return option;
  };
  const choices = (label, ...options) => { const group = el('div', 'wl-paths'); group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', label); group.append(...options); return group; };
  // The keys under every step: back, what leaving it for later costs, and on.
  const footer = ({ next = t('Continue'), onNext = () => go(s.step + 1, 'done'), nextOff = false, skip = null, back = true, extra = null } = {}) => {
    const backKey = back && s.step > 0 ? button('wl-btn ghost', t('Back'), () => go(s.step - 1)) : el('span');
    const parts = [backKey, el('span', 'wl-grow')];
    if (skip) {
      const away = button('wl-btn', skip.label ?? t('Skip for now'), () => go(s.step + 1, 'skip'));
      away.dataset.skip = '';
      parts.push(el('span', 'wl-skipnote', skip.note), away);
    }
    if (extra) parts.push(extra);
    const primary = button('wl-btn primary', next, async () => { primary.disabled = true; try { await onNext(); } finally { if (primary.isConnected) primary.disabled = false; } });
    primary.disabled = nextOff;
    primary.dataset.next = '';
    parts.push(primary);
    actions.replaceChildren(...parts);
    return primary;
  };

  // ---- 1 · HELLO: the language, what gets ready and how long it takes.
  function hello() {
    const seg = el('div', 'wl-seg');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', 'Idioma · Language');
    for (const [code, words] of [['es', 'Español'], ['en', 'English']]) {
      const option = button(null, words, async () => {
        if (code === language()) return;
        await host.setLanguage?.(code);
        dialog.setAttribute('aria-label', t('Welcome to MADRE'));
        paintRail();
        show();
      });
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', String(code === language()));
      seg.append(option);
    }
    const lang = el('div', 'wl-row');
    lang.append(el('span', 'wl-muted', t('Language')), seg);
    const list = el('div', 'wl-card wl-checks');
    for (const [title, sub] of [
      [t('Your agents'), t('The AIs that work in your projects (Claude, Codex, Gemini…). We install and connect them here.')],
      [t('AI on your computer'), t('If your computer can carry it, a free and private AI that works without internet.')],
      [t('Memory'), t('So MADRE finds what it remembers even when you ask in other words.')],
      [t('Your first project'), t('A folder you work in. It is ready when we finish.')],
    ]) {
      const row = el('div', 'wl-check');
      const tick = el('span', 'wl-tick');
      tick.innerHTML = TICK; // trusted: our own SVG string
      const words = el('div');
      words.append(el('b', null, title), el('small', null, sub));
      row.append(tick, words);
      list.append(row);
    }
    content.replaceChildren(...head(t('Hi. Let\'s get MADRE ready.'), t('It takes about 10 minutes, plus the download if you choose an AI on your computer. You will not need the terminal.')), lang, list);
    footer({ next: t('Start'), back: false });
  }

  // ---- 2 · YOUR COMPUTER: what MADRE found, in plain words, and what it means for the next steps.
  function placeWords() {
    const env = s.env ?? {};
    if (env.place === 'ssh') return t('You came in from another computer (SSH)');
    if (env.place === 'wsl') return env.wsl?.distro ? t('Linux inside Windows (WSL · {distro})', { distro: env.wsl.distro }) : t('Linux inside Windows (WSL)');
    if (env.place === 'vm') return t('A virtual machine ({vm})', { vm: env.vm });
    if (env.place === 'container') return t('Inside a container');
    return t('On this computer');
  }
  function graphicsWords() {
    const hw = facts();
    if (hw.accelerator === 'apple') return t('Apple chip: the AI uses the computer\'s memory');
    if (hw.accelerator === 'nvidia') return `${hw.gpus?.[0]?.name ?? 'NVIDIA'} · ${number(hw.acceleratorGb)} GB`;
    return t('None the AI can use');
  }
  function machine() {
    const env = s.env ?? {};
    const hw = facts();
    const grid = el('div', 'wl-facts');
    const fact = (label, value) => { if (!value) return; const box = el('div', 'wl-fact'); box.append(el('small', null, label), el('b', null, value)); grid.append(box); };
    fact(t('Where MADRE runs'), placeWords());
    fact(t('System'), env.name ?? (env.os === 'macos' ? 'macOS' : env.os === 'linux' ? 'Linux' : env.os ?? null));
    fact(t('Processor'), hw.chip ?? null);
    fact(t('Memory'), hw.memoryGb ? `${number(hw.memoryGb)} GB` : null);
    fact(t('Graphics card'), graphicsWords());
    fact(t('Free space'), env.disk ? t('{n} GB free', { n: number(env.disk.freeGb) }) : null);
    const notes = [];
    const carry = canCarry();
    if (carry === 'yes') notes.push(note('ok', t('Your computer can run its own AI. We recommend a model in step 4.')));
    else if (carry === 'slow') notes.push(note('warn', t('Your computer can run a small AI, but slowly: it has no graphics card the AI can use.')));
    else notes.push(note('warn', t('This computer does not have enough memory for an AI of its own. MADRE works just the same with your agents.')));
    if (env.place === 'wsl') notes.push(note('', t('MADRE runs here on Linux, inside Windows (WSL). Your Windows browser opens it directly.')));
    // On Windows itself: its version arrives in 1.1 (docs/WINDOWS.md, D-001); until then, WSL.
    if (env.os === 'windows') notes.push(note('warn', t('The version of MADRE for Windows arrives in 1.1. Until then it runs inside WSL, Linux inside Windows.'), fix('windows-use-wsl')));
    // A virtual machine reached over SSH is both (Carlos, 2026-10-28): each is said.
    if (env.vm && env.vm !== 'macOS') notes.push(note('warn', t('MADRE runs in a virtual machine: an AI here runs slower than on the computer itself. If that computer runs Windows, MADRE works better in WSL.')));
    if (env.place === 'ssh') notes.push(note('', t('You came in from another computer. Some agents connect with a code instead of opening a page; each one says so.'), fix('ssh-tunnel')));
    if (env.place === 'container') notes.push(note('', t('MADRE runs inside a container: what it installs stays in that container.')));
    if (env.disk && env.disk.freeGb < 10) notes.push(note('warn', t('Only {n} GB free. Agents fit, but an AI of its own needs more room: free some up before step 4.', { n: number(env.disk.freeGb) })));
    content.replaceChildren(...head(t('Here is what we found'), t('We use it to recommend what works best on your computer. It never leaves your computer.')), grid, ...notes);
    footer();
  }

  // ---- 3 · YOUR AGENTS: Home's own panel, with what each one needs said first.
  function explainAgent(agent, state) {
    const env = s.env ?? {};
    if (agent.id === 'gemini' && !state.ok) return el('p', 'wl-agent-why', t('Gemini no longer works with personal Google accounts: it needs an access key (API key) from Google AI Studio. You pay for what you use, usually very little. «Where do I get one?» opens the page that gives it.'));
    if (agent.id === 'cursor' && !agent.detected) return el('p', 'wl-agent-why', t('Cursor installs with its own installer. For your safety MADRE does not run installers downloaded from the internet: copy the line below into a terminal, once, then press «I did it». Or skip it: it is optional.'));
    if (env.place === 'ssh' && agent.detected && !state.ok && (agent.login?.methods ?? []).some((method) => method.id === 'device')) return el('p', 'wl-agent-why', t('You came in from another computer: choose «With a code», and type the code on the page from any device.'));
    if (env.place === 'ssh' && agent.detected && !state.ok) return el('p', 'wl-agent-why', t('You came in from another computer: open the page it gives you on your own computer, and paste the code it shows back here.'));
    return null;
  }
  function agents() {
    const panel = host.agentsPanel?.({
      compact: true,
      explain: explainAgent,
      onPaint: (ready, answer) => {
        s.ready = ready;
        s.agents = answer;
        paintAgentKeys();
      },
    });
    content.replaceChildren(...head(t('Connect your agents'), t('Agents are the AIs that read and write in your projects. Each one is connected once, and every project uses it. One is enough to start.')));
    if (panel) {
      content.append(panel.node);
      void panel.paint().then(() => panel.live());
      leave = () => panel.stop();
    }
    footer({ nextOff: !s.ready, skip: { note: t('Without agents, MADRE cannot work for you.') } });
    paintAgentKeys();
  }
  // With one agent connected the step is done: leaving it for later is no longer offered.
  function paintAgentKeys() {
    const next = actions.querySelector('[data-next]');
    if (next) next.disabled = !s.ready;
    for (const node of actions.querySelectorAll('.wl-skipnote, [data-skip]')) node.hidden = Boolean(s.ready);
  }

  // ---- 4 · AI ON YOUR COMPUTER: install Ollama, download the model, try it — or use another
  // computer's, or leave it for later.
  function aiChoices() {
    const env = s.env ?? {};
    const carry = canCarry();
    const model = offered();
    const pick = (value) => {
      s.choice = value;
      // Back to this computer's Ollama after pointing at another one.
      if (value === 'here' && s.ollama?.host && !localHost(s.ollama.host)) void post('/api/local-ai/host', { host: null }).then(() => readOllama({ probe: true })).then(() => paintAi());
      paintAi();
    };
    const options = [];
    if (model) {
      const sub = carry === 'yes'
        ? t('The one that fits your computer best. A {size} GB download.', { size: number(model.sizeGb ?? 0) })
        : t('The one that fits your computer. A {size} GB download; it will answer slowly.', { size: number(model.sizeGb ?? 0) });
      options.push(choice('ai', 'here', s.choice, t('Install it here · {model}', { model: model.label }), sub, pick, { badge: carry === 'yes' ? t('Recommended') : null }));
    }
    if (env.place === 'wsl') options.push(choice('ai', 'windows', s.choice, t('Use the Ollama on Windows'), t('If Ollama is already installed on Windows, MADRE connects to it.'), pick));
    if (env.vm || env.place === 'wsl' || env.place === 'ssh' || carry !== 'yes') options.push(choice('ai', 'remote', s.choice, t('Use another computer\'s AI'), t('A computer on your network with Ollama and a graphics card.'), pick));
    options.push(choice('ai', 'skip', s.choice, t('Not now'), t('MADRE works just the same with your agents. You can turn it on later in Settings › Local AI.'), pick));
    return choices(t('AI on your computer'), ...options);
  }
  let aiBody = null;
  function ai() {
    const carry = canCarry();
    const intro = carry === 'yes' ? note('ok', t('Your computer can run its own AI: free, private and without internet. It gives life to @madre, the archivist and the search in your memory.'))
      : carry === 'slow' ? note('warn', t('Your computer can, but it will be slow ({gb} GB, no graphics card the AI can use). We recommend a small model.', { gb: number(facts().memoryGb ?? 0) }))
        : note('warn', t('This computer does not have enough memory for an AI of its own: here it would be too slow. MADRE works just the same with your agents.'));
    // Chosen before: what is already there says which way this goes.
    if (!s.choice && s.ollama?.running && chatModels().length) s.choice = localHost(s.ollama.host) ? 'here' : (s.env?.place === 'wsl' ? 'windows' : 'remote');
    aiBody = el('div', 'wl-ai');
    content.replaceChildren(...head(t('AI on your computer'), t('Ollama is the app that runs AI on your computer. A bigger model is smarter and heavier; we suggest the one that fits yours best.')), intro, aiBody);
    paintAi();
    // While Ollama is not there yet, MADRE looks every few seconds: «I did it» is a courtesy.
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.hidden || !['here', 'windows', 'remote'].includes(s.choice) || s.ollama?.running) return;
      if (s.choice !== 'here') return;
      void readOllama({ probe: true }).then(() => { if (stepId() === 'ai') paintAi(); });
    }, 5000);
    leave = () => { clearInterval(pollTimer); pollTimer = 0; };
  }
  function paintAi() {
    if (!aiBody?.isConnected) return;
    const blocks = [aiChoices()];
    if (s.choice === 'here') blocks.push(installFlow());
    if (s.choice === 'windows' || s.choice === 'remote') blocks.push(addressFlow());
    aiBody.replaceChildren(...blocks);
    const ready = s.ollama?.running && chatModels().length > 0;
    // «Not now» is one of the choices: no second key to leave it for later.
    footer({
      nextOff: s.choice === null || (s.choice !== 'skip' && !ready),
      onNext: async () => {
        if (s.choice === 'skip') { go(s.step + 1, 'skip'); return; }
        await enableLocal();
        go(s.step + 1, 'done');
      },
    });
  }
  // On for every project, and every open project told (Home › Settings › Local AI does the same).
  async function enableLocal() {
    await post('/api/ollama/settings', { enabled: true, embeddings: true });
    await post('/api/salas/local-ai', {});
  }
  function installFlow() {
    const env = s.env ?? {};
    const box = el('div', 'wl-card wl-flow');
    const info = s.ollama ?? {};
    // 1 · Ollama itself.
    box.append(el('b', 'wl-flow-title', t('1 · Install Ollama')));
    if (info.running) box.append(chip('ok', info.version ? t('Installed and open · {version}', { version: info.version }) : t('Installed and open')));
    else if (info.binary) {
      box.append(el('p', 'wl-muted', env.os === 'macos' ? t('Ollama is installed but not open. MADRE opens it; if it does not answer, open the Ollama app yourself.') : t('Ollama is installed but not running. MADRE starts it.')));
      const start = button('wl-btn primary small', t('Open Ollama'), async () => {
        start.disabled = true;
        const answer = await post('/api/ollama/start');
        await readOllama({ probe: true });
        if (!answer.ok) s.install = { error: answer.body?.error ?? t('Ollama did not answer.'), card: 'ollama-not-starting' };
        paintAi();
      });
      box.append(start);
    } else if (env.os === 'macos') {
      box.append(el('p', 'wl-muted', t('Download the official Ollama app, open it once, and come back here. It then opens by itself every time you turn on your Mac.')));
      const row = el('div', 'wl-row');
      const get = el('a', 'wl-btn primary small', t('Download Ollama ↗'));
      get.href = OLLAMA_DOWNLOAD;
      get.target = '_blank';
      get.rel = 'noopener';
      row.append(get, checkKey(), el('small', 'wl-tiny', t('MADRE checks by itself.')));
      box.append(row);
    } else if (info.install?.command && !s.install?.manual) {
      box.append(el('p', 'wl-muted', t('MADRE installs it with Ollama\'s own installer, from ollama.com. It takes a few minutes.')));
      if (s.install?.running) {
        box.append(el('p', 'wl-tiny wl-live', s.install.lines?.at(-1) ?? t('Installing…')));
      } else {
        const run = button('wl-btn primary small', s.install?.error ? t('Try again') : t('Install Ollama'), async () => {
          run.disabled = true;
          const answer = await post('/api/ollama/install');
          if (answer.ok) s.install = { running: true, lines: [] };
          else if (answer.status === 412 && answer.body?.manual) s.install = { manual: true };
          else s.install = { error: answer.body?.error ?? t('It did not install.') };
          paintAi();
        });
        box.append(run);
      }
    } else {
      const why = env.place === 'wsl'
        ? t('It installs inside Linux (WSL). Linux asks for your Linux user\'s password to install programs; MADRE never asks for it or keeps it. Copy this line into the Ubuntu terminal, once.')
        : t('To install programs, Linux asks for your password. MADRE never asks for it or keeps it: copy this line into a terminal on this computer, once.');
      box.append(el('p', 'wl-muted', why), copyLine(OLLAMA_SCRIPT));
      const row = el('div', 'wl-row');
      row.append(checkKey(), el('small', 'wl-tiny', t('MADRE checks by itself.')));
      box.append(row);
    }
    if (s.install?.error && !info.running) box.append(note('bad', s.install.trouble && TROUBLE[s.install.trouble] ? TROUBLE[s.install.trouble]() : s.install.error, fix(s.install.card ?? (s.install.trouble === 'permission' ? 'ollama' : TROUBLE_CARD[s.install.trouble]) ?? 'ollama')));
    // 2 · The model, and 3 · trying it, once Ollama answers.
    if (info.running) box.append(...modelFlow());
    return box;
  }
  const checkKey = () => {
    const key = button('wl-btn small', t('I did it'), async () => {
      key.disabled = true;
      key.textContent = t('Checking…');
      await readOllama({ probe: true });
      if (s.ollama?.binary && !s.ollama.running) await post('/api/ollama/start').then(() => readOllama({ probe: true }));
      if (!s.ollama?.running) s.install = s.ollama?.binary ? { error: t('Ollama is installed but did not answer. Open the Ollama app, then press «I did it» again.'), card: 'ollama-not-starting' } : { error: t('Ollama is not on this computer yet. Install it, then press «I did it» again.'), card: 'ollama' };
      else s.install = null;
      paintAi();
    });
    return key;
  };
  // The model, downloaded with its real share, and a first word with it.
  function modelFlow() {
    const parts = [];
    const have = chatModels();
    const model = offered();
    const using = have[0]?.name ?? null;
    if (have.length && (!model || !s.pulls.get(model.ollama)?.running)) {
      parts.push(el('b', 'wl-flow-title', t('2 · The model')));
      parts.push(chip('ok', t('Ready · {model}', { model: s.ollama?.chatModel ?? using })));
      parts.push(...tryFlow());
      return parts;
    }
    if (!model) {
      parts.push(el('b', 'wl-flow-title', t('2 · The model')), el('p', 'wl-muted', t('This computer cannot carry a model. Use another computer\'s AI, or leave it for later.')));
      return parts;
    }
    parts.push(el('b', 'wl-flow-title', t('2 · Download {model}', { model: model.label })));
    const pull = s.pulls.get(model.ollama);
    if (pull?.running) {
      const pct = pull.pct ?? 0;
      const got = ((model.sizeGb ?? 0) * pct) / 100;
      parts.push(bar(pct), el('small', 'wl-tiny', pull.phase === 'verify' ? t('Checking the download…') : t('{pct} % · {got} of {size} GB', { pct: Math.round(pct), got: number(got), size: number(model.sizeGb ?? 0) })));
      return parts;
    }
    if (pull?.error) {
      parts.push(note('bad', pull.trouble && TROUBLE[pull.trouble] ? TROUBLE[pull.trouble]() : t('The download stopped: {error}', { error: pull.error }), fix(pull.trouble === 'disk' ? 'disk-full' : 'model-download')));
    }
    if (!roomFor(model.sizeGb ?? 0)) parts.push(note('warn', t('There are {free} GB free and this model needs {size} GB plus some room. Free up space or choose a smaller model.', { free: number(s.env.disk.freeGb), size: number(model.sizeGb ?? 0) }), fix('disk-full')));
    const row = el('div', 'wl-row');
    const get = button('wl-btn primary small', pull?.error ? t('Try again') : t('Download · {size} GB', { size: number(model.sizeGb ?? 0) }), () => void startPull(model.ollama));
    get.disabled = !roomFor(model.sizeGb ?? 0) && !pull?.error;
    row.append(get);
    const down = smaller();
    if (down) row.append(button('wl-btn ghost small', t('Choose a smaller one · {model}', { model: down.label }), () => { s.model = down; paintAi(); }));
    parts.push(row, el('small', 'wl-tiny', t('It downloads once and stays in Ollama.')));
    return parts;
  }
  async function startPull(model) {
    s.pulls.set(model, { running: true, pct: 0, first: null, phase: 'pull' });
    repaint();
    const answer = await post('/api/ollama/pull', { model });
    if (!answer.ok) s.pulls.set(model, { error: answer.body?.error ?? t('Home did not answer.') });
    repaint();
  }
  function tryFlow() {
    const parts = [el('b', 'wl-flow-title', t('3 · Try it'))];
    const said = s.tried?.said ?? t('hello');
    const form = el('form', 'wl-try');
    const input = el('input', 'wl-field');
    input.value = said;
    input.setAttribute('aria-label', t('Write to the AI on your computer'));
    const send = el('button', 'wl-btn small', s.tried?.busy ? t('Thinking…') : t('Send'));
    send.type = 'submit';
    send.disabled = Boolean(s.tried?.busy);
    form.append(input, send);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      s.tried = { said: input.value.trim() || t('hello'), busy: true };
      paintAi();
      const answer = await post('/api/local-ai/try', { text: s.tried.said });
      s.tried = { said: s.tried.said, answer: answer.ok ? answer.body.text : null, error: answer.ok ? null : answer.body?.error ?? t('Home did not answer.') };
      paintAi();
    });
    parts.push(form);
    if (s.tried?.answer || s.tried?.busy) {
      const talk = el('div', 'wl-talk');
      talk.append(el('p', 'wl-bubble me', s.tried.said));
      if (s.tried.answer) talk.append(el('p', 'wl-bubble', s.tried.answer));
      else talk.append(el('p', 'wl-bubble wl-thinking', t('Thinking…')));
      parts.push(talk);
    }
    if (s.tried?.error) parts.push(note('bad', s.tried.error, fix('ollama-not-starting')));
    return parts;
  }
  // The AI of another computer, or of Windows from inside WSL: its address, tried before it is kept.
  function addressFlow() {
    const env = s.env ?? {};
    const box = el('div', 'wl-card wl-flow');
    const windows = s.choice === 'windows';
    box.append(el('b', 'wl-flow-title', windows ? t('Ollama on Windows') : t('The other computer\'s address')));
    box.append(el('p', 'wl-muted', windows
      ? t('Install Ollama on Windows from ollama.com and open it. In its settings, turn on «Expose Ollama to the network» so Linux can reach it.')
      : t('On that computer, Ollama must accept connections from your network: in the Ollama app, turn on «Expose Ollama to the network» in its settings.')));
    const suggested = windows ? `http://${env.wsl?.windowsHost ?? 'localhost'}:11434` : '';
    const form = el('form', 'wl-try');
    const input = el('input', 'wl-field');
    input.value = s.address?.host ?? (s.ollama?.host && !localHost(s.ollama.host) ? s.ollama.host : suggested);
    input.placeholder = 'http://192.168.1.40:11434';
    input.setAttribute('aria-label', t('Ollama address'));
    input.spellcheck = false;
    const test = el('button', 'wl-btn primary small', s.address?.busy ? t('Checking…') : t('Test'));
    test.type = 'submit';
    test.disabled = Boolean(s.address?.busy);
    form.append(input, test);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      s.address = { host: input.value.trim(), busy: true };
      paintAi();
      const answer = await post('/api/local-ai/host', { host: s.address.host });
      if (answer.ok) { s.address = { host: answer.body.host, ok: true }; await readOllama(); }
      else s.address = { host: s.address.host, error: answer.body?.error ?? t('Home did not answer.') };
      paintAi();
    });
    box.append(form);
    const connected = s.ollama?.running && !localHost(s.ollama.host);
    if (s.address?.error) box.append(note('bad', s.address.error, fix('ollama-remote')));
    else if (connected) box.append(chip('ok', t('Connected · {host}', { host: s.ollama.host })));
    box.append(el('small', 'wl-tiny', t('It is kept in Settings › Local AI › Ollama address.')));
    if (connected) box.append(...modelFlow());
    return box;
  }

  // ---- 5 · MEMORY: search by meaning on this computer, with Gemini, or exact words.
  let memoryBody = null;
  function memoryStep() {
    memoryBody = el('div', 'wl-memory');
    content.replaceChildren(...head(t('Memory'), t('MADRE remembers what you decide in each project. With search by meaning it finds it even when you ask in other words.')), memoryBody);
    paintMemory();
    // With the AI of step 4 there, its memory model comes on its own: nothing to press.
    if (s.memoryChoice === 'local' && !hasModel(EMBED_MODEL) && !s.pulls.has(EMBED_MODEL)) void startPull(EMBED_MODEL);
  }
  function paintMemory() {
    if (!memoryBody?.isConnected) return;
    const local = Boolean(s.ollama?.running);
    const said = s.memory?.embedProvider;
    s.memoryChoice ??= said === 'ollama' && local ? 'local' : said === 'gemini' ? 'gemini' : said === 'off' ? 'off' : local ? 'local' : s.geminiKey ? 'gemini' : 'off';
    if (s.memoryChoice === 'local' && !local) s.memoryChoice = s.geminiKey ? 'gemini' : 'off';
    const pick = (value) => { s.memoryChoice = value; if (value === 'local' && !hasModel(EMBED_MODEL) && !s.pulls.get(EMBED_MODEL)?.running) void startPull(EMBED_MODEL); paintMemory(); };
    const embedReady = hasModel(EMBED_MODEL);
    const group = choices(t('Memory'),
      choice('memory', 'local', s.memoryChoice, t('On your computer'), local ? (embedReady ? t('With Ollama. Its memory model is already here. Free and private.') : t('With Ollama. Downloads a memory model of {mb} MB. Free and private.', { mb: EMBED_MB })) : t('Needs the AI on your computer (step 4).'), pick, { badge: local ? t('Recommended') : null, disabled: !local }),
      choice('memory', 'gemini', s.memoryChoice, t('With Gemini'), s.geminiKey ? t('Uses your Gemini key, already on this computer. Paid per use, very little. What it searches is sent to Google.') : t('Needs your Gemini key: paste it in step 3, in Gemini.'), pick, { badge: !local && s.geminiKey ? t('Recommended') : null }),
      choice('memory', 'off', s.memoryChoice, t('Exact words only'), t('Nothing extra. It finds what you ask for with the same words.'), pick),
    );
    const parts = [group];
    if (s.memoryChoice === 'local') {
      const pull = s.pulls.get(EMBED_MODEL);
      if (embedReady) parts.push(chip('ok', t('Memory model ready · {model}', { model: EMBED_MODEL })));
      else if (pull?.running) parts.push(bar(pull.pct ?? 0), el('small', 'wl-tiny', t('{pct} % · {mb} MB', { pct: Math.round(pull.pct ?? 0), mb: EMBED_MB })));
      else if (pull?.error) parts.push(note('bad', pull.trouble && TROUBLE[pull.trouble] ? TROUBLE[pull.trouble]() : t('The download stopped: {error}', { error: pull.error }), fix(pull.trouble === 'disk' ? 'disk-full' : 'model-download')), button('wl-btn small', t('Try again'), () => void startPull(EMBED_MODEL)));
      else parts.push(button('wl-btn primary small', t('Download the memory model · {mb} MB', { mb: EMBED_MB }), () => void startPull(EMBED_MODEL)));
    }
    if (s.memoryChoice === 'gemini' && !s.geminiKey) parts.push(button('wl-btn small', t('Go to step 3'), () => go('agents')));
    memoryBody.replaceChildren(...parts);
    const blocked = (s.memoryChoice === 'local' && !embedReady) || (s.memoryChoice === 'gemini' && !s.geminiKey);
    footer({
      nextOff: blocked,
      onNext: async () => {
        const provider = { local: 'ollama', gemini: 'gemini', off: 'off' }[s.memoryChoice];
        const answer = await post('/api/settings', { memory: { embedProvider: provider } });
        if (answer.ok) s.memory = { ...(s.memory ?? {}), embedProvider: provider };
        go(s.step + 1, s.memoryChoice === 'off' ? 'skip' : 'done');
      },
    });
  }

  // ---- 6 · YOUR PROJECT: a new one or a folder that already is one.
  function project() {
    const had = host.projects?.() ?? [];
    const lead = t('A project is a folder you work in: a store, a website, your documents. Each one has its own conversations and its own memory.');
    const parts = [...head(t('Your first project'), lead)];
    if (had.length) parts.push(note('ok', had.length === 1 ? t('You already have a project in Home: {name}. Add another one, or continue.', { name: had[0].name }) : t('You already have {n} projects in Home. Add another one, or continue.', { n: had.length })));
    if (s.env?.place === 'wsl') parts.push(note('warn', t('Keep your projects inside Linux (your folder in /home). A Windows folder (/mnt/c/…) makes MADRE slower and protects your files less.'), fix('wsl-windows-folder')));
    let picker = null;
    const primary = () => actions.querySelector('[data-next]');
    picker = host.projectPicker?.({
      withAdd: false,
      onChange: (n) => { const key = primary(); if (key) { key.textContent = n ? t('Add and continue') : t('Continue'); key.disabled = !n && !(host.projects?.() ?? []).length; } },
      onAdded: (added) => { s.added = [...s.added, ...(added ?? [])]; if (stepId() === 'project') go(s.step + 1, 'done'); },
    });
    if (picker) parts.push(picker.node);
    content.replaceChildren(...parts);
    footer({
      nextOff: !had.length,
      onNext: async () => {
        if (picker?.count()) { await picker.add(); return; }
        go(s.step + 1, 'done');
      },
      skip: had.length ? null : { note: t('You can add it from Home.') },
    });
  }

  // ---- 7 · READY: what is set, what was left for later with its key, and what comes next.
  async function ready() {
    content.replaceChildren(...head(t('MADRE is ready'), t('Here is what is set. Anything you left for later has its button.')), el('p', 'wl-muted', t('Reading…')));
    actions.replaceChildren();
    const settings = s.agents ?? await getJson('/api/settings');
    await readOllama();
    if (stepId() !== 'ready') return;
    const connected = (settings?.agents ?? []).filter((agent) => agent.id !== 'madre' && host.agentState?.(agent, settings)?.ok).map((agent) => agent.label ?? agent.id);
    const rooms = host.projects?.() ?? [];
    const added = s.added.map((one) => rooms.find((room) => room.root === one.root || room.name === one.name)).filter(Boolean);
    const room = added[0] ?? rooms[0] ?? null;
    const aiOn = s.ollama?.running && chatModels().length > 0;
    const provider = s.memory?.embedProvider;
    const rows = [
      [t('Agents'), connected.length ? new Intl.ListFormat(language(), { type: 'conjunction' }).format(connected) : t('None connected yet'), connected.length > 0, 'agents'],
      [t('AI on your computer'), aiOn ? `${s.ollama.chatModel ?? chatModels()[0].name}${localHost(s.ollama.host) ? '' : ` · ${t('another computer\'s')}`}` : t('For later'), aiOn, 'ai'],
      [t('Memory'), provider === 'ollama' ? t('Search by meaning, on your computer') : provider === 'gemini' ? t('Search by meaning, with Gemini') : t('Exact words'), provider === 'ollama' || provider === 'gemini', 'memory'],
      [t('Project'), room ? room.name : t('None yet'), Boolean(room), 'project'],
    ];
    const summary = el('div', 'wl-card wl-checks');
    for (const [title, sub, ok, id] of rows) {
      const row = el('div', `wl-check${ok ? '' : ' later'}`);
      const tick = el('span', 'wl-tick');
      if (ok) tick.innerHTML = TICK; // trusted: our own SVG string
      else tick.textContent = '–';
      const words = el('div');
      words.append(el('b', null, title), el('small', null, sub));
      row.append(tick, words);
      if (!ok) row.append(button('wl-btn small', t('Do it now'), () => go(id)));
      summary.append(row);
    }
    const nextCards = el('div', 'wl-split');
    const card = (title, sub, onClick) => { const node = button('wl-card wl-next', null, onClick); node.append(el('b', null, title), el('small', null, sub)); return node; };
    nextCards.append(
      card(t('Connect your projects'), t('So one can look up what another knows.'), () => { finish(); host.openLinks?.(); }),
      card(t('Module Market'), t('Images, reminders, GitHub and more.'), () => { finish(); host.openMarket?.(); }),
    );
    // Training (B-7): ready here, switched on in a project's Settings.
    const fitNow = fit();
    const train = fitNow?.recommended?.train ?? null;
    const trainCard = el('div', 'wl-card wl-train');
    trainCard.append(el('b', null, t('Train your own AI')));
    if (train) {
      trainCard.append(el('p', 'wl-muted', t('Your computer can train its own AI with what your project knows, up to {model}. Everything is ready: you turn it on in your project\'s Settings › Memory › Train your own AI.', { model: train.label })));
      const reqs = el('ul', 'wl-reqs');
      reqs.append(el('li', null, facts().accelerator === 'apple' ? t('Apple chip with 12 GB of memory or more') : t('NVIDIA card with 9 GB or more and CUDA 12 (experimental)')));
      reqs.append(el('li', null, t('About {gb} GB free while it trains', { gb: Math.ceil(train.params * 5.5) + 2 })));
      trainCard.append(reqs);
    } else {
      trainCard.append(el('p', 'wl-muted', t('This computer cannot train. It takes a Mac with an Apple chip and 12 GB of memory, or an NVIDIA card with 9 GB or more.')));
    }
    content.replaceChildren(...head(t('MADRE is ready'), t('Here is what is set. Anything you left for later has its button.')), summary, el('p', 'wl-eyebrow wl-gap', t('What comes next')), nextCards, trainCard);
    const learn = button('wl-btn', t('Get to know MADRE'), () => { const after = then ?? host.chapters; finish(); after?.(); });
    footer({
      next: room ? t('Go to my project') : t('Go to Home'),
      onNext: async () => { finish(); if (room) await host.openProject?.(room); },
      extra: learn,
    });
  }

  // ---- The events of this page's MADRE: Ollama's install and downloads, as they go.
  function listen() {
    try {
      stream = new EventSource('/api/events');
      stream.onmessage = (message) => {
        let event = null;
        try { event = JSON.parse(message.data); } catch { return; }
        if (event?.payload?.id !== 'ollama') return;
        if (event.type === 'extension.install.output') {
          const lines = event.payload.lines ?? [];
          const pull = [...s.pulls.values()].find((one) => one.running);
          if (pull) {
            for (const line of lines) {
              const match = PULL_LINE.exec(line);
              if (match) { pull.first ??= match[1]; if (match[1] === pull.first) pull.pct = Number(match[2]); }
              else if (/verifying|writing manifest|success/.test(line)) { pull.pct = 100; pull.phase = 'verify'; }
            }
          } else if (s.install?.running) s.install.lines = [...(s.install.lines ?? []), ...lines].slice(-20);
          repaint();
        }
        if (event.type === 'extension.install.finished') {
          const model = event.payload.model ?? null;
          const pull = model ? s.pulls.get(model) : [...s.pulls.values()].find((one) => one.running);
          if (pull) {
            if (event.payload.ok) { pull.running = false; pull.pct = 100; } else Object.assign(pull, { running: false, error: event.payload.detail ?? t('It did not finish.'), trouble: event.payload.trouble ?? null });
          } else if (s.install?.running) {
            s.install = event.payload.ok ? null : { error: event.payload.detail ?? t('It did not install.'), trouble: event.payload.trouble ?? null, manual: event.payload.trouble === 'permission' };
          }
          void readOllama({ probe: true }).then(repaint);
        }
      };
    } catch { /* no stream: «I did it» and the probe keep it current */ }
  }
  const repaint = () => { if (stepId() === 'ai') paintAi(); else if (stepId() === 'memory') paintMemory(); };

  function show() {
    leave?.();
    leave = null;
    paintRail();
    content.scrollTop = 0;
    const id = stepId();
    if (id === 'hello') hello();
    else if (id === 'machine') machine();
    else if (id === 'agents') agents();
    else if (id === 'ai') ai();
    else if (id === 'memory') memoryStep();
    else if (id === 'project') project();
    else void ready();
  }
  function finish() {
    if (finished) return;
    finished = true;
    void save({ finished: true, done: 'ready', at: 'ready' });
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    leave?.();
    stream?.close();
    clearInterval(pollTimer);
    current = null;
    dialog.remove();
    host.closed?.();
  });
  dialog.showModal();
  content.append(el('p', 'wl-muted', t('Reading…')));

  current = { go: (to) => { s.step = Math.max(0, WELCOME_STEPS.indexOf(to)); show(); }, close: () => dialog.close(), node: dialog };
  void Promise.all([getJson('/api/tour'), getJson('/api/environment'), readOllama()]).then(([tour, environment]) => {
    if (!current) return;
    s.progress = tour?.state?.welcome ?? s.progress;
    s.env = environment?.environment ?? null;
    s.hardware = environment?.hardware ?? null;
    s.geminiKey = Boolean(environment?.geminiKey);
    s.memory = environment?.memory ?? null;
    const from = at ?? s.progress.at ?? 'hello';
    s.step = Math.max(0, WELCOME_STEPS.indexOf(from));
    listen();
    show();
    if (!s.progress.at) void save({ at: WELCOME_STEPS[s.step] });
  });
  return current;
}
