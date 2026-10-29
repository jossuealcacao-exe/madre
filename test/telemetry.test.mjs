// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Telemetry, errorEntry, ownFrames, telemetryOn, telemetryDir } from '../src/telemetry.mjs';
import { ErrorSentinel } from '../src/sentinel-errors.mjs';


test('telemetry: on unless the person or the environment said no', () => {
  assert.equal(telemetryOn({}, {}), true);
  assert.equal(telemetryOn({ telemetry: { diagnostics: false } }, {}), false);
  assert.equal(telemetryOn({}, { PULSE_TELEMETRY: '0' }), false);
});

test('telemetry: an error leaves with nothing that names the person or the machine', () => {
  const entry = errorEntry({
    kind: 'route', where: 'POST /api/x',
    message: 'ENOENT: no such file /Users/ana/Proyectos/tienda-web/notes.md for ana@example.com with sk-abcdefghijklmnopqrstuvwx',
    stack: 'Error: x\n    at read (/Users/ana/.npm/_npx/123/node_modules/madre/src/files.mjs:44:9)\n    at node:internal/fs:1:1',
  }, { home: '/Users/ana', user: 'ana' });
  assert.doesNotMatch(entry.message, /ana|example\.com|sk-abc|tienda-web/);
  assert.deepEqual(entry.frames, ['src/files.mjs:44'], 'only MADRE\'s own lines, as places in its code');
  assert.match(entry.fp, /^[0-9a-f]{16}$/);
  // The same failure with other numbers and other quoted names is the same fingerprint.
  const one = errorEntry({ kind: 'agent', agent: 'codex', message: 'timed out after 180000 ms on "plan A"' });
  const two = errorEntry({ kind: 'agent', agent: 'codex', message: 'timed out after 90000 ms on "plan B"' });
  assert.equal(one.fp, two.fp);
  assert.notEqual(one.fp, errorEntry({ kind: 'agent', agent: 'claude', message: 'timed out after 1 ms on "x"' }).fp, 'another agent is another row');
  // A kind, a code or an agent it does not know is not passed on as said.
  const odd = errorEntry({ kind: 'evil', code: 'DROP TABLE', agent: '../../x' });
  assert.deepEqual([odd.kind, odd.code, odd.agent], ['other', null, null]);
  // A page names its scripts by their address: they are MADRE's own places too.
  assert.deepEqual(ownFrames('at http://127.0.0.1:4317/app.js:12:4\n    at https://evil.example/x.js:1:1'), ['public/app.js:12']);
});

test('telemetry: counts and failures are kept per day, sent as one batch and then forgotten', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-telemetry-'));
  try {
    const kept = new Telemetry({ root, version: '1.0.6', now: () => new Date('2026-10-28T12:00:00Z') });
    kept.count('turn.codex'); kept.count('turn.codex'); kept.count('mode.3');
    kept.count('Not A Key!');
    kept.gauge('agents.ready', 2); kept.gauge('agents.ready', 3);
    kept.error({ kind: 'agent', code: 'MU-012', agent: 'codex', message: 'rate limited' });
    kept.error({ kind: 'agent', code: 'MU-012', agent: 'codex', message: 'rate limited' });
    await kept.settled();
    const next = await kept.preview();
    assert.equal(next.v, 1);
    assert.match(next.id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(Object.keys(next).sort(), ['arch', 'days', 'errors', 'id', 'node', 'os', 'v', 'version', 'wsl'].sort(), 'nothing else leaves');
    assert.deepEqual(next.days, [{ day: '2026-10-28', counts: { 'turn.codex': 2, 'mode.3': 1 }, gauges: { 'agents.ready': 3 } }]);
    assert.equal(next.errors.length, 1);
    assert.equal(next.errors[0].count, 2);
    assert.equal(next.errors[0].code, 'MU-012');
    const sent = [];
    const ok = await kept.flush({ url: 'http://madre.test/api/telemetry', fetchImpl: async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); } });
    assert.deepEqual(ok, { sent: true, days: 1, errors: 1 });
    assert.equal(sent.length, 1);
    assert.deepEqual((await readdir(telemetryDir(root))).filter((name) => !name.startsWith('.')), [], 'what was sent is forgotten');
    // Offline: kept, and sent with the next one.
    kept.count('turn.claude');
    const failed = await kept.flush({ url: 'http://madre.test/api/telemetry', fetchImpl: async () => { throw new Error('offline'); } });
    assert.equal(failed.sent, false);
    kept.count('turn.claude');
    const later = [];
    await kept.flush({ url: 'http://madre.test/api/telemetry', fetchImpl: async (url, init) => { later.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); } });
    assert.deepEqual(later[0].days[0].counts, { 'turn.claude': 2 }, 'the batch that failed went with the next one, once');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('telemetry: turned off, nothing is kept and nothing goes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-telemetry-off-'));
  try {
    const kept = new Telemetry({ root, enabled: () => false });
    kept.count('turn.codex');
    kept.error({ kind: 'crash', message: 'boom' });
    await kept.settled();
    assert.deepEqual(await readdir(root).catch(() => []), []);
    assert.equal((await kept.flush({ fetchImpl: async () => { throw new Error('must not send'); } })).reason, 'off');
    // Turning it off forgets what was waiting.
    await writeFile(join(root, 'x'), '');
    const on = new Telemetry({ root });
    on.count('turn.codex');
    await on.forget();
    assert.deepEqual((await readdir(root)).filter((name) => name === 'telemetry'), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('telemetry: the sentinel tells every failure, the ones Diagnostics knows with their code', async () => {
  const told = [];
  const sentinel = new ErrorSentinel({ agents: [{ id: 'codex', detected: true, version: '0.9.1' }], told: (input) => told.push(input) });
  await sentinel.observe({ type: 'message.failed', payload: { target: 'codex', error: 'something nobody has ever seen 42' } });
  await sentinel.observe({ type: 'message.failed', payload: { target: 'codex', error: 'stopped', stopped: true } });
  assert.equal(told.length, 1, 'a turn the human stopped is not a failure');
  assert.deepEqual([told[0].kind, told[0].agent, told[0].agentVersion, told[0].code], ['agent', 'codex', '0.9.1', null]);
  await sentinel.crash(new Error('boom'), 'uncaughtException');
  assert.equal(told[1].kind, 'crash');
});
