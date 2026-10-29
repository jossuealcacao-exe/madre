import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AUTHOR, AUTHOR_URL, YEAR } from '../public/attribution.js';

const read = (file) => readFile(join(import.meta.dirname, '..', file), 'utf8');

// The corner of every project and of Home is MADRE's attribution (NOTICE): one source for both
// pages, a link to its author, and the same words NOTICE asks a fork to keep.
test('attribution · the corner says whose MADRE is, links to its author, and agrees with NOTICE', async () => {
  const [notice, app, home, room, homePage] = await Promise.all([read('NOTICE'), read('public/app.js'), read('public/salas-mac.js'), read('public/index.html'), read('public/salas-mac.html')]);
  assert.equal(AUTHOR, 'Jossue Alcalá');
  assert.equal(AUTHOR_URL, 'https://jossuealcala.com');
  const flat = (text) => text.replace(/\s+/g, ' ');
  for (const said of [flat(notice), flat(await read('ADDITIONAL-TERMS.md'))]) {
    assert.ok(said.includes(`«MADRE <version> · © ${YEAR} ${AUTHOR}» linked to ${AUTHOR_URL}`) || said.includes(`«MADRE ‹version› · © ${YEAR} ${AUTHOR}», linked to ${AUTHOR_URL}`), 'the attribution is not the one the corner shows');
    assert.ok(said.includes('Built with MADRE by Jossue Alcalá') && said.includes('Desarrollado con MADRE de Jossue Alcalá'));
    assert.ok(said.includes('Based on MADRE by Jossue Alcalá — https://madre.run'));
  }
  assert.match(app, /drawAttribution\(document\.querySelector\('#colophon'\), initial\.version\)/);
  assert.match(home, /drawAttribution\(ui\.colophon, answer\.version\)/);
  assert.match(room, /<small id="colophon" class="colophon"/);
  assert.match(homePage, /<small id="sm-colophon" class="colophon sm-colophon"/);
  // Nobody writes the line by hand any more: a copy would drift from NOTICE.
  for (const page of [app, home]) assert.doesNotMatch(page, /createTextNode\('\\u00a0·\\u00a0© 2026 Jossue Alcalá'\)/);
});

test('attribution · drawn, it is one link to the author with the version and the copyright', async () => {
  const made = [];
  const node = (tag) => { const one = { tag, children: [], append: (...kids) => one.children.push(...kids), replaceChildren: (...kids) => { one.children = kids; }, textContent: '' }; made.push(one); return one; };
  globalThis.document = { createElement: node, createTextNode: (text) => ({ text }) };
  try {
    const { drawAttribution } = await import('../public/attribution.js');
    const host = node('small');
    host.hidden = true;
    const link = drawAttribution(host, '1.0.2');
    assert.equal(host.hidden, false);
    assert.deepEqual(host.children, [link]);
    assert.equal(link.tag, 'a');
    assert.equal(link.href, 'https://jossuealcala.com');
    assert.equal(link.rel, 'noopener');
    assert.equal(link.children[0].textContent, 'MADRE 1.0.2');
    assert.equal(link.children[1].text, ' · © 2026 Jossue Alcalá');
    assert.equal(drawAttribution(host, ''), null);
  } finally { delete globalThis.document; }
});

// From 1.1.0 MADRE is under the Business Source License 1.1 (2026-10-28): free for individuals and
// organizations of up to ten people, each version AGPL v3 four years after it is published; 1.0.2 to
// 1.0.5 stay AGPL with their additional terms. Every source file says which license it is under.
test('attribution · the license is the BSL 1.1 with its parameters, older versions keep theirs, and every source file says so', async () => {
  const [license, pkg, terms, notice] = await Promise.all([read('LICENSE'), read('package.json').then(JSON.parse), read('ADDITIONAL-TERMS.md'), read('NOTICE')]);
  assert.match(license, /^Business Source License 1\.1\n/);
  assert.match(license, /Licensor: +Jossue Alcalá/);
  assert.match(license, /Licensed Work: +MADRE, version 1\.1\.0 and later versions\./);
  assert.match(license, /ten \(10\) or fewer\s+people working for it/);
  assert.match(license, /Change License: +GNU Affero General Public License, version 3 only/);
  assert.match(license, /Covenants of Licensor/);
  assert.equal(pkg.license, 'BUSL-1.1');
  for (const file of ['NOTICE', 'ADDITIONAL-TERMS.md']) assert.ok(pkg.files.includes(file), `${file} is not shipped`);
  assert.match(terms, /apply to MADRE versions 1\.0\.2 to 1\.0\.5/);
  assert.match(notice, /Business Source License 1\.1/);
  assert.match(notice, /Versions 1\.0\.2 to 1\.0\.5 remain under the GNU AGPL v3/);
  const { execFileSync } = await import('node:child_process');
  const files = execFileSync('git', ['ls-files', 'bin', 'src', 'public', 'scripts'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' }).split('\n').filter((file) => /\.(mjs|js|css|html)$/.test(file));
  const bare = [];
  for (const file of files) if (!(await read(file)).slice(0, 400).includes('SPDX-License-Identifier: BUSL-1.1')) bare.push(file);
  assert.deepEqual(bare, [], 'source files without the license line');
});
