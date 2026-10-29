// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Small files that more than one thing changes at once (2026-10-12, Lote 2 of the 1.0 review): the
// tour, the review ask, a project's record of where it is, the list of a room's conversations.
// Each was read, changed and written with nothing between two changes, so the second one wrote
// over the first — a rename lost to a message arriving, a chapter read lost to a tab saying it
// held the tour — and the drafts had a name per process, so two writes from the same room fought
// over one draft and one of them failed.
//
// `writeWhole` writes a file whole: a draft with a name of its own, renamed over it, so nobody
// ever reads half of one. `oneAtATime` runs one change of a file at a time: in this process by a
// queue, and between the rooms of this Mac by a lock file beside it, as config.json is kept
// (src/config.mjs). A lock left by a process that died is stale after a few seconds.

import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeWhole(file, text, { mode } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const draft = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(draft, text, mode ? { mode } : undefined);
    await rename(draft, file);
  } catch (error) {
    await rm(draft, { force: true }).catch(() => {});
    throw error;
  }
}

const STALE_MS = 5000;
async function lockBeside(file) {
  const lock = `${file}.lock`;
  await mkdir(dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 250; attempt += 1) {
    try {
      await (await open(lock, 'wx')).close();
      return () => rm(lock, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const since = await stat(lock).catch(() => null);
      if (since && Date.now() - since.mtimeMs > STALE_MS) { await rm(lock, { force: true }); continue; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`${file} is being changed by another room; try again.`);
}

const queues = new Map();
export function oneAtATime(file, work) {
  const run = async () => {
    const release = await lockBeside(file);
    try {
      return await work();
    } finally {
      await release();
    }
  };
  const before = queues.get(file) ?? Promise.resolve();
  const turn = before.then(run, run);
  const settled = turn.catch(() => {});
  queues.set(file, settled);
  void settled.then(() => { if (queues.get(file) === settled) queues.delete(file); });
  return turn;
}
