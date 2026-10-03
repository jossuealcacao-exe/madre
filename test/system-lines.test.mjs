import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
const styles = await readFile(join(import.meta.dirname, '..', 'public', 'styles.css'), 'utf8');
const fn = (name) => {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from public/app.js`);
  let depth = 0;
  for (let i = app.indexOf(') {', start) + 2; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}' && (depth -= 1) === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} does not close`);
};

// A line of the room, built the way the renderers build one: text nodes and <b> elements.
function line(...parts) {
  const node = { classList: new Set(['system']), childNodes: [] };
  node.classList.contains = node.classList.has;
  for (const part of parts) {
    if (typeof part === 'string') node.childNodes.push({ nodeType: 3, textContent: part });
    else {
      const b = { tagName: 'B', nodeType: 1, classList: new Set(), childNodes: [{ nodeType: 3, textContent: part.b }] };
      b.classList.add = b.classList.add.bind(b.classList);
      Object.defineProperty(b, 'lastChild', { get: () => b.childNodes.at(-1) });
      node.childNodes.push(b);
    }
  }
  Object.defineProperty(node, 'firstChild', { get: () => node.childNodes[0] });
  Object.defineProperty(node, 'firstElementChild', { get: () => node.childNodes.find((child) => child.nodeType === 1) });
  return node;
}

test('a system line\'s title loses the separator that hung off it, and a word inside the sentence is never its title', () => {
  const tidy = new Function(`${fn('tidySystemLine')} return tidySystemLine;`)();
  // «claro · » as a title on its own line: the dot is all that was left of the join.
  const clear = tidy(line({ b: 'claro · ' }, '@codex 0% of the provider limit'));
  assert.equal(clear.childNodes[0].childNodes[0].textContent, 'claro');
  for (const tail of ['MU/TH/UR › ', 'connections › ', 'plan · ', 'warning · ']) {
    const tidied = tidy(line({ b: tail }, 'something happened'));
    assert.doesNotMatch(tidied.childNodes[0].childNodes[0].textContent, /[\s·›:]$/, `"${tail}" kept its tail`);
  }
  // «local · @madre · qwen»: the @madre is part of the sentence and is marked so.
  const local = tidy(line('local · ', { b: '@madre' }, ' · qwen2.5:7b'));
  assert.ok(local.childNodes[1].classList.has('inline'), 'a word inside the sentence was taken for its title');
  assert.equal(local.childNodes[1].childNodes[0].textContent, '@madre', 'a word inside the sentence lost its letters');
  // The style only makes a title of a <b> that is not marked inline.
  assert.match(styles, /\.system > b:first-child:not\(\.inline\) \{[^}]*display: block/);
});

test('a forgotten memory is named in the room\'s language, not by its id', () => {
  const forgotten = fn('renderForgotten');
  assert.match(forgotten, /kindWord\(kind\)/, 'the kind is printed as its id');
  assert.doesNotMatch(forgotten, /el\('b', 'who', kind\)/);
});

test('every way into the column tidies the line on its way in', () => {
  const appends = [...app.matchAll(/els\.column\.append\(([^;]*)\);/g)].map((m) => m[1]);
  assert.ok(appends.length >= 3);
  for (const call of appends) assert.match(call, /^tidySystemLine\(/, `a line enters the column untidied: ${call}`);
});

test('three workspaces say what they are the first time they are opened, once each', () => {
  const block = app.slice(app.indexOf('const FIRST_TOUCH = {'), app.indexOf("/* ---------- What's new"));
  for (const button of ['#browser-button', '#tree-button', '#chats-button']) assert.ok(block.includes(`button: '${button}'`), `${button} has no first-touch card`);
  assert.match(block, /if \(!hint \|\| seen\[id\]\) return;/, 'the card does not check whether it was already shown');
  assert.match(block, /localStorage\.setItem\(HINTS_KEY/, 'the card is never remembered as shown');
});

test('the release channel offers this version\'s sheet beside its number, only where there is one', () => {
  assert.match(app, /if \(info\.notes\) \{[\s\S]{0,400}t\('ABOUT THIS VERSION'\)/);
  assert.match(app, /event\.preventDefault\(\); event\.stopPropagation\(\); void openWhatsNew\(\);/, 'pressing it opens or closes the fold instead');
  assert.match(app, /fetch\('\/api\/whats-new\?any=1'\)/);
});
