// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// A record cut halfway (2026-10-12, LOG-02 of the 1.0 review): a `kill -9`, a power cut or a full
// disk in the middle of an append leaves half a line. Every read used to throw on it, so the
// conversation never opened again — and the next event was written glued to the half line, lost
// with it. Now a line that is not an event is stepped over and counted (`damaged`), never removed:
// the file keeps it for whoever wants to look. And an append that finds the file not ending in a
// newline writes one first, so what comes next starts on a line of its own.
function parseLines(text) {
  const events = [];
  let damaged = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object' && Number.isFinite(event.sequence)) events.push(event);
      else damaged += 1;
    } catch {
      damaged += 1;
    }
  }
  return { events, damaged };
}

export class EventStore {
  #file;
  #damaged = 0;
  #nextSequence = 1;
  #writeQueue = Promise.resolve();
  #lockDirectory;
  #floor = 0;

  // `floor` is the highest sequence the rest of the project has already used. A project keeps one
  // numbering across all of its conversations, so #1411 means one exchange in this project and
  // not one in each thread — the memory index, every citation and NOSTROMO all lean on that.
  // Gaps in a single ledger are fine: sequences are an order, not a count.
  // It may be a function, read at every append, when other conversations of the project are
  // writing at the same time as this one: a number fixed when the ledger opened would hand out
  // a sequence another conversation has taken since.
  constructor(file, { floor = 0 } = {}) {
    this.#file = file;
    this.#floor = typeof floor === 'function' || Number.isFinite(floor) ? floor : 0;
    this.#lockDirectory = `${file}.lock`;
  }

  #floorNow() {
    const value = typeof this.#floor === 'function' ? Number(this.#floor()) : this.#floor;
    return Number.isFinite(value) ? value : 0;
  }

  // The last sequence this ledger handed out (or the floor it opened above).
  get lastSequence() { return this.#nextSequence - 1; }
  // How many lines the last full read stepped over because they were not events.
  get damaged() { return this.#damaged; }

  async initialize() {
    await mkdir(dirname(this.#file), { recursive: true });
    const existing = await this.readAll();
    this.#nextSequence = Math.max(existing.at(-1)?.sequence ?? 0, this.#floorNow()) + 1;
    return this;
  }

  async readAll() {
    const release = await this.#acquireLock();
    try {
      return await this.#readAllUnlocked();
    } finally {
      await release();
    }
  }

  // Reads only the bytes appended after `offset`. Appends are whole lines
  // written under the lock, so a locked read never sees a partial line; the
  // trailing-newline guard is defensive. A shrunken file restarts from zero.
  async tail(offset = 0) {
    const release = await this.#acquireLock();
    try {
      let handle;
      try {
        handle = await open(this.#file, 'r');
      } catch (error) {
        if (error.code === 'ENOENT') return { events: [], offset: 0 };
        throw error;
      }
      try {
        const { size } = await handle.stat();
        const start = size < offset ? 0 : offset;
        if (size === start) return { events: [], offset: start };
        const buffer = Buffer.alloc(size - start);
        await handle.read(buffer, 0, buffer.length, start);
        let text = buffer.toString('utf8');
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline < 0) return { events: [], offset: start };
        text = text.slice(0, lastNewline + 1);
        const { events } = parseLines(text);
        return { events, offset: start + Buffer.byteLength(text, 'utf8') };
      } finally {
        await handle.close();
      }
    } finally {
      await release();
    }
  }

  async #readAllUnlocked() {
    try {
      const { events, damaged } = parseLines(await readFile(this.#file, 'utf8'));
      this.#damaged = damaged;
      return events;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #acquireLock() {
    const token = randomUUID();
    const ownerFile = join(this.#lockDirectory, 'owner.json');
    for (let attempt = 0; attempt < 500; attempt += 1) {
      let created = false;
      try {
        await mkdir(this.#lockDirectory);
        created = true;
        await writeFile(ownerFile, JSON.stringify({ pid: process.pid, token }));
        return async () => {
          try {
            const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
            if (owner.token === token) await rm(this.#lockDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        };
      } catch (error) {
        if (created) {
          await rm(this.#lockDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
          throw error;
        }
        if (error.code !== 'EEXIST') throw error;
        try {
          const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
          try {
            process.kill(owner.pid, 0);
          } catch (ownerError) {
            if (ownerError.code === 'ESRCH') {
              await rm(this.#lockDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
              continue;
            }
          }
        } catch (ownerError) {
          if (ownerError.code !== 'ENOENT' && !(ownerError instanceof SyntaxError)) throw ownerError;
          const lock = await stat(this.#lockDirectory).catch(() => null);
          if (lock && Date.now() - lock.mtimeMs > 10000) {
            await rm(this.#lockDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
            continue;
          }
        }
        await delay(20);
      }
    }
    throw new Error(`Timed out waiting for event store lock: ${this.#file}`);
  }

  // Rewrites every event through `transform` (which returns the event to keep, changed or
  // not), atomically, under the lock, in the same order and with the same sequences. The
  // ledger is append-only for the room; this is the human's hand on it, used by the privacy
  // purge. Appends queued behind it see the new file.
  rewrite(transform) {
    const operation = async () => {
      const release = await this.#acquireLock();
      try {
        const existing = await this.#readAllUnlocked();
        let changed = 0;
        const next = existing.map((event) => {
          const out = transform(event) ?? event;
          if (out !== event) changed += 1;
          return out;
        });
        const temp = `${this.#file}.rewrite-${process.pid}`;
        await writeFile(temp, next.map((event) => JSON.stringify(event)).join('\n') + (next.length ? '\n' : ''));
        await rename(temp, this.#file);
        this.#nextSequence = Math.max(next.at(-1)?.sequence ?? 0, this.#floorNow()) + 1;
        return { total: next.length, changed };
      } finally {
        await release();
      }
    };
    this.#writeQueue = this.#writeQueue.then(operation, operation);
    return this.#writeQueue;
  }

  append(type, payload) {
    const operation = async () => {
      const release = await this.#acquireLock();
      try {
        const existing = await this.#readAllUnlocked();
        const sequence = Math.max(existing.at(-1)?.sequence ?? 0, this.#floorNow()) + 1;
        // Taken in the same tick it was read: another conversation's ledger asks for the floor
        // while this one is still on its way to the disk, and must already see this number as
        // spent. A write that fails leaves a gap, and gaps are fine.
        this.#nextSequence = sequence + 1;
        const event = {
          id: randomUUID(),
          sequence,
          type,
          timestamp: new Date().toISOString(),
          payload,
        };
        const handle = await open(this.#file, 'a+');
        try {
          // A file that does not end in a newline ends in half a line: start on a new one.
          const { size } = await handle.stat();
          const last = Buffer.alloc(1);
          if (size > 0) await handle.read(last, 0, 1, size - 1);
          const lead = size > 0 && last[0] !== 0x0a ? '\n' : '';
          await handle.writeFile(`${lead}${JSON.stringify(event)}\n`);
          await handle.sync();
        } finally {
          await handle.close();
        }
        return event;
      } finally {
        await release();
      }
    };
    this.#writeQueue = this.#writeQueue.then(operation, operation);
    return this.#writeQueue;
  }
}
