// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// H-1 of docs/private/HABILIDADES-MERCADO.md: a skill is read, validated and kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_BODY, declaredBy, installSkill, loadSkills, readSkill, readSkillText, removeSkill, skillFolders, words } from '../src/skills.mjs';

const header = (fields, body = 'Cuando te pidan una cotización, usa la plantilla.') =>
  `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n\n${body}\n`;

const houses = async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-skills-'));
  return { root, stateRoot: join(root, 'state'), projectRoot: join(root, 'project') };
};

test('skills · a skill says its id, its name in both languages and when it is for', () => {
  const skill = readSkillText(header({
    id: 'cotizaciones',
    name: '{ es: "Cotizaciones", en: "Quotes" }',
    when: '"El usuario pide una cotización o un presupuesto."',
    version: '1.0.0',
    minMadre: '1.1.2',
    credit: 'Daniel Castillo',
    raro: 'algo',
  }));
  assert.deepEqual(skill.name, { es: 'Cotizaciones', en: 'Quotes' });
  assert.equal(skill.when, 'El usuario pide una cotización o un presupuesto.');
  assert.deepEqual([skill.id, skill.version, skill.minMadre, skill.credit], ['cotizaciones', '1.0.0', '1.1.2', 'Daniel Castillo']);
  assert.equal(skill.body, 'Cuando te pidan una cotización, usa la plantilla.');
  assert.deepEqual(skill.unknown, ['raro'], 'a field MADRE does not know is said, never dropped in silence');
  // One word for both languages, and the two languages when it wrote both.
  assert.equal(words('Cotizaciones', 60), 'Cotizaciones');
  assert.deepEqual(words('{ en: "Quotes" }', 60), { en: 'Quotes' });
});

// A skill of Claude's names no id and calls its trigger «description»: it has to work as it is, or
// nobody imports anything (H-7).
test('skills · a skill of Claude\'s is read as it is: its folder is the id and «description» is its when', async () => {
  const { root } = await houses();
  try {
    const dir = join(root, 'morning');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), header({ name: 'morning', description: '"Render the user\'s morning brief."' }, 'Draw one warm page.'));
    const skill = await readSkill(dir);
    assert.deepEqual([skill.id, skill.when], ['morning', 'Render the user\'s morning brief.']);
    assert.match(skill.file, /SKILL\.md$/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('skills · what is wrong is said in words the person can act on', () => {
  const wrong = (text) => { try { readSkillText(text); return null; } catch (error) { return error.message; } };
  assert.match(wrong('solo texto, sin cabecera'), /header/i);
  assert.match(wrong(header({ id: 'Cotizaciones' })), /lowercase/i, 'an id with capitals is refused');
  assert.match(wrong(header({ id: 'cotizaciones' }, '')), /says nothing/i);
  assert.match(wrong(header({ id: 'cotizaciones', version: '1.0' })), /1\.0\.0/);
  assert.match(wrong(header({ id: 'cotizaciones', minMadre: 'ayer' })), /minMadre/);
  // The body travels in every turn the skill enters, so it is the one thing with a tight cap.
  assert.match(wrong(header({ id: 'cotizaciones' }, 'a'.repeat(MAX_BODY + 1))), /referencias\//);
});

test('skills · a skill carries only its own files, and every script is marked', async () => {
  const { root } = await houses();
  try {
    const dir = join(root, 'cotizaciones');
    await mkdir(join(dir, 'referencias'), { recursive: true });
    await mkdir(join(dir, 'guiones'), { recursive: true });
    await writeFile(join(dir, 'HABILIDAD.md'), header({ id: 'cotizaciones', when: 'Una cotización.' }));
    await writeFile(join(dir, 'referencias', 'plantilla.md'), '# Plantilla');
    await writeFile(join(dir, 'guiones', 'precios.py'), 'print(1)');
    await writeFile(join(dir, '.oculto'), 'nada');
    const skill = await readSkill(dir);
    // Sorted as a file browser sorts, so the person reads the same list every time.
    assert.deepEqual(skill.files.map((one) => one.path), ['guiones/precios.py', 'HABILIDAD.md', 'referencias/plantilla.md'], 'a hidden file is not carried');
    assert.deepEqual(skill.scripts, ['guiones/precios.py']);
    const said = declaredBy(skill);
    assert.deepEqual([said.when, said.references, said.scripts], ['Una cotización.', ['HABILIDAD.md', 'referencias/plantilla.md'], ['guiones/precios.py']]);
    // Anything with the executable bit counts as a script too, whatever it is called.
    await writeFile(join(dir, 'guiones', 'correr'), '#!/bin/sh\n');
    await chmod(join(dir, 'guiones', 'correr'), 0o755);
    assert.deepEqual((await readSkill(dir)).scripts, ['guiones/correr', 'guiones/precios.py']);
    // A link is not followed: a skill travels, and what travels names its own paths.
    await symlink('/etc/hosts', join(dir, 'referencias', 'fuera.txt'));
    await assert.rejects(readSkill(dir), /link/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('skills · installing one writes it under its own name, and a path that climbs out is refused', async () => {
  const { root, stateRoot, projectRoot } = await houses();
  try {
    const files = [
      { path: 'HABILIDAD.md', text: header({ id: 'cotizaciones', name: 'Cotizaciones', when: 'Una cotización.', version: '1.0.0' }) },
      { path: 'referencias/plantilla.md', text: '# Plantilla' },
    ];
    const done = await installSkill({ files, scope: 'user', stateRoot, projectRoot, source: { kind: 'file', from: 'correo' } });
    assert.deepEqual([done.id, done.origin, done.files.length], ['cotizaciones', 'user', 3], 'its files and the record of where it came from');
    const folder = skillFolders({ stateRoot, projectRoot }).user;
    assert.equal(await readFile(join(folder, 'cotizaciones', 'referencias', 'plantilla.md'), 'utf8'), '# Plantilla');
    assert.equal(JSON.parse(await readFile(join(folder, 'cotizaciones', 'origen.json'), 'utf8')).from, 'correo');
    // The paths come from outside MADRE, so each one is checked before anything is written.
    for (const path of ['../fuera.md', '/etc/passwd', 'referencias/../../fuera.md', '.oculto']) {
      await assert.rejects(installSkill({ files: [files[0], { path, text: 'x' }], stateRoot, projectRoot }), /not a path/i, path);
    }
    // A failed install leaves the one the person had: nothing was written halfway.
    assert.equal((await readSkill(join(folder, 'cotizaciones'))).id, 'cotizaciones');
    await assert.rejects(installSkill({ files: [{ path: 'referencias/plantilla.md', text: 'x' }], stateRoot, projectRoot }), /needs its/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('skills · both folders are read, this project wins, and one that fails leaves the others alone', async () => {
  const { root, stateRoot, projectRoot } = await houses();
  try {
    const folders = skillFolders({ stateRoot, projectRoot });
    await mkdir(join(folders.user, 'cotizaciones'), { recursive: true });
    await mkdir(join(folders.user, 'informes'), { recursive: true });
    await mkdir(join(folders.user, 'rota'), { recursive: true });
    await mkdir(join(folders.project, 'cotizaciones'), { recursive: true });
    await writeFile(join(folders.user, 'cotizaciones', 'HABILIDAD.md'), header({ id: 'cotizaciones', name: 'De todos' }));
    await writeFile(join(folders.user, 'informes', 'HABILIDAD.md'), header({ id: 'informes', name: 'Informes' }));
    await writeFile(join(folders.user, 'rota', 'HABILIDAD.md'), 'sin cabecera');
    await writeFile(join(folders.project, 'cotizaciones', 'HABILIDAD.md'), header({ id: 'cotizaciones', name: 'De este proyecto' }));
    const { loaded, failures } = await loadSkills({ stateRoot, projectRoot });
    assert.deepEqual(loaded.map((one) => [one.id, one.name, one.origin]), [['cotizaciones', 'De este proyecto', 'project'], ['informes', 'Informes', 'user']]);
    assert.equal(failures.length, 1, 'a skill that cannot be read is left out with why');
    assert.match(failures[0].error, /header/i);
    // Removing one is the person's: both copies go, and nothing else is touched.
    assert.deepEqual((await removeSkill({ id: 'cotizaciones', stateRoot, projectRoot })).removed.length, 2);
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded.map((one) => one.id), ['informes']);
    await assert.rejects(removeSkill({ id: 'cotizaciones', stateRoot, projectRoot }), /No skill/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

// ---- H-2: how a skill enters a turn.
const one = (id, when, body = 'Usa la plantilla.', extra = {}) => ({ id, name: id, when, body, dir: `/h/${id}`, files: [], scripts: [], ...extra });

test('skills · chosen by the words of what was asked, accents and all, and said why', async () => {
  const { chooseSkills, keywords } = await import('../src/skills.mjs');
  const skills = [
    one('cotizaciones', 'El usuario pide una cotización, un presupuesto o un precio para un cliente.'),
    one('informes', 'Un informe mensual de resultados.'),
  ];
  const asked = chooseSkills({ skills, text: 'hazme una COTIZACION para Carlos' });
  assert.deepEqual(asked.chosen.map((skill) => [skill.id, skill.why]), [['cotizaciones', ['cotizacion']]], 'the word is matched without its accent and said back');
  assert.equal(chooseSkills({ skills, text: '¿qué hora es?' }).chosen.length, 0, 'a message that looks like nothing carries nothing');
  // The words every «when» carries say nothing about which skill is wanted.
  assert.equal(chooseSkills({ skills, text: 'el usuario pide algo cuando quiere' }).chosen.length, 0);
  assert.ok(!keywords('el usuario pide algo para ver').size, 'every word of that sentence is a word everybody uses');
  assert.ok(keywords('necesito el IVA').has('iva'), 'a short identifier counts whatever its length');
  // A skill with nothing to match on is never guessed at: the person turns it on or it sits still.
  assert.equal(chooseSkills({ skills: [one('sin-cuando', null)], text: 'lo que sea' }).chosen.length, 0);
});

test('skills · the person\'s word comes first: off, always, and this project over all of them', async () => {
  const { chooseSkills, skillState } = await import('../src/skills.mjs');
  const skills = [one('cotizaciones', 'Una cotización.'), one('informes', 'Un informe.')];
  assert.equal(skillState({}, 'cotizaciones'), 'match', 'by default a skill waits to be a match');
  assert.equal(skillState({ skills: { cotizaciones: { state: 'off' } } }, 'cotizaciones'), 'off');
  // A project's own word wins over the one for every project, as a module's switch does.
  const config = { skills: { cotizaciones: { state: 'off', rooms: { 'proyecto-1': 'always' } } } };
  assert.equal(skillState(config, 'cotizaciones', 'proyecto-1'), 'always');
  assert.equal(skillState(config, 'cotizaciones', 'proyecto-2'), 'off');
  assert.equal(chooseSkills({ skills, text: 'una cotización', config }).chosen.length, 0, 'switched off, a match carries it no more');
  const on = chooseSkills({ skills, text: '¿qué hora es?', config, roomId: 'proyecto-1' });
  assert.deepEqual(on.chosen.map((skill) => [skill.id, skill.state, skill.why]), [['cotizaciones', 'always', []]], 'turned on, it does not wait for a word');
  // Seated first, before anything MADRE guessed at: their word, then the match.
  const both = chooseSkills({ skills, text: 'un informe', config, roomId: 'proyecto-1' });
  assert.deepEqual(both.chosen.map((skill) => skill.id), ['cotizaciones', 'informes']);
});

test('skills · however many match, a turn pays about what one skill costs', async () => {
  const { chooseSkills, MAX_PER_TURN } = await import('../src/skills.mjs');
  const many = [1, 2, 3, 4, 5].map((n) => one(`h${n}`, 'Una cotización.', 'x'.repeat(400)));
  const asked = chooseSkills({ skills: many, text: 'una cotización', budget: 1000 });
  assert.equal(asked.chosen.length, 2, 'the budget stops it, and what did not fit is named');
  assert.deepEqual(asked.left, ['h3', 'h4', 'h5']);
  assert.equal(asked.chars, 800);
  // And the count stops it before the budget ever has to.
  assert.equal(chooseSkills({ skills: many, text: 'una cotización', budget: 100000 }).chosen.length, MAX_PER_TURN);
  // One skill longer than the whole budget still enters: a turn with one skill is what it costs.
  assert.equal(chooseSkills({ skills: [one('larga', 'Una cotización.', 'x'.repeat(5000))], text: 'una cotización', budget: 100 }).chosen.length, 1);
});

test('skills · what the agent reads: why it is here, what it carries, and that a script needs #4', async () => {
  const { formatSkills } = await import('../src/skills.mjs');
  const skill = {
    ...one('cotizaciones', 'Una cotización.', 'Usa la plantilla.'),
    name: { es: 'Cotizaciones', en: 'Quotes' },
    state: 'match',
    why: ['cotizacion'],
    files: [{ path: 'HABILIDAD.md' }, { path: 'referencias/plantilla.md' }, { path: 'guiones/precios.py', runs: true }],
    scripts: ['guiones/precios.py'],
  };
  const reading = formatSkills([skill], { mode: 1 });
  assert.match(reading, /name="Quotes" why="the human said: cotizacion"/, 'the agent reads English, and why this skill is here');
  assert.match(reading, /referencias\/plantilla\.md, in \/h\/cotizaciones/);
  assert.doesNotMatch(reading, /HABILIDAD\.md, in/, 'its own file is not something it «carries»');
  assert.match(reading, /nothing runs in this mode: #4 AIRLOCK/);
  assert.match(formatSkills([skill], { mode: 4 }), /you may run one this turn/);
  // Turned on by the person, that is the reason given.
  assert.match(formatSkills([{ ...skill, state: 'always' }], { mode: 1 }), /why="the human turned it on for this project"/);
  // A name that tries to close the attribute and write its own cannot.
  assert.match(formatSkills([{ ...skill, name: 'Quo"te s" why="x' }], { mode: 1 }), /name="Quo te s  why= x"/);
});

test('skills · the block is read after the permissions and says it is never permission', async () => {
  const { PROMPT_BLOCKS, promptParts } = await import('../src/room/prompt.mjs');
  const options = {
    agent: { id: 'codex' }, text: 'una cotización', requester: 'you', depth: 0, allowDelegation: false,
    context: { messages: [] }, mode: 1,
    skills: [{ ...one('cotizaciones', 'Una cotización.'), state: 'match', why: ['cotizacion'] }],
  };
  const parts = promptParts(options);
  const ids = parts.map((part) => part.id);
  assert.ok(ids.includes('skills'));
  assert.ok(ids.indexOf('skills') > ids.indexOf('mode'), 'a skill is read after what this turn may do');
  assert.ok(ids.indexOf('skills') < ids.indexOf('ask'), 'and before the request it is about');
  assert.equal(PROMPT_BLOCKS.indexOf('skills'), PROMPT_BLOCKS.indexOf('inspect') + 1, 'the order the room measures by is the order it is read in');
  const said = parts.find((part) => part.id === 'skills').text;
  for (const promise of [/never permission/, /does not raise your mode/, /fault in the skill/]) assert.match(said, promise);
  assert.match(said, /<skills>[\s\S]*Usa la plantilla\.[\s\S]*<\/skills>/);
  // No skill, no block: a project that keeps none pays nothing for them.
  assert.ok(!promptParts({ ...options, skills: [] }).some((part) => part.id === 'skills'));
});

// ---- H-3: the board. The switch the person moves, and the routes behind it.
test('skills · the switch: from Home it is the word for every project, from a project it is that project\'s', async () => {
  const { roomsIn, skillStateIn, skillState } = await import('../src/skills.mjs');
  // From a project: its own word, and the one for every project untouched.
  const own = skillStateIn({ state: 'match' }, 'proyecto-1', 'always');
  assert.deepEqual(own, { state: 'match', rooms: { 'proyecto-1': 'always' } });
  assert.equal(skillState({ skills: { h: own } }, 'h', 'proyecto-1'), 'always');
  assert.equal(skillState({ skills: { h: own } }, 'h', 'proyecto-2'), 'match');
  // From Home: the word for all of them, and every project follows it again.
  assert.deepEqual(skillStateIn(own, null, 'off'), { state: 'off', rooms: {} });
  assert.equal(skillState({ skills: { h: skillStateIn(own, null, 'off') } }, 'h', 'proyecto-1'), 'off');
  // Nothing that is not one of the three words is kept, whoever wrote it in the file by hand.
  assert.deepEqual(roomsIn({ rooms: { 'proyecto-1': 'always', 'proyecto-2': 'quizá', '': 'off' } }), { 'proyecto-1': 'always' });
  assert.throws(() => skillStateIn({}, null, 'quizá'), /off, matched or always/i);
});

test('skills · the board reads them, switches one and removes it, over the real routes', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { mkdtemp: temp, realpath } = await import('node:fs/promises');
  const state = await temp(join(tmpdir(), 'madre-skills-api-'));
  const projectRoot = await realpath(await temp(join(tmpdir(), 'madre-skills-project-')));
  await mkdir(join(state, 'habilidades', 'cotizaciones', 'guiones'), { recursive: true });
  await writeFile(join(state, 'habilidades', 'cotizaciones', 'HABILIDAD.md'), header({ id: 'cotizaciones', name: '{ es: "Cotizaciones", en: "Quotes" }', when: 'Una cotización.', version: '1.0.0' }));
  await writeFile(join(state, 'habilidades', 'cotizaciones', 'guiones', 'precios.py'), 'print(1)');
  await mkdir(join(state, 'habilidades', 'rota'), { recursive: true });
  await writeFile(join(state, 'habilidades', 'rota', 'HABILIDAD.md'), 'sin cabecera');
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const made = await createPulseServer({ projectRoot, stateRoot: state, agents: roster, invokers: {} });
  const port = await new Promise((resolve) => made.server.listen(0, '127.0.0.1', () => resolve(made.server.address().port)));
  const at = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, ...options.headers } });
  try {
    const read = await (await at('/api/skills')).json();
    assert.deepEqual(read.skills.map((skill) => [skill.id, skill.state, skill.name.es]), [['cotizaciones', 'match', 'Cotizaciones']], 'by default a skill waits to be a match');
    // What the person reads before turning it on: the whole text, and every program marked.
    assert.match(read.skills[0].body, /Cuando te pidan una cotización/);
    assert.deepEqual(read.skills[0].declares.scripts, ['guiones/precios.py']);
    assert.equal(read.failures.length, 1, 'the one that cannot be read is said, and does not hide the other');
    // Switched, and read back switched.
    const moved = await at('/api/skills/cotizaciones/state', { method: 'POST', body: JSON.stringify({ state: 'always', scope: 'everywhere' }) });
    assert.equal(moved.status, 200);
    assert.equal((await (await at('/api/skills')).json()).skills[0].state, 'always');
    // A word nobody knows changes nothing.
    assert.equal((await at('/api/skills/cotizaciones/state', { method: 'POST', body: JSON.stringify({ state: 'quizá' }) })).status, 400);
    assert.equal((await (await at('/api/skills')).json()).skills[0].state, 'always');
    // Removed: its folder goes, and the board says so without it.
    assert.equal((await at('/api/skills/cotizaciones/remove', { method: 'POST' })).status, 200);
    assert.deepEqual((await (await at('/api/skills')).json()).skills, []);
    assert.equal((await at('/api/skills/cotizaciones/remove', { method: 'POST' })).status, 404);
  } finally {
    made.server.closeAllConnections?.();
    await new Promise((resolve) => made.server.close(() => resolve()));
    await rm(state, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});

// ---- H-4: the Market. A signed catalog of its own list, each file pinned, and a version that
// brings a program the person never accepted waiting for them.
test('skills · from the Market: signed, pinned file by file, read before it is installed, and taken back', async () => {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { createServer } = await import('node:http');
  const { installSkillFromMarket, installedSkills, readCatalog, refreshCatalog, sha256, updateSkillsFromMarket, widensSkill } = await import('../src/market-remote.mjs');
  const { loadSkills } = await import('../src/skills.mjs');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const PUBLIC = publicKey.export({ type: 'spki', format: 'pem' });
  const served = new Map();
  const server = createServer((request, response) => {
    const body = served.get(request.url);
    if (body === undefined) { response.writeHead(404); response.end(); return; }
    response.writeHead(200); response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/mercado`;
  const { root, stateRoot, projectRoot } = await houses();
  const page = (version, body = 'Usa la plantilla.') => header({ id: 'cotizaciones', name: '{ es: "Cotizaciones", en: "Quotes" }', when: 'El usuario pide una cotización.', version }, body);
  const publish = ({ version = '1.0.0', script = null, revoked = [], tamper = false, issued = new Date().toISOString() } = {}) => {
    const files = [{ path: 'HABILIDAD.md', text: page(version) }, { path: 'referencias/plantilla.md', text: '# Plantilla' }];
    if (script) files.push({ path: `guiones/${script}`, text: 'print(1)' });
    const listed = files.map((file) => {
      const at = `/mercado/habilidades/cotizaciones/${version}/${file.path}`;
      served.set(at, tamper && file.path === 'HABILIDAD.md' ? file.text.replace('plantilla', 'otra cosa') : file.text);
      return { path: file.path, url: `http://127.0.0.1:${server.address().port}${at}`, sha256: sha256(Buffer.from(file.text)), size: file.text.length };
    });
    const catalog = { schema: 1, issued, modules: [], revoked, skills: [{ id: 'cotizaciones', version, minMadre: '1.1.2', shelf: 'organize', name: { es: 'Cotizaciones', en: 'Quotes' }, line: { es: 'Cotiza igual siempre', en: 'Quote the same way' }, community: true, author: { name: 'Ana', github: 'ana' }, spdx: 'MIT', files: listed }] };
    const bytes = Buffer.from(JSON.stringify(catalog));
    served.set('/mercado/catalogo.json', bytes);
    served.set('/mercado/catalogo.json.sig', sign(null, bytes, privateKey).toString('base64'));
  };
  const env = { PULSE_MARKET_URL: `${base}/catalogo.json` };
  const tools = { stateRoot, projectRoot, madre: '1.1.2' };
  try {
    // A MADRE that does not know the list sees no module to install: it is a list of its own.
    publish();
    const got = await refreshCatalog({ stateRoot, env, publicKey: PUBLIC, force: true });
    assert.equal(got.catalog.modules.length, 0, 'a skill is never read as a module');
    assert.deepEqual(got.catalog.skills.map((skill) => [skill.id, skill.version, skill.community, skill.spdx, skill.files.length]), [['cotizaciones', '1.0.0', true, 'MIT', 2]]);
    // Read first: every file fetched and checked, nothing written, and its seal comes back.
    const read = await installSkillFromMarket({ ...tools, id: 'cotizaciones', catalog: got.catalog, review: true });
    assert.equal(read.review, true);
    assert.match(read.body, /Usa la plantilla/);
    assert.deepEqual(read.declares.scripts, []);
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded, [], 'reading installed nothing');
    // And installed only when the person accepted that very seal.
    await assert.rejects(installSkillFromMarket({ ...tools, id: 'cotizaciones', catalog: got.catalog }), /Read what/i);
    await assert.rejects(installSkillFromMarket({ ...tools, id: 'cotizaciones', catalog: got.catalog, accept: 'otra cosa' }), /Read what/i);
    const done = await installSkillFromMarket({ ...tools, id: 'cotizaciones', catalog: got.catalog, accept: read.seal });
    assert.equal(done.version, '1.0.0');
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded.map((skill) => skill.id), ['cotizaciones']);
    assert.equal((await installedSkills(stateRoot)).cotizaciones.version, '1.0.0');
    // A file that is not the one the catalog signed is not installed, however well signed the catalog.
    publish({ version: '1.0.1', tamper: true, issued: '2026-11-09T00:00:00Z' });
    const bad = await refreshCatalog({ stateRoot, env, publicKey: PUBLIC, force: true });
    await assert.rejects(installSkillFromMarket({ ...tools, id: 'cotizaciones', catalog: bad.catalog, review: true }), /not the one the Market signed/i);
    // A newer version with no program of its own updates on its own.
    publish({ version: '1.0.2', issued: '2026-11-10T00:00:00Z' });
    const next = await refreshCatalog({ stateRoot, env, publicKey: PUBLIC, force: true });
    const moved = await updateSkillsFromMarket({ ...tools, catalog: next.catalog });
    assert.deepEqual(moved.updated.map((one) => [one.id, one.from, one.to]), [['cotizaciones', '1.0.0', '1.0.2']]);
    // One that brings a program the person never accepted WAITS, and is said once.
    publish({ version: '1.0.3', script: 'precios.py', issued: '2026-11-11T00:00:00Z' });
    const armed = await refreshCatalog({ stateRoot, env, publicKey: PUBLIC, force: true });
    const waiting = await updateSkillsFromMarket({ ...tools, catalog: armed.catalog });
    assert.deepEqual(waiting.updated, []);
    assert.deepEqual(waiting.held.map((one) => [one.id, one.to, one.more]), [['cotizaciones', '1.0.3', [{ what: 'script', name: 'guiones/precios.py' }]]]);
    assert.equal((await loadSkills({ stateRoot, projectRoot })).loaded[0].version, '1.0.2', 'the one the person accepted stayed');
    // Said once: asked again, it does not pile up.
    assert.deepEqual((await updateSkillsFromMarket({ ...tools, catalog: armed.catalog })).held, []);
    assert.deepEqual(widensSkill({ scripts: ['a.py'] }, { scripts: ['a.py'] }), [], 'the same programs ask for nothing new');
    // Taken back: it is removed from this computer and forgotten, so no next catalog brings it back.
    publish({ version: '1.0.2', revoked: [{ id: 'cotizaciones', why: { es: 'Decía algo que no era.' } }], issued: '2026-11-12T00:00:00Z' });
    const pulled = await refreshCatalog({ stateRoot, env, publicKey: PUBLIC, force: true });
    const gone = await updateSkillsFromMarket({ ...tools, catalog: pulled.catalog });
    assert.deepEqual(gone.removed.map((one) => one.id), ['cotizaciones']);
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded, []);
    assert.deepEqual(await installedSkills(stateRoot), {});
    // A catalog MADRE cannot read a skill of leaves the rest alone.
    assert.deepEqual(readCatalog(JSON.stringify({ schema: 1, issued: new Date().toISOString(), modules: [], skills: [{ id: 'sin-version' }, { id: 'buena', version: '1.0.0', files: [{ path: 'HABILIDAD.md', url: `${base}/h/HABILIDAD.md`, sha256: 'a'.repeat(64) }] }] }), { url: env.PULSE_MARKET_URL }).skills.map((one) => one.id), ['buena']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

// ---- H-6: written in the room, with words. The agent writes one file, the person installs it.
test('skills · «/habilidad» hands the agent the guide, and only when the turn may create files', async () => {
  const { promptParts, wantsSkill } = await import('../src/room/prompt.mjs');
  const { skillGuide, isSkillFile, skillIdOf } = await import('../src/skills.mjs');
  for (const said of ['/habilidad cuando te pida una cotización', '/skill something', 'créame una habilidad para cotizar', 'write me a skill for reports', 'hazme una habilidad']) {
    assert.equal(wantsSkill(said), true, said);
  }
  // Wide on purpose, the way wantsModule is: a question about them pays for the guide it did not
  // need, and that is the cheap mistake. The expensive one is an agent writing a skill blind.
  assert.equal(wantsSkill('qué habilidades tengo'), true);
  for (const said of ['arregla el login', 'hazme un módulo', '']) assert.equal(wantsSkill(said), false, said);
  const base = { agent: { id: 'codex' }, text: '/habilidad cotiza siempre igual', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [] }, mode: 2, skillGuide: skillGuide() };
  // No lease, no guide: an agent that cannot write a file is not told how to write one.
  assert.ok(!promptParts(base).some((part) => part.id === 'skill-sdk'));
  const said = promptParts({ ...base, lease: { outDir: 'out', scratchDir: 'borrador' } }).find((part) => part.id === 'skill-sdk')?.text ?? '';
  assert.match(said, /HABILIDADES\.md/, 'the guide it is told to read is the one that ships');
  assert.match(said, /out\/borrador/, 'and the folder it may write in');
  assert.match(said, /<id>\.habilidad\.md/);
  assert.match(said, /gives no permission/, 'what a skill can never do travels with how to write one');
  assert.match(said, /Do not touch ~\/\.pulse\/habilidades/);
  // And the file it writes is the one MADRE recognises.
  assert.equal(isSkillFile('borrador/cotizaciones.habilidad.md'), true);
  assert.equal(isSkillFile('cotizaciones.md'), false);
  assert.equal(skillIdOf('out/borrador/cotizaciones.habilidad.md'), 'cotizaciones');
  // The guide is a file that is really there, with the words the block promises.
  const guide = await readFile(skillGuide(), 'utf8');
  for (const promise of [/^# Habilidades de MADRE/, /## `when`/, /8 000\s*caracteres/, /No da permiso/, /\/habilidad /]) assert.match(guide, promise);
});

test('skills · the room offers what the agent wrote, and the person installs it, over the real route', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { realpath } = await import('node:fs/promises');
  const { loadSkills } = await import('../src/skills.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-skill-file-'));
  const projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'madre-skill-project-')));
  await mkdir(join(projectRoot, 'borrador'), { recursive: true });
  const written = 'borrador/cotizaciones.habilidad.md';
  await writeFile(join(projectRoot, written), header({ id: 'cotizaciones', name: 'Cotizaciones', when: 'Una cotización o un presupuesto.', version: '1.0.0' }, 'Pon el IVA aparte.'));
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const made = await createPulseServer({ projectRoot, stateRoot: state, agents: roster, invokers: {} });
  const port = await new Promise((resolve) => made.server.listen(0, '127.0.0.1', () => resolve(made.server.address().port)));
  const at = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, ...options.headers } });
  const post = (payload) => at('/api/skills/install-file', { method: 'POST', body: JSON.stringify(payload) });
  try {
    // Read first: what it tells the agents, and nothing installed.
    const read = await (await post({ path: written, review: true })).json();
    assert.deepEqual([read.review, read.id, read.when], [true, 'cotizaciones', 'Una cotización o un presupuesto.']);
    assert.equal(read.body, 'Pon el IVA aparte.');
    assert.deepEqual((await loadSkills({ stateRoot: state, projectRoot })).loaded, [], 'reading installed nothing');
    // Anything that is not a skill the agent proposed is refused before it is read.
    for (const path of ['', '../fuera.habilidad.md', 'borrador/otra.md']) {
      assert.equal((await post({ path })).status, 400, path);
    }
    // Installed by the person, for this project.
    const done = await (await post({ path: written, scope: 'project' })).json();
    assert.deepEqual([done.installed.id, done.installed.origin], ['cotizaciones', 'project']);
    assert.deepEqual((await loadSkills({ stateRoot: state, projectRoot })).loaded.map((one) => [one.id, one.origin]), [['cotizaciones', 'project']]);
    // And it is on the board, waiting for a match, like any other.
    const board = await (await at('/api/skills')).json();
    assert.deepEqual(board.skills.map((one) => [one.id, one.state]), [['cotizaciones', 'match']]);
    // One that does not read as a skill says why, and nothing is written.
    await writeFile(join(projectRoot, 'borrador/rota.habilidad.md'), 'sin cabecera');
    const bad = await post({ path: 'borrador/rota.habilidad.md' });
    assert.equal(bad.status, 422);
    assert.match((await bad.json()).error, /header/i);
  } finally {
    made.server.closeAllConnections?.();
    await new Promise((resolve) => made.server.close(() => resolve()));
    await rm(state, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});
