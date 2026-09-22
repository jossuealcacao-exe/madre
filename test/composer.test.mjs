import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('composer: a mention is coloured, never boxed', async () => {
  const css = await read('styles.css');
  // The base chip is a pill: a background, and a ring drawn with two shadows. That is right for
  // a mode or a command, which are tokens you are choosing. A mention is a word in the sentence
  // you are writing, so it keeps the colour and loses the box.
  const base = css.match(/\.editor \.highlight \.chip \{[^}]*\}/);
  assert.ok(base, 'the chip style is gone from styles.css');
  assert.match(base[0], /background: var\(--chip-bg\)/, 'the base chip is no longer a pill, so this test guards nothing');

  const mention = css.match(/\.editor \.highlight \.chip\.agent \{([^}]*)\}/);
  assert.ok(mention, 'a mention is still drawn as a pill');
  assert.match(mention[1], /background:\s*transparent/);
  assert.match(mention[1], /box-shadow:\s*none/);
  // And it keeps what makes it readable: the agent's own colour, inherited from the base rule.
  assert.ok(!/color:/.test(mention[1]), 'a mention overrode the agent colour it exists to show');
});

test('composer: what you are replying to is short, and marked apart from what you are writing', async () => {
  const app = await read('app.js');

  // The head of a reply is built in one place and matched in another. If either moves the quote
  // silently stops being set apart, so they are checked against each other here.
  assert.ok(app.includes('const head = `↩ @${source.sender}'), 'the reply head is gone from app.js');
  const pattern = app.match(/const QUOTE_LINE = (\/.*\/m);/);
  assert.ok(pattern, 'QUOTE_LINE is gone from app.js');
  const quoteLine = new Function(`return ${pattern[1]}`)();

  for (const head of [
    '↩ @claude #4213: “Verificado contra el código de hoy, no contra el resumen.”',
    '↩ @codex: “A reply with no sequence at all.”',
    '↩ @opencode #7: “Something with “quotes” inside it, and a line\nbreak.”',
  ]) {
    assert.match(head, quoteLine, `the overlay would not mark: ${head.slice(0, 40)}`);
  }
  // A line that merely starts with the arrow is not a quote, and neither is ordinary text.
  for (const plain of ['↩ not a quote at all', 'Ayuda a @gemini a que @codex revise esto', '@claude ¿qué opinas?']) {
    assert.doesNotMatch(plain, quoteLine, `the overlay would mark plain text: ${plain}`);
  }

  // Short enough to read at a glance. It used to run to 220 characters, which filled the field
  // and pushed what you were writing out of sight.
  const cap = app.match(/excerpt\.length > (\d+) \? `\$\{excerpt\.slice\(0, (\d+)\)\}…`/);
  assert.ok(cap, 'the quote is no longer clipped');
  assert.ok(Number(cap[1]) <= 140, `a quote of ${cap[1]} characters is more than a couple of lines`);
  assert.equal(Number(cap[2]), Number(cap[1]) - 1, 'the ellipsis pushes the quote past its own limit');

  // And it is drawn as its own block, dimmer than the line you are typing.
  const css = await read('styles.css');
  const quote = css.match(/\.editor \.highlight \.quote \{([^}]*)\}/);
  assert.ok(quote, 'the quote is not set apart in the overlay');
  assert.match(quote[1], /display: block/);
  assert.match(quote[1], /color: var\(--text-3\)/);
});

test('composer: the top bar glows on a dark ground, and barely on a pale one', async () => {
  const css = await read('styles.css');
  const blur = (rule) => Number(rule.match(/box-shadow: 0 0 (\d+)px/)?.[1] ?? 0);
  const mix = (rule) => Number(rule.match(/var\(--phosphor\) (\d+)%/)?.[1] ?? 0);

  const dark = css.match(/\.mother-button:hover \{[^}]*\}/)[0];
  assert.ok(blur(dark) >= 10, 'the dark theme lost its glow');

  // Light mode, both ways it can be asked for: the system setting and the explicit choice.
  const bySystem = css.match(/:root:not\(\[data-theme="dark"\]\) \.mother-button:hover[^{]*\{[^}]*\}/);
  const byChoice = css.match(/:root\[data-theme="light"\] \.mother-button:hover[^{]*\{[^}]*\}/);
  assert.ok(bySystem, 'a light system theme still gets the dark theme glow');
  assert.ok(byChoice, 'choosing light still gets the dark theme glow');
  for (const rule of [bySystem[0], byChoice[0]]) {
    assert.ok(blur(rule) < blur(dark) / 2, `the light glow is ${blur(rule)}px against ${blur(dark)}px`);
    assert.ok(mix(rule) < mix(dark) / 2, `the light glow is ${mix(rule)}% against ${mix(dark)}%`);
    // The other top-bar buttons are softened with it, or one of them shouts alone.
    for (const also of ['.tree-button:hover', '.stop-all:hover']) assert.ok(rule.includes(also), `${also} was left glowing`);
  }
});
