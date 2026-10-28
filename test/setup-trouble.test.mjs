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
