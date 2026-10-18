import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fitsVersion, forgetFromMarket, installFromMarket, keptCatalog, marketNews, readCatalog, refreshCatalog, sha256, updateFromMarket, verifySigned } from '../src/market-remote.mjs';
import { installModuleText, verifyModuleText } from '../src/modules/index.mjs';

// The Market from madre.run (2026-10-18): a signed catalog, files pinned by sha256, updates on their own.
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const PUBLIC = publicKey.export({ type: 'spki', format: 'pem' });
const moduleText = (version) => `export default { id: 'saludo', name: 'SALUDO', version: '${version}', summary: 'Says hello.', settings: { enabled: false } };\n`;

async function market() {
  const files = new Map();
  const server = createServer((request, response) => {
    const body = files.get(request.url);
    if (body === undefined) { response.writeHead(404); response.end(); return; }
    response.writeHead(200);
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/mercado`;
  const publish = (version, { issued = new Date().toISOString(), tamper = false, key = privateKey } = {}) => {
    const text = moduleText(version);
    files.set(`/mercado/modulos/saludo-${version}.module.mjs`, tamper ? text.replace('hello', 'goodbye') : text);
    const catalog = { schema: 1, issued, featured: ['saludo'], shelves: [{ id: 'create', title: { en: 'To create', es: 'Para crear' } }], modules: [
      { id: 'playwright', pitch: { en: 'See it.', es: 'Míralo.' } },
      { id: 'saludo', version, shelf: 'create', name: { en: 'Hello', es: 'Saludo' }, changes: { en: 'Friendlier.' }, file: { url: `${base}/modulos/saludo-${version}.module.mjs`, sha256: sha256(Buffer.from(text)), size: text.length } },
    ] };
    const bytes = Buffer.from(JSON.stringify(catalog));
    files.set('/mercado/catalogo.json', bytes);
    files.set('/mercado/catalogo.json.sig', sign(null, bytes, key).toString('base64'));
  };
  return { url: `${base}/catalogo.json`, publish, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('market · only a catalog signed with MADRE\'s key is read, and an older one never replaces a newer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-market-'));
  const shop = await market();
  const env = { PULSE_MARKET_URL: shop.url };
  try {
    shop.publish('1.0.0', { key: generateKeyPairSync('ed25519').privateKey });
    const forged = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true });
    assert.equal(forged.catalog, null);
    assert.match(forged.error, /not signed/);
    shop.publish('1.0.0', { issued: '2026-10-18T10:00:00Z' });
    const read = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true });
    assert.equal(read.fresh, true);
    assert.deepEqual(read.catalog.featured, ['saludo']);
    assert.equal(read.catalog.modules.find((one) => one.id === 'saludo').file.url, `${shop.url.replace('catalogo.json', '')}modulos/saludo-1.0.0.module.mjs`);
    assert.ok(await keptCatalog({ stateRoot: root, publicKey: PUBLIC }), 'kept, and checked again when read');
    assert.equal(await keptCatalog({ stateRoot: root }), null, 'MADRE\'s own key does not verify a catalog signed by another');
    shop.publish('0.9.0', { issued: '2026-10-17T10:00:00Z' });
    const older = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true });
    assert.match(older.error, /older/);
    assert.equal(older.catalog.modules.find((one) => one.id === 'saludo').version, '1.0.0');
    // Asked again within ten minutes, it answers with what it kept and asks nobody.
    assert.equal((await refreshCatalog({ stateRoot: root, env: { PULSE_MARKET_URL: 'http://127.0.0.1:9/x.json' }, publicKey: PUBLIC })).fresh, false);
  } finally { await shop.close(); await rm(root, { recursive: true, force: true }); }
});

test('market · a module is installed only when its file is the one the catalog signed, and updates itself, said once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-market-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-market-project-'));
  const shop = await market();
  const env = { PULSE_MARKET_URL: shop.url };
  const tools = { stateRoot: root, projectRoot: project, madre: '1.0.3', verifyText: verifyModuleText, installText: installModuleText };
  try {
    shop.publish('1.0.0', { tamper: true });
    let { catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true });
    await assert.rejects(installFromMarket({ ...tools, id: 'saludo', catalog }), /not the one the Market signed/);
    shop.publish('1.0.0', { issued: new Date(Date.now() + 1000).toISOString() });
    ({ catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true }));
    const done = await installFromMarket({ ...tools, id: 'saludo', catalog });
    assert.equal(done.version, '1.0.0');
    assert.match(await readFile(join(root, 'modules', 'saludo.mjs'), 'utf8'), /version: '1.0.0'/);
    assert.equal((await updateFromMarket({ ...tools, catalog })).length, 0, 'nothing newer, nothing done');
    shop.publish('1.1.0', { issued: new Date(Date.now() + 2000).toISOString() });
    ({ catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true }));
    const updated = await updateFromMarket({ ...tools, catalog, names: { saludo: 'SALUDO' } });
    assert.deepEqual(updated.map(({ id, from, to }) => ({ id, from, to })), [{ id: 'saludo', from: '1.0.0', to: '1.1.0' }]);
    assert.match(await readFile(join(root, 'modules', 'saludo.mjs'), 'utf8'), /version: '1.1.0'/);
    assert.equal((await marketNews(root))[0].name, 'SALUDO');
    // Removed by hand, it is not the Market's to bring back.
    assert.equal(await forgetFromMarket(root, 'saludo'), true);
    shop.publish('1.2.0', { issued: new Date(Date.now() + 3000).toISOString() });
    ({ catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true }));
    assert.equal((await updateFromMarket({ ...tools, catalog })).length, 0);
  } finally { await shop.close(); await rm(root, { recursive: true, force: true }); await rm(project, { recursive: true, force: true }); }
});

test('market · a catalog entry MADRE cannot trust is left out; versions compare as numbers', () => {
  const read = readCatalog(JSON.stringify({ schema: 1, issued: '2026-10-18T00:00:00Z', modules: [
    { id: 'lejos', version: '1.0.0', file: { url: 'https://elsewhere.example/x.mjs', sha256: 'a'.repeat(64) } },
    { id: 'sin-huella', version: '1.0.0', file: { url: 'https://madre.run/mercado/x.mjs', sha256: 'nope' } },
    { id: 'bien', version: '1.0.0', hue: ['#ffffff', 'red'], file: { url: 'https://madre.run/mercado/modulos/bien-1.0.0.module.mjs', sha256: 'b'.repeat(64) } },
    { id: 'Malo' },
  ] }), { url: 'https://madre.run/mercado/catalogo.json' });
  assert.deepEqual(read.modules.map((one) => one.id), ['bien'], 'another host, a bad sha256 and a bad id are dropped');
  assert.equal(read.modules[0].hue, null, 'a color that is not a color is dropped');
  assert.equal(fitsVersion('1.0.10', '1.0.9'), true);
  assert.equal(fitsVersion('1.0.3', '1.1.0'), false);
  assert.equal(verifySigned(Buffer.from('x'), 'not base64 at all', PUBLIC), false);
});

test('market · the news is told once: the author\'s lines, and the modules this computer does not have', async () => {
  const { marketAnnouncements, marketAnnounced } = await import('../src/market-remote.mjs');
  const root = await mkdtemp(join(tmpdir(), 'madre-market-'));
  try {
    const catalog = readCatalog(JSON.stringify({ schema: 1, issued: '2026-10-18T00:00:00Z', news: [{ id: 'abre', text: { es: 'Abrió el Mercado.', en: 'The Market is open.' }, module: 'bien' }, { id: 'vacia' }], modules: [
      { id: 'bien', version: '1.0.0', name: { en: 'Fine' }, file: { url: 'https://madre.run/mercado/modulos/bien-1.0.0.module.mjs', sha256: 'b'.repeat(64) } },
      { id: 'tenido', version: '1.0.0', file: { url: 'https://madre.run/mercado/modulos/tenido-1.0.0.module.mjs', sha256: 'c'.repeat(64) } },
      { id: 'playwright' },
    ] }), { url: 'https://madre.run/mercado/catalogo.json' });
    const first = await marketAnnouncements(root, catalog, ['tenido', 'playwright']);
    assert.deepEqual(first.news.map((one) => [one.id, one.module]), [['abre', 'bien']], 'a line with no words is not news');
    assert.deepEqual(first.modules.map((one) => one.id), ['bien'], 'what this computer has, and MADRE\'s own, are not new');
    await marketAnnounced(root, ['news:abre', 'module:bien', 'nonsense']);
    const again = await marketAnnouncements(root, catalog, []);
    assert.deepEqual([again.news.length, again.modules.map((one) => one.id)], [0, ['tenido']]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
