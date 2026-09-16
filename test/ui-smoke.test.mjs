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
    this._text = '';
    this._id = '';
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
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
  document.createElement = (tag) => new FakeElement(tag);
  document.createDocumentFragment = () => new FakeElement('fragment');
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
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  globalThis.EventSource = class { constructor(url) { streamUrl = url; } };
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/state');
    return { json: async () => ({
      projectRoot: '/Users/demo/pulse',
      softTokenBudget: 500000,
      agents: ['codex', 'claude', 'gemini', 'opencode'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' })),
      events,
    }) };
  };
  try {
    await import('../public/app.js');
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
  assert.match(registry.get('crew-label').textContent, /EXPENDABLE/);
  assert.match(column.children.at(-1).textContent, /end of record/);

  // A reviewed human message carries the mark, then everything disarms.
  const stream = new globalThis.EventSource('/x');
  void stream;
  globalThis.__pulse.disarmExpendable();
  assert.equal(uiState.expendable, false);
  assert.equal(registry.get('crew-label').textContent, 'HUMAN ›');

  // Silence longer than two seconds starts over; scrolling up resets.
  assert.equal(trackHold(true, t0 + 20_000), false);
  assert.equal(trackHold(true, t0 + 23_000), false, 'gap > 2 s discards the earlier push');
  assert.equal(trackHold(true, t0 + 24_000), false);
  assert.equal(trackHold(false, t0 + 25_000), false, 'an upward push resets');
  assert.equal(trackHold(true, t0 + 30_000), false);
  assert.equal(uiState.expendable, false);
});
