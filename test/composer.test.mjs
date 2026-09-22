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

test('composer: what you are answering sits above the field, smaller and in a badge of its own', async () => {
  const [app, css, page] = await Promise.all([read('app.js'), read('styles.css'), read('index.html')]);

  // It is no longer typed into the field. A textarea has one size for everything in it, so a
  // quote living there could only ever look like something you wrote.
  assert.match(page, /id="reply-quote"/, 'the quote has no place of its own in the page');
  assert.ok(!/els\.input\.value = `\$\{head\}/.test(app), 'the quote is still being typed into the field');
  assert.match(app, /state\.replyTo = \{/, 'the composer no longer remembers what it is answering');

  // Two points smaller than what you type, which is what the field is set in.
  const field = css.match(/\.editor textarea, \.editor \.highlight \{[^}]*font-size: (\d+(?:\.\d+)?)px/);
  assert.ok(field, 'the field no longer declares a size');
  const badge = css.match(/\.reply-quote \{([^}]*)\}/);
  assert.ok(badge, 'the quote has no badge');
  const quoteSize = Number(badge[1].match(/font-size: (\d+(?:\.\d+)?)px/)?.[1]);
  assert.equal(quoteSize, Number(field[1]) - 2, `the quote is ${quoteSize}px against a field of ${field[1]}px`);

  // A badge faint enough to sit under the line without competing with it, and clipped so a long
  // answer cannot push the field down the page.
  assert.match(badge[1], /background: color-mix/);
  assert.match(badge[1], /border-radius/);
  assert.match(css, /\.reply-quote \.said \{[^}]*-webkit-line-clamp: 2/, 'a long quote can still run away with the composer');

  // And it can be taken off without clearing what you have written.
  assert.match(css, /\.reply-quote \.drop \{/, 'there is no way to drop the quote');
  assert.match(app, /state\.replyTo = null; renderReplyQuote\(\)/, 'dropping the quote does nothing');

  // It still goes out at the head of the message: the agent has to see what it is answering.
  assert.match(app, /if \(quoting && !text\.startsWith\('\/'\)\) outgoing = `\$\{quoteHead\(quoting\)\}\$\{outgoing\}`/, 'the quote never reaches the agent');
  // A slash command is not an answer to anyone, so it does not carry one.
  assert.match(app, /!text\.startsWith\('\/'\)/);
  // And it is let go only once the message is away. Clearing it before the room accepts the
  // message would lose what you were answering if the send failed.
  const success = app.indexOf("els.input.value = '';\n      state.replyTo = null;");
  assert.ok(success > 0, 'the quote is not cleared where the message succeeds');
  assert.ok(success > app.indexOf("await fetch('/api/messages'"), 'the quote is cleared before the message is away');

  // Short enough to read at a glance: it used to run to 220 characters and fill the field.
  const clip = Number(app.match(/const REPLY_CLIP = (\d+);/)?.[1]);
  assert.ok(clip && clip <= 140, `a quote of ${clip} characters is more than a couple of lines`);
  assert.match(app, /excerpt\.slice\(0, REPLY_CLIP - 1\)/, 'the ellipsis pushes the quote past its own limit');
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
