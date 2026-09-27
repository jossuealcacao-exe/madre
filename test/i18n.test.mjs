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

test('i18n: a sentence is translated once, so the second translation cannot win in silence', async () => {
  // A duplicate key is legal JavaScript: the later one quietly wins and the earlier one becomes a
  // translation nobody reads. In a catalogue of well over a thousand lines that is how a sentence
  // ends up with two Spanishes and a change lands in the one that is dead. The object cannot be
  // asked — by the time it is built the loser is gone — so the file is read as text.
  const src = await read('es.js');
  const seen = new Map();
  const twice = [];
  for (const match of src.matchAll(/^ {2}('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*:/gm)) {
    const line = src.slice(0, match.index).split('\n').length;
    if (seen.has(match[1])) twice.push(`${match[1].slice(0, 50)} on lines ${seen.get(match[1])} and ${line}`);
    else seen.set(match[1], line);
  }
  assert.ok(seen.size > 500, 'the scan read almost no keys, so it is guarding almost nothing');
  assert.deepEqual(twice, [], 'the Spanish catalogue says the same thing twice');
});

test('i18n: the catalogue says nothing the product does not say', async () => {
  // Both ways round, because both are rot: a key the code no longer uses is a translation of a
  // sentence nobody reads, and a `t()` the catalogue does not have is a screen in the wrong
  // language. The second is not fatal — it falls back — which is exactly why it needs a test.
  // Everything that speaks: the page, the console inside the core, and the server text that
  // reaches a screen — a module saying what it is, a reading saying what it means. One
  // catalogue for both sides of the wire, so a sentence is never translated twice.
  const files = [join(import.meta.dirname, '..', 'public', 'app.js'), join(import.meta.dirname, '..', 'public', 'inquiry.js'), join(import.meta.dirname, '..', 'public', 'index.html'), join(import.meta.dirname, '..', 'public', 'troubleshooting.js')];
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
  // A condition's fix comments are data, and some are composed at load time from a helper rather
  // than written out — `envExport` builds the same line for each variable it is given. Those are
  // said by the product even though the literal never appears in a file, so the scan asks the
  // conditions themselves as well as the source.
  const { CONDITIONS: ALL } = await import('../public/troubleshooting.js');
  const fromData = new Set(ALL.flatMap((condition) => ['darwin', 'linux'].flatMap((os) => condition.fixes?.[os] ?? [])).map((line) => line.trim()));
  for (const key of Object.keys(ES)) {
    const escaped = key.replace(/'/g, "\\'");
    assert.ok(app.includes(key) || app.includes(escaped) || fromData.has(key), `the catalogue translates "${key.slice(0, 60)}…", which the page no longer says`);
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

test('i18n: every word the markup shows is one the catalogue knows', async () => {
  // The page walks its own markup through the catalogue, so a sentence in index.html that has no
  // entry is a sentence that stays English on a Spanish screen. This is the list of what is
  // allowed to: names of the ship and the product, commands somebody types, and the one label
  // that is the same word in both languages.
  const html = await read('index.html');
  const NOT_TRANSLATED = new Set([
    'MADRE', 'MU/TH/UR', 'MU/TH/UR 6000', 'NOSTROMO', '◉ NOSTROMO', 'CREATE', 'ash', 'EN', 'AIRLOCK',
    'madre doctor', 'MADRE · by Jossué Alcalá', 'MADRE · jossuealcala.com',
    'ARCHIVIST', 'Agent', 'Send', 'MEMORY RESEARCH · LOADING…', 'FORGET THIS MEMORY', 'DESIGNATION ›',
    'HUMAN ›', 'THE CORE', 'MODULES', 'FILES', 'CONVERSATIONS', 'NEW CONVERSATION', 'connecting',
    'I AM ALIVE.', "NOBODY DELETES MOTHER'S MEMORY.", 'YOU HAVE NO AUTHORITY FOR THIS DIRECTIVE.',
  ]);
  const seen = new Set();
  const found = [];
  for (const match of html.matchAll(/>([^<>{}]{2,300})</g)) {
    const text = match[1].replace(/\s+/g, ' ').trim();
    if (/[A-Za-z]{2}/.test(text) && !seen.has(text)) { seen.add(text); found.push(text); }
  }
  for (const match of html.matchAll(/(?:title|placeholder|aria-label)="([^"]{3,300})"/g)) {
    const text = match[1].trim();
    if (!seen.has(text)) { seen.add(text); found.push(text); }
  }
  assert.ok(found.length > 80, 'the markup scan found almost nothing, so it is guarding almost nothing');
  for (const text of found) {
    assert.ok(Object.hasOwn(ES, text) || NOT_TRANSLATED.has(text), `index.html shows "${text.slice(0, 60)}…" and nothing translates it`);
  }
});

test("i18n: every condition MU/TH/UR holds reads in the room's language", async () => {
  const { CONDITIONS, allConditions, diagnose } = await import('../public/troubleshooting.js');
  const { setLanguage: setPage } = await import('../public/i18n.js');

  // All 51, in all three of the fields a person reads. What MATCHES a failure is not one of
  // them: those patterns are tested against what a CLI printed, and a CLI prints English.
  // The 51 in troubleshooting.js, and the ones each module declares in its own file. Those lived
  // outside this guard and so outside the catalogue: PLAYWRIGHT explained itself in English
  // inside a room that was otherwise wholly Spanish, and nothing could tell.
  const { readdir: readModules, readFile: readModule } = await import('node:fs/promises');
  const moduleDir = join(import.meta.dirname, '..', 'src', 'modules');
  const fromModules = [];
  for (const name of await readModules(moduleDir)) {
    if (!name.endsWith('.mjs')) continue;
    const source = await readModule(join(moduleDir, name), 'utf8');
    for (const field of ['title', 'diagnosis', 'remedy']) {
      for (const match of source.matchAll(new RegExp(String.raw`\n\s{4}${field}: '((?:[^'\\]|\\.)*)'`, 'g'))) {
        fromModules.push([`${name}.${field}`, match[1].replace(/\\(['\\])/g, '$1')]);
      }
    }
  }
  assert.ok(fromModules.length > 0, 'no module condition was read, so this half guards nothing');
  for (const [where, text] of fromModules) assert.ok(Object.hasOwn(ES, text), `${where} is not in the Spanish catalogue`);

  for (const condition of CONDITIONS) {
    for (const field of ['title', 'diagnosis', 'remedy']) {
      assert.ok(Object.hasOwn(ES, condition[field]), `${condition.id}.${field} is not in the Spanish catalogue`);
    }
    // The prose inside the commands. A `#` line is not a command: it explains one, and most of
    // them name buttons — which this room calls something else. The commands themselves are
    // never translated and are not checked here.
    for (const os of ['darwin', 'linux']) {
      for (const line of condition.fixes?.[os] ?? []) {
        if (!line.trim().startsWith('#')) continue;
        assert.ok(Object.hasOwn(ES, line.trim()), `${condition.id} explains a fix in English: "${line.trim().slice(0, 50)}…"`);
      }
    }
  }
  setPage('es');
  const said = allConditions();
  assert.equal(said.length, CONDITIONS.length);
  assert.match(said.find((one) => one.id === 'not-installed').title, /no está en esta computadora/i);
  // The patterns come through untouched, so a failure is still recognised by what it printed.
  for (const [at, condition] of said.entries()) assert.equal(condition.match, CONDITIONS[at].match);
  assert.equal(diagnose('is not installed on this computer').some((one) => one.id === 'not-installed'), true);
  // And the commands are commands: they are not translated, in either language.
  assert.deepEqual(said.find((one) => one.id === 'node-version').fixes, CONDITIONS.find((one) => one.id === 'node-version').fixes);
  setPage('en');
  assert.match(allConditions().find((one) => one.id === 'not-installed').title, /not found on this computer/);
  setPage('es');
});

test('i18n: a failure recorded in another language is read in this one', async () => {
  const { resay } = await import('../public/resay.js');

  // The ledger keeps the sentence MADRE wrote at the time; the screen says it again, now.
  const old = "PULSE exhausted: @claude has used 99% of its local room token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth) and another turn like the last one would reach 103%. Continue with @codex or @gemini.";
  const said = resay(old, { when: 'es' });
  assert.match(said, /^MADRE agotada: @claude lleva 99% de su presupuesto local/);
  assert.match(said, /otro turno como el anterior llegaría a 103%/);
  assert.match(said, /Sigue con @codex o @gemini\./, 'the joiner between agents stayed English');
  assert.match(resay('Gemini was interrupted: STOPALL by the human.', { when: 'es' }), /Gemini se interrumpió: STOPALL por la humana\./);

  // What a CLI printed is not MADRE's to translate: a person may need to search for it word for
  // word, and it was never MADRE's sentence.
  for (const theirs of [
    'API Error: 500 Internal server error. This is a server-side issue, usually temporary.',
    "ENOTEMPTY: directory not empty, rmdir '/var/folders/ph/x/T/pulse-gemini-cR9NW2/.gemini'",
    'TypeError: Cannot read properties of undefined (reading \'fixes\')',
  ]) assert.equal(resay(theirs, { when: 'es' }), theirs);

  // And in English nothing is re-said at all.
  assert.equal(resay(old, { when: 'en' }), old);
});

test('i18n: the page is told the language the room SPEAKS, not the one written in the file', async () => {
  // The environment wins over the config everywhere in this product. It did at boot and it did
  // when the switch was pressed, but /api/state read the file again and handed the page the other
  // answer — so `PULSE_LANGUAGE=en` gave a server talking English inside an interface in Spanish.
  // A split room is worse than either language, and only a real boot catches it: the bug was one
  // expression re-deriving what was already decided.
  const { createPulseServer } = await import('../src/server.mjs');
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join: joinPath } = await import('node:path');

  const root = await mkdtemp(joinPath(tmpdir(), 'madre-lang-'));
  const project = await mkdtemp(joinPath(tmpdir(), 'madre-lang-project-'));
  try {
    // The file says Spanish. The environment — which the suite sets to English — says otherwise.
    await writeFile(joinPath(root, 'config.json'), JSON.stringify({ language: 'es' }));
    assert.equal(process.env.PULSE_LANGUAGE, 'en', 'this test is only meaningful while the two disagree');

    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: '1.0.0' }];
    const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents, detect: async () => agents, probe: async () => ({ codex: { state: 'signed-in', detail: 'ok' } }) });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const state = await fetch(`http://127.0.0.1:${server.address().port}/api/state`).then((response) => response.json());
      assert.equal(state.language, 'en', 'the page was handed the file instead of the language the room is speaking');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});

test('i18n: an id that is also a word on the screen goes through the catalogue', async () => {
  // Three defects of one shape got through: a memory's kind, a limit warning's level and a
  // condition's severity were each printed raw — `decision`, `warning`, `blocking` — inside a room
  // that was otherwise wholly in Spanish. The catalogue guard is blind to them by construction:
  // they never pass through t(), so there is no key to be missing. This is the guard for the shape.
  const app = await read('app.js');
  const bare = [];
  const FIELDS = 'kind|type|state|status|level|origin|verdict|severity|role|stage';
  for (const match of app.matchAll(new RegExp(String.raw`el\('[a-z]+',\s*[^,)]+,\s*([\w.?]+\.(?:${FIELDS}))\s*\)`, 'g'))) bare.push(match[1]);
  for (const match of app.matchAll(new RegExp(String.raw`textContent\s*=\s*([\w.?]+\.(?:${FIELDS}))\s*;`, 'g'))) bare.push(match[1]);
  assert.deepEqual(bare, [], 'an id is being written on the screen as if it were a word; give it a declared word, the way KIND_WORDS, LEVEL_WORDS and SEVERITY_WORDS do');

  // And those three maps stay declared one entry at a time, so the catalogue's own guard can see
  // every word in them. Computing the key — t(kind.toUpperCase()) — hides it from both guards.
  for (const name of ['KIND_WORDS', 'LEVEL_WORDS', 'SEVERITY_WORDS']) {
    const declaration = app.slice(app.indexOf(`const ${name} = `), app.indexOf('\n', app.indexOf(`const ${name} = `)));
    assert.ok(declaration.length > 40, `${name} is gone; the words it held are loose again`);
    assert.ok(!/toUpperCase\(\)|toLowerCase\(\)/.test(declaration), `${name} computes its keys, so no guard can see the words in it`);
  }
});

test('every condition carries a support code, and a code means one thing forever', async () => {
  const { CONDITIONS } = await import('../public/troubleshooting.js');
  const { readdir: readModules, readFile: readModule } = await import('node:fs/promises');

  // A code is what a person reads out loud when they ask for help, so it has to exist on every
  // condition and never move. It lives on the condition itself rather than being its position in
  // the array: inserting one in the middle must not renumber the ones after it.
  const codes = [];
  for (const condition of CONDITIONS) {
    assert.match(condition.code ?? '', /^MU-\d{3}$/, `${condition.id} has no support code`);
    codes.push(condition.code);
  }
  const moduleDir = join(import.meta.dirname, '..', 'src', 'modules');
  for (const name of await readModules(moduleDir)) {
    if (!name.endsWith('.mjs')) continue;
    const source = await readModule(join(moduleDir, name), 'utf8');
    for (const match of source.matchAll(/\n\s{4}code: '(MU-\d{3})',/g)) codes.push(match[1]);
    // A module that declares a condition declares its code with it.
    const declared = [...source.matchAll(/\n\s{4}severity: '[a-z]+',/g)].length;
    const stamped = [...source.matchAll(/\n\s{4}code: 'MU-\d{3}',/g)].length;
    assert.equal(stamped, declared, `${name} declares a condition without a support code`);
  }
  assert.equal(new Set(codes).size, codes.length, 'two conditions answer to the same code');
  assert.ok(codes.length >= 53, 'the scan found fewer conditions than this room holds');
});

test('a remedy this room can carry out points at its button, not at a terminal', async () => {
  const { CONDITIONS } = await import('../public/troubleshooting.js');
  const app = await read('app.js');

  // Signing an agent in, installing one, turning a scope on: MADRE already does all three from
  // CONNECTIONS. A condition whose fix is one of those used to hand out a line to paste instead,
  // which sends someone to a terminal for something this room does with a click.
  const wired = CONDITIONS.filter((condition) => condition.solvedIn === 'connections');
  assert.ok(wired.length >= 8, 'the remedies that live in CONNECTIONS stopped declaring it');
  for (const condition of wired) {
    assert.match(condition.code, /^MU-\d{3}$/);
    assert.ok((condition.fixes?.darwin ?? []).length, `${condition.id} offers the button and nothing underneath it`);
  }

  // The button reaches the agent it is about, so the panel opens where the problem is.
  assert.match(app, /card\.id = `conn-\$\{agent\.id\}`;/, 'an agent card has no anchor, so the shortcut cannot land on it');
  assert.match(app, /if \(condition\.solvedIn === 'connections'\) card\.append\(connectionsShortcut/);
  // And the commands stay: another machine, another shell, someone who prefers typing.
  assert.match(app, /connectionsShortcut\(condition, chosen\)\);\n  card\.append\(commandBlock/, 'the commands were replaced instead of being kept under the button');
});
