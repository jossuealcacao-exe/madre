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

// D-48 (1.1.3, WSL, 2026-11-16): a lock left by a MADRE that ended abruptly names a process number
// the system later gave to another program, so it looked alive forever and every write waited its
// thirty seconds and failed. A lock older than any write ever takes is left behind, whoever the
// number belongs to now.
test('event store · a lock left long ago is taken back even if its process number is in use again (D-48)', async () => {
  const { utimes } = await import('node:fs/promises');
  const { STALE_LOCK_MS } = await import('../src/event-store.mjs');
  const root = await mkdtemp(join(tmpdir(), 'madre-lock-stale-'));
  const file = join(root, 'events.jsonl');
  try {
    const store = await new EventStore(file, { lockWaitMs: 2000 }).initialize();
    await mkdir(`${file}.lock`);
    // A live number (this very process), as a reused one would be.
    await writeFile(join(`${file}.lock`, 'owner.json'), JSON.stringify({ pid: process.pid, token: 'gone' }));
    const old = new Date(Date.now() - STALE_LOCK_MS - 60_000);
    await utimes(`${file}.lock`, old, old);
    const started = Date.now();
    const event = await store.append('message.created', { text: 'hola' });
    assert.equal(event.sequence, 1);
    assert.ok(Date.now() - started < 1500, 'it waited for a lock nobody holds');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
