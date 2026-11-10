// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// CHOOSING ONE OF OPENCODE'S PROVIDERS (2026-11-10, asked by the author). OpenCode knows more than two
// hundred, and a plain list began at «302.AI». Now a key that shows the one chosen, with its mark, and
// opens a list with a search on top: the best known pinned first, then all of them by name. The arrows
// move, Enter chooses, Esc closes. Home's Settings and a project's both use it.
//
// `providers` as /api/agents/opencode/providers gives them ({ id, label }).

import { t } from './i18n.js';
import { trazo } from './icons.js';

// The best known, pinned above the rest in this order; any other the server marks as popular follows.
const PINNED = ['anthropic', 'openai', 'google', 'openrouter', 'xai', 'deepseek', 'mistral', 'groq'];

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const fold = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let marks = null;
const loadMarks = () => (marks ??= import('./provider-marks.js').then((module) => module.providerMark).catch(() => () => null));

// Its mark, or its initial on a soft square while the marks load or when it has none.
function markOf(provider, draw) {
  const node = el('span', 'pp-mark');
  node.setAttribute('aria-hidden', 'true');
  const svg = draw?.(provider.id);
  if (svg) node.innerHTML = svg; // trusted: our own SVG strings (provider-marks.js)
  else { node.classList.add('initial'); node.textContent = String(provider.label ?? provider.id).replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase(); }
  return node;
}

export function providerPick({ providers = [], value = null, onChange = null, label = t('Provider') } = {}) {
  const known = PINNED.map((id) => providers.find((one) => one.id === id)).filter(Boolean);
  const rest = providers.filter((one) => !known.includes(one)).sort((a, b) => a.label.localeCompare(b.label));
  let current = providers.find((one) => one.id === value) ?? known[0] ?? rest[0] ?? null;
  let draw = null;
  let open = false;
  let at = 0;                   // the row the arrows are on
  let rows = [];                // what the list shows now, in order

  const node = el('div', 'pp');
  const key = el('button', 'pp-key');
  key.type = 'button';
  key.setAttribute('aria-haspopup', 'listbox');
  key.setAttribute('aria-expanded', 'false');
  key.setAttribute('aria-label', label);
  const chevron = el('span', 'pp-chevron');
  chevron.innerHTML = trazo('chevron'); // trusted: our own SVG string
  const panel = el('div', 'pp-panel');
  panel.hidden = true;
  const search = el('input', 'pp-search');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.placeholder = t('Search a provider…');
  search.setAttribute('aria-label', t('Search a provider…'));
  const list = el('div', 'pp-list');
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  panel.append(search, list);
  node.append(key, panel);

  const paintKey = () => {
    key.replaceChildren();
    if (!current) { key.append(el('span', 'pp-name', t('No provider')), chevron); return; }
    key.append(markOf(current, draw), el('span', 'pp-name', current.label), chevron);
  };
  const choose = (provider) => {
    current = provider;
    paintKey();
    close();
    key.focus();
    onChange?.(provider.id);
  };
  const mark = () => {
    rows.forEach((row, index) => row.setAttribute('aria-selected', String(index === at)));
    rows[at]?.scrollIntoView({ block: 'nearest' });
  };
  const paintList = () => {
    const words = fold(search.value.trim());
    const fits = (one) => !words || fold(one.label).includes(words) || fold(one.id).includes(words);
    const groups = words ? [[null, [...known, ...rest].filter(fits)]] : [[t('Best known'), known], [t('All providers'), rest]];
    list.replaceChildren();
    rows = [];
    for (const [title, members] of groups) {
      if (!members.length) continue;
      if (title) list.append(el('p', 'pp-group', title));
      for (const provider of members) {
        const row = el('button', 'pp-row');
        row.type = 'button';
        row.tabIndex = -1;
        row.setAttribute('role', 'option');
        if (provider.id === current?.id) row.classList.add('chosen');
        row.append(markOf(provider, draw), el('span', 'pp-name', provider.label));
        const index = rows.length;
        row.addEventListener('pointermove', () => { if (at !== index) { at = index; mark(); } });
        row.addEventListener('click', () => choose(provider));
        rows.push(row);
        list.append(row);
      }
    }
    if (!rows.length) list.append(el('p', 'pp-none', t('No provider matches «{query}».', { query: search.value.trim() })));
    at = Math.max(0, rows.findIndex((row) => row.classList.contains('chosen')));
    if (words) at = 0;
    mark();
  };
  const outside = (event) => { if (!node.contains(event.target)) close(); };
  function close() {
    if (!open) return;
    open = false;
    panel.hidden = true;
    key.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
  }
  const show = () => {
    open = true;
    search.value = '';
    panel.hidden = false;
    key.setAttribute('aria-expanded', 'true');
    paintList();
    search.focus();
    document.addEventListener('pointerdown', outside, true);
  };
  key.addEventListener('click', () => (open ? close() : show()));
  key.addEventListener('keydown', (event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } });
  search.addEventListener('input', paintList);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); at = Math.min(rows.length - 1, at + 1); mark(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); at = Math.max(0, at - 1); mark(); }
    else if (event.key === 'Enter') { event.preventDefault(); rows[at]?.click(); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); key.focus(); }
    else if (event.key === 'Tab') close();
  });

  paintKey();
  void loadMarks().then((found) => { draw = found; paintKey(); if (open) paintList(); });
  return {
    node,
    get value() { return current?.id ?? ''; },
    focus: () => key.focus(),
  };
}
