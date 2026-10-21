// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The user manual's page (/manual, 1.0.5): the text of public/manual-content.js drawn with MADRE's
// look, in the room's language or the one asked for (?lang=es|en). Each section shows MADRE itself
// (public/manual-shots.js, scripts/manual-shots.mjs) with a numbered mark on what each step presses;
// a step and its mark light up together. The same page is printed to the PDF (scripts/manual-pdf.mjs,
// ?print=1): light, as the brand asks of long documents, with a cover. It reads nothing but its own
// files, so it opens without a network.

import { hostWords, keyWords } from './i18n.js';
import { MANUAL } from './manual-content.js';
import { GESTURES } from './tour-chapters.js';
import { SHOTS } from './manual-shots.js';

const asked = new URLSearchParams(location.search);
const printing = asked.get('print') === '1';
const pick = (value) => (value === 'en' || value === 'es' ? value : null);
const browser = String(navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';

const ICONS = {
  home: '<path d="M3.8 9.2L10 4l6.2 5.2M5.6 8v7.5h8.8V8"/>',
  chat: '<path d="M4 5.5h12v7.5H9l-3.4 2.6V13H4z"/>',
  shield: '<path d="M10 3.2l5.6 2v4.2c0 3.4-2.4 5.9-5.6 7.2-3.2-1.3-5.6-3.8-5.6-7.2V5.2z"/><path d="M7.6 10l1.7 1.7 3.1-3.3"/>',
  robot: '<rect x="4.5" y="7" width="11" height="8" rx="2.4"/><path d="M10 4v3M8 11h.01M12 11h.01"/>',
  code: '<path d="M7.4 6.5L4 10l3.4 3.5M12.6 6.5L16 10l-3.4 3.5M11 5l-2 10"/>',
  note: '<path d="M5 4.5h10v7.5l-3.5 3.5H5z"/><path d="M11.5 15.5V12H15M7.5 8h5M7.5 10.5h3"/>',
  grid: '<rect x="4" y="4" width="5" height="5" rx="1.2"/><rect x="11" y="4" width="5" height="5" rx="1.2"/><rect x="4" y="11" width="5" height="5" rx="1.2"/><rect x="11" y="11" width="5" height="5" rx="1.2"/>',
  plug: '<path d="M7.5 3.5v3.3M12.5 3.5v3.3M5.5 6.8h9v2.6a4.5 4.5 0 0 1-9 0zM10 13.9v2.6"/>',
  chip: '<rect x="5.5" y="5.5" width="9" height="9" rx="1.8"/><path d="M8 3v2.5M12 3v2.5M8 14.5V17M12 14.5V17M3 8h2.5M3 12h2.5M14.5 8H17M14.5 12H17"/>',
  orbit: '<circle cx="10" cy="10" r="2.2"/><ellipse cx="10" cy="10" rx="7" ry="3.2"/><circle cx="16.4" cy="11.4" r=".9"/>',
  windows: '<rect x="3.5" y="5" width="9" height="7.5" rx="1.6"/><rect x="7.5" y="8" width="9" height="7.5" rx="1.6"/>',
  gear: '<circle cx="10" cy="10" r="2.4"/><path d="M10 3.2v2M10 14.8v2M3.2 10h2M14.8 10h2M5.2 5.2l1.4 1.4M13.4 13.4l1.4 1.4M5.2 14.8l1.4-1.4M13.4 6.6l1.4-1.4"/>',
  keys: '<rect x="3" y="5.5" width="14" height="9" rx="2"/><path d="M6 8.5h.01M8.7 8.5h.01M11.3 8.5h.01M14 8.5h.01M7 11.5h6"/>',
  help: '<circle cx="10" cy="10" r="6.5"/><path d="M8.2 8.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.6M10 13.8h.01"/>',
};
const icon = (name) => `<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ICONS.help}</svg>`;

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
};
// Said of the computer and the keyboard in front of the person (i18n.js).
const plain = (text) => hostWords(keyWords(String(text ?? '')));
const keyChip = (how) => el('kbd', null, plain(how));
// A line of the manual with its keys as keys (⌘ P, ⌥ ↵) and what to type to an agent (“…”) as it
// looks in the chat, a green bubble.
const KEYS = /([⌘⌥⇧⌃]\s?(?:[A-Z]|[,./↵])|↵)/;
function rich(text) {
  const line = el('span');
  for (const part of plain(text).split(/(“[^”]+”)/)) {
    if (!part) continue;
    if (part.startsWith('“')) { line.append(el('q', 'manual-say', part.slice(1, -1))); continue; }
    for (const bit of part.split(KEYS)) {
      if (!bit) continue;
      line.append(KEYS.test(bit) && bit.length <= 3 ? el('kbd', null, bit) : document.createTextNode(bit));
    }
  }
  return line;
}

// MADRE, photographed, with a numbered mark on what each step presses. The marks come in one after
// the other the first time the picture is in sight; on paper they are simply there.
function shot(id, lang, title) {
  const known = SHOTS[lang]?.[id] ?? SHOTS.es?.[id];
  if (!known) return null;
  // A tall one (a panel of Settings) narrower, so it does not fill a whole screen.
  const picture = el('figure', `manual-shot${known.height > known.width ? ' tall' : ''}`);
  const frame = el('div', 'manual-shot-frame');
  frame.style.aspectRatio = `${known.width} / ${known.height}`;
  frame.style.setProperty('--ratio', String(known.width / known.height));
  const image = el('img');
  image.src = `/assets/manual/shots/${SHOTS[lang]?.[id] ? lang : 'es'}-${id}.webp`;
  image.alt = title;
  image.width = known.width;
  image.height = known.height;
  image.decoding = 'async';
  if (!printing) image.loading = 'lazy';
  frame.append(image);
  known.marks.forEach((box, at) => {
    if (!box) return;
    const [left, top, width, height, place = top < 5 ? 'below' : null] = box;
    // Its number over its middle; under it at the picture's top edge, or where the picture said,
    // when marks stand close together.
    const mark = el('span', `manual-pin${place ? ` ${place}` : ''}`);
    mark.dataset.step = String(at + 1);
    mark.style.cssText = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;--at:${at}`;
    mark.append(el('b', null, String(at + 1)));
    frame.append(mark);
  });
  picture.append(frame);
  return picture;
}
// A step and its mark, lit together while the pointer is on either.
function pairUp(part) {
  const light = (step, on) => {
    part.classList.toggle('pointing', on);
    for (const one of part.querySelectorAll(`[data-step="${step}"]`)) one.classList.toggle('lit', on);
  };
  for (const one of part.querySelectorAll('[data-step]')) {
    one.addEventListener('pointerenter', () => light(one.dataset.step, true));
    one.addEventListener('pointerleave', () => light(one.dataset.step, false));
  }
}
function watchShots(root) {
  if (!('IntersectionObserver' in window)) { for (const one of root.querySelectorAll('.manual-shot')) one.classList.add('shown'); return; }
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('shown');
      seen.unobserve(entry.target);
    }
  }, { threshold: 0.45 });
  for (const one of root.querySelectorAll('.manual-shot')) seen.observe(one);
}

async function roomLanguage() {
  try {
    const answer = await fetch('/api/state', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null));
    return pick(answer?.language);
  } catch { return null; }
}
async function version() {
  try {
    const answer = await fetch('/api/version', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null));
    return answer?.current ?? null;
  } catch { return null; }
}

function draw(lang, madre) {
  const copy = MANUAL[lang];
  const other = lang === 'es' ? 'en' : 'es';
  document.documentElement.lang = lang;
  document.title = `MADRE · ${copy.title}`;
  const root = document.getElementById('manual');
  root.replaceChildren();

  // Over the page, on screen only: the other language and the PDF.
  if (!printing) {
    const bar = el('nav', 'manual-bar');
    const brand = el('span', 'manual-brand');
    brand.innerHTML = '<img src="/assets/brand/madre-app.svg" alt="" width="22" height="22">'; // trusted: our own markup
    brand.append(el('b', null, 'MADRE'));
    const keys = el('div', 'manual-keys');
    const swap = el('a', 'manual-key', copy.language);
    swap.href = `?lang=${other}`;
    const pdf = el('a', 'manual-key primary', copy.pdf);
    pdf.href = `/assets/manual/madre-manual-${lang}.pdf`;
    pdf.setAttribute('download', '');
    keys.append(swap, pdf);
    bar.append(brand, keys);
    root.append(bar);
  }

  // The cover.
  const cover = el('header', 'manual-cover');
  const mark = el('img', 'manual-mark');
  mark.src = '/assets/brand/madre-app.svg';
  mark.alt = '';
  cover.append(mark, el('h1', null, copy.title), el('p', 'manual-subtitle', copy.subtitle));
  if (madre) cover.append(el('p', 'manual-version', `MADRE ${madre}`));
  const intro = el('div', 'manual-intro');
  for (const line of copy.intro) intro.append(el('p', null, plain(line)));
  cover.append(intro);
  root.append(cover);

  // The four words the rest is said with.
  const words = el('section', 'manual-words');
  words.append(el('h2', null, copy.words.title));
  const grid = el('dl');
  for (const [term, what] of copy.words.list) {
    const one = el('div');
    one.append(el('dt', null, term), el('dd', null, plain(what)));
    grid.append(one);
  }
  words.append(grid);
  root.append(words);

  // The contents, each a link to its section.
  const contents = el('nav', 'manual-contents');
  contents.append(el('h2', null, copy.contents));
  const list = el('ol');
  copy.sections.forEach((section) => {
    const item = el('li');
    const link = el('a');
    link.href = `#${section.id}`;
    const badge = el('span', 'manual-icon');
    badge.innerHTML = icon(section.icon); // trusted: our own SVG
    link.append(badge, el('span', null, section.title));
    item.append(link);
    list.append(item);
  });
  const last = el('li');
  const toKeys = el('a');
  toKeys.href = '#atajos';
  const keysIcon = el('span', 'manual-icon');
  keysIcon.innerHTML = icon('keys'); // trusted: our own SVG
  toKeys.append(keysIcon, el('span', null, copy.shortcuts));
  last.append(toKeys);
  list.append(last);
  contents.append(list);
  root.append(contents);

  copy.sections.forEach((section, index) => {
    const part = el('section', 'manual-section');
    part.id = section.id;
    const head = el('header', 'manual-section-head');
    const badge = el('span', 'manual-icon');
    badge.innerHTML = icon(section.icon); // trusted: our own SVG
    const words = el('div');
    words.append(el('span', 'manual-number', String(index + 1).padStart(2, '0')), el('h2', null, section.title));
    head.append(badge, words);
    part.append(head, el('p', 'manual-lead', plain(section.lead)));
    // What it looks like, its steps numbered as the marks on it, then one thing to try and what is
    // worth knowing once the basics are there.
    const body = el('div', 'manual-body');
    const picture = shot(section.shot, lang, section.title);
    if (picture) body.append(picture);
    const side = el('div', 'manual-side');
    const steps = el('ol', 'manual-steps');
    section.steps.forEach((step, at) => {
      const item = el('li');
      item.dataset.step = String(at + 1);
      item.append(el('b', null, String(at + 1)), rich(step));
      steps.append(item);
    });
    side.append(steps);
    const tryIt = el('aside', 'manual-try');
    tryIt.append(el('span', 'manual-label', copy.tryIt), rich(section.tryIt));
    side.append(tryIt);
    body.append(side);
    part.append(body);
    const expert = el('aside', 'manual-expert');
    expert.append(el('span', 'manual-label', copy.expert), rich(section.expert));
    part.append(expert);
    if (!printing) pairUp(part);
    root.append(part);
  });

  // Every shortcut, as the sheet `?` opens.
  const keysPart = el('section', 'manual-section manual-shortcuts');
  keysPart.id = 'atajos';
  const keysHead = el('header', 'manual-section-head');
  const keysBadge = el('span', 'manual-icon');
  keysBadge.innerHTML = icon('keys'); // trusted: our own SVG
  const keysWords = el('div');
  keysWords.append(el('span', 'manual-number', String(copy.sections.length + 1).padStart(2, '0')), el('h2', null, copy.shortcuts));
  keysHead.append(keysBadge, keysWords);
  keysPart.append(keysHead);
  const groups = el('div', 'manual-shortcut-groups');
  for (const [group, rows] of GESTURES) {
    const box = el('div', 'manual-shortcut-group');
    box.append(el('h3', null, group[lang] ?? group.es));
    const table = el('dl', 'manual-keys-table');
    for (const [what, how] of rows) {
      const dd = el('dd');
      dd.append(keyChip(typeof how === 'string' ? how : how[lang] ?? how.es));
      table.append(el('dt', null, what[lang] ?? what.es), dd);
    }
    box.append(table);
    groups.append(box);
  }
  keysPart.append(groups);
  root.append(keysPart);

  const foot = el('footer', 'manual-foot');
  foot.append(el('p', null, copy.closing), el('p', 'manual-copy', `MADRE${madre ? ` ${madre}` : ''} · © 2026 Jossue Alcalá`));
  root.append(foot);
  if (printing) for (const one of root.querySelectorAll('.manual-shot')) one.classList.add('shown');
  else watchShots(root);
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  document.documentElement.dataset.ready = '1';
}

if (printing) document.documentElement.classList.add('printing');
const [room, madre] = await Promise.all([roomLanguage(), version()]);
draw(pick(asked.get('lang')) ?? room ?? browser, asked.get('version') ?? madre);
