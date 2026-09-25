import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_LANGUAGE, LANGUAGES, catalogue, fill, isLanguage, language, pick, setLanguage, t } from '../public/i18n.js';
import { ES } from '../public/es.js';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('i18n: Spanish is what MADRE speaks, and English is a button away', () => {
  assert.equal(DEFAULT_LANGUAGE, 'es');
  assert.equal(language(), 'es');
  assert.equal(t('Type here, human. Ask the room…'), 'Escribe aquí, humano. Pregúntale a la sala…');

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
  // Everything that speaks: the page, the console inside the core, and the server text that
  // reaches a screen — a module saying what it is, a reading saying what it means. One
  // catalogue for both sides of the wire, so a sentence is never translated twice.
  const files = [join(import.meta.dirname, '..', 'public', 'app.js'), join(import.meta.dirname, '..', 'public', 'inquiry.js')];
  const walk = async (at) => {
    for (const entry of await readdir(at, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(join(at, entry.name));
      else if (entry.name.endsWith('.mjs')) files.push(join(at, entry.name));
    }
  };
  await walk(join(import.meta.dirname, '..', 'src'));
  // A source file may write a character as an escape — '\u00b7' for '·' — and the catalogue is
  // keyed by the string, not by how it was typed.
  const app = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n')
    .replace(/\\u([0-9a-fA-F]{4})/g, (whole, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  // The key as JavaScript will hand it to t(): an escaped quote in the source is a plain one in
  // the string, and the catalogue is keyed by the string.
  const used = new Set();
  for (const match of app.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) used.add(match[1].replace(/\\(['\\])/g, '$1'));
  for (const match of app.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(match[1].replace(/\\(["\\])/g, '$1'));
  assert.ok(used.size >= 10, 'nothing in the page goes through the catalogue, so this guards nothing');
  for (const key of used) {
    assert.ok(Object.hasOwn(ES, key), `the page says "${key.slice(0, 60)}…" and the Spanish catalogue does not`);
  }
  for (const key of Object.keys(ES)) {
    const escaped = key.replace(/'/g, "\\'");
    assert.ok(app.includes(key) || app.includes(escaped), `the catalogue translates "${key.slice(0, 60)}…", which the page no longer says`);
  }
  // And the Spanish is Spanish: an entry copied from the key is a line somebody forgot to write.
  // A sentence that came out identical is a line somebody forgot to write. A single word may
  // honestly be the same in both languages — LOCAL is LOCAL — so the rule is about sentences:
  // two words or more, and the Spanish has to be Spanish.
  for (const [key, said] of Object.entries(ES)) {
    const words = (key.match(/[A-Za-z][A-Za-z']{2,}/g) ?? []).length;
    if (words >= 2) assert.notEqual(said, key, `"${key.slice(0, 40)}…" was never translated`);
  }
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

test('i18n: a reading taken in another language is read in this one', async () => {
  // The numbers are what was measured; the sentence is only how they are said. A test that ran
  // months ago, in whatever language the room spoke then, is still read today — so it is said
  // again, now, from the fields that were stored beside it.
  const { saysFor } = await import('../src/exam.mjs');
  const { setLanguage: setRoomLanguage } = await import('../src/i18n.mjs');

  const stored = { id: 'match', ran: true, n: 12, matched: 10, control: 0.4, says: 'On 10 of 12 real questions the local model landed where the agent of the day landed, and not merely in the same project.' };
  setRoomLanguage('es');
  assert.match(saysFor(stored), /En 10 de 12 preguntas reales/);
  setRoomLanguage('en');
  assert.equal(saysFor(stored), stored.says, 'the English is rebuilt exactly as it was written');

  // Without a control the sentence does not claim one.
  assert.ok(!saysFor({ ...stored, control: null }).includes('not merely'));
  // A reading that never ran, or one from before this existed, keeps whatever it has.
  assert.equal(saysFor({ id: 'match', ran: false, says: 'x' }), 'x');
  assert.equal(saysFor({ id: 'coverage', ran: true, says: 'older than this' }), 'older than this');
});
