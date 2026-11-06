import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ControlDesk } from '../src/room/control.mjs';

// L-5 (Carlos's server, 2026-11-04): a #3 turn created PRUEBA-01 with its record and measurements
// under `pacientes/`, which git ignores, and the card said «@claude changed nothing» twice. The
// restore point never holds ignored files; the card now says what was written there.
// L-5b: UNDO removes newly created files in light ignored folders, so test records do not stay behind.
test('a turn that writes where git does not look reports it, and UNDO removes what was created (L-5, L-5b)', async () => {
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
    assert.deepEqual(changes.outsideCreated, ['pacientes/PRUEBA-01/ficha.md', 'pacientes/PRUEBA-01/mediciones.csv']);
    assert.match(changes.message, /2 file\(s\) created in folders git ignores \(pacientes\/PRUEBA-01\/ficha\.md, pacientes\/PRUEBA-01\/mediciones\.csv\); UNDO will remove them\./);
    assert.doesNotMatch(changes.message, /changed nothing in the project\. *$/);

    // L-5b: UNDO removes newly created files and their empty parent folder.
    const undone = await desk.undo(changes.checkpointId);
    assert.equal(undone.ok, true);
    assert.deepEqual(undone.removed, ['pacientes/PRUEBA-01/ficha.md', 'pacientes/PRUEBA-01/mediciones.csv']);
    assert.equal(await access(join(root, 'pacientes', 'PRUEBA-01', 'ficha.md')).then(() => true, () => false), false, 'new patient record removed');
    assert.equal(await access(join(root, 'pacientes', 'PRUEBA-01')).then(() => true, () => false), false, 'empty folder removed');
    assert.equal(await access(join(root, 'pacientes', 'PLANTILLA', 'ficha.md')).then(() => true, () => false), true, 'preexisting template stays');

    // A turn that wrote nowhere ignored says nothing of the kind.
    const second = await desk.begin({ agent: { id: 'claude' }, messageId: 'm-ignored-2', enabledScopes: {}, mode: 3 });
    const quiet = await desk.settle(second.run);
    await desk.release(second.run);
    assert.equal(quiet.outsideRestore, undefined);

    // Modifying a preexisting ignored file warns that UNDO cannot bring it back.
    const third = await desk.begin({ agent: { id: 'claude' }, messageId: 'm-ignored-3', enabledScopes: {}, mode: 3 });
    await writeFile(join(root, 'pacientes', 'PLANTILLA', 'ficha.md'), 'plantilla modificada\n');
    const modified = await desk.settle(third.run);
    await desk.release(third.run);
    assert.deepEqual(modified.outsideModified, ['pacientes/PLANTILLA/ficha.md']);
    assert.match(modified.message, /1 preexisting file\(s\) in folders git ignores were modified \(pacientes\/PLANTILLA\/ficha\.md\); the restore point does not hold them, so UNDO does not bring them back\./);
    const undoThird = await desk.undo(modified.checkpointId);
    assert.equal(undoThird.ok, true);
    assert.equal(await readFile(join(root, 'pacientes', 'PLANTILLA', 'ficha.md'), 'utf8'), 'plantilla modificada\n', 'preexisting file is not deleted');

    // The card says it instead of «changed nothing».
    const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
    assert.match(app, /\(outsideRestore\.length \|\| outsideCreated\.length\) \? t\(' wrote only in folders git ignores'\) : t\(' changed nothing'\)/);
    const { ES } = await import('../public/es.js');
    assert.ok(ES[' wrote only in folders git ignores']);
    assert.ok(ES['In folders git ignores (created; UNDO removes them): {where}']);
    assert.ok(ES['Outside the restore point, because git ignores them; UNDO does not bring them back: {where}']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Review of 2026-11-06: UNDO deleted files that were already there. Past 500 ignored files a patient
// record the agent edited was taken for new; a file with a future date from an unpacked archive was
// deleted untouched; a tracked file of a repository nested in an ignored folder was restored and then
// deleted. UNDO now removes only what a whole photograph says is new, still as the turn left it.
test('UNDO never deletes a file that was there before the turn, in folders git ignores (L-5b)', async () => {
  const { listIgnored, sortIgnoredWrites } = await import('../src/checkpoint.mjs');
  const exists = (path) => access(path).then(() => true, () => false);
  const made = [];
  const project = async (gitignore) => {
    const root = await mkdtemp(join(tmpdir(), 'madre-ignored-'));
    made.push(root);
    execFileSync('git', ['init', '-q'], { cwd: root });
    await writeFile(join(root, '.gitignore'), gitignore);
    await writeFile(join(root, 'README.md'), 'x\n');
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 's'], { cwd: root });
    return root;
  };
  const turn = async (root, act) => {
    const desk = new ControlDesk({ projectRoot: root });
    const { run } = await desk.begin({ agent: { id: 'claude' }, messageId: `m-${Math.random().toString(36).slice(2, 10)}`, enabledScopes: {}, mode: 3 });
    await act();
    const changes = await desk.settle(run);
    await desk.release(run);
    return { desk, changes };
  };
  try {
    // A photograph cut short at its bounds takes nothing for new.
    {
      const root = await project('data/\npacientes/\n');
      await mkdir(join(root, 'data'));
      for (let i = 0; i < 12; i += 1) await writeFile(join(root, 'data', `f${String(i).padStart(2, '0')}.csv`), 'x');
      await mkdir(join(root, 'pacientes', 'juan'), { recursive: true });
      await writeFile(join(root, 'pacientes', 'juan', 'ficha.md'), 'historia\n');
      const cut = await listIgnored(root, { limit: 10 });
      assert.equal(cut.complete, false);
      assert.equal(cut.files.has('pacientes/juan/ficha.md'), false, 'the record falls past the bound');
      await writeFile(join(root, 'pacientes', 'juan', 'ficha.md'), 'historia\n+ nota del agente\n');
      const sorted = await sortIgnoredWrites(root, { ignoredExisting: cut.files, ignoredComplete: cut.complete, createdAt: new Date(Date.now() - 1000).toISOString() }, ['pacientes/juan/ficha.md']);
      assert.deepEqual(sorted.created, []);
      assert.deepEqual(sorted.unknown, ['pacientes/juan/ficha.md']);
      const whole = await listIgnored(root);
      assert.equal(whole.complete, true);
      assert.equal(whole.files.has('pacientes/juan/ficha.md'), true);
    }
    // An untouched file dated in the future is not reported, and stays.
    {
      const root = await project('pacientes/\n');
      await mkdir(join(root, 'pacientes'));
      await writeFile(join(root, 'pacientes', 'importado.md'), 'de un zip\n');
      const future = new Date(Date.now() + 86_400_000);
      await utimes(join(root, 'pacientes', 'importado.md'), future, future);
      const { desk, changes } = await turn(root, async () => {});
      assert.equal(changes.outsideRestore, undefined);
      assert.equal((await desk.undo(changes.checkpointId)).ok, true);
      assert.equal(await exists(join(root, 'pacientes', 'importado.md')), true);
    }
    // A repository nested in an ignored folder is its own restore point: restored, never deleted.
    {
      const root = await project('sites/\n');
      const site = join(root, 'sites', 'web');
      await mkdir(join(site, 'src'), { recursive: true });
      await writeFile(join(site, 'src', 'app.js'), 'v1\n');
      execFileSync('git', ['init', '-q'], { cwd: site });
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], { cwd: site });
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 's'], { cwd: site });
      const old = new Date(Date.now() - 3600_000);
      await utimes(join(site, 'src', 'app.js'), old, old);
      const { desk, changes } = await turn(root, () => writeFile(join(site, 'src', 'app.js'), 'v2\n'));
      assert.equal(changes.outsideCreated, undefined);
      const undone = await desk.undo(changes.checkpointId);
      assert.deepEqual(undone.removed, []);
      assert.equal(await readFile(join(site, 'src', 'app.js'), 'utf8'), 'v1\n');
    }
    // A file the turn created and the person wrote again before UNDO is theirs now: it stays.
    {
      const root = await project('pacientes/\n');
      await mkdir(join(root, 'pacientes'));
      const { desk, changes } = await turn(root, () => writeFile(join(root, 'pacientes', 'nueva.md'), 'del agente\n'));
      assert.deepEqual(changes.outsideCreated, ['pacientes/nueva.md']);
      await writeFile(join(root, 'pacientes', 'nueva.md'), 'del agente\n+ lo que escribió la doctora\n');
      const undone = await desk.undo(changes.checkpointId);
      assert.deepEqual(undone.removed, []);
      assert.equal(await exists(join(root, 'pacientes', 'nueva.md')), true);
    }
  } finally {
    for (const root of made) await rm(root, { recursive: true, force: true });
  }
});
