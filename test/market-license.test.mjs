import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { activateLicense, isLicensed, licensedIds, mayInstall, releaseLicense, saleOf } from '../src/market-license.mjs';
import { readCatalog } from '../src/market-remote.mjs';

// The Market's paid modules (2026-10-19): Lemon Squeezy is asked once, when the person activates.
const entry = { id: 'informe', price: 9, license: { provider: 'lemonsqueezy', store: 111, product: 222 } };
const lemon = (answers) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const fields = Object.fromEntries(new URLSearchParams(init.body));
    calls.push({ path: url.split('/').at(-1), fields, headers: init.headers });
    const answer = answers[url.split('/').at(-1)];
    return { status: 200, json: async () => (typeof answer === 'function' ? answer(fields) : answer) };
  };
  return { calls, fetchImpl };
};
const good = { activated: true, error: null, instance: { id: 'inst-1' }, meta: { store_id: 111, product_id: 222, customer_email: 'x@y.z' } };

test('a paid module needs its license: activated once, kept privately, for this product only, then released', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-license-'));
  try {
    assert.equal(await mayInstall(stateRoot, { id: 'gratis', price: 0 }), true, 'a free module needs nothing');
    assert.equal(await mayInstall(stateRoot, entry), false);

    const fake = lemon({ activate: good, deactivate: { deactivated: true, error: null } });
    await activateLicense({ stateRoot, entry, key: 'ABCD-1234-EFGH-5678', installId: '1a2b3c4d-0000-4000-8000-000000000000', fetchImpl: fake.fetchImpl, api: 'https://lemon.test/v1/licenses' });
    assert.deepEqual(fake.calls[0].fields, { license_key: 'ABCD-1234-EFGH-5678', instance_name: 'MADRE 1a2b3c4d' }, 'only the key and the random install id travel');
    assert.equal(fake.calls[0].headers['content-type'], 'application/x-www-form-urlencoded');
    assert.equal(await isLicensed(stateRoot, 'informe'), true);
    assert.equal(await mayInstall(stateRoot, entry), true);
    const kept = join(stateRoot, 'market', 'licenses.json');
    assert.equal((await stat(kept)).mode & 0o777, 0o600, 'the keys are readable only by this person');
    assert.ok(!(await readFile(kept, 'utf8')).includes('x@y.z'), 'nothing about the buyer is kept');
    assert.deepEqual(Object.keys((await licensedIds(stateRoot)).informe), ['at'], 'the page learns what is bought, never the key');

    await releaseLicense({ stateRoot, id: 'informe', fetchImpl: fake.fetchImpl, api: 'https://lemon.test/v1/licenses' });
    assert.deepEqual(fake.calls.at(-1).fields, { license_key: 'ABCD-1234-EFGH-5678', instance_id: 'inst-1' });
    assert.equal(await isLicensed(stateRoot, 'informe'), false);
  } finally { await rm(stateRoot, { recursive: true, force: true }); }
});

test('a key for another product, a full key and a typo are refused, and the wrong activation is given back', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-license-'));
  try {
    const other = lemon({ activate: { ...good, meta: { store_id: 111, product_id: 999 } }, deactivate: { deactivated: true } });
    await assert.rejects(activateLicense({ stateRoot, entry, key: 'ABCD-1234-EFGH-5678', installId: 'x', fetchImpl: other.fetchImpl }), /another product/);
    assert.deepEqual(other.calls.map((call) => call.path), ['activate', 'deactivate'], 'the activation it took is released at once');
    const full = lemon({ activate: { activated: false, error: 'This license key has reached the activation limit.' } });
    await assert.rejects(activateLicense({ stateRoot, entry, key: 'ABCD-1234-EFGH-5678', installId: 'x', fetchImpl: full.fetchImpl }), /as many computers as it allows/);
    await assert.rejects(activateLicense({ stateRoot, entry, key: 'no es', installId: 'x', fetchImpl: full.fetchImpl }), /does not look like a license key/);
    await assert.rejects(activateLicense({ stateRoot, entry: { id: 'gratis', price: 0 }, key: 'ABCD-1234-EFGH-5678', installId: 'x', fetchImpl: full.fetchImpl }), /not sold through the Market/);
    assert.equal(await isLicensed(stateRoot, 'informe'), false);
  } finally { await rm(stateRoot, { recursive: true, force: true }); }
});

test('the catalog carries where a paid module is sold, and only for a paid one', () => {
  const catalog = readCatalog(JSON.stringify({ schema: 1, issued: '2026-10-19T00:00:00.000Z', modules: [
    { id: 'informe', price: 9, checkout: 'https://madre.lemonsqueezy.com/buy/abc', license: { provider: 'lemonsqueezy', store: 111, product: 222 } },
    { id: 'raro', price: 5, checkout: 'http://inseguro.test/buy', license: { provider: 'otro', store: 1, product: 2 } },
    { id: 'gratis', price: 0, checkout: 'https://x.test', license: { provider: 'lemonsqueezy', store: 1, product: 2 } },
  ] }));
  const [informe, raro, gratis] = catalog.modules;
  assert.equal(informe.checkout, 'https://madre.lemonsqueezy.com/buy/abc');
  assert.deepEqual(saleOf(informe), { store: 111, product: 222 });
  assert.deepEqual([raro.checkout, raro.license, saleOf(raro)], [null, null, null]);
  assert.deepEqual([gratis.checkout, gratis.license], [null, null]);
});
