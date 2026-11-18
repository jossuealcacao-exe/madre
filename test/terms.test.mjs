// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_TERMS_LINKS, APP_TERMS_VERSION, TERMS_LINKS, TERMS_VERSION, acceptTerms, cameFromBefore, readTerms, termsLinks, termsWaived } from '../src/terms.mjs';

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

test('terms: inside the desktop app the license is the app\'s own, a text of its own, asked again once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-terms-app-'));
  const browser = {};
  const app = { MADRE_APP: '1' };
  await acceptTerms(root, { env: browser });
  assert.equal((await readTerms(root, { env: browser })).accepted, true, 'the source code\'s, accepted in a browser');
  const first = await readTerms(root, { env: app });
  assert.equal(first.accepted, false, 'the app asks for its own');
  assert.equal(first.kind, 'app');
  assert.equal(first.previous, TERMS_VERSION, 'and knows the person accepted the other one before');
  await acceptTerms(root, { env: app });
  assert.equal((await readTerms(root, { env: app })).version, APP_TERMS_VERSION);
  assert.equal((await readTerms(root, { env: app })).accepted, true);
  assert.deepEqual(termsLinks(app), APP_TERMS_LINKS);
  assert.deepEqual(termsLinks(browser), TERMS_LINKS, 'GitHub and npm keep their license');
  assert.match(APP_TERMS_LINKS.license.es, /^https:\/\/madre\.run\//);
});

// Q-26 (2026-11-17, the author: «son 7 dias de prueba de todas las funciones de madre y despues
// gratis pero solo 1 proyecto … npm y github se mantienen bsl»): MADRE App never says it is free for
// you. With the author's switch on it names the first days with everything and then one project for
// free; with it off it promises nothing either way. The source code's words (BSL) stay as they are.
test('terms: the app never promises it is free; with the switch on it names the days and the one project', async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const [gate, attribution, server, manual, content] = await Promise.all(['public/terms.js', 'public/attribution.js', 'src/server.mjs', 'public/manual.js', 'public/manual-content.js'].map(read));
  for (const said of ["t('MADRE is free for you. Two quick things and you are in.')", "t('It is still free for you. Two quick things and you carry on where you left off.')", "t('Free for you')", "t('Use it on your computers and in your projects without paying anything. Everything you make with it is yours.')"]) assert.ok(!gate.includes(said), `the gate no longer says ${said}`);
  assert.ok(!attribution.includes("t('Free for you. What you make with MADRE is yours.')"), 'Settings no longer says it');
  assert.ok(gate.includes("'The first {days} days you have all of MADRE App; then it stays free with one project. Two quick things and you are in.'"));
  assert.match(gate, /answer\.trialDays/);
  assert.match(server, /trialDays: termsKind\(\) === 'app' \? await trialDaysNow\(\) : null/);
  // The manual inside the app tells the app's license, not the source code's.
  assert.match(manual, /copy\.appLicense/);
  assert.equal(content.split("appLicense: {\n      id: 'licencia',").length - 1, 2, 'the app\'s chapter, in Spanish and in English');
  assert.ok(content.includes('Después sigue gratis con un proyecto activo a la vez') && content.includes('Then it stays free with one active project at a time'));
  // The source code keeps its words.
  assert.ok(gate.includes("t('MADRE is free for you and for teams of up to 10 people. Two quick things and you are in.')"));
});
