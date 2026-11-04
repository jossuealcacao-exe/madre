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
  assert.match(room, /async #couldNotSeat\(\{ messageId, agent, planId, error \}\) \{[\s\S]{0,1000}this\.#emit\('message\.failed'/);
});

// The same day: `/module` in a project whose .pulse/ was left read-only was accepted (202) and then
// answered by nothing — the draft folder could not be made and the error went to the terminal only.
test('room · a folder that cannot be prepared for writing fails the message in the chat', async () => {
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  assert.match(room, /try \{\n\s*lease = draft === true && create === true\n[\s\S]{0,200}\} catch \(error\) \{[\s\S]{0,400}this\.#emit\('message\.failed', \{ messageId, target: parsed\.target/);
});

// 2026-10-29: OpenCode may read only its project, and `/module` pointed it at MADRE's own SDK guide;
// it refused to write a module it could not read the guide for. The guide is copied into the project.
test('room · /module hands the agent the SDK guide inside the project', async () => {
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  assert.match(room, /if \(draft === true \|\| wantsModule\(text2\)\) lease\.sdk = await this\.#sdkInProject\(\);/);
  assert.match(room, /joinPath\(this\.#projectRoot, '\.pulse', 'sdk'\)/);
  assert.match(room, /sdk: input\.lease\?\.sdk \?\? sdkPaths\(\),/);
});

// D-5 (diagnostics of 1.1.2, two Linux copies): no git on the computer at all. Every #2, #3 and #4
// failed after it was chosen with «spawn git ENOENT», and nothing said so before.
test('no git on the computer · said as what to install, before and after choosing a mode that writes', async () => {
  const { diagnose } = await import('../public/troubleshooting.js');
  const { ES } = await import('../public/es.js');
  // What the room checks is what a missing git really throws.
  const project = await mkdtemp(join(tmpdir(), 'madre-no-git-'));
  await writeFile(join(project, 'README.md'), '# Tienda\n');
  const path = process.env.PATH;
  process.env.PATH = project;
  const thrown = await createCheckpoint(project, { id: 'no-git-1', label: 'test' }).then(() => null, (error) => error);
  process.env.PATH = path;
  assert.equal(thrown?.code, 'ENOENT');
  assert.match(`${thrown.path} ${thrown.syscall}`, /\bgit\b/);
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  assert.match(room, /const noGit = error\?\.code === 'ENOENT' && \/\\bgit\\b\/\.test\(`\$\{error\?\.path \?\? ''\} \$\{error\?\.syscall \?\? ''\}`\);/);
  // After: the failure is a known condition, in both languages, and never reaches the sentinel as unknown.
  const after = 'This computer does not have git, which MADRE needs to take the restore point before @{agent} writes, so nothing was changed. Install git and send it again.';
  assert.ok(ES[after], 'said in Spanish');
  for (const text of [after.replace('{agent}', 'claude'), ES[after].replace('{agent}', 'claude'), 'spawn git ENOENT']) {
    assert.equal(diagnose(text)[0]?.code, 'MU-081', text);
  }
  // Before: the server writes it into the page, and the modes that write say NEEDS GIT.
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /execFile\('git', \['--version'\], \{ timeout: 5000 \}, \(error\) => \{ gitHere = error\?\.code !== 'ENOENT'; \}\)/);
  assert.match(server, /JSON\.stringify\(\{ \.\.\.hostFacts\(\), \.\.\.\(gitHere \? \{\} : \{ git: false \}\) \}\)/);
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /const noGit = n >= 2 && !locked && hostLacksGit\(\);/);
  assert.equal(ES['NEEDS GIT'], 'FALTA GIT');
});
