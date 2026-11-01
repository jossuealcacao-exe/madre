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
const moduleText = (version, extra = '') => `export default { id: 'saludo', name: 'SALUDO', version: '${version}', summary: 'Says hello.', settings: { enabled: false }${extra} };\n`;

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
  const publish = (version, { issued = new Date().toISOString(), tamper = false, key = privateKey, extra = '' } = {}) => {
    const text = moduleText(version, extra);
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
    // What it declares first, and nothing installed; then that same file, accepted by its sha256.
    const review = await installFromMarket({ ...tools, id: 'saludo', catalog, review: true });
    assert.deepEqual([review.review, review.version, review.declares.tools, review.declares.reaches], [true, '1.0.0', false, []]);
    await assert.rejects(readFile(join(root, 'modules', 'saludo.mjs')));
    await assert.rejects(installFromMarket({ ...tools, id: 'saludo', catalog }), /before installing/);
    await assert.rejects(installFromMarket({ ...tools, id: 'saludo', catalog, accept: 'f'.repeat(64) }), /before installing/);
    const done = await installFromMarket({ ...tools, id: 'saludo', catalog, accept: review.sha256 });
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

test('market · a module the catalog takes back is removed and forgotten here, and the person is told why, once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-market-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-market-project-'));
  const shop = await market();
  const tools = { stateRoot: root, projectRoot: project, madre: '1.0.3', verifyText: verifyModuleText, installText: installModuleText };
  try {
    shop.publish('1.0.0');
    const { catalog } = await refreshCatalog({ stateRoot: root, env: { PULSE_MARKET_URL: shop.url }, publicKey: PUBLIC, force: true });
    const { sha256: accept } = await installFromMarket({ ...tools, id: 'saludo', catalog, review: true });
    await installFromMarket({ ...tools, id: 'saludo', catalog, accept });
    const gone = [];
    const remove = async (id) => gone.push(id);
    // Another version taken back: this one stays.
    await updateFromMarket({ ...tools, catalog: { ...catalog, revoked: [{ id: 'saludo', version: '0.9.0', why: null }] }, remove });
    assert.deepEqual(gone, []);
    await updateFromMarket({ ...tools, catalog: { ...catalog, revoked: [{ id: 'saludo', version: null, why: { es: 'Mandaba datos.' } }] }, names: { saludo: 'SALUDO' }, remove });
    assert.deepEqual(gone, ['saludo']);
    // Named as the Market names it, in both languages: the page says the room's.
    assert.deepEqual((await marketNews(root)).filter((one) => one.kind === 'removed').map(({ id, name, why }) => ({ id, name, why })), [{ id: 'saludo', name: { en: 'Hello', es: 'Saludo' }, why: { es: 'Mandaba datos.' } }]);
    assert.equal(await forgetFromMarket(root, 'saludo'), false, 'already forgotten: no next catalog brings it back');
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

// A room that closes while it is still asking madre.run for the catalog waits for that answer: the
// note it writes when the ask fails landed in the state folder after the server said it was
// closed, while that folder was being removed (ENOTEMPTY in the home widgets' test, 2026-10-21).
test('market · a room closed while it asks for the catalog writes nothing after it closed', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const { readdir, stat } = await import('node:fs/promises');
  // Every file of the state folder with its size: a line added after the close changes one.
  const listing = async (dir) => Promise.all((await readdir(dir, { recursive: true })).sort().map(async (name) => `${name} ${(await stat(join(dir, name)).catch(() => null))?.size ?? '-'}`));
  // The catalog fails at once and its signature takes a while: the ask used to end on the first
  // failure with the second request still out, and that one was written down after the close.
  const slow = createServer((request, response) => { setTimeout(() => { response.writeHead(503); response.end(); }, request.url.endsWith('.sig') ? 400 : 0); });
  await new Promise((resolve) => slow.listen(0, '127.0.0.1', resolve));
  const before = process.env.PULSE_MARKET_URL;
  process.env.PULSE_MARKET_URL = `http://127.0.0.1:${slow.address().port}/mercado/catalogo.json`;
  const state = await mkdtemp(join(tmpdir(), 'madre-market-close-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-market-close-project-'));
  try {
    const { server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    await new Promise((resolve) => server.close(() => resolve()));
    const closedWith = await listing(state);
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.deepEqual(await listing(state), closedWith, 'the state folder changed after the room closed');
  } finally {
    if (before === undefined) delete process.env.PULSE_MARKET_URL; else process.env.PULSE_MARKET_URL = before;
    await new Promise((resolve) => slow.close(resolve));
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('market · an update that asks for more than the person accepted waits for them, and is told once (external review #10)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-market-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-market-project-'));
  const shop = await market();
  const env = { PULSE_MARKET_URL: shop.url };
  const tools = { stateRoot: root, projectRoot: project, madre: '1.0.3', verifyText: verifyModuleText, installText: installModuleText };
  try {
    shop.publish('1.0.0');
    let { catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true });
    const { sha256: accept } = await installFromMarket({ ...tools, id: 'saludo', catalog, review: true });
    await installFromMarket({ ...tools, id: 'saludo', catalog, accept });
    shop.publish('1.2.0', { issued: new Date(Date.now() + 1000).toISOString(), extra: ", reaches: [{ host: 'datos.example.com', to: 'A server', what: 'what you write', when: 'every message' }]" });
    ({ catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: PUBLIC, force: true }));
    assert.deepEqual(await updateFromMarket({ ...tools, catalog, names: { saludo: 'SALUDO' } }), [], 'an update that reaches somewhere new installed itself');
    assert.match(await readFile(join(root, 'modules', 'saludo.mjs'), 'utf8'), /version: '1.0.0'/);
    const held = (await marketNews(root)).filter((one) => one.kind === 'held');
    assert.deepEqual(held.map(({ id, from, to, more }) => ({ id, from, to, more })), [{ id: 'saludo', from: '1.0.0', to: '1.2.0', more: [{ what: 'reaches', host: 'datos.example.com' }] }]);
    await updateFromMarket({ ...tools, catalog, names: { saludo: 'SALUDO' } });
    assert.equal((await marketNews(root)).filter((one) => one.kind === 'held').length, 1, 'told again');
    // The person reads it in the Market and accepts that very file: then it is installed.
    const again = await installFromMarket({ ...tools, id: 'saludo', catalog, review: true });
    await installFromMarket({ ...tools, id: 'saludo', catalog, accept: again.sha256 });
    assert.match(await readFile(join(root, 'modules', 'saludo.mjs'), 'utf8'), /version: '1.2.0'/);
  } finally { await shop.close(); await rm(root, { recursive: true, force: true }); await rm(project, { recursive: true, force: true }); }
});
