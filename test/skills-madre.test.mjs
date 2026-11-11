// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The skills that come with MADRE (1.1.4, D-H8): six for whoever is starting out with AI, read from
// habilidades/ beside the code, shipped in the package, turned off but never removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chooseSkills, loadSkills, MADRE_SKILLS, MAX_BODY, skillFolders } from '../src/skills.mjs';

test('six skills come with MADRE, each whole, bilingual, and found by the words people use', async () => {
  const was = process.env.PULSE_MADRE_SKILLS;
  process.env.PULSE_MADRE_SKILLS = MADRE_SKILLS;
  try {
    assert.equal(skillFolders({ stateRoot: '/s', projectRoot: '/p' }).madre, MADRE_SKILLS);
    const { loaded, failures } = await loadSkills({ stateRoot: '/nonexistent-state', projectRoot: '/nonexistent-project' });
    assert.deepEqual(failures, []);
    assert.deepEqual(loaded.map((one) => one.id), ['explicamelo-facil', 'hojas-de-calculo', 'mensajes-a-clientes', 'publicaciones-para-redes', 'resumen-y-pendientes', 'tu-pagina-paso-a-paso']);
    for (const skill of loaded) {
      assert.equal(skill.origin, 'madre');
      assert.deepEqual(skill.unknown, [], `${skill.id} says fields MADRE does not know`);
      assert.ok(skill.name?.es && skill.name?.en, `${skill.id} has no name in both languages`);
      assert.ok(skill.when?.es && skill.when?.en, `${skill.id} has no trigger in both languages`);
      assert.ok(skill.body.length < MAX_BODY / 4, `${skill.id} is heavier than a turn needs`);
      assert.equal(skill.minMadre, '1.1.4');
    }
    const pick = (text) => chooseSkills({ skills: loaded, text }).chosen.map((one) => one.id);
    assert.ok(pick('no entiendo qué es un repositorio, explícamelo').includes('explicamelo-facil'));
    assert.ok(pick('escríbeme un whatsapp para recordarle el pago a un cliente').includes('mensajes-a-clientes'));
    assert.ok(pick('dame ideas de publicaciones para instagram').includes('publicaciones-para-redes'));
    assert.ok(pick('ordena mi excel de gastos y saca el total').includes('hojas-de-calculo'));
    assert.ok(pick('quiero cambiar los colores de mi página y agregar un botón de whatsapp').includes('tu-pagina-paso-a-paso'));
    assert.ok(pick('resume estas notas de la junta y dime los pendientes').includes('resumen-y-pendientes'));
  } finally {
    if (was === undefined) delete process.env.PULSE_MADRE_SKILLS; else process.env.PULSE_MADRE_SKILLS = was;
  }
  const pkg = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('habilidades'), 'they would not travel in the package');
});
