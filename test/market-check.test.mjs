import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { checkSubmission, entryProblems, reachesOf, submissionDraft, uploadUrl, writeSubmission } from '../src/market-check.mjs';

// The community Market (2026-10-28): what somebody sends is checked the same way on their computer,
// in the repository's CI and before it is signed.
const MODULE = `export default {
  id: 'saludo', version: '1.0.0', credit: 'Ana Prueba',
  name: { es: 'Saludo', en: 'Greeting' },
  summary: { es: 'Saluda en la caja. Nada más.', en: 'Says hello in the box. Nothing else.' },
  settings: { enabled: false },
  slash: [{ name: 'hola', usage: '/hola', summary: 'Says hello', execute: async () => ({ text: 'Hola' }) }],
};
`;
const ENTRY = {
  id: 'saludo', version: '1.0.0',
  name: { es: 'Saludo', en: 'Greeting' },
  line: { es: 'Saluda en la caja.', en: 'Says hello in the box.' },
  summary: { es: 'Saluda en la caja. Nada más.', en: 'Says hello in the box. Nothing else.' },
  shelf: 'create', minMadre: '1.0.6', author: { name: 'Ana Prueba', github: 'ana-prueba' }, spdx: 'MIT',
};

test('market check · a module and its entry that say the same thing pass, and the summary says what it reaches for', async () => {
  const result = await checkSubmission({ text: MODULE, entry: ENTRY, name: 'saludo.mjs' });
  assert.equal(result.ok, true, result.problems.join('\n'));
  assert.deepEqual(result.reaches, []);
  assert.deepEqual(result.declares.commands, ['/hola']);
  assert.match(result.markdown, /^## ✅ Saludo 1\.0\.0/);
  assert.match(result.markdown, /@ana-prueba/);
});

test('market check · what is wrong is said field by field, and the network without `reaches` is asked about', async () => {
  const text = MODULE.replace("settings:", "async run() { return fetch('https://example.com'); },\n  settings:");
  const result = await checkSubmission({ text, entry: { ...ENTRY, id: 'otro', price: 5, spdx: 'Propietaria', shelf: 'tienda', icon: '<path onload="x()"/>' } });
  assert.equal(result.ok, false);
  const said = result.problems.join('\n');
  for (const field of ['id: the entry says "otro"', 'price:', 'spdx:', 'shelf:', 'icon: only shapes']) assert.ok(said.includes(field), `nothing said about ${field}\n${said}`);
  // Each one names its field, which the form in the module's card marks.
  assert.deepEqual(result.fields, ['id', 'shelf', 'price', 'spdx', 'icon']);
  assert.deepEqual(result.reaches.map((one) => one.id), ['network']);
  assert.equal(result.undeclared.length, 1);
  // A file that does not load says why, and the entry is still checked.
  const broken = await checkSubmission({ text: 'export default 3;', entry: ENTRY });
  assert.match(broken.problems[0], /does not load as MADRE loads one/);
  assert.deepEqual(entryProblems(null), ['The entry is missing: entrada.json, beside the module.']);
  assert.deepEqual(reachesOf("import { spawn } from 'node:child_process'; process.env.HOME").map((one) => one.id), ['commands', 'environment']);
});

test('market check · the entry starts from what the module says, keeps what the person wrote, and never another id or version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-submission-'));
  try {
    const module = { id: 'saludo', name: 'Greeting', version: '1.0.0', summary: '' };
    const first = await submissionDraft({ stateRoot: root, module, text: MODULE, madre: '1.0.6' });
    assert.deepEqual(first.name, { es: 'Saludo', en: 'Greeting' });
    assert.deepEqual(first.line, { es: 'Saluda en la caja.', en: 'Says hello in the box.' });
    assert.equal(first.author.name, 'Ana Prueba');
    assert.equal(first.minMadre, '1.0.6');
    assert.equal(first.shelf, '');
    const written = await writeSubmission({ stateRoot: root, text: MODULE, entry: { ...first, shelf: 'create', spdx: 'MIT', author: { name: 'Ana', github: 'ana' } } });
    assert.equal(written.upload, uploadUrl('saludo'));
    assert.match(written.upload, /^https:\/\/github\.com\/jossuealcacao-exe\/madre-mercado\/upload\/main\/modulos\/saludo$/);
    assert.equal(await readFile(join(written.folder, 'saludo.module.mjs'), 'utf8'), MODULE);
    // Opened again, what was written comes back; an entry that names another id or version does not win.
    const again = await submissionDraft({ stateRoot: root, module, text: MODULE, madre: '1.0.6' });
    assert.deepEqual([again.shelf, again.spdx, again.author.github], ['create', 'MIT', 'ana']);
    const forced = await submissionDraft({ stateRoot: root, module, text: MODULE, madre: '1.0.6', entry: { id: 'otro', version: '9.9.9', name: { es: 'Hola' } } });
    assert.deepEqual([forced.id, forced.version, forced.name.es, forced.name.en], ['saludo', '1.0.0', 'Hola', 'Greeting']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('market check · the room drafts, checks and writes the files of one\'s own module, and refuses one it did not make', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-submission-room-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-submission-project-'));
  try {
    await mkdir(join(state, 'modules'), { recursive: true });
    await writeFile(join(state, 'modules', 'saludo.mjs'), MODULE);
    const { server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const ask = (payload) => fetch(`http://127.0.0.1:${server.address().port}/api/market/submission`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then(async (response) => ({ status: response.status, body: await response.json() }));
    try {
      const drafted = await ask({ id: 'saludo' });
      assert.equal(drafted.status, 200);
      assert.equal(drafted.body.ok, false, 'a draft with no shelf, GitHub user or license is not ready');
      assert.ok(drafted.body.licenses.includes('MIT'));
      const early = await ask({ id: 'saludo', entry: drafted.body.entry, write: true });
      assert.equal(early.status, 422);
      const ready = await ask({ id: 'saludo', entry: { ...drafted.body.entry, shelf: 'create', spdx: 'MIT', author: { name: 'Ana Prueba', github: 'ana-prueba' } }, write: true });
      assert.equal(ready.status, 200, JSON.stringify(ready.body.problems));
      assert.deepEqual(ready.body.files, ['saludo.module.mjs', 'entrada.json']);
      assert.equal(JSON.parse(await readFile(join(ready.body.folder, 'entrada.json'), 'utf8')).author.github, 'ana-prueba');
      assert.equal(ready.body.shown, false, 'nothing was asked to be shown');
      assert.equal((await ask({ id: 'git' })).status, 404);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  } finally {
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('market check · `madre check-module` prints the summary and fails when something is wrong', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-check-cli-'));
  const run = promisify(execFile);
  const bin = join(import.meta.dirname, '..', 'bin', 'madre.mjs');
  try {
    await writeFile(join(dir, 'saludo.module.mjs'), MODULE);
    await writeFile(join(dir, 'entrada.json'), JSON.stringify(ENTRY));
    const good = await run(process.execPath, [bin, 'check-module', '--file', join(dir, 'saludo.module.mjs'), '--entry', join(dir, 'entrada.json'), '--json']);
    assert.equal(JSON.parse(good.stdout).ok, true);
    await writeFile(join(dir, 'entrada.json'), JSON.stringify({ ...ENTRY, spdx: 'nada' }));
    await assert.rejects(run(process.execPath, [bin, 'check-module', '--file', join(dir, 'saludo.module.mjs'), '--entry', join(dir, 'entrada.json')]), (error) => error.code === 1 && /spdx/.test(error.stdout));
    // In English unless asked: the Market's repository asks for Spanish.
    const spanish = await run(process.execPath, [bin, 'check-module', '--file', join(dir, 'saludo.module.mjs'), '--lang', 'es']).catch((error) => error);
    assert.match(spanish.stdout, /Por corregir antes de revisarlo/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
