// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

// D-40 (1.1.2, WSL, 2026-11-10): a long message — a log or a file pasted whole — was refused at
// 100 KB, the limit meant for small settings, with «Request too large.» in English and counted as
// a failure of MADRE's in the diagnostics. Messages take up to a megabyte; past it the person is
// told in plain words to attach it as a file, and it is not counted as MADRE failing.
test('messages: a long paste goes through, a huge one is told to go as a file (D-40)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-message-size-'));
  const project = join(root, 'project');
  const state = join(root, 'state');
  await mkdir(project, { recursive: true });
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {} }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const send = (text) => fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ text, target: 'codex' }) });
    const long = await send('x'.repeat(300_000));
    assert.notEqual(long.status, 413, 'a 300 KB message was refused as too large');
    assert.doesNotMatch((await long.json().catch(() => ({}))).error ?? '', /too large|too long|demasiado/i, 'a 300 KB message was refused as too large');
    const huge = await send('x'.repeat(1_200_000));
    assert.equal(huge.status, 413);
    const said = (await huge.json()).error;
    assert.match(said, /attach it as a file|adjúntalo como archivo/i);
    assert.doesNotMatch(said, /Request too large/);
  } finally {
    await new Promise((resolve) => (server ? server.close(() => resolve()) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
