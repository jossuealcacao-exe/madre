import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCheckpoint, diffCheckpoint, isForbidden, settleControls } from '../src/checkpoint.mjs';
import { needsDesignationOnDisk } from '../src/file-ops.mjs';

// The 1.0 review (2026-10-12): what an agent writes into a repository's own settings never runs
// with MADRE's rights (CKP-01), and a guarded zone is judged by where a path lands, not by its
// words (SRV-05).

test('git controls: a command planted in .git/config during a turn never runs, and the settings go back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-controls-'));
  const marker = join(root, '..', `madre-controls-ran-${process.pid}-${Date.now()}`);
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await writeFile(join(root, 'a.txt'), 'one\n');
    const before = await readFile(join(root, '.git', 'config'), 'utf8');
    const checkpoint = await createCheckpoint(root, { id: 'controls' });
    // What an agent in #3 could do: .git stays writable during the turn.
    const planted = join(root, '.git', 'planted.sh');
    await writeFile(planted, `#!/bin/sh\ntouch '${marker}'\nexit 1\n`);
    await chmod(planted, 0o755);
    execFileSync('git', ['config', 'core.fsmonitor', planted], { cwd: root });
    await mkdir(join(root, '.git', 'hooks'), { recursive: true });
    await writeFile(join(root, '.git', 'hooks', 'pre-commit'), `#!/bin/sh\ntouch '${marker}'\n`);
    await writeFile(join(root, 'a.txt'), 'two\n');
    // Even before the settings go back, MADRE's own git runs nothing the repository names.
    const early = await diffCheckpoint(root, checkpoint);
    assert.deepEqual(early.files.map((file) => file.path), ['a.txt']);
    assert.equal(await access(marker).then(() => true, () => false), false, 'MADRE ran the command the turn planted');
    const back = await settleControls(checkpoint);
    assert.deepEqual(back.sort(), ['.git/config', '.git/hooks/pre-commit']);
    assert.equal(await readFile(join(root, '.git', 'config'), 'utf8'), before);
    assert.equal(await access(join(root, '.git', 'hooks', 'pre-commit')).then(() => true, () => false), false, 'a hook the turn added stayed');
    assert.deepEqual(await settleControls(checkpoint), [], 'settled twice');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(marker, { force: true });
  }
});

test('guarded zones: judged where the path lands and without regard to case', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-guarded-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await mkdir(join(root, 'src'));
    await symlink('.git', join(root, 'gitlink'));
    for (const path of ['src/../.git/config', 'gitlink/config', '.ENV', '.Git/config', 'sub/.Madre/k', '.Claude/Settings.local.json']) {
      assert.ok(await needsDesignationOnDisk(root, path), `${path} was not guarded`);
    }
    // A link and folders that do not exist yet (2026-11-01, external review #60): the nearest folder
    // that exists decides, so `gitlink/hooks/new/x` lands in .git/hooks and is guarded.
    for (const path of ['gitlink/hooks/new/x', 'gitlink/a/b/c/d', 'src/../gitlink/new/x']) {
      assert.ok(await needsDesignationOnDisk(root, path), `${path} was not guarded`);
    }
    assert.equal(await needsDesignationOnDisk(root, 'src/app.js'), false);
    assert.equal(await needsDesignationOnDisk(root, 'docs/new.md'), false, 'a path that does not exist yet');
    assert.equal(await needsDesignationOnDisk(root, 'docs/deep/er/new.md'), false, 'folders that do not exist yet');
    assert.ok(isForbidden('.ENV') && isForbidden('.env.local') && !isForbidden('environment.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
