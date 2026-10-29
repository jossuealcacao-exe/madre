import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCheckpoint, isGitRepo } from '../src/checkpoint.mjs';

// 2026-10-28, the 1.1.0 release: a project copied with a half-made `.git` (hooks, objects, no HEAD)
// counted as a repository, git refused every photograph, and a #3 turn sat on «writing…» until
// MADRE was closed — its failure was thrown above the try that reports failures.
test('checkpoint · a .git folder without HEAD is no repository: the project is photographed with a shadow', async () => {
  const project = await mkdtemp(join(tmpdir(), 'madre-broken-git-'));
  await mkdir(join(project, '.git', 'objects'), { recursive: true });
  await mkdir(join(project, '.git', 'hooks'), { recursive: true });
  await writeFile(join(project, 'README.md'), '# Tienda\n');
  assert.equal(await isGitRepo(project), false);
  const checkpoint = await createCheckpoint(project, { id: 'broken-git-1', label: 'test' });
  assert.match(checkpoint.commit, /^[0-9a-f]{40}$/);
  assert.ok(checkpoint.via, 'taken in a shadow, outside the project');
  // A worktree's `.git` is a file, and that is a repository.
  const worktree = await mkdtemp(join(tmpdir(), 'madre-worktree-'));
  await writeFile(join(worktree, '.git'), 'gitdir: /somewhere/else\n');
  assert.equal(await isGitRepo(worktree), true);
});

test('room · a restore point that cannot be taken ends the turn with a message, never a turn left open', async () => {
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  const seats = [...room.matchAll(/this\.#controlDesk\.begin\(\{[^\n]*\.catch\(\(error\) => \(error\?\.code === 'ABORT_ERR' \? null : \{ failed: error \}\)\);\n[^\n]*\n\s*if \(seat\.failed\) return this\.#couldNotSeat\(/g)];
  assert.equal(seats.length, 2, 'both the #3 and the #2 seat report a failed restore point');
  assert.doesNotMatch(room, /controlDesk\.begin\([^\n]*Promise\.reject\(error\)/);
  assert.match(room, /async #couldNotSeat\(\{ messageId, agent, planId, error \}\) \{[\s\S]{0,400}this\.#emit\('message\.failed'/);
});
