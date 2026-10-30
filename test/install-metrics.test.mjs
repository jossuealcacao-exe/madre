// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { environmentGauges, noteLifecycle, presenceBody, presenceUrl, sayPresent } from '../src/install-metrics.mjs';

test('install metrics: the environment leaves as numbers and MADRE\'s own words, never a path, a project or a module the person wrote', () => {
  const gauges = environmentGauges({
    cores: 10, ramBytes: 16 * 1024 ** 3, language: 'es', install: 'npx', shell: '/bin/zsh',
    ollama: { running: true, models: 2 },
    agents: [{ id: 'claude', detected: true, ready: true }, { id: 'codex', detected: true, ready: false }, { id: 'Bad Id', detected: true }],
    projects: { total: 12, open: 3 },
    modules: ['notes', 'mi-modulo-secreto-de-cliente'], ownModules: new Set(['notes', 'playwright']),
    ageDays: 41.7,
  });
  assert.deepEqual(gauges, {
    'env.cores': 10, 'env.ram': 16, 'env.lang.es': 1, 'env.channel.npx': 1, 'env.shell.zsh': 1,
    'env.ollama': 1, 'env.ollama.on': 1, 'env.ollama.models': 2,
    'agent.claude': 1, 'agent.claude.ready': 1, 'agent.codex': 1, 'agents.ready': 1,
    'projects.total': 12, 'projects.open': 3,
    'module.notes': 1, 'modules.on': 2, 'modules.other': 1,
    'install.age': 41,
  });
  for (const key of Object.keys(gauges)) assert.match(key, /^[a-z0-9][a-z0-9._:-]{0,47}$/, 'every key fits what madre.run accepts');
  assert.ok(!JSON.stringify(gauges).includes('cliente'), 'a module of the person is never named');
  assert.equal(environmentGauges({ shell: 'C:\\Windows\\System32\\cmd.exe' })['env.shell.other'], 1);
});

test('install metrics: installed once, updated once per newer version, never for going back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-life-'));
  assert.equal((await noteLifecycle({ root, version: '1.1.0', hadId: false })).event, 'install');
  assert.equal((await noteLifecycle({ root, version: '1.1.0', hadId: true })).event, null);
  assert.equal((await noteLifecycle({ root, version: '1.1.1', hadId: true })).event, 'update');
  assert.equal((await noteLifecycle({ root, version: '1.1.0', hadId: true })).event, null, 'an older version is no update');
  const other = await mkdtemp(join(tmpdir(), 'madre-life-'));
  assert.equal((await noteLifecycle({ root: other, version: '1.1.0', hadId: true })).event, 'update', 'a copy from before 1.1.0 updated');
  const kept = JSON.parse(await readFile(join(root, 'lifecycle.json'), 'utf8'));
  assert.equal(kept.version, '1.1.0');
  assert.ok(Date.parse(kept.first));
});

test('install metrics: presence says only the id, the version and the system, once every few minutes, and never to madre.run from a test or a QA house', async () => {
  assert.deepEqual(Object.keys(presenceBody({ id: 'x', version: '1.1.0', platform: 'darwin' })), ['id', 'version', 'os']);
  assert.equal(presenceUrl({}), 'https://madre.run/api/presence');
  assert.equal(presenceUrl({ PULSE_TELEMETRY_URL: 'http://127.0.0.1:9/api/telemetry' }), 'http://127.0.0.1:9/api/presence');
  assert.equal(presenceUrl({ PULSE_PRESENCE_URL: 'http://127.0.0.1:9/p', PULSE_TELEMETRY_URL: 'x' }), 'http://127.0.0.1:9/p');
  const root = await mkdtemp(join(tmpdir(), 'madre-here-'));
  await writeFile(join(root, 'install-id'), '00000000-0000-4000-8000-000000000001\n');
  const sent = [];
  const fetchImpl = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 204 }; };
  const now = Date.now();
  assert.equal((await sayPresent({ root, version: '1.1.0', fetchImpl, url: 'http://127.0.0.1:9/api/presence', now })).sent, true);
  assert.equal((await sayPresent({ root, version: '1.1.0', fetchImpl, url: 'http://127.0.0.1:9/api/presence', now: now + 60_000 })).reason, 'recent');
  assert.equal((await sayPresent({ root, version: '1.1.0', fetchImpl, url: 'http://127.0.0.1:9/api/presence', now: now + 5 * 60_000 })).sent, true);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].body, { id: '00000000-0000-4000-8000-000000000001', version: '1.1.0', os: ['darwin', 'linux', 'win32'].includes(process.platform) ? process.platform : 'other' });
});
