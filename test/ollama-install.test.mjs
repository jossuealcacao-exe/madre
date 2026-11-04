import test from 'node:test';
import assert from 'node:assert/strict';
import { adminHere, ollamaInstallPlan, ollamaUpdatePlan } from '../src/modules/ollama.mjs';
import { setLanguage } from '../src/i18n.mjs';

const SCRIPT = 'curl -fsSL https://ollama.com/install.sh | sh';
// A sudo probe that answers what the test says and counts how often it was asked. sudo itself
// never runs here.
const probe = (answer) => { const fn = async () => { fn.calls += 1; return answer; }; fn.calls = 0; return fn; };

test('Linux as root: the install script runs from MADRE, and sudo is not even asked', async () => {
  const sudo = probe(false);
  const admin = await adminHere({ platform: 'linux', uid: 0, sudo });
  assert.equal(admin, true);
  assert.equal(sudo.calls, 0);
  const plan = ollamaInstallPlan({ platform: 'linux', admin });
  assert.deepEqual([plan.command, plan.args, plan.display], ['sh', ['-c', SCRIPT], SCRIPT]);
  assert.equal(ollamaUpdatePlan({ platform: 'linux', admin }).command, 'sh');
});

test('Linux with sudo that needs no password: same as root', async () => {
  const sudo = probe(true);
  const admin = await adminHere({ platform: 'linux', uid: 1000, sudo });
  assert.equal(admin, true);
  assert.equal(sudo.calls, 1);
  assert.equal(ollamaInstallPlan({ platform: 'linux', admin }).command, 'sh');
  assert.equal(ollamaUpdatePlan({ platform: 'linux', admin }).command, 'sh');
});

test('Linux without passwordless sudo: nothing runs, the command is handed over for a terminal', async () => {
  const admin = await adminHere({ platform: 'linux', uid: 1000, sudo: probe(false) });
  assert.equal(admin, false);
  setLanguage('es');
  for (const plan of [ollamaInstallPlan({ platform: 'linux', admin }), ollamaUpdatePlan({ platform: 'linux', admin })]) {
    assert.equal(plan.command, null, 'a script that would stop at a password prompt nobody sees is not started');
    assert.equal(plan.manual, true);
    assert.equal(plan.display, SCRIPT);
    assert.equal(plan.download, undefined);
    assert.match(plan.note, /contraseña de administrador/);
    assert.match(plan.note, /terminal/);
  }
  assert.match(ollamaUpdatePlan({ platform: 'linux', admin }).note, /modelos se quedan/);
  setLanguage('en');
  assert.match(ollamaInstallPlan({ platform: 'linux', admin }).note, /administrator password.*terminal.*RECHECK/);
  setLanguage('es');
});

test('the sudo question is only asked on Linux', async () => {
  for (const platform of ['darwin', 'win32']) {
    const sudo = probe(false);
    assert.equal(await adminHere({ platform, uid: 501, sudo }), true);
    assert.equal(sudo.calls, 0);
  }
  // Elsewhere `admin` changes nothing: macOS still goes through Homebrew or the download.
  assert.equal(ollamaInstallPlan({ platform: 'darwin', brew: '/opt/homebrew/bin/brew', admin: false }).command, '/opt/homebrew/bin/brew');
});

// WIN-029: Ollama's script stops with «requires zstd» on a fresh Ubuntu. With apt, zstd goes first.
test('Linux without zstd: the line installs zstd first, and the one handed over says sudo', async () => {
  const zstdFirst = `sudo -n apt-get install -y zstd && ${SCRIPT}`;
  const run = ollamaInstallPlan({ platform: 'linux', admin: true, zstd: false, apt: true });
  assert.deepEqual([run.command, run.args, run.display], ['sh', ['-c', zstdFirst], zstdFirst]);
  assert.deepEqual(ollamaUpdatePlan({ platform: 'linux', admin: true, zstd: false, apt: true }).args, ['-c', zstdFirst]);
  assert.equal(ollamaInstallPlan({ platform: 'linux', admin: false, zstd: false, apt: true }).display, `sudo apt-get install -y zstd && ${SCRIPT}`);
  // With zstd, or without apt to install it, the script is Ollama's own, as before.
  assert.equal(ollamaInstallPlan({ platform: 'linux', admin: true, zstd: true, apt: true }).display, SCRIPT);
  assert.equal(ollamaInstallPlan({ platform: 'linux', admin: true, zstd: false, apt: false }).display, SCRIPT);
});

// D-2 (diagnostics of 1.1.2, 2026-11-03): Ollama's script deletes lib/ollama and unpacks the whole
// bundle in one stream. Cut halfway, bin/ollama stays without llama-server, or cannot run.
test('ollama · an install cut halfway is seen as not installed, gets an hour, and its error is named', async () => {
  const { mkdtemp, mkdir, writeFile, chmod, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { ollamaHalfway, ollamaUpdatePlan, OLLAMA_INSTALL_MS } = await import('../src/modules/ollama.mjs');
  const { realpath } = await import('node:fs/promises');
  // The real path: on macOS the temporary folder is reached through a link (/var → /private/var).
  const root = await realpath(await mkdtemp(join(tmpdir(), 'madre-ollama-half-')));
  try {
    const binary = join(root, 'bin', 'ollama');
    await mkdir(join(root, 'bin'), { recursive: true });
    await writeFile(binary, '#!/bin/sh\n');
    await chmod(binary, 0o755);
    const here = { platform: 'linux', scriptRoot: root };
    assert.equal(await ollamaHalfway(binary, here), true, 'no lib/ollama beside it');
    await mkdir(join(root, 'lib', 'ollama'), { recursive: true });
    assert.equal(await ollamaHalfway(binary, here), true, 'lib/ollama empty');
    await writeFile(join(root, 'lib', 'ollama', 'llama-server'), '');
    assert.equal(await ollamaHalfway(binary, here), false, 'whole');
    await chmod(binary, 0o644);
    assert.equal(await ollamaHalfway(binary, here), true, 'a binary that cannot run');
    await chmod(binary, 0o755);
    // Elsewhere (Homebrew, a package, the Mac) the layout is not the script's: never called halfway.
    await rm(join(root, 'lib'), { recursive: true });
    assert.equal(await ollamaHalfway(binary, { platform: 'linux', scriptRoot: '/usr/local' }), false);
    assert.equal(await ollamaHalfway(binary, { platform: 'darwin', scriptRoot: root }), false);
    assert.equal(await ollamaHalfway(null, here), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(OLLAMA_INSTALL_MS, 3600000);
  assert.equal(ollamaUpdatePlan({ platform: 'linux' }).timeoutMs, OLLAMA_INSTALL_MS);
  const { diagnose } = await import('../public/troubleshooting.js');
  const said = 'Ollama HTTP 500: {"error":"error starting llama-server: llama-server binary not found (checked: /usr/local/lib/ollama/llama-server)"}';
  assert.ok(diagnose(said, 'madre').some((one) => one.code === 'MU-076'));
});
