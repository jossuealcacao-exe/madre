import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ControlDesk } from '../src/room/control.mjs';

// L-5 (Carlos's server, 2026-11-04): a #3 turn created PRUEBA-01 with its record and measurements
// under `pacientes/`, which git ignores, and the card said «@claude changed nothing» twice. The
// restore point never holds ignored files; the card now says what was written there.
test('a turn that writes where git does not look is told as written outside the restore point (L-5)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-ignored-'));
  try {
    const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, stdio: 'ignore' });
    git('init', '-q');
    await writeFile(join(root, '.gitignore'), 'pacientes/\nnode_modules/\n.pulse/\n');
    await writeFile(join(root, 'README.md'), '# Skinhealth\n');
    git('add', '.'); git('commit', '-qm', 'start');
    await mkdir(join(root, 'pacientes', 'PLANTILLA'), { recursive: true });
    await writeFile(join(root, 'pacientes', 'PLANTILLA', 'ficha.md'), 'plantilla\n');
    const old = new Date(Date.now() - 3600_000);
    await utimes(join(root, 'pacientes', 'PLANTILLA', 'ficha.md'), old, old);

    const desk = new ControlDesk({ projectRoot: root });
    const { run } = await desk.begin({ agent: { id: 'claude' }, messageId: 'm-ignored-1', enabledScopes: {}, mode: 3 });
    await mkdir(join(root, 'pacientes', 'PRUEBA-01'), { recursive: true });
    await writeFile(join(root, 'pacientes', 'PRUEBA-01', 'ficha.md'), 'paciente de prueba\n');
    await writeFile(join(root, 'pacientes', 'PRUEBA-01', 'mediciones.csv'), 'dia,area\n1,4.2\n');
    // Not named: what is ignored for its size, and MADRE's own folder.
    await mkdir(join(root, 'node_modules', 'x'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'x', 'index.js'), 'x\n');
    await mkdir(join(root, '.pulse', 'out'), { recursive: true });
    await writeFile(join(root, '.pulse', 'out', 'notes.md'), 'n\n');

    const changes = await desk.settle(run);
    await desk.release(run);
    assert.equal(changes.files.length, 0, 'git sees nothing');
    assert.deepEqual(changes.outsideRestore, ['pacientes/PRUEBA-01/ficha.md', 'pacientes/PRUEBA-01/mediciones.csv']);
    assert.match(changes.message, /2 file\(s\) in folders git ignores were written too \(pacientes\/PRUEBA-01\/ficha\.md, pacientes\/PRUEBA-01\/mediciones\.csv\); the restore point does not hold them, so UNDO does not bring them back\./);
    assert.doesNotMatch(changes.message, /changed nothing in the project\. *$/);
    // A turn that wrote nowhere ignored says nothing of the kind.
    const second = await desk.begin({ agent: { id: 'claude' }, messageId: 'm-ignored-2', enabledScopes: {}, mode: 3 });
    const quiet = await desk.settle(second.run);
    await desk.release(second.run);
    assert.equal(quiet.outsideRestore, undefined);

    // The card says it instead of «changed nothing».
    const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
    assert.match(app, /outsideRestore\.length \? t\(' wrote only in folders git ignores'\) : t\(' changed nothing'\)/);
    const { ES } = await import('../public/es.js');
    assert.ok(ES[' wrote only in folders git ignores'] && ES['Outside the restore point, because git ignores them; UNDO does not bring them back: {where}']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
