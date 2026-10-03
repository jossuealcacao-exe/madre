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
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
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
  focus() {} scrollIntoView() {} requestSubmit() {} showModal() { this.open = true; } close() { this.open = false; }
  setSelectionRange() {}
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
  assert.match(firstUser.textContent, /TÚ · TRIPULACIÓN/, 'human messages carry the crew label');
  assert.equal(registry.get('crew-label') !== undefined, true);
  // And the whole pipe, on a rendered page rather than on the catalogue alone: what the page
  // itself builds comes out in Spanish. (The markup's own words are walked through the catalogue
  // in a browser; this toy DOM never parses them, so the catalogue's own test covers those.)
  assert.match(registry.get('message').placeholder, /Respuestas compactas|Escribe aquí/, 'the composer prompts the human in English');
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
  assert.match(popup.textContent, /del límite de [0-9]*[hd] del proveedor|tokens de presupuesto · ventana local/);
  assert.match(popup.textContent, /turnos/);
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
  const blockedModule = await globalThis.__pulse.runSlashCommand(message.value);
  assert.deepEqual(blockedModule, { handled: true, preserve: true }, '/module silently armed CREATE instead of asking');
  assert.equal(uiState.mode, 1, '/module changed the mode without the human');
  registry.get('create-toggle').listeners.click[0]();
  assert.match(registry.get('crew-label').textContent, /MODULE · CREATE/);
  const moduleRequest = await globalThis.__pulse.runSlashCommand(message.value);
  assert.equal(moduleRequest.handled, false);
  assert.equal(moduleRequest.target, chosenTarget, '/module changed the selected agent');
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
  assert.deepEqual(panes.children.map((pane) => pane.dataset.pane), ['document', 'launch', 'egress', 'console']);
  assert.deepEqual(panes.children.map((pane) => pane.hidden), [false, true, true, true], 'more than one pane is showing');
  // Each one filled from the room, and each one with its own `==>` sections.
  // In the language MADRE speaks, which is the point of reading it here rather than in the
  // catalogue: the page, the panes and the words all came up together.
  assert.match(panes.children[0].textContent, /EL DOCUMENTO[\s\S]*MEMORIES[\s\S]*LO QUE CARGA/);
  assert.match(panes.children[1].textContent, /EL LANZAMIENTO[\s\S]*\/usr\/local\/bin\/codex/);
  assert.match(panes.children[2].textContent, /LO QUE SALIÓ DE ESTA COMPUTADORA[\s\S]*the npm registry/);
  // An inquiry that is already a pane opens it rather than printing it twice.
  const prompt = body.querySelector('.console-line');
  const ask = async (text) => { prompt.querySelector('INPUT').value = text; await prompt.listeners.submit[0]({ preventDefault() {} }); };
  await ask('launch');
  assert.equal(core.pane, 'launch');
  // Everything else is answered in her own pane, and the count only moves on what she cannot read.
  await ask('weight');
  assert.equal(core.pane, 'console');
  assert.match(panes.children[3].textContent, /CARACTERES EN 2 BLOQUES/);
  assert.equal(core.strikes, 0);
  await ask('delete the archive');
  assert.equal(core.strikes, 1);
  assert.match(panes.children[3].textContent, /INTENTOS ANTES DE QUE ESTA INTERFAZ SE CIERRE/);
  registry.get('core').close();


  // A reviewed human message carries the mark, then everything disarms.
  const stream = new globalThis.EventSource('/x');
  void stream;
  globalThis.__pulse.disarmExpendable();
  assert.equal(uiState.expendable, false);
  assert.equal(registry.get('crew-label').textContent, 'HUMANO ›');

  // Silence longer than two seconds starts over; scrolling up resets.
  assert.equal(trackHold(true, t0 + 20_000), false);
  assert.equal(trackHold(true, t0 + 23_000), false, 'gap > 2 s discards the earlier push');
  assert.equal(trackHold(true, t0 + 24_000), false);
  assert.equal(trackHold(false, t0 + 25_000), false, 'an upward push resets');
  assert.equal(trackHold(true, t0 + 30_000), false);
  assert.equal(uiState.expendable, false);
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
  assert.deepEqual(floors.map((floor) => floor.className), ['head', 'about', 'card-fold', 'card-panel', 'actions'], 'the floors of a card changed');
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

  // Which agent last wrote to a path, from what the room already recorded — the artifacts a lease
  // produced and the files a CONTROL turn changed. Nothing is inferred from the filesystem: a file
  // MADRE did not see change carries no mark.
  assert.match(app, /case 'artifacts\.created': markTouched\(event\.payload\.agent/);
  assert.match(app, /case 'control\.changed': markTouched\(event\.payload\.agent/);
  assert.match(app, /const dot = paint\(el\('span', 'touched'\), by\);/, 'the mark does not carry the agent colour');

  // REVIEW WITH existed and was invisible until a selection existed, and nobody guesses that a
  // line number is clickable. The hint appears exactly while there is nothing selected.
  assert.match(page, /id="viewer-hint-select"/);
  assert.match(app, /viewerUI\.hintSelect\.hidden = has \|\| !viewerUI\.lineNodes\.length;/);
  assert.match(page, /id="viewer-lang"/, 'the viewer does not say what kind of file it is reading');
});

test('/module answers in the room, and never arms the mode by itself', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const block = app.slice(app.indexOf('function moduleModeNotice'), app.indexOf('function syncModuleComposer'));

  // A refusal that only flashes is a refusal the room forgets. This one lands in the thread where
  // every other decision of the room lands, and carries the way out with it.
  assert.match(block, /els\.column\.append\((?:tidySystemLine\()?node\)?\)/, 'the refusal never reaches the thread');
  assert.match(block, /ARM #2 CREATE/);
  assert.match(block, /arm\.addEventListener\('click', \(\) => \{ setMode\(2/, 'the notice does not offer the way out');
  // The command asks; the click grants. Writing /module must never be what arms the mode.
  assert.ok(!/state\.create = true/.test(block), '/module arms CREATE by itself');
  assert.match(app, /if \(name === 'module' && !state\.create\) \{\n      moduleModeNotice\(\);/);
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
  assert.match(text, /OLVIDARLA/, 'a key that is held cannot be taken out again');
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
  assert.match(starters.map((row) => row.textContent).join(' '), /conector/i, 'no starter shows that a connector is possible');

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
test('the develop card says what a module is and puts /module in the composer', () => {
  const section = registry.get('modules-dev');
  assert.ok(section, 'the develop card has no place in the page');
  globalThis.__pulse.renderModulesDev();
  const all = [];
  const walk = (node) => { all.push(node); for (const child of node.children ?? []) walk(child); };
  walk(section);
  const text = all.map((node) => node.textContent ?? '').join(' ');
  assert.match(text, /DESARROLLA PARA MADRE/, 'the card did not render');
  assert.match(text, /\/module/, 'the card never mentions the one command that writes a module for you');
  assert.match(text, /conector/i, 'the card never says a connector is possible');

  const button = all.find((node) => node.tagName === 'BUTTON' && node.textContent === 'PÍDELE UNO');
  assert.ok(button, 'there is no way from the card into the composer');
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
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
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
