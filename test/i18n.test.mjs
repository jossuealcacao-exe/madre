import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_LANGUAGE, LANGUAGES, catalogue, fill, isLanguage, language, pick, setLanguage, t } from '../public/i18n.js';
import { ES } from '../public/es.js';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('i18n: Spanish is what MADRE speaks, and English is a button away', () => {
  assert.equal(DEFAULT_LANGUAGE, 'es');
  assert.equal(language(), 'es');
  assert.equal(t('Type here, human. Ask the room…'), 'Escribe aquí, humana. Pregúntale a la sala…');

  setLanguage('en');
  assert.equal(t('Type here, human. Ask the room…'), 'Type here, human. Ask the room…', 'English is the source, so it needs no catalogue');
  setLanguage('es');

  // Anything that is not one of the two is the default rather than a broken screen.
  assert.equal(setLanguage('klingon'), 'es');
  assert.equal(isLanguage('fr'), false);
  assert.deepEqual(Object.keys(LANGUAGES).sort(), ['en', 'es']);
  assert.equal(LANGUAGES.es.other, 'en');
});

test('i18n: a sentence nobody has written yet comes back whole, in English', () => {
  // The whole point of keying on the English sentence: a missing translation is a screen in the
  // other language, not a hole and not MISSING_KEY_47.
  const never = 'This sentence is not in any catalogue and never will be.';
  assert.equal(t(never), never);
  // And what varies inside a sentence goes where the language puts it, not where English did.
  assert.equal(fill('{n} bloques · {ch} caracteres', { n: 17, ch: '14,483' }), '17 bloques · 14,483 caracteres');
  assert.equal(fill('{missing} stays visible', {}), '{missing} stays visible', 'an unfilled slot printed "undefined"');
});

test('i18n: a table that carries both languages is chosen whole, not key by key', () => {
  const condition = { id: 'ollama', title: { en: 'Ollama', es: 'Ollama' }, remedy: { en: 'Start it', es: 'Enciéndelo' }, fixes: ['brew install ollama'] };
  setLanguage('es');
  assert.deepEqual(pick(condition), { id: 'ollama', title: 'Ollama', remedy: 'Enciéndelo', fixes: ['brew install ollama'] });
  setLanguage('en');
  assert.equal(pick(condition).remedy, 'Start it');
  setLanguage('es');
});

test('i18n: the catalogue says nothing the product does not say', async () => {
  // Both ways round, because both are rot: a key the code no longer uses is a translation of a
  // sentence nobody reads, and a `t()` the catalogue does not have is a screen in the wrong
  // language. The second is not fatal — it falls back — which is exactly why it needs a test.
  const app = await read('app.js');
  const used = new Set();
  for (const [, quote] of app.matchAll(/\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) used.add(quote);
  for (const match of app.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) used.add(match[1].replace(/\\'/g, "'"));
  assert.ok(used.size >= 10, 'nothing in the page goes through the catalogue, so this guards nothing');
  for (const key of used) {
    assert.ok(Object.hasOwn(ES, key), `the page says "${key.slice(0, 60)}…" and the Spanish catalogue does not`);
  }
  for (const key of Object.keys(ES)) {
    assert.ok(app.includes(key), `the catalogue translates "${key.slice(0, 60)}…", which the page no longer says`);
  }
  // And the Spanish is Spanish: an entry copied from the key is a line somebody forgot to write.
  for (const [key, said] of Object.entries(ES)) assert.notEqual(said, key, `"${key.slice(0, 40)}…" was never translated`);
  assert.ok(Object.keys(catalogue('es')).length === Object.keys(ES).length);
});

test('i18n: the switch is one button, it says where it goes, and the page comes back in it', async () => {
  const [app, page] = await Promise.all([read('app.js'), read('index.html')]);
  assert.match(page, /<button id="lang-button"/);
  assert.match(app, /const next = LANGUAGES\[language\(\)\]\.other;/);
  assert.match(app, /localStorage\.setItem\('pulse\.language', next\)/);
  assert.match(app, /fetch\('\/api\/language'/, 'the machine never learns which language it was set to');
  assert.match(app, /location\.reload\(\)/);
  // The language is decided before the first sentence is built: a constant chosen in the wrong
  // language stays wrong for the life of the page.
  assert.ok(app.indexOf('setLanguage(isLanguage(chosenLanguage)') < app.indexOf('const PLACEHOLDERS'), 'the page builds sentences before it knows the language');
  // A browser that has never chosen takes the machine's choice once, and cannot loop.
  assert.match(app, /if \(chosenLanguage \|\| !isLanguage\(fromMachine\) \|\| fromMachine === language\(\)\) return;/);

  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  assert.match(server, /url\.pathname === '\/api\/language'/);
  assert.match(server, /await updateConfig\(root, \{ language \}\)/);
  assert.match(server, /'\/i18n\.js', '\/es\.js'/, 'the page imports modules the room does not serve');
});
