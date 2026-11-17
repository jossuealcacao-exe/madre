// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AUTO_OPEN_KEY, autoOpenOn, csvRows, kindOf, pickToOpen, setAutoOpen } from '../public/auto-open.js';
import { loadConfig } from '../src/config.mjs';
import { moduleOnIn, switchIn } from '../src/module-scope.mjs';
import { createPulseServer } from '../src/server.mjs';
import { ES } from '../public/es.js';

// LO QUE SE CREA, SE ABRE SOLO (2026-11-11): what an answer makes or changes that can be looked at
// opens beside the conversation; of several, the one that matters most; never over what the person
// is already looking at; and it can be turned off.

const paths = (files) => files.map((file) => file.path);

test('auto-open: a page wins over a picture, the main page over the others, and code is never chosen', () => {
  const { first, rest } = pickToOpen([
    { path: 'img/logo.png', status: 'created' },
    { path: 'about.html', status: 'created' },
    { path: 'app.js', status: 'created' },
    { path: 'index.html', status: 'created' },
    { path: 'notes.md', status: 'created' },
    { path: 'gastos.csv', status: 'created' },
    { path: 'factura.pdf', status: 'created' },
  ]);
  assert.equal(first.path, 'index.html');
  assert.equal(first.kind, 'page');
  assert.deepEqual(paths(rest), ['about.html', 'img/logo.png', 'factura.pdf', 'gastos.csv', 'notes.md']);
  // The main page nearest the top, before one deeper down.
  assert.equal(pickToOpen([{ path: 'docs/index.html', status: 'A' }, { path: 'index.html', status: 'M' }]).first.path, 'index.html');
  assert.equal(pickToOpen([{ path: 'site/b.html' }, { path: 'a.html' }]).first.path, 'a.html');
});

test('auto-open: an edit\'s letters count as well as the words, and what was deleted is not opened', () => {
  assert.equal(pickToOpen([{ path: 'index.html', status: 'D' }, { path: 'foto.jpg', status: 'A' }]).first.path, 'foto.jpg');
  assert.equal(pickToOpen([{ path: 'index.html', status: 'deleted' }]).first, null);
  assert.equal(pickToOpen([{ path: 'index.html', status: 'M' }]).first.path, 'index.html');
  // Nothing to look at: nothing opens.
  assert.equal(pickToOpen([{ path: 'server.mjs', status: 'A' }, { path: 'package.json', status: 'M' }]).first, null);
  assert.equal(pickToOpen().first, null);
  assert.equal(pickToOpen(null).first, null);
  // The same file twice (a plan's steps) is one.
  assert.equal(pickToOpen([{ path: 'a.png' }, { path: 'a.png' }]).rest.length, 0);
});

test('auto-open: a way of working, a module and MADRE\'s own folder are not the person\'s work', () => {
  assert.equal(kindOf('resumir.habilidad.md'), null);
  assert.equal(kindOf('.pulse/drafts/x/page.html'), null);
  assert.equal(kindOf('mod.module.mjs'), null);
  assert.equal(kindOf('README.md'), 'document');
  assert.equal(kindOf('Hoja.XLSX'), 'sheet');
  assert.equal(kindOf('dibujo.svg'), 'image');
});

test('auto-open: on by default, off when the person says so, and on when storage cannot be read', () => {
  const box = new Map();
  const storage = { getItem: (key) => box.get(key) ?? null, setItem: (key, value) => box.set(key, value), removeItem: (key) => box.delete(key) };
  assert.equal(autoOpenOn(storage), true);
  setAutoOpen(false, storage);
  assert.equal(box.get(AUTO_OPEN_KEY), 'off');
  assert.equal(autoOpenOn(storage), false);
  setAutoOpen(true, storage);
  assert.equal(autoOpenOn(storage), true);
  assert.equal(autoOpenOn({ getItem: () => { throw new Error('blocked'); } }), true);
  assert.equal(autoOpenOn(null), true);
});

test('auto-open: a sheet is read into rows, quotes and semicolons included', () => {
  assert.deepEqual(csvRows('Concepto,Monto\r\n"Renta, depto",8000\nLuz,"350"'), [['Concepto', 'Monto'], ['Renta, depto', '8000'], ['Luz', '350']]);
  assert.deepEqual(csvRows('﻿a;b\n1,5;2'), [['a', 'b'], ['1,5', '2']]);
  assert.deepEqual(csvRows('"dijo ""hola"""'), [['dijo "hola"']]);
  assert.equal(csvRows(Array.from({ length: 500 }, (_, n) => `${n}`).join('\n')).length, 200);
});

test('auto-open: the room opens what an answer made and what an edit changed, never over what is on screen', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // Both doors: a CREATE answer's files and an EDIT's.
  // Before the tiles' early return: an answer brings its tiles drawn, and CREATE never opened.
  const attach = app.slice(app.indexOf('function attachArtifacts('), app.indexOf('function autoOpenMade('));
  assert.ok(attach.indexOf('if (!replaying) autoOpenMade(files);') > 0, 'a CREATE answer opens nothing');
  assert.ok(attach.indexOf('if (!replaying) autoOpenMade(files);') < attach.indexOf("querySelector('.artifacts')) return;"), 'the opening sits after the return that skips it');
  assert.match(app, /case 'control\.changed':[^\n]*autoOpenMade\(event\.payload\.files\)/);
  const body = app.slice(app.indexOf('function autoOpenMade('), app.indexOf('function firstMadeSeen('));
  assert.match(body, /if \(!autoOpenOn\(\)\) return;/, 'the switch in Settings is not read');
  assert.match(body, /sideBusy\(\)[\s\S]*toast\(made \? t\('Made \{name\}'/, 'something on screen was replaced instead of a notice');
  assert.match(body, /result: true/, 'it opened as code instead of what it makes');
  // The old way opened the first text file in alphabetical order, code included: gone.
  assert.doesNotMatch(app, /const first = files\.find\(\(file\) => \(file\.contentType/);
  // The switch lives in Settings › Files, where the search finds it.
  assert.match(app, /sxRow\(where, t\('Open what is made'\)[^\n]*sxSwitch\(autoOpenOn\(\), \(on\) => setAutoOpen\(on\)/);
  assert.match(app, /\['files', 'Open what is made'\]/);
  for (const key of ['Open what is made', 'Made {name}', 'Changed {name}', 'View', 'Your first result, already on screen.', 'A spreadsheet. Open it with your spreadsheet app.']) {
    assert.ok(ES[key], `«${key}» has no Spanish`);
  }
  assert.equal(ES['Open what is made'], 'Abrir en automático lo que se crea');
  assert.equal(ES['Made {name}'], 'Se creó {name}');
});

test('auto-open: the project to try MADRE comes with Preview on, so its first change opens as the page', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'madre-auto-open-home-')));
  const state = await realpath(await mkdtemp(join(tmpdir(), 'madre-auto-open-state-')));
  const project = await realpath(await mkdtemp(join(tmpdir(), 'madre-auto-open-project-')));
  const before = process.env.PULSE_LOBBY_HOME;
  process.env.PULSE_LOBBY_HOME = home;
  let server;
  try {
    await mkdir(join(home, 'Proyectos'), { recursive: true });
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const make = () => fetch(`${base}/api/salas/new`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ sample: true, language: 'es' }) }).then((response) => response.json());
    const [sample] = (await make()).added;
    assert.equal(sample.sample, true);
    const ripley = (await loadConfig(state)).modules?.ripley ?? {};
    assert.equal(moduleOnIn(ripley, sample.id), true, 'the project to try MADRE opened its page as code');
    assert.equal(moduleOnIn(ripley, 'another-project-0123456789abcdef'), false, 'Preview was turned on for every project');
    // A person who turned Preview off for every project is not overruled by a second sample.
    const { updateConfig } = await import('../src/config.mjs');
    await updateConfig(state, { modules: { ripley: { enabled: false } } });
    const [second] = (await make()).added;
    assert.equal(moduleOnIn((await loadConfig(state)).modules?.ripley, second.id), false, 'the person\'s «off» was overruled');
    assert.equal(moduleOnIn(switchIn({}, second.id, true), second.id), true);
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    if (before === undefined) delete process.env.PULSE_LOBBY_HOME; else process.env.PULSE_LOBBY_HOME = before;
    for (const dir of [home, state, project]) await rm(dir, { recursive: true, force: true });
  }
});
