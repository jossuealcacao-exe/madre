import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// On Windows MADRE runs inside WSL2 (1.1.0, docs/WINDOWS.md D-001): started on Windows itself it says
// how to get there, in the person's language, and stops instead of opening halfway.
const BIN = join(import.meta.dirname, '..', 'bin', 'madre.mjs');
const AS_WINDOWS = 'data:text/javascript,Object.defineProperty(process,"platform",{value:"win32"})';
const run = (env) => spawnSync(process.execPath, ['--import', AS_WINDOWS, BIN], { encoding: 'utf8', timeout: 20000, env: { ...process.env, ...env } });

test('windows · started on Windows itself, MADRE explains WSL2 in three steps and stops', () => {
  const spanish = run({ LANG: 'es_MX.UTF-8', LC_ALL: 'es_MX.UTF-8' });
  assert.equal(spanish.status, 1);
  assert.match(spanish.stdout, /wsl --install/);
  assert.match(spanish.stdout, /npx @jossuealcala\/madre/);
  const english = run({ LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' });
  assert.equal(english.status, 1);
  assert.match(english.stdout, /On Windows, MADRE runs inside WSL2/);
});
