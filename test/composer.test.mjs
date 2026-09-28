import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('composer: /module has a guided command and an electric pixel transition', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  assert.match(app, /name: 'module'.*usage: '\/module <what it should do>'/, 'the guided module command is missing');
  assert.match(app, /name === 'module' && !state\.create/, '/module does not require CREATE explicitly');
  assert.match(app, /return \{ handled: true, preserve: true \}/, 'a rejected /module request is erased instead of preserved');
  assert.match(app, /Write exactly one <id>\.module\.mjs file for review/, '/module no longer asks for one reviewable file');
  assert.match(app, /classList\.toggle\('module-command', active\)/, 'typing /module never changes the typebox state');

  assert.match(css, /--module-electric:\s*#[0-9a-f]{6}/i, 'the module state has no electric purple token');
  assert.match(css, /\.composer\.module-command \.field::after \{ animation: module-pixel-shift \.58s steps\(9, end\) 1; \}/, 'the pixel transform is not fast and stepped');
  assert.match(css, /@keyframes module-pixel-shift/, 'the pixel transform has no keyframes');
  assert.match(css, /prefers-reduced-motion: reduce[^}]*\.composer\.module-command \.field::after \{ animation: none;/, 'the module animation ignores reduced-motion');
  assert.ok(css.indexOf(':root[data-scheme="light"] .composer.module-command .field') > css.indexOf(':root[data-scheme="light"] .composer.ash-on .field'), 'Ash overrides the purple module halo in the light scheme');
  assert.match(css, /\.editor textarea, \.editor \.highlight \{[^}]*margin: 0 -5px;[^}]*padding: 7px 5px;/, 'the command chip still has no room for its ring');
});

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

  // It is no longer typed into the textarea, which has one size for everything in it, so a quote
  // living there could only ever look like something you wrote. It sits inside the box all the
  // same, on a row of its own above the line you write on.
  const opens = page.indexOf('<div class="field">');
  const box = page.slice(opens, page.indexOf('</form>', opens));
  assert.match(box, /id="reply-quote"/, 'the quote is outside the box it belongs to');
  assert.ok(box.indexOf('id="reply-quote"') < box.indexOf('id="message"'), 'the quote is below the line you write on');
  assert.match(css, /\.reply-quote \{[^}]*grid-column: 1 \/ -1/, 'the quote does not take a row of its own, so it steals the writing space');
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

  // And the box grows to hold it, so what is quoted never eats the room to answer in.
  assert.match(css, /\.field\.quoting textarea[^{]*\{[^}]*min-height/, 'the field does not make room for an answer');
  assert.match(app, /classList\.toggle\('quoting'/, 'the field is never told it is holding a quote');
  assert.match(app, /Math\.max\(rows, els\.field\?\.classList\.contains\('quoting'\) \? 2 : 1\)/, 'the field is pinned back to one line while quoting');
  // The height is worked out again whenever the quote comes or goes.
  const render = app.slice(app.indexOf('function renderReplyQuote('), app.indexOf('function replyWith('));
  assert.equal((render.match(/autosize\(\)/g) ?? []).length, 2, 'the box does not resize when the quote appears or is dropped');

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

test('the layer over the field decorates the characters that are there, and not one more', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const here = (file) => join(import.meta.dirname, '..', 'public', file);
  const app = await readFile(here('app.js'), 'utf8');
  const css = await readFile(here('styles.css'), 'utf8');

  // The caret belongs to the textarea underneath and is placed by the textarea's own metrics. The
  // moment this layer writes a word nobody typed, everything after it sits that many characters
  // away from its own caret — which is how `#2` drawn as `#2 CREATE` put the cursor inside a pill.
  const render = app.slice(app.indexOf('function renderHighlight()'), app.indexOf('syncHighlightScroll();', app.indexOf('function renderHighlight()')));
  assert.ok(!/\$\{MODES\[Number\(name\)\]\.label\}<\/span>/.test(render), 'the mode chip spells out a word the human never typed');
  assert.match(render, /">#\$\{name\}<\/span>/, 'the mode chip no longer draws the token itself');
  for (const chip of ['file', 'agent', 'cmd']) {
    assert.ok(render.includes(`class="chip ${chip}`), `the ${chip} chip disappeared from the layer`);
  }

  // And no rule in that layer may change a metric. Colour, background, radius and box-shadow paint
  // without moving anything; family, size, weight and letter-spacing all change how wide a string
  // draws, and the textarea below knows nothing about them.
  const METRIC = /(font-family|font-size|font-weight|letter-spacing|word-spacing|font-stretch|text-transform)\s*:/;
  const offenders = [];
  for (const rule of css.matchAll(/^\.editor \.highlight[^{]*\{([^}]*)\}/gm)) {
    const selector = rule[0].slice(0, rule[0].indexOf('{')).trim();
    if (METRIC.test(rule[1])) offenders.push(selector);
  }
  assert.deepEqual(offenders, [], 'a rule over the field changes text metrics, so the caret will drift out of place');

  // A pill may grow upward and never sideways. Vertical padding costs nothing — an inline box
  // overflows its line without moving a character — but horizontal padding paints over the space
  // that follows, and so does a spread shadow, and then the next word arrives glued to its edge.
  // A negative margin does not save it: that gives the room back to the text while the background
  // still covers those pixels. The gap after a chip is the space the human typed; keep it visible.
  const chipRule = css.match(/^\.editor \.highlight \.chip \{([^}]*)\}/m);
  assert.ok(chipRule, 'the chip rule moved and this guard lost sight of it');
  const sides = chipRule[1].match(/padding:\s*[\d.]+\w*\s+([\d.]+)(px)?/);
  assert.ok(sides, 'the chip no longer declares its padding, so nothing here can hold it to zero');
  assert.equal(Number(sides[1]), 0, 'the chip pads sideways, which paints over the space after it');
  const shadow = chipRule[1].match(/box-shadow:\s*([^;]*)/);
  if (shadow) assert.ok(/inset/.test(shadow[1]), 'the chip rings itself outward, which swallows the same space more quietly');

  // The textarea and the layer stay one shape: same size, same spacing, same box.
  const shared = css.match(/^\.editor textarea, \.editor \.highlight \{([^}]*)\}/m);
  assert.ok(shared, 'the textarea and the layer no longer share one rule');
  for (const property of ['font-size', 'line-height', 'letter-spacing', 'font-family', 'padding', 'white-space']) {
    assert.ok(shared[1].includes(`${property}:`), `${property} is no longer shared, so the two can drift apart`);
  }
});
