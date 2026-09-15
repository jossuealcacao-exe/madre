import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export class EventStore {
  #file;
  #nextSequence = 1;
  #writeQueue = Promise.resolve();
  #lockDirectory;

  constructor(file) {
    this.#file = file;
    this.#lockDirectory = `${file}.lock`;
  }

  async initialize() {
    await mkdir(dirname(this.#file), { recursive: true });
    const existing = await this.readAll();
    this.#nextSequence = (existing.at(-1)?.sequence ?? 0) + 1;
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

  async #readAllUnlocked() {
    try {
      const text = await readFile(this.#file, 'utf8');
      return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
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
            if (owner.token === token) await rm(this.#lockDirectory, { recursive: true, force: true });
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        };
      } catch (error) {
        if (created) {
          await rm(this.#lockDirectory, { recursive: true, force: true });
          throw error;
        }
        if (error.code !== 'EEXIST') throw error;
        try {
          const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
          try {
            process.kill(owner.pid, 0);
          } catch (ownerError) {
            if (ownerError.code === 'ESRCH') {
              await rm(this.#lockDirectory, { recursive: true, force: true });
              continue;
            }
          }
        } catch (ownerError) {
          if (ownerError.code !== 'ENOENT' && !(ownerError instanceof SyntaxError)) throw ownerError;
          const lock = await stat(this.#lockDirectory).catch(() => null);
          if (lock && Date.now() - lock.mtimeMs > 10000) {
            await rm(this.#lockDirectory, { recursive: true, force: true });
            continue;
          }
        }
        await delay(20);
      }
    }
    throw new Error(`Timed out waiting for event store lock: ${this.#file}`);
  }

  append(type, payload) {
    const operation = async () => {
      const release = await this.#acquireLock();
      try {
        const existing = await this.#readAllUnlocked();
        const sequence = (existing.at(-1)?.sequence ?? 0) + 1;
        const event = {
          id: randomUUID(),
          sequence,
          type,
          timestamp: new Date().toISOString(),
          payload,
        };
        const handle = await open(this.#file, 'a');
        try {
          await handle.writeFile(`${JSON.stringify(event)}\n`);
          await handle.sync();
        } finally {
          await handle.close();
        }
        this.#nextSequence = sequence + 1;
        return event;
      } finally {
        await release();
      }
    };
    this.#writeQueue = this.#writeQueue.then(operation, operation);
    return this.#writeQueue;
  }
}
