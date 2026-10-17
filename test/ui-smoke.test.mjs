import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// A deliberately tiny DOM: enough for app.js to boot, replay a real room
// transcript and open the live stream. It catches ordering and reference
// errors that unit tests on pure modules cannot see.

const registry = new Map();
class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = { setProperty: (name, value) => { this.style[name] = value; }, removeProperty: (name) => { delete this.style[name]; } };
    this.listeners = {};
    this.hidden = false;
    this.title = '';
    this.value = '';
    this.disabled = false;
    this.scrollTop = 0; this.scrollHeight = 0; this.clientHeight = 0;
    this.options = { length: 0 };
    this.open = false;
    this.offsetWidth = 260;
    this.offsetHeight = 100;
    this.getBoundingClientRect = () => ({ top: 100, bottom: 130, left: 100, width: 26 });
    this.isConnected = true;
    this._text = '';
    this._id = '';
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => { const on = force ?? !classes.has(name); if (on) classes.add(name); else classes.delete(name); return on; },
    };
    Object.defineProperty(this, 'className', {
      get: () => [...classes].join(' '),
      set: (value) => { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach((name) => classes.add(name)); },
    });
  }
  get id() { return this._id; }
  set id(value) { this._id = value; registry.set(value, this); }
  get textContent() { return this._text + this.children.map((child) => (typeof child === 'string' ? child : child.textContent)).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  set innerHTML(value) { this._text = String(value); this.children = []; }
  get lastChild() { return this.children.at(-1) ?? null; }
  append(...nodes) { for (const node of nodes) { this.children.push(node); if (node instanceof FakeElement) node.parentNode = this; } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  querySelector(selector) {
    if (selector.startsWith('#')) return registry.get(selector.slice(1)) ?? null;
    const className = selector.replace(/^\./, '').split(/[\s.\[]/)[0];
    const walk = (node) => {
      for (const child of node.children) {
        if (child instanceof FakeElement) {
          if (child.classList.contains(className) || child.tagName === selector.toUpperCase()) return child;
          const found = walk(child);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(selector) { const out = []; const walk = (node) => { for (const child of node.children) if (child instanceof FakeElement) { const cls = selector.replace(/^\./, '').split(/[\s.\[]/)[0]; if (child.classList.contains(cls)) out.push(child); walk(child); } }; walk(this); return out; }
  add(option) { this.options.length += 1; this.options[this.options.length - 1] = option; if (!this.value) this.value = option.value; }
  focus() {} scrollIntoView() {} requestSubmit() {} showModal() { this.open = true; } show() { this.open = true; } close() { this.open = false; }
  setSelectionRange() {}
  getClientRects() { return []; } matches() { return false; } closest() { return null; }
  prepend(...nodes) { for (const node of nodes.reverse()) { this.children.unshift(node); if (node instanceof FakeElement) node.parentNode = this; } }
  replaceWith(node) { const parent = this.parentNode; if (!parent) return; parent.children[parent.children.indexOf(this)] = node; node.parentNode = parent; }
}

function buildDocument(html) {
  const document = new FakeElement('document');
  for (const id of html.matchAll(/id="([^"]+)"/g)) {
    const element = new FakeElement('div');
    element.id = id[1];
    document.append(element);
  }
  // Elements app.js reaches by selector rather than id.
  const submit = new FakeElement('button');
  registry.get('composer').append(submit);
  const label = new FakeElement('span'); label.className = 'connection-label';
  registry.get('connection').append(label);
  const empty = new FakeElement('div'); empty.className = 'empty';
  registry.get('thread-inner').append(empty);
  document.querySelector = (selector) => {
    if (selector === '#composer button[type="submit"]') return submit;
    return FakeElement.prototype.querySelector.call(document, selector);
  };
  document.getElementById = (id) => registry.get(id) ?? null;
  document.querySelectorAll = (selector) => FakeElement.prototype.querySelectorAll.call(document, selector);
  document.createElement = (tag) => new FakeElement(tag);
  document.createDocumentFragment = () => new FakeElement('fragment');
  document.body = new FakeElement('body');
  document.documentElement ??= new FakeElement('html');
  return document;
}

test('the room UI boots against a real transcript without throwing', async () => {
  const html = await readFile(join(process.cwd(), 'public', 'index.html'), 'utf8');
  const lines = (await readFile(join(process.cwd(), 'test', 'fixtures', 'room-events.jsonl'), 'utf8')).split('\n').filter(Boolean);
  const appSource = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const events = lines.map((line) => JSON.parse(line));
  const failures = events.filter((event) => event.type === 'message.failed').length;

  // The transcript on disk exercises eight of the sixty-one kinds of event this page can draw.
  // The other fifty-three were never once rendered by any test — which is how a constant declared
  // at the bottom of app.js and read by `renderLease` shipped three times: the try around each
  // renderer swallowed the error, the strip silently never appeared, and every test stayed green.
  // One synthetic event of every kind goes in behind the real ones. The payloads are only
  // plausible, so a missing field is this fixture's fault and is ignored; what is never ignored is
  // a renderer reaching for something that does not exist yet.
  const everyKind = [...appSource.matchAll(/case '([a-z]+\.[a-z.]+)':/g)].map((match) => match[1]);
  const seeded = new Set(events.map((event) => event.type));
  let sequence = events.at(-1).sequence;
  const firstSynthetic = sequence + 1;
  for (const type of everyKind) {
    if (seeded.has(type)) continue;
    seeded.add(type);
    sequence += 1;
    events.push({ id: `synthetic-${sequence}`, sequence, type, timestamp: new Date().toISOString(), payload: {
      agent: 'codex', target: 'codex', id: 'ash', name: 'Ash', messageId: 'm1', responseMessageId: 'r1',
      enabled: true, scopes: ['write'], unavailable: [], files: [], text: 'x', message: 'x', error: 'x',
      outDir: '.', terms: [], hits: 1, usedPercent: 50, level: 'warning', source: 'provider-window',
      kind: 'decision', version: '0.5.1', latest: '0.5.1', path: 'a.mjs', model: 'qwen2.5:7b',
      where: 'user', by: 'you', mode: 2, plans: 0, turns: 0, reason: 'x', n: 1, count: 1,
    } });
  }
  // Deliberately contradict /api/state: replay is history and must not change the live switch.
  events.find((event) => event.type === 'extension.toggled').payload.enabled = false;

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let streamUrl = null;
  let streamInstance = null;
  globalThis.document = buildDocument(html);
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'navigator', { value: { platform: 'MacIntel', userAgent: 'test', clipboard: { writeText: async () => {} } }, configurable: true });
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.CSS = { escape: (value) => String(value).replace(/[^\w-]/g, '\\$&') };
  // The files panel remembered open, so the tree paints during boot. Twice now a const declared
  // at the bottom of app.js has been read by a function that runs up here, and both times the
  // room answered "Cannot access X before initialization" while every test stayed green — the
  // panel simply never opened. It opens now.
  // A browser has these; the windows schedule their depth with them.
  globalThis.requestAnimationFrame ??= (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);
  globalThis.localStorage = { store: { 'pulse.tree': 'open' }, getItem(key) { return this.store[key] ?? null; }, setItem(key, value) { this.store[key] = String(value); } };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  globalThis.EventSource = class { constructor(url) { streamUrl = url; streamInstance = this; } close() {} };
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('/api/tree')) return { ok: true, json: async () => ({ entries: [
      { name: 'src', kind: 'dir' },
      { name: 'README.md', kind: 'file', size: 420, contentType: 'text/markdown' },
    ] }) };
    if (url === '/api/extensions') return { ok: true, json: async () => ({ installing: null, extensions: [] }) };
    if (url === '/api/commands') return { ok: true, json: async () => ({ commands: [{ name: 'git', module: 'git-pulse', title: 'Git Pulse', usage: '/git', summary: 'repo facts', available: true }] }) };
    if (String(url).startsWith('/api/models')) return { ok: true, json: async () => ({ models: {} }) };
    if (String(url).startsWith('/api/briefing')) return { ok: true, json: async () => ({
      agent: 'codex', mode: 1, ceiling: 1, maxMode: 3, lease: false, chars: 2100, recalled: 2, quoted: 1, spared: 300,
      parts: [
        { id: 'room', chars: 900, when: 'always', where: null, text: 'You are in a room called MADRE.' },
        { id: 'memories', chars: 1200, when: 'the archive has something for this turn', where: 'MU/TH/UR → MEMORY', text: '- [decision] The webhook verifies the signature.' },
      ],
      window: { from: 3, through: 12, carried: 6, omitted: 2 },
      launch: { agent: 'codex', label: 'Codex', local: false, executable: '/usr/local/bin/codex', cwd: '/Users/demo/pulse', args: ['--sandbox', 'read-only', '<the briefing above>'], promptMarker: '<the briefing above>', isolation: ['--ephemeral: the run keeps no session of its own.'], env: [{ name: 'X_HOME', note: 'a temporary home' }], mcpServers: [{ name: 'pulse-playwright', tools: ['browse'], env: [] }], memoryServer: { name: 'pulse-memory', tools: ['recall'] } },
    }) };
    if (url === '/api/outbound') return { ok: true, json: async () => ({
      destinations: [{ id: 'npm', to: 'the npm registry', what: 'the name of a package and nothing else', when: 'once a day', where: 'MU/TH/UR → RELEASE CHANNEL', local: false, inside: true, on: true, calls: 2, failed: 0, last: new Date().toISOString() }],
      recent: [{ at: '2026-09-25T19:13:50.030Z', id: 'npm', to: 'the npm registry', local: false, method: 'GET', path: '/madre/latest', ok: true, status: 200, ms: 343 }],
      undeclared: 0, says: 'Every request this process made went to an address declared above.',
    }) };
    if (url === '/api/maturity') return { ok: true, json: async () => ({ verdict: { headline: 'WORKING', says: 'it is coming along', next: { text: 'keep working', where: 'THE ROOM' } } }) };
    if (url === '/api/privacy') return { ok: true, json: async () => ({ terms: ['one', 'two'], marker: '[ENTIDAD-ORG]' }) };
    if (url === '/api/economy') return { ok: true, json: async () => ({
      turns: 4,
      totals: { input: 12000, output: 3400, prefixShare: 0.41, charsPerInputToken: 3.8 },
      saved: { tokens: 90210, cachedTokens: 88000, cachedShare: 0.62, unsentChars: 2210 },
      blocks: [{ id: 'context', chars: 4000, perTurn: 1000, always: false }, { id: 'room', chars: 800, perTurn: 200, always: true }],
    }) };
    // AJUSTES reads these when it opens; the cards must speak even when the server cannot.
    if (['/api/settings', '/api/turns', '/api/sentinel/settings'].includes(url) || String(url).startsWith('/api/sentinel')) return { ok: false, json: async () => ({}) };
    assert.equal(url, '/api/state');
    return { json: async () => ({
      projectRoot: '/Users/demo/pulse',
      softTokenBudget: 500000,
      ash: { enabled: true },
      agents: ['codex', 'claude', 'gemini', 'opencode'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' })),
      events,
    }) };
  };
  try {
    const app = await import('../public/app.js');
    // GFM tables render as real tables, not as pipes in a paragraph.
    const table = app.renderMarkdown('Before\n\n| Claim | State |\n|---|:---:|\n| a \\| b | **ok** |\n| c | d |\n\nAfter');
    const tableNode = table.children.find((node) => node.classList?.contains('table-wrap'));
    assert.ok(tableNode, 'a table-wrap block is produced');
    const cells = [];
    (function walk(node) { for (const child of node.children ?? []) { if (typeof child === 'string') continue; if (/^(td|th)$/i.test(child.tagName)) cells.push(child.textContent); walk(child); } })(tableNode);
    assert.deepEqual(cells, ['Claim', 'State', 'a | b', 'ok', 'c', 'd']);
    // A message BISHOP's channel brought reads as BISHOP's (or as the human's, from another room),
    // never with the header its agent reads; both header formats, and the order that left on its own.
    const pressed = app.relayedOf({ via: 'bishop', text: 'BISHOP › 1/2 · plan p-abcdef · from Salas, sent by the human. Answer in this room only; this turn cannot pass anything on to other rooms.\n\nResume el README.' });
    assert.deepEqual(pressed, { kind: 'order', step: '1', total: '2', plan: 'p-abcdef', auto: false, body: 'Resume el README.' });
    assert.equal(app.relayedOf({ via: 'bishop', text: 'BISHOP › 2/2 · plan p-abcdef · from Salas, sent on its own within the mode the human chose. Answer in this room only; this turn cannot pass anything on to other rooms.\n\nOtro.' }).auto, true);
    assert.equal(app.relayedOf({ via: 'bishop', text: 'BISHOP › order 1 of 1 · plan p-099492 · sent by the human from Salas. Answer in this room. You cannot delegate or give orders to other rooms in this turn.\n\nViejo.' }).body, 'Viejo.');
    assert.deepEqual(app.relayedOf({ via: 'bishop', text: 'BISHOP › question from room pulse, asked by the human there. Answer from what you know of the linked rooms; this turn ends with the answer.\n\n¿Qué decidió?' }), { kind: 'question', room: 'pulse', body: '¿Qué decidió?' });
    assert.equal(app.relayedOf({ via: 'iphone', text: 'hola' }), null);
  } finally {
    console.error = originalError;
  }

  // A field my synthetic payloads forgot is this fixture's fault and is only checked on the real
  // transcript. A renderer reaching for a binding that does not exist yet is never anyone's fault
  // but the code's, so that shape is checked across every kind of event the page can draw.
  const ofSynthetic = (line) => { const at = line.match(/could not render event (\d+)/); return at && Number(at[1]) >= firstSynthetic; };
  assert.deepEqual(errors.filter((line) => /before initialization|is not defined/.test(line)), [], 'a renderer reads something declared below the replay that runs it');
  assert.deepEqual(errors.filter((line) => !ofSynthetic(line)), [], 'no event failed to render');

  // The files panel catches its own errors and draws them as a line of text, so nothing throws
  // and a test that only boots the room stays green while the tree says "could not list". That is
  // how `Cannot access 'touched' before initialization` reached a person twice: a const declared
  // at the bottom of app.js, read by a function that runs during boot. Assert it actually painted.
  await new Promise((resolve) => setTimeout(resolve, 20));
  const treePainted = registry.get('tree-body')?.textContent ?? '';
  assert.ok(!/could not list|Cannot access|is not defined/i.test(treePainted), `the files panel failed while the room looked fine: ${treePainted.slice(0, 140)}`);
  assert.match(treePainted, /README\.md/, 'the files panel never painted its entries');
  assert.equal(streamUrl, `/api/events?since=${events.at(-1).sequence}`, 'boot reached the live stream with the right cursor');
  const badge = registry.get('mother-count');
  assert.equal(badge.hidden, false);
  assert.equal(Number(badge.textContent) >= failures, true, 'MU/TH/UR badge counts the recorded failures');
  const column = registry.get('thread-inner');
  const rendered = column.children.filter((child) => child.className !== 'empty');
  assert.ok(rendered.length >= events.filter((event) => event.type === 'message.created').length, 'every message became a node');
  assert.equal(column.querySelector('.thinking'), null, 'no ghost typing indicator survives the replay');
  assert.equal(column.querySelector('.empty'), null, 'the empty state is gone once messages exist');
  const firstUser = column.children.find((child) => child instanceof FakeElement && child.classList.contains('user'));
  assert.ok(firstUser, 'a human message rendered');
  assert.match(firstUser.textContent, /TÚ · AGENTES/, 'human messages carry the agents label');
  assert.equal(registry.get('crew-label') !== undefined, true);
  // And the whole pipe, on a rendered page rather than on the catalogue alone: what the page
  // itself builds comes out in Spanish. (The markup's own words are walked through the catalogue
  // in a browser; this toy DOM never parses them, so the catalogue's own test covers those.)
  assert.match(registry.get('message').placeholder, /Respuestas más cortas|Escribe aquí/, 'the composer prompts the human in English');
  const ashToggle = registry.get('ash-toggle');
  assert.equal(ashToggle.hidden, false, 'enabled beta module exposes ORDER 937 in the composer');
  assert.equal(ashToggle.getAttribute('aria-pressed'), 'true', 'historical module state overwrote /api/state');
  streamInstance.onopen();
  streamInstance.onmessage({ data: JSON.stringify({ id: 'live-ash-off', sequence: sequence + 1, type: 'extension.toggled', payload: { id: 'ash', enabled: false } }) });
  assert.equal(ashToggle.hidden, true, 'a live module toggle did not turn Ash off');
  streamInstance.onmessage({ data: JSON.stringify({ id: 'live-ash-on', sequence: sequence + 2, type: 'extension.toggled', payload: { id: 'ash', enabled: true } }) });
  assert.equal(ashToggle.hidden, false, 'a live module toggle did not turn Ash on');
  ashToggle.listeners.click[0]();
  assert.equal(ashToggle.getAttribute('aria-pressed'), 'false', 'the human can turn it off per message');
  assert.equal(globalThis.__pulse.state.ash, false);
  // Click on a sphere expands session usage, replayed history included.
  const sphere = registry.get('agents').children.find((child) => child instanceof FakeElement);
  assert.ok(sphere, 'agent spheres rendered');
  const popup = registry.get('agent-pop');
  sphere.getBoundingClientRect = () => ({ bottom: 40, left: 100, width: 26 });
  globalThis.window.innerWidth = 1200;
  const clickHandler = registry.get('agents').listeners.click?.[0];
  assert.ok(clickHandler, 'sphere click handler installed');
  clickHandler({ target: { closest: () => sphere } });
  assert.equal(popup.hidden, false);
  assert.match(popup.textContent, /del límite de [0-9]*[hd] del proveedor|del límite de este proyecto · últimas 5 h|tokens en las últimas 5 h/);
  assert.match(popup.textContent, /Respuestas/);
  const statsText = popup.textContent;
  assert.ok(/\d+/.test(statsText));

  // Easter egg: trackpad-style bursts at the end of the record.
  const { trackHold, state: uiState } = globalThis.__pulse;
  // /module becomes visibly distinct while it is composed, then turns into a single-file SDK
  // request without stealing the agent the human already selected.
  const message = registry.get('message');
  message.value = '/module un reloj local';
  for (const listener of message.listeners.input ?? []) listener({});
  assert.equal(registry.get('composer').classList.contains('module-command'), true, 'the module typebox did not turn on');
  assert.match(registry.get('crew-label').textContent, /MODULE · REQUIERE #2/);
  const chosenTarget = registry.get('target').value;
  // Sent, it arms #2 for its message the way /image does, and goes.
  const moduleRequest = await globalThis.__pulse.runSlashCommand(message.value);
  assert.match(registry.get('crew-label').textContent, /MÓDULO · CREAR/);
  assert.equal(moduleRequest.handled, false);
  assert.equal(moduleRequest.target, chosenTarget, '/module changed the selected agent');
  assert.equal(moduleRequest.draft, true, '/module asked for the whole project instead of its draft folder');
  assert.match(moduleRequest.text, /un reloj local/);
  assert.match(moduleRequest.text, /<id>\.module\.mjs/);
  assert.equal(uiState.mode, 2, 'the human could not arm CREATE for /module');
  message.value = '';
  for (const listener of message.listeners.input ?? []) listener({});
  assert.equal(registry.get('composer').classList.contains('module-command'), false, 'the module typebox stayed purple after clearing');
  registry.get('create-toggle').listeners.click[0]();
  assert.equal(uiState.mode, 1, 'the module test did not return the composer to EXCHANGE');
  const thread = registry.get('messages');
  thread.scrollHeight = 1000; thread.clientHeight = 400; thread.scrollTop = 600; // at bottom
  const t0 = 1_000_000;
  assert.equal(trackHold(true, t0), false);
  assert.equal(trackHold(true, t0 + 50), false, 'same burst is ignored');
  assert.equal(trackHold(true, t0 + 1500), false);
  assert.equal(trackHold(true, t0 + 3000), false, 'three pushes but only 3 s');
  assert.equal(trackHold(true, t0 + 4100), true, 'pushes every ~1.5 s spanning 4 s arm MOTHER');
  assert.equal(uiState.expendable, true);
  // The page boots in the language MADRE speaks, which is Spanish; the crew label says so.
  assert.match(registry.get('crew-label').textContent, /PRESCINDIBLE/);
  assert.match(column.children.at(-1).textContent, /fin del registro/);

  // The core: four panes, one at a time, with the prompt through all of them. It is the most
  // built screen in this page and nothing else here would notice if it threw.
  await globalThis.__pulse.openCore();
  const { core } = globalThis.__pulse;
  const body = registry.get('core-body');
  assert.equal(registry.get('core').open, true, 'the core did not open');
  assert.ok(body.querySelector('.core-strip'), 'the strip is missing');
  assert.ok(body.querySelector('.core-tabs'), 'the tabs are missing');
  assert.ok(body.querySelector('.console-line'), 'the prompt is missing');
  const panes = body.querySelector('.core-panes');
  // It opens on the board — you and your local model — and the strip about the next turn waits
  // for the panes that are about the next turn.
  assert.deepEqual(panes.children.map((pane) => pane.dataset.pane), ['board', 'document', 'launch', 'egress', 'console']);
  assert.deepEqual(panes.children.map((pane) => pane.hidden), [false, true, true, true, true], 'more than one pane is showing');
  assert.equal(body.querySelector('.core-strip').hidden, true, 'the strip about the next turn shows on the board');
  await new Promise((resolve) => setTimeout(resolve, 0));
  // Nothing wired answers here but the verdict, and the board says what it could not read
  // instead of drawing figures nobody measured.
  assert.match(panes.children[0].textContent, /TÚ[\s\S]*TU MODELO LOCAL[\s\S]*IA LOCAL[\s\S]*LA CALIDAD[\s\S]*NO HAY NADA QUE LEER/);
  // Each one filled from the room, and each one with its own `==>` sections.
  // In the language MADRE speaks, which is the point of reading it here rather than in the
  // catalogue: the page, the panes and the words all came up together.
  assert.match(panes.children[1].textContent, /EL DOCUMENTO[\s\S]*MEMORIES[\s\S]*LO QUE INCLUYE/);
  assert.match(panes.children[2].textContent, /EL LANZAMIENTO[\s\S]*\/usr\/local\/bin\/codex/);
  assert.match(panes.children[3].textContent, /ENVÍOS[\s\S]*the npm registry/);
  // An inquiry that is already a pane opens it rather than printing it twice.
  const prompt = body.querySelector('.console-line');
  const ask = async (text) => { prompt.querySelector('INPUT').value = text; await prompt.listeners.submit[0]({ preventDefault() {} }); };
  await ask('launch');
  assert.equal(core.pane, 'launch');
  assert.equal(body.querySelector('.core-strip').hidden, false, 'the strip is gone from the launch it decides');
  // Everything else is answered in her own pane, and the count only moves on what she cannot read.
  await ask('weight');
  assert.equal(core.pane, 'console');
  assert.match(panes.children[4].textContent, /CARACTERES EN 2 BLOQUES/);
  assert.equal(core.strikes, 0);
  await ask('delete the archive');
  assert.equal(core.strikes, 1);
  assert.match(panes.children[4].textContent, /INTENTOS ANTES DE QUE ESTA INTERFAZ SE CIERRE/);
  registry.get('core').close();

  // AJUSTES: one window, three sections, six categories, each card saying where it stands; the
  // search finds a setting typed without its accent and lands in its category.
  const settingsHead = new FakeElement('header'); settingsHead.className = 'settings-head';
  registry.get('settings').append(settingsHead);
  registry.get('settings').getBoundingClientRect = () => ({ top: 68, bottom: 726, left: 22, right: 1002, width: 980 });
  globalThis.__pulse.openSettings(true);
  const settingsBody = registry.get('settings-body');
  assert.equal(registry.get('settings').open, true, 'AJUSTES did not open');
  assert.equal(settingsBody.querySelectorAll('.settings-section').length, 3, 'the board is not Tú, La tripulación, Sistema');
  const cards = settingsBody.querySelectorAll('.settings-card');
  assert.deepEqual(cards.map((card) => card.dataset.cat), ['look', 'room', 'files', 'agents', 'memory', 'local', 'mcp', 'permissions', 'privacy', 'release']);
  assert.ok(cards.every((card) => card.querySelector('.settings-line')?.textContent.trim()), 'a card does not say where it stands');
  const search = registry.get('settings-search');
  search.value = 'actualizacion';
  search.listeners.input[0]();
  assert.match(settingsBody.textContent, /Actualizaciones y errores/, 'a search without the accent misses the category');
  settingsBody.querySelector('.settings-result').listeners.click[0]();
  assert.equal(globalThis.__pulse.settingsWindow().open, 'release', 'the result does not land in its category');
  assert.ok(settingsBody.querySelector('.settings-detail'), 'the category has no panel');
  globalThis.__pulse.openSettings(false);
  assert.equal(registry.get('settings').open, false);


  // A reviewed human message carries the mark, then everything disarms.
  const stream = new globalThis.EventSource('/x');
  void stream;
  globalThis.__pulse.disarmExpendable();
  assert.equal(uiState.expendable, false);
  // The line in the box is the whole address: who writes, then who it goes to.
  assert.equal(registry.get('crew-label').textContent, 'HUMANO › @CODEX ›');

  // Silence longer than two seconds starts over; scrolling up resets.
  assert.equal(trackHold(true, t0 + 20_000), false);
  assert.equal(trackHold(true, t0 + 23_000), false, 'gap > 2 s discards the earlier push');
  assert.equal(trackHold(true, t0 + 24_000), false);
  assert.equal(trackHold(false, t0 + 25_000), false, 'an upward push resets');
  assert.equal(trackHold(true, t0 + 30_000), false);
  assert.equal(uiState.expendable, false);
});

test('the bar is yours: a right-click opens it, − takes a key off, a tile puts one back, Esc closes it', async () => {
  // On the room the first test booted. The bar is the header with its keys moved into it.
  const kit = globalThis.__pulse.bar;
  const bar = registry.get('bar');
  const store = globalThis.localStorage.store;
  // The MACROVERSO key ships in the default order but belongs to the room of SALAS alone: an
  // ordinary room does not offer it, so it never reaches its bar.
  // On the Mac, Salas (a house), reload and AJUSTES live in the second bar (2026-10-09): they are not
  // keys of this one, and the card never offers them.
  const shipped = ['crew', 'modules', 'mother', 'nostromo', 'servers', 'finder', 'phone'];
  const onBar = () => bar.children.filter((node) => node instanceof FakeElement && node.dataset.barItem && !node.classList.contains('bar-off')).map((node) => node.dataset.barItem);
  assert.deepEqual(kit.order, shipped, 'the bar does not ship as it was');
  assert.ok(!kit.catalogue().includes('macroverso'), 'an ordinary room offers the MACROVERSO key');
  const home = registry.get('bar-home');
  assert.equal(home.hidden, false, 'the second bar is not shown on the Mac');
  // Beside the house, the key that goes to another open project (2026-10-10).
  assert.deepEqual(home.children.filter((node) => node instanceof FakeElement).map((node) => node.id), ['home-button', 'switch-button', 'reload-button', 'custom-button', 'power-button'], 'the second bar does not hold the house, the switch, reload, AJUSTES and the power key, in that order');
  assert.ok(!onBar().includes('settings') && !onBar().includes('reload') && !onBar().includes('salas'), 'a key of the second bar is still on this one');
  assert.ok(kit.catalogue().includes('memory') && ['ash', 'intents', 'ollama'].every((id) => kit.catalogue().includes(id)), 'Memory and the modules with a window are not offered');

  // Whatever the browser kept that is not a list is the bar as it ships.
  store['pulse.barItems'] = '{not a list';
  kit.layout();
  assert.deepEqual(kit.order, shipped);
  // An id nobody knows — a module that was deleted — is skipped, and AJUSTES cannot be moved from the end.
  store['pulse.barItems'] = JSON.stringify(['finder', 'settings', 'a-module-that-was-deleted', 'memory']);
  kit.layout();
  assert.deepEqual(kit.order, ['finder', 'memory']);
  assert.deepEqual(onBar(), ['finder', 'memory']);
  assert.ok(registry.get('modules-button').classList.contains('bar-off'), 'a key that is off is still on the bar');
  assert.ok(registry.get('agents').classList.contains('bar-off') && registry.get('agents-compact').classList.contains('bar-off'), 'the crew is one key: both of its forms go');
  const memoryKey = bar.children.find((node) => node.dataset?.barItem === 'memory');
  assert.equal(memoryKey.getAttribute('aria-label'), 'Lo que recuerda');
  assert.ok(memoryKey.classList.contains('tree-button'), 'a new key is not drawn like the others');

  // A right-click on a key opens the bar for editing, without the browser's own menu.
  let prevented = false;
  registry.get('tree-button').listeners.contextmenu[0]({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(kit.editing, true);
  assert.ok(bar.classList.contains('bar-editing'));
  assert.deepEqual([...kit.badges.keys()], ['finder', 'memory'], 'AJUSTES wears a «−», or a key that can go does not');
  assert.equal(kit.badges.get('finder').getAttribute('aria-label'), 'Quitar Archivos de la barra');
  const card = kit.card;
  assert.equal(card.hidden, false);
  assert.equal(card.getAttribute('aria-label'), 'Agregar a la barra');
  const tiles = () => card.querySelectorAll('.bar-tile').map((tile) => tile.dataset.barItem);
  assert.ok(['crew', 'modules', 'mother', 'nostromo', 'servers', 'ash', 'intents', 'ollama'].every((id) => tiles().includes(id)), `the card does not offer what is off the bar: ${tiles()}`);
  assert.ok(!tiles().some((id) => ['reload', 'salas'].includes(id)), 'the card offers a key of the second bar');
  assert.ok(!tiles().some((id) => ['finder', 'memory', 'settings'].includes(id)), 'the card offers what is already on the bar, or AJUSTES');
  assert.equal(card.querySelectorAll('.bar-tile').find((tile) => tile.dataset.barItem === 'nostromo').getAttribute('aria-label'), 'Agregar Mapa de memoria');
  assert.match(card.textContent, /Listo/);

  // «−» takes the key off and remembers it; the key goes to the card.
  kit.badges.get('finder').listeners.click[0]({ stopPropagation() {} });
  assert.deepEqual(kit.order, ['memory']);
  assert.ok(registry.get('tree-button').classList.contains('bar-off'));
  // A module of yours that the board has not named yet is kept, not forgotten.
  assert.deepEqual(JSON.parse(store['pulse.barItems']), ['memory', 'a-module-that-was-deleted']);
  assert.ok(tiles().includes('finder'), 'a key taken off is not offered back');
  // A tile puts its key at the end, before AJUSTES.
  card.querySelectorAll('.bar-tile').find((tile) => tile.dataset.barItem === 'nostromo').listeners.click[0]();
  assert.deepEqual(kit.order, ['memory', 'nostromo']);
  assert.deepEqual(onBar(), ['memory', 'nostromo']);
  assert.deepEqual(JSON.parse(store['pulse.barItems']).slice(0, 2), ['memory', 'nostromo']);
  assert.ok(kit.badges.has('nostromo') && !tiles().includes('nostromo'));

  // Esc puts it back: no tremble, no «−», no card.
  kit.keys({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(kit.editing, false);
  assert.equal(bar.classList.contains('bar-editing'), false);
  assert.equal(kit.badges.size, 0);
  assert.equal(card.hidden, true);
  // A second right-click closes it too.
  registry.get('nostromo-bar').listeners.contextmenu[0]({ preventDefault() {} });
  assert.equal(kit.editing, true);
  kit.edit(false);
  assert.equal(kit.editing, false);
});

test('a module card has the same floors whatever the module is, and its numbers have room', async () => {
  // The renderer itself, on the DOM the smoke test already boots: a card is built, not described.
  const { moduleCard } = globalThis.__pulse;
  assert.ok(moduleCard, 'the module card renderer is not reachable');

  const ash = moduleCard({
    id: 'ash', kind: 'builtin', name: 'Ash', vendor: 'MADRE', version: '1.0.0', versionSource: 'declared',
    summary: 'Asks every agent for compact prose.', creates: ['nothing in the project', 'a switch in ~/.pulse/config.json'],
    card: 'ash', runs: [], status: { installed: true, detail: 'on' }, preflight: { ok: true, problems: [] }, install: { display: '', platforms: [] },
  });
  const floors = ash.children.filter((child) => typeof child !== 'string');
  // What it does sits in the first floor, under the name: it is what decides whether you want it.
  assert.deepEqual(floors.map((floor) => floor.className), ['head', 'card-fold', 'card-panel', 'actions'], 'the floors of a card changed');
  assert.equal(ash.querySelector('.summary')?.textContent, 'Asks every agent for compact prose.', 'what the module does is not under its name');
  assert.equal(floors.at(-1).className, 'actions', 'the switch is not the last floor');
  assert.equal(ash.querySelector('.vendor').textContent, 'MADRE');
  assert.match(ash.querySelector('.version').textContent, /v1\.0\.0/, 'a module that ships with MADRE does not show its own version');
  assert.ok(ash.querySelector('.check'), 'the card has no button to look for a newer version');
  assert.equal(ash.querySelector('.state').textContent, 'ON', 'the state is not a plain word');
  assert.ok(ash.querySelector('.card-fold'), 'the bullets are not a section of their own');
  assert.match(ash.querySelector('.card-fold').textContent, /QUÉ TOCA/);
  assert.match(ash.querySelector('.card-fold').textContent, /ABRIR|CERRAR/, 'the fold has no button');
  assert.equal(ash.querySelector('.remove-module'), null, 'a module that ships with MADRE offers to delete itself');

  const custom = moduleCard({
    id: 'hello', kind: 'builtin', name: 'HELLO', vendor: 'YOU', external: true, origin: 'user', file: '/tmp/hello.mjs',
    version: '1.0.0', versionSource: 'declared', summary: 'A custom module.', creates: [], requires: [], commands: [], controls: [],
    status: { installed: true, detail: 'on' }, preflight: { ok: true, problems: [] }, install: { display: 'disable HELLO', platforms: [] },
  });
  assert.equal(custom.querySelector('.remove-module')?.textContent, 'DESINSTALAR', 'a DEV module cannot be uninstalled from its own card');

  // The reading fills the card's own panel once the economy answers.
  await new Promise((resolve) => setTimeout(resolve, 0));
  const figures = ash.querySelectorAll('.metric');
  assert.equal(figures.length, 6, 'the economy does not report six figures');
  for (const cell of figures) {
    const kids = cell.children.filter((child) => typeof child !== 'string');
    assert.equal(kids.length, 2, 'a figure and its label are not separate elements');
    assert.equal(kids[0].tagName, 'B');
    assert.equal(kids[1].tagName, 'SPAN');
    assert.ok(kids[0].textContent.trim(), 'a figure came out empty');
  }

  // An installer card is the same shape, with INSTALL where the switch would be.
  const ahp = moduleCard({
    id: 'ahp', kind: 'installer', name: 'AHP+', vendor: 'Agent Handoff Protocol Plus', package: '@jossuealcala/ahp-plus',
    version: null, versionSource: 'tracked', tracks: { name: '@jossuealcala/ahp-plus', npm: '@jossuealcala/ahp-plus', github: null },
    runs: [{ name: '@jossuealcala/ahp-plus', version: null, target: '1.4.1' }],
    summary: 'Verified project state.', creates: ['.ahp/'], requires: ['a git repository'],
    status: { installed: false, detail: 'off' }, preflight: { ok: true, problems: [] }, install: { display: 'npx …', platforms: [] },
  });
  // It wraps a package that is not in this project: not a version, an absence, and what
  // installing would write.
  assert.match(ahp.querySelector('.version').textContent, /INSTALA 1\.4\.1/);
  assert.equal(ahp.querySelector('.state').textContent, 'OFF');
  assert.ok(ahp.classList.contains('off'), 'a module that is off does not step back');
  assert.equal(ahp.children.filter((child) => typeof child !== 'string').at(-1).className, 'actions');
  assert.match(ahp.querySelector('.actions').textContent, /INSTALAR/);
});

test('the viewer reads a file by what it is, and never rewrites it on the way to the screen', async () => {
  const { familyOf, tokenize, languageLabel } = await import('../public/syntax.js');

  // The rule that keeps a highlighter honest: what the screen shows and what is on disk are the
  // same bytes. A selection sent to an agent is the file, not a rendering of it — so every line,
  // in every family, must come back out of the tokenizer exactly as it went in.
  const samples = [
    ['app.mjs', "const saludo = 'hola'; // una nota\nif (x) { return `${y}`; } /* abierto"],
    ['datos.json', '{ "clave": true, "n": 42, "s": "con \\" comilla" }'],
    ['hoja.css', '.a { color: #ffcc00; /* un comentario */ padding: 10px; }'],
    ['pagina.html', '<div class="a"><!-- nota --><span>texto</span></div>'],
    ['guia.md', '# Título\n\nUn **negrita** y un [enlace](http://x).'],
    ['s.py', 'def f(self):\n    return None  # nada'],
    ['x.sh', 'export A="1"   # variable\nif [ -n "$A" ]; then echo ok; fi'],
    ['q.sql', "SELECT * FROM t WHERE a = 'x' -- nota"],
    ['sin-familia.xyz', 'cualquier cosa · 42 · "texto"'],
  ];
  for (const [name, text] of samples) {
    const family = familyOf(name);
    const carry = { inBlock: false };
    const back = text.split('\n').map((line) => tokenize(line, family, carry).map((piece) => piece.text).join('')).join('\n');
    assert.equal(back, text, `${name} came back different from what went in`);
  }

  // A family it does not know is not an error: the file is plain text, which is what it was.
  assert.equal(languageLabel('sin-familia.xyz'), null);
  assert.deepEqual(tokenize('lo que sea', familyOf('sin-familia.xyz')), [{ text: 'lo que sea', kind: null }]);
  assert.equal(languageLabel('app.mjs'), 'JavaScript');

  // And it classifies the three things a person actually looks for.
  const kinds = new Set(tokenize("const a = 'x'; // y", familyOf('a.js')).map((piece) => piece.kind));
  assert.ok(kinds.has('keyword') && kinds.has('string') && kinds.has('comment'));
});

test('the room says who wrote a file, and how to ask about a piece of one', async () => {
  const here = (file) => join(import.meta.dirname, '..', 'public', file);
  const app = await readFile(here('app.js'), 'utf8');
  const page = await readFile(here('index.html'), 'utf8');

  // Which agent last wrote to a path, from what the room recorded — the artifacts a lease produced,
  // the files a CONTROL turn changed, and since 2026-10-14 what a command or a writing turn left
  // where git does not look (`files.touched`, `run.touched`). A file nobody in the room touched
  // carries no mark; the folders on the way to a marked file carry a hollow one.
  assert.match(app, /case 'artifacts\.created': markTouched\(event\.payload\.agent/);
  assert.match(app, /case 'control\.changed': markTouched\(event\.payload\.agent/);
  assert.match(app, /case 'files\.touched': markTouched\(event\.payload\.agent/);
  assert.match(app, /const dot = paint\(el\('span', 'touched'\), by\.agent\);/, 'the mark does not carry the agent colour');
  assert.match(app, /paint\(el\('span', 'touched trail'\), under\.agent\)/, 'a folder does not lead to what changed under it');

  // REVIEW WITH existed and was invisible until a selection existed, and nobody guesses that a
  // line number is clickable. The hint appears exactly while there is nothing selected.
  assert.match(page, /id="viewer-hint-select"/);
  assert.match(app, /viewerUI\.hintSelect\.hidden = has \|\| !viewerUI\.lineNodes\.length;/);
  assert.match(page, /id="viewer-lang"/, 'the viewer does not say what kind of file it is reading');
});

test('/module arms #2 for its message, the way /image does', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const block = app.slice(app.indexOf("if (name === 'create' || name === 'image' || name === 'module') {"), app.indexOf('const known = allCommands()'));
  // Both are asked for by name and both write a file; one stopping to ask for the chip while the
  // other went ahead read as one rule broken.
  assert.ok(!/moduleModeNotice|askForModuleMode/.test(app), '/module still stops to ask for the chip');
  assert.match(block, /if \(!state\.create\) setMode\(2\);\n    if \(name === 'module'\) \{/);
});

test('a regular expression is not a comment, and a division is not a regular expression', async () => {
  const { familyOf, tokenize } = await import('../public/syntax.js');
  const js = familyOf('a.js');
  const read = (line) => tokenize(line, js, { inBlock: false });
  const kindOf = (line, needle) => read(line).find((piece) => piece.text.includes(needle))?.kind ?? null;

  // The report: `//` inside a literal turned the rest of the line grey. Its own slashes look
  // exactly like the start of a comment to every other rule here, so the literal has to be one of
  // the things the scan considers rather than something it checks afterwards.
  const url = String.raw`if (!/^https?:\/\//.test(url)) throw new Error('empieza con http://');`;
  assert.equal(read(url).map((piece) => piece.text).join(''), url);
  assert.ok(!read(url).some((piece) => piece.kind === 'comment'), 'the regex still swallows the rest of the line as a comment');
  assert.equal(kindOf(url, 'https?'), 'regex');
  assert.equal(kindOf(url, "'empieza"), 'string', 'the string after the literal was lost with it');

  // And the other way is worse than the bug: `a / b / c` is arithmetic, not a literal.
  const division = 'const mitad = total / dos / tres;';
  assert.ok(!read(division).some((piece) => piece.kind === 'regex'), 'a division reads as a regular expression');
  assert.equal(read(division).map((piece) => piece.text).join(''), division);

  // A real comment after a division is still a comment; a slash inside a character class is not
  // the end of the literal; and an unclosed slash was division all along.
  assert.equal(kindOf('const x = a / b; // nota', '// nota'), 'comment');
  assert.equal(read(String.raw`const re = /[/]\//g;`).find((piece) => piece.kind === 'regex')?.text, String.raw`/[/]\//g`);
  assert.ok(!read('const half = a / b;').some((piece) => piece.kind === 'regex'));
  // An unterminated slash was division all along, and stays plain rather than eating the line.
  assert.ok(!read(String.raw`const bad = /[/]\/g;`).some((piece) => piece.kind === 'regex'));
});

// The card floor a connector needs: a field for its key that is never filled back in, what MADRE
// is allowed to know about what it holds (the length, never the value), and the way out again.
// Rendered through the real `moduleCard`, in the same tiny DOM the boot test uses, because the
// mistake this guards against — a floor that silently never draws — is invisible to a unit test.
test('a connector\'s card asks for its key and never shows it back', () => {
  const card = globalThis.__pulse.moduleCard({
    id: 'correo', kind: 'builtin', name: 'CORREO', vendor: 'MADRE · SMTP', version: '1.0.0',
    summary: 'Sends one plain-text email from your own account.',
    creates: [], requires: [], runs: [], commands: [],
    controls: [{ key: 'from', label: 'FROM', type: 'text', value: 'her@gmail.com', options: [], note: '' }],
    secrets: [{ name: 'app-password', label: 'APP PASSWORD', note: 'Not your account password.', where: 'https://myaccount.google.com/apppasswords' }],
    held: [{ module: 'correo', name: 'app-password', bytes: 16 }],
    status: { installed: true, detail: 'on · her@gmail.com' },
    preflight: { ok: true, problems: [] },
    install: { display: 'disable CORREO', platforms: [] },
  });

  const all = [];
  const walk = (node) => { all.push(node); for (const child of node.children ?? []) walk(child); };
  walk(card);
  const text = all.map((node) => node.textContent ?? '').join(' ');
  assert.match(text, /LLAVES/, 'the keys floor did not draw at all');
  assert.match(text, /BORRARLA/, 'a key that is held cannot be taken out again');
  assert.match(text, /DÓNDE SACARLA/, 'the card does not say where to get the key');

  const field = all.find((node) => node.tagName === 'INPUT' && node.type === 'password');
  assert.ok(field, 'the key would be typed into a field that shows it');
  assert.equal(field.value, '', 'a key was filled back into the field');
  assert.match(field.placeholder, /16 caracteres/, 'the card does not say a key is already kept');
  assert.ok(!text.includes('abcdefghijklmnop'), 'a secret value reached the card');

  const link = all.find((node) => node.tagName === 'A' && node.href?.includes('myaccount.google.com'));
  assert.ok(link, 'the link to make an app password is missing');
  assert.equal(link.rel, 'noreferrer');
});

// Typing the command slightly wrong is the normal case, not the edge one: the person who wrote
// MADRE typed /modules for /module. An empty menu reads as "no such command" and the flow dies
// there, so the match has to work from both ends — and once the command is settled, the menu
// offers instructions to edit, because /module with nothing after it does nothing.
test('/modules finds /module, and the menu offers something to say with it', () => {
  const input = registry.get('message');
  const menu = registry.get('slash-menu');
  const fire = (text) => { input.value = text; for (const listener of input.listeners.input ?? []) listener({}); };
  const rows = () => menu.children.filter((node) => node.classList.contains('item'));

  fire('/mod');
  assert.equal(menu.hidden, false, 'a half-typed command shows nothing');
  assert.ok(rows().some((row) => row.textContent.includes('/module')), '/mod does not reach /module');

  // The plural, which is what people actually type.
  fire('/modules');
  assert.equal(menu.hidden, false, '/modules closed the menu instead of finding /module');
  const found = rows();
  assert.ok(found.length >= 4, `only ${found.length} rows: the starters are missing`);
  assert.equal(found[0].querySelector('.key')?.textContent, '/module');
  // The rows under it are instructions, not commands, and they say what shape of module each is.
  const starters = found.filter((row) => row.classList.contains('starter'));
  assert.ok(starters.length >= 3, 'no starters under /module');
  assert.match(starters.map((row) => row.textContent).join(' '), /integración/i, 'no starter shows that an integration is possible');

  // And picking one leaves an instruction in the box, ready to edit — never sent by itself.
  const pick = starters[0].listeners.mousedown?.[0];
  assert.ok(pick, 'a starter cannot be clicked');
  pick({ preventDefault() {} });
  assert.match(input.value, /^\/module \S/, `picking a starter left "${input.value}"`);
  assert.ok(input.value.length > '/module '.length + 10, 'the starter inserted nothing to edit');
  assert.equal(menu.hidden, true, 'the menu stayed open after picking');
});

// The door into the SDK, inside the room. Somebody deciding whether to write a module reads this
// card and nothing else, so it has to say what a module is, that they can simply ask for one, and
// that reaching a service outside is possible — and the button has to land them in the composer.
test('the guide to creating a module says what one is and puts /module in the composer', () => {
  const section = registry.get('modules-dev');
  assert.ok(section, 'the guide has no place in the page');
  globalThis.__pulse.renderModulesDev();
  const all = [];
  const walk = (node) => { all.push(node); for (const child of node.children ?? []) walk(child); };
  walk(section);
  const text = all.map((node) => node.textContent ?? '').join(' ');
  assert.match(text, /Un módulo es un archivo/, 'the guide did not render');
  assert.match(text, /\/module/, 'the guide never mentions the one command that writes a module for you');
  assert.match(text, /integración/i, 'the guide never says an integration is possible');
  // Four steps, in the order they are taken.
  assert.match(text, /Pídelo[\s\S]*O escríbelo tú[\s\S]*Cárgalo[\s\S]*Si habla con un servicio/);

  const button = all.find((node) => node.tagName === 'BUTTON' && node.textContent === 'Pedirlo en el proyecto');
  assert.ok(button, 'there is no way from the guide into the composer');
  const input = registry.get('message');
  input.value = 'algo que estaba escribiendo';
  button.listeners.click[0]({});
  assert.equal(input.value, '/module ', 'the button did not leave the composer ready to say what the module should do');
});

// NOSTROMO is a brain seen from the side, not a ball. The shape has to live in the FORCE and not
// only in the first placement: the ring force used to pull every memory onto a circle, so a shape
// given at placement was undone a second or two later. This checks the outline is a brain's and
// that both the placement and the target read from the same function.
test('the archive settles into the shape of a brain, not a ball', async () => {
  const app = await readFile(new URL('../public/nostromo-engine.js', import.meta.url), 'utf8');
  assert.match(app, /const target = NOSTROMO_ORBIT \* brainRadius\(/, 'the force still pulls everything onto a circle, so any shape is undone');
  assert.match(app, /const radius = NOSTROMO_ORBIT \* brainRadius\(/, 'the first placement is not on the same outline');

  // The outline itself, read out of the file so the test measures what ships.
  const body = app.slice(app.indexOf('function brainRadius('), app.indexOf('const FISSURE'));
  const brainRadius = new Function(`${body}; return brainRadius;`)();
  const at = (deg) => brainRadius((deg * Math.PI) / 180);

  // Canvas bearings: 0 is the back of the head, 90 points down, 180 is the frontal pole.
  assert.ok(at(180) > at(0), 'the frontal pole is not the furthest point');
  assert.ok(at(90) < at(270) * 0.9, 'the base is not flat: a brain rests on something');
  assert.ok(at(270) < at(0) * 0.9, 'it is not wider than it is tall, so it still reads as a circle');
  // The two lobes that stop it being an egg.
  assert.ok(at(55) > at(80), 'there is no cerebellum at the lower back');
  assert.ok(at(140) > at(105), 'there is no temporal lobe at the lower front');

  // And nothing anywhere collapses to zero or runs away: every bearing stays a sane radius.
  for (let deg = 0; deg < 360; deg += 5) {
    const r = at(deg);
    assert.ok(r > 0.5 && r < 1.3, `the outline is ${r.toFixed(2)} at ${deg}°`);
  }
});

test('Intenciones speaks under the box only with a reason, marks the chip, and its card shows what was measured', async () => {
  const { state, syncIntentOffer, moduleCard, moduleGlance } = globalThis.__pulse;
  const previous = globalThis.fetch;
  const posted = [];
  const reading = (extra = {}) => ({
    enabled: true,
    agents: [{
      id: 'codex', label: 'Codex', model: null, reference: 'high', ready: true, version: 'test', spent: 41000,
      ladder: ['minimal', 'low', 'medium', 'high', 'xhigh'],
      cases: { lookup: 4, explain: 3, review: 2, diagnose: 0, design: 1 },
      estimate: { quick: 12, full: 40 },
      summary: {
        totals: { compared: 18, worse: 3, same: 15, better: 0, skipped: 0 },
        judge: { controls: 6, caught: 6, status: 'trusted' },
        intents: [
          { intent: 'lookup', n: 12, effort: 'low', status: 'measured', next: null },
          { intent: 'explain', n: 6, effort: null, status: 'open', next: 'medium' },
          { intent: 'review', n: 0, effort: null, status: 'open', next: 'medium' },
          { intent: 'diagnose', n: 0, effort: null, status: 'open', next: 'medium' },
          { intent: 'design', n: 8, effort: 'high', status: 'measured', next: null },
        ],
      },
      // What real use taught, which leads the card now: the calibration only where it settled a kind.
      observed: {
        turns: 20, held: 17, short: 3, pending: 1, tokensSaved: 48000, minTurns: 8,
        byIntent: [
          { intent: 'lookup', rung: 'minimal', n: 12, heldRate: 1, seen: { n: 10, held: 10 }, most: 10 },
          { intent: 'explain', rung: null, n: 3, heldRate: 0.67, seen: null, most: 3 },
          { intent: 'review', rung: null, n: 0, heldRate: null, seen: null, most: 0 },
          { intent: 'implement', rung: 'medium', n: 11, heldRate: 0.91, seen: { n: 9, held: 9 }, most: 9 },
          { intent: 'diagnose', rung: null, n: 10, heldRate: 0.5, seen: null, most: 10 },
          { intent: 'design', rung: null, n: 0, heldRate: null, seen: null, most: 0 },
          { intent: 'chat', rung: null, n: 0, heldRate: null, seen: null, most: 0 },
        ],
      },
      // Trying a cheaper rung on single messages: one kind on its way, one paused after falling short.
      tries: [
        { intent: 'explain', effort: 'low', n: 2, needs: 8, status: 'paused', cooldownUntil: '2026-10-14T12:00:00.000Z' },
        { intent: 'review', effort: 'low', n: 3, needs: 8, status: 'trying', cooldownUntil: null },
      ],
    }],
    running: null, pending: null, last: null, offers: { shown: 4, accepted: 3, tries: { shown: 1, accepted: 1 } },
    ...extra,
  });
  let view = reading();
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (url === '/api/intents/suggest') {
      posted.push(['suggest', body]);
      return { ok: true, json: async () => ({ suggestion: { agent: 'codex', model: null, intent: 'diagnose', cues: [], effort: 'high', from: 'low', direction: 'raise', basis: 'rule', signals: [], measured: null, saving: null } }) };
    }
    if (String(url).startsWith('/api/intents/')) { posted.push([url, body]); return { ok: true, json: async () => ({ ok: true }) }; }
    if (String(url).startsWith('/api/intents')) return { ok: true, json: async () => view };
    return previous(url, init);
  };
  try {
    // Codex on its lightest everyday rung, asked to hunt a failure.
    state.efforts.codex = { levels: ['minimal', 'low', 'medium', 'high', 'xhigh'], default: 'medium', model: null, byModel: null, shared: null };
    registry.get('target').value = 'codex';
    state.chosenEffort.codex = 'low';
    registry.get('free-offer').hidden = true;
    registry.get('message').value = 'explica por qué falla la prueba de memoria';
    await syncIntentOffer();
    const offer = registry.get('intent-offer');
    assert.equal(offer.hidden, false, 'the offer did not appear');
    assert.ok(offer.classList.contains('up'), 'a raise is not drawn as a warning');
    assert.match(offer.textContent, /Parece un diagnóstico/);
    assert.match(offer.textContent, /Subir a alto/);
    assert.deepEqual(posted[0][1], { text: 'explica por qué falla la prueba de memoria', agent: 'codex', model: null, effort: 'low', defaultEffort: 'medium', references: 0, attachments: 0, mode: 1 });
    assert.deepEqual(state.intentHint, { agent: 'codex', direction: 'raise' }, 'the chip carries no mark');

    // Taken: the rung changes, the offer goes, and the message that leaves counts it as taken.
    offer.children.find((child) => child.className === 'free-go').listeners.click[0]();
    assert.equal(state.chosenEffort.codex, 'high');
    assert.equal(offer.hidden, true);
    assert.equal(state.intentHint, null);
    for (const listener of registry.get('composer').listeners.submit) {
      try { await listener({ preventDefault() {} }); } catch { /* the room's own submit has nothing to send here */ }
    }
    assert.ok(posted.some(([url, body]) => url === '/api/intents/offer' && body.accepted === true), 'the taken offer was not counted');

    // A high rung nobody measured: not advice, an invitation to measure, and "not now" is kept.
    let invite = { agent: 'codex', model: null, intent: 'lookup', cues: [], effort: 'high', from: 'xhigh', direction: 'lower', basis: 'rule', signals: [], measured: null, saving: null, kind: 'invite', questions: 6, ofKind: 6 };
    const suggestNow = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => (url === '/api/intents/suggest' ? { ok: true, json: async () => ({ suggestion: invite }) } : suggestNow(url, init));
    state.efforts.codex = { levels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'], default: 'medium', model: null, byModel: null, shared: null };
    state.chosenEffort.codex = 'xhigh';
    registry.get('message').value = '¿dónde está definido el puerto por defecto?';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    assert.match(offer.textContent, /Parece una búsqueda · ALTO suele bastar para esto, pero aún no lo medí en este proyecto/);
    assert.match(offer.textContent, /Ahora no/);
    const measure = offer.children.find((child) => child.className === 'free-go');
    assert.equal(measure.textContent, 'Medir · 6 preguntas');
    assert.deepEqual(state.intentHint, { agent: 'codex', direction: 'lower' });
    offer.children.find((child) => child.className === 'free-later').listeners.click[0]();
    assert.equal(offer.hidden, true);
    registry.get('message').value = '¿dónde está definido el puerto por defecto del servidor?';
    await syncIntentOffer();
    assert.equal(offer.hidden, true, 'an invitation declined comes back on the next message');
    // Another model is another question.
    invite = { ...invite, model: 'gpt-5.6-luna' };
    state.chosenModel.codex = 'gpt-5.6-luna';
    registry.get('message').value = '¿dónde está definido el puerto por defecto, otra vez?';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    await offer.children.find((child) => child.className === 'free-go').listeners.click[0]();
    assert.ok(posted.some(([url, body]) => url === '/api/intents/calibrate' && body.kind === 'quick' && body.reference === 'xhigh' && body.effort === 'high' && body.intent === 'lookup' && body.model === 'gpt-5.6-luna'), 'MEASURE did not start the aimed quick test');
    delete state.chosenModel.codex;
    globalThis.fetch = suggestNow;

    // Learned from real use: the level that was enough in the human's own turns, with its own badge.
    const seenOffer = { agent: 'codex', model: null, intent: 'explain', cues: [], effort: 'medium', from: 'high', direction: 'lower', basis: 'observed', signals: [], measured: null, observed: { n: 15, held: 14, heldRate: 0.93, rung: 'medium' }, saving: 0.4, kind: 'offer' };
    globalThis.fetch = async (url, init = {}) => (url === '/api/intents/suggest' ? { ok: true, json: async () => ({ suggestion: seenOffer }) } : suggestNow(url, init));
    state.efforts.codex = { levels: ['minimal', 'low', 'medium', 'high', 'xhigh'], default: 'medium', model: null, byModel: null, shared: null };
    state.chosenEffort.codex = 'high';
    registry.get('message').value = 'explica cómo funciona el destilador de la memoria';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    assert.match(offer.textContent, /Parece una explicación · MEDIO alcanzó en 14 de tus respuestas · cerca de 40% menos tokens/);
    assert.ok(offer.children.some((child) => child.className === 'intent-basis observed' && child.textContent === 'De tu uso'), 'the offer does not say it came from your use');
    assert.ok(!offer.classList.contains('up'), 'a lower level from real use is drawn as a raise');
    // With no level known to start from, it names the level and is still not a warning.
    state.efforts.codex = { levels: ['minimal', 'low', 'medium', 'high', 'xhigh'], default: null, model: null, byModel: null, shared: null };
    delete state.chosenEffort.codex;
    Object.assign(seenOffer, { from: null, direction: null });
    registry.get('message').value = 'explica cómo funciona el destilador de la memoria, por favor';
    await syncIntentOffer();
    assert.ok(!offer.classList.contains('up'));
    globalThis.fetch = suggestNow;

    // A try: the rule thinks one rung less would do, so this one message may go at it. Taken, it is
    // for this message only: the chip shows it, the message goes at it, and the next one does not.
    const tryOffer = { kind: 'try', agent: 'codex', model: null, intent: 'lookup', cues: [], effort: 'low', from: 'medium', direction: 'lower', basis: 'try', signals: [], observedAtLower: 3, needs: 8 };
    let trySuggestion = tryOffer;
    const sent = [];
    globalThis.fetch = async (url, init = {}) => {
      if (url === '/api/intents/suggest') {
        posted.push(['suggest', JSON.parse(init.body)]);
        return { ok: true, json: async () => ({ suggestion: trySuggestion, explore: trySuggestion?.kind === 'try' ? { agent: 'codex', model: null, intent: 'lookup', effort: 'low' } : null }) };
      }
      if (url === '/api/messages') { sent.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ ok: true }) }; }
      return suggestNow(url, init);
    };
    state.efforts.codex = { levels: ['minimal', 'low', 'medium', 'high', 'xhigh'], default: 'medium', model: null, byModel: null, shared: null };
    delete state.chosenEffort.codex;
    registry.get('message').value = '¿dónde está definido el puerto por defecto?';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    assert.equal(posted.at(-1)[1].mode, 1, 'the mode did not reach the suggestion');
    assert.match(offer.textContent, /Parece una búsqueda · podría bastar BAJO · pruébalo en esta pregunta y MADRE lo tendrá en cuenta/);
    assert.ok(offer.children.some((child) => child.className === 'intent-basis trial' && child.textContent === 'Prueba'), 'a try carries no badge');
    assert.ok(!offer.classList.contains('up'));
    const tryKey = offer.children.find((child) => child.className === 'free-go');
    assert.equal(tryKey.textContent, 'Probar bajo en esta pregunta');
    assert.equal(offer.children.find((child) => child.className === 'free-later').textContent, 'Ahora no');
    tryKey.listeners.click[0]();
    assert.deepEqual(state.effortOnce, { agent: 'codex', model: null, intent: 'lookup', effort: 'low', from: 'medium' });
    assert.equal(state.chosenEffort.codex, undefined, 'a try was remembered for every message');
    assert.ok(!String(localStorage.getItem('pulse.chosenEffort')).includes('"codex":"low"'));
    assert.match(offer.textContent, /Esta pregunta va con BAJO · si no alcanza, MADRE lo notará y volverá a MEDIO/);
    // Edited, still the same kind of request: the try stays.
    registry.get('message').value = '¿dónde está definido el puerto por defecto del servidor?';
    await syncIntentOffer();
    assert.equal(state.effortOnce?.effort, 'low');
    assert.match(offer.textContent, /Esta pregunta va con BAJO/);
    // Sent: it goes at BAJO, it is counted as a try taken, and the next message is back where it was.
    for (const listener of registry.get('composer').listeners.submit) {
      try { await listener({ preventDefault() {} }); } catch { /* the rest of the room's submit is not under test here */ }
    }
    assert.equal(sent.at(-1)?.effort, 'low', 'the message did not go at the rung tried');
    assert.equal(state.effortOnce, null, 'the try outlived its message');
    assert.equal(state.chosenEffort.codex, undefined);
    const counted = posted.filter(([url]) => url === '/api/intents/offer').at(-1)[1];
    assert.deepEqual([counted.kind, counted.accepted, counted.shown, counted.effort, counted.from, counted.explore?.intent], ['try', true, true, 'low', 'medium', 'lookup']);

    // Taken, then edited into something that no longer qualifies: put away.
    registry.get('message').value = '¿cuál es el puerto del servidor de pruebas?';
    await syncIntentOffer();
    offer.children.find((child) => child.className === 'free-go').listeners.click[0]();
    assert.equal(state.effortOnce?.effort, 'low');
    trySuggestion = null;
    registry.get('message').value = 'implementa el puerto nuevo en el servidor de pruebas';
    await syncIntentOffer();
    assert.equal(state.effortOnce, null, 'a try stayed on a message that no longer qualifies');
    // Taken, then another agent: put away too.
    trySuggestion = tryOffer;
    registry.get('message').value = '¿cuál es el puerto del servidor de staging?';
    await syncIntentOffer();
    offer.children.find((child) => child.className === 'free-go').listeners.click[0]();
    registry.get('target').value = 'claude';
    await syncIntentOffer();
    assert.equal(state.effortOnce, null, 'a try followed the message to another agent');
    registry.get('target').value = 'codex';

    // "Not now" on a try is kept for a day, for that agent, model and kind.
    registry.get('message').value = '¿cuál es el puerto del servidor de producción?';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    offer.children.find((child) => child.className === 'free-later').listeners.click[0]();
    assert.equal(offer.hidden, true);
    assert.ok(Number.isFinite(JSON.parse(localStorage.getItem('pulse.intentTries'))['codex||lookup']));
    registry.get('message').value = '¿cuál es el puerto del servidor de respaldo?';
    await syncIntentOffer();
    assert.equal(offer.hidden, true, 'a try declined came back on the next message');

    // The try fell short: the next one of its kind offers the way back, and taking it changes
    // nothing when the message already goes at that rung.
    trySuggestion = { kind: 'offer', basis: 'tried', agent: 'codex', model: null, intent: 'lookup', cues: [], effort: 'medium', from: 'medium', direction: 'raise', signals: [], measured: null, observed: null, saving: null, tried: { effort: 'low', why: 'rated' } };
    registry.get('message').value = '¿cuál es el puerto del archivista de la sala?';
    await syncIntentOffer();
    assert.equal(offer.hidden, false);
    assert.match(offer.textContent, /Parece una búsqueda · BAJO no alcanzó la última vez/);
    assert.ok(offer.classList.contains('up'));
    const back = offer.children.find((child) => child.className === 'free-go');
    assert.equal(back.textContent, 'Volver a MEDIO');
    back.listeners.click[0]();
    assert.equal(state.chosenEffort.codex, undefined, 'going back to the rung already in use remembered it');
    globalThis.fetch = suggestNow;

    // Nothing to say about an agent whose CLI takes no effort.
    delete state.efforts.codex;
    registry.get('message').value = 'explica por qué falla la prueba de memoria otra vez';
    await syncIntentOffer();
    assert.equal(offer.hidden, true);

    // The card: one row per kind of question, the judge, the two tests with their price.
    const item = { id: 'intents', kind: 'builtin', name: 'Intenciones', vendor: 'MADRE', version: '1.0.0', versionSource: 'declared', summary: 'Suggests…', creates: [], card: 'intents', runs: [], status: { installed: true, detail: 'on' }, preflight: { ok: true, problems: [] }, install: { display: '', platforms: [] } };
    const card = moduleCard(item);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const text = card.textContent;
    for (const said of ['LO QUE SE MIDIÓ AQUÍ', '@codex', 'Búsqueda', 'BAJO', 'Diseño', 'medido · lo necesita', 'Cambio', 'MEDIO', 'visto en 9 respuestas', 'BAJO no fue suficiente · en pausa hasta', 'probando BAJO · 3 de 8 respuestas', 'ninguno fue suficiente las veces necesarias · 10 respuestas', 'Medir más rápido', 'proyecto con alto', 'Hay 10 preguntas listas para hacer.', 'EL JUEZ DETECTÓ 6 DE 6 PRUEBAS DE CONTROL · confiable', 'PRUEBA RÁPIDA · 12 RESPUESTAS', 'PRUEBA COMPLETA · ~40 RESPUESTAS', 'SUGERENCIAS ACEPTADAS · 3 DE 4']) {
      assert.ok(text.includes(said), `the card does not say "${said}"`);
    }
    // A kind the calibration settled says so, over what real use saw; a short reply nobody sent is left out.
    assert.ok(!text.includes('MÍNIMO'), 'real use spoke over a measurement');
    assert.ok(!text.includes('Respuesta corta'), 'a kind with no turns at all took a row');

    // The figures lead with real use: turns, how often the level was enough, and the estimate.
    const glance = moduleGlance(item);
    for (let i = 0; i < 3; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    for (const said of ['Respuestas observadas', '20', 'Fue suficiente', '85%', '17 de 20 respuestas', 'Tokens que habrías ahorrado', 'una estimación', 'Estado']) {
      assert.ok(glance.textContent.includes(said), `the figures do not say "${said}"`);
    }
    assert.ok(!glance.textContent.includes('Preguntas por hacer'));

    // During the quick test the card sends the human to the test's own window.
    view = reading({ running: { kind: 'quick', agent: 'codex', reference: 'xhigh', effort: 'high', turns: 4, estimate: 12 }, pending: { step: 3, total: 6, intent: 'lookup', question: '¿dónde está el puerto?', first: 'En src/ports.mjs.', second: 'En la configuración.' } });
    const live = moduleCard(item);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(live.textContent, /PRUEBA RÁPIDA EN CURSO · @codex · 4 DE ~12 RESPUESTAS/);
    assert.match(live.textContent, /UN PAR DE RESPUESTAS TE ESPERA · ABRIR LA PRUEBA/);
    assert.doesNotMatch(live.textContent, /PREGUNTA 3 DE 6/, 'the pair is judged in the window, not in MU/TH/UR');

    // The window, over the room: what is being compared in words a person reads, then the pair.
    const node = registry.get('intents-window');
    const head = new FakeElement('header'); head.className = 'custom-head'; node.append(head);
    node.show = function show() { this.open = true; };
    node.getClientRects = () => [{}];
    node.style.removeProperty = (name) => { delete node.style[name]; };
    // The window machinery paints depth on the root, which this small DOM never needed before.
    document.documentElement ??= new FakeElement('html');
    document.documentElement.style.removeProperty ??= (name) => { delete document.documentElement.style[name]; };
    globalThis.requestAnimationFrame ??= (fn) => setTimeout(fn, 0);
    globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);
    globalThis.__pulse.openIntentsWindow(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const page = registry.get('intents-body');
    assert.match(page.textContent, /@codex contesta cada pregunta dos veces: en MUY ALTO, el nivel que usas, y en ALTO/);
    assert.match(page.textContent, /PREGUNTA 3 DE 6 · BÚSQUEDA/);
    const same = page.querySelectorAll('.primary').find((button) => button.textContent === 'IGUAL');
    assert.ok(same, 'there is no way to say the two answers are the same');
    await same.listeners.click[0]();
    assert.ok(posted.some(([url, body]) => url === '/api/intents/answer' && body.choice === 'same'));

    // When it ends, one sentence that says what it means and what MADRE will do.
    view = reading({ last: { kind: 'quick', agent: 'codex', intent: 'lookup', effort: 'high', settled: 'high', ended: 'done', compared: 6, same: 6, worse: 0 } });
    globalThis.__pulse.openIntentsWindow(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(page.textContent, /No viste diferencia en 6 de 6 preguntas: ALTO basta para búsquedas en este proyecto/);
    globalThis.__pulse.openIntentsWindow(false);
  } finally {
    globalThis.fetch = previous;
  }
});

test('what is new is a board: twelve cards, a card opens its whole note with a way there, Esc steps back', async () => {
  const { NOTES } = await import('../src/whats-new.mjs');
  const notes = NOTES['1.0.0'];
  // A look ahead: nothing is marked as seen, so no request leaves when it closes.
  const dialog = globalThis.__pulse.showWhatsNew({ version: '1.0.0', notes, preview: true, changes: { es: 'https://madre.run/es/changelog', en: 'https://madre.run/changelog' } });
  assert.ok(dialog, 'the board did not open');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(dialog.open, true);
  assert.match(dialog.textContent, /Ya tienes la 1\.0/);
  assert.match(dialog.textContent, /Ver todos los cambios/);
  const cards = () => dialog.querySelectorAll('.wn-card');
  assert.equal(cards().length, 12, 'the board does not show one card per thing');
  assert.ok(cards().every((card) => card.querySelectorAll('.wn-shot').length === 1), 'a card has no picture');
  assert.equal(cards()[0].querySelector('.wn-card-line').textContent, notes.items[0].body.es.match(/^.*?[.!?](?=\s|$)/)[0], 'a card says more than the first sentence');

  // A card opens its note in the same sheet, with where it is and the key that goes there.
  cards()[0].listeners.click[0]();
  assert.equal(cards().length, 0, 'the board stayed under the note');
  const detail = () => dialog.querySelector('.wn-detail');
  assert.match(detail().textContent, /Llévame ahí/);
  assert.match(detail().textContent, /Dónde está/);
  assert.match(detail().textContent, new RegExp(notes.items[0].title.es));
  // → and ← go through the notes; one with nowhere to go has no key for it.
  const keys = (key) => dialog.listeners.keydown[0]({ key, target: {}, preventDefault() {} });
  keys('ArrowRight');
  assert.match(detail().textContent, new RegExp(notes.items[1].title.es.replace(/[/]/g, '\\/')));
  keys('ArrowLeft');
  assert.match(detail().textContent, new RegExp(notes.items[0].title.es));
  const quiet = notes.items.findIndex((item) => item.action === null);
  for (let i = 0; i < quiet; i += 1) keys('ArrowRight');
  assert.doesNotMatch(detail().textContent, /Llévame ahí/, 'a note with nowhere to go offers to take you there');

  // Esc: from a note back to the board, from the board closed.
  keys('Escape');
  assert.equal(cards().length, 12);
  assert.equal(dialog.open, true, 'Esc on a note closed the whole board');
  keys('Escape');
  assert.equal(dialog.open, false);
  dialog.listeners.close[0]();
});

test('what is new opens by itself after an update, as the server says it is owed', async () => {
  // The way it really arrives (2026-10-12): asked of the server, then shown. A helper it called after
  // closing was deleted with the five-stop tour, and the sheet threw on the way up for everyone who
  // updated, while the board itself, opened by hand in the test above, was fine.
  const { NOTES } = await import('../src/whats-new.mjs');
  const realFetch = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (url, options) => {
    asked.push(String(url));
    if (url === '/api/whats-new') return { ok: true, json: async () => ({ show: true, version: '1.0.0', notes: NOTES['1.0.0'], changes: { es: 'https://madre.run/cambios/', en: 'https://madre.run/en/changelog/' } }) };
    return { ok: true, json: async () => ({}) };
  };
  try {
    const dialog = await globalThis.__pulse.whatsNewIfOwed();
    assert.ok(dialog, 'the sheet owed after an update did not open');
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent, /Ya tienes la 1\.0/);
    dialog.listeners.keydown[0]({ key: 'Escape', target: {}, preventDefault() {} });
    assert.equal(dialog.open, false);
    dialog.listeners.close[0]();
    assert.ok(asked.includes('/api/whats-new'));
  } finally {
    globalThis.fetch = realFetch;
  }
});
