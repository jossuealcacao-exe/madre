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
