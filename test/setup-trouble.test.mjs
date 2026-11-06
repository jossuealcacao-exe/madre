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

// D-20 (a copy of 1.1.2 in WSL, 2026-11-06): «net/http: TLS handshake timeout» from Ollama read as a
// download that took too long («It took too long and was stopped. Try again.»), when the connection to
// the models' server never finished: a VPN, a proxy, a firewall or a very slow network.
test('setup trouble · a connection Ollama could not finish is the network, not a slow download (D-20)', async () => {
  const seen = [
    'pull model manifest: Get "https://registry.ollama.ai/v2/library/qwen2.5/manifests/1.5b": net/http: TLS handshake timeout',
    'pull model manifest: Get "https://registry.ollama.ai/v2/library/qwen2.5/manifests/3b": read tcp 172.20.1.2:51234->104.21.75.227:443: read: connection reset by peer',
    'pull model manifest: Get "https://registry.ollama.ai/v2/library/qwen2.5/manifests/3b": dial tcp 104.21.75.227:443: connect: no route to host',
  ];
  for (const said of seen) assert.equal(installTrouble(said), 'network', said);
  // A download that really ran out of time is still that.
  assert.equal(installTrouble('the install timed out after 600000 ms'), 'timeout');
  // Diagnostics opens the card that names a VPN, a proxy or a firewall before the one about a cut download.
  const { diagnose } = await import('../public/troubleshooting.js');
  const codes = diagnose(seen[0]).map((card) => card.code);
  assert.ok(codes.indexOf('MU-064') >= 0 && codes.indexOf('MU-064') < codes.indexOf('MU-068'), codes.join(', '));
  // The welcome opens that card for a model download that failed on the network.
  const { readFile } = await import('node:fs/promises');
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  assert.equal(welcome.match(/pull\.trouble === 'network' \? 'install-offline'/g)?.length, 2);
});

// D-21 (a copy of 1.1.2 in WSL, 2026-11-06): Undici's «TypeError: terminated» when Ollama drops the
// HTTP connection mid-download read as «terminated · ollama · unknown» and «The download stopped: terminated».
test('setup trouble · Ollama closing mid-download is ollama-closed, not unknown (D-21)', async () => {
  const seen = [
    'terminated',
    'TypeError: terminated',
    'Ollama closed the connection while downloading qwen2.5:1.5b. Check that Ollama is still running and try again; what already arrived stays.',
    'SocketError: other side closed',
  ];
  for (const said of seen) assert.equal(installTrouble(said), 'ollama-closed', said);
  // Diagnostics opens the model-download card (MU-068).
  const { diagnose } = await import('../public/troubleshooting.js');
  const codes = diagnose('terminated').map((card) => card.code);
  assert.ok(codes.includes('MU-068'), codes.join(', '));
  // Welcome and Home say so in their words.
  const { readFile } = await import('node:fs/promises');
  const welcome = await readFile(new URL('../public/welcome.js', import.meta.url), 'utf8');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(welcome, /'ollama-closed': \(\) => t\('Ollama closed the connection/);
  assert.match(welcome, /TROUBLE_CARD = \{[^}]*'ollama-closed': 'model-download'/);
  assert.match(home, /'ollama-closed': \(\) => t\('Ollama closed the connection/);
  assert.match(home, /'ollama-closed': 'model-download'/);
});

// D-21, after the fix: «terminated» anywhere in an installer's output read as Ollama closing, so
// installing an agent could say «Ollama closed the connection while downloading the model»; and
// Home said a failed download with Go's error as it came. Only Ollama's words, or undici's line
// alone, are Ollama closing; Home says why in its own words.
test('setup trouble · «terminated» elsewhere is not Ollama closing, and Home says a failed download in its words (D-21)', async () => {
  for (const said of ['npm error signal SIGTERM\nnpm error command sh -c node install.js\nProcess terminated', 'gpg: signal 15 caught ... terminated', 'Server closed the connection unexpectedly']) {
    assert.notEqual(installTrouble(said), 'ollama-closed', said);
  }
  assert.equal(installTrouble('Ollama cerró la conexión mientras descargaba qwen2.5:1.5b.'), 'ollama-closed', 'the room in Spanish');
  const { diagnose } = await import('../public/troubleshooting.js');
  assert.ok(!diagnose('npm error signal SIGTERM\nProcess terminated').some((card) => card.code === 'MU-068'), 'an npm install got the model-download card');
  const { readFile } = await import('node:fs/promises');
  const home = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  const watch = home.slice(home.indexOf('function watchPull'), home.indexOf('function fillProjects'));
  assert.match(watch, /toast\(TROUBLE_WORDS\.install\[said\.trouble\]\?\.\(\) \?\? /);
  assert.match(watch, /if \(said\.cancelled\) return;/);
});
