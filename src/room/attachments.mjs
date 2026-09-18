// Human uploads, stored under the room (never in the project). Registered
// here so a message can reference them by id; the ledger lets a restarted
// room rebuild the registry.

import { dirname } from 'node:path';

export class Attachments {
  #records = new Map();
  register(record) {
    this.#records.set(record.id, { ...record, dir: dirname(record.path) });
    return this.#records.get(record.id);
  }
  restore(records) { for (const record of records) this.#records.set(record.id, record); }
  get(id) { return this.#records.get(id) ?? null; }
}
