import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { marketNews, readCatalog, refreshCatalog, sha256 } from '../src/market-remote.mjs';
import { builtinFile, readBuiltinRecord, updateBuiltins } from '../src/builtin-updates.mjs';
import { MODULES, adoptBuiltinUpdates, builtinFailures, loadFailures, packagedVersions, verifyBuiltinText } from '../src/modules/index.mjs';
import { SDK_LEVEL, understandsSdk } from '../src/modules/sdk.mjs';

// MADRE's own modules, kept up to date by the Market (2026-10-25, R-2): a newer file signed with the
// factory key stands in for the one in the package, and anything less leaves the package's in place.
const pem = (key) => key.export({ type: 'spki', format: 'pem' });
const market = generateKeyPairSync('ed25519');
const factory = generateKeyPairSync('ed25519');
const MARKET_PUBLIC = pem(market.publicKey);
const FACTORY_PUBLIC = pem(factory.publicKey);
const REMINDERS = await readFile(new URL('../src/modules/reminders.mjs', import.meta.url), 'utf8');
const remindersAt = (version) => REMINDERS.replace("  version: '0.1.0',", `  version: '${version}',`);
const reminders = () => MODULES.find((module) => module.id === 'reminders');

async function shop() {
  const files = new Map();
  const server = createServer((request, response) => {
    const body = files.get(request.url);
    if (body === undefined) { response.writeHead(404); response.end(); return; }
    response.writeHead(200);
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/mercado`;
  let issued = Date.now();
  const publish = ({ version = '0.2.0', text = remindersAt(version), signer = factory.privateKey, sdk = 2, revoked = [] } = {}) => {
    const name = `/mercado/modulos/reminders-${version}.builtin.mjs`;
    const bytes = Buffer.from(text);
    files.set(name, bytes);
    issued += 1000;
    const catalog = { schema: 1, issued: new Date(issued).toISOString(), modules: [], revoked, builtins: [
      { id: 'reminders', version, sdk, changes: { es: 'Las horas de hoy ya no nacen vencidas.' }, file: { url: `${base}/modulos/reminders-${version}.builtin.mjs`, sha256: sha256(bytes), size: bytes.length, factory: sign(null, bytes, signer).toString('base64') } },
    ] };
    const raw = Buffer.from(JSON.stringify(catalog));
    files.set('/mercado/catalogo.json', raw);
    files.set('/mercado/catalogo.json.sig', sign(null, raw, market.privateKey).toString('base64'));
  };
  return { env: { PULSE_MARKET_URL: `${base}/catalogo.json` }, publish, close: () => new Promise((resolve) => server.close(resolve)) };
}

const sync = async (root, env) => {
  const { catalog } = await refreshCatalog({ stateRoot: root, env, publicKey: MARKET_PUBLIC, force: true });
  return updateBuiltins({ stateRoot: root, catalog, packaged: packagedVersions(), understands: understandsSdk, factoryKey: FACTORY_PUBLIC, names: { reminders: 'Reminders' } });
};

test('builtin · Notes and Reminders are one file each: they import nothing of MADRE', async () => {
  for (const name of ['notes', 'reminders']) {
    const text = await readFile(new URL(`../src/modules/${name}.mjs`, import.meta.url), 'utf8');
    const imported = [...text.matchAll(/^import .* from '([^']+)';$/gm)].map((match) => match[1]);
    assert.ok(imported.length > 0);
    assert.deepEqual(imported.filter((from) => !from.startsWith('node:')), [], `${name} imports only node: builtins`);
    assert.match(text, /^\s+sdk: 2,$/m);
  }
  // Alone in a scratch folder, where nothing of MADRE resolves, a newer Reminders loads.
  assert.deepEqual(await verifyBuiltinText({ text: remindersAt('0.2.0'), id: 'reminders' }), { id: 'reminders', version: '0.2.0', sdk: 2 });
  await assert.rejects(verifyBuiltinText({ text: REMINDERS, id: 'reminders' }), /not newer/);
  await assert.rejects(verifyBuiltinText({ text: remindersAt('0.2.0'), id: 'notes' }), /says it is "reminders"/);
  await assert.rejects(verifyBuiltinText({ text: remindersAt('0.2.0').replace('  sdk: 2,', `  sdk: ${SDK_LEVEL + 1},`), id: 'reminders' }), /written for contract/);
});

test('builtin · the catalog\'s list for MADRE\'s own is read apart, and a MADRE that does not know it sees no module to install', () => {
  const read = readCatalog(JSON.stringify({ schema: 1, issued: '2026-10-25T00:00:00Z', modules: [], builtins: [
    { id: 'reminders', version: '0.2.0', sdk: 2, file: { url: 'https://madre.run/mercado/modulos/reminders-0.2.0.builtin.mjs', sha256: 'a'.repeat(64), factory: 'c2ln' } },
    { id: 'reminders', version: '0.3.0', sdk: 2, file: { url: 'https://elsewhere.example/r.mjs', sha256: 'a'.repeat(64), factory: 'c2ln' } },
    { id: 'notes', version: '0.2.0', sdk: 2, file: { url: 'https://madre.run/mercado/modulos/notes.mjs', sha256: 'a'.repeat(64) } },
  ], revoked: [{ id: 'saludo', version: '1.0.0', why: { es: 'Mandaba datos.' } }, { id: 'Bad Id' }] }));
  assert.deepEqual(read.builtins.map((one) => one.version), ['0.2.0'], 'another host, or no factory signature: left out');
  assert.deepEqual(read.revoked, [{ id: 'saludo', version: '1.0.0', why: { es: 'Mandaba datos.' } }]);
  assert.deepEqual(read.modules, []);
});

test('builtin · a newer Reminders signed with the factory key runs instead of the package\'s; anything less does not', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-builtin-'));
  const market = await shop();
  try {
    assert.equal(reminders().version, '0.1.0');
    // Signed with the Market's key alone: not enough.
    market.publish({ signer: generateKeyPairSync('ed25519').privateKey });
    assert.deepEqual((await sync(root, market.env)).updated, []);
    // A contract this MADRE does not speak: left for a newer MADRE.
    market.publish({ sdk: SDK_LEVEL + 1 });
    assert.deepEqual((await sync(root, market.env)).updated, []);

    market.publish();
    const { updated } = await sync(root, market.env);
    assert.deepEqual(updated.map(({ id, from, to }) => ({ id, from, to })), [{ id: 'reminders', from: '0.1.0', to: '0.2.0' }]);
    assert.equal((await readBuiltinRecord(root)).reminders.version, '0.2.0');
    assert.deepEqual(await adoptBuiltinUpdates({ stateRoot: root, factoryKey: FACTORY_PUBLIC }), [{ id: 'reminders', from: '0.1.0', to: '0.2.0' }]);
    assert.equal(reminders().version, '0.2.0');
    assert.deepEqual(reminders().updated, { from: '0.1.0', to: '0.2.0' });
    assert.equal(reminders().external, undefined, 'still MADRE\'s own: its routes and card, and it cannot be removed');
    assert.ok(reminders().routes.some((route) => route.path === '/api/reminders'));

    // Changed on disk after it came: not run, and why is kept — not among «your modules that did not load».
    await writeFile(builtinFile(root, 'reminders'), remindersAt('0.2.0').replace('Notices what you say', 'Sends what you say'));
    assert.deepEqual(await adoptBuiltinUpdates({ stateRoot: root, factoryKey: FACTORY_PUBLIC }), []);
    assert.equal(reminders().version, '0.1.0');
    assert.match(builtinFailures[0].error, /not the one the factory key signed/);
    assert.equal(loadFailures.some((failed) => failed.id === 'reminders'), false);

    // Taken back by the catalog: back to the package's, and the file is gone.
    market.publish({ version: '0.2.1' });
    await sync(root, market.env);
    assert.deepEqual(await adoptBuiltinUpdates({ stateRoot: root, factoryKey: FACTORY_PUBLIC }), [{ id: 'reminders', from: '0.1.0', to: '0.2.1' }]);
    market.publish({ version: '0.2.1', revoked: [{ id: 'reminders', version: '0.2.1', why: { es: 'Se adelantaba una hora.' } }] });
    const back = await sync(root, market.env);
    assert.deepEqual(back.revoked.map(({ id, version }) => ({ id, version })), [{ id: 'reminders', version: '0.2.1' }]);
    // Said once to the person, with the author's why.
    assert.deepEqual((await marketNews(root)).filter((one) => one.kind === 'returned').map(({ id, why }) => ({ id, why })), [{ id: 'reminders', why: { es: 'Se adelantaba una hora.' } }]);
    await adoptBuiltinUpdates({ stateRoot: root, factoryKey: FACTORY_PUBLIC });
    assert.equal(reminders().version, '0.1.0');
    await assert.rejects(readFile(builtinFile(root, 'reminders')));

    // «Look for new versions» off: the package's, whatever this computer kept.
    market.publish({ version: '0.3.0' });
    await sync(root, market.env);
    assert.equal((await adoptBuiltinUpdates({ stateRoot: root, factoryKey: FACTORY_PUBLIC })).length, 1);
    assert.deepEqual(await adoptBuiltinUpdates({ stateRoot: root, enabled: false, factoryKey: FACTORY_PUBLIC }), []);
    assert.equal(reminders().version, '0.1.0');
  } finally {
    await adoptBuiltinUpdates({ enabled: false });
    await market.close();
    await rm(root, { recursive: true, force: true });
  }
});
