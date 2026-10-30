// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TERMS_VERSION, acceptTerms, cameFromBefore, readTerms, termsWaived } from '../src/terms.mjs';

test('terms: not accepted until accepted on this computer, once per version of the text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-terms-'));
  const env = {};
  assert.equal((await readTerms(root, { env })).accepted, false);
  await acceptTerms(root);
  const kept = await readTerms(root, { env });
  assert.equal(kept.accepted, true);
  assert.ok(Date.parse(kept.at));
  // A new text is asked again.
  await writeFile(join(root, 'terms.json'), JSON.stringify({ version: '2000-01-01', at: new Date().toISOString() }));
  const old = await readTerms(root, { env });
  assert.equal(old.accepted, false);
  assert.equal(old.previous, '2000-01-01');
  assert.equal(JSON.parse(await readFile(join(root, 'terms.json'), 'utf8')).version !== TERMS_VERSION, true);
});

test('terms: tests and automation skip it; whoever came from before 1.1.0 is told what changed', async () => {
  assert.equal(termsWaived({ PULSE_TEST_MODE: '1' }), true);
  assert.equal(termsWaived({ PULSE_TERMS: 'accepted' }), true);
  assert.equal(termsWaived({}), false);
  const root = await mkdtemp(join(tmpdir(), 'madre-terms-'));
  assert.equal(await cameFromBefore(root), false);
  await writeFile(join(root, 'lifecycle.json'), JSON.stringify({ first: 'x', version: '1.1.0', before: true }));
  assert.equal(await cameFromBefore(root), true);
});

test('terms: the page waits on it before anything else, Home and a project alike, and no turn runs without it', async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const [app, home, server, gate] = await Promise.all(['public/app.js', 'public/salas-mac.js', 'src/server.mjs', 'public/terms.js'].map(read));
  for (const page of [app, home]) assert.match(page, /\nawait ensureTerms\(\);\n/);
  assert.match(server, /if \(!viaPhone && !\(await readTerms\(root\)\)\.accepted\) return sendJson\(response, 403/);
  // The diagnostics are no condition: the switch is in the gate, and on.
  assert.match(gate, /let diagnostics = answer\.diagnosticsFixed \? false : answer\.diagnostics !== false;/);
  assert.match(gate, /dialog\.addEventListener\('cancel', \(event\) => event\.preventDefault\(\)\);/);
});
