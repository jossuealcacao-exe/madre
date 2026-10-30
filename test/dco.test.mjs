// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unsigned } from '../scripts/dco-check.mjs';

test('contributions: a commit from someone else needs its own Signed-off-by; the author and merges do not', () => {
  const commits = [
    { sha: 'a1', email: 'jossue.alcala.o@gmail.com', parents: 1, body: 'Cambio del autor' },
    { sha: 'b2', email: 'ana@example.com', parents: 1, body: 'Arreglo\n\nSigned-off-by: Ana Pérez <ana@example.com>' },
    { sha: 'c3', email: 'luis@example.com', parents: 1, body: 'Sin firma' },
    { sha: 'd4', email: 'eva@example.com', parents: 1, body: 'Firma de otra persona\n\nSigned-off-by: Ana Pérez <ana@example.com>' },
    { sha: 'e5', email: 'Max@Example.com', parents: 1, body: 'Mayúsculas\n\nSigned-off-by: Max <max@example.com>' },
    { sha: 'f6', email: 'zoe@example.com', parents: 2, body: 'Merge' },
  ];
  assert.deepEqual(unsigned(commits).map((one) => one.sha), ['c3', 'd4']);
});

test('contributions: the CLA, its template, CODEOWNERS and the CI check are in place', async () => {
  const [cla, template, owners, ci, contributing] = await Promise.all(['CLA.md', '.github/pull_request_template.md', '.github/CODEOWNERS', '.github/workflows/ci.yml', 'CONTRIBUTING.md'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(cla, /He leído el Acuerdo de contribución de MADRE, versión 1\.0, y lo acepto\./);
  assert.match(cla, /incluidas licencias comerciales y la Business Source License 1\.1/);
  assert.match(template, /CLA\.md/);
  assert.match(owners, /^\* @jossuealcacao-exe$/m);
  assert.match(ci, /node scripts\/dco-check\.mjs/);
  assert.match(contributing, /\(CLA\.md\)/);
});
