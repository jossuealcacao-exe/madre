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
