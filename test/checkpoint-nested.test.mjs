import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCheckpoint, diffCheckpoint, restoreCheckpoint, nestedRepos } from '../src/checkpoint.mjs';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

test('checkpoint: a project made of nested repositories is photographed, diffed and restored as one', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-nested-'));
  try {
    git(root, 'init', '-q');
    await writeFile(join(root, 'README.md'), 'outer\n');
    const site = join(root, 'portfolio');
    await mkdir(join(site, 'src'), { recursive: true });
    git(site, 'init', '-q');
    await writeFile(join(site, 'src', 'index.astro'), 'v1\n');
    await writeFile(join(site, '.env'), 'SECRET=1\n');
    await mkdir(join(root, 'node_modules', 'ignored'), { recursive: true }); git(join(root, 'node_modules', 'ignored'), 'init', '-q');
    assert.deepEqual(await nestedRepos(root), ['portfolio'], 'node_modules is never scanned');

    const checkpoint = await createCheckpoint(root, { id: 'cp1' });
    assert.equal(checkpoint.nested.length, 1);
    assert.equal(checkpoint.nested[0].dir, 'portfolio');

    // The agent edits inside the nested repo, adds a page, and writes into its .env; the outer repo is untouched.
    await writeFile(join(site, 'src', 'index.astro'), 'v2\n');
    await writeFile(join(site, 'src', 'madre.astro'), 'new page\n');
    await writeFile(join(site, '.env'), 'SECRET=hacked\n');
    const diff = await diffCheckpoint(root, checkpoint);
    assert.deepEqual(diff.files.map((f) => [f.status, f.path]).sort(), [['A', 'portfolio/src/madre.astro'], ['M', 'portfolio/.env'], ['M', 'portfolio/src/index.astro']], 'changes inside the nested repo are seen, with project-relative paths');
    assert.deepEqual(diff.forbidden, ['portfolio/.env'], 'a .env inside a nested repo is a forbidden zone too');
    assert.match(diff.stat, /portfolio\/src\/index\.astro/);

    const partial = await restoreCheckpoint(root, checkpoint, { paths: ['portfolio/.env'] });
    assert.deepEqual(partial, { removed: [], restored: ['portfolio/.env'] });
    assert.equal(await readFile(join(site, '.env'), 'utf8'), 'SECRET=1\n');
    assert.equal(await readFile(join(site, 'src', 'index.astro'), 'utf8'), 'v2\n', 'the legitimate edit stays');

    const full = await restoreCheckpoint(root, checkpoint);
    assert.deepEqual(full.removed, ['portfolio/src/madre.astro']);
    assert.deepEqual(full.restored, ['portfolio/src/index.astro']);
    assert.equal(await readFile(join(site, 'src', 'index.astro'), 'utf8'), 'v1\n');
    assert.equal(await access(join(site, 'src', 'madre.astro')).then(() => true, () => false), false);
    assert.deepEqual((await diffCheckpoint(root, checkpoint)).files, [], 'UNDO leaves the whole project as photographed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
