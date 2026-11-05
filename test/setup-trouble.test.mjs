import test from 'node:test';
import assert from 'node:assert/strict';
import { installTrouble, loginTrouble } from '../src/setup-trouble.mjs';

// Why an install or a sign-in went wrong (2026-10-28), read from what the program printed, so Home
// can say it in plain words instead of dropping it.
test('setup trouble · an install says why it failed: no internet, no permission, no space, no npm, too long', () => {
  assert.equal(installTrouble('npm error code ENOTFOUND\nnpm error network request to https://registry.npmjs.org/@openai%2fcodex failed'), 'network');
  assert.equal(installTrouble('npm error code ECONNREFUSED'), 'network');
  assert.equal(installTrouble('npm error code EACCES\nnpm error syscall mkdir'), 'permission');
  assert.equal(installTrouble('npm error code ENOSPC'), 'disk');
  assert.equal(installTrouble('spawn npm ENOENT'), 'npm-missing');
  assert.equal(installTrouble("'npm' is not recognized as an internal or external command"), 'npm-missing');
  assert.equal(installTrouble('ERROR: This version requires zstd for extraction. Please install zstd and try again:'), 'zstd-missing');
  assert.equal(installTrouble('the install timed out after 600000 ms'), 'timeout');
  assert.equal(installTrouble('something nobody planned for'), 'unknown');
});

test('setup trouble · a sign-in says why it did not finish: refused, cancelled, no internet, too long', () => {
  assert.equal(loginTrouble({ refused: true, text: 'anything' }), 'refused-account');
  assert.equal(loginTrouble({ text: 'cancelled \n' }), 'cancelled');
  assert.equal(loginTrouble({ text: 'getaddrinfo ENOTFOUND oauth2.googleapis.com' }), 'network');
  assert.equal(loginTrouble({ text: 'timed out after 900000 ms' }), 'timeout');
  assert.equal(loginTrouble({ text: 'exit 1' }), 'unknown');
});

// D-3 (two copies of 1.1.1 in WSL, 2026-11-01): Ollama could not look up its registry. It read as a
// download that took too long, «try again», and the card was MU-068; nothing said this Linux finds
// no names, or what to do about it in WSL.
test('setup trouble · a name nobody could look up is DNS, not a download that took too long (D-3)', async () => {
  const seen = [
    'pull model manifest: Get "https://registry.ollama.ai/v2/library/qwen2.5/manifests/0.5b": dial tcp: lookup registry.ollama.ai on 10.255.255.254:53: read udp 10.255.255.254:58749->10.255.255.254:53: i/o timeout',
    'max retries exceeded: Get "https://x.r2.cloudflarestorage.com/blob": lookup x.r2.cloudflarestorage.com on 10.255.255.254:53: read udp 10.255.255.254:54401->10.255.255.254:53: i/o timeout',
    'dial tcp: lookup registry.ollama.ai: no such host',
    'curl: (6) Could not resolve host: registry.ollama.ai; Temporary failure in name resolution',
  ];
  for (const said of seen) assert.equal(installTrouble(said), 'dns', said);
  // Node's own words for a missing name stay as they were: no internet.
  assert.equal(installTrouble('npm error code ENOTFOUND\nnpm error network request to https://registry.npmjs.org/x failed'), 'network');
  // Diagnostics opens the DNS card first, with the steps for WSL.
  const { diagnose, fixesFor } = await import('../public/troubleshooting.js');
  for (const said of seen.slice(0, 2)) assert.equal(diagnose(said).find((card) => card.severity === 'blocking')?.code, 'MU-082', said);
  const card = diagnose(seen[0]).find((one) => one.code === 'MU-082');
  assert.ok(fixesFor(card, 'wsl').includes('wsl --shutdown'));
  // The pages say it in their words and open that card, not «try again».
  const { readFile } = await import('node:fs/promises');
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(welcome, /\n  dns: \(\) => t\('This computer could not find the address it downloads from \(DNS\)/);
  assert.equal(welcome.match(/pull\.trouble === 'dns' \? 'name-lookup'/g)?.length, 2, 'a model download that found no names opens another card');
  assert.match(welcome, /TROUBLE_CARD = \{[^}]*dns: 'name-lookup'/);
  assert.match(home, /\n    dns: \(\) => t\('This computer could not find the address it downloads from \(DNS\)/);
  assert.match(home, /install: \{[^}]*dns: 'name-lookup'/);
});
