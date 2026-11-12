import test from 'node:test';
import assert from 'node:assert/strict';
import { readFolder, startersFor } from '../public/starters.js';
import { ICONS } from '../public/icons.js';

// THE FIRST MESSAGES OF AN EMPTY CHAT (2026-11-10): written for this project and this person.
const files = (...names) => names.map((name) => (name.endsWith('/') ? { name: name.slice(0, -1), kind: 'dir' } : { name, kind: 'file' }));
const texts = (chips) => chips.map((chip) => chip.text);

test('starters: what the folder holds decides them, and they name its own files', () => {
  const store = startersFor({ entries: files('ventas-octubre.xlsx', 'catalogo.pdf', 'README.md', '.git/'), project: 'mi-tienda' });
  assert.equal(store.length, 3);
  assert.match(store[0].text, /ventas-octubre\.xlsx/, 'the spreadsheet comes first, by name');
  assert.match(store[1].text, /catalogo\.pdf/, 'then the document');
  assert.ok(!texts(store).some((text) => /README/.test(text)), 'paperwork says nothing of the project');

  const theme = startersFor({ entries: files('layout/', 'templates/', 'sections/', 'assets/'), project: 'tienda-shopify' });
  assert.match(theme[0].text, /main page of tienda-shopify/);

  const code = startersFor({ entries: files('package.json', 'src/', 'README.md'), project: 'api' });
  assert.match(code[0].text, /someone who does not program/, 'code is explained without assuming a programmer');
  assert.equal(code.length, 3);

  const unknown = startersFor({ entries: files('cosas/', 'otra-carpeta/'), project: 'archivo' });
  assert.match(unknown[0].text, /What is in archivo/);
});

test('starters: a folder with nothing yet follows what the person said MADRE is for', () => {
  const business = startersFor({ entries: files('.git/'), profile: ['business', 'numbers'] });
  assert.match(business[0].text, /^Make me a simple page for my business/);
  // A born folder's chips are whole messages (2026-11-11): each can be sent as it is, none waits to be finished.
  for (const profile of [['business'], ['social'], ['office'], ['study'], ['notes'], ['code'], []]) {
    for (const chip of startersFor({ entries: [], profile })) assert.equal(chip.open, false, chip.text);
  }
  assert.match(business[1].text, /sales and expenses/);
  const nobody = startersFor({ entries: [], profile: [] });
  assert.equal(nobody.length, 3);
  assert.equal(new Set(texts(nobody)).size, 3, 'never the same chip twice');
});

test('starters: every chip has a drawing that exists, and the words go through the room\'s language', () => {
  const said = [];
  const t = (words, values = {}) => { said.push(words); return words.replace(/\{(\w+)\}/g, (_, key) => values[key]); };
  for (const entries of [files('a.csv'), files('a.docx'), files('a.key'), files('index.html'), files('a.png'), files('main.py'), files('x/'), []]) {
    for (const profile of [[], ['business'], ['numbers'], ['notes'], ['code'], ['curious']]) {
      for (const chip of startersFor({ entries, profile, project: 'p', t })) assert.ok(ICONS[chip.icon], chip.icon);
    }
  }
  assert.ok(said.length > 0);
  assert.deepEqual(readFolder(files('a.CSV', 'Notas.MD', 'logo.PNG')).sheets, ['a.CSV']);
});
