// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
import { trazoDrawing } from './icons.js';

const asked = new URLSearchParams(location.search);
const printing = asked.get('print') === '1';
const pick = (value) => (value === 'en' || value === 'es' ? value : null);
const browser = String(navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';

const ICONS = {
  home: trazoDrawing('home'),
  chat: trazoDrawing('chat'),
  shield: trazoDrawing('shield-check'),
  robot: trazoDrawing('robot'),
  code: trazoDrawing('code'),
  note: trazoDrawing('note'),
  grid: trazoDrawing('modules'),
  plug: trazoDrawing('plug'),
  chip: trazoDrawing('chip'),
  orbit: trazoDrawing('map'),
  windows: trazoDrawing('window'),
  gear: trazoDrawing('settings'),
  download: trazoDrawing('download'),
  agents: trazoDrawing('agents'),
  stars: trazoDrawing('spark'),
  loop: trazoDrawing('sync'),
  warning: trazoDrawing('warning'),
  keys: trazoDrawing('keyboard'),
  help: trazoDrawing('help'),
  list: trazoDrawing('list'),
  market: trazoDrawing('market'),
  book: trazoDrawing('book'),
  check: trazoDrawing('check'),
  trash: trazoDrawing('trash'),
  running: trazoDrawing('running'),
};
const icon = (name) => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICONS[name] ?? ICONS.help}</svg>`;

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
  for (const part of plain(text).split(/(“[^”]+”|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith('“')) { line.append(el('q', 'manual-say', part.slice(1, -1))); continue; }
    if (part.startsWith('`')) { line.append(el('code', null, part.slice(1, -1))); continue; }
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
// Each number goes where there is room for it (2026-10-21): outside its mark — above, to the left,
// to the right or below, in that order unless the picture asked for one first (`place`) — inside
// the picture and clear of the numbers already placed; the mark's corner only when nothing else
// fits. Placed once the picture has its size, and again when the page changes width.
const SIDES = ['above', 'left', 'right', 'below', 'corner'];
export function placeNumbers(frame) {
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  if (!width || !height) return;
  const taken = [];
  // Every mark's own box: a number never sits on another step's mark.
  const marks = [...frame.querySelectorAll('.manual-pin')].map((one) => ({ pin: one, x: one.offsetLeft, y: one.offsetTop, w: one.offsetWidth, h: one.offsetHeight }));
  for (const pin of frame.querySelectorAll('.manual-pin')) {
    const badge = pin.querySelector('b');
    if (!badge) continue;
    // The number grows with the picture: on a phone the marks are about 20 px tall and a full-size
    // number would sit on the next one.
    const size = Math.round(Math.min(26, Math.max(18, width * 0.045)));
    Object.assign(badge.style, { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, Math.round(size * 0.5))}px` });
    const gap = 5;
    const box = { x: pin.offsetLeft, y: pin.offsetTop, w: pin.offsetWidth, h: pin.offsetHeight };
    const spot = {
      above: [box.x + box.w / 2 - size / 2, box.y - size - gap],
      left: [box.x - size - gap, box.y + box.h / 2 - size / 2],
      right: [box.x + box.w + gap, box.y + box.h / 2 - size / 2],
      below: [box.x + box.w / 2 - size / 2, box.y + box.h + gap],
      corner: [box.x - size / 3, box.y - size / 3],
      // When the four sides are taken: the ends of a side, the outer corners, and last the mark's
      // own corner from inside, if it is big enough to keep part of the mark in view.
      aboveStart: [box.x, box.y - size - gap],
      aboveEnd: [box.x + box.w - size, box.y - size - gap],
      belowStart: [box.x, box.y + box.h + gap],
      belowEnd: [box.x + box.w - size, box.y + box.h + gap],
      outsideTopLeft: [box.x - size - gap, box.y - size - gap],
      outsideTopRight: [box.x + box.w + gap, box.y - size - gap],
      outsideBottomLeft: [box.x - size - gap, box.y + box.h + gap],
      outsideBottomRight: [box.x + box.w + gap, box.y + box.h + gap],
      ...(box.w >= size * 2 && box.h >= size * 1.6 ? {
        insideTopLeft: [box.x + 4, box.y + 4],
        insideTopRight: [box.x + box.w - size - 4, box.y + 4],
        insideBottomLeft: [box.x + 4, box.y + box.h - size - 4],
        insideBottomRight: [box.x + box.w - size - 4, box.y + box.h - size - 4],
      } : {}),
    };
    const more = Object.keys(spot).filter((one) => !SIDES.includes(one));
    const asked = SIDES.find((side) => pin.classList.contains(side));
    const order = [...(asked ? [asked, ...SIDES.filter((side) => side !== asked && side !== 'corner')] : SIDES.slice(0, -1)), ...more, 'corner'];
    const fits = ([x, y]) => x >= 2 && y >= 2 && x + size <= width - 2 && y + size <= height - 2;
    const clear = ([x, y]) => taken.every(([tx, ty]) => Math.abs(tx - x) > size + 3 || Math.abs(ty - y) > size + 3);
    // A mark that holds this one (a switch inside its card) is not in the way: its number is bound to sit on it.
    const holds = (one) => one.x <= box.x && one.y <= box.y && one.x + one.w >= box.x + box.w && one.y + one.h >= box.y + box.h;
    // How much of the other marks a number at (x, y) would cover; two pixels of edge do not count.
    const covers = ([x, y]) => marks.reduce((sum, one) => (one.pin === pin || holds(one) ? sum
      : sum + Math.max(0, Math.min(x + size, one.x + one.w) - Math.max(x, one.x) - 2) * Math.max(0, Math.min(y + size, one.y + one.h) - Math.max(y, one.y) - 2)), 0);
    const offMarks = (at) => covers(at) === 0;
    // Nowhere free: the place that covers the least of the other marks.
    const least = order.filter((one) => fits(spot[one]) && clear(spot[one])).sort((a, b) => covers(spot[a]) - covers(spot[b]))[0];
    const side = order.find((one) => fits(spot[one]) && clear(spot[one]) && offMarks(spot[one])) ?? least ?? order.find((one) => fits(spot[one])) ?? 'corner';
    const [x, y] = spot[side];
    const left = Math.min(Math.max(x, 2), width - size - 2);
    const top = Math.min(Math.max(y, 2), height - size - 2);
    taken.push([left, top]);
    Object.assign(badge.style, { left: `${left - box.x}px`, top: `${top - box.y}px`, translate: 'none' });
  }
}
// Every picture's numbers, once its image has its size: what printing waits for.
async function placeAll(root) {
  // The frame keeps the picture's shape before it loads, so they can be placed at once; each one
  // is placed again when its image is in (a lazy image far down comes in later).
  const frames = [...root.querySelectorAll('.manual-shot-frame')];
  frames.forEach(placeNumbers);
  await Promise.all(frames.map((frame) => Promise.resolve(frame.querySelector('img')?.decode?.()).catch(() => null).then(() => placeNumbers(frame))));
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
  // In four parts, in the order someone new needs them: getting started, working, more, help.
  const entry = (href, iconName, title) => {
    const item = el('li');
    const link = el('a');
    link.href = href;
    const badge = el('span', 'manual-icon');
    badge.innerHTML = icon(iconName); // trusted: our own SVG
    link.append(badge, el('span', null, title));
    item.append(link);
    return item;
  };
  for (const [part, name] of Object.entries(copy.parts)) {
    const group = el('div', 'manual-part');
    group.append(el('h3', null, name));
    const list = el('ol');
    for (const section of copy.sections.filter((one) => one.part === part)) list.append(entry(`#${section.id}`, section.icon, section.title));
    if (part === 'help') list.append(entry('#atajos', 'keys', copy.shortcuts));
    group.append(list);
    contents.append(group);
  }
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
    const picture = section.shot ? shot(section.shot, lang, section.title) : null;
    if (picture) body.append(picture);
    // What to paste in the Terminal, with its key to copy it.
    const terminalOf = (lines) => {
      const terminal = el('div', 'manual-terminal');
      terminal.append(el('span', 'manual-terminal-dots'));
      for (const line of lines) {
        const row = el('div', 'manual-terminal-line');
        row.append(el('span', 'manual-terminal-prompt', '$'), el('code', null, line));
        if (!printing) {
          const take = el('button', 'manual-copy', copy.copy);
          take.type = 'button';
          take.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(line); take.textContent = copy.copied; setTimeout(() => { take.textContent = copy.copy; }, 1600); } catch { /* the line stays selectable */ }
          });
          row.append(take);
        }
        terminal.append(row);
      }
      return terminal;
    };
    if (section.code?.length) body.append(terminalOf(section.code));
    // «Start here» (2026-10-28): the way in for each system, side by side — what it says first, its
    // steps, the command, and one thing worth knowing there.
    if (section.systems?.length) {
      const systems = el('div', 'manual-systems');
      for (const system of section.systems) {
        const card = el('article', 'manual-system');
        // A system with an anchor of its own (#windows: bin/madre.mjs and the mail point there).
        if (system.id) card.id = system.id;
        card.append(el('h3', null, plain(system.name)));
        if (system.note) card.append(el('p', 'manual-system-note', plain(system.note)));
        if (system.steps?.length) {
          const list = el('ol', 'manual-system-steps');
          for (const step of system.steps) { const item = el('li'); item.append(rich(step)); list.append(item); }
          card.append(list);
        }
        if (system.code?.length) card.append(terminalOf(system.code));
        if (system.tip) { const tip = el('p', 'manual-system-tip'); tip.append(rich(system.tip)); card.append(tip); }
        systems.append(card);
      }
      body.append(systems);
    }
    // What goes wrong most often: what the person sees, and what to do.
    if (section.problems?.length) {
      const table = el('div', 'manual-problems');
      const head = el('div', 'manual-problem head');
      head.append(el('span', 'manual-label', copy.problem[0]), el('span', 'manual-label', copy.problem[1]));
      table.append(head);
      for (const [seen, fix] of section.problems) {
        const row = el('div', 'manual-problem');
        row.append(el('b', null, plain(seen)), rich(fix));
        table.append(row);
      }
      body.append(table);
    }
    const side = el('div', 'manual-side');
    const steps = el('ol', 'manual-steps');
    (section.steps ?? []).forEach((step, at) => {
      const item = el('li');
      item.dataset.step = String(at + 1);
      item.append(el('b', null, String(at + 1)), rich(step));
      steps.append(item);
    });
    if (section.steps?.length) side.append(steps);
    if (section.tryIt) {
      const tryIt = el('aside', 'manual-try');
      tryIt.append(el('span', 'manual-label', copy.tryIt), rich(section.tryIt));
      side.append(tryIt);
    }
    if (side.childElementCount) body.append(side);
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
  // The numbers once the pictures have their size, and again when the page changes width.
  // On paper the page is ready once every number is placed; on screen at once (a lazy picture far
  // down loads only when it is near).
  const placed = placeAll(root);
  if (printing) void placed.then(() => { document.documentElement.dataset.ready = '1'; });
  else document.documentElement.dataset.ready = '1';
  let resized = 0;
  window.addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => root.querySelectorAll('.manual-shot-frame').forEach(placeNumbers), 120); });
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

if (printing) document.documentElement.classList.add('printing');
const [room, madre] = await Promise.all([roomLanguage(), version()]);
draw(pick(asked.get('lang')) ?? room ?? browser, asked.get('version') ?? madre);
