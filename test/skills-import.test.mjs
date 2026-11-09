// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// H-7 of docs/private/HABILIDADES-MERCADO.md: bringing in the skills a person already has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_BODY, loadSkills, skillFolders } from '../src/skills.mjs';
import { findSkills, importSkills, overBy, skillSources } from '../src/skills-import.mjs';

// A computer with Claude's skills where Claude keeps them, Codex's where Codex does, and MADRE's
// own folders empty.
async function computer() {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'madre-import-home-')));
  const projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'madre-import-project-')));
  const stateRoot = join(home, '.pulse');
  const put = async (dir, { name, description, body, files = {}, license = null }) => {
    await mkdir(dir, { recursive: true });
    const header = ['---', `name: ${name}`, `description: "${description}"`, ...(license ? [`license: ${license}`] : []), '---'].join('\n');
    await writeFile(join(dir, 'SKILL.md'), `${header}\n\n${body}\n`);
    for (const [path, text] of Object.entries(files)) {
      await mkdir(join(dir, path, '..'), { recursive: true });
      await writeFile(join(dir, path), text);
    }
  };
  return { home, projectRoot, stateRoot, put };
}

test('skills-import · they are read where each CLI keeps them, and Codex\'s own machinery is left alone', async () => {
  const { home, projectRoot, stateRoot, put } = await computer();
  try {
    // A skill of Claude's, as Claude writes one: no id, and «description» for its trigger.
    await put(join(home, '.claude', 'skills', 'cotizaciones'), { name: 'cotizaciones', description: 'Una cotización o un presupuesto.', body: 'Pon el IVA aparte.' });
    // One synced from their account, a folder deeper, under whoever it was synced for.
    await put(join(home, '.claude', 'skills', 'synced', 'abc-123', 'informes'), { name: 'informes', description: 'Un informe mensual.', body: 'Primero lo que cambió.', files: { 'referencias/orden.md': '1. Qué cambió' } });
    // One of this project's own.
    await put(join(projectRoot, '.claude', 'skills', 'del-proyecto'), { name: 'del-proyecto', description: 'Solo aquí.', body: 'Usa el estilo de este repo.' });
    // One of Codex's.
    await put(join(home, '.codex', 'skills', 'facturas'), { name: 'facturas', description: 'Una factura.', body: 'El RFC va arriba.' });
    // And Codex's OWN, which is about installing skills into Codex and has no business in MADRE.
    await put(join(home, '.codex', 'skills', '.system', 'skill-installer'), { name: 'skill-installer', description: 'Installs skills into Codex.', body: 'Run the installer.' });

    const found = await findSkills({ home, projectRoot, stateRoot });
    assert.deepEqual(found.map((one) => [one.id, one.who, one.fits]), [
      ['cotizaciones', 'claude', true],
      ['del-proyecto', 'claude', true],
      ['facturas', 'codex', true],
      ['informes', 'claude', true],
    ], 'a folder starting with a dot is not a skill of the person\'s');
    assert.equal(found.find((one) => one.id === 'informes').synced, true);
    assert.equal(found.find((one) => one.id === 'del-proyecto').project, true);
    // Read as MADRE reads one: «description» is its when, and the folder is its id.
    assert.equal(found.find((one) => one.id === 'cotizaciones').when, 'Una cotización o un presupuesto.');
    assert.deepEqual(skillSources({ home }).map((one) => one.who), ['claude', 'codex']);
    // Reading changed nothing.
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded, []);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('skills-import · one that does not fit says why with the number, and is never brought in half', async () => {
  const { home, projectRoot, stateRoot, put } = await computer();
  try {
    await put(join(home, '.claude', 'skills', 'larga'), { name: 'larga', description: 'Algo concreto.', body: 'x'.repeat(MAX_BODY + 1), files: { 'scripts/correr.py': 'print(1)' } });
    await put(join(home, '.claude', 'skills', 'corta'), { name: 'corta', description: 'Algo concreto.', body: 'Hazlo así.' });
    const found = await findSkills({ home, projectRoot, stateRoot });
    const long = found.find((one) => one.id === 'larga');
    assert.equal(long.fits, false);
    // The number, and where what does not fit should go: something a person can act on.
    assert.match(long.why, new RegExp(`${MAX_BODY + 1}`));
    assert.match(long.why, /referencias\//);
    // What is there is still measured, so the person sees how far off it is.
    assert.deepEqual([long.files, long.scripts], [2, ['scripts/correr.py']]);
    assert.equal(overBy(MAX_BODY + 500), 500);
    assert.equal(overBy(10), 0, 'one that fits is over by nothing');
    // Asked for anyway, it is left behind with its reason, and the one that fits still comes.
    const done = await importSkills({ ids: ['larga', 'corta'], home, stateRoot, projectRoot });
    assert.deepEqual(done.brought.map((one) => one.id), ['corta']);
    assert.deepEqual(done.left.map((one) => one.id), ['larga']);
    assert.match(done.left[0].why, /referencias\//);
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded.map((one) => one.id), ['corta']);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('skills-import · what is brought over is copied whole, and the original is left where it was', async () => {
  const { home, projectRoot, stateRoot, put } = await computer();
  try {
    const from = join(home, '.claude', 'skills', 'informes');
    await put(from, {
      name: 'informes',
      description: 'Un informe mensual de resultados.',
      body: 'Usa el orden de `referencias/orden.md`.',
      license: 'Proprietary. LICENSE.txt has complete terms',
      files: { 'referencias/orden.md': '1. Qué cambió\n2. Números', 'scripts/numeros.py': 'print(1)' },
    });
    await chmod(join(from, 'scripts/numeros.py'), 0o755);
    const done = await importSkills({ ids: ['informes'], home, stateRoot, projectRoot });
    assert.deepEqual(done.brought.map((one) => [one.id, one.who, one.scripts]), [['informes', 'claude', 1]]);
    const kept = join(skillFolders({ stateRoot, projectRoot }).user, 'informes');
    assert.equal(await readFile(join(kept, 'referencias/orden.md'), 'utf8'), '1. Qué cambió\n2. Números');
    assert.match(await readFile(join(kept, 'scripts/numeros.py'), 'utf8'), /print/);
    // Where it came from, written beside it.
    const origin = JSON.parse(await readFile(join(kept, 'origen.json'), 'utf8'));
    assert.deepEqual([origin.kind, origin.who], ['import', 'claude']);
    assert.equal(origin.from, from);
    // The original is untouched: this is a copy, not a move.
    assert.match(await readFile(join(from, 'SKILL.md'), 'utf8'), /referencias\/orden\.md/);
    // Its license travels with it. A proprietary one is the person's to use and not theirs to
    // share: the skills' check (src/skill-check.mjs) is what refuses it at the Market's door.
    const mine = (await loadSkills({ stateRoot, projectRoot })).loaded[0];
    assert.match(mine.license, /^Proprietary/);
    const { skillFaults } = await import('../src/skill-check.mjs');
    assert.ok(skillFaults(mine).some((one) => one.field === 'license'), 'it cannot be sent to the Market');
    // Brought again, it replaces itself and says so beforehand.
    assert.equal((await findSkills({ home, projectRoot, stateRoot })).find((one) => one.id === 'informes').replaces, true);
    assert.deepEqual((await importSkills({ ids: ['informes'], home, stateRoot, projectRoot })).brought.length, 1);
    // And something that is not on this computer is said, never passed over.
    const none = await importSkills({ ids: ['no-existe'], home, stateRoot, projectRoot });
    assert.deepEqual(none.brought, []);
    assert.match(none.left[0].why, /no skill called «no-existe»/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('skills-import · over the real routes: listed, then brought in by the person', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { home, projectRoot, stateRoot, put } = await computer();
  await put(join(home, '.claude', 'skills', 'cotizaciones'), { name: 'cotizaciones', description: 'Una cotización.', body: 'Pon el IVA aparte.' });
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  // The routes read this computer's own HOME, so the test's one is handed in through it.
  const wasHome = process.env.HOME;
  process.env.HOME = home;
  const made = await createPulseServer({ projectRoot, stateRoot, agents: roster, invokers: {} });
  const port = await new Promise((resolve) => made.server.listen(0, '127.0.0.1', () => resolve(made.server.address().port)));
  const at = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, ...options.headers } });
  try {
    const listed = await (await at('/api/skills/import')).json();
    assert.deepEqual(listed.found.map((one) => [one.id, one.fits]), [['cotizaciones', true]]);
    // Nothing comes over without being named.
    assert.equal((await at('/api/skills/import', { method: 'POST', body: JSON.stringify({ ids: [] }) })).status, 400);
    assert.deepEqual((await (await at('/api/skills')).json()).skills, []);
    const done = await (await at('/api/skills/import', { method: 'POST', body: JSON.stringify({ ids: ['cotizaciones'] }) })).json();
    assert.deepEqual(done.brought.map((one) => one.id), ['cotizaciones']);
    // And it is on the board, waiting for a match like any other.
    assert.deepEqual((await (await at('/api/skills')).json()).skills.map((one) => [one.id, one.state]), [['cotizaciones', 'match']]);
  } finally {
    made.server.closeAllConnections?.();
    await new Promise((resolve) => made.server.close(() => resolve()));
    if (wasHome === undefined) delete process.env.HOME; else process.env.HOME = wasHome;
    await rm(home, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
});
