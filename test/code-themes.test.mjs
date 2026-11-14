// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOOK_KEYS } from '../src/looks.mjs';

// TERMINAL AND EDITOR (2026-11-14, the author): three styles for the code — Coldbrew, Oldcode and
// Simple — chosen in Ajustes › Apariencia, each in light and dark as the Theme says. Simple is the
// room as it always was; the other two are a palette of CSS variables on the root that the editor,
// the file viewer and the desktop app's terminal (terminal-panel.js, --term-*) read.
const read = (file) => readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');
const THEMES = ['coldbrew', 'oldcode'];
const CODE = ['bg', 'gutter', 'text', 'dim', 'line', 'active', 'sel', 'caret', 'keyword', 'string', 'comment', 'number', 'literal', 'regex'];
const ANSI = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const TERM = ['bg', 'fg', 'cursor', 'sel', ...ANSI, ...ANSI.map((name) => `bright-${name}`)];

// The block at the end of styles.css, as selector → its custom properties.
async function palettes() {
  const css = await read('styles.css');
  const at = css.indexOf('/* ---- Terminal and editor: Coldbrew, Oldcode and Simple');
  assert.ok(at > 0, 'styles.css has no block for the terminal and the editor');
  const block = css.slice(at);
  const rules = [...block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    vars: Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])),
  }));
  const wear = (theme, scheme) => {
    const out = {};
    for (const { selector, vars } of rules) {
      const parts = selector.split(',').map((one) => one.trim());
      const dark = parts.includes(`:root[data-code-theme="${theme}"]`);
      const light = parts.includes(`:root[data-code-theme="${theme}"][data-scheme="light"]`);
      if (dark || (scheme === 'light' && light)) Object.assign(out, vars);
    }
    return out;
  };
  return { block, rules, wear };
}

const luminance = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((pair) => Number.parseInt(pair, 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('code themes · each style says every colour of the editor and the terminal, in dark and in light', async () => {
  const { wear } = await palettes();
  for (const theme of THEMES) {
    for (const scheme of ['dark', 'light']) {
      const vars = wear(theme, scheme);
      for (const name of CODE) assert.ok(vars[`code-${name}`], `${theme} ${scheme} has no --code-${name}`);
      for (const name of TERM) assert.ok(vars[`term-${name}`], `${theme} ${scheme} has no --term-${name}`);
    }
    // Light is its own palette, not dark's ground with dark's letters.
    assert.notEqual(wear(theme, 'light')['code-bg'], wear(theme, 'dark')['code-bg']);
    assert.notEqual(wear(theme, 'light')['term-bg'], wear(theme, 'dark')['term-bg']);
  }
});

test('code themes · what is read holds AA on its ground: the text, every kind of word and the terminal colours', async () => {
  const { wear } = await palettes();
  for (const theme of THEMES) {
    for (const scheme of ['dark', 'light']) {
      const vars = wear(theme, scheme);
      const ground = vars['code-bg'];
      for (const name of ['text', 'keyword', 'string', 'comment', 'number', 'literal', 'regex']) {
        const ratio = contrast(vars[`code-${name}`], ground);
        assert.ok(ratio >= 4.5, `${theme} ${scheme}: --code-${name} is ${ratio.toFixed(2)}:1 on its ground`);
      }
      // The line numbers are a guide, not the text: 3:1 is enough, on the page and on the gutter.
      for (const under of [ground, vars['code-gutter']]) assert.ok(contrast(vars['code-dim'], under) >= 3, `${theme} ${scheme}: the line numbers fade`);
      const term = vars['term-bg'];
      assert.ok(contrast(vars['term-fg'], term) >= 4.5, `${theme} ${scheme}: the terminal's text`);
      for (const name of [...ANSI.slice(1), ...ANSI.slice(1).map((one) => `bright-${one}`)]) {
        // On a dark ground «white» is the light one; on a light ground it is a grey that still reads.
        const ratio = contrast(vars[`term-${name}`], term);
        assert.ok(ratio >= 4.5, `${theme} ${scheme}: --term-${name} is ${ratio.toFixed(2)}:1`);
      }
      // «Bright black» is the dim grey of hints and comments: readable, not loud.
      assert.ok(contrast(vars['term-bright-black'], term) >= 3, `${theme} ${scheme}: bright black disappears`);
      if (scheme === 'light') assert.ok(contrast(vars['term-black'], term) >= 4.5, `${theme} light: black does not read on the light ground`);
    }
  }
});

test('code themes · Simple is the room as it always was, and the conversation keeps its own code blocks', async () => {
  const { block, rules } = await palettes();
  const app = await read('app.js');
  // The first value is written as no attribute at all, so nothing can paint Simple.
  assert.match(app, /codeTheme: \{ key: 'pulse\.code\.theme', values: \['simple', 'coldbrew', 'oldcode'\] \}/);
  assert.doesNotMatch(block, /data-code-theme="simple"/);
  // Every rule that paints the editor or the viewer waits for a style to be chosen.
  for (const { selector } of rules) {
    if (!/\.(ed-|viewer|code-editor)/.test(selector)) continue;
    for (const part of selector.split(/,(?![^(]*\))/)) {
      if (/\.code-sample/.test(part)) continue;
      assert.match(part.trim(), /^:where\(:root\[data-code-theme\]\)/, `«${part.trim()}» paints without a style chosen`);
    }
  }
  // The chat's code blocks are not the editor's business.
  assert.doesNotMatch(block, /\.(codeblock|bubble)\b/);
  // The root's --syn-* stay Simple's: the themes speak through --code-*.
  assert.doesNotMatch(block, /--syn-[\w-]+:/);
});

test('code themes · the choice is kept with the other looks, for every project, and Apariencia offers it', async () => {
  const app = await read('app.js');
  assert.ok(Object.hasOwn(LOOK_KEYS, 'pulse.code.theme'), 'the server refuses the choice');
  assert.match(app, /const SHARED_LOOKS = \[[^\]]*'pulse\.code\.theme'/, 'the choice stays in the page that made it');
  // A draft without it would write «undefined» when a look is applied (applyLooksNow saves every look).
  assert.match(app, /function currentLooks\(\) \{\n  return \{[^}]*codeTheme: readLook\('codeTheme'\)/);
  // The row in Apariencia: the three tiles in the author's order, and the search finds it.
  assert.match(app, /sxBlock\(page, t\('Terminal and editor'\)/);
  assert.match(app, /for \(const value of \['coldbrew', 'oldcode', 'simple'\]\)/);
  assert.match(app, /\['look', 'Terminal and editor'\]/);
  assert.match(app, /codeTheme: \{ simple: \(\) => 'Simple', coldbrew: \(\) => 'Coldbrew', oldcode: \(\) => 'Oldcode' \}/);
});
