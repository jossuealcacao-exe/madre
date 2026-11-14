// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { askedByPerson, privateAddress, readPreview, webPreview } from '../src/web-preview.mjs';
import { classify, DESTINATIONS } from '../src/outbound.mjs';

const PUBLIC = async () => [{ address: '93.184.216.34', family: 4 }];
const page = (html, { status = 200, type = 'text/html; charset=utf-8', headers = {} } = {}) => new Response(html, { status, headers: { 'content-type': type, ...headers } });

test('web preview: never this computer or its network, in either family', () => {
  for (const address of ['127.0.0.1', '10.0.0.4', '172.20.1.1', '192.168.1.254', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(privateAddress(address), true, address);
  for (const address of ['93.184.216.34', '8.8.8.8', '2606:4700::1111']) assert.equal(privateAddress(address), false, address);
});

test('web preview: a page says its title, site and photo; the photo comes back as a data: address', async () => {
  const preview = readPreview('<head><title>Fallback</title><meta property="og:title" content="Depto &amp; jardín"><meta content="/fotos/1.jpg" property="og:image"><meta property="og:site_name" content="Inmuebles24"></head>', new URL('https://www.example.com/p/1.html'));
  assert.deepEqual([preview.title, preview.site, preview.image], ['Depto & jardín', 'Inmuebles24', 'https://www.example.com/fotos/1.jpg']);

  const asked = [];
  const fetchImpl = async (url) => {
    asked.push(url);
    if (url.endsWith('/p/1.html')) return page('<meta property="og:image" content="https://cdn.example.com/a.jpg"><title>Depto</title>');
    if (url === 'https://cdn.example.com/a.jpg') return page(new Uint8Array([1, 2, 3]), { type: 'image/jpeg' });
    throw new Error(`unexpected ${url}`);
  };
  const got = await webPreview('https://www.example.com/p/1.html', { fetchImpl, resolve: PUBLIC });
  assert.equal(got.ok, true);
  assert.equal(got.title, 'Depto');
  assert.equal(got.image, 'data:image/jpeg;base64,AQID');
  assert.deepEqual(asked, ['https://www.example.com/p/1.html', 'https://cdn.example.com/a.jpg']);
  // The log of what left the Mac names these as asked for by the person, not as undeclared.
  assert.equal(askedByPerson('https://cdn.example.com/a.jpg'), true);
  assert.equal(classify('https://cdn.example.com/a.jpg').id, 'web-page');
  assert.equal(classify('https://never-asked.example.net/x').id, 'unknown');
  assert.ok(DESTINATIONS.find((one) => one.id === 'web-page'));
});

test('web preview: a link to the network, or a redirect into it, is refused before anything is sent', async () => {
  let sent = 0;
  const fetchImpl = async (url) => {
    sent += 1;
    if (url === 'https://bounce.example.com/') return new Response(null, { status: 302, headers: { location: 'http://192.168.1.1/admin' } });
    return page('<title>x</title>');
  };
  const resolve = async (host) => [{ address: host === 'router.example.com' ? '192.168.1.1' : '93.184.216.34' }];
  assert.equal((await webPreview('http://127.0.0.1:4317/api/state', { fetchImpl, resolve })).error, 'private');
  assert.equal((await webPreview('http://router.example.com/', { fetchImpl, resolve })).error, 'private');
  assert.equal((await webPreview('file:///etc/passwd', { fetchImpl, resolve })).error, 'bad-url');
  assert.equal(sent, 0, 'nothing left for an address on this network');
  assert.equal((await webPreview('https://bounce.example.com/', { fetchImpl, resolve })).error, 'private');
  assert.equal(sent, 1, 'the redirect was followed by hand and stopped at the lock');
});

test('web preview: a page that does not answer is said so, and asked again next time', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return page('no', { status: 403 }); };
  assert.deepEqual(await webPreview('https://blocked.example.com/a', { fetchImpl, resolve: PUBLIC }), { ok: false, error: 'refused', status: 403 });
  await webPreview('https://blocked.example.com/a', { fetchImpl, resolve: PUBLIC });
  assert.equal(calls, 2, 'a refusal is not kept');
});
