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
  const events = lines.map((line) => JSON.parse(line));
  const failures = events.filter((event) => event.type === 'message.failed').length;

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let streamUrl = null;
  globalThis.document = buildDocument(html);
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'navigator', { value: { platform: 'MacIntel', userAgent: 'test', clipboard: { writeText: async () => {} } }, configurable: true });
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.localStorage = { store: {}, getItem(key) { return this.store[key] ?? null; }, setItem(key, value) { this.store[key] = String(value); } };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  globalThis.EventSource = class { constructor(url) { streamUrl = url; } };
  globalThis.fetch = async (url) => {
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

  assert.deepEqual(errors, [], 'no event failed to render');
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
  assert.match(firstUser.textContent, /YOU · CREW/, 'human messages carry the crew label');
  assert.equal(registry.get('crew-label') !== undefined, true);
  // And the whole pipe, on a rendered page rather than on the catalogue alone: the markup is
  // English, the room speaks Spanish, and what the reader sees is Spanish.
  assert.match(registry.get('message').placeholder, /Respuestas compactas|Escribe aquí/, 'the composer prompts the human in English');
  assert.match(registry.get('bridge-close').textContent, /VOLVER A LA SALA/);
  assert.match(registry.get('stop-all').attributes.title, /STOPALL · frena/);
  const ashToggle = registry.get('ash-toggle');
  assert.equal(ashToggle.hidden, false, 'enabled beta module exposes ORDER 937 in the composer');
  assert.equal(ashToggle.getAttribute('aria-pressed'), 'true', 'ORDER 937 starts illuminated');
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
  assert.match(popup.textContent, /of the provider's [0-9]*[hd] limit|budget tokens · local 5h window/);
  assert.match(popup.textContent, /turns/);
  const statsText = popup.textContent;
  assert.ok(/\d+/.test(statsText));

  // Easter egg: trackpad-style bursts at the end of the record.
  const { trackHold, state: uiState } = globalThis.__pulse;
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
  assert.match(column.children.at(-1).textContent, /end of record/);

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
  assert.match(ash.querySelector('.card-fold').textContent, /EXPAND|COLLAPSE/, 'the fold has no button');

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
  assert.match(ahp.querySelector('.version').textContent, /INSTALLS 1\.4\.1/);
  assert.equal(ahp.querySelector('.state').textContent, 'OFF');
  assert.ok(ahp.classList.contains('off'), 'a module that is off does not step back');
  assert.equal(ahp.children.filter((child) => typeof child !== 'string').at(-1).className, 'actions');
  assert.match(ahp.querySelector('.actions').textContent, /INSTALAR/);
});
