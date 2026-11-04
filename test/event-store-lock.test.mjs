import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore, LOCK_WAIT_MS } from '../src/event-store.mjs';

// L-4 (Carlos's server, 2026-11-04): with every core taken by local models, a write held the
// ledger longer than the 500 tries the others waited — about ten seconds — and the page's reader
// gave up with «Timed out waiting for event store lock». The wait is now clock time.
test('event store · another hand on the ledger is waited for by the clock, not by a count of tries (L-4)', async () => {
  assert.equal(LOCK_WAIT_MS, 30_000);
  const root = await mkdtemp(join(tmpdir(), 'madre-lock-'));
  const file = join(root, 'events.jsonl');
  const held = async (ms) => {
    // A live process holds it (this one, by another token), so it is not taken as left behind.
    await mkdir(`${file}.lock`);
    await writeFile(join(`${file}.lock`, 'owner.json'), JSON.stringify({ pid: process.pid, token: 'other' }));
    setTimeout(() => { void rm(`${file}.lock`, { recursive: true, force: true }); }, ms);
  };
  try {
    const patient = await new EventStore(file, { lockWaitMs: 3000 }).initialize();
    await held(1200);
    const started = Date.now();
    const event = await patient.append('message.created', { text: 'hola' });
    assert.equal(event.sequence, 1);
    assert.ok(Date.now() - started >= 1000, 'it did not wait for the other hand');
    const hasty = await new EventStore(file, { lockWaitMs: 300 }).initialize();
    await held(1200);
    await assert.rejects(hasty.append('message.created', { text: 'otra' }), /Timed out waiting for event store lock/);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    assert.equal((await hasty.append('message.created', { text: 'otra' })).sequence, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
