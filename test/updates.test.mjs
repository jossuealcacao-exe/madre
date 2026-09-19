import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, detectInstall, updateCommand, releaseUrl, checkForUpdate, applyCommand } from '../src/updates.mjs';

test('updates: versions compare as releases, the launch mode picks the command, the registry is read once a day', async () => {
  assert.equal(compareVersions('0.3.0', '0.3.1'), -1);
  assert.equal(compareVersions('0.3.10', '0.3.9'), 1);
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('0.3.1-beta.1', '0.3.1'), 0, 'pre-release tags do not count');
  assert.equal(detectInstall({ script: '/Users/x/.npm/_npx/abc/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'npx');
  assert.equal(detectInstall({ script: '/Users/x/amethyst/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'project');
  assert.equal(detectInstall({ script: '/opt/homebrew/lib/node_modules/@jossuealcala/madre/bin/madre.mjs', projectRoot: '/Users/x/amethyst' }), 'global');
  assert.equal(detectInstall({ script: '/Users/x/pulse/bin/madre.mjs', projectRoot: '/Users/x/pulse' }), 'source');
  assert.equal(updateCommand('npx', '@jossuealcala/madre', '0.3.2'), 'npx @jossuealcala/madre@0.3.2 start');
  assert.equal(updateCommand('project', '@jossuealcala/madre', '0.3.2'), 'npm install @jossuealcala/madre@0.3.2');
  assert.equal(applyCommand({ install: 'npx', name: '@jossuealcala/madre', version: '0.3.2', port: 4317, projectRoot: '/Users/x/Pangea OS' }), "exec npx -y @jossuealcala/madre@0.3.2 start --no-open --port 4317 --project '/Users/x/Pangea OS'");
  assert.match(applyCommand({ install: 'project', name: '@jossuealcala/madre', version: '0.3.2', port: 4319, projectRoot: '/p' }), /^npm install @jossuealcala\/madre@0\.3\.2 --no-fund --no-audit && exec npx --no madre start --no-open --port 4319 --project '\/p'$/);
  assert.match(applyCommand({ install: 'global', name: '@jossuealcala/madre', version: '0.3.2', port: 4317, projectRoot: '/p' }), /^npm install -g .* && exec madre start/);
  assert.equal(applyCommand({ install: 'source', name: 'x', version: '1', port: 1, projectRoot: '/p' }), null, 'from source the human pulls');
  assert.equal(releaseUrl({ type: 'git', url: 'git+https://github.com/jossuealcacao-exe/madre.git' }, '0.3.2'), 'https://github.com/jossuealcacao-exe/madre/releases/tag/v0.3.2');

  const root = await mkdtemp(join(tmpdir(), 'pulse-updates-'));
  try {
    const cacheFile = join(root, 'updates.json');
    const calls = [];
    const fetchImpl = async (url) => { calls.push(url); return { ok: true, json: async () => ({ version: '0.3.2' }) }; };
    const first = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 });
    assert.deepEqual({ available: first.available, latest: first.latest, source: first.source, enabled: first.enabled }, { available: true, latest: '0.3.2', source: 'registry', enabled: true });
    assert.equal(calls[0], 'https://registry.npmjs.org/@jossuealcala%2Fmadre/latest');
    assert.deepEqual(JSON.parse(await readFile(cacheFile, 'utf8')), { name: '@jossuealcala/madre', latest: '0.3.2', checkedAt: 1000 });
    const second = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 + 60 * 60 * 1000 });
    assert.deepEqual([second.source, calls.length], ['cache', 1], 'within a day the cache answers');
    const third = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile, fetchImpl, now: 1000 + 25 * 60 * 60 * 1000 });
    assert.deepEqual([third.source, calls.length], ['registry', 2], 'after a day it asks again');
    const off = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.2', cacheFile, fetchImpl, now: 1000 + 50 * 60 * 60 * 1000, enabled: false });
    assert.deepEqual([off.source, off.available, calls.length], ['cache', false, 2], 'disabled: cache only, never the network, and equal versions are not an update');
    const down = await checkForUpdate({ name: '@jossuealcala/madre', current: '0.3.1', cacheFile: join(root, 'none.json'), fetchImpl: async () => { throw new Error('offline'); }, now: 5 });
    assert.deepEqual([down.source, down.latest, down.available, down.error], ['error', null, false, 'offline']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
