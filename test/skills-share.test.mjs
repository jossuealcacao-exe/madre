// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// C-1 of docs/private/COMPARTIR-MODULOS-HABILIDADES.md: a skill, hand to hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSkills, shareFolder, shareSkill, skillFolders } from '../src/skills.mjs';

const header = (fields, body) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n\n${body}\n`;
const PAGE = header({ id: 'cotizaciones', name: 'Cotizaciones', when: '"Una cotización."', version: '1.0.0' }, 'Pon el IVA aparte.');

async function house() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'madre-share-')));
  return { root, stateRoot: join(root, 'state'), projectRoot: join(root, 'project') };
}

test('skills-share · one file travels under the name the other side already knows', async () => {
  const { root, stateRoot, projectRoot } = await house();
  try {
    const mine = join(skillFolders({ stateRoot, projectRoot }).user, 'cotizaciones');
    await mkdir(mine, { recursive: true });
    await writeFile(join(mine, 'HABILIDAD.md'), PAGE);
    // MADRE's own record of where it came from is not part of the skill and does not travel.
    await writeFile(join(mine, 'origen.json'), '{"kind":"file"}');
    const ready = await shareSkill({ stateRoot, projectRoot, id: 'cotizaciones' });
    assert.deepEqual([ready.alone, ready.files], [true, ['cotizaciones.habilidad.md']], 'the name an agent writes, which the room recognises');
    assert.equal(await readFile(ready.file, 'utf8'), PAGE);
    assert.deepEqual(await readdir(shareFolder(stateRoot, 'cotizaciones')), ['cotizaciones.habilidad.md'], 'origen.json stayed behind');
    await assert.rejects(shareSkill({ stateRoot, projectRoot, id: 'no-existe' }), /No skill/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('skills-share · one that carries more keeps its own names, and says they travel together', async () => {
  const { root, stateRoot, projectRoot } = await house();
  try {
    const mine = join(skillFolders({ stateRoot, projectRoot }).user, 'cotizaciones');
    await mkdir(join(mine, 'referencias'), { recursive: true });
    await mkdir(join(mine, 'guiones'), { recursive: true });
    await writeFile(join(mine, 'HABILIDAD.md'), PAGE);
    await writeFile(join(mine, 'referencias', 'plantilla.md'), '# Plantilla');
    await writeFile(join(mine, 'guiones', 'precios.py'), 'print(1)');
    const ready = await shareSkill({ stateRoot, projectRoot, id: 'cotizaciones' });
    assert.equal(ready.alone, false);
    assert.deepEqual(ready.files.sort(), ['HABILIDAD.md', 'guiones/precios.py', 'referencias/plantilla.md']);
    assert.equal(ready.file, null, 'there is no single file to hand over');
    // What the other side would have to be told about is said here, not discovered there.
    assert.deepEqual(ready.scripts, ['guiones/precios.py']);
    assert.equal(await readFile(join(ready.folder, 'referencias', 'plantilla.md'), 'utf8'), '# Plantilla');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('skills-share · dropped into the room, MADRE recognises it and keeps it only when told', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { root, stateRoot, projectRoot } = await house();
  await mkdir(projectRoot, { recursive: true });
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const made = await createPulseServer({ projectRoot: await realpath(projectRoot), stateRoot, agents: roster, invokers: {} });
  const port = await new Promise((resolve) => made.server.listen(0, '127.0.0.1', () => resolve(made.server.address().port)));
  const base = `http://127.0.0.1:${port}`;
  const drop = (name, text) => fetch(`${base}/api/attachments`, { method: 'POST', headers: { origin: base, 'content-type': 'text/markdown', 'x-pulse-filename': encodeURIComponent(name) }, body: text });
  const keep = (payload) => fetch(`${base}/api/skills/install-file`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  try {
    // The file a person drags in lands under the room, which is a place MADRE accepts a skill from.
    const sent = await (await drop('cotizaciones.habilidad.md', PAGE)).json();
    assert.equal(sent.skill.id, 'cotizaciones');
    assert.equal(sent.skill.when, 'Una cotización.');
    assert.equal(sent.skill.body, 'Pon el IVA aparte.', 'what it tells the agents, for the person to read first');
    // Recognised, and nothing installed: the card offers, the person decides.
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded, []);
    const kept = await (await keep({ path: sent.skill.fileName, root: 'attachments', scope: 'user' })).json();
    assert.deepEqual([kept.installed.id, kept.installed.origin], ['cotizaciones', 'user']);
    assert.deepEqual((await loadSkills({ stateRoot, projectRoot })).loaded.map((one) => one.id), ['cotizaciones']);
    // A plain file is a plain attachment and offers nothing.
    assert.equal((await (await drop('notas.txt', 'cualquier cosa')).json()).skill, undefined);
    assert.equal((await (await drop('lista.md', '# Lista\n\n- uno')).json()).skill, undefined, 'a markdown file is not a skill by being markdown');
    // One named like a skill that cannot be read says so instead of offering nothing.
    const broken = await (await drop('rota.habilidad.md', 'sin cabecera')).json();
    assert.match(broken.skill.error, /cannot read it as one/i);
    // And nothing comes in from outside those two folders.
    assert.equal((await keep({ path: '../fuera.habilidad.md', root: 'attachments' })).status, 400);
  } finally {
    made.server.closeAllConnections?.();
    await new Promise((resolve) => made.server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
