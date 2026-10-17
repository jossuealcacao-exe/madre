// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The editor: a file of the project, written by the human's own hand.
//
// A textarea does the typing — the caret, the selection, IME, spellcheck off, the browser's own
// undo — and a drawing of the same text sits exactly under it with the colours, the search marks
// and the line the caret is on. The two never disagree because the drawing is made from the
// textarea's value and nothing else: no model of its own, no virtual DOM, no dependency.
//
// What it adds is what every developer reaches for without thinking: indent and outdent, a new
// line that keeps its indentation, brackets and quotes that close themselves, comment a line,
// move and duplicate lines, delete a line, select the next occurrence, find and replace, go to a
// line, word wrap, and the one this room exists for — ask an agent about the lines you are on.
//
// Every edit goes through `document.execCommand('insertText')` so ⌘Z and ⇧⌘Z undo and redo it the
// way they undo typing. Where the browser no longer offers it, `setRangeText` does the edit and
// undo is the browser's own business.

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set([')', ']', '}', '"', "'", '`']);
const COMMENTS = {
  js: { line: '//' }, css: { block: ['/*', '*/'] }, html: { block: ['<!--', '-->'] }, md: { block: ['<!--', '-->'] },
  py: { line: '#' }, sh: { line: '#' }, yaml: { line: '#' }, sql: { line: '--' }, json: null,
};
// Past this many lines the colours step aside: the text stays exact, the drawing stays fast.
const COLOUR_LIMIT = 6000;
const isMac = () => /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');
// The tools' drawings: one stroke weight, one size, the room's own line.
const svg = (d) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {
  find: svg('M12.4 12.4 16 16M13.6 8.6a5 5 0 1 1-10 0 5 5 0 0 1 10 0z'),
  replace: svg('M4 7h10.5l-2.5-2.5M16 13H5.5L8 15.5'),
  goto: svg('M4 10h9M10 6.5 13.5 10 10 13.5M16.5 4.5v11'),
  comment: svg('M8.5 4 5.5 16M14.5 4l-3 12'),
  wrap: svg('M3.5 5.5h13M3.5 10h10a2.6 2.6 0 0 1 0 5.2H10M11.8 13.3 10 15.2l1.8 1.8M3.5 15h3.5'),
  ask: svg('M4 5.6A2.6 2.6 0 0 1 6.6 3h6.8A2.6 2.6 0 0 1 16 5.6v4.8A2.6 2.6 0 0 1 13.4 13H9.2L5.6 16v-3A2.6 2.6 0 0 1 4 10.4z'),
  link: svg('M8.3 11.7l3.4-3.4M7.2 13.2 6 14.4a2.6 2.6 0 0 1-3.7-3.7l2.6-2.6a2.6 2.6 0 0 1 3.7 0M12.8 6.8 14 5.6a2.6 2.6 0 0 1 3.7 3.7l-2.6 2.6a2.6 2.6 0 0 1-3.7 0'),
  // The room's chooser chevron (app.js, ICON_CHEVRON), drawn on this grid: a menu opens under it.
  chevron: svg('M5.25 7.75 10 12.5l4.75-4.75'),
};

// Spaces or tabs, and how many: what the file already does, not what the editor prefers.
export function detectIndent(text) {
  const counts = new Map();
  let tabs = 0;
  let spaces = 0;
  for (const line of String(text).split('\n').slice(0, 2000)) {
    const lead = line.match(/^[ \t]+/)?.[0];
    if (!lead || !line.trim()) continue;
    if (lead[0] === '\t') { tabs += 1; continue; }
    spaces += 1;
    const width = lead.length;
    for (const size of [2, 4, 8]) if (width % size === 0) counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  if (tabs > spaces) return { tabs: true, size: 1, unit: '\t' };
  // The largest unit every indented line is a multiple of, among the common ones.
  const size = [4, 2].find((one) => (counts.get(one) ?? 0) >= spaces * 0.9 && spaces > 0) ?? 2;
  return { tabs: false, size, unit: ' '.repeat(size) };
}

// The lines a selection touches, whole: from the start of the first to the end of the last.
export function lineSpan(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  // A selection that ends at the very start of a line does not take that line.
  const stop = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const next = value.indexOf('\n', stop);
  return { from, to: next === -1 ? value.length : next };
}

// Comment or uncomment lines, the way the file's language writes a comment.
export function toggleComment(block, family) {
  const style = COMMENTS[family] ?? null;
  if (!style) return block;
  const lines = block.split('\n');
  if (style.line) {
    const mark = style.line;
    const filled = lines.filter((line) => line.trim());
    const all = filled.length > 0 && filled.every((line) => line.trimStart().startsWith(mark));
    if (all) return lines.map((line) => line.replace(new RegExp(`^(\\s*)${mark.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} ?`), '$1')).join('\n');
    const indent = Math.min(...filled.map((line) => line.match(/^\s*/)[0].length));
    return lines.map((line) => (line.trim() ? `${line.slice(0, indent)}${mark} ${line.slice(indent)}` : line)).join('\n');
  }
  const [open, close] = style.block;
  const trimmed = block.trim();
  if (trimmed.startsWith(open) && trimmed.endsWith(close)) {
    return block.replace(open, '').replace(new RegExp(`${close.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\s\\S]*${close.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')})`), '').replace(/^(\s*) /, '$1').replace(/ (\s*)$/, '$1');
  }
  const lead = block.match(/^\s*/)[0];
  return `${lead}${open} ${block.slice(lead.length)} ${close}`;
}

// Where in the text a regex or a plain search matches.
export function findAll(text, query, { caseSensitive = false, regex = false, word = false } = {}) {
  if (!query) return [];
  let pattern;
  try {
    const source = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = new RegExp(word ? `\\b${source}\\b` : source, caseSensitive ? 'g' : 'gi');
  } catch { return []; }
  const found = [];
  for (const match of text.matchAll(pattern)) {
    if (!match[0]) continue;
    found.push({ start: match.index, end: match.index + match[0].length });
    if (found.length > 5000) break;
  }
  return found;
}

// `draft`: what the human had written and not saved, kept by the room while another file was on
// screen (the code workspace's tabs); the file on disk stays `text`, so the editor knows it is unsaved.
// `onCaret(line)`: the line the caret is on, whenever it moves. `setMarks` paints lines in the margin
// (an agent's changes, in its colour) without touching the text.
export function createEditor({ text = '', draft = null, name = '', family = null, tokenize = null, t = (s) => s, fill = null, onSave = null, onAsk = null, onDirty = null, onCaret = null }) {
  const say = (key, vars) => (vars && fill ? fill(t(key), vars) : t(key));
  const crlf = /\r\n/.test(text);
  const indent = detectIndent(text);
  const familyId = family?.id ?? null;
  let saved = text.replace(/\r\n/g, '\n');
  let wrap = false;
  let lineHeight = 21;
  // The page's top padding: a drawn line's offset already counts it, a computed one has to add it.
  let padTop = 14;
  let matches = [];
  let current = -1;

  const node = document.createElement('div');
  node.className = 'code-editor';
  node.innerHTML = `
    <div class="ed-bar" role="toolbar">
      <button type="button" class="ed-btn ed-save" data-act="save"><i class="ed-dot"></i><span></span></button>
      <span class="ed-sep"></span>
      <span class="ed-tools">
        <button type="button" class="ed-btn" data-act="find"><i class="ed-ico">${ICONS.find}</i><span></span></button>
        <button type="button" class="ed-btn" data-act="replace"><i class="ed-ico">${ICONS.replace}</i><span></span></button>
        <button type="button" class="ed-btn" data-act="goto"><i class="ed-ico">${ICONS.goto}</i><span></span></button>
        <button type="button" class="ed-btn" data-act="comment"><i class="ed-ico">${ICONS.comment}</i><span></span></button>
        <button type="button" class="ed-btn ed-toggle" data-act="wrap" aria-pressed="false"><i class="ed-ico">${ICONS.wrap}</i><span></span></button>
      </span>
      <span class="ed-grow"></span>
    </div>
    <div class="ed-find" hidden>
      <div class="ed-row">
        <input class="ed-q" type="text" spellcheck="false" autocomplete="off">
        <button type="button" class="ed-opt" data-opt="case" aria-pressed="false">Aa</button>
        <button type="button" class="ed-opt" data-opt="word" aria-pressed="false">W</button>
        <button type="button" class="ed-opt" data-opt="regex" aria-pressed="false">.*</button>
        <span class="ed-count"></span>
        <button type="button" class="ed-nav" data-nav="-1">↑</button>
        <button type="button" class="ed-nav" data-nav="1">↓</button>
        <button type="button" class="ed-x" data-act="closefind">×</button>
      </div>
      <div class="ed-row ed-replace-row" hidden>
        <input class="ed-r" type="text" spellcheck="false" autocomplete="off">
        <button type="button" class="ed-btn" data-act="replace-one"><span></span></button>
        <button type="button" class="ed-btn" data-act="replace-all"><span></span></button>
      </div>
    </div>
    <div class="ed-goto" hidden><span></span><input class="ed-line" type="text" inputmode="numeric" autocomplete="off"><button type="button" class="ed-x" data-act="closegoto">×</button></div>
    <div class="ed-main">
      <div class="ed-gutter" aria-hidden="true"><div class="ed-gutter-inner"></div></div>
      <div class="ed-code">
        <div class="ed-active" aria-hidden="true"></div>
        <div class="ed-float" hidden>
          <button type="button" class="ed-chip ask" data-float="ask"><i class="ed-ico">${ICONS.ask}</i><span></span><i class="ed-chev">${ICONS.chevron}</i></button>
          <button type="button" class="ed-chip" data-float="comment"><i class="ed-ico">${ICONS.comment}</i><span></span></button>
          <button type="button" class="ed-chip" data-float="copy"><i class="ed-ico">${ICONS.link}</i><span></span></button>
        </div>
        <div class="ed-hl" aria-hidden="true"></div>
        <textarea class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea>
      </div>
    </div>
    <div class="ed-status"><span class="ed-pos"></span><span class="ed-sel"></span><span class="ed-keys"></span><span class="ed-grow"></span><span class="ed-indent"></span><span class="ed-eol"></span><span>UTF-8</span><span class="ed-lang"></span><span class="ed-state"></span></div>`;

  const $ = (selector) => node.querySelector(selector);
  const input = $('.ed-input');
  const hl = $('.ed-hl');
  const gutter = $('.ed-gutter-inner');
  const active = $('.ed-active');
  const findBox = $('.ed-find');
  const query = $('.ed-q');
  const replaceWith = $('.ed-r');
  const gotoBox = $('.ed-goto');
  const gotoInput = $('.ed-line');
  const options = { case: false, word: false, regex: false };
  const mod = isMac() ? '⌘' : 'Ctrl+';

  // The words on the buttons, in the room's language.
  // The shortcut is not printed on the button: it appears in the status line while the pointer
  // is on the button, so the bar stays a row of words and the keys are learned where you look.
  const label = (act, words, keys = '') => {
    const button = node.querySelector(`[data-act="${act}"]`);
    button.querySelector('span').textContent = words;
    // Narrow, the bar keeps only the drawings; the name stays the button's for whoever cannot see it.
    button.setAttribute('aria-label', words);
    if (keys) button.dataset.keys = keys;
  };
  label('save', t('SAVE'), `${mod}S`);
  label('find', t('FIND'), `${mod}F`);
  label('replace', t('REPLACE'));
  label('goto', t('GO TO LINE'), isMac() ? '⌃G' : 'Ctrl+G');
  label('comment', t('COMMENT'), `${mod}/`);
  label('wrap', t('WRAP'));
  label('replace-one', t('REPLACE'));
  label('replace-all', t('ALL'));
  query.placeholder = t('Find');
  replaceWith.placeholder = t('Replace with');
  gotoBox.querySelector('span').textContent = t('Go to line');
  $('.ed-indent').textContent = indent.tabs ? t('Tabs') : say('Spaces: {n}', { n: indent.size });
  $('.ed-eol').textContent = crlf ? 'CRLF' : 'LF';
  $('.ed-lang').textContent = family?.label ?? t('Plain text');
  input.value = draft === null || draft === undefined ? saved : String(draft).replace(/\r\n/g, '\n');
  // A textarea given its text holds the caret after the last character; the first focus would jump
  // there. Editing starts where reading did: at the top, or at the line asked for.
  input.setSelectionRange?.(0, 0);

  const keysLine = $('.ed-keys');
  for (const button of node.querySelectorAll('.ed-bar [data-act]')) {
    button.addEventListener('pointerenter', () => { keysLine.textContent = button.dataset.keys ? `${button.dataset.keys} · ${button.querySelector('span')?.textContent ?? ''}` : ''; });
    button.addEventListener('pointerleave', () => { keysLine.textContent = ''; });
  }
  const floatBar = $('.ed-float');
  floatBar.querySelector('[data-float="ask"] span').textContent = t('Ask');
  floatBar.querySelector('[data-float="comment"] span').textContent = t('Comment');
  floatBar.querySelector('[data-float="copy"] span').textContent = t('Copy reference');
  floatBar.querySelector('[data-float="comment"]').hidden = !COMMENTS[familyId];

  /* ---------- drawing ---------- */

  const escape = (s) => s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
  // One line as HTML: the colour pieces, cut again wherever a search match starts or ends.
  function drawLine(line, carry, offset, marks) {
    const pieces = tokenize && family && countLines() <= COLOUR_LIMIT ? tokenize(line, family, carry) : [{ text: line, kind: null }];
    if (!marks.length) return pieces.map((piece) => (piece.kind ? `<span class="t-${piece.kind}">${escape(piece.text)}</span>` : escape(piece.text))).join('');
    let html = '';
    let at = offset;
    for (const piece of pieces) {
      let rest = piece.text;
      while (rest) {
        const inside = marks.find((m) => at >= m.start && at < m.end);
        const nextEdge = Math.min(...marks.map((m) => (m.start > at ? m.start : m.end > at ? m.end : Infinity)), at + rest.length);
        const take = rest.slice(0, Math.max(1, nextEdge - at));
        const body = piece.kind ? `<span class="t-${piece.kind}">${escape(take)}</span>` : escape(take);
        html += inside ? `<mark class="${inside.cur ? 'cur' : ''}">${body}</mark>` : body;
        at += take.length;
        rest = rest.slice(take.length);
      }
    }
    return html;
  }
  let lineCount = 1;
  let lastCaret = 0;
  let marks = new Map();
  function countLines() { return lineCount; }
  let frame = 0;
  function draw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawNow);
  }
  function drawNow() {
    const value = input.value;
    const lines = value.split('\n');
    lineCount = lines.length;
    const carry = { inBlock: false };
    let offset = 0;
    let markAt = 0;
    const html = [];
    const numbers = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const end = offset + line.length;
      while (markAt < matches.length && matches[markAt].end <= offset) markAt += 1;
      const here = [];
      for (let j = markAt; j < matches.length && matches[j].start < end; j += 1) here.push({ ...matches[j], cur: j === current });
      html.push(`<div class="l">${drawLine(line, carry, offset, here) || ' '}</div>`);
      const mark = marks.get(i + 1);
      numbers.push(mark ? `<div class="mk" style="--mk:${mark.color}" title="${escape(mark.title ?? '')}">${i + 1}</div>` : `<div>${i + 1}</div>`);
      offset = end + 1;
    }
    hl.innerHTML = html.join('');
    gutter.innerHTML = numbers.join('');
    if (wrap) {
      // Wrapped, a line is as tall as it wraps: the number beside it takes the same height.
      const rows = hl.children;
      const nums = gutter.children;
      for (let i = 0; i < rows.length; i += 1) nums[i].style.height = `${rows[i].offsetHeight}px`;
    }
    place();
    status();
  }
  // The drawing follows the textarea's scroll and width, and the line the caret is on.
  function place() {
    hl.style.width = wrap ? `${input.clientWidth}px` : '';
    hl.style.transform = `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
    gutter.style.transform = `translateY(${-input.scrollTop}px)`;
    const line = caretLine();
    const row = hl.children[line - 1];
    const top = row ? row.offsetTop : padTop + (line - 1) * lineHeight;
    const height = row ? row.offsetHeight : lineHeight;
    active.style.transform = `translateY(${top - input.scrollTop}px)`;
    active.style.height = `${height}px`;
    for (const one of gutter.querySelectorAll('.on')) one.classList.remove('on');
    gutter.children[line - 1]?.classList.add('on');
    placeFloat();
  }
  // Over the first line of what is selected, where the eye already is; under it when that line is
  // at the very top. Gone while nothing is selected or a bar is open.
  function placeFloat() {
    const chosen = input.selectionEnd > input.selectionStart;
    const show = chosen && document.activeElement === input && findBox.hidden && gotoBox.hidden;
    floatBar.hidden = !show;
    if (!show) return;
    const rowAt = (line) => hl.children[line - 1];
    const topOf = (line) => (rowAt(line) ? rowAt(line).offsetTop : padTop + (line - 1) * lineHeight) - input.scrollTop;
    const first = caretLine(input.selectionStart);
    const top = topOf(first);
    const bottom = topOf(caretLine(input.selectionEnd)) + (rowAt(caretLine(input.selectionEnd))?.offsetHeight ?? lineHeight);
    // Scrolled away entirely: nothing in sight for it to stand on.
    if (bottom < 0 || top > input.clientHeight) { floatBar.hidden = true; return; }
    const above = top - 38;
    // Its first line scrolled off the top while the rest is still in sight: it waits at the edge.
    const y = above >= 4 ? above : top >= 0 ? top + (rowAt(first)?.offsetHeight ?? lineHeight) + 6 : 4;
    floatBar.style.transform = `translateY(${y}px)`;
  }
  function caretLine(at = input.selectionStart) {
    let line = 1;
    const value = input.value;
    for (let i = value.indexOf('\n'); i !== -1 && i < at; i = value.indexOf('\n', i + 1)) line += 1;
    return line;
  }
  function status() {
    const value = input.value;
    const at = input.selectionStart;
    const line = caretLine(at);
    const col = at - (value.lastIndexOf('\n', at - 1) + 1) + 1;
    $('.ed-pos').textContent = say('Ln {line}, Col {col}', { line, col });
    if (line !== lastCaret) { lastCaret = line; onCaret?.(line); }
    const chosen = input.selectionEnd - input.selectionStart;
    $('.ed-sel').textContent = chosen ? say('{n} selected', { n: chosen }) : '';
    const dirty = isDirty();
    $('.ed-state').textContent = dirty ? t('Unsaved') : t('Saved');
    node.classList.toggle('dirty', dirty);
  }

  /* ---------- editing ---------- */

  function isDirty() { return input.value !== saved; }
  let wasDirty = false;
  function changed() {
    const dirty = isDirty();
    if (dirty !== wasDirty) { wasDirty = dirty; onDirty?.(dirty); }
    if (!findBox.hidden && query.value) search({ keep: true });
    draw();
  }
  // Replace a range with text the way typing would, so it can be undone.
  function edit(start, end, text, select = null) {
    input.focus();
    input.setSelectionRange(start, end);
    const done = text ? document.execCommand?.('insertText', false, text) : document.execCommand?.('delete');
    if (!done) {
      input.setRangeText(text, start, end, 'end');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (select) input.setSelectionRange(select[0], select[1]);
  }
  // Rewrite the whole lines a selection touches, and keep the same lines selected afterwards.
  function rewriteLines(change) {
    const value = input.value;
    const { selectionStart: start, selectionEnd: end } = input;
    const span = lineSpan(value, start, end);
    const before = value.slice(span.from, span.to);
    const after = change(before);
    if (after === before) return;
    const collapsed = start === end;
    const delta = after.length - before.length;
    edit(span.from, span.to, after);
    if (collapsed) {
      const firstLineDelta = after.split('\n')[0].length - before.split('\n')[0].length;
      const caret = Math.max(span.from, start + firstLineDelta);
      input.setSelectionRange(caret, caret);
    } else input.setSelectionRange(span.from, span.to + delta);
  }
  const indentLines = (block) => block.split('\n').map((line) => (line.length ? indent.unit + line : line)).join('\n');
  const outdentLines = (block) => block.split('\n').map((line) => (line.startsWith('\t') ? line.slice(1) : line.replace(new RegExp(`^ {1,${indent.size}}`), ''))).join('\n');

  function moveLines(direction) {
    const value = input.value;
    const { selectionStart: start, selectionEnd: end } = input;
    const span = lineSpan(value, start, end);
    const block = value.slice(span.from, span.to);
    if (direction < 0) {
      if (span.from === 0) return;
      const prevFrom = value.lastIndexOf('\n', span.from - 2) + 1;
      const prev = value.slice(prevFrom, span.from - 1);
      edit(prevFrom, span.to, `${block}\n${prev}`);
      const shift = -(prev.length + 1);
      input.setSelectionRange(start + shift, end + shift);
    } else {
      if (span.to >= value.length) return;
      const nextTo = value.indexOf('\n', span.to + 1);
      const stop = nextTo === -1 ? value.length : nextTo;
      const next = value.slice(span.to + 1, stop);
      edit(span.from, stop, `${next}\n${block}`);
      const shift = next.length + 1;
      input.setSelectionRange(start + shift, end + shift);
    }
  }
  function duplicateLines(direction) {
    const value = input.value;
    const { selectionStart: start, selectionEnd: end } = input;
    const span = lineSpan(value, start, end);
    const block = value.slice(span.from, span.to);
    edit(span.to, span.to, `\n${block}`);
    if (direction > 0) input.setSelectionRange(start + block.length + 1, end + block.length + 1);
    else input.setSelectionRange(start, end);
  }
  function deleteLines() {
    const value = input.value;
    const span = lineSpan(value, input.selectionStart, input.selectionEnd);
    const to = span.to < value.length ? span.to + 1 : span.to;
    const from = span.to >= value.length && span.from > 0 ? span.from - 1 : span.from;
    edit(from, to, '');
  }
  // ⌘D: the word under the caret, then each next place it appears.
  function selectNext() {
    const value = input.value;
    let { selectionStart: start, selectionEnd: end } = input;
    if (start === end) {
      while (start > 0 && /\w/.test(value[start - 1])) start -= 1;
      while (end < value.length && /\w/.test(value[end])) end += 1;
      input.setSelectionRange(start, end);
      return;
    }
    const word = value.slice(start, end);
    let next = value.indexOf(word, end);
    if (next === -1) next = value.indexOf(word);
    if (next !== -1) { input.setSelectionRange(next, next + word.length); reveal(next); }
  }
  function smartHome(extend) {
    const value = input.value;
    const at = input.selectionStart;
    const from = value.lastIndexOf('\n', at - 1) + 1;
    const first = from + (value.slice(from).match(/^[ \t]*/)?.[0].length ?? 0);
    const target = at === first ? from : first;
    if (extend) input.setSelectionRange(Math.min(target, input.selectionEnd), input.selectionEnd, 'backward');
    else input.setSelectionRange(target, target);
  }

  input.addEventListener('keydown', (event) => {
    const value = input.value;
    const { selectionStart: start, selectionEnd: end } = input;
    const meta = isMac() ? event.metaKey : event.ctrlKey;
    const key = event.key;
    const stop = () => { event.preventDefault(); event.stopPropagation(); };

    if (meta && key.toLowerCase() === 's') { stop(); void save(); return; }
    if (meta && !event.altKey && key.toLowerCase() === 'f') { stop(); openFind(false); return; }
    if ((meta && event.altKey && key.toLowerCase() === 'f') || (!isMac() && event.ctrlKey && key.toLowerCase() === 'h')) { stop(); openFind(true); return; }
    if (event.ctrlKey && !event.metaKey && key.toLowerCase() === 'g') { stop(); openGoto(); return; }
    if (meta && key.toLowerCase() === 'g') { stop(); if (!findBox.hidden) step(event.shiftKey ? -1 : 1); else openGoto(); return; }
    if (meta && key === '/') { stop(); rewriteLines((block) => toggleComment(block, familyId)); return; }
    if (meta && key === ']') { stop(); rewriteLines(indentLines); return; }
    if (meta && key === '[') { stop(); rewriteLines(outdentLines); return; }
    if (meta && event.shiftKey && key.toLowerCase() === 'k') { stop(); deleteLines(); return; }
    if (meta && key.toLowerCase() === 'd') { stop(); selectNext(); return; }
    if (event.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      stop();
      if (event.shiftKey) duplicateLines(key === 'ArrowDown' ? 1 : -1); else moveLines(key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (key === 'Escape' && (!findBox.hidden || !gotoBox.hidden)) { stop(); closeBars(); return; }
    if (key === 'Home' && !meta) { stop(); smartHome(event.shiftKey); status(); place(); return; }

    if (key === 'Tab') {
      stop();
      const multi = value.slice(start, end).includes('\n');
      if (event.shiftKey) rewriteLines(outdentLines);
      else if (multi) rewriteLines(indentLines);
      else edit(start, end, indent.unit);
      return;
    }
    if (key === 'Enter' && !meta && !event.altKey) {
      stop();
      const from = value.lastIndexOf('\n', start - 1) + 1;
      const lead = value.slice(from).match(/^[ \t]*/)[0];
      const before = value.slice(from, start).trimEnd();
      const opens = /[{[(]$/.test(before) || (familyId === 'py' && before.endsWith(':'));
      const after = value[end];
      if (opens && PAIRS[before.at(-1)] === after) {
        const inner = `\n${lead}${indent.unit}`;
        edit(start, end, `${inner}\n${lead}`);
        input.setSelectionRange(start + inner.length, start + inner.length);
      } else edit(start, end, `\n${lead}${opens ? indent.unit : ''}`);
      return;
    }
    if (key === 'Backspace' && start === end && start > 0) {
      const prev = value[start - 1];
      if (PAIRS[prev] && value[start] === PAIRS[prev]) { stop(); edit(start - 1, start + 1, ''); return; }
      // Inside the indentation, a backspace takes back one level, not one space.
      const from = value.lastIndexOf('\n', start - 1) + 1;
      const lead = value.slice(from, start);
      if (!indent.tabs && lead.length >= indent.size && /^ +$/.test(lead)) {
        stop();
        const back = lead.length % indent.size || indent.size;
        edit(start - back, start, '');
        return;
      }
    }
    if (!meta && !event.altKey && key.length === 1) {
      // Typing the closer that is already there steps over it.
      if (CLOSERS.has(key) && start === end && value[start] === key) {
        const opener = Object.keys(PAIRS).find((one) => PAIRS[one] === key);
        if (opener === key || value.slice(0, start).includes(opener)) { stop(); input.setSelectionRange(start + 1, start + 1); status(); place(); return; }
      }
      if (PAIRS[key]) {
        const quote = PAIRS[key] === key;
        const prev = value[start - 1] ?? '';
        const next = value[end] ?? '';
        if (start !== end) {
          stop();
          const chosen = value.slice(start, end);
          edit(start, end, `${key}${chosen}${PAIRS[key]}`, [start + 1, end + 1]);
          return;
        }
        // A quote right after a letter is an apostrophe; a pair before a word would split it.
        if ((quote && /\w/.test(prev)) || /\w/.test(next)) return;
        stop();
        edit(start, end, `${key}${PAIRS[key]}`, [start + 1, start + 1]);
      }
    }
  });
  input.addEventListener('input', changed);
  // Dragging selected text moves it, and reaching for lines with the mouse did exactly that by
  // accident — a word carried into the middle of another. Text is moved here by cut and paste.
  input.addEventListener('dragstart', (event) => event.preventDefault());
  input.addEventListener('drop', (event) => event.preventDefault());
  input.addEventListener('scroll', place);
  // The wheel belongs to the page wherever it turns inside the editor. Over the numbers, the bars
  // or the status line nothing there scrolls, and the turn used to fall through to the room behind
  // the window; it moves the text instead. Over the text itself, the page's edge stops it (CSS).
  node.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.target === input) return;
    const step = event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? input.clientHeight : 1;
    input.scrollTop += event.deltaY * step;
    input.scrollLeft += event.deltaX * step;
    event.preventDefault();
  }, { passive: false });
  for (const kind of ['keyup', 'click', 'select', 'focus']) input.addEventListener(kind, () => { place(); status(); });
  const followSelection = () => { if (document.activeElement === input) { place(); status(); } };
  document.addEventListener('selectionchange', followSelection);
  const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(() => draw()) : null;
  resized?.observe(input);

  /* ---------- find and replace ---------- */

  function search({ keep = false } = {}) {
    matches = findAll(input.value, query.value, { caseSensitive: options.case, regex: options.regex, word: options.word });
    if (!keep || current >= matches.length) {
      const at = input.selectionStart;
      current = matches.length ? Math.max(0, matches.findIndex((m) => m.start >= at)) : -1;
      if (current === -1 && matches.length) current = 0;
    }
    $('.ed-count').textContent = query.value ? (matches.length ? `${current + 1}/${matches.length}` : t('no results')) : '';
    findBox.classList.toggle('none', Boolean(query.value) && !matches.length);
    draw();
  }
  function reveal(at) {
    const line = caretLine(at);
    const row = hl.children[line - 1];
    const top = row ? row.offsetTop : padTop + (line - 1) * lineHeight;
    if (top < input.scrollTop || top > input.scrollTop + input.clientHeight - lineHeight * 2) input.scrollTop = Math.max(0, top - input.clientHeight / 3);
  }
  function step(direction) {
    if (!matches.length) return;
    current = (current + direction + matches.length) % matches.length;
    const hit = matches[current];
    input.setSelectionRange(hit.start, hit.end);
    reveal(hit.start);
    $('.ed-count').textContent = `${current + 1}/${matches.length}`;
    draw();
  }
  function openFind(replacing) {
    gotoBox.hidden = true;
    findBox.hidden = false;
    $('.ed-replace-row').hidden = !replacing;
    const chosen = input.value.slice(input.selectionStart, input.selectionEnd);
    if (chosen && !chosen.includes('\n')) query.value = chosen;
    query.focus();
    query.select();
    search();
  }
  function closeBars() {
    findBox.hidden = true;
    gotoBox.hidden = true;
    matches = [];
    current = -1;
    draw();
    input.focus();
  }
  query.addEventListener('input', () => search());
  query.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeBars(); }
  });
  replaceWith.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); replaceOne(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeBars(); }
  });
  for (const button of node.querySelectorAll('.ed-opt')) {
    button.addEventListener('click', () => {
      options[button.dataset.opt] = !options[button.dataset.opt];
      button.setAttribute('aria-pressed', String(options[button.dataset.opt]));
      search();
      query.focus();
    });
  }
  for (const button of node.querySelectorAll('.ed-nav')) button.addEventListener('click', () => step(Number(button.dataset.nav)));
  function replacement(hit) {
    if (!options.regex) return replaceWith.value;
    try { return input.value.slice(hit.start, hit.end).replace(new RegExp(query.value, options.case ? '' : 'i'), replaceWith.value); } catch { return replaceWith.value; }
  }
  function replaceOne() {
    if (!matches.length) return;
    const hit = matches[Math.max(0, current)];
    edit(hit.start, hit.end, replacement(hit));
    search({ keep: true });
    if (matches.length) step(0);
  }
  function replaceAll() {
    if (!matches.length) return;
    const value = input.value;
    let out = '';
    let at = 0;
    for (const hit of matches) { out += value.slice(at, hit.start) + replacement(hit); at = hit.end; }
    out += value.slice(at);
    const caret = input.selectionStart;
    edit(0, value.length, out);
    input.setSelectionRange(Math.min(caret, out.length), Math.min(caret, out.length));
    search();
  }

  /* ---------- go to line ---------- */

  function openGoto() {
    findBox.hidden = true;
    gotoBox.hidden = false;
    gotoInput.value = '';
    gotoInput.placeholder = `1–${countLines()}`;
    gotoInput.focus();
  }
  function goToLine(n) {
    const lines = input.value.split('\n');
    const line = Math.max(1, Math.min(lines.length, n));
    let at = 0;
    for (let i = 0; i < line - 1; i += 1) at += lines[i].length + 1;
    input.focus();
    input.setSelectionRange(at, at);
    reveal(at);
    place();
    status();
  }
  gotoInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); const [line] = gotoInput.value.split(/[:,]/).map(Number); if (line) goToLine(line); gotoBox.hidden = true; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeBars(); }
  });

  /* ---------- asking about it ---------- */

  // The lines the caret or the selection is on, as the room cites them.
  function chosenLines() {
    const lo = caretLine(input.selectionStart);
    const hi = caretLine(Math.max(input.selectionStart, input.selectionEnd - (input.selectionEnd > input.selectionStart ? 1 : 0)));
    return { from: lo, to: hi };
  }
  // Asking is the room's, not the editor's: it hands over which lines, what they say and where
  // the button that asked stands, and the room offers who should look and what to ask — the same
  // card it shows wherever something on the screen is asked about.
  function askAbout(anchor) {
    const lines = chosenLines();
    const text = input.value.split('\n').slice(lines.from - 1, lines.to).join('\n');
    onAsk?.({ ...lines, text, anchor: anchor.getBoundingClientRect(), dirty: isDirty() });
  }

  /* ---------- the bar ---------- */

  async function save() {
    if (!onSave) return;
    const body = crlf ? input.value.replace(/\n/g, '\r\n') : input.value;
    node.classList.add('saving');
    try {
      const ok = await onSave(body);
      if (ok) { saved = input.value; changed(); node.classList.add('just-saved'); setTimeout(() => node.classList.remove('just-saved'), 900); }
    } finally {
      node.classList.remove('saving');
    }
  }
  node.querySelector('.ed-bar').addEventListener('click', (event) => {
    const button = event.target.closest('[data-act]');
    if (!button) return;
    const act = button.dataset.act;
    if (act === 'save') void save();
    else if (act === 'find') openFind(false);
    else if (act === 'replace') openFind(true);
    else if (act === 'goto') openGoto();
    else if (act === 'comment') { input.focus(); rewriteLines((block) => toggleComment(block, familyId)); }
    else if (act === 'wrap') {
      wrap = !wrap;
      node.classList.toggle('wrap', wrap);
      input.setAttribute('wrap', wrap ? 'soft' : 'off');
      button.setAttribute('aria-pressed', String(wrap));
      draw();
      input.focus();
    }
  });
  floatBar.addEventListener('pointerdown', (event) => event.preventDefault());
  floatBar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-float]');
    if (!button) return;
    const act = button.dataset.float;
    if (act === 'ask') askAbout(button);
    else if (act === 'comment') { rewriteLines((block) => toggleComment(block, familyId)); input.focus(); }
    else if (act === 'copy') {
      const lines = chosenLines();
      const reference = `!${name}:${lines.from}${lines.to !== lines.from ? `-${lines.to}` : ''}`;
      void navigator.clipboard?.writeText(reference);
      button.classList.add('done');
      setTimeout(() => button.classList.remove('done'), 900);
    }
  });
  node.querySelector('[data-act="closefind"]').addEventListener('click', closeBars);
  node.querySelector('[data-act="closegoto"]').addEventListener('click', closeBars);
  node.querySelector('[data-act="replace-one"]').addEventListener('click', replaceOne);
  node.querySelector('[data-act="replace-all"]').addEventListener('click', replaceAll);
  node.querySelector('[data-act="comment"]').disabled = !COMMENTS[familyId];

  // The line height the stylesheet chose, once the editor is on the page.
  requestAnimationFrame(() => {
    const measured = parseFloat(getComputedStyle(input).lineHeight);
    if (Number.isFinite(measured)) lineHeight = measured;
    const pad = parseFloat(getComputedStyle(input).paddingTop);
    if (Number.isFinite(pad)) padTop = pad;
    drawNow();
  });
  drawNow();

  return {
    node,
    focus: (line = null) => { input.focus({ preventScroll: !line }); if (line) goToLine(line); },
    value: () => input.value,
    dirty: isDirty,
    save,
    // The file on disk changed under the editor and the human chose the disk's version.
    reset(next) { saved = String(next).replace(/\r\n/g, '\n'); input.value = saved; changed(); },
    // Lines to mark in the margin: [{ from, to, color, title }], one-based. An empty list clears them.
    setMarks(list = []) {
      marks = new Map();
      for (const one of list) for (let n = one.from; n <= one.to; n += 1) marks.set(n, { color: /^[#\w(),.%\s-]{1,40}$/.test(one.color ?? '') ? one.color : 'currentColor', title: one.title ?? '' });
      draw();
    },
    // Taken off the page: what it listened to outside itself goes with it.
    destroy() { document.removeEventListener('selectionchange', followSelection); resized?.disconnect(); cancelAnimationFrame(frame); },
  };
}
