// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// External review #9 (2026-11-03): a .env that git ignores is not in the checkpoint. A CLI that
// gives itself the write bit back changed it and nothing saw it. The guard keeps its own copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ControlDesk } from '../src/room/control.mjs';

test('a .env that git ignores, changed, deleted or swapped for a link during a turn, comes back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-env-guard-'));
  const outside = join(await mkdtemp(join(tmpdir(), 'madre-env-outside-')), 'target.txt');
  try {
    const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, stdio: 'ignore' });
    git('init', '-q');
    await writeFile(join(root, '.gitignore'), '.env*\n');
    await writeFile(join(root, 'app.js'), 'one\n');
    git('add', '.'); git('commit', '-qm', 'start');
    await writeFile(join(root, '.env'), 'SECRET=original\n', { mode: 0o640 });
    await mkdir(join(root, 'api'));
    await writeFile(join(root, 'api', '.env.local'), 'TOKEN=kept\n');
    await writeFile(join(root, '.env.production'), 'PROD=1\n');
    await writeFile(outside, 'untouched\n');

    const desk = new ControlDesk({ projectRoot: root });
    const { run } = await desk.begin({ agent: { id: 'codex' }, messageId: 'm-env-guard-1', enabledScopes: {}, mode: 3 });
    // What a CLI that ignores the lock does: write bit back, then change, delete, swap.
    await chmod(join(root, '.env'), 0o644);
    await writeFile(join(root, '.env'), 'SECRET=stolen\n');
    await chmod(join(root, 'api'), 0o755);
    await rm(join(root, 'api', '.env.local'), { force: true });
    await rm(join(root, '.env.production'), { force: true });
    await symlink(outside, join(root, '.env.production'));
    await writeFile(join(root, 'app.js'), 'two\n');

    const changes = await desk.settle(run);
    await desk.release(run);
    assert.deepEqual([...changes.forbiddenReverted].sort(), ['.env', '.env.production', 'api/.env.local']);
    assert.equal(await readFile(join(root, '.env'), 'utf8'), 'SECRET=original\n');
    assert.equal(await readFile(join(root, 'api', '.env.local'), 'utf8'), 'TOKEN=kept\n');
    assert.ok((await lstat(join(root, '.env.production'))).isFile(), 'the link is gone, the file is back');
    assert.equal(await readFile(join(root, '.env.production'), 'utf8'), 'PROD=1\n');
    assert.equal(await readFile(outside, 'utf8'), 'untouched\n', 'nothing was written through the link');
    assert.equal((await lstat(join(root, '.env'))).mode & 0o777, 0o640, 'its own mode, after the lock comes off');
    // The work itself stays.
    assert.deepEqual(changes.files.map((file) => file.path), ['app.js']);
    assert.match(changes.message, /3 write\(s\) into forbidden zones were reverted/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(join(outside, '..'), { recursive: true, force: true });
  }
});

test('an untouched .env is left exactly as it was', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-env-guard-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await writeFile(join(root, '.gitignore'), '.env\n');
    await writeFile(join(root, '.env'), 'A=1\n');
    const desk = new ControlDesk({ projectRoot: root });
    const { run } = await desk.begin({ agent: { id: 'claude' }, messageId: 'm-env-guard-2', enabledScopes: {}, mode: 3 });
    const changes = await desk.settle(run);
    await desk.release(run);
    assert.deepEqual(changes.forbiddenReverted, []);
    assert.equal(await readFile(join(root, '.env'), 'utf8'), 'A=1\n');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
